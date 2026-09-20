// lib/living-koral-mark/bounded-geometry-types.ts
// KORA-WP-117 — Round 5, Living KORAL Bounded Identity Engine.
//
// LAYER 3 — Bounded Abstract KORAL Geometry (report 187, corrected by
// report 187's own "FOUNDER FINAL MATHEMATICAL ADJUDICATION"). Renderer-
// neutral: no SVG path data, no pixel coordinates, no mesh vertices, no
// final rendered color, no DOM/UI data — and no field justified only by
// "a future 3D renderer might want it" (report 187's own binding
// principle: "SAME ORGANISM, not IDENTICAL 2D/3D GEOMETRIC PARAMETERS" —
// a proposed `depthAxis3D` field was designed then explicitly REMOVED for
// exactly this reason and is not reintroduced here).
//
// Produced by lib/living-koral-mark/morphological-compression.ts (Layer
// 2) from an already-canonical ExpressionModeMarkPayload (Layer 1 output,
// unchanged Package A semantics — Presence/Extent/Direction/Stability).
// Consumed today by lib/living-koral-mark/morphology-engine.ts (Layer 5,
// 2D). A future Layer 6 (3D, NOT implemented) would consume the
// identical type, deriving its own depth/volume/surface/manufacturing
// parameters independently from these same renderer-neutral facts.

import type { CanonicalDomain } from './types';

export interface CoreBody {
  readonly massShare: number; // bounded fraction, target >= 0.25-0.30
  readonly activeRegionCount: number;
}

/** report 187's own Bounded Mean Projection — mean, never sum, of already-clamped individual contributions, then a bounded monotonic (tanh) projection. */
export interface ExtentState {
  readonly rawMean: number; // mean of already-clamped individual contributor extentStep values
  readonly normalized: number; // tanh-projected, in (-1, +1) -- the macro-lobe reach driver
}

/**
 * report 187's own circular/vector-resultant aggregation. `directionCoherence`
 * is a PURELY GEOMETRIC aggregation property (how consistently this slot's
 * own contributors agree on a direction) — it is NEVER a KORA evidence/
 * confidence concept and must never be presented, logged, or named as
 * "confidence" anywhere Company-facing, per explicit Founder instruction.
 */
export interface HeadingState {
  readonly angle: number; // continuous, renderer-neutral angular value (degrees, [0,360))
  readonly directionCoherence: number; // 0..1 -- resultant vector magnitude / contributor count
  readonly isFallback: boolean; // true when the resultant was near-zero and a deterministic fallback value was used
}

export interface MicroState {
  readonly lobeShoulderPosition: number; // 0..1 normalized
  readonly tipProfileVariant: number; // bounded discrete index
  readonly asymmetryBias: number; // bounded, deterministic
  readonly spacingBias: number; // bounded, deterministic
  readonly contourTension: number; // bounded, deterministic
}

export interface ContributorProvenance {
  readonly contributorCount: number;
  /**
   * The bucket's own most-tenured contributor's slotIndex — slotIndex
   * ITSELF is already the permanent, replay-computed, per-domain
   * first-emergence-order counter (edition-lineage-service.ts's own
   * `nextSlotByDomain`, unchanged since WP-117 Round 1) — report 187's
   * own Founder Final Mathematical Adjudication §G proof applies
   * directly, with zero new persistence or replay logic required.
   */
  readonly firstEmergenceOrdinal: number;
  /** Not derivable from the current Expression Mode allow-list payload (which carries only final replayed values, not event-level category history) — disclosed, deliberate V1 simplification, always null today. */
  readonly dominantCategory: string | null;
}

export interface MacroSlot {
  readonly slotId: string; // "{domain}:{bucketIndex}" -- permanent, never reassigned/reused
  readonly domain: CanonicalDomain;
  readonly present: boolean;
  readonly contributorProvenance: ContributorProvenance;
  readonly extentState: ExtentState;
  readonly headingState: HeadingState;
  /** Continuous [0,1] raw fact — settled contributors / active contributors. The curvature-amplitude MAPPING is a Layer 4 (Visual Grammar) concern, not stored here. */
  readonly settledShare: number;
  readonly massProfile: { readonly neckWeight: number; readonly tipWeight: number };
  readonly territoryBias: number; // bounded angular bias, domain-rank-derived
  readonly depth: 0 | 1;
  readonly parentSlotId: string | null;
  readonly microState: MicroState;
}

export interface ApertureTopology {
  readonly apertureId: string; // "{parentSlotId}:aperture" -- stable while the trigger condition holds
  readonly sourceSlotIds: readonly string[];
  readonly sizeClass: 'small' | 'medium' | 'large'; // bounded discrete -- never a literal value at Layer 3
  readonly originCondition: 'macro-convergence' | 'consolidation-residual';
}

export interface BoundedKoralGeometry {
  readonly grammarVersion: string;
  readonly compressionVersion: string;
  readonly editionBoundaryRevision: number;
  readonly core: CoreBody;
  readonly macroSlots: readonly MacroSlot[];
  readonly apertures: readonly ApertureTopology[];
  readonly domainComposition: readonly { readonly domain: CanonicalDomain; readonly weight: number }[];
}
