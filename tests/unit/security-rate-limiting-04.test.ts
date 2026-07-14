// tests/unit/security-rate-limiting-04.test.ts
// SECURITY-RATE-LIMITING-04 — rate limit helper (lib/security/rate-limit.ts).
// All tests use an injected clock (`now`) and/or an injected in-memory store —
// no real timers, no real Upstash connection.

import { describe, it, expect, beforeEach } from 'vitest';
import {
  checkRateLimit,
  assertRateLimit,
  buildRateLimitKey,
  createMemoryRateLimitStore,
  getRateLimitPolicy,
  getRateLimitProvider,
  getUpstashEnvStatus,
  assertRateLimitProductionSafe,
  __resetSharedRateLimitStoreForTests,
  RATE_LIMIT_POLICIES,
  type RateLimitStore,
  type RateLimitCategory,
  type SecurityRateLimitEnv,
} from '@/lib/security/rate-limit';

// A store that always throws — simulates a storage outage for fail-open/closed tests.
function createFailingStore(): RateLimitStore {
  return {
    async hit() {
      throw new Error('simulated storage outage');
    },
  };
}

describe('buildRateLimitKey', () => {
  it('produce chiavi diverse per client (actorId) distinti, stessa categoria', () => {
    const a = buildRateLimitKey({ category: 'invite', actorId: 'admin-aaa' });
    const b = buildRateLimitKey({ category: 'invite', actorId: 'admin-bbb' });
    expect(a).not.toBe(b);
  });

  it('produce chiavi diverse per tenant/attore distinti anche su categoria bulk_provisioning', () => {
    const tenantA = buildRateLimitKey({ category: 'bulk_provisioning', actorId: 'tenant-A-admin' });
    const tenantB = buildRateLimitKey({ category: 'bulk_provisioning', actorId: 'tenant-B-admin' });
    expect(tenantA).not.toBe(tenantB);
  });

  it('non contiene email, token o IP — solo categoria e actorId opaco', () => {
    const key = buildRateLimitKey({ category: 'invite', actorId: 'a1b2c3d4-uuid' });
    expect(key).toBe('invite:actor:a1b2c3d4-uuid');
  });

  it('lancia per categoria sconosciuta', () => {
    expect(() => buildRateLimitKey({ category: 'nope' as RateLimitCategory, actorId: 'x' })).toThrow();
  });
});

describe('checkRateLimit — soglia e finestra (memory store, clock iniettato)', () => {
  let store: RateLimitStore;
  const T0 = 1_700_000_000_000;

  beforeEach(() => {
    store = createMemoryRateLimitStore();
  });

  it('prima richiesta è sempre consentita', async () => {
    const d = await checkRateLimit('invite', 'k1', store, T0);
    expect(d.allowed).toBe(true);
    expect(d.remaining).toBe(RATE_LIMIT_POLICIES.invite.limit - 1);
  });

  it('richieste entro soglia restano consentite', async () => {
    const limit = getRateLimitPolicy('invite').limit;
    let last;
    for (let i = 0; i < limit; i++) {
      last = await checkRateLimit('invite', 'k2', store, T0);
    }
    expect(last!.allowed).toBe(true);
    expect(last!.remaining).toBe(0);
  });

  it('richiesta oltre soglia viene bloccata (allowed=false)', async () => {
    const limit = getRateLimitPolicy('invite').limit;
    for (let i = 0; i < limit; i++) {
      await checkRateLimit('invite', 'k3', store, T0);
    }
    const blocked = await checkRateLimit('invite', 'k3', store, T0 + 1000);
    expect(blocked.allowed).toBe(false);
  });

  it('include un retryAfterSeconds coerente con la fine della finestra quando bloccata', async () => {
    const { limit, windowMs } = getRateLimitPolicy('invite');
    for (let i = 0; i < limit; i++) {
      await checkRateLimit('invite', 'k4', store, T0);
    }
    const blocked = await checkRateLimit('invite', 'k4', store, T0 + 2000);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
    expect(blocked.retryAfterSeconds).toBeLessThanOrEqual(Math.ceil(windowMs / 1000));
  });

  it('il contatore si azzera dopo la fine della finestra (reset)', async () => {
    const { limit, windowMs } = getRateLimitPolicy('invite');
    for (let i = 0; i < limit; i++) {
      await checkRateLimit('invite', 'k5', store, T0);
    }
    const blocked = await checkRateLimit('invite', 'k5', store, T0 + 1000);
    expect(blocked.allowed).toBe(false);

    const afterWindow = await checkRateLimit('invite', 'k5', store, T0 + windowMs + 1);
    expect(afterWindow.allowed).toBe(true);
  });

  it('chiavi diverse (client distinti) hanno contatori indipendenti', async () => {
    const { limit } = getRateLimitPolicy('invite');
    for (let i = 0; i < limit; i++) {
      await checkRateLimit('invite', 'client-A', store, T0);
    }
    const blockedA = await checkRateLimit('invite', 'client-A', store, T0 + 10);
    const firstB = await checkRateLimit('invite', 'client-B', store, T0 + 10);
    expect(blockedA.allowed).toBe(false);
    expect(firstB.allowed).toBe(true);
  });

  it('policy diverse hanno soglie diverse sulla stessa chiave logica', async () => {
    const inviteLimit = getRateLimitPolicy('invite').limit;
    const bulkLimit = getRateLimitPolicy('bulk_provisioning').limit;
    expect(inviteLimit).not.toBe(bulkLimit);

    // Same actor, two different categories — independent counters.
    for (let i = 0; i < bulkLimit; i++) {
      await checkRateLimit('bulk_provisioning', 'same-actor', store, T0);
    }
    const bulkBlocked = await checkRateLimit('bulk_provisioning', 'same-actor', store, T0 + 10);
    const inviteStillOk = await checkRateLimit('invite', 'same-actor', store, T0 + 10);
    expect(bulkBlocked.allowed).toBe(false);
    expect(inviteStillOk.allowed).toBe(true);
  });
});

