import type { ScenarioId } from '@/lib/types';
import { getMethodologyVersion, getCalibrationStatus } from '@/lib/methodology-config/v0.1';
import contributionOutputsRaw from '@/data/synthetic/kora-contribution-outputs.json';
import collectiveInitiativesRaw from '@/data/synthetic/collective-initiatives.json';

// KORA Contribution is a companion indicator — never a KORA Index component (CLAUDE.md §12.7)

interface SeedContributionRecord {
  id: string;
  company_id: string;
  scenario_id: string;
  reporting_period: string;
  methodology_version_id: string;
  calibration_status: string;
  is_kora_index_component: false;
  companion_label: string;
  contribution_score: number;
  contribution_level: string;
  collective_initiatives_count: number;
  active_initiatives_count: number;
  planning_initiatives_count: number;
  completed_initiatives_count: number;
  verified_initiative_participations: number;
  cross_company_initiatives_count: number;
  ecosystem_partners_active: number;
  referenced_collective_initiative_ids: string[];
  contribution_explanation: string;
  limitations_text: string;
}

interface SeedInitiativeRecord {
  id: string;
  scenario_id: string;
  name: string;
  initiative_type: string;
  pillar: string;
  pillar_secondary: string | null;
  territory: string;
  companies_involved: string[];
  partner_id: string | null;
  partner_name: string | null;
  status: string;
  aggregate_participation_count: number;
  aggregate_target_participants: number;
  aggregate_completed_participants: number;
  privacy_threshold_met: boolean;
  verification_status: string;
  advisor_validation_status: string;
  kora_contribution_relevant: boolean;
  evidence_status: string;
  start_date: string;
  end_date: string;
  description: string;
  employer_privacy_notice: string;
  not_kora_index_component: true;
}

export interface CollectiveInitiative {
  id: string;
  name: string;
  initiative_type: string;
  pillar: string;
  pillar_secondary: string | null;
  territory: string;
  companies_involved: string[];
  partner_name: string | null;
  status: string;
  aggregate_participation_count: number;
  aggregate_target_participants: number;
  verification_status: string;
  advisor_validation_status: string;
  kora_contribution_relevant: boolean;
  start_date: string;
  end_date: string;
  description: string;
  employer_privacy_notice: string;
}

export interface KoraContributionSummary {
  company_id: string;
  scenario_id: ScenarioId;
  reporting_period: string;
  contribution_score: number;
  contribution_level: string;
  collective_initiatives_count: number;
  active_initiatives_count: number;
  completed_initiatives_count: number;
  verified_initiative_participations: number;
  cross_company_initiatives_count: number;
  ecosystem_partners_active: number;
  contribution_explanation: string;
  limitations_text: string;
  /** Always false — KORA Contribution is never a KORA Index component */
  is_kora_index_component: false;
  companion_label: string;
  methodology_version_id: string;
  calibration_status: string;
  synthetic_demo_data: true;
}

// Legacy output type — preserved for backwards compat with existing consumers
export interface KoraContributionOutput {
  company_id: string;
  scenario_id: ScenarioId;
  contribution_score: number;
  collective_initiatives: Array<{ id: string; name: string; participation_count: number }>;
  ecosystem_reach: number;
  methodology_version_id: string;
  calibration_status: string;
  synthetic_demo_data: true;
}

export interface IKoraContributionService {
  getContribution(companyId: string, scenarioId: ScenarioId): KoraContributionOutput;
  getContributionSummary(companyId: string, scenarioId: ScenarioId): KoraContributionSummary | null;
  getContributionScore(companyId: string, scenarioId: ScenarioId): number;
  getCollectiveInitiatives(companyId: string, scenarioId: ScenarioId): CollectiveInitiative[];
  getContributionInitiatives(companyId: string, scenarioId: ScenarioId): CollectiveInitiative[];
}

export class KoraContributionService implements IKoraContributionService {
  private readonly contributions = (
    contributionOutputsRaw as { data: SeedContributionRecord[] }
  ).data;
  private readonly initiatives = (
    collectiveInitiativesRaw as { data: SeedInitiativeRecord[] }
  ).data;

