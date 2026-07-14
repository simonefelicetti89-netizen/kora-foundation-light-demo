// app/api/admin/scoring/run-approved-batch/route.ts
// Live scoring from approved UEF records — KORA_ADMIN only.
//
// Reads ONLY analytics.uef_record with:
//   review_status = 'approved' AND approved_for_scoring = true
// for the given batchId. Blocks if count = 0.
//
// Does NOT use: getOp001SyntheticRecords, synthetic fixtures, OP-001 data,
// uploaded_record directly, or operator-flow.
//
// N≥10 enforcement: requires workforce_baseline from DB or workforcePopulation in body.
// Blocks if either is missing or < 10.

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireKoraAdmin, isKoraAuthError } from '@/lib/auth/kora-session';
import { getSupabaseServiceClient } from '@/lib/supabase/server';
import { runKoraPipeline } from '@/lib/kora-engine';
import { persistKoraComputationResult } from '@/lib/live/persistence';
import { persistDecisionPack } from '@/lib/live/decision-pack';
import { buildScoringRecordsFromApprovedUef, type UefRowForScoring } from '@/lib/live/uef-to-scoring-records';
import { assertSameOrigin } from '@/lib/security/origin';

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

type AuditRow = ReturnType<typeof makeAudit>;

async function flushAudit(db: ReturnType<typeof getSupabaseServiceClient>, rows: AuditRow[]) {
  if (rows.length === 0) return;
  const { error } = await db.schema('audit').from('audit_log').insert(rows);
  if (error) console.error('[scoring/run-approved-batch] audit flush:', error.message);
}

const RunBatchSchema = z.object({
  batchId:             z.string().min(1, 'batchId is required.'),
  workforcePopulation: z.number().int().positive().optional().nullable(),
});

