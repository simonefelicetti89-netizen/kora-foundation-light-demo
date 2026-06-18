// tests/unit/b170-error-boundary.test.ts
// B170 — Verifica strutturale dell'integrazione Sentry + Error Boundaries Next.js App Router.

import { readFileSync, existsSync } from 'fs';
import { join }                     from 'path';
import { describe, it, expect }     from 'vitest';

const ROOT = process.cwd();

function read(rel: string) { return readFileSync(join(ROOT, rel), 'utf8'); }
function exists(rel: string) { return existsSync(join(ROOT, rel)); }

// ── Group 1: Config files exist ──────────────────────────────────────────────

describe('B170 — Sentry config files', () => {
  it('sentry.client.config.ts exists', () => {
    expect(exists('sentry.client.config.ts')).toBe(true);
  });

  it('sentry.server.config.ts exists', () => {
    expect(exists('sentry.server.config.ts')).toBe(true);
  });

  it('sentry.edge.config.ts exists', () => {
    expect(exists('sentry.edge.config.ts')).toBe(true);
  });

  it('client config: enabled only in production', () => {
    const src = read('sentry.client.config.ts');
    expect(src).toContain("process.env.NODE_ENV === 'production'");
  });

  it('client config: NO replay integration (privacy KORA)', () => {
    const src = read('sentry.client.config.ts');
    expect(src).not.toContain('replayIntegration');
    expect(src).not.toContain('replaysSessionSampleRate');
    expect(src).not.toContain('replaysOnErrorSampleRate');
  });

  it('client config: tracesSampleRate set to 0.1', () => {
    const src = read('sentry.client.config.ts');
    expect(src).toContain('tracesSampleRate: 0.1');
  });

  it('client config: DSN from env var (not hardcoded)', () => {
    const src = read('sentry.client.config.ts');
    expect(src).toContain('process.env.NEXT_PUBLIC_SENTRY_DSN');
    expect(src).not.toMatch(/dsn:\s*['"][^'"]+sentry\.io/);
  });
});

// ── Group 2: next.config.ts wraps with withSentryConfig ──────────────────────

describe('B170 — next.config.ts Sentry integration', () => {
  const cfg = read('next.config.ts');

  it('imports withSentryConfig from @sentry/nextjs', () => {
    expect(cfg).toContain('@sentry/nextjs');
    expect(cfg).toContain('withSentryConfig');
  });

  it('exports withSentryConfig(nextConfig, ...)', () => {
    expect(cfg).toContain('withSentryConfig(nextConfig,');
  });

  it('disables source maps upload when SENTRY_AUTH_TOKEN is absent', () => {
    expect(cfg).toContain('SENTRY_AUTH_TOKEN');
    expect(cfg).toContain('disable:');
  });

  it('connect-src CSP includes sentry.io endpoints', () => {
    expect(cfg).toContain('sentry.io');
  });
});

// ── Group 3: Error boundaries ─────────────────────────────────────────────────

describe('B170 — app/error.tsx (root error boundary)', () => {
  const src = read('app/error.tsx');

  it("has 'use client' directive", () => {
    expect(src.trimStart()).toMatch(/^'use client'/);
  });

  it('imports Sentry from @sentry/nextjs', () => {
    expect(src).toContain("from '@sentry/nextjs'");
  });

  it('calls Sentry.captureException(error) in useEffect', () => {
    expect(src).toContain('Sentry.captureException(error)');
    expect(src).toContain('useEffect');
  });

  it('has a reset button', () => {
    expect(src).toContain('reset');
    expect(src).toContain('<button');
  });
});

describe('B170 — app/global-error.tsx (root layout crash boundary)', () => {
  const src = read('app/global-error.tsx');

  it("has 'use client' directive", () => {
    expect(src.trimStart()).toMatch(/^'use client'/);
  });

  it('has explicit <html> and <body> tags', () => {
    expect(src).toContain('<html');
    expect(src).toContain('<body');
  });

  it('calls Sentry.captureException(error)', () => {
    expect(src).toContain('Sentry.captureException(error)');
  });
});

describe('B170 — section-specific error boundaries', () => {
  const sections = ['admin', 'company', 'worker'] as const;

  for (const section of sections) {
    it(`app/${section}/error.tsx exists and uses 'use client'`, () => {
      expect(exists(`app/${section}/error.tsx`)).toBe(true);
      const src = read(`app/${section}/error.tsx`);
      expect(src.trimStart()).toMatch(/^'use client'/);
    });

    it(`app/${section}/error.tsx captures exception with Sentry`, () => {
      const src = read(`app/${section}/error.tsx`);
      expect(src).toContain('Sentry.captureException(error)');
      expect(src).toContain('useEffect');
    });

    it(`app/${section}/error.tsx has a reset button`, () => {
      const src = read(`app/${section}/error.tsx`);
      expect(src).toContain('reset');
    });
  }
});

// ── Group 4: env.local.example ────────────────────────────────────────────────

describe('B170 — .env.local.example Sentry vars', () => {
  const env = read('.env.local.example');

  it('has NEXT_PUBLIC_SENTRY_DSN placeholder', () => {
    expect(env).toContain('NEXT_PUBLIC_SENTRY_DSN=');
  });

  it('has SENTRY_ORG placeholder', () => {
    expect(env).toContain('SENTRY_ORG=');
  });

  it('has SENTRY_AUTH_TOKEN placeholder', () => {
    expect(env).toContain('SENTRY_AUTH_TOKEN=');
  });
});
