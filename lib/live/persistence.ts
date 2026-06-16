// lib/live/persistence.ts
// Server-side only. Writes KoraComputationResult to the Supabase LIVE schema
// using the service role client (bypasses RLS — runs from trusted server contexts).
//
// Phase 2B — pending supabase gen types (Task 7): Supabase client calls use
// 'as any' casts for multi-schema operations. Types will be generated once the
// project is provisioned and 001+002 migrations are applied.
//
// KoraIndexResult is_current logic:
//   On each scoring run, the previous is_current = true row is set to false,
//   then the new row is inserted with is_current = true.
//   The partial unique index idx_kora_index_result_one_current enforces this at DB level.

import { getSupabaseServiceClient, type ServiceDb } from '@/lib/supabase/server';
import type { KoraComputationResult, KoraIndexMacroblocks } from '@/lib/kora-engine/types';
import { triggerOfficeAttribution } from '@/lib/live/office-attribution';
import type { Json } from '@/lib/supabase/types';
import type { KoraIndexComponent, MacroblockScore, MacroblockCode } from '@/lib/types';
import {
  getMethodologyVersion,
  getCalibrationStatus,
  getAllComponentEffectiveWeights,
} from '@/lib/methodology-config/v0.1';
import { COMPONENT_LABELS, MACROBLOCK_LABELS } from '@/lib/constants/kora';
import {
  suppressSmallGroups,
  summarizeSuppression,
  DEFAULT_MIN_GROUP_SIZE,
  type SuppressionSummary,
} from '@/lib/privacy/group-threshold';

// ── Component array builder — v1.0 methodology ────────────────────────────────
// Uses ComponentDetail from koraIndex (computed by component-engine + kora-index-engine).
// No proxy values. No synthetic 0.5 defaults.
// Components with status=insufficient_data are included with value=0 and a status label.

function buildComponentArray(
  result: KoraComputationResult,
  weights: Record<string, number>,
): KoraIndexComponent[] {
  const { activation, confidence, koraIndex } = result;
  const d = koraIndex.componentDetail;

  // AR and MAR come from the activation engine directly (always computed when records exist)
  const arValue  = activation.activationReach;           // 0–1
  const marValue = activation.meaningfulActivationReach; // 0–1

  // v1.0 components from ComponentDetail (computed by component engine + index engine)
  // When status = insufficient_data, value = 0 and the component notes why.
  const niValue  = d?.niStatus  === 'computed' ? d.ni  : 0;  // 0–1
  const vrValue  = d?.vrStatus  === 'computed' ? d.vr  : 0;  // 0–1
  const coValue  = d?.coStatus  === 'computed' ? d.co  : 0;  // 0–1
  const wbValue  = d?.wbStatus  === 'computed' ? d.wb  : 0;  // 0–1
  const eqValue  = d?.eqStatus  === 'computed' ? d.eq  : 0;  // 0–1
  const pcValue  = d?.pcStatus  === 'computed' ? d.pc / 100 : 0;  // convert 0–100 → 0–1
  const pbValue  = d?.pbStatus  === 'computed' ? d.pb / 100 : 0;  // convert 0–100 → 0–1

  // CS = Data Reliability Index — external to KORA Index, weight always 0.
  // Stored as 0–1 in DB (confidence engine returns 0–100; divide by 100).
  const csValue = confidence.score / 100;

  const w = weights;

  return [
    { code: 'AR',  label: COMPONENT_LABELS['AR'],  value: arValue,  weight: w['AR']  ?? 0, macroblock: 'REACH'  as MacroblockCode },
    { code: 'MAR', label: COMPONENT_LABELS['MAR'], value: marValue, weight: w['MAR'] ?? 0, macroblock: 'REACH'  as MacroblockCode },
    { code: 'NI',  label: COMPONENT_LABELS['NI'],  value: niValue,  weight: w['NI']  ?? 0, macroblock: 'QUALITY' as MacroblockCode },
    { code: 'VR',  label: COMPONENT_LABELS['VR'],  value: vrValue,  weight: w['VR']  ?? 0, macroblock: 'QUALITY' as MacroblockCode },
    { code: 'CO',  label: COMPONENT_LABELS['CO'],  value: coValue,  weight: w['CO']  ?? 0, macroblock: 'QUALITY' as MacroblockCode },
    { code: 'WB',  label: COMPONENT_LABELS['WB'],  value: wbValue,  weight: w['WB']  ?? 0, macroblock: 'EQUITY'  as MacroblockCode },
    { code: 'PC',  label: COMPONENT_LABELS['PC'],  value: pcValue,  weight: w['PC']  ?? 0, macroblock: 'EQUITY'  as MacroblockCode },
    { code: 'PB',  label: COMPONENT_LABELS['PB'],  value: pbValue,  weight: w['PB']  ?? 0, macroblock: 'EQUITY'  as MacroblockCode },
    { code: 'EQ',  label: COMPONENT_LABELS['EQ'],  value: eqValue,  weight: w['EQ']  ?? 0, macroblock: 'EQUITY'  as MacroblockCode },
    { code: 'CS',  label: COMPONENT_LABELS['CS'],  value: csValue,  weight: 0, external: true },
  ] as KoraIndexComponent[];
}

