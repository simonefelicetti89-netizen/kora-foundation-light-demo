// lib/kora-engine/bti-engine.ts
// Budget-to-Human-Impact Engine v0.1 — KORA Foundation Light Pilot.
//
// Aggregates uploaded/normalized records into the BTI diagnostic:
//   totalBudget · documentedBudget · declaredBudget · estimatedBudget
//   deepActivationSpend · economicReliefSpend · blockedComplianceSpend
//   activationDebt · budgetEvidenceQuality · btiScore
//
// Core principles (non-negotiable):
//   - Raw budget ≠ impact. Budget allocated ≠ activated. Spend ≠ human impact.
//   - Blocked compliance excluded from impact by design.
//   - Limited cash-like relief tracked separately, never as deep activation.
//   - Policy records never have budget invented.
//   - L0/L1 never receive full BTI weight.
//
// Design constraints:
//   - Deterministic. No Math.random. No external calls. No AI.
//   - Never throws on malformed input.
//   - Conservative: ambiguous → lower contribution + explicit warning.
//   - All formulas disclosed in trace (Board Pack explainability).

import type {
  RawUploadedRecord,
  NormalizedUEFRecord,
  EligibilityResult,
  BudgetEvidence,
  PillarMappingResult,
  BTIResult,
  ExplainabilityTraceItem,
} from './types';
import { classifyEligibility } from './eligibility-gate';
import { assessBudgetEvidence } from './budget-evidence';
import { isRawUploadedRecord } from './pillar-mapping';

// ── Version metadata ──────────────────────────────────────────────────────────

const ENGINE_SOURCE = 'BudgetToHumanImpactEngine_v0.1';
const METHODOLOGY_VERSION = 'KORA-METHOD-v0.1.0';

// ── BTI score formula coefficients ───────────────────────────────────────────
// These are internal BTI formula coefficients — not KORA Index macroblock weights.
// KORA Index macroblock weight for BTI (20%) lives in lib/methodology-config/v0.1.ts.

const BTI_COEFF_DEEP_ACTIVATION  = 40;   // deep activation ratio contribution to btiScore
const BTI_COEFF_EVIDENCE_QUALITY = 25;   // evidence quality contribution
const BTI_COEFF_RELIEF_BALANCE   = 20;   // relief/deep balance contribution
const BTI_COEFF_COMPLIANCE_CLARITY = 15; // compliance separation clarity contribution

// Relief penalty factor: reliefBalance = 1 - (reliefRatio * RELIEF_PENALTY)
const RELIEF_PENALTY = 0.60;

// ── Warning thresholds ────────────────────────────────────────────────────────

const WARN_L0L1_RATIO      = 0.40;  // >40% of budget from L0/L1 → warning
const WARN_RELIEF_RATIO    = 0.50;  // >50% of usable budget is relief → warning
const WARN_BLOCKED_RATIO   = 0.30;  // >30% of total budget is blocked → warning
const WARN_LOW_QUALITY     = 0.40;  // budgetEvidenceQuality <0.40 → warning
const WARN_HIGH_DEBT_RATIO = 0.60;  // activationDebt >60% of usable → warning
const WARN_REVIEW_RATIO    = 0.25;  // >25% records review_required → warning

// ── Activation Debt formula coefficients ─────────────────────────────────────
// activationDebt = max(0, usableBudget - deepActivationSpend - economicReliefSpend * RELIEF_DISCOUNT)
// Rationale: relief has partial utility (utility discount) but generates no IU.
const RELIEF_DISCOUNT = 0.25;

// ── Record ID extraction ──────────────────────────────────────────────────────

function getRecordId(record: RawUploadedRecord | NormalizedUEFRecord): string {
  return isRawUploadedRecord(record) ? record.recordId : record.uefId;
}

// ── Per-record contribution ───────────────────────────────────────────────────

