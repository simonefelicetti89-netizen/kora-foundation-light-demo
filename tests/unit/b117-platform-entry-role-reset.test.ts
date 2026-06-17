// tests/unit/b117-platform-entry-role-reset.test.ts
// B117: Platform Entry & Role Experience Reset — 25 structural tests.
//
// Verifies:
//   1. Unified /login page exists and has correct structure
//   2. getRoleHome() maps all roles correctly
//   3. Old login pages are redirect wrappers (no longer standalone forms)
//   4. auth/callback uses /login as fallback (not /company/login)
//   5. Header.tsx gates demo controls behind real session check
//   6. COMPANY_VIEWER removed from provisioning wizard UI
//   7. Admin partners page has error logging and diagnostic banner
//   8. AppShell marks /login as public (no chrome)
//   9. Worker login loop broken (WorkerLayout no longer wraps /worker/login standalone form)

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

const loginPage          = readFile('app/login/page.tsx');
const roleHome           = readFile('lib/auth/role-home.ts');
const workerLoginPage    = readFile('app/worker/login/page.tsx');
const companyLoginPage   = readFile('app/company/login/page.tsx');
const authCallback       = readFile('app/auth/callback/route.ts');
const header             = readFile('components/layout/Header.tsx');
const appShell           = readFile('components/layout/AppShell.tsx');
const provisioningPanel  = readFile('app/admin/company-users/_components/CompanyUserProvisioningPanel.tsx');
const adminPartners      = readFile('app/admin/partners/page.tsx');

// ─── 1. Unified /login page ───────────────────────────────────────────────────

describe('Unified /login page', () => {
  it('/login page exists', () => {
    expect(fileExists('app/login/page.tsx')).toBe(true);
  });

  it('/login has login-submit data-testid', () => {
    expect(loginPage).toContain('data-testid="login-submit"');
  });

  it('/login uses signInWithPassword', () => {
    expect(loginPage).toContain('signInWithPassword');
  });

  it('/login calls getRoleHome() after successful auth', () => {
    expect(loginPage).toContain('getRoleHome');
  });

  it('/login imports from lib/auth/role-home', () => {
    expect(loginPage).toContain("from '@/lib/auth/role-home'");
  });

  it('/login does not hardcode role-specific redirect targets', () => {
    // Redirect targets come from getRoleHome(), not hardcoded paths
    expect(loginPage).not.toContain("router.push('/admin')");
    expect(loginPage).not.toContain("router.push('/company/workspace')");
    expect(loginPage).not.toContain("router.push('/worker/");
  });

  it('/login has error state with data-testid', () => {
    expect(loginPage).toContain('data-testid="login-error"');
  });
});

// ─── 2. getRoleHome() utility ─────────────────────────────────────────────────

describe('getRoleHome() — role-to-home mapping', () => {
  it('getRoleHome file exists', () => {
    expect(fileExists('lib/auth/role-home.ts')).toBe(true);
  });

  it('KORA_ADMIN → /admin', () => {
    expect(roleHome).toContain("role === 'KORA_ADMIN'");
    expect(roleHome).toContain("return '/admin'");
  });

  it('COMPANY_ADMIN → /company/workspace', () => {
    expect(roleHome).toContain("role === 'COMPANY_ADMIN'");
    expect(roleHome).toContain("return '/company/workspace'");
  });

  it('WORKER → /worker/onboarding', () => {
    expect(roleHome).toContain("role === 'WORKER'");
    expect(roleHome).toContain("return '/worker/onboarding'");
  });

  it('unknown role → /login (safe fallback)', () => {
    expect(roleHome).toContain("return '/login'");
  });
});

// ─── 3. Old login pages are redirect wrappers ────────────────────────────────

describe('Old login pages — redirect wrappers', () => {
  it('/worker/login redirects to /login?role_hint=worker (B117-B adds role_hint)', () => {
    expect(workerLoginPage).toContain("redirect('/login?role_hint=worker')");
    expect(workerLoginPage).not.toContain('signInWithPassword');
    expect(workerLoginPage).not.toContain('useState');
  });

  it('/company/login redirects to /login?role_hint=company (B117-B adds role_hint)', () => {
    expect(companyLoginPage).toContain("redirect('/login?role_hint=company')");
    expect(companyLoginPage).not.toContain('signInWithPassword');
    expect(companyLoginPage).not.toContain('useState');
  });
});

