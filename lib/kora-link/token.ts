// lib/kora-link/token.ts
// KORA Link — token generation, validation, digest, redaction.
// Server-only. No browser imports. No Supabase. No DB.
//
// INVARIANTS (from KL-04 Token Threat Model):
//   • token cleartext NEVER stored in DB — only token_digest
//   • token cleartext NEVER written to logs — use redactToken() before any log call
//   • KORA_LINK_TOKEN_SECRET must never reach client bundles
//   • digest = HMAC-SHA256(tokenValue, KORA_LINK_TOKEN_SECRET) → 64-char hex
//   • token format: kl1_ prefix + 48 base62 chars → ~285 bit entropy

import { createHmac, randomBytes } from 'node:crypto';

// ── Constants ─────────────────────────────────────────────────────────────────

export const KORA_LINK_TOKEN_PREFIX = 'kl1_' as const;

// Payload: 48 base62 chars after the prefix → log₂(62^48) ≈ 285 bits entropy
export const KORA_LINK_TOKEN_PAYLOAD_LENGTH = 48;

// Total token length = prefix (4) + payload (48) = 52 chars
export const KORA_LINK_TOKEN_MIN_LENGTH = KORA_LINK_TOKEN_PREFIX.length + KORA_LINK_TOKEN_PAYLOAD_LENGTH;
export const KORA_LINK_TOKEN_MAX_LENGTH = KORA_LINK_TOKEN_MIN_LENGTH; // exact in v1 — no variable-length tokens

// HMAC-SHA256 hex digest: always 64 chars
export const KORA_LINK_TOKEN_DIGEST_LENGTH = 64;

// Prefix of digest stored in audit log for correlation — NOT a lookup key
export const KORA_LINK_TOKEN_DIGEST_PREFIX_LENGTH = 8;

// Minimum env secret length: 64 hex chars = 32 bytes = 256 bits
export const KORA_LINK_SECRET_MIN_LENGTH = 64;

// ── Internal constants (not exported — implementation detail) ─────────────────

const BASE62_CHARSET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

// 248 = floor(256 / 62) * 62 — bytes [0, 248) map to base62 without modulo bias.
// Bytes [248, 255] are rejected (3.125% rejection rate) to ensure uniform distribution.
const BASE62_UNBIASED_CEILING = 248;

const TOKEN_FORMAT_REGEX = /^kl1_[A-Za-z0-9]{48}$/;
const TOKEN_REDACT_REGEX = /kl1_[A-Za-z0-9]{48}/g;
const HEX_REGEX = /^[0-9a-f]+$/;

// ── Types ─────────────────────────────────────────────────────────────────────

export type TokenValidationResult =
  | { valid: true }
  | { valid: false; reason: string };

// ── Token generation ──────────────────────────────────────────────────────────

/**
 * Generates a cryptographically random KORA Link token.
 * Format: `kl1_<48 base62 chars>`
 * Uses rejection sampling to eliminate modulo bias.
 * Never logs or persists the returned value — caller is responsible.
 */
export function generateToken(): string {
  let payload = '';
  while (payload.length < KORA_LINK_TOKEN_PAYLOAD_LENGTH) {
    // Draw 16 random bytes per iteration. After rejection (~3.125% of bytes),
    // ~15.5 accepted chars per batch → 3–4 iterations expected for 48 chars.
    const buf = randomBytes(16);
    for (const byte of buf) {
      if (payload.length >= KORA_LINK_TOKEN_PAYLOAD_LENGTH) break;
      if (byte < BASE62_UNBIASED_CEILING) {
        payload += BASE62_CHARSET[byte % 62];
      }
    }
  }
  return KORA_LINK_TOKEN_PREFIX + payload;
}

// ── Token format validation ───────────────────────────────────────────────────

/**
 * Validates the format of a KORA Link token.
 * Returns { valid: true } or { valid: false, reason } — never throws.
 * Does NOT validate whether the token is active, assigned, or known to the DB.
 */
