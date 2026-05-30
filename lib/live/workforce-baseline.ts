// lib/live/workforce-baseline.ts
// Canonical persistence function for personal.workforce_baseline.
//
// PRIVACY INVARIANT: All writers of personal.workforce_baseline MUST use this
// function. It enforces N≥10 on segment_breakdown before any DB insert.
// Never call personal.workforce_baseline insert directly — use this instead.
//
// N≥10 rule: employer-visible segment maps must not expose groups < 10 workers.
// Groups below threshold are suppressed via suppressNestedGroupMap():
//   - Groups ≥10: passed through unchanged
//   - Groups <10: removed; sum bucketed into _suppressed if bucket itself ≥10
//   - If bucket sum <10: fully suppressed (no bucket key created)

import {
  suppressNestedGroupMap,
  DEFAULT_MIN_GROUP_SIZE,
  type NestedSuppressionResult,
} from '@/lib/privacy/group-threshold';

export interface WorkforceBaselineParams {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any;
  tenantId: string;
  reportingPeriod: string;
  totalWorkers: number;
  rawSegmentBreakdown: Record<string, Record<string, number>>;
  createdBy: string;
  minGroupSize?: number;
}

export interface WorkforceBaselineResult {
  id: string;
  tenantId: string;
  reportingPeriod: string;
  totalWorkers: number;
  safeSegmentBreakdown: Record<string, Record<string, number>>;
  suppression: NestedSuppressionResult;
  privacyThresholdApplied: true;
  minimumGroupSize: number;
  // Summary for audit log: dimensions where suppression occurred (no group names).
  suppressionAuditSummary: Array<{
    dimension: string;
    hadSuppression: boolean;
    suppressedGroupCount: number;
    suppressedTotal: number;
    bucketCreated: boolean;
  }>;
}

export async function persistWorkforceBaseline(
  params: WorkforceBaselineParams,
): Promise<WorkforceBaselineResult> {
  const {
    db,
    tenantId,
    reportingPeriod,
    totalWorkers,
    rawSegmentBreakdown,
    createdBy,
    minGroupSize = DEFAULT_MIN_GROUP_SIZE,
  } = params;

  const suppression = suppressNestedGroupMap(rawSegmentBreakdown, minGroupSize);
  const safeSegmentBreakdown = suppression.safe;

  const { data, error } = await db
    .schema('personal')
    .from('workforce_baseline')
    .upsert(
      {
        tenant_id:                 tenantId,
        reporting_period:          reportingPeriod,
        total_workers:             totalWorkers,
        segment_breakdown:         safeSegmentBreakdown,
        privacy_threshold_applied: true,
        minimum_group_size:        minGroupSize,
        created_by:                createdBy,
      },
      { onConflict: 'tenant_id,reporting_period' },
    )
    .select('id')
    .single();

  if (error || !data) {
    throw new Error(`[KORA] persistWorkforceBaseline: ${error?.message ?? 'no data returned'}`);
  }

  const suppressionAuditSummary = Object.entries(suppression.suppressionByDimension).map(
    ([dimension, result]) => ({
      dimension,
      hadSuppression:      !result.allSafe,
      suppressedGroupCount: result.suppressedGroupCount,
      suppressedTotal:     result.suppressedTotal,
      bucketCreated:       result.hasSuppressedBucket,
    }),
  );

  return {
    id: (data as { id: string }).id,
    tenantId,
    reportingPeriod,
    totalWorkers,
    safeSegmentBreakdown,
    suppression,
    privacyThresholdApplied: true,
    minimumGroupSize: minGroupSize,
    suppressionAuditSummary,
  };
}
