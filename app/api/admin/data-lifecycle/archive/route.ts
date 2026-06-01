// app/api/admin/data-lifecycle/archive/route.ts
// Archive batch — KORA_ADMIN only.
//
// Archives decision_pack_version records linked to this batch's tenant+period.
// source_batch.batch_status is NOT changed to 'archived' (enum doesn't include it
// without a DB migration — documented as future work).
// No data is deleted. All records remain for audit purposes.

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { requireKoraAdmin, isKoraAuthError } from '@/lib/auth/kora-session';
import { getSupabaseServiceClient } from '@/lib/supabase/server';

const ARCHIVABLE_DP_STATUSES = ['draft', 'data_review_required', 'advisor_review_required', 'ready', 'exported'];

export async function POST(request: NextRequest) {
  const authResult = await requireKoraAdmin(request);
  if (isKoraAuthError(authResult)) return authResult;

  let body: Record<string, unknown>;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 }); }

  const batchId = String(body['batchId'] ?? '').trim();
  const reason  = String(body['reason']  ?? '').trim().slice(0, 500);
  if (!batchId) return NextResponse.json({ error: 'batchId is required.' }, { status: 400 });

  const db = getSupabaseServiceClient();

  // Lookup batch
  const { data: batch, error: bErr } = await db.schema('analytics').from('source_batch')
    .select('id, tenant_id, reporting_period, batch_status')
    .eq('id', batchId).maybeSingle();

  if (bErr) return NextResponse.json({ error: bErr.message }, { status: 500 });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (!batch) return NextResponse.json({ error: `Batch not found: ${batchId}` }, { status: 404 });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const b = batch as any;
  const tenantId        = b.tenant_id as string;
  const reportingPeriod = b.reporting_period as string;
  const previousStatus  = b.batch_status as string;

  // Archive decision_pack_version records for this tenant+period
  const archivedAt = new Date().toISOString();
  const { data: dpToArchive } = await db.schema('analytics').from('decision_pack_version')
    .select('id, version_id, status')
    .eq('tenant_id', tenantId)
    .eq('reporting_period', reportingPeriod)
    .in('status', ARCHIVABLE_DP_STATUSES);

  let archivedDPCount = 0;
  if (dpToArchive && dpToArchive.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dpIds = (dpToArchive as any[]).map((dp: any) => dp.id as string);
    const { error: dpErr } = await db.schema('analytics').from('decision_pack_version')
      .update({ status: 'archived', archived_at: archivedAt })
      .in('id', dpIds);
    if (dpErr) {
      return NextResponse.json({ error: `Decision Pack archive failed: ${dpErr.message}` }, { status: 500 });
    }
    archivedDPCount = dpIds.length;
  }

  // NOTE: source_batch.batch_status is NOT changed to 'archived' here because
  // 'archived' is not in the current type enum. This requires a future DB migration
  // to add CHECK constraint. The batch remains as-is in source_batch.
  // Decision Pack records ARE archived since decision_pack_version.status supports 'archived'.

  // Audit
  const auditRows = [
    {
      tenant_id:     tenantId,
      actor_role:    'KORA_ADMIN',
      actor_id:      authResult.id,
      action:        'source_batch_archived',
      resource_type: 'analytics.source_batch',
      resource_id:   batchId,
      payload: {
        batch_id:           batchId,
        batch_previous_status: previousStatus,
        reporting_period:   reportingPeriod,
        reason:             reason || null,
        archived_dp_count:  archivedDPCount,
        note:               'source_batch.status not changed — archived enum requires DB migration',
      },
      ip_address: null,
    },
    ...(archivedDPCount > 0 ? [{
      tenant_id:     tenantId,
      actor_role:    'KORA_ADMIN',
      actor_id:      authResult.id,
      action:        'decision_pack_archived',
      resource_type: 'analytics.decision_pack_version',
      resource_id:   batchId,
      payload: { batch_id: batchId, count: archivedDPCount, reason: reason || null },
      ip_address: null,
    }] : []),
  ];

  const { error: auditErr } = await db.schema('audit').from('audit_log').insert(auditRows);
  if (auditErr) console.error('[data-lifecycle/archive] audit:', auditErr.message);

  return NextResponse.json({
    ok:                 true,
    batchId,
    batchPreviousStatus: previousStatus,
    batchStatusChanged:  false,  // intentional — schema migration needed for 'archived' enum
    archivedDPCount,
    archivedAt,
    note: archivedDPCount > 0
      ? `${archivedDPCount} Decision Pack(s) archived. Batch data preserved for audit.`
      : 'No active Decision Packs to archive. Batch data preserved.',
    migrationNote: "source_batch.batch_status='archived' requires a DB migration. Currently using existing status.",
  });
}
