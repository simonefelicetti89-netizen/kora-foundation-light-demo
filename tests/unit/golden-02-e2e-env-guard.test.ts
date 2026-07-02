/**
 * GOLDEN-02 — E2E env/guard helper unit tests.
 *
 * Covers tests/e2e/helpers/env.ts pure logic (no Playwright runtime needed):
 *   - missing credentials resolve to null, never throw;
 *   - credentials are never echoed back in any exported value;
 *   - production-looking base URLs are blocked unless explicitly allowed.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  getAdminCredentials,
  getCompanyACredentials,
  getCompanyBCredentials,
  getBaseUrl,
  isProductionLikeUrl,
  guardBaseUrl,
  envPresence,
} from '../e2e/helpers/env';

const E2E_VARS = [
  'E2E_BASE_URL',
  'E2E_ALLOW_PRODUCTION',
  'E2E_KORA_ADMIN_EMAIL',
  'E2E_KORA_ADMIN_PASSWORD',
  'E2E_COMPANY_A_EMAIL',
  'E2E_COMPANY_A_PASSWORD',
  'E2E_COMPANY_A_TENANT_CODE',
  'E2E_COMPANY_B_EMAIL',
  'E2E_COMPANY_B_PASSWORD',
  'E2E_COMPANY_B_TENANT_CODE',
] as const;

let savedEnv: Record<string, string | undefined>;

beforeEach(() => {
  savedEnv = {};
  for (const key of E2E_VARS) {
    savedEnv[key] = process.env[key];
    delete process.env[key];
  }
});

afterEach(() => {
  for (const key of E2E_VARS) {
    if (savedEnv[key] === undefined) delete process.env[key];
    else process.env[key] = savedEnv[key];
  }
});

describe('GOLDEN-02 · E2E credential helpers', () => {

  it('returns null when admin credentials are missing', () => {
    expect(getAdminCredentials()).toBeNull();
  });

  it('returns credentials when both admin env vars are set', () => {
    process.env.E2E_KORA_ADMIN_EMAIL = 'admin@example.test';
    process.env.E2E_KORA_ADMIN_PASSWORD = 'super-secret';
    expect(getAdminCredentials()).toEqual({ email: 'admin@example.test', password: 'super-secret' });
  });

  it('returns null when only one of email/password is set', () => {
    process.env.E2E_COMPANY_A_EMAIL = 'a@example.test';
    expect(getCompanyACredentials()).toBeNull();
  });

  it('includes optional tenant code for company B when present', () => {
    process.env.E2E_COMPANY_B_EMAIL = 'b@example.test';
    process.env.E2E_COMPANY_B_PASSWORD = 'pw';
    process.env.E2E_COMPANY_B_TENANT_CODE = 'TENANT-B';
    expect(getCompanyBCredentials()).toEqual({
      email: 'b@example.test',
      password: 'pw',
      tenantCode: 'TENANT-B',
    });
  });

  it('never echoes the raw password value via envPresence', () => {
    process.env.E2E_KORA_ADMIN_PASSWORD = 'super-secret-value';
    const result = envPresence('E2E_KORA_ADMIN_PASSWORD');
    expect(result).toBe('set');
    expect(result).not.toContain('super-secret-value');
  });

  it('reports missing vars via envPresence without throwing', () => {
    expect(envPresence('E2E_KORA_ADMIN_PASSWORD')).toBe('missing');
  });

});

describe('GOLDEN-02 · base URL production guard', () => {

  it('defaults to localhost when E2E_BASE_URL is unset', () => {
    expect(getBaseUrl()).toBe('http://localhost:3000');
  });

  it('treats localhost/127.0.0.1/::1 as non-production', () => {
    expect(isProductionLikeUrl('http://localhost:3000')).toBe(false);
    expect(isProductionLikeUrl('http://127.0.0.1:3000')).toBe(false);
    expect(isProductionLikeUrl('http://[::1]:3000')).toBe(false);
  });

  it('treats a real domain as production-like', () => {
    expect(isProductionLikeUrl('https://kora-foundation-light-demo.vercel.app')).toBe(true);
  });

  it('treats an unparseable URL as production-like (fail safe)', () => {
    expect(isProductionLikeUrl('not-a-url')).toBe(true);
  });

  it('does not block when base URL is local', () => {
    expect(guardBaseUrl()).toEqual({ blocked: false });
  });

  it('blocks a production-looking base URL without explicit opt-in', () => {
    process.env.E2E_BASE_URL = 'https://kora-foundation-light-demo.vercel.app';
    const result = guardBaseUrl();
    expect(result.blocked).toBe(true);
    expect(result.reason).toMatch(/E2E_ALLOW_PRODUCTION/);
  });

  it('allows a production-looking base URL when E2E_ALLOW_PRODUCTION=true', () => {
    process.env.E2E_BASE_URL = 'https://kora-foundation-light-demo.vercel.app';
    process.env.E2E_ALLOW_PRODUCTION = 'true';
    expect(guardBaseUrl()).toEqual({ blocked: false });
  });

});
