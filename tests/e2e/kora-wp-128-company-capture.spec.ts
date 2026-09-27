/**
 * tests/e2e/kora-wp-128-company-capture.spec.ts
 *
 * KORA-WP-128 · Wave 4a — archived pre-migration evidence for the Company
 * Intelligence surfaces, captured through KORA-WP-126's instrument.
 *
 * SCOPE: only the surfaces DELTA 5 leaves with this package. /company,
 * /company/workspace and /company/status are KORA-WP-143's and are deliberately
 * NOT captured here — capturing them would begin to claim them.
 *
 * REFERENCE EVIDENCE, not a Founder-accepted baseline: the contract requires
 * none and none is registered.
 */

import { test } from 'playwright/test';
import { getCompanyACredentials } from './helpers/env';
import { captureSurface, readCaptureConfig, type CaptureSurface } from './helpers/px-capture';

const WP = 'KORA-WP-128';

const SURFACES: CaptureSurface[] = [
  {
    route: '/company/kora-index',
    readiness: {
      selector: '[data-testid="company-kora-index-page"]',
      source: 'app/company/kora-index/page.tsx — populated body and resolved NoDataState both carry it',
    },
  },
  {
    route: '/company/activation',
    readiness: {
      selector: '[data-testid="company-activation-page"]',
      source: 'app/company/activation/page.tsx — marker on the resolved body, never a loading state',
    },
  },
  // NOT captured in Wave 4a: /company/reports and /company/financial. For a
  // tenant without a completed pipeline both resolve to NOT_YET_AVAILABLE,
  // rendered through shared KORA-WP-140 state components that do not forward a
  // test id, so no readiness marker can be declared without changing shared
  // components — outside Wave 4a's bounded scope. Recorded as outstanding
  // evidence for Wave 4b rather than captured against a guessed selector.
];

test.describe('KORA-WP-128 — Company Intelligence Wave 4a evidence', () => {
  for (const surface of SURFACES) {
    test(`captures ${surface.route} at the canonical viewport matrix`, async ({ browser, baseURL }) => {
      const localConfig = readCaptureConfig();
      const creds = getCompanyACredentials();
      test.skip(
        !localConfig || !creds,
        'E2E_LOCAL_SUPABASE_URL/ANON_KEY or E2E_COMPANY_A_* not set — WP128 capture skipped, never silently passed.',
      );
      if (!localConfig || !creds) return;
      await captureSurface(browser, baseURL, WP, surface, localConfig, creds);
    });
  }
});
