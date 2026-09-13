/**
 * KORA-WP-035 — Advisor Calendar & Call/Appointment Lineage.
 *
 * Behavioral (not string-matching) tests of the REAL functions from
 * lib/advisor-portal/advisor-appointment-service.ts, plus the REAL route
 * handlers, with only the Supabase I/O boundary, the governance substrate,
 * the assignment-validity evaluator, and @/lib/auth/kora-session mocked at
 * their public boundary. Same technique as this session's kora-wp-018/030/
 * 031/032/033 test files.
 *
 * Real-DB proof of RLS/grant/constraint correctness for migration 059 lives
 * in this WP's own real-DB validation (see report 122).
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { APPOINTMENT_STATUSES } from '@/lib/advisor-portal/advisor-appointment-service';

// ═══════════════════════════════════════════════════════════════════════════
// PART 1 — status vocabulary
// ═══════════════════════════════════════════════════════════════════════════

describe('KORA-WP-035 — status vocabulary (doc 73 §13, verbatim)', () => {
  it('exposes exactly the six canonical states', () => {
    expect(APPOINTMENT_STATUSES).toEqual(['requested', 'confirmed', 'completed', 'rescheduled', 'cancelled', 'no-show']);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// PART 2 — service: mocked Supabase + governance + validity evaluator
// ═══════════════════════════════════════════════════════════════════════════

interface AssignmentRow { id: string; advisor_id: string; company_id: string; status: string; }
interface AppointmentRow {
  id: string; assignment_id: string; starts_at: string; ends_at: string; subject: string;
  status: string; rescheduled_from_id: string | null; reason: string | null;
  created_by_role: string; updated_at: string;
}

let assignments: AssignmentRow[] = [];
let appointments: AppointmentRow[] = [];
let idCounter = 0;
let validityResult: { valid: boolean; reasons: string[] } = { valid: true, reasons: [] };

const recordGovernanceEventMock = vi.fn(async (p: Record<string, unknown>) => ({ id: 'ev-1', ...p, occurredAt: 'now' }));
const evaluateValidityMock = vi.fn(async (_assignmentId: string) => validityResult);

vi.mock('@/lib/supabase/server', () => ({
  getSupabaseServiceClient: () => ({
    schema: (schemaName: string) => ({
      from: (table: string) => {
        if (schemaName === 'advisor' && table === 'advisor_assignment') {
          return {
            select: () => ({
              eq: (_col: string, val: string) => ({
                maybeSingle: async () => ({ data: assignments.find((a) => a.id === val) ?? null, error: null }),
              }),
            }),
          };
        }
        if (schemaName === 'advisor' && table === 'advisor_appointment') {
          return {
            select: () => ({
              eq: (col: string, val: unknown) => makeAppointmentChain({ [col]: val }),
            }),
            insert: (payload: Record<string, unknown>) => ({
              select: () => ({
                single: async () => {
                  const row: AppointmentRow = {
                    id: `appt-${++idCounter}`,
                    assignment_id: payload.assignment_id as string,
                    starts_at: payload.starts_at as string,
                    ends_at: payload.ends_at as string,
                    subject: payload.subject as string,
                    status: (payload.status as string) ?? 'requested',
                    rescheduled_from_id: (payload.rescheduled_from_id as string) ?? null,
                    reason: (payload.reason as string) ?? null,
                    created_by_role: payload.created_by_role as string,
                    updated_at: '2026-09-13T00:00:00.000Z',
                  };
                  appointments.push(row);
                  return { data: row, error: null };
                },
              }),
            }),
            update: (payload: Record<string, unknown>) => ({
              eq: (col1: string, val1: unknown) => makeUpdateChain(payload, { [col1]: val1 }),
            }),
          };
        }
        throw new Error(`unexpected query target in test: ${schemaName}.${table}`);
      },
    }),
  }),
}));

function makeAppointmentChain(filters: Record<string, unknown>) {
  const matches = () => appointments.filter((a) => Object.entries(filters).every(([k, v]) => (a as unknown as Record<string, unknown>)[k] === v));
  return {
    eq(col: string, val: unknown) { return makeAppointmentChain({ ...filters, [col]: val }); },
    maybeSingle: async () => ({ data: matches()[0] ?? null, error: null }),
    order: async () => ({ data: matches(), error: null }),
  };
}

function makeUpdateChain(payload: Record<string, unknown>, filters: Record<string, unknown>) {
  return {
    eq: (col2: string, val2: unknown) => makeUpdateTerminal(payload, { ...filters, [col2]: val2 }),
    in: (col2: string, vals: unknown[]) => ({
      select: () => ({
        single: async () => {
          const row = appointments.find((a) => Object.entries(filters).every(([k, v]) => (a as unknown as Record<string, unknown>)[k] === v) && vals.includes((a as unknown as Record<string, unknown>)[col2]));
          if (!row) return { data: null, error: { message: 'no rows returned' } };
          Object.assign(row, payload);
          return { data: row, error: null };
        },
      }),
    }),
    select: () => ({
      single: async () => {
        const row = appointments.find((a) => Object.entries(filters).every(([k, v]) => (a as unknown as Record<string, unknown>)[k] === v));
        if (!row) return { data: null, error: { message: 'no rows returned' } };
        Object.assign(row, payload);
        return { data: row, error: null };
      },
    }),
  };
}

function makeUpdateTerminal(payload: Record<string, unknown>, filters: Record<string, unknown>) {
  return {
    in: (col: string, vals: unknown[]) => ({
      select: () => ({
        single: async () => {
          const row = appointments.find((a) => Object.entries(filters).every(([k, v]) => (a as unknown as Record<string, unknown>)[k] === v) && vals.includes((a as unknown as Record<string, unknown>)[col]));
          if (!row) return { data: null, error: { message: 'no rows returned' } };
          Object.assign(row, payload);
          return { data: row, error: null };
        },
      }),
    }),
    select: () => ({
      single: async () => {
        const row = appointments.find((a) => Object.entries(filters).every(([k, v]) => (a as unknown as Record<string, unknown>)[k] === v));
        if (!row) return { data: null, error: { message: 'no rows returned' } };
        Object.assign(row, payload);
        return { data: row, error: null };
      },
    }),
  };
}

vi.mock('@/lib/audit/governance-event', () => ({
  recordGovernanceEvent: (p: Record<string, unknown>) => recordGovernanceEventMock(p),
}));

vi.mock('@/lib/advisor-assignment/advisor-assignment-service', () => ({
  evaluateAdvisorAssignmentValidity: (assignmentId: string) => evaluateValidityMock(assignmentId),
}));

function seedAssignment(overrides: Partial<AssignmentRow> = {}): AssignmentRow {
  const row: AssignmentRow = {
    id: overrides.id ?? 'assign-1', advisor_id: overrides.advisor_id ?? 'adv-1', company_id: overrides.company_id ?? 'company-1',
    status: overrides.status ?? 'active',
  };
  assignments.push(row);
  return row;
}

beforeEach(() => {
  assignments = []; appointments = []; idCounter = 0;
  validityResult = { valid: true, reasons: [] };
  recordGovernanceEventMock.mockClear();
  evaluateValidityMock.mockClear();
});

afterEach(() => vi.clearAllMocks());

describe('KORA-WP-035 — createAppointment: Company-only, requires valid Assignment', () => {
  it('Company creates a requested appointment on a valid Assignment', async () => {
    seedAssignment();
    const { createAppointment } = await import('@/lib/advisor-portal/advisor-appointment-service');
    const appt = await createAppointment({ assignmentId: 'assign-1', startsAt: '2026-10-01T10:00:00Z', endsAt: '2026-10-01T11:00:00Z', subject: 'Q2 Review', callerTenantId: 'company-1', actorId: 'u1' });
    expect(appt.status).toBe('requested');
    expect(appt.createdByRole).toBe('COMPANY_ADMIN');
    expect(recordGovernanceEventMock).toHaveBeenCalledTimes(1);
  });

  it('rejects when endsAt is before startsAt', async () => {
    seedAssignment();
    const { createAppointment } = await import('@/lib/advisor-portal/advisor-appointment-service');
    await expect(createAppointment({ assignmentId: 'assign-1', startsAt: '2026-10-01T11:00:00Z', endsAt: '2026-10-01T10:00:00Z', subject: 'x', callerTenantId: 'company-1', actorId: 'u1' }))
      .rejects.toThrow(/endsAt must be after startsAt/);
  });

  it('rejects an empty subject', async () => {
    seedAssignment();
    const { createAppointment } = await import('@/lib/advisor-portal/advisor-appointment-service');
    await expect(createAppointment({ assignmentId: 'assign-1', startsAt: '2026-10-01T10:00:00Z', endsAt: '2026-10-01T11:00:00Z', subject: '  ', callerTenantId: 'company-1', actorId: 'u1' }))
      .rejects.toThrow(/subject is required/);
  });

  it('rejects Company B booking Company A\'s Advisor (forged tenant)', async () => {
    seedAssignment({ company_id: 'company-1' });
    const { createAppointment } = await import('@/lib/advisor-portal/advisor-appointment-service');
    await expect(createAppointment({ assignmentId: 'assign-1', startsAt: '2026-10-01T10:00:00Z', endsAt: '2026-10-01T11:00:00Z', subject: 'x', callerTenantId: 'company-2', actorId: 'u1' }))
      .rejects.toThrow(/not a party/);
  });

  it('rejects booking when the Assignment is not currently valid', async () => {
    seedAssignment();
    validityResult = { valid: false, reasons: ['prerequisite_eligibility_not_present'] };
    const { createAppointment } = await import('@/lib/advisor-portal/advisor-appointment-service');
    await expect(createAppointment({ assignmentId: 'assign-1', startsAt: '2026-10-01T10:00:00Z', endsAt: '2026-10-01T11:00:00Z', subject: 'x', callerTenantId: 'company-1', actorId: 'u1' }))
      .rejects.toThrow(/not currently valid/);
    expect(appointments.length).toBe(0);
  });

  it('rejects a nonexistent assignment id', async () => {
    const { createAppointment } = await import('@/lib/advisor-portal/advisor-appointment-service');
    await expect(createAppointment({ assignmentId: 'no-such', startsAt: '2026-10-01T10:00:00Z', endsAt: '2026-10-01T11:00:00Z', subject: 'x', callerTenantId: 'company-1', actorId: 'u1' }))
      .rejects.toThrow(/no such Assignment/);
  });
});

describe('KORA-WP-035 — confirmAppointment: Advisor-only', () => {
  async function seedRequested() {
    seedAssignment();
    const { createAppointment } = await import('@/lib/advisor-portal/advisor-appointment-service');
    return createAppointment({ assignmentId: 'assign-1', startsAt: '2026-10-01T10:00:00Z', endsAt: '2026-10-01T11:00:00Z', subject: 'x', callerTenantId: 'company-1', actorId: 'u1' });
  }

  it('Advisor confirms a requested appointment', async () => {
    const appt = await seedRequested();
    const { confirmAppointment } = await import('@/lib/advisor-portal/advisor-appointment-service');
    const confirmed = await confirmAppointment({ appointmentId: appt.id, callerAdvisorId: 'adv-1', actorId: 'u2' });
    expect(confirmed.status).toBe('confirmed');
  });

  it('rejects confirmation by an unrelated Advisor', async () => {
    const appt = await seedRequested();
    const { confirmAppointment } = await import('@/lib/advisor-portal/advisor-appointment-service');
    await expect(confirmAppointment({ appointmentId: appt.id, callerAdvisorId: 'adv-2', actorId: 'u2' })).rejects.toThrow(/not a party/);
  });

  it('rejects confirming an already-confirmed appointment', async () => {
    const appt = await seedRequested();
    const { confirmAppointment } = await import('@/lib/advisor-portal/advisor-appointment-service');
    await confirmAppointment({ appointmentId: appt.id, callerAdvisorId: 'adv-1', actorId: 'u2' });
    await expect(confirmAppointment({ appointmentId: appt.id, callerAdvisorId: 'adv-1', actorId: 'u2' })).rejects.toThrow(/cannot confirm from status "confirmed"/);
  });
});

describe('KORA-WP-035 — cancelAppointment: either party, reason required', () => {
  async function seedRequested() {
    seedAssignment();
    const { createAppointment } = await import('@/lib/advisor-portal/advisor-appointment-service');
    return createAppointment({ assignmentId: 'assign-1', startsAt: '2026-10-01T10:00:00Z', endsAt: '2026-10-01T11:00:00Z', subject: 'x', callerTenantId: 'company-1', actorId: 'u1' });
  }

  it('Company cancels with a reason', async () => {
    const appt = await seedRequested();
    const { cancelAppointment } = await import('@/lib/advisor-portal/advisor-appointment-service');
    const cancelled = await cancelAppointment({ appointmentId: appt.id, reason: 'no longer needed', callerTenantId: 'company-1', actorRole: 'COMPANY_ADMIN', actorId: 'u1' });
    expect(cancelled.status).toBe('cancelled');
    expect(cancelled.reason).toBe('no longer needed');
  });

  it('Advisor cancels with a reason', async () => {
    const appt = await seedRequested();
    const { cancelAppointment } = await import('@/lib/advisor-portal/advisor-appointment-service');
    const cancelled = await cancelAppointment({ appointmentId: appt.id, reason: 'conflict', callerAdvisorId: 'adv-1', actorRole: 'ADVISOR', actorId: 'u2' });
    expect(cancelled.status).toBe('cancelled');
  });

  it('rejects cancellation without a reason', async () => {
    const appt = await seedRequested();
    const { cancelAppointment } = await import('@/lib/advisor-portal/advisor-appointment-service');
    await expect(cancelAppointment({ appointmentId: appt.id, reason: '  ', callerTenantId: 'company-1', actorRole: 'COMPANY_ADMIN', actorId: 'u1' })).rejects.toThrow(/reason is required/);
  });

  it('rejects cancellation by an unrelated Company', async () => {
    const appt = await seedRequested();
    const { cancelAppointment } = await import('@/lib/advisor-portal/advisor-appointment-service');
    await expect(cancelAppointment({ appointmentId: appt.id, reason: 'x', callerTenantId: 'company-2', actorRole: 'COMPANY_ADMIN', actorId: 'u1' })).rejects.toThrow(/not a party/);
  });

  it('rejects cancelling an already-cancelled appointment', async () => {
    const appt = await seedRequested();
    const { cancelAppointment } = await import('@/lib/advisor-portal/advisor-appointment-service');
    await cancelAppointment({ appointmentId: appt.id, reason: 'x', callerTenantId: 'company-1', actorRole: 'COMPANY_ADMIN', actorId: 'u1' });
    await expect(cancelAppointment({ appointmentId: appt.id, reason: 'y', callerTenantId: 'company-1', actorRole: 'COMPANY_ADMIN', actorId: 'u1' })).rejects.toThrow(/cannot cancel from status "cancelled"/);
  });
});

describe('KORA-WP-035 — rescheduleAppointment: lineage preserved, never mutates the original in place', () => {
  async function seedRequested() {
    seedAssignment();
    const { createAppointment } = await import('@/lib/advisor-portal/advisor-appointment-service');
    return createAppointment({ assignmentId: 'assign-1', startsAt: '2026-10-01T10:00:00Z', endsAt: '2026-10-01T11:00:00Z', subject: 'Q2 Review', callerTenantId: 'company-1', actorId: 'u1' });
  }

  it('creates a NEW row and marks the old one rescheduled — original never overwritten', async () => {
    const original = await seedRequested();
    const { rescheduleAppointment, getAppointmentById } = await import('@/lib/advisor-portal/advisor-appointment-service');
    const replacement = await rescheduleAppointment({
      appointmentId: original.id, newStartsAt: '2026-10-02T10:00:00Z', newEndsAt: '2026-10-02T11:00:00Z',
      reason: 'conflict', callerTenantId: 'company-1', actorRole: 'COMPANY_ADMIN', actorId: 'u1',
    });
    expect(replacement.id).not.toBe(original.id);
    expect(replacement.status).toBe('requested');
    expect(replacement.rescheduledFromId).toBe(original.id);
    expect(replacement.subject).toBe('Q2 Review');

    const stillOriginal = await getAppointmentById(original.id);
    expect(stillOriginal?.status).toBe('rescheduled');
    expect(stillOriginal?.startsAt).toBe('2026-10-01T10:00:00Z'); // never mutated in place
    expect(appointments.length).toBe(2); // both rows preserved
  });

  it('preserves a multi-hop chain A -> B -> C', async () => {
    const a = await seedRequested();
    const { rescheduleAppointment } = await import('@/lib/advisor-portal/advisor-appointment-service');
    const b = await rescheduleAppointment({ appointmentId: a.id, newStartsAt: '2026-10-02T10:00:00Z', newEndsAt: '2026-10-02T11:00:00Z', reason: 'r1', callerTenantId: 'company-1', actorRole: 'COMPANY_ADMIN', actorId: 'u1' });
    const c = await rescheduleAppointment({ appointmentId: b.id, newStartsAt: '2026-10-03T10:00:00Z', newEndsAt: '2026-10-03T11:00:00Z', reason: 'r2', callerTenantId: 'company-1', actorRole: 'COMPANY_ADMIN', actorId: 'u1' });
    expect(c.rescheduledFromId).toBe(b.id);
    expect(b.rescheduledFromId).toBe(a.id);
    expect(appointments.length).toBe(3);
    expect(appointments.find((x) => x.id === a.id)?.status).toBe('rescheduled');
    expect(appointments.find((x) => x.id === b.id)?.status).toBe('rescheduled');
  });

  it('rejects rescheduling without a reason', async () => {
    const original = await seedRequested();
    const { rescheduleAppointment } = await import('@/lib/advisor-portal/advisor-appointment-service');
    await expect(rescheduleAppointment({ appointmentId: original.id, newStartsAt: '2026-10-02T10:00:00Z', newEndsAt: '2026-10-02T11:00:00Z', reason: '', callerTenantId: 'company-1', actorRole: 'COMPANY_ADMIN', actorId: 'u1' }))
      .rejects.toThrow(/reason is required/);
  });

  it('rejects rescheduling when the new range is invalid', async () => {
    const original = await seedRequested();
    const { rescheduleAppointment } = await import('@/lib/advisor-portal/advisor-appointment-service');
    await expect(rescheduleAppointment({ appointmentId: original.id, newStartsAt: '2026-10-02T11:00:00Z', newEndsAt: '2026-10-02T10:00:00Z', reason: 'x', callerTenantId: 'company-1', actorRole: 'COMPANY_ADMIN', actorId: 'u1' }))
      .rejects.toThrow(/newEndsAt must be after newStartsAt/);
  });

  it('rejects rescheduling by a non-party caller', async () => {
    const original = await seedRequested();
    const { rescheduleAppointment } = await import('@/lib/advisor-portal/advisor-appointment-service');
    await expect(rescheduleAppointment({ appointmentId: original.id, newStartsAt: '2026-10-02T10:00:00Z', newEndsAt: '2026-10-02T11:00:00Z', reason: 'x', callerAdvisorId: 'adv-2', actorRole: 'ADVISOR', actorId: 'u2' }))
      .rejects.toThrow(/not a party/);
  });

  it('rejects rescheduling once the Assignment is no longer valid', async () => {
    const original = await seedRequested();
    validityResult = { valid: false, reasons: ['role_qualification_not_active'] };
    const { rescheduleAppointment } = await import('@/lib/advisor-portal/advisor-appointment-service');
    await expect(rescheduleAppointment({ appointmentId: original.id, newStartsAt: '2026-10-02T10:00:00Z', newEndsAt: '2026-10-02T11:00:00Z', reason: 'x', callerTenantId: 'company-1', actorRole: 'COMPANY_ADMIN', actorId: 'u1' }))
      .rejects.toThrow(/not currently valid/);
  });
});

describe('KORA-WP-035 — listAppointmentsForAssignment', () => {
  it('returns the lineage in chronological order for a genuine party', async () => {
    seedAssignment();
    const { createAppointment, listAppointmentsForAssignment } = await import('@/lib/advisor-portal/advisor-appointment-service');
    await createAppointment({ assignmentId: 'assign-1', startsAt: '2026-10-01T10:00:00Z', endsAt: '2026-10-01T11:00:00Z', subject: 'x', callerTenantId: 'company-1', actorId: 'u1' });
    const list = await listAppointmentsForAssignment({ assignmentId: 'assign-1', callerTenantId: 'company-1' });
    expect(list.length).toBe(1);
  });

  it('rejects a caller who is not a party', async () => {
    seedAssignment();
    const { listAppointmentsForAssignment } = await import('@/lib/advisor-portal/advisor-appointment-service');
    await expect(listAppointmentsForAssignment({ assignmentId: 'assign-1', callerTenantId: 'company-2' })).rejects.toThrow(/not a party/);
  });

  // Founder Decision H-A (WP-036 semantic gate, doc 73 §15): the Advisor's
  // own operational read ends when the Assignment ends; the Company's own
  // retained visibility is unaffected. Discovered as a genuine coverage gap
  // during that gate — this describe block previously exercised only
  // Company-caller reads.
  it('Advisor reads while the Assignment is ACTIVE: PASS', async () => {
    seedAssignment();
    const { createAppointment, listAppointmentsForAssignment } = await import('@/lib/advisor-portal/advisor-appointment-service');
    await createAppointment({ assignmentId: 'assign-1', startsAt: '2026-10-01T10:00:00Z', endsAt: '2026-10-01T11:00:00Z', subject: 'x', callerTenantId: 'company-1', actorId: 'u1' });
    const list = await listAppointmentsForAssignment({ assignmentId: 'assign-1', callerAdvisorId: 'adv-1' });
    expect(list.length).toBe(1);
  });

  it('Advisor is denied after the Assignment ends — Company retention is unaffected', async () => {
    const a = seedAssignment();
    const { createAppointment, listAppointmentsForAssignment } = await import('@/lib/advisor-portal/advisor-appointment-service');
    await createAppointment({ assignmentId: 'assign-1', startsAt: '2026-10-01T10:00:00Z', endsAt: '2026-10-01T11:00:00Z', subject: 'x', callerTenantId: 'company-1', actorId: 'u1' });
    a.status = 'ended';
    await expect(listAppointmentsForAssignment({ assignmentId: 'assign-1', callerAdvisorId: 'adv-1' })).rejects.toThrow(/Assignment has ended/);
    const stillForCompany = await listAppointmentsForAssignment({ assignmentId: 'assign-1', callerTenantId: 'company-1' });
    expect(stillForCompany.length).toBe(1);
  });

  it('Advisor access returns once a new active Assignment exists (no permanent ban)', async () => {
    const a = seedAssignment();
    const { createAppointment, listAppointmentsForAssignment } = await import('@/lib/advisor-portal/advisor-appointment-service');
    await createAppointment({ assignmentId: 'assign-1', startsAt: '2026-10-01T10:00:00Z', endsAt: '2026-10-01T11:00:00Z', subject: 'x', callerTenantId: 'company-1', actorId: 'u1' });
    a.status = 'ended';
    await expect(listAppointmentsForAssignment({ assignmentId: 'assign-1', callerAdvisorId: 'adv-1' })).rejects.toThrow(/Assignment has ended/);
    a.status = 'active';
    const list = await listAppointmentsForAssignment({ assignmentId: 'assign-1', callerAdvisorId: 'adv-1' });
    expect(list.length).toBe(1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// PART 3 — route boundary
// ═══════════════════════════════════════════════════════════════════════════

const mockRequireCompanyUser = vi.fn();
const mockRequireAdvisorUser = vi.fn();
const mockGetAdvisorIdentity = vi.fn();
const mockGetCompanyAssignedAdvisor = vi.fn();

vi.mock('@/lib/auth/kora-session', () => ({
  requireCompanyUser: (...args: unknown[]) => mockRequireCompanyUser(...args),
  requireAdvisorUser: (...args: unknown[]) => mockRequireAdvisorUser(...args),
  isKoraAuthError: (v: unknown) => v instanceof NextResponse,
}));

vi.mock('@/lib/advisor-identity/advisor-identity-service', () => ({
  getAdvisorIdentityByAuthUserId: (...args: unknown[]) => mockGetAdvisorIdentity(...args),
}));

const mockGetCompanyAssignmentForHistoricalRead = vi.fn();

vi.mock('@/lib/advisor-portal/advisor-portal-service', () => ({
  getCompanyAssignedAdvisor: (...args: unknown[]) => mockGetCompanyAssignedAdvisor(...args),
  getCompanyAssignmentForHistoricalRead: (...args: unknown[]) => mockGetCompanyAssignmentForHistoricalRead(...args),
}));

describe('KORA-WP-035 — POST /api/company/advisor/appointments — auth + booking boundary', () => {
  beforeEach(() => { mockRequireCompanyUser.mockReset(); mockGetCompanyAssignedAdvisor.mockReset(); });

  it('returns the auth error unchanged when not COMPANY_ADMIN', async () => {
    mockRequireCompanyUser.mockResolvedValue(NextResponse.json({ error: 'Forbidden' }, { status: 403 }));
    const { POST } = await import('@/app/api/company/advisor/appointments/route');
    const req = new NextRequest('http://localhost/api/company/advisor/appointments', { method: 'POST', body: JSON.stringify({ subject: 'x', startsAt: 'a', endsAt: 'b' }) });
    const res = await POST(req);
    expect(res.status).toBe(403);
  });

  it('rejects missing fields with 400', async () => {
    mockRequireCompanyUser.mockResolvedValue({ id: 'u1', email: 'a@x.test', tenantId: 'company-1', koraRole: 'COMPANY_ADMIN', userStatus: 'active' });
    const { POST } = await import('@/app/api/company/advisor/appointments/route');
    const req = new NextRequest('http://localhost/api/company/advisor/appointments', { method: 'POST', body: JSON.stringify({}) });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('rejects with 422 when no Advisor is assigned', async () => {
    mockRequireCompanyUser.mockResolvedValue({ id: 'u1', email: 'a@x.test', tenantId: 'company-1', koraRole: 'COMPANY_ADMIN', userStatus: 'active' });
    mockGetCompanyAssignedAdvisor.mockResolvedValue(null);
    const { POST } = await import('@/app/api/company/advisor/appointments/route');
    const req = new NextRequest('http://localhost/api/company/advisor/appointments', { method: 'POST', body: JSON.stringify({ subject: 'x', startsAt: '2026-10-01T10:00:00Z', endsAt: '2026-10-01T11:00:00Z' }) });
    const res = await POST(req);
    expect(res.status).toBe(422);
  });

  // Founder Decision 4: historical read authority never becomes mutation
  // authority — a new booking is still denied with 422 once the Assignment
  // has ended (getCompanyAssignedAdvisor, active-only, correctly returns
  // null; the POST path is unchanged by this remediation).
  it('rejects a new booking with 422 once the Assignment has ended', async () => {
    mockRequireCompanyUser.mockResolvedValue({ id: 'u1', email: 'a@x.test', tenantId: 'company-1', koraRole: 'COMPANY_ADMIN', userStatus: 'active' });
    mockGetCompanyAssignedAdvisor.mockResolvedValue(null); // ended assignment: the active-only resolver returns null
    const { POST } = await import('@/app/api/company/advisor/appointments/route');
    const req = new NextRequest('http://localhost/api/company/advisor/appointments', { method: 'POST', body: JSON.stringify({ subject: 'x', startsAt: '2026-10-01T10:00:00Z', endsAt: '2026-10-01T11:00:00Z' }) });
    const res = await POST(req);
    expect(res.status).toBe(422);
  });
});

describe('KORA-WP-035 — GET /api/company/advisor/appointments — historical read (Founder Decision 4)', () => {
  beforeEach(() => { mockRequireCompanyUser.mockReset(); mockGetCompanyAssignmentForHistoricalRead.mockReset(); });

  it('returns appointment history even after the Assignment has ended', async () => {
    seedAssignment({ status: 'ended' });
    const { createAppointment } = await import('@/lib/advisor-portal/advisor-appointment-service');
    // The Assignment was active at creation time in reality; this test
    // seeds the appointment directly to isolate the read path.
    await createAppointment({ assignmentId: 'assign-1', startsAt: '2026-10-01T10:00:00Z', endsAt: '2026-10-01T11:00:00Z', subject: 'x', callerTenantId: 'company-1', actorId: 'u1' });

    mockRequireCompanyUser.mockResolvedValue({ id: 'u1', email: 'a@x.test', tenantId: 'company-1', koraRole: 'COMPANY_ADMIN', userStatus: 'active' });
    mockGetCompanyAssignmentForHistoricalRead.mockResolvedValue({ assignmentId: 'assign-1', advisorId: 'adv-1', fullName: 'Advisor One', status: 'ended' });
    const { GET } = await import('@/app/api/company/advisor/appointments/route');
    const res = await GET(new NextRequest('http://localhost/api/company/advisor/appointments'));
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.appointments.length).toBe(1);
  });
});

describe('KORA-WP-035 — appointment action route: unrecognized action rejected', () => {
  beforeEach(() => { mockRequireCompanyUser.mockReset(); });

  it('rejects an unrecognized action with 400', async () => {
    mockRequireCompanyUser.mockResolvedValue({ id: 'u1', email: 'a@x.test', tenantId: 'company-1', koraRole: 'COMPANY_ADMIN', userStatus: 'active' });
    const { POST } = await import('@/app/api/company/advisor/appointments/[appointmentId]/route');
    const req = new NextRequest('http://localhost/api/company/advisor/appointments/appt-1', { method: 'POST', body: JSON.stringify({ action: 'delete_everything' }) });
    const res = await POST(req, { params: Promise.resolve({ appointmentId: 'appt-1' }) });
    expect(res.status).toBe(400);
  });

  it('rejects cancel without a reason with 400', async () => {
    mockRequireCompanyUser.mockResolvedValue({ id: 'u1', email: 'a@x.test', tenantId: 'company-1', koraRole: 'COMPANY_ADMIN', userStatus: 'active' });
    const { POST } = await import('@/app/api/company/advisor/appointments/[appointmentId]/route');
    const req = new NextRequest('http://localhost/api/company/advisor/appointments/appt-1', { method: 'POST', body: JSON.stringify({ action: 'cancel' }) });
    const res = await POST(req, { params: Promise.resolve({ appointmentId: 'appt-1' }) });
    expect(res.status).toBe(400);
  });
});

describe('KORA-WP-035 — GET /api/advisor/companies/[assignmentId]/appointments — self-resolution', () => {
  beforeEach(() => { mockRequireAdvisorUser.mockReset(); mockGetAdvisorIdentity.mockReset(); });

  it('returns the auth error unchanged when not ADVISOR', async () => {
    mockRequireAdvisorUser.mockResolvedValue(NextResponse.json({ error: 'Forbidden' }, { status: 403 }));
    const { GET } = await import('@/app/api/advisor/companies/[assignmentId]/appointments/route');
    const res = await GET(new NextRequest('http://localhost/x'), { params: Promise.resolve({ assignmentId: 'assign-1' }) });
    expect(res.status).toBe(403);
  });

  it('rejects with 403 when no Advisor profile is resolved', async () => {
    mockRequireAdvisorUser.mockResolvedValue({ id: 'u1', email: 'a@x.test', koraRole: 'ADVISOR' });
    mockGetAdvisorIdentity.mockResolvedValue(null);
    const { GET } = await import('@/app/api/advisor/companies/[assignmentId]/appointments/route');
    const res = await GET(new NextRequest('http://localhost/x'), { params: Promise.resolve({ assignmentId: 'assign-1' }) });
    expect(res.status).toBe(403);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// PART 4 — scope integrity
// ═══════════════════════════════════════════════════════════════════════════

describe('KORA-WP-035 — scope integrity: no video provider, no external calendar, no WP-036, no WP-050/generic booking engine, no worker data', () => {
  const files = [
    'lib/advisor-portal/advisor-appointment-service.ts',
    'app/api/company/advisor/appointments/route.ts',
    'app/api/company/advisor/appointments/[appointmentId]/route.ts',
    'app/api/advisor/companies/[assignmentId]/appointments/route.ts',
    'app/api/advisor/companies/[assignmentId]/appointments/[appointmentId]/route.ts',
    'app/company/advisor/page.tsx',
    'app/advisor/companies/page.tsx',
  ].map((p) => readFileSync(join(process.cwd(), p), 'utf8'));
  const allSrc = files.join('\n');
  const code = allSrc.split('\n').filter((l) => !l.trim().startsWith('//') && !l.trim().startsWith('*')).join('\n');

  it('no video-call provider integration (Zoom/Meet/Teams/Webex, OAuth, conference URL)', () => {
    expect(code).not.toMatch(/zoom|google.?meet|teams\.microsoft|webex|conferenceUrl|meetingUrl|videoProvider|oauth/i);
  });

  it('no external calendar sync (Google Calendar, Outlook, ICS, Graph API)', () => {
    expect(code).not.toMatch(/googleCalendar|outlookCalendar|icsSync|MicrosoftGraph|caldav/i);
  });

  it('no availability/slot-generation engine', () => {
    expect(code).not.toMatch(/availabilitySlot|generateSlots|workingHours|timeOff|weeklySchedule/i);
  });

  it('no WP-036 document/note taxonomy concept', () => {
    expect(code).not.toMatch(/documentClass|noteClass|class1|class2|class3|class4|class5/i);
  });

  it('no WP-050 / commons.booking / BookingService reused or reimplemented', () => {
    expect(code).not.toMatch(/commons\.booking|BookingService|BookingRequestService/);
  });

  it('no generic booking-platform concept (Calendly-style: resource, marketplace, multi-provider)', () => {
    expect(code).not.toMatch(/calendly|resourceBooking|multiProvider|bookingMarketplace/i);
  });

  it('no worker-level data path', () => {
    expect(code).not.toMatch(/worker_identity|personal\.worker|employeeName|individualNeed/i);
  });

  it('no internal-context field anywhere (only "subject" — the Shared half of doc 76 §12)', () => {
    expect(code).not.toMatch(/internalContext|internal_context|caseId|case_id|internalNote/i);
  });

  it('does not invent a 15th governed-action category', () => {
    const catalogSrc = readFileSync(join(process.cwd(), 'lib/audit/governed-action-catalog.ts'), 'utf8');
    const categoryLines = catalogSrc.match(/^\s*'[A-Z_]+',/gm) ?? [];
    expect(categoryLines.length).toBe(14);
    expect(code).not.toMatch(/GOVERNED_ACTION_CATEGORIES\.push/);
  });

  it('migration 059 does not modify migrations 001–058', () => {
    const migSrc = readFileSync(join(process.cwd(), 'supabase/migrations/059_advisor_appointment_lineage.sql'), 'utf8');
    const migSql = migSrc.split('\n').filter((l) => !l.trim().startsWith('--')).join('\n');
    expect(migSql).not.toMatch(/ALTER TABLE advisor\.advisor_identity|ALTER TABLE advisor\.advisor_role_qualification|ALTER TABLE advisor\.advisor_assignment|ALTER TABLE advisor\.advisor_prerequisite_eligibility|ALTER TABLE advisor\.advisor_contact_message/);
  });

  it('migration 059 grants no DELETE on advisor_appointment (history never physically removed)', () => {
    const migSrc = readFileSync(join(process.cwd(), 'supabase/migrations/059_advisor_appointment_lineage.sql'), 'utf8');
    const migSql = migSrc.split('\n').filter((l) => !l.trim().startsWith('--')).join('\n');
    const grantLines = migSql.split('\n').filter((l) => /^\s*GRANT\b/i.test(l));
    expect(grantLines.length).toBeGreaterThan(0);
    for (const line of grantLines) {
      expect(line).not.toMatch(/DELETE/i);
    }
  });
});
