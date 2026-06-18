/**
 * B168.8 — VISTA default role from real session
 *
 * Verifies structural correctness of the VISTA seeding chain:
 * RootLayout → AppShell → DemoStateProvider → initialRole prop.
 * No live Supabase calls — source-file analysis only.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const root = resolve(process.cwd());
function read(p: string) { return readFileSync(resolve(root, p), 'utf-8'); }

// ── DemoStateProvider accepts initialRole ─────────────────────────────────────

describe('B168.8 — DemoStateProvider seeding', () => {
  const src = read('lib/demo-state/index.ts');

  it('DemoStateProvider has initialRole prop', () => {
    expect(src).toContain('initialRole');
  });

  it('DemoStateProvider seeds useState from initialRole ?? COMPANY_ADMIN', () => {
    expect(src).toContain("initialRole ?? 'COMPANY_ADMIN'");
  });

  it('DemoStateProvider prop is optional (KoraRole | null)', () => {
    expect(src).toContain('initialRole?: KoraRole | null');
  });
});

// ── AppShell propagates initialRole ──────────────────────────────────────────

describe('B168.8 — AppShell propagates initialRole', () => {
  const src = read('components/layout/AppShell.tsx');

  it('AppShell accepts initialRole prop', () => {
    expect(src).toContain('initialRole');
  });

  it('AppShell passes initialRole to DemoStateProvider', () => {
    expect(src).toContain('DemoStateProvider initialRole={initialRole}');
  });
});

// ── RootLayout reads session ──────────────────────────────────────────────────

describe('B168.8 — RootLayout reads session for initialRole', () => {
  const src = read('app/layout.tsx');

  it('RootLayout is async', () => {
    expect(src).toContain('export default async function RootLayout');
  });

  it('RootLayout imports getCurrentKoraUser', () => {
    expect(src).toContain('getCurrentKoraUser');
  });

  it('RootLayout has try/catch fallback to null', () => {
    expect(src).toContain('initialRole = null');
    expect(src).toContain('try {');
    expect(src).toContain('} catch {');
  });

  it('RootLayout passes initialRole to AppShell', () => {
    expect(src).toContain('initialRole={initialRole}');
  });

  it('RootLayout does not crash on anonymous routes — catch returns null', () => {
    // Verify the catch block sets initialRole = null (safe fallback)
    const catchIdx = src.indexOf('} catch {');
    const nullIdx  = src.indexOf('initialRole = null', catchIdx);
    expect(nullIdx).toBeGreaterThan(catchIdx);
  });
});

// ── shouldShowDemoControls not touched ───────────────────────────────────────

describe('B168.8 — demo-controls-guard unchanged', () => {
  const src = read('lib/demo-state/demo-controls-guard.ts');

  it('shouldShowDemoControls still exists', () => {
    expect(src).toContain('shouldShowDemoControls');
  });
});
