// tests/unit/cc00-public-landing-canonicalization.test.ts
// CC-00 — Public Landing canonicalization (2026-09-26).
//
// Goal: remove synthetic runtime/data dependencies from the public landing
// page while preserving only truthful, commercially useful product
// communication and, where safe, real canonical aggregate facts. "The
// public landing must never depend on fake product state."
//
// Result: app/page.tsx no longer imports data/synthetic/kora-index-outputs.json
// or data/synthetic/company-aggregates.json. It previously displayed a
// specific fictional company's ("Meridiana Group", scenario S1) KORA Index
// value, Confidence Score, Safeguard status, per-macroblock score, and
// per-pillar IU share as if illustrating a real product result — a named
// fictional company with a claimed score is customer-proof-shaped content.
// Every per-company synthetic value is either replaced with the real,
// static, canonical methodology fact it corresponds to (macroblock weights
// from lib/methodology-config/v0.1.ts's getMacroblockWeights()) or removed
// outright with no invented replacement number.

import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'fs';
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

// ── 1. No synthetic runtime import ───────────────────────────────────────────

describe('CC-00 Public Landing canonicalization — no synthetic runtime import', () => {
  it('app/page.tsx no longer imports any data/synthetic/** fixture', () => {
    const src = stripComments(read('app/page.tsx'));
    expect(src).not.toMatch(/from ['"][^'"]*data\/synthetic\//);
    expect(src).not.toContain('kora-index-outputs.json');
    expect(src).not.toContain('company-aggregates.json');
  });

  it('app/page.tsx is removed from the I9 allowlist entirely', () => {
    const allowlist = read('lib/security/synthetic-import-allowlist.ts');
    expect(allowlist).not.toMatch(/\{\s*file:\s*'app\/page\.tsx'/);
  });

  it('the real methodology config is used instead — getMacroblockWeights()', () => {
    const src = read('app/page.tsx');
    expect(src).toContain("from '@/lib/methodology-config/v0.1'");
    expect(src).toContain('getMacroblockWeights()');
  });
});

// ── 2. No fake company metric remains as product proof ──────────────────────

describe('CC-00 Public Landing canonicalization — no fake company metric as product proof', () => {
  const src = read('app/page.tsx');

  it('no fictional company name is attributed a claimed score', () => {
    const codeOnly = stripComments(src);
    expect(codeOnly).not.toContain('Meridiana Group');
    expect(codeOnly).not.toContain('Nexo Digital');
    expect(codeOnly).not.toContain('Fortis Industrial');
    expect(codeOnly).not.toContain('Communitas Cooperativa');
  });

  it('the Index Anatomy card shows the real static scale, not a specific claimed score', () => {
    const idx = src.indexOf('icLabel');
    expect(idx).toBeGreaterThan(-1);
    const segment = src.slice(idx, idx + 400);
    expect(segment).toContain('Esempio schematico');
    expect(segment).toContain('0–100');
  });

  it('the safeguard chip lists the 3 real states, not one specific claimed status', () => {
    expect(src).toContain('CLEAR · WARNING · FLAGGED');
  });

  it('the Confidence Score chip states the real architectural fact, not a specific percentage', () => {
    expect(src).toContain('esterno · peso 0');
    const codeOnly = stripComments(src);
    // No bare "NN%" confidence-score literal remains bound to a variable.
    expect(codeOnly).not.toMatch(/\{CANONICAL\.confidence\}/);
  });

  it('macroblock bars show real weight, not a fake per-company score', () => {
    const codeOnly = stripComments(src);
    expect(codeOnly).not.toContain('mb.score');
    expect(codeOnly).toContain('mb.weight');
  });

  it('pillar cards no longer claim a per-pillar IU share percentage', () => {
    expect(src).not.toContain('share IU');
    const codeOnly = stripComments(src);
    expect(codeOnly).not.toMatch(/p\.share/);
  });

  it('the lineage step no longer claims a specific KORA Index value', () => {
    const codeOnly = stripComments(src);
    expect(codeOnly).not.toMatch(/CANONICAL\.koraIndex/);
  });

  it('the footer no longer claims "synthetic_demo_data: true" (no longer true, so no longer shown)', () => {
    const idx = src.indexOf('MarketingFooter meth=');
    expect(idx).toBeGreaterThan(-1);
    const segment = src.slice(idx, idx + 300);
    expect(segment).not.toContain('synthetic_demo_data');
  });
});

// ── 3. No unsupported benchmark/percentile claim ─────────────────────────────

describe('CC-00 Public Landing canonicalization — no benchmark fiction', () => {
  it('no percentile/rank/peer-average/market-benchmark language anywhere on the page', () => {
    const src = read('app/page.tsx').toLowerCase();
    for (const forbidden of ['percentile', 'top performer', 'peer average', 'sector benchmark', 'market average', 'cluster_avg', 'cluster_top_quartile']) {
      expect(src).not.toContain(forbidden);
    }
  });
});

// ── 4. No private canonical tenant query added ───────────────────────────────

describe('CC-00 Public Landing canonicalization — no private data query added', () => {
  it('app/page.tsx does not call getSupabaseServiceClient or getSupabaseServerClient', () => {
    const src = read('app/page.tsx');
    expect(src).not.toContain('getSupabaseServiceClient');
    expect(src).not.toContain('getSupabaseServerClient');
  });

  it('app/page.tsx does not query any analytics.* or tenant-scoped table', () => {
    const src = read('app/page.tsx');
    expect(src).not.toMatch(/schema\(['"]analytics['"]\)/);
    expect(src).not.toContain(".from('tenant')");
  });

  it('app/page.tsx remains a pure Server Component with no auth redirect (unchanged B117-E invariant)', () => {
    const src = read('app/page.tsx');
    expect(src).not.toContain('import { redirect }');
    expect(src).not.toContain('getRoleHome');
  });
});

// ── 5. No tenant_kind product branch; no DEMO_VIEWER change ─────────────────

describe('CC-00 Public Landing canonicalization — safety', () => {
  it('no tenant_kind branch anywhere in the landing page', () => {
    const src = read('app/page.tsx');
    expect(src).not.toContain('tenant_kind');
  });

  // DEMO_VIEWER was accurately untouched, still defined and still admitted
  // by requireDemoAccess(), at the time this test was written. CC-00
  // DEMO_VIEWER role retirement (2026-09-26, a later, separate slice)
  // retired the role entirely from the runtime role model — not replaced by
  // another role with a different name. See
  // tests/unit/cc00-demo-viewer-retirement.test.ts for the current, correct
  // state.
  it('DEMO_VIEWER role has since been separately retired (historical note, not a live assertion)', () => {
    const constants = read('lib/constants/kora.ts');
    expect(constants).not.toContain('DEMO_KORA_ROLES');
    const koraRolesStart = constants.indexOf('export const KORA_ROLES');
    const koraRolesBlock = constants.slice(koraRolesStart, constants.indexOf('as const;', koraRolesStart));
    expect(koraRolesBlock).not.toContain('DEMO_VIEWER');
    const session = read('lib/auth/kora-session.ts');
    const sessionCodeOnly = session.split('\n').filter((line) => !line.trim().startsWith('//')).join('\n');
    expect(sessionCodeOnly).not.toContain('requireDemoAccess');
  });

  // This test's own routes list was accurate at the time this slice
  // landed (no /demo/** route was retired BY THIS slice). CC-00 Residual
  // /demo/** controlled retirement (2026-09-26) is a later, separate slice
  // that did retire 6 of these 8 routes — updated here to a
  // still/since-retired split rather than silently dropping the historical
  // claim.
  it('no /demo/** route was retired or touched by THIS slice (historical note: a later slice retired 6 of these 8)', () => {
    const stillExist = [
      'app/demo/future-vision/page.tsx',
      'app/demo/page.tsx',
    ];
    for (const route of stillExist) {
      expect(exists(route)).toBe(true);
    }
    const sinceRetired = [
      'app/demo/advisor/page.tsx',
      'app/demo/ai-onboarding/page.tsx',
      'app/demo/benchmarks/page.tsx',
      'app/demo/gtm/page.tsx',
      'app/demo/guide/page.tsx',
      'app/demo/network/page.tsx',
    ];
    for (const route of sinceRetired) {
      expect(exists(route)).toBe(false);
    }
  });
});

// ── 6. Prior slices remain intact ────────────────────────────────────────────

describe('CC-00 Public Landing canonicalization — prior slices untouched', () => {
  it('Admin Console canonicalization from #151 remains intact — zero badgeMode="DEMO" on Admin Home', () => {
    const admin = read('app/admin/page.tsx');
    expect(admin).not.toContain('badgeMode="DEMO"');
    expect(admin).toContain('label="Company Readiness Matrix" badgeMode="LIVE"');
  });

  it('Portfolio remains canonical — Company Readiness Matrix still reads `registry`', () => {
    const admin = stripComments(read('app/admin/page.tsx'));
    expect(admin).toContain('registry.map((e');
    expect(admin).not.toContain('getCompanyPortfolioPreview');
  });

  it('Partner demo remains retired — app/demo/partner/ still does not exist', () => {
    expect(exists('app/demo/partner')).toBe(false);
  });

  it('Portfolio demo remains retired — app/demo/portfolio/ still does not exist', () => {
    expect(exists('app/demo/portfolio')).toBe(false);
  });
});

// ── 7. Untouched surfaces ─────────────────────────────────────────────────────

describe('CC-00 Public Landing canonicalization — untouched surfaces', () => {
  // PRIOR HISTORY (accurate as of its own time, preserved verbatim): this
  // check also asserted services/scoring-simulator/ScoringSimulatorService.ts
  // existed and app/my-kora/page.tsx contained 'getCurrentDemoUser'. CC-00
  // Final Scoring Canonicalization (2026-09-05) deleted ScoringSimulatorService
  // (zero real callers, last B-TRUTH-owned synthetic scoring dependency) and
  // removed my-kora/page.tsx's now-pointless getCurrentDemoUser() call along
  // with it. B-WORKER is untouched.
  it('B-WORKER is untouched; final scoring was later retired by CC-00 Final Scoring Canonicalization, unrelated to this PR', () => {
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
      'services/activation-safeguard/ActivationSafeguardService.ts',
    ]) {
      expect(exists(file)).toBe(true);
    }
    expect(exists('services/scoring-simulator/ScoringSimulatorService.ts')).toBe(false);
  });

  it('Foundation Light package pricing (lib/landing/packages.ts) is untouched — already real static config', () => {
    const src = read('app/page.tsx');
    expect(src).toContain("from '@/lib/landing/packages'");
    expect(exists('lib/landing/packages.ts')).toBe(true);
  });

  it('no marketing site redesign — the same 10 sections remain, same anchors', () => {
    const src = read('app/page.tsx');
    for (const anchor of ['id="top"', 'id="problema"', 'id="metodo"', 'id="indice"', 'id="pilot"']) {
      expect(src).toContain(anchor);
    }
  });
});

// ── 8. I9 reflects the import removal ────────────────────────────────────────

describe('CC-00 Public Landing canonicalization — I9 reflects the import removal', () => {
  // 11 files / 16 imports was accurate at the time this slice landed.
  // CC-00 Residual /demo/** controlled retirement (2026-09-26, a later,
  // separate slice) reduced it further to 8 files / 13 imports, and CC-00
  // Bucket C cleanup (2026-09-05, a later, separate slice) reduced it
  // further still to 6 files / 11 imports. See
  // tests/unit/cc00-residual-demo-retirement.test.ts.
  it('allowlist header reflects 6 files / 11 import statements (historical note: was 16, then 13, imports at the time this slice landed)', () => {
    const allowlist = read('lib/security/synthetic-import-allowlist.ts');
    expect(allowlist).toContain('CURRENT_SYNTHETIC_RUNTIME_IMPORTS = 2 files / 2 import statements'); // B-WORKER "One Product / No Demo Runtime" correction (2026-09-06): WorkerAchievementService.ts removed from the allowlist (deleted, zero callers) — 3/3 -> 2/2, unrelated to this PR.
  });

  // app/demo/gtm/page.tsx and components/demo/DemoGuideContent.tsx were
  // both accurately kora-index-outputs.json consumers at the time this
  // slice landed. CC-00 Residual /demo/** controlled retirement
  // (2026-09-26) retired both files entirely — removed from this list, not
  // replaced. app/demo/page.tsx was also accurately a consumer; CC-00
  // Bucket C cleanup (2026-09-05) replaced its "Scenari dimostrativi"
  // fake-company-with-claimed-score section with a real static schematic
  // card (no synthetic import) — removed from this list too.
  // ScoringSimulatorService.ts remains the real, live consumer.
  // PRIOR HISTORY (accurate as of its own time, preserved verbatim): "neither
  // fixture became zero-consumer overall — both remain needed by other real
  // consumers" — kora-index-outputs.json (ScoringSimulatorService.ts) and
  // company-aggregates.json (DemoDataService.ts, ScoringSimulatorService.ts;
  // WorkerPillarAdoptionService.ts's own mention was already a stale
  // comment, not a real import, by this test's own time). CC-00 Final
  // Scoring Canonicalization (2026-09-05) deleted ScoringSimulatorService.ts
  // and DemoDataService.ts (zero real callers, the last B-TRUTH-owned
  // synthetic scoring dependency) — both fixtures then became genuinely
  // zero-consumer and were deleted too. Unrelated to this PR's own public
  // landing page scope.
  it('kora-index-outputs.json and company-aggregates.json were later fully retired by CC-00 Final Scoring Canonicalization (2026-09-05) once their last real consumers were deleted', () => {
    expect(exists('data/synthetic/kora-index-outputs.json')).toBe(false);
    expect(exists('data/synthetic/company-aggregates.json')).toBe(false);
    expect(exists('services/scoring-simulator/ScoringSimulatorService.ts')).toBe(false);
    expect(exists('services/demo-data/DemoDataService.ts')).toBe(false);
  });
});

// ── 9. Registry documents the canonicalization, preserving history ──────────

describe('CC-00 Public Landing canonicalization — registry updated, preserving history', () => {
  it('registry app-surface.landing entry records this slice and does not claim DEAD status', () => {
    const registry = read('lib/architecture/registry.ts');
    const idx = registry.indexOf("id: 'app-surface.landing'");
    expect(idx).toBeGreaterThan(-1);
    const nextIdx = registry.indexOf('{ id:', idx + 10);
    const entry = registry.slice(idx, nextIdx);
    expect(entry).toContain('Public Landing canonicalization');
    expect(entry).not.toContain("status: 'DEAD'");
  });

  it('docs/ARCHITECTURE_REGISTRY.md matches the generator output (I10 sync)', () => {
    const checkedIn = read('docs/ARCHITECTURE_REGISTRY.md');
    expect(checkedIn).toContain('app-surface.landing');
  });
});
