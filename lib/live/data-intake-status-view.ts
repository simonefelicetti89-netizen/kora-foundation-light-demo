// lib/live/data-intake-status-view.ts
// B-TRUTH CompanyDataIntakeService Canonical Migration — canonical live view
// over analytics.source_batch + analytics.uef_record, replacing
// services/company-data-intake/CompanyDataIntakeService.ts's synthetic
// getDataReadinessSummary() for its two real callers
// (app/admin/pipeline/_components/PilotLifecycleClient.tsx and
// services/report-factory/ReportFactoryService.ts).
//
// Field disposition (only the 3 fields actually consumed by the 2 real
// callers, traced by direct usage, not inferred from the legacy interface —
// no opportunistic broadening):
//   KEEP/DERIVE batchCount (COUNT of source_batch rows for the tenant),
//     intakeStatus (derived below), pendingReviewCount (COUNT of
//     analytics.uef_record WHERE review_status='pending_review' — same
//     query shape app/api/admin/uef/review/route.ts's own GET handler
//     already uses for its own "pending" tally, not a new query pattern).
//   DROP (LEGACY_SYNTHETIC_ONLY, never read by either real caller):
//     fiscal_plan_status, total_rows, ready_for_ingestion_rows,
//     eligible/limited/blocked/structural_policy candidate counts,
//     missing_fields_count, data_quality_score, kora_index_available,
//     decision_pack_available, next_action, limitations — all synthetic
//     fiscal-plan/raw-row classification concepts with no canonical
//     source and no real caller ever read them.
//
// intakeStatus derivation (batch-selection rule: latest source_batch by
// created_at — the same "pick the most recent row" precedent already used
// throughout lib/live and the canonical routes, e.g.
// app/api/admin/scoring/run-approved-batch/route.ts's own workforce_baseline
// lookup, `.order('created_at', { ascending: false }).limit(1)`):
//   no batch exists                          -> 'not_started'
//   latest batch_status === 'approved'        -> 'ready_for_ingestion'
//   pendingReviewCount > 0                    -> 'validation_required'
//   otherwise (batch exists, nothing pending, not yet approved) -> 'in_progress'
//
// The legacy 'blocked_missing_required_fields' status is intentionally NOT
// reproduced: it was the synthetic service's own post-hoc heuristic for
// catching malformed rows AFTER they were already "uploaded". The real
// canonical upload boundary (app/api/admin/data-intake/upload-preview +
// accept) rejects malformed/incomplete files at PII-scan/validation time,
// before a source_batch row is ever created — the concern this legacy
// status existed for is structurally handled earlier in the real pipeline,
// not reproduced here. Neither real caller's behavior depends on this
// specific value ever firing (see PART 4/8 of this migration's own design
// notes) — this is not a fabricated threshold, it is the honest absence of
// a legacy heuristic that no longer has a job to do.
//
// tenant_kind is never read here — this view is identical for a
// tenant_kind='TEST' tenant (KoraTest Srl) and any tenant_kind='LIVE' tenant.

export type CanonicalIntakeStatus = 'not_started' | 'validation_required' | 'ready_for_ingestion' | 'in_progress';

export interface CanonicalDataIntakeStatus {
  batchCount: number;
  intakeStatus: CanonicalIntakeStatus;
  pendingReviewCount: number;
}

export interface SourceBatchStatusRow {
  batch_status: string;
  created_at: string;
}

export function buildDataIntakeStatusView(
  batches: SourceBatchStatusRow[],
  pendingReviewCount: number,
): CanonicalDataIntakeStatus {
  const batchCount = batches.length;

  if (batchCount === 0) {
    return { batchCount: 0, intakeStatus: 'not_started', pendingReviewCount: 0 };
  }

  const latest = [...batches].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  )[0];

  let intakeStatus: CanonicalIntakeStatus;
  if (latest.batch_status === 'approved') {
    intakeStatus = 'ready_for_ingestion';
  } else if (pendingReviewCount > 0) {
    intakeStatus = 'validation_required';
  } else {
    intakeStatus = 'in_progress';
  }

  return { batchCount, intakeStatus, pendingReviewCount };
}
