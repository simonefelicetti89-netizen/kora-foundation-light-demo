// lib/live/live-recommendations.ts
// Rule-based recommendations for live company sessions.
//
// Generated entirely from persisted scoring outputs — no AI, no causal claims,
// no quantitative prediction of future KORA Index changes.
// Output shape is compatible with RecommendationsPanel (BudgetToHumanImpactRecommendation).
//
// Does NOT modify: KORA Index, IU formula, any scoring output, any DB record.

import type { BudgetToHumanImpactRecommendation } from '@/lib/types';
import type { EquityAccessSummary } from '@/services/equity-access/EquityAccessIntelligenceService';
import type { EvidenceReliabilitySummary } from '@/services/evidence-reliability/EvidenceReliabilityIntelligenceService';
import type { ConcentrationStatus } from '@/services/life-diversity/LifeDiversityService';

// LiveRecommendation is compatible with BudgetToHumanImpactRecommendation
// so it can be passed directly to RecommendationsPanel.
export type LiveRecommendation = BudgetToHumanImpactRecommendation;

export interface LiveRecommendationInputs {
  safeguardStatus: string;
  arValue: number;
  marValue: number;
  vrValue: number;
  eqValue: number;
  confidenceScore: number;
  confidenceGaps: string[];
  eligibleCount: number;
  limitedCount: number;
  totalUef: number;
  equityAccess: EquityAccessSummary | null;
  evidenceReliability: EvidenceReliabilitySummary | null;
  lifeConcentrationStatus: ConcentrationStatus | null;
}

