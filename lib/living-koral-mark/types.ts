// lib/living-koral-mark/types.ts
// KORA-WP-117 — Expression Mode Runtime + KORAL Mark Export.
//
// Contract: .kora-audit/output/178_KORA_WP_117_CANONICAL_PRE_CHECK.md §0
// (Founder Product Adjudication V2 — Organic Continuous Morphology) and
// the Founder's own binding Engineering Adjudication authorizing this
// implementation ("IMPLEMENT LEVEL A... The KORAL Mark should preserve
// real genealogical continuity wherever the existing canonical ledger/
// source lineage actually supports it").
//
// KORAL MARK — foundational definition (report 178 §0.2, verbatim):
// "A deterministic vector silhouette of the persistent morphological
// identity of one immutable KORAL Edition." Represents structural
// organization, continuity, and structural difference — never
// performance, quality, maturity, health, ranking, score, Advisor
// opinion, or Worker-level data.
//
// Deliberately absent from this file (out of WP-117's own scope, report
// 178 §0.1): any type for the 3D/Physical KORAL Manifestation, any
// mesh/STL/OBJ/3MF shape, any Portrait type (WP-115's own, untouched),
// any Commons/Public KORAL type (WP-118/119).
//
// RENDERER-NEUTRAL CONTRACT ONLY (report 191, WP-117 substrate
// stabilization, 2026-09-19): this file was trimmed to carry only the
// semantic/privacy-safe substrate contract — constants and types every
// canonical layer (Level A replay, Expression Mode projection,
// Morphological Compression, BoundedKoralGeometry) needs, independent
// of whether any visual renderer exists or is accepted. The (deferred)
// renderer's own output shapes — `MarkGeometry`, `KoralMarkResult`, and
// `KORAL_MARK_RENDERER_VERSION` — now live in `renderer-types.ts`
// instead, so this file and everything that imports it never pulls in
// renderer-specific concepts.

/**
 * Grammar version identifier (report 178 §0.9, doc 129 Part 25's own
 * reproducibility discipline extended here). Versions the renderer-
 * NEUTRAL semantic grammar (domain order, lineage shape, Expression Mode
 * allow-list) — consumed by both the neutral substrate and the (deferred)
 * renderer layer. An Edition's own semantic grammar rendered under v1
 * must remain reproducible after a future v2 exists — a future grammar
 * version ships as a new, additively-named constant, never by mutating
 * this one in place.
 */
export const KORAL_MARK_GRAMMAR_VERSION = 'koral-mark-v1';

/**
 * Canonical, FIXED, versioned domain iteration order — never derived from
 * SQL row order, JS object key order, or timestamps (Founder Engineering
 * Adjudication §12). Widened additively the day a second domain exists;
 * never reordered in place (reordering would silently reassign every
 * domain's own visual territory).
 */
export const CANONICAL_DOMAIN_ORDER = ['initiative'] as const;
export type CanonicalDomain = (typeof CANONICAL_DOMAIN_ORDER)[number];

/**
 * One structural element's lineage, as of one Edition's own frozen
 * boundary. `slotIndex` is a stable, first-emergence-order-based
 * identity — assigned once, on first `add_element`, NEVER reassigned,
 * NEVER reused by a later, unrelated element (Founder Engineering
 * Adjudication §7/§13: "Adding another element must not renumber all
 * prior morphology... Removing one element must not cause unrelated
 * branches to swap identity"). This is the ENTIRE continuity mechanism —
 * no other identity concept exists.
 *
 * Deliberately carries NO internal UUID, NO source-entity reference, NO
 * text of any kind — this is already the privacy-safe, allow-listed
 * shape (Founder Engineering Adjudication §5/§19: internal lineage
 * identity is used ONLY inside lib/living-koral-mark/edition-lineage-
 * service.ts's own local computation; it is structurally impossible for
 * it to reach this type, the renderer, or any client-visible payload).
 *
 * KORAL MORPHOLOGY PACKAGE A (2026-09-19, report 182 §3/§4/§5, report
 * 183): three new, event-derived, per-lineage fields — `extentStep`
 * (signed integer, RECOGNIZED Strengthening +1 / Weakening -1 relative to
 * the Emergence baseline of 0, NO floor — a lineage may weaken below its
 * own baseline without disappearing, per the Founder's own binding
 * correction), `directionOrdinal` (non-negative integer, RECOGNIZED
 * Reorientation count — the renderer alone maps this to a bounded cyclic
 * angle, never a stored angle), `stabilityState` (one-way
 * 'unsettled'->'settled', RECOGNIZED Stabilization, no reverse transition
 * in V1). All three are DERIVED BY REPLAY exactly like `present` already
 * is — never a separately-persisted mutable field (report 182 §6/§9).
 * Optional at the TYPE level only (so the many pre-existing synthetic test
 * payloads that predate Package A remain valid without modification,
 * report 182 §3's own disclosed backward-compatibility finding) —
 * reconstructEditionLineage() itself always populates all three
 * explicitly for every real element it returns.
 */
export interface LineageElement {
  readonly domain: CanonicalDomain;
  readonly slotIndex: number;
  /** Whether this element is still present as of the Edition's own boundary revision — false means it has since disappeared (still occupies its own permanent slot, never rendered, never reused). */
  readonly present: boolean;
  readonly extentStep?: number;
  readonly directionOrdinal?: number;
  readonly stabilityState?: 'unsettled' | 'settled';
}

/** The Level-A lineage reconstruction for one immutable Edition — lib/living-koral-mark/edition-lineage-service.ts's own sole output shape. */
export interface EditionLineageReconstruction {
  readonly tenantId: string;
  readonly editionId: string;
  readonly resultingStateRevision: number;
  readonly elements: readonly LineageElement[];
}

/**
 * Expression Mode's own positive allow-list output (report 178 §0's own
 * "minimum structural payload accepted by the Mark renderer" definition).
 * The ONLY shape the morphology engine is ever allowed to consume.
 *
 * KORAL MORPHOLOGY PACKAGE A (report 182 §3/§4/§5, Founder Package-A
 * task, "EXPRESSION MODE" section, verbatim: "Renderer-safe payload may
 * now include neutral morphology state such as... extentStep... direction
 * state/projection... stability state"): `extentStep`, `directionOrdinal`,
 * `stabilityState` join `slotIndex`/`present` as allow-listed fields.
 * Still no UUID, no Material Change id, no worker/Advisor/Review data, no
 * initiative title, no provenance prose, no free text — every field here
 * remains a neutral, structural, non-evaluative morphology fact.
 * `extentStep`/`directionOrdinal`/`stabilityState` are optional at the
 * TYPE level only (matching LineageElement's own note above); the
 * projector (expression-projection.ts) always fills them with their
 * canonical Emergence-baseline defaults (0 / 0 / 'unsettled') when a
 * caller's input omits them, so the projector's own OUTPUT is always
 * fully populated in practice.
 */
export interface ExpressionModeMarkPayload {
  readonly grammarVersion: string;
  readonly domains: readonly {
    readonly domain: CanonicalDomain;
    readonly elements: readonly {
      readonly slotIndex: number;
      readonly present: boolean;
      readonly extentStep?: number;
      readonly directionOrdinal?: number;
      readonly stabilityState?: 'unsettled' | 'settled';
    }[];
  }[];
}

// MarkGeometry / KoralMarkResult (the deferred renderer's own output
// shapes) moved to renderer-types.ts — see that file's own header.
