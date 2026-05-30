// app/api/auth/logout/route.ts
// Logout endpoint — signs out the current Supabase session and redirects to login.
// Clears session cookies via createServerClient (same mechanism as middleware).

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  const supabase = await getSupabaseServerClient();
  await supabase.auth.signOut();

  const loginUrl = new URL('/admin/login', request.url);
  return NextResponse.redirect(loginUrl);
}
