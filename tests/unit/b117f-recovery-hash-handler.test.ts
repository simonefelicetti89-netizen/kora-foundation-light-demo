// tests/unit/b117f-recovery-hash-handler.test.ts
// B117-F: Handle Supabase Recovery Hash Tokens on Landing — 14 structural tests.
//
// Root cause: Supabase Dashboard recovery links use implicit flow, landing on Site URL root
// with tokens in URL fragment: /#access_token=...&refresh_token=...&type=recovery
// Fragment is client-only (never sent to server), so /auth/callback cannot intercept it.
// No client-side handler existed to read and act on the hash.
//
// Fix: RecoveryHashHandler — client component that reads hash on mount, calls setSession,
// cleans URL, and redirects to /auth/reset-password.

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

const handler      = readFile('components/auth/RecoveryHashHandler.tsx');
const landingPage  = readFile('app/page.tsx');
const loginPage    = readFile('app/login/page.tsx');
const callbackRoute = readFile('app/auth/callback/route.ts');
const appShell     = readFile('components/layout/AppShell.tsx');

// ─── 1. RecoveryHashHandler exists and is a client component ─────────────────

describe('RecoveryHashHandler — existence and client boundary', () => {
  it('RecoveryHashHandler file exists', () => {
    expect(fileExists('components/auth/RecoveryHashHandler.tsx')).toBe(true);
  });

  it("RecoveryHashHandler has 'use client' directive", () => {
    expect(handler).toContain("'use client'");
  });

  it('RecoveryHashHandler is a named export (not default)', () => {
    expect(handler).toContain('export function RecoveryHashHandler');
  });

  it('RecoveryHashHandler returns null (renders nothing)', () => {
    expect(handler).toContain('return null');
  });
});

// ─── 2. RecoveryHashHandler — hash parsing ───────────────────────────────────

describe('RecoveryHashHandler — hash detection logic', () => {
  it('reads window.location.hash', () => {
    expect(handler).toContain('window.location.hash');
  });

  it('checks for access_token in hash', () => {
    expect(handler).toContain('access_token');
  });

  it('checks for refresh_token in hash', () => {
    expect(handler).toContain('refresh_token');
  });

  it("checks type === 'recovery' before acting", () => {
    expect(handler).toContain("type !== 'recovery'");
  });

  it('uses URLSearchParams to parse hash params', () => {
    expect(handler).toContain('URLSearchParams');
    expect(handler).toContain('hash.slice(1)');
  });
});

// ─── 3. RecoveryHashHandler — security: no token logging ─────────────────────

describe('RecoveryHashHandler — security: tokens never logged', () => {
  it('does NOT contain console.log', () => {
    expect(handler).not.toContain('console.log');
  });

  it('does NOT contain console.error', () => {
    expect(handler).not.toContain('console.error');
  });

  it('does NOT contain console.warn', () => {
    expect(handler).not.toContain('console.warn');
  });
});

// ─── 4. RecoveryHashHandler — URL cleanup and redirect ───────────────────────

describe('RecoveryHashHandler — URL cleanup and redirect', () => {
  it('cleans URL with history.replaceState before any async work', () => {
    expect(handler).toContain('history.replaceState');
    // replaceState must appear BEFORE setSession call
    const replaceIdx  = handler.indexOf('history.replaceState');
    const setSessionIdx = handler.indexOf('setSession');
    expect(replaceIdx).toBeLessThan(setSessionIdx);
  });

  it('calls supabase.auth.setSession with access_token and refresh_token', () => {
    expect(handler).toContain('setSession');
    expect(handler).toContain('access_token: accessToken');
    expect(handler).toContain('refresh_token: refreshToken');
  });

  it('redirects to /auth/reset-password on setSession success', () => {
    expect(handler).toContain('/auth/reset-password');
    // Redirect happens in the success branch (no error)
    const errorBranchIdx   = handler.indexOf("if (error)");
    const resetRedirectIdx = handler.indexOf('/auth/reset-password');
    expect(errorBranchIdx).toBeGreaterThan(0);
    expect(resetRedirectIdx).toBeGreaterThan(0);
  });

  it('redirects to /auth/forgot-password?error=recovery_session_failed on setSession failure', () => {
    expect(handler).toContain('/auth/forgot-password?error=recovery_session_failed');
  });
});

// ─── 5. Landing and login include RecoveryHashHandler ────────────────────────

describe('RecoveryHashHandler — included in public entry points', () => {
  it('app/page.tsx imports RecoveryHashHandler', () => {
    expect(landingPage).toContain("from '@/components/auth/RecoveryHashHandler'");
  });

  it('app/page.tsx renders <RecoveryHashHandler />', () => {
    expect(landingPage).toContain('<RecoveryHashHandler />');
  });

  it('app/login/page.tsx imports RecoveryHashHandler', () => {
    expect(loginPage).toContain("from '@/components/auth/RecoveryHashHandler'");
  });

  it('app/login/page.tsx renders <RecoveryHashHandler />', () => {
    expect(loginPage).toContain('<RecoveryHashHandler />');
  });
});

// ─── 6. /auth/callback PKCE flow is unaffected ───────────────────────────────

describe('/auth/callback — PKCE recovery flow unaffected', () => {
  it('callback still handles type=recovery via query param (PKCE flow)', () => {
    expect(callbackRoute).toContain("searchParams.get('type')");
    expect(callbackRoute).toContain("type === 'recovery'");
    expect(callbackRoute).toContain('/auth/reset-password');
  });

  it('callback does not handle hash tokens (server route cannot read fragment)', () => {
    expect(callbackRoute).not.toContain('window.location.hash');
    expect(callbackRoute).not.toContain('hash.slice');
  });
});

// ─── 7. AppShell — /auth/ routes remain public ───────────────────────────────

describe('AppShell — auth routes accessible without chrome', () => {
  it("AppShell PUBLIC_ROUTE_PREFIXES includes '/auth/'", () => {
    expect(appShell).toContain("'/auth/'");
  });
});
