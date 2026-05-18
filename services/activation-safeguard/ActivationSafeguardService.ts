import type { ActivationSafeguardResult, SafeguardStatus, ScenarioId } from '@/lib/types';
import { getThresholds } from '@/lib/methodology-config/v0.1';
import activationSafeguardRaw from '@/data/synthetic/activation-safeguard-results.json';

interface SeedSafeguardRecord {
  id: string; company_id: string; scenario_id: string;
  ar_value: number; mar_value: number; status: string;
  methodology_version_id: string; calibration_status: string;
  synthetic_demo_data: true; generated_for: string; not_live_data: true;
}

const safeguardRecords = (activationSafeguardRaw as { data: SeedSafeguardRecord[] }).data;

export interface IActivationSafeguardService {
  evaluate(ar: number, mar: number): ActivationSafeguardResult;
  evaluateFromSeed(companyId: string, scenarioId: ScenarioId): ActivationSafeguardResult | null;
}

export class ActivationSafeguardService implements IActivationSafeguardService {
  // OR logic per CLAUDE.md §14 — either condition alone is sufficient to trigger WARNING/FLAGGED
  evaluate(ar: number, mar: number): ActivationSafeguardResult {
    const t = getThresholds();
    let status: SafeguardStatus;

    // FLAGGED: AR < 0.20 OR MAR < 0.15
    if (ar < t.FLAGGED.AR_max || mar < t.FLAGGED.MAR_max) {
      status = 'FLAGGED';
    }
    // CLEAR: AR >= 0.40 AND MAR >= 0.30 (both required)
    else if (ar >= t.CLEAR.AR && mar >= t.CLEAR.MAR) {
      status = 'CLEAR';
    }
    // WARNING: (0.20 <= AR < 0.40) OR (0.15 <= MAR < 0.30)
    else {
      status = 'WARNING';
    }

    return { status, ar_value: ar, mar_value: mar };
  }

  evaluateFromSeed(companyId: string, scenarioId: ScenarioId): ActivationSafeguardResult | null {
    const record = safeguardRecords.find(
      (r) => r.company_id === companyId && r.scenario_id === scenarioId,
    );
    if (!record) return null;

    // Validate seed status is consistent with OR logic before returning
    const computed = this.evaluate(record.ar_value, record.mar_value);
    if (computed.status !== record.status) {
      // Seed status does not match OR logic — trust the computed value, not the seed label
      return computed;
    }

    return {
      status: record.status as SafeguardStatus,
      ar_value: record.ar_value,
      mar_value: record.mar_value,
    };
  }
}

export const activationSafeguardService = new ActivationSafeguardService();
