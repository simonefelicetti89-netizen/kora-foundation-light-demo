/**
 * CC-00 — B-TRUTH / ONE PRODUCT, ONE TRUTH.
 * AI-Onboarding Duplicate Retirement (2026-09-06).
 *
 * This is a bounded implementation slice INSIDE the open CC-00 workstream.
 * It does NOT close CC-00. CC-00 remains OPEN.
 *
 * Retires exactly 5 methods from services/admin-preview/AdminPreviewService.ts:
 *   - getSourceIntakePreview
 *   - getMappingIntelligencePreview
 *   - getUefDraftQueuePreview
 *   - getHumanReviewPreview
 *   - getScoringReadinessPreview
 *
 * These were confirmed to duplicate capability that already exists, for
 * real, canonically, elsewhere:
 *   - getSourceIntakePreview / getMappingIntelligencePreview duplicate
 *     app/admin/data-intake/page.tsx (header-labeled "CANONICAL — B154-B:
 *     entry point globale Data Intake", KORA_ADMIN-gated).
 *   - getUefDraftQueuePreview / getHumanReviewPreview duplicate
 *     app/admin/uef-review/page.tsx (KORA_ADMIN-gated, real
 *     interpreter-generated UEF review).
 *   - getScoringReadinessPreview duplicates app/admin/pipeline/page.tsx's
 *     own real, canonical readiness signal.
 *
 * This is a RETIREMENT, not a migration — nothing was canonicalized because
 * nothing needed to be: the underlying KORA capability was never uniquely
 * implemented in these 5 methods, only simulated for the /demo pitch page.
 * Their sole real caller, app/demo/ai-onboarding/page.tsx (DEMO_VIEWER-gated,
 * same security tier as Index Registry's/Portfolio's demo callers), has had
 * its now-obsolete UI sections removed — no live data was introduced there,
 * no synthetic replacement was added.
 *
 * Explicitly untouched: getAIOnboardingPreview (real admin-facing value,
 * blocked by the unresolved DEMO_VIEWER/live-data security question),
 * getPrivacyFilterPreview (static compliance/policy presentation, not a
 * duplicated live feature), getIndexRegistryPreview, getCompanyPortfolioPreview,
 * and every Tier C method.
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
const RETIRED_METHODS = [
  'getSourceIntakePreview', 'getMappingIntelligencePreview',
  'getUefDraftQueuePreview', 'getHumanReviewPreview', 'getScoringReadinessPreview',
];
const RETIRED_TYPES = [
  'SourceBatchPreview', 'MappingIntelligencePreview',
  'UefDraftQueuePreview', 'HumanReviewPreview', 'ScoringReadinessPreview',
];

function stripComments(src: string): string {
  return src.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
}

describe('CC-00 AI-Onboarding Duplicate Retirement — the five target methods no longer exist', () => {
  it('none of the five methods are defined on AdminPreviewService.ts anymore', () => {
    const src = read('services/admin-preview/AdminPreviewService.ts');
    for (const method of RETIRED_METHODS) {
      expect(src).not.toMatch(new RegExp(`^\\s{2,4}${method}\\(`, 'm'));
    }
  });

  it('the five corresponding interfaces are gone (zero remaining consumers)', () => {
    const src = read('services/admin-preview/AdminPreviewService.ts');
    for (const type of RETIRED_TYPES) {
      expect(src).not.toContain(`export interface ${type}`);
    }
  });

  it('SOURCE_TYPE_LABELS constant is gone (its sole consumer, getSourceIntakePreview, is retired)', () => {
    const src = read('services/admin-preview/AdminPreviewService.ts');
    expect(src).not.toContain('SOURCE_TYPE_LABELS');
  });

  it('no runtime file (app/services/lib/components), excluding governance docs and tests, calls any of the five retired methods', () => {
    const offenders: string[] = [];
    for (const dir of RUNTIME_DIRS) {
      for (const file of walkTs(resolve(root, dir))) {
        const relative = file.replace(root + '/', '');
        if (EXCLUDED_DOCS.has(relative)) continue;
        const content = read(relative);
        const codeOnly = stripComments(content);
        for (const method of RETIRED_METHODS) {
          if (new RegExp(`adminPreviewService\\s*\\.\\s*${method}\\s*\\(`).test(codeOnly)) offenders.push(`${relative} -> ${method}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it('no test file (excluding this one and the historical-note update in cc00-adminpreview-cross-company-phase1) references the retired method names as live assertions', () => {
    const offenders: string[] = [];
    const selfFiles = new Set([
      'tests/unit/cc00-ai-onboarding-duplicate-retirement.test.ts',
      'tests/unit/cc00-adminpreview-cross-company-phase1.test.ts',
    ]);
    for (const file of walkTs(resolve(root, 'tests'))) {
      const relative = file.replace(root + '/', '');
      if (selfFiles.has(relative)) continue;
      const content = read(relative);
      for (const method of RETIRED_METHODS) {
        if (content.includes(method)) offenders.push(`${relative} -> ${method}`);
      }
    }
    expect(offenders).toEqual([]);
  });
});

describe('CC-00 AI-Onboarding Duplicate Retirement — canonical replacements are confirmed live elsewhere (capability preserved, not lost)', () => {
  it('app/admin/data-intake/page.tsx exists, is KORA_ADMIN-gated, and is self-labeled canonical (replaces getSourceIntakePreview/getMappingIntelligencePreview)', () => {
    expect(existsSync(resolve(root, 'app/admin/data-intake/page.tsx'))).toBe(true);
    const src = read('app/admin/data-intake/page.tsx');
    expect(src).toContain('requireKoraAdmin');
    expect(src.toUpperCase()).toContain('CANONICAL');
  });

  it('app/admin/uef-review/page.tsx exists and is KORA_ADMIN-gated (replaces getUefDraftQueuePreview/getHumanReviewPreview)', () => {
    expect(existsSync(resolve(root, 'app/admin/uef-review/page.tsx'))).toBe(true);
    const src = read('app/admin/uef-review/page.tsx');
    expect(src).toContain('requireKoraAdmin');
  });

  it('app/admin/pipeline/page.tsx exists and reads canonical readiness state (replaces getScoringReadinessPreview)', () => {
    expect(existsSync(resolve(root, 'app/admin/pipeline/page.tsx'))).toBe(true);
    const src = read('app/admin/pipeline/page.tsx');
    expect(src).toContain("schema('analytics')");
  });
});

describe('CC-00 AI-Onboarding Duplicate Retirement — app/demo/ai-onboarding/page.tsx trimmed, no new synthetic or live data introduced', () => {
  it('the page no longer calls any of the five retired methods', () => {
    const src = read('app/demo/ai-onboarding/page.tsx');
    for (const method of RETIRED_METHODS) {
      expect(src).not.toContain(method);
    }
  });

  // getPrivacyFilterPreview() was accurately called via adminPreviewService
  // at the time this test was written. CC-00 Admin Console canonicalization
  // (2026-09-19) later, separately, moved its content out of
  // AdminPreviewService.ts entirely (it was real, accurate, always-true
  // privacy policy, not a synthetic preview) — inlined as a local
  // PRIVACY_FILTER constant directly in this same page. See
  // tests/unit/cc00-admin-console-canonicalization.test.ts.
  it('the page still calls getAIOnboardingPreview; getPrivacyFilterPreview has since been inlined locally (historical note)', () => {
    const src = read('app/demo/ai-onboarding/page.tsx');
    expect(src).toContain('adminPreviewService.getAIOnboardingPreview()');
    expect(src).not.toContain('adminPreviewService.getPrivacyFilterPreview()');
    expect(src).toContain('PRIVACY_FILTER');
  });

  it('no live Supabase/DB query was introduced into the demo page (no live data added to /demo)', () => {
    const src = read('app/demo/ai-onboarding/page.tsx');
    expect(src).not.toContain('getSupabaseServiceClient');
    expect(src).not.toContain('getSupabaseServerClient');
    expect(src).not.toMatch(/from\(['"]analytics/);
  });

  it('no new data/synthetic/** import was added to the demo page', () => {
    const src = read('app/demo/ai-onboarding/page.tsx');
    expect(src).not.toMatch(/from\s+['"][^'"]*data\/synthetic\//);
  });

  it('no new admin route link was introduced (no telling DEMO_VIEWER to visit a KORA_ADMIN-only route)', () => {
    const src = read('app/demo/ai-onboarding/page.tsx');
    expect(src).not.toMatch(/href=["']\/admin/);
  });
});

describe('CC-00 AI-Onboarding Duplicate Retirement — scope boundary (one PR = one bounded step)', () => {
  // getPrivacyFilterPreview()/PrivacyFilterPreview were accurately still
  // defined here at the time this test was written. CC-00 Admin Console
  // canonicalization (2026-09-19) later, separately, moved both out of this
  // file entirely — see tests/unit/cc00-admin-console-canonicalization.test.ts.
  it('getAIOnboardingPreview is untouched; getPrivacyFilterPreview has since been separately moved out (historical note)', () => {
    const src = stripComments(read('services/admin-preview/AdminPreviewService.ts'));
    expect(src).toContain('getAIOnboardingPreview(): CompanyOnboardingStatus');
    expect(src).toContain('export interface CompanyOnboardingStatus');
    expect(src).not.toContain('getPrivacyFilterPreview(');
    expect(src).not.toContain('export interface PrivacyFilterPreview');
  });

  // getIndexRegistryPreview was accurately untouched, with both real
  // callers intact, at the time this test was written. CC-00 Index
  // Registry canonicalization (2026-09-06, later the same day) later,
  // separately, retired it — see
  // tests/unit/cc00-index-registry-canonicalization.test.ts.
  it('getIndexRegistryPreview has since been separately canonicalized and removed (historical note, not a live assertion)', () => {
    const src = read('services/admin-preview/AdminPreviewService.ts');
    const codeOnly = stripComments(src);
    expect(codeOnly).not.toContain('getIndexRegistryPreview(');
    expect(existsSync(resolve(root, 'app/demo/index-registry'))).toBe(false);
  });

  // getCompanyPortfolioPreview was accurately untouched, with both real
  // callers intact, at the time this test was written. CC-00 Company
  // Portfolio capability salvage + canonicalization (2026-09-12) later,
  // separately, retired it outright — its real capability already existed,
  // canonically, at app/admin/companies/page.tsx. See
  // tests/unit/cc00-portfolio-canonicalization.test.ts.
  it('getCompanyPortfolioPreview has since been separately retired (historical note, not a live assertion)', () => {
    const src = read('services/admin-preview/AdminPreviewService.ts');
    const codeOnly = stripComments(src);
    expect(codeOnly).not.toContain('getCompanyPortfolioPreview(');
    expect(existsSync(resolve(root, 'app/demo/portfolio'))).toBe(false);
  });

  // getPartnerNetworkPreview and getBillingRevenuePreview were accurately
  // untouched at the time this test was written. CC-00 Admin Console
  // canonicalization (2026-09-19) later, separately, retired both outright.
  // See tests/unit/cc00-admin-console-canonicalization.test.ts.
  it('Tier C methods (benchmark, advisor network, founder-validation, gate status) are untouched; partner network and billing have since been separately retired', () => {
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

  it('no DEMO_VIEWER/auth policy file was touched — requireDemoAccess/requireDemoGate unchanged in shape', () => {
    const src = read('lib/auth/kora-session.ts');
    expect(src).toContain('DEMO_VIEWER');
    expect(src).toContain('KORA_ADMIN is admitted for preview purposes');
    const guardSrc = read('lib/auth/demo-guard.tsx');
    expect(guardSrc).toContain('requireDemoAccess');
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
});

describe('CC-00 AI-Onboarding Duplicate Retirement — AdminPreviewService remains correctly NARROWED, CC-00 remains OPEN', () => {
  it('registry svc.admin-preview entry documents the retirement truthfully, not marked DEAD, not marked fully CANONICAL', () => {
    const registry = read('lib/architecture/registry.ts');
    const idx = registry.indexOf("id: 'svc.admin-preview'");
    expect(idx).toBeGreaterThan(-1);
    const nextIdx = registry.indexOf('{ id:', idx + 10);
    const entry = registry.slice(idx, nextIdx);
    expect(entry).not.toContain("status: 'DEAD'");
    expect(entry).not.toMatch(/status:\s*'CANONICAL'/);
    expect(entry).toContain('AI-Onboarding Duplicate Retirement');
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

describe('CC-00 AI-Onboarding Duplicate Retirement — I9 unaffected (retirement, not a synthetic-import removal)', () => {
  // The header count was accurately "12 files / 20 import statements" at
  // the time this test was written. CC-00 Company Portfolio capability
  // salvage + canonicalization (2026-09-12) later, separately, removed 2 of
  // AdminPreviewService.ts's 3 synthetic imports (companies.json,
  // kora-index-outputs.json) when it retired getCompanyPortfolioPreview() —
  // file count unchanged (12), import count 20->18. CC-00 Public Landing
  // canonicalization (2026-09-26) later reduced it further to 11 files / 16
  // imports (app/page.tsx dropped both its synthetic imports). See
  // tests/unit/cc00-public-landing-canonicalization.test.ts.
  it('allowlist header count reflects the current total — source-batches.json remains needed by getAIOnboardingPreview', () => {
    const allowlist = read('lib/security/synthetic-import-allowlist.ts');
    expect(allowlist).toContain('CURRENT_SYNTHETIC_RUNTIME_IMPORTS = 11 files / 16 import statements');
    expect(allowlist).toMatch(/\{\s*file:\s*'services\/admin-preview\/AdminPreviewService\.ts'/);
  });

  // companies.json and kora-index-outputs.json were accurately imported by
  // AdminPreviewService.ts at the time this test was written. CC-00 Company
  // Portfolio capability salvage + canonicalization (2026-09-12) later,
  // separately, removed both when it retired getCompanyPortfolioPreview() —
  // source-batches.json is the only one that remains, still needed by the
  // non-retired getAIOnboardingPreview.
  it('AdminPreviewService.ts imports only its remaining needed synthetic fixture (historical note: used to import 3, now 1)', () => {
    const src = read('services/admin-preview/AdminPreviewService.ts');
    expect(src).not.toContain("from '@/data/synthetic/companies.json'");
    expect(src).not.toContain("from '@/data/synthetic/kora-index-outputs.json'");
    expect(src).toContain("from '@/data/synthetic/source-batches.json'");
  });
});
