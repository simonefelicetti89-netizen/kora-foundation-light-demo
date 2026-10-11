// tests/unit/auth-cookie-secure-browser-dev.test.ts
// Report 289 / 290 — development-mode counterpart of the browser cases in
// auth-cookie-secure.test.ts. Kept in its own file because @supabase/ssr caches
// the browser client in module scope, which vi.resetModules() does not evict:
// local `next dev` on http://localhost must write NON-Secure sb-* cookies.

import { afterEach, describe, expect, it, vi } from 'vitest';

const SUPABASE_URL = 'https://abcdefghijklmnop.supabase.co';
const COOKIE = 'sb-abcdefghijklmnop-auth-token';

function jwt(expSecondsFromNow: number): string {
  const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  return `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({
    sub: '00000000-0000-4000-8000-000000000001', role: 'authenticated', aud: 'authenticated',
    exp: now + expSecondsFromNow, iat: now - 60,
  })}.sig`;
}

const USER = {
  id: '00000000-0000-4000-8000-000000000001', aud: 'authenticated', role: 'authenticated',
  email: 'qa@kora.test', app_metadata: { kora_role: 'PARTNER' }, user_metadata: {},
  created_at: '2026-01-01T00:00:00Z',
};

function stubAuthFetch() {
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
    const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url);
    const json = (body: unknown) => new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/json' } });
    if (url.pathname === '/auth/v1/token') {
      return json({ access_token: jwt(3600), refresh_token: 'r', token_type: 'bearer', expires_in: 3600,
        expires_at: Math.floor(Date.now() / 1000) + 3600, user: USER });
    }
    if (url.pathname === '/auth/v1/recover') return json({});
    return json(USER);
  }));
}

function stubBrowser(origin: string) {
  const writes: string[] = [];
  const jar = new Map<string, string>();
  const document = {
    get cookie() { return [...jar].map(([k, v]) => `${k}=${v}`).join('; '); },
    set cookie(str: string) {
      writes.push(str);
      const [pair] = str.split(';');
      const [name, ...rest] = pair.split('=');
      jar.set(name.trim(), rest.join('='));
    },
    visibilityState: 'visible',
    addEventListener: () => {},
    removeEventListener: () => {},
  };
  vi.stubGlobal('document', document);
  vi.stubGlobal('window', {
    document, location: new URL(`${origin}/login`), localStorage: undefined,
    addEventListener: () => {}, removeEventListener: () => {},
    history: { replaceState: () => {} },
  });
  return writes;
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('lib/supabase/client.ts — scritture document.cookie del browser (development)', () => {
  it('signInWithPassword e resetPasswordForEmail su http://localhost → cookie NON Secure', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', SUPABASE_URL);
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon-key-placeholder');
    stubAuthFetch();
    const writes = stubBrowser('http://localhost:3000');
    const { getSupabaseBrowserClient } = await import('@/lib/supabase/client');
    const supabase = getSupabaseBrowserClient();

    expect((await supabase.auth.signInWithPassword({ email: 'qa@kora.test', password: 'x' })).error).toBeNull();
    expect((await supabase.auth.resetPasswordForEmail('qa@kora.test', {
      redirectTo: 'http://localhost:3000/auth/callback?type=recovery',
    })).error).toBeNull();
    await supabase.auth.getSession();
    await supabase.auth.stopAutoRefresh();

    const sb = writes.filter((w) => w.startsWith(`${COOKIE}=base64-`) || w.startsWith(`${COOKIE}-code-verifier=`));
    expect(sb.some((w) => w.startsWith(`${COOKIE}=base64-`))).toBe(true);
    expect(sb.some((w) => w.startsWith(`${COOKIE}-code-verifier=`))).toBe(true);
    for (const w of sb) {
      expect(w).not.toMatch(/Secure/i);
      expect(w).not.toMatch(/HttpOnly/i);
      expect(w).toMatch(/;\s*SameSite=Lax/i);
    }
  });
});
