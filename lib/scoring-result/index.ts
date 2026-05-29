'use client';

import { useEffect, useState } from 'react';
import { useEnvironment } from '@/lib/demo-state';
import { scoringSimulatorService } from '@/services/scoring-simulator/ScoringSimulatorService';
import type { ConfidenceRecord } from '@/services/scoring-simulator/ScoringSimulatorService';
import { mapDbRow, type LiveRow } from '@/lib/live/scoring-mapper';
import type {
  KoraIndexOutput, KoraIndexComponent, MacroblockScore,
  CompanyAggregateExtended,
  PillarCode, ScenarioId, Environment, SafeguardStatus, CalibrationStatus,
} from '@/lib/types';

// Re-export so consumers import from one place.
export type { ConfidenceRecord };

// ── Type notes ─────────────────────────────────────────────────────────────────
//
// KoraIndexOutput has `synthetic_demo_data: true` as a required literal — valid
// only for demo seed objects. Phase 2B task: make that field optional in
// lib/types/index.ts so live DB rows can satisfy the type without type assertions.
//
// KoraIndexSnapshot and CompanyAggregateSnapshot are exported as Phase 2B
// building blocks for the live mapper — they omit the demo-only sentinel fields.
//
// ScoringResult.koraIndex stays typed as KoraIndexOutput | null so existing
// components (which expect KoraIndexOutput) require no prop-type changes.
// The live path currently returns null; Phase 2B will return a properly mapped
// object after lib/types is updated to make synthetic_demo_data optional.

export type KoraIndexSnapshot       = Omit<KoraIndexOutput, 'synthetic_demo_data'>;
export type CompanyAggregateSnapshot = Omit<CompanyAggregateExtended, 'synthetic_demo_data' | 'not_live_data' | 'generated_for'>;

// Explicit re-exports for consumer convenience.
export type { KoraIndexComponent, MacroblockScore, PillarCode, SafeguardStatus, CalibrationStatus };

// ── Status / Result types ──────────────────────────────────────────────────────

export type ScoringResultStatus = 'ok' | 'insufficient_data' | 'not_implemented';

/**
 * Canonical scoring output for a single tenant × reporting period × environment.
 * This is the ONLY interface that all output pages consume.
 *
 * koraIndex / aggregate / confidence are null when status !== 'ok'.
 *
 * Phase 2B note: when the live mapper is wired, koraIndex will be typed as
 * KoraIndexSnapshot (no synthetic_demo_data field). Update prop types at that point.
 *
 * LIVE branch: NEVER fall back to demo seed data. If the DB has no result yet,
 * return status 'insufficient_data' with null payloads — never Meridiana data.
 */
export interface ScoringResult {
  status:      ScoringResultStatus;
  tenantId:    string;
  scenarioId:  ScenarioId;
  environment: Environment;
  koraIndex:   KoraIndexOutput | null;          // null when status !== 'ok'
  aggregate:   CompanyAggregateExtended | null; // null when status !== 'ok'
  confidence:  ConfidenceRecord | null;         // null when status !== 'ok'
}

export interface UseScoringResultReturn {
  data:    ScoringResult | null;
  loading: boolean;   // false in demo (sync); true while Supabase fetch runs in live
  error:   Error | null;
}

// ── DB row → ScoringResult mapper (Phase 2B) ──────────────────────────────────

/**
 * Maps Supabase kora_index_result rows to a ScoringResult.
 * Phase 2B: implement full mapping after lib/types is updated to make
 * synthetic_demo_data optional in KoraIndexOutput and CompanyAggregateExtended.
 *
 * Shape reference for implementer:
 *   import type { KoraIndexResultRow, ActivationResultRow, ConfidenceResultRow }
 *     from '@/lib/supabase/types';
 *
 *   const koraIndex: KoraIndexSnapshot = {
 *     id:                     row.id,
 *     company_id:             row.tenant_id,
 *     scenario_id:            scenarioId,
 *     reporting_period:       row.reporting_period,
 *     kora_index_value:       row.kora_index_value,
 *     components:             row.components as KoraIndexComponent[],
 *     macroblocks:            row.macroblocks as MacroblockScore[],
 *     methodology_version_id: row.methodology_version_id,
 *     calibration_status:     row.calibration_status as CalibrationStatus,
 *     confidence_score:       row.confidence_result?.confidence_score ?? 0,
 *     safeguard_status:       row.safeguard_status as SafeguardStatus,
 *     generated_at:           row.created_at,
 *     limitations_text:       row.limitations_text ?? undefined,
 *   };
 */
function mapDbRowToScoringResult(
  row: LiveRow,
  tenantId: string,
  scenarioId: ScenarioId,
): ScoringResult {
  const mapped = mapDbRow(row, tenantId, scenarioId);
  return { ...mapped, tenantId, scenarioId, environment: 'live' };
}

// ── Live fetch (async, Phase 2B) ───────────────────────────────────────────────

/**
 * Fetches scoring data from Supabase for a live tenant.
 * LIVE must NEVER fallback to demo seed data.
 * Returns 'insufficient_data' if DB has no result yet — not an error state.
 */
