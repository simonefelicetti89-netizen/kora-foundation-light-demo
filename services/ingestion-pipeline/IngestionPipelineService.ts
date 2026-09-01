import type {
  RawIngestionRow,
  NormalizedIngestionRow,
  KoraReadyRecord,
  IngestionDestination,
  IngestionReviewStatus,
  EligibilityClassificationResult,
  PipelineAnalyzedRow,
} from '@/lib/types';
import { ingestionNormalizerService } from '@/services/ingestion-normalizer/IngestionNormalizerService';
import { eligibilityGateService } from '@/services/eligibility-gate/EligibilityGateService';
import ingestionSamplesRaw from '@/data/synthetic/ingestion-samples.json';

// PipelineAnalyzedRow moved to @/lib/types (F-03 dependency-blocker
// resolution, 2026-09-02) — re-exported here for backward compatibility
// with its other existing importer (UEFReviewService.ts).
export type { PipelineAnalyzedRow };

export interface IngestionPipelineSummary {
  total: number;
  eligible_count: number;
  limited_count: number;
  blocked_count: number;
  review_required_count: number;
  ready_for_index_count: number;
  missing_data_total: number;
  high_confidence_count: number;
  data_completeness_avg: number;
  routing: {
    kora_activation_core: number;
    economic_relief_opportunity: number;
    blocked_by_design: number;
    human_review_required: number;
  };
}

export interface IIngestionPipelineService {
  analyzeRow(raw: RawIngestionRow): PipelineAnalyzedRow;
  analyzeBatch(rows?: RawIngestionRow[]): PipelineAnalyzedRow[];
  getIngestionSummary(rows?: RawIngestionRow[]): IngestionPipelineSummary;
  getReviewQueue(rows?: RawIngestionRow[]): PipelineAnalyzedRow[];
  getKoraReadyRecords(rows?: RawIngestionRow[]): KoraReadyRecord[];
}

export class IngestionPipelineService implements IIngestionPipelineService {
  private readonly seedRows: RawIngestionRow[];

  constructor() {
    this.seedRows = (ingestionSamplesRaw as { data: RawIngestionRow[] }).data;
  }

  analyzeRow(raw: RawIngestionRow): PipelineAnalyzedRow {
    const normalized = ingestionNormalizerService.normalizeRow(raw);

    const classification = eligibilityGateService.classifyAction({
      name: normalized.raw_name,
      description: normalized.raw_description,
      source_type: normalized.source_type,
      mandatory_status: normalized.mandatory_status ?? undefined,
      evidence_type: normalized.evidence_type,
    });

    const destination = this.deriveDestination(classification);
    const review_status = this.deriveReviewStatus(classification);
    const missing_data_questions = ingestionNormalizerService.getMissingDataQuestions(
      normalized.missing_fields,
    );
    const kora_ready = this.buildKoraReadyRecord(
      normalized,
      classification,
      destination,
      review_status,
      missing_data_questions,
    );

    return { raw, normalized, classification, destination, review_status, kora_ready, missing_data_questions };
  }

  analyzeBatch(rows?: RawIngestionRow[]): PipelineAnalyzedRow[] {
    return (rows ?? this.seedRows).map((r) => this.analyzeRow(r));
  }

  getIngestionSummary(rows?: RawIngestionRow[]): IngestionPipelineSummary {
    const analyzed = this.analyzeBatch(rows);

    const eligible_count = analyzed.filter(
      (r) => r.classification.kora_eligibility === 'eligible' && !r.classification.review_required,
    ).length;
    const limited_count         = analyzed.filter((r) => r.classification.kora_eligibility === 'limited').length;
    const blocked_count         = analyzed.filter((r) => r.classification.kora_eligibility === 'blocked').length;
    const review_required_count = analyzed.filter((r) => r.classification.review_required).length;
    const missing_data_total    = analyzed.reduce((s, r) => s + r.normalized.missing_fields.length, 0);
    const high_confidence_count = analyzed.filter((r) => r.classification.confidence === 'high').length;
    const data_completeness_avg =
      analyzed.reduce((s, r) => s + r.normalized.data_completeness_score, 0) /
      Math.max(analyzed.length, 1);

    return {
      total: analyzed.length,
      eligible_count,
      limited_count,
      blocked_count,
      review_required_count,
      ready_for_index_count: eligible_count,
      missing_data_total,
      high_confidence_count,
      data_completeness_avg,
      routing: {
        kora_activation_core:      analyzed.filter((r) => r.destination === 'KORA Activation Core').length,
        economic_relief_opportunity: analyzed.filter((r) => r.destination === 'Economic Relief & Activation Opportunity').length,
        blocked_by_design:         analyzed.filter((r) => r.destination === 'Blocked by Design').length,
        human_review_required:     analyzed.filter((r) => r.destination === 'Human Review Required').length,
      },
    };
  }

  getReviewQueue(rows?: RawIngestionRow[]): PipelineAnalyzedRow[] {
    return this.analyzeBatch(rows).filter((r) => r.classification.review_required);
  }

  getKoraReadyRecords(rows?: RawIngestionRow[]): KoraReadyRecord[] {
    return this.analyzeBatch(rows)
      .filter((r) => r.kora_ready.approved_for_bti_governance || r.kora_ready.approved_for_scoring)
      .map((r) => r.kora_ready);
  }

  private deriveDestination(c: EligibilityClassificationResult): IngestionDestination {
    if (c.kora_eligibility === 'blocked') return 'Blocked by Design';
    if (c.kora_eligibility === 'limited') return 'Economic Relief & Activation Opportunity';
    if (c.review_required) return 'Human Review Required';
    return 'KORA Activation Core';
  }

  private deriveReviewStatus(c: EligibilityClassificationResult): IngestionReviewStatus {
    if (c.kora_eligibility === 'blocked') return 'blocked_gate';
    if (c.kora_eligibility === 'limited') return 'limited_gate';
    if (c.review_required) return 'pending_review';
    return 'ready';
  }

  // Governance flags — strict rules per doc 10:
  // Blocked → all false (0 IU, 0 KORA Index, excluded from BTI).
  // Limited → BTI governance only (economic_relief_spend tracking).
  // Eligible + review_required → BTI only, scoring/IU blocked until review resolves.
  // Eligible + !review_required → scoring and IU allowed.
  private buildKoraReadyRecord(
    normalized: NormalizedIngestionRow,
    c: EligibilityClassificationResult,
    destination: IngestionDestination,
    review_status: IngestionReviewStatus,
    missing_data_questions: string[],
  ): KoraReadyRecord {
    const isBlocked        = c.kora_eligibility === 'blocked';
    const isEligibleReady  = c.kora_eligibility === 'eligible' && !c.review_required;

    return {
      id: normalized.id,
      normalized_row: normalized,
      destination,
      review_status,
      approved_for_scoring:        isEligibleReady,
      approved_for_bti_governance: !isBlocked,
      approved_for_impact_units:   isEligibleReady && c.impact_units_allowed,
      missing_data_questions,
      human_review_completed: false,
    };
  }
}

export const ingestionPipelineService = new IngestionPipelineService();
