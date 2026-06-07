// Evidence Reliability Intelligence™ — rule-based intelligence layer.
// Explains Data Reliability Index™ (CS) and VR: where are the evidence gaps,
// what should be reviewed first, what areas would benefit from stronger documentation.
//
// Architecture: additive explainability layer — does NOT modify CS, VR, or any KORA Index formula.
// Evidence improvement is a data quality action, not a causal KORA Index claim.
// Advisor-first language. Aggregate only. No individual worker data.
// methodologyStatus: pre_empirical_calibration
// not_kora_index_component: true

import type {
  KoraRole,
  PillarCode,
  ImpactUnitComputationSummary,
  UEFReviewSummary,
  ConfidenceRecord,
} from '@/lib/types';

const ALLOWED_ROLES: ReadonlySet<KoraRole> = new Set<KoraRole>([
  'KORA_ADMIN',
  'ADVISOR',
  'COMPANY_ADMIN',
  'COMPANY_VIEWER',
]);

// ── Evidence quality level classification ────────────────────────────────────
// Maps EV factor ranges to L-code tiers.
// L0/L1 = weak (<0.65), L2 = acceptable (0.65–0.84), L3/L4 = strong (>=0.85)

export type EvidenceQualityTier = 'strong' | 'acceptable' | 'weak';

function evToTier(ev: number): EvidenceQualityTier {
  if (ev >= 0.85) return 'strong';
  if (ev >= 0.65) return 'acceptable';
  return 'weak';
}

export interface EvidenceLevelDistribution {
  weakShare: number;       // share of records classified as L0/L1 (self-declared, no evidence)
  acceptableShare: number; // share of records classified as L2 (internal document, partial)
  strongShare: number;     // share of records classified as L3/L4 (third-party, verified)
  primaryTier: EvidenceQualityTier;
}

export interface EvidenceUpgradeOpportunity {
  area: string;
  currentTier: EvidenceQualityTier;
  upgradeAction: string;
  priority: 'alta' | 'media' | 'bassa';
}

export type EvidenceRiskLevel = 'alta' | 'media' | 'bassa';

export interface EvidenceReliabilitySummary {
  dataReliabilityValue: number;      // CS value (0–1)
  verificationRate: number;          // VR proxy from average_ev (0–1)
  evidenceLevelDistribution: EvidenceLevelDistribution;
  weakEvidenceInitiativeCount: number;
  upgradeOpportunities: EvidenceUpgradeOpportunity[];
  strongestEvidenceAreas: string[];
  evidenceRiskLevel: EvidenceRiskLevel;
  advisorNarrative: string;
  recommendations: string[];
  methodologyStatus: 'pre_empirical_calibration';
  notKoraIndexComponent: true;
}

// ── Evidence level distribution from average_ev ──────────────────────────────
// Foundation Light uses average_ev as a proxy for evidence mix.
// Deterministic estimation: not a record-level classification.

function estimateDistribution(avgEv: number): EvidenceLevelDistribution {
  // EV factor distribution approximation:
  // Low ev → high weak share, High ev → high strong share
  const strongShare      = Math.max(0, Math.min(1, (avgEv - 0.50) / 0.50));
  const weakShare        = Math.max(0, Math.min(1, 1 - avgEv / 0.65));
  const acceptableShare  = Math.max(0, 1 - strongShare - weakShare);

  // Clamp to ensure sum = 1
  const total = strongShare + acceptableShare + weakShare;
  const factor = total > 0 ? 1 / total : 1;

  const sn = strongShare * factor;
  const ac = acceptableShare * factor;
  const wk = weakShare * factor;

  // primaryTier is determined directly from avgEv tier boundaries, not from share comparison.
  // Shares are visualization proxies; tier must be canonical (L0/L1 < 0.65, L2 0.65–0.84, L3/L4 ≥ 0.85).
  const primaryTier: EvidenceQualityTier = evToTier(avgEv);

  return {
    weakShare: Math.round(wk * 100) / 100,
    acceptableShare: Math.round(ac * 100) / 100,
    strongShare: Math.round(sn * 100) / 100,
    primaryTier,
  };
}

