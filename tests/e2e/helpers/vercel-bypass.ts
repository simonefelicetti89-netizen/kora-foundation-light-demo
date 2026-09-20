/**
 * KORA-WP-088 — Vercel Deployment Protection bypass for authenticated E2E.
 *
 * WHY THIS EXISTS: the WP-088 Preview is protected. A plain request to
 * `<preview>/login` answers `302 -> https://vercel.com/sso-api?...`, so
 * Playwright never reaches the KORA login form and every authenticated case
 * would FAIL (not skip) at `loginViaUI`. This module adds the officially
 * supported request-header bypass and nothing else.
 *
 * SECURITY CONTRACT — the reason this is a route handler and not
 * `use.extraHTTPHeaders` in playwright.config.ts:
 *
 *   `extraHTTPHeaders` is applied by Playwright to EVERY request the browser
 *   context makes, including third-party ones (the print CV page, for
 *   instance, pulls a stylesheet from fonts.googleapis.com). That would send
 *   the automation bypass secret to hosts that have no business receiving it.
 *   This handler attaches the header ONLY to requests whose host equals the
 *   host of E2E_BASE_URL, so the secret can never leave the deployment under
 *   test.
 *
 * Further guarantees:
 *   - the secret is read from process.env and nowhere else — never hardcoded,
 *     never defaulted, never written to disk;
 *   - the value is never logged, returned, echoed or included in a failure
 *     message; only its PRESENCE is ever observable (`hasProtectionBypass()`);
 *   - when VERCEL_AUTOMATION_BYPASS_SECRET is absent, NO bypass of any kind is
 *     attempted — the handler is simply not installed;
 *   - it bypasses Vercel's deployment-access gate only. It does not touch KORA
 *     authentication, RLS, role resolution, or any app guard: every test still
 *     logs in through the real /login form as a real user;
 *   - it does not weaken, replace, or interact with guardE2ETarget() /
 *     E2E_ALLOWED_STAGING_HOSTS. That allowlist still decides whether a test
 *     runs at all, and it runs first. This only affects a run that the
 *     allowlist has already approved.
 */

import type { Page } from 'playwright/test';
import { getBaseUrl } from './env';

const BYPASS_HEADER = 'x-vercel-protection-bypass';
/** Asks Vercel to also set a bypass cookie, so redirects within the deployment carry it. */
const SET_COOKIE_HEADER = 'x-vercel-set-bypass-cookie';

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '0.0.0.0', '::1', '[::1]']);

function readSecret(): string | undefined {
  const value = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
  return value && value.trim().length > 0 ? value : undefined;
}

/** Presence check only. Never returns or reveals the value. */
export function hasProtectionBypass(): boolean {
  return readSecret() !== undefined;
}

/**
 * Installs the bypass on a page, scoped to the host under test.
 * No-op when the secret is absent or the target is local.
 */
export async function applyProtectionBypass(page: Page): Promise<void> {
  const secret = readSecret();
  if (!secret) return;

  let targetHost: string;
  try {
    targetHost = new URL(getBaseUrl()).host;
  } catch {
    return; // unparseable base URL — fail closed, attach nothing
  }
  if (LOCAL_HOSTS.has(new URL(getBaseUrl()).hostname)) return;

  await page.route('**/*', async (route) => {
    const request = route.request();
    let sameHost = false;
    try {
      sameHost = new URL(request.url()).host === targetHost;
    } catch {
      sameHost = false;
    }
    if (!sameHost) {
      // Third-party request — continue untouched. The secret never leaves the
      // deployment under test.
      await route.continue();
      return;
    }
    await route.continue({
      headers: {
        ...request.headers(),
        [BYPASS_HEADER]: secret,
        [SET_COOKIE_HEADER]: 'true',
      },
    });
  });
}
