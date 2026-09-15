// lib/evidence-plan/evidence-plan-service.ts
// KORA-WP-021 — Evidence Plan Lineage (Layer B).
//
// Doc 72 Lock 4, verbatim: "a material Commitment has one governing
// Evidence Plan lineage — a primary immutable ex-ante version plus
// zero-or-more immutable later versions/addenda, each dated and scoped,
// never a set of unrelated competing plans." This module persists ONLY the
// `draft` state of the primary version's frozen state machine (doc 67
// §9.4: draft (attached pre-commit) → frozen-at-commit → collecting →
// closed-at-review). No function here can move a primary version out of
// draft — the freeze-at-commit transition belongs to KORA-WP-022 alone
// (this WP's own registry Out of Scope, verbatim), and the underlying CHECK
// constraint (migration 066) makes any other status value physically
// impossible until that future migration relaxes it.
//
// Addenda are immutable from creation (no draft phase) — the append-only
// discipline already established for audit.governance_event/
// gov.workload_event. createEvidencePlanAddendum() requires its target
// evidence_plan to NOT be 'draft' (doc 72 §6's own reasoning: an addendum
// exists only to avoid touching an already-immutable primary; while the
// primary is still draft, edit it directly instead). Because every primary
// is pinned to 'draft' by this WP's own migration, this precondition can
// never be legitimately satisfied yet — the correct consequence of
// applying doc 72 §6 to a system where nothing has been committed, not an
// artificial restriction. The mechanism itself is real and real-DB
// validated by manually relaxing a row's status, exactly as the frozen
// source's own worked example ("three months later") presupposes a real
// Commitment that does not exist yet.
//
// Auth/RLS per this WP's own registry entry, verbatim: "Company/Advisor-
// visible, Company-authoring." This module builds the Company-authoring
// path only — every mutating function requires actorRole === 'COMPANY_ADMIN'
// (same discipline as lib/commitment/commitment-service.ts, KORA-WP-020).
// "Advisor-visible" is real, frozen domain truth (doc 73 §6) whose wiring
// belongs to the same KORA-WP-033 convergence item already tracked for
// Commitment — no Advisor-facing function exists in this module.

import { getSupabaseServiceClient } from '@/lib/supabase/server';
import { recordGovernanceEvent } from '@/lib/audit/governance-event';

const DECISION_OWNER_ROLE = 'COMPANY_ADMIN';

// Typed as a plain string, not a 'draft' literal: this WP's own migration
// CHECK-pins every row it can ever create to 'draft', but hardcoding the
// literal here would silently misreport reality the moment KORA-WP-022
// relaxes that constraint and a real 'frozen-at-commit' row exists —
// toEvidencePlan() below always reflects the actual column value.
export type EvidencePlanStatus = string;

export interface EvidencePlan {
  id: string;
  tenantId: string;
  commitmentId: string;
  status: EvidencePlanStatus;
  evidenceExpectations: string | null;
  criteria: string | null;
  confidenceQualityExpectations: string | null;
  reviewIntention: string | null;
  knownMissingAtDecision: string | null;
  actorRole: string;
  actorId: string;
  createdAt: string;
  updatedAt: string;
}

interface EvidencePlanDbRow {
  id: string;
  tenant_id: string;
  commitment_id: string;
  status: string;
  evidence_expectations: string | null;
  criteria: string | null;
  confidence_quality_expectations: string | null;
  review_intention: string | null;
  known_missing_at_decision: string | null;
  actor_role: string;
  actor_id: string;
  created_at: string;
  updated_at: string;
}