function buildMacroblockArray(mb: KoraIndexMacroblocks): MacroblockScore[] {
  return [
    { code: 'REACH'   as MacroblockCode, label: MACROBLOCK_LABELS['REACH'],   weight: 0.25, score: mb.activationReach,      component_codes: ['AR', 'MAR'] },
    { code: 'QUALITY' as MacroblockCode, label: MACROBLOCK_LABELS['QUALITY'],  weight: 0.30, score: mb.activationQuality,    component_codes: ['NI', 'VR', 'CO'] },
    { code: 'EQUITY'  as MacroblockCode, label: MACROBLOCK_LABELS['EQUITY'],   weight: 0.25, score: mb.distributionEquity,   component_codes: ['WB', 'PC', 'PB', 'EQ'] },
    { code: 'BTI'     as MacroblockCode, label: MACROBLOCK_LABELS['BTI'],      weight: 0.20, score: mb.budgetToHumanImpact,  component_codes: [] },
  ];
}

// ── PersistenceResult ─────────────────────────────────────────────────────────

export interface SegmentSuppressionMeta {
  dimension: string;
  summary: SuppressionSummary;
}

export interface PersistenceResult {
  activationResultId:    string;
  confidenceResultId:    string;
  btiResultId:           string;
  koraIndexResultId:     string;
  iuCount:               number;   // number of impact_unit rows persisted (0 if none)
  // N≥10 suppression applied to department_activation before persist.
  // Caller should write audit events using this metadata.
  segmentSuppression:    SegmentSuppressionMeta[];
}

// ── persistKoraComputationResult ──────────────────────────────────────────────

