// app/api/admin/uef/enrich/route.ts
// Manual enrichment of UEF record classification and financial data — KORA_ADMIN only.
//
// Updates uef_record.payload with manually provided:
//   initiative_domain, event_type, eligibility_class, pillar, budget_class,
//   budget_amount, budget_source, evidence_level, enrichment_notes.
//
// Rule-based only. No LLM. No scoring. Audited.

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { requireKoraAdmin, isKoraAuthError } from '@/lib/auth/kora-session';
import { getSupabaseServiceClient } from '@/lib/supabase/server';

// Valid taxonomy values
const VALID_DOMAINS    = ['welfare','fringe_benefit','economic_relief','hr_learning','esg_volunteering','compliance_hse','previdenza_future','wellbeing_mental_health','unknown'];
const VALID_PILLARS    = ['LIFE','GROWTH','CONNECTION','IMPACT','LEGACY'];
const VALID_BUDGET_CLS = ['deep_activation','economic_relief','compliance_blocked','unknown'];
const VALID_EVIDENCE   = ['L0','L1','L2','L3','L4'];
const VALID_ELIGIBILITY = ['eligible','limited','blocked'];
const VALID_EVENT_TYPES = [
  'mental_health_support','professional_training','mentoring_program','volunteering',
  'economic_relief','compliance_baseline','health_wellness_program','knowledge_transfer',
  'pension_future_support','caregiver_support','childcare_support','unclassified','unknown',
];

function recomputeNeedsEnrichment(payload: Record<string, unknown>): {
  needsEnrichment: boolean; missingFields: string[];
} {
  const eligibility    = String(payload['eligibility_class'] ?? payload['eligibility'] ?? 'eligible');
  const budgetAmount   = payload['budget_amount'] != null ? Number(payload['budget_amount']) : null;
  const budgetSource   = payload['budget_source'] as string | null;
  const evidenceLevel  = payload['evidence_level'] as string | null;
  const domain         = payload['initiative_domain'] as string ?? 'unknown';
  const eventType      = payload['event_type'] as string ?? 'unclassified';
  const pillar         = payload['pillar'] as string | null;

  const missing: string[] = [];
  if (eligibility !== 'blocked' && budgetAmount === null)                      missing.push('budget_amount');
  if (eligibility !== 'blocked' && (!budgetSource || !evidenceLevel || evidenceLevel === 'L0')) missing.push('budget_source');
  if (domain === 'unknown')                                                     missing.push('initiative_domain');
  if (eventType === 'unclassified' || eventType === 'unknown')                  missing.push('event_type');
  if (!pillar && eligibility !== 'blocked')                                     missing.push('pillar');
  return { needsEnrichment: missing.length > 0, missingFields: missing };
}

function recomputeFinancialConfidence(
  mappingConfidence: number,
  budgetAmount: number | null,
  evidenceLevel: string | null,
): number {
  let fc = mappingConfidence;
  if (budgetAmount === null)                     fc -= 0.20;
  if (!evidenceLevel || evidenceLevel === 'L0')  fc -= 0.15;
  else if (evidenceLevel === 'L1')               fc -= 0.05;
  return Math.max(0.10, Math.min(0.90, Math.round(fc * 100) / 100));
}

