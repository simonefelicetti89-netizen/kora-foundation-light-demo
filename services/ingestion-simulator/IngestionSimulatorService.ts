import type { ScenarioId } from '@/lib/types';
import sourceBatchesRaw from '@/data/synthetic/source-batches.json';

export type SourceType = 'hr_system' | 'welfare_provider' | 'lms' | 'esg_initiatives' | 'partner_events' | 'manual';

export interface IngestionResult {
  batch_id: string;
  source_type: SourceType;
  total_rows: number;
  mapped_rows: number;
  rejected_rows: number;
  mapping_suggestions: MappingSuggestion[];
  requires_human_review: boolean;
}

export interface MappingSuggestion {
  column_header: string;
  suggested_field: string;
  confidence_score: number;
  requires_review: boolean;
}

interface SeedSourceBatch {
  id: string;
  company_id: string;
  scenario_id: string;
  source_type: string;
  source_name: string;
  file_reference: string | null;
  row_count: number;
  mapped_count: number;
  rejected_count: number;
  completeness_pct: number;
  mapping_confidence_avg: number;
  evidence_attached_pct: number;
  pending_review_count: number;
  batch_status: string;
  ingestion_date: string;
  source_notes: string;
  blocked_count?: number;
  limited_count?: number;
  eligibility_gate_result?: string;
  eligibility_gate_note?: string;
}

export interface SourceBatch {
  id: string;
  company_id: string;
  scenario_id: ScenarioId;
  source_type: string;
  source_name: string;
  row_count: number;
  mapped_count: number;
  rejected_count: number;
  completeness_pct: number;
  mapping_confidence_avg: number;
  evidence_attached_pct: number;
  pending_review_count: number;
  batch_status: string;
  ingestion_date: string;
  source_notes: string;
}

export interface SourceCompletenessSummary {
  total_rows: number;
  total_mapped: number;
  total_rejected: number;
  overall_completeness_pct: number;
  sources_complete: number;
  sources_partial: number;
  sources_under_review: number;
}

export interface MappingConfidenceSummary {
  average_confidence: number;
  high_confidence_sources: number;
  low_confidence_sources: number;
}

export interface PendingReviewSummary {
  total_pending: number;
  sources_with_pending: number;
}

export interface EvidenceCoverageSummary {
  average_evidence_pct: number;
  sources_above_50pct: number;
  sources_below_50pct: number;
}

export interface EligibilityGateSummary {
  blocked_count: number;
  blocked_note: string;
  limited_count: number;
  limited_note: string;
  eligible_row_count: number;
  total_row_count: number;
}

export interface IIngestionSimulatorService {
  simulate(sourceType: SourceType, batchId: string, scenarioId: ScenarioId): IngestionResult;
  getSourceBatches(companyId: string, scenarioId: ScenarioId): SourceBatch[];
  getSourceCompletenessSummary(companyId: string, scenarioId: ScenarioId): SourceCompletenessSummary;
  getMappingConfidenceSummary(companyId: string, scenarioId: ScenarioId): MappingConfidenceSummary;
  getPendingReviewSummary(companyId: string, scenarioId: ScenarioId): PendingReviewSummary;
  getEvidenceCoverageSummary(companyId: string, scenarioId: ScenarioId): EvidenceCoverageSummary;
  getEligibilityGateSummary(companyId: string, scenarioId: ScenarioId): EligibilityGateSummary;
}

export class IngestionSimulatorService implements IIngestionSimulatorService {
  private readonly batches = (sourceBatchesRaw as { data: SeedSourceBatch[] }).data;

