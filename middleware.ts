// middleware.ts — Supabase SSR session refresh + role-based route protection
//
// Purpose:
//   1. Refresh the Supabase session cookie so auth.getUser() stays valid server-side.
//   2. Redirect authenticated COMPANY_ADMIN/VIEWER to /company/workspace if they
//      attempt to access any path outside their allowed set (demo routes, admin tools,
//      future-vision, landing page). This enforces product mode separation so real
//      company tenants never reach synthetic demo pages.
//   3. B104: Redirect authenticated WORKER users to /worker/workspace if they attempt
//      to access admin or company paths. Workers are confined to /worker/* only.
//   4. B168-P3: KORA_ADMIN is blocked from /worker/* paths (defense in depth layer 1).
//      Worker-individual data is off-limits regardless of environment.
//
// Route-level fine-grained auth is in lib/auth/kora-session.ts.
// Access matrix: lib/auth/access-matrix.ts — canAccess() is the authoritative source.
//
// ROBUSTNESS: never throws — safe for Vercel deploys without env vars configured.

import { createServerClient } from '@supabase/ssr';
import { type NextRequest, NextResponse } from 'next/server';
import { canAccess } from '@/lib/auth/access-matrix';

// Paths that authenticated COMPANY_ADMIN users are allowed to access.
// B59: intelligence pages added so real sessions reach live-enabled pages.
// B147: added all sidebar-linked pages missing from this list (routing bug fix).
// Any /company/* path NOT listed here redirects to /company/workspace.
// Intentionally absent: /company/scoring, /company/ingestion, /company/uef-review
//   (operator-only tools — COMPANY_ADMIN should not reach them directly).
const COMPANY_ALLOWED_PREFIXES = [
  '/company',                // root = Executive Cockpit home — must be listed explicitly
  '/company/workspace',      // live workspace — full server-auth, Supabase-backed
  '/company/kora-index',     // live intelligence — shows real KORA Index when session present
  '/company/activation',     // live intelligence — shows real activation data
  '/company/pillars',        // live intelligence — shows real pillar distribution
  '/company/financial',      // live intelligence — shows real BTI data
  '/company/reports',        // live intelligence — shows real Decision Pack status
  '/company/status',         // live status center — readiness and submission tracking
  '/company/data',           // Stato Dati — live data quality status
  '/company/opportunities',  // Opportunità — locked shell (module not yet active)
  '/company/contribution',   // Contribution — locked shell (companion indicator)
  '/company/commons',        // KORA Space — real Commons function (migration 013)
  '/company/profile',        // Profilo & Stato — live tenant metadata
  '/company/wallboard',      // KORA Wallboard — live display
  '/company/onboarding',     // Onboarding Room — reached from Status Center / boundary notices
  '/company/login',          // company login page — for re-authentication after session expiry
  '/company/setup-password', // invite flow — set password after accepting KORA invite
  '/auth/',                  // all auth routes (callback, reset-password, forgot-password) — session may be active during recovery flow
  '/login',                  // unified login page — accessible after session expiry
  '/request-access',         // B119: public informational page — no account creation
  '/api/',                   // all API routes (have own auth)
  '/_next',                  // Next.js internals
];

// B104: Paths that authenticated worker users are allowed to access.
// Workers are confined to their private /worker/* space only.
// B113-B: /worker/login is the dedicated worker re-auth endpoint — /company/login removed.
// B126: /cv/share/ is a public CV share view — workers must be able to access it
//   (e.g., to preview their own shared link) without being redirected to /worker/workspace.
//
// NOTE: /my-kora/ is intentionally absent from this list.
//   My KORA is PREVIEW-only in Foundation Light: its pages use demo-state role switching,
//   not a live Supabase JWT. An authenticated WORKER user who navigates to /my-kora/ is
//   correctly redirected to /worker/workspace by this middleware.
//   Pilot+: when My KORA is promoted to live, add /my-kora/ here and update
//   WorkerSessionProvider to detect the live Supabase WORKER session instead of demo-state.
const WORKER_ALLOWED_PREFIXES = [
  '/worker/',                // worker private space (includes /worker/login)
  '/cv/share/',              // public CV share view — B126 (no auth required)
  '/auth/',                  // all auth routes (callback, reset-password, forgot-password)
  '/login',                  // unified login — accessible after session expiry
  '/request-access',         // B119: public informational page — no account creation
  '/api/',                   // all API routes (have own requireWorkerUser auth)
  '/_next',
];

