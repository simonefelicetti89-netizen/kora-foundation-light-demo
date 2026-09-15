// lib/advisor-portal/advisor-decision-support-service.ts
// KORA-WP-033 CONVERGENCE — Advisor Decision-Spine Support (Commitment /
// Evidence Plan Lineage / Review).
//
// WP-033's own original implementation report disclosed, honestly and at
// build time, that only the Action-Matrix authorization *readiness*
// (lib/advisor-portal/advisor-action-matrix.ts) could be built then —
// Commitment (KORA-WP-020), Evidence Plan Lineage (KORA-WP-021) and Review
// (KORA-WP-024) did not exist yet. They now do. This module is the deferred
// convergence: the thin, Assignment-scoped Advisor layer over those three
// already-canonical services — the exact "WP-034 over WP-007" shape already
// established in this codebase (lib/advisor-portal/advisor-case-service.ts
// over lib/operations/operational-case-service.ts) — never a second source
// of truth for any of the three objects.
//
// Doc 73 §6, verbatim, the rule this module implements structurally:
//   Commitment            — Advisor: VIEW/DRAFT/EDIT-DRAFT/PROPOSE, may mark
//                            "ready for decision" (soft, non-authoritative).
//                            NEVER the `committed` transition.
//   Evidence Plan Lineage — Advisor: drafting the primary version or a later
//                            addendum. NEVER freezing/finalizing (frozen
//                            automatically alongside the Commitment's own
//                            commit — never an independent Advisor act).
//   Review                — Advisor: SUPPORT-REVIEW (drafting the
//                            expected-vs-observed narrative, proposing a
//                            verdict recommendation). NEVER concluding.
//
// AUTHORIZATION SHAPE (two independent, disclosed layers, matching
// operational-case-service.ts's own defense-in-depth precedent):
//   1. THIS module verifies — for every function, before any downstream
//      call — that assignmentId genuinely belongs to callerAdvisorId AND
//      that evaluateAdvisorAssignmentValidity() returns valid:true (the
//      FULL validity check — identity/qualification/assignment-active/
//      prerequisite/no-conflict — a materially stricter bar than WP-034's
//      own "status === active" check, deliberately chosen because
//      Commitment/Evidence/Review are the core governed Decision Spine, not
//      a generic Case). The resulting companyId becomes the ONLY tenantId
//      ever passed downstream — never a caller-supplied one.
//   2. lib/commitment/commitment-service.ts and
//      lib/evidence-plan/evidence-plan-service.ts had their own
//      actorRole-gate widened (COMPANY_ADMIN-only → COMPANY_ADMIN or
//      ADVISOR) for their non-constitutive functions ONLY — see each
//      file's own updated header/comment. lib/review/review-service.ts was
//      widened identically for openReview/markReviewInProgress ONLY;
//      concludeReview keeps its original, untouched, COMPANY_ADMIN-only
//      check (assertDecisionOwner) — this module never calls it, and never
//      will. lib/commitment/commit-activation-service.ts's
//      commit_commitment() RPC wrapper is not imported here at all — no
//      code path in this file can reach it, directly or indirectly.
//
// NOT IMPLEMENTED — DESIGN DECISION REQUIRED (this convergence's own single
// open gap, per the Founder's explicit STOP-before-inventing-schema
// instruction): an Advisor's SUPPORT-REVIEW narrative/verdict
// RECOMMENDATION has no canonical storage shape anywhere in the frozen
// sources (doc 73 §6 describes the product capability, not a data model;
// doc 67 §8 / doc 68 §1.5/§2's own Review Event shape is exclusively the
// FINAL, Decision-Owner-authored event — KORA-WP-024's own schema, correctly,
// has no field for a provisional, non-final proposal). Inventing that shape
// here would mean guessing, unresolved, at: whether it is Company-canonical
// or Advisor-private content; whether it survives Assignment termination;
// whether Company Admin can edit/accept/reject it; whether it lives on
// `review` itself, a new table, or elsewhere. This module deliberately stops
// short of that one piece — every function it DOES export is independently
// complete and coherent (open/progress a Review, draft/edit a Commitment or
// Evidence Plan) — never a half-defined public API for the unresolved part.

