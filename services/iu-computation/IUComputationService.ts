import type {
  PillarCode,
  ActionFamily,
  CalibrationStatus,
  ImpactUnitComputationResult,
  ImpactUnitComputationSummary,
  ImpactUnitFactorTrace,
} from '@/lib/types';
import type { PipelineAnalyzedRow } from '@/services/ingestion-pipeline/IngestionPipelineService';
import type { EligibilityClassificationResult } from '@/services/eligibility-gate/EligibilityGateService';
import type { KoraReadyRecord } from '@/lib/types';
import { getMethodologyVersion, getCalibrationStatus } from '@/lib/methodology-config/v0.1';

// ── Foundation Light factor defaults — BC by action family ──────────────────────
// Conservative pre-empirical values. Requires Delphi Study calibration post-pilot.
const BC_BY_FAMILY: Record<ActionFamily, number> = {
  family_and_care:           1.2,
  health_and_wellbeing:      1.2,
  professional_growth:       1.1,
  future_and_legacy:         1.1,
  inclusion_and_connection:  1.0,
  territorial_impact:        1.0,
  economic_relief:           0,    // AGF=0 anyway; explicit for traceability
  blocked_compliance:        0,    // AGF=0 anyway; explicit for traceability
};

// EV by evidence_type from ingestion seed field.
// Maps source-level evidence codes to evidence verification weights.
const EV_BY_EVIDENCE_TYPE: Record<string, number> = {
  certified_partner_evidence:   1.0,
  partner_participation_report: 0.9,
  provider_participation_report: 0.9,
  lms_completion_certificate:   0.9,
  lms_completion_log:           0.8,
  invoice_receipt:              0.85,
  invoice_or_budget_record:     0.8,
  session_log_hr:               0.8,
  license_certificate:          0.8,
  signed_delivery_form:         0.8,
  aggregate_session_count:      0.75,
  attendance_report:            0.75,
  voucher_distribution_log:     0.7,
  declaration_self_certified:   0.6,
  manual_note:                  0.6,
};

type FactorResult = { value: number; reason: string; data_source: string; foundation_light_stub: boolean };

// ── Factor derivation functions ─────────────────────────────────────────────────

function deriveAGF(
  classification: EligibilityClassificationResult,
  koraReady: KoraReadyRecord,
): FactorResult {
  if (classification.kora_eligibility === 'blocked') {
    return {
      value: 0,
      reason: 'Blocked by Design — compliance obbligatoria. IU = 0 per design.',
      data_source: 'eligibility_gate.kora_eligibility',
      foundation_light_stub: false,
    };
  }
  if (classification.kora_eligibility === 'limited') {
    return {
      value: 0,
      reason: 'Economic Relief — 0 IU. Tracciato solo in BTI governance.',
      data_source: 'eligibility_gate.kora_eligibility',
      foundation_light_stub: false,
    };
  }
  if (classification.review_required) {
    return {
      value: 0,
      reason: 'Human Review Required — IU computation sospesa fino a risoluzione.',
      data_source: 'eligibility_gate.review_required',
      foundation_light_stub: false,
    };
  }
  if (!koraReady.approved_for_impact_units) {
    return {
      value: 0,
      reason: 'Governance flag approved_for_impact_units=false — IU non autorizzate.',
      data_source: 'kora_ready.approved_for_impact_units',
      foundation_light_stub: false,
    };
  }
  return {
    value: 1.0,
    reason: 'Eligible e approvato per Impact Units — nessun segnale anti-gaming rilevato.',
    data_source: 'kora_ready.approved_for_impact_units',
    foundation_light_stub: true,
  };
}

function deriveNM(): FactorResult {
  // TODO: future NM must normalize duration, intensity, beneficiary count
  // against reference baselines per action family (post Delphi Study).
  return {
    value: 1.0,
    reason: 'Foundation Light stub: NM = 1.0 (intensità standard, nessuna normalizzazione avanzata attiva).',
    data_source: 'foundation_light_default',
    foundation_light_stub: true,
  };
}

function deriveBC(actionFamily: ActionFamily): FactorResult {
  const bc = BC_BY_FAMILY[actionFamily] ?? 1.0;
  return {
    value: bc,
    reason: `BC per famiglia "${actionFamily}" — valore conservativo pre-calibrazione empirica.`,
    data_source: 'action_taxonomy.action_family',
    foundation_light_stub: true,
  };
}

function deriveCQ(missingFields: string[]): FactorResult {
  const n = missingFields.length;
  let cq: number;
  let reason: string;
  if (n === 0) {
    cq = 1.0;
    reason = 'Nessun campo mancante — completezza massima.';
  } else if (n === 1) {
    cq = 0.85;
    reason = `1 campo mancante (${missingFields[0]}) — penalità leggera.`;
  } else if (n === 2) {
    cq = 0.70;
    reason = `2 campi mancanti (${missingFields.slice(0, 2).join(', ')}) — penalità moderata.`;
  } else {
    cq = 0.50;
    reason = `${n} campi mancanti — completezza insufficiente, penalità elevata.`;
  }
  return {
    value: cq,
    reason,
    data_source: 'normalized_row.missing_fields',
    foundation_light_stub: true,
  };
}

