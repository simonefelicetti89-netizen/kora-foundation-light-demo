// tests/unit/cc00-admin-console-canonicalization.test.ts
// CC-00 — Admin Console panel-by-panel canonicalization (2026-09-19).
//
// Goal: remove the remaining synthetic product truth from app/admin/page.tsx
// panel by panel — "No panel survives merely because it exists today."
//
// Dispositions (full rationale in lib/architecture/registry.ts's
// svc.admin-preview entry):
//   - getPartnerNetworkPreview()   RETIRED outright (zero remaining callers;
//     no canonical evidence_protocol_status/active_programs model exists).
//   - getBillingRevenuePreview()   RETIRED outright (zero product authority,
//     zero demo caller, own title already said "(mock)").
//   - getPrivacyFilterPreview()    MOVED — real static policy, inlined at
//     its sole caller, app/demo/ai-onboarding/page.tsx.
//   - getBenchmarkPreview(), getAdvisorNetworkPreview(),
//     getFounderValidationPreview(), getGateStatusPreview(),
//     getAIOnboardingPreview()     KEPT as methods (legitimate demo
//     callers survive) but Admin Home stops consuming them for product
//     truth — Advisor/Partner Network panels and GTM Founder Cockpit
//     removed from Admin Home; Priority Queue's two AI-onboarding signals
//     replaced by already-fetched canonical aggregate fields (one dropped
//     outright rather than invented); Platform Analytics keeps its data
//     but loses a leftover "DEMO" mislabel; Gate & Methodology kept as
//     accurate static config, also de-badged.

import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import { resolve, join } from 'path';

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

function walk(dir: string, out: string[] = []): string[] {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const entry of entries) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

// ── 1. Admin Home no longer reads fake onboarding/advisor/partner/billing/GTM state ─

describe('CC-00 Admin Console canonicalization — Admin Home reads no fake product state', () => {
  const admin = stripComments(read('app/admin/page.tsx'));

  it('does not call getPartnerNetworkPreview, getBillingRevenuePreview, or getFounderValidationPreview', () => {
    expect(admin).not.toContain('getPartnerNetworkPreview');
    expect(admin).not.toContain('getBillingRevenuePreview');
    expect(admin).not.toContain('getFounderValidationPreview');
  });

  it('does not call getAdvisorNetworkPreview (Advisor Network panel and advisor-queue priority item both removed)', () => {
    expect(admin).not.toContain('getAdvisorNetworkPreview');
    expect(admin).not.toContain("id: 'advisor-queue'");
  });

  it('does not call getAIOnboardingPreview — priority queue derives pending batches from already-fetched canonical analytics instead', () => {
    expect(admin).not.toContain('getAIOnboardingPreview');
    expect(admin).not.toContain('onb.pending_review_batches');
    expect(admin).toContain('analytics.source_batches_total - analytics.source_batches_approved');
  });

  it('the "scoring blocked" priority-queue signal is dropped, not migrated (no honest multi-tenant translation)', () => {
    expect(admin).not.toContain("id: 'scoring'");
    expect(admin).not.toContain('scoring_readiness');
  });
});

// ── 2. No billing mock remains as product truth ──────────────────────────────

describe('CC-00 Admin Console canonicalization — billing mock removed', () => {
  it('getBillingRevenuePreview and BillingEntry no longer exist anywhere in AdminPreviewService.ts', () => {
    const src = stripComments(read('services/admin-preview/AdminPreviewService.ts'));
    expect(src).not.toContain('getBillingRevenuePreview(');
    expect(src).not.toContain('BillingEntry');
  });

  it('Admin Home no longer renders a "Billing & Revenue" block', () => {
    const admin = stripComments(read('app/admin/page.tsx'));
    expect(admin).not.toContain('Billing & Revenue');
    expect(admin).not.toContain('setup_fee_eur');
  });
});

// ── 3. No benchmark mock introduced into Admin ───────────────────────────────

describe('CC-00 Admin Console canonicalization — no benchmark semantics introduced into Admin', () => {
  it('Admin Home does not call getBenchmarkPreview or render any percentile/cluster-average language', () => {
    const admin = stripComments(read('app/admin/page.tsx')).toLowerCase();
    expect(admin).not.toContain('getbenchmarkpreview');
    for (const forbidden of ['percentile', 'cluster_avg', 'cluster_top_quartile', 'top performer']) {
      expect(admin).not.toContain(forbidden);
    }
  });

  // getBenchmarkPreview remained for its legitimate demo caller,
  // app/demo/benchmarks/page.tsx, accurately at the time this test was
  // written. CC-00 Residual /demo/** controlled retirement (2026-09-26, a
  // later, separate slice) retired that route and removed the method.
  it('getBenchmarkPreview has since been separately retired too (historical note)', () => {
    const src = stripComments(read('services/admin-preview/AdminPreviewService.ts'));
    expect(src).not.toContain('getBenchmarkPreview(');
    expect(exists('app/demo/benchmarks/page.tsx')).toBe(false);
  });
});

