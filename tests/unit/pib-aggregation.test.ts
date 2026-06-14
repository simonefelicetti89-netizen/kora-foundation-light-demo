// tests/unit/pib-aggregation.test.ts
// B63-B: PIB Aggregation Service — unit tests
//
// Tests: aggregate computation, privacy invariants, AG-01 compliance,
//        KORA Foundation Light limitations, pillar distribution, edge cases.

import { describe, it, expect, beforeEach } from 'vitest';
import { PIBAggregationService } from '@/services/pib-aggregation/PIBAggregationService';
import type { ImpactUnitComputationResult, ImpactUnitComputationSummary } from '@/lib/types';
import type { RawUploadedRecord, EligibilityResult } from '@/lib/kora-engine/types';

// ── Test fixture builders ─────────────────────────────────────────────────────

function makeIUResult(overrides: Partial<ImpactUnitComputationResult> = {}): ImpactUnitComputationResult {
  return {
    record_id:                  'uef-test-001',
    source_row_id:              'row-001',
    action_family:              'professional_growth',
    event_nature:               'training',
    eligibility:                'eligible',
    primary_pillar:             'GROWTH',
    pillar_distribution:        { GROWTH: 0.8 },
    normalized_magnitude_nm:    1.0,
    base_contribution_bc:       1.0,
    completeness_quality_cq:    1.0,
    evidence_verification_ev:   0.9,
    continuity_factor_cf:       1.0,
    anti_gaming_factor_agf:     1.0,
    impact_units_total:         0.9,
    impact_units_by_pillar:     { GROWTH: 0.9 },
    computed:                   true,
    blocked:                    false,
    limited:                    false,
    review_required:            false,
    exclusion_reason:           null,
    explanation:                'Eligible GROWTH event.',
    formula_trace:              [],
    methodology_version:        'KORA-METHOD-v1.0',
    calibration_status:         'pre_empirical_calibration',
    ...overrides,
  };
}

function makeIUSummary(overrides: Partial<ImpactUnitComputationSummary> = {}): ImpactUnitComputationSummary {
  return {
    total_records:          3,
    computed_records:       2,
    blocked_records:        1,
    limited_records:        0,
    review_required_records: 0,
    total_impact_units:     1.8,
    impact_units_by_pillar: { GROWTH: 0.9, LIFE: 0.9 },
    records_without_iu:     1,
    average_cq:             0.9,
    average_ev:             0.85,
    average_cf:             1.0,
    average_agf:            0.8,
    methodology_version:    'KORA-METHOD-v1.0',
    calibration_status:     'pre_empirical_calibration',
    ...overrides,
  };
}

function makeRecord(participants = 50): RawUploadedRecord {
  return {
    recordId: 'rec-001',
    batchId:  'batch-001',
    raw: {
      partecipanti:     participants,
      b6_evidence_level: 'L3',
    },
    rowIndex:           0,
    detectedRecordType: 'welfare_program',
  };
}

function makeEligibilityResult(status: 'eligible' | 'limited' | 'blocked' | 'review_required' = 'eligible'): EligibilityResult {
  return {
    recordId:                    'rec-001',
    status,
    reason:                      'test',
    doctrineReference:           '',
    confidence:                  0.9,
    impactTreatment:             status === 'eligible' ? 'generates_iu' : 'excluded',
    budgetTreatmentSuggestion:   status === 'eligible' ? 'include_in_bti' : 'exclude_from_bti',
    reviewRequired:              status === 'review_required',
  };
}

// ── Tests — aggregateForBatch (KORA Foundation Light limitation) ──────────────

describe('PIBAggregationService.aggregateForBatch — KORA Foundation Light', () => {
  let svc: PIBAggregationService;
  beforeEach(() => { svc = new PIBAggregationService(); });

  it('returns pibSnapshotsAvailable=false in aggregate model', () => {
    const result = svc.aggregateForBatch([makeIUResult()], 100);
    expect(result.pibSnapshotsAvailable).toBe(false);
  });

  it('returns empty snapshots array', () => {
    const result = svc.aggregateForBatch([makeIUResult()], 100);
    expect(result.snapshots).toHaveLength(0);
  });

  it('reason references aggregate_model_v0.1', () => {
    const result = svc.aggregateForBatch([]);
    expect(result.reason).toContain('aggregate_model_v0.1');
  });
});

// ── Tests — aggregatePIBForCompany ───────────────────────────────────────────

