import type { UEFRecord, ScenarioId } from '@/lib/types';

export type ReviewAction = 'approve' | 'reject' | 'flag';

export interface UEFReviewState {
  records: UEFRecord[];
  approved_count: number;
  rejected_count: number;
  flagged_count: number;
  eligible_for_scoring_count: number;
}

export interface IUEFReviewService {
  getReviewState(batchId: string, scenarioId: ScenarioId): UEFReviewState;
  applyAction(batchId: string, action: ReviewAction, eventIds: string[], reviewNote?: string): UEFReviewState;
}

export class UEFReviewService implements IUEFReviewService {
  // Records with eligible_for_scoring = false are excluded from scoring pipeline
  getReviewState(_batchId: string, _scenarioId: ScenarioId): UEFReviewState {
    return { records: [], approved_count: 0, rejected_count: 0, flagged_count: 0, eligible_for_scoring_count: 0 };
  }

  applyAction(_batchId: string, _action: ReviewAction, _eventIds: string[], _reviewNote?: string): UEFReviewState {
    return { records: [], approved_count: 0, rejected_count: 0, flagged_count: 0, eligible_for_scoring_count: 0 };
  }
}

export const uefReviewService = new UEFReviewService();
