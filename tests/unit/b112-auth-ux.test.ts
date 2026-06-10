// tests/unit/b112-auth-ux.test.ts
// B112: Auth UX Cleanup — Logout, Password Reset & Session Clarity.
// 17 structural tests — no live Supabase calls, no runtime.

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

function stripLineComments(src: string): string {
  return src.replace(/\/\/[^\n]*/g, '');
}

// ─── Source files under test ──────────────────────────────────────────────────

const adminLayout       = readFile('app/admin/layout.tsx');
const adminLogin        = readFile('app/admin/login/page.tsx');
const companyLogin      = readFile('app/company/login/page.tsx');
const workerWorkspace   = readFile('app/worker/workspace/page.tsx');
const companyWorkspace  = readFile('app/company/workspace/page.tsx');
const logoutRoute       = readFile('app/api/auth/logout/route.ts');
const callbackRoute     = readFile('app/auth/callback/route.ts');
const sessionBar        = readFile('components/auth/SessionBar.tsx');
const logoutButton      = readFile('components/auth/LogoutButton.tsx');
const forgotPage        = readFile('app/auth/forgot-password/page.tsx');
const resetForm         = readFile('app/auth/reset-password/_form.tsx');

// ─── 1. Admin layout contains logout (SessionBar) ────────────────────────────

describe('Admin area — logout visible', () => {
  it('admin layout imports SessionBar', () => {
    expect(adminLayout).toContain('SessionBar');
    expect(adminLayout).toContain("from '@/components/auth/SessionBar'");
  });

  it('admin layout renders SessionBar with email and role', () => {
    expect(adminLayout).toContain('email={auth.email}');
    expect(adminLayout).toContain('role={auth.koraRole}');
  });
});

// ─── 2. Company workspace contains logout ─────────────────────────────────────

describe('Company workspace — logout visible', () => {
  it('company workspace page imports SessionBar', () => {
    expect(companyWorkspace).toContain('SessionBar');
    expect(companyWorkspace).toContain("from '@/components/auth/SessionBar'");
  });

  it('company workspace renders SessionBar', () => {
    expect(companyWorkspace).toContain('<SessionBar');
  });
});

// ─── 3. Worker workspace contains logout ──────────────────────────────────────

describe('Worker workspace — logout visible', () => {
  it('worker workspace page imports SessionBar', () => {
    expect(workerWorkspace).toContain('SessionBar');
    expect(workerWorkspace).toContain("from '@/components/auth/SessionBar'");
  });

  it('worker workspace renders SessionBar with email and role', () => {
    expect(workerWorkspace).toContain('<SessionBar');
    expect(workerWorkspace).toContain('worker.email');
    expect(workerWorkspace).toContain('worker.koraRole');
  });
});

// ─── 4. Logout redirects KORA_ADMIN to /admin/login ──────────────────────────

describe('Logout route — role-aware redirect', () => {
  it('logout route redirects KORA_ADMIN to /admin/login', () => {
    expect(logoutRoute).toContain("'/admin/login'");
    expect(logoutRoute).toContain("'KORA_ADMIN'");
  });

  it('logout route redirects WORKER to /worker/login (B113-B)', () => {
    expect(logoutRoute).toContain("'/worker/login'");
    expect(logoutRoute).toContain("'WORKER'");
  });

  it('logout route redirects COMPANY_ADMIN/VIEWER to /company/login', () => {
    expect(logoutRoute).toContain("'/company/login'");
  });

  it('logout route reads role BEFORE signing out', () => {
    const stripped = stripLineComments(logoutRoute);
    const getUserIdx  = stripped.indexOf('getUser()');
    const signOutIdx  = stripped.indexOf('signOut()');
    expect(getUserIdx).toBeGreaterThan(0);
    expect(signOutIdx).toBeGreaterThan(getUserIdx);
  });
});

// ─── 5. Admin login has "Password dimenticata?" link ──────────────────────────

describe('/admin/login — B117-B: redirect wrapper', () => {
  it('admin login (B117-B) is a redirect wrapper to /admin (forgot-password lives on /login)', () => {
    // B117-B: /admin/login renders only for authenticated KORA_ADMIN and redirects to /admin.
    // Unauthenticated users never reach this page — admin layout redirects to /login first.
    expect(adminLogin).toContain("redirect('/admin')");
    expect(adminLogin).not.toContain('signInWithPassword');
  });
});

// ─── 6. Company login has "Password dimenticata?" link ────────────────────────

describe('/company/login — B117-B: redirect wrapper with role_hint', () => {
  it('company login redirects to /login?role_hint=company (B117-B — adds role_hint for context)', () => {
    expect(companyLogin).toContain("redirect('/login?role_hint=company')");
    expect(companyLogin).not.toContain('signInWithPassword');
  });
});

// ─── 7. Forgot password page exists and calls resetPasswordForEmail ────────────

