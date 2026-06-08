// lib/kora-engine/explainability.ts
// Explainability Engine v0.1 — Foundation Light Pilot.
//
// Builds a 9-stage aggregate explainability trace for the KORA computation pipeline.
// Trace items are aggregate only — no identity values, no individual worker data.
//
// Privacy invariant: identity signals used in reach computation are NEVER included.
// All counts are aggregate (N of records, N of workers) — no named individuals.

import type {
  EligibilitySummary,
  BTIResult,
  ActivationResult,
  KoraIndexResult,
  ConfidenceResult,
  ExplainabilityTraceItem,
  Pillar,
} from './types';

const ENGINE_SOURCE = 'ExplainabilityEngine_v0.1';

export function buildExplainabilityTrace(params: {
  eligibilitySummary: EligibilitySummary;
  pillarDistribution: Record<Pillar, number>;
  bti: BTIResult;
  activation: ActivationResult;
  koraIndex: KoraIndexResult;
  confidence: ConfidenceResult;
  totalRecords: number;
  workforcePopulation: number | null;
  careSignalCount: number;
}): ExplainabilityTraceItem[] {
  const {
    eligibilitySummary,
    pillarDistribution,
    bti,
    activation,
    koraIndex,
    confidence,
    totalRecords,
    workforcePopulation,
    careSignalCount,
  } = params;

  const trace: ExplainabilityTraceItem[] = [];

  // ── Stage 1: Eligibility Gate ──────────────────────────────────────────────
  const eligibilityConf = eligibilitySummary.totalCount > 0
    ? Math.min(1, (eligibilitySummary.eligibleCount + eligibilitySummary.limitedCount) /
        eligibilitySummary.totalCount * 0.80 + 0.20)
    : 0;

  trace.push({
    id: 'stage_01_eligibility',
    stage: 'Stage 1 — Eligibility Gate',
    input: `totalRecords=${totalRecords}`,
    output:
      `eligible=${eligibilitySummary.eligibleCount} | ` +
      `limited=${eligibilitySummary.limitedCount} | ` +
      `blocked=${eligibilitySummary.blockedCount} | ` +
      `review_required=${eligibilitySummary.reviewRequiredCount}`,
    ruleApplied:
      'Classificazione per priorità: privacy → blocked → limited → eligible → review_required. ' +
      'Blocked = compliance legale obbligatoria (D.Lgs 81/08 etc) — 0 IU per design. ' +
      'Limited = sollievo economico (buoni pasto etc) — tracciato BTI, 0 IU. ' +
      'Eligible = genera IU · contribuisce al KORA Index.',
    confidence: round3(eligibilityConf),
    warning: eligibilitySummary.reviewRequiredCount > eligibilitySummary.totalCount * 0.25
      ? `${eligibilitySummary.reviewRequiredCount} record in review_required: classificazione incompleta.`
      : undefined,
    source: ENGINE_SOURCE,
  });

  // ── Stage 2: Pillar Mapping ────────────────────────────────────────────────
  const pillarEntries = (Object.entries(pillarDistribution) as [Pillar, number][])
    .filter(([, v]) => v > 0)
    .sort(([, a], [, b]) => b - a);
  const topPillar = pillarEntries[0]?.[0] ?? 'none';
  const pillarSummary = pillarEntries.length > 0
    ? pillarEntries.map(([p, n]) => `${p}=${n}`).join(' | ')
    : 'no_pillar_signal';

  trace.push({
    id: 'stage_02_pillar_mapping',
    stage: 'Stage 2 — Pillar Mapping',
    input: `eligibleRecords=${eligibilitySummary.eligibleCount} | blockedRecords=${eligibilitySummary.blockedCount}`,
    output: pillarSummary,
    ruleApplied:
      `5 pilastri KORA: LIFE | GROWTH | CONNECTION | IMPACT | LEGACY. ` +
      `Pilastro primario prevalente: ${topPillar}. ` +
      'Mapping basato su BCM keyword taxonomy — nessuna chiamata LLM su dati aziendali (doc 19 §9.2). ' +
      'Record blocked → pilastro=null (nessun contributo IU).',
    confidence: eligibilitySummary.eligibleCount > 0 ? 0.75 : 0.40,
    warning: pillarEntries.length === 0
      ? 'Nessun segnale pilastro rilevato: classificazione pillar non disponibile.'
      : undefined,
    source: ENGINE_SOURCE,
  });

  // ── Stage 3: Care Economy Tagging ─────────────────────────────────────────
  trace.push({
    id: 'stage_03_care_economy',
    stage: 'Stage 3 — Care Economy Tagging',
    input: `totalRecords=${totalRecords} | eligibleRecords=${eligibilitySummary.eligibleCount}`,
    output: `careSignals=${careSignalCount}`,
    ruleApplied:
      'Rilevazione segnali care economy: childcare · asilo_nido · caregiver · eldercare · ' +
      'family_support · flexible_work_for_care · access_equity. ' +
      'Solo segnali aggregati — nessuna profilazione individuale familiare. ' +
      'Modulo premium (near-term pilot): segnali informativi, non nel KORA Index v1.0.',
    confidence: 0.70,
    warning: careSignalCount === 0
      ? 'Nessun segnale care economy rilevato nel batch.'
      : undefined,
    source: ENGINE_SOURCE,
  });

  // ── Stage 4: Budget Evidence Assessment ───────────────────────────────────
  trace.push({
    id: 'stage_04_budget_evidence',
    stage: 'Stage 4 — Budget Evidence',
    input: `totalRecords=${totalRecords}`,
    output:
      `totalBudget=€${bti.totalBudget.toLocaleString('it-IT')} | ` +
      `documented=€${bti.documentedBudget.toLocaleString('it-IT')} | ` +
      `declared=€${bti.declaredBudget.toLocaleString('it-IT')} | ` +
      `estimated=€${bti.estimatedBudget.toLocaleString('it-IT')} | ` +
      `evidenceQuality=${Math.round(bti.budgetEvidenceQuality * 100)}/100`,
    ruleApplied:
      'Scala evidenza L0→L4. L0/L1 non ricevono full_weight BTI. ' +
      'Formula: (doc×0.85 + decl×0.45 + est×0.35) / totalBudget. ' +
      'Policy records (smart working etc): importo mai inventato — status=not_applicable.',
    confidence: round3(bti.budgetEvidenceQuality),
    warning: bti.totalBudget === 0
      ? 'Nessun importo budget rilevato. BTI Score = 0. Evidence Debt accumulato.'
      : undefined,
    source: ENGINE_SOURCE,
  });

  // ── Stage 5: BTI Engine ────────────────────────────────────────────────────
  trace.push({
    id: 'stage_05_bti',
    stage: 'Stage 5 — Budget-to-Human-Impact (BTI)',
    input:
      `totalBudget=€${bti.totalBudget.toLocaleString('it-IT')} | ` +
      `deepActivation=€${bti.deepActivationSpend.toLocaleString('it-IT')} | ` +
      `economicRelief=€${bti.economicReliefSpend.toLocaleString('it-IT')} | ` +
      `blockedCompliance=€${bti.blockedComplianceSpend.toLocaleString('it-IT')}`,
    output:
      `btiScore=${bti.btiScore}/100 | ` +
      `activationDebt=€${bti.activationDebt.toLocaleString('it-IT')} | ` +
      `budgetEvidenceQuality=${Math.round(bti.budgetEvidenceQuality * 100)}/100`,
    ruleApplied:
      'btiScore = deepActivationRatio×40 + evidenceQuality×25 + reliefBalance×20 + complianceClarity×15. ' +
      'reliefBalance = max(0, 1 − reliefRatio×0.60). ' +
      'activationDebt = max(0, usableBudget − deepActivation − relief×0.25). ' +
      'Macroblocco BTI = 20% KORA Index v1.0 (peso da lib/methodology-config/v0.1.ts).',
    confidence: round3(Math.min(1, bti.budgetEvidenceQuality + 0.10)),
    warning: bti.activationDebt > 0
      ? `Activation Debt: €${bti.activationDebt.toLocaleString('it-IT')} di budget non convertito in attivazione profonda.`
      : undefined,
    source: ENGINE_SOURCE,
  });

  // ── Stage 6: Reach Quality ─────────────────────────────────────────────────
  trace.push({
    id: 'stage_06_reach_quality',
    stage: 'Stage 6 — Reach Quality',
    input:
      `workforcePopulation=${workforcePopulation ?? 'unknown'} | ` +
      `eligibleRecords=${eligibilitySummary.eligibleCount}`,
    output:
      `activeWorkers=${activation.activeWorkers} | ` +
      `meaningfullyActiveWorkers=${activation.meaningfullyActiveWorkers} | ` +
      `neverActivated=${activation.neverActivatedWorkers}`,
    ruleApplied:
      'Stima reach tramite union-find identity resolution (wid/email/nome+cognome) ' +
      'o bounded_estimate con conservative factor. ' +
      'Segnali identità usati solo per conteggio — mai restituiti in output. ' +
      'Privacy invariant: zero identity leakage dal blocco di calcolo reach.',
    confidence: workforcePopulation !== null ? 0.80 : 0.40,
    warning: workforcePopulation === null
      ? 'Workforce baseline non disponibile. Reach = 0 — valore non reale, conseguenza di baseline mancante.'
      : undefined,
    source: ENGINE_SOURCE,
  });

  // ── Stage 7: Activation Engine ─────────────────────────────────────────────
  const arPct  = Math.round(activation.activationReach * 100);
  const marPct = Math.round(activation.meaningfulActivationReach * 100);
  const topConc  = Math.round(activation.concentrationTopShare * 100);
  const bot50    = Math.round(activation.bottomFiftyShare * 100);

  trace.push({
    id: 'stage_07_activation',
    stage: 'Stage 7 — Activation Engine',
    input:
      `activeWorkers=${activation.activeWorkers} | ` +
      `meaningfullyActiveWorkers=${activation.meaningfullyActiveWorkers} | ` +
      `workforcePopulation=${workforcePopulation ?? 'unknown'}`,
    output:
      `AR=${arPct}% | MAR=${marPct}% | safeguard=${activation.safeguardStatus}`,
    ruleApplied:
      `D-21 Activation Safeguard: CLEAR=(AR≥40% AND MAR≥30%), WARNING=(between), FLAGGED=(AR<20% OR MAR<15%). ` +
      `concentrationTopShare=${topConc}% | bottomFiftyShare=${bot50}%. ` +
      'CLEAR bloccato se concentrazione>60% o bottom50<15% o review_required>25%.',
    confidence: workforcePopulation !== null ? 0.85 : 0.40,
    warning: activation.safeguardStatus !== 'CLEAR'
      ? `Safeguard ${activation.safeguardStatus}: revisione attivazione raccomandata prima di comunicare i risultati.`
      : undefined,
    source: ENGINE_SOURCE,
  });

  // ── Stage 8: KORA Index Engine ─────────────────────────────────────────────
  trace.push({
    id: 'stage_08_kora_index',
    stage: 'Stage 8 — KORA Index Engine',
    input:
      `REACH_mb=${koraIndex.macroblocks.activationReach} | ` +
      `QUALITY_mb=${koraIndex.macroblocks.activationQuality} | ` +
      `EQUITY_mb=${koraIndex.macroblocks.distributionEquity} | ` +
      `BTI_mb=${koraIndex.macroblocks.budgetToHumanImpact}`,
    output:
      `KORA_Index=${koraIndex.value}/100 | ` +
      `safeguard=${activation.safeguardStatus} | ` +
      `methodologyVersion=${koraIndex.methodologyVersion} | ` +
      `calibrationStatus=${koraIndex.calibrationStatus}`,
    ruleApplied:
      `KORA Index v1.0 = REACH(${koraIndex.weights.REACH}) × REACH_mb + ` +
      `QUALITY(${koraIndex.weights.QUALITY}) × QUALITY_mb + ` +
      `EQUITY(${koraIndex.weights.EQUITY}) × EQUITY_mb + ` +
      `BTI(${koraIndex.weights.BTI}) × BTI_mb. ` +
      'Confidence Score ESTERNO — peso=0, mai aggregato nel valore (doc 21b). ' +
      'Calibrazione pre_empirical: non certificato, non per uso regolatorio.',
    confidence: round3(confidence.score / 100),
    warning:
      koraIndex.calibrationStatus === 'pre_empirical_calibration'
        ? 'KORA Index v0.1 pre_empirical_calibration — non certificato per uso regolatorio o legale.'
        : undefined,
    source: ENGINE_SOURCE,
  });

  // ── Stage 9: Confidence Score ──────────────────────────────────────────────
  trace.push({
    id: 'stage_09_confidence',
    stage: 'Stage 9 — Confidence Score',
    input:
      `budgetEvidence=${Math.round(confidence.budgetEvidenceConfidence * 100)}% | ` +
      `dataCompleteness=${Math.round(confidence.dataCompleteness * 100)}% | ` +
      `mapping=${Math.round(confidence.mappingConfidence * 100)}% | ` +
      `verification=${Math.round(confidence.verificationConfidence * 100)}% | ` +
      `review=${Math.round(confidence.reviewConfidence * 100)}%`,
    output:
      `CS=${confidence.score}/100 | externalToIndex=true`,
    ruleApplied:
      'CS = budgetEvidence×30% + dataCompleteness×25% + mapping×20% + verification×15% + review×10%. ' +
      'CS è ESTERNO al KORA Index v1.0 — mostrato sempre a fianco, mai incluso nel valore (doc 21b).',
    confidence: round3(confidence.score / 100),
    warning: confidence.score < 50
      ? `CS bassa (${confidence.score}/100): affidabilità limitata. Aumentare copertura evidenza e completezza dati.`
      : undefined,
    source: ENGINE_SOURCE,
  });

  return trace;
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

export { ENGINE_SOURCE as EXPLAINABILITY_ENGINE_VERSION };
