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
//
// CC-00 Final Scoring Canonicalization (2026-09-05, a later, separate
// slice): acted on the ratification above — all 3 owner: 'B_TRUTH' entries
// (ScoringSimulatorService.ts, DemoDataService.ts,
// ActivationSafeguardService.ts's synthetic path) are retired.
// BTRUTH_OWNED_SYNTHETIC_IMPORTS is now [] — CC-022's B-TRUTH-scoped I9 gate
// is satisfied. The 3 owner: 'B_WORKER' entries are untouched, still
// tracked, still non-zero — this slice did not close B-WORKER. The tests
// below are updated in place (PRIOR HISTORY notes preserved per-assertion)
// to reflect this; see tests/unit/cc00-final-scoring-canonicalization.test.ts
// for that slice's own full regression suite.

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

// PRIOR HISTORY (accurate as of its own time, preserved verbatim): at this
// slice's own time, EXPECTED_BTRUTH_FILES held these 3 files, none yet
// retired. CC-00 Final Scoring Canonicalization (2026-09-05) retired all 3
// — BTRUTH_OWNED_SYNTHETIC_IMPORTS is now genuinely empty. Kept here,
// unused by any assertion below, as the historical record of what the
// B-TRUTH-owned set used to contain.
const _HISTORICAL_EXPECTED_BTRUTH_FILES = [
  'services/scoring-simulator/ScoringSimulatorService.ts',
  'services/demo-data/DemoDataService.ts',
  'services/activation-safeguard/ActivationSafeguardService.ts',
].sort();
void _HISTORICAL_EXPECTED_BTRUTH_FILES;

// PRIOR HISTORY (accurate as of CC-00 I9 Governance Ratification, preserved
// verbatim): included 'services/worker-achievements/WorkerAchievementService.ts'.
// B-WORKER "One Product / No Demo Runtime" correction (2026-09-06) deleted
// that file entirely (zero real callers once its 2 callers became pure
// canonical redirects) and removed it from the allowlist — 2 files remained.
// B-WORKER AccountProvisioning dead-code retirement (2026-09-06, the next
// slice) deleted 'services/account/AccountProvisioningService.ts' too (zero
// real callers of any of its 18 methods) — 1 file remained.
// B-WORKER WorkerProvisioning Canonicalization (2026-09-06, the final
// B-WORKER implementation slice) retired the last entry too — the
// B_WORKER-owned set is now empty (BWORKER_I9 = 0).
const EXPECTED_BWORKER_FILES: string[] = [].sort();

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
  // PRIOR HISTORY (accurate as of its own time, preserved verbatim):
  // "B-TRUTH-owned residuals are exactly the final-scoring cluster" —
  // asserted BTRUTH_OWNED_SYNTHETIC_IMPORTS equaled the 3-file
  // final-scoring cluster. CC-00 Final Scoring Canonicalization
  // (2026-09-05) retired all 3 — the set is now empty, satisfying the
  // CC-022 B-TRUTH-scoped I9 gate this ratification defined.
  it('B-TRUTH-owned residuals are now empty — CC-022 B-TRUTH-scoped I9 gate satisfied', () => {
    expect(BTRUTH_OWNED_SYNTHETIC_IMPORTS).toEqual([]);
  });

  it('B-WORKER-owned residuals are exactly the transferred worker/account cluster', () => {
    const files = BWORKER_OWNED_SYNTHETIC_IMPORTS.map((e) => e.file).sort();
    expect(files).toEqual(EXPECTED_BWORKER_FILES);
  });
});

// ── 4. CC-022 checks the B-TRUTH-scoped count only ──────────────────────────

