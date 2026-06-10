// tests/unit/b113b-worker-login-route.test.ts
// B113-B: Worker Login Route Separation & Auth UX Fix — 16 structural tests.
// Verifies that no worker is routed to /company/login as their primary auth entry.

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

// ─── Source files ─────────────────────────────────────────────────────────────

const workerLogin     = readFile('app/worker/login/page.tsx');
const workerLayout    = readFile('app/worker/layout.tsx');
const workerWorkspace = readFile('app/worker/workspace/page.tsx');
const workerOnboarding = readFile('app/worker/onboarding/page.tsx');
const logoutRoute     = readFile('app/api/auth/logout/route.ts');
const companyLogin    = readFile('app/company/login/page.tsx');
const middleware      = readFile('middleware.ts');
const forgotPassword  = readFile('app/auth/forgot-password/page.tsx');
const setupForm       = readFile('app/worker/setup-password/_form.tsx');

// ─── 1. /worker/login — B117: redirect wrapper to /login ─────────────────────
// B113-B built /worker/login as a standalone form.
// B117 replaced it with a redirect wrapper to the unified /login page.
// Role-based routing after auth is now handled by /login + getRoleHome().

describe('/worker/login — B117: redirect wrapper to unified /login', () => {
  it('file exists at app/worker/login/page.tsx', () => {
    expect(fileExists('app/worker/login/page.tsx')).toBe(true);
  });

  it('page redirects to /login?role_hint=worker (B117-B adds role_hint for contextual copy)', () => {
    expect(workerLogin).toContain("redirect('/login?role_hint=worker')");
  });

  it('page does not contain standalone signInWithPassword (role logic moved to /login)', () => {
    expect(workerLogin).not.toContain('signInWithPassword');
  });

  it('page does not contain useState (no form state — it is a redirect)', () => {
    expect(workerLogin).not.toContain('useState');
  });
});

// ─── 2. Worker routes redirect to /worker/login ───────────────────────────────

// ─── 2. Worker routes — B117-B: redirect to /login ──────────────────────────
// B117-B: Worker layout and pages redirect to /login (not /worker/login).
// This breaks the loop: /worker/login inside WorkerLayout → WorkerLayout redirected
// back to /worker/login → infinite loop. Now: all unauthenticated → /login (public).

describe('Worker routes — B117-B: redirect to /login (unified, breaks loop)', () => {
  it('worker layout (B117-B) redirects unauthenticated to /login (not /worker/login)', () => {
    expect(workerLayout).toContain("redirect('/login')");
    expect(workerLayout).not.toContain("redirect('/worker/login')");
    expect(workerLayout).not.toContain("redirect('/company/login')");
  });

  it('worker workspace (B117-B) redirects unauthenticated to /login', () => {
    expect(workerWorkspace).toContain("redirect('/login')");
    expect(workerWorkspace).not.toContain("redirect('/worker/login')");
    expect(workerWorkspace).not.toContain("redirect('/company/login')");
  });

  it('worker onboarding (B117-B) redirects unauthenticated to /login', () => {
    expect(workerOnboarding).toContain("redirect('/login')");
    expect(workerOnboarding).not.toContain("redirect('/worker/login')");
    expect(workerOnboarding).not.toContain("redirect('/company/login')");
  });
});

// ─── 3. Logout redirects WORKER to /worker/login ─────────────────────────────

describe('Logout route — worker logout destination', () => {
  it('logout route redirects WORKER to /worker/login', () => {
    expect(logoutRoute).toContain("'/worker/login'");
    expect(logoutRoute).toContain("'WORKER'");
  });

  it('logout route still redirects COMPANY roles to /company/login', () => {
    expect(logoutRoute).toContain("'/company/login'");
  });

  it('logout route still redirects KORA_ADMIN to /admin/login', () => {
    expect(logoutRoute).toContain("'/admin/login'");
  });
});

// ─── 4. /company/login — B117: redirect wrapper to /login ────────────────────
// B117 replaced /company/login with a redirect to the unified /login page.
// Role rejection is now handled by /login after auth — no per-role login pages.

describe('/company/login — B117-B: redirect wrapper with role_hint', () => {
  it('company login redirects to /login?role_hint=company (B117-B)', () => {
    expect(companyLogin).toContain("redirect('/login?role_hint=company')");
  });

  it('company login does not contain signInWithPassword (logic moved to /login)', () => {
    expect(companyLogin).not.toContain('signInWithPassword');
  });

  it('company login does not contain useState (no form state — it is a redirect)', () => {
    expect(companyLogin).not.toContain('useState');
  });
});

// ─── 5. Middleware — worker allowed prefixes ─────────────────────────────────

describe('Middleware — WORKER_ALLOWED_PREFIXES', () => {
  it('WORKER_ALLOWED_PREFIXES does NOT include /company/login', () => {
    const workerSection = middleware.split('WORKER_ALLOWED_PREFIXES')[1]?.split('];')[0] ?? '';
    expect(workerSection).not.toContain("'/company/login'");
  });

  it('WORKER_ALLOWED_PREFIXES includes /worker/ (covers /worker/login)', () => {
    const workerSection = middleware.split('WORKER_ALLOWED_PREFIXES')[1]?.split('];')[0] ?? '';
    expect(workerSection).toContain("'/worker/'");
  });
});

// ─── 6. forgot-password supports ?from=worker ────────────────────────────────

describe('/auth/forgot-password — worker back link', () => {
  it('forgot-password reads ?from=worker param', () => {
    expect(forgotPassword).toContain("from=worker");
    expect(forgotPassword).toContain('fromWorker');
  });

  it('forgot-password shows /login?role_hint=worker as back link when from=worker (B117-D: updated from /worker/login)', () => {
    // B117-D: back link updated to unified login with role_hint — /worker/login is still a redirect wrapper
    expect(forgotPassword).toContain("'/login?role_hint=worker'");
  });
});

// ─── 7. setup-password redirects to onboarding (not workspace) ───────────────

describe('Worker setup-password — redirect chain', () => {
  it('setup-password redirects to /worker/onboarding after success', () => {
    expect(setupForm).toContain("'/worker/onboarding'");
  });

  it('setup-password does NOT redirect directly to /worker/workspace', () => {
    const stripped = stripLineComments(setupForm);
    expect(stripped).not.toContain("router.push('/worker/workspace')");
  });
});