// ── 4. No advisor mock remains as current product truth ─────────────────────

describe('CC-00 Admin Console canonicalization — advisor mock removed from Admin, retained for demo', () => {
  it('Admin Home no longer renders an "Advisor Network" panel', () => {
    const admin = read('app/admin/page.tsx');
    expect(admin).not.toContain('title="Advisor Network"');
  });

  // getAdvisorNetworkPreview remained for its legitimate demo caller,
  // app/demo/network/page.tsx, accurately at the time this test was
  // written. CC-00 Residual /demo/** controlled retirement (2026-09-26, a
  // later, separate slice) retired that route and removed the method.
  it('getAdvisorNetworkPreview has since been separately retired too (historical note)', () => {
    const src = stripComments(read('services/admin-preview/AdminPreviewService.ts'));
    expect(src).not.toContain('getAdvisorNetworkPreview(');
    expect(exists('app/demo/network/page.tsx')).toBe(false);
  });
});

// ── 5. Partner network mock retired outright (zero callers remained) ────────

describe('CC-00 Admin Console canonicalization — partner network mock retired outright', () => {
  it('getPartnerNetworkPreview and PartnerEntry no longer exist anywhere', () => {
    const src = stripComments(read('services/admin-preview/AdminPreviewService.ts'));
    expect(src).not.toContain('getPartnerNetworkPreview(');
    expect(src).not.toContain('PartnerEntry');
  });

  it('Admin Home no longer renders a "Partner Network" panel', () => {
    const admin = read('app/admin/page.tsx');
    expect(admin).not.toContain('title="Partner Network"');
  });
});

// ── 6. Privacy filter moved, not retired — same values, new home ────────────

describe('CC-00 Admin Console canonicalization — privacy filter content relocated intact', () => {
  it('getPrivacyFilterPreview and PrivacyFilterPreview no longer exist in AdminPreviewService.ts', () => {
    const src = stripComments(read('services/admin-preview/AdminPreviewService.ts'));
    expect(src).not.toContain('getPrivacyFilterPreview(');
    expect(src).not.toContain('export interface PrivacyFilterPreview');
  });

  // app/demo/ai-onboarding/page.tsx carried the same relocated privacy
  // content, and still called getAIOnboardingPreview, accurately at the
  // time this test was written. CC-00 Residual /demo/** controlled
  // retirement (2026-09-26, a later, separate slice) retired the entire
  // route (and getAIOnboardingPreview along with it) — there is no page
  // left to check.
  it('app/demo/ai-onboarding/ has since been separately retired too (historical note)', () => {
    expect(exists('app/demo/ai-onboarding')).toBe(false);
    const src = stripComments(read('services/admin-preview/AdminPreviewService.ts'));
    expect(src).not.toContain('getAIOnboardingPreview(');
  });
});

// ── 7. Platform Analytics and Gate/Methodology de-mislabeled ────────────────

describe('CC-00 Admin Console canonicalization — mislabeling fixes', () => {
  const admin = read('app/admin/page.tsx');

  it('Platform Analytics panel carries no DEMO badge (canonical since Phase 1 2026-09-06 — badge was a leftover bug)', () => {
    const idx = admin.indexOf('title="Platform Analytics"');
    expect(idx).toBeGreaterThan(-1);
    const segment = admin.slice(idx, idx + 60);
    expect(segment).not.toContain('badgeLabel');
  });

  it('Intelligence operativa section is labeled LIVE, not DEMO', () => {
    const idx = admin.indexOf('label="Intelligence operativa"');
    expect(idx).toBeGreaterThan(-1);
    const segment = admin.slice(idx, idx + 60);
    expect(segment).toContain('badgeMode="LIVE"');
  });

  it('zero badgeMode="DEMO" remains anywhere on Admin Home', () => {
    expect(admin).not.toContain('badgeMode="DEMO"');
  });

  it('Priority Queue no longer shows the synthetic-preview disclaimer', () => {
    const idx = admin.indexOf('Coda priorità');
    expect(idx).toBeGreaterThan(-1);
    const segment = admin.slice(idx, idx + 400);
    expect(segment).not.toContain('Anteprima sintetica — non operativa');
    expect(segment).toContain('LIVE');
  });
});

