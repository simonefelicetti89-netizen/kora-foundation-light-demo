// lib/scoring-result/index.ts
//
// ── CANONICAL SCORING ENTRY POINT ────────────────────────────────────────────
//
// All application pages and components MUST consume scoring via useScoringResult().
//
// ONE scoring path exists: live → fetchLiveScoringResult (run-kora-pipeline,
// authoritative). See services/scoring/IScoringService.ts for the full map.
//
// NEVER import run-kora-pipeline directly in app/ routes or components.
// Bypassing this hook breaks the live boundary guarantee.
//
// CC-00 Final Scoring Canonicalization (2026-09-05): the DEMO path
// (ScoringSimulatorService, reading data/synthetic/kora-index-outputs.json /
// company-aggregates.json / confidence-records.json) is retired — this was
// the last B-TRUTH-owned synthetic scoring dependency (Master Plan §32:
// "DemoScoringAdapter · ScoringSimulatorService · demo-data · access-control
// | fine B-TRUTH | I9 = 0"). environment === 'demo' (the operator/visitor
// preview toggle in lib/demo-state — unaffected by this change) now resolves
// to the SAME honest 'insufficient_data' status a real tenant sees before
// its first scoring run completes — reusing existing UI, not inventing a
// new one, and not routing through any live DB call (no new dependency
// introduced for anonymous/demo visitors). No replacement simulator, no
// second scoring path: getDemoScoringResult() below no longer reads or
// computes anything, it only reports the shape's own "not yet scored" state.
// See tests/unit/cc00-final-scoring-canonicalization.test.ts.

'use client';

import { useEffect, useState } from 'react';
import { useEnvironment } from '@/lib/demo-state';
import type { ConfidenceRecord } from '@/lib/types';
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
// KoraIndexOutput.synthetic_demo_data is optional — live DB rows satisfy the
// type without assertions. KoraIndexSnapshot / CompanyAggregateSnapshot omit
// the demo-only sentinel fields for use in live mapper output shapes.

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
 * LIVE branch: NEVER fall back to demo seed data — return 'insufficient_data' if empty.
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

// ── DB row → ScoringResult mapper ─────────────────────────────────────────────

function mapDbRowToScoringResult(
  row: LiveRow,
  tenantId: string,
  scenarioId: ScenarioId,
): ScoringResult {
  const mapped = mapDbRow(row, tenantId, scenarioId);
  return { ...mapped, tenantId, scenarioId, environment: 'live' };
}

// ── Live fetch (async) ─────────────────────────────────────────────────────────

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
  // LIVE must NEVER fallback to demo seed data.
  const { getSupabaseBrowserClient } = await import('@/lib/supabase/client');
  const supabase = getSupabaseBrowserClient();

  // Typed schema access — Database type now includes 'analytics' schema.
  // The join select result is cast to LiveRow because Supabase JS cannot infer
  // nested join shapes from the select string at compile time.
  // TODO: remove LiveRow cast after Supabase multi-schema type narrowing for join selects
  const { data: row, error } = await supabase
    .schema('analytics')
    .from('kora_index_result')
    .select('*, confidence_result:confidence_result_id(*), activation_result:activation_result_id(*)')
    .eq('tenant_id', tenantId)
    .eq('is_current', true)
    .maybeSingle() as unknown as { data: import('@/lib/live/scoring-mapper').LiveRow | null; error: { message: string } | null };

  if (error) throw new Error(`[KORA live] ${error.message}`);
  if (!row) {
    return {
      status: 'insufficient_data',
      tenantId, scenarioId, environment: 'live',
      koraIndex: null, aggregate: null, confidence: null,
    };
  }
  return mapDbRowToScoringResult(row as import('@/lib/live/scoring-mapper').LiveRow, tenantId, scenarioId);
}

// ── Demo resolver (sync, no Supabase, no synthetic seed) ──────────────────────
//
// CC-00 Final Scoring Canonicalization (2026-09-05): the demo environment no
// longer has its own computed data source. It honestly reports the same
// 'insufficient_data' status a real tenant sees before its first scoring run
// completes — every consuming page already has a "dati non ancora
// disponibili" empty state for this status, so no new UI is required.

function getDemoScoringResult({
  tenantId,
  scenarioId,
}: {
  tenantId: string;
  scenarioId: ScenarioId;
}): ScoringResult {
  return {
    status: 'insufficient_data',
    tenantId, scenarioId, environment: 'demo',
    koraIndex: null, aggregate: null, confidence: null,
  };
}

// ── Public API: useScoringResult ───────────────────────────────────────────────

/**
 * Single consumption point for scoring data in client components.
 *
 * Demo:  synchronous — returns 'insufficient_data' immediately, no seed, no fetch. loading = false.
 * Live:  async — fetches from Supabase, returns loading=true while pending.
 *        LIVE must NEVER fallback to demo seed data.
 *
 * forceEnvironment: when provided, overrides the global demo-state environment.
 * Company intelligence pages pass forceEnvironment='live' when a real Supabase
 * session is detected, so the live path activates without changing global state.
 */
export function useScoringResult({
  tenantId,
  scenarioId,
  forceEnvironment,
}: {
  tenantId: string;
  scenarioId: ScenarioId;
  forceEnvironment?: Environment;
}): UseScoringResultReturn {
  const { activeEnvironment: globalEnvironment } = useEnvironment();
  const environment: Environment = forceEnvironment ?? globalEnvironment;

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

// CC-00 Final Scoring Canonicalization (2026-09-05): isDemoScenarioComparison()
// and useDemoScenarioComparison() are removed here — both existed only to
// support an S1/S2 demo scenario comparison strip that had zero real callers
// anywhere in the repository (confirmed by repo-wide grep before removal),
// and both depended on the now-retired synthetic per-scenario seed data.
// Dead code removed alongside its own now-dead dependency, not carried
// forward speculatively.
