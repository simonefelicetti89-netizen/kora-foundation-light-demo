// app/api/admin/companies/provision/route.ts
// Sprint B99 P0 — Real company credential provisioning from the Setup Wizard.
// KORA_ADMIN only. Idempotent on tenant_code and admin_email.
//
// POST /api/admin/companies/provision
// Body: { company_name, tenant_code?, admin_email, admin_name?, admin_role }
//
// Canonical app_metadata key: 'kora_tenant_id'
//   kora-session.ts reads app_metadata.kora_tenant_id
//   migration 006 updates kora.tenant_id() to read app_metadata.kora_tenant_id
//   This route writes app_metadata.kora_tenant_id — all three are consistent.
//
// DO NOT TOUCH: scoring, methodology, worker data, commons, PIB, IU.

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { requireKoraAdmin, isKoraAuthError } from '@/lib/auth/kora-session';
import { getSupabaseServiceClient } from '@/lib/supabase/server';

// Canonical key — must match kora-session.ts and migration 006.
const TENANT_META_KEY = 'kora_tenant_id' as const;

// B143: COMPANY_VIEWER rimosso — non esiste più come ruolo. Solo COMPANY_ADMIN è supportato.
const VALID_ROLES: ReadonlyArray<string> = ['COMPANY_ADMIN'];
type CompanyRole = 'COMPANY_ADMIN';

// ── Tenant code helpers ───────────────────────────────────────────────────────

function generateTenantCode(companyName: string): string {
  return companyName
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
    .slice(0, 20);
}

// ── POST /api/admin/companies/provision ───────────────────────────────────────

