/**
 * KORA-WP-007 — Operational Case Primitive.
 *
 * Behavioral (not string-matching) tests of the REAL functions from
 * lib/operations/operational-case-service.ts, plus the REAL route
 * handlers, with only the Supabase I/O boundary and the governance
 * substrate mocked at their public boundary. Same technique as this
 * session's kora-wp-031/033/035/036 test files.
 *
 * Real-DB proof of RLS/grant/constraint correctness for migration 061
 * lives in this WP's own real-DB validation (see report 124).
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { CASE_ORGANISATION_TYPES, CASE_STATUSES, CASE_LINKED_OBJECT_TYPES } from '@/lib/operations/operational-case-service';

// ═══════════════════════════════════════════════════════════════════════════
// PART 1 — vocabulary (doc 73 §12 / doc 78 §30, verbatim)
// ═══════════════════════════════════════════════════════════════════════════

describe('KORA-WP-007 — vocabulary', () => {
  it('exposes exactly the three organisation types, doc 78 §30', () => {
    expect(CASE_ORGANISATION_TYPES).toEqual(['company', 'partner', 'admin']);
  });

  it('exposes exactly the five canonical statuses, doc 73 §12', () => {
    expect(CASE_STATUSES).toEqual(['open', 'in-progress', 'blocked', 'resolved', 'escalated']);
  });

  it('exposes exactly the five canonical linked-object types, doc 73 §12, plus KORA-WP-116\'s own additive "material_change" (migration 086 — a KORAL Review Case links to a gov.living_koral_material_change row)', () => {
    expect(CASE_LINKED_OBJECT_TYPES).toEqual(['commitment', 'program', 'review', 'certification', 'capability_validation', 'material_change']);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// PART 2 — service: mocked Supabase + governance
// ═══════════════════════════════════════════════════════════════════════════

interface AssignmentRow { id: string; advisor_id: string; company_id: string; }
interface CaseRow {
  id: string; organisation_type: string; organisation_id: string | null;
  linked_object_type: string | null; linked_object_id: string | null;
  owning_advisor_id: string | null; created_by_role: string; subject: string;
  priority: string | null; due_date: string | null; status: string;
  escalation_target: string | null; resolution_note: string | null;
  created_at: string; updated_at: string;
}

interface TenantRow { id: string; }
interface PartnerProfileRow { id: string; }

let assignments: AssignmentRow[] = [];
let cases: CaseRow[] = [];
let tenants: TenantRow[] = [];
let partnerProfiles: PartnerProfileRow[] = [];
let idCounter = 0;

const recordGovernanceEventMock = vi.fn(async (p: Record<string, unknown>) => ({ id: 'ev-1', ...p, occurredAt: 'now' }));

vi.mock('@/lib/supabase/server', () => ({
  getSupabaseServiceClient: () => ({
    schema: (schemaName: string) => ({
      from: (table: string) => {
        if (schemaName === 'advisor' && table === 'advisor_assignment') {
          return {
            select: () => ({
              eq: (col1: string, val1: unknown) => ({
                eq: (col2: string, val2: unknown) => ({
                  maybeSingle: async () => ({
                    data: assignments.find((a) => (a as unknown as Record<string, unknown>)[col1] === val1 && (a as unknown as Record<string, unknown>)[col2] === val2) ?? null,
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        if (schemaName === 'analytics' && table === 'tenant') {
          return {
            select: () => ({
              eq: (_col: string, val: string) => ({
                maybeSingle: async () => ({ data: tenants.find((t) => t.id === val) ?? null, error: null }),
              }),
            }),
          };
        }
        if (schemaName === 'network' && table === 'partner_profile') {
          return {
            select: () => ({
              eq: (_col: string, val: string) => ({
                maybeSingle: async () => ({ data: partnerProfiles.find((p) => p.id === val) ?? null, error: null }),
              }),
            }),
          };
        }
        if (schemaName === 'gov' && table === 'operational_case') {
          return {
            select: () => makeCaseChain({}),
            insert: (payload: Record<string, unknown>) => ({
              select: () => ({
                single: async () => {
                  const row: CaseRow = {
                    id: `case-${++idCounter}`,
                    organisation_type: payload.organisation_type as string,
                    organisation_id: (payload.organisation_id as string) ?? null,
                    linked_object_type: (payload.linked_object_type as string) ?? null,
                    linked_object_id: (payload.linked_object_id as string) ?? null,
                    owning_advisor_id: (payload.owning_advisor_id as string) ?? null,
                    created_by_role: payload.created_by_role as string,
                    subject: payload.subject as string,
                    priority: (payload.priority as string) ?? null,
                    due_date: (payload.due_date as string) ?? null,
                    status: 'open',
                    escalation_target: null,
                    resolution_note: null,
                    created_at: '2026-09-13T00:00:00.000Z',
                    updated_at: '2026-09-13T00:00:00.000Z',
                  };
                  cases.push(row);
                  return { data: row, error: null };
                },
              }),
            }),
            update: (payload: Record<string, unknown>) => ({
              eq: (_col: string, val: string) => ({
                select: () => ({
                  single: async () => {
                    const row = cases.find((c) => c.id === val);
                    if (!row) return { data: null, error: { message: 'no rows returned' } };
                    Object.assign(row, payload);
                    return { data: row, error: null };
                  },
                }),
              }),
            }),
          };
        }
        throw new Error(`unexpected query target in test: ${schemaName}.${table}`);
      },
    }),
  }),
}));

function makeCaseChain(filters: Record<string, unknown>): {
  eq: (col: string, val: unknown) => ReturnType<typeof makeCaseChain>;
  maybeSingle: () => Promise<{ data: CaseRow | null; error: null }>;
  order: (col: string, opts?: { ascending?: boolean }) => ReturnType<typeof makeCaseChain>;
  then: (resolve: (v: { data: CaseRow[]; error: null }) => void) => void;
} {
  const matches = () => cases.filter((c) => Object.entries(filters).every(([k, v]) => (c as unknown as Record<string, unknown>)[k] === v));
  return {
    eq(col: string, val: unknown) { return makeCaseChain({ ...filters, [col]: val }); },
    maybeSingle: async () => ({ data: matches()[0] ?? null, error: null }),
    // Real postgrest-js query builders are thenable at every step (.eq(),
    // .order(), etc. can each be the final awaited call) — this mock
    // matches that: .order() is just another filter-preserving chain
    // link, and every link is directly awaitable.
    order(_col: string, _opts?: { ascending?: boolean }) { return makeCaseChain(filters); },
    then(resolve: (v: { data: CaseRow[]; error: null }) => void) { resolve({ data: matches(), error: null }); },
  };
}

vi.mock('@/lib/audit/governance-event', () => ({
  recordGovernanceEvent: (p: Record<string, unknown>) => recordGovernanceEventMock(p),
}));

function seedTenant(id = 'company-1'): TenantRow {
  const row: TenantRow = { id };
  tenants.push(row);
  return row;
}

function seedPartnerProfile(id = 'partner-1'): PartnerProfileRow {
  const row: PartnerProfileRow = { id };
  partnerProfiles.push(row);
  return row;
}

// Mirrors the real advisor_assignment.company_id -> analytics.tenant FK:
// a genuine Assignment cannot exist against a company that doesn't exist,
// so seeding an Assignment also seeds its Company, exactly like the real
// schema (see migration 057's own FK).
function seedAssignment(overrides: Partial<AssignmentRow> = {}): AssignmentRow {
  const row: AssignmentRow = { id: overrides.id ?? 'assign-1', advisor_id: overrides.advisor_id ?? 'adv-1', company_id: overrides.company_id ?? 'company-1' };
  assignments.push(row);
  seedTenant(row.company_id);
  return row;
}

beforeEach(() => {
  assignments = []; cases = []; tenants = []; partnerProfiles = []; idCounter = 0;
  recordGovernanceEventMock.mockClear();
});

afterEach(() => vi.clearAllMocks());

describe('KORA-WP-007 — createOperationalCase: Advisor-origin flow', () => {
  it('creates a company-scoped Case when the Advisor has a real Assignment to that Company', async () => {
    seedAssignment();
    const { createOperationalCase } = await import('@/lib/operations/operational-case-service');
    const c = await createOperationalCase({ organisationType: 'company', organisationId: 'company-1', subject: 'Onboarding prep', callerRole: 'ADVISOR', callerAdvisorId: 'adv-1', actorId: 'u1' });
    expect(c.status).toBe('open');
    expect(c.createdByRole).toBe('ADVISOR');
    expect(c.owningAdvisorId).toBe('adv-1');
    expect(recordGovernanceEventMock).toHaveBeenCalledTimes(1);
  });

  it('rejects an Advisor with no Assignment tying them to that Company', async () => {
    const { createOperationalCase } = await import('@/lib/operations/operational-case-service');
    await expect(createOperationalCase({ organisationType: 'company', organisationId: 'company-1', subject: 'x', callerRole: 'ADVISOR', callerAdvisorId: 'adv-1', actorId: 'u1' }))
      .rejects.toThrow(/no Assignment tying/);
    expect(cases.length).toBe(0);
  });

  it('rejects an Advisor-origin "partner" or "admin" Case (no Partner Advisor assignment model exists)', async () => {
    seedAssignment();
    const { createOperationalCase } = await import('@/lib/operations/operational-case-service');
    await expect(createOperationalCase({ organisationType: 'partner', organisationId: 'partner-1', subject: 'x', callerRole: 'ADVISOR', callerAdvisorId: 'adv-1', actorId: 'u1' }))
      .rejects.toThrow(/must be organisationType "company"/);
    await expect(createOperationalCase({ organisationType: 'admin', subject: 'x', callerRole: 'ADVISOR', callerAdvisorId: 'adv-1', actorId: 'u1' }))
      .rejects.toThrow(/must be organisationType "company"/);
  });

  it('rejects a missing subject', async () => {
    seedAssignment();
    const { createOperationalCase } = await import('@/lib/operations/operational-case-service');
    await expect(createOperationalCase({ organisationType: 'company', organisationId: 'company-1', subject: '  ', callerRole: 'ADVISOR', callerAdvisorId: 'adv-1', actorId: 'u1' }))
      .rejects.toThrow(/subject is required/);
  });

  it('rejects an unknown organisationType', async () => {
    const { createOperationalCase } = await import('@/lib/operations/operational-case-service');
    await expect(createOperationalCase({ organisationType: 'worker' as never, subject: 'x', callerRole: 'ADVISOR', callerAdvisorId: 'adv-1', actorId: 'u1' }))
      .rejects.toThrow(/unknown organisationType/);
  });

  it('rejects when organisationId is missing for a non-admin organisationType', async () => {
    const { createOperationalCase } = await import('@/lib/operations/operational-case-service');
    await expect(createOperationalCase({ organisationType: 'company', subject: 'x', callerRole: 'ADVISOR', callerAdvisorId: 'adv-1', actorId: 'u1' }))
      .rejects.toThrow(/organisationId is required/);
  });

  it('rejects mismatched linkedObjectType/linkedObjectId pairing', async () => {
    seedAssignment();
    const { createOperationalCase } = await import('@/lib/operations/operational-case-service');
    await expect(createOperationalCase({ organisationType: 'company', organisationId: 'company-1', subject: 'x', linkedObjectType: 'commitment', callerRole: 'ADVISOR', callerAdvisorId: 'adv-1', actorId: 'u1' }))
      .rejects.toThrow(/must be provided together/);
  });
});

describe('KORA-WP-007 — createOperationalCase: Admin-origin flow', () => {
  it('creates an admin-scoped (organisation-less) Case', async () => {
    const { createOperationalCase } = await import('@/lib/operations/operational-case-service');
    const c = await createOperationalCase({ organisationType: 'admin', subject: 'Finance exception', callerRole: 'KORA_ADMIN', actorId: 'admin1' });
    expect(c.organisationId).toBeNull();
    expect(c.createdByRole).toBe('KORA_ADMIN');
    expect(c.owningAdvisorId).toBeNull();
  });

  it('creates a company-scoped Admin-origin Case with no Assignment check, but still requires a real Company', async () => {
    seedTenant('company-9');
    const { createOperationalCase } = await import('@/lib/operations/operational-case-service');
    const c = await createOperationalCase({ organisationType: 'company', organisationId: 'company-9', subject: 'Onboarding blocker', callerRole: 'KORA_ADMIN', actorId: 'admin1' });
    expect(c.organisationId).toBe('company-9');
    expect(c.owningAdvisorId).toBeNull();
  });

  it('creates a partner-scoped Admin-origin Case when the Partner exists', async () => {
    seedPartnerProfile('partner-9');
    const { createOperationalCase } = await import('@/lib/operations/operational-case-service');
    const c = await createOperationalCase({ organisationType: 'partner', organisationId: 'partner-9', subject: 'Certification blocker', callerRole: 'KORA_ADMIN', actorId: 'admin1' });
    expect(c.organisationType).toBe('partner');
    expect(c.organisationId).toBe('partner-9');
  });
});

// Founder Gate A (polymorphic organisation-scope integrity, pre-push
// review): a KORA_ADMIN-origin Case must not be creatable against an
// orphan or type-confused organisation_id.
describe('KORA-WP-007 — Gate A: polymorphic organisation-scope integrity', () => {
  it('rejects a company-scoped Case whose organisationId does not identify a real Company', async () => {
    const { createOperationalCase } = await import('@/lib/operations/operational-case-service');
    await expect(createOperationalCase({ organisationType: 'company', organisationId: 'no-such-company', subject: 'x', callerRole: 'KORA_ADMIN', actorId: 'admin1' }))
      .rejects.toThrow(/does not identify a real Company/);
    expect(cases.length).toBe(0);
  });

  it('rejects a partner-scoped Case whose organisationId does not identify a real Partner', async () => {
    const { createOperationalCase } = await import('@/lib/operations/operational-case-service');
    await expect(createOperationalCase({ organisationType: 'partner', organisationId: 'no-such-partner', subject: 'x', callerRole: 'KORA_ADMIN', actorId: 'admin1' }))
      .rejects.toThrow(/does not identify a real Partner/);
  });

  it('rejects a Company id claimed as a Partner (type confusion)', async () => {
    seedTenant('company-1'); // exists as a Company, never as a Partner
    const { createOperationalCase } = await import('@/lib/operations/operational-case-service');
    await expect(createOperationalCase({ organisationType: 'partner', organisationId: 'company-1', subject: 'x', callerRole: 'KORA_ADMIN', actorId: 'admin1' }))
      .rejects.toThrow(/does not identify a real Partner/);
  });

  it('rejects a Partner id claimed as a Company (type confusion)', async () => {
    seedPartnerProfile('partner-1'); // exists as a Partner, never as a Company
    const { createOperationalCase } = await import('@/lib/operations/operational-case-service');
    await expect(createOperationalCase({ organisationType: 'company', organisationId: 'partner-1', subject: 'x', callerRole: 'KORA_ADMIN', actorId: 'admin1' }))
      .rejects.toThrow(/does not identify a real Company/);
  });
});

describe('KORA-WP-007 — Acceptance: one Advisor-origin and one Admin-origin Case, both queryable through one interface', () => {
  it('both appear in the KORA_ADMIN list', async () => {
    seedAssignment();
    const { createOperationalCase, listOperationalCases } = await import('@/lib/operations/operational-case-service');
    await createOperationalCase({ organisationType: 'company', organisationId: 'company-1', subject: 'Advisor flow', callerRole: 'ADVISOR', callerAdvisorId: 'adv-1', actorId: 'u1' });
    await createOperationalCase({ organisationType: 'admin', subject: 'Admin flow', callerRole: 'KORA_ADMIN', actorId: 'admin1' });

    const adminView = await listOperationalCases({ callerRole: 'KORA_ADMIN' });
    expect(adminView.length).toBe(2);
    expect(adminView.some((c) => c.createdByRole === 'ADVISOR')).toBe(true);
    expect(adminView.some((c) => c.createdByRole === 'KORA_ADMIN')).toBe(true);
  });
});

describe('KORA-WP-007 — listOperationalCases: Advisor sees only their own', () => {
  it('Advisor A does not see Advisor B\'s Case', async () => {
    seedAssignment({ id: 'assign-1', advisor_id: 'adv-1', company_id: 'company-1' });
    seedAssignment({ id: 'assign-2', advisor_id: 'adv-2', company_id: 'company-2' });
    const { createOperationalCase, listOperationalCases } = await import('@/lib/operations/operational-case-service');
    await createOperationalCase({ organisationType: 'company', organisationId: 'company-1', subject: 'A', callerRole: 'ADVISOR', callerAdvisorId: 'adv-1', actorId: 'u1' });
    await createOperationalCase({ organisationType: 'company', organisationId: 'company-2', subject: 'B', callerRole: 'ADVISOR', callerAdvisorId: 'adv-2', actorId: 'u2' });

    const advisorAView = await listOperationalCases({ callerRole: 'ADVISOR', callerAdvisorId: 'adv-1' });
    expect(advisorAView.length).toBe(1);
    expect(advisorAView[0].subject).toBe('A');
  });

  it('rejects a missing callerAdvisorId for an Advisor caller', async () => {
    const { listOperationalCases } = await import('@/lib/operations/operational-case-service');
    await expect(listOperationalCases({ callerRole: 'ADVISOR' })).rejects.toThrow(/callerAdvisorId is required/);
  });
});

describe('KORA-WP-007 — transitionOperationalCaseStatus: the required status-transition test', () => {
  async function seedOwnCase() {
    seedAssignment();
    const { createOperationalCase } = await import('@/lib/operations/operational-case-service');
    return createOperationalCase({ organisationType: 'company', organisationId: 'company-1', subject: 'x', callerRole: 'ADVISOR', callerAdvisorId: 'adv-1', actorId: 'u1' });
  }

  it('Advisor transitions their own Case open -> in-progress -> resolved', async () => {
    const created = await seedOwnCase();
    const { transitionOperationalCaseStatus } = await import('@/lib/operations/operational-case-service');
    const t1 = await transitionOperationalCaseStatus({ caseId: created.id, newStatus: 'in-progress', callerRole: 'ADVISOR', callerAdvisorId: 'adv-1', actorId: 'u1' });
    expect(t1.status).toBe('in-progress');
    const t2 = await transitionOperationalCaseStatus({ caseId: created.id, newStatus: 'resolved', resolutionNote: 'done', callerRole: 'ADVISOR', callerAdvisorId: 'adv-1', actorId: 'u1' });
    expect(t2.status).toBe('resolved');
    expect(t2.resolutionNote).toBe('done');
    expect(recordGovernanceEventMock).toHaveBeenCalledTimes(3); // create + 2 transitions
  });

  it('rejects a transition by a non-owning Advisor', async () => {
    const created = await seedOwnCase();
    const { transitionOperationalCaseStatus } = await import('@/lib/operations/operational-case-service');
    await expect(transitionOperationalCaseStatus({ caseId: created.id, newStatus: 'blocked', callerRole: 'ADVISOR', callerAdvisorId: 'adv-2', actorId: 'u2' }))
      .rejects.toThrow(/does not own this Case/);
  });

  it('rejects an unknown status', async () => {
    const created = await seedOwnCase();
    const { transitionOperationalCaseStatus } = await import('@/lib/operations/operational-case-service');
    await expect(transitionOperationalCaseStatus({ caseId: created.id, newStatus: 'archived' as never, callerRole: 'ADVISOR', callerAdvisorId: 'adv-1', actorId: 'u1' }))
      .rejects.toThrow(/unknown status/);
  });

  it('rejects a nonexistent Case', async () => {
    const { transitionOperationalCaseStatus } = await import('@/lib/operations/operational-case-service');
    await expect(transitionOperationalCaseStatus({ caseId: 'no-such', newStatus: 'blocked', callerRole: 'KORA_ADMIN', actorId: 'admin1' }))
      .rejects.toThrow(/no such Case/);
  });

  it('rejects an Advisor attempting reassignment (KORA_ADMIN-only)', async () => {
    const created = await seedOwnCase();
    const { transitionOperationalCaseStatus } = await import('@/lib/operations/operational-case-service');
    await expect(transitionOperationalCaseStatus({ caseId: created.id, newStatus: 'open', newOwningAdvisorId: 'adv-2', callerRole: 'ADVISOR', callerAdvisorId: 'adv-1', actorId: 'u1' }))
      .rejects.toThrow(/only KORA_ADMIN may reassign/);
  });

  it('KORA_ADMIN reassigns a Case (the "handoff record on reassignment")', async () => {
    const created = await seedOwnCase();
    const { transitionOperationalCaseStatus } = await import('@/lib/operations/operational-case-service');
    const t = await transitionOperationalCaseStatus({ caseId: created.id, newStatus: 'open', newOwningAdvisorId: 'adv-2', callerRole: 'KORA_ADMIN', actorId: 'admin1' });
    expect(t.owningAdvisorId).toBe('adv-2');
    expect(recordGovernanceEventMock).toHaveBeenLastCalledWith(expect.objectContaining({ eventType: 'operational_case.reassigned' }));
  });
});

// Founder Gate B (canonical lifecycle transitions, pre-push review): doc 79
// §13's exact frozen graph — open -> {in-progress, blocked, escalated};
// in-progress -> {resolved}; blocked -> {in-progress}; escalated ->
// {in-progress, resolved}; resolved is terminal.
describe('KORA-WP-007 — Gate B: canonical lifecycle transition matrix (doc 79 §13)', () => {
  async function seedCaseAt(status: CaseRow['status']) {
    seedAssignment();
    const { createOperationalCase } = await import('@/lib/operations/operational-case-service');
    const created = await createOperationalCase({ organisationType: 'company', organisationId: 'company-1', subject: 'x', callerRole: 'ADVISOR', callerAdvisorId: 'adv-1', actorId: 'u1' });
    if (status !== 'open') {
      const row = cases.find((c) => c.id === created.id);
      if (row) row.status = status; // seed directly at the target starting state, bypassing the graph
    }
    return created;
  }

  it.each([
    ['open', 'in-progress'],
    ['open', 'blocked'],
    ['open', 'escalated'],
    ['in-progress', 'resolved'],
    ['blocked', 'in-progress'],
    ['escalated', 'in-progress'],
    ['escalated', 'resolved'],
  ] as const)('ALLOWS %s -> %s', async (from, to) => {
    const created = await seedCaseAt(from);
    const { transitionOperationalCaseStatus } = await import('@/lib/operations/operational-case-service');
    const result = await transitionOperationalCaseStatus({ caseId: created.id, newStatus: to, callerRole: 'ADVISOR', callerAdvisorId: 'adv-1', actorId: 'u1' });
    expect(result.status).toBe(to);
  });

  it.each([
    ['open', 'resolved'],
    ['in-progress', 'blocked'],
    ['in-progress', 'escalated'],
    ['blocked', 'resolved'],
    ['blocked', 'escalated'],
    ['resolved', 'open'],
    ['resolved', 'in-progress'],
    ['resolved', 'escalated'],
  ] as const)('DENIES %s -> %s', async (from, to) => {
    const created = await seedCaseAt(from);
    const { transitionOperationalCaseStatus } = await import('@/lib/operations/operational-case-service');
    await expect(transitionOperationalCaseStatus({ caseId: created.id, newStatus: to, callerRole: 'ADVISOR', callerAdvisorId: 'adv-1', actorId: 'u1' }))
      .rejects.toThrow(/cannot transition from/);
  });

  it('RESOLVED is terminal — no outgoing transition exists', async () => {
    const created = await seedCaseAt('resolved');
    const { transitionOperationalCaseStatus, CASE_ALLOWED_TRANSITIONS } = await import('@/lib/operations/operational-case-service');
    expect(CASE_ALLOWED_TRANSITIONS.resolved).toEqual([]);
    for (const target of ['open', 'in-progress', 'blocked', 'escalated'] as const) {
      await expect(transitionOperationalCaseStatus({ caseId: created.id, newStatus: target, callerRole: 'ADVISOR', callerAdvisorId: 'adv-1', actorId: 'u1' }))
        .rejects.toThrow(/cannot transition from/);
    }
  });

  it('a same-status update (reassignment/resolution-note only) is never treated as a graph transition', async () => {
    const created = await seedCaseAt('open');
    const { transitionOperationalCaseStatus } = await import('@/lib/operations/operational-case-service');
    const result = await transitionOperationalCaseStatus({ caseId: created.id, newStatus: 'open', resolutionNote: 'note only', callerRole: 'ADVISOR', callerAdvisorId: 'adv-1', actorId: 'u1' });
    expect(result.status).toBe('open');
    expect(result.resolutionNote).toBe('note only');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// PART 3 — route boundary
// ═══════════════════════════════════════════════════════════════════════════

const mockRequireAdvisorUser = vi.fn();
const mockRequireKoraAdmin = vi.fn();
const mockGetAdvisorIdentity = vi.fn();

vi.mock('@/lib/auth/kora-session', () => ({
  requireAdvisorUser: (...args: unknown[]) => mockRequireAdvisorUser(...args),
  requireKoraAdmin: (...args: unknown[]) => mockRequireKoraAdmin(...args),
  isKoraAuthError: (v: unknown) => v instanceof NextResponse,
}));

vi.mock('@/lib/advisor-identity/advisor-identity-service', () => ({
  getAdvisorIdentityByAuthUserId: (...args: unknown[]) => mockGetAdvisorIdentity(...args),
}));

// KORA-WP-007's own original Advisor-origin route,
// `app/api/advisor/cases/{,[caseId]}/route.ts`, was retired during
// Consolidation Audit Wave 2 remediation (AUD-W2-ITEM-9): it authorized
// Advisor-origin Case creation/transition via `assertAdvisorTiedToCompany()`,
// which matched ANY advisor_assignment row (active OR ended) with no
// status filter — unlike KORA-WP-034's own dedicated
// `assertActiveAssignmentAndGetCompanyId()`, which correctly requires an
// ACTIVE Assignment (Founder Decision H-A). The route had zero real UI
// consumer (confirmed by repo-wide search) and WP-007's own Acceptance
// ("one Case from an Advisor flow and one from an Admin flow both
// queryable through one interface") was never a promise of this specific
// HTTP contract — it is satisfied by the shared `operational-case-service.ts`
// primitive, still exercised by KORA-WP-034's own route (its own test
// file, kora-wp-034-advisor-cases.test.ts) and by the KORA_ADMIN route
// below. Retiring this route, rather than adding a redundant local status
// check, leaves exactly ONE canonical Advisor Case entry path (KORA-WP-034)
// with no risk of the two ever disagreeing again.

describe('KORA-WP-007 — GET/POST /api/admin/cases', () => {
  beforeEach(() => { mockRequireKoraAdmin.mockReset(); });

  it('GET returns the auth error unchanged when not KORA_ADMIN', async () => {
    mockRequireKoraAdmin.mockResolvedValue(NextResponse.json({ error: 'Forbidden' }, { status: 403 }));
    const { GET } = await import('@/app/api/admin/cases/route');
    const res = await GET(new NextRequest('http://localhost/x'));
    expect(res.status).toBe(403);
  });

  it('POST rejects a missing subject with 400', async () => {
    mockRequireKoraAdmin.mockResolvedValue({ id: 'admin1', email: 'a@x.test', koraRole: 'KORA_ADMIN' });
    const { POST } = await import('@/app/api/admin/cases/route');
    const req = new NextRequest('http://localhost/x', { method: 'POST', body: JSON.stringify({ organisationType: 'admin' }) });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('POST creates an admin-origin Case on success', async () => {
    mockRequireKoraAdmin.mockResolvedValue({ id: 'admin1', email: 'a@x.test', koraRole: 'KORA_ADMIN' });
    const { POST } = await import('@/app/api/admin/cases/route');
    const req = new NextRequest('http://localhost/x', { method: 'POST', body: JSON.stringify({ organisationType: 'admin', subject: 'x' }) });
    const res = await POST(req);
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
  });
});

describe('KORA-WP-007 — POST /api/admin/cases/[caseId] — reassignment path', () => {
  beforeEach(() => { mockRequireKoraAdmin.mockReset(); });

  it('rejects an unknown status with 400', async () => {
    mockRequireKoraAdmin.mockResolvedValue({ id: 'admin1', email: 'a@x.test', koraRole: 'KORA_ADMIN' });
    const { POST } = await import('@/app/api/admin/cases/[caseId]/route');
    const req = new NextRequest('http://localhost/x', { method: 'POST', body: JSON.stringify({ status: 'archived' }) });
    const res = await POST(req, { params: Promise.resolve({ caseId: 'case-1' }) });
    expect(res.status).toBe(400);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// PART 4 — scope integrity: no Task, no WP-034/041/067/076 implementation
// ═══════════════════════════════════════════════════════════════════════════

describe('KORA-WP-007 — scope integrity: Case only, no Task, no downstream WP anticipation', () => {
  const files = [
    'lib/operations/operational-case-service.ts',
    // app/api/advisor/cases/{,[caseId]}/route.ts retired, AUD-W2-ITEM-9 —
    // KORA-WP-034's own route is now the sole Advisor-origin Case entry path.
    'app/api/admin/cases/route.ts',
    'app/api/admin/cases/[caseId]/route.ts',
    'app/admin/cases/page.tsx',
  ].map((p) => readFileSync(join(process.cwd(), p), 'utf8'));
  const allSrc = files.join('\n');
  const code = allSrc.split('\n').filter((l) => !l.trim().startsWith('//') && !l.trim().startsWith('*')).join('\n');

  it('no Task persistence/table/status/assignee/checklist', () => {
    expect(code).not.toMatch(/operational_tasks|taskStatus|taskAssignee|checklistItem|task_due_date/i);
  });

  it('no Advisor Case UI beyond what this WP authorizes (no dashboard/kanban/inbox)', () => {
    expect(code).not.toMatch(/caseKanban|caseDashboard|caseInbox|advisorCaseCenter/i);
  });

  it('no WP-041 offboarding playbook/sequence concept', () => {
    expect(code).not.toMatch(/offboardingPlaybook|offboardingSequence|handoverSteps/i);
  });

  it('no WP-067 notification-trigger concept', () => {
    expect(code).not.toMatch(/notificationTrigger|sendNotification|alertRule/i);
  });

  it('no WP-076 admin queue-maturity concept', () => {
    expect(code).not.toMatch(/queueView|queueConsole|queueDepth|queueAging/i);
  });

  it('no fabricated FK to a non-existent canonical object table (Commitment/Program/Review/Certification/CapabilityValidation)', () => {
    expect(code).not.toMatch(/REFERENCES\s+\w+\.(commitment|program|review|certification|capability_validation)/i);
  });

  it('does not invent a 15th governed-action category', () => {
    const catalogSrc = readFileSync(join(process.cwd(), 'lib/audit/governed-action-catalog.ts'), 'utf8');
    const categoryLines = catalogSrc.match(/^\s*'[A-Z_]+',/gm) ?? [];
    expect(categoryLines.length).toBe(14);
    expect(code).not.toMatch(/GOVERNED_ACTION_CATEGORIES\.push/);
  });

  it('migration 061 does not modify migrations 001–060', () => {
    const migSrc = readFileSync(join(process.cwd(), 'supabase/migrations/061_operational_case_primitive.sql'), 'utf8');
    const migSql = migSrc.split('\n').filter((l) => !l.trim().startsWith('--')).join('\n');
    expect(migSql).not.toMatch(/ALTER TABLE advisor\.|ALTER TABLE gov\.budget_governance|ALTER TABLE gov\.internal_operator|ALTER TABLE gov\.capability_grant/);
  });

  it('migration 061 grants no DELETE on operational_case (rows never physically removed)', () => {
    const migSrc = readFileSync(join(process.cwd(), 'supabase/migrations/061_operational_case_primitive.sql'), 'utf8');
    const migSql = migSrc.split('\n').filter((l) => !l.trim().startsWith('--')).join('\n');
    const grantLines = migSql.split('\n').filter((l) => /^\s*GRANT\b/i.test(l));
    expect(grantLines.length).toBeGreaterThan(0);
    for (const line of grantLines) {
      expect(line).not.toMatch(/DELETE/i);
    }
  });

  it('migration 061 defines exactly the three canonical organisation types, no fourth', () => {
    const migSrc = readFileSync(join(process.cwd(), 'supabase/migrations/061_operational_case_primitive.sql'), 'utf8');
    const checkMatch = migSrc.match(/CHECK \(organisation_type IN \(([\s\S]*?)\)\)/);
    expect(checkMatch).not.toBeNull();
    const tokens = (checkMatch?.[1] ?? '').match(/'[a-z_]+'/g) ?? [];
    expect(tokens).toEqual(["'company'", "'partner'", "'admin'"]);
  });

  it('no admin-nav-groups.ts or Sidebar.tsx dead-link deletion was fabricated (ADMIN-021 required no code change)', () => {
    const navSrc = readFileSync(join(process.cwd(), 'lib/navigation/admin-nav-groups.ts'), 'utf8');
    // The only change this WP makes to the nav file is adding the new
    // Case list entry — verified by presence, not by counting removals.
    expect(navSrc).toMatch(/href: '\/admin\/cases'/);
  });
});
