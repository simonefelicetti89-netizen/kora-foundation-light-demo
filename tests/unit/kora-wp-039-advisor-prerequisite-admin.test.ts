/**
 * KORA-WP-039 — Advisor Academy Interface: Admin prerequisite-eligibility
 * surface.
 *
 * Focused tests only, covering exactly the nine acceptance proofs required
 * for this WP. Behavioral wherever a behavior exists: the REAL route
 * handlers from app/api/admin/advisor-prerequisites/route.ts run against the
 * REAL service functions from lib/advisor-assignment/advisor-assignment-service.ts,
 * with only the Supabase I/O boundary, the governance-event substrate, the
 * session guard and the rate limiter mocked at their public boundary — the
 * same technique as kora-wp-031 (service) and kora-wp-037-…-route (route).
 *
 * The in-memory Supabase harness below is modelled on the one in
 * kora-wp-031-advisor-assignment.test.ts so that the validity rule under
 * test here is exercised by the same shapes that proved it there.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..', '..');

// UUIDs: the route validates id shape, so the fixtures must be real UUIDs.
const QUAL_A = '11111111-1111-4111-8111-111111111111';
const QUAL_B = '22222222-2222-4222-8222-222222222222';
const ADMIN_ID = '99999999-9999-4999-8999-999999999999';

interface IdentityRow { id: string; auth_user_id: string; full_name: string; status: string }
interface QualRow { id: string; advisor_id: string; role: string; status: string }
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

function makeSelectChain<T extends object>(rows: () => T[], filters: Record<string, unknown> = {}) {
  const matches = () => rows().filter((r) =>
    Object.entries(filters).every(([k, v]) => (r as unknown as Record<string, unknown>)[k] === v));
  return {
    eq(col: string, val: unknown) { return makeSelectChain(rows, { ...filters, [col]: val }); },
    maybeSingle: async () => ({ data: matches()[0] ?? null, error: null }),
    order: async () => ({ data: matches(), error: null }),
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
            row = { id: `elig-${++idCounter}`, created_at: '2026-09-20T00:00:00.000Z', ...payload } as EligibilityRow;
            eligibilities.push(row);
          }
          row.updated_at = '2026-09-20T00:00:00.000Z';
          return { data: row, error: null };
        },
      }),
    }),
  };
}

const recordGovernanceEventMock = vi.fn(async (p: Record<string, unknown>) => ({ id: 'ev-1', ...p, occurredAt: 'now' }));
const recordGovernedActionMock = vi.fn(async (p: Record<string, unknown>) => ({ id: 'ev-2', ...p, occurredAt: 'now' }));
const requireKoraAdminMock = vi.fn();
const assertRateLimitMock = vi.fn<() => Promise<NextResponse | null>>(async () => null);

vi.mock('@/lib/supabase/server', () => ({
  getSupabaseServiceClient: () => ({
    schema: (schemaName: string) => ({
      from: (table: string) => {
        if (schemaName !== 'advisor') throw new Error(`unexpected schema in test: ${schemaName}`);
        if (table === 'advisor_identity') return { select: () => makeSelectChain(() => identities) };
        if (table === 'advisor_role_qualification') return { select: () => makeSelectChain(() => qualifications) };
        if (table === 'advisor_assignment') return { select: () => makeSelectChain(() => assignments) };
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
vi.mock('@/lib/auth/kora-session', () => ({
  requireKoraAdmin: (...args: unknown[]) => requireKoraAdminMock(...args),
  isKoraAuthError: (v: unknown) => v instanceof NextResponse,
}));
vi.mock('@/lib/security/rate-limit', () => ({
  assertRateLimit: (...args: unknown[]) => assertRateLimitMock(...(args as [])),
}));

const ROUTE = '@/app/api/admin/advisor-prerequisites/route';
const SERVICE = '@/lib/advisor-assignment/advisor-assignment-service';

function seedIdentity(o: Partial<IdentityRow> = {}): IdentityRow {
  const row: IdentityRow = { id: o.id ?? 'adv-1', auth_user_id: o.auth_user_id ?? 'u1', full_name: o.full_name ?? 'Advisor Uno', status: o.status ?? 'active' };
  identities.push(row);
  return row;
}
function seedQualification(o: Partial<QualRow> = {}): QualRow {
  const row: QualRow = { id: o.id ?? QUAL_A, advisor_id: o.advisor_id ?? 'adv-1', role: o.role ?? 'Company Advisor', status: o.status ?? 'QUALIFIED' };
  qualifications.push(row);
  return row;
}
function seedAssignment(o: Partial<AssignmentRow> = {}): AssignmentRow {
  const row: AssignmentRow = {
    id: o.id ?? 'assign-1', advisor_id: o.advisor_id ?? 'adv-1', organisation_type: 'company',
    company_id: 'company-1', role: o.role ?? 'Company Advisor', status: o.status ?? 'active',
    effective_from: '2026-01-01T00:00:00.000Z', effective_to: null, reason: null,
    conflict_flag: o.conflict_flag ?? false,
    created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z',
  };
  assignments.push(row);
  return row;
}
function seedEligibility(o: Partial<EligibilityRow> = {}): EligibilityRow {
  const row: EligibilityRow = {
    id: o.id ?? `elig-${++idCounter}`, role_qualification_id: o.role_qualification_id ?? QUAL_A,
    status: o.status ?? 'MET', source_reference: o.source_reference ?? 'Albo 2026/114',
    effective_date: o.effective_date ?? '2026-01-01T00:00:00.000Z',
    expiry_date: o.expiry_date ?? null,
    last_verified_at: o.last_verified_at ?? '2026-02-01T09:30:00.000Z',
    verified_by: o.verified_by ?? ADMIN_ID,
    created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-02-01T09:30:00.000Z',
  };
  eligibilities.push(row);
  return row;
}

const PAST = '2020-06-01T00:00:00.000Z';
const FUTURE = '2099-06-01T00:00:00.000Z';

beforeEach(() => {
  identities = []; qualifications = []; assignments = []; eligibilities = []; idCounter = 0;
  recordGovernanceEventMock.mockClear();
  recordGovernedActionMock.mockClear();
  assertRateLimitMock.mockClear();
  assertRateLimitMock.mockResolvedValue(null);
  requireKoraAdminMock.mockReset();
  requireKoraAdminMock.mockResolvedValue({ id: ADMIN_ID, email: 'admin@kora.test', koraRole: 'KORA_ADMIN' });
});
afterEach(() => vi.clearAllMocks());

/** Executable code only: header/inline comments are documentation, and this
 *  file's WP-032 assertions are about behaviour, not prose. */
