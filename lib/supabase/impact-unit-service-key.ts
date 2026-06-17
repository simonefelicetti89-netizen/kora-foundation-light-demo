// lib/supabase/impact-unit-service-key.ts
//
// Service-role client scoped a lettura pipeline di analytics.impact_unit.
// Pattern parallelo a storage-service-key.ts e worker-provisioning-service-key.ts.
//
// PERCHÉ ESISTE:
//   Post-027, analytics.impact_unit non ha più policy RLS per KORA_ADMIN
//   (decisione A — i record sono per-worker-event, granularità individuale).
//   KORA service team ha però accesso legittimo per pipeline monitoring e
//   debugging scoring — i record IU non contengono worker_identity diretta.
//
// COSA NON DEVE FARE:
//   - NON esporre il client Supabase direttamente.
//   - NON inserire, aggiornare o cancellare record IU: pipeline write
//     avviene solo via scoring engine, non via route admin.
//   - NON restituire colonne che linkano worker identity (worker_ref,
//     worker_id, auth_user_id) — questo modulo filtra a livello di
//     colonne selezionabili.
//
// INVARIANTE:
//   Solo SELECT. Nessuna operazione di scrittura da questo modulo.
//   Le colonne restituibili sono whitelistate in ALLOWED_IU_SELECT_COLUMNS.

import { getSupabaseServiceClient } from '@/lib/supabase/server';

// ── Whitelist colonne SELECT ───────────────────────────────────────────────────
// Esclude esplicitamente qualsiasi colonna che link a worker identity.
// AGGIORNARE SOLO se una nuova colonna è verificata non-PII.

export const ALLOWED_IU_SELECT_COLUMNS = new Set([
  'id',
  'uef_record_id',
  'source_batch_id',
  'tenant_id',
  'reporting_period',
  'nm',
  'bc',
  'cq',
  'ev',
  'cf',
  'agf',
  'impact_units_total',
  'life_iu',
  'growth_iu',
  'connection_iu',
  'impact_iu',
  'legacy_iu',
  'computed',
  'exclusion_reason',
  'factor_trace',
  'methodology_version',
  'calibration_status',
  'created_at',
  // ESCLUSI deliberatamente: worker_ref, worker_id, auth_user_id, pseudonym_id
]);

export function assertIUSelectColumns(columns: string[]): void {
  const forbidden = columns.filter((c) => !ALLOWED_IU_SELECT_COLUMNS.has(c));
  if (forbidden.length > 0) {
    throw new Error(
      `impact-unit-service-key: colonne non ammesse in SELECT: ${forbidden.join(', ')}. ` +
      `Aggiornare ALLOWED_IU_SELECT_COLUMNS solo se la colonna è verificata non-PII.`,
    );
  }
}

// ── Operazioni permesse ────────────────────────────────────────────────────────

export interface IUQueryOptions {
  tenantId: string;
  reportingPeriod: string;
  columns: string[];
  orderBy?: { column: string; ascending: boolean };
  limit?: number;
}

export async function queryImpactUnits(
  options: IUQueryOptions,
): Promise<{ data: Record<string, unknown>[]; error: null } | { data: null; error: string }> {
  assertIUSelectColumns(options.columns);

  try {
    const sc = getSupabaseServiceClient();
    let query = sc
      .schema('analytics')
      .from('impact_unit')
      .select(options.columns.join(', '))
      .eq('tenant_id', options.tenantId)
      .eq('reporting_period', options.reportingPeriod);

    if (options.orderBy) {
      query = query.order(options.orderBy.column, { ascending: options.orderBy.ascending });
    }
    if (options.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;

    if (error) return { data: null, error: error.message };

    if (!data || data.length === 0) {
      // Explicit warning surface: empty result from IU query could mask a pipeline failure
      // or a silent RLS-like deny on a future config change.
      console.warn(
        `[impact-unit-service-key] queryImpactUnits returned 0 rows for tenant=${options.tenantId} period=${options.reportingPeriod}`,
      );
    }

    return { data: (data ?? []) as unknown as Record<string, unknown>[], error: null };
  } catch (e) {
    return { data: null, error: (e as Error).message };
  }
}

export interface IUPeriodQueryOptions {
  tenantId: string;
}

export async function queryImpactUnitPeriods(
  options: IUPeriodQueryOptions,
): Promise<{ data: string[]; error: null } | { data: null; error: string }> {
  try {
    const sc = getSupabaseServiceClient();
    const { data, error } = await sc
      .schema('analytics')
      .from('impact_unit')
      .select('reporting_period')
      .eq('tenant_id', options.tenantId)
      .order('reporting_period', { ascending: false });

    if (error) return { data: null, error: error.message };
    const periods = (data ?? []).map((r: { reporting_period: string }) => r.reporting_period);
    return { data: periods, error: null };
  } catch (e) {
    return { data: null, error: (e as Error).message };
  }
}
