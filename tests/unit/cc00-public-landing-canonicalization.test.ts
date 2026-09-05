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

  it('DEMO_VIEWER role is untouched — still defined, still admitted by requireDemoAccess()', () => {
    const constants = read('lib/constants/kora.ts');
    expect(constants).toContain('DEMO_VIEWER');
    const session = read('lib/auth/kora-session.ts');
    const start = session.indexOf('export async function requireDemoAccess');
    const body = session.slice(start, start + 1200);
    expect(body).toContain("koraRole === 'DEMO_VIEWER'");
    expect(body).toContain("koraRole === 'KORA_ADMIN'");
  });

  it('no /demo/** route was retired or touched by this slice', () => {
    const routes = [
      'app/demo/advisor/page.tsx',
      'app/demo/ai-onboarding/page.tsx',
      'app/demo/benchmarks/page.tsx',
      'app/demo/future-vision/page.tsx',
      'app/demo/gtm/page.tsx',
      'app/demo/guide/page.tsx',
      'app/demo/network/page.tsx',
      'app/demo/page.tsx',
    ];
    for (const route of routes) {
      expect(exists(route)).toBe(true);
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
  it('B-WORKER, My KORA, and final scoring are untouched', () => {
    for (const file of [
      'services/worker-provisioning/WorkerProvisioningService.ts',
      'services/worker-achievements/WorkerAchievementService.ts',
      'services/worker-space/WorkerSpaceCapabilityService.ts',
      'services/scoring-simulator/ScoringSimulatorService.ts',
      'services/activation-safeguard/ActivationSafeguardService.ts',
    ]) {
      expect(exists(file)).toBe(true);
    }
    expect(read('app/my-kora/page.tsx')).toContain('getCurrentDemoUser');
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
  it('allowlist header reflects 11 files / 16 import statements', () => {
    const allowlist = read('lib/security/synthetic-import-allowlist.ts');
    expect(allowlist).toContain('CURRENT_SYNTHETIC_RUNTIME_IMPORTS = 11 files / 16 import statements');
  });

  it('neither fixture became zero-consumer overall — both remain needed by other real consumers', () => {
    const koraIndexOutputsConsumers = [
      'app/demo/page.tsx',
      'app/demo/gtm/page.tsx',
      'components/demo/DemoGuideContent.tsx',
      'services/scoring-simulator/ScoringSimulatorService.ts',
    ];
    for (const file of koraIndexOutputsConsumers) {
      expect(read(file)).toContain('kora-index-outputs.json');
    }
    const companyAggregatesConsumers = [
      'services/demo-data/DemoDataService.ts',
      'services/worker-pillar-adoption/WorkerPillarAdoptionService.ts',
      'services/scoring-simulator/ScoringSimulatorService.ts',
    ];
    for (const file of companyAggregatesConsumers) {
      expect(read(file)).toContain('company-aggregates.json');
    }
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
