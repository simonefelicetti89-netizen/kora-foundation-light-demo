// tests/unit/b130-pillars.test.ts
// B130 — Pillars: eliminazione dual-path da /company/pillars.
// Pure fs.readFileSync structural tests — no runtime required.

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '../..');

function readFile(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), 'utf-8');
}

function fileExists(rel: string): boolean {
  return fs.existsSync(path.join(ROOT, rel));
}

// ── Group 1: Demo page exists and is demo-only ────────────────────────────────

describe('B130 Pillars — demo page exists and is demo-only', () => {
  const DEMO_PAGE = 'app/demo/company/pillars/page.tsx';

  it('app/demo/company/pillars/page.tsx exists', () => {
    expect(fileExists(DEMO_PAGE)).toBe(true);
  });

  it('demo page does not import useCompanySession', () => {
    const src = readFile(DEMO_PAGE);
    expect(src).not.toContain('useCompanySession');
  });

  it('demo page has no isLive ? ternary', () => {
    const src = readFile(DEMO_PAGE);
    expect(src).not.toContain('isLive ?');
    expect(src).not.toContain('const { isLive');
    expect(src).not.toContain('isLive,');
  });

  it('demo page has demo-only services (demoDataService, koraContributionService, accountProvisioningService)', () => {
    const src = readFile(DEMO_PAGE);
    expect(src).toContain('demoDataService');
    expect(src).toContain('koraContributionService');
    expect(src).toContain('accountProvisioningService');
  });

  it('demo page has meridiana-group as fallback', () => {
    const src = readFile(DEMO_PAGE);
    expect(src).toContain("'meridiana-group'");
  });

  it('demo page shows synthetic_demo_data label', () => {
    const src = readFile(DEMO_PAGE);
    expect(src).toContain('synthetic_demo_data');
  });
});

// ── Group 2: Live page — no demo service imports ──────────────────────────────

describe('B130 Pillars — live page: no demo service imports', () => {
  const LIVE_PAGE = 'app/company/pillars/page.tsx';

  it('live page does not import demoDataService', () => {
    const src = readFile(LIVE_PAGE);
    expect(src).not.toContain('demoDataService');
  });

  it('live page does not import koraContributionService', () => {
    const src = readFile(LIVE_PAGE);
    expect(src).not.toContain('koraContributionService');
  });

  it('live page does not import accountProvisioningService', () => {
    const src = readFile(LIVE_PAGE);
    expect(src).not.toContain('accountProvisioningService');
  });

  it('live page does not import tenantService', () => {
    const src = readFile(LIVE_PAGE);
    expect(src).not.toContain('tenantService');
  });

  it('live page does not import useRole or useScenario from demo-state', () => {
    const src = readFile(LIVE_PAGE);
    expect(src).not.toContain("from '@/lib/demo-state'");
  });

  it('live page does not contain programs or initiatives demo data variables', () => {
    const src = readFile(LIVE_PAGE);
    expect(src).not.toContain('const programs');
    expect(src).not.toContain('const initiatives');
    expect(src).not.toContain('getPrograms');
    expect(src).not.toContain('getCollectiveInitiatives');
  });
});

// ── Group 3: Live page — no dual-path, no meridiana ──────────────────────────

describe('B130 Pillars — live page: no dual-path', () => {
  const LIVE_PAGE = 'app/company/pillars/page.tsx';

  it('live page does not contain isLive ? (dual-path ternary)', () => {
    const src = readFile(LIVE_PAGE);
    expect(src).not.toContain('isLive ?');
  });

  it('live page does not contain meridiana (case-insensitive)', () => {
    const src = readFile(LIVE_PAGE).toLowerCase();
    expect(src).not.toContain('meridiana');
  });

  it('live page has no BoundaryBanner, BoundaryBadge or forceEnvironment residues (B147 P1)', () => {
    // B147 P1: dual-path-era components removed. Server layout is the only required guard.
    const src = readFile(LIVE_PAGE);
    expect(src).not.toContain('BoundaryBanner');
    expect(src).not.toContain('BoundaryBadge');
    expect(src).not.toContain('isLive={true}');
    expect(src).not.toContain("forceEnvironment: 'live'");
  });
});

// ── Group 4: Live page — loading guard position ───────────────────────────────

describe('B130 Pillars — live page: loading guard precedes data access', () => {
  it('sessionLoading || loading guard appears before hasKoraData check', () => {
    const src = readFile('app/company/pillars/page.tsx');
    const guardIdx     = src.indexOf('sessionLoading || loading');
    const hasKoraIdx   = src.indexOf('hasKoraData');
    const aggregateIdx = src.indexOf('const aggregate');
    expect(guardIdx).toBeGreaterThan(-1);
    expect(guardIdx).toBeLessThan(hasKoraIdx);
    expect(guardIdx).toBeLessThan(aggregateIdx);
  });
});

// ── Group 5: Company layout — pillars removed from DEMO_DRIVEN_ROUTES ─────────

describe('B130 Pillars — company layout: pillars removed from DEMO_DRIVEN_ROUTES', () => {
  it('/company/pillars is not in DEMO_DRIVEN_ROUTES', () => {
    const src        = readFile('app/company/layout.tsx');
    const blockStart = src.indexOf('DEMO_DRIVEN_ROUTES');
    const blockEnd   = src.indexOf('];', blockStart);
    const block      = src.slice(blockStart, blockEnd);
    expect(block).not.toContain('/company/pillars');
  });
});

// ── Group 6: Demo reachability ─────────────────────────────────────────────────

describe('B130 Pillars — demo reachability: /demo/company/pillars is linked', () => {
  it('app/demo/page.tsx DEMO_SURFACES includes /demo/company/pillars', () => {
    const src = readFile('app/demo/page.tsx');
    expect(src).toContain('/demo/company/pillars');
  });

  it('Sidebar Demo · Sintetico group contains /demo/company/pillars', () => {
    const src            = readFile('components/layout/Sidebar.tsx');
    const syntheticStart = src.indexOf("heading: 'Demo · Sintetico'");
    const nextHeadingIdx = src.indexOf("heading:", syntheticStart + 1);
    const block          = src.slice(syntheticStart, nextHeadingIdx);
    expect(block).toContain('/demo/company/pillars');
  });
});
