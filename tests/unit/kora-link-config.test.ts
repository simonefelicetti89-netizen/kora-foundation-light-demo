// tests/unit/kora-link-config.test.ts
// KL-07 — KORA Link config module unit tests.
// No Supabase. No DB. No network. All env injected.

import { describe, it, expect } from 'vitest';
import {
  isKoraLinkEnabled,
  getKoraLinkPublicBaseUrl,
  getKoraLinkReadiness,
  assertKoraLinkReady,
  getKoraLinkRateLimitConfig,
  getKoraLinkRateLimitProvider,
  KORA_LINK_RATE_LIMIT_WINDOW_MS,
  KORA_LINK_RATE_LIMIT_MAX_PUBLIC,
  KORA_LINK_RATE_LIMIT_KEY_PREFIX,
  type KoraLinkEnv,
  type KoraLinkReadinessResult,
  type KoraLinkRateLimitConfig,
} from '@/lib/kora-link/config';
import { KORA_LINK_SECRET_MIN_LENGTH } from '@/lib/kora-link/token';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const VALID_SECRET = 'a'.repeat(KORA_LINK_SECRET_MIN_LENGTH);
const VALID_URL = 'https://app.kora.ai';

const READY_ENV: KoraLinkEnv = {
  KORA_LINK_ENABLED: 'true',
  KORA_LINK_TOKEN_SECRET: VALID_SECRET,
  KORA_LINK_PUBLIC_BASE_URL: VALID_URL,
};

// ── 1. Constants ──────────────────────────────────────────────────────────────

describe('Constants', () => {

  it('RATE_LIMIT_WINDOW_MS is 60000 (1 minute)', () => {
    expect(KORA_LINK_RATE_LIMIT_WINDOW_MS).toBe(60_000);
  });

  it('RATE_LIMIT_MAX_PUBLIC is a positive integer', () => {
    expect(KORA_LINK_RATE_LIMIT_MAX_PUBLIC).toBeGreaterThan(0);
    expect(Number.isInteger(KORA_LINK_RATE_LIMIT_MAX_PUBLIC)).toBe(true);
  });

  it('RATE_LIMIT_KEY_PREFIX starts with kl:', () => {
    expect(KORA_LINK_RATE_LIMIT_KEY_PREFIX.startsWith('kl:')).toBe(true);
  });

  it('RATE_LIMIT_KEY_PREFIX is non-empty', () => {
    expect(KORA_LINK_RATE_LIMIT_KEY_PREFIX.length).toBeGreaterThan(0);
  });

});

// ── 2. isKoraLinkEnabled ──────────────────────────────────────────────────────

describe('isKoraLinkEnabled', () => {

  it('returns false when env var is not set', () => {
    expect(isKoraLinkEnabled({})).toBe(false);
  });

  it('returns false when env var is undefined', () => {
    expect(isKoraLinkEnabled({ KORA_LINK_ENABLED: undefined })).toBe(false);
  });

  it('returns false when env var is empty string', () => {
    expect(isKoraLinkEnabled({ KORA_LINK_ENABLED: '' })).toBe(false);
  });

  it('returns false when env var is "false"', () => {
    expect(isKoraLinkEnabled({ KORA_LINK_ENABLED: 'false' })).toBe(false);
  });

  it('returns false when env var is "1" (not exact string)', () => {
    expect(isKoraLinkEnabled({ KORA_LINK_ENABLED: '1' })).toBe(false);
  });

  it('returns false when env var is "TRUE" (case-sensitive)', () => {
    expect(isKoraLinkEnabled({ KORA_LINK_ENABLED: 'TRUE' })).toBe(false);
  });

  it('returns false when env var is "True"', () => {
    expect(isKoraLinkEnabled({ KORA_LINK_ENABLED: 'True' })).toBe(false);
  });

  it('returns true only when env var is exactly "true"', () => {
    expect(isKoraLinkEnabled({ KORA_LINK_ENABLED: 'true' })).toBe(true);
  });

  it('uses process.env by default (does not throw)', () => {
    expect(() => isKoraLinkEnabled()).not.toThrow();
  });

});

// ── 3. getKoraLinkPublicBaseUrl ───────────────────────────────────────────────

