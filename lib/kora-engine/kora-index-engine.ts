// lib/kora-engine/kora-index-engine.ts
// KORA Index Engine v2.0 — Sprint 1 IU-centric refactor.
//
// Sprint 1 changes vs v1.0:
//   B-IU1: pillarDistribution is now IU-weighted (not event counts) — PB uses IU shares.
//   B-QU1: QUALITY = EVQ×34% + INT×33% + CONT×33%
//          EVQ = participant-weighted evidence quality (was NI)
//          INT = IU per active worker / target (new, uses IU)
//          CONT = recurring share (was CO)
//   B-EQ1: EQUITY = EQW×30% + EQS×20% + PC×25% + PB×25%
//          EQW = Gini on per-worker IU — insufficient_data in Foundation Light (Pilot+ path)
//          EQS = CoV of dept activation rates — insufficient_data without headcount per dept
//          PC/PB unchanged in formula, now use IU-weighted pillarDistribution
//   PRINCIPIO: insufficient_data contribuisce 0 senza redistribuzione (tetto, non gonfiaggio).
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
  ComponentSignals,
  ComponentDetail,
  ComponentStatus,
  Pillar,
} from './types';
import type { ImpactUnitComputationResult } from '@/lib/types';
import { getMacroblockWeights, getMethodologyVersion, getIntTarget } from '@/lib/methodology-config/v0.1';
import { computeEquityScore } from './equity-engine';
import { computeEQw, computeEQs } from './component-engine';

const ENGINE_SOURCE = 'KoraIndexEngine_v2.0';

// ── QUALITY macroblock — v2.0 B-QU1 ─────────────────────────────────────────
// EVQ (0.34): participant-weighted evidence quality (same formula as NI — reframed)
// INT (0.33): IU per active worker, normalized to target from config
// CONT (0.33): recurring/structural share (same as CO)
// NO redistribution: missing slot → 0, macroblock is capped at weight of available slots.

function computeQuality(
  signals: ComponentSignals | undefined,
  totalIU: number,
  activeWorkers: number,
  intTarget: number,
): {
  score: number;
  evqVal: number; evqStatus: ComponentStatus;
  intVal: number; intStatus: ComponentStatus;
  contVal: number; contStatus: ComponentStatus;
  weightsUsed: { evq: number; int: number; cont: number };
  warnings: string[];
} {
  const warnings: string[] = [];
  const W_EVQ = 0.34, W_INT = 0.33, W_CONT = 0.33;

  // EVQ: participant-weighted average evidence strength (0–1 from componentSignals.ni)
  const evqAvail = signals?.niStatus === 'computed';
  const evqVal   = evqAvail ? (signals!.ni * 100) : 0;
  if (!evqAvail) warnings.push('QUALITY: EVQ (Evidence Quality) insufficient_data — nessun record eligible con segnali partecipanti.');

  // INT: IU per active worker, normalized to config target
  let intVal: number = 0;
  let intStatus: ComponentStatus = 'insufficient_data';
  if (activeWorkers > 0 && totalIU > 0 && intTarget > 0) {
    intVal = Math.min(100, Math.max(0, round2((totalIU / (activeWorkers * intTarget)) * 100)));
    intStatus = 'computed';
  } else {
    if (activeWorkers === 0) {
      warnings.push('QUALITY: INT (Impact Intensity) insufficient_data — nessun lavoratore attivo.');
    } else {
      warnings.push('QUALITY: INT (Impact Intensity) insufficient_data — nessuna IU calcolata.');
    }
  }

  // CONT: recurring/structural activation rate (0–1 from componentSignals.co)
  const contAvail = signals?.coStatus === 'computed';
  const contVal   = contAvail ? (signals!.co * 100) : 0;
  if (!contAvail) warnings.push('QUALITY: CONT (Continuity) insufficient_data — nessun programma eligible per il calcolo della ricorrenza.');

  // No redistribution: each slot uses its canonical weight, missing → contributes 0
  const score = Math.max(0, Math.min(100, round2(
    evqVal  * W_EVQ +
    intVal  * W_INT +
    contVal * W_CONT,
  )));

  return {
    score,
    evqVal, evqStatus: evqAvail ? 'computed' : 'insufficient_data',
    intVal, intStatus,
    contVal, contStatus: contAvail ? 'computed' : 'insufficient_data',
    weightsUsed: { evq: W_EVQ, int: W_INT, cont: W_CONT },
    warnings,
  };
}

