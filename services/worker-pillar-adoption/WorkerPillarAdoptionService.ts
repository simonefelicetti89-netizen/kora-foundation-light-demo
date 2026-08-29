// services/worker-pillar-adoption/WorkerPillarAdoptionService.ts
// B83-B Task 3: Aggregate pillar adoption — company-level distribution only.
//
// Source: company-aggregates.json pillar_distribution (IU share per pillar).
// Privacy: only returns data when privacy_threshold_met = true AND active workers ≥ 10.
// No individual worker resolution at any path.

import aggregatesRaw from '@/data/synthetic/company-aggregates.json';
import { SAFE_AGGREGATION_THRESHOLD } from '@/lib/constants/kora';

const PILLARS = ['LIFE', 'GROWTH', 'CONNECTION', 'IMPACT', 'LEGACY'] as const;
type Pillar = typeof PILLARS[number];

interface SeedAgg {
  company_id: string;
  scenario_id: string;
  active_worker_count: number;
  total_workers: number;
  pillar_distribution: Partial<Record<Pillar, number>>;
  privacy_threshold_met: boolean;
}

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
  scenarioId: string;
}

// CC-002 / I2: threshold imported from the single canonical source
// (lib/constants/kora.ts) — do not redefine locally.
const SAFE_THRESHOLD = SAFE_AGGREGATION_THRESHOLD;

class WorkerPillarAdoptionService {
  // Returns aggregate pillar distribution for a company.
  // Suppresses entirely if privacy_threshold_met = false or active workers < SAFE_THRESHOLD.
  getCompanyPillarAdoption(
    companyId: string,
    scenarioId?: string,
  ): PillarAdoptionResult {
    const records = (aggregatesRaw as { data: SeedAgg[] }).data;

    // Prefer the requested scenario; fall back to first match for company.
    const record =
      (scenarioId ? records.find((r) => r.company_id === companyId && r.scenario_id === scenarioId) : null) ??
      records.find((r) => r.company_id === companyId) ??
      null;

    if (!record) {
      return this._suppressed(companyId, 0, 0, 'S1', 'Nessun dato aggregato disponibile per questa azienda.');
    }

    if (!record.privacy_threshold_met) {
      return this._suppressed(
        companyId,
        record.active_worker_count,
        record.total_workers,
        record.scenario_id,
        'Soglia privacy non raggiunta. I dati per pilastro sono soppressi.',
      );
    }

    if (record.active_worker_count < SAFE_THRESHOLD) {
      return this._suppressed(
        companyId,
        record.active_worker_count,
        record.total_workers,
        record.scenario_id,
        `Worker attivi insufficienti (${record.active_worker_count} < ${SAFE_THRESHOLD}) — dati per pilastro soppressi.`,
      );
    }

    const dist = record.pillar_distribution ?? {};
    const data: PillarAdoptionRow[] = PILLARS.map((pillar) => ({
      pillar,
      share: dist[pillar] ?? 0,
      suppressed: false as const,
    }));

    return {
      data,
      suppressed: false,
      activeWorkerCount: record.active_worker_count,
      totalWorkers: record.total_workers,
      privacyThresholdMet: true,
      scenarioId: record.scenario_id,
    };
  }

  private _suppressed(
    _companyId: string,
    activeWorkerCount: number,
    totalWorkers: number,
    scenarioId: string,
    suppressionReason: string,
  ): PillarAdoptionResult {
    return {
      data: PILLARS.map((pillar) => ({ pillar, share: null, suppressed: true as const })),
      suppressed: true,
      suppressionReason,
      activeWorkerCount,
      totalWorkers,
      privacyThresholdMet: false,
      scenarioId,
    };
  }
}

export const workerPillarAdoptionService = new WorkerPillarAdoptionService();
