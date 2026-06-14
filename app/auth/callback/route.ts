// app/auth/callback/route.ts
// Supabase PKCE auth callback — exchanges auth code for a session.
//
// Called when a user clicks an invite or password-recovery email link.
// Supabase verifies the OTP server-side, then redirects here with ?code=xxx.
// Errors (expired/invalid token) arrive as ?error=...&error_description=...
//
// type=recovery (password reset flow) → /auth/reset-password
// type=invite (first-time setup)      → role-specific setup-password page
//
// This route must be publicly reachable (no session required on entry).
// B117: Fallback errors route to /login (unified entry), not /company/login.

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);

  const code             = searchParams.get('code');
  const type             = searchParams.get('type');
  const error            = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  // Supabase sent an error (e.g. expired token)
  if (error) {
    const params = new URLSearchParams({ error });
    if (errorDescription) params.set('error_description', errorDescription);
    // Recovery errors go to reset page; invite errors go to unified login with error context
    const target = type === 'recovery'
      ? `/auth/reset-password?${params}`
      : `/login?${params}`;
    return NextResponse.redirect(new URL(target, origin));
  }

  // No code and no error — unexpected state, send to unified login
  if (!code) {
    return NextResponse.redirect(new URL('/login?error=missing_auth_code', origin));
  }

  // Exchange the PKCE code for a session (sets session cookies via cookie store)
  const supabase = await getSupabaseServerClient();
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError) {
    const params = new URLSearchParams({
      error:             'exchange_failed',
      error_description: exchangeError.message,
    });
    const target = type === 'recovery'
      ? `/auth/reset-password?${params}`
      : `/login?${params}`;
    return NextResponse.redirect(new URL(target, origin));
  }

  // Session established — read role to determine destination.
  const { data: { user } } = await supabase.auth.getUser();
  const koraRole = user?.app_metadata?.kora_role as string | undefined;

  // Recovery flow: all roles → /auth/reset-password (role-aware redirect happens there after success)
  if (type === 'recovery') {
    return NextResponse.redirect(new URL('/auth/reset-password', origin));
  }

  // Invite flow: route to role-appropriate first-time setup page
  if (koraRole === 'WORKER') {
    return NextResponse.redirect(new URL('/worker/setup-password', origin));
  }

  // COMPANY_ADMIN → company setup-password (B143: COMPANY_VIEWER removed)
  if (koraRole === 'COMPANY_ADMIN') {
    return NextResponse.redirect(new URL('/company/setup-password', origin));
  }

  // B129: DEMO_VIEWER invite → demo home (no separate setup page needed)
  if (koraRole === 'DEMO_VIEWER') {
    return NextResponse.redirect(new URL('/demo', origin));
  }

  // Unknown role or KORA_ADMIN invite → unified login
  return NextResponse.redirect(new URL('/login', origin));
}
