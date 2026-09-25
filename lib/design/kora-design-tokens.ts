/**
 * KORA Design Token Foundation — Terracotta / Cosmic Blue / Warm Ivory
 *
 * Source authority for all visual tokens.
 * Use these constants in inline style={{}} props.
 * CSS custom properties mirror these in globals.css.
 *
 * Visual doctrine: executive intelligence platform / institutional premium
 * Reference: Financial Times, McKinsey reports, premium annual reports
 *
 * ── FOUNDER COLOUR ADJUDICATION (KORA-WP-088) ───────────────────────────────
 * The Founder has ratified THIS FILE as the canonical KORA colour system:
 *
 *   • the warm KORA token direction is canonical;
 *   • the current pillar colour direction (PILLAR_COLORS below) is canonical;
 *   • terracotta (#C76F3D) remains an allowed KORA primary/accent role;
 *   • warm pillar colours remain allowed;
 *   • docs/30 §6.1/§6.2/§22's former requirement that pillars remain
 *     exclusively within a cool blue-violet family is SUPERSEDED by that
 *     explicit adjudication — docs/30 remains governing for typography,
 *     accessibility (§21) and its non-colour sections;
 *   • no external designer/Figma palette is required to proceed;
 *   • #06032B (Cosmic Blue) and #6156F5 (Violet) remain valid official brand
 *     colours in their existing roles — both are present in the official
 *     brandmark assets under docs/Documenti grafici KORA/;
 *   • violet is NOT promoted into the mandatory pillar family.
 *
 * Consequence for implementation: this file is the starting truth. New tokens
 * are added only where a concrete violation requires one, no existing
 * canonical token carries the right semantic role, and the value is
 * mechanically justified from the ratified system — never invented for
 * aesthetic uniformity. Full record: .kora-audit/output/201 and /202.
 *
 * ── FINAL FOUNDER COLOUR ADJUDICATION (KORA-WP-088, second pass) ────────────
 * The five remaining semantic questions raised by the audit in
 * .kora-audit/output/203 have now been adjudicated. No value below is
 * invented: each is ratified from evidenced repository usage.
 *
 *   Q1 INFORMATIONAL / IN-PROCESS / LINK  → APPROVED as `TOKENS.info`.
 *      Base #3B6EBA, on-tint text #1E4A8A. A SEMANTIC FUNCTIONAL BLUE.
 *      It is NOT a pillar colour, NOT a maturity colour, NOT a performance
 *      colour and NOT the KORA primary brand colour. The warm KORA brand
 *      system remains canonical.
 *   Q2 SOLID INK BUTTON HOVER             → APPROVED as `BUTTON_TOKENS.ink.hover`
 *      #1A1756. Canonical hover for the solid #06032B ink button. No redesign.
 *   Q3 SOFT WARM INSET PANEL              → APPROVED as `TOKENS.insetPanel`
 *      #FFFAF5. Deliberately DISTINCT from TOKENS.surface (#F8F6F1): repository
 *      truth shows a stable, repeated "recessed explanatory panel + dashed
 *      inkBorder" treatment. Do NOT generalise this token beyond that role.
 *   Q4 KORA INDEX MACROBLOCK SERIES       → APPROVED as `MACROBLOCK_COLORS`.
 *      Categorical data-visualisation differentiation ONLY. NOT pillar
 *      colours, NOT status, NOT performance levels, NOT good/bad, NOT
 *      general-purpose UI accents. Pillar semantics are never reused here.
 *   Q5 KORA LIME #C8FF47                  → NOT promoted into this token
 *      system. In-app occurrences were synthetic-data badges and now use
 *      BADGE_TOKENS.synthetic. Lime remains confined to the separately
 *      governed Decision Pack export template.
 *
 * Full record: .kora-audit/output/203 and /204.
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
  ink:             '#06032B',
  inkSecondary:    'rgba(6,3,43,0.62)',
  inkTertiary:     'rgba(6,3,43,0.42)',
  inkHint:         'rgba(6,3,43,0.40)',
  inkMeta:         'rgba(6,3,43,0.38)',  // provenance, methodology stamps
  inkBorder:       'rgba(6,3,43,0.08)',
  inkBorderStrong: 'rgba(6,3,43,0.14)',
  inkTrack:        'rgba(6,3,43,0.08)',

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

  // Informational / in-process — Founder Q1 (KORA-WP-088). The fourth status
  // role beside success/warning/critical: "in lavorazione", "in attesa",
  // "iscritto", "preview", and the inline-link colour where that role applies.
  // Semantic functional blue — never a pillar, maturity or performance colour.
  // `text` is the accessible on-tint depth, exactly as safeguard.watch.text
  // (#8A5A00) relates to warning (#D99A2B).
  info: {
    base:   '#3B6EBA',
    text:   '#1E4A8A',
    bg:     'rgba(59,110,186,0.08)',
    border: 'rgba(59,110,186,0.22)',
  },

  // Recessed inset panel — Founder Q3 (KORA-WP-088). ONLY for the recessed
  // explanatory/inset panel inside a card, which the repository consistently
  // draws as `background: insetPanel` + a dashed inkBorder. Deliberately one
  // step off `surface` so the recess reads. Do not use it as a card surface.
  insetPanel: '#FFFAF5',

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

// ── Z-index scale ────────────────────────────────────────────────────────────

export const Z = {
  base:    0,
  raised:  10,
  sticky:  40,
  nav:     80,
  modal:   200,
  tooltip: 300,
} as const;

// ── Spacing scale (used in padding/gap, referenced in EXPERIENCE_LAYER) ──────

export const SPACE = {
  xs:  4,
  sm:  8,
  md:  16,
  lg:  24,
  xl:  32,
  '2xl': 48,
} as const;

// ── Motion durations (ms) ────────────────────────────────────────────────────

export const DURATION = {
  fast:    140,
  normal:  180,
  slow:    300,
  reveal:  800,
  countUp: 1700,
  bar:     1300,
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
// RATIFIED CANONICAL (Founder colour adjudication, KORA-WP-088 — see file
// header). These five values ARE the canonical pillar identity. Any earlier
// docs/30 §6.1/§6.2/§22.2 direction toward a cool blue-violet pillar family,
// and its "current value is wrong" annotations, are superseded. Every pillar
// usage in the application must route through this token, never a literal.

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
  // Solid ink button — Founder Q2 (KORA-WP-088). `hover` is the canonical
  // hover of the solid #06032B button. secondary.hover (a 4% ink tint) is for
  // the TRANSPARENT button and is invisible on a solid ink fill, so it cannot
  // serve here. #1A1756 relates to #06032B as #B5602E relates to #C76F3D.
  ink: {
    background: '#06032B',
    color:      '#FFFFFF',
    hover:      '#1A1756',
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
  // Founder Q1 (KORA-WP-088) — the informational/in-process badge. Same values
  // as TOKENS.info, expressed in the badge triad shape used by this group.
  info:      { bg: 'rgba(59,110,186,0.08)',  text: '#1E4A8A',  border: 'rgba(59,110,186,0.22)' },
} as const;

// ── KORA Index macroblock series — Founder Q4 (KORA-WP-088) ─────────────────
// The four KORA Index v3 macroblocks rendered as four mutually distinguishable
// data-visualisation series. RATIFIED ONLY AS CATEGORICAL DIFFERENTIATION.
// These are NOT pillar colours, NOT status colours, NOT performance levels,
// NOT good/bad colours and NOT general-purpose UI accents. Pillar semantics
// are deliberately not reused here: a pillar colour must never also mean a
// macroblock. Weights live in lib/methodology-config — never here.
export const MACROBLOCK_COLORS = {
  REACH:   '#3B6EBA',
  QUALITY: '#2F7D55',
  EQUITY:  '#7C3D8F',
  BTI:     '#C07D2A',
} as const;

export type MacroblockColorKey = keyof typeof MACROBLOCK_COLORS;

export type PillarColorKey = keyof typeof PILLAR_COLORS;
export type KoraColorKey = keyof typeof KORA_COLORS;

// ── Pillar surface tints (KORA-WP-088) ──────────────────────────────────────
// WHY THIS EXISTS: ~20 screens had each defined their own local pillar→colour
// map, several of them literally shadowing the `PILLAR_COLORS` identifier with
// *different* values — so the same pillar rendered green on one screen,
// terracotta on another and blue on a third. That is the core
// KORA-GAP-DESIGN-001 divergence. These are not new brand colours: each value
// is the RATIFIED pillar colour above, expressed at the alpha levels this
// token file already uses for soft/border treatments (cf. `accentSoft` 0.12
// and `cardBorderHover` 0.45). Nothing is invented.

function hexToRgbTriplet(hex: string): string {
  const h = hex.replace('#', '');
  return `${parseInt(h.slice(0, 2), 16)},${parseInt(h.slice(2, 4), 16)},${parseInt(h.slice(4, 6), 16)}`;
}

/** Canonical per-pillar surface set: the ratified pillar colour + its soft background and border tints. */
export const PILLAR_SURFACE: Record<PillarColorKey, { color: string; bg: string; border: string }> =
  Object.fromEntries(
    (Object.keys(PILLAR_COLORS) as PillarColorKey[]).map((k) => {
      const rgb = hexToRgbTriplet(PILLAR_COLORS[k]);
      return [k, { color: PILLAR_COLORS[k], bg: `rgba(${rgb},0.08)`, border: `rgba(${rgb},0.22)` }];
    }),
  ) as Record<PillarColorKey, { color: string; bg: string; border: string }>;

