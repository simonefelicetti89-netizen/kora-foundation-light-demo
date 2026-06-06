// app/api/admin/uef/generate-candidates/route.ts
// Generate UEF candidates from a pending B4.2 batch — KORA_ADMIN only.
//
// Reads personal.uploaded_record (review_status='pending') for the given batch,
// runs the Raw-to-UEF rule-based interpreter per record,
// writes analytics.uef_record with review_status='pending_review'.
//
// NO scoring. NO KORA Index. NO Decision Pack. NO operator-flow.
// approved_for_scoring = false for all candidates — requires human review.
//
// source_batch.batch_status → 'processing' (nearest available status for
// "review in progress"; 'review_ready' is not in the enum).
// uploaded_record.review_status stays 'pending' (not yet approved by human).

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/types';
import { requireKoraAdmin, isKoraAuthError } from '@/lib/auth/kora-session';
import {
  interpretUploadedRecord,
  type UploadedRecordInput,
  type BatchFinancialContext,
  type FinancialSourceType,
  type EvidenceLevel,
  type BudgetScope,
} from '@/lib/ingestion/raw-to-uef-interpreter';

function makeAudit(p: {
  tenantId: string; actorId: string; action: string;
  resourceType: string; resourceId?: string; metadata: Record<string, unknown>;
}) {
  return {
    tenant_id: p.tenantId, actor_role: 'KORA_ADMIN', actor_id: p.actorId,
    action: p.action, resource_type: p.resourceType,
    resource_id: p.resourceId ?? null, payload: p.metadata, ip_address: null,
  };
}

