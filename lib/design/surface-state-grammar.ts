// KORA-WP-140 — Surface & State Grammar.
//
// The canonical enumeration this file encodes is NOT decided here. It is read
// from docs/BENCHMARK_V2_CANONICAL_GRAMMAR.md (Founder-ratified 2026-09-25):
// nine surface roles, seven states, and three semantic invariants.
//
// WHY THIS FILE IS TYPES AND NOT STYLING: the invariants below must hold by
// construction, not by a designer remembering them. Three defects observed on
// the real Product motivated each one:
//
//   D1 — ZERO and NO DATA rendered identically (NoDataState was a pass-through
//        to EmptyState), so "your programme produced nothing" and "nobody
//        supplied anything" looked the same to a paying customer.
//   D2 — suppression could be rendered through EmptyState's access-denied
//        variant, which carries role="alert". A privacy boundary is KORA
//        working correctly; announcing it as a fault trains users to read the
//        central privacy guarantee as a malfunction.
//   D3 — `tone` was a free parameter, so a danger treatment on a healthy value
//        was fully constructible (tone={ok ? 'ok' : 'risk'} at 32 call sites).
//
// The fixes are structural: distinct prop shapes that cannot substitute for one
// another, distinct assistive-technology semantics, and — for D3 — no colour
// parameter at all. Treatment is derived from the semantic claim, which is the
// only thing a caller can state.
//
// OUT OF SCOPE HERE, by contract: typography (KORA-WP-139), page composition
// (141), data encoding and threshold bands (142).

import type { ReactNode } from 'react';
import type { PrivacySuppressReason } from '@/lib/types';
import { PX } from './kora-design-tokens';

// ── The nine canonical surface roles ─────────────────────────────────────────

export const SURFACE_ROLES = [
  'HERO_JUDGMENT',
  'PRIMARY_METRIC',
  'SUPPORTING_METRIC',
  'EVIDENCE_PANEL',
  'WARNING_SAFEGUARD',
  'ACTION',
  'DISCLOSURE',
  'SUPPRESSED_BOUNDARY',
  'OPERATIONAL_ROW',
] as const;

export type SurfaceRole = (typeof SURFACE_ROLES)[number];

// ── The seven canonical states ───────────────────────────────────────────────

export const SURFACE_STATES = [
  'ZERO',
  'NO_DATA',
  'INSUFFICIENT_DATA',
  'SUPPRESSED',
  'NOT_YET_AVAILABLE',
  'LOADING',
  'ERROR',
] as const;

export type SurfaceStateKind = (typeof SURFACE_STATES)[number];

/**
 * Each state carries the evidence that state is answerable for. The shapes are
 * deliberately non-substitutable: a ZERO cannot be passed where a NO_DATA is
 * expected, because a zero must say what was measured and an absence must say
 * what was never supplied. That is invariant `ZERO != NO_DATA`, enforced by the
 * type system rather than by a colour.
 */
export type SurfaceStateInput =
  | { kind: 'ZERO';              measured: string }
  | { kind: 'NO_DATA';           missing: string;  action?: ReactNode }
  | { kind: 'INSUFFICIENT_DATA'; measure: string;  have: number; need: number }
  | { kind: 'SUPPRESSED';        reason: PrivacySuppressReason; groupSize?: number; dataType?: string }
  | { kind: 'NOT_YET_AVAILABLE'; expected: string; title?: string }
  | { kind: 'LOADING';           label?: string }
  | { kind: 'ERROR';             what: string;     retry?: ReactNode };

// ── Assistive-technology and treatment semantics, per state ──────────────────

export interface StateSemantics {
  /** Surface treatment key. Never a caller parameter. */
  readonly treatment: 'neutral' | 'informational' | 'boundary' | 'fault';
  /** ARIA role. This is what makes SUPPRESSED != ERROR audible, not just visible. */
  readonly ariaRole: 'status' | 'alert' | undefined;
  readonly ariaLive: 'polite' | 'assertive' | undefined;
  /** True only for a genuine failure. A boundary and a pending period are not faults. */
  readonly isFault: boolean;
}

export class UnknownSurfaceStateError extends Error {}

/**
 * Exhaustive. An unrecognised state THROWS — it is never silently rendered as
 * ERROR, because doing so would reintroduce exactly the conflation this package
 * exists to remove.
 */
export function stateSemantics(kind: SurfaceStateKind): StateSemantics {
  switch (kind) {
    case 'ZERO':
      return { treatment: 'neutral', ariaRole: undefined, ariaLive: undefined, isFault: false };
    case 'NO_DATA':
      return { treatment: 'neutral', ariaRole: undefined, ariaLive: undefined, isFault: false };
    case 'INSUFFICIENT_DATA':
      return { treatment: 'informational', ariaRole: undefined, ariaLive: undefined, isFault: false };
    case 'SUPPRESSED':
      return { treatment: 'boundary', ariaRole: 'status', ariaLive: 'polite', isFault: false };
    case 'NOT_YET_AVAILABLE':
      return { treatment: 'informational', ariaRole: 'status', ariaLive: 'polite', isFault: false };
    case 'LOADING':
      return { treatment: 'neutral', ariaRole: 'status', ariaLive: 'polite', isFault: false };
    case 'ERROR':
      return { treatment: 'fault', ariaRole: 'alert', ariaLive: 'assertive', isFault: true };
    default:
      throw new UnknownSurfaceStateError(
        `Unknown surface state: ${String(kind)}. Add it to the canonical seven or do not use it — ` +
        'it must not fall through to ERROR.',
      );
  }
}

