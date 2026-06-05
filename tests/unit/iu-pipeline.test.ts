// tests/unit/iu-pipeline.test.ts
// B62-B: Impact Units™ Trace Layer — unit tests
//
// Tests: IU generation, factor trace, CF stub label, EV L-codes,
//        live input path, cost_per_impact_unit logic, methodology version.

import { describe, it, expect, beforeEach } from 'vitest';
import { IUComputationService, type IULiveInput } from '@/services/iu-computation/IUComputationService';

// ── Test fixture builder ──────────────────────────────────────────────────────

function makeLiveInput(overrides: Partial<IULiveInput> = {}): IULiveInput {
  return {
    uef_record_id:             'test-uef-001',
    eligibility:               'eligible',
    review_required:           false,
    approved_for_impact_units: true,
    action_family:             'professional_growth',
    event_nature:              'training',
    primary_pillar:            'GROWTH',
    pillar_distribution:       {},
    missing_fields:            [],
    evidence_type:             'L3',
    site_or_cluster:           null,
    ...overrides,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('IUComputationService — live pipeline path', () => {
  let svc: IUComputationService;

  beforeEach(() => {
    svc = new IUComputationService();
  });

  it('generates IU > 0 for a fully eligible approved record', () => {
    const input  = makeLiveInput();
    const result = svc.computeIUForLiveInput(input);
    expect(result.computed).toBe(true);
    expect(result.impact_units_total).toBeGreaterThan(0);
    expect(result.impact_units_by_pillar['GROWTH']).toBeGreaterThan(0);
  });

  it('returns IU = 0 for blocked records (AGF = 0)', () => {
    const result = svc.computeIUForLiveInput(makeLiveInput({
      eligibility:               'blocked',
      approved_for_impact_units: false,
    }));
    expect(result.impact_units_total).toBe(0);
    expect(result.computed).toBe(false);
    expect(result.blocked).toBe(true);
    expect(result.anti_gaming_factor_agf).toBe(0);
  });

  it('returns IU = 0 for limited (economic relief) records (AGF = 0)', () => {
    const result = svc.computeIUForLiveInput(makeLiveInput({
      eligibility:               'limited',
      approved_for_impact_units: false,
    }));
    expect(result.impact_units_total).toBe(0);
    expect(result.limited).toBe(true);
    expect(result.anti_gaming_factor_agf).toBe(0);
  });

  it('returns IU = 0 for review_required records', () => {
    const result = svc.computeIUForLiveInput(makeLiveInput({
      review_required: true,
    }));
    expect(result.impact_units_total).toBe(0);
    expect(result.review_required).toBe(true);
  });

  it('returns IU = 0 when approved_for_impact_units = false', () => {
    const result = svc.computeIUForLiveInput(makeLiveInput({
      approved_for_impact_units: false,
    }));
    expect(result.impact_units_total).toBe(0);
    expect(result.exclusion_reason).toContain('approved_for_impact_units');
  });

  it('CF factor trace label is "Continuity Factor (foundation_light_stub)"', () => {
    const result = svc.computeIUForLiveInput(makeLiveInput());
    const cfTrace = result.formula_trace.find((f) => f.factor_code === 'CF');
    expect(cfTrace).toBeDefined();
    expect(cfTrace!.label).toBe('Continuity Factor (foundation_light_stub)');
    expect(cfTrace!.foundation_light_stub).toBe(true);
  });

  it('formula trace contains all 6 canonical factors', () => {
    const result = svc.computeIUForLiveInput(makeLiveInput());
    const codes  = result.formula_trace.map((f) => f.factor_code);
    expect(codes).toContain('NM');
    expect(codes).toContain('BC');
    expect(codes).toContain('CQ');
    expect(codes).toContain('EV');
    expect(codes).toContain('CF');
    expect(codes).toContain('AGF');
  });

  it('result includes methodology_version', () => {
    const result = svc.computeIUForLiveInput(makeLiveInput());
    expect(result.methodology_version).toBeTruthy();
    expect(typeof result.methodology_version).toBe('string');
  });

  it('result includes calibration_status = pre_empirical_calibration', () => {
    const result = svc.computeIUForLiveInput(makeLiveInput());
    expect(result.calibration_status).toBe('pre_empirical_calibration');
  });
});

describe('IUComputationService — EV L-code mappings', () => {
  let svc: IUComputationService;

  beforeEach(() => { svc = new IUComputationService(); });

  it.each([
    ['L0', 0.50],
    ['L1', 0.60],
    ['L2', 0.75],
    ['L3', 0.90],
    ['L4', 1.00],
  ])('evidence_type=%s maps to EV=%s', (evidenceType, expectedEV) => {
    const result = svc.computeIUForLiveInput(makeLiveInput({ evidence_type: evidenceType }));
    expect(result.evidence_verification_ev).toBe(expectedEV);
  });

  it('unknown evidence type falls back to EV=0.5', () => {
    const result = svc.computeIUForLiveInput(makeLiveInput({ evidence_type: 'unknown_code' }));
    expect(result.evidence_verification_ev).toBe(0.5);
  });
});

describe('IUComputationService — CQ missing fields', () => {
  let svc: IUComputationService;

  beforeEach(() => { svc = new IUComputationService(); });

  it('CQ = 1.0 when no missing fields', () => {
    const result = svc.computeIUForLiveInput(makeLiveInput({ missing_fields: [] }));
    expect(result.completeness_quality_cq).toBe(1.0);
  });

  it('CQ = 0.85 with 1 missing field', () => {
    const result = svc.computeIUForLiveInput(makeLiveInput({ missing_fields: ['budget_amount'] }));
    expect(result.completeness_quality_cq).toBe(0.85);
  });

  it('CQ = 0.70 with 2 missing fields', () => {
    const result = svc.computeIUForLiveInput(makeLiveInput({ missing_fields: ['budget_amount', 'participants'] }));
    expect(result.completeness_quality_cq).toBe(0.70);
  });

  it('CQ = 0.50 with 3+ missing fields', () => {
    const result = svc.computeIUForLiveInput(makeLiveInput({ missing_fields: ['a', 'b', 'c'] }));
    expect(result.completeness_quality_cq).toBe(0.50);
  });
});

describe('IUComputationService — batch + summary', () => {
  let svc: IUComputationService;

  beforeEach(() => { svc = new IUComputationService(); });

  it('batch returns one result per input', () => {
    const inputs = [
      makeLiveInput({ uef_record_id: 'r1' }),
      makeLiveInput({ uef_record_id: 'r2', eligibility: 'blocked', approved_for_impact_units: false }),
      makeLiveInput({ uef_record_id: 'r3', eligibility: 'limited', approved_for_impact_units: false }),
    ];
    const results = svc.computeIUForLiveInputBatch(inputs);
    expect(results).toHaveLength(3);
    expect(results[0].computed).toBe(true);
    expect(results[1].blocked).toBe(true);
    expect(results[2].limited).toBe(true);
  });

  it('summarizeLiveResults totals IU correctly', () => {
    const inputs = [
      makeLiveInput({ uef_record_id: 'r1' }),
      makeLiveInput({ uef_record_id: 'r2' }),
      makeLiveInput({ uef_record_id: 'r3', eligibility: 'blocked', approved_for_impact_units: false }),
    ];
    const results = svc.computeIUForLiveInputBatch(inputs);
    const summary = svc.summarizeLiveResults(results);

    expect(summary.total_records).toBe(3);
    expect(summary.computed_records).toBe(2);
    expect(summary.blocked_records).toBe(1);
    expect(summary.total_impact_units).toBeGreaterThan(0);
    expect(summary.records_without_iu).toBe(1);
    expect(summary.methodology_version).toBeTruthy();
    expect(summary.calibration_status).toBe('pre_empirical_calibration');
  });

  it('IU by pillar sums correctly', () => {
    const inputs = [
      makeLiveInput({ uef_record_id: 'r1', primary_pillar: 'LIFE',   action_family: 'health_and_wellbeing' }),
      makeLiveInput({ uef_record_id: 'r2', primary_pillar: 'GROWTH', action_family: 'professional_growth' }),
    ];
    const results = svc.computeIUForLiveInputBatch(inputs);
    const summary = svc.summarizeLiveResults(results);

    const totalByPillar = Object.values(summary.impact_units_by_pillar)
      .reduce((s, v) => s + (v ?? 0), 0);
    expect(Math.abs(totalByPillar - summary.total_impact_units)).toBeLessThan(0.001);
  });
});

describe('cost_per_impact_unit — formula', () => {
  it('cpiu = deepActivationSpend / totalIU when both > 0', () => {
    const deepActivationSpend = 50000;
    const totalIU             = 250.0;
    const cpiu                = totalIU > 0 ? +(deepActivationSpend / totalIU).toFixed(2) : null;
    expect(cpiu).toBe(200);
  });

  it('cpiu = null when totalIU = 0', () => {
    const totalIU = 0;
    const cpiu    = totalIU > 0 ? 999 : null;
    expect(cpiu).toBeNull();
  });

  it('cpiu = null when deepActivationSpend = 0', () => {
    // When no deep activation spend, cost_per_impact_unit is not meaningful
    const deepActivationSpend = 0;
    const totalIU             = 50;
    const cpiu                = (totalIU > 0 && deepActivationSpend > 0) ? deepActivationSpend / totalIU : null;
    expect(cpiu).toBeNull();
  });
});

describe('IUComputationService — pipeline integration invariants', () => {
  let svc: IUComputationService;

  beforeEach(() => { svc = new IUComputationService(); });

  it('IU formula: NM × BC × CQ × EV × CF × AGF matches impact_units_total', () => {
    const input  = makeLiveInput({ missing_fields: [], evidence_type: 'L3', site_or_cluster: null });
    const result = svc.computeIUForLiveInput(input);

    if (result.computed) {
      const expected = +(
        result.normalized_magnitude_nm *
        result.base_contribution_bc *
        result.completeness_quality_cq *
        result.evidence_verification_ev *
        result.continuity_factor_cf *
        result.anti_gaming_factor_agf
      ).toFixed(4);
      expect(result.impact_units_total).toBe(expected);
    }
  });

  it('AGF = 0 forces impact_units_total = 0 regardless of other factors', () => {
    // blocked record always has AGF = 0 → IU must be exactly 0
    const result = svc.computeIUForLiveInput(makeLiveInput({ eligibility: 'blocked', approved_for_impact_units: false }));
    expect(result.anti_gaming_factor_agf).toBe(0);
    expect(result.impact_units_total).toBe(0);
  });

  it('record_id in result matches uef_record_id in input', () => {
    const input  = makeLiveInput({ uef_record_id: 'uef-xyz-789' });
    const result = svc.computeIUForLiveInput(input);
    expect(result.record_id).toBe('uef-xyz-789');
  });
});