function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

function getReq(ids: string[]) {
  return new NextRequest(`http://localhost/api/admin/advisor-prerequisites?qualificationIds=${ids.join(',')}`);
}
function postReq(body: unknown) {
  return new NextRequest('http://localhost/api/admin/advisor-prerequisites', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
}

// ── 1 — KORA_ADMIN can view and update prerequisite eligibility ───────────

describe('KORA-WP-039 (1) — KORA_ADMIN can view and update prerequisite eligibility', () => {
  it('GET returns the recorded eligibility for each requested qualification', async () => {
    seedIdentity(); seedQualification(); seedQualification({ id: QUAL_B, role: 'Partner Advisor' });
    seedEligibility({ role_qualification_id: QUAL_A, status: 'MET', expiry_date: FUTURE });

    const { GET } = await import(ROUTE);
    const res = await GET(getReq([QUAL_A, QUAL_B]));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.eligibility[QUAL_A]).toMatchObject({
      roleQualificationId: QUAL_A,
      status: 'MET',
      sourceReference: 'Albo 2026/114',
      effectiveDate: '2026-01-01T00:00:00.000Z',
      expiryDate: FUTURE,
      lastVerifiedAt: '2026-02-01T09:30:00.000Z',
      verifiedBy: ADMIN_ID,
    });
    // A qualification with no record yet is reported as null, not omitted.
    expect(body.eligibility[QUAL_B]).toBeNull();
  });

  it('POST creates the record, then updates it in place on a second decision', async () => {
    seedIdentity(); seedQualification();
    const { POST } = await import(ROUTE);

    const created = await (await POST(postReq({
      roleQualificationId: QUAL_A, status: 'MET',
      sourceReference: 'Attestato 12/A', effectiveDate: '2026-03-01', expiryDate: '2027-03-01',
    }))).json();
    expect(created.ok).toBe(true);
    expect(created.eligibility.status).toBe('MET');
    expect(created.eligibility.sourceReference).toBe('Attestato 12/A');
    expect(eligibilities).toHaveLength(1);

    const updated = await (await POST(postReq({ roleQualificationId: QUAL_A, status: 'NOT_MET' }))).json();
    expect(updated.ok).toBe(true);
    expect(updated.eligibility.status).toBe('NOT_MET');
    // Upsert on the unique role_qualification_id — one record per qualification.
    expect(eligibilities).toHaveLength(1);
  });

  it('rejects a non-canonical status and an impossible date range before touching the service', async () => {
    seedIdentity(); seedQualification();
    const { POST } = await import(ROUTE);

    expect((await POST(postReq({ roleQualificationId: QUAL_A, status: 'PENDING' }))).status).toBe(400);
    expect((await POST(postReq({ roleQualificationId: QUAL_A, status: 'MET', effectiveDate: '2027-01-01', expiryDate: '2026-01-01' }))).status).toBe(422);
    expect(eligibilities).toHaveLength(0);
    expect(recordGovernanceEventMock).not.toHaveBeenCalled();
  });
});