interface RecordContribution {
  recordId: string;
  amount: number | null;
  totalBudgetContrib: number;
  documentedContrib: number;
  declaredContrib: number;
  estimatedContrib: number;
  deepActivationContrib: number;
  economicReliefContrib: number;
  blockedComplianceContrib: number;
  isNonValued: boolean;
  eligibilityStatus: string;
  budgetStatus: string;
  evidenceLevel: string;
  btiTreatment: string;
  confidence: number;
  reason: string;
  itemWarnings: string[];
}

function computeRecordContribution(
  record: RawUploadedRecord | NormalizedUEFRecord,
  eligibility: EligibilityResult,
  budget: BudgetEvidence,
): RecordContribution {
  const recordId = getRecordId(record);
  const amount = budget.amount;
  const safeAmount = amount ?? 0;
  const hasAmount = amount !== null;
  const itemWarnings: string[] = [];

  let totalBudgetContrib    = 0;
  let documentedContrib     = 0;
  let declaredContrib       = 0;
  let estimatedContrib      = 0;
  let deepActivationContrib = 0;
  let economicReliefContrib = 0;
  let blockedComplianceContrib = 0;

  const isNonValued = !hasAmount;

  // totalBudget: every record with a non-null amount (all statuses except null-amount).
  if (hasAmount) {
    totalBudgetContrib = safeAmount;
  }

  // Documented: status=documented + L2/L3/L4 evidence.
  if (
    budget.status === 'documented' &&
    hasAmount &&
    (budget.evidenceLevel === 'L2_INTERNAL_DOCUMENT' ||
      budget.evidenceLevel === 'L3_THIRD_PARTY_DOCUMENT' ||
      budget.evidenceLevel === 'L4_VERIFIED_EVIDENCE')
  ) {
    documentedContrib = safeAmount;
  }

  // Declared: status=declared with amount.
  if (budget.status === 'declared' && hasAmount) {
    declaredContrib = safeAmount;
  }

  // Estimated: status=estimated with amount.
  if (budget.status === 'estimated' && hasAmount) {
    estimatedContrib = safeAmount;
  }

  // ── Eligibility-based spend routing ──────────────────────────────────────
  // Eligibility status takes precedence over BTI treatment for spend routing.

  const estatus = eligibility.status;

  if (estatus === 'blocked') {
    // Blocked by design: compliance spend tracked separately, never counts as impact.
    blockedComplianceContrib = safeAmount;
    if (hasAmount && safeAmount > 0) {
      itemWarnings.push(
        `Record bloccato (compliance legale obbligatoria): €${safeAmount.toLocaleString('it-IT')} tracciato come blocked_compliance_spend. 0 IU · 0 contributo BTI attivazione.`,
      );
    }
  } else if (estatus === 'limited') {
    // Limited (cash-like / economic relief): tracked separately, no IU.
    economicReliefContrib = safeAmount;
  } else if (estatus === 'eligible') {
    if (budget.btiTreatment === 'full_weight' && hasAmount) {
      deepActivationContrib = safeAmount;
    } else if (budget.btiTreatment === 'confidence_weighted' && hasAmount) {
      deepActivationContrib = Math.round(safeAmount * budget.confidence * 100) / 100;
    } else if (budget.btiTreatment === 'excluded_from_bti') {
      itemWarnings.push(
        `Record eligible ma escluso da BTI (${budget.evidenceLevel}): €${safeAmount.toLocaleString('it-IT')} non contribuisce al deep activation spend. Evidence Debt accumulato.`,
      );
    } else if (budget.btiTreatment === 'not_applicable') {
      itemWarnings.push(
        `Record policy eligible (not_applicable): nessun valore economico inventato. Il record contribuisce come segnale di attivazione, non come budget BTI.`,
      );
    }
  } else {
    // review_required: conservative — included in budget aggregations but NOT deep activation.
    itemWarnings.push(
      `Record in revisione (review_required): importo €${safeAmount.toLocaleString('it-IT')} incluso nel budget aggregato ma escluso dal deep activation spend. Validazione umana necessaria.`,
    );
  }

  const reason = buildReason(estatus, budget.btiTreatment, budget.evidenceLevel, deepActivationContrib);

  return {
    recordId,
    amount,
    totalBudgetContrib,
    documentedContrib,
    declaredContrib,
    estimatedContrib,
    deepActivationContrib,
    economicReliefContrib,
    blockedComplianceContrib,
    isNonValued,
    eligibilityStatus: estatus,
    budgetStatus: budget.status,
    evidenceLevel: budget.evidenceLevel,
    btiTreatment: budget.btiTreatment,
    confidence: budget.confidence,
    reason,
    itemWarnings,
  };
}