function toEvidencePlan(row: EvidencePlanDbRow): EvidencePlan {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    commitmentId: row.commitment_id,
    status: row.status,
    evidenceExpectations: row.evidence_expectations,
    criteria: row.criteria,
    confidenceQualityExpectations: row.confidence_quality_expectations,
    reviewIntention: row.review_intention,
    knownMissingAtDecision: row.known_missing_at_decision,
    actorRole: row.actor_role,
    actorId: row.actor_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export interface EvidencePlanAddendum {
  id: string;
  tenantId: string;
  evidencePlanId: string;
  extendsAddendumId: string | null;
  effectiveFrom: string;
  scope: string;
  content: string | null;
  actorRole: string;
  actorId: string;
  createdAt: string;
}

interface EvidencePlanAddendumDbRow {
  id: string;
  tenant_id: string;
  evidence_plan_id: string;
  extends_addendum_id: string | null;
  effective_from: string;
  scope: string;
  content: string | null;
  actor_role: string;
  actor_id: string;
  created_at: string;
}

function toAddendum(row: EvidencePlanAddendumDbRow): EvidencePlanAddendum {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    evidencePlanId: row.evidence_plan_id,
    extendsAddendumId: row.extends_addendum_id,
    effectiveFrom: row.effective_from,
    scope: row.scope,
    content: row.content,
    actorRole: row.actor_role,
    actorId: row.actor_id,
    createdAt: row.created_at,
  };
}

function assertDecisionOwner(actorRole: string): void {
  if (actorRole !== DECISION_OWNER_ROLE) {
    throw new Error(
      `[KORA] evidence-plan rejected: only ${DECISION_OWNER_ROLE} may author an Evidence Plan (doc 73 §6 — freezing/finalizing is Decision-Owner-only, and this WP's own scope is Company-authoring only).`,
    );
  }
}

function assertActor(actorRole: string, actorId: string): void {
  if (!actorRole || !actorId) {
    throw new Error('[KORA] evidence-plan rejected: actorRole and actorId are required — this substrate never manufactures actor attribution.');
  }
}

// ── createEvidencePlan — the primary ex-ante version, 1:1 with a Commitment ──
//
// Requires the Commitment to exist, belong to the same tenant, and not
// already have an Evidence Plan (the UNIQUE(commitment_id) constraint is
// the ultimate guard; this check gives a clear rejection reason first).
// No field is required — a draft is filled in progressively, same
// "Unknown/not yet entered" discipline as Commitment's own FT-019 fields.

export interface CreateEvidencePlanParams {
  tenantId: string;
  commitmentId: string;
  actorRole: string;
  actorId: string;
  evidenceExpectations?: string;
  criteria?: string;
  confidenceQualityExpectations?: string;
  reviewIntention?: string;
  knownMissingAtDecision?: string;
}

export async function createEvidencePlan(params: CreateEvidencePlanParams): Promise<EvidencePlan> {
  assertActor(params.actorRole, params.actorId);
  assertDecisionOwner(params.actorRole);

  const db = getSupabaseServiceClient();

  const { data: commitment, error: commitmentError } = await db
    .schema('analytics')
    .from('commitment')
    .select('id, tenant_id')
    .eq('id', params.commitmentId)
    .maybeSingle();

  if (commitmentError || !commitment || (commitment as { tenant_id: string }).tenant_id !== params.tenantId) {
    throw new Error(`[KORA] createEvidencePlan rejected: commitment "${params.commitmentId}" not found for tenant "${params.tenantId}" (cross-tenant references are never allowed).`);
  }

  const { data: existing } = await db
    .schema('analytics')
    .from('evidence_plan')
    .select('id')
    .eq('commitment_id', params.commitmentId)
    .maybeSingle();

  if (existing) {
    throw new Error(`[KORA] createEvidencePlan rejected: commitment "${params.commitmentId}" already has a governing Evidence Plan lineage — a Commitment has exactly one (doc 72 Lock 4).`);
  }

  const { data, error } = await db
    .schema('analytics')
    .from('evidence_plan')
    .insert({
      tenant_id: params.tenantId,
      commitment_id: params.commitmentId,
      evidence_expectations: params.evidenceExpectations ?? null,
      criteria: params.criteria ?? null,
      confidence_quality_expectations: params.confidenceQualityExpectations ?? null,
      review_intention: params.reviewIntention ?? null,
      known_missing_at_decision: params.knownMissingAtDecision ?? null,
      actor_role: params.actorRole,
      actor_id: params.actorId,
    })
    .select()
    .single();

  if (error || !data) {
    throw new Error(`[KORA] createEvidencePlan failed: ${error?.message ?? 'no data returned'}`);
  }

  const plan = toEvidencePlan(data as EvidencePlanDbRow);

  // Release commitment.evidence_plan_id — FT-019's own "Evidence Plan (1:1
  // reference)" field, previously pinned NULL by migration 065.
  const { error: linkError } = await db
    .schema('analytics')
    .from('commitment')
    .update({ evidence_plan_id: plan.id })
    .eq('id', params.commitmentId)
    .eq('tenant_id', params.tenantId);

  if (linkError) {
    throw new Error(`[KORA] createEvidencePlan failed to link commitment.evidence_plan_id: ${linkError.message}`);
  }

  await recordGovernanceEvent({
    sourceModule: 'evidence-plan',
    actorRole: params.actorRole,
    actorId: params.actorId,
    eventType: 'evidence_plan.primary_created',
    objectType: 'evidence_plan',
    objectId: plan.id,
    tenantId: plan.tenantId,
  });

  return plan;
}