// ── 2 — Non-admin cannot mutate it ────────────────────────────────────────

describe('KORA-WP-039 (2) — non-admin cannot mutate prerequisite eligibility', () => {
  it('POST returns the session guard error unchanged and writes nothing', async () => {
    seedIdentity(); seedQualification();
    requireKoraAdminMock.mockResolvedValue(NextResponse.json({ error: 'Forbidden' }, { status: 403 }));

    const { POST } = await import(ROUTE);
    const res = await POST(postReq({ roleQualificationId: QUAL_A, status: 'MET' }));

    expect(res.status).toBe(403);
    expect(eligibilities).toHaveLength(0);
    expect(recordGovernanceEventMock).not.toHaveBeenCalled();
  });

  it('GET is equally guarded', async () => {
    requireKoraAdminMock.mockResolvedValue(NextResponse.json({ error: 'Forbidden' }, { status: 403 }));
    const { GET } = await import(ROUTE);
    expect((await GET(getReq([QUAL_A]))).status).toBe(403);
  });

  it('a client-supplied actorRole cannot be used to forge the actor', async () => {
    seedIdentity(); seedQualification();
    const { POST } = await import(ROUTE);

    const res = await POST(postReq({
      roleQualificationId: QUAL_A, status: 'MET',
      actorRole: 'ADVISOR', actorId: 'attacker-1',
    }));

    expect(res.status).toBe(200);
    expect(recordGovernanceEventMock).toHaveBeenCalledWith(
      expect.objectContaining({ actorRole: 'KORA_ADMIN', actorId: ADMIN_ID }),
    );
    expect(eligibilities[0].verified_by).toBe(ADMIN_ID);
  });

  it('the service itself refuses a non-KORA_ADMIN actor (defense in depth)', async () => {
    seedIdentity(); seedQualification();
    const { setAdvisorPrerequisiteEligibility } = await import(SERVICE);
    await expect(setAdvisorPrerequisiteEligibility({
      roleQualificationId: QUAL_A, status: 'MET', actorRole: 'ADVISOR', actorId: 'adv-1',
    })).rejects.toThrow(/only KORA_ADMIN/);
    expect(eligibilities).toHaveLength(0);
  });

  it('the rate limiter guards the write path', async () => {
    seedIdentity(); seedQualification();
    assertRateLimitMock.mockResolvedValue(NextResponse.json({ error: 'Too many requests' }, { status: 429 }));
    const { POST } = await import(ROUTE);
    const res = await POST(postReq({ roleQualificationId: QUAL_A, status: 'MET' }));
    expect(res.status).toBe(429);
    expect(eligibilities).toHaveLength(0);
  });
});

// ── 3 — Existing WP-031 validity logic still functions unchanged ──────────

