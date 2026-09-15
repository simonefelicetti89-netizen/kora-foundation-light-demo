// lib/review/review-advisor-proposal-service.ts
// KORA-WP-033 CONVERGENCE — Advisor Review Proposal (Final Remediation).
//
// Doc 73 §6, SUPPORT-REVIEW, verbatim: "drafting the expected-vs-observed
// narrative, proposing a verdict recommendation." This module is the
// deferred storage for exactly that — the one design gap the prior WP-033
// convergence remediation (this repository's own commit e3f98a2) explicitly
// left unresolved rather than invent unreviewed schema. Founder design
// decision, this task: REVIEW -> ADVISOR REVIEW PROPOSAL -> FINAL REVIEW
// EVENT are three distinct concepts. This module owns only the middle one.
//
// NEVER reaches the constitutive path: this file does not import
// concludeReview() or anything from lib/commitment/commit-activation-service.ts
// — structurally cannot conclude a Review, create or mutate the final
// Review Event, or alter Commitment lifecycle. The proposal is read-only
// input to a human Decision Owner's own judgment, never itself the verdict.
//
// ONE CURRENT PROPOSAL PER REVIEW (migration 071's own UNIQUE(review_id)):
// create and update are the same upsert — no revision history, no comment
// thread, no multi-proposal comparison, no generic approval/accept-reject
// workflow, per explicit Founder scope boundary.
//
// AUTHOR ROLE IS STRUCTURALLY SINGULAR: unlike commitment/evidence_plan/
// review (which accept COMPANY_ADMIN or ADVISOR), this object has exactly
// one legal author — ADVISOR — enforced both here and by migration 071's
// own CHECK constraint. Company may read (see the plain read functions
// below, actor-agnostic like getReview/getEvidencePlan) but can never
// write here — rewriting Advisor content while keeping Advisor attribution
// would falsify provenance, the one thing this module exists to prevent.

import { getSupabaseServiceClient } from '@/lib/supabase/server';
import { getReview, REVIEW_VERDICTS, type ReviewVerdict } from '@/lib/review/review-service';

const PROPOSAL_AUTHOR_ROLE = 'ADVISOR';

export interface ReviewAdvisorProposal {
  id: string;
  tenantId: string;
  reviewId: string;
  proposalNarrative: string | null;
  proposedVerdict: ReviewVerdict | null;
  actorRole: string;
  actorId: string;
  createdAt: string;
  updatedAt: string;
}

interface ReviewAdvisorProposalDbRow {
  id: string;
  tenant_id: string;
  review_id: string;
  proposal_narrative: string | null;
  proposed_verdict: string | null;
  actor_role: string;
  actor_id: string;
  created_at: string;
  updated_at: string;
}

