// app/api/admin/tenants/route.ts
// Tenant onboarding API — KORA_ADMIN only.
//
// GET  /api/admin/tenants            → list LIVE tenants (default)
// GET  /api/admin/tenants?kind=DEMO  → list DEMO tenants (KORA_ADMIN explicit)
// GET  /api/admin/tenants?kind=TEST|SANDBOX → other kinds
// POST /api/admin/tenants            → create new LIVE tenant + workforce baseline
//
// B9: enables creating a new company/tenant without operator-flow synthetic fixture.
// B131: tenant_kind filtering — default LIVE, explicit ?kind= for non-live.
// Creates: analytics.tenant + personal.workforce_baseline.
// Does NOT: create workers, worker login, scoring, Decision Pack.

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { requireKoraAdmin, isKoraAuthError } from '@/lib/auth/kora-session';
import { getSupabaseServiceClient } from '@/lib/supabase/server';
import { persistWorkforceBaseline } from '@/lib/live/workforce-baseline';
import { assertSameOrigin } from '@/lib/security/origin';

// tenantCode: uppercase letters, digits, dash, 2–32 chars
const TENANT_CODE_RE = /^[A-Z0-9-]{2,32}$/;

// B131: tenant classification values
const VALID_KINDS = ['LIVE', 'DEMO', 'TEST', 'SANDBOX'] as const;
type TenantKind = typeof VALID_KINDS[number];

// ── GET: list tenants ─────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const authResult = await requireKoraAdmin(request);
  if (isKoraAuthError(authResult)) return authResult;

  // B131: ?kind= filter — default LIVE; invalid value → 400.
  const rawKind = new URL(request.url).searchParams.get('kind');
  let kind: TenantKind = 'LIVE';
  if (rawKind !== null) {
    const upper = rawKind.toUpperCase();
    if (!(VALID_KINDS as readonly string[]).includes(upper)) {
      return NextResponse.json({
        error: `Valore ?kind non valido: '${rawKind}'. Valori ammessi: ${VALID_KINDS.join(', ')}.`,
      }, { status: 400 });
    }
    kind = upper as TenantKind;
  }

  const db = getSupabaseServiceClient();
  const { data, error } = await db
    .schema('analytics').from('tenant')
    .select('id, tenant_code, company_name, onboarding_status, data_readiness_status, decision_pack_status, is_active, methodology_version_id, created_at, tenant_kind')
    .eq('tenant_kind', kind)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tenants = (data ?? []).map((t: any) => ({
    id:                   t.id,
    tenantCode:           t.tenant_code,
    companyName:          t.company_name,
    onboardingStatus:     t.onboarding_status,
    dataReadinessStatus:  t.data_readiness_status,
    decisionPackStatus:   t.decision_pack_status,
    isActive:             t.is_active,
    methodologyVersionId: t.methodology_version_id,
    createdAt:            t.created_at,
    tenantKind:           t.tenant_kind,
  }));

  return NextResponse.json({ ok: true, tenants, total: tenants.length, kind });
}