describe('KORA-WP-039 (3) — WP-031 validity logic unchanged', () => {
  it('a fully satisfied assignment is valid', async () => {
    seedIdentity(); seedQualification(); seedAssignment();
    seedEligibility({ status: 'MET', expiry_date: FUTURE });
    const { evaluateAdvisorAssignmentValidity } = await import(SERVICE);
    expect(await evaluateAdvisorAssignmentValidity('assign-1')).toEqual({ valid: true, reasons: [] });
  });

  it('each canonical reason still fires independently', async () => {
    seedIdentity({ status: 'suspended' });
    seedQualification({ status: 'CANDIDATE' });
    seedAssignment({ status: 'ended', conflict_flag: true });
    const { evaluateAdvisorAssignmentValidity } = await import(SERVICE);
    const result = await evaluateAdvisorAssignmentValidity('assign-1');
    expect(result.valid).toBe(false);
    expect(result.reasons).toEqual(expect.arrayContaining([
      'assignment_not_active', 'conflict_flag_set', 'advisor_identity_not_active',
      'role_qualification_not_active', 'prerequisite_eligibility_not_present',
    ]));
  });

  it('a NOT_MET prerequisite fails the gate', async () => {
    seedIdentity(); seedQualification(); seedAssignment();
    seedEligibility({ status: 'NOT_MET' });
    const { evaluateAdvisorAssignmentValidity } = await import(SERVICE);
    const result = await evaluateAdvisorAssignmentValidity('assign-1');
    expect(result.valid).toBe(false);
    expect(result.reasons).toContain('prerequisite_eligibility_not_present');
  });
});

// ── 4 — An expired prerequisite blocks the forward gated action ───────────

describe('KORA-WP-039 (4) — expired prerequisite blocks the forward gate', () => {
  it('MET with a past expiry_date is not valid', async () => {
    seedIdentity(); seedQualification(); seedAssignment();
    seedEligibility({ status: 'MET', expiry_date: PAST });
    const { evaluateAdvisorAssignmentValidity } = await import(SERVICE);
    const result = await evaluateAdvisorAssignmentValidity('assign-1');
    expect(result.valid).toBe(false);
    expect(result.reasons).toEqual(['prerequisite_eligibility_not_present']);
  });

  it('the same record with a future expiry_date is valid — expiry is the only difference', async () => {
    seedIdentity(); seedQualification(); seedAssignment();
    seedEligibility({ status: 'MET', expiry_date: FUTURE });
    const { evaluateAdvisorAssignmentValidity } = await import(SERVICE);
    expect((await evaluateAdvisorAssignmentValidity('assign-1')).valid).toBe(true);
  });

  it('the Admin surface derives the same verdict as the canonical gate', async () => {
    const { prerequisitePassesForwardGate } = await import('@/app/admin/advisor-governance/prerequisite-state');
    const base = { id: 'e1', roleQualificationId: QUAL_A, sourceReference: null, effectiveDate: null, lastVerifiedAt: null, verifiedBy: null };
    expect(prerequisitePassesForwardGate({ ...base, status: 'MET', expiryDate: PAST })).toBe(false);
    expect(prerequisitePassesForwardGate({ ...base, status: 'MET', expiryDate: FUTURE })).toBe(true);
    expect(prerequisitePassesForwardGate({ ...base, status: 'MET', expiryDate: null })).toBe(true);
    expect(prerequisitePassesForwardGate({ ...base, status: 'NOT_MET', expiryDate: FUTURE })).toBe(false);
    expect(prerequisitePassesForwardGate(null)).toBe(false);
  });
});

// ── 5 — Expiry erases neither identity nor history ────────────────────────

describe('KORA-WP-039 (5) — expiry erases no identity, qualification or evidence', () => {
  it('after expiry the advisor, the qualification and the evidence all remain readable', async () => {
    seedIdentity(); seedQualification(); seedAssignment();
    seedEligibility({ status: 'MET', expiry_date: PAST, source_reference: 'Albo 2019/7', last_verified_at: '2019-06-01T08:00:00.000Z' });

    const { evaluateAdvisorAssignmentValidity, getPrerequisiteEligibilityForQualification } = await import(SERVICE);
    const result = await evaluateAdvisorAssignmentValidity('assign-1');

    // Only the prerequisite clause fails: identity and qualification hold.
    expect(result.reasons).toEqual(['prerequisite_eligibility_not_present']);
    expect(result.reasons).not.toContain('advisor_identity_not_active');
    expect(result.reasons).not.toContain('role_qualification_not_active');

    // Nothing was deleted or blanked by the expiry.
    expect(identities.find((i) => i.id === 'adv-1')).toMatchObject({ full_name: 'Advisor Uno', status: 'active' });
    expect(qualifications.find((q) => q.id === QUAL_A)).toMatchObject({ status: 'QUALIFIED' });

    const stored = await getPrerequisiteEligibilityForQualification(QUAL_A);
    expect(stored).toMatchObject({
      status: 'MET', sourceReference: 'Albo 2019/7',
      lastVerifiedAt: '2019-06-01T08:00:00.000Z', expiryDate: PAST,
    });
  });

  it('the Admin surface still renders the expired record rather than emptying it', async () => {
    seedIdentity(); seedQualification();
    seedEligibility({ status: 'MET', expiry_date: PAST, source_reference: 'Albo 2019/7' });
    const { GET } = await import(ROUTE);
    const body = await (await GET(getReq([QUAL_A]))).json();
    expect(body.eligibility[QUAL_A]).toMatchObject({ status: 'MET', sourceReference: 'Albo 2019/7', expiryDate: PAST });
  });
});