describe('getKoraLinkPublicBaseUrl — valid cases', () => {

  it('returns the URL when valid https:// URL provided', () => {
    const result = getKoraLinkPublicBaseUrl({ KORA_LINK_PUBLIC_BASE_URL: 'https://app.kora.ai' });
    expect(result).toBe('https://app.kora.ai');
  });

  it('accepts http:// URL (for local dev and staging)', () => {
    const result = getKoraLinkPublicBaseUrl({ KORA_LINK_PUBLIC_BASE_URL: 'http://localhost:3000' });
    expect(result).toBe('http://localhost:3000');
  });

  it('strips a single trailing slash', () => {
    const result = getKoraLinkPublicBaseUrl({ KORA_LINK_PUBLIC_BASE_URL: 'https://app.kora.ai/' });
    expect(result).toBe('https://app.kora.ai');
  });

  it('strips multiple trailing slashes', () => {
    const result = getKoraLinkPublicBaseUrl({ KORA_LINK_PUBLIC_BASE_URL: 'https://app.kora.ai///' });
    expect(result).toBe('https://app.kora.ai');
  });

  it('preserves a path segment without trailing slash', () => {
    const result = getKoraLinkPublicBaseUrl({ KORA_LINK_PUBLIC_BASE_URL: 'https://app.kora.ai/kl' });
    expect(result).toBe('https://app.kora.ai/kl');
  });

  it('strips trailing slash from a URL with path', () => {
    const result = getKoraLinkPublicBaseUrl({ KORA_LINK_PUBLIC_BASE_URL: 'https://app.kora.ai/kl/' });
    expect(result).toBe('https://app.kora.ai/kl');
  });

  it('accepts URL with explicit port', () => {
    const result = getKoraLinkPublicBaseUrl({ KORA_LINK_PUBLIC_BASE_URL: 'https://app.kora.ai:8443' });
    expect(result).toBe('https://app.kora.ai:8443');
  });

});

describe('getKoraLinkPublicBaseUrl — invalid cases', () => {

  it('throws when env var is not set', () => {
    expect(() => getKoraLinkPublicBaseUrl({})).toThrow(/KORA_LINK_PUBLIC_BASE_URL/);
  });

  it('throws when env var is undefined', () => {
    expect(() => getKoraLinkPublicBaseUrl({ KORA_LINK_PUBLIC_BASE_URL: undefined })).toThrow();
  });

  it('throws when env var is empty string', () => {
    expect(() => getKoraLinkPublicBaseUrl({ KORA_LINK_PUBLIC_BASE_URL: '' })).toThrow();
  });

  it('throws when env var is not a valid URL', () => {
    expect(() => getKoraLinkPublicBaseUrl({ KORA_LINK_PUBLIC_BASE_URL: 'not-a-url' })).toThrow(/URL/);
  });

  it('throws when env var has unsupported protocol (ftp://)', () => {
    expect(() => getKoraLinkPublicBaseUrl({ KORA_LINK_PUBLIC_BASE_URL: 'ftp://app.kora.ai' })).toThrow(/protocollo/);
  });

  it('throws when env var has unsupported protocol (file://)', () => {
    expect(() => getKoraLinkPublicBaseUrl({ KORA_LINK_PUBLIC_BASE_URL: 'file:///tmp/kora' })).toThrow(/protocollo/);
  });

  it('error does not expose the raw URL value in the thrown message (no info leak)', () => {
    const secret = 'ftp://secret-internal-host.internal.kora.ai';
    try {
      getKoraLinkPublicBaseUrl({ KORA_LINK_PUBLIC_BASE_URL: secret });
      expect.fail('avrebbe dovuto lanciare');
    } catch (err: unknown) {
      if (err instanceof Error) {
        // Error may reference the protocol 'ftp' but must not expose the full host
        expect(err.message).not.toContain('secret-internal-host');
      }
    }
  });

});

// ── 4. getKoraLinkReadiness ───────────────────────────────────────────────────

describe('getKoraLinkReadiness — ready state', () => {

  it('returns ready: true when all three vars are valid', () => {
    const result = getKoraLinkReadiness(READY_ENV);
    expect(result.ready).toBe(true);
  });

  it('missing array is absent when ready', () => {
    const result = getKoraLinkReadiness(READY_ENV);
    expect('missing' in result).toBe(false);
  });

});

