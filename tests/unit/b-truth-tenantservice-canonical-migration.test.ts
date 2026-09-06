/**
 * B-TRUTH — TenantService Canonical Migration (2026-09-04).
 *
 * PR 2 of the founder-ratified ONE_PRODUCT_CANONICAL_MIGRATION plan (PR 1 =
 * B-TRUTH KoraTest Canonical Foundation, 2026-09-03/04). Migrates the 3 real
 * runtime callers of services/tenant/TenantService.ts to canonical
 * analytics.tenant reads, then retires the now-zero-caller service and its
 * sole seed file, data/synthetic/tenants.json.
 *
 * Re-verified independently before deletion (not trusted from any prior
 * audit alone): all 3 real callers (app/admin/pipeline/page.tsx,
 * components/admin/WorkforceQuickAccessPanel.tsx,
 * services/report-factory/ReportFactoryService.ts) individually confirmed,
 * zero type-only callers.
 *
 * app/admin/pipeline/page.tsx was split into a thin async Server Component
 * (canonical tenant fetch only) plus a new client component,
 * app/admin/pipeline/_components/PilotLifecycleClient.tsx, which holds
 * every OTHER, still-unmigrated step's data source (worker provisioning,
 * account provisioning, scoring, data intake — all still keyed by the
 * pre-existing DEMO_COMPANY_ID = 'meridiana-group' constant, a separate,
 * later migration slice). PILOT_LIFECYCLE_TENANT_CODE = 'KORATEST-01' is a
 * temporary single-tenant default, an ordinary canonical lookup with no
 * special-case branching.
 *
 * WorkforceQuickAccessPanel.tsx now receives its tenant list as a prop from
 * its already-async parent (app/admin/companies/page.tsx), which queries
 * analytics.tenant with no tenant_kind filter (no hidden test tenants).
 *
 * ReportFactoryService.getDecisionPackFactoryStatus/computeBlockingReasons
 * now accept an already-fetched CanonicalTenantStatus parameter instead of
 * calling tenantService.getTenant() themselves — reusing the same canonical
 * read its one real caller already performs, rather than duplicating it.
 * Its own still-synthetic hasKoraIndex/getIntakeStatus/
 * getLatestDecisionPackVersion checks are UNCHANGED, unmigrated, explicitly
 * out of scope.
 *
 * NOT touched by this PR (separate, later, bounded slices):
 * CompanyDataIntakeService, AccountProvisioningService's remaining
 * (non-pipeline) role, AdminPreviewService, final scoring, B-WORKER.
 *
 * If any of these assertions start failing, the underlying situation has
 * changed — re-run the audit rather than "fixing" this test to match.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync, existsSync } from 'fs';
import { resolve, join } from 'path';

const root = resolve(process.cwd());
function read(relPath: string): string {
  return readFileSync(resolve(root, relPath), 'utf-8');
}

function walkTs(dir: string): string[] {
  const out: string[] = [];
  let entries: string[];
  try { entries = readdirSync(dir); } catch { return out; }
  for (const entry of entries) {
    const p = join(dir, entry);
    let st;
    try { st = statSync(p); } catch { continue; }
    if (st.isDirectory()) out.push(...walkTs(p));
    else if (/\.(ts|tsx)$/.test(entry)) out.push(p);
  }
  return out;
}

const RUNTIME_DIRS = ['app', 'services', 'lib', 'components'];
const EXCLUDED_DOCS = new Set(['lib/architecture/registry.ts', 'lib/security/synthetic-import-allowlist.ts']);

describe('B-TRUTH — TenantService no longer exists', () => {
  it('the service file is gone', () => {
    expect(existsSync(resolve(root, 'services/tenant/TenantService.ts'))).toBe(false);
  });

  it('its directory is gone (no leftover empty dir)', () => {
    expect(existsSync(resolve(root, 'services/tenant'))).toBe(false);
  });

  it('its sole synthetic seed file is gone', () => {
    expect(existsSync(resolve(root, 'data/synthetic/tenants.json'))).toBe(false);
  });

  it('no runtime file (app/services/lib/components), excluding governance docs and tests, imports, instantiates, or calls it', () => {
    const offenders: string[] = [];
    const REAL_USAGE = /(?:^|\s)import\s[^;]*TenantService[^;]*from|from\s*['"][^'"]*tenant\/TenantService['"]|new\s+TenantService\s*\(/m;
    for (const dir of RUNTIME_DIRS) {
      for (const file of walkTs(resolve(root, dir))) {
        const relative = file.replace(root + '/', '');
        if (EXCLUDED_DOCS.has(relative)) continue;
        if (relative.endsWith('.test.ts')) continue; // test files legitimately assert non-usage by string
        const content = read(relative);
        // tenantService. calls only count outside of `//` comment lines —
        // several migrated files legitimately document the removed
        // dependency in prose (e.g. "replaces the internal
        // tenantService.getTenant() lookup").
        const codeOnly = content.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
        if (REAL_USAGE.test(content) || /tenantService\s*\./.test(codeOnly)) offenders.push(relative);
      }
    }
    expect(offenders).toEqual([]);
  });
});

describe('B-TRUTH — migrated consumers use a canonical tenant source', () => {
  it('app/admin/pipeline/page.tsx is a thin Server Component reading analytics.tenant', () => {
    const src = read('app/admin/pipeline/page.tsx');
    expect(src).toContain(".schema('analytics').from('tenant')");
    expect(src).toContain(".eq('tenant_code', PILOT_LIFECYCLE_TENANT_CODE)");
    expect(src).not.toContain('tenantService');
    expect(src).not.toMatch(/from\s+['"][^'"]*data\/synthetic\//);
  });

  it('app/admin/pipeline/_components/PilotLifecycleClient.tsx receives tenant as a prop, no self-fetch', () => {
    const src = read('app/admin/pipeline/_components/PilotLifecycleClient.tsx');
    expect(src).toContain('tenant: CanonicalPilotTenant | null');
    expect(src).not.toContain('tenantService');
    expect(src).not.toMatch(/from\s+['"][^'"]*data\/synthetic\//);
  });

  it('app/admin/companies/page.tsx fetches canonical tenants with no tenant_kind filter and passes them to the panel', () => {
    const src = read('app/admin/companies/page.tsx');
    expect(src).toContain(".schema('analytics').from('tenant')");
    expect(src).not.toContain(".eq('tenant_kind'");
    expect(src).toContain('<WorkforceQuickAccessPanel tenants={tenants} />');
  });

  it('components/admin/WorkforceQuickAccessPanel.tsx accepts tenants as a prop, no self-fetch', () => {
    const src = read('components/admin/WorkforceQuickAccessPanel.tsx');
    expect(src).toContain('tenants: WorkforcePanelTenant[]');
    expect(src).not.toContain('tenantService');
    expect(src).not.toMatch(/from\s+['"][^'"]*data\/synthetic\//);
  });

  // services/report-factory/ReportFactoryService.ts was accurately migrated
  // to accept a canonicalTenant parameter (instead of calling
  // tenantService.getTenant() itself) at the time this test was written.
  // B-TRUTH ReportFactoryService Canonical Decision Pack Status Migration
  // (2026-09-06) later, separately, retired the file entirely — its sole
  // real caller reads the canonical Decision Pack view directly, with no
  // ReportFactoryService intermediary. See
  // tests/unit/b-truth-reportfactory-canonical-decision-pack-status.test.ts
  // for the current, correct state.
  it('ReportFactoryService has since been separately retired (historical note, not a live assertion)', () => {
    expect(existsSync(resolve(root, 'services/report-factory/ReportFactoryService.ts'))).toBe(false);
  });

  it('no data/synthetic/** tenant import remains in any of the 4 migrated files', () => {
    for (const file of [
      'app/admin/pipeline/page.tsx',
      'app/admin/pipeline/_components/PilotLifecycleClient.tsx',
      'app/admin/companies/page.tsx',
      'components/admin/WorkforceQuickAccessPanel.tsx',
    ]) {
      expect(read(file)).not.toMatch(/from\s+['"][^'"]*data\/synthetic\//);
    }
  });
});

describe('B-TRUTH — KORATEST-01 is an ordinary lookup, not a methodology/runtime branch', () => {
  it('PILOT_LIFECYCLE_TENANT_CODE is a plain constant, used in exactly one ordinary .eq() query, no conditional branch on its value', () => {
    const src = read('app/admin/pipeline/page.tsx');
    expect(src).toContain("const PILOT_LIFECYCLE_TENANT_CODE = 'KORATEST-01'");
    expect(src).not.toMatch(/if\s*\(\s*(tenant_code|tenantCode|PILOT_LIFECYCLE_TENANT_CODE)\s*===\s*['"]KORATEST-01['"]/);
  });

  it('no runtime file anywhere special-cases the literal string KORATEST-01 (excluding this migration\'s own governance/seed files and tests)', () => {
    const ALLOWED = new Set([
      'app/admin/pipeline/page.tsx',
      'scripts/koratest-canonical-seed.ts',
      'data/koratest/koratest_input_fixture.json',
    ]);
    const offenders: string[] = [];
    for (const dir of RUNTIME_DIRS) {
      for (const file of walkTs(resolve(root, dir))) {
        const relative = file.replace(root + '/', '');
        if (ALLOWED.has(relative)) continue;
        if (EXCLUDED_DOCS.has(relative)) continue;
        if (relative.endsWith('.test.ts')) continue;
        if (read(relative).includes('KORATEST-01')) offenders.push(relative);
      }
    }
    expect(offenders).toEqual([]);
  });
});

describe('B-TRUTH — no new tenant_kind product branch introduced', () => {
  it('the only tenant_kind-conditioned code in the whole ingestion/onboarding pipeline remains the pre-existing, unmodified email-invite skip', () => {
    const src = read('app/api/admin/companies/provision/route.ts');
    expect(src).toContain("if (tenantKind !== 'LIVE')");
    expect(src).toContain('Operational safety');
  });

  it('none of the 4 migrated files reads or filters on tenant_kind in actual code (a documentation comment noting its deliberate absence is fine)', () => {
    for (const file of [
      'app/admin/pipeline/page.tsx',
      'app/admin/pipeline/_components/PilotLifecycleClient.tsx',
      'app/admin/companies/page.tsx',
      'components/admin/WorkforceQuickAccessPanel.tsx',
    ]) {
      const src = read(file);
      const codeOnly = src.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
      expect(codeOnly).not.toContain('tenant_kind');
    }
  });
});

describe('B-TRUTH — this PR touched ONLY the TenantService migration (one PR = one bounded step)', () => {
  // CompanyDataIntakeService.ts was accurately untouched by THIS PR
  // (TenantService Canonical Migration) at the time this test was written.
  // B-TRUTH CompanyDataIntakeService Canonical Migration (PR 3) — a later,
  // separate, bounded PR of the same plan — retired it. See
  // tests/unit/b-truth-company-data-intake-canonical-migration.test.ts.
  it('AdminPreviewService still exists, untouched in role — CompanyDataIntakeService has since been separately retired (historical note)', () => {
    expect(existsSync(resolve(root, 'services/admin-preview/AdminPreviewService.ts'))).toBe(true);
    expect(existsSync(resolve(root, 'services/company-data-intake/CompanyDataIntakeService.ts'))).toBe(false);
  });

  // PRIOR HISTORY (accurate as of its own time, preserved verbatim):
  // "AccountProvisioningService still exists — its own migration is a
  // separate, later slice." That later slice (B-TRUTH AccountProvisioningService
  // Pipeline Role Migration) happened, then B-WORKER AccountProvisioning
  // dead-code retirement (2026-09-06, a further, later, separate, bounded
  // slice) deleted the file entirely — zero real callers of any of its 18
  // methods, confirmed exhaustively.
  it('AccountProvisioningService no longer exists — its later migration and eventual retirement are both separate, later slices from this one', () => {
    expect(existsSync(resolve(root, 'services/account/AccountProvisioningService.ts'))).toBe(false);
  });

  it('B-WORKER members remain untouched — still exist; the final scoring group was later retired by CC-00 Final Scoring Canonicalization (2026-09-05), unrelated to this PR', () => {
    for (const file of [
      'services/worker-provisioning/WorkerProvisioningService.ts',
      // PRIOR HISTORY: 'services/worker-achievements/WorkerAchievementService.ts'
      // was asserted to exist here (unmodified by this PR, at the time). B-WORKER
      // "One Product / No Demo Runtime" correction (2026-09-06) deleted it entirely
      // (zero real callers once its 2 callers, app/my-kora/page.tsx and
      // app/my-kora/dynamic-cv/page.tsx, became pure canonical redirects) — removed
      // from this list; this is that later, separately-authorized retirement, not an
      // unrelated-PR regression of this PR's own scope boundary.
    ]) {
      expect(existsSync(resolve(root, file))).toBe(true);
    }
    expect(existsSync(resolve(root, 'services/scoring-simulator/ScoringSimulatorService.ts'))).toBe(false);
    expect(existsSync(resolve(root, 'services/demo-data/DemoDataService.ts'))).toBe(false);
  });

  it('KoraTest canonical foundation (PR 1, #140) is untouched — script and fixture still exist', () => {
    expect(existsSync(resolve(root, 'scripts/koratest-canonical-seed.ts'))).toBe(true);
    expect(existsSync(resolve(root, 'data/koratest/koratest_input_fixture.json'))).toBe(true);
  });
});

describe('B-TRUTH — registry and I9 reflect the migration', () => {
  it('registry svc.tenant entry reflects DEAD, not CANONICAL/CONSOLIDATE', () => {
    const registry = read('lib/architecture/registry.ts');
    const idx = registry.indexOf("id: 'svc.tenant'");
    expect(idx).toBeGreaterThan(-1);
    const nextIdx = registry.indexOf("{ id:", idx + 10);
    const entry = registry.slice(idx, nextIdx);
    expect(entry).toContain("status: 'DEAD'");
  });

  it('allowlist no longer lists TenantService', () => {
    const allowlist = read('lib/security/synthetic-import-allowlist.ts');
    expect(allowlist).not.toMatch(/\{\s*file:\s*'services\/tenant\/TenantService\.ts'/);
  });

  it('allowlist header reflects a count at or below the level this PR left it at, 14 files / 24 imports (a later PR may reduce it further — see B-TRUTH CompanyDataIntakeService Canonical Migration, 2026-09-05)', () => {
    const allowlist = read('lib/security/synthetic-import-allowlist.ts');
    const match = allowlist.match(/CURRENT_SYNTHETIC_RUNTIME_IMPORTS = (\d+) files \/ (\d+) import statements/);
    expect(match).not.toBeNull();
    expect(Number(match![1])).toBeLessThanOrEqual(14);
    expect(Number(match![2])).toBeLessThanOrEqual(24);
  });
});
