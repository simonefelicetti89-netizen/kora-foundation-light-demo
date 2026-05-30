// lib/auth/kora-session.ts
// Server-side session and role helper for KORA_ADMIN access control.
//
// Authorization rules:
//   - kora_role is read ONLY from user.app_metadata (server-controlled, Admin API only)
//   - user_metadata is NEVER used for authorization
//   - Session is validated server-side via supabase.auth.getUser() — cannot be spoofed
//   - service_role is NOT used to validate the current user session
//
// Supported auth paths:
//   1. Cookie-based session: populated by middleware token refresh (browser flow)
//   2. Authorization header: Bearer <access_token> (programmatic API clients, testing)

import { getSupabaseServerClient } from '@/lib/supabase/server';
import { NextResponse, type NextRequest } from 'next/server';
import type { User } from '@supabase/supabase-js';

// ── KoraUser — the authenticated + authorized operator ────────────────────────

export interface KoraUser {
  id: string;
  email: string;
  koraRole: 'KORA_ADMIN';
}

// ── Internal: resolve Supabase user from request ──────────────────────────────

async function resolveUser(request?: NextRequest): Promise<User | null> {
  const supabase = await getSupabaseServerClient();

  // Primary: cookie-based session (populated by middleware refresh)
  const { data: { user: cookieUser } } = await supabase.auth.getUser();
  if (cookieUser) return cookieUser;

  // Secondary: Authorization: Bearer <token> (for programmatic clients and tests)
  if (request) {
    const authHeader = request.headers.get('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      const { data: { user: headerUser } } = await supabase.auth.getUser(token);
      if (headerUser) return headerUser;
    }
  }

  return null;
}

// ── getCurrentKoraUser — returns user + role or null (no redirect/throw) ─────

export async function getCurrentKoraUser(request?: NextRequest): Promise<KoraUser | null> {
  const user = await resolveUser(request);
  if (!user) return null;

  const appMeta = user.app_metadata as Record<string, unknown> | undefined;
  const koraRole = appMeta?.kora_role as string | undefined;
  if (!koraRole) return null;

  return { id: user.id, email: user.email ?? '', koraRole: koraRole as 'KORA_ADMIN' };
}

// ── requireKoraAdmin — returns KoraUser or a 401/403 NextResponse ─────────────
//
// Usage in route handlers:
//   const auth = await requireKoraAdmin(request);
//   if (isKoraAuthError(auth)) return auth;
//   // auth.koraRole === 'KORA_ADMIN', safe to proceed

export async function requireKoraAdmin(request?: NextRequest): Promise<KoraUser | NextResponse> {
  const user = await resolveUser(request);

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Authorization from app_metadata ONLY — never user_metadata
  const appMeta = user.app_metadata as Record<string, unknown> | undefined;
  const koraRole = appMeta?.kora_role as string | undefined;

  if (koraRole !== 'KORA_ADMIN') {
    return NextResponse.json(
      { error: 'Forbidden — KORA_ADMIN role required', role_found: koraRole ?? 'none' },
      { status: 403 },
    );
  }

  return { id: user.id, email: user.email ?? '', koraRole: 'KORA_ADMIN' };
}

// ── Type guard — distinguish error response from authorized user ──────────────

export function isKoraAuthError(value: KoraUser | NextResponse): value is NextResponse {
  return value instanceof NextResponse;
}
