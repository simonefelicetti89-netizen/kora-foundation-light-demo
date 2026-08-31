// app/api/admin/workforce-baseline/route.ts
// Standalone workforce baseline upsert — KORA_ADMIN only.
//
// GET  /api/admin/workforce-baseline             → list tenant_ids with a baseline (existence check)
// GET  /api/admin/workforce-baseline?tenantId=X   → full canonical view for one tenant
// POST /api/admin/workforce-baseline
//
// Creates or updates personal.workforce_baseline for an existing tenant.
// Use case: baseline creation failed during tenant setup, or headcount
// changed before a scoring run (which requires a baseline >= 10).
//
// Tenant creation with first baseline: POST /api/admin/tenants (preferred).
// This endpoint is the recovery/update path for existing tenants.
//
// N≥10 enforcement: delegated to persistWorkforceBaseline() in lib/live/workforce-baseline.ts.
// Never write to personal.workforce_baseline directly — use that function.
//
// B-TRUTH first canonical seed group (2026-08-31): GET added to replace
// services/workforce-baseline/WorkforceBaselineService.ts's synthetic
// data/synthetic/workforce-baseline.json read on
// app/admin/companies/workforce-baseline/page.tsx. See
// lib/live/workforce-baseline-view.ts for the exact field disposition
// (what's kept/derived vs. dropped as decorative/unbuilt).

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { requireKoraAdmin, isKoraAuthError } from '@/lib/auth/kora-session';
import { getSupabaseServiceClient } from '@/lib/supabase/server';
import { persistWorkforceBaseline } from '@/lib/live/workforce-baseline';
import { buildWorkforceBaselineView, type WorkforceBaselineRow } from '@/lib/live/workforce-baseline-view';
import { assertSameOrigin } from '@/lib/security/origin';

export async function GET(request: NextRequest) {
  const authResult = await requireKoraAdmin(request);
  if (isKoraAuthError(authResult)) return authResult;

  const tenantId = request.nextUrl.searchParams.get('tenantId');
  const db = getSupabaseServiceClient();

  if (!tenantId) {
    // Existence check only — every tenant_id that has at least one baseline row.
    const { data, error } = await db
      .schema('personal').from('workforce_baseline')
      .select('tenant_id');
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    const tenantIds = [...new Set((data ?? []).map((r) => (r as { tenant_id: string }).tenant_id))];
    return NextResponse.json({ ok: true, tenantIdsWithBaseline: tenantIds });
  }

  const { data: baselineRow, error: baselineErr } = await db
    .schema('personal').from('workforce_baseline')
    .select('tenant_id, reporting_period, total_workers, segment_breakdown, minimum_group_size, created_at, created_by')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (baselineErr) return NextResponse.json({ error: baselineErr.message }, { status: 500 });
  if (!baselineRow) return NextResponse.json({ ok: true, baseline: null });

  const { data: tenantRow, error: tenantErr } = await db
    .schema('analytics').from('tenant')
    .select('tenant_code, company_name')
    .eq('id', tenantId)
    .maybeSingle();
  if (tenantErr) return NextResponse.json({ error: tenantErr.message }, { status: 500 });
  if (!tenantRow) return NextResponse.json({ error: `Tenant not found: ${tenantId}` }, { status: 404 });

  const view = buildWorkforceBaselineView(
    baselineRow as unknown as WorkforceBaselineRow,
    tenantRow as { tenant_code: string; company_name: string },
  );

  return NextResponse.json({ ok: true, baseline: view });
}

export async function POST(request: NextRequest) {
  const originGuard = assertSameOrigin(request);
  if (originGuard) return originGuard;

  const authResult = await requireKoraAdmin(request);
  if (isKoraAuthError(authResult)) return authResult;

  let body: Record<string, unknown>;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 }); }

  const tenantId        = String(body['tenantId']        ?? '').trim();
  const reportingPeriod = String(body['reportingPeriod'] ?? '').trim();
  const rawWorkers      = body['totalWorkers'] != null ? Number(body['totalWorkers']) : null;

  if (!tenantId)
    return NextResponse.json({ error: 'tenantId is required.' }, { status: 400 });
  if (!reportingPeriod)
    return NextResponse.json({ error: 'reportingPeriod is required.' }, { status: 400 });
  if (rawWorkers === null || isNaN(rawWorkers))
    return NextResponse.json({ error: 'totalWorkers is required (number).' }, { status: 400 });
  if (rawWorkers < 10)
    return NextResponse.json({
      error: `totalWorkers must be >= 10 (N≥10 enforcement). Received: ${rawWorkers}.`,
    }, { status: 422 });

  const totalWorkers = Math.round(rawWorkers);
  const db = getSupabaseServiceClient();

  // Verify tenant exists before writing a baseline for it
  const { data: tenantRow, error: tenantErr } = await db
    .schema('analytics').from('tenant')
    .select('id, tenant_code, is_active')
    .eq('id', tenantId)
    .maybeSingle();

  if (tenantErr)
    return NextResponse.json({ error: `Tenant lookup failed: ${tenantErr.message}` }, { status: 500 });
  if (!tenantRow)
    return NextResponse.json({ error: `Tenant not found: ${tenantId}` }, { status: 404 });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (!(tenantRow as any).is_active)
    return NextResponse.json({ error: 'Tenant is not active.' }, { status: 422 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tenantCode = (tenantRow as any).tenant_code as string;

  // Persist via canonical function (enforces N≥10 suppression on segment_breakdown)
  let result: Awaited<ReturnType<typeof persistWorkforceBaseline>>;
  try {
    result = await persistWorkforceBaseline({
      db,
      tenantId,
      reportingPeriod,
      totalWorkers,
      rawSegmentBreakdown: { departments: { organisazione: totalWorkers } },
      createdBy: authResult.email,
    });
  } catch (e) {
    return NextResponse.json(
      { error: `Workforce baseline persist failed: ${(e as Error).message}` },
      { status: 500 },
    );
  }

  // Audit log
  const { error: auditErr } = await db.schema('audit').from('audit_log').insert({
    tenant_id:     tenantId,
    actor_role:    'KORA_ADMIN',
    actor_id:      authResult.id,
    action:        'workforce_baseline_updated',
    resource_type: 'personal.workforce_baseline',
    resource_id:   result.id,
    payload: {
      tenant_code:      tenantCode,
      reporting_period: reportingPeriod,
      total_workers:    totalWorkers,
      n_threshold:      10,
      operator:         authResult.email,
      upserted:         true,
    },
    ip_address: null,
  });
  if (auditErr) console.error('[workforce-baseline POST] audit:', auditErr.message);

  return NextResponse.json({
    ok:              true,
    baselineId:      result.id,
    tenantId,
    tenantCode,
    totalWorkers:    result.totalWorkers,
    reportingPeriod: result.reportingPeriod,
    upserted:        true,
    links: {
      scoringRun: `/api/admin/scoring/run-approved-batch`,
      uefReview:  `/admin/uef-review`,
    },
  });
}
