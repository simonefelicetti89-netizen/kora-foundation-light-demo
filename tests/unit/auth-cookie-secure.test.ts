// tests/unit/auth-cookie-secure.test.ts
// Report 289 / 290 — Secure flag on the Supabase sb-* auth cookies.
//
// Drives the REAL @supabase/ssr writers (no SDK mock): only the network is
// stubbed via fetch. Each writer path that can emit an sb-* cookie is
// exercised in both build modes:
//   - middleware.ts  → token refresh (TOKEN_REFRESHED) → Set-Cookie on the response
//   - lib/supabase/server.ts → callback verifyOtp (SIGNED_IN) and logout (SIGNED_OUT)
//   - lib/supabase/client.ts → browser signInWithPassword and the PKCE code-verifier
// and asserts Secure follows the build while httpOnly / sameSite / path /
// maxAge stay at the @supabase/ssr defaults.

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const REPO_ROOT = join(__dirname, '..', '..');
const SUPABASE_URL = 'https://abcdefghijklmnop.supabase.co';
const COOKIE = 'sb-abcdefghijklmnop-auth-token';
const DEFAULT_MAX_AGE = 400 * 24 * 60 * 60;

function jwt(expSecondsFromNow: number): string {
  const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  return `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({
    sub: '00000000-0000-4000-8000-000000000001', role: 'authenticated', aud: 'authenticated',
    exp: now + expSecondsFromNow, iat: now - 60, app_metadata: { kora_role: 'PARTNER' },
  })}.sig`;
}

const USER = {
  id: '00000000-0000-4000-8000-000000000001', aud: 'authenticated', role: 'authenticated',
  email: 'qa@kora.test', app_metadata: { kora_role: 'PARTNER' }, user_metadata: {},
  created_at: '2026-01-01T00:00:00Z',
};

function session(expSecondsFromNow: number) {
  return {
    access_token: jwt(expSecondsFromNow), refresh_token: 'refresh-token-value', token_type: 'bearer',
    expires_in: expSecondsFromNow, expires_at: Math.floor(Date.now() / 1000) + expSecondsFromNow, user: USER,
  };
}

const cookieValue = (s: object) => 'base64-' + Buffer.from(JSON.stringify(s)).toString('base64url');

function stubAuthFetch() {
  const calls: string[] = [];
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url);
    const method = (init?.method ?? 'GET').toUpperCase();
    calls.push(`${method} ${url.pathname}${url.search}`);
    const json = (body: unknown, status = 200) =>
      new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
    if (url.pathname === '/auth/v1/token') return json(session(3600));
    if (url.pathname === '/auth/v1/verify') return json(session(3600));
    if (url.pathname === '/auth/v1/user') return json(USER);
    if (url.pathname === '/auth/v1/logout') return new Response(null, { status: 204 });
    if (url.pathname === '/auth/v1/recover') return json({});
    return json({ message: 'unexpected' }, 404);
  });
  vi.stubGlobal('fetch', fetchMock);
  return calls;
}

function setEnv(nodeEnv: 'production' | 'development') {
  vi.stubEnv('NODE_ENV', nodeEnv);
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', SUPABASE_URL);
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon-key-placeholder');
}

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.doUnmock('next/headers');
});

// ── 1. Shared options ────────────────────────────────────────────────────────

describe('SUPABASE_AUTH_COOKIE_OPTIONS', () => {
  it('production build → secure: true, nessun altro attributo sovrascritto', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    const { SUPABASE_AUTH_COOKIE_OPTIONS } = await import('@/lib/supabase/cookie-options');
    expect(SUPABASE_AUTH_COOKIE_OPTIONS).toEqual({ secure: true });
  });

  it.each(['development', 'test'] as const)('%s → secure: false', async (env) => {
    vi.stubEnv('NODE_ENV', env);
    const { SUPABASE_AUTH_COOKIE_OPTIONS } = await import('@/lib/supabase/cookie-options');
    expect(SUPABASE_AUTH_COOKIE_OPTIONS).toEqual({ secure: false });
  });
});

// ── 2. Every writer is wired to the shared options ───────────────────────────

