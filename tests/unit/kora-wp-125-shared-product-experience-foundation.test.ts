/**
 * KORA-WP-125 — Shared Product Experience Foundation (PX-B).
 *
 * Focused coverage for the shared foundation only. Behavioural where a real
 * behaviour exists (the shell-state resolver, the Italian date formatter);
 * structural-assertion elsewhere, following the WP-047 / WP-073 / WP-088
 * convention this repository already uses — vitest runs `environment: 'node'`,
 * there is no jsdom and no precedent for rendering a React component here.
 *
 * The IA-preservation block is the important one: it compares the CURRENT
 * navigation against the WP-125 baseline commit itself, so "presentation only"
 * is proven against the real prior state rather than asserted.
 */

import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import {
  PX, PX_BREAKPOINTS, PX_TONE, resolvePxShellState,
} from '@/lib/design/kora-design-tokens';
import { formatIsoDateItalian } from '@/app/../components/ui/px/DateField';

const ROOT = process.cwd();
const read = (rel: string) => readFileSync(join(ROOT, rel), 'utf-8');
const BASELINE = '84128e81b0bb5a617bb7c3ac7802d1a5491c2a84';

const sidebar = read('components/layout/Sidebar.tsx');
const appshell = read('components/layout/AppShell.tsx');
const header = read('components/layout/Header.tsx');
const globals = read('app/globals.css');
const tokens = read('lib/design/kora-design-tokens.ts');