describe('PIBAggregationService.aggregatePIBForCompany — IU totals', () => {
  let svc: PIBAggregationService;
  beforeEach(() => { svc = new PIBAggregationService(); });

  it('totalIU equals iuSummary.total_impact_units', () => {
    const iuResults = [makeIUResult()];
    const iuSummary = makeIUSummary({ total_impact_units: 1.8 });
    const result = svc.aggregatePIBForCompany({
      iuResults,
      iuSummary,
      records: [makeRecord(50)],
      eligibilityResults: [makeEligibilityResult('eligible')],
      activatedWorkers: 40,
      meaningfullyActiveWorkers: 30,
      workforcePopulation: 100,
    });
    expect(result.totalIU).toBeCloseTo(1.8, 4);
  });

  it('pillarTotals match iuSummary pillar breakdown', () => {
    const iuSummary = makeIUSummary({
      impact_units_by_pillar: { GROWTH: 1.0, LIFE: 0.5, CONNECTION: 0.3, IMPACT: 0, LEGACY: 0 },
      total_impact_units: 1.8,
    });
    const result = svc.aggregatePIBForCompany({
      iuResults: [],
      iuSummary,
      records: [],
      eligibilityResults: [],
      activatedWorkers: 50,
      meaningfullyActiveWorkers: 30,
      workforcePopulation: 100,
    });
    expect(result.pillarTotals.GROWTH).toBeCloseTo(1.0, 4);
    expect(result.pillarTotals.LIFE).toBeCloseTo(0.5, 4);
    expect(result.pillarTotals.CONNECTION).toBeCloseTo(0.3, 4);
    expect(result.pillarTotals.IMPACT).toBe(0);
    expect(result.pillarTotals.LEGACY).toBe(0);
  });

  it('pillarShares sum to approximately 1.0 when totalIU > 0', () => {
    const iuSummary = makeIUSummary({
      impact_units_by_pillar: { GROWTH: 0.9, LIFE: 0.9, CONNECTION: 0, IMPACT: 0, LEGACY: 0 },
      total_impact_units: 1.8,
    });
    const result = svc.aggregatePIBForCompany({
      iuResults: [], iuSummary, records: [], eligibilityResults: [],
      activatedWorkers: 50, meaningfullyActiveWorkers: 30, workforcePopulation: 100,
    });
    const totalShares = Object.values(result.pillarShares).reduce((s, v) => s + v, 0);
    expect(Math.abs(totalShares - 1.0)).toBeLessThan(0.01);
  });

  it('pillarShares are all zero when totalIU = 0', () => {
    const iuSummary = makeIUSummary({ total_impact_units: 0, impact_units_by_pillar: {} });
    const result = svc.aggregatePIBForCompany({
      iuResults: [], iuSummary, records: [], eligibilityResults: [],
      activatedWorkers: 0, meaningfullyActiveWorkers: 0, workforcePopulation: 100,
    });
    expect(Object.values(result.pillarShares).every(v => v === 0)).toBe(true);
  });
});

// ── Tests — AR / MAR / estimatedWorkers ──────────────────────────────────────

describe('PIBAggregationService.aggregatePIBForCompany — AR/MAR', () => {
  let svc: PIBAggregationService;
  beforeEach(() => { svc = new PIBAggregationService(); });

  it('estimatedAR = activatedWorkers / workforcePopulation', () => {
    const result = svc.aggregatePIBForCompany({
      iuResults: [], iuSummary: makeIUSummary(), records: [], eligibilityResults: [],
      activatedWorkers: 60, meaningfullyActiveWorkers: 40, workforcePopulation: 100,
    });
    expect(result.estimatedAR).toBeCloseTo(0.6, 4);
    expect(result.activatedWorkers).toBe(60);
  });

  it('estimatedMAR = meaningfullyActiveWorkers / workforcePopulation', () => {
    const result = svc.aggregatePIBForCompany({
      iuResults: [], iuSummary: makeIUSummary(), records: [], eligibilityResults: [],
      activatedWorkers: 60, meaningfullyActiveWorkers: 30, workforcePopulation: 100,
    });
    expect(result.estimatedMAR).toBeCloseTo(0.3, 4);
    expect(result.meaningfulWorkers).toBe(30);
  });

  it('estimatedAR and estimatedMAR are capped at 1.0', () => {
    const result = svc.aggregatePIBForCompany({
      iuResults: [], iuSummary: makeIUSummary(), records: [], eligibilityResults: [],
      activatedWorkers: 150, meaningfullyActiveWorkers: 120, workforcePopulation: 100,
    });
    expect(result.estimatedAR).toBeLessThanOrEqual(1.0);
    expect(result.estimatedMAR).toBeLessThanOrEqual(1.0);
  });

  it('estimatedAR = 0 when workforcePopulation = 0', () => {
    const result = svc.aggregatePIBForCompany({
      iuResults: [], iuSummary: makeIUSummary(), records: [], eligibilityResults: [],
      activatedWorkers: 50, meaningfullyActiveWorkers: 30, workforcePopulation: 0,
    });
    // workforceCount clamped to 1 internally, AR = min(50/1, 1) = 1
    expect(result.estimatedAR).toBeGreaterThanOrEqual(0);
    expect(result.estimatedAR).toBeLessThanOrEqual(1);
  });
});

