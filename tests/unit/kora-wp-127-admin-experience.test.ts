// tests/unit/kora-wp-127-admin-experience.test.ts
// KORA-WP-127 — KORA_ADMIN Experience Remediation · Wave 4a (Experience & Enforcement).
//
// SCOPE OF THIS FILE. KORA-WP-127's Tests field asks for a "navigation-coherence
// guard; dead-target guard; `126` evidence capture at the canonical viewport
// matrix". The founder-tooling separation itself is asserted in
// tests/unit/b169-nav-groups.test.ts, which already owns ADMIN_NAV_GROUPS'
// structure — duplicating it here would be the "equivalent guards across three
// WPs" this batch forbids.
//
// WHY THE ORPHAN GUARD LIVES HERE AND NOT IN THE KORA-WP-073 FILE.
// tests/unit/kora-wp-073-navigation-architecture.test.ts already carries an
// orphan guard, but it covers Company/Worker/Partner/Advisor only —
// ADMIN_NAV_GROUPS is a separate data source it never reads. Admin was
// therefore unguarded. This file closes that gap as Admin enforcement
// infrastructure. KORA-WP-073 remains COMPLETE and is not reopened.
//
// NOT IN WAVE 4a: the WP139-142 system migration across Admin's 77 files and
// 1,674 inline typography/spacing decisions. That is Wave 4b, unauthorized
// here, and its absence is recorded as acceptance debt rather than asserted
// away.

import { describe, it, expect } from 'vitest';
import { existsSync } from 'fs';
import { join } from 'path';
import { ADMIN_NAV_GROUPS } from '@/lib/navigation/admin-nav-groups';

const allItems = () => ADMIN_NAV_GROUPS.flatMap((g) => g.items.map((i) => ({ ...i, groupId: g.id })));

describe('KORA-WP-127 — no dead or stale Admin navigation target', () => {
  it('every ACTIVE Admin destination resolves to a real route file', () => {
    for (const item of allItems()) {
      // `inactive` items render disabled with an "inattivo" badge and are not
      // navigable — a deliberately parked destination is not a dead target.
      // They are asserted separately below so the exemption cannot widen.
      if (item.inactive || item.comingSoon) continue;
      const base = item.href.split('?')[0];
      const candidates = [
        join(process.cwd(), 'app', base.replace(/^\//, ''), 'page.tsx'),
        join(process.cwd(), 'app', base.replace(/^\//, ''), 'page.ts'),
      ];
      expect(
        candidates.some((p) => existsSync(p)),
        `dead Admin nav target: ${item.href} (group "${item.groupId}") has no route file`,
      ).toBe(true);
    }
  });

  it('every INACTIVE destination is genuinely parked — disabled, and never silently navigable', () => {
    const parked = allItems().filter((i) => i.inactive || i.comingSoon);
    // The exemption above is only sound while parked items are explicitly
    // flagged. An unflagged missing route must fail the guard, not slip past it.
    for (const item of parked) {
      expect(item.inactive === true || item.comingSoon === true).toBe(true);
    }
    // Pinned so a future edit cannot quietly park a broken destination to
    // silence the guard.
    expect(parked.map((i) => i.href)).toEqual(['/admin/future-vision']);
  });
});

describe('KORA-WP-127 — Admin operational IA is coherent', () => {
  it('no destination is reachable from two places — one job, one home', () => {
    const hrefs = allItems().map((i) => i.href);
    expect(new Set(hrefs).size, `duplicate Admin destinations: ${hrefs.join(', ')}`).toBe(hrefs.length);
  });

  it('every item carries a real label — no placeholder, TODO or empty text', () => {
    for (const item of allItems()) {
      expect(item.label.trim().length).toBeGreaterThan(0);
      expect(item.label).not.toMatch(/TODO|TBD|placeholder|lorem/i);
    }
  });

  it('every group carries a real label and at least one destination', () => {
    for (const g of ADMIN_NAV_GROUPS) {
      expect(g.label.trim().length, `group "${g.id}" has no label`).toBeGreaterThan(0);
      expect(g.items.length, `group "${g.id}" is empty — an empty group is not navigation`).toBeGreaterThan(0);
    }
  });

  it('cross-environment destinations are the documented exception, not a habit', () => {
    const foreign = allItems().filter((i) => !i.href.startsWith('/admin'));
    // `/commons` is the real KORA Commons capability, relocated (not deleted)
    // by the B169 demo retirement and deliberately reachable from Admin.
    expect(foreign.map((i) => i.href)).toEqual(['/commons']);
  });
});

describe('KORA-WP-127 — founder/lab/demo tooling is separated from operational navigation', () => {
  it('the founder group is the ONLY tagged group, and operational groups carry no founder destination', () => {
    // The structural assertions live in b169-nav-groups.test.ts. This one
    // states the acceptance clause itself, in the WP's own file, so the
    // contract clause is traceable to a test by name.
    const founder = ADMIN_NAV_GROUPS.find((g) => g.id === 'founder-tooling');
    expect(founder, 'KORA-WP-127 requires a separated founder-tooling group').toBeDefined();
    expect(founder!.environmentTag).toBe('FOUNDER');

    const operationalHrefs = ADMIN_NAV_GROUPS
      .filter((g) => g.id !== 'founder-tooling')
      .flatMap((g) => g.items.map((i) => i.href));
    expect(operationalHrefs).not.toContain('/admin/founder-validation');
  });

  it('separation is not retirement — the destination is still reachable', () => {
    expect(allItems().map((i) => i.href)).toContain('/admin/founder-validation');
  });
});