function toReviewAdvisorProposal(row: ReviewAdvisorProposalDbRow): ReviewAdvisorProposal {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    reviewId: row.review_id,
    proposalNarrative: row.proposal_narrative,
    proposedVerdict: row.proposed_verdict as ReviewVerdict | null,
    actorRole: row.actor_role,
    actorId: row.actor_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function assertAdvisorAuthor(actorRole: string): void {
  if (actorRole !== PROPOSAL_AUTHOR_ROLE) {
    throw new Error(
      `[KORA] review-advisor-proposal rejected: only ${PROPOSAL_AUTHOR_ROLE} may author a Review Proposal (doc 73 §6 SUPPORT-REVIEW) — the Company reads this object but never writes it; rewriting Advisor content while keeping Advisor attribution would falsify provenance.`,
    );
  }
}

function assertActor(actorRole: string, actorId: string): void {
  if (!actorRole || !actorId) {
    throw new Error('[KORA] review-advisor-proposal rejected: actorRole and actorId are required — this substrate never manufactures actor attribution.');
  }
}

// ── upsertReviewAdvisorProposal — the ONLY write path; create === update ───

export interface UpsertReviewAdvisorProposalParams {
  reviewId: string;
  tenantId: string;
  actorRole: string;
  actorId: string;
  proposalNarrative?: string | null;
  proposedVerdict?: ReviewVerdict | null;
}

export async function upsertReviewAdvisorProposal(params: UpsertReviewAdvisorProposalParams): Promise<ReviewAdvisorProposal> {
  assertActor(params.actorRole, params.actorId);
  assertAdvisorAuthor(params.actorRole);
  if (params.proposedVerdict !== undefined && params.proposedVerdict !== null && !REVIEW_VERDICTS.includes(params.proposedVerdict)) {
    throw new Error(`[KORA] review-advisor-proposal rejected: "${params.proposedVerdict}" is not a canonical verdict (PT FT-024) — the Advisor proposes only from the same vocabulary the final Review Event itself uses, never a second taxonomy.`);
  }

  const db = getSupabaseServiceClient();

  // Re-verified here (not only by the DB trigger) so the rejection reason
  // is clear before any write is attempted — the trigger is the
  // structural backstop, this is the informative first gate.
  const review = await getReview(params.reviewId, params.tenantId);
  if (!review) {
    throw new Error(`[KORA] review-advisor-proposal rejected: review "${params.reviewId}" not found for tenant "${params.tenantId}" (cross-tenant references are never allowed).`);
  }
  if (review.status === 'concluded') {
    throw new Error('[KORA] review-advisor-proposal rejected: this Review is concluded — the proposal is now permanent historical material and can never be edited again (a correction is always a new Review cycle, doc 68 §1.5).');
  }

  const patch: Record<string, unknown> = {
    tenant_id: params.tenantId,
    review_id: params.reviewId,
    actor_role: params.actorRole,
    actor_id: params.actorId,
  };
  if (params.proposalNarrative !== undefined) patch.proposal_narrative = params.proposalNarrative;
  if (params.proposedVerdict !== undefined) patch.proposed_verdict = params.proposedVerdict;

  const { data, error } = await db
    .schema('analytics')
    .from('review_advisor_proposal')
    .upsert(patch, { onConflict: 'review_id' })
    .select()
    .single();

  if (error || !data) {
    throw new Error(`[KORA] review-advisor-proposal upsert failed: ${error?.message ?? 'no data returned'}`);
  }

  return toReviewAdvisorProposal(data as ReviewAdvisorProposalDbRow);
}

// ── read paths — actor-agnostic, same convention as getReview/getEvidencePlan ──
// No actor check: Company reads unrestricted (beyond tenant scoping,
// matching every other Company read in this schema); the Advisor's own
// read path is gated one layer up, in advisor-decision-support-service.ts,
// by its own Assignment-validity check — never here.

export async function getReviewAdvisorProposal(id: string, tenantId: string): Promise<ReviewAdvisorProposal | null> {
  const db = getSupabaseServiceClient();

  const { data, error } = await db
    .schema('analytics')
    .from('review_advisor_proposal')
    .select()
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .maybeSingle();

  if (error) {
    throw new Error(`[KORA] getReviewAdvisorProposal failed: ${error.message}`);
  }
  if (!data) return null;

  return toReviewAdvisorProposal(data as ReviewAdvisorProposalDbRow);
}

export async function getReviewAdvisorProposalForReview(reviewId: string, tenantId: string): Promise<ReviewAdvisorProposal | null> {
  const db = getSupabaseServiceClient();

  const { data, error } = await db
    .schema('analytics')
    .from('review_advisor_proposal')
    .select()
    .eq('review_id', reviewId)
    .eq('tenant_id', tenantId)
    .maybeSingle();

  if (error) {
    throw new Error(`[KORA] getReviewAdvisorProposalForReview failed: ${error.message}`);
  }
  if (!data) return null;

  return toReviewAdvisorProposal(data as ReviewAdvisorProposalDbRow);
}