export async function POST(request: NextRequest) {
  const auth = await requireKoraAdmin(request);
  if (isKoraAuthError(auth)) return auth;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  // ── Input validation ────────────────────────────────────────────────────────
  const companyName = typeof body['company_name'] === 'string' ? body['company_name'].trim() : '';
  const rawCode     = typeof body['tenant_code']  === 'string' ? body['tenant_code'].trim().toUpperCase() : null;
  const adminEmail  = typeof body['admin_email']  === 'string' ? body['admin_email'].trim().toLowerCase() : '';
  const adminName   = typeof body['admin_name']   === 'string' ? body['admin_name'].trim() : null;
  const adminRole   = (typeof body['admin_role']  === 'string' ? body['admin_role'].trim().toUpperCase() : 'COMPANY_ADMIN') as CompanyRole;

  if (!companyName) {
    return NextResponse.json({ error: 'company_name è obbligatorio.' }, { status: 400 });
  }
  if (!adminEmail) {
    return NextResponse.json({ error: 'admin_email è obbligatorio.' }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail)) {
    return NextResponse.json({ error: 'admin_email non valido.' }, { status: 400 });
  }
  if (!VALID_ROLES.includes(adminRole)) {
    return NextResponse.json({
      error: `admin_role deve essere ${VALID_ROLES.join(' o ')}.`,
    }, { status: 400 });
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({
      error: 'SUPABASE_SERVICE_ROLE_KEY non configurata. Provisioning non disponibile.',
    }, { status: 503 });
  }

  const db = getSupabaseServiceClient();
  const warnings: string[] = [];

  // ── Punto 1.3: Idempotent tenant ─────────────────────────────────────────
  // Use provided tenant_code or derive from company_name (deterministic).
  const tenantCode = rawCode ?? generateTenantCode(companyName);

  let tenantId: string;
  let tenantCreated = false;

  const { data: existingTenant, error: lookupErr } = await db
    .schema('analytics').from('tenant')
    .select('id')
    .eq('tenant_code', tenantCode)
    .maybeSingle();

  if (lookupErr) {
    return NextResponse.json({ error: `Lookup tenant fallito: ${lookupErr.message}` }, { status: 500 });
  }

  if (existingTenant) {
    // Reuse existing tenant — idempotent.
    tenantId = (existingTenant as { id: string }).id;
  } else {
    const { data: newTenant, error: insertErr } = await db
      .schema('analytics').from('tenant')
      .insert({
        tenant_code:            tenantCode,
        company_name:           companyName,
        is_active:              true,
        onboarding_status:      'active',
        data_readiness_status:  'intake_ready',
        decision_pack_status:   'not_ready',
        methodology_version_id: 'KORA Index v1.0',
        deleted_at:             null,
        tenant_kind:            'LIVE',
      })
      .select('id')
      .single();

    if (insertErr || !newTenant) {
      return NextResponse.json({
        error: `Creazione tenant fallita: ${insertErr?.message ?? 'unknown'}`,
      }, { status: 500 });
    }
    tenantId = (newTenant as { id: string }).id;
    tenantCreated = true;
  }

  // ── Punto 1.5 + 1.6: Create auth user (idempotent on email) ──────────────
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

  let adminUserId!: string;
  let inviteStatus: 'sent' | 'existing' | 'not_sent';

  // Attempt invite — Supabase returns 422 / "already registered" if email exists.
  const { data: inviteData, error: inviteErr } = await db.auth.admin.inviteUserByEmail(adminEmail, {
    redirectTo: `${siteUrl}/auth/callback`,
    data: { admin_name: adminName ?? '', company_name: companyName },
  });

  if (inviteData?.user) {
    adminUserId = inviteData.user.id;
    inviteStatus = 'sent';
  } else {
    // Check if user already exists (invite failed because email is taken).
    const isAlreadyRegistered =
      inviteErr?.status === 422 ||
      inviteErr?.message?.toLowerCase().includes('already') ||
      inviteErr?.message?.toLowerCase().includes('registered');

    if (isAlreadyRegistered) {
      // Find the existing user — listUsers is acceptable at demo/pilot scale.
      const { data: usersData, error: listErr } = await db.auth.admin.listUsers({
        page: 1, perPage: 1000,
      });
      if (listErr) {
        return NextResponse.json({
          error: `Impossibile verificare utente esistente: ${listErr.message}`,
        }, { status: 500 });
      }

      const existing = usersData?.users?.find((u) => u.email === adminEmail);
      if (!existing) {
        return NextResponse.json({
          error: 'Utente non trovato dopo errore di registrazione duplicata.',
        }, { status: 500 });
      }

      // Punto 1.6: Check cross-tenant conflict.
      const existingMeta = existing.app_metadata as Record<string, unknown> | undefined;
      if (existingMeta?.[TENANT_META_KEY] && existingMeta[TENANT_META_KEY] !== tenantId) {
        return NextResponse.json({
          error: `${adminEmail} è già assegnato al tenant ${existingMeta[TENANT_META_KEY]}. Usare un'email diversa o un nuovo indirizzo.`,
          provisioningStatus: 'conflict',
        }, { status: 409 });
      }

      adminUserId = existing.id;
      inviteStatus = 'existing';
    } else {
      // SMTP not configured or other transient error — create without invite.
      warnings.push(
        `Invito email non inviato (${inviteErr?.message ?? 'SMTP non configurato'}). ` +
        'Inviare manualmente il link di accesso da Supabase Dashboard.',
      );

      const { data: created, error: createErr } = await db.auth.admin.createUser({
        email:         adminEmail,
        email_confirm: true,
      });

      if (createErr || !created?.user) {
        return NextResponse.json({
          ok:                 false,
          provisioningStatus: 'partial_failure',
          tenantId,
          tenantCode,
          tenantCreated,
          error:    `Provisioning utente fallito: ${createErr?.message ?? 'unknown'}`,
          recovery: `Tenant ${tenantCode} è attivo (${tenantId}). Aggiungere l'utente manualmente da /admin/company-users.`,
          links: {
            manageUsers: `/admin/company-users?tenantId=${encodeURIComponent(tenantId)}`,
          },
          warnings,
        }, { status: 207 });
      }

      adminUserId = created.user.id;
      inviteStatus = 'not_sent';
    }
  }

  // ── Punto 1.4: Set app_metadata (server-controlled, never writable by client) ──
  // Canonical key: kora_tenant_id — matches kora-session.ts + migration 006.
  const { error: metaErr } = await db.auth.admin.updateUserById(adminUserId, {
    app_metadata: {
      kora_role:         adminRole,
      [TENANT_META_KEY]: tenantId,   // 'kora_tenant_id'
      kora_status:       'active',
    },
  });

  if (metaErr) {
    warnings.push(
      `app_metadata non aggiornato: ${metaErr.message}. ` +
      'Aggiornare manualmente da /admin/company-users.',
    );
  }

  return NextResponse.json({
    ok:                 true,
    provisioningStatus: 'provisioned',
    tenantId,
    tenantCode,
    tenantCreated,
    adminUserId,
    adminRole,
    inviteStatus,
    warnings,
    links: {
      companyConsole:   '/admin/companies',
      manageUsers:      `/admin/company-users?tenantId=${encodeURIComponent(tenantId)}`,
      companyWorkspace: `/admin/company-workspace?tenantId=${encodeURIComponent(tenantId)}`,
    },
  });
}
