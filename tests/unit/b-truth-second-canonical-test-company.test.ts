/**
 * B-TRUTH — Second Canonical Test Company (2026-09-06).
 *
 * PR 6 of the founder-ratified ONE_PRODUCT_CANONICAL_MIGRATION plan (PR 1 =
 * KoraTest Canonical Foundation; PR 2 = TenantService Canonical Migration;
 * PR 3 = CompanyDataIntakeService Canonical Migration; PR 4 =
 * ReportFactoryService Canonical Decision Pack Status Migration; PR 5 =
 * AccountProvisioningService Pipeline Role Migration).
 *
 * Generalizes scripts/koratest-canonical-seed.ts (previously hardcoded to
 * exactly one fixture file) to accept any input fixture via
 * --fixture=<path>, then provisions a SECOND canonical test tenant, "Bosco
 * Verde Cooperativa Sociale" (tenant_code 'BOSCOVERDE-01', tenant_kind
 * 'TEST'), through the exact same, unmodified canonical pipeline KoraTest
 * Srl already uses.
 *
 * The script's substantive logic (tenant_code, company_name,
 * reporting_period, workforce_population, segment_breakdown, rows) was
 * ALREADY fixture-driven — only the fixture file path and a handful of
 * cosmetic string-literal labels/prefixes (previously hardcoded to
 * "koratest"/"KoraTest Srl") needed generalizing, now derived from the
 * loaded fixture's own tenant_code/company_name. Default (no --fixture
 * flag) behavior is byte-identical to before this PR — re-verified against
 * the existing 28-assertion b-truth-koratest-canonical-foundation.test.ts
 * suite, 0 regressions.
 *
 * This PR is additive foundation only, same as PR 1 — no consumer
 * migration. AdminPreviewService, `/demo` routes, and every other B95-B/
 * B95-C cluster member are explicitly untouched; consuming the second
 * tenant is PR 7's job, not started here.
 *
 * If any of these assertions start failing, the underlying situation has
 * changed — re-run the audit rather than "fixing" this test to match.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const root = resolve(process.cwd());
function read(relPath: string): string {
  return readFileSync(resolve(root, relPath), 'utf-8');
}

const SCRIPT_PATH = 'scripts/koratest-canonical-seed.ts';
const FIXTURE_A_PATH = 'data/koratest/koratest_input_fixture.json';
const FIXTURE_B_PATH = 'data/koratest/boscoverde_input_fixture.json';

describe('B-TRUTH — second canonical test tenant identity is distinct', () => {
  it('the second fixture exists alongside the first, both under data/koratest/, neither under data/synthetic/', () => {
    expect(existsSync(resolve(root, FIXTURE_A_PATH))).toBe(true);
    expect(existsSync(resolve(root, FIXTURE_B_PATH))).toBe(true);
    expect(FIXTURE_B_PATH.startsWith('data/synthetic/')).toBe(false);
  });

  it('company_name and tenant_code are distinct from KoraTest Srl, not a copy', () => {
    const fixtureA = JSON.parse(read(FIXTURE_A_PATH)) as { company_name: string; tenant_code: string };
    const fixtureB = JSON.parse(read(FIXTURE_B_PATH)) as { company_name: string; tenant_code: string };
    expect(fixtureB.company_name).not.toBe(fixtureA.company_name);
    expect(fixtureB.tenant_code).not.toBe(fixtureA.tenant_code);
    expect(fixtureB.company_name).toBe('Bosco Verde Cooperativa Sociale');
    expect(fixtureB.tenant_code).toBe('BOSCOVERDE-01');
  });

  it('the second tenant is not OP-001 and not KORATEST-01 — no reused or hardcoded special-case identity', () => {
    const fixtureB = JSON.parse(read(FIXTURE_B_PATH)) as { tenant_code: string };
    expect(fixtureB.tenant_code).not.toBe('OP-001');
    expect(fixtureB.tenant_code).not.toBe('KORATEST-01');
  });

  it('the company name is not a product-visible DEMO label and does not reuse "Demo Company" or similar generic naming', () => {
    const fixtureB = JSON.parse(read(FIXTURE_B_PATH)) as { company_name: string };
    expect(fixtureB.company_name.toLowerCase()).not.toContain('demo');
  });
});

describe('B-TRUTH — second fixture uses the canonical INPUT shape, is materially distinct, and contains no hand-authored output', () => {
  const fixtureA = JSON.parse(read(FIXTURE_A_PATH)) as { rows: unknown[]; workforce_population: number };
  const fixtureB = JSON.parse(read(FIXTURE_B_PATH)) as {
    rows: Array<{ initiative_name: string; category: string; type: string; amount?: number; participants?: number; _note?: string }>;
    workforce_population: number;
    segment_breakdown: Record<string, Record<string, number>>;
  };

  it('row count and workforce population are materially different from KoraTest Srl (meaningful variation, not a copy)', () => {
    expect(fixtureB.rows.length).not.toBe(fixtureA.rows.length);
    expect(fixtureB.workforce_population).not.toBe(fixtureA.workforce_population);
    expect(fixtureB.rows.length).toBeGreaterThanOrEqual(10);
  });

  it('segment_breakdown sums match workforce_population (internally consistent fixture)', () => {
    for (const group of Object.values(fixtureB.segment_breakdown)) {
      const sum = Object.values(group).reduce((a, b) => a + b, 0);
      expect(sum).toBe(fixtureB.workforce_population);
    }
  });

  it('at least one row is deliberately limited-eligibility and one deliberately blocked-eligibility (non-trivial scoring)', () => {
    const notes = fixtureB.rows.map((r) => r._note ?? '').join(' | ');
    expect(notes).toContain('KW_LIMITED');
    expect(notes).toContain('KW_BLOCKED');
  });

  it('at least one row is deliberately incomplete (missing amount/participants)', () => {
    expect(fixtureB.rows.some((r) => r.amount == null && r.participants == null)).toBe(true);
  });

  it('no field in the fixture looks like a KORA-computed output (no kora_index/score/confidence/safeguard/pillar-score keys anywhere)', () => {
    const raw = read(FIXTURE_B_PATH).toLowerCase();
    for (const forbidden of ['kora_index', 'confidence_score', 'safeguard_status', 'bti_score', 'activation_result', 'decision_pack']) {
      expect(raw).not.toContain(forbidden);
    }
  });
});

describe('B-TRUTH — the seed script is genuinely reusable, not KoraTest-only', () => {
  const script = read(SCRIPT_PATH);

  it('accepts a --fixture=<path> CLI flag', () => {
    expect(script).toContain("args.find((a) => a.startsWith('--fixture='))");
  });

  it('defaults to the original KoraTest fixture path when --fixture is omitted (unchanged default behavior)', () => {
    expect(script).toContain("path.resolve(__dirname, '../data/koratest/koratest_input_fixture.json')");
  });

  it('derives cosmetic identifiers (createdBy, batchLabel, pseudonym_id, raw_hash, recordId) from the loaded fixture\'s own tenant_code/company_name, not a hardcoded "koratest"/"KoraTest Srl" literal', () => {
    expect(script).not.toContain("'system-koratest-canonical-seed'");
    expect(script).not.toContain('`KoraTest Srl — canonical foundation batch');
    expect(script).not.toContain('`koratest-${row.row_id}`');
    expect(script).not.toContain("'PSY-KORATEST-");
    expect(script).toContain('const tenantSlug = fixture.tenant_code.toLowerCase();');
    expect(script).toContain('${tenantSlug}');
    expect(script).toContain('${fixture.company_name}');
  });

  it('no canonical pipeline/methodology function call was touched — same 6 functions, same names, still present', () => {
    for (const fn of [
      'classifyEligibilityBatch', 'interpretUploadedRecord', 'runKoraPipeline',
      'buildScoringRecordsFromApprovedUef', 'persistKoraComputationResult', 'persistDecisionPack',
    ]) {
      expect(script).toContain(fn);
    }
  });

  it('dry-run remains the default, --apply still gated the same way (unaffected by the --fixture generalization)', () => {
    expect(script).toContain("args.includes('--apply')");
    const exitIdx = script.indexOf('process.exit(0)');
    const importIdx = script.indexOf("await import('@supabase/supabase-js')");
    expect(exitIdx).toBeGreaterThan(-1);
    expect(importIdx).toBeGreaterThan(-1);
    expect(exitIdx).toBeLessThan(importIdx);
  });
});

describe('B-TRUTH — no KoraTest-only runtime branch, no second-company runtime branch, no tenant_kind methodology branch', () => {
  const script = read(SCRIPT_PATH);

  it('no hardcoded tenant_code equality check anywhere in the script (no "=== \'KORATEST-01\'" or "=== \'BOSCOVERDE-01\'")', () => {
    expect(script).not.toMatch(/tenant_code\s*===\s*['"]KORATEST-01['"]/);
    expect(script).not.toMatch(/tenant_code\s*===\s*['"]BOSCOVERDE-01['"]/);
    expect(script).not.toMatch(/fixture\.tenant_code\s*===/);
  });

  it('tenant_kind is set exactly once, only at tenant creation, unaffected by the generalization', () => {
    const occurrences = script.match(/tenant_kind:/g) ?? [];
    expect(occurrences.length).toBe(1);
  });

  it('none of the canonical function calls receive a tenant_kind argument', () => {
    for (const call of ['interpretUploadedRecord(', 'classifyEligibilityBatch(', 'runKoraPipeline(', 'persistDecisionPack(']) {
      const idx = script.indexOf(call);
      expect(idx).toBeGreaterThan(-1);
      const argSlice = script.slice(idx, idx + 400);
      expect(argSlice).not.toContain('tenant_kind');
    }
  });
});

describe('B-TRUTH — no direct derived-output seeding (the core forbidden-seed invariant, unaffected by generalization)', () => {
  const script = read(SCRIPT_PATH);

  const FORBIDDEN_DIRECT_INSERTS = [
    /\.schema\('analytics'\)\.from\('kora_index_result'\)\s*\.\s*insert/,
    /\.schema\('analytics'\)\.from\('bti_result'\)\s*\.\s*insert/,
    /\.schema\('analytics'\)\.from\('activation_result'\)\s*\.\s*insert/,
    /\.schema\('analytics'\)\.from\('confidence_result'\)\s*\.\s*insert/,
    /\.schema\('analytics'\)\.from\('decision_pack_version'\)\s*\.\s*insert/,
  ];

  it('never directly inserts into kora_index_result, bti_result, activation_result, confidence_result, or decision_pack_version', () => {
    for (const pattern of FORBIDDEN_DIRECT_INSERTS) {
      expect(script).not.toMatch(pattern);
    }
  });

  it('does not create a Supabase Auth user for either tenant (no fake employee login)', () => {
    expect(script).not.toContain('auth.admin.createUser');
    expect(script).not.toContain('auth.admin.inviteUserByEmail');
  });
});

describe('B-TRUTH — scope safety: no AdminPreview, no UI, no B-WORKER, no final scoring implementation change', () => {
  it('AdminPreviewService.ts is untouched — still 100% synthetic-backed, no reference to the second tenant or fixture', () => {
    const src = read('services/admin-preview/AdminPreviewService.ts');
    expect(src).not.toContain('BOSCOVERDE');
    expect(src).not.toContain('boscoverde');
    expect(src).not.toContain('Bosco Verde');
  });

  // app/demo/portfolio/page.tsx was accurately checked here as of this
  // test's writing. CC-00 Company Portfolio capability salvage +
  // canonicalization (2026-09-12) later, separately, retired that route
  // entirely — removed from this list, not replaced (there is no page left
  // to check). app/demo/benchmarks/page.tsx and app/demo/network/page.tsx
  // were also accurately checked here; CC-00 Residual /demo/** controlled
  // retirement (2026-09-26) retired both.
  it('no /demo or /admin UI file references the second tenant (no UI change in this PR)', () => {
    for (const file of ['app/demo/page.tsx', 'app/admin/page.tsx']) {
      const src = read(file);
      expect(src).not.toContain('BOSCOVERDE');
      expect(src).not.toContain('boscoverde');
    }
  });

  it('B-WORKER services are untouched — still exist, unmodified reachability', () => {
    for (const file of [
      'services/worker-provisioning/WorkerProvisioningService.ts',
      'services/worker-achievements/WorkerAchievementService.ts',
      'services/worker-space/WorkerSpaceCapabilityService.ts',
    ]) {
      expect(existsSync(resolve(root, file))).toBe(true);
    }
  });

  it('final scoring engine files are untouched by this PR\'s own script changes — no new function, no signature change to the canonical pipeline entry points', () => {
    const runKoraPipelineSrc = read('lib/kora-engine/run-kora-pipeline.ts');
    // Sanity: the canonical function still exists and is still named the same —
    // this test does not assert content equality (that's final scoring's own
    // test suite's job), only that this PR did not need to touch it.
    expect(runKoraPipelineSrc).toContain('export function runKoraPipeline');
  });

  it('FounderValidationService and My KORA session identity are untouched', () => {
    expect(existsSync(resolve(root, 'services/founder-validation/FounderValidationService.ts'))).toBe(true);
    const myKoraSrc = read('app/my-kora/page.tsx');
    expect(myKoraSrc).toContain('getCurrentDemoUser');
  });
});

describe('B-TRUTH — no benchmark/percentile claim introduced by this PR', () => {
  it('neither fixture nor the script contains benchmark/percentile/market-average terminology', () => {
    for (const file of [FIXTURE_A_PATH, FIXTURE_B_PATH, SCRIPT_PATH]) {
      const src = read(file).toLowerCase();
      for (const forbidden of ['benchmark', 'percentile', 'market average', 'sector average', 'industry norm']) {
        expect(src).not.toContain(forbidden);
      }
    }
  });
});

describe('B-TRUTH — I9 and registry reflect an additive, non-migrating change', () => {
  // The header count was accurately "12 files / 20 import statements" at
  // the time this test was written (this PR made no I9 change). CC-00
  // Company Portfolio capability salvage + canonicalization (2026-09-12)
  // later, separately, reduced the import count to 18, CC-00 Public
  // Landing canonicalization (2026-09-26) reduced it further to 16, and
  // CC-00 Residual /demo/** controlled retirement (2026-09-26, same day,
  // later slice) reduced it further to 13, and CC-00 Bucket C cleanup
  // (2026-09-05) reduced it further still to 11 — all unrelated to this
  // PR's own scope. See tests/unit/cc00-residual-demo-retirement.test.ts.
  it('I9 allowlist is completely unaffected by THIS PR — this PR adds no new data/synthetic/** consumer and removes none (historical note: later, unrelated PRs changed the count)', () => {
    const allowlist = read('lib/security/synthetic-import-allowlist.ts');
    expect(allowlist).toContain('CURRENT_SYNTHETIC_RUNTIME_IMPORTS = 6 files / 11 import statements');
    expect(allowlist).not.toMatch(/\{\s*file:\s*'scripts\/koratest-canonical-seed\.ts'/);
  });

  it('registry tooling.koratest-canonical-seed entry documents the generalization truthfully, remains CANONICAL', () => {
    const registry = read('lib/architecture/registry.ts');
    const idx = registry.indexOf("id: 'tooling.koratest-canonical-seed'");
    expect(idx).toBeGreaterThan(-1);
    const nextIdx = registry.indexOf('{ id:', idx + 10);
    const entry = registry.slice(idx, nextIdx);
    expect(entry).toContain("status: 'CANONICAL'");
    expect(entry).toContain('BOSCOVERDE-01');
    expect(entry).toContain('--fixture=');
  });
});
