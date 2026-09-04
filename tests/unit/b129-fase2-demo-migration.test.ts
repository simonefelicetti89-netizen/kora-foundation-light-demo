// tests/unit/b129-fase2-demo-migration.test.ts
// B129 Fase 2: 9 synth-only demo surfaces moved under /demo/*.
// Pure fs.readFileSync structural tests — no runtime required.
//
// Groups:
//   1. New demo pages exist at new paths (9 tests)
//   2. Old page files are gone (9 tests)
//   3. 9 redirect entries in next.config.ts (3 tests)
//   4. New /demo/* pages have no Supabase client imports (9 tests)
//   5. Sidebar: no old paths remain (5 tests)
//   6. demo/page.tsx DEMO_SURFACES updated — no old paths (3 tests)
//   7. Live pages: no broken links to old admin synth paths (3 tests)
//   8. AppShell: /demo excluded, /demo-guide removed (2 tests)
//   9. Anti-regression: B129 Fase 1 constraints still hold (3 tests)

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

// ── Group 1: New /demo/* pages exist ─────────────────────────────────────────

describe('B129 Fase 2 — new demo pages exist at new paths', () => {
  it('app/demo/guide/page.tsx exists', () => {
    expect(fileExists('app/demo/guide/page.tsx')).toBe(true);
  });

  it('app/demo/advisor/page.tsx exists', () => {
    expect(fileExists('app/demo/advisor/page.tsx')).toBe(true);
  });

  it('app/demo/future-vision/page.tsx exists', () => {
    expect(fileExists('app/demo/future-vision/page.tsx')).toBe(true);
  });

  it('app/demo/portfolio/page.tsx exists', () => {
    expect(fileExists('app/demo/portfolio/page.tsx')).toBe(true);
  });

  it('app/demo/benchmarks/page.tsx exists', () => {
    expect(fileExists('app/demo/benchmarks/page.tsx')).toBe(true);
  });

  it('app/demo/network/page.tsx exists', () => {
    expect(fileExists('app/demo/network/page.tsx')).toBe(true);
  });

  it('app/demo/gtm/page.tsx exists', () => {
    expect(fileExists('app/demo/gtm/page.tsx')).toBe(true);
  });

  // app/demo/index-registry/page.tsx existed here accurately as of B129
  // Fase 2. CC-00 Index Registry canonicalization (2026-09-06) later,
  // separately, retired the entire route — its real value moved into
  // app/admin/page.tsx's own Intelligence Grid panel, canonically. See
  // tests/unit/cc00-index-registry-canonicalization.test.ts.
  it('app/demo/index-registry/page.tsx has since been separately retired (historical note, not a live assertion)', () => {
    expect(fileExists('app/demo/index-registry/page.tsx')).toBe(false);
  });

  it('app/demo/ai-onboarding/page.tsx exists', () => {
    expect(fileExists('app/demo/ai-onboarding/page.tsx')).toBe(true);
  });
});

// ── Group 2: Old page files are gone ─────────────────────────────────────────

describe('B129 Fase 2 — old page files deleted', () => {
  it('app/advisor/page.tsx is gone', () => {
    expect(fileExists('app/advisor/page.tsx')).toBe(false);
  });

  it('app/advisor/layout.tsx is gone', () => {
    expect(fileExists('app/advisor/layout.tsx')).toBe(false);
  });

  it('app/demo-guide/page.tsx is gone', () => {
    expect(fileExists('app/demo-guide/page.tsx')).toBe(false);
  });

  it('app/future-vision/page.tsx is gone', () => {
    expect(fileExists('app/future-vision/page.tsx')).toBe(false);
  });

  it('app/future-vision/layout.tsx is gone', () => {
    expect(fileExists('app/future-vision/layout.tsx')).toBe(false);
  });

  it('app/admin/portfolio/page.tsx is gone', () => {
    expect(fileExists('app/admin/portfolio/page.tsx')).toBe(false);
  });

  it('app/admin/network/page.tsx is gone', () => {
    expect(fileExists('app/admin/network/page.tsx')).toBe(false);
  });

  it('app/admin/gtm/page.tsx is gone', () => {
    expect(fileExists('app/admin/gtm/page.tsx')).toBe(false);
  });

  it('app/admin/index-registry/page.tsx is gone', () => {
    expect(fileExists('app/admin/index-registry/page.tsx')).toBe(false);
  });
});

// ── Group 3: 9 redirect entries in next.config.ts ────────────────────────────

describe('B129 Fase 2 — next.config.ts: 9 redirect entries', () => {
  const config = readFile('next.config.ts');

  it('redirects /advisor → /demo/advisor (permanent)', () => {
    expect(config).toContain("source: '/advisor'");
    expect(config).toContain("destination: '/demo/advisor'");
    expect(config).toContain('permanent: true');
  });

  it('redirects /demo-guide → /demo/guide (permanent)', () => {
    expect(config).toContain("source: '/demo-guide'");
    expect(config).toContain("destination: '/demo/guide'");
  });

  it('redirects /future-vision → /demo/future-vision AND all 9 source paths declared', () => {
    expect(config).toContain("source: '/future-vision'");
    expect(config).toContain("destination: '/demo/future-vision'");
    expect(config).toContain("source: '/admin/portfolio'");
    expect(config).toContain("source: '/admin/benchmarks'");
    expect(config).toContain("source: '/admin/network'");
    expect(config).toContain("source: '/admin/gtm'");
    expect(config).toContain("source: '/admin/index-registry'");
    expect(config).toContain("source: '/admin/ai-onboarding'");
  });
});

