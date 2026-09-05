// lib/live/scoring-mapper.ts
// Pure TypeScript mapper: Supabase DB row → KORA typed output objects.
// No 'use client' / 'use server' — importable from both client hooks and server routes.
// Implements the Phase 2B mapper stub declared in lib/scoring-result/index.ts.
//
// LIVE path invariant: never returns synthetic_demo_data, generated_for, or not_live_data.
// Those fields are optional in lib/types after the Phase 2B type update.

import type {
  KoraIndexResultRow,
  ActivationResultRow,
  ConfidenceResultRow,
} from '@/lib/supabase/types';
import type {
  KoraIndexOutput,
  KoraIndexComponent,
  MacroblockScore,
  CompanyAggregateExtended,
  PillarCode,
  CalibrationStatus,
  ScenarioId,
} from '@/lib/types';
import type { ConfidenceRecord } from '@/lib/types';

// ── LiveRow — the joined shape returned by the is_current query ───────────────

export type LiveRow = KoraIndexResultRow & {
  confidence_result: ConfidenceResultRow | null;
  activation_result: ActivationResultRow | null;
};

// ── MappedLiveData — intermediate output, assembled into ScoringResult ────────

export interface MappedLiveData {
  status: 'ok' | 'insufficient_data';
  koraIndex: KoraIndexOutput | null;
  aggregate: CompanyAggregateExtended | null;
  confidence: ConfidenceRecord | null;
}

// ── mapDbRow ──────────────────────────────────────────────────────────────────

/**
 * Maps a kora_index_result DB row (with joined confidence_result and
 * activation_result) into typed KORA output objects.
 *
 * status = 'ok' only when all three joined rows are present.
 * confidence_score is stored as 0–1 in the DB — returned as-is.
 *
 * scenarioId is passed through from the caller; live tenants do not have
 * S1/S2 scenarios — the caller is responsible for passing a meaningful value
 * (e.g. the current reporting period identifier, or 'S1' as a placeholder).
 */
export function mapDbRow(
  row: LiveRow,
  tenantId: string,
  scenarioId: ScenarioId,
): MappedLiveData {
  const confRow = row.confidence_result;
  const actRow  = row.activation_result;

  // Build KoraIndexOutput — synthetic_demo_data intentionally omitted (live row).
  const koraIndex: KoraIndexOutput = {
    id:                     row.id,
    company_id:             tenantId,
    scenario_id:            scenarioId,
    reporting_period:       row.reporting_period,
    kora_index_value:       row.kora_index_value,
    components:             (row.components ?? []) as unknown as KoraIndexComponent[],
    macroblocks:            (row.macroblocks ?? []) as unknown as MacroblockScore[],
    methodology_version_id: row.methodology_version_id,
    calibration_status:     row.calibration_status as CalibrationStatus,
    confidence_score:       confRow?.confidence_score ?? 0,  // DB: 0–1
    safeguard_status:       row.safeguard_status,
    generated_at:           row.created_at,
    limitations_text:       row.limitations_text ?? undefined,
    // synthetic_demo_data, scoring_run_id, confidence_score_id, activation_safeguard_result_id
    // intentionally omitted for live rows.
  };

  // Build CompanyAggregateExtended from activation_result join.
  // synthetic_demo_data, generated_for, not_live_data intentionally omitted.
  const aggregate: CompanyAggregateExtended | null = actRow
    ? {
        id:                            actRow.id,
        company_id:                    tenantId,
        scenario_id:                   scenarioId,
        reporting_period:              actRow.reporting_period,
        total_workers:                 actRow.total_workers,
        eligible_worker_count:         actRow.eligible_worker_count,
        active_worker_count:           actRow.active_worker_count,
        meaningful_active_worker_count: actRow.meaningful_active_worker_count,
        activation_rate:               actRow.activation_rate,
        meaningful_activation_rate:    actRow.meaningful_activation_rate,
        continuity_rate:               actRow.continuity_rate,
        verification_rate:             actRow.verification_rate,
        pillar_distribution:           actRow.pillar_distribution as Record<PillarCode, number>,
        department_activation:         actRow.department_activation as Record<string, number>,
        privacy_threshold_met:         actRow.privacy_threshold_met,
        methodology_version_id:        actRow.methodology_version_id,
        calibration_status:            actRow.calibration_status as CalibrationStatus,
      }
    : null;

  // Build ConfidenceRecord from confidence_result join.
  const confidence: ConfidenceRecord | null = confRow
    ? {
        id:                    confRow.id,
        company_id:            tenantId,
        scenario_id:           scenarioId,
        confidence_score:      confRow.confidence_score,      // DB: 0–1
        confidence_level:      confRow.confidence_level,
        data_completeness:     confRow.data_completeness,
        evidence_quality:      confRow.evidence_quality,
        mapping_confidence:    confRow.mapping_confidence,
        verification_weight:   confRow.verification_weight,
        source_coverage:       confRow.source_coverage as Record<string, string>,
        gaps_identified:       confRow.gaps_identified,
        limitations:           confRow.limitations,
        methodology_version_id: confRow.methodology_version_id,
        calibration_status:    confRow.calibration_status,
      }
    : null;

  const status: 'ok' | 'insufficient_data' =
    koraIndex && aggregate && confidence ? 'ok' : 'insufficient_data';

  return {
    status,
    koraIndex:  status === 'ok' ? koraIndex  : null,
    aggregate,
    confidence,
  };
}
