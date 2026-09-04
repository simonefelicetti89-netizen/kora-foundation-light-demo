/**
 * B-TRUTH — FinancialGovernance Retirement (2026-09-02).
 *
 * Locks in the retirement of services/financial-governance/FinancialGovernanceService.ts
 * and its sole seed file, data/synthetic/financial-governance.json.
 *
 * Re-verified independently before deletion (not trusted from the post-#132
 * reachability audit alone): zero real runtime callers, zero type-only
 * callers (its locally-defined types — PillarBudgetLine, BTIIndicators,
 * FinancialGovernanceRecord, FinancialGovernanceResult, BudgetSummary — had
 * zero external importers; a same-named but unrelated PillarBudgetLine
 * already exists independently in lib/types/index.ts, confirmed not the
 * same type and not imported from this file). No unique methodology: the
 * service was a pure synthetic-JSON-to-interface mapper (own fields
 * self-labeled informational_only/no_payment_execution/no_fund_custody),
 * never computing anything. Its BTI-shaped output is a near 1:1 conceptual
 * match for the real, already-canonical BTI Engine output
 * (analytics.bti_result, read directly by lib/decision-pack/pdf-data.ts) —
 * no capability lost, no methodology migrated because none was uniquely
 * owned.
 *
 * The sole prior real-ish caller was ReportGeneratorService, retired
 * separately in B-TRUTH ReportGenerator Retirement (2026-09-02) — this
 * service became fully orphaned as a direct consequence of that retirement,
 * then was independently reconfirmed here before acting on it.
 *
 * NOT touched by this retirement (separate, later, bounded slices):
 * ReportFactoryService, ExplainabilityService, PreviewScoringAdapter,
 * DynamicScoringPreviewService, the Ingestion/UEF legacy chain
 * (IngestionPipelineService, EligibilityGateService, UEFReviewService), the
 * final scoring group, BTI Engine / analytics.bti_result / canonical
 * Decision Pack financial fields (all unchanged).
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

describe('B-TRUTH — FinancialGovernanceService no longer exists', () => {
  it('the service file is gone', () => {
    expect(existsSync(resolve(root, 'services/financial-governance/FinancialGovernanceService.ts'))).toBe(false);
  });

  it('its directory is gone (no leftover empty dir)', () => {
    expect(existsSync(resolve(root, 'services/financial-governance'))).toBe(false);
  });

  it('its sole synthetic seed file is gone (zero other consumers, confirmed before deletion)', () => {
    expect(existsSync(resolve(root, 'data/synthetic/financial-governance.json'))).toBe(false);
  });

  it('no runtime file (app/services/lib/components) imports, instantiates, or calls it — the retired import cannot silently return', () => {
    const offenders: string[] = [];
    for (const dir of RUNTIME_DIRS) {
      for (const file of walkTs(resolve(root, dir))) {
        const relative = file.replace(root + '/', '');
        const content = read(relative);
        if (
          /financialGovernanceService\s*\./.test(content) ||
          /from\s*['"][^'"]*financial-governance\/FinancialGovernanceService['"]/.test(content) ||
          /new\s+FinancialGovernanceService\s*\(/.test(content)
        ) {
          offenders.push(relative);
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});

describe('B-TRUTH — this PR retired ONLY FinancialGovernanceService (one PR = one service)', () => {
  // ReportFactoryService.ts was accurately untouched (still existed) at the
  // time this test was written. B-TRUTH ReportFactoryService Canonical
  // Decision Pack Status Migration (2026-09-06) later, separately, retired
  // it entirely. See
  // tests/unit/b-truth-reportfactory-canonical-decision-pack-status.test.ts
  // for the current, correct state.
  it('ReportFactoryService has since been separately retired (historical note, not a live assertion)', () => {
    expect(existsSync(resolve(root, 'services/report-factory/ReportFactoryService.ts'))).toBe(false);
  });

  it('ExplainabilityService untouched — still exists', () => {
    expect(existsSync(resolve(root, 'services/explainability/ExplainabilityService.ts'))).toBe(true);
  });

  // PreviewScoringAdapter and DynamicScoringPreviewService were in this
  // "untouched by this PR" list originally (accurately, at that time) — they
  // were later, separately retired by B-TRUTH Preview Scoring Retirement
  // (2026-09-03, its own bounded PR). See
  // tests/unit/b-truth-preview-scoring-retirement.test.ts.

  // Every member of the original "Ingestion/UEF legacy chain untouched" list
  // this PR asserted has since been independently, separately retired by its
  // own later bounded PR. See each retirement's own dedicated regression
  // guard (tests/unit/b-truth-uef-review-retirement.test.ts,
  // tests/unit/b-truth-ingestion-pipeline-retirement.test.ts,
  // tests/unit/b-truth-eligibility-gate-retirement.test.ts) for the current
  // scope-boundary proofs.
  it('the Ingestion/UEF legacy chain has been fully, independently retired by later PRs (historical note, not a live assertion)', () => {
    for (const file of [
      'services/eligibility-gate/EligibilityGateService.ts',
      'services/ingestion-pipeline/IngestionPipelineService.ts',
      'services/uef-review/UEFReviewService.ts',
    ]) {
      expect(existsSync(resolve(root, file))).toBe(false);
    }
  });

  it('the final scoring group untouched — still exists', () => {
    for (const file of [
      'services/scoring/DemoScoringAdapter.ts',
      'services/scoring-simulator/ScoringSimulatorService.ts',
      'services/demo-data/DemoDataService.ts',
      'services/access-control/AccessControlService.ts',
    ]) {
      expect(existsSync(resolve(root, file))).toBe(true);
    }
  });

  it('canonical BTI authority untouched — lib/decision-pack/pdf-data.ts still reads analytics.bti_result directly', () => {
    const pdfData = read('lib/decision-pack/pdf-data.ts');
    expect(pdfData).toContain("from('bti_result')");
  });
});

describe('B-TRUTH — registry and I9 reflect the retirement', () => {
  it('registry svc.financial-governance entry reflects DEAD, not COMPLETE', () => {
    const registry = read('lib/architecture/registry.ts');
    const idx = registry.indexOf("id: 'svc.financial-governance'");
    expect(idx).toBeGreaterThan(-1);
    const nextIdx = registry.indexOf("{ id:", idx + 10);
    const entry = registry.slice(idx, nextIdx);
    expect(entry).toContain("status: 'DEAD'");
  });

  it('allowlist no longer lists the retired service', () => {
    const allowlist = read('lib/security/synthetic-import-allowlist.ts');
    expect(allowlist).not.toContain("'services/financial-governance/FinancialGovernanceService.ts'");
  });
});