async function fetchLiveScoringResult({
  tenantId,
  scenarioId,
}: {
  tenantId: string;
  scenarioId: ScenarioId;
}): Promise<ScoringResult> {
  // TODO Phase 2B: wire full Supabase query.
  //
  //   const { getSupabaseBrowserClient } = await import('@/lib/supabase/client');
  //   const supabase = getSupabaseBrowserClient();
  //   const { data: row, error } = await supabase
  //     .schema('analytics')
  //     .from('kora_index_result')
  //     .select('*, confidence_result:confidence_result_id(*), activation_result:activation_result_id(*)')
  //     .eq('tenant_id', tenantId)
  //     .eq('is_current', true)
  //     .maybeSingle();
  //   if (error) throw new Error(`[KORA live] ${error.message}`);
  //   if (!row) return { status: 'insufficient_data', tenantId, scenarioId, environment: 'live',
  //                       koraIndex: null, aggregate: null, confidence: null };
  //   return mapDbRowToScoringResult(row, tenantId, scenarioId);
  //
  // LIVE must NEVER fallback to demo seed data.

  void mapDbRowToScoringResult; // prevent unused-var lint for the Phase 2B TODO above
  return {
    status: 'not_implemented',
    tenantId, scenarioId, environment: 'live',
    koraIndex: null, aggregate: null, confidence: null,
  };
}

// ── Demo resolver (sync, no Supabase) ─────────────────────────────────────────

function getDemoScoringResult({
  tenantId,
  scenarioId,
}: {
  tenantId: string;
  scenarioId: ScenarioId;
}): ScoringResult {
  const koraIndex  = scoringSimulatorService.getKoraIndexOutput(tenantId, scenarioId);
  const aggregate  = scoringSimulatorService.getCompanyAggregate(tenantId, scenarioId);
  const confidence = scoringSimulatorService.getConfidenceRecord(tenantId, scenarioId);
  const status: ScoringResultStatus = koraIndex ? 'ok' : 'insufficient_data';
  return { status, tenantId, scenarioId, environment: 'demo', koraIndex, aggregate, confidence };
}

// ── Public API: useScoringResult ───────────────────────────────────────────────

/**
 * Single consumption point for scoring data in client components.
 *
 * Demo:  synchronous — returns immediately from in-memory seed. loading = false.
 * Live:  async — fetches from Supabase, returns loading=true while pending.
 *        LIVE must NEVER fallback to demo seed data.
 *
 * The { data, loading, error } contract is stable across Phase 1 → 2 → 2B.
 * Consumer components need no changes when the live fetch is fully wired.
 */
export function useScoringResult({
  tenantId,
  scenarioId,
}: {
  tenantId: string;
  scenarioId: ScenarioId;
}): UseScoringResultReturn {
  const { activeEnvironment: environment } = useEnvironment();

  // Async state for live mode. useState/useEffect called unconditionally (React rules).
  const [liveState, setLiveState] = useState<UseScoringResultReturn>({
    data: null, loading: true, error: null,
  });

  useEffect(() => {
    if (environment !== 'live') return;
    let active = true;

    fetchLiveScoringResult({ tenantId, scenarioId })
      .then((data) => {
        if (active) setLiveState({ data, loading: false, error: null });
      })
      .catch((err: unknown) => {
        if (active) setLiveState({
          data: null,
          loading: false,
          error: err instanceof Error ? err : new Error(String(err)),
        });
      });

    return () => { active = false; };
  }, [tenantId, scenarioId, environment]);

  // Demo: synchronous, no loading. State/effect above are still called (React rules).
  // LIVE must NEVER fallback to demo seed data.
  if (environment === 'demo') {
    return { data: getDemoScoringResult({ tenantId, scenarioId }), loading: false, error: null };
  }

  return liveState;
}

// ── Demo-only: scenario comparison helper ─────────────────────────────────────
//
// S1/S2 scenario comparison is meaningful only in demo mode (Meridiana seed has
// two synthetic scenarios). Live tenants have a current reporting period, not S1/S2.
// All call sites must be guarded by isDemo to prevent crashes in live environment.

export function isDemoScenarioComparison(environment: Environment): boolean {
  return environment === 'demo';
}

/**
 * Returns S1 and S2 scoring results for demo scenario comparison strips.
 * Returns { s1: null, s2: null, isDemo: false } in live/future — never crashes.
 *
 * Usage (kora-index page):
 *   const { s1, s2, isDemo } = useDemoScenarioComparison(COMPANY_ID);
 *   {isDemo && s1 && <ScenarioCard out={s1.koraIndex} />}
 */
export function useDemoScenarioComparison(tenantId: string): {
  s1: ScoringResult | null;
  s2: ScoringResult | null;
  isDemo: boolean;
} {
  const { activeEnvironment } = useEnvironment();
  const isDemo = isDemoScenarioComparison(activeEnvironment);

  // Hooks called unconditionally (React rules).
  const { data: s1Data } = useScoringResult({ tenantId, scenarioId: 'S1' });
  const { data: s2Data } = useScoringResult({ tenantId, scenarioId: 'S2' });

  if (!isDemo) return { s1: null, s2: null, isDemo: false };
  return { s1: s1Data, s2: s2Data, isDemo: true };
}
