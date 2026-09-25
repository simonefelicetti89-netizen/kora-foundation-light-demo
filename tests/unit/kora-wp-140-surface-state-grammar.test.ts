/**
 * KORA-WP-140 — Surface & State Grammar (PX-D).
 *
 * The invariants this package exists for live in a typed model, not in JSX, so
 * most of this suite is BEHAVIOURAL against `lib/design/surface-state-grammar.ts`
 * rather than structural. Where a component must be checked, the assertion is
 * structural — vitest runs `environment: 'node'`, there is no jsdom, and this
 * repository has no precedent for rendering React here (the same reasoning the
 * WP-125 suite records).
 *
 * The canonical enumeration is PINNED here as a literal rather than read from
 * `docs/BENCHMARK_V2_CANONICAL_GRAMMAR.md`, because that artifact lives on the
 * governance branch (commit `d4a815e`) and this Product branch descends from
 * `ac91cfa`, which predates it. Pinning follows the WP-125 baseline idiom: if
 * the canonical artifact ever changes, this literal must be changed with it and
 * the change is visible in review.
 *
 * The preservation blocks are the important ones. "Privacy Boundary preserved,
 * never regressed" and "WP-047 access-denied unchanged" are proven by comparing
 * the current files against PINNED SHA-256 DIGESTS of the WP-140 baseline
 * commit, so preservation is demonstrated rather than asserted.
 *
 * WHY DIGESTS AND NOT `git show <baseline>:<path>`: CI #329 proved that reading
 * git history here is not portable. `actions/checkout@v4` clones at depth 1, so
 * the baseline commit object does not exist in the runner's object store and
 * every such assertion errored — green locally, broken in CI. The digests below
 * were computed from that commit's real content and are pinned as literals, the
 * same pinned-baseline idiom the WP-125 suite already uses for its IA baseline.
 * The protection is unchanged in strength: any edit to a protected file changes
 * its digest and fails the assertion. If a protected file must ever legitimately
 * change, its digest must be updated here deliberately, which is visible in
 * review — which is the point.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import {
  SURFACE_ROLES, SURFACE_STATES, ROLE_CONTRACT, roleAllowsState,
  stateSemantics, stateTreatment, assessmentTreatment, isDangerTreatment,
  UnknownSurfaceStateError,
  type Assessment, type SurfaceRole, type SurfaceStateKind,
} from '@/lib/design/surface-state-grammar';
import { SAFE_AGGREGATION_THRESHOLD } from '@/lib/constants/kora';

const ROOT = process.cwd();
const read = (rel: string) => readFileSync(join(ROOT, rel), 'utf-8');
const sha = (s: string) => createHash('sha256').update(s).digest('hex');

/**
 * The commit this package branched from — the preservation baseline — and the
 * SHA-256 of each protected file AT that commit. Pinned literals, never read
 * from git history: see the header note on CI #329.
 */
const BASELINE = 'ac91cfa31e0bcad85071d467c9a5611a4668c29b';
const BASELINE_DIGEST: Record<string, string> = {
  'components/privacy/PrivacyBoundaryNotice.tsx': '834aa787910abeb2f0fd1607078b147f0a52dc081c20af44e38f9e4c4faed48c',
  'components/ui/EmptyState.tsx':                 '8a3597612a31eb6de9e86afa17c404fe5d8a4966ed32f1041c78d95f6de429b0',
  'components/privacy/AccessDeniedState.tsx':     'd1161aceee89d0eb2c4d610d82b224ce33f3f885805f4f0ddeec83a779030143',
  'lib/design/kora-design-tokens.ts':             '6d8bcc750a0daa96155ec49ff1031022c6a16c955b214511f1554744caab9430',
};

/** Asserts a file is byte-identical to its state at BASELINE. */
function expectUnchangedSinceBaseline(rel: string): void {
  const expected = BASELINE_DIGEST[rel];
  expect(expected, `no pinned baseline digest for ${rel}`).toBeDefined();
  expect(sha(read(rel)), `${rel} changed since ${BASELINE.slice(0, 7)}`).toBe(expected);
}

const GRAMMAR = 'lib/design/surface-state-grammar.ts';
const ROLES   = 'components/ui/px/roles.tsx';
const STATES  = 'components/ui/px/states.tsx';
const REPORTS = 'app/company/reports/page.tsx';

// ── Canonical enumeration — exactly nine, exactly seven ──────────────────────

