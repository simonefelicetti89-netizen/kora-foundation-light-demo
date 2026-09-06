/**
 * B-TRUTH — AccountProvisioningService Pipeline Role Migration (2026-09-06).
 *
 * PR 5 of the founder-ratified ONE_PRODUCT_CANONICAL_MIGRATION plan (PR 1 =
 * KoraTest Canonical Foundation; PR 2 = TenantService Canonical Migration;
 * PR 3 = CompanyDataIntakeService Canonical Migration; PR 4 =
 * ReportFactoryService Canonical Decision Pack Status Migration).
 *
 * services/account/AccountProvisioningService.ts mixed two responsibilities:
 *   - PIPELINE_ADMIN_PROVISIONING: getAccountsForCompany(), called only by
 *     app/admin/pipeline/_components/PilotLifecycleClient.tsx, whose entire
 *     use of the return value was `accounts.length > 0` (hasCompanyUser).
 *   - MY_KORA_SESSION_IDENTITY: getCurrentDemoUser(), called only by
 *     app/my-kora/page.tsx, resolving which synthetic demo persona/
 *     company_id the My KORA preview renders as.
 *
 * Independent re-verification (not trusted from the registry's stale "13
 * real callers" note) found exactly these 2 real callers, plus 19 other
 * zero-caller methods left untouched (no opportunistic cleanup, out of this
 * migration's narrow scope).
 *
 * Only the pipeline role was migrated: a new pure view builder,
 * lib/live/account-provisioning-status-view.ts, derives hasCompanyUser from
 * Supabase Auth (auth.users + app_metadata.kora_tenant_id/kora_role),
 * fetched once by app/admin/pipeline/page.tsx (already a Server Component)
 * via the same filter app/api/admin/company-users/route.ts's own GET
 * handler already uses (COMPANY_ROLES = ['COMPANY_ADMIN']) — not a new auth
 * system. getAccountsForCompany() itself was deleted (zero remaining
 * callers). getCurrentDemoUser() and its data/synthetic/user-accounts.json
 * dependency are UNTOUCHED — the service remains alive (NARROWED, not
 * retired) for that reason.
 *
 * NOT touched by this PR (separate, later, bounded slices or explicitly
 * protected zones): WorkerProvisioningService, WorkerAchievementService,
 * WorkerSpaceCapabilityService (B-WORKER), AdminPreviewService, final
 * scoring.
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

describe('B-TRUTH — all real callers of AccountProvisioningService, before and after', () => {
  it('AccountProvisioningService.ts still exists — this is a NARROWING, not a retirement', () => {
    expect(existsSync(resolve(root, 'services/account/AccountProvisioningService.ts'))).toBe(true);
  });

  it('getAccountsForCompany (pipeline-only) has been removed', () => {
    const src = read('services/account/AccountProvisioningService.ts');
    expect(src).not.toMatch(/^\s{2,4}getAccountsForCompany\(/m);
  });

  // PRIOR HISTORY (accurate as of this migration, preserved verbatim):
  // asserted getCurrentDemoUser() was untouched, still defined — its sole
  // real caller (app/my-kora/page.tsx) was removed by this very migration,
  // leaving it zero-caller. B-WORKER final cleanup (2026-09-06) verified
  // that fresh and removed the now-dead method.
  it('getCurrentDemoUser (My KORA/session role) was removed once proven zero-caller (B-WORKER final cleanup)', () => {
    const src = read('services/account/AccountProvisioningService.ts');
    expect(src).not.toContain('getCurrentDemoUser(role?: string): KoraUserAccount');
  });

  it('no runtime file (app/services/lib/components), excluding governance docs and tests, calls accountProvisioningService.getAccountsForCompany', () => {
    const offenders: string[] = [];
    for (const dir of RUNTIME_DIRS) {
      for (const file of walkTs(resolve(root, dir))) {
        const relative = file.replace(root + '/', '');
        if (EXCLUDED_DOCS.has(relative)) continue;
        const content = read(relative);
        const codeOnly = stripComments(content);
        if (/accountProvisioningService\s*\.\s*getAccountsForCompany\s*\(/.test(codeOnly)) offenders.push(relative);
      }
    }
    expect(offenders).toEqual([]);
  });

  // PRIOR HISTORY (accurate as of its own time, preserved verbatim): "exactly
  // one real caller of accountProvisioningService remains — app/my-kora/page.tsx
  // (getCurrentDemoUser)." CC-00 Final Scoring Canonicalization (2026-09-05):
  // that call was removed — it existed only to derive a company_id fed into
  // the now-retired scoringSimulatorService.getCompanyAggregate(). Zero real
  // callers remain; AccountProvisioningService.ts itself is untouched (not
  // modified, not deleted). See tests/unit/cc00-final-scoring-canonicalization.test.ts.
  it('zero real callers of accountProvisioningService remain — its own file is untouched, unmodified', () => {
    const offenders: string[] = [];
    for (const dir of RUNTIME_DIRS) {
      for (const file of walkTs(resolve(root, dir))) {
        const relative = file.replace(root + '/', '');
        if (EXCLUDED_DOCS.has(relative)) continue;
        const content = read(relative);
        const codeOnly = stripComments(content);
        if (/accountProvisioningService\s*\./.test(codeOnly)) offenders.push(relative);
      }
    }
    expect(offenders).toEqual([]);
  });
});

describe('B-TRUTH — migrated pipeline consumer uses the canonical account-provisioning status view', () => {
  it('lib/live/account-provisioning-status-view.ts exists, is a pure function fed by already-fetched auth.users rows', () => {
    const src = read('lib/live/account-provisioning-status-view.ts');
    expect(src).toContain('export function buildAccountProvisioningStatusView(');
    expect(src).not.toMatch(/from\s+['"][^'"]*data\/synthetic\//);
    // Pure: no Supabase client import, no DB/auth admin call — takes already-fetched rows.
    expect(src).not.toContain('getSupabaseServiceClient');
    expect(src).not.toContain('auth.admin');
  });

  it('the view exposes exactly the one field the real caller consumes — hasCompanyUser — not the full legacy account list', () => {
    const src = read('lib/live/account-provisioning-status-view.ts');
    const typeIdx = src.indexOf('export interface CanonicalAccountProvisioningStatus');
    const typeBlock = src.slice(typeIdx, src.indexOf('}', typeIdx));
    expect(typeBlock).toContain('hasCompanyUser');
  });

  it('the view filters using the same canonical role/tenant fields app/api/admin/company-users/route.ts already uses — not a reinvented auth model', () => {
    const src = read('lib/live/account-provisioning-status-view.ts');
    expect(src).toContain('kora_tenant_id');
    expect(src).toContain('kora_role');
    expect(src).toContain('COMPANY_ADMIN');
  });

  it('app/admin/pipeline/page.tsx fetches auth.users via the admin API, builds the view once', () => {
    const src = read('app/admin/pipeline/page.tsx');
    expect(src).toContain('db.auth.admin.listUsers(');
    expect(src).toContain('buildAccountProvisioningStatusView(');
    expect(src).toContain('accountProvisioning={accountProvisioning}');
  });

  it('PilotLifecycleClient.tsx receives accountProvisioning as a prop, no self-fetch of accounts', () => {
    const src = read('app/admin/pipeline/_components/PilotLifecycleClient.tsx');
    expect(src).toContain('accountProvisioning: CanonicalAccountProvisioningStatus');
    expect(src).toContain('accountProvisioning.hasCompanyUser');
    expect(src).not.toMatch(/from\s+['"][^'"]*data\/synthetic\//);
  });
});

describe('B-TRUTH — responsibility split preserved: no My KORA/session behavior changed, no worker identity behavior changed', () => {
  // PRIOR HISTORY (accurate as of its own time, preserved verbatim): "app/my-kora/page.tsx
  // is untouched — still resolves the session persona via getCurrentDemoUser,
  // unchanged call shape." CC-00 Final Scoring Canonicalization (2026-09-05):
  // that call is removed from app/my-kora/page.tsx (it only ever fed the
  // now-retired scoringSimulatorService.getCompanyAggregate() lookup, not
  // session/persona resolution itself — activeRole/activePersona continue to
  // resolve via useRole()/usePersona(), unchanged). getCurrentDemoUser()
  // itself is untouched in AccountProvisioningService.ts.
  //
  // B-WORKER "One Product / No Demo Runtime" correction (2026-09-06):
  // app/my-kora/page.tsx no longer has ANY session/persona resolution of its
  // own — it is a pure, unconditional redirect() to /worker/workspace
  // (docs/KORA_OFFICIAL_IMPLEMENTATION_MASTER_PLAN_v2.1_PATCH_03.md). This is
  // a separate, later, explicitly-authorized retirement, not a regression of
  // this PR's own AccountProvisioningService scope boundary —
  // getCurrentDemoUser() remains untouched by this PR either way (it is
  // itself later removed by PR #168, an unrelated slice).
  it('app/my-kora/page.tsx no longer has its own session/persona resolution — retired to a pure redirect (later, separately-authorized slice)', () => {
    const src = read('app/my-kora/page.tsx');
    expect(src).toContain("redirect('/worker/workspace')");
    expect(src).not.toContain('useRole, useScenario, usePersona');
    expect(src).not.toContain('getCurrentDemoUser');
  });

  it('the new view builder does not import or reference My KORA/session/worker-identity concerns in real code (prose mentions in its own explanatory header comment are not a violation)', () => {
    const src = read('lib/live/account-provisioning-status-view.ts');
    const codeOnly = stripComments(src);
    expect(codeOnly).not.toMatch(/my-kora|MyKora|WorkerProvisioning|WorkerAchievement|WorkerSpaceCapability|getCurrentDemoUser/);
  });

  it('B-WORKER services are untouched — still exist, unmodified reachability', () => {
    for (const file of [
      'services/worker-provisioning/WorkerProvisioningService.ts',
      // PRIOR HISTORY: 'services/worker-achievements/WorkerAchievementService.ts'
      // was asserted to exist here (unmodified by this PR, at the time). B-WORKER
      // "One Product / No Demo Runtime" correction (2026-09-06) deleted it entirely
      // (zero real callers once its 2 callers, app/my-kora/page.tsx and
      // app/my-kora/dynamic-cv/page.tsx, became pure canonical redirects) — removed
      // from this list; this is that later, separately-authorized retirement, not an
      // unrelated-PR regression of this PR's own scope boundary.
      'services/worker-space/WorkerSpaceCapabilityService.ts',
    ]) {
      expect(existsSync(resolve(root, file))).toBe(true);
    }
  });
});

describe('B-TRUTH — no tenant_kind branch, no KoraTest special branch, no client-side auth.users exposure', () => {
  it('lib/live/account-provisioning-status-view.ts\'s actual code (excluding its own documentation comments) never reads tenant_kind or a specific tenant_code', () => {
    const src = read('lib/live/account-provisioning-status-view.ts');
    const codeOnly = stripComments(src);
    expect(codeOnly).not.toContain('tenant_kind');
    expect(codeOnly).not.toContain('KORATEST-01');
  });

  it('the canonical fetch happens only in the Server Component (page.tsx), never in the client component', () => {
    expect(read('app/admin/pipeline/page.tsx')).toContain('db.auth.admin.listUsers(');
    const clientSrc = read('app/admin/pipeline/_components/PilotLifecycleClient.tsx');
    expect(clientSrc).not.toContain('auth.admin');
    expect(clientSrc).not.toContain('getSupabaseServiceClient');
  });

  it('page.tsx is a Server Component ("use client" is absent) — auth.users access stays server-only', () => {
    const src = read('app/admin/pipeline/page.tsx');
    expect(src).not.toContain("'use client'");
  });
});

describe('B-TRUTH — this PR touched ONLY the AccountProvisioningService pipeline-role migration (one PR = one bounded step)', () => {
  it('AdminPreviewService is untouched — still exists; the final scoring group was later retired by CC-00 Final Scoring Canonicalization (2026-09-05), unrelated to this PR', () => {
    expect(existsSync(resolve(root, 'services/admin-preview/AdminPreviewService.ts'))).toBe(true);
    expect(existsSync(resolve(root, 'services/scoring-simulator/ScoringSimulatorService.ts'))).toBe(false);
  });

  it('PR 1/2/3/4 outcomes are untouched in their own scope', () => {
    expect(existsSync(resolve(root, 'scripts/koratest-canonical-seed.ts'))).toBe(true);
    expect(existsSync(resolve(root, 'services/tenant/TenantService.ts'))).toBe(false);
    expect(existsSync(resolve(root, 'services/company-data-intake/CompanyDataIntakeService.ts'))).toBe(false);
    expect(existsSync(resolve(root, 'services/report-factory/ReportFactoryService.ts'))).toBe(false);
    expect(existsSync(resolve(root, 'lib/live/decision-pack-status-view.ts'))).toBe(true);
  });

  it('data/synthetic/user-accounts.json still exists — still required by the surviving My KORA/session role, not opportunistically deleted', () => {
    expect(existsSync(resolve(root, 'data/synthetic/user-accounts.json'))).toBe(true);
  });
});

describe('B-TRUTH — 19 other pre-existing zero-caller methods were left untouched (no opportunistic cleanup)', () => {
  it('AccountProvisioningService.ts still defines its other, unrelated methods', () => {
    const src = read('services/account/AccountProvisioningService.ts');
    for (const method of [
      'getAccountsForTenant', 'getKoraStaffAccounts', 'getWorkerAccountsForCompany',
      'getCompanyAdmins', 'getPrimaryCompanyAdmin', 'createCompanyUserDraft',
      'createCompanyAdminDraft', 'inviteCompanyUser', 'revokeInvite', 'resetInvite',
      'disableUser', 'suspendUser', 'deleteDemoUser', 'getUserAccessProfile',
      'canAccessCompany', 'canAccessAdmin', 'getVisibleSections',
      'getAccountStatusBadge', 'getInvitationStatusBadge',
    ]) {
      expect(src).toContain(`${method}(`);
    }
  });
});

describe('B-TRUTH — registry and I9 reflect the migration', () => {
  it('registry svc.account entry reflects CONSOLIDATE (narrowed), not blindly re-labeled DEAD or left CANONICAL', () => {
    const registry = read('lib/architecture/registry.ts');
    const idx = registry.indexOf("id: 'svc.account'");
    expect(idx).toBeGreaterThan(-1);
    const nextIdx = registry.indexOf('{ id:', idx + 10);
    const entry = registry.slice(idx, nextIdx);
    expect(entry).toContain("status: 'CONSOLIDATE'");
    expect(entry).not.toContain("status: 'DEAD'");
    expect(entry).toContain('decisionRef:');
    expect(entry).not.toContain('decisionRef: null');
  });

  it('allowlist still lists AccountProvisioningService (its synthetic import is still required by the surviving role)', () => {
    const allowlist = read('lib/security/synthetic-import-allowlist.ts');
    expect(allowlist).toMatch(/\{\s*file:\s*'services\/account\/AccountProvisioningService\.ts'/);
  });

  // CC-00 Company Portfolio capability salvage + canonicalization
  // (2026-09-12) later, separately, reduced the import count, to
  // 12 files / 18 imports — unrelated to this PR's own scope. CC-00 Public
  // Landing canonicalization (2026-09-26) later reduced it further, to
  // 11 files / 16 imports, and CC-00 Residual /demo/** controlled
  // retirement (2026-09-26, same day, later slice) reduced it further to
  // 8 files / 13 imports. See tests/unit/cc00-residual-demo-retirement.test.ts.
  it('allowlist header count is unchanged by THIS PR — 6 files / 11 imports (no synthetic import was removed, only a pipeline-only method; historical note: later, unrelated PRs changed the count, most recently to 6/11)', () => {
    const allowlist = read('lib/security/synthetic-import-allowlist.ts');
    expect(allowlist).toContain('CURRENT_SYNTHETIC_RUNTIME_IMPORTS = 2 files / 2 import statements'); // B-WORKER "One Product / No Demo Runtime" correction (2026-09-06): WorkerAchievementService.ts removed from the allowlist (deleted, zero callers) — 3/3 -> 2/2, unrelated to this PR.
  });
});
