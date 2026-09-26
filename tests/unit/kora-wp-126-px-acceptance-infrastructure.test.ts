// tests/unit/kora-wp-126-px-acceptance-infrastructure.test.ts
// KORA-WP-126 — the instrument's own self-test.
//
// Registry 219's WP126 Tests field asks for exactly two things: "the
// instrument's own self-test; a guard that the declared viewport matrix matches
// `PX_BREAKPOINTS`". This file is that, plus the acceptance-safety properties
// the instrument would be worthless without — a baseline system that can bless
// its own output is not an acceptance system.
//
// Deliberately NOT here: hierarchy, scanability, actionability, craft (review-
// enforced) and Logo-Off, premium moments, final visual acceptance (Founder
// judgment). Registry 219's own amendment forbids giving those fragile
// automated tests, and assertMechanisable enforces that at runtime.

import { describe, it, expect } from 'vitest';
import { PX_BREAKPOINTS, resolvePxShellState, TYPE_FLOOR_PX, SPACE_STEPS } from '@/lib/design/kora-design-tokens';
import {
  CANONICAL_VIEWPORTS, canonicalViewport, guardViewport, assertCanonicalViewport, isCanonicalWidth, RATIO_PAIR,
} from '@/lib/px-acceptance/viewport-matrix';
import {
  evidenceName, evidencePath, evidenceDir, checkCapturePrerequisites, assertCaptureAllowed,
  checkLanding, assertLanded, assertReadinessDeclared,
  SUPPRESSED_NONDETERMINISM, type EvidenceDescriptor, type CapturePrerequisites,
} from '@/lib/px-acceptance/evidence-protocol';
import {
  compareToBaseline, isVerificationPass, acceptBaseline, assertNoNameCollision,
  type BaselineRecord, type CaptureResult,
} from '@/lib/px-acceptance/baseline-store';
import {
  validateAcceptanceRecord, appliesToSha, visualAcceptanceCoverage, assertMechanisable,
  CRITERION_CLASS, type FounderVisualAcceptance,
} from '@/lib/px-acceptance/acceptance-record';
import {
  checkTypographyRole, checkTypographyFloor, checkSpacingValue, checkRouteArchetypeDeclared,
  checkSurfaceRoleState, checkSevenStateResolution, checkPageLength, checkMobileRatio,
  checkNavigationBudget, checkNoBareThresholdMetric, declaredRoutes,
  CURRENT_MIGRATION_PHASE, PHASE_LINT_SEVERITY, lintSeverityForPhase, mayEscalateToBlock,
} from '@/lib/px-acceptance/benchmark-checks';

// ── the required guard: matrix vs PX_BREAKPOINTS ─────────────────────────────

describe('KORA-WP-126 — the declared viewport matrix matches PX_BREAKPOINTS', () => {
  it('derives its rail and mobile widths from PX_BREAKPOINTS, not from a second copy', () => {
    expect(canonicalViewport('rail').width).toBe(PX_BREAKPOINTS.rail);
    expect(canonicalViewport('mobile').width).toBe(PX_BREAKPOINTS.mobile);
  });

  it('every canonical width resolves to the shell state the matrix declares', () => {
    for (const v of CANONICAL_VIEWPORTS) {
      expect(resolvePxShellState(v.width)).toBe(v.shellState);
    }
  });

  it('covers all three shell states exactly once — no state is unobservable', () => {
    const states = CANONICAL_VIEWPORTS.map((v) => v.shellState).sort();
    expect(states).toEqual(['full', 'mobile', 'rail']);
  });

  it('the ratio pair is a real desktop/mobile pair from the matrix', () => {
    expect(isCanonicalWidth(canonicalViewport(RATIO_PAIR.desktop).width)).toBe(true);
    expect(canonicalViewport(RATIO_PAIR.mobile).shellState).toBe('mobile');
  });
});

