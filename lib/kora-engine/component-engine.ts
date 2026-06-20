// lib/kora-engine/component-engine.ts
// KORA Methodology v2.0 — Component Engine (Sprint 1 IU-centric).
//
// Computes:
//   - NI, VR, CO: internal signals for EVQ and CONT (computeComponentSignals)
//   - EQW: Gini-based equity on per-worker IU — Pilot+ path (computeEQw)
//   - EQS: CoV of dept activation rates — requires headcount per dept (computeEQs)
//   - WB, EQ: @deprecated — kept for backward compat, not used by v2.0 index
//
// Design invariants:
//   - Deterministic. No Math.random. No external calls.
//   - Only ELIGIBLE records contribute to NI, VR, CO.
//   - status = 'insufficient_data' when no eligible records with usable signals.
//   - NEVER substitutes placeholder values. No renormalization.
//   - All values are 0–1 (normalized). Persistence layer converts to 0–100 for display.

import type { RawUploadedRecord, NormalizedUEFRecord, EligibilityResult, ComponentSignals, ComponentStatus } from './types';
import { isRawUploadedRecord } from './pillar-mapping';

const ENGINE_SOURCE = 'ComponentEngine_v2.0';

// ── Evidence level weight table — COMPONENT SIGNAL SCALE ────────────────────
// Used ONLY for NI (evidence-weighted diagnostic) and VR (verification rate).
// NOT used in the IU formula — the IU EV factor has its own separate scale in
// IUComputationService.ts (EV_BY_EVIDENCE_TYPE). The two scales share L-code
// vocabulary but assign different weights to L0/L1 by design. Do not merge them.
// L4_VERIFIED_EVIDENCE is treated as L3 weight (same tier for v0.1).

const EVIDENCE_WEIGHTS: Record<string, number> = {
  L0: 0.25, L0_NO_EVIDENCE: 0.25,
  L1: 0.50, L1_SELF_DECLARED: 0.50,
  L2: 0.75, L2_INTERNAL_DOCUMENT: 0.75,
  L3: 1.00, L3_THIRD_PARTY_DOCUMENT: 1.00,
  L4: 1.00, L4_VERIFIED_EVIDENCE: 1.00,
};

function evidenceWeight(level: unknown): number {
  if (!level || typeof level !== 'string') return EVIDENCE_WEIGHTS.L0;
  const key = String(level).toUpperCase().trim();
  // Accept short form (L0–L4) or full form (L0_NO_EVIDENCE, etc.)
  return EVIDENCE_WEIGHTS[key] ?? EVIDENCE_WEIGHTS[key.slice(0, 2)] ?? EVIDENCE_WEIGHTS.L0;
}

function isVerified(level: unknown): boolean {
  const w = evidenceWeight(level);
  return w >= 0.75; // L2 or above
}

// ── Recurrence keyword detection for CO ──────────────────────────────────────
// A program is considered recurring/structural if any of its textual signals
// indicate ongoing, periodic, or multi-period nature.

const RECURRENCE_SIGNALS: readonly string[] = [
  'ricorrente', 'ricorrenza', 'recurrence', 'recurring',
  'periodico', 'periodica', 'periodic',
  'mensile', 'monthly',
  'trimestrale', 'quarterly',
  'ongoing', 'continuativo', 'continuo', 'continuativa',
  'strutturale', 'structural', 'structural_program',
  'multi-period', 'pluriennale', 'sustained',
  'permanente', 'permanent',
  'ciclico', 'cyclical',
  'programma_strutturato',
];

function norm(v: unknown): string {
  if (!v) return '';
  return String(v).toLowerCase().trim().replace(/[-_]/g, ' ');
}

function hasRecurrenceSignal(raw: Record<string, unknown>): boolean {
  const textFields = [
    raw['tipo'], raw['b6_event_type'], raw['event_type'],
    raw['nome_iniziativa'], raw['categoria'],
    raw['initiative_domain'], raw['event_nature'],
  ];
  const combined = textFields.map(norm).join(' ');
  if (RECURRENCE_SIGNALS.some(s => combined.includes(s))) return true;

  // Check reason_codes array for recurrence signals
  const codes = raw['b6_reason_codes'];
  if (Array.isArray(codes)) {
    const codeStr = codes.map(String).join(' ').toLowerCase();
    if (RECURRENCE_SIGNALS.some(s => codeStr.includes(s))) return true;
    // Structural policy families in the taxonomy are inherently recurring
    if (codeStr.includes('structural_people_policy') || codeStr.includes('structural_policy:')) return true;
  }

  return false;
}

