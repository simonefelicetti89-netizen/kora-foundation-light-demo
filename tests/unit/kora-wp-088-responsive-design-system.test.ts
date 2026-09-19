// tests/unit/kora-wp-088-responsive-design-system.test.ts
// KORA-WP-088 — Responsive / Design System Full Closure.
// Closes KORA-GAP-DESIGN-001 and KORA-GAP-RESPONSIVE-001.
//
// Extends the WP-047 / WP-073 structural-assertion convention (this repo has
// no DOM-rendering test environment: vitest runs `environment: 'node'`, no
// jsdom/testing-library is installed, and no precedent exists for rendering a
// React component). No new dependency is introduced.
//
// FOUNDER COLOUR ADJUDICATION (recorded here so the rule is testable, not just
// documented): the warm KORA token system in lib/design/kora-design-tokens.ts
// is canonical, including the current pillar colour direction. docs/30's former
// cool blue-violet pillar restriction is superseded ON COLOUR ONLY.

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { PILLAR_COLORS, PILLAR_SURFACE, TOKENS } from '@/lib/design/kora-design-tokens';

const ROOT = process.cwd();
const read = (rel: string) => readFileSync(join(ROOT, rel), 'utf-8');

function walk(dir: string, exts: string[]): string[] {
  const out: string[] = [];
  const stack = [dir];
  while (stack.length) {
    const d = stack.pop()!;
    let entries: string[];
    try { entries = readdirSync(join(ROOT, d)); } catch { continue; }
    for (const e of entries) {
      const p = `${d}/${e}`;
      if (p.includes('node_modules')) continue;
      let st;
      try { st = statSync(join(ROOT, p)); } catch { continue; }
      if (st.isDirectory()) stack.push(p);
      else if (exts.some((x) => e.endsWith(x))) out.push(p);
    }
  }
  return out;
}

// Surfaces that legitimately contain hex and are NOT WP-088 design-system debt.
const HEX_EXEMPT = new Set([
  'lib/design/kora-design-tokens.ts',   // the canonical token source itself
  'app/globals.css',                    // CSS-variable mirror of the token source
  'app/landing.module.css',             // scoped landing system (public surface)
  'lib/decision-pack/html-template.ts', // standalone HTML export artefact, not an app surface
  'app/pilot/pilot.module.css',
  'components/landing/marketing.module.css',
]);
const isExemptPath = (p: string) =>
  HEX_EXEMPT.has(p) ||
  p.startsWith('components/company/living-koral') ||  // deferred Living KORAL — hard exclusion
  p.startsWith('lib/living-koral') ||
  p.includes('future-vision');                        // Future Vision — out of scope

// ── FOUNDER COLOUR ADJUDICATION — durable record ───────────────────────────