// ── Semantic assessment — the structural answer to defect D3 ─────────────────

/**
 * A caller states a SEMANTIC CLAIM, never a colour. There is no `tone`, `variant`
 * or `color` parameter anywhere in this grammar, so a danger treatment on a
 * healthy value has no entry point.
 *
 * `watch` and `risk` additionally require a stated reason: a surface may not be
 * marked dangerous casually, and the reader is owed the reason on the same
 * surface that carries the alarm.
 */
export type Assessment =
  | { kind: 'ok';      label: string }
  | { kind: 'neutral'; label: string }
  | { kind: 'watch';   label: string; reason: string }
  | { kind: 'risk';    label: string; reason: string };

export interface Treatment {
  readonly fill: string;
  readonly text: string;
  readonly tint: string;
  readonly edge: string;
}

const TREATMENT: Record<Assessment['kind'], Treatment> = {
  ok:      { fill: PX.ok,      text: PX.ok,       tint: PX.okTint,   edge: PX.ok },
  neutral: { fill: PX.inkMute, text: PX.ink3,     tint: PX.inkWash,  edge: PX.line },
  watch:   { fill: PX.warn,    text: PX.warnText, tint: PX.warnTint, edge: PX.warn },
  risk:    { fill: PX.risk,    text: PX.risk,     tint: PX.riskTint, edge: PX.risk },
};

/** Derived from the claim alone. The caller cannot override it. */
export function assessmentTreatment(a: Assessment): Treatment {
  return TREATMENT[a.kind];
}

/** A healthy or neutral claim can never reach the danger treatment. */
export function isDangerTreatment(t: Treatment): boolean {
  return t.fill === PX.risk;
}

const STATE_TREATMENT: Record<StateSemantics['treatment'], Treatment> = {
  neutral:       TREATMENT.neutral,
  informational: { fill: PX.info, text: PX.infoText, tint: PX.infoTint, edge: PX.info },
  boundary:      { fill: PX.inkMute, text: PX.ink2, tint: PX.inkWash, edge: PX.line2 },
  fault:         TREATMENT.risk,
};

export function stateTreatment(kind: SurfaceStateKind): Treatment {
  return STATE_TREATMENT[stateSemantics(kind).treatment];
}

// ── Role contract: what each role is for, and what it is NOT for ─────────────

export interface RoleContract {
  readonly title: string;
  /** What the role carries. */
  readonly use: string;
  /** The misuse this role exists to prevent — acceptance clause (A) "documented non-use". */
  readonly doNotUse: string;
  /** States this role may legitimately render. */
  readonly allowedStates: readonly SurfaceStateKind[];
}

const ALL_STATES = SURFACE_STATES;

export const ROLE_CONTRACT: Record<SurfaceRole, RoleContract> = {
  HERO_JUDGMENT: {
    title: 'Hero Judgment',
    use: 'the single conclusion a surface is answerable for',
    doNotUse: 'not a page title, and never two per surface — a second hero means the surface has two jobs',
    allowedStates: ['INSUFFICIENT_DATA', 'SUPPRESSED', 'NOT_YET_AVAILABLE', 'LOADING', 'ERROR'],
  },
  PRIMARY_METRIC: {
    title: 'Primary Metric',
    use: 'the headline quantity a decision turns on',
    doNotUse: 'not for a quantity nobody decides on — that is a Supporting Metric',
    allowedStates: ALL_STATES,
  },
  SUPPORTING_METRIC: {
    title: 'Supporting Metric',
    use: 'a quantity that qualifies the primary',
    doNotUse: 'never styled to compete with the Primary Metric it qualifies',
    allowedStates: ALL_STATES,
  },
  EVIDENCE_PANEL: {
    title: 'Evidence Panel',
    use: 'the provenance and reasoning behind a judgment',
    doNotUse: 'not a place for recommendations or actions — evidence explains, it does not instruct',
    allowedStates: ['NO_DATA', 'INSUFFICIENT_DATA', 'SUPPRESSED', 'NOT_YET_AVAILABLE', 'LOADING', 'ERROR'],
  },
  WARNING_SAFEGUARD: {
    title: 'Warning / Safeguard',
    use: 'a condition the reader must not miss',
    doNotUse: 'not for routine information, and never for a healthy value — an always-on warning is ignored',
    allowedStates: ['LOADING', 'ERROR'],
  },
  ACTION: {
    title: 'Action',
    use: 'a real, available next step',
    doNotUse: 'never a disabled or future capability presented as available',
    allowedStates: ['NOT_YET_AVAILABLE', 'LOADING'],
  },
  DISCLOSURE: {
    title: 'Disclosure',
    use: 'methodology, calibration, limitation and legal text',
    doNotUse: 'not a warning — a permanent methodological boundary is not an alarm, and must not borrow alarm treatment',
    allowedStates: [],
  },
  SUPPRESSED_BOUNDARY: {
    title: 'Suppressed / Boundary',
    use: 'a privacy boundary, stated as a boundary',
    doNotUse: 'never an error, never silent, never an access-denied alert — suppression is KORA working correctly',
    allowedStates: ['SUPPRESSED'],
  },
  OPERATIONAL_ROW: {
    title: 'Operational Row',
    use: 'a record in a working list or table',
    doNotUse: 'not a card — two adjacent records of the same kind belong in one list, not two panels',
    allowedStates: ['ZERO', 'NO_DATA', 'LOADING', 'ERROR'],
  },
};

export function roleAllowsState(role: SurfaceRole, kind: SurfaceStateKind): boolean {
  return ROLE_CONTRACT[role].allowedStates.includes(kind);
}
