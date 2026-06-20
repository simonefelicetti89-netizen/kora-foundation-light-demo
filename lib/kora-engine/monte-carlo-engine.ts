// lib/kora-engine/monte-carlo-engine.ts
// Sprint 2 B-MC1 — Uncertainty quantification: Monte Carlo + Bayesian shrinkage.
//
// Design:
//   Monte Carlo: perturbs the four macroblock scores ±perturbation_pts and recomputes
//   the weighted KORA Index across N seeded iterations → p10 / median / p90 interval.
//   Shrinkage: θ̂ = w×θ_grezzo + (1−w)×θ_prior, w = n/(n+k).
//   n = computed_records (proxy for data richness). k, θ_prior from config.
//
// Determinism guarantee: same (seed, inputs, config) → same output.
// PRNG: Mulberry32 — fast, portable, no Math.random().
//
// The existing `value` field (deterministic point estimate) is NEVER modified.
// This engine adds `uncertainty` as a separate additive field.

import type { KoraIndexMacroblocks, KoraIndexUncertainty } from './types';
import { getMCConfig, getShrinkageConfig } from '@/lib/methodology-config/v0.1';

// ── Mulberry32 seeded PRNG ────────────────────────────────────────────────────
// Returns a function that yields uniform samples in [0, 1).

function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6D2B79F5) >>> 0;
    let z = Math.imul(s ^ (s >>> 15), 1 | s);
    z ^= z + Math.imul(z ^ (z >>> 7), 61 | z);
    return ((z ^ (z >>> 14)) >>> 0) / 0x100000000;
  };
}

// ── Monte Carlo perturbation ──────────────────────────────────────────────────

export function computeMCInterval(params: {
  macroblocks: KoraIndexMacroblocks;
  weights: Record<string, number>;
  computed_records: number;
}): KoraIndexUncertainty {
  const mcCfg = getMCConfig();
  const shrinkCfg = getShrinkageConfig();

  const { macroblocks, weights, computed_records } = params;
  const { seed, n_iter, macroblock_perturbation_pts: range } = mcCfg;
  const { k, default_prior } = shrinkCfg;

  const rng = mulberry32(seed);
  const samples: number[] = [];

  const W_REACH   = weights['REACH']   ?? 0.25;
  const W_QUALITY = weights['QUALITY'] ?? 0.30;
  const W_EQUITY  = weights['EQUITY']  ?? 0.25;
  const W_BTI     = weights['BTI']     ?? 0.20;

  for (let i = 0; i < n_iter; i++) {
    // Sample a symmetric perturbation in (−range, +range) for each macroblock
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

  // ── Bayesian shrinkage ────────────────────────────────────────────────────
  // n = computed_records (data richness proxy — more records → less pull toward prior)
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

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
