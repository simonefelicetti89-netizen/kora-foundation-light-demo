// lib/kora-engine/confidence-engine.ts
// Confidence Engine v2.0 — Foundation Light Pilot. Sprint 1 B-CS1.
//
// Computes the Confidence Score (CS) — a reliability indicator external to the KORA Index.
// CS is never aggregated into the KORA Index value (weight=0, doc 21b).
//
// Sub-score weights (internal to confidence computation — not KORA Index macroblock weights):
//   budgetEvidence   30%
//   dataCompleteness 25%
//   mapping          20%
//   verification     15%  ← B-CS1: now = verified IU ratio (≥L2 EV), NOT budgetEvidenceQuality
//   review           10%
//
// Design constraints:
//   - Deterministic. No Math.random. No external calls.
//   - externalToIndex is permanently true.
//   - reviewConfidence capped at 0.50 without human Advisor review.
//   - verification is INDEPENDENT of budgetEvidence (different information source).

import type {
  BTIResult,
  ActivationResult,
  EligibilitySummary,
  ConfidenceResult,
  ReachMethod,
} from './types';
import type { ImpactUnitComputationResult } from '@/lib/types';

const ENGINE_SOURCE = 'ConfidenceEngine_v2.0';

const W_BUDGET_EVIDENCE   = 0.30;
const W_DATA_COMPLETENESS = 0.25;
const W_MAPPING           = 0.20;
const W_VERIFICATION      = 0.15;
const W_REVIEW            = 0.10;

