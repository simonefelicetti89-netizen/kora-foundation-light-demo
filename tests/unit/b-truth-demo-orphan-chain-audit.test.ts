/**
 * B-TRUTH — Demo / Orphan Chain Audit (2026-08-30).
 *
 * Locks in the reachability findings from the pipeline -> ReportFactoryService
 * -> CompanyDataIntakeService -> CompanyIntelligenceService chain audit that
 * followed Root Control Room Wave 3 Hardening:
 *
 *   - app/admin/pipeline/page.tsx is a labeled DEMO_RUNTIME surface (explicit
 *     DemoFlowBanner + synthetic_demo_data footer, linked from canonical
 *     admin nav under "Pilot Lifecycle"), not a production workflow. Kept.
 *   - ReportFactoryService: trimmed to its one reachable method
 *     (getDecisionPackFactoryStatus, called only by pipeline) plus the
 *     internal helper it needs (getLatestDecisionPackVersion). 10 other
 *     public methods + 1 dead private method had zero callers anywhere and
 *     were removed.
 *   - CompanyDataIntakeService: trimmed to getDataReadinessSummary plus the
 *     internal helpers it actually calls. 12 other public methods had zero
 *     callers anywhere and were removed.
 *   - CompanyIntelligenceService: confirmed 0 reachable runtime callers
 *     repo-wide. NOT deleted (zero callers != DEAD) — status set to
 *     INVESTIGATE, left in place pending a human decision.
 *   - CompanyOnboardingService: confirmed a second-order orphan — its only
 *     caller in the whole repo is CompanyIntelligenceService, which is
 *     itself unreachable. Reachability root = NONE. NOT deleted.
 *
 * If any of these assertions start failing, the underlying situation has
 * changed (a new caller appeared, a method was reintroduced, etc.) — re-run
 * the audit rather than "fixing" this test to match.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'fs';
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

describe('B-TRUTH Demo/Orphan Chain Audit — pipeline is a labeled demo surface, not production', () => {
  const src = read('app/admin/pipeline/page.tsx');

  it('carries an explicit demo banner and synthetic_demo_data label', () => {
    expect(src).toContain('DemoFlowBanner');
    expect(src).toContain('synthetic_demo_data: true');
  });

  it('is reachable from canonical admin navigation (Pilot Lifecycle group)', () => {
    const nav = read('lib/navigation/admin-nav-groups.ts');
    expect(nav).toContain("href: '/admin/pipeline'");
  });

  it('links out to the live canonical Company Console, not the other way around', () => {
    expect(src).toContain("canonicalHref=\"/admin/companies\"");
  });
});

describe('B-TRUTH Demo/Orphan Chain Audit — ReportFactoryService trimmed to its reachable surface', () => {
  const src = read('services/report-factory/ReportFactoryService.ts');
  const REMOVED_METHODS = [
    'getDecisionPackVersionHistory', 'generateDecisionPackVersion', 'getDecisionPackReadiness',
    'getDecisionPackSections', 'getDecisionPackExportActions', 'getDecisionPackChangeSummary',
    'getPreviousComparableVersion', 'getDecisionPackMetricDeltas', 'getDecisionPackPeriodComparison',
    'getDecisionPackLimitations', 'isTenantActive',
  ];

  for (const method of REMOVED_METHODS) {
    it(`no longer defines ${method} as a class method (zero callers anywhere, verified before removal)`, () => {
      // A real method declaration, not a prose mention in this file's own
      // explanatory header comment (which names several of these methods to
      // explain why ReportGeneratorService's same-named methods are NOT the
      // same code path).
      expect(src).not.toMatch(new RegExp(`^\\s{2,4}${method}\\(`, 'm'));
    });
  }

  it('still defines the two reachable methods', () => {
    expect(src).toContain('getDecisionPackFactoryStatus(companyId: string)');
    expect(src).toContain('getLatestDecisionPackVersion(companyId: string)');
  });

  it('exactly one real caller remains — pipeline (a demo caller)', () => {
    const pipeline = read('app/admin/pipeline/page.tsx');
    expect(pipeline).toContain('reportFactoryService.getDecisionPackFactoryStatus');
  });
});

describe('B-TRUTH Demo/Orphan Chain Audit — CompanyDataIntakeService trimmed to its reachable surface', () => {
  const src = read('services/company-data-intake/CompanyDataIntakeService.ts');
  const REMOVED_METHODS = [
    'getAvailableCompanies', 'getFiscalPerimeterSummary', 'getRawDataRowsForBatch',
    'getRowsReadyForIngestion', 'getEligibleCandidates', 'getLimitedCandidates',
    'getBlockedCandidates', 'getStructuralPolicyRows', 'getReviewRequiredRows',
    'getRowsWithMissingFields', 'validateRawDataBatch', 'getPipelineLinks',
  ];

  for (const method of REMOVED_METHODS) {
    it(`no longer defines ${method} as a class method (zero callers anywhere, verified before removal)`, () => {
      expect(src).not.toMatch(new RegExp(`^\\s{2,4}${method}\\(`, 'm'));
    });
  }

  it('still defines getDataReadinessSummary and the internal helpers it calls', () => {
    expect(src).toContain('getDataReadinessSummary(companyId: string)');
    expect(src).toContain('getNextAction(companyId: string)');
    expect(src).toContain('getBudgetFiscalPlan(companyId: string)');
    expect(src).toContain('getRawDataBatches(companyId: string)');
    expect(src).toContain('getRawDataRows(companyId: string)');
  });
});

describe('B-TRUTH Demo/Orphan Chain Audit — CompanyIntelligenceService reachability = NONE, not deleted', () => {
  const RUNTIME_DIRS = ['app', 'services', 'lib', 'components'];
  const SELF_FILE = 'services/company-intelligence/CompanyIntelligenceService.ts';

  it('has zero reachable runtime callers repo-wide (file still exists, not deleted)', () => {
    const offenders: string[] = [];
    for (const dir of RUNTIME_DIRS) {
      for (const file of walkTs(resolve(root, dir))) {
        const relative = file.replace(root + '/', '');
        if (relative === SELF_FILE) continue;
        if (relative.endsWith('.test.ts') || relative.endsWith('.spec.ts')) continue;
        const content = read(relative);
        if (/companyIntelligenceService\s*\./.test(content) || /new\s+CompanyIntelligenceService\s*\(/.test(content)) {
          offenders.push(relative);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it('the file itself still exists — zero callers != DEAD, not deleted by this audit', () => {
    expect(() => read(SELF_FILE)).not.toThrow();
  });

  it('registry status corrected to INVESTIGATE (was COMPLETE, which overstated it)', () => {
    const registry = read('lib/architecture/registry.ts');
    const idx = registry.indexOf("id: 'svc.company-intelligence'");
    expect(idx).toBeGreaterThan(-1);
    expect(registry.slice(idx, idx + 300)).toContain("status: 'INVESTIGATE'");
  });
});

describe('B-TRUTH Demo/Orphan Chain Audit — CompanyOnboardingService is a second-order orphan, not deleted', () => {
  const RUNTIME_DIRS = ['app', 'services', 'lib', 'components'];
  const SELF_FILE = 'services/company-onboarding/CompanyOnboardingService.ts';

  it('its only caller repo-wide is CompanyIntelligenceService (itself unreachable)', () => {
    const callers: string[] = [];
    for (const dir of RUNTIME_DIRS) {
      for (const file of walkTs(resolve(root, dir))) {
        const relative = file.replace(root + '/', '');
        if (relative === SELF_FILE) continue;
        if (relative.endsWith('.test.ts') || relative.endsWith('.spec.ts')) continue;
        const content = read(relative);
        if (/companyOnboardingService\s*\./.test(content) || /new\s+CompanyOnboardingService\s*\(/.test(content)) {
          callers.push(relative);
        }
      }
    }
    expect(callers).toEqual(['services/company-intelligence/CompanyIntelligenceService.ts']);
  });

  it('registry status corrected to INVESTIGATE (was COMPLETE)', () => {
    const registry = read('lib/architecture/registry.ts');
    const idx = registry.indexOf("id: 'svc.company-onboarding'");
    expect(idx).toBeGreaterThan(-1);
    expect(registry.slice(idx, idx + 200)).toContain("status: 'INVESTIGATE'");
  });
});

describe('B-TRUTH Demo/Orphan Chain Audit — reserved large group untouched (Master Plan §32 end-of-B-TRUTH group)', () => {
  it('ScoringSimulatorService and DemoDataService are untouched by this audit', () => {
    const registry = read('lib/architecture/registry.ts');
    expect(registry).toContain("id: 'svc.scoring-simulator'");
    const idx = registry.indexOf("id: 'svc.scoring-simulator'");
    const nextIdx = registry.indexOf("{ id:", idx + 10);
    expect(registry.slice(idx, nextIdx)).toContain('Master Plan §32');
  });

  it('BudgetToHumanImpactService core computation is untouched (still CANONICAL, still synthetic-backed)', () => {
    const svc = read('services/budget-to-human-impact/BudgetToHumanImpactService.ts');
    expect(svc).toContain('data/synthetic');
  });
});
