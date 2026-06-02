// lib/reporting/evidence-gap-engine.ts
// B19 — Evidence Gap Engine.
//
// Pure function: no DB, no LLM, no side effects.
// Input: UEF candidate signals. Output: per-area evidence gaps and readiness.
//
// INVARIANT: readiness depends on evidence quality — NOT on ESRS area strength.
// A_FAMILY_SUPPORT being 'direct/strong' in B18 does NOT imply report_ready.
// Family support, wellness light, WLB policies require concrete evidence signals.
//
// CRITICAL: This module NEVER claims CSRD/ESRS compliance.
// ReportingReadiness ≠ compliance. report_ready ≠ CSRD certified.

import type {
  EligibilityProposal,
  EvidenceLevel,
  BudgetClass,
  InitiativeDomain,
  Pillar,
} from '@/lib/ingestion/raw-to-uef-interpreter';
import type { ReportingAlignment } from './reporting-alignment';

export type ReportingReadiness =
  | 'report_ready'
  | 'usable_with_caveat'
  | 'needs_evidence'
  | 'not_ready';

export type OwnerHint = 'HR' | 'Finance' | 'ESG' | 'HSE' | 'People' | 'Unknown';

export interface EvidenceGap {
  areaCode:           string;
  areaLabel:          string;
  currentStrength:    'strong' | 'medium' | 'weak';
  readiness:          ReportingReadiness;
  existingEvidence:   string[];
  missingEvidence:    string[];
  recommendedActions: string[];
  ownerHint:          OwnerHint;
  caveat:             string;
}

export interface EvidenceGapInput {
  reportingAlignment:       ReportingAlignment | null;
  initiativeDomain:         InitiativeDomain;
  eventType:                string;
  eligibility:              EligibilityProposal;
  pillar:                   Pillar | null;
  budgetClass:              BudgetClass;
  budgetAmount:             number | null;
  sourceTier:               string | null;
  evidenceLevel:            EvidenceLevel | null;
  financialConfidence:      number;
  needsEnrichment:          boolean;
  enrichmentMissingFields:  string[];
  participants:             number | null;
  reasonCodes:              string[];
}

// ── Readiness ranking — lower = more conservative ─────────────────────────────
const READINESS_RANK: Record<ReportingReadiness, number> = {
  not_ready:          0,
  needs_evidence:     1,
  usable_with_caveat: 2,
  report_ready:       3,
};

export function worstReadiness(a: ReportingReadiness, b: ReportingReadiness): ReportingReadiness {
  return READINESS_RANK[a] <= READINESS_RANK[b] ? a : b;
}

// ── Core readiness derivation ─────────────────────────────────────────────────
// Readiness is evidence-driven, not area-strength-driven.
// Conservative by design: when in doubt, return needs_evidence.

function computeReadiness(input: EvidenceGapInput): ReportingReadiness {
  const { eventType, eligibility, evidenceLevel, budgetAmount, participants, sourceTier, reasonCodes } = input;

  // Blocked records have null reportingAlignment and never reach here,
  // but guard defensively.
  if (eligibility === 'blocked') return 'not_ready';

  // Limited (economic relief): contextual only, never deep activation
  if (eligibility === 'limited') return budgetAmount !== null ? 'usable_with_caveat' : 'needs_evidence';

  const hasL3     = evidenceLevel === 'L3';
  const hasL2plus = evidenceLevel === 'L2' || evidenceLevel === 'L3';
  const hasL1plus = evidenceLevel === 'L1' || hasL2plus;
  const hasBudget = budgetAmount !== null;
  const hasPax    = participants !== null;
  const hasSrc    = sourceTier !== null;

  switch (eventType) {
    case 'professional_training':
    case 'reskilling_program':
      if (hasL3 && hasPax && hasBudget) return 'report_ready';
      if (hasL2plus && hasPax)          return 'usable_with_caveat';
      if (hasL1plus)                    return 'needs_evidence';
      return 'needs_evidence';

    // B19 watchpoint: WLB policy alone never report_ready — needs usage data
    case 'work_life_balance_policy':
    case 'flexible_work_policy':
      if (hasL2plus && hasPax && hasBudget) return 'usable_with_caveat';
      return 'needs_evidence';

    // B19 watchpoint: wellness light conservative — gym/fitness weak without evidence
    case 'fitness_wellbeing_program':
    case 'light_wellbeing_event':
      if (hasL3 && hasPax && hasBudget) return 'usable_with_caveat';
      return 'needs_evidence';

    // B19 watchpoint: family support NOT auto report_ready (B18.1 finding)
    case 'caregiver_support':
    case 'childcare_support':
      if (hasL3 && hasPax && hasBudget && hasSrc) return 'report_ready';
      if (hasL2plus && (hasPax || hasBudget))      return 'usable_with_caveat';
      return 'needs_evidence';

    // Insurance: contextual, not health outcome — never report_ready without coverage data
    case 'health_insurance_support':
      if (hasL2plus && hasBudget) return 'usable_with_caveat';
      return 'needs_evidence';

    // Pension: contextual, needs contribution + coverage
    case 'pension_future_support':
      if (hasL2plus && hasBudget) return 'usable_with_caveat';
      return 'needs_evidence';

    // D&I: generic one-off workshop not strong (ambiguous flag from B18)
    case 'inclusion_program': {
      const isGeneric = reasonCodes.includes('taxonomy:inclusion_equity:generic_event');
      if (isGeneric)           return 'needs_evidence';
      if (hasL2plus && hasPax) return 'usable_with_caveat';
      return 'needs_evidence';
    }

    case 'volunteering':
      if (hasL3 && hasPax)                       return 'report_ready';
      if (hasL2plus || (hasL1plus && hasPax))    return 'usable_with_caveat';
      return 'needs_evidence';

    case 'mental_health_support':
    case 'health_wellness_program':
      if (hasL2plus && hasPax && hasBudget) return 'usable_with_caveat';
      return 'needs_evidence';

    case 'economic_relief':
      return hasBudget ? 'usable_with_caveat' : 'needs_evidence';

    default:
      if (hasL2plus && hasPax && hasBudget) return 'usable_with_caveat';
      return 'needs_evidence';
  }
}

