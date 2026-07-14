// app/api/admin/data-lifecycle/delete/route.ts
// Controlled batch delete — KORA_ADMIN only.
//
// Deletes: personal.uploaded_record + analytics.uef_record for the batch.
// Marks: source_batch.batch_status = 'rejected' as deactivated marker
//        (since 'archived' is not in the enum without a DB migration).
// Blocks: if active Decision Packs exist for this tenant+period.
//
// REQUIRES: confirmation = 'DELETE_BATCH' in body.
// NEVER: deletes tenant, kora_index_result, activation_result, or decision_pack.

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { requireKoraAdmin, isKoraAuthError } from '@/lib/auth/kora-session';
import { getSupabaseServiceClient } from '@/lib/supabase/server';
import { assertSameOrigin } from '@/lib/security/origin';
import { assertRateLimit } from '@/lib/security/rate-limit';

const BLOCK_DELETE_STATUSES = ['draft', 'data_review_required', 'advisor_review_required', 'ready', 'exported'];

function makeAudit(p: {
  tenantId: string; actorId: string; action: string;
  resourceType: string; resourceId?: string; metadata: Record<string, unknown>;
}) {
  return {
    tenant_id:     p.tenantId,
    actor_role:    'KORA_ADMIN',
    actor_id:      p.actorId,
    action:        p.action,
    resource_type: p.resourceType,
    resource_id:   p.resourceId ?? null,
    payload:       p.metadata,
    ip_address:    null,
  };
}

export async function POST(request: NextRequest) {
  const originGuard = assertSameOrigin(request);
  if (originGuard) return originGuard;

  const authResult = await requireKoraAdmin(request);
  if (isKoraAuthError(authResult)) return authResult;

  const rateLimitGuard = await assertRateLimit('destructive_admin_operation', authResult.id);
  if (rateLimitGuard) return rateLimitGuard;

  let body: Record<string, unknown>;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 }); }

  const batchId      = String(body['batchId']      ?? '').trim();
  const confirmation = String(body['confirmation'] ?? '').trim();
  const reason       = String(body['reason']       ?? '').trim().slice(0, 500);

  if (!batchId) return NextResponse.json({ error: 'batchId is required.' }, { status: 400 });

  // Hard confirmation gate — must be exact string
  if (confirmation !== 'DELETE_BATCH') {
    return NextResponse.json({
      error: 'Missing required confirmation. Set confirmation = "DELETE_BATCH" in request body.',
      hint:  'This action permanently deletes uploaded_record and uef_record for the batch.',
    }, { status: 400 });
  }

  const db = getSupabaseServiceClient();
  const auditRows: ReturnType<typeof makeAudit>[] = [];

  // Lookup batch
  const { data: batch, error: bErr } = await db.schema('analytics').from('source_batch')
    .select('id, tenant_id, reporting_period, batch_status, source_name')
    .eq('id', batchId).maybeSingle();

  if (bErr) return NextResponse.json({ error: bErr.message }, { status: 500 });
  if (!batch) return NextResponse.json({ error: `Batch not found: ${batchId}` }, { status: 404 });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const b = batch as any;
  const tenantId        = b.tenant_id as string;
  const reportingPeriod = b.reporting_period as string;

  // Audit: delete requested
  auditRows.push(makeAudit({
    tenantId, actorId: authResult.id,
    action: 'source_batch_delete_requested',
    resourceType: 'analytics.source_batch', resourceId: batchId,
    metadata: { batch_id: batchId, reporting_period: reportingPeriod, reason: reason || null },
  }));

  // Safety check: block if active Decision Packs exist for tenant+period
  const { data: activeDPs } = await db.schema('analytics').from('decision_pack_version')
    .select('id, version_id, status')
    .eq('tenant_id', tenantId)
    .eq('reporting_period', reportingPeriod)
    .in('status', BLOCK_DELETE_STATUSES);

  if (activeDPs && activeDPs.length > 0) {
    auditRows.push(makeAudit({
      tenantId, actorId: authResult.id,
      action: 'source_batch_delete_blocked_linked_results',
      resourceType: 'analytics.source_batch', resourceId: batchId,
      metadata: {
        batch_id:           batchId,
        blocking_dp_count:  activeDPs.length,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        blocking_statuses:  [...new Set((activeDPs as any[]).map((dp: any) => dp.status))],
      },
    }));
    await db.schema('audit').from('audit_log').insert(auditRows);

    return NextResponse.json({
      ok:             false,
      error:          'Delete blocked: active Decision Packs exist for this tenant/period.',
      blockingDPCount: activeDPs.length,
      hint:           'Archive the Decision Packs first via POST /api/admin/data-lifecycle/archive, then retry delete.',
    }, { status: 422 });
  }

  // ── DELETION PHASE ─────────────────────────────────────────────────────────

  // 1. Delete personal.uploaded_record
  const { count: urCount, error: urErr } = await db
    .schema('personal').from('uploaded_record')
    .delete({ count: 'exact' }).eq('batch_id', batchId);

  if (urErr) {
    return NextResponse.json({ error: `uploaded_record delete failed: ${urErr.message}` }, { status: 500 });
  }
  const deletedUploadedCount = urCount ?? 0;

  auditRows.push(makeAudit({
    tenantId, actorId: authResult.id,
    action: 'uploaded_records_deleted',
    resourceType: 'personal.uploaded_record', resourceId: batchId,
    metadata: { batch_id: batchId, deleted_count: deletedUploadedCount },
  }));

  // 2. Delete analytics.uef_record
  const { count: uefCount, error: uefErr } = await db
    .schema('analytics').from('uef_record')
    .delete({ count: 'exact' }).eq('batch_id', batchId);

  if (uefErr) {
    return NextResponse.json({ error: `uef_record delete failed: ${uefErr.message}` }, { status: 500 });
  }
  const deletedUefCount = uefCount ?? 0;

  auditRows.push(makeAudit({
    tenantId, actorId: authResult.id,
    action: 'uef_records_deleted',
    resourceType: 'analytics.uef_record', resourceId: batchId,
    metadata: { batch_id: batchId, deleted_count: deletedUefCount },
  }));

  // 3. Mark source_batch as 'rejected' = deactivated marker
  // ('archived' enum not available without DB migration — documented)
  const { error: sbErr } = await db.schema('analytics').from('source_batch')
    .update({ batch_status: 'rejected' }).eq('id', batchId);
  if (sbErr) console.error('[data-lifecycle/delete] source_batch status update:', sbErr.message);

  auditRows.push(makeAudit({
    tenantId, actorId: authResult.id,
    action: 'source_batch_deleted',
    resourceType: 'analytics.source_batch', resourceId: batchId,
    metadata: {
      batch_id:              batchId,
      deleted_uploaded_count: deletedUploadedCount,
      deleted_uef_count:     deletedUefCount,
      new_batch_status:      'rejected',
      reason:                reason || null,
      note:                  "batch_status='rejected' used as deactivated marker — 'archived' requires DB migration",
    },
  }));

  // Flush audit
  const { error: auditErr } = await db.schema('audit').from('audit_log').insert(auditRows);
  if (auditErr) console.error('[data-lifecycle/delete] audit:', auditErr.message);

  return NextResponse.json({
    ok:                    true,
    batchId,
    deletedUploadedCount,
    deletedUefCount,
    batchStatus:           'rejected',  // deactivated marker
    migrationNote:         "source_batch.batch_status='archived' requires a DB migration.",
    message:               `Batch data deleted. ${deletedUploadedCount} uploaded_records and ${deletedUefCount} UEF records removed.`,
  });
}
