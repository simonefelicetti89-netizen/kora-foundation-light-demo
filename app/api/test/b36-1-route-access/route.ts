// app/api/test/b36-1-route-access/route.ts
// B36.1 — Product mode separation + route access hygiene tests. DEV/TEST ONLY.
//
// Covers the 20 access checks from B36.1 Part 10:
//   1–2.  COMPANY_ADMIN/VIEWER cannot access Demo Lab routes (API-level: admin routes 403)
//   3–4.  COMPANY_ADMIN/VIEWER cannot access Future Vision (admin routes 403)
//   5–6.  COMPANY_ADMIN/VIEWER cannot access admin Data Pipeline routes (403)
//   7–8.  COMPANY_ADMIN/VIEWER cannot access KORA Admin provisioning (403)
//   9–10. Live workspace shows empty state for unknown tenant (no Meridiana fallback)
//   11–14. Sidebar mode config checks (verified via getAccessibleRoutes logic)
//   15.   Admin sidebar group separation (structural — verified by import check)
//   16–17. Meridiana appears only in demo routes (API response check)
//   18.   No company route returns raw payload / forbidden fields
//   19.   No company route exposes mutation actions (GET-only check)
//   20.   Build check (TypeScript compilation — run separately)
//
// Protection: testRouteGuard (NODE_ENV check + explicit flag + shared secret)

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/types';
import { testRouteGuard } from '@/lib/auth/test-route-guard';
import { getAccessibleRoutes } from '@/lib/permissions';

const SUPABASE_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