function deriveEV(evidenceType: string): FactorResult {
  const ev = EV_BY_EVIDENCE_TYPE[evidenceType] ?? 0.5;
  const isKnown = evidenceType in EV_BY_EVIDENCE_TYPE;
  return {
    value: ev,
    reason: isKnown
      ? `Tipo evidenza "${evidenceType}" — peso verifica ${ev}.`
      : `Tipo evidenza "${evidenceType}" non mappato — fallback conservativo 0.5.`,
    data_source: 'normalized_row.evidence_type',
    foundation_light_stub: true,
  };
}

function deriveCF(siteOrCluster: string | null): FactorResult {
  if (siteOrCluster) {
    return {
      value: 1.1,
      reason: `Intervento mirato a sede/cluster "${siteOrCluster}" — CF amplificato per targeting specifico.`,
      data_source: 'normalized_row.site_or_cluster',
      foundation_light_stub: true,
    };
  }
  return {
    value: 1.0,
    reason: 'Iniziativa aziendale generica — CF neutro (1.0).',
    data_source: 'foundation_light_default',
    foundation_light_stub: true,
  };
}

function distributeByPillar(
  totalIU: number,
  primaryPillar: PillarCode | null,
  pillarDistribution: Partial<Record<PillarCode, number>>,
): Partial<Record<PillarCode, number>> {
  if (totalIU === 0) return {};
  const dist = pillarDistribution;
  const keys = Object.keys(dist) as PillarCode[];
  if (keys.length > 0) {
    const result: Partial<Record<PillarCode, number>> = {};
    for (const p of keys) {
      const share = dist[p] ?? 0;
      result[p] = +(totalIU * share).toFixed(4);
    }
    return result;
  }
  if (primaryPillar) {
    return { [primaryPillar]: totalIU } as Partial<Record<PillarCode, number>>;
  }
  return {};
}

function buildExplanation(
  isBlocked: boolean,
  isLimited: boolean,
  isReviewRequired: boolean,
  isComputed: boolean,
  totalIU: number,
  nm: number,
  bc: number,
  cq: number,
  ev: number,
  cf: number,
  agf: number,
): string {
  if (isBlocked) {
    return `Blocked by Design — 0 IU. KORA non trasforma la compliance in impatto. La conformità legale è una baseline, non impatto.`;
  }
  if (isLimited) {
    return `Economic Relief governance only. No Impact Units in Foundation Light. Tracciato come economic_relief_spend nel BTI engine.`;
  }
  if (isReviewRequired) {
    return `Human Review Required — cannot enter IU computation until reviewed. IU = 0 pending human review resolution.`;
  }
  if (!isComputed) {
    return `Record non idoneo alla computazione IU — governance flag non attivo.`;
  }
  return `IU = NM(${nm}) × BC(${bc}) × CQ(${cq.toFixed(2)}) × EV(${ev}) × CF(${cf}) × AGF(${agf}) = ${totalIU.toFixed(4)} · Foundation Light stub v0.1 — pre-calibrazione empirica.`;
}

// ── Service interface ────────────────────────────────────────────────────────────

export interface IIUComputationService {
  computeIUForRecord(row: PipelineAnalyzedRow): ImpactUnitComputationResult;
  computeIUForRecords(rows: PipelineAnalyzedRow[]): ImpactUnitComputationResult[];
  getIUComputationTrace(row: PipelineAnalyzedRow): ImpactUnitFactorTrace[];
  getIUComputationSummary(rows: PipelineAnalyzedRow[]): ImpactUnitComputationSummary;
  explainFactors(row: PipelineAnalyzedRow): ImpactUnitFactorTrace[];
}

// ── Service ──────────────────────────────────────────────────────────────────────

export class IUComputationService implements IIUComputationService {
  private readonly methodologyVersion: string;
  private readonly calibrationStatus: CalibrationStatus;

  constructor() {
    this.methodologyVersion = getMethodologyVersion();
    this.calibrationStatus = getCalibrationStatus() as CalibrationStatus;
  }

