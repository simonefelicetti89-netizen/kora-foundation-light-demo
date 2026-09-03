/**
 * B-TRUTH — Preview Scoring Retirement (2026-09-03).
 *
 * Locks in the retirement of the entire "PREVIEW" scoring path:
 * services/scoring/PreviewScoringAdapter.ts and
 * services/dynamic-scoring/DynamicScoringPreviewService.ts.
 *
 * Re-verified independently before deletion (not trusted from any prior
 * audit alone): zero real runtime callers of either file anywhere in
 * app/, components/, services/, or lib/ — only comment mentions in
 * services/scoring/IScoringService.ts and lib/scoring-result/index.ts
 * ("NEVER import..."), never an actual import statement. The canonical
 * scoring router (lib/scoring-result/index.ts, the CC-002-enforced single
 * consumption hook) was confirmed, by reading its actual dispatch logic,
 * to only ever branch on environment === 'demo' / 'live' — PREVIEW was
 * documented as a "3 scoring paths" architecture in IScoringService.ts's
 * header but never actually wired into real routing. Its only real-ish
 * consumer, ever, was ReportGeneratorService's Decision Pack preview
 * section — retired in an earlier, separate PR (2026-09-02).
 *
 * No unique methodology: every DynamicScoringPreviewService computation was
 * either an explicitly self-labelled proxy approximation ("stima proxy",
 * hardcoded WB=0.35/EQ=0.40 placeholders, explicit "non è il KORA Index
 * ufficiale e non deve essere usato per decision-making" limitation text)
 * or direct reuse of activationSafeguardService.evaluate() /
 * scoringSimulatorService.computeKoraIndexV3() — both real methodology
 * functions defined elsewhere, unchanged and unaffected by this retirement.
 *
 * services/scoring/IScoringService.ts's ScoringPathMode narrowed from
 * 'DEMO'|'PREVIEW'|'LIVE' to 'DEMO'|'LIVE' — confirmed zero other real
 * consumers of the 'PREVIEW' literal via that specific type (the only two
 * real implementors, DemoScoringAdapter and LiveScoringAdapter, use only
 * 'DEMO'/'LIVE' respectively).
 *
 * UEFReviewService.ts (DynamicScoringPreviewService's sole upstream
 * dependency) is untouched — not retired, not modified. Its real-caller
 * count is now 0 as a direct, documented consequence, but it remains
 * protected by demo-guard-01's separate, deliberate, method-level
 * assertion ("getReviewSummary must NOT be removed") — a sequencing
 * decision unrelated to this retirement, not acted on here.
 *
 * NOT touched by this retirement (separate, later, bounded slices):
 * ReportFactoryService, the rest of the Ingestion/UEF legacy chain
 * (IngestionPipelineService, EligibilityGateService, UEFReviewService),
 * the live methodology glossary, the final scoring group.
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

describe('B-TRUTH — PreviewScoringAdapter and DynamicScoringPreviewService no longer exist', () => {
  it('both service files are gone', () => {
    expect(existsSync(resolve(root, 'services/scoring/PreviewScoringAdapter.ts'))).toBe(false);
    expect(existsSync(resolve(root, 'services/dynamic-scoring/DynamicScoringPreviewService.ts'))).toBe(false);
  });

  it('the dynamic-scoring directory is gone (no leftover empty dir); services/scoring/ persists (other adapters remain)', () => {
    expect(existsSync(resolve(root, 'services/dynamic-scoring'))).toBe(false);
    expect(existsSync(resolve(root, 'services/scoring'))).toBe(true);
    expect(existsSync(resolve(root, 'services/scoring/DemoScoringAdapter.ts'))).toBe(true);
    expect(existsSync(resolve(root, 'services/scoring/LiveScoringAdapter.ts'))).toBe(true);
  });

  it('no runtime file (app/services/lib/components) imports, instantiates, or calls either retired file', () => {
    // Governance/documentation files (registry, allowlist) legitimately
    // mention these names in historical prose — excluded, matching the
    // established pattern for every prior B-TRUTH retirement guard.
    const EXCLUDED = new Set(['lib/architecture/registry.ts', 'lib/security/synthetic-import-allowlist.ts']);
    const offenders: string[] = [];
    const REAL_USAGE = /(?:^|\s)import\s[^;]*(?:PreviewScoringAdapter|DynamicScoringPreviewService)[^;]*from|from\s*['"][^'"]*(?:scoring\/PreviewScoringAdapter|dynamic-scoring\/DynamicScoringPreviewService)['"]|new\s+(?:PreviewScoringAdapter|DynamicScoringPreviewService)\s*\(|(?:previewScoringAdapter|dynamicScoringPreviewService)\s*\./m;
    for (const dir of RUNTIME_DIRS) {
      for (const file of walkTs(resolve(root, dir))) {
        const relative = file.replace(root + '/', '');
        if (EXCLUDED.has(relative)) continue;
        if (REAL_USAGE.test(read(relative))) offenders.push(relative);
      }
    }
    expect(offenders).toEqual([]);
  });
});

describe('B-TRUTH — canonical scoring routing untouched (2 paths, not 3, never was 3 in practice)', () => {
  it('lib/scoring-result/index.ts still only dispatches demo/live', () => {
    const src = read('lib/scoring-result/index.ts');
    expect(src).toContain("environment === 'demo'");
    expect(src).not.toContain('PreviewScoringAdapter');
    expect(src).not.toContain('DynamicScoringPreviewService');
  });

  it('IScoringService.ts documents 2 scoring paths, ScoringPathMode narrowed', () => {
    const src = read('services/scoring/IScoringService.ts');
    expect(src).toContain("export type ScoringPathMode = 'DEMO' | 'LIVE';");
    expect(src).not.toContain("'PREVIEW'");
  });

  it('DemoScoringAdapter and LiveScoringAdapter still exist and are unmodified in role', () => {
    const demo = read('services/scoring/DemoScoringAdapter.ts');
    const live = read('services/scoring/LiveScoringAdapter.ts');
    expect(demo).toContain("mode: ScoringPathMode = 'DEMO'");
    expect(live).toContain("mode: ScoringPathMode = 'LIVE'");
  });
});

describe('B-TRUTH — b89b architecture contract updated, remaining adapters still tested', () => {
  const src = read('tests/unit/b89b-architecture-hardening.test.ts');

  it('no longer imports or references PreviewScoringAdapter', () => {
    expect(src).not.toContain('PreviewScoringAdapter');
    expect(src).not.toContain('previewScoringAdapter');
  });

  it('DemoScoringAdapter and LiveScoringAdapter contract tests still present', () => {
    expect(src).toContain("DemoScoringAdapter mode is DEMO");
    expect(src).toContain("LiveScoringAdapter mode is LIVE");
    expect(src).toContain("only LiveScoringAdapter is authoritative");
  });
});

describe('B-TRUTH — UEFReviewService untouched (real-caller drop is documented, not acted on)', () => {
  it('UEFReviewService.ts still exists, unmodified', () => {
    expect(existsSync(resolve(root, 'services/uef-review/UEFReviewService.ts'))).toBe(true);
  });

  it('no runtime file besides the deleted ones ever called UEFReviewService — demo-guard-01 protection remains untouched', () => {
    const guard = read('tests/unit/demo-guard-01-kora-index-evidence-fallback.test.ts');
    expect(guard).toContain('getReviewSummary');
  });
});

describe('B-TRUTH — this PR retired ONLY the Preview pair (one PR = one bounded retirement)', () => {
  it('ReportFactoryService, the Ingestion/UEF legacy chain untouched — still exist', () => {
    for (const file of [
      'services/report-factory/ReportFactoryService.ts',
      'services/ingestion-pipeline/IngestionPipelineService.ts',
      'services/eligibility-gate/EligibilityGateService.ts',
      'services/uef-review/UEFReviewService.ts',
    ]) {
      expect(existsSync(resolve(root, file))).toBe(true);
    }
  });

  it('the live methodology glossary untouched', () => {
    const src = read('services/explainability/ExplainabilityService.ts');
    expect(src).toContain('getConceptExplanation(');
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
});

describe('B-TRUTH — registry and I9 reflect the retirement', () => {
  it('registry svc.dynamic-scoring entry reflects DEAD, not CANONICAL', () => {
    const registry = read('lib/architecture/registry.ts');
    const idx = registry.indexOf("id: 'svc.dynamic-scoring'");
    expect(idx).toBeGreaterThan(-1);
    const nextIdx = registry.indexOf("{ id:", idx + 10);
    const entry = registry.slice(idx, nextIdx);
    expect(entry).toContain("status: 'DEAD'");
  });

  it('neither file was ever an I9 allowlist entry — I9 unaffected by this retirement', () => {
    const allowlist = read('lib/security/synthetic-import-allowlist.ts');
    expect(allowlist).not.toContain("'services/scoring/PreviewScoringAdapter.ts'");
    expect(allowlist).not.toContain("'services/dynamic-scoring/DynamicScoringPreviewService.ts'");
  });
});
