// lib/px-acceptance/benchmark-checks.ts
// KORA-WP-126 — the mechanically enforceable Benchmark V2 checks.
//
// DELTA 5 (report `266`) expanded WP126 from visual-acceptance evidence to the
// Benchmark V2 enforcement infrastructure, and named what it owns: typography
// tokens/scale/floor, spacing token rules, route archetype declaration,
// surface-role constraints where mechanically safe, the seven-state resolution
// contract, page-length and mobile-ratio measurement, navigation
// budget/label/internal-state rules, and the no-bare-threshold-metric contract.
//
// EVERY threshold here is DELEGATED to the COMPLETE package that owns it —
// KORA-WP-139 (type), 140 (surface/state), 141 (archetype/spacing/ratio),
// 142 (encoding). This module measures and reports; it defines no new
// canonical number, because a second copy of a governed threshold is the
// duplicated-current-truth defect report 257 named.

import {
  TYPE, TYPE_ROLES, TYPE_FLOOR_PX, TYPE_READING_FLOOR_PX, SPACE_STEPS, type TypeRole,
} from '@/lib/design/kora-design-tokens';
import {
  SURFACE_STATES, ROLE_CONTRACT, stateSemantics, type SurfaceRole, type SurfaceStateKind,
} from '@/lib/design/surface-state-grammar';
import {
  ROUTE_ARCHETYPE, contractFor, mobileRatioVerdict, SPACING_EXCEPTION_MAX_OPTICAL_PX,
} from '@/lib/design/page-archetypes';
import { ENCODED_METRICS, type MetricCode } from '@/lib/design/encoding-grammar';
import { assertMechanisable } from './acceptance-record';

export type CheckVerdict = 'pass' | 'warn' | 'fail' | 'not-applicable';

export interface CheckResult {
  readonly criterion: string;
  readonly verdict: CheckVerdict;
  readonly detail: string;
}

const ok = (criterion: string, detail: string): CheckResult => ({ criterion, verdict: 'pass', detail });

// ── typography ──────────────────────────────────────────────────────────────

/** A declared type role, or nothing. An inline px size is not a role. */
export function checkTypographyRole(value: unknown): CheckResult {
  assertMechanisable('typography_tokens');
  if (typeof value === 'string' && (TYPE_ROLES as readonly string[]).includes(value)) {
    return ok('typography_tokens', `"${value}" is a canonical KORA-WP-139 role`);
  }
  return {
    criterion: 'typography_tokens', verdict: 'fail',
    detail: `"${String(value)}" is not one of the nine canonical roles (${TYPE_ROLES.join(', ')}) — an inline size is not a role`,
  };
}

/** The 11px absolute floor and the 12px sustained-reading floor, from KORA-WP-139. */
export function checkTypographyFloor(role: TypeRole, sustainedReading: boolean): CheckResult {
  assertMechanisable('typography_floor');
  const step = TYPE[role];
  const size = step.mobile ?? step.size;
  if (size < TYPE_FLOOR_PX) {
    return { criterion: 'typography_floor', verdict: 'fail', detail: `${role} resolves to ${size}px, below the ${TYPE_FLOOR_PX}px absolute floor` };
  }
  if (sustainedReading && size < TYPE_READING_FLOOR_PX) {
    return { criterion: 'typography_floor', verdict: 'fail', detail: `${role} is ${size}px — sustained reading may not drop below ${TYPE_READING_FLOOR_PX}px` };
  }
  return ok('typography_floor', `${role} at ${size}px satisfies the floor`);
}

// ── spacing ─────────────────────────────────────────────────────────────────

/** A spacing decision resolves to a SPACE step, or is a documented optical exception. */
export function checkSpacingValue(px: number, opticalException = false): CheckResult {
  assertMechanisable('spacing_tokens');
  if ((SPACE_STEPS as readonly number[]).includes(px)) {
    return ok('spacing_tokens', `${px}px is a canonical SPACE step`);
  }
  if (opticalException && px <= SPACING_EXCEPTION_MAX_OPTICAL_PX) {
    return { criterion: 'spacing_tokens', verdict: 'warn', detail: `${px}px accepted as a documented optical offset (≤ ${SPACING_EXCEPTION_MAX_OPTICAL_PX}px)` };
  }
  return {
    criterion: 'spacing_tokens', verdict: 'fail',
    detail: `${px}px is not a SPACE step (${SPACE_STEPS.join(', ')})${px <= SPACING_EXCEPTION_MAX_OPTICAL_PX ? ' — declare it as an optical exception if that is what it is' : ''}`,
  };
}

// ── route archetype ─────────────────────────────────────────────────────────

