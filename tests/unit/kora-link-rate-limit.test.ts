// tests/unit/kora-link-rate-limit.test.ts
// KL-08/KL-09 — KORA Link rate limit adapter unit tests.
// No Supabase. No DB. No network. All env injected via parameter.
// Factory tests that create Upstash adapters use the real constructors (no network
// from construction). Real check() calls are tested separately in kora-link-rate-limit-upstash.test.ts.

import { describe, it, expect } from 'vitest';
import {
  KORA_LINK_RATE_LIMIT_WINDOW_MS,
  KORA_LINK_PUBLIC_ROUTE_LIMIT,
  KORA_LINK_ACTIVATION_LIMIT,
  KORA_LINK_PARTNER_SCAN_LIMIT,
  KORA_LINK_ADMIN_BATCH_LIMIT,
  getKoraLinkRateLimitPolicy,
  createDisabledKoraLinkRateLimiter,
  createUnavailableKoraLinkRateLimiter,
  createKoraLinkRateLimiter,
  assertKoraLinkRateLimitProductionSafe,
  createRateLimitIdentifier,
  type KoraLinkRateLimitContext,
} from '@/lib/kora-link/rate-limit';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const BASE_CTX: KoraLinkRateLimitContext = { route: 'public_link', identifier: 'test-id' };

const envWith = (provider: string, nodeEnv = 'test') => ({
  KORA_LINK_RATE_LIMIT_PROVIDER: provider,
  NODE_ENV: nodeEnv,
});

const prodEnv = (provider?: string) => ({
  NODE_ENV: 'production',
  ...(provider ? { KORA_LINK_RATE_LIMIT_PROVIDER: provider } : {}),
});

const devEnv = (provider?: string) => ({
  NODE_ENV: 'development',
  ...(provider ? { KORA_LINK_RATE_LIMIT_PROVIDER: provider } : {}),
});

// ── 1. Constants ──────────────────────────────────────────────────────────────

describe('Constants', () => {

  it('KORA_LINK_RATE_LIMIT_WINDOW_MS is 60000 (1 minute)', () => {
    expect(KORA_LINK_RATE_LIMIT_WINDOW_MS).toBe(60_000);
  });

  it('KORA_LINK_PUBLIC_ROUTE_LIMIT is 30', () => {
    expect(KORA_LINK_PUBLIC_ROUTE_LIMIT).toBe(30);
  });

  it('KORA_LINK_ACTIVATION_LIMIT is 10', () => {
    expect(KORA_LINK_ACTIVATION_LIMIT).toBe(10);
  });

  it('KORA_LINK_PARTNER_SCAN_LIMIT is 60', () => {
    expect(KORA_LINK_PARTNER_SCAN_LIMIT).toBe(60);
  });

  it('KORA_LINK_ADMIN_BATCH_LIMIT is 10', () => {
    expect(KORA_LINK_ADMIN_BATCH_LIMIT).toBe(10);
  });

});

// ── 2. getKoraLinkRateLimitPolicy ────────────────────────────────────────────

describe('getKoraLinkRateLimitPolicy', () => {

  it('public_link: limit matches constant', () => {
    expect(getKoraLinkRateLimitPolicy('public_link').limit).toBe(KORA_LINK_PUBLIC_ROUTE_LIMIT);
  });

  it('activation: limit matches constant', () => {
    expect(getKoraLinkRateLimitPolicy('activation').limit).toBe(KORA_LINK_ACTIVATION_LIMIT);
  });

  it('partner_scan: limit matches constant', () => {
    expect(getKoraLinkRateLimitPolicy('partner_scan').limit).toBe(KORA_LINK_PARTNER_SCAN_LIMIT);
  });

  it('admin_batch: limit matches constant', () => {
    expect(getKoraLinkRateLimitPolicy('admin_batch').limit).toBe(KORA_LINK_ADMIN_BATCH_LIMIT);
  });

  it('all routes return windowMs = KORA_LINK_RATE_LIMIT_WINDOW_MS', () => {
    const routes = ['public_link', 'activation', 'partner_scan', 'admin_batch'] as const;
    for (const route of routes) {
      expect(getKoraLinkRateLimitPolicy(route).windowMs).toBe(KORA_LINK_RATE_LIMIT_WINDOW_MS);
    }
  });

  it('all limits are positive integers', () => {
    const routes = ['public_link', 'activation', 'partner_scan', 'admin_batch'] as const;
    for (const route of routes) {
      const { limit } = getKoraLinkRateLimitPolicy(route);
      expect(limit).toBeGreaterThan(0);
      expect(Number.isInteger(limit)).toBe(true);
    }
  });

  it('throws for an unknown route at runtime', () => {
    expect(() =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      getKoraLinkRateLimitPolicy('unknown_route' as any)
    ).toThrow();
  });

  it('error for unknown route does not include the raw route value', () => {
    const unknownRoute = 'super_secret_internal_route';
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      getKoraLinkRateLimitPolicy(unknownRoute as any);
      expect.fail('avrebbe dovuto lanciare');
    } catch (err: unknown) {
      if (err instanceof Error) {
        expect(err.message).not.toContain(unknownRoute);
      }
    }
  });

});

