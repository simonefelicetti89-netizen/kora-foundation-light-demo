import { describe, it, expect } from 'vitest';
import {
  equityAccessIntelligenceService,
  EquityAccessIntelligenceService,
} from '@/services/equity-access/EquityAccessIntelligenceService';
import {
  careEconomyIntelligenceService,
  CareEconomyIntelligenceService,
  CARE_SUBCATEGORY_CODES,
} from '@/services/care-economy/CareEconomyIntelligenceService';
import {
  evidenceReliabilityIntelligenceService,
  EvidenceReliabilityIntelligenceService,
} from '@/services/evidence-reliability/EvidenceReliabilityIntelligenceService';
import type { CompanyAggregateExtended } from '@/lib/types';
import type { LifeDiversitySummary } from '@/services/life-diversity/LifeDiversityService';
import type { ImpactUnitComputationSummary, UEFReviewSummary, ConfidenceRecord } from '@/lib/types';

// ── Fixtures ──────────────────────────────────────────────────────────────────

function makeAggregate(overrides?: Partial<CompanyAggregateExtended>): CompanyAggregateExtended {
  return {
    id: 'agg-test',
    company_id: 'test-co',
    scenario_id: 'S1',
    reporting_period: '2025',
    total_workers: 250,
    eligible_worker_count: 245,
    active_worker_count: 93,
    meaningful_active_worker_count: 54,
    activation_rate: 0.38,
    meaningful_activation_rate: 0.22,
    continuity_rate: 0.28,
    verification_rate: 0.41,
    pillar_distribution: { LIFE: 0.44, GROWTH: 0.27, CONNECTION: 0.12, IMPACT: 0.11, LEGACY: 0.06 },
    department_activation: {
      'dept-operations':           0.11,
      'dept-sales':                0.38,
      'dept-hr-people':            0.88,
      'dept-product-engineering':  0.62,
      'dept-admin-finance':        0.30,
    },
    privacy_threshold_met: true,
    methodology_version_id: 'KORA Index v3 / KORA Methodology v0.1',
    calibration_status: 'pre_empirical_calibration',
    synthetic_demo_data: true,
    ...overrides,
  };
}

function makeLifeDiversitySummary(activeSubs: string[]): LifeDiversitySummary {
  const ALL: string[] = [
    'childcare', 'eldercare_caregiving', 'family_parental_support',
    'mental_health', 'physical_prevention_screening', 'physical_activity_fitness',
    'health_insurance_supplementary', 'work_life_balance', 'disconnection_meeting_free',
    'flexible_work_policies',
  ];
  return {
    lifeShare: 0.35,
    lifeTotalIU: 50000,
    activeSubcategories: activeSubs as LifeDiversitySummary['activeSubcategories'],
    dominantSubcategory: activeSubs[0] as LifeDiversitySummary['dominantSubcategory'] ?? null,
    dominantSubcategoryShare: activeSubs.length > 0 ? 1 / activeSubs.length : 0,
    diversityScore: activeSubs.length / 10,
    concentrationStatus: activeSubs.length === 0 ? 'no_life_data'
      : activeSubs.length === 1 ? 'single_category_dominant'
      : activeSubs.length <= 3 ? 'highly_concentrated'
      : activeSubs.length <= 5 ? 'moderately_concentrated'
      : 'diverse',
    privacyWarningLevel: 'none',
    privacyWarningMessage: null,
    missingSubcategories: ALL.filter((c) => !activeSubs.includes(c)) as LifeDiversitySummary['missingSubcategories'],
    recommendations: [],
    methodologyStatus: 'pre_empirical_calibration',
    not_kora_index_component: true,
  };
}