import { getSupabaseServiceClient } from '@/lib/supabase/server';
import { evaluateAdvisorAssignmentValidity } from '@/lib/advisor-assignment/advisor-assignment-service';
import {
  createCommitmentDraft, updateCommitmentDraft, markCommitmentReadyForDecision,
  linkResourceAllocationEntry, unlinkResourceAllocationEntry, listLinkedResourceAllocationEntryIds,
  getCommitmentDraft, listCommitmentDraftsForTenant,
  type Commitment, type CreateCommitmentDraftParams, type UpdateCommitmentDraftParams,
} from '@/lib/commitment/commitment-service';
import {
  createEvidencePlan, updateEvidencePlan, createEvidencePlanAddendum,
  getEvidencePlan, getEvidencePlanForCommitment,
  type EvidencePlan, type EvidencePlanAddendum,
  type CreateEvidencePlanParams, type UpdateEvidencePlanParams, type CreateEvidencePlanAddendumParams,
} from '@/lib/evidence-plan/evidence-plan-service';
import {
  openReview, markReviewInProgress, getReview, getReviewForCommitment,
  type Review,
} from '@/lib/review/review-service';
import { getDecisionTrace, type DecisionTrace } from '@/lib/decision-linkage/decision-linkage-service';

const ADVISOR_ACTOR_ROLE = 'ADVISOR';

// ── the single shared gate every function below calls first ────────────────
// Resolves and returns the Company (tenantId) this Assignment genuinely,
// currently, validly ties this specific Advisor to — or throws. No function
// in this module accepts a tenantId/companyId parameter from the caller;
// it is always this resolved value.

async function assertValidAdvisorAssignmentAndGetCompanyId(
  assignmentId: string,
  callerAdvisorId: string,
): Promise<string> {
  const db = getSupabaseServiceClient();

  const { data: assignment, error } = await db
    .schema('advisor')
    .from('advisor_assignment')
    .select('id, advisor_id, company_id, status')
    .eq('id', assignmentId)
    .maybeSingle();

  if (error) {
    throw new Error(`[KORA] advisor decision-support operation failed: ${error.message}`);
  }
  if (!assignment || assignment.advisor_id !== callerAdvisorId) {
    throw new Error('[KORA] advisor decision-support operation rejected: caller is not the Advisor party to this Assignment.');
  }

  // The full validity check (doc 76 §15), not merely "status === active" —
  // deliberately the stricter bar this file's own header discloses:
  // Commitment/Evidence Plan/Review are the core governed Decision Spine.
  const validity = await evaluateAdvisorAssignmentValidity(assignmentId);
  if (!validity.valid) {
    throw new Error(`[KORA] advisor decision-support operation rejected: Assignment is not currently valid (${validity.reasons.join(', ')}).`);
  }

  return assignment.company_id as string;
}

// ═══════════════════════════════════════════════════════════════════════════
// COMMITMENT — VIEW / DRAFT / EDIT-DRAFT / "ready for decision" (doc 73 §6)
// ═══════════════════════════════════════════════════════════════════════════

export async function getCommitmentForAdvisor(
  assignmentId: string, callerAdvisorId: string, commitmentId: string,
): Promise<Commitment | null> {
  const companyId = await assertValidAdvisorAssignmentAndGetCompanyId(assignmentId, callerAdvisorId);
  return getCommitmentDraft(commitmentId, companyId);
}

export async function listCommitmentsForAdvisor(
  assignmentId: string, callerAdvisorId: string,
): Promise<Commitment[]> {
  const companyId = await assertValidAdvisorAssignmentAndGetCompanyId(assignmentId, callerAdvisorId);
  return listCommitmentDraftsForTenant(companyId);
}

export type DraftCommitmentAsAdvisorParams =
  Omit<CreateCommitmentDraftParams, 'tenantId' | 'actorRole' | 'actorId'> & {
    assignmentId: string;
    callerAdvisorId: string;
  };

export async function draftCommitmentAsAdvisor(params: DraftCommitmentAsAdvisorParams): Promise<Commitment> {
  const companyId = await assertValidAdvisorAssignmentAndGetCompanyId(params.assignmentId, params.callerAdvisorId);
  const { assignmentId: _a, callerAdvisorId, ...rest } = params;
  return createCommitmentDraft({ ...rest, tenantId: companyId, actorRole: ADVISOR_ACTOR_ROLE, actorId: callerAdvisorId });
}

export type EditCommitmentDraftAsAdvisorParams =
  Omit<UpdateCommitmentDraftParams, 'tenantId' | 'actorRole' | 'actorId'> & {
    assignmentId: string;
    callerAdvisorId: string;
  };

