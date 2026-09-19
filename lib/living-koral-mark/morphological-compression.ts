// lib/living-koral-mark/morphological-compression.ts
// KORA-WP-117 — Round 5, Living KORAL Bounded Identity Engine.
//
// LAYER 2 — Morphological Compression (report 186/187, corrected by
// report 187's own "FOUNDER FINAL MATHEMATICAL ADJUDICATION"). The
// deterministic projection from an unbounded number of canonical
// lineages (Layer 1, ExpressionModeMarkPayload — Package A, unchanged)
// onto a small, FIXED set of macro-slots (Layer 3, BoundedKoralGeometry).
//
// FOUNDATIONAL PRINCIPLE (Founder, binding, restated once here): more
// events != more visible limbs; more time != a larger KORAL; more
// maturity != more visual complexity. This module NEVER deletes or
// approximates canonical truth — gov.living_koral_transformation_ledger,
// analytics.living_koral_edition, and the full Package A replay chain
// (edition-lineage-service.ts) are entirely untouched by this file. This
// module only controls VISUAL REPRESENTATION.
//
// ═══════════════════════════════════════════════════════════════════════
// DOMAIN-RANK ALLOTMENT (report 187 §5, unchanged by the Founder Final
// Mathematical Adjudication): the total macro-slot budget is pre-divided
// by a FIXED, DECREASING schedule keyed to domain RANK — never
// recomputed when a later domain appears, so an earlier domain's own
// allotment can never shrink retroactively (the entire stability
// guarantee, report 187 §G, rests on this). Domain rank = a domain's own
// index within CANONICAL_DOMAIN_ORDER (types.ts) — a fixed, versioned,
// additive-only sequence that is never reordered once set, giving the
// SAME retroactive-stability property "rank by first emergence" itself
// requires, with zero new mechanism.
// ═══════════════════════════════════════════════════════════════════════
//
// MACRO-SLOT IDENTITY (report 187 §G, mechanically simplified): a
// lineage's own `slotIndex` (edition-lineage-service.ts) IS ALREADY the
// permanent, replay-computed, per-domain first-emergence-order counter —
// assigned once, on first `add_element`, never reassigned, never re-
// derived from "current active list position." `bucketIndex = slotIndex
// % domainSlotBudget` is therefore ALSO permanent — no new persistence,
// no new replay logic, the identical mechanism this entire engagement
// already relies on for `slotIndex` itself.
//
// SHALLOW MACRO HIERARCHY (reuses the EXACT proven Round 2-4 topology,
// relocated to the macro level): within one domain's own 3-slot
// allotment, bucket 0 is the root (depth 0), buckets 1 and 2 are BOTH
// children of bucket 0 (depth 1) — the identical ROOT_FANOUT=3/
// BRANCH_FANOUT=2 pattern already validated across four prior rounds,
// now applied to macro-slots instead of raw lineages. A 2-slot allotment
// has one root + one child; a 1-slot allotment has a root only.

import type { CanonicalDomain, ExpressionModeMarkPayload } from './types';
import type { BoundedKoralGeometry, MacroSlot, ExtentState, HeadingState, MicroState } from './bounded-geometry-types';

export const COMPRESSION_VERSION = 'koral-compression-v1';

// ── Domain-rank allotment (report 187 §5, fixed, versioned) ─────────────
const DOMAIN_SLOT_ALLOTMENT_SCHEDULE: readonly number[] = [3, 2, 1]; // rank 0 -> 3 slots, rank 1 -> 2 slots, rank 2+ -> 1 slot (overflow, report 187 §5's own disclosed edge case)

function domainSlotBudget(domainRank: number): number {
  return DOMAIN_SLOT_ALLOTMENT_SCHEDULE[Math.min(domainRank, DOMAIN_SLOT_ALLOTMENT_SCHEDULE.length - 1)];
}

// ── Extent — Bounded Mean Projection (Founder Final Mathematical Adjudication §A) ──
const EXTENT_TANH_SCALE_K = 3; // grammar constant, calibration — see report 188 for disclosure

