// tests/unit/b118-account-profile-menu.test.ts
// B118: Account Profile Menu & Role-Aware User Settings — 25 structural tests.
//
// Covers:
//   1–10  AccountMenu component structure and data-testids
//  11–14  AccountMenu security: only for authenticated sessions, no sensitive data exposure
//  15–17  Header integration: AccountMenu imported and placed correctly
//  18–25  /account page: exists, server-side auth, role display, privacy boundary

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

const accountMenu = readFile('components/auth/AccountMenu.tsx');
const header      = readFile('components/layout/Header.tsx');
const accountPage = readFile('app/account/page.tsx');

// ─── 1–10: AccountMenu component structure ────────────────────────────────────

describe('AccountMenu — component structure', () => {
  it('AccountMenu file exists', () => {
    expect(fileExists('components/auth/AccountMenu.tsx')).toBe(true);
  });

  it('AccountMenu is a client component', () => {
    expect(accountMenu.trimStart()).toMatch(/^['"]use client['"]/);
  });

  it('AccountMenu has data-testid="account-menu-container"', () => {
    expect(accountMenu).toContain('data-testid="account-menu-container"');
  });

  it('AccountMenu has data-testid="account-menu-trigger"', () => {
    expect(accountMenu).toContain('data-testid="account-menu-trigger"');
  });

  it('AccountMenu trigger has aria-label="Menu account"', () => {
    expect(accountMenu).toContain('aria-label="Menu account"');
  });

  it('AccountMenu has data-testid="account-menu-dropdown"', () => {
    expect(accountMenu).toContain('data-testid="account-menu-dropdown"');
  });

  it('AccountMenu has data-testid="account-menu-avatar"', () => {
    expect(accountMenu).toContain('data-testid="account-menu-avatar"');
  });

  it('AccountMenu has data-testid="account-menu-role-badge"', () => {
    expect(accountMenu).toContain('data-testid="account-menu-role-badge"');
  });

  it('AccountMenu has link to /account with data-testid="account-menu-link-account"', () => {
    expect(accountMenu).toContain('data-testid="account-menu-link-account"');
    expect(accountMenu).toContain('href="/account"');
  });

  it('AccountMenu has link to /auth/forgot-password with data-testid="account-menu-link-password"', () => {
    expect(accountMenu).toContain('data-testid="account-menu-link-password"');
    expect(accountMenu).toContain('href="/auth/forgot-password"');
  });
});

// ─── 11–14: AccountMenu security constraints ──────────────────────────────────

describe('AccountMenu — security constraints', () => {
  it('AccountMenu returns null when realRole is falsy (unauthenticated guard)', () => {
    // The conditional render guard must be present
    expect(accountMenu).toContain('if (!realRole) return null');
  });

  it('AccountMenu reads real role from Supabase session (not from demo-state)', () => {
    expect(accountMenu).toContain('getSupabaseBrowserClient');
    expect(accountMenu).toContain('getSession');
    expect(accountMenu).toContain('app_metadata');
    // Must NOT read from useRole (demo-state hook)
    expect(accountMenu).not.toContain('useRole');
  });

  it('AccountMenu never exposes workerId or tenantId raw fields in the template', () => {
    // These are internal auth metadata fields — must not appear in rendered output
    expect(accountMenu).not.toContain('workerId');
    expect(accountMenu).not.toContain('kora_tenant_id');
    expect(accountMenu).not.toContain('kora_worker_id');
  });

  it('AccountMenu uses LogoutButton for logout action', () => {
    expect(accountMenu).toContain("import { LogoutButton } from './LogoutButton'");
    expect(accountMenu).toContain('<LogoutButton');
  });
});

// ─── 15–17: Header integration ───────────────────────────────────────────────

describe('Header — AccountMenu integration', () => {
  it('Header imports AccountMenu', () => {
    expect(header).toContain("import { AccountMenu }");
    expect(header).toContain("AccountMenu");
  });

  it('Header renders <AccountMenu />', () => {
    expect(header).toContain('<AccountMenu />');
  });

  it('AccountMenu is placed in the right-side controls div', () => {
    // The right-side div contains demo controls and AccountMenu together
    const rightDivIdx = header.indexOf('flex items-center gap-3');
    const accountMenuIdx = header.indexOf('<AccountMenu />');
    expect(rightDivIdx).toBeGreaterThan(-1);
    expect(accountMenuIdx).toBeGreaterThan(rightDivIdx);
  });
});

// ─── 18–25: /account page ─────────────────────────────────────────────────────

describe('/account page — structure and auth', () => {
  it('/account page file exists', () => {
    expect(fileExists('app/account/page.tsx')).toBe(true);
  });

  it('/account page is a server component (no "use client")', () => {
    // Server component: must NOT start with 'use client'
    const trimmed = accountPage.trimStart();
    expect(trimmed).not.toMatch(/^['"]use client['"]/);
  });

  it('/account page uses getSupabaseServerClient for server-side auth', () => {
    expect(accountPage).toContain('getSupabaseServerClient');
    expect(accountPage).toContain('auth.getUser()');
  });

  it('/account page redirects unauthenticated users to /login', () => {
    expect(accountPage).toContain("redirect('/login')");
  });

  it('/account page has data-testid="account-page"', () => {
    expect(accountPage).toContain('data-testid="account-page"');
  });

  it('/account page has data-testid="account-role-badge"', () => {
    expect(accountPage).toContain('data-testid="account-role-badge"');
  });

  it('/account page has data-testid="account-email" showing user email', () => {
    expect(accountPage).toContain('data-testid="account-email"');
    expect(accountPage).toContain('{user.email}');
  });

  it('/account page has logout button and change-password link', () => {
    expect(accountPage).toContain('data-testid="account-logout-button"');
    expect(accountPage).toContain('data-testid="account-change-password-link"');
    expect(accountPage).toContain('/auth/forgot-password');
    // Logout uses POST form to /api/auth/logout — not a direct link
    expect(accountPage).toContain('/api/auth/logout');
  });
});

// ─── Privacy boundary — no individual worker data on /account ─────────────────

describe('/account page — privacy boundary', () => {
  it('/account page never imports or renders PIB or impact-unit data', () => {
    // Checks for import patterns and JSX renders of raw worker scoring data,
    // not for comments that explain what is excluded.
    expect(accountPage).not.toContain("from '@/data/synthetic/pib");
    expect(accountPage).not.toContain("from '@/data/synthetic/impact");
    expect(accountPage).not.toContain('pibScore');
    expect(accountPage).not.toContain('impactUnit');
    expect(accountPage).not.toContain('IU_');
  });

  it('/account page reads koraRole from app_metadata (server-controlled)', () => {
    expect(accountPage).toContain('app_metadata');
    expect(accountPage).toContain('kora_role');
    // Must not accept role from query params or headers
    expect(accountPage).not.toContain('searchParams');
    expect(accountPage).not.toContain("headers.get('kora_role')");
  });

  it('/account page uses getRoleHome for dashboard back-link (not hardcoded per-role)', () => {
    expect(accountPage).toContain('getRoleHome');
    expect(accountPage).toContain('dashboardHref');
  });

  it('/account page shows WORKER privacy note about employer visibility', () => {
    // WORKER space description must explain employer cannot see individual data
    expect(accountPage).toContain('non sono visibili al datore di lavoro');
  });

  it('/account page shows COMPANY_ADMIN privacy note about no individual worker data', () => {
    // COMPANY_ADMIN space description must state no individual worker data is visible
    expect(accountPage).toContain('Nessun dato individuale lavoratore');
  });

  it('/account page never exposes kora_worker_id or kora_tenant_id to the rendered UI', () => {
    // These are internal auth fields — only email and role should appear in the template
    expect(accountPage).not.toContain('{appMeta?.kora_worker_id}');
    expect(accountPage).not.toContain('{appMeta?.kora_tenant_id}');
  });
});
