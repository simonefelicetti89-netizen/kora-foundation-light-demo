// lib/kora-engine/monte-carlo-engine.ts
// Monte Carlo credibility interval engine — Sprint 2 B-MC1.
//
// Quantifies epistemic uncertainty on the KORA Index by perturbing macroblock
// scores n_iter times with scaled noise and collecting the resulting distribution.
//
// Perturbation scale = base_pts × k/(n+k):
//   - Narrows monotonically with more eligible records (more data → less uncertainty).
//   - Equals base_pts when n=0 (maximum uncertainty, no data).
//
// Bayesian shrinkage: reliabilityAdjustedIndex = θ̂ = w·θ_raw + (1-w)·θ_prior, w = n/(n+k).
//   - NOT the official KORA Index. A separate reliability indicator.
//   - Shrinks toward θ_prior when sample size n is small.
//   - Converges to koraIndex.value (raw) as n grows.
//
// PRNG: Mulberry32 — seeded 32-bit PRNG, no Math.random, fully deterministic.
// All parameters come from getMCConfig() / getShrinkageConfig() (methodology-config.json).

import type { MCConfig } from '@/lib/methodology-config/v0.1';
import { getShrinkageConfig, getMCConfig } from '@/lib/methodology-config/v0.1';
import type { MonteCarloResult } from './types';
import type { KoraIndexMacroblocks, KoraIndexUncertainty } from './types';

export type { MCConfig };

// ── Shared types ─────────────────────────────────────────────────────────────

export interface MCMacroblocks {
  reach: number;    // REACH macroblock score 0–100
  quality: number;  // QUALITY macroblock score 0–100
  equity: number;   // EQUITY macroblock score 0–100
  bti: number;      // BTI macroblock score 0–100
  weights: { REACH: number; QUALITY: number; EQUITY: number; BTI: number };
}

// ── Shared helpers ────────────────────────────────────────────────────────────

// Mulberry32 PRNG — deterministic seeded sequence.
function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return function (): number {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 0x100000000;
  };
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// ── computeMonteCarlo — pipeline-level MC (called by run-kora-pipeline.ts) ───
//
// Uses MCMacroblocks (reach/quality/equity/bti + weights) and MCConfig.
// Returns MonteCarloResult with reliabilityAdjustedIndex.
// reliabilityAdjustedIndex is NOT the official KORA Index.

/**
 * Pipeline-level Monte Carlo credibility/sensitivity diagnostic.
 * Runs n_iter simulations by perturbing macroblock scores and returns the
 * [p10, median, p90] credibility interval around the raw KORA Index.
 *
 * @param macroblocks  Base macroblock scores (0–100) and their weights.
 * @param eligibleCount  Number of eligible records — determines shrinkage weight w and perturbation scale.
 * @param config  MC parameters from getMCConfig().
 * @returns Credibility interval (p10, median, p90) plus diagnostic reliabilityAdjustedIndex.
 *   reliabilityAdjustedIndex is a diagnostic data-reliability indicator — NOT the official KORA Index.
 *   Official KORA Index = koraIndex.value (raw weighted macroblock sum from kora-index-engine.ts).
 *   If reliabilityAdjustedIndex is exposed in future company UI, it must be explicitly labelled
 *   as a diagnostic/non-official indicator, never as the KORA Index score.
 */
export function computeMonteCarlo(params: {
  macroblocks: MCMacroblocks;
  eligibleCount: number;
  config: MCConfig;
}): MonteCarloResult {
  const { macroblocks, eligibleCount, config } = params;
  const { seed, n_iter, macroblock_perturbation_pts: base_pts, shrinkage_k: k, shrinkage_prior: prior } = config;

  const n = Math.max(0, eligibleCount);
  const w = n / (n + k);
  // Scale perturbation by uncertainty factor k/(n+k): narrows with more data.
  const perturbScale = base_pts * (k / (n + k));

  const rng = mulberry32(seed);
  const samples: number[] = [];

  for (let i = 0; i < n_iter; i++) {
    // Uniform[-perturbScale, +perturbScale] per macroblock
    const dR = (rng() * 2 - 1) * perturbScale;
    const dQ = (rng() * 2 - 1) * perturbScale;
    const dE = (rng() * 2 - 1) * perturbScale;
    const dB = (rng() * 2 - 1) * perturbScale;

    const pR = clamp(macroblocks.reach   + dR, 0, 100);
    const pQ = clamp(macroblocks.quality + dQ, 0, 100);
    const pE = clamp(macroblocks.equity  + dE, 0, 100);
    const pB = clamp(macroblocks.bti     + dB, 0, 100);

    const simIdx =
      pR * macroblocks.weights.REACH   +
      pQ * macroblocks.weights.QUALITY +
      pE * macroblocks.weights.EQUITY  +
      pB * macroblocks.weights.BTI;

    samples.push(round2(clamp(simIdx, 0, 100)));
  }

  samples.sort((a, b) => a - b);

  // Raw KORA Index from macroblock scores (should match koraIndex.value)
  const rawIndex =
    macroblocks.reach   * macroblocks.weights.REACH   +
    macroblocks.quality * macroblocks.weights.QUALITY +
    macroblocks.equity  * macroblocks.weights.EQUITY  +
    macroblocks.bti     * macroblocks.weights.BTI;

  // reliabilityAdjustedIndex: Bayesian shrinkage estimate — NOT the official KORA Index.
  // Displayed alongside koraIndex.value as a data-reliability signal.
  const reliabilityAdjustedIndex = round2(w * rawIndex + (1 - w) * prior);

  return {
    p10:                     round2(percentile(samples, 10)),
    median:                  round2(percentile(samples, 50)),
    p90:                     round2(percentile(samples, 90)),
    reliabilityAdjustedIndex,
    n_iterations:            n_iter,
    seed,
  };
}

