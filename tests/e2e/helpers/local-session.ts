/**
 * PILOT-TRUST-01 (F-08) — local-Supabase session helper for the golden-path
 * smoke test.
 *
 * WHY THIS EXISTS: this app's Content-Security-Policy `connect-src` allowlist
 * (next.config.ts, unmodified by this sprint — see docs/PILOT_TRUST_01_E2E_EVIDENCE.md)
 * only permits `https://*.supabase.co`. A real local Docker Supabase instance
 * (http://127.0.0.1:54321) is therefore unreachable from the BROWSER's own
 * `supabase.auth.signInWithPassword()` call — any attempt is blocked by CSP
 * before it leaves the page, so the real `/login` form cannot complete
 * against local Supabase. This is a genuine, discovered constraint, not a
 * bug in this helper.
 *
 * WHAT THIS DOES INSTEAD: obtains a real session via a direct, Node-side
 * (not browser-side) password grant against local GoTrue — exactly the
 * request the login form itself would make, just issued from Playwright's
 * own process instead of page JS, so it is never subject to the page's CSP
 * at all (CSP only restricts what the loaded document's own script can
 * fetch). It then uses `@supabase/ssr`'s own cookie-serialization logic
 * (via a real `createServerClient` with a capturing cookie adapter — not a
 * hand-rolled reimplementation) to compute the exact cookie name/value the
 * app itself would have written, and installs it into the browser context
 * before navigation. The app's server-side session read
 * (getSupabaseServerClient().auth.getUser()) then validates this exactly as
 * it would any real browser-originated session — nothing about the
 * session's validity or the RLS enforcement downstream is faked.
 */

import { createServerClient } from '@supabase/ssr';
import type { BrowserContext } from 'playwright/test';

function readEnv(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim().length > 0 ? value : undefined;
}

export interface LocalSessionConfig {
  supabaseUrl: string;
  anonKey: string;
}

export function readLocalSessionConfig(): LocalSessionConfig | null {
  const supabaseUrl = readEnv('E2E_LOCAL_SUPABASE_URL');
  const anonKey = readEnv('E2E_LOCAL_SUPABASE_ANON_KEY');
  if (!supabaseUrl || !anonKey) return null;
  return { supabaseUrl, anonKey };
}

const ALLOWED_LOCAL_HOSTS = ['127.0.0.1', 'localhost', '::1'];

function assertLocalOnly(url: string): void {
  const hostname = new URL(url).hostname.toLowerCase();
  if (!ALLOWED_LOCAL_HOSTS.includes(hostname)) {
    throw new Error(`E2E_LOCAL_SUPABASE_URL host "${hostname}" is not local — refusing to sign in against it.`);
  }
}

/**
 * Signs in against local GoTrue directly (Node-side, no CSP involved) and
 * installs the resulting session as a cookie in the given browser context,
 * exactly as the app's own cookie-based session client would read it.
 */
export async function installLocalSession(
  context: BrowserContext,
  config: LocalSessionConfig,
  email: string,
  password: string,
): Promise<void> {
  assertLocalOnly(config.supabaseUrl);

  const resp = await fetch(`${config.supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: config.anonKey },
    body: JSON.stringify({ email, password }),
  });
  const tokenData = await resp.json();
  if (!tokenData.access_token) {
    throw new Error(`local password grant failed: ${tokenData.error_description ?? tokenData.msg ?? 'unknown error'}`);
  }

  const captured: Array<{ name: string; value: string }> = [];
  const supabase = createServerClient(config.supabaseUrl, config.anonKey, {
    cookies: {
      getAll: () => [],
      setAll: (cookiesToSet) => {
        for (const c of cookiesToSet) captured.push({ name: c.name, value: c.value });
      },
    },
  });
  await supabase.auth.setSession({ access_token: tokenData.access_token, refresh_token: tokenData.refresh_token });

  if (captured.length === 0) throw new Error('no session cookie was produced — setSession failed silently');

  await context.addCookies(
    captured.map((c) => ({
      name: c.name,
      value: c.value,
      url: 'http://localhost:3000',
      httpOnly: false,
      sameSite: 'Lax' as const,
    })),
  );
}
