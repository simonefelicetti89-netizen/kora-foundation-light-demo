// services/pib-aggregation/PIBAggregationService.ts
// Stage 11 of the 14-stage KORA algorithm: PIB = Σ_p IU_{worker,p}
//
// AG-01 canonical rule (doc 10 §26):
//   "Every KORA Index calculation must pass through individual PIBs.
//    It is not permitted to calculate the KORA Index directly from
//    company-level aggregate data. PIB is the mandatory intermediate layer."
//
// KORA Foundation Light constraint:
//   UEF records are program-level aggregates (one row per initiative, not per worker).
//   Individual PIBSnapshots (workerPseudonymId → total IU) cannot be computed
//   from the aggregate upload model — they require per-worker UEF records.
//   This service implements the AG-01 mandatory intermediate layer with
//   estimationBasis='aggregate_estimate' until individual records are available
//   (Pilot+ when My KORA participation confirmation is active).
//
// Two consumers:
//   1. KORA Index Engine (via run-kora-pipeline Step 4): CompanyPIBAggregation
//   2. Worker Experience / My KORA Home: getWorkerPIBSummary() — v0.1: not available
//
// Privacy invariant:
//   aggregatePIBForCompany() output is employer-safe.
//   getWorkerPIBSummary() output is worker-private — never callable by employer roles.
//   PIBSnapshots are never returned to any employer-facing API path.
//
// Design constraints:
//   - Deterministic. No Math.random. No external calls.
//   - Never throws — returns aggregate_estimate with warnings on any error.
//   - No new SQL DDL (Gate 2 open). Application-layer aggregation only.

import type {
  RawUploadedRecord,
  NormalizedUEFRecord,
  EligibilityResult,
  CompanyPIBAggregation,
  PIBSnapshot,
  Pillar,
} from '@/lib/kora-engine/types';
import type { ImpactUnitComputationResult, ImpactUnitComputationSummary } from '@/lib/types';
import { getMethodologyVersion, getCalibrationStatus } from '@/lib/methodology-config/v0.1';
import { isRawUploadedRecord } from '@/lib/kora-engine/pillar-mapping';

const SERVICE_SOURCE = 'PIBAggregationService_v0.1';

const PILLARS: Pillar[] = ['LIFE', 'GROWTH', 'CONNECTION', 'IMPACT', 'LEGACY'];

// ── Participant count extraction ──────────────────────────────────────────────
// Mirrors activation-engine.ts extraction logic — kept local to avoid coupling.

function extractParticipantsFromRaw(raw: Record<string, unknown>): number | null {
  for (const key of ['participants', 'partecipanti', 'fruitori', 'users', 'active_users', 'active_workers']) {
    const v = raw[key];
    if (v !== null && v !== undefined) {
      const n = typeof v === 'number' ? v : parseFloat(String(v).replace(',', '.'));
      if (Number.isFinite(n) && n > 0) return Math.round(n);
    }
  }
  return null;
}

function extractParticipants(record: RawUploadedRecord | NormalizedUEFRecord): number | null {
  try {
    if (isRawUploadedRecord(record)) return extractParticipantsFromRaw(record.raw);
    return (record as NormalizedUEFRecord).participants;
  } catch {
    return null;
  }
}

function extractEvidenceLevel(record: RawUploadedRecord | NormalizedUEFRecord): string {
  try {
    if (isRawUploadedRecord(record)) {
      const raw = record.raw;
      for (const key of ['b6_evidence_level', 'evidence_type', 'evidence_level']) {
        const v = raw[key];
        if (v && typeof v === 'string' && v.length > 0) return v;
      }
      return 'L0';
    }
    // NormalizedUEFRecord
    return (record as NormalizedUEFRecord).budgetEvidence?.evidenceLevel ?? 'L0';
  } catch {
    return 'L0';
  }
}

function isHighQualityEvidence(level: string): boolean {
  const l = level.toUpperCase().slice(0, 2);
  return l === 'L2' || l === 'L3' || l === 'L4';
}