function buildReason(
  eligibility: string,
  treatment: string,
  level: string,
  deepContrib: number,
): string {
  if (eligibility === 'blocked')
    return 'Blocked by Design — compliance legale obbligatoria. 0 IU · 0 KORA Index · 0 PIB.';
  if (eligibility === 'limited')
    return 'Limited — sollievo economico. Tracciato come economic_relief_spend. 0 IU per default.';
  if (eligibility === 'review_required')
    return 'Review Required — incluso conservativamente nel budget aggregato. Escluso da deep activation spend.';
  if (treatment === 'full_weight')
    return `Eligible + full_weight (${level}) — contributo deep activation al 100%.`;
  if (treatment === 'confidence_weighted')
    return `Eligible + confidence_weighted (${level}) — contributo effettivo: €${deepContrib.toLocaleString('it-IT')} (amount × confidence).`;
  if (treatment === 'excluded_from_bti')
    return `Eligible ma excluded_from_bti (${level}) — Evidence Debt accumulato. Nessun contributo BTI.`;
  if (treatment === 'not_applicable')
    return 'Policy record not_applicable — nessun valore economico inventato.';
  return `Classificazione: ${eligibility} / ${treatment} / ${level}.`;
}

// ── ExplainabilityTrace per record ────────────────────────────────────────────

function buildTraceItem(contrib: RecordContribution): ExplainabilityTraceItem {
  const amountStr = contrib.amount !== null
    ? `€${contrib.amount.toLocaleString('it-IT')}`
    : 'null';

  const input =
    `recordId=${contrib.recordId} | amount=${amountStr} | eligibility=${contrib.eligibilityStatus} ` +
    `| budgetStatus=${contrib.budgetStatus} | evidenceLevel=${contrib.evidenceLevel} | treatment=${contrib.btiTreatment}`;

  const outputParts: string[] = [];
  if (contrib.totalBudgetContrib > 0)
    outputParts.push(`totalBudget+=${contrib.totalBudgetContrib.toLocaleString('it-IT')}`);
  if (contrib.documentedContrib > 0)
    outputParts.push(`documented+=${contrib.documentedContrib.toLocaleString('it-IT')}`);
  if (contrib.declaredContrib > 0)
    outputParts.push(`declared+=${contrib.declaredContrib.toLocaleString('it-IT')}`);
  if (contrib.estimatedContrib > 0)
    outputParts.push(`estimated+=${contrib.estimatedContrib.toLocaleString('it-IT')}`);
  if (contrib.deepActivationContrib > 0)
    outputParts.push(`deepActivation+=${contrib.deepActivationContrib.toLocaleString('it-IT')}`);
  if (contrib.economicReliefContrib > 0)
    outputParts.push(`economicRelief+=${contrib.economicReliefContrib.toLocaleString('it-IT')}`);
  if (contrib.blockedComplianceContrib > 0)
    outputParts.push(`blockedCompliance+=${contrib.blockedComplianceContrib.toLocaleString('it-IT')}`);
  if (contrib.isNonValued)
    outputParts.push('nonValued+1');

  return {
    id: contrib.recordId,
    stage: 'BTI_v0.1',
    input,
    output: outputParts.length > 0 ? outputParts.join(' | ') : 'no_contribution',
    ruleApplied: contrib.reason,
    confidence: contrib.confidence,
    warning: contrib.itemWarnings.length > 0 ? contrib.itemWarnings.join(' · ') : undefined,
    source: ENGINE_SOURCE,
  };
}

