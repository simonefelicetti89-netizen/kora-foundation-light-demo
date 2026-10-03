// lib/living-koral-mark/canonical-morphology-service.ts
// KORA-WP-145 — database side of the Canonical Morphology Engine v2.
//
// Fetches and orders the canonical event history, then hands it to the ONE
// pure fold (canonical-morphology.ts). This file never computes morphology
// itself. Ordering matches every other Living KORAL replay exactly:
// (recognized_at, created_at, id).
//
// SERVICE-ROLE READ, EXPLICIT TENANT SCOPING — the same "Pattern-A"
// discipline as edition-lineage-service.ts: the ledger is KORA_ADMIN-only
// under RLS, so a Company-facing read structurally needs the service
// client. tenantId always comes from an already-authenticated session
// upstream; every query below is tenant-scoped in code.

import { getSupabaseServiceClient } from '@/lib/supabase/server';
import { getMorphologyEngineVersion, isMorphologyAreaCode } from '@/lib/living-koral-morphology-config/v1';
import { foldCanonicalMorphology, hashCanonicalMorphologyState } from './canonical-morphology';
import type { CanonicalLedgerEvent, CanonicalMorphologyState } from './canonical-morphology-types';
import type { LivingKoralMorphogenesisOperation } from '@/lib/living-koral-morphogenesis-config/types';
import type { MaterialChangeTaxonomyEntry } from '@/lib/living-koral-config/types';

interface LedgerRow {
  material_change_id: string;
  category: MaterialChangeTaxonomyEntry['category'];
  operation: LivingKoralMorphogenesisOperation;
  affected_area: string | null;
  resulting_state_revision: number;
}

/** Canonical, ordered event history of one tenant up to (and including) a ledger revision. */
export async function fetchCanonicalLedgerEvents(tenantId: string, boundaryRevision: number): Promise<CanonicalLedgerEvent[]> {
  const db = getSupabaseServiceClient();

  const { data: ledgerRows, error } = await db
    .schema('gov').from('living_koral_transformation_ledger')
    .select('material_change_id, category, operation, affected_area, resulting_state_revision')
    .eq('tenant_id', tenantId)
    .lte('resulting_state_revision', boundaryRevision)
    .order('recognized_at', { ascending: true }).order('created_at', { ascending: true }).order('id', { ascending: true });
  if (error) throw new Error(`[KORA] fetchCanonicalLedgerEvents failed: ${error.message}`);

  const rows = (ledgerRows ?? []) as LedgerRow[];
  const ids = rows.map((r) => r.material_change_id);
  if (ids.length === 0) return [];

  const sourceById = new Map<string, string>();
  const { data: mcRows, error: mcError } = await db
    .schema('gov').from('living_koral_material_change')
    .select('id, source_entity_id')
    .eq('tenant_id', tenantId).in('id', ids);
  if (mcError) throw new Error(`[KORA] fetchCanonicalLedgerEvents failed: ${mcError.message}`);
  for (const r of (mcRows ?? []) as { id: string; source_entity_id: string }[]) sourceById.set(r.id, r.source_entity_id);

  // Founder M1: pre-WP-145 rows carry no area on the immutable ledger; their
  // one-time staging backfill lives in its own append-only table (migration 094).
  const backfillById = new Map<string, string>();
  const { data: backfillRows, error: backfillError } = await db
    .schema('gov').from('living_koral_morphology_area_backfill')
    .select('material_change_id, affected_area')
    .eq('tenant_id', tenantId).in('material_change_id', ids);
  if (backfillError) throw new Error(`[KORA] fetchCanonicalLedgerEvents failed: ${backfillError.message}`);
  for (const r of (backfillRows ?? []) as { material_change_id: string; affected_area: string }[]) backfillById.set(r.material_change_id, r.affected_area);

  const fuseIds = rows.filter((r) => r.operation === 'fuse').map((r) => r.material_change_id);
  const sourcesById = new Map<string, string[]>();
  if (fuseIds.length > 0) {
    const { data: srcRows, error: srcError } = await db
      .schema('gov').from('living_koral_consolidation_source')
      .select('material_change_id, source_entity_id')
      .eq('tenant_id', tenantId).in('material_change_id', fuseIds)
      .order('created_at', { ascending: true }).order('id', { ascending: true });
    if (srcError) throw new Error(`[KORA] fetchCanonicalLedgerEvents failed: ${srcError.message}`);
    for (const r of (srcRows ?? []) as { material_change_id: string; source_entity_id: string }[]) {
      const arr = sourcesById.get(r.material_change_id) ?? [];
      arr.push(r.source_entity_id);
      sourcesById.set(r.material_change_id, arr);
    }
  }

  const events: CanonicalLedgerEvent[] = [];
  rows.forEach((r, index) => {
    const sourceKey = sourceById.get(r.material_change_id);
    if (!sourceKey) return; // defensive — a ledger row always joins its Material Change
    const rawArea = r.affected_area ?? backfillById.get(r.material_change_id) ?? null;
    events.push({
      seq: index,
      operation: r.operation,
      category: r.category,
      sourceKey,
      area: isMorphologyAreaCode(rawArea) ? rawArea : null,
      consolidationSources: r.operation === 'fuse' ? sourcesById.get(r.material_change_id) ?? [] : undefined,
      resultingStateRevision: r.resulting_state_revision,
    });
  });
  return events;
}