// ── updateEvidencePlan — EDIT-DRAFT (doc 73 §6) — draft only ────────────────

export interface UpdateEvidencePlanParams {
  evidencePlanId: string;
  tenantId: string;
  actorRole: string;
  actorId: string;
  evidenceExpectations?: string | null;
  criteria?: string | null;
  confidenceQualityExpectations?: string | null;
  reviewIntention?: string | null;
  knownMissingAtDecision?: string | null;
}

export async function updateEvidencePlan(params: UpdateEvidencePlanParams): Promise<EvidencePlan> {
  assertActor(params.actorRole, params.actorId);
  assertDecisionOwner(params.actorRole);

  const db = getSupabaseServiceClient();

  const existing = await getEvidencePlan(params.evidencePlanId, params.tenantId);
  if (!existing) {
    throw new Error(`[KORA] updateEvidencePlan rejected: evidence plan "${params.evidencePlanId}" not found for tenant "${params.tenantId}".`);
  }

  const patch: Record<string, unknown> = {};
  if (params.evidenceExpectations !== undefined) patch.evidence_expectations = params.evidenceExpectations;
  if (params.criteria !== undefined) patch.criteria = params.criteria;
  if (params.confidenceQualityExpectations !== undefined) patch.confidence_quality_expectations = params.confidenceQualityExpectations;
  if (params.reviewIntention !== undefined) patch.review_intention = params.reviewIntention;
  if (params.knownMissingAtDecision !== undefined) patch.known_missing_at_decision = params.knownMissingAtDecision;

  if (Object.keys(patch).length === 0) {
    return existing;
  }

  const { error } = await db
    .schema('analytics')
    .from('evidence_plan')
    .update(patch)
    .eq('id', params.evidencePlanId)
    .eq('tenant_id', params.tenantId);

  if (error) {
    throw new Error(`[KORA] updateEvidencePlan failed: ${error.message}`);
  }

  await recordGovernanceEvent({
    sourceModule: 'evidence-plan',
    actorRole: params.actorRole,
    actorId: params.actorId,
    eventType: 'evidence_plan.primary_edited',
    objectType: 'evidence_plan',
    objectId: params.evidencePlanId,
    tenantId: params.tenantId,
  });

  const updated = await getEvidencePlan(params.evidencePlanId, params.tenantId);
  if (!updated) {
    throw new Error('[KORA] updateEvidencePlan failed: row disappeared after update.');
  }
  return updated;
}

// ── createEvidencePlanAddendum — a later, immutable-from-creation version ───
//
// Requires the target evidence_plan to NOT be 'draft' (doc 72 §6 — an
// addendum only exists to avoid touching an already-immutable primary).
// This precondition is enforced BOTH here and, independently, by migration
// 066's own DB trigger — in the current system, where every primary is
// pinned to 'draft', this can never legitimately succeed yet. That is the
// correct, literal consequence of the frozen model applied today, not a
// bug: KORA-WP-022 is the only future package that can ever move a primary
// version out of 'draft'.

export interface CreateEvidencePlanAddendumParams {
  evidencePlanId: string;
  tenantId: string;
  actorRole: string;
  actorId: string;
  effectiveFrom: string;
  scope: string;
  content?: string;
  extendsAddendumId?: string;
}

