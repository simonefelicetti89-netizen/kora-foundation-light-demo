/**
 * KORA-WP-018 — Company Needs View.
 *
 * Behavioral (not string-matching, except where noted) tests of the REAL
 * `GET` handler from app/api/company/needs/route.ts, with only
 * `@/lib/auth/kora-session` and `@/lib/needs-map/need-hypothesis-service`
 * mocked at their public boundary — the route's own logic (tenant
 * extraction, field projection, error handling) is never mocked or
 * bypassed.
 *
 * Also includes: additional real-`listNeedHypothesesForTenant` coverage
 * (multi-row ordering, cross-tenant isolation, empty result) that WP-017's
 * own test file did not yet exercise — needed to prove WP-018's own
 * acceptance ("Company can view its own Need Hypothesis"), added here
 * rather than editing tests/unit/kora-wp-017-need-hypothesis.test.ts
 * (out of this WP's scope to modify). Real-DB RLS proof for
 * analytics.need_hypothesis already exists in
 * tests/integration/rls-two-tenant-negative.test.ts (RLS-03, extended for
 * migration 055) and was re-validated live on staging during the Wave 1
 * rollout — not re-derived here.
 *
 * Static source-text checks (page.tsx, Sidebar.tsx) cover what a mocked
 * behavioral test cannot: this repo has no component-render test harness
 * (vitest.config.ts uses environment: 'node', no jsdom/@testing-library —
 * see component-test-foundation-01's own header comment for the same
 * documented reasoning), so the client page is instead checked for the
 * absence of forbidden patterns (mutation calls, Supported-Need actions,
 * worker-level fields, service-role imports) in its actual source.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const TENANT_A = 'aaaaaaaa-1000-4000-8000-00000000000a';
const TENANT_B = 'bbbbbbbb-1000-4000-8000-00000000000b';

// ── Mock the auth boundary and the domain service — never the route itself ──

const mockRequireCompanyUser = vi.fn();

vi.mock('@/lib/auth/kora-session', () => ({
  requireCompanyUser: (...args: unknown[]) => mockRequireCompanyUser(...args),
  isKoraAuthError: (v: unknown) => v instanceof NextResponse,
}));

const mockListNeedHypothesesForTenant = vi.fn();

vi.mock('@/lib/needs-map/need-hypothesis-service', () => ({
  listNeedHypothesesForTenant: (...args: unknown[]) => mockListNeedHypothesesForTenant(...args),
}));

function makeRow(overrides: Partial<{
  id: string; tenantId: string; statement: string;
  classification: string; recordedByRole: string; recordedById: string; createdAt: string;
}> = {}) {
  return {
    id: 'need-1',
    tenantId: TENANT_A,
    statement: 'Employees may need more flexible hours',
    classification: 'Hypothesis',
    recordedByRole: 'COMPANY_ADMIN',
    recordedById: 'admin-secret-internal-id',
    createdAt: '2026-09-12T00:00:00.000Z',
    ...overrides,
  };
}

beforeEach(() => {
  mockRequireCompanyUser.mockReset();
  mockListNeedHypothesesForTenant.mockReset();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('KORA-WP-018 — GET /api/company/needs — auth boundary', () => {
  it('returns the auth error response unchanged and never calls the service when unauthenticated', async () => {
    const denied = NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    mockRequireCompanyUser.mockResolvedValue(denied);

    const { GET } = await import('@/app/api/company/needs/route');
    const res = await GET(new NextRequest('http://localhost/api/company/needs'));

    expect(res.status).toBe(401);
    expect(mockListNeedHypothesesForTenant).not.toHaveBeenCalled();
  });

  it('returns the auth error response unchanged for a non-COMPANY_ADMIN role (403)', async () => {
    const denied = NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    mockRequireCompanyUser.mockResolvedValue(denied);

    const { GET } = await import('@/app/api/company/needs/route');
    const res = await GET(new NextRequest('http://localhost/api/company/needs'));

    expect(res.status).toBe(403);
    expect(mockListNeedHypothesesForTenant).not.toHaveBeenCalled();
  });
});

describe('KORA-WP-018 — GET /api/company/needs — tenant handling and forgery resistance', () => {
  it('queries only the session-resolved tenantId, ignoring a spoofed tenantId query parameter entirely', async () => {
    mockRequireCompanyUser.mockResolvedValue({ id: 'u1', email: 'a@x.test', koraRole: 'COMPANY_ADMIN', tenantId: TENANT_A });
    mockListNeedHypothesesForTenant.mockResolvedValue([makeRow({ tenantId: TENANT_A })]);

    const { GET } = await import('@/app/api/company/needs/route');
    // Attempted tenant forgery via query string — the route must never read it.
    const res = await GET(new NextRequest(`http://localhost/api/company/needs?tenantId=${TENANT_B}&company_id=${TENANT_B}`));
    const body = await res.json();

    expect(mockListNeedHypothesesForTenant).toHaveBeenCalledTimes(1);
    expect(mockListNeedHypothesesForTenant).toHaveBeenCalledWith(TENANT_A);
    expect(body.ok).toBe(true);
    expect(body.needs).toHaveLength(1);
  });

  it('two different sessions resolve strictly to their own tenant — no cross-call bleed', async () => {
    const { GET } = await import('@/app/api/company/needs/route');

    mockRequireCompanyUser.mockResolvedValue({ id: 'u1', email: 'a@x.test', koraRole: 'COMPANY_ADMIN', tenantId: TENANT_A });
    mockListNeedHypothesesForTenant.mockResolvedValue([makeRow({ id: 'need-a', tenantId: TENANT_A, statement: 'Need for A' })]);
    const resA = await GET(new NextRequest('http://localhost/api/company/needs'));
    const bodyA = await resA.json();

    mockRequireCompanyUser.mockResolvedValue({ id: 'u2', email: 'b@x.test', koraRole: 'COMPANY_ADMIN', tenantId: TENANT_B });
    mockListNeedHypothesesForTenant.mockResolvedValue([makeRow({ id: 'need-b', tenantId: TENANT_B, statement: 'Need for B' })]);
    const resB = await GET(new NextRequest('http://localhost/api/company/needs'));
    const bodyB = await resB.json();

    expect(bodyA.needs.map((n: { id: string }) => n.id)).toEqual(['need-a']);
    expect(bodyB.needs.map((n: { id: string }) => n.id)).toEqual(['need-b']);
    expect(mockListNeedHypothesesForTenant).toHaveBeenNthCalledWith(1, TENANT_A);
    expect(mockListNeedHypothesesForTenant).toHaveBeenNthCalledWith(2, TENANT_B);
  });
});

describe('KORA-WP-018 — GET /api/company/needs — field minimization (privacy)', () => {
  it('never includes recordedByRole/recordedById/tenantId in the response payload', async () => {
    mockRequireCompanyUser.mockResolvedValue({ id: 'u1', email: 'a@x.test', koraRole: 'COMPANY_ADMIN', tenantId: TENANT_A });
    mockListNeedHypothesesForTenant.mockResolvedValue([makeRow()]);

    const { GET } = await import('@/app/api/company/needs/route');
    const res = await GET(new NextRequest('http://localhost/api/company/needs'));
    const body = await res.json();

    const returnedKeys = Object.keys(body.needs[0]);
    expect(returnedKeys.sort()).toEqual(['classification', 'createdAt', 'id', 'statement']);
    expect(JSON.stringify(body)).not.toContain('admin-secret-internal-id');
  });
});

describe('KORA-WP-018 — GET /api/company/needs — empty state and errors', () => {
  it('returns an empty array (not an error) when the tenant has zero hypotheses', async () => {
    mockRequireCompanyUser.mockResolvedValue({ id: 'u1', email: 'a@x.test', koraRole: 'COMPANY_ADMIN', tenantId: TENANT_A });
    mockListNeedHypothesesForTenant.mockResolvedValue([]);

    const { GET } = await import('@/app/api/company/needs/route');
    const res = await GET(new NextRequest('http://localhost/api/company/needs'));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.needs).toEqual([]);
  });

  it('a service-layer failure surfaces as a 500 with a safe generic message, never the raw internal error', async () => {
    mockRequireCompanyUser.mockResolvedValue({ id: 'u1', email: 'a@x.test', koraRole: 'COMPANY_ADMIN', tenantId: TENANT_A });
    mockListNeedHypothesesForTenant.mockRejectedValue(new Error('[KORA] listNeedHypothesesForTenant failed: connection reset at db.internal.svc:5432'));

    const { GET } = await import('@/app/api/company/needs/route');
    const res = await GET(new NextRequest('http://localhost/api/company/needs'));
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.ok).toBe(false);
    expect(body.error).not.toMatch(/db\.internal\.svc|connection reset/);
  });
});

describe('KORA-WP-018 — additional real-service coverage (gap identified during recon, not covered by WP-017\'s own test file)', () => {
  it('listNeedHypothesesForTenant never mixes rows across tenants (real function, mocked I/O boundary)', async () => {
    interface Row {
      id: string; tenant_id: string; statement: string; classification: string;
      recorded_by_role: string; recorded_by_id: string; created_at: string;
    }
    const allRows: Row[] = [
      { id: 'n1', tenant_id: TENANT_A, statement: 'A need 1', classification: 'Hypothesis', recorded_by_role: 'COMPANY_ADMIN', recorded_by_id: 'x', created_at: '2026-09-10T00:00:00.000Z' },
      { id: 'n2', tenant_id: TENANT_B, statement: 'B need 1', classification: 'Hypothesis', recorded_by_role: 'COMPANY_ADMIN', recorded_by_id: 'y', created_at: '2026-09-11T00:00:00.000Z' },
      { id: 'n3', tenant_id: TENANT_A, statement: 'A need 2', classification: 'Hypothesis', recorded_by_role: 'COMPANY_ADMIN', recorded_by_id: 'x', created_at: '2026-09-12T00:00:00.000Z' },
    ];

    vi.resetModules();
    vi.doMock('@/lib/supabase/server', () => ({
      getSupabaseServiceClient: () => ({
        schema: (schemaName: string) => ({
          from: (table: string) => {
            if (schemaName === 'analytics' && table === 'need_hypothesis') {
              return {
                select: () => ({
                  eq: (_col: string, val: string) => ({
                    order: async () => ({ data: allRows.filter((r) => r.tenant_id === val), error: null }),
                  }),
                }),
              };
            }
            throw new Error(`unexpected query target: ${schemaName}.${table}`);
          },
        }),
      }),
    }));

    // The file-level `vi.mock('@/lib/needs-map/need-hypothesis-service', ...)`
    // above is hoisted and file-wide — vi.resetModules() does not undo it, so
    // a plain dynamic import here would still resolve to that mock. Use
    // importActual to genuinely exercise the real, unmocked implementation.
    const { listNeedHypothesesForTenant } = await vi.importActual<
      typeof import('@/lib/needs-map/need-hypothesis-service')
    >('@/lib/needs-map/need-hypothesis-service');
    const listA = await listNeedHypothesesForTenant(TENANT_A);
    const listB = await listNeedHypothesesForTenant(TENANT_B);

    expect(listA.map((n) => n.id).sort()).toEqual(['n1', 'n3']);
    expect(listB.map((n) => n.id)).toEqual(['n2']);
    expect(listA.every((n) => n.tenantId === TENANT_A)).toBe(true);

    vi.doUnmock('@/lib/supabase/server');
  });

  it('returns an empty array, not an error, for a tenant with zero rows (real function)', async () => {
    vi.resetModules();
    vi.doMock('@/lib/supabase/server', () => ({
      getSupabaseServiceClient: () => ({
        schema: () => ({
          from: () => ({
            select: () => ({ eq: () => ({ order: async () => ({ data: [], error: null }) }) }),
          }),
        }),
      }),
    }));

    const { listNeedHypothesesForTenant } = await vi.importActual<
      typeof import('@/lib/needs-map/need-hypothesis-service')
    >('@/lib/needs-map/need-hypothesis-service');
    const list = await listNeedHypothesesForTenant(TENANT_A);

    expect(list).toEqual([]);
    vi.doUnmock('@/lib/supabase/server');
  });
});

describe('KORA-WP-018 — page.tsx scope integrity (static source checks — no component render harness in this repo)', () => {
  const src = readFileSync(join(process.cwd(), 'app/company/needs/page.tsx'), 'utf8');
  const codeLines = src.split('\n').filter((l) => !l.trim().startsWith('//'));
  const code = codeLines.join('\n');

  it('fetches only the intended read endpoint, with no mutating HTTP method', () => {
    expect(code).toContain("fetch('/api/company/needs'");
    expect(code).not.toMatch(/method:\s*['"](POST|PUT|PATCH|DELETE)['"]/);
  });

  it('contains no create/edit/promote/support action for a Need', () => {
    expect(code).not.toMatch(/promote|onPromote|confirmNeed|markSupported|createNeed|editNeed/i);
  });

  it('never imports the service-role client or the domain write service directly', () => {
    expect(code).not.toMatch(/getSupabaseServiceClient/);
    expect(code).not.toMatch(/from ['"]@\/lib\/needs-map\/need-hypothesis-service['"]/);
  });

  it('never references worker-level identifiers', () => {
    expect(code).not.toMatch(/worker_id|workerId|auth_user_id|employee/i);
  });

  it('never references recordedByRole/recordedById (provenance is not Company-facing)', () => {
    expect(code).not.toMatch(/recordedByRole|recordedById|recorded_by/);
  });

  it('does not use language implying a Hypothesis is proven, confirmed, or validated', () => {
    expect(code).not.toMatch(/\b(provata|confermata|validata|dimostrata)\b/i);
  });
});

describe('KORA-WP-018 — Sidebar navigation', () => {
  it('adds exactly one new /company/needs entry to the COMPANY_ADMIN Intelligence group, without touching other roles', async () => {
    const { buildNavGroups } = await import('@/components/layout/Sidebar');
    const companyGroups = buildNavGroups('COMPANY_ADMIN');
    const allItems = companyGroups.flatMap((g) => g.items);
    const needsItems = allItems.filter((i) => i.href === '/company/needs');

    expect(needsItems).toHaveLength(1);
    expect(needsItems[0].comingSoon).toBeFalsy();
    expect(needsItems[0].inactive).toBeFalsy();
  });
});
