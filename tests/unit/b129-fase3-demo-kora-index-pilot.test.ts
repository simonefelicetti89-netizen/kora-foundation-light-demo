// tests/unit/b129-fase3-demo-kora-index-pilot.test.ts
// B129 Fase 3 STEP PILOTA: eliminazione dual-path da /company/kora-index.
// Pure fs.readFileSync structural tests — no runtime required.
//
// Groups:
//   1. Demo page exists and is demo-only (4 tests)
//   2. Live page: no demo imports (7 tests)
//   3. Live page: no isLive ternary + no meridiana (2 tests)
//   4. Live page: loading guard precedes any data access (1 test)
//   5. Company layout: /company/kora-index removed from DEMO_DRIVEN_ROUTES (1 test)
//   6. Demo guide: no /company/kora-index links (2 tests)
//   7. Demo reachability: KORA Index accessible from demo surfaces (2 tests)
//   8. Sidebar: KORA Index™ Demo in admin Demo & Preview group (1 test)

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

// ── Group 1: Demo page RIMOSSA (B171 cleanup) ────────────────────────────────

describe('B171 — demo/company/kora-index rimossa (RIDONDANTE)', () => {
  it('app/demo/company/kora-index/page.tsx non esiste più (B171)', () => {
    expect(fileExists('app/demo/company/kora-index/page.tsx')).toBe(false);
  });

  it('la rotta canonica /company/kora-index esiste ancora', () => {
    expect(fileExists('app/company/kora-index/page.tsx')).toBe(true);
  });
});

// ── Group 2: Live page — no demo service imports ──────────────────────────────

describe('B129 Fase 3 — live page: no demo service imports', () => {
  const LIVE_PAGE = 'app/company/kora-index/page.tsx';

  it('live page does not import useDemoState', () => {
    const src = readFile(LIVE_PAGE);
    expect(src).not.toContain('useDemoState');
  });

  it('live page does not import explainabilityService', () => {
    const src = readFile(LIVE_PAGE);
    expect(src).not.toContain('explainabilityService');
  });

  it('live page does not import budgetToHumanImpactService', () => {
    const src = readFile(LIVE_PAGE);
    expect(src).not.toContain('budgetToHumanImpactService');
  });

  it('live page does not import ingestionSimulatorService', () => {
    const src = readFile(LIVE_PAGE);
    expect(src).not.toContain('ingestionSimulatorService');
  });

  it('live page does not import accountProvisioningService', () => {
    const src = readFile(LIVE_PAGE);
    expect(src).not.toContain('accountProvisioningService');
  });

  it('live page does not import tenantService', () => {
    const src = readFile(LIVE_PAGE);
    expect(src).not.toContain('tenantService');
  });

  it('live page does not import workforceBaselineService', () => {
    const src = readFile(LIVE_PAGE);
    expect(src).not.toContain('workforceBaselineService');
  });
});

// ── Group 3: Live page — no dual-path ternaries, no meridiana reference ───────

describe('B129 Fase 3 — live page: no dual-path', () => {
  const LIVE_PAGE = 'app/company/kora-index/page.tsx';

  it('live page does not contain isLive ? (dual-path ternary)', () => {
    const src = readFile(LIVE_PAGE);
    expect(src).not.toContain('isLive ?');
  });

  it('live page does not contain meridiana (case-insensitive)', () => {
    const src = readFile(LIVE_PAGE).toLowerCase();
    expect(src).not.toContain('meridiana');
  });
});

// ── Group 4: Live page — loading guard precedes data access ──────────────────

describe('B129 Fase 3 — live page: loading guard is first conditional', () => {
  it('sessionLoading || loading guard appears before hasKoraData check', () => {
    const src = readFile('app/company/kora-index/page.tsx');
    const loadingGuardIdx  = src.indexOf('sessionLoading || loading');
    const hasKoraDataIdx   = src.indexOf('hasKoraData');
    // Loading guard must exist
    expect(loadingGuardIdx).toBeGreaterThan(-1);
    // Loading guard must appear before any hasKoraData check
    expect(loadingGuardIdx).toBeLessThan(hasKoraDataIdx);
  });
});

// ── Group 5: Company layout — /company/kora-index not in DEMO_DRIVEN_ROUTES ──

describe('B129 Fase 3 — company layout: kora-index removed from DEMO_DRIVEN_ROUTES', () => {
  it('/company/kora-index is not in DEMO_DRIVEN_ROUTES', () => {
    const src = readFile('app/company/layout.tsx');
    // Find the DEMO_DRIVEN_ROUTES block and check kora-index is absent
    const blockStart = src.indexOf('DEMO_DRIVEN_ROUTES');
    const blockEnd   = src.indexOf('];', blockStart);
    const block      = src.slice(blockStart, blockEnd);
    expect(block).not.toContain('/company/kora-index');
  });
});

// ── Group 6: Demo guide — usa /company/kora-index canonical (B171) ───────────

// app/demo/guide/page.tsx existed here accurately as of B171. CC-00
// Residual /demo/** controlled retirement (2026-09-26) later, separately,
// retired the entire route — pure navigation/doctrine duplicate of the
// /demo root hub, which itself still links /company/kora-index (Group 7).
describe('B171 — demo guide: usa /company/kora-index canonical (historical note, not a live assertion)', () => {
  it('app/demo/guide/ non esiste più', () => {
    expect(fileExists('app/demo/guide')).toBe(false);
  });
});

// ── Group 7: Demo reachability — via /company/* (B171) ───────────────────────

describe('B171 — demo reachability: KORA Index accessibile via /company/kora-index', () => {
  it('app/demo/page.tsx intelligence section include /company/kora-index', () => {
    const src = readFile('app/demo/page.tsx');
    expect(src).toContain('/company/kora-index');
  });

  // app/demo/guide/page.tsx was accurately checked here too. Retired by
  // CC-00 Residual /demo/** controlled retirement (2026-09-26) — see the
  // Group 6 historical note above.
  it('app/demo/guide/ has since been separately retired (historical note, not a live assertion)', () => {
    expect(fileExists('app/demo/guide')).toBe(false);
  });
});

// ── Group 8: Sidebar — KORA Index Demo in admin Demo & Preview group ────────

describe('B129 Fase 3 — Sidebar: KORA Index™ Demo in synthetic group', () => {
  it('Demo Lab (admin-nav-groups) does NOT contain /demo/company/kora-index (RIDONDANTE — removed B169 FASE 4)', () => {
    const navGroupsSrc = readFile('lib/navigation/admin-nav-groups.ts');
    expect(navGroupsSrc).not.toContain('/demo/company/kora-index');
  });
});