// ── Existing evidence summary ─────────────────────────────────────────────────
function deriveExistingEvidence(input: EvidenceGapInput): string[] {
  const { evidenceLevel, sourceTier, budgetAmount, participants } = input;
  const existing: string[] = [];

  if (evidenceLevel && evidenceLevel !== 'L0') {
    const suffix =
      evidenceLevel === 'L3' ? ' (provider / terze parti)' :
      evidenceLevel === 'L2' ? ' (documento interno)' :
                               ' (auto-dichiarato)';
    existing.push(`Livello evidenza ${evidenceLevel}${suffix}`);
  }
  if (sourceTier)           existing.push(`Fonte: ${sourceTier}`);
  if (budgetAmount !== null) existing.push(`Budget: ${budgetAmount.toLocaleString('it-IT')} EUR (rilevato)`);
  if (participants !== null) existing.push(`Partecipanti: ${participants} (rilevati)`);

  return existing;
}

// ── Missing evidence per event type ──────────────────────────────────────────
function deriveMissingEvidence(input: EvidenceGapInput): string[] {
  const { eventType, evidenceLevel, budgetAmount, participants } = input;

  const hasL2plus = evidenceLevel === 'L2' || evidenceLevel === 'L3';
  const hasBudget = budgetAmount !== null;
  const hasPax    = participants !== null;
  const missing: string[] = [];

  switch (eventType) {
    case 'professional_training':
    case 'reskilling_program':
      if (!hasPax)    missing.push('Numero partecipanti / completion count');
      if (!hasBudget) missing.push('Budget iniziativa (importo)');
      if (!hasL2plus) missing.push('Export LMS o provider (L2/L3) — auto-dichiarazione insufficiente');
      missing.push('Ore formazione totali per partecipante');
      missing.push('Categoria skill (tecnica / trasversale / digitale)');
      if (evidenceLevel !== 'L3') missing.push('Completion rate e learning outcomes');
      break;

    case 'work_life_balance_policy':
    case 'flexible_work_policy':
      missing.push('Tasso di utilizzo / uptake rate (aggregato)');
      missing.push('Coverage: popolazione elegibile vs utilizzatori');
      if (!hasPax)    missing.push('Numero lavoratori che hanno usufruito della policy');
      if (!hasL2plus) missing.push('Documento policy con data implementazione (L2)');
      missing.push('Periodo di osservazione uptake');
      break;

    case 'fitness_wellbeing_program':
    case 'light_wellbeing_event':
      if (!hasPax)    missing.push('Partecipazione / attendance data (aggregata)');
      if (!hasBudget) missing.push('Spesa (convenzione / abbonamento / budget)');
      if (!hasL2plus) missing.push('Export fornitore o report strutturato (L2/L3)');
      missing.push('Periodo utilizzo e provider aziendale');
      break;

    case 'caregiver_support':
    case 'childcare_support':
      if (!hasPax)    missing.push('Numero beneficiari aggregato (N≥10)');
      if (!hasBudget) missing.push('Spesa / costo del servizio (importo)');
      if (!hasL2plus) missing.push('Contratto fornitore o export provider (L2/L3)');
      missing.push('Coverage: elegibili vs utilizzatori');
      missing.push('Periodo di erogazione del servizio');
      if (evidenceLevel !== 'L3') missing.push('Export provider per strong alignment (L3)');
      break;

    case 'health_insurance_support':
      if (!hasPax)    missing.push('Dipendenti coperti (aggregato)');
      if (!hasBudget) missing.push('Contributo datore di lavoro (importo)');
      if (!hasL2plus) missing.push('Documento polizza o report assicurativo (L2/L3)');
      missing.push('Popolazione elegibile vs coperti');
      missing.push('Piano di copertura / tipologia polizza');
      break;

    case 'pension_future_support':
      if (!hasPax)    missing.push('Dipendenti aderenti (aggregato)');
      if (!hasBudget) missing.push('Contributo datore al fondo (importo)');
      if (!hasL2plus) missing.push('Documento fondo pensione / rendiconto (L2/L3)');
      missing.push('Tasso di adesione aggregato');
      missing.push('Popolazione elegibile al fondo');
      break;

    case 'inclusion_program':
      if (!hasPax)    missing.push('Numero partecipanti aggregato');
      if (!hasBudget) missing.push('Budget iniziativa');
      if (!hasL2plus) missing.push('Report strutturato / documento programma (L2/L3)');
      missing.push('Obiettivi misurabili del programma D&I');
      missing.push('Azioni di follow-up e outcome metrics');
      break;

    case 'volunteering':
      if (!hasPax)    missing.push('Ore totali e numero partecipanti aggregati');
      if (!hasBudget) missing.push('Budget / valorizzazione ore (se applicabile)');
      if (!hasL2plus) missing.push('Documentazione partner / ONG (L3 raccomandato)');
      missing.push("Beneficiari dell'iniziativa (aggregato territoriale)");
      break;

    case 'mental_health_support':
    case 'health_wellness_program':
      if (!hasPax)    missing.push('Partecipanti al programma (aggregato, N≥10)');
      if (!hasBudget) missing.push('Budget programma');
      if (!hasL2plus) missing.push('Report strutturato / export provider (L2/L3)');
      missing.push('Descrizione programma — solo livello aggregato, no dati individuali');
      break;

    case 'economic_relief':
      if (!hasBudget) missing.push('Valore totale benefit erogato');
      missing.push('Popolazione beneficiaria (aggregato)');
      missing.push('Tipologia benefit (buoni pasto, voucher, ecc.)');
      missing.push('Fonte spesa (payroll / welfare provider)');
      break;

    default:
      if (!hasPax)    missing.push('Numero partecipanti');
      if (!hasBudget) missing.push('Budget iniziativa');
      if (!hasL2plus) missing.push('Documentazione fonte (L2/L3)');
  }

  return missing;
}