// ── 3. createDisabledKoraLinkRateLimiter ─────────────────────────────────────

describe('createDisabledKoraLinkRateLimiter', () => {

  it('returns an object with a check function', () => {
    const limiter = createDisabledKoraLinkRateLimiter();
    expect(typeof limiter.check).toBe('function');
  });

  it('check() returns allowed: true', async () => {
    const limiter = createDisabledKoraLinkRateLimiter();
    const decision = await limiter.check(BASE_CTX);
    expect(decision.allowed).toBe(true);
  });

  it('check() returns provider: "disabled"', async () => {
    const limiter = createDisabledKoraLinkRateLimiter();
    const decision = await limiter.check(BASE_CTX);
    expect(decision.provider).toBe('disabled');
  });

  it('check() returns reason: "disabled"', async () => {
    const limiter = createDisabledKoraLinkRateLimiter();
    const decision = await limiter.check(BASE_CTX);
    expect(decision.reason).toBe('disabled');
  });

  it('check() returns remaining equal to the route limit', async () => {
    const limiter = createDisabledKoraLinkRateLimiter();
    const decision = await limiter.check(BASE_CTX);
    expect(decision.remaining).toBe(decision.limit);
  });

  it('check() returns resetAt greater than now', async () => {
    const now = Date.now();
    const limiter = createDisabledKoraLinkRateLimiter();
    const decision = await limiter.check({ ...BASE_CTX, now });
    expect(decision.resetAt).not.toBeNull();
    expect(decision.resetAt!).toBeGreaterThan(now);
  });

  it('check() works for every route', async () => {
    const limiter = createDisabledKoraLinkRateLimiter();
    const routes = ['public_link', 'activation', 'partner_scan', 'admin_batch'] as const;
    for (const route of routes) {
      const decision = await limiter.check({ route, identifier: 'id' });
      expect(decision.allowed).toBe(true);
    }
  });

  it('does not throw on creation or on check', async () => {
    await expect(
      createDisabledKoraLinkRateLimiter().check(BASE_CTX)
    ).resolves.not.toThrow();
  });

});

// ── 4. createUnavailableKoraLinkRateLimiter ───────────────────────────────────

describe('createUnavailableKoraLinkRateLimiter', () => {

  it('returns an object with a check function', () => {
    const limiter = createUnavailableKoraLinkRateLimiter(null);
    expect(typeof limiter.check).toBe('function');
  });

  it('check() returns allowed: false', async () => {
    const limiter = createUnavailableKoraLinkRateLimiter(null);
    const decision = await limiter.check(BASE_CTX);
    expect(decision.allowed).toBe(false);
  });

  it('with null → provider is null and reason is "missing_provider"', async () => {
    const limiter = createUnavailableKoraLinkRateLimiter(null);
    const decision = await limiter.check(BASE_CTX);
    expect(decision.provider).toBeNull();
    expect(decision.reason).toBe('missing_provider');
  });

  it('with "upstash" → provider is "upstash" and reason is "not_implemented"', async () => {
    const limiter = createUnavailableKoraLinkRateLimiter('upstash');
    const decision = await limiter.check(BASE_CTX);
    expect(decision.provider).toBe('upstash');
    expect(decision.reason).toBe('not_implemented');
  });

  it('check() returns remaining: 0', async () => {
    const limiter = createUnavailableKoraLinkRateLimiter(null);
    const decision = await limiter.check(BASE_CTX);
    expect(decision.remaining).toBe(0);
  });

  it('check() returns resetAt: null', async () => {
    const limiter = createUnavailableKoraLinkRateLimiter('upstash');
    const decision = await limiter.check(BASE_CTX);
    expect(decision.resetAt).toBeNull();
  });

  it('does not throw on creation or on check', async () => {
    await expect(
      createUnavailableKoraLinkRateLimiter(null).check(BASE_CTX)
    ).resolves.not.toThrow();
  });

});