// ── Group 4: No Supabase client imports in moved /demo/* pages ───────────────

describe('B129 Fase 2 — /demo/* pages have no Supabase client imports', () => {
  // app/demo/index-registry/page.tsx was accurately in this list as of B129
  // Fase 2. CC-00 Index Registry canonicalization (2026-09-06) retired the
  // route entirely — removed from this list, not replaced (there is no
  // page left to check).
  const DEMO_PAGES = [
    'app/demo/guide/page.tsx',
    'app/demo/advisor/page.tsx',
    'app/demo/future-vision/page.tsx',
    'app/demo/portfolio/page.tsx',
    'app/demo/benchmarks/page.tsx',
    'app/demo/network/page.tsx',
    'app/demo/gtm/page.tsx',
    'app/demo/ai-onboarding/page.tsx',
  ];

  for (const page of DEMO_PAGES) {
    it(`${page} has no getSupabaseServiceClient import`, () => {
      const src = readFile(page);
      expect(src).not.toContain("import { getSupabaseServiceClient");
      expect(src).not.toContain("import {getSupabaseServiceClient");
      expect(src).not.toContain("from '@/lib/supabase/server'");
      expect(src).not.toContain('from "@/lib/supabase/server"');
    });
  }
});

// ── Group 5: Sidebar updated — no old paths ───────────────────────────────────

describe('B129 Fase 2 — Sidebar: old paths removed', () => {
  const sidebar = readFile('components/layout/Sidebar.tsx');

  it('no reference to /admin/index-registry', () => {
    expect(sidebar).not.toContain('/admin/index-registry');
  });

  it('no reference to /admin/portfolio', () => {
    expect(sidebar).not.toContain('/admin/portfolio');
  });

  it('no reference to /admin/network', () => {
    expect(sidebar).not.toContain('/admin/network');
  });

  it('no reference to /admin/gtm', () => {
    expect(sidebar).not.toContain('/admin/gtm');
  });

  it('no reference to /demo-guide or /advisor (old paths)', () => {
    expect(sidebar).not.toContain("'/demo-guide'");
    expect(sidebar).not.toContain("'/advisor'");
  });
});

// ── Group 6: demo/page.tsx DEMO_SURFACES — no old paths ──────────────────────

describe('B129 Fase 2 — demo/page.tsx: DEMO_SURFACES updated', () => {
  const demoPage = readFile('app/demo/page.tsx');

  it('no link to old /advisor path', () => {
    expect(demoPage).not.toContain("href: '/advisor'");
  });

  it('no link to old /future-vision path', () => {
    expect(demoPage).not.toContain("href: '/future-vision'");
  });

  it('no link to old /demo-guide path', () => {
    expect(demoPage).not.toContain("href: '/demo-guide'");
  });
});

// ── Group 7: Live pages — no links to old admin synth paths ──────────────────

describe('B129 Fase 2 — live pages: no broken links to old admin synth paths', () => {
  it('app/company/data/page.tsx does not link to /admin/gtm', () => {
    const src = readFile('app/company/data/page.tsx');
    expect(src).not.toContain('href="/admin/gtm"');
  });

  it('app/company/contribution/page.tsx does not link to /future-vision', () => {
    const src = readFile('app/company/contribution/page.tsx');
    expect(src).not.toContain('href="/future-vision"');
  });

  it('app/admin/page.tsx does not link to old admin synth paths', () => {
    const src = readFile('app/admin/page.tsx');
    expect(src).not.toContain('/admin/index-registry');
    expect(src).not.toContain('/admin/portfolio');
    expect(src).not.toContain('/admin/network');
    expect(src).not.toContain('/admin/gtm');
  });
});

// ── Group 8: AppShell excludes /demo, not /demo-guide ────────────────────────

describe('B129 Fase 2 — AppShell: /demo in PUBLIC_ROUTE_PREFIXES', () => {
  const appShell = readFile('components/layout/AppShell.tsx');

  it("PUBLIC_ROUTE_PREFIXES includes '/demo'", () => {
    const prefixStart = appShell.indexOf('PUBLIC_ROUTE_PREFIXES');
    const block = appShell.slice(prefixStart, prefixStart + 300);
    expect(block).toContain("'/demo'");
  });

  it("PUBLIC_ROUTE_PREFIXES does NOT include '/demo-guide' (old, deleted route)", () => {
    const prefixStart = appShell.indexOf('PUBLIC_ROUTE_PREFIXES');
    const block = appShell.slice(prefixStart, prefixStart + 300);
    expect(block).not.toContain("'/demo-guide'");
  });
});

// ── Group 9: Anti-regression — B129 Fase 1 constraints still hold ────────────

describe('B129 Fase 2 — anti-regression: Fase 1 constraints', () => {
  it('DEMO_VIEWER_ALLOWED_PREFIXES still does not include /api/', () => {
    const middleware = readFile('middleware.ts');
    const blockStart = middleware.indexOf('DEMO_VIEWER_ALLOWED_PREFIXES');
    const block = middleware.slice(blockStart, blockStart + 500);
    expect(block).not.toContain("'/api/'");
  });

  it('demo/layout.tsx still does not import getSupabaseServiceClient', () => {
    const demoLayout = readFile('app/demo/layout.tsx');
    expect(demoLayout).not.toContain('getSupabaseServiceClient');
  });

  it('demo/advisor/page.tsx does not import requireKoraAdmin directly (guard via demo layout)', () => {
    const advisorPage = readFile('app/demo/advisor/page.tsx');
    expect(advisorPage).not.toContain('requireKoraAdmin');
  });
});
