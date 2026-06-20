// lib/kora-engine/equity-engine.ts
// B22 — EQUITY Engine v0.1 — Foundation Light Pilot.
//
// Replaces the stub EQUITY=50 with a pillar-based computation:
//   PC (Pillar Coverage) — how many of the 5 KORA pillars have meaningful activation
//   PB (Pillar Balance)  — how evenly activation is distributed across covered pillars
//   EQUITY = PC × 0.60 + PB × 0.40
//
// Input: pillarDistribution — IU sums per pillar (after Sprint 1 B-IU1).
//   Prior to Sprint 1 this was an event count. Since Sprint 1, run-kora-pipeline
//   passes IU-weighted sums: each eligible record contributes its impact_units_total
//   to its primary_pillar bucket. Blocked/limited records contribute 0 IU → excluded.
//
// Design invariants:
//   - No PII. No individual worker data. Aggregate pillar IU sums only.
//   - Deterministic. No Math.random. No external calls.
//   - Falls back to insufficient_data when pillarDistribution is null or all-zero IU.
//   - Score ceiling: uniform 5-pillar → EQUITY ≈ 100. Single-pillar → ≈ 12.
//   - 90+ requires multi-pillar coverage AND good balance.

import type { Pillar } from './types';

const PILLAR_CODES: readonly Pillar[] = ['LIFE', 'GROWTH', 'CONNECTION', 'IMPACT', 'LEGACY'];
const TOTAL_PILLARS = 5;

// A pillar is "covered" (contributes to PC) if it meets either threshold.
// After Sprint 1 B-IU1, counts represent IU sums (not event counts).
// MIN_COVERED_COUNT: minimum IU mass for a pillar to count as covered.
// MIN_COVERED_SHARE: minimum share of total IU — handles small datasets with few records.
const MIN_COVERED_COUNT = 2;
const MIN_COVERED_SHARE = 0.05;  // 5% of total IU

export interface EquityScoreResult {
  /**
   * @deprecated Diagnostic field — NOT used in the KORA Index.
   * Computed as PC×0.60 + PB×0.40 (equity-engine internal formula).
   * The KORA Index EQUITY macroblock uses the full formula:
   *   EQW×0.30 + EQS×0.20 + PC×0.25 + PB×0.25 (kora-index-engine.ts).
   * Use pillarCoverageScore and pillarBalanceScore individually instead.
   */
  equityScore:          number;   // 0–100 — legacy diagnostic, not used in KORA Index
  pillarCoverageScore:  number;   // 0–100 — PC component (25% weight in KORA Index EQUITY)
  pillarBalanceScore:   number;   // 0–100 — PB component (25% weight in KORA Index EQUITY)
  coveredPillars:       number;   // number of meaningfully covered pillars (0–5)
  coveredPillarCodes:   string[]; // which pillar codes are covered
  dominantPillar:       string;   // most represented pillar code
  dominantShare:        number;   // 0–1, share of dominant pillar in total events
  totalPillarEvents:    number;   // total IU sum across all pillars (Sprint 1 B-IU1: IU sums, not event counts)
  reasonCodes:          string[];
  isInsufficientData:   boolean;
}

const INSUFFICIENT: EquityScoreResult = {
  equityScore:         50,
  pillarCoverageScore: 50,
  pillarBalanceScore:  50,
  coveredPillars:      0,
  coveredPillarCodes:  [],
  dominantPillar:      'UNKNOWN',
  dominantShare:       0,
  totalPillarEvents:   0,
  reasonCodes:         ['equity:insufficient_data:fallback_50'],
  isInsufficientData:  true,
};