// ─── 4. auth/callback — unified fallback ─────────────────────────────────────

describe('auth/callback — unified login fallback', () => {
  it('invite errors route to /login (not /company/setup-password as hardcoded fallback)', () => {
    // The B117 fix: unknown roles in invite flow go to /login, not company setup
    // The actual pattern is NextResponse.redirect(new URL('/login', origin))
    expect(authCallback).toContain("new URL('/login'");
  });

  it('no-code error routes to /login (not /company/login)', () => {
    expect(authCallback).toContain("'/login?error=missing_auth_code'");
    expect(authCallback).not.toContain("'/company/login?error=missing_auth_code'");
  });

  it('WORKER invite still routes to /worker/setup-password', () => {
    expect(authCallback).toContain("'/worker/setup-password'");
    expect(authCallback).toContain("koraRole === 'WORKER'");
  });

  it('COMPANY invite still routes to /company/setup-password', () => {
    expect(authCallback).toContain("'/company/setup-password'");
  });
});

// ─── 5. Header — demo controls gated behind real session ─────────────────────

describe('Header — demo controls gated on real session role', () => {
  it('Header reads real Supabase session with getSession()', () => {
    expect(header).toContain('getSession()');
    expect(header).toContain('getSupabaseBrowserClient');
  });

  it('Header has showDemoControls conditional', () => {
    expect(header).toContain('showDemoControls');
  });

  it('Header hides EnvironmentSwitcher from real COMPANY/WORKER sessions', () => {
    expect(header).toContain('{showDemoControls && <EnvironmentSwitcher />}');
  });

  it('Header hides RoleSwitcher from real COMPANY/WORKER sessions', () => {
    expect(header).toContain('{showDemoControls && <RoleSwitcher />}');
  });

  it('COMPANY_ADMIN and WORKER exclusion delegated to shouldShowDemoControls (B149, COMPANY_VIEWER rimosso in B143)', () => {
    // B149 moved the per-role exclusion into demo-controls-guard.shouldShowDemoControls.
    // Header no longer contains the inline realRoleIsCompanyOrWorker variable.
    expect(header).toContain('shouldShowDemoControls');
    expect(header).not.toContain("realRole === 'COMPANY_VIEWER'");
    expect(header).not.toContain('realRoleIsCompanyOrWorker');
  });
});

// ─── 6. COMPANY_VIEWER rimosso in B143 ───────────────────────────────────────

describe('COMPANY_VIEWER — B143 rimosso dal provisioning', () => {
  it('provisioning panel non offre COMPANY_VIEWER come opzione ruolo', () => {
    // The ROLE_OPTIONS array should not contain COMPANY_VIEWER as a selectable option
    const roleOptions = provisioningPanel.slice(
      provisioningPanel.indexOf('ROLE_OPTIONS'),
      provisioningPanel.indexOf('ROLE_OPTIONS') + 400,
    );
    expect(roleOptions).not.toContain("value: 'COMPANY_VIEWER'");
  });

});

// ─── 7. Admin partners — error logging + diagnostic banner ───────────────────

describe('Admin partners — error surfacing', () => {
  it('admin partners destructures error from query', () => {
    expect(adminPartners).toContain('{ data: partners, error: partnersError }');
  });

  it('admin partners logs error to console', () => {
    expect(adminPartners).toContain('console.error');
    expect(adminPartners).toContain('partnersError');
  });

  it('admin partners has diagnostic banner with data-testid', () => {
    expect(adminPartners).toContain('data-testid="partner-schema-error-banner"');
  });

  it('diagnostic banner explains the Supabase exposed schema fix', () => {
    expect(adminPartners).toContain('Extra Search Path');
  });
});

// ─── 8. AppShell — /login marked as public ───────────────────────────────────

describe('AppShell — /login is a public route (no chrome)', () => {
  it('/login is in PUBLIC_ROUTE_PREFIXES', () => {
    expect(appShell).toContain("'/login'");
  });

  it('/admin/login is also in PUBLIC_ROUTE_PREFIXES', () => {
    expect(appShell).toContain("'/admin/login'");
  });
});
