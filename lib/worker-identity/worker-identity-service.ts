// lib/worker-identity/worker-identity-service.ts
// KORA-WP-041 — Pre-Pilot Offboarding Playbooks: narrow in-scope addition.
//
// Founder-mandated dry-run gate (this WP's own review round) found that no
// service function anywhere in the repository could transition
// personal.worker_identity.status away from 'active' — the 'disabled' value
// has existed in the DB CHECK constraint since migration 007
// (007_worker_provisioning.sql), and in the WorkerIdentityRow TypeScript
// union (lib/supabase/types.ts), but nothing ever wrote it. Without this,
// the Worker Offboarding playbook and its worker-leaves-during-pilot test
// could not be dry-run against a real mechanism — only asserted in prose.
//
// This is a narrow, additive fix, not a new WP-004-style membership model:
// zero migration (the column and CHECK already exist), one function, same
// governed-write discipline every other end-of-relationship function in
// this codebase already follows (lib/company-membership/membership-service.ts
// endCompanyMembership(), lib/advisor-assignment/advisor-assignment-service.ts
// endAdvisorAssignment()) — idempotent-safe (.eq('status','active') guard),
// explicit actor, governed audit trail, and by construction touches no
// other table: personal.worker_profile_private and any other My KORA data
// are never referenced here, preserving the constitutional invariant
// (doc 92 §20 / WP-041 Privacy-Trust field) that ending Company access must
// never delete or alter the worker's own identity/My KORA content.

import { getSupabaseServiceClient } from '@/lib/supabase/server';
import { recordGovernedAction } from '@/lib/audit/governed-action-catalog';

export interface WorkerIdentityAccessActor {
  actorRole: string;
  actorId: string;
}

export interface EndWorkerIdentityAccessParams {
  workerIdentityId: string;
  actor: WorkerIdentityAccessActor;
}

export interface WorkerIdentityAccessResult {
  id: string;
  tenantId: string;
  status: 'invited' | 'active' | 'pending' | 'disabled';
  updatedAt: string;
}

// ── endWorkerIdentityAccess — explicit, governed Company-access shutdown ────
//
// Sets personal.worker_identity.status = 'disabled'. Never touches
// auth.users, app_metadata, or personal.worker_profile_private — the
// worker's My KORA identity row (id, auth_user_id, worker_ref) is left
// completely intact, so it remains readable by the worker themselves
// (worker_identity_worker_own_select, migration 007) after Company access
// ends. This function has no code path that could reach identity or
// profile data — the same "untouched by construction" discipline WP-004's
// endCompanyMembership() documents for itself.

export async function endWorkerIdentityAccess(
  params: EndWorkerIdentityAccessParams,
): Promise<WorkerIdentityAccessResult> {
  const db = getSupabaseServiceClient();

  const { data, error } = await db
    .schema('personal')
    .from('worker_identity')
    .update({ status: 'disabled' })
    .eq('id', params.workerIdentityId)
    .eq('status', 'active') // idempotent-safe: no-op if already ended
    .select('id, tenant_id, status, updated_at')
    .single();

  if (error || !data) {
    throw new Error(
      `[KORA] endWorkerIdentityAccess failed: ${error?.message ?? 'worker identity not found or not active'}`,
    );
  }

  const row = data as { id: string; tenant_id: string; status: string; updated_at: string };

  await recordGovernedAction({
    category: 'MEMBERSHIP_CHANGE',
    actorRole: params.actor.actorRole,
    actorId: params.actor.actorId,
    objectType: 'worker_identity',
    objectId: row.id,
    tenantId: row.tenant_id,
    payload: { verb: 'end_access', newStatus: row.status },
  });

  return {
    id: row.id,
    tenantId: row.tenant_id,
    status: row.status as WorkerIdentityAccessResult['status'],
    updatedAt: row.updated_at,
  };
}

// ── getWorkerIdentityById — internal/service-use query, dry-run/playbook use ─

export async function getWorkerIdentityById(
  workerIdentityId: string,
): Promise<WorkerIdentityAccessResult | null> {
  const db = getSupabaseServiceClient();

  const { data } = await db
    .schema('personal')
    .from('worker_identity')
    .select('id, tenant_id, status, updated_at')
    .eq('id', workerIdentityId)
    .maybeSingle();

  if (!data) return null;
  const row = data as { id: string; tenant_id: string; status: string; updated_at: string };
  return {
    id: row.id,
    tenantId: row.tenant_id,
    status: row.status as WorkerIdentityAccessResult['status'],
    updatedAt: row.updated_at,
  };
}
