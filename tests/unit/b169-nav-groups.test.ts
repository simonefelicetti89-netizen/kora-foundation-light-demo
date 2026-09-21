// tests/unit/b169-nav-groups.test.ts
// B169 FASE 6 — ADMIN_NAV_GROUPS structure integrity.
// Verifies: 6 groups exist, expected hrefs present, RIDONDANTE hrefs removed,
// collapsible state logic, DiagnosticsTabNav structure.

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { ADMIN_NAV_GROUPS } from '../../lib/navigation/admin-nav-groups';

const ROOT = join(process.cwd());
function read(rel: string): string {
  return readFileSync(join(ROOT, rel), 'utf-8');
}
function exists(rel: string): boolean {
  return existsSync(join(ROOT, rel));
}

// ── Group count and IDs ───────────────────────────────────────────────────────

describe('ADMIN_NAV_GROUPS — structure', () => {
  // ── Updated by KORA-WP-125, 2026-09-20 ────────────────────────────────────
  // Authority: docs/KORA_OFFICIAL_IMPLEMENTATION_MASTER_PLAN_v2.1_PATCH_03.md
  // ("One Product / No Demo Runtime", Founder ruling 2026-08-31) + Master Plan
  // v2.1 §13. The 'demo-lab' group carried a SYNTHETIC badge and existed to
  // orchestrate a demo experience, which the ruling forbids in the
  // authenticated Product. INVARIANT PRESERVED: the Admin navigation is
  // data-driven, its structure is pinned here, and widening it stays a visible
  // test edit. Its three destinations were classified before removal —
  // /commons (real capability) moved to 'network-content', /admin/demo/acme-001
  // (demo-only) left the Product navigation, /admin/operator escalated as
  // UNKNOWN. See the retirement note in lib/navigation/admin-nav-groups.ts.
  it('has exactly 6 groups', () => {
    // GOVERNANCE-UI-01 added a dedicated 'governance' group — platform-wide
    // credibility surface, deliberately not nested inside 'operations'.
    // 7 -> 6: 'demo-lab' retired (see the note above).
    expect(ADMIN_NAV_GROUPS).toHaveLength(6);
  });

  it('group IDs are exactly: pilot-lifecycle, companies, governance, operations, network-content, platform', () => {
    expect(ADMIN_NAV_GROUPS.map((g) => g.id)).toEqual([
      'pilot-lifecycle', 'companies', 'governance', 'operations', 'network-content', 'platform',
    ]);
  });

  it('no group is a demo-orchestration group, and none is tagged SYNTHETIC', () => {
    expect(ADMIN_NAV_GROUPS.find((g) => g.id === 'demo-lab')).toBeUndefined();
    for (const g of ADMIN_NAV_GROUPS) {
      expect(g.environmentTag, `${g.id} carries an environment tag`).toBeUndefined();
      expect(g.label).not.toMatch(/demo|synthetic|sintetic/i);
    }
  });

  it('no Admin destination is demo-only, and none advertises synthetic data', () => {
    for (const g of ADMIN_NAV_GROUPS) {
      for (const item of g.items) {
        expect(item.href, `${item.href} is a demo route`).not.toMatch(/^\/admin\/demo(\/|$)/);
        expect(item.label, `"${item.label}" advertises demo/synthetic`).not.toMatch(/demo|synthetic|sintetic/i);
      }
    }
  });

  it('the real /commons capability survived the retirement, relocated not deleted', () => {
    const net = ADMIN_NAV_GROUPS.find((g) => g.id === 'network-content');
    expect(net?.items.some((i) => i.href === '/commons')).toBe(true);
  });

  it('no other group has an environmentTag', () => {
    const tagged = ADMIN_NAV_GROUPS.filter((g) => g.id !== 'demo-lab' && g.environmentTag);
    expect(tagged).toHaveLength(0);
  });
});

// ── Canonical hrefs present ───────────────────────────────────────────────────

