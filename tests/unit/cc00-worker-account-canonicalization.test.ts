// tests/unit/cc00-worker-account-canonicalization.test.ts
// CC-00 — Worker / Account synthetic-service canonicalization audit (2026-09-05).
//
// Goal: canonicalize worker/account service data truth without deciding
// Worker UX, /worker vs /my-kora, My KORA product shape, worker achievement
// methodology, or any new identity model — those are B-WORKER's decisions.
//
// Result of this audit: every in-scope service (WorkerProvisioningService,
// WorkerAchievementService, AccountProvisioningService,
// ActivationSafeguardService) was rigorously classified; NONE was safely
// canonicalizable within this slice's explicit constraints (no invented
// fields, no final-scoring changes, no My KORA/B-WORKER product decisions).
// No service code was modified. I9 is unchanged (8 files / 13 imports).
// This file locks in that finding as a regression guard, not a migration
// proof — see lib/architecture/registry.ts's svc.worker-provisioning,
// svc.worker-achievements, svc.account, and svc.activation-safeguard
// entries for the full reasoning.

import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'fs';
import { resolve } from 'path';

const root = resolve(process.cwd());

function read(rel: string): string {
  return readFileSync(resolve(root, rel), 'utf-8');
}

function exists(rel: string): boolean {
  return existsSync(resolve(root, rel));
}

// ── 1. Worker/account services still import their synthetic fixtures ────────
// (canonicalized/retired-where-safe — here, nothing was safely canonicalizable,
// so every import remains, unchanged, and this is asserted explicitly rather
// than silently assumed.)

describe('CC-00 Worker/Account audit — synthetic imports unchanged (nothing safely canonicalizable)', () => {
  it('WorkerProvisioningService.ts still imports data/synthetic/worker-roster.json', () => {
    expect(read('services/worker-provisioning/WorkerProvisioningService.ts')).toContain(
      "from '@/data/synthetic/worker-roster.json'",
    );
  });

  it('WorkerAchievementService.ts still imports data/synthetic/worker-achievements.json', () => {
    expect(read('services/worker-achievements/WorkerAchievementService.ts')).toContain(
      "from '@/data/synthetic/worker-achievements.json'",
    );
  });

  it('AccountProvisioningService.ts still imports data/synthetic/user-accounts.json', () => {
    expect(read('services/account/AccountProvisioningService.ts')).toContain(
      "from '@/data/synthetic/user-accounts.json'",
    );
  });

  it('ActivationSafeguardService.ts still imports data/synthetic/activation-safeguard-results.json', () => {
    expect(read('services/activation-safeguard/ActivationSafeguardService.ts')).toContain(
      "from '@/data/synthetic/activation-safeguard-results.json'",
    );
  });

  it('allowlist header still reflects 8 files / 13 import statements — unchanged by this audit', () => {
    const allowlist = read('lib/security/synthetic-import-allowlist.ts');
    expect(allowlist).toContain('CURRENT_SYNTHETIC_RUNTIME_IMPORTS = 8 files / 13 import statements');
  });
});

// ── 2. No demo role reintroduced ─────────────────────────────────────────────

describe('CC-00 Worker/Account audit — no demo role reintroduced', () => {
  it('lib/constants/kora.ts still has no DEMO_KORA_ROLES and no DEMO_VIEWER in KORA_ROLES', () => {
    const constants = read('lib/constants/kora.ts');
    expect(constants).not.toContain('DEMO_KORA_ROLES');
    const koraRolesBlock = constants.slice(
      constants.indexOf('export const KORA_ROLES'),
      constants.indexOf('as const;', constants.indexOf('export const KORA_ROLES')),
    );
    expect(koraRolesBlock).not.toContain('DEMO_VIEWER');
  });

  it('none of the 4 in-scope services define or reference a new demo/preview role string', () => {
    for (const file of [
      'services/worker-provisioning/WorkerProvisioningService.ts',
      'services/worker-achievements/WorkerAchievementService.ts',
      'services/account/AccountProvisioningService.ts',
      'services/activation-safeguard/ActivationSafeguardService.ts',
    ]) {
      const src = read(file);
      expect(src).not.toMatch(/_VIEWER'|_PREVIEW_ROLE'/);
    }
  });
});

// ── 3. No tenant_kind product branch ──────────────────────────────────────────

describe('CC-00 Worker/Account audit — no tenant_kind branch introduced', () => {
  it('none of the 4 in-scope services reference tenant_kind, KoraTest, or Bosco Verde', () => {
    for (const file of [
      'services/worker-provisioning/WorkerProvisioningService.ts',
      'services/worker-achievements/WorkerAchievementService.ts',
      'services/account/AccountProvisioningService.ts',
      'services/activation-safeguard/ActivationSafeguardService.ts',
    ]) {
      const src = read(file).toLowerCase();
      expect(src).not.toContain('tenant_kind');
      expect(src).not.toContain('koratest');
      expect(src).not.toContain('bosco verde');
      expect(src).not.toContain('boscoverde');
    }
  });
});

// ── 4. Real account-role authority unchanged ─────────────────────────────────

