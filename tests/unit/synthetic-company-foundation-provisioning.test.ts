// tests/unit/synthetic-company-foundation-provisioning.test.ts
// Synthetic Company Foundation — behavioral proof for the tenant_kind
// operational-safety guard added to app/api/admin/companies/provision/route.ts.
//
// Unlike tests/unit/b99-provision-credentials.test.ts (structural/file-based
// assertions on this same route), this file mocks the Supabase Admin client
// and actually invokes the route handler, because the property under test —
// "inviteUserByEmail is never called for a non-LIVE tenant" — is a real
// external side effect, not something a text-content check can prove.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const inviteUserByEmail = vi.fn(async () => ({
  data: { user: { id: 'invited-user-id' } },
  error: null as { status?: number; message?: string } | null,
}));
const createUser = vi.fn(async () => ({
  data: { user: { id: 'created-user-id' } as { id: string } | null },
  error: null as { status?: number; message?: string } | null,
}));
const updateUserById = vi.fn(async () => ({ error: null as { message: string } | null }));
const listUsers = vi.fn(async () => ({ data: { users: [] as Array<{ id: string; email: string; app_metadata?: unknown }> }, error: null }));

let existingTenant: { id: string } | null = null;
let nextTenantId = 'tenant-new-id';

vi.mock('@/lib/supabase/server', () => ({
  getSupabaseServiceClient: () => ({
    schema: (_schema: string) => ({
      from: (_table: string) => ({
        select: (_cols: string) => ({
          eq: (_col: string, _val: unknown) => ({
            maybeSingle: async () => ({ data: existingTenant, error: null }),
          }),
        }),
        insert: (_row: unknown) => ({
          select: (_cols: string) => ({
            single: async () => ({ data: { id: nextTenantId }, error: null }),
          }),
        }),
      }),
    }),
    auth: {
      admin: {
        inviteUserByEmail,
        createUser,
        updateUserById,
        listUsers,
      },
    },
  }),
}));

const ADMIN_USER = { email: 'kora-admin@kora.test', koraRole: 'KORA_ADMIN', id: 'kora-admin-1' };

vi.mock('@/lib/auth/kora-session', () => ({
  requireKoraAdmin: vi.fn(async () => ADMIN_USER),
  isKoraAuthError: (v: unknown) => v !== ADMIN_USER,
}));

vi.mock('@/lib/security/origin', () => ({
  assertSameOrigin: () => null,
}));

vi.mock('@/lib/security/rate-limit', () => ({
  assertRateLimit: async () => null,
}));