describe('checkRateLimit — fail-open vs fail-closed su errore storage', () => {
  const T0 = 1_700_000_000_000;

  it('categoria fail-open (es. invite) consente la richiesta se lo storage fallisce', async () => {
    expect(getRateLimitPolicy('invite').failMode).toBe('open');
    const decision = await checkRateLimit('invite', 'k', createFailingStore(), T0);
    expect(decision.allowed).toBe(true);
    expect(decision.failedOpen).toBe(true);
  });

  it('categoria fail-closed (es. bulk_provisioning) blocca la richiesta se lo storage fallisce', async () => {
    expect(getRateLimitPolicy('bulk_provisioning').failMode).toBe('closed');
    const decision = await checkRateLimit('bulk_provisioning', 'k', createFailingStore(), T0);
    expect(decision.allowed).toBe(false);
    expect(decision.failedOpen).toBe(true);
  });

  it('destructive_admin_operation è fail-closed (azione distruttiva)', () => {
    expect(getRateLimitPolicy('destructive_admin_operation').failMode).toBe('closed');
  });

  it('costly_admin_operation è fail-open (pool di attori ristretto, priorità disponibilità)', () => {
    expect(getRateLimitPolicy('costly_admin_operation').failMode).toBe('open');
  });
});

describe('assertRateLimit — guard clause di route (429 + Retry-After)', () => {
  const T0 = 1_700_000_000_000;
  let store: RateLimitStore;

  beforeEach(() => {
    store = createMemoryRateLimitStore();
  });

  it('restituisce null (via libera) quando la richiesta è consentita', async () => {
    const res = await assertRateLimit('invite', 'actor-1', { store, now: T0 });
    expect(res).toBeNull();
  });

  it('restituisce 429 con header Retry-After quando la soglia è superata', async () => {
    const { limit } = getRateLimitPolicy('invite');
    for (let i = 0; i < limit; i++) {
      await assertRateLimit('invite', 'actor-2', { store, now: T0 });
    }
    const res = await assertRateLimit('invite', 'actor-2', { store, now: T0 + 10 });
    expect(res).not.toBeNull();
    expect(res!.status).toBe(429);
    expect(res!.headers.get('Retry-After')).toBeTruthy();
    expect(Number(res!.headers.get('Retry-After'))).toBeGreaterThan(0);
  });

  it('il corpo del 429 non espone email, token, IP o l\'actorId', async () => {
    const { limit } = getRateLimitPolicy('invite');
    const sensitiveActorId = 'user-uuid-should-not-leak-0001';
    for (let i = 0; i < limit; i++) {
      await assertRateLimit('invite', sensitiveActorId, { store, now: T0 });
    }
    const res = await assertRateLimit('invite', sensitiveActorId, { store, now: T0 + 10 });
    const body = await res!.json();
    const bodyStr = JSON.stringify(body);
    expect(bodyStr).not.toContain(sensitiveActorId);
    expect(bodyStr).not.toMatch(/@/); // no email-shaped content
    expect(body).toEqual({ error: 'Too Many Requests' });
  });

  it('provider "disabled" (env) bypassa sempre il guard, anche oltre soglia', async () => {
    const { limit } = getRateLimitPolicy('invite');
    const env = { SECURITY_RATE_LIMIT_PROVIDER: 'disabled' };
    for (let i = 0; i < limit + 5; i++) {
      const res = await assertRateLimit('invite', 'actor-3', { store, now: T0, env });
      expect(res).toBeNull();
    }
  });
});

