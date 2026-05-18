import type { KoraIndexOutput, ScenarioId, CalibrationStatus } from '@/lib/types';
import { getMethodologyVersion, getCalibrationStatus, getWeights } from '@/lib/methodology-config/v0.1';
import { KORA_INDEX_COMPONENTS, COMPONENT_LABELS } from '@/lib/constants/kora';
import { activationSafeguardService } from '@/services/activation-safeguard/ActivationSafeguardService';

export interface IScoringSimulatorService {
  score(companyId: string, scenarioId: ScenarioId, reportingPeriod: string): KoraIndexOutput;
}

export class ScoringSimulatorService implements IScoringSimulatorService {
  // All weights read from methodology-config — never hardcoded in this service
  score(companyId: string, scenarioId: ScenarioId, reportingPeriod: string): KoraIndexOutput {
    const weights = getWeights();
    const methodologyVersionId = getMethodologyVersion();
    const calibrationStatus = getCalibrationStatus() as CalibrationStatus;

    // Stub values for scaffold — replaced by real seed data in Phase 1
    const stubAR = scenarioId === 'S2' ? 0.52 : 0.38;
    const stubMAR = scenarioId === 'S2' ? 0.38 : 0.22;
    const safeguardResult = activationSafeguardService.evaluate(stubAR, stubMAR);
    const stubIndexValue = scenarioId === 'S2' ? 64 : 47;

    const components = KORA_INDEX_COMPONENTS.map((code) => ({
      code,
      label: COMPONENT_LABELS[code],
      value: 0.5,
      weight: weights[code],
    }));

    return {
      id: `kora-idx-${scenarioId}-${companyId}`,
      company_id: companyId,
      scenario_id: scenarioId,
      reporting_period: reportingPeriod,
      kora_index_value: stubIndexValue,
      components,
      methodology_version_id: methodologyVersionId,
      calibration_status: calibrationStatus,
      confidence_score: scenarioId === 'S2' ? 0.77 : 0.60,
      safeguard_status: safeguardResult.status,
      generated_at: new Date().toISOString(),
      synthetic_demo_data: true,
    };
  }
}

export const scoringSimulatorService = new ScoringSimulatorService();
