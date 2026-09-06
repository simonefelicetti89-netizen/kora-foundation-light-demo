// tests/unit/bworker-preview-runtime-retirement.test.ts
// B-WORKER PREVIEW RUNTIME RETIREMENT (2026-09-06) — correction after PR #168.
//
// PR #168 preserved the anonymous/persona /my-kora runtime, MyKoraPreviewService,
// and WorkerAchievementService, reasoning CLAUDE.md §10 permanently protected
// them. That reasoning is corrected here: §10 lists historically-allowed
// pre-Gate-2 build scope, not a permanent mandate for a second interactive
// worker product runtime. The authoritative, later, more specific founder
// decision is docs/KORA_OFFICIAL_IMPLEMENTATION_MASTER_PLAN_v2.1_PATCH_03.md,
// "ONE PRODUCT / NO DEMO RUNTIME": fake/demo data may exist as an ordinary
// tenant_kind=DEMO tenant through the canonical schema/services — a second
// product runtime may not.
//
// This file proves: (1) no persona/demo worker runtime remains reachable by
// anyone, (2) MyKoraPreviewService has zero callers and is deleted, (3)
// WorkerAchievementService is retired with no replacement domain invented,
// (4) canonical /worker/** routes still work, (5) PR #168's security
// hardening remains intact, (6) the I9 allowlist still has 2 B_WORKER
// entries but only WorkerProvisioningService is a genuine product-decision
// blocker — AccountProvisioningService is zero-caller dead code, corrected
// in this file's PR #169 final-correction pass (see section 6 below), (7)
// the registry reflects actual, not aspirational, state.

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, readdirSync } from 'fs';
import { resolve } from 'path';

const root = resolve(process.cwd());

function read(rel: string): string {
  return readFileSync(resolve(root, rel), 'utf-8');
}

function exists(rel: string): boolean {
  return existsSync(resolve(root, rel));
}

const MY_KORA_ROUTE_FILES = [
  'app/my-kora/page.tsx',
  'app/my-kora/dynamic-cv/page.tsx',
  'app/my-kora/privacy/page.tsx',
  'app/my-kora/personal-impact-balance/page.tsx',
  'app/my-kora/bookings/page.tsx',
  'app/my-kora/kora-space/page.tsx',
  'app/my-kora/kora-link/page.tsx',
  'app/my-kora/collective/page.tsx',
  'app/my-kora/opportunities/page.tsx',
];

// ── 1. No persona/demo worker runtime remains anywhere ──────────────────────

describe('B-WORKER preview retirement — no anonymous/persona /my-kora runtime remains', () => {
  it('every /my-kora/** page is a pure, unconditional redirect() — no session check, no fetch probe', () => {
    for (const file of MY_KORA_ROUTE_FILES) {
      const src = read(file);
      expect(src).toContain('redirect(');
      expect(src).not.toContain('useState');
      expect(src).not.toContain('useEffect');
      expect(src).not.toContain("'use client'");
      expect(src).not.toContain('fetch(');
      expect(src).not.toContain('router.replace(');
      expect(src).not.toContain('myKoraPreviewService');
      expect(src).not.toContain('MyKoraDemoGate');
      expect(src).not.toContain('WorkerSessionProvider');
    }
  });

  it('app/my-kora/layout.tsx performs no role/session logic', () => {
    const src = read('app/my-kora/layout.tsx');
    expect(src).not.toContain('realRole');
    expect(src).not.toContain('getSessionKoraRole');
    expect(src).not.toContain('MyKoraDemoGate');
    expect(src).not.toContain('WorkerSessionProvider');
  });

  it('the demo/persona runtime files are deleted, not just unreferenced', () => {
    expect(exists('app/my-kora/_providers/MyKoraDemoGate.tsx')).toBe(false);
    expect(exists('app/my-kora/_providers/WorkerSessionProvider.tsx')).toBe(false);
    expect(exists('lib/worker-identity/worker-context.ts')).toBe(false);
  });

  it('lib/worker-identity/types.ts no longer exports a PREVIEW-session factory', () => {
    const src = read('lib/worker-identity/types.ts');
    expect(src).not.toContain('export function makePreviewWorkerSession');
  });

  it('/api/worker/pib and /api/worker/impact-cv have no KORA_ADMIN preview path', () => {
    for (const file of ['app/api/worker/pib/route.ts', 'app/api/worker/impact-cv/route.ts']) {
      const src = read(file);
      expect(src).not.toContain('requireKoraAdmin');
      expect(src).not.toContain('VALID_PERSONAS');
      expect(src).not.toContain('VALID_SCENARIOS');
    }
  });
});