describe('KORA-WP-126 — the viewport guard', () => {
  it('accepts every canonical viewport', () => {
    for (const v of CANONICAL_VIEWPORTS) {
      expect(guardViewport(v.width, v.height).valid).toBe(true);
      expect(assertCanonicalViewport(v.width, v.height).id).toBe(v.id);
    }
  });

  it('rejects a non-canonical width and names the allowed ones', () => {
    const r = guardViewport(1366, 900);
    expect(r.valid).toBe(false);
    expect(r.reason).toMatch(/1366 is not canonical/);
    expect(r.reason).toMatch(/desktop=1440x900/);
  });

  it('rejects a canonical width captured at the wrong height', () => {
    const r = guardViewport(1440, 1080);
    expect(r.valid).toBe(false);
    expect(r.reason).toMatch(/must be captured at height 900/);
  });

  it('throws rather than rounding a near-miss viewport into acceptance', () => {
    expect(() => assertCanonicalViewport(1441, 900)).toThrow(/non-canonical viewport rejected/);
  });
});

// ── evidence protocol ───────────────────────────────────────────────────────

const productEvidence: EvidenceDescriptor = {
  wp: 'KORA-WP-126', kind: 'product', route: '/company/kora-index', viewport: 'desktop',
};

describe('KORA-WP-126 — deterministic evidence naming and archival', () => {
  it('is deterministic: the same descriptor always yields the same name', () => {
    expect(evidenceName(productEvidence)).toBe(evidenceName({ ...productEvidence }));
  });

  it('carries no timestamp, run id or random suffix', () => {
    const n = evidenceName(productEvidence);
    expect(n).not.toMatch(/\d{10}|\d{4}-\d{2}-\d{2}|run|tmp/i);
    expect(n).toBe('kora-wp-126__product__company-kora-index__desktop.png');
  });

  it('encodes the Product-vs-mockup distinction in the filename itself', () => {
    expect(evidenceName(productEvidence)).toContain('__product__');
    expect(evidenceName({ ...productEvidence, kind: 'mockup' })).toContain('__mockup__');
    expect(evidenceName(productEvidence)).not.toBe(evidenceName({ ...productEvidence, kind: 'mockup' }));
  });

  it('archives evidence under the WP that produced it', () => {
    expect(evidenceDir('KORA-WP-126')).toBe('docs/product/visual-evidence/kora-wp-126');
    expect(evidencePath(productEvidence)).toBe(`${evidenceDir('KORA-WP-126')}/${evidenceName(productEvidence)}`);
    expect(evidenceDir('KORA-WP-141')).not.toBe(evidenceDir('KORA-WP-126'));
  });

  it('rejects a malformed owning package and a non-slug variant', () => {
    expect(() => evidenceName({ ...productEvidence, wp: 'WP126' })).toThrow(/KORA-WP-NNN/);
    expect(() => evidenceName({ ...productEvidence, variant: 'Company A' })).toThrow(/lowercase slug/);
  });

  it('requires an absolute route for Product evidence', () => {
    expect(() => evidenceName({ ...productEvidence, route: 'company/kora-index' })).toThrow(/absolute route/);
  });

  it('distinguishes viewports, so one route cannot overwrite its own other capture', () => {
    const a = evidenceName(productEvidence);
    const b = evidenceName({ ...productEvidence, viewport: 'mobile' });
    expect(a).not.toBe(b);
  });
});

const goodPrereqs: CapturePrerequisites = {
  baseUrl: 'http://127.0.0.1:3000', authenticated: true, width: 1440, height: 900,
  suppressed: SUPPRESSED_NONDETERMINISM,
};

describe('KORA-WP-126 — capture prerequisites fail closed', () => {
  it('accepts a fully-satisfied local authenticated capture', () => {
    expect(checkCapturePrerequisites(goodPrereqs).ok).toBe(true);
    expect(() => assertCaptureAllowed(goodPrereqs)).not.toThrow();
  });

  it('refuses a non-local base URL — evidence may not contain real data', () => {
    const r = checkCapturePrerequisites({ ...goodPrereqs, baseUrl: 'https://kora.example.com' });
    expect(r.ok).toBe(false);
    expect(r.problems.join(' ')).toMatch(/not local/);
  });

  it('refuses an unauthenticated capture', () => {
    expect(checkCapturePrerequisites({ ...goodPrereqs, authenticated: false }).ok).toBe(false);
  });

  it('refuses a non-canonical viewport at protocol level too, not only in the guard', () => {
    const r = checkCapturePrerequisites({ ...goodPrereqs, width: 1366 });
    expect(r.ok).toBe(false);
    expect(r.problems.join(' ')).toMatch(/not canonical/);
  });

  it('names EVERY unsuppressed nondeterminism source, not just the first', () => {
    const r = checkCapturePrerequisites({ ...goodPrereqs, suppressed: ['fonts'] });
    expect(r.ok).toBe(false);
    for (const s of SUPPRESSED_NONDETERMINISM.filter((x) => x !== 'fonts')) {
      expect(r.problems.join(' ')).toContain(s);
    }
  });

  it('does not rely on sleeps: readiness is expressed as conditions, not durations', () => {
    expect(SUPPRESSED_NONDETERMINISM).toContain('fonts');
    expect(SUPPRESSED_NONDETERMINISM).toContain('network-idle');
    expect(SUPPRESSED_NONDETERMINISM.join(' ')).not.toMatch(/sleep|timeout|wait-\d/);
  });
});

