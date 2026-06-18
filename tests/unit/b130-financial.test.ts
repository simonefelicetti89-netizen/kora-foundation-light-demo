// tests/unit/b130-financial.test.ts
// B130 — Financial: eliminazione dual-path da /company/financial.
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

describe('B171 — demo/company/financial rimossa (RIDONDANTE)', () => {
  it('app/demo/company/financial/page.tsx non esiste più (B171)', () => {
    expect(fileExists('app/demo/company/financial/page.tsx')).toBe(false);
  });

  it('la rotta canonica /company/financial esiste ancora', () => {
    expect(fileExists('app/company/financial/page.tsx')).toBe(true);
  });
});

// ── Group 2: Live page — no demo service imports ──────────────────────────────

describe('B130 Financial — live page: no demo service imports', () => {
  const LIVE_PAGE = 'app/company/financial/page.tsx';

  it('live page does not import financialGovernanceService', () => {
    const src = readFile(LIVE_PAGE);
    expect(src).not.toContain('financialGovernanceService');
  });

  it('live page does not import budgetToHumanImpactService', () => {
    const src = readFile(LIVE_PAGE);
    expect(src).not.toContain('budgetToHumanImpactService');
  });

  it('live page does not import btiIntelligenceService', () => {
    const src = readFile(LIVE_PAGE);
    expect(src).not.toContain('btiIntelligenceService');
  });

  it('live page does not import careEconomyIntelligenceService', () => {
    const src = readFile(LIVE_PAGE);
    expect(src).not.toContain('careEconomyIntelligenceService');
  });

  it('live page does not import accountProvisioningService', () => {
    const src = readFile(LIVE_PAGE);
    expect(src).not.toContain('accountProvisioningService');
  });

  it('live page does not import tenantService', () => {
    const src = readFile(LIVE_PAGE);
    expect(src).not.toContain('tenantService');
  });

  it('live page does not import useRole or useScenario', () => {
    const src = readFile(LIVE_PAGE);
    expect(src).not.toContain('useRole');
    expect(src).not.toContain('useScenario');
  });

  it('live page does not reference activeScenario', () => {
    const src = readFile(LIVE_PAGE);
    expect(src).not.toContain('activeScenario');
  });
});

// ── Group 3: Live page — no dual-path, no meridiana ──────────────────────────

describe('B130 Financial — live page: no dual-path', () => {
  const LIVE_PAGE = 'app/company/financial/page.tsx';

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

  it('live page shows BTI score from macroblocks', () => {
    const src = readFile(LIVE_PAGE);
    expect(src).toContain("m.code === 'BTI'");
  });

  it('live page has NoDataState fallback', () => {
    const src = readFile(LIVE_PAGE);
    expect(src).toContain('NoDataState');
  });
});

// ── Group 4: Live page — loading guard position ───────────────────────────────

describe('B130 Financial — live page: loading guard precedes data access', () => {
  it('sessionLoading || loading guard appears before hasKoraData check', () => {
    const src = readFile('app/company/financial/page.tsx');
    const guardIdx   = src.indexOf('sessionLoading || loading');
    const hasKoraIdx = src.indexOf('hasKoraData');
    const koraIdxSrc = src.indexOf('const koraIndex');
    expect(guardIdx).toBeGreaterThan(-1);
    expect(guardIdx).toBeLessThan(hasKoraIdx);
    expect(guardIdx).toBeLessThan(koraIdxSrc);
  });
});

// ── Group 5: Company layout — financial removed from DEMO_DRIVEN_ROUTES ───────

describe('B130 Financial — company layout: financial removed from DEMO_DRIVEN_ROUTES', () => {
  it('/company/financial is not in DEMO_DRIVEN_ROUTES', () => {
    const src        = readFile('app/company/layout.tsx');
    const blockStart = src.indexOf('DEMO_DRIVEN_ROUTES');
    const blockEnd   = src.indexOf('];', blockStart);
    const block      = src.slice(blockStart, blockEnd);
    expect(block).not.toMatch(/['"]\/company\/financial['"]/);
  });
});

// ── Group 6: Demo reachability ─────────────────────────────────────────────────

describe('B171 — demo reachability: Financial accessibile via /company/financial', () => {
  it('app/demo/page.tsx intelligence section include /company/financial (canonical)', () => {
    const src = readFile('app/demo/page.tsx');
    expect(src).toContain('/company/financial');
  });

  it('Demo Lab (admin-nav-groups) non contiene /demo/company/financial', () => {
    const navGroupsSrc = readFile('lib/navigation/admin-nav-groups.ts');
    expect(navGroupsSrc).not.toContain('/demo/company/financial');
  });
});