function computeExtentState(extentSteps: readonly number[]): ExtentState {
  if (extentSteps.length === 0) return { rawMean: 0, normalized: 0 };
  const rawMean = extentSteps.reduce((a, b) => a + b, 0) / extentSteps.length;
  const normalized = Math.tanh(rawMean / EXTENT_TANH_SCALE_K);
  return { rawMean, normalized };
}

// ── Direction — circular aggregation via vector resultant (Founder Final Mathematical Adjudication §B) ──
const DIRECTION_CYCLE_STEPS = 6; // full circular spread for genuine circular statistics — a deliberate departure from Round 4's own narrow local-nudge DIRECTION_STEP_DEG, see report 188
const DIRECTION_STEP_DEG = 360 / DIRECTION_CYCLE_STEPS;
const RESULTANT_MAGNITUDE_EPSILON = 0.15; // near-zero threshold, calibration

function degToRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/**
 * Per-lineage angle from its own replayed directionOrdinal — the SAME
 * bounded cyclic mapping principle established in Package A/Round 4-5,
 * now spread across the FULL circle (not a narrow local arc) because
 * genuine circular statistics (vector resultant) require angles that can
 * actually cancel when contributors disagree — a narrow arc would make
 * the near-zero-resultant case nearly unreachable.
 */
function contributorAngleDeg(directionOrdinal: number): number {
  const wrapped = ((directionOrdinal % DIRECTION_CYCLE_STEPS) + DIRECTION_CYCLE_STEPS) % DIRECTION_CYCLE_STEPS;
  return wrapped * DIRECTION_STEP_DEG;
}

/**
 * Near-zero resultant fallback — DISCLOSED, deliberate simplification of
 * report 187's own "reuse the slot's own last non-degenerate heading
 * from replay history" language: implementing genuine cross-Edition
 * heading memory would require either new persistence or an expensive
 * multi-Edition backward search, neither a good fit for this round's own
 * scope (the Founder's own explicit "if persistence is genuinely
 * necessary: STOP" instruction). Instead, when the CURRENT boundary's
 * own resultant is near-zero, this function deterministically falls back
 * to the bucket's own most-tenured (lowest slotIndex) active
 * contributor's own individual angle — a stable, history-grounded,
 * fully deterministic value requiring no new persistence or lookback,
 * computed entirely from data already available at this single boundary.
 * Only when there are ZERO active contributors does it fall back to a
 * fixed, per-{domain,bucketIndex} default (never random).
 */
function computeHeadingState(
  contributors: readonly { readonly slotIndex: number; readonly directionOrdinal: number }[],
  domain: CanonicalDomain,
  bucketIndex: number,
): HeadingState {
  if (contributors.length === 0) {
    return { angle: fixedFallbackHeadingDeg(domain, bucketIndex), directionCoherence: 0, isFallback: true };
  }

  let vx = 0;
  let vy = 0;
  for (const c of contributors) {
    const rad = degToRad(contributorAngleDeg(c.directionOrdinal));
    vx += Math.cos(rad);
    vy += Math.sin(rad);
  }
  const directionCoherence = Math.hypot(vx, vy) / contributors.length;

  if (directionCoherence < RESULTANT_MAGNITUDE_EPSILON) {
    const anchor = [...contributors].sort((a, b) => a.slotIndex - b.slotIndex)[0];
    return { angle: contributorAngleDeg(anchor.directionOrdinal), directionCoherence, isFallback: true };
  }

  const angle = (Math.atan2(vy, vx) * 180) / Math.PI;
  return { angle: (angle + 360) % 360, directionCoherence, isFallback: false };
}

/** Fixed, deterministic, per-{domain,bucketIndex} default heading — the SAME kind of constant as Round 4/report 184-185's own ROOT_LOCI headings, never random, never data-dependent beyond the slot's own permanent identity. */
function fixedFallbackHeadingDeg(domain: CanonicalDomain, bucketIndex: number): number {
  const domainSeed = domain.length * 17; // a fixed, non-random function of the domain NAME's own length only — never a hash of arbitrary identity, purely a small deterministic offset so different domains don't share identical fallback headings
  return (domainSeed + bucketIndex * 47) % 360;
}

