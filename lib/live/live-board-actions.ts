// lib/live/live-board-actions.ts
// Rule-based executive board actions for live company sessions.
//
// Generated from persisted scoring outputs — no AI, no causal claims,
// no quantitative prediction of future KORA Index changes.
// Each action is a concrete, verifiable organizational decision.
//
// Does NOT modify: KORA Index, IU formula, any scoring output, any DB record.

import type { MacroblockScore } from '@/lib/types';
import type { EquityAccessSummary } from '@/services/equity-access/EquityAccessIntelligenceService';
import type { EvidenceReliabilitySummary } from '@/services/evidence-reliability/EvidenceReliabilityIntelligenceService';

export interface LiveBoardAction {
  priority: number;
  action: string;
  detail: string;
}

export interface LiveBoardActionInputs {
  macroblocks: MacroblockScore[];
  safeguardStatus: string;
  confidenceScore: number;
  equityAccess: EquityAccessSummary | null;
  evidenceReliability: EvidenceReliabilitySummary | null;
}

const MACROBLOCK_LABELS: Record<string, string> = {
  REACH:  'Activation Reach',
  QUALITY: 'Activation Quality',
  EQUITY:  'Distribution & Equity',
  BTI:     'Budget-to-Human-Impact',
};

export function generateLiveBoardActions(inputs: LiveBoardActionInputs): LiveBoardAction[] {
  const { macroblocks, safeguardStatus, confidenceScore, equityAccess, evidenceReliability } = inputs;

  const actions: LiveBoardAction[] = [];

  // Sort to find weakest macroblock
  const sorted   = [...macroblocks].sort((a, b) => a.score - b.score);
  const weakest  = sorted[0];
  const strongest = sorted[sorted.length - 1];

  // Action 1: Weakest macroblock — always generated
  if (weakest) {
    const name     = MACROBLOCK_LABELS[weakest.code] ?? weakest.code;
    const bestName = MACROBLOCK_LABELS[strongest.code] ?? strongest.code;
    const isLow    = weakest.score < 50;
    actions.push({
      priority: 1,
      action:   `Rafforzare ${name}`,
      detail: isLow
        ? `${name} è il macroblocco critico (${Math.round(weakest.score)}/100, peso ${Math.round(weakest.weight * 100)}%). Il margine di miglioramento è significativo — azioni mirate su questo macroblocco hanno il maggiore impatto diretto sul KORA Index. ${bestName} (${Math.round(strongest.score)}/100) è il punto di forza su cui costruire.`
        : `${name} (${Math.round(weakest.score)}/100, peso ${Math.round(weakest.weight * 100)}%) ha il punteggio più basso. Il gap rispetto a ${bestName} (${Math.round(strongest.score)}/100) è il principale vettore di crescita del KORA Index nel prossimo ciclo.`,
    });
  }

  // Action 2: Activation reach / continuity
  if (safeguardStatus === 'FLAGGED') {
    const underSeg = equityAccess?.underActivatedSegments?.[0];
    actions.push({
      priority: 2,
      action:   'Priorità immediata: ampliare la copertura di attivazione',
      detail: `Activation Safeguard: FLAGGED. La quota di forza lavoro attivata è sotto la soglia minima. Revisione del portfolio programmi raccomandata — focus su iniziative ad accesso ampio e bassa barriera di partecipazione.${underSeg ? ` Segmento prioritario: ${underSeg.segmentLabel} (tasso attivazione ${Math.round(underSeg.activationRate * 100)}%).` : ''}`,
    });
  } else if (safeguardStatus === 'WARNING') {
    actions.push({
      priority: 2,
      action:   'Aumentare la partecipazione significativa prima del prossimo scoring',
      detail: 'Activation Safeguard: WARNING. Il programma è vicino alle soglie minime. Interventi nelle prossime 8 settimane (nuove iniziative, comunicazione interna, riattivazione di segmenti dormienti) possono portare il safeguard a CLEAR nel prossimo ciclo.',
    });
  } else {
    actions.push({
      priority: 2,
      action:   'Consolidare la continuità dell\'attivazione nel prossimo periodo',
      detail: 'Activation Safeguard: CLEAR. Le soglie minime sono soddisfatte. Priorità: mantenere la continuità (CO) e aumentare la profondità dell\'attivazione significativa (MAR) per rafforzare il macroblock Activation Quality.',
    });
  }

  // Action 3: Evidence quality OR equity issue — whichever is more critical
  const hasHighEvidenceRisk = evidenceReliability?.evidenceRiskLevel === 'alta';
  const hasHighEquityRisk   = equityAccess?.accessRiskLevel === 'alta';

  if (hasHighEvidenceRisk && confidenceScore < 0.60) {
    actions.push({
      priority: 3,
      action:   'Rafforzare la qualità delle evidenze prima del prossimo scoring',
      detail: `Data Reliability Index™ = ${Math.round(confidenceScore * 100)}%. ${
        evidenceReliability
          ? evidenceReliability.advisorNarrative.slice(0, 150) + (evidenceReliability.advisorNarrative.length > 150 ? '…' : '')
          : 'Raccogliere documentazione verificata dai fornitori welfare per migliorare il Verification Rate e il Confidence Score.'
      }`,
    });
  } else if (hasHighEquityRisk) {
    const seg = equityAccess!.underActivatedSegments[0];
    actions.push({
      priority: 3,
      action:   'Intervenire sul divario di accesso tra segmenti della workforce',
      detail: `Equity & Access: rischio ${equityAccess!.accessRiskLevel}. ${
        seg
          ? `${seg.segmentLabel} ha un tasso di attivazione del ${Math.round(seg.activationRate * 100)}% (gap: ${Math.round(seg.gapVsAverage * 100)}pp rispetto alla media aziendale). `
          : ''
      }Pianificare iniziative mirate o rimuovere barriere di accesso per i segmenti sotto-attivati.`,
    });
  } else {
    actions.push({
      priority: 3,
      action:   'Verificare e documentare le fonti dati per il prossimo ciclo',
      detail: `Data Reliability Index™ = ${Math.round(confidenceScore * 100)}%. Assicurarsi che le fonti dati per il prossimo periodo di analisi siano documentate e verificabili. Evidenza L3/L4 (report fornitori, log LMS certificato) rafforza il Confidence Score e il Verification Rate.`,
    });
  }

  return actions.slice(0, 3);
}
