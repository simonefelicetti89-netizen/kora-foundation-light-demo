// KORA-WP-141 — page composition: archetypes, information tiers, length
// contracts and mobile priority.
//
// THIS IS ROUTE METADATA, NOT A PAGE COMPONENT. A universal layout component
// would replace card monoculture with layout monoculture: every surface would
// become the same shape for the same bad reason. A route DECLARES what kind of
// page it is; the declaration is testable without rendering anything, it is
// additive, and it is per-surface revertible — which is what makes the rollback
// contract honest.
//
// WHY THE TIERS ARE DEFINED HERE: acceptance (B) requires this package to
// DEFINE the T1–T5 model, not to consume a pre-existing one. Unlike the nine
// surface roles and seven states, which KORA-WP-140 read from a ratified
// artifact, no prior enumeration of the tiers exists — so this module is their
// canonical source, and Section AN's Benchmark V2 record is what it answers to.

/**
 * Information tiers. A tier is a statement about WHAT THE READER NEEDS FIRST,
 * not about size — typography is KORA-WP-139's and is already closed.
 */
export const TIERS = ['T1', 'T2', 'T3', 'T4', 'T5'] as const;
export type Tier = (typeof TIERS)[number];

export const TIER_CONTRACT: Record<Tier, { name: string; carries: string; rule: string }> = {
  T1: {
    name: 'Judgment',
    carries: 'the single conclusion the surface is answerable for',
    rule: 'exactly one per surface, and reachable without scrolling on desktop',
  },
  T2: {
    name: 'Reading',
    carries: 'why that judgment holds — the executive narrative and its drivers',
    rule: 'at most one per surface; it explains T1 and never competes with it',
  },
  T3: {
    name: 'Evidence',
    carries: 'decomposition, components, provenance of the judgment',
    rule: 'may repeat per chapter; always subordinate to T1 and T2',
  },
  T4: {
    name: 'Operational detail',
    carries: 'records, pipelines, tables, queues — what an operator works through',
    rule: 'legitimately dense; a candidate for progressive disclosure',
  },
  T5: {
    name: 'Boundary',
    carries: 'methodology, calibration, limitation, privacy and legal text',
    rule: 'always present on a scoring surface, always last, never an alarm',
  },
};

/**
 * Page archetypes. Six, because six distinct reading jobs exist in KORA — not
 * because six is a tidy number. A route that fits none of them is a composition
 * question for its owning package, never a seventh archetype invented in place.
 */
export const ARCHETYPES = [
  'EXECUTIVE_JUDGMENT',
  'REPORT_EXPORT',
  'OPERATIONAL_WORKSPACE',
  'RECORD_DETAIL',
  'DIRECTORY_INDEX',
  'DISCLOSURE_STATIC',
] as const;
export type Archetype = (typeof ARCHETYPES)[number];

/**
 * Mobile priority model. The Benchmark contract is explicit: mobile is
 * RE-PRIORITISATION, never reflow. `reflow` is therefore NOT a legal value —
 * a surface that merely stacks its desktop order has not declared a model, it
 * has declined to have one.
 */
export type MobilePriority =
  /** Mobile order is declared per chapter and differs from DOM order. */
  | 'explicit-order'
  /** Lower tiers collapse behind disclosure; order is otherwise preserved. */
  | 'progressive-disclosure'
  /** The surface is short enough that desktop order is already the right order. */
  | 'order-is-already-priority';

export interface ArchetypeContract {
  readonly archetype: Archetype;
  /** Desktop height at which the surface is doing too much, in px. */
  readonly warnHeightPx: number;
  /** Mobile ÷ desktop height. AN.1: ≤1.35 acceptable · >1.6 fail. */
  readonly maxMobileRatio: number;
  readonly mobilePriority: MobilePriority;
  /** Tiers this archetype must carry. */
  readonly requiredTiers: readonly Tier[];
  /** Chapters are mandatory above this many top-level sections. */
  readonly chapterThreshold: number;
  readonly use: string;
}