// ── Budget evidence quality (0–1) ─────────────────────────────────────────────
// Formula: (documentedBudget×0.85 + declaredBudget×0.45 + estimatedBudget×0.35) / totalBudget

function computeBudgetEvidenceQuality(
  documentedBudget: number,
  declaredBudget: number,
  estimatedBudget: number,
  totalBudget: number,
): number {
  if (totalBudget <= 0) return 0;
  const weighted = documentedBudget * 0.85 + declaredBudget * 0.45 + estimatedBudget * 0.35;
  return Math.min(1, Math.round((weighted / totalBudget) * 1000) / 1000);
}

// ── BTI Score (0–100) ─────────────────────────────────────────────────────────
// Formula (transparent — disclosed in trace):
//
//   btiScore = deepActivationRatio×40 + evidenceQuality×25 + reliefBalance×20 + complianceClarity×15
//
//   deepActivationRatio = deepActivationSpend / usableBudget
//   evidenceQuality     = budgetEvidenceQuality (0–1)
//   reliefBalance       = max(0, 1 − (economicReliefSpend / usableBudget) × 0.60)
//   complianceClarity   = min(1, (deep + relief + blocked) / totalBudget)

function computeBtiScore(
  deepActivationSpend: number,
  economicReliefSpend: number,
  blockedComplianceSpend: number,
  totalBudget: number,
  usableBudget: number,
  budgetEvidenceQuality: number,
): number {
  if (totalBudget <= 0) return 0;

  const deepActivationRatio = usableBudget > 0
    ? Math.min(1, deepActivationSpend / usableBudget)
    : 0;

  const reliefBalance = usableBudget > 0
    ? Math.max(0, 1 - (economicReliefSpend / usableBudget) * RELIEF_PENALTY)
    : 1;

  const clarifiedBudget = deepActivationSpend + economicReliefSpend + blockedComplianceSpend;
  const complianceClarity = Math.min(1, clarifiedBudget / totalBudget);

  const raw =
    deepActivationRatio * BTI_COEFF_DEEP_ACTIVATION +
    budgetEvidenceQuality * BTI_COEFF_EVIDENCE_QUALITY +
    reliefBalance * BTI_COEFF_RELIEF_BALANCE +
    complianceClarity * BTI_COEFF_COMPLIANCE_CLARITY;

  return Math.max(0, Math.min(100, Math.round(raw)));
}

// ── Warnings ──────────────────────────────────────────────────────────────────

interface WarningParams {
  totalBudget: number;
  documentedBudget: number;
  declaredBudget: number;
  estimatedBudget: number;
  deepActivationSpend: number;
  economicReliefSpend: number;
  blockedComplianceSpend: number;
  activationDebt: number;
  usableBudget: number;
  budgetEvidenceQuality: number;
  nonValuedCount: number;
  totalCount: number;
  reviewRequiredCount: number;
  notApplicableCount: number;
  l0l1Budget: number;
}