// B127: Paths that authenticated PARTNER users are allowed to access.
// Partners are confined to /partner/* only — cannot access admin, company, or worker routes.
const PARTNER_ALLOWED_PREFIXES = [
  '/partner/',               // partner workspace — /partner/workspace, /partner/ demo
  '/account',                // account page — accessible to all authenticated roles
  '/auth/',                  // all auth routes (callback, reset-password, forgot-password)
  '/login',                  // unified login — accessible after session expiry
  '/request-access',         // public informational page
  '/api/',                   // all API routes (have own requirePartnerUser auth)
  '/_next',
];

// B129: Paths that authenticated DEMO_VIEWER users are allowed to access.
// Defense in depth: middleware blocks live routes before API guards run.
// DEMO_VIEWER has no path to live API routes from the middleware layer.
// Future demo-specific API routes must use /api/demo/* (not yet in Fase 1).
// /auth/ covers the Supabase PKCE callback (/auth/callback) and reset flow —
// all auth calls hit Supabase's external server directly, not local /api/* routes.
const DEMO_VIEWER_ALLOWED_PREFIXES = [
  '/demo/',                  // demo area — synth-only, DEMO_VIEWER home
  '/login',                  // unified login — accessible after session expiry
  '/auth/',                  // Supabase callback + reset-password (PKCE flow)
  '/_next',                  // Next.js internals
  '/request-access',         // public informational page
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

  // B117-E: Root landing '/' is always public — never role-redirected.
  // startsWith('/') would match every path, so exact match is required here.
  // /demo-guide and /pilot remain restricted to unauthenticated/demo users (by design).
  const pathname = request.nextUrl.pathname;
  if (pathname === '/') {
    return supabaseResponse;
  }

  // B168-P3: Block KORA_ADMIN from worker-individual paths — defense in depth layer 1.
  // canAccess() returns DENY for KORA_ADMIN on worker-individual in ALL environments.
  // This is the middleware layer; worker layout and RLS provide layers 2 and 3.
  const isKoraAdmin = sessionKoraRole === 'KORA_ADMIN';
  if (isKoraAdmin) {
    const workerIndividualPrefixes = ['/worker/'];
    const isWorkerPath = workerIndividualPrefixes.some((p) => pathname.startsWith(p));
    if (isWorkerPath) {
      const decision = canAccess('KORA_ADMIN', 'worker_individual_pib', 'live');
      if (!decision.allowed) {
        const url = new URL('/admin', request.url);
        url.searchParams.set('blocked', 'worker_individual_access_denied');
        return NextResponse.redirect(url);
      }
    }
  }

  // B36.1: Redirect authenticated company users away from demo/admin/future-vision paths.
  // Only applies to users with a real Supabase session — demo-state users (no session)
  // are unaffected and can still access synthetic demo routes.
  // B143: COMPANY_VIEWER removed — only COMPANY_ADMIN is a real company user.
  const isRealCompanyUser = sessionKoraRole === 'COMPANY_ADMIN';

  if (isRealCompanyUser) {
    const isAllowed = COMPANY_ALLOWED_PREFIXES.some((prefix) => pathname.startsWith(prefix));

    if (!isAllowed) {
      return NextResponse.redirect(new URL('/company/workspace', request.url));
    }
  }

  // B104: Redirect authenticated workers away from admin/company paths.
  // Workers are confined to /worker/* — any other path redirects to their workspace.
  const isRealWorker = sessionKoraRole === 'WORKER';

  if (isRealWorker) {
    const isAllowed = WORKER_ALLOWED_PREFIXES.some((prefix) => pathname.startsWith(prefix));

    if (!isAllowed) {
      return NextResponse.redirect(new URL('/worker/workspace', request.url));
    }
  }

  // B127: Redirect authenticated partners away from admin/company/worker paths.
  // Partners are confined to /partner/* — any other path redirects to their workspace.
  const isRealPartner = sessionKoraRole === 'PARTNER';

  if (isRealPartner) {
    const isAllowed = PARTNER_ALLOWED_PREFIXES.some((prefix) => pathname.startsWith(prefix));

    if (!isAllowed) {
      return NextResponse.redirect(new URL('/partner/workspace', request.url));
    }
  }

  // B129: Redirect authenticated demo viewers away from any live path.
  // DEMO_VIEWER is confined to /demo/* — any other path redirects to /demo.
  // The demo area is synth-only: no live DB queries, no tenant association.
  const isDemoViewer = sessionKoraRole === 'DEMO_VIEWER';

  if (isDemoViewer) {
    const isAllowed = DEMO_VIEWER_ALLOWED_PREFIXES.some((prefix) => pathname.startsWith(prefix));

    if (!isAllowed) {
      return NextResponse.redirect(new URL('/demo', request.url));
    }
  }

  // B168.5-P3: pass pathname to server components so demo guard layouts
  // can build the ?next= redirect URL without needing usePathname (client-only).
  supabaseResponse.headers.set('x-pathname', pathname);
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
