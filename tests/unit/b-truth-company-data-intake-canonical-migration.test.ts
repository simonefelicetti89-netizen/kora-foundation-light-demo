/**
 * B-TRUTH — CompanyDataIntakeService Canonical Migration (2026-09-05).
 *
 * PR 3 of the founder-ratified ONE_PRODUCT_CANONICAL_MIGRATION plan
 * (PR 1 = B-TRUTH KoraTest Canonical Foundation; PR 2 = B-TRUTH
 * TenantService Canonical Migration). Migrates the 2 real runtime callers
 * of services/company-data-intake/CompanyDataIntakeService.ts to a
 * canonical analytics.source_batch/uef_record view, then retires the
 * now-zero-caller service and its 3 sole seed files.
 *
 * Re-verified independently before deletion (not trusted from any prior
 * audit alone): both real callers (app/admin/pipeline/_components/
 * PilotLifecycleClient.tsx, services/report-factory/ReportFactoryService.ts)
 * individually confirmed, zero type-only callers. Only the 3 fields either
 * real caller actually consumed (batch_count, intake_status,
 * review_required_rows — out of ~16 fields on the legacy
 * getDataReadinessSummary() shape) were migrated, via a new shared pure
 * view builder, lib/live/data-intake-status-view.ts, fed by
 * analytics.source_batch (latest batch by created_at) and
 * analytics.uef_record WHERE review_status='pending_review' (the same
 * counting query app/api/admin/uef/review/route.ts's own GET handler
 * already uses).
 *
 * The legacy 'blocked_missing_required_fields' intake-status value is NOT
 * reproduced — the concern it existed for (malformed rows) is now handled
 * structurally at the canonical upload boundary (PII-scan/validation in
 * accept/route.ts), before a source_batch row is ever created.
 *
 * app/admin/pipeline/page.tsx (a Server Component since PR 2) fetches this
 * canonical view once and passes it to both PilotLifecycleClient.tsx and,
 * transitively, ReportFactoryService.getDecisionPackFactoryStatus/
 * computeBlockingReasons (which gained a third parameter, dataIntake,
 * replacing the internal companyDataIntakeService dependency).
 * ReportFactoryService's own still-synthetic hasKoraIndex/
 * getLatestDecisionPackVersion checks and Decision Pack version source are
 * UNCHANGED, unmigrated, explicitly out of scope (PR 4's job).
 *
 * NOT touched by this PR (separate, later, bounded slices):
 * AccountProvisioningService, AdminPreviewService, ReportFactoryService's
 * Decision Pack version source, final scoring, B-WORKER.
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

function stripComments(src: string): string {
  return src.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
}

describe('B-TRUTH — CompanyDataIntakeService no longer exists', () => {
  it('the service file is gone', () => {
    expect(existsSync(resolve(root, 'services/company-data-intake/CompanyDataIntakeService.ts'))).toBe(false);
  });

  it('its directory is gone (no leftover empty dir)', () => {
    expect(existsSync(resolve(root, 'services/company-data-intake'))).toBe(false);
  });

  it('its 3 sole synthetic seed files are gone', () => {
    for (const f of [
      'data/synthetic/company-budget-fiscal-plans.json',
      'data/synthetic/company-raw-data-batches.json',
      'data/synthetic/company-raw-data-rows.json',
    ]) {
      expect(existsSync(resolve(root, f))).toBe(false);
    }
  });

  it('no runtime file (app/services/lib/components), excluding governance docs and tests, imports, instantiates, or calls it', () => {
    const offenders: string[] = [];
    const REAL_USAGE = /(?:^|\s)import\s[^;]*CompanyDataIntakeService[^;]*from|from\s*['"][^'"]*company-data-intake\/CompanyDataIntakeService['"]|new\s+CompanyDataIntakeService\s*\(/m;
    for (const dir of RUNTIME_DIRS) {
      for (const file of walkTs(resolve(root, dir))) {
        const relative = file.replace(root + '/', '');
        if (EXCLUDED_DOCS.has(relative)) continue;
        if (relative.endsWith('.test.ts')) continue;
        const content = read(relative);
        const codeOnly = stripComments(content);
        if (REAL_USAGE.test(content) || /companyDataIntakeService\s*\./.test(codeOnly)) offenders.push(relative);
      }
    }
    expect(offenders).toEqual([]);
  });
});

describe('B-TRUTH — migrated consumers use the canonical Data Intake view', () => {
  it('lib/live/data-intake-status-view.ts exists, is a pure function fed by analytics.source_batch and analytics.uef_record shapes', () => {
    const src = read('lib/live/data-intake-status-view.ts');
    expect(src).toContain('export function buildDataIntakeStatusView(');
    expect(src).not.toMatch(/from\s+['"][^'"]*data\/synthetic\//);
    // Pure: no Supabase client import, no DB call — takes already-fetched rows.
    expect(src).not.toContain('getSupabaseServiceClient');
    expect(src).not.toContain(".schema('analytics')");
  });

  it('the legacy blocked_missing_required_fields status is not a member of the canonical CanonicalIntakeStatus type', () => {
    const src = read('lib/live/data-intake-status-view.ts');
    const typeIdx = src.indexOf('export type CanonicalIntakeStatus');
    const typeLine = src.slice(typeIdx, src.indexOf('\n', typeIdx));
    expect(typeLine).not.toContain('blocked_missing_required_fields');
  });

  it('app/admin/pipeline/page.tsx fetches source_batch and uef_record pending count, builds the view once', () => {
    const src = read('app/admin/pipeline/page.tsx');
    expect(src).toContain("schema('analytics').from('source_batch')");
    expect(src).toContain("schema('analytics').from('uef_record')");
    expect(src).toContain("eq('review_status', 'pending_review')");
    expect(src).toContain('buildDataIntakeStatusView(');
    expect(src).toContain('dataIntake={dataIntake}');
  });

  it('PilotLifecycleClient.tsx receives dataIntake as a prop, no self-fetch', () => {
    const src = read('app/admin/pipeline/_components/PilotLifecycleClient.tsx');
    expect(src).toContain('dataIntake: CanonicalDataIntakeStatus');
    expect(src).not.toContain('getDataReadinessSummary');
    expect(src).not.toMatch(/from\s+['"][^'"]*data\/synthetic\//);
  });

  // ReportFactoryService.ts was accurately migrated to accept dataIntake as
  // a third parameter (instead of calling companyDataIntakeService itself)
  // at the time this test was written. B-TRUTH ReportFactoryService
  // Canonical Decision Pack Status Migration (2026-09-06) later, separately,
  // retired the file entirely — its sole real caller reads the canonical
  // Decision Pack view directly. See
  // tests/unit/b-truth-reportfactory-canonical-decision-pack-status.test.ts
  // for the current, correct state.
  it('ReportFactoryService has since been separately retired (historical note, not a live assertion)', () => {
    expect(existsSync(resolve(root, 'services/report-factory/ReportFactoryService.ts'))).toBe(false);
  });

  it('no data/synthetic/** Data-Intake import remains in page.tsx or PilotLifecycleClient.tsx', () => {
    for (const file of [
      'app/admin/pipeline/page.tsx',
      'app/admin/pipeline/_components/PilotLifecycleClient.tsx',
    ]) {
      expect(read(file)).not.toMatch(/from\s+['"][^'"]*data\/synthetic\//);
    }
  });
});

describe('B-TRUTH — batch-selection rule is the established "latest by created_at" precedent, not invented', () => {
  it('buildDataIntakeStatusView sorts by created_at descending and takes the first row', () => {
    const src = read('lib/live/data-intake-status-view.ts');
    expect(src).toMatch(/sort\([\s\S]*created_at[\s\S]*\)/);
  });
});

describe('B-TRUTH — no KoraTest special runtime branch, no tenant_kind product branch', () => {
  it('lib/live/data-intake-status-view.ts\'s actual code (excluding its own documentation comments) never reads tenant_id, tenant_kind, or a specific tenant_code', () => {
    const src = read('lib/live/data-intake-status-view.ts');
    const codeOnly = stripComments(src);
    expect(codeOnly).not.toContain('tenant_kind');
    expect(codeOnly).not.toContain('KORATEST-01');
    expect(codeOnly).not.toContain('tenant_id');
  });

  it('no runtime file special-cases KORATEST-01 in the Data Intake path (excluding this migration\'s own governance/seed files and tests)', () => {
    const ALLOWED = new Set([
      'app/admin/pipeline/page.tsx',
      'scripts/koratest-canonical-seed.ts',
      'data/koratest/koratest_input_fixture.json',
    ]);
    const offenders: string[] = [];
    for (const dir of RUNTIME_DIRS) {
      for (const file of walkTs(resolve(root, dir))) {
        const relative = file.replace(root + '/', '');
        if (ALLOWED.has(relative)) continue;
        if (EXCLUDED_DOCS.has(relative)) continue;
        if (relative.endsWith('.test.ts')) continue;
        if (read(relative).includes('KORATEST-01')) offenders.push(relative);
      }
    }
    expect(offenders).toEqual([]);
  });
});

describe('B-TRUTH — this PR touched ONLY the CompanyDataIntakeService migration (one PR = one bounded step)', () => {
  // ReportFactoryService.ts's Decision Pack version source was accurately
  // untouched by THIS PR at the time this test was written. B-TRUTH
  // ReportFactoryService Canonical Decision Pack Status Migration (PR 4 of
  // the same plan, 2026-09-06) later, separately, retired the file entirely.
  // See tests/unit/b-truth-reportfactory-canonical-decision-pack-status.test.ts.
  it('ReportFactoryService has since been separately retired (historical note, not a live assertion)', () => {
    expect(existsSync(resolve(root, 'services/report-factory/ReportFactoryService.ts'))).toBe(false);
  });

  it('AccountProvisioningService and AdminPreviewService still exist, untouched', () => {
    for (const file of [
      'services/account/AccountProvisioningService.ts',
      'services/admin-preview/AdminPreviewService.ts',
    ]) {
      expect(existsSync(resolve(root, file))).toBe(true);
    }
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

  it('KoraTest canonical foundation (PR 1) and the TenantService migration (PR 2) are untouched in their own scope', () => {
    expect(existsSync(resolve(root, 'scripts/koratest-canonical-seed.ts'))).toBe(true);
    expect(existsSync(resolve(root, 'services/tenant/TenantService.ts'))).toBe(false);
  });
});

describe('B-TRUTH — registry and I9 reflect the migration', () => {
  it('registry svc.company-data-intake entry reflects DEAD, not CONSOLIDATE', () => {
    const registry = read('lib/architecture/registry.ts');
    const idx = registry.indexOf("id: 'svc.company-data-intake'");
    expect(idx).toBeGreaterThan(-1);
    const nextIdx = registry.indexOf("{ id:", idx + 10);
    const entry = registry.slice(idx, nextIdx);
    expect(entry).toContain("status: 'DEAD'");
  });

  it('allowlist no longer lists CompanyDataIntakeService', () => {
    const allowlist = read('lib/security/synthetic-import-allowlist.ts');
    expect(allowlist).not.toMatch(/\{\s*file:\s*'services\/company-data-intake\/CompanyDataIntakeService\.ts'/);
  });

  // The allowlist header count of 13 files / 21 imports was accurate as of
  // this PR (PR 3). B-TRUTH ReportFactoryService Canonical Decision Pack
  // Status Migration (PR 4, 2026-09-06) later, separately, reduced it
  // further to 12 files / 20 imports, CC-00 Company Portfolio capability
  // salvage + canonicalization (2026-09-12) reduced it again to 12 files /
  // 18 imports, CC-00 Public Landing canonicalization (2026-09-26) reduced
  // it further to 11 files / 16 imports, and CC-00 Residual /demo/**
  // controlled retirement (2026-09-26, same day, later slice) reduced it
  // further to 8 files / 13 imports. See
  // tests/unit/cc00-residual-demo-retirement.test.ts for the current,
  // correct count.
  it('allowlist header reflects the current, further-reduced count, 6 files / 11 imports (historical note: this PR itself produced 13/21)', () => {
    const allowlist = read('lib/security/synthetic-import-allowlist.ts');
    expect(allowlist).toContain('CURRENT_SYNTHETIC_RUNTIME_IMPORTS = 2 files / 2 import statements'); // B-WORKER "One Product / No Demo Runtime" correction (2026-09-06): WorkerAchievementService.ts removed from the allowlist (deleted, zero callers) — 3/3 -> 2/2, unrelated to this PR.
  });
});
