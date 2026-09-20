// lib/review/review-advisor-assessment-service.ts
// KORA-WP-037 — Advisor Review Assessment Issuance.
//
// Doc 76 §10, verbatim: "New, non-constitutive concept: Advisor Review
// Assessment, attached to a specific Review/Evidence context... Must not
// be: the Company verdict; the Review's constitutive event." This module
// owns only the low-level persistence of that artifact — the Assignment-
// validity / eligibility (recusal-deny) gate lives one layer up, in
// lib/advisor-portal/advisor-decision-support-service.ts, exactly mirroring
// lib/review/review-advisor-proposal-service.ts's own split (that module
// also carries no Assignment-validity check of its own).
//
// NEVER reaches the constitutive path: this file does not import
// concludeReview() or anything from lib/commitment/commit-activation-service.ts
// — structurally cannot conclude a Review or alter Commitment lifecycle.
//
// APPEND-ONLY, MULTIPLE PER REVIEW (migration 080's own header): unlike
// review_advisor_proposal's single-current-upsert model, an Assessment is
// a point-in-time issuance event — no update function exists in this
// module (matching migration 080's own unconditional BEFORE UPDATE OR
// DELETE rejection trigger); a correction is always a new issuance.
//
// AUTHOR ROLE IS STRUCTURALLY SINGULAR: exactly like review_advisor_proposal,
// this object has exactly one legal author — ADVISOR — enforced both here
// and by migration 080's own CHECK constraint. Company may read but never
// write here.

import { getSupabaseServiceClient } from '@/lib/supabase/server';
import { getReview } from '@/lib/review/review-service';

const ASSESSMENT_AUTHOR_ROLE = 'ADVISOR';

export interface ReviewAdvisorAssessment {
  id: string;
  tenantId: string;
  reviewId: string;
  assignmentId: string;
  actorRole: string;
  actorId: string;
  assessmentNarrative: string;
  qualificationStatusAtIssuance: string;
  conflictFlagAtIssuance: boolean;
  issuedAt: string;
}

interface ReviewAdvisorAssessmentDbRow {
  id: string;
  tenant_id: string;
  review_id: string;
  assignment_id: string;
  actor_role: string;
  actor_id: string;
  assessment_narrative: string;
  qualification_status_at_issuance: string;
  conflict_flag_at_issuance: boolean;
  issued_at: string;
}

function toReviewAdvisorAssessment(row: ReviewAdvisorAssessmentDbRow): ReviewAdvisorAssessment {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    reviewId: row.review_id,
    assignmentId: row.assignment_id,
    actorRole: row.actor_role,
    actorId: row.actor_id,
    assessmentNarrative: row.assessment_narrative,
    qualificationStatusAtIssuance: row.qualification_status_at_issuance,
    conflictFlagAtIssuance: row.conflict_flag_at_issuance,
    issuedAt: row.issued_at,
  };
}

// ── issueReviewAdvisorAssessment — the single write path ────────────────────
//
// tenantId, qualificationStatusAtIssuance, and conflictFlagAtIssuance are
// all caller-resolved (never independently re-derived here) — this module
// trusts its one caller (the decision-support layer) exactly the way
// review-advisor-proposal-service.ts already trusts its own caller for
// tenantId.

export interface IssueReviewAdvisorAssessmentParams {
  reviewId: string;
  tenantId: string;
  assignmentId: string;
  actorId: string;
  assessmentNarrative: string;
  qualificationStatusAtIssuance: string;
  conflictFlagAtIssuance: boolean;
}

export async function issueReviewAdvisorAssessment(
  params: IssueReviewAdvisorAssessmentParams,
): Promise<ReviewAdvisorAssessment> {
  if (!params.assessmentNarrative || !params.assessmentNarrative.trim()) {
    throw new Error('[KORA] issueReviewAdvisorAssessment rejected: assessmentNarrative is required.');
  }

  // Re-verified here (not only by migration 080's own trigger) so the
  // rejection reason is clear before any write is attempted — the trigger
  // is the structural backstop, this is the informative first gate —
  // exactly the pattern review-advisor-proposal-service.ts's own
  // upsertReviewAdvisorProposal() already establishes for this sibling
  // object.
  const review = await getReview(params.reviewId, params.tenantId);
  if (!review) {
    throw new Error(`[KORA] issueReviewAdvisorAssessment rejected: review "${params.reviewId}" not found for tenant "${params.tenantId}" (cross-tenant references are never allowed).`);
  }
  if (review.status === 'concluded') {
    throw new Error('[KORA] issueReviewAdvisorAssessment rejected: this Review is concluded — an Assessment can no longer be issued against it (it is now permanent historical material, doc 68 §1.5).');
  }

  const db = getSupabaseServiceClient();

  const { data, error } = await db
    .schema('analytics')
    .from('review_advisor_assessment')
    .insert({
      tenant_id: params.tenantId,
      review_id: params.reviewId,
      assignment_id: params.assignmentId,
      actor_role: ASSESSMENT_AUTHOR_ROLE,
      actor_id: params.actorId,
      assessment_narrative: params.assessmentNarrative.trim(),
      qualification_status_at_issuance: params.qualificationStatusAtIssuance,
      conflict_flag_at_issuance: params.conflictFlagAtIssuance,
    })
    .select()
    .single();

  if (error || !data) {
    throw new Error(`[KORA] issueReviewAdvisorAssessment failed: ${error?.message ?? 'no data returned'}`);
  }

  return toReviewAdvisorAssessment(data as ReviewAdvisorAssessmentDbRow);
}

// ── listReviewAdvisorAssessmentsForReview — Company-scoped read ─────────────

export async function listReviewAdvisorAssessmentsForReview(
  reviewId: string,
  tenantId: string,
): Promise<ReviewAdvisorAssessment[]> {
  const db = getSupabaseServiceClient();

  const { data, error } = await db
    .schema('analytics')
    .from('review_advisor_assessment')
    .select()
    .eq('review_id', reviewId)
    .eq('tenant_id', tenantId)
    .order('issued_at', { ascending: true });

  if (error) {
    throw new Error(`[KORA] listReviewAdvisorAssessmentsForReview failed: ${error.message}`);
  }

  return ((data ?? []) as ReviewAdvisorAssessmentDbRow[]).map(toReviewAdvisorAssessment);
}
