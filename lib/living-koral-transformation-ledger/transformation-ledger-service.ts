// lib/living-koral-transformation-ledger/transformation-ledger-service.ts
// KORA-WP-113 — Transformation Ledger + Morphogenesis Engine v1 +
// Continuity Contract v1.
//
// The ONLY module in this codebase permitted to mutate
// gov.living_koral_transformation_ledger or analytics.living_koral_state.
// Every write goes through recordLivingKoralTransformation() below, which
// itself does nothing but read (this WP's own domain-agnostic input) and
// then call gov.record_living_koral_transformation() — the single atomic
// DB function that performs the real mutation (migration 082's own
// header). No code in this module ever calls .insert()/.update() directly
// against either table — enforced structurally by this file's own shape,
// and checked by this WP's own structural test
// (tests/unit/kora-wp-113-transformation-ledger-morphogenesis.test.ts).
//
// Input authority (pre-check 170 §6, this task's own §2): only RECOGNIZED
// gov.living_koral_material_change rows may ever reach the RPC — CANDIDATE
// and SUPERSEDED are both rejected, server-side, inside the RPC itself
// (migration 082's own re-validation), never trusted from a caller.
//
// System-generated only (this task's own §8): the RPC's own
// actor_role='SYSTEM' CHECK constraint makes this a hard DB invariant, not
// merely an application convention — no caller of this module, human or
// otherwise, can ever attribute a transformation to a non-SYSTEM actor.

import { getSupabaseServiceClient } from '@/lib/supabase/server';
import { getMorphogenesisEngineVersion, getMorphogenesisOperationForCategory } from '@/lib/living-koral-morphogenesis-config/v1';
import type {
  LivingKoralStateRecord, LivingKoralStateRegion, LivingKoralTransformationLedgerRecord,
  RecordLivingKoralTransformationParams, RecordLivingKoralTransformationResult,
} from './types';
import type { MaterialChangeTaxonomyEntry } from '@/lib/living-koral-config/types';
import type { LivingKoralMorphogenesisOperation } from '@/lib/living-koral-morphogenesis-config/types';

function toLedgerRecord(row: Record<string, unknown>): LivingKoralTransformationLedgerRecord {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    materialChangeId: row.material_change_id as string,
    category: row.category as MaterialChangeTaxonomyEntry['category'],
    affectedDomain: row.affected_domain as 'initiative',
    taxonomyConfigVersion: row.taxonomy_config_version as string,
    morphogenesisEngineVersion: row.morphogenesis_engine_version as string,
    operation: row.operation as LivingKoralMorphogenesisOperation,
    resultingStateRevision: row.resulting_state_revision as number,
    occurredAt: row.occurred_at as string,
    recognizedAt: row.recognized_at as string,
    actorRole: row.actor_role as 'SYSTEM',
    actorId: row.actor_id as string,
    createdAt: row.created_at as string,
  };
}

function toRegions(raw: unknown): Readonly<Record<string, LivingKoralStateRegion>> {
  const source = (raw ?? {}) as Record<string, { element_count?: number }>;
  const regions: Record<string, LivingKoralStateRegion> = {};
  for (const [domain, value] of Object.entries(source)) {
    regions[domain] = { elementCount: value?.element_count ?? 0 };
  }
  return regions;
}

