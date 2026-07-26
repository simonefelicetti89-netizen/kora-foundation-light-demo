// app/api/health/route.ts
// PILOT-TRUST-01 (F-08) — health endpoint for the live golden path.
//
// Public, unauthenticated, GET-only. Returns a minimal, non-sensitive status
// so an operator or a smoke test can confirm the app is up and the database
// is reachable, without exposing anything about schema, tenants, users, or
// secrets.
//
// DB check design: uses the ordinary (anon-level, no session) server client
// — never the service-role client — and issues one trivial, read-only,
// limit(1) select against a non-sensitive table. supabase-js/postgrest-js
// resolves normally (with a populated `error` field) for permission-denied
// or similar HTTP-level responses; it only throws for an actual network/
// connection failure. So "the call resolved without throwing" is proof the
// database round-trip itself succeeded — regardless of whether the anon
// role is granted any rows back — which is exactly "reachable", not
// "authorized". No tenant data is read or returned to the caller either way.

import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';

// Never cache — every hit must make a real round-trip to the database, or
// this endpoint could keep reporting "reachable" from a stale cached
// response after the database actually goes down.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const DB_CHECK_TIMEOUT_MS = 3000;

function timeout(ms: number): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error('db check timed out')), ms);
  });
}

async function isDatabaseReachable(): Promise<boolean> {
  try {
    const supabase = await getSupabaseServerClient();
    await Promise.race([
      supabase.schema('analytics').from('tenant').select('id').limit(1),
      timeout(DB_CHECK_TIMEOUT_MS),
    ]);
    return true;
  } catch {
    return false;
  }
}

export async function GET() {
  const timestamp = new Date().toISOString();
  const reachable = await isDatabaseReachable();

  if (reachable) {
    return NextResponse.json(
      { status: 'ok', service: 'kora', database: 'reachable', timestamp },
      { status: 200 },
    );
  }

  return NextResponse.json(
    { status: 'error', service: 'kora', database: 'unreachable', timestamp },
    { status: 503 },
  );
}
