// lib/operations/effort-capture-service.ts
// KORA-WP-008 — ADMIN-020 Effort-Capture Mechanism.
//
// Doc 92 §10 ("Lock 10, Resolved"): every governed human-activity
// completion requires a duration/effort field alongside its state-
// transition event — "event occurred ≠ effort measured". This module is
// the ONLY writer of gov.workload_event, and the ONLY reader (via its own
// aggregate function — no other path exists to read this table at all,
// per migration 063's zero-RLS-policy design).
//
// Ten-item activity vocabulary is doc 92 §10's own, verbatim — no
// additions, no Worker-level category exists or is ever added without a
// fresh Founder decision. This is a KORA-internal-operator primitive
// (KORA_ADMIN, Advisor) — never a Worker productivity/timesheet tool.
//
// Not wired into any existing workflow's route/service by this module —
// each consuming WP (e.g. KORA-WP-038's Advisor-prep hook) calls
// captureEffort() from its own future code; this WP builds only the
// generic mechanism, per its own Out of Scope.

import { getSupabaseServiceClient } from '@/lib/supabase/server';

export const WORKLOAD_ACTIVITY_CATEGORIES = [
  'kickoff',
  'onboarding_assistance',
  'data_quality_exception',
  'advisor_preparation',
  'advisor_call',
  'advisor_follow_up',
  'review_support',
  'certification_validation',
  'privacy_support_exception',
  'admin_governance_activity',
] as const;

export type WorkloadActivityCategory = (typeof WORKLOAD_ACTIVITY_CATEGORIES)[number];

export interface WorkloadEvent {
  id: string;
  activityCategory: WorkloadActivityCategory;
  actorRole: string;
  actorId: string;
  effortMinutes: number;
  tenantId: string | null;
  objectType: string | null;
  objectId: string | null;
  occurredAt: string;
}

interface WorkloadEventDbRow {
  id: string;
  activity_category: string;
  actor_role: string;
  actor_id: string;
  effort_minutes: number;
  tenant_id: string | null;
  object_type: string | null;
  object_id: string | null;
  occurred_at: string;
}

function toWorkloadEvent(row: WorkloadEventDbRow): WorkloadEvent {
  return {
    id: row.id,
    activityCategory: row.activity_category as WorkloadActivityCategory,
    actorRole: row.actor_role,
    actorId: row.actor_id,
    effortMinutes: row.effort_minutes,
    tenantId: row.tenant_id,
    objectType: row.object_type,
    objectId: row.object_id,
    occurredAt: row.occurred_at,
  };
}

// ── captureEffort — the ONLY way to write to gov.workload_event ─────────────
//
// "explicit duration entry" (doc 92 §10) — the simplest of the three named
// capture shapes; no start/stop state machine, no editing/correction path
// (append-only, enforced at the database level by migration 063's own
// trigger — a correction is always a new event, never a mutation).

export interface CaptureEffortParams {
  activityCategory: WorkloadActivityCategory;
  actorRole: string;
  actorId: string;
  effortMinutes: number;
  tenantId?: string;
  objectType?: string;
  objectId?: string;
}

export async function captureEffort(params: CaptureEffortParams): Promise<WorkloadEvent> {
  if (!WORKLOAD_ACTIVITY_CATEGORIES.includes(params.activityCategory)) {
    throw new Error(`[KORA] captureEffort rejected: "${params.activityCategory}" is not a canonical activity category (doc 92 §10).`);
  }
  if (!params.actorRole || !params.actorId) {
    throw new Error('[KORA] captureEffort rejected: actorRole and actorId are required — this substrate never manufactures actor attribution.');
  }
  if (!Number.isInteger(params.effortMinutes) || params.effortMinutes <= 0) {
    throw new Error('[KORA] captureEffort rejected: effortMinutes must be a positive integer.');
  }
  if ((params.objectType == null) !== (params.objectId == null)) {
    throw new Error('[KORA] captureEffort rejected: objectType and objectId must be provided together.');
  }

  const db = getSupabaseServiceClient();

  const { data, error } = await db
    .schema('gov')
    .from('workload_event')
    .insert({
      activity_category: params.activityCategory,
      actor_role: params.actorRole,
      actor_id: params.actorId,
      effort_minutes: params.effortMinutes,
      tenant_id: params.tenantId ?? null,
      object_type: params.objectType ?? null,
      object_id: params.objectId ?? null,
    })
    .select()
    .single();

  if (error || !data) {
    throw new Error(`[KORA] captureEffort failed: ${error?.message ?? 'no data returned'}`);
  }

  return toWorkloadEvent(data as WorkloadEventDbRow);
}

// ── getAggregateEffortByCategory — the ONLY read path over gov.workload_event ─
//
// "aggregate-only query layer, no individual-operator ranking exposed"
// (KORA-WP-008's own registry Auth/RLS field, verbatim). Returns total
// minutes per activity category — never per-actor, never a raw row list.
// migration 063 grants zero RLS read policy to any session role, including
// KORA_ADMIN's own session client — this function, called via the
// service-role client, is the sole way any caller can ever read this data.

export interface AggregateEffortFilter {
  tenantId?: string;
  occurredFrom?: string;
  occurredTo?: string;
}

export interface AggregateEffortByCategory {
  activityCategory: WorkloadActivityCategory;
  totalMinutes: number;
  eventCount: number;
}

export async function getAggregateEffortByCategory(
  filter: AggregateEffortFilter = {},
): Promise<AggregateEffortByCategory[]> {
  const db = getSupabaseServiceClient();

  let query = db.schema('gov').from('workload_event').select('activity_category, effort_minutes');

  if (filter.tenantId) query = query.eq('tenant_id', filter.tenantId);
  if (filter.occurredFrom) query = query.gte('occurred_at', filter.occurredFrom);
  if (filter.occurredTo) query = query.lte('occurred_at', filter.occurredTo);

  const { data, error } = await query;
  if (error) {
    throw new Error(`[KORA] getAggregateEffortByCategory failed: ${error.message}`);
  }

  const rows = (data ?? []) as Array<{ activity_category: string; effort_minutes: number }>;

  const totals = new Map<string, { totalMinutes: number; eventCount: number }>();
  for (const row of rows) {
    const existing = totals.get(row.activity_category) ?? { totalMinutes: 0, eventCount: 0 };
    existing.totalMinutes += row.effort_minutes;
    existing.eventCount += 1;
    totals.set(row.activity_category, existing);
  }

  return Array.from(totals.entries()).map(([activityCategory, agg]) => ({
    activityCategory: activityCategory as WorkloadActivityCategory,
    totalMinutes: agg.totalMinutes,
    eventCount: agg.eventCount,
  }));
}
