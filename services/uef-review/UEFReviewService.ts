import type {
  UEFReviewStatus,
  UEFReviewDecision,
  UEFReviewRecord,
  UEFReviewSummary,
  UEFAuditEvent,
  UEFAuditEventType,
  EligibilityClass,
  CalibrationStatus,
  IngestionReviewStatus,
} from '@/lib/types';
import type { PipelineAnalyzedRow } from '@/services/ingestion-pipeline/IngestionPipelineService';
import { ingestionPipelineService } from '@/services/ingestion-pipeline/IngestionPipelineService';
import { getMethodologyVersion, getCalibrationStatus } from '@/lib/methodology-config/v0.1';

// ── Pipeline → Review status mapping ────────────────────────────────────────────
// Deterministic demo state: pipeline classification drives review status.
// pending_review → human decision still required.
// All others are pre-resolved by the methodology rules.

function pipelineToReviewStatus(
  pipelineStatus: IngestionReviewStatus,
): UEFReviewStatus {
  if (pipelineStatus === 'blocked_gate')   return 'blocked_by_design';
  if (pipelineStatus === 'limited_gate')   return 'approved_for_bti_governance';
  if (pipelineStatus === 'pending_review') return 'pending';
  return 'approved_for_scoring';
}

function toDecision(status: UEFReviewStatus): UEFReviewDecision | null {
  if (status === 'approved_for_scoring')       return 'approve_scoring';
  if (status === 'approved_for_bti_governance') return 'approve_bti_governance';
  if (status === 'blocked_by_design')          return 'mark_blocked';
  return null;
}

function toNotes(status: UEFReviewStatus, row: PipelineAnalyzedRow): string | null {
  if (status === 'pending')                    return null;
  if (status === 'approved_for_scoring')       return 'Classificazione AI confermata. Record idoneo per Impact Units.';
  if (status === 'approved_for_bti_governance') return 'Economic Relief — confermato. Tracciato nel BTI engine come economic_relief_spend.';
  if (status === 'blocked_by_design')          return row.classification.blocked_reason ?? 'Compliance obbligatoria — 0 IU per progettazione.';
  return null;
}

function buildReviewRecord(row: PipelineAnalyzedRow): UEFReviewRecord {
  const reviewStatus = pipelineToReviewStatus(row.review_status);
  const decision     = toDecision(reviewStatus);
  const notes        = toNotes(reviewStatus, row);
  const isReviewed   = reviewStatus !== 'pending';

  return {
    id:                          `uef-rev-${row.raw.id}`,
    pipeline_row_id:             row.raw.id,
    raw_name:                    row.raw.raw_name,
    action_family:               row.classification.action_family,
    event_nature:                row.classification.event_nature,
    eligibility:                 row.classification.kora_eligibility,
    primary_pillar:              row.classification.primary_pillar,
    review_status:               reviewStatus,
    original_pipeline_status:    row.review_status,
    approved_for_scoring:        row.kora_ready.approved_for_scoring,
    approved_for_bti_governance: row.kora_ready.approved_for_bti_governance,
    approved_for_impact_units:   row.kora_ready.approved_for_impact_units,
    review_decision:             decision,
    reviewer_notes:              notes,
    reviewed_by:                 isReviewed ? 'ADVISOR' : null,
    reviewed_at:                 isReviewed ? '2025-12-10T09:15:00Z' : null,
    data_completeness_score:     row.normalized.data_completeness_score,
    missing_fields:              row.normalized.missing_fields,
    additional_questions:        row.missing_data_questions,
    kora_ready:                  row.kora_ready,
    foundation_light_stub:       true,
  };
}

