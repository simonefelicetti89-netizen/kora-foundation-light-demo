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

// app/demo/ai-onboarding/page.tsx's trimmed content (no retired methods, no
// new live/synthetic data, no new admin links) was accurately verified here
// at the time this test was written. CC-00 Residual /demo/** controlled
// retirement (2026-09-26, a later, separate slice) retired the entire
// route — there is no page left to check.
describe('CC-00 AI-Onboarding Duplicate Retirement — app/demo/ai-onboarding/page.tsx has since been separately retired (historical note, not a live assertion)', () => {
  it('app/demo/ai-onboarding/ no longer exists', () => {
    expect(existsSync(resolve(root, 'app/demo/ai-onboarding'))).toBe(false);
  });
});

describe('CC-00 AI-Onboarding Duplicate Retirement — scope boundary (one PR = one bounded step)', () => {
  // getPrivacyFilterPreview()/PrivacyFilterPreview were accurately still
  // defined here at the time this test was written. CC-00 Admin Console
  // canonicalization (2026-09-19) later, separately, moved both out of this
  // file entirely — see tests/unit/cc00-admin-console-canonicalization.test.ts.
  // getAIOnboardingPreview()/CompanyOnboardingStatus were accurately still
  // defined here, with getPrivacyFilterPreview already moved out, at the
  // time this test was written. CC-00 Residual /demo/** controlled
  // retirement (2026-09-26, a later, separate slice) retired
  // app/demo/ai-onboarding/ entirely and removed both along with it.
  it('getAIOnboardingPreview has since been separately retired too (historical note)', () => {
    const src = stripComments(read('services/admin-preview/AdminPreviewService.ts'));
    expect(src).not.toContain('getAIOnboardingPreview(');
    expect(src).not.toContain('export interface CompanyOnboardingStatus');
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
  // getBenchmarkPreview, getAdvisorNetworkPreview, and
  // getFounderValidationPreview were accurately untouched Tier C methods at
  // the time this test was written. CC-00 Residual /demo/** controlled
  // retirement (2026-09-26, a later, separate slice) retired their sole
  // remaining callers and removed all 3 — getGateStatusPreview is the only
  // method left on AdminPreviewService.ts.
  it('Tier C methods have since been separately narrowed to getGateStatusPreview only (historical note)', () => {
    const src = stripComments(read('services/admin-preview/AdminPreviewService.ts'));
    expect(src).toContain('getGateStatusPreview(');
    for (const method of [
      'getBenchmarkPreview', 'getAdvisorNetworkPreview', 'getFounderValidationPreview',
      'getPartnerNetworkPreview', 'getBillingRevenuePreview',
    ]) {
      expect(src).not.toContain(`${method}(`);
    }
  });

  // DEMO_VIEWER/auth policy files were accurately untouched, with
  // requireDemoAccess/requireDemoGate unchanged in shape, at the time this
  // test was written. CC-00 DEMO_VIEWER role retirement (2026-09-26, a
  // later, separate slice) retired the role and both functions entirely —
  // not replaced by another role with a different name.
  it('DEMO_VIEWER/auth policy files have since been separately retired (historical note, not a live assertion)', () => {
    const src = read('lib/auth/kora-session.ts');
    const codeOnly = src.split('\n').filter((line) => !line.trim().startsWith('//')).join('\n');
    expect(codeOnly).not.toContain('requireDemoAccess');
    expect(existsSync(resolve(root, 'lib/auth/demo-guard.tsx'))).toBe(false);
  });

  // PRIOR HISTORY (accurate as of its own time, preserved verbatim): this
  // check also asserted services/scoring-simulator/ScoringSimulatorService.ts
  // existed and app/my-kora/page.tsx contained 'getCurrentDemoUser'. CC-00
  // Final Scoring Canonicalization (2026-09-05) deleted ScoringSimulatorService
  // (zero real callers, last B-TRUTH-owned synthetic scoring dependency) and
  // removed my-kora/page.tsx's now-pointless getCurrentDemoUser() call along
  // with it. B-WORKER is untouched.
  it('B-WORKER is untouched — still exist, unmodified reachability; final scoring was later retired by CC-00 Final Scoring Canonicalization, unrelated to this PR', () => {
    for (const file of [
      'services/worker-provisioning/WorkerProvisioningService.ts',
      'services/worker-achievements/WorkerAchievementService.ts',
      'services/worker-space/WorkerSpaceCapabilityService.ts',
      'services/activation-safeguard/ActivationSafeguardService.ts',
    ]) {
      expect(existsSync(resolve(root, file))).toBe(true);
    }
    expect(existsSync(resolve(root, 'services/scoring-simulator/ScoringSimulatorService.ts'))).toBe(false);
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
  // CC-00 Residual /demo/** controlled retirement (2026-09-26, same day,
  // later slice) retired getAIOnboardingPreview's sole caller
  // (app/demo/ai-onboarding/) and removed source-batches.json along with
  // it — AdminPreviewService.ts is no longer an allowlist entry at all,
  // and the count reduces further to 8 files / 13 imports. CC-00 Bucket C
  // cleanup (2026-09-05, a later, separate slice) reduced it further still
  // to 6 files / 11 imports.
  it('allowlist header count reflects the current total — source-batches.json is gone (historical note: used to remain needed by getAIOnboardingPreview)', () => {
    const allowlist = read('lib/security/synthetic-import-allowlist.ts');
    expect(allowlist).toContain('CURRENT_SYNTHETIC_RUNTIME_IMPORTS = 3 files / 3 import statements');
    expect(allowlist).not.toMatch(/\{\s*file:\s*'services\/admin-preview\/AdminPreviewService\.ts'/);
  });

  // companies.json and kora-index-outputs.json were accurately removed
  // already at the time this test was written; source-batches.json was
  // still imported, needed by getAIOnboardingPreview. CC-00 Residual
  // /demo/** controlled retirement (2026-09-26) retired that method's sole
  // caller and removed source-batches.json too — AdminPreviewService.ts
  // now imports zero data/synthetic/** fixtures.
  it('AdminPreviewService.ts imports zero synthetic fixtures (historical note: used to import 3, then 1, now 0)', () => {
    const src = read('services/admin-preview/AdminPreviewService.ts');
    expect(src).not.toContain("from '@/data/synthetic/companies.json'");
    expect(src).not.toContain("from '@/data/synthetic/kora-index-outputs.json'");
    expect(src).not.toContain("from '@/data/synthetic/source-batches.json'");
    expect(existsSync(resolve(root, 'data/synthetic/source-batches.json'))).toBe(false);
  });
});
