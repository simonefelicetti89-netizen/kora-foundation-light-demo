// app/api/admin/uef/review/route.ts
// UEF Review queue — KORA_ADMIN only.
//
// GET /api/admin/uef/review             → list pending/processing batches
// GET /api/admin/uef/review?batchId=... → list uef_record candidates for batch
// POST /api/admin/uef/review            → approve | reject | needs_info action
//
// NO scoring. approve only sets approved_for_scoring flag — does NOT trigger scoring.
//
// Gate 2.3 Step 2 (complete): GET Case B now calls analytics.fn_admin_uef_review()
//   — SECURITY DEFINER function, payload excluded at DB object level.
//   Created by migration 030; least-privilege grants enforced by migration 031.

export const runtime = 'nodejs';

// Local return type for analytics.fn_admin_uef_review(p_batch_id uuid).
// Replace with generated DB types once supabase gen types is refreshed post-Gate 2.
// payload JSONB intentionally absent — excluded at DB object level (Gate 2.3).
interface UEFReviewRow {
  id: string;
  tenant_id: string;
  batch_id: string;
  reporting_period: string;
  raw_name: string;
  eligibility: string;
  primary_pillar: string | null;
  action_family: string | null;
  event_nature: string | null;
  approved_for_scoring: boolean;
  approved_for_bti_governance: boolean;
  approved_for_impact_units: boolean;
  data_completeness_score: number;
  missing_fields: string[] | null;
  review_status: string;
  reviewer_notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  // Interpreter-derived payload sub-fields (named typed columns — not raw payload):
  event_type: string | null;
  reason_codes: unknown[] | null;
  budget_amount: number | null;
  participants: number | null;
  evidence_level: string | null;
  source_tier: string | null;
  amount_parsing_status: string | null;
  participants_approximate: boolean | null;
  raw_amount_value: number | null;
  initiative_domain: string | null;
  budget_class: string | null;
  needs_enrichment: boolean | null;
  financial_confidence: string | null;
  enrichment_missing_fields: unknown[] | null;
  interpreter_version: string | null;
  scoring_locked: boolean | null;
  enriched_by: string | null;
  enriched_at: string | null;
  b11_enriched: boolean | null;
  // payload: JSONB intentionally absent — fn_admin_uef_review does not return it
}

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServiceClient } from '@/lib/supabase/server';
import { requireKoraAdmin, isKoraAuthError } from '@/lib/auth/kora-session';

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

