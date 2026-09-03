/**
 * B-TRUTH — ReportGenerator Retirement (2026-09-02).
 *
 * Locks in the retirement of services/report-generator/ReportGeneratorService.ts,
 * following D-B ratification (CC-005, PR #131): lib/decision-pack/* +
 * lib/live/decision-pack.ts is the sole canonical KORA Decision Pack authority.
 *
 * Re-verified independently before deletion (not trusted from PR #131's audit
 * alone): zero real runtime callers anywhere — no static import, no dynamic
 * import, no barrel re-export, no type-only import of ReportType (its one
 * exported type). Every capability-disposition item from PR #131's audit was
 * re-confirmed: 4 RETIRE, 1 RETIRE-as-assembly, 1 MIGRATE (already complete,
 * proven by tests/unit/cc005-decision-pack-limitations-migration.test.ts),
 * 1 DEFERRED PRODUCT REQUIREMENT (preserved in lib/architecture/registry.ts,
 * not implemented here).
 *
 * NOT touched by this retirement (separate, later, bounded slices):
 * ReportFactoryService, IngestionPipelineService, EligibilityGateService,
 * UEFReviewService, DynamicScoringPreviewService, PreviewScoringAdapter,
 * ExplainabilityService, FinancialGovernanceService, the final scoring group.
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

describe('B-TRUTH — ReportGeneratorService no longer exists', () => {
  it('the service file is gone', () => {
    expect(existsSync(resolve(root, 'services/report-generator/ReportGeneratorService.ts'))).toBe(false);
  });

  it('its directory is gone (no leftover empty dir)', () => {
    expect(existsSync(resolve(root, 'services/report-generator'))).toBe(false);
  });

  it('no runtime file (app/services/lib/components) imports, instantiates, or calls it — the retired import cannot silently return', () => {
    const offenders: string[] = [];
    for (const dir of RUNTIME_DIRS) {
      for (const file of walkTs(resolve(root, dir))) {
        const relative = file.replace(root + '/', '');
        const content = read(relative);
        if (
          /reportGeneratorService\s*\./.test(content) ||
          /from\s*['"][^'"]*report-generator\/ReportGeneratorService['"]/.test(content) ||
          /new\s+ReportGeneratorService\s*\(/.test(content)
        ) {
          offenders.push(relative);
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});

describe('B-TRUTH — this PR retired ONLY ReportGeneratorService (one PR = one service)', () => {
  it('ReportFactoryService untouched — still exists', () => {
    expect(existsSync(resolve(root, 'services/report-factory/ReportFactoryService.ts'))).toBe(true);
  });

  // FinancialGovernanceService was in this "untouched by PR #132" list originally
  // (accurately, at that time) — it was later, separately retired by B-TRUTH
  // FinancialGovernance Retirement (2026-09-02, its own bounded PR). PreviewScoringAdapter
  // and DynamicScoringPreviewService were also in this list originally — later,
  // separately retired by B-TRUTH Preview Scoring Retirement (2026-09-03).
  // UEFReviewService, IngestionPipelineService, and EligibilityGateService
  // were also in this list originally — each later, separately retired by
  // its own bounded PR. Each is deliberately removed from the "still
  // exists" assertion rather than left to falsely assert continued
  // existence; ExplainabilityService remains genuinely untouched. See each
  // retirement's own dedicated regression guard for current proofs.
  it('ExplainabilityService untouched — still exists', () => {
    expect(existsSync(resolve(root, 'services/explainability/ExplainabilityService.ts'))).toBe(true);
  });

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

  it('canonical Decision Pack authority untouched by this retirement — lib/decision-pack/* and lib/live/decision-pack.ts unchanged in role', () => {
    const pdfData = read('lib/decision-pack/pdf-data.ts');
    expect(pdfData).toContain('CANONICAL DECISION PACK DOMAIN BUILDER');
    expect(pdfData).toContain('D-B resolved');
  });
});

describe('B-TRUTH — the deferred readiness requirement survives the deletion', () => {
  it('registry preserves the getDecisionPackReadiness() requirement text (governance, not runtime)', () => {
    const registry = read('lib/architecture/registry.ts');
    expect(registry).toMatch(/future[\s\S]{0,20}automated Decision Pack readiness\/status derived from canonical live[\s\S]{0,20}evidence\/data-quality signals/);
    expect(registry).toContain('DEFERRED PRODUCT REQUIREMENT');
    expect(registry).toContain('getDecisionPackReadiness()');
  });

  it('no new runtime readiness-derivation code was added anywhere in lib/decision-pack or lib/live', () => {
    const pdfData     = read('lib/decision-pack/pdf-data.ts');
    const livePersist = read('lib/live/decision-pack.ts');
    // The manual-only lifecycle comment must still be present — proves no
    // automated derivation was silently added as part of this retirement.
    expect(livePersist).toContain('state machine is future scope');
    expect(pdfData).not.toMatch(/function\s+(compute|derive)Readiness/i);
  });
});

describe('B-TRUTH — registry and I9 reflect the retirement', () => {
  it('registry svc.report-generator entry reflects DEAD, not INVESTIGATE', () => {
    const registry = read('lib/architecture/registry.ts');
    const idx = registry.indexOf("id: 'svc.report-generator'");
    expect(idx).toBeGreaterThan(-1);
    const nextIdx = registry.indexOf("{ id:", idx + 10);
    const entry = registry.slice(idx, nextIdx);
    expect(entry).toContain("status: 'DEAD'");
  });

  it('ReportGeneratorService.ts was never an I9 allowlist entry — I9 is unaffected by this retirement', () => {
    const allowlist = read('lib/security/synthetic-import-allowlist.ts');
    expect(allowlist).not.toContain("'services/report-generator/ReportGeneratorService.ts'");
  });
});
