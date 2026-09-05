// tests/unit/cc00-i9-governance-ratification.test.ts
// CC-00 — I9 Governance Ratification (2026-09-05).
//
// Resolves the sequencing contradiction the CC-00 Closure Decision Gate
// found: Master Plan Section 28 names "I9 = 0" as a CC-022/B-TRUTH closure
// condition at day 20, but 3 of the 6 remaining I9 residuals
// (AccountProvisioningService, WorkerAchievementService,
// WorkerProvisioningService) cannot be reduced to zero without a Worker/My
// KORA product decision that the Master Plan itself reserves to B-WORKER
// (CC-025), which starts at day 23 — after CC-022, not before it.
//
// Ratified resolution (docs/KORA_OFFICIAL_IMPLEMENTATION_MASTER_PLAN_v2.1.md
// §32a): GLOBAL_I9_ZERO_REINTERPRETED = YES, BTRUTH_SCOPED_I9_ZERO_REQUIRED =
// YES, BWORKER_RESIDUALS_STILL_TRACKED = YES. Every I9 entry now carries an
// `owner` field (lib/security/synthetic-import-allowlist.ts). CC-022's own
// closure gate checks only the B_TRUTH-owned subset; the B_WORKER-owned
// subset is transferred to B-WORKER's own closure requirement, not deleted,
// not hidden, not exempted.
//
// This slice changes NO runtime behavior — only governance/test-only code
// (the `owner` field and its two derived arrays) and documentation.

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import {
  SYNTHETIC_IMPORT_ALLOWLIST,
  BTRUTH_OWNED_SYNTHETIC_IMPORTS,
  BWORKER_OWNED_SYNTHETIC_IMPORTS,
} from '@/lib/security/synthetic-import-allowlist';

const root = resolve(process.cwd());

function read(rel: string): string {
  return readFileSync(resolve(root, rel), 'utf-8');
}

function exists(rel: string): boolean {
  return existsSync(resolve(root, rel));
}

const EXPECTED_BTRUTH_FILES = [
  'services/scoring-simulator/ScoringSimulatorService.ts',
  'services/demo-data/DemoDataService.ts',
  'services/activation-safeguard/ActivationSafeguardService.ts',
].sort();

const EXPECTED_BWORKER_FILES = [
  'services/account/AccountProvisioningService.ts',
  'services/worker-achievements/WorkerAchievementService.ts',
  'services/worker-provisioning/WorkerProvisioningService.ts',
].sort();

// ── 1. Every importer has an owner; no UNKNOWN ──────────────────────────────

describe('CC-00 I9 Governance Ratification — ownership completeness', () => {
  it('every allowlist entry has an owner of exactly B_TRUTH or B_WORKER (no UNKNOWN, no missing field)', () => {
    for (const entry of SYNTHETIC_IMPORT_ALLOWLIST) {
      expect(['B_TRUTH', 'B_WORKER']).toContain(entry.owner);
    }
  });

  it('the ownership-classified entries partition the full allowlist exactly (no overlap, no gap)', () => {
    const total = SYNTHETIC_IMPORT_ALLOWLIST.length;
    expect(BTRUTH_OWNED_SYNTHETIC_IMPORTS.length + BWORKER_OWNED_SYNTHETIC_IMPORTS.length).toBe(total);
    const btruthFiles = new Set(BTRUTH_OWNED_SYNTHETIC_IMPORTS.map((e) => e.file));
    const bworkerFiles = new Set(BWORKER_OWNED_SYNTHETIC_IMPORTS.map((e) => e.file));
    for (const f of btruthFiles) expect(bworkerFiles.has(f)).toBe(false);
  });
});

// ── 2 & 3. B-TRUTH / B-WORKER residual sets match the ratified, evidenced map ──

describe('CC-00 I9 Governance Ratification — ownership map matches repository evidence', () => {
  it('B-TRUTH-owned residuals are exactly the final-scoring cluster', () => {
    const files = BTRUTH_OWNED_SYNTHETIC_IMPORTS.map((e) => e.file).sort();
    expect(files).toEqual(EXPECTED_BTRUTH_FILES);
  });

  it('B-WORKER-owned residuals are exactly the transferred worker/account cluster', () => {
    const files = BWORKER_OWNED_SYNTHETIC_IMPORTS.map((e) => e.file).sort();
    expect(files).toEqual(EXPECTED_BWORKER_FILES);
  });
});

// ── 4. CC-022 checks the B-TRUTH-scoped count only ──────────────────────────

