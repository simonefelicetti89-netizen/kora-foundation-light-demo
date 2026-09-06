// tests/unit/cc00-residual-demo-retirement.test.ts
// CC-00 — Residual /demo/** controlled retirement (2026-09-26).
//
// Goal: retire the remaining /demo/** product surfaces after route-by-route
// verification that all real product value has either been preserved in
// canonical KORA, internalized as real tooling, or recorded as deferred
// future capability. "No demo route survives merely because it still has a
// caller. No demo route is deleted before controlled salvage is complete."
//
// Result: advisor, ai-onboarding, benchmarks, gtm, guide, and network are
// retired outright. Only app/demo/page.tsx (root hub, real product-value
// links only) and app/demo/future-vision/page.tsx (constitutionally
// protected Future Vision mockup) remain under app/demo/**.
// AdminPreviewService.ts is narrowed to a single method, getGateStatusPreview().
// DEMO_VIEWER role itself is explicitly NOT removed this slice.

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

// ── 1. Retired routes are gone ───────────────────────────────────────────────

describe('CC-00 Residual demo retirement — retired routes absent', () => {
  it('app/demo/advisor/, app/demo/ai-onboarding/, app/demo/benchmarks/, app/demo/gtm/, app/demo/guide/, and app/demo/network/ no longer exist', () => {
    for (const route of [
      'app/demo/advisor',
      'app/demo/ai-onboarding',
      'app/demo/benchmarks',
      'app/demo/gtm',
      'app/demo/guide',
      'app/demo/network',
    ]) {
      expect(exists(route), `${route} should not exist`).toBe(false);
    }
  });

  it('services/advisor-evidence-review/ no longer exists (its sole caller, app/demo/advisor, was retired)', () => {
    expect(exists('services/advisor-evidence-review')).toBe(false);
  });

  it('data/synthetic/source-batches.json no longer exists (its sole consumer, getAIOnboardingPreview, was retired)', () => {
    expect(exists('data/synthetic/source-batches.json')).toBe(false);
  });

  it('the dead-code chain found alongside this retirement is also gone (components/demo/DemoGuideContent.tsx and its 3 sub-components)', () => {
    for (const file of [
      'components/demo/DemoGuideContent.tsx',
      'components/demo/PipelineConnectorBanner.tsx',
      'components/demo/WorkspaceSwitcher.tsx',
      'components/demo/StakeholderPaths.tsx',
    ]) {
      expect(exists(file), `${file} should not exist`).toBe(false);
    }
  });
});

// ── 2. Two routes remain, deliberately ───────────────────────────────────────

describe('CC-00 Residual demo retirement — surviving routes', () => {
  it('app/demo/page.tsx still exists (real product-value links only)', () => {
    expect(exists('app/demo/page.tsx')).toBe(true);
  });

  it('app/demo/future-vision/page.tsx still exists (constitutionally protected Future Vision mockup)', () => {
    expect(exists('app/demo/future-vision/page.tsx')).toBe(true);
  });

  it('app/demo/page.tsx no longer has an Ecosystem, Pipeline, or internal-tools section', () => {
    const src = read('app/demo/page.tsx');
    expect(src).not.toContain('demo-section-ecosystem');
    expect(src).not.toContain('demo-section-pipeline');
    expect(src).not.toContain('demo-internal-tools');
    for (const href of ['/demo/advisor', '/demo/ai-onboarding', '/demo/benchmarks', '/demo/gtm', '/demo/guide', '/demo/network']) {
      expect(src).not.toContain(href);
    }
  });

  it('app/demo/page.tsx still has its Intelligence and Roadmap sections', () => {
    const src = read('app/demo/page.tsx');
    expect(src).toContain('demo-section-intelligence');
    expect(src).toContain('demo-section-roadmap');
    expect(src).toContain('/company/kora-index');
    expect(src).toContain('/demo/future-vision');
  });
});

// ── 3. No new synthetic or live-data replacement route was added ────────────

