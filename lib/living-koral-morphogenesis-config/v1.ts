// lib/living-koral-morphogenesis-config/v1.ts
// KORA-WP-113 — Morphogenesis Engine v1 versioned config.
//
// Following the lib/methodology-config/v0.1.ts / lib/living-koral-config/
// v1.ts precedent exactly (this project's own house convention for any
// semantic/methodology value): never hardcoded in service/component logic,
// always read through the accessors below.
//
// Emergence and Disappearance carry the ORIGINAL live `operation` mapping —
// KORA-WP-112's initiative-adapter.ts is the only domain producer that
// exists anywhere in the codebase, and it only ever produces these two
// categories (pre-check 170 §9, cross-checked against
// lib/living-koral-config/v1.ts's own taxonomy — both are `scope: 'local'`
// and `morphologyOrConfidenceOnly: 'morphology'`, i.e. structurally binary
// with no magnitude/confidence dimension to fake).
//
// KORAL MORPHOLOGY PACKAGE A (2026-09-19, migration 087, report 183):
// Strengthening/Weakening/Reorientation/Stabilization now ALSO carry a
// live mapping — increase_extent/decrease_extent/reorient/stabilize,
// per report 182 §3/§4/§5's own design. This is a genuine capability
// change (four categories go from dormant to live), not a fake pre-commit
// version bump — engineVersion is therefore bumped to
// 'morphogenesis-v1.1' below (doc 129 Part 25's own mandatory version
// provenance discipline: every transformation ledger row must record
// WHICH engine version produced it, so a later version can never silently
// reinterpret an earlier one).
//
// This change has a load-bearing downstream effect this file's own
// comment already anticipated: lib/living-koral-review/types.ts's own
// isCurrentlyConfirmable() reads getMorphogenesisOperationMappings()
// directly — the moment a mapping appears here, KORA-WP-116's own Review
// Mode B (Advisor confirmation) becomes LIVE for these four categories,
// with ZERO code change in review-service.ts or types.ts (that module's
// own header already documented this as "structurally extensible without
// redesign"). This does NOT fabricate a live CANDIDATE producer for any
// of the four categories — no domain adapter creates Strengthening/
// Weakening/Reorientation/Stabilization CANDIDATEs anywhere in this
// codebase (see initiative-adapter.ts, unchanged) — the confirmation
// MACHINERY is live; real production candidates for these categories
// still require a future domain adapter this task does not build
// (report 183's own explicit "NO FAKE LIVE PRODUCERS" boundary).
//
// Consolidation remains the ONE dormant category — `operation: null`, a
// deliberate, documented absence (Package B, later, separate scope,
// report 182 §10) — keeping unsupported live production structurally
// impossible (getMorphogenesisOperationForCategory throws rather than
// invents).

import type { LivingKoralMorphogenesisConfig, LivingKoralMorphogenesisOperation, LivingKoralMorphogenesisOperationMapping } from './types';
import type { MaterialChangeTaxonomyEntry } from '@/lib/living-koral-config/types';

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value as object).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
}

const rawConfig: LivingKoralMorphogenesisConfig = {
  engineVersion: 'morphogenesis-v1.1',
  operationMappings: [
    { category: 'Emergence', operation: 'add_element', notes: 'Live — KORA-WP-112 initiative-adapter.ts, draft->published.' },
    { category: 'Disappearance', operation: 'remove_element', notes: 'Live — KORA-WP-112 initiative-adapter.ts, any->closed.' },
    { category: 'Strengthening', operation: 'increase_extent', notes: 'Live (Package A, migration 087) — deterministic single-lineage extent step-up. No live domain producer exists yet (no CANDIDATE-creating adapter) — the operation mapping is live; production candidate creation for this category remains a future, separate adapter task.' },
    { category: 'Weakening', operation: 'decrease_extent', notes: 'Live (Package A, migration 087) — deterministic single-lineage extent step-down, no floor at zero, never causes disappearance. No live domain producer exists yet — see Strengthening\'s own note.' },
    { category: 'Consolidation', operation: null, notes: 'Dormant — no live producer exists; multi-source identity (Package B, later, report 182 §7/§10-§13) needs its own new persistence model (a dedicated join table) this migration deliberately does not build — not resolved by Package A.' },
    { category: 'Reorientation', operation: 'reorient', notes: 'Live (Package A, migration 087) — deterministic single-lineage direction-ordinal increment. No live domain producer exists yet — see Strengthening\'s own note.' },
    { category: 'Stabilization', operation: 'stabilize', notes: 'Live (Package A, migration 087) — deterministic single-lineage one-way UNSETTLED->SETTLED transition. No live domain producer exists yet — see Strengthening\'s own note.' },
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
export function getMorphogenesisOperationForCategory(category: MaterialChangeTaxonomyEntry['category']): LivingKoralMorphogenesisOperation {
  const mapping = config.operationMappings.find((m) => m.category === category);
  if (!mapping || mapping.operation === null) {
    throw new Error(`[KORA] getMorphogenesisOperationForCategory rejected: "${category}" has no live Morphogenesis Engine v1 operation mapping — no domain adapter produces this category yet (dormant, by design, pre-check 170 §13).`);
  }
  return mapping.operation;
}
