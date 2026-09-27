/**
 * tests/e2e/kora-wp-127-admin-capture.spec.ts
 *
 * KORA-WP-127 · Wave 4a — archived pre-migration evidence for the KORA_ADMIN
 * environment, captured through KORA-WP-126's instrument.
 *
 * This is REFERENCE EVIDENCE, not a Founder-accepted baseline: KORA-WP-127's
 * contract requires none, no acceptance record exists, and no baseline is
 * registered. Its purpose is to make the Wave 4b system migration verifiable
 * against the surface as it stood before migration.
 *
 * Local synthetic fixtures only. Skips with a clear message when they are not
 * configured; it never silently passes.
 */

import { test } from 'playwright/test';
import { getAdminCredentials } from './helpers/env';
import { captureSurface, readCaptureConfig, type CaptureSurface } from './helpers/px-capture';

const WP = 'KORA-WP-127';

/**
 * Both surfaces already declare an archetype in KORA-WP-141's ROUTE_ARCHETYPE
 * and already expose a stable readiness marker, so this package adds no
 * Product code to capture them.
 */
const SURFACES: CaptureSurface[] = [
  {
    route: '/admin',
    readiness: {
      selector: '[data-testid="admin-quickstart-panel"]',
      source: 'app/admin/page.tsx — the Admin home operator panel',
    },
  },
  {
    route: '/admin/data-intake',
    readiness: {
      selector: '[data-testid="admin-data-intake-page"]',
      source: 'app/admin/data-intake/_components/DataIntakeStudio.tsx — the Submission Queue surface',
    },
  },
];

test.describe('KORA-WP-127 — Admin Wave 4a evidence', () => {
  for (const surface of SURFACES) {
    test(`captures ${surface.route} at the canonical viewport matrix`, async ({ browser, baseURL }) => {
      const localConfig = readCaptureConfig();
      const creds = getAdminCredentials();
      test.skip(
        !localConfig || !creds,
        'E2E_LOCAL_SUPABASE_URL/ANON_KEY or E2E_KORA_ADMIN_* not set — WP127 capture skipped, never silently passed.',
      );
      if (!localConfig || !creds) return;
      await captureSurface(browser, baseURL, WP, surface, localConfig, creds);
    });
  }
});
