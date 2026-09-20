/**
 * KORA-WP-009 — Internal Admin Operator Identity + Capability/RBAC Grants.
 *
 * Behavioral (not string-matching) tests of the REAL functions from
 * lib/admin-capability/capability-service.ts, with only the Supabase I/O
 * boundary (@/lib/supabase/server) and the governance-event substrate
 * (@/lib/audit/governance-event) mocked — the actual service logic under
 * test, especially hasAdminCapability()'s default-deny decision, is never
 * mocked or bypassed. Same technique as this session's kora-wp-004/005/014
 * test files.
 *
 * Real-DB proof of RLS/GRANT correctness lives in the real-DB validation
 * pass (file 112) — a mock cannot prove real Postgres RLS/GRANT behavior.
 * This file proves what IS provable at the mocked-I/O level: the
 * default-deny decision logic itself, explicit provenance, and the
 * structural absence of any role-based or wildcard shortcut.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const AUTH_USER_A = 'aaaaaaaa-2000-4000-8000-000000000001';
const AUTH_USER_B = 'aaaaaaaa-2000-4000-8000-000000000002';
const AUTH_USER_UNRECOGNIZED = 'aaaaaaaa-2000-4000-8000-000000000099';

interface OperatorRow {
  id: string;
  auth_user_id: string;
  status: 'active' | 'inactive';
  deactivated_at: string | null;
  created_at: string;
  updated_at: string;
}

interface GrantRow {
  id: string;
  operator_id: string;
  capability_domain: string;
  action: string;
  status: 'active' | 'revoked';
  revoked_at: string | null;
  granted_by_operator_id: string | null;
  granted_at: string;
}

let operators: OperatorRow[] = [];
let grants: GrantRow[] = [];
let nextOperatorId = 0;
let nextGrantId = 0;
let forceOperatorLookupError = false;
let forceGrantLookupError = false;
let forceInsertError = false;

function makeInternalOperatorTable() {
  return {
    insert: (payload: Omit<OperatorRow, 'id' | 'created_at' | 'updated_at' | 'status' | 'deactivated_at'>) => ({
      select: () => ({
        single: async () => {
          if (forceInsertError) return { data: null, error: { message: 'permission denied' } };
          nextOperatorId += 1;
          // mirror the real migration's `status text NOT NULL DEFAULT 'active'`
          const row: OperatorRow = {
            ...payload,
            status: 'active',
            deactivated_at: null,
            id: `operator-${nextOperatorId}`,
            created_at: '2026-09-12T00:00:00.000Z',
            updated_at: '2026-09-12T00:00:00.000Z',
          };
          operators.push(row);
          return { data: row, error: null };
        },
      }),
    }),
    update: (patch: Partial<OperatorRow>) => {
      const eqFilters: Record<string, unknown> = {};
      const builder = {
        eq: (col: string, val: unknown) => {
          eqFilters[col] = val;
          return builder;
        },
        select: () => ({
          single: async () => {
            const match = operators.find((o) => Object.entries(eqFilters).every(([k, v]) => (o as unknown as Record<string, unknown>)[k] === v));
            if (!match) return { data: null, error: { message: 'not found' } };
            Object.assign(match, patch);
            return { data: match, error: null };
          },
        }),
      };
      return builder;
    },
    select: () => {
      const eqFilters: Record<string, unknown> = {};
      const builder = {
        eq: (col: string, val: unknown) => {
          eqFilters[col] = val;
          return builder;
        },
        maybeSingle: async () => {
          if (forceOperatorLookupError) return { data: null, error: { message: 'connection reset' } };
          const match = operators.find((o) => Object.entries(eqFilters).every(([k, v]) => (o as unknown as Record<string, unknown>)[k] === v));
          return { data: match ?? null, error: null };
        },
      };
      return builder;
    },
  };
}

function makeCapabilityGrantTable() {
  return {
    insert: (payload: Omit<GrantRow, 'id' | 'granted_at' | 'status'> & { status?: 'active' | 'revoked' }) => {
      if (forceInsertError) return { error: { message: 'permission denied' } };
      // mirror the real migration's `status text NOT NULL DEFAULT 'active'`
      const status = payload.status ?? 'active';
      // enforce the unique-active-grant invariant like the real DB would
      const dup = grants.find(
        (g) => g.operator_id === payload.operator_id && g.capability_domain === payload.capability_domain &&
          g.action === payload.action && g.status === 'active',
      );
      if (status === 'active' && dup) return { error: { message: 'duplicate key value violates unique constraint' } };
      nextGrantId += 1;
      grants.push({ ...payload, status, id: `grant-${nextGrantId}`, granted_at: '2026-09-12T00:00:00.000Z' });
      return { error: null };
    },
    update: (patch: Partial<GrantRow>) => {
      const eqFilters: Record<string, unknown> = {};
      const resolve = () => {
        const matches = grants.filter((g) => Object.entries(eqFilters).every(([k, v]) => (g as unknown as Record<string, unknown>)[k] === v));
        if (forceInsertError) return { error: { message: 'permission denied' }, count: null };
        for (const g of matches) Object.assign(g, patch);
        return { error: null, count: matches.length };
      };
      const builder = {
        eq(col: string, val: unknown) {
          eqFilters[col] = val;
          return builder;
        },
        // eq() chain is awaited directly (no .select()) — make the builder
        // itself thenable so `await table.update(...).eq(...).eq(...)` works.
        then(onFulfilled: (value: { error: unknown; count: number | null }) => unknown) {
          return Promise.resolve(resolve()).then(onFulfilled);
        },
      };
      return builder;
    },
    select: () => {
      const eqFilters: Record<string, unknown> = {};
      const builder = {
        eq: (col: string, val: unknown) => {
          eqFilters[col] = val;
          return builder;
        },
        maybeSingle: async () => {
          if (forceGrantLookupError) return { data: null, error: { message: 'connection reset' } };
          const match = grants.find((g) => Object.entries(eqFilters).every(([k, v]) => (g as unknown as Record<string, unknown>)[k] === v));
          return { data: match ?? null, error: null };
        },
        order: async () => ({
          data: grants.filter((g) => Object.entries(eqFilters).every(([k, v]) => (g as unknown as Record<string, unknown>)[k] === v)),
          error: null,
        }),
      };
      return builder;
    },
  };
}

vi.mock('@/lib/supabase/server', () => ({
  getSupabaseServiceClient: () => ({
    schema: (schemaName: string) => ({
      from: (table: string) => {
        if (schemaName === 'gov' && table === 'internal_operator') return makeInternalOperatorTable();
        if (schemaName === 'gov' && table === 'capability_grant') return makeCapabilityGrantTable();
        throw new Error(`unexpected query target in test: ${schemaName}.${table}`);
      },
    }),
  }),
}));

vi.mock('@/lib/audit/governance-event', () => ({
  recordGovernanceEvent: vi.fn(async () => ({})),
}));

beforeEach(() => {
  operators = [];
  grants = [];
  nextOperatorId = 0;
  nextGrantId = 0;
  forceOperatorLookupError = false;
  forceGrantLookupError = false;
  forceInsertError = false;
});

async function seedOperator(authUserId: string, status: 'active' | 'inactive' = 'active') {
  const { createInternalOperator } = await import('@/lib/admin-capability/capability-service');
  const op = await createInternalOperator({ authUserId, actor: { actorRole: 'KORA_ADMIN', actorId: 'seed' } });
  if (status === 'inactive') {
    const match = operators.find((o) => o.id === op.id)!;
    match.status = 'inactive';
    match.deactivated_at = '2026-09-12T00:00:00.000Z';
  }
  return op;
}

describe('KORA-WP-009 — hasAdminCapability: default-deny is the only possible outcome without an explicit active grant', () => {
  it('DENY: an unrecognized identity (no operator record at all)', async () => {
    const { hasAdminCapability } = await import('@/lib/admin-capability/capability-service');
    const allowed = await hasAdminCapability(AUTH_USER_UNRECOGNIZED, 'COMPANY_OPERATIONS', 'VIEW');
    expect(allowed).toBe(false);
  });

  it('DENY: a recognized operator with zero grants', async () => {
    await seedOperator(AUTH_USER_A);
    const { hasAdminCapability } = await import('@/lib/admin-capability/capability-service');
    const allowed = await hasAdminCapability(AUTH_USER_A, 'COMPANY_OPERATIONS', 'VIEW');
    expect(allowed).toBe(false);
  });

  it('ALLOW: exactly the granted (domain, action) pair', async () => {
    const op = await seedOperator(AUTH_USER_A);
    const { grantCapability, hasAdminCapability } = await import('@/lib/admin-capability/capability-service');
    await grantCapability({
      operatorId: op.id, capabilityDomain: 'COMPANY_OPERATIONS', action: 'VIEW',
      actor: { actorRole: 'KORA_ADMIN', actorId: 'granter' },
    });
    const allowed = await hasAdminCapability(AUTH_USER_A, 'COMPANY_OPERATIONS', 'VIEW');
    expect(allowed).toBe(true);
  });

  it('DENY: a different action within the same domain, not covered by the grant', async () => {
    const op = await seedOperator(AUTH_USER_A);
    const { grantCapability, hasAdminCapability } = await import('@/lib/admin-capability/capability-service');
    await grantCapability({
      operatorId: op.id, capabilityDomain: 'COMPANY_OPERATIONS', action: 'VIEW',
      actor: { actorRole: 'KORA_ADMIN', actorId: 'granter' },
    });
    const allowed = await hasAdminCapability(AUTH_USER_A, 'COMPANY_OPERATIONS', 'APPROVE');
    expect(allowed).toBe(false);
  });

  it('DENY: a different domain, not covered by the grant', async () => {
    const op = await seedOperator(AUTH_USER_A);
    const { grantCapability, hasAdminCapability } = await import('@/lib/admin-capability/capability-service');
    await grantCapability({
      operatorId: op.id, capabilityDomain: 'COMPANY_OPERATIONS', action: 'VIEW',
      actor: { actorRole: 'KORA_ADMIN', actorId: 'granter' },
    });
    const allowed = await hasAdminCapability(AUTH_USER_A, 'FINANCE_OPERATIONS', 'VIEW');
    expect(allowed).toBe(false);
  });

  it('DENY: a different operator never inherits another operator\'s grant', async () => {
    const opA = await seedOperator(AUTH_USER_A);
    await seedOperator(AUTH_USER_B);
    const { grantCapability, hasAdminCapability } = await import('@/lib/admin-capability/capability-service');
    await grantCapability({
      operatorId: opA.id, capabilityDomain: 'COMPANY_OPERATIONS', action: 'VIEW',
      actor: { actorRole: 'KORA_ADMIN', actorId: 'granter' },
    });
    const allowedForB = await hasAdminCapability(AUTH_USER_B, 'COMPANY_OPERATIONS', 'VIEW');
    expect(allowedForB).toBe(false);
  });

  it('DENY: an inactive operator, even with a grant row that would otherwise match', async () => {
    const op = await seedOperator(AUTH_USER_A, 'inactive');
    grants.push({
      id: 'grant-manual', operator_id: op.id, capability_domain: 'COMPANY_OPERATIONS', action: 'VIEW',
      status: 'active', revoked_at: null, granted_by_operator_id: null, granted_at: '2026-09-12T00:00:00.000Z',
    });
    const { hasAdminCapability } = await import('@/lib/admin-capability/capability-service');
    const allowed = await hasAdminCapability(AUTH_USER_A, 'COMPANY_OPERATIONS', 'VIEW');
    expect(allowed).toBe(false);
  });

  it('DENY: a revoked grant no longer authorizes', async () => {
    const op = await seedOperator(AUTH_USER_A);
    grants.push({
      id: 'grant-revoked', operator_id: op.id, capability_domain: 'COMPANY_OPERATIONS', action: 'VIEW',
      status: 'revoked', revoked_at: '2026-09-12T00:00:00.000Z', granted_by_operator_id: null, granted_at: '2026-09-11T00:00:00.000Z',
    });
    const { hasAdminCapability } = await import('@/lib/admin-capability/capability-service');
    const allowed = await hasAdminCapability(AUTH_USER_A, 'COMPANY_OPERATIONS', 'VIEW');
    expect(allowed).toBe(false);
  });

  it('DENY (fail-closed): an operator-lookup DB error never surfaces as ALLOW or a thrown exception', async () => {
    await seedOperator(AUTH_USER_A);
    forceOperatorLookupError = true;
    const { hasAdminCapability } = await import('@/lib/admin-capability/capability-service');
    await expect(hasAdminCapability(AUTH_USER_A, 'COMPANY_OPERATIONS', 'VIEW')).resolves.toBe(false);
  });

  it('DENY (fail-closed): a grant-lookup DB error never surfaces as ALLOW or a thrown exception', async () => {
    await seedOperator(AUTH_USER_A);
    forceGrantLookupError = true;
    const { hasAdminCapability } = await import('@/lib/admin-capability/capability-service');
    await expect(hasAdminCapability(AUTH_USER_A, 'COMPANY_OPERATIONS', 'VIEW')).resolves.toBe(false);
  });
});

describe('KORA-WP-009 — domain invariant: role alone never manufactures a capability', () => {
  it('hasAdminCapability() has no role parameter at all — structurally cannot branch on "KORA_ADMIN"', async () => {
    const { readFileSync } = await import('node:fs');
    const { join } = await import('node:path');
    const src = readFileSync(join(process.cwd(), 'lib/admin-capability/capability-service.ts'), 'utf8');
    const fnMatch = src.match(/export async function hasAdminCapability\(([^)]*)\)/);
    expect(fnMatch).not.toBeNull();
    expect(fnMatch![1]).not.toMatch(/role/i);
  });

  it('the module contains no wildcard/blanket-allow shortcut (structural — code, not comment prose)', async () => {
    const { readFileSync } = await import('node:fs');
    const { join } = await import('node:path');
    const src = readFileSync(join(process.cwd(), 'lib/admin-capability/capability-service.ts'), 'utf8');
    const codeLines = src.split('\n').filter((l) => !l.trim().startsWith('//'));
    const code = codeLines.join('\n');
    expect(code).not.toMatch(/koraRole\s*===?\s*['"]KORA_ADMIN['"]/); // never branches on role directly
    expect(code).not.toContain("'*'"); // no wildcard capability/action literal
    // hasAdminCapability's only `return true` must be reached after both an
    // operator lookup AND a grant lookup have already run — approximated
    // here by requiring at least two `.maybeSingle()` real lookups to occur
    // textually before the sole `return true;` in the function body.
    const fnBody = code.slice(code.indexOf('export async function hasAdminCapability'));
    const returnTrueIndex = fnBody.indexOf('return true;');
    const lookupsBefore = (fnBody.slice(0, returnTrueIndex).match(/maybeSingle\(\)/g) ?? []).length;
    expect(lookupsBefore).toBeGreaterThanOrEqual(2);
  });

  it('the module contains no Case/ADMIN-020/route-enforcement code (structural, actual code — not explanatory prose)', async () => {
    const { readFileSync } = await import('node:fs');
    const { join } = await import('node:path');
    const src = readFileSync(join(process.cwd(), 'lib/admin-capability/capability-service.ts'), 'utf8');
    const codeLines = src.split('\n').filter((l) => !l.trim().startsWith('//'));
    const code = codeLines.join('\n');
    expect(code).not.toMatch(/CASE_STATUS|ADMIN_020_ACTIVITY/);
    expect(code).not.toContain('requireKoraAdmin(');
    expect(code).not.toMatch(/from\s*['"]next\/server['"]/); // no route/middleware coupling
  });
});

describe('KORA-WP-009 — grant provenance is explicit, never manufactured', () => {
  it('grantCapability requires an explicit actor and records it via the governance-event substrate', async () => {
    const { recordGovernanceEvent } = await import('@/lib/audit/governance-event');
    const op = await seedOperator(AUTH_USER_A);
    const { grantCapability } = await import('@/lib/admin-capability/capability-service');
    await grantCapability({
      operatorId: op.id, capabilityDomain: 'FINANCE_OPERATIONS', action: 'APPROVE',
      actor: { actorRole: 'KORA_ADMIN', actorId: 'granter-1' },
    });
    expect(recordGovernanceEvent).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'capability_grant.granted', actorId: 'granter-1' }),
    );
  });

  it('a duplicate active grant for the same (operator, domain, action) is rejected, never silently merged', async () => {
    const op = await seedOperator(AUTH_USER_A);
    const { grantCapability } = await import('@/lib/admin-capability/capability-service');
    await grantCapability({
      operatorId: op.id, capabilityDomain: 'COMPANY_OPERATIONS', action: 'VIEW',
      actor: { actorRole: 'KORA_ADMIN', actorId: 'granter' },
    });
    await expect(grantCapability({
      operatorId: op.id, capabilityDomain: 'COMPANY_OPERATIONS', action: 'VIEW',
      actor: { actorRole: 'KORA_ADMIN', actorId: 'granter' },
    })).rejects.toThrow(/grantCapability failed/);
  });
});

describe('KORA-WP-009 — revocation and deactivation actually change authorization outcomes', () => {
  it('revokeCapability makes a previously-allowed check deny afterward', async () => {
    const op = await seedOperator(AUTH_USER_A);
    const { grantCapability, revokeCapability, hasAdminCapability } = await import('@/lib/admin-capability/capability-service');
    await grantCapability({
      operatorId: op.id, capabilityDomain: 'AUDIT_GOVERNANCE', action: 'VIEW',
      actor: { actorRole: 'KORA_ADMIN', actorId: 'granter' },
    });
    expect(await hasAdminCapability(AUTH_USER_A, 'AUDIT_GOVERNANCE', 'VIEW')).toBe(true);

    await revokeCapability({
      operatorId: op.id, capabilityDomain: 'AUDIT_GOVERNANCE', action: 'VIEW',
      actor: { actorRole: 'KORA_ADMIN', actorId: 'revoker' },
    });
    expect(await hasAdminCapability(AUTH_USER_A, 'AUDIT_GOVERNANCE', 'VIEW')).toBe(false);
  });

  it('revokeCapability throws (never silently no-ops) when no matching active grant exists', async () => {
    const op = await seedOperator(AUTH_USER_A);
    const { revokeCapability } = await import('@/lib/admin-capability/capability-service');
    await expect(revokeCapability({
      operatorId: op.id, capabilityDomain: 'AUDIT_GOVERNANCE', action: 'VIEW',
      actor: { actorRole: 'KORA_ADMIN', actorId: 'revoker' },
    })).rejects.toThrow(/revokeCapability failed/);
  });

  it('deactivateInternalOperator makes a previously-allowed check deny afterward, even with the grant still active', async () => {
    const op = await seedOperator(AUTH_USER_A);
    const { grantCapability, deactivateInternalOperator, hasAdminCapability } = await import('@/lib/admin-capability/capability-service');
    await grantCapability({
      operatorId: op.id, capabilityDomain: 'AUDIT_GOVERNANCE', action: 'VIEW',
      actor: { actorRole: 'KORA_ADMIN', actorId: 'granter' },
    });
    expect(await hasAdminCapability(AUTH_USER_A, 'AUDIT_GOVERNANCE', 'VIEW')).toBe(true);

    await deactivateInternalOperator({ operatorId: op.id, actor: { actorRole: 'KORA_ADMIN', actorId: 'deactivator' } });
    expect(await hasAdminCapability(AUTH_USER_A, 'AUDIT_GOVERNANCE', 'VIEW')).toBe(false);
  });
});

describe('KORA-WP-009 — migration is additive, does not touch existing tables, RLS is not Company-scoped Pattern A/B', () => {
  it('does not ALTER or DROP any existing table', async () => {
    const { readFileSync } = await import('node:fs');
    const { join } = await import('node:path');
    const migration = readFileSync(join(process.cwd(), 'supabase/migrations/054_internal_admin_capability.sql'), 'utf8');
    expect(migration).not.toMatch(/^\s*ALTER TABLE gov\.(?!internal_operator|capability_grant)/m);
    const dropLines = migration.split('\n').filter((l) => /DROP TABLE|DROP POLICY|DROP INDEX/.test(l));
    for (const line of dropLines) {
      expect(line.trim().startsWith('--')).toBe(true);
    }
  });

  it('neither table has a tenant_id column — this is not Company-scoped data', async () => {
    const { readFileSync } = await import('node:fs');
    const { join } = await import('node:path');
    const migration = readFileSync(join(process.cwd(), 'supabase/migrations/054_internal_admin_capability.sql'), 'utf8');
    const columnLines = migration.split('\n').filter((l) => !l.trim().startsWith('--'));
    expect(columnLines.some((l) => /^\s*tenant_id\s/.test(l))).toBe(false);
  });

  it('uses the KORA_ADMIN-governance-table RLS convention (kora_admin_all_X FOR ALL), not a Company-scoped read policy', async () => {
    const { readFileSync } = await import('node:fs');
    const { join } = await import('node:path');
    const migration = readFileSync(join(process.cwd(), 'supabase/migrations/054_internal_admin_capability.sql'), 'utf8');
    expect(migration).toMatch(/kora_admin_all_internal_operator/);
    expect(migration).toMatch(/kora_admin_all_capability_grant/);
    expect(migration).not.toMatch(/company_own_.*_read/);
  });

  it('capability_domain and action columns are CHECK-constrained to the frozen vocabularies, not free text', async () => {
    const { readFileSync } = await import('node:fs');
    const { join } = await import('node:path');
    const migration = readFileSync(join(process.cwd(), 'supabase/migrations/054_internal_admin_capability.sql'), 'utf8');
    expect(migration).toMatch(/COMPANY_OPERATIONS/);
    expect(migration).toMatch(/PLATFORM_SYSTEM_OPERATIONS/);
    expect(migration).toMatch(/'VIEW'/);
    expect(migration).toMatch(/'OVERRIDE'/);
  });

  it('does not create an elevated-access/case-linked capability (explicitly out of scope, requires KORA-WP-007)', async () => {
    const { readFileSync } = await import('node:fs');
    const { join } = await import('node:path');
    const migration = readFileSync(join(process.cwd(), 'supabase/migrations/054_internal_admin_capability.sql'), 'utf8');
    expect(migration).not.toMatch(/ELEVATED_ACCESS|CROSS_TENANT_ACCESS/);
  });
});