describe('comportamento locale vs multi-istanza (memory store)', () => {
  it('comportamento locale: un singolo memory store condiviso applica correttamente il limite', async () => {
    const store = createMemoryRateLimitStore();
    const { limit } = getRateLimitPolicy('single_provisioning');
    for (let i = 0; i < limit; i++) {
      const d = await checkRateLimit('single_provisioning', 'local-actor', store, 1_700_000_000_000);
      expect(d.allowed).toBe(true);
    }
    const blocked = await checkRateLimit('single_provisioning', 'local-actor', store, 1_700_000_000_001);
    expect(blocked.allowed).toBe(false);
  });

  it('multi-istanza simulata: due memory store separati (due processi) NON condividono il contatore — motiva perché memory non è production-safe su deploy serverless', async () => {
    const instanceA = createMemoryRateLimitStore();
    const instanceB = createMemoryRateLimitStore();
    const { limit } = getRateLimitPolicy('single_provisioning');

    // Instance A alone reaches its limit.
    for (let i = 0; i < limit; i++) {
      await checkRateLimit('single_provisioning', 'actor-x', instanceA, 1_700_000_000_000);
    }
    const blockedOnA = await checkRateLimit('single_provisioning', 'actor-x', instanceA, 1_700_000_000_001);
    expect(blockedOnA.allowed).toBe(false);

    // Instance B has never seen this actor — same key, still allowed.
    // This is exactly the false sense of security a bare in-memory store
    // would give in a multi-instance/serverless deployment.
    const stillAllowedOnB = await checkRateLimit('single_provisioning', 'actor-x', instanceB, 1_700_000_000_001);
    expect(stillAllowedOnB.allowed).toBe(true);
  });
});

describe('getRateLimitProvider — parsing', () => {
  it('restituisce null se SECURITY_RATE_LIMIT_PROVIDER è assente', () => {
    expect(getRateLimitProvider({})).toBeNull();
  });

  it('lancia per un valore non riconosciuto', () => {
    expect(() => getRateLimitProvider({ SECURITY_RATE_LIMIT_PROVIDER: 'redis-cluster-9000' })).toThrow();
  });

  it('accetta memory, upstash, disabled', () => {
    expect(getRateLimitProvider({ SECURITY_RATE_LIMIT_PROVIDER: 'memory' })).toBe('memory');
    expect(getRateLimitProvider({ SECURITY_RATE_LIMIT_PROVIDER: 'upstash' })).toBe('upstash');
    expect(getRateLimitProvider({ SECURITY_RATE_LIMIT_PROVIDER: 'disabled' })).toBe('disabled');
  });
});

describe('getUpstashEnvStatus', () => {
  it('ready=false se mancano URL e/o TOKEN, senza mai riportarne il valore', () => {
    const status = getUpstashEnvStatus({});
    expect(status).toEqual({ hasUrl: false, hasToken: false, ready: false });
  });

  it('ready=true solo se entrambe sono presenti', () => {
    const status = getUpstashEnvStatus({
      UPSTASH_REDIS_REST_URL: 'https://example.upstash.io',
      UPSTASH_REDIS_REST_TOKEN: 'x',
    });
    expect(status.ready).toBe(true);
  });
});

describe('assertRateLimitProductionSafe — comportamento esplicito per ogni misconfigurazione', () => {
  it('non fa nulla fuori produzione, qualunque sia la configurazione', () => {
    expect(() => assertRateLimitProductionSafe({ NODE_ENV: 'development' })).not.toThrow();
    expect(() => assertRateLimitProductionSafe({ NODE_ENV: 'test' })).not.toThrow();
  });

  it('produzione + SECURITY_RATE_LIMIT_PROVIDER assente → lancia', () => {
    expect(() => assertRateLimitProductionSafe({ NODE_ENV: 'production' })).toThrow(/obbligatorio in production/);
  });

  it('produzione + SECURITY_RATE_LIMIT_PROVIDER=memory → lancia (non production-safe su serverless)', () => {
    expect(() =>
      assertRateLimitProductionSafe({ NODE_ENV: 'production', SECURITY_RATE_LIMIT_PROVIDER: 'memory' })
    ).toThrow(/memory non consentito in production/);
  });

  it('produzione + SECURITY_RATE_LIMIT_PROVIDER=disabled → lancia', () => {
    expect(() =>
      assertRateLimitProductionSafe({ NODE_ENV: 'production', SECURITY_RATE_LIMIT_PROVIDER: 'disabled' })
    ).toThrow(/disabled non consentito in production/);
  });

  it('produzione + upstash ma credenziali assenti → lancia senza esporne il valore', () => {
    try {
      assertRateLimitProductionSafe({ NODE_ENV: 'production', SECURITY_RATE_LIMIT_PROVIDER: 'upstash' });
      expect.unreachable('doveva lanciare');
    } catch (e) {
      const msg = (e as Error).message;
      expect(msg).toMatch(/UPSTASH_REDIS_REST_URL/);
      expect(msg).toMatch(/UPSTASH_REDIS_REST_TOKEN/);
    }
  });

  it('produzione + upstash + credenziali presenti → non lancia', () => {
    expect(() =>
      assertRateLimitProductionSafe({
        NODE_ENV: 'production',
        SECURITY_RATE_LIMIT_PROVIDER: 'upstash',
        UPSTASH_REDIS_REST_URL: 'https://example.upstash.io',
        UPSTASH_REDIS_REST_TOKEN: 'x',
      })
    ).not.toThrow();
  });
});

