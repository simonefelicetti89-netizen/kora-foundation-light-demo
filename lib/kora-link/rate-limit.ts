// lib/kora-link/rate-limit.ts
// KORA Link — rate limit types, policy, adapters, and factory.
// Server-only. No browser imports. No Supabase. No DB.
//
// PROVIDER STATUS (KL-09):
//   'disabled' → dev/test only, always allows. Production blocked by factory.
//   'upstash'  → real Upstash Redis adapter. Requires UPSTASH_REDIS_REST_URL + TOKEN.
//   null       → provider not configured. Denied in dev/test, throws in production.
//
// PRODUCTION RULES:
//   KORA_LINK_RATE_LIMIT_PROVIDER must be 'upstash' with Upstash env configured.
//   Call assertKoraLinkRateLimitProductionSafe() at server startup to enforce.

import { Redis } from '@upstash/redis';
import { Ratelimit } from '@upstash/ratelimit';

import {
  KORA_LINK_RATE_LIMIT_WINDOW_MS,
  type KoraLinkEnv,
  getKoraLinkRateLimitProvider,
} from './config';

// Re-export window constant so consumers may import from either module
export { KORA_LINK_RATE_LIMIT_WINDOW_MS };

// ── Types ──────────────────────────────────────────────────────────────────────

export type KoraLinkRateLimitProvider = 'disabled' | 'upstash';

export type KoraLinkRateLimitContext = {
  route: 'public_link' | 'activation' | 'partner_scan' | 'admin_batch';
  identifier: string;
  now?: number;
};

export type KoraLinkRateLimitDecision = {
  allowed: boolean;
  provider: KoraLinkRateLimitProvider | null;
  limit: number;
  remaining: number;
  resetAt: number | null;
  reason?: 'disabled' | 'missing_provider' | 'production_blocked' | 'not_implemented';
};

export type KoraLinkRateLimiter = {
  check(context: KoraLinkRateLimitContext): Promise<KoraLinkRateLimitDecision>;
};

export type KoraLinkUpstashEnvStatus = {
  hasUrl: boolean;
  hasToken: boolean;
  ready: boolean;
};

// ── Per-route limits ───────────────────────────────────────────────────────────

// Conservative limits for v1: NFC scans are human gestures, not crawler traffic.
export const KORA_LINK_PUBLIC_ROUTE_LIMIT = 30;
export const KORA_LINK_ACTIVATION_LIMIT = 10;
export const KORA_LINK_PARTNER_SCAN_LIMIT = 60;
export const KORA_LINK_ADMIN_BATCH_LIMIT = 10;

// ── Policy ─────────────────────────────────────────────────────────────────────

export function getKoraLinkRateLimitPolicy(
  route: KoraLinkRateLimitContext['route']
): { limit: number; windowMs: number } {
  switch (route) {
    case 'public_link':
      return { limit: KORA_LINK_PUBLIC_ROUTE_LIMIT, windowMs: KORA_LINK_RATE_LIMIT_WINDOW_MS };
    case 'activation':
      return { limit: KORA_LINK_ACTIVATION_LIMIT, windowMs: KORA_LINK_RATE_LIMIT_WINDOW_MS };
    case 'partner_scan':
      return { limit: KORA_LINK_PARTNER_SCAN_LIMIT, windowMs: KORA_LINK_RATE_LIMIT_WINDOW_MS };
    case 'admin_batch':
      return { limit: KORA_LINK_ADMIN_BATCH_LIMIT, windowMs: KORA_LINK_RATE_LIMIT_WINDOW_MS };
    default:
      // Compile-time exhaustive guard — also catches incorrect JS-runtime values
      throw new Error('getKoraLinkRateLimitPolicy: route non riconosciuta');
  }
}

// ── Disabled limiter ───────────────────────────────────────────────────────────
// Dev/test only. Production use is blocked by createKoraLinkRateLimiter.

export function createDisabledKoraLinkRateLimiter(): KoraLinkRateLimiter {
  return {
    async check(context: KoraLinkRateLimitContext): Promise<KoraLinkRateLimitDecision> {
      const { limit } = getKoraLinkRateLimitPolicy(context.route);
      const now = context.now ?? Date.now();
      return {
        allowed: true,
        provider: 'disabled',
        limit,
        remaining: limit,
        resetAt: now + KORA_LINK_RATE_LIMIT_WINDOW_MS,
        reason: 'disabled',
      };
    },
  };
}

// ── Unavailable limiter ────────────────────────────────────────────────────────
// Denies every request. Used when provider is missing or not yet configured.

export function createUnavailableKoraLinkRateLimiter(
  provider: KoraLinkRateLimitProvider | null
): KoraLinkRateLimiter {
  return {
    async check(context: KoraLinkRateLimitContext): Promise<KoraLinkRateLimitDecision> {
      const { limit } = getKoraLinkRateLimitPolicy(context.route);
      return {
        allowed: false,
        provider,
        limit,
        remaining: 0,
        resetAt: null,
        reason: provider === null ? 'missing_provider' : 'not_implemented',
      };
    },
  };
}

// ── Upstash env status ─────────────────────────────────────────────────────────

export function getKoraLinkUpstashEnvStatus(
  env: KoraLinkEnv = process.env
): KoraLinkUpstashEnvStatus {
  const hasUrl = Boolean(env['UPSTASH_REDIS_REST_URL']);
  const hasToken = Boolean(env['UPSTASH_REDIS_REST_TOKEN']);
  return { hasUrl, hasToken, ready: hasUrl && hasToken };
}

