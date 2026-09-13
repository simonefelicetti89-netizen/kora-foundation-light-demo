/**
 * KORA-WP-034 — Advisor Tasks & Cases.
 *
 * Behavioral (not string-matching) tests of the REAL functions from
 * lib/advisor-portal/advisor-case-service.ts, plus the REAL route
 * handlers, with only the Supabase I/O boundary and the governance
 * substrate mocked at their public boundary. Same technique as this
 * session's kora-wp-007/031/033/035/036 test files.
 *
 * No migration exists for this WP (Data/Migration Impact: NONE, file 102)
 * — real-DB proof lives in this WP's own real-DB validation reusing
 * migration 061 unchanged (see report 125).
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

interface AssignmentRow { id: string; advisor_id: string; company_id: string; status: string; }
interface CaseRow {
  id: string; organisation_type: string; organisation_id: string | null;
  linked_object_type: string | null; linked_object_id: string | null;
  owning_advisor_id: string | null; created_by_role: string; subject: string;
  priority: string | null; due_date: string | null; status: string;
  escalation_target: string | null; resolution_note: string | null;
  created_at: string; updated_at: string;
}

let assignments: AssignmentRow[] = [];
let cases: CaseRow[] = [];
let idCounter = 0;

const recordGovernanceEventMock = vi.fn(async (p: Record<string, unknown>) => ({ id: 'ev-1', ...p, occurredAt: 'now' }));

vi.mock('@/lib/supabase/server', () => ({
  getSupabaseServiceClient: () => ({
    schema: (schemaName: string) => ({
      from: (table: string) => {
        if (schemaName === 'advisor' && table === 'advisor_assignment') {
          return { select: () => makeAssignmentChain({}) };
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
        if (schemaName === 'analytics' && table === 'tenant') {
          return { select: () => ({ eq: (_col: string, _val: string) => ({ maybeSingle: async () => ({ data: { id: _val }, error: null }) }) }) };
        }
        throw new Error(`unexpected query target in test: ${schemaName}.${table}`);
      },
    }),
  }),
}));

// advisor_assignment is queried two different ways in this test: WP-034's
// own single .eq('id', assignmentId) lookup, and WP-007's own
// assertAdvisorTiedToCompany double .eq('advisor_id',...).eq('company_id',...)
// lookup — a real, filter-accumulating chain supports both.
function makeAssignmentChain(filters: Record<string, unknown>): {
  eq: (col: string, val: unknown) => ReturnType<typeof makeAssignmentChain>;
  maybeSingle: () => Promise<{ data: AssignmentRow | null; error: null }>;
} {
  const matches = () => assignments.filter((a) => Object.entries(filters).every(([k, v]) => (a as unknown as Record<string, unknown>)[k] === v));
  return {
    eq(col: string, val: unknown) { return makeAssignmentChain({ ...filters, [col]: val }); },
    maybeSingle: async () => ({ data: matches()[0] ?? null, error: null }),
  };
}

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
    order(_col: string, _opts?: { ascending?: boolean }) { return makeCaseChain(filters); },
    then(resolve: (v: { data: CaseRow[]; error: null }) => void) { resolve({ data: matches(), error: null }); },
  };
}

vi.mock('@/lib/audit/governance-event', () => ({
  recordGovernanceEvent: (p: Record<string, unknown>) => recordGovernanceEventMock(p),
}));

function seedAssignment(overrides: Partial<AssignmentRow> = {}): AssignmentRow {
  const row: AssignmentRow = {
    id: overrides.id ?? 'assign-1', advisor_id: overrides.advisor_id ?? 'adv-1',
    company_id: overrides.company_id ?? 'company-1', status: overrides.status ?? 'active',
  };
  assignments.push(row);
  return row;
}

beforeEach(() => {
  assignments = []; cases = []; idCounter = 0;
  recordGovernanceEventMock.mockClear();
});

afterEach(() => vi.clearAllMocks());

// ═══════════════════════════════════════════════════════════════════════════
// PART 1 — createAdvisorCase / listAdvisorCases: Assignment-scoped authority
// ═══════════════════════════════════════════════════════════════════════════

describe('KORA-WP-034 — createAdvisorCase: requires an ACTIVE Assignment, always company-scoped', () => {
  it('creates a Case for the Assignment\'s own Company while active', async () => {
    seedAssignment();
    const { createAdvisorCase } = await import('@/lib/advisor-portal/advisor-case-service');
    const c = await createAdvisorCase({ assignmentId: 'assign-1', callerAdvisorId: 'adv-1', subject: 'Onboarding prep', actorId: 'u1' });
    expect(c.organisationType).toBe('company');
    expect(c.organisationId).toBe('company-1');
    expect(c.status).toBe('open');
    expect(c.owningAdvisorId).toBe('adv-1');
  });

  it('rejects once the Assignment has ended', async () => {
    const a = seedAssignment();
    a.status = 'ended';
    const { createAdvisorCase } = await import('@/lib/advisor-portal/advisor-case-service');
    await expect(createAdvisorCase({ assignmentId: 'assign-1', callerAdvisorId: 'adv-1', subject: 'x', actorId: 'u1' }))
      .rejects.toThrow(/Assignment has ended/);
    expect(cases.length).toBe(0);
  });

  it('rejects a caller who is not the Advisor party to this Assignment', async () => {
    seedAssignment();
    const { createAdvisorCase } = await import('@/lib/advisor-portal/advisor-case-service');
    await expect(createAdvisorCase({ assignmentId: 'assign-1', callerAdvisorId: 'adv-2', subject: 'x', actorId: 'u2' }))
      .rejects.toThrow(/not the Advisor party/);
  });

  it('rejects a nonexistent assignment', async () => {
    const { createAdvisorCase } = await import('@/lib/advisor-portal/advisor-case-service');
    await expect(createAdvisorCase({ assignmentId: 'no-such', callerAdvisorId: 'adv-1', subject: 'x', actorId: 'u1' }))
      .rejects.toThrow(/not the Advisor party/);
  });
});

describe('KORA-WP-034 — listAdvisorCases: multi-Company isolation', () => {
  it('Advisor sees only Cases scoped to the exact Assignment\'s Company, not other companies\' Cases', async () => {
    seedAssignment({ id: 'assign-a', advisor_id: 'adv-1', company_id: 'company-a' });
    seedAssignment({ id: 'assign-b', advisor_id: 'adv-1', company_id: 'company-b' });
    const { createAdvisorCase, listAdvisorCases } = await import('@/lib/advisor-portal/advisor-case-service');
    await createAdvisorCase({ assignmentId: 'assign-a', callerAdvisorId: 'adv-1', subject: 'A case', actorId: 'u1' });
    await createAdvisorCase({ assignmentId: 'assign-b', callerAdvisorId: 'adv-1', subject: 'B case', actorId: 'u1' });

    const viewA = await listAdvisorCases('assign-a', 'adv-1');
    expect(viewA.length).toBe(1);
    expect(viewA[0].subject).toBe('A case');

    const viewB = await listAdvisorCases('assign-b', 'adv-1');
    expect(viewB.length).toBe(1);
    expect(viewB[0].subject).toBe('B case');
  });

  it('rejects listing once the Assignment has ended, without deleting the Case', async () => {
    const a = seedAssignment();
    const { createAdvisorCase, listAdvisorCases } = await import('@/lib/advisor-portal/advisor-case-service');
    const created = await createAdvisorCase({ assignmentId: 'assign-1', callerAdvisorId: 'adv-1', subject: 'x', actorId: 'u1' });
    a.status = 'ended';
    await expect(listAdvisorCases('assign-1', 'adv-1')).rejects.toThrow(/Assignment has ended/);
    expect(cases.find((c) => c.id === created.id)).toBeDefined(); // still physically present
  });

  it('access returns once a new active Assignment exists (no permanent ban)', async () => {
    const a = seedAssignment();
    const { createAdvisorCase, listAdvisorCases } = await import('@/lib/advisor-portal/advisor-case-service');
    await createAdvisorCase({ assignmentId: 'assign-1', callerAdvisorId: 'adv-1', subject: 'x', actorId: 'u1' });
    a.status = 'ended';
    await expect(listAdvisorCases('assign-1', 'adv-1')).rejects.toThrow(/Assignment has ended/);
    a.status = 'active';
    const view = await listAdvisorCases('assign-1', 'adv-1');
    expect(view.length).toBe(1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// PART 2 — transitionAdvisorCase: canonical lifecycle reuse
// ═══════════════════════════════════════════════════════════════════════════

describe('KORA-WP-034 — transitionAdvisorCase: reuses WP-007\'s canonical transition guard', () => {
  async function seedOwnCase() {
    seedAssignment();
    const { createAdvisorCase } = await import('@/lib/advisor-portal/advisor-case-service');
    return createAdvisorCase({ assignmentId: 'assign-1', callerAdvisorId: 'adv-1', subject: 'x', actorId: 'u1' });
  }

  it('Avvia: open -> in-progress ALLOWED', async () => {
    const created = await seedOwnCase();
    const { transitionAdvisorCase } = await import('@/lib/advisor-portal/advisor-case-service');
    const t = await transitionAdvisorCase({ assignmentId: 'assign-1', caseId: created.id, callerAdvisorId: 'adv-1', newStatus: 'in-progress', actorId: 'u1' });
    expect(t.status).toBe('in-progress');
  });

  it('Risolvi: in-progress -> resolved ALLOWED, resolved is terminal', async () => {
    const created = await seedOwnCase();
    const { transitionAdvisorCase } = await import('@/lib/advisor-portal/advisor-case-service');
    await transitionAdvisorCase({ assignmentId: 'assign-1', caseId: created.id, callerAdvisorId: 'adv-1', newStatus: 'in-progress', actorId: 'u1' });
    const resolved = await transitionAdvisorCase({ assignmentId: 'assign-1', caseId: created.id, callerAdvisorId: 'adv-1', newStatus: 'resolved', actorId: 'u1' });
    expect(resolved.status).toBe('resolved');
    await expect(transitionAdvisorCase({ assignmentId: 'assign-1', caseId: created.id, callerAdvisorId: 'adv-1', newStatus: 'open', actorId: 'u1' }))
      .rejects.toThrow(/cannot transition from/);
  });

  it('rejects an invalid jump (open -> resolved directly) — the same WP-007 guard, not reimplemented', async () => {
    const created = await seedOwnCase();
    const { transitionAdvisorCase } = await import('@/lib/advisor-portal/advisor-case-service');
    await expect(transitionAdvisorCase({ assignmentId: 'assign-1', caseId: created.id, callerAdvisorId: 'adv-1', newStatus: 'resolved', actorId: 'u1' }))
      .rejects.toThrow(/cannot transition from/);
  });

  it('rejects a transition once the Assignment has ended', async () => {
    const a = seedAssignment({ id: 'assign-2', company_id: 'company-2' });
    const { createAdvisorCase, transitionAdvisorCase } = await import('@/lib/advisor-portal/advisor-case-service');
    const created = await createAdvisorCase({ assignmentId: 'assign-2', callerAdvisorId: 'adv-1', subject: 'x', actorId: 'u1' });
    a.status = 'ended';
    await expect(transitionAdvisorCase({ assignmentId: 'assign-2', caseId: created.id, callerAdvisorId: 'adv-1', newStatus: 'in-progress', actorId: 'u1' }))
      .rejects.toThrow(/Assignment has ended/);
  });

  it('rejects a Case that does not belong to this Assignment\'s Company (cross-company forgery)', async () => {
    seedAssignment({ id: 'assign-a', advisor_id: 'adv-1', company_id: 'company-a' });
    seedAssignment({ id: 'assign-b', advisor_id: 'adv-1', company_id: 'company-b' });
    const { createAdvisorCase, transitionAdvisorCase } = await import('@/lib/advisor-portal/advisor-case-service');
    const caseA = await createAdvisorCase({ assignmentId: 'assign-a', callerAdvisorId: 'adv-1', subject: 'x', actorId: 'u1' });
    await expect(transitionAdvisorCase({ assignmentId: 'assign-b', caseId: caseA.id, callerAdvisorId: 'adv-1', newStatus: 'in-progress', actorId: 'u1' }))
      .rejects.toThrow(/does not belong to this Assignment's Company/);
  });

  it('rejects a nonexistent Case', async () => {
    seedAssignment();
    const { transitionAdvisorCase } = await import('@/lib/advisor-portal/advisor-case-service');
    await expect(transitionAdvisorCase({ assignmentId: 'assign-1', caseId: 'no-such', callerAdvisorId: 'adv-1', newStatus: 'in-progress', actorId: 'u1' }))
      .rejects.toThrow(/no such Case/);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// PART 3 — route boundary
// ═══════════════════════════════════════════════════════════════════════════

const mockRequireAdvisorUser = vi.fn();
const mockGetAdvisorIdentity = vi.fn();

vi.mock('@/lib/auth/kora-session', () => ({
  requireAdvisorUser: (...args: unknown[]) => mockRequireAdvisorUser(...args),
  isKoraAuthError: (v: unknown) => v instanceof NextResponse,
}));

vi.mock('@/lib/advisor-identity/advisor-identity-service', () => ({
  getAdvisorIdentityByAuthUserId: (...args: unknown[]) => mockGetAdvisorIdentity(...args),
}));

describe('KORA-WP-034 — GET/POST /api/advisor/companies/[assignmentId]/cases', () => {
  beforeEach(() => { mockRequireAdvisorUser.mockReset(); mockGetAdvisorIdentity.mockReset(); });

  it('GET returns the auth error unchanged when not ADVISOR', async () => {
    mockRequireAdvisorUser.mockResolvedValue(NextResponse.json({ error: 'Forbidden' }, { status: 403 }));
    const { GET } = await import('@/app/api/advisor/companies/[assignmentId]/cases/route');
    const res = await GET(new NextRequest('http://localhost/x'), { params: Promise.resolve({ assignmentId: 'assign-1' }) });
    expect(res.status).toBe(403);
  });

  it('GET rejects with 403 when no Advisor profile is resolved', async () => {
    mockRequireAdvisorUser.mockResolvedValue({ id: 'u1', email: 'a@x.test', koraRole: 'ADVISOR' });
    mockGetAdvisorIdentity.mockResolvedValue(null);
    const { GET } = await import('@/app/api/advisor/companies/[assignmentId]/cases/route');
    const res = await GET(new NextRequest('http://localhost/x'), { params: Promise.resolve({ assignmentId: 'assign-1' }) });
    expect(res.status).toBe(403);
  });

  it('POST rejects a missing subject with 400', async () => {
    mockRequireAdvisorUser.mockResolvedValue({ id: 'u1', email: 'a@x.test', koraRole: 'ADVISOR' });
    const { POST } = await import('@/app/api/advisor/companies/[assignmentId]/cases/route');
    const req = new NextRequest('http://localhost/x', { method: 'POST', body: JSON.stringify({}) });
    const res = await POST(req, { params: Promise.resolve({ assignmentId: 'assign-1' }) });
    expect(res.status).toBe(400);
  });

  it('POST creates a Case on success', async () => {
    seedAssignment();
    mockRequireAdvisorUser.mockResolvedValue({ id: 'u1', email: 'a@x.test', koraRole: 'ADVISOR' });
    mockGetAdvisorIdentity.mockResolvedValue({ id: 'adv-1' });
    const { POST } = await import('@/app/api/advisor/companies/[assignmentId]/cases/route');
    const req = new NextRequest('http://localhost/x', { method: 'POST', body: JSON.stringify({ subject: 'x' }) });
    const res = await POST(req, { params: Promise.resolve({ assignmentId: 'assign-1' }) });
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
  });

  it('POST returns 422 once the Assignment has ended', async () => {
    const a = seedAssignment();
    a.status = 'ended';
    mockRequireAdvisorUser.mockResolvedValue({ id: 'u1', email: 'a@x.test', koraRole: 'ADVISOR' });
    mockGetAdvisorIdentity.mockResolvedValue({ id: 'adv-1' });
    const { POST } = await import('@/app/api/advisor/companies/[assignmentId]/cases/route');
    const req = new NextRequest('http://localhost/x', { method: 'POST', body: JSON.stringify({ subject: 'x' }) });
    const res = await POST(req, { params: Promise.resolve({ assignmentId: 'assign-1' }) });
    expect(res.status).toBe(422);
  });
});

describe('KORA-WP-034 — POST /api/advisor/companies/[assignmentId]/cases/[caseId]', () => {
  beforeEach(() => { mockRequireAdvisorUser.mockReset(); mockGetAdvisorIdentity.mockReset(); });

  it('rejects an unknown status with 400', async () => {
    mockRequireAdvisorUser.mockResolvedValue({ id: 'u1', email: 'a@x.test', koraRole: 'ADVISOR' });
    const { POST } = await import('@/app/api/advisor/companies/[assignmentId]/cases/[caseId]/route');
    const req = new NextRequest('http://localhost/x', { method: 'POST', body: JSON.stringify({ status: 'archived' }) });
    const res = await POST(req, { params: Promise.resolve({ assignmentId: 'assign-1', caseId: 'case-1' }) });
    expect(res.status).toBe(400);
  });

  it('transitions successfully on the real service path', async () => {
    seedAssignment();
    mockRequireAdvisorUser.mockResolvedValue({ id: 'u1', email: 'a@x.test', koraRole: 'ADVISOR' });
    mockGetAdvisorIdentity.mockResolvedValue({ id: 'adv-1' });
    const { createAdvisorCase } = await import('@/lib/advisor-portal/advisor-case-service');
    const created = await createAdvisorCase({ assignmentId: 'assign-1', callerAdvisorId: 'adv-1', subject: 'x', actorId: 'u1' });
    const { POST } = await import('@/app/api/advisor/companies/[assignmentId]/cases/[caseId]/route');
    const req = new NextRequest('http://localhost/x', { method: 'POST', body: JSON.stringify({ status: 'in-progress' }) });
    const res = await POST(req, { params: Promise.resolve({ assignmentId: 'assign-1', caseId: created.id }) });
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.case.status).toBe('in-progress');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// PART 4 — scope integrity
// ═══════════════════════════════════════════════════════════════════════════

describe('KORA-WP-034 — scope integrity: no Task, no second Case truth, no Company UI, no WP-041, no Partner access', () => {
  const files = [
    'lib/advisor-portal/advisor-case-service.ts',
    'app/api/advisor/companies/[assignmentId]/cases/route.ts',
    'app/advisor/companies/page.tsx',
  ];
  const code = files
    .map((p) => readFileSync(join(process.cwd(), p), 'utf8'))
    .join('\n')
    .split('\n')
    .filter((l) => !l.trim().startsWith('//') && !l.trim().startsWith('*'))
    .join('\n');

  it('no Task persistence/table/status/assignee/checklist', () => {
    expect(code).not.toMatch(/operational_tasks|taskStatus|taskAssignee|checklistItem|task_due_date/i);
  });

  it('no second Case table/schema created (no CREATE TABLE anywhere in this WP\'s files)', () => {
    expect(code).not.toMatch(/CREATE TABLE/i);
  });

  it('no Company-facing Case UI/route concept', () => {
    expect(code).not.toMatch(/CompanyCaseList|CompanyCaseDetail|company\/cases/i);
  });

  it('no WP-041 offboarding playbook concept', () => {
    expect(code).not.toMatch(/offboardingPlaybook|offboardingSequence|handoverSteps/i);
  });

  it('no generic CRM concept (pipeline, lead, sales stage, tags, watchers, SLA engine)', () => {
    expect(code).not.toMatch(/salesStage|leadStatus|dealPipeline|watcherList|slaEngine/i);
  });

  it('no comments/attachments/document-management duplication of WP-036\'s content taxonomy', () => {
    expect(code).not.toMatch(/caseComment|caseAttachment|fileUpload|attachmentUrl/i);
  });

  it('no appointment/scheduling duplication of WP-035', () => {
    expect(code).not.toMatch(/rescheduled_from_id|starts_at|ends_at|callScheduling/i);
  });

  it('no Partner-scoped Case creation path exists (organisationType is always literal "company" in this service)', () => {
    const serviceSrc = readFileSync(join(process.cwd(), 'lib/advisor-portal/advisor-case-service.ts'), 'utf8');
    expect(serviceSrc).not.toMatch(/organisationType:\s*['"]partner['"]/);
    expect(serviceSrc).not.toMatch(/organisationType:\s*params\.organisationType/); // never caller-suppliable
  });

  it('does not invent a 15th governed-action category', () => {
    const catalogSrc = readFileSync(join(process.cwd(), 'lib/audit/governed-action-catalog.ts'), 'utf8');
    const categoryLines = catalogSrc.match(/^\s*'[A-Z_]+',/gm) ?? [];
    expect(categoryLines.length).toBe(14);
  });

  it('KORA-WP-034 itself introduced no migration (062, when present, is a later, unrelated Consolidation Audit remediation — AUD-W2-ITEM-10b, worker_profile_private GRANT — not a Case/Task schema change)', () => {
    const migFiles = readdirSync(join(process.cwd(), 'supabase/migrations'));
    const migration062 = migFiles.find((f) => f.startsWith('062'));
    if (!migration062) return; // still true: no 062 at all
    const src = readFileSync(join(process.cwd(), 'supabase/migrations', migration062), 'utf8');
    expect(src).not.toMatch(/operational_case|advisor_case|gov\.task|CREATE TABLE|ALTER TABLE.*ADD COLUMN/i);
  });

  it('migration 061 is unchanged by this WP (WP-034 reuses it, never modifies it)', () => {
    const migSrc = readFileSync(join(process.cwd(), 'supabase/migrations/061_operational_case_primitive.sql'), 'utf8');
    expect(migSrc).toMatch(/gov\.operational_case_guard_transition/); // the Gate B trigger from WP-007's own pre-push fix, still present, untouched
  });
});
