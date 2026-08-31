// lib/live/workforce-baseline-view.ts
// B-TRUTH first canonical seed group — canonical live view over
// personal.workforce_baseline, replacing services/workforce-baseline/
// WorkforceBaselineService.ts's synthetic data/synthetic/workforce-baseline.json.
//
// Field disposition (ratified, same KEEP/DERIVE/DROP/DEFER methodology used
// for CC-052's Commons migration — no new schema invented either time):
//   KEEP/DERIVE total_workers, segment_breakdown -> aggregateGroups (group
//     name + count + share, computed from the JSONB already written by
//     lib/live/workforce-baseline.ts's persistWorkforceBaseline), minimum
//     company threshold (30, matching CompanyOnboardingService's own
//     isFoundationLightEligible rule), minimum_group_size (stored, N>=10).
//   DROP/DEFER upload_batch (row-level upload-process stats — Ingestion
//     domain territory, out of this task's scope, not tracked by the live
//     table), baseline_completeness_score (editorial score, no live
//     source), warnings/limitations (free text, no live source),
//     readiness.activation_reach_ready / distribution_equity_ready
//     (would require cross-referencing analytics.activation_result, a
//     genuinely separate table this task does not touch), next_action
//     (editorial text). No placeholder values invented for any of these —
//     they are simply absent from the live view, exactly as CC-052 dropped
//     Commons' activation_potential/verification_possible.
//   privacy_safe_for_company_view is DERIVED, not dropped: the JSONB
//     already IS the post-suppression "safe" map (persistWorkforceBaseline
//     suppresses before writing) — always true by construction; recorded
//     explicitly rather than silently assumed.

export interface WorkforceBaselineGroupView {
  group_id: string;
  dimension_type: string;
  group_label: string;
  employee_count: number;
  share_of_workforce: number;
}

export interface WorkforceBaselineView {
  tenantId: string;
  tenantCode: string;
  companyName: string;
  reportingPeriod: string;
  totalWorkers: number;
  minimumCompanyThreshold: number;
  minimumCompanyThresholdMet: boolean;
  minimumGroupSize: number;
  aggregateGroups: WorkforceBaselineGroupView[];
  privacySafeForCompanyView: true;
  createdAt: string;
  createdBy: string;
}

export const FOUNDATION_LIGHT_MINIMUM_WORKERS = 30;

export interface WorkforceBaselineRow {
  tenant_id: string;
  reporting_period: string;
  total_workers: number;
  segment_breakdown: Record<string, Record<string, number>>;
  minimum_group_size: number;
  created_at: string;
  created_by: string;
}

export interface TenantIdentity {
  tenant_code: string;
  company_name: string;
}

export function buildWorkforceBaselineView(
  row: WorkforceBaselineRow,
  tenant: TenantIdentity,
): WorkforceBaselineView {
  const totalWorkers = row.total_workers;
  const aggregateGroups: WorkforceBaselineGroupView[] = [];

  for (const [dimensionType, groups] of Object.entries(row.segment_breakdown ?? {})) {
    for (const [groupLabel, employeeCount] of Object.entries(groups ?? {})) {
      aggregateGroups.push({
        group_id: `${dimensionType}:${groupLabel}`,
        dimension_type: dimensionType,
        group_label: groupLabel,
        employee_count: employeeCount,
        share_of_workforce: totalWorkers > 0 ? employeeCount / totalWorkers : 0,
      });
    }
  }

  return {
    tenantId: row.tenant_id,
    tenantCode: tenant.tenant_code,
    companyName: tenant.company_name,
    reportingPeriod: row.reporting_period,
    totalWorkers,
    minimumCompanyThreshold: FOUNDATION_LIGHT_MINIMUM_WORKERS,
    minimumCompanyThresholdMet: totalWorkers >= FOUNDATION_LIGHT_MINIMUM_WORKERS,
    minimumGroupSize: row.minimum_group_size,
    aggregateGroups,
    privacySafeForCompanyView: true,
    createdAt: row.created_at,
    createdBy: row.created_by,
  };
}