// ── Participant extraction ────────────────────────────────────────────────────

function extractParticipants(raw: Record<string, unknown>): number | null {
  for (const key of ['participants', 'partecipanti']) {
    const v = raw[key];
    if (v !== null && v !== undefined) {
      const n = typeof v === 'number' ? v : parseFloat(String(v).replace(',', '.'));
      if (Number.isFinite(n) && n > 0) return Math.round(n);
    }
  }
  return null;
}

// ── Evidence level extraction ─────────────────────────────────────────────────

function extractEvidenceLevel(raw: Record<string, unknown>): string {
  // b6_evidence_level is set by the UEF-to-scoring-records adapter from payload.evidence_level
  for (const key of ['b6_evidence_level', 'evidence_type', 'evidence_level']) {
    const v = raw[key];
    if (v && typeof v === 'string' && v.length > 0) return v;
  }
  return 'L0';
}

// ── Eligibility extraction from approved UEF records ─────────────────────────
// approved UEF records set reviewed_eligibility in raw; use that when present.

function extractReviewedEligibility(
  record: RawUploadedRecord | NormalizedUEFRecord,
  eligibilityResult: EligibilityResult | undefined,
): string {
  if (isRawUploadedRecord(record)) {
    const rev = record.raw['reviewed_eligibility'];
    if (rev && typeof rev === 'string') return rev;
  }
  return eligibilityResult?.status ?? 'review_required';
}

// ── Zero/empty result ─────────────────────────────────────────────────────────

