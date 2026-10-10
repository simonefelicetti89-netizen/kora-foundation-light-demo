/**
 * tests/integration/auth-invite-callback-convergence.test.ts
 *
 * Auth invite convergence (governed corrective change, auth/access flow, 2026-10-10).
 *
 * Every invite and recovery link completes on /auth/callback:
 *   - ?token_hash=…&type=invite|recovery → verifyOtp
 *   - ?code=… → exchangeCodeForSession (PKCE, unchanged)
 * Every invite route sends redirectTo = getAuthCallbackUrl(); the Partner route
 * stores its role in app_metadata through updateUserById.
 *
 * Approccio: vi.mock di @/lib/supabase/server, @/lib/auth/kora-session e delle
 * guardie origin/rate-limit; il route handler reale viene chiamato.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { join } from 'node:path';
import type { NextRequest } from 'next/server';

const auth = {
  exchangeCodeForSession: vi.fn(),
  verifyOtp:              vi.fn(),
  getUser:                vi.fn(),
};

const admin = {
  inviteUserByEmail: vi.fn(),
  updateUserById:    vi.fn(),
};
const partnerProfile = { id: 'partner-1', name: 'Partner Uno', status: 'active' };
const identityInsert = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  getSupabaseServerClient: vi.fn(async () => ({ auth })),
  getSupabaseServiceClient: vi.fn(() => ({
    auth: { admin },
    schema: () => ({
      from: (table: string) => table === 'partner_profile'
        ? { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: partnerProfile }) }) }) }
        : { insert: identityInsert },
    }),
  })),
}));

vi.mock('@/lib/auth/kora-session', () => ({
  requireKoraAdmin: vi.fn(async () => ({ id: 'admin-1', koraRole: 'KORA_ADMIN' })),
  isKoraAuthError:  vi.fn(() => false),
}));
vi.mock('@/lib/security/origin', () => ({ assertSameOrigin: vi.fn(() => null) }));
vi.mock('@/lib/security/rate-limit', () => ({ assertRateLimit: vi.fn(async () => null) }));

import { GET as callback } from '@/app/auth/callback/route';
import { POST as invitePartnerUser } from '@/app/api/admin/partners/[id]/invite-user/route';
import { getAuthCallbackUrl } from '@/lib/auth/auth-callback-url';

const ORIGIN = 'https://app.korahorizon.com';
const ROOT = join(__dirname, '../..');
const read = (rel: string) => readFileSync(join(ROOT, rel), 'utf-8');

function hit(query: string) {
  return callback({ url: `${ORIGIN}/auth/callback${query}` } as unknown as NextRequest);
}

function location(res: Response): URL {
  return new URL(res.headers.get('location') ?? '');
}

function signedInAs(role: string | undefined) {
  auth.getUser.mockResolvedValue({ data: { user: { app_metadata: role ? { kora_role: role } : {} } } });
}

beforeEach(() => {
  vi.clearAllMocks();
  auth.exchangeCodeForSession.mockResolvedValue({ error: null });
  auth.verifyOtp.mockResolvedValue({ error: null });
  signedInAs(undefined);
});

// ── 1. token_hash completion ──────────────────────────────────────────────────

describe('callback — token_hash links (KORA email templates)', () => {
  it('invite token_hash is verified with verifyOtp, not exchanged as a code', async () => {
    signedInAs('WORKER');
    await hit('?token_hash=th-1&type=invite');
    expect(auth.verifyOtp).toHaveBeenCalledWith({ type: 'invite', token_hash: 'th-1' });
    expect(auth.exchangeCodeForSession).not.toHaveBeenCalled();
  });

  it('recovery token_hash → /auth/reset-password for every role', async () => {
    for (const role of ['WORKER', 'COMPANY_ADMIN', 'PARTNER', 'KORA_ADMIN', undefined]) {
      signedInAs(role);
      const res = await hit('?token_hash=th-2&type=recovery');
      expect(auth.verifyOtp).toHaveBeenLastCalledWith({ type: 'recovery', token_hash: 'th-2' });
      expect(location(res).pathname).toBe('/auth/reset-password');
    }
  });

  it.each([['signup'], ['magiclink'], ['email_change'], ['email'], ['']])(
    'token_hash with type=%s is refused without calling Supabase',
    async (type) => {
      const res = await hit(`?token_hash=th-3&type=${type}`);
      expect(auth.verifyOtp).not.toHaveBeenCalled();
      expect(auth.exchangeCodeForSession).not.toHaveBeenCalled();
      expect(location(res).pathname).toBe('/login');
      expect(location(res).searchParams.get('error')).toBe('unsupported_link_type');
    },
  );

  it('token_hash without type is refused', async () => {
    const res = await hit('?token_hash=th-4');
    expect(auth.verifyOtp).not.toHaveBeenCalled();
    expect(location(res).searchParams.get('error')).toBe('unsupported_link_type');
  });

  it('failed invite verification → /login?error=exchange_failed', async () => {
    auth.verifyOtp.mockResolvedValue({ error: { message: 'Token has expired or is invalid' } });
    const res = await hit('?token_hash=th-5&type=invite');
    expect(location(res).pathname).toBe('/login');
    expect(location(res).searchParams.get('error')).toBe('exchange_failed');
    expect(auth.getUser).not.toHaveBeenCalled();
  });

  it('failed recovery verification → /auth/reset-password?error=exchange_failed', async () => {
    auth.verifyOtp.mockResolvedValue({ error: { message: 'Token has expired or is invalid' } });
    const res = await hit('?token_hash=th-6&type=recovery');
    expect(location(res).pathname).toBe('/auth/reset-password');
    expect(location(res).searchParams.get('error')).toBe('exchange_failed');
  });
});

// ── 2. Role destinations after an invite ──────────────────────────────────────

describe('callback — invite destination by role', () => {
  it.each([
    ['WORKER',        '/worker/setup-password'],
    ['COMPANY_ADMIN', '/company/setup-password'],
    ['PARTNER',       '/auth/reset-password'],
    ['KORA_ADMIN',    '/login'],
    ['ADVISOR',       '/login'],
    ['DEMO_VIEWER',   '/login'],
    [undefined,       '/login'],
  ])('%s → %s', async (role, path) => {
    signedInAs(role);
    const res = await hit('?token_hash=th-7&type=invite');
    expect(res.status).toBe(307);
    expect(location(res).pathname).toBe(path);
  });

  it('the PKCE code path reaches the same destinations', async () => {
    signedInAs('PARTNER');
    const res = await hit('?code=c-1');
    expect(auth.exchangeCodeForSession).toHaveBeenCalledWith('c-1');
    expect(auth.verifyOtp).not.toHaveBeenCalled();
    expect(location(res).pathname).toBe('/auth/reset-password');
  });
});

// ── 3. Unchanged paths ────────────────────────────────────────────────────────

describe('callback — PKCE, error and missing-parameter paths unchanged', () => {
  it('code + type=recovery → /auth/reset-password', async () => {
    const res = await hit('?code=c-2&type=recovery');
    expect(auth.exchangeCodeForSession).toHaveBeenCalledWith('c-2');
    expect(location(res).pathname).toBe('/auth/reset-password');
  });

  it('failed code exchange → /login?error=exchange_failed', async () => {
    auth.exchangeCodeForSession.mockResolvedValue({ error: { message: 'invalid' } });
    const res = await hit('?code=c-3');
    expect(location(res).pathname).toBe('/login');
    expect(location(res).searchParams.get('error')).toBe('exchange_failed');
  });

  it('Supabase error parameter → /login with the same error', async () => {
    const res = await hit('?error=access_denied&error_description=expired');
    expect(location(res).pathname).toBe('/login');
    expect(location(res).searchParams.get('error')).toBe('access_denied');
    expect(auth.verifyOtp).not.toHaveBeenCalled();
  });

  it('recovery error parameter → /auth/reset-password', async () => {
    const res = await hit('?error=access_denied&type=recovery');
    expect(location(res).pathname).toBe('/auth/reset-password');
  });

  it('neither code nor token_hash → /login?error=missing_auth_code', async () => {
    const res = await hit('?type=invite');
    expect(location(res).searchParams.get('error')).toBe('missing_auth_code');
    expect(auth.verifyOtp).not.toHaveBeenCalled();
    expect(auth.exchangeCodeForSession).not.toHaveBeenCalled();
  });
});

// ── 4. Redirect safety ────────────────────────────────────────────────────────

describe('callback — redirects stay on the request origin', () => {
  it('a next= parameter is ignored', async () => {
    signedInAs('WORKER');
    const res = await hit('?token_hash=th-8&type=invite&next=https://evil.example/x');
    expect(location(res).origin).toBe(ORIGIN);
    expect(location(res).pathname).toBe('/worker/setup-password');
  });

  it('every outcome redirects to the request origin', async () => {
    const queries = [
      '?token_hash=a&type=invite', '?token_hash=a&type=recovery', '?token_hash=a&type=signup',
      '?code=a', '?error=x', '?', '?redirect_to=https://evil.example',
    ];
    for (const q of queries) {
      expect(location(await hit(q)).origin).toBe(ORIGIN);
    }
  });

  it('the route reads no caller-supplied destination', () => {
    const src = read('app/auth/callback/route.ts');
    expect(src).not.toMatch(/searchParams\.get\('(next|redirect_to|redirectTo|returnTo)'\)/);
  });
});

// ── 5. getAuthCallbackUrl ─────────────────────────────────────────────────────

describe('getAuthCallbackUrl', () => {
  const saved = { site: process.env.NEXT_PUBLIC_SITE_URL, vercel: process.env.VERCEL_URL };
  afterEach(() => {
    process.env.NEXT_PUBLIC_SITE_URL = saved.site;
    process.env.VERCEL_URL = saved.vercel;
    if (saved.site === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
    if (saved.vercel === undefined) delete process.env.VERCEL_URL;
  });

  it('uses NEXT_PUBLIC_SITE_URL first, even when VERCEL_URL is set', () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://app.korahorizon.com';
    process.env.VERCEL_URL = 'kora-xyz.vercel.app';
    expect(getAuthCallbackUrl()).toBe('https://app.korahorizon.com/auth/callback');
  });

  it('strips a trailing slash', () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://app.korahorizon.com/';
    expect(getAuthCallbackUrl()).toBe('https://app.korahorizon.com/auth/callback');
  });

  it('falls back to VERCEL_URL, then localhost', () => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    process.env.VERCEL_URL = 'kora-xyz.vercel.app';
    expect(getAuthCallbackUrl()).toBe('https://kora-xyz.vercel.app/auth/callback');
    delete process.env.VERCEL_URL;
    expect(getAuthCallbackUrl()).toBe('http://localhost:3000/auth/callback');
  });
});

// ── 6. Partner invite route ───────────────────────────────────────────────────

describe('partner invite — redirectTo and app_metadata', () => {
  function invite(email = 'p@partner.example') {
    const req = { json: async () => ({ email }) } as unknown as NextRequest;
    return invitePartnerUser(req, { params: Promise.resolve({ id: 'partner-1' }) });
  }

  beforeEach(() => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://app.korahorizon.com';
    admin.inviteUserByEmail.mockResolvedValue({ data: { user: { id: 'user-p1' } }, error: null });
    admin.updateUserById.mockResolvedValue({ error: null });
    identityInsert.mockResolvedValue({ error: null });
  });

  it('invites with the top-level redirectTo the SDK actually reads', async () => {
    await invite();
    expect(admin.inviteUserByEmail).toHaveBeenCalledWith('p@partner.example', {
      redirectTo: 'https://app.korahorizon.com/auth/callback',
    });
  });

  it('stores PARTNER role and partner id in app_metadata, never a tenant', async () => {
    await invite();
    expect(admin.updateUserById).toHaveBeenCalledWith('user-p1', {
      app_metadata: { kora_role: 'PARTNER', kora_partner_id: 'partner-1', kora_status: 'active' },
    });
    const meta = admin.updateUserById.mock.calls[0][1].app_metadata;
    expect(meta).not.toHaveProperty('kora_tenant_id');
  });

  it('a metadata failure is reported and no partner_identity is created', async () => {
    admin.updateUserById.mockResolvedValue({ error: { message: 'boom' } });
    const res = await invite();
    expect(res.status).toBe(500);
    expect(identityInsert).not.toHaveBeenCalled();
  });

  it('an invite failure stops before any metadata write', async () => {
    admin.inviteUserByEmail.mockResolvedValue({ data: { user: null }, error: { message: 'exists' } });
    const res = await invite();
    expect(res.status).toBe(422);
    expect(admin.updateUserById).not.toHaveBeenCalled();
  });
});

// ── 7. Every invite route converges on /auth/callback ─────────────────────────

describe('invite routes — one completion path', () => {
  const ROUTES = [
    'app/api/admin/companies/provision/route.ts',
    'app/api/admin/company-users/route.ts',
    'app/api/admin/live-company/route.ts',
    'app/api/admin/partners/[id]/invite-user/route.ts',
    'app/api/admin/workers/provision/route.ts',
    'app/api/admin/workers/bulk-provision/route.ts',
  ];

  it.each(ROUTES)('%s sends redirectTo: getAuthCallbackUrl()', (rel) => {
    const src = read(rel);
    const calls = (src.match(/\.inviteUserByEmail\(\s*\w/g) ?? []).length;
    expect(calls).toBeGreaterThan(0);
    expect(src.split('redirectTo: getAuthCallbackUrl()').length - 1).toBe(calls);
    expect(src).not.toMatch(/redirectTo:\s*`/);
    expect(src).not.toMatch(/redirectTo:[^\n]*\/(company|partner)\/workspace/);
  });

  it('no invite route outside this list calls inviteUserByEmail', () => {
    const found = execSync('git grep -l "inviteUserByEmail(" -- app lib services', { cwd: ROOT, encoding: 'utf-8' })
      .trim().split('\n').filter(Boolean).sort();
    expect(found).toEqual([...ROUTES].sort());
  });

  it('the partner route no longer passes an options wrapper the SDK ignores', () => {
    const src = read('app/api/admin/partners/[id]/invite-user/route.ts');
    expect(src).not.toContain('options: {');
    expect(src).not.toContain('as Parameters<typeof db.auth.admin.inviteUserByEmail>');
  });
});

// ── 8. Email templates (local CLI) ────────────────────────────────────────────

describe('email templates — token_hash link to /auth/callback', () => {
  it.each([['invite'], ['recovery']])('%s template links to the callback with its own type', (type) => {
    const html = read(`supabase/templates/${type}.html`);
    expect(html).toContain(`{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=${type}`);
    expect(html).not.toContain('{{ .ConfirmationURL }}');
    expect(html).toContain('lang="it"');
  });

  it('config.toml wires both templates', () => {
    const toml = read('supabase/config.toml');
    expect(toml).toContain('[auth.email.template.invite]');
    expect(toml).toContain('content_path = "./supabase/templates/invite.html"');
    expect(toml).toContain('[auth.email.template.recovery]');
    expect(toml).toContain('content_path = "./supabase/templates/recovery.html"');
  });
});
