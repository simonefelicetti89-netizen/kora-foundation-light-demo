import { describe, it, expect } from 'vitest';
import {
  lifeDiversityService,
  classifyLifeSubcategory,
  LIFE_SUBCATEGORY_META,
} from '@/services/life-diversity/LifeDiversityService';

// ── Unit helpers ──────────────────────────────────────────────────────────────

const GYM_PROGRAMS = [
  'Palestra aziendale convenzione abbonamento',
  'Gym benefit mensile dipendenti',
  'Sport aziendale rimborso fitness',
  'Convenzione palestra external provider',
  'Fitness benefit welfare platform',
];

const DIVERSE_PROGRAMS = [
  'Palestra aziendale convenzione',
  'Supporto psicologico aziendale piattaforma',
  'Prevenzione sanitaria extra check-up',
  'Smart working policy formale',
  'Contributo nido aziendale centri estivi',
  'Assicurazione sanitaria integrativa fondo',
];

// ── classifyLifeSubcategory ────────────────────────────────────────────────────

describe('classifyLifeSubcategory', () => {
  it('classifies gym-related program as physical_activity_fitness', () => {
    expect(classifyLifeSubcategory('Palestra aziendale convenzione')).toBe('physical_activity_fitness');
    expect(classifyLifeSubcategory('Gym benefit mensile')).toBe('physical_activity_fitness');
    expect(classifyLifeSubcategory('Fitness aziendale rimborso')).toBe('physical_activity_fitness');
  });

  it('classifies mental health program as mental_health', () => {
    expect(classifyLifeSubcategory('Supporto psicologico aziendale')).toBe('mental_health');
    expect(classifyLifeSubcategory('Mental health platform aziendale')).toBe('mental_health');
    expect(classifyLifeSubcategory('Salute mentale programma')).toBe('mental_health');
  });

  it('classifies prevention program as physical_prevention_screening', () => {
    expect(classifyLifeSubcategory('Prevenzione sanitaria extra check-up')).toBe('physical_prevention_screening');
    expect(classifyLifeSubcategory('Check-up extra LEA')).toBe('physical_prevention_screening');
  });

  it('classifies smart working as flexible_work_policies', () => {
    expect(classifyLifeSubcategory('Smart working policy formale')).toBe('flexible_work_policies');
    expect(classifyLifeSubcategory('Lavoro agile policy aziendale')).toBe('flexible_work_policies');
  });

  it('classifies nido/childcare programs as childcare', () => {
    expect(classifyLifeSubcategory('Contributo nido aziendale')).toBe('childcare');
    expect(classifyLifeSubcategory('Asilo nido aziendale')).toBe('childcare');
    expect(classifyLifeSubcategory('Centri estivi summer camp')).toBe('childcare');
  });

  it('classifies health insurance as health_insurance_supplementary', () => {
    expect(classifyLifeSubcategory('Assicurazione sanitaria integrativa')).toBe('health_insurance_supplementary');
    expect(classifyLifeSubcategory('Polizza sanitaria aziendale')).toBe('health_insurance_supplementary');
  });

  it('classifies caregiver programs as eldercare_caregiving', () => {
    expect(classifyLifeSubcategory('Supporto caregiver anziani')).toBe('eldercare_caregiving');
    expect(classifyLifeSubcategory('Eldercare assistenza familiare')).toBe('eldercare_caregiving');
  });

  it('classifies disconnection policy as disconnection_meeting_free', () => {
    expect(classifyLifeSubcategory('Diritto alla disconnessione aziendale')).toBe('disconnection_meeting_free');
    expect(classifyLifeSubcategory('No meeting friday policy')).toBe('disconnection_meeting_free');
  });

  it('returns null for non-LIFE programs', () => {
    expect(classifyLifeSubcategory('Buoni pasto mensa')).toBeNull();
    expect(classifyLifeSubcategory('Formazione professionalizzante upskilling')).toBeNull();
    expect(classifyLifeSubcategory('Volontariato aziendale')).toBeNull();
  });
});

