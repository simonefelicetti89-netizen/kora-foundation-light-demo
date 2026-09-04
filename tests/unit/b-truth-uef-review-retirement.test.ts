/**
 * B-TRUTH — UEFReview Retirement (2026-09-03).
 *
 * Locks in the retirement of services/uef-review/UEFReviewService.ts — the
 * legacy demo-backed UEF review queue class, distinct from the real,
 * canonical UEF review product surfaces (app/admin/uef-review/,
 * app/company/uef-review/, /api/admin/uef/*), which are built entirely on
 * analytics.uef_record and never referenced this class.
 *
 * Re-verified independently before deletion (not trusted from any prior
 * audit alone): zero real runtime callers of any of the 11
 * IUEFReviewService methods, zero type-only callers (its own
 * IUEFReviewService interface had zero external importers; all the
 * UEFReview-prefixed and EligibilityClass types it used were themselves
 * imported FROM lib/types, not exported by this file).
 *
 * CORRECTION to prior audits (recorded here, not silently dropped): earlier
 * B-TRUTH audit passes in this session repeatedly claimed demo-guard-01
 * contained "a deliberate, method-level assertion that getReviewSummary
 * must NOT be removed" from this file, treating that as a sequencing
 * blocker. Rereading the guard's CURRENT full text (as rewritten by this
 * session's own B-TRUTH Decision Pack Ratification PR, 2026-09-02) showed
 * that claim was stale — it described the file's PRE-that-rewrite wording.
 * Every substantive demo-guard-01 assertion reads
 * app/company/kora-index/page.tsx's source (the page that had the real
 * historical bug, DEMO-DEP-RO), never UEFReviewService.ts's. The only place
 * this file's *existence* was checked was an incidental scope-boundary
 * inventory line, mechanically updated for every retirement this session —
 * not an elevated, permanent protection. This retirement corrects that
 * record; see lib/architecture/registry.ts svc.uef-review and
 * svc.ingestion-pipeline for the corrected historical notes.
 *
 * NOT touched by this retirement (separate, later, bounded slices):
 * IngestionPipelineService, EligibilityGateService, ReportFactoryService,
 * the live methodology glossary, the final scoring group, the canonical
 * UEF-review product surfaces, canonical ingestion/scoring pipeline.
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

describe('B-TRUTH — UEFReviewService no longer exists', () => {
  it('the service file is gone', () => {
    expect(existsSync(resolve(root, 'services/uef-review/UEFReviewService.ts'))).toBe(false);
  });

  it('its directory is gone (no leftover empty dir)', () => {
    expect(existsSync(resolve(root, 'services/uef-review'))).toBe(false);
  });

  it('no runtime file (app/services/lib/components), excluding governance docs, imports, instantiates, or calls it', () => {
    const offenders: string[] = [];
    const REAL_USAGE = /(?:^|\s)import\s[^;]*UEFReviewService[^;]*from|from\s*['"][^'"]*uef-review\/UEFReviewService['"]|new\s+UEFReviewService\s*\(|uefReviewService\s*\./m;
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

describe('B-TRUTH — canonical UEF review surfaces remain present and independent', () => {
  it('app/admin/uef-review/ still exists and does not import the retired class', () => {
    expect(existsSync(resolve(root, 'app/admin/uef-review/page.tsx'))).toBe(true);
    const src = read('app/admin/uef-review/page.tsx');
    expect(src).not.toContain('uefReviewService');
  });

  it('app/company/uef-review/page.tsx still exists — locked shell, already independent (B106/B147)', () => {
    expect(existsSync(resolve(root, 'app/company/uef-review/page.tsx'))).toBe(true);
    const src = read('app/company/uef-review/page.tsx');
    expect(src).not.toContain('uefReviewService');
  });

  it('/api/admin/uef/* routes still exist and read analytics.uef_record directly', () => {
    const reviewRoute = read('app/api/admin/uef/review/route.ts');
    expect(reviewRoute).toContain("from('uef_record')");
    expect(reviewRoute).not.toContain('uefReviewService');
  });

  it('the canonical scoring-record build path is untouched', () => {
    const src = read('lib/live/uef-to-scoring-records.ts');
    expect(src).not.toContain('uefReviewService');
    expect(src).not.toContain('UEFReviewService');
  });
});

describe('B-TRUTH — demo-guard-01 fallback prohibition preserved, unweakened', () => {
  const guard = read('tests/unit/demo-guard-01-kora-index-evidence-fallback.test.ts');

  it('still asserts the kora-index page does not import uefReviewService', () => {
    expect(guard).toContain("does not import uefReviewService");
  });

  it('still asserts the kora-index page does not call getReviewSummary', () => {
    expect(guard).toContain("does not call getReviewSummary");
  });

  it('still asserts no liveUefSummary ?? uefReviewService fallback pattern', () => {
    expect(guard).toContain('liveUefSummary');
  });

  it('the guarded page itself still has zero reference to the retired class', () => {
    const page = read('app/company/kora-index/page.tsx');
    expect(page).not.toContain('uefReviewService');
    expect(page).not.toContain('UEFReviewService');
  });
});

// IngestionPipelineService, and data/synthetic/ingestion-samples.json were
// documented here as untouched (accurately, at that time) — IngestionPipelineService
// was later, separately retired by B-TRUTH Ingestion Pipeline Retirement
// (2026-09-03, its own bounded PR), which also deleted ingestion-samples.json
// (confirmed zero other real consumers at that time). See
// tests/unit/b-truth-ingestion-pipeline-retirement.test.ts.
// EligibilityGateService was documented here as untouched (accurately, at
// that time) — it was later, separately retired by B-TRUTH Eligibility
// Gate Retirement (2026-09-03, its own bounded PR). See
// tests/unit/b-truth-eligibility-gate-retirement.test.ts.
describe('B-TRUTH — this PR retired ONLY UEFReviewService (one PR = one bounded retirement)', () => {
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
  it('registry svc.uef-review entry reflects DEAD, not FROZEN', () => {
    const registry = read('lib/architecture/registry.ts');
    const idx = registry.indexOf("id: 'svc.uef-review'");
    expect(idx).toBeGreaterThan(-1);
    const nextIdx = registry.indexOf("{ id:", idx + 10);
    const entry = registry.slice(idx, nextIdx);
    expect(entry).toContain("status: 'DEAD'");
  });

  it('UEFReviewService.ts was never an I9 allowlist entry — I9 unaffected by this retirement', () => {
    const allowlist = read('lib/security/synthetic-import-allowlist.ts');
    expect(allowlist).not.toContain("'services/uef-review/UEFReviewService.ts'");
  });
});
