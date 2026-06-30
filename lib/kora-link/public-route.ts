// lib/kora-link/public-route.ts
// KORA Link — public route state evaluator.
// Server-only. No Supabase. No DB. No activation.
//
// evaluateKoraLinkPublicRouteState() accepts injectable `env` and
// `rateLimiterOverride` for testability — no vi.mock needed in tests.

import {
  isKoraLinkEnabled,
  getKoraLinkReadiness,
  type KoraLinkEnv,
} from './config';
import { isValidTokenFormat } from './token';
import {
  createKoraLinkRateLimiter,
  createRateLimitIdentifier,
  type KoraLinkRateLimiter,
  type KoraLinkRateLimitDecision,
} from './rate-limit';

// ── State ──────────────────────────────────────────────────────────────────────

export type KoraLinkPublicRouteState =
  | { state: 'hidden' }           // feature flag off → notFound()
  | { state: 'token_invalid' }    // format check failed → notFound()
  | { state: 'unavailable' }      // runtime not ready → safe error page
  | { state: 'rate_limited'; decision: KoraLinkRateLimitDecision }
  | { state: 'skeleton' };        // all checks passed → KL-10 skeleton page

// ── Params ─────────────────────────────────────────────────────────────────────

export type EvaluateKoraLinkPublicRouteParams = {
  rawToken: string | null | undefined;
  identifier?: string;
  env?: KoraLinkEnv;
  rateLimiterOverride?: KoraLinkRateLimiter;
};

// ── Evaluator ──────────────────────────────────────────────────────────────────

export async function evaluateKoraLinkPublicRouteState(
  params: EvaluateKoraLinkPublicRouteParams
): Promise<KoraLinkPublicRouteState> {
  const env = params.env ?? process.env;

  // 1. Feature flag — checked first; nothing else runs if off
  if (!isKoraLinkEnabled(env)) {
    return { state: 'hidden' };
  }

  // 2. Token format — before any digest or rate-limit keying on the raw value
  if (!isValidTokenFormat(params.rawToken)) {
    return { state: 'token_invalid' };
  }

  // 3. Runtime readiness (secret + base URL must be configured)
  const readiness = getKoraLinkReadiness(env);
  if (!readiness.ready) {
    return { state: 'unavailable' };
  }

  // 4. Rate limit
  const identifier =
    params.identifier ?? createRateLimitIdentifier({ route: 'public_link' });

  let decision: KoraLinkRateLimitDecision;
  try {
    const rateLimiter =
      params.rateLimiterOverride ?? createKoraLinkRateLimiter(env);
    decision = await rateLimiter.check({ route: 'public_link', identifier });
  } catch {
    return { state: 'unavailable' };
  }

  if (!decision.allowed) {
    // Provider not configured in dev/test → unavailable; real limit → rate_limited
    if (
      decision.reason === 'missing_provider' ||
      decision.reason === 'not_implemented'
    ) {
      return { state: 'unavailable' };
    }
    return { state: 'rate_limited', decision };
  }

  // 5. All checks passed — KL-10 skeleton (no DB lookup yet)
  return { state: 'skeleton' };
}
