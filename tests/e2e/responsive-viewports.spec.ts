/**
 * KORA-WP-088 — Authenticated multi-viewport responsive validation.
 *
 * This spec produces the evidence `KORA-GAP-RESPONSIVE-001` requires and that
 * the Founder made a hard precondition of WP-088 COMPLETE: the five role
 * environments (KORA Admin, Company, Worker, Partner, Advisor) rendered at
 * 375px / 768px / 1440px while authenticated.
 *
 * The three viewports are Playwright PROJECTS, not loops inside a test — see
 * playwright.config.ts. Running `npx playwright test responsive-viewports`
 * therefore executes every case once per viewport, and the project name in the
 * report IS the viewport evidence.
 *
 * CREDENTIALS ARE NEVER FABRICATED OR STORED. Every case reads them from the
 * environment via tests/e2e/helpers/env.ts and SKIPS with an explicit message
 * when they are absent — exactly the GOLDEN-02 contract. A green run with all
 * cases skipped is NOT validation and must never be reported as such.
 *
 * Target safety: guardE2ETarget() applies unchanged and runs FIRST. A deployed
 * Preview host must be named in E2E_ALLOWED_STAGING_HOSTS; E2E_ALLOW_PRODUCTION
 * alone is deliberately not sufficient.
 *
 * Vercel Deployment Protection: a protected Preview answers 302 -> vercel.com
 * /sso-api, which would make every case FAIL at login rather than skip.
 * applyProtectionBypass() attaches the official bypass header, host-scoped, and
 * only when VERCEL_AUTOMATION_BYPASS_SECRET is set. It gates Vercel's
 * deployment access only — KORA auth, roles and RLS are exercised for real.
 *
 * What is asserted is the WP-088 responsive contract, not pixel appearance:
 *   - the page never scrolls horizontally (the defect RESPONSIVE-001 names);
 *   - below md the sidebar is an off-canvas drawer behind an accessible
 *     toggle, and opening it is possible with a 44px-plus target;
 *   - at md and above the sidebar is the persistent 264px column and the
 *     mobile toggle is gone.
 */

import { test, expect, type Page } from 'playwright/test';
import {
  getAdminCredentials,
  getCompanyACredentials,
  getWorkerCredentials,
  getPartnerCredentials,
  getAdvisorCredentials,
} from './helpers/env';
import { guardE2ETarget } from './helpers/e2e-safety';
import { ROLE_HOME, ADVISOR_HOME } from './helpers/roles';
import { loginViaUI, assertReachedWorkspace } from './helpers/auth';
import { applyProtectionBypass } from './helpers/vercel-bypass';

const SIDEBAR_DRAWER_ID = 'kora-sidebar-drawer';

/** No horizontal scroll at any viewport — the core RESPONSIVE-001 acceptance. */
async function assertNoHorizontalOverflow(page: Page): Promise<void> {
  const overflow = await page.evaluate(() => {
    const d = document.documentElement;
    return { scrollWidth: d.scrollWidth, clientWidth: d.clientWidth };
  });
  expect(
    overflow.scrollWidth,
    `la pagina scrolla orizzontalmente (scrollWidth ${overflow.scrollWidth} > clientWidth ${overflow.clientWidth})`,
  ).toBeLessThanOrEqual(overflow.clientWidth + 1); // +1 absorbs sub-pixel rounding
}

/** The shared-chrome contract, which differs by design above and below `md`. */
async function assertChromeContract(page: Page): Promise<void> {
  const width = page.viewportSize()?.width ?? 0;
  // Matches Header.tsx's state-dependent aria-label ("Apri/Chiudi navigazione").
  const toggle = page.getByRole('button', { name: /(apri|chiudi) navigazione/i });
  const drawer = page.locator(`#${SIDEBAR_DRAWER_ID}`);

  if (width < 768) {
    await expect(toggle, 'sotto md il toggle del drawer deve essere visibile').toBeVisible();
    const box = await toggle.boundingBox();
    expect(box?.width ?? 0, 'target touch < 44px').toBeGreaterThanOrEqual(44);
    expect(box?.height ?? 0, 'target touch < 44px').toBeGreaterThanOrEqual(44);
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await expect(drawer).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  } else {
    await expect(toggle, 'da md in su il toggle mobile non deve comparire').toBeHidden();
    await expect(drawer, 'da md in su la sidebar è colonna persistente').toBeVisible();
  }
}

async function runRoleViewportCase(page: Page, home: string): Promise<void> {
  await assertReachedWorkspace(page, home);
  await assertNoHorizontalOverflow(page);
  await assertChromeContract(page);
}

test.describe('KORA-WP-088 — validazione responsive autenticata multi-viewport', () => {
  test('R01 · KORA Admin', async ({ page }) => {
    const guard = guardE2ETarget('responsive-viewports');
    test.skip(guard.blocked, guard.reason);
    const creds = getAdminCredentials();
    test.skip(!creds, 'E2E_KORA_ADMIN_EMAIL / E2E_KORA_ADMIN_PASSWORD non impostate — test saltato.');
    await applyProtectionBypass(page);
    await loginViaUI(page, creds!);
    await runRoleViewportCase(page, ROLE_HOME.ADMIN);
  });

  test('R02 · Company', async ({ page }) => {
    const guard = guardE2ETarget('responsive-viewports');
    test.skip(guard.blocked, guard.reason);
    const creds = getCompanyACredentials();
    test.skip(!creds, 'E2E_COMPANY_A_EMAIL / E2E_COMPANY_A_PASSWORD non impostate — test saltato.');
    await applyProtectionBypass(page);
    await loginViaUI(page, creds!);
    await runRoleViewportCase(page, ROLE_HOME.COMPANY);
  });

  test('R03 · Worker', async ({ page }) => {
    const guard = guardE2ETarget('responsive-viewports');
    test.skip(guard.blocked, guard.reason);
    const creds = getWorkerCredentials();
    test.skip(!creds, 'E2E_WORKER_EMAIL / E2E_WORKER_PASSWORD non impostate — test saltato.');
    await applyProtectionBypass(page);
    await loginViaUI(page, creds!);
    await runRoleViewportCase(page, ROLE_HOME.WORKER);
  });

  test('R04 · Partner', async ({ page }) => {
    const guard = guardE2ETarget('responsive-viewports');
    test.skip(guard.blocked, guard.reason);
    const creds = getPartnerCredentials();
    test.skip(!creds, 'E2E_PARTNER_EMAIL / E2E_PARTNER_PASSWORD non impostate — test saltato.');
    await applyProtectionBypass(page);
    await loginViaUI(page, creds!);
    await runRoleViewportCase(page, ROLE_HOME.PARTNER);
  });

  test('R05 · Advisor', async ({ page }) => {
    const guard = guardE2ETarget('responsive-viewports');
    test.skip(guard.blocked, guard.reason);
    const creds = getAdvisorCredentials();
    test.skip(!creds, 'E2E_ADVISOR_EMAIL / E2E_ADVISOR_PASSWORD non impostate — test saltato.');
    await applyProtectionBypass(page);
    // ADVISOR has no post-login redirect target (see LoginOptions) — navigate
    // to its guarded entry point explicitly. app/advisor/layout.tsx still
    // enforces requireAdvisorUser(), so this proves real authenticated access.
    await loginViaUI(page, creds!, { awaitRedirect: false });
    await page.goto(ADVISOR_HOME);
    await runRoleViewportCase(page, ADVISOR_HOME);
  });
});