describe('ADMIN_NAV_GROUPS — canonical hrefs present', () => {
  const allItems = ADMIN_NAV_GROUPS.flatMap((g) => g.items);
  const allHrefs = allItems.map((i) => i.href);

  it('pilot-lifecycle has Pipeline & Trials and Founder Validation', () => {
    const group = ADMIN_NAV_GROUPS.find((g) => g.id === 'pilot-lifecycle')!;
    expect(group.items.map((i) => i.href)).toContain('/admin/pipeline');
    expect(group.items.map((i) => i.href)).toContain('/admin/founder-validation');
  });

  it('companies group has All Companies and Tenant Registry', () => {
    const group = ADMIN_NAV_GROUPS.find((g) => g.id === 'companies')!;
    expect(group.items.map((i) => i.href)).toContain('/admin/companies');
    expect(group.items.map((i) => i.href)).toContain('/admin/tenants');
  });

  it('operations group has all 6 expected hrefs', () => {
    const group = ADMIN_NAV_GROUPS.find((g) => g.id === 'operations')!;
    const hrefs = group.items.map((i) => i.href);
    expect(hrefs).toContain('/admin/data-intake');
    expect(hrefs).toContain('/admin/uef-review');
    expect(hrefs).toContain('/admin/impact-units');
    expect(hrefs).toContain('/admin/data-lifecycle');
    expect(hrefs).toContain('/admin/workers');
    expect(hrefs).toContain('/admin/trial-control-center');
  });

  it('platform group has /admin/platform/diagnostics (consolidated B169 FASE 5)', () => {
    const group = ADMIN_NAV_GROUPS.find((g) => g.id === 'platform')!;
    const hrefs = group.items.map((i) => i.href);
    expect(hrefs).toContain('/admin/platform/diagnostics');
  });

  it('platform group has Future Vision as inactive', () => {
    const group = ADMIN_NAV_GROUPS.find((g) => g.id === 'platform')!;
    const fv = group.items.find((i) => i.href === '/admin/future-vision');
    expect(fv).toBeDefined();
    expect(fv?.inactive).toBe(true);
  });

  it('demo-lab has KORA Commons at /commons', () => {
    expect(allHrefs).toContain('/commons');
  });

  it('all hrefs are strings starting with /', () => {
    for (const href of allHrefs) {
      expect(href).toMatch(/^\//);
    }
  });
});

// ── RIDONDANTE hrefs removed (B169 FASE 4) ───────────────────────────────────

describe('ADMIN_NAV_GROUPS — RIDONDANTE hrefs removed', () => {
  const allHrefs = ADMIN_NAV_GROUPS.flatMap((g) => g.items).map((i) => i.href);

  it('does NOT contain /demo/company/kora-index (RIDONDANTE)', () => {
    expect(allHrefs).not.toContain('/demo/company/kora-index');
  });

  it('does NOT contain /demo/company/ingestion (RIDONDANTE)', () => {
    expect(allHrefs).not.toContain('/demo/company/ingestion');
  });

  it('does NOT contain /demo/company/workforce (RIDONDANTE)', () => {
    expect(allHrefs).not.toContain('/demo/company/workforce');
  });

  it('does NOT contain /demo/company/reports (RIDONDANTE)', () => {
    expect(allHrefs).not.toContain('/demo/company/reports');
  });

  it('does NOT contain /demo/company/status (RIDONDANTE)', () => {
    expect(allHrefs).not.toContain('/demo/company/status');
  });

  it('does NOT contain /demo/company/financial (RIDONDANTE)', () => {
    expect(allHrefs).not.toContain('/demo/company/financial');
  });

  it('does NOT contain /admin/companies?from=preview (removed B169)', () => {
    expect(allHrefs).not.toContain('/admin/companies?from=preview');
  });

  it('does NOT have a standalone Workforce Management item (moved to CompanyTabNav)', () => {
    const allLabels = ADMIN_NAV_GROUPS.flatMap((g) => g.items).map((i) => i.label);
    expect(allLabels).not.toContain('Workforce Management');
  });

  it('does NOT have old flat diagnostic routes in sidebar (consolidated B169 FASE 5)', () => {
    expect(allHrefs).not.toContain('/admin/live-spine-diagnostics');
    expect(allHrefs).not.toContain('/admin/worker-diagnostics');
    expect(allHrefs).not.toContain('/admin/provisioning-diagnostics');
  });
});

// ── Sidebar collapsible logic ─────────────────────────────────────────────────

describe('Sidebar — collapsible group state (B169 FASE 3)', () => {
  const sidebar = read('components/layout/Sidebar.tsx');

  it('uses useState<Record<string, boolean>> for expandedGroups', () => {
    expect(sidebar).toContain('expandedGroups');
    expect(sidebar).toContain('Record<string, boolean>');
  });

  it('initializes expanded groups by matching pathname to group items', () => {
    expect(sidebar).toContain('group.items.some');
    expect(sidebar).toContain('pathname === item.href');
  });

  it('uses toggleGroup to flip expanded state (React state, no localStorage)', () => {
    expect(sidebar).toContain('toggleGroup');
    expect(sidebar).not.toContain('localStorage');
  });

  it('only renders items in a group when the group is expanded (isAdmin gate)', () => {
    expect(sidebar).toContain('isExpanded');
  });
});

// ── FASE 5 consolidation — new routes exist ───────────────────────────────────

describe('Diagnostics consolidation (B169 FASE 5)', () => {
  it('DiagnosticsTabNav component exists', () => {
    expect(exists('app/admin/platform/diagnostics/_components/DiagnosticsTabNav.tsx')).toBe(true);
  });

  it('DiagnosticsTabNav has 3 tabs: live-spine, worker, provisioning', () => {
    const src = read('app/admin/platform/diagnostics/_components/DiagnosticsTabNav.tsx');
    expect(src).toContain("slug: 'live-spine'");
    expect(src).toContain("slug: 'worker'");
    expect(src).toContain("slug: 'provisioning'");
  });

  it('diagnostics layout has requireKoraAdmin check', () => {
    const src = read('app/admin/platform/diagnostics/layout.tsx');
    expect(src).toContain('requireKoraAdmin');
    expect(src).toContain('DiagnosticsTabNav');
  });

  it('diagnostics index page redirects to live-spine', () => {
    const src = read('app/admin/platform/diagnostics/page.tsx');
    expect(src).toContain("redirect('/admin/platform/diagnostics/live-spine')");
  });

  it('live-spine sub-page has full diagnostic content (not a redirect)', () => {
    const src = read('app/admin/platform/diagnostics/live-spine/page.tsx');
    expect(src).toContain('ReadinessBadge');
    expect(src).toContain('fetchSpineData');
    expect(src).toContain('DEMO SINTETICO');
  });

  it('worker sub-page imports WorkerDiagnosticsClient from original location', () => {
    const src = read('app/admin/platform/diagnostics/worker/page.tsx');
    expect(src).toContain('WorkerDiagnosticsClient');
    expect(src).toContain('worker-diagnostics/_components');
  });

  it('provisioning sub-page has full diagnostic content (not a redirect)', () => {
    const src = read('app/admin/platform/diagnostics/provisioning/page.tsx');
    expect(src).toContain('B99');
    expect(src).toContain('DryCheckButton');
    expect(src).toContain("runtime = 'nodejs'");
  });

  it('old live-spine-diagnostics page redirects to new path', () => {
    const src = read('app/admin/live-spine-diagnostics/page.tsx');
    expect(src).toContain("redirect('/admin/platform/diagnostics/live-spine')");
    expect(src).not.toContain('fetchSpineData');
  });

  it('old worker-diagnostics page redirects to new path', () => {
    const src = read('app/admin/worker-diagnostics/page.tsx');
    expect(src).toContain("redirect('/admin/platform/diagnostics/worker')");
    expect(src).not.toContain('WorkerDiagnosticsClient');
  });

  it('old provisioning-diagnostics page redirects to new path', () => {
    const src = read('app/admin/provisioning-diagnostics/page.tsx');
    expect(src).toContain("redirect('/admin/platform/diagnostics/provisioning')");
    expect(src).not.toContain('runEnvChecks');
  });
});
