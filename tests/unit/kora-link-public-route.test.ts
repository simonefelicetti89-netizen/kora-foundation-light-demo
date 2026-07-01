// tests/unit/kora-link-public-route.test.ts
// KL-10 + KL-19 — evaluateKoraLinkPublicRouteState unit tests.
// All external dependencies are injected — no vi.mock, no network calls.

import { describe, it, expect } from 'vitest';
import { evaluateKoraLinkPublicRouteState } from '@/lib/kora-link/public-route';
import type { KoraLinkRateLimiter, KoraLinkRateLimitDecision } from '@/lib/kora-link/rate-limit';
import type { KoraLinkRpcClient } from '@/lib/kora-link/public-lookup';

// ── Fixtures ───────────────────────────────────────────────────────────────────

const VALID_TOKEN = 'kl1_' + 'A'.repeat(48);

const READY_ENV = {
  KORA_LINK_ENABLED: 'true',
  KORA_LINK_TOKEN_SECRET: 'a'.repeat(64),
  KORA_LINK_PUBLIC_BASE_URL: 'https://test.kora.ai',
  KORA_LINK_RATE_LIMIT_PROVIDER: 'disabled',
};

const LOOKUP_ENABLED_ENV = {
  ...READY_ENV,
  KORA_LINK_DB_LOOKUP_ENABLED: 'true',
};

// ── Rate limiter helpers ───────────────────────────────────────────────────────

function allowingLimiter(): KoraLinkRateLimiter {
  return {
    async check(): Promise<KoraLinkRateLimitDecision> {
      return { allowed: true, provider: 'disabled', limit: 30, remaining: 29, resetAt: null, reason: 'disabled' };
    },
  };
}

function denyingLimiter(reason?: KoraLinkRateLimitDecision['reason']): KoraLinkRateLimiter {
  return {
    async check(): Promise<KoraLinkRateLimitDecision> {
      const base: KoraLinkRateLimitDecision = { allowed: false, provider: null, limit: 30, remaining: 0, resetAt: null };
      return reason !== undefined ? { ...base, reason } : base;
    },
  };
}

function throwingLimiter(): KoraLinkRateLimiter {
  return {
    async check(): Promise<KoraLinkRateLimitDecision> {
      throw new Error('rate limiter connection refused');
    },
  };
}

// ── 1. Feature flag off ───────────────────────────────────────────────────────

describe('1. Feature flag off', () => {

  it('returns hidden when KORA_LINK_ENABLED is absent', async () => {
    const result = await evaluateKoraLinkPublicRouteState({ rawToken: VALID_TOKEN, env: {} });
    expect(result.state).toBe('hidden');
  });

  it('returns hidden when KORA_LINK_ENABLED is "false"', async () => {
    const result = await evaluateKoraLinkPublicRouteState({
      rawToken: VALID_TOKEN,
      env: { KORA_LINK_ENABLED: 'false' },
    });
    expect(result.state).toBe('hidden');
  });

  it('returns hidden when KORA_LINK_ENABLED is "1" (not canonical "true")', async () => {
    const result = await evaluateKoraLinkPublicRouteState({
      rawToken: VALID_TOKEN,
      env: { KORA_LINK_ENABLED: '1' },
    });
    expect(result.state).toBe('hidden');
  });

  it('returns hidden without evaluating token when flag is off', async () => {
    const result = await evaluateKoraLinkPublicRouteState({
      rawToken: null,
      env: { KORA_LINK_ENABLED: 'false' },
    });
    expect(result.state).toBe('hidden');
  });

});

// ── 2. Token format validation ────────────────────────────────────────────────