// ── Concentration status ───────────────────────────────────────────────────────

describe('LifeDiversityService — concentration status', () => {
  it('gym-heavy LIFE portfolio returns single_category_dominant', () => {
    const result = lifeDiversityService.computeFromProgramNames(GYM_PROGRAMS, 0.45, 0);
    expect(result.concentrationStatus).toBe('single_category_dominant');
    expect(result.activeSubcategories).toHaveLength(1);
    expect(result.activeSubcategories[0]).toBe('physical_activity_fitness');
    expect(result.dominantSubcategory).toBe('physical_activity_fitness');
  });

  it('diverse LIFE portfolio returns diverse', () => {
    const result = lifeDiversityService.computeFromProgramNames(DIVERSE_PROGRAMS, 0.38, 0);
    expect(result.concentrationStatus).toBe('diverse');
    expect(result.activeSubcategories.length).toBeGreaterThanOrEqual(6);
  });

  it('no programs returns no_life_data', () => {
    const result = lifeDiversityService.computeFromProgramNames([], 0, 0);
    expect(result.concentrationStatus).toBe('no_life_data');
    expect(result.activeSubcategories).toHaveLength(0);
    expect(result.diversityScore).toBe(0);
    expect(result.dominantSubcategory).toBeNull();
  });

  it('2–3 active subcategories returns highly_concentrated', () => {
    const result = lifeDiversityService.computeFromProgramNames([
      'Palestra aziendale gym',
      'Smart working policy formale',
    ], 0.30, 0);
    expect(result.concentrationStatus).toBe('highly_concentrated');
    expect(result.activeSubcategories.length).toBeLessThanOrEqual(3);
  });

  it('4–5 active subcategories returns moderately_concentrated', () => {
    const result = lifeDiversityService.computeFromProgramNames([
      'Palestra aziendale gym',
      'Smart working policy formale',
      'Supporto psicologico aziendale',
      'Prevenzione sanitaria extra',
    ], 0.30, 0);
    expect(result.concentrationStatus).toBe('moderately_concentrated');
  });
});

// ── Diversity score ────────────────────────────────────────────────────────────

describe('LifeDiversityService — diversity score', () => {
  it('diversity score = active / 10', () => {
    const result = lifeDiversityService.computeFromProgramNames(GYM_PROGRAMS, 0.45, 0);
    expect(result.diversityScore).toBeCloseTo(1 / 10);
  });

  it('diverse portfolio has diversityScore >= 0.6', () => {
    const result = lifeDiversityService.computeFromProgramNames(DIVERSE_PROGRAMS, 0.38, 0);
    expect(result.diversityScore).toBeGreaterThanOrEqual(0.6);
  });

  it('diversity score is always between 0 and 1', () => {
    const result = lifeDiversityService.computeFromProgramNames(DIVERSE_PROGRAMS, 0.38, 0);
    expect(result.diversityScore).toBeGreaterThanOrEqual(0);
    expect(result.diversityScore).toBeLessThanOrEqual(1);
  });
});

// ── Privacy warnings ──────────────────────────────────────────────────────────

