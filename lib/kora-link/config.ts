// lib/kora-link/config.ts
// KORA Link — server-side configuration, feature flag, readiness check, rate limit skeleton.
// Server-only. No browser imports. No Supabase. No DB. No external dependencies.
//
// DESIGN PATTERN
//   Every function accepts an optional `env` parameter (default: process.env).
//   This keeps all functions pure and testable without touching process.env globally.
//
// RATE LIMIT NOTE
//   Provider integration (Upstash Redis) is NOT implemented here.
//   This module exposes only the config shape. The future route middleware
//   will call getKoraLinkRateLimitConfig() and wire it to the provider.

import { KORA_LINK_SECRET_MIN_LENGTH } from './token';

// ── Env type ──────────────────────────────────────────────────────────────────

// Env subset for KORA Link. Named keys serve as documentation; the index signature
// makes the type compatible with process.env (required by TypeScript 5.x weak-type check).
export type KoraLinkEnv = {
  readonly [key: string]: string | undefined;
  KORA_LINK_ENABLED?: string | undefined;
  KORA_LINK_TOKEN_SECRET?: string | undefined;
  KORA_LINK_PUBLIC_BASE_URL?: string | undefined;
  KORA_LINK_RATE_LIMIT_PROVIDER?: string | undefined;
  UPSTASH_REDIS_REST_URL?: string | undefined;
  UPSTASH_REDIS_REST_TOKEN?: string | undefined;
};

// ── Types ─────────────────────────────────────────────────────────────────────

export type KoraLinkReadinessResult =
  | { ready: true }
  | { ready: false; missing: string[] };

export type KoraLinkRateLimitConfig = {
  windowMs: number;
  maxRequests: number;
  keyPrefix: string;
};

// ── Rate limit constants ───────────────────────────────────────────────────────

// 1-minute sliding window for the public /link/[token] route.
// Upstash Redis provider is configured separately — these are the values it will use.
export const KORA_LINK_RATE_LIMIT_WINDOW_MS = 60_000;

// Max scan attempts per window per rate-limit bucket (hashed IP + UA).
// Conservative for v1 — a legitimate NFC scan is a human gesture, not a crawler.
export const KORA_LINK_RATE_LIMIT_MAX_PUBLIC = 20;

// Redis key prefix for all KORA Link rate limit buckets.
export const KORA_LINK_RATE_LIMIT_KEY_PREFIX = 'kl:rl:pub:';

// ── Feature flag ──────────────────────────────────────────────────────────────

/**
 * Returns true only if KORA_LINK_ENABLED === 'true' (exact string, case-sensitive).
 * Default: false. Accepts injected env for testing.
 */
export function isKoraLinkEnabled(env: KoraLinkEnv = process.env): boolean {
  return env.KORA_LINK_ENABLED === 'true';
}

// ── Public base URL ───────────────────────────────────────────────────────────

/**
 * Returns the public base URL for KORA Link NFC chip destinations.
 * Used to construct: `${baseUrl}/link/${tokenValue}` (on the chip, never in DB).
 *
 * Validates:
 *   - env var is present
 *   - value is a parseable URL
 *   - protocol is http or https (http allowed for local dev; https required in prod)
 *
 * Returns the URL without a trailing slash.
 * Throws descriptive errors — never logs the URL value itself.
 */
export function getKoraLinkPublicBaseUrl(env: KoraLinkEnv = process.env): string {
  const raw = env.KORA_LINK_PUBLIC_BASE_URL;
  if (!raw) {
    throw new Error('KORA_LINK_PUBLIC_BASE_URL non configurato');
  }
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error('KORA_LINK_PUBLIC_BASE_URL non è una URL valida');
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new Error(
      `KORA_LINK_PUBLIC_BASE_URL: protocollo non supportato (atteso http o https)`
    );
  }
  // Strip trailing slash for consistent chip URL construction downstream
  return raw.replace(/\/+$/, '');
}

// ── Readiness check ───────────────────────────────────────────────────────────

/**
 * Checks whether all required KORA Link env vars are present and valid.
 * Returns { ready: true } or { ready: false, missing: string[] }.
 *
 * Does NOT throw. Use assertKoraLinkReady() when you want an exception.
 * Call this at startup or in health-check routes.
 */
export function getKoraLinkReadiness(env: KoraLinkEnv = process.env): KoraLinkReadinessResult {
  const missing: string[] = [];

  if (!isKoraLinkEnabled(env)) {
    missing.push('KORA_LINK_ENABLED=true');
  }

  const secret = env.KORA_LINK_TOKEN_SECRET;
  if (!secret || secret.length < KORA_LINK_SECRET_MIN_LENGTH) {
    missing.push(
      `KORA_LINK_TOKEN_SECRET (minimo ${KORA_LINK_SECRET_MIN_LENGTH} caratteri, 256 bit)`
    );
  }

  if (!env.KORA_LINK_PUBLIC_BASE_URL) {
    missing.push('KORA_LINK_PUBLIC_BASE_URL');
  }

  if (missing.length > 0) {
    return { ready: false, missing };
  }
  return { ready: true };
}

/**
 * Throws if KORA Link is not ready to serve requests.
 * Use this as a guard at the start of the public route handler.
 */
export function assertKoraLinkReady(env: KoraLinkEnv = process.env): void {
  const result = getKoraLinkReadiness(env);
  if (!result.ready) {
    throw new Error(
      `KORA Link non è pronto. Configurazione mancante: ${result.missing.join(' · ')}`
    );
  }
}

// ── Rate limit config ─────────────────────────────────────────────────────────

/**
 * Returns the rate limit configuration for the public /link/[token] route.
 * Provider wiring (Upstash Redis) is NOT done here — this is config only.
 * The future route middleware reads this object and passes it to the provider.
 */
export function getKoraLinkRateLimitConfig(): KoraLinkRateLimitConfig {
  return {
    windowMs: KORA_LINK_RATE_LIMIT_WINDOW_MS,
    maxRequests: KORA_LINK_RATE_LIMIT_MAX_PUBLIC,
    keyPrefix: KORA_LINK_RATE_LIMIT_KEY_PREFIX,
  };
}

// ── Rate limit provider ───────────────────────────────────────────────────────

/**
 * Returns the configured rate limit provider from env.
 * Returns null if the env var is absent (unset or empty).
 * Throws a privacy-safe error for unrecognised values — never exposes the raw value.
 */
export function getKoraLinkRateLimitProvider(
  env: KoraLinkEnv = process.env
): 'disabled' | 'upstash' | null {
  const raw = env.KORA_LINK_RATE_LIMIT_PROVIDER;
  if (!raw) return null;
  if (raw === 'disabled' || raw === 'upstash') return raw;
  throw new Error(
    'KORA_LINK_RATE_LIMIT_PROVIDER: valore non riconosciuto — valori ammessi: disabled, upstash'
  );
}