describe('2. Token format validation', () => {

  it('returns token_invalid when rawToken is null', async () => {
    const result = await evaluateKoraLinkPublicRouteState({ rawToken: null, env: READY_ENV });
    expect(result.state).toBe('token_invalid');
  });

  it('returns token_invalid when rawToken is undefined', async () => {
    const result = await evaluateKoraLinkPublicRouteState({ rawToken: undefined, env: READY_ENV });
    expect(result.state).toBe('token_invalid');
  });

  it('returns token_invalid when rawToken is empty string', async () => {
    const result = await evaluateKoraLinkPublicRouteState({ rawToken: '', env: READY_ENV });
    expect(result.state).toBe('token_invalid');
  });

  it('returns token_invalid when rawToken has wrong prefix', async () => {
    const result = await evaluateKoraLinkPublicRouteState({
      rawToken: 'kl2_' + 'A'.repeat(48),
      env: READY_ENV,
    });
    expect(result.state).toBe('token_invalid');
  });

  it('returns token_invalid when rawToken payload is too short', async () => {
    const result = await evaluateKoraLinkPublicRouteState({ rawToken: 'kl1_short', env: READY_ENV });
    expect(result.state).toBe('token_invalid');
  });

  it('returns token_invalid when rawToken contains non-base62 characters', async () => {
    const result = await evaluateKoraLinkPublicRouteState({
      rawToken: 'kl1_' + '-'.repeat(48),
      env: READY_ENV,
    });
    expect(result.state).toBe('token_invalid');
  });

  it('state is token_invalid (not hidden) when flag is on but token is malformed', async () => {
    const result = await evaluateKoraLinkPublicRouteState({
      rawToken: 'not-a-kora-link-token',
      env: READY_ENV,
    });
    expect(result.state).toBe('token_invalid');
  });

});

// ── 3. Runtime readiness ──────────────────────────────────────────────────────

describe('3. Runtime readiness', () => {

  it('returns unavailable when KORA_LINK_TOKEN_SECRET is absent', async () => {
    const result = await evaluateKoraLinkPublicRouteState({
      rawToken: VALID_TOKEN,
      env: {
        KORA_LINK_ENABLED: 'true',
        KORA_LINK_PUBLIC_BASE_URL: 'https://test.kora.ai',
        KORA_LINK_RATE_LIMIT_PROVIDER: 'disabled',
      },
    });
    expect(result.state).toBe('unavailable');
  });

  it('returns unavailable when KORA_LINK_TOKEN_SECRET is too short', async () => {
    const result = await evaluateKoraLinkPublicRouteState({
      rawToken: VALID_TOKEN,
      env: { ...READY_ENV, KORA_LINK_TOKEN_SECRET: 'tooshort' },
    });
    expect(result.state).toBe('unavailable');
  });

  it('returns unavailable when KORA_LINK_PUBLIC_BASE_URL is absent', async () => {
    const result = await evaluateKoraLinkPublicRouteState({
      rawToken: VALID_TOKEN,
      env: {
        KORA_LINK_ENABLED: 'true',
        KORA_LINK_TOKEN_SECRET: 'a'.repeat(64),
        KORA_LINK_RATE_LIMIT_PROVIDER: 'disabled',
      },
    });
    expect(result.state).toBe('unavailable');
  });

});

// ── 4. Rate limiting ──────────────────────────────────────────────────────────

describe('4. Rate limiting', () => {

  it('returns unavailable when rate limiter provider is missing in dev', async () => {
    const result = await evaluateKoraLinkPublicRouteState({
      rawToken: VALID_TOKEN,
      env: {
        KORA_LINK_ENABLED: 'true',
        KORA_LINK_TOKEN_SECRET: 'a'.repeat(64),
        KORA_LINK_PUBLIC_BASE_URL: 'https://test.kora.ai',
        // no KORA_LINK_RATE_LIMIT_PROVIDER
      },
    });
    expect(result.state).toBe('unavailable');
  });

  it('returns unavailable when rate limiter returns missing_provider reason', async () => {
    const result = await evaluateKoraLinkPublicRouteState({
      rawToken: VALID_TOKEN,
      env: READY_ENV,
      rateLimiterOverride: denyingLimiter('missing_provider'),
    });
    expect(result.state).toBe('unavailable');
  });

  it('returns unavailable when rate limiter returns not_implemented reason', async () => {
    const result = await evaluateKoraLinkPublicRouteState({
      rawToken: VALID_TOKEN,
      env: READY_ENV,
      rateLimiterOverride: denyingLimiter('not_implemented'),
    });
    expect(result.state).toBe('unavailable');
  });

  it('returns rate_limited when rate limiter denies with no reason (real limit hit)', async () => {
    const result = await evaluateKoraLinkPublicRouteState({
      rawToken: VALID_TOKEN,
      env: READY_ENV,
      rateLimiterOverride: denyingLimiter(),
    });
    expect(result.state).toBe('rate_limited');
  });

  it('rate_limited state includes the rate limit decision', async () => {
    const result = await evaluateKoraLinkPublicRouteState({
      rawToken: VALID_TOKEN,
      env: READY_ENV,
      rateLimiterOverride: denyingLimiter(),
    });
    expect(result.state).toBe('rate_limited');
    if (result.state === 'rate_limited') {
      expect(result.decision).toBeDefined();
      expect(result.decision.allowed).toBe(false);
    }
  });

  it('returns unavailable when rate limiter throws', async () => {
    const result = await evaluateKoraLinkPublicRouteState({
      rawToken: VALID_TOKEN,
      env: READY_ENV,
      rateLimiterOverride: throwingLimiter(),
    });
    expect(result.state).toBe('unavailable');
  });

  it('returns unavailable when factory throws in production (upstash provider, no env)', async () => {
    const result = await evaluateKoraLinkPublicRouteState({
      rawToken: VALID_TOKEN,
      env: {
        KORA_LINK_ENABLED: 'true',
        KORA_LINK_TOKEN_SECRET: 'a'.repeat(64),
        KORA_LINK_PUBLIC_BASE_URL: 'https://test.kora.ai',
        KORA_LINK_RATE_LIMIT_PROVIDER: 'upstash',
        NODE_ENV: 'production',
        // no UPSTASH_REDIS_REST_URL, no UPSTASH_REDIS_REST_TOKEN
      },
    });
    expect(result.state).toBe('unavailable');
  });

});