// ── EQUITY macroblock — v2.0 B-EQ1 ──────────────────────────────────────────
// EQW (0.30): Gini on per-worker IU — Pilot+ path, insufficient_data in Foundation Light
// EQS (0.20): CoV of dept activation rates — insufficient_data without per-dept headcount
// PC  (0.25): covered pillars / 5 × 100 (from IU-weighted pillarDistribution)
// PB  (0.25): HHI of IU shares per pillar (from IU-weighted pillarDistribution)
// No redistribution: missing slot → 0, macroblock capped at weight of available slots.

function computeEquityMacroblock(
  activation: ActivationResult,
  pillarDistribution: Record<Pillar, number> | undefined,
  perWorkerIU: number[] | null,
): {
  score: number;
  eqwVal: number; eqwStatus: ComponentStatus;
  eqsVal: number; eqsStatus: ComponentStatus;
  pcVal: number;  pcStatus: ComponentStatus;
  pbVal: number;  pbStatus: ComponentStatus;
  weightsUsed: { eqw: number; eqs: number; pc: number; pb: number };
  warnings: string[];
} {
  const warnings: string[] = [];
  const W_EQW = 0.30, W_EQS = 0.20, W_PC = 0.25, W_PB = 0.25;

  // PC and PB from IU-weighted pillarDistribution
  const equityResult = computeEquityScore(pillarDistribution ?? null);
  const pcStatus: ComponentStatus = equityResult.isInsufficientData ? 'insufficient_data' : 'computed';
  const pbStatus: ComponentStatus = equityResult.isInsufficientData ? 'insufficient_data' : 'computed';
  const pcVal = equityResult.isInsufficientData ? 0 : equityResult.pillarCoverageScore;
  const pbVal = equityResult.isInsufficientData ? 0 : equityResult.pillarBalanceScore;

  if (equityResult.isInsufficientData) {
    warnings.push('EQUITY: PC e PB insufficient_data — nessuna distribuzione IU per pillar disponibile.');
  }

  // EQW: Gini on per-worker IU (Pilot+)
  const { eqw, eqwStatus } = computeEQw(perWorkerIU);
  const eqwVal = eqw * 100;
  if (eqwStatus === 'insufficient_data') {
    warnings.push(
      'EQUITY: EQW (Equity Workers) insufficient_data — record IU per-lavoratore non disponibili. ' +
      'Disponibile in Pilot+ con My KORA participation confirmation.',
    );
  }

  // EQS: CoV of dept activation rates
  // Foundation Light: departmentGaps stores participant COUNTS, not rates.
  // Per-dept headcount not in current model → EQS = insufficient_data.
  // When headcount per dept is provided in intake, pass deptRates here.
  const { eqs, eqsStatus } = computeEQs(null);
  const eqsVal = eqs * 100;
  if (eqsStatus === 'insufficient_data') {
    warnings.push(
      'EQUITY: EQS (Equity Segments) insufficient_data — organico per reparto non disponibile. ' +
      'Includere headcount per reparto nel file di intake per abilitare questo componente.',
    );
  }

  // No redistribution: each slot contributes its canonical weight × value, missing → 0
  const score = Math.max(0, Math.min(100, round2(
    eqwVal  * W_EQW +
    eqsVal  * W_EQS +
    pcVal   * W_PC  +
    pbVal   * W_PB,
  )));

  return {
    score,
    eqwVal, eqwStatus,
    eqsVal, eqsStatus,
    pcVal,  pcStatus,
    pbVal,  pbStatus,
    weightsUsed: { eqw: W_EQW, eqs: W_EQS, pc: W_PC, pb: W_PB },
    warnings,
  };
}

// ── Main engine ───────────────────────────────────────────────────────────────

