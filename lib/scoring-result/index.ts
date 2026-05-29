'use client';

import { useEnvironment } from '@/lib/demo-state';
import { scoringSimulatorService } from '@/services/scoring-simulator/ScoringSimulatorService';
import type { ConfidenceRecord } from '@/services/scoring-simulator/ScoringSimulatorService';
import type { KoraIndexOutput, CompanyAggregateExtended, ScenarioId, Environment } from '@/lib/types';

// Re-export so consumers import from one place.
export type { ConfidenceRecord };

// ── Types ──────────────────────────────────────────────────────────────────────

export type ScoringResultStatus = 'ok' | 'insufficient_data' | 'not_implemented';

/**
 * Canonical scoring output for a single tenant × scenario × environment.
 * This is the stable interface that all output pages must consume.
 * koraIndex / aggregate / confidence are null when status !== 'ok'.
 */
export interface ScoringResult {
  status: ScoringResultStatus;
  tenantId: string;
  scenarioId: ScenarioId;
  environment: Environment;
  koraIndex: KoraIndexOutput | null;
  aggregate: CompanyAggregateExtended | null;
  confidence: ConfidenceRecord | null;
}

export interface UseScoringResultReturn {
  data: ScoringResult | null;
  loading: boolean;  // always false in Phase 1; true while async fetch runs in Phase 2
  error: Error | null;
}

// ── Pure resolver (no React context) ──────────────────────────────────────────

export function getScoringResult({
  tenantId,
  scenarioId,
  environment,
}: {
  tenantId: string;
  scenarioId: ScenarioId;
  environment: Environment;
}): ScoringResult {
  if (environment === 'demo') {
    const koraIndex  = scoringSimulatorService.getKoraIndexOutput(tenantId, scenarioId);
    const aggregate  = scoringSimulatorService.getCompanyAggregate(tenantId, scenarioId);
    const confidence = scoringSimulatorService.getConfidenceRecord(tenantId, scenarioId);
    const status: ScoringResultStatus = koraIndex ? 'ok' : 'insufficient_data';
    return { status, tenantId, scenarioId, environment, koraIndex, aggregate, confidence };
  }

  // TODO Fase 2 — ramo live: collegare Supabase.
  //   const { data, error } = await supabase
  //     .from('kora_index_outputs')
  //     .select('*, company_aggregates(*), confidence_records(*)')
  //     .eq('company_id', tenantId)
  //     .eq('scenario_id', scenarioId)
  //     .single();
  //   Se live non ha ancora dati → restituire 'insufficient_data'.
  //   NON ricadere mai sul seed demo nel ramo live.
  //   Questo ramo diventa async: sostituire useScoringResult con useEffect + useState.
  //   L'interfaccia { data, loading, error } dei consumer rimane invariata.
  return {
    status: 'not_implemented',
    tenantId,
    scenarioId,
    environment,
    koraIndex: null,
    aggregate: null,
    confidence: null,
  };
}

// ── React hook (async-ready) ───────────────────────────────────────────────────

/**
 * Single consumption point for scoring data in client components.
 * Phase 1: synchronous — resolves immediately from in-memory demo seed.
 * Phase 2: replace body with useEffect + useState for async Supabase fetch.
 *   The { data, loading, error } contract is stable — consumer components need no change.
 */
export function useScoringResult({
  tenantId,
  scenarioId,
}: {
  tenantId: string;
  scenarioId: ScenarioId;
}): UseScoringResultReturn {
  const { activeEnvironment: environment } = useEnvironment();
  const data = getScoringResult({ tenantId, scenarioId, environment });
  return { data, loading: false, error: null };
}
