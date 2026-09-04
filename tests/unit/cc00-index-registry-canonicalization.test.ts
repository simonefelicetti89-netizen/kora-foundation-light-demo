/**
 * CC-00 — B-TRUTH / ONE PRODUCT, ONE TRUTH.
 * Index Registry canonicalization (2026-09-06).
 *
 * This is a bounded implementation slice INSIDE the open CC-00 workstream.
 * It does NOT close CC-00. CC-00 remains OPEN.
 *
 * Governance note: this slice proceeds under a founder decision that
 * DEMO_VIEWER must be retired entirely, superseding the prior D-C decision
 * (2026-08-31) that had kept /demo/** as permanent DEMO_RUNTIME. See
 * lib/architecture/registry.ts's app-surface.demo entry for the full,
 * preserved historical record of both decisions. The DEMO_VIEWER role
 * itself is NOT removed by this slice — other /demo/** routes still depend
 * on it; this is one bounded step of a larger, already-planned sequence.
 *
 * Retires getIndexRegistryPreview() and its IndexRegistryEntry interface
 * from services/admin-preview/AdminPreviewService.ts, and the entire
 * app/demo/index-registry/ route (page + layout). Its real value — a
 * compact "companies by current KORA Index" view — already lived, and
 * continues to live, in app/admin/page.tsx's own Intelligence Grid panel
 * (KORA_ADMIN-only, unchanged auth model), now reading canonical
 * analytics.tenant + analytics.kora_index_result directly via
 * lib/live/admin-cross-company-view.ts's buildIndexRegistryView() — reusing
 * the SAME already-fetched kora_index_result rows Platform Analytics
 * already queries (no second query, no duplicated business logic).
 *
 * scenario_id (the one field with no canonical equivalent) is dropped, not
 * replaced by an invented substitute. reporting_period, confidence_score,
 * methodology_version_id, calibration_status, and is_synthetic were
 * consumed only by the now-retired demo page and are not carried forward.
 *
 * Explicitly out of scope, all untouched: getCompanyPortfolioPreview,
 * getAIOnboardingPreview, getPrivacyFilterPreview, every Tier C method
 * (benchmark/advisor-network/partner-network/billing/founder-validation/
 * gate status), B-WORKER, My KORA/session identity, final scoring, and the
 * DEMO_VIEWER role itself.
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

describe('CC-00 Index Registry canonicalization — synthetic runtime removed', () => {
  it('getIndexRegistryPreview() and IndexRegistryEntry no longer exist on AdminPreviewService.ts', () => {
    const src = read('services/admin-preview/AdminPreviewService.ts');
    const codeOnly = stripComments(src);
    expect(codeOnly).not.toContain('getIndexRegistryPreview(');
    expect(codeOnly).not.toContain('export interface IndexRegistryEntry');
  });

  it('app/demo/index-registry/ (page + layout) no longer exists', () => {
    expect(existsSync(resolve(root, 'app/demo/index-registry'))).toBe(false);
  });

  it('no runtime file (app/services/lib/components), excluding governance docs, calls adminPreviewService.getIndexRegistryPreview', () => {
    const offenders: string[] = [];
    for (const dir of RUNTIME_DIRS) {
      for (const file of walkTs(resolve(root, dir))) {
        const relative = file.replace(root + '/', '');
        if (EXCLUDED_DOCS.has(relative)) continue;
        const content = read(relative);
        const codeOnly = stripComments(content);
        if (/adminPreviewService\s*\.\s*getIndexRegistryPreview\s*\(/.test(codeOnly)) offenders.push(relative);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('no dangling link to /demo/index-registry remains in navigation or the demo homepage', () => {
    const nav = read('lib/navigation/admin-nav-groups.ts');
    expect(nav).not.toContain('/demo/index-registry');
    const demoHome = read('app/demo/page.tsx');
    expect(demoHome).not.toContain('/demo/index-registry');
  });
});

describe('CC-00 Index Registry canonicalization — canonical read in app/admin/page.tsx', () => {
  it('app/admin/page.tsx uses buildIndexRegistryView() fed by the same canonical rows Platform Analytics already fetches (no second query)', () => {
    const src = read('app/admin/page.tsx');
    expect(src).toContain('buildIndexRegistryView(');
    // Exactly one kora_index_result query in the whole file — proves reuse, not duplication.
    const matches = src.match(/schema\('analytics'\)\.from\('kora_index_result'\)/g) ?? [];
    expect(matches.length).toBe(1);
  });

  it('app/admin/page.tsx no longer calls the retired synthetic method', () => {
    const src = read('app/admin/page.tsx');
    const codeOnly = stripComments(src);
    expect(codeOnly).not.toContain('adminPreviewService.getIndexRegistryPreview');
  });

  it('the panel no longer renders scenario_id ("S" column) — dropped, not replaced by an invented field', () => {
    const src = read('app/admin/page.tsx');
    expect(src).not.toContain('e.scenario_id');
    expect(src).not.toContain("['Azienda', 'S', 'Index']");
  });

  it('app/admin/page.tsx remains an async Server Component, KORA_ADMIN-gated via its layout ("use client" absent)', () => {
    const src = read('app/admin/page.tsx');
    expect(src).not.toContain("'use client'");
    const layoutSrc = read('app/admin/layout.tsx');
    expect(layoutSrc).toContain('requireKoraAdmin');
  });
});

describe('CC-00 Index Registry canonicalization — pure view builder', () => {
  it('lib/live/admin-cross-company-view.ts exports buildIndexRegistryView, is pure, no synthetic imports', () => {
    const src = read('lib/live/admin-cross-company-view.ts');
    expect(src).toContain('export function buildIndexRegistryView(');
    expect(src).not.toMatch(/from\s+['"][^'"]*data\/synthetic\//);
    expect(src).not.toContain('getSupabaseServiceClient');
    expect(src).not.toContain(".schema('analytics')");
  });

  it('the view returns only fields the real caller actually consumes — no scenario_id, no confidence_score, no calibration_status, no is_synthetic', () => {
    const src = read('lib/live/admin-cross-company-view.ts');
    const typeIdx = src.indexOf('export interface CanonicalIndexRegistryEntry');
    const typeBlock = src.slice(typeIdx, src.indexOf('}', typeIdx));
    expect(typeBlock).toContain('tenantId');
    expect(typeBlock).toContain('companyName');
    expect(typeBlock).toContain('koraIndexValue');
    expect(typeBlock).toContain('safeguardStatus');
    expect(typeBlock).not.toContain('scenarioId');
    expect(typeBlock).not.toContain('confidenceScore');
    expect(typeBlock).not.toContain('calibrationStatus');
    expect(typeBlock).not.toContain('isSynthetic');
  });
});

describe('CC-00 Index Registry canonicalization — no benchmark semantics, no tenant_kind branch', () => {
  it('the view builder contains no benchmark/percentile/rank/market-average terminology (excluding its own explanatory comments)', () => {
    const src = read('lib/live/admin-cross-company-view.ts');
    const codeOnly = stripComments(src).toLowerCase();
    for (const forbidden of ['benchmark', 'percentile', 'peer rank', 'market average', 'sector average', 'industry norm']) {
      expect(codeOnly).not.toContain(forbidden);
    }
  });

  it('buildIndexRegistryView does not sort/rank entries by value', () => {
    const src = read('lib/live/admin-cross-company-view.ts');
    const fnIdx = src.indexOf('export function buildIndexRegistryView(');
    const fnBody = src.slice(fnIdx, src.indexOf('\n}', fnIdx));
    expect(fnBody).not.toMatch(/\.sort\(/);
  });

  it('the view builder never reads tenant_kind or a specific tenant_code (excluding its own documentation comments)', () => {
    const src = read('lib/live/admin-cross-company-view.ts');
    const codeOnly = stripComments(src);
    expect(codeOnly).not.toContain('tenant_kind');
    expect(codeOnly).not.toContain('KORATEST-01');
    expect(codeOnly).not.toContain('BOSCOVERDE-01');
  });

  it('app/admin/page.tsx\'s tenant query does not filter by tenant_kind', () => {
    const src = read('app/admin/page.tsx');
    const tenantQueryIdx = src.indexOf("schema('analytics').from('tenant')");
    const nextQueryIdx = src.indexOf("schema('analytics').from('kora_index_result')");
    const tenantQuerySlice = src.slice(tenantQueryIdx, nextQueryIdx);
    expect(tenantQuerySlice).not.toContain('tenant_kind');
  });
});

describe('CC-00 Index Registry canonicalization — scope boundary (one PR = one bounded step)', () => {
  it('getCompanyPortfolioPreview is untouched — still exists, unmigrated, both real callers intact', () => {
    const src = read('services/admin-preview/AdminPreviewService.ts');
    expect(src).toContain('getCompanyPortfolioPreview(): CompanyPortfolioEntry[]');
    expect(read('app/admin/page.tsx')).toContain('adminPreviewService.getCompanyPortfolioPreview()');
    expect(read('app/demo/portfolio/page.tsx')).toContain('adminPreviewService.getCompanyPortfolioPreview()');
  });

  it('getAIOnboardingPreview and getPrivacyFilterPreview are untouched', () => {
    const src = read('services/admin-preview/AdminPreviewService.ts');
    expect(src).toContain('getAIOnboardingPreview(): CompanyOnboardingStatus');
    expect(src).toContain('getPrivacyFilterPreview(): PrivacyFilterPreview');
  });

  it('Tier C methods are untouched', () => {
    const src = read('services/admin-preview/AdminPreviewService.ts');
    for (const method of [
      'getBenchmarkPreview', 'getAdvisorNetworkPreview', 'getPartnerNetworkPreview',
      'getBillingRevenuePreview', 'getFounderValidationPreview', 'getGateStatusPreview',
    ]) {
      expect(src).toContain(`${method}(`);
    }
  });

  // app/demo/partner/page.tsx was accurately in this list as of this test's
  // writing. CC-00 partner demo capability salvage + controlled retirement
  // (2026-09-12) later, separately, retired the entire route — every
  // meaningful capability it showed was already duplicated (usually better)
  // on the real app/partner/** surface, or already named as a deferred
  // capability in app/partner/workspace/page.tsx's own "Funzionalità future"
  // section. See tests/unit/cc00-partner-demo-retirement.test.ts.
  it('other /demo/** routes are untouched — portfolio, network, advisor, ai-onboarding, gtm, benchmarks, guide, future-vision still exist; partner has since been separately retired', () => {
    for (const route of [
      'app/demo/portfolio/page.tsx', 'app/demo/network/page.tsx', 'app/demo/advisor/page.tsx',
      'app/demo/ai-onboarding/page.tsx', 'app/demo/gtm/page.tsx',
      'app/demo/benchmarks/page.tsx', 'app/demo/guide/page.tsx', 'app/demo/future-vision/page.tsx', 'app/demo/page.tsx',
    ]) {
      expect(existsSync(resolve(root, route))).toBe(true);
    }
    expect(existsSync(resolve(root, 'app/demo/partner/page.tsx'))).toBe(false);
  });

  it('DEMO_VIEWER role is untouched — still defined, still admitted by requireDemoAccess()', () => {
    const constants = read('lib/constants/kora.ts');
    expect(constants).toContain("DEMO_VIEWER");
    const session = read('lib/auth/kora-session.ts');
    expect(session).toContain("koraRole === 'DEMO_VIEWER'");
  });

  it('the remaining 4 gated /demo/** layouts still call requireDemoGate()', () => {
    for (const layout of [
      'app/demo/portfolio/layout.tsx', 'app/demo/network/layout.tsx',
      'app/demo/advisor/layout.tsx', 'app/demo/ai-onboarding/layout.tsx',
    ]) {
      expect(read(layout)).toContain('await requireDemoGate()');
    }
  });

  it('B-WORKER, My KORA, and final scoring are untouched', () => {
    for (const file of [
      'services/worker-provisioning/WorkerProvisioningService.ts',
      'services/worker-achievements/WorkerAchievementService.ts',
      'services/worker-space/WorkerSpaceCapabilityService.ts',
      'services/scoring-simulator/ScoringSimulatorService.ts',
      'services/activation-safeguard/ActivationSafeguardService.ts',
    ]) {
      expect(existsSync(resolve(root, file))).toBe(true);
    }
    expect(read('app/my-kora/page.tsx')).toContain('getCurrentDemoUser');
  });

  it('no KORA Admin redesign — app/admin/page.tsx keeps its existing section structure', () => {
    const src = read('app/admin/page.tsx');
    expect(src).toContain('SECTION 1: COMMAND HERO');
    expect(src).toContain('Intelligence operativa');
  });
});

describe('CC-00 Index Registry canonicalization — registry documents the D-C supersession, CC-00 remains open', () => {
  it('registry app-surface.demo entry preserves D-C verbatim and records the supersession', () => {
    const registry = read('lib/architecture/registry.ts');
    const idx = registry.indexOf("id: 'app-surface.demo'");
    expect(idx).toBeGreaterThan(-1);
    const nextIdx = registry.indexOf('{ id:', idx + 10);
    const entry = registry.slice(idx, nextIdx);
    expect(entry).toContain('D-C RESOLVED (founder decision, 2026-08-31)');
    expect(entry).toContain('SUPERSESSION');
    expect(entry).not.toMatch(/CC-00 (closed|resolved|complete)/i);
  });

  it('registry svc.admin-preview entry does not claim full canonicalization or DEAD status', () => {
    const registry = read('lib/architecture/registry.ts');
    const idx = registry.indexOf("id: 'svc.admin-preview'");
    const nextIdx = registry.indexOf('{ id:', idx + 10);
    const entry = registry.slice(idx, nextIdx);
    expect(entry).not.toContain("status: 'DEAD'");
    expect(entry).not.toMatch(/status:\s*'CANONICAL'/);
  });
});

describe('CC-00 Index Registry canonicalization — I9 unaffected (method removal, not a fixture removal)', () => {
  it('allowlist header count is unchanged — kora-index-outputs.json remains needed by the non-retired getCompanyPortfolioPreview and other consumers', () => {
    const allowlist = read('lib/security/synthetic-import-allowlist.ts');
    expect(allowlist).toContain('CURRENT_SYNTHETIC_RUNTIME_IMPORTS = 12 files / 20 import statements');
    expect(allowlist).toMatch(/\{\s*file:\s*'services\/admin-preview\/AdminPreviewService\.ts'/);
  });
});
