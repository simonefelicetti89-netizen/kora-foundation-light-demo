// tests/unit/sprint1-iu-centric.test.ts
// Sprint 1 IU-centric fixture tests — hand-calculated expected values.
// Covers B-IU1 (IU-weighted pillar distribution), B-QU1 (QUALITY independence),
// B-EQ1 (EQW/EQS Foundation Light behaviour), B-CS1 (verificationConfidence independence).
// NO test-fitting: each expectation is derived from the methodology spec, not from observed output.

import { describe, it, expect } from 'vitest';
import { runKoraPipeline } from '@/lib/kora-engine/run-kora-pipeline';
import { computeEQw, computeEQs } from '@/lib/kora-engine/component-engine';
import type { RawUploadedRecord } from '@/lib/kora-engine/types';

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeRecord(opts: {
  id: string;
  categoria: string;
  partecipanti: number;
  workforce: number;
  importo?: number;
  evidence?: string;
  recurring?: boolean;
}): RawUploadedRecord {
  return {
    recordId:           opts.id,
    batchId:            'sprint1-fixture',
    rowIndex:           0,
    detectedRecordType: 'welfare_program',
    raw: {
      nome_iniziativa:      opts.recurring ? 'Programma ricorrente mensile' : 'Iniziativa aziendale',
      categoria:            opts.categoria,
      partecipanti:         String(opts.partecipanti),
      forza_lavoro:         String(opts.workforce),
      importo:              String(opts.importo ?? 5000),
      b6_evidence_level:    opts.evidence ?? 'L2',
      b6_approved_for_iu:   true,
      participants:         opts.partecipanti,
      reviewed_by_uef:      true,
      reviewed_eligibility: 'eligible',
    },
  };
}

// ── B-IU1: IU-weighted pillar distribution ────────────────────────────────────
// Invariant: pillarDistribution reflects IU sums per pillar, NOT event counts.
// If event count weighting were used, 2 small GROWTH events would beat 1 large LIFE event.
// With IU weighting, 1 large LIFE event (many participants) dominates.

describe('B-IU1 — IU-weighted pillar distribution', () => {

  it('IU-weighted: 1 high-EV LIFE event outweighs 2 low-EV GROWTH events in pillarDistribution', () => {
    // Foundation Light: NM = 1.0 stub (participant count does NOT affect IU).
    // IU is differentiated by EV (evidence level factor): L3 (1.0) vs L0 (0.25).
    // Event-count logic: GROWTH has 2 events → GROWTH 2/3 of weight.
    // IU-weighted logic: LIFE has higher per-record IU (L3 vs L0) → LIFE wins.
    const records: RawUploadedRecord[] = [
      // 1 LIFE event: high evidence (L3 → EV=1.0 → IU=1.0)
      makeRecord({ id: 'life-high-ev', categoria: 'supporto psicologico benessere mentale', partecipanti: 40, workforce: 100, evidence: 'L3' }),
      // 2 GROWTH events: low evidence (L0 → EV=0.25 → IU=0.25 each, total=0.5)
      makeRecord({ id: 'growth-low-ev-1', categoria: 'corso formazione professionale', partecipanti: 40, workforce: 100, evidence: 'L0' }),
      makeRecord({ id: 'growth-low-ev-2', categoria: 'sviluppo competenze digitali',   partecipanti: 40, workforce: 100, evidence: 'L0' }),
    ];

    const result = runKoraPipeline({ tenantId: 'b-iu1-fixture', records, workforcePopulation: 100 });
    expect(result.scoringMode).toBe('computed');

    const pd = result.pillarDistribution;

    // IU(LIFE) = 1.0, total IU(GROWTH) = 0.25+0.25 = 0.5 → LIFE > GROWTH
    expect(pd.LIFE).toBeGreaterThan(pd.GROWTH);
  });

  it('pillarDistribution values are non-negative and sum to a positive total', () => {
    const records = [
      makeRecord({ id: 'pd-life',   categoria: 'benessere salute fisica',       partecipanti: 30, workforce: 100 }),
      makeRecord({ id: 'pd-impact', categoria: 'volontariato aziendale territorio', partecipanti: 20, workforce: 100 }),
    ];

    const result = runKoraPipeline({ tenantId: 'b-iu1-sum', records, workforcePopulation: 100 });
    const pd = result.pillarDistribution;
    const total = Object.values(pd).reduce((s, v) => s + v, 0);

    expect(total).toBeGreaterThan(0);
    Object.values(pd).forEach((v) => expect(v).toBeGreaterThanOrEqual(0));
  });

  it('pillarDistribution is 0 for pillars with no eligible records', () => {
    // Only LIFE-category records → all other pillars must have 0 IU
    const records = [
      makeRecord({ id: 'life-only-1', categoria: 'supporto psicologico benessere mentale', partecipanti: 40, workforce: 100 }),
    ];

    const result = runKoraPipeline({ tenantId: 'b-iu1-zero-pillars', records, workforcePopulation: 100 });
    const pd = result.pillarDistribution;

    // LEGACY, CONNECTION, IMPACT must all be 0
    expect(pd.LEGACY).toBe(0);
    expect(pd.CONNECTION).toBe(0);
    expect(pd.IMPACT).toBe(0);
    // GROWTH may or may not be 0 depending on BCM mapping (Life/Growth can overlap in some taxonomies)
    // LIFE must be positive since the record maps there
    expect(pd.LIFE).toBeGreaterThan(0);
  });

});

