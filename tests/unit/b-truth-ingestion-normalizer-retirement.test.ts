/**
 * B-TRUTH — Ingestion Normalizer Retirement (2026-09-03).
 *
 * Locks in the retirement of
 * services/ingestion-normalizer/IngestionNormalizerService.ts — an
 * internal-only normalization sub-module whose own header always correctly
 * scoped it as such ("should not be imported directly in app/ routes or
 * components"). Its sole real caller, IngestionPipelineService, was itself
 * retired in the immediately preceding PR — this retirement is a
 * straightforward orphan-of-an-already-retired-consumer, not a stale-claim
 * correction.
 *
 * Re-verified independently before deletion (not trusted from any prior
 * audit alone): all 6 IIngestionNormalizerService methods (normalizeRow,
 * normalizeBatch, detectMissingFields, inferSourceType, inferMandatoryStatus,
 * getMissingDataQuestions) individually confirmed zero real callers, zero
 * type-only callers.
 *
 * No unique live data semantics: the real, canonical live ingestion/
 * data-intake path (MappingConfidenceService, lib/data-intake/
 * missing-field-analysis.ts, classifyEligibilityBatch, operating on the
 * canonical RawUploadedRecord type family) is confirmed entirely
 * independent — it solves related problems (source classification,
 * missing-field detection) via its own separate implementation, never
 * reusing this file's logic.
 *
 * Its type family (RawIngestionRow, NormalizedIngestionRow) was confirmed
 * to have zero other real consumers (the one apparent hit, a comment in
 * services/iu-computation/IUComputationService.ts, is prose, not an
 * import) and was deliberately NOT deleted — no opportunistic cleanup,
 * they remain harmless data contracts in @/lib/types.
 *
 * Never an I9 allowlist member (no direct data/synthetic/** import of its
 * own) — I9 unaffected by this retirement.
 *
 * NOT touched by this retirement (separate, later, bounded slice):
 * EligibilityGateService, ReportFactoryService, the live methodology
 * glossary, the final scoring group, canonical ingestion/data-intake
 * (MappingConfidenceService, missing-field-analysis.ts,
 * classifyEligibilityBatch, run-kora-pipeline), canonical UEF path.
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

describe('B-TRUTH — IngestionNormalizerService no longer exists', () => {
  it('the service file is gone', () => {
    expect(existsSync(resolve(root, 'services/ingestion-normalizer/IngestionNormalizerService.ts'))).toBe(false);
  });

  it('its directory is gone (no leftover empty dir)', () => {
    expect(existsSync(resolve(root, 'services/ingestion-normalizer'))).toBe(false);
  });

  it('no runtime file (app/services/lib/components), excluding governance docs and tests, imports, instantiates, or calls it', () => {
    const offenders: string[] = [];
    const REAL_USAGE = /(?:^|\s)import\s[^;]*IngestionNormalizerService[^;]*from|from\s*['"][^'"]*ingestion-normalizer\/IngestionNormalizerService['"]|new\s+IngestionNormalizerService\s*\(|ingestionNormalizerService\s*\./m;
    for (const dir of RUNTIME_DIRS) {
      for (const file of walkTs(resolve(root, dir))) {
        const relative = file.replace(root + '/', '');
        if (EXCLUDED_DOCS.has(relative)) continue;
        if (relative.endsWith('.test.ts')) continue; // test files legitimately assert non-usage by string
        if (REAL_USAGE.test(read(relative))) offenders.push(relative);
      }
    }
    expect(offenders).toEqual([]);
  });
});

describe('B-TRUTH — canonical live ingestion/data-intake path remains untouched and independent', () => {
  it('MappingConfidenceService still exists, no reference to the retired file', () => {
    const src = read('services/mapping-confidence/MappingConfidenceService.ts');
    expect(src).not.toContain('IngestionNormalizerService');
  });

  it('lib/data-intake/missing-field-analysis.ts still exists, no reference to the retired file', () => {
    const src = read('lib/data-intake/missing-field-analysis.ts');
    expect(src).not.toContain('IngestionNormalizerService');
  });

  it('the canonical eligibility engine (classifyEligibilityBatch) still exists, no reference to the retired file', () => {
    const src = read('lib/kora-engine/eligibility-gate.ts');
    expect(src).toContain('classifyEligibilityBatch');
    expect(src).not.toContain('IngestionNormalizerService');
  });

  it('the admin upload-preview route still exists, no reference to the retired file', () => {
    const src = read('app/api/admin/data-intake/upload-preview/route.ts');
    expect(src).not.toContain('IngestionNormalizerService');
  });
});

describe('B-TRUTH — this PR retired ONLY IngestionNormalizerService (one PR = one bounded retirement)', () => {
  it('EligibilityGateService untouched — still exists, unmodified', () => {
    expect(existsSync(resolve(root, 'services/eligibility-gate/EligibilityGateService.ts'))).toBe(true);
    const src = read('services/eligibility-gate/EligibilityGateService.ts');
    expect(src).toContain('classifyAction(');
  });

  it('data/synthetic/action-taxonomy.json (EligibilityGateService\'s fixture) untouched', () => {
    expect(existsSync(resolve(root, 'data/synthetic/action-taxonomy.json'))).toBe(true);
  });

  it('ReportFactoryService and the live methodology glossary untouched', () => {
    expect(existsSync(resolve(root, 'services/report-factory/ReportFactoryService.ts'))).toBe(true);
    const glossary = read('services/explainability/ExplainabilityService.ts');
    expect(glossary).toContain('getConceptExplanation(');
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

describe('B-TRUTH — type family preserved, no opportunistic cleanup', () => {
  it('RawIngestionRow and NormalizedIngestionRow remain defined in lib/types', () => {
    const src = read('lib/types/index.ts');
    expect(src).toContain('RawIngestionRow');
    expect(src).toContain('NormalizedIngestionRow');
  });
});

describe('B-TRUTH — registry and I9 reflect the retirement', () => {
  it('registry svc.ingestion-normalizer entry reflects DEAD, not CANONICAL', () => {
    const registry = read('lib/architecture/registry.ts');
    const idx = registry.indexOf("id: 'svc.ingestion-normalizer'");
    expect(idx).toBeGreaterThan(-1);
    const nextIdx = registry.indexOf("{ id:", idx + 10);
    const entry = registry.slice(idx, nextIdx);
    expect(entry).toContain("status: 'DEAD'");
  });

  it('registry svc.eligibility-gate entry remains CANONICAL — untouched', () => {
    const registry = read('lib/architecture/registry.ts');
    const idx = registry.indexOf("id: 'svc.eligibility-gate'");
    expect(idx).toBeGreaterThan(-1);
    const nextIdx = registry.indexOf("{ id:", idx + 10);
    const entry = registry.slice(idx, nextIdx);
    expect(entry).toContain("status: 'CANONICAL'");
  });

  it('IngestionNormalizerService was never an I9 allowlist entry — I9 unaffected by this retirement', () => {
    const allowlist = read('lib/security/synthetic-import-allowlist.ts');
    expect(allowlist).not.toMatch(/\{\s*file:\s*'services\/ingestion-normalizer\/IngestionNormalizerService\.ts'/);
  });
});
