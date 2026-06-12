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

// ── Task 1: /admin/companies in Live Operations ───────────────────────────────

describe('B82-B Task 1 — /admin/companies classified as LIVE', () => {
  const sidebar = read('components/layout/Sidebar.tsx');

  it('Live Operations group contains /admin/companies', () => {
    // heading comes before the item
    const liveIdx = sidebar.indexOf("heading: 'Live Operations'");
    const companiesIdx = sidebar.indexOf("href: '/admin/companies'");
    expect(liveIdx).toBeGreaterThan(-1);
    expect(companiesIdx).toBeGreaterThan(-1);
    // companies href must appear after Live Operations heading
    expect(companiesIdx).toBeGreaterThan(liveIdx);
  });

  it('/admin/companies does NOT appear before Demo group', () => {
    const demoIdx = sidebar.indexOf("heading: 'Demo · Sintetico'");
    const companiesIdx = sidebar.indexOf("href: '/admin/companies'");
    // companies must be before the demo group heading
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

describe('B82-B Task 3 — Demo group renamed to Demo · Sintetico', () => {
  const sidebar = read('components/layout/Sidebar.tsx');

  it('has Demo · Sintetico group heading', () => {
    expect(sidebar).toContain("Demo · Sintetico");
  });

  it('no longer has plain Demo Preview heading', () => {
    expect(sidebar).not.toContain("heading: 'Demo Preview'");
  });
});

// ── Task 4: Orphaned routes restored ─────────────────────────────────────────

describe('B82-B Task 4 — Orphaned routes restored in navigation', () => {
  const sidebar = read('components/layout/Sidebar.tsx');

  it('Live Operations includes /admin/company-live-preview', () => {
    expect(sidebar).toContain("href: '/admin/company-live-preview'");
    expect(sidebar).toContain('Anteprima Live Cockpit');
  });

  it('Demo · Sintetico includes /admin/index-registry', () => {
    expect(sidebar).toContain("href: '/demo/index-registry'");
  });

  it('Demo · Sintetico includes /admin/portfolio', () => {
    expect(sidebar).toContain("href: '/demo/portfolio'");
  });
});

// ── Task 5: DEMO pages have BoundaryBadge ────────────────────────────────────

describe('B82-B Task 5 — DEMO admin pages have DEMO BoundaryBadge', () => {
  const demoPages: [string, string][] = [
    ['app/demo/network/page.tsx', 'network'],
    ['app/admin/operator/_components/OperatorConsole.tsx', 'operator'],
    ['app/demo/ai-onboarding/page.tsx', 'ai-onboarding'],
    ['app/demo/gtm/page.tsx', 'gtm'],
    ['app/demo/benchmarks/page.tsx', 'benchmarks'],
    ['app/demo/index-registry/page.tsx', 'index-registry'],
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
    ['app/admin/company-live-preview/_components/CompanyLivePreviewPanel.tsx', 'company-live-preview'],
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

describe('B82-B Task 7 — Admin landing section labels expose provenance', () => {
  const landing = read('app/admin/page.tsx');

  it('Company Readiness Matrix section has DEMO badge mode', () => {
    expect(landing).toContain("badgeMode=\"DEMO\"");
  });

  it('Intelligence operativa section has DEMO label', () => {
    const idx = landing.indexOf('Intelligence operativa');
    expect(idx).toBeGreaterThan(-1);
    // badgeMode appears nearby
    const segment = landing.slice(idx - 20, idx + 80);
    expect(segment).toMatch(/badgeMode|DEMO/);
  });

  it('GTM Founder Cockpit section has DEMO badge mode', () => {
    expect(landing).toContain('GTM Founder Cockpit');
    // SectionHead badgeMode="DEMO" must appear for GTM
    const gtmIdx = landing.indexOf("label=\"GTM Founder Cockpit\"");
    expect(gtmIdx).toBeGreaterThan(-1);
    const segment = landing.slice(gtmIdx, gtmIdx + 60);
    expect(segment).toContain('badgeMode="DEMO"');
  });

  it('LIVE PLATFORM section exists on admin landing', () => {
    expect(landing).toContain('Piattaforma Live');
    expect(landing).toContain('mode="LIVE"');
  });
});

// ── Task 8: Priority Queue disclaimer ────────────────────────────────────────

describe('B82-B Task 8 — Priority Queue disclaimer rendered', () => {
  const landing = read('app/admin/page.tsx');

  it('shows "Anteprima sintetica — non operativa" disclaimer', () => {
    expect(landing).toContain('Anteprima sintetica');
    expect(landing).toContain('non operativa');
  });

  it('priority queue section has DEMO label', () => {
    expect(landing).toContain('Coda priorità');
    // DEMO badge appears near priority queue
    const queueIdx = landing.indexOf('Coda priorità');
    const segment = landing.slice(queueIdx, queueIdx + 400);
    expect(segment).toContain('DEMO');
  });
});

// ── Task 9: Intelligence Grid panels have DEMO provenance ────────────────────

describe('B82-B Task 9 — Intelligence Grid panels expose DEMO provenance', () => {
  const landing = read('app/admin/page.tsx');

  it('KORA Index Registry panel has DEMO label', () => {
    expect(landing).toContain('badgeLabel="DEMO · dati sintetici"');
  });

  it('Advisor Network panel has DEMO label', () => {
    expect(landing).toContain('title="Advisor Network"');
    // The Panel component invocation for Advisor Network must carry badgeLabel
    const panelStr = 'title="Advisor Network"';
    const idx = landing.indexOf(panelStr);
    expect(idx).toBeGreaterThan(-1);
    const segment = landing.slice(idx, idx + 120);
    expect(segment).toContain('badgeLabel');
  });

  it('Platform Analytics panel has DEMO label', () => {
    const panelStr = 'title="Platform Analytics"';
    const idx = landing.indexOf(panelStr);
    expect(idx).toBeGreaterThan(-1);
    const segment = landing.slice(idx, idx + 120);
    expect(segment).toContain('badgeLabel');
  });

  it('Partner Network panel has DEMO label', () => {
    const panelStr = 'title="Partner Network"';
    const idx = landing.indexOf(panelStr);
    expect(idx).toBeGreaterThan(-1);
    const segment = landing.slice(idx, idx + 120);
    expect(segment).toContain('badgeLabel');
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
    expect(src).toContain('AR');
    expect(src).toContain('MAR');
    expect(src).toContain('NI');
    expect(src).toContain('WB');
    expect(src).toContain('PC');
    expect(src).toContain('PB');
    expect(src).toContain('EQ');
    expect(src).toContain('VR');
    expect(src).toContain('CO');
    expect(src).toContain('CS');
    // still exactly 10 items in the canonical array
    expect(src).toContain("KORA_INDEX_COMPONENTS = ['AR', 'MAR', 'NI', 'WB', 'PC', 'PB', 'EQ', 'VR', 'CO', 'CS']");
  });
});