describe('getKoraLinkReadiness — not-ready states', () => {

  it('returns ready: false when env is empty', () => {
    const result = getKoraLinkReadiness({});
    expect(result.ready).toBe(false);
  });

  it('missing list includes KORA_LINK_ENABLED when flag is off', () => {
    const result = getKoraLinkReadiness({
      KORA_LINK_TOKEN_SECRET: VALID_SECRET,
      KORA_LINK_PUBLIC_BASE_URL: VALID_URL,
    });
    expect(result.ready).toBe(false);
    if (!result.ready) {
      const flags = result.missing.join(' ');
      expect(flags).toContain('KORA_LINK_ENABLED');
    }
  });

  it('missing list includes secret entry when secret is absent', () => {
    const result = getKoraLinkReadiness({
      KORA_LINK_ENABLED: 'true',
      KORA_LINK_PUBLIC_BASE_URL: VALID_URL,
    });
    expect(result.ready).toBe(false);
    if (!result.ready) {
      const flags = result.missing.join(' ');
      expect(flags).toContain('KORA_LINK_TOKEN_SECRET');
    }
  });

  it('missing list includes secret entry when secret is too short', () => {
    const result = getKoraLinkReadiness({
      KORA_LINK_ENABLED: 'true',
      KORA_LINK_TOKEN_SECRET: 'a'.repeat(KORA_LINK_SECRET_MIN_LENGTH - 1),
      KORA_LINK_PUBLIC_BASE_URL: VALID_URL,
    });
    expect(result.ready).toBe(false);
    if (!result.ready) {
      expect(result.missing.some(m => m.includes('KORA_LINK_TOKEN_SECRET'))).toBe(true);
    }
  });

  it('missing list includes URL when KORA_LINK_PUBLIC_BASE_URL is absent', () => {
    const result = getKoraLinkReadiness({
      KORA_LINK_ENABLED: 'true',
      KORA_LINK_TOKEN_SECRET: VALID_SECRET,
    });
    expect(result.ready).toBe(false);
    if (!result.ready) {
      expect(result.missing.some(m => m.includes('KORA_LINK_PUBLIC_BASE_URL'))).toBe(true);
    }
  });

  it('missing list has all three entries when env is empty', () => {
    const result = getKoraLinkReadiness({});
    expect(result.ready).toBe(false);
    if (!result.ready) {
      expect(result.missing.length).toBe(3);
    }
  });

  it('missing list has exactly one entry when only flag is missing', () => {
    const result = getKoraLinkReadiness({
      KORA_LINK_ENABLED: 'false',
      KORA_LINK_TOKEN_SECRET: VALID_SECRET,
      KORA_LINK_PUBLIC_BASE_URL: VALID_URL,
    });
    expect(result.ready).toBe(false);
    if (!result.ready) {
      expect(result.missing.length).toBe(1);
    }
  });

  it('missing list has exactly one entry when only secret is missing', () => {
    const result = getKoraLinkReadiness({
      KORA_LINK_ENABLED: 'true',
      KORA_LINK_PUBLIC_BASE_URL: VALID_URL,
    });
    expect(result.ready).toBe(false);
    if (!result.ready) {
      expect(result.missing.length).toBe(1);
    }
  });

  it('missing list has exactly one entry when only URL is missing', () => {
    const result = getKoraLinkReadiness({
      KORA_LINK_ENABLED: 'true',
      KORA_LINK_TOKEN_SECRET: VALID_SECRET,
    });
    expect(result.ready).toBe(false);
    if (!result.ready) {
      expect(result.missing.length).toBe(1);
    }
  });

  it('missing list entries are non-empty strings', () => {
    const result = getKoraLinkReadiness({});
    expect(result.ready).toBe(false);
    if (!result.ready) {
      result.missing.forEach(m => expect(typeof m).toBe('string'));
      result.missing.forEach(m => expect(m.length).toBeGreaterThan(0));
    }
  });

  it('does not throw — always returns an object', () => {
    expect(() => getKoraLinkReadiness({})).not.toThrow();
    expect(() => getKoraLinkReadiness(READY_ENV)).not.toThrow();
  });

  it('uses process.env by default (does not throw)', () => {
    expect(() => getKoraLinkReadiness()).not.toThrow();
  });

});

// ── 5. assertKoraLinkReady ────────────────────────────────────────────────────

describe('assertKoraLinkReady', () => {

  it('does not throw when all vars are valid', () => {
    expect(() => assertKoraLinkReady(READY_ENV)).not.toThrow();
  });

  it('throws when env is empty', () => {
    expect(() => assertKoraLinkReady({})).toThrow();
  });

  it('throws when flag is off', () => {
    expect(() => assertKoraLinkReady({ ...READY_ENV, KORA_LINK_ENABLED: 'false' })).toThrow();
  });

  it('throws when secret is absent', () => {
    expect(() => assertKoraLinkReady({ ...READY_ENV, KORA_LINK_TOKEN_SECRET: undefined })).toThrow();
  });

  it('throws when URL is absent', () => {
    expect(() => assertKoraLinkReady({ ...READY_ENV, KORA_LINK_PUBLIC_BASE_URL: undefined })).toThrow();
  });

  it('error message includes at least one missing item name', () => {
    try {
      assertKoraLinkReady({});
      expect.fail('avrebbe dovuto lanciare');
    } catch (err: unknown) {
      if (err instanceof Error) {
        expect(err.message).toContain('KORA_LINK_ENABLED');
      }
    }
  });

  it('error message does not expose secret value', () => {
    const shortSecret = 'x'.repeat(10);
    try {
      assertKoraLinkReady({ ...READY_ENV, KORA_LINK_TOKEN_SECRET: shortSecret });
      expect.fail('avrebbe dovuto lanciare');
    } catch (err: unknown) {
      if (err instanceof Error) {
        expect(err.message).not.toContain(shortSecret);
      }
    }
  });

});