// ── Activation Signature tokens — B140-C ─────────────────────────────────────
// Dedicated token group for KORA Activation Signature and KORA Link card.
// These values are separate from and do NOT replace:
//   TERRACOTTA #C76F3D, TOKENS.canvas #EFEBE2, TOKENS.ink/sidebar #06032B
export const ACTIVATION_SIGNATURE = {
  cotto:   '#B5512E',  // STRATO band color — monocromo proprietario
  inkWarm: '#211F1A',  // KORA Link card background — premium warm/materico
  canvas:  '#F6F4EF',  // light surface for negative variant (STRATO on dark)
} as const;

// ════════════════════════════════════════════════════════════════════════════
// KORA-WP-125 — SHARED PRODUCT EXPERIENCE REGISTER (PX-B)
// ════════════════════════════════════════════════════════════════════════════
//
// The canonical implementation of the Founder-approved KORA Product Experience
// (`KORA-WP-124`, Gate I, 2026-09-20). Every value below is transcribed from
// `design/wp124-final/kora-signal.css`, the normative visual source accepted at
// that gate. Nothing here is invented, and no value may be added that does not
// exist in that source — a test enforces it.
//
// WHY IT LIVES IN THIS FILE, additively, rather than in a new module:
// KORA-WP-088's presentation-colour guard treats this file as "the canonical
// token source itself" and `app/globals.css` as its CSS-variable mirror. Both
// are already the single sanctioned place for colour literals. Declaring the
// Product Experience register here therefore needs NO new hex exemption, keeps
// the guard at full force over every other file, and makes page-local token
// adapters (the KORA-WP-039 pattern) permanently unnecessary. Founder-approved
// staged strategy, Option C: additive, legacy exports untouched.
//
// The warm legacy register above remains valid and in use by ~196 files. It is
// compatibility-only for new Product Experience work; its retirement belongs to
// PX-C, never to this package.
//
// Consumers: the shared application shell and the shared primitives in
// `components/ui/*`. New Product Experience surfaces consume PX, never the
// legacy register. Data-register values (PILLAR_COLORS, MACROBLOCK_COLORS) are
// unchanged and remain the single source for pillar and macroblock meaning.

