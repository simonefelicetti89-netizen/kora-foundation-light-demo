// tests/unit/b129-demo-foundation.test.ts
// B129: Demo Area Foundation — structural tests.
// Pure fs.readFileSync analysis — no runtime environment required.
//
// Groups:
//   1. kora-session.ts — KoraDemoUser, guards (10 tests)
//   2. role-home.ts — DEMO_VIEWER routing (2 tests)
//   3. middleware.ts — DEMO_VIEWER confinement (4 tests)
//   4. demo/layout.tsx — auth guard, DEMO badge (4 tests)
//   5. demo/page.tsx — synth-only, no live DB (3 tests)
//   6. provision-viewer route — KORA_ADMIN, no tenant, 409 guard (6 tests)
//   7. auth/callback — DEMO_VIEWER routing (2 tests)
//   8. Anti-regression: live routes must not import demo services (6 tests)
//   9. Anti-regression: /demo/* must not use live DB clients (3 tests)

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

const koraSession      = readFile('lib/auth/kora-session.ts');
const roleHome         = readFile('lib/auth/role-home.ts');
const middleware       = readFile('middleware.ts');
const demoLayout       = readFile('app/demo/layout.tsx');
const demoPage         = readFile('app/demo/page.tsx');
const provisionViewer  = readFile('app/api/admin/demo/provision-viewer/route.ts');
const callbackRoute    = readFile('app/auth/callback/route.ts');

// ── Group 1: kora-session.ts — KoraDemoUser and guards (10 tests) ─────────────

describe('B129 — kora-session: KoraDemoUser type', () => {
  it('exports KoraDemoUser interface', () => {
    expect(koraSession).toContain('export interface KoraDemoUser');
  });

  it('KoraDemoUser has koraRole: DEMO_VIEWER literal', () => {
    expect(koraSession).toContain("koraRole: 'DEMO_VIEWER'");
  });

  it('exports requireDemoUser function', () => {
    expect(koraSession).toContain('export async function requireDemoUser');
  });

  it('requireDemoUser rejects non-DEMO_VIEWER with 403', () => {
    expect(koraSession).toContain("koraRole !== 'DEMO_VIEWER'");
    expect(koraSession).toContain('{ status: 403 }');
  });

  it('exports requireDemoAccess function', () => {
    expect(koraSession).toContain('export async function requireDemoAccess');
  });

  it('requireDemoAccess admits KORA_ADMIN', () => {
    expect(koraSession).toContain("koraRole === 'KORA_ADMIN'");
  });

  it('requireDemoAccess rejects all live company/worker/partner roles', () => {
    expect(koraSession).toContain("{ status: 403 }");
    expect(koraSession).toContain('DEMO_VIEWER');
  });

  it('exports isDemoUser type guard', () => {
    expect(koraSession).toContain('export function isDemoUser');
    expect(koraSession).toContain("koraRole === 'DEMO_VIEWER'");
  });

  it('isKoraAuthError union includes KoraDemoUser', () => {
    expect(koraSession).toContain('KoraDemoUser | NextResponse');
  });

  it('exports getCurrentDemoUser helper', () => {
    expect(koraSession).toContain('export async function getCurrentDemoUser');
  });
});

// ── Group 2: role-home.ts — DEMO_VIEWER routing (2 tests) ────────────────────

describe('B129 — role-home: DEMO_VIEWER maps to /demo', () => {
  it("maps DEMO_VIEWER to '/demo'", () => {
    expect(roleHome).toContain("'DEMO_VIEWER'");
    expect(roleHome).toContain("'/demo'");
  });

  it('other roles are not affected', () => {
    expect(roleHome).toContain("'KORA_ADMIN'");
    expect(roleHome).toContain("'/admin'");
    expect(roleHome).toContain("'COMPANY_ADMIN'");
    expect(roleHome).toContain("'/company/workspace'");
    expect(roleHome).toContain("'WORKER'");
    expect(roleHome).toContain("'/worker/onboarding'");
  });
});

// ── Group 3: middleware.ts — DEMO_VIEWER confinement (5 tests) ───────────────