function generateWarnings(p: WarningParams): string[] {
  const warnings: string[] = [];

  if (p.totalBudget === 0) {
    warnings.push(
      'Nessun importo budget rilevato nel batch. BTI economico non calcolabile. ' +
      'Classificazione eligibility e pillar disponibili. Stato: insufficient_data per BTI Score.',
    );
    if (p.nonValuedCount > 0) {
      warnings.push(
        `${p.nonValuedCount} record presenti ma senza importo estraibile. Verificare colonne budget nel file di caricamento.`,
      );
    }
    return warnings;
  }

  // L0/L1 concentration warning.
  if (p.l0l1Budget > 0) {
    const ratio = p.l0l1Budget / p.totalBudget;
    if (ratio > WARN_L0L1_RATIO) {
      warnings.push(
        `Alta concentrazione di budget senza evidenza documentata (L0/L1): ${Math.round(ratio * 100)}% del totale. ` +
        'Evidence Debt elevato. Raccogliere fatture, contratti o export fornitori per migliorare la qualità evidenza BTI.',
      );
    }
  }

  // High relief ratio.
  if (p.usableBudget > 0) {
    const reliefRatio = p.economicReliefSpend / p.usableBudget;
    if (reliefRatio > WARN_RELIEF_RATIO) {
      warnings.push(
        `Alta quota di sollievo economico: ${Math.round(reliefRatio * 100)}% del budget utilizzabile allocato a economic_relief_spend ` +
        '(buoni pasto, gift card, voucher generici). Bassa profondità di attivazione. ' +
        'Considerare conversione verso programmi eligible che generano IU.',
      );
    }
  }

  // High blocked compliance ratio.
  const blockedRatio = p.blockedComplianceSpend / p.totalBudget;
  if (blockedRatio > WARN_BLOCKED_RATIO) {
    warnings.push(
      `Alta quota di compliance obbligatoria: ${Math.round(blockedRatio * 100)}% del budget totale tracciato come blocked_compliance_spend. ` +
      'Separato correttamente dall\'impatto attivazione per design. Non genera IU né contributo KORA Index.',
    );
  }

  // Low evidence quality.
  if (p.budgetEvidenceQuality < WARN_LOW_QUALITY) {
    warnings.push(
      `Qualità evidenza budget bassa: ${Math.round(p.budgetEvidenceQuality * 100)}/100. ` +
      `Documentato: €${p.documentedBudget.toLocaleString('it-IT')} · ` +
      `Dichiarato: €${p.declaredBudget.toLocaleString('it-IT')} · ` +
      `Stimato: €${p.estimatedBudget.toLocaleString('it-IT')}. ` +
      'Aumentare la copertura di evidenza L2/L3/L4 per migliorare l\'affidabilità BTI.',
    );
  }

  // High activation debt.
  if (p.usableBudget > 0) {
    const debtRatio = p.activationDebt / p.usableBudget;
    if (debtRatio > WARN_HIGH_DEBT_RATIO) {
      warnings.push(
        `Activation Debt elevato: €${p.activationDebt.toLocaleString('it-IT')} ` +
        `(${Math.round(debtRatio * 100)}% del budget utilizzabile). ` +
        'Budget welfare disponibile ma non convertito in attivazione profonda. ' +
        `Formula: max(0, usableBudget − deepActivationSpend − economicReliefSpend × ${RELIEF_DISCOUNT}).`,
      );
    }
  }

  // High review_required ratio.
  if (p.totalCount > 0) {
    const reviewRatio = p.reviewRequiredCount / p.totalCount;
    if (reviewRatio > WARN_REVIEW_RATIO) {
      warnings.push(
        `Alta quota di record in revisione: ${p.reviewRequiredCount}/${p.totalCount} record (${Math.round(reviewRatio * 100)}%). ` +
        'Inclusi conservativamente nel budget aggregato ma esclusi dal deep activation spend. ' +
        'Validazione umana necessaria per aumentare la copertura BTI.',
      );
    }
  }

  // Policy records disclosure.
  if (p.notApplicableCount > 0) {
    warnings.push(
      `${p.notApplicableCount} record policy strutturali (not_applicable) presenti. ` +
      'Nessun valore economico inventato per smart working, diritto alla disconnessione, ferie illimitate, ecc. ' +
      'Contribuiscono come segnali di attivazione — non come budget BTI.',
    );
  }

  // Non-valued records.
  if (p.nonValuedCount > 0) {
    warnings.push(
      `${p.nonValuedCount} record senza importo rilevabile. ` +
      'Non contribuiscono al BTI economico. Evidence Debt accumulato per i record senza fonte.',
    );
  }

  return warnings;
}

// ── Formula trace items ───────────────────────────────────────────────────────

interface FormulaTraceParams {
  totalBudget: number;
  usableBudget: number;
  deepActivationSpend: number;
  economicReliefSpend: number;
  blockedComplianceSpend: number;
  activationDebt: number;
  budgetEvidenceQuality: number;
  btiScore: number;
}

