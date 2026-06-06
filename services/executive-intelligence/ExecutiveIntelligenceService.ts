// services/executive-intelligence/ExecutiveIntelligenceService.ts
//
// Executive Intelligence Layer™ — B77-B
// Synthesis layer above all KORA signals.
// Answers four questions in plain Italian for any executive role:
//   1. Come stiamo?      → organizationStatus
//   2. Perché?           → primaryConstraint
//   3. Cosa stiamo sprecando?  → wasteSignal (executive language — no "waste" word)
//   4. Cosa fare?        → primaryAction
//
// Rule-based only. No LLM. No DB. No formula changes. No new scores.
// This is a SYNTHESIS layer — it reads already-computed signals.
// notKoraIndexComponent: true — this does NOT feed KORA Index computation.

import type { SafeguardStatus, MacroblockScore } from '@/lib/types';
import type { EquityAccessSummary } from '@/services/equity-access/EquityAccessIntelligenceService';
import type { EvidenceReliabilitySummary } from '@/services/evidence-reliability/EvidenceReliabilityIntelligenceService';
import type { LifeDiversitySummary } from '@/services/life-diversity/LifeDiversityService';

// ── Output types ──────────────────────────────────────────────────────────────

export type OrganizationStatusLabel =
  | 'Attivazione fragile'
  | 'Attivazione concentrata'
  | 'Attivazione in sviluppo'
  | 'Attivazione moderata'
  | 'Attivazione solida'
  | 'Attivazione diffusa e sostenibile';

export interface ExecutiveIntelligenceSummary {
  organizationStatus: OrganizationStatusLabel;
  executiveSummary:   string;   // 2-3 Italian sentences — plain language, no formulas
  primaryConstraint:  string;   // 1 sentence — the dominant limiting factor
  wasteSignal:        string;   // executive language — no "waste" word; derived from metrics
  primaryAction:      string;   // single most important action — not a checklist
  confidenceNote:     string;   // data reliability context
  methodologyStatus:  'pre_empirical_calibration';
  notKoraIndexComponent: true;
}

// ── Input contract ────────────────────────────────────────────────────────────

export interface ExecutiveIntelligenceInputs {
  koraIndexValue:             number;           // 0–100
  safeguardStatus:            SafeguardStatus;
  confidenceScore:            number;           // 0–1
  activationRate:             number;           // 0–1
  meaningfulActivationRate:   number;           // 0–1
  macroblocks:                MacroblockScore[];
  // Intelligence layer outputs — may be null (e.g. live session with partial data)
  equityAccess:               EquityAccessSummary | null;
  evidenceReliability:        EvidenceReliabilitySummary | null;
  lifeDiversity:              LifeDiversitySummary | null;
  // Eligibility / budget signals
  limitedShare:               number | null;    // limited / total (0–1), null = not computed
  economicReliefShare:        number | null;    // from BTI record (0–1), null = not available
}

// ── Organization status ───────────────────────────────────────────────────────

function classifyOrganizationStatus(inputs: ExecutiveIntelligenceInputs): OrganizationStatusLabel {
  const { safeguardStatus, koraIndexValue, equityAccess, evidenceReliability } = inputs;

  if (safeguardStatus === 'FLAGGED') return 'Attivazione fragile';

  if (safeguardStatus === 'WARNING') {
    if (equityAccess?.accessRiskLevel === 'alta') return 'Attivazione concentrata';
    return 'Attivazione in sviluppo';
  }

  // CLEAR
  if (equityAccess?.accessRiskLevel === 'alta') return 'Attivazione concentrata';
  if (koraIndexValue >= 70 && evidenceReliability?.evidenceRiskLevel !== 'alta') return 'Attivazione diffusa e sostenibile';
  if (koraIndexValue >= 55) return 'Attivazione solida';
  return 'Attivazione moderata';
}

// ── Primary constraint ─────────────────────────────────────────────────────────
// Returns the single most important plain-language limiting factor.

