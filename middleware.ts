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
//
// ROBUSTNESS: never throws — safe for Vercel deploys where env vars may not
// yet be configured, preview environments, and edge cases where the Supabase
// auth service is temporarily unreachable.

import { createServerClient } from '@supabase/ssr';
import { type NextRequest, NextResponse } from 'next/server';

export async function middleware(request: NextRequest) {
  // Guard: if Supabase env vars are not configured (fresh Vercel deploy,
  // preview environment, staging without env), skip session refresh and
  // pass through. Never crash — route-level auth still handles authorization.
  const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnon) {
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });

  try {
    const supabase = createServerClient(supabaseUrl, supabaseAnon, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    });

    // IMPORTANT: do not remove — this refreshes the access token when expired.
    // The return value is not used; the side effect (cookie update) is what matters.
    await supabase.auth.getUser();
  } catch {
    // Session refresh failed — pass through without crashing.
    // Route-level requireKoraAdmin() handles auth; a failed refresh just means
    // the user may need to re-login on the next protected request.
    return NextResponse.next({ request });
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    // Run on all paths except Next.js internals and static assets.
    // Explicitly excludes: _next/static, _next/image, _next/data,
    // favicon.ico, and common static file extensions.
    '/((?!_next/static|_next/image|_next/data|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff2?)$).*)',
  ],
};
