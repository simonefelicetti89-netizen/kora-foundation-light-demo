/**
 * CC-011 / B-CONF — Confidence Engine characterization (numeric behavior freeze).
 *
 * SCOPE: this suite does NOT test correctness or canonicalize anything. It
 * captures the CURRENT, unmodified numeric output of
 * lib/kora-engine/confidence-engine.ts (Engine A — canonicalized per D-A/CC-004)
 * across representative scenarios, so any future edit to CC-011's contract
 * layer (banding, scale, persistence) that accidentally changes the formula
 * itself is caught immediately. Expected values below were read off the
 * CURRENT code by hand-tracing computeConfidence(), not derived from any
 * modified version — see CC-011 report for the trace of each figure.
 *
 * CC-011 itself STOPPED before touching confidence-engine.ts (see
 * "CONFIDENCE CONTRACT DECISION REQUIRED" in the CC-011 report) — this file
 * exists precisely so that whichever future CC resolves that decision has a
 * baseline to diff against.
 */

import { describe, it, expect } from 'vitest';
import { computeConfidence } from '@/lib/kora-engine/confidence-engine';
import type { BTIResult, ActivationResult, EligibilitySummary } from '@/lib/kora-engine/types';
import type { ImpactUnitComputationResult } from '@/lib/types';

const baseBTI: BTIResult = {
  totalBudget: 100000, documentedBudget: 80000, declaredBudget: 20000,
  estimatedBudget: 0, nonValuedBudget: 0, deepActivationSpend: 60000,
  economicReliefSpend: 20000, blockedComplianceSpend: 0,
  activationDebt: 0, budgetEvidenceQuality: 0.85,
  btiScore: 70, warnings: [], trace: [],
};

const zeroBudgetBTI: BTIResult = {
  ...baseBTI, totalBudget: 0, documentedBudget: 0, declaredBudget: 0,
  budgetEvidenceQuality: 0.5, // ignored when totalBudget === 0 (baseline 0.10 kicks in)
};

const baseActivation: ActivationResult = {
  activationReach: 0.60, meaningfulActivationReach: 0.45,
  activeWorkers: 60, meaningfullyActiveWorkers: 45, neverActivatedWorkers: 40,
  concentrationTopShare: 0.20, bottomFiftyShare: 0.30,
  departmentGaps: {}, siteGaps: {}, safeguardStatus: 'CLEAR', warnings: [],
};

const baseEligibility: EligibilitySummary = {
  eligibleCount: 18, limitedCount: 1, blockedCount: 0, reviewRequiredCount: 1, totalCount: 20,
};

const noReviewRequiredEligibility: EligibilitySummary = {
  eligibleCount: 20, limitedCount: 0, blockedCount: 0, reviewRequiredCount: 0, totalCount: 20,
};

const heavyReviewEligibility: EligibilitySummary = {
  eligibleCount: 10, limitedCount: 3, blockedCount: 2, reviewRequiredCount: 8, totalCount: 20,
};

function makeIU(evList: number[]): ImpactUnitComputationResult[] {
  return evList.map((ev, i) => ({
    record_id: `rec-${i}`, source_row_id: `src-${i}`,
    action_family: 'family_and_care' as ImpactUnitComputationResult['action_family'],
    event_nature: 'concrete_action' as ImpactUnitComputationResult['event_nature'],
    eligibility: 'eligible' as ImpactUnitComputationResult['eligibility'],
    primary_pillar: 'LIFE',
    pillar_distribution: { LIFE: 1 },
    normalized_magnitude_nm: 1, base_contribution_bc: 1,
    completeness_quality_cq: 0.9, evidence_verification_ev: ev,
    continuity_factor_cf: 1, anti_gaming_factor_agf: 1,
    impact_units_total: 10, impact_units_by_pillar: { LIFE: 10 },
    computed: true, blocked: false, limited: false, review_required: false,
    exclusion_reason: null, explanation: '', formula_trace: [],
    methodology_version: 'KORA Index v1.0', calibration_status: 'pre_empirical_calibration',
  }));
}