function buildFormulaTrace(p: FormulaTraceParams): ExplainabilityTraceItem[] {
  return [
    {
      id: 'bti_usable_budget',
      stage: 'BTI_v0.1_formula',
      input:
        `totalBudget=€${p.totalBudget.toLocaleString('it-IT')} | ` +
        `blockedComplianceSpend=€${p.blockedComplianceSpend.toLocaleString('it-IT')}`,
      output: `usableBudget=€${p.usableBudget.toLocaleString('it-IT')}`,
      ruleApplied: 'usableBudget = totalBudget − blockedComplianceSpend',
      confidence: 1.0,
      source: ENGINE_SOURCE,
    },
    {
      id: 'bti_activation_debt',
      stage: 'BTI_v0.1_formula',
      input:
        `usableBudget=€${p.usableBudget.toLocaleString('it-IT')} | ` +
        `deepActivationSpend=€${p.deepActivationSpend.toLocaleString('it-IT')} | ` +
        `economicReliefSpend=€${p.economicReliefSpend.toLocaleString('it-IT')}`,
      output: `activationDebt=€${p.activationDebt.toLocaleString('it-IT')}`,
      ruleApplied:
        `activationDebt = max(0, usableBudget − deepActivationSpend − economicReliefSpend × ${RELIEF_DISCOUNT}). ` +
        'Rationale: sollievo economico ha utilità parziale ma genera 0 IU.',
      confidence: 1.0,
      source: ENGINE_SOURCE,
    },
    {
      id: 'bti_evidence_quality',
      stage: 'BTI_v0.1_formula',
      input: `totalBudget=€${p.totalBudget.toLocaleString('it-IT')}`,
      output: `budgetEvidenceQuality=${Math.round(p.budgetEvidenceQuality * 100)}/100`,
      ruleApplied:
        'evidenceQuality = (documentedBudget×0.85 + declaredBudget×0.45 + estimatedBudget×0.35) / totalBudget. Range 0–1.',
      confidence: 1.0,
      source: ENGINE_SOURCE,
    },
    {
      id: 'bti_score',
      stage: 'BTI_v0.1_formula',
      input: 'deepActivationRatio · evidenceQuality · reliefBalance · complianceClarity',
      output: `btiScore=${p.btiScore}/100`,
      ruleApplied:
        `btiScore = deepActivationRatio×${BTI_COEFF_DEEP_ACTIVATION} + evidenceQuality×${BTI_COEFF_EVIDENCE_QUALITY} ` +
        `+ reliefBalance×${BTI_COEFF_RELIEF_BALANCE} + complianceClarity×${BTI_COEFF_COMPLIANCE_CLARITY}. ` +
        'reliefBalance = max(0, 1 − reliefRatio×0.60). complianceClarity = min(1, clarifiedBudget/totalBudget).',
      confidence: 1.0,
      source: ENGINE_SOURCE,
    },
    {
      id: 'bti_methodology',
      stage: 'BTI_v0.1_metadata',
      input: 'methodology_version_id',
      output:
        `${METHODOLOGY_VERSION} | calibration_status=pre_empirical_calibration | production_ready=false`,
      ruleApplied:
        'Ogni output BTI deve riportare versione metodologica e stato di calibrazione (doc 21b). ' +
        'Raw budget non alimenta direttamente il KORA Index — solo l\'output metodologico del BTI Engine ' +
        'contribuisce al macroblocco Budget-to-Human-Impact (peso 20%, letto da lib/methodology-config/v0.1.ts).',
      confidence: 1.0,
      source: ENGINE_SOURCE,
    },
  ];
}

// ── Safe result fallbacks ─────────────────────────────────────────────────────

