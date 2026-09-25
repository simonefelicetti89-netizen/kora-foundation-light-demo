/**
 * KORA-WP-139 — Typography Foundation & Migration (PX-D).
 *
 * Behavioural where a real behaviour exists (the scale itself, the role
 * contract, the closure walk); structural elsewhere — vitest runs
 * `environment: 'node'`, there is no jsdom, and this repository has no
 * precedent for rendering React here.
 *
 * NO GIT-HISTORY ASSERTIONS. CI #329 proved they are not portable:
 * `actions/checkout@v4` clones at depth 1, so `git show <baseline>:<path>`
 * errors in the runner while passing locally. Everything below reads the
 * working tree or pins a digest.
 *
 * The scale values are transcribed from docs/BENCHMARK_V2_CANONICAL_GRAMMAR.md
 * §5 (Founder-ratified, governance commit d4a815e) and pinned here as literals,
 * so a silent drift in the token file fails rather than redefining the standard.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname, resolve as resolvePath } from 'node:path';
import {
  TYPE, TYPE_ROLES, TYPE_FAMILY, TYPE_FLOOR_PX, TYPE_READING_FLOOR_PX, typeStyle,
} from '@/lib/design/kora-design-tokens';

const ROOT = process.cwd();
const read = (rel: string) => readFileSync(join(ROOT, rel), 'utf-8');
const sha = (s: string) => createHash('sha256').update(s).digest('hex');

const GLOBALS = 'app/globals.css';
const LAYOUT  = 'app/layout.tsx';
const TEXT    = 'components/ui/px/Text.tsx';
const REPORTS = 'app/company/reports/page.tsx';

/** The ratified scale, from the canonical artifact. */
const CANON: Record<string, { size: number; mobile?: number; lineHeight: number; weight: number; tracking: string }> = {
  display:    { size: 60, mobile: 42, lineHeight: 0.95, weight: 800, tracking: '-0.045em' },
  title:      { size: 32, mobile: 26, lineHeight: 1.10, weight: 700, tracking: '-0.030em' },
  section:    { size: 20, mobile: 18, lineHeight: 1.25, weight: 700, tracking: '-0.022em' },
  subsection: { size: 16,             lineHeight: 1.30, weight: 700, tracking: '-0.018em' },
  body:       { size: 15,             lineHeight: 1.60, weight: 400, tracking: '-0.005em' },
  secondary:  { size: 14,             lineHeight: 1.50, weight: 400, tracking: '0' },
  label:      { size: 13,             lineHeight: 1.40, weight: 600, tracking: '0.005em' },
  caption:    { size: 12,             lineHeight: 1.45, weight: 500, tracking: '0.010em' },
  meta:       { size: 11,             lineHeight: 1.35, weight: 700, tracking: '0.070em' },
};

// ── the scale ───────────────────────────────────────────────────────────────

describe('KORA-WP-139 — the canonical scale is exactly the ratified one', () => {
  it('declares exactly nine roles — no tenth', () => {
    expect(TYPE_ROLES.length).toBe(9);
    expect([...TYPE_ROLES].sort()).toEqual(Object.keys(CANON).sort());
  });

  it('every step matches the ratified size, line height, weight and tracking', () => {
    for (const role of TYPE_ROLES) {
      const c = CANON[role];
      const t = TYPE[role];
      expect(t.size, `${role} size`).toBe(c.size);
      expect(t.mobile, `${role} mobile`).toBe(c.mobile);
      expect(t.lineHeight, `${role} line height`).toBe(c.lineHeight);
      expect(t.weight, `${role} weight`).toBe(c.weight);
      expect(t.tracking, `${role} tracking`).toBe(c.tracking);
    }
  });

  it('11px is the absolute floor, and no role sits below it', () => {
    expect(TYPE_FLOOR_PX).toBe(11);
    for (const role of TYPE_ROLES) {
      expect(TYPE[role].size, `${role}`).toBeGreaterThanOrEqual(TYPE_FLOOR_PX);
      if (TYPE[role].mobile) expect(TYPE[role].mobile!, `${role} mobile`).toBeGreaterThanOrEqual(TYPE_FLOOR_PX);
    }
  });

  it('11px is reserved for meta ALONE — it is not a body size', () => {
    const atFloor = TYPE_ROLES.filter((r) => TYPE[r].size === TYPE_FLOOR_PX);
    expect(atFloor).toEqual(['meta']);
    expect(TYPE.meta.uppercase).toBe(true);
  });

  it('sustained reading never drops below 12px', () => {
    expect(TYPE_READING_FLOOR_PX).toBe(12);
    expect(TYPE.caption.size).toBe(TYPE_READING_FLOOR_PX);
    for (const role of ['body', 'secondary', 'label', 'caption'] as const) {
      expect(TYPE[role].size, role).toBeGreaterThanOrEqual(TYPE_READING_FLOOR_PX);
    }
  });

  it('body is 15px and does NOT shrink on mobile', () => {
    expect(TYPE.body.size).toBe(15);
    expect(TYPE.body.mobile).toBeUndefined();
  });

  it('only the three roles that overflow a phone carry a mobile variant', () => {
    const withMobile = TYPE_ROLES.filter((r) => TYPE[r].mobile !== undefined);
    expect(withMobile).toEqual(['display', 'title', 'section']);
    for (const r of withMobile) expect(TYPE[r].mobile!, r).toBeLessThan(TYPE[r].size);
  });

  it('every documented weight is a statically loadable Jakarta instance', () => {
    for (const role of TYPE_ROLES) {
      for (const w of TYPE[role].weights) {
        expect(w % 100, `${role} weight ${w} is not a static instance`).toBe(0);
        expect(w).toBeGreaterThanOrEqual(200);
        expect(w).toBeLessThanOrEqual(800);
      }
      expect(TYPE[role].weights).toContain(TYPE[role].weight);
    }
  });

  it('typeStyle emits the role, and supports tabular numerals for compared figures', () => {
    const s = typeStyle('display', { tabular: true });
    expect(s.fontSize).toBe(60);
    expect(s.fontWeight).toBe(800);
    expect(s.lineHeight).toBe(0.95);
    expect(s.fontVariantNumeric).toBe('tabular-nums');
    expect(typeStyle('meta').textTransform).toBe('uppercase');
    expect(typeStyle('body').fontVariantNumeric).toBeUndefined();
    expect(typeStyle('label', { weight: 700 }).fontWeight).toBe(700);
  });
});

