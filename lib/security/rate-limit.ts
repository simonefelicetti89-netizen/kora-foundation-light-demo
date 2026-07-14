// lib/security/rate-limit.ts — SECURITY-RATE-LIMITING-04
//
// Centralized rate limiting for sensitive mutating routes: abuse/brute-force/
// enumeration/spam/bulk-misuse defense-in-depth on top of the existing
// session auth + Origin guard (SECURITY-ORIGIN-GUARD-03).
//
// STORAGE
//   Reuses the Upstash Redis instance already provisioned for KORA Link
//   (lib/kora-link/rate-limit.ts) — same UPSTASH_REDIS_REST_URL/TOKEN, no
//   new external service or secret. A distinct key prefix ('sec:rl' vs
//   KORA Link's 'kl:rl') keeps the two counters independent.
//
//   In-memory storage is available ONLY as an explicit local/test fallback —
//   this deployment runs on Vercel (serverless, multi-instance), so a plain
//   process Map gives no real protection in production and must never be
//   the sole production safeguard. See assertRateLimitProductionSafe().
//
// PROVIDER (env SECURITY_RATE_LIMIT_PROVIDER):
//   'memory'   → local/test default. Single-process, best-effort only.
//   'upstash'  → real shared counter. Required in production.
//   'disabled' → always allows. Non-production only (tests, local opt-out).
//   unset      → treated as 'memory' outside production; production requires
//                an explicit value (see assertRateLimitProductionSafe).
//
// Docs: docs/SECURITY_RATE_LIMITING_04.md (policies, route inventory,
// fail-open/fail-closed rationale per category).

import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import { Ratelimit } from '@upstash/ratelimit';

// ── Env ────────────────────────────────────────────────────────────────────────

export type SecurityRateLimitEnv = {
  readonly [key: string]: string | undefined;
  SECURITY_RATE_LIMIT_PROVIDER?: string | undefined;
  UPSTASH_REDIS_REST_URL?: string | undefined;
  UPSTASH_REDIS_REST_TOKEN?: string | undefined;
  NODE_ENV?: string | undefined;
};

export type RateLimitProvider = 'memory' | 'upstash' | 'disabled';

export function getRateLimitProvider(
  env: SecurityRateLimitEnv = process.env
): RateLimitProvider | null {
  const raw = env.SECURITY_RATE_LIMIT_PROVIDER;
  if (!raw) return null;
  if (raw === 'memory' || raw === 'upstash' || raw === 'disabled') return raw;
  throw new Error(
    'SECURITY_RATE_LIMIT_PROVIDER: valore non riconosciuto — valori ammessi: memory, upstash, disabled'
  );
}

export function getUpstashEnvStatus(
  env: SecurityRateLimitEnv = process.env
): { hasUrl: boolean; hasToken: boolean; ready: boolean } {
  const hasUrl = Boolean(env.UPSTASH_REDIS_REST_URL);
  const hasToken = Boolean(env.UPSTASH_REDIS_REST_TOKEN);
  return { hasUrl, hasToken, ready: hasUrl && hasToken };
}

// Fails fast at startup if production is misconfigured — mirrors
// lib/kora-link/rate-limit.ts's assertKoraLinkRateLimitProductionSafe().
export function assertRateLimitProductionSafe(env: SecurityRateLimitEnv = process.env): void {
  if (env.NODE_ENV !== 'production') return;

  const provider = getRateLimitProvider(env);

  if (provider === null) {
    throw new Error(
      'SECURITY_RATE_LIMIT_PROVIDER non configurato — obbligatorio in production'
    );
  }
  if (provider === 'memory') {
    throw new Error(
      'SECURITY_RATE_LIMIT_PROVIDER=memory non consentito in production — deploy serverless/multi-istanza richiede uno storage condiviso (upstash)'
    );
  }
  if (provider === 'disabled') {
    throw new Error(
      'SECURITY_RATE_LIMIT_PROVIDER=disabled non consentito in production'
    );
  }
  if (provider === 'upstash') {
    const status = getUpstashEnvStatus(env);
    if (!status.ready) {
      const missing: string[] = [];
      if (!status.hasUrl) missing.push('UPSTASH_REDIS_REST_URL');
      if (!status.hasToken) missing.push('UPSTASH_REDIS_REST_TOKEN');
      throw new Error(
        `SECURITY_RATE_LIMIT_PROVIDER=upstash in production ma variabili mancanti: ${missing.join(', ')}`
      );
    }
  }
}

// ── Policy ─────────────────────────────────────────────────────────────────────
//
// One category per distinct abuse shape, not one per route — routes with the
// same risk profile share a policy. See docs/SECURITY_RATE_LIMITING_04.md for
// the full route→category mapping and the written rationale behind every
// limit/window/failMode below.

export type RateLimitCategory =
  | 'invite'
  | 'single_provisioning'
  | 'bulk_provisioning'
  | 'heavy_provisioning'
  | 'costly_admin_operation'
  | 'destructive_admin_operation'
  | 'token_creation';