describe('assertRateLimit — misconfigurazione in produzione: mai un crash, mai una falsa disponibilità', () => {
  // These exercise the REAL route-level entry point (assertRateLimit), not
  // just the lower-level assertRateLimitProductionSafe — this is what a
  // route handler actually calls, so this is what proves the deploy
  // cannot crash before serving a request and cannot silently fall back
  // to an in-memory store in production.
  const T0 = 1_700_000_000_000;

  beforeEach(() => {
    __resetSharedRateLimitStoreForTests();
  });

  it('produzione, provider assente: non lancia mai (nessun crash) — applica il fail mode della categoria', async () => {
    const env: SecurityRateLimitEnv = { NODE_ENV: 'production' };

    // costly_admin_operation è fail-open → deve restituire null (via libera), non lanciare
    await expect(assertRateLimit('costly_admin_operation', 'actor-1', { now: T0, env })).resolves.toBeNull();

    // destructive_admin_operation è fail-closed → deve restituire 429, non lanciare né restituire null
    const res = await assertRateLimit('destructive_admin_operation', 'actor-1', { now: T0, env });
    expect(res).not.toBeNull();
    expect(res!.status).toBe(429);
  });

  it('produzione, valore non valido: non lancia mai (nessun crash) — applica il fail mode della categoria', async () => {
    // getRateLimitProvider lancerebbe su un valore non riconosciuto se
    // chiamato direttamente — assertRateLimit non deve mai propagare
    // quell'eccezione al chiamante (la route non deve andare in 500).
    const env = { NODE_ENV: 'production', SECURITY_RATE_LIMIT_PROVIDER: 'redis-cluster-9000' } as SecurityRateLimitEnv;

    await expect(assertRateLimit('invite', 'actor-2', { now: T0, env })).resolves.toBeNull(); // invite è fail-open
    const res = await assertRateLimit('bulk_provisioning', 'actor-2', { now: T0, env }); // fail-closed
    expect(res!.status).toBe(429);
  });

  it('produzione, provider=upstash ma credenziali assenti: non lancia mai — applica il fail mode della categoria', async () => {
    const env: SecurityRateLimitEnv = { NODE_ENV: 'production', SECURITY_RATE_LIMIT_PROVIDER: 'upstash' };

    await expect(assertRateLimit('token_creation', 'actor-3', { now: T0, env })).resolves.toBeNull(); // fail-open
    const res = await assertRateLimit('heavy_provisioning', 'actor-3', { now: T0, env }); // fail-closed
    expect(res!.status).toBe(429);
  });

  it('produzione, provider=disabled: NON bypassa il guard (a differenza di fuori produzione) — applica il fail mode della categoria', async () => {
    const env: SecurityRateLimitEnv = { NODE_ENV: 'production', SECURITY_RATE_LIMIT_PROVIDER: 'disabled' };

    await expect(assertRateLimit('single_provisioning', 'actor-4', { now: T0, env })).resolves.toBeNull(); // fail-open
    const res = await assertRateLimit('destructive_admin_operation', 'actor-4', { now: T0, env }); // fail-closed
    expect(res!.status).toBe(429);
  });

  it('fuori produzione, provider=disabled: bypassa il guard come previsto (comportamento invariato)', async () => {
    const env: SecurityRateLimitEnv = { NODE_ENV: 'development', SECURITY_RATE_LIMIT_PROVIDER: 'disabled' };
    const res = await assertRateLimit('destructive_admin_operation', 'actor-5', { now: T0, env });
    expect(res).toBeNull();
  });

  it('il 429 restituito per misconfigurazione non espone dettagli della configurazione o dell\'errore', async () => {
    const env: SecurityRateLimitEnv = { NODE_ENV: 'production' };
    const res = await assertRateLimit('destructive_admin_operation', 'actor-6', { now: T0, env });
    const body = await res!.json();
    expect(body).toEqual({ error: 'Too Many Requests' });
    expect(JSON.stringify(body)).not.toMatch(/UPSTASH|SECURITY_RATE_LIMIT_PROVIDER|production/i);
  });
});
