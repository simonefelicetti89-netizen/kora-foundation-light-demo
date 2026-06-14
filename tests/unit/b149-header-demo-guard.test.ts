/**
 * B149 — Header demo controls guard
 *
 * Verifica le due funzioni pure che decidono se mostrare i controlli demo
 * nell'Header. Le funzioni sono in lib/demo-state/demo-controls-guard.ts.
 *
 * Invarianti:
 * - utenti reali (COMPANY_ADMIN, WORKER, o sessione senza kora_role) non vedono mai UI demo
 * - visitatori senza sessione vedono i controlli demo (modalità demo pura)
 * - KORA_ADMIN vede i controlli demo
 * - durante il pending (undefined) i controlli demo sono nascosti (fail-safe → live)
 */

import { describe, it, expect } from 'vitest';
import {
  resolveRealRoleFromSession,
  shouldShowDemoControls,
} from '../../lib/demo-state/demo-controls-guard';

// ── resolveRealRoleFromSession ───────────────────────────────────────────────

describe('resolveRealRoleFromSession', () => {
  it('returns null when session is null (no session)', () => {
    expect(resolveRealRoleFromSession(null)).toBe(null);
  });

  it('returns the kora_role when present in app_metadata', () => {
    const session = { user: { app_metadata: { kora_role: 'COMPANY_ADMIN' } } };
    expect(resolveRealRoleFromSession(session)).toBe('COMPANY_ADMIN');
  });

  it('returns WORKER when kora_role is WORKER', () => {
    const session = { user: { app_metadata: { kora_role: 'WORKER' } } };
    expect(resolveRealRoleFromSession(session)).toBe('WORKER');
  });

  it('returns KORA_ADMIN when kora_role is KORA_ADMIN', () => {
    const session = { user: { app_metadata: { kora_role: 'KORA_ADMIN' } } };
    expect(resolveRealRoleFromSession(session)).toBe('KORA_ADMIN');
  });

  it('returns AUTHENTICATED (not null) when session exists but kora_role is absent', () => {
    // This is the critical gap: a real user whose provisioning did not set kora_role
    // must NOT be treated as "no session" — that would show the demo banner.
    const session = { user: { app_metadata: {} } };
    expect(resolveRealRoleFromSession(session)).toBe('AUTHENTICATED');
  });

  it('returns AUTHENTICATED when session exists but user has no app_metadata', () => {
    const session = { user: {} };
    expect(resolveRealRoleFromSession(session)).toBe('AUTHENTICATED');
  });

  it('returns AUTHENTICATED when session exists but user is undefined', () => {
    const session = {};
    expect(resolveRealRoleFromSession(session)).toBe('AUTHENTICATED');
  });
});

// ── shouldShowDemoControls ───────────────────────────────────────────────────

describe('shouldShowDemoControls', () => {
  it('returns false when realRole is undefined (session check pending)', () => {
    expect(shouldShowDemoControls(undefined)).toBe(false);
  });

  it('returns true when realRole is null (no session — pure demo visitor)', () => {
    expect(shouldShowDemoControls(null)).toBe(true);
  });

  it('returns true when realRole is KORA_ADMIN', () => {
    expect(shouldShowDemoControls('KORA_ADMIN')).toBe(true);
  });

  it('returns false when realRole is COMPANY_ADMIN', () => {
    expect(shouldShowDemoControls('COMPANY_ADMIN')).toBe(false);
  });

  it('returns false when realRole is WORKER', () => {
    expect(shouldShowDemoControls('WORKER')).toBe(false);
  });

  it('returns false when realRole is AUTHENTICATED (real session without kora_role)', () => {
    expect(shouldShowDemoControls('AUTHENTICATED')).toBe(false);
  });

  it('returns false for any unrecognized non-null role', () => {
    expect(shouldShowDemoControls('SOME_FUTURE_ROLE')).toBe(false);
  });
});

// ── Integration: resolveRealRoleFromSession → shouldShowDemoControls ─────────

describe('pipeline: session → realRole → showDemoControls', () => {
  function pipeline(
    session: { user?: { app_metadata?: Record<string, unknown> } } | null,
  ): boolean {
    return shouldShowDemoControls(resolveRealRoleFromSession(session));
  }

  it('COMPANY_ADMIN with kora_role in metadata → no demo controls', () => {
    expect(pipeline({ user: { app_metadata: { kora_role: 'COMPANY_ADMIN' } } })).toBe(false);
  });

  it('WORKER with kora_role in metadata → no demo controls', () => {
    expect(pipeline({ user: { app_metadata: { kora_role: 'WORKER' } } })).toBe(false);
  });

  it('Real session without kora_role in metadata → no demo controls', () => {
    expect(pipeline({ user: { app_metadata: {} } })).toBe(false);
  });

  it('No session at all → demo controls shown (pure demo mode)', () => {
    expect(pipeline(null)).toBe(true);
  });

  it('KORA_ADMIN → demo controls shown (operator access)', () => {
    expect(pipeline({ user: { app_metadata: { kora_role: 'KORA_ADMIN' } } })).toBe(true);
  });
});
