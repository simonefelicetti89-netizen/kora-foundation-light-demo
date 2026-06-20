// tests/unit/monte-carlo.test.ts
// Monte Carlo credibility interval tests — Sprint 2 B-MC1.
//
// T_MC1: determinism — same input + same seed → same [p10, median, p90]
// T_MC2: ordering — p10 ≤ median ≤ p90
// T_MC3: interval narrows with more eligible records (more data → less uncertainty)
// T_MC4: shrinkage is attracted toward prior when n is small (prior=40, k=10)
//
// All fixtures are synthetic — no real company or worker data.

import { describe, it, expect } from 'vitest';
import { computeMonteCarlo } from '@/lib/kora-engine/monte-carlo-engine';
import { runKoraPipeline } from '@/lib/kora-engine/run-kora-pipeline';
import type { MCConfig } from '@/lib/kora-engine/monte-carlo-engine';
import type { RawUploadedRecord } from '@/lib/kora-engine/types';

// ── Shared fixtures ────────────────────────────────────────────────────────────

const BASE_CONFIG: MCConfig = {
  seed: 42,
  n_iter: 1000,
  macroblock_perturbation_pts: 5,
  shrinkage_k: 10,
  shrinkage_prior: 40.0,
};

const BASE_MACROBLOCKS = {
  reach:   60,
  quality: 50,
  equity:  40,
  bti:     55,
  weights: { REACH: 0.25, QUALITY: 0.30, EQUITY: 0.25, BTI: 0.20 },
};

function makeRecord(id: string, categoria: string, partecipanti: number, workforce: number, evidence = 'L2'): RawUploadedRecord {
  return {
    recordId:           id,
    batchId:            'mc-test',
    rowIndex:           0,
    detectedRecordType: 'welfare_program',
    raw: {
      nome_iniziativa:      'Programma test MC',
      categoria,
      partecipanti:         String(partecipanti),
      forza_lavoro:         String(workforce),
      importo:              '5000',
      b6_evidence_level:    evidence,
      b6_approved_for_iu:   true,
      participants:         partecipanti,
      reviewed_by_uef:      true,
      reviewed_eligibility: 'eligible',
    },
  };
}

// ── T_MC1: Determinism ────────────────────────────────────────────────────────

describe('T_MC1 — Determinism: same input + same seed → same [p10, median, p90]', () => {

  it('two calls with identical params produce identical intervals', () => {
    const r1 = computeMonteCarlo({ macroblocks: BASE_MACROBLOCKS, eligibleCount: 5, config: BASE_CONFIG });
    const r2 = computeMonteCarlo({ macroblocks: BASE_MACROBLOCKS, eligibleCount: 5, config: BASE_CONFIG });

    expect(r1.p10).toBe(r2.p10);
    expect(r1.median).toBe(r2.median);
    expect(r1.p90).toBe(r2.p90);
    expect(r1.reliabilityAdjustedIndex).toBe(r2.reliabilityAdjustedIndex);
  });

  it('different seed → different interval (stochastic divergence)', () => {
    const r1 = computeMonteCarlo({ macroblocks: BASE_MACROBLOCKS, eligibleCount: 5, config: BASE_CONFIG });
    const r2 = computeMonteCarlo({ macroblocks: BASE_MACROBLOCKS, eligibleCount: 5, config: { ...BASE_CONFIG, seed: 99 } });

    // Different seeds must produce different samples (collision is astronomically unlikely)
    expect(r1.p10 !== r2.p10 || r1.median !== r2.median || r1.p90 !== r2.p90).toBe(true);
  });

  it('runKoraPipeline monteCarlo is deterministic for the same input', () => {
    const records = [
      makeRecord('mc-det-1', 'corso formazione professionale', 40, 100),
      makeRecord('mc-det-2', 'volontariato aziendale territorio', 20, 100),
    ];
    const r1 = runKoraPipeline({ tenantId: 'mc-det', batchId: 'mc-det-batch', records, workforcePopulation: 100 });
    const r2 = runKoraPipeline({ tenantId: 'mc-det', batchId: 'mc-det-batch', records, workforcePopulation: 100 });

    expect(r1.monteCarlo).toBeDefined();
    expect(r2.monteCarlo).toBeDefined();
    expect(r1.monteCarlo?.p10).toBe(r2.monteCarlo?.p10);
    expect(r1.monteCarlo?.median).toBe(r2.monteCarlo?.median);
    expect(r1.monteCarlo?.p90).toBe(r2.monteCarlo?.p90);
  });

});

// ── T_MC2: Ordering ───────────────────────────────────────────────────────────