// ── Math helpers ──────────────────────────────────────────────────────────────

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

function round6(n: number): number {
  return Math.round(n * 1000000) / 1000000;
}

// ── Zero aggregate ────────────────────────────────────────────────────────────

function zeroPIBAggregate(
  period: string,
  workforceCount: number,
  warnings: string[],
): CompanyPIBAggregation {
  return {
    period,
    workforceCount,
    activatedWorkers:      0,
    meaningfulWorkers:     0,
    estimatedAR:           0,
    estimatedMAR:          0,
    totalIU:               0,
    avgEstimatedPIB:       0,
    pillarTotals:          { LIFE: 0, GROWTH: 0, CONNECTION: 0, IMPACT: 0, LEGACY: 0 },
    pillarShares:          { LIFE: 0, GROWTH: 0, CONNECTION: 0, IMPACT: 0, LEGACY: 0 },
    wbEstimate:            null,
    pibSnapshotsAvailable: false,
    estimationBasis:       'aggregate_estimate',
    estimationNote:        'KORA Foundation Light: aggregate_estimate — no individual PIB data available. AG-01 canonical layer present; individual PIBs require per-worker records (Pilot+).',
    calibrationStatus:     'pre_empirical_calibration',
    methodologyVersion:    getMethodologyVersion(),
    warnings,
  };
}

// ── PIBAggregationService ─────────────────────────────────────────────────────

export class PIBAggregationService {

  // ── aggregateForBatch ──────────────────────────────────────────────────────
  // Stage 11: would aggregate IU by worker_pseudonym_id → PIBSnapshot per worker.
  //
  // KORA Foundation Light: UEF records are program-level aggregates.
  // Individual PIBSnapshots are not computable from the aggregate upload model.
  // Returns empty snapshots with explanatory note.
  //
  // Pilot+ path: when individual UEF records (one per worker per event) are
  // available via My KORA participation confirmation or individual provider
  // exports, this method will produce real PIBSnapshots.
  aggregateForBatch(
    _iuResults: ImpactUnitComputationResult[],
    _workforcePopulation?: number,
  ): { snapshots: PIBSnapshot[]; pibSnapshotsAvailable: false; reason: string } {
    return {
      snapshots: [],
      pibSnapshotsAvailable: false,
      reason:
        'aggregate_model_v0.1: UEF records are program-level aggregates. ' +
        'Individual PIB snapshots (workerPseudonymId → total IU per pillar) require ' +
        'per-worker UEF records. Available in Pilot+ when My KORA participation ' +
        'confirmation or individual provider exports are active.',
    };
  }