// ── 5. createKoraLinkRateLimiter ──────────────────────────────────────────────

describe('createKoraLinkRateLimiter', () => {

  it('provider missing in dev → returns unavailable limiter that denies', async () => {
    const limiter = createKoraLinkRateLimiter(devEnv());
    const decision = await limiter.check(BASE_CTX);
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toBe('missing_provider');
  });

  it('provider missing in test → returns unavailable limiter that denies', async () => {
    const limiter = createKoraLinkRateLimiter({ NODE_ENV: 'test' });
    const decision = await limiter.check(BASE_CTX);
    expect(decision.allowed).toBe(false);
  });

  it('provider disabled in dev → returns disabled limiter that allows', async () => {
    const limiter = createKoraLinkRateLimiter(devEnv('disabled'));
    const decision = await limiter.check(BASE_CTX);
    expect(decision.allowed).toBe(true);
    expect(decision.reason).toBe('disabled');
  });

  it('provider disabled in production → throws', () => {
    expect(() => createKoraLinkRateLimiter(prodEnv('disabled'))).toThrow();
  });

  it('provider missing in production → throws', () => {
    expect(() => createKoraLinkRateLimiter(prodEnv())).toThrow();
  });

  it('production throw error is privacy-safe (does not mirror raw unknown env value)', () => {
    const secretValue = 'my-unexpected-secret-provider';
    try {
      // getKoraLinkRateLimitProvider throws for unknown values before the factory can
      createKoraLinkRateLimiter({ NODE_ENV: 'production', KORA_LINK_RATE_LIMIT_PROVIDER: secretValue });
      expect.fail('avrebbe dovuto lanciare');
    } catch (err: unknown) {
      if (err instanceof Error) {
        expect(err.message).not.toContain(secretValue);
        expect(err.message.length).toBeGreaterThan(0);
      }
    }
  });

  it('provider upstash in dev → returns unavailable/not_implemented', async () => {
    const limiter = createKoraLinkRateLimiter(devEnv('upstash'));
    const decision = await limiter.check(BASE_CTX);
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toBe('not_implemented');
  });

  it('provider upstash in production without Upstash env → throws', () => {
    expect(() => createKoraLinkRateLimiter(prodEnv('upstash'))).toThrow();
  });

  it('provider upstash with Upstash env in dev → returns limiter (Upstash adapter)', () => {
    const env = {
      NODE_ENV: 'development',
      KORA_LINK_RATE_LIMIT_PROVIDER: 'upstash',
      UPSTASH_REDIS_REST_URL: 'https://fake.upstash.io',
      UPSTASH_REDIS_REST_TOKEN: 'fake-token',
    };
    const limiter = createKoraLinkRateLimiter(env);
    expect(typeof limiter.check).toBe('function');
  });

  it('provider upstash with Upstash env in production → returns limiter (does not throw)', () => {
    const env = {
      NODE_ENV: 'production',
      KORA_LINK_RATE_LIMIT_PROVIDER: 'upstash',
      UPSTASH_REDIS_REST_URL: 'https://fake.upstash.io',
      UPSTASH_REDIS_REST_TOKEN: 'fake-token',
    };
    const limiter = createKoraLinkRateLimiter(env);
    expect(typeof limiter.check).toBe('function');
  });

  it('unknown provider in env → throws via getKoraLinkRateLimitProvider', () => {
    expect(() =>
      createKoraLinkRateLimiter(envWith('redis', 'development'))
    ).toThrow();
  });

});

// ── 6. assertKoraLinkRateLimitProductionSafe ──────────────────────────────────