function derivePrimaryConstraint(inputs: ExecutiveIntelligenceInputs): string {
  const { safeguardStatus, activationRate, equityAccess, evidenceReliability, limitedShare, lifeDiversity, macroblocks } = inputs;

  if (safeguardStatus === 'FLAGGED') {
    return `Base di attivazione insufficiente: solo il ${Math.round(activationRate * 100)}% della workforce ha registrato almeno un'iniziativa nel periodo — sotto la soglia minima operativa.`;
  }

  if (equityAccess?.accessRiskLevel === 'alta') {
    const underCount = equityAccess.underActivatedSegments.length;
    const gap = Math.round(equityAccess.largestGap * 100);
    return `L'attivazione è concentrata in alcuni segmenti: ${underCount} ${underCount === 1 ? 'gruppo è sotto-attivato' : 'gruppi sono sotto-attivati'} con un gap massimo di ${gap} punti percentuali rispetto alla media aziendale.`;
  }

  if (evidenceReliability?.evidenceRiskLevel === 'alta') {
    const weak = Math.round((evidenceReliability.evidenceLevelDistribution.weakShare) * 100);
    return `Le evidenze disponibili non sono sufficientemente verificate: il ${weak}% delle iniziative è classificato come autodichiarato — il Confidence Score™ è penalizzato.`;
  }

  if (limitedShare !== null && limitedShare > 0.35) {
    return `Il ${Math.round(limitedShare * 100)}% delle iniziative rilevate è classificato come benefit economico — non contribuisce all'attivazione misurata dal KORA Index™.`;
  }

  if (lifeDiversity?.concentrationStatus === 'single_category_dominant' || lifeDiversity?.concentrationStatus === 'highly_concentrated') {
    return `Il portfolio LIFE è concentrato in una o poche subcategorie — la copertura della popolazione è limitata e il programma non raggiunge profili di bisogno diversi.`;
  }

  const qualityMb = macroblocks.find((m) => m.code === 'QUALITY');
  if (qualityMb && qualityMb.score < 50) {
    return `La qualità dell'attivazione è contenuta (QUALITY score: ${Math.round(qualityMb.score)}/100): le iniziative non generano ancora continuità o profondità sufficiente.`;
  }

  return `Il programma è operativo. Il margine di miglioramento principale è la distribuzione e la continuità dell'attivazione nel tempo.`;
}

// ── Waste signal ──────────────────────────────────────────────────────────────
// Executive language — NO "waste" word. Derived from existing metrics only.

function deriveWasteSignal(inputs: ExecutiveIntelligenceInputs): string {
  const { economicReliefShare, limitedShare, evidenceReliability, equityAccess } = inputs;

  // BTI economic relief share (strongest signal — financial framing)
  if (economicReliefShare !== null && economicReliefShare > 0.30) {
    return `Il ${Math.round(economicReliefShare * 100)}% del budget people è associato a iniziative classificate come benefit economico — senza produzione di Impact Unit verificate.`;
  }

  // Eligibility limited share (initiative-count framing)
  if (limitedShare !== null && limitedShare > 0.25) {
    return `Il ${Math.round(limitedShare * 100)}% delle iniziative rilevate è classificato come benefit economico (0 IU generati): la quota di attivazione profonda è inferiore al potenziale del programma.`;
  }

  // Evidence weak share
  const weakShare = evidenceReliability?.evidenceLevelDistribution.weakShare;
  if (weakShare !== undefined && weakShare > 0.40) {
    return `Il ${Math.round(weakShare * 100)}% delle iniziative non produce evidenze sufficientemente verificate — il contributo al KORA Index™ è penalizzato dalla scarsa documentazione.`;
  }

  // Equity gap (opportunity framing)
  if (equityAccess && equityAccess.largestGap > 0.30) {
    const gap = Math.round(equityAccess.largestGap * 100);
    return `La differenza di attivazione tra il segmento più attivato e quello meno attivato è di ${gap} punti percentuali — segnale di distribuzione non uniforme del programma.`;
  }

  return `Nessun segnale critico di concentrazione o inefficienza rilevato in questo periodo. Il programma mostra una struttura delle iniziative coerente con gli obiettivi di attivazione.`;
}

// ── Primary action ────────────────────────────────────────────────────────────
// Single most important next step. Not a checklist.

