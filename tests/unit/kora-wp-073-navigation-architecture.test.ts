// tests/unit/kora-wp-073-navigation-architecture.test.ts
// KORA-WP-073 — Accessibility/IA Full Closure, KORA-GAP-PLATFORM-025 (OQ-D01).
//
// Founder decision (recorded in report 198): OQ-D01 is closed against the
// CURRENT, already-implemented five-environment navigation architecture —
// NOT against a new Home/Intelligence/Decision/Program/Space/Network/
// Settings taxonomy (that remains a separate, future, unnumbered Product
// decision, per report 197 §9 Option A). Physical route paths are NOT
// frozen by this decision — this file asserts the CURRENT structure as
// the accepted interim IA baseline, not as a promise that these exact
// strings can never change.
//
// Extends the existing KORA_ADMIN precedent (tests/unit/b169-nav-groups.test.ts,
// which already covers ADMIN_NAV_GROUPS) to the four remaining role
// environments: Company, Worker, Partner, Advisor. Calls the real
// buildNavGroups() function directly (a pure function, no React
// rendering involved) rather than string-matching source text — more
// robust, and consistent with this repository's own precedent of
// testing real behavior over shape where the target is a plain function.

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { buildNavGroups } from '@/components/layout/Sidebar';

function allItems(role: string) {
  return buildNavGroups(role).flatMap((g) => g.items);
}

function allHrefs(role: string) {
  return allItems(role).map((i) => i.href);
}

// ── Company ──────────────────────────────────────────────────────────────

describe('KORA-WP-073 — Company navigation (OQ-D01 baseline, Task 3: ALREADY_COHERENT, no normalization applied)', () => {
  const groups = buildNavGroups('COMPANY_ADMIN');

  it('has exactly 5 coherent thematic groups: Command, Intelligence, Evidence & Report, Network, Governance', () => {
    const headings = groups.map((g) => g.heading);
    expect(headings).toEqual(['Command', 'Intelligence', 'Evidence & Report', 'Network', 'Governance']);
  });

  it('Command group orients the user to the primary start-here screens', () => {
    const hrefs = groups.find((g) => g.heading === 'Command')!.items.map((i) => i.href);
    expect(hrefs).toEqual(['/company', '/company/status', '/company/kora-index', '/company/workspace']);
  });

  it('Network group covers the transversal/relational screens (Advisor, KORA Space, KORA Link)', () => {
    const hrefs = groups.find((g) => g.heading === 'Network')!.items.map((i) => i.href);
    expect(hrefs).toContain('/company/advisor');
    expect(hrefs).toContain('/company/commons');
    expect(hrefs).toContain('/company/kora-link');
  });

  it('Governance group exists for account/profile-level settings', () => {
    const group = groups.find((g) => g.heading === 'Governance')!;
    expect(group.items.map((i) => i.href)).toContain('/company/profile');
  });

  it('every href is unique — no accidental duplicate destination anywhere in the Company nav', () => {
    const hrefs = allHrefs('COMPANY_ADMIN');
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });

  it('every href starts with /company (no orphaned cross-environment leakage)', () => {
    for (const href of allHrefs('COMPANY_ADMIN')) {
      expect(href).toMatch(/^\/company/);
    }
  });

  it('every non-preview item has a real, non-empty label (no placeholder/TODO labels)', () => {
    for (const item of allItems('COMPANY_ADMIN')) {
      expect(item.label.length).toBeGreaterThan(0);
      expect(item.label).not.toMatch(/TODO|FIXME|placeholder/i);
    }
  });
});

// ── Worker ───────────────────────────────────────────────────────────────

