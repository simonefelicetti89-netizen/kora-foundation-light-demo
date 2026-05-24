/**
 * KORA Design Token Foundation
 *
 * Source authority for brand colors.
 * Typography tokens deferred — no font files in repository.
 *
 * Extraction method:
 *   CONFIRMED  — read directly from SVG fill/rect attributes in official logo files
 *                (docs/Documenti grafici KORA/)
 *   INFERRED   — visually sampled from official color swatch screenshot;
 *                mark TODO for designer confirmation before production
 *   DERIVED    — constitutionally derived from Doc 17 using KORA_VIOLET as base;
 *                no official per-pillar hex values exist in the repository
 */

// ── Core brand palette ───────────────────────────────────────────────────────

export const KORA_COLORS = {
  VIOLET:      '#6156F5', // CONFIRMED — SVG brandmark fill, all official logo files
  COSMIC_BLUE: '#06032B', // CONFIRMED — SVG wordmark text + dark bg, all official logo files
  GRAY_BASE:   '#F5F6FA', // INFERRED — official color swatch screenshot; TODO: designer confirm
  FUN_GREEN:   '#C8FF47', // INFERRED — official color swatch screenshot; TODO: designer confirm
} as const;

// ── Pillar colors ─────────────────────────────────────────────────────────────
// DERIVED from KORA_VIOLET per Doc 17 constitutional direction.
// All values provisional — must be confirmed with designer before production use.

export const PILLAR_COLORS = {
  LIFE:       '#5185EE', // cool blue toward Violet family
  GROWTH:     '#7B61F5', // warmer Violet tint
  CONNECTION: '#9574EA', // softer purple-violet
  IMPACT:     '#C8FF47', // Fun Green — IMPACT = external/community contribution
  LEGACY:     '#3F3A8F', // deep desaturated Violet toward Cosmic Blue
} as const;

// ── Status colors ─────────────────────────────────────────────────────────────
// Provisional — semantic mapping to KORA palette pending designer confirmation.

export const STATUS_COLORS = {
  CLEAR:   '#C8FF47', // Fun Green — positive activation signal
  WARNING: '#F5A623', // TODO: not in KORA palette — placeholder pending brand decision
  FLAGGED: '#D0021B', // TODO: not in KORA palette — placeholder pending brand decision
} as const;

export type PillarColorKey = keyof typeof PILLAR_COLORS;
export type KoraColorKey = keyof typeof KORA_COLORS;
