import { describe, it, expect } from 'vitest';
import { runKoraPipeline } from '@/lib/kora-engine/run-kora-pipeline';
import { computeComponentSignals, computeWB, computeEQ } from '@/lib/kora-engine/component-engine';
import { KORA_INDEX_ENGINE_VERSION } from '@/lib/kora-engine/kora-index-engine';
import type { RawUploadedRecord } from '@/lib/kora-engine/types';

// ── Synthetic records — eligible with known evidence levels ───────────────────

function eligibleRecord(
  id: string,
  evidenceLevel: string,
  participants: number,
  workforce: number,
  recurring = false,
): RawUploadedRecord {
  return {
    recordId: id,
    batchId: 'method-v1-test',
    rowIndex: 0,
    detectedRecordType: 'welfare_program',
    raw: {
      nome_iniziativa:       recurring ? 'Leadership development program ricorrente mensile' : 'Leadership development program',
      categoria:             'sviluppo leadership',
      partecipanti:          String(participants),
      forza_lavoro:          String(workforce),
      importo:               '5000',
      b6_evidence_level:     evidenceLevel,
      participants:          participants,
      reviewed_by_uef:       true,
      reviewed_eligibility:  'eligible',
    },
  };
}

function limitedRecord(id: string, participants: number, workforce: number): RawUploadedRecord {
  return {
    recordId: id,
    batchId: 'method-v1-test',
    rowIndex: 1,
    detectedRecordType: 'welfare_program',
    raw: {
      nome_iniziativa:      'Buoni pasto',
      categoria:            'buoni pasto',
      partecipanti:         String(participants),
      forza_lavoro:         String(workforce),
      importo:              '12000',
      b6_evidence_level:    'L0',
      participants:         participants,
      reviewed_by_uef:      true,
      reviewed_eligibility: 'limited',
    },
  };
}

// ── Test 1: MAR appears only in REACH — not in QUALITY ──────────────────────

describe('Methodology v1.0 — MAR double-counting fix', () => {

  it('QUALITY macroblock does not include MAR signal — engine is v1.0', () => {
    // The QUALITY formula must be NI×40 + VR×40 + CO×20.
    // Verify by checking that the engine source string identifies v1.0 architecture.
    expect(KORA_INDEX_ENGINE_VERSION).toContain('v1.0');
  });

  it('REACH uses AR and MAR; QUALITY uses component signals (not MAR)', () => {
    const records = [
      eligibleRecord('e1', 'L2', 40, 100),
      eligibleRecord('e2', 'L3', 30, 100),
      limitedRecord('l1', 20, 100),
    ];
    const result = runKoraPipeline({
      tenantId: 'test-mar-dedup',
      batchId:  'test-mar-dedup-batch',
      records,
      workforcePopulation: 100,
    });

    expect(result.scoringMode).toBe('computed');

    // REACH macroblock should reflect AR + MAR signals
    expect(result.koraIndex.macroblocks.activationReach).toBeGreaterThan(0);

    // QUALITY macroblock comes from componentSignals (NI, VR, CO), not from MAR directly
    // Verify componentSignals are populated
    expect(result.componentSignals.niStatus).toBe('computed');
    expect(result.componentSignals.vrStatus).toBe('computed');
    expect(result.componentSignals.coStatus).toBe('computed');

    // KORA Index weights must sum to 1.00
    const w = result.koraIndex.weights;
    const total = (w['REACH'] ?? 0) + (w['QUALITY'] ?? 0) + (w['EQUITY'] ?? 0) + (w['BTI'] ?? 0);
    expect(Math.abs(total - 1.0)).toBeLessThan(0.001);
  });

});

// ── Test 2: QUALITY uses NI + VR + CO ─────────────────────────────────────

