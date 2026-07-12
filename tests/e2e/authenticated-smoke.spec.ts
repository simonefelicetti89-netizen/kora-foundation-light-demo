/**
 * GOLDEN-02 — Authenticated E2E Smoke (Golden Path Fixtures)
 *
 * Scope: minimal authenticated login + landing-page checks for
 * KORA_ADMIN, COMPANY_A, and COMPANY_B, plus a tenant-separation check.
 *
 * This is fixture/infra validation, NOT the full golden path E2E.
 * No upload, no UEF review, no scoring run, no Decision Pack here —
 * that is GOLDEN-03+ scope.
 *
 * Requires real (non-production) test credentials via env vars — see
 * docs/testing-e2e-auth.md. Any test whose required env vars are missing
 * skips with a clear message instead of failing. If E2E_BASE_URL looks
 * like production, all tests skip unless E2E_ALLOW_PRODUCTION=true.
 */

import { test, expect } from 'playwright/test';
import {
  getAdminCredentials,
  getCompanyACredentials,
  getCompanyBCredentials,
} from './helpers/env';
import { guardE2ETarget } from './helpers/e2e-safety';
import { ROLE_HOME } from './helpers/roles';
import { loginViaUI, assertReachedWorkspace, getTenantIdentity } from './helpers/auth';

test.describe('KORA — Authenticated Smoke (Golden Path Fixtures)', () => {

  test('A01 · KORA_ADMIN accede e raggiunge il workspace admin', async ({ page }) => {
    const guard = guardE2ETarget('authenticated-smoke');
    test.skip(guard.blocked, guard.reason);

    const creds = getAdminCredentials();
    test.skip(!creds, 'E2E_KORA_ADMIN_EMAIL / E2E_KORA_ADMIN_PASSWORD non impostate — test saltato.');

    await loginViaUI(page, creds!);
    await assertReachedWorkspace(page, ROLE_HOME.ADMIN);
    await expect(page.getByText('KORA Admin', { exact: false }).first()).toBeVisible();
  });

  test('A02 · COMPANY_A accede e raggiunge il company workspace', async ({ page }) => {
    const guard = guardE2ETarget('authenticated-smoke');
    test.skip(guard.blocked, guard.reason);

    const creds = getCompanyACredentials();
    test.skip(!creds, 'E2E_COMPANY_A_EMAIL / E2E_COMPANY_A_PASSWORD non impostate — test saltato.');

    await loginViaUI(page, creds!);
    await assertReachedWorkspace(page, ROLE_HOME.COMPANY);
    await expect(page.getByText('Company Workspace', { exact: false }).first()).toBeVisible();
  });

  test('A03 · COMPANY_B accede e raggiunge il company workspace', async ({ page }) => {
    const guard = guardE2ETarget('authenticated-smoke');
    test.skip(guard.blocked, guard.reason);

    const creds = getCompanyBCredentials();
    test.skip(!creds, 'E2E_COMPANY_B_EMAIL / E2E_COMPANY_B_PASSWORD non impostate — test saltato.');

    await loginViaUI(page, creds!);
    await assertReachedWorkspace(page, ROLE_HOME.COMPANY);
    await expect(page.getByText('Company Workspace', { exact: false }).first()).toBeVisible();
  });

  test('A04 · COMPANY_A e COMPANY_B non condividono lo stesso contesto tenant', async ({ browser }) => {
    // Two sequential logins, each followed by a real wait for the tenant
    // identity fetch to settle (not a fixed sleep) — needs more headroom
    // than the 30s file-level default.
    test.setTimeout(60_000);

    const guard = guardE2ETarget('authenticated-smoke');
    test.skip(guard.blocked, guard.reason);

    const credsA = getCompanyACredentials();
    const credsB = getCompanyBCredentials();
    test.skip(
      !credsA || !credsB,
      'E2E_COMPANY_A_* / E2E_COMPANY_B_* non impostate entrambe — test saltato.'
    );

    const contextA = await browser.newContext();
    const contextB = await browser.newContext();
    try {
      const pageA = await contextA.newPage();
      const pageB = await contextB.newPage();

      await loginViaUI(pageA, credsA!);
      await assertReachedWorkspace(pageA, ROLE_HOME.COMPANY);
      const identityA = await getTenantIdentity(pageA);

      await loginViaUI(pageB, credsB!);
      await assertReachedWorkspace(pageB, ROLE_HOME.COMPANY);
      const identityB = await getTenantIdentity(pageB);

      // Prefer tenant code — STAGE-001 vs STAGE-002 — as it's a more stable
      // identity signal than the display name.
      const valueA = identityA.tenantCode ?? identityA.companyName;
      const valueB = identityB.tenantCode ?? identityB.companyName;

      expect(valueA, 'identità tenant COMPANY_A non deve essere vuota').not.toEqual('');
      expect(valueB, 'identità tenant COMPANY_B non deve essere vuota').not.toEqual('');
      expect(valueA, 'COMPANY_A e COMPANY_B non devono condividere lo stesso contesto tenant').not.toEqual(valueB);

      if (credsA!.tenantCode && identityA.tenantCode) {
        expect(identityA.tenantCode, 'tenant code COMPANY_A non corrisponde a E2E_COMPANY_A_TENANT_CODE')
          .toEqual(credsA!.tenantCode);
      }
      if (credsB!.tenantCode && identityB.tenantCode) {
        expect(identityB.tenantCode, 'tenant code COMPANY_B non corrisponde a E2E_COMPANY_B_TENANT_CODE')
          .toEqual(credsB!.tenantCode);
      }
    } finally {
      await contextA.close();
      await contextB.close();
    }
  });

});
