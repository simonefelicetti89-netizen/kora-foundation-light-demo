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

describe('B-TRUTH Tenant Identity — TenantService remains synthetic (Phase 1 not implemented)', () => {
  const svc = read('services/tenant/TenantService.ts');

  it('still imports data/synthetic/tenants.json (unmigrated, as decided)', () => {
    expect(svc).toMatch(/^\s*import\s+.+\s+from\s+['"][^'"]*\/data\/synthetic\/tenants\.json['"]/m);
  });

  it('is still listed in the I9 synthetic import allowlist', async () => {
    const { SYNTHETIC_IMPORT_ALLOWLIST } = await import('@/lib/security/synthetic-import-allowlist');
    expect(SYNTHETIC_IMPORT_ALLOWLIST.some((e) => e.file === 'services/tenant/TenantService.ts')).toBe(true);
  });

  it('contains zero Supabase/DB calls anywhere (reads are 100% synthetic today)', () => {
    expect(svc).not.toContain('supabase');
    expect(svc).not.toContain('getSupabaseServerClient');
    expect(svc).not.toContain('getSupabaseServiceClient');
    expect(svc).not.toContain(".schema('analytics')");
  });
});

describe('B-TRUTH Tenant Identity — mutation methods remain pure demo stubs (Phase 2 not authorized)', () => {
  const svc = read('services/tenant/TenantService.ts');
  const MUTATION_METHODS = ['activateTenant', 'suspendTenant', 'archiveTenant', 'restoreTenant', 'deleteDemoTenant'];

  for (const method of MUTATION_METHODS) {
    it(`${method} is not backed by any real database call`, () => {
      // Isolate the method body: from its declaration to the next method/closing brace.
      const start = svc.indexOf(`${method}(`);
      expect(start, `${method} not found in TenantService.ts`).toBeGreaterThan(-1);
      const body = svc.slice(start, start + 600);
      expect(body).toContain('simulato');
      expect(body).not.toContain('supabase');
      expect(body).not.toContain(".schema('analytics')");
    });
  }

  it('analytics.tenant has no lifecycle state machine column for these actions (only is_active + deleted_at + tenant_kind)', () => {
    const migration = read('supabase/migrations/001_live_v1_foundation.sql');
    expect(migration).toContain('is_active');
    expect(migration).toContain('deleted_at');
    // No canonical target to migrate mutations onto today.
    expect(migration).not.toContain('tenant_status');
  });
});

describe('B-TRUTH Tenant Identity — remaining Gen 0/1 TenantService callers are still entangled', () => {
  // B-TRUTH Gen 0/1 Retirement Wave 1 (2026-08-30): data-intake, onboarding,
  // and workforce were retired outright (deleted — no unique capability
  // beyond real live surfaces).
  // B-TRUTH Root Control Room Wave 3 Hardening (2026-08-30): page.tsx (root
  // Control Room) was ALSO retired — it is now a thin redirect
  // (requireKoraAdmin → redirect to the Gen 3 workspace tab) with no
  // TenantService dependency at all. layout.tsx and users/page.tsx remain —
  // required capabilities (user mutations, still-unresolved lifecycle) still
  // have no canonical replacement. See lib/architecture/registry.ts svc.tenant notes.
  const ENTANGLED_CALLERS = [
    'app/admin/companies/[companyId]/layout.tsx',
    'app/admin/companies/[companyId]/users/page.tsx',
    'services/report-factory/ReportFactoryService.ts',
    'services/company-intelligence/CompanyIntelligenceService.ts',
  ];

  for (const file of ENTANGLED_CALLERS) {
    it(`${file} exists and still calls tenantService`, () => {
      expect(existsSync(resolve(root, file))).toBe(true);
      expect(read(file)).toContain('tenantService');
    });
  }

  it('app/admin/companies/[companyId]/page.tsx (root Control Room) no longer calls tenantService — retired to a redirect', () => {
    const code = read('app/admin/companies/[companyId]/page.tsx');
    expect(code).not.toContain('tenantService');
    expect(code).toContain("redirect(`/admin/companies/${companyId}/workspace`)");
  });

  it('app/admin/pipeline/page.tsx still resolves tenant identity via a hardcoded DEMO_COMPANY_ID, not a real tenant id', () => {
    const code = read('app/admin/pipeline/page.tsx');
    expect(code).toContain("DEMO_COMPANY_ID = 'meridiana-group'");
    expect(code).toContain('tenantService.getTenant(DEMO_COMPANY_ID)');
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

  it('these four routes are removed from the entangled-caller list (moved to Gen 3)', () => {
    const layout = read('app/admin/companies/[companyId]/layout.tsx');
    // layout.tsx itself remains entangled (cosmetic company-name header only) — unchanged in this task.
    expect(layout).toContain('tenantService');
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

describe('B-TRUTH Tenant Identity — registry reflects the corrected status', () => {
  it('svc.tenant is CONSOLIDATE, not CANONICAL', () => {
    const registry = read('lib/architecture/registry.ts');
    const idx = registry.indexOf("id: 'svc.tenant'");
    expect(idx).toBeGreaterThan(-1);
    const entry = registry.slice(idx, idx + 200);
    expect(entry).toContain("status: 'CONSOLIDATE'");
  });
});