// ── 6 — MET / NOT_MET and expiry states render correctly ──────────────────

describe('KORA-WP-039 (6) — display states', () => {
  const NOW = new Date('2026-09-20T12:00:00.000Z');
  const base = { id: 'e1', roleQualificationId: QUAL_A, sourceReference: null, effectiveDate: null, lastVerifiedAt: null, verifiedBy: null };

  it('derives MET, EXPIRED, NOT_MET and ABSENT from status and expiry', async () => {
    const { derivePrerequisiteDisplayState } = await import('@/app/admin/advisor-governance/prerequisite-state');
    expect(derivePrerequisiteDisplayState({ ...base, status: 'MET', expiryDate: null }, NOW)).toBe('MET');
    expect(derivePrerequisiteDisplayState({ ...base, status: 'MET', expiryDate: '2099-01-01T00:00:00.000Z' }, NOW)).toBe('MET');
    expect(derivePrerequisiteDisplayState({ ...base, status: 'MET', expiryDate: '2026-09-19T00:00:00.000Z' }, NOW)).toBe('EXPIRED');
    expect(derivePrerequisiteDisplayState({ ...base, status: 'NOT_MET', expiryDate: null }, NOW)).toBe('NOT_MET');
    // A NOT_MET record does not become "expired": it was never met.
    expect(derivePrerequisiteDisplayState({ ...base, status: 'NOT_MET', expiryDate: '2026-09-19T00:00:00.000Z' }, NOW)).toBe('NOT_MET');
    expect(derivePrerequisiteDisplayState(null, NOW)).toBe('ABSENT');
  });

  it('every state carries a word and a non-colour tone — colour is never the only signal', async () => {
    const m = await import('@/app/admin/advisor-governance/prerequisite-state');
    for (const state of ['MET', 'EXPIRED', 'NOT_MET', 'ABSENT'] as const) {
      expect(m.PREREQUISITE_STATE_LABEL[state]).toBeTruthy();
      expect(m.PREREQUISITE_STATE_TONE[state]).toBeTruthy();
    }
    expect(m.PREREQUISITE_STATE_TONE.EXPIRED).toBe('risk');
    expect(m.PREREQUISITE_STATE_TONE.MET).toBe('ok');
  });

  it('counts the days to expiry with the correct sign, and formats absent dates as an em dash', async () => {
    const m = await import('@/app/admin/advisor-governance/prerequisite-state');
    expect(m.daysUntilExpiry({ ...base, status: 'MET', expiryDate: '2026-09-30T12:00:00.000Z' }, NOW)).toBe(10);
    expect(m.daysUntilExpiry({ ...base, status: 'MET', expiryDate: '2026-09-10T12:00:00.000Z' }, NOW)).toBe(-10);
    expect(m.daysUntilExpiry({ ...base, status: 'MET', expiryDate: null }, NOW)).toBeNull();
    expect(m.formatDate(null)).toBe('—');
    expect(m.formatDateTime(undefined)).toBe('—');
    expect(m.formatDate('2026-09-30T12:00:00.000Z')).toMatch(/2026/);
  });

  it('the surface renders the state as a dot plus the word, and shows expiry explicitly', () => {
    const page = readFileSync(join(ROOT, 'app/admin/advisor-governance/page.tsx'), 'utf8');
    expect(page).toContain('PREREQUISITE_STATE_LABEL[display]');
    expect(page).toContain('Scadenza');
    expect(page).toContain("formatDate(el?.expiryDate)");

    // MECHANISM SUPERSEDED, INVARIANT STRENGTHENED — KORA-WP-125, 2026-09-21.
    // This used to assert a page-local `<i aria-hidden="true" />` because the
    // dot came from WP-039's own route-local stylesheet, which existed only
    // while PX-B did not. That stylesheet is deleted and the state now renders
    // through the shared, Founder-accepted Status primitive. The guarantee
    // being protected is unchanged — "a dot plus the word, colour is never the
    // only signal" — but it is now proved where it actually lives: the page is
    // required to route the state through Status, and Status is required to
    // emit the non-colour dot alongside the word for every tone. That is a
    // stronger assertion than the string it replaces, because it is checked
    // for every consumer of the primitive rather than for this one file.
    expect(page).toMatch(/<Status tone=\{PREREQUISITE_STATE_TONE\[display\]\}>/);
    const status = readFileSync(join(ROOT, 'components/ui/px/Status.tsx'), 'utf8');
    expect(status).toMatch(/<i aria-hidden="true"/);
    expect(status).toContain('{children}');
    expect(status).toContain('data-px-status={tone}');
  });
});

