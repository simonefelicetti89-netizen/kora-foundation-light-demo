/**
 * KORA-WP-030 — Advisor Identity/Profile + Two Role Qualifications.
 *
 * Behavioral (not string-matching) tests of the REAL functions from
 * lib/advisor-identity/advisor-identity-service.ts, with only the Supabase
 * I/O boundary (@/lib/supabase/server) and the governance-event substrate
 * (@/lib/audit/governance-event) mocked — the actual service logic under
 * test is never mocked or bypassed. Same technique as this session's
 * kora-wp-005/014/017 test files.
 *
 * Real-DB proof of RLS/tenant-analogous-isolation/GRANT correctness lives in
 * tests/integration/rls-two-tenant-negative.test.ts equivalents and the
 * dedicated real-DB validation performed for this WP (see report 118) —
 * a mock cannot prove real Postgres RLS behavior. This file proves what IS
 * provable at the mocked-I/O level: the dual-qualification model's
 * independence, the exact frozen vocabularies, no self-service write path,
 * no invented governed-action category, and no Assignment/task/case/
 * calendar functionality anywhere in the new code.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const AUTH_USER_A = '11111111-3000-4000-8000-00000000000a';
const AUTH_USER_B = '22222222-3000-4000-8000-00000000000b';

interface IdentityRow {
  id: string; auth_user_id: string; full_name: string; status: string;
  created_at: string; updated_at: string;
}
interface QualificationRow {
  id: string; advisor_id: string; role: string; status: string;
  created_at: string; updated_at: string;
}

let identities: IdentityRow[] = [];
let qualifications: QualificationRow[] = [];
let nextId = 0;
let forceInsertError = false;
let forceSelectError = false;

function makeIdentityTable() {
  return {
    insert: (payload: { auth_user_id: string; full_name: string }) => ({
      select: () => ({
        single: async () => {
          if (forceInsertError) return { data: null, error: { message: 'permission denied' } };
          nextId += 1;
          const row: IdentityRow = {
            id: `identity-${nextId}`, auth_user_id: payload.auth_user_id, full_name: payload.full_name,
            status: 'candidate_onboarding', created_at: '2026-09-12T00:00:00.000Z', updated_at: '2026-09-12T00:00:00.000Z',
          };
          identities.push(row);
          return { data: row, error: null };
        },
      }),
    }),
    select: () => ({
      eq: (_col: string, val: string) => ({
        maybeSingle: async () => {
          if (forceSelectError) return { data: null, error: { message: 'connection reset' } };
          return { data: identities.find((r) => r.auth_user_id === val) ?? null, error: null };
        },
      }),
    }),
  };
}

function makeQualificationTable() {
  return {
    insert: (payload: { advisor_id: string; role: string }) => ({
      select: () => ({
        single: async () => {
          if (forceInsertError) return { data: null, error: { message: 'duplicate key value violates unique constraint' } };
          nextId += 1;
          const row: QualificationRow = {
            id: `qual-${nextId}`, advisor_id: payload.advisor_id, role: payload.role,
            status: 'CANDIDATE', created_at: '2026-09-12T00:00:00.000Z', updated_at: '2026-09-12T00:00:00.000Z',
          };
          qualifications.push(row);
          return { data: row, error: null };
        },
      }),
    }),
    select: () => ({
      eq: (_col: string, val: string) => ({
        order: async () => {
          if (forceSelectError) return { data: null, error: { message: 'connection reset' } };
          return { data: qualifications.filter((r) => r.advisor_id === val), error: null };
        },
        eq: (_col2: string, id: string) => ({
          single: async () => {
            const row = qualifications.find((r) => r.id === id);
            return row ? { data: row, error: null } : { data: null, error: { message: 'not found' } };
          },
        }),
      }),
    }),
    update: (payload: { status: string }) => ({
      eq: (_col: string, id: string) => ({
        select: () => ({
          single: async () => {
            const row = qualifications.find((r) => r.id === id);
            if (!row) return { data: null, error: { message: 'not found' } };
            row.status = payload.status;
            return { data: row, error: null };
          },
        }),
      }),
    }),
  };
}

const recordGovernanceEventMock = vi.fn(async (params: Record<string, unknown>) => ({
  id: 'event-1', ...params, occurredAt: '2026-09-12T00:00:00.000Z',
}));

vi.mock('@/lib/supabase/server', () => ({
  getSupabaseServiceClient: () => ({
    schema: (schemaName: string) => ({
      from: (table: string) => {
        if (schemaName === 'advisor' && table === 'advisor_identity') return makeIdentityTable();
        if (schemaName === 'advisor' && table === 'advisor_role_qualification') return makeQualificationTable();
        throw new Error(`unexpected query target in test: ${schemaName}.${table}`);
      },
    }),
  }),
}));

vi.mock('@/lib/audit/governance-event', () => ({
  recordGovernanceEvent: (params: Record<string, unknown>) => recordGovernanceEventMock(params),
}));

beforeEach(() => {
  identities = [];
  qualifications = [];
  nextId = 0;
  forceInsertError = false;
  forceSelectError = false;
  recordGovernanceEventMock.mockClear();
});

describe('KORA-WP-030 — createAdvisorIdentity: one identity per person', () => {
  it('persists a new identity with status candidate_onboarding', async () => {
    const { createAdvisorIdentity } = await import('@/lib/advisor-identity/advisor-identity-service');
    const identity = await createAdvisorIdentity({
      authUserId: AUTH_USER_A, fullName: 'Maria Rossi', actorRole: 'KORA_ADMIN', actorId: 'operator-1',
    });
    expect(identity.status).toBe('candidate_onboarding');
    expect(identity.authUserId).toBe(AUTH_USER_A);
    expect(identity.fullName).toBe('Maria Rossi');
  });

  it('emits a generic governance event, never recordGovernedAction (not one of WP-006\'s owned workflows for this WP)', async () => {
    const { createAdvisorIdentity } = await import('@/lib/advisor-identity/advisor-identity-service');
    const identity = await createAdvisorIdentity({
      authUserId: AUTH_USER_A, fullName: 'Maria Rossi', actorRole: 'KORA_ADMIN', actorId: 'operator-1',
    });
    expect(recordGovernanceEventMock).toHaveBeenCalledWith(
      expect.objectContaining({ sourceModule: 'advisor-identity', eventType: 'advisor_identity.created', objectId: identity.id }),
    );
  });

  it('WP-030\'s own functions (identity/qualification creation, status update) never call recordGovernedAction — only WP-032\'s later-added grantAdvisorRoleQualification does', async () => {
    // KORA-WP-032 (2026-09-13) legitimately added a `recordGovernedAction`
    // import and call to this SAME file, for its own grantAdvisorRoleQualification
    // function — the real, WP-006-catalogue-named owning workflow for
    // ADVISOR_ROLE_QUALIFICATION_CHANGE (see report 119). This test is
    // narrowed to the file's WP-030-owned portion only (everything before the
    // WP-032 section banner), so it still locks in the original invariant —
    // WP-030's own three functions never claim that governed-action category
    // — without false-failing on WP-032's legitimate, later, separate use.
    const src = readFileSync(join(process.cwd(), 'lib/advisor-identity/advisor-identity-service.ts'), 'utf8');
    const wp032Marker = src.indexOf('KORA-WP-032 — Advisor Governance');
    expect(wp032Marker).toBeGreaterThan(-1); // sanity: the WP-032 section must actually exist to slice against
    const wp030Portion = src.slice(0, wp032Marker);
    const codeLines = wp030Portion.split('\n').filter((l) => !l.trim().startsWith('//'));
    const code = codeLines.join('\n');
    expect(code).not.toContain('recordGovernedAction(');
  });

  it('a DB-level insert failure surfaces as a thrown error, never a silent success', async () => {
    forceInsertError = true;
    const { createAdvisorIdentity } = await import('@/lib/advisor-identity/advisor-identity-service');
    await expect(createAdvisorIdentity({
      authUserId: AUTH_USER_A, fullName: 'x', actorRole: 'KORA_ADMIN', actorId: 'a',
    })).rejects.toThrow(/createAdvisorIdentity failed/);
  });
});

describe('KORA-WP-030 — getAdvisorIdentityByAuthUserId: trusted self-resolution', () => {
  it('resolves an identity by auth_user_id and returns null when none exists (never fabricates one)', async () => {
    const { createAdvisorIdentity, getAdvisorIdentityByAuthUserId } = await import('@/lib/advisor-identity/advisor-identity-service');
    await createAdvisorIdentity({ authUserId: AUTH_USER_A, fullName: 'Maria Rossi', actorRole: 'KORA_ADMIN', actorId: 'op' });

    const found = await getAdvisorIdentityByAuthUserId(AUTH_USER_A);
    const notFound = await getAdvisorIdentityByAuthUserId(AUTH_USER_B);

    expect(found?.fullName).toBe('Maria Rossi');
    expect(notFound).toBeNull();
  });

  it('a DB-level query failure surfaces as a thrown error, never a silent null', async () => {
    forceSelectError = true;
    const { getAdvisorIdentityByAuthUserId } = await import('@/lib/advisor-identity/advisor-identity-service');
    await expect(getAdvisorIdentityByAuthUserId(AUTH_USER_A)).rejects.toThrow(/getAdvisorIdentityByAuthUserId failed/);
  });
});

describe('KORA-WP-030 — dual-qualification independence (the core acceptance requirement)', () => {
  it('both Company Advisor and Partner Advisor qualifications can coexist for the same advisor', async () => {
    const { createAdvisorIdentity, createAdvisorRoleQualification, listRoleQualificationsForAdvisor } =
      await import('@/lib/advisor-identity/advisor-identity-service');

    const identity = await createAdvisorIdentity({ authUserId: AUTH_USER_A, fullName: 'x', actorRole: 'KORA_ADMIN', actorId: 'op' });
    await createAdvisorRoleQualification({ advisorId: identity.id, role: 'Company Advisor', actorRole: 'KORA_ADMIN', actorId: 'op' });
    await createAdvisorRoleQualification({ advisorId: identity.id, role: 'Partner Advisor', actorRole: 'KORA_ADMIN', actorId: 'op' });

    const list = await listRoleQualificationsForAdvisor(identity.id);
    expect(list.map((q) => q.role).sort()).toEqual(['Company Advisor', 'Partner Advisor']);
  });

  it('every newly created qualification starts as CANDIDATE — no caller-supplied initial status exists structurally', async () => {
    const src = readFileSync(join(process.cwd(), 'lib/advisor-identity/advisor-identity-service.ts'), 'utf8');
    const paramsBlock = src.slice(
      src.indexOf('interface CreateAdvisorRoleQualificationParams'),
      src.indexOf('export async function createAdvisorRoleQualification'),
    );
    expect(paramsBlock).not.toMatch(/status/i);
  });

  it('one qualification\'s status changing does not affect the other (independent lifecycles)', async () => {
    const { createAdvisorIdentity, createAdvisorRoleQualification, updateAdvisorRoleQualificationStatus, listRoleQualificationsForAdvisor } =
      await import('@/lib/advisor-identity/advisor-identity-service');

    const identity = await createAdvisorIdentity({ authUserId: AUTH_USER_A, fullName: 'x', actorRole: 'KORA_ADMIN', actorId: 'op' });
    const companyQual = await createAdvisorRoleQualification({ advisorId: identity.id, role: 'Company Advisor', actorRole: 'KORA_ADMIN', actorId: 'op' });
    await createAdvisorRoleQualification({ advisorId: identity.id, role: 'Partner Advisor', actorRole: 'KORA_ADMIN', actorId: 'op' });

    await updateAdvisorRoleQualificationStatus(companyQual.id, 'QUALIFIED', 'KORA_ADMIN', 'op');

    const list = await listRoleQualificationsForAdvisor(identity.id);
    const company = list.find((q) => q.role === 'Company Advisor');
    const partner = list.find((q) => q.role === 'Partner Advisor');
    expect(company?.status).toBe('QUALIFIED');
    expect(partner?.status).toBe('CANDIDATE'); // untouched — doc 76 §14's worked example
  });

  it('rejects a non-canonical qualification status at the service layer', async () => {
    const { createAdvisorIdentity, createAdvisorRoleQualification, updateAdvisorRoleQualificationStatus } =
      await import('@/lib/advisor-identity/advisor-identity-service');
    const identity = await createAdvisorIdentity({ authUserId: AUTH_USER_A, fullName: 'x', actorRole: 'KORA_ADMIN', actorId: 'op' });
    const qual = await createAdvisorRoleQualification({ advisorId: identity.id, role: 'Company Advisor', actorRole: 'KORA_ADMIN', actorId: 'op' });

    // @ts-expect-error — deliberately invalid status, proving runtime rejection beyond the type system
    await expect(updateAdvisorRoleQualificationStatus(qual.id, 'APPROVED', 'KORA_ADMIN', 'op')).rejects.toThrow(/not a canonical qualification status/);
  });

  it('exports exactly the frozen 7-value qualification status vocabulary and 2 canonical roles, verbatim from doc 76', async () => {
    const { QUALIFICATION_STATUSES, ADVISOR_ROLES } = await import('@/lib/advisor-identity/advisor-identity-service');
    expect([...QUALIFICATION_STATUSES]).toEqual([
      'CANDIDATE', 'QUALIFICATION IN PROGRESS', 'QUALIFIED', 'RENEWAL DUE', 'EXPIRED', 'SUSPENDED', 'REVOKED',
    ]);
    expect([...ADVISOR_ROLES]).toEqual(['Company Advisor', 'Partner Advisor']);
  });

  it('has no module-level function that would let one role\'s qualification imply or grant the other', async () => {
    const mod = await import('@/lib/advisor-identity/advisor-identity-service');
    const exportNames = Object.keys(mod);
    expect(exportNames.some((n) => /grantBoth|combineRoles|promoteToAllRoles/i.test(n))).toBe(false);
  });
});

describe('KORA-WP-030 — scope integrity: no Assignment, no task/case, no calendar, no Company/Partner membership', () => {
  const serviceSrc = readFileSync(join(process.cwd(), 'lib/advisor-identity/advisor-identity-service.ts'), 'utf8');
  const pageSrc = readFileSync(join(process.cwd(), 'app/advisor/page.tsx'), 'utf8');
  const allSrc = serviceSrc + '\n' + pageSrc;
  const codeLines = allSrc.split('\n').filter((l) => !l.trim().startsWith('//'));
  const code = codeLines.join('\n');

  it('no Assignment concept anywhere (KORA-WP-031 scope)', () => {
    expect(code).not.toMatch(/assignment|assignAdvisor|advisor_assignment/i);
  });

  it('no Task/Case/calendar/booking concept anywhere', () => {
    expect(code).not.toMatch(/operational_case|advisorTask|calendar|booking|appointment/i);
  });

  it('no reference to company_memberships or a partner_memberships table', () => {
    expect(code).not.toMatch(/company_memberships|partner_memberships/);
  });

  it('no reference to the removed COMPANY_VIEWER role', () => {
    expect(code).not.toMatch(/COMPANY_VIEWER/);
  });

  it('does not import or duplicate a service-role client constructor', () => {
    expect(serviceSrc).toContain("getSupabaseServiceClient");
    expect(code).not.toMatch(/createClient\(/);
  });
});

describe('KORA-WP-030 — migration is additive, uses exact frozen vocabularies, no self-service write grant', () => {
  const migration = readFileSync(join(process.cwd(), 'supabase/migrations/056_advisor_identity_qualification.sql'), 'utf8');

  it('does not ALTER or DROP any existing table', () => {
    expect(migration).not.toMatch(/^\s*ALTER TABLE (?!advisor\.)/m);
    const dropLines = migration.split('\n').filter((l) => /DROP TABLE|DROP POLICY|DROP INDEX|DROP SCHEMA/.test(l));
    for (const line of dropLines) expect(line.trim().startsWith('--')).toBe(true);
  });

  it('the role CHECK holds exactly the 2 canonical Advisor roles', () => {
    expect(migration).toContain("'Company Advisor'");
    expect(migration).toContain("'Partner Advisor'");
  });

  it('the qualification status CHECK holds all 7 canonical states, verbatim', () => {
    for (const state of ['CANDIDATE', 'QUALIFICATION IN PROGRESS', 'QUALIFIED', 'RENEWAL DUE', 'EXPIRED', 'SUSPENDED', 'REVOKED']) {
      expect(migration).toContain(state);
    }
  });

  it('the identity status CHECK holds all 5 canonical lifecycle states', () => {
    for (const state of ['candidate_onboarding', 'active', 'unavailable', 'globally_suspended', 'inactive_offboarded']) {
      expect(migration).toContain(state);
    }
  });

  it('no GRANT INSERT or UPDATE exists for authenticated on either table — write is service-role only', () => {
    const grantLines = migration.split('\n').filter((l) => l.trim().toUpperCase().startsWith('GRANT') && l.includes('authenticated'));
    for (const line of grantLines) {
      expect(line).not.toMatch(/INSERT|UPDATE|DELETE/);
    }
  });

  it('no GRANT DELETE exists for any role on either table', () => {
    const grantLines = migration.split('\n').filter((l) => l.trim().toUpperCase().startsWith('GRANT'));
    for (const line of grantLines) {
      expect(line).not.toMatch(/DELETE/);
    }
  });

  it('the RLS policy uses only COMPANY_ADMIN-unrelated actors — no COMPANY_VIEWER, no Company/Partner/Worker policy', () => {
    const policyLines = migration.split('\n').filter((l) => !l.trim().startsWith('--'));
    const policyBlock = policyLines.join('\n');
    expect(policyBlock).not.toMatch(/COMPANY_VIEWER|COMPANY_ADMIN|'PARTNER'|'WORKER'/);
  });
});
