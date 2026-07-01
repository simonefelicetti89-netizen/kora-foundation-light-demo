// app/api/company/kora-index/history/route.ts
// P0-2: KORA Index period history for authenticated company.
//
// GET /api/company/kora-index/history
//
// Tenant ALWAYS derived from authenticated session (kora_tenant_id in app_metadata).
// NEVER accepts tenantId from query params or request body.
//
// Returns: ordered list of historical KORA Index scoring periods for the tenant.
// If no periods: empty array (not an error).
// If one period: array with one entry, flag first_period=true.
// If multiple: ordered ascending by reporting_period, each entry includes delta vs previous.
//
// Output is aggregate-only — no individual worker data at any level.
// Individual PIB, worker_id, pseudonym_id are never included.

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { requireCompanyUser, isKoraAuthError } from '@/lib/auth/kora-session';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export interface KoraIndexPeriodEntry {
  reporting_period:    string;
  kora_index_value:    number;
  confidence_score:    number | null;
  safeguard_status:    string | null;
  activation_rate:     number | null;
  is_current:          boolean;
  scored_at:           string;
  /** Delta vs immediately preceding period (null for first period) */
  delta:               number | null;
}

export interface KoraIndexHistoryResponse {
  ok:              boolean;
  tenantId:        string;
  periods:         KoraIndexPeriodEntry[];
  period_count:    number;
  first_period:    boolean;
  has_trend:       boolean;
  methodology_note: string;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = await requireCompanyUser(request);
  if (isKoraAuthError(auth)) return auth;

  const { tenantId } = auth;

  const db = await getSupabaseServerClient();

  // Fetch all scoring results for this tenant, ordered ascending by period.
  // We need all rows (not just is_current) to build the history.
  const { data: rows, error } = await db
    .schema('analytics')
    .from('kora_index_result')
    .select(`
      reporting_period,
      kora_index_value,
      safeguard_status,
      is_current,
      created_at,
      confidence_result:confidence_result_id (
        confidence_score
      ),
      activation_result:activation_result_id (
        activation_rate
      )
    `)
    .eq('tenant_id', tenantId)
    .order('reporting_period', { ascending: true })
    .limit(50);

  if (error) {
    return NextResponse.json({ ok: false, error: 'Errore recupero storico KORA Index.' }, { status: 500 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawRows = (rows ?? []) as any[];

  const periods: KoraIndexPeriodEntry[] = rawRows.map((row, idx) => {
    const prevValue = idx > 0 ? (rawRows[idx - 1].kora_index_value as number | null) : null;
    const currentValue = row.kora_index_value as number | null;
    const delta = (prevValue !== null && currentValue !== null)
      ? +(currentValue - prevValue).toFixed(1)
      : null;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const confResult = (row.confidence_result as any) ?? null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const actResult  = (row.activation_result  as any) ?? null;

    return {
      reporting_period: row.reporting_period as string,
      kora_index_value: typeof currentValue === 'number' ? +currentValue.toFixed(1) : 0,
      confidence_score: confResult?.confidence_score != null
        ? +(Number(confResult.confidence_score) * 100).toFixed(0)
        : null,
      safeguard_status: (row.safeguard_status as string | null) ?? null,
      activation_rate:  actResult?.activation_rate != null
        ? +(Number(actResult.activation_rate) * 100).toFixed(1)
        : null,
      is_current: !!(row.is_current),
      scored_at:  row.created_at as string,
      delta,
    };
  });

  const periodCount = periods.length;

  return NextResponse.json({
    ok:              true,
    tenantId,
    periods,
    period_count:    periodCount,
    first_period:    periodCount === 1,
    has_trend:       periodCount >= 2,
    methodology_note: 'Storico KORA Index v3 — Dati aggregati · Nessun dato individuale · pre_empirical_calibration',
  } satisfies KoraIndexHistoryResponse);
}
