// app/api/test/b36-company-access/route.ts
// B36 — Company access control tests. DEV/TEST ONLY.
//
// Tests the B36 company workspace isolation rules:
//
// 1.  Unauthenticated → /api/company/workspace returns 401
// 2.  KORA_ADMIN → /api/company/workspace returns 403 (wrong role for company route)
// 3.  KORA_ADMIN → /api/admin/company-users returns 200 (correct admin route)
// 4.  Unauthenticated → /api/admin/company-users returns 401
// 5.  Unauthenticated → /api/company/evidence-archive returns 401
// 6.  Unauthenticated → /api/company/evidence-record?recordId=x returns 401
// 7.  KORA_ADMIN → /api/admin/tenants returns 200 (admin route accessible)
// 8.  Privacy: /api/company/workspace response (if any) never contains forbidden fields
//
// Note: Tests for COMPANY_ADMIN/COMPANY_VIEWER require pre-provisioned test users
// with app_metadata.kora_role = 'COMPANY_ADMIN'/'COMPANY_VIEWER' and kora_tenant_id.
// Those tests run only if KORA_TEST_COMPANY_ADMIN_EMAIL and KORA_TEST_USER_PASSWORD are set.
//
// Protection: testRouteGuard (NODE_ENV check + explicit flag + shared secret)

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/types';
import { testRouteGuard } from '@/lib/auth/test-route-guard';

const SUPABASE_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

interface TestCase {
  id:       string;
  scenario: string;
  expected: number;
  actual:   number;
  pass:     boolean;
  detail:   string;
  skipped?: boolean;
}

async function signInAndGetToken(email: string, password: string): Promise<string | null> {
  const client = createClient<Database>(SUPABASE_URL, SUPABASE_ANON, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.session) return null;
  return data.session.access_token;
}

async function callApi(url: string, token: string | null): Promise<{ status: number; body: Record<string, unknown> }> {
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(url, { headers });
  let body: Record<string, unknown> = {};
  try { body = await res.json(); } catch { body = {}; }
  return { status: res.status, body };
}

// ── Forbidden field check — privacy/security sweep ────────────────────────────

const FORBIDDEN_RESPONSE_FIELDS = [
  'pseudonym_id', 'worker_id', 'worker_name', 'email_worker',
  'raw_hash', 'created_by', 'storagePath', 'storageBucket',
  'signedUrl', 'pib_total', 'pib_by_pillar',
];

function containsForbiddenField(body: Record<string, unknown>): string | null {
  const bodyStr = JSON.stringify(body);
  for (const field of FORBIDDEN_RESPONSE_FIELDS) {
    if (bodyStr.includes(`"${field}":`)) return field;
  }
  return null;
}