// ── GET ────────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const authResult = await requireKoraAdmin(request);
  if (isKoraAuthError(authResult)) return authResult;

  const { searchParams } = new URL(request.url);
  const batchId = searchParams.get('batchId');

  // Service-role: UEF review reads require system-level access after KORA_ADMIN auth.
  // Gate 2.3 complete: kora_admin_all_uef dropped (030); Case B now calls
  // fn_admin_uef_review() SECURITY DEFINER (payload excluded at DB object level).
  const db = getSupabaseServiceClient();

  // ── Case A: list reviewable batches (no batchId) ─────────────────────────────
  if (!batchId) {
    const { data: batches, error: bErr } = await db
      .schema('analytics').from('source_batch')
      .select('id, tenant_id, source_name, source_type, reporting_period, batch_status, row_count, created_at, created_by')
      .in('batch_status', ['pending', 'processing'])
      .eq('source_type', 'csv_upload')
      .order('created_at', { ascending: false })
      .limit(50);

    if (bErr) return NextResponse.json({ error: bErr.message }, { status: 500 });

    // Resolve tenant_code + company_name for all batches (single lookup, not N queries)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const uniqueTenantIds = [...new Set((batches ?? []).map((b: any) => b.tenant_id as string))];
    const tenantMap: Record<string, { tenantCode: string; companyName: string }> = {};
    if (uniqueTenantIds.length > 0) {
      const { data: tenantRows } = await db.schema('analytics').from('tenant')
        .select('id, tenant_code, company_name').in('id', uniqueTenantIds);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const t of (tenantRows ?? []) as any[]) {
        tenantMap[t.id as string] = { tenantCode: t.tenant_code, companyName: t.company_name };
      }
    }

    // For each batch, count uef_record candidates
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const enriched = await Promise.all((batches ?? []).map(async (b: any) => {
      const { count } = await db.schema('analytics').from('uef_record')
        .select('id', { count: 'exact', head: true }).eq('batch_id', b.id);
      const tenant = tenantMap[b.tenant_id as string];
      return {
        batchId:         b.id,
        sourceName:      b.source_name,
        reportingPeriod: b.reporting_period,
        batchStatus:     b.batch_status,
        rowCount:        b.row_count,
        candidateCount:  count ?? 0,
        createdAt:       b.created_at,
        createdBy:       b.created_by,
        tenantCode:      tenant?.tenantCode  ?? null,   // B9.1: tenant visibility
        companyName:     tenant?.companyName ?? null,
        canGenerate:     b.batch_status === 'pending' && (count ?? 0) === 0,
        canReview:       (count ?? 0) > 0,
      };
    }));

    return NextResponse.json({ ok: true, batches: enriched, total: enriched.length });
  }

  // ── Case B: list UEF candidates for a specific batch ─────────────────────────
  // Gate 2.3 Step 2: calls fn_admin_uef_review — SECURITY DEFINER, payload excluded at DB level.
  // Migration 030 creates the function; migration 031 enforces least-privilege grants.
  // Service-role client (BYPASSRLS) is authorised by the function's internal role check.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: records, error: rErr } = await (db.schema('analytics') as any)
    .rpc('fn_admin_uef_review', { p_batch_id: batchId });

  if (rErr) return NextResponse.json({ error: rErr.message }, { status: 500 });
  if (!records || (records as UEFReviewRow[]).length === 0) {
    return NextResponse.json({ ok: true, batchId, candidates: [], total: 0 });
  }

  // fn_admin_uef_review returns named typed columns including safe payload sub-fields.
  // payload JSONB is excluded at DB object level — not returned, not mapped, not exposed.
  const safe = (records as UEFReviewRow[]).map((r) => ({
    id:                    r.id,
    rawName:               r.raw_name,
    eligibility:           r.eligibility,
    pillar:                r.primary_pillar,
    actionFamily:          r.action_family,
    eventNature:           r.event_nature,
    reviewStatus:          r.review_status,
    approvedForScoring:    r.approved_for_scoring,
    mappingConfidence:     r.data_completeness_score,
    warnings:              r.missing_fields ?? [],
    reviewerNotes:         r.reviewer_notes,
    reviewedBy:            r.reviewed_by,
    reviewedAt:            r.reviewed_at,
    // Interpreter-derived payload sub-fields — now proper typed values from fn_admin_uef_review:
    eventType:                r.event_type,
    reasonCodes:              Array.isArray(r.reason_codes) ? r.reason_codes : [],
    budgetAmount:             r.budget_amount,
    participants:             r.participants,
    evidenceLevel:            r.evidence_level,
    sourceTier:               r.source_tier,
    interpreterVersion:       r.interpreter_version,
    scoringLocked:            r.scoring_locked ?? true,
    amountParsingStatus:      r.amount_parsing_status ?? 'missing',
    participantsApproximate:  r.participants_approximate ?? false,
    rawAmountValue:           r.raw_amount_value,
    initiativeDomain:         r.initiative_domain,
    budgetClass:              r.budget_class,
    needsEnrichment:          r.needs_enrichment ?? false,
    financialConfidence:      r.financial_confidence,
    enrichmentMissingFields:  Array.isArray(r.enrichment_missing_fields) ? r.enrichment_missing_fields : [],
    enrichedBy:               r.enriched_by,
    enrichedAt:               r.enriched_at,
    b11Enriched:              r.b11_enriched ?? false,
    createdAt:                r.created_at,
  }));

  const summary = {
    total:      safe.length,
    approved:   safe.filter((r: { reviewStatus: string }) => r.reviewStatus === 'approved').length,
    rejected:   safe.filter((r: { reviewStatus: string }) => r.reviewStatus === 'rejected').length,
    needsInfo:  safe.filter((r: { reviewStatus: string }) => r.reviewStatus === 'needs_info').length,
    pending:    safe.filter((r: { reviewStatus: string }) => r.reviewStatus === 'pending_review').length,
    avgConfidence: safe.length > 0
      ? Math.round(safe.reduce((s: number, r: { mappingConfidence: number }) => s + r.mappingConfidence, 0) / safe.length * 100) / 100
      : 0,
  };

  return NextResponse.json({ ok: true, batchId, candidates: safe, summary });
}

// ── POST ───────────────────────────────────────────────────────────────────────

const VALID_ACTIONS = new Set(['approve', 'reject', 'needs_info']);

