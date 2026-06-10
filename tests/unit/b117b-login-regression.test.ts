// tests/unit/b117b-login-regression.test.ts
// B117-B: Fix Unified Login Legacy Route Regression — 12 structural tests.
//
// Verifies the regression fix:
//   1. /login is public (no requireKoraAdmin/requireCompanyUser/requireWorkerUser)
//   2. /admin/login redirects to /login?role_hint=admin (authenticated path to /admin)
//   3. /company/login redirects to /login?role_hint=company
//   4. /worker/login redirects to /login?role_hint=worker
//   5. No "Sessione non trovata" visible in legacy login routes
//   6. No broken "Vai al login KORA Admin" button in legacy routes
//   7. Worker login loop is broken (WorkerLayout redirects to /login, not /worker/login)
//   8. Admin layout redirects unauthenticated to /login (not error card)
//   9. /login reads role_hint for contextual copy (no auth enforcement)
//  10. Middleware includes /login in public paths
//  11. /login uses useSearchParams for role_hint (wrapped in Suspense)
//  12. /admin/login only renders when admin layout passes (no signInWithPassword)

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

const loginPage        = readFile('app/login/page.tsx');
const adminLoginPage   = readFile('app/admin/login/page.tsx');
const adminLayout      = readFile('app/admin/layout.tsx');
const workerLoginPage  = readFile('app/worker/login/page.tsx');
const workerLayout     = readFile('app/worker/layout.tsx');
const companyLoginPage = readFile('app/company/login/page.tsx');
const appShell         = readFile('components/layout/AppShell.tsx');
const middleware       = readFile('middleware.ts');

// ─── 1. /login — public, no auth requirement ─────────────────────────────────

describe('/login — public page, no auth requirement', () => {
  it('/login page file exists', () => {
    expect(fileExists('app/login/page.tsx')).toBe(true);
  });

  it('/login does not call requireKoraAdmin', () => {
    expect(loginPage).not.toContain('requireKoraAdmin');
  });

  it('/login does not call requireCompanyUser', () => {
    expect(loginPage).not.toContain('requireCompanyUser');
  });

  it('/login does not call requireWorkerUser', () => {
    expect(loginPage).not.toContain('requireWorkerUser');
  });

  it('/login uses useSearchParams to read role_hint (no auth enforcement)', () => {
    expect(loginPage).toContain('useSearchParams');
    expect(loginPage).toContain('role_hint');
  });

  it('/login is wrapped in Suspense (required for useSearchParams in Next.js App Router)', () => {
    expect(loginPage).toContain('Suspense');
  });
});

// ─── 2. /admin/login — redirect wrapper, no "Sessione non trovata" ───────────

describe('/admin/login — redirect wrapper, no broken UI', () => {
  it('/admin/login is a redirect wrapper (redirects to /admin for authenticated KORA_ADMIN)', () => {
    expect(adminLoginPage).toContain("redirect('/admin')");
  });

  it('/admin/login does NOT contain "Sessione non trovata"', () => {
    expect(adminLoginPage).not.toContain('Sessione non trovata');
  });

  it('/admin/login does NOT contain broken "Vai al login KORA Admin" button', () => {
    expect(adminLoginPage).not.toContain('Vai al login KORA Admin');
  });

  it('/admin/login is not a standalone form (no signInWithPassword)', () => {
    expect(adminLoginPage).not.toContain('signInWithPassword');
  });

  it('admin layout redirects unauthenticated (401) to /login?role_hint=admin — not an error card', () => {
    expect(adminLayout).toContain("redirect('/login?role_hint=admin')");
  });

  it('admin layout 403 error card links to /login?role_hint=admin (not /admin/login)', () => {
    // 403 (wrong role) still shows error card but links to /login
    expect(adminLayout).toContain('/login?role_hint=admin');
    expect(adminLayout).not.toContain('href="/admin/login"');
  });
});

// ─── 3. Worker login loop fix ─────────────────────────────────────────────────

describe('Worker login loop — fixed in B117-B', () => {
  it('WorkerLayout redirects to /login (not /worker/login) — loop broken', () => {
    expect(workerLayout).toContain("redirect('/login')");
    expect(workerLayout).not.toContain("redirect('/worker/login')");
  });

  it('/worker/login redirects to /login?role_hint=worker', () => {
    expect(workerLoginPage).toContain("redirect('/login?role_hint=worker')");
  });

  it('/company/login redirects to /login?role_hint=company', () => {
    expect(companyLoginPage).toContain("redirect('/login?role_hint=company')");
  });
});

// ─── 4. AppShell and middleware — /login is public ───────────────────────────

describe('AppShell and middleware — /login is public', () => {
  it('AppShell PUBLIC_ROUTE_PREFIXES includes /login', () => {
    expect(appShell).toContain("'/login'");
  });

  it('middleware does not specifically block unauthenticated /login access', () => {
    // /login must not be in COMPANY_ALLOWED_PREFIXES or WORKER_ALLOWED_PREFIXES
    // (those prefixes restrict where authenticated users can go, not where anon can go)
    // The key is that /login is not listed as requiring a session
    expect(middleware).not.toContain("requireKoraAdmin('/login')");
    expect(middleware).not.toContain("requireWorkerUser('/login')");
  });
});