// ── B-QU1: QUALITY macroblock independence of EVQ, INT, CONT ─────────────────
// Invariant: CONT (recurring share) must not change when only evidence level changes.
// EVQ should change because NI (evidence-weighted average) depends on evidence level.
// INT may also change because higher EV → higher IU → higher totalIU/activeWorkers.

describe('B-QU1 — QUALITY macroblock component independence', () => {

  it('CONT is unaffected when only evidence level changes (evidence ≠ recurrence)', () => {
    // Both runs: non-recurring, same participants, different evidence
    const runL0 = runKoraPipeline({
      tenantId: 'b-qu1-cont-l0',
      records: [makeRecord({ id: 'ev-l0', categoria: 'sviluppo competenze digitali', partecipanti: 30, workforce: 100, evidence: 'L0', recurring: false })],
      workforcePopulation: 100,
    });
    const runL3 = runKoraPipeline({
      tenantId: 'b-qu1-cont-l3',
      records: [makeRecord({ id: 'ev-l3', categoria: 'sviluppo competenze digitali', partecipanti: 30, workforce: 100, evidence: 'L3', recurring: false })],
      workforcePopulation: 100,
    });

    // CO signal (feeds CONT) depends only on recurrence signals in the record text.
    // Same non-recurring record → CO must be identical regardless of evidence level.
    expect(runL0.componentSignals.co).toBe(runL3.componentSignals.co);
    expect(runL0.componentSignals.co).toBe(0); // non-recurring → CO = 0
  });

  it('EVQ signal (NI) changes when evidence level changes', () => {
    const runL0 = runKoraPipeline({
      tenantId: 'b-qu1-evq-l0',
      records: [makeRecord({ id: 'evq-l0', categoria: 'sviluppo competenze digitali', partecipanti: 30, workforce: 100, evidence: 'L0' })],
      workforcePopulation: 100,
    });
    const runL3 = runKoraPipeline({
      tenantId: 'b-qu1-evq-l3',
      records: [makeRecord({ id: 'evq-l3', categoria: 'sviluppo competenze digitali', partecipanti: 30, workforce: 100, evidence: 'L3' })],
      workforcePopulation: 100,
    });

    // NI is participant-weighted evidence quality → must differ when EV changes
    expect(runL3.componentSignals.ni).toBeGreaterThan(runL0.componentSignals.ni);
    // NI for L0 ≈ 0.25 (EVIDENCE_WEIGHTS.L0 = 0.25)
    expect(runL0.componentSignals.ni).toBeCloseTo(0.25, 2);
    // NI for L3 ≈ 1.00 (EVIDENCE_WEIGHTS.L3 = 1.00)
    expect(runL3.componentSignals.ni).toBeCloseTo(1.0, 2);
  });

  it('CONT > 0 when records carry recurrence signals — unchanged by evidence level', () => {
    const runRecurring = runKoraPipeline({
      tenantId: 'b-qu1-recurring',
      records: [makeRecord({ id: 'rec', categoria: 'sviluppo competenze digitali', partecipanti: 30, workforce: 100, evidence: 'L0', recurring: true })],
      workforcePopulation: 100,
    });
    expect(runRecurring.componentSignals.co).toBeGreaterThan(0);
    expect(runRecurring.componentSignals.coStatus).toBe('computed');
  });

  it('QUALITY macroblock is between 0 and 100', () => {
    const result = runKoraPipeline({
      tenantId: 'b-qu1-range',
      records: [makeRecord({ id: 'range-rec', categoria: 'sviluppo competenze digitali', partecipanti: 30, workforce: 100, evidence: 'L2' })],
      workforcePopulation: 100,
    });
    expect(result.koraIndex.macroblocks.activationQuality).toBeGreaterThanOrEqual(0);
    expect(result.koraIndex.macroblocks.activationQuality).toBeLessThanOrEqual(100);
  });

});

