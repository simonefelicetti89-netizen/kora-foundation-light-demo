// tests/unit/regime-classification.test.ts
// Regime classification tests — derived from componentDetail.eqwStatus / eqsStatus only.
//
// T_REG1: no workforceGroups, no uniqueActiveWorkersByDept → regime='fl_base'
// T_REG2: workforceGroups only (no uniqueActiveWorkersByDept) → regime='fl_base'
//         (workforceGroups alone is not enough — EQS still insufficient_data)
// T_REG3: workforceGroups + uniqueActiveWorkersByDept + ≥2 matching depts → EQS computed → regime='fl_enriched'
// T_REG4: perWorkerIU + group equity inputs → EQW computed + EQS computed → regime='pilot_plus'
//         (Pilot+ path is unit-tested against computeEQw/computeEQs directly — pipeline
//          always uses null perWorkerIU in Foundation Light)
//
// All fixtures are synthetic — no real company or worker data.

import { describe, it, expect } from 'vitest';
import { runKoraPipeline } from '@/lib/kora-engine/run-kora-pipeline';
import { computeEQw, computeEQs } from '@/lib/kora-engine/component-engine';
import type { RawUploadedRecord, ComponentStatus, RegimeType } from '@/lib/kora-engine/types';
import type { WorkforceAggregateGroup } from '@/lib/types';

// Mirror of the canonical rule in run-kora-pipeline Step 18.
// Used in T_REG4 to validate the ternary logic independently of pipeline internals.
function deriveRegime(eqwStatus: ComponentStatus, eqsStatus: ComponentStatus): RegimeType {
  if (eqwStatus === 'computed' && eqsStatus === 'computed') return 'pilot_plus';
  if (eqsStatus === 'computed') return 'fl_enriched';
  return 'fl_base';
}

// ── Shared fixture ────────────────────────────────────────────────────────────

function makeRecord(id: string, dipartimento?: string): RawUploadedRecord {
  return {
    recordId:           id,
    batchId:            'regime-test',
    rowIndex:           0,
    detectedRecordType: 'welfare_program',
    raw: {
      nome_iniziativa:      'Corso formazione professionale ricorrente mensile',
      categoria:            'corso formazione professionale upskilling',
      partecipanti:         '30',
      forza_lavoro:         '100',
      importo:              '8000',
      b6_evidence_level:    'L2',
      b6_approved_for_iu:   true,
      participants:         30,
      dipartimento:         dipartimento ?? 'IT',
      reviewed_by_uef:      true,
      reviewed_eligibility: 'eligible',
    },
  };
}

function makeWorkforceGroup(label: string, count: number): WorkforceAggregateGroup {
  return {
    group_id:              `grp-${label}`,
    company_id:            'test-company',
    dimension_type:        'department',
    dimension_label:       label,
    employee_count:        count,
    share_of_workforce:    count / 100,
    privacy_threshold:     10,
    privacy_threshold_met: true,
    included_in_breakdown: true,
    data_completeness:     1,
  };
}

const BASE_RECORDS = [
  makeRecord('r1', 'IT'),
  makeRecord('r2', 'HR'),
];

// ── T_REG1: no group equity inputs → fl_base ─────────────────────────────────

describe('T_REG1 — no workforceGroups, no uniqueActiveWorkersByDept → fl_base', () => {

  it('regime is fl_base when neither input is provided', () => {
    const result = runKoraPipeline({
      tenantId:           'reg1-no-inputs',
      records:             BASE_RECORDS,
      workforcePopulation: 100,
      // workforceGroups and uniqueActiveWorkersByDept deliberately omitted
    });

    expect(result.regime).toBe('fl_base');
  });

  it('eqsStatus is insufficient_data and eqsSource=no_group_equity_inputs', () => {
    const result = runKoraPipeline({
      tenantId: 'reg1-eqs-source',
      records:   BASE_RECORDS,
      workforcePopulation: 100,
    });

    const cd = result.koraIndex.componentDetail;
    expect(cd?.eqsStatus).toBe('insufficient_data');
    expect(cd?.eqsSource).toBe('no_group_equity_inputs');
  });

  it('EQUITY macroblock ≤ 50 (EQW + EQS both 0)', () => {
    const result = runKoraPipeline({
      tenantId: 'reg1-equity-cap',
      records:   BASE_RECORDS,
      workforcePopulation: 100,
    });
    expect(result.koraIndex.macroblocks.distributionEquity).toBeLessThanOrEqual(50);
  });

});

// ── T_REG2: workforceGroups only → fl_base ────────────────────────────────────

describe('T_REG2 — workforceGroups only (no uniqueActiveWorkersByDept) → fl_base', () => {

  it('regime is fl_base even when workforceGroups is provided without uniqueActiveWorkersByDept', () => {
    const result = runKoraPipeline({
      tenantId: 'reg2-groups-only',
      records:   BASE_RECORDS,
      workforcePopulation: 100,
      workforceGroups: [
        makeWorkforceGroup('IT', 50),
        makeWorkforceGroup('HR', 50),
      ],
      // uniqueActiveWorkersByDept deliberately omitted
    });

    expect(result.regime).toBe('fl_base');
  });

  it('eqsStatus is insufficient_data with source=no_unique_active_workers_by_group', () => {
    const result = runKoraPipeline({
      tenantId: 'reg2-eqs-source',
      records:   BASE_RECORDS,
      workforcePopulation: 100,
      workforceGroups: [
        makeWorkforceGroup('IT', 50),
        makeWorkforceGroup('HR', 50),
      ],
    });

    const cd = result.koraIndex.componentDetail;
    expect(cd?.eqsStatus).toBe('insufficient_data');
    expect(cd?.eqsSource).toBe('no_unique_active_workers_by_group');
  });

});