export type FailMode = 'open' | 'closed';

export interface RateLimitPolicy {
  limit: number;
  windowMs: number;
  failMode: FailMode;
}

export const RATE_LIMIT_POLICIES: Record<RateLimitCategory, RateLimitPolicy> = {
  invite:                       { limit: 8,  windowMs: 5 * 60_000,  failMode: 'open' },
  single_provisioning:          { limit: 15, windowMs: 5 * 60_000,  failMode: 'open' },
  bulk_provisioning:            { limit: 3,  windowMs: 15 * 60_000, failMode: 'closed' },
  heavy_provisioning:           { limit: 5,  windowMs: 10 * 60_000, failMode: 'closed' },
  costly_admin_operation:       { limit: 5,  windowMs: 5 * 60_000,  failMode: 'open' },
  destructive_admin_operation:  { limit: 5,  windowMs: 10 * 60_000, failMode: 'closed' },
  token_creation:               { limit: 10, windowMs: 60 * 60_000, failMode: 'open' },
};

export function getRateLimitPolicy(category: RateLimitCategory): RateLimitPolicy {
  const policy = RATE_LIMIT_POLICIES[category];
  if (!policy) {
    // Compile-time exhaustive guard — also catches incorrect JS-runtime values.
    throw new Error(`getRateLimitPolicy: categoria non riconosciuta — ${String(category)}`);
  }
  return policy;
}

// ── Identifier ─────────────────────────────────────────────────────────────────
//
// Every route this sprint protects already requires an authenticated
// KORA_ADMIN / COMPANY_ADMIN / WORKER / PARTNER session (requireXUser()) —
// none is reachable anonymously. The realistic abuse shape is therefore "an
// authenticated actor calling the route too often" (buggy client retry,
// careless bulk resubmission, a compromised account), not anonymous internet
// brute force — so the key is the actor's own opaque user id, not an IP
// address, email, or token. This also avoids the whole X-Forwarded-For trust
// question entirely for these routes.

export function buildRateLimitKey(parts: {
  category: RateLimitCategory;
  actorId: string;
}): string {
  getRateLimitPolicy(parts.category); // validates category, throws on unknown
  return `${parts.category}:actor:${parts.actorId}`;
}

// ── Store abstraction ──────────────────────────────────────────────────────────
//
// hit() increments the counter for `key` within a `limit`-sized window of
// `windowMs` starting relative to `now`, and returns the count AFTER
// incrementing plus when that window resets. Both implementations below
// satisfy this contract identically so callers (and tests) can swap one for
// the other without changing behavior.

export interface RateLimitStore {
  hit(
    key: string,
    limit: number,
    windowMs: number,
    now: number
  ): Promise<{ count: number; resetAt: number }>;
}

// ── Memory store — local/test fallback ONLY, not production-safe ──────────────
// Fixed window (not sliding) — adequate for a best-effort local/dev/test
// fallback; the Upstash store below uses a proper sliding window.

export function createMemoryRateLimitStore(): RateLimitStore {
  const windows = new Map<string, { count: number; resetAt: number }>();

  return {
    async hit(key, _limit, windowMs, now) {
      const existing = windows.get(key);
      if (!existing || now >= existing.resetAt) {
        const fresh = { count: 1, resetAt: now + windowMs };
        windows.set(key, fresh);
        return fresh;
      }
      existing.count += 1;
      return existing;
    },
  };
}

// ── Upstash store — required in production ─────────────────────────────────────

export function createUpstashRateLimitStore(env: SecurityRateLimitEnv = process.env): RateLimitStore {
  const url = env.UPSTASH_REDIS_REST_URL;
  const token = env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    throw new Error(
      'createUpstashRateLimitStore: UPSTASH_REDIS_REST_URL e UPSTASH_REDIS_REST_TOKEN richiesti'
    );
  }

  const redis = new Redis({ url, token });
  // Ratelimit instances are keyed by (limit, windowMs) pair and created
  // lazily — one per distinct policy shape actually used, not per key.
  const limiters = new Map<string, Ratelimit>();

  function getLimiter(limit: number, windowMs: number): Ratelimit {
    const cacheKey = `${limit}:${windowMs}`;
    let limiter = limiters.get(cacheKey);
    if (!limiter) {
      const windowSecs = Math.max(1, Math.round(windowMs / 1000));
      limiter = new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(limit, `${windowSecs} s`),
        analytics: false,
        prefix: 'sec:rl',
      });
      limiters.set(cacheKey, limiter);
    }
    return limiter;
  }

  return {
    async hit(key, limit, windowMs, _now) {
      const limiter = getLimiter(limit, windowMs);
      const result = await limiter.limit(key);
      const count = limit - result.remaining + (result.success ? 0 : 1);
      return { count, resetAt: result.reset };
    },
  };
}

// ── Decision ───────────────────────────────────────────────────────────────────

export interface RateLimitDecision {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
  retryAfterSeconds: number;
  failedOpen: boolean;
}