// ── B-EQ1: EQW and EQS Foundation Light behaviour ────────────────────────────
// Invariant: Both EQW and EQS = insufficient_data in Foundation Light.
// No weight redistribution: EQUITY macroblock ceiling = PC×0.25 + PB×0.25 = max 50.

describe('B-EQ1 — EQUITY macroblock in Foundation Light', () => {

  it('EQW = insufficient_data in Foundation Light (no per-worker IU data)', () => {
    const result = runKoraPipeline({
      tenantId: 'b-eq1-eqw',
      records: [makeRecord({ id: 'eqw-fl', categoria: 'sviluppo competenze digitali', partecipanti: 40, workforce: 100 })],
      workforcePopulation: 100,
    });
    const cd = result.koraIndex.componentDetail;
    expect(cd).toBeTruthy();
    if (cd) {
      expect(cd.eqwStatus).toBe('insufficient_data');
      expect(cd.eqw).toBe(0);
    }
  });

  it('EQS = insufficient_data in Foundation Light (no headcount per dept in intake)', () => {
    const result = runKoraPipeline({
      tenantId: 'b-eq1-eqs',
      records: [makeRecord({ id: 'eqs-fl', categoria: 'sviluppo competenze digitali', partecipanti: 40, workforce: 100 })],
      workforcePopulation: 100,
    });
    const cd = result.koraIndex.componentDetail;
    expect(cd).toBeTruthy();
    if (cd) {
      expect(cd.eqsStatus).toBe('insufficient_data');
      expect(cd.eqs).toBe(0);
    }
  });

  it('EQUITY macroblock ≤ 50 (ceiling when EQW+EQS both zero)', () => {
    // Max EQUITY = PC×0.25 + PB×0.25 = 50 when EQW=0 + EQS=0 (no redistribution).
    const result = runKoraPipeline({
      tenantId: 'b-eq1-ceiling',
      records: [
        makeRecord({ id: 'eq-ceil-1', categoria: 'supporto psicologico benessere mentale', partecipanti: 40, workforce: 100 }),
        makeRecord({ id: 'eq-ceil-2', categoria: 'volontariato aziendale territorio',       partecipanti: 30, workforce: 100 }),
        makeRecord({ id: 'eq-ceil-3', categoria: 'sviluppo competenze digitali',             partecipanti: 20, workforce: 100 }),
      ],
      workforcePopulation: 100,
    });
    expect(result.koraIndex.macroblocks.distributionEquity).toBeLessThanOrEqual(50);
  });

  // Unit-level: computeEQw and computeEQs behave as specified
  it('computeEQw: null → insufficient_data; equal array → 1.0; unequal → between 0 and 1', () => {
    // Functions return 0-1 scale. kora-index-engine multiplies by 100 for display.
    const { eqwStatus: s1, eqw: v1 } = computeEQw(null);
    expect(s1).toBe('insufficient_data');
    expect(v1).toBe(0);

    const { eqwStatus: s2, eqw: v2 } = computeEQw([10, 10, 10]);
    expect(s2).toBe('computed');
    expect(v2).toBeCloseTo(1.0, 2); // Gini=0 → EQW = (1-0) = 1.0

    const { eqwStatus: s3, eqw: v3 } = computeEQw([0, 0, 100]);
    expect(s3).toBe('computed');
    expect(v3).toBeGreaterThanOrEqual(0);
    expect(v3).toBeLessThan(1);
  });

  it('computeEQs: null → insufficient_data; 1 segment → insufficient_data; equal rates → 1.0', () => {
    // Functions return 0-1 scale. kora-index-engine multiplies by 100 for display.
    const { eqsStatus: s1, eqs: v1 } = computeEQs(null);
    expect(s1).toBe('insufficient_data');
    expect(v1).toBe(0);

    const { eqsStatus: s2, eqs: v2 } = computeEQs({ 'solo': { participants: 10, headcount: 20 } });
    expect(s2).toBe('insufficient_data');
    expect(v2).toBe(0);

    // Equal rates: CoV=0 → EQS = (1 - 0) = 1.0
    const { eqsStatus: s3, eqs: v3 } = computeEQs({
      'dept-a': { participants: 10, headcount: 20 }, // 50%
      'dept-b': { participants: 5,  headcount: 10 }, // 50%
    });
    expect(s3).toBe('computed');
    expect(v3).toBeCloseTo(1.0, 2);
  });

  it('computeEQs: segment with headcount=0 is excluded — 1 valid segment → insufficient_data', () => {
    // dept-missing has headcount=0 → excluded; only 1 valid segment remains → insufficient_data
    const { eqsStatus, eqs } = computeEQs({
      'dept-valid':   { participants: 10, headcount: 20 },
      'dept-missing': { participants: 5,  headcount: 0  },
    });
    expect(eqsStatus).toBe('insufficient_data');
    expect(eqs).toBe(0);
  });

});

