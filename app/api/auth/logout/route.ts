// app/api/auth/logout/route.ts
// Logout endpoint — signs out the current Supabase session and redirects to login.
// Role-aware redirect:
//   KORA_ADMIN             → /admin/login
//   WORKER                 → /worker/login
//   COMPANY_ADMIN/VIEWER   → /company/login
//   unknown                → /company/login

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  const supabase = await getSupabaseServerClient();

  // Read role BEFORE signing out — session is gone after signOut.
  const { data: { user } } = await supabase.auth.getUser();

  // No active session — logout is idempotent; redirect to default login without calling signOut.
  if (!user) {
    return NextResponse.redirect(new URL('/company/login', request.url));
  }

  const koraRole = user.app_metadata?.kora_role as string | undefined;

  await supabase.auth.signOut();

  const redirectPath =
    koraRole === 'KORA_ADMIN' ? '/admin/login' :
    koraRole === 'WORKER'     ? '/worker/login' :
    '/company/login';
  return NextResponse.redirect(new URL(redirectPath, request.url));
}
