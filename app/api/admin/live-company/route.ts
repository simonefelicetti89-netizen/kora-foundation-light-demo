// app/api/admin/live-company/route.ts
// B38 — Unified live company creation + first Company Admin provisioning.
// KORA_ADMIN only.
//
// POST /api/admin/live-company
//
// Creates:
//   1. analytics.tenant (live company workspace)
//   2. personal.workforce_baseline (if estimatedWorkers >= 10)
//   3. Supabase Auth user (invite or create) for first Company Admin
//   4. app_metadata: kora_role=COMPANY_ADMIN, kora_tenant_id, kora_status=active
//   5. audit log events
//
// Partial failure handling:
//   - Tenant creation fails → return 500, no user created
//   - User invite fails after tenant creation → return partial_failure, tenant still active
//
// Security:
//   - KORA_ADMIN only
//   - No raw payload, no worker data, no PII beyond admin email
//   - No passwords or tokens in response
//   - Tenant code generated from company name if not provided; uniqueness enforced

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { requireKoraAdmin, isKoraAuthError } from '@/lib/auth/kora-session';
import { getSupabaseServiceClient } from '@/lib/supabase/server';
import { persistWorkforceBaseline } from '@/lib/live/workforce-baseline';

// ── Tenant code generation ────────────────────────────────────────────────────
// Generates uppercase slug from company name: "Acme S.p.A." → "ACME-S-P-A"

function generateTenantCode(companyName: string): string {
  return companyName
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')       // trim leading/trailing dashes
    .replace(/-{2,}/g, '-')        // collapse repeated dashes
    .slice(0, 20);
}

const TENANT_CODE_RE = /^[A-Z0-9-]{2,32}$/;

// ── Unique code resolution ────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function resolveUniqueCode(db: any, baseCode: string): Promise<string> {
  const check = async (code: string): Promise<boolean> => {
    const { data } = await db.schema('analytics').from('tenant')
      .select('id').eq('tenant_code', code).maybeSingle();
    return !data; // true → available
  };

  if (await check(baseCode)) return baseCode;

  for (let i = 1; i <= 99; i++) {
    const suffix = String(i).padStart(3, '0');
    const candidate = `${baseCode.slice(0, 16).replace(/-+$/, '')}-${suffix}`;
    if (await check(candidate)) return candidate;
  }

  throw new Error(
    'Impossibile trovare un codice tenant univoco. Fornire un codice personalizzato o un nome aziendale più specifico.',
  );
}

// Fire-and-forget audit insert — errors are non-fatal (logged to stderr only)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function logAudit(db: any, row: Record<string, unknown>): Promise<void> {
  try { await db.schema('audit').from('audit_log').insert(row); }
  catch (e) { console.error('[live-company audit]', (e as Error).message); }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function logAuditMany(db: any, rows: Record<string, unknown>[]): Promise<void> {
  try { await db.schema('audit').from('audit_log').insert(rows); }
  catch (e) { console.error('[live-company audit]', (e as Error).message); }
}

