// tests/unit/kora-link-token.test.ts
// KL-06 — KORA Link token core unit tests.
// No Supabase. No DB. No network. Pure Node.

import { describe, it, expect, afterEach } from 'vitest';
import {
  KORA_LINK_TOKEN_PREFIX,
  KORA_LINK_TOKEN_PAYLOAD_LENGTH,
  KORA_LINK_TOKEN_MIN_LENGTH,
  KORA_LINK_TOKEN_MAX_LENGTH,
  KORA_LINK_TOKEN_DIGEST_LENGTH,
  KORA_LINK_TOKEN_DIGEST_PREFIX_LENGTH,
  KORA_LINK_SECRET_MIN_LENGTH,
  generateToken,
  validateTokenFormat,
  isValidTokenFormat,
  computeDigest,
  digestPrefix,
  getTokenSecret,
  redactToken,
} from '@/lib/kora-link/token';

// ── Fixtures ─────────────────────────────────────────────────────────────────

// 64-char hex secret = 32 bytes = 256 bits — meets the minimum requirement
const VALID_SECRET = 'a'.repeat(64);

// A known-valid token for deterministic tests
const VALID_TOKEN = 'kl1_' + 'A'.repeat(48);

// A known digest for the VALID_TOKEN + VALID_SECRET combination
// (computed below in deterministic digest tests)

// ── 1. Constants ──────────────────────────────────────────────────────────────

describe('Constants', () => {

  it('TOKEN_PREFIX is kl1_', () => {
    expect(KORA_LINK_TOKEN_PREFIX).toBe('kl1_');
  });

  it('TOKEN_PAYLOAD_LENGTH is 48', () => {
    expect(KORA_LINK_TOKEN_PAYLOAD_LENGTH).toBe(48);
  });

  it('TOKEN_MIN_LENGTH is 52 (4 prefix + 48 payload)', () => {
    expect(KORA_LINK_TOKEN_MIN_LENGTH).toBe(52);
  });

  it('TOKEN_MAX_LENGTH equals TOKEN_MIN_LENGTH (exact length in v1)', () => {
    expect(KORA_LINK_TOKEN_MAX_LENGTH).toBe(KORA_LINK_TOKEN_MIN_LENGTH);
  });

  it('TOKEN_DIGEST_LENGTH is 64', () => {
    expect(KORA_LINK_TOKEN_DIGEST_LENGTH).toBe(64);
  });

  it('TOKEN_DIGEST_PREFIX_LENGTH is 8', () => {
    expect(KORA_LINK_TOKEN_DIGEST_PREFIX_LENGTH).toBe(8);
  });

  it('SECRET_MIN_LENGTH is 64 (256 bits in hex)', () => {
    expect(KORA_LINK_SECRET_MIN_LENGTH).toBe(64);
  });

});

// ── 2. generateToken ──────────────────────────────────────────────────────────

describe('generateToken', () => {

  it('returns a string', () => {
    expect(typeof generateToken()).toBe('string');
  });

  it('starts with kl1_ prefix', () => {
    expect(generateToken().startsWith('kl1_')).toBe(true);
  });

  it('has exact length 52', () => {
    expect(generateToken().length).toBe(52);
  });

  it('payload is 48 chars of base62 [A-Za-z0-9]', () => {
    const token = generateToken();
    const payload = token.slice(4);
    expect(payload).toMatch(/^[A-Za-z0-9]{48}$/);
  });

  it('passes validateTokenFormat', () => {
    const result = validateTokenFormat(generateToken());
    expect(result.valid).toBe(true);
  });

  it('generates unique tokens across 1000 calls', () => {
    const tokens = new Set<string>();
    for (let i = 0; i < 1000; i++) tokens.add(generateToken());
    expect(tokens.size).toBe(1000);
  });

  it('uses all regions of base62 charset (A-Z, a-z, 0-9) across 500 tokens', () => {
    // Verify no obvious charset truncation — all three groups should appear
    const all = Array.from({ length: 500 }, () => generateToken()).join('');
    expect(/[A-Z]/.test(all)).toBe(true);
    expect(/[a-z]/.test(all)).toBe(true);
    expect(/[0-9]/.test(all)).toBe(true);
  });

});

// ── 3. validateTokenFormat ────────────────────────────────────────────────────

describe('validateTokenFormat — valid cases', () => {

  it('accepts a correctly formed token', () => {
    const result = validateTokenFormat(VALID_TOKEN);
    expect(result.valid).toBe(true);
  });

  it('accepts a generated token', () => {
    const result = validateTokenFormat(generateToken());
    expect(result.valid).toBe(true);
  });

  it('accepts token with mixed base62 chars', () => {
    // 32 + 16 = 48 payload chars
    const token = 'kl1_' + 'aB3dE6gH9jK2mN5pQ8rS1tU4vW7xY0zA' + 'abcdefghijklmnop';
    expect(validateTokenFormat(token).valid).toBe(true);
  });

});

