// lib/live/decision-pack.ts
// Canonical persistence function for analytics.decision_pack_version.
//
// Creates a draft Decision Pack linked to the scoring results of a given
// reporting period. Status starts as 'draft' — operator promotes to 'ready'
// after review (state machine is future scope).
//
// RLS: KORA_ADMIN full access; company roles see only 'ready'|'exported' packs.

import type { PersistenceResult } from '@/lib/live/persistence';
import type { ServiceDb } from '@/lib/supabase/server';

export interface DecisionPackParams {
  db: ServiceDb;
  tenantId: string;
  reportingPeriod: string;
  persistenceResult: PersistenceResult;
  createdBy: string;
  packPayload?: Record<string, unknown>;
}

export interface DecisionPackResult {
  id: string;
  versionId: string;
  tenantId: string;
  reportingPeriod: string;
  status: 'draft';
  koraIndexResultId: string;
}

export async function persistDecisionPack(
  params: DecisionPackParams,
): Promise<DecisionPackResult> {
  const {
    db,
    tenantId,
    reportingPeriod,
    persistenceResult,
    createdBy,
    packPayload = {},
  } = params;

  // Version ID: period + millisecond timestamp → unique per run, sortable.
  const versionId = `${reportingPeriod}-v${Date.now()}`;

  const { data, error } = await db
    .schema('analytics')
    .from('decision_pack_version')
    .insert({
      tenant_id:             tenantId,
      version_id:            versionId,
      reporting_period:      reportingPeriod,
      status:                'draft',
      kora_index_result_id:  persistenceResult.koraIndexResultId,
      activation_result_id:  persistenceResult.activationResultId,
      confidence_result_id:  persistenceResult.confidenceResultId,
      bti_result_id:         persistenceResult.btiResultId,
      pack_payload:          {
        ...packPayload,
        generated_by:     createdBy,
        generated_at:     new Date().toISOString(),
        synthetic_test:   true,
        calibration_status: 'pre_empirical_calibration',
      },
      created_by:            createdBy,
    })
    .select('id')
    .single();

  if (error || !data) {
    throw new Error(`[KORA] persistDecisionPack: ${error?.message ?? 'no data returned'}`);
  }

  return {
    id:                (data as { id: string }).id,
    versionId,
    tenantId,
    reportingPeriod,
    status:            'draft',
    koraIndexResultId: persistenceResult.koraIndexResultId,
  };
}
