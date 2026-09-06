/**
 * B151-A — Sidebar environment leak + My KORA real worker gate
 *
 * SIDEBAR — verifica che il footer badge ambiente non mostri mai 'DEMO'
 *   a utenti reali (COMPANY_ADMIN, WORKER) e che il null-fallback bug sia rimosso.
 *   Test strutturali sul sorgente + logica pura via resolveBannerEnvironment.
 *   Unaffected by the B-WORKER "One Product / No Demo Runtime" correction
 *   below — Sidebar.tsx and demo-controls-guard.ts are untouched.
 *
 * MY-KORA GATE — PRIOR HISTORY (accurate as of B151-A/MYKORA-01, preserved
 * as a record, not verbatim given the volume): this section tested
 * app/my-kora/layout.tsx's server-side admission table (WORKER/KORA_ADMIN
 * real sessions admitted, other real roles blocked, demo-state admission
 * for null sessions via app/my-kora/_providers/MyKoraDemoGate.tsx) and a
 * pure `myKoraGate()` replica of that decision table.
 *
 * B-WORKER "One Product / No Demo Runtime" correction (2026-09-06):
 * app/my-kora/layout.tsx no longer performs any admission decision at all —
 * every /my-kora/** page redirects unconditionally to its canonical
 * /worker/** equivalent, for every visitor
 * (docs/KORA_OFFICIAL_IMPLEMENTATION_MASTER_PLAN_v2.1_PATCH_03.md).
 * MyKoraDemoGate.tsx is deleted (zero real callers). There is no admit/block
 * decision table left to test on this layout.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { resolveBannerEnvironment, resolveRealRoleFromSession } from '../../lib/demo-state/demo-controls-guard';

const root = resolve(process.cwd());
const sidebarSrc = readFileSync(resolve(root, 'components/layout/Sidebar.tsx'), 'utf-8');

// ── SIDEBAR — source audit ────────────────────────────────────────────────────

describe('Sidebar.tsx — source audit: null-fallback bug rimosso', () => {
  it('importa resolveRealRoleFromSession da demo-controls-guard', () => {
    expect(sidebarSrc).toContain("resolveRealRoleFromSession");
    expect(sidebarSrc).toContain("demo-controls-guard");
  });

  it('importa resolveBannerEnvironment da demo-controls-guard', () => {
    expect(sidebarSrc).toContain("resolveBannerEnvironment");
  });

  it('non usa più il vecchio fallback ??"null" direttamente su app_metadata', () => {
    expect(sidebarSrc).not.toContain("app_metadata?.kora_role ?? null");
  });

  it('non usa più ENV_LABEL[activeEnvironment] ?? "DEMO" senza guard', () => {
    expect(sidebarSrc).not.toContain('?? \'DEMO\'');
    expect(sidebarSrc).not.toContain('?? "DEMO"');
  });

  it('usa effectiveEnv per il footer badge', () => {
    expect(sidebarSrc).toContain('effectiveEnv');
    expect(sidebarSrc).toContain('ENV_LABEL[effectiveEnv]');
  });

  it('condiziona il render del badge su effectiveEnv !== null', () => {
    expect(sidebarSrc).toContain('effectiveEnv !== null');
  });
});

// ── SIDEBAR — logica pura: resolveBannerEnvironment già testata in B150, ─────
// Qui verifichiamo solo i casi rilevanti per la sidebar footer badge.

describe('Sidebar footer badge — logica di resolveBannerEnvironment', () => {
  it('COMPANY_ADMIN reale → effectiveEnv = "live", mai "demo"', () => {
    const role = resolveRealRoleFromSession({ user: { app_metadata: { kora_role: 'COMPANY_ADMIN' } } });
    expect(resolveBannerEnvironment(role, 'demo')).toBe('live');
    expect(resolveBannerEnvironment(role, 'demo')).not.toBe('demo');
  });

  it('WORKER reale → effectiveEnv = "live", mai "demo"', () => {
    const role = resolveRealRoleFromSession({ user: { app_metadata: { kora_role: 'WORKER' } } });
    expect(resolveBannerEnvironment(role, 'demo')).toBe('live');
    expect(resolveBannerEnvironment(role, 'demo')).not.toBe('demo');
  });

  it('sessione reale senza kora_role (AUTHENTICATED) → "live", mai "demo"', () => {
    const role = resolveRealRoleFromSession({ user: { app_metadata: {} } });
    expect(resolveBannerEnvironment(role, 'demo')).toBe('live');
    expect(resolveBannerEnvironment(role, 'demo')).not.toBe('demo');
  });

  it('pending (undefined) → null, nessun badge renderizzato', () => {
    expect(resolveBannerEnvironment(undefined, 'demo')).toBe(null);
  });

  it('KORA_ADMIN → rispetta activeEnvironment (può vedere DEMO)', () => {
    const role = resolveRealRoleFromSession({ user: { app_metadata: { kora_role: 'KORA_ADMIN' } } });
    expect(resolveBannerEnvironment(role, 'demo')).toBe('demo');
  });

  it('nessuna sessione (null) + activeEnv demo → mostra DEMO (visitor puro)', () => {
    expect(resolveBannerEnvironment(null, 'demo')).toBe('demo');
  });
});

// ── MY-KORA GATE — retired: layout.tsx no longer makes an admission decision ──

describe('my-kora/layout.tsx — no longer a gate of any kind (B-WORKER preview runtime retirement)', () => {
  const myKoraSrc = readFileSync(resolve(root, 'app/my-kora/layout.tsx'), 'utf-8');

  it('performs no session read, no role check, no admission decision', () => {
    expect(myKoraSrc).not.toContain('getSessionKoraRole');
    expect(myKoraSrc).not.toContain('realRole');
    expect(myKoraSrc).not.toContain('resolveRealRoleFromSession');
    expect(myKoraSrc).not.toContain('MyKoraDemoGate');
  });

  it('MyKoraDemoGate.tsx no longer exists', () => {
    expect(() => readFileSync(resolve(root, 'app/my-kora/_providers/MyKoraDemoGate.tsx'), 'utf-8')).toThrow();
  });
});
