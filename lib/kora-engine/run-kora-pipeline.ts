// lib/kora-engine/run-kora-pipeline.ts
// KORA Computation Pipeline v0.1 — Foundation Light Pilot.
//
// Orchestrates the full 10-step pipeline:
//   records → Eligibility → Pillar → Care Economy → Budget Evidence
//   → BTI → Activation → KORA Index → Confidence → Explainability
//
// Design constraints:
//   - Never throws — returns insufficient_data on any unhandled error.
//   - Real tenants must never fall back to synthetic seed (doc upload-engine-v0-boundary.md).
//   - Empty records → scoringMode=insufficient_data immediately.
//   - Identity signals are confined to computeActivation (reach quality block) — never returned.
//   - All methodology weights read from lib/methodology-config/v0.1.ts — never hardcoded here.

import type {
  RawUploadedRecord,
  NormalizedUEFRecord,
  EligibilitySummary,
  BTIResult,
  ActivationResult,
  KoraIndexResult,
  ConfidenceResult,
  KoraComputationResult,
  ScoringMode,
  Pillar,
} from './types';
import { classifyEligibilityBatch } from './eligibility-gate';
import { mapPillarBatch } from './pillar-mapping';
import { mapCareEconomyBatch } from './care-economy-mapping';
import { assessBudgetEvidenceBatch } from './budget-evidence';
import { computeBTI } from './bti-engine';
import { computeActivation } from './activation-engine';
import { computeKoraIndex } from './kora-index-engine';
import { computeConfidence } from './confidence-engine';
import { buildExplainabilityTrace } from './explainability';
import { computeReachSemantics } from './reach-semantics';
import { getMacroblockWeights } from '@/lib/methodology-config/v0.1';

const PIPELINE_SOURCE = 'KoraPipeline_v0.1';

// ── Insufficient data result ──────────────────────────────────────────────────

function buildInsufficientDataResult(
  tenantId: string,
  batchId: string,
  warnings: string[],
): KoraComputationResult {
  const zeroBTI: BTIResult = {
    totalBudget: 0, documentedBudget: 0, declaredBudget: 0,
    estimatedBudget: 0, nonValuedBudget: 0, deepActivationSpend: 0,
    economicReliefSpend: 0, blockedComplianceSpend: 0,
    activationDebt: 0, budgetEvidenceQuality: 0,
    btiScore: 0, warnings: ['Nessun record: BTI non calcolabile.'], trace: [],
  };

  const zeroActivation: ActivationResult = {
    activationReach: 0, meaningfulActivationReach: 0,
    activeWorkers: 0, meaningfullyActiveWorkers: 0, neverActivatedWorkers: 0,
    concentrationTopShare: 0, bottomFiftyShare: 0,
    departmentGaps: {}, siteGaps: {},
    safeguardStatus: 'WARNING',
    warnings: ['Nessun record: attivazione non calcolabile.'],
  };

  const zeroKoraIndex: KoraIndexResult = {
    value: 0,
    macroblocks: { activationReach: 0, activationQuality: 0, distributionEquity: 0, budgetToHumanImpact: 0 },
    weights: getMacroblockWeights(),
    methodologyVersion: 'KORA-METHOD-v0.1.0',
    calibrationStatus: 'pre_empirical_calibration',
    productionReady: false,
    confidenceExternal: 0,
    warnings: ['insufficient_data: KORA Index non calcolabile.'],
  };

  const zeroConfidence: ConfidenceResult = {
    score: 0, mappingConfidence: 0, budgetEvidenceConfidence: 0,
    dataCompleteness: 0, verificationConfidence: 0, reviewConfidence: 0,
    externalToIndex: true,
    warnings: ['insufficient_data: Confidence Score non calcolabile.'],
  };

  return {
    tenantId,
    batchId,
    scoringMode: 'insufficient_data',
    eligibilitySummary: { eligibleCount: 0, limitedCount: 0, blockedCount: 0, reviewRequiredCount: 0, totalCount: 0 },
    pillarDistribution: { LIFE: 0, GROWTH: 0, CONNECTION: 0, IMPACT: 0, LEGACY: 0 },
    bti: zeroBTI,
    activation: zeroActivation,
    koraIndex: zeroKoraIndex,
    confidence: zeroConfidence,
    explainabilityTrace: [],
    warnings: [...warnings, `Fonte: ${PIPELINE_SOURCE} | scoringMode=insufficient_data`],
    createdAt: new Date().toISOString(),
  };
}

// ── Main pipeline ─────────────────────────────────────────────────────────────

