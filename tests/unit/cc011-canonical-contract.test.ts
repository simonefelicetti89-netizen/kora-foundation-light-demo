/**
 * CC-011 / B-CONF — canonical Confidence contract (scale, banding, legacy
 * evidence_quality compatibility mapping, company-visible label).
 *
 * SCOPE: proves the CC-011 resume implementation did exactly what the human
 * decision authorized — centralized scale/banding, made the legacy
 * evidence_quality mapping explicit, corrected the company-visible label —
 * and nothing more. Does NOT re-run the full adversarial campaign (CC-012).
 *
 * Persistence itself talks to Supabase and isn't unit-testable without a live
 * client; the checks against lib/live/persistence.ts below are static source
 * analysis (same technique as tests/unit/ui-governance.test.ts), proving the
 * file consumes the canonical helpers and no longer contains an inline
 * threshold or an unlabeled reinterpretation of budgetEvidenceConfidence.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { computeConfidence, normalizeConfidenceScore, getConfidenceBand } from '@/lib/kora-engine/confidence-engine';
import type { BTIResult, ActivationResult, EligibilitySummary } from '@/lib/kora-engine/types';

const root = resolve(process.cwd());
function src(relPath: string): string {
  return readFileSync(resolve(root, relPath), 'utf-8');
}

describe('CC-011 — normalizeConfidenceScore (0–100 → 0–1)', () => {
  it('maps representative values correctly', () => {
    expect(normalizeConfidenceScore(0)).toBe(0);
    expect(normalizeConfidenceScore(100)).toBe(1);
    expect(normalizeConfidenceScore(70)).toBe(0.70);
    expect(normalizeConfidenceScore(40)).toBeCloseTo(0.40, 6);
    expect(normalizeConfidenceScore(94)).toBeCloseTo(0.94, 6);
  });

  it('clamps out-of-range inputs (defensive, does not change Engine A which already clamps to [0,100])', () => {
    expect(normalizeConfidenceScore(-5)).toBe(0);
    expect(normalizeConfidenceScore(150)).toBe(1);
  });
});

describe('CC-011 — getConfidenceBand (canonical live thresholds: 0.70 high / 0.40 medium / else low)', () => {
  it('bands high at and above 0.70', () => {
    expect(getConfidenceBand(0.70)).toBe('high');
    expect(getConfidenceBand(0.94)).toBe('high');
    expect(getConfidenceBand(1.0)).toBe('high');
  });

  it('bands medium in [0.40, 0.70)', () => {
    expect(getConfidenceBand(0.40)).toBe('medium');
    expect(getConfidenceBand(0.69)).toBe('medium');
  });

  it('bands low below 0.40', () => {
    expect(getConfidenceBand(0.39)).toBe('low');
    expect(getConfidenceBand(0)).toBe('low');
  });

  it('0.40–0.449 bands medium under the canonical 0.40 threshold — Service B\'s dormant 0.45 threshold would say low here; canonical must not', () => {
    expect(getConfidenceBand(0.44)).toBe('medium');
  });
});

describe('CC-011 — Engine A numeric formula unchanged by the canonical-contract refactor', () => {
  const bti: BTIResult = {
    totalBudget: 100000, documentedBudget: 80000, declaredBudget: 20000,
    estimatedBudget: 0, nonValuedBudget: 0, deepActivationSpend: 60000,
    economicReliefSpend: 20000, blockedComplianceSpend: 0,
    activationDebt: 0, budgetEvidenceQuality: 0.85,
    btiScore: 70, warnings: [], trace: [],
  };
  const activation: ActivationResult = {
    activationReach: 0.60, meaningfulActivationReach: 0.45,
    activeWorkers: 60, meaningfullyActiveWorkers: 45, neverActivatedWorkers: 40,
    concentrationTopShare: 0.20, bottomFiftyShare: 0.30,
    departmentGaps: {}, siteGaps: {}, safeguardStatus: 'CLEAR', warnings: [],
  };
  const eligibilitySummary: EligibilitySummary = {
    eligibleCount: 20, limitedCount: 0, blockedCount: 0, reviewRequiredCount: 0, totalCount: 20,
  };

  it('reproduces the same score (94) as the pre-refactor characterization baseline', () => {
    const result = computeConfidence({
      bti, activation, eligibilitySummary,
      totalRecords: 20, workforceKnown: true, reachMethod: 'identity_deduplication',
      hasHumanReview: true, eqsAvailable: true, eqwAvailable: true,
      iuResults: [0.9, 0.9, 0.9, 0.9, 0.9].map((ev, i) => ({
        record_id: `r${i}`, source_row_id: `s${i}`,
        action_family: 'family_and_care' as const, event_nature: 'consumed_service' as const,
        eligibility: 'eligible' as const, primary_pillar: 'LIFE',
        pillar_distribution: { LIFE: 1 }, normalized_magnitude_nm: 1, base_contribution_bc: 1,
        completeness_quality_cq: 0.9, evidence_verification_ev: ev,
        continuity_factor_cf: 1, anti_gaming_factor_agf: 1,
        impact_units_total: 10, impact_units_by_pillar: { LIFE: 10 },
        computed: true, blocked: false, limited: false, review_required: false,
        exclusion_reason: null, explanation: '', formula_trace: [],
        methodology_version: 'KORA Index v1.0', calibration_status: 'pre_empirical_calibration' as const,
      })),
    });
    expect(result.score).toBe(94);
    expect(result.budgetEvidenceConfidence).toBeCloseTo(0.85, 3);
  });

  it('score → canonical normalize → canonical band round-trips consistently for a known case', () => {
    const result = computeConfidence({
      bti, activation, eligibilitySummary,
      totalRecords: 20, workforceKnown: true, hasHumanReview: true,
      eqsAvailable: true, eqwAvailable: true,
    });
    const normalized = normalizeConfidenceScore(result.score);
    const band = getConfidenceBand(normalized);
    expect(normalized).toBeCloseTo(result.score / 100, 6);
    expect(['high', 'medium', 'low']).toContain(band);
  });
});

describe('CC-011 — persistence.ts consumes the canonical contract, owns no independent methodology', () => {
  const persistence = src('lib/live/persistence.ts');

  it('imports the canonical scale/banding helpers from confidence-engine', () => {
    expect(persistence).toMatch(/import\s*\{[^}]*normalizeConfidenceScore[^}]*getConfidenceBand[^}]*\}\s*from\s*['"]@\/lib\/kora-engine\/confidence-engine['"]/);
  });

  it('uses normalizeConfidenceScore rather than an inline /100 division for the persisted scale', () => {
    expect(persistence).toContain('normalizeConfidenceScore(result.confidence.score)');
    // The old inline conversion must be gone.
    expect(persistence).not.toMatch(/confidence\.score\s*\/\s*100/);
  });

  it('uses getConfidenceBand rather than an inline threshold for confidence_level', () => {
    expect(persistence).toContain('getConfidenceBand(cs01)');
    // The old inline threshold must be gone.
    expect(persistence).not.toMatch(/cs01\s*>=\s*0\.70\s*\?\s*'high'\s*:\s*cs01\s*>=\s*0\.40/);
  });

  it('the legacy evidence_quality mapping is explicit, named, and documented — not a silent reinterpretation', () => {
    expect(persistence).toContain('legacyEvidenceQualityColumn');
    expect(persistence).toMatch(/legacy[\s\S]{0,400}budget evidence quality/i);
    // Still sourced from the same field as before — no new formula.
    expect(persistence).toContain('result.confidence.budgetEvidenceConfidence');
  });
});

describe('CC-011 — company-visible label accurately describes the legacy evidence_quality field', () => {
  const breakdown = src('components/kora-index/ConfidenceBreakdown.tsx');

  it('no longer labels the field as generic "Qualità Evidenze"', () => {
    expect(breakdown).not.toContain('"Qualità Evidenze"');
  });

  it('labels it explicitly as budget evidence quality', () => {
    expect(breakdown).toContain('Qualità evidenze budget');
    expect(breakdown).toMatch(/label="Qualità evidenze budget"\s*value=\{record\.evidence_quality\}/);
  });
});
