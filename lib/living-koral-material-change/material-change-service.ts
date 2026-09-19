// lib/living-koral-material-change/material-change-service.ts
// KORA-WP-112 — Material Change Layer + Initiative Domain Adapter (Candidate-Only).
//
// Generic (domain-agnostic) Material Change persistence + recognition-
// assessment core. Registry 142's own "domain-adapter contract" —
// per-domain adapters (this WP's own lib/living-koral-material-change/
// initiative-adapter.ts today; future Advisor Assignment/Company
// Membership/Need Hypothesis adapters, not built here) call into this
// module; this module never knows about any specific domain's own
// tables.
//
// CANDIDATE-ONLY BINDING (Founder Correction 4, registry 142, verbatim):
// "an initiative status transition... produces a Material Change
// CANDIDATE only. It MUST NOT automatically produce a RECOGNIZED Material
// Change. Promotion to RECOGNIZED requires the Change Protocol's own
// evidence/persistence assessment (this package) — never a bare
// status-transition rule." createMaterialChangeCandidate() below never
// returns a RECOGNIZED row — only assessMaterialChangeCandidate(),
// called separately, ever promotes.

import { getSupabaseServiceClient } from '@/lib/supabase/server';
import { recordGovernanceEvent } from '@/lib/audit/governance-event';
import { getMaterialChangeTaxonomy, getLivingKoralConfigVersion } from '@/lib/living-koral-config/v1';
import type {
  LivingKoralMaterialChangeRecord, LivingKoralMaterialChangeAffectedDomain, LivingKoralMaterialChangeSourceEntityType,
  LivingKoralMaterialChangeRecognitionSource,
} from './types';
import type { MaterialChangeTaxonomyEntry } from '@/lib/living-koral-config/types';

