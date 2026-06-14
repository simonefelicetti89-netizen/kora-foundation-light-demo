// Care Economy Intelligence™ — rule-based intelligence layer.
// Interprets care-related LIFE coverage from LifeDiversitySummary.
//
// Architecture: additive explainability layer — does NOT modify KORA Index, PB, PC, CQ, or any formula.
// Reads from LifeDiversitySummary (already computed by LifeDiversityService).
// Privacy: portfolio-level only. No worker inference. No demographic claims.
// Language rule: frames as "the portfolio contains/lacks" — never "workers need".
// methodologyStatus: pre_empirical_calibration
// not_kora_index_component: true

import type { KoraRole } from '@/lib/types';
import type { LifeDiversitySummary, LifeSubcategoryCode } from '@/services/life-diversity/LifeDiversityService';

const ALLOWED_ROLES: ReadonlySet<KoraRole> = new Set<KoraRole>([
  'KORA_ADMIN',
  'COMPANY_ADMIN',
]);

export const CARE_SUBCATEGORY_CODES: readonly LifeSubcategoryCode[] = [
  'childcare',
  'eldercare_caregiving',
  'family_parental_support',
] as const;

export type CareEconomyStatus = 'absent' | 'limited' | 'developing' | 'broad';

export interface CareEconomyRecommendation {
  id: string;
  text: string;
  priority: 'alta' | 'media';
  targetSubcategory?: LifeSubcategoryCode;
}

export interface CareEconomySummary {
  careCoverageScore: number;                       // 0–1: active care subs / 3
  activeCareSubcategories: LifeSubcategoryCode[];
  missingCareSubcategories: LifeSubcategoryCode[];
  careEconomyStatus: CareEconomyStatus;
  narrative: string;
  recommendations: CareEconomyRecommendation[];
  privacyNote: string;
  methodologyStatus: 'pre_empirical_calibration';
  notKoraIndexComponent: true;
}

// ── Status thresholds ─────────────────────────────────────────────────────────

function classifyCareStatus(activeCareCount: number): CareEconomyStatus {
  if (activeCareCount === 0) return 'absent';
  if (activeCareCount === 1) return 'limited';
  if (activeCareCount === 2) return 'developing';
  return 'broad';
}

// ── Label map for care subcategories ─────────────────────────────────────────

const CARE_LABELS: Record<LifeSubcategoryCode, string> = {
  childcare:              'Childcare & Nido',
  eldercare_caregiving:   'Eldercare & Caregiving',
  family_parental_support: 'Supporto Familiare & Genitorialità',
  mental_health:              '',
  physical_prevention_screening: '',
  physical_activity_fitness:     '',
  health_insurance_supplementary: '',
  work_life_balance:             '',
  disconnection_meeting_free:    '',
  flexible_work_policies:        '',
};

// ── Italian narrative generation ───────────────────────────────────────────────

function buildNarrative(
  status: CareEconomyStatus,
  activeCareSubcategories: LifeSubcategoryCode[],
  missingCareSubcategories: LifeSubcategoryCode[],
): string {
  const activeLabels  = activeCareSubcategories.map((c) => CARE_LABELS[c]).filter(Boolean).join(', ');
  const missingLabels = missingCareSubcategories.map((c) => CARE_LABELS[c]).filter(Boolean).join(', ');

  if (status === 'absent') {
    return 'Il portfolio LIFE non contiene iniziative Care Economy: nessuna copertura di childcare, eldercare o supporto familiare è rilevata nei programmi attivi.';
  }
  if (status === 'limited') {
    return `Il portfolio LIFE contiene un\'iniziativa Care Economy (${activeLabels}). Le aree Care Economy non coperte sono: ${missingLabels}.`;
  }
  if (status === 'developing') {
    return `Il portfolio LIFE copre ${activeCareSubcategories.length} su 3 aree Care Economy (${activeLabels}). Area non ancora coperta: ${missingLabels}.`;
  }
  return `Il portfolio LIFE include copertura completa delle tre aree Care Economy: ${activeLabels}.`;
}

// ── Recommendations ────────────────────────────────────────────────────────────

function buildRecommendations(
  status: CareEconomyStatus,
  missingCareSubcategories: LifeSubcategoryCode[],
): CareEconomyRecommendation[] {
  const recs: CareEconomyRecommendation[] = [];

  if (status === 'absent') {
    recs.push({
      id: 'rec_care_economy_activate',
      text: 'Il portfolio LIFE non include iniziative di care economy. Valutare l\'introduzione di almeno un\'iniziativa di childcare, eldercare o supporto familiare per ampliare la copertura del pillar LIFE.',
      priority: 'alta',
      targetSubcategory: 'family_parental_support',
    });
  }

  if (missingCareSubcategories.includes('childcare')) {
    recs.push({
      id: 'rec_add_childcare',
      text: 'Il portfolio non include iniziative di childcare. Asilo nido aziendale, contributi nido o centri estivi rappresentano programmi ad alta visibilità nel panorama welfare italiano.',
      priority: status === 'absent' ? 'alta' : 'media',
      targetSubcategory: 'childcare',
    });
  }

  if (missingCareSubcategories.includes('eldercare_caregiving')) {
    recs.push({
      id: 'rec_add_eldercare',
      text: 'Il portfolio non include iniziative eldercare o caregiving. Il supporto ai lavoratori con responsabilità di cura familiare è un\'area in crescita nel welfare aziendale.',
      priority: 'media',
      targetSubcategory: 'eldercare_caregiving',
    });
  }

  return recs;
}

// ── Service class ──────────────────────────────────────────────────────────────

export class CareEconomyIntelligenceService {
  canAccess(role: KoraRole): boolean {
    return ALLOWED_ROLES.has(role);
  }

  compute(
    lifeDiversity: LifeDiversitySummary | null,
    role: KoraRole,
  ): CareEconomySummary | null {
    if (!this.canAccess(role)) return null;
    if (!lifeDiversity) return null;

    return this.computeFromDiversity(lifeDiversity);
  }

  // Test-friendly: no role check — caller is responsible for access control.
  computeFromDiversity(lifeDiversity: LifeDiversitySummary): CareEconomySummary {
    const active   = new Set(lifeDiversity.activeSubcategories);
    const activeCareSubcategories   = CARE_SUBCATEGORY_CODES.filter((c) => active.has(c));
    const missingCareSubcategories  = CARE_SUBCATEGORY_CODES.filter((c) => !active.has(c));

    const careCoverageScore = activeCareSubcategories.length / CARE_SUBCATEGORY_CODES.length;
    const careEconomyStatus = classifyCareStatus(activeCareSubcategories.length);
    const narrative         = buildNarrative(careEconomyStatus, activeCareSubcategories, missingCareSubcategories);
    const recommendations   = buildRecommendations(careEconomyStatus, missingCareSubcategories);

    return {
      careCoverageScore,
      activeCareSubcategories: [...activeCareSubcategories],
      missingCareSubcategories: [...missingCareSubcategories],
      careEconomyStatus,
      narrative,
      recommendations,
      privacyNote: 'Analisi basata sulla composizione del portfolio programmi LIFE — non inferisce caratteristiche individuali dei lavoratori.',
      methodologyStatus: 'pre_empirical_calibration',
      notKoraIndexComponent: true,
    };
  }
}

export const careEconomyIntelligenceService = new CareEconomyIntelligenceService();
