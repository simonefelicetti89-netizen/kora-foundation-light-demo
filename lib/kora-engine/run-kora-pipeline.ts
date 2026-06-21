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
  RegimeType,
} from './types';
import type { WorkforceAggregateGroup } from '@/lib/types';
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
import { getMacroblockWeights, getMCConfig } from '@/lib/methodology-config/v0.1';
import { pibAggregationService } from '@/services/pib-aggregation/PIBAggregationService';
import { computeMonteCarlo } from './monte-carlo-engine';

const PIPELINE_SOURCE = 'KoraPipeline_v2.0';

// ── Dept rate map builder ──────────────────────────────────────────────────────
// Combines explicit unique active worker counts with workforce group headcounts to
// produce the deptRates input required by computeEQs.
// uniqueActiveWorkersByDept: deduplicated count of workers with ≥1 approved IU per dept.
// NOT activation.departmentGaps (raw participation sums across program records).
// Returns null if no department groups with valid headcounts match the input keys.

function norm(s: string): string {
  return s.toLowerCase().trim().replace(/[-_]/g, ' ');
}

function buildDeptRates(
  uniqueActiveWorkersByDept: Record<string, number>,
  workforceGroups: WorkforceAggregateGroup[],
): Record<string, { activeUniqueWorkers: number; headcount: number }> | null {
  const deptGroups = workforceGroups.filter(
    g => g.dimension_type === 'department' && g.employee_count > 0 && g.privacy_threshold_met,
  );
  if (deptGroups.length === 0) return null;

  const headcountByLabel = new Map<string, number>(
    deptGroups.map(g => [norm(g.dimension_label), g.employee_count]),
  );

  const result: Record<string, { activeUniqueWorkers: number; headcount: number }> = {};
  for (const [deptKey, activeUniqueWorkers] of Object.entries(uniqueActiveWorkersByDept)) {
    if (activeUniqueWorkers <= 0) continue;
    const headcount = headcountByLabel.get(norm(deptKey));
    if (headcount && headcount > 0) {
      result[deptKey] = { activeUniqueWorkers, headcount };
    }
  }

  return Object.keys(result).length > 0 ? result : null;
}

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
    regime: 'fl_base' as RegimeType, // insufficient_data always fl_base (no components computed)
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
  /** Workforce baseline aggregate groups — used to build per-dept headcount denominators
   *  for EQS (Foundation Light enriched path). department groups must have employee_count > 0
   *  and privacy_threshold_met = true to be used. */
  workforceGroups?: WorkforceAggregateGroup[];
  /** Explicit unique active workers per department — required for EQS (Foundation Light enriched path).
   *  Keys must match workforceGroups dimension_label values (case/separator-insensitive).
   *  Must be a deduplicated count of workers with ≥1 approved IU in the period per department.
   *  Must NOT be activation.departmentGaps (raw participation sums across program records). */
  uniqueActiveWorkersByDept?: Record<string, number>;
}): KoraComputationResult {
  const {
    tenantId,
    batchId = `batch_${tenantId}_v0`,
    records,
    workforcePopulation,
    scoringMode: forcedMode,
    workforceGroups,
    uniqueActiveWorkersByDept,
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
        approved_for_impact_units: Boolean(raw['b6_approved_for_iu']),
        action_family:             (String(raw['categoria'] ?? raw['category'] ?? raw['tipo'] ?? raw['type'] ?? 'blocked_compliance')) as ActionFamily,
        event_nature:              String(raw['tipo'] ?? ''),
        primary_pillar:            pm.primaryPillar,
        pillar_distribution:       {},
        missing_fields:            Array.isArray(raw['b6_missing_fields']) ? raw['b6_missing_fields'] as string[] : [],
        evidence_type:             String(raw['b6_evidence_level'] ?? raw['evidence_level'] ?? 'L0'),
        site_or_cluster:           raw['site'] ? String(raw['site']) : null,
        // Sprint 2 B-SM1 — NM continuous functions (all optional, neutral fallback when absent)
        duration_hours:      raw['hours'] !== undefined && raw['hours'] !== '' ? Number(raw['hours']) : undefined,
        event_date:          raw['event_date'] ? String(raw['event_date']) : undefined,
        b6_repetition_count: raw['b6_repetition_count'] !== undefined ? Number(raw['b6_repetition_count']) : undefined,
        is_recurring:        raw['b6_is_recurring'] === true || raw['b6_is_recurring'] === 'true',
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

    // Step 9b: Build dept activation rates for EQS (Foundation Light enriched path).
    // Requires BOTH uniqueActiveWorkersByDept (explicit deduplicated numerators) AND
    // workforceGroups (denominators). activation.departmentGaps is raw participation sums
    // and must NOT be used as the numerator — it violates the canonical formula
    // activation_rate_g = active_unique_workers_g / workforce_g.
    // The reason for unavailability is determined here where both inputs are visible,
    // and threaded through to componentDetail.eqsSource for precise audit attribution.
    const hasWorkforceGroups = !!workforceGroups && workforceGroups.length > 0;
    const hasUniqueActiveWorkers = !!uniqueActiveWorkersByDept;

    let deptRates: Record<string, { activeUniqueWorkers: number; headcount: number }> | null = null;
    let eqsUnavailableSource: string | undefined;

    if (hasUniqueActiveWorkers && hasWorkforceGroups) {
      deptRates = buildDeptRates(uniqueActiveWorkersByDept!, workforceGroups!);
      // deptRates=null here means no dept label overlap — computeEQs handles its own source
    } else if (!hasUniqueActiveWorkers && !hasWorkforceGroups) {
      eqsUnavailableSource = 'no_group_equity_inputs';
    } else if (!hasWorkforceGroups) {
      eqsUnavailableSource = 'no_workforce_denominators';
    } else {
      eqsUnavailableSource = 'no_unique_active_workers_by_group';
    }

    const eqsAvailable = deptRates !== null;

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
    // eqsAvailable / eqwAvailable: passed for targeted equity-data confidence penalties.
    const confidence = computeConfidence({
      bti,
      activation,
      eligibilitySummary,
      totalRecords: records.length,
      workforceKnown,
      iuResults,
      eqsAvailable,
      eqwAvailable: false, // always false in Foundation Light — Pilot+ path only
    });

    // Step 14: KORA Index — four macroblock aggregate + CS external link.
    // v2.0: iuResults passed for INT (IU per active worker) in QUALITY macroblock.
    // pillarDistribution is now IU-weighted (Step 12), so PB uses IU shares.
    // deptRates: per-dept activation rates for EQS — null in FL base, populated in FL enriched.
    // eqsUnavailableSource: precise reason for EQS=insufficient_data, set in Step 9b.
    const koraIndex = computeKoraIndex({
      bti,
      activation,
      eligibilitySummary,
      pillarDistribution,
      confidenceScore: confidence.score,
      componentSignals,
      iuResults,
      deptRates,
      eqsUnavailableSource,
      computed_records: eligibilitySummary.eligibleCount,
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

    // Step 17: Monte Carlo credibility interval — B-MC1 (diagnostic only).
    // Perturbs macroblock scores n_iter times with scaled noise to produce [p10, median, p90].
    // Only computed when scoringMode='computed' (not for seeded_demo or insufficient_data).
    // Parameters from methodology-config.json — never hardcoded.
    //
    // Official KORA Index = koraIndex.value (raw weighted macroblock sum from kora-index-engine.ts).
    // monteCarlo.reliabilityAdjustedIndex is a diagnostic data-reliability indicator — NOT the official KORA Index.
    // koraIndex.uncertainty.shrunkValue is an internal diagnostic — NOT the official KORA Index.
    // If monteCarlo is exposed in future company UI, it must be labelled as a diagnostic
    // credibility interval only — never as the official KORA Index or its replacement.
    const mcConfig = getMCConfig();
    const monteCarlo = scoringMode === 'computed'
      ? computeMonteCarlo({
          macroblocks: {
            reach:   koraIndex.macroblocks.activationReach,
            quality: koraIndex.macroblocks.activationQuality,
            equity:  koraIndex.macroblocks.distributionEquity,
            bti:     koraIndex.macroblocks.budgetToHumanImpact,
            weights: {
              REACH:   koraIndex.weights['REACH']   ?? 0.25,
              QUALITY: koraIndex.weights['QUALITY'] ?? 0.30,
              EQUITY:  koraIndex.weights['EQUITY']  ?? 0.25,
              BTI:     koraIndex.weights['BTI']     ?? 0.20,
            },
          },
          eligibleCount: eligibilitySummary.eligibleCount,
          config: mcConfig,
        })
      : undefined;

    // Step 18: Regime classification — derived from componentDetail.eqwStatus / eqsStatus only.
    // NEVER from record counts, eligible counts, or workforceGroups presence alone.
    // canonical rule: pilot_plus > fl_enriched > fl_base.
    const cd = koraIndex.componentDetail;
    const regime: RegimeType =
      cd?.eqwStatus === 'computed' && cd?.eqsStatus === 'computed' ? 'pilot_plus'
      : cd?.eqsStatus === 'computed'                                ? 'fl_enriched'
      :                                                               'fl_base';

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
      regime,
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
      monteCarlo,
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
