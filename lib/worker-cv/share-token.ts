// lib/worker-cv/share-token.ts
// B126: Secure token utilities for Dynamic Impact CV controlled sharing.
//
// Security invariants:
//   - Raw token generated with crypto.randomUUID() + crypto.randomBytes() — not guessable
//   - DB stores SHA-256 hash only — raw token shown once to worker, never persisted
//   - Token never logged (no console.log, no error message includes token)
//   - buildShareUrl never exposes worker_id or tenant_id
//   - Default expiry: 30 days

import { createHash, randomBytes } from 'crypto';

// ── Token generation ──────────────────────────────────────────────────────────

export function generateShareToken(): string {
  // 32 bytes of CSPRNG → hex string (64 chars) — unguessable, URL-safe
  return randomBytes(32).toString('hex');
}

// ── Hash (deterministic, DB-safe) ────────────────────────────────────────────

export function hashShareToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

// ── Expiry ────────────────────────────────────────────────────────────────────

export const DEFAULT_SHARE_TTL_DAYS = 30;

export function buildExpiresAt(daysFromNow = DEFAULT_SHARE_TTL_DAYS): Date {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d;
}

export function isShareExpired(expiresAt: string | Date): boolean {
  return new Date(expiresAt) < new Date();
}

// ── URL builder ───────────────────────────────────────────────────────────────

export function buildShareUrl(token: string): string {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? '';
  // Raw token in URL only — never worker_id, never tenant_id
  return `${base}/cv/share/${token}`;
}
