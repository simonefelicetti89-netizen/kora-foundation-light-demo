// ConfidenceScoreService — B86-B live CS computation.
//
// Replaces canned seed values with computation from live signals already
// present in ImpactUnitComputationSummary and UEFReviewSummary.
//
// Does NOT change CS methodology, score range (0–1), or CS weight in KORA Index v1.0.
// CS weight remains 0 — CS is external to KORA Index, displayed alongside it.
//
// Formula (Foundation Light pre-empirical):
//   evidence_quality    = average_ev            (EV factor average across all records)
//   data_completeness   = review_completion_rate (share of records with human decision)
//   mapping_confidence  = average_cq            (completeness quality factor average)
//   verification_weight = share of records with ev >= 0.75 (estimated from average_ev)
//   CS = (evidence_quality × 0.40) + (data_completeness × 0.30)
//      + (mapping_confidence × 0.20) + (verification_weight × 0.10)
//
// If inputs are missing → fallback mode (returns null; caller uses existing data).
//
// methodologyStatus: pre_empirical_calibration
// not_kora_index_component: true

import type { ImpactUnitComputationSummary, UEFReviewSummary } from '@/lib/types';

export interface CSDriver {
  label: string;
  impact: 'positive' | 'negative';
  detail: string;
}

export interface LiveConfidenceScore {
  confidence_score:    number;
  confidence_level:    'high' | 'medium' | 'low';
  data_completeness:   number;
  evidence_quality:    number;
  mapping_confidence:  number;
  verification_weight: number;
  positive_drivers:    CSDriver[];
  negative_drivers:    CSDriver[];
  gaps_identified:     string[];
  limitations:         string;
  methodology_version_id: string;
  calibration_status:  'pre_empirical_calibration';
  live_computation:    true;
}

// CS macroblock weights — Foundation Light pre-empirical
const WEIGHTS = { evidence_quality: 0.40, data_completeness: 0.30, mapping_confidence: 0.20, verification_weight: 0.10 };

function confidenceLevel(score: number): 'high' | 'medium' | 'low' {
  if (score >= 0.70) return 'high';
  if (score >= 0.45) return 'medium';
  return 'low';
}

// Estimates share of records with EV >= VW_THRESHOLD from the average EV.
// Linear approximation: if avgEv = 0.75 → ~50% of records are above threshold.
function estimateVerificationWeight(avgEv: number): number {
  return Math.max(0, Math.min(1, (avgEv - 0.50) / 0.50));
}

function buildPositiveDrivers(
  evidenceQuality:   number,
  dataCompleteness:  number,
  mappingConfidence: number,
): CSDriver[] {
  const drivers: CSDriver[] = [];
  if (evidenceQuality >= 0.75) {
    drivers.push({
      label:  'Alta copertura evidenze',
      impact: 'positive',
      detail: `EV medio ${Math.round(evidenceQuality * 100)}% — la maggior parte dei record ha evidenza verificata o parzialmente verificata.`,
    });
  }
  if (mappingConfidence >= 0.75) {
    drivers.push({
      label:  'Buona qualità documentale',
      impact: 'positive',
      detail: `Completezza media ${Math.round(mappingConfidence * 100)}% — i record contengono la maggior parte dei campi richiesti.`,
    });
  }
  if (dataCompleteness >= 0.80) {
    drivers.push({
      label:  'Revisione completata',
      impact: 'positive',
      detail: `${Math.round(dataCompleteness * 100)}% dei record ha ricevuto una decisione di revisione UEF.`,
    });
  }
  return drivers;
}

function buildNegativeDrivers(
  evidenceQuality:   number,
  dataCompleteness:  number,
  mappingConfidence: number,
  pendingCount:      number,
): CSDriver[] {
  const drivers: CSDriver[] = [];
  if (dataCompleteness < 0.50) {
    drivers.push({
      label:  'Molte verifiche pendenti',
      impact: 'negative',
      detail: `Solo ${Math.round(dataCompleteness * 100)}% dei record ha completato la revisione UEF. ${pendingCount > 0 ? `${pendingCount} record in attesa.` : ''}`,
    });
  }
  if (evidenceQuality < 0.65) {
    drivers.push({
      label:  'Copertura incompleta',
      impact: 'negative',
      detail: `EV medio ${Math.round(evidenceQuality * 100)}% — alta quota di evidenza autodichiarata (L0/L1). Raccogliere documentazione dai fornitori.`,
    });
  }
  if (mappingConfidence < 0.60) {
    drivers.push({
      label:  'Bassa completezza dati',
      impact: 'negative',
      detail: `Completezza media ${Math.round(mappingConfidence * 100)}% — molti record mancano di campi chiave (budget, partecipanti, fonte).`,
    });
  }
  return drivers;
}

function buildGaps(evidenceQuality: number, dataCompleteness: number, mappingConfidence: number): string[] {
  const gaps: string[] = [];
  if (evidenceQuality < 0.65)   gaps.push('Evidenza: alta quota autodichiarata — richiedere report ai fornitori');
  if (dataCompleteness < 0.70)  gaps.push('Revisione: record UEF in attesa di decisione');
  if (mappingConfidence < 0.65) gaps.push('Completezza: campi obbligatori mancanti in più record');
  return gaps;
}

export class ConfidenceScoreService {
  // Computes CS from live signals. Returns null if inputs are unavailable (caller uses fallback).
  compute(
    iuSummary:  ImpactUnitComputationSummary | null,
    uefSummary: UEFReviewSummary | null,
  ): LiveConfidenceScore | null {
    const avgEv  = iuSummary?.average_ev;
    const avgCq  = iuSummary?.average_cq;
    const revRate = uefSummary?.review_completion_rate;

    // Need at least one real signal
    if (avgEv == null && revRate == null) return null;

    const evidenceQuality    = avgEv   ?? 0.60;  // fallback: conservative mid-value
    const dataCompleteness   = revRate ?? 0.50;
    const mappingConfidence  = avgCq   ?? 0.70;
    const verificationWeight = estimateVerificationWeight(evidenceQuality);

    const confidence_score =
      evidenceQuality    * WEIGHTS.evidence_quality   +
      dataCompleteness   * WEIGHTS.data_completeness  +
      mappingConfidence  * WEIGHTS.mapping_confidence +
      verificationWeight * WEIGHTS.verification_weight;

    const pendingCount = uefSummary?.pending_count ?? 0;

    return {
      confidence_score:    Math.round(confidence_score * 1000) / 1000,
      confidence_level:    confidenceLevel(confidence_score),
      data_completeness:   Math.round(dataCompleteness * 1000) / 1000,
      evidence_quality:    Math.round(evidenceQuality * 1000) / 1000,
      mapping_confidence:  Math.round(mappingConfidence * 1000) / 1000,
      verification_weight: Math.round(verificationWeight * 1000) / 1000,
      positive_drivers:    buildPositiveDrivers(evidenceQuality, dataCompleteness, mappingConfidence),
      negative_drivers:    buildNegativeDrivers(evidenceQuality, dataCompleteness, mappingConfidence, pendingCount),
      gaps_identified:     buildGaps(evidenceQuality, dataCompleteness, mappingConfidence),
      limitations:         'Confidence Score calcolato su segnali pre-empirici KORA Foundation Light. Non certificato. Non modifica il valore del KORA Index.',
      methodology_version_id: 'KORA Index v1.0',
      calibration_status:  'pre_empirical_calibration',
      live_computation:    true,
    };
  }
}

export const confidenceScoreService = new ConfidenceScoreService();
