// tests/unit/b130-reports.test.ts
// B130 — Reports: eliminazione dual-path da /company/reports.
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

describe('B130 Reports — demo page exists and is demo-only', () => {
  const DEMO_PAGE = 'app/demo/company/reports/page.tsx';

  it('app/demo/company/reports/page.tsx exists', () => {
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
  });

  it('demo page has reportGeneratorService', () => {
    const src = readFile(DEMO_PAGE);
    expect(src).toContain('reportGeneratorService');
  });

  it('demo page has reportFactoryService', () => {
    const src = readFile(DEMO_PAGE);
    expect(src).toContain('reportFactoryService');
  });

  it('demo page has koraContributionService', () => {
    const src = readFile(DEMO_PAGE);
    expect(src).toContain('koraContributionService');
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

describe('B130 Reports — live page: no demo service imports', () => {
  const LIVE_PAGE = 'app/company/reports/page.tsx';

  it('live page does not import reportGeneratorService', () => {
    const src = readFile(LIVE_PAGE);
    expect(src).not.toContain('reportGeneratorService');
  });

  it('live page does not import reportFactoryService', () => {
    const src = readFile(LIVE_PAGE);
    expect(src).not.toContain('reportFactoryService');
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

  it('live page does not import useDemoState', () => {
    const src = readFile(LIVE_PAGE);
    expect(src).not.toContain('useDemoState');
  });

  it('live page does not have scoringS1 extra call', () => {
    const src = readFile(LIVE_PAGE);
    expect(src).not.toContain('scoringS1');
  });
});

// ── Group 3: Live page — no dual-path, no meridiana ──────────────────────────

describe('B130 Reports — live page: no dual-path', () => {
  const LIVE_PAGE = 'app/company/reports/page.tsx';

  it('live page does not contain isLive ? (dual-path ternary)', () => {
    const src = readFile(LIVE_PAGE);
    expect(src).not.toContain('isLive ?');
  });

  it('live page does not contain meridiana (case-insensitive)', () => {
    const src = readFile(LIVE_PAGE).toLowerCase();
    expect(src).not.toContain('meridiana');
  });

  it('live page has forceEnvironment: live hardcoded', () => {
    const src = readFile(LIVE_PAGE);
    expect(src).toContain("forceEnvironment: 'live'");
  });

  it('live page has BoundaryBadge mode="LIVE" hardcoded', () => {
    const src = readFile(LIVE_PAGE);
    expect(src).toContain('mode="LIVE"');
  });

  it('live page has BoundaryBanner isLive={true} hardcoded', () => {
    const src = readFile(LIVE_PAGE);
    expect(src).toContain('isLive={true}');
  });

  it('live page uses ComponentBreakdown with live scoring data', () => {
    const src = readFile(LIVE_PAGE);
    expect(src).toContain('ComponentBreakdown');
    expect(src).toContain('output.components');
  });

  it('live page uses ActivationSafeguardPanel with computed safeguard', () => {
    const src = readFile(LIVE_PAGE);
    expect(src).toContain('ActivationSafeguardPanel');
    expect(src).toContain('activationSafeguardService');
  });
});

// ── Group 4: Live page — loading guard position ───────────────────────────────

describe('B130 Reports — live page: loading guard precedes data access', () => {
  it('sessionLoading || loading guard appears before hasKoraData check', () => {
    const src = readFile('app/company/reports/page.tsx');
    const guardIdx   = src.indexOf('sessionLoading || loading');
    const hasKoraIdx = src.indexOf('hasKoraData');
    const outputIdx  = src.indexOf('const output');
    expect(guardIdx).toBeGreaterThan(-1);
    expect(guardIdx).toBeLessThan(hasKoraIdx);
    expect(guardIdx).toBeLessThan(outputIdx);
  });
});

// ── Group 5: Company layout — reports removed from DEMO_DRIVEN_ROUTES ─────────

describe('B130 Reports — company layout: reports removed from DEMO_DRIVEN_ROUTES', () => {
  it('/company/reports is not in DEMO_DRIVEN_ROUTES', () => {
    const src        = readFile('app/company/layout.tsx');
    const blockStart = src.indexOf('DEMO_DRIVEN_ROUTES');
    const blockEnd   = src.indexOf('];', blockStart);
    const block      = src.slice(blockStart, blockEnd);
    // /company/reports/board-pack stays, /company/reports (bare) must be gone
    expect(block).not.toMatch(/['"]\/company\/reports['"]/);
  });
});

// ── Group 6: Demo reachability ─────────────────────────────────────────────────

describe('B130 Reports — demo reachability: /demo/company/reports is linked', () => {
  it('app/demo/page.tsx DEMO_SURFACES includes /demo/company/reports', () => {
    const src = readFile('app/demo/page.tsx');
    expect(src).toContain('/demo/company/reports');
  });

  it('Sidebar Demo · Sintetico group contains /demo/company/reports', () => {
    const src            = readFile('components/layout/Sidebar.tsx');
    const syntheticStart = src.indexOf("heading: 'Demo · Sintetico'");
    const nextHeadingIdx = src.indexOf("heading:", syntheticStart + 1);
    const block          = src.slice(syntheticStart, nextHeadingIdx);
    expect(block).toContain('/demo/company/reports');
  });
});