export async function POST(request: NextRequest) {
  const authResult = await requireKoraAdmin(request);
  if (isKoraAuthError(authResult)) return authResult;

  let body: Record<string, unknown>;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 }); }

  const uefRecordId = String(body['uefRecordId'] ?? '').trim();
  const action      = String(body['action']      ?? '').trim();
  const notes       = body['notes'] != null ? String(body['notes']) : null;

  if (!uefRecordId) return NextResponse.json({ error: 'uefRecordId is required.' }, { status: 400 });
  if (!VALID_ACTIONS.has(action)) {
    return NextResponse.json({
      error: `Invalid action: '${action}'. Must be one of: approve, reject, needs_info.`,
    }, { status: 400 });
  }

  // Service-role: UPDATE on uef_record requires system access after KORA_ADMIN auth.
  // Gate 2.3: direct service-role UPDATE retained for POST; switch to
  // fn_admin_uef_update_review() SECURITY DEFINER function is a separate post-031 step.
  const db = getSupabaseServiceClient();

  // ── Lookup uef_record ─────────────────────────────────────────────────────────
  const { data: rec, error: recErr } = await db
    .schema('analytics').from('uef_record')
    .select('id, tenant_id, batch_id, review_status, eligibility')
    .eq('id', uefRecordId)
    .maybeSingle();

  if (recErr) return NextResponse.json({ error: recErr.message }, { status: 500 });
  if (!rec) return NextResponse.json({ error: `UEF record not found: ${uefRecordId}` }, { status: 404 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const r = rec as any;
  const prevStatus = r.review_status as string;
  const tenantId   = r.tenant_id as string;

  // Map action → review_status + approval flags
  let newStatus: string;
  let approvedForScoring        = false;
  let approvedForBTI            = false;
  let approvedForImpactUnits    = false;

  if (action === 'approve') {
    newStatus              = 'approved';
    approvedForScoring     = true;   // B5: flag set — actual scoring in B6
    approvedForBTI         = true;
    approvedForImpactUnits = r.eligibility === 'eligible'; // only eligible generates IU
  } else if (action === 'reject') {
    newStatus = 'rejected';
  } else {
    newStatus = 'needs_info';
  }

  // ── Update uef_record ─────────────────────────────────────────────────────────
  // Gate 2.3 two-step rollout: service-role direct UPDATE works before and after 030.
  // After migration 030 applied and verified: can switch to
  //   db.schema('analytics').rpc('fn_admin_uef_update_review', { p_uef_id, p_action, p_notes, p_reviewer })
  // The function provides DB-layer action validation + SECURITY DEFINER guard.
  const { error: updateErr } = await db
    .schema('analytics').from('uef_record')
    .update({
      review_status:              newStatus,
      approved_for_scoring:       approvedForScoring,
      approved_for_bti_governance: approvedForBTI,
      approved_for_impact_units:  approvedForImpactUnits,
      reviewed_by:                authResult.email,
      reviewed_at:                new Date().toISOString(),
      reviewer_notes:             notes,
    })
    .eq('id', uefRecordId);

  if (updateErr) {
    return NextResponse.json({ error: `Update failed: ${updateErr.message}` }, { status: 500 });
  }

  // ── Audit event ───────────────────────────────────────────────────────────────
  const auditAction = `uef_record_${action === 'needs_info' ? 'needs_info' : action === 'approve' ? 'approved' : 'rejected'}`;
  const audit = makeAudit({
    tenantId, actorId: authResult.id,
    action: auditAction,
    resourceType: 'analytics.uef_record', resourceId: uefRecordId,
    metadata: {
      uef_record_id:        uefRecordId,
      batch_id:             r.batch_id,
      previous_status:      prevStatus,
      new_status:           newStatus,
      approved_for_scoring: approvedForScoring,
      scoring_locked:       !approvedForScoring, // still locked until B6 runs scoring
    },
  });
  const { error: auditErr } = await db.schema('audit').from('audit_log').insert(audit);
  if (auditErr) console.error('[uef/review] audit:', auditErr.message);

  return NextResponse.json({
    ok:              true,
    uefRecordId,
    previousStatus:  prevStatus,
    newStatus,
    approvedForScoring,
    scoringNote:     approvedForScoring
      ? 'Record approved for scoring. Scoring run will execute in B6.'
      : 'Record not approved for scoring.',
  });
}
