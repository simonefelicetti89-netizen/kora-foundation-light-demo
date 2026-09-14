// lib/commitment/commitment-service.ts
// KORA-WP-020 — Commitment Draft / Governance Substrate (Layer A).
//
// Commitment is DD-3's single canonical governance object (doc 67 §3): "the
// ex-ante, durable governance record of a real decision on people-investment
// before resources are definitively engaged." This module persists ONLY the
// `draft` state of the frozen state machine (doc 67 §9.1):
//
//   draft ──► committed ──► active ──► reviewable ──► reviewed ──┬──► closed
//                                                                 └──► reactivated
//
// The `committed` transition — and everything after it — belongs to
// KORA-WP-022 and does not exist here, by construction: no function in this
// module can move a row out of `draft` (the underlying CHECK constraint,
// migration 065, makes any other status value physically impossible until a
// future migration relaxes it).
//
// Auth/RLS per this WP's own registry entry, verbatim: "Company-scoped,
// Decision-Owner-authoring only." Every mutating function below requires
// actorRole === 'COMPANY_ADMIN'. doc 73 §6 records a frozen Advisor
// DRAFT/EDIT-DRAFT capability that this WP deliberately does not wire in —
// a future WP's job, following the WP-007→WP-034 "thin Advisor layer over
// the core domain service" pattern already established in this codebase.

import { getSupabaseServiceClient } from '@/lib/supabase/server';
import { recordGovernanceEvent } from '@/lib/audit/governance-event';

const DECISION_OWNER_ROLE = 'COMPANY_ADMIN';

export interface Commitment {
  id: string;
  tenantId: string;
  status: 'draft';
  readyForDecision: boolean;
  problemObjective: string;
  population: string | null;
  optionsConsidered: string[];
  proposedChoice: string | null;
  rationale: string | null;
  evidenceAvailableMissing: string | null;
  expectedOutcome: string | null;
  capacityDeliveryContext: string | null;
  amount: number | null;
  horizon: string | null;
  reviewDate: string | null;
  ownerRole: string;
  evidencePlanId: null;
  opportunityId: null;
  programId: null;
  actorRole: string;
  actorId: string;
  createdAt: string;
  updatedAt: string;
}

interface CommitmentDbRow {
  id: string;
  tenant_id: string;
  status: string;
  ready_for_decision: boolean;
  problem_objective: string;
  population: string | null;
  options_considered: string[];
  proposed_choice: string | null;
  rationale: string | null;
  evidence_available_missing: string | null;
  expected_outcome: string | null;
  capacity_delivery_context: string | null;
  amount: number | null;
  horizon: string | null;
  review_date: string | null;
  owner_role: string;
  evidence_plan_id: string | null;
  opportunity_id: string | null;
  program_id: string | null;
  actor_role: string;
  actor_id: string;
  created_at: string;
  updated_at: string;
}