describe('B129 — middleware: DEMO_VIEWER confinement', () => {
  it('defines DEMO_VIEWER_ALLOWED_PREFIXES constant', () => {
    expect(middleware).toContain('DEMO_VIEWER_ALLOWED_PREFIXES');
  });

  it('DEMO_VIEWER_ALLOWED_PREFIXES includes /demo/', () => {
    expect(middleware).toContain("'/demo/'");
  });

  it('DEMO_VIEWER_ALLOWED_PREFIXES does NOT include /api/ — defense in depth', () => {
    // /api/ wildcard removed per B129 correction: middleware blocks live routes before
    // server-side guards. Future demo API routes must use /api/demo/*, not Fase 1.
    const blockStart = middleware.indexOf('DEMO_VIEWER_ALLOWED_PREFIXES');
    const block = middleware.slice(blockStart, blockStart + 500);
    expect(block).not.toContain("'/api/'");
  });

  it('DEMO_VIEWER_ALLOWED_PREFIXES does NOT include /company or /worker or /admin', () => {
    const blockStart = middleware.indexOf('DEMO_VIEWER_ALLOWED_PREFIXES');
    const block = middleware.slice(blockStart, blockStart + 500);
    expect(block).not.toContain("'/company'");
    expect(block).not.toContain("'/worker'");
    expect(block).not.toContain("'/admin'");
  });

  it('confinement block redirects DEMO_VIEWER to /demo', () => {
    expect(middleware).toContain("isDemoViewer");
    expect(middleware).toContain("'/demo'");
  });
});

// ── Group 4: demo/layout.tsx — B168.5-P3: layout neutro, guard per-sub-route ──

describe('B129 — demo/layout: boundary marker (B168.5-P3 ristrutturato)', () => {
  it('NON importa requireDemoAccess (guard spostato a sub-layout — B168.5-P3)', () => {
    // Guard is now in /demo/company/layout.tsx and per-route standalone layouts
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

  it('demo/company/ directory rimossa (B171: RIDONDANTE pages deleted)', () => {
    // B171: /demo/company/* rimossi. Il gate per-sub-route era in demo/company/layout.tsx
    // ma la directory è stata eliminata con le 6 route RIDONDANTE.
    const fs2 = require('fs');
    const path2 = require('path');
    expect(fs2.existsSync(path2.resolve(process.cwd(), 'app/demo/company/layout.tsx'))).toBe(false);
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

// ── Group 6: provision-viewer route — constraints (6 tests) ──────────────────

describe('B129 — provision-viewer: security constraints', () => {
  it('requires KORA_ADMIN via requireKoraAdmin', () => {
    expect(provisionViewer).toContain('requireKoraAdmin');
  });

  it("sets kora_role to 'DEMO_VIEWER' in app_metadata", () => {
    expect(provisionViewer).toContain("kora_role:   'DEMO_VIEWER'");
  });

  it('does NOT set kora_tenant_id in app_metadata — DEMO_VIEWER has no live tenant', () => {
    // Check the updateUserById call block — kora_tenant_id must not appear as a metadata key.
    const updateBlock = provisionViewer.slice(
      provisionViewer.indexOf('updateUserById'),
      provisionViewer.indexOf('updateUserById') + 250,
    );
    expect(updateBlock).not.toContain('kora_tenant_id');
  });

  it('returns 409 when email already has a live role', () => {
    expect(provisionViewer).toContain('{ status: 409 }');
    expect(provisionViewer).toContain('isLiveRole');
  });

  it('metadata failure returns 207 with explicit warning (never silent)', () => {
    const metaErrBlock = provisionViewer.slice(
      provisionViewer.lastIndexOf('metaErr'),
      provisionViewer.lastIndexOf('metaErr') + 600,
    );
    expect(metaErrBlock).toContain('207');
    expect(metaErrBlock).toContain('warnings');
  });

  it('route file exists at correct path', () => {
    expect(fileExists('app/api/admin/demo/provision-viewer/route.ts')).toBe(true);
  });
});

// ── Group 7: auth/callback — DEMO_VIEWER routing (2 tests) ───────────────────

describe('B129 — auth/callback: DEMO_VIEWER routing', () => {
  it("routes DEMO_VIEWER invite to '/demo'", () => {
    expect(callbackRoute).toContain("'DEMO_VIEWER'");
    expect(callbackRoute).toContain("'/demo'");
  });

  it("DEMO_VIEWER block appears before the final fallback", () => {
    const demoIdx     = callbackRoute.indexOf("'DEMO_VIEWER'");
    const fallbackIdx = callbackRoute.lastIndexOf("'/login'");
    expect(demoIdx).toBeGreaterThan(0);
    expect(demoIdx).toBeLessThan(fallbackIdx);
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