// ── baseline storage, comparison and overwrite protection ────────────────────

const capture = (digest: string | null, admissible = true): CaptureResult => ({
  name: 'kora-wp-126__product__company-kora-index__desktop.png', digest, admissible,
});
const baseline: BaselineRecord = {
  name: 'kora-wp-126__product__company-kora-index__desktop.png',
  digest: 'aaa111', acceptedAtSha: '467893cf8fa0731cab698e1be917eba078dcd4d8',
  acceptedOn: '2026-09-26', acceptanceRef: 'report 271',
};

describe('KORA-WP-126 — baseline comparison distinguishes all four outcomes', () => {
  it('match', () => {
    const r = compareToBaseline(capture('aaa111'), baseline);
    expect(r.verdict).toBe('match');
    expect(isVerificationPass(r)).toBe(true);
  });

  it('changed — and does not call it a regression or an improvement', () => {
    const r = compareToBaseline(capture('bbb222'), baseline);
    expect(r.verdict).toBe('changed');
    expect(isVerificationPass(r)).toBe(false);
    expect(r.detail).toMatch(/review required/);
  });

  it('missing baseline is NOT a pass and NOT a failure', () => {
    const r = compareToBaseline(capture('bbb222'), null);
    expect(r.verdict).toBe('missing-baseline');
    expect(isVerificationPass(r)).toBe(false);
  });

  it('invalid capture is distinguished from a visual difference', () => {
    const r = compareToBaseline(capture(null, false), baseline);
    expect(r.verdict).toBe('invalid-capture');
    expect(isVerificationPass(r)).toBe(false);
  });

  it('an invalid environment can never produce a false PASS', () => {
    for (const b of [baseline, null]) {
      expect(isVerificationPass(compareToBaseline(capture(null, false), b))).toBe(false);
    }
  });
});

describe('KORA-WP-126 — a verification run cannot bless a new appearance', () => {
  const intent = {
    intent: 'accept-new-baseline', authority: 'founder',
    acceptanceRef: 'report 272', productSha: '35d54ea358e25b2971de5e8ca36f59f702b877dc',
  } as const;

  it('comparison alone never returns an accepted baseline — it has no such power', () => {
    const r = compareToBaseline(capture('bbb222'), baseline);
    expect(Object.keys(r)).not.toContain('record');
    expect(r.verdict).toBe('changed');
  });

  it('acceptance requires an explicit Founder intent', () => {
    const bad = { ...intent, authority: 'ci' } as unknown as typeof intent;
    expect(acceptBaseline(capture('bbb222'), baseline, bad, '2026-09-27').accepted).toBe(false);
  });

  it('refuses to accept an inadmissible capture as a baseline', () => {
    const out = acceptBaseline(capture(null, false), baseline, intent, '2026-09-27');
    expect(out.accepted).toBe(false);
    expect(out.refusal).toMatch(/inadmissible/);
  });

  it('requires a full Product SHA and a citing record', () => {
    expect(acceptBaseline(capture('bbb222'), baseline, { ...intent, productSha: '35d54ea' }, '2026-09-27').accepted).toBe(false);
    expect(acceptBaseline(capture('bbb222'), baseline, { ...intent, acceptanceRef: '  ' }, '2026-09-27').accepted).toBe(false);
  });

  it('accepts a genuine new baseline and records what authorised it', () => {
    const out = acceptBaseline(capture('bbb222'), baseline, intent, '2026-09-27');
    expect(out.accepted).toBe(true);
    expect(out.record?.digest).toBe('bbb222');
    expect(out.record?.acceptedAtSha).toBe(intent.productSha);
    expect(out.record?.acceptanceRef).toBe('report 272');
  });

  it('refuses a no-op acceptance', () => {
    expect(acceptBaseline(capture('aaa111'), baseline, intent, '2026-09-27').accepted).toBe(false);
  });

  it('rejects colliding evidence names so unrelated evidence cannot overwrite', () => {
    expect(() => assertNoNameCollision([{ name: 'a.png' }, { name: 'b.png' }])).not.toThrow();
    expect(() => assertNoNameCollision([{ name: 'a.png' }, { name: 'a.png' }])).toThrow(/name collision/);
  });
});

