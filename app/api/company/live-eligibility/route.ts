// app/api/company/live-eligibility/route.ts
// GET /api/company/live-eligibility?period=<reporting_period>
//
// Returns aggregate eligibility counts and intelligence layer context for a
// live company's UEF + IU records. Used by /company/kora-index to populate:
//   - EligibilityGatePanel (eligible/limited/blocked counts)
//   - EvidenceReliabilityIntelligenceService (review stats + average EV)
//   - LifeDiversityService (LIFE program names for subcategory classification)
//
// Security:
//   - COMPANY_ADMIN / COMPANY_VIEWER only (requireCompanyUser).
//   - tenantId ALWAYS from session JWT (app_metadata.kora_tenant_id).
//   - NEVER accepts tenantId from query params or request body.
//   - Returns AGGREGATE counts only — no raw records, no pseudonym IDs.

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { requireCompanyUser, isKoraAuthError } from '@/lib/auth/kora-session';
import { getSupabaseServiceClient } from '@/lib/supabase/server';

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

  const { tenantId } = authResult;
  const period = request.nextUrl.searchParams.get('period');

  const db = getSupabaseServiceClient();

  // ── 1. UEF records — aggregate only, no raw payload, no pseudonym IDs ──────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let uefQuery = (db.schema('analytics') as any)
    .from('uef_record')
    .select('eligibility, review_status, approved_for_scoring, approved_for_impact_units, raw_name, primary_pillar')
    .eq('tenant_id', tenantId);

  if (period) uefQuery = uefQuery.eq('reporting_period', period);

  const { data: uefRows, error: uefErr } = await uefQuery;

  if (uefErr) {
    return NextResponse.json({ error: 'Errore lettura UEF records.' }, { status: 500 });
  }

  type UefRow = {
    eligibility: string;
    review_status: string;
    approved_for_scoring: boolean;
    approved_for_impact_units: boolean;
    raw_name: string;
    primary_pillar: string | null;
  };

  const rows = (uefRows ?? []) as UefRow[];

  const eligible             = rows.filter((r) => r.eligibility === 'eligible').length;
  const limited              = rows.filter((r) => r.eligibility === 'limited').length;
  const blocked              = rows.filter((r) => r.eligibility === 'blocked').length;
  const pendingReview        = rows.filter((r) => r.review_status === 'pending').length;
  const approvedForScoring   = rows.filter((r) => r.approved_for_scoring).length;
  const approvedForIU        = rows.filter((r) => r.approved_for_impact_units).length;
  const needsMoreData        = rows.filter((r) => r.review_status === 'needs_more_data').length;
  const rejected             = rows.filter((r) => r.review_status === 'rejected').length;
  const reviewedCount        = rows.length - pendingReview;
  const reviewCompletionRate = rows.length > 0 ? reviewedCount / rows.length : 0;

  // LIFE program names: used by LifeDiversityService.computeFromProgramNames().
  // Only raw_name from LIFE-pillar records — no worker-identifying information.
  const lifeProgramNames = rows
    .filter((r) => r.primary_pillar === 'LIFE' && r.raw_name)
    .map((r) => r.raw_name);

  // ── 2. Impact Unit records — average EV factor only ───────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let iuQuery = (db.schema('analytics') as any)
    .from('impact_unit')
    .select('ev')
    .eq('tenant_id', tenantId);

  if (period) iuQuery = iuQuery.eq('reporting_period', period);

  const { data: iuRows } = await iuQuery;
  let iuAverageEv = 0;
  if (iuRows && iuRows.length > 0) {
    const evValues = (iuRows as Array<{ ev: number }>).map((r) => r.ev);
    iuAverageEv = evValues.reduce((a, b) => a + b, 0) / evValues.length;
  }

  const result: LiveEligibilityContext = {
    eligibility: {
      eligible,
      limited,
      blocked,
      total:                   rows.length,
      pending_review:          pendingReview,
      approved_for_scoring:    approvedForScoring,
      approved_for_impact_units: approvedForIU,
      needs_more_data:         needsMoreData,
    },
    uef_review: {
      total:                      rows.length,
      pending_count:              pendingReview,
      approved_for_scoring_count: approvedForScoring,
      needs_more_data_count:      needsMoreData,
      rejected_count:             rejected,
      review_completion_rate:     reviewCompletionRate,
    },
    life_program_names: lifeProgramNames,
    iu_average_ev:      iuAverageEv,
    reporting_period:   period,
  };

  return NextResponse.json(result);
}