// ── Recommended actions ───────────────────────────────────────────────────────
function deriveRecommendedActions(input: EvidenceGapInput, readiness: ReportingReadiness): string[] {
  const { eventType } = input;

  if (readiness === 'report_ready') {
    return ['Verificare completezza documentazione prima di includere in reporting ESG/CSR'];
  }

  switch (eventType) {
    case 'professional_training':
    case 'reskilling_program':
      return [
        'Richiedere export LMS o piattaforma formazione (L3)',
        'Raccogliere ore totali e completion rate per categoria skill',
        'Archiviare documentazione fornitore per verifica esterna',
      ];

    case 'work_life_balance_policy':
    case 'flexible_work_policy':
      return [
        'Raccogliere dati utilizzo / uptake della policy (aggregato, N≥10)',
        'Documentare policy aziendale con data di implementazione',
        'Misurare coverage: lavoratori che hanno usufruito vs elegibili',
      ];

    case 'fitness_wellbeing_program':
    case 'light_wellbeing_event':
      return [
        'Raccogliere dati partecipazione (attendance aggregata)',
        'Richiedere export o ricevuta fornitore / convenzione palestra',
        'Documentare budget speso nel periodo',
      ];

    case 'caregiver_support':
    case 'childcare_support':
      return [
        'Richiedere documentazione fornitore (provider contract o export)',
        'Raccogliere numero beneficiari aggregato (N≥10)',
        'Documentare spesa / costo del servizio con fonte',
        'Registrare coverage: elegibili vs utilizzatori',
      ];

    case 'health_insurance_support':
      return [
        'Raccogliere dati coverage (dipendenti coperti aggregati)',
        'Documentare contributo datore di lavoro',
        'Archiviare polizza o documento assicurativo (L2/L3)',
      ];

    case 'pension_future_support':
      return [
        'Raccogliere tasso di adesione aggregato',
        'Documentare contributo datore al fondo',
        'Archiviare documento fondo pensione o rendiconto (L2/L3)',
      ];

    case 'inclusion_program':
      return [
        'Raccogliere dati partecipazione (N≥10, aggregati)',
        'Documentare struttura programma e obiettivi misurabili',
        'Raccogliere azioni di follow-up e outcome metrics',
      ];

    case 'volunteering':
      return [
        'Raccogliere documentazione partner / ONG (L3 raccomandato)',
        'Registrare ore totali e numero partecipanti aggregati',
        'Documentare impatto territoriale o beneficiari',
      ];

    case 'mental_health_support':
    case 'health_wellness_program':
      return [
        'Raccogliere dati partecipazione a livello programma (N≥10)',
        'Documentare struttura programma e provider',
        'Non raccogliere dati individuali — solo aggregati programma',
      ];

    case 'economic_relief':
      return [
        'Documentare valore totale erogato con fonte (payroll / welfare)',
        'Raccogliere popolazione beneficiaria aggregata',
      ];

    default:
      return ['Raccogliere dati partecipazione, budget e fonte documentale (L2/L3)'];
  }
}

