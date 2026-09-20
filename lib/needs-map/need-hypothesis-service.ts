// lib/needs-map/need-hypothesis-service.ts
// KORA-WP-017 — Needs Map + Need Hypothesis + Listening-Hypothesis Slice.
//
// Persists the pilot's first provisional Needs state — "never 'Needs
// truth'" (this WP's own Purpose text). Closes CORE-005 in full; is
// deliberately the Hypothesis-only early slice of CORE-006 (doc 67 §2's
// frozen classification vocabulary: Hypothesis / Emerging / Supported /
// Insufficient-Evidence-Unknown) — full Listening, which alone can produce
// evidence to promote a Hypothesis into any of the other three states,
// remains KORA-WP-069's own, later, separately-authorized scope.
//
// HYPOTHESIS ≠ SUPPORTED, enforced structurally: this module has exactly
// one create function, and it does not accept a `classification` parameter
// at all — every row it creates is 'Hypothesis', by construction. There is
// no update/promote function in this module, and no GRANT UPDATE exists on
// the underlying table (migration 055) — a caller cannot manufacture a
// Supported/Emerging/Insufficient-Evidence-Unknown row through this service
// even in principle.
//
// No automatic inference: nothing in this module derives a Need Hypothesis
// from Investment Map, UEF, KORA Index, BTI, Reach/Friction, or any other
// signal — every hypothesis requires an explicit, governed caller-supplied
// statement and provenance, never a hidden scoring rule.
//
// Aggregate / privacy-safe (PT FT-006): no worker identity, no individual
// response, no auth_user_id of an employee — only a Company-level statement.

import { getSupabaseServiceClient } from '@/lib/supabase/server';
import { recordGovernanceEvent } from '@/lib/audit/governance-event';

// Frozen vocabulary (doc 67 §2) — exported for read-side consumers (e.g. a
// future KORA-WP-018 Company Needs View) to recognize all four states, even
// though this WP's own create path only ever produces 'Hypothesis'.
export const NEED_CLASSIFICATIONS = ['Hypothesis', 'Emerging', 'Supported', 'Insufficient-Evidence-Unknown'] as const;
export type NeedClassification = (typeof NEED_CLASSIFICATIONS)[number];

export interface NeedHypothesis {
  id: string;
  tenantId: string;
  statement: string;
  classification: NeedClassification;
  recordedByRole: string;
  recordedById: string;
  createdAt: string;
}

interface NeedHypothesisDbRow {
  id: string;
  tenant_id: string;
  statement: string;
  classification: string;
  recorded_by_role: string;
  recorded_by_id: string;
  created_at: string;
}

function toNeedHypothesis(row: NeedHypothesisDbRow): NeedHypothesis {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    statement: row.statement,
    classification: row.classification as NeedClassification,
    recordedByRole: row.recorded_by_role,
    recordedById: row.recorded_by_id,
    createdAt: row.created_at,
  };
}

// ── createNeedHypothesis — the ONLY way to write to analytics.need_hypothesis ──
//
// No `classification` parameter — every row this function creates is
// 'Hypothesis'. Promoting a hypothesis into Emerging/Supported/Insufficient-
// Evidence-Unknown is not possible through this module at all.

export interface CreateNeedHypothesisParams {
  tenantId: string;
  statement: string;
  recordedByRole: string;
  recordedById: string;
}

export async function createNeedHypothesis(
  params: CreateNeedHypothesisParams,
): Promise<NeedHypothesis> {
  const db = getSupabaseServiceClient();

  const { data, error } = await db
    .schema('analytics')
    .from('need_hypothesis')
    .insert({
      tenant_id: params.tenantId,
      statement: params.statement,
      recorded_by_role: params.recordedByRole,
      recorded_by_id: params.recordedById,
    })
    .select()
    .single();

  if (error || !data) {
    throw new Error(`[KORA] createNeedHypothesis failed: ${error?.message ?? 'no data returned'}`);
  }

  const need = toNeedHypothesis(data as NeedHypothesisDbRow);

  // Generic governance signal — "Need Hypothesis creation" is not one of
  // KORA-WP-006's 14 frozen governed-action categories (doc 79 §17), so
  // this deliberately calls recordGovernanceEvent() directly rather than
  // recordGovernedAction() — no 15th category is invented.
  await recordGovernanceEvent({
    sourceModule: 'needs-map',
    actorRole: params.recordedByRole,
    actorId: params.recordedById,
    eventType: 'need_hypothesis.created',
    objectType: 'need_hypothesis',
    objectId: need.id,
    tenantId: need.tenantId,
  });

  return need;
}

// ── listNeedHypothesesForTenant — the read path acceptance requires ─────────

export async function listNeedHypothesesForTenant(tenantId: string): Promise<NeedHypothesis[]> {
  const db = getSupabaseServiceClient();

  const { data, error } = await db
    .schema('analytics')
    .from('need_hypothesis')
    .select()
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`[KORA] listNeedHypothesesForTenant failed: ${error.message}`);
  }

  return ((data ?? []) as NeedHypothesisDbRow[]).map(toNeedHypothesis);
}