export async function editCommitmentDraftAsAdvisor(params: EditCommitmentDraftAsAdvisorParams): Promise<Commitment> {
  const companyId = await assertValidAdvisorAssignmentAndGetCompanyId(params.assignmentId, params.callerAdvisorId);
  const { assignmentId: _a, callerAdvisorId, ...rest } = params;
  return updateCommitmentDraft({ ...rest, tenantId: companyId, actorRole: ADVISOR_ACTOR_ROLE, actorId: callerAdvisorId });
}

// "a soft status, not authoritative" (doc 73 §6) — Advisor toggling this
// never touches `status`, never gates or triggers commit_commitment().
export async function markCommitmentReadyForDecisionAsAdvisor(
  assignmentId: string, callerAdvisorId: string, commitmentId: string, ready: boolean,
): Promise<Commitment> {
  const companyId = await assertValidAdvisorAssignmentAndGetCompanyId(assignmentId, callerAdvisorId);
  return markCommitmentReadyForDecision({
    commitmentId, tenantId: companyId, actorRole: ADVISOR_ACTOR_ROLE, actorId: callerAdvisorId, ready,
  });
}

// "full drafting support incl. options/rationale" (doc 73 §6) extends to the
// Resource Allocation reference — purely informational linking, same as the
// Company-Admin path; never draws against the ledger (KORA-WP-022 alone
// does that, inside commit_commitment()).
export async function linkResourceAllocationEntryAsAdvisor(
  assignmentId: string, callerAdvisorId: string, commitmentId: string, resourceAllocationEntryId: string,
): Promise<void> {
  const companyId = await assertValidAdvisorAssignmentAndGetCompanyId(assignmentId, callerAdvisorId);
  return linkResourceAllocationEntry({
    commitmentId, tenantId: companyId, resourceAllocationEntryId, actorRole: ADVISOR_ACTOR_ROLE, actorId: callerAdvisorId,
  });
}

export async function unlinkResourceAllocationEntryAsAdvisor(
  assignmentId: string, callerAdvisorId: string, commitmentId: string, resourceAllocationEntryId: string,
): Promise<void> {
  const companyId = await assertValidAdvisorAssignmentAndGetCompanyId(assignmentId, callerAdvisorId);
  return unlinkResourceAllocationEntry({
    commitmentId, tenantId: companyId, resourceAllocationEntryId, actorRole: ADVISOR_ACTOR_ROLE, actorId: callerAdvisorId,
  });
}

export async function listLinkedResourceAllocationEntryIdsForAdvisor(
  assignmentId: string, callerAdvisorId: string, commitmentId: string,
): Promise<string[]> {
  const companyId = await assertValidAdvisorAssignmentAndGetCompanyId(assignmentId, callerAdvisorId);
  return listLinkedResourceAllocationEntryIds(commitmentId, companyId);
}

// ═══════════════════════════════════════════════════════════════════════════
// EVIDENCE PLAN LINEAGE — VIEW / DRAFT primary / DRAFT addendum (doc 73 §6)
// ═══════════════════════════════════════════════════════════════════════════

export async function getEvidencePlanForAdvisor(
  assignmentId: string, callerAdvisorId: string, evidencePlanId: string,
): Promise<EvidencePlan | null> {
  const companyId = await assertValidAdvisorAssignmentAndGetCompanyId(assignmentId, callerAdvisorId);
  return getEvidencePlan(evidencePlanId, companyId);
}

export async function getEvidencePlanForCommitmentAsAdvisor(
  assignmentId: string, callerAdvisorId: string, commitmentId: string,
): Promise<EvidencePlan | null> {
  const companyId = await assertValidAdvisorAssignmentAndGetCompanyId(assignmentId, callerAdvisorId);
  return getEvidencePlanForCommitment(commitmentId, companyId);
}

export type DraftEvidencePlanAsAdvisorParams =
  Omit<CreateEvidencePlanParams, 'tenantId' | 'actorRole' | 'actorId'> & {
    assignmentId: string;
    callerAdvisorId: string;
  };

export async function draftEvidencePlanAsAdvisor(params: DraftEvidencePlanAsAdvisorParams): Promise<EvidencePlan> {
  const companyId = await assertValidAdvisorAssignmentAndGetCompanyId(params.assignmentId, params.callerAdvisorId);
  const { assignmentId: _a, callerAdvisorId, ...rest } = params;
  return createEvidencePlan({ ...rest, tenantId: companyId, actorRole: ADVISOR_ACTOR_ROLE, actorId: callerAdvisorId });
}

