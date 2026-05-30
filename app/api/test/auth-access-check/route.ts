// app/api/test/auth-access-check/route.ts
// DEV/TEST ONLY — remove or isolate before production.
// Uses service_role server-side. Never expose in production.
//
// Validates session-based access control for /api/admin/operator-flow:
//   1. KORA_ADMIN login → operator-flow GET returns 200
//   2. COMPANY_ADMIN login → operator-flow GET returns 403
//   3. No session → operator-flow GET returns 401
//
// Does NOT print passwords, tokens, or secrets.
// Uses signInWithPassword with KORA_TEST_USER_PASSWORD env var.
//
// Protection:
//   1. Returns 404 in NODE_ENV === 'production'.
//   2. Requires header x-kora-test-secret.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/types';
import { testRouteGuard } from '@/lib/auth/test-route-guard';

const SUPABASE_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

interface AccessCase {
  scenario: string;
  email:    string;
  expected: number;
  actual:   number;
  pass:     boolean;
  detail:   string;
}

// Sign in and return access token — not printed in response.
async function signInAndGetToken(email: string, password: string): Promise<string | null> {
  const client = createClient<Database>(SUPABASE_URL, SUPABASE_ANON, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.session) return null;
  return data.session.access_token;
}

// Call operator-flow GET with optional Authorization header.
async function callOperatorFlow(token: string | null, baseUrl: string): Promise<number> {
  const url = `${baseUrl}/api/admin/operator-flow?tenantCode=OP-001&reportingPeriod=2026-Q1`;
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(url, { headers });
  return res.status;
}

export async function GET(request: NextRequest) {
  const blocked = testRouteGuard(request);
  if (blocked) return blocked;


  const testPassword = process.env.KORA_TEST_USER_PASSWORD;
  if (!testPassword) {
    return NextResponse.json({ error: 'KORA_TEST_USER_PASSWORD not set' }, { status: 400 });
  }

  const baseUrl = new URL(request.url).origin;
  const cases: AccessCase[] = [];

  // ── Case 1: KORA_ADMIN — should be allowed (200) ─────────────────────────────

  {
    const token = await signInAndGetToken('kora-admin@example.test', testPassword);
    const status = await callOperatorFlow(token, baseUrl);
    cases.push({
      scenario: 'KORA_ADMIN login → operator-flow GET',
      email:    'kora-admin@example.test',
      expected: 200,
      actual:   status,
      pass:     status === 200,
      detail:   token ? 'signed in, sent Authorization header' : 'sign-in failed',
    });
  }

  // ── Case 2: COMPANY_ADMIN — should be denied (403) ────────────────────────────

  {
    const token = await signInAndGetToken('company-admin-a@example.test', testPassword);
    const status = await callOperatorFlow(token, baseUrl);
    cases.push({
      scenario: 'COMPANY_ADMIN login → operator-flow GET',
      email:    'company-admin-a@example.test',
      expected: 403,
      actual:   status,
      pass:     status === 403,
      detail:   token ? 'signed in, wrong role → 403 expected' : 'sign-in failed',
    });
  }

  // ── Case 3: No session, no secret → 401 ────────────────────────────────────

  {
    const status = await callOperatorFlow(null, baseUrl);
    cases.push({
      scenario: 'No session, no secret → operator-flow GET',
      email:    '(none)',
      expected: 401,
      actual:   status,
      pass:     status === 401,
      detail:   'unauthenticated request',
    });
  }

  // ── Case 4: COMPANY_ADMIN B — also denied ────────────────────────────────────

  {
    const token = await signInAndGetToken('company-admin-b@example.test', testPassword);
    const status = await callOperatorFlow(token, baseUrl);
    cases.push({
      scenario: 'COMPANY_ADMIN_B login → operator-flow GET',
      email:    'company-admin-b@example.test',
      expected: 403,
      actual:   status,
      pass:     status === 403,
      detail:   token ? 'signed in, wrong role → 403 expected' : 'sign-in failed',
    });
  }

  const allPass = cases.every(c => c.pass);
  return NextResponse.json({
    ok:      allPass,
    verdict: allPass ? 'PASS' : 'FAIL',
    summary: { total: cases.length, pass: cases.filter(c => c.pass).length, fail: cases.filter(c => !c.pass).length },
    cases,
    synthetic_test: true,
  }, { status: allPass ? 200 : 422 });
}
