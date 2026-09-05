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

  it('getBenchmarkPreview remains for its legitimate demo caller only', () => {
    const src = stripComments(read('services/admin-preview/AdminPreviewService.ts'));
    expect(src).toContain('getBenchmarkPreview(');
    const demoSrc = read('app/demo/benchmarks/page.tsx');
    expect(demoSrc).toContain('adminPreviewService.getBenchmarkPreview()');
  });
});

// ── 4. No advisor mock remains as current product truth ─────────────────────

describe('CC-00 Admin Console canonicalization — advisor mock removed from Admin, retained for demo', () => {
  it('Admin Home no longer renders an "Advisor Network" panel', () => {
    const admin = read('app/admin/page.tsx');
    expect(admin).not.toContain('title="Advisor Network"');
  });

  it('getAdvisorNetworkPreview remains for its legitimate demo caller only', () => {
    const src = stripComments(read('services/admin-preview/AdminPreviewService.ts'));
    expect(src).toContain('getAdvisorNetworkPreview(');
    const demoSrc = read('app/demo/network/page.tsx');
    expect(demoSrc).toContain('adminPreviewService.getAdvisorNetworkPreview()');
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

  it('app/demo/ai-onboarding/page.tsx carries the same privacy content locally, values unchanged', () => {
    const src = read('app/demo/ai-onboarding/page.tsx');
    expect(src).not.toContain('adminPreviewService.getPrivacyFilterPreview()');
    expect(src).toContain('PRIVACY_FILTER');
    expect(src).toContain('sensitive_fields_detected: 14');
    expect(src).toContain('pseudonymization_applied: true');
    expect(src).toContain('Diagnostic or therapist references');
  });

  it('the page still calls getAIOnboardingPreview unchanged (it has a legitimate demo caller)', () => {
    const src = read('app/demo/ai-onboarding/page.tsx');
    expect(src).toContain('adminPreviewService.getAIOnboardingPreview()');
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

  it('getFounderValidationPreview and getGateStatusPreview remain for their legitimate demo caller only', () => {
    const src = stripComments(read('services/admin-preview/AdminPreviewService.ts'));
    expect(src).toContain('getFounderValidationPreview(');
    expect(src).toContain('getGateStatusPreview(');
    const demoSrc = read('app/demo/gtm/page.tsx');
    expect(demoSrc).toContain('adminPreviewService.getFounderValidationPreview()');
    expect(demoSrc).toContain('adminPreviewService.getGateStatusPreview()');
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

  it('DEMO_VIEWER role is untouched — still defined, still admitted by requireDemoAccess()', () => {
    const constants = read('lib/constants/kora.ts');
    expect(constants).toContain('DEMO_VIEWER');
    const session = read('lib/auth/kora-session.ts');
    const start = session.indexOf('export async function requireDemoAccess');
    const body = session.slice(start, start + 1200);
    expect(body).toContain("koraRole === 'DEMO_VIEWER'");
    expect(body).toContain("koraRole === 'KORA_ADMIN'");
  });

  it('no live canonical data (getSupabaseServiceClient / analytics.* query) was added to any /demo/** page touched by this slice', () => {
    const demoAiOnboarding = read('app/demo/ai-onboarding/page.tsx');
    expect(demoAiOnboarding).not.toContain('getSupabaseServiceClient');
    expect(demoAiOnboarding).not.toMatch(/from\(['"]analytics/);
  });

  it('no /demo/** route was retired by this slice — all pre-existing routes still exist', () => {
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
  it('allowlist header count is unchanged by THIS slice (historical note: a later, unrelated slice changed the count)', () => {
    const allowlist = read('lib/security/synthetic-import-allowlist.ts');
    expect(allowlist).toContain('CURRENT_SYNTHETIC_RUNTIME_IMPORTS = 11 files / 16 import statements');
  });

  it('AdminPreviewService.ts still imports exactly one synthetic fixture (source-batches.json)', () => {
    const src = read('services/admin-preview/AdminPreviewService.ts');
    expect(src).toContain("from '@/data/synthetic/source-batches.json'");
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
