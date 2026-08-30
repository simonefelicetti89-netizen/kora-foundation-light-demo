/**
 * CC-019A — Retire Legacy Company Users Surface (2026-08-31).
 *
 * First implementation sub-slice of CC-019 (One Truth Seed Group #2 —
 * TenantService / legacy [companyId] tenant-identity cluster decomposition).
 * CC-019A is a sub-slice label, not a new Master Plan CC number.
 *
 * Retires app/admin/companies/[companyId]/users/page.tsx — a 100% synthetic,
 * read-only demo account display (TenantService + AccountProvisioningService)
 * whose only "create user" CTA pointed at an already-broken flat route
 * (/admin/company-users, unrelated pre-existing dangling link, untouched
 * here). A real, more capable replacement already existed and was left
 * untouched: app/admin/company-users-live (Supabase-backed
 * /api/admin/company-users — real GET/POST/PATCH, independent of
 * TenantService/AccountProvisioningService).
 *
 * The Users tab was removed from CompanyTabNav rather than relinked:
 * company-users-live is keyed by tenantId (analytics.tenant.id, a UUID),
 * while the tab nav only carries tenant_code (companyId) — bridging the two
 * would require inventing a new resolver, out of scope for this slice.
 *
 * If any of these assertions start failing, the underlying situation has
 * changed — re-run the audit rather than "fixing" this test to match.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const root = resolve(process.cwd());
function read(relPath: string): string {
  return readFileSync(resolve(root, relPath), 'utf-8');
}

describe('CC-019A — legacy page no longer exists', () => {
  it('app/admin/companies/[companyId]/users/page.tsx is gone', () => {
    expect(existsSync(resolve(root, 'app/admin/companies/[companyId]/users/page.tsx'))).toBe(false);
  });

  it('the now-empty users/ directory is gone too', () => {
    expect(existsSync(resolve(root, 'app/admin/companies/[companyId]/users'))).toBe(false);
  });
});

describe('CC-019A — no runtime navigation points at the retired route', () => {
  it('CompanyTabNav no longer defines a Users tab', () => {
    const src = read('app/admin/companies/[companyId]/_components/CompanyTabNav.tsx');
    expect(src).not.toContain("slug: 'users'");
    expect(src).not.toContain("label: 'Users'");
  });

  it('CompanyTabNav still defines the 4 remaining canonical tabs', () => {
    const src = read('app/admin/companies/[companyId]/_components/CompanyTabNav.tsx');
    for (const slug of ['workspace', 'preview', 'submissions', 'evidence']) {
      expect(src).toContain(`slug: '${slug}'`);
    }
  });

  it('admin/pipeline no longer links to the retired route', () => {
    const src = read('app/admin/pipeline/page.tsx');
    expect(src).not.toContain('/users`');
    expect(src).not.toContain("label: 'Utenti Aziendali'");
  });

  it('admin/pipeline keeps its other quick links untouched', () => {
    const src = read('app/admin/pipeline/page.tsx');
    expect(src).toContain("label: 'Worker Provisioning (live)'");
    expect(src).toContain("label: 'Submission Queue'");
    expect(src).toContain("label: 'UEF Review & Scoring'");
  });
});

describe('CC-019A — canonical replacement remains intact, untouched', () => {
  it('app/admin/company-users-live still exists', () => {
    expect(existsSync(resolve(root, 'app/admin/company-users-live/page.tsx'))).toBe(true);
  });

  it('company-users-live is keyed by tenantId (a UUID), read-only per its own header', () => {
    const src = read('app/admin/company-users-live/page.tsx');
    expect(src).toContain('tenantId');
    expect(src).toContain('Read-only');
  });

  it('the backing API (/api/admin/company-users) is untouched and remains independent of TenantService/AccountProvisioningService', () => {
    const src = read('app/api/admin/company-users/route.ts');
    expect(src).not.toContain('TenantService');
    expect(src).not.toContain('AccountProvisioningService');
    expect(src).toContain('getSupabaseServiceClient');
  });
});

describe('CC-019A — the legacy synthetic subsystem was not migrated into the live route', () => {
  it('company-users-live has no real TenantService/AccountProvisioningService import (prose mentions in its own explanatory header comment are not a violation)', () => {
    const page = read('app/admin/company-users-live/page.tsx');
    const panel = read('app/admin/company-users-live/_components/CompanyUsersPanel.tsx');
    const importPattern = /from\s*['"][^'"]*(TenantService|AccountProvisioningService)['"]/;
    for (const src of [page, panel]) {
      expect(src).not.toMatch(importPattern);
    }
  });
});

describe('CC-019A — TenantService and AccountProvisioningService implementations were not touched', () => {
  it('TenantService.ts still exists with its other callers intact', () => {
    expect(existsSync(resolve(root, 'services/tenant/TenantService.ts'))).toBe(true);
    // Other confirmed callers untouched by this slice.
    for (const file of [
      'app/admin/companies/[companyId]/layout.tsx',
      'app/admin/pipeline/page.tsx',
      'app/admin/companies/workforce-baseline/page.tsx',
      'components/admin/WorkforceQuickAccessPanel.tsx',
      'services/report-factory/ReportFactoryService.ts',
      'services/company-intelligence/CompanyIntelligenceService.ts',
    ]) {
      expect(read(file)).toContain('tenantService');
    }
  });

  it('AccountProvisioningService.ts still exists with its other callers intact', () => {
    expect(existsSync(resolve(root, 'services/account/AccountProvisioningService.ts'))).toBe(true);
    for (const file of ['app/admin/pipeline/page.tsx', 'app/my-kora/page.tsx']) {
      expect(read(file)).toContain('accountProvisioningService');
    }
  });
});

describe('CC-019A — CC-019B (layout.tsx company_name resolution) remains untouched', () => {
  it('layout.tsx still calls tenantService.getTenant for company_name — deferred to CC-019B, not this slice', () => {
    const src = read('app/admin/companies/[companyId]/layout.tsx');
    expect(src).toContain("import { tenantService } from '@/services/tenant/TenantService'");
    expect(src).toContain('tenantService.getTenant(companyId)');
  });
});
