// lib/living-koral-morphogenesis-config/v1.ts
// KORA-WP-113 — Morphogenesis Engine v1 versioned config.
//
// Following the lib/methodology-config/v0.1.ts / lib/living-koral-config/
// v1.ts precedent exactly (this project's own house convention for any
// semantic/methodology value): never hardcoded in service/component logic,
// always read through the accessors below.
//
// Only Emergence and Disappearance carry a live `operation` mapping —
// KORA-WP-112's initiative-adapter.ts is the only domain producer that
// exists anywhere in the codebase, and it only ever produces these two
// categories (pre-check 170 §9, cross-checked against
// lib/living-koral-config/v1.ts's own taxonomy — both are `scope: 'local'`
// and `morphologyOrConfidenceOnly: 'morphology'`, i.e. structurally binary
// with no magnitude/confidence dimension to fake). The other five taxonomy
// categories are legal semantic inputs (matching KORA-WP-111's own
// retained taxonomy exactly) but carry `operation: null` here — a
// deliberate, documented absence (this task's own §13), never an
// oversight — keeping unsupported live production structurally impossible
// (getMorphogenesisOperationForCategory throws rather than invents).

import type { LivingKoralMorphogenesisConfig, LivingKoralMorphogenesisOperationMapping } from './types';
import type { MaterialChangeTaxonomyEntry } from '@/lib/living-koral-config/types';

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value as object).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
}

const rawConfig: LivingKoralMorphogenesisConfig = {
  engineVersion: 'morphogenesis-v1.0',
  operationMappings: [
    { category: 'Emergence', operation: 'add_element', notes: 'Live — KORA-WP-112 initiative-adapter.ts, draft->published.' },
    { category: 'Disappearance', operation: 'remove_element', notes: 'Live — KORA-WP-112 initiative-adapter.ts, any->closed.' },
    { category: 'Strengthening', operation: null, notes: 'Dormant — no live producer exists; interpretive category, out of KORA-WP-113 v1 scope.' },
    { category: 'Weakening', operation: null, notes: 'Dormant — no live producer exists; interpretive category, out of KORA-WP-113 v1 scope.' },
    { category: 'Consolidation', operation: null, notes: 'Dormant — no live producer exists; taxonomy scope is local-or-distributed (lib/living-koral-config/v1.ts), a genuinely open multi-region question for whichever future adapter introduces it (pre-check 170 §7/§20.2) — not resolved by KORA-WP-113.' },
    { category: 'Reorientation', operation: null, notes: 'Dormant — no live producer exists; interpretive category, out of KORA-WP-113 v1 scope.' },
    { category: 'Stabilization', operation: null, notes: 'Dormant — no live producer exists; carries a confidence dimension KORA-WP-112 never persists (pre-check 170 §9) — out of KORA-WP-113 v1 scope.' },
  ],
};

const config: LivingKoralMorphogenesisConfig = deepFreeze(rawConfig);

export function getMorphogenesisConfig(): LivingKoralMorphogenesisConfig {
  return config;
}

export function getMorphogenesisEngineVersion(): string {
  return config.engineVersion;
}

export function getMorphogenesisOperationMappings(): readonly LivingKoralMorphogenesisOperationMapping[] {
  return config.operationMappings;
}

/**
 * The deterministic category -> operation mapping (this task's own §3,
 * §13). Throws for a dormant category (`operation: null` or unknown
 * category) — structurally "keeps unsupported live production
 * impossible" rather than silently inventing a mapping. The DB-level RPC
 * (gov.record_living_koral_transformation) independently re-validates the
 * same two-value vocabulary as defense in depth — this accessor is the
 * single source of truth either side must agree with.
 */
export function getMorphogenesisOperationForCategory(category: MaterialChangeTaxonomyEntry['category']): 'add_element' | 'remove_element' {
  const mapping = config.operationMappings.find((m) => m.category === category);
  if (!mapping || mapping.operation === null) {
    throw new Error(`[KORA] getMorphogenesisOperationForCategory rejected: "${category}" has no live Morphogenesis Engine v1 operation mapping — no domain adapter produces this category yet (dormant, by design, pre-check 170 §13).`);
  }
  return mapping.operation;
}
