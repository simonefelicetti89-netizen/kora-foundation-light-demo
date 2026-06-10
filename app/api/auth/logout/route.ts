// app/api/auth/logout/route.ts
// Logout endpoint — signs out the current Supabase session and redirects to login.
// Clears session cookies via createServerClient (same mechanism as middleware).
// Role-aware redirect: KORA_ADMIN → /admin/login, all others → /company/login.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  const supabase = await getSupabaseServerClient();

  // Read role BEFORE signing out — session is gone after signOut.
  const { data: { user } } = await supabase.auth.getUser();
  const koraRole = user?.app_metadata?.kora_role as string | undefined;

  await supabase.auth.signOut();

  const redirectPath = koraRole === 'KORA_ADMIN' ? '/admin/login' : '/company/login';
  return NextResponse.redirect(new URL(redirectPath, request.url));
}