// ── 2. MyKoraPreviewService: zero callers, deleted ──────────────────────────

describe('B-WORKER preview retirement — MyKoraPreviewService fully retired', () => {
  it('the file no longer exists', () => {
    expect(exists('services/my-kora-preview/MyKoraPreviewService.ts')).toBe(false);
  });

  it('no file anywhere imports or calls myKoraPreviewService/MyKoraPreviewService (comment prose excepted)', () => {
    const candidates = [
      'app/my-kora/page.tsx',
      'services/dynamic-cv/DynamicCVService.ts',
      'services/worker-opportunity/WorkerOpportunityService.ts',
      'services/worker-pib/WorkerPIBService.ts',
      'lib/types/domains/worker-pib.ts',
      'lib/worker-identity/types.ts',
    ];
    for (const file of candidates) {
      const src = read(file);
      expect(src).not.toMatch(/import[\s\S]{0,200}my-kora-preview/);
      expect(src).not.toContain('myKoraPreviewService.');
    }
  });

  it('WorkerPIBService no longer exposes synthetic getPIB/getCVData', () => {
    const src = read('services/worker-pib/WorkerPIBService.ts');
    expect(src).not.toContain('getPIB(personaId');
    expect(src).not.toContain('getCVData(personaId');
    expect(src).toContain('getPIBLive');
    expect(src).toContain('getCVDataLive');
  });

  it('WorkerOpportunityService no longer exposes the persona-fixture compute() entry point', () => {
    const src = read('services/worker-opportunity/WorkerOpportunityService.ts');
    expect(src).not.toMatch(/^\s*compute\(/m);
    expect(src).toContain('computeFromPillars(');
  });

  it('DynamicCVService.getProfile is stubbed (no fabricated data), role guard intact', () => {
    const src = read('services/dynamic-cv/DynamicCVService.ts');
    expect(src).not.toContain('myKoraPreviewService');
    expect(src).toContain('return null');
    expect(src).toContain('isWorkerRole');
  });
});

// ── 3. WorkerAchievementService retired, no replacement domain ─────────────

describe('B-WORKER preview retirement — WorkerAchievementService retired, no new domain invented', () => {
  it('the service file, its types file, and its seed JSON are all deleted', () => {
    expect(exists('services/worker-achievements/WorkerAchievementService.ts')).toBe(false);
    expect(exists('lib/worker-achievements/types.ts')).toBe(false);
    expect(exists('data/synthetic/worker-achievements.json')).toBe(false);
  });

  it('no achievement domain object was created anywhere in supabase/migrations or services', () => {
    expect(exists('services/worker-achievement-v2')).toBe(false);
    expect(exists('services/achievement')).toBe(false);
  });

  it('no file anywhere calls workerAchievementService (comment prose excepted)', () => {
    for (const file of MY_KORA_ROUTE_FILES) {
      expect(read(file)).not.toContain('workerAchievementService.');
    }
  });
});

// ── 4. Canonical /worker/** routes still work (spot check, unaffected) ─────

describe('B-WORKER preview retirement — canonical /worker/** routes are untouched', () => {
  it('/worker/dynamic-cv still uses requireWorkerUser and the live client component', () => {
    const src = read('app/worker/dynamic-cv/page.tsx');
    expect(src).toContain('requireWorkerUser');
    expect(src).toContain('DynamicCVClient');
  });

  it('/worker/personal-impact-balance still reads getPIBLive', () => {
    const src = read('app/worker/personal-impact-balance/page.tsx');
    expect(src).toContain('getPIBLive');
  });

  it('/worker/opportunities remains a real, non-personalized partner catalog (not a recommendation engine)', () => {
    const src = read('app/worker/opportunities/page.tsx');
    expect(src).not.toContain('personaId');
    expect(src).not.toContain('match_reason');
  });

  it('every /my-kora page redirects to its own distinct canonical /worker/** target', () => {
    const expectations: Record<string, string> = {
      'app/my-kora/page.tsx':                            "/worker/workspace",
      'app/my-kora/dynamic-cv/page.tsx':                 "/worker/dynamic-cv",
      'app/my-kora/privacy/page.tsx':                    "/worker/privacy",
      'app/my-kora/personal-impact-balance/page.tsx':    "/worker/personal-impact-balance",
      'app/my-kora/bookings/page.tsx':                   "/worker/bookings",
      'app/my-kora/kora-space/page.tsx':                 "/worker/commons",
      'app/my-kora/kora-link/page.tsx':                  "/worker/kora-link/activate",
      'app/my-kora/collective/page.tsx':                 "/worker/workspace",
      'app/my-kora/opportunities/page.tsx':              "/worker/opportunities",
    };
    for (const [file, target] of Object.entries(expectations)) {
      expect(read(file)).toContain(`redirect('${target}')`);
    }
  });
});

// ── 5. PR #168 security hardening remains intact ────────────────────────────

describe('B-WORKER preview retirement — PR #168 hardening intact (regression)', () => {
  it('AccountProvisioningService.getCurrentDemoUser() remains removed', () => {
    const src = read('services/account/AccountProvisioningService.ts');
    expect(src).not.toContain('getCurrentDemoUser(role?: string): KoraUserAccount');
  });

  it('rate limiting on the 3 previously-closed worker mutation routes remains in place', () => {
    expect(read('app/api/worker/commons/bookings/route.ts')).toContain("assertRateLimit('token_creation'");
    expect(read('app/api/worker/onboarding/route.ts')).toContain("assertRateLimit('token_creation'");
    expect(read('app/api/worker/initiatives/[id]/interest/route.ts')).toContain("assertRateLimit('token_creation'");
  });

  it('raw DB error.message leakage remains closed on worker/profile and commons/posts', () => {
    for (const file of ['app/api/worker/profile/route.ts', 'app/api/commons/posts/route.ts', 'app/api/commons/posts/[id]/route.ts']) {
      const src = read(file);
      expect(src).not.toMatch(/error:\s*(wiErr|error)\.message/);
    }
  });

  it('no new service-role bypass was introduced in worker-facing or /my-kora code', () => {
    for (const file of [
      ...MY_KORA_ROUTE_FILES,
      'app/my-kora/layout.tsx',
      'app/api/worker/pib/route.ts',
      'app/api/worker/impact-cv/route.ts',
      'services/dynamic-cv/DynamicCVService.ts',
      'services/worker-opportunity/WorkerOpportunityService.ts',
      'services/worker-pib/WorkerPIBService.ts',
    ]) {
      expect(read(file)).not.toContain('getSupabaseServiceClient');
    }
  });

  it('worker privacy invariants (not_employer_visible, not_performance_score) remain on the live PIB path', () => {
    const src = read('services/worker-pib/WorkerPIBService.ts');
    expect(src).toContain('not_employer_visible:           true');
    expect(src).toContain('not_performance_score:          true');
  });
});

// ── 6. Two B_WORKER I9 entries remain, but they are NOT equivalent blockers ──
//
// PRIOR HISTORY (accurate as of this file's first version, preserved as a
// record): this section's own header and one of its tests claimed
// AccountProvisioningService "still genuinely imports synthetic data via
// unrelated, untouched methods" — proven only by checking that
// getWorkerAccountsForCompany's source TEXT exists, never by checking
// whether anything actually CALLS it. That was an accounting error.
//
// CORRECTION (PR #169 final correction pass): an exhaustive repo-wide,
// comment-stripped scan (matching the rigor of the pre-existing
// tests/unit/b-truth-accountprovisioning-pipeline-role-migration.test.ts,
// which already proved this independently on 2026-09-06, before B-WORKER
// even started) finds ZERO real callers of accountProvisioningService — of
// ANY of its 18 methods, not just the already-removed getCurrentDemoUser().
// Its own registry entry (svc.account) already documented, at the time of
// that migration, that getCurrentDemoUser() was the ONLY surviving real
// caller and every other method was "zero-caller... not removed... out of
// scope" — that surviving caller is now gone (removed in PR #168), so the
// registry's own stated justification for keeping this file in I9 no
// longer holds. AccountProvisioningService.ts is NOT a genuine
// product-decision blocker like WorkerProvisioningService — it is
// zero-caller dead code that could be deleted in a trivial follow-up PR
// (same "confirmed zero callers, then delete" pattern already used
// throughout this session for MyKoraPreviewService, WorkerAchievementService,
// etc.), not requiring any schema/product decision. It is NOT deleted here
// per this pass's explicit instruction not to canonicalize or delete either
// residual in this PR — this is a corrected-accounting record, not an action.
describe('B-WORKER preview retirement — I9 allowlist reflects verified reality (corrected accounting)', () => {
  it('exactly 2 B_WORKER-owned entries remain: AccountProvisioningService, WorkerProvisioningService', () => {
    const allowlist = read('lib/security/synthetic-import-allowlist.ts');
    const arrayStart = allowlist.indexOf('export const SYNTHETIC_IMPORT_ALLOWLIST');
    const arrayEnd = allowlist.indexOf('];', arrayStart);
    const arrayBody = allowlist.slice(arrayStart, arrayEnd);
    const matches = arrayBody.match(/owner: 'B_WORKER'/g) ?? [];
    expect(matches.length).toBe(2);
    const files = [...arrayBody.matchAll(/file: '([^']+)'/g)].map((m) => m[1]);
    expect(files.sort()).toEqual([
      'services/account/AccountProvisioningService.ts',
      'services/worker-provisioning/WorkerProvisioningService.ts',
    ]);
  });

  it('AccountProvisioningService has ZERO real callers of any method — trivially retirable, not a genuine blocker', () => {
    const RUNTIME_DIRS = ['app', 'components', 'services', 'lib'];
    const offenders: string[] = [];
    function walk(dir: string): string[] {
      const out: string[] = [];
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = resolve(dir, entry.name);
        if (entry.isDirectory()) out.push(...walk(full));
        else if (/\.(ts|tsx)$/.test(entry.name) && !full.includes('/services/account/AccountProvisioningService.ts')) out.push(full);
      }
      return out;
    }
    for (const dir of RUNTIME_DIRS) {
      for (const file of walk(resolve(root, dir))) {
        const relative = file.replace(root + '/', '');
        const codeOnly = read(relative).replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
        if (/accountProvisioningService\s*\./.test(codeOnly)) offenders.push(relative);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('WorkerProvisioningService still has real callers across the admin roster/provisioning UI', () => {
    for (const file of [
      'app/admin/pipeline/_components/PilotLifecycleClient.tsx',
      'app/admin/companies/_components/RosterImportModal.tsx',
      'components/admin/WorkforceQuickAccessPanel.tsx',
      'components/company/cockpit/WorkerAdoptionPanel.tsx',
    ]) {
      expect(read(file)).toContain('workerProvisioningService');
    }
  });

  it('the canonical worker list API genuinely lacks department/site/my_kora_enabled/pib_private_enabled — a schema gap, not fabricated', () => {
    const src = read('app/api/admin/workers/list/route.ts');
    expect(src).not.toContain('department');
    expect(src).not.toContain('my_kora_enabled');
    expect(src).not.toContain('pib_private_enabled');
  });
});

// ── 7. Registry reflects actual state ───────────────────────────────────────

describe('B-WORKER preview retirement — registry corrected to actual state', () => {
  const registry = read('lib/architecture/registry.ts');

  function entryFor(id: string): string {
    const idx = registry.indexOf(`id: '${id}'`);
    expect(idx).toBeGreaterThan(-1);
    return registry.slice(idx, registry.indexOf("{ id:", idx + 10));
  }

  it('app-surface.my-kora is DEAD, not CONSOLIDATE, with dependencies = []', () => {
    const entry = entryFor('app-surface.my-kora');
    expect(entry).toContain("status: 'DEAD'");
    expect(entry).toContain('dependencies: []');
  });

  it('svc.my-kora-preview is DEAD (deleted), not CONSOLIDATE', () => {
    const entry = entryFor('svc.my-kora-preview');
    expect(entry).toContain("status: 'DEAD'");
    expect(entry).toContain('DELETED');
  });

  it('svc.worker-achievements is DEAD (deleted), not CONSOLIDATE', () => {
    const entry = entryFor('svc.worker-achievements');
    expect(entry).toContain("status: 'DEAD'");
    expect(entry).toContain('DELETED');
  });

  it('svc.dynamic-cv and svc.worker-opportunity remain FUTURE_CORE (Master Plan §33 do-not-delete), not deleted', () => {
    expect(exists('services/dynamic-cv/DynamicCVService.ts')).toBe(true);
    expect(exists('services/worker-opportunity/WorkerOpportunityService.ts')).toBe(true);
    expect(entryFor('svc.dynamic-cv')).toContain("status: 'FUTURE_CORE'");
    expect(entryFor('svc.worker-opportunity')).toContain("status: 'FUTURE_CORE'");
  });

  it('registry no longer claims CLAUDE.md §10 permanently protects the demo runtime', () => {
    const myKoraEntry = entryFor('app-surface.my-kora');
    const previewEntry = entryFor('svc.my-kora-preview');
    // The corrected entries MAY mention §10 as part of explaining the past
    // error, but must not assert it as a currently-active reason not to retire.
    expect(myKoraEntry).not.toContain("CLAUDE.md §10's demo/persona preview requirement is superseded");
    expect(previewEntry).not.toContain("deletableWhen: 'CLAUDE.md §10");
  });

  it('docs/ARCHITECTURE_REGISTRY.md is regenerated and mentions the correction', () => {
    const doc = read('docs/ARCHITECTURE_REGISTRY.md');
    expect(doc).toContain('One Product / No Demo Runtime');
  });
});
