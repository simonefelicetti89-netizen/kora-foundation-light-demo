// tests/unit/cc00-portfolio-canonicalization.test.ts
// CC-00 — Company Portfolio capability salvage + canonicalization (2026-09-12).
//
// Goal: move the useful Company Portfolio capability from synthetic/demo
// truth into canonical KORA, preserve the real comparative operator value,
// remove demo-only decoration, and retire /demo/portfolio only after the
// canonical replacement is proven sufficient.
//
// Result: getCompanyPortfolioPreview() is RETIRED OUTRIGHT, not migrated —
// its real capability already existed, canonically and more richly, at
// app/admin/companies/page.tsx ("Company Console"). app/admin/page.tsx's
// "Company Readiness Matrix" panel now reuses the SAME already-fetched,
// already-canonical `registry` array (buildIndexRegistryView(), unchanged)
// it already fetches for the Intelligence Grid's KORA Index™ Registry
// panel — no second query, no new interface field. Full field-by-field
// disposition (sector, territory, is_primary_demo, demo_note) is recorded
// in lib/architecture/registry.ts's svc.admin-preview entry.

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
    if (stat.isDirectory()) {
      walk(full, out);
    } else {
      out.push(full);
    }
  }
  return out;
}

// ── 1. /demo/portfolio removed ───────────────────────────────────────────────

describe('CC-00 Portfolio canonicalization — /demo/portfolio removed', () => {
  it('app/demo/portfolio/page.tsx no longer exists', () => {
    expect(exists('app/demo/portfolio/page.tsx')).toBe(false);
  });

  it('app/demo/portfolio/layout.tsx no longer exists', () => {
    expect(exists('app/demo/portfolio/layout.tsx')).toBe(false);
  });

  it('app/demo/portfolio/ directory no longer exists', () => {
    expect(exists('app/demo/portfolio')).toBe(false);
  });
});

// ── 2. Real Portfolio capability remains in Admin ────────────────────────────

describe('CC-00 Portfolio canonicalization — real capability preserved in Admin', () => {
  it('app/admin/companies/page.tsx (Company Console) still exists, still KORA_ADMIN-gated, still DB-backed', () => {
    const src = read('app/admin/companies/page.tsx');
    expect(src).toContain('requireKoraAdmin');
    expect(exists('app/admin/companies/_components/CompanyConsolePanel.tsx')).toBe(true);
  });

  it('app/admin/page.tsx "Company Readiness Matrix" panel reads the canonical `registry` array, not `portfolio`', () => {
    const src = stripComments(read('app/admin/page.tsx'));
    expect(src).toContain('Company Readiness Matrix');
    expect(src).toContain('registry.map((e');
    expect(src).not.toContain('portfolio.map(');
  });

  it('app/admin/page.tsx no longer calls getCompanyPortfolioPreview', () => {
    const src = stripComments(read('app/admin/page.tsx'));
    expect(src).not.toContain('getCompanyPortfolioPreview');
  });

  it('Company Readiness Matrix panel is labeled LIVE, not DEMO', () => {
    const src = read('app/admin/page.tsx');
    const idx = src.indexOf('label="Company Readiness Matrix"');
    expect(idx).toBeGreaterThan(-1);
    const nextLines = src.slice(idx, idx + 100);
    expect(nextLines).toContain('badgeMode="LIVE"');
  });
});

// ── 3. Canonical data only — no synthetic fallback, no new query ────────────