// ── Founder visual acceptance record ────────────────────────────────────────

const koraIndexV2: FounderVisualAcceptance = {
  wp: 'KORA-WP-141',
  visualImplementationSha: '467893cf8fa0731cab698e1be917eba078dcd4d8',
  canonicalProductShaAtRecording: '467893cf8fa0731cab698e1be917eba078dcd4d8',
  acceptedOn: '2026-09-26',
  scope: ['desktop composition', 'mobile composition', 'executive hierarchy', 'verdict treatment'],
  acceptedResiduals: ['mobile length 2760px against a 2700px QA target'],
  evidence: [{ name: 'kora-wp-141__product__company-kora-index__desktop.png', digest: 'aaa111', route: '/company/kora-index', viewport: 'desktop' }],
  ci: { runNumber: 339, runId: '36257582329', conclusion: 'success' },
  recordRef: 'report 271',
};

describe('KORA-WP-126 — the Founder visual acceptance record', () => {
  it('validates a well-formed record', () => {
    expect(validateAcceptanceRecord(koraIndexV2).valid).toBe(true);
  });

  it('refuses an acceptance with no scope, no evidence or no citing record', () => {
    expect(validateAcceptanceRecord({ ...koraIndexV2, scope: [] }).valid).toBe(false);
    expect(validateAcceptanceRecord({ ...koraIndexV2, evidence: [] }).valid).toBe(false);
    expect(validateAcceptanceRecord({ ...koraIndexV2, recordRef: '' }).valid).toBe(false);
  });

  it('requires full SHAs and an absolute date', () => {
    expect(validateAcceptanceRecord({ ...koraIndexV2, visualImplementationSha: '467893c' }).valid).toBe(false);
    expect(validateAcceptanceRecord({ ...koraIndexV2, acceptedOn: 'yesterday' }).valid).toBe(false);
  });

  it('applies to its own SHA and to no other', () => {
    expect(appliesToSha(koraIndexV2, '467893cf8fa0731cab698e1be917eba078dcd4d8')).toBe(true);
    expect(appliesToSha(koraIndexV2, '4069072ff2a044b6326bf4f28f4be03f6320acad')).toBe(false);
    expect(appliesToSha(koraIndexV2, '35d54ea358e25b2971de5e8ca36f59f702b877dc')).toBe(false);
  });

  it('a clean descendant does NOT inherit the acceptance — the real WP116/routing case', () => {
    const later = visualAcceptanceCoverage(koraIndexV2, '35d54ea358e25b2971de5e8ca36f59f702b877dc');
    expect(later.covered).toBe(false);
    expect(later.explanation).toMatch(/does not inherit/);
    expect(later.explanation).toMatch(/do not infer acceptance/);
  });

  it('separates the visual implementation SHA from canonical Product at recording', () => {
    const drifted = { ...koraIndexV2, canonicalProductShaAtRecording: '35d54ea358e25b2971de5e8ca36f59f702b877dc' };
    expect(validateAcceptanceRecord(drifted).valid).toBe(true);
    expect(appliesToSha(drifted, drifted.canonicalProductShaAtRecording)).toBe(false);
  });

  it('never mechanises a review-enforced or Founder-judgment criterion', () => {
    expect(() => assertMechanisable('page_length')).not.toThrow();
    for (const c of ['hierarchy', 'scanability', 'actionability', 'craft']) {
      expect(() => assertMechanisable(c)).toThrow(/review-enforced/);
    }
    for (const c of ['logo_off_test', 'premium_moments', 'final_visual_acceptance']) {
      expect(() => assertMechanisable(c)).toThrow(/founder-judgment/);
    }
    expect(() => assertMechanisable('vibe')).toThrow(/unknown acceptance criterion/);
  });

  it('classifies every criterion it names', () => {
    for (const [k, v] of Object.entries(CRITERION_CLASS)) {
      expect(['mechanical', 'review-enforced', 'founder-judgment']).toContain(v);
      expect(k).toMatch(/^[a-z0-9_]+$/);
    }
  });
});

