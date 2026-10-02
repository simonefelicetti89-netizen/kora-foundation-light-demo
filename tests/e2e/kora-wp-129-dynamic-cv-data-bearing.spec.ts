/**
 * tests/e2e/kora-wp-129-dynamic-cv-data-bearing.spec.ts
 *
 * KORA-WP-129 — the Dynamic Impact CV and its printed artifact, evidenced in a
 * POPULATED state.
 *
 * WHY A SECOND SPEC RATHER THAN A WIDER FIRST ONE. The canonical cohort
 * (kora-wp-129-worker-capture.spec.ts) captures all 13 Worker surfaces in the
 * state the golden-path seed alone produces, which for these two is zero
 * experiences. That is a real Product state and it proves the W3B composition:
 * three semantic rail groups, one pillar per row, and the absence of every
 * string W3B removed. What it cannot prove is LONG-CONTENT behaviour, and
 * `/worker/dynamic-cv` is a `RECORD_DETAIL` whose entire remediation was about
 * exactly that. The two states prove different things, so both are kept and
 * neither overwrites the other: the canonical filename is unchanged and the
 * archive root carries the state (`data-bearing/`).
 *
 * STATE PROVENANCE. The populated state comes from the project's own review
 * fixture, `scripts/e2e/seed-local-worker-review-states.ts`, carried onto this
 * evidence branch with its original two commits intact. It is NOT hand-written
 * UI data: participations are real rows and every PIB value is produced by
 * `computeBaseWorkerPIBRows`, the Product methodology. The fixture's own
 * canonical output is used as it stands — no count is tuned to match a
 * screenshot target, and a difference from any historical number is reported
 * rather than engineered away.
 *
 * RUNTIME. Captured against the production build of the exact Product SHA
 * (`next build` + `next start`), not `next dev`, so no development-only chrome
 * appears in the image. Proven equivalent beforehand on `/worker/privacy`:
 * identical viewport dimensions and identical document heights in both runtime
 * modes, the only difference being the dev indicator itself.
 *
 * Local synthetic fixtures only, per KORA-WP-126's Privacy/Trust field.
 */

import { test } from 'playwright/test';
import { getWorkerCredentials } from './helpers/env';
import { captureSurface, readCaptureConfig, type CaptureSurface } from './helpers/px-capture';

const WP = 'KORA-WP-129';
const STATE = 'data-bearing' as const;

const SURFACES: CaptureSurface[] = [
  {
    route: '/worker/dynamic-cv',
    readiness: {
      // Not `dynamic-cv-container`: that attribute is written on `<Workspace>`,
      // whose props are `{children, style}` only, so it never reaches the DOM.
      // Recorded as a finding, deliberately not repaired here.
      selector: '[data-testid="dynamic-cv-summary"]',
      source: 'app/worker/dynamic-cv/_components/DynamicCVClient.tsx — the summary block, rendered only once the CV has loaded',
    },
  },
  {
    route: '/worker/dynamic-cv/print',
    readiness: {
      selector: '[data-testid="dynamic-cv-print-view"]',
      source: 'app/worker/dynamic-cv/print/page.tsx — the printed-artifact container (KORA-WP-129 Defect B)',
    },
  },
];

test.describe('KORA-WP-129 — Dynamic CV evidenced under real content', () => {
  for (const surface of SURFACES) {
    test(`captures ${surface.route} populated, at the canonical viewport matrix`, async ({ browser, baseURL }) => {
      const localConfig = readCaptureConfig();
      const creds = getWorkerCredentials();
      test.skip(
        !localConfig || !creds,
        'E2E_LOCAL_SUPABASE_URL/ANON_KEY or E2E_WORKER_* not set — data-bearing capture skipped, never silently passed.',
      );
      if (!localConfig || !creds) return;
      await captureSurface(browser, baseURL, WP, surface, localConfig, creds, STATE);
    });
  }
});