export async function createEvidencePlanAddendum(params: CreateEvidencePlanAddendumParams): Promise<EvidencePlanAddendum> {
  assertActor(params.actorRole, params.actorId);
  assertDecisionOwner(params.actorRole);
  if (!params.scope || !params.scope.trim()) {
    throw new Error('[KORA] createEvidencePlanAddendum rejected: scope is required — an addendum must state its own scope (doc 72 §6).');
  }

  const db = getSupabaseServiceClient();

  const plan = await getEvidencePlan(params.evidencePlanId, params.tenantId);
  if (!plan) {
    throw new Error(`[KORA] createEvidencePlanAddendum rejected: evidence plan "${params.evidencePlanId}" not found for tenant "${params.tenantId}".`);
  }
  if (plan.status === 'draft') {
    throw new Error('[KORA] createEvidencePlanAddendum rejected: an addendum cannot be created while its evidence_plan is still draft — edit the draft directly instead.');
  }

  const { data, error } = await db
    .schema('analytics')
    .from('evidence_plan_addendum')
    .insert({
      tenant_id: params.tenantId,
      evidence_plan_id: params.evidencePlanId,
      extends_addendum_id: params.extendsAddendumId ?? null,
      effective_from: params.effectiveFrom,
      scope: params.scope,
      content: params.content ?? null,
      actor_role: params.actorRole,
      actor_id: params.actorId,
    })
    .select()
    .single();

  if (error || !data) {
    throw new Error(`[KORA] createEvidencePlanAddendum failed: ${error?.message ?? 'no data returned'}`);
  }

  const addendum = toAddendum(data as EvidencePlanAddendumDbRow);

  await recordGovernanceEvent({
    sourceModule: 'evidence-plan',
    actorRole: params.actorRole,
    actorId: params.actorId,
    eventType: 'evidence_plan.addendum_created',
    objectType: 'evidence_plan_addendum',
    objectId: addendum.id,
    tenantId: addendum.tenantId,
  });

  return addendum;
}

// ── read paths ────────────────────────────────────────────────────────────

export async function getEvidencePlan(evidencePlanId: string, tenantId: string): Promise<EvidencePlan | null> {
  const db = getSupabaseServiceClient();

  const { data, error } = await db
    .schema('analytics')
    .from('evidence_plan')
    .select()
    .eq('id', evidencePlanId)
    .eq('tenant_id', tenantId)
    .maybeSingle();

  if (error) {
    throw new Error(`[KORA] getEvidencePlan failed: ${error.message}`);
  }
  if (!data) return null;

  return toEvidencePlan(data as EvidencePlanDbRow);
}

export async function getEvidencePlanForCommitment(commitmentId: string, tenantId: string): Promise<EvidencePlan | null> {
  const db = getSupabaseServiceClient();

  const { data, error } = await db
    .schema('analytics')
    .from('evidence_plan')
    .select()
    .eq('commitment_id', commitmentId)
    .eq('tenant_id', tenantId)
    .maybeSingle();

  if (error) {
    throw new Error(`[KORA] getEvidencePlanForCommitment failed: ${error.message}`);
  }
  if (!data) return null;

  return toEvidencePlan(data as EvidencePlanDbRow);
}

// ── reconstructLineage — the WP-021 Acceptance criterion itself ────────────
//
// "a Review (KORA-WP-024) can reconstruct which Evidence Plan version
// applied at commit time" (this WP's own registry Acceptance, verbatim).
// Returns the primary plus every addendum in the lineage, ordered by
// effective date — historical reconstruction, never retroactive
// redefinition (doc 72 §6).

export interface EvidencePlanLineage {
  primary: EvidencePlan;
  addenda: EvidencePlanAddendum[];
}

export async function reconstructLineage(evidencePlanId: string, tenantId: string): Promise<EvidencePlanLineage | null> {
  const primary = await getEvidencePlan(evidencePlanId, tenantId);
  if (!primary) return null;

  const db = getSupabaseServiceClient();

  const { data, error } = await db
    .schema('analytics')
    .from('evidence_plan_addendum')
    .select()
    .eq('evidence_plan_id', evidencePlanId)
    .eq('tenant_id', tenantId)
    .order('effective_from', { ascending: true });

  if (error) {
    throw new Error(`[KORA] reconstructLineage failed: ${error.message}`);
  }

  return {
    primary,
    addenda: ((data ?? []) as EvidencePlanAddendumDbRow[]).map(toAddendum),
  };
}
