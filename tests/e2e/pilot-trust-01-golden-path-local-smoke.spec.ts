/**
 * PILOT-TRUST-01 (F-08) — golden path smoke test, LOCAL ONLY.
 *
 * Exercises, against a local Next.js dev server + local Supabase (Docker),
 * with fixtures created by scripts/e2e/seed-local-golden-path.ts:
 *   1. login (WORKER, COMPANY_ADMIN, KORA_ADMIN — a real Supabase Auth
 *      session, established via helpers/local-session.ts; see that file's
 *      header for exactly why a direct browser-form login cannot reach
 *      local Supabase here — a discovered CSP constraint, not a shortcut)
 *   2. correct dashboard reached per role
 *   3. tenant/role rendered correctly (company tenant code visible)
 *   4. no cross-role access (WORKER cannot reach /company/*, COMPANY_ADMIN
 *      cannot reach /worker/*)
 *   5. logout
 *   6. health endpoint 200
 *
 * WHAT THIS DOES NOT COVER (by design — see docs/PILOT_TRUST_01_E2E_EVIDENCE.md):
 *   The deeper data-bearing pipeline (dataset upload → intake accept → UEF
 *   generate/approve → run scoring → KORA Index → Decision Pack) is already
 *   implemented, end-to-end, by tests/e2e/golden-data-bearing.spec.ts (GD01).
 *   GD01 drives the real /login form directly, which requires a Supabase
 *   project reachable within the CSP connect-src allowlist (*.supabase.co) —
 *   i.e. a real staging/preview project, not local Docker Supabase. Running
 *   it is out of scope here ("non usare staging" is a hard constraint for
 *   this sprint) — not duplicated, not simulated.
 *
 * SAFETY:
 *   - Requires E2E_LOCAL_SUPABASE_URL to be a loopback host (enforced in
 *     helpers/local-session.ts) — refuses anything else outright.
 *   - Credentials come only from scripts/e2e/seed-local-golden-path.ts's
 *     generated .env.e2e-local-golden-path.local (gitignored) — never
 *     hardcoded, never committed.
 *   - Skips cleanly (zero requests) if the required env vars are absent.
 */

import { test, expect } from 'playwright/test';
import { readLocalSessionConfig, installLocalSession } from './helpers/local-session';

function getWorkerCredentials(): { email: string; password: string } | null {
  const email = process.env.E2E_WORKER_A_EMAIL;
  const password = process.env.E2E_WORKER_A_PASSWORD;
  if (!email || !password) return null;
  return { email, password };
}
function getCompanyCredentials(): { email: string; password: string; tenantCode?: string } | null {
  const email = process.env.E2E_COMPANY_A_EMAIL;
  const password = process.env.E2E_COMPANY_A_PASSWORD;
  if (!email || !password) return null;
  return { email, password, tenantCode: process.env.E2E_COMPANY_A_TENANT_CODE };
}
function getAdminCredentials(): { email: string; password: string } | null {
  const email = process.env.E2E_KORA_ADMIN_EMAIL;
  const password = process.env.E2E_KORA_ADMIN_PASSWORD;
  if (!email || !password) return null;
  return { email, password };
}

test.describe('PILOT-TRUST-01 — golden path smoke (local only)', () => {
  test('health endpoint returns 200 and reports the database reachable', async ({ request }) => {
    const response = await request.get('/api/health');
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.status).toBe('ok');
    expect(body.database).toBe('reachable');
  });

  test('WORKER: real local session reaches the worker workspace, sees own dashboard, cannot reach /company/*, logs out', async ({ browser }) => {
    const localConfig = readLocalSessionConfig();
    const workerCreds = getWorkerCredentials();
    test.skip(!localConfig || !workerCreds, 'E2E_LOCAL_SUPABASE_URL/ANON_KEY o E2E_WORKER_A_* non impostate — test saltato.');

    const context = await browser.newContext();
    await installLocalSession(context, localConfig!, workerCreds!.email, workerCreds!.password);
    const page = await context.newPage();

    await page.goto('/worker/workspace');
    await expect(page).toHaveURL(/\/worker\/workspace/, { timeout: 15_000 });
    await expect(page.getByTestId('workspace-page')).toBeVisible();
    await expect(page.getByTestId('session-bar')).toBeVisible();
    await expect(page.getByText(workerCreds!.email).first()).toBeVisible();

    // Cross-role: a WORKER session must never reach the company workspace.
    await page.goto('/company/workspace');
    await expect(page).not.toHaveURL(/\/company\/workspace/, { timeout: 15_000 });

    // Logout.
    await page.goto('/worker/workspace');
    await page.getByRole('button', { name: 'Esci' }).click();
    await page.waitForURL((url) => url.pathname.startsWith('/login') || url.pathname === '/', { timeout: 15_000 });

    await context.close();
  });

  test('COMPANY_ADMIN: real local session reaches the company workspace with the correct tenant, cannot reach /worker/*, logs out', async ({ browser }) => {
    const localConfig = readLocalSessionConfig();
    const companyCreds = getCompanyCredentials();
    test.skip(!localConfig || !companyCreds, 'E2E_LOCAL_SUPABASE_URL/ANON_KEY o E2E_COMPANY_A_* non impostate — test saltato.');

    const context = await browser.newContext();
    await installLocalSession(context, localConfig!, companyCreds!.email, companyCreds!.password);
    const page = await context.newPage();

    await page.goto('/company/workspace');
    await expect(page).toHaveURL(/\/company\/workspace/, { timeout: 15_000 });
    await expect(page.getByTestId('company-workspace-page')).toBeVisible();
    await expect(page.getByTestId('session-bar')).toBeVisible();

    if (companyCreds!.tenantCode) {
      await expect(page.getByTestId('company-tenant-code')).toHaveText(companyCreds!.tenantCode, { timeout: 15_000 });
    }

    // Cross-role: a COMPANY_ADMIN session must never reach the worker workspace.
    await page.goto('/worker/workspace');
    await expect(page).not.toHaveURL(/\/worker\/workspace/, { timeout: 15_000 });

    // Logout.
    await page.goto('/company/workspace');
    await page.getByRole('button', { name: 'Esci' }).click();
    await page.waitForURL((url) => url.pathname.startsWith('/login') || url.pathname === '/', { timeout: 15_000 });

    await context.close();
  });

  test('KORA_ADMIN: real local session reaches the admin home', async ({ browser }) => {
    const localConfig = readLocalSessionConfig();
    const adminCreds = getAdminCredentials();
    test.skip(!localConfig || !adminCreds, 'E2E_LOCAL_SUPABASE_URL/ANON_KEY o E2E_KORA_ADMIN_* non impostate — test saltato.');

    const context = await browser.newContext();
    await installLocalSession(context, localConfig!, adminCreds!.email, adminCreds!.password);
    const page = await context.newPage();

    await page.goto('/admin');
    await expect(page).toHaveURL(/\/admin/, { timeout: 15_000 });

    await context.close();
  });
});