function toStateRecord(row: Record<string, unknown>): LivingKoralStateRecord {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    revision: row.revision as number,
    regions: toRegions(row.regions),
    morphogenesisEngineVersion: (row.morphogenesis_engine_version as string | null) ?? null,
    updatedFromLedgerId: (row.updated_from_ledger_id as string | null) ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

interface RecordTransformationRpcRow {
  created: boolean;
  ledger_id: string;
  tenant_id: string;
  category: MaterialChangeTaxonomyEntry['category'];
  resulting_state_revision: number;
}

/**
 * The sole entry point a domain adapter (today: only
 * lib/living-koral-material-change/initiative-adapter.ts, additively
 * wired) calls after a genuine CANDIDATE->RECOGNIZED promotion. Reads the
 * RECOGNIZED Material Change's own category (read-only — the row is
 * immutable once RECOGNIZED, WP-112's own update-invariant trigger, so
 * this read cannot race with a concurrent mutation of the same row),
 * computes the deterministic operation from KORA-WP-113's own versioned
 * config (never hardcoded), then delegates the entire atomic mutation to
 * gov.record_living_koral_transformation() — this function itself never
 * writes to either table directly.
 *
 * Idempotent: a duplicate/retried call for an already-ledgered Material
 * Change returns `created: false` and the existing ledger row's own
 * identity — never a second effective transformation (this task's own §5).
 */
export async function recordLivingKoralTransformation(params: RecordLivingKoralTransformationParams): Promise<RecordLivingKoralTransformationResult> {
  const db = getSupabaseServiceClient();

  const { data: materialChange, error: readError } = await db
    .schema('gov').from('living_koral_material_change')
    .select('category, status').eq('id', params.materialChangeId).eq('tenant_id', params.tenantId).maybeSingle();

  if (readError || !materialChange) {
    throw new Error(`[KORA] recordLivingKoralTransformation rejected: material change ${params.materialChangeId} not found for tenant ${params.tenantId}.`);
  }

  const category = (materialChange as { category: MaterialChangeTaxonomyEntry['category'] }).category;
  // Deterministic, config-driven — throws for a dormant category (this
  // task's own §13), never silently invents an operation.
  const operation = getMorphogenesisOperationForCategory(category);
  const engineVersion = getMorphogenesisEngineVersion();

  const { data, error } = await (
    db.schema('gov') as unknown as {
      rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>;
    }
  ).rpc('record_living_koral_transformation', {
    p_material_change_id: params.materialChangeId,
    p_operation: operation,
    p_morphogenesis_engine_version: engineVersion,
  });

  if (error || !data) {
    throw new Error(`[KORA] recordLivingKoralTransformation failed: ${error?.message ?? 'no data returned'}`);
  }

  const row = (Array.isArray(data) ? data[0] : data) as RecordTransformationRpcRow;
  return {
    created: row.created,
    ledgerId: row.ledger_id,
    tenantId: row.tenant_id,
    category: row.category,
    resultingStateRevision: row.resulting_state_revision,
  };
}

/** KORA_ADMIN read-access substrate (this task's own §9) — no UI, no route. */
export async function getCurrentLivingKoralState(tenantId: string): Promise<LivingKoralStateRecord | null> {
  const db = getSupabaseServiceClient();
  const { data } = await db.schema('analytics').from('living_koral_state').select().eq('tenant_id', tenantId).maybeSingle();
  return data ? toStateRecord(data as Record<string, unknown>) : null;
}

/**
 * KORA_ADMIN read-access substrate (this task's own §9) — canonical
 * Company-local order (`recognized_at` ASC, `created_at` ASC, `id` ASC as
 * final tiebreak — the same order replayLivingKoralStateFromLedger()
 * below folds over, so a caller comparing the two always sees a
 * consistent history).
 */
export async function listTransformationLedgerForTenant(tenantId: string): Promise<LivingKoralTransformationLedgerRecord[]> {
  const db = getSupabaseServiceClient();
  const { data, error } = await db
    .schema('gov').from('living_koral_transformation_ledger')
    .select().eq('tenant_id', tenantId)
    .order('recognized_at', { ascending: true }).order('created_at', { ascending: true }).order('id', { ascending: true });
  if (error) throw new Error(`[KORA] listTransformationLedgerForTenant failed: ${error.message}`);
  return (data ?? []).map((row) => toLedgerRecord(row as Record<string, unknown>));
}

/**
 * Pure, deterministic replay — reconstructs { revision, regions } from a
 * ledger history alone, in canonical Company-local order (see above).
 * Proves Registry 142's own Acceptance criterion ("canonical KORAL state
 * ... is fully reproducible from the ledger") directly and testably: a
 * caller can compare this function's output against
 * getCurrentLivingKoralState()'s live row for the same tenant and expect
 * an exact match. Never reads or writes the database itself — a plain
 * fold over already-fetched records, so it is trivially safe to call
 * against a synthetic ledger array in a unit test with no real DB.
 */
export function replayLivingKoralStateFromLedger(
  ledger: readonly LivingKoralTransformationLedgerRecord[],
): { revision: number; regions: Readonly<Record<string, LivingKoralStateRegion>> } {
  const ordered = [...ledger].sort((a, b) => {
    if (a.recognizedAt !== b.recognizedAt) return a.recognizedAt < b.recognizedAt ? -1 : 1;
    if (a.createdAt !== b.createdAt) return a.createdAt < b.createdAt ? -1 : 1;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });

  const regions: Record<string, LivingKoralStateRegion> = {};
  for (const entry of ordered) {
    const current = regions[entry.affectedDomain]?.elementCount ?? 0;
    // Widened for KORAL Morphology Package A (report 183 §4) — this was
    // previously a binary `? 1 : -1`, which silently treated ANY
    // non-add_element operation as a removal. The four Package-A
    // operations (increase_extent/decrease_extent/reorient/stabilize)
    // change extent/direction/stability, never the abstract per-domain
    // element count — delta = 0 for them, matching the same fix applied
    // to gov.record_living_koral_transformation()'s own v_delta in
    // migration 087.
    const delta = entry.operation === 'add_element' ? 1 : entry.operation === 'remove_element' ? -1 : 0;
    regions[entry.affectedDomain] = { elementCount: Math.max(0, current + delta) };
  }

  return { revision: ordered.length, regions };
}