export async function checkRateLimit(
  category: RateLimitCategory,
  key: string,
  store: RateLimitStore,
  now: number = Date.now()
): Promise<RateLimitDecision> {
  const policy = getRateLimitPolicy(category);

  try {
    const { count, resetAt } = await store.hit(key, policy.limit, policy.windowMs, now);

    const allowed = count <= policy.limit;
    const remaining = Math.max(0, policy.limit - count);
    const retryAfterSeconds = allowed ? 0 : Math.max(1, Math.ceil((resetAt - now) / 1000));

    return { allowed, limit: policy.limit, remaining, resetAt, retryAfterSeconds, failedOpen: false };
  } catch {
    // Storage error — apply the category's documented fail mode. Never
    // logs the error, key, or any request detail (may contain actor ids).
    if (policy.failMode === 'open') {
      return {
        allowed: true,
        limit: policy.limit,
        remaining: policy.limit,
        resetAt: now + policy.windowMs,
        retryAfterSeconds: 0,
        failedOpen: true,
      };
    }
    return {
      allowed: false,
      limit: policy.limit,
      remaining: 0,
      resetAt: now + policy.windowMs,
      retryAfterSeconds: Math.ceil(policy.windowMs / 1000),
      failedOpen: true,
    };
  }
}

// ── Shared store singleton ──────────────────────────────────────────────────────
// Lazily created once per process so route handlers don't each construct
// their own Redis client / limiter map. Tests should not use this singleton —
// pass an explicit store to assertRateLimit instead (see its `store` option).

let sharedStore: RateLimitStore | null = null;

function getSharedStore(env: SecurityRateLimitEnv = process.env): RateLimitStore {
  if (sharedStore) return sharedStore;

  // In production this throws unless SECURITY_RATE_LIMIT_PROVIDER=upstash
  // with valid credentials — never silently falls back to an in-memory
  // store on this serverless/multi-instance deployment, whether the
  // variable is unset, set to 'memory', or set to 'disabled'. The caller
  // (assertRateLimit) catches this and applies the category's fail mode
  // rather than letting it crash the route.
  assertRateLimitProductionSafe(env);

  const provider = getRateLimitProvider(env) ?? 'memory';

  if (provider === 'upstash') {
    sharedStore = createUpstashRateLimitStore(env);
  } else {
    // 'disabled' is handled earlier in assertRateLimit (short-circuits
    // before ever reaching the store), so falling through here only ever
    // happens for 'memory'.
    sharedStore = createMemoryRateLimitStore();
  }

  return sharedStore;
}

// Test-only escape hatch — resets the module-level singleton between test files.
export function __resetSharedRateLimitStoreForTests(): void {
  sharedStore = null;
}

// ── Route-level guard clause ────────────────────────────────────────────────────
//
// Mirrors lib/security/origin.ts's assertSameOrigin(): call first, return
// immediately if it yields a Response, otherwise proceed. Never logs the
// actor id, key, or any request detail.

function tooManyRequestsResponse(retryAfterSeconds: number): NextResponse {
  return NextResponse.json(
    { error: 'Too Many Requests' },
    { status: 429, headers: { 'Retry-After': String(retryAfterSeconds) } }
  );
}

export async function assertRateLimit(
  category: RateLimitCategory,
  actorId: string,
  options?: { store?: RateLimitStore; now?: number; env?: SecurityRateLimitEnv }
): Promise<NextResponse | null> {
  const env = options?.env ?? process.env;
  // Programmer error (unknown category) — not an operational misconfiguration,
  // intentionally not caught below; this must fail loud in development.
  const policy = getRateLimitPolicy(category);
  const key = buildRateLimitKey({ category, actorId });

  let store: RateLimitStore;
  try {
    const provider = getRateLimitProvider(env);
    // 'disabled' only bypasses the guard outside production — in production
    // it is rejected by assertRateLimitProductionSafe() below (via
    // getSharedStore), same as an unset or 'memory' provider, so a stray
    // SECURITY_RATE_LIMIT_PROVIDER=disabled in a live environment cannot
    // silently turn off protection on every request.
    if (provider === 'disabled' && env.NODE_ENV !== 'production') return null;

    store = options?.store ?? getSharedStore(env);
  } catch {
    // Any operational misconfiguration — an unrecognized
    // SECURITY_RATE_LIMIT_PROVIDER value, a production-safety rejection
    // (missing/invalid provider or Upstash credentials), or a genuine
    // Upstash construction failure — is handled identically via the
    // category's documented fail mode. This must never crash the route:
    // a misconfiguration must never turn a fail-open category into an
    // unhandled 500 on every request, and must never silently skip the
    // limit on a fail-closed category either. Never logs the error (may
    // contain connection details).
    if (policy.failMode === 'open') return null;
    return tooManyRequestsResponse(Math.ceil(policy.windowMs / 1000));
  }

  const decision = await checkRateLimit(category, key, store, options?.now);
  if (decision.allowed) return null;

  return tooManyRequestsResponse(decision.retryAfterSeconds);
}
