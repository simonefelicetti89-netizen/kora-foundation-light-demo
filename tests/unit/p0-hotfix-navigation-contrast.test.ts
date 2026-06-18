// tests/unit/p0-hotfix-navigation-contrast.test.ts
// P0 Hotfix — smoke tests for critical UI/navigation breakages.
// Verifies: contrast fix, workforce resolution, Commons sidebar, nav style rules.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { buildNavGroups } from '../../components/layout/Sidebar';
import { tenantService } from '../../services/tenant/TenantService';
import { commonsService } from '../../services/commons/CommonsService';

const ROOT = join(process.cwd());

function readFile(rel: string): string {
  return readFileSync(join(ROOT, rel), 'utf-8');
}

// ── Task 1+2: /company/status contrast ───────────────────────────────────────

describe('/company/status — contrast fix', () => {
  const statusPage = readFile('app/company/status/page.tsx');
  const pipelineStatus = readFile('components/company/status/CompanyPipelineStatus.tsx');
  const templateLibrary = readFile('components/company/submissions/TemplateLibrary.tsx');
  const feedbackPanel = readFile('components/company/transparency/SubmissionFeedbackPanel.tsx');

  it('status page has no white rgba text colors', () => {
    // Only rgba(6,3,43,...) dark colors should appear now
    const whiteTextMatches = statusPage.match(/rgba\(255,255,255,(?:0\.[3-9]|1)/g);
    expect(whiteTextMatches).toBeNull();
  });

  it('status page uses dark text pattern rgba(6,3,43,...)', () => {
    expect(statusPage).toContain('rgba(6,3,43,');
  });

  it('CompanyPipelineStatus has no white rgba text on high alpha', () => {
    const whiteTextMatches = pipelineStatus.match(/rgba\(255,255,255,(?:0\.[5-9]|1)/g);
    expect(whiteTextMatches).toBeNull();
  });

  it('TemplateLibrary has no white rgba text', () => {
    const whiteTextMatches = templateLibrary.match(/rgba\(255,255,255,(?:0\.[3-9]|1)/g);
    expect(whiteTextMatches).toBeNull();
  });

  it('SubmissionFeedbackPanel COL.heading uses dark color', () => {
    expect(feedbackPanel).toContain("heading:   'rgba(6,3,43,");
  });

  it('SubmissionFeedbackPanel COL.body uses dark color', () => {
    expect(feedbackPanel).toContain("body:      'rgba(6,3,43,");
  });

  it('SubmissionFeedbackPanel COL.muted uses dark color', () => {
    expect(feedbackPanel).toContain("muted:     'rgba(6,3,43,");
  });

  it('functional green and blue colors are preserved in live status page', () => {
    expect(statusPage).toContain('#22c55e');
    expect(statusPage).toContain('rgba(74,127,224,');
  });

  it('B171 — app/demo/company/status/page.tsx rimossa (RIDONDANTE, #C76F3D con essa)', () => {
    const { existsSync } = require('fs');
    const { join } = require('path');
    expect(existsSync(join(process.cwd(), 'app/demo/company/status/page.tsx'))).toBe(false);
  });
});

// ── Task 3+4: Workforce resolution ───────────────────────────────────────────

describe('Workforce resolution', () => {
  it('tenantService resolves meridiana-group by company_id', () => {
    const tenant = tenantService.getTenant('meridiana-group');
    expect(tenant).not.toBeNull();
    expect(tenant?.company_id).toBe('meridiana-group');
  });

  it('tenantService resolves tenant-meridiana-001 by tenant_id', () => {
    const tenant = tenantService.getTenantByTenantId('tenant-meridiana-001');
    expect(tenant).not.toBeNull();
    expect(tenant?.company_id).toBe('meridiana-group');
  });

  it('tenantService.getTenants() returns at least one tenant', () => {
    expect(tenantService.getTenants().length).toBeGreaterThan(0);
  });

  it('workforce page has multi-field resolution logic', () => {
    const workforcePage = readFile('app/admin/companies/[companyId]/workforce/page.tsx');
    expect(workforcePage).toContain('getTenantByTenantId');
    expect(workforcePage).toContain('meridiana-group');
  });

  it('workforce not-found shows company selector, not dead screen', () => {
    const workforcePage = readFile('app/admin/companies/[companyId]/workforce/page.tsx');
    expect(workforcePage).toContain('getTenants()');
    expect(workforcePage).toContain('Aziende disponibili nel portfolio demo');
    expect(workforcePage).toContain('Gestisci →');
  });
});

// ── Task 5+6: Commons sidebar — clickable, not disabled ──────────────────────

describe('Sidebar — KORA Commons nav item', () => {
  it('COMPANY_ADMIN nav has KORA Commons as real route /company/commons (B128 — no preview flag)', () => {
    const groups = buildNavGroups('COMPANY_ADMIN');
    const allItems = groups.flatMap((g) => g.items);
    const commons = allItems.find((i) => i.href === '/company/commons');
    expect(commons).toBeDefined();
    expect(commons?.comingSoon).toBeUndefined();
    expect(commons?.inactive).toBeUndefined();
  });

  it('WORKER nav has KORA Commons as real route /worker/commons (B128 — no preview flag)', () => {
    const groups = buildNavGroups('WORKER');
    const allItems = groups.flatMap((g) => g.items);
    const commons = allItems.find((i) => i.href === '/worker/commons');
    expect(commons).toBeDefined();
    expect(commons?.comingSoon).toBeUndefined();
  });

  it('KORA_ADMIN nav has KORA Commons in Demo Lab group (B169 — SYNTHETIC group badge replaces preview flag)', () => {
    const groups = buildNavGroups('KORA_ADMIN');
    const demoLabGroup = groups.find((g) => g.heading === 'Demo Lab');
    expect(demoLabGroup).toBeDefined();
    const commons = demoLabGroup?.items.find((i) => i.href === '/commons');
    expect(commons).toBeDefined();
    expect(commons?.comingSoon).toBeUndefined();
    // preview flag replaced by group-level SYNTHETIC badge in B169 FASE 3
    expect(demoLabGroup?.groupBadge).toBe('SYNTHETIC');
  });

  it('WORKER Prenotazioni and Collettivo remain comingSoon (correctly disabled)', () => {
    const groups = buildNavGroups('WORKER');
    const allItems = groups.flatMap((g) => g.items);
    const bookings = allItems.find((i) => i.href === '/my-kora/bookings');
    const collective = allItems.find((i) => i.href === '/my-kora/collective');
    expect(bookings?.comingSoon).toBe(true);
    expect(collective?.comingSoon).toBe(true);
  });
});

// ── Task 6: Nav style rule — Future Vision stays inactive, PREVIEW clickable ──

describe('Nav style rule — FUTURE_VISION vs PREVIEW', () => {
  it('Future Vision item uses inactive flag (not comingSoon, not preview)', () => {
    for (const role of ['COMPANY_ADMIN', 'WORKER', 'PARTNER', 'ADVISOR']) {
      const groups = buildNavGroups(role);
      const allItems = groups.flatMap((g) => g.items);
      const fv = allItems.find((i) => i.href === '/future-vision');
      if (fv) {
        expect(fv.inactive).toBe(true);
        expect(fv.preview).toBeUndefined();
        expect(fv.comingSoon).toBeUndefined();
      }
    }
  });

  it('KORA Commons preview flag does not appear in isDisabled set', () => {
    // preview items should NOT have inactive or comingSoon set
    const groups = buildNavGroups('COMPANY_ADMIN');
    const allItems = groups.flatMap((g) => g.items);
    const commons = allItems.find((i) => i.href === '/commons');
    expect(commons?.inactive).toBeUndefined();
    expect(commons?.comingSoon).toBeUndefined();
  });

  it('Sidebar renders preview badge for /commons, not comingSoon badge', () => {
    const sidebarSource = readFile('components/layout/Sidebar.tsx');
    // preview badge uses KORA orange (rgba(199,111,61,...))
    expect(sidebarSource).toContain("item.preview && (");
    // preview items should NOT be in isDisabled
    expect(sidebarSource).toContain('isDisabled = item.comingSoon || item.inactive');
    // preview flag in NavItem interface
    expect(sidebarSource).toContain('preview?:     boolean');
  });
});

// ── CommonsService smoke tests ────────────────────────────────────────────────

describe('/commons route — CommonsService functional', () => {
  it('commonsService.getInitiatives() returns data', () => {
    const all = commonsService.getInitiatives();
    expect(all.length).toBeGreaterThan(0);
  });

  it('commonsService.getFeaturedInitiatives() returns data', () => {
    const featured = commonsService.getFeaturedInitiatives();
    expect(featured.length).toBeGreaterThan(0);
  });

  it('commonsService.getNetworkStats() returns valid object', () => {
    const stats = commonsService.getNetworkStats();
    expect(stats.total_initiatives).toBeGreaterThan(0);
    expect(stats.synthetic_demo_data).toBe(true);
  });

  it('/commons page file exists and imports commonsService', () => {
    const commonsPage = readFile('app/commons/page.tsx');
    expect(commonsPage).toContain('commonsService');
  });
});
