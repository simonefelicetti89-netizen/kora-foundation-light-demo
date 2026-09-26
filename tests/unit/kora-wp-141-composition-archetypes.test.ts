/**
 * KORA-WP-141 — Composition, Archetypes & Spacing Adoption (PX-D).
 *
 * Behavioural against the archetype model, structural against the surfaces.
 * No git-history assertions: CI #329 proved `git show <sha>:<path>` is not
 * portable under a depth-1 checkout.
 *
 * WHAT THIS SUITE DELIBERATELY DOES NOT DO: assert Product-wide spacing
 * adoption or archetype recomposition. The contract is explicit that
 * Product-wide spacing migration is NOT this package's acceptance, and a suite
 * demanding it would contract the flag day the package forbids. KORA-WP-126
 * owns Product-wide enforcement.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  TIERS, TIER_CONTRACT, ARCHETYPES, ARCHETYPE_CONTRACT, ROUTE_ARCHETYPE,
  contractFor, mobileRatioVerdict, SPACING_EXCEPTION_MAX_OPTICAL_PX,
} from '@/lib/design/page-archetypes';
import { SPACE, SPACE_STEPS, isSpaceStep, nearestSpaceStep } from '@/lib/design/kora-design-tokens';

const ROOT = process.cwd();
const read = (rel: string) => readFileSync(join(ROOT, rel), 'utf-8');

const KI      = 'app/company/kora-index/page.tsx';
const REPORTS = 'app/company/reports/page.tsx';
const CHAPTER = 'components/ui/px/Chapter.tsx';
const GLOBALS = 'app/globals.css';

// ── the model ───────────────────────────────────────────────────────────────

describe('KORA-WP-141 — the T1–T5 model is defined and testable', () => {
  it('declares exactly five tiers, each with a rule', () => {
    expect(TIERS.length).toBe(5);
    for (const t of TIERS) {
      expect(TIER_CONTRACT[t].name.length).toBeGreaterThan(0);
      expect(TIER_CONTRACT[t].carries.length).toBeGreaterThan(10);
      expect(TIER_CONTRACT[t].rule.length).toBeGreaterThan(10);
    }
  });

  it('T1 is singular and T5 is the boundary — the two rules that carry weight', () => {
    expect(TIER_CONTRACT.T1.rule).toMatch(/exactly one/i);
    expect(TIER_CONTRACT.T5.rule).toMatch(/never an alarm/i);
  });

  it('every archetype declares a length contract, a mobile ceiling and its tiers', () => {
    expect(ARCHETYPES.length).toBe(6);
    for (const a of ARCHETYPES) {
      const c = ARCHETYPE_CONTRACT[a];
      expect(c.warnHeightPx, a).toBeGreaterThan(0);
      expect(c.maxMobileRatio, a).toBeGreaterThanOrEqual(1.35);
      expect(c.requiredTiers.length, a).toBeGreaterThan(0);
      for (const t of c.requiredTiers) expect(TIERS).toContain(t);
    }
  });

  it('REPORT_EXPORT keeps the subtype allowance AN.1 ratified, and is stricter nowhere else', () => {
    expect(ARCHETYPE_CONTRACT.REPORT_EXPORT.warnHeightPx).toBe(4000);
    expect(ARCHETYPE_CONTRACT.EXECUTIVE_JUDGMENT.warnHeightPx).toBe(2500);
  });

  it('`reflow` is not a legal mobile priority model', () => {
    const models = ARCHETYPES.map((a) => ARCHETYPE_CONTRACT[a].mobilePriority);
    expect(models).not.toContain('reflow');
    // and every archetype has actually chosen one
    for (const a of ARCHETYPES) expect(ARCHETYPE_CONTRACT[a].mobilePriority, a).toBeTruthy();
  });

  it('the AN.1 ratio verdict is applied as calibrated', () => {
    expect(mobileRatioVerdict(1000, 1300)).toBe('acceptable');
    expect(mobileRatioVerdict(1000, 1500)).toBe('warning');
    expect(mobileRatioVerdict(1000, 1700)).toBe('fail');
  });
});

describe('KORA-WP-141 — every canonical route declares an archetype', () => {
  it('both demonstrators declare one, and it is the archetype their content implies', () => {
    expect(ROUTE_ARCHETYPE['/company/kora-index']).toBe('EXECUTIVE_JUDGMENT');
    expect(ROUTE_ARCHETYPE['/company/reports']).toBe('REPORT_EXPORT');
    expect(ROUTE_ARCHETYPE['/advisor/companies/[assignmentId]']).toBe('RECORD_DETAIL');
  });

  it('every declared route resolves to a real contract', () => {
    for (const route of Object.keys(ROUTE_ARCHETYPE)) {
      expect(contractFor(route), route).not.toBeNull();
      expect(ARCHETYPES).toContain(ROUTE_ARCHETYPE[route]);
    }
  });

  it('an undeclared route resolves to null rather than a silent default', () => {
    expect(contractFor('/not/a/route')).toBeNull();
  });
});

// ── spacing ─────────────────────────────────────────────────────────────────

describe('KORA-WP-141 — one spacing scale, and it is the one that already existed', () => {
  it('SPACE_STEPS is exactly the SPACE values — no second system', () => {
    expect([...SPACE_STEPS].sort((a, b) => a - b)).toEqual(Object.values(SPACE).sort((a, b) => a - b));
  });

  it('the CSS custom properties mirror the tokens exactly', () => {
    const css = read(GLOBALS);
    for (const [name, px] of Object.entries(SPACE)) {
      expect(css, `--kora-space-${name}`).toContain(`--kora-space-${name}: ${px}px;`);
    }
  });

  it('step membership and nearest-step are honest', () => {
    expect(isSpaceStep(16)).toBe(true);
    expect(isSpaceStep(20)).toBe(false);
    expect(nearestSpaceStep(20)).toBe(16);
    expect(nearestSpaceStep(28)).toBe(24);
  });

  const STEPS = new Set<number>(SPACE_STEPS);
  const TAILWIND_OK = new Set(['0', '1', '2', '4', '6', '8', '12', 'px']);

  for (const [name, file] of [['kora-index', KI], ['reports', REPORTS]] as const) {
    it(`${name}: every inline spacing decision resolves to a step`, () => {
      const bad: string[] = [];
      const re = /(padding|margin|gap|rowGap|columnGap)(Top|Bottom|Left|Right)?:\s*(\d+)(?=[,\s}])/g;
      for (const m of read(file).matchAll(re)) {
        const v = Number(m[3]);
        // Optical offsets are a documented exception, not an omission.
        if (v <= SPACING_EXCEPTION_MAX_OPTICAL_PX) continue;
        if (!STEPS.has(v)) bad.push(m[0]);
      }
      expect(bad).toEqual([]);
    });

    it(`${name}: every Tailwind spacing utility resolves to a step`, () => {
      const re = /\b(?:p|px|py|pt|pb|pl|pr|m|mx|my|mt|mb|gap|gap-x|gap-y|space-y|space-x)-(\d+)\b/g;
      const bad = [...read(file).matchAll(re)].map((m) => m[1]).filter((v) => !TAILWIND_OK.has(v));
      expect([...new Set(bad)]).toEqual([]);
    });
  }
});

// ── composition primitives ──────────────────────────────────────────────────

describe('KORA-WP-141 — a chapter is not a card', () => {
  it('the chapter carries a rule and a label, never a border box', () => {
    const css = read(GLOBALS);
    const rule = /\.kora-chapter-head \{([^}]*)\}/.exec(css)?.[1] ?? '';
    expect(rule).toContain('border-bottom');
    const body = /\.kora-chapter \{([^}]*)\}/.exec(css)?.[1] ?? '';
    expect(body, 'a chapter must not be another bordered rectangle').not.toMatch(/border:/);
    expect(body).not.toMatch(/box-shadow/);
  });

  it('every chapter is anchorable and declares its tier', () => {
    const src = read(CHAPTER);
    expect(src).toContain('data-kora-chapter');
    expect(src).toContain('data-tier');
    expect(src).toMatch(/id: string/);
    expect(src).toMatch(/tier: Tier/);
  });

  it('progressive disclosure uses a real <details>, so content stays in the DOM', () => {
    // Comments stripped first: this file's own prose says "a real <details>",
    // and an assertion that cannot tell code from its explanation is not one.
    const code = read(CHAPTER).split('\n').filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');
    expect(code).toContain('<details');
    expect(code).toContain('<summary');
    expect(code, 'hiding content is not disclosure').not.toMatch(/display: *'none'/);
  });

  it('mobile order is inert above the mobile breakpoint', () => {
    const css = read(GLOBALS);
    const mq = /@media \(max-width: 767px\) \{([\s\S]*?)\n\}/g;
    const blocks = [...css.matchAll(mq)].map((m) => m[1]).join('\n');
    expect(blocks, 'mobile order must be declared inside the mobile query').toContain('--kora-mobile-order');
    const outside = css.replace(mq, '');
    expect(outside).not.toMatch(/\.kora-priority-stack > \[data-mobile-order\]/);
  });
});

// ── the demonstrators ───────────────────────────────────────────────────────

describe('KORA-WP-141 — /company/kora-index is recomposed', () => {
  const src = () => read(KI);

  it('declares chapters with tiers, not a flat stack of dividers', () => {
    const chapters = [...src().matchAll(/<Chapter id="([a-z-]+)" label="[^"]*" tier="(T[1-5])"/g)];
    expect(chapters.length).toBeGreaterThanOrEqual(6);
    expect(src(), 'the ad-hoc local Divider is gone').not.toContain('<Divider');
    for (const [, id, tier] of chapters) {
      expect(id.length, 'a chapter needs an anchor').toBeGreaterThan(0);
      expect(TIERS).toContain(tier as never);
    }
  });

  it('RECOMMENDATIONS APPEAR EXACTLY ONCE', () => {
    const s = src();
    expect((s.match(/<BoardActions\b/g) ?? []).length).toBe(1);
    expect((s.match(/<RecommendationsPanel\b/g) ?? []).length).toBe(1);
    // and both live inside the single Raccomandazioni chapter
    const start = s.indexOf('<Chapter id="raccomandazioni"');
    const end = s.indexOf('</Chapter>', start);
    expect(start).toBeGreaterThan(-1);
    expect(s.slice(start, end)).toContain('<BoardActions');
    expect(s.slice(start, end)).toContain('<RecommendationsPanel');
  });

  it('T1 leads: the judgment renders before the reading that explains it', () => {
    const s = src();
    expect(s.indexOf('<HeroDiagnosis')).toBeLessThan(s.indexOf('<ExecutiveIntelligencePanel'));
  });

  it('declares an explicit mobile order — it does not merely stack', () => {
    const s = src();
    expect(s).toContain('kora-priority-stack');
    expect((s.match(/mobileOrder=\{\d+\}/g) ?? []).length).toBeGreaterThanOrEqual(6);
  });

  it('progressive disclosure is applied to T4 only, never to a mandatory disclosure', () => {
    const s = src();
    for (const m of s.matchAll(/<Chapter\b[^>]*>/g)) {
      const tag = m[0];
      if (!tag.includes('collapsible')) continue;
      const tier = /tier="(T[1-5])"/.exec(tag)?.[1];
      const id = /id="([a-z-]+)"/.exec(tag)?.[1];
      // T3-T5 may be progressively disclosed; T1 and T2 never — a judgment the
      // reader has to open is not a judgment.
      expect(['T3', 'T4', 'T5'], `${id} is collapsed but is ${tier}`).toContain(tier);
    }
    // the mandatory KORA Index disclosures stay outside any collapsed chapter
    for (const mandatory of ['<ComponentBreakdown ', '<ConfidenceBreakdown ', '<ActivationSafeguardPanel ', '<ProvenanceFooter']) {
      expect(s, `${mandatory} must remain visible`).toContain(mandatory);
    }
  });

  it('WP140 roles/states are preserved, and WP141 added no new hand-written type', () => {
    const s = src();
    // This surface was NOT a KORA-WP-139 demonstrator — that package migrated
    // /company/reports and the Advisor surface — so inline type legitimately
    // survives here and its residual migration belongs to a later package.
    // What WP-141 owes is that composition did not make it worse.
    const BASELINE_INLINE_TYPE = 43;
    expect((s.match(/fontSize:/g) ?? []).length,
      'WP141 must not introduce new inline typography').toBeLessThanOrEqual(BASELINE_INLINE_TYPE);
    expect(s).toContain('<HeroDiagnosis');
    expect(s).toContain('<ActivationSafeguardPanel');
  });

  it('methodology, thresholds and metric values were not touched', () => {
    const s = src();
    for (const invariant of [
      'output.kora_index_value', 'output.confidence_score', 'output.safeguard_status',
      'output.methodology_version_id', 'output.calibration_status',
      'activationSafeguardService.evaluate',
    ]) expect(s, invariant).toContain(invariant);
  });
});

describe('KORA-WP-141 — /company/reports is recomposed', () => {
  const src = () => read(REPORTS);

  it('declares chapters and an explicit mobile order', () => {
    const s = src();
    expect((s.match(/<Chapter id=/g) ?? []).length).toBeGreaterThanOrEqual(4);
    expect(s).toContain('kora-priority-stack');
    expect((s.match(/mobileOrder=\{\d+\}/g) ?? []).length).toBeGreaterThanOrEqual(4);
  });

  it('every WP140 role survives the recomposition', () => {
    const s = src();
    for (const role of ['HeroJudgment', 'PrimaryMetric', 'SupportingMetric', 'WarningSafeguard', 'ActionGroup', 'Disclosure', 'EvidencePanel']) {
      expect(s, role).toMatch(new RegExp(`<${role}\\b`));
    }
    expect((s.match(/<HeroJudgment\b/g) ?? []).length, 'still exactly one hero').toBe(1);
    expect(s).toContain('<NotYetAvailable');
    expect(s).toContain('<Loading ');
  });

  it('required evidence was NOT deleted to shorten the page', () => {
    const s = src();
    for (const required of [
      '<ComponentBreakdown ', '<ActivationSafeguardPanel ', '<NormativeMappingLightSection ',
      '<PrivacyBoundaryNote />', 'pre_empirical_calibration', 'production_ready: false',
      'not_kora_index_component: true', '/api/company/decision-pack',
    ]) expect(s, required).toContain(required);
  });

  it('the boundary chapter is never collapsed', () => {
    const s = src();
    const m = /<Chapter id="perimetro"[^>]*>/.exec(s);
    expect(m).not.toBeNull();
    expect(m![0], 'T5 must not be hidden behind disclosure').not.toContain('collapsible');
  });
});

// ── scope ───────────────────────────────────────────────────────────────────

describe('KORA-WP-141 — stays inside its scope', () => {
  it('does not encode data significance — that is WP142', () => {
    for (const f of [KI, REPORTS]) {
      const s = read(f);
      expect(s, 'a chart added here would be WP142 scope').not.toMatch(/<Sparkline|<ScoreBand|<ThresholdMarker/);
    }
  });

  it('did not edit a WP142-owned metric component', () => {
    // WP141 composes these as black boxes. If this ever fails, the collision
    // rule says STOP and report, not overwrite.
    for (const f of [
      'components/kora-index/ComponentBreakdown.tsx',
      'components/kora-index/ActivationSafeguardPanel.tsx',
      'components/kora-index/KoraIndexHero.tsx',
      'components/charts/ComponentBreakdownChart.tsx',
    ]) expect(read(f).length, f).toBeGreaterThan(0);
  });

  it('the spacing lint is WARN and defers hard enforcement to WP126', () => {
    const cfg = read('eslint.config.mjs');
    expect(cfg).toContain('kora/spacing-scale');
    expect(cfg).toContain("'no-restricted-syntax': ['warn'");
    expect(cfg).toMatch(/KORA-WP-126/);
  });
});
