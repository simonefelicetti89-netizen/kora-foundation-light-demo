// lib/living-koral-transformation-ledger/types.ts
// KORA-WP-113 — Transformation Ledger + Morphogenesis Engine v1 +
// Continuity Contract v1.
//
// Data contracts for the two persisted tables this WP owns:
// gov.living_koral_transformation_ledger (append-only historical truth)
// and analytics.living_koral_state (mutable current-state projection).
// Distinct from lib/living-koral-material-change/types.ts (WP-112's own
// input record) and from lib/living-koral-morphogenesis-config/types.ts
// (the versioned engine config this module consumes, never re-derives).
//
// Deliberately absent (KORA-WP-114+'s own scope): any type for a KORAL
// Company Hub view model, Edition, Portrait, Mark render payload, Review
// record, Expression Mode output, or Commons/Public KORAL page data.

import type { MaterialChangeTaxonomyEntry } from '@/lib/living-koral-config/types';
import type { LivingKoralMorphogenesisOperation } from '@/lib/living-koral-morphogenesis-config/types';

/** One immutable gov.living_koral_transformation_ledger row. */
export interface LivingKoralTransformationLedgerRecord {
  readonly id: string;
  readonly tenantId: string;
  readonly materialChangeId: string;
  readonly category: MaterialChangeTaxonomyEntry['category'];
  readonly affectedDomain: 'initiative';
  readonly taxonomyConfigVersion: string;
  readonly morphogenesisEngineVersion: string;
  readonly operation: LivingKoralMorphogenesisOperation;
  readonly resultingStateRevision: number;
  readonly occurredAt: string;
  readonly recognizedAt: string;
  readonly actorRole: 'SYSTEM';
  readonly actorId: string;
  readonly createdAt: string;
}

/** The abstract, structural per-domain region content — never geometric. */
export interface LivingKoralStateRegion {
  readonly elementCount: number;
}

/** One analytics.living_koral_state row — the Continuity Contract's own current materialization. */
export interface LivingKoralStateRecord {
  readonly id: string;
  readonly tenantId: string;
  readonly revision: number;
  readonly regions: Readonly<Record<string, LivingKoralStateRegion>>;
  readonly morphogenesisEngineVersion: string | null;
  readonly updatedFromLedgerId: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface RecordLivingKoralTransformationParams {
  readonly materialChangeId: string;
  readonly tenantId: string;
}

export interface RecordLivingKoralTransformationResult {
  /** false when this was an idempotent no-op (already ledgered by an earlier call). */
  readonly created: boolean;
  readonly ledgerId: string;
  readonly tenantId: string;
  readonly category: MaterialChangeTaxonomyEntry['category'];
  readonly resultingStateRevision: number;
}