describe('KORA-WP-140 — the canonical enumeration is exactly the ratified one', () => {
  const CANONICAL_ROLES = [
    'HERO_JUDGMENT', 'PRIMARY_METRIC', 'SUPPORTING_METRIC', 'EVIDENCE_PANEL',
    'WARNING_SAFEGUARD', 'ACTION', 'DISCLOSURE', 'SUPPRESSED_BOUNDARY', 'OPERATIONAL_ROW',
  ] as const;
  const CANONICAL_STATES = [
    'ZERO', 'NO_DATA', 'INSUFFICIENT_DATA', 'SUPPRESSED', 'NOT_YET_AVAILABLE', 'LOADING', 'ERROR',
  ] as const;

  it('declares exactly nine surface roles, in the canonical set — no tenth role', () => {
    expect(SURFACE_ROLES.length).toBe(9);
    expect([...SURFACE_ROLES].sort()).toEqual([...CANONICAL_ROLES].sort());
  });

  it('declares exactly seven states, in the canonical set — no eighth state', () => {
    expect(SURFACE_STATES.length).toBe(7);
    expect([...SURFACE_STATES].sort()).toEqual([...CANONICAL_STATES].sort());
  });

  it('every role ships a distinct component', () => {
    const src = read(ROLES);
    for (const name of [
      'HeroJudgment', 'PrimaryMetric', 'SupportingMetric', 'EvidencePanel', 'WarningSafeguard',
      'ActionGroup', 'Disclosure', 'BoundarySurface', 'OperationalRow',
    ]) {
      expect(src, `${name} missing`).toMatch(new RegExp(`export function ${name}\\b`));
    }
    // One component per role, not one component with a nine-way flag.
    expect((src.match(/export function [A-Z]/g) ?? []).length).toBeGreaterThanOrEqual(9);
  });

  it('every state ships a distinct component — not a variant of a shared one', () => {
    const src = read(STATES);
    for (const name of [
      'Zero', 'NoData', 'InsufficientData', 'Suppressed', 'NotYetAvailable', 'Loading', 'ErrorState',
    ]) {
      expect(src, `${name} missing`).toMatch(new RegExp(`export function ${name}\\b`));
    }
  });

  it('every role documents both its use AND its non-use', () => {
    for (const role of SURFACE_ROLES) {
      const c = ROLE_CONTRACT[role as SurfaceRole];
      expect(c.title.length, role).toBeGreaterThan(0);
      expect(c.use.length, role).toBeGreaterThan(10);
      expect(c.doNotUse.length, `${role} has no documented non-use`).toBeGreaterThan(10);
    }
  });
});

// ── Exhaustiveness — and the refusal to degrade the unknown into ERROR ───────

describe('KORA-WP-140 — the state model is exhaustive and never degrades to ERROR', () => {
  it('every canonical state resolves semantics and a treatment', () => {
    for (const k of SURFACE_STATES) {
      expect(() => stateSemantics(k as SurfaceStateKind)).not.toThrow();
      expect(stateTreatment(k as SurfaceStateKind).fill.length).toBeGreaterThan(0);
    }
  });

  it('an unknown state THROWS rather than being silently rendered as ERROR', () => {
    const bogus = 'PARTIALLY_AVAILABLE' as unknown as SurfaceStateKind;
    expect(() => stateSemantics(bogus)).toThrow(UnknownSurfaceStateError);
    // The point is the absence of a fallback: an unknown must never inherit the
    // fault treatment, because that reintroduces exactly this package's defect.
    expect(() => stateSemantics(bogus)).not.toThrow(/^$/);
  });

  it('the dispatcher has no default branch that maps to ERROR', () => {
    const src = read(STATES);
    const dispatcher = src.slice(src.indexOf('export function SurfaceStateView'));
    expect(dispatcher).toContain('const unreachable: never = state');
    expect(dispatcher).not.toMatch(/default:[\s\S]{0,200}ErrorState/);
  });

  it('exactly one state is a fault', () => {
    const faults = SURFACE_STATES.filter((k) => stateSemantics(k as SurfaceStateKind).isFault);
    expect(faults).toEqual(['ERROR']);
  });
});

// ── Invariant 1 — ZERO != NO DATA, structurally ─────────────────────────────

