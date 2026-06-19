// lib/kora-engine/run-kora-pipeline.ts
// KORA Computation Pipeline v2.0 — Foundation Light Pilot. Sprint 1 IU-centric.
//
// Orchestrates the full pipeline:
//   records → Eligibility → Pillar → Care Economy → Budget Evidence
//   → Component Signals (NI, VR, CO) → BTI → Activation → PIB Aggregation
//   → KORA Index → Confidence → Explainability
//
// v2.0 Sprint 1 changes:
//   Step 12: pillarDistribution now sums IU per pillar (not event counts) — B-IU1.
//   iuResults passed to computeKoraIndex (for INT/EQW) and computeConfidence (for VR indep.).
//   QUALITY = EVQ×34% + INT×33% + CONT×33% — B-QU1.
//   EQUITY = EQW×30% + EQS×20% + PC×25% + PB×25% — B-EQ1.
//   No weight redistribution: insufficient_data contributes 0 (tetto, non gonfiaggio).
//
// Design constraints:
//   - Never throws — returns insufficient_data on any unhandled error.
//   - Real tenants must never fall back to synthetic seed.
//   - Empty records → scoringMode=insufficient_data immediately.
//   - Identity signals are confined to computeActivation — never returned.
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
  ComponentSignals,
  ScoringMode,
  Pillar,
  CompanyPIBAggregation,
} from './types';
import { classifyEligibilityBatch } from './eligibility-gate';
import { mapPillarBatch } from './pillar-mapping';
import type { ActionFamily, EligibilityClass } from '@/lib/types';
import { iuComputationService, type IULiveInput } from '@/services/iu-computation/IUComputationService';
import { mapCareEconomyBatch } from './care-economy-mapping';
import { assessBudgetEvidenceBatch } from './budget-evidence';
import { computeComponentSignals } from './component-engine';
import { computeBTI } from './bti-engine';
import { computeActivation } from './activation-engine';
import { computeKoraIndex } from './kora-index-engine';
import { computeConfidence } from './confidence-engine';
import { buildExplainabilityTrace } from './explainability';
import { computeReachSemantics } from './reach-semantics';
import { getMacroblockWeights } from '@/lib/methodology-config/v0.1';
import { pibAggregationService } from '@/services/pib-aggregation/PIBAggregationService';

