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

describe('B148 — Header showDemoControls logic is fail-safe toward live', () => {
  it('showDemoControls guards on realRole !== undefined (pending → hide)', () => {
    // The guard `realRole !== undefined &&` must precede !realRoleIsCompanyOrWorker
    // so that the loading state is treated as "hide demo" not "show demo".
    expect(HEADER_SRC).toContain('realRole !== undefined && !realRoleIsCompanyOrWorker');
  });

  it('does NOT use the old default that showed demo during pending', () => {
    // Old (wrong): const showDemoControls = !realRoleIsCompanyOrWorker;
    // This evaluated to true when realRole was undefined (pending → show DEMO banner).
    expect(HEADER_SRC).not.toMatch(/const showDemoControls\s*=\s*!realRoleIsCompanyOrWorker\s*;/);
  });

  it('COMPANY_ADMIN is explicitly in the realRoleIsCompanyOrWorker exclusion', () => {
    expect(HEADER_SRC).toContain("realRole === 'COMPANY_ADMIN'");
  });

  it('WORKER is explicitly in the realRoleIsCompanyOrWorker exclusion', () => {
    expect(HEADER_SRC).toContain("realRole === 'WORKER'");
  });

  it('does not contain the old "flash-of-hidden-UI in demo" comment (wrong intent)', () => {
    expect(HEADER_SRC).not.toContain('flash-of-hidden-UI in demo');
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
