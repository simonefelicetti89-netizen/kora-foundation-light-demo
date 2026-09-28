/**
 * KORA-WP-129 Wave 4b (W3A remediation) — first-access shell contract
 *
 * THE DEFECT THIS EXISTS FOR:
 *   /worker/onboarding and /worker/setup-password are authenticated routes, so
 *   AppShell gave them the full Worker chrome: the complete workspace sidebar
 *   (My KORA Home, Personal Impact Balance, Dynamic Impact CV, Opportunità,
 *   KORA Space, Prenotazioni and several `preview` items), the header's own
 *   identity chip and route breadcrumb, and — below the mobile breakpoint — the
 *   drawer toggle that opens all of it. A person who had not yet set a password
 *   or acknowledged the privacy boundary was shown a catalogue of destinations
 *   they could not yet use, next to three competing identity signals.
 *
 * WHAT THIS PROVES — both halves of one rule, which is why the predicate lives
 * in its own module rather than inline in AppShell:
 *   1. the two first-access routes get the focused entry shell;
 *   2. every other Worker route still gets the full workspace navigation;
 *   3. the entry shell offers no navigation affordance at any width.
 *
 * WHAT THIS DOES NOT PROVE:
 *   Anything about auth. The rule is presentation only — both routes remain
 *   inside app/worker/layout.tsx's WORKER gate and remain absent from AppShell's
 *   PUBLIC_ROUTE_PREFIXES. tests/unit/b113-worker-onboarding.test.ts and
 *   b106b cover the session, consent and redirect contracts, unchanged.
 */

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { FIRST_ACCESS_ROUTES, isFirstAccessRoute } from '@/components/layout/first-access-routes';

const ROOT = process.cwd();
const read = (rel: string) => readFileSync(join(ROOT, rel), 'utf8');

/**
 * Source with every comment removed — including multi-line JSX `{/* … *\/}`
 * blocks, whose continuation lines start with plain text and so survive a
 * line-prefix filter. These tests assert on strings that the code's own
 * explanatory comments legitimately quote, so a half-stripper would make a
 * passing assertion impossible to trust.
 */
const code = (rel: string) =>
  read(rel)
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')   // JSX comment blocks
    .replace(/\/\*[\s\S]*?\*\//g, '')        // block comments
    .replace(/^[ \t]*\/\/.*$/gm, '')          // line comments
    .trim();

describe('W3A — which routes are first access', () => {
  it('exactly the two entry surfaces are declared', () => {
    expect([...FIRST_ACCESS_ROUTES].sort()).toEqual(
      ['/worker/onboarding', '/worker/setup-password'],
    );
  });

  it('the two entry surfaces resolve to the focused shell', () => {
    expect(isFirstAccessRoute('/worker/onboarding')).toBe(true);
    expect(isFirstAccessRoute('/worker/setup-password')).toBe(true);
    // ?mode=review arrives as the same pathname; nested segments stay in scope.
    expect(isFirstAccessRoute('/worker/onboarding/anything')).toBe(true);
  });

  it('every accepted Worker surface keeps the full workspace navigation', () => {
    for (const route of [
      '/worker/workspace',
      '/worker/privacy',
      '/worker/activity-discovery',
      '/worker/activity-discovery/detail',
      '/worker/kora-link/activate',
      '/worker/bookings',
      '/worker/commons',
      '/worker/opportunities',
      '/worker/personal-impact-balance',
      '/worker/dynamic-cv',
      '/worker/dynamic-cv/print',
      '/company/workspace',
      '/admin',
    ]) {
      expect(isFirstAccessRoute(route), `${route} must keep the normal shell`).toBe(false);
    }
  });

  it('a prefix that merely starts with the same characters is not caught', () => {
    expect(isFirstAccessRoute('/worker/onboarding-report')).toBe(false);
    expect(isFirstAccessRoute('/worker/setup-password-reset')).toBe(false);
  });
});

describe('W3A — AppShell routes first access to the entry shell', () => {
  const shell = code('components/layout/AppShell.tsx');

  it('AppShell decides from the shared predicate, not a second inline list', () => {
    expect(shell).toMatch(/import \{ isFirstAccessRoute \} from '@\/components\/layout\/first-access-routes'/);
    expect(shell).toMatch(/isFirstAccessRoute\(pathname\)/);
    expect(shell).toMatch(/<EntryShell>\{children\}<\/EntryShell>/);
  });

  it('first access is NOT made public — the WORKER gate is untouched', () => {
    // Adding these to PUBLIC_ROUTE_PREFIXES would drop the shell AND change
    // what the route means. The fix is a quieter shell, not a public one.
    expect(shell).not.toMatch(/PUBLIC_ROUTE_PREFIXES[^\]]*\/worker\//);
  });

  it('the normal shell branch still renders Header and Sidebar', () => {
    expect(shell).toMatch(/<Header \/>/);
    expect(shell).toMatch(/<Sidebar \/>/);
    expect(shell).toMatch(/SidebarDrawerProvider/);
  });
});

describe('W3A — the entry shell offers no navigation at any width', () => {
  const entry = code('components/layout/EntryShell.tsx');

  it('renders no navigation, no drawer toggle and no workspace directory', () => {
    for (const forbidden of ['Sidebar', 'Header', 'SidebarDrawer', 'buildNavGroups', 'px-nav', 'drawer']) {
      expect(entry, `EntryShell must not reference ${forbidden}`).not.toMatch(new RegExp(forbidden));
    }
    expect(entry).not.toMatch(/<nav[\s>]/);
    expect(entry).not.toMatch(/<button[\s>]/);
  });

  it('carries exactly one identity signal', () => {
    expect((entry.match(/KoraLogo/g) ?? []).length).toBeGreaterThan(0);
    expect((entry.match(/<KoraLogo/g) ?? []).length).toBe(1);
    expect(entry).toMatch(/My KORA/);
  });

  it('keeps the skip-link target the normal shell provides', () => {
    expect(entry).toMatch(/id="main-content"/);
  });

  it('its stylesheet reaches nothing outside itself', () => {
    expect(read('components/layout/entry-shell.module.css')).not.toMatch(/:global\(/);
  });
});

describe('W3A — first-access trust line is Product UI, not build metadata', () => {
  const flow = code('app/worker/onboarding/_flow.tsx');
  const form = code('app/worker/setup-password/_form.tsx');

  it('the privacy sentence — Product truth — survives on both surfaces', () => {
    expect(flow).toMatch(/Il tuo datore di lavoro non vede questi dati/);
    expect(form).toMatch(/Il tuo datore di lavoro non può vedere questi dati/);
  });

  it('the build and version labels are gone from what the worker reads', () => {
    // `Privacy Consent v1.0` never matched the canonical value the server
    // records (`B113-v1.0`); the consent version is persisted server-side and
    // is unaffected by this line. `KORA Foundation Light` is required on KORA
    // Index surfaces (CLAUDE.md §6), not here. Neither was test-pinned.
    expect(flow).not.toMatch(/Privacy Consent v1\.0/);
    expect(flow).not.toMatch(/KORA Foundation Light/);
    expect(form).not.toMatch(/KORA Foundation Light/);
  });

  it('the server still records the consent version — unchanged', () => {
    const route = read('app/api/worker/onboarding/route.ts');
    expect(route).toMatch(/CURRENT_PRIVACY_CONSENT_VERSION = 'B113-v1\.0'/);
    expect(route).toMatch(/privacy_consent_version:\s*CURRENT_PRIVACY_CONSENT_VERSION/);
  });
});
