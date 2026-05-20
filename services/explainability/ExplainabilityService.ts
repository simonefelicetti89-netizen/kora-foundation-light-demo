import type { ScenarioId } from '@/lib/types';
import explainabilityRaw from '@/data/synthetic/explainability-records.json';

export interface ExplainabilityComponentRef {
  code: string;
  label: string;
  value: number;
  explanation: string;
}

export interface ExplainabilityAction {
  priority: number;
  action: string;
  detail: string;
  target_components: string[];
}

export interface ExplainabilityRecord {
  id: string;
  company_id: string;
  scenario_id: string;
  reporting_period: string;
  kora_index_output_id: string;
  methodology_version_id: string;
  calibration_status: string;
  kora_index_explanation: string;
  safeguard_explanation: string;
  confidence_explanation: string;
  strong_components: ExplainabilityComponentRef[];
  weak_components: ExplainabilityComponentRef[];
  next_best_actions: ExplainabilityAction[];
  limitations_statement: string;
  individual_worker_data_present: false;
}

interface SeedRecord {
  id: string; company_id: string; scenario_id: string; reporting_period: string;
  kora_index_output_id: string; methodology_version_id: string; calibration_status: string;
  kora_index_explanation: string; safeguard_explanation: string; confidence_explanation: string;
  strong_components: ExplainabilityComponentRef[];
  weak_components: ExplainabilityComponentRef[];
  next_best_actions: ExplainabilityAction[];
  limitations_statement: string;
  individual_worker_data_present: false;
  synthetic_demo_data: true; generated_for: string; not_live_data: true;
}

const explainabilityRecords = (explainabilityRaw as { data: SeedRecord[] }).data;

export interface Warning {
  code: string;
  severity: 'critical' | 'high' | 'medium';
  title: string;
  message: string;
  affected_components: string[];
}

export interface IExplainabilityService {
  getExplanation(companyId: string, scenarioId: ScenarioId): ExplainabilityRecord | null;
  getTopWeakComponents(companyId: string, scenarioId: ScenarioId): ExplainabilityComponentRef[];
  getTopStrongComponents(companyId: string, scenarioId: ScenarioId): ExplainabilityComponentRef[];
  getNextBestActions(companyId: string, scenarioId: ScenarioId): ExplainabilityAction[];
  getLimitations(companyId: string, scenarioId: ScenarioId): string | null;
  getWarnings(companyId: string, scenarioId: ScenarioId): Warning[];
}

export class ExplainabilityService implements IExplainabilityService {
  private findRecord(companyId: string, scenarioId: ScenarioId): SeedRecord | null {
    return (
      explainabilityRecords.find(
        (r) => r.company_id === companyId && r.scenario_id === scenarioId,
      ) ?? null
    );
  }

  getExplanation(companyId: string, scenarioId: ScenarioId): ExplainabilityRecord | null {
    const seed = this.findRecord(companyId, scenarioId);
    if (!seed) return null;
    return {
      id: seed.id,
      company_id: seed.company_id,
      scenario_id: seed.scenario_id,
      reporting_period: seed.reporting_period,
      kora_index_output_id: seed.kora_index_output_id,
      methodology_version_id: seed.methodology_version_id,
      calibration_status: seed.calibration_status,
      kora_index_explanation: seed.kora_index_explanation,
      safeguard_explanation: seed.safeguard_explanation,
      confidence_explanation: seed.confidence_explanation,
      strong_components: seed.strong_components,
      weak_components: seed.weak_components,
      next_best_actions: seed.next_best_actions,
      limitations_statement: seed.limitations_statement,
      individual_worker_data_present: false,
    };
  }

  getTopWeakComponents(companyId: string, scenarioId: ScenarioId): ExplainabilityComponentRef[] {
    return this.findRecord(companyId, scenarioId)?.weak_components ?? [];
  }

  getTopStrongComponents(companyId: string, scenarioId: ScenarioId): ExplainabilityComponentRef[] {
    return this.findRecord(companyId, scenarioId)?.strong_components ?? [];
  }

  getNextBestActions(companyId: string, scenarioId: ScenarioId): ExplainabilityAction[] {
    return this.findRecord(companyId, scenarioId)?.next_best_actions ?? [];
  }

  getLimitations(companyId: string, scenarioId: ScenarioId): string | null {
    return this.findRecord(companyId, scenarioId)?.limitations_statement ?? null;
  }

  getWarnings(companyId: string, scenarioId: ScenarioId): Warning[] {
    const record = this.findRecord(companyId, scenarioId);
    if (!record) return [];
    return record.weak_components.slice(0, 3).map((comp) => ({
      code: `weak-${comp.code.toLowerCase()}`,
      severity: comp.value < 0.35 ? ('high' as const) : ('medium' as const),
      title: `${comp.label} sotto soglia`,
      message: comp.explanation,
      affected_components: [comp.code],
    }));
  }
}

export const explainabilityService = new ExplainabilityService();
