// tests/unit/kora-link-rate-limit-upstash.test.ts
// KL-09 — KORA Link Upstash adapter unit tests.
// No real network calls. Upstash SDK is fully mocked via vi.mock.

import { vi, describe, it, expect, beforeEach } from 'vitest';

// Hoist the shared mock function so it is available inside the vi.mock factories.
// vi.hoisted() runs before any module code, making the variable safe to reference in factories.
const { mockLimitFn, mockSlidingWindow } = vi.hoisted(() => ({
  mockLimitFn: vi.fn(),
  mockSlidingWindow: vi.fn().mockReturnValue({ type: 'slidingWindow' }),
}));

// Mock @upstash/redis with a real class (arrow functions cannot be constructors)
vi.mock('@upstash/redis', () => ({
  Redis: class MockRedis {
    constructor(_config: unknown) { /* no-op */ }
  },
}));

// Mock @upstash/ratelimit — class-based to support `new Ratelimit(...)` and static methods
vi.mock('@upstash/ratelimit', () => {
  class MockRatelimit {
    limit = mockLimitFn;
    constructor(_config: unknown) { /* no-op */ }
  }
  (MockRatelimit as unknown as Record<string, unknown>).slidingWindow = mockSlidingWindow;
  return { Ratelimit: MockRatelimit };
});

// Import after mocks are registered
import {
  getKoraLinkUpstashEnvStatus,
  assertKoraLinkUpstashReady,
  createUpstashKoraLinkRateLimiter,
  KORA_LINK_PUBLIC_ROUTE_LIMIT,
  KORA_LINK_ACTIVATION_LIMIT,
} from '@/lib/kora-link/rate-limit';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const READY_UPSTASH_ENV = {
  UPSTASH_REDIS_REST_URL: 'https://fake-region.upstash.io',
  UPSTASH_REDIS_REST_TOKEN: 'fake-token-abc123',
};

const UPSTASH_RESPONSE_ALLOWED = {
  success: true,
  limit: KORA_LINK_PUBLIC_ROUTE_LIMIT,
  remaining: KORA_LINK_PUBLIC_ROUTE_LIMIT - 1,
  reset: 1_750_000_000_000,
  pending: Promise.resolve(),
};

const UPSTASH_RESPONSE_DENIED = {
  success: false,
  limit: KORA_LINK_PUBLIC_ROUTE_LIMIT,
  remaining: 0,
  reset: 1_750_000_060_000,
  pending: Promise.resolve(),
};

beforeEach(() => {
  mockLimitFn.mockReset();
  mockLimitFn.mockResolvedValue(UPSTASH_RESPONSE_ALLOWED);
});

// ── 1. getKoraLinkUpstashEnvStatus ───────────────────────────────────────────

describe('getKoraLinkUpstashEnvStatus', () => {

  it('returns hasUrl: false when UPSTASH_REDIS_REST_URL is absent', () => {
    const status = getKoraLinkUpstashEnvStatus({ UPSTASH_REDIS_REST_TOKEN: 'tok' });
    expect(status.hasUrl).toBe(false);
  });

  it('returns hasToken: false when UPSTASH_REDIS_REST_TOKEN is absent', () => {
    const status = getKoraLinkUpstashEnvStatus({ UPSTASH_REDIS_REST_URL: 'https://x.upstash.io' });
    expect(status.hasToken).toBe(false);
  });

  it('returns ready: false when URL is absent', () => {
    const status = getKoraLinkUpstashEnvStatus({ UPSTASH_REDIS_REST_TOKEN: 'tok' });
    expect(status.ready).toBe(false);
  });

  it('returns ready: false when token is absent', () => {
    const status = getKoraLinkUpstashEnvStatus({ UPSTASH_REDIS_REST_URL: 'https://x.upstash.io' });
    expect(status.ready).toBe(false);
  });

  it('returns ready: false when both are absent', () => {
    expect(getKoraLinkUpstashEnvStatus({}).ready).toBe(false);
  });

  it('returns ready: true when both URL and token are present', () => {
    const status = getKoraLinkUpstashEnvStatus(READY_UPSTASH_ENV);
    expect(status.ready).toBe(true);
    expect(status.hasUrl).toBe(true);
    expect(status.hasToken).toBe(true);
  });

  it('returns hasUrl: false for empty string URL', () => {
    const status = getKoraLinkUpstashEnvStatus({ UPSTASH_REDIS_REST_URL: '', UPSTASH_REDIS_REST_TOKEN: 'tok' });
    expect(status.hasUrl).toBe(false);
  });

  it('returns hasToken: false for empty string token', () => {
    const status = getKoraLinkUpstashEnvStatus({ UPSTASH_REDIS_REST_URL: 'https://x.upstash.io', UPSTASH_REDIS_REST_TOKEN: '' });
    expect(status.hasToken).toBe(false);
  });

  it('does not throw and does not return raw env values', () => {
    const status = getKoraLinkUpstashEnvStatus(READY_UPSTASH_ENV);
    const serialized = JSON.stringify(status);
    expect(serialized).not.toContain('fake-region');
    expect(serialized).not.toContain('fake-token');
  });

});

