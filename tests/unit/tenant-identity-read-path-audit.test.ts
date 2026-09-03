/**
 * B-TRUTH — Tenant Identity Consolidation, Phase 1 (Read Path) audit lock.
 *
 * ORIGINAL Phase 1 finding (still true for TenantService.ts itself): the
 * service is 100% synthetic, its mutation methods are pure demo stubs, and
 * analytics.tenant has no lifecycle state machine to migrate them onto.
 *
 * UPDATED by the B-TRUTH Admin Route Convergence audit + Gen 3 route
 * identity activation: app/admin/companies/[companyId]/* is NOT uniformly
 * synthetic. Four routes (workspace, preview, evidence, submissions — the
 * "Gen 3" B168.5/B171 consolidation target) were already fully DB-backed
 * except for a stale existence-gate call into TenantService; that gate has
 * now been replaced with a real analytics.tenant lookup by tenant_code, so
 * these four routes have ZERO TenantService dependency. The remaining five
 * pages (root page.tsx, onboarding, data-intake, users, workforce — "Gen
 * 0/1") plus ReportFactoryService/CompanyIntelligenceService plus the
 * hardcoded DEMO_COMPANY_ID caller (app/admin/pipeline/page.tsx) remain
 * fully entangled and unmigrated — that part of the original finding stands.
 *
 * If any of these assertions start failing, it means the underlying
 * situation has changed (a new caller appeared, a caller moved out of the
 * entangled tree, a canonical route disappeared, etc.) — re-run the audit
 * rather than "fixing" this test to match.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const root = resolve(process.cwd());
function read(relPath: string): string {
  return readFileSync(resolve(root, relPath), 'utf-8');
}

// The two describe blocks that used to live here ('TenantService remains
// synthetic (Phase 1 not implemented)' and 'mutation methods remain pure
// demo stubs (Phase 2 not authorized)') documented services/tenant/
// TenantService.ts's own synthetic implementation — accurately, at the
// time. B-TRUTH TenantService Canonical Migration (2026-09-04) retired that
// file entirely (zero-caller after its 3 real callers — app/admin/pipeline,
// WorkforceQuickAccessPanel, ReportFactoryService — were migrated to
// canonical analytics.tenant reads). Its mutation stubs (activateTenant,
// suspendTenant, archiveTenant, restoreTenant, deleteDemoTenant) no longer
// exist anywhere — they were never migrated, only removed alongside the
// rest of the file (no canonical lifecycle state machine existed to migrate
// them onto, per this file's own original finding, still true). See
// tests/unit/b-truth-tenantservice-canonical-migration.test.ts for the
// current regression guard.
describe('B-TRUTH Tenant Identity — TenantService no longer exists (historical note, not a live assertion)', () => {
  it('services/tenant/TenantService.ts is gone', () => {
    expect(existsSync(resolve(root, 'services/tenant/TenantService.ts'))).toBe(false);
  });
});

describe('B-TRUTH Tenant Identity — remaining Gen 0/1 TenantService callers are still entangled', () => {
  // B-TRUTH Gen 0/1 Retirement Wave 1 (2026-08-30): data-intake, onboarding,
  // and workforce were retired outright (deleted — no unique capability
  // beyond real live surfaces).
  // B-TRUTH Root Control Room Wave 3 Hardening (2026-08-30): page.tsx (root
  // Control Room) was ALSO retired — it is now a thin redirect
  // (requireKoraAdmin → redirect to the Gen 3 workspace tab) with no
  // TenantService dependency at all.
  // CC-019A (2026-08-31): users/page.tsx was ALSO retired outright — real,
  // more capable replacement (app/admin/company-users-live) already existed.
  // CC-019B (2026-08-31): layout.tsx's own company_name display call was
  // ALSO canonicalized — it now queries analytics.tenant by tenant_code,
  // same as the Gen3 children, with no TenantService dependency at all. See
  // tests/unit/cc019b-canonicalize-gen3-tenant-identity.test.ts.
  // CC-020A (2026-08-31): CompanyIntelligenceService's pending decision was
  // resolved (founder: RETIRE, no future canonical role) and it was removed
  // entirely — no longer entangled, no longer exists. See
  // tests/unit/cc020a-retire-company-intelligence.test.ts. ReportFactoryService
  // was the other entangled caller at the time this test was written —
  // B-TRUTH TenantService Canonical Migration (2026-09-04) migrated its
  // tenant-lookup dependency to a canonical CanonicalTenantStatus parameter
  // supplied by its one real caller (app/admin/pipeline), removing the
  // TenantService dependency entirely. See
  // tests/unit/b-truth-tenantservice-canonical-migration.test.ts.
  it('services/company-intelligence/CompanyIntelligenceService.ts no longer exists (CC-020A)', () => {
    expect(existsSync(resolve(root, 'services/company-intelligence/CompanyIntelligenceService.ts'))).toBe(false);
  });

  it('app/admin/companies/[companyId]/page.tsx (root Control Room) no longer calls tenantService — retired to a redirect', () => {
    const code = read('app/admin/companies/[companyId]/page.tsx');
    expect(code).not.toContain('tenantService');
    expect(code).toContain("redirect(`/admin/companies/${companyId}/workspace`)");
  });

  it('app/admin/pipeline/page.tsx now resolves tenant identity via a canonical analytics.tenant lookup, not TenantService (B-TRUTH, 2026-09-04)', () => {
    const code = read('app/admin/pipeline/page.tsx');
    expect(code).toContain("PILOT_LIFECYCLE_TENANT_CODE = 'KORATEST-01'");
    expect(code).toContain(".schema('analytics').from('tenant')");
    expect(code).not.toContain('tenantService');
  });

  it('the retired data-intake, onboarding, and workforce pages no longer exist', () => {
    expect(existsSync(resolve(root, 'app/admin/companies/[companyId]/data-intake/page.tsx'))).toBe(false);
    expect(existsSync(resolve(root, 'app/admin/companies/[companyId]/onboarding/page.tsx'))).toBe(false);
    expect(existsSync(resolve(root, 'app/admin/companies/[companyId]/workforce/page.tsx'))).toBe(false);
  });
});

describe('B-TRUTH Gen 3 route identity activation — workspace/preview/evidence/submissions have zero TenantService dependency', () => {
  const GEN3_ROUTES = [
    'app/admin/companies/[companyId]/workspace/page.tsx',
    'app/admin/companies/[companyId]/preview/page.tsx',
    'app/admin/companies/[companyId]/evidence/page.tsx',
    'app/admin/companies/[companyId]/submissions/page.tsx',
  ];

  for (const route of GEN3_ROUTES) {
    it(`${route} no longer imports or calls TenantService`, () => {
      const code = read(route);
      expect(code).not.toContain("from '@/services/tenant/TenantService'");
      expect(code).not.toContain('tenantService.getTenant');
    });

    it(`${route} resolves companyId as a real analytics.tenant.tenant_code (no synthetic fallback)`, () => {
      const code = read(route);
      expect(code).toContain("getSupabaseServiceClient");
      expect(code).toContain(".schema('analytics').from('tenant')");
      expect(code).toContain(".eq('tenant_code', companyId)");
      expect(code).toContain(".eq('is_active', true)");
      // No hidden fallback to a demo tenant on lookup miss (unlike workforce/page.tsx).
      expect(code).not.toContain("'meridiana-group'");
    });

    it(`${route} still requires KORA Admin auth`, () => {
      const code = read(route);
      expect(code).toContain('requireKoraAdmin');
      expect(code).toContain("redirect('/admin/login')");
    });

    it(`${route} returns an honest not-found for an unknown/synthetic-only tenant_code, never a substituted tenant`, () => {
      const code = read(route);
      expect(code).toContain('notFound()');
    });

    it(`${route} does not silently swallow a DB error as "not found"`, () => {
      const code = read(route);
      expect(code).toContain('throw new Error');
    });
  }

  it('layout.tsx itself is ALSO now canonical (CC-019B) — no TenantService dependency remains', () => {
    const layout = read('app/admin/companies/[companyId]/layout.tsx');
    expect(layout).not.toContain('tenantService');
    expect(layout).toContain("schema('analytics').from('tenant')");
    expect(layout).toContain("eq('tenant_code', companyId)");
  });
});

describe('B-TRUTH Gen 3 route identity activation — CompanyConsolePanel quickActions', () => {
  const code = read('app/api/admin/company-console/route.ts');

  it('viewWorkspace, evidenceArchive, livePreview, submissions now point at the Gen 3 [companyId] tree by tenant_code', () => {
    expect(code).toContain('`/admin/companies/${tcPath}/workspace`');
    expect(code).toContain('`/admin/companies/${tcPath}/evidence`');
    expect(code).toContain('`/admin/companies/${tcPath}/preview`');
    expect(code).toContain('`/admin/companies/${tcPath}/submissions`');
  });

  it('no longer generates links to the five B171-removed flat routes', () => {
    expect(code).not.toContain('/admin/company-workspace?');
    expect(code).not.toContain('/admin/company-evidence-archive?');
    expect(code).not.toContain('/admin/company-live-preview?');
    expect(code).not.toContain('/admin/company-submissions?');
  });

  it('manageUsers is left untouched — its canonical destination is still architecturally unresolved', () => {
    expect(code).toContain("manageUsers:     `/admin/company-users?tenantId=");
  });

  it('dataIntake and uefReview are left untouched — the target pages do not support tenant-code scoping', () => {
    expect(code).toContain("dataIntake:      !ki ? `/admin/data-intake?tenantCode=");
    expect(code).toContain("uefReview:       (uef && uef.pendingReview > 0) ? `/admin/uef-review`");
  });
});

describe('B-TRUTH Tenant Identity — the real canonical analytics.tenant read path already exists, independent of TenantService', () => {
  it('/api/admin/tenants queries analytics.tenant directly, no TenantService import', () => {
    const code = read('app/api/admin/tenants/route.ts');
    expect(code).toContain(".schema('analytics').from('tenant')");
    expect(code).not.toContain('TenantService');
  });

  it('/api/admin/tenants/[id]/promote-to-pilot resolves identity by real tenant.id (uuid), no TenantService import', () => {
    const code = read("app/api/admin/tenants/[id]/promote-to-pilot/route.ts");
    expect(code).toContain(".eq('id', tenantId)");
    expect(code).not.toContain('TenantService');
  });

  it('CompanyConsolePanel fetches the live /api/admin/company-console tenant registry, no TenantService import', () => {
    const code = read('app/admin/companies/_components/CompanyConsolePanel.tsx');
    expect(code).toContain('/api/admin/company-console');
    expect(code).not.toContain('TenantService');
  });

  it('a second, separate live post-provisioning surface also exists at flat query-param routes (company-workspace-live, company-users-live) — NOT a claim that [companyId] itself is non-canonical (workspace/preview/evidence/submissions are, per Gen 3 activation above)', () => {
    expect(existsSync(resolve(root, 'app/admin/company-workspace-live'))).toBe(true);
    expect(existsSync(resolve(root, 'app/admin/company-users-live'))).toBe(true);
    expect(existsSync(resolve(root, 'app/admin/company-workspace'))).toBe(false);
    expect(existsSync(resolve(root, 'app/admin/company-users/page.tsx'))).toBe(false);
  });
});

describe('B-TRUTH Tenant Identity — registry reflects the retirement', () => {
  it('svc.tenant is DEAD (retired 2026-09-04), not CANONICAL/CONSOLIDATE', () => {
    const registry = read('lib/architecture/registry.ts');
    const idx = registry.indexOf("id: 'svc.tenant'");
    expect(idx).toBeGreaterThan(-1);
    const nextIdx = registry.indexOf("{ id:", idx + 10);
    const entry = registry.slice(idx, nextIdx);
    expect(entry).toContain("status: 'DEAD'");
  });
});
