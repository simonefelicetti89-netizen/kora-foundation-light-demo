// lib/security/origin.ts — SECURITY-ORIGIN-GUARD-03
//
// Origin guard for cookie/session-based mutating API routes.
//
// Threat model: a state-changing request riding on the browser's ambient
// Supabase session cookie, forged from a page on a different origin
// (classic CSRF). Real browsers always attach an Origin header to
// cross-site POST/PUT/PATCH/DELETE requests — fetch, XHR, and even simple
// <form> submissions all set it — so rejecting a present-but-mismatched
// Origin is sufficient to stop that attack; there is no need to also
// reject requests where Origin is absent (see checkOrigin below).
//
// Requests authenticated via `Authorization: Bearer <token>` are exempt:
// a cross-site page cannot make the victim's browser attach that header —
// it is never sent ambiently the way cookies are — so it carries no CSRF
// risk regardless of Origin. Every route in this codebase that accepts a
// browser session (requireWorkerUser / requireCompanyUser / requireKoraAdmin
// / requirePartnerUser / getCurrentWorkerUser) also accepts this header as
// an alternative — see lib/auth/kora-session.ts `resolveUser()` — so
// exempting it here does not weaken those routes; it only avoids blocking
// the programmatic/test call path they already support.
//
// This guard is defense-in-depth. It does not replace, and must never be
// treated as replacing, session authentication, role authorization, RLS,
// or SameSite cookies — see docs/SECURITY_ORIGIN_GUARD_03.md.

import { NextResponse, type NextRequest } from 'next/server';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

function normalizeOrigin(raw: string): string | null {
  try {
    const url = new URL(raw);
    return `${url.protocol}//${url.host}`.toLowerCase();
  } catch {
    return null;
  }
}

// Allowed origins are derived only from sources already trusted elsewhere
// in this codebase — no invented domains, no wildcards.
function allowedOrigins(request: NextRequest): Set<string> {
  const origins = new Set<string>();

  // The origin this request itself arrived on. Next.js resolves
  // request.nextUrl from the actual Host (and, on reverse-proxy
  // deployments such as Vercel, X-Forwarded-Host/Proto) — the same
  // resolution already relied on elsewhere in this codebase for building
  // redirect and callback URLs (e.g. middleware.ts, auth callback route).
  // This makes the guard adapt automatically to production, staging, local
  // dev, and any preview deployment without extra configuration.
  const selfOrigin = normalizeOrigin(request.nextUrl.origin);
  if (selfOrigin) origins.add(selfOrigin);

  // The canonical app URL — already used across the codebase (e.g.
  // app/api/admin/workers/bulk-provision/route.ts, lib/worker-cv/share-token.ts)
  // for building absolute links. Documented in .env.local.example.
  // Covers deployments where the public URL legitimately differs from what
  // Next.js sees internally.
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (configured) {
    const normalized = normalizeOrigin(configured);
    if (normalized) origins.add(normalized);
  }

  return origins;
}

export type OriginCheckReason =
  | 'safe_method'
  | 'bearer_auth'
  | 'no_origin_header'
  | 'origin_allowed'
  | 'origin_denied'
  | 'origin_malformed';

export interface OriginCheckResult {
  allowed: boolean;
  reason: OriginCheckReason;
}

// Pure decision function — no Response construction, safe to unit test
// directly with a plain NextRequest.
export function checkOrigin(request: NextRequest): OriginCheckResult {
  if (SAFE_METHODS.has(request.method)) {
    return { allowed: true, reason: 'safe_method' };
  }

  // Non-ambient credential — see threat model note above.
  const authHeader = request.headers.get('authorization');
  if (authHeader?.toLowerCase().startsWith('bearer ')) {
    return { allowed: true, reason: 'bearer_auth' };
  }

  const origin = request.headers.get('origin');

  // Absent Origin: real browser-driven CSRF attempts always carry one.
  // Absence means a non-browser caller (curl, internal tooling, some test
  // harnesses) that is already gated by the route's own session/bearer
  // check. Documented policy: allow, do not reject — see
  // docs/SECURITY_ORIGIN_GUARD_03.md "Comportamento con Origin assente".
  if (!origin) {
    return { allowed: true, reason: 'no_origin_header' };
  }

  const normalized = normalizeOrigin(origin);
  if (!normalized) {
    // Present but unparseable (e.g. "null", garbage, credentials-in-URL
    // tricks) — cannot be validated, so it is rejected rather than
    // silently accepted or silently treated as absent.
    return { allowed: false, reason: 'origin_malformed' };
  }

  if (allowedOrigins(request).has(normalized)) {
    return { allowed: true, reason: 'origin_allowed' };
  }

  return { allowed: false, reason: 'origin_denied' };
}

// Route-level guard clause — mirrors the isKoraAuthError(requireXUser())
// pattern already used across app/api/**: call first, return immediately
// if it yields a Response, otherwise proceed. Never logs the Origin
// header, cookies, tokens, or any other request detail.
export function assertSameOrigin(request: NextRequest): NextResponse | null {
  const result = checkOrigin(request);
  if (result.allowed) return null;

  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}