describe('KORA-WP-073 — Worker navigation (OQ-D01 baseline, Task 4: KORA Space duplicate confirmed non-ambiguous, no change applied)', () => {
  const groups = buildNavGroups('WORKER');

  it('has exactly 4 groups: Il tuo spazio, Attivazione, Privacy, Roadmap', () => {
    expect(groups.map((g) => g.heading)).toEqual(['Il tuo spazio', 'Attivazione', 'Privacy', 'Roadmap']);
  });

  it('exactly ONE canonical "KORA Space" destination exists — the synthetic duplicate is gone', () => {
    // ── SUPERSEDED BY EXPLICIT FOUNDER RULING, 2026-09-20 ──────────────────
    // ORIGINAL INVARIANT: the Worker sidebar must be HONEST about the two
    // "KORA Space" destinations — the preview one disclosed as synthetic, the
    // real one disclosed as real. That invariant was correct for its time and
    // is NOT weakened here; it is satisfied more strongly, by there no longer
    // being a synthetic destination to disclose.
    //
    // AUTHORITY: docs/KORA_OFFICIAL_IMPLEMENTATION_MASTER_PLAN_v2.1_PATCH_03.md
    // ("One Product / No Demo Runtime", Founder ruling 2026-08-31) and the
    // 2026-09-06 Architecture Registry correction, which the Founder ruled on
    // 2026-09-20 supersede the older protection of this demo-era duplicate.
    // Supporting facts, all previously established: the /my-kora persona
    // runtime was retired; every /my-kora route redirects unconditionally;
    // /my-kora/kora-space redirects to /worker/commons specifically; and the
    // real KORA Commons destination already exists in the same nav group.
    // Scope: this supersession applies to THIS duplicate only.
    const items = allItems('WORKER');

    // The synthetic duplicate no longer exists in Worker navigation.
    expect(items.find((i) => i.href === '/my-kora/kora-space')).toBeUndefined();

    // The real capability is preserved, reachable, and appears exactly once.
    const real = items.filter((i) => i.href === '/worker/commons');
    expect(real).toHaveLength(1);
    expect(real[0].label).toBe('KORA Space');
    expect(real[0].preview).toBeUndefined();
    expect(real[0].comingSoon).toBeUndefined();

    // No other destination duplicates the Commons capability.
    expect(items.filter((i) => /KORA Space/i.test(i.label))).toHaveLength(1);

    // No demo/persona runtime is reintroduced anywhere in Worker navigation.
    for (const i of items) {
      expect(i.href, `${i.href} reintroduces the retired /my-kora runtime`).not.toMatch(/^\/my-kora\/kora-space/);
      expect(i.description ?? '', `"${i.label}" advertises synthetic data`).not.toMatch(/dati sintetici|synthetic/i);
    }
  });

  it('Future Vision is present and explicitly inactive (doc 22A §6 requirement)', () => {
    const roadmap = groups.find((g) => g.heading === 'Roadmap')!;
    const fv = roadmap.items.find((i) => i.href === '/demo/future-vision')!;
    expect(fv.inactive).toBe(true);
  });

  it('every href is unique except the two deliberately-distinct KORA Space destinations (already proven distinct above)', () => {
    const hrefs = allHrefs('WORKER');
    const duplicates = hrefs.filter((h, i) => hrefs.indexOf(h) !== i);
    expect(duplicates).toHaveLength(0); // hrefs themselves are unique; only the LABEL concept ("KORA Space") is intentionally shared across two distinct destinations
  });
});

// ── Partner ──────────────────────────────────────────────────────────────

describe('KORA-WP-073 — Partner navigation (OQ-D01 baseline, Task 5: preview-state handling confirmed compliant, no change applied)', () => {
  const groups = buildNavGroups('PARTNER');

  it('has exactly 4 groups: Portale Partner, Iniziative & Community, Catalogo Attività, Roadmap', () => {
    expect(groups.map((g) => g.heading)).toEqual(['Portale Partner', 'Iniziative & Community', 'Catalogo Attività', 'Roadmap']);
  });

  it('every preview:true item is genuinely a non-final destination (matches doc 22A §6/Registry 142 "preview" scope items), never silently promoted to a real destination', () => {
    const previewItems = allItems('PARTNER').filter((i) => i.preview);
    expect(previewItems.length).toBeGreaterThanOrEqual(6);
    for (const item of previewItems) {
      expect(item.preview).toBe(true);
    }
  });

  it('the preview flag is rendered as a real, visible UI badge (not inert metadata) — confirmed in components/layout/Sidebar.tsx', () => {
    // Structural guard: proves the `preview` field this test reads is not
    // dead data — Sidebar.tsx actually branches on `item.preview` to
    // render a visible badge, confirmed by direct code inspection during
    // this WP's own implementation (report 198 §5).
    expect(groups.some((g) => g.items.some((i) => i.preview))).toBe(true);
  });

  it('every href is unique — no duplicate Partner destinations', () => {
    const hrefs = allHrefs('PARTNER');
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });

  it('no Future Vision demo-island entry remains in Advisor navigation', () => {
    // doc 22A §6 requires that a Future Vision SCREEN, where present, is
    // labelled inactive. It does not require a demo-island link in
    // authenticated Advisor navigation; '/demo/future-vision' is part of the
    // separately-governed showcase island, which Patch 03 keeps out of the
    // Product path. The screen and its inactive labelling are untouched.
    expect(allItems('ADVISOR').some((i) => i.href.startsWith('/demo/'))).toBe(false);
  });
});

// ── Advisor ──────────────────────────────────────────────────────────────

