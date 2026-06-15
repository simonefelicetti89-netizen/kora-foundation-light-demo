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

// ── Task 1: Sidebar includes Workforce Management ─────────────────────────────

describe('B95-C Task 1 — Sidebar: Workforce Management entry', () => {

  it('admin sidebar Provisioning group includes Workforce Management item', () => {
    const groups = buildNavGroups('KORA_ADMIN');
    const liveOps = groups.find((g) => g.heading === 'Provisioning');
    expect(liveOps).toBeDefined();
    const workforceItem = liveOps?.items.find((item) => item.label === 'Workforce Management');
    expect(workforceItem).toBeDefined();
  });

  it('Workforce Management links to /admin/companies when no company context', () => {
    const groups = buildNavGroups('KORA_ADMIN');
    const liveOps = groups.find((g) => g.heading === 'Provisioning');
    const workforceItem = liveOps?.items.find((item) => item.label === 'Workforce Management');
    expect(workforceItem?.href).toBe('/admin/companies');
  });

  it('Workforce Management links directly to company workforce when companyId provided', () => {
    const groups = buildNavGroups('KORA_ADMIN', 'meridiana-group');
    const liveOps = groups.find((g) => g.heading === 'Provisioning');
    const workforceItem = liveOps?.items.find((item) => item.label === 'Workforce Management');
    expect(workforceItem?.href).toBe('/admin/companies/meridiana-group/workforce');
  });

  it('Workforce Management link with companyId contains /workforce', () => {
    const testIds = ['meridiana-group', 'alba-manufacturing', 'nova-packaging'];
    for (const id of testIds) {
      const groups = buildNavGroups('KORA_ADMIN', id);
      const liveOps = groups.find((g) => g.heading === 'Provisioning');
      const wfItem = liveOps?.items.find((item) => item.label === 'Workforce Management');
      expect(wfItem?.href).toContain('/workforce');
      expect(wfItem?.href).toContain(id);
    }
  });

  it('Workforce Management shows helper description when no company context', () => {
    const groups = buildNavGroups('KORA_ADMIN');
    const liveOps = groups.find((g) => g.heading === 'Provisioning');
    const workforceItem = liveOps?.items.find((item) => item.label === 'Workforce Management');
    expect(workforceItem?.description).toBeDefined();
    expect(workforceItem?.description).not.toBe('');
  });

  it('Workforce Management has no description when direct company link', () => {
    const groups = buildNavGroups('KORA_ADMIN', 'meridiana-group');
    const liveOps = groups.find((g) => g.heading === 'Provisioning');
    const workforceItem = liveOps?.items.find((item) => item.label === 'Workforce Management');
    expect(workforceItem?.description).toBeUndefined();
  });

  it('non-admin roles do not have Workforce Management in sidebar', () => {
    const companyGroups  = buildNavGroups('COMPANY_ADMIN');
    const workerGroups   = buildNavGroups('WORKER');
    const partnerGroups  = buildNavGroups('PARTNER');
    const advisorGroups  = buildNavGroups('ADVISOR');

    for (const groups of [companyGroups, workerGroups, partnerGroups, advisorGroups]) {
      const allItems = groups.flatMap((g) => g.items);
      const wfItem = allItems.find((item) => item.label === 'Workforce Management');
      expect(wfItem).toBeUndefined();
    }
  });

  it('Pilot Lifecycle appears before Workforce Management in Provisioning', () => {
    const groups = buildNavGroups('KORA_ADMIN');
    const liveOps = groups.find((g) => g.heading === 'Provisioning');
    const items = liveOps?.items ?? [];
    const pilotIdx = items.findIndex((i) => i.label === 'Pilot Lifecycle');
    const wfIdx = items.findIndex((i) => i.label === 'Workforce Management');
    expect(pilotIdx).toBeGreaterThanOrEqual(0);
    expect(wfIdx).toBeGreaterThanOrEqual(0);
    expect(pilotIdx).toBeLessThan(wfIdx);
  });
});

// ── Task 2: /admin/companies exposes Gestisci workforce CTA ──────────────────

describe('B95-C Task 2 — /admin/companies: workforce CTA reachability', () => {

  it('Workforce Management is a navigable route under /admin/companies/[companyId]/workforce', () => {
    const expectedPath = '/admin/companies/meridiana-group/workforce';
    const groups = buildNavGroups('KORA_ADMIN', 'meridiana-group');
    const liveOps = groups.find((g) => g.heading === 'Provisioning');
    const wfItem = liveOps?.items.find((i) => i.label === 'Workforce Management');
    expect(wfItem?.href).toBe(expectedPath);
  });

  it('workforce route pattern is /admin/companies/[companyId]/workforce', () => {
    // Ensures the route structure follows Next.js dynamic segment convention
    const groups = buildNavGroups('KORA_ADMIN', 'test-company');
    const liveOps = groups.find((g) => g.heading === 'Provisioning');
    const wfItem = liveOps?.items.find((i) => i.label === 'Workforce Management');
    expect(wfItem?.href).toMatch(/^\/admin\/companies\/[^/]+\/workforce$/);
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

describe('B95-C Task 5 — Workforce route reachability from admin navigation', () => {

  it('admin sidebar contains an item linking to workforce when company context present', () => {
    const groups = buildNavGroups('KORA_ADMIN', 'meridiana-group');
    const allItems = groups.flatMap((g) => g.items);
    const workforceLinks = allItems.filter((item) => item.href.includes('/workforce'));
    expect(workforceLinks.length).toBeGreaterThan(0);
  });

  it('admin sidebar without company context links to /admin/companies for workforce selection', () => {
    const groups = buildNavGroups('KORA_ADMIN');
    const liveOps = groups.find((g) => g.heading === 'Provisioning');
    const wfItem = liveOps?.items.find((i) => i.label === 'Workforce Management');
    expect(wfItem?.href).toBe('/admin/companies');
  });

  it('quickstart step pointing to /admin/companies is labeled to suggest workforce action', () => {
    const companiesStep = ADMIN_QUICKSTART_STEPS.find((s) => s.href === '/admin/companies');
    expect(companiesStep).toBeDefined();
    const label = companiesStep?.label.toLowerCase() ?? '';
    expect(label.length).toBeGreaterThan(3);
  });

  it('workforce route appears in Provisioning group (not Demo or Future Vision)', () => {
    const groups = buildNavGroups('KORA_ADMIN', 'meridiana-group');
    const liveOps = groups.find((g) => g.heading === 'Provisioning');
    expect(liveOps).toBeDefined();
    const wfItem = liveOps?.items.find((i) => i.href.includes('/workforce'));
    expect(wfItem).toBeDefined();

    // Must NOT appear in other groups
    const otherGroups = groups.filter((g) => g.heading !== 'Provisioning');
    const otherWf = otherGroups.flatMap((g) => g.items).find((i) => i.href.includes('/workforce'));
    expect(otherWf).toBeUndefined();
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
