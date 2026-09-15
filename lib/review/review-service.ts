// lib/review/review-service.ts
// KORA-WP-024 — Review — Thin State + Event.
//
// Closes DECISION-007 — the interpretation/judgment layer of the Decision
// Spine. Doc 67 §8 + doc 68 §1.5/§2: Review is "state + append-only event,"
// never a measurement engine. This module never computes, stores, or
// references KORA Index/IU/Confidence/BTI, and never implements the
// generic KPI/Measure reference (doc 67 §11, doc 66 PFFD-03) — that bridge
// remains explicitly deferred, open for KORA FULL, not owned by this WP.
//
// `open` is triggered directly by `commitment.status = 'committed'`, not by
// a `reviewable` intermediate — see migration 070's own header for why:
// Commitment's frozen field set (migration 067) never released that state,
// and this WP does not own doing so.
//
// Authorization mirrors every other Lane-B primitive in this schema:
// actorRole must be 'COMPANY_ADMIN'. Doc 73 §6 records a real Advisor
// SUPPORT-REVIEW capability (drafting the narrative, proposing a verdict)
// that this module deliberately does not implement — it remains the
// KORA-WP-033 convergence item, now finally due (see the implementation
// report), not repaired here.

import { getSupabaseServiceClient } from '@/lib/supabase/server';

const DECISION_OWNER_ROLE = 'COMPANY_ADMIN';

export const REVIEW_VERDICTS = ['KEEP', 'STOP', 'MODIFY', 'REALLOCATE', 'CREATE', 'INVESTIGATE'] as const;
export type ReviewVerdict = (typeof REVIEW_VERDICTS)[number];

export interface Review {
  id: string;
  tenantId: string;
  commitmentId: string;
  status: string;
  openedAt: string;
  concludedAt: string | null;
  actorRole: string;
  actorId: string;
  createdAt: string;
  updatedAt: string;
}

interface ReviewDbRow {
  id: string;
  tenant_id: string;
  commitment_id: string;
  status: string;
  opened_at: string;
  concluded_at: string | null;
  actor_role: string;
  actor_id: string;
  created_at: string;
  updated_at: string;
}

function toReview(row: ReviewDbRow): Review {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    commitmentId: row.commitment_id,
    status: row.status,
    openedAt: row.opened_at,
    concludedAt: row.concluded_at,
    actorRole: row.actor_role,
    actorId: row.actor_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export interface ReviewEvent {
  id: string;
  tenantId: string;
  reviewId: string;
  indicatedDecision: string | null;
  actualDecision: string;
  rationaleCategory: string | null;
  intervention: string | null;
  effectiveDate: string;
  supersedes: string | null;
  decisionOwner: string;
  verdict: ReviewVerdict;
  actorRole: string;
  actorId: string;
  createdAt: string;
}

interface ReviewEventDbRow {
  id: string;
  tenant_id: string;
  review_id: string;
  indicated_decision: string | null;
  actual_decision: string;
  rationale_category: string | null;
  intervention: string | null;
  effective_date: string;
  supersedes: string | null;
  decision_owner: string;
  verdict: string;
  actor_role: string;
  actor_id: string;
  created_at: string;
}

function toReviewEvent(row: ReviewEventDbRow): ReviewEvent {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    reviewId: row.review_id,
    indicatedDecision: row.indicated_decision,
    actualDecision: row.actual_decision,
    rationaleCategory: row.rationale_category,
    intervention: row.intervention,
    effectiveDate: row.effective_date,
    supersedes: row.supersedes,
    decisionOwner: row.decision_owner,
    verdict: row.verdict as ReviewVerdict,
    actorRole: row.actor_role,
    actorId: row.actor_id,
    createdAt: row.created_at,
  };
}

function assertDecisionOwner(actorRole: string): void {
  if (actorRole !== DECISION_OWNER_ROLE) {
    throw new Error(
      `[KORA] review rejected: only ${DECISION_OWNER_ROLE} may act on a Review (doc 73 §6 — Advisor supports/drafts but concluding is Decision-Owner-only; this WP's own scope is Company-authoring only).`,
    );
  }
}

function assertActor(actorRole: string, actorId: string): void {
  if (!actorRole || !actorId) {
    throw new Error('[KORA] review rejected: actorRole and actorId are required — this substrate never manufactures actor attribution.');
  }
}

// ── openReview — the only way to create a Review, against a committed Commitment ──

export interface OpenReviewParams {
  commitmentId: string;
  tenantId: string;
  actorRole: string;
  actorId: string;
}

export async function openReview(params: OpenReviewParams): Promise<Review> {
  assertActor(params.actorRole, params.actorId);
  assertDecisionOwner(params.actorRole);

  const db = getSupabaseServiceClient();

  const { data: commitment, error: commitmentError } = await db
    .schema('analytics')
    .from('commitment')
    .select('id, tenant_id, status')
    .eq('id', params.commitmentId)
    .maybeSingle();

  if (commitmentError || !commitment || (commitment as { tenant_id: string }).tenant_id !== params.tenantId) {
    throw new Error(`[KORA] openReview rejected: commitment "${params.commitmentId}" not found for tenant "${params.tenantId}" (cross-tenant references are never allowed).`);
  }
  if ((commitment as { status: string }).status !== 'committed') {
    throw new Error(`[KORA] openReview rejected: commitment "${params.commitmentId}" is "${(commitment as { status: string }).status}", not committed — a Review may only be opened against a committed Commitment.`);
  }

  const { data, error } = await db
    .schema('analytics')
    .from('review')
    .insert({
      tenant_id: params.tenantId,
      commitment_id: params.commitmentId,
      actor_role: params.actorRole,
      actor_id: params.actorId,
    })
    .select()
    .single();

  if (error || !data) {
    throw new Error(`[KORA] openReview failed: ${error?.message ?? 'no data returned'}`);
  }

  return toReview(data as ReviewDbRow);
}

