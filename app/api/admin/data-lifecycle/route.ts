// app/api/admin/data-lifecycle/route.ts
// Data Lifecycle Inspection — KORA_ADMIN only.
//
// GET /api/admin/data-lifecycle              → list recent batches (all tenants, admin view)
// GET /api/admin/data-lifecycle?batchId=...  → inspect specific batch + risk summary
// GET /api/admin/data-lifecycle?tenantId=... → list batches for a tenant

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { requireKoraAdmin, isKoraAuthError } from '@/lib/auth/kora-session';
import { getSupabaseServiceClient } from '@/lib/supabase/server';

// Decision Pack statuses considered "active" (block delete, require archive first)
const ACTIVE_DP_STATUSES = ['draft', 'data_review_required', 'advisor_review_required', 'ready', 'exported'];

export async function GET(request: NextRequest) {
  const authResult = await requireKoraAdmin(request);
  if (isKoraAuthError(authResult)) return authResult;

  const { searchParams } = new URL(request.url);
  const batchId  = searchParams.get('batchId');
  const tenantId = searchParams.get('tenantId');

  const db = getSupabaseServiceClient();

  // ── Case A: Inspect specific batch ────────────────────────────────────────
  if (batchId) {
    // Lookup batch + tenant
    const { data: batch, error: bErr } = await db
      .schema('analytics').from('source_batch')
      .select('id, tenant_id, source_name, source_type, reporting_period, batch_status, row_count, created_at, created_by')
      .eq('id', batchId).maybeSingle();

    if (bErr) return NextResponse.json({ error: bErr.message }, { status: 500 });
    if (!batch) return NextResponse.json({ error: `Batch not found: ${batchId}` }, { status: 404 });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const b = batch as any;

    const { data: tenant } = await db.schema('analytics').from('tenant')
      .select('id, tenant_code, company_name').eq('id', b.tenant_id).maybeSingle();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const t = (tenant as any) ?? {};

    // Counts
    const { count: uploadedCount } = await db.schema('personal').from('uploaded_record')
      .select('id', { count: 'exact', head: true }).eq('batch_id', batchId);

    const { count: uefCount } = await db.schema('analytics').from('uef_record')
      .select('id', { count: 'exact', head: true }).eq('batch_id', batchId);

    const { count: uefApprovedCount } = await db.schema('analytics').from('uef_record')
      .select('id', { count: 'exact', head: true })
      .eq('batch_id', batchId).eq('review_status', 'approved').eq('approved_for_scoring', true);

    // KORA Index results for this tenant+period
    const { data: kiResults } = await db.schema('analytics').from('kora_index_result')
      .select('id, kora_index_value, safeguard_status, is_current, created_at')
      .eq('tenant_id', b.tenant_id).eq('reporting_period', b.reporting_period)
      .order('created_at', { ascending: false }).limit(3);

    // Decision Pack versions for this tenant+period
    const { data: dpVersions } = await db.schema('analytics').from('decision_pack_version')
      .select('id, version_id, status, archived_at, created_at')
      .eq('tenant_id', b.tenant_id).eq('reporting_period', b.reporting_period)
      .order('created_at', { ascending: false }).limit(5);

    // Risk assessment
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const activeDPs = (dpVersions ?? []).filter((dp: any) => ACTIVE_DP_STATUSES.includes(dp.status));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const exportedDPs = (dpVersions ?? []).filter((dp: any) => dp.status === 'exported');

    let deletionRisk: 'safe' | 'active_results' | 'exported_report';
    let recommendedAction: 'delete' | 'archive' | 'review';

    if (exportedDPs.length > 0) {
      deletionRisk = 'exported_report';
      recommendedAction = 'archive';
    } else if (activeDPs.length > 0) {
      deletionRisk = 'active_results';
      recommendedAction = 'archive';
    } else {
      deletionRisk = 'safe';
      recommendedAction = uefApprovedCount && uefApprovedCount > 0 ? 'review' : 'delete';
    }

    // Audit
    await db.schema('audit').from('audit_log').insert({
      tenant_id:     b.tenant_id,
      actor_role:    'KORA_ADMIN',
      actor_id:      authResult.id,
      action:        'data_lifecycle_inspected',
      resource_type: 'analytics.source_batch',
      resource_id:   batchId,
      payload: {
        batch_id:              batchId,
        uploaded_count:        uploadedCount ?? 0,
        uef_count:             uefCount ?? 0,
        uef_approved_count:    uefApprovedCount ?? 0,
        deletion_risk:         deletionRisk,
        recommended_action:    recommendedAction,
        active_dp_count:       activeDPs.length,
      },
      ip_address: null,
    });

    return NextResponse.json({
      ok:            true,
      batchId,
      batch: {
        sourceName:      b.source_name,
        sourceType:      b.source_type,
        reportingPeriod: b.reporting_period,
        batchStatus:     b.batch_status,
        rowCount:        b.row_count,
        createdAt:       b.created_at,
        createdBy:       b.created_by,
      },
      tenant: { id: t.id, tenantCode: t.tenant_code, companyName: t.company_name },
      counts: {
        uploadedRecords:  uploadedCount  ?? 0,
        uefRecords:       uefCount       ?? 0,
        uefApproved:      uefApprovedCount ?? 0,
        koraIndexResults: (kiResults ?? []).length,
        decisionPacks:    (dpVersions ?? []).length,
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      koraIndexResults: (kiResults ?? []).map((ki: any) => ({
        id: ki.id, value: ki.kora_index_value, safeguard: ki.safeguard_status,
        isCurrent: ki.is_current, createdAt: ki.created_at,
      })),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      decisionPacks: (dpVersions ?? []).map((dp: any) => ({
        id: dp.id, versionId: dp.version_id, status: dp.status,
        archivedAt: dp.archived_at, createdAt: dp.created_at,
      })),
      deletionRisk,
      recommendedAction,
      blockingReason: deletionRisk === 'exported_report'
        ? 'A Decision Pack has been exported. Archive it before deleting batch data.'
        : deletionRisk === 'active_results'
        ? 'Active Decision Packs exist for this tenant/period. Archive them before deleting.'
        : null,
    });
  }

  // ── Case B: List batches ─────────────────────────────────────────────────
  let batchQuery = db.schema('analytics').from('source_batch')
    .select('id, tenant_id, source_name, source_type, reporting_period, batch_status, row_count, created_at, created_by')
    .order('created_at', { ascending: false }).limit(50);

  if (tenantId) {
    batchQuery = batchQuery.eq('tenant_id', tenantId);
  }

  const { data: batches, error: listErr } = await batchQuery;
  if (listErr) return NextResponse.json({ error: listErr.message }, { status: 500 });

  // Enrich with tenant names
  const tenantIds = [...new Set((batches ?? []).map((b: any) => b.tenant_id as string))]; // eslint-disable-line @typescript-eslint/no-explicit-any
  const tenantMap: Record<string, { tenantCode: string; companyName: string }> = {};
  if (tenantIds.length > 0) {
    const { data: tenantRows } = await db.schema('analytics').from('tenant')
      .select('id, tenant_code, company_name').in('id', tenantIds);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const t of (tenantRows ?? []) as any[]) {
      tenantMap[t.id as string] = { tenantCode: t.tenant_code, companyName: t.company_name };
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const enriched = (batches ?? []).map((b: any) => ({
    batchId:         b.id,
    sourceName:      b.source_name,
    sourceType:      b.source_type,
    reportingPeriod: b.reporting_period,
    batchStatus:     b.batch_status,
    rowCount:        b.row_count,
    createdAt:       b.created_at,
    tenantCode:      tenantMap[b.tenant_id as string]?.tenantCode ?? null,
    companyName:     tenantMap[b.tenant_id as string]?.companyName ?? null,
  }));

  return NextResponse.json({ ok: true, batches: enriched, total: enriched.length });
}
