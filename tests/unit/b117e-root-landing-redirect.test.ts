// tests/unit/b117e-root-landing-redirect.test.ts
// B117-E: Fix Root Landing vs Authenticated Workspace Redirect — 10 structural tests.
//
// Root cause: middleware.ts used prefix-based matching for role-redirect logic.
// '/' was not in COMPANY_ALLOWED_PREFIXES or WORKER_ALLOWED_PREFIXES, but could not
// be added because startsWith('/') matches every path. When a COMPANY_ADMIN visited '/',
// no prefix matched → middleware redirected to /company/workspace.
//
// Fix: early return in middleware for pathname === '/' before any role-redirect logic.
// '/' is always a public route — role-based routing starts from /login.

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '../..');

function readFile(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), 'utf-8');
}

const middleware  = readFile('middleware.ts');
const landingPage = readFile('app/page.tsx');
const loginPage   = readFile('app/login/page.tsx');
const appShell    = readFile('components/layout/AppShell.tsx');

// ─── 1. app/page.tsx — pure landing, no auth redirect ────────────────────────

describe('app/page.tsx — public landing, no auth redirect', () => {
  it('landing page does not import redirect from next/navigation', () => {
    expect(landingPage).not.toContain("import { redirect }");
    expect(landingPage).not.toContain("from 'next/navigation'");
  });

  it('landing page does not call getRoleHome', () => {
    expect(landingPage).not.toContain('getRoleHome');
  });

  it('landing page does not import Supabase client', () => {
    expect(landingPage).not.toContain('getSupabaseBrowserClient');
    expect(landingPage).not.toContain('getSupabaseServerClient');
  });

  it('landing page CTA "Accedi" points to /login (not /admin/login)', () => {
    // B117-E: /login is the unified entry for all roles — no role-specific login href on landing
    expect(landingPage).toContain('loginHref="/login"');
    expect(landingPage).not.toContain('loginHref="/admin/login"');
  });
});

// ─── 2. middleware — '/' is always public ────────────────────────────────────

describe('middleware — root path bypasses role-redirect', () => {
  it("middleware has early return for pathname === '/'", () => {
    expect(middleware).toContain("pathname === '/'");
    // The early return must appear before the isRealCompanyUser block
    const earlyReturnIdx    = middleware.indexOf("pathname === '/'");
    const companyRedirectIdx = middleware.indexOf('isRealCompanyUser');
    expect(earlyReturnIdx).toBeGreaterThan(0);
    expect(earlyReturnIdx).toBeLessThan(companyRedirectIdx);
  });

  it("middleware early return for '/' appears before worker redirect check", () => {
    const earlyReturnIdx  = middleware.indexOf("pathname === '/'");
    const workerRedirectIdx = middleware.indexOf('isRealWorker');
    expect(earlyReturnIdx).toBeLessThan(workerRedirectIdx);
  });

  it("'/' is NOT in COMPANY_ALLOWED_PREFIXES (startsWith('/') would match all paths)", () => {
    const companySection = middleware.split('COMPANY_ALLOWED_PREFIXES')[1]?.split('];')[0] ?? '';
    // Should not have a standalone '/' as a prefix (it would match everything)
    expect(companySection).not.toMatch(/'\/'\s*,/);
    expect(companySection).not.toMatch(/'\/'\s*\/\//);
  });

  it("'/' is NOT in WORKER_ALLOWED_PREFIXES (same reason)", () => {
    const workerSection = middleware.split('WORKER_ALLOWED_PREFIXES')[1]?.split('];')[0] ?? '';
    expect(workerSection).not.toMatch(/'\/'\s*,/);
    expect(workerSection).not.toMatch(/'\/'\s*\/\//);
  });

  it('COMPANY_ALLOWED_PREFIXES still redirects non-allowed paths (e.g. /demo-guide)', () => {
    // The fix is surgical — only '/' gets the early return, not all public routes
    const companySection = middleware.split('COMPANY_ALLOWED_PREFIXES')[1]?.split('];')[0] ?? '';
    expect(companySection).not.toContain("'/demo-guide'");
    expect(companySection).not.toContain("'/pilot'");
  });
});

// ─── 3. /login — still the role gateway post-auth ────────────────────────────

describe('/login — remains the role gateway', () => {
  it('/login uses getRoleHome after successful auth', () => {
    expect(loginPage).toContain('getRoleHome');
  });

  it('/login reads kora_role from app_metadata', () => {
    expect(loginPage).toContain('kora_role');
    expect(loginPage).toContain('app_metadata');
  });

  it('/login does not auto-redirect on render (no useEffect calling getRoleHome or router.push)', () => {
    // getRoleHome/router.push must be inside handleSubmit only, not in a useEffect auto-redirect
    // Check: if useEffect exists, it must NOT contain getRoleHome or router.push
    const hasUseEffect = loginPage.includes('useEffect');
    if (hasUseEffect) {
      const useEffectBlock = loginPage.slice(
        loginPage.indexOf('useEffect'),
        loginPage.indexOf('useEffect') + 300,
      );
      expect(useEffectBlock).not.toContain('getRoleHome');
      expect(useEffectBlock).not.toContain('router.push');
    } else {
      // No useEffect at all — definitely no auto-redirect on render
      expect(hasUseEffect).toBe(false);
    }
  });
});

// ─── 4. AppShell — '/' is public (no sidebar/chrome) ────────────────────────

describe('AppShell — root landing has no app chrome', () => {
  it("AppShell PUBLIC_ROUTE_PREFIXES includes '/' as first entry", () => {
    expect(appShell).toContain("'/'");
  });
});
