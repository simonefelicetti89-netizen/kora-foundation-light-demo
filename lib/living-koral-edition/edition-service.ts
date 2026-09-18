// lib/living-koral-edition/edition-service.ts
// KORA-WP-115 — KORAL Edition (Portrait folded into Edition).
//
// The ONLY module permitted to read or create analytics.living_koral_
// edition rows on behalf of a Company session. Uses
// getSupabaseServerClient() EXCLUSIVELY for both list and create — the
// real, cookie-forwarded, RLS-enforced session client, never
// getSupabaseServiceClient() — matching lib/living-koral-company-view/
// company-view-service.ts's own established discipline (WP-114) exactly.
// Creation is a validated RPC call to migration 085's own SECURITY
// DEFINER function; this module never performs a raw .insert() against
// the table (structurally verified by test).
//
// Idempotency: reuses KORA-WP-011's existing, generic, already-reviewed,
// already-allowlisted contract (lib/async-contract/idempotency-contract.ts
// + postgres-idempotency-store.ts, backed by the pre-existing
// analytics.idempotency_claim table, migration 077) — no new idempotency
// mechanism is built here, per this WP's own explicit instruction. The
// idempotency claim/complete/fail bookkeeping is orthogonal to
// authorization: PostgresIdempotencyStore's own internal service-role use
// (already an established, allowlisted exception — WP-028) only tracks
// "was this exact (tenant, operation, key) already attempted," never the
// Edition write itself, which always goes through the session-forwarding
// client + the SECURITY DEFINER function's own internal role/tenant
// re-validation.

import { getSupabaseServerClient } from '@/lib/supabase/server';
import { executeIdempotent, IdempotentExecutionError, type IdempotencyKey } from '@/lib/async-contract/idempotency-contract';
import { PostgresIdempotencyStore } from '@/lib/async-contract/postgres-idempotency-store';
import type { LivingKoralEditionRecord, CreateLivingKoralEditionParams, CreateLivingKoralEditionResult } from './types';

const IDEMPOTENCY_OPERATION = 'living_koral_edition.create';

interface EditionRow {
  id: string;
  name: string;
  ledger_id: string;
  category: LivingKoralEditionRecord['category'];
  affected_domain: 'initiative';
  taxonomy_config_version: string;
  morphogenesis_engine_version: string;
  resulting_state_revision: number;
  occurred_at: string;
  recognized_at: string;
  source_label: string | null;
  created_at: string;
  tenant_id?: string;
  actor_role?: 'COMPANY_ADMIN';
  actor_id?: string;
}

function toRecord(row: EditionRow, tenantId: string): LivingKoralEditionRecord {
  return {
    id: row.id,
    tenantId,
    name: row.name,
    ledgerId: row.ledger_id,
    category: row.category,
    affectedDomain: row.affected_domain,
    taxonomyConfigVersion: row.taxonomy_config_version,
    morphogenesisEngineVersion: row.morphogenesis_engine_version,
    resultingStateRevision: row.resulting_state_revision,
    occurredAt: row.occurred_at,
    recognizedAt: row.recognized_at,
    sourceLabel: row.source_label,
    actorRole: 'COMPANY_ADMIN',
    actorId: row.actor_id ?? '',
    createdAt: row.created_at,
  };
}

/**
 * The Editions archive's sole read entry point. `tenantId` must already be
 * session-derived by the caller (matching lib/living-koral-company-view's
 * own established contract) — RLS (migration 085) is the real, structural
 * gate regardless: a wrong/foreign tenantId here simply yields zero rows.
 */
export async function listLivingKoralEditionsForTenant(tenantId: string): Promise<LivingKoralEditionRecord[]> {
  const db = await getSupabaseServerClient();

  const { data, error } = await db
    .schema('analytics').from('living_koral_edition')
    .select('id, name, ledger_id, category, affected_domain, taxonomy_config_version, morphogenesis_engine_version, resulting_state_revision, occurred_at, recognized_at, source_label, actor_id, created_at')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(`[KORA] listLivingKoralEditionsForTenant failed: ${error.message}`);
  return (data ?? []).map((row) => toRecord(row as unknown as EditionRow, tenantId));
}

