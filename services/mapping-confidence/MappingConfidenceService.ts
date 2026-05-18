import type { PillarCode } from '@/lib/types';
import type { SourceType } from '@/services/ingestion-simulator/IngestionSimulatorService';

export interface MappingResult {
  pillar_code: PillarCode;
  event_type_code: string;
  confidence_score: number; // 0–1; < 0.60 requires human review
  requires_human_review: boolean;
}

export interface IMappingConfidenceService {
  classify(columnHeader: string, sampleValues: string[], sourceType: SourceType): MappingResult;
}

export class MappingConfidenceService implements IMappingConfidenceService {
  // Stub — BCM taxonomy rule-based classifier, no external LLM calls
  classify(_columnHeader: string, _sampleValues: string[], _sourceType: SourceType): MappingResult {
    return {
      pillar_code: 'LIFE',
      event_type_code: 'unknown',
      confidence_score: 0.5,
      requires_human_review: true,
    };
  }
}

export const mappingConfidenceService = new MappingConfidenceService();
