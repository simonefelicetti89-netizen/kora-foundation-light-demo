/**
 * GOLDEN-E2E-02/03/04 — Authenticated Staging Data-Bearing Golden Path
 *
 * GOLDEN-E2E-04 (PILOT-E2E-GOLDEN-PATH-01): added an explicit positive
 * assertion that the intake page renders the selected tenantCode (not just
 * the absence of synthetic-tenant copy), and a Decision Pack PDF check that
 * calls `/api/admin/decision-pack/pdf` directly (no live-flow UI button links
 * there) and accepts either a real PDF (200, application/pdf, non-trivial
 * size) or the route's own documented 501 fallback — whichever staging
 * actually supports, proven dynamically rather than assumed.
 *
 * GOLDEN-E2E-03: structural interactions (which element to click/fill) now
 * use stable `data-testid` selectors added to the real components
 * (DataIntakeStudio.tsx, UefReviewQueue.tsx, CompanyWorkspaceView.tsx,
 * app/company/kora-index/page.tsx, lib/decision-pack/html-template.ts) —
 * see each file's `data-testid` for the full list. Content/outcome
 * assertions (success text, canonical labels, KORA Index/Safeguard values,
 * privacy checks) deliberately remain text-based, since those verify actual
 * product copy/behavior rather than which element to interact with.
 *
 * Scope: the first automated E2E that drives the actual data-bearing pipeline —
 * upload → dry-run validate → accept batch → generate UEF candidates → bulk
 * approve → run scoring → Decision Pack → COMPANY_ADMIN tenant-safe visibility.
 *
 * This is the gap `golden-admin-company.spec.ts` (GOLDEN-E2E-01) explicitly
 * left open: that file proves admin/company workspace reachability and that
 * `/company/kora-index` is a real per-tenant surface, but does not drive the
 * pipeline itself. This file does.
 *
 * WHAT THIS PROVES (when run with real credentials against staging):
 *   - KORA_ADMIN can upload the golden-path sample CSV
 *     (`data/golden-path/kora_golden_path_upload.csv`) to a real tenant via
 *     the actual `/admin/data-intake` UI (dry-run validate → accept batch),
 *     not a mock.
 *   - The created batch reaches UEF Review, candidates can be generated and
 *     bulk-approved through `/admin/uef-review`.
 *   - Scoring can be run from approved UEF records and produces a KORA
 *     Index / Confidence Score / Activation Safeguard — i.e. the pipeline
 *     described in `docs/GOLDEN_PATH_RUNBOOK.md` actually executes end to
 *     end, not just its individual API routes in isolation.
 *   - The resulting Decision Pack HTML preview shows the canonical
 *     `KORA Foundation Light` / `KORA Index v1.0` / `pre_empirical_calibration`
 *     labels (doc 21b non-suppressible requirement).
 *   - The intake page explicitly shows the tenantCode this run selected —
 *     not just the absence of demo/synthetic-tenant copy.
 *   - Decision Pack PDF generation, if the staging runtime supports it,
 *     produces a real non-trivial PDF; if not, the route's own documented
 *     501 fallback (pointing back at the HTML preview) fires correctly —
 *     whichever is true for this environment, not an assumed outcome.
 *   - COMPANY_ADMIN, in a separate browser context/session, reaches
 *     `/company/workspace` and `/company/kora-index` afterward without a
 *     worker-level identifier leak in the rendered markup.
 *
 * WHAT THIS DOES NOT PROVE:
 *   - Does NOT prove the COMPANY_ADMIN view reflects *this specific* scoring
 *     run's exact numeric value — company workspace shows the latest
 *     `kora_index_result` row for the tenant by `created_at`, which this run
 *     should produce, but the assertions here are structural (reachable,
 *     privacy-safe), not a numeric equality check against this run's score.
 *   - Does NOT prove RLS/DB-level tenant isolation (see
 *     `tests/integration/rls-two-tenant-negative.test.ts`, RLS-03).
 *   - Does NOT prove anything against Production — same base-URL guard as
 *     every other authenticated E2E file here.
 *   - The privacy check is a markup smoke check (`helpers/privacy.ts`), not
 *     proof of RLS enforcement.
 *
 * MUTATION WARNING — this test is not read-only:
 *   Every run creates a new `analytics.source_batch` row (and downstream UEF
 *   records / kora_index_result / decision pack) on whatever tenant
 *   E2E_COMPANY_A_TENANT_CODE points at. A fresh `reportingPeriod` is used
 *   per run (see below) specifically to dodge the accept route's exact-match
 *   duplicate-batch guard — repeated runs are expected to accumulate batches
 *   on that tenant over time, same as repeated manual runbook walkthroughs
 *   would. Use a disposable/synthetic staging tenant, never a real client's.
 *
 * ENV VARS:
 *   E2E_BASE_URL, E2E_ALLOW_PRODUCTION (same as every other authenticated
 *   E2E file here — see docs/testing-e2e-auth.md),
 *   E2E_KORA_ADMIN_EMAIL, E2E_KORA_ADMIN_PASSWORD,
 *   E2E_COMPANY_A_EMAIL, E2E_COMPANY_A_PASSWORD, E2E_COMPANY_A_TENANT_CODE
 *     (tenant code is REQUIRED here, unlike the read-only fixtures, since
 *     the upload step needs a tenant to target),
 *   E2E_GOLDEN_DATA_BEARING_ALLOW_RUN=true — an explicit second gate on top
 *     of the credentials above, required because this test mutates real
 *     tenant data (mirrors the RLS03_ALLOW_RUN / RLS05_ALLOW_RUN convention
 *     already used in this repo for higher-risk test tiers — see
 *     helpers/env.ts).
 * Skips cleanly (zero network calls) if any of the above is missing.
 */

