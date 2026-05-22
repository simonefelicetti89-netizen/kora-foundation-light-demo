import type {
  KoraIndexOutput, KoraIndexComponent, MacroblockScore,
  ScenarioId, CalibrationStatus, CompanyAggregateExtended, MacroblockCode,
} from '@/lib/types';
import type { ComponentCode } from '@/lib/types';
import {
  getMethodologyVersion, getCalibrationStatus,
  getMacroblockWeights, getAllComponentEffectiveWeights,
} from '@/lib/methodology-config/v0.1';
import {
  KORA_INDEX_COMPONENTS, COMPONENT_LABELS,
  COMPONENT_EXTERNAL, COMPONENT_MACROBLOCK,
  MACROBLOCK_CODES, MACROBLOCK_LABELS,
} from '@/lib/constants/kora';
import { activationSafeguardService } from '@/services/activation-safeguard/ActivationSafeguardService';
import koraIndexRaw from '@/data/synthetic/kora-index-outputs.json';
import companyAggregatesRaw from '@/data/synthetic/company-aggregates.json';
import confidenceRaw from '@/data/synthetic/confidence-records.json';

interface SeedComponent {
  code: string; label: string; value: number; weight: number;
  note?: string; external?: boolean; macroblock?: string;
}

interface SeedMacroblockScore {
  code: string; label: string; weight: number; score: number;
  component_codes: string[]; main_driver?: string; risk_opportunity?: string;
}

interface SeedKoraIndex {
  id: string; company_id: string; scenario_id: string; reporting_period: string;
  kora_index_value: number; safeguard_status: string; confidence_score: number;
  confidence_score_id: string; activation_safeguard_result_id: string;
  scoring_run_id: string; methodology_version_id: string; calibration_status: string;
  limitations_text: string; components: SeedComponent[];
  macroblocks?: SeedMacroblockScore[];
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
  evidence_quality: number; mapping_confidence: number; verification_weight: number;
  source_coverage: Record<string, string>; gaps_identified: string[];
  limitations: string; methodology_version_id: string; calibration_status: string;
  synthetic_demo_data: true; generated_for: string; not_live_data: true;
}

export interface ConfidenceRecord {
  id: string;
  company_id: string;
  scenario_id: string;
  confidence_score: number;
  confidence_level: string;
  data_completeness: number;
  evidence_quality: number;
  mapping_confidence: number;
  verification_weight: number;
  source_coverage: Record<string, string>;
  gaps_identified: string[];
  limitations: string;
  methodology_version_id: string;
  calibration_status: string;
}

export interface KoraIndexV3Summary {
  kora_index_value: number;
  confidence_score: number;
  safeguard_status: KoraIndexOutput['safeguard_status'];
  calibration_status: CalibrationStatus;
  methodology_version_id: string;
  macroblocks: MacroblockScore[];
}

const koraIndexRecords = (koraIndexRaw as { data: SeedKoraIndex[] }).data;
const aggregateRecords = (companyAggregatesRaw as { data: SeedAggregate[] }).data;
const confidenceRecords = (confidenceRaw as { data: SeedConfidence[] }).data;

export interface IScoringSimulatorService {
  score(companyId: string, scenarioId: ScenarioId, reportingPeriod: string): KoraIndexOutput;
  getKoraIndexOutput(companyId: string, scenarioId: ScenarioId): KoraIndexOutput | null;
  getKoraIndexComponents(companyId: string, scenarioId: ScenarioId): KoraIndexComponent[];
  getMacroblockScores(companyId: string, scenarioId: ScenarioId): MacroblockScore[];
  getKoraIndexV3Summary(companyId: string, scenarioId: ScenarioId): KoraIndexV3Summary | null;
  computeKoraIndexV3(macroblockScores: MacroblockScore[]): number;
  getConfidenceScore(companyId: string, scenarioId: ScenarioId): number | null;
  getConfidenceRecord(companyId: string, scenarioId: ScenarioId): ConfidenceRecord | null;
  getCompanyAggregate(companyId: string, scenarioId: ScenarioId): CompanyAggregateExtended | null;
  getActivationSafeguard(companyId: string, scenarioId: ScenarioId): ReturnType<typeof activationSafeguardService.evaluateFromSeed>;
}

export class ScoringSimulatorService implements IScoringSimulatorService {
  private readonly effectiveWeights = getAllComponentEffectiveWeights();