// ── CSS and TS cannot drift ─────────────────────────────────────────────────

describe('KORA-WP-139 — the CSS classes and the tokens are the same numbers', () => {
  const css = () => read(GLOBALS);

  it('every role has a .kt- class whose values match the token exactly', () => {
    for (const role of TYPE_ROLES) {
      const rule = new RegExp(`\\.kt-${role}\\s*\\{([^}]*)\\}`).exec(css());
      expect(rule, `.kt-${role} missing`).not.toBeNull();
      const body = rule![1];
      expect(body, `${role} size`).toContain(`font-size: ${TYPE[role].size}px`);
      expect(body, `${role} weight`).toContain(`font-weight: ${TYPE[role].weight}`);
      expect(body, `${role} line height`).toContain(`line-height: ${TYPE[role].lineHeight.toFixed(2)}`);
    }
  });

  it('the mobile overrides exist for exactly the three roles that declare one', () => {
    const mq = /@media \(max-width: 767px\) \{([\s\S]*?)\n\}/.exec(css());
    expect(mq, 'mobile media query missing').not.toBeNull();
    const block = mq![1];
    for (const role of TYPE_ROLES) {
      const m = TYPE[role].mobile;
      if (m) expect(block, `${role} mobile override`).toMatch(new RegExp(`\\.kt-${role}\\s*\\{\\s*font-size:\\s*${m}px;`));
      else expect(block, `${role} must not shrink`).not.toContain(`.kt-${role}`);
    }
  });
});

// ── one family ──────────────────────────────────────────────────────────────

describe('KORA-WP-139 — one Product UI family, and the dead ones are gone', () => {
  it('Plus Jakarta Sans is the sole loaded family', () => {
    const l = read(LAYOUT);
    expect(l).toContain("import { Plus_Jakarta_Sans } from 'next/font/google'");
    for (const dead of ['Instrument_Serif', 'Playfair_Display', 'Hanken_Grotesk']) {
      expect(l, `${dead} still loaded`).not.toContain(dead);
    }
    expect(TYPE_FAMILY).toContain('Plus Jakarta Sans');
  });

  it('weight 800 is loaded, because the display role needs it', () => {
    expect(read(LAYOUT)).toMatch(/weight: \[[^\]]*'800'[^\]]*\]/);
  });

  it('no dead family variable survives anywhere in the Product', () => {
    for (const dead of ['--font-instrument-serif', '--font-playfair', '--font-hanken']) {
      for (const f of [LAYOUT, GLOBALS]) {
        expect(read(f), `${dead} in ${f}`).not.toContain(dead);
      }
    }
  });

  it('the privileged-access signal survived the family removal structurally', () => {
    // Hanken was partly a signalling device on this banner. Removing it must not
    // quietly downgrade the warning — every non-typographic signal must remain.
    const b = read('components/auth/PrivilegedAccessBanner.tsx');
    expect(b).not.toContain('font-hanken');
    expect(b).toContain('role="alert"');
    expect(b).toContain('aria-live');
    expect(b).toContain('sticky top-0');
    expect(b).toContain('animate-ping');
    expect(b, 'the label must carry the meta role').toContain('kt-meta');
  });
});

