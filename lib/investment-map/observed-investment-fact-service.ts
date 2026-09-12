// lib/investment-map/observed-investment-fact-service.ts
// KORA-WP-014 — Investment Map Core (Observed Investment Fact).
//
// Persists the Observed half of the Investment Map only (doc 70 §4, doc 71
// §7): a fact about spend/investment that already happened, independent of
// any KORA Commitment. The Governed half (things flowing through Commitment
// → Resource Allocation → Program) is a later, composed view over tables
// this module never creates or reads — KORA-WP-015+'s scope, not this one's.
//
// OBSERVED ≠ GOVERNED, enforced structurally: this module's create params
// have no commitment/Resource Allocation/Program field at all — there is no
// code path here that could ever fabricate retroactive KORA governance. The
// database's own commitment_ref column (migration 053) additionally CHECKs
// NULL at the schema level; this is the second, independent layer.
//
// Unknown is a real state, never coerced to zero/false/empty: amount,
// provider, populationDescriptor, reachSummary, evidenceSummary are each
// `string | number | null` — a caller who does not supply one leaves it
// genuinely NULL, and the service auto-derives which of them are Unknown
// into the DB's `unknown_fields` column (mirroring the existing
// `analytics.uef_record.missing_fields` precedent, migration 001).
//
// A free-text `provider` is never promoted to a Partner/network object —
// this module has no code path that touches the `network` schema.

import { getSupabaseServiceClient } from '@/lib/supabase/server';
import { recordGovernanceEvent } from '@/lib/audit/governance-event';

export interface ObservedInvestmentFact {
  id: string;
  tenantId: string;
  sourceBatchId: string | null;
  recordedByRole: string;
  recordedById: string;
  purpose: string;
  amount: number | null;
  provider: string | null;
  populationDescriptor: string | null;
  reachSummary: string | null;
  evidenceSummary: string | null;
  unknownFields: string[];
  commitmentRef: null; // structurally always null for an Observed fact — see module header
  createdAt: string;
}

interface ObservedInvestmentFactDbRow {
  id: string;
  tenant_id: string;
  source_batch_id: string | null;
  recorded_by_role: string;
  recorded_by_id: string;
  purpose: string;
  amount: string | number | null; // numeric columns come back as string from postgres
  provider: string | null;
  population_descriptor: string | null;
  reach_summary: string | null;
  evidence_summary: string | null;
  unknown_fields: string[];
  commitment_ref: null;
  created_at: string;
}

function toFact(row: ObservedInvestmentFactDbRow): ObservedInvestmentFact {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    sourceBatchId: row.source_batch_id,
    recordedByRole: row.recorded_by_role,
    recordedById: row.recorded_by_id,
    purpose: row.purpose,
    amount: row.amount === null ? null : Number(row.amount),
    provider: row.provider,
    populationDescriptor: row.population_descriptor,
    reachSummary: row.reach_summary,
    evidenceSummary: row.evidence_summary,
    unknownFields: row.unknown_fields,
    commitmentRef: null,
    createdAt: row.created_at,
  };
}

// ── unknown-field derivation ─────────────────────────────────────────────────
// Whichever of the five "if known" attributes is not supplied is genuinely
// Unknown, not merely omitted — never silently defaulted to 0/false/empty.

const KNOWABLE_FIELD_COLUMNS = {
  amount: 'amount',
  provider: 'provider',
  populationDescriptor: 'population_descriptor',
  reachSummary: 'reach_summary',
  evidenceSummary: 'evidence_summary',
} as const;

function deriveUnknownFields(params: Pick<
  CreateObservedInvestmentFactParams,
  'amount' | 'provider' | 'populationDescriptor' | 'reachSummary' | 'evidenceSummary'
>): string[] {
  const unknown: string[] = [];
  for (const [key, column] of Object.entries(KNOWABLE_FIELD_COLUMNS) as [keyof typeof KNOWABLE_FIELD_COLUMNS, string][]) {
    if (params[key] === undefined || params[key] === null) {
      unknown.push(column);
    }
  }
  return unknown;
}

// ── createObservedInvestmentFact — the ONLY way to write to
// analytics.observed_investment_fact ──────────────────────────────────────

export interface CreateObservedInvestmentFactParams {
  tenantId: string;
  /** Who is recording this fact — explicit, never inferred (matches audit.governance_event's provenance discipline). */
  recordedByRole: string;
  recordedById: string;
  /** Always required — the one attribute the frozen source text does not list as "if known". */
  purpose: string;
  /** Optional provenance link to the ingestion pipeline this fact came from, if any. */
  sourceBatchId?: string;
  /** "If known" attributes — omit any that are genuinely Unknown; never pass a guessed/default value. */
  amount?: number;
  provider?: string;
  populationDescriptor?: string;
  reachSummary?: string;
  evidenceSummary?: string;
  // No commitmentRef, no Resource Allocation reference, no Program reference —
  // deliberately absent from this type. See module header.
}

export async function createObservedInvestmentFact(
  params: CreateObservedInvestmentFactParams,
): Promise<ObservedInvestmentFact> {
  const db = getSupabaseServiceClient();
  const unknownFields = deriveUnknownFields(params);

  const { data, error } = await db
    .schema('analytics')
    .from('observed_investment_fact')
    .insert({
      tenant_id: params.tenantId,
      source_batch_id: params.sourceBatchId ?? null,
      recorded_by_role: params.recordedByRole,
      recorded_by_id: params.recordedById,
      purpose: params.purpose,
      amount: params.amount ?? null,
      provider: params.provider ?? null,
      population_descriptor: params.populationDescriptor ?? null,
      reach_summary: params.reachSummary ?? null,
      evidence_summary: params.evidenceSummary ?? null,
      unknown_fields: unknownFields,
    })
    .select()
    .single();

  if (error || !data) {
    throw new Error(`[KORA] createObservedInvestmentFact failed: ${error?.message ?? 'no data returned'}`);
  }

  const fact = toFact(data as ObservedInvestmentFactDbRow);

  // Generic governance signal only — no Audit/Case/ADMIN-020 taxonomy
  // invented here (KORA-WP-006/007/008's own, later, larger scope).
  await recordGovernanceEvent({
    sourceModule: 'investment-map',
    actorRole: params.recordedByRole,
    actorId: params.recordedById,
    eventType: 'observed_investment_fact.created',
    objectType: 'observed_investment_fact',
    objectId: fact.id,
    tenantId: fact.tenantId,
    payload: {
      has_amount: fact.amount !== null,
      unknown_field_count: fact.unknownFields.length,
    },
  });

  return fact;
}

// ── listObservedInvestmentFactsForTenant — the read path acceptance requires ──

export async function listObservedInvestmentFactsForTenant(
  tenantId: string,
): Promise<ObservedInvestmentFact[]> {
  const db = getSupabaseServiceClient();

  const { data, error } = await db
    .schema('analytics')
    .from('observed_investment_fact')
    .select()
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`[KORA] listObservedInvestmentFactsForTenant failed: ${error.message}`);
  }

  return ((data ?? []) as ObservedInvestmentFactDbRow[]).map(toFact);
}
