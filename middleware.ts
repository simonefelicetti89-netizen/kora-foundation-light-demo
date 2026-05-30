// middleware.ts — Supabase SSR session token refresh
//
// Purpose: refresh the Supabase session cookie on every request so that
// auth.getUser() in server components and route handlers returns a valid session.
//
// This middleware does NOT block any routes.
// Route-level access control is in lib/auth/kora-session.ts (requireKoraAdmin).
// /admin/* UI pages use the existing demo role switcher — not blocked here.
//
// Required by @supabase/ssr: without this, access tokens expire and
// server-side auth.getUser() returns null even for logged-in users.

import { createServerClient } from '@supabase/ssr';
import { type NextRequest, NextResponse } from 'next/server';

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Write updated cookies to both the request (for downstream middleware)
          // and the response (so the browser receives the refreshed token).
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // IMPORTANT: do not remove — this refreshes the access token when expired.
  // The return value is not used here; the side effect (cookie refresh) is what matters.
  await supabase.auth.getUser();

  return supabaseResponse;
}

export const config = {
  matcher: [
    // Run on all routes except static assets and Next.js internals.
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
