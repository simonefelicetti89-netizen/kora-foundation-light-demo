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
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const root = resolve(process.cwd());
function read(relPath: string): string {
  return readFileSync(resolve(root, relPath), 'utf-8');
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

describe('B-TRUTH Demo/Orphan Chain Audit — CompanyIntelligenceService: SUPERSEDED by CC-020A retirement', () => {
  // This describe block originally proved CompanyIntelligenceService had
  // zero reachable runtime callers and was correctly NOT deleted (zero
  // callers != DEAD). CC-020A (2026-08-31) later found the same fact plus an
  // explicit founder decision — "no future canonical role" — and retired it
  // outright. See tests/unit/cc020a-retire-company-intelligence.test.ts for
  // the current, correct state.
  it('the file no longer exists', () => {
    expect(existsSync(resolve(root, 'services/company-intelligence/CompanyIntelligenceService.ts'))).toBe(false);
  });
});

describe('B-TRUTH Demo/Orphan Chain Audit — CompanyOnboardingService: SUPERSEDED, restored, still not deleted', () => {
  // This describe block originally proved CompanyOnboardingService's only
  // caller repo-wide was the unreachable CompanyIntelligenceService, and was
  // correctly NOT deleted pending that service's own fate. CC-020A
  // (2026-08-31) resolved CompanyIntelligenceService's fate (RETIRE) — a
  // first pass then ALSO deleted CompanyOnboardingService as a claimed
  // second-order orphan, which was WRONG and has been reverted:
  // CompanyOnboardingService is a Master-Plan-anchored competing
  // implementation of svc.company-setup (§33 keeps company-setup
  // permanently INVESTIGATE), not disposable on that basis. Restored. It is
  // now a plain zero-caller orphan (its only caller no longer exists), kept
  // deliberately, not migrated or deleted. See
  // tests/unit/cc020a-retire-company-intelligence.test.ts.
  //
  // SUPERSEDED (2026-09-01): the B-TRUTH Company Onboarding
  // Canonicalization task migrated its synthetic read onto analytics.tenant
  // + personal.workforce_baseline and settled the CompanySetup/
  // CompanyOnboarding "competing implementation" question (they are
  // distinct responsibilities, not competitors) — see
  // tests/unit/cc020a-retire-company-intelligence.test.ts and
  // tests/unit/btruth-company-onboarding-view.test.ts for the current state.
  // The file-existence assertion below is still true and unaffected.
  it('the file exists again (restored, not retired)', () => {
    expect(existsSync(resolve(root, 'services/company-onboarding/CompanyOnboardingService.ts'))).toBe(true);
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

  it('BudgetToHumanImpactService — SUPERSEDED same day by the synthetic BTI chain retirement: the file no longer exists', () => {
    // This assertion originally proved the service was left untouched
    // (still CANONICAL, still synthetic-backed) during the Demo/Orphan Chain
    // cleanup. A later same-day audit found its 3 remaining callers
    // (DynamicScoringPreviewService, ReportGeneratorService,
    // CompanyIntelligenceService) were ALL themselves unreachable from any
    // app/ entry point, and the real BTI path (analytics.bti_result, read
    // directly by the Gen 3 workspace API) was already live and verified —
    // satisfying Master Plan §32's own condition for retiring a synthetic
    // path. See tests/unit/b-truth-retire-synthetic-bti.test.ts for the
    // current, correct state.
    expect(existsSync(resolve(root, 'services/budget-to-human-impact/BudgetToHumanImpactService.ts'))).toBe(false);
  });
});