export const PX = {
  // ── Canvas & surfaces — HANDOFF §1. Cool, never beige: white panels must
  //    read as lit, not as paper. ───────────────────────────────────────────
  l0:      '#EAECF4',   // application canvas
  l1:      '#FFFFFF',   // primary working surface
  l2:      '#F4F6FC',   // analytical / functional panel, inset in L1
  l2Edge:  '#E7EAF5',

  // ── Workspace shell — HANDOFF §2 ─────────────────────────────────────────
  nav:     '#06032B',
  nav2:    '#0C0742',
  navLine: 'rgba(255,255,255,0.09)',
  /** Real text on the shell: must clear AA, hence .62 not .25 (HANDOFF §2/§15). */
  navGroupLabel: 'rgba(255,255,255,0.62)',
  navItem:       'rgba(255,255,255,0.66)',
  navItemHover:  'rgba(255,255,255,0.07)',

  // ── Ink — HANDOFF §7. inkMute is NON-TEXT only. ─────────────────────────
  ink:     '#06032B',
  ink2:    'rgba(6,3,43,0.70)',
  ink3:    'rgba(6,3,43,0.58)',
  inkMute: 'rgba(6,3,43,0.34)',
  inkWash: 'rgba(6,3,43,0.055)',

  // ── Product register — HANDOFF §7 ────────────────────────────────────────
  violet:     '#6156F5',
  violet700:  '#4A3DE0',
  violetTint: 'rgba(97,86,245,0.09)',
  violetEdge: 'rgba(97,86,245,0.30)',
  onViolet:   '#FFFFFF',
  cyan:       '#2BB7D9',

  // ── Semantic state: fill and text are separate tokens — HANDOFF §7 ───────
  ok:       '#2F7D55',  okTint:   'rgba(47,125,85,0.10)',
  warn:     '#D99A2B',  warnText: '#8A5A00',  warnTint: 'rgba(217,154,43,0.13)',
  risk:     '#9E3B2F',  riskTint: 'rgba(158,59,47,0.10)',
  info:     '#3B6EBA',  infoText: '#1E4A8A',  infoTint: 'rgba(59,110,186,0.10)',

  // ── Borders — HANDOFF §6. Structure is allowed to show. ─────────────────
  line:  'rgba(6,3,43,0.09)',
  line2: 'rgba(6,3,43,0.14)',

  // ── Elevation — two levels, cool, no coloured shadow, no glow (§6) ──────
  sh1: '0 1px 2px rgba(6,3,43,0.06), 0 1px 3px rgba(6,3,43,0.04)',
  sh2: '0 1px 2px rgba(6,3,43,0.05), 0 8px 18px -8px rgba(6,3,43,0.14)',
  sh3: '0 2px 6px rgba(6,3,43,0.07), 0 18px 40px -12px rgba(6,3,43,0.22)',

  // ── Interaction surfaces — HANDOFF §6, §9 ───────────────────────────────
  rowHover:              '#FAFBFF',
  ctlHoverBorder:        'rgba(6,3,43,0.24)',
  ctlHoverBorderStrong:  'rgba(6,3,43,0.22)',
  skelInk:               'rgba(6,3,43,0.07)',

  // ── Primary control gradient — HANDOFF §6 ───────────────────────────────
  btnFrom:      '#6F64F7',
  btnTo:        '#5648EC',
  btnHoverFrom: '#7A70FF',
  btnHoverTo:   '#4A3DE0',
  btnShadow:    '0 1px 2px rgba(6,3,43,0.16), inset 0 1px 0 rgba(255,255,255,0.22)',
  inkHover:     '#17123F',   // solid-ink control hover — kora-signal.css .btn-ink:hover
  inkShadow:    '0 1px 2px rgba(6,3,43,0.18), inset 0 1px 0 rgba(255,255,255,0.12)',

  // ── Geometry — HANDOFF §6 ────────────────────────────────────────────────
  rPanel: '14px', rInner: '10px', rCtl: '8px', rChip: '6px', rPill: '999px',

  // ── Shell geometry — HANDOFF §2, §14 ─────────────────────────────────────
  navW:     '248px',
  navRailW: '68px',
  topH:     '56px',

  // ── Motion — HANDOFF §13 ─────────────────────────────────────────────────
  t1: '90ms', t2: '160ms', t3: '280ms',
  ease: 'cubic-bezier(.2,.6,.25,1)',

  // ── Type — HANDOFF §4. Plus Jakarta Sans only; NO serif in Product UI. ──
  sans: "'Plus Jakarta Sans', var(--font-jakarta), ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif",
} as const;