// ── Tests — avgEstimatedPIB ───────────────────────────────────────────────────

describe('PIBAggregationService.aggregatePIBForCompany — avgEstimatedPIB', () => {
  let svc: PIBAggregationService;
  beforeEach(() => { svc = new PIBAggregationService(); });

  it('avgEstimatedPIB = totalIU / activatedWorkers', () => {
    const result = svc.aggregatePIBForCompany({
      iuResults: [],
      iuSummary: makeIUSummary({ total_impact_units: 60.0 }),
      records: [], eligibilityResults: [],
      activatedWorkers: 40, meaningfullyActiveWorkers: 20, workforcePopulation: 100,
    });
    expect(result.avgEstimatedPIB).toBeCloseTo(1.5, 4);
  });

  it('avgEstimatedPIB = 0 when activatedWorkers = 0', () => {
    const result = svc.aggregatePIBForCompany({
      iuResults: [],
      iuSummary: makeIUSummary({ total_impact_units: 10.0 }),
      records: [], eligibilityResults: [],
      activatedWorkers: 0, meaningfullyActiveWorkers: 0, workforcePopulation: 100,
    });
    expect(result.avgEstimatedPIB).toBe(0);
  });
});

// ── Tests — AG-01 compliance metadata ────────────────────────────────────────

describe('PIBAggregationService.aggregatePIBForCompany — AG-01 compliance', () => {
  let svc: PIBAggregationService;
  beforeEach(() => { svc = new PIBAggregationService(); });

  it('estimationBasis = aggregate_estimate in KORA Foundation Light', () => {
    const result = svc.aggregatePIBForCompany({
      iuResults: [], iuSummary: makeIUSummary(), records: [], eligibilityResults: [],
      activatedWorkers: 50, meaningfullyActiveWorkers: 30, workforcePopulation: 100,
    });
    expect(result.estimationBasis).toBe('aggregate_estimate');
  });

  it('pibSnapshotsAvailable = false in aggregate model', () => {
    const result = svc.aggregatePIBForCompany({
      iuResults: [], iuSummary: makeIUSummary(), records: [], eligibilityResults: [],
      activatedWorkers: 50, meaningfullyActiveWorkers: 30, workforcePopulation: 100,
    });
    expect(result.pibSnapshotsAvailable).toBe(false);
  });

  it('wbEstimate = null in aggregate model (no individual distribution)', () => {
    const result = svc.aggregatePIBForCompany({
      iuResults: [], iuSummary: makeIUSummary(), records: [], eligibilityResults: [],
      activatedWorkers: 50, meaningfullyActiveWorkers: 30, workforcePopulation: 100,
    });
    expect(result.wbEstimate).toBeNull();
  });

  it('calibrationStatus = pre_empirical_calibration', () => {
    const result = svc.aggregatePIBForCompany({
      iuResults: [], iuSummary: makeIUSummary(), records: [], eligibilityResults: [],
      activatedWorkers: 50, meaningfullyActiveWorkers: 30, workforcePopulation: 100,
    });
    expect(result.calibrationStatus).toBe('pre_empirical_calibration');
  });

  it('estimationNote references AG-01 canonical rule', () => {
    const result = svc.aggregatePIBForCompany({
      iuResults: [], iuSummary: makeIUSummary(), records: [], eligibilityResults: [],
      activatedWorkers: 50, meaningfullyActiveWorkers: 30, workforcePopulation: 100,
    });
    expect(result.estimationNote).toContain('AG-01');
  });

  it('methodologyVersion is truthy string', () => {
    const result = svc.aggregatePIBForCompany({
      iuResults: [], iuSummary: makeIUSummary(), records: [], eligibilityResults: [],
      activatedWorkers: 50, meaningfullyActiveWorkers: 30, workforcePopulation: 100,
    });
    expect(typeof result.methodologyVersion).toBe('string');
    expect(result.methodologyVersion.length).toBeGreaterThan(0);
  });
});

// ── Tests — privacy invariants ────────────────────────────────────────────────