// ── Benchmark V2 mechanical checks ──────────────────────────────────────────

describe('KORA-WP-126 — Benchmark V2 checks delegate to the owning packages', () => {
  it('typography: a canonical role passes, an inline size does not', () => {
    expect(checkTypographyRole('body').verdict).toBe('pass');
    expect(checkTypographyRole('15px').verdict).toBe('fail');
    expect(checkTypographyRole(15).verdict).toBe('fail');
  });

  it('typography floor: meta is at the 11px floor and body clears the reading floor', () => {
    expect(checkTypographyFloor('meta', false).verdict).toBe('pass');
    expect(checkTypographyFloor('meta', true).verdict).toBe('fail');
    expect(checkTypographyFloor('body', true).verdict).toBe('pass');
    expect(TYPE_FLOOR_PX).toBe(11);
  });

  it('spacing: SPACE steps pass, an off-scale value fails, a small optical offset warns', () => {
    for (const s of SPACE_STEPS) expect(checkSpacingValue(s).verdict).toBe('pass');
    expect(checkSpacingValue(13).verdict).toBe('fail');
    expect(checkSpacingValue(2, true).verdict).toBe('warn');
    expect(checkSpacingValue(2, false).verdict).toBe('fail');
  });

  it('route archetype: a declared route passes, an undeclared one cannot be measured', () => {
    expect(checkRouteArchetypeDeclared('/company/kora-index').verdict).toBe('pass');
    expect(checkRouteArchetypeDeclared('/not/a/declared/route').verdict).toBe('fail');
    expect(declaredRoutes().length).toBeGreaterThan(10);
  });

  it('surface roles: a forbidden state on a role is a mechanical defect', () => {
    expect(checkSurfaceRoleState('HERO_JUDGMENT', 'SUPPRESSED').verdict).toBe('pass');
    expect(checkSurfaceRoleState('HERO_JUDGMENT', 'ZERO').verdict).toBe('fail');
  });

  it('seven-state resolution holds, and an unknown state throws rather than faulting', () => {
    expect(checkSevenStateResolution().verdict).toBe('pass');
  });

  it('page length warns against the archetype threshold, never hard-fails', () => {
    expect(checkPageLength('/company/kora-index', 2400).verdict).toBe('pass');
    expect(checkPageLength('/company/kora-index', 2600).verdict).toBe('warn');
    expect(checkPageLength('/company/reports', 3900).verdict).toBe('pass');
    expect(checkPageLength('/not/declared', 1000).verdict).toBe('fail');
  });

  it('mobile ratio applies AN.1 exactly, and says it is a detector not a target', () => {
    expect(checkMobileRatio('/company/kora-index', 2000, 2600).verdict).toBe('pass');
    expect(checkMobileRatio('/company/kora-index', 2000, 2800).verdict).toBe('warn');
    expect(checkMobileRatio('/company/kora-index', 2000, 3400).verdict).toBe('fail');
    expect(checkMobileRatio('/company/kora-index', 2000, 2600).detail).toMatch(/never a target/);
  });

  it('navigation budget must be declared with a source before it can be checked', () => {
    const b = { route: '/company/kora-index', task: 'read the index', maxInteractions: 2, declaredIn: 'report 272' };
    expect(checkNavigationBudget(b, 2).verdict).toBe('pass');
    expect(checkNavigationBudget(b, 3).verdict).toBe('fail');
    expect(checkNavigationBudget({ ...b, declaredIn: '' }, 1).verdict).toBe('fail');
    expect(checkNavigationBudget({ ...b, maxInteractions: 0 }, 0).verdict).toBe('fail');
  });

  it('no encoded metric may be rendered bare', () => {
    expect(checkNoBareThresholdMetric('KORA_INDEX', true).verdict).toBe('pass');
    expect(checkNoBareThresholdMetric('KORA_INDEX', false).verdict).toBe('fail');
    expect(checkNoBareThresholdMetric('HEADCOUNT', false).verdict).toBe('not-applicable');
  });
});