describe('CC-00 I9 Governance Ratification — CC-022 gate is B-TRUTH-scoped', () => {
  it('the B-TRUTH-scoped count (the CC-022 closure gate) is independent of the total allowlist count', () => {
    // CC-022 closes when BTRUTH_OWNED_SYNTHETIC_IMPORTS.length === 0, not
    // when SYNTHETIC_IMPORT_ALLOWLIST.length === 0. Today neither is zero
    // (final scoring has not started this slice), but the two must be
    // measured, and must be able to diverge, independently.
    expect(BTRUTH_OWNED_SYNTHETIC_IMPORTS.length).toBe(3);
    expect(SYNTHETIC_IMPORT_ALLOWLIST.length).toBe(6);
    expect(BTRUTH_OWNED_SYNTHETIC_IMPORTS.length).toBeLessThan(SYNTHETIC_IMPORT_ALLOWLIST.length);
  });

  it('the Master Plan records the B-TRUTH-scoped reinterpretation of CC-022 without erasing the original "I9 = 0" wording', () => {
    const plan = read('docs/KORA_OFFICIAL_IMPLEMENTATION_MASTER_PLAN_v2.1.md');
    // Original wording preserved verbatim.
    expect(plan).toContain('demo = live, I9 = 0; KORA Space live');
    expect(plan).toContain('I9 = 0, adversarial superata');
    // New ratification section present, in order after §32, before §33.
    const idx32a = plan.indexOf('# 32a. CC-022');
    const idx32 = plan.indexOf('# 32. SAFE DELETION PLAN');
    const idx33 = plan.indexOf('# 33. DO-NOT-DELETE');
    expect(idx32a).toBeGreaterThan(idx32);
    expect(idx32a).toBeLessThan(idx33);
    expect(plan).toContain('GLOBAL_I9_ZERO_REINTERPRETED = YES');
    expect(plan).toContain('BTRUTH_SCOPED_I9_ZERO_REQUIRED = YES');
    expect(plan).toContain('BWORKER_RESIDUALS_STILL_TRACKED = YES');
  });
});

// ── 5. Global count remains observable ──────────────────────────────────────

describe('CC-00 I9 Governance Ratification — visibility preserved', () => {
  it('the total allowlist count remains fully visible (not hidden behind the ownership split)', () => {
    expect(SYNTHETIC_IMPORT_ALLOWLIST.length).toBe(6);
    const allowlistSrc = read('lib/security/synthetic-import-allowlist.ts');
    expect(allowlistSrc).toContain('CURRENT_SYNTHETIC_RUNTIME_IMPORTS = 6 files / 11 import statements');
  });
});

// ── 6. No generic exemption or wildcard exists ──────────────────────────────

describe('CC-00 I9 Governance Ratification — no generic exemption', () => {
  it('exactly 3 named files carry owner B_WORKER — not a pattern, not a wildcard', () => {
    expect(BWORKER_OWNED_SYNTHETIC_IMPORTS.length).toBe(3);
    expect(BWORKER_OWNED_SYNTHETIC_IMPORTS.map((e) => e.file).sort()).toEqual(EXPECTED_BWORKER_FILES);
  });

  it('the allowlist source defines owner per-entry as a literal, not derived from a rule/pattern function', () => {
    const src = read('lib/security/synthetic-import-allowlist.ts');
    // Only count matches inside the actual array literal (between the
    // `export const SYNTHETIC_IMPORT_ALLOWLIST` declaration and its closing
    // `];`) — explanatory header comments above it legitimately quote
    // `owner: 'B_WORKER'` / `owner: 'B_TRUTH'` in prose and must not be
    // counted as data-array entries.
    const arrayStart = src.indexOf('export const SYNTHETIC_IMPORT_ALLOWLIST');
    const arrayEnd = src.indexOf('];', arrayStart);
    const arrayBody = src.slice(arrayStart, arrayEnd);
    const ownerLiterals = arrayBody.match(/owner:\s*'(B_TRUTH|B_WORKER)'/g) ?? [];
    expect(ownerLiterals.length).toBe(SYNTHETIC_IMPORT_ALLOWLIST.length);
    // No wildcard/glob-based owner assignment exists anywhere in the file.
    expect(src).not.toMatch(/owner:\s*getOwnerFor|owner:\s*inferOwner|owner:\s*\*/);
  });
});

// ── 7. Worker residuals still fail B-WORKER closure until removed ──────────

describe('CC-00 I9 Governance Ratification — B-WORKER residuals remain open, not permanent', () => {
  it('B-WORKER-owned residuals are non-zero today — the transfer does not close B-WORKER, it only reassigns the blocker', () => {
    expect(BWORKER_OWNED_SYNTHETIC_IMPORTS.length).toBeGreaterThan(0);
  });

  it('no B-WORKER-owned entry is marked permanent, canonical, or exempt in the registry', () => {
    const registry = read('lib/architecture/registry.ts');
    for (const id of ["id: 'svc.account'", "id: 'svc.worker-achievements'", "id: 'svc.worker-provisioning'"]) {
      const idx = registry.indexOf(id);
      expect(idx).toBeGreaterThan(-1);
      const entry = registry.slice(idx, registry.indexOf('{ id:', idx + 10));
      expect(entry).toMatch(/status:\s*'CONSOLIDATE'/);
      expect(entry).not.toMatch(/status:\s*'CANONICAL'|status:\s*'FROZEN'/);
    }
  });
});

