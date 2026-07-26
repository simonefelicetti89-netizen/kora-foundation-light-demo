// app/api/company/workers/aggregate/route.ts
// B104: Company-facing worker aggregate endpoint.
// B152-B: Migrated to getSupabaseServerClient + analytics.fn_company_worker_status()
//         (company-safe aggregation layer, migration 015).
//
// PRIVACY CONTRACT (absolute, non-negotiable):
//   - Returns ONLY aggregate counts: total, invited, active, pending, disabled, coveragePct
//   - NO individual worker rows, NO worker_ref, NO auth_user_id, NO workerIds
//   - Reads from analytics.fn_company_worker_status() — SECURITY DEFINER, postgres-owned
//   - Tenant isolation enforced in SQL via kora.tenant_id() — not in application code
//   - tenantId is read from session app_metadata ONLY — never from request params
//
// Callable by: COMPANY_ADMIN (own tenant only) — B143: COMPANY_VIEWER rimosso.

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { requireCompanyUser, isKoraAuthError } from '@/lib/auth/kora-session';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = await requireCompanyUser(request);
  if (isKoraAuthError(auth)) return auth;

  const db = await getSupabaseServerClient();

  // analytics.fn_company_worker_status() — SECURITY DEFINER, reads personal.worker_identity.
  // Tenant isolation: kora.tenant_id() in SQL reads caller's JWT. Returns TABLE (one aggregate row).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (db.schema('analytics') as any).rpc('fn_company_worker_status');

  if (error) return NextResponse.json({ error: 'Impossibile recuperare i dati.' }, { status: 500 });

  // Function returns a TABLE — data is an array of one element

  const row = (Array.isArray(data) ? data[0] : data) as Record<string, unknown> | null ?? {};

  return NextResponse.json({
    ok: true,
    // PRIVACY: aggregate only — no individual worker data
    aggregate: {
      total:       Number(row['total_workers'] ?? 0),
      invited:     Number(row['invited']       ?? 0),
      active:      Number(row['active']        ?? 0),
      pending:     Number(row['pending']       ?? 0),
      disabled:    Number(row['disabled']      ?? 0),
      coveragePct: Number(row['coverage_pct']  ?? 0),
    },
  });
}
