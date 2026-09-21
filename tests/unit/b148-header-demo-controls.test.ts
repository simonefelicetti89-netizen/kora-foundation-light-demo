// tests/unit/b148-header-demo-controls.test.ts
//
// B148: Header must never show the DEMO banner to real COMPANY_ADMIN or WORKER users,
// not even during the session-loading phase (realRole === undefined).
//
// Bug fixed: the old default was showDemoControls = !realRoleIsCompanyOrWorker, which
// evaluated to `true` while realRole was `undefined` (pending). Real company users saw
// the DEMO banner on every page load until getSession() resolved. (found June 2026)

import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const ROOT       = path.resolve(__dirname, '../..');
const HEADER_SRC = fs.readFileSync(path.join(ROOT, 'components/layout/Header.tsx'), 'utf-8');

// ── Structural checks — Header source code ────────────────────────────────────


// ── SUPERSEDED BY "ONE PRODUCT / NO DEMO RUNTIME" ───────────────────────────
// Canonical authority: docs/KORA_OFFICIAL_IMPLEMENTATION_MASTER_PLAN_v2.1_PATCH_03.md
// (Founder ruling, 2026-08-31) + Master Plan v2.1 §13, applied to the shared
// authenticated shell by KORA-WP-125 (2026-09-20).
//
// ORIGINAL INVARIANT (still valid, and now enforced ABSOLUTELY):
//   a real COMPANY_ADMIN / WORKER session must never see demo UI.
// These cases proved it CONDITIONALLY — by asserting that the Header called
// shouldShowDemoControls() before rendering the switchers. The switchers are
// now absent from the authenticated Product entirely, so the condition has no
// subject left: nobody sees them, which is strictly stronger than "real users
// do not". The pure guard functions themselves are unchanged and remain
// covered by tests/unit/b149-header-demo-guard.test.ts and
// tests/unit/b150-synthetic-data-banner-guard.test.ts, which still pass — the
// /demo/* showcase island may still use them.
// Replacement, stronger: the block below, plus the One Product guards in
// tests/unit/kora-wp-125-shared-product-experience-foundation.test.ts.

describe('B148 — fail-safe toward live, now absolute: no demo controls exist to gate', () => {
  const header = HEADER_SRC;
  const code = header.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');

  it('renders none of the demo switchers', () => {
    for (const c of ['EnvironmentSwitcher', 'ScenarioSwitcher', 'PersonaSwitcher', 'RoleSwitcher']) {
      expect(code, `${c} still reaches the authenticated header`).not.toContain(c);
    }
  });

  it('carries no environment/demo badge copy', () => {
    expect(code).not.toMatch(/DEMO|DATI SIMULATI|SERVICE-ASSISTED|FUTURE/);
  });

  it('no longer needs a demo gate, because there is nothing to gate', () => {
    expect(code).not.toContain('shouldShowDemoControls');
  });

  it('the pure demo guards survive for the separately-governed showcase island', () => {
    const guard = fs.readFileSync(path.join(ROOT, 'lib/demo-state/demo-controls-guard.ts'), 'utf-8');
    expect(guard).toContain('shouldShowDemoControls');
    expect(guard).toContain('resolveBannerEnvironment');
  });
});

// ── Logic simulation — each realRole state maps to correct showDemoControls ──

describe('B148 — showDemoControls logic simulation for all realRole states', () => {
  function computeShowDemoControls(realRole: string | null | undefined): boolean {
    const realRoleIsCompanyOrWorker =
      realRole === 'COMPANY_ADMIN' ||
      realRole === 'WORKER';
    return realRole !== undefined && !realRoleIsCompanyOrWorker;
  }

  it('undefined (pending) → false — no DEMO banner during loading', () => {
    expect(computeShowDemoControls(undefined)).toBe(false);
  });

  it('null (no session) → true — pure demo mode, controls visible', () => {
    expect(computeShowDemoControls(null)).toBe(true);
  });

  it('COMPANY_ADMIN → false — real user, never sees demo controls', () => {
    expect(computeShowDemoControls('COMPANY_ADMIN')).toBe(false);
  });

  it('WORKER → false — real user, never sees demo controls', () => {
    expect(computeShowDemoControls('WORKER')).toBe(false);
  });

  it('KORA_ADMIN → true — operator preview, demo controls shown', () => {
    expect(computeShowDemoControls('KORA_ADMIN')).toBe(true);
  });

  it('PARTNER → true — partner demo-state, controls shown (not yet live-only)', () => {
    expect(computeShowDemoControls('PARTNER')).toBe(true);
  });
});
