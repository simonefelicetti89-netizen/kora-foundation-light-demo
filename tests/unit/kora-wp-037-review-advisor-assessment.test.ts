/**
 * KORA-WP-037 — Advisor Review Assessment Issuance.
 *
 * Behavioral tests of the REAL functions from
 * lib/review/review-advisor-assessment-service.ts and their wrapper in
 * lib/advisor-portal/advisor-decision-support-service.ts, layered on the
 * REAL, unmocked lib/review/review-service.ts and
 * lib/advisor-assignment/advisor-assignment-service.ts — only the
 * Supabase I/O boundary and lib/audit/governance-event.ts are mocked, the
 * exact same technique as kora-wp-033-review-advisor-proposal.test.ts.
 *
 * Real-DB proof of the schema/RLS/grant/immutability/tenant-match
 * invariants lives in this WP's own real-DB validation (see report 158).
 * This file proves the service's own logic: assignment/recusal
 * authorization, snapshot resolution, and provenance.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

interface AssignmentRow { id: string; advisor_id: string; company_id: string; role: string; status: string; conflict_flag: boolean; }
interface IdentityRow { id: string; status: string; }
interface QualificationRow { id: string; advisor_id: string; role: string; status: string; }
interface EligibilityRow { id: string; role_qualification_id: string; status: string; expiry_date: string | null; }
interface CommitmentRow { id: string; tenant_id: string; status: string; }
interface ReviewRow { id: string; tenant_id: string; commitment_id: string; status: string; opened_at: string; concluded_at: string | null; actor_role: string; actor_id: string; created_at: string; updated_at: string; }
interface AssessmentRow {
  id: string; tenant_id: string; review_id: string; assignment_id: string; actor_role: string; actor_id: string;
  assessment_narrative: string; qualification_status_at_issuance: string; conflict_flag_at_issuance: boolean; issued_at: string;
}

function tsCodeLines(src: string): string { return src.split('\n').filter((l) => !/^\s*\/\//.test(l)).join('\n'); }
function sqlCodeLines(src: string): string { return src.split('\n').filter((l) => !/^\s*--/.test(l)).join('\n'); }

let assignments: AssignmentRow[] = [];
let identities: IdentityRow[] = [];
let qualifications: QualificationRow[] = [];
let eligibilities: EligibilityRow[] = [];
let commitments: CommitmentRow[] = [];
let reviews: ReviewRow[] = [];
let assessments: AssessmentRow[] = [];
let idCounter = 0;

const NOW = '2026-09-18T00:00:00.000Z';
const governanceEvents: Array<Record<string, unknown>> = [];

function genericChain<T>(rows: () => T[], filters: Record<string, unknown> = {}) {
  const matches = () => rows().filter((r) => Object.entries(filters).every(([k, v]) => (r as unknown as Record<string, unknown>)[k] === v));
  const chain = {
    eq(col: string, val: unknown) { return genericChain(rows, { ...filters, [col]: val }); },
    order() { return chain; },
    limit() { return chain; },
    maybeSingle: async () => ({ data: matches()[0] ?? null, error: null }),
    single: async () => (matches()[0] ? { data: matches()[0], error: null } : { data: null, error: { message: 'no rows' } }),
    then(resolve: (v: { data: T[]; error: null }) => void) { resolve({ data: matches(), error: null }); },
  };
  return chain;
}

vi.mock('@/lib/supabase/server', () => ({
  getSupabaseServiceClient: () => ({
    schema: (schemaName: string) => ({
      from: (table: string) => {
        if (schemaName === 'advisor' && table === 'advisor_assignment') {
          return { select: () => genericChain(() => assignments) };
        }
        if (schemaName === 'advisor' && table === 'advisor_identity') {
          return { select: () => genericChain(() => identities) };
        }
        if (schemaName === 'advisor' && table === 'advisor_role_qualification') {
          return { select: () => genericChain(() => qualifications) };
        }
        if (schemaName === 'advisor' && table === 'advisor_prerequisite_eligibility') {
          return { select: () => genericChain(() => eligibilities) };
        }
        if (schemaName === 'analytics' && table === 'commitment') {
          return { select: () => genericChain(() => commitments) };
        }
        if (schemaName === 'analytics' && table === 'review') {
          return { select: () => genericChain(() => reviews) };
        }
        if (schemaName === 'analytics' && table === 'review_advisor_assessment') {
          return {
            select: () => genericChain(() => assessments),
            insert: (payload: Record<string, unknown>) => ({
              select: () => ({
                single: async () => {
                  // Real DB semantics simulated here (migration 080's own trigger).
                  if (payload.actor_role !== 'ADVISOR') {
                    return { data: null, error: { message: 'violates check constraint "review_advisor_assessment_actor_role_check"' } };
                  }
                  const review = reviews.find((r) => r.id === payload.review_id);
                  if (!review) {
                    return { data: null, error: { message: 'kora/not-found: referenced review not found' } };
                  }
                  if (review.status === 'concluded') {
                    return { data: null, error: { message: 'kora/review-concluded: an Advisor Review Assessment cannot be issued once the Review is concluded' } };
                  }
                  const row: AssessmentRow = {
                    id: `assess-${++idCounter}`, tenant_id: payload.tenant_id as string, review_id: payload.review_id as string,
                    assignment_id: payload.assignment_id as string, actor_role: payload.actor_role as string, actor_id: payload.actor_id as string,
                    assessment_narrative: payload.assessment_narrative as string,
                    qualification_status_at_issuance: payload.qualification_status_at_issuance as string,
                    conflict_flag_at_issuance: payload.conflict_flag_at_issuance as boolean,
                    issued_at: NOW,
                  };
                  assessments.push(row);
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
  recordGovernanceEvent: (params: Record<string, unknown>) => {
    governanceEvents.push(params);
    return Promise.resolve({ id: `gov-${governanceEvents.length}`, ...params });
  },
}));

function seedValidAdvisor(overrides: Partial<AssignmentRow> = {}): AssignmentRow {
  const assignment: AssignmentRow = {
    id: overrides.id ?? 'assign-1', advisor_id: overrides.advisor_id ?? 'adv-1',
    company_id: overrides.company_id ?? 'company-1', role: overrides.role ?? 'Company Advisor',
    status: overrides.status ?? 'active', conflict_flag: overrides.conflict_flag ?? false,
  };
  assignments.push(assignment);
  identities.push({ id: assignment.advisor_id, status: 'active' });
  const q: QualificationRow = { id: `qual-${assignment.id}`, advisor_id: assignment.advisor_id, role: assignment.role, status: 'QUALIFIED' };
  qualifications.push(q);
  eligibilities.push({ id: `elig-${assignment.id}`, role_qualification_id: q.id, status: 'MET', expiry_date: null });
  return assignment;
}

function seedReview(overrides: Partial<ReviewRow> = {}): ReviewRow {
  const row: ReviewRow = {
    id: overrides.id ?? 'rv-1', tenant_id: overrides.tenant_id ?? 'company-1', commitment_id: overrides.commitment_id ?? 'cm-1',
    status: overrides.status ?? 'open', opened_at: NOW, concluded_at: overrides.concluded_at ?? null,
    actor_role: 'COMPANY_ADMIN', actor_id: 'admin-1', created_at: NOW, updated_at: NOW,
  };
  reviews.push(row);
  return row;
}

beforeEach(() => {
  assignments = []; identities = []; qualifications = []; eligibilities = [];
  commitments = []; reviews = []; assessments = []; idCounter = 0;
  governanceEvents.length = 0;
});

// ═══════════════════════════════════════════════════════════════════════════
// A/G — valid issuance, exact verdict-type non-duplication, narrative retained
// ═══════════════════════════════════════════════════════════════════════════

describe('KORA-WP-037 — A/G. valid assigned Advisor issues an Assessment', () => {
  it('issues an Assessment via the decision-support wrapper, snapshotting qualification/conflict state', async () => {
    seedValidAdvisor();
    seedReview();
    const { issueReviewAdvisorAssessmentAsAdvisor } = await import('@/lib/advisor-portal/advisor-decision-support-service');
    const a = await issueReviewAdvisorAssessmentAsAdvisor({
      assignmentId: 'assign-1', callerAdvisorId: 'adv-1', reviewId: 'rv-1',
      assessmentNarrative: 'Evidence sufficiency: adequate. No material gaps found. Recommendation: KEEP.',
    });
    expect(a.reviewId).toBe('rv-1');
    expect(a.tenantId).toBe('company-1');
    expect(a.assignmentId).toBe('assign-1');
    expect(a.actorRole).toBe('ADVISOR');
    expect(a.actorId).toBe('adv-1');
    expect(a.assessmentNarrative).toContain('Recommendation: KEEP');
    expect(a.qualificationStatusAtIssuance).toBe('QUALIFIED');
    expect(a.conflictFlagAtIssuance).toBe(false);
  });

  it('never carries a structured proposedVerdict field — no second verdict enum (recommendation lives in narrative only)', async () => {
    seedValidAdvisor();
    seedReview();
    const { issueReviewAdvisorAssessmentAsAdvisor } = await import('@/lib/advisor-portal/advisor-decision-support-service');
    const a = await issueReviewAdvisorAssessmentAsAdvisor({
      assignmentId: 'assign-1', callerAdvisorId: 'adv-1', reviewId: 'rv-1', assessmentNarrative: 'x',
    });
    expect('proposedVerdict' in a).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// B/recusal — unassigned / recused Advisor denied (registry's own named test)
// ═══════════════════════════════════════════════════════════════════════════

describe('KORA-WP-037 — B. unassigned / recused Advisor denied (recusal negative-access test)', () => {
  it('an Advisor with no Assignment relationship to the given assignmentId is denied', async () => {
    seedReview();
    const { issueReviewAdvisorAssessmentAsAdvisor } = await import('@/lib/advisor-portal/advisor-decision-support-service');
    await expect(issueReviewAdvisorAssessmentAsAdvisor({
      assignmentId: 'no-such-assignment', callerAdvisorId: 'adv-1', reviewId: 'rv-1', assessmentNarrative: 'x',
    })).rejects.toThrow();
    expect(assessments.length).toBe(0);
  });

  it('a recused Advisor (conflict_flag=true on the instance) cannot issue an Assessment on it', async () => {
    seedValidAdvisor({ conflict_flag: true });
    seedReview();
    const { issueReviewAdvisorAssessmentAsAdvisor } = await import('@/lib/advisor-portal/advisor-decision-support-service');
    await expect(issueReviewAdvisorAssessmentAsAdvisor({
      assignmentId: 'assign-1', callerAdvisorId: 'adv-1', reviewId: 'rv-1', assessmentNarrative: 'x',
    })).rejects.toThrow(/not currently valid/);
    expect(assessments.length).toBe(0);
    expect(governanceEvents.length).toBe(0);
  });

  it('an Advisor whose Role Qualification is not QUALIFIED is denied', async () => {
    seedValidAdvisor();
    qualifications[0].status = 'EXPIRED';
    seedReview();
    const { issueReviewAdvisorAssessmentAsAdvisor } = await import('@/lib/advisor-portal/advisor-decision-support-service');
    await expect(issueReviewAdvisorAssessmentAsAdvisor({
      assignmentId: 'assign-1', callerAdvisorId: 'adv-1', reviewId: 'rv-1', assessmentNarrative: 'x',
    })).rejects.toThrow(/not currently valid/);
    expect(assessments.length).toBe(0);
  });

  it('an ended Assignment denies new issuance', async () => {
    seedValidAdvisor({ status: 'ended' });
    seedReview();
    const { issueReviewAdvisorAssessmentAsAdvisor } = await import('@/lib/advisor-portal/advisor-decision-support-service');
    await expect(issueReviewAdvisorAssessmentAsAdvisor({
      assignmentId: 'assign-1', callerAdvisorId: 'adv-1', reviewId: 'rv-1', assessmentNarrative: 'x',
    })).rejects.toThrow(/not currently valid/);
    expect(assessments.length).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// C — cross-Company Advisor denied
// ═══════════════════════════════════════════════════════════════════════════

describe('KORA-WP-037 — C. cross-Company Assignment/Review mismatch denied', () => {
  it('an Advisor assigned to Company A cannot assess a Review belonging to Company B', async () => {
    seedValidAdvisor({ id: 'assign-A', advisor_id: 'adv-A', company_id: 'company-A' });
    seedReview({ id: 'rv-B', tenant_id: 'company-B' });
    const { issueReviewAdvisorAssessmentAsAdvisor } = await import('@/lib/advisor-portal/advisor-decision-support-service');
    await expect(issueReviewAdvisorAssessmentAsAdvisor({
      assignmentId: 'assign-A', callerAdvisorId: 'adv-A', reviewId: 'rv-B', assessmentNarrative: 'x',
    })).rejects.toThrow(/not found/);
    expect(assessments.length).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// H — current/append-only invariant: multiple assessments per Review allowed
// ═══════════════════════════════════════════════════════════════════════════

describe('KORA-WP-037 — H. append-only: multiple Assessments per Review are legitimate, not a conflict', () => {
  it('a second issuance for the same Review creates a second, distinct row — never an overwrite', async () => {
    seedValidAdvisor();
    seedReview();
    const { issueReviewAdvisorAssessmentAsAdvisor } = await import('@/lib/advisor-portal/advisor-decision-support-service');
    const first = await issueReviewAdvisorAssessmentAsAdvisor({
      assignmentId: 'assign-1', callerAdvisorId: 'adv-1', reviewId: 'rv-1', assessmentNarrative: 'first pass',
    });
    const second = await issueReviewAdvisorAssessmentAsAdvisor({
      assignmentId: 'assign-1', callerAdvisorId: 'adv-1', reviewId: 'rv-1', assessmentNarrative: 'revised after new evidence',
    });
    expect(second.id).not.toBe(first.id);
    expect(assessments.length).toBe(2);
    expect(assessments[0].assessment_narrative).toBe('first pass'); // first row unchanged
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// I — Review lifecycle respected
// ═══════════════════════════════════════════════════════════════════════════

describe('KORA-WP-037 — I. Review lifecycle respected', () => {
  it('issuance is denied once the Review is concluded', async () => {
    seedValidAdvisor();
    seedReview({ status: 'concluded', concluded_at: NOW });
    const { issueReviewAdvisorAssessmentAsAdvisor } = await import('@/lib/advisor-portal/advisor-decision-support-service');
    await expect(issueReviewAdvisorAssessmentAsAdvisor({
      assignmentId: 'assign-1', callerAdvisorId: 'adv-1', reviewId: 'rv-1', assessmentNarrative: 'too late',
    })).rejects.toThrow(/concluded/);
    expect(assessments.length).toBe(0);
  });

  it('issuance is allowed while open and while in-progress', async () => {
    seedValidAdvisor();
    seedReview({ id: 'rv-open', status: 'open' });
    seedReview({ id: 'rv-inprog', status: 'in-progress' });
    const { issueReviewAdvisorAssessmentAsAdvisor } = await import('@/lib/advisor-portal/advisor-decision-support-service');
    await expect(issueReviewAdvisorAssessmentAsAdvisor({
      assignmentId: 'assign-1', callerAdvisorId: 'adv-1', reviewId: 'rv-open', assessmentNarrative: 'x',
    })).resolves.toBeTruthy();
    await expect(issueReviewAdvisorAssessmentAsAdvisor({
      assignmentId: 'assign-1', callerAdvisorId: 'adv-1', reviewId: 'rv-inprog', assessmentNarrative: 'x',
    })).resolves.toBeTruthy();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// J/K/L — Assessment ≠ verdict, Company retains final authority
// ═══════════════════════════════════════════════════════════════════════════

describe('KORA-WP-037 — J/K/L. Assessment never finalizes the Review — Company retains authority', () => {
  it('this module never imports concludeReview or commit-activation-service', async () => {
    const { readFileSync } = await import('node:fs');
    const svcSrc = tsCodeLines(readFileSync('lib/review/review-advisor-assessment-service.ts', 'utf8'));
    const wrapperSrc = readFileSync('lib/advisor-portal/advisor-decision-support-service.ts', 'utf8');
    expect(svcSrc).not.toMatch(/concludeReview|commit-activation-service/);
    // The wrapper file imports concludeReview nowhere either, for any function — including the new one.
    expect(wrapperSrc.split('\n').filter((l) => /^\s*import\b/.test(l)).some((l) => /concludeReview|commit-activation-service/.test(l))).toBe(false);
  });

  it('issuing an Assessment does not change the Review status', async () => {
    seedValidAdvisor();
    seedReview();
    const { issueReviewAdvisorAssessmentAsAdvisor } = await import('@/lib/advisor-portal/advisor-decision-support-service');
    await issueReviewAdvisorAssessmentAsAdvisor({
      assignmentId: 'assign-1', callerAdvisorId: 'adv-1', reviewId: 'rv-1', assessmentNarrative: 'x',
    });
    expect(reviews.find((r) => r.id === 'rv-1')!.status).toBe('open');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// F — reuses the exact existing Review; no second Review/verdict model
// ═══════════════════════════════════════════════════════════════════════════

describe('KORA-WP-037 — F. no second Review model, no second table for the same object', () => {
  it('references analytics.review by review_id — no advisor_review/advisor_decision table exists', async () => {
    const { readFileSync } = await import('node:fs');
    const migrationSrc = readFileSync('supabase/migrations/080_review_advisor_assessment.sql', 'utf8');
    expect(migrationSrc).toMatch(/REFERENCES analytics\.review \(id\)/);
    expect(migrationSrc).not.toMatch(/CREATE TABLE.*advisor_review\b/i);
    expect(migrationSrc).not.toMatch(/CREATE TABLE.*advisor_decision\b/i);
  });

  it('review_advisor_proposal (WP-033 convergence) is never imported here — genuinely distinct objects', async () => {
    const { readFileSync } = await import('node:fs');
    const src = tsCodeLines(readFileSync('lib/review/review-advisor-assessment-service.ts', 'utf8'));
    expect(src).not.toMatch(/review-advisor-proposal-service/);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// N/O — no Worker/PIB, no Prime/billing contamination
// ═══════════════════════════════════════════════════════════════════════════

describe('KORA-WP-037 — N/O. no Worker/PIB, no Prime/billing contamination', () => {
  it('no Worker/PIB reference anywhere in the new files', async () => {
    const { readFileSync } = await import('node:fs');
    const svcSrc = tsCodeLines(readFileSync('lib/review/review-advisor-assessment-service.ts', 'utf8'));
    const migSrc = sqlCodeLines(readFileSync('supabase/migrations/080_review_advisor_assessment.sql', 'utf8'));
    for (const src of [svcSrc, migSrc]) {
      expect(src).not.toMatch(/worker_id|workerId|\bPIB\b|worker_pib/);
    }
  });

  it('no billing/payable/Prime/fee_charge import exists in the new service files', async () => {
    const { readFileSync } = await import('node:fs');
    const svcSrc = readFileSync('lib/review/review-advisor-assessment-service.ts', 'utf8');
    const lines = svcSrc.split('\n').filter((l) => !/^\s*\/\//.test(l) && /^\s*import\b/.test(l));
    expect(lines.some((l) => /billing|payable|prime|fee_charge|commercial-entitlement/i.test(l))).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// P — WP-042 downstream contract
// ═══════════════════════════════════════════════════════════════════════════

describe('KORA-WP-037 — P. downstream contract for WP-042', () => {
  it('exports a stable, importable issuance/read surface', async () => {
    const mod = await import('@/lib/advisor-portal/advisor-decision-support-service');
    expect(typeof mod.issueReviewAdvisorAssessmentAsAdvisor).toBe('function');
    expect(typeof mod.listReviewAdvisorAssessmentsForReviewAsAdvisor).toBe('function');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// governance / audit
// ═══════════════════════════════════════════════════════════════════════════

describe('KORA-WP-037 — issuance events are audited via the existing governance substrate', () => {
  it('a successful issuance emits exactly one governance event, never on a denied attempt', async () => {
    seedValidAdvisor();
    seedReview();
    const { issueReviewAdvisorAssessmentAsAdvisor } = await import('@/lib/advisor-portal/advisor-decision-support-service');
    const a = await issueReviewAdvisorAssessmentAsAdvisor({
      assignmentId: 'assign-1', callerAdvisorId: 'adv-1', reviewId: 'rv-1', assessmentNarrative: 'x',
    });
    expect(governanceEvents.length).toBe(1);
    expect(governanceEvents[0]).toMatchObject({ eventType: 'review_advisor_assessment.issued', objectId: a.id, tenantId: 'company-1' });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// list function
// ═══════════════════════════════════════════════════════════════════════════

describe('KORA-WP-037 — listReviewAdvisorAssessmentsForReviewAsAdvisor', () => {
  it('returns all issued assessments for a Review, Company-scoped', async () => {
    seedValidAdvisor();
    seedReview();
    const { issueReviewAdvisorAssessmentAsAdvisor, listReviewAdvisorAssessmentsForReviewAsAdvisor } = await import('@/lib/advisor-portal/advisor-decision-support-service');
    await issueReviewAdvisorAssessmentAsAdvisor({ assignmentId: 'assign-1', callerAdvisorId: 'adv-1', reviewId: 'rv-1', assessmentNarrative: 'a' });
    await issueReviewAdvisorAssessmentAsAdvisor({ assignmentId: 'assign-1', callerAdvisorId: 'adv-1', reviewId: 'rv-1', assessmentNarrative: 'b' });
    const list = await listReviewAdvisorAssessmentsForReviewAsAdvisor('assign-1', 'adv-1', 'rv-1');
    expect(list.length).toBe(2);
  });
});
