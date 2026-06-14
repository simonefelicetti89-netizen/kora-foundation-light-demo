// app/api/company/live-eligibility/route.ts
// GET /api/company/live-eligibility?period=<reporting_period>
//
// Returns aggregate eligibility counts and intelligence layer context for a
// live company's UEF + IU records.
// B152-B: Migrated to getSupabaseServerClient + analytics.v_company_uef_eligibility_summary
//         (company-safe aggregation layer, migration 015).
//
// Multi-period safety: v_company_uef_eligibility_summary returns one row per
// (tenant, reporting_period). When period is absent, the query orders by
// reporting_period DESC and takes the most recent row — never uses blind
// .maybeSingle() on a potentially multi-row result.
//
// Security:
//   - COMPANY_ADMIN only (requireCompanyUser) — B143: COMPANY_VIEWER rimosso.
//   - tenantId ALWAYS from session JWT (app_metadata.kora_tenant_id).
//   - NEVER accepts tenantId from query params or request body.
//   - Returns AGGREGATE counts only — no raw records, no pseudonym IDs.

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { requireCompanyUser, isKoraAuthError } from '@/lib/auth/kora-session';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export type LiveEligibilityContext = {
  eligibility: {
    eligible: number;
    limited: number;
    blocked: number;
    total: number;
    pending_review: number;
    approved_for_scoring: number;
    approved_for_impact_units: number;
    needs_more_data: number;
  };
  uef_review: {
    total: number;
    pending_count: number;
    approved_for_scoring_count: number;
    needs_more_data_count: number;
    rejected_count: number;
    review_completion_rate: number;
  };
  life_program_names: string[];
  iu_average_ev: number;
  reporting_period: string | null;
};

export async function GET(request: NextRequest) {
  const authResult = await requireCompanyUser(request);
  if (isKoraAuthError(authResult)) return authResult;

  const period = new URL(request.url).searchParams.get('period');

  const db = await getSupabaseServerClient();

  // v_company_uef_eligibility_summary — postgres-owned VIEW, bypasses FORCE RLS on analytics.uef_record.
  // Tenant isolation: kora.tenant_id() in view WHERE clause. One row per (tenant, reporting_period).
  // With period: exact match. Without period: order desc + limit 1 — avoids blind maybeSingle() on multi-row.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let q = (db.schema('analytics') as any)
    .from('v_company_uef_eligibility_summary')
    .select('*');

  if (period) {
    q = q.eq('reporting_period', period);
  } else {
    q = q.order('reporting_period', { ascending: false }).limit(1);
  }

  const { data: row, error } = await q.maybeSingle();

  if (error) {
    return NextResponse.json({ error: 'Errore lettura UEF records.' }, { status: 500 });
  }

  if (!row) {
    const empty: LiveEligibilityContext = {
      eligibility: {
        eligible: 0, limited: 0, blocked: 0, total: 0,
        pending_review: 0, approved_for_scoring: 0,
        approved_for_impact_units: 0, needs_more_data: 0,
      },
      uef_review: {
        total: 0, pending_count: 0, approved_for_scoring_count: 0,
        needs_more_data_count: 0, rejected_count: 0, review_completion_rate: 0,
      },
      life_program_names: [],
      iu_average_ev: 0,
      reporting_period: period,
    };
    return NextResponse.json(empty);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const r = row as Record<string, any>;

  // life_program_names: array_agg returns null if no LIFE records — normalize to string[]
  const lifeProgramNames: string[] = Array.isArray(r['life_program_names'])
    ? (r['life_program_names'] as unknown[]).filter((n): n is string => typeof n === 'string')
    : [];

  const result: LiveEligibilityContext = {
    eligibility: {
      eligible:                  Number(r['eligible_count']                ?? 0),
      limited:                   Number(r['limited_count']                 ?? 0),
      blocked:                   Number(r['blocked_count']                 ?? 0),
      total:                     Number(r['total_uef_records']             ?? 0),
      pending_review:            Number(r['pending_review_count']          ?? 0),
      approved_for_scoring:      Number(r['approved_for_scoring_count']    ?? 0),
      approved_for_impact_units: Number(r['approved_for_impact_units_count'] ?? 0),
      needs_more_data:           Number(r['needs_more_data_count']         ?? 0),
    },
    uef_review: {
      total:                      Number(r['total_uef_records']            ?? 0),
      pending_count:              Number(r['pending_review_count']         ?? 0),
      approved_for_scoring_count: Number(r['approved_for_scoring_count']   ?? 0),
      needs_more_data_count:      Number(r['needs_more_data_count']        ?? 0),
      rejected_count:             Number(r['rejected_count']               ?? 0),
      review_completion_rate:     Number(r['review_completion_rate']       ?? 0),
    },
    life_program_names: lifeProgramNames,
    iu_average_ev:      Number(r['iu_average_ev'] ?? 0),
    reporting_period:   (r['reporting_period'] as string | null) ?? period,
  };

  return NextResponse.json(result);
}