// ── POST: create tenant ───────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const originGuard = assertSameOrigin(request);
  if (originGuard) return originGuard;

  const authResult = await requireKoraAdmin(request);
  if (isKoraAuthError(authResult)) return authResult;

  let body: Record<string, unknown>;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 }); }

  // ── Validation ───────────────────────────────────────────────────────────────
  const tenantCode          = String(body['tenantCode']          ?? '').trim().toUpperCase();
  const companyName         = String(body['companyName']         ?? '').trim();
  const reportingPeriod     = String(body['reportingPeriod']     ?? '').trim();
  const workforcePopulation = body['workforcePopulation'] != null ? Number(body['workforcePopulation']) : null;
  const notes               = body['notes'] != null ? String(body['notes']).slice(0, 500) : null;

  if (!tenantCode)      return NextResponse.json({ error: 'tenantCode is required.' }, { status: 400 });
  if (!companyName)     return NextResponse.json({ error: 'companyName is required.' }, { status: 400 });
  if (!reportingPeriod) return NextResponse.json({ error: 'reportingPeriod is required.' }, { status: 400 });

  if (!TENANT_CODE_RE.test(tenantCode)) {
    return NextResponse.json({
      error: `tenantCode must be 2–32 uppercase letters, digits or dashes. Received: '${tenantCode}'`,
    }, { status: 400 });
  }

  if (workforcePopulation === null || isNaN(workforcePopulation)) {
    return NextResponse.json({ error: 'workforcePopulation is required (number >= 10).' }, { status: 400 });
  }
  if (workforcePopulation < 10) {
    return NextResponse.json({
      error: `workforcePopulation must be >= 10 (N≥10 enforcement). Received: ${workforcePopulation}.`,
    }, { status: 422 });
  }

  const db = getSupabaseServiceClient();

  // ── Duplicate check ──────────────────────────────────────────────────────────
  const { data: existing } = await db
    .schema('analytics').from('tenant')
    .select('id').eq('tenant_code', tenantCode).maybeSingle();

  if (existing) {
    return NextResponse.json({
      error: `tenantCode '${tenantCode}' already exists.`,
      conflict: true,
    }, { status: 409 });
  }

  // ── Create analytics.tenant ──────────────────────────────────────────────────
  const { data: tenantData, error: tenantErr } = await db
    .schema('analytics').from('tenant')
    .insert({
      tenant_code:           tenantCode,
      company_name:          companyName,
      industry_code:         null,
      country_code:          'IT',
      onboarding_status:     'active',
      data_readiness_status: 'intake_ready',
      decision_pack_status:  'not_ready',
      methodology_version_id: 'KORA Index v1.0',
      is_active:             true,
      deleted_at:            null,
      tenant_kind:           'LIVE',
    })
    .select('id')
    .single();

  if (tenantErr || !tenantData) {
    return NextResponse.json({ error: `Tenant creation failed: ${tenantErr?.message ?? 'no data'}` }, { status: 500 });
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tenantId = (tenantData as any).id as string;

  // ── Create personal.workforce_baseline ───────────────────────────────────────
  // Single aggregate segment — no individual worker breakdown. N≥10 enforced.
  let baselineId: string | null = null;
  let baselineWarning: string | null = null;

  try {
    const wbResult = await persistWorkforceBaseline({
      db,
      tenantId,
      reportingPeriod,
      totalWorkers:         workforcePopulation,
      rawSegmentBreakdown:  { departments: { organisazione: workforcePopulation } },
      createdBy:            authResult.email,
    });
    baselineId = wbResult.id;
  } catch (e) {
    baselineWarning = `Workforce baseline creation failed: ${(e as Error).message}`;
    console.error('[tenants POST] workforce_baseline:', baselineWarning);
  }

  // ── Audit events ─────────────────────────────────────────────────────────────
  const auditRows = [
    {
      tenant_id:     tenantId,
      actor_role:    'KORA_ADMIN',
      actor_id:      authResult.id,
      action:        'tenant_created',
      resource_type: 'analytics.tenant',
      resource_id:   tenantId,
      payload:       {
        tenant_code:           tenantCode,
        company_name:          companyName,
        reporting_period:      reportingPeriod,
        workforce_population:  workforcePopulation,
        notes:                 notes ?? null,
        operator:              authResult.email,
      },
      ip_address: null,
    },
    ...(baselineId ? [{
      tenant_id:     tenantId,
      actor_role:    'KORA_ADMIN',
      actor_id:      authResult.id,
      action:        'workforce_baseline_created',
      resource_type: 'personal.workforce_baseline',
      resource_id:   baselineId,
      payload:       {
        tenant_code:          tenantCode,
        reporting_period:     reportingPeriod,
        total_workers:        workforcePopulation,
        n_threshold:          10,
        operator:             authResult.email,
      },
      ip_address: null,
    }] : []),
    {
      tenant_id:     tenantId,
      actor_role:    'KORA_ADMIN',
      actor_id:      authResult.id,
      action:        'tenant_onboarding_ready',
      resource_type: 'analytics.tenant',
      resource_id:   tenantId,
      payload:       {
        tenant_code:      tenantCode,
        baseline_created: !!baselineId,
        status:           'ready_for_intake',
      },
      ip_address: null,
    },
  ];

  const { error: auditErr } = await db.schema('audit').from('audit_log').insert(auditRows);
  if (auditErr) console.error('[tenants POST] audit:', auditErr.message);

  return NextResponse.json({
    ok:                      true,
    tenantId,
    tenantCode,
    companyName,
    reportingPeriod,
    workforcePopulation,
    workforceBaselineId:     baselineId,
    workforceBaselineCreated: !!baselineId,
    status:                  'ready_for_intake',
    ...(baselineWarning ? { baselineWarning } : {}),
    links: {
      dataIntake: `/admin/data-intake`,
      uefReview:  `/admin/uef-review`,
    },
  });
}
