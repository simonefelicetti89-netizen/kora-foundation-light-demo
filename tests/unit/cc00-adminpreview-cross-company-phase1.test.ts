/**
 * CC-00 — B-TRUTH / ONE PRODUCT, ONE TRUTH.
 * AdminPreview Cross-Company Canonicalization — Phase 1 (2026-09-06).
 *
 * This is a bounded implementation slice INSIDE the open CC-00 workstream.
 * It does NOT close CC-00. CC-00 remains OPEN — it has no single closure
 * gate satisfied by this or any one slice.
 *
 * Scope: exactly two methods on services/admin-preview/AdminPreviewService.ts.
 *   - getPlatformAnalyticsPreview() — RETIRED. Its sole real caller
 *     (app/admin/page.tsx) now fetches analytics.tenant/kora_index_result/
 *     confidence_result/source_batch directly and derives the same shape via
 *     the new pure view builder lib/live/admin-cross-company-view.ts.
 *   - getIndexRegistryPreview() — NOT migrated. Independently discovered
 *     security-architecture conflict: one of its two real callers,
 *     app/demo/index-registry/page.tsx, is reachable by the DEMO_VIEWER
 *     role (lib/auth/kora-session.ts's requireDemoAccess()), whose own
 *     header comment documents /demo pages as safe only because they are
 *     synth-only. Introducing a live cross-company query there is a
 *     security decision this slice does not make unilaterally, and forking
 *     a canonical-for-admin/synthetic-for-demo split for the same method
 *     was ruled out (ONE PRODUCT, ONE TRUTH). This method is untouched,
 *     still synthetic-backed, still has both its real callers.
 *
 * Explicitly out of scope, all untouched: getCompanyPortfolioPreview
 * (real-caller-required fields with no canonical equivalent — territory,
 * is_primary_demo, demo_note), the 7-method AI-onboarding cluster (every
 * method hardcoded to the literal 'meridiana-group', no tenant parameter —
 * a signature change, a separate slice), and the fully-hardcoded
 * benchmark/advisor-network/partner-network/billing/founder-validation-
 * preview methods (zero canonical model exists for any of them).
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

describe('CC-00 Phase 1 — only the two authorized methods were touched', () => {
  it('getPlatformAnalyticsPreview() no longer exists on AdminPreviewService.ts', () => {
    const src = read('services/admin-preview/AdminPreviewService.ts');
    expect(src).not.toMatch(/^\s{2,4}getPlatformAnalyticsPreview\(/m);
    expect(src).not.toContain('export interface PlatformAnalytics');
  });

  // getIndexRegistryPreview() was accurately untouched (still existed) at
  // the time this test was written. CC-00 Index Registry canonicalization
  // (2026-09-06, later the same day) later, separately, retired it — the
  // founder ratified DEMO_VIEWER's retirement, superseding the security
  // reason it had been deferred here. See
  // tests/unit/cc00-index-registry-canonicalization.test.ts for the
  // current, correct state.
  it('getIndexRegistryPreview() has since been separately canonicalized and removed (historical note, not a live assertion)', () => {
    const src = read('services/admin-preview/AdminPreviewService.ts');
    const codeOnly = stripComments(src);
    expect(codeOnly).not.toContain('getIndexRegistryPreview(');
    expect(codeOnly).not.toContain('export interface IndexRegistryEntry');
  });

  it('no runtime file (app/services/lib/components), excluding governance docs and tests, calls adminPreviewService.getPlatformAnalyticsPreview', () => {
    const offenders: string[] = [];
    for (const dir of RUNTIME_DIRS) {
      for (const file of walkTs(resolve(root, dir))) {
        const relative = file.replace(root + '/', '');
        if (EXCLUDED_DOCS.has(relative)) continue;
        const content = read(relative);
        const codeOnly = stripComments(content);
        if (/adminPreviewService\s*\.\s*getPlatformAnalyticsPreview\s*\(/.test(codeOnly)) offenders.push(relative);
      }
    }
    expect(offenders).toEqual([]);
  });
});

describe('CC-00 Phase 1 — the migrated caller uses the canonical cross-company view', () => {
  it('lib/live/admin-cross-company-view.ts exists, is a pure function fed by already-fetched rows', () => {
    const src = read('lib/live/admin-cross-company-view.ts');
    expect(src).toContain('export function buildAdminPlatformAnalyticsView(');
    expect(src).not.toMatch(/from\s+['"][^'"]*data\/synthetic\//);
    expect(src).not.toContain('getSupabaseServiceClient');
    expect(src).not.toContain(".schema('analytics')");
  });

  it('app/admin/page.tsx fetches analytics.tenant, analytics.kora_index_result (is_current), and analytics.source_batch server-side', () => {
    const src = read('app/admin/page.tsx');
    expect(src).toContain("schema('analytics').from('tenant')");
    expect(src).toContain("schema('analytics').from('kora_index_result')");
    expect(src).toContain("eq('is_current', true)");
    expect(src).toContain("schema('analytics').from('source_batch')");
    expect(src).toContain('buildAdminPlatformAnalyticsView(');
  });

  it('the kora_index_result query embeds confidence_result via confidence_result_id (one query, no N+1)', () => {
    const src = read('app/admin/page.tsx');
    expect(src).toContain('confidence_result:confidence_result_id(confidence_score, data_completeness)');
  });

  it('app/admin/page.tsx is an async Server Component ("use client" absent) — auth.users/service-role access stays server-only', () => {
    const src = read('app/admin/page.tsx');
    expect(src).not.toContain("'use client'");
    expect(src).toContain('export default async function KoraControlTower');
  });

  it('active_scenarios is dropped from the canonical projection\'s real code (zero real callers, confirmed) — prose mentions in its own explanatory header comment are not a violation', () => {
    const src = read('lib/live/admin-cross-company-view.ts');
    const codeOnly = stripComments(src);
    expect(codeOnly).not.toContain('active_scenarios');
  });

  it('avg_data_completeness is derived from analytics.confidence_result.data_completeness, not source_batch.completeness_pct, and not a hardcoded literal', () => {
    const src = read('lib/live/admin-cross-company-view.ts');
    const codeOnly = stripComments(src);
    expect(codeOnly).toContain('data_completeness');
    expect(codeOnly).not.toContain('completeness_pct');
    expect(codeOnly).not.toMatch(/avg_data_completeness:\s*0\.\d+/);
  });

  it('UI null-guards avg_kora_index / avg_confidence_score / avg_data_completeness (a tenant with no current result must not corrupt the display)', () => {
    const src = read('app/admin/page.tsx');
    expect(src).toMatch(/analytics\.avg_kora_index\s*!=\s*null/);
    expect(src).toMatch(/analytics\.avg_confidence_score\s*!=\s*null/);
    expect(src).toMatch(/analytics\.avg_data_completeness\s*!=\s*null/);
  });
});

describe('CC-00 Phase 1 — no benchmark/percentile semantics introduced', () => {
  it('the new view builder contains no benchmark/percentile/rank/market-average terminology', () => {
    const src = read('lib/live/admin-cross-company-view.ts').toLowerCase();
    for (const forbidden of ['benchmark', 'percentile', 'peer rank', 'market average', 'sector average', 'industry norm']) {
      expect(src).not.toContain(forbidden);
    }
  });

  it('the view builder computes only counts and simple portfolio-scoped means — no ranking function', () => {
    const src = read('lib/live/admin-cross-company-view.ts');
    expect(src).not.toMatch(/\.sort\(/);
    expect(src).not.toContain('rank');
  });
});

describe('CC-00 Phase 1 — no test-tenant special branch, no tenant_kind product filter', () => {
  it('lib/live/admin-cross-company-view.ts\'s actual code (excluding its own documentation comments) never reads tenant_kind or a specific tenant_code', () => {
    const src = read('lib/live/admin-cross-company-view.ts');
    const codeOnly = stripComments(src);
    expect(codeOnly).not.toContain('tenant_kind');
    expect(codeOnly).not.toContain('KORATEST-01');
    expect(codeOnly).not.toContain('BOSCOVERDE-01');
  });

  it('app/admin/page.tsx\'s new canonical queries do not filter by tenant_kind', () => {
    const src = read('app/admin/page.tsx');
    const tenantQueryIdx = src.indexOf("schema('analytics').from('tenant')");
    const nextQueryIdx = src.indexOf("schema('analytics').from('kora_index_result')");
    const tenantQuerySlice = src.slice(tenantQueryIdx, nextQueryIdx);
    expect(tenantQuerySlice).not.toContain('tenant_kind');
  });
});

describe('CC-00 Phase 1 — this slice touched ONLY the two authorized methods (scope boundary)', () => {
  // getCompanyPortfolioPreview was accurately untouched, still
  // synthetic-backed, at the time this test was written. CC-00 Company
  // Portfolio capability salvage + canonicalization (2026-09-12) later,
  // separately, retired it outright — its real capability already existed,
  // canonically, at app/admin/companies/page.tsx. See
  // tests/unit/cc00-portfolio-canonicalization.test.ts.
  it('getCompanyPortfolioPreview has since been separately retired (historical note, not a live assertion)', () => {
    const src = read('services/admin-preview/AdminPreviewService.ts');
    const codeOnly = stripComments(src);
    expect(codeOnly).not.toContain('getCompanyPortfolioPreview(');
    expect(codeOnly).not.toContain('export interface CompanyPortfolioEntry');
  });

  // getSourceIntakePreview, getMappingIntelligencePreview,
  // getUefDraftQueuePreview, getHumanReviewPreview, and
  // getScoringReadinessPreview were accurately untouched (still existed) at
  // the time this test was written. CC-00 AI-Onboarding Duplicate Retirement
  // (2026-09-06) later, separately, retired all 5 — they duplicated
  // already-canonical, already-live capability (app/admin/data-intake,
  // app/admin/uef-review, app/admin/pipeline). getAIOnboardingPreview
  // remained, deferred, unchanged at that time. CC-00 Admin Console
  // canonicalization (2026-09-19) later, separately, moved
  // getPrivacyFilterPreview() out of this file entirely — its content was
  // real, accurate, always-true privacy policy, not a synthetic preview, so
  // it never belonged in a Preview-simulation service; it is now inlined
  // directly in its sole caller, app/demo/ai-onboarding/page.tsx. See
  // tests/unit/cc00-admin-console-canonicalization.test.ts for the current,
  // correct state.
  it('getAIOnboardingPreview remains; getPrivacyFilterPreview has since been separately moved out of this file (historical note)', () => {
    const src = stripComments(read('services/admin-preview/AdminPreviewService.ts'));
    expect(src).toContain('getAIOnboardingPreview(');
    expect(src).not.toContain('getPrivacyFilterPreview(');
    for (const method of [
      'getSourceIntakePreview', 'getMappingIntelligencePreview',
      'getUefDraftQueuePreview', 'getHumanReviewPreview', 'getScoringReadinessPreview',
    ]) {
      expect(src).not.toContain(`${method}(`);
    }
    expect(src).toContain("'meridiana-group'");
  });

  // getPartnerNetworkPreview and getBillingRevenuePreview were accurately
  // untouched, still fully hardcoded, at the time this test was written.
  // CC-00 Admin Console canonicalization (2026-09-19) later, separately,
  // retired both outright — see
  // tests/unit/cc00-admin-console-canonicalization.test.ts.
  it('Tier C methods (benchmark, advisor network, founder-validation, gate status) are untouched — still fully hardcoded; partner network and billing have since been separately retired', () => {
    const src = stripComments(read('services/admin-preview/AdminPreviewService.ts'));
    for (const method of [
      'getBenchmarkPreview', 'getAdvisorNetworkPreview',
      'getFounderValidationPreview', 'getGateStatusPreview',
    ]) {
      expect(src).toContain(`${method}(`);
    }
    expect(src).not.toContain('getPartnerNetworkPreview(');
    expect(src).not.toContain('getBillingRevenuePreview(');
  });

  // app/demo/index-registry/page.tsx was accurately untouched at the time
  // this test was written. CC-00 Index Registry canonicalization
  // (2026-09-06) later, separately, retired the entire route — see
  // tests/unit/cc00-index-registry-canonicalization.test.ts.
  it('app/demo/index-registry has since been separately retired (historical note, not a live assertion)', () => {
    expect(existsSync(resolve(root, 'app/demo/index-registry'))).toBe(false);
  });

  // app/demo/portfolio/page.tsx was accurately untouched at the time this
  // test was written. CC-00 Company Portfolio capability salvage +
  // canonicalization (2026-09-12) later, separately, retired the entire
  // route — see tests/unit/cc00-portfolio-canonicalization.test.ts.
  it('app/demo/portfolio has since been separately retired (historical note, not a live assertion)', () => {
    expect(existsSync(resolve(root, 'app/demo/portfolio'))).toBe(false);
  });

  it('B-WORKER, My KORA, and final scoring are untouched — still exist, unmodified reachability', () => {
    for (const file of [
      'services/worker-provisioning/WorkerProvisioningService.ts',
      'services/worker-achievements/WorkerAchievementService.ts',
      'services/worker-space/WorkerSpaceCapabilityService.ts',
      'services/scoring-simulator/ScoringSimulatorService.ts',
      'services/activation-safeguard/ActivationSafeguardService.ts',
    ]) {
      expect(existsSync(resolve(root, file))).toBe(true);
    }
    const myKoraSrc = read('app/my-kora/page.tsx');
    expect(myKoraSrc).toContain('getCurrentDemoUser');
  });

  it('no KORA Admin redesign — app/admin/page.tsx keeps its existing section structure (Command Hero, Priority Queue, Intelligence Grid)', () => {
    const src = read('app/admin/page.tsx');
    expect(src).toContain('SECTION 1: COMMAND HERO');
    expect(src).toContain('Intelligence operativa');
  });
});

describe('CC-00 Phase 1 — AdminPreviewService remains correctly NARROWED, not retired, not falsely marked DEAD', () => {
  it('registry svc.admin-preview entry reflects CONSOLIDATE (narrowed), documents the migration truthfully', () => {
    const registry = read('lib/architecture/registry.ts');
    const idx = registry.indexOf("id: 'svc.admin-preview'");
    expect(idx).toBeGreaterThan(-1);
    const nextIdx = registry.indexOf('{ id:', idx + 10);
    const entry = registry.slice(idx, nextIdx);
    expect(entry).not.toContain("status: 'DEAD'");
    expect(entry).toContain('decisionRef:');
    expect(entry).not.toContain('decisionRef: null');
    expect(entry).toContain('CC-00');
  });

  it('the registry does not claim AdminPreviewService is fully canonical', () => {
    const registry = read('lib/architecture/registry.ts');
    const idx = registry.indexOf("id: 'svc.admin-preview'");
    const nextIdx = registry.indexOf('{ id:', idx + 10);
    const entry = registry.slice(idx, nextIdx);
    expect(entry).not.toMatch(/status:\s*'CANONICAL'/);
    expect(entry).toContain('PARTIALLY CANONICALIZED');
  });

  it('the registry does not claim CC-00 is closed', () => {
    const registry = read('lib/architecture/registry.ts');
    const idx = registry.indexOf("id: 'svc.admin-preview'");
    const nextIdx = registry.indexOf('{ id:', idx + 10);
    const entry = registry.slice(idx, nextIdx);
    expect(entry).not.toMatch(/CC-00 (closed|resolved|complete)/i);
    expect(entry).toContain('CC-00 remains OPEN');
  });
});

describe('CC-00 Phase 1 — RLS-20 is wired into the mandatory CI DB-backed gate (learning from the RLS-17 wiring-omission mistake)', () => {
  it('.github/workflows/ci.yml sets RLS20_PG_URL/RLS20_ALLOW_RUN and runs the RLS-20 test file in the mandatory no-skip job', () => {
    const ci = read('.github/workflows/ci.yml');
    expect(ci).toContain('RLS20_PG_URL:');
    expect(ci).toContain("RLS20_ALLOW_RUN: 'true'");
    expect(ci).toContain('tests/integration/rls-20-admin-cross-company-analytics.test.ts');
  });
});

describe('CC-00 Phase 1 — I9 remains as expected (not force-reduced)', () => {
  // The header count was accurately "12 files / 20 import statements" at
  // the time this test was written (this slice removed a method, not a
  // synthetic import). CC-00 Company Portfolio capability salvage +
  // canonicalization (2026-09-12) later, separately, reduced the import
  // count when it retired getCompanyPortfolioPreview() — file count
  // unchanged (12), import count 20->18. See
  // tests/unit/cc00-portfolio-canonicalization.test.ts.
  it('allowlist header count reflects the current total (historical note: was 20 imports, now 18)', () => {
    const allowlist = read('lib/security/synthetic-import-allowlist.ts');
    expect(allowlist).toContain('CURRENT_SYNTHETIC_RUNTIME_IMPORTS = 12 files / 18 import statements');
    expect(allowlist).toMatch(/\{\s*file:\s*'services\/admin-preview\/AdminPreviewService\.ts'/);
  });
});