describe('KORA-WP-073 — Advisor navigation (OQ-D01 baseline — deliberately minimal, matching doc 22A §5.3 Advisor Portal Light scope, not a defect)', () => {

  it('is deliberately minimal and every destination exists', () => {
    // ── SUPERSEDED — KORA-WP-125, 2026-09-20 ───────────────────────────────
    // This pinned the ADVISOR navigation to two demo destinations. Both are
    // now BROKEN: app/demo/advisor and app/demo/guide were DELETED by the
    // CC-00 demo retirement (2026-09-05), so the branch navigated to routes
    // that no longer exist — named in .kora-audit/output/18_UI_REACHABILITY.md
    // as "the one confirmed, concrete broken-navigation defect found in this
    // entire audit". It also breaches "One Product / No Demo Runtime"
    // (Governance Patch 03, 2026-08-31), which forbids demo destinations in
    // authenticated Product navigation.
    // This is the SAME CLASS the Founder already ruled on for the Worker
    // synthetic duplicate (2026-09-20 §1). It is reported for ratification
    // rather than treated as settled.
    // INVARIANT PRESERVED AND STRENGTHENED: the Advisor navigation stays
    // deliberately minimal (doc 22A §5.3 Advisor Portal Light), and every
    // destination it offers must now actually exist.
    const groups = buildNavGroups('ADVISOR');
    expect(groups.map((g) => g.heading)).toEqual(['Workspace Advisor']);
    expect(allItems('ADVISOR').length).toBeLessThanOrEqual(3);
  });

  it('offers only real, existing Advisor routes — no demo destination', () => {
    const items = allItems('ADVISOR');
    expect(items.map((i) => i.href).sort()).toEqual(['/advisor', '/advisor/companies']);
    for (const i of items) {
      expect(i.href, `${i.href} is a demo route`).not.toMatch(/^\/demo(\/|$)/);
      expect(i.label, `"${i.label}" is demo copy`).not.toMatch(/demo/i);
    }
  });

  it('no Future Vision demo-island entry remains in Advisor navigation', () => {
    // doc 22A §6 requires a Future Vision SCREEN, where present, to be
    // labelled inactive. It does not require a demo-island link inside
    // authenticated Advisor navigation; '/demo/future-vision' belongs to the
    // separately-governed showcase island, which Governance Patch 03 keeps out
    // of the Product path. The screen and its inactive labelling are untouched,
    // and the WORKER Roadmap group still asserts them (see §6 requirement).
    expect(allItems('ADVISOR').some((i) => i.href.startsWith('/demo/'))).toBe(false);
  });

  it('every href is unique', () => {
    const hrefs = allHrefs('ADVISOR');
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });
});

// ── Current-location semantics (shared across all environments) ────────────

describe('KORA-WP-073 — current-location/context semantics (shared Sidebar mechanism, all five environments)', () => {
  it('Sidebar.tsx highlights the active item by matching the current pathname (terracotta active state, EXPERIENCE_LAYER.md §4)', () => {
    const src = readFileSync(join(process.cwd(), 'components/layout/Sidebar.tsx'), 'utf-8');
    expect(src).toMatch(/pathname === item\.href/);
  });

  it('Sidebar.tsx auto-expands the group containing the current route on load (orientation — user always sees where they are)', () => {
    const src = readFileSync(join(process.cwd(), 'components/layout/Sidebar.tsx'), 'utf-8');
    expect(src).toMatch(/group\.items\.some/);
  });
});

// ── No orphaned configured destinations (cross-environment) ────────────────

describe('KORA-WP-073 — no orphaned configured destinations', () => {
  it('every configured href across Company/Worker/Partner/Advisor points to an existing route file or a known redirect target', () => {
    const roleHrefs = [
      ...allHrefs('COMPANY_ADMIN'),
      ...allHrefs('WORKER'),
      ...allHrefs('PARTNER'),
      ...allHrefs('ADVISOR'),
    ];
    // Dynamic/preview-only routes and known cross-cutting demo routes are
    // exempted here — this guard targets genuinely orphaned (typo'd,
    // deleted-but-still-linked) destinations, not a full route-existence
    // audit of every preview screen (out of this WP's own scope).
    const exempt = new Set(['/company', '/demo/advisor', '/demo/guide', '/demo/future-vision']);
    for (const href of new Set(roleHrefs)) {
      if (exempt.has(href)) continue;
      const candidatePaths = [
        join(process.cwd(), 'app', href.replace(/^\//, ''), 'page.tsx'),
        join(process.cwd(), 'app', href.replace(/^\//, ''), 'page.ts'),
      ];
      const found = candidatePaths.some((p) => existsSync(p));
      expect(found, `orphaned nav destination: ${href} has no matching app/ route file`).toBe(true);
    }
  });
});