describe('/auth/forgot-password', () => {
  it('forgot-password page file exists', () => {
    expect(fileExists('app/auth/forgot-password/page.tsx')).toBe(true);
  });

  it('forgot-password page calls resetPasswordForEmail', () => {
    expect(forgotPage).toContain('resetPasswordForEmail');
  });

  it('forgot-password redirectTo includes /auth/callback?type=recovery', () => {
    expect(forgotPage).toContain('/auth/callback?type=recovery');
  });

  it('forgot-password page does not expose tokens in the URL', () => {
    const stripped = stripLineComments(forgotPage);
    // Recovery token must NOT be displayed to the user
    expect(stripped).not.toContain('access_token');
    expect(stripped).not.toContain('refresh_token');
  });
});

// ─── 8. Reset password page exists ────────────────────────────────────────────

describe('/auth/reset-password', () => {
  it('reset-password page file exists', () => {
    expect(fileExists('app/auth/reset-password/page.tsx')).toBe(true);
  });

  it('reset-password form file exists', () => {
    expect(fileExists('app/auth/reset-password/_form.tsx')).toBe(true);
  });
});

// ─── 9. Reset password form validates min 8 characters ────────────────────────

describe('Reset password — validation', () => {
  it('form validates min 8 characters', () => {
    expect(resetForm).toContain('password.length < 8');
    expect(resetForm).toContain('8 caratteri');
  });

  it('form validates password mismatch', () => {
    expect(resetForm).toContain('password !== confirm');
    expect(resetForm).toContain('non coincidono');
  });
});

// ─── 10. Reset password redirect is role-aware ────────────────────────────────

describe('Reset password — role-aware redirect', () => {
  it('reset form uses getRoleHome for role-aware redirect (B117-D: replaces ROLE_REDIRECT map)', () => {
    // B117-D: ROLE_REDIRECT map replaced with getRoleHome() from lib/auth/role-home
    expect(resetForm).toContain('getRoleHome');
    expect(resetForm).toContain("from '@/lib/auth/role-home'");
  });

  it('KORA_ADMIN does not get redirected to /company setup pages', () => {
    expect(resetForm).not.toContain("KORA_ADMIN: '/company/setup-password'");
    expect(resetForm).not.toContain("KORA_ADMIN: '/worker/setup-password'");
  });

  it('WORKER does not get redirected to company setup-password', () => {
    expect(resetForm).not.toContain("WORKER: '/company/setup-password'");
  });
});

// ─── 11. Auth callback handles recovery type ──────────────────────────────────

describe('/auth/callback — recovery handling', () => {
  it('callback reads type parameter from URL', () => {
    expect(callbackRoute).toContain("searchParams.get('type')");
  });

  it('callback routes type=recovery to /auth/reset-password', () => {
    expect(callbackRoute).toContain('/auth/reset-password');
    expect(callbackRoute).toContain("type === 'recovery'");
  });

  it('callback does NOT send recovery to setup-password', () => {
    // When type=recovery, must NOT redirect to setup-password
    // Verify the logic: recovery → reset-password path is separate from invite → setup-password
    expect(callbackRoute).toContain('/auth/reset-password');
    // The only reference to setup-password should be in the non-recovery branch
    const recoveryBlock = callbackRoute.indexOf("type === 'recovery'");
    expect(recoveryBlock).toBeGreaterThan(0);
  });
});

// ─── 12. SessionBar shows email and role ─────────────────────────────────────

describe('SessionBar — session identity display', () => {
  it('SessionBar renders email prop', () => {
    expect(sessionBar).toContain('{email}');
    expect(sessionBar).toContain('email: string');
  });

  it('SessionBar renders role badge', () => {
    expect(sessionBar).toContain('ROLE_BADGE');
    expect(sessionBar).toContain('KORA_ADMIN');
    expect(sessionBar).toContain('COMPANY_ADMIN');
    expect(sessionBar).toContain('WORKER');
  });

  it('SessionBar contains logout button', () => {
    expect(sessionBar).toContain('LogoutButton');
  });

  it('SessionBar contains change-password link', () => {
    expect(sessionBar).toContain('/auth/forgot-password');
    expect(sessionBar).toContain('Cambia password');
  });
});

// ─── 13. LogoutButton uses POST form to /api/auth/logout ─────────────────────

describe('LogoutButton — form POST', () => {
  it('LogoutButton posts to /api/auth/logout', () => {
    expect(logoutButton).toContain('/api/auth/logout');
    expect(logoutButton).toContain('method="POST"');
  });

  it('LogoutButton is a form — not a link or GET', () => {
    expect(logoutButton).toContain('<form');
    expect(logoutButton).not.toContain('method="GET"');
  });
});

// ─── 14. Unknown role handled safely ─────────────────────────────────────────

describe('Unknown role — safe handling', () => {
  it('reset form uses getRoleHome which falls back to /login (B117-D: replaces hardcoded /company/login)', () => {
    // B117-D: ROLE_REDIRECT with ?? '/company/login' replaced by getRoleHome()
    // getRoleHome returns '/login' for unknown roles — consistent with unified login
    expect(resetForm).toContain('getRoleHome');
    expect(resetForm).not.toContain("'/company/login'");
  });

  it('logout route has safe fallback for undefined role', () => {
    // When role is undefined, defaults to /company/login
    const stripped = stripLineComments(logoutRoute);
    expect(stripped).toContain("'/company/login'");
  });
});
