/**
 * tests/e2e/kora-wp-129-worker-capture.spec.ts
 *
 * KORA-WP-129 · Wave 4a — archived pre-migration evidence for the Worker
 * environment, captured through KORA-WP-126's instrument.
 *
 * This archive is the evidence KORA-WP-129's own binding boundary requires
 * before any Worker information-architecture work may be scoped. It is
 * REFERENCE EVIDENCE, not a Founder-accepted baseline: the contract requires
 * none and none is registered.
 *
 * Local synthetic fixtures only — no real worker data, and no worker-private
 * surface is made employer-visible by capturing it under a worker's own session.
 */

import { test } from 'playwright/test';
import { getWorkerCredentials } from './helpers/env';
import { captureSurface, readCaptureConfig, type CaptureSurface } from './helpers/px-capture';

const WP = 'KORA-WP-129';

const SURFACES: CaptureSurface[] = [
  {
    route: '/worker/workspace',
    readiness: {
      selector: '[data-testid="workspace-page"]',
      source: 'app/worker/workspace — the Worker workspace container',
    },
  },
  {
    route: '/worker/privacy',
    readiness: {
      selector: '[data-testid="worker-privacy-page"]',
      source: 'app/worker/privacy/_components/PrivacySettingsClient.tsx — the KORA-WP-048 privacy workspace',
    },
  },
];

test.describe('KORA-WP-129 — Worker Wave 4a evidence', () => {
  for (const surface of SURFACES) {
    test(`captures ${surface.route} at the canonical viewport matrix`, async ({ browser, baseURL }) => {
      const localConfig = readCaptureConfig();
      const creds = getWorkerCredentials();
      test.skip(
        !localConfig || !creds,
        'E2E_LOCAL_SUPABASE_URL/ANON_KEY or E2E_WORKER_A_* not set — WP129 capture skipped, never silently passed.',
      );
      if (!localConfig || !creds) return;
      await captureSurface(browser, baseURL, WP, surface, localConfig, creds);
    });
  }
});
