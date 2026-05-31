/**
 * KORA Design Token Foundation — Avorio / Inchiostro / Viola
 *
 * Source authority for all visual tokens.
 * Use these constants in inline style={{}} props.
 * CSS custom properties mirror these in globals.css.
 *
 * Extraction method:
 *   CONFIRMED  — read directly from SVG fill/rect attributes in official logo files
 *   INFERRED   — visually sampled from official color swatch screenshot
 *   DERIVED    — derived from Doc 17 using KORA_VIOLET as base
 *   CANONICAL  — defined in design system spec (Avorio/Inchiostro rollout)
 */

// ── Core brand palette ───────────────────────────────────────────────────────

export const KORA_COLORS = {
  VIOLET:      '#6156F5', // CONFIRMED — SVG brandmark fill, all official logo files
  COSMIC_BLUE: '#14122E', // CANONICAL — ink base (Avorio/Inchiostro system)
  GRAY_BASE:   '#F5F6FA', // INFERRED — official color swatch screenshot; legacy
  FUN_GREEN:   '#C8FF47', // INFERRED — official color swatch screenshot
} as const;

// ── Avorio / Inchiostro / Viola — canonical palette ─────────────────────────

export const TOKENS = {
  // Canvas & surface
  canvas:  '#F4F1E9',   // page background — warm ivory
  surface: '#FFFFFF',   // card / panel background

  // Ink scale — #14122E at opacity levels
  ink:          '#14122E',
  inkSecondary: 'rgba(20,18,46,0.60)',
  inkTertiary:  'rgba(20,18,46,0.42)',
  inkHint:      'rgba(20,18,46,0.40)',
  inkBorder:    'rgba(20,18,46,0.08)',
  inkTrack:     'rgba(20,18,46,0.08)',

  // Accent — violet, instruments/links/brandmark only
  accent: '#6156F5',

  // Card
  cardRadius:  '14px',
  cardBorder:  '1px solid rgba(20,18,46,0.08)',

  // Safeguard states — canonical tokens
  safeguard: {
    pass: {
      bg:   'rgba(99,153,34,0.13)',
      text: '#3B6D11',
      dot:  '#6f9e1f',
    },
    watch: {
      bg:   'rgba(186,117,23,0.14)',
      text: '#854F0B',
      dot:  '#ba7517',
    },
    cap: {
      bg:   'rgba(163,45,45,0.12)',
      text: '#791F1F',
      dot:  '#a32d2d',
    },
  },
} as const;

// ── Pillar colors ─────────────────────────────────────────────────────────────

export const PILLAR_COLORS = {
  LIFE:       '#5185EE',
  GROWTH:     '#7B61F5',
  CONNECTION: '#9574EA',
  IMPACT:     '#C8FF47',
  LEGACY:     '#3F3A8F',
} as const;

// ── Status colors (legacy — prefer TOKENS.safeguard) ─────────────────────────

export const STATUS_COLORS = {
  CLEAR:   '#6f9e1f',
  WARNING: '#ba7517',
  FLAGGED: '#a32d2d',
} as const;

export type PillarColorKey = keyof typeof PILLAR_COLORS;
export type KoraColorKey = keyof typeof KORA_COLORS;
