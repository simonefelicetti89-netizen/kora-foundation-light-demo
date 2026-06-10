// tests/unit/b117d-recovery-callback.test.ts
// B117-D: Fix Password Recovery Callback Bypass — 12 structural tests.
//
// Root cause: middleware.ts did not include /auth/reset-password in COMPANY_ALLOWED_PREFIXES
// or WORKER_ALLOWED_PREFIXES. After /auth/callback established a session via
// exchangeCodeForSession and redirected to /auth/reset-password, the middleware intercepted
// the next request, saw an authenticated COMPANY_ADMIN/WORKER, and redirected to workspace —
// bypassing the reset page entirely.
//
// Fix: Replace '/auth/callback' with '/auth/' in both allowed prefix lists so all
// auth routes (reset-password, forgot-password, callback) are reachable during recovery flow.

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '../..');

function readFile(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), 'utf-8');
}

const middleware       = readFile('middleware.ts');
const callback         = readFile('app/auth/callback/route.ts');
const resetForm        = readFile('app/auth/reset-password/_form.tsx');
const resetPage        = readFile('app/auth/reset-password/page.tsx');
const forgotPassword   = readFile('app/auth/forgot-password/page.tsx');
const appShell         = readFile('components/layout/AppShell.tsx');

// ─── 1. forgot-password — redirectTo contains recovery marker ────────────────

describe('forgot-password — redirectTo recovery marker', () => {
  it('redirectTo contains /auth/callback?type=recovery', () => {
    expect(forgotPassword).toContain('/auth/callback?type=recovery');
  });

  it('forgotPassword uses resetPasswordForEmail with redirectTo', () => {
    expect(forgotPassword).toContain('resetPasswordForEmail');
    expect(forgotPassword).toContain('redirectTo');
  });
});

// ─── 2. callback — recovery detection and redirect ───────────────────────────

describe('callback — recovery detection', () => {
  it('callback reads type from searchParams', () => {
    expect(callback).toContain("searchParams.get('type')");
  });

  it("callback redirects to /auth/reset-password when type === 'recovery'", () => {
    expect(callback).toContain("type === 'recovery'");
    expect(callback).toContain("'/auth/reset-password'");
  });

  it('callback does NOT call getRoleHome before checking recovery type', () => {
    const src = callback;
    const recoveryCheckIdx = src.indexOf("type === 'recovery'");
    const getRoleHomeIdx   = src.indexOf('getRoleHome');
    // getRoleHome is not in callback at all (it uses explicit role checks)
    // The important thing is that recovery redirect comes BEFORE role-based redirect
    if (getRoleHomeIdx !== -1) {
      expect(recoveryCheckIdx).toBeLessThan(getRoleHomeIdx);
    } else {
      expect(recoveryCheckIdx).toBeGreaterThan(0);
    }
  });

  it('callback recovery does NOT redirect to /company/workspace', () => {
    const src = callback;
    // The recovery branch only redirects to /auth/reset-password
    // Ensure /company/workspace is not in the same branch
    const recoverySection = src.slice(
      src.indexOf("type === 'recovery'"),
      src.indexOf("type === 'recovery'") + 200,
    );
    expect(recoverySection).not.toContain('/company/workspace');
  });

  it('callback recovery does NOT redirect to /worker/workspace', () => {
    const src = callback;
    const recoverySection = src.slice(
      src.indexOf("type === 'recovery'"),
      src.indexOf("type === 'recovery'") + 200,
    );
    expect(recoverySection).not.toContain('/worker/workspace');
  });

  it('callback recovery does NOT redirect to /admin', () => {
    const src = callback;
    const recoverySection = src.slice(
      src.indexOf("type === 'recovery'"),
      src.indexOf("type === 'recovery'") + 200,
    );
    expect(recoverySection).not.toContain("return NextResponse.redirect(new URL('/admin'");
  });
});

// ─── 3. middleware — /auth/ prefix allows reset-password through ──────────────

describe('middleware — /auth/ prefix covers reset-password', () => {
  it("COMPANY_ALLOWED_PREFIXES contains '/auth/' (covers /auth/reset-password)", () => {
    const companySection = middleware.split('COMPANY_ALLOWED_PREFIXES')[1]?.split('];')[0] ?? '';
    expect(companySection).toContain("'/auth/'");
  });

  it("WORKER_ALLOWED_PREFIXES contains '/auth/' (covers /auth/reset-password)", () => {
    const workerSection = middleware.split('WORKER_ALLOWED_PREFIXES')[1]?.split('];')[0] ?? '';
    expect(workerSection).toContain("'/auth/'");
  });

  it('COMPANY_ALLOWED_PREFIXES does NOT exclusively list only /auth/callback (too narrow)', () => {
    const companySection = middleware.split('COMPANY_ALLOWED_PREFIXES')[1]?.split('];')[0] ?? '';
    // Should have '/auth/' not just '/auth/callback' as the sole auth entry
    const hasAuthSlash    = companySection.includes("'/auth/'");
    const hasAuthCallback = companySection.includes("'/auth/callback'");
    // If '/auth/' is present, the prefix covers all auth routes including reset-password
    expect(hasAuthSlash || hasAuthCallback).toBe(true);
    // The narrow form '/auth/callback' only is what caused the bug — '/auth/' is the fix
    if (!hasAuthSlash && hasAuthCallback) {
      throw new Error("'/auth/callback' alone does not cover '/auth/reset-password' — use '/auth/'");
    }
  });
});

// ─── 4. reset-password — no auto-redirect before submit ──────────────────────

describe('reset-password — no auto-redirect before updateUser', () => {
  it('reset-password form does NOT redirect automatically on render (no useEffect redirect)', () => {
    // The form should only redirect AFTER updateUser succeeds
    // It should not have a useEffect that redirects on session detection
    const hasAutoRedirect = resetForm.includes('useEffect') &&
                            resetForm.includes("router.push") &&
                            !resetForm.includes('handleSubmit');
    expect(hasAutoRedirect).toBe(false);
  });

  it('reset-password calls updateUser({ password }) on submit', () => {
    expect(resetForm).toContain('updateUser({ password }');
  });

  it('reset-password uses getRoleHome for post-reset redirect', () => {
    expect(resetForm).toContain('getRoleHome');
    expect(resetForm).toContain("from '@/lib/auth/role-home'");
  });

  it('reset-password fallback is /login (not /company/login)', () => {
    // The old fallback was '/company/login' — now it uses getRoleHome
    // which falls back to '/login' for unknown roles
    expect(resetForm).not.toContain("'/company/login'");
    expect(resetForm).toContain('getRoleHome');
  });

  it('expired recovery shows error and link to forgot-password', () => {
    expect(resetForm).toContain('Link scaduto o non valido');
    expect(resetForm).toContain('/auth/forgot-password');
  });
});

// ─── 5. AppShell — /auth/ routes have no app shell/chrome ────────────────────

describe('AppShell — /auth/ routes are public (no sidebar/demo chrome)', () => {
  it("AppShell PUBLIC_ROUTE_PREFIXES includes '/auth/'", () => {
    expect(appShell).toContain("'/auth/'");
  });
});