// ── Stability — continuous settledShare (Founder Final Mathematical Adjudication §C) ──
function computeSettledShare(stabilityStates: readonly ('unsettled' | 'settled')[]): number {
  if (stabilityStates.length === 0) return 0;
  const settledCount = stabilityStates.filter((s) => s === 'settled').length;
  return settledCount / stabilityStates.length;
}

// ── Mass profile / territory / micro-morphology — deterministic, bounded ──
const NECK_WEIGHT_BASE = 1;
const TIP_TO_NECK_RATIO = 1.8; // anti-hand constraint, unchanged from report 184/185

const DOMAIN_TERRITORY_LOCI: readonly number[] = [-38, 12, 52]; // fixed, irregular, per domain rank — reused directly from Round 4/report 184-185's own ROOT_LOCI headings

function microStateFor(domain: CanonicalDomain, bucketIndex: number, contributorCount: number): MicroState {
  // Every value below is a pure, deterministic function of already-stable
  // identity facts (domain, bucketIndex, contributorCount) — never
  // randomness, never a hash of UUID/tenant/Company-name.
  return {
    lobeShoulderPosition: (0.3 + ((bucketIndex * 0.17) % 0.4)),
    tipProfileVariant: (bucketIndex + domain.length) % 3,
    asymmetryBias: (((bucketIndex + 1) * 0.09) % 0.3) - 0.15,
    spacingBias: ((contributorCount % 5) * 0.02),
    contourTension: 0.5 + (((bucketIndex * 13) % 10) / 40),
  };
}

interface CompressionElement {
  readonly slotIndex: number;
  readonly present: boolean;
  readonly extentStep: number;
  readonly directionOrdinal: number;
  readonly stabilityState: 'unsettled' | 'settled';
}

function buildMacroSlot(
  domain: CanonicalDomain,
  bucketIndex: number,
  domainBudget: number,
  contributors: readonly CompressionElement[],
  domainRank: number,
): MacroSlot {
  const slotId = `${domain}:${bucketIndex}`;
  const active = contributors.filter((c) => c.present);
  const present = active.length > 0;

  const depth: 0 | 1 = bucketIndex === 0 ? 0 : 1;
  const parentSlotId = bucketIndex === 0 ? null : `${domain}:0`;

  const extentState = computeExtentState(active.map((c) => c.extentStep));
  const headingState = computeHeadingState(active.map((c) => ({ slotIndex: c.slotIndex, directionOrdinal: c.directionOrdinal })), domain, bucketIndex);
  const settledShare = computeSettledShare(active.map((c) => c.stabilityState));

  const neckWeight = NECK_WEIGHT_BASE * (depth === 0 ? 1 : 0.82); // shallow depth-based taper, unchanged principle from Round 2-5
  const tipWeight = neckWeight * TIP_TO_NECK_RATIO;

  const territoryBias = DOMAIN_TERRITORY_LOCI[domainRank % DOMAIN_TERRITORY_LOCI.length];

  const firstEmergenceOrdinal = contributors.length > 0 ? Math.min(...contributors.map((c) => c.slotIndex)) : bucketIndex;

  void domainBudget;

  return {
    slotId,
    domain,
    present,
    contributorProvenance: {
      contributorCount: active.length,
      firstEmergenceOrdinal,
      dominantCategory: null, // report 188's own disclosed V1 limitation — not derivable from the Expression Mode allow-list payload
    },
    extentState,
    headingState,
    settledShare,
    massProfile: { neckWeight, tipWeight },
    territoryBias,
    depth,
    parentSlotId,
    microState: microStateFor(domain, bucketIndex, active.length),
  };
}

// ── Core body (report 187 §12) ───────────────────────────────────────────
const BASE_CORE_MASS_SHARE = 0.3;
const MIN_CORE_MASS_SHARE = 0.25;
const MAX_CORE_MASS_SHARE = 0.4;
const PER_EMPTY_REGION_BONUS = 0.02; // a sparser organism gets a modestly larger relative core, keeping it visually balanced

