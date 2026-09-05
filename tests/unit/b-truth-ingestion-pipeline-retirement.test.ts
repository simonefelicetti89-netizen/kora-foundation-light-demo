/**
 * B-TRUTH — Ingestion Pipeline Retirement (2026-09-03).
 *
 * Locks in the retirement of services/ingestion-pipeline/IngestionPipelineService.ts
 * and its sole seed file, data/synthetic/ingestion-samples.json — the legacy
 * demo ingestion classifier that fed the (also now-retired) demo UEF review
 * queue.
 *
 * Re-verified independently before deletion (not trusted from any prior
 * audit alone): all 5 IIngestionPipelineService methods (analyzeRow,
 * analyzeBatch, getIngestionSummary, getReviewQueue, getKoraReadyRecords)
 * individually confirmed zero real callers — its last real-ish caller,
 * UEFReviewService, was itself retired in the immediately preceding PR.
 *
 * No unique methodology: the private governance-flag derivation logic
 * (deriveDestination/deriveReviewStatus/buildKoraReadyRecord) is a
 * non-authoritative demo approximation of the same eligibility concept
 * lib/kora-engine/eligibility-gate.ts's classifyEligibilityBatch already
 * implements for real, live scoring — confirmed independent (zero
 * references to this file), and RLS-16-proven correct for both DEMO-kind
 * and LIVE-kind tenants without it.
 *
 * data/synthetic/ingestion-samples.json is deleted alongside it — its only
 * real, value-level consumer was this file (two prior prose mentions
 * describing it as "demo data preserved" governed an earlier point when
 * this exact retirement had not yet been authorized).
 *
 * Direct consequences of this deletion (documented, not acted on):
 * EligibilityGateService drops from 1 to 0 real callers (this file was its
 * sole caller); IngestionNormalizerService drops from 1 to 0 real callers
 * likewise. Neither is modified or retired here — each remains its own
 * separately-authorized future slice.
 *
 * NOT touched by this retirement (separate, later, bounded slices):
 * EligibilityGateService, IngestionNormalizerService, ReportFactoryService,
 * the live methodology glossary, the final scoring group, canonical
 * ingestion/scoring pipeline (run-kora-pipeline, classifyEligibilityBatch,
 * buildScoringRecordsFromApprovedUef).
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

describe('B-TRUTH — IngestionPipelineService no longer exists', () => {
  it('the service file is gone', () => {
    expect(existsSync(resolve(root, 'services/ingestion-pipeline/IngestionPipelineService.ts'))).toBe(false);
  });

  it('its directory is gone (no leftover empty dir)', () => {
    expect(existsSync(resolve(root, 'services/ingestion-pipeline'))).toBe(false);
  });

  it('its sole synthetic seed file is gone (zero other real consumers, confirmed before deletion)', () => {
    expect(existsSync(resolve(root, 'data/synthetic/ingestion-samples.json'))).toBe(false);
  });

  it('no runtime file (app/services/lib/components), excluding governance docs and tests, imports, instantiates, or calls it', () => {
    const offenders: string[] = [];
    const REAL_USAGE = /(?:^|\s)import\s[^;]*IngestionPipelineService[^;]*from|from\s*['"][^'"]*ingestion-pipeline\/IngestionPipelineService['"]|new\s+IngestionPipelineService\s*\(|ingestionPipelineService\s*\./m;
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

describe('B-TRUTH — canonical ingestion/scoring pipeline remains untouched', () => {
  it('lib/kora-engine/run-kora-pipeline.ts still exists, no reference to the retired file', () => {
    const src = read('lib/kora-engine/run-kora-pipeline.ts');
    expect(src).not.toContain('IngestionPipelineService');
  });

  it('lib/kora-engine/eligibility-gate.ts (classifyEligibilityBatch) still exists, no reference to the retired file', () => {
    const src = read('lib/kora-engine/eligibility-gate.ts');
    expect(src).toContain('classifyEligibilityBatch');
    expect(src).not.toContain('IngestionPipelineService');
  });

  it('lib/live/uef-to-scoring-records.ts (buildScoringRecordsFromApprovedUef) still exists, no reference to the retired file', () => {
    const src = read('lib/live/uef-to-scoring-records.ts');
    expect(src).not.toContain('IngestionPipelineService');
  });
});

describe('B-TRUTH — RLS-16 structural protections remain', () => {
  it('RLS-16 still asserts it never imports the (now-fully-retired) legacy chain', () => {
    const src = read('tests/integration/rls-16-ingestion-tenant-kind-parity.test.ts');
    expect(src).toContain('IngestionPipelineService');
    expect(src).toContain('does not import');
  });
});

describe('B-TRUTH — demo-guard-01 fallback prohibition preserved, unweakened', () => {
  const guard = read('tests/unit/demo-guard-01-kora-index-evidence-fallback.test.ts');

  it('still asserts the kora-index page does not import IngestionPipelineService', () => {
    expect(guard).toContain('does not import IngestionPipelineService');
  });

  it('still asserts the kora-index page does not reference ingestion-samples', () => {
    expect(guard).toContain('does not reference ingestion-samples');
  });

  it('the guarded page itself still has zero reference to the retired class', () => {
    const page = read('app/company/kora-index/page.tsx');
    expect(page).not.toContain('IngestionPipelineService');
    expect(page).not.toContain('ingestion-samples');
  });
});

// IngestionNormalizerService and EligibilityGateService were in this
// "untouched" list originally (accurately, at that time) — each was later,
// separately retired by its own bounded PR (B-TRUTH Ingestion Normalizer
// Retirement, 2026-09-03; B-TRUTH Eligibility Gate Retirement, 2026-09-03).
// See tests/unit/b-truth-ingestion-normalizer-retirement.test.ts and
// tests/unit/b-truth-eligibility-gate-retirement.test.ts.
describe('B-TRUTH — this PR retired ONLY IngestionPipelineService (one PR = one bounded retirement)', () => {
  // ReportFactoryService.ts was accurately untouched (still existed) at the
  // time this test was written. B-TRUTH ReportFactoryService Canonical
  // Decision Pack Status Migration (2026-09-06) later, separately, retired
  // it entirely. See
  // tests/unit/b-truth-reportfactory-canonical-decision-pack-status.test.ts
  // for the current, correct state.
  it('ReportFactoryService has since been separately retired (historical note); the live methodology glossary is untouched', () => {
    expect(existsSync(resolve(root, 'services/report-factory/ReportFactoryService.ts'))).toBe(false);
    const glossary = read('services/explainability/ExplainabilityService.ts');
    expect(glossary).toContain('getConceptExplanation(');
  });

  it('access-control untouched — still exists; the final scoring group was later retired by CC-00 Final Scoring Canonicalization (2026-09-05), unrelated to this PR', () => {
    expect(existsSync(resolve(root, 'services/access-control/AccessControlService.ts'))).toBe(true);
    for (const file of [
      'services/scoring/DemoScoringAdapter.ts',
      'services/scoring-simulator/ScoringSimulatorService.ts',
      'services/demo-data/DemoDataService.ts',
    ]) {
      expect(existsSync(resolve(root, file))).toBe(false);
    }
  });
});

describe('B-TRUTH — registry and I9 reflect the retirement', () => {
  it('registry svc.ingestion-pipeline entry reflects DEAD, not FROZEN', () => {
    const registry = read('lib/architecture/registry.ts');
    const idx = registry.indexOf("id: 'svc.ingestion-pipeline'");
    expect(idx).toBeGreaterThan(-1);
    const nextIdx = registry.indexOf("{ id:", idx + 10);
    const entry = registry.slice(idx, nextIdx);
    expect(entry).toContain("status: 'DEAD'");
  });

  // IngestionNormalizerService and EligibilityGateService were both checked
  // here as remaining CANONICAL originally (accurately, at that time) —
  // each was later, separately retired. See
  // tests/unit/b-truth-ingestion-normalizer-retirement.test.ts and
  // tests/unit/b-truth-eligibility-gate-retirement.test.ts for their own
  // registry-status regression guards.
  it('registry svc.eligibility-gate entry reflects DEAD, not CANONICAL (historical note, not a live assertion of this PR)', () => {
    const registry = read('lib/architecture/registry.ts');
    const idx = registry.indexOf("id: 'svc.eligibility-gate'");
    expect(idx).toBeGreaterThan(-1);
    const nextIdx = registry.indexOf("{ id:", idx + 10);
    const entry = registry.slice(idx, nextIdx);
    expect(entry).toContain("status: 'DEAD'");
  });

  it('allowlist no longer lists the retired service', () => {
    const allowlist = read('lib/security/synthetic-import-allowlist.ts');
    expect(allowlist).not.toContain("'services/ingestion-pipeline/IngestionPipelineService.ts'");
  });
});
