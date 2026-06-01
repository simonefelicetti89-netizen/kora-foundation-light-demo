// app/api/admin/uef/review/route.ts
// UEF Review queue — KORA_ADMIN only.
//
// GET /api/admin/uef/review             → list pending/processing batches
// GET /api/admin/uef/review?batchId=... → list uef_record candidates for batch
// POST /api/admin/uef/review            → approve | reject | needs_info action
//
// NO scoring. approve only sets approved_for_scoring flag — does NOT trigger scoring.

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/types';
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

  const db = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

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
  const { data: records, error: rErr } = await db
    .schema('analytics').from('uef_record')
    .select('id, raw_name, eligibility, primary_pillar, action_family, event_nature, review_status, approved_for_scoring, approved_for_bti_governance, approved_for_impact_units, data_completeness_score, missing_fields, reviewer_notes, reviewed_by, reviewed_at, payload, created_at')
    .eq('batch_id', batchId)
    .order('created_at', { ascending: true });

  if (rErr) return NextResponse.json({ error: rErr.message }, { status: 500 });
  if (!records || records.length === 0) {
    return NextResponse.json({ ok: true, batchId, candidates: [], total: 0 });
  }

  // Return safe fields only — no PII, only interpreter-derived fields
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const safe = (records as any[]).map((r: any) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pl = (r.payload ?? {}) as Record<string, any>;
    return {
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
      // Extended fields from interpreter payload (safe — no PII)
      eventType:                pl['event_type'] ?? null,
      reasonCodes:              pl['reason_codes'] ?? [],
      budgetAmount:             pl['budget_amount'] ?? null,
      participants:             pl['participants'] ?? null,
      evidenceLevel:            pl['evidence_level'] ?? null,
      sourceTier:               pl['source_tier'] ?? null,
      interpreterVersion:       pl['interpreter_version'] ?? null,
      scoringLocked:            pl['scoring_locked'] ?? true,
      // ── B11: enrichment classification fields ─────────────────────────────────
      initiativeDomain:         pl['initiative_domain']         ?? null,
      budgetClass:              pl['budget_class']              ?? null,
      needsEnrichment:          pl['needs_enrichment']          ?? false,
      financialConfidence:      pl['financial_confidence']      ?? null,
      enrichmentMissingFields:  pl['enrichment_missing_fields'] ?? [],
      enrichedBy:               pl['enriched_by']               ?? null,
      enrichedAt:               pl['enriched_at']               ?? null,
      b11Enriched:              pl['b11_enriched']              ?? false,
      createdAt:                r.created_at,
    };
  });

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

  const db = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  // ── Lookup uef_record ─────────────────────────────────────────────────────────
  const { data: rec, error: recErr } = await db
    .schema('analytics').from('uef_record')
    .select('id, tenant_id, batch_id, review_status, eligibility')
    .eq('id', uefRecordId)
    .maybeSingle();

  if (recErr) return NextResponse.json({ error: recErr.message }, { status: 500 });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
