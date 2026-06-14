// app/api/company/workers/aggregate/route.ts
// B104: Company-facing worker aggregate endpoint.
//
// PRIVACY CONTRACT (absolute, non-negotiable):
//   - Returns ONLY aggregate counts: total, invited, active, pending, disabled, coverage_pct
//   - NO individual worker rows, NO worker_ref, NO auth_user_id, NO workerIds
//   - Uses service-role client — company JWT cannot read personal.worker_identity (RLS: no policy)
//   - tenantId is read from session app_metadata ONLY — never from request params
//
// Callable by: COMPANY_ADMIN (own tenant only) — B143: COMPANY_VIEWER rimosso.

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { requireCompanyUser, isKoraAuthError } from '@/lib/auth/kora-session';
import { getSupabaseServiceClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = await requireCompanyUser(request);
  if (isKoraAuthError(auth)) return auth;

  // tenantId always from session — never from query params
  const { tenantId } = auth;

  const db = getSupabaseServiceClient();

  // Aggregate query — returns counts only, never individual rows
  const { data: rows, error } = await db.schema('personal').from('worker_identity')
    .select('status')
    .eq('tenant_id', tenantId);

  if (error) return NextResponse.json({ error: 'Impossibile recuperare i dati.' }, { status: 500 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const all = (rows ?? []) as any[];
  const total    = all.length;
  const invited  = all.filter(r => r.status === 'invited').length;
  const active   = all.filter(r => r.status === 'active').length;
  const pending  = all.filter(r => r.status === 'pending').length;
  const disabled = all.filter(r => r.status === 'disabled').length;

  // coverage_pct = active / total (0 if no workers)
  const coveragePct = total > 0 ? Math.round((active / total) * 100) : 0;

  return NextResponse.json({
    ok: true,
    // PRIVACY: aggregate only — no individual worker data
    aggregate: {
      total,
      invited,
      active,
      pending,
      disabled,
      coveragePct,
    },
  });
}