function classifyRpcError(message: string): 'no_recognized_transformation' | 'invalid_name' | null {
  if (message.includes('kora/no-recognized-transformation')) return 'no_recognized_transformation';
  if (message.includes('kora/invalid-name')) return 'invalid_name';
  return null;
}

/**
 * The Editions archive's sole write entry point. Wraps the validated
 * SECURITY DEFINER RPC (migration 085) in KORA-WP-011's own generic
 * idempotency contract — a retried request with the SAME idempotencyKey
 * and the SAME name replays the original Edition (never creates a
 * duplicate); the SAME key with a DIFFERENT name is a conflict (never
 * silently applied); two DIFFERENT keys always create two distinct
 * Editions, even when both end up referencing the identical Ledger point
 * (Founder adjudication #3 — no uniqueness constraint on the anchor).
 */
export async function createLivingKoralEdition(params: CreateLivingKoralEditionParams): Promise<CreateLivingKoralEditionResult> {
  const { tenantId, name, idempotencyKey } = params;

  const trimmed = name.trim();
  if (trimmed.length === 0 || trimmed.length > 200) {
    return { kind: 'invalid_name' };
  }

  const key: IdempotencyKey = { tenantId, operation: IDEMPOTENCY_OPERATION, key: idempotencyKey };
  const store = new PostgresIdempotencyStore();

  try {
    const outcome = await executeIdempotent<LivingKoralEditionRecord>({
      store,
      key,
      payload: { name: trimmed },
      execute: async () => {
        const db = await getSupabaseServerClient();
        const { data, error } = await (
          db.schema('analytics') as unknown as {
            rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>;
          }
        ).rpc('fn_create_living_koral_edition', { p_name: trimmed });

        if (error) {
          // Original kora/-prefixed message preserved — classified
          // uniformly below, for both a fresh failure (caught just below,
          // KORA-WP-011's own executeIdempotent() re-throws a fresh
          // execute() failure rather than returning it as an outcome) and
          // a later replayed_failure (handled in the non-throwing branch
          // below).
          throw new Error(error.message);
        }

        const row = (Array.isArray(data) ? data[0] : data) as EditionRow | undefined;
        if (!row) throw new Error('[KORA] fn_create_living_koral_edition returned no row');
        return toRecord(row, tenantId);
      },
    });

    if (outcome.kind === 'executed' || outcome.kind === 'replayed') {
      return { kind: outcome.kind === 'executed' ? 'created' : 'replayed', edition: outcome.result };
    }
    if (outcome.kind === 'conflict') return { kind: 'conflict' };
    if (outcome.kind === 'in_progress') return { kind: 'in_progress' };
    // 'replayed_failure' — an earlier attempt under this same key already
    // failed; classify the same way a fresh failure is classified below,
    // so a Company UI sees the identical typed result either way.
    return { kind: classifyRpcError(outcome.error) ?? 'invalid_name' };
  } catch (err) {
    // A FRESH execute() failure — KORA-WP-011's own executeIdempotent()
    // re-throws this (wrapped in IdempotentExecutionError) rather than
    // returning it as a typed outcome (§4 of the contract: "never
    // converted into a false 'executed' success"). Unwrapped and
    // classified here so this function's own callers only ever see a
    // typed result, never an unhandled exception, for an expected,
    // named condition (e.g. "no recognized transformation yet").
    const message = err instanceof IdempotentExecutionError && err.cause instanceof Error ? err.cause.message
      : err instanceof Error ? err.message
      : String(err);
    const classified = classifyRpcError(message);
    if (classified) return { kind: classified };
    throw err; // a genuine, unclassified failure — not swallowed
  }
}