export function runKoraPipeline(params: {
  tenantId: string;
  batchId?: string;
  records: Array<RawUploadedRecord | NormalizedUEFRecord>;
  workforcePopulation?: number;
  scoringMode?: ScoringMode;
}): KoraComputationResult {
  const {
    tenantId,
    batchId = `batch_${tenantId}_v0`,
    records,
    workforcePopulation,
    scoringMode: forcedMode,
  } = params;

  try {
    // Step 1: Guard — empty records → insufficient_data immediately
    if (records.length === 0) {
      return buildInsufficientDataResult(tenantId, batchId, [
        'Nessun record fornito. scoringMode=insufficient_data.',
        'Caricare dati aziendali tramite AI Upload Studio per avviare il calcolo KORA Index.',
      ]);
    }

    const scoringMode: ScoringMode = forcedMode ?? 'computed';

    // Step 2: Eligibility Gate — classify all records
    const eligibilityResults = classifyEligibilityBatch(records);

    // Step 3: Pillar Mapping — map each record to its primary pillar
    const pillarMappings = mapPillarBatch(records, eligibilityResults);

    // Step 4: Care Economy Tagging — detect care signals (premium module, signals only in v3)
    const careSignals = mapCareEconomyBatch(records, eligibilityResults, pillarMappings);
    const careSignalCount = careSignals.filter((s) => s !== null).length;

    // Step 5: Budget Evidence Assessment — L0→L4 for each record
    const budgetEvidenceResults = assessBudgetEvidenceBatch(records);

    // Step 6: BTI Engine — aggregate spend routing and BTI Score
    const bti = computeBTI({
      records,
      eligibilityResults,
      budgetEvidenceResults,
      pillarMappings,
    });

    // Step 7: Activation Engine — AR, MAR, safeguard, concentration
    const activation = computeActivation({
      records,
      eligibilityResults,
      pillarMappings,
      workforcePopulation,
    });

    // Step 8: Eligibility Summary
    const eligibilitySummary: EligibilitySummary = {
      eligibleCount:       eligibilityResults.filter((r) => r.status === 'eligible').length,
      limitedCount:        eligibilityResults.filter((r) => r.status === 'limited').length,
      blockedCount:        eligibilityResults.filter((r) => r.status === 'blocked').length,
      reviewRequiredCount: eligibilityResults.filter((r) => r.status === 'review_required').length,
      totalCount:          eligibilityResults.length,
    };

    // Step 9: Pillar Distribution — count by primary pillar
    const pillarDistribution: Record<Pillar, number> = {
      LIFE: 0, GROWTH: 0, CONNECTION: 0, IMPACT: 0, LEGACY: 0,
    };
    for (const pm of pillarMappings) {
      if (pm.primaryPillar !== null) {
        pillarDistribution[pm.primaryPillar]++;
      }
    }

    // Detect workforce known: explicit param or inferred from activation result
    const workforceKnown =
      (workforcePopulation !== undefined && workforcePopulation > 0) ||
      activation.activationReach > 0;

    // Step 10: Confidence Score — computed before KORA Index (CS fed into confidenceExternal)
    const confidence = computeConfidence({
      bti,
      activation,
      eligibilitySummary,
      totalRecords: records.length,
      workforceKnown,
    });

    // Step 11: KORA Index — four macroblock aggregate + CS external link
    const koraIndex = computeKoraIndex({
      bti,
      activation,
      eligibilitySummary,
      pillarDistribution,
      confidenceScore: confidence.score,
    });

    // Step 12: Explainability Trace — 9-stage aggregate trace, no identity values
    const resolvedWf: number | null =
      workforcePopulation !== undefined && workforcePopulation > 0
        ? workforcePopulation
        : activation.activeWorkers + activation.neverActivatedWorkers > 0
          ? activation.activeWorkers + activation.neverActivatedWorkers
          : null;

    const explainabilityTrace = buildExplainabilityTrace({
      eligibilitySummary,
      pillarDistribution,
      bti,
      activation,
      koraIndex,
      confidence,
      totalRecords: records.length,
      workforcePopulation: resolvedWf,
      careSignalCount,
    });

    // Step 13: Reach Semantics — B24 board-safe AR/MAR separation (explanatory, no KORA Index impact)
    const reachSemantics = computeReachSemantics({
      records,
      eligibilityResults,
      workforcePopulation: workforcePopulation ?? null,
      activationRate: activation.activationReach,
      meaningfulActivationRate: activation.meaningfulActivationReach,
    });

    // Top-level pipeline warnings: only non-verbose signals not already in sub-engines
    const pipelineWarnings: string[] = [];
    if (activation.safeguardStatus === 'FLAGGED') {
      pipelineWarnings.push(
        'Pipeline: Activation Safeguard FLAGGED — AR e/o MAR sotto soglie critiche D-21.',
      );
    }
    if (careSignalCount > 0) {
      pipelineWarnings.push(
        `Pipeline: ${careSignalCount} segnali Care Economy rilevati — modulo premium informativo.`,
      );
    }
    pipelineWarnings.push(`Fonte: ${PIPELINE_SOURCE} | scoringMode=${scoringMode}`);

    return {
      tenantId,
      batchId,
      scoringMode,
      eligibilitySummary,
      pillarDistribution,
      bti,
      activation,
      koraIndex,
      confidence,
      explainabilityTrace,
      reachSemantics,
      warnings: pipelineWarnings,
      createdAt: new Date().toISOString(),
    };

  } catch (err) {
    // Pipeline never throws — return insufficient_data on any unhandled error
    const errorMsg = err instanceof Error ? err.message : String(err);
    return buildInsufficientDataResult(tenantId, batchId ?? `batch_${tenantId}_v0`, [
      `Errore interno pipeline: ${errorMsg}`,
      'scoringMode=insufficient_data. Verificare la struttura dei dati di input.',
    ]);
  }
}

export { PIPELINE_SOURCE as KORA_PIPELINE_VERSION };