describe('validateTokenFormat — invalid cases', () => {

  it('rejects null', () => {
    const result = validateTokenFormat(null);
    expect(result.valid).toBe(false);
  });

  it('rejects undefined', () => {
    const result = validateTokenFormat(undefined);
    expect(result.valid).toBe(false);
  });

  it('rejects number', () => {
    const result = validateTokenFormat(42);
    expect(result.valid).toBe(false);
  });

  it('rejects empty string', () => {
    const result = validateTokenFormat('');
    expect(result.valid).toBe(false);
  });

  it('rejects token without prefix', () => {
    const result = validateTokenFormat('A'.repeat(52));
    expect(result.valid).toBe(false);
  });

  it('rejects wrong prefix kl2_', () => {
    const result = validateTokenFormat('kl2_' + 'A'.repeat(48));
    expect(result.valid).toBe(false);
  });

  it('rejects token that is too short (prefix only)', () => {
    const result = validateTokenFormat('kl1_');
    expect(result.valid).toBe(false);
  });

  it('rejects token that is too short (47 payload chars)', () => {
    const result = validateTokenFormat('kl1_' + 'A'.repeat(47));
    expect(result.valid).toBe(false);
  });

  it('rejects token that is too long (49 payload chars)', () => {
    const result = validateTokenFormat('kl1_' + 'A'.repeat(49));
    expect(result.valid).toBe(false);
  });

  it('rejects token with invalid char _ in payload', () => {
    const result = validateTokenFormat('kl1_' + 'A'.repeat(47) + '_');
    expect(result.valid).toBe(false);
  });

  it('rejects token with special char in payload', () => {
    const result = validateTokenFormat('kl1_' + 'A'.repeat(47) + '!');
    expect(result.valid).toBe(false);
  });

  it('rejects token with space in payload', () => {
    const result = validateTokenFormat('kl1_' + 'A'.repeat(47) + ' ');
    expect(result.valid).toBe(false);
  });

  it('rejects token with hyphen in payload', () => {
    const result = validateTokenFormat('kl1_' + 'A'.repeat(47) + '-');
    expect(result.valid).toBe(false);
  });

  it('rejects token with newline embedded', () => {
    const result = validateTokenFormat('kl1_' + 'A'.repeat(23) + '\n' + 'A'.repeat(24));
    expect(result.valid).toBe(false);
  });

  it('invalid result includes a non-empty reason string', () => {
    const result = validateTokenFormat('bad');
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(typeof result.reason).toBe('string');
      expect(result.reason.length).toBeGreaterThan(0);
    }
  });

});

// ── 4. isValidTokenFormat ─────────────────────────────────────────────────────

describe('isValidTokenFormat', () => {

  it('returns true for a valid token', () => {
    expect(isValidTokenFormat(VALID_TOKEN)).toBe(true);
  });

  it('returns false for an invalid token', () => {
    expect(isValidTokenFormat('bad')).toBe(false);
  });

  it('returns false for null', () => {
    expect(isValidTokenFormat(null)).toBe(false);
  });

});

// ── 5. computeDigest ─────────────────────────────────────────────────────────

describe('computeDigest', () => {

  it('returns a 64-char string', () => {
    const digest = computeDigest(VALID_TOKEN, VALID_SECRET);
    expect(digest.length).toBe(64);
  });

  it('returns lowercase hex only', () => {
    const digest = computeDigest(VALID_TOKEN, VALID_SECRET);
    expect(digest).toMatch(/^[0-9a-f]{64}$/);
  });

  it('is deterministic: same inputs → same output', () => {
    const d1 = computeDigest(VALID_TOKEN, VALID_SECRET);
    const d2 = computeDigest(VALID_TOKEN, VALID_SECRET);
    expect(d1).toBe(d2);
  });

  it('different token → different digest', () => {
    const d1 = computeDigest(VALID_TOKEN, VALID_SECRET);
    const d2 = computeDigest('kl1_' + 'B'.repeat(48), VALID_SECRET);
    expect(d1).not.toBe(d2);
  });

  it('different secret → different digest', () => {
    const d1 = computeDigest(VALID_TOKEN, VALID_SECRET);
    const d2 = computeDigest(VALID_TOKEN, 'b'.repeat(64));
    expect(d1).not.toBe(d2);
  });

  it('throws on empty tokenValue', () => {
    expect(() => computeDigest('', VALID_SECRET)).toThrow();
  });

  it('throws on empty secret', () => {
    expect(() => computeDigest(VALID_TOKEN, '')).toThrow();
  });

  it('digest of 1000 distinct generated tokens are all unique', () => {
    const digests = new Set<string>();
    for (let i = 0; i < 1000; i++) {
      digests.add(computeDigest(generateToken(), VALID_SECRET));
    }
    expect(digests.size).toBe(1000);
  });

});

// ── 6. digestPrefix ───────────────────────────────────────────────────────────

