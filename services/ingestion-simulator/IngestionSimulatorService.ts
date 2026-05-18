import type { ScenarioId } from '@/lib/types';

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

export interface IIngestionSimulatorService {
  simulate(sourceType: SourceType, batchId: string, scenarioId: ScenarioId): IngestionResult;
}

export class IngestionSimulatorService implements IIngestionSimulatorService {
  // Stub — BCM taxonomy rule-based classifier (no external LLM, doc 19 §9.2)
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
}

export const ingestionSimulatorService = new IngestionSimulatorService();