export async function computeCanonicalMorphologyAtRevision(tenantId: string, boundaryRevision: number): Promise<CanonicalMorphologyState> {
  return foldCanonicalMorphology(await fetchCanonicalLedgerEvents(tenantId, boundaryRevision));
}

export interface EditionMorphologyRecord {
  readonly recorded: boolean;
  readonly morphologyEngineVersion: string;
  readonly morphologyStateHash: string;
}

/**
 * Crystallises an Edition under engine v2: rebuilds the canonical state at
 * the Edition's own boundary and records engine version + state hash ONCE
 * (migration 093, service-role-only, set-once). Idempotent: a second call
 * returns the already-recorded values unchanged.
 */
export async function recordEditionMorphology(params: { tenantId: string; editionId: string; boundaryRevision: number }): Promise<EditionMorphologyRecord> {
  const state = await computeCanonicalMorphologyAtRevision(params.tenantId, params.boundaryRevision);
  const db = getSupabaseServiceClient();
  const { data, error } = await (
    db.schema('analytics') as unknown as {
      rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>;
    }
  ).rpc('fn_record_living_koral_edition_morphology', {
    p_tenant_id: params.tenantId,
    p_edition_id: params.editionId,
    p_boundary_revision: params.boundaryRevision,
    p_engine_version: getMorphologyEngineVersion(),
    p_state_hash: hashCanonicalMorphologyState(state),
  });
  if (error || !data) throw new Error(`[KORA] recordEditionMorphology failed: ${error?.message ?? 'no data returned'}`);
  const row = (Array.isArray(data) ? data[0] : data) as { recorded: boolean; morphology_engine_version: string; morphology_state_hash: string };
  return { recorded: row.recorded, morphologyEngineVersion: row.morphology_engine_version, morphologyStateHash: row.morphology_state_hash };
}

export type EditionMorphologyVerification =
  | { readonly status: 'v1-legacy' }
  | { readonly status: 'unsupported-engine-version'; readonly engineVersion: string }
  | { readonly status: 'match'; readonly state: CanonicalMorphologyState; readonly hash: string }
  | { readonly status: 'mismatch'; readonly recordedHash: string; readonly rebuiltHash: string };

/**
 * Historical rebuild check: an Edition recorded under v2 must rebuild to
 * the identical state hash. A mismatch is an integrity alarm — never
 * silently re-rendered. Editions without a v2 record stay on the v1 path.
 */
export async function verifyEditionMorphology(params: {
  tenantId: string;
  boundaryRevision: number;
  morphologyEngineVersion: string | null;
  morphologyStateHash: string | null;
}): Promise<EditionMorphologyVerification> {
  if (!params.morphologyEngineVersion || !params.morphologyStateHash) return { status: 'v1-legacy' };
  if (params.morphologyEngineVersion !== getMorphologyEngineVersion()) {
    return { status: 'unsupported-engine-version', engineVersion: params.morphologyEngineVersion };
  }
  const state = await computeCanonicalMorphologyAtRevision(params.tenantId, params.boundaryRevision);
  const hash = hashCanonicalMorphologyState(state);
  return hash === params.morphologyStateHash
    ? { status: 'match', state, hash }
    : { status: 'mismatch', recordedHash: params.morphologyStateHash, rebuiltHash: hash };
}