// ── T_REG3: workforceGroups + uniqueActiveWorkersByDept + EQS computed → fl_enriched ──

describe('T_REG3 — workforceGroups + uniqueActiveWorkersByDept + ≥2 depts → fl_enriched', () => {

  it('regime is fl_enriched when both inputs provided and EQS computed', () => {
    const result = runKoraPipeline({
      tenantId: 'reg3-enriched',
      records:   BASE_RECORDS,
      workforcePopulation: 100,
      workforceGroups: [
        makeWorkforceGroup('IT', 50),
        makeWorkforceGroup('HR', 50),
      ],
      uniqueActiveWorkersByDept: {
        IT: 15,
        HR: 12,
      },
    });

    expect(result.regime).toBe('fl_enriched');
  });

  it('eqsStatus is computed and eqsSource=dept_activation_rate_cov', () => {
    const result = runKoraPipeline({
      tenantId: 'reg3-eqs-computed',
      records:   BASE_RECORDS,
      workforcePopulation: 100,
      workforceGroups: [
        makeWorkforceGroup('IT', 50),
        makeWorkforceGroup('HR', 50),
      ],
      uniqueActiveWorkersByDept: {
        IT: 15,
        HR: 12,
      },
    });

    const cd = result.koraIndex.componentDetail;
    expect(cd?.eqsStatus).toBe('computed');
    expect(cd?.eqsSource).toBe('dept_activation_rate_cov');
  });

  it('eqwStatus is still insufficient_data in fl_enriched (no perWorkerIU in Foundation Light)', () => {
    const result = runKoraPipeline({
      tenantId: 'reg3-eqw-still-insufficient',
      records:   BASE_RECORDS,
      workforcePopulation: 100,
      workforceGroups: [
        makeWorkforceGroup('IT', 50),
        makeWorkforceGroup('HR', 50),
      ],
      uniqueActiveWorkersByDept: { IT: 15, HR: 12 },
    });

    const cd = result.koraIndex.componentDetail;
    expect(cd?.eqwStatus).toBe('insufficient_data');
  });

  it('EQUITY macroblock ≤ 70 in fl_enriched (EQW still 0, EQS now contributes 0.20 weight)', () => {
    const result = runKoraPipeline({
      tenantId: 'reg3-equity-cap',
      records:   BASE_RECORDS,
      workforcePopulation: 100,
      workforceGroups: [
        makeWorkforceGroup('IT', 50),
        makeWorkforceGroup('HR', 50),
      ],
      uniqueActiveWorkersByDept: { IT: 15, HR: 12 },
    });
    expect(result.koraIndex.macroblocks.distributionEquity).toBeLessThanOrEqual(70);
  });

});

// ── T_REG4: Pilot+ — EQW + EQS both computed (unit test via component engine) ─

describe('T_REG4 — Pilot+: EQW computed + EQS computed (unit test on component functions)', () => {

  it('computeEQw returns computed when perWorkerIU array is provided', () => {
    const { eqw, eqwStatus } = computeEQw([10, 15, 8, 20, 12]);
    expect(eqwStatus).toBe('computed');
    expect(eqw).toBeGreaterThan(0);
    expect(eqw).toBeLessThanOrEqual(1);
  });

  it('computeEQs returns computed when ≥2 segments with headcount provided', () => {
    const { eqs, eqsStatus, eqsSource } = computeEQs({
      'dept-a': { activeUniqueWorkers: 12, headcount: 30 },
      'dept-b': { activeUniqueWorkers: 10, headcount: 25 },
      'dept-c': { activeUniqueWorkers: 8,  headcount: 20 },
    });
    expect(eqsStatus).toBe('computed');
    expect(eqsSource).toBe('dept_activation_rate_cov');
    expect(eqs).toBeGreaterThan(0);
  });

  it('Pilot+ regime condition: eqwStatus=computed AND eqsStatus=computed', () => {
    expect(deriveRegime('computed', 'computed')).toBe('pilot_plus');
  });

  it('fl_enriched condition: eqsStatus=computed AND eqwStatus=insufficient_data', () => {
    expect(deriveRegime('insufficient_data', 'computed')).toBe('fl_enriched');
  });

  it('fl_base condition: both insufficient_data', () => {
    expect(deriveRegime('insufficient_data', 'insufficient_data')).toBe('fl_base');
  });

});

// ── Regime for insufficient_data scoringMode ──────────────────────────────────

describe('Regime — insufficient_data scoringMode always fl_base', () => {

  it('empty records → scoringMode=insufficient_data, regime=fl_base', () => {
    const result = runKoraPipeline({
      tenantId: 'reg-empty',
      records:   [],
      workforcePopulation: 100,
    });
    expect(result.scoringMode).toBe('insufficient_data');
    expect(result.regime).toBe('fl_base');
  });

});
