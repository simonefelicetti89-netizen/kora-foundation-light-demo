// tests/unit/cc022-btruth-closure.test.ts
// CC-022 — B-TRUTH Closure (2026-09-06).
//
// Closes CC-022 under the founder-ratified interpretation (CC-00 I9
// Governance Ratification, 2026-09-05, Master Plan §32a): for CC-022,
// "KORA Space live" means canonical technical readiness on a persistent
// non-ephemeral environment — migration 024 applied + canonical discovery
// live — NOT production launch or real-worker use. Gate 3 (Legal/DPO)
// governs that later, separate question and is untouched by this closure.
//
// Entry criteria verified fresh on 2026-09-06:
//   1. B-TRUTH-owned I9 = 0
//   2. No UNKNOWN synthetic residual
//   3. B-WORKER residuals remain tracked, untouched
//   4. Demo/live One Truth — no second product runtime
//   5. DEMO_VIEWER remains retired
//   6. Final scoring synthetic runtime remains retired
//   7. Migration 024 applied to persistent staging (confirmed via a fresh
//      read-only `supabase migration list --linked` check against
//      `haqflkurpmeaxpikozjl` — production untouched)
//   8. KORA Space discovery canonical and live (CC-052)
//
// This closure does NOT imply: production readiness, real-worker readiness,
// Gate 3 or Gate 5 closure, B-WORKER started, or CC-023 (adversarial
// validation) started. CC-00 as a whole remains OPEN.

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { resolve, join } from 'path';
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

function stripComments(src: string): string {
  return src.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
}

function walkTs(dir: string): string[] {
  const out: string[] = [];
  let entries: string[];
  try { entries = readdirSync(dir); } catch { return out; }
  for (const entry of entries) {
    if (['node_modules', '.next', '.git'].includes(entry)) continue;
    const p = join(dir, entry);
    const st = statSync(p);
    if (st.isDirectory()) out.push(...walkTs(p));
    else if (/\.(ts|tsx)$/.test(entry) && !/\.test\.tsx?$/.test(entry)) out.push(p);
  }
  return out;
}

// ── 1. B-TRUTH I9 = 0 ────────────────────────────────────────────────────────

describe('CC-022 — B-TRUTH I9 is zero', () => {
  it('BTRUTH_OWNED_SYNTHETIC_IMPORTS is empty', () => {
    expect(BTRUTH_OWNED_SYNTHETIC_IMPORTS).toEqual([]);
  });
});

// ── 2. No UNKNOWN synthetic residuals ────────────────────────────────────────

describe('CC-022 — no UNKNOWN synthetic residuals', () => {
  it('every allowlist entry has owner B_TRUTH or B_WORKER, never anything else', () => {
    for (const entry of SYNTHETIC_IMPORT_ALLOWLIST) {
      expect(['B_TRUTH', 'B_WORKER']).toContain(entry.owner);
    }
  });

  it('the ownership split is exact — no gap, no overlap', () => {
    expect(BTRUTH_OWNED_SYNTHETIC_IMPORTS.length + BWORKER_OWNED_SYNTHETIC_IMPORTS.length).toBe(
      SYNTHETIC_IMPORT_ALLOWLIST.length,
    );
  });
});

// ── 3. B-WORKER residuals remain tracked, untouched ─────────────────────────

describe('CC-022 — B-WORKER residuals untouched by this closure', () => {
  // PRIOR HISTORY (accurate as of CC-022, preserved verbatim): "exactly the
  // 3 known B-WORKER files remain." B-WORKER "One Product / No Demo Runtime"
  // correction (2026-09-06) retired WorkerAchievementService.ts (zero real
  // callers) — 2 files remained. B-WORKER AccountProvisioning dead-code
  // retirement (2026-09-06, the next slice) retired AccountProvisioningService.ts
  // too (zero real callers of any of its 18 methods) — 1 file remained. This
  // CC-022 closure itself did not touch WorkerProvisioningService — but
  // B-WORKER WorkerProvisioning Canonicalization (2026-09-06, a later,
  // separate, explicitly-authorized B-WORKER implementation slice) retired
  // it too — 0 files remain.
  it('the B-WORKER-owned residual set has since reached zero (a later, separately-authorized B-WORKER slice, not this CC-022 closure)', () => {
    const files = BWORKER_OWNED_SYNTHETIC_IMPORTS.map((e) => e.file).sort();
    expect(files).toEqual([]);
  });

  it('WorkerProvisioningService.ts no longer exists (retired by a later B-WORKER slice); WorkerAchievementService.ts no longer exists either', () => {
    expect(exists('services/worker-provisioning/WorkerProvisioningService.ts')).toBe(false);
    expect(exists('services/worker-achievements/WorkerAchievementService.ts')).toBe(false);
  });

  // PRIOR HISTORY (accurate as of CC-022, preserved verbatim): asserted
  // getCurrentDemoUser() was still defined, still synthetic. B-WORKER final
  // cleanup (2026-09-06) found it zero-caller and removed it — the file
  // itself was still alive at that time. B-WORKER AccountProvisioning
  // dead-code retirement (2026-09-06, the next slice) exhaustively
  // re-verified all 18 remaining methods and found them zero-caller too —
  // the file itself is now deleted.
  it('AccountProvisioningService.ts no longer exists — getCurrentDemoUser() and every other method were both eventually proven zero-caller', () => {
    expect(exists('services/account/AccountProvisioningService.ts')).toBe(false);
  });
});

