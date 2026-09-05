import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

// ── B82-B — Admin Operational Clarity: unit tests ────────────────────────────
//
// Task 1: /admin/companies classified as LIVE in sidebar
// Task 2: Meridiana sidebar link removed
// Task 3: Demo group renamed to "Demo · Sintetico"
// Task 4: Orphaned routes restored (company-live-preview, index-registry, portfolio)
// Task 5: DEMO pages have BoundaryBadge (network, operator, ai-onboarding, gtm, benchmarks, index-registry)
// Task 6: LIVE pages have BoundaryBadge (company-live-preview, company console)
// Task 7: Admin landing section labels expose provenance
// Task 8: Priority Queue disclaimer rendered
// Task 9: Intelligence Grid panels have DEMO provenance labels
// Task 10: Admin landing has structural LIVE / DEMO separation
//
// Invariants:
// - no scoring changes
// - no methodology changes
// - no DB changes
// - no auth changes
// - no worker changes

function read(rel: string) {
  return fs.readFileSync(path.resolve(__dirname, '../..', rel), 'utf-8');
}

// ── Task 1: /admin/companies in Companies group ───────────────────────────────
// B169 FASE 3: admin group data moved from Sidebar.tsx to lib/navigation/admin-nav-groups.ts.

describe('B82-B Task 1 — /admin/companies classified as LIVE', () => {
  const adminNavGroups = read('lib/navigation/admin-nav-groups.ts');

  it('Companies group contains /admin/companies', () => {
    const companiesGroupIdx = adminNavGroups.indexOf("label: 'Companies'");
    const companiesHrefIdx  = adminNavGroups.indexOf("href: '/admin/companies'");
    expect(companiesGroupIdx).toBeGreaterThan(-1);
    expect(companiesHrefIdx).toBeGreaterThan(-1);
    expect(companiesHrefIdx).toBeGreaterThan(companiesGroupIdx);
  });

  it('/admin/companies does NOT appear before Demo Lab group', () => {
    const demoIdx      = adminNavGroups.indexOf("'Demo Lab'");
    const companiesIdx = adminNavGroups.indexOf("href: '/admin/companies'");
    expect(companiesIdx).toBeGreaterThan(-1);
    expect(demoIdx).toBeGreaterThan(-1);
    expect(companiesIdx).toBeLessThan(demoIdx);
  });
});

// ── Task 2: Meridiana exit link removed ──────────────────────────────────────

describe('B82-B Task 2 — Meridiana sidebar link removed', () => {
  const sidebar = read('components/layout/Sidebar.tsx');

  it('does not contain Meridiana Demo link to /company', () => {
    expect(sidebar).not.toContain("label: 'Meridiana Demo'");
  });

  it('does not contain /company as a standalone admin nav item', () => {
    // /company as part of /company-... is fine; we check for exact exit link
    expect(sidebar).not.toContain("href: '/company',             label: 'Meridiana Demo'");
  });
});

// ── Task 3: Demo group renamed ────────────────────────────────────────────────
// B169 FASE 3: renamed from "Demo & Preview" to "Demo Lab" with SYNTHETIC environmentTag.

describe('B82-B Task 3 — Demo group renamed to Demo Lab (B169 FASE 3)', () => {
  const adminNavGroups = read('lib/navigation/admin-nav-groups.ts');

  it('admin-nav-groups has Demo Lab group label', () => {
    expect(adminNavGroups).toContain("'Demo Lab'");
  });

  it('admin-nav-groups no longer has Demo & Preview or Demo Preview labels', () => {
    expect(adminNavGroups).not.toContain("Demo & Preview");
    expect(adminNavGroups).not.toContain("Demo Preview");
  });
});

// ── Task 4: Demo Lab routes ───────────────────────────────────────────────────
// B169 FASE 4: Anteprima Live Cockpit redirect removed (RIDONDANTE).
// index-registry and portfolio kept — unique content not accessible via VISTA+nav.

describe('B82-B Task 4 — Demo Lab routes in navigation (B169 FASE 4)', () => {
  const adminNavGroups = read('lib/navigation/admin-nav-groups.ts');

  it('Anteprima Live Cockpit redirect removed from sidebar (RIDONDANTE — B169 FASE 4)', () => {
    expect(adminNavGroups).not.toContain("href: '/admin/companies?from=preview'");
    expect(adminNavGroups).not.toContain('Anteprima Live Cockpit');
  });

  // /demo/index-registry was accurately in the Demo Lab nav group as of
  // B169 FASE 4. CC-00 Index Registry canonicalization (2026-09-06) later,
  // separately, retired the entire route and removed its nav entry — its
  // real value moved into app/admin/page.tsx's own Intelligence Grid panel.
  it('Demo Lab no longer includes /demo/index-registry (historical note, not a live assertion)', () => {
    expect(adminNavGroups).not.toContain("href: '/demo/index-registry'");
  });

  // /demo/portfolio was accurately in the Demo Lab nav group as of this
  // test's writing. CC-00 Company Portfolio capability salvage +
  // canonicalization (2026-09-12) later, separately, retired the entire
  // route and removed its nav entry — its real value moved into
  // app/admin/companies/page.tsx (already-existing Company Console).
  it('Demo Lab no longer includes /demo/portfolio (historical note, not a live assertion)', () => {
    expect(adminNavGroups).not.toContain("href: '/demo/portfolio'");
  });
});

