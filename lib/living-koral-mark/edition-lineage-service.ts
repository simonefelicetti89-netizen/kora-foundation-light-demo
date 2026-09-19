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
import { CANONICAL_DOMAIN_ORDER, type CanonicalDomain, type LineageElement, type EditionLineageReconstruction } from './types';

interface LedgerReplayRow {
  material_change_id: string;
  affected_domain: string;
  operation: 'add_element' | 'remove_element' | 'increase_extent' | 'decrease_extent' | 'reorient' | 'stabilize';
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

  // Stable slot assignment — LOCAL to this function only. `key` (domain +
  // internal source_entity_id) never leaves this function: the returned
  // LineageElement carries only { domain, slotIndex, present, extentStep,
  // directionOrdinal, stabilityState } (see types.ts's own header) —
  // structurally impossible for the internal UUID to reach the renderer,
  // SVG, or any client-visible payload (Founder Engineering Adjudication
  // §5/§19).
  const slotByKey = new Map<string, number>();
  const nextSlotByDomain = new Map<CanonicalDomain, number>();
  const presentByKey = new Map<string, boolean>();

  // KORAL MORPHOLOGY PACKAGE A (report 182 §3/§4/§5, report 183) — three
  // more per-lineage replay accumulators, keyed by the SAME `key` as
  // above, each derived purely by counting/toggling RECOGNIZED events for
  // that lineage, exactly like presentByKey already is. Defaults match
  // each dimension's own Emergence baseline (report 182 §3/§4/§5):
  // extentStep=0, directionOrdinal=0, stabilityState='unsettled'.
  const extentByKey = new Map<string, number>();
  const directionByKey = new Map<string, number>();
  const stabilityByKey = new Map<string, 'unsettled' | 'settled'>();

  for (const row of rows) {
    const domain = row.affected_domain as CanonicalDomain;
    if (!(CANONICAL_DOMAIN_ORDER as readonly string[]).includes(domain)) continue; // defensive — a future, not-yet-configured domain
    const sourceEntityId = sourceByMaterialChangeId.get(row.material_change_id);
    if (!sourceEntityId) continue; // defensive — should not happen for a real, joined row

    const key = `${domain}:${sourceEntityId}`;

    if (row.operation === 'add_element') {
      if (!slotByKey.has(key)) {
        const next = nextSlotByDomain.get(domain) ?? 0;
        slotByKey.set(key, next);
        nextSlotByDomain.set(domain, next + 1);
      }
      presentByKey.set(key, true);
    } else if (row.operation === 'remove_element') {
      // The slot is permanently retired. It is never reused by a later,
      // unrelated element (Founder Engineering Adjudication §7:
      // "Removing one element must not cause unrelated branches to swap
      // identity") — nextSlotByDomain only ever increases, never rewound.
      presentByKey.set(key, false);
    } else if (row.operation === 'increase_extent') {
      // Strengthening — defensive: a Strengthening event can only ever
      // target an already-emerged lineage (Package A precondition, report
      // 183 §7); if this key has no slot yet (should not happen for a
      // real, correctly-sequenced ledger), the increment is still safely
      // recorded and simply never surfaces (no slot => not in `elements`).
      extentByKey.set(key, (extentByKey.get(key) ?? 0) + 1);
    } else if (row.operation === 'decrease_extent') {
      // Weakening — signed, NO floor at zero (Founder's own binding
      // correction, report 183 §7/§8: extentStep may go negative without
      // causing disappearance; Presence is a wholly separate transition).
      extentByKey.set(key, (extentByKey.get(key) ?? 0) - 1);
    } else if (row.operation === 'reorient') {
      directionByKey.set(key, (directionByKey.get(key) ?? 0) + 1);
    } else if (row.operation === 'stabilize') {
      // One-way — repeated stabilization of an already-'settled' lineage
      // is a safe, idempotent overwrite (report 182 §5: no reverse
      // transition exists in V1, so this can never regress to 'unsettled').
      stabilityByKey.set(key, 'settled');
    }
  }

  const elements: LineageElement[] = [...slotByKey.entries()].map(([key, slotIndex]) => {
    const domain = key.split(':')[0] as CanonicalDomain;
    return {
      domain,
      slotIndex,
      present: presentByKey.get(key) ?? false,
      extentStep: extentByKey.get(key) ?? 0,
      directionOrdinal: directionByKey.get(key) ?? 0,
      stabilityState: stabilityByKey.get(key) ?? 'unsettled',
    };
  });

  return { tenantId, editionId, resultingStateRevision: boundaryRevision, elements };
}