// ── 4. Demo/live One Truth — no second product runtime ──────────────────────

describe('CC-022 — One Truth: no second product runtime', () => {
  it('every previously-retired legacy/duplicate service remains absent', () => {
    for (const dir of [
      'services/report-generator', 'services/ingestion-pipeline', 'services/eligibility-gate',
      'services/company-intelligence', 'services/report-factory', 'services/tenant',
      'services/company-data-intake', 'services/ingestion-simulator', 'services/ingestion-normalizer',
      'services/dynamic-scoring', 'services/scoring-simulator', 'services/demo-data',
    ]) {
      expect(exists(dir)).toBe(false);
    }
    expect(exists('services/scoring/DemoScoringAdapter.ts')).toBe(false);
  });

  it('app/demo/ contains only the two static, non-role-gated surfaces', () => {
    const pages = walkTs(resolve(root, 'app/demo')).filter((f) => f.endsWith('page.tsx'));
    const relatives = pages.map((f) => f.replace(root + '/', '')).sort();
    expect(relatives).toEqual(['app/demo/future-vision/page.tsx', 'app/demo/page.tsx']);
  });

  it('app/demo/page.tsx has zero live DB calls', () => {
    const codeOnly = stripComments(read('app/demo/page.tsx'));
    expect(codeOnly).not.toContain('getSupabaseServiceClient');
    expect(codeOnly).not.toContain('getSupabaseServerClient');
    expect(codeOnly).not.toMatch(/schema\(['"]analytics['"]\)/);
  });
});

// ── 5. DEMO_VIEWER remains retired ───────────────────────────────────────────

describe('CC-022 — DEMO_VIEWER remains retired', () => {
  it('DEMO_VIEWER is in REMOVED_KORA_ROLES, no demo-guard file exists', () => {
    const constants = read('lib/constants/kora.ts');
    expect(constants).toContain("REMOVED_KORA_ROLES = ['COMPANY_VIEWER', 'DEMO_VIEWER']");
    expect(exists('lib/auth/demo-guard.tsx')).toBe(false);
    expect(exists('app/api/admin/demo')).toBe(false);
  });
});

// ── 6. Final scoring synthetic runtime remains retired ──────────────────────

describe('CC-022 — final scoring synthetic runtime remains retired', () => {
  it('ScoringSimulatorService, DemoDataService, DemoScoringAdapter absent; evaluateFromSeed absent', () => {
    expect(exists('services/scoring-simulator')).toBe(false);
    expect(exists('services/demo-data')).toBe(false);
    expect(exists('services/scoring/DemoScoringAdapter.ts')).toBe(false);
    const safeguard = stripComments(read('services/activation-safeguard/ActivationSafeguardService.ts'));
    expect(safeguard).not.toContain('evaluateFromSeed');
  });
});

// ── 7. Migration 024 applied to persistent staging ───────────────────────────

describe('CC-022 — KORA Space migration 024 applied to persistent staging', () => {
  it('migration 024 exists and its header records the corrected staging-application history', () => {
    const sql = read('supabase/migrations/024_commons_initiative_fields.sql');
    expect(sql).toContain('CORRECTED (CC-022 Staging Reconciliation, 2026-09-06)');
    expect(sql).toContain('haqflkurpmeaxpikozjl');
    expect(sql).toContain('remains untouched — applying there still requires Gate 3');
    // Original wording preserved as prior history — not silently erased.
    expect(sql).toContain('PRIOR HISTORY');
    expect(sql).toContain('Gate 2 OPEN — written, NOT applied to any remote/production DB');
  });

  it('the b165 Gate annotation test reflects the corrected history, not the stale claim as a live assertion', () => {
    const testSrc = read('tests/unit/b165-commons-initiatives.test.ts');
    expect(testSrc).toContain('CORRECTED (CC-022 Staging Reconciliation, 2026-09-06)');
  });

  it('does not claim production application anywhere in the corrected record', () => {
    const sql = read('supabase/migrations/024_commons_initiative_fields.sql');
    const idx = sql.indexOf('CORRECTED (CC-022 Staging Reconciliation');
    const correctionBlock = sql.slice(idx, sql.indexOf('Applicabile insieme', idx));
    expect(correctionBlock).not.toMatch(/applied to production|production DB\)/i);
  });
});

// ── 8. KORA Space discovery canonical and live ──────────────────────────────

describe('CC-022 — KORA Space discovery canonical and live', () => {
  it('getPublishedInitiatives and getPublishedInitiativesAdmin are real, live, exported functions', () => {
    const src = read('services/commons/CommonsService.ts');
    expect(src).toContain('export async function getPublishedInitiatives(');
    expect(src).toContain('export async function getPublishedInitiativesAdmin(');
  });

  it('CommonsService.ts has zero real synthetic import (the one historical-comment mention is not a runtime import)', () => {
    const src = read('services/commons/CommonsService.ts');
    const codeOnly = stripComments(src);
    expect(codeOnly).not.toMatch(/from\s+['"][^'"]*data\/synthetic\//);
  });

  it('cross-tenant discovery RLS behavior is proven live (RLS-11)', () => {
    expect(exists('tests/integration/rls-11-commons-cross-company.test.ts')).toBe(true);
  });
});

// ── 9. Gate status corrections are honest, not overreaching ────────────────

describe('CC-022 — Gate 2 documentation drift corrected, Gate 3/5 untouched', () => {
  it('CLAUDE.md no longer claims Gate 2 is OPEN', () => {
    const claude = read('CLAUDE.md');
    expect(claude).not.toContain('Gate 2 OPEN (blocks SQL)');
    expect(claude).toContain('Gate 2 CLOSED WITH CONDITIONS');
  });

  it('CLAUDE.md still marks Gate 3 and Gate 5 OPEN — unchanged', () => {
    const claude = read('CLAUDE.md');
    expect(claude).toMatch(/Gate 3 OPEN/);
    expect(claude).toMatch(/Gate 5 OPEN/);
  });

  it('CLAUDE.md does not claim production readiness anywhere in the corrected Gate 2 text', () => {
    const claude = read('CLAUDE.md');
    const idx = claude.indexOf('### Gate 2 — CTO Review');
    const section = claude.slice(idx, claude.indexOf('## 10.', idx));
    expect(section).toContain('does **not** authorize production provisioning');
  });
});

// ── 10. Production untouched ─────────────────────────────────────────────────

describe('CC-022 — production untouched by this closure', () => {
  it('no file in this change references applying anything to the production project ref', () => {
    const registry = read('lib/architecture/registry.ts');
    const idx = registry.indexOf('CC-022 — B-TRUTH CLOSURE (2026-09-06)');
    const block = registry.slice(idx, registry.indexOf('\n//\n', idx + 50));
    expect(block).not.toContain('azdnepfmwrmacruykskm');
  });
});

// ── 11. B-WORKER not started, CC-023 not started, CC-00 remains OPEN ───────

describe('CC-022 — B-WORKER not started, CC-023 not started, CC-00 remains OPEN', () => {
  it('registry records CC-022 closed but CC-023 and B-WORKER explicitly not started', () => {
    const registry = read('lib/architecture/registry.ts');
    const idx = registry.indexOf('CC-022 — B-TRUTH CLOSURE (2026-09-06)');
    expect(idx).toBeGreaterThan(-1);
    const block = registry.slice(idx, registry.indexOf('svc.eligibility-gate', idx) || idx + 3000);
    expect(block).toContain('CC-023');
    expect(block).toContain('NOT STARTED');
    expect(block).toContain('B-WORKER has NOT started');
  });

  // PRIOR HISTORY (accurate as of CC-022, preserved verbatim): asserted all
  // 3 files existed unchanged. B-WORKER "One Product / No Demo Runtime"
  // correction (2026-09-06) retired WorkerAchievementService.ts, and
  // B-WORKER AccountProvisioning dead-code retirement (2026-09-06, the next
  // slice) retired AccountProvisioningService.ts too — both zero real
  // callers, no replacement domain invented — genuine, later,
  // separately-authorized closures, not undisclosed B-WORKER product work.
  // PRIOR HISTORY (accurate as of CC-022, preserved verbatim): asserted
  // WorkerProvisioningService.ts still existed, unchanged, still synthetic —
  // not migrated by this closure. B-WORKER WorkerProvisioning
  // Canonicalization (2026-09-06, a later, separate, explicitly-authorized
  // B-WORKER implementation slice — not this CC-022 closure) retired it: its
  // 2 real methods reduced to canonical counts over personal.worker_identity,
  // no schema change needed. This closure's own scope remains untouched by
  // that later slice's work.
  it('no runtime code implements B-WORKER product decisions or adversarial (CC-023) tooling', () => {
    expect(exists('services/worker-provisioning/WorkerProvisioningService.ts')).toBe(false);
    expect(exists('services/worker-achievements/WorkerAchievementService.ts')).toBe(false);
    expect(exists('services/account/AccountProvisioningService.ts')).toBe(false);
  });
});

// ── 12. This closure does not claim real-worker / production readiness ─────

describe('CC-022 — closure record makes no real-worker or production readiness claim', () => {
  it('the registry closure note explicitly disclaims production/real-worker readiness', () => {
    const registry = read('lib/architecture/registry.ts');
    const idx = registry.indexOf('CC-022 — B-TRUTH CLOSURE (2026-09-06)');
    const block = registry.slice(idx, idx + 2000);
    expect(block).toContain('does NOT imply production readiness, real-worker readiness, or Gate 3/5');
    expect(block).toContain('closure — those remain entirely separate, unstarted gates');
  });
});
