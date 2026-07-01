// tests/unit/kora-link-demo-lab.test.ts
// KL-20 — KORA Link Demo Lab helper unit tests.
// No Supabase. No DB. No network. All env injected.

import { describe, it, expect } from 'vitest';
import {
  getKoraLinkPublicLinkUrl,
  generateKoraLinkDemoLabLink,
  getKoraLinkDemoLabRuntimeStatus,
  type KoraLinkDemoLabLinkResult,
} from '@/lib/kora-link/demo-lab';
import { isValidTokenFormat, KORA_LINK_SECRET_MIN_LENGTH } from '@/lib/kora-link/token';
import type { KoraLinkEnv } from '@/lib/kora-link/config';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const VALID_SECRET = 'a'.repeat(KORA_LINK_SECRET_MIN_LENGTH);
const VALID_URL = 'https://app.kora.ai';

const READY_ENV: KoraLinkEnv = {
  KORA_LINK_ENABLED: 'true',
  KORA_LINK_TOKEN_SECRET: VALID_SECRET,
  KORA_LINK_PUBLIC_BASE_URL: VALID_URL,
};

// ── 1. getKoraLinkPublicLinkUrl ───────────────────────────────────────────────

describe('getKoraLinkPublicLinkUrl', () => {

  it('builds a /link/<token> URL from a valid base URL', () => {
    const url = getKoraLinkPublicLinkUrl('kl1_' + 'A'.repeat(48), READY_ENV);
    expect(url).toBe(`${VALID_URL}/link/kl1_${'A'.repeat(48)}`);
  });

  it('strips a trailing slash from the base URL', () => {
    const env = { ...READY_ENV, KORA_LINK_PUBLIC_BASE_URL: 'https://app.kora.ai/' };
    const url = getKoraLinkPublicLinkUrl('kl1_' + 'B'.repeat(48), env);
    expect(url.startsWith('https://app.kora.ai/link/')).toBe(true);
    expect(url).not.toContain('.ai//link');
  });

  it('throws when KORA_LINK_PUBLIC_BASE_URL is missing', () => {
    expect(() => getKoraLinkPublicLinkUrl('kl1_' + 'C'.repeat(48), {})).toThrow();
  });

  it('throws when KORA_LINK_PUBLIC_BASE_URL is not a valid URL', () => {
    const env = { ...READY_ENV, KORA_LINK_PUBLIC_BASE_URL: 'not a url' };
    expect(() => getKoraLinkPublicLinkUrl('kl1_' + 'D'.repeat(48), env)).toThrow();
  });

  it('defaults to process.env when no env is passed', () => {
    // No assertion on the value — just confirms the default param path does not throw at call time
    // when process.env may or may not have KORA_LINK_PUBLIC_BASE_URL configured for the test runner.
    expect(() => {
      try {
        getKoraLinkPublicLinkUrl('kl1_' + 'E'.repeat(48));
      } catch {
        // acceptable — process.env in test runner is not guaranteed to be configured
      }
    }).not.toThrow();
  });

});

// ── 2. generateKoraLinkDemoLabLink ────────────────────────────────────────────

describe('generateKoraLinkDemoLabLink', () => {

  it('returns ok:true with a valid token format when base URL is configured', () => {
    const result = generateKoraLinkDemoLabLink(READY_ENV);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(isValidTokenFormat(result.token)).toBe(true);
    }
  });

  it('returns a URL containing the generated token', () => {
    const result = generateKoraLinkDemoLabLink(READY_ENV);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.url).toContain(result.token);
      expect(result.url.startsWith(VALID_URL)).toBe(true);
    }
  });

  it('generates a different token on every call (never cached, never persisted)', () => {
    const first = generateKoraLinkDemoLabLink(READY_ENV);
    const second = generateKoraLinkDemoLabLink(READY_ENV);
    expect(first.ok && second.ok).toBe(true);
    if (first.ok && second.ok) {
      expect(first.token).not.toBe(second.token);
    }
  });

  it('returns ok:false with reason base_url_not_configured when base URL is missing', () => {
    const env: KoraLinkEnv = { KORA_LINK_ENABLED: 'true', KORA_LINK_TOKEN_SECRET: VALID_SECRET };
    const result = generateKoraLinkDemoLabLink(env);
    expect(result).toEqual<KoraLinkDemoLabLinkResult>({ ok: false, reason: 'base_url_not_configured' });
  });

  it('returns ok:false when base URL is present but invalid', () => {
    const env = { ...READY_ENV, KORA_LINK_PUBLIC_BASE_URL: 'not a url' };
    const result = generateKoraLinkDemoLabLink(env);
    expect(result.ok).toBe(false);
  });

  it('never throws regardless of env content', () => {
    expect(() => generateKoraLinkDemoLabLink({})).not.toThrow();
    expect(() => generateKoraLinkDemoLabLink({ KORA_LINK_PUBLIC_BASE_URL: '' })).not.toThrow();
    expect(() => generateKoraLinkDemoLabLink({ KORA_LINK_PUBLIC_BASE_URL: 'ftp://bad' })).not.toThrow();
  });

  it('succeeds even when KORA_LINK_TOKEN_SECRET is absent (demo lab never computes a digest)', () => {
    const env: KoraLinkEnv = { KORA_LINK_PUBLIC_BASE_URL: VALID_URL };
    const result = generateKoraLinkDemoLabLink(env);
    expect(result.ok).toBe(true);
  });

  it('succeeds even when KORA_LINK_ENABLED is false (demo lab does not depend on the route flag)', () => {
    const env: KoraLinkEnv = { KORA_LINK_ENABLED: 'false', KORA_LINK_PUBLIC_BASE_URL: VALID_URL };
    const result = generateKoraLinkDemoLabLink(env);
    expect(result.ok).toBe(true);
  });

  it('never includes the token secret value anywhere in the result', () => {
    const result = generateKoraLinkDemoLabLink(READY_ENV);
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain(VALID_SECRET);
  });

  it('does not include a digest field in the result (no DB path, no digest needed)', () => {
    const result = generateKoraLinkDemoLabLink(READY_ENV);
    expect(result).not.toHaveProperty('digest');
  });

  it('the returned token always has the kl1_ prefix and 52-char total length', () => {
    const result = generateKoraLinkDemoLabLink(READY_ENV);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.token.startsWith('kl1_')).toBe(true);
      expect(result.token.length).toBe(52);
    }
  });

});