// ── computeMCInterval — index-level MC (called by kora-index-engine.ts) ──────
//
// Internal uncertainty helper producing koraIndex.uncertainty.
// Uses KoraIndexMacroblocks (activationReach/activationQuality/distributionEquity/budgetToHumanImpact)
// and fixed perturbation range (not shrinkage-scaled).
// Returns KoraIndexUncertainty with shrunkValue.
// shrunkValue is an internal diagnostic: Bayesian shrinkage of the MC median toward the prior.
// shrunkValue must NOT be displayed as the KORA Index.
// Future UI must not show shrunkValue unless explicitly labelled internal/admin-only.

/**
 * Internal lower-level uncertainty helper for koraIndex.uncertainty (called by kora-index-engine.ts).
 * Computes p10/median/p90 from macroblock perturbations, then derives shrunkValue via Bayesian shrinkage.
 *
 * shrunkValue = w×median + (1-w)×prior — an internal diagnostic estimate.
 * shrunkValue is NOT the official KORA Index and must never be displayed as one.
 * Future UI should not show shrunkValue unless explicitly labelled internal/admin-only.
 * Official KORA Index = koraIndex.value (raw weighted macroblock sum in kora-index-engine.ts).
 */
export function computeMCInterval(params: {
  macroblocks: KoraIndexMacroblocks;
  weights: Record<string, number>;
  computed_records: number;
}): KoraIndexUncertainty {
  const shrinkCfg = getShrinkageConfig();
  const mcCfg     = getMCConfig();
  const { macroblocks, weights, computed_records } = params;

  const range  = mcCfg.macroblock_perturbation_pts;
  const seed   = mcCfg.seed;
  const n_iter = mcCfg.n_iter;

  const W_REACH   = weights['REACH']   ?? 0.25;
  const W_QUALITY = weights['QUALITY'] ?? 0.30;
  const W_EQUITY  = weights['EQUITY']  ?? 0.25;
  const W_BTI     = weights['BTI']     ?? 0.20;

  const rng = mulberry32(seed);
  const samples: number[] = [];

  for (let i = 0; i < n_iter; i++) {
    const dR = (rng() * 2 - 1) * range;
    const dQ = (rng() * 2 - 1) * range;
    const dE = (rng() * 2 - 1) * range;
    const dB = (rng() * 2 - 1) * range;

    const perturbed =
      clamp(macroblocks.activationReach     + dR, 0, 100) * W_REACH   +
      clamp(macroblocks.activationQuality   + dQ, 0, 100) * W_QUALITY +
      clamp(macroblocks.distributionEquity  + dE, 0, 100) * W_EQUITY  +
      clamp(macroblocks.budgetToHumanImpact + dB, 0, 100) * W_BTI;

    samples.push(clamp(perturbed, 0, 100));
  }

  samples.sort((a, b) => a - b);

  const p10    = round2(samples[Math.floor(n_iter * 0.10)]!);
  const median = round2(samples[Math.floor(n_iter * 0.50)]!);
  const p90    = round2(samples[Math.floor(n_iter * 0.90)]!);

  const { k, default_prior } = shrinkCfg;
  const n = Math.max(0, computed_records);
  const w = n / (n + k);
  const shrunkValue = round2(w * median + (1 - w) * default_prior);

  return {
    shrunkValue,
    shrinkageWeight: round2(w),
    prior:           default_prior,
    p10,
    p90,
    median,
    n_iter,
    seed,
  };
}
