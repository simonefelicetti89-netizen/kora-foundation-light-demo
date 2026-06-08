// app/auth/callback/route.ts
// Supabase PKCE auth callback — exchanges auth code for a session.
//
// Called when a company user clicks an invite or recovery email link.
// Supabase verifies the OTP server-side, then redirects here with ?code=xxx.
// Errors (expired/invalid token) arrive as ?error=...&error_description=...
//
// After successful code exchange the session cookie is set and the user is
// redirected to /company/setup-password to create their password.
//
// This route must be publicly reachable (no session required on entry).

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);

  const code             = searchParams.get('code');
  const error            = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  // Supabase sent an error (e.g. expired invite token)
  if (error) {
    const params = new URLSearchParams({ error });
    if (errorDescription) params.set('error_description', errorDescription);
    return NextResponse.redirect(new URL(`/company/setup-password?${params}`, origin));
  }

  // No code and no error — unexpected state, send to login
  if (!code) {
    return NextResponse.redirect(new URL('/admin/login?error=missing_auth_code', origin));
  }

  // Exchange the PKCE code for a session (sets session cookies via cookie store)
  const supabase = await getSupabaseServerClient();
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError) {
    const params = new URLSearchParams({
      error:             'exchange_failed',
      error_description: exchangeError.message,
    });
    return NextResponse.redirect(new URL(`/company/setup-password?${params}`, origin));
  }

  // Session established — redirect to password setup
  return NextResponse.redirect(new URL('/company/setup-password', origin));
}
