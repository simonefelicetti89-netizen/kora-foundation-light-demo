// lib/kora-engine/kora-index-engine.ts
// KORA Index Engine v0.1 — Foundation Light Pilot.
//
// Combines four macroblock scores into the KORA Index v3.
// Confidence Score is EXTERNAL to KORA Index (weight=0) and shown alongside — never aggregated.
//
// Design constraints:
//   - Deterministic. No Math.random. No external calls.
//   - Reads macroblock weights from lib/methodology-config/v0.1.ts — never hardcoded.
//   - productionReady is permanently false in Foundation Light.
//   - calibrationStatus is always 'pre_empirical_calibration'.
//   - CS weight = 0: never influences KORA Index value (doc 21b).

import type {
  BTIResult,
  ActivationResult,
  EligibilitySummary,
  KoraIndexResult,
  KoraIndexMacroblocks,
  Pillar,
} from './types';
import { getMacroblockWeights, getMethodologyVersion } from '@/lib/methodology-config/v0.1';
import { computeEquityScore } from './equity-engine';

const ENGINE_SOURCE = 'KoraIndexEngine_v0.1';

export function computeKoraIndex(params: {
  bti: BTIResult;
  activation: ActivationResult;
  eligibilitySummary?: EligibilitySummary;
  pillarDistribution?: Record<Pillar, number>;
  confidenceScore?: number;
}): KoraIndexResult {
  const { bti, activation, eligibilitySummary, pillarDistribution, confidenceScore = 0 } = params;
  const warnings: string[] = [];
  const weights = getMacroblockWeights();

  // ── Macroblock 1: Activation Reach (REACH, 25%) ────────────────────────────
  // AR weighted 40%, MAR 60% — meaningful activation signals deeper engagement quality.
  const ar  = activation.activationReach;
  const mar = activation.meaningfulActivationReach;
  const activationReach = round2(ar * 40 + mar * 60);

  if (ar === 0 && mar === 0) {
    warnings.push(
      'Activation Reach macroblock = 0: workforce baseline non disponibile o nessuna attivazione rilevata.',
    );
  }

  // ── Macroblock 2: Activation Quality (QUALITY, 30%) ───────────────────────
  // Proxy signals for v0.1 pre-empirical estimate:
  //   MAR (50%) — meaningful activation as quality indicator
  //   eligible share (30%) — share of records that generate IU
  //   budget evidence quality (20%) — spend quality as activation quality signal
  const totalCount          = eligibilitySummary?.totalCount          ?? 0;
  const eligibleCount       = eligibilitySummary?.eligibleCount       ?? 0;
  const reviewRequiredCount = eligibilitySummary?.reviewRequiredCount ?? 0;
  const eligibleShare       = totalCount > 0 ? Math.min(1, eligibleCount / totalCount) : 0;

  const activationQuality = round2(
    mar * 50 +
    eligibleShare * 30 +
    bti.budgetEvidenceQuality * 20,
  );

  if (eligibleShare === 0) {
    warnings.push(
      'Activation Quality: nessun record eligible nel batch. Il macroblocco riflette dati insufficienti.',
    );
  }

  // ── Macroblock 3: Distribution & Equity (EQUITY, 25%) — B22 ──────────────
  // Pillar-based EQUITY replaces the Foundation Light stub EQUITY=50.
  // PC (Pillar Coverage): how many of 5 KORA pillars have meaningful activation.
  // PB (Pillar Balance):  how evenly events are distributed across covered pillars.
  // EQUITY = PC × 0.60 + PB × 0.40
  //
  // Input: pillarDistribution from run-kora-pipeline Step 9.
  // Blocked records have null primary_pillar → already excluded upstream.
  // Limited (economic relief) records mapping to LIFE correctly inflate LIFE share
  //   for companies that over-rely on vouchers — this is intended behavior.
  const equityResult = computeEquityScore(pillarDistribution ?? null);
  let distributionEquity = equityResult.equityScore;
  distributionEquity = Math.max(0, Math.min(100, distributionEquity));

  if (equityResult.isInsufficientData) {
    warnings.push(
      'Distribution & Equity: pillar distribution non disponibile — fallback 50 (insufficient_data). ' +
      'Eseguire scoring con record classificati per ottenere EQUITY reale.',
    );
  } else {
    warnings.push(
      `Distribution & Equity (B22): ${equityResult.coveredPillars}/5 pillar coperti — ` +
      `PC=${equityResult.pillarCoverageScore}, PB=${equityResult.pillarBalanceScore}, ` +
      `dominante: ${equityResult.dominantPillar} (${Math.round(equityResult.dominantShare * 100)}%).`,
    );
  }

  // ── Macroblock 4: Budget-to-Human-Impact (BTI, 20%) ───────────────────────
  // BTI score from BudgetToHumanImpactEngine — already 0–100.
  const budgetToHumanImpact = bti.btiScore;

  // ── KORA Index value — weighted macroblock sum ─────────────────────────────
  const rawValue =
    activationReach     * weights.REACH   +
    activationQuality   * weights.QUALITY +
    distributionEquity  * weights.EQUITY  +
    budgetToHumanImpact * weights.BTI;

  const value = Math.max(0, Math.min(100, round2(rawValue)));

  // ── Safeguard and review quality warnings ─────────────────────────────────
  if (activation.safeguardStatus === 'FLAGGED') {
    warnings.push(
      'Activation Safeguard FLAGGED: KORA Index calcolato ma affidabilità ridotta. ' +
      'AR e/o MAR sotto soglie critiche D-21. Interpretare con cautela.',
    );
  } else if (activation.safeguardStatus === 'WARNING') {
    warnings.push(
      'Activation Safeguard WARNING: soglie D-21 non completamente raggiunte. ' +
      'Score indicativo — revisione attivazione raccomandata.',
    );
  }

  if (totalCount > 0 && reviewRequiredCount / totalCount > 0.25) {
    warnings.push(
      `${Math.round((reviewRequiredCount / totalCount) * 100)}% dei record in review_required: ` +
      'KORA Index sottostima il potenziale reale. Revisione umana consigliata.',
    );
  }

  warnings.push(
    `Fonte: ${ENGINE_SOURCE} | KORA-METHOD-v0.1.0 | ` +
    'calibration_status=pre_empirical_calibration | production_ready=false',
  );

  const macroblocks: KoraIndexMacroblocks = {
    activationReach,
    activationQuality,
    distributionEquity,
    budgetToHumanImpact,
  };

  return {
    value,
    macroblocks,
    weights: {
      REACH:   weights.REACH,
      QUALITY: weights.QUALITY,
      EQUITY:  weights.EQUITY,
      BTI:     weights.BTI,
    },
    methodologyVersion: getMethodologyVersion(),
    calibrationStatus:  'pre_empirical_calibration',
    productionReady:    false,
    confidenceExternal: round2(confidenceScore),
    warnings,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export { ENGINE_SOURCE as KORA_INDEX_ENGINE_VERSION };
