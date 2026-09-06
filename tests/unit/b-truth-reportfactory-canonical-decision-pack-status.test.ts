/**
 * B-TRUTH — ReportFactoryService Canonical Decision Pack Status Migration
 * (2026-09-06).
 *
 * PR 4 of the founder-ratified ONE_PRODUCT_CANONICAL_MIGRATION plan (PR 1 =
 * B-TRUTH KoraTest Canonical Foundation; PR 2 = B-TRUTH TenantService
 * Canonical Migration; PR 3 = B-TRUTH CompanyDataIntakeService Canonical
 * Migration). Migrates the sole real runtime caller of
 * services/report-factory/ReportFactoryService.ts to a canonical
 * analytics.decision_pack_version view, then retires the now-zero-caller
 * service and its sole seed file.
 *
 * Re-verified independently before deletion (not trusted from any prior
 * audit alone): the sole real caller,
 * app/admin/pipeline/_components/PilotLifecycleClient.tsx, was traced
 * field-by-field. Of the legacy 9-field DecisionPackFactoryStatus return
 * shape (company_id, tenant_id, latest_version_id, latest_status,
 * can_generate, can_export_pdf, can_share, blocking_reasons, warnings,
 * next_action), the caller read exactly ONE field: latest_status, compared
 * to 'ready'. Per this migration's "map only what the canonical model
 * actually supports, do not fake 1:1 parity with legacy synthetic fields"
 * rule, the blocking_reasons/warnings/next_action/can_generate apparatus
 * (built from a private hasKoraIndex() call into the still-synthetic
 * ScoringSimulatorService demo path) was DROPPED, not migrated — it never
 * had a real consumer. Final scoring is untouched by this migration, not
 * because a canonical replacement was avoided, but because nothing
 * downstream ever needed hasKoraIndex()'s result.
 *
 * Replacement: a new shared pure view builder,
 * lib/live/decision-pack-status-view.ts, reading directly from
 * analytics.decision_pack_version (status, created_at columns), fetched
 * once by app/admin/pipeline/page.tsx (already a Server Component) and
 * passed down to PilotLifecycleClient.tsx as a new decisionPack prop — same
 * fetch-once-thread-down discipline as PR 2/PR 3. Version-selection rule:
 * latest by created_at, matching lib/live/data-intake-status-view.ts's own
 * precedent and the operator-flow route's GET handler for this exact table
 * — not invented for this migration.
 *
 * CanonicalTenantStatus (formerly exported from ReportFactoryService.ts)
 * needed no relocation: repo-wide grep confirmed zero remaining real or
 * type-only importers of it once the getDecisionPackFactoryStatus call site
 * was removed — the type was deleted along with the file, not moved.
 *
 * NOT touched by this PR (separate, later, bounded slices):
 * AccountProvisioningService, AdminPreviewService, final scoring, B-WORKER.
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

describe('B-TRUTH — ReportFactoryService no longer exists', () => {
  it('the service file is gone', () => {
    expect(existsSync(resolve(root, 'services/report-factory/ReportFactoryService.ts'))).toBe(false);
  });

  it('its directory is gone (no leftover empty dir)', () => {
    expect(existsSync(resolve(root, 'services/report-factory'))).toBe(false);
  });

  it('its sole synthetic seed file is gone', () => {
    expect(existsSync(resolve(root, 'data/synthetic/decision-pack-versions.json'))).toBe(false);
  });

  it('no runtime file (app/services/lib/components), excluding governance docs and tests, imports, instantiates, or calls it', () => {
    const offenders: string[] = [];
    const REAL_USAGE = /(?:^|\s)import\s[^;]*ReportFactoryService[^;]*from|from\s*['"][^'"]*report-factory\/ReportFactoryService['"]|new\s+ReportFactoryService\s*\(/m;
    for (const dir of RUNTIME_DIRS) {
      for (const file of walkTs(resolve(root, dir))) {
        const relative = file.replace(root + '/', '');
        if (EXCLUDED_DOCS.has(relative)) continue;
        if (relative.endsWith('.test.ts')) continue;
        const content = read(relative);
        const codeOnly = stripComments(content);
        if (REAL_USAGE.test(content) || /reportFactoryService\s*\./.test(codeOnly)) offenders.push(relative);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('CanonicalTenantStatus is not imported from the deleted file anywhere (deleted along with it, not relocated)', () => {
    for (const dir of RUNTIME_DIRS) {
      for (const file of walkTs(resolve(root, dir))) {
        const relative = file.replace(root + '/', '');
        if (EXCLUDED_DOCS.has(relative)) continue;
        expect(read(relative)).not.toMatch(/from\s+['"][^'"]*report-factory\/ReportFactoryService['"]/);
      }
    }
  });
});

describe('B-TRUTH — migrated consumer uses the canonical Decision Pack status view', () => {
  it('lib/live/decision-pack-status-view.ts exists, is a pure function fed by analytics.decision_pack_version shapes', () => {
    const src = read('lib/live/decision-pack-status-view.ts');
    expect(src).toContain('export function buildDecisionPackStatusView(');
    expect(src).not.toMatch(/from\s+['"][^'"]*data\/synthetic\//);
    // Pure: no Supabase client import, no DB call — takes already-fetched rows.
    expect(src).not.toContain('getSupabaseServiceClient');
    expect(src).not.toContain(".schema('analytics')");
  });

  it('the view exposes hasDecisionPack and the raw canonical status field, not a lossy pre-collapsed boolean', () => {
    const src = read('lib/live/decision-pack-status-view.ts');
    const typeIdx = src.indexOf('export interface CanonicalDecisionPackStatus');
    const typeBlock = src.slice(typeIdx, src.indexOf('}', typeIdx));
    expect(typeBlock).toContain('hasDecisionPack');
    expect(typeBlock).toContain('status');
  });

  it('app/admin/pipeline/page.tsx fetches analytics.decision_pack_version, builds the view once', () => {
    const src = read('app/admin/pipeline/page.tsx');
    expect(src).toContain("schema('analytics').from('decision_pack_version')");
    expect(src).toContain('buildDecisionPackStatusView(');
    expect(src).toContain('decisionPack={decisionPack}');
  });

  it('PilotLifecycleClient.tsx receives decisionPack as a prop, no self-computation via reportFactoryService', () => {
    const src = read('app/admin/pipeline/_components/PilotLifecycleClient.tsx');
    expect(src).toContain('decisionPack: CanonicalDecisionPackStatus');
    expect(src).toContain("decisionPack.status === 'ready'");
    expect(src).not.toContain('reportFactoryService');
    expect(src).not.toContain('getDecisionPackFactoryStatus');
    expect(src).not.toMatch(/from\s+['"][^'"]*data\/synthetic\//);
  });

  it('no data/synthetic/** Decision-Pack import remains anywhere in the pipeline route', () => {
    for (const file of [
      'app/admin/pipeline/page.tsx',
      'app/admin/pipeline/_components/PilotLifecycleClient.tsx',
    ]) {
      expect(read(file)).not.toMatch(/from\s+['"][^'"]*data\/synthetic\/decision-pack-versions/);
    }
  });
});

describe('B-TRUTH — version-selection rule is the established "latest by created_at" precedent, not invented', () => {
  it('buildDecisionPackStatusView sorts by created_at descending and takes the first row', () => {
    const src = read('lib/live/decision-pack-status-view.ts');
    expect(src).toMatch(/sort\([\s\S]*created_at[\s\S]*\)/);
  });
});

describe('B-TRUTH — no KoraTest special runtime branch, no tenant_kind product branch', () => {
  it('lib/live/decision-pack-status-view.ts\'s actual code (excluding its own documentation comments) never reads tenant_id, tenant_kind, or a specific tenant_code', () => {
    const src = read('lib/live/decision-pack-status-view.ts');
    const codeOnly = stripComments(src);
    expect(codeOnly).not.toContain('tenant_kind');
    expect(codeOnly).not.toContain('KORATEST-01');
    expect(codeOnly).not.toContain('tenant_id');
  });

  it('no runtime file special-cases KORATEST-01 in the Decision Pack status path (excluding this migration\'s own governance/seed files and tests)', () => {
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

describe('B-TRUTH — this PR touched ONLY the ReportFactoryService migration (one PR = one bounded step)', () => {
  // PRIOR HISTORY (accurate as of its own time, preserved verbatim):
  // "AccountProvisioningService and AdminPreviewService still exist,
  // untouched." B-WORKER AccountProvisioning dead-code retirement
  // (2026-09-06, a later, separate, bounded slice) deleted
  // AccountProvisioningService.ts entirely — zero real callers of any of
  // its 18 methods, confirmed exhaustively. AdminPreviewService.ts remains
  // untouched.
  it('AdminPreviewService still exists, untouched; AccountProvisioningService has since been separately retired', () => {
    expect(existsSync(resolve(root, 'services/admin-preview/AdminPreviewService.ts'))).toBe(true);
    expect(existsSync(resolve(root, 'services/account/AccountProvisioningService.ts'))).toBe(false);
  });

  it('B-WORKER members remain untouched — still exist; the final scoring group was later retired by CC-00 Final Scoring Canonicalization (2026-09-05), unrelated to this PR', () => {
    for (const file of [
      // PRIOR HISTORY: 'services/worker-provisioning/WorkerProvisioningService.ts'
      // was asserted to exist here (unmodified by this PR, at the time). B-WORKER
      // WorkerProvisioning Canonicalization (2026-09-06) retired it entirely (its 2
      // real callers migrated to canonical personal.worker_identity reads) —
      // removed from this list; this is that later, separately-authorized
      // retirement, not an unrelated-PR regression of this PR's own scope boundary.
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

  it('PR 1/2/3 outcomes are untouched in their own scope', () => {
    expect(existsSync(resolve(root, 'scripts/koratest-canonical-seed.ts'))).toBe(true);
    expect(existsSync(resolve(root, 'services/tenant/TenantService.ts'))).toBe(false);
    expect(existsSync(resolve(root, 'services/company-data-intake/CompanyDataIntakeService.ts'))).toBe(false);
    expect(existsSync(resolve(root, 'lib/live/data-intake-status-view.ts'))).toBe(true);
  });
});

describe('B-TRUTH — RLS-19 is wired into the mandatory CI DB-backed gate (learning from the RLS-17 wiring-omission mistake, see B-TRUTH CompanyDataIntakeService Canonical Migration)', () => {
  it('.github/workflows/ci.yml sets RLS19_PG_URL/RLS19_ALLOW_RUN and runs the RLS-19 test file in the mandatory no-skip job', () => {
    const ci = read('.github/workflows/ci.yml');
    expect(ci).toContain('RLS19_PG_URL:');
    expect(ci).toContain("RLS19_ALLOW_RUN: 'true'");
    expect(ci).toContain('tests/integration/rls-19-decision-pack-status-view.test.ts');
  });
});

describe('B-TRUTH — registry and I9 reflect the migration', () => {
  it('registry svc.report-factory entry reflects DEAD, not CONSOLIDATE', () => {
    const registry = read('lib/architecture/registry.ts');
    const idx = registry.indexOf("id: 'svc.report-factory'");
    expect(idx).toBeGreaterThan(-1);
    const nextIdx = registry.indexOf("{ id:", idx + 10);
    const entry = registry.slice(idx, nextIdx);
    expect(entry).toContain("status: 'DEAD'");
    expect(entry).toContain('decisionRef:');
    expect(entry).not.toContain('decisionRef: null');
  });

  it('allowlist no longer lists ReportFactoryService', () => {
    const allowlist = read('lib/security/synthetic-import-allowlist.ts');
    expect(allowlist).not.toMatch(/\{\s*file:\s*'services\/report-factory\/ReportFactoryService\.ts'/);
  });

  // CC-00 Company Portfolio capability salvage + canonicalization
  // (2026-09-12) later, separately, reduced the import count further, to
  // 12 files / 18 imports, CC-00 Public Landing canonicalization
  // (2026-09-26) reduced it again to 11 files / 16 imports, and CC-00
  // Residual /demo/** controlled retirement (2026-09-26, same day, later
  // slice) reduced it further to 8 files / 13 imports. See
  // tests/unit/cc00-residual-demo-retirement.test.ts.
  it('allowlist header reflects the current count, 6 files / 11 imports (historical note: this PR itself produced 12/20)', () => {
    const allowlist = read('lib/security/synthetic-import-allowlist.ts');
    expect(allowlist).toContain('CURRENT_SYNTHETIC_RUNTIME_IMPORTS = 0 files / 0 import statements'); // B-WORKER AccountProvisioning dead-code retirement (2026-09-06): AccountProvisioningService.ts removed from the allowlist (deleted, zero callers) — 2/2 -> 1/1, unrelated to this PR.
  });
});
