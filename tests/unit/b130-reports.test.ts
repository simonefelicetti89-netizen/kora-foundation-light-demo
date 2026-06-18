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

describe('B171 — demo/company/reports rimossa (RIDONDANTE)', () => {
  it('app/demo/company/reports/page.tsx non esiste più (B171)', () => {
    expect(fileExists('app/demo/company/reports/page.tsx')).toBe(false);
  });

  it('la rotta canonica /company/reports esiste ancora', () => {
    expect(fileExists('app/company/reports/page.tsx')).toBe(true);
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

  it('live page has no BoundaryBanner, BoundaryBadge or forceEnvironment residues (B147 P1)', () => {
    // B147 P1: dual-path-era components removed. Server layout is the only required guard.
    const src = readFile(LIVE_PAGE);
    expect(src).not.toContain('BoundaryBanner');
    expect(src).not.toContain('BoundaryBadge');
    expect(src).not.toContain('isLive={true}');
    expect(src).not.toContain("forceEnvironment: 'live'");
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

describe('B171 — demo reachability: Reports accessibile via /company/reports', () => {
  it('app/demo/page.tsx intelligence section include /company/reports (canonical)', () => {
    const src = readFile('app/demo/page.tsx');
    expect(src).toContain('/company/reports');
  });

  it('Demo Lab (admin-nav-groups) non contiene /demo/company/reports', () => {
    const navGroupsSrc = readFile('lib/navigation/admin-nav-groups.ts');
    expect(navGroupsSrc).not.toContain('/demo/company/reports');
  });
});
