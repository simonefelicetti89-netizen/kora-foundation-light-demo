/**
 * KORA-WP-032 — Advisor Governance: Qualification Grant, Manual First-Pilot.
 *
 * Behavioral (not string-matching) tests of the REAL
 * `grantAdvisorRoleQualification()`/`listAllAdvisorIdentities()` functions
 * from lib/advisor-identity/advisor-identity-service.ts and the REAL
 * GET/POST handlers from app/api/admin/advisor-governance/route.ts, with
 * only the Supabase I/O boundary and the governance substrates
 * (recordGovernanceEvent/recordGovernedAction) and @/lib/auth/kora-session
 * mocked at their public boundary. Same technique as this session's
 * kora-wp-018/030 test files.
 *
 * Real-DB proof of RLS/grant correctness for the underlying table lives in
 * this WP's own real-DB validation (see report 119) — migration 056 is
 * unmodified by this WP, so no new RLS/grant surface exists to re-prove
 * here beyond what WP-030 already proved.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

interface QualRow {
  id: string; advisor_id: string; role: string; status: string;
  created_at: string; updated_at: string;
}
interface IdentityRow {
  id: string; auth_user_id: string; full_name: string; status: string;
  created_at: string; updated_at: string;
}

let qualifications: QualRow[] = [];
let identities: IdentityRow[] = [];

function makeQualTable() {
  return {
    select: () => ({
      eq: (_col: string, id: string) => ({
        maybeSingle: async () => ({ data: qualifications.find((q) => q.id === id) ?? null, error: null }),
        order: async () => ({ data: qualifications.filter((q) => q.advisor_id === id), error: null }),
      }),
    }),
    update: (payload: { status: string }) => ({
      eq: (_col: string, id: string) => ({
        select: () => ({
          single: async () => {
            const row = qualifications.find((q) => q.id === id);
            if (!row) return { data: null, error: { message: 'not found' } };
            row.status = payload.status;
            row.updated_at = '2026-09-13T00:00:00.000Z';
            return { data: row, error: null };
          },
        }),
      }),
    }),
  };
}

function makeIdentityTable() {
  return {
    select: () => ({
      order: async () => ({ data: identities, error: null }),
    }),
  };
}

const recordGovernanceEventMock = vi.fn(async (p: Record<string, unknown>) => ({ id: 'ev-1', ...p, occurredAt: 'now' }));
const recordGovernedActionMock = vi.fn(async (p: Record<string, unknown>) => ({ id: 'ev-2', ...p, occurredAt: 'now' }));

vi.mock('@/lib/supabase/server', () => ({
  getSupabaseServiceClient: () => ({
    schema: (schemaName: string) => ({
      from: (table: string) => {
        if (schemaName === 'advisor' && table === 'advisor_role_qualification') return makeQualTable();
        if (schemaName === 'advisor' && table === 'advisor_identity') return makeIdentityTable();
        throw new Error(`unexpected query target in test: ${schemaName}.${table}`);
      },
    }),
  }),
}));

vi.mock('@/lib/audit/governance-event', () => ({
  recordGovernanceEvent: (p: Record<string, unknown>) => recordGovernanceEventMock(p),
}));

vi.mock('@/lib/audit/governed-action-catalog', () => ({
  recordGovernedAction: (p: Record<string, unknown>) => recordGovernedActionMock(p),
}));

const mockRequireKoraAdmin = vi.fn();
vi.mock('@/lib/auth/kora-session', () => ({
  requireKoraAdmin: (...args: unknown[]) => mockRequireKoraAdmin(...args),
  isKoraAuthError: (v: unknown) => v instanceof NextResponse,
}));

function seedQual(overrides: Partial<QualRow> = {}): QualRow {
  const row: QualRow = {
    id: overrides.id ?? 'qual-1', advisor_id: overrides.advisor_id ?? 'adv-1',
    role: overrides.role ?? 'Company Advisor', status: overrides.status ?? 'CANDIDATE',
    created_at: '2026-09-13T00:00:00.000Z', updated_at: '2026-09-13T00:00:00.000Z',
  };
  qualifications.push(row);
  return row;
}

beforeEach(() => {
  qualifications = [];
  identities = [];
  recordGovernanceEventMock.mockClear();
  recordGovernedActionMock.mockClear();
  mockRequireKoraAdmin.mockReset();
});

afterEach(() => vi.clearAllMocks());

describe('KORA-WP-032 — grantAdvisorRoleQualification: the governed grant/renew decision', () => {
  it('grants from CANDIDATE to QUALIFIED, verb="grant"', async () => {
    seedQual({ status: 'CANDIDATE' });
    const { grantAdvisorRoleQualification } = await import('@/lib/advisor-identity/advisor-identity-service');
    const result = await grantAdvisorRoleQualification({ qualificationId: 'qual-1', grantedByOperatorId: 'admin-1' });
    expect(result.status).toBe('QUALIFIED');
    expect(recordGovernedActionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        category: 'ADVISOR_ROLE_QUALIFICATION_CHANGE',
        actorRole: 'KORA_ADMIN',
        actorId: 'admin-1',
        payload: expect.objectContaining({ verb: 'grant', previousStatus: 'CANDIDATE', newStatus: 'QUALIFIED' }),
      }),
    );
  });

  it('renews from EXPIRED to QUALIFIED, verb="renew"', async () => {
    seedQual({ status: 'EXPIRED' });
    const { grantAdvisorRoleQualification } = await import('@/lib/advisor-identity/advisor-identity-service');
    await grantAdvisorRoleQualification({ qualificationId: 'qual-1', grantedByOperatorId: 'admin-1' });
    expect(recordGovernedActionMock).toHaveBeenCalledWith(expect.objectContaining({ payload: expect.objectContaining({ verb: 'renew' }) }));
  });

  it('renews from RENEWAL DUE to QUALIFIED, verb="renew"', async () => {
    seedQual({ status: 'RENEWAL DUE' });
    const { grantAdvisorRoleQualification } = await import('@/lib/advisor-identity/advisor-identity-service');
    await grantAdvisorRoleQualification({ qualificationId: 'qual-1', grantedByOperatorId: 'admin-1' });
    expect(recordGovernedActionMock).toHaveBeenCalledWith(expect.objectContaining({ payload: expect.objectContaining({ verb: 'renew' }) }));
  });

  it('grants from QUALIFICATION IN PROGRESS to QUALIFIED', async () => {
    seedQual({ status: 'QUALIFICATION IN PROGRESS' });
    const { grantAdvisorRoleQualification } = await import('@/lib/advisor-identity/advisor-identity-service');
    const result = await grantAdvisorRoleQualification({ qualificationId: 'qual-1', grantedByOperatorId: 'admin-1' });
    expect(result.status).toBe('QUALIFIED');
  });

  it('rejects a duplicate grant on an already-QUALIFIED qualification', async () => {
    seedQual({ status: 'QUALIFIED' });
    const { grantAdvisorRoleQualification } = await import('@/lib/advisor-identity/advisor-identity-service');
    await expect(grantAdvisorRoleQualification({ qualificationId: 'qual-1', grantedByOperatorId: 'admin-1' }))
      .rejects.toThrow(/already QUALIFIED — duplicate grant/);
    expect(recordGovernedActionMock).not.toHaveBeenCalled();
  });

  it('rejects granting a SUSPENDED qualification (not eligible)', async () => {
    seedQual({ status: 'SUSPENDED' });
    const { grantAdvisorRoleQualification } = await import('@/lib/advisor-identity/advisor-identity-service');
    await expect(grantAdvisorRoleQualification({ qualificationId: 'qual-1', grantedByOperatorId: 'admin-1' }))
      .rejects.toThrow(/not eligible for grant\/renew/);
  });

  it('rejects granting a REVOKED qualification (not eligible)', async () => {
    seedQual({ status: 'REVOKED' });
    const { grantAdvisorRoleQualification } = await import('@/lib/advisor-identity/advisor-identity-service');
    await expect(grantAdvisorRoleQualification({ qualificationId: 'qual-1', grantedByOperatorId: 'admin-1' }))
      .rejects.toThrow(/not eligible for grant\/renew/);
  });

  it('fails safely for a nonexistent qualification id — never creates one', async () => {
    const { grantAdvisorRoleQualification } = await import('@/lib/advisor-identity/advisor-identity-service');
    await expect(grantAdvisorRoleQualification({ qualificationId: 'does-not-exist', grantedByOperatorId: 'admin-1' }))
      .rejects.toThrow(/no qualification record exists/);
    expect(qualifications.length).toBe(0);
  });

  it('granting one role qualification does not affect a different qualification of the same advisor (independence preserved)', async () => {
    seedQual({ id: 'qual-company', advisor_id: 'adv-1', role: 'Company Advisor', status: 'CANDIDATE' });
    seedQual({ id: 'qual-partner', advisor_id: 'adv-1', role: 'Partner Advisor', status: 'CANDIDATE' });
    const { grantAdvisorRoleQualification } = await import('@/lib/advisor-identity/advisor-identity-service');
    await grantAdvisorRoleQualification({ qualificationId: 'qual-company', grantedByOperatorId: 'admin-1' });
    const partner = qualifications.find((q) => q.id === 'qual-partner');
    expect(partner?.status).toBe('CANDIDATE');
  });

  it('never calls the generic recordGovernanceEvent substrate for the grant action — uses recordGovernedAction only', async () => {
    seedQual({ status: 'CANDIDATE' });
    const { grantAdvisorRoleQualification } = await import('@/lib/advisor-identity/advisor-identity-service');
    await grantAdvisorRoleQualification({ qualificationId: 'qual-1', grantedByOperatorId: 'admin-1' });
    expect(recordGovernanceEventMock).not.toHaveBeenCalled();
    expect(recordGovernedActionMock).toHaveBeenCalledTimes(1);
  });
});

describe('KORA-WP-032 — listAllAdvisorIdentities', () => {
  it('returns all identities', async () => {
    identities.push({ id: 'adv-1', auth_user_id: 'u1', full_name: 'Advisor One', status: 'active', created_at: 'x', updated_at: 'x' });
    identities.push({ id: 'adv-2', auth_user_id: 'u2', full_name: 'Advisor Two', status: 'active', created_at: 'x', updated_at: 'x' });
    const { listAllAdvisorIdentities } = await import('@/lib/advisor-identity/advisor-identity-service');
    const list = await listAllAdvisorIdentities();
    expect(list.map((a) => a.fullName)).toEqual(['Advisor One', 'Advisor Two']);
  });
});

describe('KORA-WP-032 — GET /api/admin/advisor-governance — auth boundary', () => {
  it('returns the auth error unchanged when not KORA_ADMIN', async () => {
    mockRequireKoraAdmin.mockResolvedValue(NextResponse.json({ error: 'Forbidden' }, { status: 403 }));
    const { GET } = await import('@/app/api/admin/advisor-governance/route');
    const res = await GET(new NextRequest('http://localhost/api/admin/advisor-governance'));
    expect(res.status).toBe(403);
  });
});

describe('KORA-WP-032 — POST /api/admin/advisor-governance — grant boundary', () => {
  it('returns the auth error unchanged and never calls the service when not KORA_ADMIN', async () => {
    mockRequireKoraAdmin.mockResolvedValue(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }));
    const { POST } = await import('@/app/api/admin/advisor-governance/route');
    const req = new NextRequest('http://localhost/api/admin/advisor-governance', {
      method: 'POST', body: JSON.stringify({ qualificationId: 'qual-1' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
    expect(recordGovernedActionMock).not.toHaveBeenCalled();
  });

  it('uses the trusted session id as grantedByOperatorId, never a client-supplied actor', async () => {
    seedQual({ id: 'qual-1', status: 'CANDIDATE' });
    mockRequireKoraAdmin.mockResolvedValue({ id: 'trusted-admin-id', email: 'a@x.test', koraRole: 'KORA_ADMIN' });
    const { POST } = await import('@/app/api/admin/advisor-governance/route');
    const req = new NextRequest('http://localhost/api/admin/advisor-governance', {
      method: 'POST',
      // Attempted forgery: a client-supplied grantedByOperatorId/actorId, which the route must ignore entirely.
      body: JSON.stringify({ qualificationId: 'qual-1', grantedByOperatorId: 'forged-admin-id', actorId: 'forged-admin-id' }),
    });
    const res = await POST(req);
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(recordGovernedActionMock).toHaveBeenCalledWith(expect.objectContaining({ actorId: 'trusted-admin-id' }));
  });

  it('rejects a missing qualificationId with 400', async () => {
    mockRequireKoraAdmin.mockResolvedValue({ id: 'admin-1', email: 'a@x.test', koraRole: 'KORA_ADMIN' });
    const { POST } = await import('@/app/api/admin/advisor-governance/route');
    const req = new NextRequest('http://localhost/api/admin/advisor-governance', { method: 'POST', body: JSON.stringify({}) });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('surfaces a safe rejection reason (422) for an already-QUALIFIED duplicate grant, not a raw 500', async () => {
    seedQual({ id: 'qual-1', status: 'QUALIFIED' });
    mockRequireKoraAdmin.mockResolvedValue({ id: 'admin-1', email: 'a@x.test', koraRole: 'KORA_ADMIN' });
    const { POST } = await import('@/app/api/admin/advisor-governance/route');
    const req = new NextRequest('http://localhost/api/admin/advisor-governance', {
      method: 'POST', body: JSON.stringify({ qualificationId: 'qual-1' }),
    });
    const res = await POST(req);
    const body = await res.json();
    expect(res.status).toBe(422);
    expect(body.error).toMatch(/already QUALIFIED/);
  });
});

describe('KORA-WP-032 — scope integrity: no Assignment, no revoke/suspend, no automation', () => {
  const serviceSrc = readFileSync(join(process.cwd(), 'lib/advisor-identity/advisor-identity-service.ts'), 'utf8');
  const routeSrc = readFileSync(join(process.cwd(), 'app/api/admin/advisor-governance/route.ts'), 'utf8');
  const pageSrc = readFileSync(join(process.cwd(), 'app/admin/advisor-governance/page.tsx'), 'utf8');
  const allSrc = [serviceSrc, routeSrc, pageSrc].join('\n');
  const code = allSrc.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');

  it('no Assignment concept anywhere (KORA-WP-031 scope)', () => {
    expect(code).not.toMatch(/assignment|assignAdvisor|advisor_assignment/i);
  });

  it('no revoke/suspend action exposed anywhere', () => {
    expect(code).not.toMatch(/revokeQualification|suspendQualification|deleteQualification/i);
  });

  it('no automation/policy/cron/batch grant mechanism', () => {
    expect(code).not.toMatch(/cron|scheduledGrant|autoGrant|bulkGrant|policyGrant/i);
  });

  it('no Task/Case/calendar/booking concept anywhere', () => {
    expect(code).not.toMatch(/operational_case|advisorTask|calendar|booking|appointment/i);
  });

  it('no reference to the removed COMPANY_VIEWER role', () => {
    expect(code).not.toMatch(/COMPANY_VIEWER/);
  });

  it('does not invent a 15th governed-action category', () => {
    expect(serviceSrc).toContain('ADVISOR_ROLE_QUALIFICATION_CHANGE');
    expect(code).not.toMatch(/GOVERNED_ACTION_CATEGORIES\.push|GOVERNED_ACTION_CATEGORIES\s*=\s*\[.*ADVISOR_ROLE_QUALIFICATION_CHANGE.*,\s*['"]/);
  });
});