  // ── aggregatePIBForCompany ─────────────────────────────────────────────────
  // Computes the company-level PIB aggregate from available IU and activation data.
  //
  // In KORA Foundation Light (aggregate model):
  //   - activatedWorkers / meaningfulWorkers come from the activation engine result
  //     (which uses bounded reach — the most accurate estimate available).
  //   - totalIU and pillar breakdown come from iuResults / iuSummary.
  //   - estimationBasis = 'aggregate_estimate' — activatedWorkers is a bounded estimate.
  //   - wbEstimate = null — Gini coefficient requires individual PIB distribution.
  //
  // When estimationBasis = 'individual_pib' (future):
  //   - activatedWorkers / meaningfulWorkers derived from actual PIBSnapshots.
  //   - wbEstimate = Gini coefficient over PIB distribution.
  //   - AR / MAR canonical — exactly AG-01 spec.
  aggregatePIBForCompany(params: {
    iuResults: ImpactUnitComputationResult[];
    iuSummary: ImpactUnitComputationSummary;
    records: Array<RawUploadedRecord | NormalizedUEFRecord>;
    eligibilityResults: EligibilityResult[];
    activatedWorkers: number;           // from activation engine (bounded reach)
    meaningfullyActiveWorkers: number;  // from activation engine
    workforcePopulation: number;
    period?: string;
  }): CompanyPIBAggregation {
    const {
      iuResults,
      iuSummary,
      records,
      eligibilityResults,
      activatedWorkers: activationEngineActiveWorkers,
      meaningfullyActiveWorkers: activationEngineMeaningfulWorkers,
      workforcePopulation,
      period = 'unknown',
    } = params;

    const warnings: string[] = [];

    // ── Step 1: IU totals from iuSummary (authoritative aggregate) ───────────
    // iuSummary is the authoritative source for IU totals and pillar breakdown.
    // iuResults[] is used only for per-record cross-checks (participant counts).
    // Do NOT guard on iuResults.length — iuSummary may have data even when
    // iuResults is empty (e.g., when summary is loaded from persisted state).
    const totalIU = iuSummary.total_impact_units;
    const pillarTotals: Record<Pillar, number> = {
      LIFE:       round6(iuSummary.impact_units_by_pillar?.['LIFE']       ?? 0),
      GROWTH:     round6(iuSummary.impact_units_by_pillar?.['GROWTH']     ?? 0),
      CONNECTION: round6(iuSummary.impact_units_by_pillar?.['CONNECTION'] ?? 0),
      IMPACT:     round6(iuSummary.impact_units_by_pillar?.['IMPACT']     ?? 0),
      LEGACY:     round6(iuSummary.impact_units_by_pillar?.['LEGACY']     ?? 0),
    };

    // ── Step 2: Pillar shares (0–1 proportions) ───────────────────────────────
    const pillarShares: Record<Pillar, number> = { LIFE: 0, GROWTH: 0, CONNECTION: 0, IMPACT: 0, LEGACY: 0 };
    if (totalIU > 0) {
      for (const p of PILLARS) {
        pillarShares[p] = round4(pillarTotals[p] / totalIU);
      }
    }

    // ── Step 3: activatedWorkers — use bounded reach from activation engine ───
    // This is the best available estimate in Foundation Light aggregate model.
    // When individual PIBSnapshots are available, use PIB-based count instead.
    const activatedWorkers    = Math.max(0, activationEngineActiveWorkers);
    const meaningfulWorkers   = Math.max(0, activationEngineMeaningfulWorkers);

    // ── Step 4: Cross-check — warn if program-level participant sum far exceeds workforce
    const eligibleComputedParticipantSum = iuResults.reduce((sum, iu, i) => {
      if (!iu.computed) return sum;
      const status = eligibilityResults[i]?.status ?? 'review_required';
      if (status !== 'eligible') return sum;
      const pax = extractParticipants(records[i]);
      return sum + (pax ?? 0);
    }, 0);

    if (workforcePopulation > 0 && eligibleComputedParticipantSum > workforcePopulation * 1.5) {
      warnings.push(
        `PIBAggregation: somma partecipanti programmi eligible (${eligibleComputedParticipantSum}) ` +
        `supera significativamente la forza lavoro (${workforcePopulation}). ` +
        'Probabile doppio conteggio tra programmi — activatedWorkers stimato conservativamente ' +
        'dal motore di attivazione (bounded reach). ' +
        'L\'aggregazione PIB canonica richiede record individuali per-lavoratore.',
      );
    }

    // ── Step 5: AR / MAR from activation engine values ───────────────────────
    const wfCount = Math.max(1, workforcePopulation);
    const estimatedAR  = round4(Math.min(1, activatedWorkers  / wfCount));
    const estimatedMAR = round4(Math.min(1, meaningfulWorkers / wfCount));

    // ── Step 6: avgEstimatedPIB ───────────────────────────────────────────────
    // = totalIU / activatedWorkers
    // Represents average IU earned per activated worker in the period.
    // In aggregate model: this is an over/under estimate depending on IU assignment.
    const avgEstimatedPIB = activatedWorkers > 0
      ? round6(totalIU / activatedWorkers)
      : 0;

    // ── Step 7: WB (Gini coefficient) — not computable in aggregate model ─────
    // Would require individual PIB distribution. null = insufficient_data.
    const wbEstimate: number | null = null;

    // ── Step 8: Meaningful workers cross-check (high-evidence participation) ──
    let highEvidenceParticipantSum = 0;
    for (let i = 0; i < iuResults.length; i++) {
      if (!iuResults[i].computed) continue;
      const status = eligibilityResults[i]?.status ?? 'review_required';
      if (status !== 'eligible') continue;
      const level = extractEvidenceLevel(records[i]);
      if (!isHighQualityEvidence(level)) continue;
      const pax = extractParticipants(records[i]);
      highEvidenceParticipantSum += pax ?? 0;
    }
    // Only use high-evidence sum as a cross-check warning, not as primary estimate
    if (workforcePopulation > 0 && highEvidenceParticipantSum > meaningfulWorkers * 2) {
      warnings.push(
        `PIBAggregation: ${highEvidenceParticipantSum} partecipazioni L2+ rilevate, ` +
        `ma activationEngine stima ${meaningfulWorkers} lavoratori meaningful. ` +
        'Indicatore di possibile overlap tra programmi.',
      );
    }

    // ── Methodology annotation warnings ──────────────────────────────────────
    warnings.push(
      `${SERVICE_SOURCE} | estimationBasis=aggregate_estimate | ` +
      'Individual PIB snapshots not available — KORA Foundation Light aggregate model. ' +
      'AR/MAR from activation engine (bounded reach). ' +
      'WB=null (requires individual PIB distribution). ' +
      'CO cross-period: insufficient_data.',
    );

    return {
      period,
      workforceCount:        workforcePopulation,
      activatedWorkers,
      meaningfulWorkers,
      estimatedAR,
      estimatedMAR,
      totalIU:               round6(totalIU),
      avgEstimatedPIB,
      pillarTotals,
      pillarShares,
      wbEstimate,
      pibSnapshotsAvailable: false,
      estimationBasis:       'aggregate_estimate',
      estimationNote:
        'KORA Foundation Light: PIBAggregation uses program-level UEF aggregates. ' +
        'Individual PIB per worker requires per-worker UEF records (Pilot+). ' +
        'activatedWorkers = bounded reach estimate from activation engine. ' +
        'avgEstimatedPIB = totalIU / activatedWorkers (upper-bound interpretation). ' +
        'Canonical PIB = Σ_p IU_{worker,p} per D-04 / AG-01.',
      calibrationStatus:     'pre_empirical_calibration',
      methodologyVersion:    getMethodologyVersion(),
      warnings,
    };
  }

