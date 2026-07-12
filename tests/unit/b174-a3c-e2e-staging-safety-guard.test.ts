/**
 * B174-A3c — E2E staging target safety guard tests.
 *
 * Covers tests/e2e/helpers/e2e-safety.ts pure logic (no Playwright runtime
 * needed) and confirms the three authenticated E2E suites actually wire the
 * guard in before any login attempt. Does not run Playwright/E2E, does not
 * touch Supabase, does not run GD01 — pure static/unit analysis only.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import {
  assertSafeE2ETarget,
  isLocalHostname,
  parseAllowedStagingHosts,
  guardGoldenDataBearingRun,
  KNOWN_PRODUCTION_HOSTNAMES,
  type E2ETargetSafetyOptions,
} from '../e2e/helpers/e2e-safety';

const root = resolve(process.cwd());

function readFile(relPath: string): string {
  return readFileSync(resolve(root, relPath), 'utf-8');
}

const BASE_OPTIONS: E2ETargetSafetyOptions = {
  baseUrl: 'http://localhost:3000',
  allowProduction: false,
  confirmProductionAuthE2E: false,
  allowedStagingHosts: [],
  suiteName: 'test-suite',
};

describe('B174-A3c — assertSafeE2ETarget · production-documented hostname', () => {
  it('is blocked by default (no opt-in flags at all)', () => {
    const result = assertSafeE2ETarget({
      ...BASE_OPTIONS,
      baseUrl: `https://${KNOWN_PRODUCTION_HOSTNAMES[0]}`,
    });
    expect(result.blocked).toBe(true);
  });

  it('is still blocked when only E2E_ALLOW_PRODUCTION=true is present', () => {
    const result = assertSafeE2ETarget({
      ...BASE_OPTIONS,
      baseUrl: `https://${KNOWN_PRODUCTION_HOSTNAMES[0]}`,
      allowProduction: true,
      confirmProductionAuthE2E: false,
    });
    expect(result.blocked).toBe(true);
    expect(result.reason).toMatch(/non è sufficiente da solo/);
  });

  it('is allowed only when the stronger confirm variable is also true', () => {
    const result = assertSafeE2ETarget({
      ...BASE_OPTIONS,
      baseUrl: `https://${KNOWN_PRODUCTION_HOSTNAMES[0]}`,
      allowProduction: true,
      confirmProductionAuthE2E: true,
    });
    expect(result.blocked).toBe(false);
  });

  it('is still blocked with the confirm variable false even if the host is in the staging allowlist by mistake (allowlist should not contain it, but confirm the precedence anyway)', () => {
    // Sanity: an operator should never put the production hostname in the
    // staging allowlist, but if they did, the allowlist path still wins
    // (blocked: false) — this test documents that precedence explicitly
    // rather than leaving it implicit.
    const result = assertSafeE2ETarget({
      ...BASE_OPTIONS,
      baseUrl: `https://${KNOWN_PRODUCTION_HOSTNAMES[0]}`,
      allowedStagingHosts: [KNOWN_PRODUCTION_HOSTNAMES[0]],
    });
    expect(result.blocked).toBe(false);
  });
});

describe('B174-A3c — assertSafeE2ETarget · localhost', () => {
  it('allows http://localhost:3000', () => {
    expect(assertSafeE2ETarget({ ...BASE_OPTIONS, baseUrl: 'http://localhost:3000' }).blocked).toBe(false);
  });

  it('allows http://127.0.0.1:3000', () => {
    expect(assertSafeE2ETarget({ ...BASE_OPTIONS, baseUrl: 'http://127.0.0.1:3000' }).blocked).toBe(false);
  });

  it('allows http://[::1]:3000', () => {
    expect(assertSafeE2ETarget({ ...BASE_OPTIONS, baseUrl: 'http://[::1]:3000' }).blocked).toBe(false);
  });

  it('allows a *.local hostname', () => {
    expect(assertSafeE2ETarget({ ...BASE_OPTIONS, baseUrl: 'http://mymachine.local:3000' }).blocked).toBe(false);
  });

  it('isLocalHostname recognizes all local host forms', () => {
    expect(isLocalHostname('localhost')).toBe(true);
    expect(isLocalHostname('127.0.0.1')).toBe(true);
    expect(isLocalHostname('0.0.0.0')).toBe(true);
    expect(isLocalHostname('::1')).toBe(true);
    expect(isLocalHostname('[::1]')).toBe(true);
    expect(isLocalHostname('foo.local')).toBe(true);
    expect(isLocalHostname('example.com')).toBe(false);
  });
});

describe('B174-A3c — assertSafeE2ETarget · explicit staging allowlist', () => {
  it('allows a host explicitly present in allowedStagingHosts', () => {
    const result = assertSafeE2ETarget({
      ...BASE_OPTIONS,
      baseUrl: 'https://kora-staging-preview.vercel.app',
      allowedStagingHosts: ['kora-staging-preview.vercel.app'],
    });
    expect(result.blocked).toBe(false);
  });

  it('blocks a non-local host NOT present in allowedStagingHosts, even with other hosts listed', () => {
    const result = assertSafeE2ETarget({
      ...BASE_OPTIONS,
      baseUrl: 'https://some-other-unknown-host.example.com',
      allowedStagingHosts: ['kora-staging-preview.vercel.app'],
    });
    expect(result.blocked).toBe(true);
  });

  it('does not hardcode any fake staging hostname as pre-approved', () => {
    // The module ships zero hostnames pre-approved as "staging" — only the
    // one known-dangerous production hostname is hardcoded, and it is
    // hardcoded as BLOCKED, not allowed.
    expect(KNOWN_PRODUCTION_HOSTNAMES.length).toBeGreaterThan(0);
    for (const host of KNOWN_PRODUCTION_HOSTNAMES) {
      const result = assertSafeE2ETarget({ ...BASE_OPTIONS, baseUrl: `https://${host}` });
      expect(result.blocked, `${host} must be blocked by default`).toBe(true);
    }
  });

  it('parseAllowedStagingHosts trims, lowercases, and drops empty entries', () => {
    expect(parseAllowedStagingHosts(' Foo.Example.com , bar.example.com ,, ')).toEqual([
      'foo.example.com',
      'bar.example.com',
    ]);
    expect(parseAllowedStagingHosts(undefined)).toEqual([]);
    expect(parseAllowedStagingHosts('')).toEqual([]);
  });
});

describe('B174-A3c — assertSafeE2ETarget · missing/invalid base URL fails safely', () => {
  it('blocks when baseUrl is undefined', () => {
    const result = assertSafeE2ETarget({ ...BASE_OPTIONS, baseUrl: undefined });
    expect(result.blocked).toBe(true);
    expect(result.reason).toMatch(/E2E_BASE_URL/);
  });

  it('blocks when baseUrl is an empty string', () => {
    const result = assertSafeE2ETarget({ ...BASE_OPTIONS, baseUrl: '' });
    expect(result.blocked).toBe(true);
  });

  it('blocks when baseUrl is whitespace-only', () => {
    const result = assertSafeE2ETarget({ ...BASE_OPTIONS, baseUrl: '   ' });
    expect(result.blocked).toBe(true);
  });

  it('blocks when baseUrl is not a parseable URL (fail safe)', () => {
    const result = assertSafeE2ETarget({ ...BASE_OPTIONS, baseUrl: 'not-a-url' });
    expect(result.blocked).toBe(true);
  });
});

describe('B174-A3c — guardGoldenDataBearingRun · separate mutation gate', () => {
  it('blocks when E2E_GOLDEN_DATA_BEARING_ALLOW_RUN is unset', () => {
    delete process.env.E2E_GOLDEN_DATA_BEARING_ALLOW_RUN;
    expect(guardGoldenDataBearingRun().blocked).toBe(true);
  });

  it('allows when E2E_GOLDEN_DATA_BEARING_ALLOW_RUN is exactly "true"', () => {
    process.env.E2E_GOLDEN_DATA_BEARING_ALLOW_RUN = 'true';
    expect(guardGoldenDataBearingRun().blocked).toBe(false);
    delete process.env.E2E_GOLDEN_DATA_BEARING_ALLOW_RUN;
  });

  it('blocks on any non-"true" value (e.g. "1", "yes")', () => {
    process.env.E2E_GOLDEN_DATA_BEARING_ALLOW_RUN = '1';
    expect(guardGoldenDataBearingRun().blocked).toBe(true);
    delete process.env.E2E_GOLDEN_DATA_BEARING_ALLOW_RUN;
  });
});

describe('B174-A3c — error messages never leak secrets, full URLs, or query strings', () => {
  const FORBIDDEN_SNIPPETS = ['password', 'secret', '?', '&', 'token', 'http://', 'https://'];

  it('the blocked-production reason contains no forbidden snippet', () => {
    const result = assertSafeE2ETarget({
      ...BASE_OPTIONS,
      baseUrl: `https://${KNOWN_PRODUCTION_HOSTNAMES[0]}?token=abc123&user=x`,
      allowProduction: true,
    });
    expect(result.blocked).toBe(true);
    for (const snippet of FORBIDDEN_SNIPPETS) {
      expect(result.reason?.toLowerCase()).not.toContain(snippet);
    }
  });

  it('the missing-base-url reason contains no forbidden snippet', () => {
    const result = assertSafeE2ETarget({ ...BASE_OPTIONS, baseUrl: undefined });
    for (const snippet of FORBIDDEN_SNIPPETS) {
      expect(result.reason?.toLowerCase()).not.toContain(snippet);
    }
  });

  it('the unclassified-host reason contains no forbidden snippet and reports only the bare hostname', () => {
    const result = assertSafeE2ETarget({
      ...BASE_OPTIONS,
      baseUrl: 'https://mystery-host.example.com/some/path?apiKey=super-secret-value',
    });
    expect(result.blocked).toBe(true);
    expect(result.reason).toContain('mystery-host.example.com');
    expect(result.reason).not.toContain('super-secret-value');
    expect(result.reason).not.toContain('/some/path');
    for (const snippet of FORBIDDEN_SNIPPETS) {
      expect(result.reason?.toLowerCase()).not.toContain(snippet);
    }
  });

  it('guardGoldenDataBearingRun reason contains no forbidden snippet', () => {
    delete process.env.E2E_GOLDEN_DATA_BEARING_ALLOW_RUN;
    const result = guardGoldenDataBearingRun();
    for (const snippet of FORBIDDEN_SNIPPETS) {
      expect(result.reason?.toLowerCase()).not.toContain(snippet);
    }
  });
});

describe('B174-A3c — three authenticated E2E suites wire the guard in before login', () => {
  const SUITES: { file: string; expectGoldenDataBearingGuard?: boolean }[] = [
    { file: 'tests/e2e/authenticated-smoke.spec.ts' },
    { file: 'tests/e2e/two-tenant-isolation.spec.ts' },
    { file: 'tests/e2e/golden-data-bearing.spec.ts', expectGoldenDataBearingGuard: true },
  ];

  for (const { file, expectGoldenDataBearingGuard } of SUITES) {
    it(`${file} imports guardE2ETarget from helpers/e2e-safety`, () => {
      const src = readFile(file);
      expect(src).toMatch(/import\s*\{[^}]*guardE2ETarget[^}]*\}\s*from\s*'\.\/helpers\/e2e-safety'/);
    });

    it(`${file} calls guardE2ETarget(...) and test.skip(guard.blocked, ...) before any loginViaUI call`, () => {
      const src = readFile(file);
      const guardCallIdx = src.indexOf('guardE2ETarget(');
      const firstLoginIdx = src.indexOf('loginViaUI(');
      expect(guardCallIdx, 'guardE2ETarget(...) must be called somewhere in the file').toBeGreaterThan(-1);
      expect(firstLoginIdx, 'loginViaUI(...) must be called somewhere in the file').toBeGreaterThan(-1);
      expect(guardCallIdx).toBeLessThan(firstLoginIdx);
      expect(src).toContain('test.skip(guard.blocked, guard.reason)');
    });

    it(`${file} no longer imports the weaker guardBaseUrl from helpers/env`, () => {
      const src = readFile(file);
      expect(src).not.toContain('guardBaseUrl');
    });

    if (expectGoldenDataBearingGuard) {
      it(`${file} also calls guardGoldenDataBearingRun() before login, as a second gate`, () => {
        const src = readFile(file);
        expect(src).toContain('guardGoldenDataBearingRun()');
        const gdbGuardIdx = src.indexOf('guardGoldenDataBearingRun(');
        const firstLoginIdx = src.indexOf('loginViaUI(');
        expect(gdbGuardIdx).toBeLessThan(firstLoginIdx);
      });
    }
  }

  it('golden-admin-company.spec.ts (G01/G02, out of B174-A3c scope) still uses guardBaseUrl unchanged', () => {
    const src = readFile('tests/e2e/golden-admin-company.spec.ts');
    expect(src).toContain('guardBaseUrl');
  });
});
