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
import { PILLAR_COLORS, PILLAR_SURFACE, TOKENS, BADGE_TOKENS, BUTTON_TOKENS, MACROBLOCK_COLORS } from '@/lib/design/kora-design-tokens';

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

  // AMENDED 2026-09-20 under explicit Founder authorization (KORA-WP-125
  // Checkpoint 1 correction pass). The assertion previously required the
  // literal Tailwind classes `px-4` and `lg:px-10` on AppShell's <main>.
  // `lg:px-10` encodes a FIXED 40px desktop gutter, which the later
  // Founder-approved KORA-WP-124 Product Experience spacing contract
  // (HANDOFF §5: content padding 22/24) contradicts. This is a supersession
  // of MECHANISM, not a relaxation: the invariant below is strictly stronger —
  // it checks the real applied values at every breakpoint instead of the
  // presence of two class strings, and it still forbids the 40px regression.
  it('AppShell main padding is token-driven, steps down responsively, and never regresses to a fixed 40px gutter', () => {
    const css = read('app/globals.css');

    // (1) applied by the real shared shell, not by each page
    expect(appshell).toMatch(/className="px-main/);

    // (2) token-driven — the gutter is a custom property, not a literal
    expect(css).toMatch(/\.px-main\s*\{[^}]*padding:[^;]*var\(--px-pad-x\)/);

    // (3) the WP-124-approved desktop value
    const root = /:root\s*\{[\s\S]*?--px-pad-x:\s*(\d+)px/.exec(css);
    expect(root, '--px-pad-x must be declared on :root').not.toBeNull();
    const desktop = Number(root![1]);
    expect(desktop).toBe(24);

    // (4) it steps DOWN at each narrower breakpoint, strictly monotonic
    const steps = [...css.matchAll(/@media \(max-width:\s*(\d+)px\)[^{]*\{[^}]*--px-pad-x:\s*(\d+)px/g)]
      .map((m) => ({ bp: Number(m[1]), pad: Number(m[2]) }))
      .sort((a, b) => b.bp - a.bp);
    expect(steps.length, 'the gutter must step down at least twice').toBeGreaterThanOrEqual(2);
    let previous = desktop;
    for (const step of steps) {
      expect(step.pad, `gutter must shrink at ${step.bp}px`).toBeLessThan(previous);
      previous = step.pad;
    }

    // (5) the narrowest gutter is genuinely small, and nothing is ever 40px
    expect(previous).toBeLessThanOrEqual(16);
    expect(desktop).toBeLessThan(40);
    for (const step of steps) expect(step.pad).not.toBe(40);
    expect(appshell).not.toMatch(/padding:\s*'32px 40px'/);
    expect(appshell).not.toMatch(/lg:px-10/);
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

// ── PRESENTATION-LITERAL CLOSURE ───────────────────────────────────────────
// WP-088 second pass (Founder final colour adjudication). The remediation is
// complete: every in-scope presentation literal now resolves through the
// canonical token source. What is left is a CLOSED, ENUMERATED set of proven
// exceptions — not an open allow-list. The numbers below are a ratchet that can
// only be lowered, and the exceptions are asserted by value and by kind, so a
// new exception cannot be smuggled in by widening a path pattern.

describe('KORA-WP-088 — presentation-literal closure', () => {
  // A comment is documentation, not a presentation literal. docs/30's
  // supersession record, KoraLogo's variant note and app/page.tsx's historical
  // pillar note all legitimately NAME colours in prose; stripping comments is
  // what makes this guard measure the thing it claims to measure.
  const stripComments = (src: string) =>
    src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*(\/\/|\*).*$/gm, '');

  // The ONLY value allowed to remain as a literal, and why: #FFFFFF is not a
  // KORA palette colour — it is the CSS universal constant, and the canonical
  // token source itself spells it literally (BUTTON_TOKENS.primary.color,
  // CHART_COLORS.tooltipText) rather than tokenising it. A component literal is
  // therefore consistent with canon, not a violation of it. Class strings use
  // Tailwind's own `text-white`/`bg-white` for the same need.
  const ALLOWED_LITERALS = new Set(['#FFFFFF']);

  // Not colours at all: HTML numeric character entities (&#128274; 🔒,
  // &#128279; 🔗) that the /#[0-9A-Fa-f]{6}/ shape matches by accident.
  const ENTITY = /&#\d{6};/g;

  function scan() {
    const files = walk('app', ['.ts', '.tsx', '.css'])
      .concat(walk('components', ['.ts', '.tsx', '.css']))
      .concat(walk('lib', ['.ts', '.tsx', '.css']));
    let allowed = 0;
    const offenders: string[] = [];
    for (const p of files) {
      if (isExemptPath(p)) continue;
      // The ONE out-of-scope file: the brand mark itself. Founder instruction
      // for WP-088 excludes brand-asset regeneration. app/global-error.tsx is
      // deliberately NOT excluded — it was fully remediated (it uses token
      // imports, which survive a root-layout crash; only CSS vars would not).
      if (p === 'components/brand/KoraLogo.tsx') continue;
      const src = stripComments(read(p)).replace(ENTITY, '');
      for (const m of src.match(/#[0-9A-Fa-f]{6}\b/g) ?? []) {
        if (ALLOWED_LITERALS.has(m.toUpperCase())) { allowed += 1; continue; }
        offenders.push(`${p} (${m})`);
      }
    }
    return { offenders, allowed };
  }

  it('no in-scope presentation colour literal remains outside the canonical token source', () => {
    const { offenders } = scan();
    expect(offenders, `must resolve through tokens: ${offenders.slice(0, 20).join(', ')}`).toEqual([]);
  });

  // Ratchet on the one allowed value, so even the proven exception cannot grow.
  const BASELINE_WHITE = 75;
  it(`the #FFFFFF exception does not grow beyond ${BASELINE_WHITE} occurrences`, () => {
    expect(scan().allowed).toBeLessThanOrEqual(BASELINE_WHITE);
  });

  it('every exempt path is a deliberate, named exclusion — not a growable pattern', () => {
    // Pinning the set makes widening it a visible test edit, never a silent one.
    expect([...HEX_EXEMPT].sort()).toEqual([
      'app/globals.css',
      'app/landing.module.css',
      'app/pilot/pilot.module.css',
      'components/landing/marketing.module.css',
      'lib/decision-pack/html-template.ts',
      'lib/design/kora-design-tokens.ts',
    ]);
  });

  it('no Tailwind arbitrary-value hex class remains in scope', () => {
    const offenders: string[] = [];
    for (const p of walk('app', ['.ts', '.tsx']).concat(walk('components', ['.ts', '.tsx']))
                     .concat(walk('lib', ['.ts', '.tsx']))) {
      if (isExemptPath(p) || p === 'components/brand/KoraLogo.tsx') continue;
      const src = stripComments(read(p));
      for (const m of src.match(/[a-z-]+-\[#[0-9A-Fa-f]{6}\]/g) ?? []) offenders.push(`${p} (${m})`);
    }
    expect(offenders, `use the generated token utilities: ${offenders.join(', ')}`).toEqual([]);
  });

  it('no malformed arbitrary-value class survives (Tailwind drops these silently)', () => {
    const offenders: string[] = [];
    for (const p of walk('app', ['.ts', '.tsx']).concat(walk('components', ['.ts', '.tsx']))) {
      if (isExemptPath(p)) continue;
      const src = read(p);
      // `bg-[rgba(...)]0` and `text-\[#HEX\]` both emit a class Tailwind never generates.
      if (/-\[rgba\([\d,. ]*\)\]\d/.test(src)) offenders.push(`${p} (trailing digit after ])`);
      if (/-\\\[#[0-9A-Fa-f]{6}\\\]/.test(src)) offenders.push(`${p} (escaped brackets)`);
    }
    expect(offenders, `dead classes: ${offenders.join(', ')}`).toEqual([]);
  });
});

// ── FOUNDER FINAL COLOUR ADJUDICATION — the four ratified semantic slots ───

describe('KORA-WP-088 — Founder final colour adjudication (Q1–Q5)', () => {
  const tokens = read('lib/design/kora-design-tokens.ts');

  it('Q1 — the informational/in-process family exists with the ratified values', () => {
    expect(TOKENS.info.base).toBe('#3B6EBA');
    expect(TOKENS.info.text).toBe('#1E4A8A');
    expect(TOKENS.info.bg).toMatch(/^rgba\(59,110,186,/);
    expect(TOKENS.info.border).toMatch(/^rgba\(59,110,186,/);
    expect(BADGE_TOKENS.info.text).toBe(TOKENS.info.text);
  });

  it('Q1 — the record states it is a semantic functional blue, not a pillar/brand colour', () => {
    expect(tokens).toMatch(/SEMANTIC FUNCTIONAL BLUE/);
    expect(tokens).toMatch(/NOT a pillar colour/);
  });

  it('Q2 — the solid ink button has a canonical hover distinct from the transparent one', () => {
    expect(BUTTON_TOKENS.ink.background).toBe(TOKENS.ink);
    expect(BUTTON_TOKENS.ink.hover).toBe('#1A1756');
    expect(BUTTON_TOKENS.ink.hover).not.toBe(BUTTON_TOKENS.secondary.hover);
  });

  it('Q3 — the inset panel is a distinct surface, deliberately not TOKENS.surface', () => {
    expect(TOKENS.insetPanel).toBe('#FFFAF5');
    expect(TOKENS.insetPanel).not.toBe(TOKENS.surface);
    expect(tokens).toMatch(/Do not use it as a card surface/);
  });

  it('Q4 — the macroblock series is categorical only and never reuses pillar semantics', () => {
    expect(MACROBLOCK_COLORS.REACH).toBe('#3B6EBA');
    expect(MACROBLOCK_COLORS.QUALITY).toBe('#2F7D55');
    expect(MACROBLOCK_COLORS.EQUITY).toBe('#7C3D8F');
    expect(MACROBLOCK_COLORS.BTI).toBe('#C07D2A');
    expect(Object.keys(MACROBLOCK_COLORS).sort()).toEqual(['BTI', 'EQUITY', 'QUALITY', 'REACH']);
    expect(tokens).toMatch(/NOT pillar colours, NOT status colours/);
    // EQUITY and BTI must not leak back out as general-purpose UI accents.
    const leaked: string[] = [];
    for (const p of walk('app', ['.ts', '.tsx']).concat(walk('components', ['.ts', '.tsx']))
                     .concat(walk('lib', ['.ts', '.tsx']))) {
      if (isExemptPath(p)) continue;
      const src = read(p).replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*(\/\/|\*).*$/gm, '');
      if (/['"`]#7C3D8F['"`]/i.test(src) || /['"`]#C07D2A['"`]/i.test(src)) leaked.push(p);
    }
    expect(leaked, `macroblock values used as literals: ${leaked.join(', ')}`).toEqual([]);
  });

  it('Q5 — KORA lime is NOT promoted into the token system', () => {
    // The header records the Q5 decision by name, so assert lime is never
    // DEFINED as a token value — not that the file never mentions it.
    expect(tokens).not.toMatch(/:\s*'#C8FF47'/);
    const offenders: string[] = [];
    for (const p of walk('app', ['.ts', '.tsx']).concat(walk('components', ['.ts', '.tsx']))) {
      if (isExemptPath(p)) continue;
      if (/#C8FF47|#D4FF6B/i.test(read(p))) offenders.push(p);
    }
    expect(offenders, `lime must stay confined to the Decision Pack export: ${offenders.join(', ')}`).toEqual([]);
  });

  it('exactly four new semantic concepts were introduced — no token sprawl', () => {
    expect(Object.keys(TOKENS.info).sort()).toEqual(['base', 'bg', 'border', 'text']);
    expect(TOKENS.insetPanel).toBeTypeOf('string');
    expect(BUTTON_TOKENS.ink).toBeDefined();
    expect(MACROBLOCK_COLORS).toBeDefined();
  });
});

// ── E2E MULTI-VIEWPORT PREPARATION (no credentials, no secrets) ────────────

describe('KORA-WP-088 — authenticated multi-viewport validation is runnable once credentials exist', () => {
  it('env helpers read Worker / Partner / Advisor credentials from the environment only', () => {
    const env = read('tests/e2e/helpers/env.ts');
    for (const fn of ['getWorkerCredentials', 'getPartnerCredentials', 'getAdvisorCredentials']) {
      expect(env).toContain(fn);
    }
    for (const v of ['E2E_WORKER_EMAIL', 'E2E_PARTNER_EMAIL', 'E2E_ADVISOR_EMAIL']) {
      expect(env).toContain(v);
    }
  });

  it('no credential value is committed anywhere in the E2E helpers or spec', () => {
    for (const f of ['tests/e2e/helpers/env.ts', 'tests/e2e/responsive-viewports.spec.ts']) {
      const src = read(f);
      // A getter must read process.env, never compare against or assign a literal.
      expect(src).not.toMatch(/E2E_[A-Z_]+\s*=\s*['"`][^'"`]+['"`]/);
      expect(src).not.toMatch(/password\s*[:=]\s*['"`][^'"`$]{3,}['"`]/i);
    }
  });

  // The script's own header legitimately DESCRIBES what it never does ("never a
  // raw INSERT into auth.users", "never prints a password"). Strip comments so
  // the guard reads the code, not the prose about the code.
  const fixtureCode = () =>
    read('scripts/e2e/provision-staging-e2e-fixtures.ts')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*(\/\/|\*).*$/gm, '');

  it('the staging fixture script refuses production and demands a positively identified target', () => {
    const fx = fixtureCode();
    expect(fx).toContain("E2E_STAGING_FIXTURE_CONFIRM') !== 'YES'");
    expect(fx).toContain('ALLOWED_STAGING_REF');
    expect(fx).toContain('DENIED_PRODUCTION_REF');
    expect(fx).toMatch(/expectedRef !== ALLOWED_STAGING_REF/);
    expect(fx).toMatch(/expectedRef === DENIED_PRODUCTION_REF/);
    // Supabase Admin Auth API only — never a raw INSERT into auth.users.
    // Asserted structurally: no raw SQL driver is imported at all, so the
    // script physically cannot execute SQL against auth.users.
    expect(fx).toContain('auth.admin.createUser');
    expect(fx).not.toMatch(/from\s+'pg'/);
    expect(fx).not.toMatch(/\bnew Client\(/);
    expect(fx).not.toMatch(/\.rpc\(/);
    expect(fx).not.toMatch(/\.schema\('auth'\)/);
  });

  it('the staging fixture script never prints, writes or returns a password', () => {
    const fx = fixtureCode();
    for (const v of ['E2E_PARTNER_PASSWORD', 'E2E_ADVISOR_PASSWORD']) expect(fx).toContain(v);
    // No hardcoded value, no default, no generated fallback.
    expect(fx).not.toMatch(/PASSWORD'?\s*\)?\s*(\|\||\?\?)\s*['"`]/);
    expect(fx).not.toMatch(/randomBytes|generatePassword/);
    // It writes no files at all.
    expect(fx).not.toMatch(/writeFileSync|appendFileSync|createWriteStream/);
    // And never passes the password VALUE to a logger. Naming the variable in
    // a message ("E2E_PARTNER_PASSWORD not set") is fine and intended; what
    // must never happen is interpolating or passing the binding itself.
    expect(fx).not.toMatch(/console\.\w+\([^)]*\$\{\s*password/i);
    expect(fx).not.toMatch(/console\.\w+\(\s*password\b/i);
    expect(fx).not.toMatch(/console\.\w+\([^)]*,\s*password\s*[),]/i);
  });

  it('the staging fixture is EPHEMERAL with provision / verify / cleanup modes', () => {
    const fx = fixtureCode();
    for (const m of ['provision', 'verify', 'cleanup']) expect(fx).toContain(`'${m}'`);
    expect(fx).toMatch(/mode must be exactly one of/);
    // Cleanup actually removes the partner fixture, both halves.
    expect(fx).toContain('deleteAuthUserIfPresent');
    expect(fx).toMatch(/from\('partner_identity'\)[\s\S]{0,200}\.delete\(\)/);
    // And never touches the business data it attached to.
    expect(fx).not.toMatch(/from\('partner_profile'\)[\s\S]{0,200}\.delete\(\)/);
    expect(fx).not.toMatch(/from\('advisor_assignment'\)/);
    expect(fx).not.toMatch(/from\('advisor_role_qualification'\)/);
    expect(fx).not.toMatch(/from\('tenant'\)/);
  });

  it('exactly ONE synthetic staging partner_profile, machine-identifiable beyond its name', () => {
    const fx = fixtureCode();
    // A deterministic primary key is the strongest marker: no text matching,
    // no possible collision with a generated id.
    expect(fx).toMatch(/PARTNER_FIXTURE_PROFILE_ID = '[0-9a-f-]{36}'/);
    // And a CANONICAL SCHEMA FIELD carries the machine token — not just the
    // human-readable display name.
    expect(fx).toContain("PARTNER_FIXTURE_CATEGORY = 'kora-e2e-fixture'");
    expect(fx).toMatch(/category: PARTNER_FIXTURE_CATEGORY/);
    // Exactly one: a single id constant, used for both create and locate.
    expect((fx.match(/PARTNER_FIXTURE_PROFILE_ID = /g) ?? []).length).toBe(1);
    // It refuses to adopt an unrecognised row sitting at that id.
    expect(fx).toMatch(/category !== PARTNER_FIXTURE_CATEGORY/);
  });

  it('the fixture profile stays invisible to worker-facing surfaces', () => {
    const fx = fixtureCode();
    // status 'draft' is a real safety property, not a label: the only
    // worker-facing RLS policy on partner_profile exposes published rows only.
    expect(fx).toMatch(/status: 'draft'/);
    expect(fx).not.toMatch(/status: 'published'/);
    const migration = read('supabase/migrations/010_partner_profile.sql').replace(/--.*$/gm, '');
    expect(migration).toMatch(/network_partner_worker_published_select/);
    expect(migration).toMatch(/status\s*=\s*'published'/);
  });

  it('the anchor profile is PERMANENT — cleanup never deletes it, verify requires it', () => {
    const fx = fixtureCode();
    // No delete path of any kind on partner_profile.
    expect(fx).not.toMatch(/from\('partner_profile'\)[\s\S]{0,300}\.delete\(\)/);
    // verify fails if the anchor has gone missing.
    expect(fx).toMatch(/if \(!profile\) return false;/);
    // ...while the identity half must be gone.
    expect(fx).toMatch(/authUserId === null && identityCount === 0/);
  });

  it('no unrelated Partner or Advisor business data is ever created', () => {
    const fx = fixtureCode();
    for (const table of ['advisor_assignment', 'advisor_role_qualification',
                         'advisor_prerequisite_eligibility', 'tenant',
                         'operational_case', 'advisor_appointment']) {
      expect(fx, `${table} must never be written by a test fixture`).not.toContain(`from('${table}')`);
    }
    // The only two tables it writes.
    const written = [...fx.matchAll(/\.from\('([a-z_]+)'\)/g)].map((m) => m[1]);
    expect([...new Set(written)].sort()).toEqual(['advisor_identity', 'partner_identity', 'partner_profile']);
  });

  it('the advisor fixture is PERSISTENT — repeated runs cannot accumulate rows', () => {
    const fx = fixtureCode();
    // The accumulation chain, closed at its source: the Auth user is never
    // deleted, so its uuid is stable, so the upsert reconciles the SAME row.
    expect(fx).toMatch(/onConflict: 'auth_user_id'/);
    // advisorCleanup must not delete the auth user or touch the identity row.
    const cleanupBody = fx.slice(fx.indexOf('async function advisorCleanup'),
                                 fx.indexOf('async function advisorVerify'));
    expect(cleanupBody).not.toContain('deleteAuthUserIfPresent');
    expect(cleanupBody).not.toMatch(/\.update\(/);
    expect(cleanupBody).not.toMatch(/\.delete\(\)/);
    expect(cleanupBody).not.toContain('inactive_offboarded');
    // provision asserts the one-row invariant on every run instead of trusting it.
    expect(fx).toMatch(/if \(total > 1\)/);
  });

  it('advisor cleanup respects the no-DELETE governance invariant', () => {
    const fx = fixtureCode();
    // advisor.advisor_identity has NO DELETE grant for anyone, by design
    // (migration 056). Nothing anywhere may attempt a delete on it.
    expect(fx).not.toMatch(/from\('advisor_identity'\)[\s\S]{0,200}\.delete\(\)/);
    // The migration's own wording is preserved as the justification...
    const migration = read('supabase/migrations/056_advisor_identity_qualification.sql');
    expect(migration).toMatch(/No DELETE for anyone/);
    // ...and the GRANT statements themselves confirm it. SQL comments are
    // stripped first: the justification comment legitimately contains both
    // "GRANT" and "DELETE" and would otherwise match its own explanation.
    const grants = migration.replace(/--.*$/gm, '');
    expect(grants).not.toMatch(/GRANT[^;]*DELETE[^;]*advisor_identity/i);
    expect(grants).toMatch(/GRANT SELECT, INSERT, UPDATE ON advisor\.advisor_identity\s+TO service_role/);
  });

  it('the persistent advisor fixture cannot surface in Company/Worker/Partner UI', () => {
    // Company visibility is gated on an ACTIVE assignment, which this fixture
    // never has — at BOTH the RLS layer and the API layer.
    const policy = read('supabase/migrations/058_advisor_company_surface.sql');
    expect(policy).toContain('advisor_identity_company_own_select');
    expect(policy).toMatch(/company_has_active_advisor/);
    expect(policy).toMatch(/status = 'active'/);
    // The fixture script creates no assignment at all.
    expect(fixtureCode()).not.toContain("from('advisor_assignment')");
    // Worker and Partner surfaces never read advisor_identity in the first place.
    const leaks: string[] = [];
    for (const dir of ['app/worker', 'app/partner', 'app/api/worker', 'app/api/partner']) {
      for (const p of walk(dir, ['.ts', '.tsx'])) {
        if (read(p).includes('advisor_identity')) leaks.push(p);
      }
    }
    expect(leaks, `advisor_identity must not be read by worker/partner surfaces: ${leaks.join(', ')}`).toEqual([]);
  });

  it('the fixture mirrors real schema truth for both roles', () => {
    const fx = fixtureCode();
    // advisor_identity has NO email column (migration 056): full_name + status.
    expect(fx).toContain('full_name');
    expect(fx).toMatch(/status: 'active'/);
    expect(fx).not.toMatch(/advisor_identity[\s\S]{0,200}email:/);
    // Partner profile rule, as adjudicated: the ONLY partner_profile this
    // script may create is the single deterministic synthetic fixture. An
    // arbitrary profile must still be impossible — so every insert into that
    // table must carry the fixture id.
    expect(fx).toContain('E2E_PARTNER_PROFILE_ID');
    expect(fx).toContain("from('partner_profile')");
    const profileInserts = [...fx.matchAll(/from\('partner_profile'\)([\s\S]{0,400}?)\.insert\(([\s\S]{0,300}?)\)/g)];
    expect(profileInserts.length, 'exactly one partner_profile insert path').toBe(1);
    expect(profileInserts[0][2]).toContain('id: PARTNER_FIXTURE_PROFILE_ID');
    // Partners are never company-scoped.
    expect(fx).not.toContain('kora_tenant_id:');
  });

  it('playwright defines the three Founder-mandated viewport projects', () => {
    const cfg = read('playwright.config.ts');
    for (const [name, width] of [['mobile-375', 375], ['tablet-768', 768], ['desktop-1440', 1440]] as const) {
      expect(cfg).toContain(name);
      expect(cfg).toContain(`width: ${width}`);
    }
    // The viewport projects must not silently re-run every existing spec.
    expect(cfg).toContain('testMatch');
    expect(cfg).toContain('testIgnore');
  });

  it('the Vercel protection bypass reads the secret only from process.env and never hardcodes it', () => {
    const bypass = read('tests/e2e/helpers/vercel-bypass.ts');
    expect(bypass).toContain('process.env.VERCEL_AUTOMATION_BYPASS_SECRET');
    // No literal secret, no default, no fallback value of any kind.
    expect(bypass).not.toMatch(/VERCEL_AUTOMATION_BYPASS_SECRET\s*(\|\||\?\?)\s*['"`]/);
    expect(bypass).not.toMatch(/VERCEL_AUTOMATION_BYPASS_SECRET\s*=\s*['"`]/);
    // The value must never be logged, printed or returned.
    expect(bypass).not.toMatch(/console\.(log|info|warn|error)/);
    expect(bypass).not.toMatch(/return\s+secret/);
  });

  it('absent secret means no bypass is attempted at all', () => {
    const bypass = read('tests/e2e/helpers/vercel-bypass.ts');
    expect(bypass).toMatch(/if \(!secret\) return;/);
    // Presence is observable; the value is not.
    expect(bypass).toContain('export function hasProtectionBypass(): boolean');
    expect(bypass).toMatch(/readSecret\(\) !== undefined/);
  });

  it('the bypass secret is host-scoped and can never reach a third-party host', () => {
    const bypass = read('tests/e2e/helpers/vercel-bypass.ts');
    // Scoped via a route handler, NOT use.extraHTTPHeaders — which Playwright
    // would apply to every request, including fonts.googleapis.com.
    expect(bypass).toContain('page.route');
    expect(bypass).toMatch(/sameHost/);
    expect(bypass).toMatch(/if \(!sameHost\)/);
    expect(read('playwright.config.ts')).not.toContain('extraHTTPHeaders');
  });

  it('the bypass does not weaken the E2E target allowlist', () => {
    const spec = read('tests/e2e/responsive-viewports.spec.ts');
    // guardE2ETarget must still run, and must run BEFORE the bypass is applied.
    expect(spec.indexOf('guardE2ETarget')).toBeLessThan(spec.indexOf('applyProtectionBypass('));
    expect((spec.match(/guardE2ETarget\('responsive-viewports'\)/g) ?? []).length).toBe(5);
    expect((spec.match(/await applyProtectionBypass\(page\);/g) ?? []).length).toBe(5);
    const safety = read('tests/e2e/helpers/e2e-safety.ts');
    expect(safety).toContain('E2E_ALLOWED_STAGING_HOSTS');
  });

  it('E2E_WORKER_* is canonical, with the legacy seed name only as a fallback', () => {
    const env = read('tests/e2e/helpers/env.ts');
    expect(env).toMatch(/readEnv\('E2E_WORKER_EMAIL'\) \?\? readEnv\('E2E_WORKER_A_EMAIL'\)/);
    expect(env).toMatch(/readEnv\('E2E_WORKER_PASSWORD'\) \?\? readEnv\('E2E_WORKER_A_PASSWORD'\)/);
  });

  it('the env template documents every required variable NAME and no value', () => {
    const tpl = read('.env.local.example');
    for (const v of ['E2E_WORKER_EMAIL', 'E2E_WORKER_PASSWORD', 'E2E_PARTNER_EMAIL',
                     'E2E_PARTNER_PASSWORD', 'E2E_ADVISOR_EMAIL', 'E2E_ADVISOR_PASSWORD',
                     'E2E_ALLOWED_STAGING_HOSTS', 'VERCEL_AUTOMATION_BYPASS_SECRET']) {
      expect(tpl, `${v} undocumented`).toContain(`${v}=`);
      // Declared empty — a real value must never land in the template.
      expect(tpl, `${v} has a value in the template`).toMatch(new RegExp(`^${v}=\\s*$`, 'm'));
    }
  });

  it('the Worker case validates the real workspace, not the onboarding wizard', () => {
    const spec = read('tests/e2e/responsive-viewports.spec.ts');
    const roles = read('tests/e2e/helpers/roles.ts');
    // Founder Decision 3: onboarding alone is not Worker runtime evidence.
    expect(roles).toContain("WORKER_WORKSPACE_HOME = '/worker/workspace'");
    expect(spec).toContain('WORKER_WORKSPACE_HOME');
    expect(spec).not.toMatch(/runRoleViewportCase\(page, ROLE_HOME\.WORKER\)/);
    // The gate that makes reaching the workspace proof of completion.
    const gate = read('app/worker/workspace/page.tsx');
    expect(gate).toContain('onboarding_completed_at');
    expect(gate).toContain("redirect('/worker/onboarding')");
  });

  it('the responsive spec covers all five role environments and skips without credentials', () => {
    const spec = read('tests/e2e/responsive-viewports.spec.ts');
    for (const r of ['KORA Admin', 'Company', 'Worker', 'Partner', 'Advisor']) expect(spec).toContain(r);
    expect((spec.match(/test\.skip\(!creds/g) ?? []).length).toBe(5);
    expect(spec).toContain('guardE2ETarget');
    expect(spec).toContain('scrollWidth');
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
