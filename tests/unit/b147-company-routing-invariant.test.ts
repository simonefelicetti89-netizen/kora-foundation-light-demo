// tests/unit/b147-company-routing-invariant.test.ts
//
// Routing invariant: every /company/* href in the COMPANY_ADMIN sidebar
// must have a matching prefix in COMPANY_ALLOWED_PREFIXES (middleware.ts).
//
// If this test fails, a COMPANY_ADMIN user clicking that sidebar link will
// be silently redirected to /company/workspace instead of the target page.
// This is the exact bug fixed in B147 (routing bug, June 2026).

import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

function read(rel: string): string {
  return fs.readFileSync(path.resolve(__dirname, '../..', rel), 'utf-8');
}

// ── Extract COMPANY_ALLOWED_PREFIXES from middleware.ts ───────────────────────

function extractAllowedPrefixes(middleware: string): string[] {
  const start = middleware.indexOf('const COMPANY_ALLOWED_PREFIXES = [');
  const end   = middleware.indexOf('];', start);
  const block = middleware.substring(start, end);
  const matches = block.match(/'(\/[^']+)'/g) ?? [];
  return matches.map((m) => m.replace(/'/g, ''));
}

// ── Extract COMPANY_ADMIN sidebar hrefs ─────────────────────────────────────

function extractCompanyAdminHrefs(sidebar: string): string[] {
  // Find the COMPANY_ADMIN block: starts at `if (role === 'COMPANY_ADMIN')`
  // ends at `if (isWorkerRole(role`
  const blockStart = sidebar.indexOf("if (role === 'COMPANY_ADMIN')");
  const blockEnd   = sidebar.indexOf('if (isWorkerRole(role', blockStart);
  const block      = blockStart > -1
    ? sidebar.substring(blockStart, blockEnd > blockStart ? blockEnd : blockStart + 4000)
    : '';

  const matches = block.match(/href:\s*'(\/company[^']+)'/g) ?? [];
  return matches
    .map((m) => m.replace(/href:\s*'/, '').replace(/'$/, ''))
    .filter((href) => href.startsWith('/company'));
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('B147 — COMPANY_ADMIN sidebar hrefs are all in COMPANY_ALLOWED_PREFIXES', () => {
  const middlewareSrc = read('middleware.ts');
  const sidebarSrc    = read('components/layout/Sidebar.tsx');

  const allowed = extractAllowedPrefixes(middlewareSrc);
  const hrefs   = extractCompanyAdminHrefs(sidebarSrc);

  it('COMPANY_ALLOWED_PREFIXES list is non-empty', () => {
    expect(allowed.length).toBeGreaterThan(5);
  });

  it('COMPANY_ADMIN sidebar has company hrefs to check', () => {
    expect(hrefs.length).toBeGreaterThan(0);
  });

  for (const href of hrefs) {
    it(`sidebar href "${href}" is covered by a COMPANY_ALLOWED prefix`, () => {
      const covered = allowed.some((prefix) => href === prefix || href.startsWith(prefix + '/'));
      expect(
        covered,
        `"${href}" in sidebar but has no matching prefix in COMPANY_ALLOWED_PREFIXES — ` +
        `COMPANY_ADMIN clicking this link will be redirected to /company/workspace instead`,
      ).toBe(true);
    });
  }
});

// ── Invariant: no sidebar href points to an operator-only blocked path ────────

describe('B147 — operator-only paths are NOT reachable via COMPANY_ADMIN sidebar', () => {
  const sidebarSrc = read('components/layout/Sidebar.tsx');
  const hrefs      = extractCompanyAdminHrefs(sidebarSrc);

  const OPERATOR_ONLY = ['/company/scoring', '/company/ingestion', '/company/uef-review'];

  for (const blocked of OPERATOR_ONLY) {
    it(`operator-only "${blocked}" is NOT in COMPANY_ADMIN sidebar`, () => {
      expect(hrefs).not.toContain(blocked);
    });
  }
});
