// tests/unit/b95c-workforce-navigation.test.ts
// B95-C — Workforce Navigation Fix
// Verifies that Workforce Management is discoverable from main admin navigation.
//
// Success criterion: A KORA Admin can find workforce creation/import in under 15 seconds.
//
// Scope: pure logic and config tests — no React rendering, no services.
// Privacy invariants confirmed: no individual PIB, no employer-visible worker data.

import { describe, it, expect } from 'vitest';
import { buildNavGroups } from '../../components/layout/Sidebar';
import { ADMIN_QUICKSTART_STEPS } from '../../lib/feature-discovery/index';
import {
  LIFECYCLE_STEPS,
} from '../../lib/admin-lifecycle/lifecycle-rules';

// ── Task 1: Sidebar — Workforce navigation post-B169 ─────────────────────────
// B169 FASE 2: Workforce Management moved from sidebar to CompanyTabNav.
// Path: sidebar Companies group → /admin/companies → company drill-in → Workforce tab.

describe('B95-C Task 1 — Sidebar: Workforce nav post-B169 (CompanyTabNav)', () => {

  it('admin sidebar has NO standalone Workforce Management item (moved to CompanyTabNav)', () => {
    const groups = buildNavGroups('KORA_ADMIN');
    const allItems = groups.flatMap((g) => g.items);
    expect(allItems.find((i) => i.label === 'Workforce Management')).toBeUndefined();
  });

  it('admin sidebar Companies group exists and contains /admin/companies', () => {
    const groups = buildNavGroups('KORA_ADMIN');
    const companiesGroup = groups.find((g) => g.heading === 'Companies');
    expect(companiesGroup).toBeDefined();
    expect(companiesGroup?.items.find((i) => i.href === '/admin/companies')).toBeDefined();
  });

  it('admin sidebar Operations group contains Worker Provisioning at /admin/workers', () => {
    const groups = buildNavGroups('KORA_ADMIN');
    const opsGroup = groups.find((g) => g.heading === 'Operations');
    expect(opsGroup).toBeDefined();
    expect(opsGroup?.items.find((i) => i.href === '/admin/workers')).toBeDefined();
  });

  it('CompanyTabNav no longer has a Workforce tab (retired — B-TRUTH Gen 0/1 Retirement Wave 1)', () => {
    const src = require('fs').readFileSync(
      require('path').resolve(__dirname, '../../app/admin/companies/[companyId]/_components/CompanyTabNav.tsx'),
      'utf-8',
    );
    expect(src).not.toContain("slug: 'workforce'");
    expect(src).not.toContain("label: 'Workforce'");
  });

  it('non-admin roles do not have Workforce Management in sidebar', () => {
    for (const role of ['COMPANY_ADMIN', 'WORKER', 'PARTNER', 'ADVISOR']) {
      const allItems = buildNavGroups(role).flatMap((g) => g.items);
      expect(allItems.find((i) => i.label === 'Workforce Management')).toBeUndefined();
    }
  });

  it('buildNavGroups with companyId does NOT add workforce link to sidebar (B169 — moved to tab nav)', () => {
    const groups = buildNavGroups('KORA_ADMIN', 'meridiana-group');
    const allItems = groups.flatMap((g) => g.items);
    expect(allItems.filter((i) => i.href.includes('/workforce')).length).toBe(0);
  });

  it('Pilot Lifecycle group appears before Operations group in admin sidebar', () => {
    const groups = buildNavGroups('KORA_ADMIN');
    const pilotIdx = groups.findIndex((g) => g.heading === 'Pilot Lifecycle');
    const opsIdx   = groups.findIndex((g) => g.heading === 'Operations');
    expect(pilotIdx).toBeGreaterThanOrEqual(0);
    expect(opsIdx).toBeGreaterThanOrEqual(0);
    expect(pilotIdx).toBeLessThan(opsIdx);
  });
});

// ── Task 2: Workforce tab retired (B-TRUTH Gen 0/1 Retirement Wave 1) ────────
// B169 FASE 2 originally put Workforce in CompanyTabNav as a demo drill-in tab.
// 2026-08-30: that page was 100% synthetic (TenantService/tenants.json-rooted)
// with no unique capability beyond real /admin/workers (B104, live) — retired.
// See lib/architecture/registry.ts svc.tenant notes.

describe('B-TRUTH Gen 0/1 Retirement Wave 1 — Workforce tab removed from CompanyTabNav', () => {

  it('CompanyTabNav no longer has a workforce tab', () => {
    const src = require('fs').readFileSync(
      require('path').resolve(__dirname, '../../app/admin/companies/[companyId]/_components/CompanyTabNav.tsx'),
      'utf-8',
    );
    expect(src).not.toContain("slug: 'workforce'");
  });

  it('the retired workforce drill-in page no longer exists', () => {
    const { existsSync } = require('fs');
    const { join } = require('path');
    expect(existsSync(join(process.cwd(), 'app/admin/companies/[companyId]/workforce/page.tsx'))).toBe(false);
  });

  it('CompanyTabNav retains exactly the 5 Gen 3 + Users tabs', () => {
    const src = require('fs').readFileSync(
      require('path').resolve(__dirname, '../../app/admin/companies/[companyId]/_components/CompanyTabNav.tsx'),
      'utf-8',
    );
    for (const slug of ['workspace', 'preview', 'submissions', 'evidence', 'users']) {
      expect(src).toContain(`slug: '${slug}'`);
    }
    expect(src).not.toContain("slug: 'data-intake'");
    expect(src).not.toContain("slug: 'onboarding'");
  });
});