  // ── getWorkerPIBSummary ────────────────────────────────────────────────────
  // My KORA consumer: worker-private PIB summary.
  // Returns individual PIBSnapshot for the authenticated worker.
  //
  // KORA Foundation Light: individual PIB not available (aggregate model).
  // Caller must be worker role — employer roles must never call this method.
  //
  // Privacy rule: this method's output is worker-private only.
  // Never used in any employer-facing component or API response.
  getWorkerPIBSummary(
    workerPseudonymId: string,
    role: string,
  ): { available: false; reason: string } | PIBSnapshot {
    // Hard guard: employer roles must never receive individual PIB data.
    if (role === 'COMPANY_ADMIN' || role === 'COMPANY_VIEWER' || role === 'ADVISOR') {
      return {
        available: false,
        reason:
          'Privacy violation: employer roles have zero access to individual PIB data (D-04). ' +
          'Worker PIB is accessible only to the worker themselves via My KORA.',
      };
    }

    // KORA Foundation Light: individual PIB not computable from aggregate model.
    return {
      available: false,
      reason:
        'KORA Foundation Light: individual PIB not available. ' +
        `Worker (pseudonym: ${workerPseudonymId}) PIB requires per-worker UEF records ` +
        'via My KORA participation confirmation or individual provider export (Pilot+). ' +
        'This is an architecture limitation — PIB computation is canonical, ' +
        'but Foundation Light upload model is program-level aggregate.',
    };
  }
}

// Singleton — one service instance for the application
export const pibAggregationService = new PIBAggregationService();
