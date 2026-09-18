// lib/living-koral-config/types.ts
// KORA-WP-111 — Living KORAL Semantic Foundation.
//
// Data contracts for the versioned Living KORAL constitution/taxonomy/
// framework config, mirroring lib/methodology-config/v0.1.ts's own type-
// shape convention. NOT database schema — these types describe the frozen
// semantic model KORA-WP-112+ must obey, nothing more.
//
// Deliberately absent from this file (KORA-WP-112+'s own scope, per
// registry 142's own Out of Scope for this WP): any type for a persisted
// Material Change record, Change Protocol runtime state, Transformation
// Ledger entry, Morphogenesis/Continuity state, KORAL Edition, KORAL
// Review, Expression Mode output, Commons publication payload, or Public
// KORAL page data.

/** One of the Living KORAL constitution's 18 fixed, Founder-locked principles (doc 132 §E). */
export interface LivingKoralConstitutionPrinciple {
  readonly id: number;
  readonly principle: string;
}

/** Reversibility of a Material Change taxonomy category — a plain boolean is insufficient because Stabilization is not applicable ("this IS the stable state"). */
export type MaterialChangeReversibility = 'yes' | 'no' | 'n/a';

/** Whether recognizing a category updates morphology, confidence, or both (doc 129 Part 2's own "Morphology or confidence-only?" column). */
export type MaterialChangeMorphologyKind = 'morphology' | 'confidence-only' | 'morphology-and-confidence';

export type MaterialChangeScope = 'local' | 'global' | 'local-or-distributed';

/**
 * One of the seven Material Change taxonomy categories retained for
 * Change Protocol v1 (doc 129 Part 2): Emergence, Disappearance,
 * Strengthening, Weakening, Consolidation, Reorientation, Stabilization.
 * Fragmentation/Differentiation/Convergence/Structural discontinuity/
 * Uncertainty revision were considered and explicitly excluded — see
 * `materialChangeTaxonomyNote` in the config data itself.
 */
export interface MaterialChangeTaxonomyEntry {
  readonly category: 'Emergence' | 'Disappearance' | 'Strengthening' | 'Weakening' | 'Consolidation' | 'Reorientation' | 'Stabilization';
  readonly organizationalPhenomenon: string;
  readonly justifyingEvidence: string;
  readonly insufficientEvidence: string;
  readonly reversible: MaterialChangeReversibility;
  readonly scope: MaterialChangeScope;
  readonly morphologyOrConfidenceOnly: MaterialChangeMorphologyKind;
  readonly notes: string | null;
}

/**
 * One of the six Organization-Changed-vs-KORA-Learned classes (doc 129
 * Part 3). Only type 'A' (Real organizational transformation) ever
 * justifies a Material Change Event — B/C/D/E/F must never touch
 * morphology (constitution-adjacent invariant, enforced structurally by
 * `justifiesMaterialChange`, never re-derived by a consumer).
 */
export interface OrganizationChangedVsKoraLearnedEntry {
  readonly type: 'A' | 'B' | 'C' | 'D' | 'E' | 'F';
  readonly name: string;
  readonly definition: string;
  readonly koraExample: string;
  readonly justifiesMaterialChange: boolean;
}

/** The complete, versioned Living KORAL semantic foundation — the entirety of what KORA-WP-111 establishes. */
export interface LivingKoralConstitutionConfig {
  readonly version: string;
  readonly sources: readonly string[];
  readonly constitution: readonly LivingKoralConstitutionPrinciple[];
  readonly materialChangeTaxonomy: readonly MaterialChangeTaxonomyEntry[];
  readonly materialChangeTaxonomyNote: string;
  readonly organizationChangedVsKoraLearned: readonly OrganizationChangedVsKoraLearnedEntry[];
  readonly organizationChangedVsKoraLearnedNote: string;
}
