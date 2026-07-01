// lib/kora-link/public-lookup.ts
// KORA Link — public route DB lookup via fn_public_lookup_link RPC.
// Server-only. Uses server-side Supabase client (anon key + cookie session).
// NEVER uses service role key — public route is unauthenticated.
// NEVER sends raw token to DB — only HMAC-SHA256 digest.
// Feature-flagged by KORA_LINK_DB_LOOKUP_ENABLED (default false).
//
// INVARIANTS
//   • validatedToken cleartext: never logged, never passed to DB
//   • Only token_digest (64-char hex) reaches the RPC function
//   • Return value is a plain state string — no digest, no token, no PII
//   • Client failure → 'unavailable' (safe fallback, no error details exposed)

import { computeDigest } from './token';
import { isKoraLinkDbLookupEnabled, type KoraLinkEnv } from './config';

// ── RPC client interface ──────────────────────────────────────────────────────
// Minimal interface for injection in tests — no vi.mock needed.

export type KoraLinkRpcRow = { status: string; reason: string };

export type KoraLinkRpcClient = {
  rpc(
    fn: 'fn_public_lookup_link',
    args: { p_token_digest: string }
  ): Promise<{ data: KoraLinkRpcRow[] | null; error: unknown | null }>;
};

// ── State ─────────────────────────────────────────────────────────────────────

export type KoraLinkPublicLookupState =
  | 'lookup_disabled'   // KORA_LINK_DB_LOOKUP_ENABLED not true → caller shows skeleton safe
  | 'ready'             // RPC returned status='ready' — chip usable
  | 'unavailable';      // RPC error, DB failure, or status not 'ready' — safe fallback

// ── Params ────────────────────────────────────────────────────────────────────

export type KoraLinkPublicLookupParams = {
  validatedToken: string;             // already passed isValidTokenFormat — never logged
  secret: string;                     // KORA_LINK_TOKEN_SECRET value — never logged
  env?: KoraLinkEnv;
  rpcClientOverride?: KoraLinkRpcClient;  // inject in tests; real client used in production
};

// ── Lookup ────────────────────────────────────────────────────────────────────

export async function lookupKoraLinkPublicState(
  params: KoraLinkPublicLookupParams
): Promise<KoraLinkPublicLookupState> {
  const env = params.env ?? process.env;

  // Guard: DB lookup feature flag — default false until Gate 2+3 closed
  if (!isKoraLinkDbLookupEnabled(env)) {
    return 'lookup_disabled';
  }

  // Compute digest — only the digest is sent to the DB, never the raw token
  let digest: string;
  try {
    digest = computeDigest(params.validatedToken, params.secret);
  } catch {
    return 'unavailable';
  }

  // Acquire client — injected in tests, real server client in production
  let client: KoraLinkRpcClient;
  if (params.rpcClientOverride) {
    client = params.rpcClientOverride;
  } else {
    try {
      // Dynamic import: avoids next/headers execution outside request context (tests, build).
      const { getSupabaseServerClient } = await import('../supabase/server');
      const supabase = await getSupabaseServerClient();
      client = supabase as unknown as KoraLinkRpcClient;
    } catch {
      return 'unavailable';
    }
  }

  // Call RPC — digest sent, never raw token
  let rows: KoraLinkRpcRow[] | null;
  try {
    const result = await client.rpc('fn_public_lookup_link', { p_token_digest: digest });
    if (result.error) {
      return 'unavailable';
    }
    rows = result.data;
  } catch {
    return 'unavailable';
  }

  // Normalize RPC response — any unexpected shape → unavailable safe
  if (!rows || rows.length === 0) {
    return 'unavailable';
  }

  const row = rows[0];
  if (row.status === 'ready') {
    return 'ready';
  }
  return 'unavailable';
}
