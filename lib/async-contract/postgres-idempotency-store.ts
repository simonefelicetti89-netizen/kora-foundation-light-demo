// lib/async-contract/postgres-idempotency-store.ts
// KORA-WP-028 — real Postgres-backed implementation of KORA-WP-011's
// `IdempotencyStore` interface.
//
// Exactly the implementation KORA-WP-011's own header foreshadowed:
// "`KORA-WP-028`... plugs in a REAL Postgres-backed implementation —
// `INSERT ... ON CONFLICT (tenant_id, operation, key) DO NOTHING RETURNING
// id`... without this contract's own type signatures changing at all."
// Backed by `analytics.idempotency_claim` + `analytics.claim_idempotency_key()`
// (migration 077). Generic and reusable by any future caller of the
// KORA-WP-011 contract — not specific to this WP's own ingestion domain.
//
// `claim()` delegates to the RPC for its atomic INSERT-with-conflict-check
// (never a SELECT-then-INSERT race, per KORA-WP-011's own non-negotiable
// requirement). `complete()`/`fail()` are plain, WHERE-guarded UPDATEs —
// safe because a terminal row can never be re-resolved (enforced twice:
// the service-layer `.eq('status', 'pending')` filter below, and migration
// 077's own DB-level immutability trigger as the backstop).

import { getSupabaseServiceClient } from '@/lib/supabase/server';
import type { IdempotencyKey, IdempotencyRecord, IdempotencyStore, JobStatus } from './idempotency-contract';

interface ClaimRpcRow {
  claimed: boolean;
  id: string;
  status: string;
  payload_hash: string;
  result: unknown;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

function toRecord(row: ClaimRpcRow): IdempotencyRecord {
  return {
    status: row.status as JobStatus,
    payloadHash: row.payload_hash,
    result: row.result,
    error: row.error_message,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class PostgresIdempotencyStore implements IdempotencyStore {
  async claim(key: IdempotencyKey, payloadHash: string): Promise<
    { claimed: true } | { claimed: false; existing: IdempotencyRecord }
  > {
    const db = getSupabaseServiceClient();

    const { data, error } = await (
      db.schema('analytics') as unknown as {
        rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>;
      }
    ).rpc('claim_idempotency_key', {
      p_tenant_id: key.tenantId,
      p_operation: key.operation,
      p_key: key.key,
      p_payload_hash: payloadHash,
    });

    if (error || !data) {
      throw new Error(`[KORA] PostgresIdempotencyStore.claim failed: ${error?.message ?? 'no data returned'}`);
    }

    const row = (Array.isArray(data) ? data[0] : data) as ClaimRpcRow;
    if (row.claimed) return { claimed: true };
    return { claimed: false, existing: toRecord(row) };
  }

  async complete(key: IdempotencyKey, result: unknown): Promise<void> {
    const db = getSupabaseServiceClient();

    const { error } = await db
      .schema('analytics')
      .from('idempotency_claim')
      .update({ status: 'succeeded', result })
      .eq('tenant_id', key.tenantId)
      .eq('operation', key.operation)
      .eq('idempotency_key', key.key)
      .eq('status', 'pending'); // no-op if already terminal — never re-resolved

    if (error) {
      throw new Error(`[KORA] PostgresIdempotencyStore.complete failed: ${error.message}`);
    }
  }

  async fail(key: IdempotencyKey, errorMessage: string): Promise<void> {
    const db = getSupabaseServiceClient();

    const { error } = await db
      .schema('analytics')
      .from('idempotency_claim')
      .update({ status: 'failed', error_message: errorMessage })
      .eq('tenant_id', key.tenantId)
      .eq('operation', key.operation)
      .eq('idempotency_key', key.key)
      .eq('status', 'pending');

    if (error) {
      throw new Error(`[KORA] PostgresIdempotencyStore.fail failed: ${error.message}`);
    }
  }
}