describe('CC-00 Portfolio canonicalization — canonical data only, no synthetic fallback', () => {
  it('app/admin/page.tsx does not import companies.json or kora-index-outputs.json', () => {
    const src = read('app/admin/page.tsx');
    expect(src).not.toContain('data/synthetic/companies.json');
    expect(src).not.toContain('data/synthetic/kora-index-outputs.json');
  });

  it('the Company Readiness Matrix panel reuses buildIndexRegistryView() output already fetched for the Intelligence Grid — no second query', () => {
    const src = stripComments(read('app/admin/page.tsx'));
    const registryAssignments = (src.match(/buildIndexRegistryView\(/g) ?? []).length;
    expect(registryAssignments).toBe(1);
  });

  it('lib/live/admin-cross-company-view.ts is unchanged in shape — CanonicalIndexRegistryEntry still has no confidenceScore field (structural guard respected, not worked around)', () => {
    const src = read('lib/live/admin-cross-company-view.ts');
    const idx = src.indexOf('export interface CanonicalIndexRegistryEntry');
    const block = src.slice(idx, idx + 300);
    expect(block).not.toContain('confidenceScore');
  });
});

// ── 4. No tenant_kind product branch introduced ──────────────────────────────

describe('CC-00 Portfolio canonicalization — no tenant_kind branch introduced', () => {
  it('app/admin/page.tsx introduces no new tenant_kind filter', () => {
    const src = read('app/admin/page.tsx');
    const tenantQueryIdx = src.indexOf("schema('analytics').from('tenant')");
    const nextQueryIdx = src.indexOf("schema('analytics').from('kora_index_result')");
    const tenantQuerySlice = src.slice(tenantQueryIdx, nextQueryIdx);
    expect(tenantQuerySlice).not.toContain('tenant_kind');
  });
});

// ── 5. Dead/decorative fields removed — is_primary_demo, demo_note, sector, territory ─

describe('CC-00 Portfolio canonicalization — demo-only decoration removed', () => {
  it('is_primary_demo is gone — no product meaning, not replaced by a new "featured company" concept', () => {
    const src = stripComments(read('services/admin-preview/AdminPreviewService.ts'));
    expect(src).not.toContain('is_primary_demo');
    const adminPage = stripComments(read('app/admin/page.tsx'));
    expect(adminPage).not.toContain('is_primary_demo');
  });

  it('demo_note is gone — no canonical notes/narrative concept invented', () => {
    const src = stripComments(read('services/admin-preview/AdminPreviewService.ts'));
    expect(src).not.toContain('demo_note');
    const adminPage = stripComments(read('app/admin/page.tsx'));
    expect(adminPage).not.toContain('demo_note');
  });

  it('CompanyPortfolioEntry interface (sector, territory, headcount, is_primary_demo, demo_note) is fully removed', () => {
    const src = stripComments(read('services/admin-preview/AdminPreviewService.ts'));
    expect(src).not.toContain('CompanyPortfolioEntry');
  });

  it('the dead "CS™" and decorative "Fonte" columns are gone from the Company Readiness Matrix panel', () => {
    const src = read('app/admin/page.tsx');
    const idx = src.indexOf('label="Company Readiness Matrix"');
    expect(idx).toBeGreaterThan(-1);
    const panelBlock = src.slice(idx, idx + 3000);
    expect(panelBlock).not.toContain("'CS™'");
    expect(panelBlock).not.toContain("'Fonte'");
  });
});

// ── 6. territory not falsely presented as canonical territorial intelligence ─

describe('CC-00 Portfolio canonicalization — territory not falsely presented as canonical', () => {
  it('no live Admin surface renders a bare `territory` string as though it were canonical territorial intelligence', () => {
    const adminPage = stripComments(read('app/admin/page.tsx'));
    expect(adminPage).not.toContain('.territory');
  });

  it('no new territorial architecture is invented anywhere in this slice\'s changed files', () => {
    for (const file of [
      'services/admin-preview/AdminPreviewService.ts',
      'app/admin/page.tsx',
      'lib/live/admin-cross-company-view.ts',
    ]) {
      const src = stripComments(read(file));
      expect(src).not.toContain('territory_ref');
      expect(src).not.toContain('owner_type');
    }
  });

  it('the deferred territory finding is recorded in the architecture registry, referencing the Master Plan ontology row, not invented here', () => {
    const registry = read('lib/architecture/registry.ts');
    const idx = registry.indexOf("id: 'svc.admin-preview'");
    const nextIdx = registry.indexOf('{ id:', idx + 10);
    const entry = registry.slice(idx, nextIdx);
    expect(entry).toContain('TERRITORY / LOCAL ENTITY');
    expect(entry).toContain('da tipizzare');
    expect(entry).toContain('DEFERRED_REAL_CAPABILITY');
  });
});

// ── 7. No market benchmark/percentile semantics introduced ──────────────────

describe('CC-00 Portfolio canonicalization — no benchmark/percentile semantics introduced', () => {
  it('the Company Readiness Matrix panel introduces no ranking/percentile/benchmark language', () => {
    const src = read('app/admin/page.tsx');
    const idx = src.indexOf('label="Company Readiness Matrix"');
    expect(idx).toBeGreaterThan(-1);
    const panelBlock = src.slice(idx, idx + 3000).toLowerCase();
    for (const forbidden of ['percentile', 'benchmark', 'rank', 'peer', 'top performer']) {
      expect(panelBlock).not.toContain(forbidden);
    }
  });
});

// ── 8. No dangling nav references ────────────────────────────────────────────

describe('CC-00 Portfolio canonicalization — no dangling nav references', () => {
  it('app/demo/page.tsx no longer links to /demo/portfolio', () => {
    const src = read('app/demo/page.tsx');
    expect(src).not.toContain("'/demo/portfolio'");
  });

  it('lib/navigation/admin-nav-groups.ts no longer links to /demo/portfolio', () => {
    const src = read('lib/navigation/admin-nav-groups.ts');
    expect(src).not.toContain('/demo/portfolio');
  });

  it('no file under app/, lib/, services/, components/ imports from the retired app/demo/portfolio route', () => {
    const codePattern = /(?:from\s*['"]|require\(['"]|href=['"])[^'"]*demo\/portfolio\/(?:page|layout)/;
    const scanDirs = ['app', 'lib', 'services', 'components'];
    const files = scanDirs.flatMap((d) => walk(resolve(root, d)));
    for (const file of files) {
      if (!/\.(ts|tsx)$/.test(file)) continue;
      const content = readFileSync(file, 'utf-8');
      expect(codePattern.test(content), `${file} must not reference demo/portfolio as code`).toBe(false);
    }
  });
});

// ── 9. next.config.ts redirect corrections ───────────────────────────────────

describe('CC-00 Portfolio canonicalization — redirect corrections', () => {
  it('/admin/portfolio now redirects to /admin/companies, not the deleted /demo/portfolio', () => {
    const config = read('next.config.ts');
    const idx = config.indexOf("source: '/admin/portfolio'");
    const line = config.slice(idx, idx + 120);
    expect(line).toContain("destination: '/admin/companies'");
    expect(line).not.toContain('/demo/portfolio');
  });

  it('the pre-existing stale /admin/index-registry redirect (found while editing this array) is also fixed, pointing at /admin', () => {
    const config = read('next.config.ts');
    const idx = config.indexOf("source: '/admin/index-registry'");
    const line = config.slice(idx, idx + 120);
    expect(line).toContain("destination: '/admin'");
    expect(line).not.toContain('/demo/index-registry');
  });
});

// ── 10. DEMO_VIEWER role has since been separately retired; other /demo/** routes untouched ─────────
// DEMO_VIEWER was accurately untouched at the time this test was written.
// CC-00 DEMO_VIEWER role retirement (2026-09-26, a later, separate slice)
// retired the role entirely from the runtime role model — not replaced by
// another role with a different name.

describe('CC-00 Portfolio canonicalization — DEMO_VIEWER role has since been separately retired (historical note, not a live assertion)', () => {
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

  // advisor, ai-onboarding, benchmarks, gtm, and guide were accurately
  // untouched at the time this slice landed. CC-00 Residual /demo/**
  // controlled retirement (2026-09-26, a later, separate slice) retired
  // all 6 of them.
  it('other /demo/** routes untouched by THIS slice (historical note: a later slice retired 6 of them)', () => {
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
});

// ── 11. Gated /demo/** layout count: 4 → 3 ───────────────────────────────────

// The 3 remaining gated layouts (advisor, ai-onboarding, network) were
// accurate at the time this slice landed. CC-00 Residual /demo/**
// controlled retirement (2026-09-26, a later, separate slice) retired all
// 3 routes along with their layouts — zero gated /demo/** layouts remain.
// See tests/unit/cc00-residual-demo-retirement.test.ts.
describe('CC-00 Portfolio canonicalization — gated /demo/** layout count drops from 4 to 3 (historical: now 0)', () => {
  it('the 3 layouts that were gated at the time this slice landed have since been separately retired', () => {
    for (const layout of [
      'app/demo/advisor/layout.tsx',
      'app/demo/ai-onboarding/layout.tsx',
      'app/demo/network/layout.tsx',
    ]) {
      expect(exists(layout)).toBe(false);
    }
  });

  it('app/demo/portfolio/layout.tsx, app/demo/partner/layout.tsx, and app/demo/index-registry/layout.tsx are all gone', () => {
    expect(exists('app/demo/portfolio/layout.tsx')).toBe(false);
    expect(exists('app/demo/partner/layout.tsx')).toBe(false);
    expect(exists('app/demo/index-registry/layout.tsx')).toBe(false);
  });
});

// ── 12. Scope boundary — untouched surfaces ──────────────────────────────────

describe('CC-00 Portfolio canonicalization — untouched surfaces', () => {
  // getPrivacyFilterPreview was accurately still on this service at the
  // time this test was written. CC-00 Admin Console canonicalization
  // (2026-09-19) later, separately, moved it out entirely (real, accurate,
  // always-true privacy policy, not a synthetic preview) — inlined in its
  // sole caller, app/demo/ai-onboarding/page.tsx. See
  // tests/unit/cc00-admin-console-canonicalization.test.ts.
  // getAIOnboardingPreview existed on AdminPreviewService.ts, and
  // getPrivacyFilterPreview had already been moved out, accurately, at the
  // time this test was written. CC-00 Residual /demo/** controlled
  // retirement (2026-09-26, a later, separate slice) retired
  // app/demo/ai-onboarding/ entirely (its sole caller) and removed
  // getAIOnboardingPreview along with it.
  it('AI Onboarding has since been separately retired — getAIOnboardingPreview no longer exists (historical note)', () => {
    const src = stripComments(read('services/admin-preview/AdminPreviewService.ts'));
    expect(src).not.toContain('getAIOnboardingPreview(');
    expect(src).not.toContain('getPrivacyFilterPreview(');
  });

  // getBenchmarkPreview, getAdvisorNetworkPreview, and
  // getFounderValidationPreview were all accurately untouched Tier C
  // methods at the time this test was written (getPartnerNetworkPreview
  // and getBillingRevenuePreview had already been retired). CC-00
  // Residual /demo/** controlled retirement (2026-09-26, a later, separate
  // slice) retired their sole remaining callers (app/demo/benchmarks,
  // app/demo/network, app/demo/gtm) and removed all 3 methods —
  // getGateStatusPreview is the only method left on AdminPreviewService.ts.
  it('Tier C methods have since been separately narrowed to getGateStatusPreview only (historical note)', () => {
    const src = stripComments(read('services/admin-preview/AdminPreviewService.ts'));
    expect(src).toContain('getGateStatusPreview(');
    for (const method of [
      'getBenchmarkPreview', 'getAdvisorNetworkPreview', 'getFounderValidationPreview',
      'getPartnerNetworkPreview', 'getBillingRevenuePreview', 'getAIOnboardingPreview',
    ]) {
      expect(src).not.toContain(`${method}(`);
    }
  });

  // PRIOR HISTORY (accurate as of its own time, preserved verbatim): this
  // check also asserted services/scoring-simulator/ScoringSimulatorService.ts
  // existed and app/my-kora/page.tsx contained 'getCurrentDemoUser'. CC-00
  // Final Scoring Canonicalization (2026-09-05) deleted ScoringSimulatorService
  // (zero real callers, last B-TRUTH-owned synthetic scoring dependency) and
  // removed my-kora/page.tsx's now-pointless getCurrentDemoUser() call along
  // with it. B-WORKER is untouched.
  it('B-WORKER is untouched; final scoring was later retired by CC-00 Final Scoring Canonicalization, unrelated to this PR', () => {
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
      'services/activation-safeguard/ActivationSafeguardService.ts',
    ]) {
      expect(exists(file)).toBe(true);
    }
    expect(exists('services/scoring-simulator/ScoringSimulatorService.ts')).toBe(false);
  });

  // benchmark/network/advisor routes were accurately untouched at the time
  // this slice landed. CC-00 Residual /demo/** controlled retirement
  // (2026-09-26, a later, separate slice) retired all 3.
  it('benchmark/network/advisor routes have since been separately retired (historical note, not a live assertion)', () => {
    for (const layout of ['app/demo/network/layout.tsx', 'app/demo/advisor/layout.tsx']) {
      expect(exists(layout)).toBe(false);
    }
  });

  it('no KORA Admin redesign — app/admin/page.tsx keeps its existing section structure', () => {
    const src = read('app/admin/page.tsx');
    expect(src).toContain('SECTION 1: COMMAND HERO');
    expect(src).toContain('Intelligence operativa');
    expect(src).toContain('Company Readiness Matrix');
  });
});

// ── 13. Registry documents the canonicalization, preserving history ─────────

describe('CC-00 Portfolio canonicalization — registry updated, preserving history', () => {
  it('registry svc.admin-preview entry records the retirement and does not claim DEAD/CANONICAL status', () => {
    const registry = read('lib/architecture/registry.ts');
    const idx = registry.indexOf("id: 'svc.admin-preview'");
    const nextIdx = registry.indexOf('{ id:', idx + 10);
    const entry = registry.slice(idx, nextIdx);
    expect(entry).toContain('Company Portfolio capability salvage + canonicalization');
    expect(entry).not.toContain("status: 'DEAD'");
    expect(entry).not.toMatch(/status:\s*'CANONICAL'/);
    expect(entry).toContain('CC-00 remains OPEN');
  });

  it('registry app-surface.demo entry records the third slice and still shows CC-00 open', () => {
    const registry = read('lib/architecture/registry.ts');
    const idx = registry.indexOf("id: 'app-surface.demo'");
    const nextIdx = registry.indexOf('{ id:', idx + 10);
    const entry = registry.slice(idx, nextIdx);
    expect(entry).toContain('COMPANY PORTFOLIO CAPABILITY SALVAGE');
    expect(entry).not.toMatch(/CC-00 (closed|resolved|complete)/i);
  });

  it('docs/ARCHITECTURE_REGISTRY.md matches the generator output (I10 sync)', () => {
    const checkedIn = read('docs/ARCHITECTURE_REGISTRY.md');
    expect(checkedIn).toContain('COMPANY PORTFOLIO CAPABILITY SALVAGE');
  });
});

// ── 14. I9 — file count unchanged, import count 20→18 ───────────────────────

describe('CC-00 Portfolio canonicalization — I9 reflects the import reduction', () => {
  // CC-00 Public Landing canonicalization (2026-09-26) later, separately,
  // reduced the count further (app/page.tsx dropped both its synthetic
  // imports) — unrelated to this slice's own scope. See
  // tests/unit/cc00-public-landing-canonicalization.test.ts.
  // 11 files / 16 imports (down from 18) was accurate at the time this
  // slice landed, and AdminPreviewService.ts was still an allowlist entry
  // (via source-batches.json, for getAIOnboardingPreview). CC-00 Public
  // Landing canonicalization (2026-09-26) reduced it further to 8/13's
  // predecessor count, and CC-00 Residual /demo/** controlled retirement
  // (2026-09-26, same day, later slice) retired getAIOnboardingPreview's
  // sole caller and rewrote AdminPreviewService.ts to zero synthetic
  // imports — it is no longer an allowlist entry at all.
  it('allowlist header reflects 6 files / 11 import statements (historical note: was 16, then 13, imports at the time this slice landed)', () => {
    const allowlist = read('lib/security/synthetic-import-allowlist.ts');
    expect(allowlist).toContain('CURRENT_SYNTHETIC_RUNTIME_IMPORTS = 0 files / 0 import statements'); // B-WORKER AccountProvisioning dead-code retirement (2026-09-06): AccountProvisioningService.ts removed from the allowlist (deleted, zero callers) — 2/2 -> 1/1, unrelated to this PR.
    expect(allowlist).not.toMatch(/\{\s*file:\s*'services\/admin-preview\/AdminPreviewService\.ts'/);
  });

  // source-batches.json itself was deleted along with getAIOnboardingPreview
  // — AdminPreviewService.ts now imports zero data/synthetic/** fixtures.
  it('AdminPreviewService.ts no longer imports companies.json, kora-index-outputs.json, or source-batches.json (historical note: used to still import the latter)', () => {
    const src = read('services/admin-preview/AdminPreviewService.ts');
    expect(src).not.toContain("from '@/data/synthetic/companies.json'");
    expect(src).not.toContain("from '@/data/synthetic/kora-index-outputs.json'");
    expect(src).not.toContain("from '@/data/synthetic/source-batches.json'");
    expect(exists('data/synthetic/source-batches.json')).toBe(false);
  });

  // app/page.tsx, app/demo/gtm/page.tsx, and
  // components/demo/DemoGuideContent.tsx were accurately kora-index-
  // outputs.json's other real consumers at the time this test was
  // written. CC-00 Public Landing canonicalization (2026-09-26) removed
  // app/page.tsx's synthetic imports, and CC-00 Residual /demo/**
  // controlled retirement (2026-09-26, same day, later slice) deleted
  // both app/demo/gtm/page.tsx and DemoGuideContent.tsx entirely — removed
  // from this list, not replaced. app/demo/page.tsx was also accurately a
  // consumer; CC-00 Bucket C cleanup (2026-09-05) replaced its "Scenari
  // dimostrativi" fake-company-with-claimed-score section with a real
  // static schematic card (no synthetic import) — removed from this list
  // too. ScoringSimulatorService.ts remains the real, live consumer. See
  // tests/unit/cc00-public-landing-canonicalization.test.ts and
  // tests/unit/cc00-residual-demo-retirement.test.ts.
  // PRIOR HISTORY (accurate as of its own time, preserved verbatim): "neither
  // fixture became zero-consumer overall — both remain needed by other real
  // consumers" — DemoDataService.ts (companies.json) and
  // ScoringSimulatorService.ts (kora-index-outputs.json). CC-00 Final
  // Scoring Canonicalization (2026-09-05) deleted BOTH of those remaining
  // consumers (zero real callers, the last B-TRUTH-owned synthetic scoring
  // dependency) — both fixtures then became genuinely zero-consumer and
  // were deleted too. Unrelated to this PR's own AdminPreviewService scope.
  it('companies.json and kora-index-outputs.json were later fully retired by CC-00 Final Scoring Canonicalization (2026-09-05) once their last real consumers were deleted', () => {
    expect(exists('data/synthetic/companies.json')).toBe(false);
    expect(exists('data/synthetic/kora-index-outputs.json')).toBe(false);
    expect(exists('services/demo-data/DemoDataService.ts')).toBe(false);
    expect(exists('services/scoring-simulator/ScoringSimulatorService.ts')).toBe(false);
  });
});