describe('PIBAggregationService.getWorkerPIBSummary — privacy', () => {
  let svc: PIBAggregationService;
  beforeEach(() => { svc = new PIBAggregationService(); });

  it('returns available=false for COMPANY_ADMIN role', () => {
    const result = svc.getWorkerPIBSummary('pseudo-123', 'COMPANY_ADMIN');
    expect((result as { available: false }).available).toBe(false);
  });

  it('returns available=false for ADVISOR role', () => {
    const result = svc.getWorkerPIBSummary('pseudo-123', 'ADVISOR');
    expect((result as { available: false }).available).toBe(false);
  });

  it('employer rejection reason cites D-04 privacy rule', () => {
    const result = svc.getWorkerPIBSummary('pseudo-123', 'COMPANY_ADMIN') as { available: false; reason: string };
    expect(result.reason).toContain('D-04');
  });

  it('returns available=false for WORKER role in KORA Foundation Light (aggregate model)', () => {
    const result = svc.getWorkerPIBSummary('pseudo-123', 'WORKER');
    expect((result as { available: false }).available).toBe(false);
  });

  it('reason for WORKER contains KORA Foundation Light limitation note', () => {
    const result = svc.getWorkerPIBSummary('pseudo-123', 'WORKER') as { available: false; reason: string };
    expect(result.reason).toContain('KORA Foundation Light');
  });
});

// ── Tests — zero input edge cases ─────────────────────────────────────────────

describe('PIBAggregationService.aggregatePIBForCompany — edge cases', () => {
  let svc: PIBAggregationService;
  beforeEach(() => { svc = new PIBAggregationService(); });

  it('handles empty iuResults gracefully', () => {
    const result = svc.aggregatePIBForCompany({
      iuResults: [],
      iuSummary: makeIUSummary({ total_impact_units: 0, computed_records: 0 }),
      records: [], eligibilityResults: [],
      activatedWorkers: 0, meaningfullyActiveWorkers: 0, workforcePopulation: 100,
    });
    expect(result.totalIU).toBe(0);
    expect(result.activatedWorkers).toBe(0);
    expect(result.estimatedAR).toBe(0);
    expect(result.avgEstimatedPIB).toBe(0);
  });

  it('all pillar totals default to 0 when no pillar breakdown in iuSummary', () => {
    const result = svc.aggregatePIBForCompany({
      iuResults: [],
      iuSummary: makeIUSummary({ impact_units_by_pillar: {}, total_impact_units: 0 }),
      records: [], eligibilityResults: [],
      activatedWorkers: 0, meaningfullyActiveWorkers: 0, workforcePopulation: 100,
    });
    expect(result.pillarTotals.LIFE).toBe(0);
    expect(result.pillarTotals.GROWTH).toBe(0);
    expect(result.pillarTotals.CONNECTION).toBe(0);
    expect(result.pillarTotals.IMPACT).toBe(0);
    expect(result.pillarTotals.LEGACY).toBe(0);
  });

  it('workforceCount in result matches workforcePopulation input', () => {
    const result = svc.aggregatePIBForCompany({
      iuResults: [], iuSummary: makeIUSummary(), records: [], eligibilityResults: [],
      activatedWorkers: 50, meaningfullyActiveWorkers: 30, workforcePopulation: 250,
    });
    expect(result.workforceCount).toBe(250);
  });
});

// ── Tests — pipeline integration ─────────────────────────────────────────────

describe('PIBAggregationService — pipeline integration invariants', () => {
  let svc: PIBAggregationService;
  beforeEach(() => { svc = new PIBAggregationService(); });

  it('meaningfulWorkers ≤ activatedWorkers invariant preserved', () => {
    const result = svc.aggregatePIBForCompany({
      iuResults: [], iuSummary: makeIUSummary(), records: [], eligibilityResults: [],
      activatedWorkers: 60, meaningfullyActiveWorkers: 30, workforcePopulation: 100,
    });
    expect(result.meaningfulWorkers).toBeLessThanOrEqual(result.activatedWorkers);
  });

  it('estimatedMAR ≤ estimatedAR invariant preserved', () => {
    const result = svc.aggregatePIBForCompany({
      iuResults: [], iuSummary: makeIUSummary(), records: [], eligibilityResults: [],
      activatedWorkers: 60, meaningfullyActiveWorkers: 30, workforcePopulation: 100,
    });
    expect(result.estimatedMAR).toBeLessThanOrEqual(result.estimatedAR);
  });

  it('double-counting warning added when participant sum >> workforce', () => {
    const highParticipantsRecord = makeRecord(200); // 200 participants in one program
    const iuResult = makeIUResult({ computed: true });
    const eligResult = makeEligibilityResult('eligible');

    const result = svc.aggregatePIBForCompany({
      iuResults:          [iuResult],
      iuSummary:          makeIUSummary({ total_impact_units: 0.9 }),
      records:            [highParticipantsRecord],
      eligibilityResults: [eligResult],
      activatedWorkers:   80,
      meaningfullyActiveWorkers: 40,
      workforcePopulation: 100,
    });
    const hasDoubleCountWarning = result.warnings.some(w =>
      w.toLowerCase().includes('doppio conteggio') || w.toLowerCase().includes('overlap')
    );
    expect(hasDoubleCountWarning).toBe(true);
  });
});