export async function POST(request: NextRequest) {
  const authResult = await requireKoraAdmin(request);
  if (isKoraAuthError(authResult)) return authResult;

  let body: Record<string, unknown>;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 }); }

  const batchId = String(body['batchId'] ?? '').trim();
  if (!batchId) {
    return NextResponse.json({ error: 'batchId is required.' }, { status: 400 });
  }

  const db = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  // ── Lookup source_batch ──────────────────────────────────────────────────────
  const { data: batch, error: batchErr } = await db
    .schema('analytics').from('source_batch')
    .select('id, tenant_id, batch_status, reporting_period, source_type, row_count, payload_sample')
    .eq('id', batchId)
    .maybeSingle();

  if (batchErr) return NextResponse.json({ error: `Batch lookup failed: ${batchErr.message}` }, { status: 500 });
  if (!batch) return NextResponse.json({ error: `Batch not found: ${batchId}` }, { status: 404 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const b = batch as any;
  if (b.batch_status !== 'pending') {
    return NextResponse.json({
      error: `Batch is not in 'pending' status. Current status: '${b.batch_status}'. Candidates can only be generated from pending batches.`,
      currentStatus: b.batch_status,
    }, { status: 400 });
  }

  const tenantId        = b.tenant_id as string;
  const reportingPeriod = b.reporting_period as string;

  // B11.3: extract batch financial context from payload_sample (_b11_3 marker)
  let batchContext: BatchFinancialContext | undefined;
  const ps = b.payload_sample as Record<string, unknown> | null;
  if (ps && ps['_b11_3'] === true) {
    batchContext = {
      currency:                'EUR',
      financialSourceType:     (ps['financialSourceType'] as FinancialSourceType) ?? 'unknown',
      defaultEvidenceLevel:    (ps['defaultEvidenceLevel'] as EvidenceLevel)      ?? 'L0',
      budgetScope:             (ps['budgetScope'] as BudgetScope)                 ?? 'unknown',
      containsAmounts:         (ps['containsAmounts']        as 'yes'|'no'|'unknown') ?? 'unknown',
      containsEconomicRelief:  (ps['containsEconomicRelief'] as 'yes'|'no'|'unknown') ?? 'unknown',
      containsComplianceSpend: (ps['containsComplianceSpend'] as 'yes'|'no'|'unknown') ?? 'unknown',
    };
  }

  // ── Idempotency: check if candidates already exist for this batch ────────────
  const { count: existingCount } = await db
    .schema('analytics').from('uef_record')
    .select('id', { count: 'exact', head: true })
    .eq('batch_id', batchId);

  if ((existingCount ?? 0) > 0) {
    return NextResponse.json({
      error: `UEF candidates already generated for batch ${batchId}. ${existingCount} records exist.`,
      hint: 'Use GET /api/admin/uef/review?batchId=... to view existing candidates.',
    }, { status: 409 });
  }

  // ── Read uploaded_records (pending review) ───────────────────────────────────
  const { data: uploadedRows, error: urErr } = await db
    .schema('personal').from('uploaded_record')
    .select('id, payload, action_family, event_nature, primary_pillar, eligibility_status')
    .eq('batch_id', batchId)
    .eq('review_status', 'pending');

  if (urErr) return NextResponse.json({ error: `uploaded_record read failed: ${urErr.message}` }, { status: 500 });
  if (!uploadedRows || uploadedRows.length === 0) {
    return NextResponse.json({
      error: 'No pending uploaded_records found for this batch.',
      hint: 'Ensure the batch was created via POST /api/admin/data-intake/accept and records are in pending status.',
    }, { status: 400 });
  }

  // ── Run interpreter + build uef_record inserts ───────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const uefRows = (uploadedRows as any[]).map((row: any) => {
    const input: UploadedRecordInput = {
      id:                 row.id,
      payload:            (row.payload as Record<string, unknown>) ?? {},
      action_family:      row.action_family ?? null,
      event_nature:       row.event_nature ?? null,
      primary_pillar:     row.primary_pillar ?? null,
      eligibility_status: row.eligibility_status ?? null,
    };

    const proposal = interpretUploadedRecord(input, 'KORA Methodology v0.1', batchContext);

    // uef_record.eligibility is 'eligible'|'limited'|'blocked' — no 'review_required'
    const eligibility = proposal.eligibility;

    return {
      tenant_id:                   tenantId,
      batch_id:                    batchId,
      reporting_period:            reportingPeriod,
      raw_name:                    proposal.rawName,
      eligibility,
      primary_pillar:              proposal.pillar,
      action_family:               proposal.actionFamily,
      event_nature:                proposal.eventNature,
      approved_for_scoring:        false,   // B5: human approval required
      approved_for_bti_governance: false,
      approved_for_impact_units:   false,
      data_completeness_score:     proposal.mappingConfidence,
      missing_fields:              proposal.warnings,
      review_status:               'pending_review',  // free string — no enum
      reviewer_notes:              null,
      reviewed_by:                 null,
      reviewed_at:                 null,
      payload: {
        // Extended fields stored in payload — no schema migration needed
        uploaded_record_id:         row.id,
        event_type:                 proposal.eventType,
        reason_codes:               proposal.reasonCodes,
        budget_amount:              proposal.budgetAmount,
        participants:               proposal.participants,
        evidence_level:             proposal.evidenceLevel,
        source_tier:                proposal.sourceTier,
        // ── B65-B2: parsing transparency ────────────────────────────────
        amount_parsing_status:      proposal.amountParsingStatus,
        participants_approximate:   proposal.participantsApproximate,
        raw_amount_value:           proposal.rawAmountValue ?? null,
        // ── B11: enrichment classification ──────────────────────────────
        initiative_domain:          proposal.initiativeDomain,
        budget_class:               proposal.budgetClass,
        needs_enrichment:           proposal.needsEnrichment,
        financial_confidence:       proposal.financialConfidence,
        enrichment_missing_fields:  proposal.enrichmentMissingFields,
        mapping_confidence:         proposal.mappingConfidence,
        enriched_by:                null,
        enriched_at:                null,
        enrichment_notes:           null,
        b11_enriched:               false,
        // ──────────────────────────────────────────────────────────────────
        interpreter_version:        proposal.interpreterVersion,
        generated_by:               proposal.generatedBy,
        methodology_version:        'KORA Methodology v0.1',
        b5_candidate:               true,
        scoring_locked:             true,  // locked until B6
      },
    };
  });

  // ── Bulk insert uef_records ───────────────────────────────────────────────────
  const { error: uefInsertErr } = await db
    .schema('analytics').from('uef_record').insert(uefRows);
  if (uefInsertErr) {
    return NextResponse.json(
      { error: `uef_record insertion failed: ${uefInsertErr.message}` },
      { status: 500 },
    );
  }

  // ── Update source_batch status → 'processing' ────────────────────────────────
  // 'review_ready' is not in the batch_status enum.
  // 'processing' is the nearest available status meaning "under review / in progress".
  // uploaded_record.review_status stays 'pending' — NOT set to 'approved'.
  const { error: batchUpdateErr } = await db
    .schema('analytics').from('source_batch')
    .update({ batch_status: 'processing' })
    .eq('id', batchId);
  if (batchUpdateErr) {
    console.error('[uef/generate-candidates] batch status update:', batchUpdateErr.message);
    // Non-blocking — candidates are created; status update failure is logged
  }

  // ── Stats for response ────────────────────────────────────────────────────────
  const highConfThreshold = 0.70;
  const generated     = uefRows.length;
  const highConf      = uefRows.filter(r => r.data_completeness_score >= highConfThreshold).length;
  const blocked       = uefRows.filter(r => r.eligibility === 'blocked').length;
  const needsReview   = uefRows.filter(r => r.data_completeness_score < highConfThreshold && r.eligibility !== 'blocked').length;
  const avgConf       = generated > 0
    ? Math.round(uefRows.reduce((s, r) => s + r.data_completeness_score, 0) / generated * 100) / 100
    : 0;

  // ── Audit event ───────────────────────────────────────────────────────────────
  const audit = makeAudit({
    tenantId, actorId: authResult.id,
    action: 'uef_candidates_generated',
    resourceType: 'analytics.uef_record', resourceId: batchId,
    metadata: {
      batch_id: batchId, generated_count: generated, high_confidence_count: highConf,
      needs_review_count: needsReview, blocked_count: blocked,
      avg_confidence: avgConf, interpreter_version: '0.1',
      scoring_locked: true,
    },
  });
  const { error: auditErr } = await db.schema('audit').from('audit_log').insert(audit);
  if (auditErr) console.error('[uef/generate-candidates] audit:', auditErr.message);

  return NextResponse.json({
    ok:                 true,
    batchId,
    batchStatus:        'processing',
    generatedCount:     generated,
    highConfidenceCount: highConf,
    needsReviewCount:   needsReview,
    blockedCount:       blocked,
    avgConfidence:      avgConf,
    scoringLocked:      true,
    message:            'UEF candidates generated. Human review required before scoring. Scoring locked until B6.',
    reviewUrl:          `/api/admin/uef/review?batchId=${batchId}`,
  });
}