export const ARCHETYPE_CONTRACT: Record<Archetype, ArchetypeContract> = {
  EXECUTIVE_JUDGMENT: {
    archetype: 'EXECUTIVE_JUDGMENT', warnHeightPx: 2500, maxMobileRatio: 1.35,
    mobilePriority: 'explicit-order', requiredTiers: ['T1', 'T2', 'T5'], chapterThreshold: 3,
    use: 'a surface whose job is one decision — the Cockpit subtype',
  },
  REPORT_EXPORT: {
    // AN.1 ratified this as a SUBTYPE of Executive Judgment, not a seventh
    // archetype: /company/reports legitimately carries board-pack, CSR and
    // privacy content, and shortening it by deleting evidence is a violation.
    archetype: 'REPORT_EXPORT', warnHeightPx: 4000, maxMobileRatio: 1.6,
    mobilePriority: 'progressive-disclosure', requiredTiers: ['T1', 'T3', 'T5'], chapterThreshold: 4,
    use: 'a board-ready output that must carry its evidence in full',
  },
  OPERATIONAL_WORKSPACE: {
    archetype: 'OPERATIONAL_WORKSPACE', warnHeightPx: 3000, maxMobileRatio: 1.5,
    mobilePriority: 'explicit-order', requiredTiers: ['T1', 'T4'], chapterThreshold: 4,
    use: 'a surface an operator works through rather than reads',
  },
  RECORD_DETAIL: {
    archetype: 'RECORD_DETAIL', warnHeightPx: 2500, maxMobileRatio: 1.35,
    mobilePriority: 'order-is-already-priority', requiredTiers: ['T1', 'T3'], chapterThreshold: 5,
    use: 'one record and everything true about it',
  },
  DIRECTORY_INDEX: {
    archetype: 'DIRECTORY_INDEX', warnHeightPx: 2000, maxMobileRatio: 1.35,
    mobilePriority: 'order-is-already-priority', requiredTiers: ['T1'], chapterThreshold: 6,
    use: 'a list that exists to get the reader somewhere else',
  },
  DISCLOSURE_STATIC: {
    archetype: 'DISCLOSURE_STATIC', warnHeightPx: 6000, maxMobileRatio: 1.6,
    mobilePriority: 'order-is-already-priority', requiredTiers: ['T5'], chapterThreshold: 8,
    use: 'legal, methodology and policy text read in sequence',
  },
};

/**
 * Canonical route declarations. A route appears here when it is a real Product
 * surface a customer or operator reads. This package DECLARES; recomposing
 * every declared route is persona work owned elsewhere, and the contract says
 * so — Product-wide migration is explicitly not this package's acceptance.
 */
export const ROUTE_ARCHETYPE: Record<string, Archetype> = {
  // Company
  '/company':                      'EXECUTIVE_JUDGMENT',
  '/company/kora-index':           'EXECUTIVE_JUDGMENT',
  '/company/reports':              'REPORT_EXPORT',
  '/company/activation':           'EXECUTIVE_JUDGMENT',
  '/company/pillars':              'EXECUTIVE_JUDGMENT',
  '/company/financial':            'EXECUTIVE_JUDGMENT',
  '/company/contribution':         'EXECUTIVE_JUDGMENT',
  '/company/workspace':            'OPERATIONAL_WORKSPACE',
  '/company/data':                 'OPERATIONAL_WORKSPACE',
  '/company/ingestion':            'OPERATIONAL_WORKSPACE',
  '/company/workforce-baseline':   'RECORD_DETAIL',
  // Advisor
  '/advisor':                            'DIRECTORY_INDEX',
  '/advisor/companies':                  'DIRECTORY_INDEX',
  '/advisor/companies/[assignmentId]':   'RECORD_DETAIL',
  // Admin
  '/admin':                        'OPERATIONAL_WORKSPACE',
  '/admin/tenants':                'DIRECTORY_INDEX',
  '/admin/data-intake':            'OPERATIONAL_WORKSPACE',
  // Worker
  '/worker/workspace':             'EXECUTIVE_JUDGMENT',
  '/worker/privacy':               'DISCLOSURE_STATIC',
  // Partner
  '/partner/workspace':            'OPERATIONAL_WORKSPACE',
  // Public
  '/legal/privacy':                'DISCLOSURE_STATIC',
};

export function contractFor(route: string): ArchetypeContract | null {
  const a = ROUTE_ARCHETYPE[route];
  return a ? ARCHETYPE_CONTRACT[a] : null;
}

/** AN.1's calibrated verdict. A detector, never an optimisation target. */
export function mobileRatioVerdict(desktopPx: number, mobilePx: number): 'acceptable' | 'warning' | 'fail' {
  const r = mobilePx / desktopPx;
  if (r <= 1.35) return 'acceptable';
  if (r <= 1.6) return 'warning';
  return 'fail';
}

/**
 * SPACING EXCEPTIONS on a KORA-WP-141-touched surface, documented rather than
 * silently skipped — the contract permits an exception only if it says so.
 *
 * 1. OPTICAL OFFSETS ≤ 3px. `marginTop: 1` on a badge glyph is optical
 *    alignment, not a layout decision; snapping it to 4px would visibly move
 *    the glyph and change the KORA-WP-124 visual language this package is
 *    forbidden to redesign.
 * 2. COMPONENT-INTERNAL CHIP PADDING, e.g. `padding: '2px 8px'` on a status
 *    chip. That is the chip's own shape, owned by KORA-WP-140's surface roles,
 *    not spacing between blocks.
 *
 * Everything else on a touched surface resolves to a SPACE step. Ties resolve
 * DOWNWARD, because the length contract warns explicitly against padding a
 * surface to make a number look better.
 */
export const SPACING_EXCEPTION_MAX_OPTICAL_PX = 3;
