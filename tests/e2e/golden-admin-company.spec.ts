/**
 * GOLDEN-E2E-01 — Automated Admin-to-Company Golden Path
 *
 * Scope: the first automated test that chains the two halves of the
 * service-assisted pilot model in one narrative — KORA_ADMIN reaching the
 * admin workspace, and (separately, own browser context) COMPANY_ADMIN
 * reaching the company workspace and a real data/report surface
 * (`/company/kora-index`), with a privacy smoke check that the company view
 * never renders a worker-level identifier.
 *
 * This is deliberately NOT a duplicate of tests/e2e/authenticated-smoke.spec.ts
 * (A01–A04) — that file is fixture/infra validation for each role in
 * isolation, explicitly scoped as "NOT the full golden path E2E" in its own
 * header. This file is the golden-path narrative itself: it reuses the exact
 * same helpers (never re-implements login/env logic) but goes one step
 * further than login — into "is there a real data/report surface reachable,
 * and is it privacy-safe."
 *
 * WHAT THIS PROVES (when run with real credentials):
 *   - KORA_ADMIN can authenticate and the admin route guard lands them on
 *     the real admin workspace (requireKoraAdmin(), app/admin/layout.tsx).
 *   - COMPANY_ADMIN can authenticate and the company route guard lands them
 *     on the real company workspace (requireCompanyUser(), app/company/layout.tsx
 *     + app/company/workspace/layout.tsx, defense-in-depth).
 *   - From there, COMPANY_ADMIN can reach a real KORA Index/report surface
 *     (`/company/kora-index`) — i.e. tenant-scoped data/report availability,
 *     not just a login redirect.
 *   - Neither the company workspace nor the KORA Index page render an
 *     obvious worker-level identifier in their markup (smoke check only —
 *     see helpers/privacy.ts's own header for exactly what this does and
 *     does not prove).
 *
 * WHAT THIS DOES NOT PROVE:
 *   - Does NOT prove the full data pipeline (upload → UEF → scoring →
 *     Decision Pack) — that remains manual-only, tracked separately in
 *     docs/GOLDEN_PATH.md as still-open.
 *   - Does NOT prove RLS/DB-level tenant isolation — that is
 *     tests/integration/rls-two-tenant-negative.test.ts's job (RLS-03,
 *     merged via PR #26), which this file does not duplicate.
 *   - Does NOT prove cross-tenant separation (A04 already covers that, and
 *     requires a second tenant — COMPANY_B — which does not exist yet per
 *     docs/GOLDEN_PATH.md; not reproduced here).
 *   - Does NOT prove anything against Production — same E2E_BASE_URL +
 *     E2E_ALLOW_PRODUCTION guard as every other authenticated E2E file here.
 *   - The privacy check in this file is a markup smoke check, not proof of
 *     RLS enforcement — see helpers/privacy.ts.
 *
 * ENV VARS (identical to authenticated-smoke.spec.ts — no new names invented):
 *   E2E_BASE_URL, E2E_ALLOW_PRODUCTION,
 *   E2E_KORA_ADMIN_EMAIL, E2E_KORA_ADMIN_PASSWORD,
 *   E2E_COMPANY_A_EMAIL, E2E_COMPANY_A_PASSWORD, E2E_COMPANY_A_TENANT_CODE.
 * Every test below skips cleanly (zero network calls) if its required
 * credentials are absent — see docs/testing-e2e-auth.md.
 */

import { test, expect } from 'playwright/test';
import { getAdminCredentials, getCompanyACredentials, guardBaseUrl } from './helpers/env';
import { ROLE_HOME } from './helpers/roles';
import { loginViaUI, assertReachedWorkspace, getPrimaryHeadingText } from './helpers/auth';
import { assertNoWorkerLevelIdentifiers } from './helpers/privacy';

test.describe('KORA — Golden Path: KORA_ADMIN → tenant/company context → COMPANY_ADMIN workspace', () => {

  test('G01 · golden path — KORA_ADMIN reaches admin workspace, COMPANY_ADMIN reaches company workspace', async ({ browser }) => {
    const guard = guardBaseUrl();
    test.skip(guard.blocked, guard.reason);

    const adminCreds = getAdminCredentials();
    const companyCreds = getCompanyACredentials();
    test.skip(
      !adminCreds || !companyCreds,
      'E2E_KORA_ADMIN_* / E2E_COMPANY_A_* non impostate entrambe — test saltato.',
    );

    const adminContext = await browser.newContext();
    const companyContext = await browser.newContext();
    try {
      // Step 1 — KORA_ADMIN half of the pilot model: onboarding/data
      // intake/scoring/reporting is operated from here.
      const adminPage = await adminContext.newPage();
      await loginViaUI(adminPage, adminCreds!);
      await assertReachedWorkspace(adminPage, ROLE_HOME.ADMIN);
      await expect(adminPage.getByText('KORA Admin', { exact: false }).first()).toBeVisible();

      // Step 2 — COMPANY_ADMIN half: the tenant-safe view of whatever the
      // admin half produced. Own browser context — this is a genuinely
      // separate session, not the same page continuing.
      const companyPage = await companyContext.newPage();
      await loginViaUI(companyPage, companyCreds!);
      await assertReachedWorkspace(companyPage, ROLE_HOME.COMPANY);
      await expect(companyPage.getByText('Company Workspace', { exact: false }).first()).toBeVisible();
      await assertNoWorkerLevelIdentifiers(companyPage);
    } finally {
      await adminContext.close();
      await companyContext.close();
    }
  });

  test('G02 · COMPANY_ADMIN reaches the KORA Index data/report surface without a worker-level identifier leak', async ({ page }) => {
    const guard = guardBaseUrl();
    test.skip(guard.blocked, guard.reason);

    const creds = getCompanyACredentials();
    test.skip(!creds, 'E2E_COMPANY_A_EMAIL / E2E_COMPANY_A_PASSWORD non impostate — test saltato.');

    await loginViaUI(page, creds!);
    await assertReachedWorkspace(page, ROLE_HOME.COMPANY);

    // Tenant/company context proof: navigate past the bare workspace landing
    // into the actual KORA Index/report surface for this tenant.
    await page.goto('/company/kora-index');
    await expect(page).toHaveURL(/\/company\/kora-index/, { timeout: 15_000 });

    const heading = await getPrimaryHeadingText(page);
    expect(heading, 'KORA Index page must render a non-empty primary heading — proves the tenant-scoped data surface is reachable, not just a blank/error state').not.toEqual('');

    await assertNoWorkerLevelIdentifiers(page);
  });

});
