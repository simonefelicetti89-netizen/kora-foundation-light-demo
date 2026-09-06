// tests/unit/cc00-bucket-c-cleanup.test.ts
// CC-00 — Bucket C cleanup (2026-09-05).
//
// Goal: remove or canonicalize the two remaining I9 residuals independent
// of both final scoring and B-WORKER — app/demo/page.tsx and
// services/founder-validation/FounderValidationService.ts — so that no
// easy/unblocked synthetic runtime remains before the final-scoring slice.
//
// Result: app/demo/page.tsx's "Scenari dimostrativi" section (two named
// companies with a claimed KORA Index/Confidence Score/Safeguard result)
// is replaced with a real static methodology schematic (no company, no
// claimed result). FounderValidationService.ts's synthetic leads seed
// (5 fictional companies, never maintained, zero persistence path) is
// retired to a real, honest empty array — the tool itself is unchanged.
// I9: 8 files / 13 imports -> 6 files / 11 imports.

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

function stripComments(src: string): string {
  return src
    .split('\n')
    .filter((line) => !line.trim().startsWith('//'))
    .join('\n');
}

// ── 1. /demo root no longer imports synthetic data ───────────────────────────

describe('CC-00 Bucket C cleanup — /demo root synthetic-free', () => {
  it('app/demo/page.tsx no longer imports from data/synthetic/**', () => {
    const src = stripComments(read('app/demo/page.tsx'));
    expect(src).not.toMatch(/from ['"][^'"]*data\/synthetic\//);
    expect(src).not.toContain('kora-index-outputs.json');
  });

  it('allowlist no longer lists app/demo/page.tsx', () => {
    const allowlist = read('lib/security/synthetic-import-allowlist.ts');
    expect(allowlist).not.toMatch(/\{\s*file:\s*'app\/demo\/page\.tsx'/);
  });
});

// ── 2. No fake scenario result remains on /demo ──────────────────────────────

describe('CC-00 Bucket C cleanup — no fake scenario result claims', () => {
  it('no fictional company name is attributed a claimed score', () => {
    const src = stripComments(read('app/demo/page.tsx'));
    expect(src).not.toContain('Meridiana Group');
    expect(src).not.toContain('Ferretti Holding');
  });

  it('the schematic card shows the real static scale, not a specific claimed score', () => {
    const src = read('app/demo/page.tsx');
    expect(src).toContain('0–100');
    expect(src).toContain('data-testid="demo-index-schematic"');
  });

  it('the safeguard chip lists the 3 real states, not one specific claimed status', () => {
    const src = read('app/demo/page.tsx');
    expect(src).toContain('CLEAR · WARNING · FLAGGED');
  });

  it('the Confidence Score chip states the real architectural fact, not a specific percentage', () => {
    const src = read('app/demo/page.tsx');
    expect(src).toContain('CS esterno · peso 0');
    expect(src).not.toMatch(/Confidence Score.{0,30}\d+%/);
  });

  it('macroblock weights come from the real, versioned methodology config, not a hardcoded literal', () => {
    const src = stripComments(read('app/demo/page.tsx'));
    expect(src).toContain('getMacroblockWeights');
    expect(src).not.toContain('koraIndex:  54');
  });

  it('no percentile/rank/peer-average/market-benchmark language was introduced', () => {
    const src = read('app/demo/page.tsx').toLowerCase();
    for (const forbidden of ['percentile', 'cluster_avg', 'top performer', 'benchmark di mercato']) {
      expect(src).not.toContain(forbidden);
    }
  });
});

// ── 3. No private/live tenant data added to /demo ────────────────────────────

describe('CC-00 Bucket C cleanup — no live data added', () => {
  it('app/demo/page.tsx does not call getSupabaseServiceClient / getSupabaseServerClient / query analytics.*', () => {
    const src = stripComments(read('app/demo/page.tsx'));
    expect(src).not.toContain('getSupabaseServiceClient');
    expect(src).not.toContain('getSupabaseServerClient');
    expect(src).not.toMatch(/\.schema\(['"]analytics['"]\)/);
  });

  it('export const dynamic = force-static is preserved (no new runtime DB query path introduced)', () => {
    const src = read('app/demo/page.tsx');
    expect(src).toContain("export const dynamic = 'force-static'");
  });
});

// ── 4. /demo/future-vision remains unchanged ─────────────────────────────────

describe('CC-00 Bucket C cleanup — Future Vision untouched', () => {
  it('app/demo/future-vision/page.tsx exists and is unmodified in role (still static presentation)', () => {
    expect(exists('app/demo/future-vision/page.tsx')).toBe(true);
    const src = read('app/demo/future-vision/page.tsx');
    expect(src).not.toContain('koraRole');
    expect(src).not.toContain('requireDemoAccess');
  });
});

// ── 5. Founder Validation synthetic dependency removed ───────────────────────

describe('CC-00 Bucket C cleanup — Founder Validation synthetic seed retired', () => {
  it('FounderValidationService.ts no longer imports from data/synthetic/**', () => {
    const src = read('services/founder-validation/FounderValidationService.ts');
    expect(src).not.toMatch(/from ['"][^'"]*data\/synthetic\//);
  });

  it('LEADS is a real, honest empty array', () => {
    const src = read('services/founder-validation/FounderValidationService.ts');
    expect(src).toContain('const LEADS: ValidationLead[] = [];');
  });

  it('data/synthetic/founder-validation-leads.json no longer exists', () => {
    expect(exists('data/synthetic/founder-validation-leads.json')).toBe(false);
  });

  it('allowlist no longer lists FounderValidationService.ts', () => {
    const allowlist = read('lib/security/synthetic-import-allowlist.ts');
    expect(allowlist).not.toMatch(/\{\s*file:\s*'services\/founder-validation\/FounderValidationService\.ts'/);
  });

  it('no founder CRM schema was invented — zero DB migrations reference lead/CRM concepts', () => {
    const migrationsDir = resolve(root, 'supabase/migrations');
    const files = readdirSync(migrationsDir).filter((f) => f.endsWith('.sql'));
    for (const f of files) {
      const sql = readFileSync(resolve(migrationsDir, f), 'utf-8').toLowerCase();
      expect(sql).not.toMatch(/\blead\b|\bcrm\b/);
    }
  });

  it('every derived method still works and degrades to zero/empty (method signatures unchanged)', () => {
    const src = read('services/founder-validation/FounderValidationService.ts');
    for (const method of [
      'getLeads', 'getFunnelSummary', 'getTopObjections', 'getFeedbackThemes',
      'getPilotPipelineValue', 'getNextActions', 'getInvestorSignals', 'getHeroMetrics',
    ]) {
      expect(src).toContain(method);
    }
  });
});

// ── 6. Founder tooling remains internal ──────────────────────────────────────

describe('CC-00 Bucket C cleanup — founder tooling internal boundary preserved', () => {
  it('app/admin/founder-validation/page.tsx remains KORA_ADMIN/founder-only, not a customer product surface', () => {
    const src = read('app/admin/founder-validation/page.tsx');
    expect(src).toContain('KORA Admin / Founder only');
    expect(src).toContain('non parte del KORA Index');
  });

  it('FounderValidationService.ts is not imported by any company/worker/partner-facing route', () => {
    const forbiddenDirs = ['app/company', 'app/worker', 'app/partner', 'app/my-kora'];
    for (const dir of forbiddenDirs) {
      const full = resolve(root, dir);
      if (!existsSync(full)) continue;
      const walk = (d: string): string[] => {
        const out: string[] = [];
        for (const entry of readdirSync(d, { withFileTypes: true })) {
          const p = resolve(d, entry.name);
          if (entry.isDirectory()) out.push(...walk(p));
          else if (/\.(ts|tsx)$/.test(entry.name)) out.push(p);
        }
        return out;
      };
      for (const file of walk(full)) {
        const content = readFileSync(file, 'utf-8');
        expect(content, `${file} must not import FounderValidationService`).not.toContain('FounderValidationService');
      }
    }
  });

  it('leads still contain no worker PIB or individual worker identifiers (still vacuously true for an empty array, still asserted)', () => {
    const founderValidationServiceModule = read('services/founder-validation/FounderValidationService.ts');
    expect(founderValidationServiceModule).not.toContain('worker_id');
    expect(founderValidationServiceModule).not.toContain('pib');
  });
});

// ── 7-10. Prior CC-00 slices remain intact ───────────────────────────────────

describe('CC-00 Bucket C cleanup — prior slices untouched', () => {
  it('DEMO_VIEWER remains retired after #154', () => {
    const constants = read('lib/constants/kora.ts');
    expect(constants).toContain("export const REMOVED_KORA_ROLES = ['COMPANY_VIEWER', 'DEMO_VIEWER']");
    expect(exists('lib/auth/demo-guard.tsx')).toBe(false);
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

// ── 11. Worker/account cluster untouched ─────────────────────────────────────

describe('CC-00 Bucket C cleanup — worker/account cluster untouched', () => {
  // PRIOR HISTORY (accurate as of CC-00 Bucket C cleanup, preserved
  // verbatim): asserted all 3 files still imported their synthetic fixtures,
  // including WorkerAchievementService.ts. B-WORKER "One Product / No Demo
  // Runtime" correction (2026-09-06) deleted that file entirely (zero real
  // callers, no replacement domain invented) — a later, separately-
  // authorized retirement, not a regression of this PR's own scope.
  // B-WORKER AccountProvisioning dead-code retirement (2026-09-06, the next
  // slice) deleted AccountProvisioningService.ts too, for the same reason.
  it('WorkerProvisioningService still imports its synthetic fixture; WorkerAchievementService and AccountProvisioningService both retired since', () => {
    expect(read('services/worker-provisioning/WorkerProvisioningService.ts')).toContain(
      "from '@/data/synthetic/worker-roster.json'",
    );
    expect(exists('services/worker-achievements/WorkerAchievementService.ts')).toBe(false);
    expect(exists('services/account/AccountProvisioningService.ts')).toBe(false);
  });

  // PRIOR HISTORY (accurate as of CC-00 Bucket C cleanup, preserved
  // verbatim): "My KORA is untouched" — app/my-kora/page.tsx called
  // workerAchievementService.getAchievementStats(). B-WORKER "One Product /
  // No Demo Runtime" correction (2026-09-06) rewrote that page as a pure,
  // unconditional redirect() — a later, separately-authorized retirement.
  it('My KORA home page is retired to a canonical redirect (later, separately-authorized slice)', () => {
    expect(exists('app/my-kora/page.tsx')).toBe(true);
    expect(read('app/my-kora/page.tsx')).toContain("redirect('/worker/workspace')");
  });
});

// ── 12. Final scoring untouched ───────────────────────────────────────────────

describe('CC-00 Bucket C cleanup — final scoring untouched', () => {
  // PRIOR HISTORY (accurate as of its own time, preserved verbatim):
  // "ScoringSimulatorService.ts is untouched — still imports all 3 of its
  // synthetic fixtures" and "ActivationSafeguardService.ts (scoring-coupled
  // only) is untouched" (still importing activation-safeguard-results.json,
  // still defining evaluateFromSeed). CC-00 Final Scoring Canonicalization
  // (2026-09-05) — a later, separate, unrelated-to-this-PR slice — deleted
  // ScoringSimulatorService.ts entirely (zero real callers) and removed
  // ActivationSafeguardService.ts's evaluateFromSeed() (its only caller was
  // the now-deleted ScoringSimulatorService); evaluate() is unchanged. See
  // tests/unit/cc00-final-scoring-canonicalization.test.ts.
  it('final scoring — ScoringSimulatorService.ts and ActivationSafeguardService.evaluateFromSeed() were later retired by CC-00 Final Scoring Canonicalization, unrelated to this PR', () => {
    expect(exists('services/scoring-simulator/ScoringSimulatorService.ts')).toBe(false);
    const safeguardSrc = read('services/activation-safeguard/ActivationSafeguardService.ts');
    expect(stripComments(safeguardSrc)).not.toContain('evaluateFromSeed');
    expect(safeguardSrc).toContain('evaluate(ar: number, mar: number)');
  });
});

// ── 13. CC-022 criterion unchanged / 14. CC-00 remains open ──────────────────

describe('CC-00 Bucket C cleanup — governance unchanged, CC-00 status', () => {
  it('registry does not claim CC-00 is closed on the app-surface.demo or svc.founder-validation entries', () => {
    const registry = read('lib/architecture/registry.ts');
    for (const id of ["id: 'app-surface.demo'", "id: 'svc.founder-validation'"]) {
      const idx = registry.indexOf(id);
      expect(idx).toBeGreaterThan(-1);
      const entry = registry.slice(idx, registry.indexOf('{ id:', idx + 10));
      expect(entry).not.toMatch(/CC-00 (closed|resolved|complete)/i);
    }
  });

  it('this slice does not reference or modify Master Plan closure semantics', () => {
    const registry = read('lib/architecture/registry.ts');
    const idx = registry.indexOf("id: 'svc.founder-validation'");
    const entry = registry.slice(idx, registry.indexOf('{ id:', idx + 10));
    expect(entry).not.toContain('CC-022 criterion');
    expect(entry).not.toContain('I9 criterion narrowed');
  });

  it('I9 allowlist header reflects 6 files / 11 import statements', () => {
    const allowlist = read('lib/security/synthetic-import-allowlist.ts');
    expect(allowlist).toContain('CURRENT_SYNTHETIC_RUNTIME_IMPORTS = 1 files / 1 import statements'); // B-WORKER AccountProvisioning dead-code retirement (2026-09-06): AccountProvisioningService.ts removed from the allowlist (deleted, zero callers) — 2/2 -> 1/1, unrelated to this PR.
  });
});