// ── 7 — The required audit event is recorded ──────────────────────────────

describe('KORA-WP-039 (7) — status changes are audited', () => {
  it('a recorded decision emits a governance event with actor, target and resulting status', async () => {
    seedIdentity(); seedQualification();
    const { POST } = await import(ROUTE);
    await POST(postReq({ roleQualificationId: QUAL_A, status: 'MET', sourceReference: 'Albo 2026/114' }));

    expect(recordGovernanceEventMock).toHaveBeenCalledTimes(1);
    expect(recordGovernanceEventMock).toHaveBeenCalledWith(expect.objectContaining({
      sourceModule: 'advisor-assignment',
      actorRole: 'KORA_ADMIN',
      actorId: ADMIN_ID,
      eventType: 'advisor_prerequisite_eligibility.set',
      objectType: 'advisor_prerequisite_eligibility',
      objectId: expect.any(String),
      payload: expect.objectContaining({ roleQualificationId: QUAL_A, status: 'MET' }),
    }));
  });

  it('every status change is audited, including a change back to NOT_MET', async () => {
    seedIdentity(); seedQualification();
    const { POST } = await import(ROUTE);
    await POST(postReq({ roleQualificationId: QUAL_A, status: 'MET' }));
    await POST(postReq({ roleQualificationId: QUAL_A, status: 'NOT_MET' }));

    expect(recordGovernanceEventMock).toHaveBeenCalledTimes(2);
    const statuses = recordGovernanceEventMock.mock.calls.map(
      ([p]) => (p.payload as { status: string }).status);
    expect(statuses).toEqual(['MET', 'NOT_MET']);
  });

  it('a rejected write is not audited', async () => {
    seedIdentity();
    const { POST } = await import(ROUTE);
    // No such qualification — the service's FK mapping rejects it.
    const res = await POST(postReq({ roleQualificationId: QUAL_B, status: 'MET' }));
    expect(res.status).toBe(422);
    expect(recordGovernanceEventMock).not.toHaveBeenCalled();
  });

  it('the audit substrate timestamps every event server-side', () => {
    const migration = readFileSync(join(ROOT, 'supabase/migrations/051_governance_event_substrate.sql'), 'utf8');
    expect(migration).toMatch(/occurred_at\s+timestamptz\s+NOT NULL\s+DEFAULT\s+now\(\)/i);
  });
});

// ── 8 — Existing WP-032 qualification-grant behaviour is intact ───────────

describe('KORA-WP-039 (8) — WP-032 grant behaviour preserved', () => {
  const page = () => readFileSync(join(ROOT, 'app/admin/advisor-governance/page.tsx'), 'utf8');
  const route = () => readFileSync(join(ROOT, 'app/api/admin/advisor-governance/route.ts'), 'utf8');

  it('the grant-eligible status set is unchanged', () => {
    expect(page()).toContain(
      "const GRANT_ELIGIBLE = new Set(['CANDIDATE', 'QUALIFICATION IN PROGRESS', 'RENEWAL DUE', 'EXPIRED']);");
  });

  it('the grant action still posts one qualificationId to the WP-032 endpoint and reloads', () => {
    const src = page();
    expect(src).toContain("fetch('/api/admin/advisor-governance', {");
    expect(src).toContain("body: JSON.stringify({ qualificationId }),");
    expect(src).toContain('await load();');
    // The button is still gated by the same set — no new eligibility path.
    expect(src).toContain('GRANT_ELIGIBLE.has(qualification.status)');
    // No bulk action, no revoke, no suspend was introduced. Checked against
    // executable code only — the file's header comment names those words.
    expect(stripComments(src)).not.toMatch(/\brevoke\b|\bsuspend\b|selectAll|bulk/i);
  });

  it('the WP-032 route is untouched: same guard, same rate limit, same single-decision call', () => {
    const src = route();
    expect(src).toContain('const auth = await requireKoraAdmin(request);');
    expect(src).toContain("await assertRateLimit('costly_admin_operation', auth.id)");
    expect(src).toContain('grantAdvisorRoleQualification({');
    expect(src).toContain('grantedByOperatorId: auth.id,');
    // WP-039 added no handler to the WP-032 route.
    expect(src.match(/export async function/g)).toHaveLength(2);
  });

  it('the prerequisite record does not gate the grant button', () => {
    // Recording a prerequisite must inform, never silently authorise or block:
    // WP-031 is explicit that an Assignment persists before it is valid.
    const src = page();
    const grantBlock = src.slice(src.indexOf('GRANT_ELIGIBLE.has(qualification.status) ?'));
    expect(grantBlock.slice(0, 600)).not.toContain('eligibility');
    expect(grantBlock.slice(0, 600)).not.toContain('display');
  });
});

