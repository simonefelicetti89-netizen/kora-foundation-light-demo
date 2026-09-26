/**
 * tests/e2e/px-acceptance-capture.spec.ts
 *
 * KORA-WP-126 — the reproducible authenticated capture of the REAL Product.
 *
 * Registry 219's WP126 Acceptance requires "one screenshot evidence protocol
 * producing reproducible authenticated captures of the REAL Product". This is
 * that protocol executed: it reuses the established local-session mechanism
 * (WP126's Existing Paths field names it, and its Auth/RLS field is explicit
 * that this package introduces no new auth path), captures at the canonical
 * viewport matrix only, and measures the Benchmark V2 quantities WP126 owns.
 *
 * Local only. WP126's Privacy/Trust field: evidence captures may not contain
 * real Worker or Company data — synthetic/local fixtures only. The protocol's
 * own prerequisite check refuses a non-loopback base URL, and skips (never
 * fails, never silently passes) when the local fixtures are not configured.
 *
 * Determinism is achieved with readiness conditions, not sleeps: fonts ready,
 * network idle, animations disabled, no loading surface remaining.
 */

import { test, expect } from 'playwright/test';
import { createHash } from 'crypto';
import { mkdirSync, writeFileSync } from 'fs';
import { dirname } from 'path';
import { readLocalSessionConfig, installLocalSession } from './helpers/local-session';
import { getCompanyACredentials } from './helpers/env';
import { CANONICAL_VIEWPORTS, canonicalViewport } from '../../lib/px-acceptance/viewport-matrix';
import {
  evidencePath, assertCaptureAllowed, assertLanded, assertReadinessDeclared,
  SUPPRESSED_NONDETERMINISM, type EvidenceDescriptor, type SurfaceReadiness,
} from '../../lib/px-acceptance/evidence-protocol';
import { compareToBaseline, type CaptureResult } from '../../lib/px-acceptance/baseline-store';
import { checkPageLength, checkMobileRatio, checkRouteArchetypeDeclared } from '../../lib/px-acceptance/benchmark-checks';

const WP = 'KORA-WP-126';
/** The route WP126 captures to prove the instrument against a real surface. */
const ROUTE = '/company/kora-index';

/**
 * The surface's own readiness marker. Declared, never guessed: the generic
 * aria-busy/data-loading probe matched nothing here and the protocol captured
 * "Caricamento in corso…" as if it were the Product.
 */
const READINESS: SurfaceReadiness = {
  selector: '[data-testid="company-kora-index-page"]',
  source: 'app/company/kora-index/page.tsx — rendered only once the surface itself has resolved',
};

/** Readiness, expressed as conditions. No arbitrary sleep anywhere in this file. */
async function settle(page: import('playwright/test').Page, readiness: SurfaceReadiness): Promise<void> {
  await page.addStyleTag({
    content: `*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}`,
  });
  // The surface's own marker first — this is the only condition that actually
  // proves the Product rendered, rather than a loading state that happens to
  // satisfy every generic probe.
  await page.locator(readiness.selector).first().waitFor({ state: 'visible', timeout: 20_000 });
  await page.waitForLoadState('networkidle');
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(
    () => document.querySelectorAll('[data-loading="true"],[aria-busy="true"]').length === 0,
    undefined,
    { timeout: 15_000 },
  );
}

test.describe('KORA-WP-126 — Product Experience visual acceptance capture', () => {
  test('captures the real authenticated Product at every canonical viewport, and measures it', async ({ browser, baseURL }) => {
    const localConfig = readLocalSessionConfig();
    const companyCreds = getCompanyACredentials();
    test.skip(
      !localConfig || !companyCreds,
      'E2E_LOCAL_SUPABASE_URL/ANON_KEY or E2E_COMPANY_A_* not set — WP126 capture skipped (never silently passed).',
    );
    if (!localConfig || !companyCreds) return;

    // The route must declare an archetype before it can be measured at all.
    expect(checkRouteArchetypeDeclared(ROUTE).verdict).toBe('pass');

    const heights: Record<string, number> = {};

    for (const vp of CANONICAL_VIEWPORTS) {
      const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
      try {
        await installLocalSession(context, localConfig, companyCreds.email, companyCreds.password);
        const page = await context.newPage();

        // FAIL CLOSED before anything is written to disk.
        assertCaptureAllowed({
          baseUrl: baseURL, authenticated: true,
          width: vp.width, height: vp.height,
          suppressed: SUPPRESSED_NONDETERMINISM,
        });

        await page.goto(ROUTE, { waitUntil: 'domcontentloaded' });
        await settle(page, assertReadinessDeclared(READINESS, ROUTE));

        // Prerequisites describe intent; this proves the RESULT. Refused before
        // anything reaches disk, so a redirect can never become evidence.
        const documentHeight = await page.evaluate(() => document.documentElement.scrollHeight);
        assertLanded({
          intendedRoute: ROUTE, finalUrl: page.url(),
          documentHeightPx: documentHeight, viewportHeightPx: vp.height,
        });

        const descriptor: EvidenceDescriptor = { wp: WP, kind: 'product', route: ROUTE, viewport: vp.id };
        const target = evidencePath(descriptor);
        const buffer = await page.screenshot({ fullPage: true });
        mkdirSync(dirname(target), { recursive: true });
        writeFileSync(target, buffer);

        const digest = createHash('sha256').update(buffer).digest('hex');
        const capture: CaptureResult = { name: target.split('/').pop()!, digest, admissible: true };

        // No baseline is committed by this package, so the honest verdict is
        // 'missing-baseline' — explicitly NOT a pass, and never auto-accepted.
        const comparison = compareToBaseline(capture, null);
        expect(comparison.verdict).toBe('missing-baseline');

        heights[vp.id] = documentHeight;
        console.log(`WP126_EVIDENCE ${JSON.stringify({ viewport: vp.id, path: target, digest, height: heights[vp.id] })}`);
      } finally {
        await context.close();
      }
    }

    // The Benchmark V2 quantities WP126 owns, measured on the real surface.
    const desktop = heights[canonicalViewport('desktop').id];
    const mobile = heights[canonicalViewport('mobile').id];
    const length = checkPageLength(ROUTE, desktop);
    const ratio = checkMobileRatio(ROUTE, desktop, mobile);
    console.log(`WP126_MEASUREMENT ${JSON.stringify({ length, ratio })}`);

    // Measurement must always resolve to a verdict. A warn is a real finding to
    // report, not a test failure — WP126 is the mechanism, WP131 is the gate.
    expect(['pass', 'warn', 'fail']).toContain(length.verdict);
    expect(['pass', 'warn', 'fail']).toContain(ratio.verdict);
  });
});
