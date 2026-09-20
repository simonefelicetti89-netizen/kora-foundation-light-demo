// lib/commitment/commit-activation-service.ts
// KORA-WP-022 — Commit Activation Transaction + MVB Manifest (Layer C).
//
// The ONLY module that can move a Commitment from `draft` to `committed`.
// Delegates the entire constitutive transaction to a single Postgres
// function, `analytics.commit_commitment()` (migration 067) — a single RPC
// call, not a sequence of unrelated client calls, so the transaction is
// genuinely atomic: Commitment status, Evidence Plan freeze, MVB manifest
// write, and governance_event emission either all happen or none do.
//
// Authorization mirrors lib/commitment/commitment-service.ts and
// lib/evidence-plan/evidence-plan-service.ts exactly: actorRole must be
// 'COMPANY_ADMIN'. Doc 73 §6, verbatim — the `committed` transition is
// "reserved to Decision Owner (never Advisor) — NO, NEVER." This check
// happens here, in TypeScript, before the RPC is ever called; the SQL
// function itself trusts the caller's actor_role/actor_id for provenance
// only, the same convention as every other Lane-B primitive in this schema
// (resource-allocation-service.ts, commitment-service.ts).

import { getSupabaseServiceClient } from '@/lib/supabase/server';

const DECISION_OWNER_ROLE = 'COMPANY_ADMIN';

export interface CommitActivationResult {
  manifestId: string;
  committedAt: string;
}

export interface CommitCommitmentParams {
  commitmentId: string;
  tenantId: string;
  actorRole: string;
  actorId: string;
}

export async function commitCommitment(params: CommitCommitmentParams): Promise<CommitActivationResult> {
  if (!params.actorRole || !params.actorId) {
    throw new Error('[KORA] commitCommitment rejected: actorRole and actorId are required — this substrate never manufactures actor attribution.');
  }
  if (params.actorRole !== DECISION_OWNER_ROLE) {
    throw new Error(
      `[KORA] commitCommitment rejected: only ${DECISION_OWNER_ROLE} may activate a Commitment (doc 73 §6 — "the committed transition itself — NO, NEVER" for any other role).`,
    );
  }

  const db = getSupabaseServiceClient();

  // `commit_commitment` is not in the generated Database type, so the
  // client's own generic signature is bypassed here (real-DB validated:
  // the postgrest-js `.rpc(name, args, { schema })` third-argument form
  // does NOT route to a non-public schema in this pinned client version —
  // only `db.schema('analytics').rpc(...)` does).
  const { data, error } = await (
    db.schema('analytics') as unknown as {
      rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>;
    }
  ).rpc('commit_commitment', {
    p_commitment_id: params.commitmentId,
    p_tenant_id: params.tenantId,
    p_actor_role: params.actorRole,
    p_actor_id: params.actorId,
  });

  if (error) {
    throw new Error(`[KORA] commitCommitment failed: ${error.message}`);
  }
  const row = (Array.isArray(data) ? data[0] : data) as { manifest_id: string; committed_at: string } | undefined;
  if (!row) {
    throw new Error('[KORA] commitCommitment failed: no data returned from commit_commitment().');
  }

  return { manifestId: row.manifest_id, committedAt: row.committed_at };
}

// ── getMvbManifest — read the immutable manifest for a committed Commitment ──

export interface MvbManifest {
  id: string;
  tenantId: string;
  commitmentId: string;
  resourceAllocationTotalAmount: number;
  resourceAllocationEntryCount: number;
  evidenceKnownMissingAtCommit: boolean;
  needHypothesisStatusSnapshot: null;
  committedAt: string;
  actorRole: string;
  actorId: string;
  createdAt: string;
}

interface MvbManifestDbRow {
  id: string;
  tenant_id: string;
  commitment_id: string;
  resource_allocation_total_amount: number;
  resource_allocation_entry_count: number;
  evidence_known_missing_at_commit: boolean;
  need_hypothesis_status_snapshot: string | null;
  committed_at: string;
  actor_role: string;
  actor_id: string;
  created_at: string;
}

export async function getMvbManifest(commitmentId: string, tenantId: string): Promise<MvbManifest | null> {
  const db = getSupabaseServiceClient();

  const { data, error } = await db
    .schema('analytics')
    .from('commitment_mvb_manifest')
    .select()
    .eq('commitment_id', commitmentId)
    .eq('tenant_id', tenantId)
    .maybeSingle();

  if (error) {
    throw new Error(`[KORA] getMvbManifest failed: ${error.message}`);
  }
  if (!data) return null;

  const row = data as MvbManifestDbRow;
  return {
    id: row.id,
    tenantId: row.tenant_id,
    commitmentId: row.commitment_id,
    resourceAllocationTotalAmount: Number(row.resource_allocation_total_amount),
    resourceAllocationEntryCount: row.resource_allocation_entry_count,
    evidenceKnownMissingAtCommit: row.evidence_known_missing_at_commit,
    needHypothesisStatusSnapshot: null,
    committedAt: row.committed_at,
    actorRole: row.actor_role,
    actorId: row.actor_id,
    createdAt: row.created_at,
  };
}
