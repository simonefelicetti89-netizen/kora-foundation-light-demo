// tests/unit/b130-status.test.ts
// B130 — Status: eliminazione dual-path da /company/status.
// Pure fs.readFileSync structural tests — no runtime required.
//
// Groups:
//   1. Demo page exists and is demo-only (4 tests)
//   2. Live page: no demo service imports (4 tests)
//   3. Live page: no isLive ternary + no meridiana (2 tests)
//   4. Live page: loading guard precedes data rendering (1 test)
//   5. Company layout: /company/status removed from DEMO_DRIVEN_ROUTES (1 test)
//   6. Demo reachability: Status Center accessible from demo surfaces (2 tests)
//   7. Sidebar: Status Center Demo in admin Demo & Preview group (1 test)

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

describe('B171 — demo/company/status rimossa (RIDONDANTE)', () => {
  it('app/demo/company/status/page.tsx non esiste più (B171)', () => {
    expect(fileExists('app/demo/company/status/page.tsx')).toBe(false);
  });

  it('la rotta canonica /company/status esiste ancora', () => {
    expect(fileExists('app/company/status/page.tsx')).toBe(true);
  });
});

// ── Group 2: Live page — no demo service imports ──────────────────────────────

describe('B130 Status — live page: no demo service imports', () => {
  const LIVE_PAGE = 'app/company/status/page.tsx';

  it('live page does not import tenantService', () => {
    const src = readFile(LIVE_PAGE);
    expect(src).not.toContain('tenantService');
  });

  it('live page does not import workerProvisioningService', () => {
    const src = readFile(LIVE_PAGE);
    expect(src).not.toContain('workerProvisioningService');
  });

  it('live page does not import submissionFeedbackService', () => {
    const src = readFile(LIVE_PAGE);
    expect(src).not.toContain('submissionFeedbackService');
  });

  it('live page does not import SubmissionFeedbackPanel', () => {
    const src = readFile(LIVE_PAGE);
    expect(src).not.toContain('SubmissionFeedbackPanel');
  });
});

// ── Group 3: Live page — no dual-path ternaries, no meridiana ─────────────────

describe('B130 Status — live page: no dual-path', () => {
  const LIVE_PAGE = 'app/company/status/page.tsx';

  it('live page does not contain isLive ? (dual-path ternary)', () => {
    const src = readFile(LIVE_PAGE);
    expect(src).not.toContain('isLive ?');
  });

  it('live page does not contain meridiana (case-insensitive)', () => {
    const src = readFile(LIVE_PAGE).toLowerCase();
    expect(src).not.toContain('meridiana');
  });
});

// ── Group 4: Live page — loading guard is before data rendering ───────────────

describe('B130 Status — live page: loading guard precedes data access', () => {
  it('loading guard (sessionLoading || liveFetching) appears before companyName / readiness usage', () => {
    const src = readFile('app/company/status/page.tsx');
    const guardIdx     = src.indexOf('sessionLoading || liveFetching');
    const companyIdx   = src.indexOf('liveCompanyName ??');
    const readinessIdx = src.indexOf('liveReadiness ?? DEFAULT_READINESS');
    // Guard must exist
    expect(guardIdx).toBeGreaterThan(-1);
    // Guard must appear before derived state usage
    expect(guardIdx).toBeLessThan(companyIdx);
    expect(guardIdx).toBeLessThan(readinessIdx);
  });
});

// ── Group 5: Company layout — /company/status removed from DEMO_DRIVEN_ROUTES ─

describe('B130 Status — company layout: status removed from DEMO_DRIVEN_ROUTES', () => {
  it('/company/status is not in DEMO_DRIVEN_ROUTES', () => {
    const src = readFile('app/company/layout.tsx');
    const blockStart = src.indexOf('DEMO_DRIVEN_ROUTES');
    const blockEnd   = src.indexOf('];', blockStart);
    const block      = src.slice(blockStart, blockEnd);
    expect(block).not.toContain('/company/status');
  });
});

// ── Group 6: Demo reachability ─────────────────────────────────────────────────

describe('B171 — demo reachability: Status accessibile via /company/status', () => {
  it('app/demo/page.tsx intelligence section include /company/status (canonical)', () => {
    const src = readFile('app/demo/page.tsx');
    expect(src).toContain('/company/status');
  });

  it('Demo Lab (admin-nav-groups) non contiene /demo/company/status', () => {
    const navGroupsSrc = readFile('lib/navigation/admin-nav-groups.ts');
    expect(navGroupsSrc).not.toContain('/demo/company/status');
  });
});
