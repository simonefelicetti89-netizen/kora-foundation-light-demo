/**
 * GOLDEN-02 — Authenticated login helper for Playwright E2E fixtures.
 *
 * Drives the real unified /login form (no direct Supabase API calls, no
 * app auth code changes) so tests exercise the same path a real user does.
 *
 * Never logs credential values — only structural assertions (URL, headings).
 */

import { expect, type Page } from 'playwright/test';
import type { Credentials } from './env';

export interface LoginOptions {
  /**
   * Wait for the app to redirect away from /login after sign-in. Default true.
   *
   * KORA-WP-088: must be FALSE for ADVISOR. lib/auth/role-home.ts has no
   * ADVISOR branch — getRoleHome('ADVISOR') falls through to '/login' — so
   * app/login/page.tsx pushes an authenticated advisor straight back to
   * /login. The session IS valid; only the redirect target is missing. Waiting
   * for a navigation that never happens would time out and report a
   * responsive failure that is really a routing gap. The caller navigates to
   * the advisor entry point explicitly instead.
   */
  awaitRedirect?: boolean;
}

export async function loginViaUI(
  page: Page,
  credentials: Credentials,
  options: LoginOptions = {},
): Promise<void> {
  const { awaitRedirect = true } = options;
  await page.goto('/login');
  await page.getByTestId('login-email-input').fill(credentials.email);
  await page.getByTestId('login-password-input').fill(credentials.password);
  await page.getByTestId('login-submit').click();
  if (!awaitRedirect) {
    // Sign-in is asynchronous; give the Supabase session time to settle before
    // the caller navigates. The submit button leaving its pending state is the
    // app's own signal that the auth round-trip finished.
    await page.waitForLoadState('networkidle');
    return;
  }
  // Wait until the app navigates away from /login (redirect happens after
  // Supabase confirms the session and role is resolved).
  await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 15_000 });
}

export async function assertReachedWorkspace(page: Page, expectedPathPrefix: string): Promise<void> {
  await expect(page, `atteso reindirizzamento a "${expectedPathPrefix}"`)
    .toHaveURL(new RegExp(`${escapeRegExp(expectedPathPrefix)}`), { timeout: 15_000 });
}

/** Reads the page's primary heading text — used for tenant-separation checks. */
export async function getPrimaryHeadingText(page: Page): Promise<string> {
  const heading = page.getByRole('heading', { level: 1 }).first();
  await expect(heading).toBeVisible({ timeout: 15_000 });
  return (await heading.textContent())?.trim() ?? '';
}

export interface TenantIdentity {
  tenantCode: string | null;
  companyName: string;
}

/**
 * Reads the company workspace's tenant identity once it has actually loaded.
 * The heading renders a '…' placeholder while the workspace fetch is in
 * flight, so waiting only for visibility (as getPrimaryHeadingText does) can
 * race the fetch and return the placeholder for every tenant. This waits on
 * the tenant-code test id — which the app only renders after load — as the
 * settle signal, falling back to the heading clearing the placeholder if no
 * tenant code is present.
 */
export async function getTenantIdentity(page: Page): Promise<TenantIdentity> {
  const codeLocator = page.getByTestId('company-tenant-code');
  const nameLocator = page.getByTestId('company-tenant-name');

  const codeAppeared = await codeLocator
    .waitFor({ state: 'visible', timeout: 15_000 })
    .then(() => true)
    .catch(() => false);

  if (codeAppeared) {
    const tenantCode = (await codeLocator.textContent())?.trim() ?? null;
    const companyName = (await nameLocator.textContent())?.trim() ?? '';
    return { tenantCode, companyName };
  }

  await expect(nameLocator, 'nome tenant non deve restare bloccato sul placeholder di caricamento')
    .not.toHaveText('…', { timeout: 15_000 });
  const companyName = (await nameLocator.textContent())?.trim() ?? '';
  return { tenantCode: null, companyName };
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