async function callProvision(body: Record<string, unknown>) {
  const { POST } = await import('@/app/api/admin/companies/provision/route');
  const request = new NextRequest('http://localhost:3000/api/admin/companies/provision', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
  const response = await POST(request);
  const json = await response.json();
  return { status: response.status, json };
}

beforeEach(() => {
  // Route requires SUPABASE_SERVICE_ROLE_KEY to be set (returns 503 otherwise) —
  // any non-empty value satisfies the check; getSupabaseServiceClient itself is mocked above.
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
  inviteUserByEmail.mockClear();
  createUser.mockClear();
  updateUserById.mockClear();
  listUsers.mockClear();
  existingTenant = null;
  nextTenantId = 'tenant-new-id';
  inviteUserByEmail.mockImplementation(async () => ({ data: { user: { id: 'invited-user-id' } }, error: null }));
  createUser.mockImplementation(async () => ({ data: { user: { id: 'created-user-id' } }, error: null }));
});

describe('Synthetic company foundation — provisioning tenant_kind guard', () => {
  it('omitting tenant_kind (existing callers) creates a LIVE tenant and sends a real invite', async () => {
    const { status, json } = await callProvision({
      company_name: 'Acme Live', admin_email: 'admin@acme-live.test',
    });
    expect(status).toBe(200);
    expect(json.tenantKind).toBe('LIVE');
    expect(inviteUserByEmail).toHaveBeenCalledTimes(1);
    expect(createUser).not.toHaveBeenCalled();
  });

  it('explicit tenant_kind: "LIVE" behaves identically to omitting it', async () => {
    const { status, json } = await callProvision({
      company_name: 'Acme Live 2', admin_email: 'admin2@acme-live.test', tenant_kind: 'LIVE',
    });
    expect(status).toBe(200);
    expect(json.tenantKind).toBe('LIVE');
    expect(inviteUserByEmail).toHaveBeenCalledTimes(1);
    expect(createUser).not.toHaveBeenCalled();
  });

  it('tenant_kind: "DEMO" creates a DEMO tenant and never calls inviteUserByEmail', async () => {
    const { status, json } = await callProvision({
      company_name: 'Synthetic Co', admin_email: 'admin@synthetic-co.test', tenant_kind: 'DEMO',
    });
    expect(status).toBe(200);
    expect(json.tenantKind).toBe('DEMO');
    expect(inviteUserByEmail).not.toHaveBeenCalled();
    expect(createUser).toHaveBeenCalledTimes(1);
    expect(createUser).toHaveBeenCalledWith(expect.objectContaining({ email_confirm: true }));
  });

  it('tenant_kind: "TEST" also never calls inviteUserByEmail', async () => {
    const { json } = await callProvision({
      company_name: 'Test Co', admin_email: 'admin@test-co.test', tenant_kind: 'TEST',
    });
    expect(json.tenantKind).toBe('TEST');
    expect(inviteUserByEmail).not.toHaveBeenCalled();
    expect(createUser).toHaveBeenCalledTimes(1);
  });

  it('tenant_kind: "SANDBOX" also never calls inviteUserByEmail', async () => {
    const { json } = await callProvision({
      company_name: 'Sandbox Co', admin_email: 'admin@sandbox-co.test', tenant_kind: 'SANDBOX',
    });
    expect(json.tenantKind).toBe('SANDBOX');
    expect(inviteUserByEmail).not.toHaveBeenCalled();
    expect(createUser).toHaveBeenCalledTimes(1);
  });

  it('an invalid tenant_kind is rejected with 400, before any Supabase call', async () => {
    const { status, json } = await callProvision({
      company_name: 'Bad Co', admin_email: 'admin@bad-co.test', tenant_kind: 'PRODUCTION',
    });
    expect(status).toBe(400);
    expect(json.error).toBeTruthy();
    expect(inviteUserByEmail).not.toHaveBeenCalled();
    expect(createUser).not.toHaveBeenCalled();
  });

  it('DEMO provisioning still sets the identical app_metadata shape (kora_role, kora_tenant_id, kora_status) as LIVE', async () => {
    await callProvision({ company_name: 'Synthetic Co 2', admin_email: 'admin2@synthetic-co.test', tenant_kind: 'DEMO' });
    expect(updateUserById).toHaveBeenCalledWith(
      'created-user-id',
      expect.objectContaining({
        app_metadata: expect.objectContaining({
          kora_role: 'COMPANY_ADMIN',
          kora_tenant_id: nextTenantId,
          kora_status: 'active',
        }),
      }),
    );
  });

  it('DEMO provisioning reuses an already-registered admin identity (no duplicate, no real email) the same way LIVE does', async () => {
    createUser.mockImplementationOnce(async () => ({
      data: { user: null },
      error: { status: 422, message: 'User already registered' },
    }));
    listUsers.mockImplementationOnce(async () => ({
      data: { users: [{ id: 'existing-user-id', email: 'admin@already-there.test', app_metadata: {} }] },
      error: null,
    }));

    const { status, json } = await callProvision({
      company_name: 'Synthetic Co 3', admin_email: 'admin@already-there.test', tenant_kind: 'DEMO',
    });
    expect(status).toBe(200);
    expect(json.adminUserId).toBe('existing-user-id');
    expect(json.inviteStatus).toBe('existing');
    expect(inviteUserByEmail).not.toHaveBeenCalled();
  });
});