describe('KORA-WP-088 — Founder colour adjudication is recorded in the canonical token source', () => {
  const tokens = read('lib/design/kora-design-tokens.ts');

  it('the token file records that the warm system is ratified as canonical', () => {
    expect(tokens).toMatch(/FOUNDER COLOUR ADJUDICATION/);
    expect(tokens).toMatch(/warm KORA token direction is canonical/);
  });

  it('records that the docs/30 cool blue-violet pillar restriction is superseded (colour only)', () => {
    expect(tokens).toMatch(/SUPERSEDED/);
    expect(tokens).toMatch(/cool blue-violet family/);
  });

  it('records that #06032B and #6156F5 remain valid official brand colours, and that violet is NOT promoted into the pillar family', () => {
    expect(tokens).toMatch(/#06032B/);
    expect(tokens).toMatch(/#6156F5/);
    expect(tokens).toMatch(/violet is NOT promoted/i);
  });

  it('docs/30 §6 carries the supersession notice without deleting its original text', () => {
    const d30 = read('docs/30-kora-brand-visual-product-experience-constitution.md');
    expect(d30).toMatch(/SECTION 6 SUPERSEDED ON COLOUR/);
    // original text preserved, not falsified
    expect(d30).toMatch(/Warm colors \(red, orange, gold\) must not be assigned to pillars/);
  });

  it('the historical open pillar-colour notes are closed, not silently deleted', () => {
    expect(read('docs/EXPERIENCE_LAYER.md')).toMatch(/RISOLTA \(KORA-WP-088/);
    expect(read('app/page.tsx')).toMatch(/RISOLTA \(KORA-WP-088\)/);
  });
});

// ── PILLAR IDENTITY CONSISTENCY (the core DESIGN-001 divergence) ────────────

describe('KORA-WP-088 — pillar identity is consistent across the application', () => {
  it('PILLAR_SURFACE is derived from PILLAR_COLORS — it introduces no new brand colour', () => {
    for (const k of Object.keys(PILLAR_COLORS) as (keyof typeof PILLAR_COLORS)[]) {
      expect(PILLAR_SURFACE[k].color).toBe(PILLAR_COLORS[k]);
      // bg/border are the same colour at the alpha levels the token file already uses
      expect(PILLAR_SURFACE[k].bg).toMatch(/^rgba\(\d+,\d+,\d+,0\.08\)$/);
      expect(PILLAR_SURFACE[k].border).toMatch(/^rgba\(\d+,\d+,\d+,0\.22\)$/);
    }
  });

  it('the ratified pillar values are exactly the warm set the Founder approved', () => {
    expect(PILLAR_COLORS.LIFE).toBe('#C76F3D');
    expect(PILLAR_COLORS.GROWTH).toBe('#2F7D55');
    expect(PILLAR_COLORS.CONNECTION).toBe('#D99767');
    expect(PILLAR_COLORS.IMPACT).toBe('#D99A2B');
    expect(PILLAR_COLORS.LEGACY).toBe('#8A7562');
  });

  it('no file declares a local pillar->colour map with hex values that shadow the canonical token', () => {
    const offenders: string[] = [];
    for (const p of walk('app', ['.tsx', '.ts']).concat(walk('components', ['.tsx', '.ts']))) {
      if (isExemptPath(p)) continue;
      const src = read(p);
      // a LIFE: entry whose value is a raw hex (or an object containing one)
      const m = src.match(/\bLIFE:\s*(?:\{[^}\n]*)?'?#[0-9A-Fa-f]{3,6}/);
      if (m) offenders.push(p);
    }
    expect(offenders, `local pillar colour maps must route through PILLAR_COLORS / PILLAR_SURFACE: ${offenders.join(', ')}`).toEqual([]);
  });
});

// ── RESPONSIVE CHROME (highest-leverage RESPONSIVE-001 fix) ────────────────

describe('KORA-WP-088 — shared authenticated chrome is responsive', () => {
  const sidebar = read('components/layout/Sidebar.tsx');
  const appshell = read('components/layout/AppShell.tsx');
  const header = read('components/layout/Header.tsx');

  it('Sidebar is no longer an unconditional fixed-width column', () => {
    // the pre-WP-088 defect: width AND minWidth hard-coded in an inline style
    // with no breakpoint anywhere in the file.
    expect(sidebar).not.toMatch(/width:\s*'264px',\s*\n\s*minWidth:\s*'264px'/);
  });

  it('Sidebar collapses to an off-canvas drawer below md and is a static column at md+', () => {
    expect(sidebar).toMatch(/-translate-x-full/);
    expect(sidebar).toMatch(/md:static/);
    expect(sidebar).toMatch(/md:translate-x-0/);
  });

  it('Sidebar drawer is keyboard-dismissable and closes on navigation', () => {
    expect(sidebar).toMatch(/'Escape'/);
    expect(sidebar).toMatch(/closeDrawer\(\)/);
  });

  it('Header exposes an accessible mobile toggle wired to the drawer', () => {
    expect(header).toMatch(/aria-expanded=\{drawer\.open\}/);
    expect(header).toMatch(/aria-controls=\{SIDEBAR_DRAWER_ID\}/);
    expect(header).toMatch(/aria-label=\{drawer\.open \?/);
    expect(header).toMatch(/md:hidden/);   // toggle is mobile-only
  });

  it('the Header toggle meets the 44px minimum touch target (WP-047 baseline, preserved)', () => {
    expect(header).toMatch(/h-11 w-11/);
  });

  it('AppShell main padding steps down on narrow viewports instead of a fixed 40px gutter', () => {
    expect(appshell).not.toMatch(/padding:\s*'32px 40px'/);
    expect(appshell).toMatch(/px-4/);
    expect(appshell).toMatch(/lg:px-10/);
  });

  it('AppShell provides the drawer context that Header and Sidebar share', () => {
    expect(appshell).toMatch(/SidebarDrawerProvider/);
  });

  it('the drawer is presentation only — it adds no navigation item, route or role logic', () => {
    // strip comments first: the file's own header legitimately *describes*
    // what it does not do ("changes nothing about ... route architecture, or
    // role resolution"), which must not be read as the thing itself.
    const ctx = read('components/layout/SidebarDrawerContext.tsx')
      .split('\n').filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');
    expect(ctx).not.toMatch(/href=|useRouter|usePathname|NAV_|buildNavGroups|koraRole/);
  });
});

// ── TABLES ─────────────────────────────────────────────────────────────────

describe('KORA-WP-088 — data tables are horizontally containable on narrow viewports', () => {
  it('every in-scope file rendering a <table> provides horizontal containment', () => {
    const offenders: string[] = [];
    for (const p of walk('app', ['.tsx']).concat(walk('components', ['.tsx']))) {
      if (isExemptPath(p)) continue;
      const src = read(p);
      if (!src.includes('<table')) continue;
      // print layouts target paper, not a viewport — legitimately exempt
      if (p.includes('/print/')) continue;
      if (!/overflowX|overflow-x/.test(src)) offenders.push(p);
    }
    expect(offenders, `tables need an overflow-x container: ${offenders.join(', ')}`).toEqual([]);
  });
});

// ── GRIDS ──────────────────────────────────────────────────────────────────

describe('KORA-WP-088 — card/metric grids wrap instead of overflowing', () => {
  it('no in-scope file uses a rigid repeat(N>=3, 1fr) grid without auto-fit/minmax', () => {
    const offenders: string[] = [];
    for (const p of walk('app', ['.tsx']).concat(walk('components', ['.tsx']))) {
      if (isExemptPath(p)) continue;
      if (p.includes('/print/')) continue;  // paper layout, fixed columns intentional
      const src = read(p);
      for (const m of src.matchAll(/repeat\((\d+),\s*1fr\)/g)) {
        if (Number(m[1]) >= 3) offenders.push(`${p} (repeat(${m[1]}, 1fr))`);
      }
    }
    expect(offenders, `rigid grids must use auto-fit/minmax: ${offenders.join(', ')}`).toEqual([]);
  });
});

// ── PRESENTATION-HEX RATCHET ───────────────────────────────────────────────
// The remaining literal debt is real and disclosed (report 202). These bounds
// are a RATCHET, not a pass: they can only ever be lowered. They make the
// remaining debt impossible to grow silently, and any future remediation batch
// simply tightens the numbers.

describe('KORA-WP-088 — presentation-hex ratchet (remaining debt cannot grow)', () => {
  function scan() {
    const files = walk('app', ['.ts', '.tsx', '.css'])
      .concat(walk('components', ['.ts', '.tsx', '.css']))
      .concat(walk('lib', ['.ts', '.tsx', '.css']));
    let occurrences = 0;
    const withHex: string[] = [];
    for (const p of files) {
      if (isExemptPath(p)) continue;
      const n = (read(p).match(/#[0-9A-Fa-f]{6}\b/g) ?? []).length;
      if (n) { withHex.push(p); occurrences += n; }
    }
    return { fileCount: withHex.length, occurrences };
  }

  const BASELINE_FILES = 182;
  const BASELINE_OCCURRENCES = 1967;

  it(`no more than ${BASELINE_FILES} in-scope files carry a presentation hex literal`, () => {
    expect(scan().fileCount).toBeLessThanOrEqual(BASELINE_FILES);
  });

  it(`no more than ${BASELINE_OCCURRENCES} presentation hex literals remain in scope`, () => {
    expect(scan().occurrences).toBeLessThanOrEqual(BASELINE_OCCURRENCES);
  });

  it('the canonical core palette is no longer duplicated as an inline-style literal', () => {
    // These ten values were fully routed through tokens in this WP. A raw
    // `prop: '#HEX'` reintroduction of any of them is a regression.
    const CORE = ['#06032B', '#F8F6F1', '#EFEBE2', '#E3DDD3', '#C76F3D',
                  '#2F7D55', '#9E3B2F', '#D99A2B', '#6156F5', '#8A5A00'];
    const offenders: string[] = [];
    for (const p of walk('app', ['.tsx']).concat(walk('components', ['.tsx']))) {
      if (isExemptPath(p)) continue;
      const src = read(p);
      for (const v of CORE) {
        const re = new RegExp(`\\b\\w+\\s*:\\s*'${v}'`, 'i');
        if (re.test(src)) offenders.push(`${p} (${v})`);
      }
    }
    expect(offenders, `core palette must come from TOKENS: ${offenders.join(', ')}`).toEqual([]);
  });
});

// ── DESIGN-SYSTEM FAMILY CONTRACTS ─────────────────────────────────────────

describe('KORA-WP-088 — reusable design-system families exist and are token-driven', () => {
  const families: [string, string][] = [
    ['navigation',              'components/layout/Sidebar.tsx'],
    ['forms',                   'components/ui/Field.tsx'],
    ['tables',                  'components/ui/Table.tsx'],
    ['cards',                   'components/ui/IntelCard.tsx'],
    ['states/badges',           'components/badges/SafeguardBadge.tsx'],
    ['empty/error/loading',     'components/ui/EmptyState.tsx'],
    ['permission-denied',       'components/ui/BoundaryBanner.tsx'],
    ['data visualisation',      'components/charts/ChartFrame.tsx'],
    ['evidence/confidence',     'components/ui/Explainer.tsx'],
    ['responsive layout',       'components/layout/AppShell.tsx'],
  ];

  for (const [family, file] of families) {
    it(`${family}: ${file} exists`, () => {
      expect(existsSync(join(ROOT, file)), `${family} family missing`).toBe(true);
    });
  }

  it('the canonical token module exposes the semantic families the design system depends on', () => {
    expect(TOKENS.safeguard).toBeDefined();
    expect(TOKENS.cardRadius).toBeDefined();
    expect(TOKENS.accent).toBe('#C76F3D');
    expect(TOKENS.ink).toBe('#06032B');
  });
});

// ── NON-REGRESSION: WP-047 / WP-073 boundaries ─────────────────────────────

describe('KORA-WP-088 — WP-047 / WP-073 decisions are not reopened', () => {
  it('the five-environment navigation structure is untouched (OQ-D01 closure preserved)', () => {
    const sidebar = read('components/layout/Sidebar.tsx');
    for (const h of ['Command', 'Intelligence', 'Evidence & Report', 'Network', 'Governance']) {
      expect(sidebar).toContain(h);
    }
  });

  it('accessibility semantics added by WP-073 remain in place', () => {
    expect(read('components/layout/AppShell.tsx')).toMatch(/aria-label="Contenuto principale"/);
    expect(read('components/layout/Sidebar.tsx')).toMatch(/aria-label="Navigazione principale"/);
    expect(read('components/auth/AccountMenu.tsx')).toMatch(/aria-haspopup="true"/);
  });

  it('Living KORAL renderer surfaces are untouched by this WP', () => {
    // the deferred renderer is not even present in this worktree; the three
    // committed Living KORAL components must carry no WP-088 marker.
    for (const p of ['components/company/living-koral/EditionsArchive.tsx',
                     'components/company/living-koral/LivingKoralNav.tsx',
                     'components/company/living-koral/LivingKoralOverview.tsx']) {
      if (!existsSync(join(ROOT, p))) continue;
      expect(read(p)).not.toMatch(/WP-088/);
    }
  });
});
