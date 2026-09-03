/**
 * B-TRUTH — Explainability Synthetic Retirement (2026-09-02).
 *
 * Locks in the PARTIAL retirement of
 * services/explainability/ExplainabilityService.ts: the synthetic-backed
 * explanation branch (getExplanation, getTopWeakComponents,
 * getTopStrongComponents, getNextBestActions, getLimitations, getWarnings —
 * all reading data/synthetic/explainability-records.json) is removed. The
 * live methodology glossary (getConceptExplanation, listConceptKeys,
 * CONCEPT_GLOSSARY, ConceptExplanation) is kept, unchanged, no synthetic
 * dependency.
 *
 * Re-verified independently before removal (not trusted from any prior
 * audit alone): zero real runtime callers of all 6 synthetic methods, zero
 * external callers of the Warning type. Their only real-ish caller was
 * ReportGeneratorService, retired separately in an earlier PR — this branch
 * became fully orphaned as a direct consequence, then was independently
 * reconfirmed here before acting on it.
 *
 * ExplainabilityComponentRef, ExplainabilityAction, and ExplainabilityRecord
 * are KEPT as pure type declarations — smallest safe change — because
 * components/kora-index/ExplainabilityPanel.tsx still has a type-only
 * import of ExplainabilityRecord, even though that component was
 * independently confirmed to be itself unreachable from any real entry
 * point (a separate, out-of-scope fact about that component, not acted on
 * here).
 *
 * data/synthetic/explainability-records.json is deleted — its only real,
 * value-level consumer was this file. A second, purely nominal reference
 * (the bare string 'explainability-records' inside
 * services/demo-data/DemoDataService.ts's SeedResourceType union) is
 * confirmed non-functional: getResource() is an unconditional stub
 * returning [] for every resource type, with zero real callers of its own.
 * DemoDataService.ts (final scoring group) is untouched.
 *
 * NOT touched by this retirement (separate, later, bounded slices):
 * ReportFactoryService, PreviewScoringAdapter, DynamicScoringPreviewService,
 * the Ingestion/UEF legacy chain (IngestionPipelineService,
 * EligibilityGateService, UEFReviewService), the final scoring group.
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

describe('B-TRUTH — ExplainabilityService synthetic branch no longer exists', () => {
  const src = read('services/explainability/ExplainabilityService.ts');

  it('the service file still exists (partial retirement, not full deletion)', () => {
    expect(existsSync(resolve(root, 'services/explainability/ExplainabilityService.ts'))).toBe(true);
  });

  it('no longer imports data/synthetic/**', () => {
    expect(src).not.toMatch(/from\s+['"]@?\/?data\/synthetic\//);
  });

  it('the 6 synthetic-backed methods are gone', () => {
    for (const method of ['getExplanation', 'getTopWeakComponents', 'getTopStrongComponents', 'getNextBestActions', 'getLimitations', 'getWarnings']) {
      expect(src).not.toMatch(new RegExp(`\\b${method}\\s*\\(`));
    }
  });

  it('the Warning interface and SeedRecord interface are gone', () => {
    expect(src).not.toContain('interface Warning');
    expect(src).not.toContain('interface SeedRecord');
  });

  it('its sole synthetic seed file is gone (zero other real consumers, confirmed before deletion)', () => {
    expect(existsSync(resolve(root, 'data/synthetic/explainability-records.json'))).toBe(false);
  });

  it('no runtime file (app/services/lib/components) calls any of the retired synthetic methods', () => {
    const offenders: string[] = [];
    const RETIRED_METHOD_CALL = /\.(getExplanation|getTopWeakComponents|getTopStrongComponents|getNextBestActions|getLimitations|getWarnings)\s*\(/;
    for (const dir of RUNTIME_DIRS) {
      for (const file of walkTs(resolve(root, dir))) {
        const relative = file.replace(root + '/', '');
        if (relative === 'services/explainability/ExplainabilityService.ts') continue;
        if (RETIRED_METHOD_CALL.test(read(relative))) offenders.push(relative);
      }
    }
    expect(offenders).toEqual([]);
  });
});

describe('B-TRUTH — the live methodology glossary is unchanged', () => {
  const src = read('services/explainability/ExplainabilityService.ts');

  it('getConceptExplanation and listConceptKeys still exist', () => {
    expect(src).toContain('getConceptExplanation(');
    expect(src).toContain('listConceptKeys(');
  });

  it('CONCEPT_GLOSSARY still has all 21 concepts', () => {
    expect((src.match(/^\s{2}\w+: \{\s*$/gm) ?? []).length).toBeGreaterThanOrEqual(21);
    expect(src).toContain("key: 'kora_index'");
    expect(src).toContain("key: 'policy_depth'");
  });

  it('the glossary has no synthetic dependency — CONCEPT_GLOSSARY is a static object, not seed-derived', () => {
    expect(src).not.toContain('explainabilityRaw');
    expect(src).not.toContain('explainabilityRecords');
  });

  it('the real live caller, MethodologyGlossary.tsx, is unaffected', () => {
    const glossaryComponent = read('components/kora-index/MethodologyGlossary.tsx');
    expect(glossaryComponent).toContain('explainabilityService.getConceptExplanation(');
  });
});

describe('B-TRUTH — types kept for ExplainabilityPanel.tsx type-only compatibility', () => {
  it('ExplainabilityComponentRef, ExplainabilityAction, ExplainabilityRecord still exported', () => {
    const src = read('services/explainability/ExplainabilityService.ts');
    expect(src).toContain('export interface ExplainabilityComponentRef');
    expect(src).toContain('export interface ExplainabilityAction');
    expect(src).toContain('export interface ExplainabilityRecord');
  });

  it('ExplainabilityPanel.tsx still compiles against the preserved type (import unchanged)', () => {
    const panel = read('components/kora-index/ExplainabilityPanel.tsx');
    expect(panel).toContain("import type { ExplainabilityRecord } from '@/services/explainability/ExplainabilityService'");
  });

  it('ExplainabilityPanel.tsx is confirmed unreachable from any real entry point (out-of-scope fact, not acted on)', () => {
    const offenders: string[] = [];
    for (const dir of RUNTIME_DIRS) {
      for (const file of walkTs(resolve(root, dir))) {
        const relative = file.replace(root + '/', '');
        if (relative === 'components/kora-index/ExplainabilityPanel.tsx') continue;
        if (/from\s+['"]@\/components\/kora-index\/ExplainabilityPanel['"]|<ExplainabilityPanel\b/.test(read(relative))) {
          offenders.push(relative);
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});

describe('B-TRUTH — this PR retired ONLY the synthetic branch (one PR = one bounded retirement)', () => {
  // PreviewScoringAdapter and DynamicScoringPreviewService were in this
  // "untouched by this PR" list originally (accurately, at that time) — they
  // were later, separately retired by B-TRUTH Preview Scoring Retirement
  // (2026-09-03, its own bounded PR), so they are deliberately removed from
  // this list rather than left to falsely assert continued existence. See
  // tests/unit/b-truth-preview-scoring-retirement.test.ts.
  it('ReportFactoryService untouched — still exists', () => {
    expect(existsSync(resolve(root, 'services/report-factory/ReportFactoryService.ts'))).toBe(true);
  });

  // UEFReviewService was in this "untouched" list originally (accurately, at
  // that time) — it was later, separately retired by B-TRUTH UEFReview
  // Retirement (2026-09-03, its own bounded PR). See
  // tests/unit/b-truth-uef-review-retirement.test.ts.
  it('the Ingestion/UEF legacy chain untouched — still exists', () => {
    for (const file of [
      'services/ingestion-pipeline/IngestionPipelineService.ts',
      'services/eligibility-gate/EligibilityGateService.ts',
    ]) {
      expect(existsSync(resolve(root, file))).toBe(true);
    }
  });

  it('the final scoring group untouched — still exists, DemoDataService.ts unmodified in behavior', () => {
    for (const file of [
      'services/scoring/DemoScoringAdapter.ts',
      'services/scoring-simulator/ScoringSimulatorService.ts',
      'services/demo-data/DemoDataService.ts',
      'services/access-control/AccessControlService.ts',
    ]) {
      expect(existsSync(resolve(root, file))).toBe(true);
    }
    const demoData = read('services/demo-data/DemoDataService.ts');
    expect(demoData).toContain("'explainability-records'");
    expect(demoData).toContain('return [];');
  });
});

describe('B-TRUTH — registry and I9 reflect the retirement', () => {
  it('registry svc.explainability entry stays CANONICAL (glossary is real, not DEAD)', () => {
    const registry = read('lib/architecture/registry.ts');
    const idx = registry.indexOf("id: 'svc.explainability'");
    expect(idx).toBeGreaterThan(-1);
    const nextIdx = registry.indexOf("{ id:", idx + 10);
    const entry = registry.slice(idx, nextIdx);
    expect(entry).toContain("status: 'CANONICAL'");
  });

  it('allowlist no longer lists ExplainabilityService.ts', () => {
    const allowlist = read('lib/security/synthetic-import-allowlist.ts');
    expect(allowlist).not.toContain("'services/explainability/ExplainabilityService.ts'");
  });
});
