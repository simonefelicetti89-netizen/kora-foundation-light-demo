import type {
  WorkforceBaselineRecord,
  WorkforceBaselineUploadBatch,
  WorkforceAggregateGroup,
  WorkforceBaselineValidationResult,
  WorkforceBaselineReadiness,
  WorkforceDimensionType,
  PipelineStageLink,
} from '@/lib/types';
import baselineData from '@/data/synthetic/workforce-baseline.json';

const records = baselineData as WorkforceBaselineRecord[];

export interface IWorkforceBaselineService {
  getAvailableWorkforceBaselines(): WorkforceBaselineRecord[];
  getWorkforceBaseline(companyId: string): WorkforceBaselineRecord | null;
  getUploadBatch(companyId: string): WorkforceBaselineUploadBatch | null;
  getAggregateGroups(companyId: string): WorkforceAggregateGroup[];
  getGroupsByDimension(companyId: string, dimensionType: WorkforceDimensionType): WorkforceAggregateGroup[];
  getVisibleGroups(companyId: string): WorkforceAggregateGroup[];
  getSuppressedGroups(companyId: string): WorkforceAggregateGroup[];
  validateWorkforceBaseline(companyId: string): WorkforceBaselineValidationResult | null;
  getWorkforceBaselineReadiness(companyId: string): WorkforceBaselineReadiness | null;
  getPrivacyThresholdWarnings(companyId: string): WorkforceAggregateGroup[];
  isCompanyThresholdMet(companyId: string): boolean;
  isPrivacySafeForCompanyView(companyId: string): boolean;
  getWorkforcePipelineLinks(companyId: string): PipelineStageLink[];
}

export class WorkforceBaselineService implements IWorkforceBaselineService {
  getAvailableWorkforceBaselines(): WorkforceBaselineRecord[] {
    return records;
  }

  getWorkforceBaseline(companyId: string): WorkforceBaselineRecord | null {
    return records.find((r) => r.company_id === companyId) ?? null;
  }

  getUploadBatch(companyId: string): WorkforceBaselineUploadBatch | null {
    return this.getWorkforceBaseline(companyId)?.upload_batch ?? null;
  }

  getAggregateGroups(companyId: string): WorkforceAggregateGroup[] {
    return this.getWorkforceBaseline(companyId)?.aggregate_groups ?? [];
  }

  getGroupsByDimension(companyId: string, dimensionType: WorkforceDimensionType): WorkforceAggregateGroup[] {
    return this.getAggregateGroups(companyId).filter((g) => g.dimension_type === dimensionType);
  }

  // Only groups safe for employer view — privacy_threshold_met and included_in_breakdown
  getVisibleGroups(companyId: string): WorkforceAggregateGroup[] {
    return this.getAggregateGroups(companyId).filter((g) => g.included_in_breakdown);
  }

  getSuppressedGroups(companyId: string): WorkforceAggregateGroup[] {
    return this.getAggregateGroups(companyId).filter((g) => !g.privacy_threshold_met);
  }

  validateWorkforceBaseline(companyId: string): WorkforceBaselineValidationResult | null {
    return this.getWorkforceBaseline(companyId)?.validation_result ?? null;
  }

  getWorkforceBaselineReadiness(companyId: string): WorkforceBaselineReadiness | null {
    return this.getWorkforceBaseline(companyId)?.readiness ?? null;
  }

  getPrivacyThresholdWarnings(companyId: string): WorkforceAggregateGroup[] {
    return this.getSuppressedGroups(companyId);
  }

  // Company is eligible for Foundation Light if total_workers >= 30
  isCompanyThresholdMet(companyId: string): boolean {
    const result = this.validateWorkforceBaseline(companyId);
    if (!result) return false;
    return result.total_workers >= result.minimum_company_threshold;
  }

  // Privacy-safe if no below-threshold group is flagged as visible breakdown
  isPrivacySafeForCompanyView(companyId: string): boolean {
    const groups = this.getAggregateGroups(companyId);
    return !groups.some((g) => !g.privacy_threshold_met && g.included_in_breakdown);
  }

  getWorkforcePipelineLinks(companyId: string): PipelineStageLink[] {
    return this.getWorkforceBaseline(companyId)?.pipeline_links ?? [];
  }
}

export const workforceBaselineService = new WorkforceBaselineService();