// ── Owner hint ────────────────────────────────────────────────────────────────
function deriveOwnerHint(eventType: string, eligibility: EligibilityProposal): OwnerHint {
  if (eligibility === 'blocked') return 'HSE';
  switch (eventType) {
    case 'professional_training':
    case 'reskilling_program':
    case 'mentoring_program':
    case 'knowledge_transfer':
      return 'HR';
    case 'volunteering':
      return 'ESG';
    case 'health_insurance_support':
    case 'pension_future_support':
    case 'economic_relief':
      return 'Finance';
    case 'inclusion_program':
      return 'ESG';
    case 'work_life_balance_policy':
    case 'flexible_work_policy':
    case 'caregiver_support':
    case 'childcare_support':
    case 'mental_health_support':
    case 'health_wellness_program':
    case 'fitness_wellbeing_program':
    case 'light_wellbeing_event':
      return 'People';
    default:
      return 'HR';
  }
}

// ── Area / event-type specific caveat ─────────────────────────────────────────
function deriveCaveat(eventType: string, readiness: ReportingReadiness): string {
  if (['caregiver_support', 'childcare_support'].includes(eventType) && readiness !== 'report_ready') {
    return 'Strong alignment possibile con provider export, dati beneficiari, budget documentato e coverage aggregata (N≥10).';
  }
  if (['fitness_wellbeing_program', 'light_wellbeing_event'].includes(eventType)) {
    return 'Weak contextual alignment. Strutturare programma con attendance data e provider documentation per rafforzare evidenza.';
  }
  if (['work_life_balance_policy', 'flexible_work_policy'].includes(eventType)) {
    return 'Esistenza della policy non è sufficiente. Uptake e utilization data richiesti per meaningful alignment.';
  }
  return 'KORA identifica i gap di evidenza per supportare la rendicontazione. Non costituisce assurance, certificazione o compliance CSRD/ESRS.';
}

// ── Public API ────────────────────────────────────────────────────────────────

export function deriveEvidenceGaps(input: EvidenceGapInput): EvidenceGap[] {
  if (!input.reportingAlignment || input.reportingAlignment.areas.length === 0) return [];
  // Blocked records: reportingAlignment is always null from B18, guard defensively
  if (input.eligibility === 'blocked') return [];

  const readiness   = computeReadiness(input);
  const existing    = deriveExistingEvidence(input);
  const missing     = deriveMissingEvidence(input);
  const actions     = deriveRecommendedActions(input, readiness);
  const ownerHint   = deriveOwnerHint(input.eventType, input.eligibility);
  const caveat      = deriveCaveat(input.eventType, readiness);

  return input.reportingAlignment.areas.map(area => ({
    areaCode:           area.code,
    areaLabel:          area.label,
    currentStrength:    area.strength,
    readiness,
    existingEvidence:   existing,
    missingEvidence:    missing,
    recommendedActions: actions,
    ownerHint,
    caveat,
  }));
}