export function computeConfidence(params: {
  bti: BTIResult;
  activation: ActivationResult;
  eligibilitySummary: EligibilitySummary;
  totalRecords: number;
  workforceKnown: boolean;
  reachMethod?: ReachMethod;
  hasHumanReview?: boolean;
  iuResults?: ImpactUnitComputationResult[];
  /** EQS computed from real group activation rates (Foundation Light enriched+). */
  eqsAvailable?: boolean;
  /** EQW computed from per-worker IU distribution (Pilot+ only). */
  eqwAvailable?: boolean;
}): ConfidenceResult {
  const {
    bti,
    activation,
    eligibilitySummary,
    totalRecords,
    workforceKnown,
    reachMethod,
    hasHumanReview = false,
    iuResults,
    eqsAvailable = false,
    eqwAvailable = false,
  } = params;

  const warnings: string[] = [];
  const reviewRatio = totalRecords > 0
    ? eligibilitySummary.reviewRequiredCount / totalRecords
    : 0;

  // ── Sub-score 1: Budget Evidence Confidence (30%) ──────────────────────────
  // Mirrors budgetEvidenceQuality from BTI. If no budget data → L0 baseline 0.10.
  let budgetEvidenceConfidence = bti.budgetEvidenceQuality;
  if (bti.totalBudget === 0) {
    budgetEvidenceConfidence = 0.10;
    warnings.push(
      'Budget Evidence Confidence = 0.10: nessun importo budget rilevato. ' +
      'Evidence Score basato su baseline minima L0.',
    );
  } else if (budgetEvidenceConfidence < 0.40) {
    warnings.push(
      `Budget Evidence Confidence bassa (${Math.round(budgetEvidenceConfidence * 100)}%). ` +
      'Raccogliere fatture, contratti o export fornitori per aumentare la qualità evidenza.',
    );
  }

  // ── Sub-score 2: Data Completeness (25%) ───────────────────────────────────
  // Penalties applied to a 1.0 baseline:
  //   workforce unknown    → −0.40
  //   review_required ratio → −(ratio × 0.30)
  //   no budget data       → −0.20
  //   bounded reach method → −0.10
  //   reach = none         → −0.20
  let dataCompleteness = 1.0;

  if (!workforceKnown) {
    dataCompleteness -= 0.40;
    warnings.push('Data Completeness penalizzata: workforce baseline non disponibile (−40%).');
  }
  dataCompleteness -= reviewRatio * 0.30;

  if (bti.totalBudget === 0) {
    dataCompleteness -= 0.20;
  }
  if (reachMethod === 'bounded_estimate' || reachMethod === 'aggregate_unique_bounded') {
    dataCompleteness -= 0.10;
  } else if (reachMethod === 'none') {
    dataCompleteness -= 0.20;
    warnings.push('Data Completeness penalizzata: reach non stimabile (method=none) (−20%).');
  }

  // EQS unavailable: workforce denominators by dept/site not provided → −0.08
  // Applied only when workforceKnown is true (company has some baseline) but EQS is still
  // missing, signalling an incomplete equity picture despite partial data availability.
  // When workforceKnown is false, the −0.40 penalty already captures this broader gap.
  if (!eqsAvailable && workforceKnown) {
    dataCompleteness -= 0.08;
    warnings.push(
      'Data Completeness penalizzata: EQ_s non calcolabile — ' +
      'organico per reparto/sede non fornito (−8%). ' +
      'Includere workforce denominators per abilitare Equity Segments.',
    );
  }

  // EQW unavailable: per-worker IU records not available (always true in Foundation Light) → −0.05
  // Minor: EQW requires Pilot+ — penalise lightly to signal the data gap.
  if (!eqwAvailable) {
    dataCompleteness -= 0.05;
    warnings.push(
      'Data Completeness penalizzata: EQ_w non calcolabile — ' +
      'dati IU per-lavoratore non disponibili (−5%). ' +
      'Disponibile in Pilot+ con worker-level UEF records.',
    );
  }

  // Individual-sensitive signal detected → slight additional penalty
  const hasSensitiveExclusions = activation.warnings.some(
    (w) => w.includes('dati individuali sensibili'),
  );
  if (hasSensitiveExclusions) {
    dataCompleteness -= 0.05;
    warnings.push(
      'Record con segnali individuali sensibili rilevati ed esclusi: ' +
      'Data Completeness ridotta (−5%).',
    );
  }

  dataCompleteness = Math.max(0, Math.min(1, dataCompleteness));

  // ── Sub-score 3: Mapping Confidence (20%) ─────────────────────────────────
  // Quality of eligibility + pillar classification.
  // review_required records reduce mapping confidence.
  const mappingConfidence = Math.min(1, Math.max(0.20, 1 - reviewRatio * 0.80));

  // ── Sub-score 4: Verification Confidence (15%) — B-CS1 ────────────────────
  // Verified IU ratio: share of total computed IU backed by ≥L2 evidence (EV ≥ 0.75).
  // Independent of budgetEvidenceQuality (different information source).
  // Baseline 0.10 when IU data is not available.
  let verificationConfidence = 0.10;
  if (iuResults && iuResults.length > 0) {
    const totalIU = iuResults.reduce((s, r) => s + (r.computed ? r.impact_units_total : 0), 0);
    if (totalIU > 0) {
      const verifiedIU = iuResults
        .filter(r => r.computed && r.evidence_verification_ev >= 0.75)
        .reduce((s, r) => s + r.impact_units_total, 0);
      verificationConfidence = Math.min(1, Math.max(0, verifiedIU / totalIU));
    }
  } else if (bti.totalBudget === 0) {
    warnings.push(
      'Verification Confidence = 0.10: IU non disponibili. ' +
      'Caricare dati con livello evidenza ≥ L2 per aumentare questo sub-score.',
    );
  }

  // ── Sub-score 5: Review Confidence (10%) ──────────────────────────────────
  // Foundation Light: no human Advisor review → max 0.50.
  // KORA Advisor review → 0.85.
  const reviewConfidence = hasHumanReview ? 0.85 : 0.40;
  if (!hasHumanReview) {
    warnings.push(
      'Review Confidence = 0.40: nessuna revisione da Advisor KORA. ' +
      'La revisione da un Advisor certificato porta il massimo a 0.85.',
    );
  }

  // ── Final weighted score ───────────────────────────────────────────────────
  const rawScore =
    budgetEvidenceConfidence * W_BUDGET_EVIDENCE +
    dataCompleteness         * W_DATA_COMPLETENESS +
    mappingConfidence        * W_MAPPING +
    verificationConfidence   * W_VERIFICATION +
    reviewConfidence         * W_REVIEW;

  const score = Math.max(0, Math.min(100, Math.round(rawScore * 100)));

  if (score < 50) {
    warnings.push(
      `Confidence Score bassa (${score}/100): affidabilità del KORA Index limitata. ` +
      'Aumentare la copertura evidenza e la completezza dati prima di usare i risultati in contesti decisionali.',
    );
  }

  warnings.push(
    `Fonte: ${ENGINE_SOURCE} | KORA-METHOD-v2.0 | ` +
    'CS è ESTERNO al KORA Index v1.0 — peso=0 nel calcolo, ' +
    'mostrato a fianco per trasparenza metodologica (doc 21b).',
  );

  return {
    score,
    mappingConfidence:        round3(mappingConfidence),
    budgetEvidenceConfidence: round3(budgetEvidenceConfidence),
    dataCompleteness:         round3(dataCompleteness),
    verificationConfidence:   round3(verificationConfidence),
    reviewConfidence:         round3(reviewConfidence),
    externalToIndex:          true,
    warnings,
  };
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

export { ENGINE_SOURCE as CONFIDENCE_ENGINE_VERSION };