/** Breakpoints — HANDOFF §14. The shell is viewport-governed at these widths
 *  (Founder Decision 3); content primitives adapt to their own container. */
/** Breakpoint values. `mobile` is 767, not HANDOFF §14's 720, deliberately:
 *  767 is Tailwind's `md` boundary, which KORA-WP-088's completed guard already
 *  pins in Sidebar (`md:static`, `md:translate-x-0`). Any other value would open
 *  a band where the CSS shell state and those pinned classes disagree — exactly
 *  the viewport/reality mismatch KORA-WP-039 was broken by. Deviation recorded
 *  for Founder review rather than silently absorbed. */
export const PX_BREAKPOINTS = { rail: 1200, stack: 900, mobile: 767 } as const;

/** Shell state derived from viewport width. Presentation only — it changes no
 *  route, no navigation item and no role visibility. */
export type PxShellState = 'full' | 'rail' | 'mobile';

export function resolvePxShellState(viewportWidth: number): PxShellState {
  if (viewportWidth <= PX_BREAKPOINTS.mobile) return 'mobile';
  if (viewportWidth <= PX_BREAKPOINTS.rail) return 'rail';
  return 'full';
}

/** Semantic tone → its fill/text/tint triple. Colour is never the only signal:
 *  every consumer pairs this with a word and a dot (HANDOFF §12, §15). */
export const PX_TONE = {
  ok:   { fill: PX.ok,   text: PX.ok,       tint: PX.okTint   },
  warn: { fill: PX.warn, text: PX.warnText, tint: PX.warnTint },
  risk: { fill: PX.risk, text: PX.risk,     tint: PX.riskTint },
  info: { fill: PX.info, text: PX.infoText, tint: PX.infoTint },
  idle: { fill: PX.inkMute, text: PX.ink3,  tint: PX.inkWash  },
} as const;

export type PxTone = keyof typeof PX_TONE;