export async function persistKoraComputationResult(params: {
  tenantId:            string;
  batchId:             string;
  reportingPeriod:     string;
  workforcePopulation: number;
  result:              KoraComputationResult;
}): Promise<PersistenceResult> {
  const { tenantId, batchId, reportingPeriod, workforcePopulation, result } = params;

  const db: ServiceDb = getSupabaseServiceClient();

  const methodologyVersion = getMethodologyVersion();
  const calibrationStatus  = getCalibrationStatus();

  // ── 1. activation_result ────────────────────────────────────────────────────
  // N≥10 enforcement: suppress any department/site segment with count < 10
  // before persisting employer-visible department_activation data.

  const rawDeptActivation: Record<string, number> = {
    ...result.activation.departmentGaps,
    ...result.activation.siteGaps,
  };
  const deptSuppressionResult = suppressSmallGroups(rawDeptActivation, DEFAULT_MIN_GROUP_SIZE);
  const segmentSuppression: SegmentSuppressionMeta[] = [
    {
      dimension: 'department_activation',
      summary: summarizeSuppression(deptSuppressionResult, DEFAULT_MIN_GROUP_SIZE),
    },
  ];

  const { data: actData, error: actErr } = await db
    .schema('analytics')
    .from('activation_result')
    .insert({
      tenant_id:                      tenantId,
      reporting_period:               reportingPeriod,
      total_workers:                  workforcePopulation,
      eligible_worker_count:          result.eligibilitySummary.eligibleCount,
      active_worker_count:            result.activation.activeWorkers,
      meaningful_active_worker_count: result.activation.meaningfullyActiveWorkers,
      activation_rate:                result.activation.activationReach,
      meaningful_activation_rate:     result.activation.meaningfulActivationReach,
      // continuity_rate and verification_rate: derived from confidence in v0.1
      continuity_rate:                result.confidence.reviewConfidence,
      verification_rate:              result.confidence.verificationConfidence,
      pillar_distribution:            result.pillarDistribution,
      department_activation:          deptSuppressionResult.safe,
      privacy_threshold_met:          true,
      methodology_version_id:         methodologyVersion,
      calibration_status:             calibrationStatus,
    })
    .select('id')
    .single();

  if (actErr || !actData) throw new Error(`[KORA persist] activation_result: ${actErr?.message ?? 'no data'}`);
  const activationResultId = actData.id as string;

  // ── 2. confidence_result ────────────────────────────────────────────────────
  // Engine produces score 0–100; DB stores as numeric(5,4) → divide by 100.

  const cs01 = result.confidence.score / 100;
  const confidenceLevel = cs01 >= 0.70 ? 'high' : cs01 >= 0.40 ? 'medium' : 'low';

  const { data: confData, error: confErr } = await db
    .schema('analytics')
    .from('confidence_result')
    .insert({
      tenant_id:             tenantId,
      reporting_period:      reportingPeriod,
      confidence_score:      cs01,
      confidence_level:      confidenceLevel,
      data_completeness:     result.confidence.dataCompleteness,
      evidence_quality:      result.confidence.budgetEvidenceConfidence,
      mapping_confidence:    result.confidence.mappingConfidence,
      verification_weight:   result.confidence.verificationConfidence,
      source_coverage:       {},
      gaps_identified:       result.confidence.warnings.slice(0, 10),
      limitations:           result.confidence.warnings.join('; ').slice(0, 500) || 'pre_empirical_calibration',
      methodology_version_id: methodologyVersion,
      calibration_status:    calibrationStatus,
    })
    .select('id')
    .single();

  if (confErr || !confData) throw new Error(`[KORA persist] confidence_result: ${confErr?.message ?? 'no data'}`);
  const confidenceResultId = confData.id as string;

  // ── 3. bti_result ───────────────────────────────────────────────────────────

  const deepActivationShare = result.bti.totalBudget > 0
    ? Math.min(1, result.bti.deepActivationSpend / result.bti.totalBudget)
    : 0;

  const { data: btiData, error: btiErr } = await db
    .schema('analytics')
    .from('bti_result')
    .insert({
      tenant_id:                   tenantId,
      reporting_period:            reportingPeriod,
      total_people_welfare_budget: result.bti.totalBudget,
      deep_activation_spend:       result.bti.deepActivationSpend,
      economic_relief_spend:       result.bti.economicReliefSpend,
      blocked_compliance_spend:    result.bti.blockedComplianceSpend,
      activation_debt_eur:         result.bti.activationDebt,
      deep_activation_share:       deepActivationShare,
      budget_evidence_quality:     result.bti.budgetEvidenceQuality,
      bti_score:                   result.bti.btiScore,
      cost_per_impact_unit:        null,
      payload:                     { scoring_batch_id: batchId, warnings: result.bti.warnings.slice(0, 5) },
    })
    .select('id')
    .single();

  if (btiErr || !btiData) throw new Error(`[KORA persist] bti_result: ${btiErr?.message ?? 'no data'}`);
  const btiResultId = btiData.id as string;

  // ── 4. kora_index_result — is_current logic ──────────────────────────────────
  // Supersede any existing current result for this tenant × period.

  await db
    .schema('analytics')
    .from('kora_index_result')
    .update({ is_current: false })
    .eq('tenant_id', tenantId)
    .eq('reporting_period', reportingPeriod)
    .eq('is_current', true);

  const weights    = getAllComponentEffectiveWeights();
  const components = buildComponentArray(result, weights);
  const macroblocks = buildMacroblockArray(result.koraIndex.macroblocks);

  const { data: kiData, error: kiErr } = await db
    .schema('analytics')
    .from('kora_index_result')
    .insert({
      tenant_id:              tenantId,
      reporting_period:       reportingPeriod,
      methodology_version_id: methodologyVersion,
      kora_index_value:       result.koraIndex.value,
      safeguard_status:       result.activation.safeguardStatus,
      calibration_status:     calibrationStatus,
      limitations_text:       result.koraIndex.warnings.join('; ').slice(0, 500) || null,
      components,
      macroblocks,
      scoring_run_id:         batchId,
      confidence_result_id:   confidenceResultId,
      activation_result_id:   activationResultId,
      is_current:             true,
    })
    .select('id')
    .single();

  if (kiErr || !kiData) throw new Error(`[KORA persist] kora_index_result: ${kiErr?.message ?? 'no data'}`);
  const koraIndexResultId = kiData.id as string;

  // ── 5. impact_unit — persist per-record IU rows ──────────────────────────────
  // No worker identity. No PIB. Record-level only. factor_trace stored as JSONB.
  // cost_per_impact_unit = total eligible activation spend ÷ total IU generated.
  let iuCount = 0;

  if (result.iuResults && result.iuResults.length > 0) {
    const iuRows = result.iuResults.map((r) => ({
      tenant_id:           tenantId,
      uef_record_id:       r.record_id,
      source_batch_id:     batchId,
      reporting_period:    reportingPeriod,
      nm:                  r.normalized_magnitude_nm,
      bc:                  r.base_contribution_bc,
      cq:                  r.completeness_quality_cq,
      ev:                  r.evidence_verification_ev,
      cf:                  r.continuity_factor_cf,
      agf:                 r.anti_gaming_factor_agf,
      impact_units_total:  r.impact_units_total,
      life_iu:             r.impact_units_by_pillar['LIFE']       ?? 0,
      growth_iu:           r.impact_units_by_pillar['GROWTH']     ?? 0,
      connection_iu:       r.impact_units_by_pillar['CONNECTION'] ?? 0,
      impact_iu:           r.impact_units_by_pillar['IMPACT']     ?? 0,
      legacy_iu:           r.impact_units_by_pillar['LEGACY']     ?? 0,
      computed:            r.computed,
      exclusion_reason:    r.exclusion_reason,
      factor_trace:        r.formula_trace as unknown as Json,
      methodology_version: r.methodology_version,
      calibration_status:  r.calibration_status,
    }));

    const { error: iuErr } = await (db as any)
      .schema('analytics')
      .from('impact_unit')
      .insert(iuRows);

    if (iuErr) {
      console.error('[KORA persist] impact_unit insert error:', iuErr.message, '— IU persistence skipped.');
    } else {
      iuCount = iuRows.length;
    }

    // Update cost_per_impact_unit in bti_result:
    // = total deep activation spend ÷ total IU generated (budget-mediated only).
    // Returns null when denominator = 0 (no IU generated).
    const totalIU = result.iuSummary?.total_impact_units ?? 0;
    if (totalIU > 0 && result.bti.deepActivationSpend > 0) {
      const cpiu = +(result.bti.deepActivationSpend / totalIU).toFixed(2);
      await db
        .schema('analytics')
        .from('bti_result')
        .update({ cost_per_impact_unit: cpiu })
        .eq('id', btiResultId);
    }

    // ── 6. Attribuzione d'ufficio — B164 ──────────────────────────────────────
    // Per ogni uef_record appena persistito, cerca gli attendees nominativi
    // (personal.uploaded_record_attendee) e attribuisce il PIB d'ufficio.
    // Fire-and-forget: errori loggati internamente, non propagati.
    // Idempotente: ON CONFLICT DO NOTHING su U1 (worker_identity_id, source_uef_record_id, pillar).
    const uefRecordIds = result.iuResults.map((r) => r.record_id);
    triggerOfficeAttribution({ db, tenantId, uefRecordIds, reportingPeriod }).catch((err) => {
      console.error('[B164 office-attribution] errore imprevisto nel trigger:', err);
    });
  }

  return { activationResultId, confidenceResultId, btiResultId, koraIndexResultId, iuCount, segmentSuppression };
}
