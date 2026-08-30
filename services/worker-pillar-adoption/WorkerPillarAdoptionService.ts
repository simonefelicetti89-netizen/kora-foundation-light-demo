// services/worker-pillar-adoption/WorkerPillarAdoptionService.ts
// B83-B Task 3: Aggregate pillar adoption — company-level distribution only.
//
// CC-018 / B-TRUTH (Master Plan §19/§28, "One Truth per gruppo di seed"):
// canonical source is analytics.activation_result.pillar_distribution — the
// same column already used as the canonical source for the Decision Pack's
// pillar breakdown (lib/decision-pack/pdf-data.ts, B-PACK) — persisted by the
// live scoring pipeline (lib/live/persistence.ts). This is a source swap
// only: the N≥10 suppression contract and the 0.0–1.0 share shape are
// unchanged from the superseded data/synthetic/company-aggregates.json read.
//
// Privacy: only returns data when privacy_threshold_met = true AND active
// workers >= SAFE_AGGREGATION_THRESHOLD. No individual worker resolution at
// any path.

import type { ServiceDb } from '@/lib/supabase/server';
import { SAFE_AGGREGATION_THRESHOLD } from '@/lib/constants/kora';

const PILLARS = ['LIFE', 'GROWTH', 'CONNECTION', 'IMPACT', 'LEGACY'] as const;
type Pillar = typeof PILLARS[number];

export interface PillarAdoptionEntry {
  pillar: Pillar;
  share: number;     // 0.0–1.0 share of total company IU
  suppressed: false;
}

export interface PillarAdoptionSuppressed {
  pillar: Pillar;
  share: null;
  suppressed: true;
}

export type PillarAdoptionRow = PillarAdoptionEntry | PillarAdoptionSuppressed;

export interface PillarAdoptionResult {
  data: PillarAdoptionRow[];
  suppressed: boolean;
  suppressionReason?: string;
  activeWorkerCount: number;
  totalWorkers: number;
  privacyThresholdMet: boolean;
  reportingPeriod: string;
}

interface ActivationResultRow {
  reporting_period: string;
  active_worker_count: number;
  total_workers: number;
  privacy_threshold_met: boolean;
  pillar_distribution: Record<string, number> | null;
}

// CC-002 / I2: threshold imported from the single canonical source
// (lib/constants/kora.ts) — do not redefine locally.
const SAFE_THRESHOLD = SAFE_AGGREGATION_THRESHOLD;

class WorkerPillarAdoptionService {
  // Returns aggregate pillar distribution for a company's current
  // activation_result row. Suppresses entirely if privacy_threshold_met =
  // false or active workers < SAFE_THRESHOLD — mirrors the app-layer
  // suppression already applied before activation_result is written
  // (lib/live/persistence.ts), checked again here in-line (defense in
  // depth, consistent with B168's canonical-threshold-guard pattern).
  async getCompanyPillarAdoption(db: ServiceDb, tenantId: string): Promise<PillarAdoptionResult> {
    const { data, error } = await db
      .schema('analytics')
      .from('activation_result')
      .select('reporting_period, active_worker_count, total_workers, privacy_threshold_met, pillar_distribution')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw new Error(`[KORA] getCompanyPillarAdoption: ${error.message}`);
    }

    if (!data) {
      return this._suppressed(0, 0, '', 'Nessun dato di attivazione disponibile per questa azienda.');
    }

    const row = data as ActivationResultRow;

    if (!row.privacy_threshold_met) {
      return this._suppressed(
        row.active_worker_count,
        row.total_workers,
        row.reporting_period,
        'Soglia privacy non raggiunta. I dati per pilastro sono soppressi.',
      );
    }

    if (row.active_worker_count < SAFE_THRESHOLD) {
      return this._suppressed(
        row.active_worker_count,
        row.total_workers,
        row.reporting_period,
        `Worker attivi insufficienti (${row.active_worker_count} < ${SAFE_THRESHOLD}) — dati per pilastro soppressi.`,
      );
    }

    const dist = row.pillar_distribution ?? {};
    const total = PILLARS.reduce((sum, p) => sum + (dist[p] ?? 0), 0);

    const data_: PillarAdoptionRow[] = PILLARS.map((pillar) => ({
      pillar,
      share: total > 0 ? (dist[pillar] ?? 0) / total : 0,
      suppressed: false as const,
    }));

    return {
      data: data_,
      suppressed: false,
      activeWorkerCount: row.active_worker_count,
      totalWorkers: row.total_workers,
      privacyThresholdMet: true,
      reportingPeriod: row.reporting_period,
    };
  }

  private _suppressed(
    activeWorkerCount: number,
    totalWorkers: number,
    reportingPeriod: string,
    suppressionReason: string,
  ): PillarAdoptionResult {
    return {
      data: PILLARS.map((pillar) => ({ pillar, share: null, suppressed: true as const })),
      suppressed: true,
      suppressionReason,
      activeWorkerCount,
      totalWorkers,
      privacyThresholdMet: false,
      reportingPeriod,
    };
  }
}

export const workerPillarAdoptionService = new WorkerPillarAdoptionService();