/** Every measured route must declare an archetype; an undeclared route cannot be measured. */
export function checkRouteArchetypeDeclared(route: string): CheckResult {
  assertMechanisable('route_archetype_declared');
  const c = contractFor(route);
  if (!c) {
    return {
      criterion: 'route_archetype_declared', verdict: 'fail',
      detail: `route "${route}" declares no archetype in ROUTE_ARCHETYPE — its page-length and mobile-ratio contract is undefined, so it cannot be accepted`,
    };
  }
  return ok('route_archetype_declared', `"${route}" is ${c.archetype}`);
}

export function declaredRoutes(): readonly string[] {
  return Object.keys(ROUTE_ARCHETYPE);
}

// ── surface roles, where mechanically safe ──────────────────────────────────

/**
 * "Where mechanically safe" is the contract's own hedge, and it means this: a
 * role rendering a state its contract forbids is a mechanical defect, whereas
 * whether a surface *should* use that role is review-enforced. Only the former
 * is checked here.
 */
export function checkSurfaceRoleState(role: SurfaceRole, state: SurfaceStateKind): CheckResult {
  assertMechanisable('surface_role_constraints');
  const contract = ROLE_CONTRACT[role];
  if (!contract) return { criterion: 'surface_role_constraints', verdict: 'fail', detail: `"${role}" is not a canonical surface role` };
  if (!contract.allowedStates.includes(state)) {
    return {
      criterion: 'surface_role_constraints', verdict: 'fail',
      detail: `${role} may not render ${state} — allowed: ${contract.allowedStates.join(', ')}`,
    };
  }
  return ok('surface_role_constraints', `${role} may render ${state}`);
}

// ── seven-state resolution ──────────────────────────────────────────────────

/**
 * The contract that makes ZERO ≠ NO DATA and SUPPRESSED ≠ ERROR mechanical:
 * every state resolves, exactly one resolution is a fault, and an unknown state
 * throws rather than degrading to ERROR.
 */
export function checkSevenStateResolution(): CheckResult {
  assertMechanisable('seven_state_resolution');
  const problems: string[] = [];
  if (SURFACE_STATES.length !== 7) problems.push(`expected exactly seven states, found ${SURFACE_STATES.length}`);
  for (const s of SURFACE_STATES) {
    try {
      const sem = stateSemantics(s);
      if (sem.isFault && s !== 'ERROR') problems.push(`${s} resolves as a fault but only ERROR may`);
      if (s === 'SUPPRESSED' && sem.isFault) problems.push('SUPPRESSED must never resolve as a fault');
    } catch {
      problems.push(`${s} has no resolution`);
    }
  }
  let unknownThrew = false;
  try {
    stateSemantics('__not_a_state__' as SurfaceStateKind);
  } catch {
    unknownThrew = true;
  }
  if (!unknownThrew) problems.push('an unrecognised state did not throw — it would silently render as a fault');
  return problems.length
    ? { criterion: 'seven_state_resolution', verdict: 'fail', detail: problems.join('; ') }
    : ok('seven_state_resolution', 'seven states resolve; only ERROR is a fault; unknown states throw');
}

// ── page length and mobile ratio (AN.1) ─────────────────────────────────────

/** Measured against the archetype's own warnHeightPx. A warn, never a hard fail. */
export function checkPageLength(route: string, desktopHeightPx: number): CheckResult {
  assertMechanisable('page_length');
  const c = contractFor(route);
  if (!c) return { criterion: 'page_length', verdict: 'fail', detail: `route "${route}" declares no archetype, so it has no length contract` };
  if (desktopHeightPx > c.warnHeightPx) {
    return {
      criterion: 'page_length', verdict: 'warn',
      detail: `${route} is ${desktopHeightPx}px against a ${c.warnHeightPx}px ${c.archetype} warn threshold — the surface may be doing too much`,
    };
  }
  return ok('page_length', `${route} at ${desktopHeightPx}px is within the ${c.warnHeightPx}px ${c.archetype} threshold`);
}

/**
 * AN.1's ratified detector, delegated to KORA-WP-141's own verdict function.
 * "A detector, never a target: padding a desktop page to improve the ratio is a
 * benchmark violation" — so this reports, and never suggests a remedy.
 */
export function checkMobileRatio(route: string, desktopHeightPx: number, mobileHeightPx: number): CheckResult {
  assertMechanisable('mobile_ratio');
  if (desktopHeightPx <= 0) return { criterion: 'mobile_ratio', verdict: 'fail', detail: 'desktop height must be positive to form a ratio' };
  const verdict = mobileRatioVerdict(desktopHeightPx, mobileHeightPx);
  const ratio = (mobileHeightPx / desktopHeightPx).toFixed(3);
  const detail = `${route} desktop→mobile ratio ${ratio} (${verdict}) — a detector, never a target`;
  if (verdict === 'acceptable') return ok('mobile_ratio', detail);
  return { criterion: 'mobile_ratio', verdict: verdict === 'warning' ? 'warn' : 'fail', detail };
}