function insufficientSignals(): ComponentSignals {
  return {
    ni: 0, niStatus: 'insufficient_data', niSourceRecords: 0,
    vr: 0, vrStatus: 'insufficient_data', vrSourceRecords: 0,
    co: 0, coStatus: 'insufficient_data', coRecurringPrograms: 0, coTotalPrograms: 0,
  };
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Computes NI, VR, CO from the same record array used by runKoraPipeline.
 *
 * Called inside runKoraPipeline after eligibility classification (step 2),
 * so eligibilityResults[i] corresponds to records[i].
 *
 * Only ELIGIBLE records contribute. Limited and blocked records are excluded.
 * review_required records are excluded (not yet approved for scoring).
 */
export function computeComponentSignals(
  records: Array<RawUploadedRecord | NormalizedUEFRecord>,
  eligibilityResults: EligibilityResult[],
): ComponentSignals {
  if (records.length === 0) return insufficientSignals();

  // ── Aggregate over eligible records ──────────────────────────────────────
  let niWeightedSum = 0;
  let niParticipantSum = 0;
  let vrWeightedSum = 0;
  let vrParticipantSum = 0;
  let coRecurring = 0;
  let coTotal = 0;
  let niSourceRecords = 0;
  let vrSourceRecords = 0;

  for (let i = 0; i < records.length; i++) {
    const record = records[i];
    const eligibility = extractReviewedEligibility(record, eligibilityResults[i]);

    // NI, VR, CO use ELIGIBLE records only
    if (eligibility !== 'eligible') continue;

    const raw = isRawUploadedRecord(record) ? record.raw : {};
    const participants = isRawUploadedRecord(record)
      ? extractParticipants(record.raw)
      : record.participants;
    const evidenceLevel = isRawUploadedRecord(record)
      ? extractEvidenceLevel(record.raw)
      : (record.budgetEvidence?.evidenceLevel ?? 'L0');

    const pax = participants ?? 1; // fallback: treat as 1-participant program if missing

    // NI: evidence-weighted participant sum
    const weight = evidenceWeight(evidenceLevel);
    niWeightedSum   += pax * weight;
    niParticipantSum += pax;
    niSourceRecords++;

    // VR: participant-weighted L2+ verification
    const verified = isVerified(evidenceLevel);
    vrWeightedSum   += pax * (verified ? 1 : 0);
    vrParticipantSum += pax;
    vrSourceRecords++;

    // CO: recurrence detection per eligible program
    coTotal++;
    if (isRawUploadedRecord(record) && hasRecurrenceSignal(record.raw)) {
      coRecurring++;
    }
  }

  // ── NI ───────────────────────────────────────────────────────────────────
  let ni = 0;
  let niStatus: ComponentStatus = 'insufficient_data';
  if (niParticipantSum > 0) {
    ni = Math.min(1, Math.max(0, Math.round((niWeightedSum / niParticipantSum) * 1000) / 1000));
    niStatus = 'computed';
  }

  // ── VR ───────────────────────────────────────────────────────────────────
  let vr = 0;
  let vrStatus: ComponentStatus = 'insufficient_data';
  if (vrParticipantSum > 0) {
    vr = Math.min(1, Math.max(0, Math.round((vrWeightedSum / vrParticipantSum) * 1000) / 1000));
    vrStatus = 'computed';
  }

  // ── CO ───────────────────────────────────────────────────────────────────
  let co = 0;
  let coStatus: ComponentStatus = 'insufficient_data';
  if (coTotal > 0) {
    co = Math.min(1, Math.max(0, Math.round((coRecurring / coTotal) * 1000) / 1000));
    coStatus = 'computed';
  }

  return {
    ni, niStatus, niSourceRecords,
    vr, vrStatus, vrSourceRecords,
    co, coStatus, coRecurringPrograms: coRecurring, coTotalPrograms: coTotal,
  };
}

// ── WB — Activation Balance ──────────────────────────────────────────────────
// Computes WB from ActivationResult segment data.
//
// Primary: bottomFiftyShare (if present and non-zero)
// Fallback: 1 − CoV of department participant counts (if ≥2 departments)
// Fallback: 1 − CoV of site participant counts (if ≥2 sites)
// Otherwise: insufficient_data
//
// Note: departmentGaps/siteGaps contain PARTICIPANT SUMS per segment, not rates.
// CoV of participant counts is a proxy for participation balance — acceptable for v0.1.

export function computeWB(
  bottomFiftyShare: number,
  departmentGaps: Record<string, number>,
  siteGaps: Record<string, number>,
): { wb: number; wbStatus: ComponentStatus; wbSource: string } {
  // Primary: bottomFiftyShare explicitly available in record data
  if (bottomFiftyShare > 0) {
    return {
      wb: Math.min(1, Math.max(0, bottomFiftyShare)),
      wbStatus: 'computed',
      wbSource: 'bottom_fifty_share',
    };
  }

  // Fallback: CoV of department participant counts
  const deptValues = Object.values(departmentGaps).filter(v => v > 0);
  if (deptValues.length >= 2) {
    const wb = oneMinusCoV(deptValues);
    return { wb, wbStatus: 'computed', wbSource: 'department_cov_proxy' };
  }

  // Fallback: CoV of site participant counts
  const siteValues = Object.values(siteGaps).filter(v => v > 0);
  if (siteValues.length >= 2) {
    const wb = oneMinusCoV(siteValues);
    return { wb, wbStatus: 'computed', wbSource: 'site_cov_proxy' };
  }

  return { wb: 0, wbStatus: 'insufficient_data', wbSource: 'no_segment_data' };
}

// ── EQ — Distribution Equity ─────────────────────────────────────────────────
// Computes EQ from ActivationResult department or site activation data.
//
// EQ uses the SAME underlying segment data as WB but through a different
// aggregation (CoV of counts vs. bottom-50 share).
// For v0.1: EQ = 1 − CoV(segment participant counts) across ≥2 segments.
// Limitation: uses participant counts as a proxy for activation rates
// (true rates require per-segment headcount, not yet available in v0.1).

export function computeEQ(
  departmentGaps: Record<string, number>,
  siteGaps: Record<string, number>,
): { eq: number; eqStatus: ComponentStatus; eqSource: string } {
  const deptValues = Object.values(departmentGaps).filter(v => v > 0);
  if (deptValues.length >= 2) {
    const eq = oneMinusCoV(deptValues);
    return { eq, eqStatus: 'computed', eqSource: 'department_cov' };
  }

  const siteValues = Object.values(siteGaps).filter(v => v > 0);
  if (siteValues.length >= 2) {
    const eq = oneMinusCoV(siteValues);
    return { eq, eqStatus: 'computed', eqSource: 'site_cov' };
  }

  return { eq: 0, eqStatus: 'insufficient_data', eqSource: 'no_segment_data' };
}

// ── EQW — Equity Workers (Sprint 1 v2.0) ─────────────────────────────────────
// (1 − Gini) × 100 on IU per worker, ENTIRE workforce including 0-IU workers.
// Foundation Light: always insufficient_data — per-worker IU requires Pilot+
// individual UEF records. Path enabled when perWorkerIU array is provided.
// No flag: data-presence check only.

export function computeEQw(
  perWorkerIU: number[] | null,
): { eqw: number; eqwStatus: ComponentStatus; eqwSource: string } {
  if (!perWorkerIU || perWorkerIU.length === 0) {
    return { eqw: 0, eqwStatus: 'insufficient_data', eqwSource: 'no_per_worker_iu' };
  }
  const g = gini(perWorkerIU);
  const eqw = Math.min(1, Math.max(0, Math.round((1 - g) * 1000) / 1000));
  return { eqw, eqwStatus: 'computed', eqwSource: 'gini_per_worker_iu' };
}

// ── EQS — Equity Segments (Sprint 1 v2.0) ────────────────────────────────────
// (1 − CoV) × 100 on ACTIVATION RATES per segment.
// Canonical formula: activation_rate_g = activeUniqueWorkers_g / headcount_g
//
// deptRates: { [dept]: { activeUniqueWorkers: number; headcount: number } }
//   activeUniqueWorkers: confirmed unique active workers in this group — NOT a raw participation
//   sum across program records. Providing a participation sum here violates the formula and
//   introduces cross-department bias.
//
// Returns insufficient_data when:
//   - deptRates is null (no numerator available)
//   - fewer than 2 segments with headcount > 0
// NON usare conteggi grezzi come fallback — insufficient_data è il risultato corretto.

export function computeEQs(
  deptRates: Record<string, { activeUniqueWorkers: number; headcount: number }> | null,
): { eqs: number; eqsStatus: ComponentStatus; eqsSource: string } {
  if (!deptRates) {
    return { eqs: 0, eqsStatus: 'insufficient_data', eqsSource: 'no_headcount' };
  }
  const rates = Object.values(deptRates)
    .filter(d => d.headcount > 0)
    .map(d => Math.min(1, d.activeUniqueWorkers / d.headcount));

  if (rates.length < 2) {
    return { eqs: 0, eqsStatus: 'insufficient_data', eqsSource: 'insufficient_segments' };
  }
  const eqs = oneMinusCoV(rates);
  return { eqs, eqsStatus: 'computed', eqsSource: 'dept_activation_rate_cov' };
}

// ── Coefficient of Variation helper ──────────────────────────────────────────
// Returns 1 − CoV, clamped to [0, 1].
// 1 = perfectly balanced (CoV = 0). 0 = maximum imbalance (CoV ≥ 1).

function oneMinusCoV(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  if (mean <= 0) return 0;
  const variance = values.reduce((a, v) => a + (v - mean) ** 2, 0) / values.length;
  const cov = Math.sqrt(variance) / mean;
  return Math.min(1, Math.max(0, Math.round((1 - cov) * 1000) / 1000));
}

// ── Gini coefficient ──────────────────────────────────────────────────────────
// Standard definition: 0 = perfect equality, 1 = maximum inequality.
// Includes zeros (workers with 0 IU). All values must be ≥ 0.

function gini(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  const sum = sorted.reduce((s, v) => s + v, 0);
  if (sum === 0) return 0;
  let numerator = 0;
  for (let i = 0; i < n; i++) {
    numerator += (2 * (i + 1) - n - 1) * sorted[i];
  }
  return Math.max(0, Math.min(1, numerator / (n * sum)));
}

export { ENGINE_SOURCE as COMPONENT_ENGINE_VERSION };