// ── 2. assertKoraLinkUpstashReady ─────────────────────────────────────────────

describe('assertKoraLinkUpstashReady', () => {

  it('throws when UPSTASH_REDIS_REST_URL is absent', () => {
    expect(() => assertKoraLinkUpstashReady({ UPSTASH_REDIS_REST_TOKEN: 'tok' })).toThrow();
  });

  it('throws when UPSTASH_REDIS_REST_TOKEN is absent', () => {
    expect(() => assertKoraLinkUpstashReady({ UPSTASH_REDIS_REST_URL: 'https://x.upstash.io' })).toThrow();
  });

  it('throws when both are absent', () => {
    expect(() => assertKoraLinkUpstashReady({})).toThrow();
  });

  it('does not throw when both URL and token are present', () => {
    expect(() => assertKoraLinkUpstashReady(READY_UPSTASH_ENV)).not.toThrow();
  });

  it('error message mentions the missing env var name (URL)', () => {
    try {
      assertKoraLinkUpstashReady({ UPSTASH_REDIS_REST_TOKEN: 'tok' });
      expect.fail('avrebbe dovuto lanciare');
    } catch (err: unknown) {
      if (err instanceof Error) {
        expect(err.message).toContain('UPSTASH_REDIS_REST_URL');
      }
    }
  });

  it('error message mentions the missing env var name (token)', () => {
    try {
      assertKoraLinkUpstashReady({ UPSTASH_REDIS_REST_URL: 'https://x.upstash.io' });
      expect.fail('avrebbe dovuto lanciare');
    } catch (err: unknown) {
      if (err instanceof Error) {
        expect(err.message).toContain('UPSTASH_REDIS_REST_TOKEN');
      }
    }
  });

  it('error does not expose the URL value', () => {
    const secretUrl = 'https://secret-internal-url.upstash.io';
    try {
      assertKoraLinkUpstashReady({ UPSTASH_REDIS_REST_URL: secretUrl });
      expect.fail('avrebbe dovuto lanciare');
    } catch (err: unknown) {
      if (err instanceof Error) {
        expect(err.message).not.toContain(secretUrl);
        expect(err.message).not.toContain('secret-internal-url');
      }
    }
  });

  it('error does not expose the token value', () => {
    const secretToken = 'super-secret-upstash-token-xyz789';
    try {
      assertKoraLinkUpstashReady({ UPSTASH_REDIS_REST_TOKEN: secretToken });
      expect.fail('avrebbe dovuto lanciare');
    } catch (err: unknown) {
      if (err instanceof Error) {
        expect(err.message).not.toContain(secretToken);
      }
    }
  });

});

// ── 3. createUpstashKoraLinkRateLimiter — construction ───────────────────────

describe('createUpstashKoraLinkRateLimiter — construction', () => {

  it('throws when env is missing (safety guard)', () => {
    expect(() => createUpstashKoraLinkRateLimiter({})).toThrow();
  });

  it('throws when URL is absent', () => {
    expect(() => createUpstashKoraLinkRateLimiter({ UPSTASH_REDIS_REST_TOKEN: 'tok' })).toThrow();
  });

  it('throws when token is absent', () => {
    expect(() => createUpstashKoraLinkRateLimiter({ UPSTASH_REDIS_REST_URL: 'https://x.upstash.io' })).toThrow();
  });

  it('returns a limiter with a check function when env is ready', () => {
    const limiter = createUpstashKoraLinkRateLimiter(READY_UPSTASH_ENV);
    expect(typeof limiter.check).toBe('function');
  });

  it('construction error does not expose URL or token values', () => {
    const secretUrl = 'https://private.upstash.io';
    try {
      createUpstashKoraLinkRateLimiter({ UPSTASH_REDIS_REST_URL: secretUrl });
      expect.fail('avrebbe dovuto lanciare');
    } catch (err: unknown) {
      if (err instanceof Error) {
        expect(err.message).not.toContain(secretUrl);
      }
    }
  });

});

// ── 4. Adapter check() behavior ───────────────────────────────────────────────