// ── Evidence risk level ────────────────────────────────────────────────────────

function classifyEvidenceRisk(
  avgEv: number,
  reviewCompletionRate: number,
  gapCount: number,
): EvidenceRiskLevel {
  if (avgEv < 0.65 || reviewCompletionRate < 0.50 || gapCount >= 3) return 'alta';
  if (avgEv < 0.80 || reviewCompletionRate < 0.75 || gapCount >= 1) return 'media';
  return 'bassa';
}

// ── Upgrade opportunities ─────────────────────────────────────────────────────

function buildUpgradeOpportunities(
  avgEv: number,
  pendingCount: number,
  needsMoreDataCount: number,
  gaps: string[],
): EvidenceUpgradeOpportunity[] {
  const ops: EvidenceUpgradeOpportunity[] = [];

  if (pendingCount > 0) {
    ops.push({
      area: `${pendingCount} record in attesa di revisione`,
      currentTier: 'weak',
      upgradeAction: 'Completare la revisione UEF per convertire i record in sospeso da "pending" a "approved_for_scoring".',
      priority: 'alta',
    });
  }

  if (needsMoreDataCount > 0) {
    ops.push({
      area: `${needsMoreDataCount} record che richiedono informazioni aggiuntive`,
      currentTier: 'weak',
      upgradeAction: 'Raccogliere documentazione mancante (report fornitore, log partecipazione, fattura) per i record in stato "needs_more_data".',
      priority: 'alta',
    });
  }

  if (avgEv < 0.75) {
    ops.push({
      area: 'Portfolio generale: evidenza parziale o autodichiarata',
      currentTier: avgEv < 0.65 ? 'weak' : 'acceptable',
      upgradeAction: 'Richiedere report di partecipazione dai fornitori welfare o LMS per convertire evidenza autodichiarata in evidenza verificata (L2→L3).',
      priority: avgEv < 0.65 ? 'alta' : 'media',
    });
  }

  if (gaps.length > 0) {
    ops.push({
      area: `Gap identificati: ${gaps.slice(0, 2).join(', ')}`,
      currentTier: 'weak',
      upgradeAction: 'Integrare le fonti dati mancanti identificate nel Confidence Score per migliorare la completezza del dataset.',
      priority: 'media',
    });
  }

  return ops.slice(0, 3);
}

// ── Strongest evidence areas ──────────────────────────────────────────────────

function buildStrongestAreas(avgEv: number, reviewCompletionRate: number): string[] {
  const areas: string[] = [];
  if (avgEv >= 0.85) areas.push('Evidenza complessiva di alta qualità (EV medio ≥ 0.85)');
  if (reviewCompletionRate >= 0.90) areas.push('Revisione UEF sostanzialmente completata');
  if (reviewCompletionRate >= 0.75 && avgEv >= 0.75) areas.push('Portfolio ben documentato con margini di miglioramento limitati');
  return areas;
}

// ── Advisor narrative ────────────────────────────────────────────────────────

function buildAdvisorNarrative(
  cs: number,
  avgEv: number,
  reviewCompletionRate: number,
  riskLevel: EvidenceRiskLevel,
  pendingCount: number,
  gapCount: number,
): string {
  const csPct = Math.round(cs * 100);
  const evPct = Math.round(avgEv * 100);
  const revPct = Math.round(reviewCompletionRate * 100);

  if (riskLevel === 'alta') {
    return `Data Reliability Index™ = ${csPct}% — qualità evidenza bassa (EV medio: ${evPct}%, revisione completata: ${revPct}%). ${pendingCount > 0 ? `${pendingCount} record in attesa di revisione. ` : ''}Priorità: completare la revisione UEF e raccogliere documentazione dai fornitori. Migliorare la qualità dell'evidenza può aumentare il Verification Rate (VR) e il Data Reliability Index™.`;
  }

  if (riskLevel === 'media') {
    return `Data Reliability Index™ = ${csPct}% — qualità evidenza media (EV medio: ${evPct}%). ${gapCount > 0 ? `${gapCount} gap identificati nelle fonti dati. ` : ''}Margini di miglioramento nella documentazione dei programmi a minore qualità di evidenza.`;
  }

  return `Data Reliability Index™ = ${csPct}% — qualità evidenza buona (EV medio: ${evPct}%, revisione completata: ${revPct}%). Nessuna azione urgente sull'evidenza. Monitoraggio periodico raccomandato.`;
}