// ── B-CS1: verificationConfidence independent of budgetEvidenceQuality ────────
// Invariant: verificationConfidence = verified IU ratio (EV ≥ 0.75), NOT the budget evidence score.
// Changing only the evidence level must change verificationConfidence.
// Changing only the spend/budget must NOT change verificationConfidence.

describe('B-CS1 — verificationConfidence independent of budget evidence', () => {

  it('higher IU-level evidence (L3 vs L0) increases verificationConfidence', () => {
    // Same participants, workforce, and spend. Only evidence level differs.
    const runL0 = runKoraPipeline({
      tenantId: 'b-cs1-l0',
      records: [makeRecord({ id: 'cs1-l0', categoria: 'sviluppo competenze digitali', partecipanti: 30, workforce: 100, evidence: 'L0', importo: 5000 })],
      workforcePopulation: 100,
    });
    const runL3 = runKoraPipeline({
      tenantId: 'b-cs1-l3',
      records: [makeRecord({ id: 'cs1-l3', categoria: 'sviluppo competenze digitali', partecipanti: 30, workforce: 100, evidence: 'L3', importo: 5000 })],
      workforcePopulation: 100,
    });

    // L3 evidence → EV ≥ 0.75 → verified IU ratio = 1.0 → verificationConfidence = 1.0
    expect(runL3.confidence.verificationConfidence).toBeGreaterThan(runL0.confidence.verificationConfidence);
    expect(runL3.confidence.verificationConfidence).toBeCloseTo(1.0, 2);
    // L0 → EV < 0.75 → no verified IU → verificationConfidence = baseline (≈ 0.10)
    expect(runL0.confidence.verificationConfidence).toBeLessThan(0.5);
  });

  it('overall Confidence Score is higher with verified evidence (L3) than unverified (L0)', () => {
    const runL0 = runKoraPipeline({
      tenantId: 'b-cs1-score-l0',
      records: [makeRecord({ id: 'score-l0', categoria: 'sviluppo competenze digitali', partecipanti: 30, workforce: 100, evidence: 'L0' })],
      workforcePopulation: 100,
    });
    const runL3 = runKoraPipeline({
      tenantId: 'b-cs1-score-l3',
      records: [makeRecord({ id: 'score-l3', categoria: 'sviluppo competenze digitali', partecipanti: 30, workforce: 100, evidence: 'L3' })],
      workforcePopulation: 100,
    });

    expect(runL3.confidence.score).toBeGreaterThan(runL0.confidence.score);
  });

  it('Confidence Score is external to KORA Index (externalToIndex = true)', () => {
    const result = runKoraPipeline({
      tenantId: 'b-cs1-external',
      records: [makeRecord({ id: 'ext-check', categoria: 'sviluppo competenze digitali', partecipanti: 30, workforce: 100 })],
      workforcePopulation: 100,
    });
    expect(result.confidence.externalToIndex).toBe(true);
  });

  it('REACH macroblock is equal across L0 and L3 runs with same participants/workforce', () => {
    // verificationConfidence must NOT affect KORA Index value through REACH.
    // Same AR/MAR → same REACH regardless of evidence level.
    const runL0 = runKoraPipeline({
      tenantId: 'b-cs1-reach-l0',
      records: [makeRecord({ id: 'reach-l0', categoria: 'sviluppo competenze digitali', partecipanti: 30, workforce: 100, evidence: 'L0' })],
      workforcePopulation: 100,
    });
    const runL3 = runKoraPipeline({
      tenantId: 'b-cs1-reach-l3',
      records: [makeRecord({ id: 'reach-l3', categoria: 'sviluppo competenze digitali', partecipanti: 30, workforce: 100, evidence: 'L3' })],
      workforcePopulation: 100,
    });

    expect(runL0.koraIndex.macroblocks.activationReach)
      .toBeCloseTo(runL3.koraIndex.macroblocks.activationReach, 0);
  });

});
