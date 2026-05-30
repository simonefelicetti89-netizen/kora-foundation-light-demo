// lib/auth/test-route-guard.ts
// Centralized triple-gate guard for all /api/test/* routes.
//
// Gate 1 — Production block:
//   NODE_ENV === 'production' → 404 unconditionally.
//   Test routes must never be reachable in production, regardless of any other flag.
//
// Gate 2 — Explicit opt-in flag:
//   KORA_ENABLE_TEST_ROUTES !== 'true' → 404.
//   Even in dev/staging, test routes require an explicit env flag.
//   This prevents accidental access in preview environments without the flag.
//   Set KORA_ENABLE_TEST_ROUTES=true in .env.local only — never in Vercel production.
//
// Gate 3 — Shared secret:
//   x-kora-test-secret header must match KORA_TEST_SEED_SECRET env var → 401 if wrong.
//
// Returns:
//   NextResponse  → caller should return it immediately (blocked)
//   null          → all gates passed, request is allowed

import { type NextRequest, NextResponse } from 'next/server';

export function testRouteGuard(request: NextRequest): NextResponse | null {
  // Gate 1: always block in production
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // Gate 2: require explicit opt-in flag (prevents access in staging/preview without flag)
  if (process.env.KORA_ENABLE_TEST_ROUTES !== 'true') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // Gate 3: shared secret header
  const clientSecret = request.headers.get('x-kora-test-secret');
  if (!clientSecret || clientSecret !== process.env.KORA_TEST_SEED_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return null; // all gates passed
}
