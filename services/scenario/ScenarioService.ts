import type { ScenarioConfig, ScenarioId } from '@/lib/types';

export interface IScenarioService {
  getScenario(id: ScenarioId): ScenarioConfig;
  listScenarios(): ScenarioConfig[];
  getAvailableScenarios(): ScenarioConfig[];
  filterByScenario<T extends { scenario_id: string }>(
    records: T[],
    scenarioId: ScenarioId,
  ): T[];
}

const STUB_SCENARIOS: ScenarioConfig[] = [
  {
    id: 'S1',
    label: 'Meridiana — Q1–Q3 2025 (Baseline)',
    company_id: 'meridiana-group',
    reporting_period: 'Q1–Q3 2025',
    narrative: 'Baseline state — participation concentrated in 12% of workers. Activation Safeguard: WARNING.',
    safeguard_status: 'WARNING',
    kora_index_value: 47,
    demo_activation_summary: '38% activation · 22% meaningful · Safeguard WARNING',
    demo_confidence_score: 0.60,
  },
  {
    id: 'S2',
    label: 'Meridiana — Q1–Q4 2025 (Improved)',
    company_id: 'meridiana-group',
    reporting_period: 'Q1–Q4 2025',
    narrative: 'Post-recommendation state — broader activation, improved continuity. Activation Safeguard: CLEAR.',
    safeguard_status: 'CLEAR',
    kora_index_value: 64,
    demo_activation_summary: '52% activation · 38% meaningful · Safeguard CLEAR',
    demo_confidence_score: 0.72,
  },
];

export class ScenarioService implements IScenarioService {
  getScenario(id: ScenarioId): ScenarioConfig {
    return STUB_SCENARIOS.find((s) => s.id === id) ?? STUB_SCENARIOS[0];
  }

  listScenarios(): ScenarioConfig[] {
    return STUB_SCENARIOS;
  }

  getAvailableScenarios(): ScenarioConfig[] {
    return STUB_SCENARIOS;
  }

  // Returns records matching the scenario, plus records with scenario_id = "all"
  filterByScenario<T extends { scenario_id: string }>(
    records: T[],
    scenarioId: ScenarioId,
  ): T[] {
    return records.filter(
      (r) => r.scenario_id === scenarioId || r.scenario_id === 'all',
    );
  }
}

export const scenarioService = new ScenarioService();
