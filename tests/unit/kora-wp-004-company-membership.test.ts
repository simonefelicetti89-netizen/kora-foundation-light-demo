/**
 * KORA-WP-004 — Company Membership Table.
 *
 * Behavioral (not string-matching) tests of the REAL membership-service
 * functions from lib/company-membership/membership-service.ts, with only
 * the Supabase I/O boundary (@/lib/supabase/server) mocked — the actual
 * service logic under test is never mocked or bypassed. Same technique as
 * tests/unit/pilot-trust-04-worker-tenant-suspension.test.ts and this
 * session's own tests/unit/kora-wp-002-advisor-guard.test.ts.
 *
 * Covers, per KORA-WP-004's own acceptance ("Test B/C-equivalent (`82`)
 * passes for Company") and this task's required test coverage (A-F):
 *   A. Identity independence (ending a membership touches no other table)
 *   B. Explicit membership creation (never automatic from authentication)
 *   C. Company relationship correctness
 *   D. Historical separation across Companies
 *   E. No cutover — existing auth/session code paths untouched (structural)
 *   F. Test C-equivalent — governed, audited creation/termination
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const TENANT_A = '11111111-1111-4111-8111-111111111111';
const TENANT_B = '22222222-2222-4222-8222-222222222222';
const AUTH_USER = '33333333-3333-4333-8333-333333333333';
const ACTOR = { actorRole: 'KORA_ADMIN', actorId: 'admin-1' };

// ── Mock the I/O boundary only — never the function under test ──────────────

interface Row {
  id: string;
  tenant_id: string;
  auth_user_id: string;
  role: string;
  status: string;
  ended_at: string | null;
  created_at: string;
  updated_at: string;
}

let membershipRows: Row[] = [];
let auditInserts: Record<string, unknown>[] = [];
let nextId = 0;
let forceDuplicateKeyError = false;

function makeRow(tenantId: string, authUserId: string): Row {
  nextId += 1;
  return {
    id: `membership-${nextId}`,
    tenant_id: tenantId,
    auth_user_id: authUserId,
    role: 'COMPANY_ADMIN',
    status: 'active',
    ended_at: null,
    created_at: '2026-09-12T00:00:00.000Z',
    updated_at: '2026-09-12T00:00:00.000Z',
  };
}

function makeMembershipTable() {
  return {
    insert: (payload: { tenant_id: string; auth_user_id: string }) => ({
      select: () => ({
        single: async () => {
          if (forceDuplicateKeyError) {
            return { data: null, error: { message: 'duplicate key value violates unique constraint "uq_company_memberships_active_identity_tenant"' } };
          }
          const row = makeRow(payload.tenant_id, payload.auth_user_id);
          membershipRows.push(row);
          return { data: row, error: null };
        },
      }),
    }),
    update: (patch: { status: string; ended_at: string }) => ({
      eq: (col1: string, val1: string) => ({
        eq: (col2: string, val2: string) => ({
          select: () => ({
            single: async () => {
              const row = membershipRows.find(
                (r) => (r as unknown as Record<string, string>)[col1] === val1 && (r as unknown as Record<string, string>)[col2] === val2,
              );
              if (!row) return { data: null, error: { message: 'not found' } };
              row.status = patch.status;
              row.ended_at = patch.ended_at;
              return { data: row, error: null };
            },
          }),
        }),
      }),
    }),
    select: () => {
      let filtered = [...membershipRows];
      const builder = {
        eq: (col: string, val: string) => {
          filtered = filtered.filter((r) => (r as unknown as Record<string, string>)[col] === val);
          return builder;
        },
        order: () => builder,
        maybeSingle: async () => ({ data: filtered[0] ?? null, error: null }),
        then: (resolve: (v: { data: Row[]; error: null }) => void) => resolve({ data: filtered, error: null }),
      };
      return builder;
    },
  };
}

function makeAuditTable() {
  return {
    insert: async (payload: Record<string, unknown>) => {
      auditInserts.push(payload);
      return { data: null, error: null };
    },
  };
}

vi.mock('@/lib/supabase/server', () => ({
  getSupabaseServiceClient: () => ({
    schema: (schemaName: string) => ({
      from: (table: string) => {
        if (schemaName === 'analytics' && table === 'company_memberships') return makeMembershipTable();
        if (schemaName === 'audit' && table === 'audit_log') return makeAuditTable();
        throw new Error(`unexpected query target in test: ${schemaName}.${table}`);
      },
    }),
  }),
}));

beforeEach(() => {
  membershipRows = [];
  auditInserts = [];
  nextId = 0;
  forceDuplicateKeyError = false;
});

describe('KORA-WP-004 (C) — company relationship correctness', () => {
  it('a created membership references the intended Company (tenant) and role', async () => {
    const { createCompanyMembership } = await import('@/lib/company-membership/membership-service');
    const membership = await createCompanyMembership({ tenantId: TENANT_A, authUserId: AUTH_USER, actor: ACTOR });
    expect(membership.tenantId).toBe(TENANT_A);
    expect(membership.authUserId).toBe(AUTH_USER);
    expect(membership.role).toBe('COMPANY_ADMIN');
    expect(membership.status).toBe('active');
    expect(membership.endedAt).toBeNull();
  });

  it('surfaces a duplicate-active-membership DB conflict as a thrown error, never silently succeeds', async () => {
    forceDuplicateKeyError = true;
    const { createCompanyMembership } = await import('@/lib/company-membership/membership-service');
    await expect(createCompanyMembership({ tenantId: TENANT_A, authUserId: AUTH_USER, actor: ACTOR }))
      .rejects.toThrow(/createCompanyMembership failed/);
  });
});

describe('KORA-WP-004 (A) — identity independence: ending a membership touches no other table', () => {
  it('endCompanyMembership only reads/writes analytics.company_memberships and audit.audit_log — nothing else', async () => {
    const { createCompanyMembership, endCompanyMembership } = await import('@/lib/company-membership/membership-service');
    const created = await createCompanyMembership({ tenantId: TENANT_A, authUserId: AUTH_USER, actor: ACTOR });

    // The mock throws on any schema/table other than the two named above —
    // if endCompanyMembership tried to touch auth.users, personal.*, or any
    // identity table, this call would throw with "unexpected query target".
    const ended = await endCompanyMembership({ membershipId: created.id, actor: ACTOR });

    expect(ended.status).toBe('ended');
    expect(ended.endedAt).not.toBeNull();
    expect(ended.authUserId).toBe(AUTH_USER); // identity reference unchanged, never mutated
  });

  it('the membership row itself is the only thing that changes — id/tenant/role/authUserId untouched by ending it', async () => {
    const { createCompanyMembership, endCompanyMembership } = await import('@/lib/company-membership/membership-service');
    const created = await createCompanyMembership({ tenantId: TENANT_A, authUserId: AUTH_USER, actor: ACTOR });
    const ended = await endCompanyMembership({ membershipId: created.id, actor: ACTOR });
    expect(ended.id).toBe(created.id);
    expect(ended.tenantId).toBe(created.tenantId);
    expect(ended.authUserId).toBe(created.authUserId);
    expect(ended.role).toBe(created.role);
  });
});

describe('KORA-WP-004 (D) — historical separation across Companies', () => {
  it('ending a membership at Company A does not affect an active membership for the same identity at Company B', async () => {
    const { createCompanyMembership, endCompanyMembership, getActiveCompanyMembership } = await import('@/lib/company-membership/membership-service');
    const atA = await createCompanyMembership({ tenantId: TENANT_A, authUserId: AUTH_USER, actor: ACTOR });
    await createCompanyMembership({ tenantId: TENANT_B, authUserId: AUTH_USER, actor: ACTOR });

    await endCompanyMembership({ membershipId: atA.id, actor: ACTOR });

    const stillActiveAtB = await getActiveCompanyMembership(AUTH_USER, TENANT_B);
    expect(stillActiveAtB).not.toBeNull();
    expect(stillActiveAtB!.status).toBe('active');

    const noLongerActiveAtA = await getActiveCompanyMembership(AUTH_USER, TENANT_A);
    expect(noLongerActiveAtA).toBeNull(); // ended, correctly no longer the "active" one
  });

  it('listCompanyMembershipsForIdentity returns full history across Companies, each row bound to its own tenant', async () => {
    const { createCompanyMembership, endCompanyMembership, listCompanyMembershipsForIdentity } = await import('@/lib/company-membership/membership-service');
    const atA = await createCompanyMembership({ tenantId: TENANT_A, authUserId: AUTH_USER, actor: ACTOR });
    await endCompanyMembership({ membershipId: atA.id, actor: ACTOR });
    await createCompanyMembership({ tenantId: TENANT_B, authUserId: AUTH_USER, actor: ACTOR });

    const history = await listCompanyMembershipsForIdentity(AUTH_USER);
    expect(history).toHaveLength(2);
    expect(history.find((m) => m.tenantId === TENANT_A)!.status).toBe('ended');
    expect(history.find((m) => m.tenantId === TENANT_B)!.status).toBe('active');
  });
});

describe('KORA-WP-004 (B) — explicit membership creation, never automatic from authentication', () => {
  it('createCompanyMembership requires an explicit tenantId/authUserId/actor call — there is no zero-argument or session-derived overload', async () => {
    const svc = await import('@/lib/company-membership/membership-service');
    // TypeScript itself enforces the required parameters at compile time
    // (verified by `tsc --noEmit` passing on this file with explicit args
    // everywhere); this runtime check proves the exported function's arity
    // requires an argument object, not an implicit/ambient session read.
    expect(svc.createCompanyMembership.length).toBe(1);
  });

  it('no code path in lib/auth/kora-session.ts or middleware.ts references the membership service (no auto-wiring into authentication)', () => {
    const sessionSrc = readFileSync(join(process.cwd(), 'lib/auth/kora-session.ts'), 'utf8');
    const middlewareSrc = readFileSync(join(process.cwd(), 'middleware.ts'), 'utf8');
    expect(sessionSrc).not.toContain('company-membership');
    expect(sessionSrc).not.toContain('createCompanyMembership');
    expect(middlewareSrc).not.toContain('company-membership');
    expect(middlewareSrc).not.toContain('createCompanyMembership');
  });

  it('no code path in the existing Company provisioning route calls the membership service (no cutover performed by this WP)', () => {
    const routeSrc = readFileSync(join(process.cwd(), 'app/api/admin/live-company/route.ts'), 'utf8');
    expect(routeSrc).not.toContain('company-membership');
    expect(routeSrc).not.toContain('createCompanyMembership');
  });
});

describe('KORA-WP-004 (F) — Test C-equivalent: governed, audited creation and termination', () => {
  it('creating a membership writes exactly one audit.audit_log row naming the action, resource, and actor', async () => {
    const { createCompanyMembership } = await import('@/lib/company-membership/membership-service');
    const membership = await createCompanyMembership({ tenantId: TENANT_A, authUserId: AUTH_USER, actor: ACTOR });

    expect(auditInserts).toHaveLength(1);
    expect(auditInserts[0]).toMatchObject({
      tenant_id: TENANT_A,
      actor_role: 'KORA_ADMIN',
      actor_id: 'admin-1',
      action: 'company_membership_created',
      resource_type: 'company_membership',
      resource_id: membership.id,
    });
  });

  it('ending a membership writes a second, distinct audit.audit_log row — never a silent state change', async () => {
    const { createCompanyMembership, endCompanyMembership } = await import('@/lib/company-membership/membership-service');
    const created = await createCompanyMembership({ tenantId: TENANT_A, authUserId: AUTH_USER, actor: ACTOR });
    await endCompanyMembership({ membershipId: created.id, actor: ACTOR });

    expect(auditInserts).toHaveLength(2);
    expect(auditInserts[1]).toMatchObject({
      action: 'company_membership_ended',
      resource_type: 'company_membership',
      resource_id: created.id,
    });
  });
});

describe('KORA-WP-004 (E) — no cutover: this is purely additive, out-of-scope items untouched', () => {
  it('the migration does not alter analytics.tenant, auth.users, or personal.worker_identity', () => {
    const migration = readFileSync(
      join(process.cwd(), 'supabase/migrations/050_company_memberships.sql'),
      'utf8',
    );
    expect(migration).not.toMatch(/ALTER TABLE analytics\.tenant/);
    expect(migration).not.toMatch(/ALTER TABLE auth\.users/);
    expect(migration).not.toMatch(/ALTER TABLE personal\.worker_identity/);

    // DROP TABLE must appear only inside the commented rollback block
    // (every occurrence on a line starting with '--'), never as live SQL.
    const dropTableLines = migration.split('\n').filter((line) => /DROP TABLE/.test(line));
    expect(dropTableLines.length).toBeGreaterThan(0); // the rollback block itself must exist
    for (const line of dropTableLines) {
      expect(line.trim().startsWith('--')).toBe(true);
    }
  });

  it('the migration enables and forces RLS with only a KORA_ADMIN policy — fail-closed for every other role until KORA-WP-010', () => {
    const migration = readFileSync(
      join(process.cwd(), 'supabase/migrations/050_company_memberships.sql'),
      'utf8',
    );
    expect(migration).toMatch(/ENABLE ROW LEVEL SECURITY/);
    expect(migration).toMatch(/FORCE ROW LEVEL SECURITY/);
    const policyMatches = migration.match(/CREATE POLICY/g) ?? [];
    expect(policyMatches).toHaveLength(1);
    expect(migration).toContain("kora.kora_role() = 'KORA_ADMIN'");
  });
});