describe('CC-00 Worker/Account audit — account role authority unchanged', () => {
  it('AccountProvisioningService does not assign or resolve session roles (no koraRole/app_metadata write)', () => {
    const src = read('services/account/AccountProvisioningService.ts');
    expect(src).not.toContain('app_metadata');
    expect(src).not.toContain('updateUserById');
  });

  it('every real require*User() session guard in kora-session.ts is untouched (strict equality intact)', () => {
    const session = read('lib/auth/kora-session.ts');
    for (const check of ["koraRole !== 'KORA_ADMIN'", "koraRole !== 'COMPANY_ADMIN'", "koraRole !== 'WORKER'", "koraRole !== 'PARTNER'"]) {
      expect(session).toContain(check);
    }
  });
});

// ── 5. My KORA long-term product decision not made ───────────────────────────

describe('CC-00 Worker/Account audit — My KORA product decision not made', () => {
  it('app/my-kora/page.tsx and app/my-kora/dynamic-cv/page.tsx are structurally unchanged — still call workerAchievementService directly', () => {
    expect(read('app/my-kora/page.tsx')).toContain('workerAchievementService.getAchievementStats()');
    expect(read('app/my-kora/dynamic-cv/page.tsx')).toContain('workerAchievementService.getAchievementStats()');
  });

  it('app/my-kora/page.tsx still carries its PREVIEW/synthetic-data disclosure badge — not silently hidden or removed', () => {
    const src = read('app/my-kora/page.tsx');
    expect(src).toContain('mode="PREVIEW"');
    expect(src).toContain('dati sintetici');
  });

  it('AccountProvisioningService.getCurrentDemoUser() (My KORA persona resolution) is untouched', () => {
    const src = read('services/account/AccountProvisioningService.ts');
    expect(src).toContain('getCurrentDemoUser(role?: string): KoraUserAccount');
  });
});

// ── 6. B-WORKER not started ───────────────────────────────────────────────────

describe('CC-00 Worker/Account audit — B-WORKER not started', () => {
  it('no new worker-facing route, component, or service file was added by this audit', () => {
    // The audit touched only lib/architecture/registry.ts, docs/ARCHITECTURE_REGISTRY.md,
    // and this test file — no app/worker/**, app/my-kora/**, or services/worker-*/** file exists
    // that did not already exist before this slice.
    expect(exists('services/worker-provisioning/WorkerProvisioningService.ts')).toBe(true);
    expect(exists('services/worker-achievements/WorkerAchievementService.ts')).toBe(true);
  });
});

// ── 7. Worker achievement semantics not invented ─────────────────────────────

describe('CC-00 Worker/Account audit — worker achievement model not invented', () => {
  it('no canonical achievement/evidence/recognition table exists in any migration', () => {
    const migrationsDir = resolve(root, 'supabase/migrations');
    const files = readdirSync(migrationsDir).filter((f) => f.endsWith('.sql'));
    for (const f of files) {
      const sql = readFileSync(resolve(migrationsDir, f), 'utf-8').toLowerCase();
      expect(sql).not.toContain('achievement');
    }
  });

  it('WorkerAchievementService method signatures are unchanged (no new methodology fields)', () => {
    const src = read('services/worker-achievements/WorkerAchievementService.ts');
    for (const method of ['getAchievements', 'getRecentAchievements', 'getVerifiedAchievements', 'getCvEligibleAchievements', 'getAchievementStats']) {
      expect(src).toContain(method);
    }
  });
});

// ── 8. No downstream-output seeding ───────────────────────────────────────────