// ── navigation budget / label / internal state ──────────────────────────────

/**
 * Report 210 §19 dimension 7 states the rule as "interaction count for each
 * primary task ≤ a DECLARED budget". The budget is therefore declared per task
 * by the package being accepted — this module owns the declaration shape and the
 * check, and deliberately invents no canonical number, because none is ratified.
 */
export interface NavigationBudget {
  readonly route: string;
  readonly task: string;
  readonly maxInteractions: number;
  /** Where the budget was declared — a budget with no source is not a budget. */
  readonly declaredIn: string;
}

export function checkNavigationBudget(budget: NavigationBudget, observedInteractions: number): CheckResult {
  assertMechanisable('navigation_budget');
  if (!budget.declaredIn.trim()) {
    return { criterion: 'navigation_budget', verdict: 'fail', detail: `budget for "${budget.task}" cites no declaring source` };
  }
  if (budget.maxInteractions <= 0) {
    return { criterion: 'navigation_budget', verdict: 'fail', detail: `budget for "${budget.task}" must be a positive interaction count` };
  }
  if (observedInteractions > budget.maxInteractions) {
    return {
      criterion: 'navigation_budget', verdict: 'fail',
      detail: `${budget.route} "${budget.task}" took ${observedInteractions} interactions against a declared budget of ${budget.maxInteractions} (${budget.declaredIn})`,
    };
  }
  return ok('navigation_budget', `${budget.route} "${budget.task}" ${observedInteractions}/${budget.maxInteractions} interactions`);
}

// ── no bare threshold metric ────────────────────────────────────────────────

/**
 * A metric that KORA-WP-142 gives an encoding to may not be rendered as a bare
 * number: the threshold scale is what makes the number interpretable, and
 * dropping it turns explainable intelligence back into an unexplained figure.
 */
export function checkNoBareThresholdMetric(metric: string, hasEncodedThreshold: boolean): CheckResult {
  assertMechanisable('no_bare_threshold_metric');
  const isEncoded = (ENCODED_METRICS as readonly string[]).includes(metric);
  if (!isEncoded) {
    return { criterion: 'no_bare_threshold_metric', verdict: 'not-applicable', detail: `${metric} carries no KORA-WP-142 encoding` };
  }
  if (!hasEncodedThreshold) {
    return {
      criterion: 'no_bare_threshold_metric', verdict: 'fail',
      detail: `${metric} is an encoded metric rendered without its threshold scale — a bare figure is not interpretable`,
    };
  }
  return ok('no_bare_threshold_metric', `${metric} is rendered with its encoded threshold scale`);
}

export function encodedMetrics(): readonly MetricCode[] {
  return ENCODED_METRICS;
}

// ── migration phase / lint escalation (AN.4) ─────────────────────────────────

export const MIGRATION_PHASES = [
  'SYSTEM', 'PRIMITIVES', 'DEMONSTRATORS', 'PERSONA_MIGRATION', 'RESIDUAL_SWEEP', 'HARDENING',
] as const;
export type MigrationPhase = (typeof MIGRATION_PHASES)[number];

export type LintSeverity = 'off' | 'warn' | 'block';

/** AN.4's binding phase→severity ladder: OFF → OFF → WARN → WARN → WARN → BLOCK. */
export const PHASE_LINT_SEVERITY: Record<MigrationPhase, LintSeverity> = {
  SYSTEM: 'off',
  PRIMITIVES: 'off',
  DEMONSTRATORS: 'warn',
  PERSONA_MIGRATION: 'warn',
  RESIDUAL_SWEEP: 'warn',
  HARDENING: 'block',
};

/**
 * The programme's current phase. W1 (`139`,`140`) and W2 (`141`,`142`) are
 * closed and W4 persona migration (`143`,`127`–`129`) has not begun, so the
 * programme sits at DEMONSTRATORS — severity WARN.
 *
 * KORA-WP-139 and KORA-WP-141 both defer lint escalation to this package, and
 * AN.4 is equally explicit that "Product-wide drift elimination and lint BLOCK
 * are programme Definition of Done, NOT package acceptance". So WP126 owns the
 * escalation MECHANISM and must not fire it: BLOCK belongs to HARDENING, after
 * persona migration and the residual sweep.
 */
export const CURRENT_MIGRATION_PHASE: MigrationPhase = 'DEMONSTRATORS';

export function lintSeverityForPhase(phase: MigrationPhase): LintSeverity {
  return PHASE_LINT_SEVERITY[phase];
}

export function mayEscalateToBlock(phase: MigrationPhase): boolean {
  return PHASE_LINT_SEVERITY[phase] === 'block';
}