function getEligibility(
  records: Array<RawUploadedRecord | NormalizedUEFRecord>,
  results: EligibilityResult[],
  i: number,
): EligibilityResult {
  if (i < results.length) return results[i];
  try {
    return classifyEligibility(records[i]);
  } catch {
    return {
      recordId: getRecordId(records[i]),
      status: 'review_required',
      reason: 'Fallback: classificazione non disponibile.',
      doctrineReference: 'BTI Engine fallback',
      confidence: 0.20,
      impactTreatment: 'pending_review',
      budgetTreatmentSuggestion: 'review_required',
      reviewRequired: true,
    };
  }
}

function getBudget(
  records: Array<RawUploadedRecord | NormalizedUEFRecord>,
  results: BudgetEvidence[],
  i: number,
): BudgetEvidence {
  if (i < results.length) return results[i];
  try {
    return assessBudgetEvidence(records[i]);
  } catch {
    return {
      amount: null,
      currency: 'EUR',
      status: 'not_available',
      evidenceLevel: 'L0_NO_EVIDENCE',
      evidenceType: 'not_available',
      source: 'non specificata',
      confidence: 0.10,
      usedInBTI: false,
      btiTreatment: 'excluded_from_bti',
      notes: 'Fallback: evidenza non disponibile.',
    };
  }
}

// ── Empty result ──────────────────────────────────────────────────────────────

function buildEmptyResult(warnings: string[]): BTIResult {
  return {
    totalBudget: 0,
    documentedBudget: 0,
    declaredBudget: 0,
    estimatedBudget: 0,
    nonValuedBudget: 0,
    deepActivationSpend: 0,
    economicReliefSpend: 0,
    blockedComplianceSpend: 0,
    activationDebt: 0,
    budgetEvidenceQuality: 0,
    btiScore: 0,
    warnings,
    trace: [],
  };
}

// ── Public API ────────────────────────────────────────────────────────────────

