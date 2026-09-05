// tests/unit/b129-demo-foundation.test.ts
// B129: Demo Area Foundation — structural tests.
// Pure fs.readFileSync analysis — no runtime environment required.
//
// CC-00 DEMO_VIEWER role retirement (2026-09-26): Groups 1 (KoraDemoUser,
// guards), 2 (role-home DEMO_VIEWER routing), 3 (middleware DEMO_VIEWER
// confinement), 6 (provision-viewer route), and 7 (auth/callback DEMO_VIEWER
// routing) tested a role and its supporting code that has since been
// retired entirely from the runtime role model — not replaced by another
// role with a different name. See lib/architecture/registry.ts's
// app-surface.demo entry and tests/unit/cc00-demo-viewer-retirement.test.ts
// for the full retirement record. Those groups are replaced below with a
// single historical-note describe block. Groups 4 (demo/layout.tsx
// boundary marker), 5 (demo/page.tsx synthetic-only), 8 (anti-regression:
// live routes must not import demo services), and 9 (anti-regression:
// /demo/* must not use live DB clients) are unrelated to the DEMO_VIEWER
// role itself and remain live, unmodified.
//
// Groups:
//   4. demo/layout.tsx — boundary marker, robots noindex (3 tests)
//   5. demo/page.tsx — synth-only, no live DB (3 tests)
//   8. Anti-regression: live routes must not import demo services (6 tests)
//   9. Anti-regression: /demo/* must not use live DB clients (3 tests)
//   10. Historical note: Groups 1/2/3/6/7 retired (historical, not live assertions)

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

function stripComments(src: string): string {
  return src
    .split('\n')
    .filter((line) => !line.trim().startsWith('//'))
    .join('\n');
}

const demoLayout       = readFile('app/demo/layout.tsx');
const demoPage         = readFile('app/demo/page.tsx');

// ── Group 4: demo/layout.tsx — B168.5-P3: layout neutro, guard per-sub-route ──

describe('B129 — demo/layout: boundary marker (B168.5-P3 ristrutturato)', () => {
  it('NON importa requireDemoAccess (guard rimosso — CC-00 DEMO_VIEWER role retirement)', () => {
    expect(demoLayout).not.toContain("import { requireDemoAccess");
    expect(demoLayout).not.toContain('await requireDemoAccess()');
  });

  it('mantiene data-testid="demo-boundary-marker"', () => {
    expect(demoLayout).toContain('demo-boundary-marker');
  });

  it('mantiene robots noindex per tutto /demo/*', () => {
    expect(demoLayout).toContain('index: false');
    expect(demoLayout).toContain('nocache: true');
  });
});

// ── Group 5: demo/page.tsx — synth-only, no live DB (3 tests) ────────────────

describe('B129 — demo/page: synthetic data only', () => {
  it('renders data-testid="demo-home"', () => {
    expect(demoPage).toContain('demo-home');
  });

  it('does not import getSupabaseServiceClient', () => {
    expect(demoPage).not.toContain("import { getSupabaseServiceClient");
    expect(demoPage).not.toContain("import {getSupabaseServiceClient");
  });

  it('does not import getSupabaseServerClient', () => {
    expect(demoPage).not.toContain("import { getSupabaseServerClient");
    expect(demoPage).not.toContain("import {getSupabaseServerClient");
  });
});

// ── Group 8: Anti-regression — live routes must not import demo services ──────
//
// Purpose: ensure no live operational page leaks a dependency on demo/synthetic
// services (AdminPreviewService, ScenarioService, DemoDataService).
// Known exception: app/company/pillars/page.tsx imports DemoDataService as a
// pre-B129 legacy fallback — excluded here with explicit comment.