describe('CC-00 I9 Governance Ratification — CC-022 gate is B-TRUTH-scoped', () => {
  // PRIOR HISTORY (accurate as of its own time, preserved verbatim): at this
  // slice's own time, BTRUTH_OWNED_SYNTHETIC_IMPORTS.length was 3 and
  // SYNTHETIC_IMPORT_ALLOWLIST.length was 6 — the two counts were shown to
  // be independently measurable and able to diverge. CC-00 Final Scoring
  // Canonicalization (2026-09-05) exercised exactly that divergence: the
  // B-TRUTH count dropped to 0 while the total dropped only to 3 (the
  // B-WORKER-owned subset, untouched).
  // PRIOR HISTORY (accurate as of its own time, preserved verbatim): asserted
  // "B-TRUTH is now 0, total is 1" (the sole remaining entry being
  // WorkerProvisioningService, B_WORKER-owned). B-WORKER WorkerProvisioning
  // Canonicalization (2026-09-06) retired that last entry too — total is
  // now 0 as well, though the two counts remain independently measurable
  // and were shown to diverge (0 vs 1) for a time.
  it('the B-TRUTH-scoped count (the CC-022 closure gate) is independent of the total allowlist count — both are now 0', () => {
    expect(BTRUTH_OWNED_SYNTHETIC_IMPORTS.length).toBe(0);
    expect(SYNTHETIC_IMPORT_ALLOWLIST.length).toBe(0);
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

// PRIOR HISTORY (accurate as of its own time, preserved verbatim): asserted
// "6 files / 11 import statements." CC-00 Final Scoring Canonicalization
// (2026-09-05) reduced this to 3 files / 3 imports by retiring the 3
// B-TRUTH-owned entries. Total visibility itself is unaffected — updated
// below to the new true count.
// PRIOR HISTORY (accurate as of CC-00 Final Scoring Canonicalization,
// preserved verbatim): "3 files / 3 imports." B-WORKER "One Product / No
// Demo Runtime" correction (2026-09-06) retired WorkerAchievementService.ts
// (zero real callers) — 2 files remain.
// PRIOR HISTORY (accurate as of CC-00 Final Scoring Canonicalization,
// preserved verbatim): "2 files remain." B-WORKER "One Product / No Demo
// Runtime" correction (2026-09-06) then AccountProvisioning dead-code
// retirement (2026-09-06) reduced this to 1; B-WORKER WorkerProvisioning
// Canonicalization (2026-09-06, this slice) reduced it to 0.
describe('CC-00 I9 Governance Ratification — visibility preserved', () => {
  it('the total allowlist count remains fully visible (not hidden behind the ownership split)', () => {
    expect(SYNTHETIC_IMPORT_ALLOWLIST.length).toBe(0);
  });
});

// ── 6. No generic exemption or wildcard exists ──────────────────────────────

describe('CC-00 I9 Governance Ratification — no generic exemption', () => {
  // PRIOR HISTORY (accurate as of its own time, preserved verbatim): asserted
  // "exactly 1 named file carries owner B_WORKER" (WorkerProvisioningService,
  // after WorkerAchievementService and AccountProvisioningService were both
  // retired). B-WORKER WorkerProvisioning Canonicalization (2026-09-06)
  // retired that last named file too — zero named files remain, not a
  // pattern or wildcard exemption.
  it('zero named files carry owner B_WORKER — the set is empty, not a pattern or wildcard exemption', () => {
    expect(BWORKER_OWNED_SYNTHETIC_IMPORTS.length).toBe(0);
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
  // PRIOR HISTORY (accurate as of its own time, preserved verbatim): asserted
  // BWORKER_OWNED_SYNTHETIC_IMPORTS.length > 0 — "the transfer does not close
  // B-WORKER, it only reassigns the blocker." B-WORKER WorkerProvisioning
  // Canonicalization (2026-09-06) closed the I9-specific blocker
  // (BWORKER_I9 = 0) via real canonicalization, not via exemption or
  // deletion-without-replacement — but per Master Plan §32a and the task's
  // own explicit instruction, reaching I9 = 0 is NOT the same as full
  // B-WORKER adversarial closure (product/functionality verification is
  // separate and still pending).
  it('B-WORKER-owned residuals have reached zero (BWORKER_I9 = 0) — this closes the I9 blocker specifically, not full B-WORKER closure', () => {
    expect(BWORKER_OWNED_SYNTHETIC_IMPORTS.length).toBe(0);
  });

  // PRIOR HISTORY (accurate as of its own time, preserved verbatim):
  // asserted svc.account, svc.worker-achievements, and svc.worker-provisioning
  // were all CONSOLIDATE (not CANONICAL/FROZEN — i.e. not marked permanent).
  // B-WORKER "One Product / No Demo Runtime" correction (2026-09-06):
  // svc.worker-achievements is retired (status DEAD, file deleted). B-WORKER
  // AccountProvisioning dead-code retirement (2026-09-06, the next slice)
  // retired svc.account too (status DEAD, file deleted). DEAD is not
  // "permanent/canonical/exempt" either — it is the opposite (marked
  // retired, already actioned). The one remaining real I9 blocker,
  // svc.worker-provisioning, stays CONSOLIDATE, not permanent.
  // PRIOR HISTORY (accurate as of its own time, preserved verbatim): asserted
  // svc.worker-provisioning was status CONSOLIDATE (open, not permanent) while
  // svc.account was already DEAD (retired). B-WORKER WorkerProvisioning
  // Canonicalization (2026-09-06) retired svc.worker-provisioning too — it is
  // now DEAD, same as svc.account. DEAD is not "permanent/canonical/exempt"
  // — it is the opposite (marked retired, already actioned, file deleted).
  it('svc.worker-provisioning and svc.account are both marked DEAD (retired, actioned) — neither is CANONICAL or FROZEN', () => {
    const registry = read('lib/architecture/registry.ts');
    for (const id of ["id: 'svc.worker-provisioning'", "id: 'svc.account'"]) {
      const idx = registry.indexOf(id);
      expect(idx).toBeGreaterThan(-1);
      const entry = registry.slice(idx, registry.indexOf('{ id:', idx + 10));
      expect(entry).toMatch(/status:\s*'DEAD'/);
      expect(entry).not.toMatch(/status:\s*'CANONICAL'|status:\s*'FROZEN'/);
    }
  });
});

// ── 8 & 9 & 11. Final scoring runtime retired (later slice); worker runtime untouched ──

// PRIOR HISTORY (accurate as of its own time, preserved verbatim): this
// block asserted the B-TRUTH final-scoring cluster files "still exist and
// still carry their original synthetic imports (no runtime change)" — true
// at this (governance-only) slice's own time. CC-00 Final Scoring
// Canonicalization (2026-09-05), a later, separate, IMPLEMENTATION slice,
// retired that cluster exactly as this ratification's own §32a anticipated
// ("CC-022's own closure gate checks only the B_TRUTH-owned subset").
// B-WORKER's cluster remains genuinely untouched. See
// tests/unit/cc00-final-scoring-canonicalization.test.ts for that slice's
// own full regression suite.
describe('CC-00 I9 Governance Ratification — runtime: B-TRUTH retired, B-WORKER untouched', () => {
  it('the B-TRUTH final-scoring cluster was later retired by CC-00 Final Scoring Canonicalization (2026-09-05) — ScoringSimulatorService.ts and DemoDataService.ts deleted, ActivationSafeguardService.ts kept (evaluate() unchanged, evaluateFromSeed() removed)', () => {
    expect(exists('services/scoring-simulator/ScoringSimulatorService.ts')).toBe(false);
    expect(exists('services/demo-data/DemoDataService.ts')).toBe(false);
    expect(exists('services/activation-safeguard/ActivationSafeguardService.ts')).toBe(true);
    const safeguardSrc = read('services/activation-safeguard/ActivationSafeguardService.ts');
    const codeOnly = safeguardSrc.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
    expect(safeguardSrc).toContain('evaluate(ar: number, mar: number)');
    expect(codeOnly).not.toContain('evaluateFromSeed');
  });

  // PRIOR HISTORY (accurate as of its own time, preserved verbatim): asserted
  // the remaining B-WORKER worker cluster file (WorkerProvisioningService.ts)
  // still existed and still carried its original synthetic import, while
  // WorkerAchievementService and AccountProvisioningService were both already
  // retired. B-WORKER WorkerProvisioning Canonicalization (2026-09-06)
  // retired the last one too — all 3 are now gone.
  it('the entire B-WORKER worker/account cluster (WorkerAchievementService, AccountProvisioningService, WorkerProvisioningService) is now retired', () => {
    expect(EXPECTED_BWORKER_FILES).toEqual([]);
    const liveFiles = new Set(SYNTHETIC_IMPORT_ALLOWLIST.map((e) => e.file));
    expect(liveFiles.size).toBe(0);
    expect(exists('services/worker-achievements/WorkerAchievementService.ts')).toBe(false);
    expect(exists('services/account/AccountProvisioningService.ts')).toBe(false);
    expect(exists('services/worker-provisioning/WorkerProvisioningService.ts')).toBe(false);
  });

  // PRIOR HISTORY (accurate as of its own time, preserved verbatim): asserted
  // WorkerProvisioningService's reason string was still present while
  // AccountProvisioningService's and WorkerAchievementService's were already
  // absent. B-WORKER WorkerProvisioning Canonicalization (2026-09-06) removed
  // the last reason string too — the allowlist body is now empty.
  it('no B-WORKER reason string remains in the allowlist — it is empty', () => {
    const allowlistSrc = read('lib/security/synthetic-import-allowlist.ts');
    const arrayStart = allowlistSrc.indexOf('export const SYNTHETIC_IMPORT_ALLOWLIST');
    const arrayEnd = allowlistSrc.indexOf('];', arrayStart);
    const arrayBody = allowlistSrc.slice(arrayStart, arrayEnd);
    expect(arrayBody).not.toContain("reason: 'Demo worker roster seed for provisioning flows.'");
    expect(arrayBody).not.toContain("reason: 'Demo account registry — reads synthetic user accounts.'");
    expect(arrayBody).not.toContain("reason: 'Worker-private demo achievements seed.'");
  });
});

// ── 10. B-WORKER has not started ────────────────────────────────────────────

describe('CC-00 I9 Governance Ratification — B-WORKER not started', () => {
  // PRIOR HISTORY (accurate as of its own time, preserved verbatim):
  // asserted getCurrentDemoUser() was still present in
  // AccountProvisioningService.ts, untouched by this governance-only slice.
  // getCurrentDemoUser() itself was later removed once zero-caller
  // (B-WORKER final cleanup, 2026-09-06), and the file that held it is now
  // deleted entirely (B-WORKER AccountProvisioning dead-code retirement,
  // 2026-09-06) — there is no My KORA live-session identity model to check
  // for, because the demo-state persona resolver it would have
  // distinguished from is itself retired.
  it('no My KORA live-session identity model was introduced by this slice or since — the demo-state resolver was retired, not replaced', () => {
    expect(exists('services/account/AccountProvisioningService.ts')).toBe(false);
  });

  // PRIOR HISTORY (accurate as of its own time, preserved verbatim): asserted
  // worker roster still read from data/synthetic/** while worker achievements
  // was already retired. B-WORKER WorkerProvisioning Canonicalization
  // (2026-09-06) retired the worker roster too — its 2 real callers were
  // migrated to lib/live/worker-provisioning-status-view.ts, reading
  // personal.worker_identity; no schema change was needed.
  it('worker roster no longer reads from data/synthetic/** — migrated to the canonical view builder; worker achievements retired too', () => {
    expect(exists('services/worker-provisioning/WorkerProvisioningService.ts')).toBe(false);
    expect(exists('data/synthetic/worker-roster.json')).toBe(false);
    expect(exists('lib/live/worker-provisioning-status-view.ts')).toBe(true);
    expect(exists('services/worker-achievements/WorkerAchievementService.ts')).toBe(false);
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
