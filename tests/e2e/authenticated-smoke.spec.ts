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
  guardBaseUrl,
} from './helpers/env';
import { ROLE_HOME } from './helpers/roles';
import { loginViaUI, assertReachedWorkspace, getPrimaryHeadingText } from './helpers/auth';

test.describe('KORA — Authenticated Smoke (Golden Path Fixtures)', () => {

  test('A01 · KORA_ADMIN accede e raggiunge il workspace admin', async ({ page }) => {
    const guard = guardBaseUrl();
    test.skip(guard.blocked, guard.reason);

    const creds = getAdminCredentials();
    test.skip(!creds, 'E2E_KORA_ADMIN_EMAIL / E2E_KORA_ADMIN_PASSWORD non impostate — test saltato.');

    await loginViaUI(page, creds!);
    await assertReachedWorkspace(page, ROLE_HOME.ADMIN);
    await expect(page.getByText('KORA Admin', { exact: false }).first()).toBeVisible();
  });

  test('A02 · COMPANY_A accede e raggiunge il company workspace', async ({ page }) => {
    const guard = guardBaseUrl();
    test.skip(guard.blocked, guard.reason);

    const creds = getCompanyACredentials();
    test.skip(!creds, 'E2E_COMPANY_A_EMAIL / E2E_COMPANY_A_PASSWORD non impostate — test saltato.');

    await loginViaUI(page, creds!);
    await assertReachedWorkspace(page, ROLE_HOME.COMPANY);
    await expect(page.getByText('Company Workspace', { exact: false }).first()).toBeVisible();
  });

  test('A03 · COMPANY_B accede e raggiunge il company workspace', async ({ page }) => {
    const guard = guardBaseUrl();
    test.skip(guard.blocked, guard.reason);

    const creds = getCompanyBCredentials();
    test.skip(!creds, 'E2E_COMPANY_B_EMAIL / E2E_COMPANY_B_PASSWORD non impostate — test saltato.');

    await loginViaUI(page, creds!);
    await assertReachedWorkspace(page, ROLE_HOME.COMPANY);
    await expect(page.getByText('Company Workspace', { exact: false }).first()).toBeVisible();
  });

  test('A04 · COMPANY_A e COMPANY_B non condividono lo stesso contesto tenant', async ({ browser }) => {
    const guard = guardBaseUrl();
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
      const nameA = await getPrimaryHeadingText(pageA);

      await loginViaUI(pageB, credsB!);
      await assertReachedWorkspace(pageB, ROLE_HOME.COMPANY);
      const nameB = await getPrimaryHeadingText(pageB);

      expect(nameA, 'nome tenant COMPANY_A non deve essere vuoto').not.toEqual('');
      expect(nameB, 'nome tenant COMPANY_B non deve essere vuoto').not.toEqual('');
      expect(nameA, 'COMPANY_A e COMPANY_B non devono mostrare lo stesso nome tenant').not.toEqual(nameB);
    } finally {
      await contextA.close();
      await contextB.close();
    }
  });

});