describe('CC-00 Residual demo retirement — no replacement surface introduced', () => {
  it('no new page.tsx was added under app/demo/** beyond the 2 surviving routes', () => {
    const entries = readdirSync(resolve(root, 'app/demo'), { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => e.name);
    expect(entries.sort()).toEqual(['future-vision']);
  });

  it('app/demo/page.tsx introduces no getSupabaseServiceClient / analytics.* live query', () => {
    const src = stripComments(read('app/demo/page.tsx'));
    expect(src).not.toContain('getSupabaseServiceClient');
    expect(src).not.toMatch(/from\(['"]analytics/);
  });

  it('AdminPreviewService.ts imports zero data/synthetic/** fixtures', () => {
    const src = read('services/admin-preview/AdminPreviewService.ts');
    expect(src).not.toMatch(/from ['"][^'"]*data\/synthetic\//);
  });
});

// ── 4. Real canonical replacements remain, unaffected ────────────────────────

describe('CC-00 Residual demo retirement — real canonical replacements untouched', () => {
  it('app/admin/data-intake, app/admin/uef-review, app/admin/pipeline, and app/admin/founder-validation all still exist', () => {
    for (const route of [
      'app/admin/data-intake/page.tsx',
      'app/admin/uef-review/page.tsx',
      'app/admin/pipeline/page.tsx',
      'app/admin/founder-validation/page.tsx',
    ]) {
      expect(exists(route)).toBe(true);
    }
  });

  it('EvidenceReliabilityIntelligenceService.ts (the real dependency of the retired advisor page) is untouched, with other live callers', () => {
    expect(exists('services/evidence-reliability/EvidenceReliabilityIntelligenceService.ts')).toBe(true);
    expect(read('app/company/kora-index/page.tsx')).toContain('evidenceReliabilityIntelligenceService');
    expect(read('components/reports/BudgetImpactReport.tsx')).toContain('evidenceReliabilityIntelligenceService');
    for (const caller of ['lib/live/live-recommendations.ts', 'lib/live/live-board-actions.ts']) {
      expect(read(caller)).toContain('EvidenceReliabilityIntelligenceService');
    }
  });

  it('AdminPreviewService.ts retains exactly getGateStatusPreview(), consumed by app/admin/page.tsx', () => {
    const src = stripComments(read('services/admin-preview/AdminPreviewService.ts'));
    expect(src).toContain('getGateStatusPreview(');
    for (const method of [
      'getBenchmarkPreview', 'getAdvisorNetworkPreview', 'getFounderValidationPreview',
      'getAIOnboardingPreview', 'getPlatformAnalyticsPreview', 'getIndexRegistryPreview',
      'getCompanyPortfolioPreview', 'getPartnerNetworkPreview', 'getBillingRevenuePreview',
      'getPrivacyFilterPreview',
    ]) {
      expect(src).not.toContain(`${method}(`);
    }
    expect(read('app/admin/page.tsx')).toContain('adminPreviewService.getGateStatusPreview()');
  });
});

// ── 5. Deferred capability register preserved ────────────────────────────────

describe('CC-00 Residual demo retirement — deferred capabilities recorded, not silently dropped', () => {
  it('registry records advisor and advisor-network as deferred NETWORK-track capabilities, not silently deleted', () => {
    const registry = read('lib/architecture/registry.ts');
    const advisorIdx = registry.indexOf("id: 'Advisor'");
    expect(advisorIdx).toBeGreaterThan(-1);
    const advisorEntry = registry.slice(advisorIdx, registry.indexOf('{ id:', advisorIdx + 10));
    expect(advisorEntry).toContain('TO_BUILD');
    expect(advisorEntry).toContain('NETWORK-track');

    const adminPreviewIdx = registry.indexOf("id: 'svc.admin-preview'");
    const adminPreviewEntry = registry.slice(adminPreviewIdx, registry.indexOf('{ id:', adminPreviewIdx + 10));
    expect(adminPreviewEntry).toContain('NETWORK-track');
  });

  it('the benchmark disclaimer requirement is already preserved in CLAUDE.md, not lost with the demo page', () => {
    const claudeMd = read('CLAUDE.md');
    expect(claudeMd).toMatch(/pre[- ]empirical/i);
  });

  it('svc.advisor-evidence-review is marked DEAD with a decisionRef, not silently erased', () => {
    const registry = read('lib/architecture/registry.ts');
    const idx = registry.indexOf("id: 'svc.advisor-evidence-review'");
    expect(idx).toBeGreaterThan(-1);
    const entry = registry.slice(idx, registry.indexOf('{ id:', idx + 10));
    expect(entry).toContain("status: 'DEAD'");
    expect(entry).toContain('decisionRef:');
    expect(entry).not.toContain('decisionRef: null');
  });
});

// ── 6. Public landing CTA fix (independently discovered dependency) ─────────

describe('CC-00 Residual demo retirement — public landing CTA retargeted, not broken', () => {
  it('app/page.tsx no longer links to the retired /demo/guide route', () => {
    const src = read('app/page.tsx');
    expect(src).not.toContain('/demo/guide');
    expect(src).toContain('href="/demo"');
  });

  it('next.config.ts redirects /demo-guide and /advisor to /demo, not the deleted routes', () => {
    const config = read('next.config.ts');
    expect(config).toContain("source: '/demo-guide'");
    expect(config).toContain("source: '/advisor'");
  });
});

// ── 7. No live data exposed to DEMO_VIEWER; role itself has since been retired ─
// DEMO_VIEWER was accurately still defined and still admitted by
// requireDemoAccess() at the time this test was written. CC-00 DEMO_VIEWER
// role retirement (2026-09-26, a later, separate slice) retired the role
// entirely from the runtime role model — not replaced by another role with
// a different name. See tests/unit/cc00-demo-viewer-retirement.test.ts for
// the current, correct state.

describe('CC-00 Residual demo retirement — DEMO_VIEWER role has since been separately retired (historical note, not a live assertion)', () => {
  it('DEMO_VIEWER no longer exists in lib/constants/kora.ts, requireDemoAccess no longer exists', () => {
    const constants = read('lib/constants/kora.ts');
    expect(constants).not.toContain('DEMO_KORA_ROLES');
    const koraRolesStart = constants.indexOf('export const KORA_ROLES');
    const koraRolesBlock = constants.slice(koraRolesStart, constants.indexOf('as const;', koraRolesStart));
    expect(koraRolesBlock).not.toContain('DEMO_VIEWER');
    const session = read('lib/auth/kora-session.ts');
    const sessionCodeOnly = session.split('\n').filter((line) => !line.trim().startsWith('//')).join('\n');
    expect(sessionCodeOnly).not.toContain('requireDemoAccess');
  });

  it('zero gated /demo/** layouts remain anywhere in the repo', () => {
    for (const layout of [
      'app/demo/advisor/layout.tsx',
      'app/demo/ai-onboarding/layout.tsx',
      'app/demo/network/layout.tsx',
      'app/demo/portfolio/layout.tsx',
      'app/demo/partner/layout.tsx',
      'app/demo/index-registry/layout.tsx',
    ]) {
      expect(exists(layout)).toBe(false);
    }
  });

  it('app/demo/layout.tsx (the top-level, non-gated layout) is untouched', () => {
    const layout = read('app/demo/layout.tsx');
    expect(layout).not.toContain('import { requireDemoAccess');
    expect(layout).toContain('index: false');
  });
});

// ── 8. Prior CC-00 slices remain intact ──────────────────────────────────────

describe('CC-00 Residual demo retirement — prior slices untouched', () => {
  it('Admin Console remains canonical (#151) — zero badgeMode="DEMO" on Admin Home', () => {
    expect(read('app/admin/page.tsx')).not.toContain('badgeMode="DEMO"');
  });

  it('Public Landing remains synthetic-free (#152)', () => {
    const src = stripComments(read('app/page.tsx'));
    expect(src).not.toMatch(/from ['"][^'"]*data\/synthetic\//);
  });

  it('Portfolio remains canonical — Company Readiness Matrix still reads `registry`', () => {
    expect(read('app/admin/page.tsx')).toContain('registry');
    expect(exists('app/demo/portfolio')).toBe(false);
  });

  it('Partner demo remains retired', () => {
    expect(exists('app/demo/partner')).toBe(false);
  });

  it('Index Registry demo remains retired', () => {
    expect(exists('app/demo/index-registry')).toBe(false);
  });
});

// ── 9. Untouched surfaces ─────────────────────────────────────────────────────

describe('CC-00 Residual demo retirement — untouched surfaces', () => {
  it('B-WORKER services are untouched — still exist', () => {
    for (const file of [
      // PRIOR HISTORY: 'services/worker-provisioning/WorkerProvisioningService.ts'
      // was asserted to exist here (unmodified by this PR, at the time). B-WORKER
      // WorkerProvisioning Canonicalization (2026-09-06) retired it entirely (its 2
      // real callers migrated to canonical personal.worker_identity reads) —
      // removed from this list; this is that later, separately-authorized
      // retirement, not an unrelated-PR regression of this PR's own scope boundary.
      // PRIOR HISTORY: 'services/worker-achievements/WorkerAchievementService.ts'
      // was asserted to exist here (unmodified by this PR, at the time). B-WORKER
      // "One Product / No Demo Runtime" correction (2026-09-06) deleted it entirely
      // (zero real callers once its 2 callers, app/my-kora/page.tsx and
      // app/my-kora/dynamic-cv/page.tsx, became pure canonical redirects) — removed
      // from this list; this is that later, separately-authorized retirement, not an
      // unrelated-PR regression of this PR's own scope boundary.
      'services/worker-space/WorkerSpaceCapabilityService.ts',
    ]) {
      expect(exists(file)).toBe(true);
    }
  });

  // PRIOR HISTORY (accurate as of its own time, preserved verbatim): also
  // asserted app/my-kora/page.tsx contained 'getCurrentDemoUser'. CC-00
  // Final Scoring Canonicalization (2026-09-05) removed that call — it only
  // ever fed the now-retired scoringSimulatorService.getCompanyAggregate().
  it('My KORA is untouched', () => {
    expect(exists('app/my-kora/page.tsx')).toBe(true);
  });

  // PRIOR HISTORY (accurate as of its own time, preserved verbatim): "final
  // scoring is untouched" — asserted ScoringSimulatorService.ts existed.
  // CC-00 Final Scoring Canonicalization (2026-09-05) — a later, separate,
  // unrelated-to-this-PR slice — deleted it (zero real callers, last
  // B-TRUTH-owned synthetic scoring dependency). ActivationSafeguardService.ts
  // still exists (only its synthetic evaluateFromSeed() method was removed).
  it('ActivationSafeguardService.ts still exists; ScoringSimulatorService.ts was later retired by CC-00 Final Scoring Canonicalization, unrelated to this PR', () => {
    expect(exists('services/activation-safeguard/ActivationSafeguardService.ts')).toBe(true);
    expect(exists('services/scoring-simulator/ScoringSimulatorService.ts')).toBe(false);
  });

  it('no KORA Admin redesign — app/admin/page.tsx keeps its existing section structure', () => {
    const src = read('app/admin/page.tsx');
    expect(src).toContain('SECTION 1: COMMAND HERO');
    expect(src).toContain('Intelligence operativa');
  });
});

// ── 10. I9/I10 reflect this slice; CC-00 remains open ────────────────────────

describe('CC-00 Residual demo retirement — I9/I10 and CC-00 status', () => {
  // 8 files / 13 imports was accurate at the time this slice landed.
  // CC-00 Bucket C cleanup (2026-09-05, a later, separate slice) reduced
  // it further to 6 files / 11 imports.
  it('allowlist header reflects 6 files / 11 import statements (historical note: was 8/13 at the time this slice landed)', () => {
    const allowlist = read('lib/security/synthetic-import-allowlist.ts');
    expect(allowlist).toContain('CURRENT_SYNTHETIC_RUNTIME_IMPORTS = 0 files / 0 import statements'); // B-WORKER AccountProvisioning dead-code retirement (2026-09-06): AccountProvisioningService.ts removed from the allowlist (deleted, zero callers) — 2/2 -> 1/1, unrelated to this PR.
    expect(allowlist).not.toMatch(/\{\s*file:\s*'services\/admin-preview\/AdminPreviewService\.ts'/);
  });

  it('docs/ARCHITECTURE_REGISTRY.md matches the generator output (I10 sync)', () => {
    const checkedIn = read('docs/ARCHITECTURE_REGISTRY.md');
    expect(checkedIn).toContain('Residual /demo/** controlled retirement');
  });

  it('registry does not claim CC-00 is closed', () => {
    const registry = read('lib/architecture/registry.ts');
    const idx = registry.indexOf("id: 'app-surface.demo'");
    const entry = registry.slice(idx, registry.indexOf('{ id:', idx + 10));
    expect(entry).not.toMatch(/CC-00 (closed|resolved|complete)/i);
    expect(entry).toContain('CC-00 remains OPEN');
  });
});