// ── 9 — No DB or schema migration occurs ──────────────────────────────────

describe('KORA-WP-039 (9) — Data / Migration Impact is NONE', () => {
  it('no migration was added: 089 is still the highest', () => {
    const files = readdirSync(join(ROOT, 'supabase/migrations')).filter((f) => f.endsWith('.sql'));
    const highest = Math.max(...files.map((f) => Number.parseInt(f.slice(0, 3), 10)).filter(Number.isFinite));
    expect(highest).toBe(89);
    expect(files.some((f) => /wp[-_]?039/i.test(f))).toBe(false);
  });

  it('no WP-039 file contains DDL or a schema change', () => {
    const wp039Files = [
      'app/admin/advisor-governance/page.tsx',
      'app/admin/advisor-governance/prerequisite-state.ts',
      // signal.module.css was WP-039's route-local stylesheet, deleted on
      // 2026-09-21 when this route migrated onto the accepted KORA-WP-125
      // shared foundation. The file it protected no longer exists; the DDL
      // invariant itself is unchanged and still covers every file WP-039 owns.
      'app/api/admin/advisor-prerequisites/route.ts',
    ];
    for (const rel of wp039Files) {
      const src = readFileSync(join(ROOT, rel), 'utf8');
      expect(src).not.toMatch(/\b(CREATE|ALTER|DROP|TRUNCATE)\s+(TABLE|SCHEMA|POLICY|INDEX|FUNCTION|TYPE)\b/i);
    }
  });

  it('the route reuses the canonical service functions instead of querying the database itself', () => {
    const src = readFileSync(join(ROOT, 'app/api/admin/advisor-prerequisites/route.ts'), 'utf8');
    expect(src).toContain("from '@/lib/advisor-assignment/advisor-assignment-service'");
    expect(src).toContain('getPrerequisiteEligibilityForQualification');
    expect(src).toContain('setAdvisorPrerequisiteEligibility');
    // No direct Supabase access, and therefore no duplicated business logic.
    expect(src).not.toContain('getSupabaseServiceClient');
  });

  it('the canonical service keeps its own guard, upsert and audit call — WP-039 added no logic there', () => {
    const src = readFileSync(join(ROOT, 'lib/advisor-assignment/advisor-assignment-service.ts'), 'utf8');
    expect(src).toContain("requireKoraAdminActor(params.actorRole, 'setAdvisorPrerequisiteEligibility');");
    expect(src).toContain("{ onConflict: 'role_qualification_id' }");
    expect(src).toContain("eventType: 'advisor_prerequisite_eligibility.set',");
    expect(src).toContain('verified_by: params.actorId,');
    // The eligibility surface is the only thing WP-039 added, and it lives
    // entirely in app/ — the service exports the same functions as before.
    const exported = (src.match(/^export (async )?function (\w+)/gm) ?? []).map((m) => m.split(' ').pop());
    expect(exported).toEqual(expect.arrayContaining([
      'createAdvisorAssignment', 'endAdvisorAssignment', 'getAdvisorAssignmentById',
      'listAssignmentsForAdvisor', 'setAdvisorPrerequisiteEligibility',
      'getPrerequisiteEligibilityForQualification', 'evaluateAdvisorAssignmentValidity',
    ]));
  });
});