export async function POST(request: NextRequest) {
  const originGuard = assertSameOrigin(request);
  if (originGuard) return originGuard;


  // ── 1. Auth ─────────────────────────────────────────────────────────────────
  const authResult = await requireKoraAdmin(request);
  if (isKoraAuthError(authResult)) return authResult;

  // ── 2. Parse body ────────────────────────────────────────────────────────────
  let rawBody: unknown;
  try { rawBody = await request.json(); }
  catch { return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 }); }

  const parsed = RunBatchSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Payload non valido.' },
      { status: 400 },
    );
  }

  const batchId    = parsed.data.batchId.trim();
  const bodyWfPop  = parsed.data.workforcePopulation ?? null;

  const db = getSupabaseServiceClient();
  const auditRows: AuditRow[] = [];

  // ── 3. Lookup source_batch ───────────────────────────────────────────────────
  const { data: batch, error: batchErr } = await db
    .schema('analytics').from('source_batch')
    .select('id, tenant_id, reporting_period, batch_status, source_type')
    .eq('id', batchId)
    .maybeSingle();

  if (batchErr) return NextResponse.json({ error: `Batch lookup failed: ${batchErr.message}` }, { status: 500 });
  if (!batch) return NextResponse.json({ error: `Batch not found: ${batchId}` }, { status: 404 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const b = batch as any;
  const tenantId        = b.tenant_id        as string;
  const reportingPeriod = b.reporting_period  as string;

  // ── 4. Lookup tenant ─────────────────────────────────────────────────────────
  const { data: tenant, error: tenantErr } = await db
    .schema('analytics').from('tenant')
    .select('id, tenant_code')
    .eq('id', tenantId)
    .maybeSingle();

  if (tenantErr) return NextResponse.json({ error: tenantErr.message }, { status: 500 });
  if (!tenant) return NextResponse.json({ error: `Tenant not found for batch.` }, { status: 404 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tenantCode = (tenant as any).tenant_code as string;

  // B102: OP-001 is synthetic demo only — block live scoring explicitly.
  if (tenantCode === 'OP-001') {
    return NextResponse.json({
      ok:    false,
      error: 'Live scoring non disponibile per OP-001 (tenant sintetico demo).',
      hint:  'Usa /admin/operator-flow per la pipeline sintetica OP-001. Per lo scoring live usa un tenant reale.',
    }, { status: 422 });
  }

  // ── 5. Read ONLY approved UEF records ────────────────────────────────────────
  // Strict filter: review_status='approved' AND approved_for_scoring=true.
  // Pending, rejected, needs_info records are explicitly excluded by this query.
  const { data: uefData, error: uefErr } = await db
    .schema('analytics').from('uef_record')
    .select('id, raw_name, eligibility, primary_pillar, action_family, event_nature, missing_fields, approved_for_impact_units, payload')
    .eq('batch_id', batchId)
    .eq('review_status', 'approved')
    .eq('approved_for_scoring', true);

  if (uefErr) return NextResponse.json({ error: `UEF record read failed: ${uefErr.message}` }, { status: 500 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const uefRows = (uefData ?? []) as any[];

  if (uefRows.length === 0) {
    // Audit the block before returning
    auditRows.push(makeAudit({
      tenantId, actorId: authResult.id,
      action: 'live_scoring_blocked_no_approved_uef',
      resourceType: 'analytics.uef_record', resourceId: batchId,
      metadata: { batch_id: batchId, tenant_code: tenantCode, reporting_period: reportingPeriod },
    }));
    await flushAudit(db, auditRows);

    return NextResponse.json({
      ok:    false,
      error: 'No approved UEF records available for scoring.',
      hint:  'Use /admin/uef-review to approve UEF candidates before running scoring.',
    }, { status: 422 });
  }

  // ── 6. Workforce baseline / N≥10 enforcement ─────────────────────────────────
  // Priority: DB baseline > body param. If neither ≥ 10, block.
  let workforcePopulation: number;

  const { data: baseline } = await db
    .schema('personal').from('workforce_baseline')
    .select('total_workers')
    .eq('tenant_id', tenantId)
    .eq('reporting_period', reportingPeriod)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const baselineWorkers = (baseline as any)?.total_workers as number | undefined;

  if (baselineWorkers != null && baselineWorkers >= 10) {
    workforcePopulation = baselineWorkers;
  } else if (bodyWfPop !== null && bodyWfPop >= 10) {
    workforcePopulation = bodyWfPop;
  } else if (bodyWfPop !== null && bodyWfPop < 10) {
    // Explicit value given but below threshold
    auditRows.push(makeAudit({
      tenantId, actorId: authResult.id,
      action: 'live_scoring_blocked_missing_baseline',
      resourceType: 'analytics.source_batch', resourceId: batchId,
      metadata: { reason: 'workforce_population_below_10', provided: bodyWfPop },
    }));
    await flushAudit(db, auditRows);
    return NextResponse.json({
      ok:    false,
      error: `workforcePopulation must be >= 10 (N≥10 enforcement). Provided: ${bodyWfPop}.`,
    }, { status: 422 });
  } else {
    // Neither baseline nor body param
    auditRows.push(makeAudit({
      tenantId, actorId: authResult.id,
      action: 'live_scoring_blocked_missing_baseline',
      resourceType: 'analytics.source_batch', resourceId: batchId,
      metadata: { batch_id: batchId, baseline_found: baselineWorkers ?? null, body_value: bodyWfPop },
    }));
    await flushAudit(db, auditRows);
    return NextResponse.json({
      ok:    false,
      error: 'Workforce baseline missing. Provide workforcePopulation >= 10 in request body.',
      hint:  'Run operator flow first to create a workforce baseline, or include workforcePopulation in this request.',
    }, { status: 422 });
  }

  // ── 7. Audit: approved_uef_loaded + live_scoring_requested ───────────────────
  auditRows.push(makeAudit({
    tenantId, actorId: authResult.id,
    action: 'approved_uef_loaded',
    resourceType: 'analytics.uef_record', resourceId: batchId,
    metadata: { batch_id: batchId, approved_count: uefRows.length, workforce_population: workforcePopulation },
  }));

  auditRows.push(makeAudit({
    tenantId, actorId: authResult.id,
    action: 'live_scoring_requested',
    resourceType: 'analytics.source_batch', resourceId: batchId,
    metadata: {
      batch_id: batchId, tenant_code: tenantCode, reporting_period: reportingPeriod,
      approved_uef_count: uefRows.length, workforce_population: workforcePopulation,
      using_synthetic_fixture: false,  // explicit: no synthetic fixture
    },
  }));

  // ── 8. Build scoring records from approved UEF — no synthetic fixture ─────────
  const typedUefRows = uefRows.map(row => ({
    id:                        row.id as string,
    raw_name:                  row.raw_name as string,
    eligibility:               row.eligibility as string,
    primary_pillar:            row.primary_pillar as string | null,
    action_family:             row.action_family as string | null,
    event_nature:              row.event_nature as string | null,
    missing_fields:            Array.isArray(row.missing_fields) ? row.missing_fields as string[] : [],
    approved_for_impact_units: Boolean(row.approved_for_impact_units),
    payload:                   (row.payload ?? {}) as Record<string, unknown>,
  })) satisfies UefRowForScoring[];

  const records = buildScoringRecordsFromApprovedUef(typedUefRows, batchId);

  // ── 9. Run KORA Pipeline ──────────────────────────────────────────────────────
  const pipelineResult = runKoraPipeline({
    tenantId,
    batchId,
    records,
    workforcePopulation,
  });

  // ── 10. Persist computation results ──────────────────────────────────────────
  const persistResult = await persistKoraComputationResult({
    tenantId, batchId, reportingPeriod, workforcePopulation, result: pipelineResult,
  });

  // ── 11. Create Decision Pack draft ───────────────────────────────────────────
  const decisionPack = await persistDecisionPack({
    db, tenantId, reportingPeriod, persistenceResult: persistResult,
    createdBy: authResult.email,
    packPayload: {
      batch_id:             batchId,
      approved_uef_count:   uefRows.length,
      workforce_population: workforcePopulation,
      live_scoring:         true,
      b6_run:               true,
      synthetic_test:       false,
      calibration_status:   'pre_empirical_calibration',
    },
  });

  // ── 12. Update source_batch → 'approved' ─────────────────────────────────────
  const { error: batchUpdateErr } = await db
    .schema('analytics').from('source_batch')
    .update({ batch_status: 'approved' })
    .eq('id', batchId);
  if (batchUpdateErr) console.error('[scoring] batch status update:', batchUpdateErr.message);

  // ── 13. Audit: live_scoring_completed + decision_pack_created ─────────────────
  auditRows.push(makeAudit({
    tenantId, actorId: authResult.id,
    action: 'live_scoring_completed',
    resourceType: 'analytics.kora_index_result', resourceId: persistResult.koraIndexResultId,
    metadata: {
      kora_index_value:            pipelineResult.koraIndex.value,
      safeguard_status:            pipelineResult.activation.safeguardStatus,
      confidence_score:            pipelineResult.confidence.score,
      scoring_mode:                pipelineResult.scoringMode,
      approved_uef_count:          uefRows.length,
      workforce_population:        workforcePopulation,
      kora_index_result_id:        persistResult.koraIndexResultId,
      using_synthetic_fixture:     false,
    },
  }));

  auditRows.push(makeAudit({
    tenantId, actorId: authResult.id,
    action: 'decision_pack_created',
    resourceType: 'analytics.decision_pack_version', resourceId: decisionPack.id,
    metadata: {
      version_id:           decisionPack.versionId,
      status:               'draft',
      kora_index_result_id: persistResult.koraIndexResultId,
    },
  }));

  await flushAudit(db, auditRows);

  // ── 14. Return ────────────────────────────────────────────────────────────────
  return NextResponse.json({
    ok:              true,
    tenantCode,
    reportingPeriod,
    batchId,
    approvedUefCount:          uefRows.length,
    workforcePopulation,
    scoringMode:               pipelineResult.scoringMode,
    koraIndex:                 pipelineResult.koraIndex.value,
    confidenceScore:           pipelineResult.confidence.score,
    safeguard:                 pipelineResult.activation.safeguardStatus,
    activationRate:            pipelineResult.activation.activationReach,
    meaningfulActivationRate:  pipelineResult.activation.meaningfulActivationReach,
    decisionPack: {
      id:        decisionPack.id,
      versionId: decisionPack.versionId,
      status:    decisionPack.status,
    },
    persisted: {
      koraIndexResultId:  persistResult.koraIndexResultId,
      activationResultId: persistResult.activationResultId,
      confidenceResultId: persistResult.confidenceResultId,
      btiResultId:        persistResult.btiResultId,
    },
    previewUrl: `/api/admin/decision-pack/preview?tenantCode=${tenantCode}&reportingPeriod=${reportingPeriod}`,
    pdfUrl:     `/api/admin/decision-pack/pdf?tenantCode=${tenantCode}&reportingPeriod=${reportingPeriod}`,
    syntheticFixture: false,  // explicit: no synthetic data used
  });
}