import { test, expect } from 'playwright/test';
import path from 'node:path';
import {
  getAdminCredentials,
  getCompanyACredentials,
} from './helpers/env';
import { guardE2ETarget, guardGoldenDataBearingRun } from './helpers/e2e-safety';
import { ROLE_HOME } from './helpers/roles';
import { loginViaUI, assertReachedWorkspace } from './helpers/auth';
import { assertNoWorkerLevelIdentifiers } from './helpers/privacy';

const GOLDEN_PATH_CSV = path.join(process.cwd(), 'data/golden-path/kora_golden_path_upload.csv');
// Matches data/golden-path/README.md's documented workforcePopulation for
// this specific fixture (kora_golden_path_upload.csv → 300).
const WORKFORCE_POPULATION = '300';

test.describe('KORA — Golden Path: data-bearing pipeline (upload → UEF → scoring → Decision Pack → company visibility)', () => {

  test('GD01 · KORA_ADMIN drives upload→UEF→scoring→Decision Pack, then COMPANY_ADMIN sees the tenant-safe result', async ({ browser }) => {
    test.setTimeout(180_000);

    const guard = guardE2ETarget('golden-data-bearing');
    test.skip(guard.blocked, guard.reason);

    const adminCreds = getAdminCredentials();
    const companyCreds = getCompanyACredentials();
    test.skip(
      !adminCreds || !companyCreds || !companyCreds.tenantCode,
      'E2E_KORA_ADMIN_* / E2E_COMPANY_A_* / E2E_COMPANY_A_TENANT_CODE non impostate tutte — test saltato.',
    );
    const goldenDataBearingGuard = guardGoldenDataBearingRun();
    test.skip(goldenDataBearingGuard.blocked, goldenDataBearingGuard.reason);

    const tenantCode = companyCreds!.tenantCode!;
    // Fresh per run — dodges the accept route's exact-duplicate-batch guard
    // (tenant_id, reporting_period, source_name all equal → 409) since the
    // UI always sends the same source_name for this fixture file, and lets
    // the UEF Review batch card below be scoped unambiguously by text.
    const reportingPeriod = `E2E-DATA-BEARING-${Date.now()}`;

    const adminContext = await browser.newContext();
    try {
      const adminPage = await adminContext.newPage();
      await loginViaUI(adminPage, adminCreds!);
      await assertReachedWorkspace(adminPage, ROLE_HOME.ADMIN);

      // ── Step 1 — Data Intake: dry-run validate → accept batch ──────────────
      // tenantCode/reportingPeriod pre-filled via query params (DataIntakeStudio
      // reads searchParams on mount) — avoids depending on whether the tenant
      // selector renders as a <select> (populated) or a text <input> (empty
      // tenant list), since both bind to the same underlying state either way.
      await adminPage.goto(
        `/admin/data-intake?tenantCode=${encodeURIComponent(tenantCode)}&reportingPeriod=${encodeURIComponent(reportingPeriod)}`,
      );
      await expect(adminPage.getByTestId('admin-data-intake-page')).toBeVisible();
      await expect(adminPage.getByText('Synthetic demo tenant', { exact: false })).toHaveCount(0);
      // Positive tenant-selection proof — the header renders "Synthetic Live v1
      // · {TENANT} · {PERIOD}" (DataIntakeStudio.tsx). Asserting the exact
      // tenantCode is visible (not just "not synthetic") proves the intake
      // actually targets the tenant this run selected, not merely some tenant.
      await expect(adminPage.getByText(tenantCode, { exact: false }).first()).toBeVisible();

      await adminPage.getByTestId('data-intake-upload-input').setInputFiles(GOLDEN_PATH_CSV);
      await adminPage.getByTestId('data-intake-dry-run-button').click();
      await expect(adminPage.getByText('File validation passed', { exact: false }).first())
        .toBeVisible({ timeout: 30_000 });

      for (let i = 0; i < 4; i++) {
        await adminPage.getByTestId(`data-intake-pseudonymization-checkbox-${i}`).check();
      }

      await adminPage.getByTestId('data-intake-accept-batch-button').click();
      await expect(adminPage.getByText('Batch created', { exact: false }).first())
        .toBeVisible({ timeout: 30_000 });

      const genUefLink = adminPage.getByTestId('data-intake-goto-uef-review-link');
      await expect(genUefLink).toBeVisible();
      await genUefLink.click();
      await adminPage.waitForURL(/\/admin\/uef-review\?batchId=/, { timeout: 15_000 });

      // ── Step 2 — UEF Review: generate candidates → bulk-approve → run scoring ──
      await expect(adminPage.getByTestId('admin-uef-review-page')).toBeVisible();
      // Batch card never renders the full batchId in markup (only a
      // fallback truncated slice when sourceName is absent, which it never
      // is here) — scope by the unique reportingPeriod text instead.
      const batchCard = adminPage.getByTestId('uef-batch-card').filter({ hasText: reportingPeriod });
      await expect(batchCard).toBeVisible({ timeout: 15_000 });
      await batchCard.getByTestId('uef-generate-candidates-button').click();
      await expect(adminPage.getByText('UEF candidates generated', { exact: false }).first())
        .toBeVisible({ timeout: 30_000 });

      const bulkApproveButton = adminPage.getByTestId('uef-bulk-approve-button');
      await expect(bulkApproveButton).toBeVisible({ timeout: 15_000 });
      await bulkApproveButton.click();
      await expect(adminPage.getByText('Approvazione massiva completata', { exact: false }).first())
        .toBeVisible({ timeout: 30_000 });

      await adminPage.getByTestId('uef-workforce-population-input').fill(WORKFORCE_POPULATION);
      await adminPage.getByTestId('uef-run-scoring-button').click();
      await expect(adminPage.getByText('Decision Pack generated from approved UEF records', { exact: false }).first())
        .toBeVisible({ timeout: 45_000 });

      // Non-empty KORA Index / Safeguard proves the real pipeline produced a
      // scored result, not just that the request returned ok:true.
      await expect(adminPage.getByText('KORA Index', { exact: false }).first()).toBeVisible();
      await expect(adminPage.getByText(/Safeguard\s+(CLEAR|WARNING|FLAGGED)/).first()).toBeVisible();

      // ── Step 3 — Decision Pack HTML preview: canonical labels present ──────
      const previewPagePromise = adminContext.waitForEvent('page');
      await adminPage.getByTestId('decision-pack-preview-link').click();
      const previewPage = await previewPagePromise;
      await previewPage.waitForLoadState();
      await expect(previewPage.getByTestId('decision-pack-preview')).toBeVisible();
      const previewHtml = await previewPage.content();
      expect(previewHtml, 'Decision Pack must show KORA Foundation Light labelling (doc 21b)').toMatch(/KORA Foundation Light/);
      expect(previewHtml, 'Decision Pack must show KORA Index v1.0, not v0.1/v3').toMatch(/KORA Index v1\.0/);
      expect(previewHtml, 'calibration_status must be the non-suppressible pre_empirical_calibration label').toMatch(/pre_empirical_calibration/);
      await previewPage.close();

      // ── Step 3b — Decision Pack PDF: proves whichever outcome staging
      // actually supports, rather than assuming one ──────────────────────────
      // /api/admin/decision-pack/pdf always attempts real Chromium rendering
      // and returns EITHER a real PDF (200, application/pdf) if the runtime
      // is available, OR a controlled 501 fallback (documented in the route
      // itself) pointing back at the HTML preview if it is not — expected on
      // constrained hosts (see lib/decision-pack/pdf-strategy.ts). No UI
      // button in the live tenant flow links here (only the unrelated OP-001
      // synthetic operator-flow section does), so this calls the API
      // directly, reusing the already-authenticated admin session/cookies.
      const pdfResponse = await adminPage.request.get(
        `/api/admin/decision-pack/pdf?tenantCode=${encodeURIComponent(tenantCode)}&reportingPeriod=${encodeURIComponent(reportingPeriod)}`,
      );
      if (pdfResponse.status() === 200) {
        expect(pdfResponse.headers()['content-type'], 'PDF response must be application/pdf').toMatch(/application\/pdf/);
        const pdfBuffer = await pdfResponse.body();
        expect(pdfBuffer.length, 'PDF generation must produce a non-trivial file, not an empty/stub buffer').toBeGreaterThan(1000);
      } else {
        expect(pdfResponse.status(), 'PDF route must fail with the documented controlled 501 fallback, not any other error').toBe(501);
        const fallback = await pdfResponse.json();
        expect(fallback.preview, '501 fallback must point back at the HTML preview route').toContain('/api/admin/decision-pack/preview');
      }
    } finally {
      await adminContext.close();
    }

    // ── Step 4 — COMPANY_ADMIN: tenant-safe visibility, no worker-level leak ──
    const companyContext = await browser.newContext();
    try {
      const companyPage = await companyContext.newPage();
      await loginViaUI(companyPage, companyCreds!);
      await assertReachedWorkspace(companyPage, ROLE_HOME.COMPANY);
      await expect(companyPage.getByTestId('company-workspace-page')).toBeVisible();
      await assertNoWorkerLevelIdentifiers(companyPage);

      await companyPage.goto('/company/kora-index');
      await expect(companyPage).toHaveURL(/\/company\/kora-index/, { timeout: 15_000 });
      await expect(companyPage.getByTestId('company-kora-index-page')).toBeVisible();
      await assertNoWorkerLevelIdentifiers(companyPage);
    } finally {
      await companyContext.close();
    }
  });

});