describe('B129 — anti-regression: live routes must not import demo services', () => {
  const DEMO_SERVICES_PATTERN = /AdminPreviewService|ScenarioService|DemoDataService/;

  function assertNoDemoService(rel: string): void {
    const src = readFile(rel);
    const match = src.match(DEMO_SERVICES_PATTERN);
    if (match) {
      throw new Error(`${rel} imports demo service "${match[0]}" — live routes must not depend on synthetic services.`);
    }
  }

  it('app/company/workspace page does not import demo services', () => {
    assertNoDemoService('app/company/workspace/page.tsx');
  });

  it('app/company/commons page does not import demo services', () => {
    assertNoDemoService('app/company/commons/page.tsx');
  });

  it('app/worker/commons page does not import demo services', () => {
    assertNoDemoService('app/worker/commons/page.tsx');
  });

  it('app/api/commons/posts route does not import demo services', () => {
    assertNoDemoService('app/api/commons/posts/route.ts');
  });

  it('app/api/admin/companies/provision route does not import demo services', () => {
    assertNoDemoService('app/api/admin/companies/provision/route.ts');
  });

  it('app/api/admin/workers route does not import demo services (if exists)', () => {
    if (!fileExists('app/api/admin/workers/route.ts')) return;
    assertNoDemoService('app/api/admin/workers/route.ts');
  });
});

// ── Group 9: Anti-regression — /demo/* must not use live DB clients (3 tests) ─

describe('B129 — anti-regression: /demo/* must not use live DB clients', () => {
  it('demo/layout.tsx does not import getSupabaseServiceClient', () => {
    expect(demoLayout).not.toContain('getSupabaseServiceClient');
  });

  it('demo/layout.tsx does not import getSupabaseServerClient', () => {
    expect(demoLayout).not.toContain('getSupabaseServerClient');
  });

  it('demo/page.tsx has no Supabase client imports at all', () => {
    expect(demoPage).not.toContain("from '@/lib/supabase");
    expect(demoPage).not.toContain('from "@/lib/supabase');
  });
});

// ── Group 10: Historical note — Groups 1/2/3/6/7 retired ─────────────────────
//
// KoraDemoUser, requireDemoUser(), requireDemoAccess(), getCurrentDemoUser(),
// isDemoUser() (former Group 1), role-home.ts's DEMO_VIEWER → '/demo' branch
// (former Group 2), middleware.ts's DEMO_VIEWER_ALLOWED_PREFIXES/isDemoViewer
// block (former Group 3), app/api/admin/demo/provision-viewer/route.ts
// (former Group 6), and app/auth/callback/route.ts's DEMO_VIEWER invite
// branch (former Group 7) were all accurately tested here as of B129. CC-00
// DEMO_VIEWER role retirement (2026-09-26) retired every one of them —
// DEMO_VIEWER is not replaced by another role with a different name. See
// tests/unit/cc00-demo-viewer-retirement.test.ts for the current, correct
// state.

describe('B129 — Groups 1/2/3/6/7 have since been separately retired (historical note, not a live assertion)', () => {
  it('KoraDemoUser/requireDemoUser/requireDemoAccess/getCurrentDemoUser/isDemoUser no longer exist in lib/auth/kora-session.ts', () => {
    const koraSession = stripComments(readFile('lib/auth/kora-session.ts'));
    for (const name of ['KoraDemoUser', 'requireDemoUser', 'requireDemoAccess', 'getCurrentDemoUser', 'isDemoUser']) {
      expect(koraSession).not.toContain(name);
    }
  });

  it('role-home.ts no longer maps DEMO_VIEWER to /demo', () => {
    const roleHome = stripComments(readFile('lib/auth/role-home.ts'));
    expect(roleHome).not.toContain("'DEMO_VIEWER'");
  });

  it('middleware.ts no longer defines DEMO_VIEWER_ALLOWED_PREFIXES or isDemoViewer', () => {
    const middleware = stripComments(readFile('middleware.ts'));
    expect(middleware).not.toContain('DEMO_VIEWER_ALLOWED_PREFIXES');
    expect(middleware).not.toContain('isDemoViewer');
  });

  it('app/api/admin/demo/provision-viewer/route.ts no longer exists', () => {
    expect(fileExists('app/api/admin/demo/provision-viewer/route.ts')).toBe(false);
  });

  it('auth/callback no longer routes DEMO_VIEWER invites to /demo', () => {
    const callbackRoute = stripComments(readFile('app/auth/callback/route.ts'));
    expect(callbackRoute).not.toContain("'DEMO_VIEWER'");
  });

  it('lib/auth/demo-guard.tsx (requireDemoGate, zero real callers) no longer exists', () => {
    expect(fileExists('lib/auth/demo-guard.tsx')).toBe(false);
  });
});