function toRecord(row: Record<string, unknown>): LivingKoralMaterialChangeRecord {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    status: row.status as LivingKoralMaterialChangeRecord['status'],
    category: row.category as MaterialChangeTaxonomyEntry['category'],
    affectedDomain: row.affected_domain as LivingKoralMaterialChangeAffectedDomain,
    sourceEntityType: row.source_entity_type as LivingKoralMaterialChangeSourceEntityType,
    sourceEntityId: row.source_entity_id as string,
    occurredAt: row.occurred_at as string,
    recognizedAt: (row.recognized_at as string | null) ?? null,
    recognitionSource: (row.recognition_source as LivingKoralMaterialChangeRecord['recognitionSource']) ?? null,
    provenance: row.provenance as string,
    previousStateReference: (row.previous_state_reference as string | null) ?? null,
    supersededById: (row.superseded_by_id as string | null) ?? null,
    taxonomyConfigVersion: row.taxonomy_config_version as string,
    actorRole: row.actor_role as string,
    actorId: row.actor_id as string,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export interface CreateMaterialChangeCandidateParams {
  tenantId: string;
  category: MaterialChangeTaxonomyEntry['category'];
  affectedDomain: LivingKoralMaterialChangeAffectedDomain;
  sourceEntityType: LivingKoralMaterialChangeSourceEntityType;
  sourceEntityId: string;
  occurredAt: string;
  provenance: string;
  actorRole: string;
  actorId: string;
}

/**
 * Creates a CANDIDATE row. Idempotent: re-observing the same
 * (tenant, sourceEntityType, sourceEntityId, category) transition is a
 * safe no-op, enforced by the migration's own unique index — never a
 * duplicate row (pre-check 168 §M).
 *
 * Only category types whose framework classification justifies a
 * Material Change may ever be passed here — enforced structurally by
 * consuming KORA-WP-111's own getMaterialChangeJustifyingTypes(), never
 * re-derived. The caller (a domain adapter) is responsible for
 * determining that the underlying event is type 'A' (Real organizational
 * transformation) before calling this function at all; this function
 * itself defends the invariant by confirming the category exists in
 * KORA-WP-111's own retained taxonomy (a category outside the seven
 * retained ones is a caller bug, not a recoverable input).
 */
export async function createMaterialChangeCandidate(params: CreateMaterialChangeCandidateParams): Promise<LivingKoralMaterialChangeRecord> {
  if (!params.actorRole || !params.actorId) {
    throw new Error('[KORA] createMaterialChangeCandidate rejected: actorRole and actorId are required — this substrate never manufactures actor attribution.');
  }
  const taxonomy = getMaterialChangeTaxonomy();
  if (!taxonomy.some((entry) => entry.category === params.category)) {
    throw new Error(`[KORA] createMaterialChangeCandidate rejected: "${params.category}" is not one of KORA-WP-111's own retained taxonomy categories.`);
  }

  const db = getSupabaseServiceClient();
  const taxonomyConfigVersion = getLivingKoralConfigVersion();

  // Idempotent lookup-or-create: the unique index on
  // (tenant_id, source_entity_type, source_entity_id, category) is the
  // real enforcement; this SELECT-first avoids a noisy conflict error on
  // the expected, common re-observation case.
  const { data: existing } = await db
    .schema('gov').from('living_koral_material_change')
    .select().eq('tenant_id', params.tenantId).eq('source_entity_type', params.sourceEntityType)
    .eq('source_entity_id', params.sourceEntityId).eq('category', params.category).maybeSingle();
  if (existing) return toRecord(existing as Record<string, unknown>);

  const { data, error } = await db
    .schema('gov').from('living_koral_material_change')
    .insert({
      tenant_id: params.tenantId,
      status: 'CANDIDATE',
      category: params.category,
      affected_domain: params.affectedDomain,
      source_entity_type: params.sourceEntityType,
      source_entity_id: params.sourceEntityId,
      occurred_at: params.occurredAt,
      provenance: params.provenance,
      taxonomy_config_version: taxonomyConfigVersion,
      actor_role: params.actorRole,
      actor_id: params.actorId,
    })
    .select().single();

  if (error || !data) {
    // A concurrent insert may have won the unique-index race between our
    // SELECT and our INSERT — re-select rather than surface a spurious
    // conflict error, preserving the same idempotent-no-op contract.
    const { data: raced } = await db
      .schema('gov').from('living_koral_material_change')
      .select().eq('tenant_id', params.tenantId).eq('source_entity_type', params.sourceEntityType)
      .eq('source_entity_id', params.sourceEntityId).eq('category', params.category).maybeSingle();
    if (raced) return toRecord(raced as Record<string, unknown>);
    throw new Error(`[KORA] createMaterialChangeCandidate failed: ${error?.message ?? 'no data returned'}`);
  }

  return toRecord(data as Record<string, unknown>);
}

export interface AssessMaterialChangeCandidateParams {
  candidateId: string;
  tenantId: string;
  /**
   * Re-verifies the candidate's own claim against the REAL, current
   * source record — never trusts the event payload/provenance text
   * alone (this task's own §8, binding). The caller (a domain adapter)
   * supplies this function since only it knows how to re-read its own
   * domain's real table; this generic service never queries a
   * domain-specific table directly.
   */
  reverifyAgainstSource: () => Promise<boolean>;
  /**
   * KORA-WP-116 addition. Required, explicit — never defaulted — per that
   * WP's own Founder Adjudication #2: "Do NOT add a loose optional
   * 'advisor id' parameter to generic recognition APIs if doing so weakens
   * the existing WP-112 authority boundary." This substrate stays
   * domain-agnostic (it takes only the already-typed recognition-source
   * enum, never an Advisor identity or Assignment reference); the KORAL
   * Review wrapper service (lib/living-koral-review/review-service.ts)
   * owns Assignment/identity/eligibility validation and passes
   * 'advisor-confirmed' only after all of it has passed.
   */
  recognitionSource: LivingKoralMaterialChangeRecognitionSource;
  actorRole: string;
  actorId: string;
}

/**
 * The Change Protocol's own "evidence/persistence assessment"
 * (Founder Correction 4). Promotes CANDIDATE -> RECOGNIZED only if
 * `reverifyAgainstSource()` confirms the transition still genuinely
 * holds against the real source record RIGHT NOW — never promotes from
 * the candidate's own already-recorded provenance alone. Returns null
 * (no-op) if the candidate does not exist, is not tenant-matched, or is
 * not currently CANDIDATE (already RECOGNIZED/SUPERSEDED — idempotent,
 * matching this WP's own established no-duplicate-work discipline).
 */
export async function assessMaterialChangeCandidate(params: AssessMaterialChangeCandidateParams): Promise<LivingKoralMaterialChangeRecord | null> {
  const db = getSupabaseServiceClient();

  const { data: candidate } = await db
    .schema('gov').from('living_koral_material_change')
    .select().eq('id', params.candidateId).eq('tenant_id', params.tenantId).maybeSingle();
  if (!candidate) return null;
  if ((candidate as { status: string }).status !== 'CANDIDATE') return toRecord(candidate as Record<string, unknown>);

  const reverified = await params.reverifyAgainstSource();
  if (!reverified) return toRecord(candidate as Record<string, unknown>); // stays CANDIDATE — never rejected/expired, per Founder decision (no such state exists)

  const { data: updated, error } = await db
    .schema('gov').from('living_koral_material_change')
    .update({ status: 'RECOGNIZED', recognized_at: new Date().toISOString(), recognition_source: params.recognitionSource })
    .eq('id', params.candidateId).eq('tenant_id', params.tenantId).eq('status', 'CANDIDATE')
    .select().single();

  if (error || !updated) {
    throw new Error(`[KORA] assessMaterialChangeCandidate failed: ${error?.message ?? 'no data returned'}`);
  }

  // Registry 142's own explicit Audit field: "every CANDIDATE→RECOGNIZED
  // promotion recorded via KORA-WP-006's governed-action substrate,
  // generic event vocabulary (no new WP-006 category invented)."
  await recordGovernanceEvent({
    sourceModule: 'living-koral-material-change',
    actorRole: params.actorRole,
    actorId: params.actorId,
    eventType: 'material_change.recognized',
    objectType: 'living_koral_material_change',
    objectId: params.candidateId,
    tenantId: params.tenantId,
  });

  return toRecord(updated as Record<string, unknown>);
}

export async function getMaterialChangeCandidate(id: string, tenantId: string): Promise<LivingKoralMaterialChangeRecord | null> {
  const db = getSupabaseServiceClient();
  const { data } = await db.schema('gov').from('living_koral_material_change').select().eq('id', id).eq('tenant_id', tenantId).maybeSingle();
  return data ? toRecord(data as Record<string, unknown>) : null;
}

export async function listMaterialChangesForTenant(tenantId: string): Promise<LivingKoralMaterialChangeRecord[]> {
  const db = getSupabaseServiceClient();
  const { data, error } = await db.schema('gov').from('living_koral_material_change').select().eq('tenant_id', tenantId).order('created_at', { ascending: false });
  if (error) throw new Error(`[KORA] listMaterialChangesForTenant failed: ${error.message}`);
  return (data ?? []).map((row) => toRecord(row as Record<string, unknown>));
}