// ── 6. getKoraLinkRateLimitConfig ─────────────────────────────────────────────

describe('getKoraLinkRateLimitConfig', () => {

  it('returns an object', () => {
    expect(typeof getKoraLinkRateLimitConfig()).toBe('object');
  });

  it('windowMs matches the exported constant', () => {
    expect(getKoraLinkRateLimitConfig().windowMs).toBe(KORA_LINK_RATE_LIMIT_WINDOW_MS);
  });

  it('maxRequests matches the exported constant', () => {
    expect(getKoraLinkRateLimitConfig().maxRequests).toBe(KORA_LINK_RATE_LIMIT_MAX_PUBLIC);
  });

  it('keyPrefix matches the exported constant', () => {
    expect(getKoraLinkRateLimitConfig().keyPrefix).toBe(KORA_LINK_RATE_LIMIT_KEY_PREFIX);
  });

  it('windowMs is a positive number', () => {
    expect(getKoraLinkRateLimitConfig().windowMs).toBeGreaterThan(0);
  });

  it('maxRequests is a positive integer', () => {
    const cfg = getKoraLinkRateLimitConfig();
    expect(cfg.maxRequests).toBeGreaterThan(0);
    expect(Number.isInteger(cfg.maxRequests)).toBe(true);
  });

  it('keyPrefix is a non-empty string', () => {
    expect(getKoraLinkRateLimitConfig().keyPrefix.length).toBeGreaterThan(0);
  });

  it('returns a new object on each call (not a shared reference)', () => {
    const a = getKoraLinkRateLimitConfig();
    const b = getKoraLinkRateLimitConfig();
    expect(a).not.toBe(b);
    expect(a).toEqual(b);
  });

});

// ── 7. getKoraLinkRateLimitProvider ──────────────────────────────────────────

describe('getKoraLinkRateLimitProvider', () => {

  it('returns null when env var is not set', () => {
    expect(getKoraLinkRateLimitProvider({})).toBeNull();
  });

  it('returns null when env var is empty string', () => {
    expect(getKoraLinkRateLimitProvider({ KORA_LINK_RATE_LIMIT_PROVIDER: '' })).toBeNull();
  });

  it('returns "disabled" when env var is "disabled"', () => {
    expect(getKoraLinkRateLimitProvider({ KORA_LINK_RATE_LIMIT_PROVIDER: 'disabled' })).toBe('disabled');
  });

  it('returns "upstash" when env var is "upstash"', () => {
    expect(getKoraLinkRateLimitProvider({ KORA_LINK_RATE_LIMIT_PROVIDER: 'upstash' })).toBe('upstash');
  });

  it('throws for an unknown provider value', () => {
    expect(() =>
      getKoraLinkRateLimitProvider({ KORA_LINK_RATE_LIMIT_PROVIDER: 'redis' })
    ).toThrow();
  });

  it('error for unknown provider does not expose the raw value', () => {
    const secretValue = 'my-internal-custom-provider-xyz';
    try {
      getKoraLinkRateLimitProvider({ KORA_LINK_RATE_LIMIT_PROVIDER: secretValue });
      expect.fail('avrebbe dovuto lanciare');
    } catch (err: unknown) {
      if (err instanceof Error) {
        expect(err.message).not.toContain(secretValue);
      }
    }
  });

  it('uses process.env by default (does not throw)', () => {
    expect(() => getKoraLinkRateLimitProvider()).not.toThrow();
  });

});

// ── 8. Type assertions ────────────────────────────────────────────────────────
// Static checks that the exported types are assignable to the expected shapes.
// These fail at compile time (tsc), not at runtime.

describe('Type shape assertions', () => {

  it('KoraLinkReadinessResult can represent ready state', () => {
    const r: KoraLinkReadinessResult = { ready: true };
    expect(r.ready).toBe(true);
  });

  it('KoraLinkReadinessResult can represent not-ready state with missing array', () => {
    const r: KoraLinkReadinessResult = { ready: false, missing: ['X'] };
    expect(r.ready).toBe(false);
    if (!r.ready) expect(r.missing).toContain('X');
  });

  it('KoraLinkRateLimitConfig has expected keys', () => {
    const cfg: KoraLinkRateLimitConfig = { windowMs: 1, maxRequests: 1, keyPrefix: 'x' };
    expect('windowMs' in cfg).toBe(true);
    expect('maxRequests' in cfg).toBe(true);
    expect('keyPrefix' in cfg).toBe(true);
  });

});