  private mapSeedToOutput(seed: SeedKoraIndex): KoraIndexOutput {
    const components: KoraIndexComponent[] = KORA_INDEX_COMPONENTS.map((canonicalCode) => {
      const seedComp = seed.components.find((c) => c.code === canonicalCode);
      const macroblockRaw = COMPONENT_MACROBLOCK[canonicalCode];
      const isExternal = COMPONENT_EXTERNAL[canonicalCode] === true;
      return {
        code: canonicalCode as ComponentCode,
        label: COMPONENT_LABELS[canonicalCode],
        value: seedComp?.value ?? 0,
        weight: this.effectiveWeights[canonicalCode] ?? 0,
        ...(isExternal && { external: true }),
        ...(!isExternal && macroblockRaw && {
          macroblock: macroblockRaw as MacroblockCode,
        }),
      };
    });

    const macroblocks: MacroblockScore[] | undefined = seed.macroblocks
      ? seed.macroblocks.map((mb) => ({
          code: mb.code as MacroblockCode,
          label: mb.label,
          weight: mb.weight,
          score: mb.score,
          component_codes: mb.component_codes,
          main_driver: mb.main_driver,
          risk_opportunity: mb.risk_opportunity,
        }))
      : undefined;

    return {
      id: seed.id,
      company_id: seed.company_id,
      scenario_id: seed.scenario_id as ScenarioId,
      reporting_period: seed.reporting_period,
      kora_index_value: seed.kora_index_value,
      components,
      macroblocks,
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

  getMacroblockScores(companyId: string, scenarioId: ScenarioId): MacroblockScore[] {
    return this.getKoraIndexOutput(companyId, scenarioId)?.macroblocks ?? [];
  }

  getKoraIndexV3Summary(companyId: string, scenarioId: ScenarioId): KoraIndexV3Summary | null {
    const output = this.getKoraIndexOutput(companyId, scenarioId);
    if (!output) return null;
    return {
      kora_index_value: output.kora_index_value,
      confidence_score: output.confidence_score,
      safeguard_status: output.safeguard_status,
      calibration_status: output.calibration_status,
      methodology_version_id: output.methodology_version_id,
      macroblocks: output.macroblocks ?? [],
    };
  }

  // KORA Index v3 = Σ (macroblock.score × macroblock.weight), rounded.
  // CS is excluded — it is an external reliability indicator with weight = 0.
  computeKoraIndexV3(macroblockScores: MacroblockScore[]): number {
    const mbWeights = getMacroblockWeights();
    const weighted = MACROBLOCK_CODES.reduce((sum, code) => {
      const mb = macroblockScores.find((m) => m.code === code);
      const weight = mbWeights[code] ?? 0;
      return sum + (mb ? mb.score * weight : 0);
    }, 0);
    return Math.round(weighted);
  }

  getConfidenceScore(companyId: string, scenarioId: ScenarioId): number | null {
    const rec = confidenceRecords.find(
      (r) => r.company_id === companyId && r.scenario_id === scenarioId,
    );
    return rec?.confidence_score ?? null;
  }

  getConfidenceRecord(companyId: string, scenarioId: ScenarioId): ConfidenceRecord | null {
    const rec = confidenceRecords.find(
      (r) => r.company_id === companyId && r.scenario_id === scenarioId,
    );
    if (!rec) return null;
    return {
      id: rec.id,
      company_id: rec.company_id,
      scenario_id: rec.scenario_id,
      confidence_score: rec.confidence_score,
      confidence_level: rec.confidence_level,
      data_completeness: rec.data_completeness,
      evidence_quality: rec.evidence_quality,
      mapping_confidence: rec.mapping_confidence,
      verification_weight: rec.verification_weight,
      source_coverage: rec.source_coverage,
      gaps_identified: rec.gaps_identified,
      limitations: rec.limitations,
      methodology_version_id: rec.methodology_version_id,
      calibration_status: rec.calibration_status,
    };
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

  score(companyId: string, scenarioId: ScenarioId, _reportingPeriod: string): KoraIndexOutput {
    const fromSeed = this.getKoraIndexOutput(companyId, scenarioId);
    if (fromSeed) return fromSeed;

    const safeguard = activationSafeguardService.evaluate(0.38, 0.22);
    const components: KoraIndexComponent[] = KORA_INDEX_COMPONENTS.map((code) => {
      const isExternal = COMPONENT_EXTERNAL[code] === true;
      const macroblockRaw = COMPONENT_MACROBLOCK[code];
      return {
        code: code as ComponentCode,
        label: COMPONENT_LABELS[code],
        value: 0,
        weight: this.effectiveWeights[code] ?? 0,
        ...(isExternal && { external: true }),
        ...(!isExternal && macroblockRaw && { macroblock: macroblockRaw as MacroblockCode }),
      };
    });

    const mbWeights = getMacroblockWeights();
    const macroblocks: MacroblockScore[] = MACROBLOCK_CODES.map((code) => ({
      code,
      label: MACROBLOCK_LABELS[code] ?? code,
      weight: mbWeights[code] ?? 0,
      score: 0,
      component_codes: [],
    }));

    return {
      id: `kora-idx-${scenarioId}-${companyId}`,
      company_id: companyId,
      scenario_id: scenarioId,
      reporting_period: _reportingPeriod,
      kora_index_value: 0,
      components,
      macroblocks,
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