describe('createUpstashKoraLinkRateLimiter — check() behavior', () => {

  it('returns allowed: true when Upstash success is true', async () => {
    mockLimitFn.mockResolvedValue(UPSTASH_RESPONSE_ALLOWED);
    const limiter = createUpstashKoraLinkRateLimiter(READY_UPSTASH_ENV);
    const decision = await limiter.check({ route: 'public_link', identifier: 'ip-hash-abc' });
    expect(decision.allowed).toBe(true);
  });

  it('returns allowed: false when Upstash success is false', async () => {
    mockLimitFn.mockResolvedValue(UPSTASH_RESPONSE_DENIED);
    const limiter = createUpstashKoraLinkRateLimiter(READY_UPSTASH_ENV);
    const decision = await limiter.check({ route: 'public_link', identifier: 'ip-hash-abc' });
    expect(decision.allowed).toBe(false);
  });

  it('returns provider: "upstash"', async () => {
    const limiter = createUpstashKoraLinkRateLimiter(READY_UPSTASH_ENV);
    const decision = await limiter.check({ route: 'public_link', identifier: 'test-id' });
    expect(decision.provider).toBe('upstash');
  });

  it('returns limit matching the public_link route policy', async () => {
    const limiter = createUpstashKoraLinkRateLimiter(READY_UPSTASH_ENV);
    const decision = await limiter.check({ route: 'public_link', identifier: 'test-id' });
    expect(decision.limit).toBe(KORA_LINK_PUBLIC_ROUTE_LIMIT);
  });

  it('returns limit matching the activation route policy', async () => {
    mockLimitFn.mockResolvedValue({ ...UPSTASH_RESPONSE_ALLOWED, limit: KORA_LINK_ACTIVATION_LIMIT });
    const limiter = createUpstashKoraLinkRateLimiter(READY_UPSTASH_ENV);
    const decision = await limiter.check({ route: 'activation', identifier: 'test-id' });
    expect(decision.limit).toBe(KORA_LINK_ACTIVATION_LIMIT);
  });

  it('returns remaining from Upstash response', async () => {
    mockLimitFn.mockResolvedValue({ ...UPSTASH_RESPONSE_ALLOWED, remaining: 15 });
    const limiter = createUpstashKoraLinkRateLimiter(READY_UPSTASH_ENV);
    const decision = await limiter.check({ route: 'public_link', identifier: 'test-id' });
    expect(decision.remaining).toBe(15);
  });

  it('returns remaining: 0 when denied', async () => {
    mockLimitFn.mockResolvedValue(UPSTASH_RESPONSE_DENIED);
    const limiter = createUpstashKoraLinkRateLimiter(READY_UPSTASH_ENV);
    const decision = await limiter.check({ route: 'public_link', identifier: 'test-id' });
    expect(decision.remaining).toBe(0);
  });

  it('returns resetAt from Upstash reset field', async () => {
    const expectedReset = 1_750_000_000_000;
    mockLimitFn.mockResolvedValue({ ...UPSTASH_RESPONSE_ALLOWED, reset: expectedReset });
    const limiter = createUpstashKoraLinkRateLimiter(READY_UPSTASH_ENV);
    const decision = await limiter.check({ route: 'public_link', identifier: 'test-id' });
    expect(decision.resetAt).toBe(expectedReset);
  });

  it('passes context.identifier to Upstash limit()', async () => {
    const limiter = createUpstashKoraLinkRateLimiter(READY_UPSTASH_ENV);
    const testIdentifier = 'public_link:ip:abc123:tdp:deadbeef';
    await limiter.check({ route: 'public_link', identifier: testIdentifier });
    expect(mockLimitFn).toHaveBeenCalledWith(testIdentifier);
  });

  it('creates separate Ratelimit instances for different routes (mockLimitFn called twice)', async () => {
    // Each route creates its own Ratelimit — mockLimitFn is called once per check()
    const limiter = createUpstashKoraLinkRateLimiter(READY_UPSTASH_ENV);
    await limiter.check({ route: 'public_link', identifier: 'id1' });
    await limiter.check({ route: 'activation', identifier: 'id2' });
    // Both checks succeeded — mockLimitFn called twice
    expect(mockLimitFn).toHaveBeenCalledTimes(2);
  });

  it('re-uses the same Ratelimit instance for the same route (mockLimitFn called with both identifiers)', async () => {
    const limiter = createUpstashKoraLinkRateLimiter(READY_UPSTASH_ENV);
    await limiter.check({ route: 'public_link', identifier: 'id1' });
    await limiter.check({ route: 'public_link', identifier: 'id2' });
    // mockLimitFn called with both identifiers (same Ratelimit instance reused)
    expect(mockLimitFn).toHaveBeenNthCalledWith(1, 'id1');
    expect(mockLimitFn).toHaveBeenNthCalledWith(2, 'id2');
  });

  it('identifier passed to Upstash is not a raw kl1_ token', async () => {
    const limiter = createUpstashKoraLinkRateLimiter(READY_UPSTASH_ENV);
    const safeIdentifier = 'public_link:ip:hash123';
    await limiter.check({ route: 'public_link', identifier: safeIdentifier });
    const calledWith = mockLimitFn.mock.calls[0]?.[0] as string;
    expect(calledWith.startsWith('kl1_')).toBe(false);
  });

  it('decision has no reason field when allowed', async () => {
    mockLimitFn.mockResolvedValue(UPSTASH_RESPONSE_ALLOWED);
    const limiter = createUpstashKoraLinkRateLimiter(READY_UPSTASH_ENV);
    const decision = await limiter.check({ route: 'public_link', identifier: 'test-id' });
    expect(decision.reason).toBeUndefined();
  });

});
