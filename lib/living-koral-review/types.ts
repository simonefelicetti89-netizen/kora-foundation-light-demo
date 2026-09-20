// lib/living-koral-review/types.ts
// KORA-WP-116 — KORAL Review.
//
// KORAL Review is NOT a new persisted object (Founder Adjudication #6, and
// report 176 §15-16): it is a domain-shaped USE of two existing
// primitives — a gov.operational_case (KORA-WP-007) with
// linked_object_type='material_change', and Advisor interpretation content
// (KORA-WP-036, advisor.advisor_content_record, now optionally linked to
// that same Material Change — migration 086). This file therefore
// contains no table-row type of its own; only the narrow domain rules
// (eligibility, currently-confirmable, Review Mode) this WP itself owns.

import type { MaterialChangeTaxonomyEntry } from '@/lib/living-koral-config/types';
import { getMorphogenesisOperationMappings } from '@/lib/living-koral-morphogenesis-config/v1';

/**
 * Review Mode A — interpret an already-RECOGNIZED Material Change. Zero
 * mutation to Material Change / Ledger / Edition; only Advisor
 * interpretation content is written (KORA-WP-036, linked).
 *
 * Review Mode B — confirm an eligible, still-ambiguous CANDIDATE. The
 * ONLY path by which a KORAL Review Advisor action may promote a Material
 * Change to RECOGNIZED (Founder Adjudication #1: never a bare "approve
 * KORAL" click — the full 10-step sequence in review-service.ts's own
 * confirmAmbiguousCandidate()).
 */
export const KORAL_REVIEW_MODES = ['interpret', 'confirm'] as const;
export type KoralReviewMode = (typeof KORAL_REVIEW_MODES)[number];

/**
 * ELIGIBLE-FOR-ADVISOR-CONFIRMATION CATEGORIES — canonical authority.
 *
 * PRIMARY SOURCE (2026-09-19 remediation — a code comment is
 * corroborating evidence only, never sole semantic authority):
 * `.kora-audit/output/129_KORA_LIVING_KORAL_STAGE_0_MATERIAL_CHANGE_CHANGE_PROTOCOL_DESIGN.md`,
 * Part 12 ("Advisor Role"), verbatim:
 *
 *   "Advisor validation is required only for interpretive/ambiguous
 *    transformation categories (Strengthening, Weakening, Reorientation,
 *    Stabilization) — never for discrete, self-evidencing ones (a closed
 *    initiative, an ended Assignment, a published Decision Pack, which
 *    are already canonical facts requiring no human confirmation)."
 *
 * This is FOUR categories, not five. Consolidation is deliberately
 * EXCLUDED here even though report 176/177's own first pass wrongly
 * included it (sourced only from a corroborating, non-authoritative code
 * comment in initiative-adapter.ts, not from this primary doc). Doc 129
 * itself supports Consolidation's exclusion independently: Part 2's own
 * taxonomy table gives Consolidation's justifying evidence as "Coordinated
 * closures + one clear emergence" (discrete canonical-object transitions,
 * the same evidencing shape as Emergence/Disappearance — Part 2's own
 * rows for those two), and Part 23 ("Transformation Collisions") treats a
 * clustered Consolidation event as combined DISCRETE evidence
 * ("same recognition window, mutually corroborating canonical objects"),
 * never as a gradual/interpretive classification shift. Doc 129 Part 1's
 * own v2 definition draws exactly this line: "discrete and
 * self-evidencing (a decision, an ended relationship, a closed
 * initiative...)" vs. "gradual/interpretive (a Need's classification
 * shifting)" — Consolidation's own evidencing (coordinated closures) sits
 * on the discrete side of that line, consistent with Part 12 naming it
 * out.
 *
 * Cross-checked structurally (not merely asserted) against
 * lib/living-koral-config/v1.ts's own versioned taxonomy: the permanent
 * test in tests/unit/kora-wp-116-koral-review.test.ts proves this file's
 * eligible+excluded sets partition getMaterialChangeTaxonomy()'s own full
 * category list exactly — a category added to that config in the future
 * without a corresponding update here fails the test loudly, rather than
 * being silently misclassified.
 */
export const KORAL_REVIEW_EXCLUDED_CONFIRMATION_CATEGORIES: readonly MaterialChangeTaxonomyEntry['category'][] = [
  'Emergence', 'Disappearance', 'Consolidation',
];

export const KORAL_REVIEW_ELIGIBLE_CONFIRMATION_CATEGORIES: readonly MaterialChangeTaxonomyEntry['category'][] = [
  'Strengthening', 'Weakening', 'Reorientation', 'Stabilization',
];

/** Canon-eligible in principle (doc 129 Part 12). Does NOT mean a live Advisor confirmation is currently possible — see isCurrentlyConfirmable() below for that. */
export function isEligibleForAdvisorConfirmation(category: MaterialChangeTaxonomyEntry['category']): boolean {
  return KORAL_REVIEW_ELIGIBLE_CONFIRMATION_CATEGORIES.includes(category);
}

/**
 * REQUIRED INVARIANT (2026-09-19 remediation, binding): "WP-116 MUST NOT
 * make unsupported categories newly recognizable through a live Advisor
 * path." No frozen canonical source (Registry 142, doc 128/129/130, the
 * WP-111/112/113 contracts) states that a RECOGNIZED Material Change may
 * legitimately exist without its category's corresponding Living KORAL
 * transformation being representable — doc 129 Part 19's own conceptual
 * contract and Part 26's Edition semantics both treat "recognized" and
 * "transformation-ledger-represented" as the same moment, never a
 * split state. Absent an explicit canonical permission for that split,
 * this function fails closed.
 *
 * A category is CURRENTLY confirmable only when BOTH:
 *   (1) it is canon-eligible for Advisor confirmation at all (the set
 *       above), AND
 *   (2) KORA-WP-113's own Morphogenesis Engine v1 config
 *       (lib/living-koral-morphogenesis-config/v1.ts, a real versioned
 *       config, not a comment) currently carries a live (non-null)
 *       operation mapping for it.
 *
 * Structurally extensible without redesign: the day WP-113 adds a mapping
 * for any of the four eligible categories, this function starts returning
 * true for it with zero code change here or in review-service.ts.
 */
export function isCurrentlyConfirmable(category: MaterialChangeTaxonomyEntry['category']): boolean {
  if (!isEligibleForAdvisorConfirmation(category)) return false;
  const mapping = getMorphogenesisOperationMappings().find((m) => m.category === category);
  return !!mapping && mapping.operation !== null;
}