function toCommitment(row: CommitmentDbRow): Commitment {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    status: 'draft',
    readyForDecision: row.ready_for_decision,
    problemObjective: row.problem_objective,
    population: row.population,
    optionsConsidered: row.options_considered ?? [],
    proposedChoice: row.proposed_choice,
    rationale: row.rationale,
    evidenceAvailableMissing: row.evidence_available_missing,
    expectedOutcome: row.expected_outcome,
    capacityDeliveryContext: row.capacity_delivery_context,
    amount: row.amount === null ? null : Number(row.amount),
    horizon: row.horizon,
    reviewDate: row.review_date,
    ownerRole: row.owner_role,
    evidencePlanId: null,
    opportunityId: null,
    programId: null,
    actorRole: row.actor_role,
    actorId: row.actor_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function assertDecisionOwner(actorRole: string): void {
  if (actorRole !== DECISION_OWNER_ROLE) {
    throw new Error(
      `[KORA] commitment rejected: only ${DECISION_OWNER_ROLE} may author a Commitment draft (doc 73 §6 — "the committed transition itself — NO, NEVER" for any other role; this WP's own scope is Company-authoring only).`,
    );
  }
}

function assertActor(actorRole: string, actorId: string): void {
  if (!actorRole || !actorId) {
    throw new Error('[KORA] commitment rejected: actorRole and actorId are required — this substrate never manufactures actor attribution.');
  }
}

// ── createCommitmentDraft — the ONLY way to create a row ─────────────────────
//
// Only `problemObjective` is required — a draft is filled in progressively;
// every other FT-019 field is nullable ("Unknown/not yet entered" is a real
// state, mirroring the observed_investment_fact precedent, migration 053).

export interface CreateCommitmentDraftParams {
  tenantId: string;
  actorRole: string;
  actorId: string;
  problemObjective: string;
  population?: string;
  optionsConsidered?: string[];
  proposedChoice?: string;
  rationale?: string;
  evidenceAvailableMissing?: string;
  expectedOutcome?: string;
  capacityDeliveryContext?: string;
  amount?: number;
  horizon?: string;
  reviewDate?: string;
}

export async function createCommitmentDraft(params: CreateCommitmentDraftParams): Promise<Commitment> {
  assertActor(params.actorRole, params.actorId);
  assertDecisionOwner(params.actorRole);
  if (!params.problemObjective || !params.problemObjective.trim()) {
    throw new Error('[KORA] createCommitmentDraft rejected: problemObjective is required — a Commitment must always be describable.');
  }

  const db = getSupabaseServiceClient();

  const { data, error } = await db
    .schema('analytics')
    .from('commitment')
    .insert({
      tenant_id: params.tenantId,
      problem_objective: params.problemObjective,
      population: params.population ?? null,
      options_considered: params.optionsConsidered ?? [],
      proposed_choice: params.proposedChoice ?? null,
      rationale: params.rationale ?? null,
      evidence_available_missing: params.evidenceAvailableMissing ?? null,
      expected_outcome: params.expectedOutcome ?? null,
      capacity_delivery_context: params.capacityDeliveryContext ?? null,
      amount: params.amount ?? null,
      horizon: params.horizon ?? null,
      review_date: params.reviewDate ?? null,
      owner_role: DECISION_OWNER_ROLE,
      actor_role: params.actorRole,
      actor_id: params.actorId,
    })
    .select()
    .single();

  if (error || !data) {
    throw new Error(`[KORA] createCommitmentDraft failed: ${error?.message ?? 'no data returned'}`);
  }

  const commitment = toCommitment(data as CommitmentDbRow);

  await recordGovernanceEvent({
    sourceModule: 'commitment',
    actorRole: params.actorRole,
    actorId: params.actorId,
    eventType: 'commitment.draft_created',
    objectType: 'commitment',
    objectId: commitment.id,
    tenantId: commitment.tenantId,
  });

  return commitment;
}

// ── updateCommitmentDraft — EDIT-DRAFT (doc 73 §6) — draft only ─────────────
//
// Every field is independently optional to update; omitted fields are left
// unchanged. There is no code path that can set `status` to anything but
// 'draft' — the column is not even exposed as an updatable parameter here,
// and the DB CHECK constraint would reject it regardless.

export interface UpdateCommitmentDraftParams {
  commitmentId: string;
  tenantId: string;
  actorRole: string;
  actorId: string;
  problemObjective?: string;
  population?: string | null;
  optionsConsidered?: string[];
  proposedChoice?: string | null;
  rationale?: string | null;
  evidenceAvailableMissing?: string | null;
  expectedOutcome?: string | null;
  capacityDeliveryContext?: string | null;
  amount?: number | null;
  horizon?: string | null;
  reviewDate?: string | null;
}

export async function updateCommitmentDraft(params: UpdateCommitmentDraftParams): Promise<Commitment> {
  assertActor(params.actorRole, params.actorId);
  assertDecisionOwner(params.actorRole);

  const db = getSupabaseServiceClient();

  const existing = await getCommitmentDraft(params.commitmentId, params.tenantId);
  if (!existing) {
    throw new Error(`[KORA] updateCommitmentDraft rejected: commitment "${params.commitmentId}" not found for tenant "${params.tenantId}".`);
  }

  const patch: Record<string, unknown> = {};
  if (params.problemObjective !== undefined) {
    if (!params.problemObjective.trim()) {
      throw new Error('[KORA] updateCommitmentDraft rejected: problemObjective cannot be cleared to empty.');
    }
    patch.problem_objective = params.problemObjective;
  }
  if (params.population !== undefined) patch.population = params.population;
  if (params.optionsConsidered !== undefined) patch.options_considered = params.optionsConsidered;
  if (params.proposedChoice !== undefined) patch.proposed_choice = params.proposedChoice;
  if (params.rationale !== undefined) patch.rationale = params.rationale;
  if (params.evidenceAvailableMissing !== undefined) patch.evidence_available_missing = params.evidenceAvailableMissing;
  if (params.expectedOutcome !== undefined) patch.expected_outcome = params.expectedOutcome;
  if (params.capacityDeliveryContext !== undefined) patch.capacity_delivery_context = params.capacityDeliveryContext;
  if (params.amount !== undefined) patch.amount = params.amount;
  if (params.horizon !== undefined) patch.horizon = params.horizon;
  if (params.reviewDate !== undefined) patch.review_date = params.reviewDate;

  if (Object.keys(patch).length === 0) {
    return existing;
  }

  const { error } = await db
    .schema('analytics')
    .from('commitment')
    .update(patch)
    .eq('id', params.commitmentId)
    .eq('tenant_id', params.tenantId);

  if (error) {
    throw new Error(`[KORA] updateCommitmentDraft failed: ${error.message}`);
  }

  await recordGovernanceEvent({
    sourceModule: 'commitment',
    actorRole: params.actorRole,
    actorId: params.actorId,
    eventType: 'commitment.draft_edited',
    objectType: 'commitment',
    objectId: params.commitmentId,
    tenantId: params.tenantId,
  });

  const updated = await getCommitmentDraft(params.commitmentId, params.tenantId);
  if (!updated) {
    throw new Error('[KORA] updateCommitmentDraft failed: row disappeared after update.');
  }
  return updated;
}

// ── markCommitmentReadyForDecision — the soft flag (doc 73 §6) ──────────────
//
// "may mark a draft 'ready for decision' (a soft status, not authoritative)"
// — this function ONLY toggles that boolean. It never transitions `status`,
// never triggers or gates KORA-WP-022's own `committed` transition.

export interface MarkReadyForDecisionParams {
  commitmentId: string;
  tenantId: string;
  actorRole: string;
  actorId: string;
  ready: boolean;
}

export async function markCommitmentReadyForDecision(params: MarkReadyForDecisionParams): Promise<Commitment> {
  assertActor(params.actorRole, params.actorId);
  assertDecisionOwner(params.actorRole);

  const db = getSupabaseServiceClient();

  const { error } = await db
    .schema('analytics')
    .from('commitment')
    .update({ ready_for_decision: params.ready })
    .eq('id', params.commitmentId)
    .eq('tenant_id', params.tenantId);

  if (error) {
    throw new Error(`[KORA] markCommitmentReadyForDecision failed: ${error.message}`);
  }

  await recordGovernanceEvent({
    sourceModule: 'commitment',
    actorRole: params.actorRole,
    actorId: params.actorId,
    eventType: 'commitment.ready_for_decision_marked',
    objectType: 'commitment',
    objectId: params.commitmentId,
    tenantId: params.tenantId,
  });

  const updated = await getCommitmentDraft(params.commitmentId, params.tenantId);
  if (!updated) {
    throw new Error('[KORA] markCommitmentReadyForDecision failed: row disappeared after update.');
  }
  return updated;
}

// ── linkResourceAllocationEntry / unlinkResourceAllocationEntry ─────────────
//
// The real "amount & horizon references Resource Allocation entries"
// relationship (doc 67 §6). PURELY INFORMATIONAL — never calls allocate/
// commit/spend, never mutates resource_allocation.remaining_amount. The
// actual draw against the ledger belongs to KORA-WP-022's own commit
// transaction.

export interface LinkResourceAllocationEntryParams {
  commitmentId: string;
  tenantId: string;
  resourceAllocationEntryId: string;
  actorRole: string;
  actorId: string;
}

export async function linkResourceAllocationEntry(params: LinkResourceAllocationEntryParams): Promise<void> {
  assertActor(params.actorRole, params.actorId);
  assertDecisionOwner(params.actorRole);

  const db = getSupabaseServiceClient();

  const commitment = await getCommitmentDraft(params.commitmentId, params.tenantId);
  if (!commitment) {
    throw new Error(`[KORA] linkResourceAllocationEntry rejected: commitment "${params.commitmentId}" not found for tenant "${params.tenantId}".`);
  }

  const { data: entry, error: entryError } = await db
    .schema('analytics')
    .from('resource_allocation')
    .select('id, tenant_id')
    .eq('id', params.resourceAllocationEntryId)
    .single();

  if (entryError || !entry || (entry as { tenant_id: string }).tenant_id !== params.tenantId) {
    throw new Error(
      `[KORA] linkResourceAllocationEntry rejected: resource_allocation entry "${params.resourceAllocationEntryId}" not found for tenant "${params.tenantId}" (cross-tenant references are never allowed).`,
    );
  }

  const { error } = await db
    .schema('analytics')
    .from('commitment_resource_reference')
    .insert({
      tenant_id: params.tenantId,
      commitment_id: params.commitmentId,
      resource_allocation_entry_id: params.resourceAllocationEntryId,
      actor_role: params.actorRole,
      actor_id: params.actorId,
    });

  if (error) {
    throw new Error(`[KORA] linkResourceAllocationEntry failed: ${error.message}`);
  }

  await recordGovernanceEvent({
    sourceModule: 'commitment',
    actorRole: params.actorRole,
    actorId: params.actorId,
    eventType: 'commitment.resource_allocation_referenced',
    objectType: 'commitment',
    objectId: params.commitmentId,
    tenantId: params.tenantId,
  });
}

export interface UnlinkResourceAllocationEntryParams {
  commitmentId: string;
  tenantId: string;
  resourceAllocationEntryId: string;
  actorRole: string;
  actorId: string;
}

export async function unlinkResourceAllocationEntry(params: UnlinkResourceAllocationEntryParams): Promise<void> {
  assertActor(params.actorRole, params.actorId);
  assertDecisionOwner(params.actorRole);

  const db = getSupabaseServiceClient();

  const { error } = await db
    .schema('analytics')
    .from('commitment_resource_reference')
    .delete()
    .eq('commitment_id', params.commitmentId)
    .eq('resource_allocation_entry_id', params.resourceAllocationEntryId)
    .eq('tenant_id', params.tenantId);

  if (error) {
    throw new Error(`[KORA] unlinkResourceAllocationEntry failed: ${error.message}`);
  }

  await recordGovernanceEvent({
    sourceModule: 'commitment',
    actorRole: params.actorRole,
    actorId: params.actorId,
    eventType: 'commitment.resource_allocation_unreferenced',
    objectType: 'commitment',
    objectId: params.commitmentId,
    tenantId: params.tenantId,
  });
}

export async function listLinkedResourceAllocationEntryIds(commitmentId: string, tenantId: string): Promise<string[]> {
  const db = getSupabaseServiceClient();

  const { data, error } = await db
    .schema('analytics')
    .from('commitment_resource_reference')
    .select('resource_allocation_entry_id')
    .eq('commitment_id', commitmentId)
    .eq('tenant_id', tenantId);

  if (error) {
    throw new Error(`[KORA] listLinkedResourceAllocationEntryIds failed: ${error.message}`);
  }

  return ((data ?? []) as Array<{ resource_allocation_entry_id: string }>).map((r) => r.resource_allocation_entry_id);
}

// ── read paths ────────────────────────────────────────────────────────────

export async function getCommitmentDraft(commitmentId: string, tenantId: string): Promise<Commitment | null> {
  const db = getSupabaseServiceClient();

  const { data, error } = await db
    .schema('analytics')
    .from('commitment')
    .select()
    .eq('id', commitmentId)
    .eq('tenant_id', tenantId)
    .maybeSingle();

  if (error) {
    throw new Error(`[KORA] getCommitmentDraft failed: ${error.message}`);
  }
  if (!data) return null;

  return toCommitment(data as CommitmentDbRow);
}

export async function listCommitmentDraftsForTenant(tenantId: string): Promise<Commitment[]> {
  const db = getSupabaseServiceClient();

  const { data, error } = await db
    .schema('analytics')
    .from('commitment')
    .select()
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`[KORA] listCommitmentDraftsForTenant failed: ${error.message}`);
  }

  return ((data ?? []) as CommitmentDbRow[]).map(toCommitment);
}
