// app/auth/callback/route.ts
// Supabase auth callback — the single completion path for invite and recovery links.
//
// Two entry forms establish the session here:
//   ?token_hash=…&type=invite|recovery — the link in the KORA email templates
//     (supabase/templates). Verified server-side with verifyOtp; works from any
//     browser because no PKCE verifier is involved.
//   ?code=… — PKCE exchange (resetPasswordForEmail from the browser).
// Errors (expired/invalid token) arrive as ?error=...&error_description=...
//
// type=recovery (password reset flow) → /auth/reset-password
// type=invite (first-time setup)      → role-specific setup-password page
//                                       (PARTNER: /auth/reset-password, Founder decision 2026-10-10)
//
// Every redirect is a fixed path on the request's own origin; no caller-supplied
// destination (next=…) is honoured.
//
// This route must be publicly reachable (no session required on entry).
// B117: Fallback errors route to /login (unified entry), not /company/login.

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';

const OTP_TYPES = ['invite', 'recovery'] as const;
type OtpType = (typeof OTP_TYPES)[number];

function isOtpType(value: string | null): value is OtpType {
  return (OTP_TYPES as readonly string[]).includes(value ?? '');
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);

  const code             = searchParams.get('code');
  const tokenHash        = searchParams.get('token_hash');
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

  // No code, no token_hash and no error — unexpected state, send to unified login
  if (!code && !tokenHash) {
    return NextResponse.redirect(new URL('/login?error=missing_auth_code', origin));
  }

  // A token_hash is only accepted for the two link types KORA sends.
  if (tokenHash && !isOtpType(type)) {
    return NextResponse.redirect(new URL('/login?error=unsupported_link_type', origin));
  }

  // Establish the session (sets session cookies via cookie store)
  const supabase = await getSupabaseServerClient();
  const { error: exchangeError } = tokenHash
    ? await supabase.auth.verifyOtp({ type: type as OtpType, token_hash: tokenHash })
    : await supabase.auth.exchangeCodeForSession(code as string);

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

  // PARTNER → initial password on the shared reset page, which sends the user
  // to getRoleHome('PARTNER') = /partner/workspace after success.
  if (koraRole === 'PARTNER') {
    return NextResponse.redirect(new URL('/auth/reset-password', origin));
  }

  // CC-00 DEMO_VIEWER role retirement (2026-09-26): the former "B129:
  // DEMO_VIEWER invite → demo home" branch is removed, not replaced. A
  // legacy account still carrying kora_role = 'DEMO_VIEWER' now falls
  // through to the same unknown-role branch below.

  // Unknown role or KORA_ADMIN invite → unified login
  return NextResponse.redirect(new URL('/login', origin));
}