// ── KORA-WP-139 — the canonical type scale ───────────────────────────────────
//
// Nine semantic roles, nine steps, no tenth. The values are transcribed from
// docs/BENCHMARK_V2_CANONICAL_GRAMMAR.md §5, the Founder-ratified artifact — not
// from the WP-124 prototype, whose lower register sat 1–3px below the Benchmark
// V2 bar and is superseded for type (it remains normative for COLOUR, which is
// why the PX block above is untouched).
//
// THIS IS THE ONLY NUMERIC AUTHORITY. The `.kt-*` classes in app/globals.css
// exist so the three roles that need a mobile variant can have one — inline
// styles cannot carry a media query — and a test asserts those classes match
// these numbers exactly, so the two cannot drift.
//
// WHY A ROLE AND NOT A SIZE: a caller that asks for "13px" has made a visual
// decision with no meaning attached, which is how 2,601 inline decisions
// accumulated. A caller that asks for `label` has stated what the text IS, and
// the size follows.

/** Absolute floor. No canonical Product text renders below this. */
export const TYPE_FLOOR_PX = 11;
/** Floor for anything read in sequence. 11px is for `meta` alone. */
export const TYPE_READING_FLOOR_PX = 12;

export const TYPE_ROLES = [
  'display', 'title', 'section', 'subsection',
  'body', 'secondary', 'label', 'caption', 'meta',
] as const;

export type TypeRole = (typeof TYPE_ROLES)[number];

export interface TypeStep {
  /** Desktop size in px. */
  readonly size: number;
  /** Mobile size, only where a role genuinely overflows a 375px viewport. */
  readonly mobile?: number;
  readonly lineHeight: number;
  /** Default weight. The range the role may use is documented in `weights`. */
  readonly weight: number;
  readonly weights: readonly number[];
  readonly tracking: string;
  readonly uppercase?: true;
  /** What the role is for — the reason a caller picks it. */
  readonly use: string;
}

export const TYPE: Record<TypeRole, TypeStep> = {
  display:    { size: 60, mobile: 42, lineHeight: 0.95, weight: 800, weights: [800],           tracking: '-0.045em', use: 'one analytical statement per surface — never a heading' },
  title:      { size: 32, mobile: 26, lineHeight: 1.10, weight: 700, weights: [700],           tracking: '-0.030em', use: 'the page or surface title' },
  section:    { size: 20, mobile: 18, lineHeight: 1.25, weight: 700, weights: [700],           tracking: '-0.022em', use: 'a major division of a surface' },
  subsection: { size: 16,             lineHeight: 1.30, weight: 700, weights: [700],           tracking: '-0.018em', use: 'a division inside a section' },
  body:       { size: 15,             lineHeight: 1.60, weight: 400, weights: [400, 500],      tracking: '-0.005em', use: 'sustained reading — never shrinks on mobile' },
  secondary:  { size: 14,             lineHeight: 1.50, weight: 400, weights: [400, 500, 600], tracking: '0',        use: 'supporting prose that qualifies body text' },
  label:      { size: 13,             lineHeight: 1.40, weight: 600, weights: [600, 700],      tracking: '0.005em',  use: 'a control or field label' },
  caption:    { size: 12,             lineHeight: 1.45, weight: 500, weights: [500, 600],      tracking: '0.010em',  use: 'the reading floor — footnotes, hints, table text' },
  meta:       { size: 11,             lineHeight: 1.35, weight: 700, weights: [700],           tracking: '0.070em',  uppercase: true, use: 'eyebrows, provenance stamps, micro-labels — the ONLY role at the floor' },
};

/** The one Product UI family. No editorial family survives Wave 1. */
export const TYPE_FAMILY = "'Plus Jakarta Sans', var(--font-jakarta), system-ui, sans-serif";

/**
 * Inline style for a role. Use the `.kt-*` class instead when the role has a
 * mobile variant (`display`, `title`, `section`) — this returns the desktop
 * value only, because an inline style cannot express a breakpoint.
 */
export function typeStyle(
  role: TypeRole,
  opts: { weight?: number; tabular?: boolean } = {},
): React.CSSProperties {
  const t = TYPE[role];
  return {
    fontFamily:    TYPE_FAMILY,
    fontSize:      t.size,
    lineHeight:    t.lineHeight,
    fontWeight:    opts.weight ?? t.weight,
    letterSpacing: t.tracking,
    ...(t.uppercase ? { textTransform: 'uppercase' as const } : null),
    ...(opts.tabular ? { fontVariantNumeric: 'tabular-nums' as const } : null),
  };
}
