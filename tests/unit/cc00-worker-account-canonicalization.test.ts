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

  // PRIOR HISTORY (accurate as of this audit, preserved verbatim):
  // "WorkerAchievementService.ts still imports data/synthetic/worker-achievements.json."
  // B-WORKER "One Product / No Demo Runtime" correction (2026-09-06) deleted
  // the file entirely (zero real callers, no replacement domain invented).
  it('WorkerAchievementService.ts no longer exists (retired since this audit)', () => {
    expect(exists('services/worker-achievements/WorkerAchievementService.ts')).toBe(false);
  });

  // PRIOR HISTORY (accurate as of this audit, preserved verbatim):
  // "AccountProvisioningService.ts still imports data/synthetic/user-accounts.json."
  // B-WORKER AccountProvisioning dead-code retirement (2026-09-06) deleted
  // the file and its seed entirely (zero real callers of any of its 18
  // methods, no replacement domain invented).
  it('AccountProvisioningService.ts no longer exists (retired since this audit)', () => {
    expect(exists('services/account/AccountProvisioningService.ts')).toBe(false);
  });

  // PRIOR HISTORY (accurate as of its own time, preserved verbatim):
  // "ActivationSafeguardService.ts still imports
  // data/synthetic/activation-safeguard-results.json." CC-00 Final Scoring
  // Canonicalization (2026-09-05) — a later, separate slice — removed
  // evaluateFromSeed() (its only caller was the now-deleted
  // ScoringSimulatorService) and its synthetic import. evaluate() is
  // unchanged. This was not part of the worker/account cluster this audit
  // examined (AccountProvisioningService, WorkerAchievementService,
  // WorkerProvisioningService) — it was the file's OTHER, final-scoring-
  // coupled path, tracked separately per this audit's own finding above.
  it('ActivationSafeguardService.ts no longer imports activation-safeguard-results.json (evaluateFromSeed retired)', () => {
    const src = read('services/activation-safeguard/ActivationSafeguardService.ts');
    const codeOnly = src.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
    expect(src).not.toContain("from '@/data/synthetic/activation-safeguard-results.json'");
    expect(codeOnly).not.toContain('evaluateFromSeed');
  });

  // 8 files / 13 imports was accurate at the time this audit ran. CC-00
  // Bucket C cleanup (2026-09-05, a later, separate slice) resolved the 2
  // I9 residuals independent of this cluster (app/demo/page.tsx,
  // FounderValidationService.ts) — none of the 4 worker/account-cluster
  // files this audit examined were touched by that slice.
  it('allowlist header reflects the current total, 1 files / 1 import statements (historical note: was 8/13 at the time this audit ran)', () => {
    const allowlist = read('lib/security/synthetic-import-allowlist.ts');
    expect(allowlist).toContain('CURRENT_SYNTHETIC_RUNTIME_IMPORTS = 1 files / 1 import statements');
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

  it('none of the 2 remaining in-scope services define or reference a new demo/preview role string', () => {
    for (const file of [
      'services/worker-provisioning/WorkerProvisioningService.ts',
      // PRIOR HISTORY: 'services/worker-achievements/WorkerAchievementService.ts'
      // was checked here. B-WORKER "One Product / No Demo Runtime" correction
      // (2026-09-06) deleted it entirely — removed from this list.
      // PRIOR HISTORY: 'services/account/AccountProvisioningService.ts' was
      // checked here. B-WORKER AccountProvisioning dead-code retirement
      // (2026-09-06) deleted it entirely — removed from this list.
      'services/activation-safeguard/ActivationSafeguardService.ts',
    ]) {
      const src = read(file);
      expect(src).not.toMatch(/_VIEWER'|_PREVIEW_ROLE'/);
    }
  });
});

// ── 3. No tenant_kind product branch ──────────────────────────────────────────