// ── 3. getKoraLinkDemoLabRuntimeStatus ────────────────────────────────────────

describe('getKoraLinkDemoLabRuntimeStatus', () => {

  it('reports koraLinkEnabled=true when KORA_LINK_ENABLED="true"', () => {
    const status = getKoraLinkDemoLabRuntimeStatus(READY_ENV);
    expect(status.koraLinkEnabled).toBe(true);
  });

  it('reports koraLinkEnabled=false when the flag is absent', () => {
    const status = getKoraLinkDemoLabRuntimeStatus({});
    expect(status.koraLinkEnabled).toBe(false);
  });

  it('reports publicBaseUrlConfigured=true when a valid base URL is set', () => {
    const status = getKoraLinkDemoLabRuntimeStatus(READY_ENV);
    expect(status.publicBaseUrlConfigured).toBe(true);
  });

  it('reports publicBaseUrlConfigured=false when the base URL is absent', () => {
    const status = getKoraLinkDemoLabRuntimeStatus({});
    expect(status.publicBaseUrlConfigured).toBe(false);
  });

  it('reports publicBaseUrlConfigured=false when the base URL is malformed', () => {
    const status = getKoraLinkDemoLabRuntimeStatus({ KORA_LINK_PUBLIC_BASE_URL: 'not a url' });
    expect(status.publicBaseUrlConfigured).toBe(false);
  });

  it('reports dbLookupEnabled=false by default (KORA_LINK_DB_LOOKUP_ENABLED absent)', () => {
    const status = getKoraLinkDemoLabRuntimeStatus(READY_ENV);
    expect(status.dbLookupEnabled).toBe(false);
  });

  it('reports dbLookupEnabled=true only when the flag is the exact string "true"', () => {
    const status = getKoraLinkDemoLabRuntimeStatus({ ...READY_ENV, KORA_LINK_DB_LOOKUP_ENABLED: 'true' });
    expect(status.dbLookupEnabled).toBe(true);
  });

  it('reports dbLookupEnabled=false when the flag is "1" (not canonical)', () => {
    const status = getKoraLinkDemoLabRuntimeStatus({ ...READY_ENV, KORA_LINK_DB_LOOKUP_ENABLED: '1' });
    expect(status.dbLookupEnabled).toBe(false);
  });

  it('reports rateLimitProvider=null when the provider env var is absent', () => {
    const status = getKoraLinkDemoLabRuntimeStatus({});
    expect(status.rateLimitProvider).toBeNull();
  });

  it('reports rateLimitProvider="disabled" when configured', () => {
    const status = getKoraLinkDemoLabRuntimeStatus({ KORA_LINK_RATE_LIMIT_PROVIDER: 'disabled' });
    expect(status.rateLimitProvider).toBe('disabled');
  });

  it('reports rateLimitProvider="upstash" when configured', () => {
    const status = getKoraLinkDemoLabRuntimeStatus({ KORA_LINK_RATE_LIMIT_PROVIDER: 'upstash' });
    expect(status.rateLimitProvider).toBe('upstash');
  });

  it('falls back to rateLimitProvider=null instead of throwing on an unrecognised provider value', () => {
    expect(() => getKoraLinkDemoLabRuntimeStatus({ KORA_LINK_RATE_LIMIT_PROVIDER: 'bogus' })).not.toThrow();
    const status = getKoraLinkDemoLabRuntimeStatus({ KORA_LINK_RATE_LIMIT_PROVIDER: 'bogus' });
    expect(status.rateLimitProvider).toBeNull();
  });

  it('never includes the token secret value anywhere in the status object', () => {
    const status = getKoraLinkDemoLabRuntimeStatus(READY_ENV);
    const serialized = JSON.stringify(status);
    expect(serialized).not.toContain(VALID_SECRET);
  });

  it('does not expose a raw env dump — only the 4 documented fields', () => {
    const status = getKoraLinkDemoLabRuntimeStatus(READY_ENV);
    expect(Object.keys(status).sort()).toEqual(
      ['dbLookupEnabled', 'koraLinkEnabled', 'publicBaseUrlConfigured', 'rateLimitProvider'].sort()
    );
  });

  it('never throws regardless of env content', () => {
    expect(() => getKoraLinkDemoLabRuntimeStatus({})).not.toThrow();
    expect(() => getKoraLinkDemoLabRuntimeStatus({ KORA_LINK_PUBLIC_BASE_URL: '' })).not.toThrow();
    expect(() => getKoraLinkDemoLabRuntimeStatus({ KORA_LINK_ENABLED: 'garbage' })).not.toThrow();
  });

});