export function computeBTI(params: {
  records: Array<RawUploadedRecord | NormalizedUEFRecord>;
  eligibilityResults: EligibilityResult[];
  budgetEvidenceResults: BudgetEvidence[];
  pillarMappings?: PillarMappingResult[];
}): BTIResult {
  const { records, eligibilityResults, budgetEvidenceResults } = params;
  const n = records.length;

  if (n === 0) {
    return buildEmptyResult(['Nessun record fornito al BTI Engine.']);
  }

  // Compute per-record contributions (safe fallback if arrays are shorter).
  const contributions: RecordContribution[] = records.map((rec, i) =>
    computeRecordContribution(
      rec,
      getEligibility(records, eligibilityResults, i),
      getBudget(records, budgetEvidenceResults, i),
    ),
  );

  // Re-fetch budget results used in aggregation (needed for evidenceLevel access).
  const budgets: BudgetEvidence[] = records.map((rec, i) =>
    getBudget(records, budgetEvidenceResults, i),
  );

  // Aggregate all contributions.
  let totalBudget          = 0;
  let documentedBudget     = 0;
  let declaredBudget       = 0;
  let estimatedBudget      = 0;
  let nonValuedCount       = 0;
  let deepActivationSpend  = 0;
  let economicReliefSpend  = 0;
  let blockedComplianceSpend = 0;
  let l0l1Budget           = 0;
  let notApplicableCount   = 0;
  let reviewRequiredCount  = 0;

  for (let i = 0; i < contributions.length; i++) {
    const c = contributions[i];
    const b = budgets[i];

    totalBudget          += c.totalBudgetContrib;
    documentedBudget     += c.documentedContrib;
    declaredBudget       += c.declaredContrib;
    estimatedBudget      += c.estimatedContrib;
    deepActivationSpend  += c.deepActivationContrib;
    economicReliefSpend  += c.economicReliefContrib;
    blockedComplianceSpend += c.blockedComplianceContrib;

    if (c.isNonValued) nonValuedCount += 1;
    if (b.btiTreatment === 'not_applicable') notApplicableCount += 1;
    if (c.eligibilityStatus === 'review_required') reviewRequiredCount += 1;

    // L0/L1 budget tracking for warning.
    if (
      c.amount !== null &&
      (b.evidenceLevel === 'L0_NO_EVIDENCE' || b.evidenceLevel === 'L1_SELF_DECLARED')
    ) {
      l0l1Budget += c.amount;
    }
  }

  // Round to avoid floating-point accumulation.
  totalBudget          = Math.round(totalBudget * 100) / 100;
  documentedBudget     = Math.round(documentedBudget * 100) / 100;
  declaredBudget       = Math.round(declaredBudget * 100) / 100;
  estimatedBudget      = Math.round(estimatedBudget * 100) / 100;
  deepActivationSpend  = Math.round(deepActivationSpend * 100) / 100;
  economicReliefSpend  = Math.round(economicReliefSpend * 100) / 100;
  blockedComplianceSpend = Math.round(blockedComplianceSpend * 100) / 100;

  const usableBudget = Math.max(
    0,
    Math.round((totalBudget - blockedComplianceSpend) * 100) / 100,
  );

  // Activation Debt (formula disclosed in trace).
  const activationDebt = Math.max(
    0,
    Math.round(
      (usableBudget - deepActivationSpend - economicReliefSpend * RELIEF_DISCOUNT) * 100,
    ) / 100,
  );

  const budgetEvidenceQuality = computeBudgetEvidenceQuality(
    documentedBudget, declaredBudget, estimatedBudget, totalBudget,
  );

  const btiScore = computeBtiScore(
    deepActivationSpend, economicReliefSpend, blockedComplianceSpend,
    totalBudget, usableBudget, budgetEvidenceQuality,
  );

  const warnings = generateWarnings({
    totalBudget, documentedBudget, declaredBudget, estimatedBudget,
    deepActivationSpend, economicReliefSpend, blockedComplianceSpend,
    activationDebt, usableBudget, budgetEvidenceQuality,
    nonValuedCount, totalCount: n, reviewRequiredCount, notApplicableCount, l0l1Budget,
  });

  const trace: ExplainabilityTraceItem[] = [
    ...contributions.map(buildTraceItem),
    ...buildFormulaTrace({
      totalBudget, usableBudget, deepActivationSpend, economicReliefSpend,
      blockedComplianceSpend, activationDebt, budgetEvidenceQuality, btiScore,
    }),
  ];

  return {
    totalBudget,
    documentedBudget,
    declaredBudget,
    estimatedBudget,
    nonValuedBudget: nonValuedCount,
    deepActivationSpend,
    economicReliefSpend,
    blockedComplianceSpend,
    activationDebt,
    budgetEvidenceQuality,
    btiScore,
    warnings,
    trace,
  };
}

export function computeBTIFromRecords(
  records: Array<RawUploadedRecord | NormalizedUEFRecord>,
): BTIResult {
  if (records.length === 0) {
    return buildEmptyResult(['Nessun record fornito. BTI non calcolabile.']);
  }

  try {
    const eligibilityResults = records.map(classifyEligibility);
    const budgetEvidenceResults = records.map(assessBudgetEvidence);
    return computeBTI({ records, eligibilityResults, budgetEvidenceResults });
  } catch {
    return buildEmptyResult([
      'Errore interno durante il calcolo BTI. Verificare la struttura dei dati di input.',
    ]);
  }
}

// ── Exported constants (for testing / explainability UI) ─────────────────────

export {
  BTI_COEFF_DEEP_ACTIVATION  as BTI_WEIGHT_DEEP_ACTIVATION,
  BTI_COEFF_EVIDENCE_QUALITY as BTI_WEIGHT_EVIDENCE_QUALITY,
  BTI_COEFF_RELIEF_BALANCE   as BTI_WEIGHT_RELIEF_BALANCE,
  BTI_COEFF_COMPLIANCE_CLARITY as BTI_WEIGHT_COMPLIANCE_CLARITY,
  RELIEF_DISCOUNT            as BTI_RELIEF_DISCOUNT,
  ENGINE_SOURCE              as BTI_ENGINE_VERSION,
};