function computeCoreMassShare(activeRegionCount: number, maxPossibleRegions: number): number {
  const emptyRegions = Math.max(0, maxPossibleRegions - activeRegionCount);
  const share = BASE_CORE_MASS_SHARE + emptyRegions * PER_EMPTY_REGION_BONUS;
  return Math.max(MIN_CORE_MASS_SHARE, Math.min(MAX_CORE_MASS_SHARE, share));
}

/**
 * Layer 2's own sole entry point: canonical Expression Mode payload (already
 * privacy-safe, allow-listed) -> Bounded Abstract KORAL Geometry (Layer 3).
 * `editionBoundaryRevision` is passed by the caller (mark-service.ts, which
 * already holds it from the Edition record) rather than threaded through
 * the Expression Mode allow-list itself — a deliberate scope-minimization,
 * report 188.
 */
export function compressToBoundedGeometry(payload: ExpressionModeMarkPayload, editionBoundaryRevision: number): BoundedKoralGeometry {
  const macroSlots: MacroSlot[] = [];
  const domainWeights: { domain: CanonicalDomain; count: number }[] = [];

  payload.domains.forEach((domainEntry, domainRank) => {
    const budget = domainSlotBudget(domainRank);
    const elements: CompressionElement[] = domainEntry.elements.map((el) => ({
      slotIndex: el.slotIndex,
      present: el.present,
      extentStep: el.extentStep ?? 0,
      directionOrdinal: el.directionOrdinal ?? 0,
      stabilityState: el.stabilityState ?? 'unsettled',
    }));

    let domainActiveCount = 0;
    for (let bucketIndex = 0; bucketIndex < budget; bucketIndex++) {
      const contributors = elements.filter((el) => el.slotIndex % budget === bucketIndex);
      const slot = buildMacroSlot(domainEntry.domain, bucketIndex, budget, contributors, domainRank);
      macroSlots.push(slot);
      if (slot.present) {
        domainActiveCount += slot.contributorProvenance.contributorCount;
      }
    }
    domainWeights.push({ domain: domainEntry.domain, count: domainActiveCount });
  });

  const activeRegionCount = macroSlots.filter((s) => s.present).length;
  const maxPossibleRegions = macroSlots.length || 1;

  // ── Aperture topology (report 187 §11/report 188) — the macro-level
  // generalization of the existing sibling-convergence trigger: a parent
  // (depth 0) slot whose own TWO children (depth 1, the only possible
  // pair under the 3-slot allotment) are BOTH present. ────────────────────
  const apertures = [];
  const byDomain = new Map<CanonicalDomain, MacroSlot[]>();
  for (const slot of macroSlots) {
    const arr = byDomain.get(slot.domain) ?? [];
    arr.push(slot);
    byDomain.set(slot.domain, arr);
  }
  for (const [, slots] of byDomain) {
    const root = slots.find((s) => s.depth === 0);
    const children = slots.filter((s) => s.depth === 1 && s.parentSlotId === root?.slotId);
    if (root && children.length === 2 && children[0].present && children[1].present) {
      apertures.push({
        apertureId: `${root.slotId}:aperture`,
        sourceSlotIds: [children[0].slotId, children[1].slotId],
        sizeClass: 'medium' as const,
        originCondition: 'macro-convergence' as const,
      });
    }
  }

  const totalWeight = domainWeights.reduce((a, b) => a + b.count, 0);
  const domainComposition = domainWeights.map((d) => ({ domain: d.domain, weight: totalWeight > 0 ? d.count / totalWeight : 0 }));

  return {
    grammarVersion: 'koral-mark-v1',
    compressionVersion: COMPRESSION_VERSION,
    editionBoundaryRevision,
    core: { massShare: computeCoreMassShare(activeRegionCount, maxPossibleRegions), activeRegionCount },
    macroSlots,
    apertures: apertures.slice(0, 2), // hard ceiling, report 186/187's own Visual Complexity Budget
    domainComposition,
  };
}
