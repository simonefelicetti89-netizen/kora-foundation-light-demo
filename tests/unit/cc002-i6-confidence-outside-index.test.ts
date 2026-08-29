/**
 * CC-002 / B-INV — Constitutional Invariant I6: Confidence external to the KORA
 * Index, permanent weight zero.
 *
 * SCOPE / WHAT THIS PROVES:
 *   Reading lib/kora-engine/kora-index-engine.ts directly (computeKoraIndex):
 *   the returned `.value` is computed ONLY from
 *     activationReach × weights.REACH + activationQuality × weights.QUALITY +
 *     distributionEquity × weights.EQUITY + budgetToHumanImpact × weights.BTI
 *   `confidenceScore` is accepted as a parameter but is used exclusively to
 *   populate the separate `.confidenceExternal` field on the result — never
 *   the weighted sum that produces `.value`.
 *
 *   This suite proves that NUMERICALLY, not just by reading the comment: given
 *   identical BTI/activation/equity/quality inputs, wildly different Confidence
 *   Score inputs (0.0 vs 1.0, and both current competing implementations'
 *   typical output ranges) produce byte-identical `.value`.
 *
 *   Per CC-002 scope: this does NOT choose between the two competing Confidence
 *   implementations (lib/kora-engine/confidence-engine.ts vs
 *   services/confidence-score/ConfidenceScoreService.ts — reserved for
 *   CC-004/D-A). It treats confidenceScore as an arbitrary number input,
 *   which is exactly how computeKoraIndex's own signature treats it.
 */

import { describe, it, expect } from 'vitest';
import { computeKoraIndex } from '@/lib/kora-engine/kora-index-engine';
import type { BTIResult, ActivationResult, EligibilitySummary } from '@/lib/kora-engine/types';

// Fixture pattern reused from tests/unit/equity-eqs.test.ts for consistency.
const zeroBTI: BTIResult = {
  totalBudget: 0, documentedBudget: 0, declaredBudget: 0,
  estimatedBudget: 0, nonValuedBudget: 0, deepActivationSpend: 0,
  economicReliefSpend: 0, blockedComplianceSpend: 0,
  activationDebt: 0, budgetEvidenceQuality: 0.5,
  btiScore: 42, warnings: [], trace: [],
};

function makeActivation(ar: number, mar: number): ActivationResult {
  return {
    activationReach:           ar,
    meaningfulActivationReach: mar,
    activeWorkers:             Math.round(ar * 100),
    meaningfullyActiveWorkers: Math.round(mar * 100),
    neverActivatedWorkers:     Math.round((1 - ar) * 100),
    concentrationTopShare:     0,
    bottomFiftyShare:          0.30,
    departmentGaps:            {},
    siteGaps:                  {},
    safeguardStatus:           ar >= 0.40 && mar >= 0.30 ? 'CLEAR' : 'WARNING',
    warnings:                  [],
  };
}

const UNIFORM_PILLARS = { LIFE: 20, GROWTH: 20, CONNECTION: 20, IMPACT: 20, LEGACY: 20 };

const eligibilitySummary: EligibilitySummary = {
  eligibleCount: 5, limitedCount: 0, blockedCount: 0, reviewRequiredCount: 0, totalCount: 5,
};

function computeWithConfidence(confidenceScore: number) {
  return computeKoraIndex({
    bti: zeroBTI,
    activation: makeActivation(0.60, 0.40),
    eligibilitySummary,
    pillarDistribution: UNIFORM_PILLARS,
    deptRates: null,
    confidenceScore,
  });
}

describe('I6 — Confidence external to KORA Index, weight zero (B-INV / CC-002)', () => {
  it('same inputs, Confidence 0.0 vs 1.0 → identical Index value', () => {
    const low  = computeWithConfidence(0.0);
    const high = computeWithConfidence(1.0);

    expect(low.value).toBe(high.value);
    // Sanity: the two runs really did receive different Confidence, so this
    // isn't a vacuously-true test of two identical calls.
    expect(low.confidenceExternal).not.toBe(high.confidenceExternal);
    expect(low.confidenceExternal).toBe(0);
    expect(high.confidenceExternal).toBe(1);
  });

  it('same inputs, Confidence spans a realistic range (0.12 / 0.47 / 0.83 / 0.99) → identical Index value for all', () => {
    const scores = [0.12, 0.47, 0.83, 0.99];
    const results = scores.map((s) => computeWithConfidence(s));

    const distinctIndexValues = new Set(results.map((r) => r.value));
    expect(distinctIndexValues.size).toBe(1);

    // Confidence itself must have actually varied across runs.
    const distinctConfidenceValues = new Set(results.map((r) => r.confidenceExternal));
    expect(distinctConfidenceValues.size).toBe(scores.length);
  });

  it('omitting confidenceScore entirely (undefined) produces the same Index value as passing any explicit score', () => {
    const withDefault = computeKoraIndex({
      bti: zeroBTI,
      activation: makeActivation(0.60, 0.40),
      eligibilitySummary,
      pillarDistribution: UNIFORM_PILLARS,
      deptRates: null,
      // confidenceScore omitted — defaults to 0 per the function signature.
    });
    const withExplicitZero = computeWithConfidence(0);
    const withExplicitHigh = computeWithConfidence(0.95);

    expect(withDefault.value).toBe(withExplicitZero.value);
    expect(withDefault.value).toBe(withExplicitHigh.value);
  });

  it('Index value is fully reconstructible from the four macroblocks × weights alone, with no fifth (Confidence) term', () => {
    const result = computeWithConfidence(0.5);
    const { macroblocks, weights } = result;

    const reconstructed = Math.max(
      0,
      Math.min(
        100,
        Math.round(
          (macroblocks.activationReach * weights.REACH +
            macroblocks.activationQuality * weights.QUALITY +
            macroblocks.distributionEquity * weights.EQUITY +
            macroblocks.budgetToHumanImpact * weights.BTI) *
            100,
        ) / 100,
      ),
    );

    expect(result.value).toBe(reconstructed);
  });

  // ── Adversarial check (I6 acceptance criteria) ──────────────────────────────
  // This test must FAIL if a future change adds Confidence into the weighted
  // sum. It's a live demonstration, not a static assertion: it recomputes the
  // Index with two very different Confidence inputs and checks the values are
  // still equal. If someone adds `+ confidenceScore * someWeight` to
  // computeKoraIndex's rawValue, this test starts failing immediately.
  it('ADVERSARIAL — this test itself fails if Confidence is ever added to the weighted sum', () => {
    const a = computeWithConfidence(0.01);
    const b = computeWithConfidence(0.99);
    expect(a.value).toEqual(b.value);
  });
});
