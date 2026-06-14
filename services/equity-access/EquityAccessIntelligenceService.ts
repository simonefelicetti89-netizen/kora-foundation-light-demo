// Equity & Access Intelligence™ — rule-based intelligence layer.
// Explains the EQ component: which workforce segments are under/over-activated.
//
// Architecture: additive explainability layer — does NOT modify EQ, KORA Index, or any formula.
// Privacy: N≥10 suppression is architectural, not a UI option. No individual worker data.
// D-04 compliant. Employer-facing aggregate only.
// methodologyStatus: pre_empirical_calibration
// not_kora_index_component: true

import type { CompanyAggregateExtended, KoraRole, WorkforceAggregateGroup } from '@/lib/types';

const ALLOWED_ROLES: ReadonlySet<KoraRole> = new Set<KoraRole>([
  'KORA_ADMIN',
  'COMPANY_ADMIN',
]);

export type SegmentActivationStatus =
  | 'under_activated'  // activation rate <= company average - 15pp
  | 'near_parity'      // within ±15pp of company average
  | 'over_activated'   // activation rate >= company average + 15pp
  | 'suppressed';      // N < 10 — privacy threshold not met

export type AccessRiskLevel = 'alta' | 'media' | 'bassa' | 'insufficient_data';

export interface EquitySegmentGap {
  segmentId: string;
  segmentLabel: string;
  activationRate: number;
  gapVsAverage: number;         // signed: negative = under, positive = over
  status: SegmentActivationStatus;
}

export interface EquityAccessSummary {
  eqValue: number;                              // 0–1 from KORA Index EQ component
  companyAverageActivation: number;
  segmentCount: number;                         // total segments provided
  visibleSegmentCount: number;                  // segments with N≥10
  suppressedSegmentCount: number;               // segments below N≥10
  underActivatedSegments: EquitySegmentGap[];
  overActivatedSegments: EquitySegmentGap[];
  nearParitySegments: EquitySegmentGap[];
  largestGap: number;                           // absolute pp gap across all visible segments
  accessRiskLevel: AccessRiskLevel;
  narrative: string;
  recommendations: string[];
  methodologyStatus: 'pre_empirical_calibration';
  notKoraIndexComponent: true;
}

// ── Department label normalizer ────────────────────────────────────────────────

