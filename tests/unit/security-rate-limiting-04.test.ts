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
  RATE_LIMIT_POLICIES,
  type RateLimitStore,
  type RateLimitCategory,
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