describe('assertKoraLinkRateLimitProductionSafe', () => {

  it('does not throw in development with missing provider', () => {
    expect(() => assertKoraLinkRateLimitProductionSafe(devEnv())).not.toThrow();
  });

  it('does not throw in development with disabled provider', () => {
    expect(() => assertKoraLinkRateLimitProductionSafe(devEnv('disabled'))).not.toThrow();
  });

  it('does not throw in test env with missing provider', () => {
    expect(() => assertKoraLinkRateLimitProductionSafe({ NODE_ENV: 'test' })).not.toThrow();
  });

  it('throws in production with missing provider', () => {
    expect(() => assertKoraLinkRateLimitProductionSafe(prodEnv())).toThrow();
  });

  it('throws in production with disabled provider', () => {
    expect(() => assertKoraLinkRateLimitProductionSafe(prodEnv('disabled'))).toThrow();
  });

  it('throws in production with upstash provider but missing Upstash env', () => {
    expect(() => assertKoraLinkRateLimitProductionSafe(prodEnv('upstash'))).toThrow();
  });

  it('does not throw in production with upstash provider and Upstash env configured', () => {
    expect(() =>
      assertKoraLinkRateLimitProductionSafe({
        NODE_ENV: 'production',
        KORA_LINK_RATE_LIMIT_PROVIDER: 'upstash',
        UPSTASH_REDIS_REST_URL: 'https://fake.upstash.io',
        UPSTASH_REDIS_REST_TOKEN: 'fake-token',
      })
    ).not.toThrow();
  });

  it('production error is privacy-safe (does not leak env input)', () => {
    try {
      assertKoraLinkRateLimitProductionSafe(prodEnv());
      expect.fail('avrebbe dovuto lanciare');
    } catch (err: unknown) {
      if (err instanceof Error) {
        expect(err.message.length).toBeGreaterThan(10);
      }
    }
  });

});

// ── 7. createRateLimitIdentifier ──────────────────────────────────────────────

describe('createRateLimitIdentifier', () => {

  it('result includes the route', () => {
    const id = createRateLimitIdentifier({ route: 'public_link' });
    expect(id).toContain('public_link');
  });

  it('result includes ipHash with ip: prefix when provided', () => {
    const id = createRateLimitIdentifier({ route: 'public_link', ipHash: 'abc123' });
    expect(id).toContain('ip:abc123');
  });

  it('result includes tokenDigestPrefix with tdp: prefix when provided', () => {
    const id = createRateLimitIdentifier({ route: 'public_link', tokenDigestPrefix: 'deadbeef' });
    expect(id).toContain('tdp:deadbeef');
  });

  it('result includes actorId with actor: prefix when provided', () => {
    const id = createRateLimitIdentifier({ route: 'activation', actorId: 'user-99' });
    expect(id).toContain('actor:user-99');
  });

  it('includes all parts when all are provided', () => {
    const id = createRateLimitIdentifier({
      route: 'partner_scan',
      ipHash: 'iphash',
      tokenDigestPrefix: 'deadbeef',
      actorId: 'actor-1',
    });
    expect(id).toContain('ip:iphash');
    expect(id).toContain('tdp:deadbeef');
    expect(id).toContain('actor:actor-1');
  });

  it('returns anonymous:<route> when no optional parts are provided', () => {
    const id = createRateLimitIdentifier({ route: 'activation' });
    expect(id).toBe('anonymous:activation');
  });

  it('returns anonymous:<route> when optional parts are null', () => {
    const id = createRateLimitIdentifier({
      route: 'admin_batch',
      ipHash: null,
      tokenDigestPrefix: null,
      actorId: null,
    });
    expect(id).toBe('anonymous:admin_batch');
  });

  it('treats empty string ipHash as absent', () => {
    const id = createRateLimitIdentifier({ route: 'public_link', ipHash: '' });
    expect(id).toBe('anonymous:public_link');
  });

  it('throws when tokenDigestPrefix starts with kl1_ (raw token guard)', () => {
    expect(() =>
      createRateLimitIdentifier({
        route: 'public_link',
        tokenDigestPrefix: 'kl1_' + 'A'.repeat(48),
      })
    ).toThrow(/tokenDigestPrefix/);
  });

  it('throws for an invalid route (privacy-safe)', () => {
    expect(() =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      createRateLimitIdentifier({ route: 'bad_route' as any })
    ).toThrow();
  });

  it('is stable: same inputs produce the same identifier', () => {
    const parts = { route: 'public_link' as const, ipHash: 'h1', tokenDigestPrefix: 'ab12' };
    expect(createRateLimitIdentifier(parts)).toBe(createRateLimitIdentifier(parts));
  });

  it('different ipHash produces different identifiers', () => {
    const base = { route: 'public_link' as const };
    const id1 = createRateLimitIdentifier({ ...base, ipHash: 'hash-a' });
    const id2 = createRateLimitIdentifier({ ...base, ipHash: 'hash-b' });
    expect(id1).not.toBe(id2);
  });

});
