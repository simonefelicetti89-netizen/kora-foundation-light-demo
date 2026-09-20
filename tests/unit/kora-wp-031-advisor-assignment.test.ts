/**
 * KORA-WP-031 — Advisor Assignment + Validity Rule + Minimum
 * Prerequisite-Eligibility Data.
 *
 * Behavioral (not string-matching) tests of the REAL functions from
 * lib/advisor-assignment/advisor-assignment-service.ts, with only the
 * Supabase I/O boundary and the governance substrates
 * (recordGovernanceEvent/recordGovernedAction) mocked at their public
 * boundary. Same technique as this session's kora-wp-018/030/032 test
 * files. No route/UI exists over this WP (registry: "UI: N/A at this WP"),
 * so there is no API-route layer to test here — the service itself is the
 * authorization boundary (see the module's own header comment).
 *
 * Real-DB proof of RLS/grant/constraint correctness (schema, cardinality
 * unique index, FK, CHECK constraints, cross-tenant/cross-identity
 * isolation) lives in this WP's own real-DB validation — see report 120.
 * This file proves the service's own logic: authorization, validity
 * predicate composition, error mapping, and governance provenance.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

interface IdentityRow { id: string; auth_user_id: string; full_name: string; status: string; }
interface QualRow { id: string; advisor_id: string; role: string; status: string; }
interface AssignmentRow {
  id: string; advisor_id: string; organisation_type: string; company_id: string; role: string;
  status: string; effective_from: string; effective_to: string | null; reason: string | null;
  conflict_flag: boolean; created_at: string; updated_at: string;
}
interface EligibilityRow {
  id: string; role_qualification_id: string; status: string; source_reference: string | null;
  effective_date: string | null; expiry_date: string | null; last_verified_at: string | null;
  verified_by: string | null; created_at: string; updated_at: string;
}

let identities: IdentityRow[] = [];
let qualifications: QualRow[] = [];
let assignments: AssignmentRow[] = [];
let eligibilities: EligibilityRow[] = [];
let idCounter = 0;

const VALID_COMPANY_IDS = new Set(['company-1', 'company-2']);

function makeSelectChain<T extends object>(rows: () => T[], filters: Record<string, unknown> = {}) {
  const matches = () => rows().filter((r) => Object.entries(filters).every(([k, v]) => (r as unknown as Record<string, unknown>)[k] === v));
  return {
    eq(col: string, val: unknown) {
      return makeSelectChain(rows, { ...filters, [col]: val });
    },
    maybeSingle: async () => ({ data: matches()[0] ?? null, error: null }),
    order: async () => ({ data: matches(), error: null }),
  };
}

function makeIdentityTable() {
  return { select: () => makeSelectChain(() => identities) };
}

function makeQualificationTable() {
  return { select: () => makeSelectChain(() => qualifications) };
}

function makeAssignmentTable() {
  return {
    select: () => makeSelectChain(() => assignments),
    insert: (payload: Record<string, unknown>) => ({
      select: () => ({
        single: async () => {
          const advisorId = payload.advisor_id as string;
          const companyId = payload.company_id as string;
          const role = (payload.role as string) ?? 'Company Advisor';
          const organisationType = (payload.organisation_type as string) ?? 'company';

          if (!identities.some((i) => i.id === advisorId)) {
            return { data: null, error: { message: 'insert or update on table "advisor_assignment" violates foreign key constraint "advisor_assignment_advisor_id_fkey"' } };
          }
          if (!VALID_COMPANY_IDS.has(companyId)) {
            return { data: null, error: { message: 'insert or update on table "advisor_assignment" violates foreign key constraint "advisor_assignment_company_id_fkey"' } };
          }
          if (organisationType === 'company' && role !== 'Company Advisor') {
            return { data: null, error: { message: 'new row for relation "advisor_assignment" violates check constraint "advisor_assignment_role_matches_target"' } };
          }
          const clash = assignments.find((a) => a.company_id === companyId && a.status === 'active' && a.organisation_type === 'company');
          if (clash) {
            return { data: null, error: { message: 'duplicate key value violates unique constraint "uq_advisor_assignment_one_active_company_advisor"' } };
          }
          const row: AssignmentRow = {
            id: `assign-${++idCounter}`, advisor_id: advisorId, organisation_type: organisationType,
            company_id: companyId, role, status: 'active', effective_from: '2026-09-13T00:00:00.000Z',
            effective_to: null, reason: null, conflict_flag: false,
            created_at: '2026-09-13T00:00:00.000Z', updated_at: '2026-09-13T00:00:00.000Z',
          };
          assignments.push(row);
          return { data: row, error: null };
        },
      }),
    }),
    update: (payload: Record<string, unknown>) => ({
      eq: (col1: string, val1: unknown) => ({
        eq: (col2: string, val2: unknown) => ({
          select: () => ({
            single: async () => {
              const row = assignments.find((a) => (a as unknown as Record<string, unknown>)[col1] === val1 && (a as unknown as Record<string, unknown>)[col2] === val2);
              if (!row) return { data: null, error: { message: 'no active Assignment found for this id' } };
              Object.assign(row, payload);
              return { data: row, error: null };
            },
          }),
        }),
      }),
    }),
  };
}

function makeEligibilityTable() {
  return {
    select: () => makeSelectChain(() => eligibilities),
    upsert: (payload: Record<string, unknown>) => ({
      select: () => ({
        single: async () => {
          const rqId = payload.role_qualification_id as string;
          if (!qualifications.some((q) => q.id === rqId)) {
            return { data: null, error: { message: 'insert or update on table "advisor_prerequisite_eligibility" violates foreign key constraint "advisor_prerequisite_eligibility_role_qualification_id_fkey"' } };
          }
          let row = eligibilities.find((e) => e.role_qualification_id === rqId);
          if (row) {
            Object.assign(row, payload);
          } else {
            row = { id: `elig-${++idCounter}`, created_at: '2026-09-13T00:00:00.000Z', ...payload } as EligibilityRow;
            eligibilities.push(row);
          }
          row.updated_at = '2026-09-13T00:00:00.000Z';
          return { data: row, error: null };
        },
      }),
    }),
  };
}

const recordGovernanceEventMock = vi.fn(async (p: Record<string, unknown>) => ({ id: 'ev-1', ...p, occurredAt: 'now' }));
const recordGovernedActionMock = vi.fn(async (p: Record<string, unknown>) => ({ id: 'ev-2', ...p, occurredAt: 'now' }));

vi.mock('@/lib/supabase/server', () => ({
  getSupabaseServiceClient: () => ({
    schema: (schemaName: string) => ({
      from: (table: string) => {
        if (schemaName !== 'advisor') throw new Error(`unexpected schema in test: ${schemaName}`);
        if (table === 'advisor_assignment') return makeAssignmentTable();
        if (table === 'advisor_identity') return makeIdentityTable();
        if (table === 'advisor_role_qualification') return makeQualificationTable();
        if (table === 'advisor_prerequisite_eligibility') return makeEligibilityTable();
        throw new Error(`unexpected table in test: ${table}`);
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

function seedIdentity(overrides: Partial<IdentityRow> = {}): IdentityRow {
  const row: IdentityRow = { id: overrides.id ?? 'adv-1', auth_user_id: overrides.auth_user_id ?? 'u1', full_name: overrides.full_name ?? 'Advisor One', status: overrides.status ?? 'active' };
  identities.push(row);
  return row;
}

function seedQualification(overrides: Partial<QualRow> = {}): QualRow {
  const row: QualRow = { id: overrides.id ?? 'qual-1', advisor_id: overrides.advisor_id ?? 'adv-1', role: overrides.role ?? 'Company Advisor', status: overrides.status ?? 'QUALIFIED' };
  qualifications.push(row);
  return row;
}

beforeEach(() => {
  identities = [];
  qualifications = [];
  assignments = [];
  eligibilities = [];
  idCounter = 0;
  recordGovernanceEventMock.mockClear();
  recordGovernedActionMock.mockClear();
});

afterEach(() => vi.clearAllMocks());

const KORA_ADMIN = { actorRole: 'KORA_ADMIN', actorId: 'admin-1' };

describe('KORA-WP-031 — createAdvisorAssignment: authority and target', () => {
  it('KORA_ADMIN creates an active Company Advisor assignment', async () => {
    seedIdentity();
    const { createAdvisorAssignment } = await import('@/lib/advisor-assignment/advisor-assignment-service');
    const result = await createAdvisorAssignment({ advisorId: 'adv-1', companyId: 'company-1', role: 'Company Advisor', ...KORA_ADMIN });
    expect(result.status).toBe('active');
    expect(result.organisationType).toBe('company');
    expect(result.companyId).toBe('company-1');
    expect(recordGovernedActionMock).toHaveBeenCalledWith(
      expect.objectContaining({ category: 'ASSIGNMENT_CHANGE', payload: expect.objectContaining({ verb: 'create' }) }),
    );
  });

  it.each(['ADVISOR', 'COMPANY_ADMIN', 'PARTNER', 'WORKER', ''])(
    'rejects creation when actorRole is "%s" (only KORA_ADMIN may create)',
    async (actorRole) => {
      seedIdentity();
      const { createAdvisorAssignment } = await import('@/lib/advisor-assignment/advisor-assignment-service');
      await expect(createAdvisorAssignment({ advisorId: 'adv-1', companyId: 'company-1', role: 'Company Advisor', actorRole, actorId: 'x' }))
        .rejects.toThrow(/only KORA_ADMIN/);
      expect(assignments.length).toBe(0);
      expect(recordGovernedActionMock).not.toHaveBeenCalled();
    },
  );

  it('rejects a nonexistent Advisor (foreign key)', async () => {
    const { createAdvisorAssignment } = await import('@/lib/advisor-assignment/advisor-assignment-service');
    await expect(createAdvisorAssignment({ advisorId: 'no-such-advisor', companyId: 'company-1', role: 'Company Advisor', ...KORA_ADMIN }))
      .rejects.toThrow(/advisor or company does not exist/);
  });

  it('rejects a nonexistent Company (foreign key)', async () => {
    seedIdentity();
    const { createAdvisorAssignment } = await import('@/lib/advisor-assignment/advisor-assignment-service');
    await expect(createAdvisorAssignment({ advisorId: 'adv-1', companyId: 'no-such-company', role: 'Company Advisor', ...KORA_ADMIN }))
      .rejects.toThrow(/advisor or company does not exist/);
  });

  it('rejects a Partner Advisor role against a Company target', async () => {
    seedIdentity();
    const { createAdvisorAssignment } = await import('@/lib/advisor-assignment/advisor-assignment-service');
    await expect(createAdvisorAssignment({ advisorId: 'adv-1', companyId: 'company-1', role: 'Partner Advisor', ...KORA_ADMIN }))
      .rejects.toThrow(/role does not match the assignment target/);
  });
});

describe('KORA-WP-031 — createAdvisorAssignment: cardinality (doc 73 §3)', () => {
  it('rejects a second simultaneous active Company Advisor assignment for the same Company', async () => {
    seedIdentity({ id: 'adv-1' });
    seedIdentity({ id: 'adv-2', auth_user_id: 'u2' });
    const { createAdvisorAssignment } = await import('@/lib/advisor-assignment/advisor-assignment-service');
    await createAdvisorAssignment({ advisorId: 'adv-1', companyId: 'company-1', role: 'Company Advisor', ...KORA_ADMIN });
    await expect(createAdvisorAssignment({ advisorId: 'adv-2', companyId: 'company-1', role: 'Company Advisor', ...KORA_ADMIN }))
      .rejects.toThrow(/already has an active Company Advisor assignment/);
  });

  it('allows the same Advisor to hold active assignments to multiple different Companies simultaneously', async () => {
    seedIdentity();
    const { createAdvisorAssignment } = await import('@/lib/advisor-assignment/advisor-assignment-service');
    const a = await createAdvisorAssignment({ advisorId: 'adv-1', companyId: 'company-1', role: 'Company Advisor', ...KORA_ADMIN });
    const b = await createAdvisorAssignment({ advisorId: 'adv-1', companyId: 'company-2', role: 'Company Advisor', ...KORA_ADMIN });
    expect(a.status).toBe('active');
    expect(b.status).toBe('active');
  });

  it('allows a new active assignment for a Company once its prior assignment has ended', async () => {
    seedIdentity({ id: 'adv-1' });
    seedIdentity({ id: 'adv-2', auth_user_id: 'u2' });
    const { createAdvisorAssignment, endAdvisorAssignment } = await import('@/lib/advisor-assignment/advisor-assignment-service');
    const first = await createAdvisorAssignment({ advisorId: 'adv-1', companyId: 'company-1', role: 'Company Advisor', ...KORA_ADMIN });
    await endAdvisorAssignment({ assignmentId: first.id, reason: 'Advisor departed', ...KORA_ADMIN });
    const second = await createAdvisorAssignment({ advisorId: 'adv-2', companyId: 'company-1', role: 'Company Advisor', ...KORA_ADMIN });
    expect(second.status).toBe('active');
  });
});

describe('KORA-WP-031 — endAdvisorAssignment: history preserved, never deleted', () => {
  it('ends an active assignment, requires a reason, preserves the row (doc 73 §3)', async () => {
    seedIdentity();
    const { createAdvisorAssignment, endAdvisorAssignment } = await import('@/lib/advisor-assignment/advisor-assignment-service');
    const created = await createAdvisorAssignment({ advisorId: 'adv-1', companyId: 'company-1', role: 'Company Advisor', ...KORA_ADMIN });
    const ended = await endAdvisorAssignment({ assignmentId: created.id, reason: 'capacity rebalancing', ...KORA_ADMIN });
    expect(ended.status).toBe('ended');
    expect(ended.effectiveTo).not.toBeNull();
    expect(ended.reason).toBe('capacity rebalancing');
    expect(assignments.length).toBe(1); // never deleted
    expect(recordGovernedActionMock).toHaveBeenCalledWith(
      expect.objectContaining({ category: 'ASSIGNMENT_CHANGE', payload: expect.objectContaining({ verb: 'end' }) }),
    );
  });

  it.each(['', '   '])('rejects ending without a reason ("%s")', async (reason) => {
    seedIdentity();
    const { createAdvisorAssignment, endAdvisorAssignment } = await import('@/lib/advisor-assignment/advisor-assignment-service');
    const created = await createAdvisorAssignment({ advisorId: 'adv-1', companyId: 'company-1', role: 'Company Advisor', ...KORA_ADMIN });
    await expect(endAdvisorAssignment({ assignmentId: created.id, reason, ...KORA_ADMIN })).rejects.toThrow(/reason is required/);
  });

  it.each(['ADVISOR', 'COMPANY_ADMIN', 'PARTNER', 'WORKER'])('rejects ending when actorRole is "%s"', async (actorRole) => {
    seedIdentity();
    const { createAdvisorAssignment, endAdvisorAssignment } = await import('@/lib/advisor-assignment/advisor-assignment-service');
    const created = await createAdvisorAssignment({ advisorId: 'adv-1', companyId: 'company-1', role: 'Company Advisor', ...KORA_ADMIN });
    await expect(endAdvisorAssignment({ assignmentId: created.id, reason: 'x', actorRole, actorId: 'x' })).rejects.toThrow(/only KORA_ADMIN/);
  });

  it('rejects ending an already-ended assignment', async () => {
    seedIdentity();
    const { createAdvisorAssignment, endAdvisorAssignment } = await import('@/lib/advisor-assignment/advisor-assignment-service');
    const created = await createAdvisorAssignment({ advisorId: 'adv-1', companyId: 'company-1', role: 'Company Advisor', ...KORA_ADMIN });
    await endAdvisorAssignment({ assignmentId: created.id, reason: 'first end', ...KORA_ADMIN });
    await expect(endAdvisorAssignment({ assignmentId: created.id, reason: 'second end', ...KORA_ADMIN })).rejects.toThrow(/no active Assignment/);
  });
});

describe('KORA-WP-031 — evaluateAdvisorAssignmentValidity: doc 76 §15\'s rule, scoped to this WP', () => {
  async function setupValidAssignment() {
    seedIdentity({ id: 'adv-1', status: 'active' });
    const qual = seedQualification({ id: 'qual-1', advisor_id: 'adv-1', role: 'Company Advisor', status: 'QUALIFIED' });
    const { createAdvisorAssignment } = await import('@/lib/advisor-assignment/advisor-assignment-service');
    const assignment = await createAdvisorAssignment({ advisorId: 'adv-1', companyId: 'company-1', role: 'Company Advisor', ...KORA_ADMIN });
    const { setAdvisorPrerequisiteEligibility } = await import('@/lib/advisor-assignment/advisor-assignment-service');
    await setAdvisorPrerequisiteEligibility({ roleQualificationId: qual.id, status: 'MET', ...KORA_ADMIN });
    return assignment;
  }

  it('is valid when all five inputs are satisfied', async () => {
    const assignment = await setupValidAssignment();
    const { evaluateAdvisorAssignmentValidity } = await import('@/lib/advisor-assignment/advisor-assignment-service');
    const result = await evaluateAdvisorAssignmentValidity(assignment.id);
    expect(result).toEqual({ valid: true, reasons: [] });
  });

  it('is invalid ("prerequisite_eligibility_not_present") before any eligibility record exists — proves no hidden dependency on KORA-WP-039', async () => {
    seedIdentity({ id: 'adv-1', status: 'active' });
    seedQualification({ id: 'qual-1', advisor_id: 'adv-1', role: 'Company Advisor', status: 'QUALIFIED' });
    const { createAdvisorAssignment, evaluateAdvisorAssignmentValidity } = await import('@/lib/advisor-assignment/advisor-assignment-service');
    const assignment = await createAdvisorAssignment({ advisorId: 'adv-1', companyId: 'company-1', role: 'Company Advisor', ...KORA_ADMIN });
    const before = await evaluateAdvisorAssignmentValidity(assignment.id);
    expect(before.valid).toBe(false);
    expect(before.reasons).toContain('prerequisite_eligibility_not_present');

    // "then re-tested once 039 supplies real prerequisite evidence" (WP-031's
    // own Tests requirement) — simulated here via the exact substrate a
    // future WP-039 UI would call, with zero WP-039 code involved.
    const { setAdvisorPrerequisiteEligibility } = await import('@/lib/advisor-assignment/advisor-assignment-service');
    await setAdvisorPrerequisiteEligibility({ roleQualificationId: 'qual-1', status: 'MET', ...KORA_ADMIN });
    const after = await evaluateAdvisorAssignmentValidity(assignment.id);
    expect(after).toEqual({ valid: true, reasons: [] });
  });

  it('is invalid ("assignment_not_active") once the Assignment itself has ended', async () => {
    const assignment = await setupValidAssignment();
    const { endAdvisorAssignment, evaluateAdvisorAssignmentValidity } = await import('@/lib/advisor-assignment/advisor-assignment-service');
    await endAdvisorAssignment({ assignmentId: assignment.id, reason: 'x', ...KORA_ADMIN });
    const result = await evaluateAdvisorAssignmentValidity(assignment.id);
    expect(result.valid).toBe(false);
    expect(result.reasons).toContain('assignment_not_active');
  });

  it('is invalid ("advisor_identity_not_active") when the Advisor identity is not active', async () => {
    const assignment = await setupValidAssignment();
    identities[0].status = 'unavailable';
    const { evaluateAdvisorAssignmentValidity } = await import('@/lib/advisor-assignment/advisor-assignment-service');
    const result = await evaluateAdvisorAssignmentValidity(assignment.id);
    expect(result.valid).toBe(false);
    expect(result.reasons).toContain('advisor_identity_not_active');
  });

  it('is invalid ("role_qualification_not_active") when the qualification is RENEWAL DUE, not QUALIFIED (disclosed strict interpretation)', async () => {
    const assignment = await setupValidAssignment();
    qualifications[0].status = 'RENEWAL DUE';
    const { evaluateAdvisorAssignmentValidity } = await import('@/lib/advisor-assignment/advisor-assignment-service');
    const result = await evaluateAdvisorAssignmentValidity(assignment.id);
    expect(result.valid).toBe(false);
    expect(result.reasons).toContain('role_qualification_not_active');
  });

  it('is invalid ("role_qualification_not_active") when no qualification row exists at all for that role', async () => {
    seedIdentity({ id: 'adv-1', status: 'active' });
    // No seedQualification() call at all.
    const { createAdvisorAssignment, evaluateAdvisorAssignmentValidity } = await import('@/lib/advisor-assignment/advisor-assignment-service');
    const assignment = await createAdvisorAssignment({ advisorId: 'adv-1', companyId: 'company-1', role: 'Company Advisor', ...KORA_ADMIN });
    const result = await evaluateAdvisorAssignmentValidity(assignment.id);
    expect(result.valid).toBe(false);
    expect(result.reasons).toContain('role_qualification_not_active');
    expect(result.reasons).toContain('prerequisite_eligibility_not_present');
  });

  it('is invalid ("prerequisite_eligibility_not_present") when eligibility status is NOT_MET', async () => {
    seedIdentity({ id: 'adv-1', status: 'active' });
    const qual = seedQualification({ id: 'qual-1', advisor_id: 'adv-1', role: 'Company Advisor', status: 'QUALIFIED' });
    const { createAdvisorAssignment, setAdvisorPrerequisiteEligibility, evaluateAdvisorAssignmentValidity } =
      await import('@/lib/advisor-assignment/advisor-assignment-service');
    const assignment = await createAdvisorAssignment({ advisorId: 'adv-1', companyId: 'company-1', role: 'Company Advisor', ...KORA_ADMIN });
    await setAdvisorPrerequisiteEligibility({ roleQualificationId: qual.id, status: 'NOT_MET', ...KORA_ADMIN });
    const result = await evaluateAdvisorAssignmentValidity(assignment.id);
    expect(result.valid).toBe(false);
    expect(result.reasons).toContain('prerequisite_eligibility_not_present');
  });

  it('is invalid ("prerequisite_eligibility_not_present") when eligibility is MET but expired', async () => {
    seedIdentity({ id: 'adv-1', status: 'active' });
    const qual = seedQualification({ id: 'qual-1', advisor_id: 'adv-1', role: 'Company Advisor', status: 'QUALIFIED' });
    const { createAdvisorAssignment, setAdvisorPrerequisiteEligibility, evaluateAdvisorAssignmentValidity } =
      await import('@/lib/advisor-assignment/advisor-assignment-service');
    const assignment = await createAdvisorAssignment({ advisorId: 'adv-1', companyId: 'company-1', role: 'Company Advisor', ...KORA_ADMIN });
    await setAdvisorPrerequisiteEligibility({ roleQualificationId: qual.id, status: 'MET', expiryDate: '2020-01-01T00:00:00.000Z', ...KORA_ADMIN });
    const result = await evaluateAdvisorAssignmentValidity(assignment.id);
    expect(result.valid).toBe(false);
    expect(result.reasons).toContain('prerequisite_eligibility_not_present');
  });

  it('is valid when eligibility is MET with a future expiry date', async () => {
    seedIdentity({ id: 'adv-1', status: 'active' });
    const qual = seedQualification({ id: 'qual-1', advisor_id: 'adv-1', role: 'Company Advisor', status: 'QUALIFIED' });
    const { createAdvisorAssignment, setAdvisorPrerequisiteEligibility, evaluateAdvisorAssignmentValidity } =
      await import('@/lib/advisor-assignment/advisor-assignment-service');
    const assignment = await createAdvisorAssignment({ advisorId: 'adv-1', companyId: 'company-1', role: 'Company Advisor', ...KORA_ADMIN });
    await setAdvisorPrerequisiteEligibility({ roleQualificationId: qual.id, status: 'MET', expiryDate: '2099-01-01T00:00:00.000Z', ...KORA_ADMIN });
    const result = await evaluateAdvisorAssignmentValidity(assignment.id);
    expect(result.valid).toBe(true);
  });

  it('is invalid ("conflict_flag_set") when the assignment carries a conflict flag, independent of every other input', async () => {
    const assignment = await setupValidAssignment();
    assignments[0].conflict_flag = true;
    const { evaluateAdvisorAssignmentValidity } = await import('@/lib/advisor-assignment/advisor-assignment-service');
    const result = await evaluateAdvisorAssignmentValidity(assignment.id);
    expect(result.valid).toBe(false);
    expect(result.reasons).toEqual(['conflict_flag_set']);
  });

  it('Qualification Change Effect: a QUALIFIED assignment dynamically becomes invalid once the qualification later changes, with zero write to the Assignment row', async () => {
    const assignment = await setupValidAssignment();
    const before = await (await import('@/lib/advisor-assignment/advisor-assignment-service')).evaluateAdvisorAssignmentValidity(assignment.id);
    expect(before.valid).toBe(true);
    qualifications[0].status = 'EXPIRED';
    const { evaluateAdvisorAssignmentValidity, getAdvisorAssignmentById } = await import('@/lib/advisor-assignment/advisor-assignment-service');
    const after = await evaluateAdvisorAssignmentValidity(assignment.id);
    expect(after.valid).toBe(false);
    expect(after.reasons).toContain('role_qualification_not_active');
    const stillSame = await getAdvisorAssignmentById(assignment.id);
    expect(stillSame?.updatedAt).toBe(assignment.updatedAt); // the Assignment row itself was never touched
  });

  it('rejects evaluating a nonexistent Assignment', async () => {
    const { evaluateAdvisorAssignmentValidity } = await import('@/lib/advisor-assignment/advisor-assignment-service');
    await expect(evaluateAdvisorAssignmentValidity('no-such-assignment')).rejects.toThrow(/no such Assignment/);
  });
});

describe('KORA-WP-031 — setAdvisorPrerequisiteEligibility: service-only substrate for the not-yet-built WP-039 UI', () => {
  it('creates a new eligibility record', async () => {
    seedQualification({ id: 'qual-1' });
    const { setAdvisorPrerequisiteEligibility } = await import('@/lib/advisor-assignment/advisor-assignment-service');
    const result = await setAdvisorPrerequisiteEligibility({ roleQualificationId: 'qual-1', status: 'MET', sourceReference: 'background-check-2026-09', ...KORA_ADMIN });
    expect(result.status).toBe('MET');
    expect(result.sourceReference).toBe('background-check-2026-09');
    expect(eligibilities.length).toBe(1);
  });

  it('upserts (never duplicates) a second write for the same qualification', async () => {
    seedQualification({ id: 'qual-1' });
    const { setAdvisorPrerequisiteEligibility } = await import('@/lib/advisor-assignment/advisor-assignment-service');
    await setAdvisorPrerequisiteEligibility({ roleQualificationId: 'qual-1', status: 'NOT_MET', ...KORA_ADMIN });
    await setAdvisorPrerequisiteEligibility({ roleQualificationId: 'qual-1', status: 'MET', ...KORA_ADMIN });
    expect(eligibilities.length).toBe(1);
    expect(eligibilities[0].status).toBe('MET');
  });

  it.each(['ADVISOR', 'COMPANY_ADMIN', 'PARTNER', 'WORKER'])('rejects when actorRole is "%s"', async (actorRole) => {
    seedQualification({ id: 'qual-1' });
    const { setAdvisorPrerequisiteEligibility } = await import('@/lib/advisor-assignment/advisor-assignment-service');
    await expect(setAdvisorPrerequisiteEligibility({ roleQualificationId: 'qual-1', status: 'MET', actorRole, actorId: 'x' })).rejects.toThrow(/only KORA_ADMIN/);
  });

  it('rejects an invalid status value', async () => {
    seedQualification({ id: 'qual-1' });
    const { setAdvisorPrerequisiteEligibility } = await import('@/lib/advisor-assignment/advisor-assignment-service');
    // @ts-expect-error — deliberately invalid input for the runtime guard.
    await expect(setAdvisorPrerequisiteEligibility({ roleQualificationId: 'qual-1', status: 'PARTIALLY_MET', ...KORA_ADMIN })).rejects.toThrow(/not a canonical prerequisite-eligibility status/);
  });

  it('rejects a nonexistent role_qualification_id (foreign key)', async () => {
    const { setAdvisorPrerequisiteEligibility } = await import('@/lib/advisor-assignment/advisor-assignment-service');
    await expect(setAdvisorPrerequisiteEligibility({ roleQualificationId: 'no-such-qual', status: 'MET', ...KORA_ADMIN })).rejects.toThrow(/no such Advisor Role Qualification/);
  });

  it('uses the generic recordGovernanceEvent substrate, not recordGovernedAction (not one of WP-006\'s 14 named categories)', async () => {
    seedQualification({ id: 'qual-1' });
    const { setAdvisorPrerequisiteEligibility } = await import('@/lib/advisor-assignment/advisor-assignment-service');
    await setAdvisorPrerequisiteEligibility({ roleQualificationId: 'qual-1', status: 'MET', ...KORA_ADMIN });
    expect(recordGovernanceEventMock).toHaveBeenCalledTimes(1);
    expect(recordGovernedActionMock).not.toHaveBeenCalled();
  });
});

describe('KORA-WP-031 — listAssignmentsForAdvisor / getAdvisorAssignmentById', () => {
  it('lists only the given Advisor\'s own assignments', async () => {
    seedIdentity({ id: 'adv-1' });
    seedIdentity({ id: 'adv-2', auth_user_id: 'u2' });
    const { createAdvisorAssignment, listAssignmentsForAdvisor } = await import('@/lib/advisor-assignment/advisor-assignment-service');
    await createAdvisorAssignment({ advisorId: 'adv-1', companyId: 'company-1', role: 'Company Advisor', ...KORA_ADMIN });
    await createAdvisorAssignment({ advisorId: 'adv-2', companyId: 'company-2', role: 'Company Advisor', ...KORA_ADMIN });
    const list = await listAssignmentsForAdvisor('adv-1');
    expect(list.length).toBe(1);
    expect(list[0].companyId).toBe('company-1');
  });

  it('returns null for a nonexistent assignment id', async () => {
    const { getAdvisorAssignmentById } = await import('@/lib/advisor-assignment/advisor-assignment-service');
    expect(await getAdvisorAssignmentById('no-such-id')).toBeNull();
  });
});

describe('KORA-WP-031 — scope integrity: no matching engine, no recusal workflow, no Partner target, no downstream WP smuggled in', () => {
  const serviceSrc = readFileSync(join(process.cwd(), 'lib/advisor-assignment/advisor-assignment-service.ts'), 'utf8');
  const migrationSrc = readFileSync(join(process.cwd(), 'supabase/migrations/057_advisor_assignment.sql'), 'utf8');
  const code = serviceSrc.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
  // SQL comment lines ('-- ...') carry prose explaining future extension
  // points (e.g. "a nullable partner_id column later") — strip them before
  // checking actual executable statements, exactly like `code` above.
  const migrationSql = migrationSrc.split('\n').filter((l) => !l.trim().startsWith('--')).join('\n');

  it('no matching/recommendation/ranking engine', () => {
    expect(code).not.toMatch(/matchScore|recommend|ranking|bestAdvisor|roundRobin|autoAssign|suggestAdvisor/i);
  });

  it('no recusal WORKFLOW beyond the single conflict_flag data point (KORA-WP-037 scope)', () => {
    expect(code).not.toMatch(/recusalReason|investigateConflict|notifyRecusal|recusalWorkflow|declareConflict/i);
  });

  it('no Task/Case/calendar/booking/document concept anywhere (KORA-WP-034/035/036 scope)', () => {
    expect(code).not.toMatch(/operational_case|calendar|booking|appointment|documentClass|noteClass/i);
  });

  it('no Company self-selection / Advisor self-assignment route or UI exists', () => {
    expect(() => readFileSync(join(process.cwd(), 'app/company/advisor'), 'utf8')).toThrow();
    expect(() => readFileSync(join(process.cwd(), 'app/api/company/advisor'), 'utf8')).toThrow();
    expect(() => readFileSync(join(process.cwd(), 'app/api/advisor/assignments'), 'utf8')).toThrow();
  });

  it('no WP-039 manual eligibility Admin UI exists over this data', () => {
    expect(() => readFileSync(join(process.cwd(), 'app/admin/advisor-eligibility'), 'utf8')).toThrow();
    expect(() => readFileSync(join(process.cwd(), 'app/api/admin/advisor-eligibility'), 'utf8')).toThrow();
  });

  it('no reference to the removed COMPANY_VIEWER role', () => {
    expect(code).not.toMatch(/COMPANY_VIEWER/);
  });

  it('does not invent a 15th governed-action category — reuses the existing ASSIGNMENT_CHANGE category', () => {
    const catalogSrc = readFileSync(join(process.cwd(), 'lib/audit/governed-action-catalog.ts'), 'utf8');
    const categoryLines = catalogSrc.match(/^\s*'[A-Z_]+',/gm) ?? [];
    expect(categoryLines.length).toBe(14);
    expect(serviceSrc).toContain("category: 'ASSIGNMENT_CHANGE'");
    expect(code).not.toMatch(/GOVERNED_ACTION_CATEGORIES\.push|GOVERNED_ACTION_CATEGORIES\s*=\s*\[.*ASSIGNMENT_CHANGE.*,\s*['"]/);
  });

  it('migration 057 does not model a Partner organisation target', () => {
    expect(migrationSql).toMatch(/CHECK \(organisation_type = 'company'\)/);
    expect(migrationSql).not.toMatch(/partner_id|'partner'/);
  });

  it('migration 057 grants no DELETE on either new table', () => {
    const grantLines = migrationSql.split('\n').filter((l) => /^\s*GRANT\b/i.test(l));
    expect(grantLines.length).toBeGreaterThan(0);
    for (const line of grantLines) {
      expect(line).not.toMatch(/DELETE/i);
    }
  });

  it('migration 057 does not modify migration 056\'s tables', () => {
    expect(migrationSql).not.toMatch(/ALTER TABLE advisor\.advisor_identity|ALTER TABLE advisor\.advisor_role_qualification/);
  });
});