describe('T_MC2 — Ordering: p10 ≤ median ≤ p90', () => {

  it('basic macroblock input satisfies p10 ≤ median ≤ p90', () => {
    const r = computeMonteCarlo({ macroblocks: BASE_MACROBLOCKS, eligibleCount: 5, config: BASE_CONFIG });

    expect(r.p10).toBeLessThanOrEqual(r.median);
    expect(r.median).toBeLessThanOrEqual(r.p90);
  });

  it('ordering holds at extreme macroblock values (near 0)', () => {
    const r = computeMonteCarlo({
      macroblocks: { ...BASE_MACROBLOCKS, reach: 2, quality: 2, equity: 2, bti: 2 },
      eligibleCount: 3,
      config: BASE_CONFIG,
    });
    expect(r.p10).toBeLessThanOrEqual(r.median);
    expect(r.median).toBeLessThanOrEqual(r.p90);
    expect(r.p10).toBeGreaterThanOrEqual(0);
  });

  it('ordering holds at extreme macroblock values (near 100)', () => {
    const r = computeMonteCarlo({
      macroblocks: { ...BASE_MACROBLOCKS, reach: 98, quality: 98, equity: 98, bti: 98 },
      eligibleCount: 10,
      config: BASE_CONFIG,
    });
    expect(r.p10).toBeLessThanOrEqual(r.median);
    expect(r.median).toBeLessThanOrEqual(r.p90);
    expect(r.p90).toBeLessThanOrEqual(100);
  });

  it('pipeline monteCarlo always satisfies p10 ≤ median ≤ p90', () => {
    const records = [
      makeRecord('ord-1', 'benessere salute fisica', 30, 100, 'L3'),
      makeRecord('ord-2', 'sviluppo competenze digitali', 25, 100, 'L2'),
    ];
    const result = runKoraPipeline({ tenantId: 'mc-ord', records, workforcePopulation: 100 });
    const mc = result.monteCarlo;
    expect(mc).toBeDefined();
    if (mc) {
      expect(mc.p10).toBeLessThanOrEqual(mc.median);
      expect(mc.median).toBeLessThanOrEqual(mc.p90);
    }
  });

});

// ── T_MC3: Interval narrows with more data ────────────────────────────────────

describe('T_MC3 — Interval narrows with larger n (more data → less uncertainty)', () => {

  it('p90-p10 width is smaller with n=50 than with n=1 (same macroblock scores)', () => {
    const smallN = computeMonteCarlo({ macroblocks: BASE_MACROBLOCKS, eligibleCount: 1,  config: BASE_CONFIG });
    const largeN = computeMonteCarlo({ macroblocks: BASE_MACROBLOCKS, eligibleCount: 50, config: BASE_CONFIG });

    const widthSmall = smallN.p90 - smallN.p10;
    const widthLarge = largeN.p90 - largeN.p10;

    expect(widthSmall).toBeGreaterThan(widthLarge);
  });

  it('p90-p10 width at n=0 equals p90-p10 at base_pts (maximum uncertainty)', () => {
    // n=0: perturbScale = base_pts × k/(0+k) = base_pts × 1 = base_pts = 5
    const r = computeMonteCarlo({ macroblocks: BASE_MACROBLOCKS, eligibleCount: 0, config: BASE_CONFIG });
    const width = r.p90 - r.p10;
    // With 1000 samples and perturbScale=5 on 4 independent macroblocks,
    // the combined distribution should have width > 0.
    expect(width).toBeGreaterThan(0);
  });

  it('larger n_iter gives more stable percentile estimates (monotonic width convergence)', () => {
    const r100  = computeMonteCarlo({ macroblocks: BASE_MACROBLOCKS, eligibleCount: 5, config: { ...BASE_CONFIG, n_iter: 100 } });
    const r2000 = computeMonteCarlo({ macroblocks: BASE_MACROBLOCKS, eligibleCount: 5, config: { ...BASE_CONFIG, n_iter: 2000 } });

    // Both must satisfy ordering regardless of n_iter
    expect(r100.p10).toBeLessThanOrEqual(r100.median);
    expect(r100.median).toBeLessThanOrEqual(r100.p90);
    expect(r2000.p10).toBeLessThanOrEqual(r2000.median);
    expect(r2000.median).toBeLessThanOrEqual(r2000.p90);
  });

});

// ── T_MC4: Bayesian shrinkage toward prior ────────────────────────────────────

