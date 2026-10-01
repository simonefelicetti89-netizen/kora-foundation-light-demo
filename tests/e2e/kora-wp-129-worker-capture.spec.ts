/**
 * tests/e2e/kora-wp-129-worker-capture.spec.ts
 *
 * KORA-WP-129 · the canonical, reproducible evidence cohort for the Worker
 * environment, captured through KORA-WP-126's instrument.
 *
 * WHY THIS FILE GREW FROM TWO SURFACES TO THIRTEEN. As committed for Wave 4a it
 * covered `/worker/workspace` and `/worker/privacy` only, so the nine
 * `product__` sets that W1 and W2 later archived were not regenerable from any
 * committed specification, and W3A and W3B archived none at all. An evidence
 * cohort that cannot be regenerated is a record of a past run, not a protocol.
 * The surface list below is therefore the COMPLETE set of real Worker surfaces,
 * derived from `ROUTE_ARCHETYPE` rather than restated here by hand: the guard at
 * the top of this file fails if the two ever diverge, so a Worker route added or
 * retired in Product cannot silently drop out of the evidence cohort.
 *
 * SCOPE. Evidence engineering only. No Product file is modified by this change,
 * no readiness marker is invented — every selector below cites the Product file
 * that owns it — and no threshold, viewport or verdict is defined here: all of
 * those come from lib/px-acceptance via the shared harness.
 *
 * Local synthetic fixtures only, per KORA-WP-126's Privacy/Trust field — no real
 * worker data, and no worker-private surface becomes employer-visible by being
 * captured under the worker's own session.
 */

import { test, expect } from 'playwright/test';
import { getWorkerCredentials } from './helpers/env';
import { captureSurface, readCaptureConfig, type CaptureSurface } from './helpers/px-capture';
import { declaredRoutes } from '../../lib/px-acceptance/benchmark-checks';

const WP = 'KORA-WP-129';

/**
 * `/worker/login` is a pure redirect wrapper (`redirect('/login?role_hint=worker')`)
 * and is deliberately NOT a real surface: it declares no archetype, so
 * KORA-WP-126 cannot measure it and it must not carry acceptance evidence.
 */
const NON_SURFACE_WORKER_ROUTES = ['/worker/login'] as const;

const SURFACES: CaptureSurface[] = [
  {
    route: '/worker/workspace',
    readiness: {
      selector: '[data-testid="workspace-page"]',
      source: 'app/worker/workspace/page.tsx — the Worker workspace container',
    },
  },
  {
    route: '/worker/privacy',
    readiness: {
      selector: '[data-testid="worker-privacy-page"]',
      source: 'app/worker/privacy/_components/PrivacySettingsClient.tsx — the KORA-WP-048 privacy workspace',
    },
  },
  {
    route: '/worker/activity-discovery',
    readiness: {
      selector: '[data-testid="activity-discovery-page"]',
      source: 'app/worker/activity-discovery/page.tsx — the catalogue container',
    },
  },
  {
    route: '/worker/activity-discovery/detail',
    readiness: {
      selector: '[data-testid="activity-detail-page"]',
      source: 'app/worker/activity-discovery/detail/page.tsx — the record container',
    },
  },
  {
    route: '/worker/kora-link/activate',
    readiness: {
      selector: '[data-testid="kora-link-activate-page"]',
      source: 'app/worker/kora-link/activate/page.tsx — the activation disclosure container',
    },
  },
  {
    route: '/worker/bookings',
    readiness: {
      selector: '[data-testid="worker-bookings-page"]',
      source: 'app/worker/bookings/_components/BookingsClient.tsx — the bookings workspace container',
    },
  },
  {
    route: '/worker/commons',
    readiness: {
      selector: '[data-testid="worker-commons"]',
      source: 'app/worker/commons/page.tsx — the Commons container',
    },
  },
  {
    route: '/worker/opportunities',
    readiness: {
      selector: '[data-testid="worker-opportunities-page"]',
      source: 'app/worker/opportunities/page.tsx — the partner catalogue container',
    },
  },
  {
    route: '/worker/personal-impact-balance',
    readiness: {
      selector: '[data-testid="worker-pib-page"]',
      source: 'app/worker/personal-impact-balance/page.tsx — the PIB record container',
    },
  },
  {
    route: '/worker/dynamic-cv',
    readiness: {
      // NOT `dynamic-cv-container`. That attribute is written on `<Workspace>`,
      // whose props are `{children, style}` only, so it is dropped and never
      // reaches the DOM — recorded as a finding, deliberately NOT repaired here
      // (no Product file is touched by this evidence pass). `dynamic-cv-summary`
      // sits on a plain div inside the loaded branch and is observable.
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
  {
    // The seeded worker has completed onboarding, so the default path redirects
    // to the workspace by design. `?mode=review` is the state W3A was accepted
    // on and the only one this surface can present to a completed worker; the
    // pathname is unchanged, so KORA-WP-126's landing check still applies.
    route: '/worker/onboarding',
    navigateTo: '/worker/onboarding?mode=review',
    readiness: {
      // `?mode=review` renders `ReviewMode` WITHOUT `StepProgress`, so there is
      // no `role="progressbar"` on this branch and `_flow.tsx` declares no
      // data-testid at all. The `PageHead` header is the branch's own marker.
      selector: 'header:has-text("Revisione del boundary privacy")',
      source: 'app/worker/onboarding/_flow.tsx reviewMode branch → components/ui/px/Workspace.tsx PageHead',
    },
  },
  {
    route: '/worker/setup-password',
    readiness: {
      selector: '#password',
      source: 'app/worker/setup-password/_form.tsx — the password field, present on the form branch',
    },
  },
];

test.describe('KORA-WP-129 — the canonical Worker evidence cohort', () => {
  test('the cohort is exactly the declared real Worker surfaces — no route silently omitted', () => {
    const declaredWorker = declaredRoutes()
      .filter((r) => r.startsWith('/worker'))
      .sort();
    const captured = SURFACES.map((s) => s.route).sort();
    expect(
      captured,
      'every Worker route declaring an archetype must carry evidence, and nothing else may',
    ).toEqual(declaredWorker);
    for (const r of NON_SURFACE_WORKER_ROUTES) {
      expect(declaredWorker, `${r} is a redirect and must not declare an archetype`).not.toContain(r);
      expect(captured, `${r} is a redirect and must not be captured`).not.toContain(r);
    }
  });

  for (const surface of SURFACES) {
    test(`captures ${surface.route} at the canonical viewport matrix`, async ({ browser, baseURL }) => {
      const localConfig = readCaptureConfig();
      const creds = getWorkerCredentials();
      test.skip(
        !localConfig || !creds,
        'E2E_LOCAL_SUPABASE_URL/ANON_KEY or E2E_WORKER_* not set — WP129 capture skipped, never silently passed.',
      );
      if (!localConfig || !creds) return;
      await captureSurface(browser, baseURL, WP, surface, localConfig, creds);
    });
  }
});
