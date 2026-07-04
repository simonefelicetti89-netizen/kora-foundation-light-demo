// lib/partner-initiatives/types.ts
// PARTNER-02 — Partner initiative participation, foundation types.
//
// PRIVACY INVARIANT — NEVER RELAX
// These types describe PARTNER-facing initiative data only. They must never
// include a worker-level identifier of any kind: no worker_id, kora_worker_id,
// token_digest, link_id, raw UEF payload, or individual scan/participation
// history. If a future field needs to reference worker activity, it must be
// an aggregate count, never a per-worker row or identifier.
//
// No live DB model for partner-initiative participation exists yet (see
// docs/FUTURE_ROLES_AND_SURFACES.md). These types are the foundation a future
// migration + service wiring will populate — see service.ts for the current
// (always-empty, feature-flagged) implementation.

export type PartnerInitiativePillar = 'LIFE' | 'GROWTH' | 'CONNECTION' | 'IMPACT' | 'LEGACY';

// Partner-declared relationship to an initiative. Intent only — never implies
// a worker has participated, and never carries any worker-level data.
export type PartnerParticipationIntent = 'none' | 'interested' | 'supporting' | 'active';

export interface PartnerInitiativeCard {
  id: string;
  title: string;
  pillar: PartnerInitiativePillar;
  summary: string;
  // Aggregate-only signal, if ever populated: a count, never a list of
  // individuals. Nullable because no live data source exists yet.
  participantCountAggregate: number | null;
  participationIntent: PartnerParticipationIntent;
}

export interface PartnerInitiativesResult {
  // True only when the result was populated from a real, live data source.
  // Always false today — no DB model exists yet (see service.ts).
  isLive: boolean;
  initiatives: PartnerInitiativeCard[];
  emptyStateMessage: string;
}
