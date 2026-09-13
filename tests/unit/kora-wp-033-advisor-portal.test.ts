/**
 * KORA-WP-033 — Company Advisor Action-Matrix Surface + Portal Pilot Slice.
 *
 * Behavioral (not string-matching) tests of the REAL functions from
 * lib/advisor-portal/advisor-action-matrix.ts (pure logic, no mocking
 * needed) and lib/advisor-portal/advisor-portal-service.ts, plus the REAL
 * GET/POST route handlers, with only the Supabase I/O boundary, the
 * governance substrate, and @/lib/auth/kora-session mocked at their public
 * boundary. Same technique as this session's kora-wp-018/030/031/032 test
 * files.
 *
 * Real-DB proof of RLS/grant/constraint correctness for migration 058 lives
 * in this WP's own real-DB validation (see report 121).
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  ADVISOR_SUPPORT_ACTIONS,
  CONSTITUTIVE_ACTIONS,
  canAdvisorPerformAction,
} from '@/lib/advisor-portal/advisor-action-matrix';

// ═══════════════════════════════════════════════════════════════════════════
// PART 1 — Action Matrix: pure logic, no mocking
// ═══════════════════════════════════════════════════════════════════════════

describe('KORA-WP-033 — Advisor Action Matrix (doc 73 §6)', () => {
  it('exposes exactly the seven canonical support verbs', () => {
    expect(ADVISOR_SUPPORT_ACTIONS).toEqual([
      'VIEW', 'COMMENT', 'PROPOSE', 'DRAFT', 'EDIT_DRAFT', 'REQUEST_CHANGE', 'SUPPORT_REVIEW',
    ]);
  });

  it('exposes exactly the three constitutive actions named by this WP\'s own Tests field', () => {
    expect(CONSTITUTIVE_ACTIONS).toEqual(['COMMIT', 'APPROVE', 'CONCLUDE']);
  });

  it.each(CONSTITUTIVE_ACTIONS)('structurally denies "%s" even with a valid Advisor session and valid assignment', (action) => {
    const result = canAdvisorPerformAction(action, { isAdvisorSession: true, assignmentValid: true });
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('constitutive_action_denied');
  });

  it.each(ADVISOR_SUPPORT_ACTIONS)('allows "%s" for a valid Advisor session with a valid assignment', (action) => {
    const result = canAdvisorPerformAction(action, { isAdvisorSession: true, assignmentValid: true });
    expect(result.allowed).toBe(true);
  });

  it.each(ADVISOR_SUPPORT_ACTIONS)('denies "%s" when the assignment is not valid', (action) => {
    const result = canAdvisorPerformAction(action, { isAdvisorSession: true, assignmentValid: false });
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('assignment_not_valid');
  });

  it.each(ADVISOR_SUPPORT_ACTIONS)('denies "%s" when the caller is not genuinely an Advisor session', (action) => {
    const result = canAdvisorPerformAction(action, { isAdvisorSession: false, assignmentValid: true });
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('not_advisor_session');
  });

  it('denies an unknown action name', () => {
    // @ts-expect-error — deliberately invalid input for the runtime guard.
    const result = canAdvisorPerformAction('DELETE_EVERYTHING', { isAdvisorSession: true, assignmentValid: true });
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('unknown_action');
  });

  it('constitutive-action check runs before any session/assignment check (unconditional structural denial)', () => {
    // Even the "best possible" context cannot flip a constitutive action.
    const best = { isAdvisorSession: true, assignmentValid: true };
    for (const action of CONSTITUTIVE_ACTIONS) {
      expect(canAdvisorPerformAction(action, best).allowed).toBe(false);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// PART 2 — Portal service: mocked Supabase + governance substrate
// ═══════════════════════════════════════════════════════════════════════════

interface AssignmentRow {
  id: string; advisor_id: string; organisation_type: string; company_id: string; role: string;
  status: string; conflict_flag: boolean; updated_at: string;
}
interface IdentityRow { id: string; auth_user_id: string; full_name: string; status: string; }
interface QualRow { id: string; advisor_id: string; role: string; status: string; }
interface EligibilityRow { id: string; role_qualification_id: string; status: string; expiry_date: string | null; }
interface TenantRow { id: string; company_name: string; }
interface MessageRow { id: string; assignment_id: string; sender_role: string; body: string; created_at: string; }

let assignments: AssignmentRow[] = [];
let identities: IdentityRow[] = [];
let qualifications: QualRow[] = [];
let eligibilities: EligibilityRow[] = [];
let tenants: TenantRow[] = [];
let messages: MessageRow[] = [];
let idCounter = 0;

function makeSelectChain<T extends object>(rows: () => T[], filters: Record<string, unknown> = {}) {
  const matches = () => rows().filter((r) => Object.entries(filters).every(([k, v]) => (r as unknown as Record<string, unknown>)[k] === v));
  return {
    eq(col: string, val: unknown) { return makeSelectChain(rows, { ...filters, [col]: val }); },
    maybeSingle: async () => ({ data: matches()[0] ?? null, error: null }),
    order: async () => ({ data: matches(), error: null }),
  };
}

const recordGovernanceEventMock = vi.fn(async (p: Record<string, unknown>) => ({ id: 'ev-1', ...p, occurredAt: 'now' }));

vi.mock('@/lib/supabase/server', () => ({
  getSupabaseServiceClient: () => ({
    schema: (schemaName: string) => ({
      from: (table: string) => {
        if (schemaName === 'advisor' && table === 'advisor_assignment') return { select: () => makeSelectChain(() => assignments) };
        if (schemaName === 'advisor' && table === 'advisor_identity') return { select: () => makeSelectChain(() => identities) };
        if (schemaName === 'advisor' && table === 'advisor_role_qualification') return { select: () => makeSelectChain(() => qualifications) };
        if (schemaName === 'advisor' && table === 'advisor_prerequisite_eligibility') return { select: () => makeSelectChain(() => eligibilities) };
        if (schemaName === 'analytics' && table === 'tenant') return { select: () => makeSelectChain(() => tenants) };
        if (schemaName === 'advisor' && table === 'advisor_contact_message') {
          return {
            select: () => makeSelectChain(() => messages),
            insert: (payload: Record<string, unknown>) => ({
              select: () => ({
                single: async () => {
                  const row: MessageRow = {
                    id: `msg-${++idCounter}`, assignment_id: payload.assignment_id as string,
                    sender_role: payload.sender_role as string, body: payload.body as string,
                    created_at: '2026-09-13T00:00:00.000Z',
                  };
                  messages.push(row);
                  return { data: row, error: null };
                },
              }),
            }),
          };
        }
        throw new Error(`unexpected query target in test: ${schemaName}.${table}`);
      },
    }),
  }),
}));

vi.mock('@/lib/audit/governance-event', () => ({
  recordGovernanceEvent: (p: Record<string, unknown>) => recordGovernanceEventMock(p),
}));

function seedFullValidScenario() {
  identities.push({ id: 'adv-1', auth_user_id: 'u1', full_name: 'Advisor One', status: 'active' });
  qualifications.push({ id: 'qual-1', advisor_id: 'adv-1', role: 'Company Advisor', status: 'QUALIFIED' });
  eligibilities.push({ id: 'elig-1', role_qualification_id: 'qual-1', status: 'MET', expiry_date: null });
  tenants.push({ id: 'company-1', company_name: 'Company One' });
  assignments.push({
    id: 'assign-1', advisor_id: 'adv-1', organisation_type: 'company', company_id: 'company-1',
    role: 'Company Advisor', status: 'active', conflict_flag: false, updated_at: '2026-09-13T00:00:00.000Z',
  });
}

beforeEach(() => {
  assignments = []; identities = []; qualifications = []; eligibilities = []; tenants = []; messages = [];
  idCounter = 0;
  recordGovernanceEventMock.mockClear();
});

afterEach(() => vi.clearAllMocks());

describe('KORA-WP-033 — getCompanyAssignedAdvisor', () => {
  it('returns the assigned Advisor with validity for a Company with a valid active assignment', async () => {
    seedFullValidScenario();
    const { getCompanyAssignedAdvisor } = await import('@/lib/advisor-portal/advisor-portal-service');
    const result = await getCompanyAssignedAdvisor('company-1');
    expect(result).toEqual({
      assignmentId: 'assign-1', advisorId: 'adv-1', fullName: 'Advisor One',
      role: 'Company Advisor', valid: true, invalidReasons: [],
    });
  });

  it('returns null for a Company with no active assignment', async () => {
    const { getCompanyAssignedAdvisor } = await import('@/lib/advisor-portal/advisor-portal-service');
    expect(await getCompanyAssignedAdvisor('no-such-company')).toBeNull();
  });

  it('never exposes auth_user_id, conflict_flag, or eligibility internals', async () => {
    seedFullValidScenario();
    const { getCompanyAssignedAdvisor } = await import('@/lib/advisor-portal/advisor-portal-service');
    const result = await getCompanyAssignedAdvisor('company-1');
    const keys = Object.keys(result as object);
    expect(keys).not.toContain('authUserId');
    expect(keys).not.toContain('conflictFlag');
    expect(keys).not.toContain('eligibility');
    expect(keys.sort()).toEqual(['advisorId', 'assignmentId', 'fullName', 'invalidReasons', 'role', 'valid'].sort());
  });

  it('reports valid=false with reasons when the assignment exists but is not yet valid', async () => {
    identities.push({ id: 'adv-1', auth_user_id: 'u1', full_name: 'Advisor One', status: 'active' });
    tenants.push({ id: 'company-1', company_name: 'Company One' });
    assignments.push({ id: 'assign-1', advisor_id: 'adv-1', organisation_type: 'company', company_id: 'company-1', role: 'Company Advisor', status: 'active', conflict_flag: false, updated_at: 'x' });
    // No qualification/eligibility seeded — assignment exists, is not valid.
    const { getCompanyAssignedAdvisor } = await import('@/lib/advisor-portal/advisor-portal-service');
    const result = await getCompanyAssignedAdvisor('company-1');
    expect(result?.valid).toBe(false);
    expect(result?.invalidReasons.length).toBeGreaterThan(0);
  });

  it('Company A does not see Company B\'s Advisor (isolation)', async () => {
    seedFullValidScenario();
    identities.push({ id: 'adv-2', auth_user_id: 'u2', full_name: 'Advisor Two', status: 'active' });
    tenants.push({ id: 'company-2', company_name: 'Company Two' });
    assignments.push({ id: 'assign-2', advisor_id: 'adv-2', organisation_type: 'company', company_id: 'company-2', role: 'Company Advisor', status: 'active', conflict_flag: false, updated_at: 'x' });
    const { getCompanyAssignedAdvisor } = await import('@/lib/advisor-portal/advisor-portal-service');
    const resultA = await getCompanyAssignedAdvisor('company-1');
    const resultB = await getCompanyAssignedAdvisor('company-2');
    expect(resultA?.advisorId).toBe('adv-1');
    expect(resultB?.advisorId).toBe('adv-2');
  });
});

describe('KORA-WP-033 — getAdvisorAssignedCompanies', () => {
  it('lists the Advisor\'s own active assignments with company names', async () => {
    seedFullValidScenario();
    const { getAdvisorAssignedCompanies } = await import('@/lib/advisor-portal/advisor-portal-service');
    const result = await getAdvisorAssignedCompanies('adv-1');
    expect(result).toEqual([{ assignmentId: 'assign-1', companyId: 'company-1', companyName: 'Company One', role: 'Company Advisor', valid: true, invalidReasons: [] }]);
  });

  it('returns multi-Company scoping correctly — same Advisor, two Companies', async () => {
    seedFullValidScenario();
    tenants.push({ id: 'company-2', company_name: 'Company Two' });
    assignments.push({ id: 'assign-2', advisor_id: 'adv-1', organisation_type: 'company', company_id: 'company-2', role: 'Company Advisor', status: 'active', conflict_flag: false, updated_at: 'x' });
    const { getAdvisorAssignedCompanies } = await import('@/lib/advisor-portal/advisor-portal-service');
    const result = await getAdvisorAssignedCompanies('adv-1');
    expect(result.map((r) => r.companyId).sort()).toEqual(['company-1', 'company-2']);
  });

  it('Advisor A does not see Advisor B\'s Companies', async () => {
    seedFullValidScenario();
    identities.push({ id: 'adv-2', auth_user_id: 'u2', full_name: 'Advisor Two', status: 'active' });
    tenants.push({ id: 'company-2', company_name: 'Company Two' });
    assignments.push({ id: 'assign-2', advisor_id: 'adv-2', organisation_type: 'company', company_id: 'company-2', role: 'Company Advisor', status: 'active', conflict_flag: false, updated_at: 'x' });
    const { getAdvisorAssignedCompanies } = await import('@/lib/advisor-portal/advisor-portal-service');
    const result = await getAdvisorAssignedCompanies('adv-1');
    expect(result.length).toBe(1);
    expect(result[0].companyId).toBe('company-1');
  });

  it('returns an empty array for an Advisor with no assignments', async () => {
    const { getAdvisorAssignedCompanies } = await import('@/lib/advisor-portal/advisor-portal-service');
    expect(await getAdvisorAssignedCompanies('no-such-advisor')).toEqual([]);
  });
});

describe('KORA-WP-033 — sendContactMessage', () => {
  it('Company sends a message on a valid assignment', async () => {
    seedFullValidScenario();
    const { sendContactMessage } = await import('@/lib/advisor-portal/advisor-portal-service');
    const msg = await sendContactMessage({ assignmentId: 'assign-1', senderRole: 'COMPANY_ADMIN', body: 'Ciao', callerTenantId: 'company-1' });
    expect(msg.body).toBe('Ciao');
    expect(recordGovernanceEventMock).toHaveBeenCalledTimes(1);
  });

  it('Advisor sends a message on a valid assignment', async () => {
    seedFullValidScenario();
    const { sendContactMessage } = await import('@/lib/advisor-portal/advisor-portal-service');
    const msg = await sendContactMessage({ assignmentId: 'assign-1', senderRole: 'ADVISOR', body: 'Certo', callerAdvisorId: 'adv-1' });
    expect(msg.body).toBe('Certo');
  });

  it('rejects an empty message body', async () => {
    seedFullValidScenario();
    const { sendContactMessage } = await import('@/lib/advisor-portal/advisor-portal-service');
    await expect(sendContactMessage({ assignmentId: 'assign-1', senderRole: 'COMPANY_ADMIN', body: '   ', callerTenantId: 'company-1' })).rejects.toThrow(/body is required/);
  });

  it('rejects Company B forging a message on Company A\'s assignment', async () => {
    seedFullValidScenario();
    const { sendContactMessage } = await import('@/lib/advisor-portal/advisor-portal-service');
    await expect(sendContactMessage({ assignmentId: 'assign-1', senderRole: 'COMPANY_ADMIN', body: 'x', callerTenantId: 'company-2' }))
      .rejects.toThrow(/not the Company party/);
  });

  it('rejects Advisor B forging a message on Advisor A\'s assignment', async () => {
    seedFullValidScenario();
    const { sendContactMessage } = await import('@/lib/advisor-portal/advisor-portal-service');
    await expect(sendContactMessage({ assignmentId: 'assign-1', senderRole: 'ADVISOR', body: 'x', callerAdvisorId: 'adv-2' }))
      .rejects.toThrow(/not the Advisor party/);
  });

  it('rejects sending on an assignment that is not yet valid', async () => {
    identities.push({ id: 'adv-1', auth_user_id: 'u1', full_name: 'Advisor One', status: 'active' });
    tenants.push({ id: 'company-1', company_name: 'Company One' });
    assignments.push({ id: 'assign-1', advisor_id: 'adv-1', organisation_type: 'company', company_id: 'company-1', role: 'Company Advisor', status: 'active', conflict_flag: false, updated_at: 'x' });
    const { sendContactMessage } = await import('@/lib/advisor-portal/advisor-portal-service');
    await expect(sendContactMessage({ assignmentId: 'assign-1', senderRole: 'COMPANY_ADMIN', body: 'x', callerTenantId: 'company-1' }))
      .rejects.toThrow(/not currently valid/);
    expect(messages.length).toBe(0);
  });

  it('rejects a nonexistent assignment id', async () => {
    const { sendContactMessage } = await import('@/lib/advisor-portal/advisor-portal-service');
    await expect(sendContactMessage({ assignmentId: 'no-such', senderRole: 'COMPANY_ADMIN', body: 'x', callerTenantId: 'company-1' }))
      .rejects.toThrow(/no such Assignment/);
  });
});

describe('KORA-WP-033 — listContactMessages', () => {
  it('Company party can read the thread', async () => {
    seedFullValidScenario();
    messages.push({ id: 'msg-1', assignment_id: 'assign-1', sender_role: 'COMPANY_ADMIN', body: 'hi', created_at: 'x' });
    const { listContactMessages } = await import('@/lib/advisor-portal/advisor-portal-service');
    const result = await listContactMessages({ assignmentId: 'assign-1', callerTenantId: 'company-1' });
    expect(result.length).toBe(1);
  });

  it('Advisor party can read the thread', async () => {
    seedFullValidScenario();
    messages.push({ id: 'msg-1', assignment_id: 'assign-1', sender_role: 'COMPANY_ADMIN', body: 'hi', created_at: 'x' });
    const { listContactMessages } = await import('@/lib/advisor-portal/advisor-portal-service');
    const result = await listContactMessages({ assignmentId: 'assign-1', callerAdvisorId: 'adv-1' });
    expect(result.length).toBe(1);
  });

  it('rejects a caller who is neither party to the assignment', async () => {
    seedFullValidScenario();
    const { listContactMessages } = await import('@/lib/advisor-portal/advisor-portal-service');
    await expect(listContactMessages({ assignmentId: 'assign-1', callerTenantId: 'company-2' })).rejects.toThrow(/not a party/);
    await expect(listContactMessages({ assignmentId: 'assign-1', callerAdvisorId: 'adv-2' })).rejects.toThrow(/not a party/);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// PART 3 — Route boundary: mocked auth + service
// ═══════════════════════════════════════════════════════════════════════════

const mockRequireCompanyUser = vi.fn();
const mockRequireAdvisorUser = vi.fn();
vi.mock('@/lib/auth/kora-session', () => ({
  requireCompanyUser: (...args: unknown[]) => mockRequireCompanyUser(...args),
  requireAdvisorUser: (...args: unknown[]) => mockRequireAdvisorUser(...args),
  isKoraAuthError: (v: unknown) => v instanceof NextResponse,
}));

describe('KORA-WP-033 — GET /api/company/advisor — auth boundary', () => {
  beforeEach(() => { mockRequireCompanyUser.mockReset(); });

  it('returns the auth error unchanged when not COMPANY_ADMIN', async () => {
    mockRequireCompanyUser.mockResolvedValue(NextResponse.json({ error: 'Forbidden' }, { status: 403 }));
    const { GET } = await import('@/app/api/company/advisor/route');
    const res = await GET(new NextRequest('http://localhost/api/company/advisor'));
    expect(res.status).toBe(403);
  });

  it('returns advisor:null, messages:[] when no assignment exists', async () => {
    mockRequireCompanyUser.mockResolvedValue({ id: 'u1', email: 'a@x.test', tenantId: 'company-none', koraRole: 'COMPANY_ADMIN', userStatus: 'active' });
    const { GET } = await import('@/app/api/company/advisor/route');
    const res = await GET(new NextRequest('http://localhost/api/company/advisor'));
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.advisor).toBeNull();
    expect(body.messages).toEqual([]);
  });

  it('uses the trusted session tenantId, never a client-supplied one', async () => {
    seedFullValidScenario();
    mockRequireCompanyUser.mockResolvedValue({ id: 'u1', email: 'a@x.test', tenantId: 'company-1', koraRole: 'COMPANY_ADMIN', userStatus: 'active' });
    const { GET } = await import('@/app/api/company/advisor/route');
    const res = await GET(new NextRequest('http://localhost/api/company/advisor?tenantId=forged-company'));
    const body = await res.json();
    expect(body.advisor?.advisorId).toBe('adv-1');
  });
});

describe('KORA-WP-033 — POST /api/company/advisor — send boundary', () => {
  beforeEach(() => { mockRequireCompanyUser.mockReset(); });

  it('returns the auth error unchanged when not COMPANY_ADMIN', async () => {
    mockRequireCompanyUser.mockResolvedValue(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }));
    const { POST } = await import('@/app/api/company/advisor/route');
    const req = new NextRequest('http://localhost/api/company/advisor', { method: 'POST', body: JSON.stringify({ body: 'hi' }) });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('rejects an empty body with 400', async () => {
    mockRequireCompanyUser.mockResolvedValue({ id: 'u1', email: 'a@x.test', tenantId: 'company-1', koraRole: 'COMPANY_ADMIN', userStatus: 'active' });
    const { POST } = await import('@/app/api/company/advisor/route');
    const req = new NextRequest('http://localhost/api/company/advisor', { method: 'POST', body: JSON.stringify({ body: '  ' }) });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('rejects with 422 when no Advisor is assigned', async () => {
    mockRequireCompanyUser.mockResolvedValue({ id: 'u1', email: 'a@x.test', tenantId: 'company-none', koraRole: 'COMPANY_ADMIN', userStatus: 'active' });
    const { POST } = await import('@/app/api/company/advisor/route');
    const req = new NextRequest('http://localhost/api/company/advisor', { method: 'POST', body: JSON.stringify({ body: 'hi' }) });
    const res = await POST(req);
    expect(res.status).toBe(422);
  });

  it('sends successfully for a valid assignment, using the trusted tenantId', async () => {
    seedFullValidScenario();
    mockRequireCompanyUser.mockResolvedValue({ id: 'u1', email: 'a@x.test', tenantId: 'company-1', koraRole: 'COMPANY_ADMIN', userStatus: 'active' });
    const { POST } = await import('@/app/api/company/advisor/route');
    const req = new NextRequest('http://localhost/api/company/advisor', { method: 'POST', body: JSON.stringify({ body: 'Ciao' }) });
    const res = await POST(req);
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
  });
});

describe('KORA-WP-033 — GET /api/advisor/companies — auth boundary + self-resolution', () => {
  beforeEach(() => { mockRequireAdvisorUser.mockReset(); });

  it('returns the auth error unchanged when not ADVISOR', async () => {
    mockRequireAdvisorUser.mockResolvedValue(NextResponse.json({ error: 'Forbidden' }, { status: 403 }));
    const { GET } = await import('@/app/api/advisor/companies/route');
    const res = await GET(new NextRequest('http://localhost/api/advisor/companies'));
    expect(res.status).toBe(403);
  });

  it('resolves the Advisor identity from the trusted session id, ignoring any client-supplied advisorId', async () => {
    seedFullValidScenario();
    mockRequireAdvisorUser.mockResolvedValue({ id: 'u1', email: 'a@x.test', koraRole: 'ADVISOR' });
    const { GET } = await import('@/app/api/advisor/companies/route');
    const res = await GET(new NextRequest('http://localhost/api/advisor/companies?advisorId=forged-advisor'));
    const body = await res.json();
    expect(body.companies.length).toBe(1);
    expect(body.companies[0].companyId).toBe('company-1');
  });
});

describe('KORA-WP-033 — GET/POST /api/advisor/companies/[assignmentId]/messages', () => {
  beforeEach(() => { mockRequireAdvisorUser.mockReset(); });

  it('GET rejects when the assignment does not belong to this Advisor', async () => {
    seedFullValidScenario();
    identities.push({ id: 'adv-2', auth_user_id: 'u2', full_name: 'Advisor Two', status: 'active' });
    mockRequireAdvisorUser.mockResolvedValue({ id: 'u2', email: 'b@x.test', koraRole: 'ADVISOR' });
    const { GET } = await import('@/app/api/advisor/companies/[assignmentId]/messages/route');
    const res = await GET(new NextRequest('http://localhost/api/advisor/companies/assign-1/messages'), { params: Promise.resolve({ assignmentId: 'assign-1' }) });
    expect(res.status).toBe(403);
  });

  it('POST sends a message when the assignment does belong to this Advisor', async () => {
    seedFullValidScenario();
    mockRequireAdvisorUser.mockResolvedValue({ id: 'u1', email: 'a@x.test', koraRole: 'ADVISOR' });
    const { POST } = await import('@/app/api/advisor/companies/[assignmentId]/messages/route');
    const req = new NextRequest('http://localhost/api/advisor/companies/assign-1/messages', { method: 'POST', body: JSON.stringify({ body: 'Certo' }) });
    const res = await POST(req, { params: Promise.resolve({ assignmentId: 'assign-1' }) });
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// PART 4 — Scope integrity: no future-WP anticipation
// ═══════════════════════════════════════════════════════════════════════════

describe('KORA-WP-033 — scope integrity: no calendar/booking, no Case, no document taxonomy, no Commitment/Evidence/Review objects', () => {
  const files = [
    'lib/advisor-portal/advisor-action-matrix.ts',
    'lib/advisor-portal/advisor-portal-service.ts',
    'app/api/company/advisor/route.ts',
    'app/api/advisor/companies/route.ts',
    'app/api/advisor/companies/[assignmentId]/messages/route.ts',
    'app/company/advisor/page.tsx',
    'app/advisor/companies/page.tsx',
  ].map((p) => readFileSync(join(process.cwd(), p), 'utf8'));
  const allSrc = files.join('\n');
  const code = allSrc.split('\n').filter((l) => !l.trim().startsWith('//') && !l.trim().startsWith('*')).join('\n');

  // WP-033-exclusive files only (the two page.tsx files are now legitimately
  // shared with KORA-WP-035, which extends them with its own appointment
  // section — see kora-wp-035-advisor-appointment.test.ts for that WP's own
  // scope-integrity checks). This narrower scan preserves the original
  // "WP-033 itself never implements WP-035 prematurely" guard without
  // false-failing on WP-035's later, authorized, shared-file addition —
  // same technique as this session's kora-wp-030 test narrowing.
  const wp033ExclusiveSrc = [
    'lib/advisor-portal/advisor-action-matrix.ts',
    'lib/advisor-portal/advisor-portal-service.ts',
    'app/api/company/advisor/route.ts',
    'app/api/advisor/companies/route.ts',
    'app/api/advisor/companies/[assignmentId]/messages/route.ts',
  ].map((p) => readFileSync(join(process.cwd(), p), 'utf8')).join('\n');
  const codeExclusive = wp033ExclusiveSrc.split('\n').filter((l) => !l.trim().startsWith('//') && !l.trim().startsWith('*')).join('\n');

  it('no calendar/booking concept anywhere in WP-033-exclusive files (KORA-WP-035 scope)', () => {
    expect(codeExclusive).not.toMatch(/calendar|booking|appointment|reschedule|availability_slot|videocall|video_call/i);
  });

  it('no Task/Case concept anywhere (KORA-WP-034 scope)', () => {
    expect(code).not.toMatch(/operational_case|advisorTask|caseStatus|escalat/i);
  });

  it('no five-class document taxonomy anywhere (KORA-WP-036 scope)', () => {
    expect(code).not.toMatch(/documentClass|noteClass|class1|class2|class3|class4|class5/i);
  });

  it('no Commitment/Evidence Plan Lineage/Review table or endpoint fabricated (KORA-WP-020/021/024 not yet built)', () => {
    expect(code).not.toMatch(/CREATE TABLE|from\(['"`]commitment|from\(['"`]evidence_plan|from\(['"`]review\b/i);
  });

  it('no prep-support/effort-synthesis concept (KORA-WP-038 scope)', () => {
    expect(code).not.toMatch(/prepSupport|effortSynthesis|meetingPrep/i);
  });

  it('no matching/recommendation engine', () => {
    expect(code).not.toMatch(/matchScore|recommend|ranking|bestAdvisor|autoAssign/i);
  });

  it('no worker-level data path (individual identity, personal Need, employee name)', () => {
    expect(code).not.toMatch(/worker_identity|personal\.worker|employeeName|individualNeed/i);
  });

  it('no internal eligibility/governance-metadata field ever serialized to a client response', () => {
    expect(code).not.toMatch(/authUserId|auth_user_id|conflictFlag|conflict_flag|prerequisiteEligibility/);
  });

  it('no reference to the removed COMPANY_VIEWER role', () => {
    expect(code).not.toMatch(/COMPANY_VIEWER/);
  });

  it('does not invent a 15th governed-action category for contact messages', () => {
    const catalogSrc = readFileSync(join(process.cwd(), 'lib/audit/governed-action-catalog.ts'), 'utf8');
    const categoryLines = catalogSrc.match(/^\s*'[A-Z_]+',/gm) ?? [];
    expect(categoryLines.length).toBe(14);
    expect(code).not.toMatch(/GOVERNED_ACTION_CATEGORIES\.push/);
  });

  it('migration 058 does not modify migrations 001–057', () => {
    const migSrc = readFileSync(join(process.cwd(), 'supabase/migrations/058_advisor_company_surface.sql'), 'utf8');
    const migSql = migSrc.split('\n').filter((l) => !l.trim().startsWith('--')).join('\n');
    expect(migSql).not.toMatch(/ALTER TABLE advisor\.advisor_identity|ALTER TABLE advisor\.advisor_role_qualification|ALTER TABLE advisor\.advisor_assignment|ALTER TABLE advisor\.advisor_prerequisite_eligibility/);
  });

  it('migration 058 grants no DELETE/UPDATE on advisor_contact_message (append-only)', () => {
    const migSrc = readFileSync(join(process.cwd(), 'supabase/migrations/058_advisor_company_surface.sql'), 'utf8');
    const migSql = migSrc.split('\n').filter((l) => !l.trim().startsWith('--')).join('\n');
    const grantLines = migSql.split('\n').filter((l) => /^\s*GRANT\b.*advisor_contact_message/i.test(l));
    expect(grantLines.length).toBeGreaterThan(0);
    for (const line of grantLines) {
      expect(line).not.toMatch(/DELETE|UPDATE/i);
    }
  });
});
