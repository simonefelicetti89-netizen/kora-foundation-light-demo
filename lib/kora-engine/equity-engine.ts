// lib/kora-engine/equity-engine.ts
// B22 — EQUITY Engine v0.1 — Foundation Light Pilot.
//
// Replaces the stub EQUITY=50 with a pillar-based computation:
//   PC (Pillar Coverage) — how many of the 5 KORA pillars have meaningful activation
//   PB (Pillar Balance)  — how evenly activation is distributed across covered pillars
//   EQUITY = PC × 0.60 + PB × 0.40
//
// Input: pillarDistribution (count of events per pillar from non-blocked records).
// Blocked records have null primaryPillar → already excluded by the pipeline.
// Limited (economic relief) records map to LIFE → correctly inflate LIFE concentration
//   for companies that over-rely on vouchers.
//
// Design invariants:
//   - No PII. No individual worker data. Aggregate pillar counts only.
//   - Deterministic. No Math.random. No external calls.
//   - Falls back to 50 (insufficient_data) when pillarDistribution is null/empty.
//   - Score ceiling: uniform 5-pillar → EQUITY ≈ 100. Single-pillar → ≈ 12.
//   - 90+ requires multi-pillar coverage AND good balance.

import type { Pillar } from './types';

const PILLAR_CODES: readonly Pillar[] = ['LIFE', 'GROWTH', 'CONNECTION', 'IMPACT', 'LEGACY'];
const TOTAL_PILLARS = 5;

// A pillar is "covered" (contributes to PC) if it meets either threshold.
// MIN_COUNT prevents single-event pillars in large batches from inflating PC.
// MIN_SHARE ensures small companies with few total events still credit real coverage.
const MIN_COVERED_COUNT = 2;
const MIN_COVERED_SHARE = 0.05;  // 5% of total pillar events

export interface EquityScoreResult {
  equityScore:          number;   // 0–100 — main output
  pillarCoverageScore:  number;   // 0–100 — PC component (60% weight)
  pillarBalanceScore:   number;   // 0–100 — PB component (40% weight)
  coveredPillars:       number;   // number of meaningfully covered pillars (0–5)
  coveredPillarCodes:   string[]; // which pillar codes are covered
  dominantPillar:       string;   // most represented pillar code
  dominantShare:        number;   // 0–1, share of dominant pillar in total events
  totalPillarEvents:    number;   // total event count feeding this computation
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
 * Compute EQUITY score from pillar event distribution.
 *
 * Input comes from run-kora-pipeline Step 9 — counts of events per pillar,
 * including eligible and limited records (blocked → null pillar → excluded).
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

  const totalEvents = counts.reduce((s, c) => s + c.count, 0);
  if (totalEvents === 0) return INSUFFICIENT;

  // ── Pillar Coverage ───────────────────────────────────────────────────────
  // A pillar is covered if count ≥ MIN_COVERED_COUNT OR share ≥ MIN_COVERED_SHARE.
  const covered = counts.filter(c =>
    c.count >= MIN_COVERED_COUNT ||
    (totalEvents > 0 && c.count / totalEvents >= MIN_COVERED_SHARE),
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
  const dominantShare = dominant.count / totalEvents;

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
    totalPillarEvents:    totalEvents,
    reasonCodes,
    isInsufficientData:   false,
  };
}

export const EQUITY_ENGINE_VERSION = 'EquityEngine_v0.1_B22';
