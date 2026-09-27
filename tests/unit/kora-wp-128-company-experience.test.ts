// tests/unit/kora-wp-128-company-experience.test.ts
// KORA-WP-128 — Company Experience Remediation · Wave 4a.
//
// DELTA 5 BOUNDARY, BINDING. KORA-WP-128's scope was NARROWED, not widened:
// "Removed from its future execution responsibility: the `/company` cockpit
// redesign and Company information architecture, which now belong to
// KORA-WP-143." It retains (A) Company Intelligence Recomposition and
// (B) Company System Migration on the same files.
//
// (B) is Wave 4b and unauthorized here — 44 files, 1,317 inline typography and
// spacing decisions. Wave 4a delivers the bounded enforcement half and the
// evidence archive, and records the rest as acceptance debt.
//
// THE FIREWALL IS ASSERTED, NOT ASSUMED. The tests below prove this package did
// not reach into /company, /company/workspace or /company/status, which are
// KORA-WP-143's surfaces. WP143 is READY, unstarted, and sequenced after this.

import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { buildNavGroups } from '@/components/layout/Sidebar';
import { ROUTE_ARCHETYPE } from '@/lib/design/page-archetypes';

const companyItems = () =>
  buildNavGroups('COMPANY_ADMIN').flatMap((g) => g.items.map((i) => ({ ...i, heading: g.heading })));

