// lib/decision-linkage/decision-linkage-service.ts
// KORA-WP-023 — Core Decision Linkage (Resource ↔ Commitment ↔ Evidence Plan
// ↔ Review), excluding Program entirely.
//
// Doc 68 §8, verbatim: "DECISION-008 (Resource↔Decision↔Program↔Spend↔
// Evidence linkage) IS 'the reference architecture itself..., not a
// separate object.'" This module creates NO new domain truth — it is a
// read-only query surface over `analytics.commitment_decision_trace`
// (migration 069), a security-invoker VIEW that projects already-existing
// relationships (KORA-WP-015/020/021/022's own real FKs), never a second,
// drift-prone copy of them.
//
// `review_id`/`reviewStatus` are real joins as of KORA-WP-024's own
// migration 070, which is the only legitimate place this view was ever
// meant to be replaced (per this file's own original header) — the view
// itself, its security_invoker setting, its RLS-inheritance, and its
// read-only/no-duplicated-truth shape are all otherwise unchanged.

import { getSupabaseServiceClient } from '@/lib/supabase/server';

export interface DecisionTrace {
  commitmentId: string;
  tenantId: string;
  commitmentStatus: string;
  evidencePlanId: string | null;
  evidencePlanStatus: string | null;
  resourceAllocationEntryIds: string[];
  mvbManifestId: string | null;
  reviewId: string | null;
  reviewStatus: string | null;
}

interface DecisionTraceDbRow {
  commitment_id: string;
  tenant_id: string;
  commitment_status: string;
  evidence_plan_id: string | null;
  evidence_plan_status: string | null;
  resource_allocation_entry_ids: string[] | null;
  mvb_manifest_id: string | null;
  review_id: string | null;
  review_status: string | null;
}

function toDecisionTrace(row: DecisionTraceDbRow): DecisionTrace {
  return {
    commitmentId: row.commitment_id,
    tenantId: row.tenant_id,
    commitmentStatus: row.commitment_status,
    evidencePlanId: row.evidence_plan_id,
    evidencePlanStatus: row.evidence_plan_status,
    resourceAllocationEntryIds: row.resource_allocation_entry_ids ?? [],
    mvbManifestId: row.mvb_manifest_id,
    reviewId: row.review_id,
    reviewStatus: row.review_status,
  };
}

// ── getDecisionTrace — "what is the full traceability chain for this Commitment?" ──

export async function getDecisionTrace(commitmentId: string, tenantId: string): Promise<DecisionTrace | null> {
  const db = getSupabaseServiceClient();

  const { data, error } = await db
    .schema('analytics')
    .from('commitment_decision_trace')
    .select()
    .eq('commitment_id', commitmentId)
    .eq('tenant_id', tenantId)
    .maybeSingle();

  if (error) {
    throw new Error(`[KORA] getDecisionTrace failed: ${error.message}`);
  }
  if (!data) return null;

  return toDecisionTrace(data as DecisionTraceDbRow);
}

// ── listDecisionTracesForTenant — the Company-wide traceability list ────────

export async function listDecisionTracesForTenant(tenantId: string): Promise<DecisionTrace[]> {
  const db = getSupabaseServiceClient();

  const { data, error } = await db
    .schema('analytics')
    .from('commitment_decision_trace')
    .select()
    .eq('tenant_id', tenantId);

  if (error) {
    throw new Error(`[KORA] listDecisionTracesForTenant failed: ${error.message}`);
  }

  return ((data ?? []) as DecisionTraceDbRow[]).map(toDecisionTrace);
}

// ── getResourceAllocationEntryIdsForCommitment — "which allocations support this Commitment?" ──

export async function getResourceAllocationEntryIdsForCommitment(commitmentId: string, tenantId: string): Promise<string[]> {
  const trace = await getDecisionTrace(commitmentId, tenantId);
  return trace?.resourceAllocationEntryIds ?? [];
}

// ── getEvidencePlanIdForCommitment — "which Evidence Plan lineage governs it?" ──

export async function getEvidencePlanIdForCommitment(commitmentId: string, tenantId: string): Promise<string | null> {
  const trace = await getDecisionTrace(commitmentId, tenantId);
  return trace?.evidencePlanId ?? null;
}