// ── POST ──────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const auth = await requireKoraAdmin(request);
  if (isKoraAuthError(auth)) return auth;

  let body: Record<string, unknown>;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 }); }

  // ── Validate inputs ───────────────────────────────────────────────────────
  const companyName       = typeof body['companyName']    === 'string' ? body['companyName'].trim()    : '';
  const rawTenantCode     = typeof body['tenantCode']     === 'string' ? body['tenantCode'].trim().toUpperCase() : '';
  const country           = typeof body['country']        === 'string' ? body['country'].trim().toUpperCase().slice(0, 2) : 'IT';
  const industry          = typeof body['industry']       === 'string' ? body['industry'].trim().slice(0, 64)  : null;
  const companySizeBand   = typeof body['companySizeBand'] === 'string' ? body['companySizeBand'].trim().slice(0, 32) : null;
  const estimatedWorkers  = body['estimatedWorkers'] != null ? Number(body['estimatedWorkers']) : null;
  const assessmentPeriod  = typeof body['assessmentPeriod'] === 'string' ? body['assessmentPeriod'].trim() : '2026-Q1';
  const adminName         = typeof body['adminName']      === 'string' ? body['adminName'].trim().slice(0, 128) : null;
  const adminEmail        = typeof body['adminEmail']     === 'string' ? body['adminEmail'].trim().toLowerCase() : '';
  const adminRole         = typeof body['adminRole']      === 'string' ? body['adminRole'].trim().toUpperCase()  : 'COMPANY_ADMIN';
  const sendInvite        = body['sendInvite'] !== false; // default true

  if (!companyName) {
    return NextResponse.json({ error: 'companyName è obbligatorio.' }, { status: 400 });
  }
  if (!adminEmail) {
    return NextResponse.json({ error: 'adminEmail è obbligatorio.' }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail)) {
    return NextResponse.json({ error: 'adminEmail non valido.' }, { status: 400 });
  }
  if (adminRole !== 'COMPANY_ADMIN') {
    return NextResponse.json({ error: 'Il primo utente deve essere COMPANY_ADMIN.' }, { status: 400 });
  }
  if (rawTenantCode && !TENANT_CODE_RE.test(rawTenantCode)) {
    return NextResponse.json({
      error: 'tenantCode deve contenere solo lettere maiuscole, cifre e trattini (2–32 caratteri).',
    }, { status: 400 });
  }
  if (estimatedWorkers !== null && (!Number.isFinite(estimatedWorkers) || estimatedWorkers < 0)) {
    return NextResponse.json({ error: 'estimatedWorkers deve essere un numero non negativo.' }, { status: 400 });
  }

  const db = getSupabaseServiceClient();
  const warnings: string[] = [];

  // ── Audit: attempt ─────────────────────────────────────────────────────────
  const attemptAudit = {
    tenant_id:     null as string | null,
    actor_role:    'KORA_ADMIN',
    actor_id:      auth.id,
    action:        'live_company_create_attempt',
    resource_type: 'analytics.tenant',
    resource_id:   null as string | null,
    payload:       { company_name: companyName, admin_email: adminEmail, operator: auth.email },
    ip_address:    null,
  };
  await logAudit(db, attemptAudit);

  // ── Resolve tenant code ────────────────────────────────────────────────────
  let tenantCode: string;
  let tenantCodeWasGenerated = false;

  try {
    const base = rawTenantCode || generateTenantCode(companyName);
    if (!rawTenantCode) tenantCodeWasGenerated = true;
    tenantCode = await resolveUniqueCode(db, base);
    if (tenantCode !== base && !rawTenantCode) tenantCodeWasGenerated = true;
  } catch (e) {
    await logAudit(db, { ...attemptAudit, action: 'live_company_create_failed', payload: { ...attemptAudit.payload, reason: (e as Error).message } });
    return NextResponse.json({ error: (e as Error).message }, { status: 409 });
  }

  // ── Create analytics.tenant ────────────────────────────────────────────────
  const { data: tenantData, error: tenantErr } = await db
    .schema('analytics').from('tenant')
    .insert({
      tenant_code:            tenantCode,
      company_name:           companyName,
      industry_code:          industry,
      country_code:           country,
      onboarding_status:      'active',
      data_readiness_status:  'intake_ready',
      decision_pack_status:   'not_ready',
      methodology_version_id: 'KORA Methodology v0.1',
      is_active:              true,
      deleted_at:             null,
    })
    .select('id')
    .single();

  if (tenantErr || !tenantData) {
    const reason = tenantErr?.message ?? 'unknown';
    await logAudit(db, { ...attemptAudit, action: 'live_company_create_failed', payload: { ...attemptAudit.payload, reason } });
    return NextResponse.json({ error: `Creazione tenant fallita: ${reason}` }, { status: 500 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tenantId = (tenantData as any).id as string;

  // ── Create workforce baseline (if estimatedWorkers >= 10) ─────────────────
  let baselineId: string | null = null;
  const canCreateBaseline = estimatedWorkers !== null && estimatedWorkers >= 10;

  if (canCreateBaseline && estimatedWorkers !== null) {
    try {
      const wb = await persistWorkforceBaseline({
        db,
        tenantId,
        reportingPeriod:      assessmentPeriod,
        totalWorkers:         estimatedWorkers,
        rawSegmentBreakdown:  { departments: { organisazione: estimatedWorkers } },
        createdBy:            auth.email,
      });
      baselineId = wb.id;
    } catch (e) {
      warnings.push(`Workforce baseline non creato: ${(e as Error).message}`);
    }
  } else if (estimatedWorkers !== null && estimatedWorkers < 10) {
    warnings.push('estimatedWorkers < 10: workforce baseline non creato (soglia privacy N≥10 non raggiunta).');
  }

  // Audit: tenant created
  await logAudit(db, {
    tenant_id:     tenantId,
    actor_role:    'KORA_ADMIN',
    actor_id:      auth.id,
    action:        'live_company_created',
    resource_type: 'analytics.tenant',
    resource_id:   tenantId,
    payload: {
      tenant_code:         tenantCode,
      company_name:        companyName,
      admin_email:         adminEmail,
      assessment_period:   assessmentPeriod,
      estimated_workers:   estimatedWorkers,
      baseline_created:    !!baselineId,
      operator:            auth.email,
    },
    ip_address: null,
  });

  // ── Provision first Company Admin ──────────────────────────────────────────
  // Check if user already exists
  const { data: existingUsersData } = await db.auth.admin.listUsers({ perPage: 1000 });
  const existingUser = (existingUsersData?.users ?? []).find((u) => u.email === adminEmail);

  let adminUserId: string;
  let inviteStatus: 'sent' | 'not_sent' | 'user_existed' = 'not_sent';
  let userProvisioningStatus: 'ok' | 'partial_failure' = 'ok';

  // Audit: invite attempt
  await logAudit(db, {
    tenant_id:     tenantId,
    actor_role:    'KORA_ADMIN',
    actor_id:      auth.id,
    action:        'first_company_admin_invite_attempt',
    resource_type: 'auth.user',
    resource_id:   null,
    payload:       { email: adminEmail, tenant_id: tenantId, operator: auth.email },
    ip_address:    null,
  });

  if (existingUser) {
    // User already exists — check they're not assigned to another tenant
    const existingMeta = existingUser.app_metadata as Record<string, unknown> | undefined;
    if (existingMeta?.kora_tenant_id && existingMeta.kora_tenant_id !== tenantId) {
      warnings.push(
        `L'utente ${adminEmail} è già assegnato a un altro tenant (${existingMeta.kora_tenant_id}). L'assegnazione non è stata modificata.`,
      );
      userProvisioningStatus = 'partial_failure';
      adminUserId = existingUser.id;
      inviteStatus = 'user_existed';
    } else {
      // Link to this tenant
      adminUserId = existingUser.id;
      inviteStatus = 'user_existed';
    }
  } else {
    // Invite new user
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
    let inviteSucceeded = false;

    if (sendInvite) {
      const { data: inviteData, error: inviteErr } = await db.auth.admin.inviteUserByEmail(adminEmail, {
        redirectTo: `${siteUrl}/company/workspace`,
        data: {
          admin_name: adminName ?? '',
          company_name: companyName,
        },
      });

      if (!inviteErr && inviteData?.user) {
        adminUserId = inviteData.user.id;
        inviteSucceeded = true;
        inviteStatus = 'sent';
      } else {
        // Invite failed — fall through to createUser
        warnings.push(
          'Invito email non inviato (SMTP potrebbe non essere configurato). ' +
          'L\'utente è stato creato senza invito. ' +
          'Configurare SMTP o inviare manualmente il link di accesso.',
        );
      }
    }

    if (!inviteSucceeded) {
      // Create user without invite (SMTP not configured)
      const { data: createData, error: createErr } = await db.auth.admin.createUser({
        email:         adminEmail,
        email_confirm: true,
      });

      if (createErr || !createData?.user) {
        const reason = createErr?.message ?? 'unknown';
        await logAudit(db, {
          tenant_id:     tenantId,
          actor_role:    'KORA_ADMIN',
          actor_id:      auth.id,
          action:        'first_company_admin_provision_failed',
          resource_type: 'auth.user',
          resource_id:   null,
          payload:       { email: adminEmail, tenant_id: tenantId, reason, operator: auth.email },
          ip_address:    null,
        });

        return NextResponse.json({
          ok:                    false,
          provisioningStatus:    'partial_failure',
          tenantId,
          tenantCode,
          companyName,
          tenantCreated:         true,
          userCreated:           false,
          error:                 `Tenant creato (${tenantCode}) ma provisioning utente fallito: ${reason}`,
          recovery:              `Il tenant ${tenantCode} è attivo. Usare /admin/company-users per aggiungere manualmente l'utente.`,
          links: {
            companyConsole: `/admin/companies`,
            manageUsers:    `/admin/company-users?tenantId=${encodeURIComponent(tenantId)}`,
          },
          warnings,
        }, { status: 207 }); // 207 Multi-Status: partial success
      }

      adminUserId = createData.user.id;
      inviteStatus = 'not_sent';
    }
  }

  // ── Set app_metadata (server-controlled, never writable by user) ───────────
  if (userProvisioningStatus !== 'partial_failure' || !existingUser) {
    const { error: metaErr } = await db.auth.admin.updateUserById(adminUserId!, {
      app_metadata: {
        kora_role:      'COMPANY_ADMIN',
        kora_tenant_id: tenantId,
        kora_status:    'active',
      },
    });

    if (metaErr) {
      warnings.push(`Metadata utente non aggiornato: ${metaErr.message}. Aggiornare manualmente da /admin/company-users.`);
      userProvisioningStatus = 'partial_failure';
    }
  }

  // ── Audit: provisioning result ─────────────────────────────────────────────
  await logAuditMany(db, [
    {
      tenant_id:     tenantId,
      actor_role:    'KORA_ADMIN',
      actor_id:      auth.id,
      action:        'first_company_admin_provisioned',
      resource_type: 'auth.user',
      resource_id:   adminUserId!,
      payload: {
        email:           adminEmail,
        role:            'COMPANY_ADMIN',
        tenant_id:       tenantId,
        tenant_code:     tenantCode,
        invite_status:   inviteStatus,
        operator:        auth.email,
        already_existed: !!existingUser,
      },
      ip_address: null,
    },
    {
      tenant_id:     tenantId,
      actor_role:    'KORA_ADMIN',
      actor_id:      auth.id,
      action:        inviteStatus === 'sent' ? 'first_company_admin_invite_sent' : 'first_company_admin_invite_warning',
      resource_type: 'auth.user',
      resource_id:   adminUserId!,
      payload: {
        email:         adminEmail,
        invite_status: inviteStatus,
        send_invite:   sendInvite,
        warnings:      warnings.length > 0 ? warnings : null,
        operator:      auth.email,
      },
      ip_address: null,
    },
  ]);

  // ── Build response ─────────────────────────────────────────────────────────
  const tcEnc = encodeURIComponent(tenantCode);
  const rpEnc = encodeURIComponent(assessmentPeriod);

  return NextResponse.json({
    ok:                 true,
    provisioningStatus: userProvisioningStatus === 'partial_failure' ? 'partial_failure' : 'complete',
    tenantId,
    tenantCode,
    tenantCodeWasGenerated,
    companyName,
    adminEmail,
    adminUserId:        adminUserId!,
    adminRole:          'COMPANY_ADMIN',
    inviteStatus,
    inviteNote: inviteStatus === 'sent'
      ? 'Invito inviato. L\'utente riceverà un link per impostare la password e accedere al workspace.'
      : inviteStatus === 'user_existed'
      ? 'Utente già esistente — assegnato al nuovo tenant come Company Admin.'
      : 'Utente creato senza invito (SMTP non configurato). Inviare manualmente il link di accesso.',
    baselineCreated:    !!baselineId,
    warnings,
    links: {
      companyConsole:    `/admin/companies`,
      companyWorkspace:  `/admin/company-workspace?tenantCode=${tcEnc}&reportingPeriod=${rpEnc}`,
      manageUsers:       `/admin/company-users?tenantId=${encodeURIComponent(tenantId)}`,
      livePreview:       `/admin/company-live-preview?tenantCode=${tcEnc}&reportingPeriod=${rpEnc}`,
    },
  });
}