// ── Recommendations ──────────────────────────────────────────────────────────

function buildRecommendations(
  riskLevel: EvidenceRiskLevel,
  pendingCount: number,
  needsMoreData: number,
  avgEv: number,
): string[] {
  const recs: string[] = [];

  if (pendingCount > 0) {
    recs.push(`Completare la revisione di ${pendingCount} record UEF in sospeso per sbloccare il loro contributo al Verification Rate.`);
  }
  if (needsMoreData > 0) {
    recs.push(`Raccogliere documentazione per ${needsMoreData} record in stato "richiede informazioni" — sono la fonte di miglioramento più rapida del Data Reliability Index™.`);
  }
  if (avgEv < 0.75 && riskLevel !== 'bassa') {
    recs.push('Richiedere report di partecipazione ai fornitori welfare per convertire iniziative autodichiarate in evidenza verificata (upgrade L1→L2 o L2→L3).');
  }
  if (riskLevel === 'alta') {
    recs.push('Valutare revisione advisor del portfolio evidenze — la qualità attuale può limitare la rappresentatività del Data Reliability Index™.');
  }

  return recs;
}

// ── Pillar evidence breakdown ─────────────────────────────────────────────────
// Aggregate-only. Derived from IU share per pillar × overall average_ev.
// Pillars with more IU have a higher likelihood of verified evidence
// (more participation → more provider reports).
// Formula: pillar_ev_estimate = clamp(avgEv × pillar_share_factor, 0.40, 0.98)
// where share_factor = pillar_iu / max_pillar_iu (relative dominance).
// This is an approximation. Pilot+: compute from actual per-record ev values.

export type EvidenceQualityLabel = 'buona' | 'accettabile' | 'debole';

export interface PillarEvidenceBreakdown {
  pillar:           PillarCode;
  pillarLabel:      string;
  estimatedEvScore: number;        // 0–1
  qualityLabel:     EvidenceQualityLabel;
  iuShare:          number;        // 0–1, share of total company IU
  weakEvidenceNote: string | null; // present if qualityLabel === 'debole'
  methodologyNote:  'pre_empirical_estimate';
}

const PILLAR_LABELS: Record<PillarCode, string> = {
  LIFE:       'Life — Salute & Benessere',
  GROWTH:     'Growth — Crescita & Formazione',
  CONNECTION: 'Connection — Mentoring & Comunità',
  IMPACT:     'Impact — Impatto Territoriale',
  LEGACY:     'Legacy — Trasferimento Conoscenza',
};

const PILLAR_CODES: PillarCode[] = ['LIFE', 'GROWTH', 'CONNECTION', 'IMPACT', 'LEGACY'];

function evToQualityLabel(ev: number): EvidenceQualityLabel {
  if (ev >= 0.75) return 'buona';
  if (ev >= 0.60) return 'accettabile';
  return 'debole';
}

// ── Service class ─────────────────────────────────────────────────────────────

export class EvidenceReliabilityIntelligenceService {
  canAccess(role: KoraRole): boolean {
    return ALLOWED_ROLES.has(role);
  }

  compute(
    iuSummary: ImpactUnitComputationSummary | null,
    uefSummary: UEFReviewSummary | null,
    confidenceRecord: ConfidenceRecord | null,
    role: KoraRole,
  ): EvidenceReliabilitySummary | null {
    if (!this.canAccess(role)) return null;
    return this.computeFromData(iuSummary, uefSummary, confidenceRecord);
  }