  private findContribution(
    companyId: string,
    scenarioId: ScenarioId,
  ): SeedContributionRecord | null {
    return (
      this.contributions.find(
        (r) => r.company_id === companyId && r.scenario_id === scenarioId,
      ) ?? null
    );
  }

  /** Returns initiatives visible for the given scenario (scenario match or "all") */
  private filterInitiativesByScenario(scenarioId: ScenarioId): SeedInitiativeRecord[] {
    return this.initiatives.filter(
      (r) => r.scenario_id === scenarioId || r.scenario_id === 'all',
    );
  }

  private mapInitiative(r: SeedInitiativeRecord): CollectiveInitiative {
    return {
      id: r.id,
      name: r.name,
      initiative_type: r.initiative_type,
      pillar: r.pillar,
      pillar_secondary: r.pillar_secondary,
      territory: r.territory,
      companies_involved: r.companies_involved,
      partner_name: r.partner_name,
      status: r.status,
      aggregate_participation_count: r.aggregate_participation_count,
      aggregate_target_participants: r.aggregate_target_participants,
      verification_status: r.verification_status,
      advisor_validation_status: r.advisor_validation_status,
      kora_contribution_relevant: r.kora_contribution_relevant,
      start_date: r.start_date,
      end_date: r.end_date,
      description: r.description,
      employer_privacy_notice: r.employer_privacy_notice,
    };
  }

  /** Legacy method — preserved for backwards compatibility */
  getContribution(companyId: string, scenarioId: ScenarioId): KoraContributionOutput {
    const rec = this.findContribution(companyId, scenarioId);
    const initiatives = this.filterInitiativesByScenario(scenarioId)
      .filter((r) => r.kora_contribution_relevant)
      .map((r) => ({ id: r.id, name: r.name, participation_count: r.aggregate_participation_count }));

    return {
      company_id: companyId,
      scenario_id: scenarioId,
      contribution_score: rec?.contribution_score ?? 0,
      collective_initiatives: initiatives,
      ecosystem_reach: rec?.ecosystem_partners_active ?? 0,
      methodology_version_id: getMethodologyVersion(),
      calibration_status: getCalibrationStatus(),
      synthetic_demo_data: true,
    };
  }

  getContributionSummary(
    companyId: string,
    scenarioId: ScenarioId,
  ): KoraContributionSummary | null {
    const rec = this.findContribution(companyId, scenarioId);
    if (!rec) return null;
    return {
      company_id: rec.company_id,
      scenario_id: scenarioId,
      reporting_period: rec.reporting_period,
      contribution_score: rec.contribution_score,
      contribution_level: rec.contribution_level,
      collective_initiatives_count: rec.collective_initiatives_count,
      active_initiatives_count: rec.active_initiatives_count,
      completed_initiatives_count: rec.completed_initiatives_count,
      verified_initiative_participations: rec.verified_initiative_participations,
      cross_company_initiatives_count: rec.cross_company_initiatives_count,
      ecosystem_partners_active: rec.ecosystem_partners_active,
      contribution_explanation: rec.contribution_explanation,
      limitations_text: rec.limitations_text,
      is_kora_index_component: false,
      companion_label: rec.companion_label,
      methodology_version_id: rec.methodology_version_id,
      calibration_status: rec.calibration_status,
      synthetic_demo_data: true,
    };
  }

  getContributionScore(companyId: string, scenarioId: ScenarioId): number {
    return this.findContribution(companyId, scenarioId)?.contribution_score ?? 0;
  }

  /** All collective initiatives visible for this scenario (used by C-03, C-05) */
  getCollectiveInitiatives(companyId: string, scenarioId: ScenarioId): CollectiveInitiative[] {
    void companyId; // initiatives are not yet company-scoped in the seed
    return this.filterInitiativesByScenario(scenarioId).map(this.mapInitiative);
  }

  /** Only initiatives that are contribution-relevant (active in KORA Contribution) */
  getContributionInitiatives(companyId: string, scenarioId: ScenarioId): CollectiveInitiative[] {
    void companyId;
    return this.filterInitiativesByScenario(scenarioId)
      .filter((r) => r.kora_contribution_relevant)
      .map(this.mapInitiative);
  }
}

export const koraContributionService = new KoraContributionService();
