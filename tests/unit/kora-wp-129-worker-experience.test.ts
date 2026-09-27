// tests/unit/kora-wp-129-worker-experience.test.ts
// KORA-WP-129 — Worker Experience Remediation · Wave 4a.
//
// BINDING EVIDENCE BOUNDARY (Registry 219, DELTA 5, verbatim): "Worker visual
// and runtime coverage is currently incomplete. No major Worker
// information-architecture redesign may be scoped until current visual/runtime
// evidence exists, and no Worker defect may be asserted from file size alone."
//
// Wave 4a therefore CAPTURES the evidence that boundary demands and asserts
// only what is mechanically true today. It restructures no Worker navigation
// and asserts no defect from size. The WP139-142 system migration across
// app/worker's 25 files and 985 inline decisions is Wave 4b, unauthorized here.
//
// CONSTITUTIONAL: this package changes presentation only. Every existing
// worker-privacy and route-privacy guard must pass UNMODIFIED — they are run
// unchanged in validation and no assertion in them is touched by this package.

import { describe, it, expect } from 'vitest';
import { existsSync } from 'fs';
import { join } from 'path';
import { buildNavGroups } from '@/components/layout/Sidebar';
import { ROUTE_ARCHETYPE } from '@/lib/design/page-archetypes';

const workerGroups = () => buildNavGroups('WORKER');
const workerItems = () => workerGroups().flatMap((g) => g.items.map((i) => ({ ...i, heading: g.heading })));

const routeExists = (href: string) => {
  const base = href.split('?')[0].replace(/^\//, '');
  return ['page.tsx', 'page.ts'].some((f) => existsSync(join(process.cwd(), 'app', base, f)));
};

describe('KORA-WP-129 — Worker navigation is consistent', () => {
  it('the Worker rail is non-empty and every group carries a heading', () => {
    const groups = workerGroups();
    expect(groups.length).toBeGreaterThan(0);
    for (const g of groups) {
      expect(g.heading.trim().length, 'a group with no heading is not navigation').toBeGreaterThan(0);
      expect(g.items.length, `group "${g.heading}" is empty`).toBeGreaterThan(0);
    }
  });

  it('every Worker destination resolves to a real route file — none is dead', () => {
    for (const item of workerItems()) {
      expect(
        routeExists(item.href),
        `dead Worker nav target: ${item.href} (group "${item.heading}") has no route file`,
      ).toBe(true);
    }
  });

  it('no destination is reachable twice — one job, one home', () => {
    const hrefs = workerItems().map((i) => i.href);
    expect(new Set(hrefs).size, `duplicate Worker destinations: ${hrefs.join(', ')}`).toBe(hrefs.length);
  });

  it('every item carries a real label — no placeholder, TODO or empty text', () => {
    for (const item of workerItems()) {
      expect(item.label.trim().length).toBeGreaterThan(0);
      expect(item.label).not.toMatch(/TODO|TBD|placeholder|lorem/i);
    }
  });

  it('records the Worker rail’s cross-tree destinations as they stand, without restructuring them', () => {
    // /my-kora/* resolves through the redirect layer and /demo/future-vision is
    // an inactive parked destination. Both are PINNED here rather than changed:
    // altering Worker wayfinding is information-architecture work, and this
    // package's own evidence boundary forbids that until the visual/runtime
    // evidence Wave 4a is now producing exists. Any future change is therefore
    // a visible, deliberate edit to this assertion.
    const foreign = workerItems().filter((i) => !i.href.startsWith('/worker'));
    expect(foreign.map((i) => i.href).sort()).toEqual(['/demo/future-vision', '/my-kora/collective']);
    for (const item of foreign) {
      expect(routeExists(item.href), `${item.href} does not resolve`).toBe(true);
    }
  });
});

describe('KORA-WP-129 — the captured Worker surfaces are measurable', () => {
  it('both Wave 4a evidence surfaces declare an archetype, so KORA-WP-126 can measure them', () => {
    // KORA-WP-126's checkRouteArchetypeDeclared fails closed; a surface without
    // an archetype has no length or ratio contract and cannot be accepted.
    expect(ROUTE_ARCHETYPE['/worker/workspace']).toBe('EXECUTIVE_JUDGMENT');
    expect(ROUTE_ARCHETYPE['/worker/privacy']).toBe('DISCLOSURE_STATIC');
  });

  it('the privacy surface is classified as sustained reading, not as a judgment surface', () => {
    // A worker reads the privacy surface in sequence; classifying it
    // EXECUTIVE_JUDGMENT would impose a 2,500px contract on text that is
    // legitimately long, and would be a measurement error rather than a defect.
    expect(ROUTE_ARCHETYPE['/worker/privacy']).not.toBe('EXECUTIVE_JUDGMENT');
  });
});
