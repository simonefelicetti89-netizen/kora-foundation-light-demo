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
import { z } from 'zod';
import { requireKoraAdmin, isKoraAuthError } from '@/lib/auth/kora-session';
import { getSupabaseServiceClient } from '@/lib/supabase/server';
import { assertSameOrigin } from '@/lib/security/origin';
import { assertRateLimit } from '@/lib/security/rate-limit';

// Canonical key — must match kora-session.ts and migration 006.
const TENANT_META_KEY = 'kora_tenant_id' as const;

// B143: COMPANY_VIEWER rimosso — non esiste più come ruolo. Solo COMPANY_ADMIN è supportato.
const VALID_ROLES: ReadonlyArray<string> = ['COMPANY_ADMIN'];
type CompanyRole = 'COMPANY_ADMIN';

// Canonical tenant classification (migration 014) — LIVE is the default for
// every existing caller; only an explicit, valid non-LIVE value changes
// behavior (see the operational-safety branch below).
const TENANT_KIND_VALUES = ['LIVE', 'DEMO', 'TEST', 'SANDBOX'] as const;
type TenantKind = (typeof TENANT_KIND_VALUES)[number];

const ProvisionCompanySchema = z.object({
  company_name: z.string().min(1, 'company_name è obbligatorio.').max(200),
  tenant_code:  z.string().optional(),
  admin_email:  z.string().min(1, 'admin_email è obbligatorio.').email('admin_email non valido.'),
  admin_name:   z.string().max(128).optional().nullable(),
  admin_role:   z.string().optional(),
  tenant_kind:  z.enum(TENANT_KIND_VALUES).optional(),
});

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
  const originGuard = assertSameOrigin(request);
  if (originGuard) return originGuard;

  const auth = await requireKoraAdmin(request);
  if (isKoraAuthError(auth)) return auth;

  const rateLimitGuard = await assertRateLimit('heavy_provisioning', auth.id);
  if (rateLimitGuard) return rateLimitGuard;

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  // ── Input validation ────────────────────────────────────────────────────────
  const parsed = ProvisionCompanySchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Payload non valido.' },
      { status: 400 },
    );
  }

  const companyName = parsed.data.company_name.trim();
  const rawCode     = parsed.data.tenant_code?.trim().toUpperCase() ?? null;
  const adminEmail  = parsed.data.admin_email.trim().toLowerCase();
  const adminName   = parsed.data.admin_name?.trim() ?? null;
  const adminRole   = (parsed.data.admin_role?.trim().toUpperCase() ?? 'COMPANY_ADMIN') as CompanyRole;
  const tenantKind: TenantKind = parsed.data.tenant_kind ?? 'LIVE';

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
        tenant_kind:            tenantKind,
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

  if (tenantKind !== 'LIVE') {
    // ── Operational safety (synthetic-company foundation) ────────────────────
    // Non-LIVE tenants (DEMO/TEST/SANDBOX) must never trigger a real external
    // side effect. inviteUserByEmail is skipped entirely — createUser with
    // email_confirm:true sends no email at all (it is the exact same
    // no-email fallback the LIVE branch below already uses when SMTP is
    // unavailable; here it is taken unconditionally, by tenant_kind, not by
    // error). Product/session behavior (app_metadata shape, role, downstream
    // canonical reads) is otherwise byte-for-byte identical to LIVE.
    const { data: created, error: createErr } = await db.auth.admin.createUser({
      email:         adminEmail,
      email_confirm: true,
    });

    if (created?.user) {
      adminUserId = created.user.id;
      inviteStatus = 'not_sent';
    } else {
      const isAlreadyRegistered =
        createErr?.status === 422 ||
        createErr?.message?.toLowerCase().includes('already') ||
        createErr?.message?.toLowerCase().includes('registered');

      if (!isAlreadyRegistered) {
        return NextResponse.json({
          error: `Creazione utente fallita: ${createErr?.message ?? 'unknown'}`,
        }, { status: 500 });
      }

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

      const existingMeta = existing.app_metadata as Record<string, unknown> | undefined;
      if (existingMeta?.[TENANT_META_KEY] && existingMeta[TENANT_META_KEY] !== tenantId) {
        return NextResponse.json({
          error: `${adminEmail} è già assegnato al tenant ${existingMeta[TENANT_META_KEY]}. Usare un'email diversa o un nuovo indirizzo.`,
          provisioningStatus: 'conflict',
        }, { status: 409 });
      }

      adminUserId = existing.id;
      inviteStatus = 'existing';
    }
  } else {
    // ── LIVE — unchanged from prior behavior ──────────────────────────────────
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
            recovery: `Tenant ${tenantCode} è attivo (${tenantId}). Aggiungere l'utente manualmente da /admin/company-users-live.`,
            links: {
              manageUsers: `/admin/company-users-live?tenantId=${encodeURIComponent(tenantId)}`,
            },
            warnings,
          }, { status: 207 });
        }

        adminUserId = created.user.id;
        inviteStatus = 'not_sent';
      }
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
      'Aggiornare manualmente da /admin/company-users-live.',
    );
  }

  return NextResponse.json({
    ok:                 true,
    provisioningStatus: 'provisioned',
    tenantId,
    tenantCode,
    tenantKind,
    tenantCreated,
    adminUserId,
    adminRole,
    inviteStatus,
    warnings,
    links: {
      companyConsole:   '/admin/companies',
      manageUsers:      `/admin/company-users-live?tenantId=${encodeURIComponent(tenantId)}`,
      companyWorkspace: `/admin/company-workspace-live?tenantId=${encodeURIComponent(tenantId)}`,
    },
  });
}
