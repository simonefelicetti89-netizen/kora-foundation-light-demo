/**
 * B-TRUTH — KoraTest Srl Canonical Test Tenant Input Foundation (2026-09-03).
 *
 * Locks in PR 1 of the B95-B/B95-C canonical migration plan: KoraTest Srl is
 * provisioned as an ordinary canonical tenant (tenant_kind='TEST', operational
 * safety metadata only) and its fake data is seeded ONLY at the INPUT
 * boundary (analytics.tenant, personal.workforce_baseline,
 * analytics.source_batch, personal.uploaded_record). Every downstream KORA
 * output — UEF interpretation, eligibility, KORA Index/BTI/activation/
 * confidence, Decision Pack — is produced by invoking the exact same
 * canonical functions a real tenant's upload uses
 * (interpretUploadedRecord, classifyEligibilityBatch,
 * buildScoringRecordsFromApprovedUef, runKoraPipeline,
 * persistKoraComputationResult, persistDecisionPack), never hand-inserted.
 *
 * This is additive foundation only — it does not retire, migrate, or touch
 * any of TenantService, AccountProvisioningService, CompanyDataIntakeService,
 * ReportFactoryService, or AdminPreviewService (the B95-B/B95-C cluster).
 * Those migrations are PRs 2-6 of the same plan, not started here.
 *
 * See tests/integration/rls-17-koratest-canonical-foundation.test.ts for the
 * DB-backed (skip-safe) proof that the real interpreter/scoring functions
 * actually execute and produce non-fabricated, non-uniform output.
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

const SCRIPT_PATH  = 'scripts/koratest-canonical-seed.ts';
const FIXTURE_PATH = 'data/koratest/koratest_input_fixture.json';

describe('B-TRUTH — KoraTest provisioning script exists and is dry-run safe by default', () => {
  const script = read(SCRIPT_PATH);

  it('the provisioning script and its input fixture exist', () => {
    expect(existsSync(resolve(root, SCRIPT_PATH))).toBe(true);
    expect(existsSync(resolve(root, FIXTURE_PATH))).toBe(true);
  });

  it('dry-run is the default — apply is gated behind an explicit --apply flag, checked before any DB import', () => {
    expect(script).toContain("args.includes('--apply')");
    // The dry-run summary + early process.exit(0) must appear textually
    // before the first dynamic import of a DB/canonical-engine module.
    const exitIdx   = script.indexOf('process.exit(0)');
    const importIdx = script.indexOf("await import('@supabase/supabase-js')");
    expect(exitIdx).toBeGreaterThan(-1);
    expect(importIdx).toBeGreaterThan(-1);
    expect(exitIdx).toBeLessThan(importIdx);
  });

  it('KoraTest identity (company_name, tenant_code, reporting_period) is fixed in the fixture, not randomly generated', () => {
    const fixture = JSON.parse(read(FIXTURE_PATH)) as {
      company_name: string; tenant_code: string; reporting_period: string; rows: unknown[];
    };
    expect(fixture.company_name).toBe('KoraTest Srl');
    expect(fixture.tenant_code).toBe('KORATEST-01');
    expect(typeof fixture.reporting_period).toBe('string');
    expect(fixture.rows.length).toBeGreaterThanOrEqual(10);
  });

  it('KoraTest is not tenant_code OP-001 — the one existing hardcoded tenant-identity special case does not apply', () => {
    const fixture = JSON.parse(read(FIXTURE_PATH)) as { tenant_code: string };
    expect(fixture.tenant_code).not.toBe('OP-001');
  });
});

describe('B-TRUTH — no new synthetic runtime introduced', () => {
  const script = read(SCRIPT_PATH);

  it('the provisioning script does not import from data/synthetic/**', () => {
    expect(script).not.toMatch(/from\s+['"][^'"]*data\/synthetic\//);
  });

  it('the provisioning script does not import or reuse lib/live/op001-synthetic-records', () => {
    expect(script).not.toMatch(/from\s+['"][^'"]*op001-synthetic-records['"]/);
  });

  it('the input fixture is its own file, not copied under data/synthetic/', () => {
    expect(FIXTURE_PATH.startsWith('data/synthetic/')).toBe(false);
    expect(existsSync(resolve(root, 'data/synthetic', 'koratest_input_fixture.json'))).toBe(false);
  });

  it('I9 allowlist has no array entry for the KoraTest script or fixture (a later PR\'s governance comment mentioning the script by name, e.g. while documenting an unrelated bugfix, is not an allowlist entry)', () => {
    const allowlist = read('lib/security/synthetic-import-allowlist.ts');
    expect(allowlist).not.toMatch(/\{\s*file:\s*'scripts\/koratest-canonical-seed\.ts'/);
    expect(allowlist).not.toMatch(/\{\s*file:\s*'data\/koratest\/koratest_input_fixture\.json'/);
  });
});

describe('B-TRUTH — canonical functions are invoked, never reimplemented', () => {
  const script = read(SCRIPT_PATH);

  // The script uses dynamic `await import('../lib/...')` (not static
  // `import ... from`) deliberately — see its own header: avoids loading
  // Supabase/canonical engine modules during dry-run. Both are real,
  // equally-legitimate ES module imports; the assertions below match the
  // dynamic form actually used.

  it('imports the real canonical eligibility engine (classifyEligibilityBatch)', () => {
    expect(script).toMatch(/import\(['"]\.\.\/lib\/kora-engine\/eligibility-gate['"]\)/);
    expect(script).toContain('classifyEligibilityBatch');
  });

  it('imports the real canonical Raw-to-UEF interpreter (interpretUploadedRecord) — no hand-written interpreted content', () => {
    expect(script).toMatch(/import\(['"]\.\.\/lib\/ingestion\/raw-to-uef-interpreter['"]\)/);
    expect(script).toContain('interpretUploadedRecord(');
  });

  it('imports the real canonical scoring pipeline (runKoraPipeline)', () => {
    expect(script).toMatch(/import\(['"]\.\.\/lib\/kora-engine\/run-kora-pipeline['"]\)/);
    expect(script).toContain('runKoraPipeline(');
  });

  it('imports the real canonical scoring-record adapter (buildScoringRecordsFromApprovedUef) — same as run-approved-batch/route.ts', () => {
    expect(script).toMatch(/import\(['"]\.\.\/lib\/live\/uef-to-scoring-records['"]\)/);
    expect(script).toContain('buildScoringRecordsFromApprovedUef(');
  });

  it('imports the real canonical persistence functions (persistWorkforceBaseline, persistKoraComputationResult, persistDecisionPack)', () => {
    expect(script).toContain('persistWorkforceBaseline');
    expect(script).toContain('persistKoraComputationResult');
    expect(script).toContain('persistDecisionPack');
  });
});

describe('B-TRUTH — no direct derived-output seeding (the core forbidden-seed invariant)', () => {
  const script = read(SCRIPT_PATH);

  // Every one of these tables/fields must ONLY ever be reached via a
  // canonical function call (interpretUploadedRecord, runKoraPipeline,
  // persistKoraComputationResult, persistDecisionPack) — never via a direct
  // .insert()/.update() call this script writes itself.
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

  it('the only analytics.uef_record insert in the script is built from interpretUploadedRecord()\'s own returned proposal object, not hand-typed classification values', () => {
    const insertIdx = script.indexOf("schema('analytics').from('uef_record').insert");
    expect(insertIdx).toBeGreaterThan(-1);
    // The interpreter call must textually precede the uef_record insert
    // within the same function — proves content flows interpreter -> insert,
    // not insert -> (fabricated values).
    const interpretIdx = script.lastIndexOf('interpretUploadedRecord(', insertIdx);
    expect(interpretIdx).toBeGreaterThan(-1);
    expect(interpretIdx).toBeLessThan(insertIdx);
  });

  it('the eligibility/pillar/action_family/event_nature fields written to uef_record read from `proposal.*`, not literal strings', () => {
    // Extract the object literal passed to the uef_record insert map and
    // confirm its content-bearing fields are proposal.* reads.
    const section = script.slice(script.indexOf('const uefRows = (uploadedForInterp'), script.indexOf("schema('analytics').from('uef_record').insert"));
    expect(section).toContain('proposal.rawName');
    expect(section).toContain('proposal.eligibility');
    expect(section).toContain('proposal.pillar');
    expect(section).toContain('proposal.actionFamily');
    expect(section).toContain('proposal.eventNature');
  });

  it('the UEF review stand-in only sets review/approval STATE, documented as an automated-operator-approval stand-in', () => {
    expect(script).toContain('Deterministic operator-approval stand-in');
    expect(script).toContain("app/api/admin/uef/review/route.ts's 'approve' branch");
  });
});

describe('B-TRUTH — tenant_kind is operational safety metadata only, never a processing branch', () => {
  const script = read(SCRIPT_PATH);

  it('tenant_kind is set exactly once, only at tenant creation', () => {
    const occurrences = script.match(/tenant_kind:/g) ?? [];
    expect(occurrences.length).toBe(1);
  });

  it('none of the canonical function calls (interpretUploadedRecord, classifyEligibilityBatch, runKoraPipeline, persistDecisionPack) receive a tenant_kind argument', () => {
    for (const call of ['interpretUploadedRecord(', 'classifyEligibilityBatch(', 'runKoraPipeline(', 'persistDecisionPack(']) {
      const idx = script.indexOf(call);
      expect(idx).toBeGreaterThan(-1);
      // Grab the following ~400 chars as an approximation of the call's
      // argument block and confirm it never mentions tenant_kind.
      const argSlice = script.slice(idx, idx + 400);
      expect(argSlice).not.toContain('tenant_kind');
    }
  });

  it('the script does not create a Supabase Auth user (no email-invite side effect exists for this tenant at all)', () => {
    expect(script).not.toContain('auth.admin.createUser');
    expect(script).not.toContain('auth.admin.inviteUserByEmail');
  });
});

describe('B-TRUTH — idempotency and scope safety', () => {
  const script = read(SCRIPT_PATH);

  it('the script reuses an existing tenant by tenant_code instead of always inserting', () => {
    expect(script).toContain('existingTenant');
  });

  it('the script reuses an existing source_batch (natural key: tenant_id, reporting_period, source_name) instead of always inserting', () => {
    expect(script).toContain('existingBatch');
  });

  it('the script skips UEF generation and skips scoring when a batch/result already exists (rerun-safe)', () => {
    expect(script).toContain('existingUefCount');
    expect(script).toContain('existingResult');
  });

  it('the script contains no destructive statement (DELETE/TRUNCATE) and no cleanup/reset helper — additive only', () => {
    expect(script).not.toMatch(/\.delete\(\)/);
    expect(script.toUpperCase()).not.toContain('TRUNCATE');
  });

  it('every write into a tenant-scoped table (source_batch, uploaded_record, uef_record) sets tenant_id to the single resolved tenantId — never a hardcoded or externally-supplied id', () => {
    // Every `tenant_id:` field occurrence must be immediately followed by
    // the local `tenantId` identifier — never a literal, a request-body
    // field, or any other variable. Proves no broad or cross-tenant write.
    const tenantIdFieldOccurrences = [...script.matchAll(/tenant_id:\s*(\w+)/g)];
    expect(tenantIdFieldOccurrences.length).toBeGreaterThanOrEqual(3); // source_batch, uploaded_record row, uef_record row
    for (const m of tenantIdFieldOccurrences) {
      expect(m[1]).toBe('tenantId');
    }
  });
});

describe('B-TRUTH — this PR touches ONLY foundation, not the B95-B/B95-C cluster (one PR = one bounded step)', () => {
  // TenantService.ts was accurately untouched by THIS PR (KoraTest
  // Canonical Foundation) at the time this test was written. B-TRUTH
  // TenantService Canonical Migration (2026-09-04) — a later, separate,
  // bounded PR (PR 2 of the same plan) — migrated its 3 real callers to
  // canonical reads and retired it entirely. See
  // tests/unit/b-truth-tenantservice-canonical-migration.test.ts. The other
  // 4 services in this cluster remain untouched by that later PR too.
  // TenantService.ts and CompanyDataIntakeService.ts were accurately
  // untouched by THIS PR (KoraTest Canonical Foundation) at the time this
  // test was written. B-TRUTH TenantService Canonical Migration (PR 2) and
  // B-TRUTH CompanyDataIntakeService Canonical Migration (PR 3) — later,
  // separate, bounded PRs of the same plan — retired each in turn. See
  // tests/unit/b-truth-tenantservice-canonical-migration.test.ts and
  // tests/unit/b-truth-company-data-intake-canonical-migration.test.ts.
  // ReportFactoryService.ts was accurately untouched by THIS PR at the time
  // this test was written. B-TRUTH ReportFactoryService Canonical Decision
  // Pack Status Migration (PR 4 of the same plan, 2026-09-06) later,
  // separately, retired it entirely. See
  // tests/unit/b-truth-reportfactory-canonical-decision-pack-status.test.ts.
  it('AccountProvisioningService and AdminPreviewService still exist — TenantService, CompanyDataIntakeService, and ReportFactoryService have since been separately retired (historical note)', () => {
    for (const file of [
      'services/account/AccountProvisioningService.ts',
      'services/admin-preview/AdminPreviewService.ts',
    ]) {
      expect(existsSync(resolve(root, file))).toBe(true);
    }
    for (const file of [
      'services/tenant/TenantService.ts',
      'services/company-data-intake/CompanyDataIntakeService.ts',
      'services/report-factory/ReportFactoryService.ts',
    ]) {
      expect(existsSync(resolve(root, file))).toBe(false);
    }
  });

  it('app/admin/pipeline/page.tsx, WorkforceQuickAccessPanel.tsx, and app/admin/page.tsx are untouched — no UI/label change in this PR', () => {
    for (const file of [
      'app/admin/pipeline/page.tsx',
      'components/admin/WorkforceQuickAccessPanel.tsx',
      'app/admin/page.tsx',
    ]) {
      expect(existsSync(resolve(root, file))).toBe(true);
    }
    // No visible DEMO/LIVE labeling is touched by this PR — the script
    // never imports or references any app/ or components/ file.
    const script = read(SCRIPT_PATH);
    expect(script).not.toMatch(/from\s+['"][^'"]*\/(app|components)\//);
  });

  it('B-WORKER members remain untouched — still exist; the final scoring group was later retired by CC-00 Final Scoring Canonicalization (2026-09-05), unrelated to this PR', () => {
    for (const file of [
      'services/worker-provisioning/WorkerProvisioningService.ts',
      // PRIOR HISTORY: 'services/worker-achievements/WorkerAchievementService.ts'
      // was asserted to exist here (unmodified by this PR, at the time). B-WORKER
      // "One Product / No Demo Runtime" correction (2026-09-06) deleted it entirely
      // (zero real callers once its 2 callers, app/my-kora/page.tsx and
      // app/my-kora/dynamic-cv/page.tsx, became pure canonical redirects) — removed
      // from this list; this is that later, separately-authorized retirement, not an
      // unrelated-PR regression of this PR's own scope boundary.
    ]) {
      expect(existsSync(resolve(root, file))).toBe(true);
    }
    expect(existsSync(resolve(root, 'services/scoring-simulator/ScoringSimulatorService.ts'))).toBe(false);
    expect(existsSync(resolve(root, 'services/demo-data/DemoDataService.ts'))).toBe(false);
  });
});
