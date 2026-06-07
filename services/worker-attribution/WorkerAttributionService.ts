// services/worker-attribution/WorkerAttributionService.ts
// B85-B — Worker Attribution Explainability Layer.
// Pure classification — no DB, no persistence, no scoring changes.
// Derives attribution class A–F from existing event fields.
// Enables workers to understand: "why does this activity count?"
// and "why does this activity NOT count?" without Pilot+.

export type AttributionCode = 'A' | 'B' | 'C' | 'D' | 'E' | 'F';

export interface AttributionInput {
  verification_status: 'verified' | 'partial' | 'self_declared';
  source_type: string;
  kora_eligibility?: 'eligible' | 'limited' | 'blocked';
  event_nature?: string;
  action_family?: string;
}

export interface AttributionClass {
  code: AttributionCode;
  label: string;
  description: string;
  workerPibEligible: boolean;
  dynamicCvEligible: boolean;
  requiresVerification: boolean;
}

const ATTRIBUTION_DEFINITIONS: Record<AttributionCode, Omit<AttributionClass, 'code'>> = {
  A: {
    label: 'Verified Individual',
    description: 'Attività verificata da fonte esterna. Può contribuire al PIB personale e al Dynamic CV.',
    workerPibEligible: true,
    dynamicCvEligible: true,
    requiresVerification: false,
  },
  B: {
    label: 'Partially Verified',
    description: 'Verifica parziale in corso. La verifica completa è necessaria per entrare nel PIB o nel Dynamic CV.',
    workerPibEligible: false,
    dynamicCvEligible: false,
    requiresVerification: true,
  },
  C: {
    label: 'Self-Declared',
    description: 'Autodichiarato dal lavoratore. Senza verifica esterna non contribuisce al PIB né al Dynamic CV.',
    workerPibEligible: false,
    dynamicCvEligible: false,
    requiresVerification: true,
  },
  D: {
    label: 'Structural Policy',
    description: 'Policy organizzativa strutturale. Non tracciata individualmente — contribuisce solo in forma aggregata.',
    workerPibEligible: false,
    dynamicCvEligible: false,
    requiresVerification: false,
  },
  E: {
    label: 'Economic Relief',
    description: 'Sostegno economico (voucher, rimborsi, fringe benefit). Offre valore ma non genera Impact Units personali.',
    workerPibEligible: false,
    dynamicCvEligible: false,
    requiresVerification: false,
  },
  F: {
    label: 'Blocked Compliance',
    description: 'Conformità obbligatoria (sicurezza, GDPR, contratto). KORA non trasforma la compliance in impatto.',
    workerPibEligible: false,
    dynamicCvEligible: false,
    requiresVerification: false,
  },
};

export class WorkerAttributionService {
  classify(input: AttributionInput): AttributionClass {
    const code = this.deriveCode(input);
    return { code, ...ATTRIBUTION_DEFINITIONS[code] };
  }

  getPibEligibilityLabel(input: AttributionInput): string {
    const result = this.classify(input);
    if (result.code === 'B') return 'Verifica in corso — richiesta per contribuire al PIB';
    return result.workerPibEligible ? 'Può contribuire al tuo PIB' : 'Non contribuisce al tuo PIB';
  }

  getDynamicCvEligibilityLabel(input: AttributionInput): string {
    const result = this.classify(input);
    if (result.code === 'B') return 'Verifica in corso — richiesta per il Dynamic CV';
    return result.dynamicCvEligible ? 'Può comparire nel Dynamic CV' : 'Non idoneo al Dynamic CV';
  }

  // Returns Italian worker-readable exclusion reason for non-eligible classes.
  // Returns null for class A (eligible — no exclusion).
  getExclusionReason(code: AttributionCode): string | null {
    switch (code) {
      case 'A': return null;
      case 'B': return 'Verifica non completata';
      case 'C': return 'Attività autodichiarata — verifica esterna richiesta';
      case 'D': return 'Attività non idonea al Dynamic CV';
      case 'E': return 'Benefit economico — non contribuisce al Dynamic CV';
      case 'F': return 'Conformità obbligatoria — esclusa per design';
    }
  }

  private deriveCode(input: AttributionInput): AttributionCode {
    const { verification_status, source_type, kora_eligibility, event_nature, action_family } = input;

    // F — Blocked Compliance: hard-blocked items (legal mandatory, safety, etc.)
    if (kora_eligibility === 'blocked' || action_family === 'blocked_compliance') return 'F';

    // E — Economic Relief: cash-like or generic economic benefit
    if (kora_eligibility === 'limited' || action_family === 'economic_relief') return 'E';

    // D — Structural Policy: org-level policy with no individual usage tracking
    if (event_nature === 'structural_policy' || action_family === 'trust_and_flexibility_policy') return 'D';

    // C — Self-Declared: self-uploaded or self-declared with no external verification
    if (verification_status === 'self_declared' || source_type === 'manual_upload') return 'C';

    // B — Partially Verified: verification in progress
    if (verification_status === 'partial') return 'B';

    // A — Verified Individual: externally verified, attributable to individual
    if (verification_status === 'verified') return 'A';

    // Conservative fallback: treat as unverified
    return 'C';
  }
}

export const workerAttributionService = new WorkerAttributionService();