export function computeKoraIndex(params: {
  bti: BTIResult;
  activation: ActivationResult;
  eligibilitySummary?: EligibilitySummary;
  pillarDistribution?: Record<Pillar, number>;
  confidenceScore?: number;
  componentSignals?: ComponentSignals;
  iuResults?: ImpactUnitComputationResult[];
}): KoraIndexResult {
  const {
    bti, activation, eligibilitySummary,
    pillarDistribution, confidenceScore = 0,
    componentSignals, iuResults,
  } = params;
  const warnings: string[] = [];
  const weights = getMacroblockWeights();

  // Precompute IU totals from iuResults (only computed records)
  const totalIU = iuResults
    ? iuResults.reduce((s, r) => s + (r.computed ? r.impact_units_total : 0), 0)
    : 0;

  // Per-worker IU: available only in Pilot+ when individual UEF records exist.
  // In Foundation Light, iuResults are per-program (aggregate), not per-worker.
  const perWorkerIU: number[] | null = null; // Pilot+ path — data-presence check in computeEQw

  // ── Macroblock 1: Activation Reach (REACH, 25%) ────────────────────────────
  // AR×40% + MAR×60% — MAR signals deeper engagement quality.
  // MAR appears ONLY here — never in QUALITY.
  const ar  = activation.activationReach;
  const mar = activation.meaningfulActivationReach;
  const activationReach = round2(ar * 40 + mar * 60);

  if (ar === 0 && mar === 0) {
    warnings.push('REACH macroblock = 0: workforce baseline non disponibile o nessuna attivazione rilevata.');
  }

  // ── Macroblock 2: Activation Quality (QUALITY, 30%) — v2.0 B-QU1 ──────────
  const intTarget = getIntTarget();
  const qualityResult = computeQuality(
    componentSignals,
    totalIU,
    activation.activeWorkers,
    intTarget,
  );
  const activationQuality = qualityResult.score;
  warnings.push(...qualityResult.warnings);

  // ── Macroblock 3: Distribution & Equity (EQUITY, 25%) — v2.0 B-EQ1 ────────
  const equityResult = computeEquityMacroblock(activation, pillarDistribution, perWorkerIU);
  const distributionEquity = equityResult.score;
  warnings.push(...equityResult.warnings);

  // ── Macroblock 4: Budget-to-Human-Impact (BTI, 20%) ───────────────────────
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

  const totalCount = eligibilitySummary?.totalCount ?? 0;
  const reviewRequiredCount = eligibilitySummary?.reviewRequiredCount ?? 0;
  if (totalCount > 0 && reviewRequiredCount / totalCount > 0.25) {
    warnings.push(
      `${Math.round((reviewRequiredCount / totalCount) * 100)}% dei record in review_required: ` +
      'KORA Index sottostima il potenziale reale. Revisione umana consigliata.',
    );
  }

  warnings.push(
    `Fonte: ${ENGINE_SOURCE} | KORA-METHOD-v2.0 | ` +
    'calibration_status=pre_empirical_calibration | production_ready=false',
  );

  const macroblocks: KoraIndexMacroblocks = {
    activationReach,
    activationQuality,
    distributionEquity,
    budgetToHumanImpact,
  };

  // ── ComponentDetail — v2.0 field names ────────────────────────────────────
  const componentDetail: ComponentDetail = {
    evq:       qualityResult.evqVal  / 100,  // store as 0–1
    evqStatus: qualityResult.evqStatus,
    int:       qualityResult.intVal  / 100,  // store as 0–1
    intStatus: qualityResult.intStatus,
    cont:      qualityResult.contVal / 100,  // store as 0–1
    contStatus: qualityResult.contStatus,
    eqw:       equityResult.eqwVal   / 100,  // store as 0–1
    eqwStatus: equityResult.eqwStatus,
    eqs:       equityResult.eqsVal   / 100,  // store as 0–1
    eqsStatus: equityResult.eqsStatus,
    pc:        equityResult.pcVal,            // store as 0–100
    pcStatus:  equityResult.pcStatus,
    pb:        equityResult.pbVal,            // store as 0–100
    pbStatus:  equityResult.pbStatus,
    qualityWeightsUsed: qualityResult.weightsUsed,
    equityWeightsUsed:  equityResult.weightsUsed,
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
    componentDetail,
    warnings,
  };
}

function round2(n: number): number { return Math.round(n * 100) / 100; }

export { ENGINE_SOURCE as KORA_INDEX_ENGINE_VERSION };
