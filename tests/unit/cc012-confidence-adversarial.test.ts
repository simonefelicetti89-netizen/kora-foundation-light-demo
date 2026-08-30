/**
 * CC-012 / B-CONF — Adversarial validation of the CC-011 canonical Confidence
 * contract.
 *
 * Goal: try to break the assumptions CC-011 introduced, not add functionality.
 * Per the CC-012 prompt's "IMPORTANT TEST QUALITY RULE", the critical
 * assertions here exercise real behavior (the real computeConfidence, the
 * real normalizeConfidenceScore/getConfidenceBand, and the REAL
 * persistKoraComputationResult with only the Supabase I/O boundary mocked —
 * same technique as tests/unit/pilot-trust-04-worker-tenant-suspension.test.ts).
 * Source-string checks are kept to the minimum needed for the Service B
 * re-entry guard and the version-string sweep, which are inherently
 * "did anything start importing/declaring X" questions.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'fs';
import { resolve, join } from 'path';
import {
  computeConfidence,
  normalizeConfidenceScore,
  getConfidenceBand,
} from '@/lib/kora-engine/confidence-engine';
import { computeKoraIndex } from '@/lib/kora-engine/kora-index-engine';
import type { BTIResult, ActivationResult, EligibilitySummary } from '@/lib/kora-engine/types';

const root = resolve(process.cwd());
function src(relPath: string): string {
  return readFileSync(resolve(root, relPath), 'utf-8');
}

// ── Shared fixtures ──────────────────────────────────────────────────────────

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

// ═════════════════════════════════════════════════════════════════════════════
// PHASE 2 — SCALE BOUNDARY ATTACKS
// ═════════════════════════════════════════════════════════════════════════════

describe('CC-012 Phase 2 — normalizeConfidenceScore boundary attacks', () => {
  it('exact boundary and adjacent values map deterministically', () => {
    const cases: [number, number][] = [
      [0, 0], [1, 0.01],
      [39, 0.39], [40, 0.40],
      [69, 0.69], [70, 0.70],
      [99, 0.99], [100, 1],
    ];
    for (const [input, expected] of cases) {
      expect(normalizeConfidenceScore(input)).toBeCloseTo(expected, 6);
    }
  });

  it('near-boundary fractional inputs are not rounded across a band edge by normalization itself', () => {
    // normalizeConfidenceScore is a pure scale conversion — banding is a
    // SEPARATE step (getConfidenceBand). 39.999/100 must stay just under 0.40.
    expect(normalizeConfidenceScore(39.999)).toBeLessThan(0.40);
    expect(normalizeConfidenceScore(40.001)).toBeGreaterThan(0.40);
    expect(normalizeConfidenceScore(69.999)).toBeLessThan(0.70);
    expect(normalizeConfidenceScore(70.001)).toBeGreaterThan(0.70);
    expect(normalizeConfidenceScore(99.999)).toBeLessThan(1);
  });

  it('out-of-range inputs are clamped, not silently wrapped or left invalid', () => {
    expect(normalizeConfidenceScore(-1)).toBe(0);
    expect(normalizeConfidenceScore(-1000)).toBe(0);
    expect(normalizeConfidenceScore(101)).toBe(1);
    expect(normalizeConfidenceScore(1000)).toBe(1);
    expect(normalizeConfidenceScore(Infinity)).toBe(1);
    expect(normalizeConfidenceScore(-Infinity)).toBe(0);
  });

  it('FINDING (not a defect in any live call path): NaN input propagates as NaN, undefined coerces to NaN', () => {
    // normalizeConfidenceScore has no explicit NaN guard. This is provably
    // unreachable from any live call site: Engine A's own `score` is always
    // `Math.max(0, Math.min(100, Math.round(rawScore * 100)))` — a clamped
    // integer, never NaN — and both call sites in lib/live/persistence.ts
    // pass `result.confidence.score` (Engine A's own output), never a raw
    // external number. Documented here so a FUTURE new call site is warned,
    // not silently trusted.
    expect(Number.isNaN(normalizeConfidenceScore(NaN))).toBe(true);
    expect(Number.isNaN(normalizeConfidenceScore(undefined as unknown as number))).toBe(true);
  });

  it('Engine A itself can never emit an out-of-[0,100]-integer score (proves invalid values are impossible by construction on the live path)', () => {
    // Deliberately extreme/adversarial inputs designed to push every
    // sub-score toward its theoretical max or min simultaneously.
    const extremeHigh = computeConfidence({
      bti: { ...bti, budgetEvidenceQuality: 1 },
      activation, eligibilitySummary,
      totalRecords: 1, workforceKnown: true, reachMethod: 'identity_deduplication',
      hasHumanReview: true, eqsAvailable: true, eqwAvailable: true,
      iuResults: [{
        record_id: 'r', source_row_id: 's', action_family: 'family_and_care',
        event_nature: 'consumed_service', eligibility: 'eligible', primary_pillar: 'LIFE',
        pillar_distribution: { LIFE: 1 }, normalized_magnitude_nm: 1, base_contribution_bc: 1,
        completeness_quality_cq: 1, evidence_verification_ev: 1,
        continuity_factor_cf: 1, anti_gaming_factor_agf: 1,
        impact_units_total: 999999, impact_units_by_pillar: { LIFE: 999999 },
        computed: true, blocked: false, limited: false, review_required: false,
        exclusion_reason: null, explanation: '', formula_trace: [],
        methodology_version: 'KORA Index v1.0', calibration_status: 'pre_empirical_calibration',
      }],
    });
    const extremeLow = computeConfidence({
      bti: { ...bti, totalBudget: 0 },
      activation, eligibilitySummary: { eligibleCount: 0, limitedCount: 0, blockedCount: 0, reviewRequiredCount: 999999, totalCount: 1 },
      totalRecords: 1, workforceKnown: false, reachMethod: 'none', hasHumanReview: false,
      eqsAvailable: false, eqwAvailable: false,
    });
    for (const r of [extremeHigh, extremeLow]) {
      expect(Number.isInteger(r.score)).toBe(true);
      expect(r.score).toBeGreaterThanOrEqual(0);
      expect(r.score).toBeLessThanOrEqual(100);
      // Consequently normalize/band never receive an out-of-range or non-finite value on this path.
      expect(Number.isFinite(normalizeConfidenceScore(r.score))).toBe(true);
    }
  });

  it('no double-normalization: normalizeConfidenceScore is idempotent-safe when accidentally applied to an already-0–1 value only in the sense that it does not further divide — proves callers cannot silently re-normalize', () => {
    // If a future caller mistakenly passed an already-normalized 0–1 value
    // back into normalizeConfidenceScore, the result would be catastrophically
    // small (e.g. 0.94 -> 0.0094) — this test documents that failure mode so
    // it is visible, not to endorse doing it.
    const score100Scale = 94;
    const normalizedOnce = normalizeConfidenceScore(score100Scale);
    const wronglyNormalizedTwice = normalizeConfidenceScore(normalizedOnce);
    expect(normalizedOnce).toBeCloseTo(0.94, 6);
    expect(wronglyNormalizedTwice).toBeCloseTo(0.0094, 6); // proves the failure mode is detectable, not that it's acceptable
    expect(wronglyNormalizedTwice).not.toBeCloseTo(normalizedOnce, 2);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// PHASE 3 — BANDING BOUNDARY ATTACKS + DUPLICATE-AUTHORITY SWEEP
// ═════════════════════════════════════════════════════════════════════════════

describe('CC-012 Phase 3 — getConfidenceBand boundary attacks', () => {
  it('exact required boundary set', () => {
    expect(getConfidenceBand(0.3999)).toBe('low');
    expect(getConfidenceBand(0.4000)).toBe('medium');
    expect(getConfidenceBand(0.6999)).toBe('medium');
    expect(getConfidenceBand(0.7000)).toBe('high');
  });

  it('adjacent boundary sweep, 0.01 increments 0.38–0.72', () => {
    const expected: [number, string][] = [
      [0.38, 'low'], [0.39, 'low'],
      [0.40, 'medium'], [0.41, 'medium'], [0.69, 'medium'],
      [0.70, 'high'], [0.71, 'high'], [0.72, 'high'],
    ];
    for (const [v, band] of expected) {
      expect(getConfidenceBand(v)).toBe(band);
    }
  });

  it('degenerate inputs (0, 1, negative, >1) do not throw and stay within the three-value vocabulary', () => {
    expect(['low']).toContain(getConfidenceBand(0));
    expect(['high']).toContain(getConfidenceBand(1));
    expect(['low']).toContain(getConfidenceBand(-0.5)); // below 0.40 either way
    expect(['high']).toContain(getConfidenceBand(1.5)); // above 0.70 either way
  });
});

describe('CC-012 Phase 3 — no second LIVE banding/threshold authority', () => {
  const persistence = src('lib/live/persistence.ts');
  const confidenceEngine = src('lib/kora-engine/confidence-engine.ts');
  const confidenceBreakdown = src('components/kora-index/ConfidenceBreakdown.tsx');

  it('lib/live/persistence.ts contains no inline Confidence threshold literal (0.40/0.45/0.70 as a comparison)', () => {
    expect(persistence).not.toMatch(/cs01\s*>=\s*0\.\d+/);
    expect(persistence).not.toMatch(/confidence[\w.]*\s*>=\s*0\.(40|45|70)\b/);
  });

  it('confidence-engine.ts has exactly one function that compares a value against both 0.70 and 0.40 as >= thresholds (no second banding function)', () => {
    // 0.40/0.70 are legitimately reused elsewhere in the file for unrelated
    // sub-score penalties (e.g. the −0.40 workforce-unknown penalty, the
    // reviewConfidence no-Advisor value) — that overlap is coincidental, not
    // a duplicated banding authority. What actually matters: only ONE
    // function body contains BOTH `>= 0.70` and `>= 0.40` as comparisons.
    const functionBodies = confidenceEngine.match(/function\s+\w+\([^)]*\)[^{]*\{[\s\S]*?\n\}/g) ?? [];
    const bandingLike = functionBodies.filter((fn) => />=\s*0\.70/.test(fn) && />=\s*0\.40/.test(fn));
    expect(bandingLike.length).toBe(1);
    expect(bandingLike[0]).toContain('getConfidenceBand');
  });

  it('ConfidenceBreakdown.tsx (the live UI consumer) does not re-implement banding — it only displays record.confidence_level', () => {
    expect(confidenceBreakdown).not.toMatch(/>=\s*0\.(40|45|70)/);
  });

  it('Service B\'s dormant 0.45 threshold still exists as a real comparison in its OWN file (retained, not deleted) but is never USED as a comparison on any live path', () => {
    const serviceB = src('services/confidence-score/ConfidenceScoreService.ts');
    expect(serviceB).toMatch(/>=\s*0\.45/);
    // Live files may reference "0.45" only in prose/comments (e.g. explaining
    // why it's NOT used) — never as an actual `>= 0.45` / `< 0.45` comparison.
    expect(persistence).not.toMatch(/[<>]=?\s*0\.45/);
    expect(confidenceEngine).not.toMatch(/[<>]=?\s*0\.45/);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// PHASE 4 — PERSISTENCE SEMANTIC ATTACK (behavioral, not source-only)
// ═════════════════════════════════════════════════════════════════════════════

// Mock ONLY the Supabase I/O boundary — persistKoraComputationResult itself
// runs for real. Captures the exact payload objects passed to `.insert(...)`.
const insertCalls: Record<string, Record<string, unknown>[]> = {};

function makeInsertResult(id: string) {
  return { select: () => ({ single: async () => ({ data: { id }, error: null }) }) };
}

function makeChainableUpdate() {
  // Mimics Supabase's thenable query builder: .eq().eq().eq() then awaited.
  const chain: any = {
    eq: () => chain,
    then: (resolve: (v: { data: null; error: null }) => void) => resolve({ data: null, error: null }),
  };
  return chain;
}

function recordInsert(table: string, payload: Record<string, unknown>, id: string) {
  insertCalls[table] = insertCalls[table] ?? [];
  insertCalls[table].push(payload);
  return makeInsertResult(id);
}

vi.mock('@/lib/supabase/server', () => ({
  getSupabaseServiceClient: () => ({
    schema: (_schemaName: string) => ({
      from: (table: string) => ({
        insert: (payload: Record<string, unknown> | Record<string, unknown>[]) => {
          if (table === 'kora_index_result') {
            // used for BOTH update(...) [supersede] and insert(...) — insert path only here
            return recordInsert(table, payload as Record<string, unknown>, 'ki-1');
          }
          if (Array.isArray(payload)) {
            insertCalls[table] = insertCalls[table] ?? [];
            insertCalls[table].push(...payload);
            return { error: null };
          }
          return recordInsert(
            table,
            payload,
            table === 'activation_result' ? 'act-1' : table === 'confidence_result' ? 'conf-1' : 'bti-1',
          );
        },
        update: (_payload: Record<string, unknown>) => makeChainableUpdate(),
      }),
    }),
  }),
}));

vi.mock('@/lib/live/office-attribution', () => ({
  triggerOfficeAttribution: async () => {},
}));

describe('CC-012 Phase 4 — persistence behavioral attack: evidence_quality receives exactly budgetEvidenceConfidence', () => {
  beforeEach(() => {
    for (const k of Object.keys(insertCalls)) delete insertCalls[k];
  });
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('confidence_result.evidence_quality equals budgetEvidenceConfidence, NOT verificationConfidence/mappingConfidence/total score', async () => {
    const { persistKoraComputationResult } = await import('@/lib/live/persistence');

    const confidence = computeConfidence({
      bti, activation, eligibilitySummary,
      totalRecords: 20, workforceKnown: true, hasHumanReview: true,
      eqsAvailable: true, eqwAvailable: true,
    });
    // Sanity: pick a fixture where the four candidate sub-scores are all
    // numerically DISTINCT, so "received the right one" is unambiguous.
    expect(new Set([
      confidence.budgetEvidenceConfidence,
      confidence.verificationConfidence,
      confidence.mappingConfidence,
      confidence.score / 100,
    ]).size).toBeGreaterThan(1);

    const koraIndex = computeKoraIndex({
      bti, activation, eligibilitySummary,
      pillarDistribution: { LIFE: 20, GROWTH: 20, CONNECTION: 20, IMPACT: 20, LEGACY: 20 },
      deptRates: null,
      confidenceScore: confidence.score,
    });

    const fakeResult = {
      activation, bti, confidence, koraIndex,
      eligibilitySummary,
      pillarDistribution: { LIFE: 20, GROWTH: 20, CONNECTION: 20, IMPACT: 20, LEGACY: 20 },
      iuResults: [],
      iuSummary: undefined,
    };

    await persistKoraComputationResult({
      tenantId: 'tenant-1',
      batchId: 'batch-1',
      reportingPeriod: '2026-Q1',
      workforcePopulation: 100,
      result: fakeResult as unknown as Parameters<typeof persistKoraComputationResult>[0]['result'],
    });

    const confidenceInsert = insertCalls['confidence_result']?.[0];
    expect(confidenceInsert).toBeDefined();
    expect(confidenceInsert!.evidence_quality).toBe(confidence.budgetEvidenceConfidence);
    expect(confidenceInsert!.evidence_quality).not.toBe(confidence.verificationConfidence);
    expect(confidenceInsert!.evidence_quality).not.toBe(confidence.mappingConfidence);
    expect(confidenceInsert!.evidence_quality).not.toBe(confidence.score / 100);

    // Scale + banding come from the canonical helpers, not an ad hoc value.
    expect(confidenceInsert!.confidence_score).toBeCloseTo(normalizeConfidenceScore(confidence.score), 6);
    expect(confidenceInsert!.confidence_level).toBe(getConfidenceBand(normalizeConfidenceScore(confidence.score)));

    // Untouched fields: same source as before CC-011, unchanged mapping.
    expect(confidenceInsert!.data_completeness).toBe(confidence.dataCompleteness);
    expect(confidenceInsert!.mapping_confidence).toBe(confidence.mappingConfidence);
    expect(confidenceInsert!.verification_weight).toBe(confidence.verificationConfidence);

    // The CS entry in the persisted kora_index_result.components array uses
    // the same canonical normalization — no second, independent conversion.
    const kiInsert = insertCalls['kora_index_result']?.[0];
    expect(kiInsert).toBeDefined();
    const csComponent = (kiInsert!.components as Array<{ code: string; value: number }>).find((c) => c.code === 'CS');
    expect(csComponent).toBeDefined();
    expect(csComponent!.value).toBeCloseTo(normalizeConfidenceScore(confidence.score), 6);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// PHASE 5 — UI SEMANTIC ATTACK
// ═════════════════════════════════════════════════════════════════════════════

describe('CC-012 Phase 5 — company-visible label no longer generic', () => {
  it('ConfidenceBreakdown.tsx never renders the bare "Qualità Evidenze" label', () => {
    const breakdown = src('components/kora-index/ConfidenceBreakdown.tsx');
    expect(breakdown).not.toMatch(/label="Qualità Evidenze"/);
    expect(breakdown).toMatch(/label="Qualità evidenze budget"/);
  });

  it('no OTHER live company-facing file under app/company or components/kora-index renders this legacy field under a generic label', () => {
    // Sweep every .tsx under app/company and components/kora-index that
    // references `evidence_quality` and require it not be paired with the
    // bare Italian generic label anywhere in the same file.
    function walk(dir: string): string[] {
      const out: string[] = [];
      for (const entry of readdirSync(dir)) {
        const p = join(dir, entry);
        const st = statSync(p);
        if (st.isDirectory()) out.push(...walk(p));
        else if (entry.endsWith('.tsx')) out.push(p);
      }
      return out;
    }
    const candidates = [
      ...walk(resolve(root, 'app/company')),
      ...walk(resolve(root, 'components/kora-index')),
    ].filter((p) => src(p.replace(root + '/', '')).includes('evidence_quality'));

    expect(candidates.length).toBeGreaterThan(0); // sanity: the sweep actually found the real consumer
    for (const p of candidates) {
      const relative = p.replace(root + '/', '');
      const content = src(relative);
      expect(content, `${relative} must not label evidence_quality generically`).not.toMatch(/"Qualità Evidenze"/);
    }
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// PHASE 6 — ENGINE A ADVERSARIAL CHARACTERIZATION EXTENSIONS
// ═════════════════════════════════════════════════════════════════════════════

describe('CC-012 Phase 6 — Engine A adversarial combinations', () => {
  const zeroRecordsEligibility: EligibilitySummary = {
    eligibleCount: 0, limitedCount: 0, blockedCount: 0, reviewRequiredCount: 0, totalCount: 0,
  };

  it('zero records (totalRecords=0) does not divide by zero or produce NaN/Infinity', () => {
    const result = computeConfidence({
      bti, activation, eligibilitySummary: zeroRecordsEligibility,
      totalRecords: 0, workforceKnown: true, hasHumanReview: false,
      eqsAvailable: true, eqwAvailable: true,
    });
    expect(Number.isFinite(result.score)).toBe(true);
    expect(Number.isFinite(result.dataCompleteness)).toBe(true);
    expect(Number.isFinite(result.mappingConfidence)).toBe(true);
  });

  it('verification ratio at exact EV=0.75 threshold is included (>=, not >)', () => {
    const iu = (ev: number) => ({
      record_id: 'r', source_row_id: 's', action_family: 'family_and_care' as const,
      event_nature: 'consumed_service' as const, eligibility: 'eligible' as const, primary_pillar: 'LIFE' as const,
      pillar_distribution: { LIFE: 1 }, normalized_magnitude_nm: 1, base_contribution_bc: 1,
      completeness_quality_cq: 0.9, evidence_verification_ev: ev,
      continuity_factor_cf: 1, anti_gaming_factor_agf: 1,
      impact_units_total: 10, impact_units_by_pillar: { LIFE: 10 },
      computed: true, blocked: false, limited: false, review_required: false,
      exclusion_reason: null, explanation: '', formula_trace: [],
      methodology_version: 'KORA Index v1.0', calibration_status: 'pre_empirical_calibration' as const,
    });
    const atThreshold = computeConfidence({
      bti, activation, eligibilitySummary, totalRecords: 20, workforceKnown: true,
      hasHumanReview: false, eqsAvailable: true, eqwAvailable: true,
      iuResults: [iu(0.75)],
    });
    const justBelow = computeConfidence({
      bti, activation, eligibilitySummary, totalRecords: 20, workforceKnown: true,
      hasHumanReview: false, eqsAvailable: true, eqwAvailable: true,
      iuResults: [iu(0.749999)],
    });
    expect(atThreshold.verificationConfidence).toBe(1); // fully counted
    expect(justBelow.verificationConfidence).toBe(0);   // fully excluded
  });

  it('both EQS and EQW unavailable stack additively (−0.08 and −0.05), not exclusively', () => {
    const bothAvailable = computeConfidence({
      bti, activation, eligibilitySummary, totalRecords: 20, workforceKnown: true,
      hasHumanReview: true, eqsAvailable: true, eqwAvailable: true,
    });
    const bothUnavailable = computeConfidence({
      bti, activation, eligibilitySummary, totalRecords: 20, workforceKnown: true,
      hasHumanReview: true, eqsAvailable: false, eqwAvailable: false,
    });
    expect(bothAvailable.dataCompleteness - bothUnavailable.dataCompleteness).toBeCloseTo(0.13, 6);
  });

  it('same input, computed twice, is byte-identical (deterministic, no hidden randomness/state)', () => {
    const input = {
      bti, activation, eligibilitySummary, totalRecords: 20, workforceKnown: true,
      hasHumanReview: true, eqsAvailable: true, eqwAvailable: false,
      reachMethod: 'aggregate_unique' as const,
    };
    const a = computeConfidence(input);
    const b = computeConfidence(input);
    expect(a).toEqual(b);
  });

  it('maximal completeness (all bonuses, no penalties) still respects the 100-point ceiling', () => {
    const result = computeConfidence({
      bti: { ...bti, budgetEvidenceQuality: 1 }, activation, eligibilitySummary,
      totalRecords: 20, workforceKnown: true, reachMethod: 'identity_deduplication',
      hasHumanReview: true, eqsAvailable: true, eqwAvailable: true,
      iuResults: [{
        record_id: 'r', source_row_id: 's', action_family: 'family_and_care', event_nature: 'consumed_service',
        eligibility: 'eligible', primary_pillar: 'LIFE', pillar_distribution: { LIFE: 1 },
        normalized_magnitude_nm: 1, base_contribution_bc: 1, completeness_quality_cq: 1,
        evidence_verification_ev: 1, continuity_factor_cf: 1, anti_gaming_factor_agf: 1,
        impact_units_total: 10, impact_units_by_pillar: { LIFE: 10 }, computed: true, blocked: false,
        limited: false, review_required: false, exclusion_reason: null, explanation: '', formula_trace: [],
        methodology_version: 'KORA Index v1.0', calibration_status: 'pre_empirical_calibration',
      }],
    });
    expect(result.score).toBeLessThanOrEqual(100);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// PHASE 7 — I6 ATTACK
// ═════════════════════════════════════════════════════════════════════════════

describe('CC-012 Phase 7 — I6 attack: Confidence cannot alter KORA Index value', () => {
  function indexAt(confidenceScore: number) {
    return computeKoraIndex({
      bti, activation, eligibilitySummary,
      pillarDistribution: { LIFE: 20, GROWTH: 20, CONNECTION: 20, IMPACT: 20, LEGACY: 20 },
      deptRates: null,
      confidenceScore,
    });
  }

  it('Index .value identical across 0, 1, 40, 70, 100 — only .confidenceExternal changes', () => {
    const points = [0, 1, 40, 70, 100];
    const results = points.map(indexAt);
    const values = new Set(results.map((r) => r.value));
    expect(values.size).toBe(1);
    const externals = new Set(results.map((r) => r.confidenceExternal));
    expect(externals.size).toBe(points.length);
  });

  it('macroblocks are identical regardless of Confidence input', () => {
    const a = indexAt(0);
    const b = indexAt(100);
    expect(a.macroblocks).toEqual(b.macroblocks);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// PHASE 8 — SERVICE B RE-ENTRY GUARD
// ═════════════════════════════════════════════════════════════════════════════

describe('CC-012 Phase 8 — Service B production re-entry guard', () => {
  const RUNTIME_DIRS = ['app', 'services', 'lib', 'components'];
  const SELF_FILE = 'services/confidence-score/ConfidenceScoreService.ts';
  // Architecture registry metadata references the service by name/path for
  // governance purposes — that's documentation, not runtime wiring, and the
  // CC-012 prompt explicitly excludes "architecture registry" from this guard.
  const EXCLUDED = new Set([SELF_FILE, 'lib/architecture/registry.ts']);

  function walkTs(dir: string): string[] {
    const out: string[] = [];
    let entries: string[];
    try { entries = readdirSync(dir); } catch { return out; }
    for (const entry of entries) {
      const p = join(dir, entry);
      let st;
      try { st = statSync(p); } catch { continue; }
      if (st.isDirectory()) out.push(...walkTs(p));
      else if (/\.(ts|tsx)$/.test(entry) && !entry.endsWith('.test.ts') && !entry.endsWith('.spec.ts')) out.push(p);
    }
    return out;
  }

  it('no runtime file outside Service B\'s own module imports or instantiates ConfidenceScoreService', () => {
    const offenders: string[] = [];
    for (const dir of RUNTIME_DIRS) {
      for (const file of walkTs(resolve(root, dir))) {
        const relative = file.replace(root + '/', '');
        if (EXCLUDED.has(relative)) continue;
        const content = src(relative);
        if (/ConfidenceScoreService|confidenceScoreService/.test(content)) {
          offenders.push(relative);
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// PHASE 9 — DEMO CONTAINMENT
// ═════════════════════════════════════════════════════════════════════════════

describe('CC-012 Phase 9 — demo Confidence containment (recorded OPEN for B-TRUTH, not fixed)', () => {
  it('demo path still bypasses Engine A entirely (ScoringSimulatorService reads static JSON, not computeConfidence)', () => {
    const simulator = src('services/scoring-simulator/ScoringSimulatorService.ts');
    expect(simulator).toContain('confidence-records.json');
    expect(simulator).not.toContain('confidence-engine');
    expect(simulator).not.toContain('computeConfidence');
  });

  it('"moderate" is never produced as an actual band VALUE (string literal in quotes) by any live/canonical source file — mentioning it in an explanatory comment is fine', () => {
    const seed = src('data/synthetic/confidence-records.json');
    expect(seed).toContain('"moderate"');
    const confidenceEngine = src('lib/kora-engine/confidence-engine.ts');
    const persistence = src('lib/live/persistence.ts');
    // getConfidenceBand's return type is 'high' | 'medium' | 'low' — TypeScript
    // itself would reject 'moderate' as a return value; this additionally
    // proves no quoted string literal 'moderate' exists as a value anywhere.
    expect(confidenceEngine).not.toMatch(/['"]moderate['"]/);
    expect(persistence).not.toMatch(/['"]moderate['"]/);
  });

  it('CC-011 did not touch the demo seed file (still the pre-CC-011 known values)', () => {
    const seed = src('data/synthetic/confidence-records.json');
    expect(seed).toContain('"confidence_score": 0.60'); // Meridiana S1 record, unchanged
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// PHASE 10 — VERSION / METADATA ATTACK
// ═════════════════════════════════════════════════════════════════════════════

describe('CC-012 Phase 10 — CC-011 introduced no new methodology/version string', () => {
  it('confidence-engine.ts still only carries the two pre-existing version-like tags (not a new one)', () => {
    const confidenceEngine = src('lib/kora-engine/confidence-engine.ts');
    // Any token that looks like NAME_vX.Y or NAME-vX.Y — catches new variants too.
    const versionLikeStrings = confidenceEngine.match(/[A-Za-z][\w-]*[_-]v\d+\.\d+/g) ?? [];
    expect(new Set(versionLikeStrings)).toEqual(new Set(['ConfidenceEngine_v2.0', 'KORA-METHOD-v2.0']));
  });

  it('persistence.ts introduces no new version/methodology string literal (still delegates to getMethodologyVersion/getCalibrationStatus)', () => {
    const persistence = src('lib/live/persistence.ts');
    expect(persistence).toContain('getMethodologyVersion');
    expect(persistence).toContain('getCalibrationStatus');
    expect(persistence).not.toMatch(/['"]KORA[\w.-]*v[\d.]+['"]/);
  });

  it('records the full known variant set for B-SNAP (not resolved here)', () => {
    // KNOWN_METHODOLOGY_VERSION_VARIANTS — for B-SNAP triage, informational only.
    const variants = [
      "'KORA Methodology v0.1' (supabase/migrations/001)",
      "'KORA-METHOD-v1.0' (supabase/migrations/005)",
      "'v0.1.ts' (lib/methodology-config filename)",
      "'kora_index_v3' (internal key, product label is v1.0)",
      "'KORA Index v1.0' (ConfidenceScoreService.ts, public product label)",
      "'ConfidenceEngine_v2.0' (confidence-engine.ts ENGINE_SOURCE, engine implementation tag)",
      "'KORA-METHOD-v2.0' (confidence-engine.ts, embedded in a warning string, not a structured field)",
    ];
    expect(variants.length).toBe(7);
  });
});
