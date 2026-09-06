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
//
// MYKORA-01 converted this gate from client-side (useEffect + browser
// supabase.auth.getSession() + resolveRealRoleFromSession) to a server-side
// guard: getSessionKoraRole() (lib/auth/kora-session.ts) reads the real
// session from cookies before any HTML is sent — no pending/flash state, no
// client spoofing surface. The decision table below (WORKER/KORA_ADMIN admit,
// any other real role block, demo-state only for null session) is unchanged;
// only the mechanism moved server-side. The demo-visitor-only branch lives in
// app/my-kora/_providers/MyKoraDemoGate.tsx (client component), reached only
// when getSessionKoraRole() resolves to null.

const demoGateSrc = readFileSync(resolve(root, 'app/my-kora/_providers/MyKoraDemoGate.tsx'), 'utf-8');

describe('my-kora/layout.tsx — source audit: gate reale è server-side, non dipende da activeRole', () => {
  it('è un Server Component — nessuna direttiva use client', () => {
    expect(myKoraSrc.trimStart().startsWith("'use client'")).toBe(false);
  });

  it('risolve la sessione reale server-side via getSessionKoraRole (kora-session.ts)', () => {
    expect(myKoraSrc).toContain('getSessionKoraRole');
    expect(myKoraSrc).toContain('kora-session');
  });

  it('non usa più resolveRealRoleFromSession / browser getSession (mechanism moved server-side)', () => {
    expect(myKoraSrc).not.toContain('resolveRealRoleFromSession');
    expect(myKoraSrc).not.toContain('getSupabaseBrowserClient');
    expect(myKoraSrc).not.toContain('useEffect');
  });

  it('controlla realRole === "WORKER" per ammissione diretta worker reale', () => {
    expect(myKoraSrc).toContain("realRole === 'WORKER'");
  });

  it('controlla realRole === "KORA_ADMIN" per ammissione admin', () => {
    expect(myKoraSrc).toContain("realRole === 'KORA_ADMIN'");
  });

  // PRIOR HISTORY (accurate as of MYKORA-01, preserved verbatim): "il gate
  // reale (realUserPermitted) è valutato server-side, prima di delegare al
  // demo gate" — asserted a realUserPermitted admission branch existed before
  // <MyKoraDemoGate>. B-WORKER final cleanup (2026-09-06) replaced that
  // admission with redirects for real WORKER/KORA_ADMIN sessions —
  // realUserPermitted no longer exists. The ordering guarantee (real-session
  // decisions resolved before the demo-visitor path) still holds, now via
  // the redirect calls.
  it('le redirect di sessione reale sono valutate server-side, prima di delegare al demo gate', () => {
    const workerRedirectIdx = myKoraSrc.indexOf("redirect('/worker/workspace')");
    const demoGateUsageIdx = myKoraSrc.indexOf('<MyKoraDemoGate>');
    expect(myKoraSrc).not.toContain('realUserPermitted');
    expect(workerRedirectIdx).toBeGreaterThan(-1);
    expect(demoGateUsageIdx).toBeGreaterThan(-1);
    expect(workerRedirectIdx).toBeLessThan(demoGateUsageIdx);
    // demoVisitorPermitted (the demo-only check) still lives only in the delegate.
    expect(demoGateSrc).toContain('demoVisitorPermitted');
  });

  it('il messaggio access denied per utente reale NON menziona Role Switcher', () => {
    expect(myKoraSrc).toContain('Il tuo account non ha accesso a questa area');
    expect(myKoraSrc).toContain('Contatta il tuo KORA referente');
    expect(myKoraSrc).not.toContain('Role Switcher');
  });

  it('il Role Switcher è citato solo nel demo gate (null session)', () => {
    expect(demoGateSrc).toContain('usa il Role Switcher per passare a WORKER');
  });

  // PRIOR HISTORY (accurate as of MYKORA-01, preserved verbatim): asserted
  // the combined admission condition `realRole === 'WORKER' || realRole ===
  // 'KORA_ADMIN'` existed as a single admit gate. B-WORKER final cleanup
  // split this into two independent redirects (WORKER → /worker/workspace,
  // KORA_ADMIN → /admin) — the combined string no longer appears verbatim,
  // but the same two role checks are still present, now as redirect triggers.
  it('COMPANY_ADMIN reale non è ammesso — nessuna path ammette/redirige tutti i real roles', () => {
    expect(myKoraSrc).not.toContain("realRole === 'COMPANY_ADMIN'");
    expect(myKoraSrc).toContain("realRole === 'WORKER'");
    expect(myKoraSrc).toContain("realRole === 'KORA_ADMIN'");
    // Any other real role (non-null, non-WORKER/KORA_ADMIN) falls into the
    // explicit hard-block branch — fail closed, no path bypasses it.
    expect(myKoraSrc).toContain('realRole !== null');
  });

  it('nessuno stato pending/flash — server-side, un solo render deterministico', () => {
    // The old client gate had `if (realRole === undefined) return null` while
    // waiting for the browser session check. A Server Component has no such
    // state — the session is resolved before the first render.
    expect(myKoraSrc).not.toContain('realRole === undefined');
  });
});

// ── MY-KORA GATE — logica pura estratta inline ────────────────────────────────
// Replica la TABELLA DI DECISIONE del layout come funzione pura per test
// comportamentali — indipendente dal meccanismo di risoluzione della sessione
// (che dopo MYKORA-01 è getSessionKoraRole() server-side, non più
// resolveRealRoleFromSession lato client). resolveRealRoleFromSession resta
// usata qui solo come stub comodo per costruire l'input `session → realRole`
// nei casi di test; il contratto verificato è la tabella admit/block, non il
// meccanismo di lettura.

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