  computeIUForRecord(row: PipelineAnalyzedRow): ImpactUnitComputationResult {
    const { classification, kora_ready, normalized } = row;

    const agfResult = deriveAGF(classification, kora_ready);
    const nmResult  = deriveNM();
    const bcResult  = deriveBC(classification.action_family);
    const cqResult  = deriveCQ(normalized.missing_fields);
    const evResult  = deriveEV(normalized.evidence_type);
    const cfResult  = deriveCF(normalized.site_or_cluster);

    const agf = agfResult.value;
    const nm  = nmResult.value;
    const bc  = bcResult.value;
    const cq  = cqResult.value;
    const ev  = evResult.value;
    const cf  = cfResult.value;

    const impact_units_total = agf === 0 ? 0 : +(nm * bc * cq * ev * cf * agf).toFixed(4);

    const isBlocked       = classification.kora_eligibility === 'blocked';
    const isLimited       = classification.kora_eligibility === 'limited';
    const isReviewReq     = classification.review_required;
    const isComputed      = !isBlocked && !isLimited && !isReviewReq && kora_ready.approved_for_impact_units;

    const impact_units_by_pillar = distributeByPillar(
      impact_units_total,
      classification.primary_pillar,
      classification.pillar_distribution,
    );

    let exclusion_reason: string | null = null;
    if (isBlocked) {
      exclusion_reason = classification.blocked_reason ?? 'Blocked by Design — 0 IU per design.';
    } else if (isLimited) {
      exclusion_reason = 'Economic Relief — 0 IU in Foundation Light. BTI governance only.';
    } else if (isReviewReq) {
      exclusion_reason = 'Human Review Required — IU computation sospesa.';
    } else if (!kora_ready.approved_for_impact_units) {
      exclusion_reason = 'approved_for_impact_units = false.';
    }

    const formula_trace: ImpactUnitFactorTrace[] = [
      { factor_code: 'NM',  label: 'Normalized Magnitude',   ...nmResult },
      { factor_code: 'BC',  label: 'Base Contribution',       ...bcResult },
      { factor_code: 'CQ',  label: 'Completeness Quality',    ...cqResult },
      { factor_code: 'EV',  label: 'Evidence Verification',   ...evResult },
      { factor_code: 'CF',  label: 'Contextual Factor',       ...cfResult },
      { factor_code: 'AGF', label: 'Anti-Gaming Factor',      ...agfResult },
    ];

    return {
      record_id:                normalized.id,
      source_row_id:            normalized.id,
      action_family:            classification.action_family,
      event_nature:             classification.event_nature,
      eligibility:              classification.kora_eligibility,
      primary_pillar:           classification.primary_pillar,
      pillar_distribution:      classification.pillar_distribution,
      normalized_magnitude_nm:  nm,
      base_contribution_bc:     bc,
      completeness_quality_cq:  cq,
      evidence_verification_ev: ev,
      contextual_factor_cf:     cf,
      anti_gaming_factor_agf:   agf,
      impact_units_total,
      impact_units_by_pillar,
      computed:                 isComputed,
      blocked:                  isBlocked,
      limited:                  isLimited,
      review_required:          isReviewReq,
      exclusion_reason,
      explanation: buildExplanation(isBlocked, isLimited, isReviewReq, isComputed, impact_units_total, nm, bc, cq, ev, cf, agf),
      formula_trace,
      methodology_version:  this.methodologyVersion,
      calibration_status:   this.calibrationStatus,
    };
  }

  computeIUForRecords(rows: PipelineAnalyzedRow[]): ImpactUnitComputationResult[] {
    return rows.map((r) => this.computeIUForRecord(r));
  }

  getIUComputationTrace(row: PipelineAnalyzedRow): ImpactUnitFactorTrace[] {
    return this.computeIUForRecord(row).formula_trace;
  }

  getIUComputationSummary(rows: PipelineAnalyzedRow[]): ImpactUnitComputationSummary {
    const results = this.computeIUForRecords(rows);

    const total_impact_units = results.reduce((s, r) => s + r.impact_units_total, 0);

    const impact_units_by_pillar: Partial<Record<PillarCode, number>> = {};
    for (const r of results) {
      for (const [pillar, iu] of Object.entries(r.impact_units_by_pillar)) {
        const p = pillar as PillarCode;
        impact_units_by_pillar[p] = +((impact_units_by_pillar[p] ?? 0) + (iu ?? 0)).toFixed(4);
      }
    }

    const avg = (vals: number[]) =>
      vals.length === 0 ? 0 : +(vals.reduce((s, v) => s + v, 0) / vals.length).toFixed(3);

    return {
      total_records:           results.length,
      computed_records:        results.filter((r) => r.computed).length,
      blocked_records:         results.filter((r) => r.blocked).length,
      limited_records:         results.filter((r) => r.limited).length,
      review_required_records: results.filter((r) => r.review_required).length,
      total_impact_units:      +total_impact_units.toFixed(4),
      impact_units_by_pillar,
      records_without_iu:      results.filter((r) => !r.computed).length,
      average_cq:  avg(results.map((r) => r.completeness_quality_cq)),
      average_ev:  avg(results.map((r) => r.evidence_verification_ev)),
      average_cf:  avg(results.map((r) => r.contextual_factor_cf)),
      average_agf: avg(results.map((r) => r.anti_gaming_factor_agf)),
      methodology_version: this.methodologyVersion,
      calibration_status:  this.calibrationStatus,
    };
  }

  explainFactors(row: PipelineAnalyzedRow): ImpactUnitFactorTrace[] {
    return this.getIUComputationTrace(row);
  }
}

export const iuComputationService = new IUComputationService();
