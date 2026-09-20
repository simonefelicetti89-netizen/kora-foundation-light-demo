/**
 * KORA-WP-033 CONVERGENCE — Final Remediation: Advisor Review Proposal.
 *
 * Behavioral tests of the REAL functions from
 * lib/review/review-advisor-proposal-service.ts and their thin wrapper in
 * lib/advisor-portal/advisor-decision-support-service.ts, layered on the
 * REAL, unmocked lib/review/review-service.ts — only the Supabase I/O
 * boundary is mocked, same technique as kora-wp-033-convergence.test.ts.
 *
 * No pre-existing table is reused (migration 071's own header explains
 * why analytics.review/review_event were both rejected as unsafe hosts).
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

interface AssignmentRow { id: string; advisor_id: string; company_id: string; role: string; status: string; conflict_flag: boolean; }
interface IdentityRow { id: string; status: string; }
interface QualificationRow { id: string; advisor_id: string; role: string; status: string; }
interface EligibilityRow { id: string; role_qualification_id: string; status: string; expiry_date: string | null; }
interface CommitmentRow { id: string; tenant_id: string; status: string; }
interface ReviewRow { id: string; tenant_id: string; commitment_id: string; status: string; opened_at: string; concluded_at: string | null; actor_role: string; actor_id: string; created_at: string; updated_at: string; }
interface ProposalRow {
  id: string; tenant_id: string; review_id: string; proposal_narrative: string | null; proposed_verdict: string | null;
  actor_role: string; actor_id: string; created_at: string; updated_at: string;
}

let assignments: AssignmentRow[] = [];
let identities: IdentityRow[] = [];
let qualifications: QualificationRow[] = [];
let eligibilities: EligibilityRow[] = [];
let commitments: CommitmentRow[] = [];
let reviews: ReviewRow[] = [];
let proposals: ProposalRow[] = [];
let idCounter = 0;

const NOW = '2026-09-16T00:00:00.000Z';

function genericChain<T>(rows: () => T[], filters: Record<string, unknown> = {}) {
  const matches = () => rows().filter((r) => Object.entries(filters).every(([k, v]) => (r as unknown as Record<string, unknown>)[k] === v));
  const chain = {
    eq(col: string, val: unknown) { return genericChain(rows, { ...filters, [col]: val }); },
    order(_col: string, _opts?: { ascending?: boolean }) { return chain; },
    limit(_n: number) { return chain; },
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
        if (schemaName === 'analytics' && table === 'review_advisor_proposal') {
          return {
            select: () => genericChain(() => proposals),
            upsert: (payload: Record<string, unknown>, _opts?: { onConflict: string }) => ({
              select: () => ({
                single: async () => {
                  // Real DB semantics: reject non-ADVISOR actor_role via the
                  // migration's own CHECK constraint (simulated here).
                  if (payload.actor_role !== 'ADVISOR') {
                    return { data: null, error: { message: 'new row for relation "review_advisor_proposal" violates check constraint "review_advisor_proposal_actor_role_check"' } };
                  }
                  // Real DB semantics: reject write against a concluded Review
                  // via the migration's own trigger (simulated here).
                  const review = reviews.find((r) => r.id === payload.review_id);
                  if (review && review.status === 'concluded') {
                    return { data: null, error: { message: 'kora/review-concluded: an Advisor Review Proposal cannot be created or edited once the Review is concluded' } };
                  }
                  const existing = proposals.find((p) => p.review_id === payload.review_id);
                  if (existing) {
                    Object.assign(existing, payload, { updated_at: NOW });
                    return { data: existing, error: null };
                  }
                  const row: ProposalRow = {
                    id: `prop-${++idCounter}`, tenant_id: payload.tenant_id as string, review_id: payload.review_id as string,
                    proposal_narrative: (payload.proposal_narrative as string) ?? null,
                    proposed_verdict: (payload.proposed_verdict as string) ?? null,
                    actor_role: payload.actor_role as string, actor_id: payload.actor_id as string,
                    created_at: NOW, updated_at: NOW,
                  };
                  proposals.push(row);
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
  commitments = []; reviews = []; proposals = []; idCounter = 0;
});

// ═══════════════════════════════════════════════════════════════════════════
// PART 1 — core service: create/update, one-per-Review, verdict validation
// ═══════════════════════════════════════════════════════════════════════════

describe('review-advisor-proposal-service — upsertReviewAdvisorProposal', () => {
  it('creates a new proposal with narrative + verdict', async () => {
    seedReview();
    const { upsertReviewAdvisorProposal } = await import('@/lib/review/review-advisor-proposal-service');
    const p = await upsertReviewAdvisorProposal({
      reviewId: 'rv-1', tenantId: 'company-1', actorRole: 'ADVISOR', actorId: 'adv-1',
      proposalNarrative: 'Expected uptake was 40%; observed 55%.', proposedVerdict: 'KEEP',
    });
    expect(p.proposalNarrative).toBe('Expected uptake was 40%; observed 55%.');
    expect(p.proposedVerdict).toBe('KEEP');
    expect(p.actorRole).toBe('ADVISOR');
    expect(p.actorId).toBe('adv-1');
  });

  it('update === create (upsert) — same row, one current proposal per Review', async () => {
    seedReview();
    const { upsertReviewAdvisorProposal } = await import('@/lib/review/review-advisor-proposal-service');
    const first = await upsertReviewAdvisorProposal({ reviewId: 'rv-1', tenantId: 'company-1', actorRole: 'ADVISOR', actorId: 'adv-1', proposalNarrative: 'draft v1' });
    const second = await upsertReviewAdvisorProposal({ reviewId: 'rv-1', tenantId: 'company-1', actorRole: 'ADVISOR', actorId: 'adv-1', proposalNarrative: 'draft v2', proposedVerdict: 'MODIFY' });
    expect(second.id).toBe(first.id);
    expect(second.proposalNarrative).toBe('draft v2');
    expect(second.proposedVerdict).toBe('MODIFY');
    expect(proposals.length).toBe(1);
  });

  it('rejects a non-canonical verdict', async () => {
    seedReview();
    const { upsertReviewAdvisorProposal } = await import('@/lib/review/review-advisor-proposal-service');
    await expect(upsertReviewAdvisorProposal({
      reviewId: 'rv-1', tenantId: 'company-1', actorRole: 'ADVISOR', actorId: 'adv-1',
      proposedVerdict: 'APPROVE' as never,
    })).rejects.toThrow(/not a canonical verdict/);
  });

  it('accepts every canonical verdict', async () => {
    seedReview();
    const { upsertReviewAdvisorProposal, } = await import('@/lib/review/review-advisor-proposal-service');
    const { REVIEW_VERDICTS } = await import('@/lib/review/review-service');
    for (const v of REVIEW_VERDICTS) {
      const p = await upsertReviewAdvisorProposal({ reviewId: 'rv-1', tenantId: 'company-1', actorRole: 'ADVISOR', actorId: 'adv-1', proposedVerdict: v });
      expect(p.proposedVerdict).toBe(v);
    }
  });

  it('rejects a non-ADVISOR actor (structurally singular author)', async () => {
    seedReview();
    const { upsertReviewAdvisorProposal } = await import('@/lib/review/review-advisor-proposal-service');
    await expect(upsertReviewAdvisorProposal({ reviewId: 'rv-1', tenantId: 'company-1', actorRole: 'COMPANY_ADMIN', actorId: 'admin-1', proposalNarrative: 'x' }))
      .rejects.toThrow(/only ADVISOR may author/);
    expect(proposals.length).toBe(0);
  });

  it('rejects a nonexistent review (cross-tenant/forged reference)', async () => {
    const { upsertReviewAdvisorProposal } = await import('@/lib/review/review-advisor-proposal-service');
    await expect(upsertReviewAdvisorProposal({ reviewId: 'no-such', tenantId: 'company-1', actorRole: 'ADVISOR', actorId: 'adv-1' }))
      .rejects.toThrow(/not found/);
  });

  it('rejects editing once the Review is concluded — proposal becomes immutable historical material', async () => {
    seedReview({ status: 'concluded', concluded_at: NOW });
    const { upsertReviewAdvisorProposal } = await import('@/lib/review/review-advisor-proposal-service');
    await expect(upsertReviewAdvisorProposal({ reviewId: 'rv-1', tenantId: 'company-1', actorRole: 'ADVISOR', actorId: 'adv-1', proposalNarrative: 'too late' }))
      .rejects.toThrow(/concluded/);
    expect(proposals.length).toBe(0);
  });

  it('allows editing while open and while in-progress', async () => {
    const { upsertReviewAdvisorProposal } = await import('@/lib/review/review-advisor-proposal-service');
    seedReview({ id: 'rv-open', status: 'open' });
    await expect(upsertReviewAdvisorProposal({ reviewId: 'rv-open', tenantId: 'company-1', actorRole: 'ADVISOR', actorId: 'adv-1', proposalNarrative: 'x' })).resolves.toBeTruthy();
    seedReview({ id: 'rv-prog', status: 'in-progress' });
    await expect(upsertReviewAdvisorProposal({ reviewId: 'rv-prog', tenantId: 'company-1', actorRole: 'ADVISOR', actorId: 'adv-1', proposalNarrative: 'x' })).resolves.toBeTruthy();
  });
});

describe('review-advisor-proposal-service — reads', () => {
  it('getReviewAdvisorProposalForReview returns the current proposal', async () => {
    seedReview();
    const { upsertReviewAdvisorProposal, getReviewAdvisorProposalForReview } = await import('@/lib/review/review-advisor-proposal-service');
    await upsertReviewAdvisorProposal({ reviewId: 'rv-1', tenantId: 'company-1', actorRole: 'ADVISOR', actorId: 'adv-1', proposalNarrative: 'x', proposedVerdict: 'KEEP' });
    const read = await getReviewAdvisorProposalForReview('rv-1', 'company-1');
    expect(read?.proposalNarrative).toBe('x');
  });

  it('returns null when no proposal exists yet', async () => {
    seedReview();
    const { getReviewAdvisorProposalForReview } = await import('@/lib/review/review-advisor-proposal-service');
    expect(await getReviewAdvisorProposalForReview('rv-1', 'company-1')).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// PART 2 — Advisor wrapper: assignment scoping, provenance
// ═══════════════════════════════════════════════════════════════════════════

describe('advisor-decision-support-service — upsertReviewAdvisorProposalAsAdvisor / getReviewAdvisorProposalForReviewAsAdvisor', () => {
  it('a validly assigned Advisor can create and read their own proposal', async () => {
    seedValidAdvisor();
    seedReview();
    const { upsertReviewAdvisorProposalAsAdvisor, getReviewAdvisorProposalForReviewAsAdvisor } =
      await import('@/lib/advisor-portal/advisor-decision-support-service');
    const created = await upsertReviewAdvisorProposalAsAdvisor({
      assignmentId: 'assign-1', callerAdvisorId: 'adv-1', reviewId: 'rv-1',
      proposalNarrative: 'Expected vs observed narrative.', proposedVerdict: 'INVESTIGATE',
    });
    expect(created.actorRole).toBe('ADVISOR');
    expect(created.actorId).toBe('adv-1');
    const read = await getReviewAdvisorProposalForReviewAsAdvisor('assign-1', 'adv-1', 'rv-1');
    expect(read?.proposedVerdict).toBe('INVESTIGATE');
  });

  it('denies an unassigned/invalid Advisor (same discipline as every other function in this module)', async () => {
    const a = seedValidAdvisor();
    seedReview();
    a.status = 'ended';
    const { upsertReviewAdvisorProposalAsAdvisor } = await import('@/lib/advisor-portal/advisor-decision-support-service');
    await expect(upsertReviewAdvisorProposalAsAdvisor({ assignmentId: 'assign-1', callerAdvisorId: 'adv-1', reviewId: 'rv-1', proposalNarrative: 'x' }))
      .rejects.toThrow(/not currently valid/);
  });

  it('denies a caller who is not the Advisor party to the Assignment', async () => {
    seedValidAdvisor();
    seedReview();
    const { upsertReviewAdvisorProposalAsAdvisor } = await import('@/lib/advisor-portal/advisor-decision-support-service');
    await expect(upsertReviewAdvisorProposalAsAdvisor({ assignmentId: 'assign-1', callerAdvisorId: 'adv-2', reviewId: 'rv-1', proposalNarrative: 'x' }))
      .rejects.toThrow(/not the Advisor party/);
  });

  it('cross-tenant: an Advisor assigned to Company A cannot reach Company B\'s Review proposal', async () => {
    seedValidAdvisor({ id: 'assign-a', advisor_id: 'adv-1', company_id: 'company-a' });
    seedReview({ id: 'rv-b', tenant_id: 'company-b' });
    const { getReviewAdvisorProposalForReviewAsAdvisor } = await import('@/lib/advisor-portal/advisor-decision-support-service');
    // The wrapper always resolves tenantId from the Assignment itself — the
    // underlying tenant-scoped read structurally cannot find Company B's
    // review through Company A's Assignment (it will not even find the
    // review, so no proposal read is reachable at all).
    await expect(getReviewAdvisorProposalForReviewAsAdvisor('assign-a', 'adv-1', 'rv-b')).resolves.toBeNull();
  });

  it('Company retains the proposal after the Assignment ends — no shadow database, Company-owned canonical history', async () => {
    const a = seedValidAdvisor();
    seedReview();
    const { upsertReviewAdvisorProposalAsAdvisor } = await import('@/lib/advisor-portal/advisor-decision-support-service');
    await upsertReviewAdvisorProposalAsAdvisor({ assignmentId: 'assign-1', callerAdvisorId: 'adv-1', reviewId: 'rv-1', proposalNarrative: 'persisted' });
    a.status = 'ended';
    // Company's own (tenant-scoped, unrestricted) read path is unaffected.
    const { getReviewAdvisorProposalForReview } = await import('@/lib/review/review-advisor-proposal-service');
    const stillThere = await getReviewAdvisorProposalForReview('rv-1', 'company-1');
    expect(stillThere?.proposalNarrative).toBe('persisted');
    // Advisor's own operational access path is correctly denied now.
    const { getReviewAdvisorProposalForReviewAsAdvisor } = await import('@/lib/advisor-portal/advisor-decision-support-service');
    await expect(getReviewAdvisorProposalForReviewAsAdvisor('assign-1', 'adv-1', 'rv-1')).rejects.toThrow(/not currently valid/);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// PART 3 — structural / constitutive-denial / privacy
// ═══════════════════════════════════════════════════════════════════════════

describe('KORA-WP-033 final remediation — structural guarantees', () => {
  const proposalServiceSrc = readFileSync(join(process.cwd(), 'lib/review/review-advisor-proposal-service.ts'), 'utf8');
  const wrapperSrc = readFileSync(join(process.cwd(), 'lib/advisor-portal/advisor-decision-support-service.ts'), 'utf8');
  const migrationSrc = readFileSync(join(process.cwd(), 'supabase/migrations/071_review_advisor_proposal.sql'), 'utf8');

  it('review-advisor-proposal-service.ts never imports concludeReview or commit-activation-service', () => {
    const importLines = proposalServiceSrc.split('\n').filter((l) => l.trim().startsWith('import')).join('\n');
    expect(importLines).not.toMatch(/concludeReview|commit-activation-service|commitCommitment/);
  });

  it('the wrapper functions never import concludeReview (checked at the import-line level, not the disclosing prose)', () => {
    const importLines = wrapperSrc.split('\n').filter((l) => l.trim().startsWith('import')).join('\n');
    expect(importLines).not.toMatch(/concludeReview/);
  });

  it('migration creates exactly one new table, no view, no RPC/function beyond the trigger function', () => {
    expect(migrationSrc).toMatch(/CREATE TABLE IF NOT EXISTS analytics\.review_advisor_proposal/);
    expect(migrationSrc).not.toMatch(/CREATE OR REPLACE VIEW/);
    expect(migrationSrc).not.toMatch(/ALTER TABLE analytics\.review\b[^_]/); // review/review_event untouched
    expect(migrationSrc).not.toMatch(/ALTER TABLE analytics\.review_event/);
  });

  // Comment-stripped views — the disclosing prose in both files legitimately
  // discusses (in English sentences) several of the exact words these tests
  // guard against ("no PIB", "no generic approval/accept-reject", "GRANT...
  // ON DELETE CASCADE" as part of an FK definition) without introducing the
  // real thing. Guard the actual code/DDL, not the header commentary.
  const migrationCodeOnly = migrationSrc.split('\n').filter((l) => !l.trim().startsWith('--')).join('\n');
  const proposalServiceCodeOnly = proposalServiceSrc.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
  const grantLines = migrationSrc.split('\n').filter((l) => /^\s*GRANT\b/i.test(l)).join('\n');
  const policyLines = migrationSrc.split('\n').filter((l) => /CREATE POLICY/i.test(l)).join('\n');

  it('migration grants no DELETE, anywhere, on the new table (checked on actual GRANT statements only)', () => {
    expect(grantLines).not.toMatch(/DELETE/i);
  });

  it('actor_role is CHECK-pinned to the single legal value ADVISOR', () => {
    expect(migrationSrc).toMatch(/actor_role\s+text\s+NOT NULL\s+DEFAULT 'ADVISOR' CHECK \(actor_role = 'ADVISOR'\)/);
  });

  it('proposed_verdict reuses the exact same 6-value canonical vocabulary as review_event, never a second taxonomy', () => {
    expect(migrationSrc).toMatch(/proposed_verdict IN \('KEEP', 'STOP', 'MODIFY', 'REALLOCATE', 'CREATE', 'INVESTIGATE'\)/);
  });

  it('review_id is UNIQUE — one current proposal per Review, structurally enforced', () => {
    expect(migrationSrc).toMatch(/review_id\s+uuid\s+NOT NULL UNIQUE REFERENCES analytics\.review/);
  });

  it('RLS Pattern A — KORA_ADMIN full, COMPANY_ADMIN read-only own-tenant, no Advisor-role-scoped policy (checked on CREATE POLICY lines only — "review_advisor_proposal" itself legitimately contains the substring "advisor")', () => {
    expect(migrationSrc).toMatch(/CREATE POLICY "kora_admin_all_review_advisor_proposal"/);
    expect(migrationSrc).toMatch(/CREATE POLICY "company_own_review_advisor_proposal_read"/);
    expect(policyLines).not.toMatch(/kora_role\(\)\s*=\s*'ADVISOR'/);
  });

  it('no Worker/PIB field or column introduced anywhere (checked on actual code/DDL, not the disclosing header prose)', () => {
    expect(proposalServiceCodeOnly).not.toMatch(/worker_id|workerId|\bPIB\b|pib_/);
    expect(migrationCodeOnly).not.toMatch(/worker_id|\bpib\b/i);
  });

  it('no second verdict vocabulary, no Advisor score/confidence concept introduced', () => {
    expect(proposalServiceCodeOnly).not.toMatch(/advisor.?score|advisor.?confidence|advisor.?verdict.?enum/i);
  });

  it('no accept/reject/approval lifecycle field or status value introduced (checked on actual code/DDL, not the disclosing header prose)', () => {
    expect(migrationCodeOnly).not.toMatch(/'accepted'|'rejected'|'approved'|'partially_accepted'/i);
    expect(proposalServiceCodeOnly).not.toMatch(/\baccept\w*\(|\breject\w*\(|\bapprove\w*\(/i);
  });
});
