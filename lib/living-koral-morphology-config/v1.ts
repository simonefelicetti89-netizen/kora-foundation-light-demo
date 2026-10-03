// lib/living-koral-morphology-config/v1.ts
// KORA-WP-145 — Living KORAL Canonical Morphology Engine v2: versioned config.
//
// Same house convention as lib/methodology-config/v0.1.ts and
// lib/living-koral-config/v1.ts: values live here, never in the fold. A
// future change ships as v2.ts alongside this file, never by editing it in
// place, so every Edition stays reproducible under the version it records.
//
// Authority: design/program/reference-surfaces/living-koral/
// KORA_LIVING_KORAL_MINIMUM_ENGINE_EXTENSION_SPEC.md §0.6 (final Founder
// record) + Registry 219 KORA-WP-145.

import type { CanonicalMorphologyConfig, MorphologyAreaCode } from './types';

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value as object).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
}

const rawConfig: CanonicalMorphologyConfig = {
  morphologyEngineVersion: 'koral-morphology-v2',
  seed: {
    seedVersion: 'koral-seed-v1',
    coreMassShare: 0.34,
    // Adoption order (S1-c): 1st area -> seed:0, 2nd -> seed:1, 3rd -> seed:bud.
    elements: [
      { id: 'seed:0', kind: 'member', parent: 'core', angularSlot: 1, extentRank: 1, terminalPhase: 'emergent', massClass: 'regular' },
      { id: 'seed:1', kind: 'member', parent: 'core', angularSlot: 0, extentRank: 2, terminalPhase: 'emergent', massClass: 'regular' },
      { id: 'seed:bud', kind: 'bud', parent: 'core', angularSlot: 2, extentRank: 3, terminalPhase: 'bud', massClass: 'regular' },
    ],
    referenceSha256: 'b9e2f1f0acf9bb13694ac8187dc9e11cc5a6e0f3cca438ec958c0f3f7fee728e',
  },
  areaCodes: ['LIFE', 'GROWTH', 'CONNECTION', 'IMPACT', 'LEGACY'],
  bounds: {
    maxActiveMembers: 6, // = brand-safety MAX_MACRO_LOBES
    maxBranchesPerArea: 1,
    maxBranchDepth: 2,
    maxOpenCavities: 2, // = brand-safety MAX_APERTURES
    maxActiveFusionJoints: 2,
    maxVisibleMemoryTraces: 8,
    coreMassShareMin: 0.25,
    coreMassShareMax: 0.4,
    coreMassShareStepPerWithdrawnArea: 0.02,
  },
  grownPrimarySlotByRank: { 3: 3, 4: 4 },
  extentTanhScale: 3, // same constant as v1 Morphological Compression
  directionCycleSteps: 6, // same constant as v1 Morphological Compression
  directionFallbackEpsilon: 0.15,
  settledPhaseThreshold: 0.5,
};

const config: CanonicalMorphologyConfig = deepFreeze(rawConfig);

export function getCanonicalMorphologyConfig(): CanonicalMorphologyConfig {
  return config;
}

export function getMorphologyEngineVersion(): string {
  return config.morphologyEngineVersion;
}

export function isMorphologyAreaCode(value: unknown): value is MorphologyAreaCode {
  return typeof value === 'string' && (config.areaCodes as readonly string[]).includes(value);
}
