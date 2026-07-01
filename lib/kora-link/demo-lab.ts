// lib/kora-link/demo-lab.ts
// KORA Link — Demo Lab helper (KL-20). Ephemeral demo tokens for NFC chip lab writing.
// Server-only. No Supabase. No DB. No persistence. No activation. No worker assignment.
//
// INVARIANTS
//   • Generated token/URL exist only in the returned value — nothing is written to storage
//   • KORA_LINK_TOKEN_SECRET is never read, computed, or included in any return value
//   • Missing/invalid base URL → safe result object, never throws to the caller
//   • No RPC call, no digest computation — demo lab never touches the DB path

import { generateToken } from './token';
import {
  isKoraLinkEnabled,
  isKoraLinkDbLookupEnabled,
  getKoraLinkPublicBaseUrl,
  getKoraLinkRateLimitProvider,
  type KoraLinkEnv,
} from './config';

// ── Runtime status ────────────────────────────────────────────────────────────

export type KoraLinkDemoLabRuntimeStatus = {
  koraLinkEnabled: boolean;
  publicBaseUrlConfigured: boolean;
  dbLookupEnabled: boolean;
  rateLimitProvider: 'disabled' | 'upstash' | null;
};

/**
 * Snapshot of KORA Link runtime config for the demo lab status panel.
 * Only booleans and the rate-limit provider name are exposed — never a secret value.
 */
export function getKoraLinkDemoLabRuntimeStatus(
  env: KoraLinkEnv = process.env
): KoraLinkDemoLabRuntimeStatus {
  let publicBaseUrlConfigured = false;
  try {
    getKoraLinkPublicBaseUrl(env);
    publicBaseUrlConfigured = true;
  } catch {
    publicBaseUrlConfigured = false;
  }

  let rateLimitProvider: 'disabled' | 'upstash' | null = null;
  try {
    rateLimitProvider = getKoraLinkRateLimitProvider(env);
  } catch {
    rateLimitProvider = null;
  }

  return {
    koraLinkEnabled: isKoraLinkEnabled(env),
    publicBaseUrlConfigured,
    dbLookupEnabled: isKoraLinkDbLookupEnabled(env),
    rateLimitProvider,
  };
}

// ── Public link URL builder ───────────────────────────────────────────────────

/**
 * Builds the public `/link/<token>` URL for a given token.
 * Throws if KORA_LINK_PUBLIC_BASE_URL is missing or invalid (see getKoraLinkPublicBaseUrl).
 * Never logs or persists the token.
 */
export function getKoraLinkPublicLinkUrl(token: string, env: KoraLinkEnv = process.env): string {
  const baseUrl = getKoraLinkPublicBaseUrl(env);
  return `${baseUrl}/link/${token}`;
}

// ── Demo lab token generation ─────────────────────────────────────────────────

export type KoraLinkDemoLabLinkResult =
  | { ok: true; token: string; url: string }
  | { ok: false; reason: 'base_url_not_configured' };

/**
 * Generates an ephemeral demo token + public URL for NFC chip lab writing.
 * DEMO ONLY — never persisted. No DB record, no worker assignment, no activation.
 * The caller is responsible for discarding the value after copying it — this
 * function never writes it anywhere.
 */
export function generateKoraLinkDemoLabLink(
  env: KoraLinkEnv = process.env
): KoraLinkDemoLabLinkResult {
  const token = generateToken();
  try {
    const url = getKoraLinkPublicLinkUrl(token, env);
    return { ok: true, token, url };
  } catch {
    return { ok: false, reason: 'base_url_not_configured' };
  }
}
