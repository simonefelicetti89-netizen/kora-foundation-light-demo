/**
 * Gate 2 Phase 1 — Auth Password Reset assertions.
 *
 * Verifies that docs/GATE2_PHASE1_VALID_AUTH_USERS_READY.md correctly documents
 * the Auth Admin API password reset: method used, no secrets printed, no commits,
 * no users created/deleted, metadata unchanged, worker_identity links unchanged,
 * migration state preserved, ready for browser smoke.
 *
 * No SQL executed. No DB touched. No migration applied.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const DOC_PATH = 'docs/GATE2_PHASE1_VALID_AUTH_USERS_READY.md';

function doc(): string {
  return readFileSync(resolve(process.cwd(), DOC_PATH), 'utf-8');
}

// ── 1. Auth Admin API password reset documented ───────────────────────────────

describe('gate2-auth-password-reset — method', () => {
  it('doc references Auth Admin API for password reset', () => {
    expect(doc()).toMatch(/Auth Admin API/i);
  });

  it('doc references the admin users endpoint', () => {
    expect(doc()).toMatch(/\/auth\/v1\/admin\/users/);
  });

  it('doc states no direct INSERT into auth.users', () => {
    expect(doc()).toMatch(/no direct.*INSERT|INSERT.*auth\.users.*not used|no direct `INSERT`/i);
  });
});

// ── 2. Secrets not printed ────────────────────────────────────────────────────

describe('gate2-auth-password-reset — secrets hygiene', () => {
  it('doc states passwords were not printed', () => {
    expect(doc()).toMatch(/not printed/i);
  });

  it('doc states passwords were not committed', () => {
    expect(doc()).toMatch(/not committed/i);
  });

  it('doc contains no JWT token literals (eyJ…)', () => {
    expect(doc()).not.toMatch(/eyJ[A-Za-z0-9_-]{20,}/);
  });

  it('doc contains no service_role key literals (long random base64 strings after "key:")', () => {
    // Service role keys are typically 100+ char base64 strings
    expect(doc()).not.toMatch(/key["\s:]+[A-Za-z0-9+/=]{40,}/i);
  });

  it('doc contains no connection string literals', () => {
    expect(doc()).not.toMatch(/postgresql:\/\/[^\s]+:[^\s]+@/i);
  });

  it('doc states local password file remains untracked/gitignored', () => {
    expect(doc()).toMatch(/gitignored|untracked/i);
  });
});

// ── 3. No users created or deleted ───────────────────────────────────────────

describe('gate2-auth-password-reset — user integrity', () => {
  it('doc states no users created', () => {
    expect(doc()).toMatch(/no users created/i);
  });

  it('doc states no users deleted', () => {
    expect(doc()).toMatch(/no users.*deleted|no.*deleted/i);
  });

  it('doc states metadata unchanged', () => {
    expect(doc()).toMatch(/metadata.*unchanged|unchanged.*metadata/i);
  });

  it('doc states worker_identity links unchanged', () => {
    expect(doc()).toMatch(/worker_identity.*unchanged|unchanged.*worker_identity/i);
  });
});

// ── 4. Migration state ────────────────────────────────────────────────────────

describe('gate2-auth-password-reset — migration state', () => {
  it('doc confirms migration 027 not applied', () => {
    expect(doc()).toMatch(/027.*NOT applied|NOT applied.*027/i);
  });

  it('doc confirms migration 029 not applied', () => {
    expect(doc()).toMatch(/029.*NOT applied|NOT applied.*029/i);
  });
});

// ── 5. Browser smoke readiness ────────────────────────────────────────────────

describe('gate2-auth-password-reset — smoke readiness', () => {
  it('doc references browser smoke or UI smoke tests', () => {
    expect(doc()).toMatch(/browser smoke|UI smoke|smoke test/i);
  });

  it('doc confirms sign-in test results per email', () => {
    expect(doc()).toMatch(/sign-in OK|sign-in result|sign-in test/i);
  });

  it('doc covers all four staging users', () => {
    const content = doc();
    expect(content).toMatch(/company-admin@staging\.kora\.internal/);
    expect(content).toMatch(/worker-a@staging\.kora\.internal/);
    expect(content).toMatch(/worker-b@staging\.kora\.internal/);
    expect(content).toMatch(/worker-c@staging\.kora\.internal/);
  });
});

// ── 6. Script hygiene ─────────────────────────────────────────────────────────

describe('gate2-auth-password-reset — script hygiene', () => {
  it('reset script is gitignored (not tracked)', () => {
    // Git hygiene: verify .tmp/ is listed in .gitignore (so the script is never tracked)
    // and that the passwords file is absent from the committed tests/ directory.
    // We do NOT assert the script exists locally — it is absent on clean clones by design.
    const gitignore = readFileSync(resolve(process.cwd(), '.gitignore'), 'utf-8');
    expect(gitignore).toMatch(/\.tmp\//);
    expect(existsSync(resolve(process.cwd(), 'tests/.env.staging.passwords.local'))).toBe(false);
  });

  it('.env.staging.passwords.local is not committed to tests/', () => {
    expect(existsSync(resolve(process.cwd(), 'tests/.env.staging.passwords.local'))).toBe(false);
  });

  it('.env.staging.local is not committed to tests/', () => {
    expect(existsSync(resolve(process.cwd(), 'tests/.env.staging.local'))).toBe(false);
  });
});