describe('digestPrefix', () => {

  it('returns exactly 8 characters', () => {
    const digest = computeDigest(VALID_TOKEN, VALID_SECRET);
    expect(digestPrefix(digest).length).toBe(KORA_LINK_TOKEN_DIGEST_PREFIX_LENGTH);
  });

  it('returns first 8 chars of the digest', () => {
    const digest = computeDigest(VALID_TOKEN, VALID_SECRET);
    expect(digestPrefix(digest)).toBe(digest.slice(0, 8));
  });

  it('is a valid hex substring', () => {
    const digest = computeDigest(VALID_TOKEN, VALID_SECRET);
    expect(digestPrefix(digest)).toMatch(/^[0-9a-f]{8}$/);
  });

  it('throws on string shorter than 64 chars', () => {
    expect(() => digestPrefix('abc')).toThrow();
  });

  it('throws on empty string', () => {
    expect(() => digestPrefix('')).toThrow();
  });

  it('throws on non-hex string of correct length', () => {
    expect(() => digestPrefix('Z'.repeat(64))).toThrow();
  });

});

// ── 7. getTokenSecret ─────────────────────────────────────────────────────────

describe('getTokenSecret', () => {

  const ORIGINAL_SECRET = process.env['KORA_LINK_TOKEN_SECRET'];

  afterEach(() => {
    // Restore env after each test
    if (ORIGINAL_SECRET === undefined) {
      delete process.env['KORA_LINK_TOKEN_SECRET'];
    } else {
      process.env['KORA_LINK_TOKEN_SECRET'] = ORIGINAL_SECRET;
    }
  });

  it('throws when KORA_LINK_TOKEN_SECRET is not set', () => {
    delete process.env['KORA_LINK_TOKEN_SECRET'];
    expect(() => getTokenSecret()).toThrow(/KORA_LINK_TOKEN_SECRET/);
  });

  it('throws when KORA_LINK_TOKEN_SECRET is empty string', () => {
    process.env['KORA_LINK_TOKEN_SECRET'] = '';
    expect(() => getTokenSecret()).toThrow();
  });

  it('throws when secret is too short (63 chars)', () => {
    process.env['KORA_LINK_TOKEN_SECRET'] = 'a'.repeat(63);
    expect(() => getTokenSecret()).toThrow(/troppo corto/);
  });

  it('returns secret when length is exactly 64 chars', () => {
    process.env['KORA_LINK_TOKEN_SECRET'] = VALID_SECRET;
    expect(getTokenSecret()).toBe(VALID_SECRET);
  });

  it('returns secret when length is greater than 64 chars', () => {
    const long = 'a'.repeat(128);
    process.env['KORA_LINK_TOKEN_SECRET'] = long;
    expect(getTokenSecret()).toBe(long);
  });

  it('error message mentions minimum bit length', () => {
    process.env['KORA_LINK_TOKEN_SECRET'] = 'a'.repeat(32);
    expect(() => getTokenSecret()).toThrow(/256/);
  });

});

// ── 8. redactToken ────────────────────────────────────────────────────────────

describe('redactToken', () => {

  it('replaces a bare token with kl1_[REDACTED]', () => {
    const result = redactToken(VALID_TOKEN);
    expect(result).toBe('kl1_[REDACTED]');
  });

  it('replaces token embedded in a sentence', () => {
    const result = redactToken(`Lookup fallito per ${VALID_TOKEN} — 404`);
    expect(result).toBe('Lookup fallito per kl1_[REDACTED] — 404');
    expect(result).not.toContain('A'.repeat(48));
  });

  it('replaces token embedded in a URL', () => {
    const url = `https://app.kora.ai/link/${VALID_TOKEN}`;
    const result = redactToken(url);
    expect(result).toBe('https://app.kora.ai/link/kl1_[REDACTED]');
  });

  it('replaces multiple tokens in one string', () => {
    const token2 = 'kl1_' + 'B'.repeat(48);
    const result = redactToken(`${VALID_TOKEN} and ${token2}`);
    expect(result).toBe('kl1_[REDACTED] and kl1_[REDACTED]');
  });

  it('does not modify strings that contain no token', () => {
    const clean = 'nessun token qui, solo testo normale';
    expect(redactToken(clean)).toBe(clean);
  });

  it('does not modify empty string', () => {
    expect(redactToken('')).toBe('');
  });

  it('does not affect the prefix alone (kl1_ without 48 chars)', () => {
    const partial = 'kl1_ABCD';
    expect(redactToken(partial)).toBe(partial);
  });

  it('does not affect a 47-char payload (one char short)', () => {
    const short = 'kl1_' + 'A'.repeat(47);
    expect(redactToken(short)).toBe(short);
  });

  it('replaces a 49-char payload (matches the first 48 chars)', () => {
    // The regex matches 48 base62 chars; the 49th is left in place
    const longPayload = 'kl1_' + 'A'.repeat(48) + 'Z';
    const result = redactToken(longPayload);
    expect(result).toBe('kl1_[REDACTED]Z');
  });

  it('redacts token from a generated token', () => {
    const token = generateToken();
    const result = redactToken(`error: token ${token} not found`);
    expect(result).toContain('kl1_[REDACTED]');
    expect(result).not.toContain(token.slice(4)); // payload not present
  });

});
