// middleware.ts — Supabase SSR session refresh + B36.1 company user route protection
//
// Purpose:
//   1. Refresh the Supabase session cookie so auth.getUser() stays valid server-side.
//   2. Redirect authenticated COMPANY_ADMIN/VIEWER to /company/workspace if they
//      attempt to access any path outside their allowed set (demo routes, admin tools,
//      future-vision, landing page). This enforces product mode separation so real
//      company tenants never reach synthetic demo pages.
//
// Route-level fine-grained auth is in lib/auth/kora-session.ts.
// KORA_ADMIN routes have their own requireKoraAdmin() checks — not blocked here.
//
// ROBUSTNESS: never throws — safe for Vercel deploys without env vars configured.

import { createServerClient } from '@supabase/ssr';
import { type NextRequest, NextResponse } from 'next/server';

// Paths that authenticated company users are allowed to access.
// B59: intelligence pages added so real sessions reach live-enabled pages.
// All other paths still redirect to /company/workspace.
const COMPANY_ALLOWED_PREFIXES = [
  '/company/workspace',   // live workspace — full server-auth, Supabase-backed
  '/company/kora-index',  // live intelligence — shows real KORA Index when session present
  '/company/activation',  // live intelligence — shows real activation data
  '/company/pillars',     // live intelligence — shows real pillar distribution
  '/company/financial',   // live intelligence — shows real BTI data
  '/company/reports',     // live intelligence — shows real Decision Pack status
  '/api/',                // all API routes (have own auth)
  '/_next',              // Next.js internals
  '/admin/login',        // login page (needed if session expires)
];

export async function middleware(request: NextRequest) {
  const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnon) {
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });
  let sessionKoraRole: string | undefined;

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

    // IMPORTANT: do not remove — refreshes access token as side effect.
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      const appMeta = user.app_metadata as Record<string, unknown> | undefined;
      sessionKoraRole = appMeta?.kora_role as string | undefined;
    }
  } catch {
    // Session refresh failed — pass through. Route-level auth handles authorization.
    return NextResponse.next({ request });
  }

  // B36.1: Redirect authenticated company users away from demo/admin/future-vision paths.
  // Only applies to users with a real Supabase session — demo-state users (no session)
  // are unaffected and can still access synthetic demo routes.
  const isRealCompanyUser =
    sessionKoraRole === 'COMPANY_ADMIN' || sessionKoraRole === 'COMPANY_VIEWER';

  if (isRealCompanyUser) {
    const pathname = request.nextUrl.pathname;
    const isAllowed = COMPANY_ALLOWED_PREFIXES.some((prefix) => pathname.startsWith(prefix));

    if (!isAllowed) {
      return NextResponse.redirect(new URL('/company/workspace', request.url));
    }
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