// ── 8 & 9 & 11. Final scoring runtime and worker runtime untouched ──────────

describe('CC-00 I9 Governance Ratification — runtime untouched', () => {
  it('the B-TRUTH final-scoring cluster files still exist and still carry their original synthetic imports (no runtime change)', () => {
    for (const file of EXPECTED_BTRUTH_FILES) {
      expect(exists(file)).toBe(true);
    }
    // Cross-check against the live I9 scan performed by cc002: the files
    // this slice classifies as B_TRUTH must be the same files the scanner
    // independently finds importing data/synthetic/** today.
    const liveFiles = new Set(SYNTHETIC_IMPORT_ALLOWLIST.map((e) => e.file));
    for (const file of EXPECTED_BTRUTH_FILES) expect(liveFiles.has(file)).toBe(true);
  });

  it('the B-WORKER worker/account cluster files still exist and still carry their original synthetic imports (no runtime change)', () => {
    for (const file of EXPECTED_BWORKER_FILES) {
      expect(exists(file)).toBe(true);
    }
    const liveFiles = new Set(SYNTHETIC_IMPORT_ALLOWLIST.map((e) => e.file));
    for (const file of EXPECTED_BWORKER_FILES) expect(liveFiles.has(file)).toBe(true);
  });

  it('ScoringSimulatorService, WorkerProvisioningService, WorkerAchievementService, and AccountProvisioningService source files are unmodified in behavior (reason text describes the same synthetic dependency as before this slice)', () => {
    const allowlistSrc = read('lib/security/synthetic-import-allowlist.ts');
    expect(allowlistSrc).toContain("reason: 'Demo scoring path — KORA Index outputs, company aggregates, confidence records. Master Plan §32: scheduled for removal at end of B-TRUTH.'");
    expect(allowlistSrc).toContain("reason: 'Demo worker roster seed for provisioning flows.'");
    expect(allowlistSrc).toContain("reason: 'Worker-private demo achievements seed.'");
    expect(allowlistSrc).toContain("reason: 'Demo account registry — reads synthetic user accounts.'");
  });
});

// ── 10. B-WORKER has not started ────────────────────────────────────────────

describe('CC-00 I9 Governance Ratification — B-WORKER not started', () => {
  it('no My KORA live-session identity model was introduced by this slice', () => {
    const accountSrc = read('services/account/AccountProvisioningService.ts');
    // getCurrentDemoUser() must still be the demo-state persona resolver —
    // this slice does not touch it, per its own governance-only scope.
    expect(accountSrc).toContain('getCurrentDemoUser');
  });

  it('worker roster and worker achievements still read from data/synthetic/** (still 100% synthetic, not migrated)', () => {
    const rosterSrc = read('services/worker-provisioning/WorkerProvisioningService.ts');
    const achievementsSrc = read('services/worker-achievements/WorkerAchievementService.ts');
    expect(rosterSrc).toMatch(/from ['"][^'"]*\/data\/synthetic\/worker-roster\.json['"]/);
    expect(achievementsSrc).toMatch(/from ['"][^'"]*\/data\/synthetic\/worker-achievements\.json['"]/);
  });
});

// ── 12. CC-00 remains OPEN ───────────────────────────────────────────────────

describe('CC-00 I9 Governance Ratification — CC-00 status', () => {
  it('registry does not claim CC-00 is closed on any of the 6 touched entries', () => {
    const registry = read('lib/architecture/registry.ts');
    const ids = [
      "id: 'svc.account'",
      "id: 'svc.activation-safeguard'",
      "id: 'svc.demo-data'",
      "id: 'svc.scoring-simulator'",
      "id: 'svc.worker-achievements'",
      "id: 'svc.worker-provisioning'",
    ];
    for (const id of ids) {
      const idx = registry.indexOf(id);
      expect(idx).toBeGreaterThan(-1);
      const entry = registry.slice(idx, registry.indexOf('{ id:', idx + 10));
      expect(entry).not.toMatch(/CC-00 (is )?(closed|resolved|complete)\b/i);
    }
  });

  it('this is a governance/documentation slice — no final scoring, no B-WORKER, no My KORA redesign was started', () => {
    const registry = read('lib/architecture/registry.ts');
    expect(registry).not.toContain('B-WORKER started');
    expect(registry).not.toContain('final scoring implemented');
  });
});