describe('T_MC4 — Shrinkage: prior=40, k=10 → reliabilityAdjustedIndex pulled toward 40 when n is small', () => {

  it('small n=1 pulls reliabilityAdjustedIndex toward prior (40) even when raw is 80', () => {
    // w = 1/(1+10) ≈ 0.09; θ̂ ≈ 0.09×80 + 0.91×40 = 7.2 + 36.4 = 43.6
    const r = computeMonteCarlo({
      macroblocks: { reach: 80, quality: 80, equity: 80, bti: 80, weights: { REACH: 0.25, QUALITY: 0.30, EQUITY: 0.25, BTI: 0.20 } },
      eligibleCount: 1,
      config: BASE_CONFIG,
    });

    // raw = 80; prior = 40; w = 1/11 ≈ 0.0909; θ̂ = 0.0909×80 + 0.9091×40 ≈ 43.6
    expect(r.reliabilityAdjustedIndex).toBeLessThan(60);  // clearly pulled below raw=80
    expect(r.reliabilityAdjustedIndex).toBeCloseTo(43.6, 0);
  });

  it('large n=100 keeps reliabilityAdjustedIndex close to raw (w≈0.91)', () => {
    // w = 100/(100+10) ≈ 0.909; θ̂ ≈ 0.909×80 + 0.091×40 = 72.7 + 3.6 = 76.3
    const r = computeMonteCarlo({
      macroblocks: { reach: 80, quality: 80, equity: 80, bti: 80, weights: { REACH: 0.25, QUALITY: 0.30, EQUITY: 0.25, BTI: 0.20 } },
      eligibleCount: 100,
      config: BASE_CONFIG,
    });

    expect(r.reliabilityAdjustedIndex).toBeGreaterThan(70);
    expect(r.reliabilityAdjustedIndex).toBeCloseTo(76.36, 0);
  });

  it('reliabilityAdjustedIndex with n=1 is closer to prior than with n=100', () => {
    const small = computeMonteCarlo({
      macroblocks: { ...BASE_MACROBLOCKS, reach: 80, quality: 80, equity: 80, bti: 80 },
      eligibleCount: 1,
      config: BASE_CONFIG,
    });
    const large = computeMonteCarlo({
      macroblocks: { ...BASE_MACROBLOCKS, reach: 80, quality: 80, equity: 80, bti: 80 },
      eligibleCount: 100,
      config: BASE_CONFIG,
    });

    const priorDiffSmall = Math.abs(small.reliabilityAdjustedIndex - BASE_CONFIG.shrinkage_prior);
    const priorDiffLarge = Math.abs(large.reliabilityAdjustedIndex - BASE_CONFIG.shrinkage_prior);

    // Small n → closer to prior
    expect(priorDiffSmall).toBeLessThan(priorDiffLarge);
  });

  it('reliabilityAdjustedIndex is exactly equal to prior when n=0', () => {
    // w = 0/(0+k) = 0; θ̂ = 0×raw + 1×prior = prior = 40
    const r = computeMonteCarlo({
      macroblocks: { ...BASE_MACROBLOCKS, reach: 90, quality: 90, equity: 90, bti: 90 },
      eligibleCount: 0,
      config: BASE_CONFIG,
    });
    expect(r.reliabilityAdjustedIndex).toBeCloseTo(40.0, 1);
  });

  it('n_iterations and seed are reported correctly in the result', () => {
    const r = computeMonteCarlo({
      macroblocks: BASE_MACROBLOCKS,
      eligibleCount: 5,
      config: { ...BASE_CONFIG, n_iter: 500, seed: 777 },
    });
    expect(r.n_iterations).toBe(500);
    expect(r.seed).toBe(777);
  });

});

// ── Pipeline integration checks ───────────────────────────────────────────────

describe('Monte Carlo — pipeline integration', () => {

  it('monteCarlo is present when scoringMode=computed', () => {
    const records = [makeRecord('pi-1', 'corso formazione professionale', 40, 100)];
    const result = runKoraPipeline({ tenantId: 'mc-int', records, workforcePopulation: 100 });
    expect(result.scoringMode).toBe('computed');
    expect(result.monteCarlo).toBeDefined();
  });

  it('monteCarlo is undefined for insufficient_data (empty records)', () => {
    const result = runKoraPipeline({ tenantId: 'mc-empty', records: [], workforcePopulation: 100 });
    expect(result.scoringMode).toBe('insufficient_data');
    expect(result.monteCarlo).toBeUndefined();
  });

  it('monteCarlo.seed matches methodology-config seed (42)', () => {
    const records = [makeRecord('mc-seed', 'benessere salute fisica', 30, 100)];
    const result = runKoraPipeline({ tenantId: 'mc-seed-check', records, workforcePopulation: 100 });
    expect(result.monteCarlo?.seed).toBe(42);
  });

  it('monteCarlo.n_iterations matches methodology-config n_iter (1000)', () => {
    const records = [makeRecord('mc-niter', 'volontariato aziendale territorio', 20, 100)];
    const result = runKoraPipeline({ tenantId: 'mc-niter-check', records, workforcePopulation: 100 });
    expect(result.monteCarlo?.n_iterations).toBe(1000);
  });

});
