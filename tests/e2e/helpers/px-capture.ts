/**
 * tests/e2e/helpers/px-capture.ts
 *
 * Shared WP126-consuming capture harness for the PX-C Wave 4a evidence.
 *
 * OWNERSHIP: introduced by KORA-WP-127 and reused unchanged by KORA-WP-129 and
 * KORA-WP-128. It is deliberately ONE harness rather than three copies — the
 * batch forbids duplicating equivalent machinery per WP, and KORA-WP-126's
 * contract forbids inventing an alternative evidence system. Every primitive
 * here comes from lib/px-acceptance; this file adds orchestration only and
 * defines no threshold, no viewport and no verdict of its own.
 *
 * Evidence stays attributable: the owning WP is passed in and reaches both the
 * archive directory and the filename, so no WP can overwrite another's capture.
 *
 * Local and synthetic only, per KORA-WP-126's Privacy/Trust field.
 */

import { expect, type Browser, type Page } from 'playwright/test';
import { createHash } from 'crypto';
import { mkdirSync, writeFileSync } from 'fs';
import { dirname, basename, join } from 'path';
import { readLocalSessionConfig, installLocalSession, type LocalSessionConfig } from './local-session';
import { CANONICAL_VIEWPORTS, canonicalViewport } from '../../../lib/px-acceptance/viewport-matrix';
import {
  evidencePath, assertCaptureAllowed, assertLanded, assertReadinessDeclared,
  SUPPRESSED_NONDETERMINISM, type EvidenceDescriptor, type SurfaceReadiness,
} from '../../../lib/px-acceptance/evidence-protocol';
import { compareToBaseline, type CaptureResult } from '../../../lib/px-acceptance/baseline-store';
import { checkPageLength, checkMobileRatio, checkRouteArchetypeDeclared } from '../../../lib/px-acceptance/benchmark-checks';

/**
 * A state-scoped archive root, for a surface that must be evidenced in more
 * than one legitimate Product state.
 *
 * `/worker/dynamic-cv` is a `RECORD_DETAIL` whose whole W3B remediation is
 * about LONG-CONTENT behaviour, so a zero-experience capture and a populated
 * one prove different things and both are needed. `evidenceName()` is
 * deterministic by contract — same descriptor, same name — so the two states
 * would collide on one filename. Rather than invent a second naming
 * convention or widen `EvidenceDescriptor` (KORA-WP-126 is COMPLETE and is
 * not reopened), the canonical NAME is kept and the ARCHIVE ROOT carries the
 * state. Omit it and evidence lands exactly where it always did.
 */
export type ArchiveState = 'data-bearing';

export interface CaptureSurface {
  readonly route: string;
  readonly readiness: SurfaceReadiness;
  /**
   * The URL to navigate to, when reaching `route` needs a query string. The
   * EVIDENCE stays attributed to `route`: the archetype contract, the landing
   * check and the filename all use `route`, and KORA-WP-126's landing check
   * compares PATHNAMES, so a query string cannot smuggle in a different
   * surface. Added for `/worker/onboarding`, which redirects to the workspace
   * for a worker who has completed onboarding and therefore presents its
   * reviewable state only under `?mode=review` — the state W3A was accepted
   * on. Omit it and navigation uses `route` unchanged.
   */
  readonly navigateTo?: string;
}

export interface CaptureCredentials {
  readonly email: string;
  readonly password: string;
}

/** Readiness by condition, never by sleep. */
async function settle(page: Page, readiness: SurfaceReadiness): Promise<void> {
  await page.addStyleTag({
    content: `*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}`,
  });
  await page.locator(readiness.selector).first().waitFor({ state: 'visible', timeout: 20_000 });
  await page.waitForLoadState('networkidle');
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(
    () => document.querySelectorAll('[data-loading="true"],[aria-busy="true"]').length === 0,
    undefined,
    { timeout: 15_000 },
  );
}

export interface SurfaceMeasurement {
  readonly route: string;
  readonly heights: Record<string, number>;
}

/**
 * Captures one surface at every canonical viewport and returns its measured
 * heights. Refuses, before anything reaches disk, a non-canonical viewport, a
 * non-local target, a redirected landing or an undeclared readiness marker.
 */
export async function captureSurface(
  browser: Browser,
  baseURL: string | undefined,
  wp: string,
  surface: CaptureSurface,
  localConfig: LocalSessionConfig,
  creds: CaptureCredentials,
  archiveState?: ArchiveState,
): Promise<SurfaceMeasurement> {
  // An undeclared archetype has no length or ratio contract, so it cannot be
  // measured and must not be captured as acceptance evidence.
  expect(
    checkRouteArchetypeDeclared(surface.route).verdict,
    `${surface.route} declares no archetype — KORA-WP-126 fails closed`,
  ).toBe('pass');

  const readiness = assertReadinessDeclared(surface.readiness, surface.route);
  const heights: Record<string, number> = {};

  for (const vp of CANONICAL_VIEWPORTS) {
    const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
    try {
      await installLocalSession(context, localConfig, creds.email, creds.password);
      const page = await context.newPage();

      assertCaptureAllowed({
        baseUrl: baseURL, authenticated: true,
        width: vp.width, height: vp.height,
        suppressed: SUPPRESSED_NONDETERMINISM,
      });

      await page.goto(surface.navigateTo ?? surface.route, { waitUntil: 'domcontentloaded' });
      await settle(page, readiness);

      const documentHeight = await page.evaluate(() => document.documentElement.scrollHeight);
      assertLanded({
        intendedRoute: surface.route, finalUrl: page.url(),
        documentHeightPx: documentHeight, viewportHeightPx: vp.height,
      });

      const descriptor: EvidenceDescriptor = { wp, kind: 'product', route: surface.route, viewport: vp.id };
      const canonical = evidencePath(descriptor);
      const target = archiveState
        ? join(dirname(canonical), archiveState, basename(canonical))
        : canonical;
      const buffer = await page.screenshot({ fullPage: true });
      mkdirSync(dirname(target), { recursive: true });
      writeFileSync(target, buffer);

      const digest = createHash('sha256').update(buffer).digest('hex');
      const capture: CaptureResult = { name: target.split('/').pop()!, digest, admissible: true };

      // Wave 4a registers NO baseline: this archive is pre-migration reference
      // evidence, not a Founder-accepted baseline. 'missing-baseline' is the
      // honest verdict and is explicitly not a pass.
      expect(compareToBaseline(capture, null).verdict).toBe('missing-baseline');

      heights[vp.id] = documentHeight;
      console.log(`PX_EVIDENCE ${JSON.stringify({ wp, route: surface.route, viewport: vp.id, path: target, digest, height: documentHeight })}`);
    } finally {
      await context.close();
    }
  }

  const desktop = heights[canonicalViewport('desktop').id];
  const mobile = heights[canonicalViewport('mobile').id];
  const length = checkPageLength(surface.route, desktop);
  const ratio = checkMobileRatio(surface.route, desktop, mobile);
  console.log(`PX_MEASUREMENT ${JSON.stringify({ wp, route: surface.route, length, ratio })}`);

  // A warn is a real finding to record, never a test failure: KORA-WP-126 is
  // the mechanism and KORA-WP-131 is the gate.
  expect(['pass', 'warn', 'fail']).toContain(length.verdict);
  expect(['pass', 'warn', 'fail']).toContain(ratio.verdict);

  return { route: surface.route, heights };
}

export function readCaptureConfig(): LocalSessionConfig | null {
  return readLocalSessionConfig();
}
