// lib/decision-pack/decision-spine.ts
// KORA-WP-025 — Decision Pack Extension (CORE-012, MODIFY).
//
// Registry 142, verbatim: "existing Decision Pack reflects real
// Commitment/Linkage data... Proposed New: N/A — read-layer extension
// only... Data/Migration Impact: NONE... Acceptance: Decision Pack shows
// real linkage data... Out of Scope: new report types." This module is
// exactly that read-layer extension — a pure composition over five
// already-canonical, already-tested services (KORA-WP-020/021/023/024/
// WP-033 convergence). It creates no new domain truth, no new table, no
// new methodology, and recomputes nothing: every field here is copied
// straight through from an existing getter, never derived or scored.
//
// Hard Dep KORA-WP-023 (lib/decision-linkage/decision-linkage-service.ts)
// supplies the linkage skeleton (ids + statuses only, no content fields);
// this module enriches each linked id with its own object's already-
// canonical content fields via that object's own existing getter — never
// a second, competing read path into the same tables.
//
// DECISION OWNERSHIP (doc 73 §6, preserved unchanged): the Review Event's
// own `verdict` is the only constitutive, Decision-Owner-authored outcome
// — populated here only once a Review has reached status 'concluded'.
// The Advisor Review Proposal is surfaced separately, explicitly labeled
// non-authoritative — this module never merges the two or lets the
// proposal stand in for a missing verdict.
//
// PRIVACY: Commitment / Evidence Plan / Review / Review Event / Advisor
// Review Proposal are all Company-level objects — none references an
// individual worker, PIB, or any worker-identifying field anywhere in
// their schemas (confirmed against each service's own row shape). No
// additional privacy check is introduced here because none is needed:
// this module surfaces exactly the same Company-level fields those
// services already expose to COMPANY_ADMIN elsewhere in the product.
//
// PRIME / DELIVERY-PATH NEUTRALITY: Commitment.opportunityId/programId
// are both still hard-CHECK-pinned NULL in the schema (KORA-WP-019/026
// not yet implemented) — there is no delivery-path field to display yet,
// so none is fabricated here. When one exists, it must be presented
// neutrally, never as a preference signal.

import {
  getDecisionTrace,
} from '@/lib/decision-linkage/decision-linkage-service';
import { listCommitmentDraftsForTenant } from '@/lib/commitment/commitment-service';
import { getEvidencePlan } from '@/lib/evidence-plan/evidence-plan-service';
import { getReview, getReviewEvent, type ReviewVerdict } from '@/lib/review/review-service';
import { getReviewAdvisorProposalForReview } from '@/lib/review/review-advisor-proposal-service';

export interface DecisionSpineEvidencePlan {
  id: string;
  status: string;
  evidenceExpectations: string | null;
  criteria: string | null;
  knownMissingAtDecision: string | null;
}

// Advisor-authored, consultative, NEVER authoritative — see module header.
export interface DecisionSpineAdvisorProposal {
  isAdvisorProposal: true;
  proposalNarrative: string | null;
  proposedVerdict: ReviewVerdict | null;
}

export interface DecisionSpineReview {
  id: string;
  status: string;
  openedAt: string;
  concludedAt: string | null;
  // Constitutive — only ever populated from analytics.review_event once
  // status === 'concluded'. Null means "not yet decided", never a guess.
  finalVerdict: ReviewVerdict | null;
  advisorProposal: DecisionSpineAdvisorProposal | null;
}

export interface DecisionSpineEntry {
  commitmentId: string;
  commitmentStatus: string;
  problemObjective: string;
  proposedChoice: string | null;
  rationale: string | null;
  amount: number | null;
  horizon: string | null;
  ownerRole: string;
  createdAt: string;
  // Count only — never re-derives allocation amounts (BTI/Resource
  // Allocation Ledger own that number; this is presence/scale, not a
  // second financial figure).
  resourceAllocationEntryCount: number;
  mvbManifestPresent: boolean;
  evidencePlan: DecisionSpineEvidencePlan | null;
  review: DecisionSpineReview | null;
}

// ── getDecisionSpineForTenant — the Company-wide "what has been decided,
// on what evidence, and what did the Review conclude" composition. ──────

export async function getDecisionSpineForTenant(tenantId: string): Promise<DecisionSpineEntry[]> {
  const commitments = await listCommitmentDraftsForTenant(tenantId);
  const entries: DecisionSpineEntry[] = [];

  for (const c of commitments) {
    const trace = await getDecisionTrace(c.id, tenantId);

    let evidencePlan: DecisionSpineEvidencePlan | null = null;
    if (c.evidencePlanId) {
      const ep = await getEvidencePlan(c.evidencePlanId, tenantId);
      if (ep) {
        evidencePlan = {
          id: ep.id,
          status: ep.status,
          evidenceExpectations: ep.evidenceExpectations,
          criteria: ep.criteria,
          knownMissingAtDecision: ep.knownMissingAtDecision,
        };
      }
    }

    let review: DecisionSpineReview | null = null;
    if (trace?.reviewId) {
      const rv = await getReview(trace.reviewId, tenantId);
      if (rv) {
        let finalVerdict: ReviewVerdict | null = null;
        if (rv.status === 'concluded') {
          const ev = await getReviewEvent(rv.id, tenantId);
          finalVerdict = ev?.verdict ?? null;
        }

        let advisorProposal: DecisionSpineAdvisorProposal | null = null;
        const prop = await getReviewAdvisorProposalForReview(rv.id, tenantId);
        if (prop) {
          advisorProposal = {
            isAdvisorProposal: true,
            proposalNarrative: prop.proposalNarrative,
            proposedVerdict: prop.proposedVerdict,
          };
        }

        review = {
          id: rv.id,
          status: rv.status,
          openedAt: rv.openedAt,
          concludedAt: rv.concludedAt,
          finalVerdict,
          advisorProposal,
        };
      }
    }

    entries.push({
      commitmentId: c.id,
      commitmentStatus: c.status,
      problemObjective: c.problemObjective,
      proposedChoice: c.proposedChoice,
      rationale: c.rationale,
      amount: c.amount,
      horizon: c.horizon,
      ownerRole: c.ownerRole,
      createdAt: c.createdAt,
      resourceAllocationEntryCount: trace?.resourceAllocationEntryIds.length ?? 0,
      mvbManifestPresent: Boolean(trace?.mvbManifestId),
      evidencePlan,
      review,
    });
  }

  // Newest Commitment first — matches the "what should be considered next" framing.
  return entries.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}