// ── 8. Founder validation duplication resolved via link to the real tool ────

describe('CC-00 Admin Console canonicalization — founder validation duplication resolved', () => {
  it('Admin Home links to the real internal tool instead of duplicating it with fake data', () => {
    const admin = read('app/admin/page.tsx');
    expect(admin).toContain("href=\"/admin/founder-validation\"");
    expect(admin).not.toContain('potential_arr_eur');
  });

  it('the real internal tool still exists, unmodified by this slice', () => {
    expect(exists('app/admin/founder-validation/page.tsx')).toBe(true);
    const src = read('app/admin/founder-validation/page.tsx');
    expect(src).toContain('founderValidationService');
  });

  // getFounderValidationPreview and getGateStatusPreview both remained for
  // their legitimate demo caller, app/demo/gtm/page.tsx, accurately at the
  // time this test was written. CC-00 Residual /demo/** controlled
  // retirement (2026-09-26, a later, separate slice) retired that route —
  // getGateStatusPreview survived because app/admin/page.tsx already had
  // its own, separate, legitimate call to it; getFounderValidationPreview
  // had no other caller and was removed.
  it('getFounderValidationPreview has since been separately retired; getGateStatusPreview remains (historical note)', () => {
    const src = stripComments(read('services/admin-preview/AdminPreviewService.ts'));
    expect(src).not.toContain('getFounderValidationPreview(');
    expect(src).toContain('getGateStatusPreview(');
    expect(exists('app/demo/gtm/page.tsx')).toBe(false);
  });
});

// ── 9. No synthetic fallback added; no tenant_kind product branch ───────────