// ── markReviewInProgress — a simple, non-constitutive status edit ──────────

export interface MarkReviewInProgressParams {
  reviewId: string;
  tenantId: string;
  actorRole: string;
  actorId: string;
}

export async function markReviewInProgress(params: MarkReviewInProgressParams): Promise<Review> {
  assertActor(params.actorRole, params.actorId);
  assertDecisionOwner(params.actorRole);

  const db = getSupabaseServiceClient();

  const existing = await getReview(params.reviewId, params.tenantId);
  if (!existing) {
    throw new Error(`[KORA] markReviewInProgress rejected: review "${params.reviewId}" not found for tenant "${params.tenantId}".`);
  }
  if (existing.status !== 'open') {
    throw new Error(`[KORA] markReviewInProgress rejected: review "${params.reviewId}" is "${existing.status}", not open.`);
  }

  const { error } = await db
    .schema('analytics')
    .from('review')
    .update({ status: 'in-progress' })
    .eq('id', params.reviewId)
    .eq('tenant_id', params.tenantId);

  if (error) {
    throw new Error(`[KORA] markReviewInProgress failed: ${error.message}`);
  }

  const updated = await getReview(params.reviewId, params.tenantId);
  if (!updated) {
    throw new Error('[KORA] markReviewInProgress failed: row disappeared after update.');
  }
  return updated;
}

// ── concludeReview — the atomic constitutive transaction (RPC) ──────────────
//
// Delegates to analytics.conclude_review() (migration 070) — status →
// concluded, the Decision/Review Event insert, and governance_event
// emission all happen atomically, in one Postgres transaction.

export interface ConcludeReviewParams {
  reviewId: string;
  tenantId: string;
  actorRole: string;
  actorId: string;
  actualDecision: string;
  effectiveDate: string;
  verdict: ReviewVerdict;
  indicatedDecision?: string;
  rationaleCategory?: string;
  intervention?: string;
  supersedes?: string;
}

export interface ConcludeReviewResult {
  reviewEventId: string;
  concludedAt: string;
}

export async function concludeReview(params: ConcludeReviewParams): Promise<ConcludeReviewResult> {
  assertActor(params.actorRole, params.actorId);
  assertDecisionOwner(params.actorRole);
  if (!REVIEW_VERDICTS.includes(params.verdict)) {
    throw new Error(`[KORA] concludeReview rejected: "${params.verdict}" is not a canonical verdict (PT FT-024).`);
  }

  const db = getSupabaseServiceClient();

  const { data, error } = await (
    db.schema('analytics') as unknown as {
      rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>;
    }
  ).rpc('conclude_review', {
    p_review_id: params.reviewId,
    p_tenant_id: params.tenantId,
    p_actor_role: params.actorRole,
    p_actor_id: params.actorId,
    p_actual_decision: params.actualDecision,
    p_effective_date: params.effectiveDate,
    p_verdict: params.verdict,
    p_decision_owner: DECISION_OWNER_ROLE,
    p_indicated_decision: params.indicatedDecision ?? null,
    p_rationale_category: params.rationaleCategory ?? null,
    p_intervention: params.intervention ?? null,
    p_supersedes: params.supersedes ?? null,
  });

  if (error) {
    throw new Error(`[KORA] concludeReview failed: ${error.message}`);
  }
  const row = (Array.isArray(data) ? data[0] : data) as { review_event_id: string; concluded_at: string } | undefined;
  if (!row) {
    throw new Error('[KORA] concludeReview failed: no data returned from conclude_review().');
  }

  return { reviewEventId: row.review_event_id, concludedAt: row.concluded_at };
}

// ── read paths ────────────────────────────────────────────────────────────

export async function getReview(reviewId: string, tenantId: string): Promise<Review | null> {
  const db = getSupabaseServiceClient();

  const { data, error } = await db
    .schema('analytics')
    .from('review')
    .select()
    .eq('id', reviewId)
    .eq('tenant_id', tenantId)
    .maybeSingle();

  if (error) {
    throw new Error(`[KORA] getReview failed: ${error.message}`);
  }
  if (!data) return null;

  return toReview(data as ReviewDbRow);
}

export async function getReviewForCommitment(commitmentId: string, tenantId: string): Promise<Review | null> {
  const db = getSupabaseServiceClient();

  const { data, error } = await db
    .schema('analytics')
    .from('review')
    .select()
    .eq('commitment_id', commitmentId)
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`[KORA] getReviewForCommitment failed: ${error.message}`);
  }
  if (!data) return null;

  return toReview(data as ReviewDbRow);
}

export async function getReviewEvent(reviewId: string, tenantId: string): Promise<ReviewEvent | null> {
  const db = getSupabaseServiceClient();

  const { data, error } = await db
    .schema('analytics')
    .from('review_event')
    .select()
    .eq('review_id', reviewId)
    .eq('tenant_id', tenantId)
    .maybeSingle();

  if (error) {
    throw new Error(`[KORA] getReviewEvent failed: ${error.message}`);
  }
  if (!data) return null;

  return toReviewEvent(data as ReviewEventDbRow);
}
