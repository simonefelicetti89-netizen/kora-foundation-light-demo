// ─── KORA Supabase Server Client ──────────────────────────────────────────────
// For Next.js Server Components, API Route Handlers, and Server Actions.
// Handles cookie-based session forwarding via @supabase/ssr.
// ──────────────────────────────────────────────────────────────────────────────
// Phase 2B: Wire this into API routes for server-side scoring persistence.
// Phase 2B: Wire this into audit log writes (service role variant).
// ──────────────────────────────────────────────────────────────────────────────

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from './types';

/**
 * Server-side Supabase client with cookie-based session forwarding.
 * Use in Server Components and Route Handlers.
 * Respects RLS — tenant isolation enforced by JWT claims.
 */
export async function getSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet: Array<{ name: string; value: string; options: CookieOptions }>) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    },
  );
}

/**
 * Service-role client — bypasses RLS.
 * Use ONLY in trusted server contexts: audit log writes, admin batch operations.
 * NEVER expose service role key to the browser.
 */
export function getSupabaseServiceClient() {
  const url  = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key  = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  if (!url || !key) {
    throw new Error(
      '[KORA] Service role key not configured. ' +
      'Set SUPABASE_SERVICE_ROLE_KEY in .env.local (server-only).',
    );
  }

  // NOTE: this runs server-side only — service key never reaches the browser.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { createClient } = require('@supabase/supabase-js') as typeof import('@supabase/supabase-js');
  return createClient<Database>(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// ── ServiceDb type ────────────────────────────────────────────────────────────
// Typed alias for the service-role client. Replaces blanket `as any` casts so
// multi-schema .schema() calls keep compile-time awareness of the Database type.
// Individual query result casts may still be needed for complex join selects —
// those are narrowed at the call site, not at the client level.

import { createClient as _createClientForType } from '@supabase/supabase-js';
export type ServiceDb = ReturnType<typeof _createClientForType<Database>>;