// ── Task 5: DEMO pages have BoundaryBadge ────────────────────────────────────

describe('B82-B Task 5 — DEMO admin pages have DEMO BoundaryBadge', () => {
  // app/demo/network/page.tsx, app/demo/ai-onboarding/page.tsx,
  // app/demo/gtm/page.tsx, and app/demo/benchmarks/page.tsx were all
  // accurately in this list as of this test's writing. CC-00 Residual
  // /demo/** controlled retirement (2026-09-26) retired every one of
  // them — removed from this list, not replaced (there is no page left to
  // check).
  const demoPages: [string, string][] = [
    ['app/admin/operator/_components/OperatorConsole.tsx', 'operator'],
    // app/demo/index-registry/page.tsx was accurately in this list as of
    // this test's writing. CC-00 Index Registry canonicalization
    // (2026-09-06) retired the route entirely — removed from this list,
    // not replaced (there is no page left to check).
  ];

  for (const [filePath, name] of demoPages) {
    it(`${name} imports BoundaryBadge`, () => {
      const src = read(filePath);
      expect(src).toContain('BoundaryBadge');
    });

    it(`${name} renders DEMO mode badge`, () => {
      const src = read(filePath);
      expect(src).toContain('mode="DEMO"');
    });
  }
});

// ── Task 6: LIVE pages have BoundaryBadge ────────────────────────────────────

describe('B82-B Task 6 — LIVE admin pages have LIVE BoundaryBadge', () => {
  const livePages: [string, string][] = [
    ['components/admin/CompanyLivePreviewPanel.tsx', 'company-live-preview'],
    ['app/admin/companies/_components/CompanyConsolePanel.tsx', 'company-console'],
  ];

  for (const [filePath, name] of livePages) {
    it(`${name} imports BoundaryBadge`, () => {
      const src = read(filePath);
      expect(src).toContain('BoundaryBadge');
    });

    it(`${name} renders LIVE mode badge`, () => {
      const src = read(filePath);
      expect(src).toContain('mode="LIVE"');
    });
  }
});

// ── Task 7: Admin landing section labels have provenance ─────────────────────
//
// CC-00 Admin Console panel-by-panel canonicalization (2026-09-19) removed
// every remaining synthetic-data panel from Admin Home ("No panel survives
// merely because it exists today") — Company Readiness Matrix (already LIVE
// since CC-00 Portfolio canonicalization), Intelligence Grid, and Priority
// Queue are now 100% canonical; GTM Founder Cockpit and Billing & Revenue
// were removed outright (redundant with the real app/admin/founder-validation
// tool, and zero product authority, respectively). Zero `badgeMode="DEMO"`
// remains anywhere on Admin Home as of this slice. See
// tests/unit/cc00-admin-console-canonicalization.test.ts for the current,
// correct state.

describe('B82-B Task 7 — Admin landing section labels expose provenance (historical: was DEMO, now LIVE/canonical)', () => {
  const landing = read('app/admin/page.tsx');

  it('Company Readiness Matrix section has LIVE badge mode (historical note: was DEMO)', () => {
    expect(landing).toContain('label="Company Readiness Matrix" badgeMode="LIVE"');
  });

  it('Intelligence operativa section has LIVE label (historical note: was DEMO)', () => {
    const idx = landing.indexOf('Intelligence operativa');
    expect(idx).toBeGreaterThan(-1);
    const segment = landing.slice(idx - 20, idx + 80);
    expect(segment).toContain('badgeMode="LIVE"');
  });

  it('GTM Founder Cockpit section no longer exists (historical note, not a live assertion)', () => {
    expect(landing).not.toContain('GTM Founder Cockpit');
  });

  it('LIVE PLATFORM section exists on admin landing', () => {
    expect(landing).toContain('Piattaforma Live');
    expect(landing).toContain('mode="LIVE"');
  });
});

// ── Task 8: Priority Queue is now LIVE, not a synthetic preview ─────────────

describe('B82-B Task 8 — Priority Queue is LIVE (historical note: used to show a synthetic-preview disclaimer)', () => {
  const landing = read('app/admin/page.tsx');

  it('no longer shows "Anteprima sintetica — non operativa" — every remaining signal is canonical', () => {
    expect(landing).not.toContain('Anteprima sintetica — non operativa');
    expect(landing).toContain('Coda priorità');
    const queueIdx = landing.indexOf('Coda priorità');
    const segment = landing.slice(queueIdx, queueIdx + 400);
    expect(segment).toContain('LIVE');
    expect(segment).not.toContain('DEMO');
  });
});

