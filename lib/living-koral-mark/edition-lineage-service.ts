// lib/living-koral-mark/edition-lineage-service.ts
// KORA-WP-117 — Expression Mode Runtime + KORAL Mark Export.
//
// LEVEL A — TRUE MORPHOLOGICAL CONTINUITY (Founder Engineering
// Adjudication, binding, 2026-09-19): reconstructs stable, per-element
// lineage as of one immutable Edition's own frozen boundary, using the
// exact persisted chain report 178 §0.4 mechanically found — Edition →
// gov.living_koral_transformation_ledger → material_change_id →
// gov.living_koral_material_change.source_entity_id — never
// analytics.living_koral_state (aggregate-only, current-mutable-state
// only; would support Level B at best, and is the wrong source for an
// EDITION-bounded read regardless — see report 178 §0.4's own finding
// that living_koral_state reflects only the LATEST revision, not an
// older Edition's own historical one).
//
// NO MIGRATION — this reconstruction is a pure read/replay over already-
// persisted, immutable data (report 178 §0.4/§0.5: Level A requires no
// schema extension, only new application-level join logic, which is
// exactly what this file is).
//
// SERVICE-ROLE READ, EXPLICIT TENANT SCOPING (never RLS alone) — matching
// every other "Pattern-A" Living KORAL service in this engagement
// (material-change-service.ts, transformation-ledger-service.ts, review-
// service.ts): gov.living_koral_transformation_ledger's own RLS
// (migration 082) is KORA_ADMIN-only — a Company session cannot read it
// at all via RLS, so a Company-facing Mark feature structurally requires
// this pattern, not an RLS grant. tenantId is ALWAYS caller-supplied from
// an already-authenticated session (requireCompanyUser(), resolved
// before this module is ever called) — never trusted from a request
// body/query param — and every query below is explicitly tenant-scoped
// in code. This is NOT "service-role as an interactive-UI auth bypass"
// (the Founder's own explicit prohibition, §30): authentication and
// tenant resolution happen entirely upstream, at the API route layer,
// before this function is ever invoked.
//
// DELIBERATELY DOES NOT READ analytics.living_koral_edition ITSELF
// (mechanical finding during implementation): that table grants
// `authenticated` SELECT only (migration 085) — never `service_role` —
// so resolving "does this Edition exist for this tenant, and what is its
// own resulting_state_revision" is the CALLER's own job (mark-service.ts),
// done via the existing RLS-respecting
// getLivingKoralEditionById()/getSupabaseServerClient() path
// (lib/living-koral-edition/edition-service.ts), never via service-role,
// and never by adding a new GRANT/migration for this WP to bypass it —
// this function receives an already-resolved `boundaryRevision` instead.

import { getSupabaseServiceClient } from '@/lib/supabase/server';
import type { EditionLineageReconstruction } from './types';
import { foldLineage, type LineageFoldRow } from './lineage-fold';

interface LedgerReplayRow {
  material_change_id: string;
  affected_domain: string;
  operation: 'add_element' | 'remove_element' | 'increase_extent' | 'decrease_extent' | 'reorient' | 'stabilize' | 'fuse';
}

/**
 * Reconstructs the full lineage (both currently-present and since-
 * disappeared elements, each in its own permanent slot) as of one
 * Edition's own frozen `resulting_state_revision` boundary — the caller
 * (mark-service.ts) has already, separately, RLS-safely confirmed this
 * Edition belongs to this tenant before calling this function (Founder
 * Engineering Adjudication §31: "Avoid exposing whether a foreign
 * Edition exists" — enforced upstream, by the existing Edition read
 * path, not here).
 *
 * Replay must stop EXACTLY at the Edition's own boundary revision — a
 * later transformation must never be consumed (Founder Engineering
 * Adjudication §6: "Edition N rendered after Edition N+3 exists must
 * still produce exactly the Edition N Mark"). The `.lte(...)` filter
 * below is the entire mechanism; ordering matches
 * replayLivingKoralStateFromLedger()'s own established canonical order
 * (recognized_at, created_at, id) exactly, so the two replays can never
 * silently disagree about event order.
 */
export async function reconstructEditionLineage(tenantId: string, editionId: string, boundaryRevision: number): Promise<EditionLineageReconstruction> {
  const db = getSupabaseServiceClient();

  const { data: ledgerRows, error: ledgerError } = await db
    .schema('gov').from('living_koral_transformation_ledger')
    .select('material_change_id, affected_domain, operation')
    .eq('tenant_id', tenantId)
    .lte('resulting_state_revision', boundaryRevision)
    .order('recognized_at', { ascending: true }).order('created_at', { ascending: true }).order('id', { ascending: true });

  if (ledgerError) {
    throw new Error(`[KORA] reconstructEditionLineage failed: ${ledgerError.message}`);
  }

  const rows = (ledgerRows ?? []) as LedgerReplayRow[];
  const materialChangeIds = rows.map((r) => r.material_change_id);

  const sourceByMaterialChangeId = new Map<string, string>();
  if (materialChangeIds.length > 0) {
    const { data: mcRows, error: mcError } = await db
      .schema('gov').from('living_koral_material_change')
      .select('id, source_entity_id')
      .eq('tenant_id', tenantId)
      .in('id', materialChangeIds);

    if (mcError) {
      throw new Error(`[KORA] reconstructEditionLineage failed: ${mcError.message}`);
    }
    for (const row of (mcRows ?? []) as { id: string; source_entity_id: string }[]) {
      sourceByMaterialChangeId.set(row.id, row.source_entity_id);
    }
  }

  const foldRows: LineageFoldRow[] = [];
  for (const row of rows) {
    const sourceEntityId = sourceByMaterialChangeId.get(row.material_change_id);
    if (!sourceEntityId) continue; // defensive — should not happen for a real, joined row
    foldRows.push({ domain: row.affected_domain, sourceEntityId, operation: row.operation });
  }
  const elements = foldLineage(foldRows);

  return { tenantId, editionId, resultingStateRevision: boundaryRevision, elements };
}
