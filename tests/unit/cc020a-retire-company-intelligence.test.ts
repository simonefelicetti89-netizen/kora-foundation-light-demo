/**
 * CC-020A — Retire Orphan CompanyIntelligenceService (2026-08-31, narrowed).
 *
 * SUPERSEDED IN PART (2026-09-01): the "CompanyOnboardingService is a
 * competing implementation of svc.company-setup" framing below (and its
 * data/synthetic/company-onboarding.json seed) was an accurate description
 * of an unresolved question AT THE TIME. The B-TRUTH Company Onboarding
 * Canonicalization task settled it by explicit founder decision: the two
 * services are distinct responsibilities (pre-provisioning wizard vs.
 * post-provisioning readiness/status logic), not competitors. The
 * CompanyIntelligenceService retirement findings below are unaffected and
 * remain the current, correct state.
 *
 * Implementation sub-slice of CC-020 (One Truth Seed Group #3). Not a new
 * Master Plan CC number.
 *
 * Founder decision (final, capability-level, distinct from a first pass that
 * over-reached — see below): CompanyIntelligenceService is retired as an
 * OBSOLETE-CAPABILITY retirement, not a live migration. Its
 * resolveRiskLevel() heuristic has no Master Plan methodology anywhere in
 * the frozen text; no N1-N14/NB capability needs, supersedes, or overlaps
 * it; every live-relevant field it read already has a live source elsewhere
 * (analytics.tenant.onboarding_status/data_readiness_status/decision_pack_status
 * via /api/admin/company-console; analytics.kora_index_result via the Gen3
 * workspace tab; real worker provisioning at /admin/workers). No canonical
 * replacement SERVICE exists for this specific aggregation, and none is
 * claimed — the underlying data simply no longer needs this aggregator.
 *
 * A same-day first pass of this retirement ALSO deleted
 * CompanyOnboardingService.ts, reasoning it was a pure second-order orphan
 * of CompanyIntelligenceService. That was WRONG and has been reverted:
 * CompanyOnboardingService is a Master-Plan-anchored competing
 * implementation of svc.company-setup (registry: `competingWith:
 * ['svc.company-setup']`), and Master Plan §33 keeps company-setup
 * permanently INVESTIGATE by name ("restano INVESTIGATE"). Deleting
 * CompanyOnboardingService would have silently resolved a competing-
 * implementation question the Master Plan has explicitly left open, and
 * left svc.company-setup's own `competingWith` field dangling. It is
 * restored, along with its sole seed file
 * (data/synthetic/company-onboarding.json), and remains INVESTIGATE.
 *
 * CompanyIntelligenceService's other 4 former dependencies — TenantService,
 * CompanyDataIntakeService, WorkerProvisioningService, ScoringSimulatorService
 * — all retain other confirmed callers and were untouched throughout.
 *
 * Net I9 effect of this slice: NONE (CompanyIntelligenceService.ts was
 * never itself an I9 allowlist entry — it had no direct synthetic import).
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

describe('CC-020A — CompanyIntelligenceService is retired', () => {
  it('the service file no longer exists', () => {
    expect(existsSync(resolve(root, 'services/company-intelligence/CompanyIntelligenceService.ts'))).toBe(false);
  });

  it('its now-empty directory no longer exists', () => {
    expect(existsSync(resolve(root, 'services/company-intelligence'))).toBe(false);
  });

  it('no runtime file (app/services/lib/components) references it as real code', () => {
    const offenders: string[] = [];
    for (const dir of RUNTIME_DIRS) {
      for (const file of walkTs(resolve(root, dir))) {
        const relative = file.replace(root + '/', '');
        const content = read(relative);
        if (
          /companyIntelligenceService\s*\./.test(content) ||
          /from\s*['"][^'"]*company-intelligence\/CompanyIntelligenceService['"]/.test(content) ||
          /new\s+CompanyIntelligenceService\s*\(/.test(content)
        ) {
          offenders.push(relative);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it('registry marks it DEAD with an explicit, capability-level decision record', () => {
    const registry = read('lib/architecture/registry.ts');
    const idx = registry.indexOf("id: 'svc.company-intelligence'");
    expect(idx).toBeGreaterThan(-1);
    const nextIdx = registry.indexOf('{ id:', idx + 10);
    const entry = registry.slice(idx, nextIdx);
    expect(entry).toContain("status: 'DEAD'");
    expect(entry).toContain('decisionRef:');
    expect(entry).not.toContain("decisionRef: null");
    expect(entry).toContain('obsolete-capability retirement');
  });
});

describe('CC-020A — CompanyOnboardingService is restored, NOT retired', () => {
  it('the service file exists again', () => {
    expect(existsSync(resolve(root, 'services/company-onboarding/CompanyOnboardingService.ts'))).toBe(true);
  });

  // Its seed file (data/synthetic/company-onboarding.json) and the
  // "competing implementation" framing below were both superseded by the
  // B-TRUTH Company Onboarding Canonicalization (2026-09-01): an explicit
  // founder decision (that task's own prompt) settled CompanySetup and
  // CompanyOnboarding as distinct responsibilities, not competitors, and
  // the service's synthetic import was retired in favor of
  // lib/live/company-onboarding-view.ts. See
  // tests/unit/btruth-company-onboarding-view.test.ts and
  // tests/integration/rls-15-company-onboarding-tenant-kind-parity.test.ts
  // for the current, correct state.

  it('is no longer listed in the I9 synthetic import allowlist — canonicalized, not deleted', () => {
    const allowlist = read('lib/security/synthetic-import-allowlist.ts');
    expect(allowlist).not.toContain("'services/company-onboarding/CompanyOnboardingService.ts'");
  });

  it('registry marks it CANONICAL, not DEAD or INVESTIGATE — synthetic read retired, derived logic preserved', () => {
    const registry = read('lib/architecture/registry.ts');
    const idx = registry.indexOf("id: 'svc.company-onboarding'");
    expect(idx).toBeGreaterThan(-1);
    const nextIdx = registry.indexOf('{ id:', idx + 10);
    const entry = registry.slice(idx, nextIdx);
    expect(entry).toContain("status: 'CANONICAL'");
    expect(entry).not.toContain("status: 'DEAD'");
  });

  it('the CompanySetup/CompanyOnboarding competing claim is corrected in both directions — distinct responsibilities, not competitors', () => {
    const registry = read('lib/architecture/registry.ts');
    const onboardingIdx = registry.indexOf("id: 'svc.company-onboarding'");
    const onboardingEnd = registry.indexOf('{ id:', onboardingIdx + 10);
    expect(registry.slice(onboardingIdx, onboardingEnd)).toContain('competingWith: []');

    const setupIdx = registry.indexOf("id: 'svc.company-setup'");
    const setupEnd = registry.indexOf('{ id:', setupIdx + 10);
    expect(registry.slice(setupIdx, setupEnd)).toContain('competingWith: []');
    // CompanySetup's own status (Master Plan §33 INVESTIGATE) is a separate
    // axis from the competing-implementation claim and is untouched by this
    // correction.
    expect(registry.slice(setupIdx, setupEnd)).toContain("status: 'INVESTIGATE'");
  });
});

describe('CC-020A — no canonical Gen3 surface ever depended on either service', () => {
  it('none of the 4 Gen3 drill-in pages reference either service', () => {
    for (const child of ['workspace', 'preview', 'evidence', 'submissions']) {
      const src = read(`app/admin/companies/[companyId]/${child}/page.tsx`);
      expect(src).not.toContain('CompanyIntelligenceService');
      expect(src).not.toContain('CompanyOnboardingService');
    }
  });

  it('the shared layout (CC-019B canonicalized) does not reference either service', () => {
    const src = read('app/admin/companies/[companyId]/layout.tsx');
    expect(src).not.toContain('CompanyIntelligenceService');
    expect(src).not.toContain('CompanyOnboardingService');
  });
});

describe("CC-020A — CompanyIntelligenceService's other 4 former dependencies were left untouched", () => {
  it('TenantService.ts still exists with its other callers intact', () => {
    expect(existsSync(resolve(root, 'services/tenant/TenantService.ts'))).toBe(true);
    // app/admin/companies/workforce-baseline/page.tsx is NOT listed here —
    // B-TRUTH's first canonical seed group (2026-09-01) migrated it off
    // tenantService entirely. See lib/architecture/registry.ts
    // svc.workforce-baseline.
    for (const file of [
      'app/admin/pipeline/page.tsx',
      'components/admin/WorkforceQuickAccessPanel.tsx',
      'services/report-factory/ReportFactoryService.ts',
    ]) {
      expect(read(file)).toContain('tenantService');
    }
  });

  it('CompanyDataIntakeService.ts still exists with its other callers intact', () => {
    expect(existsSync(resolve(root, 'services/company-data-intake/CompanyDataIntakeService.ts'))).toBe(true);
    for (const file of ['app/admin/pipeline/page.tsx', 'services/report-factory/ReportFactoryService.ts']) {
      expect(read(file)).toContain('companyDataIntakeService');
    }
  });

  it('WorkerProvisioningService.ts still exists with its other callers intact', () => {
    expect(existsSync(resolve(root, 'services/worker-provisioning/WorkerProvisioningService.ts'))).toBe(true);
    for (const file of ['app/admin/pipeline/page.tsx', 'components/admin/WorkforceQuickAccessPanel.tsx']) {
      expect(read(file)).toContain('workerProvisioningService');
    }
  });

  it('ScoringSimulatorService.ts is untouched (reserved end-of-B-TRUTH group, not part of this slice)', () => {
    expect(existsSync(resolve(root, 'services/scoring-simulator/ScoringSimulatorService.ts'))).toBe(true);
  });
});