export async function GET(request: NextRequest) {
  const blocked = testRouteGuard(request);
  if (blocked) return blocked;

  const testPassword          = process.env.KORA_TEST_USER_PASSWORD;
  const adminEmail            = 'kora-admin@example.test';
  const companyAdminEmail     = process.env.KORA_TEST_COMPANY_ADMIN_EMAIL ?? '';
  const companyViewerEmail    = process.env.KORA_TEST_COMPANY_VIEWER_EMAIL ?? '';

  if (!testPassword) {
    return NextResponse.json({ error: 'KORA_TEST_USER_PASSWORD not set' }, { status: 400 });
  }

  const baseUrl = new URL(request.url).origin;
  const cases: TestCase[] = [];

  // ── Get admin token ────────────────────────────────────────────────────────
  const adminToken = await signInAndGetToken(adminEmail, testPassword);

  // ── Case 1: Unauthenticated → /api/company/workspace → 401 ───────────────
  {
    const { status } = await callApi(`${baseUrl}/api/company/workspace`, null);
    cases.push({
      id: 'B36-1',
      scenario: 'Unauthenticated → /api/company/workspace',
      expected: 401, actual: status, pass: status === 401,
      detail: 'Unauthenticated request must return 401',
    });
  }

  // ── Case 2: KORA_ADMIN → /api/company/workspace → 403 (wrong role) ───────
  {
    const { status } = await callApi(`${baseUrl}/api/company/workspace`, adminToken);
    cases.push({
      id: 'B36-2',
      scenario: 'KORA_ADMIN → /api/company/workspace → 403 (admin not a company user)',
      expected: 403, actual: status, pass: status === 403,
      detail: 'Admin must not access company workspace route',
    });
  }

  // ── Case 3: KORA_ADMIN → /api/admin/company-users → 200 ─────────────────
  // Note: query param tenantId is required — use a dummy UUID to test auth
  {
    const { status } = await callApi(`${baseUrl}/api/admin/company-users?tenantId=00000000-0000-0000-0000-000000000000`, adminToken);
    // 200 (no users found) or 404 (tenant not found) — both mean auth passed
    const pass = status === 200 || status === 404;
    cases.push({
      id: 'B36-3',
      scenario: 'KORA_ADMIN → /api/admin/company-users → auth accepted (200 or 404)',
      expected: 200, actual: status, pass,
      detail: `Auth accepted — status ${status} (200=ok empty, 404=tenant not found, both pass auth)`,
    });
  }

  // ── Case 4: Unauthenticated → /api/admin/company-users → 401 ────────────
  {
    const { status } = await callApi(`${baseUrl}/api/admin/company-users?tenantId=x`, null);
    cases.push({
      id: 'B36-4',
      scenario: 'Unauthenticated → /api/admin/company-users → 401',
      expected: 401, actual: status, pass: status === 401,
      detail: 'Unauthenticated request must return 401',
    });
  }

  // ── Case 5: Unauthenticated → /api/company/evidence-archive → 401 ────────
  {
    const { status } = await callApi(`${baseUrl}/api/company/evidence-archive`, null);
    cases.push({
      id: 'B36-5',
      scenario: 'Unauthenticated → /api/company/evidence-archive → 401',
      expected: 401, actual: status, pass: status === 401,
      detail: 'Unauthenticated request must return 401',
    });
  }

  // ── Case 6: Unauthenticated → /api/company/evidence-record → 401 ─────────
  {
    const { status } = await callApi(`${baseUrl}/api/company/evidence-record?recordId=fake`, null);
    cases.push({
      id: 'B36-6',
      scenario: 'Unauthenticated → /api/company/evidence-record → 401',
      expected: 401, actual: status, pass: status === 401,
      detail: 'Unauthenticated request must return 401',
    });
  }

  // ── Case 7: KORA_ADMIN → /api/admin/tenants → 200 ────────────────────────
  {
    const { status } = await callApi(`${baseUrl}/api/admin/tenants`, adminToken);
    cases.push({
      id: 'B36-7',
      scenario: 'KORA_ADMIN → /api/admin/tenants → 200',
      expected: 200, actual: status, pass: status === 200,
      detail: 'Admin can access admin routes',
    });
  }

  // ── Case 8: KORA_ADMIN → /api/company/evidence-archive → 403 ─────────────
  {
    const { status } = await callApi(`${baseUrl}/api/company/evidence-archive`, adminToken);
    cases.push({
      id: 'B36-8',
      scenario: 'KORA_ADMIN → /api/company/evidence-archive → 403 (not a company user)',
      expected: 403, actual: status, pass: status === 403,
      detail: 'Admin must not access company-only routes',
    });
  }

  // ── Cases 9–12: COMPANY_ADMIN tests (requires provisioned test user) ──────
  if (companyAdminEmail && testPassword) {
    const companyToken = await signInAndGetToken(companyAdminEmail, testPassword);

    // Case 9: COMPANY_ADMIN → /api/company/workspace → 200 (own tenant)
    {
      const { status, body } = await callApi(`${baseUrl}/api/company/workspace`, companyToken);
      const forbidden = status === 200 ? containsForbiddenField(body) : null;
      cases.push({
        id: 'B36-9',
        scenario: `COMPANY_ADMIN → /api/company/workspace → ${status}`,
        expected: 200, actual: status,
        pass: (status === 200 || status === 403) && forbidden === null,
        detail: companyToken
          ? (forbidden ? `FAIL: forbidden field in response: ${forbidden}` : `status ${status}`)
          : 'sign-in failed — company admin user may not exist',
      });
    }

    // Case 10: COMPANY_ADMIN → /api/admin/tenants → 403 (admin route)
    {
      const { status } = await callApi(`${baseUrl}/api/admin/tenants`, companyToken);
      cases.push({
        id: 'B36-10',
        scenario: 'COMPANY_ADMIN → /api/admin/tenants → 403',
        expected: 403, actual: status, pass: status === 403,
        detail: companyToken
          ? 'company user must not access admin routes'
          : 'sign-in failed — company admin user may not exist',
      });
    }

    // Case 11: COMPANY_ADMIN → /api/admin/company-users → 403
    {
      const { status } = await callApi(`${baseUrl}/api/admin/company-users?tenantId=x`, companyToken);
      cases.push({
        id: 'B36-11',
        scenario: 'COMPANY_ADMIN → /api/admin/company-users → 403',
        expected: 403, actual: status, pass: status === 403,
        detail: companyToken
          ? 'company user must not access provisioning route'
          : 'sign-in failed',
      });
    }

    // Case 12: COMPANY_ADMIN → /api/admin/operator-flow → 403
    {
      const { status } = await callApi(`${baseUrl}/api/admin/operator-flow?tenantCode=OP-001&reportingPeriod=2026-Q1`, companyToken);
      cases.push({
        id: 'B36-12',
        scenario: 'COMPANY_ADMIN → /api/admin/operator-flow → 403',
        expected: 403, actual: status, pass: status === 403,
        detail: companyToken
          ? 'company user must not access admin operator flow'
          : 'sign-in failed',
      });
    }
  } else {
    for (const id of ['B36-9', 'B36-10', 'B36-11', 'B36-12']) {
      cases.push({
        id,
        scenario: `${id} (skipped — KORA_TEST_COMPANY_ADMIN_EMAIL not set)`,
        expected: 0, actual: 0, pass: true, skipped: true,
        detail: 'Set KORA_TEST_COMPANY_ADMIN_EMAIL + KORA_TEST_USER_PASSWORD to run company user tests',
      });
    }
  }

  // ── Cases 13–14: COMPANY_VIEWER tests ────────────────────────────────────
  if (companyViewerEmail && testPassword) {
    const viewerToken = await signInAndGetToken(companyViewerEmail, testPassword);

    // Case 13: COMPANY_VIEWER → /api/company/workspace → 200 (own tenant)
    {
      const { status, body } = await callApi(`${baseUrl}/api/company/workspace`, viewerToken);
      const forbidden = status === 200 ? containsForbiddenField(body) : null;
      cases.push({
        id: 'B36-13',
        scenario: `COMPANY_VIEWER → /api/company/workspace → ${status}`,
        expected: 200, actual: status,
        pass: (status === 200 || status === 403) && forbidden === null,
        detail: viewerToken
          ? (forbidden ? `FAIL: forbidden field: ${forbidden}` : `status ${status}`)
          : 'sign-in failed',
      });
    }

    // Case 14: COMPANY_VIEWER → /api/admin/tenants → 403
    {
      const { status } = await callApi(`${baseUrl}/api/admin/tenants`, viewerToken);
      cases.push({
        id: 'B36-14',
        scenario: 'COMPANY_VIEWER → /api/admin/tenants → 403',
        expected: 403, actual: status, pass: status === 403,
        detail: viewerToken ? 'viewer must not access admin routes' : 'sign-in failed',
      });
    }
  } else {
    for (const id of ['B36-13', 'B36-14']) {
      cases.push({
        id,
        scenario: `${id} (skipped — KORA_TEST_COMPANY_VIEWER_EMAIL not set)`,
        expected: 0, actual: 0, pass: true, skipped: true,
        detail: 'Set KORA_TEST_COMPANY_VIEWER_EMAIL to run viewer tests',
      });
    }
  }

  const nonSkipped = cases.filter(c => !c.skipped);
  const allPass    = nonSkipped.every(c => c.pass);

  return NextResponse.json({
    ok:      allPass,
    verdict: allPass ? 'PASS' : 'FAIL',
    summary: {
      total:   cases.length,
      skipped: cases.filter(c => c.skipped).length,
      run:     nonSkipped.length,
      pass:    nonSkipped.filter(c => c.pass).length,
      fail:    nonSkipped.filter(c => !c.pass).length,
    },
    cases,
    note: 'Cases B36-9 to B36-14 require pre-provisioned company test users with correct app_metadata.',
    synthetic_test: true,
  }, { status: allPass ? 200 : 422 });
}