export function validateTokenFormat(token: unknown): TokenValidationResult {
  if (typeof token !== 'string') {
    return { valid: false, reason: 'token non è una stringa' };
  }
  if (token.length === 0) {
    return { valid: false, reason: 'token vuoto' };
  }
  if (!token.startsWith(KORA_LINK_TOKEN_PREFIX)) {
    return { valid: false, reason: `prefisso mancante: atteso '${KORA_LINK_TOKEN_PREFIX}'` };
  }
  if (!TOKEN_FORMAT_REGEX.test(token)) {
    return { valid: false, reason: `formato non valido: atteso kl1_ + ${KORA_LINK_TOKEN_PAYLOAD_LENGTH} caratteri base62` };
  }
  return { valid: true };
}

/**
 * Type guard: returns true if token is a valid KORA Link token string.
 */
export function isValidTokenFormat(token: unknown): token is string {
  return validateTokenFormat(token).valid;
}

// ── Digest computation ────────────────────────────────────────────────────────

/**
 * Computes HMAC-SHA256(tokenValue, secret) → 64-char lowercase hex string.
 * This is the only value stored in the DB (`token_digest` column).
 * tokenValue is the cleartext token — never pass this to any logger.
 */
export function computeDigest(tokenValue: string, secret: string): string {
  if (!tokenValue) throw new Error('computeDigest: tokenValue vuoto');
  if (!secret) throw new Error('computeDigest: secret vuoto');
  return createHmac('sha256', secret).update(tokenValue, 'utf8').digest('hex');
}

/**
 * Returns the first KORA_LINK_TOKEN_DIGEST_PREFIX_LENGTH chars of a digest.
 * Used in audit log for event correlation — NOT as a lookup key.
 * A prefix of 8 hex chars (32 bits) is sufficient for correlation without
 * meaningfully reducing the security of the full 256-bit digest.
 */
export function digestPrefix(digest: string): string {
  if (typeof digest !== 'string' || digest.length < KORA_LINK_TOKEN_DIGEST_LENGTH) {
    throw new Error(
      `digestPrefix: digest non valido — atteso ${KORA_LINK_TOKEN_DIGEST_LENGTH} char hex, ricevuto ${typeof digest === 'string' ? digest.length : typeof digest} chars`
    );
  }
  if (!HEX_REGEX.test(digest)) {
    throw new Error('digestPrefix: digest non è una stringa hex valida');
  }
  return digest.slice(0, KORA_LINK_TOKEN_DIGEST_PREFIX_LENGTH);
}

// ── Secret access ─────────────────────────────────────────────────────────────

/**
 * Reads KORA_LINK_TOKEN_SECRET from process.env.
 * Throws if the secret is missing or below the minimum length (256 bits = 64 hex chars).
 * Call once per activation/lookup operation — do not cache the return value in module scope.
 *
 * The secret must:
 *   • Be at least 64 hex chars (32 bytes, 256 bits)
 *   • Never be committed to source control
 *   • Be different between staging and production
 *   • Never appear in any log
 */
export function getTokenSecret(): string {
  const secret = process.env['KORA_LINK_TOKEN_SECRET'];
  if (!secret) {
    throw new Error(
      'KORA_LINK_TOKEN_SECRET non configurato — impostare la variabile d\'ambiente prima dell\'uso'
    );
  }
  if (secret.length < KORA_LINK_SECRET_MIN_LENGTH) {
    throw new Error(
      `KORA_LINK_TOKEN_SECRET troppo corto: ${secret.length} char (minimo ${KORA_LINK_SECRET_MIN_LENGTH} = 256 bit)`
    );
  }
  return secret;
}

// ── Log redaction ─────────────────────────────────────────────────────────────

/**
 * Replaces any KORA Link token (kl1_<48 base62>) in a string with kl1_[REDACTED].
 * Call this before passing any user-facing string, URL, or error message to a logger.
 *
 * Usage:
 *   logger.error(redactToken(`Token lookup failed for ${tokenFromRequest}`));
 *
 * This function does NOT redact token_digest values (64-char hex) — those
 * should not appear in logs either, but are not matched by this pattern.
 */
export function redactToken(input: string): string {
  return input.replace(TOKEN_REDACT_REGEX, 'kl1_[REDACTED]');
}