// ── 5. Skeleton (happy path) ──────────────────────────────────────────────────

describe('5. Skeleton state', () => {

  it('returns skeleton with injected allowing rate limiter', async () => {
    const result = await evaluateKoraLinkPublicRouteState({
      rawToken: VALID_TOKEN,
      env: READY_ENV,
      rateLimiterOverride: allowingLimiter(),
    });
    expect(result.state).toBe('skeleton');
  });

  it('returns skeleton end-to-end with provider=disabled in dev (real factory path)', async () => {
    const result = await evaluateKoraLinkPublicRouteState({
      rawToken: VALID_TOKEN,
      env: READY_ENV,
      // no rateLimiterOverride — uses real factory with disabled provider
    });
    expect(result.state).toBe('skeleton');
  });

});

// ── 6. Privacy safety ─────────────────────────────────────────────────────────

describe('6. Privacy safety', () => {

  it('hidden state result does not contain rawToken value', async () => {
    const result = await evaluateKoraLinkPublicRouteState({
      rawToken: VALID_TOKEN,
      env: {},
    });
    expect(JSON.stringify(result)).not.toContain('kl1_');
  });

  it('token_invalid state result does not contain rawToken value', async () => {
    const result = await evaluateKoraLinkPublicRouteState({
      rawToken: 'kl1_bad',
      env: READY_ENV,
    });
    expect(JSON.stringify(result)).not.toContain('kl1_bad');
  });

  it('unavailable state result does not expose env key names or values', async () => {
    const result = await evaluateKoraLinkPublicRouteState({
      rawToken: VALID_TOKEN,
      env: {
        KORA_LINK_ENABLED: 'true',
        KORA_LINK_PUBLIC_BASE_URL: 'https://test.kora.ai',
        // secret absent
      },
    });
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain('TOKEN_SECRET');
    expect(serialized).not.toContain('test.kora.ai');
  });

  it('default identifier does not expose the raw token', async () => {
    let capturedId: string | undefined;
    const limiter: KoraLinkRateLimiter = {
      async check(ctx): Promise<KoraLinkRateLimitDecision> {
        capturedId = ctx.identifier;
        return { allowed: true, provider: 'disabled', limit: 30, remaining: 29, resetAt: null };
      },
    };
    await evaluateKoraLinkPublicRouteState({
      rawToken: VALID_TOKEN,
      env: READY_ENV,
      rateLimiterOverride: limiter,
    });
    expect(typeof capturedId).toBe('string');
    expect(capturedId!.length).toBeGreaterThan(0);
    expect(capturedId).not.toContain('kl1_');
    expect(capturedId).not.toContain('AAAA');
  });

  it('custom identifier is forwarded to rate limiter unchanged', async () => {
    let capturedId: string | undefined;
    const limiter: KoraLinkRateLimiter = {
      async check(ctx): Promise<KoraLinkRateLimitDecision> {
        capturedId = ctx.identifier;
        return { allowed: true, provider: 'disabled', limit: 30, remaining: 29, resetAt: null };
      },
    };
    await evaluateKoraLinkPublicRouteState({
      rawToken: VALID_TOKEN,
      env: READY_ENV,
      rateLimiterOverride: limiter,
      identifier: 'ip-hash:aabbccdd',
    });
    expect(capturedId).toBe('ip-hash:aabbccdd');
  });

});
