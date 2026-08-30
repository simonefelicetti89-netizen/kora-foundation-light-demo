import type {
  PillarCode,
  ActionFamily,
  CalibrationStatus,
  EligibilityClass,
  EventNature,
  ImpactUnitComputationResult,
  ImpactUnitComputationSummary,
  ImpactUnitFactorTrace,
} from '@/lib/types';
import type { PipelineAnalyzedRow } from '@/services/ingestion-pipeline/IngestionPipelineService';
import { getMethodologyVersion, getCalibrationStatus, getNMFunctionsConfig, getBCByActionFamily } from '@/lib/methodology-config/v0.1';

// ── BC by action family — B-BC (CC-009) ──────────────────────────────────────────
// Single source of truth: lib/methodology-config/v0.1.ts (getBCByActionFamily()),
// backed by data/methodology/methodology-config.json. Conservative pre-empirical
// values, requires Delphi Study calibration post-pilot. Do not hardcode here —
// economic_relief/blocked_compliance are 0 (AGF=0 anyway; explicit for traceability).
const BC_BY_FAMILY: Record<ActionFamily, number> = getBCByActionFamily();

// EV by evidence_type from ingestion seed field.
// Maps source-level evidence codes to evidence verification weights (IU formula EV factor).
// L-code entries (L0–L4) handle the live pipeline path (from uef_record.payload.evidence_level).
// Long-form codes handle the ingestion pipeline demo path (from NormalizedIngestionRow.evidence_type).
//
// IU EV SCALE (this table) vs COMPONENT SIGNAL SCALE (component-engine.ts EVIDENCE_WEIGHTS):
//   These are two independent scales with different semantic purposes and MUST NOT be merged.
//   IU EV: multiplied into the IU formula — NM × BC × CQ × EV × CF × AGF.
//   Component NI/VR: diagnostic signals for Activation Quality (EVQ) and verificationConfidence.
//   They share the same L-code vocabulary but assign different weights to L0/L1 by design.
//   Do not align them mechanically — calibration post-Delphi Study governs any future changes.
const EV_BY_EVIDENCE_TYPE: Record<string, number> = {
  // ── Live pipeline L-codes (canonical IU EV scale) ─────────────────────────────
  'L0': 0.25,  // L0_NO_EVIDENCE — canonical IU EV; no evidence → lowest weight
  'L1': 0.60,  // L1_SELF_DECLARED — low verification
  'L2': 0.75,  // L2_INTERNAL_DOCUMENT — moderate verification
  'L3': 0.90,  // L3_THIRD_PARTY_DOCUMENT — high verification
  'L4': 1.00,  // L4_VERIFIED_EVIDENCE — full verification
  // ── Ingestion pipeline long-form codes ────────────────────────────────────────
  certified_partner_evidence:    1.0,
  partner_participation_report:  0.9,
  provider_participation_report: 0.9,
  lms_completion_certificate:    0.9,
  lms_completion_log:            0.8,
  invoice_receipt:               0.85,
  invoice_or_budget_record:      0.8,
  session_log_hr:                0.8,
  license_certificate:           0.8,
  signed_delivery_form:          0.8,
  aggregate_session_count:       0.75,
  attendance_report:             0.75,
  voucher_distribution_log:      0.7,
  declaration_self_certified:    0.6,
  manual_note:                   0.6,
  // Structural policy evidence types — aggregate-only, no individual usage data
  third_party_hr_audit:          0.92,
  board_approval_record:         0.90,
  collective_agreement_signed:   0.90,
  advisor_validated_policy:      0.88,
  formal_policy_document:        0.85,
  hr_policy_register:            0.80,
  self_declared_policy:          0.55,
};

type FactorResult = { value: number; reason: string; data_source: string; foundation_light_stub: boolean };

// ── Sprint 2 B-SM1 — Continuous NM sub-functions ─────────────────────────────
// All functions return 1.0 (neutral) when the required input is absent.
// "dato mancante = neutro, mai penalizzante né gonfiante"