describe('LifeDiversityService — privacy warnings', () => {
  it('lifeShare below 0.55 returns none privacy warning', () => {
    const result = lifeDiversityService.computeFromProgramNames(GYM_PROGRAMS, 0.40, 0);
    expect(result.privacyWarningLevel).toBe('none');
    expect(result.privacyWarningMessage).toBeNull();
  });

  it('lifeShare >= 0.55 returns soft privacy warning', () => {
    const result = lifeDiversityService.computeFromProgramNames(GYM_PROGRAMS, 0.58, 0);
    expect(result.privacyWarningLevel).toBe('soft');
    expect(result.privacyWarningMessage).toBeTruthy();
  });

  it('lifeShare >= 0.70 returns hard privacy warning', () => {
    const result = lifeDiversityService.computeFromProgramNames(GYM_PROGRAMS, 0.72, 0);
    expect(result.privacyWarningLevel).toBe('hard');
    expect(result.privacyWarningMessage).toBeTruthy();
  });

  it('high-sensitivity dominant subcategory escalates warning by one level', () => {
    // mental_health has privacySensitivity: 'high'
    // lifeShare = 0.35 (below soft threshold) + mental_health dominant → escalates to soft
    const mentalHealthPrograms = [
      'Supporto psicologico aziendale piattaforma',
      'Mental health platform aziendale',
    ];
    const result = lifeDiversityService.computeFromProgramNames(mentalHealthPrograms, 0.35, 0);
    expect(result.dominantSubcategory).toBe('mental_health');
    expect(LIFE_SUBCATEGORY_META['mental_health'].privacySensitivity).toBe('high');
    // Escalated from none → soft
    expect(result.privacyWarningLevel).toBe('soft');
  });

  it('high-sensitivity + lifeShare >= 0.55 escalates soft → hard', () => {
    const mentalHealthPrograms = [
      'Supporto psicologico aziendale piattaforma',
    ];
    const result = lifeDiversityService.computeFromProgramNames(mentalHealthPrograms, 0.58, 0);
    expect(result.dominantSubcategory).toBe('mental_health');
    // Escalated from soft → hard
    expect(result.privacyWarningLevel).toBe('hard');
  });
});

// ── Recommendations ───────────────────────────────────────────────────────────

describe('LifeDiversityService — recommendations', () => {
  it('generates recommendations for gym-heavy portfolio', () => {
    const result = lifeDiversityService.computeFromProgramNames(GYM_PROGRAMS, 0.45, 0);
    expect(result.recommendations.length).toBeGreaterThan(0);
    const ids = result.recommendations.map((r) => r.id);
    // Should recommend diversifying from fitness
    expect(ids).toContain('rec_diversify_from_fitness');
  });

  it('recommends mental_health when LIFE share is significant and no mental_health present', () => {
    const result = lifeDiversityService.computeFromProgramNames(GYM_PROGRAMS, 0.30, 0);
    const ids = result.recommendations.map((r) => r.id);
    expect(ids).toContain('rec_add_mental_health');
  });

  it('recommends care economy when no care subcategories present', () => {
    const noCarePrograms = [
      'Palestra aziendale gym',
      'Smart working policy formale',
      'Supporto psicologico aziendale',
    ];
    const result = lifeDiversityService.computeFromProgramNames(noCarePrograms, 0.25, 0);
    const ids = result.recommendations.map((r) => r.id);
    expect(ids).toContain('rec_add_care_economy');
  });

  it('generates no critical recommendations for well-diversified portfolio', () => {
    // A well-diversified portfolio with mental_health, childcare, fitness, prevention, insurance, smart_working
    const result = lifeDiversityService.computeFromProgramNames(DIVERSE_PROGRAMS, 0.38, 0);
    // Should have no 'rec_diversify_from_fitness' or 'rec_add_mental_health'
    const ids = result.recommendations.map((r) => r.id);
    expect(ids).not.toContain('rec_diversify_from_fitness');
    expect(ids).not.toContain('rec_add_mental_health');
  });
});

// ── Methodology invariants ─────────────────────────────────────────────────────

describe('LifeDiversityService — methodology invariants', () => {
  it('methodologyStatus is always pre_empirical_calibration', () => {
    const result = lifeDiversityService.computeFromProgramNames(DIVERSE_PROGRAMS, 0.38, 0);
    expect(result.methodologyStatus).toBe('pre_empirical_calibration');
  });

  it('not_kora_index_component is always true', () => {
    const result = lifeDiversityService.computeFromProgramNames(DIVERSE_PROGRAMS, 0.38, 0);
    expect(result.not_kora_index_component).toBe(true);
  });

  it('missing subcategories + active subcategories = 10', () => {
    const result = lifeDiversityService.computeFromProgramNames(DIVERSE_PROGRAMS, 0.38, 0);
    expect(result.activeSubcategories.length + result.missingSubcategories.length).toBe(10);
  });

  it('dominant subcategory share is between 0 and 1', () => {
    const result = lifeDiversityService.computeFromProgramNames(GYM_PROGRAMS, 0.45, 0);
    expect(result.dominantSubcategoryShare).toBeGreaterThanOrEqual(0);
    expect(result.dominantSubcategoryShare).toBeLessThanOrEqual(1);
  });
});

