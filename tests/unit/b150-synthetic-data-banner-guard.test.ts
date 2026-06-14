/**
 * B150 — SyntheticDataBanner demo-guard
 *
 * Verifica resolveBannerEnvironment: la funzione pura che decide quale
 * environment mostrare nel banner, data la sessione reale e il demo state.
 *
 * Invarianti:
 * - COMPANY_ADMIN o WORKER → sempre 'live', mai 'demo'
 * - sessione reale senza kora_role (AUTHENTICATED) → 'live', mai 'demo'
 * - pending (undefined) → null (nessun banner, fail-safe)
 * - nessuna sessione (null) → rispetta activeEnvironment (visitor demo)
 * - KORA_ADMIN → rispetta activeEnvironment (operatore con switcher)
 */

import { describe, it, expect } from 'vitest';
import { resolveBannerEnvironment, resolveRealRoleFromSession } from '../../lib/demo-state/demo-controls-guard';
import type { BannerEnvironment } from '../../lib/demo-state/demo-controls-guard';

// ── resolveBannerEnvironment ─────────────────────────────────────────────────

describe('resolveBannerEnvironment — utenti reali non vedono mai demo', () => {
  it('COMPANY_ADMIN → live (non demo)', () => {
    expect(resolveBannerEnvironment('COMPANY_ADMIN', 'demo')).toBe('live');
  });

  it('WORKER → live (non demo)', () => {
    expect(resolveBannerEnvironment('WORKER', 'demo')).toBe('live');
  });

  it('AUTHENTICATED (sessione reale senza kora_role) → live (non demo)', () => {
    expect(resolveBannerEnvironment('AUTHENTICATED', 'demo')).toBe('live');
  });

  it('qualsiasi stringa non-KORA_ADMIN → live (non demo)', () => {
    expect(resolveBannerEnvironment('SOME_FUTURE_ROLE', 'demo')).toBe('live');
  });
});

describe('resolveBannerEnvironment — fail-safe durante pending', () => {
  it('undefined (pending) → null, nessun banner renderizzato', () => {
    expect(resolveBannerEnvironment(undefined, 'demo')).toBe(null);
  });

  it('undefined + activeEnv live → null comunque (non ancora noto)', () => {
    expect(resolveBannerEnvironment(undefined, 'live')).toBe(null);
  });
});

describe('resolveBannerEnvironment — visitor demo e KORA_ADMIN rispettano activeEnvironment', () => {
  it('null (nessuna sessione) + activeEnv demo → demo', () => {
    expect(resolveBannerEnvironment(null, 'demo')).toBe('demo');
  });

  it('null (nessuna sessione) + activeEnv live → live', () => {
    expect(resolveBannerEnvironment(null, 'live')).toBe('live');
  });

  it('null + activeEnv future → future', () => {
    expect(resolveBannerEnvironment(null, 'future')).toBe('future');
  });

  it('KORA_ADMIN + activeEnv demo → demo (operatore in preview demo)', () => {
    expect(resolveBannerEnvironment('KORA_ADMIN', 'demo')).toBe('demo');
  });

  it('KORA_ADMIN + activeEnv live → live (operatore ha switchato a live)', () => {
    expect(resolveBannerEnvironment('KORA_ADMIN', 'live')).toBe('live');
  });

  it('KORA_ADMIN + activeEnv future → future', () => {
    expect(resolveBannerEnvironment('KORA_ADMIN', 'future')).toBe('future');
  });
});

// ── pipeline: session object → resolveBannerEnvironment ──────────────────────

describe('pipeline completa: sessione Supabase → banner environment', () => {
  function pipeline(
    session: { user?: { app_metadata?: Record<string, unknown> } } | null,
    activeEnv: BannerEnvironment,
  ): BannerEnvironment | null {
    return resolveBannerEnvironment(resolveRealRoleFromSession(session), activeEnv);
  }

  it('sessione COMPANY_ADMIN con kora_role → live (non demo)', () => {
    const session = { user: { app_metadata: { kora_role: 'COMPANY_ADMIN' } } };
    expect(pipeline(session, 'demo')).toBe('live');
    expect(pipeline(session, 'demo')).not.toBe('demo');
  });

  it('sessione WORKER con kora_role → live (non demo)', () => {
    const session = { user: { app_metadata: { kora_role: 'WORKER' } } };
    expect(pipeline(session, 'demo')).toBe('live');
    expect(pipeline(session, 'demo')).not.toBe('demo');
  });

  it('sessione reale senza kora_role in app_metadata → live (non demo)', () => {
    const session = { user: { app_metadata: {} } };
    expect(pipeline(session, 'demo')).toBe('live');
    expect(pipeline(session, 'demo')).not.toBe('demo');
  });

  it('nessuna sessione → demo (visitor puro)', () => {
    expect(pipeline(null, 'demo')).toBe('demo');
  });

  it('sessione KORA_ADMIN → rispetta activeEnv demo', () => {
    const session = { user: { app_metadata: { kora_role: 'KORA_ADMIN' } } };
    expect(pipeline(session, 'demo')).toBe('demo');
  });

  it('sessione KORA_ADMIN → rispetta activeEnv live', () => {
    const session = { user: { app_metadata: { kora_role: 'KORA_ADMIN' } } };
    expect(pipeline(session, 'live')).toBe('live');
  });
});
