import type { ActivationSafeguardResult, SafeguardStatus } from '@/lib/types';
import { getThresholds } from '@/lib/methodology-config/v0.1';

// CC-00 Final Scoring Canonicalization (2026-09-05): evaluateFromSeed()
// (data/synthetic/activation-safeguard-results.json, called only by the
// now-deleted ScoringSimulatorService.getActivationSafeguard(), itself
// confirmed to have zero real callers repo-wide) is retired. evaluate() —
// the real, canonical, methodology-driven path already used by every live
// company page — is unchanged. See
// tests/unit/cc00-final-scoring-canonicalization.test.ts.

export interface IActivationSafeguardService {
  evaluate(ar: number, mar: number): ActivationSafeguardResult;
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
}

export const activationSafeguardService = new ActivationSafeguardService();