// ── shared primitives ───────────────────────────────────────────────────────

describe('KORA-WP-139 — the shared primitives consume the tokens', () => {
  it('exports exactly one component per role, and no size/variant flag matrix', () => {
    const t = read(TEXT);
    for (const name of ['Display', 'Title', 'Section', 'Subsection', 'Body', 'Secondary', 'Label', 'Caption', 'Meta']) {
      expect(t, `${name} missing`).toMatch(new RegExp(`export const ${name} = make\\(`));
    }
    expect(t, 'a size prop reintroduces the problem').not.toMatch(/^\s+size[?]?:/m);
    expect(t, 'a variant prop reintroduces the problem').not.toMatch(/^\s+variant[?]?:/m);
    expect(t, 'a fontSize prop reintroduces the problem').not.toMatch(/^\s+fontSize[?]?:/m);
  });

  it('they read the scale rather than restating it', () => {
    const t = read(TEXT);
    expect(t).toContain("from '@/lib/design/kora-design-tokens'");
    // Comments stripped first: this file's own prose cites `fontSize: 13` as the
    // anti-pattern it exists to replace, and an assertion that cannot tell code
    // from the explanation of the code is not an assertion.
    const code = t.split('\n').filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');
    expect(code, 'a primitive must not hard-code a size').not.toMatch(/fontSize: *\d/);
  });

  it('the WP-125/WP-140 primitives were migrated onto the roles too', () => {
    for (const f of ['components/ui/px/roles.tsx', 'components/ui/px/states.tsx']) {
      expect(read(f), `${f} still hand-writes type`).toContain('typeStyle(');
    }
  });
});

// ── the lint contract ───────────────────────────────────────────────────────

describe('KORA-WP-139 — the typography lint is active at WARN', () => {
  const cfg = () => read('eslint.config.mjs');

  it('the rule exists and is WARN, not error — legacy is tolerated, not erased', () => {
    expect(cfg()).toContain("'no-restricted-syntax': ['warn'");
    expect(cfg()).toContain('kora/typography-scale');
  });

  it('it catches every value form, not only quoted px literals', () => {
    // 1,882 of the ~2,600 inline decisions are BARE NUMBERS. A regex on 'Npx'
    // would miss 72% of the population, so the rule matches the property.
    expect(cfg()).toContain(`selector: "Property[key.name='fontSize']"`);
  });

  it('the canonical sources are exempt — defining the scale is not drift', () => {
    expect(cfg()).toContain('lib/design/kora-design-tokens.ts');
    expect(cfg()).toContain('components/ui/px/Text.tsx');
  });

  it('escalation to BLOCK is deferred, not silently adopted', () => {
    expect(cfg()).toMatch(/KORA-WP-126/);
  });
});

// ── the demonstrators ───────────────────────────────────────────────────────

/** Transitive import closure, so the floor is asserted over the real surface. */
function closure(entry: string): string[] {
  const seen = new Set<string>();
  const stack = [join(ROOT, entry)];
  while (stack.length) {
    const f = stack.pop()!;
    if (seen.has(f)) continue;
    seen.add(f);
    let src: string;
    try { src = readFileSync(f, 'utf-8'); } catch { continue; }
    for (const m of src.matchAll(/from\s+['"]([^'"]+)['"]/g)) {
      const spec = m[1];
      let p: string | null = null;
      if (spec.startsWith('@/')) p = join(ROOT, spec.slice(2));
      else if (spec.startsWith('.')) p = resolvePath(dirname(f), spec);
      if (!p) continue;
      for (const ext of ['', '.tsx', '.ts', '/index.tsx', '/index.ts']) {
        if (existsSync(p + ext) && statSync(p + ext).isFile()) { stack.push(p + ext); break; }
      }
    }
  }
  return [...seen].map((f) => f.replace(ROOT + '/', ''));
}

const SUB_FLOOR_INLINE = /fontSize: *(?:'([\d.]+)px'|"([\d.]+)px"|([\d.]+))[,\s}]/g;
const SUB_FLOOR_TW = /text-\[(\d+(?:\.\d+)?)px\]/g;

function subFloor(files: string[]): string[] {
  const bad: string[] = [];
  for (const f of files) {
    const s = read(f);
    for (const m of s.matchAll(SUB_FLOOR_INLINE)) {
      const v = Number(m[1] ?? m[2] ?? m[3]);
      if (v < TYPE_FLOOR_PX) bad.push(`${f}: inline ${v}px`);
    }
    for (const m of s.matchAll(SUB_FLOOR_TW)) {
      if (Number(m[1]) < TYPE_FLOOR_PX) bad.push(`${f}: tailwind ${m[1]}px`);
    }
  }
  return bad;
}

