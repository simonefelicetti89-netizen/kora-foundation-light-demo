import type { ScenarioId } from '@/lib/types';
import { getMethodologyVersion, getCalibrationStatus } from '@/lib/methodology-config/v0.1';

// KORA Contribution is a companion indicator — never a KORA Index component (CLAUDE.md §12.7)
export interface KoraContributionOutput {
  company_id: string;
  scenario_id: ScenarioId;
  contribution_score: number; // separate from kora_index_value — never merged
  collective_initiatives: Array<{ id: string; name: string; participation_count: number }>;
  ecosystem_reach: number;
  methodology_version_id: string;
  calibration_status: string;
  synthetic_demo_data: true;
}

export interface IKoraContributionService {
  getContribution(companyId: string, scenarioId: ScenarioId): KoraContributionOutput;
}

export class KoraContributionService implements IKoraContributionService {
  getContribution(companyId: string, scenarioId: ScenarioId): KoraContributionOutput {
    return {
      company_id: companyId,
      scenario_id: scenarioId,
      contribution_score: scenarioId === 'S2' ? 0.45 : 0.17,
      collective_initiatives: [],
      ecosystem_reach: 0,
      methodology_version_id: getMethodologyVersion(),
      calibration_status: getCalibrationStatus(),
      synthetic_demo_data: true,
    };
  }
}

export const koraContributionService = new KoraContributionService();