export function assertKoraLinkUpstashReady(env: KoraLinkEnv = process.env): void {
  const status = getKoraLinkUpstashEnvStatus(env);
  if (status.ready) return;
  const missing: string[] = [];
  if (!status.hasUrl) missing.push('UPSTASH_REDIS_REST_URL');
  if (!status.hasToken) missing.push('UPSTASH_REDIS_REST_TOKEN');
  throw new Error(
    `KORA Link Upstash: variabili env mancanti — ${missing.join(', ')}`
  );
}

// ── Upstash adapter ────────────────────────────────────────────────────────────

export function createUpstashKoraLinkRateLimiter(
  env: KoraLinkEnv = process.env
): KoraLinkRateLimiter {
  const url = env['UPSTASH_REDIS_REST_URL'];
  const token = env['UPSTASH_REDIS_REST_TOKEN'];

  if (!url || !token) {
    throw new Error(
      'KORA Link Upstash: env non configurato — UPSTASH_REDIS_REST_URL e UPSTASH_REDIS_REST_TOKEN richiesti'
    );
  }

  const redis = new Redis({ url, token });
  // Ratelimit instances are created lazily per route on first check() call.
  const limiters = new Map<KoraLinkRateLimitContext['route'], Ratelimit>();

  function getLimiter(route: KoraLinkRateLimitContext['route']): Ratelimit {
    let limiter = limiters.get(route);
    if (!limiter) {
      const { limit, windowMs } = getKoraLinkRateLimitPolicy(route);
      const windowSecs = Math.round(windowMs / 1000);
      limiter = new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(limit, `${windowSecs} s`),
        analytics: false,
        prefix: `kl:rl:${route}`,
      });
      limiters.set(route, limiter);
    }
    return limiter;
  }

  return {
    async check(context: KoraLinkRateLimitContext): Promise<KoraLinkRateLimitDecision> {
      const { limit } = getKoraLinkRateLimitPolicy(context.route);
      const ratelimiter = getLimiter(context.route);
      const result = await ratelimiter.limit(context.identifier);
      return {
        allowed: result.success,
        provider: 'upstash',
        limit,
        remaining: result.remaining,
        resetAt: result.reset,
      };
    },
  };
}

// ── Factory ────────────────────────────────────────────────────────────────────

export function createKoraLinkRateLimiter(env: KoraLinkEnv = process.env): KoraLinkRateLimiter {
  const isProduction = env['NODE_ENV'] === 'production';
  const provider = getKoraLinkRateLimitProvider(env);

  if (provider === null) {
    if (isProduction) {
      throw new Error(
        'KORA Link: KORA_LINK_RATE_LIMIT_PROVIDER non configurato — obbligatorio in production'
      );
    }
    return createUnavailableKoraLinkRateLimiter(null);
  }

  if (provider === 'disabled') {
    if (isProduction) {
      throw new Error(
        'KORA Link: KORA_LINK_RATE_LIMIT_PROVIDER=disabled non consentito in production'
      );
    }
    return createDisabledKoraLinkRateLimiter();
  }

  if (provider === 'upstash') {
    const upstashStatus = getKoraLinkUpstashEnvStatus(env);
    if (!upstashStatus.ready) {
      if (isProduction) {
        throw new Error(
          'KORA Link: Upstash env mancanti in production — configurare UPSTASH_REDIS_REST_URL e UPSTASH_REDIS_REST_TOKEN'
        );
      }
      return createUnavailableKoraLinkRateLimiter('upstash');
    }
    return createUpstashKoraLinkRateLimiter(env);
  }

  throw new Error('KORA Link: provider non riconosciuto');
}

// ── Production safety guard ────────────────────────────────────────────────────

export function assertKoraLinkRateLimitProductionSafe(env: KoraLinkEnv = process.env): void {
  if (env['NODE_ENV'] !== 'production') return;

  const provider = getKoraLinkRateLimitProvider(env);

  if (provider === null) {
    throw new Error(
      'KORA Link: KORA_LINK_RATE_LIMIT_PROVIDER non configurato — obbligatorio in production'
    );
  }

  if (provider === 'disabled') {
    throw new Error(
      'KORA Link: KORA_LINK_RATE_LIMIT_PROVIDER=disabled non consentito in production'
    );
  }

  if (provider === 'upstash') {
    // Also verify Upstash env is configured when provider is set to upstash
    assertKoraLinkUpstashReady(env);
  }
}

// ── Identifier builder ─────────────────────────────────────────────────────────

export function createRateLimitIdentifier(parts: {
  ipHash?: string | null;
  tokenDigestPrefix?: string | null;
  actorId?: string | null;
  route: KoraLinkRateLimitContext['route'];
}): string {
  // Validate route — throws a privacy-safe error for unknown routes
  getKoraLinkRateLimitPolicy(parts.route);

  // Guard against accidental raw token being passed instead of digest prefix
  if (parts.tokenDigestPrefix?.startsWith('kl1_')) {
    throw new Error(
      'createRateLimitIdentifier: tokenDigestPrefix non deve contenere token raw — usa digestPrefix()'
    );
  }

  const segments: string[] = [];

  if (parts.ipHash) {
    segments.push(`ip:${parts.ipHash}`);
  }

  if (parts.tokenDigestPrefix) {
    segments.push(`tdp:${parts.tokenDigestPrefix}`);
  }

  if (parts.actorId) {
    segments.push(`actor:${parts.actorId}`);
  }

  if (segments.length === 0) {
    return `anonymous:${parts.route}`;
  }

  return `${parts.route}:${segments.join(':')}`;
}