describe('KORA-WP-139 — no canonical text below the floor on the migrated surfaces', () => {
  it('/company/reports carries no sub-floor text anywhere in its closure', () => {
    expect(subFloor(closure(REPORTS))).toEqual([]);
  });

  it('/advisor/companies/[assignmentId] carries no sub-floor text across ALL its tabs', () => {
    // The pre-check originally reported zero here by walking only the index
    // route. The sibling tab entry points are separate closures and held four
    // 10.5px sites; this walks every one of them.
    const tabs = [
      'app/advisor/companies/[assignmentId]/page.tsx',
      'app/advisor/companies/[assignmentId]/appuntamenti/page.tsx',
      'app/advisor/companies/[assignmentId]/messaggi/page.tsx',
      'app/advisor/companies/[assignmentId]/note/page.tsx',
      'app/advisor/companies/[assignmentId]/valutazioni/page.tsx',
      'app/advisor/companies/[assignmentId]/case/page.tsx',
      'app/advisor/companies/[assignmentId]/koral-review/page.tsx',
    ];
    for (const t of tabs) expect(existsSync(join(ROOT, t)), `${t} missing — the route must not be renamed`).toBe(true);
    expect(subFloor([...new Set(tabs.flatMap(closure))])).toEqual([]);
  });
});

describe('KORA-WP-139 — the shared authenticated chrome is above the floor too', () => {
  // FOUND BY THE ADVISOR VISUAL EVIDENCE, not by the closure walk above, and the
  // gap is worth stating: AppShell, Sidebar, Header and AccountMenu render on
  // BOTH demonstrators but are mounted by the LAYOUT, so they appear in neither
  // page's import closure. A static closure measure therefore reported zero
  // while the browser was rendering 22 sub-floor nodes on /company/reports and
  // 6 on the Advisor surface — navigation descriptions at 10px, group labels at
  // 10px, `preview` badges at 8px, avatar initials at 9px.
  //
  // The floor is a property of the RENDERED surface, so the chrome is in scope.
  const CHROME = [
    'components/layout/Sidebar.tsx',
    'components/layout/Header.tsx',
    'components/layout/AppShell.tsx',
    'components/auth/AccountMenu.tsx',
  ];

  it('no shared chrome component renders text below the floor', () => {
    expect(subFloor(CHROME.filter((f) => existsSync(join(ROOT, f))))).toEqual([]);
  });
});

describe('KORA-WP-139 — the demonstrator migration is real', () => {
  it('/company/reports states roles, not sizes', () => {
    const s = read(REPORTS);
    expect(s).toContain("typeStyle('display'");
    expect(s).toContain("typeStyle('body')");
    expect(s).toContain("typeStyle('meta')");
    expect(s, 'a hand-written size survived').not.toMatch(/fontSize: '\d/);
  });

  it('the headline figures are tabular — a reader compares them', () => {
    expect(read(REPORTS)).toContain("typeStyle('display', { tabular: true })");
  });

  it('the WP-140 structure is untouched by this migration', () => {
    const s = read(REPORTS);
    for (const role of ['HeroJudgment', 'PrimaryMetric', 'SupportingMetric', 'WarningSafeguard', 'ActionGroup', 'Disclosure', 'EvidencePanel']) {
      expect(s, `${role} lost`).toMatch(new RegExp(`<${role}\\b`));
    }
    expect((s.match(/<HeroJudgment\b/g) ?? []).length, 'still exactly one hero').toBe(1);
    expect(s).toContain('<NotYetAvailable');
    expect(s).toContain('<Loading ');
    expect(s).toContain('<PrivacyBoundaryNote />');
  });

  it('the Privacy Boundary is still a boundary, not a fault', () => {
    const p = read('components/privacy/PrivacyBoundaryNotice.tsx');
    expect(p).toContain('role="status"');
    expect(p).toContain('SAFE_AGGREGATION_THRESHOLD');
    expect(subFloor(['components/privacy/PrivacyBoundaryNotice.tsx'])).toEqual([]);
  });
});

// ── staged migration, not a flag day ────────────────────────────────────────

describe('KORA-WP-139 — the migration is staged and says so', () => {
  it('the token source documents that the scale is the single numeric authority', () => {
    const t = read('lib/design/kora-design-tokens.ts');
    expect(t).toContain('THIS IS THE ONLY NUMERIC AUTHORITY');
    expect(t).toContain('BENCHMARK_V2_CANONICAL_GRAMMAR');
  });

  it('this package did NOT attempt a Product-wide rewrite', () => {
    // Acceptance is the foundation plus two demonstrators. Product-wide drift
    // elimination is programme Definition of Done, owned elsewhere — so inline
    // typography MUST still exist outside the migrated surfaces. A suite that
    // demanded zero would be contracting the flag day the package forbids.
    const cfg = read('eslint.config.mjs');
    expect(cfg).toContain('Definition of Done');
    expect(cfg).toContain('flag-day');
  });
});