export async function POST(request: NextRequest) {
  const authResult = await requireKoraAdmin(request);
  if (isKoraAuthError(authResult)) return authResult;

  let body: Record<string, unknown>;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 }); }

  const uefRecordId = String(body['uefRecordId'] ?? '').trim();
  if (!uefRecordId) return NextResponse.json({ error: 'uefRecordId is required.' }, { status: 400 });

  // ── Validate inputs ────────────────────────────────────────────────────────
  const initiativeDomain = body['initiativeDomain'] != null ? String(body['initiativeDomain']) : null;
  const eventType        = body['eventType']        != null ? String(body['eventType'])        : null;
  const eligibilityClass = body['eligibilityClass'] != null ? String(body['eligibilityClass']) : null;
  const pillar           = body['pillar']           != null ? String(body['pillar'])           : null;
  const budgetClass      = body['budgetClass']      != null ? String(body['budgetClass'])      : null;
  const evidenceLevel    = body['evidenceLevel']    != null ? String(body['evidenceLevel'])    : null;
  const notes            = body['notes']            != null ? String(body['notes']).slice(0, 500) : null;

  const budgetAmountRaw = body['budgetAmount'];
  let budgetAmount: number | null = null;
  if (budgetAmountRaw != null) {
    budgetAmount = Number(budgetAmountRaw);
    if (!isFinite(budgetAmount) || budgetAmount < 0) {
      return NextResponse.json({ error: 'budgetAmount must be a non-negative number.' }, { status: 400 });
    }
  }

  const budgetSource = body['budgetSource'] != null ? String(body['budgetSource']).slice(0, 200) : null;

  if (initiativeDomain && !VALID_DOMAINS.includes(initiativeDomain))
    return NextResponse.json({ error: `Invalid initiativeDomain: ${initiativeDomain}` }, { status: 400 });
  if (eventType && !VALID_EVENT_TYPES.includes(eventType))
    return NextResponse.json({ error: `Invalid eventType: ${eventType}` }, { status: 400 });
  if (eligibilityClass && !VALID_ELIGIBILITY.includes(eligibilityClass))
    return NextResponse.json({ error: `Invalid eligibilityClass: ${eligibilityClass}` }, { status: 400 });
  if (pillar && !VALID_PILLARS.includes(pillar))
    return NextResponse.json({ error: `Invalid pillar: ${pillar}` }, { status: 400 });
  if (budgetClass && !VALID_BUDGET_CLS.includes(budgetClass))
    return NextResponse.json({ error: `Invalid budgetClass: ${budgetClass}` }, { status: 400 });
  if (evidenceLevel && !VALID_EVIDENCE.includes(evidenceLevel))
    return NextResponse.json({ error: `Invalid evidenceLevel: ${evidenceLevel}` }, { status: 400 });

  const db = getSupabaseServiceClient();

  // ── Lookup UEF record ─────────────────────────────────────────────────────
  const { data: rec, error: recErr } = await db
    .schema('analytics').from('uef_record')
    .select('id, tenant_id, batch_id, review_status, payload, primary_pillar, data_completeness_score')
    .eq('id', uefRecordId).maybeSingle();

  if (recErr) return NextResponse.json({ error: recErr.message }, { status: 500 });
  if (!rec) return NextResponse.json({ error: `UEF record not found: ${uefRecordId}` }, { status: 404 });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const r = rec as any;
  const tenantId = r.tenant_id as string;

  // ── Guard: rejected records cannot be enriched ────────────────────────────
  if (r.review_status === 'rejected') {
    const { error: blockAuditErr } = await db.schema('audit').from('audit_log').insert({
      tenant_id:     tenantId,
      actor_role:    'KORA_ADMIN',
      actor_id:      authResult.id,
      action:        'uef_record_enrichment_blocked_rejected',
      resource_type: 'analytics.uef_record',
      resource_id:   uefRecordId,
      payload: {
        uef_record_id: uefRecordId,
        batch_id:      r.batch_id,
        review_status: 'rejected',
      },
      ip_address: null,
    });
    if (blockAuditErr) console.error('[uef/enrich] block audit:', blockAuditErr.message);

    return NextResponse.json({
      error: 'Cannot enrich a rejected UEF record. Reopen or regenerate the candidate first.',
      uefRecordId,
      reviewStatus: 'rejected',
    }, { status: 409 });
  }

  // ── Merge enrichment into payload ─────────────────────────────────────────
  const currentPayload = (r.payload ?? {}) as Record<string, unknown>;
  const currentReasonCodes: string[] = Array.isArray(currentPayload['reason_codes'])
    ? currentPayload['reason_codes'] as string[]
    : [];
  const now = new Date().toISOString();

  // Track which manual overrides were applied (for audit/reason_codes)
  const manualReasonCodes: string[] = [];
  if (budgetAmount !== null) manualReasonCodes.push('manual_enrichment:budget_amount');
  if (budgetSource)          manualReasonCodes.push('manual_enrichment:budget_source');
  if (initiativeDomain)      manualReasonCodes.push('manual_override:classification');
  if (eligibilityClass)      manualReasonCodes.push('manual_override:eligibility');
  if (pillar)                manualReasonCodes.push('manual_override:pillar');
  if (eventType)             manualReasonCodes.push('manual_override:event_type');

  const updatedPayload: Record<string, unknown> = {
    ...currentPayload,
    // Apply provided enrichment values (keep existing if not provided)
    ...(initiativeDomain !== null && { initiative_domain: initiativeDomain }),
    ...(eventType        !== null && { event_type:        eventType        }),
    ...(budgetClass      !== null && { budget_class:      budgetClass      }),
    ...(budgetAmount     !== null && { budget_amount:     budgetAmount     }),
    ...(budgetSource     !== null && { budget_source:     budgetSource     }),
    ...(evidenceLevel    !== null && { evidence_level:    evidenceLevel    }),
    ...(notes            !== null && { enrichment_notes:  notes            }),
    // Enrichment provenance (never include PII values, only metadata)
    enriched_by:  authResult.email,
    enriched_at:  now,
    reason_codes: [...new Set([...currentReasonCodes, ...manualReasonCodes])],
    b11_enriched: true,
  };

  // ── Recompute needsEnrichment and financialConfidence ─────────────────────
  const enrichedEligibility = eligibilityClass ?? String(currentPayload['eligibility_class'] ?? currentPayload['eligibility'] ?? 'eligible');
  const enrichedBudgetAmt   = budgetAmount    ?? (currentPayload['budget_amount'] != null ? Number(currentPayload['budget_amount']) : null);
  const enrichedEvidLvl     = evidenceLevel   ?? String(currentPayload['evidence_level'] ?? 'L0') as string;
  const enrichedBudgetSrc   = budgetSource    ?? (currentPayload['budget_source'] as string | null) ?? (currentPayload['source_tier'] as string | null);

  const tempPayload = {
    ...updatedPayload,
    eligibility_class: enrichedEligibility,
    budget_amount:     enrichedBudgetAmt,
    budget_source:     enrichedBudgetSrc,
    evidence_level:    enrichedEvidLvl,
    initiative_domain: initiativeDomain ?? String(updatedPayload['initiative_domain'] ?? 'unknown'),
    event_type:        eventType        ?? String(updatedPayload['event_type']        ?? 'unclassified'),
    pillar:            pillar           ?? (r.primary_pillar as string | null),
  };

  const { needsEnrichment, missingFields } = recomputeNeedsEnrichment(tempPayload);
  const currentMappingConf = typeof currentPayload['mapping_confidence'] === 'number'
    ? currentPayload['mapping_confidence'] : 0.40;
  const financialConfidence = recomputeFinancialConfidence(currentMappingConf, enrichedBudgetAmt, enrichedEvidLvl || null);

  updatedPayload['needs_enrichment']          = needsEnrichment;
  updatedPayload['enrichment_missing_fields'] = missingFields;
  updatedPayload['financial_confidence']      = financialConfidence;

  // ── Update uef_record ─────────────────────────────────────────────────────
  const updateFields: Record<string, unknown> = {
    payload:                updatedPayload,
    data_completeness_score: financialConfidence,  // sync financial confidence to DB field
  };
  if (pillar) {
    updateFields['primary_pillar'] = pillar;
  }

  const { error: updateErr } = await db
    .schema('analytics').from('uef_record')
    .update(updateFields)
    .eq('id', uefRecordId);

  if (updateErr) return NextResponse.json({ error: `Update failed: ${updateErr.message}` }, { status: 500 });

  // ── Audit — no payload PII, only metadata ─────────────────────────────────
  const { error: auditErr } = await db.schema('audit').from('audit_log').insert({
    tenant_id:     tenantId,
    actor_role:    'KORA_ADMIN',
    actor_id:      authResult.id,
    action:        'uef_record_enriched',
    resource_type: 'analytics.uef_record',
    resource_id:   uefRecordId,
    payload: {
      uef_record_id:          uefRecordId,
      batch_id:               r.batch_id,
      applied_fields:         manualReasonCodes,
      needs_enrichment_after: needsEnrichment,
      financial_confidence:   financialConfidence,
      missing_fields:         missingFields,
      // enrichment_notes NOT logged — may contain sensitive context
    },
    ip_address: null,
  });
  if (auditErr) console.error('[uef/enrich] audit:', auditErr.message);

  return NextResponse.json({
    ok:                  true,
    uefRecordId,
    needsEnrichment,
    financialConfidence,
    enrichmentMissingFields: missingFields,
    appliedOverrides:    manualReasonCodes,
    enrichedAt:          now,
  });
}