// ── Task 9: Intelligence Grid panels — only 2 remain, both canonical ────────

describe('B82-B Task 9 — Intelligence Grid panels (historical note: 4 panels, 2 DEMO; now 2 panels, both canonical)', () => {
  const landing = read('app/admin/page.tsx');

  it('KORA Index Registry panel carries no DEMO badge (it is canonical)', () => {
    const idx = landing.indexOf('title="KORA Index™ Registry"');
    expect(idx).toBeGreaterThan(-1);
    const segment = landing.slice(idx, idx + 60);
    expect(segment).not.toContain('badgeLabel');
  });

  it('Advisor Network panel no longer exists (historical note: removed, no canonical advisor model exists)', () => {
    expect(landing).not.toContain('title="Advisor Network"');
  });

  it('Platform Analytics panel carries no DEMO badge (historical note: was mislabeled DEMO despite being canonical since Phase 1)', () => {
    const panelStr = 'title="Platform Analytics"';
    const idx = landing.indexOf(panelStr);
    expect(idx).toBeGreaterThan(-1);
    const segment = landing.slice(idx, idx + 60);
    expect(segment).not.toContain('badgeLabel');
  });

  it('Partner Network panel no longer exists (historical note: removed, no canonical evidence-protocol/active-programs model exists)', () => {
    expect(landing).not.toContain('title="Partner Network"');
  });
});

// ── Task 10: Structural LIVE / DEMO separation ───────────────────────────────

describe('B82-B Task 10 — Structural LIVE / DEMO separation on admin landing', () => {
  const landing = read('app/admin/page.tsx');

  it('LIVE PLATFORM block appears before demo content', () => {
    const liveIdx = landing.indexOf('Piattaforma Live');
    const demoIdx = landing.indexOf('SECTION 1: COMMAND HERO');
    expect(liveIdx).toBeGreaterThan(-1);
    expect(demoIdx).toBeGreaterThan(-1);
    expect(liveIdx).toBeLessThan(demoIdx);
  });

  it('demo separator block is present between LIVE and DEMO sections', () => {
    expect(landing).toContain('DEMO · SINTETICO SEPARATOR');
  });

  it('admin landing links to Company Console LIVE', () => {
    expect(landing).toContain('/admin/companies');
    expect(landing).toContain('Company Console · LIVE');
  });

  it('admin landing links to Anteprima Live Cockpit', () => {
    expect(landing).toContain('/admin/company-live-preview');
    expect(landing).toContain('Anteprima Live Cockpit · LIVE');
  });
});

// ── Invariants: no forbidden changes ─────────────────────────────────────────

describe('B82-B invariants — no forbidden changes', () => {
  it('sidebar contains no scoring logic or direct DB queries', () => {
    const src = read('components/layout/Sidebar.tsx');
    expect(src).not.toContain('computeScore');
    expect(src).not.toContain('IU_');
    // B117-G: Supabase browser client is allowed for session detection (real role → admin preview mode).
    // The check is that no direct DB queries appear, not that Supabase is absent entirely.
    expect(src).not.toContain(".from('");
    expect(src).not.toContain('.select(');
  });

  it('admin landing contains no SQL or Prisma artifacts', () => {
    const src = read('app/admin/page.tsx');
    expect(src).not.toContain('prisma');
    expect(src).not.toContain('CREATE TABLE');
    expect(src).not.toContain("from '@/lib/supabase'");
  });

  it('admin landing contains no worker individual data', () => {
    const src = read('app/admin/page.tsx');
    expect(src).not.toContain('workers.json');
    expect(src).not.toContain('pib-records');
  });

  it('methodology-config is not modified', () => {
    const src = read('lib/methodology-config/v0.1.ts');
    // weights must still be present, not deleted
    expect(src).toContain('getMacroblockWeights');
  });

  it('KORA Index still has 10 components — no additions', () => {
    const src = read('lib/constants/kora.ts');
    // Sprint 1 v2.0 component codes: NI→EVQ, VR→INT, CO→CONT, WB→EQW, EQ→EQS
    expect(src).toContain('AR');
    expect(src).toContain('MAR');
    expect(src).toContain('EVQ');
    expect(src).toContain('EQW');
    expect(src).toContain('PC');
    expect(src).toContain('PB');
    expect(src).toContain('EQS');
    expect(src).toContain('INT');
    expect(src).toContain('CONT');
    expect(src).toContain('CS');
    // still exactly 10 items in the canonical array
    expect(src).toContain("KORA_INDEX_COMPONENTS = ['AR', 'MAR', 'EVQ', 'INT', 'CONT', 'EQW', 'EQS', 'PC', 'PB', 'CS']");
  });
});
