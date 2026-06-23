// lib/supabase/uef-service-key.ts
//
// Service-role utilities per operazioni di sistema su analytics.uef_record.
// Pattern parallelo a impact-unit-service-key.ts e worker-provisioning-service-key.ts.
//
// STATO GATE 2.3:
//   Migration 030: kora_admin_all_uef rimossa; fn_admin_uef_review SECURITY DEFINER creata.
//   Migration 031: PUBLIC EXECUTE revocato dalle 4 funzioni UEF; service_role + authenticated
//     hanno EXECUTE esplicito.
//   Step 2 (completo): review/route.ts GET Case B ora chiama fn_admin_uef_review()
//     — payload escluso a livello DB, payload sub-fields disponibili come colonne typed.
//
//   generate-candidates usa service-role per le INSERT (sistema ingestion).
//   queryUEFBatchMeta() è mantenuto come utility per lettori non-review che richiedono
//   accesso diretto alla tabella tramite service-role senza passare per la funzione RPC.
//
// COSA NON DEVE FARE:
//   - NON esporre il client Supabase al browser.
//   - NON restituire il campo `payload` nelle query di review: contiene dati
//     raw dall'ingestion HR/welfare, potenzialmente identificativi (Gate 3).
//   - NON aggiornare payload tramite questo modulo: l'enrich route usa
//     getSupabaseServiceClient() direttamente con whitelist manuale.
//   - NON saltare il check KORA_ADMIN a livello applicativo — l'autorizzazione
//     deve avvenire PRIMA della costruzione del client service-role.
//
// INVARIANTE:
//   queryUEFBatchMeta() NON include il campo `payload`.
//   Le INSERT (insertUEFCandidates) scrivono payload — è corretto per il
//   pipeline di ingestion — ma il payload NON è mai restituito al client HTTP.
//   Authorization (requireKoraAdmin) deve essere chiamata dal route handler
//   prima di invocare qualsiasi funzione di questo modulo.

import { getSupabaseServiceClient } from '@/lib/supabase/server';

// ── Whitelist colonne SELECT per admin review ─────────────────────────────────
// Esclude `payload` — contiene dati raw dall'upload HR/welfare (Gate 3).
// Gate 2.3 Step 2 completo: review route usa fn_admin_uef_review() per Case B.
// Questo set rimane la whitelist per queryUEFBatchMeta() (altri lettori).
// AGGIORNARE SOLO se una nuova colonna è verificata non-PII.

export const ALLOWED_UEF_REVIEW_COLUMNS = new Set([
  'id',
  'tenant_id',
  'batch_id',
  'reporting_period',
  'raw_name',
  'eligibility',
  'primary_pillar',
  'action_family',
  'event_nature',
  'approved_for_scoring',
  'approved_for_bti_governance',
  'approved_for_impact_units',
  'data_completeness_score',
  'missing_fields',
  'review_status',
  'reviewer_notes',
  'reviewed_by',
  'reviewed_at',
  'created_at',
  'updated_at',
  // ESCLUSO deliberatamente: `payload` — dati raw ingestion, potenzialmente PII
]);

export function assertUEFReviewColumns(columns: string[]): void {
  const forbidden = columns.filter((c) => !ALLOWED_UEF_REVIEW_COLUMNS.has(c));
  if (forbidden.length > 0) {
    throw new Error(
      `uef-service-key: colonne non ammesse per admin review: ${forbidden.join(', ')}. ` +
      `Il campo payload non è restituibile via queryUEFBatchMeta (Gate 3 / Gate 2.3). ` +
      `Aggiornare ALLOWED_UEF_REVIEW_COLUMNS solo se la colonna è verificata non-PII.`,
    );
  }
}

// ── Query batch meta (senza payload) ─────────────────────────────────────────

export interface UEFBatchQueryOptions {
  batchId: string;
  columns?: string[];
  limit?: number;
}

export interface UEFBatchMetaRow {
  id: string;
  tenant_id: string;
  batch_id: string;
  reporting_period: string;
  raw_name: string;
  eligibility: string;
  primary_pillar: string | null;
  action_family: string | null;
  event_nature: string | null;
  approved_for_scoring: boolean;
  approved_for_bti_governance: boolean;
  approved_for_impact_units: boolean;
  data_completeness_score: number;
  missing_fields: string[];
  review_status: string;
  reviewer_notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
  // payload intentionally absent
}

export async function queryUEFBatchMeta(
  options: UEFBatchQueryOptions,
): Promise<{ data: UEFBatchMetaRow[]; error: null } | { data: null; error: string }> {
  const requestedColumns = options.columns ?? Array.from(ALLOWED_UEF_REVIEW_COLUMNS);
  assertUEFReviewColumns(requestedColumns);

  try {
    const sc = getSupabaseServiceClient();
    let query = sc
      .schema('analytics')
      .from('uef_record')
      .select(requestedColumns.join(', '))
      .eq('batch_id', options.batchId);

    if (options.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;
    if (error) return { data: null, error: error.message };
    return { data: (data ?? []) as unknown as UEFBatchMetaRow[], error: null };
  } catch (e) {
    return { data: null, error: (e as Error).message };
  }
}

// ── Count esistente (idempotency check) ───────────────────────────────────────

export async function countUEFCandidates(
  batchId: string,
): Promise<{ count: number; error: null } | { data: null; error: string }> {
  try {
    const sc = getSupabaseServiceClient();
    const { count, error } = await sc
      .schema('analytics')
      .from('uef_record')
      .select('id', { count: 'exact', head: true })
      .eq('batch_id', batchId);

    if (error) return { data: null, error: error.message };
    return { count: count ?? 0, error: null };
  } catch (e) {
    return { data: null, error: (e as Error).message };
  }
}