  // Returns per-pillar evidence quality breakdown — aggregate-only, no individual data.
  // Employer-safe: no worker-level information, no IU traces.
  getPillarEvidenceBreakdown(
    iuSummary: ImpactUnitComputationSummary | null,
  ): PillarEvidenceBreakdown[] {
    const avgEv      = iuSummary?.average_ev ?? 0.65;
    const iuByPillar = iuSummary?.impact_units_by_pillar ?? { LIFE: 0, GROWTH: 0, CONNECTION: 0, IMPACT: 0, LEGACY: 0 };
    const totalIU    = PILLAR_CODES.reduce((s, p) => s + (iuByPillar[p] ?? 0), 0);
    const maxIU      = Math.max(...PILLAR_CODES.map((p) => iuByPillar[p] ?? 0), 1);

    return PILLAR_CODES.map((pillar): PillarEvidenceBreakdown => {
      const pillarIU   = iuByPillar[pillar] ?? 0;
      const iuShare    = totalIU > 0 ? pillarIU / totalIU : 0;
      // Pillars with more IU get a slight EV boost (more participation → more verifiable evidence).
      // Pillars with zero IU get a conservative floor of 0.45.
      const shareFactor = maxIU > 0 ? pillarIU / maxIU : 0;
      const rawEv       = pillarIU === 0 ? 0.45 : avgEv * (0.85 + 0.15 * shareFactor);
      const estimatedEv = Math.round(Math.max(0.40, Math.min(0.98, rawEv)) * 1000) / 1000;
      const qualityLabel = evToQualityLabel(estimatedEv);

      return {
        pillar,
        pillarLabel:      PILLAR_LABELS[pillar],
        estimatedEvScore: estimatedEv,
        qualityLabel,
        iuShare:          Math.round(iuShare * 1000) / 1000,
        weakEvidenceNote: qualityLabel === 'debole'
          ? `Evidenza prevalentemente autodichiarata per il pillar ${pillar}. Raccogliere documentazione dai fornitori.`
          : null,
        methodologyNote:  'pre_empirical_estimate',
      };
    });
  }

  // Test-friendly: no role check — caller is responsible for access control.
  computeFromData(
    iuSummary: ImpactUnitComputationSummary | null,
    uefSummary: UEFReviewSummary | null,
    confidenceRecord: ConfidenceRecord | null,
  ): EvidenceReliabilitySummary {
    const cs               = confidenceRecord?.confidence_score ?? 0;
    const avgEv            = iuSummary?.average_ev ?? 0;
    const reviewCompletion = uefSummary?.review_completion_rate ?? 0;
    const pendingCount     = uefSummary?.pending_count ?? 0;
    const needsMoreData    = uefSummary?.needs_more_data_count ?? 0;
    const totalRecords     = iuSummary?.total_records ?? 0;
    const gaps             = confidenceRecord?.gaps_identified ?? [];

    const distribution       = estimateDistribution(avgEv);
    const weakInitCount      = Math.round(totalRecords * distribution.weakShare);
    const riskLevel          = classifyEvidenceRisk(avgEv, reviewCompletion, gaps.length);
    const upgradeOpps        = buildUpgradeOpportunities(avgEv, pendingCount, needsMoreData, gaps);
    const strongestAreas     = buildStrongestAreas(avgEv, reviewCompletion);
    const advisorNarrative   = buildAdvisorNarrative(cs, avgEv, reviewCompletion, riskLevel, pendingCount, gaps.length);
    const recommendations    = buildRecommendations(riskLevel, pendingCount, needsMoreData, avgEv);

    return {
      dataReliabilityValue: cs,
      verificationRate: avgEv,
      evidenceLevelDistribution: distribution,
      weakEvidenceInitiativeCount: weakInitCount,
      upgradeOpportunities: upgradeOpps,
      strongestEvidenceAreas: strongestAreas,
      evidenceRiskLevel: riskLevel,
      advisorNarrative,
      recommendations,
      methodologyStatus: 'pre_empirical_calibration',
      notKoraIndexComponent: true,
    };
  }
}

export const evidenceReliabilityIntelligenceService = new EvidenceReliabilityIntelligenceService();