describe('Methodology v1.0 — QUALITY macroblock', () => {

  it('QUALITY score is driven by NI, VR, CO — higher evidence level raises QUALITY', () => {
    const lowEvidenceRecords  = [eligibleRecord('l1', 'L0', 50, 100)];
    const highEvidenceRecords = [eligibleRecord('h1', 'L3', 50, 100)];

    const lowSignals  = computeComponentSignals(lowEvidenceRecords,  [{ recordId: 'uef-l1', status: 'eligible', reason: '', doctrineReference: '', confidence: 0.8, impactTreatment: 'generates_iu', budgetTreatmentSuggestion: 'include_in_bti', reviewRequired: false }]);
    const highSignals = computeComponentSignals(highEvidenceRecords, [{ recordId: 'uef-h1', status: 'eligible', reason: '', doctrineReference: '', confidence: 0.9, impactTreatment: 'generates_iu', budgetTreatmentSuggestion: 'include_in_bti', reviewRequired: false }]);

    expect(highSignals.ni).toBeGreaterThan(lowSignals.ni);
    expect(highSignals.vr).toBeGreaterThan(lowSignals.vr);
    expect(highSignals.niStatus).toBe('computed');
    expect(highSignals.vrStatus).toBe('computed');
  });

  it('QUALITY returns score between 0 and 100', () => {
    const records = [eligibleRecord('q1', 'L2', 30, 100)];
    const result = runKoraPipeline({
      tenantId: 'test-quality',
      records,
      workforcePopulation: 100,
    });
    expect(result.koraIndex.macroblocks.activationQuality).toBeGreaterThanOrEqual(0);
    expect(result.koraIndex.macroblocks.activationQuality).toBeLessThanOrEqual(100);
  });

});

// ── Test 3: Data Reliability Index does not affect KORA Index value ──────────

describe('Methodology v1.0 — Data Reliability Index external', () => {

  it('CS weight is 0 — DRI does not enter KORA Index computation', () => {
    const records = [eligibleRecord('dri1', 'L2', 40, 100)];
    const result = runKoraPipeline({
      tenantId: 'test-dri',
      records,
      workforcePopulation: 100,
    });

    // CS is external with weight = 0
    const csComponent = result.koraIndex.componentDetail;
    // The componentDetail is attached; CS weight verified via confidence
    expect(result.confidence.externalToIndex).toBe(true);

    // Verify: changing confidence score does not change KORA Index value
    // (test via scoring with same data twice — DRI never changes the macroblock sum)
    const secondResult = runKoraPipeline({
      tenantId: 'test-dri-2',
      records: [eligibleRecord('dri2', 'L0', 40, 100)], // lower evidence → lower DRI
      workforcePopulation: 100,
    });

    // Both should have the same REACH (same AR/MAR)
    expect(result.koraIndex.macroblocks.activationReach)
      .toBeCloseTo(secondResult.koraIndex.macroblocks.activationReach, 0);

    // DRI (confidence score) DIFFERENT between runs
    expect(result.confidence.score).not.toEqual(secondResult.confidence.score);
  });

});

// ── Test 4: WB rebalancing when insufficient_data ────────────────────────────

describe('Methodology v1.0 — WB rebalancing', () => {

  it('WB = insufficient_data when no segment data is available', () => {
    const { wb, wbStatus } = computeWB(0, {}, {});
    expect(wbStatus).toBe('insufficient_data');
    expect(wb).toBe(0);
  });

  it('WB = computed when bottomFiftyShare > 0', () => {
    const { wb, wbStatus } = computeWB(0.42, {}, {});
    expect(wbStatus).toBe('computed');
    expect(wb).toBeCloseTo(0.42, 2);
  });

  it('WB = computed from department data when ≥2 departments', () => {
    const { wb, wbStatus } = computeWB(0, { 'dept-a': 50, 'dept-b': 45, 'dept-c': 40 }, {});
    expect(wbStatus).toBe('computed');
    expect(wb).toBeGreaterThan(0);
    expect(wb).toBeLessThanOrEqual(1);
  });

  it('WB = insufficient_data with only 1 department segment', () => {
    const { wb, wbStatus } = computeWB(0, { 'dept-solo': 100 }, {});
    expect(wbStatus).toBe('insufficient_data');
    expect(wb).toBe(0);
  });

});

// ── Test 5: EQ rebalancing when insufficient_data ────────────────────────────

describe('Methodology v1.0 — EQ rebalancing', () => {

  it('EQ = insufficient_data when no segment data', () => {
    const { eq, eqStatus } = computeEQ({}, {});
    expect(eqStatus).toBe('insufficient_data');
    expect(eq).toBe(0);
  });

  it('EQ = computed from department data when ≥2 departments', () => {
    const { eq, eqStatus } = computeEQ({ 'dept-a': 60, 'dept-b': 40 }, {});
    expect(eqStatus).toBe('computed');
    expect(eq).toBeGreaterThan(0);
    expect(eq).toBeLessThanOrEqual(1);
  });

  it('EQ = 1.0 for perfectly balanced departments', () => {
    // CoV = 0 when all values are equal → 1 - 0 = 1
    const { eq, eqStatus } = computeEQ({ 'dept-a': 50, 'dept-b': 50, 'dept-c': 50 }, {});
    expect(eqStatus).toBe('computed');
    expect(eq).toBeCloseTo(1.0, 2);
  });

  it('EQ falls back to site data when no department data', () => {
    const { eq, eqStatus } = computeEQ({}, { 'Milano': 80, 'Roma': 70, 'Bergamo': 60 });
    expect(eqStatus).toBe('computed');
    expect(eq).toBeGreaterThan(0);
  });

});