export type EditEvidencePlanDraftAsAdvisorParams =
  Omit<UpdateEvidencePlanParams, 'tenantId' | 'actorRole' | 'actorId'> & {
    assignmentId: string;
    callerAdvisorId: string;
  };

export async function editEvidencePlanDraftAsAdvisor(params: EditEvidencePlanDraftAsAdvisorParams): Promise<EvidencePlan> {
  const companyId = await assertValidAdvisorAssignmentAndGetCompanyId(params.assignmentId, params.callerAdvisorId);
  const { assignmentId: _a, callerAdvisorId, ...rest } = params;
  return updateEvidencePlan({ ...rest, tenantId: companyId, actorRole: ADVISOR_ACTOR_ROLE, actorId: callerAdvisorId });
}

export type CreateEvidencePlanAddendumAsAdvisorParams =
  Omit<CreateEvidencePlanAddendumParams, 'tenantId' | 'actorRole' | 'actorId'> & {
    assignmentId: string;
    callerAdvisorId: string;
  };

export async function createEvidencePlanAddendumAsAdvisor(
  params: CreateEvidencePlanAddendumAsAdvisorParams,
): Promise<EvidencePlanAddendum> {
  const companyId = await assertValidAdvisorAssignmentAndGetCompanyId(params.assignmentId, params.callerAdvisorId);
  const { assignmentId: _a, callerAdvisorId, ...rest } = params;
  return createEvidencePlanAddendum({ ...rest, tenantId: companyId, actorRole: ADVISOR_ACTOR_ROLE, actorId: callerAdvisorId });
}

// ═══════════════════════════════════════════════════════════════════════════
// REVIEW — VIEW / open / move to in-progress (doc 73 §6 SUPPORT-REVIEW
// scaffolding only — see this file's own header for what is NOT included)
// ═══════════════════════════════════════════════════════════════════════════
//
// Classified as Advisor-eligible support, not constitutive: neither
// function records any interpretation, verdict, or decision content — they
// only create/advance the thin state scaffold a SUPPORT-REVIEW narrative
// would eventually be drafted against (symmetric with Case creation already
// being Advisor-eligible, KORA-WP-034). Doc 73 §6's own Review row names
// exactly one Advisor capability (SUPPORT-REVIEW) and exactly one denial
// (concluding/recording the event) without separately enumerating
// open/in-progress either way — this is a reasoned reading of an
// underspecified point, not a verbatim citation, and is disclosed as such
// in the implementation report. concludeReview is never called from this
// module, directly or indirectly.

export async function getReviewForAdvisor(
  assignmentId: string, callerAdvisorId: string, reviewId: string,
): Promise<Review | null> {
  const companyId = await assertValidAdvisorAssignmentAndGetCompanyId(assignmentId, callerAdvisorId);
  return getReview(reviewId, companyId);
}

export async function getReviewForCommitmentAsAdvisor(
  assignmentId: string, callerAdvisorId: string, commitmentId: string,
): Promise<Review | null> {
  const companyId = await assertValidAdvisorAssignmentAndGetCompanyId(assignmentId, callerAdvisorId);
  return getReviewForCommitment(commitmentId, companyId);
}

export async function openReviewAsAdvisor(
  assignmentId: string, callerAdvisorId: string, commitmentId: string,
): Promise<Review> {
  const companyId = await assertValidAdvisorAssignmentAndGetCompanyId(assignmentId, callerAdvisorId);
  return openReview({ commitmentId, tenantId: companyId, actorRole: ADVISOR_ACTOR_ROLE, actorId: callerAdvisorId });
}

export async function markReviewInProgressAsAdvisor(
  assignmentId: string, callerAdvisorId: string, reviewId: string,
): Promise<Review> {
  const companyId = await assertValidAdvisorAssignmentAndGetCompanyId(assignmentId, callerAdvisorId);
  return markReviewInProgress({ reviewId, tenantId: companyId, actorRole: ADVISOR_ACTOR_ROLE, actorId: callerAdvisorId });
}

// ═══════════════════════════════════════════════════════════════════════════
// CORE DECISION LINKAGE — read-only traceability (KORA-WP-023, doc 68 §8)
// ═══════════════════════════════════════════════════════════════════════════

export async function getDecisionTraceForAdvisor(
  assignmentId: string, callerAdvisorId: string, commitmentId: string,
): Promise<DecisionTrace | null> {
  const companyId = await assertValidAdvisorAssignmentAndGetCompanyId(assignmentId, callerAdvisorId);
  return getDecisionTrace(commitmentId, companyId);
}
