// ─── KORA Supabase Browser Client ─────────────────────────────────────────────
// Used by useScoringResult() and other client components for LIVE fetches.
// Only instantiated when environment === "live" — never touches demo seed data.
// ──────────────────────────────────────────────────────────────────────────────
// Uses createBrowserClient from @supabase/ssr (not createClient from supabase-js)
// so the session is stored in cookies, making it readable by createServerClient
// in API route handlers and server components.
// Public API unchanged: getSupabaseBrowserClient() returns the same SupabaseClient type.
// ──────────────────────────────────────────────────────────────────────────────

import { createBrowserClient } from '@supabase/ssr';
import type { Database } from './types';

// Singleton to avoid creating a new client on every render.
let _client: ReturnType<typeof createBrowserClient<Database>> | null = null;

/**
 * Returns a browser-safe Supabase client scoped to the anon key.
 * Session is stored in cookies (not localStorage) so server-side route handlers
 * can read it via createServerClient + auth.getUser().
 *
 * Row-level security enforces tenant isolation — the anon key alone
 * grants no access; JWT claims (kora_role, tenant_id) must be present.
 *
 * Throws if env vars are not configured — this is intentional:
 * LIVE features must not silently degrade to demo data.
 */
export function getSupabaseBrowserClient(): ReturnType<typeof createBrowserClient<Database>> {
  if (_client) return _client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error(
      '[KORA] Supabase env vars not configured. ' +
      'Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local. ' +
      'Do NOT fallback to demo seed data in LIVE mode.',
    );
  }

  _client = createBrowserClient<Database>(url, key);

  return _client;
}