// effort(d_min) = 0.40 + 1.10 × d/(d+90), d in minutes.
// Range: [0.40, 1.50). Fallback (no duration) = 1.0 (neutral).
export function computeEffort(duration_hours?: number): number {
  if (duration_hours === undefined || duration_hours === null || isNaN(duration_hours)) return 1.0;
  const d = Math.max(0, duration_hours * 60); // convert to minutes
  if (d === 0) return 1.0; // 0-hour events: neutral (not punished)
  return 0.40 + 1.10 * (d / (d + 90));
}

// recency(Δt_days) = max(floor, exp(−λ × Δt)).
// λ_single = 0.023 events; λ_recurring = 0.008 recurring programs.
// Fallback (no event_date) = 1.0 (neutral).
export function computeRecency(event_date?: string, is_recurring = false): number {
  if (!event_date) return 1.0;
  const cfg = getNMFunctionsConfig();
  const ref = new Date(cfg.reference_date);
  const evt = new Date(event_date);
  if (isNaN(evt.getTime()) || isNaN(ref.getTime())) return 1.0;
  const delta_days = Math.max(0, (ref.getTime() - evt.getTime()) / 86_400_000);
  const lambda = is_recurring ? cfg.recency_lambda_recurring : cfg.recency_lambda_single;
  return Math.max(cfg.recency_floor, Math.exp(-lambda * delta_days));
}

// saturation(n) = max(floor, 1/(1 + decay × n)).
// n = repetition_count (0 = first time → no saturation).
// therapeutic events (health_and_wellbeing) use higher floor.
// Fallback (n undefined) = 1.0 (neutral).
export function computeSaturation(
  repetition_count?: number,
  is_therapeutic = false,
): number {
  if (repetition_count === undefined || repetition_count === null || isNaN(repetition_count)) return 1.0;
  const n = Math.max(0, Math.floor(repetition_count));
  if (n === 0) return 1.0; // first occurrence → no saturation
  const cfg = getNMFunctionsConfig();
  const floor = is_therapeutic ? cfg.saturation_floor_therapeutic : cfg.saturation_floor_default;
  return Math.max(floor, 1 / (1 + cfg.saturation_decay * n));
}

// ── Factor derivation functions ─────────────────────────────────────────────────