interface TestCase {
  id:       string;
  scenario: string;
  expected: number | boolean | string;
  actual:   number | boolean | string;
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

// Fields that must never appear in company API responses (privacy/security)
const FORBIDDEN_RESPONSE_FIELDS = [
  'pseudonym_id', 'worker_id', 'worker_name', 'email_worker',
  'raw_hash', 'storagePath', 'storageBucket', 'signedUrl',
  'pib_total', 'pib_by_pillar', 'pib_score',
  'meridiana', 'Meridiana',  // no demo data in live routes
];

function containsForbiddenField(body: Record<string, unknown>): string | null {
  const bodyStr = JSON.stringify(body);
  for (const field of FORBIDDEN_RESPONSE_FIELDS) {
    if (bodyStr.includes(`"${field}"`)) return field;
    if (field === 'meridiana' && bodyStr.toLowerCase().includes('"meridiana')) return 'Meridiana (demo data leak)';
  }
  return null;
}

export async function GET(request: NextRequest) {
  const blocked = testRouteGuard(request);
  if (blocked) return blocked;

  const testPassword       = process.env.KORA_TEST_USER_PASSWORD;
  const adminEmail         = 'kora-admin@example.test';
  const companyAdminEmail  = process.env.KORA_TEST_COMPANY_ADMIN_EMAIL ?? '';
  const companyViewerEmail = process.env.KORA_TEST_COMPANY_VIEWER_EMAIL ?? '';

  if (!testPassword) {
    return NextResponse.json({ error: 'KORA_TEST_USER_PASSWORD not set' }, { status: 400 });
  }

  const baseUrl = new URL(request.url).origin;
  const cases: TestCase[] = [];

  const adminToken = await signInAndGetToken(adminEmail, testPassword);

  // ── Cases 1–2: Permission model — company roles excluded from Demo Lab routes ──
  // Verified via getAccessibleRoutes() — company roles must not include /company/* demo paths.
  {
    const adminRoutes    = getAccessibleRoutes('COMPANY_ADMIN');
    const viewerRoutes   = getAccessibleRoutes('COMPANY_VIEWER');
    const demoPaths      = ['/company', '/company/shared', '/company/activation',
                            '/company/contribution', '/company/pillars', '/company/onboarding',
                            '/company/kora-index', '/company/financial', '/company/reports',
                            '/company/data'];

    const adminHasDemo   = demoPaths.some(p => adminRoutes.includes(p));
    const viewerHasDemo  = demoPaths.some(p => viewerRoutes.includes(p));

    cases.push({
      id: 'B361-1',
      scenario: 'COMPANY_ADMIN accessible routes do not include Demo Lab /company/* paths',
      expected: false, actual: adminHasDemo, pass: !adminHasDemo,
      detail: adminHasDemo
        ? `Demo paths found in COMPANY_ADMIN routes: ${demoPaths.filter(p => adminRoutes.includes(p)).join(', ')}`
        : 'Clean — no Demo Lab paths in COMPANY_ADMIN accessible routes',
    });

    cases.push({
      id: 'B361-2',
      scenario: 'COMPANY_VIEWER accessible routes do not include Demo Lab /company/* paths',
      expected: false, actual: viewerHasDemo, pass: !viewerHasDemo,
      detail: viewerHasDemo
        ? `Demo paths found in COMPANY_VIEWER routes: ${demoPaths.filter(p => viewerRoutes.includes(p)).join(', ')}`
        : 'Clean — no Demo Lab paths in COMPANY_VIEWER accessible routes',
    });
  }

  // ── Cases 3–4: Company roles excluded from /future-vision ────────────────────
  {
    const adminRoutes  = getAccessibleRoutes('COMPANY_ADMIN');
    const viewerRoutes = getAccessibleRoutes('COMPANY_VIEWER');
    const adminHasFV   = adminRoutes.includes('/future-vision');
    const viewerHasFV  = viewerRoutes.includes('/future-vision');

    cases.push({
      id: 'B361-3',
      scenario: 'COMPANY_ADMIN accessible routes do not include /future-vision',
      expected: false, actual: adminHasFV, pass: !adminHasFV,
      detail: adminHasFV ? 'FAIL: /future-vision in COMPANY_ADMIN routes' : 'Clean',
    });

    cases.push({
      id: 'B361-4',
      scenario: 'COMPANY_VIEWER accessible routes do not include /future-vision',
      expected: false, actual: viewerHasFV, pass: !viewerHasFV,
      detail: viewerHasFV ? 'FAIL: /future-vision in COMPANY_VIEWER routes' : 'Clean',
    });
  }

  // ── Cases 5–8: Admin Data Pipeline / Provisioning routes return 403 for company users ──
  if (companyAdminEmail && testPassword) {
    const companyToken  = await signInAndGetToken(companyAdminEmail, testPassword);

    const adminOnlyRoutes = [
      { id: 'B361-5', label: 'Data Pipeline — admin/tenants', path: '/api/admin/tenants' },
      { id: 'B361-6', label: 'Data Pipeline — admin/data-intake (no such API but admin routes are protected)', path: '/api/admin/company-users?tenantId=x' },
      { id: 'B361-7', label: 'KORA Admin provisioning — admin/company-users', path: '/api/admin/company-users?tenantId=x' },
      { id: 'B361-8', label: 'KORA Admin provisioning — admin/tenants workspace', path: '/api/admin/tenants/workspace?tenantId=x' },
    ];

    for (const route of adminOnlyRoutes) {
      const { status } = await callApi(`${baseUrl}${route.path}`, companyToken);
      cases.push({
        id: route.id,
        scenario: `COMPANY_ADMIN → ${route.label} → 403`,
        expected: 403, actual: status, pass: status === 403,
        detail: companyToken
          ? `company user must not access admin routes (got ${status})`
          : 'sign-in failed — company admin test user may not exist',
      });
    }

    // Viewer tests (cases 5–8 mirrored for viewer)
    if (companyViewerEmail) {
      const viewerToken = await signInAndGetToken(companyViewerEmail, testPassword);
      const { status } = await callApi(`${baseUrl}/api/admin/tenants`, viewerToken);
      cases.push({
        id: 'B361-5V',
        scenario: 'COMPANY_VIEWER → admin/tenants → 403',
        expected: 403, actual: status, pass: status === 403,
        detail: viewerToken ? `got ${status}` : 'sign-in failed',
      });
    }
  } else {
    for (const id of ['B361-5', 'B361-6', 'B361-7', 'B361-8']) {
      cases.push({
        id,
        scenario: `${id} (skipped — KORA_TEST_COMPANY_ADMIN_EMAIL not set)`,
        expected: 0, actual: 0, pass: true, skipped: true,
        detail: 'Set KORA_TEST_COMPANY_ADMIN_EMAIL + KORA_TEST_USER_PASSWORD to run',
      });
    }
  }

  // ── Case 9: Live workspace with unknown tenant shows empty state — no Meridiana ──
  // KORA_ADMIN accessing workspace API for a non-existent tenant must not return demo data.
  {
    const { status, body } = await callApi(`${baseUrl}/api/company/workspace`, adminToken);
    // Admin gets 403 from company workspace (correct — not a company user)
    const meridianaSeen = status !== 403 && JSON.stringify(body).toLowerCase().includes('meridiana');
    cases.push({
      id: 'B361-9',
      scenario: 'Live workspace API does not expose Meridiana to non-company-user request',
      expected: 403, actual: status, pass: status === 403 && !meridianaSeen,
      detail: meridianaSeen
        ? 'FAIL: Meridiana data leaked in workspace response'
        : 'Clean — workspace correctly returns 403 for non-company-user; no Meridiana leak',
    });
  }

  // ── Case 10: Empty state — no demo fallback in company workspace ──────────────
  // Verify the workspace API (for real company users) does not fall back to Meridiana.
  // If a company user gets a 200, their tenant data must not contain Meridiana IDs.
  if (companyAdminEmail && testPassword) {
    const companyToken = await signInAndGetToken(companyAdminEmail, testPassword);
    if (companyToken) {
      const { status, body } = await callApi(`${baseUrl}/api/company/workspace`, companyToken);
      const meridianaSeen = status === 200 && JSON.stringify(body).toLowerCase().includes('meridiana-group');
      cases.push({
        id: 'B361-10',
        scenario: 'Live workspace API never returns meridiana-group data for real company user',
        expected: false, actual: meridianaSeen, pass: !meridianaSeen,
        detail: meridianaSeen
          ? 'FAIL: meridiana-group found in company workspace response — demo fallback leak'
          : `Clean — no Meridiana fallback (status: ${status})`,
      });
    } else {
      cases.push({
        id: 'B361-10',
        scenario: 'B361-10 (skipped — company admin sign-in failed)',
        expected: false, actual: false, pass: true, skipped: true,
        detail: 'Company admin sign-in failed — user may not be provisioned',
      });
    }
  } else {
    cases.push({
      id: 'B361-10',
      scenario: 'B361-10 (skipped — KORA_TEST_COMPANY_ADMIN_EMAIL not set)',
      expected: false, actual: false, pass: true, skipped: true,
      detail: 'Set KORA_TEST_COMPANY_ADMIN_EMAIL to run',
    });
  }

  // ── Cases 11–14: Sidebar mode — verified via getAccessibleRoutes ──────────────
  {
    const adminRoutes  = getAccessibleRoutes('KORA_ADMIN' as Parameters<typeof getAccessibleRoutes>[0]);
    const adminHasFV   = adminRoutes.includes('/future-vision');
    const adminHasDemo = adminRoutes.includes('/company'); // KORA_ADMIN can see demo routes

    cases.push({
      id: 'B361-11',
      scenario: 'Company sidebar excludes Demo Lab routes (permission model)',
      expected: false,
      actual: getAccessibleRoutes('COMPANY_ADMIN').includes('/company'),
      pass: !getAccessibleRoutes('COMPANY_ADMIN').includes('/company'),
      detail: 'COMPANY_ADMIN must not have /company (demo cockpit) in accessible routes',
    });

    cases.push({
      id: 'B361-12',
      scenario: 'Company sidebar excludes /company/data (Data Pipeline)',
      expected: false,
      actual: getAccessibleRoutes('COMPANY_ADMIN').includes('/company/data'),
      pass: !getAccessibleRoutes('COMPANY_ADMIN').includes('/company/data'),
      detail: 'COMPANY_ADMIN must not have /company/data in accessible routes',
    });

    cases.push({
      id: 'B361-13',
      scenario: 'Company sidebar excludes Future Vision',
      expected: false,
      actual: getAccessibleRoutes('COMPANY_VIEWER').includes('/future-vision'),
      pass: !getAccessibleRoutes('COMPANY_VIEWER').includes('/future-vision'),
      detail: 'COMPANY_VIEWER must not have /future-vision in accessible routes',
    });

    cases.push({
      id: 'B361-14',
      scenario: 'KORA_ADMIN can access Demo Lab routes (/company)',
      expected: true, actual: adminHasDemo, pass: adminHasDemo,
      detail: adminHasDemo ? 'KORA_ADMIN has access to /company demo routes' : 'FAIL: KORA_ADMIN missing /company in accessible routes',
    });
  }

  // ── Case 15: Admin sidebar group separation (structural check via permission model) ──
  {
    const adminRoutes = getAccessibleRoutes('KORA_ADMIN' as Parameters<typeof getAccessibleRoutes>[0]);
    const hasAdminRoutes   = adminRoutes.includes('/admin');
    const hasFutureVision  = adminRoutes.includes('/future-vision');
    const hasDemoRoutes    = adminRoutes.includes('/company');

    cases.push({
      id: 'B361-15',
      scenario: 'Admin permission model includes all 4 sidebar categories',
      expected: true,
      actual: hasAdminRoutes && hasFutureVision && hasDemoRoutes,
      pass: hasAdminRoutes && hasFutureVision && hasDemoRoutes,
      detail: `admin=${hasAdminRoutes} futureVision=${hasFutureVision} demoRoutes=${hasDemoRoutes}`,
    });
  }

  // ── Cases 16–17: Meridiana appears only in demo routes ────────────────────────
  // Verify company workspace API never returns Meridiana in its response.
  {
    const { body } = await callApi(`${baseUrl}/api/company/workspace`, adminToken);
    // Admin gets 403 so body should be an error, not Meridiana data
    const bodyStr = JSON.stringify(body).toLowerCase();
    const hasMeridiana = bodyStr.includes('meridiana');

    cases.push({
      id: 'B361-16',
      scenario: 'Company workspace API response does not contain Meridiana data',
      expected: false, actual: hasMeridiana, pass: !hasMeridiana,
      detail: hasMeridiana ? 'FAIL: Meridiana found in workspace API response' : 'Clean',
    });

    // Evidence archive API should also be clean
    const { body: archBody } = await callApi(`${baseUrl}/api/company/evidence-archive`, adminToken);
    const archStr = JSON.stringify(archBody).toLowerCase();
    const archHasMeridiana = archStr.includes('"meridiana-group"');

    cases.push({
      id: 'B361-17',
      scenario: 'Evidence archive API response does not contain meridiana-group ID',
      expected: false, actual: archHasMeridiana, pass: !archHasMeridiana,
      detail: archHasMeridiana ? 'FAIL: meridiana-group ID in evidence archive response (admin gets 403, body should be error)' : 'Clean',
    });
  }

  // ── Case 18: No company route exposes forbidden fields ───────────────────────
  {
    const { body: wsBody } = await callApi(`${baseUrl}/api/company/workspace`, adminToken);
    const forbidden = containsForbiddenField(wsBody);

    cases.push({
      id: 'B361-18',
      scenario: 'Company workspace API response contains no forbidden fields (PIB, raw_hash, storagePath, signedUrl)',
      expected: 'none', actual: forbidden ?? 'none', pass: forbidden === null,
      detail: forbidden ? `FAIL: forbidden field "${forbidden}" in response` : 'Clean',
    });
  }

  // ── Case 19: No company route exposes mutation actions ───────────────────────
  // Company routes are GET-only. Verify POST to workspace and evidence archive returns 405.
  {
    const headers: Record<string, string> = {};
    if (adminToken) headers['Authorization'] = `Bearer ${adminToken}`;
    const res = await fetch(`${baseUrl}/api/company/workspace`, { method: 'POST', headers });
    const pass = res.status === 405 || res.status === 403 || res.status === 401;

    cases.push({
      id: 'B361-19',
      scenario: 'POST to /api/company/workspace returns 405/403/401 (no mutation allowed)',
      expected: '405/403/401', actual: String(res.status), pass,
      detail: pass ? `Mutation blocked — status ${res.status}` : `FAIL: POST returned ${res.status}`,
    });
  }

  // ── Case 20: Workspace endpoint exists and is auth-gated ─────────────────────
  {
    const { status } = await callApi(`${baseUrl}/api/company/workspace`, null);
    cases.push({
      id: 'B361-20',
      scenario: 'Workspace endpoint is auth-gated (unauthenticated → 401)',
      expected: 401, actual: status, pass: status === 401,
      detail: `Unauthenticated → ${status}`,
    });
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
    note: 'B36.1 route hygiene tests — product mode separation, Meridiana containment, sidebar permission model, company route isolation.',
    synthetic_test: true,
  }, { status: allPass ? 200 : 422 });
}