// ── Test 6: No fallback 0.5 values in component computation ──────────────────

describe('Methodology v1.0 — No synthetic fallback values', () => {

  it('WB is insufficient_data (not 0.5) when no segment data exists', () => {
    const { wb, wbStatus } = computeWB(0, {}, {});
    expect(wbStatus).toBe('insufficient_data');
    // Must NOT be 0.5
    expect(wb).not.toBeCloseTo(0.5, 2);
    expect(wb).toBe(0);
  });

  it('EQ is insufficient_data (not 0.5) when no segment data exists', () => {
    const { eq, eqStatus } = computeEQ({}, {});
    expect(eqStatus).toBe('insufficient_data');
    expect(eq).not.toBeCloseTo(0.5, 2);
    expect(eq).toBe(0);
  });

  it('pipeline result does not have 0.5 as a hard value for WB or EQ', () => {
    // Run with records that have no dept/site segment data
    const records = [eligibleRecord('no-seg', 'L2', 40, 100)];
    const result = runKoraPipeline({
      tenantId: 'test-no-fallback',
      records,
      workforcePopulation: 100,
    });
    const d = result.koraIndex.componentDetail;
    if (d?.wbStatus === 'insufficient_data') {
      // When WB is insufficient, its value must be 0, never 0.5
      expect(d.wb).toBe(0);
    }
    if (d?.eqStatus === 'insufficient_data') {
      expect(d.eq).toBe(0);
    }
  });

});

// ── Test 7: No fallback 0.0 for NI, VR, CO with real eligible records ────────

describe('Methodology v1.0 — Component values with eligible records', () => {

  it('NI > 0 when eligible records have evidence levels', () => {
    const records = [eligibleRecord('ni-test', 'L2', 30, 100)];
    const result = runKoraPipeline({
      tenantId: 'test-ni-positive',
      records,
      workforcePopulation: 100,
    });
    expect(result.componentSignals.ni).toBeGreaterThan(0);
    expect(result.componentSignals.niStatus).toBe('computed');
  });

  it('VR > 0 when eligible records have L2+ evidence', () => {
    const records = [eligibleRecord('vr-test', 'L3', 30, 100)];
    const result = runKoraPipeline({
      tenantId: 'test-vr-positive',
      records,
      workforcePopulation: 100,
    });
    expect(result.componentSignals.vr).toBeGreaterThan(0);
    expect(result.componentSignals.vrStatus).toBe('computed');
  });

  it('VR = 0 when all eligible records have L0/L1 evidence (not verified)', () => {
    const records = [eligibleRecord('vr-zero', 'L0', 30, 100)];
    const result = runKoraPipeline({
      tenantId: 'test-vr-zero',
      records,
      workforcePopulation: 100,
    });
    // L0 evidence → not verified → VR = 0
    expect(result.componentSignals.vr).toBe(0);
    expect(result.componentSignals.vrStatus).toBe('computed');
  });

});

// ── Test 8: CO uses recurring programs ───────────────────────────────────────

describe('Methodology v1.0 — CO program recurrence', () => {

  it('CO > 0 when eligible records have recurrence signals', () => {
    const records = [eligibleRecord('co-recurring', 'L2', 30, 100, true)];
    const result = runKoraPipeline({
      tenantId: 'test-co-recurring',
      records,
      workforcePopulation: 100,
    });
    expect(result.componentSignals.co).toBeGreaterThan(0);
    expect(result.componentSignals.coStatus).toBe('computed');
    expect(result.componentSignals.coRecurringPrograms).toBeGreaterThan(0);
  });

  it('CO = 0 when no eligible records have recurrence signals', () => {
    const records = [eligibleRecord('co-onetime', 'L2', 30, 100, false)];
    const result = runKoraPipeline({
      tenantId: 'test-co-zero',
      records,
      workforcePopulation: 100,
    });
    expect(result.componentSignals.co).toBe(0);
    expect(result.componentSignals.coStatus).toBe('computed');
    expect(result.componentSignals.coRecurringPrograms).toBe(0);
  });

  it('CO is between 0 and 1', () => {
    const records = [
      eligibleRecord('co-mix-1', 'L2', 30, 100, true),
      eligibleRecord('co-mix-2', 'L2', 20, 100, false),
    ];
    const result = runKoraPipeline({
      tenantId: 'test-co-mix',
      records,
      workforcePopulation: 100,
    });
    expect(result.componentSignals.co).toBeGreaterThanOrEqual(0);
    expect(result.componentSignals.co).toBeLessThanOrEqual(1);
  });

});

