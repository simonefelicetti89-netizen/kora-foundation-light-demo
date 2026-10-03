// lib/living-koral-morphology-config/types.ts
// KORA-WP-145 — Living KORAL Canonical Morphology Engine v2: versioned config types.
//
// Renderer-neutral. Nothing here is a coordinate, a length, a curve, a
// colour or a material — those belong to KORA-WP-146. `angularSlot` and
// `extentRank` are neutral ordinals only.

/** The five canonical KORA pillars, used as morphology AREAS (CLAUDE.md §4). */
export type MorphologyAreaCode = 'LIFE' | 'GROWTH' | 'CONNECTION' | 'IMPACT' | 'LEGACY';

export type SeedElementKind = 'member' | 'bud';
export type TerminalPhase = 'bud' | 'emergent' | 'formed' | 'settled';
export type MassClass = 'slender' | 'regular' | 'dense';

export interface SeedElementDefinition {
  readonly id: 'seed:0' | 'seed:1' | 'seed:bud';
  readonly kind: SeedElementKind;
  readonly parent: 'core';
  readonly angularSlot: number;
  readonly extentRank: number;
  readonly terminalPhase: TerminalPhase;
  readonly massClass: MassClass;
}

/** The frozen common seed (Founder S1, Pass 4) — identical for every organisation. */
export interface CanonicalSeedDefinition {
  readonly seedVersion: string;
  readonly coreMassShare: number;
  /** In adoption order: the n-th area to appear adopts elements[n]. */
  readonly elements: readonly SeedElementDefinition[];
  readonly referenceSha256: string;
}

export interface MorphologyBounds {
  readonly maxActiveMembers: number;
  readonly maxBranchesPerArea: number;
  readonly maxBranchDepth: number;
  readonly maxOpenCavities: number;
  readonly maxActiveFusionJoints: number;
  readonly maxVisibleMemoryTraces: number;
  readonly coreMassShareMin: number;
  readonly coreMassShareMax: number;
  readonly coreMassShareStepPerWithdrawnArea: number;
}

export interface CanonicalMorphologyConfig {
  readonly morphologyEngineVersion: string;
  readonly seed: CanonicalSeedDefinition;
  readonly areaCodes: readonly MorphologyAreaCode[];
  readonly bounds: MorphologyBounds;
  /** Neutral angular slots for core-grown primaries, by area rank (rank >= seed element count). Never keyed by pillar code (P1). */
  readonly grownPrimarySlotByRank: Readonly<Record<number, number>>;
  readonly extentTanhScale: number;
  readonly directionCycleSteps: number;
  readonly directionFallbackEpsilon: number;
  readonly settledPhaseThreshold: number;
}