// ── Privacy boundary — no worker-level data ────────────────────────────────────

describe('LifeDiversityService — privacy boundary', () => {
  it('result contains no worker_id, pseudonym_id, or individual fields', () => {
    const result = lifeDiversityService.computeFromProgramNames(DIVERSE_PROGRAMS, 0.38, 0);
    const resultStr = JSON.stringify(result);
    expect(resultStr).not.toContain('worker_id');
    expect(resultStr).not.toContain('pseudonym_id');
    expect(resultStr).not.toContain('pib');
    expect(resultStr).not.toContain('individual');
  });

  it('canAccess returns false for WORKER role', () => {
    expect(lifeDiversityService.canAccess('WORKER')).toBe(false);
  });

  it('canAccess returns false for PARTNER role', () => {
    expect(lifeDiversityService.canAccess('PARTNER')).toBe(false);
  });

  it('canAccess returns true for COMPANY_ADMIN', () => {
    expect(lifeDiversityService.canAccess('COMPANY_ADMIN')).toBe(true);
  });

  it('computeFromBTI returns null for WORKER role', () => {
    const mockBTI = {
      id: 'test',
      company_id: 'meridiana-group',
      scenario_id: 'S1' as const,
      reporting_period: '2024-H1',
      total_people_welfare_budget: 100000,
      economic_relief_spend: 30000,
      deep_activation_spend: 70000,
      blocked_excluded_attempts: 0,
      unused_budget: 0,
      economic_relief_share: 0.30,
      deep_activation_share: 0.70,
      cost_per_activated_worker: 500,
      cost_per_deep_activated_worker: 750,
      cost_per_impact_unit: 22.5,
      activation_debt_eur: 5000,
      activation_debt_description_it: 'Test',
      reallocation_opportunity_eur: 15000,
      reallocation_opportunity_description_it: 'Test',
      equity_of_spend: 0.70,
      pillar_investment_balance: 0.55,
      bti_score: 58,
      spend_by_pillar: { LIFE: 40000, GROWTH: 20000, CONNECTION: 15000, IMPACT: 15000, LEGACY: 10000 },
      deep_activation_by_pillar: { LIFE: 28000, GROWTH: 14000, CONNECTION: 10500, IMPACT: 10500, LEGACY: 7000 },
      recommendations: [],
      currency: 'EUR',
      disclaimer: 'Test',
      informational_only: true as const,
      synthetic_demo_data: true as const,
    };
    expect(lifeDiversityService.computeFromBTI(mockBTI, 'WORKER')).toBeNull();
  });
});

// ── KORA Index formula unchanged ───────────────────────────────────────────────
// Structural verification: LifeDiversityService exports no IU, PB, PC, CQ modifiers.

describe('KORA Index formula — unchanged', () => {
  it('LifeDiversityService does not export IU formula modifiers', async () => {
    const mod = await import('@/services/life-diversity/LifeDiversityService');
    // Should not export IU formula factor names
    expect(mod).not.toHaveProperty('computeIU');
    expect(mod).not.toHaveProperty('modifyCQ');
    expect(mod).not.toHaveProperty('modifyPB');
    expect(mod).not.toHaveProperty('computeKoraIndex');
  });

  it('LifeDiversitySummary result has no kora_index_value field', () => {
    const result = lifeDiversityService.computeFromProgramNames(DIVERSE_PROGRAMS, 0.38, 0);
    expect(result).not.toHaveProperty('kora_index_value');
    expect(result).not.toHaveProperty('pb_modifier');
    expect(result).not.toHaveProperty('cq_modifier');
  });
});