const PIPELINE_SOURCE = 'KoraPipeline_v2.0';

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
    methodologyVersion: 'KORA-METHOD-v1.0',
    calibrationStatus: 'pre_empirical_calibration',
    productionReady: false,
    confidenceExternal: 0,
    warnings: ['insufficient_data: KORA Index non calcolabile.'],
  };

  const zeroConfidence: ConfidenceResult = {
    score: 0, mappingConfidence: 0, budgetEvidenceConfidence: 0,
    dataCompleteness: 0, verificationConfidence: 0, reviewConfidence: 0,
    externalToIndex: true,
    warnings: ['insufficient_data: Data Reliability Index non calcolabile.'],
  };

  const zeroSignals: ComponentSignals = {
    ni: 0, niStatus: 'insufficient_data', niSourceRecords: 0,
    vr: 0, vrStatus: 'insufficient_data', vrSourceRecords: 0,
    co: 0, coStatus: 'insufficient_data', coRecurringPrograms: 0, coTotalPrograms: 0,
  };

  const zeroPIBAggregation: CompanyPIBAggregation = {
    period: 'unknown',
    workforceCount: 0,
    activatedWorkers: 0,
    meaningfulWorkers: 0,
    estimatedAR: 0,
    estimatedMAR: 0,
    totalIU: 0,
    avgEstimatedPIB: 0,
    pillarTotals:  { LIFE: 0, GROWTH: 0, CONNECTION: 0, IMPACT: 0, LEGACY: 0 },
    pillarShares:  { LIFE: 0, GROWTH: 0, CONNECTION: 0, IMPACT: 0, LEGACY: 0 },
    wbEstimate: null,
    pibSnapshotsAvailable: false,
    estimationBasis: 'aggregate_estimate',
    estimationNote: 'insufficient_data: no records to aggregate.',
    calibrationStatus: 'pre_empirical_calibration',
    methodologyVersion: 'KORA-METHOD-v1.0',
    warnings: ['Nessun record: PIB aggregation non calcolabile.'],
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
    componentSignals: zeroSignals,
    explainabilityTrace: [],
    pibAggregation: zeroPIBAggregation,
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

    // Step 4: Impact Units™ Computation — canonical Stage 10.
    // Runs after Eligibility + Pillar Mapping and before Component Signals.
    // Produces per-record IU with full factor trace (NM × BC × CQ × EV × CF × AGF).
    // iuResults are server-side only — never passed to employer-facing API responses.
    // iuSummary is the aggregate-safe view used in Decision Pack and company reports.
    const iuLiveInputs: IULiveInput[] = records.map((record, i) => {
      const elig = eligibilityResults[i];
      const pm   = pillarMappings[i];
      // 'raw' is only present on RawUploadedRecord; NormalizedUEFRecord uses a different shape.
      // For the live scoring path all records are RawUploadedRecord, so this guard is defensive.
      const raw: Record<string, unknown> = 'raw' in record
        ? (record as RawUploadedRecord).raw
        : {};
      const fallbackId = 'recordId' in record
        ? (record as RawUploadedRecord).recordId
        : (record as NormalizedUEFRecord).uefId;
      return {
        uef_record_id:             String(raw['b6_uef_record_id'] ?? fallbackId),
        eligibility:               elig.status as (EligibilityClass | 'review_required'),
        review_required:           elig.reviewRequired,
        // Default to true for eligible records when the governance flag is absent (CSV/demo path).
        // Explicit false ('false'|false) always wins. Flag is set by UEF review in Pilot+.
        approved_for_impact_units: raw['b6_approved_for_iu'] !== undefined
          ? (raw['b6_approved_for_iu'] === true || raw['b6_approved_for_iu'] === 'true' || raw['b6_approved_for_iu'] === '1')
          : elig.status === 'eligible',
        action_family:             (String(raw['categoria'] ?? raw['category'] ?? raw['tipo'] ?? raw['type'] ?? 'blocked_compliance')) as ActionFamily,
        event_nature:              String(raw['tipo'] ?? ''),
        primary_pillar:            pm.primaryPillar,
        pillar_distribution:       {},
        missing_fields:            Array.isArray(raw['b6_missing_fields']) ? raw['b6_missing_fields'] as string[] : [],
        evidence_type:             String(raw['b6_evidence_level'] ?? 'L0'),
        site_or_cluster:           raw['site'] ? String(raw['site']) : null,
      };
    });

    const iuResults = iuComputationService.computeIUForLiveInputBatch(iuLiveInputs);
    const iuSummary = iuComputationService.summarizeLiveResults(iuResults);

    // Step 5: Care Economy Tagging — detect care signals (premium module, signals only in v3)
    const careSignals = mapCareEconomyBatch(records, eligibilityResults, pillarMappings);
    const careSignalCount = careSignals.filter((s) => s !== null).length;

    // Step 6: Budget Evidence Assessment — L0→L4 for each record
    const budgetEvidenceResults = assessBudgetEvidenceBatch(records);

    // Step 7: Component Signals — NI, VR, CO (v1.0 methodology)
    // Computed from approved UEF records using evidence levels and participant counts.
    // Uses eligibilityResults to filter ELIGIBLE records only.
    const componentSignals = computeComponentSignals(records, eligibilityResults);

    // Step 8: BTI Engine — aggregate spend routing and BTI Score
    const bti = computeBTI({
      records,
      eligibilityResults,
      budgetEvidenceResults,
      pillarMappings,
    });

    // Step 9: Activation Engine — AR, MAR, safeguard, concentration — canonical Stage 13
    const activation = computeActivation({
      records,
      eligibilityResults,
      pillarMappings,
      workforcePopulation,
    });

    // Step 10: PIB Aggregation — canonical Stage 11 (AG-01 compliance).
    // Mandatory intermediate layer between IU (Stage 10) and KORA Index (Stage 14).
    // Placed after activation engine (Step 7) to reuse the activation result's
    // bounded-reach activeWorkers / meaningfullyActiveWorkers — the best available
    // estimate in KORA Foundation Light aggregate model.
    // KORA Foundation Light: estimationBasis='aggregate_estimate' — UEF records are
    // program-level (no individual worker tracking). Individual PIBs available in Pilot+.
    const pibAggregation = pibAggregationService.aggregatePIBForCompany({
      iuResults,
      iuSummary,
      records,
      eligibilityResults,
      activatedWorkers:          activation.activeWorkers,
      meaningfullyActiveWorkers: activation.meaningfullyActiveWorkers,
      workforcePopulation:       workforcePopulation ?? 0,
      period:                    batchId,
    });

    // Step 11: Eligibility Summary
    const eligibilitySummary: EligibilitySummary = {
      eligibleCount:       eligibilityResults.filter((r) => r.status === 'eligible').length,
      limitedCount:        eligibilityResults.filter((r) => r.status === 'limited').length,
      blockedCount:        eligibilityResults.filter((r) => r.status === 'blocked').length,
      reviewRequiredCount: eligibilityResults.filter((r) => r.status === 'review_required').length,
      totalCount:          eligibilityResults.length,
    };

    // Step 12: Pillar Distribution — IU-weighted sums per pillar (B-IU1).
    // Replaces event-count accumulation: each computed IU record contributes
    // its impact_units_total to its primary pillar bucket.
    // PB (Pillar Balance) in the equity engine now measures IU shares, not event shares.
    const pillarDistribution: Record<Pillar, number> = {
      LIFE: 0, GROWTH: 0, CONNECTION: 0, IMPACT: 0, LEGACY: 0,
    };
    for (const iu of iuResults) {
      if (iu.computed && iu.primary_pillar !== null) {
        pillarDistribution[iu.primary_pillar as Pillar] += iu.impact_units_total;
      }
    }

    // Detect workforce known: explicit param or inferred from activation result
    const workforceKnown =
      (workforcePopulation !== undefined && workforcePopulation > 0) ||
      activation.activationReach > 0;

    // Step 13: Confidence Score — CS external to KORA Index (doc 21b).
    // v2.0 B-CS1: iuResults passed so verificationConfidence uses verified IU ratio.
    const confidence = computeConfidence({
      bti,
      activation,
      eligibilitySummary,
      totalRecords: records.length,
      workforceKnown,
      iuResults,
    });

    // Step 14: KORA Index — four macroblock aggregate + CS external link.
    // v2.0: iuResults passed for INT (IU per active worker) in QUALITY macroblock.
    // pillarDistribution is now IU-weighted (Step 12), so PB uses IU shares.
    const koraIndex = computeKoraIndex({
      bti,
      activation,
      eligibilitySummary,
      pillarDistribution,
      confidenceScore: confidence.score,
      componentSignals,
      iuResults,
    });

    // Step 15: Explainability Trace — 9-stage aggregate trace, no identity values
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

    // Step 16: Reach Semantics — B24 board-safe AR/MAR separation (explanatory, no KORA Index impact)
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
      componentSignals,
      explainabilityTrace,
      reachSemantics,
      iuSummary,
      iuResults,
      pibAggregation,
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