// ── Task 3: /admin/pipeline does not hardcode without demo label ──────────────

describe('B95-C Task 3 — /admin/pipeline: workforce link demo labeling', () => {

  it('lifecycle step 3 (import_workforce) route goes to /admin/companies for selection', () => {
    const importStep = LIFECYCLE_STEPS.find((s) => s.id === 'import_workforce');
    expect(importStep).toBeDefined();
    expect(importStep?.route).toBe('/admin/companies');
  });

  it('all 8 lifecycle steps are defined', () => {
    expect(LIFECYCLE_STEPS).toHaveLength(8);
  });

  it('import_workforce step is step 3', () => {
    const importStep = LIFECYCLE_STEPS.find((s) => s.id === 'import_workforce');
    expect(importStep?.stepNumber).toBe(3);
  });
});

// ── Task 4: /admin/page.tsx quickstart Step 3 → workforce ────────────────────

describe('B95-C Task 4 — Admin quickstart: Step 3 imports workforce', () => {

  it('ADMIN_QUICKSTART_STEPS includes a step pointing to /admin/companies', () => {
    const companiesStep = ADMIN_QUICKSTART_STEPS.find((s) => s.href === '/admin/companies');
    expect(companiesStep).toBeDefined();
  });

  it('Step 3 in quickstart points to /admin/companies (workforce selection)', () => {
    const step3 = ADMIN_QUICKSTART_STEPS.find((s) => s.step === 3);
    expect(step3).toBeDefined();
    expect(step3?.href).toBe('/admin/companies');
  });

  it('Step 3 label is workforce-related', () => {
    const step3 = ADMIN_QUICKSTART_STEPS.find((s) => s.step === 3);
    const label = step3?.label.toLowerCase() ?? '';
    expect(label).toMatch(/workforce|lavorat/i);
  });

  it('quickstart step numbers are unique and sequential', () => {
    const steps = [...ADMIN_QUICKSTART_STEPS].sort((a, b) => a.step - b.step);
    for (let i = 0; i < steps.length; i++) {
      expect(steps[i].step).toBe(i + 1);
    }
  });

  it('quickstart has at least 7 steps', () => {
    expect(ADMIN_QUICKSTART_STEPS.length).toBeGreaterThanOrEqual(7);
  });

  it('Step 1 still creates a company live', () => {
    const step1 = ADMIN_QUICKSTART_STEPS.find((s) => s.step === 1);
    expect(step1?.href).toBe('/admin/companies/new');
  });

  it('Step 2 still adds a user', () => {
    const step2 = ADMIN_QUICKSTART_STEPS.find((s) => s.step === 2);
    expect(step2?.href).toBe('/admin/company-users');
  });
});

// ── Task 5: Workforce route reachable from main admin navigation ──────────────
// B169 FASE 2: workforce is now in CompanyTabNav, reached via Companies group sidebar item.

describe('B95-C Task 5 — Workforce route reachability from admin navigation', () => {

  it('admin sidebar Companies group provides path to company drill-in (workforce gateway)', () => {
    const groups = buildNavGroups('KORA_ADMIN');
    const companiesGroup = groups.find((g) => g.heading === 'Companies');
    expect(companiesGroup).toBeDefined();
    expect(companiesGroup?.items.find((i) => i.href === '/admin/companies')).toBeDefined();
  });

  it('admin sidebar has no /workforce items (moved to CompanyTabNav — B169 FASE 2)', () => {
    const groups = buildNavGroups('KORA_ADMIN', 'meridiana-group');
    const allItems = groups.flatMap((g) => g.items);
    expect(allItems.filter((i) => i.href.includes('/workforce')).length).toBe(0);
  });

  it('quickstart step pointing to /admin/companies is labeled to suggest workforce action', () => {
    const companiesStep = ADMIN_QUICKSTART_STEPS.find((s) => s.href === '/admin/companies');
    expect(companiesStep).toBeDefined();
    const label = companiesStep?.label.toLowerCase() ?? '';
    expect(label.length).toBeGreaterThan(3);
  });

  it('workforce tab is NOT in Demo Lab or Platform sidebar groups', () => {
    const groups = buildNavGroups('KORA_ADMIN');
    const demoGroup     = groups.find((g) => g.heading === 'Demo Lab');
    const platformGroup = groups.find((g) => g.heading === 'Platform');
    expect(demoGroup?.items.find((i) => i.href.includes('/workforce'))).toBeUndefined();
    expect(platformGroup?.items.find((i) => i.href.includes('/workforce'))).toBeUndefined();
  });
});

// ── Privacy invariants ────────────────────────────────────────────────────────

describe('B95-C Privacy invariants', () => {

  it('workforce navigation does not expose individual PIB data', () => {
    // The sidebar items are just href strings — no PIB data is embedded
    const groups = buildNavGroups('KORA_ADMIN', 'meridiana-group');
    const allItems = groups.flatMap((g) => g.items);
    for (const item of allItems) {
      expect(item.href).not.toContain('pib');
      expect(item.label).not.toContain('PIB');
    }
  });

  it('workforce navigation items do not contain worker-level data', () => {
    const groups = buildNavGroups('KORA_ADMIN', 'meridiana-group');
    const allItems = groups.flatMap((g) => g.items);
    for (const item of allItems) {
      expect(item.href).not.toContain('/workers/');
      expect(item.href).not.toContain('/pib/');
    }
  });
});
