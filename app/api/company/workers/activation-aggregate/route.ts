// app/api/company/workers/activation-aggregate/route.ts
// B109: Worker Experience MVP — company-facing participation aggregate.
// B109-B: Hardening — suppression shape standardized.
// B152-B: Migrated to getSupabaseServerClient + analytics.fn_company_activation_summary()
//         (company-safe aggregation layer, migration 015). Suppression N<10 now in SQL.
//
// PRIVACY CONTRACT (absolute, non-negotiable):
//   - Returns ONLY aggregate counts — never individual rows
//   - Suppression N<10 enforced in SQL by fn_company_activation_summary — not in TS
//   - Suppressed segments: { suppressed: true, suppression_reason, suppression_threshold }
//   - SAFE_AGGREGATION_THRESHOLD=10 enforced in SQL (migration 015, canonical lib/constants/kora.ts)
//   - Reads from analytics.fn_company_activation_summary() — SECURITY DEFINER, postgres-owned
//   - Tenant isolation enforced in SQL via kora.tenant_id() — not in application code
//   - tenantId always from session app_metadata — never from request params
//
// Callable by: COMPANY_ADMIN (own tenant only) — B143: COMPANY_VIEWER rimosso.

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { requireCompanyUser, isKoraAuthError } from '@/lib/auth/kora-session';
import { getSupabaseServerClient } from '@/lib/supabase/server';

type PillarBreakdownItem = {
  pillar: string;
  published_initiatives: number;
  total_participations: number | null;
  suppressed: boolean;
  suppression_threshold: number;
};

type ActivationSummaryFn = {
  total_published_initiatives: number;
  total_engagements: number | null;
  total_engagements_suppressed: boolean;
  pillar_breakdown: PillarBreakdownItem[];
  safe_aggregation_threshold: number;
  privacy_note: string;
};

export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = await requireCompanyUser(request);
  if (isKoraAuthError(auth)) return auth;

  const db = await getSupabaseServerClient();

  // analytics.fn_company_activation_summary() — SECURITY DEFINER.
  // Suppression N<10 → NULL enforced in SQL (BETWEEN 1 AND 9 THEN NULL).
  // p_period: NULL = all-time aggregate (worker_initiative has no reporting_period column yet).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (db.schema('analytics') as any)
    .rpc('fn_company_activation_summary', { p_period: null });

  if (error) {
    return NextResponse.json({ error: 'Errore nel recupero dati iniziative.' }, { status: 500 });
  }

  const fn = (data ?? {}) as ActivationSummaryFn;
  const threshold = fn.safe_aggregation_threshold ?? 10;

  // participation_summary: suppression comes from SQL (total_engagements_suppressed)
  const participationSummary = fn.total_engagements_suppressed
    ? { suppressed: true  as const, suppression_reason: 'privacy_threshold' as const, suppression_threshold: threshold }
    : { suppressed: false as const, value: fn.total_engagements ?? 0 };

  // pillar_breakdown: add suppression_reason for response shape backward compat
  const pillarBreakdown = (fn.pillar_breakdown ?? []).map(pb => {
    if (pb.suppressed) {
      return {
        pillar:                pb.pillar,
        published_initiatives: pb.published_initiatives,
        suppressed:            true  as const,
        suppression_reason:    'privacy_threshold' as const,
        suppression_threshold: pb.suppression_threshold,
      };
    }
    return {
      pillar:                pb.pillar,
      published_initiatives: pb.published_initiatives,
      suppressed:            false as const,
      total_participations:  pb.total_participations ?? 0,
    };
  });

  return NextResponse.json({
    ok: true,
    aggregate: {
      total_published_initiatives: fn.total_published_initiatives ?? 0,
      participation_summary:       participationSummary,
      pillar_breakdown:            pillarBreakdown,
      privacy_note:                fn.privacy_note ?? '',
    },
  });
}
