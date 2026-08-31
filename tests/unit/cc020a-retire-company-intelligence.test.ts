/**
 * CC-020A — Retire Orphan Company Intelligence Chain (2026-08-31).
 *
 * Implementation sub-slice of CC-020 (One Truth Seed Group #3). Not a new
 * Master Plan CC number.
 *
 * Founder decision: CompanyIntelligenceService has no future canonical role
 * in its current form (zero live/runtime reachable consumers, aggregates
 * multiple synthetic/legacy services under an undefined heuristic, no
 * canonical replacement, not required by any Gen3 canonical product
 * surface). Retired outright — not merely left orphaned.
 *
 * As a direct, proven consequence, CompanyOnboardingService became a pure
 * second-order orphan (its only real runtime caller, repo-wide, was
 * CompanyIntelligenceService) and was retired in the same slice, along with
 * its unique seed file (zero other consumers).
 *
 * CompanyIntelligenceService's other 4 dependencies — TenantService,
 * CompanyDataIntakeService, WorkerProvisioningService, ScoringSimulatorService
 * — all retain other confirmed callers and were explicitly left untouched;
 * this slice removes the orphan aggregator, not the legacy graph beneath it.
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
});

describe('CC-020A — CompanyOnboardingService is retired (proven second-order orphan)', () => {
  it('the service file no longer exists', () => {
    expect(existsSync(resolve(root, 'services/company-onboarding/CompanyOnboardingService.ts'))).toBe(false);
  });

  it('its now-empty directory no longer exists', () => {
    expect(existsSync(resolve(root, 'services/company-onboarding'))).toBe(false);
  });

  it('its unique seed file (zero other consumers) is also gone', () => {
    expect(existsSync(resolve(root, 'data/synthetic/company-onboarding.json'))).toBe(false);
  });

  it('no runtime file references it as real code', () => {
    const offenders: string[] = [];
    for (const dir of RUNTIME_DIRS) {
      for (const file of walkTs(resolve(root, dir))) {
        const relative = file.replace(root + '/', '');
        const content = read(relative);
        if (
          /companyOnboardingService\s*\./.test(content) ||
          /from\s*['"][^'"]*company-onboarding\/CompanyOnboardingService['"]/.test(content) ||
          /new\s+CompanyOnboardingService\s*\(/.test(content)
        ) {
          offenders.push(relative);
        }
      }
    }
    expect(offenders).toEqual([]);
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

describe("CC-020A — CompanyIntelligenceService's other 4 dependencies were left untouched (this slice removes the orphan aggregator, not the legacy graph beneath it)", () => {
  it('TenantService.ts still exists with its other callers intact', () => {
    expect(existsSync(resolve(root, 'services/tenant/TenantService.ts'))).toBe(true);
    for (const file of [
      'app/admin/pipeline/page.tsx',
      'app/admin/companies/workforce-baseline/page.tsx',
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

describe('CC-020A — registry and allowlist reflect the retirement', () => {
  it('lib/security/synthetic-import-allowlist.ts no longer lists CompanyOnboardingService', () => {
    const allowlist = read('lib/security/synthetic-import-allowlist.ts');
    expect(allowlist).not.toContain("'services/company-onboarding/CompanyOnboardingService.ts'");
  });

  it('registry svc.company-intelligence and svc.company-onboarding entries reflect DEAD, not INVESTIGATE', () => {
    const registry = read('lib/architecture/registry.ts');
    for (const id of ['svc.company-intelligence', 'svc.company-onboarding']) {
      const idx = registry.indexOf(`id: '${id}'`);
      expect(idx).toBeGreaterThan(-1);
      const nextIdx = registry.indexOf('{ id:', idx + 10);
      const entry = registry.slice(idx, nextIdx);
      expect(entry).toContain("status: 'DEAD'");
      expect(entry).not.toContain("status: 'INVESTIGATE'");
    }
  });
});
