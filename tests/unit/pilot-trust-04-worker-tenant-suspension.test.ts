/**
 * PILOT-TRUST-04 — requireWorkerUser() tenant/mapping suspension enforcement.
 *
 * WHAT THIS IS: behavioral (not string-matching) tests of the REAL
 * `requireWorkerUser()` function from lib/auth/kora-session.ts, plus the
 * real `app/worker/layout.tsx`, `app/worker/commons/page.tsx`, and one real
 * worker API route handler (app/api/worker/profile GET), with only the I/O
 * boundary (@/lib/supabase/server) mocked — the actual auth logic under
 * test is never mocked or bypassed.
 *
 * PILOT-TRUST-02 found, and this sprint fixes, that requireWorkerUser()
 * never checked personal.worker_identity (mapping existence/active/tenant
 * match) or analytics.tenant.is_active — unlike requireCompanyUser(), which
 * already checked tenant.is_active. A worker whose employer's tenant had
 * been suspended kept full access. See docs/PILOT_TRUST_04_WORKER_TENANT_SUSPENSION_REPORT.md.
 *
 * Real Postgres/RLS-level verification of the same fix lives in
 * tests/integration/rls-09-worker-tenant-suspension.test.ts — this file
 * covers the application-layer contract with fast, deterministic mocks.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextResponse } from 'next/server';

const TENANT_ID = '11111111-1111-4111-8111-111111111111';
const WORKER_ID = '22222222-2222-4222-8222-222222222222';
const OTHER_TENANT_ID = '33333333-3333-4333-8333-333333333333';

// ── Mock the I/O boundary only — never the function under test ──────────────

const mockGetUser = vi.fn();
const mockWorkerIdentityMaybeSingle = vi.fn();
const mockTenantMaybeSingle = vi.fn();
const mockWorkerIdentityEq = vi.fn(() => ({ maybeSingle: mockWorkerIdentityMaybeSingle }));
const mockTenantEq = vi.fn(() => ({ maybeSingle: mockTenantMaybeSingle }));

// Post-auth, route-level queries (GET /api/worker/profile) go through
// getSupabaseServerClient(), a SEPARATE client from the service-role one
// requireWorkerUser() uses internally — mocked here only so the "no
// regression" happy-path test can complete; not part of the security logic
// under test.
const mockRouteWorkerIdentityMaybeSingle = vi.fn();
const mockRouteProfileMaybeSingle = vi.fn();

function makeServiceClient() {
  return {
    schema(schemaName: string) {
      return {
        from(table: string) {
          if (schemaName === 'personal' && table === 'worker_identity') {
            return { select: () => ({ eq: mockWorkerIdentityEq }) };
          }
          if (schemaName === 'analytics' && table === 'tenant') {
            return { select: () => ({ eq: mockTenantEq }) };
          }
          throw new Error(`unexpected query target: ${schemaName}.${table}`);
        },
      };
    },
  };
}

function makeServerClient() {
  return {
    auth: { getUser: mockGetUser },
    schema(schemaName: string) {
      return {
        from(table: string) {
          if (schemaName === 'personal' && table === 'worker_identity') {
            return { select: () => ({ eq: () => ({ maybeSingle: mockRouteWorkerIdentityMaybeSingle }) }) };
          }
          if (schemaName === 'personal' && table === 'worker_profile_private') {
            return { select: () => ({ maybeSingle: mockRouteProfileMaybeSingle }) };
          }
          throw new Error(`unexpected route-level query target: ${schemaName}.${table}`);
        },
      };
    },
  };
}

vi.mock('@/lib/supabase/server', () => ({
  getSupabaseServerClient: async () => makeServerClient(),
  getSupabaseServiceClient: () => makeServiceClient(),
}));

vi.mock('next/navigation', () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
}));

function mockUser(appMetadata: Record<string, unknown> | undefined) {
  mockGetUser.mockResolvedValue({ data: { user: { id: 'u1', email: 'worker@pt04.test', app_metadata: appMetadata } } });
}
function mockNoUser() {
  mockGetUser.mockResolvedValue({ data: { user: null } });
}
function mockWorkerIdentityRow(row: { id: string; tenant_id: string; status: string } | null) {
  mockWorkerIdentityMaybeSingle.mockResolvedValue({ data: row, error: null });
}
function mockTenantRow(row: { id: string; is_active: boolean } | null) {
  mockTenantMaybeSingle.mockResolvedValue({ data: row, error: null });
}

async function isDenied(result: unknown, expectedStatus?: number): Promise<boolean> {
  if (!(result instanceof NextResponse)) return false;
  if (expectedStatus !== undefined && result.status !== expectedStatus) return false;
  return true;
}

beforeEach(() => {
  vi.clearAllMocks();
  // Defaults for the route-level (non-security-relevant) post-auth queries —
  // reset per test since vi.clearAllMocks() wipes prior mockResolvedValue.
  mockRouteWorkerIdentityMaybeSingle.mockResolvedValue({
    data: { id: WORKER_ID, worker_ref: 'ref', status: 'active', tenant_id: TENANT_ID, created_at: '2026-01-01' },
    error: null,
  });
  mockRouteProfileMaybeSingle.mockResolvedValue({ data: null, error: null });
});
afterEach(() => {
  vi.resetAllMocks();
});

describe('PILOT-TRUST-04 — requireWorkerUser() real behavior', () => {
  it('1. worker attivo + tenant attivo → PASS (KoraWorkerUser returned)', async () => {
    mockUser({ kora_role: 'WORKER', kora_tenant_id: TENANT_ID, kora_worker_id: WORKER_ID, kora_status: 'active' });
    mockWorkerIdentityRow({ id: WORKER_ID, tenant_id: TENANT_ID, status: 'active' });
    mockTenantRow({ id: TENANT_ID, is_active: true });

    const { requireWorkerUser } = await import('@/lib/auth/kora-session');
    const result = await requireWorkerUser();

    expect(result).not.toBeInstanceOf(NextResponse);
    expect((result as { koraRole: string }).koraRole).toBe('WORKER');
    expect((result as { tenantId: string }).tenantId).toBe(TENANT_ID);
    expect((result as { workerId: string }).workerId).toBe(WORKER_ID);
  });

  it('2. worker attivo + tenant SOSPESO → DENY (403, generic message, no tenant-status leakage)', async () => {
    mockUser({ kora_role: 'WORKER', kora_tenant_id: TENANT_ID, kora_worker_id: WORKER_ID, kora_status: 'active' });
    mockWorkerIdentityRow({ id: WORKER_ID, tenant_id: TENANT_ID, status: 'active' });
    mockTenantRow({ id: TENANT_ID, is_active: false });

    const { requireWorkerUser } = await import('@/lib/auth/kora-session');
    const result = await requireWorkerUser();

    expect(await isDenied(result, 403)).toBe(true);
    const body = await (result as NextResponse).json();
    expect(JSON.stringify(body).toLowerCase()).not.toContain('sospes');
    expect(JSON.stringify(body).toLowerCase()).not.toContain('suspend');
    expect(JSON.stringify(body).toLowerCase()).not.toContain('tenant');
  });

  it('3. worker sospeso (kora_status=disabled) → DENY (pre-existing check, unchanged)', async () => {
    mockUser({ kora_role: 'WORKER', kora_tenant_id: TENANT_ID, kora_worker_id: WORKER_ID, kora_status: 'disabled' });

    const { requireWorkerUser } = await import('@/lib/auth/kora-session');
    const result = await requireWorkerUser();

    expect(await isDenied(result, 403)).toBe(true);
    // kora_status is checked before any DB query — no DB access needed for this branch.
    expect(mockWorkerIdentityMaybeSingle).not.toHaveBeenCalled();
    expect(mockTenantMaybeSingle).not.toHaveBeenCalled();
  });

  it('4. mapping disabilitato (worker_identity.status=disabled) → DENY', async () => {
    mockUser({ kora_role: 'WORKER', kora_tenant_id: TENANT_ID, kora_worker_id: WORKER_ID, kora_status: 'active' });
    mockWorkerIdentityRow({ id: WORKER_ID, tenant_id: TENANT_ID, status: 'disabled' });

    const { requireWorkerUser } = await import('@/lib/auth/kora-session');
    const result = await requireWorkerUser();

    expect(await isDenied(result, 403)).toBe(true);
    // Mapping check fails before the tenant query — no side query needed.
    expect(mockTenantMaybeSingle).not.toHaveBeenCalled();
  });

  it('5. tenant claim manomesso (tenant non esistente) → DENY', async () => {
    mockUser({ kora_role: 'WORKER', kora_tenant_id: TENANT_ID, kora_worker_id: WORKER_ID, kora_status: 'active' });
    mockWorkerIdentityRow({ id: WORKER_ID, tenant_id: TENANT_ID, status: 'active' });
    mockTenantRow(null); // no matching tenant row at all

    const { requireWorkerUser } = await import('@/lib/auth/kora-session');
    const result = await requireWorkerUser();

    expect(await isDenied(result, 403)).toBe(true);
  });

  it('6. worker claim manomesso (worker_identity non esistente) → DENY', async () => {
    mockUser({ kora_role: 'WORKER', kora_tenant_id: TENANT_ID, kora_worker_id: WORKER_ID, kora_status: 'active' });
    mockWorkerIdentityRow(null);

    const { requireWorkerUser } = await import('@/lib/auth/kora-session');
    const result = await requireWorkerUser();

    expect(await isDenied(result, 403)).toBe(true);
    expect(mockTenantMaybeSingle).not.toHaveBeenCalled();
  });

  it('7. mapping cross-tenant (worker_identity.tenant_id ≠ claim kora_tenant_id) → DENY', async () => {
    mockUser({ kora_role: 'WORKER', kora_tenant_id: TENANT_ID, kora_worker_id: WORKER_ID, kora_status: 'active' });
    mockWorkerIdentityRow({ id: WORKER_ID, tenant_id: OTHER_TENANT_ID, status: 'active' });

    const { requireWorkerUser } = await import('@/lib/auth/kora-session');
    const result = await requireWorkerUser();

    expect(await isDenied(result, 403)).toBe(true);
    expect(mockTenantMaybeSingle).not.toHaveBeenCalled();
  });

  it('8. anon (nessuna sessione) → DENY (401)', async () => {
    mockNoUser();

    const { requireWorkerUser } = await import('@/lib/auth/kora-session');
    const result = await requireWorkerUser();

    expect(await isDenied(result, 401)).toBe(true);
    expect(mockWorkerIdentityMaybeSingle).not.toHaveBeenCalled();
    expect(mockTenantMaybeSingle).not.toHaveBeenCalled();
  });

  it.each(['COMPANY_ADMIN', 'PARTNER', 'KORA_ADMIN', 'DEMO_VIEWER'])(
    '9-12. ruolo %s → DENY (403), nessuna query DB (role check fallisce per primo)',
    async (role) => {
      mockUser({ kora_role: role });

      const { requireWorkerUser } = await import('@/lib/auth/kora-session');
      const result = await requireWorkerUser();

      expect(await isDenied(result, 403)).toBe(true);
      expect(mockWorkerIdentityMaybeSingle).not.toHaveBeenCalled();
      expect(mockTenantMaybeSingle).not.toHaveBeenCalled();
    },
  );

  it('errore DB (query throws) → fail-closed 500, non 200', async () => {
    mockUser({ kora_role: 'WORKER', kora_tenant_id: TENANT_ID, kora_worker_id: WORKER_ID, kora_status: 'active' });
    mockWorkerIdentityMaybeSingle.mockRejectedValue(new Error('connection reset'));

    const { requireWorkerUser } = await import('@/lib/auth/kora-session');
    const result = await requireWorkerUser();

    expect(await isDenied(result, 500)).toBe(true);
  });

  it('nessun side effect: la funzione non esegue mai insert/update/delete — solo query .eq().maybeSingle()', async () => {
    mockUser({ kora_role: 'WORKER', kora_tenant_id: TENANT_ID, kora_worker_id: WORKER_ID, kora_status: 'active' });
    mockWorkerIdentityRow({ id: WORKER_ID, tenant_id: TENANT_ID, status: 'active' });
    mockTenantRow({ id: TENANT_ID, is_active: true });

    const { requireWorkerUser } = await import('@/lib/auth/kora-session');
    await requireWorkerUser();

    // Only the two expected read queries occurred, exactly once each.
    expect(mockWorkerIdentityMaybeSingle).toHaveBeenCalledTimes(1);
    expect(mockTenantMaybeSingle).toHaveBeenCalledTimes(1);
  });
});

describe('PILOT-TRUST-04 — app/worker/layout.tsx blocks a suspended-tenant worker', () => {
  it('redirects to /login when requireWorkerUser denies for a suspended tenant (getCurrentWorkerUser → null)', async () => {
    // getCurrentWorkerUser() itself calls the real requireWorkerUser() — same
    // mocked I/O boundary as above proves the wiring, not a re-mock of kora-session.
    mockUser({ kora_role: 'WORKER', kora_tenant_id: TENANT_ID, kora_worker_id: WORKER_ID, kora_status: 'active' });
    mockWorkerIdentityRow({ id: WORKER_ID, tenant_id: TENANT_ID, status: 'active' });
    mockTenantRow({ id: TENANT_ID, is_active: false });

    const { default: WorkerLayout } = await import('@/app/worker/layout');
    await expect(WorkerLayout({ children: 'WORKSPACE_CONTENT' as unknown as React.ReactNode })).rejects.toThrow('NEXT_REDIRECT:/login');

    const { redirect } = await import('next/navigation');
    expect(redirect).toHaveBeenCalledTimes(1);
    expect(redirect).toHaveBeenCalledWith('/login');
  });
});

describe('PILOT-TRUST-04 — app/worker/commons/page.tsx blocks a suspended-tenant worker', () => {
  it('redirects (does not render commons content) when the tenant is suspended', async () => {
    mockUser({ kora_role: 'WORKER', kora_tenant_id: TENANT_ID, kora_worker_id: WORKER_ID, kora_status: 'active' });
    mockWorkerIdentityRow({ id: WORKER_ID, tenant_id: TENANT_ID, status: 'active' });
    mockTenantRow({ id: TENANT_ID, is_active: false });

    const { default: WorkerCommonsPage } = await import('@/app/worker/commons/page');
    await expect(WorkerCommonsPage()).rejects.toThrow(/NEXT_REDIRECT/);
  });
});

describe('PILOT-TRUST-04 — API worker route (GET /api/worker/profile) blocks a suspended-tenant worker', () => {
  it('returns 403 for a suspended tenant, never reaches profile-lookup logic', async () => {
    mockUser({ kora_role: 'WORKER', kora_tenant_id: TENANT_ID, kora_worker_id: WORKER_ID, kora_status: 'active' });
    mockWorkerIdentityRow({ id: WORKER_ID, tenant_id: TENANT_ID, status: 'active' });
    mockTenantRow({ id: TENANT_ID, is_active: false });

    const { GET } = await import('@/app/api/worker/profile/route');
    const request = new Request('http://localhost/api/worker/profile') as unknown as import('next/server').NextRequest;
    const response = await GET(request);

    expect(response.status).toBe(403);
    // Exactly the two auth-check queries ran — nothing beyond them (no
    // profile-table lookup, no downstream data access after denial).
    expect(mockWorkerIdentityMaybeSingle).toHaveBeenCalledTimes(1);
    expect(mockTenantMaybeSingle).toHaveBeenCalledTimes(1);
    expect(mockRouteWorkerIdentityMaybeSingle).not.toHaveBeenCalled();
    expect(mockRouteProfileMaybeSingle).not.toHaveBeenCalled();
  });

  it('returns non-403 for an active worker + active tenant (no regression)', async () => {
    mockUser({ kora_role: 'WORKER', kora_tenant_id: TENANT_ID, kora_worker_id: WORKER_ID, kora_status: 'active' });
    mockWorkerIdentityRow({ id: WORKER_ID, tenant_id: TENANT_ID, status: 'active' });
    mockTenantRow({ id: TENANT_ID, is_active: true });

    const { GET } = await import('@/app/api/worker/profile/route');
    const request = new Request('http://localhost/api/worker/profile') as unknown as import('next/server').NextRequest;
    const response = await GET(request);

    expect(response.status).not.toBe(403);
    expect(response.status).not.toBe(401);
  });
});
