import type { ScenarioConfig, ScenarioId } from '@/lib/types';

export interface IScenarioService {
  getScenario(id: ScenarioId): ScenarioConfig;
  listScenarios(): ScenarioConfig[];
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
  },
  {
    id: 'S2',
    label: 'Meridiana — Q1–Q4 2025 (Improved)',
    company_id: 'meridiana-group',
    reporting_period: 'Q1–Q4 2025',
    narrative: 'Post-recommendation state — broader activation, improved continuity. Activation Safeguard: CLEAR.',
    safeguard_status: 'CLEAR',
    kora_index_value: 64,
  },
];

export class ScenarioService implements IScenarioService {
  getScenario(id: ScenarioId): ScenarioConfig {
    return STUB_SCENARIOS.find((s) => s.id === id) ?? STUB_SCENARIOS[0];
  }

  listScenarios(): ScenarioConfig[] {
    return STUB_SCENARIOS;
  }
}

export const scenarioService = new ScenarioService();