  // Stub — BCM taxonomy rule-based classifier (no external LLM, doc 19 §9.2)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  simulate(sourceType: SourceType, batchId: string, _scenarioId: ScenarioId): IngestionResult {
    return {
      batch_id: batchId,
      source_type: sourceType,
      total_rows: 0,
      mapped_rows: 0,
      rejected_rows: 0,
      mapping_suggestions: [],
      requires_human_review: true,
    };
  }

  getSourceBatches(companyId: string, scenarioId: ScenarioId): SourceBatch[] {
    return this.batches
      .filter((b) => b.company_id === companyId && b.scenario_id === scenarioId)
      .map((b) => ({
        id: b.id,
        company_id: b.company_id,
        scenario_id: b.scenario_id as ScenarioId,
        source_type: b.source_type,
        source_name: b.source_name,
        row_count: b.row_count,
        mapped_count: b.mapped_count,
        rejected_count: b.rejected_count,
        completeness_pct: b.completeness_pct,
        mapping_confidence_avg: b.mapping_confidence_avg,
        evidence_attached_pct: b.evidence_attached_pct,
        pending_review_count: b.pending_review_count,
        batch_status: b.batch_status,
        ingestion_date: b.ingestion_date,
        source_notes: b.source_notes,
      }));
  }

  getSourceCompletenessSummary(companyId: string, scenarioId: ScenarioId): SourceCompletenessSummary {
    const batches = this.getSourceBatches(companyId, scenarioId);
    if (batches.length === 0) {
      return { total_rows: 0, total_mapped: 0, total_rejected: 0, overall_completeness_pct: 0, sources_complete: 0, sources_partial: 0, sources_under_review: 0 };
    }
    const total_rows = batches.reduce((s, b) => s + b.row_count, 0);
    const total_mapped = batches.reduce((s, b) => s + b.mapped_count, 0);
    const total_rejected = batches.reduce((s, b) => s + b.rejected_count, 0);
    const overall_completeness_pct = total_rows > 0 ? total_mapped / total_rows : 0;
    return {
      total_rows,
      total_mapped,
      total_rejected,
      overall_completeness_pct,
      sources_complete: batches.filter((b) => b.batch_status === 'approved').length,
      sources_partial: batches.filter((b) => b.batch_status.includes('partial') || b.batch_status === 'mostly_reviewed').length,
      sources_under_review: batches.filter((b) => b.batch_status === 'under_review').length,
    };
  }

  getMappingConfidenceSummary(companyId: string, scenarioId: ScenarioId): MappingConfidenceSummary {
    const batches = this.getSourceBatches(companyId, scenarioId);
    if (batches.length === 0) return { average_confidence: 0, high_confidence_sources: 0, low_confidence_sources: 0 };
    const avg = batches.reduce((s, b) => s + b.mapping_confidence_avg, 0) / batches.length;
    return {
      average_confidence: avg,
      high_confidence_sources: batches.filter((b) => b.mapping_confidence_avg >= 0.70).length,
      low_confidence_sources: batches.filter((b) => b.mapping_confidence_avg < 0.60).length,
    };
  }

  getPendingReviewSummary(companyId: string, scenarioId: ScenarioId): PendingReviewSummary {
    const batches = this.getSourceBatches(companyId, scenarioId);
    return {
      total_pending: batches.reduce((s, b) => s + b.pending_review_count, 0),
      sources_with_pending: batches.filter((b) => b.pending_review_count > 0).length,
    };
  }

  getEvidenceCoverageSummary(companyId: string, scenarioId: ScenarioId): EvidenceCoverageSummary {
    const batches = this.getSourceBatches(companyId, scenarioId);
    if (batches.length === 0) return { average_evidence_pct: 0, sources_above_50pct: 0, sources_below_50pct: 0 };
    const avg = batches.reduce((s, b) => s + b.evidence_attached_pct, 0) / batches.length;
    return {
      average_evidence_pct: avg,
      sources_above_50pct: batches.filter((b) => b.evidence_attached_pct >= 0.50).length,
      sources_below_50pct: batches.filter((b) => b.evidence_attached_pct < 0.50).length,
    };
  }

  getEligibilityGateSummary(companyId: string, scenarioId: ScenarioId): EligibilityGateSummary {
    const raw = (sourceBatchesRaw as { data: SeedSourceBatch[] }).data.filter(
      (b) => b.company_id === companyId && b.scenario_id === scenarioId,
    );

    let blocked_count = 0;
    let blocked_note = '';
    let limited_count = 0;
    let limited_note = '';

    for (const b of raw) {
      if (b.eligibility_gate_result === 'blocked') {
        blocked_count += b.blocked_count ?? 0;
        if (!blocked_note && b.eligibility_gate_note) blocked_note = b.eligibility_gate_note;
      } else if (b.eligibility_gate_result === 'limited') {
        limited_count += b.limited_count ?? 0;
        if (!limited_note && b.eligibility_gate_note) limited_note = b.eligibility_gate_note;
      }
    }

    const total_row_count = raw.reduce((s, b) => s + b.row_count, 0);
    const eligible_row_count = Math.max(0, total_row_count - blocked_count - limited_count);

    return { blocked_count, blocked_note, limited_count, limited_note, eligible_row_count, total_row_count };
  }
}

export const ingestionSimulatorService = new IngestionSimulatorService();