describe('KORA-WP-126 — lint escalation is owned here and deliberately NOT fired', () => {
  it('encodes AN.4s phase ladder exactly: OFF OFF WARN WARN WARN BLOCK', () => {
    expect(Object.values(PHASE_LINT_SEVERITY)).toEqual(['off', 'off', 'warn', 'warn', 'warn', 'block']);
  });

  it('the programme is at DEMONSTRATORS, so severity is WARN and BLOCK is not permitted yet', () => {
    expect(CURRENT_MIGRATION_PHASE).toBe('DEMONSTRATORS');
    expect(lintSeverityForPhase(CURRENT_MIGRATION_PHASE)).toBe('warn');
    expect(mayEscalateToBlock(CURRENT_MIGRATION_PHASE)).toBe(false);
  });

  it('BLOCK belongs to HARDENING — programme Definition of Done, not package acceptance', () => {
    expect(mayEscalateToBlock('HARDENING')).toBe(true);
    expect(mayEscalateToBlock('PERSONA_MIGRATION')).toBe(false);
    expect(mayEscalateToBlock('RESIDUAL_SWEEP')).toBe(false);
  });
});

// ── the two defects this instrument found in ITSELF ─────────────────────────
//
// Both were found by running the protocol against the real Product, not by
// reading it. Each produced a passing capture of something that was not the
// Product, which is precisely the outcome WP126 exists to make impossible.

describe('KORA-WP-126 — a redirected capture is not evidence of the intended surface', () => {
  const landed = {
    intendedRoute: '/company/kora-index',
    finalUrl: 'http://localhost:3000/company/kora-index',
    documentHeightPx: 2400, viewportHeightPx: 900,
  };

  it('accepts a capture that landed on the intended route', () => {
    expect(checkLanding(landed).ok).toBe(true);
    expect(() => assertLanded(landed)).not.toThrow();
  });

  it('refuses the real failure: a silent redirect to the login surface', () => {
    const r = checkLanding({ ...landed, finalUrl: 'http://localhost:3000/login?role_hint=company' });
    expect(r.ok).toBe(false);
    expect(r.problems.join(' ')).toMatch(/authentication surface/);
    expect(r.problems.join(' ')).toMatch(/NOT a capture of the authenticated Product/);
  });

  it('refuses a redirect to any other surface, naming both routes', () => {
    const r = checkLanding({ ...landed, finalUrl: 'http://localhost:3000/company/workspace' });
    expect(r.ok).toBe(false);
    expect(r.problems.join(' ')).toMatch(/redirected from "\/company\/kora-index" to "\/company\/workspace"/);
  });

  it('refuses a document with no height', () => {
    expect(checkLanding({ ...landed, documentHeightPx: 0 }).ok).toBe(false);
  });

  it('throws rather than letting a redirected capture reach disk', () => {
    expect(() => assertLanded({ ...landed, finalUrl: 'http://localhost:3000/login' }))
      .toThrow(/capture refused after navigation/);
  });
});

describe('KORA-WP-126 — readiness is declared by the surface, never guessed', () => {
  it('accepts a declared marker with a source', () => {
    const r = assertReadinessDeclared(
      { selector: '[data-testid="company-kora-index-page"]', source: 'app/company/kora-index/page.tsx' },
      '/company/kora-index',
    );
    expect(r.selector).toContain('company-kora-index-page');
  });

  it('refuses a capture whose surface declares no readiness marker', () => {
    expect(() => assertReadinessDeclared(undefined, '/company/kora-index'))
      .toThrow(/declares no readiness marker/);
    expect(() => assertReadinessDeclared({ selector: '  ', source: 'x' }, '/company/kora-index'))
      .toThrow(/a loading state is not the Product/);
  });

  it('carries surface-ready in the suppression contract, so a generic probe is not enough', () => {
    expect(SUPPRESSED_NONDETERMINISM).toContain('surface-ready');
    expect(SUPPRESSED_NONDETERMINISM).toContain('loading-states');
  });
});