function labelFromId(deptId: string): string {
  return deptId
    .replace(/^dept-/, '')
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

// ── Access risk classification ─────────────────────────────────────────────────

function classifyAccessRisk(
  underCount: number,
  largestGap: number,
  eqValue: number,
): AccessRiskLevel {
  if (underCount === 0 && eqValue >= 0 && largestGap < 0.20) return 'bassa';
  if (underCount >= 2 || largestGap >= 0.40 || eqValue < 0.35) return 'alta';
  if (underCount >= 1 || largestGap >= 0.20) return 'media';
  return 'bassa';
}

// ── Italian narrative generation ───────────────────────────────────────────────

function buildNarrative(
  eqValue: number,
  underActivated: EquitySegmentGap[],
  overActivated: EquitySegmentGap[],
  suppressedCount: number,
  accessRisk: AccessRiskLevel,
): string {
  const eqPct = Math.round(eqValue * 100);
  const underLabels = underActivated.map((s) => s.segmentLabel).join(', ');

  if (accessRisk === 'alta') {
    const underPart = underActivated.length > 0
      ? ` I segmenti ${underLabels} mostrano un tasso di attivazione significativamente sotto la media aziendale.`
      : '';
    return `EQ = ${eqPct}% — la distribuzione dell'attivazione presenta un divario materiale tra segmenti.${underPart} Considerare programmi accessibili ai segmenti sotto-rappresentati prima del prossimo ciclo di scoring.`;
  }

  if (accessRisk === 'media') {
    const underPart = underActivated.length > 0
      ? ` Il segmento ${underLabels} presenta attivazione inferiore alla media.`
      : '';
    return `EQ = ${eqPct}% — distribuzione moderata.${underPart} Margine di miglioramento nell'equità di accesso tra i reparti analizzati.`;
  }

  if (suppressedCount > 0) {
    return `EQ = ${eqPct}% — distribuzione sostanzialmente bilanciata nei segmenti visibili. ${suppressedCount} ${suppressedCount === 1 ? 'segmento non analizzabile' : 'segmenti non analizzabili'} per soglia privacy (N < 10).`;
  }

  return `EQ = ${eqPct}% — distribuzione dell'attivazione sostanzialmente uniforme nei segmenti analizzati.`;
}

// ── Recommendations ────────────────────────────────────────────────────────────

function buildRecommendations(
  underActivated: EquitySegmentGap[],
  accessRisk: AccessRiskLevel,
  eqValue: number,
  suppressedCount: number,
): string[] {
  const recs: string[] = [];

  if (underActivated.length > 0) {
    const first = underActivated[0];
    recs.push(
      `Priorità: ${first.segmentLabel} ha un tasso di attivazione del ${Math.round(first.activationRate * 100)}%, significativamente sotto la media. Verificare accesso ai programmi e barriere logistiche.`,
    );
  }

  if (accessRisk === 'alta') {
    recs.push(
      'Divario di equità materiale: pianificare iniziative mirate ai reparti sotto-attivati prima del prossimo periodo di analisi.',
    );
  }

  if (eqValue < 0.40) {
    recs.push(
      'Equity (EQ) sotto soglia — segnale che l\'attivazione è sistematicamente concentrata in segmenti privilegiati. Revisione del portfolio programmi raccomandata.',
    );
  }

  if (suppressedCount > 0) {
    recs.push(
      `${suppressedCount} ${suppressedCount === 1 ? 'segmento' : 'segmenti'} sotto soglia di privacy (N < 10) — non analizzabile per equità. Valutare aggregazione di cluster contigui.`,
    );
  }

  return recs;
}

// ── Service class ──────────────────────────────────────────────────────────────

export class EquityAccessIntelligenceService {
  canAccess(role: KoraRole): boolean {
    return ALLOWED_ROLES.has(role);
  }

  compute(
    aggregate: CompanyAggregateExtended | null,
    eqValue: number,
    role: KoraRole,
    groups?: WorkforceAggregateGroup[],
  ): EquityAccessSummary | null {
    if (!this.canAccess(role)) return null;
    if (!aggregate) return null;

    const companyAvg = aggregate.activation_rate;
    const deptMap = aggregate.department_activation ?? {};
    const deptEntries = Object.entries(deptMap);

    if (deptEntries.length === 0) {
      return this._insufficientData(eqValue);
    }

    // Build segment classification — privacy: only show segments above threshold
    // Groups provide the N count for suppression check; if no groups provided,
    // assume all segments in department_activation met the N≥10 threshold
    // (they are already safe — privacy_threshold_met is required before inclusion)
    const groupThresholdMap = new Map<string, boolean>();
    if (groups) {
      for (const g of groups) {
        groupThresholdMap.set(g.group_id, g.privacy_threshold_met && g.included_in_breakdown);
        // Also try matching by dimension_label
        groupThresholdMap.set(g.dimension_label.toLowerCase(), g.privacy_threshold_met && g.included_in_breakdown);
      }
    }

    const THRESHOLD_PP = 0.15; // ±15 percentage points
    const segments: EquitySegmentGap[] = [];
    let suppressedCount = 0;

    for (const [id, rate] of deptEntries) {
      const label = labelFromId(id);
      // Check if this segment is suppressed via group map, otherwise assume visible
      // (CompanyAggregateExtended.department_activation already filters to visible segments)
      const isVisible = groupThresholdMap.size === 0 || (groupThresholdMap.get(id) !== false);

      if (!isVisible) {
        suppressedCount++;
        continue;
      }

      const gap = rate - companyAvg;
      let status: SegmentActivationStatus;
      if (gap <= -THRESHOLD_PP) status = 'under_activated';
      else if (gap >= THRESHOLD_PP) status = 'over_activated';
      else status = 'near_parity';

      segments.push({ segmentId: id, segmentLabel: label, activationRate: rate, gapVsAverage: gap, status });
    }

    const underActivated = segments.filter((s) => s.status === 'under_activated').sort((a, b) => a.gapVsAverage - b.gapVsAverage);
    const overActivated  = segments.filter((s) => s.status === 'over_activated').sort((a, b) => b.gapVsAverage - a.gapVsAverage);
    const nearParity     = segments.filter((s) => s.status === 'near_parity');

    const allGaps = segments.map((s) => Math.abs(s.gapVsAverage));
    const largestGap = allGaps.length > 0 ? Math.max(...allGaps) : 0;

    const accessRisk = classifyAccessRisk(underActivated.length, largestGap, eqValue);
    const narrative  = buildNarrative(eqValue, underActivated, overActivated, suppressedCount, accessRisk);
    const recommendations = buildRecommendations(underActivated, accessRisk, eqValue, suppressedCount);

    return {
      eqValue,
      companyAverageActivation: companyAvg,
      segmentCount: deptEntries.length,
      visibleSegmentCount: segments.length,
      suppressedSegmentCount: suppressedCount,
      underActivatedSegments: underActivated,
      overActivatedSegments: overActivated,
      nearParitySegments: nearParity,
      largestGap,
      accessRiskLevel: accessRisk,
      narrative,
      recommendations,
      methodologyStatus: 'pre_empirical_calibration',
      notKoraIndexComponent: true,
    };
  }

  private _insufficientData(eqValue: number): EquityAccessSummary {
    return {
      eqValue,
      companyAverageActivation: 0,
      segmentCount: 0,
      visibleSegmentCount: 0,
      suppressedSegmentCount: 0,
      underActivatedSegments: [],
      overActivatedSegments: [],
      nearParitySegments: [],
      largestGap: 0,
      accessRiskLevel: 'insufficient_data',
      narrative: 'Dati di segmentazione non disponibili per questa azienda. L\'analisi richiede dati di attivazione per reparto.',
      recommendations: ['Caricare il Workforce Baseline con breakdown per reparto per abilitare l\'analisi Equity & Access.'],
      methodologyStatus: 'pre_empirical_calibration',
      notKoraIndexComponent: true,
    };
  }
}

export const equityAccessIntelligenceService = new EquityAccessIntelligenceService();
