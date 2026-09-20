// tests/unit/kora-wp-088-advisor-role-home.test.ts
// KORA-WP-088 — ADVISOR role-home defect remediation (Founder Decision 1).
//
// THE DEFECT: lib/auth/role-home.ts had no ADVISOR branch, so
// getRoleHome('ADVISOR') fell through to the catch-all '/login'. Every
// getRoleHome() consumer — app/login/page.tsx:84, app/auth/reset-password,
// app/account — therefore sent an authenticated advisor back to the page they
// had just signed in on. The session was valid; only the destination was
// missing. The /advisor route tree has existed and been guarded by
// requireAdvisorUser() since KORA-WP-030, so this is a defect fix, not a new
// surface, and it does not touch the WP-073 five-environment IA decision.
//
// Found while preparing the WP-088 authenticated multi-viewport validation:
// the Advisor case could never have passed, and the harness had briefly
// worked around it. The workaround is removed; the product is fixed instead.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { getRoleHome } from '@/lib/auth/role-home';

const ROOT = process.cwd();
const read = (rel: string) => readFileSync(join(ROOT, rel), 'utf-8');

describe('KORA-WP-088 — ADVISOR resolves to its canonical home', () => {
  it('getRoleHome("ADVISOR") is /advisor', () => {
    expect(getRoleHome('ADVISOR')).toBe('/advisor');
  });

  it('an authenticated ADVISOR is never routed back to /login', () => {
    // The defect, stated as the property that must never hold again.
    expect(getRoleHome('ADVISOR')).not.toBe('/login');
  });

  it('the resolved home is the route tree requireAdvisorUser() actually guards', () => {
    const home = getRoleHome('ADVISOR');
    const layout = read('app/advisor/layout.tsx');
    expect(layout).toContain('requireAdvisorUser');
    expect(home).toBe('/advisor');
    // The guard redirects unauthenticated users to the login page with the
    // advisor hint — so the two halves of the round trip agree.
    expect(layout).toContain("role_hint=advisor");
  });
});

describe('KORA-WP-088 — the fix does not weaken the CC-00 fail-closed rule', () => {
  const roleHome = read('lib/auth/role-home.ts');

  it('unknown and retired roles still fall through to /login', () => {
    expect(getRoleHome('DEMO_VIEWER')).toBe('/login');
    expect(getRoleHome('COMPANY_VIEWER')).toBe('/login');
    expect(getRoleHome('NOT_A_ROLE')).toBe('/login');
    expect(getRoleHome(undefined)).toBe('/login');
    expect(getRoleHome('')).toBe('/login');
    expect(roleHome).toContain("return '/login';");
  });

  it('every mapping is an exact-equality branch — no prefix or fallback matching', () => {
    for (const role of ['KORA_ADMIN', 'COMPANY_ADMIN', 'WORKER', 'PARTNER', 'ADVISOR']) {
      expect(roleHome).toContain(`role === '${role}'`);
    }
    // A lowercase or partial variant must not resolve to a privileged home.
    expect(getRoleHome('advisor')).toBe('/login');
    expect(getRoleHome('KORA_ADMIN_X')).toBe('/login');
  });

  it('the four pre-existing mappings are unchanged', () => {
    expect(getRoleHome('KORA_ADMIN')).toBe('/admin');
    expect(getRoleHome('COMPANY_ADMIN')).toBe('/company/workspace');
    expect(getRoleHome('WORKER')).toBe('/worker/onboarding');
    expect(getRoleHome('PARTNER')).toBe('/partner/workspace');
  });
});

describe('KORA-WP-088 — the E2E harness no longer works around the defect', () => {
  it('loginViaUI has no awaitRedirect escape hatch', () => {
    const auth = read('tests/e2e/helpers/auth.ts');
    expect(auth).not.toContain('awaitRedirect');
    expect(auth).not.toContain('LoginOptions');
  });

  it('R05 uses the normal login flow and proves the real product routing', () => {
    const spec = read('tests/e2e/responsive-viewports.spec.ts');
    expect(spec).not.toContain('awaitRedirect');
    // Advisor must go through the same single-argument loginViaUI as the rest.
    expect((spec.match(/await loginViaUI\(page, creds!\);/g) ?? []).length).toBe(5);
    // And must assert it landed on the advisor home by the product's own redirect.
    expect(spec).toContain('ADVISOR_HOME');
  });

  it('ADVISOR_HOME in the E2E helpers now agrees with the app mapping', () => {
    const roles = read('tests/e2e/helpers/roles.ts');
    expect(roles).toContain("getRoleHome('ADVISOR')");
    expect(getRoleHome('ADVISOR')).toBe('/advisor');
  });
});