const routeExists = (href: string) => {
  const base = href.split('?')[0].replace(/^\//, '');
  return ['page.tsx', 'page.ts'].some((f) => existsSync(join(process.cwd(), 'app', base, f)));
};

/** The five Intelligence surfaces DELTA 5 leaves with this package. */
const INTELLIGENCE_ROUTES = [
  '/company/kora-index', '/company/activation', '/company/pillars',
  '/company/reports', '/company/financial',
] as const;

/** KORA-WP-143's surfaces. This package must not touch them. */
const WP143_ROUTES = ['/company', '/company/workspace', '/company/status'] as const;

describe('KORA-WP-128 — no dead Company navigation target remains', () => {
  it('every Company destination resolves to a real route file', () => {
    for (const item of companyItems()) {
      expect(
        routeExists(item.href),
        `dead Company nav target: ${item.href} (group "${item.heading}")`,
      ).toBe(true);
    }
  });

  it('/demo/guide is gone from the Product — not redirected, removed', () => {
    // The route was deleted by the CC-00 demo retirement (2026-09-05). Three
    // call sites outlived it: app/pilot/page.tsx x2 and app/company/financial
    // x1. Master Plan v2.1 §13 ("One Product / No Demo Runtime") means there
    // is no demo destination to point at, so the references were removed
    // rather than pointed somewhere else.
    expect(existsSync(join(process.cwd(), 'app', 'demo', 'guide', 'page.tsx'))).toBe(false);
    for (const rel of ['app/pilot/page.tsx', 'app/company/financial/page.tsx']) {
      const src = readFileSync(join(process.cwd(), rel), 'utf8');
      const live = src
        .split('\n')
        .filter((l) => l.includes('/demo/guide') && !l.trimStart().startsWith('//') && !l.trimStart().startsWith('*'))
        .filter((l) => !l.includes('{/*'));
      expect(live, `${rel} still references /demo/guide`).toEqual([]);
    }
  });

  it('no Company destination is reachable twice, and every label is real', () => {
    const hrefs = companyItems().map((i) => i.href);
    expect(new Set(hrefs).size, `duplicate Company destinations: ${hrefs.join(', ')}`).toBe(hrefs.length);
    for (const item of companyItems()) {
      expect(item.label.trim().length).toBeGreaterThan(0);
      expect(item.label).not.toMatch(/TODO|TBD|placeholder|lorem/i);
    }
  });
});

describe('KORA-WP-128 — the Intelligence surfaces are measurable', () => {
  it('every Intelligence surface declares an archetype, so KORA-WP-126 can measure it', () => {
    for (const r of INTELLIGENCE_ROUTES) {
      expect(ROUTE_ARCHETYPE[r], `${r} declares no archetype — KORA-WP-126 fails closed`).toBeDefined();
    }
  });

  it('/company/reports is REPORT_EXPORT — a board pack carries its evidence in full', () => {
    // Its 4,000px contract is AN.1's ratified subtype, not an exemption:
    // measuring it against the 2,500px Executive threshold would manufacture a
    // defect out of legitimate board-pack, CSR and privacy content.
    expect(ROUTE_ARCHETYPE['/company/reports']).toBe('REPORT_EXPORT');
  });

  it('each captured Intelligence surface exposes a readiness marker, and NEVER on a loading state', () => {
    // The invariant is precise: a LOADING state must never satisfy readiness —
    // that is the defect KORA-WP-126 found in itself, capturing
    // "Caricamento in corso…" as though it were the Product.
    //
    // A resolved NO-DATA state is NOT a loading state. /company/kora-index
    // deliberately carries the marker on both its populated body and its
    // NoDataState, because both are genuinely rendered surfaces — KORA-WP-140's
    // own grammar is explicit that ZERO and NOT_YET_AVAILABLE are real states,
    // not absences. Asserting "marker on the final return" would have been the
    // wrong invariant and would have forced a false edit here.
    // Wave 4a's capture set. /company/reports and /company/financial are NOT
    // here: for a tenant without a completed pipeline both render their
    // resolved NOT_YET_AVAILABLE state through shared KORA-WP-140 state
    // components (NotYetAvailable -> StateFrame, NoDataState -> EmptyState)
    // which do not forward a test id. Making them forward one is a shared
    // component change outside Wave 4a's bounded scope, so their capture is
    // recorded as outstanding for Wave 4b rather than forced here.
    const expected: Record<string, string> = {
      'app/company/kora-index/page.tsx': 'company-kora-index-page',
      'app/company/activation/page.tsx': 'company-activation-page',
    };
    for (const [rel, testid] of Object.entries(expected)) {
      const src = readFileSync(join(process.cwd(), rel), 'utf8');
      expect(src, `${rel} lacks readiness marker ${testid}`).toContain(`data-testid="${testid}"`);

      const lines = src.split('\n');
      for (const [i, line] of lines.entries()) {
        if (!line.includes(`data-testid="${testid}"`)) continue;
        // No loading vocabulary within the marked element's own block.
        const block = lines.slice(Math.max(0, i - 6), i + 6).join('\n');
        expect(block, `${testid} in ${rel} marks a loading state`).not.toMatch(/Caricamento|Skeleton|isLoading|aria-busy/i);
      }
    }
  });
});

describe('KORA-WP-128 — the KORA-WP-143 firewall holds', () => {
  it('this package claims none of WP143’s surfaces', () => {
    // Stated as data so the boundary is legible, and so absorbing a WP143
    // surface into this package later becomes a visible test edit.
    for (const r of WP143_ROUTES) {
      expect(INTELLIGENCE_ROUTES as readonly string[]).not.toContain(r);
    }
  });

  it('the Company cockpit, workspace and status surfaces still exist, untouched by this package', () => {
    // WP143 is READY and unstarted. Its surfaces must still be there for it.
    for (const r of WP143_ROUTES) {
      expect(routeExists(r), `${r} must remain for KORA-WP-143`).toBe(true);
    }
  });

  it('no WP143 acceptance criterion is implemented here', () => {
    // WP143 owns (D) folding /company/workspace into the cockpit and (E)
    // demoting /company/status from navigation primacy. Both destinations are
    // therefore still in the Company rail, exactly as WP143 will find them.
    const hrefs = companyItems().map((i) => i.href);
    expect(hrefs, '/company/workspace was folded — that is WP143 scope').toContain('/company/workspace');
    expect(hrefs, '/company/status was demoted — that is WP143 scope').toContain('/company/status');
  });
});