function deriveAGF(params: {
  kora_eligibility: EligibilityClass | 'review_required';
  review_required: boolean;
  approved_for_impact_units: boolean;
  blocked_reason?: string;
}): FactorResult {
  if (params.kora_eligibility === 'blocked') {
    return {
      value: 0,
      reason: `Blocked by Design — compliance obbligatoria. IU = 0 per design.${params.blocked_reason ? ` Motivo: ${params.blocked_reason}` : ''}`,
      data_source: 'eligibility_gate.kora_eligibility',
      foundation_light_stub: false,
    };
  }
  if (params.kora_eligibility === 'limited') {
    return {
      value: 0,
      reason: 'Economic Relief — 0 IU. Tracciato solo in BTI governance.',
      data_source: 'eligibility_gate.kora_eligibility',
      foundation_light_stub: false,
    };
  }
  if (params.review_required || params.kora_eligibility === 'review_required') {
    return {
      value: 0,
      reason: 'Human Review Required — IU computation sospesa fino a risoluzione.',
      data_source: 'eligibility_gate.review_required',
      foundation_light_stub: false,
    };
  }
  if (!params.approved_for_impact_units) {
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

function deriveNM(params?: {
  duration_hours?: number;
  event_date?: string;
  repetition_count?: number;
  is_recurring?: boolean;
  is_therapeutic?: boolean;
}): FactorResult {
  // Sprint 2 B-SM1: NM = effort × recency × saturation.
  // Each factor is 1.0 (neutral) when its input is absent.
  // "dato mancante = neutro, mai penalizzante né gonfiante"
  const effort     = computeEffort(params?.duration_hours);
  const recency    = computeRecency(params?.event_date, params?.is_recurring);
  const saturation = computeSaturation(params?.repetition_count, params?.is_therapeutic);

  const value = Math.min(1.50, effort * recency * saturation);

  const parts: string[] = [];
  if (params?.duration_hours !== undefined)   parts.push(`effort=${effort.toFixed(3)} (${params.duration_hours}h)`);
  if (params?.event_date)                     parts.push(`recency=${recency.toFixed(3)} (Δt from ${params.event_date})`);
  if (params?.repetition_count !== undefined) parts.push(`saturation=${saturation.toFixed(3)} (n=${params.repetition_count})`);

  const allFallback = parts.length === 0;
  const reason = allFallback
    ? 'NM = 1.0 — nessun dato su durata/data/ripetizioni (neutro per dato mancante).'
    : `NM = effort×recency×saturation = ${value.toFixed(3)}. ${parts.join('; ')}.`;

  return { value, reason, data_source: allFallback ? 'foundation_light_default' : 'nm_functions_v3', foundation_light_stub: allFallback };
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

// CF — Continuity Factor (canonical canonical range: 1.00–1.20, cross-period worker engagement).
// KORA Foundation Light stub: canonical CF requires PIB (Personal Impact Balance) and
// cross-period worker activity data. These are not available in the current pipeline.
// Stub implementation: uses site/cluster targeting as a first-order proxy.
// Label: "Continuity Factor (foundation_light_stub)" — must not be presented as canonical CF.
function deriveCF(siteOrCluster: string | null): FactorResult {
  if (siteOrCluster) {
    return {
      value: 1.1,
      reason: `Intervento mirato a sede/cluster "${siteOrCluster}" — proxy continuità engagement (foundation_light_stub). Canonical CF richiede dati cross-periodo post-PIB.`,
      data_source: 'normalized_row.site_or_cluster',
      foundation_light_stub: true,
    };
  }
  return {
    value: 1.0,
    reason: 'Iniziativa aziendale generica — CF neutro (1.0). Canonical CF (cross-period engagement) richiede dati PIB post-calibrazione.',
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

// ── Core extracted-params type (shared by both demo and live paths) ──────────────

interface IUExtractedParams {
  record_id:                string;
  kora_eligibility:         EligibilityClass | 'review_required';
  review_required:          boolean;
  approved_for_impact_units: boolean;
  action_family:            ActionFamily;
  event_nature:             string;
  primary_pillar:           PillarCode | null;
  pillar_distribution:      Partial<Record<PillarCode, number>>;
  blocked_reason:           string | undefined;
  missing_fields:           string[];
  evidence_type:            string;
  site_or_cluster:          string | null;
  // Sprint 2 B-SM1 — NM continuous functions inputs (all optional — fallback = neutral 1.0)
  duration_hours?:          number;
  event_date?:              string;
  b6_repetition_count?:     number;
  is_recurring?:            boolean;
}

// ── IULiveInput — input contract for the live pipeline (UEF approved batch path) ─
// Used by run-kora-pipeline.ts after eligibility + pillar mapping.
// Evidence type is an L-code string (L0/L1/L2/L3/L4) from uef_record.payload.evidence_level.

export interface IULiveInput {
  uef_record_id:             string;
  eligibility:               EligibilityClass | 'review_required';
  review_required:           boolean;
  approved_for_impact_units: boolean;
  action_family:             ActionFamily;
  event_nature?:             string;
  primary_pillar:            PillarCode | null;
  pillar_distribution?:      Partial<Record<PillarCode, number>>;
  missing_fields:            string[];
  evidence_type:             string;  // L0/L1/L2/L3/L4 from live pipeline
  site_or_cluster:           string | null;
  // Sprint 2 B-SM1 — NM continuous functions inputs (all optional — fallback = neutral 1.0)
  duration_hours?:           number;
  event_date?:               string;
  b6_repetition_count?:      number;
  is_recurring?:             boolean;
}

// ── Service interface ────────────────────────────────────────────────────────────

export interface IIUComputationService {
  // Demo path (ingestion pipeline)
  computeIUForRecord(row: PipelineAnalyzedRow): ImpactUnitComputationResult;
  computeIUForRecords(rows: PipelineAnalyzedRow[]): ImpactUnitComputationResult[];
  getIUComputationTrace(row: PipelineAnalyzedRow): ImpactUnitFactorTrace[];
  getIUComputationSummary(rows: PipelineAnalyzedRow[]): ImpactUnitComputationSummary;
  explainFactors(row: PipelineAnalyzedRow): ImpactUnitFactorTrace[];
  // Live pipeline path
  computeIUForLiveInput(input: IULiveInput): ImpactUnitComputationResult;
  computeIUForLiveInputBatch(inputs: IULiveInput[]): ImpactUnitComputationResult[];
  summarizeLiveResults(results: ImpactUnitComputationResult[]): ImpactUnitComputationSummary;
}

// ── Service ──────────────────────────────────────────────────────────────────────

export class IUComputationService implements IIUComputationService {
  private readonly methodologyVersion: string;
  private readonly calibrationStatus: CalibrationStatus;

  constructor() {
    this.methodologyVersion = getMethodologyVersion();
    this.calibrationStatus = getCalibrationStatus() as CalibrationStatus;
  }

  // ── Core computation — shared by demo and live paths ────────────────────────

  private _computeFromExtracted(p: IUExtractedParams): ImpactUnitComputationResult {
    const agfResult = deriveAGF({
      kora_eligibility:         p.kora_eligibility,
      review_required:          p.review_required,
      approved_for_impact_units: p.approved_for_impact_units,
      blocked_reason:           p.blocked_reason,
    });
    const is_therapeutic = p.action_family === 'health_and_wellbeing';
    const nmResult = deriveNM({
      duration_hours:   p.duration_hours,
      event_date:       p.event_date,
      repetition_count: p.b6_repetition_count,
      is_recurring:     p.is_recurring,
      is_therapeutic,
    });
    const bcResult  = deriveBC(p.action_family);
    const cqResult  = deriveCQ(p.missing_fields);
    const evResult  = deriveEV(p.evidence_type);
    const cfResult  = deriveCF(p.site_or_cluster);

    const agf = agfResult.value;
    const nm  = nmResult.value;
    const bc  = bcResult.value;
    const cq  = cqResult.value;
    const ev  = evResult.value;
    const cf  = cfResult.value;

    const impact_units_total = agf === 0 ? 0 : +(nm * bc * cq * ev * cf * agf).toFixed(4);

    const isBlocked   = p.kora_eligibility === 'blocked';
    const isLimited   = p.kora_eligibility === 'limited';
    const isReviewReq = p.review_required || p.kora_eligibility === 'review_required';
    const isComputed  = !isBlocked && !isLimited && !isReviewReq && p.approved_for_impact_units;

    const impact_units_by_pillar = distributeByPillar(
      impact_units_total,
      p.primary_pillar,
      p.pillar_distribution,
    );

    let exclusion_reason: string | null = null;
    if (isBlocked) {
      exclusion_reason = p.blocked_reason ?? 'Blocked by Design — 0 IU per design.';
    } else if (isLimited) {
      exclusion_reason = 'Economic Relief — 0 IU in Foundation Light. BTI governance only.';
    } else if (isReviewReq) {
      exclusion_reason = 'Human Review Required — IU computation sospesa.';
    } else if (!p.approved_for_impact_units) {
      exclusion_reason = 'approved_for_impact_units = false.';
    }

    const formula_trace: ImpactUnitFactorTrace[] = [
      { factor_code: 'NM',  label: 'Normalized Magnitude',               ...nmResult },
      { factor_code: 'BC',  label: 'Base Contribution',                   ...bcResult },
      { factor_code: 'CQ',  label: 'Completeness Quality',                ...cqResult },
      { factor_code: 'EV',  label: 'Evidence Verification',               ...evResult },
      { factor_code: 'CF',  label: 'Continuity Factor (foundation_light_stub)', ...cfResult },
      { factor_code: 'AGF', label: 'Anti-Gaming Factor',                  ...agfResult },
    ];

    return {
      record_id:                p.record_id,
      source_row_id:            p.record_id,
      action_family:            p.action_family,
      event_nature:             (p.event_nature || 'consumed_service') as EventNature,
      eligibility:              (p.kora_eligibility === 'review_required' ? 'eligible' : p.kora_eligibility) as EligibilityClass,
      primary_pillar:           p.primary_pillar,
      pillar_distribution:      p.pillar_distribution,
      normalized_magnitude_nm:  nm,
      base_contribution_bc:     bc,
      completeness_quality_cq:  cq,
      evidence_verification_ev: ev,
      continuity_factor_cf:     cf,
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

  // ── Demo path — PipelineAnalyzedRow ─────────────────────────────────────────

  computeIUForRecord(row: PipelineAnalyzedRow): ImpactUnitComputationResult {
    const { classification, kora_ready, normalized } = row;
    return this._computeFromExtracted({
      record_id:                normalized.id,
      kora_eligibility:         classification.kora_eligibility,
      review_required:          classification.review_required,
      approved_for_impact_units: kora_ready.approved_for_impact_units,
      action_family:            classification.action_family,
      event_nature:             classification.event_nature,
      primary_pillar:           classification.primary_pillar,
      pillar_distribution:      classification.pillar_distribution,
      blocked_reason:           classification.blocked_reason,
      missing_fields:           normalized.missing_fields,
      evidence_type:            normalized.evidence_type,
      site_or_cluster:          normalized.site_or_cluster,
    });
  }

  computeIUForRecords(rows: PipelineAnalyzedRow[]): ImpactUnitComputationResult[] {
    return rows.map((r) => this.computeIUForRecord(r));
  }

  getIUComputationTrace(row: PipelineAnalyzedRow): ImpactUnitFactorTrace[] {
    return this.computeIUForRecord(row).formula_trace;
  }

  getIUComputationSummary(rows: PipelineAnalyzedRow[]): ImpactUnitComputationSummary {
    return this.summarizeLiveResults(this.computeIUForRecords(rows));
  }

  explainFactors(row: PipelineAnalyzedRow): ImpactUnitFactorTrace[] {
    return this.getIUComputationTrace(row);
  }

  // ── Live pipeline path — IULiveInput ─────────────────────────────────────────

  computeIUForLiveInput(input: IULiveInput): ImpactUnitComputationResult {
    return this._computeFromExtracted({
      record_id:                input.uef_record_id,
      kora_eligibility:         input.eligibility,
      review_required:          input.review_required,
      approved_for_impact_units: input.approved_for_impact_units,
      action_family:            input.action_family,
      event_nature:             input.event_nature ?? '',
      primary_pillar:           input.primary_pillar,
      pillar_distribution:      input.pillar_distribution ?? {},
      blocked_reason:           undefined,
      missing_fields:           input.missing_fields,
      evidence_type:            input.evidence_type,
      site_or_cluster:          input.site_or_cluster,
      duration_hours:           input.duration_hours,
      event_date:               input.event_date,
      b6_repetition_count:      input.b6_repetition_count,
      is_recurring:             input.is_recurring,
    });
  }

  computeIUForLiveInputBatch(inputs: IULiveInput[]): ImpactUnitComputationResult[] {
    return inputs.map((i) => this.computeIUForLiveInput(i));
  }

  // ── Summary builder — accepts pre-computed results (both paths) ───────────────

  summarizeLiveResults(results: ImpactUnitComputationResult[]): ImpactUnitComputationSummary {
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
      average_cf:  avg(results.map((r) => r.continuity_factor_cf)),
      average_agf: avg(results.map((r) => r.anti_gaming_factor_agf)),
      methodology_version: this.methodologyVersion,
      calibration_status:  this.calibrationStatus,
    };
  }
}

export const iuComputationService = new IUComputationService();
