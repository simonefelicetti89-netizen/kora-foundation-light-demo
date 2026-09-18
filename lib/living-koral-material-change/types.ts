// lib/living-koral-material-change/types.ts
// KORA-WP-112 — Material Change Layer + Initiative Domain Adapter (Candidate-Only).
//
// Data contracts for the persisted gov.living_koral_material_change
// record — distinct from KORA-WP-111's own lib/living-koral-config/types.ts
// (which describes the frozen SEMANTIC MODEL every adapter must obey);
// these types describe the PERSISTED RECORD one specific adapter (this
// WP's own initiative domain adapter) writes and reads.
//
// Deliberately absent (KORA-WP-113+'s own scope, per pre-check 168 §W):
// any type for a Transformation Ledger entry, canonical Living KORAL
// state, Morphogenesis/Continuity data, KORAL Edition, KORAL Review,
// Expression Mode output, Commons publication payload, or Public KORAL
// page data.

import type { MaterialChangeTaxonomyEntry } from '@/lib/living-koral-config/types';

export type LivingKoralMaterialChangeStatus = 'CANDIDATE' | 'RECOGNIZED' | 'SUPERSEDED';

/**
 * No REJECTED/EXPIRED/DISMISSED/ARCHIVED state exists — none is defined by
 * any frozen Living KORAL source (pre-check 168 §D/§AB); a Founder
 * decision explicitly declined to invent one for this WP. A CANDIDATE
 * that never passes the evidence/persistence assessment simply remains
 * CANDIDATE.
 */
export const LIVING_KORAL_MATERIAL_CHANGE_STATUSES: readonly LivingKoralMaterialChangeStatus[] = ['CANDIDATE', 'RECOGNIZED', 'SUPERSEDED'];

export type LivingKoralMaterialChangeRecognitionSource = 'kora-automatic' | 'advisor-confirmed';

/** Pinned to 'initiative' for this WP's own sole V1 domain source. Widened additively when a future adapter exists — never by this WP. */
export type LivingKoralMaterialChangeAffectedDomain = 'initiative';
export type LivingKoralMaterialChangeSourceEntityType = 'initiative';

/** One persisted gov.living_koral_material_change row. */
export interface LivingKoralMaterialChangeRecord {
  readonly id: string;
  readonly tenantId: string;
  readonly status: LivingKoralMaterialChangeStatus;
  readonly category: MaterialChangeTaxonomyEntry['category'];
  readonly affectedDomain: LivingKoralMaterialChangeAffectedDomain;
  readonly sourceEntityType: LivingKoralMaterialChangeSourceEntityType;
  readonly sourceEntityId: string;
  readonly occurredAt: string;
  readonly recognizedAt: string | null;
  readonly recognitionSource: LivingKoralMaterialChangeRecognitionSource | null;
  readonly provenance: string;
  readonly previousStateReference: string | null;
  readonly supersededById: string | null;
  readonly taxonomyConfigVersion: string;
  readonly actorRole: string;
  readonly actorId: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/** Params for observing an initiative status transition — the adapter's own sole entry point. */
export interface ObserveInitiativeTransitionParams {
  readonly tenantId: string;
  readonly initiativeId: string;
  readonly previousStatus: 'draft' | 'published' | 'closed';
  readonly newStatus: 'draft' | 'published' | 'closed';
  readonly actorRole: string;
  readonly actorId: string;
}

/** Result of observing a transition — null when the transition is not canonically eligible (no candidate is created). */
export type ObserveInitiativeTransitionResult = LivingKoralMaterialChangeRecord | null;
