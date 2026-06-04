// lib/kora-engine/kora-index-engine.ts
// KORA Index Engine v1.0 — Foundation Light Pilot.
//
// Combines four macroblock scores into the KORA Index v3.
// Data Reliability Index (CS) is EXTERNAL to KORA Index (weight=0) and shown
// alongside — never aggregated. Renamed from "Confidence Score" in v1.0.
//
// v1.0 changes vs v0.0:
//   QUALITY = NI×40% + VR×40% + CO×20%  (MAR removed — no double-counting)
//   EQUITY  = WB×20% + PC×25% + PB×30% + EQ×25%  (WB and EQ added)
//   Dynamic rebalancing when components are insufficient_data.
//   No synthetic fallback values (0.5, 0.0) for missing components.
//
// Design constraints:
//   - Deterministic. No Math.random. No external calls.
//   - Reads macroblock weights from lib/methodology-config/v0.1.ts — never hardcoded.
//   - productionReady is permanently false in Foundation Light.
//   - calibrationStatus is always 'pre_empirical_calibration'.
//   - CS weight = 0: never influences KORA Index value (doc 21b).
//   - MAR appears ONLY in REACH — never in QUALITY (v1.0 fix).

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
import { getMacroblockWeights, getMethodologyVersion } from '@/lib/methodology-config/v0.1';
import { computeEquityScore } from './equity-engine';
import { computeWB, computeEQ } from './component-engine';

const ENGINE_SOURCE = 'KoraIndexEngine_v1.0';

// ── Dynamic rebalancer ────────────────────────────────────────────────────────
// When components are insufficient_data, redistribute their weights across
// the available components proportionally. Returns effective weights (summing to 1.0).

function rebalance(
  slots: Array<{ key: string; weight: number; available: boolean }>,
): Record<string, number> {
  const available = slots.filter(s => s.available);
  if (available.length === 0) return Object.fromEntries(slots.map(s => [s.key, 0]));
  const totalWeight = available.reduce((s, c) => s + c.weight, 0);
  const result: Record<string, number> = {};
  for (const slot of slots) {
    result[slot.key] = slot.available ? slot.weight / totalWeight : 0;
  }
  return result;
}

// ── QUALITY macroblock — v1.0 ─────────────────────────────────────────────────
// QUALITY = NI×40% + VR×40% + CO×20%
// MAR is NOT in QUALITY (fix for v0.0 double-counting).
// When a component is insufficient_data, remaining weights are rebalanced.

function computeQuality(signals: ComponentSignals | undefined): {
  score: number;
  weightsUsed: { ni: number; vr: number; co: number };
  warnings: string[];
} {
  const warnings: string[] = [];

  const niAvail = signals?.niStatus === 'computed';
  const vrAvail = signals?.vrStatus === 'computed';
  const coAvail = signals?.coStatus === 'computed';

  const weights = rebalance([
    { key: 'ni', weight: 0.40, available: niAvail },
    { key: 'vr', weight: 0.40, available: vrAvail },
    { key: 'co', weight: 0.20, available: coAvail },
  ]);

  if (!niAvail) warnings.push('QUALITY: NI (Activation Evidence Intensity) insufficient_data — nessun record eligible con segnali partecipanti.');
  if (!vrAvail) warnings.push('QUALITY: VR (Verification Rate) insufficient_data — nessun record eligible con segnali partecipanti.');
  if (!coAvail) warnings.push('QUALITY: CO (Program Continuity) insufficient_data — nessun programma eligible per il calcolo della ricorrenza.');

  if (!niAvail && !vrAvail && !coAvail) {
    warnings.push('QUALITY macroblock = 0: nessun segnale qualità disponibile.');
    return {
      score: 0,
      weightsUsed: { ni: 0, vr: 0, co: 0 },
      warnings,
    };
  }

  const niVal = niAvail ? (signals!.ni * 100) : 0;
  const vrVal = vrAvail ? (signals!.vr * 100) : 0;
  const coVal = coAvail ? (signals!.co * 100) : 0;

  const score = round2(
    niVal * weights['ni'] +
    vrVal * weights['vr'] +
    coVal * weights['co'],
  );

  return {
    score: Math.max(0, Math.min(100, score)),
    weightsUsed: {
      ni: round3(weights['ni']),
      vr: round3(weights['vr']),
      co: round3(weights['co']),
    },
    warnings,
  };
}

// ── EQUITY macroblock — v1.0 ──────────────────────────────────────────────────
// EQUITY = WB×20% + PC×25% + PB×30% + EQ×25%
// WB and EQ are computed from ActivationResult segment data.
// PC and PB come from the existing equity engine (pillar distribution).
// Dynamic rebalancing when WB or EQ are insufficient_data.