function buildAuditTrail(records: UEFReviewRecord[]): UEFAuditEvent[] {
  const events: UEFAuditEvent[] = [];

  // Pipeline classification events (2025-12-09)
  let ts = new Date('2025-12-09T14:00:00Z').getTime();
  for (const rec of records) {
    events.push({
      id:               `audit-pipeline-${rec.pipeline_row_id}`,
      timestamp:        new Date(ts).toISOString(),
      actor:            'pipeline',
      event_type:       'review_assigned',
      record_id:        rec.id,
      raw_name:         rec.raw_name,
      new_review_status: rec.review_status === 'pending' ? 'pending' : rec.review_status,
      notes:            `Pipeline: classificazione ${rec.eligibility} → ${rec.kora_ready.destination}`,
    });
    ts += 25000;
  }

  // Human reviewer decisions (2025-12-10)
  ts = new Date('2025-12-10T09:00:00Z').getTime();
  for (const rec of records) {
    if (rec.review_status === 'pending' || !rec.review_decision) continue;
    const eventType: UEFAuditEventType =
      rec.review_status === 'approved_for_scoring'       ? 'record_approved'
      : rec.review_status === 'blocked_by_design'        ? 'record_blocked'
      : 'review_decision_made';
    events.push({
      id:                     `audit-review-${rec.pipeline_row_id}`,
      timestamp:              new Date(ts).toISOString(),
      actor:                  'human_reviewer',
      event_type:             eventType,
      record_id:              rec.id,
      raw_name:               rec.raw_name,
      decision:               rec.review_decision,
      previous_review_status: 'pending',
      new_review_status:      rec.review_status,
      notes:                  rec.reviewer_notes ?? undefined,
      governance_flags: {
        approved_for_scoring:        rec.approved_for_scoring,
        approved_for_bti_governance: rec.approved_for_bti_governance,
        approved_for_impact_units:   rec.approved_for_impact_units,
      },
    });
    ts += 45000;
  }

  return events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

// ── Interface ────────────────────────────────────────────────────────────────────

export interface IUEFReviewService {
  getReviewRecords(): UEFReviewRecord[];
  getReviewSummary(): UEFReviewSummary;
  getRecordById(id: string): UEFReviewRecord | null;
  getRecordsByStatus(status: UEFReviewStatus): UEFReviewRecord[];
  getRecordsByEligibility(eligibility: EligibilityClass): UEFReviewRecord[];
  getRecordsNeedingData(): UEFReviewRecord[];
  getKoraReadyRecords(): UEFReviewRecord[];
  getImpactUnitReadyRecords(): UEFReviewRecord[];
  getBTIGovernanceReadyRecords(): UEFReviewRecord[];
  getAuditTrail(): UEFAuditEvent[];
  getAllReviewedPipelineRows(): PipelineAnalyzedRow[];
}

// ── Service ──────────────────────────────────────────────────────────────────────

export class UEFReviewService implements IUEFReviewService {
  private readonly methodologyVersion: string;
  private readonly calibrationStatus: CalibrationStatus;

  constructor() {
    this.methodologyVersion = getMethodologyVersion();
    this.calibrationStatus  = getCalibrationStatus() as CalibrationStatus;
  }

  getReviewRecords(): UEFReviewRecord[] {
    return ingestionPipelineService.analyzeBatch().map(buildReviewRecord);
  }

  getReviewSummary(): UEFReviewSummary {
    const records = this.getReviewRecords();
    const total   = records.length;
    const pending    = records.filter((r) => r.review_status === 'pending').length;
    const approvedSc = records.filter((r) => r.review_status === 'approved_for_scoring').length;
    const approvedBT = records.filter((r) => r.review_status === 'approved_for_bti_governance').length;
    const blocked    = records.filter((r) => r.review_status === 'blocked_by_design').length;
    const needsData  = records.filter((r) => r.review_status === 'needs_more_data').length;
    const rejected   = records.filter((r) => r.review_status === 'rejected').length;
    const overrides  = records.filter((r) =>
      r.review_status === 'override_to_eligible' || r.review_status === 'override_to_limited',
    ).length;
    const reviewed = total - pending;

    return {
      total_records:                  total,
      pending_count:                  pending,
      approved_for_scoring_count:     approvedSc,
      approved_for_bti_governance_count: approvedBT,
      blocked_count:                  blocked,
      needs_more_data_count:          needsData,
      rejected_count:                 rejected,
      override_count:                 overrides,
      kora_ready_for_iu_count:        records.filter((r) => r.approved_for_impact_units).length,
      kora_ready_for_bti_count:       records.filter(
        (r) => (r.review_status === 'approved_for_bti_governance' || r.review_status === 'override_to_limited')
          && !r.approved_for_impact_units,
      ).length,
      review_completion_rate:         total > 0 ? reviewed / total : 0,
      methodology_version:            this.methodologyVersion,
      calibration_status:             this.calibrationStatus,
    };
  }

  getRecordById(id: string): UEFReviewRecord | null {
    return this.getReviewRecords().find((r) => r.id === id) ?? null;
  }

  getRecordsByStatus(status: UEFReviewStatus): UEFReviewRecord[] {
    return this.getReviewRecords().filter((r) => r.review_status === status);
  }

  getRecordsByEligibility(eligibility: EligibilityClass): UEFReviewRecord[] {
    return this.getReviewRecords().filter((r) => r.eligibility === eligibility);
  }

  getRecordsNeedingData(): UEFReviewRecord[] {
    return this.getReviewRecords().filter(
      (r) => r.review_status === 'needs_more_data' || r.missing_fields.length > 0,
    );
  }

  getKoraReadyRecords(): UEFReviewRecord[] {
    // Only records with a confirmed human review decision — excludes pending and needs_more_data.
    // (Pipeline sets approved_for_bti_governance=true on pending eligible rows; filter on review_status instead.)
    return this.getReviewRecords().filter(
      (r) => r.review_status === 'approved_for_scoring'
        || r.review_status === 'approved_for_bti_governance'
        || r.review_status === 'override_to_eligible'
        || r.review_status === 'override_to_limited',
    );
  }

  getImpactUnitReadyRecords(): UEFReviewRecord[] {
    return this.getReviewRecords().filter((r) => r.approved_for_impact_units);
  }

  getBTIGovernanceReadyRecords(): UEFReviewRecord[] {
    // Only confirmed limited records — not pending eligible records that happen to carry the BTI flag.
    return this.getReviewRecords().filter(
      (r) => (r.review_status === 'approved_for_bti_governance' || r.review_status === 'override_to_limited')
        && !r.approved_for_impact_units,
    );
  }

  getAuditTrail(): UEFAuditEvent[] {
    return buildAuditTrail(this.getReviewRecords());
  }

  // Foundation Light: reviewed lineage wrapper.
  // In production this will return persisted UEF-reviewed records.
  getAllReviewedPipelineRows(): PipelineAnalyzedRow[] {
    return ingestionPipelineService.analyzeBatch();
  }
}

export const uefReviewService = new UEFReviewService();
