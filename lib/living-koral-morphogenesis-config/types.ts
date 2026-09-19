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
 * The deterministic operations Morphogenesis Engine v1 can produce.
 * add_element/remove_element (Emergence/Disappearance) are the original
 * two live operations (pre-check 170 §9). Widened by KORAL Morphology
 * Package A (migration 087, report 183) with increase_extent/
 * decrease_extent (Strengthening/Weakening) and reorient (Reorientation)
 * and stabilize (Stabilization) — each still deterministic and
 * single-lineage, per
 * .kora-audit/output/182_KORA_MORPHOLOGY_V1_FINAL_FOUNDER_DECISIONS_AND_IMPLEMENTATION_SPLIT.md.
 * Consolidation's own future `fuse` operation is NOT here (Package B,
 * later, a separate migration — multi-source, not single-lineage, report
 * 182 §10). Never extended silently; a new operation requires a new
 * migration widening the DB CHECK constraint.
 */
export type LivingKoralMorphogenesisOperation = 'add_element' | 'remove_element' | 'increase_extent' | 'decrease_extent' | 'reorient' | 'stabilize';

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
