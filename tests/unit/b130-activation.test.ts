// tests/unit/b130-activation.test.ts
// B130 — Activation: eliminazione dual-path da /company/activation.
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

describe('B130 Activation — demo page exists and is demo-only', () => {
  const DEMO_PAGE = 'app/demo/company/activation/page.tsx';

  it('app/demo/company/activation/page.tsx exists', () => {
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

  it('demo page has demo-only services (explainabilityService, accountProvisioningService)', () => {
    const src = readFile(DEMO_PAGE);
    expect(src).toContain('explainabilityService');
    expect(src).toContain('accountProvisioningService');
  });

  it('demo page has meridiana-group as fallback', () => {
    const src = readFile(DEMO_PAGE);
    expect(src).toContain("'meridiana-group'");
  });
});

// ── Group 2: Live page — no demo service imports ──────────────────────────────

describe('B130 Activation — live page: no demo service imports', () => {
  const LIVE_PAGE = 'app/company/activation/page.tsx';

  it('live page does not import explainabilityService', () => {
    const src = readFile(LIVE_PAGE);
    expect(src).not.toContain('explainabilityService');
  });

  it('live page does not import accountProvisioningService', () => {
    const src = readFile(LIVE_PAGE);
    expect(src).not.toContain('accountProvisioningService');
  });

  it('live page does not import useRole or useScenario from demo-state', () => {
    const src = readFile(LIVE_PAGE);
    expect(src).not.toContain("from '@/lib/demo-state'");
  });

  it('live page does not contain isS2 or hardcoded debtConcentration', () => {
    const src = readFile(LIVE_PAGE);
    expect(src).not.toContain('isS2');
    expect(src).not.toContain('debtConcentration');
    expect(src).not.toContain('pillarDebt');
    expect(src).not.toContain('siteActivation');
    expect(src).not.toContain('partnerSuggestions');
    expect(src).not.toContain('nextActions');
  });
});

// ── Group 3: Live page — no dual-path, no meridiana ──────────────────────────

describe('B130 Activation — live page: no dual-path', () => {
  const LIVE_PAGE = 'app/company/activation/page.tsx';

  it('live page does not contain isLive ? (dual-path ternary)', () => {
    const src = readFile(LIVE_PAGE);
    expect(src).not.toContain('isLive ?');
  });

  it('live page does not contain meridiana (case-insensitive)', () => {
    const src = readFile(LIVE_PAGE).toLowerCase();
    expect(src).not.toContain('meridiana');
  });

  it('live page has no BoundaryBanner or BoundaryBadge residues (B147 P1: dual-path era removed)', () => {
    // B147 P1: BoundaryBanner isLive={true} and BoundaryBadge mode="LIVE" were
    // dual-path-era components signalling live/demo mode. Now the page is live-only
    // (server layout enforces requireCompanyUser) — these signals are redundant.
    const src = readFile(LIVE_PAGE);
    expect(src).not.toContain('BoundaryBanner');
    expect(src).not.toContain('isLive={true}');
    expect(src).not.toContain("forceEnvironment: 'live'");
  });
});

// ── Group 4: Live page — loading guard position ───────────────────────────────

describe('B130 Activation — live page: loading guard precedes data access', () => {
  it('sessionLoading || loading guard appears before hasKoraData check', () => {
    const src = readFile('app/company/activation/page.tsx');
    const guardIdx      = src.indexOf('sessionLoading || loading');
    const hasKoraIdx    = src.indexOf('hasKoraData');
    const aggregateIdx  = src.indexOf('const aggregate');
    expect(guardIdx).toBeGreaterThan(-1);
    expect(guardIdx).toBeLessThan(hasKoraIdx);
    expect(guardIdx).toBeLessThan(aggregateIdx);
  });
});

// ── Group 5: Company layout — activation removed from DEMO_DRIVEN_ROUTES ──────

describe('B130 Activation — company layout: activation removed from DEMO_DRIVEN_ROUTES', () => {
  it('/company/activation is not in DEMO_DRIVEN_ROUTES', () => {
    const src        = readFile('app/company/layout.tsx');
    const blockStart = src.indexOf('DEMO_DRIVEN_ROUTES');
    const blockEnd   = src.indexOf('];', blockStart);
    const block      = src.slice(blockStart, blockEnd);
    expect(block).not.toContain('/company/activation');
  });
});

// ── Group 6: Demo reachability ─────────────────────────────────────────────────

describe('B130 Activation — demo reachability: /demo/company/activation is linked', () => {
  it('app/demo/page.tsx DEMO_SURFACES includes /demo/company/activation', () => {
    const src = readFile('app/demo/page.tsx');
    expect(src).toContain('/demo/company/activation');
  });

  it('Demo Lab (admin-nav-groups) does NOT contain /demo/company/activation (RIDONDANTE — removed B169 FASE 4)', () => {
    const navGroupsSrc = readFile('lib/navigation/admin-nav-groups.ts');
    expect(navGroupsSrc).not.toContain('/demo/company/activation');
  });
});
