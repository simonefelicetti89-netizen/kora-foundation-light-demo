// ─── KORA Supabase Browser Client ─────────────────────────────────────────────
// Used by useScoringResult() and other client components for LIVE fetches.
// Only instantiated when environment === "live" — never touches demo seed data.
// ──────────────────────────────────────────────────────────────────────────────

import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Singleton to avoid creating a new client on every render.
let _client: ReturnType<typeof createClient<Database>> | null = null;

/**
 * Returns a browser-safe Supabase client scoped to the anon key.
 * Row-level security enforces tenant isolation — the anon key alone
 * grants no access; JWT claims (kora_role, tenant_id) must be present.
 *
 * Throws if env vars are not configured — this is intentional:
 * LIVE features must not silently degrade to demo data.
 */
export function getSupabaseBrowserClient(): ReturnType<typeof createClient<Database>> {
  if (_client) return _client;

  const url  = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key  = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error(
      '[KORA] Supabase env vars not configured. ' +
      'Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local. ' +
      'Do NOT fallback to demo seed data in LIVE mode.',
    );
  }

  _client = createClient<Database>(url, key, {
    auth: { persistSession: true, autoRefreshToken: true },
  });

  return _client;
}
