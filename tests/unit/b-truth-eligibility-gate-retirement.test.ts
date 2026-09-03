/**
 * B-TRUTH — Eligibility Gate Retirement (2026-09-03).
 *
 * Locks in the retirement of services/eligibility-gate/EligibilityGateService.ts
 * (the legacy demo taxonomy/preprocessing classifier) and its sole seed file,
 * data/synthetic/action-taxonomy.json.
 *
 * Re-verified independently before deletion (not trusted from the prior
 * B-TRUTH Zero-Caller Comparison audit alone): all 4 public methods
 * (classifyAction, classifyActions, getActionTaxonomy, getEligibilitySummary)
 * individually confirmed zero real callers, zero type-only callers.
 *
 * CORRECTION to this service's own header and this session's prior audit
 * notes (recorded here, not silently dropped): the header claimed real usage
 * by "Admin BCM Mapping Review (AI Upload Studio)", "Pre-ingestion operator
 * classification UI", and "Taxonomy exploration". Tracing the actual live
 * routes found this stale — no taxonomy-exploration UI exists anywhere, and
 * the real, scoring-authoritative eligibility engine,
 * lib/kora-engine/eligibility-gate.ts (classifyEligibilityBatch), is used
 * directly — with its own explicit "no duplication" comment — by all 3 real
 * admin data-intake routes (upload-preview, preview, accept).
 * tests/unit/eligibility-gate.test.ts's pre-existing "B71 regression guard"
 * independently corroborates that the live scoring pipeline routes through
 * the canonical file, never through this one.
 *
 * Legacy rule nuances present only in the retired file (CCNL/
 * contractual_mandatory override, Academy/Operations ambiguity detection,
 * keyword-matching against action-taxonomy.json) were inventoried and
 * classified: none qualify as MUST_MIGRATE_BEFORE_RETIREMENT — the service's
 * own header already disclaimed scoring authority ("IT DOES NOT CONTROL
 * SCORING"), and canonical was always the sole scoring-authoritative engine
 * regardless of this file's existence, with zero live callers currently
 * exercising any of this file's own rules.
 *
 * data/synthetic/action-taxonomy.json was confirmed to have exactly ONE
 * real, value-level consumer (this service itself) before deletion — the
 * other apparent hits (a UI step-label string in
 * app/admin/kora-activation-layer/page.tsx, a code comment in
 * lib/partner-activities/catalog.ts, and a prior retirement test's own
 * non-usage assertion) are non-functional.
 *
 * NOT touched by this retirement (separate, later, bounded slices):
 * ReportFactoryService, ExplainabilityService, the final scoring group,
 * canonical ingestion/data-intake (MappingConfidenceService,
 * missing-field-analysis.ts, classifyEligibilityBatch,
 * run-kora-pipeline), canonical UEF path.
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

describe('B-TRUTH — EligibilityGateService no longer exists', () => {
  it('the service file is gone', () => {
    expect(existsSync(resolve(root, 'services/eligibility-gate/EligibilityGateService.ts'))).toBe(false);
  });

  it('its directory is gone (no leftover empty dir)', () => {
    expect(existsSync(resolve(root, 'services/eligibility-gate'))).toBe(false);
  });

  it('its sole synthetic seed file is gone (exactly one real consumer, confirmed before deletion)', () => {
    expect(existsSync(resolve(root, 'data/synthetic/action-taxonomy.json'))).toBe(false);
  });

  it('no runtime file (app/services/lib/components), excluding governance docs and tests, imports, instantiates, or calls it', () => {
    const offenders: string[] = [];
    const REAL_USAGE = /(?:^|\s)import\s[^;]*EligibilityGateService[^;]*from|from\s*['"][^'"]*eligibility-gate\/EligibilityGateService['"]|new\s+EligibilityGateService\s*\(|eligibilityGateService\s*\./m;
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

  it('no runtime file actually imports/reads the retired action-taxonomy.json fixture (excluding governance docs, tests, and the one known non-functional comment mention in lib/partner-activities/catalog.ts)', () => {
    // lib/partner-activities/catalog.ts:19 mentions "data/synthetic/action-taxonomy.json"
    // inside a plain code comment (no import, no fs read) — confirmed
    // non-functional before this service's deletion; kept as historical
    // prose, not acted on here.
    const KNOWN_COMMENT_ONLY = new Set(['lib/partner-activities/catalog.ts']);
    const offenders: string[] = [];
    const REAL_USAGE = /from\s*['"][^'"]*action-taxonomy\.json['"]|readFileSync\([^)]*action-taxonomy\.json|require\(['"][^'"]*action-taxonomy\.json['"]\)/;
    for (const dir of RUNTIME_DIRS) {
      for (const file of walkTs(resolve(root, dir))) {
        const relative = file.replace(root + '/', '');
        if (EXCLUDED_DOCS.has(relative)) continue;
        if (KNOWN_COMMENT_ONLY.has(relative)) continue;
        if (relative.endsWith('.test.ts')) continue;
        if (REAL_USAGE.test(read(relative))) offenders.push(relative);
      }
    }
    expect(offenders).toEqual([]);
  });
});

describe('B-TRUTH — canonical eligibility engine remains untouched and independent', () => {
  it('lib/kora-engine/eligibility-gate.ts (classifyEligibilityBatch) still exists, no import of or dependency on the retired file (a doc comment distinguishing the two files by name is expected and preserved)', () => {
    const src = read('lib/kora-engine/eligibility-gate.ts');
    expect(src).toContain('classifyEligibilityBatch');
    expect(src).not.toMatch(/import\s[^;]*EligibilityGateService|from\s*['"][^'"]*eligibility-gate\/EligibilityGateService['"]|new\s+EligibilityGateService\s*\(/);
  });

  it('the 3 real admin data-intake routes still exist and use the canonical engine directly, no reference to the retired file', () => {
    for (const route of [
      'app/api/admin/data-intake/upload-preview/route.ts',
      'app/api/admin/data-intake/preview/route.ts',
      'app/api/admin/data-intake/accept/route.ts',
    ]) {
      const src = read(route);
      expect(src).not.toContain('EligibilityGateService');
    }
  });

  it('tests/unit/eligibility-gate.test.ts still asserts the B71 canonical-routing regression guard', () => {
    const src = read('tests/unit/eligibility-gate.test.ts');
    expect(src).toContain('B71');
    expect(src).toContain('classifyEligibilityBatch');
  });
});

describe('B-TRUTH — type family preserved, no opportunistic cleanup', () => {
  it('EligibilityClassificationInput and EligibilityClassificationResult remain defined in lib/types', () => {
    const src = read('lib/types/index.ts');
    expect(src).toContain('EligibilityClassificationInput');
    expect(src).toContain('EligibilityClassificationResult');
  });
});

// The Ingestion/UEF legacy chain (IngestionPipelineService, UEFReviewService)
// was already fully, independently retired by earlier bounded PRs before
// this one. This PR retires the last remaining member of that chain.
describe('B-TRUTH — this PR retired ONLY EligibilityGateService and its fixture (one PR = one bounded retirement)', () => {
  it('ReportFactoryService and the live methodology glossary untouched', () => {
    expect(existsSync(resolve(root, 'services/report-factory/ReportFactoryService.ts'))).toBe(true);
    const glossary = read('services/explainability/ExplainabilityService.ts');
    expect(glossary).toContain('getConceptExplanation(');
  });

  it('the rest of the Ingestion/UEF legacy chain was already retired by earlier PRs, not by this one', () => {
    for (const file of [
      'services/ingestion-pipeline/IngestionPipelineService.ts',
      'services/uef-review/UEFReviewService.ts',
      'services/ingestion-normalizer/IngestionNormalizerService.ts',
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
});

describe('B-TRUTH — registry and I9 reflect the retirement', () => {
  it('registry svc.eligibility-gate entry reflects DEAD, not CANONICAL', () => {
    const registry = read('lib/architecture/registry.ts');
    const idx = registry.indexOf("id: 'svc.eligibility-gate'");
    expect(idx).toBeGreaterThan(-1);
    const nextIdx = registry.indexOf("{ id:", idx + 10);
    const entry = registry.slice(idx, nextIdx);
    expect(entry).toContain("status: 'DEAD'");
  });

  it('registry svc.eligibility-gate notes document the stale-header correction, not a canonical methodology deletion', () => {
    const registry = read('lib/architecture/registry.ts');
    const idx = registry.indexOf("id: 'svc.eligibility-gate'");
    const nextIdx = registry.indexOf("{ id:", idx + 10);
    const entry = registry.slice(idx, nextIdx);
    expect(entry).toContain('stale-claim correction');
    expect(entry).toContain('NOT a canonical methodology deletion');
  });

  it('allowlist no longer lists the retired service', () => {
    const allowlist = read('lib/security/synthetic-import-allowlist.ts');
    expect(allowlist).not.toMatch(/\{\s*file:\s*'services\/eligibility-gate\/EligibilityGateService\.ts'/);
  });

  it('allowlist header reflects the reduced count, 15 files / 25 imports', () => {
    const allowlist = read('lib/security/synthetic-import-allowlist.ts');
    expect(allowlist).toContain('CURRENT_SYNTHETIC_RUNTIME_IMPORTS = 15 files / 25 import statements');
  });
});
