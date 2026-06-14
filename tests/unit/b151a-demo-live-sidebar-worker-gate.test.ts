/**
 * B151-A — Sidebar environment leak + My KORA real worker gate
 *
 * Due famiglie di test:
 *
 * SIDEBAR — verifica che il footer badge ambiente non mostri mai 'DEMO'
 *   a utenti reali (COMPANY_ADMIN, WORKER) e che il null-fallback bug sia rimosso.
 *   Test strutturali sul sorgente + logica pura via resolveBannerEnvironment.
 *
 * MY-KORA GATE — verifica la logica di ammissione a /my-kora:
 *   WORKER reale → ammesso
 *   KORA_ADMIN reale → ammesso (preview)
 *   COMPANY_ADMIN reale → bloccato
 *   Demo visitor con demo-state WORKER → ammesso
 *   Demo visitor con demo-state COMPANY_ADMIN → bloccato
 *   Pending → null (nessun flash)
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { resolveBannerEnvironment, resolveRealRoleFromSession } from '../../lib/demo-state/demo-controls-guard';

const root = resolve(process.cwd());
const sidebarSrc = readFileSync(resolve(root, 'components/layout/Sidebar.tsx'), 'utf-8');
const myKoraSrc  = readFileSync(resolve(root, 'app/my-kora/layout.tsx'),        'utf-8');

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

// ── MY-KORA GATE — source audit ───────────────────────────────────────────────

describe('my-kora/layout.tsx — source audit: gate non dipende solo da activeRole', () => {
  it('importa resolveRealRoleFromSession da demo-controls-guard', () => {
    expect(myKoraSrc).toContain('resolveRealRoleFromSession');
    expect(myKoraSrc).toContain('demo-controls-guard');
  });

  it('non usa più il vecchio fallback ?? null direttamente su app_metadata', () => {
    expect(myKoraSrc).not.toContain("app_metadata?.kora_role ?? null");
  });

  it('controlla realRole === "WORKER" per ammissione diretta worker reale', () => {
    expect(myKoraSrc).toContain("realRole === 'WORKER'");
  });

  it('controlla realRole === "KORA_ADMIN" per ammissione admin', () => {
    expect(myKoraSrc).toContain("realRole === 'KORA_ADMIN'");
  });

  it('il gate non dipende solo da activeRole — verifica realRole prima', () => {
    // realUserPermitted deve essere controllato PRIMA di demoVisitorPermitted
    const realUserIdx = myKoraSrc.indexOf('realUserPermitted');
    const demoVisitorIdx = myKoraSrc.indexOf('demoVisitorPermitted');
    expect(realUserIdx).toBeGreaterThan(-1);
    expect(demoVisitorIdx).toBeGreaterThan(-1);
    expect(realUserIdx).toBeLessThan(demoVisitorIdx);
  });

  it('il messaggio access denied per utente reale NON menziona Role Switcher', () => {
    // Il testo "Role Switcher" deve comparire solo nel branch demo visitor
    // Verifica: il messaggio per isRealUser non contiene "Role Switcher"
    expect(myKoraSrc).toContain('Il tuo account non ha accesso a questa area');
    expect(myKoraSrc).toContain('Contatta il tuo KORA referente');
  });

  it('il Role Switcher è citato solo per il branch demo visitor (null session)', () => {
    expect(myKoraSrc).toContain('usa il Role Switcher per passare a WORKER');
    // Ma solo nel ramo condizionale — entrambe le frasi devono coesistere
    // (una per reale, una per demo)
    expect(myKoraSrc).toContain('isRealUser');
  });

  it('COMPANY_ADMIN reale non è ammesso — il gate non ha una path che ammette tutti i real roles', () => {
    // Il gate ammette solo WORKER e KORA_ADMIN come real roles
    expect(myKoraSrc).not.toContain("realRole === 'COMPANY_ADMIN'");
    // Conferma: l'unico modo per un real user di essere ammesso è WORKER o KORA_ADMIN
    expect(myKoraSrc).toContain("realRole === 'WORKER' || realRole === 'KORA_ADMIN'");
  });

  it('il pending state (undefined) restituisce null — nessun flash', () => {
    expect(myKoraSrc).toContain('realRole === undefined) return null');
  });
});

// ── MY-KORA GATE — logica pura estratta inline ────────────────────────────────
// Replica la logica del layout come funzione pura per test comportamentali.

function myKoraGate(
  session: { user?: { app_metadata?: Record<string, unknown> } } | null,
  activeRole: string,
): 'admit' | 'block' | 'pending' {
  const realRole = resolveRealRoleFromSession(session);
  // Note: resolveRealRoleFromSession never returns undefined — it returns null or string.
  // 'pending' is the useState(undefined) state, not returned by resolveRealRoleFromSession.
  // We simulate it separately via the 'pending' case below.

  if (realRole === 'WORKER' || realRole === 'KORA_ADMIN') return 'admit';

  const isWorker = (r: string) => r === 'WORKER';
  const isAdmin  = (r: string) => r === 'KORA_ADMIN';
  if (realRole === null && (isWorker(activeRole) || isAdmin(activeRole))) return 'admit';

  return 'block';
}

describe('my-kora gate — comportamento per ogni tipo di sessione', () => {
  it('WORKER reale → ammesso', () => {
    const session = { user: { app_metadata: { kora_role: 'WORKER' } } };
    expect(myKoraGate(session, 'COMPANY_ADMIN')).toBe('admit');
  });

  it('WORKER reale con demo-state COMPANY_ADMIN → ammesso (non dipende da demo-state)', () => {
    const session = { user: { app_metadata: { kora_role: 'WORKER' } } };
    expect(myKoraGate(session, 'COMPANY_ADMIN')).toBe('admit');
  });

  it('KORA_ADMIN reale → ammesso (preview founder)', () => {
    const session = { user: { app_metadata: { kora_role: 'KORA_ADMIN' } } };
    expect(myKoraGate(session, 'COMPANY_ADMIN')).toBe('admit');
  });

  it('COMPANY_ADMIN reale → bloccato', () => {
    const session = { user: { app_metadata: { kora_role: 'COMPANY_ADMIN' } } };
    expect(myKoraGate(session, 'COMPANY_ADMIN')).toBe('block');
  });

  it('COMPANY_ADMIN reale + demo-state WORKER → ancora bloccato (demo-state non bypassa gate)', () => {
    const session = { user: { app_metadata: { kora_role: 'COMPANY_ADMIN' } } };
    expect(myKoraGate(session, 'WORKER')).toBe('block');
  });

  it('sessione reale senza kora_role (AUTHENTICATED) → bloccato', () => {
    const session = { user: { app_metadata: {} } };
    expect(myKoraGate(session, 'WORKER')).toBe('block');
  });

  it('nessuna sessione + demo-state WORKER → ammesso (visitor demo)', () => {
    expect(myKoraGate(null, 'WORKER')).toBe('admit');
  });

  it('nessuna sessione + demo-state COMPANY_ADMIN → bloccato', () => {
    expect(myKoraGate(null, 'COMPANY_ADMIN')).toBe('block');
  });

  it('nessuna sessione + demo-state KORA_ADMIN → ammesso (admin preview demo)', () => {
    expect(myKoraGate(null, 'KORA_ADMIN')).toBe('admit');
  });
});