function computeEquityMacroblock(
  activation: ActivationResult,
  pillarDistribution: Record<Pillar, number> | undefined,
): {
  score: number;
  wbVal: number; wbStatus: ComponentStatus;
  eqVal: number; eqStatus: ComponentStatus;
  pcVal: number; pcStatus: ComponentStatus;
  pbVal: number; pbStatus: ComponentStatus;
  weightsUsed: { wb: number; pc: number; pb: number; eq: number };
  warnings: string[];
} {
  const warnings: string[] = [];

  // PC and PB from pillar distribution
  const equityResult = computeEquityScore(pillarDistribution ?? null);
  const pcStatus: ComponentStatus = equityResult.isInsufficientData ? 'insufficient_data' : 'computed';
  const pbStatus: ComponentStatus = equityResult.isInsufficientData ? 'insufficient_data' : 'computed';
  const pcVal = equityResult.isInsufficientData ? 0 : equityResult.pillarCoverageScore;
  const pbVal = equityResult.isInsufficientData ? 0 : equityResult.pillarBalanceScore;

  if (equityResult.isInsufficientData) {
    warnings.push('EQUITY: PC e PB insufficient_data — nessuna distribuzione pillar disponibile.');
  }

  // WB from activation segment data
  const { wb, wbStatus } = computeWB(
    activation.bottomFiftyShare,
    activation.departmentGaps,
    activation.siteGaps,
  );
  const wbVal = wb * 100; // convert 0–1 to 0–100

  // EQ from activation segment data
  const { eq, eqStatus } = computeEQ(
    activation.departmentGaps,
    activation.siteGaps,
  );
  const eqVal = eq * 100; // convert 0–1 to 0–100

  if (wbStatus === 'insufficient_data') {
    warnings.push('EQUITY: WB (Activation Balance) insufficient_data — fornire dati per dipartimento o sede nel file di intake per abilitare questo componente.');
  }
  if (eqStatus === 'insufficient_data') {
    warnings.push('EQUITY: EQ (Distribution Equity) insufficient_data — fornire dati per dipartimento o sede nel file di intake per abilitare questo componente.');
  }

  const weights = rebalance([
    { key: 'wb', weight: 0.20, available: wbStatus === 'computed' },
    { key: 'pc', weight: 0.25, available: pcStatus === 'computed' },
    { key: 'pb', weight: 0.30, available: pbStatus === 'computed' },
    { key: 'eq', weight: 0.25, available: eqStatus === 'computed' },
  ]);

  const score = Math.max(0, Math.min(100, round2(
    wbVal * weights['wb'] +
    pcVal * weights['pc'] +
    pbVal * weights['pb'] +
    eqVal * weights['eq'],
  )));

  return {
    score,
    wbVal, wbStatus,
    eqVal, eqStatus,
    pcVal, pcStatus,
    pbVal, pbStatus,
    weightsUsed: {
      wb: round3(weights['wb']),
      pc: round3(weights['pc']),
      pb: round3(weights['pb']),
      eq: round3(weights['eq']),
    },
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
}): KoraIndexResult {
  const { bti, activation, eligibilitySummary, pillarDistribution, confidenceScore = 0, componentSignals } = params;
  const warnings: string[] = [];
  const weights = getMacroblockWeights();

  // ── Macroblock 1: Activation Reach (REACH, 25%) ────────────────────────────
  // AR weighted 40%, MAR 60% — meaningful activation signals deeper engagement quality.
  // MAR appears ONLY here — it is NOT in QUALITY (v1.0: no double-counting).
  const ar  = activation.activationReach;
  const mar = activation.meaningfulActivationReach;
  const activationReach = round2(ar * 40 + mar * 60);

  if (ar === 0 && mar === 0) {
    warnings.push('REACH macroblock = 0: workforce baseline non disponibile o nessuna attivazione rilevata.');
  }

  // ── Macroblock 2: Activation Quality (QUALITY, 30%) — v1.0 ────────────────
  // QUALITY = NI×40% + VR×40% + CO×20%
  // MAR removed from QUALITY. Dynamic rebalancing when signals unavailable.
  const qualityResult = computeQuality(componentSignals);
  const activationQuality = qualityResult.score;
  warnings.push(...qualityResult.warnings);

  // ── Macroblock 3: Distribution & Equity (EQUITY, 25%) — v1.0 ───────────────
  // EQUITY = WB×20% + PC×25% + PB×30% + EQ×25%
  // WB and EQ are added to the equity macroblock alongside PC and PB.
  // Dynamic rebalancing when WB or EQ are insufficient_data.
  const equityResult = computeEquityMacroblock(activation, pillarDistribution);
  const distributionEquity = equityResult.score;
  warnings.push(...equityResult.warnings);

  if (equityResult.wbStatus === 'insufficient_data' && equityResult.eqStatus === 'insufficient_data') {
    warnings.push(
      'EQUITY macroblock: WB e EQ non disponibili — computed da solo PC e PB. ' +
      'Per abilitare WB e EQ: includere colonne dipartimento o sede nel file di intake.',
    );
  }

  // ── Macroblock 4: Budget-to-Human-Impact (BTI, 20%) ───────────────────────
  // BTI score from BudgetToHumanImpactEngine — unchanged.
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
    `Fonte: ${ENGINE_SOURCE} | KORA-METHOD-v1.0 | ` +
    'calibration_status=pre_empirical_calibration | production_ready=false',
  );

  const macroblocks: KoraIndexMacroblocks = {
    activationReach,
    activationQuality,
    distributionEquity,
    budgetToHumanImpact,
  };

  // ── ComponentDetail — per-component values for persistence ─────────────────
  const componentDetail: ComponentDetail = {
    ni:       componentSignals?.ni ?? 0,
    niStatus: componentSignals?.niStatus ?? 'insufficient_data',
    vr:       componentSignals?.vr ?? 0,
    vrStatus: componentSignals?.vrStatus ?? 'insufficient_data',
    co:       componentSignals?.co ?? 0,
    coStatus: componentSignals?.coStatus ?? 'insufficient_data',
    wb:       equityResult.wbVal / 100,  // store as 0–1
    wbStatus: equityResult.wbStatus,
    eq:       equityResult.eqVal / 100,  // store as 0–1
    eqStatus: equityResult.eqStatus,
    pc:       equityResult.pcVal,        // store as 0–100
    pcStatus: equityResult.pcStatus,
    pb:       equityResult.pbVal,        // store as 0–100
    pbStatus: equityResult.pbStatus,
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
function round3(n: number): number { return Math.round(n * 1000) / 1000; }

export { ENGINE_SOURCE as KORA_INDEX_ENGINE_VERSION };