const strip = (s: string) =>
  s.replace(/\{\/\*[\s\S]*?\*\/\}/g, '')   // JSX comment blocks
   .replace(/\/\*[\s\S]*?\*\//g, '')      // block comments
   .replace(/^\s*\/\/.*$/gm, '');          // line comments

// ── SHELL STATES ──────────────────────────────────────────────────────────

describe('KORA-WP-125 — the shell has three states, not two', () => {
  it('resolves full / rail / mobile at the ratified boundaries', () => {
    expect(resolvePxShellState(1440)).toBe('full');
    expect(resolvePxShellState(1201)).toBe('full');
    expect(resolvePxShellState(1200)).toBe('rail');
    expect(resolvePxShellState(1100)).toBe('rail');
    // 768 is the Founder's capture width and the WP-039 failure point: it must
    // be a rail, never the legacy full-width column.
    expect(resolvePxShellState(768)).toBe('rail');
    expect(resolvePxShellState(767)).toBe('mobile');
    expect(resolvePxShellState(375)).toBe('mobile');
  });

  it('the rail exists as a real, distinct width — the WP-039 D2 root cause is gone', () => {
    expect(PX.navW).toBe('248px');
    expect(PX.navRailW).toBe('68px');
    // The hard-coded 264px column that never collapsed is gone from the source.
    expect(sidebar).not.toMatch(/w-\[264px\]/);
    expect(sidebar).not.toMatch(/min-w-\[264px\]/);
  });

  it('the shell state reaches CSS through one attribute, so TS and CSS cannot disagree', () => {
    expect(appshell).toMatch(/data-px-shell=\{shellState\}/);
    expect(appshell).toMatch(/usePxShellState\(\)/);
    expect(globals).toMatch(/\[data-px-shell='rail'\] \.px-nav/);
    expect(globals).toMatch(/--px-nav-rail-w:\s*68px/);
  });

  it('the WP-088 mobile-drawer contract is preserved, not replaced', () => {
    expect(sidebar).toMatch(/-translate-x-full/);
    expect(sidebar).toMatch(/md:static/);
    expect(sidebar).toMatch(/md:translate-x-0/);
    expect(sidebar).toMatch(/'Escape'/);
    expect(header).toMatch(/aria-controls=\{SIDEBAR_DRAWER_ID\}/);
  });

  it('the mobile boundary is aligned to the md: classes WP-088 pins', () => {
    // 767, not 720: any other value opens a band where the pinned md: classes
    // and the shell state disagree. Deliberate, documented deviation.
    expect(PX_BREAKPOINTS.mobile).toBe(767);
    expect(tokens).toMatch(/767 is Tailwind's `md` boundary/);
  });
});

// ── IA PRESERVATION — the boundary WP-125 must not cross ──────────────────

describe('KORA-WP-125 — navigation changed ONLY where a later Founder ruling required it', () => {
  const baselineSidebar = execFileSync('git', ['show', `${BASELINE}:components/layout/Sidebar.tsx`], {
    cwd: ROOT, encoding: 'utf-8', maxBuffer: 8 * 1024 * 1024,
  });
  const extract = (src: string, field: string) =>
    (src.match(new RegExp(`${field}: '[^']+'`, 'g')) ?? []).sort();
  const delta = (field: string) => {
    const before = new Set(extract(baselineSidebar, field));
    const after = new Set(extract(sidebar, field));
    return {
      removed: [...before].filter((x) => !after.has(x)).sort(),
      added: [...after].filter((x) => !before.has(x)).sort(),
    };
  };

  it('every navigation destination that left is a demo route or the ruled-on duplicate', () => {
    const d = delta('href');
    expect(d.removed.sort()).toEqual([
      // Founder ruling 2026-09-20 §1 — the Worker synthetic duplicate.
      "href: '/my-kora/kora-space'",
      // Deleted routes / demo destinations, forbidden in authenticated
      // navigation by Governance Patch 03 and broken since the CC-00 demo
      // retirement (2026-09-05).
      "href: '/demo/advisor'",
      "href: '/demo/guide'",
      // '/demo/future-vision' is NOT in this list: the WORKER Roadmap group
      // still carries it, and doc 22A §6's inactive-labelling requirement
      // still binds there. Only the Advisor copy of it went.
    ].sort());
  });

  it('the destinations that appeared are real, existing Advisor routes', () => {
    const d = delta('href');
    expect(d.added.sort()).toEqual(["href: '/advisor'", "href: '/advisor/companies'"].sort());
    for (const h of d.added) {
      expect(h).not.toMatch(/\/demo\//);
    }
  });

  it('no navigation destination advertises demo or mock data any more', () => {
    for (const field of ['label', 'description']) {
      for (const v of extract(sidebar, field)) {
        expect(v, `${v} advertises demo/mock`).not.toMatch(/demo|dati mock|sintetic/i);
      }
    }
  });

  it('group structure is unchanged except where a demo-only group was retired', () => {
    const d = delta('heading');
    // Only the Advisor 'Roadmap' group went, and only because its single
    // destination was a demo-island route.
    expect(d.added).toEqual([]);
    expect(d.removed.every((h) => /Roadmap/.test(h)) || d.removed.length === 0).toBe(true);
  });

  it('the admin navigation changed only by the demo retirement and the classified restoration', () => {
    const hrefs = (src: string) => new Set(src.match(/href:\s+'[^']+'/g) ?? []);
    const baseline = execFileSync('git', ['show', `${BASELINE}:lib/navigation/admin-nav-groups.ts`], {
      cwd: ROOT, encoding: 'utf-8', maxBuffer: 8 * 1024 * 1024,
    });
    const before = hrefs(baseline);
    const after = hrefs(read('lib/navigation/admin-nav-groups.ts'));
    // Only the demo-only destination left; /admin/operator was reclassified as
    // a real capability (§5) and therefore stayed.
    expect([...before].filter((h) => !after.has(h))).toEqual(["href: '/admin/demo/acme-001'"]);
    expect([...after].filter((h) => !before.has(h))).toEqual([]);
  });

  it('the rail keeps every item nameable — a hidden label is not a removed label', () => {
    expect(sidebar).toMatch(/aria-label=\{item\.label\}/);
    expect(globals).toMatch(/\[data-px-shell='rail'\][\s\S]*?\.px-nav-label/);
  });
});

// ── SESSION / ACCOUNT CHROME — Founder Decision 1 ─────────────────────────

describe('KORA-WP-125 — authenticated account chrome appears exactly once', () => {
  it('no authenticated layout or page renders SessionBar any more', () => {
    // `git grep -l` exits 1 when nothing matches — which is the pass case.
    let offenders = '';
    try {
      offenders = execFileSync('git', ['grep', '-l', '--', 'SessionBar', 'app/'], {
        cwd: ROOT, encoding: 'utf-8',
      }).trim();
    } catch { offenders = ''; }
    expect(offenders, `SessionBar still rendered in: ${offenders}`).toBe('');
  });

  it('the single account surface lives in the shared top chrome', () => {
    expect(header).toMatch(/<AccountMenu \/>/);
    expect((header.match(/<AccountMenu \/>/g) ?? []).length).toBe(1);
  });

  it('every required session control is still exposed — nothing was dropped', () => {
    const menu = read('components/auth/AccountMenu.tsx');
    expect(menu).toMatch(/\{email\}/);            // identity
    expect(menu).toMatch(/account-menu-role-badge/); // role
    expect(menu).toMatch(/Cambia password/);      // credential change
    expect(menu).toMatch(/<LogoutButton/);        // logout
  });

  it('authentication logic itself is untouched by this package', () => {
    const session = read('lib/auth/kora-session.ts');
    const baseline = execFileSync('git', ['show', `${BASELINE}:lib/auth/kora-session.ts`], {
      cwd: ROOT, encoding: 'utf-8', maxBuffer: 8 * 1024 * 1024,
    });
    expect(session).toBe(baseline);
  });
});

// ── PUBLIC ROUTES — Founder Decision 4 ────────────────────────────────────

describe('KORA-WP-125 — public routes stay outside the authenticated shell', () => {
  it('the public bypass list is unchanged from the baseline', () => {
    const cur = /PUBLIC_ROUTE_PREFIXES = \[([^\]]+)\]/.exec(appshell)?.[1];
    const base = execFileSync('git', ['show', `${BASELINE}:components/layout/AppShell.tsx`], {
      cwd: ROOT, encoding: 'utf-8',
    });
    expect(cur).toBe(/PUBLIC_ROUTE_PREFIXES = \[([^\]]+)\]/.exec(base)?.[1]);
  });

  it('a public route returns before any Product Experience chrome is applied', () => {
    const idx = appshell.indexOf('isPublicRoute(pathname)');
    const shellIdx = appshell.indexOf('px-shell');
    expect(idx).toBeGreaterThan(-1);
    expect(idx).toBeLessThan(shellIdx);
    expect(appshell).toMatch(/bg-kora-canvas/); // legacy canvas preserved for public
  });
});

// ── TOKEN SOURCE — Founder-approved Option C ──────────────────────────────

describe('KORA-WP-125 — one canonical Product Experience token source', () => {
  it('the register lives in the existing canonical source, so no new exemption is needed', () => {
    expect(tokens).toMatch(/export const PX = \{/);
    expect(globals).toMatch(/--px-l0:\s*#EAECF4/);
    const wp088 = read('tests/unit/kora-wp-088-responsive-design-system.test.ts');
    expect(wp088).toMatch(/'lib\/design\/kora-design-tokens\.ts'/);
    expect(wp088).toMatch(/'app\/globals\.css'/);
  });

  it('legacy exports survive untouched — ~196 consumers are not broken', () => {
    for (const name of ['KORA_COLORS', 'TOKENS', 'PILLAR_COLORS', 'MACROBLOCK_COLORS', 'BUTTON_TOKENS', 'BADGE_TOKENS']) {
      expect(tokens).toMatch(new RegExp(`export const ${name}`));
    }
  });

  it('no shared shell or primitive declares a colour literal of its own', () => {
    const COLOUR = /#[0-9A-Fa-f]{3,8}\b|(?<![\w-])(?:rgba?|hsla?|color-mix)\s*\(/gi;
    for (const f of [
      'components/layout/AppShell.tsx', 'components/layout/Header.tsx',
      'components/ui/Button.tsx', 'components/ui/px/Surface.tsx',
      'components/ui/px/Status.tsx', 'components/ui/px/Notice.tsx',
      'components/ui/px/DataTable.tsx', 'components/ui/px/DateField.tsx',
      'components/ui/px/Skeleton.tsx',
    ]) {
      expect(strip(read(f)).match(COLOUR) ?? [], `${f} declares colour locally`).toEqual([]);
    }
  });

  it('every PX value is verbatim from the Gate I normative source', () => {
    // kora-signal.css writes `.70`; TypeScript needs `0.70`. Same value, so
    // the comparison normalises the leading zero away rather than reporting a
    // difference that does not exist.
    const norm = (x: string) => x.replace(/\s+/g, '').replace(/([(,])0\./g, '$1.').toLowerCase();
    const src = norm(read('design/wp124-final/kora-signal.css'));
    const block = /export const PX = \{([\s\S]*?)\n\} as const;/.exec(tokens)?.[1] ?? '';
    const colours = [...strip(block).matchAll(/'(#[0-9A-Fa-f]{3,8}|rgba?\([^)]*\))'/g)].map((m) => m[1]);
    expect(colours.length).toBeGreaterThan(20);
    const invented = colours.filter((c) => !src.includes(norm(c)));
    expect(invented, `not in the WP-124 source: ${invented.join(', ')}`).toEqual([]);
  });
});

// ── TABLE FOUNDATION — the WP-039 D1 / D2 defect classes ──────────────────

describe('KORA-WP-125 — the shared table cannot repeat the WP-039 defects', () => {
  const table = read('components/ui/px/DataTable.tsx');

  it('it measures its own container, never the viewport (Founder Decision 3)', () => {
    expect(table).toMatch(/ResizeObserver/);
    expect(table).toMatch(/contentRect\.width/);
    expect(table).not.toMatch(/window\.innerWidth/);
    expect(table).not.toMatch(/matchMedia/);
  });

  it('it becomes a record list when the container cannot pay for the columns', () => {
    expect(table).toMatch(/const required = columns\.reduce/);
    expect(table).toMatch(/asRecords = width >= 0 && width < required/);
    expect(table).toMatch(/data-px-table="records"/);
  });

  it('only the column that opts in truncates — every other cell stays readable', () => {
    expect(table).toMatch(/c\.truncate/);
    expect(table).toMatch(/whiteSpace: 'normal', overflowWrap: 'anywhere'/);
  });

  it('the status word itself can never be clipped away', () => {
    const status = read('components/ui/px/Status.tsx');
    expect(status).toMatch(/whiteSpace: 'normal'/);
    expect(status).not.toMatch(/textOverflow/);
  });

  it('overflow is contained by the wrapper, so the page never scrolls sideways', () => {
    expect(table).toMatch(/overflowX: 'auto'/);
    expect(table).toMatch(/tableLayout: 'fixed'/);
  });
});

// ── ITALIAN-FIRST DATE CONTROL — the WP-039 D5 defect class ───────────────

describe('KORA-WP-125 — dates read Italian regardless of browser locale', () => {
  it('formats an ISO date in Italian', () => {
    expect(formatIsoDateItalian('2024-03-31')).toMatch(/31/);
    expect(formatIsoDateItalian('2024-03-31')).toMatch(/mar/i);
    expect(formatIsoDateItalian('2024-03-31')).toMatch(/2024/);
    // Never the US ordering that WP-039 exposed.
    expect(formatIsoDateItalian('2024-03-31')).not.toMatch(/^03\/31/);
  });

  it('handles empty and malformed input without throwing', () => {
    expect(formatIsoDateItalian('')).toBe('');
    expect(formatIsoDateItalian('not-a-date')).toBe('');
    expect(formatIsoDateItalian('2024-13-45')).toBe('');
  });

  it('storage semantics are untouched: the control still emits ISO', () => {
    const f = read('components/ui/px/DateField.tsx');
    expect(f).toMatch(/type="date"/);              // native control retained
    expect(f).toMatch(/onChange\(e\.target\.value\)/); // raw ISO passthrough
    expect(f).toMatch(/aria-describedby/);         // still accessible
    expect(f).not.toMatch(/toLocaleDateString\(\)/); // never locale-of-the-browser
  });
});

// ── STATE LANGUAGE, FOCUS, MOTION ─────────────────────────────────────────

describe('KORA-WP-125 — accessibility foundations are strengthened, not weakened', () => {
  it('every semantic tone pairs a fill with a distinct accessible text colour', () => {
    for (const tone of ['ok', 'warn', 'risk', 'info', 'idle'] as const) {
      expect(PX_TONE[tone].fill).toBeTruthy();
      expect(PX_TONE[tone].text).toBeTruthy();
      expect(PX_TONE[tone].tint).toBeTruthy();
    }
    // warn is the pairing that fails AA if fill is reused as text.
    expect(PX_TONE.warn.text).not.toBe(PX_TONE.warn.fill);
  });

  it('status is always a dot plus a word — colour is never the only signal', () => {
    const status = read('components/ui/px/Status.tsx');
    expect(status).toMatch(/<i aria-hidden="true"/);
    expect(status).toMatch(/\{children\}/);
  });

  it('one focus ring, never removed', () => {
    expect(globals).toMatch(/\.px-shell :focus-visible[\s\S]{0,120}outline: 2px solid var\(--px-violet\)/);
  });

  it('reduced motion collapses shell transitions', () => {
    expect(globals).toMatch(/prefers-reduced-motion: reduce[\s\S]{0,200}\.px-shell \*/);
  });

  it('the shell group labels now clear AA instead of sitting at 25% opacity', () => {
    expect(sidebar).not.toMatch(/rgba\(255,255,255,0\.25\)/);
    expect(globals).toMatch(/--px-nav-group-label:\s*rgba\(255,255,255,0\.62\)/);
  });
});

// ── NON-SUPPRESSIBLE CHROME SEMANTICS ─────────────────────────────────────

describe('KORA-WP-125 — warning chrome keeps its meaning', () => {
  it('the synthetic banner no longer renders in the authenticated Product shell', () => {
    // Superseded by "One Product / No Demo Runtime": an automatic,
    // architecture-driven "DEMO · DATI SIMULATI" strip is exactly the
    // indication Governance Patch 03 forbids. The component is not deleted —
    // the separately-governed /demo/* island may still use it — and B150's
    // guard (a real session never sees 'demo') is untouched and still passing.
    expect(strip(appshell)).not.toMatch(/SyntheticDataBanner/);
  });

  it('the environment watermark cannot sit over content on a phone', () => {
    expect(globals).toMatch(/max-width: 720px\)[\s\S]{0,80}\.px-watermark \{ display: none/);
  });
});


// ── CHECKPOINT 1 CORRECTIONS ──────────────────────────────────────────────

describe('KORA-WP-125 — Checkpoint 1 correction pass', () => {
  it('D-A: the Admin rail exposes its destinations instead of collapsing to nothing', () => {
    // Admin groups default collapsed and the rail hides the expand control, so
    // the rail must present every group expanded. Presentation only.
    expect(sidebar).toMatch(/const railFlattened = shellState === 'rail';/);
    expect(sidebar).toMatch(/isAdmin \? \(railFlattened \|\| \(expandedGroups\[groupId\] \?\? false\)\) : true/);
    // The operator's own collapse choices are preserved, not discarded.
    expect(sidebar).toMatch(/setExpandedGroups/);
  });

  it('D-A: every rail destination keeps an accessible name, title and current state', () => {
    expect(sidebar).toMatch(/aria-label=\{item\.label\}/);
    expect(sidebar).toMatch(/title=\{item\.label\}/);
    expect(sidebar).toMatch(/aria-current=\{isActive \? 'page' : undefined\}/);
  });

  it('D-B: no badge can render clipped inside the 68px rail', () => {
    // Both group-badge render paths (admin toggle + plain heading) and the
    // item-badge container all carry the rail-suppressed class.
    expect((sidebar.match(/className="px-nav-badge"/g) ?? []).length).toBeGreaterThanOrEqual(3);
    expect(globals).toMatch(/\[data-px-shell='rail'\][\s\S]{0,200}\.px-nav-badge/);
  });

  it('D-C: the top chrome states real route context and invents no capability', () => {
    expect(header).toMatch(/resolveRouteContext\(pathname, activeRole\)/);
    expect(header).toMatch(/data-px-slot="page-search"/);
    expect(header).toMatch(/data-px-slot="page-actions"/);
    // No fabricated global affordances.
    expect(header).not.toMatch(/⌘K|Cmd\+K|placeholder="Cerca/);
  });

  it('D-C: route context is derived from canonical nav metadata, never invented', () => {
    const rc = read('lib/navigation/route-context.ts');
    expect(rc).toMatch(/buildNavGroups/);
    expect(rc).toMatch(/ADMIN_NAV_GROUPS/);
    // An unmatched route yields nulls rather than a fabricated label.
    expect(rc).toMatch(/let best: RouteContext = \{ section: null, page: null \};/);
  });

  it('the demo/environment warning keeps its meaning after restyling', () => {
    const banner = read('components/demo/SyntheticDataBanner.tsx');
    const base = execFileSync('git', ['show', `${BASELINE}:components/demo/SyntheticDataBanner.tsx`], {
      cwd: ROOT, encoding: 'utf-8',
    });
    // Wording is byte-identical: only presentation changed.
    const words = (src: string) => (src.match(/main:\s+'[^']+'|secondary:\s+'[^']+'/g) ?? []);
    expect(words(banner)).toEqual(words(base));
    // Still a banner, still environment-labelled, still not dismissible.
    expect(banner).toMatch(/role="banner"/);
    expect(banner).toMatch(/aria-label=\{`Ambiente corrente/);
    expect(strip(banner)).not.toMatch(/dismiss|onClose|useState\(true\)/);
    // Severity is bar + icon + wording, never colour alone.
    expect(banner).toMatch(/TriangleAlert/);
    expect(banner).toMatch(/inset 3px 0 0/);
    // The legacy full-bleed orange treatment is gone.
    expect(banner).not.toMatch(/text-white/);
    expect(banner).not.toMatch(/backgroundColor: 'var\(--env-accent\)'/);
  });

  it('there is no demo switcher cluster left to contain', () => {
    // The Checkpoint-1B fix contained the cluster inside its own scroller.
    // The cluster itself is now gone, which removes the defect at its source.
    expect(strip(header)).not.toMatch(/overflow-x-auto/);
    expect(strip(header)).not.toMatch(/EnvironmentSwitcher|ScenarioSwitcher|PersonaSwitcher|RoleSwitcher/);
  });

  it('the 767px shell boundary is recorded as a ratified normalization', () => {
    expect(PX_BREAKPOINTS.mobile).toBe(767);
    expect(tokens).toMatch(/767 is Tailwind's `md` boundary/);
  });
});

// ── ONE PRODUCT / NO DEMO RUNTIME — §25 GUARDS ────────────────────────────
//
// Canonical authority: docs/KORA_OFFICIAL_IMPLEMENTATION_MASTER_PLAN_v2.1_PATCH_03.md
// (Founder ruling, 2026-08-31) and Master Plan v2.1 §13. These guards exist so
// the 2026-08-31 decision can never again fail to reach the shared shell the
// way it did between that date and 2026-09-20.

describe('KORA-WP-125 — One Product / No Demo Runtime, enforced in the shared shell', () => {
  const SHARED_CHROME = [
    'components/layout/AppShell.tsx',
    'components/layout/Header.tsx',
    'components/layout/Sidebar.tsx',
  ];
  const codeOf = (rel: string) => strip(read(rel));

  it('no demo switcher is reachable from any shared authenticated chrome', () => {
    for (const f of SHARED_CHROME) {
      for (const c of ['EnvironmentSwitcher', 'ScenarioSwitcher', 'PersonaSwitcher', 'RoleSwitcher']) {
        expect(codeOf(f), `${c} still reaches ${f}`).not.toContain(c);
      }
    }
  });

  it('no synthetic/demo banner renders in the authenticated Product', () => {
    for (const f of SHARED_CHROME) expect(codeOf(f)).not.toContain('SyntheticDataBanner');
  });

  it('no automatic synthetic/demo indication is rendered by shared chrome', () => {
    // Scope note: Sidebar.tsx holds both presentation AND the non-admin
    // navigation DATA. This guard covers the presentation the shell renders.
    // One navigation DESCRIPTION still advertises synthetic data —
    // '/my-kora/kora-space' -> "Dati sintetici — non il tuo spazio reale" — on
    // a route that app/my-kora/layout.tsx has redirected unconditionally since
    // the 2026-09-06 B-WORKER correction. That is stale KORA-WP-073 IA, not
    // shell presentation, so KORA-WP-125 escalates it rather than rewriting a
    // navigation label. See the WP-125 report, remaining defects.
    for (const f of SHARED_CHROME) {
      const presentation = codeOf(f).replace(/label:\s*'[^']*'|description:\s*'[^']*'/g, '');
      expect(presentation, `${f} renders demo copy`).not.toMatch(/DATI SIMULATI|SERVICE-ASSISTED|Dati sintetici/i);
    }
    // The automatic environment badge is gone from the shell.
    expect(codeOf('components/layout/Sidebar.tsx')).not.toMatch(/ENV_LABEL\[/);
  });

  it('the Admin navigation contains no demo-only destination', () => {
    const nav = read('lib/navigation/admin-nav-groups.ts');
    const items = [...nav.matchAll(/label:\s+'([^']+)',\s*href:\s+'([^']+)'/g)];
    expect(items.length).toBeGreaterThan(10);
    for (const [, label, href] of items) {
      expect(href, `${href} is a demo route`).not.toMatch(/^\/admin\/demo(\/|$)/);
      expect(label, `"${label}" advertises demo/synthetic`).not.toMatch(/demo|synthetic|sintetic/i);
    }
    expect(nav).not.toMatch(/environmentTag:\s*'SYNTHETIC'/);
  });

  it('the shared shell is identical regardless of data origin — tenant_kind cannot reach it', () => {
    // Patch 03: "tenant_kind may change side effects. It may not change product
    // truth", explicitly including customer-facing navigation and copy.
    for (const f of [...SHARED_CHROME, 'lib/navigation/admin-nav-groups.ts', 'lib/navigation/route-context.ts', 'lib/navigation/workspace-identity.ts']) {
      expect(codeOf(f), `${f} branches on tenant_kind`).not.toMatch(/tenant_kind|tenantKind/);
    }
  });

  it('workspace identity is derived from the session role, never from synthetic data', () => {
    const wi = strip(read('lib/navigation/workspace-identity.ts'));
    expect(wi).toMatch(/KORA_ADMIN|COMPANY_ADMIN|WORKER|PARTNER|ADVISOR/);
    expect(wi).not.toMatch(/synthetic|demo|tenant_kind/i);
    // No invented accent colour — every stop is an existing ratified token.
    expect(wi.replace(/\/\*[\s\S]*?\*\//g, '')).not.toMatch(/#[0-9A-Fa-f]{3,8}\b/);
  });

  it('route context is always outside a scrolling strip, so it cannot be hidden', () => {
    const src = strip(header);
    const idx = src.indexOf('data-px-slot="page-search"');
    const nav = src.indexOf('aria-label="Posizione corrente"');
    expect(nav).toBeGreaterThan(-1);
    expect(nav).toBeLessThan(idx);
    expect(src).not.toMatch(/overflow-x-auto/);
  });

  it('the Admin full sidebar is not empty — groups open by default', () => {
    expect(sidebar).toMatch(/for \(const group of ADMIN_NAV_GROUPS\) init\[group\.id\] = true;/);
  });

  it('the retired demo components are gone, and the guards that protected real users survive', () => {
    expect(existsSync(join(ROOT, 'components/demo/EnvironmentWatermark.tsx'))).toBe(false);
    expect(existsSync(join(ROOT, 'components/auth/SessionBar.tsx'))).toBe(false);
    // The pure demo guards remain — the /demo/* island is separately governed.
    const guard = read('lib/demo-state/demo-controls-guard.ts');
    expect(guard).toContain('shouldShowDemoControls');
    expect(guard).toContain('resolveBannerEnvironment');
  });
});