function derivePrimaryAction(inputs: ExecutiveIntelligenceInputs): string {
  const { safeguardStatus, confidenceScore, equityAccess, evidenceReliability, limitedShare, economicReliefShare, lifeDiversity } = inputs;

  if (safeguardStatus === 'FLAGGED') {
    return `Avviare iniziative a bassa soglia di partecipazione — formazione breve, webinar, programmi aperti a tutti — per ampliare la base attivata prima del prossimo scoring.`;
  }

  if (evidenceReliability?.evidenceRiskLevel === 'alta') {
    return `Richiedere ai fornitori principali documentazione verificata (L2/L3): report di partecipazione, attestati di completamento, output misurabili. Priorità alle iniziative LIFE e GROWTH ad alto volume.`;
  }

  const highLimited = (limitedShare !== null && limitedShare > 0.40) || (economicReliefShare !== null && economicReliefShare > 0.45);
  if (highLimited) {
    return `Valutare la conversione di almeno il 15% dei benefit monetari in programmi di attivazione profonda (formazione volontaria, supporto psicologico, volontariato) per aumentare la quota eligible.`;
  }

  if (equityAccess?.accessRiskLevel === 'alta') {
    const segments = equityAccess.underActivatedSegments.slice(0, 2).map((s) => s.segmentLabel).join(', ');
    return `Progettare un programma inclusivo rivolto ai segmenti con attivazione inferiore alla media${segments ? ': ' + segments : ''} — l'obiettivo è ridurre il gap di distribuzione.`;
  }

  if (confidenceScore < 0.55) {
    return `Completare il data intake per i fornitori principali e aumentare la copertura di evidenze verificate — il Confidence Score™ attuale limita l'interpretabilità del KORA Index™.`;
  }

  if (lifeDiversity?.concentrationStatus === 'single_category_dominant' || lifeDiversity?.concentrationStatus === 'highly_concentrated') {
    return `Diversificare il portfolio LIFE includendo almeno un programma di caregiving, supporto psicologico o prevenzione sanitaria — per ampliare la copertura della popolazione target.`;
  }

  return `Mantenere il programma attuale e aumentare il tasso di verifica delle evidenze per il prossimo periodo — obiettivo: portare il Verification Rate sopra il 65%.`;
}

// ── Confidence note ───────────────────────────────────────────────────────────

function deriveConfidenceNote(confidenceScore: number): string {
  if (confidenceScore >= 0.75) {
    return `Data Reliability Index™ elevato (${Math.round(confidenceScore * 100)}%) — le conclusioni supportano decisioni operative con buona affidabilità.`;
  }
  if (confidenceScore >= 0.55) {
    return `Data Reliability Index™ nella norma (${Math.round(confidenceScore * 100)}%) — le conclusioni sono interpretabili con le cautele metodologiche indicate.`;
  }
  return `Data Reliability Index™ basso (${Math.round(confidenceScore * 100)}%) — le conclusioni richiedono verifica aggiuntiva prima di decisioni strategiche.`;
}

// ── Executive summary ─────────────────────────────────────────────────────────
// 2-3 Italian sentences. Plain language. No formulas.

function buildExecutiveSummary(
  organizationStatus: OrganizationStatusLabel,
  primaryConstraint: string,
  primaryAction: string,
  koraIndexValue: number,
  safeguardStatus: SafeguardStatus,
): string {
  const kiDisplay = Math.round(koraIndexValue);
  const sfNote = safeguardStatus === 'FLAGGED'
    ? 'Il KORA Index™ richiede revisione prima di qualsiasi uso decisionale.'
    : safeguardStatus === 'WARNING'
    ? 'Il KORA Index™ è disponibile ma richiede attenzione operativa.'
    : 'Il KORA Index™ è interpretabile con le cautele metodologiche indicate.';

  // Strip trailing period from primaryConstraint for embedding
  const constraint = primaryConstraint.replace(/\.$/, '');

  // Action as a forward-looking fragment
  const actionHint = primaryAction.split('—')[0].replace(/\.$/, '').trim();

  return `Lo stato attuale è "${organizationStatus}" (KORA Index™: ${kiDisplay}/100). ${sfNote} ${constraint}. Azione prioritaria: ${actionHint.charAt(0).toLowerCase()}${actionHint.slice(1)}.`;
}

// ── Main entry point ──────────────────────────────────────────────────────────

export function computeExecutiveIntelligence(inputs: ExecutiveIntelligenceInputs): ExecutiveIntelligenceSummary {
  const organizationStatus = classifyOrganizationStatus(inputs);
  const primaryConstraint  = derivePrimaryConstraint(inputs);
  const wasteSignal        = deriveWasteSignal(inputs);
  const primaryAction      = derivePrimaryAction(inputs);
  const confidenceNote     = deriveConfidenceNote(inputs.confidenceScore);
  const executiveSummary   = buildExecutiveSummary(
    organizationStatus,
    primaryConstraint,
    primaryAction,
    inputs.koraIndexValue,
    inputs.safeguardStatus,
  );

  return {
    organizationStatus,
    executiveSummary,
    primaryConstraint,
    wasteSignal,
    primaryAction,
    confidenceNote,
    methodologyStatus:      'pre_empirical_calibration',
    notKoraIndexComponent:  true,
  };
}