export function generateLiveRecommendations(inputs: LiveRecommendationInputs): LiveRecommendation[] {
  const {
    safeguardStatus, arValue, marValue, vrValue, eqValue,
    confidenceScore, confidenceGaps,
    eligibleCount, limitedCount, totalUef,
    equityAccess, evidenceReliability, lifeConcentrationStatus,
  } = inputs;

  const recs: LiveRecommendation[] = [];

  // 1. Safeguard FLAGGED — activation reach critical
  if (safeguardStatus === 'FLAGGED') {
    recs.push({
      priority: 'alta',
      action_it: 'Ampliare la partecipazione prima di interpretare il KORA Index come stabile.',
      expected_signal_it: `Activation Rate (AR = ${Math.round(arValue * 100)}%) e Meaningful Activation Rate (MAR = ${Math.round(marValue * 100)}%) sono sotto le soglie minime. Il KORA Index riflette un programma in fase iniziale.`,
      target_macroblock: 'REACH',
    });
  }

  // 2. Safeguard WARNING — activation attention needed
  if (safeguardStatus === 'WARNING') {
    recs.push({
      priority: 'alta',
      action_it: 'Aumentare il tasso di attivazione significativa (MAR) nei prossimi 60 giorni.',
      expected_signal_it: `MAR = ${Math.round(marValue * 100)}% — vicino alla soglia di attenzione. Programmi con soglia di partecipazione bassa possono ampliare la copertura prima del prossimo scoring.`,
      target_macroblock: 'REACH',
    });
  }

  // 3. High limited share — economic relief dominance
  if (totalUef > 0 && limitedCount > 0) {
    const limitedShare = limitedCount / totalUef;
    if (limitedShare > 0.40) {
      recs.push({
        priority: 'alta',
        action_it: 'Ridurre la dipendenza da benefit monetari e aumentare le iniziative eligible.',
        expected_signal_it: `${Math.round(limitedShare * 100)}% dei record UEF è classificato come "limited" (economic relief, 0 IU). Convertire una quota di benefit monetari in programmi eligible può migliorare il KORA Index.`,
        target_macroblock: 'BTI',
      });
    } else if (limitedShare > 0.25) {
      recs.push({
        priority: 'media',
        action_it: 'Valutare il mix di iniziative per aumentare la quota eligible rispetto ai benefit monetari.',
        expected_signal_it: `${Math.round(limitedShare * 100)}% dei record è limited (0 IU). Sostituire anche il 10% con iniziative eligible ha impatto diretto sul BTI macroblock.`,
        target_macroblock: 'BTI',
      });
    }
  }

  // 4. Evidence reliability weak
  if (evidenceReliability?.evidenceRiskLevel === 'alta') {
    recs.push({
      priority: 'alta',
      action_it: 'Rafforzare le evidenze L2/L3 prima del prossimo scoring.',
      expected_signal_it: 'Data Reliability Index™ sotto soglia — il Verification Rate (VR) e la qualità complessiva del dato sono penalizzati. Raccogliere report di partecipazione dai fornitori welfare (upgrade L1→L2 o L2→L3).',
      target_macroblock: 'QUALITY',
    });
  } else if (vrValue < 0.55) {
    recs.push({
      priority: 'media',
      action_it: 'Aumentare la copertura di evidenze verificate per i programmi attivi.',
      expected_signal_it: `Verification Rate (VR) = ${Math.round(vrValue * 100)}%. Richiedere documentazione ai fornitori può migliorare VR e Confidence Score senza modificare il programma.`,
      target_macroblock: 'QUALITY',
    });
  }

  // 5. Equity — access risk
  if (equityAccess?.accessRiskLevel === 'alta') {
    const underSegs = equityAccess.underActivatedSegments.map((s) => s.segmentLabel).slice(0, 2).join(', ');
    recs.push({
      priority: 'alta',
      action_it: `Pianificare iniziative mirate ai segmenti sotto-attivati${underSegs ? ': ' + underSegs : ''}.`,
      expected_signal_it: `EQ = ${Math.round(eqValue * 100)}% — distribuzione non uniforme rilevata. Programmi con accesso allargato ai segmenti sotto-rappresentati possono migliorare EQ e il macroblock Distribution & Equity.`,
      target_macroblock: 'EQUITY',
    });
  } else if (eqValue < 0.40) {
    recs.push({
      priority: 'media',
      action_it: 'Verificare la distribuzione dell\'accesso ai programmi tra reparti e fasce di seniority.',
      expected_signal_it: `EQ = ${Math.round(eqValue * 100)}% — possibile concentrazione in segmenti già ad alta partecipazione. Analisi Equity & Access raccomandata.`,
      target_macroblock: 'EQUITY',
    });
  }

  // 6. LIFE diversity concentration
  if (lifeConcentrationStatus === 'single_category_dominant' || lifeConcentrationStatus === 'highly_concentrated') {
    recs.push({
      priority: 'media',
      action_it: 'Diversificare il portfolio LIFE per ampliare la copertura su popolazioni diverse.',
      expected_signal_it: 'Il portfolio LIFE è concentrato in una o poche subcategorie. Aggiungere iniziative per caregiving, supporto psicologico o prevenzione sanitaria può aumentare la profondità e la distribuzione dell\'attivazione LIFE.',
      target_macroblock: 'QUALITY',
    });
  }

  // 7. Confidence score low — data gaps
  if (confidenceScore < 0.60) {
    recs.push({
      priority: 'media',
      action_it: 'Completare le fonti dati mancanti identificate nel Data Reliability Index™.',
      expected_signal_it: `Data Reliability Index™ = ${Math.round(confidenceScore * 100)}%${confidenceGaps.length > 0 ? ' — gap: ' + confidenceGaps.slice(0, 2).join(', ') : ''}. Aumentare la completezza dei dati rafforza l'interpretabilità del KORA Index e il Confidence Score.`,
    });
  }

  // 8. Low eligible count — no initiatives registered
  if (totalUef > 0 && eligibleCount === 0) {
    recs.push({
      priority: 'alta',
      action_it: 'Nessun record eligible rilevato — verificare la classificazione delle iniziative caricate.',
      expected_signal_it: 'Tutti i record UEF sono classificati come limited o blocked. Verificare che le iniziative welfare includano almeno alcuni programmi di attivazione profonda (formazione volontaria, supporto psicologico, volontariato, ecc.).',
      target_macroblock: 'REACH',
    });
  }

  return recs.slice(0, 5);
}