/**
 * Compute EQUITY score from pillar IU distribution (Sprint 1 B-IU1+).
 *
 * Input comes from run-kora-pipeline Step 12 — IU sums per pillar from eligible records.
 * Blocked and limited records contribute 0 IU → their primary_pillar is null → excluded.
 * Returns INSUFFICIENT when pillarDistribution is null or all IU sums are zero.
 *
 * PC = covered/5 × 100
 * HHI = Σ(share_i²) over covered pillars
 * PB = (1 − (HHI − minHHI) / (1 − minHHI)) × 100   [0 when single pillar]
 * EQUITY = round(PC × 0.60 + PB × 0.40)
 */
export function computeEquityScore(
  pillarDistribution: Partial<Record<Pillar, number>> | Record<string, number> | null | undefined,
): EquityScoreResult {
  if (!pillarDistribution) return INSUFFICIENT;

  const counts = PILLAR_CODES.map(p => ({
    code:  p as string,
    count: (pillarDistribution as Record<string, number>)[p] ?? 0,
  }));

  const totalIU = counts.reduce((s, c) => s + c.count, 0);
  if (totalIU === 0) return INSUFFICIENT;

  // ── Pillar Coverage ───────────────────────────────────────────────────────
  // A pillar is covered if IU ≥ MIN_COVERED_COUNT OR IU share ≥ MIN_COVERED_SHARE.
  const covered = counts.filter(c =>
    c.count >= MIN_COVERED_COUNT ||
    (totalIU > 0 && c.count / totalIU >= MIN_COVERED_SHARE),
  );
  const coveredTotal = covered.reduce((s, c) => s + c.count, 0);

  const pc = Math.round((covered.length / TOTAL_PILLARS) * 100);

  // ── Pillar Balance (HHI-based) ────────────────────────────────────────────
  // HHI measures concentration. Normalized to 0–100 where 100 = perfectly even.
  // minHHI = 1/coveredPillars (uniform distribution).
  // With ≤ 1 covered pillar PB is meaningless → 0.
  let pb = 0;
  if (covered.length >= 2 && coveredTotal > 0) {
    const shares   = covered.map(c => c.count / coveredTotal);
    const hhi      = shares.reduce((s, x) => s + x * x, 0);
    const minHHI   = 1 / covered.length;
    const rangeHHI = 1 - minHHI;
    if (rangeHHI > 0) {
      pb = Math.max(0, Math.min(100, Math.round((1 - (hhi - minHHI) / rangeHHI) * 100)));
    }
  }

  // ── EQUITY = PC 60% + PB 40% ──────────────────────────────────────────────
  const equityScore = Math.max(0, Math.min(100, Math.round(pc * 0.60 + pb * 0.40)));

  // ── Dominant pillar ───────────────────────────────────────────────────────
  const sorted = [...counts].sort((a, b) => b.count - a.count);
  const dominant      = sorted[0];
  const dominantShare = dominant.count / totalIU;

  // ── Reason codes ──────────────────────────────────────────────────────────
  const reasonCodes: string[] = [
    `equity:covered_pillars:${covered.length}_of_5`,
    `equity:pc:${pc}`,
    `equity:pb:${pb}`,
    `equity:hhi_dominant:${dominant.code}:${Math.round(dominantShare * 100)}pct`,
  ];
  if (covered.length === TOTAL_PILLARS)              reasonCodes.push('equity:full_pillar_coverage');
  if (covered.length <= 2)                           reasonCodes.push('equity:low_pillar_coverage');
  if (pb >= 80)                                      reasonCodes.push('equity:well_balanced');
  else if (pb < 40)                                  reasonCodes.push('equity:strongly_imbalanced');
  if (dominantShare > 0.75)                          reasonCodes.push('equity:single_pillar_dominated');

  return {
    equityScore,
    pillarCoverageScore:  pc,
    pillarBalanceScore:   pb,
    coveredPillars:       covered.length,
    coveredPillarCodes:   covered.map(c => c.code),
    dominantPillar:       dominant.code,
    dominantShare,
    totalPillarEvents:    totalIU,
    reasonCodes,
    isInsufficientData:   false,
  };
}

export const EQUITY_ENGINE_VERSION = 'EquityEngine_v0.1_B22';
