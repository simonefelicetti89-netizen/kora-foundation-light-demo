import type {
  KoraIndexOutput, KoraIndexComponent, ScenarioId, CalibrationStatus,
  CompanyAggregateExtended,
} from '@/lib/types';
import type { ComponentCode } from '@/lib/types';
import { getMethodologyVersion, getCalibrationStatus } from '@/lib/methodology-config/v0.1';
import { KORA_INDEX_COMPONENTS, COMPONENT_LABELS } from '@/lib/constants/kora';
import { activationSafeguardService } from '@/services/activation-safeguard/ActivationSafeguardService';
import koraIndexRaw from '@/data/synthetic/kora-index-outputs.json';
import companyAggregatesRaw from '@/data/synthetic/company-aggregates.json';
import confidenceRaw from '@/data/synthetic/confidence-records.json';

interface SeedComponent {
  code: string; label: string; value: number; weight: number; note?: string;
}

interface SeedKoraIndex {
  id: string; company_id: string; scenario_id: string; reporting_period: string;
  kora_index_value: number; safeguard_status: string; confidence_score: number;
  confidence_score_id: string; activation_safeguard_result_id: string;
  scoring_run_id: string; methodology_version_id: string; calibration_status: string;
  limitations_text: string; components: SeedComponent[];
  synthetic_demo_data: true; generated_for: string; not_live_data: true;
}

interface SeedAggregate {
  id: string; company_id: string; scenario_id: string; reporting_period: string;
  total_workers: number; eligible_worker_count: number; active_worker_count: number;
  meaningful_active_worker_count: number; activation_rate: number;
  meaningful_activation_rate: number; continuity_rate: number;
  verification_rate: number; pillar_distribution: Record<string, number>;
  department_activation: Record<string, number>; privacy_threshold_met: boolean;
  methodology_version_id: string; calibration_status: string;
  synthetic_demo_data: true; generated_for: string; not_live_data: true;
}

interface SeedConfidence {
  id: string; company_id: string; scenario_id: string;
  kora_index_output_id: string; confidence_score: number;
  confidence_level: string; data_completeness: number;
  evidence_quality: number; methodology_version_id: string; calibration_status: string;
  synthetic_demo_data: true; generated_for: string; not_live_data: true;
}

const koraIndexRecords = (koraIndexRaw as { data: SeedKoraIndex[] }).data;
const aggregateRecords = (companyAggregatesRaw as { data: SeedAggregate[] }).data;
const confidenceRecords = (confidenceRaw as { data: SeedConfidence[] }).data;

export interface IScoringSimulatorService {
  score(companyId: string, scenarioId: ScenarioId, reportingPeriod: string): KoraIndexOutput;
  getKoraIndexOutput(companyId: string, scenarioId: ScenarioId): KoraIndexOutput | null;
  getKoraIndexComponents(companyId: string, scenarioId: ScenarioId): KoraIndexComponent[];
  getConfidenceScore(companyId: string, scenarioId: ScenarioId): number | null;
  getCompanyAggregate(companyId: string, scenarioId: ScenarioId): CompanyAggregateExtended | null;
  getActivationSafeguard(companyId: string, scenarioId: ScenarioId): ReturnType<typeof activationSafeguardService.evaluateFromSeed>;
}

export class ScoringSimulatorService implements IScoringSimulatorService {
  private mapSeedToOutput(seed: SeedKoraIndex): KoraIndexOutput {
    // Map seed components — strip 'note' field, assert canonical code type
    const components: KoraIndexComponent[] = KORA_INDEX_COMPONENTS.map((canonicalCode) => {
      const seedComp = seed.components.find((c) => c.code === canonicalCode);
      return {
        code: canonicalCode as ComponentCode,
        label: COMPONENT_LABELS[canonicalCode],
        value: seedComp?.value ?? 0,
        weight: seedComp?.weight ?? 0.1,
      };
    });

    return {
      id: seed.id,
      company_id: seed.company_id,
      scenario_id: seed.scenario_id as ScenarioId,
      reporting_period: seed.reporting_period,
      kora_index_value: seed.kora_index_value,
      components,
      methodology_version_id: getMethodologyVersion(),
      calibration_status: getCalibrationStatus() as CalibrationStatus,
      confidence_score: seed.confidence_score,
      safeguard_status: seed.safeguard_status as KoraIndexOutput['safeguard_status'],
      generated_at: new Date().toISOString(),
      synthetic_demo_data: true,
      confidence_score_id: seed.confidence_score_id,
      activation_safeguard_result_id: seed.activation_safeguard_result_id,
      scoring_run_id: seed.scoring_run_id,
      limitations_text: seed.limitations_text,
    };
  }

  getKoraIndexOutput(companyId: string, scenarioId: ScenarioId): KoraIndexOutput | null {
    const seed = koraIndexRecords.find(
      (r) => r.company_id === companyId && r.scenario_id === scenarioId,
    );
    if (!seed) return null;
    return this.mapSeedToOutput(seed);
  }

  getKoraIndexComponents(companyId: string, scenarioId: ScenarioId): KoraIndexComponent[] {
    return this.getKoraIndexOutput(companyId, scenarioId)?.components ?? [];
  }

  getConfidenceScore(companyId: string, scenarioId: ScenarioId): number | null {
    const rec = confidenceRecords.find(
      (r) => r.company_id === companyId && r.scenario_id === scenarioId,
    );
    return rec?.confidence_score ?? null;
  }

  getCompanyAggregate(companyId: string, scenarioId: ScenarioId): CompanyAggregateExtended | null {
    const seed = aggregateRecords.find(
      (r) => r.company_id === companyId && r.scenario_id === scenarioId,
    );
    if (!seed) return null;
    return {
      ...seed,
      scenario_id: seed.scenario_id as ScenarioId,
      calibration_status: seed.calibration_status as CalibrationStatus,
      pillar_distribution: seed.pillar_distribution as Record<import('@/lib/types').PillarCode, number>,
    } as CompanyAggregateExtended;
  }

  getActivationSafeguard(companyId: string, scenarioId: ScenarioId) {
    return activationSafeguardService.evaluateFromSeed(companyId, scenarioId);
  }

  // Backwards-compatible score() — reads from seed, falls back to derived values
  score(companyId: string, scenarioId: ScenarioId, _reportingPeriod: string): KoraIndexOutput {
    const fromSeed = this.getKoraIndexOutput(companyId, scenarioId);
    if (fromSeed) return fromSeed;

    // Fallback: derive from safeguard (no seed record for this company/scenario)
    const safeguard = activationSafeguardService.evaluate(0.38, 0.22);
    const components: KoraIndexComponent[] = KORA_INDEX_COMPONENTS.map((code) => ({
      code: code as ComponentCode,
      label: COMPONENT_LABELS[code],
      value: 0,
      weight: 0.1,
    }));
    return {
      id: `kora-idx-${scenarioId}-${companyId}`,
      company_id: companyId,
      scenario_id: scenarioId,
      reporting_period: _reportingPeriod,
      kora_index_value: 0,
      components,
      methodology_version_id: getMethodologyVersion(),
      calibration_status: getCalibrationStatus() as CalibrationStatus,
      confidence_score: 0,
      safeguard_status: safeguard.status,
      generated_at: new Date().toISOString(),
      synthetic_demo_data: true,
    };
  }
}

export const scoringSimulatorService = new ScoringSimulatorService();