function makeIUSummary(overrides?: Partial<ImpactUnitComputationSummary>): ImpactUnitComputationSummary {
  return {
    total_records: 40,
    computed_records: 28,
    blocked_records: 5,
    limited_records: 7,
    review_required_records: 3,
    total_impact_units: 420,
    impact_units_by_pillar: { LIFE: 180, GROWTH: 115, CONNECTION: 55, IMPACT: 50, LEGACY: 20 },
    records_without_iu: 12,
    average_cq: 0.78,
    average_ev: 0.62,
    average_cf: 0.85,
    average_agf: 0.92,
    methodology_version: 'v0.1',
    calibration_status: 'pre_empirical_calibration',
    ...overrides,
  };
}

function makeUEFSummary(overrides?: Partial<UEFReviewSummary>): UEFReviewSummary {
  return {
    total_records: 40,
    pending_count: 4,
    approved_for_scoring_count: 24,
    approved_for_bti_governance_count: 7,
    blocked_count: 5,
    needs_more_data_count: 2,
    rejected_count: 0,
    override_count: 1,
    kora_ready_for_iu_count: 24,
    kora_ready_for_bti_count: 7,
    review_completion_rate: 0.68,
    methodology_version: 'v0.1',
    calibration_status: 'pre_empirical_calibration',
    ...overrides,
  };
}

