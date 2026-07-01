// lib/kora-link/activation.ts
// KORA Link — worker activation runtime (KL-22). Feature-flagged, default OFF.
// Server-only. Calls fn_activate_link_for_worker RPC (draft in 036) — never service role.
//
// INVARIANTS
//   • KORA_LINK_ACTIVATION_ENABLED must be the exact string 'true' — default disabled
//   • Token cleartext never sent to the DB — only computeDigest(token, secret) reaches the RPC
//   • worker_id is used server-side only to call the RPC — never returned in any state here
//   • The full digest is never returned to the caller
//   • Any RPC/client/digest error → safe 'unavailable' or 'error' state, never an exception
//   • No Impact Unit, no scoring, no KORA Index effect — activation only flips link/assignment state

import { computeDigest, isValidTokenFormat } from './token';
import { isKoraLinkActivationEnabled, type KoraLinkEnv } from './config';

// ── Consent (provisional — final copy/version requires DPO/legal approval) ────

export const KORA_LINK_ACTIVATION_CONSENT_VERSION = 'kora-link-consent-v1-draft';

// ── RPC client interface ──────────────────────────────────────────────────────
// Minimal interface for injection in tests — no vi.mock needed.
// fn_activate_link_for_worker RETURNS jsonb (a single object), not a row set —
// normalizeActivationRow() below accepts either shape defensively.

export type KoraLinkActivationRpcRow = Record<string, unknown>;

export type KoraLinkActivationRpcClient = {
  rpc(
    fn: 'fn_activate_link_for_worker',
    args: { p_token_digest: string; p_worker_id: string; p_consent_version: string }
  ): Promise<{
    data: KoraLinkActivationRpcRow | KoraLinkActivationRpcRow[] | null;
    error: unknown | null;
  }>;
};

function normalizeActivationRow(
  data: KoraLinkActivationRpcRow | KoraLinkActivationRpcRow[] | null
): KoraLinkActivationRpcRow | null {
  if (Array.isArray(data)) {
    return data[0] ?? null;
  }
  return data;
}

// ── Activation result (what activateKoraLinkForWorker returns) ───────────────

export type KoraLinkActivationResult =
  | { state: 'disabled' }
  | { state: 'invalid_token' }
  | { state: 'consent_required' }
  | { state: 'already_active' }
  | { state: 'activated' }
  | { state: 'unavailable' }
  | { state: 'error' };

export type ActivateKoraLinkForWorkerParams = {
  token: string;
  workerId: string;
  consentVersion: string;
  secret: string;
  env?: KoraLinkEnv;
  rpcClientOverride?: KoraLinkActivationRpcClient;
};

/**
 * Calls fn_activate_link_for_worker for the given worker + token.
 * DEMO/RUNTIME PATH — feature-flagged behind KORA_LINK_ACTIVATION_ENABLED (default OFF).
 * Never throws. Never exposes the digest, the raw token, or the worker id in the result.
 */
export async function activateKoraLinkForWorker(
  params: ActivateKoraLinkForWorkerParams
): Promise<KoraLinkActivationResult> {
  const env = params.env ?? process.env;

  // Guard: activation feature flag — default false until Gate 2+3 closed and 036 applied
  if (!isKoraLinkActivationEnabled(env)) {
    return { state: 'disabled' };
  }

  // Token format check — before any digest computation or RPC call
  if (!isValidTokenFormat(params.token)) {
    return { state: 'invalid_token' };
  }

  // workerId is required — resolved server-side from the authenticated session by the caller,
  // never accepted from an unauthenticated client input.
  if (!params.workerId) {
    return { state: 'invalid_token' };
  }

  // consentVersion must be present and match the current provisional version.
  if (!params.consentVersion || params.consentVersion !== KORA_LINK_ACTIVATION_CONSENT_VERSION) {
    return { state: 'consent_required' };
  }

  // Compute digest — only the digest is sent to the DB, never the raw token
  let digest: string;
  try {
    digest = computeDigest(params.token, params.secret);
  } catch {
    return { state: 'unavailable' };
  }

  // Acquire client — injected in tests, real server client (anon/cookie session) in production.
  // Never the service role client — activation runs under the worker's own session.
  let client: KoraLinkActivationRpcClient;
  if (params.rpcClientOverride) {
    client = params.rpcClientOverride;
  } else {
    try {
      const { getSupabaseServerClient } = await import('../supabase/server');
      const supabase = await getSupabaseServerClient();
      client = supabase as unknown as KoraLinkActivationRpcClient;
    } catch {
      return { state: 'unavailable' };
    }
  }

  // Call RPC — digest + worker id + consent version sent, never the raw token
  let row: KoraLinkActivationRpcRow | null;
  try {
    const result = await client.rpc('fn_activate_link_for_worker', {
      p_token_digest: digest,
      p_worker_id: params.workerId,
      p_consent_version: params.consentVersion,
    });
    if (result.error) {
      return { state: 'unavailable' };
    }
    row = normalizeActivationRow(result.data);
  } catch {
    return { state: 'unavailable' };
  }

  if (!row || typeof row.status !== 'string') {
    return { state: 'unavailable' };
  }

  switch (row.status) {
    case 'activated':
    case 'already_active':
      return { state: row.status };
    case 'consent_required':
      return { state: 'consent_required' };
    case 'unavailable':
      return { state: 'unavailable' };
    case 'error':
      return { state: 'error' };
    default:
      // Any unrecognised status → safe fallback, never leak the raw value
      return { state: 'unavailable' };
  }
}

// ── Display state (drives the /link/[token] UI) ──────────────────────────────

export type KoraLinkActivationDisplayState =
  | 'disabled'
  | 'unauthenticated'
  | 'lookup_not_ready'
  | 'ready'
  | 'activating'
  | 'activated'
  | 'unavailable'
  | 'error';

export type KoraLinkActivationOutcome =
  | 'activating'
  | 'activated'
  | 'unavailable'
  | 'error'
  | 'consent_required';

export type BuildKoraLinkActivationStateParams = {
  activationEnabled: boolean;
  lookupReady: boolean;
  workerAuthenticated: boolean;
  activationOutcome?: KoraLinkActivationOutcome | null;
};

/**
 * Computes the safe UI state for the activation panel on /link/[token].
 * Pure function — no I/O, no Supabase, no DB. Precedence:
 *   flag off > lookup not ready > worker unauthenticated > activation outcome > ready.
 */
export function buildKoraLinkActivationState(
  params: BuildKoraLinkActivationStateParams
): KoraLinkActivationDisplayState {
  if (!params.activationEnabled) {
    return 'disabled';
  }
  if (!params.lookupReady) {
    return 'lookup_not_ready';
  }
  if (!params.workerAuthenticated) {
    return 'unauthenticated';
  }
  switch (params.activationOutcome) {
    case 'activating':
      return 'activating';
    case 'activated':
      return 'activated';
    case 'unavailable':
      return 'unavailable';
    case 'error':
    case 'consent_required':
      return 'error';
    default:
      return 'ready';
  }
}