describe('ogni client @supabase/ssr che scrive cookie usa le opzioni condivise', () => {
  function walk(dir: string, out: string[] = []): string[] {
    for (const name of readdirSync(dir)) {
      if (name === 'node_modules' || name.startsWith('.')) continue;
      const p = join(dir, name);
      if (statSync(p).isDirectory()) walk(p, out);
      else if (/\.(ts|tsx)$/.test(name)) out.push(p);
    }
    return out;
  }
  const files = ['app', 'lib', 'components', 'services']
    .flatMap((d) => { try { return walk(join(REPO_ROOT, d)); } catch { return []; } })
    .concat(join(REPO_ROOT, 'middleware.ts'));

  const callSites = files.flatMap((f) => {
    const src = readFileSync(f, 'utf-8');
    const n = (src.match(/\bcreate(Server|Browser)Client\s*(<[^>]*>)?\s*\(/g) ?? []).length;
    return n ? [{ file: relative(REPO_ROOT, f), calls: n, wired: (src.match(/cookieOptions:\s*SUPABASE_AUTH_COOKIE_OPTIONS/g) ?? []).length }] : [];
  });

  it('i writer noti sono esattamente client.ts, server.ts e middleware.ts', () => {
    expect(callSites.map((c) => c.file).sort()).toEqual(['lib/supabase/client.ts', 'lib/supabase/server.ts', 'middleware.ts']);
  });

  it('ogni chiamata create*Client passa cookieOptions: SUPABASE_AUTH_COOKIE_OPTIONS', () => {
    for (const c of callSites) expect(c.wired, c.file).toBe(c.calls);
  });
});

// ── 3. middleware.ts — token refresh ─────────────────────────────────────────

async function runMiddlewareRefresh() {
  const calls = stubAuthFetch();
  const { NextRequest } = await import('next/server');
  const { middleware } = await import('@/middleware');
  const req = new NextRequest('https://preview.example/partner/workspace', {
    headers: { cookie: `${COOKIE}=${cookieValue(session(-60))}` },
  });
  const res = await middleware(req);
  const setCookies = res.headers.getSetCookie().filter((c) => c.startsWith(`${COOKIE}=`));
  return { calls, setCookies };
}

describe('middleware.ts — refresh del token', () => {
  it('production: il cookie rinnovato è Secure; SameSite/Path/Max-Age invariati; nessun HttpOnly', async () => {
    setEnv('production');
    const { calls, setCookies } = await runMiddlewareRefresh();
    expect(calls).toContain('POST /auth/v1/token?grant_type=refresh_token');
    expect(setCookies.length).toBeGreaterThan(0);
    for (const c of setCookies) {
      expect(c).toMatch(/;\s*Secure/i);
      expect(c).toMatch(/;\s*SameSite=lax/i);
      expect(c).toMatch(/;\s*Path=\//);
      expect(c).toMatch(new RegExp(`;\\s*Max-Age=${DEFAULT_MAX_AGE}`));
      expect(c).not.toMatch(/HttpOnly/i);
    }
  });

  it('development: il cookie rinnovato NON è Secure', async () => {
    setEnv('development');
    const { calls, setCookies } = await runMiddlewareRefresh();
    expect(calls).toContain('POST /auth/v1/token?grant_type=refresh_token');
    expect(setCookies.length).toBeGreaterThan(0);
    for (const c of setCookies) {
      expect(c).not.toMatch(/Secure/i);
      expect(c).not.toMatch(/HttpOnly/i);
    }
  });
});

// ── 4. lib/supabase/server.ts — callback verifyOtp and logout signOut ────────

type SetCall = { name: string; value: string; options: Record<string, unknown> };

function mockNextHeaders(initial: Array<{ name: string; value: string }>) {
  const sets: SetCall[] = [];
  const jar = new Map(initial.map((c) => [c.name, c.value]));
  vi.doMock('next/headers', () => ({
    cookies: async () => ({
      getAll: () => [...jar].map(([name, value]) => ({ name, value })),
      set: (name: string, value: string, options: Record<string, unknown>) => {
        sets.push({ name, value, options });
        jar.set(name, value);
      },
    }),
  }));
  return sets;
}

describe('lib/supabase/server.ts — callback e logout', () => {
  it.each([['production', true], ['development', false]] as const)(
    '%s: verifyOtp (callback token_hash) scrive il cookie con secure=%s',
    async (env, secure) => {
      setEnv(env);
      stubAuthFetch();
      const sets = mockNextHeaders([]);
      const { getSupabaseServerClient } = await import('@/lib/supabase/server');
      const supabase = await getSupabaseServerClient();
      const { error } = await supabase.auth.verifyOtp({ type: 'invite', token_hash: 'hash' });
      expect(error).toBeNull();
      const written = sets.filter((s) => s.name.startsWith(COOKIE) && s.value);
      expect(written.length).toBeGreaterThan(0);
      for (const s of written) {
        expect(s.options.secure).toBe(secure);
        expect(s.options.httpOnly).toBe(false);
        expect(s.options.sameSite).toBe('lax');
        expect(s.options.maxAge).toBe(DEFAULT_MAX_AGE);
      }
    },
  );

  it.each([['production', true], ['development', false]] as const)(
    '%s: signOut (logout) cancella il cookie con le stesse opzioni (secure=%s, maxAge 0)',
    async (env, secure) => {
      setEnv(env);
      const calls = stubAuthFetch();
      const sets = mockNextHeaders([{ name: COOKIE, value: cookieValue(session(3600)) }]);
      const { getSupabaseServerClient } = await import('@/lib/supabase/server');
      const supabase = await getSupabaseServerClient();
      await supabase.auth.signOut();
      expect(calls.some((c) => c.startsWith('POST /auth/v1/logout'))).toBe(true);
      const removed = sets.filter((s) => s.name === COOKIE);
      expect(removed.length).toBe(1);
      expect(removed[0].value).toBe('');
      expect(removed[0].options.maxAge).toBe(0);
      expect(removed[0].options.secure).toBe(secure);
      expect(removed[0].options.path).toBe('/');
    },
  );
});

// ── 5. lib/supabase/client.ts — browser document.cookie writes ───────────────

function stubBrowser(origin: string) {
  const writes: string[] = [];
  const jar = new Map<string, string>();
  const document = {
    get cookie() { return [...jar].map(([k, v]) => `${k}=${v}`).join('; '); },
    set cookie(str: string) {
      writes.push(str);
      const [pair, ...attrs] = str.split(';');
      const [name, ...rest] = pair.split('=');
      if (attrs.some((a) => /^\s*max-age=0\s*$/i.test(a))) jar.delete(name.trim());
      else jar.set(name.trim(), rest.join('='));
    },
    visibilityState: 'visible',
    addEventListener: () => {},
    removeEventListener: () => {},
  };
  const location = new URL(`${origin}/login`);
  vi.stubGlobal('document', document);
  vi.stubGlobal('window', {
    document, location, localStorage: undefined,
    addEventListener: () => {}, removeEventListener: () => {},
    history: { replaceState: () => {} },
  });
  return writes;
}

// @supabase/ssr caches the browser client in its own module scope, which
// vi.resetModules() does not evict. Each build mode therefore runs in its own
// file (vitest isolates files per process): production here, development in
// auth-cookie-secure-browser-dev.test.ts.
describe('lib/supabase/client.ts — scritture document.cookie del browser (production)', () => {
  it('signInWithPassword (login) → cookie di sessione Secure, SameSite=Lax, nessun HttpOnly', async () => {
    setEnv('production');
    stubAuthFetch();
    const writes = stubBrowser('https://preview.example');
    const { getSupabaseBrowserClient } = await import('@/lib/supabase/client');
    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithPassword({ email: 'qa@kora.test', password: 'x' });
    await supabase.auth.getSession();
    await supabase.auth.stopAutoRefresh();
    expect(error).toBeNull();
    const sessionWrites = writes.filter((w) => w.startsWith(`${COOKIE}=base64-`));
    expect(sessionWrites.length).toBeGreaterThan(0);
    for (const w of sessionWrites) {
      expect(w).toMatch(/;\s*Secure/i);
      expect(w).toMatch(/;\s*SameSite=Lax/i);
      expect(w).toMatch(new RegExp(`;\\s*Max-Age=${DEFAULT_MAX_AGE}`));
      expect(w).not.toMatch(/HttpOnly/i);
    }
  });

  it('resetPasswordForEmail (recovery PKCE) → cookie code-verifier Secure', async () => {
    setEnv('production');
    stubAuthFetch();
    const writes = stubBrowser('https://preview.example');
    const { getSupabaseBrowserClient } = await import('@/lib/supabase/client');
    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.auth.resetPasswordForEmail('qa@kora.test', {
      redirectTo: 'https://preview.example/auth/callback?type=recovery',
    });
    await supabase.auth.getSession();
    await supabase.auth.stopAutoRefresh();
    expect(error).toBeNull();
    const verifier = writes.filter((w) => w.startsWith(`${COOKIE}-code-verifier=`));
    expect(verifier.length).toBeGreaterThan(0);
    for (const w of verifier) expect(w).toMatch(/;\s*Secure/i);
  });
});
