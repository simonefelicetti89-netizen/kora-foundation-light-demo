// lib/audit/governance-event.ts
// KORA-WP-005 — Shared Governance Event/Provenance Substrate.
//
// Resolves the Case/Audit dependency ambiguity (`92` §9): this is the one
// lower-level primitive both the existing audit.audit_log (extended later by
// KORA-WP-006) and the future Operational Case primitive (KORA-WP-007) are
// built from — neither depends on the other.
//
// Insertion only. No update, no delete — audit.governance_event is enforced
// append-only at the database level (migration 051's trigger rejects any
// mutation, for every role, including service_role). This module has no
// function that could even attempt one.
//
// Generic, not Audit-specific, not Case-specific, not ADMIN-020-specific
// (KORA-WP-005's own Out of Scope): recordGovernanceEvent() takes a free-form
// eventType and never invents or constrains a taxonomy. Consumer WPs decide
// their own event_type vocabulary.
//
// Provenance is always explicit: every field the caller can supply must be
// supplied — this helper never manufactures actor/source information on its
// own behalf.

import { getSupabaseServiceClient } from '@/lib/supabase/server';

export interface GovernanceEvent {
  id: string;
  sourceModule: string;
  actorRole: string;
  actorId: string;
  eventType: string;
  objectType: string | null;
  objectId: string | null;
  tenantId: string | null;
  payload: Record<string, unknown>;
  occurredAt: string;
}

interface GovernanceEventDbRow {
  id: string;
  source_module: string;
  actor_role: string;
  actor_id: string;
  event_type: string;
  object_type: string | null;
  object_id: string | null;
  tenant_id: string | null;
  payload: Record<string, unknown>;
  occurred_at: string;
}

function toEvent(row: GovernanceEventDbRow): GovernanceEvent {
  return {
    id: row.id,
    sourceModule: row.source_module,
    actorRole: row.actor_role,
    actorId: row.actor_id,
    eventType: row.event_type,
    objectType: row.object_type,
    objectId: row.object_id,
    tenantId: row.tenant_id,
    payload: row.payload,
    occurredAt: row.occurred_at,
  };
}

export interface RecordGovernanceEventParams {
  /** Which subsystem is recording this — explicit, never inferred (e.g. 'company-membership', 'uef-review'). */
  sourceModule: string;
  /** Who caused this event — matches the actor_role/actor_id shape already used by audit.audit_log. */
  actorRole: string;
  actorId: string;
  /** Free-form event kind — this substrate never constrains or invents a taxonomy. */
  eventType: string;
  /** Optional generic domain reference — what this event is about, if anything. */
  objectType?: string;
  objectId?: string;
  /** Optional tenant context — never mandatory; this substrate is KORA-global. */
  tenantId?: string;
  /** Optional structured context. */
  payload?: Record<string, unknown>;
}

// ── recordGovernanceEvent — the ONLY way to write to audit.governance_event ──

export async function recordGovernanceEvent(
  params: RecordGovernanceEventParams,
): Promise<GovernanceEvent> {
  const db = getSupabaseServiceClient();

  const { data, error } = await db
    .schema('audit')
    .from('governance_event')
    .insert({
      source_module: params.sourceModule,
      actor_role: params.actorRole,
      actor_id: params.actorId,
      event_type: params.eventType,
      object_type: params.objectType ?? null,
      object_id: params.objectId ?? null,
      tenant_id: params.tenantId ?? null,
      payload: params.payload ?? {},
    })
    .select()
    .single();

  if (error || !data) {
    throw new Error(`[KORA] recordGovernanceEvent failed: ${error?.message ?? 'no data returned'}`);
  }

  return toEvent(data as GovernanceEventDbRow);
}