describe('KORA-WP-140 — ZERO != NO DATA is structural, not styling', () => {
  it('they are separate components with non-substitutable props', () => {
    const src = read(STATES);
    const zero   = /export function Zero\(\{ measured \}: \{ measured: string \}\)/;
    const noData = /export function NoData\(\{ missing, action \}/;
    expect(src).toMatch(zero);
    expect(src).toMatch(noData);
    // A ZERO must say what was measured; a NO DATA must say what was never
    // supplied. Neither prop set can satisfy the other, so the substitution the
    // old NoDataState pass-through allowed cannot be expressed.
    expect(src).not.toMatch(/export function NoData\([^)]*measured/);
    expect(src).not.toMatch(/export function Zero\([^)]*missing/);
  });

  it('each state names the other explicitly, so the reader is never left guessing', () => {
    const src = read(STATES);
    expect(src).toContain('È un risultato, non un dato mancante');
    expect(src).toContain('Non è una misurazione pari a zero');
  });

  it('the old conflation is gone: NoDataState no longer pass-through-renders a ZERO', () => {
    // The legacy wrapper is untouched by this package and still exists for its
    // existing consumers; what changed is that the canonical NO DATA state is
    // no longer reachable only through it.
    const grammar = read(GRAMMAR);
    expect(grammar).toMatch(/kind: 'ZERO';\s+measured: string/);
    expect(grammar).toMatch(/kind: 'NO_DATA';\s+missing: string/);
  });
});

// ── Invariant 2 — SUPPRESSED != ERROR, structurally ─────────────────────────

describe('KORA-WP-140 — SUPPRESSED != ERROR is structural, not styling', () => {
  it('they differ in assistive-technology semantics, not merely in colour', () => {
    const s = stateSemantics('SUPPRESSED');
    const e = stateSemantics('ERROR');
    expect(s.ariaRole).toBe('status');
    expect(e.ariaRole).toBe('alert');
    expect(s.ariaRole).not.toBe(e.ariaRole);
    expect(s.ariaLive).not.toBe(e.ariaLive);
  });

  it('a boundary is not a fault', () => {
    expect(stateSemantics('SUPPRESSED').isFault).toBe(false);
    expect(stateSemantics('ERROR').isFault).toBe(true);
  });

  it('they carry different treatments', () => {
    expect(stateTreatment('SUPPRESSED')).not.toEqual(stateTreatment('ERROR'));
    expect(isDangerTreatment(stateTreatment('SUPPRESSED'))).toBe(false);
  });

  it('SUPPRESSED is never expressed as access-denied or as an alert', () => {
    const src = read(STATES);
    const block = src.slice(src.indexOf('export function Suppressed'), src.indexOf('// ── 5.'));
    expect(block).not.toContain('access-denied');
    expect(block).not.toContain("role=\"alert\"");
    expect(block).not.toContain("role={'alert'}");
  });
});

// ── Invariant 3 — NOT YET AVAILABLE != ERROR, structurally ──────────────────

describe('KORA-WP-140 — NOT YET AVAILABLE != ERROR is structural', () => {
  it('a pending period is not a fault and is announced differently', () => {
    const n = stateSemantics('NOT_YET_AVAILABLE');
    const e = stateSemantics('ERROR');
    expect(n.isFault).toBe(false);
    expect(n.ariaRole).toBe('status');
    expect(n.ariaRole).not.toBe(e.ariaRole);
    expect(stateTreatment('NOT_YET_AVAILABLE')).not.toEqual(stateTreatment('ERROR'));
  });

  it('its copy states the distinction rather than relying on tone', () => {
    expect(read(STATES)).toContain('Non è un errore');
  });
});

// ── Semantic colour — a danger treatment on a healthy value is unconstructible ──

describe('KORA-WP-140 — semantic-colour correctness is structural', () => {
  const ALL: Assessment[] = [
    { kind: 'ok', label: 'Clear' },
    { kind: 'neutral', label: 'n/d' },
    { kind: 'watch', label: 'Warning', reason: 'r' },
    { kind: 'risk', label: 'Flagged', reason: 'r' },
  ];

  it('only a risk claim reaches the danger treatment', () => {
    for (const a of ALL) {
      expect(isDangerTreatment(assessmentTreatment(a)), a.kind).toBe(a.kind === 'risk');
    }
  });

  it('treatment is derived from the claim — there is no second parameter to override it', () => {
    expect(assessmentTreatment.length).toBe(1);
    expect(read(GRAMMAR)).toMatch(/export function assessmentTreatment\(a: Assessment\): Treatment/);
  });

  it('no role or state component exposes a tone, variant or colour prop', () => {
    for (const f of [ROLES, STATES]) {
      const src = read(f);
      // Prop declarations only — `data-px-*` attributes and internal locals are fine.
      expect(src, `${f} exposes a tone prop`).not.toMatch(/^\s+tone[?]?:/m);
      expect(src, `${f} exposes a variant prop`).not.toMatch(/^\s+variant[?]?:/m);
      expect(src, `${f} exposes a color prop`).not.toMatch(/^\s+colou?r[?]?:\s*string/m);
    }
  });

  it('the Warning/Safeguard role takes a semantic assessment, never a tone', () => {
    const src = read(ROLES);
    const block = src.slice(src.indexOf('export function WarningSafeguard'));
    expect(block).toContain('assessment: Assessment');
    expect(block).not.toMatch(/tone:/);
  });

  it('an alarm claim cannot be made without a stated reason', () => {
    const g = read(GRAMMAR);
    expect(g).toMatch(/\{ kind: 'watch';\s+label: string; reason: string \}/);
    expect(g).toMatch(/\{ kind: 'risk';\s+label: string; reason: string \}/);
    expect(g).toMatch(/\{ kind: 'ok';\s+label: string \}/);
  });

  it('the Warning/Safeguard role documents that it is never for a healthy value', () => {
    expect(ROLE_CONTRACT.WARNING_SAFEGUARD.doNotUse).toMatch(/never for a healthy value/);
  });

  it('a role may not render a state its contract forbids', () => {
    expect(roleAllowsState('SUPPRESSED_BOUNDARY', 'SUPPRESSED')).toBe(true);
    expect(roleAllowsState('SUPPRESSED_BOUNDARY', 'ERROR')).toBe(false);
    expect(roleAllowsState('DISCLOSURE', 'ERROR')).toBe(false);
    expect(roleAllowsState('WARNING_SAFEGUARD', 'SUPPRESSED')).toBe(false);
  });
});

// ── Privacy Boundary — preserved, never regressed ───────────────────────────

describe('KORA-WP-140 — the Privacy Boundary is preserved, not rebuilt', () => {
  const PBN = 'components/privacy/PrivacyBoundaryNotice.tsx';

  it('the reference implementation is byte-identical to the baseline', () => {
    expectUnchangedSinceBaseline(PBN);
  });

  it('the canonical SUPPRESSED state delegates to it rather than re-implementing it', () => {
    const src = read(STATES);
    expect(src).toContain("import { PrivacyBoundaryNotice } from '@/components/privacy/PrivacyBoundaryNotice'");
    const block = src.slice(src.indexOf('export function Suppressed'), src.indexOf('// ── 5.'));
    expect(block).toContain('<PrivacyBoundaryNotice');
  });

  it('the role-8 surface renders the same reference implementation', () => {
    const src = read(ROLES);
    const block = src.slice(src.indexOf('export function BoundarySurface'));
    expect(block).toContain('<Suppressed');
  });

  it('the N>=10 protection is not weakened', () => {
    expect(SAFE_AGGREGATION_THRESHOLD).toBe(10);
    expect(read(PBN)).toContain('SAFE_AGGREGATION_THRESHOLD');
    expect(read(PBN)).toContain('group_too_small');
  });

  it('suppression is still never silent', () => {
    expect(read(PBN)).toContain('role="status"');
    expect(read(PBN)).toContain('Suppression must never be silent');
  });
});

// ── WP-047 collision — access-denied behaviour is untouched ─────────────────

describe('KORA-WP-140 — the WP-047 accessibility lock is honoured, not superseded', () => {
  const EMPTY = 'components/ui/EmptyState.tsx';

  it('EmptyState is byte-identical to the baseline', () => {
    expectUnchangedSinceBaseline(EMPTY);
  });

  it('the exact asserted access-denied behaviour is still present', () => {
    expect(read(EMPTY)).toMatch(/role=\{variant === 'access-denied' \? 'alert' : undefined\}/);
  });

  it('AccessDeniedState is untouched — access denial is legitimately an alert', () => {
    expectUnchangedSinceBaseline('components/privacy/AccessDeniedState.tsx');
  });

  it('no WP-140 component routes suppression through the access-denied path', () => {
    for (const f of [ROLES, STATES, GRAMMAR]) {
      expect(read(f), f).not.toContain("'access-denied'");
    }
  });
});

// ── Demonstrator — /company/reports adopts the grammar ──────────────────────

describe('KORA-WP-140 — the /company/reports demonstrator consumes the grammar', () => {
  const src = () => read(REPORTS);

  it('adopts at least three canonical roles', () => {
    const adopted = [
      'HeroJudgment', 'PrimaryMetric', 'SupportingMetric', 'EvidencePanel',
      'WarningSafeguard', 'ActionGroup', 'Disclosure',
    ].filter((r) => new RegExp(`<${r}\\b`).test(src()));
    expect(adopted.length).toBeGreaterThanOrEqual(3);
  });

  it('carries exactly one Hero Judgment — a second hero would mean two jobs', () => {
    expect((src().match(/<HeroJudgment\b/g) ?? []).length).toBe(1);
  });

  it('the loading guard is the LOADING state, not an unlabelled sentence', () => {
    expect(src()).toMatch(/if \(sessionLoading \|\| loading\) \{\s*return <Loading /);
    expect(src()).not.toContain('Caricamento…');
  });

  it('an unscored period is NOT YET AVAILABLE — not NO DATA, not an error', () => {
    const guard = src().slice(src().indexOf('if (!hasKoraData)'), src().indexOf('const output'));
    expect(guard).toContain('<NotYetAvailable');
    expect(guard).not.toContain('<NoData');
    expect(guard).not.toContain('<ErrorState');
  });

  it('KORA Contribution is rendered as NOT YET AVAILABLE, not as an empty box', () => {
    expect(src()).toMatch(/KORA Contribution live sarà disponibile[\s\S]{0,80}\/>/);
    expect(src()).toContain('<NotYetAvailable expected="KORA Contribution live');
  });

  // CI #329 / populated visual evidence: the first adoption left a pre-existing
  // SectionLabel sitting directly above a role surface that carried its own
  // visible label, so six blocks announced themselves twice. One visible
  // heading per conceptual block — the role identity is structural, and a role
  // never has to print its own name to prove it exists.
  it('no conceptual block carries two visible headings', () => {
    expect(src(), 'a SectionLabel above a self-labelling role duplicates the heading')
      .not.toContain('<SectionLabel');
  });

  it('a role may omit its visible label when its content already has a heading', () => {
    const roles = read(ROLES);
    for (const r of ['EvidencePanel', 'Disclosure']) {
      const block = roles.slice(roles.indexOf(`export function ${r}(`));
      expect(block.slice(0, 400), `${r} must allow an unlabelled use`).toMatch(/label\?: string/);
    }
    // and the demonstrator actually uses that affordance where the child self-titles
    expect(src()).toMatch(/<EvidencePanel>\s*\n\s*<ActivationSafeguardPanel/);
    expect(src()).toMatch(/<EvidencePanel>\s*\n\s*<NormativeMappingLightSection/);
    expect(src()).toMatch(/<Disclosure>\s*\n\s*<PrivacyBoundaryNote/);
  });

  it('the safeguard states a semantic claim; a CLEAR safeguard cannot be a danger', () => {
    expect(src()).toContain('assessment={safeguardAssessment(output.safeguard_status)}');
    const fn = src().slice(src().indexOf('function safeguardAssessment'), src().indexOf('// C-09: Decision Pack live'));
    expect(fn).toMatch(/if \(status === 'CLEAR'\)[\s\S]{0,120}kind: 'ok'/);
    expect(fn).toMatch(/kind: 'risk'[\s\S]{0,300}reason:/);
  });

  it('KORA Contribution stays separate from the KORA Index, as the constitution requires', () => {
    expect(src()).toContain('not_kora_index_component: true');
    expect(src()).toContain('Non modifica e non influenza il KORA Index');
  });

  it('every mandatory KORA Index disclosure survives the migration', () => {
    const s = src();
    for (const label of [
      'pre_empirical_calibration', 'production_ready: false',
      'methodology_version_id', 'confidence_score', 'Activation Safeguard',
    ]) {
      expect(s, `${label} was dropped`).toContain(label);
    }
    expect(s).toContain('<ComponentBreakdown components={output.components} />');
  });

  it('no page behaviour changed: the same data path and the same export route', () => {
    const s = src();
    expect(s).toContain("useScoringResult({");
    expect(s).toContain('/api/company/decision-pack');
    expect(s).toContain('activationSafeguardService.evaluate(AR, MAR)');
  });
});

// ── Scope discipline ────────────────────────────────────────────────────────

describe('KORA-WP-140 — stays inside its scope', () => {
  it('does not touch the shared token file — the WP-139 collision surface stays clear', () => {
    expectUnchangedSinceBaseline('lib/design/kora-design-tokens.ts');
  });

  it('does not migrate typography: the demonstrator keeps its baseline type values', () => {
    // KORA-WP-139 owns the scale and migrates this surface after this adoption
    // lands. WP-140 must not pre-empt it.
    const s = read(REPORTS);
    expect(s).toContain("fontSize: '2.5rem'");
    expect(s).toContain("fontSize: '13px'");
  });

  it('declares no colour literal of its own', () => {
    const COLOUR = /#[0-9A-Fa-f]{3,8}\b|(?<![\w-])(?:rgba?|hsla?|color-mix)\s*\(/gi;
    for (const f of [ROLES, STATES, GRAMMAR]) {
      const stripped = read(f).split('\n').filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');
      expect(stripped.match(COLOUR) ?? [], `${f} declares colour locally`).toEqual([]);
    }
  });
});