describe('CC-011 characterization — Engine A current numeric behavior (baseline, do not update expectations without a formula-change decision)', () => {
  it('high confidence: full budget evidence, no review backlog, high verification, Advisor review present, EQS/EQW available', () => {
    const result = computeConfidence({
      bti: baseBTI,
      activation: baseActivation,
      eligibilitySummary: noReviewRequiredEligibility,
      totalRecords: 20,
      workforceKnown: true,
      reachMethod: 'identity_deduplication',
      hasHumanReview: true,
      iuResults: makeIU([0.9, 0.9, 0.9, 0.9, 0.9]),
      eqsAvailable: true,
      eqwAvailable: true,
    });

    expect(result.budgetEvidenceConfidence).toBeCloseTo(0.85, 3);
    expect(result.dataCompleteness).toBeCloseTo(1.0, 3);
    expect(result.mappingConfidence).toBeCloseTo(1.0, 3);
    expect(result.verificationConfidence).toBeCloseTo(1.0, 3);
    expect(result.reviewConfidence).toBeCloseTo(0.85, 3);
    // rawScore = 0.85*0.30 + 1.0*0.25 + 1.0*0.20 + 1.0*0.15 + 0.85*0.10
    //          = 0.255 + 0.25 + 0.20 + 0.15 + 0.085 = 0.94
    expect(result.score).toBe(94);
    expect(result.externalToIndex).toBe(true);
  });

  it('medium confidence: partial review backlog, no Advisor review, moderate verification', () => {
    const result = computeConfidence({
      bti: baseBTI,
      activation: baseActivation,
      eligibilitySummary: baseEligibility,
      totalRecords: 20,
      workforceKnown: true,
      reachMethod: 'aggregate_unique',
      hasHumanReview: false,
      iuResults: makeIU([0.9, 0.5, 0.5, 0.9, 0.5]),
      eqsAvailable: true,
      eqwAvailable: false,
    });

    expect(result.reviewConfidence).toBeCloseTo(0.40, 3);
    expect(result.verificationConfidence).toBeCloseTo(0.4, 3); // 2 of 5 IU groups >= 0.75 EV, weighted equally -> 20/50
    expect(result.score).toBeGreaterThan(50);
    expect(result.score).toBeLessThan(90);
  });

  it('low confidence: no budget data, heavy review backlog, reach method none, no human review, EQS/EQW unavailable', () => {
    const result = computeConfidence({
      bti: zeroBudgetBTI,
      activation: baseActivation,
      eligibilitySummary: heavyReviewEligibility,
      totalRecords: 20,
      workforceKnown: false,
      reachMethod: 'none',
      hasHumanReview: false,
      eqsAvailable: false,
      eqwAvailable: false,
    });

    expect(result.budgetEvidenceConfidence).toBe(0.10);
    // dataCompleteness: 1.0 - 0.40 (workforce unknown) - 0.40*0.30 (review ratio)
    //   - 0.20 (no budget) - 0.20 (reach=none) - 0.05 (EQW unavailable, unguarded) = 0.03
    expect(result.dataCompleteness).toBeCloseTo(0.03, 3);
    expect(result.verificationConfidence).toBe(0.10); // no iuResults + zero budget branch
    expect(result.reviewConfidence).toBeCloseTo(0.40, 3);
    expect(result.score).toBeLessThan(40);
  });

  it('missing budget evidence alone (totalBudget = 0) forces the 0.10 baseline and a −0.20 data-completeness penalty', () => {
    const result = computeConfidence({
      bti: zeroBudgetBTI,
      activation: baseActivation,
      eligibilitySummary: noReviewRequiredEligibility,
      totalRecords: 20,
      workforceKnown: true,
      reachMethod: 'identity_deduplication',
      hasHumanReview: false,
      eqsAvailable: true,
      eqwAvailable: true,
    });

    expect(result.budgetEvidenceConfidence).toBe(0.10);
    // dataCompleteness: 1.0 - 0 (review ratio) - 0.20 (no budget) = 0.80
    expect(result.dataCompleteness).toBeCloseTo(0.80, 3);
    expect(result.warnings.some((w) => w.includes('nessun importo budget rilevato'))).toBe(true);
  });

  it('no human review caps reviewConfidence at 0.40 and emits a warning', () => {
    const result = computeConfidence({
      bti: baseBTI,
      activation: baseActivation,
      eligibilitySummary: noReviewRequiredEligibility,
      totalRecords: 20,
      workforceKnown: true,
      hasHumanReview: false,
      eqsAvailable: true,
      eqwAvailable: true,
    });

    expect(result.reviewConfidence).toBe(0.40);
    expect(result.warnings.some((w) => w.includes('nessuna revisione da Advisor'))).toBe(true);
  });

  it('human review present raises reviewConfidence to 0.85 and no review warning is emitted', () => {
    const result = computeConfidence({
      bti: baseBTI,
      activation: baseActivation,
      eligibilitySummary: noReviewRequiredEligibility,
      totalRecords: 20,
      workforceKnown: true,
      hasHumanReview: true,
      eqsAvailable: true,
      eqwAvailable: true,
    });

    expect(result.reviewConfidence).toBe(0.85);
    expect(result.warnings.some((w) => w.includes('nessuna revisione da Advisor'))).toBe(false);
  });

  it('EQS unavailable (workforce known) applies exactly the documented -0.08 data-completeness penalty', () => {
    const withEqs = computeConfidence({
      bti: baseBTI, activation: baseActivation, eligibilitySummary: noReviewRequiredEligibility,
      totalRecords: 20, workforceKnown: true, hasHumanReview: true,
      eqsAvailable: true, eqwAvailable: true,
    });
    const withoutEqs = computeConfidence({
      bti: baseBTI, activation: baseActivation, eligibilitySummary: noReviewRequiredEligibility,
      totalRecords: 20, workforceKnown: true, hasHumanReview: true,
      eqsAvailable: false, eqwAvailable: true,
    });

    expect(withEqs.dataCompleteness - withoutEqs.dataCompleteness).toBeCloseTo(0.08, 6);
    expect(withoutEqs.warnings.some((w) => w.includes('EQ_s non calcolabile'))).toBe(true);
  });

  it('EQW unavailable applies exactly the documented -0.05 data-completeness penalty', () => {
    const withEqw = computeConfidence({
      bti: baseBTI, activation: baseActivation, eligibilitySummary: noReviewRequiredEligibility,
      totalRecords: 20, workforceKnown: true, hasHumanReview: true,
      eqsAvailable: true, eqwAvailable: true,
    });
    const withoutEqw = computeConfidence({
      bti: baseBTI, activation: baseActivation, eligibilitySummary: noReviewRequiredEligibility,
      totalRecords: 20, workforceKnown: true, hasHumanReview: true,
      eqsAvailable: true, eqwAvailable: false,
    });

    expect(withEqw.dataCompleteness - withoutEqw.dataCompleteness).toBeCloseTo(0.05, 6);
    expect(withoutEqw.warnings.some((w) => w.includes('EQ_w non calcolabile'))).toBe(true);
  });

  it('weak mapping: high review-required ratio compresses mappingConfidence toward its 0.20 floor', () => {
    const result = computeConfidence({
      bti: baseBTI, activation: baseActivation, eligibilitySummary: heavyReviewEligibility,
      totalRecords: 20, workforceKnown: true, hasHumanReview: true,
      eqsAvailable: true, eqwAvailable: true,
    });
    // reviewRatio = 8/20 = 0.40 -> mappingConfidence = max(0.20, 1 - 0.40*0.80) = max(0.20, 0.68) = 0.68
    expect(result.mappingConfidence).toBeCloseTo(0.68, 3);
  });

  it('partial data: workforce unknown + bounded reach method stack their penalties on dataCompleteness', () => {
    const result = computeConfidence({
      bti: baseBTI, activation: baseActivation, eligibilitySummary: noReviewRequiredEligibility,
      totalRecords: 20, workforceKnown: false, reachMethod: 'bounded_estimate',
      hasHumanReview: true, eqsAvailable: true, eqwAvailable: true,
    });
    // dataCompleteness: 1.0 - 0.40 (workforce unknown) - 0 (review ratio) - 0.10 (bounded reach) = 0.50
    expect(result.dataCompleteness).toBeCloseTo(0.50, 3);
    expect(result.warnings.some((w) => w.includes('workforce baseline non disponibile'))).toBe(true);
  });

  it('score is always clamped to the documented [0, 100] integer range', () => {
    const results = [
      computeConfidence({
        bti: zeroBudgetBTI, activation: baseActivation, eligibilitySummary: heavyReviewEligibility,
        totalRecords: 20, workforceKnown: false, reachMethod: 'none', hasHumanReview: false,
        eqsAvailable: false, eqwAvailable: false,
      }),
      computeConfidence({
        bti: baseBTI, activation: baseActivation, eligibilitySummary: noReviewRequiredEligibility,
        totalRecords: 20, workforceKnown: true, reachMethod: 'identity_deduplication', hasHumanReview: true,
        iuResults: makeIU([0.9, 0.9, 0.9]), eqsAvailable: true, eqwAvailable: true,
      }),
    ];
    for (const r of results) {
      expect(Number.isInteger(r.score)).toBe(true);
      expect(r.score).toBeGreaterThanOrEqual(0);
      expect(r.score).toBeLessThanOrEqual(100);
    }
  });
});