function makeConfidence(overrides?: Partial<ConfidenceRecord>): ConfidenceRecord {
  return {
    id: 'cs-test',
    company_id: 'test-co',
    scenario_id: 'S1',
    confidence_score: 0.58,
    confidence_level: 'medium',
    data_completeness: 0.72,
    evidence_quality: 0.61,
    mapping_confidence: 0.80,
    verification_weight: 0.55,
    source_coverage: {},
    gaps_identified: ['Dati LMS non caricati', 'Partecipazione volunteering non verificata'],
    limitations: 'Demo only',
    methodology_version_id: 'v0.1',
    calibration_status: 'pre_empirical_calibration',
    ...overrides,
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// EQUITY & ACCESS INTELLIGENCE
// ══════════════════════════════════════════════════════════════════════════════

describe('EquityAccessIntelligenceService — segment classification', () => {
  const svc = new EquityAccessIntelligenceService();

  it('detects under-activated segment (dept-operations: 0.11, avg: 0.38, gap: -0.27)', () => {
    const result = svc.compute(makeAggregate(), 0.42, 'COMPANY_ADMIN');
    expect(result).not.toBeNull();
    const ops = result!.underActivatedSegments.find((s) => s.segmentId === 'dept-operations');
    expect(ops).toBeDefined();
    expect(ops!.status).toBe('under_activated');
    expect(ops!.gapVsAverage).toBeCloseTo(-0.27, 2);
  });

  it('detects over-activated segment (dept-hr-people: 0.88, avg: 0.38, gap: +0.50)', () => {
    const result = svc.compute(makeAggregate(), 0.42, 'COMPANY_ADMIN');
    expect(result).not.toBeNull();
    const hr = result!.overActivatedSegments.find((s) => s.segmentId === 'dept-hr-people');
    expect(hr).toBeDefined();
    expect(hr!.status).toBe('over_activated');
  });

  it('classifies dept-sales (0.38) as near_parity when avg is 0.38', () => {
    const result = svc.compute(makeAggregate(), 0.42, 'COMPANY_ADMIN');
    expect(result).not.toBeNull();
    const sales = result!.nearParitySegments.find((s) => s.segmentId === 'dept-sales');
    expect(sales).toBeDefined();
    expect(sales!.status).toBe('near_parity');
  });

  it('computes largest gap correctly', () => {
    const result = svc.compute(makeAggregate(), 0.42, 'COMPANY_ADMIN');
    expect(result).not.toBeNull();
    // Largest gap should be dept-hr-people (0.88 - 0.38 = 0.50) or dept-operations (|0.11 - 0.38| = 0.27)
    expect(result!.largestGap).toBeGreaterThanOrEqual(0.27);
  });

  it('returns insufficient_data when no department data provided', () => {
    const aggregate = makeAggregate({ department_activation: {} });
    const result = svc.compute(aggregate, 0.42, 'COMPANY_ADMIN');
    expect(result).not.toBeNull();
    expect(result!.accessRiskLevel).toBe('insufficient_data');
  });

  it('returns null when aggregate is null', () => {
    const result = svc.compute(null, 0.42, 'COMPANY_ADMIN');
    expect(result).toBeNull();
  });

  it('returns null for WORKER role', () => {
    const result = svc.compute(makeAggregate(), 0.42, 'WORKER');
    expect(result).toBeNull();
  });

  it('returns null for PARTNER role', () => {
    const result = svc.compute(makeAggregate(), 0.42, 'PARTNER');
    expect(result).toBeNull();
  });

  it('suppressed segments are not included in visible count', () => {
    const result = svc.compute(makeAggregate(), 0.42, 'COMPANY_ADMIN');
    expect(result).not.toBeNull();
    // Since we supply no groups, suppressedSegmentCount should be 0
    expect(result!.suppressedSegmentCount).toBe(0);
    expect(result!.visibleSegmentCount).toBeGreaterThan(0);
  });
});

describe('EquityAccessIntelligenceService — methodology invariants', () => {
  it('methodologyStatus is always pre_empirical_calibration', () => {
    const result = equityAccessIntelligenceService.compute(makeAggregate(), 0.42, 'COMPANY_ADMIN');
    expect(result!.methodologyStatus).toBe('pre_empirical_calibration');
  });

  it('notKoraIndexComponent is always true', () => {
    const result = equityAccessIntelligenceService.compute(makeAggregate(), 0.42, 'COMPANY_ADMIN');
    expect(result!.notKoraIndexComponent).toBe(true);
  });

  it('result contains no worker_id or pseudonym_id', () => {
    const result = equityAccessIntelligenceService.compute(makeAggregate(), 0.42, 'COMPANY_ADMIN');
    const str = JSON.stringify(result);
    expect(str).not.toContain('worker_id');
    expect(str).not.toContain('pseudonym_id');
    expect(str).not.toContain('pib');
    expect(str).not.toContain('individual');
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// CARE ECONOMY INTELLIGENCE
// ══════════════════════════════════════════════════════════════════════════════

describe('CareEconomyIntelligenceService — coverage status', () => {
  const svc = new CareEconomyIntelligenceService();

  it('no care subcategories → status absent, careCoverageScore = 0', () => {
    const diversity = makeLifeDiversitySummary(['physical_activity_fitness', 'mental_health']);
    const result = svc.computeFromDiversity(diversity);
    expect(result.careEconomyStatus).toBe('absent');
    expect(result.careCoverageScore).toBe(0);
    expect(result.activeCareSubcategories).toHaveLength(0);
    expect(result.missingCareSubcategories).toHaveLength(3);
  });

  it('one care subcategory → status limited, careCoverageScore = 1/3', () => {
    const diversity = makeLifeDiversitySummary(['physical_activity_fitness', 'childcare']);
    const result = svc.computeFromDiversity(diversity);
    expect(result.careEconomyStatus).toBe('limited');
    expect(result.careCoverageScore).toBeCloseTo(1 / 3, 3);
    expect(result.activeCareSubcategories).toHaveLength(1);
  });

  it('two care subcategories → status developing, careCoverageScore = 2/3', () => {
    const diversity = makeLifeDiversitySummary(['childcare', 'eldercare_caregiving']);
    const result = svc.computeFromDiversity(diversity);
    expect(result.careEconomyStatus).toBe('developing');
    expect(result.careCoverageScore).toBeCloseTo(2 / 3, 3);
  });

  it('three care subcategories → status broad, careCoverageScore = 1', () => {
    const diversity = makeLifeDiversitySummary(['childcare', 'eldercare_caregiving', 'family_parental_support']);
    const result = svc.computeFromDiversity(diversity);
    expect(result.careEconomyStatus).toBe('broad');
    expect(result.careCoverageScore).toBe(1);
    expect(result.activeCareSubcategories).toHaveLength(3);
    expect(result.missingCareSubcategories).toHaveLength(0);
  });

  it('activeCareSubcategories + missingCareSubcategories = 3', () => {
    const diversity = makeLifeDiversitySummary(['childcare', 'physical_activity_fitness']);
    const result = svc.computeFromDiversity(diversity);
    expect(result.activeCareSubcategories.length + result.missingCareSubcategories.length).toBe(3);
  });

  it('narrative does not contain worker-inference language', () => {
    const diversity = makeLifeDiversitySummary([]);
    const result = svc.computeFromDiversity(diversity);
    // Should not say "i lavoratori hanno" or "i dipendenti necessitano"
    expect(result.narrative.toLowerCase()).not.toContain('lavoratori hanno');
    expect(result.narrative.toLowerCase()).not.toContain('dipendenti necessitano');
    expect(result.narrative.toLowerCase()).not.toContain('your workers need');
    // Should say "portfolio" or "iniziative"
    expect(result.narrative.toLowerCase()).toMatch(/portfolio|iniziative/);
  });

  it('privacyNote is present and mentions aggregate-level', () => {
    const diversity = makeLifeDiversitySummary(['childcare']);
    const result = svc.computeFromDiversity(diversity);
    expect(result.privacyNote).toBeTruthy();
    expect(result.privacyNote.toLowerCase()).toMatch(/portfolio|individu/);
  });
});

describe('CareEconomyIntelligenceService — access control', () => {
  it('returns null for WORKER role', () => {
    const diversity = makeLifeDiversitySummary(['childcare']);
    const result = careEconomyIntelligenceService.compute(diversity, 'WORKER');
    expect(result).toBeNull();
  });

  it('returns null for PARTNER role', () => {
    const diversity = makeLifeDiversitySummary(['childcare']);
    const result = careEconomyIntelligenceService.compute(diversity, 'PARTNER');
    expect(result).toBeNull();
  });

  it('returns result for COMPANY_ADMIN', () => {
    const diversity = makeLifeDiversitySummary(['childcare']);
    const result = careEconomyIntelligenceService.compute(diversity, 'COMPANY_ADMIN');
    expect(result).not.toBeNull();
  });

  it('CARE_SUBCATEGORY_CODES contains exactly 3 codes', () => {
    expect(CARE_SUBCATEGORY_CODES).toHaveLength(3);
    expect(CARE_SUBCATEGORY_CODES).toContain('childcare');
    expect(CARE_SUBCATEGORY_CODES).toContain('eldercare_caregiving');
    expect(CARE_SUBCATEGORY_CODES).toContain('family_parental_support');
  });
});

describe('CareEconomyIntelligenceService — methodology invariants', () => {
  it('methodologyStatus is always pre_empirical_calibration', () => {
    const diversity = makeLifeDiversitySummary([]);
    const result = careEconomyIntelligenceService.computeFromDiversity(diversity);
    expect(result.methodologyStatus).toBe('pre_empirical_calibration');
  });

  it('notKoraIndexComponent is always true', () => {
    const diversity = makeLifeDiversitySummary(['childcare']);
    const result = careEconomyIntelligenceService.computeFromDiversity(diversity);
    expect(result.notKoraIndexComponent).toBe(true);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// EVIDENCE RELIABILITY INTELLIGENCE
// ══════════════════════════════════════════════════════════════════════════════

describe('EvidenceReliabilityIntelligenceService — evidence classification', () => {
  const svc = new EvidenceReliabilityIntelligenceService();

  it('low average_ev (< 0.65) → weak primary tier', () => {
    const result = svc.computeFromData(
      makeIUSummary({ average_ev: 0.55 }),
      makeUEFSummary(),
      makeConfidence(),
    );
    expect(result.evidenceLevelDistribution.primaryTier).toBe('weak');
    expect(result.evidenceRiskLevel).toBe('alta');
  });

  it('medium average_ev (0.65–0.84) → acceptable primary tier', () => {
    const result = svc.computeFromData(
      makeIUSummary({ average_ev: 0.72 }),
      makeUEFSummary({ pending_count: 0, needs_more_data_count: 0, review_completion_rate: 0.85 }),
      makeConfidence({ gaps_identified: [] }),
    );
    expect(result.evidenceLevelDistribution.primaryTier).toBe('acceptable');
  });

  it('high average_ev (>= 0.85) → strong primary tier', () => {
    const result = svc.computeFromData(
      makeIUSummary({ average_ev: 0.92 }),
      makeUEFSummary({ pending_count: 0, needs_more_data_count: 0, review_completion_rate: 0.95 }),
      makeConfidence({ gaps_identified: [] }),
    );
    expect(result.evidenceLevelDistribution.primaryTier).toBe('strong');
    expect(result.evidenceRiskLevel).toBe('bassa');
  });

  it('weak evidence initiatives count is non-negative integer', () => {
    const result = svc.computeFromData(makeIUSummary(), makeUEFSummary(), makeConfidence());
    expect(result.weakEvidenceInitiativeCount).toBeGreaterThanOrEqual(0);
    expect(Number.isInteger(result.weakEvidenceInitiativeCount)).toBe(true);
  });

  it('evidenceLevelDistribution shares sum to approximately 1', () => {
    const result = svc.computeFromData(makeIUSummary(), makeUEFSummary(), makeConfidence());
    const dist = result.evidenceLevelDistribution;
    expect(dist.weakShare + dist.acceptableShare + dist.strongShare).toBeCloseTo(1, 1);
  });
});

describe('EvidenceReliabilityIntelligenceService — upgrade opportunities', () => {
  it('generates upgrade opportunity when pending records exist', () => {
    const result = evidenceReliabilityIntelligenceService.computeFromData(
      makeIUSummary({ average_ev: 0.60 }),
      makeUEFSummary({ pending_count: 5 }),
      makeConfidence(),
    );
    expect(result.upgradeOpportunities.length).toBeGreaterThan(0);
    const pendingOpp = result.upgradeOpportunities.find((o) => o.area.includes('5 record'));
    expect(pendingOpp).toBeDefined();
    expect(pendingOpp!.priority).toBe('alta');
  });

  it('generates upgrade opportunity from gaps_identified', () => {
    const result = evidenceReliabilityIntelligenceService.computeFromData(
      makeIUSummary({ average_ev: 0.72 }),
      makeUEFSummary({ pending_count: 0 }),
      makeConfidence({ gaps_identified: ['LMS missing', 'HR data incomplete'] }),
    );
    const gapOpp = result.upgradeOpportunities.find((o) => o.area.includes('Gap'));
    expect(gapOpp).toBeDefined();
  });

  it('advisor narrative is generated', () => {
    const result = evidenceReliabilityIntelligenceService.computeFromData(
      makeIUSummary(),
      makeUEFSummary(),
      makeConfidence(),
    );
    expect(result.advisorNarrative).toBeTruthy();
    expect(result.advisorNarrative.length).toBeGreaterThan(20);
  });

  it('does not simulate numeric CS improvement (no cs_will_increase)', () => {
    const result = evidenceReliabilityIntelligenceService.computeFromData(
      makeIUSummary(),
      makeUEFSummary(),
      makeConfidence(),
    );
    const str = JSON.stringify(result).toLowerCase();
    // Must not make causal claims about exact CS values
    expect(str).not.toContain('cs salirà');
    expect(str).not.toContain('cs aumenterà di');
    expect(str).not.toContain('cs will increase by');
  });
});

describe('EvidenceReliabilityIntelligenceService — access control', () => {
  it('returns null for WORKER role', () => {
    const result = evidenceReliabilityIntelligenceService.compute(
      makeIUSummary(), makeUEFSummary(), makeConfidence(), 'WORKER',
    );
    expect(result).toBeNull();
  });

  it('returns null for PARTNER role', () => {
    const result = evidenceReliabilityIntelligenceService.compute(
      makeIUSummary(), makeUEFSummary(), makeConfidence(), 'PARTNER',
    );
    expect(result).toBeNull();
  });

  it('returns result for ADVISOR role', () => {
    const result = evidenceReliabilityIntelligenceService.compute(
      makeIUSummary(), makeUEFSummary(), makeConfidence(), 'ADVISOR',
    );
    expect(result).not.toBeNull();
  });

  it('returns result for COMPANY_ADMIN role', () => {
    const result = evidenceReliabilityIntelligenceService.compute(
      makeIUSummary(), makeUEFSummary(), makeConfidence(), 'COMPANY_ADMIN',
    );
    expect(result).not.toBeNull();
  });
});

describe('EvidenceReliabilityIntelligenceService — methodology invariants', () => {
  it('methodologyStatus is always pre_empirical_calibration', () => {
    const result = evidenceReliabilityIntelligenceService.computeFromData(null, null, null);
    expect(result.methodologyStatus).toBe('pre_empirical_calibration');
  });

  it('notKoraIndexComponent is always true', () => {
    const result = evidenceReliabilityIntelligenceService.computeFromData(
      makeIUSummary(), makeUEFSummary(), makeConfidence(),
    );
    expect(result.notKoraIndexComponent).toBe(true);
  });

  it('result contains no worker-level data fields', () => {
    const result = evidenceReliabilityIntelligenceService.computeFromData(
      makeIUSummary(), makeUEFSummary(), makeConfidence(),
    );
    const str = JSON.stringify(result);
    expect(str).not.toContain('worker_id');
    expect(str).not.toContain('pseudonym_id');
    expect(str).not.toContain('pib');
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// CROSS-LAYER INVARIANTS
// ══════════════════════════════════════════════════════════════════════════════

describe('KORA Index formula — all intelligence layers unchanged', () => {
  it('EquityAccessIntelligenceService exports no IU formula modifiers', async () => {
    const mod = await import('@/services/equity-access/EquityAccessIntelligenceService');
    expect(mod).not.toHaveProperty('computeIU');
    expect(mod).not.toHaveProperty('modifyEQ');
    expect(mod).not.toHaveProperty('computeKoraIndex');
  });

  it('CareEconomyIntelligenceService exports no IU formula modifiers', async () => {
    const mod = await import('@/services/care-economy/CareEconomyIntelligenceService');
    expect(mod).not.toHaveProperty('computeIU');
    expect(mod).not.toHaveProperty('modifyPB');
    expect(mod).not.toHaveProperty('computeKoraIndex');
  });

  it('EvidenceReliabilityIntelligenceService exports no CS/VR formula modifiers', async () => {
    const mod = await import('@/services/evidence-reliability/EvidenceReliabilityIntelligenceService');
    expect(mod).not.toHaveProperty('computeIU');
    expect(mod).not.toHaveProperty('modifyCS');
    expect(mod).not.toHaveProperty('computeKoraIndex');
  });

  it('EquityAccessSummary has no kora_index_value field', () => {
    const result = equityAccessIntelligenceService.compute(makeAggregate(), 0.42, 'COMPANY_ADMIN');
    expect(result).not.toHaveProperty('kora_index_value');
    expect(result).not.toHaveProperty('eq_modifier');
  });

  it('CareEconomySummary has no kora_index_value field', () => {
    const diversity = makeLifeDiversitySummary(['childcare']);
    const result = careEconomyIntelligenceService.computeFromDiversity(diversity);
    expect(result).not.toHaveProperty('kora_index_value');
    expect(result).not.toHaveProperty('pc_modifier');
  });

  it('EvidenceReliabilitySummary has no kora_index_value field', () => {
    const result = evidenceReliabilityIntelligenceService.computeFromData(
      makeIUSummary(), makeUEFSummary(), makeConfidence(),
    );
    expect(result).not.toHaveProperty('kora_index_value');
    expect(result).not.toHaveProperty('vr_modifier');
  });
});
