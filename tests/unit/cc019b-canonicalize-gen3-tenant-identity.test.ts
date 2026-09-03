/**
 * CC-019B — Canonicalize Gen3 Tenant Identity in Shared Company Layout
 * (2026-08-31).
 *
 * Second implementation sub-slice of CC-019 (One Truth Seed Group #2 —
 * TenantService tenant-identity cluster decomposition). CC-019B is a
 * sub-slice label, not a new Master Plan CC number.
 *
 * app/admin/companies/[companyId]/layout.tsx previously resolved
 * company_name via TenantService.getTenant(companyId) — synthetic
 * data/synthetic/tenants.json — while every Gen3 child it wraps
 * (workspace/preview/evidence/submissions) already resolves the same
 * companyId as a real analytics.tenant.tenant_code. That was a mixed-identity
 * bug: real, tenant-scoped body content rendered under a synthetic-sourced
 * header. This slice moves the layout onto the same canonical source and
 * identifier the children already use, with no new resolver abstraction and
 * no change to not-found ownership (each child still calls its own
 * notFound()).
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

const LAYOUT = 'app/admin/companies/[companyId]/layout.tsx';

describe('CC-019B — shared layout no longer imports TenantService', () => {
  it('layout.tsx has no TenantService import', () => {
    const src = read(LAYOUT);
    expect(src).not.toMatch(/from\s*['"][^'"]*TenantService['"]/);
    expect(src).not.toContain('tenantService.getTenant');
  });
});

describe('CC-019B — layout resolves tenant identity from analytics.tenant by tenant_code', () => {
  const src = read(LAYOUT);

  it('queries analytics.tenant', () => {
    expect(src).toContain("schema('analytics').from('tenant')");
  });

  it('looks up by tenant_code, scoped to active tenants', () => {
    expect(src).toContain("eq('tenant_code', companyId)");
    expect(src).toContain("eq('is_active', true)");
  });

  it('selects company_name and propagates it to CompanyTabNav', () => {
    expect(src).toContain("select('company_name')");
    expect(src).toContain('companyName={companyName}');
  });

  it('uses the same canonical query shape as the Gen3 children (no new resolver introduced)', () => {
    for (const child of ['workspace', 'preview', 'evidence', 'submissions']) {
      const childSrc = read(`app/admin/companies/[companyId]/${child}/page.tsx`);
      expect(childSrc).toContain("schema('analytics').from('tenant')");
      expect(childSrc).toContain("eq('tenant_code', companyId)");
    }
  });
});

describe('CC-019B — missing/inactive tenant does not trigger synthetic fallback', () => {
  const src = read(LAYOUT);

  it('falls back to the raw companyId (route param), never a synthetic company_name', () => {
    expect(src).toContain('tenant?.company_name ?? companyId');
    expect(src).not.toMatch(/from\s*['"][^'"]*(TenantService|data\/synthetic)/);
  });

  it('a DB error still throws (unchanged error-handling convention), not a silent synthetic fallback', () => {
    expect(src).toContain('if (error) throw new Error(');
  });

  it('does not introduce its own notFound() call — not-found ownership stays with each child page', () => {
    const navigationImport = src.match(/import\s*\{([^}]*)\}\s*from\s*['"]next\/navigation['"]/);
    expect(navigationImport).not.toBeNull();
    expect(navigationImport![1]).not.toContain('notFound');
    const codeOnly = src.split('\n').filter((line) => !line.trim().startsWith('//')).join('\n');
    expect(codeOnly).not.toContain('notFound()');
  });
});

describe('CC-019A retirement remains intact', () => {
  it('legacy users page still does not exist', () => {
    expect(existsSync(resolve(root, 'app/admin/companies/[companyId]/users/page.tsx'))).toBe(false);
  });

  it('company-users-live remains the canonical replacement', () => {
    expect(existsSync(resolve(root, 'app/admin/company-users-live/page.tsx'))).toBe(true);
  });
});

// The 3 DEMO_RUNTIME consumers documented here as "untouched" — app/admin/
// pipeline/page.tsx, components/admin/WorkforceQuickAccessPanel.tsx, and
// services/report-factory/ReportFactoryService.ts — were accurately
// untouched at the time this test was written. B-TRUTH TenantService
// Canonical Migration (2026-09-04) migrated all three to canonical
// analytics.tenant reads and retired services/tenant/TenantService.ts
// entirely (zero-caller after the migration). See
// tests/unit/b-truth-tenantservice-canonical-migration.test.ts for the
// current regression guard.
describe('CC-019B — TenantService has been fully, independently retired by a later PR (historical note, not a live assertion)', () => {
  it('services/tenant/TenantService.ts no longer exists', () => {
    expect(existsSync(resolve(root, 'services/tenant/TenantService.ts'))).toBe(false);
  });

  it('CompanyIntelligenceService remains retired (CC-020A, unaffected by this later PR)', () => {
    expect(existsSync(resolve(root, 'services/company-intelligence/CompanyIntelligenceService.ts'))).toBe(false);
  });
});
