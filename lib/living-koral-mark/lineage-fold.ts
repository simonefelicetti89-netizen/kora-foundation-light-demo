// lib/living-koral-mark/lineage-fold.ts
// KORA-WP-145 — the v1 Level A lineage replay loop, extracted verbatim from
// edition-lineage-service.ts into a pure function so it can be exercised
// without a database. Behaviour is unchanged: v1 Editions must keep
// reconstructing byte-identically. The KORA-WP-145 `fuse` operation is not
// a v1 operation and is ignored here, exactly as any unknown operation was.

import { CANONICAL_DOMAIN_ORDER, type CanonicalDomain, type LineageElement } from './types';

/** One replay row, already joined to its Material Change's source entity, in canonical ledger order. */
export interface LineageFoldRow {
  readonly domain: string;
  readonly sourceEntityId: string;
  readonly operation: string;
}

export function foldLineage(rows: readonly LineageFoldRow[]): LineageElement[] {
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
    const domain = row.domain as CanonicalDomain;
    if (!(CANONICAL_DOMAIN_ORDER as readonly string[]).includes(domain)) continue; // defensive — a future, not-yet-configured domain
    const sourceEntityId = row.sourceEntityId;

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

  return elements;
}
