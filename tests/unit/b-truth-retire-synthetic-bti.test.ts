/**
 * B-TRUTH — Retire Orphan Synthetic BTI Chain (2026-08-31).
 *
 * Locks in the retirement of services/budget-to-human-impact/BudgetToHumanImpactService.ts,
 * identified by the runtime synthetic-chain inventory (see the "B-TRUTH —
 * RUNTIME SYNTHETIC CHAIN REPORT" this branch was cut from) as fully orphaned:
 *
 *   - Its 3 textual callers — DynamicScoringPreviewService, ReportGeneratorService,
 *     CompanyIntelligenceService — were each independently confirmed to have
 *     zero reachable callers from any app/ entry point (ReportGeneratorService
 *     and CompanyIntelligenceService were already established as orphaned in
 *     prior B-TRUTH work this same week; DynamicScoringPreviewService's only
 *     caller is the orphaned ReportGeneratorService).
 *   - The real, live BTI path already exists and is independently verified:
 *     analytics.bti_result, read directly by app/api/admin/company-workspace/route.ts.
 *   - Master Plan §32's own condition for retiring a synthetic path — "once
 *     its live migration is complete and verified" — was already satisfied.
 *
 * One additional reference was found and handled that the original inventory
 * had not surfaced: components/kora-index/EconomicReliefPanel.tsx held a
 * type-only import of EconomicReliefSummary. That type was copied locally
 * into the component (a plain data shape, no behavior) rather than relocated
 * elsewhere — the component itself remains orphaned and untouched otherwise.
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

describe('B-TRUTH — BudgetToHumanImpactService no longer exists', () => {
  it('the service file is gone', () => {
    expect(existsSync(resolve(root, 'services/budget-to-human-impact/BudgetToHumanImpactService.ts'))).toBe(false);
  });

  it('its sole synthetic data file is gone (zero remaining consumers, proven before deletion)', () => {
    expect(existsSync(resolve(root, 'data/synthetic/budget-to-human-impact.json'))).toBe(false);
  });

  it('no runtime file (app/services/lib/components) imports or calls it — the retired import cannot silently return', () => {
    const offenders: string[] = [];
    for (const dir of RUNTIME_DIRS) {
      for (const file of walkTs(resolve(root, dir))) {
        const relative = file.replace(root + '/', '');
        const content = read(relative);
        if (
          /budgetToHumanImpactService\s*\./.test(content) ||
          /from\s*['"][^'"]*budget-to-human-impact\/BudgetToHumanImpactService['"]/.test(content) ||
          /new\s+BudgetToHumanImpactService\s*\(/.test(content)
        ) {
          offenders.push(relative);
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});

describe('B-TRUTH — the 3 confirmed consumers were trimmed, not redesigned', () => {
  it('DynamicScoringPreviewService still uses ScoringSimulatorService for its BTI macroblock fallback (untouched adjacent logic)', () => {
    const src = read('services/dynamic-scoring/DynamicScoringPreviewService.ts');
    expect(src).toContain("canonicalMacroblocks.find((m) => m.code === 'BTI')?.score ?? 0");
    expect(src).not.toContain('budgetToHumanImpactService');
  });

  it('ReportGeneratorService keeps its BTI section behavior null-safe (already-existing null-handling, not new logic)', () => {
    const src = read('services/report-generator/ReportGeneratorService.ts');
    expect(src).toContain('const btiRecord: BudgetToHumanImpactRecord | null = null;');
    expect(src).toContain('const btiRecs: BudgetToHumanImpactRecommendation[] = [];');
    expect(src).not.toContain('budgetToHumanImpactService');
    // Types still come from the pre-existing shared location, unaffected by this retirement.
    expect(src).toContain("BudgetToHumanImpactRecord,\n  BudgetToHumanImpactRecommendation,\n} from '@/lib/types'");
  });

  // CompanyIntelligenceService was the 3rd of these 3 confirmed consumers —
  // this describe block originally proved its BTI-specific dependency was
  // trimmed without touching the rest of the file. CC-020A (2026-08-31)
  // later retired the entire file for an unrelated, explicit founder
  // decision (no future canonical role for the orphaned aggregator itself).
  // See tests/unit/cc020a-retire-company-intelligence.test.ts.
  it('CompanyIntelligenceService.ts no longer exists (retired by CC-020A, unrelated to this BTI slice)', () => {
    expect(existsSync(resolve(root, 'services/company-intelligence/CompanyIntelligenceService.ts'))).toBe(false);
  });

  it('the other 2 consumers had their ScoringSimulatorService dependency untouched', () => {
    for (const file of [
      'services/dynamic-scoring/DynamicScoringPreviewService.ts',
      'services/report-generator/ReportGeneratorService.ts',
    ]) {
      expect(read(file)).toContain('scoringSimulatorService');
    }
  });

  it('the other 2 consumers were not deleted — only the BTI-specific dependency was removed', () => {
    for (const file of [
      'services/dynamic-scoring/DynamicScoringPreviewService.ts',
      'services/report-generator/ReportGeneratorService.ts',
    ]) {
      expect(existsSync(resolve(root, file))).toBe(true);
    }
  });
});

describe('B-TRUTH — EconomicReliefPanel.tsx (previously-unlisted reference) fixed without redesign', () => {
  it('no longer imports from the retired service', () => {
    const src = read('components/kora-index/EconomicReliefPanel.tsx');
    expect(src).not.toContain('budget-to-human-impact/BudgetToHumanImpactService');
  });

  it('defines the same EconomicReliefSummary shape locally, unchanged fields', () => {
    const src = read('components/kora-index/EconomicReliefPanel.tsx');
    expect(src).toContain('interface EconomicReliefSummary');
    for (const field of [
      'economic_relief_spend', 'economic_relief_share', 'deep_activation_spend',
      'deep_activation_share', 'total_used_budget', 'currency', 'interpretation_it',
    ]) {
      expect(src).toContain(field);
    }
  });

  it('the component itself is unchanged otherwise — still orphaned, not touched beyond the type relocation', () => {
    // Excludes lib/architecture/registry.ts — a documentation/tracking
    // artifact whose own prose notes mention this component's path; not a
    // real import or render call.
    const callers: string[] = [];
    for (const dir of RUNTIME_DIRS) {
      for (const file of walkTs(resolve(root, dir))) {
        const relative = file.replace(root + '/', '');
        if (relative === 'components/kora-index/EconomicReliefPanel.tsx') continue;
        if (relative === 'lib/architecture/registry.ts') continue;
        if (/<EconomicReliefPanel\b|import\s*\{[^}]*\bEconomicReliefPanel\b/.test(read(relative))) callers.push(relative);
      }
    }
    expect(callers).toEqual([]);
  });
});

describe('B-TRUTH — registry and allowlist reflect the retirement', () => {
  it('lib/security/synthetic-import-allowlist.ts no longer lists the retired service', () => {
    const allowlist = read('lib/security/synthetic-import-allowlist.ts');
    expect(allowlist).not.toContain("'services/budget-to-human-impact/BudgetToHumanImpactService.ts'");
  });

  it('registry svc.budget-to-human-impact entry reflects RETIRE, not CANONICAL', () => {
    const registry = read('lib/architecture/registry.ts');
    const idx = registry.indexOf("id: 'svc.budget-to-human-impact'");
    expect(idx).toBeGreaterThan(-1);
    const nextIdx = registry.indexOf("{ id:", idx + 10);
    const entry = registry.slice(idx, nextIdx);
    expect(entry).not.toContain("status: 'CANONICAL'");
  });
});
