// lib/living-koral-morphogenesis-config/types.ts
// KORA-WP-113 — Morphogenesis Engine v1 versioned config types.
//
// Distinct from lib/living-koral-config/types.ts (WP-111's own frozen
// SEMANTIC MODEL — constitution, taxonomy, six-way framework, which
// WP-113 consumes but never re-derives). This module describes only the
// deterministic category -> structural operation mapping Morphogenesis
// Engine v1 itself owns, plus the engine's own version identity (doc 129
// Part 25 — mandatory version provenance on every transformation).
//
// Deliberately absent: any visual/geometric/rendering field. The
// `operation` values below are structural (add/remove an abstract
// element), never a shape, color, or image descriptor — see doc 132
// Part 10's canonical-state/renderer separation, preserved here.

import type { MaterialChangeTaxonomyEntry } from '@/lib/living-koral-config/types';

/**
 * The only two deterministic operations Morphogenesis Engine v1 can ever
 * produce — matching the only two live domain-producible categories
 * (pre-check 170 §9). Never extended silently; a new operation requires a
 * new engine version and a new migration widening the DB CHECK constraint.
 */
export type LivingKoralMorphogenesisOperation = 'add_element' | 'remove_element';

/**
 * One taxonomy category's mapping to a deterministic operation —
 * `operation: null` for a dormant category (no live producer exists yet,
 * this task's own §13) is a deliberate, documented absence, not an
 * oversight.
 */
export interface LivingKoralMorphogenesisOperationMapping {
  readonly category: MaterialChangeTaxonomyEntry['category'];
  readonly operation: LivingKoralMorphogenesisOperation | null;
  readonly notes: string;
}

export interface LivingKoralMorphogenesisConfig {
  readonly engineVersion: string;
  readonly operationMappings: readonly LivingKoralMorphogenesisOperationMapping[];
}