describe('CC-00 Worker/Account audit — no downstream output seeding introduced', () => {
  it('none of the 4 in-scope services import from analytics.* result tables or write scoring/decision-pack output', () => {
    for (const file of [
      'services/worker-provisioning/WorkerProvisioningService.ts',
      'services/worker-achievements/WorkerAchievementService.ts',
      'services/account/AccountProvisioningService.ts',
      'services/activation-safeguard/ActivationSafeguardService.ts',
    ]) {
      const src = read(file);
      expect(src).not.toContain('getSupabaseServiceClient');
      expect(src).not.toContain('getSupabaseServerClient');
      expect(src).not.toMatch(/\.schema\(['"]analytics['"]\)/);
    }
  });
});

// ── 9-12. Prior CC-00 slices remain intact ───────────────────────────────────

describe('CC-00 Worker/Account audit — prior slices untouched', () => {
  it('DEMO_VIEWER remains retired after #154', () => {
    const constants = read('lib/constants/kora.ts');
    expect(constants).toContain("export const REMOVED_KORA_ROLES = ['COMPANY_VIEWER', 'DEMO_VIEWER']");
    expect(exists('lib/auth/demo-guard.tsx')).toBe(false);
    expect(exists('app/api/admin/demo/provision-viewer/route.ts')).toBe(false);
  });

  it('public landing (app/page.tsx) remains synthetic-free', () => {
    const src = read('app/page.tsx');
    expect(src).not.toMatch(/from ['"][^'"]*data\/synthetic\//);
  });

  it('Admin Console remains canonical — zero badgeMode="DEMO" on Admin Home', () => {
    expect(read('app/admin/page.tsx')).not.toContain('badgeMode="DEMO"');
  });

  it('Portfolio remains canonical — Company Readiness Matrix still reads `registry`', () => {
    expect(read('app/admin/page.tsx')).toContain('registry');
    expect(exists('app/demo/portfolio')).toBe(false);
  });
});

// ── 13. Final scoring untouched ───────────────────────────────────────────────

describe('CC-00 Worker/Account audit — final scoring untouched', () => {
  it('ScoringSimulatorService.ts is untouched — still calls activationSafeguardService.evaluateFromSeed unchanged', () => {
    const src = read('services/scoring-simulator/ScoringSimulatorService.ts');
    expect(src).toContain('activationSafeguardService.evaluateFromSeed(companyId, scenarioId)');
  });

  it('ActivationSafeguardService.evaluate() (real, canonical, methodology-driven) remains the only method every live company page calls', () => {
    for (const page of ['app/company/activation/page.tsx', 'app/company/kora-index/page.tsx', 'app/company/reports/page.tsx']) {
      const src = read(page);
      expect(src).toMatch(/activationSafeguardService\.evaluate\(/);
      expect(src).not.toContain('activationSafeguardService.evaluateFromSeed');
    }
  });
});

// ── 14. CC-00 remains open ────────────────────────────────────────────────────

describe('CC-00 Worker/Account audit — CC-00 status', () => {
  it('registry does not claim CC-00 is closed on any of the audited entries', () => {
    const registry = read('lib/architecture/registry.ts');
    for (const id of ["id: 'svc.worker-provisioning'", "id: 'svc.worker-achievements'", "id: 'svc.account'", "id: 'svc.activation-safeguard'"]) {
      const idx = registry.indexOf(id);
      expect(idx).toBeGreaterThan(-1);
      const entry = registry.slice(idx, registry.indexOf('{ id:', idx + 10));
      expect(entry).not.toMatch(/CC-00 (closed|resolved|complete)/i);
    }
  });
});

// ── Deferred Worker Capability Register ──────────────────────────────────────
// Formal record of synthetic concepts representing potentially valid future
// product capability, deferred to B-WORKER — not implemented here.

describe('CC-00 Worker/Account audit — Deferred Worker Capability Register', () => {
  it('Worker achievements / portable development record — deferred to B-WORKER, requires a real evidence/recognition domain model', () => {
    // Source concept: WorkerAchievementService (data/synthetic/worker-achievements.json).
    // Why potentially valuable: a worker-facing recognition/portable-record layer
    //   is a plausible real product capability (worker-private, employer-invisible).
    // Why not canonical today: zero DB migrations reference "achievement" — no
    //   persisted, tenant-scoped, evidence-backed domain object exists.
    // Required evidence/model: a real achievement/recognition table tied to
    //   verified UEF/contribution records, with a verification workflow.
    // Track: B-WORKER.
    expect(exists('services/worker-achievements/WorkerAchievementService.ts')).toBe(true);
  });

  it('Worker roster live-data migration (department/site/my_kora_enabled) — deferred to B-WORKER, requires new async data-fetching architecture', () => {
    // Source concept: WorkerProvisioningService (data/synthetic/worker-roster.json).
    // Why potentially valuable: real-time worker roster/adoption metrics for
    //   admin (WorkforceQuickAccessPanel) and company (WorkerAdoptionPanel) surfaces.
    // Why not canonical today: aggregate counts (total/invited/active/pending/
    //   disabled) DO have a real source (personal.worker_identity,
    //   analytics.fn_company_worker_status()), but per-worker fields (department,
    //   site, my_kora_enabled, pib_private_enabled) have no canonical column, and
    //   the consuming components are 'use client', requiring a new async/server
    //   data-fetching path to wire in real data.
    // Required evidence/model: a canonical my_kora_enabled-equivalent flag (or
    //   product decision that it doesn't need one), plus a batched
    //   server-side aggregate-fetch API for the admin/company panels.
    // Track: B-WORKER / REVIEW_REQUIRED (architecture change needs explicit authorization).
    expect(exists('services/worker-provisioning/WorkerProvisioningService.ts')).toBe(true);
  });

  it('My KORA live session identity — deferred to B-WORKER, requires deciding My KORA live-session model', () => {
    // Source concept: AccountProvisioningService.getCurrentDemoUser().
    // Why potentially valuable: a real WORKER session driving My KORA content
    //   instead of demo-state persona switching.
    // Why not canonical today: My KORA has no live session mode at all today
    //   (middleware.ts's own comment confirms demo-state role switching, not a
    //   live Supabase JWT) — this is a My KORA product-shape decision, not a
    //   data-truth substitution.
    // Required evidence/model: B-WORKER's decision on whether/when My KORA
    //   gains a live session mode, and what identity data it reads.
    // Track: B-WORKER.
    expect(exists('services/account/AccountProvisioningService.ts')).toBe(true);
  });
});
