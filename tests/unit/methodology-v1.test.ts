import { describe, it, expect } from 'vitest';
import { runKoraPipeline } from '@/lib/kora-engine/run-kora-pipeline';
import { computeComponentSignals, computeEQw, computeEQs } from '@/lib/kora-engine/component-engine';
import { KORA_INDEX_ENGINE_VERSION } from '@/lib/kora-engine/kora-index-engine';
import type { RawUploadedRecord } from '@/lib/kora-engine/types';

// ── Synthetic records — no real people, no real company data ──────────────────

function eligibleRecord(
  id: string,
  evidenceLevel: string,
  participants: number,
  workforce: number,
  recurring = false,
): RawUploadedRecord {
  return {
    recordId: id,
    batchId: 'method-v2-test',
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
    batchId: 'method-v2-test',
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

// ── Test 1: Engine version is v2.0 ────────────────────────────────────────────

describe('Methodology v2.0 — engine version', () => {

  it('KORA_INDEX_ENGINE_VERSION identifies v2.0 architecture', () => {
    expect(KORA_INDEX_ENGINE_VERSION).toContain('v2.0');
  });

});

// ── Test 2: QUALITY macroblock — EVQ + INT + CONT ─────────────────────────────

describe('Methodology v2.0 — QUALITY macroblock (EVQ×34 + INT×33 + CONT×33)', () => {

  it('REACH uses AR and MAR; QUALITY uses EVQ/INT/CONT (not MAR)', () => {
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
    expect(result.koraIndex.macroblocks.activationReach).toBeGreaterThan(0);

    // componentSignals still carries ni, vr, co as diagnostics
    expect(result.componentSignals.niStatus).toBe('computed');
    expect(result.componentSignals.vrStatus).toBe('computed');
    expect(result.componentSignals.coStatus).toBe('computed');

    const w = result.koraIndex.weights;
    const total = (w['REACH'] ?? 0) + (w['QUALITY'] ?? 0) + (w['EQUITY'] ?? 0) + (w['BTI'] ?? 0);
    expect(Math.abs(total - 1.0)).toBeLessThan(0.001);
  });

  it('QUALITY score is between 0 and 100', () => {
    const records = [eligibleRecord('q1', 'L2', 30, 100)];
    const result = runKoraPipeline({
      tenantId: 'test-quality',
      records,
      workforcePopulation: 100,
    });
    expect(result.koraIndex.macroblocks.activationQuality).toBeGreaterThanOrEqual(0);
    expect(result.koraIndex.macroblocks.activationQuality).toBeLessThanOrEqual(100);
  });

  it('higher evidence level raises EVQ signal (which feeds QUALITY)', () => {
    const lowRecords  = [eligibleRecord('evq-low', 'L0', 50, 100)];
    const highRecords = [eligibleRecord('evq-high', 'L3', 50, 100)];

    const lowElig  = [{ recordId: 'evq-low',  status: 'eligible' as const, reason: '', doctrineReference: '', confidence: 0.5, impactTreatment: 'generates_iu' as const, budgetTreatmentSuggestion: 'include_in_bti' as const, reviewRequired: false }];
    const highElig = [{ recordId: 'evq-high', status: 'eligible' as const, reason: '', doctrineReference: '', confidence: 0.9, impactTreatment: 'generates_iu' as const, budgetTreatmentSuggestion: 'include_in_bti' as const, reviewRequired: false }];

    const lowSignals  = computeComponentSignals(lowRecords,  lowElig);
    const highSignals = computeComponentSignals(highRecords, highElig);

    // NI (which feeds EVQ) must be higher for L3 evidence
    expect(highSignals.ni).toBeGreaterThan(lowSignals.ni);
    expect(highSignals.niStatus).toBe('computed');
  });

});

// ── Test 3: EQW — Gini-based worker IU distribution ──────────────────────────

describe('Methodology v2.0 — EQW (Gini-based, computeEQw)', () => {

  it('EQW = insufficient_data when perWorkerIU is null', () => {
    const { eqw, eqwStatus } = computeEQw(null);
    expect(eqwStatus).toBe('insufficient_data');
    expect(eqw).toBe(0);
  });

  it('EQW = 1.0 for perfectly equal IU distribution (Gini = 0)', () => {
    // Functions return 0-1 scale. All workers equal → Gini = 0 → EQW = (1-0) = 1.0
    const { eqw, eqwStatus } = computeEQw([10, 10, 10, 10]);
    expect(eqwStatus).toBe('computed');
    expect(eqw).toBeCloseTo(1.0, 2);
  });

  it('EQW is low for highly unequal IU distribution (high Gini)', () => {
    // One worker has all the IU, rest have 0 → Gini near max → EQW near 0
    const { eqw, eqwStatus } = computeEQw([100, 0, 0, 0]);
    expect(eqwStatus).toBe('computed');
    expect(eqw).toBeLessThan(0.5);
  });

  it('EQW is between 0 and 1 for mixed distribution', () => {
    const { eqw, eqwStatus } = computeEQw([10, 20, 30, 40]);
    expect(eqwStatus).toBe('computed');
    expect(eqw).toBeGreaterThan(0);
    expect(eqw).toBeLessThan(1);
  });

  it('EQW = insufficient_data always in Foundation Light (no perWorkerIU in pipeline)', () => {
    // Pipeline never passes perWorkerIU in Foundation Light — EQW must stay insufficient_data
    const records = [eligibleRecord('eqw-fl', 'L2', 40, 100)];
    const result = runKoraPipeline({
      tenantId: 'test-eqw-foundation-light',
      records,
      workforcePopulation: 100,
    });
    const cd = result.koraIndex.componentDetail;
    expect(cd).toBeTruthy();
    if (cd) {
      expect(cd.eqwStatus).toBe('insufficient_data');
      expect(cd.eqw).toBe(0);
    }
  });

});

// ── Test 4: EQS — CoV on activation RATES per segment ────────────────────────

describe('Methodology v2.0 — EQS (CoV on activation rates, computeEQs)', () => {

  it('EQS = insufficient_data when deptRates is null', () => {
    const { eqs, eqsStatus } = computeEQs(null);
    expect(eqsStatus).toBe('insufficient_data');
    expect(eqs).toBe(0);
  });

  it('EQS = insufficient_data with only 1 segment (CoV requires ≥2)', () => {
    const { eqs, eqsStatus } = computeEQs({ 'dept-solo': { activeUniqueWorkers: 10, headcount: 20 } });
    expect(eqsStatus).toBe('insufficient_data');
    expect(eqs).toBe(0);
  });

  it('EQS = 1.0 for perfectly equal activation rates across segments', () => {
    // CoV = 0 when all rates are identical → EQS = (1 - 0) = 1.0 (0-1 scale)
    const { eqs, eqsStatus } = computeEQs({
      'dept-a': { activeUniqueWorkers: 10, headcount: 20 }, // rate = 0.50
      'dept-b': { activeUniqueWorkers: 15, headcount: 30 }, // rate = 0.50
      'dept-c': { activeUniqueWorkers: 5,  headcount: 10 }, // rate = 0.50
    });
    expect(eqsStatus).toBe('computed');
    expect(eqs).toBeCloseTo(1.0, 2);
  });

  it('EQS is lower for unequal activation rates', () => {
    const { eqs: eqsEqual } = computeEQs({
      'dept-a': { activeUniqueWorkers: 10, headcount: 20 }, // 50%
      'dept-b': { activeUniqueWorkers: 10, headcount: 20 }, // 50%
    });
    const { eqs: eqsUnequal } = computeEQs({
      'dept-a': { activeUniqueWorkers: 18, headcount: 20 }, // 90%
      'dept-b': { activeUniqueWorkers: 2,  headcount: 20 }, // 10%
    });
    expect(eqsEqual).toBeGreaterThan(eqsUnequal);
  });

  it('EQS excludes segments without headcount (headcount = 0)', () => {
    // Segment with headcount = 0 must be excluded, not treated as rate = 0
    const { eqs, eqsStatus } = computeEQs({
      'dept-valid':   { activeUniqueWorkers: 10, headcount: 20 }, // valid
      'dept-no-head': { activeUniqueWorkers: 5,  headcount: 0  }, // excluded
    });
    // Only 1 valid segment after exclusion → insufficient_data
    expect(eqsStatus).toBe('insufficient_data');
    expect(eqs).toBe(0);
  });

  it('EQS = insufficient_data in Foundation Light (no headcount in intake)', () => {
    // Pipeline does not receive headcount-per-dept → EQS stays insufficient_data
    const records = [eligibleRecord('eqs-fl', 'L2', 40, 100)];
    const result = runKoraPipeline({
      tenantId: 'test-eqs-foundation-light',
      records,
      workforcePopulation: 100,
    });
    const cd = result.koraIndex.componentDetail;
    expect(cd).toBeTruthy();
    if (cd) {
      expect(cd.eqsStatus).toBe('insufficient_data');
      expect(cd.eqs).toBe(0);
    }
  });

});

// ── Test 5: No weight redistribution — insufficient_data caps at 0 ────────────

describe('Methodology v2.0 — no weight redistribution on insufficient_data', () => {

  it('EQUITY macroblock ≤ 50 in Foundation Light (EQW + EQS both insufficient_data)', () => {
    // EQW weight = 0.30, EQS weight = 0.20 → both zero → max = PC×0.25 + PB×0.25 = 50
    const records = [eligibleRecord('no-redis', 'L2', 40, 100)];
    const result = runKoraPipeline({
      tenantId: 'test-no-redistribution',
      records,
      workforcePopulation: 100,
    });
    expect(result.koraIndex.macroblocks.distributionEquity).toBeLessThanOrEqual(50);
  });

  it('componentDetail eqw and eqs are 0 when insufficient_data — never 0.5 synthetic fallback', () => {
    const records = [eligibleRecord('no-fallback', 'L2', 40, 100)];
    const result = runKoraPipeline({
      tenantId: 'test-no-synthetic-fallback',
      records,
      workforcePopulation: 100,
    });
    const cd = result.koraIndex.componentDetail;
    if (cd?.eqwStatus === 'insufficient_data') {
      expect(cd.eqw).toBe(0);
      expect(cd.eqw).not.toBeCloseTo(0.5, 2);
    }
    if (cd?.eqsStatus === 'insufficient_data') {
      expect(cd.eqs).toBe(0);
      expect(cd.eqs).not.toBeCloseTo(0.5, 2);
    }
  });

  it('weights object carries the configured split (EQW×0.30 + EQS×0.20 + PC×0.25 + PB×0.25)', () => {
    const records = [eligibleRecord('weights-check', 'L2', 40, 100)];
    const result = runKoraPipeline({
      tenantId: 'test-equity-weights',
      records,
      workforcePopulation: 100,
    });
    const cd = result.koraIndex.componentDetail;
    expect(cd).toBeTruthy();
    if (cd) {
      const { eqw, eqs, pc, pb } = cd.equityWeightsUsed;
      expect(eqw).toBeCloseTo(0.30, 3);
      expect(eqs).toBeCloseTo(0.20, 3);
      expect(pc).toBeCloseTo(0.25, 3);
      expect(pb).toBeCloseTo(0.25, 3);
      expect(eqw + eqs + pc + pb).toBeCloseTo(1.0, 3);
    }
  });

});

// ── Test 6: Confidence Score is external to KORA Index ───────────────────────

describe('Methodology v2.0 — Confidence Score external', () => {

  it('CS weight is 0 — CS does not enter KORA Index computation', () => {
    const records = [eligibleRecord('dri1', 'L2', 40, 100)];
    const result = runKoraPipeline({
      tenantId: 'test-dri',
      records,
      workforcePopulation: 100,
    });
    expect(result.confidence.externalToIndex).toBe(true);
  });

  it('verificationConfidence is independent of budgetEvidenceQuality (B-CS1)', () => {
    // Same participants, same workforce: only evidence level differs
    // Higher EV should raise verificationConfidence but NOT change REACH macroblock
    const highEv = runKoraPipeline({
      tenantId: 'test-cs1-high',
      records: [eligibleRecord('cs1-h', 'L3', 40, 100)],
      workforcePopulation: 100,
    });
    const lowEv = runKoraPipeline({
      tenantId: 'test-cs1-low',
      records: [eligibleRecord('cs1-l', 'L0', 40, 100)],
      workforcePopulation: 100,
    });

    // Confidence scores differ (EV level affects verificationConfidence)
    expect(highEv.confidence.score).toBeGreaterThan(lowEv.confidence.score);

    // REACH macroblock must be equal (same AR/MAR — same participants/workforce)
    expect(highEv.koraIndex.macroblocks.activationReach)
      .toBeCloseTo(lowEv.koraIndex.macroblocks.activationReach, 0);
  });

});

// ── Test 7: NI, VR, CO diagnostic signals ────────────────────────────────────

describe('Methodology v2.0 — componentSignals (NI, VR, CO diagnostics)', () => {

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

  it('VR = 0 when all eligible records have L0/L1 evidence', () => {
    const records = [eligibleRecord('vr-zero', 'L0', 30, 100)];
    const result = runKoraPipeline({
      tenantId: 'test-vr-zero',
      records,
      workforcePopulation: 100,
    });
    expect(result.componentSignals.vr).toBe(0);
    expect(result.componentSignals.vrStatus).toBe('computed');
  });

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

  it('VR is weighted by participants — large L3 program dominates small L0 program', () => {
    const records = [
      eligibleRecord('vr-large-l3', 'L3', 80, 100),
      eligibleRecord('vr-small-l0', 'L0', 5,  100),
    ];
    const eligResults = [
      { recordId: 'vr-large-l3', status: 'eligible' as const, reason: '', doctrineReference: '', confidence: 0.9, impactTreatment: 'generates_iu' as const, budgetTreatmentSuggestion: 'include_in_bti' as const, reviewRequired: false },
      { recordId: 'vr-small-l0', status: 'eligible' as const, reason: '', doctrineReference: '', confidence: 0.6, impactTreatment: 'generates_iu' as const, budgetTreatmentSuggestion: 'include_in_bti' as const, reviewRequired: false },
    ];
    const signals = computeComponentSignals(records, eligResults);
    // 80/(80+5) = 94% in verified program → VR > 0.9
    expect(signals.vr).toBeGreaterThan(0.9);
    expect(signals.vrStatus).toBe('computed');
  });

});
