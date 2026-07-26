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
 * Service-role client — bypasses RLS entirely (not just its own row checks —
 * every policy on every table, for every query made with this client).
 * NEVER expose the service role key to the browser.
 *
 * PILOT-TRUST-01 (F-02): running inside a Next.js Server Component or Route
 * Handler is NOT, by itself, a safe reason to reach for this client. A server
 * component still executes on behalf of one specific signed-in user — the
 * correct default for a page that reads/writes that user's own or their
 * tenant's data is {@link getSupabaseServerClient}, which forwards the real
 * session and lets Postgres RLS do the actual authorization. "Server-side" is
 * not a synonym for "trusted to bypass RLS" — it only means the service key
 * *can* be used here without leaking to a browser; whether it *should* be is
 * a separate question, and the answer is almost always no for a page a
 * signed-in worker/company/partner user is looking at.
 *
 * ALLOWED here (see tests/unit/pilot-trust-01-service-role-guard.test.ts for
 * the enforced allowlist):
 *   - KORA_ADMIN-only admin workspace pages/routes (app/admin/**, app/api/admin/**)
 *     — internal operator tooling, not a tenant-facing self-service surface.
 *   - Documented server-only utilities: audit log writes, batch/pipeline
 *     persistence (e.g. scoring results), private Storage bucket signed URLs,
 *     Supabase Auth Admin API calls (auth.users administration has no RLS
 *     equivalent), worker/company provisioning.
 *   - A structurally-justified public/anonymous route with no session at all
 *     to key an RLS policy off (e.g. a hashed-token share link) — narrow and
 *     rare, must be individually justified, not a default escape hatch.
 *
 * FORBIDDEN here:
 *   - Any page a WORKER, COMPANY_ADMIN/COMPANY_VIEWER, or PARTNER reaches as
 *     their own workspace/self-service surface. If a query returns nothing
 *     under the session client because a policy is missing, the fix is a new,
 *     narrowly-scoped RLS policy (a real migration, reviewed and tested) —
 *     never reaching for this client to route around the gap.
 *
 * If you're unsure which one to use: start with getSupabaseServerClient(). If
 * a query legitimately returns fewer rows than expected, that is RLS working
 * — go add the missing policy, don't swap clients.
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