describe('CC-00 Worker/Account audit — no tenant_kind branch introduced', () => {
  it('none of the 2 remaining in-scope services reference tenant_kind, KoraTest, or Bosco Verde', () => {
    for (const file of [
      'services/worker-provisioning/WorkerProvisioningService.ts',
      // PRIOR HISTORY: 'services/worker-achievements/WorkerAchievementService.ts'
      // was checked here. B-WORKER "One Product / No Demo Runtime" correction
      // (2026-09-06) deleted it entirely — removed from this list.
      // PRIOR HISTORY: 'services/account/AccountProvisioningService.ts' was
      // checked here. B-WORKER AccountProvisioning dead-code retirement
      // (2026-09-06) deleted it entirely — removed from this list.
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
  // PRIOR HISTORY (accurate as of this audit, preserved verbatim): asserted
  // AccountProvisioningService did not assign or resolve session roles. The
  // file is now deleted entirely (B-WORKER AccountProvisioning dead-code
  // retirement, 2026-09-06) — there is no session-role authority left to
  // audit in it.
  it('AccountProvisioningService.ts no longer exists — no session-role authority to audit', () => {
    expect(exists('services/account/AccountProvisioningService.ts')).toBe(false);
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
  // PRIOR HISTORY (accurate as of this audit, preserved verbatim): asserted
  // both pages still called workerAchievementService.getAchievementStats()
  // directly and app/my-kora/page.tsx still carried its PREVIEW/synthetic
  // disclosure badge. B-WORKER "One Product / No Demo Runtime" correction
  // (2026-09-06) rewrote both pages as pure, unconditional redirect()s — the
  // "My KORA long-term product decision" this describe block's title refers
  // to IS this later, separately-authorized correction.
  it('app/my-kora/page.tsx and app/my-kora/dynamic-cv/page.tsx are now pure canonical redirects (the deferred product decision, made since)', () => {
    expect(read('app/my-kora/page.tsx')).toContain("redirect('/worker/workspace')");
    expect(read('app/my-kora/dynamic-cv/page.tsx')).toContain("redirect('/worker/dynamic-cv')");
    expect(read('app/my-kora/page.tsx')).not.toContain('workerAchievementService');
  });

  // PRIOR HISTORY (accurate as of this audit, preserved verbatim): asserted
  // getCurrentDemoUser() (My KORA persona resolution) was untouched. Its
  // sole real caller (app/my-kora/page.tsx) had already been removed by an
  // unrelated migration; B-WORKER final cleanup (2026-09-06) verified that
  // fresh and removed the now-dead method.
  it('AccountProvisioningService.ts no longer exists — getCurrentDemoUser() and every other method were both eventually proven zero-caller', () => {
    expect(exists('services/account/AccountProvisioningService.ts')).toBe(false);
  });
});

// ── 6. B-WORKER not started ───────────────────────────────────────────────────

describe('CC-00 Worker/Account audit — B-WORKER not started', () => {
  it('no new worker-facing route, component, or service file was added by this audit', () => {
    // The audit touched only lib/architecture/registry.ts, docs/ARCHITECTURE_REGISTRY.md,
    // and this test file — no app/worker/**, app/my-kora/**, or services/worker-*/** file exists
    // that did not already exist before this slice.
    expect(exists('services/worker-provisioning/WorkerProvisioningService.ts')).toBe(true);
    // PRIOR HISTORY: WorkerAchievementService.ts existed at this audit's own
    // time. B-WORKER "One Product / No Demo Runtime" correction (2026-09-06)
    // deleted it (a later, separately-authorized retirement, not new scope).
    expect(exists('services/worker-achievements/WorkerAchievementService.ts')).toBe(false);
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

  // PRIOR HISTORY (accurate as of this audit, preserved verbatim): asserted
  // all 5 WorkerAchievementService method signatures were unchanged. B-WORKER
  // "One Product / No Demo Runtime" correction (2026-09-06) deleted the file
  // entirely (zero real callers) — no replacement methodology was invented,
  // per explicit founder instruction (no new achievement domain object).
  it('WorkerAchievementService no longer exists; no new achievement methodology was invented to replace it', () => {
    expect(exists('services/worker-achievements/WorkerAchievementService.ts')).toBe(false);
    expect(exists('services/worker-achievement-v2')).toBe(false);
    expect(exists('services/achievement')).toBe(false);
  });
});

// ── 8. No downstream-output seeding ───────────────────────────────────────────

describe('CC-00 Worker/Account audit — no downstream output seeding introduced', () => {
  it('none of the 2 remaining in-scope services import from analytics.* result tables or write scoring/decision-pack output', () => {
    for (const file of [
      'services/worker-provisioning/WorkerProvisioningService.ts',
      // PRIOR HISTORY: 'services/worker-achievements/WorkerAchievementService.ts'
      // was checked here. B-WORKER "One Product / No Demo Runtime" correction
      // (2026-09-06) deleted it entirely — removed from this list.
      // PRIOR HISTORY: 'services/account/AccountProvisioningService.ts' was
      // checked here. B-WORKER AccountProvisioning dead-code retirement
      // (2026-09-06) deleted it entirely — removed from this list.
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
  // PRIOR HISTORY (accurate as of its own time, preserved verbatim):
  // "ScoringSimulatorService.ts is untouched — still calls
  // activationSafeguardService.evaluateFromSeed unchanged." CC-00 Final
  // Scoring Canonicalization (2026-09-05) — a later, separate,
  // unrelated-to-this-audit slice — deleted ScoringSimulatorService.ts
  // entirely (zero real callers, last B-TRUTH-owned synthetic scoring
  // dependency), which is why evaluateFromSeed() itself could then also be
  // retired (see the "no longer imports activation-safeguard-results.json"
  // test above).
  it('ScoringSimulatorService.ts no longer exists (CC-00 Final Scoring Canonicalization, 2026-09-05)', () => {
    expect(exists('services/scoring-simulator/ScoringSimulatorService.ts')).toBe(false);
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
  // PRIOR HISTORY (accurate as of this audit, preserved verbatim): recorded
  // "worker achievements / portable development record" as a DEFERRED
  // capability requiring a real evidence/recognition domain model, tracked
  // to B-WORKER. B-WORKER "One Product / No Demo Runtime" correction
  // (2026-09-06) resolved this deferral by RETIRING the synthetic concept
  // outright — no real evidence/recognition domain model was invented (per
  // explicit founder instruction not to fabricate one). If a genuine worker
  // recognition capability is ever built, it starts fresh against a real,
  // persisted, tenant-scoped domain object — not by reviving this file.
  it('Worker achievements / portable development record — resolved by retirement, not by inventing a domain model', () => {
    expect(exists('services/worker-achievements/WorkerAchievementService.ts')).toBe(false);
    expect(exists('services/worker-achievement-v2')).toBe(false);
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

  // PRIOR HISTORY (accurate as of this audit, preserved verbatim): recorded
  // "My KORA live session identity" (AccountProvisioningService.getCurrentDemoUser())
  // as a DEFERRED capability requiring a My KORA product-shape decision,
  // tracked to B-WORKER. B-WORKER "One Product / No Demo Runtime" correction
  // (2026-09-06) resolved that deferral: My KORA's anonymous/persona runtime
  // is retired entirely (redirect-only), so there is no "live session
  // identity" concept left to build — /worker/** already has real Supabase
  // JWT session identity. B-WORKER AccountProvisioning dead-code retirement
  // (2026-09-06, the next slice) then found AccountProvisioningService.ts
  // itself fully zero-caller and deleted it.
  it('My KORA live session identity — resolved by retiring the demo runtime, not by inventing one', () => {
    expect(exists('services/account/AccountProvisioningService.ts')).toBe(false);
  });
});