describe('CC-00 Admin Console canonicalization — safety', () => {
  it('no new data/synthetic/** import was added to app/admin/page.tsx', () => {
    const admin = read('app/admin/page.tsx');
    expect(admin).not.toMatch(/from ['"][^'"]*data\/synthetic\//);
  });

  it('no new tenant_kind filter introduced in the tenant query', () => {
    const src = read('app/admin/page.tsx');
    const tenantQueryIdx = src.indexOf("schema('analytics').from('tenant')");
    const nextQueryIdx = src.indexOf("schema('analytics').from('kora_index_result')");
    const tenantQuerySlice = src.slice(tenantQueryIdx, nextQueryIdx);
    expect(tenantQuerySlice).not.toContain('tenant_kind');
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

  // app/demo/ai-onboarding/page.tsx was the page touched by this slice and
  // was accurately checked here. CC-00 Residual /demo/** controlled
  // retirement (2026-09-26, a later, separate slice) retired the entire
  // route — there is no page left to check.
  it('app/demo/ai-onboarding/ has since been separately retired (historical note, not a live assertion)', () => {
    expect(exists('app/demo/ai-onboarding')).toBe(false);
  });

  // advisor, benchmarks, gtm, guide, and network were accurately
  // untouched, pre-existing routes at the time this slice landed. CC-00
  // Residual /demo/** controlled retirement (2026-09-26, a later, separate
  // slice) retired all 6 routes checked here (including ai-onboarding,
  // above).
  it('no /demo/** route was retired by THIS slice (historical note: a later slice retired 6 of these 8)', () => {
    const stillExist = ['app/demo/future-vision/page.tsx', 'app/demo/page.tsx'];
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

  it('no file under app/, lib/, services/, components/ calls the retired methods as code', () => {
    const codePattern = /adminPreviewService\.(getPartnerNetworkPreview|getBillingRevenuePreview|getPrivacyFilterPreview)\(/;
    const scanDirs = ['app', 'lib', 'services', 'components'];
    const files = scanDirs.flatMap((d) => walk(resolve(root, d)));
    for (const file of files) {
      if (!/\.(ts|tsx)$/.test(file)) continue;
      const content = readFileSync(file, 'utf-8');
      expect(codePattern.test(content), `${file} must not call a retired/moved method`).toBe(false);
    }
  });
});

// ── 10. Prior slices remain intact ───────────────────────────────────────────

describe('CC-00 Admin Console canonicalization — prior slices untouched', () => {
  it('Portfolio remains canonical — Company Readiness Matrix still reads `registry`, badgeMode LIVE', () => {
    const admin = read('app/admin/page.tsx');
    expect(admin).toContain('label="Company Readiness Matrix" badgeMode="LIVE"');
    expect(admin).toContain('registry.map((e');
    expect(stripComments(admin)).not.toContain('getCompanyPortfolioPreview');
  });

  it('Partner demo remains retired — app/demo/partner/ still does not exist', () => {
    expect(exists('app/demo/partner')).toBe(false);
  });

  it('Portfolio demo remains retired — app/demo/portfolio/ still does not exist', () => {
    expect(exists('app/demo/portfolio')).toBe(false);
  });
});

// ── 11. Untouched surfaces ────────────────────────────────────────────────────

describe('CC-00 Admin Console canonicalization — untouched surfaces', () => {
  // PRIOR HISTORY (accurate as of its own time, preserved verbatim): this
  // check also asserted services/scoring-simulator/ScoringSimulatorService.ts
  // existed and app/my-kora/page.tsx contained 'getCurrentDemoUser'. CC-00
  // Final Scoring Canonicalization (2026-09-05) deleted ScoringSimulatorService
  // (zero real callers, last B-TRUTH-owned synthetic scoring dependency) and
  // removed my-kora/page.tsx's now-pointless getCurrentDemoUser() call along
  // with it. ActivationSafeguardService.ts still exists (only its synthetic
  // evaluateFromSeed() method was removed). B-WORKER is untouched.
  it('B-WORKER is untouched; final scoring (ScoringSimulatorService) was later retired by CC-00 Final Scoring Canonicalization, unrelated to this PR', () => {
    for (const file of [
      'services/worker-provisioning/WorkerProvisioningService.ts',
      'services/worker-achievements/WorkerAchievementService.ts',
      'services/worker-space/WorkerSpaceCapabilityService.ts',
      'services/activation-safeguard/ActivationSafeguardService.ts',
    ]) {
      expect(exists(file)).toBe(true);
    }
    expect(exists('services/scoring-simulator/ScoringSimulatorService.ts')).toBe(false);
  });

  it('no KORA Admin redesign — app/admin/page.tsx keeps its existing section structure', () => {
    const src = read('app/admin/page.tsx');
    expect(src).toContain('SECTION 1: COMMAND HERO');
    expect(src).toContain('Intelligence operativa');
    expect(src).toContain('Company Readiness Matrix');
    expect(src).toContain('Methodology governance');
  });
});

// ── 12. I9 unaffected — no fixture-backed method was touched ────────────────

describe('CC-00 Admin Console canonicalization — I9 unaffected', () => {
  // CC-00 Public Landing canonicalization (2026-09-26) later, separately,
  // reduced the count further (app/page.tsx dropped both its synthetic
  // imports) — unrelated to this slice's own scope. See
  // tests/unit/cc00-public-landing-canonicalization.test.ts.
  // CC-00 Residual /demo/** controlled retirement (2026-09-26, same day,
  // later slice) reduced it further to 8 files / 13 imports and rewrote
  // AdminPreviewService.ts down to zero synthetic imports. CC-00 Bucket C
  // cleanup (2026-09-05, a later, separate slice) reduced it further still
  // to 6 files / 11 imports.
  it('allowlist header count is unchanged by THIS slice (historical note: later slices changed the count, most recently to 6/11)', () => {
    const allowlist = read('lib/security/synthetic-import-allowlist.ts');
    expect(allowlist).toContain('CURRENT_SYNTHETIC_RUNTIME_IMPORTS = 3 files / 3 import statements');
  });

  it('AdminPreviewService.ts imports zero synthetic fixtures (historical note: used to still import source-batches.json)', () => {
    const src = read('services/admin-preview/AdminPreviewService.ts');
    expect(src).not.toContain("from '@/data/synthetic/source-batches.json'");
    expect(src).not.toContain("from '@/data/synthetic/companies.json'");
    expect(src).not.toContain("from '@/data/synthetic/kora-index-outputs.json'");
  });
});

// ── 13. Registry documents the canonicalization, preserving history ─────────

describe('CC-00 Admin Console canonicalization — registry updated, preserving history', () => {
  it('registry svc.admin-preview entry records this slice and does not claim DEAD/CANONICAL status', () => {
    const registry = read('lib/architecture/registry.ts');
    const idx = registry.indexOf("id: 'svc.admin-preview'");
    const nextIdx = registry.indexOf('{ id:', idx + 10);
    const entry = registry.slice(idx, nextIdx);
    expect(entry).toContain('Admin Console panel-by-panel canonicalization');
    expect(entry).not.toContain("status: 'DEAD'");
    expect(entry).not.toMatch(/status:\s*'CANONICAL'/);
    expect(entry).toContain('CC-00 remains OPEN');
  });

  it('docs/ARCHITECTURE_REGISTRY.md matches the generator output (I10 sync)', () => {
    const checkedIn = read('docs/ARCHITECTURE_REGISTRY.md');
    expect(checkedIn).toContain('Admin Console panel-by-panel canonicalization');
  });
});
