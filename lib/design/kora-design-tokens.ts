/**
 * KORA Design Token Foundation — Terracotta / Cosmic Blue / Warm Ivory
 *
 * Source authority for all visual tokens.
 * Use these constants in inline style={{}} props.
 * CSS custom properties mirror these in globals.css.
 *
 * Visual doctrine: executive intelligence platform / institutional premium
 * Reference: Financial Times, McKinsey reports, premium annual reports
 */

// ── Core brand palette ───────────────────────────────────────────────────────

export const KORA_COLORS = {
  TERRACOTTA:  '#C76F3D', // primary accent — KORA brandmark, active states, charts
  COSMIC_BLUE: '#06032B', // sidebar, ink base, high-authority elements
  WARM_IVORY:  '#EFEBE2', // main canvas / page background
  PAPER:       '#F8F6F1', // card / panel surface — premium paper
  TAUPE:       '#E3DDD3', // secondary surface, separators, disabled
  VIOLET:      '#6156F5', // secondary digital micro-accent — sparingly only
  SUCCESS:     '#2F7D55',
  WARNING:     '#D99A2B',
  CRITICAL:    '#9E3B2F',
} as const;

// ── Main token set — Terracotta / Cosmic Blue / Warm Ivory ──────────────────

export const TOKENS = {
  // Canvas & surface
  canvas:  '#EFEBE2',   // warm ivory — page background
  surface: '#F8F6F1',   // premium paper — cards, panels, tables
  taupe:   '#E3DDD3',   // secondary warm surface, separators

  // Ink scale — #06032B (cosmic blue) at opacity levels
  ink:          '#06032B',
  inkSecondary: 'rgba(6,3,43,0.62)',
  inkTertiary:  'rgba(6,3,43,0.42)',
  inkHint:      'rgba(6,3,43,0.40)',
  inkBorder:    'rgba(6,3,43,0.08)',
  inkBorderStrong: 'rgba(6,3,43,0.14)',
  inkTrack:     'rgba(6,3,43,0.08)',

  // Primary accent — terracotta (replaces violet as primary)
  accent:     '#C76F3D',
  accentSoft: 'rgba(199,111,61,0.12)',
  accentHover: 'rgba(199,111,61,0.06)',

  // Secondary digital accent — violet (sparingly only)
  violet: '#6156F5',

  // Sidebar
  sidebar: '#06032B',

  // Semantic
  success:  '#2F7D55',
  warning:  '#D99A2B',
  critical: '#9E3B2F',

  // Card system
  cardRadius:          '20px',
  cardRadiusSm:        '14px',
  cardBorder:          '1px solid rgba(6,3,43,0.08)',
  cardBorderStrong:    '1px solid rgba(6,3,43,0.14)',
  cardShadow:          '0 10px 30px rgba(6,3,43,0.05)',
  cardShadowHover:     '0 18px 45px rgba(6,3,43,0.10)',
  cardBorderHover:     '1px solid rgba(199,111,61,0.45)',

  // Safeguard states — canonical governance tokens
  safeguard: {
    pass: {
      bg:   'rgba(47,125,85,0.10)',
      text: '#2F7D55',
      dot:  '#2F7D55',
    },
    watch: {
      bg:   'rgba(217,154,43,0.12)',
      text: '#8A5A00',
      dot:  '#D99A2B',
    },
    cap: {
      bg:   'rgba(158,59,47,0.10)',
      text: '#9E3B2F',
      dot:  '#9E3B2F',
    },
  },
} as const;

// ── Chart color system — canonical, coherent, non-rainbow ───────────────────

export const CHART_COLORS = {
  primary:        '#C76F3D',   // main series — terracotta
  secondary:      '#D99767',   // secondary series — warm sand
  benchmark:      'rgba(6,3,43,0.35)', // dashed benchmark
  threshold:      '#06032B',   // dotted threshold line
  positive:       '#2F7D55',   // positive trend / above target
  warning:        '#D99A2B',   // warning zone
  critical:       '#9E3B2F',   // critical zone / below threshold
  fill:           'rgba(199,111,61,0.12)', // area fill — warm
  riskFill:       'rgba(217,154,43,0.12)', // risk zone fill
  grid:           'rgba(6,3,43,0.08)',
  axis:           'rgba(6,3,43,0.45)',
  tooltipBg:      '#06032B',
  tooltipText:    '#FFFFFF',
  tooltipBorder:  'rgba(199,111,61,0.45)',
} as const;

// ── Pillar colors — earth-tone coherent palette ──────────────────────────────

export const PILLAR_COLORS = {
  LIFE:       '#C76F3D',  // terracotta
  GROWTH:     '#2F7D55',  // forest green
  CONNECTION: '#D99767',  // warm sand / amber
  IMPACT:     '#D99A2B',  // amber / gold
  LEGACY:     '#8A7562',  // warm taupe / brown
} as const;

// ── Status colors — updated to canonical semantic tokens ────────────────────

export const STATUS_COLORS = {
  CLEAR:   '#2F7D55',
  WARNING: '#D99A2B',
  FLAGGED: '#9E3B2F',
} as const;

// ── Button tokens ────────────────────────────────────────────────────────────

export const BUTTON_TOKENS = {
  primary: {
    background: '#C76F3D',
    color:      '#FFFFFF',
    hover:      '#B5602E',
    radius:     '12px',
    shadow:     '0 4px 14px rgba(199,111,61,0.25)',
  },
  secondary: {
    background: 'transparent',
    border:     '1px solid rgba(6,3,43,0.14)',
    color:      '#06032B',
    hover:      'rgba(6,3,43,0.04)',
    radius:     '12px',
  },
  digital: {
    background: '#6156F5',
    color:      '#FFFFFF',
    radius:     '12px',
  },
} as const;

// ── Badge tokens ─────────────────────────────────────────────────────────────

export const BADGE_TOKENS = {
  eligible:  { bg: 'rgba(47,125,85,0.10)',   text: '#2F7D55',  border: 'rgba(47,125,85,0.25)'  },
  limited:   { bg: 'rgba(217,154,43,0.12)',  text: '#8A5A00',  border: 'rgba(217,154,43,0.30)' },
  blocked:   { bg: 'rgba(158,59,47,0.10)',   text: '#9E3B2F',  border: 'rgba(158,59,47,0.25)'  },
  draft:     { bg: 'rgba(6,3,43,0.06)',       text: 'rgba(6,3,43,0.62)', border: 'rgba(6,3,43,0.12)' },
  synthetic: { bg: 'rgba(199,111,61,0.10)',  text: '#C76F3D',  border: 'rgba(199,111,61,0.28)' },
} as const;

export type PillarColorKey = keyof typeof PILLAR_COLORS;
export type KoraColorKey = keyof typeof KORA_COLORS;