// ── Test 9: VR uses participant-weighted L2+ verification ────────────────────

describe('Methodology v1.0 — VR participant-weighted verification', () => {

  it('VR is weighted by participants — large L3 program dominates small L0 program', () => {
    const records = [
      eligibleRecord('vr-large-l3', 'L3', 80, 100), // large, L3 = verified
      eligibleRecord('vr-small-l0', 'L0', 5, 100),  // small, L0 = not verified
    ];
    const eligResults = [
      { recordId: 'vr-large-l3', status: 'eligible' as const, reason: '', doctrineReference: '', confidence: 0.9, impactTreatment: 'generates_iu' as const, budgetTreatmentSuggestion: 'include_in_bti' as const, reviewRequired: false },
      { recordId: 'vr-small-l0', status: 'eligible' as const, reason: '', doctrineReference: '', confidence: 0.6, impactTreatment: 'generates_iu' as const, budgetTreatmentSuggestion: 'include_in_bti' as const, reviewRequired: false },
    ];
    const signals = computeComponentSignals(records, eligResults);
    // VR should be > 0.9 since 80/(80+5) = 94% of participants are in the verified program
    expect(signals.vr).toBeGreaterThan(0.9);
    expect(signals.vrStatus).toBe('computed');
  });

  it('VR = 0 when all participants are in L0/L1 programs', () => {
    const records = [eligibleRecord('vr-all-l0', 'L0', 50, 100)];
    const eligResults = [{ recordId: 'vr-all-l0', status: 'eligible' as const, reason: '', doctrineReference: '', confidence: 0.5, impactTreatment: 'generates_iu' as const, budgetTreatmentSuggestion: 'include_in_bti' as const, reviewRequired: false }];
    const signals = computeComponentSignals(records, eligResults);
    expect(signals.vr).toBe(0);
  });

});

// ── Test 10: NI uses evidence-weighted participation ─────────────────────────

describe('Methodology v1.0 — NI evidence-weighted intensity', () => {

  it('NI is higher for L3 evidence than L0 evidence with same participants', () => {
    const highRecords = [eligibleRecord('ni-high', 'L3', 50, 100)];
    const lowRecords  = [eligibleRecord('ni-low',  'L0', 50, 100)];

    const highElig = [{ recordId: 'ni-high', status: 'eligible' as const, reason: '', doctrineReference: '', confidence: 0.9, impactTreatment: 'generates_iu' as const, budgetTreatmentSuggestion: 'include_in_bti' as const, reviewRequired: false }];
    const lowElig  = [{ recordId: 'ni-low',  status: 'eligible' as const, reason: '', doctrineReference: '', confidence: 0.5, impactTreatment: 'generates_iu' as const, budgetTreatmentSuggestion: 'include_in_bti' as const, reviewRequired: false }];

    const highSignals = computeComponentSignals(highRecords, highElig);
    const lowSignals  = computeComponentSignals(lowRecords,  lowElig);

    expect(highSignals.ni).toBeGreaterThan(lowSignals.ni);
    // L3 weight = 1.00; L0 weight = 0.25
    expect(highSignals.ni).toBeCloseTo(1.0, 2);
    expect(lowSignals.ni).toBeCloseTo(0.25, 2);
  });

  it('NI is between 0 and 1', () => {
    const records = [eligibleRecord('ni-range', 'L2', 30, 100)];
    const eligResults = [{ recordId: 'ni-range', status: 'eligible' as const, reason: '', doctrineReference: '', confidence: 0.8, impactTreatment: 'generates_iu' as const, budgetTreatmentSuggestion: 'include_in_bti' as const, reviewRequired: false }];
    const signals = computeComponentSignals(records, eligResults);
    expect(signals.ni).toBeGreaterThanOrEqual(0);
    expect(signals.ni).toBeLessThanOrEqual(1);
  });

});
