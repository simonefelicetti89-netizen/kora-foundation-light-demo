// tests/unit/config-governance.test.ts
// Config-governance alignment tests — Sprint 3 alignment cleanup.
//
// G1: QUALITY component weights (EVQ/INT/CONT) come from methodology-config, not hardcoded.
// G2: EQUITY component weights (EQW/EQS/PC/PB) come from methodology-config, not hardcoded.
// G3: IU EV L0 canonical value = 0.25 (IU EV scale, not component NI/VR scale).
// G4: Component NI/VR L0 scale (0.25) is independent of IU EV scale (also 0.25 post-fix).
// G5: equityScore in EquityScoreResult is a deprecated diagnostic — NOT used in KORA Index.
//
// All fixtures are synthetic — no real company or worker data.

import { describe, it, expect } from 'vitest';
import { runKoraPipeline } from '@/lib/kora-engine/run-kora-pipeline';
import { computeEquityScore } from '@/lib/kora-engine/equity-engine';
import { computeComponentSignals } from '@/lib/kora-engine/component-engine';
import { getQualityComponentWeights, getEquityComponentWeights } from '@/lib/methodology-config/v0.1';
import type { RawUploadedRecord, EligibilityResult } from '@/lib/kora-engine/types';

// ── Shared fixture ────────────────────────────────────────────────────────────

function makeRecord(opts: {
  id: string;
  categoria: string;
  partecipanti: number;
  workforce: number;
  evidence?: string;
  recurring?: boolean;
}): RawUploadedRecord {
  return {
    recordId:           opts.id,
    batchId:            'gov-test',
    rowIndex:           0,
    detectedRecordType: 'welfare_program',
    raw: {
      nome_iniziativa:      opts.recurring ? 'Programma ricorrente mensile' : 'Programma aziendale',
      categoria:            opts.categoria,
      partecipanti:         String(opts.partecipanti),
      forza_lavoro:         String(opts.workforce),
      importo:              '5000',
      b6_evidence_level:    opts.evidence ?? 'L2',
      b6_approved_for_iu:   true,
      participants:         opts.partecipanti,
      reviewed_by_uef:      true,
      reviewed_eligibility: 'eligible',
    },
  };
}

function eligResult(id: string): EligibilityResult {
  return {
    recordId:                   id,
    status:                     'eligible',
    reason:                     '',
    doctrineReference:          '',
    confidence:                 0.9,
    impactTreatment:            'generates_iu',
    budgetTreatmentSuggestion:  'include_in_bti',
    reviewRequired:             false,
  };
}

// ── G1: QUALITY component weights from config ─────────────────────────────────

describe('G1 — QUALITY component weights are config-driven', () => {

  it('getQualityComponentWeights() returns EVQ=0.34, INT=0.33, CONT=0.33 from config', () => {
    const w = getQualityComponentWeights();
    expect(w.evq).toBeCloseTo(0.34, 5);
    expect(w.int).toBeCloseTo(0.33, 5);
    expect(w.cont).toBeCloseTo(0.33, 5);
    expect(w.evq + w.int + w.cont).toBeCloseTo(1.0, 3);
  });

  it('qualityWeightsUsed in componentDetail matches getQualityComponentWeights()', () => {
    const configW = getQualityComponentWeights();
    const records = [makeRecord({ id: 'g1-rec', categoria: 'sviluppo competenze digitali', partecipanti: 40, workforce: 100 })];
    const result = runKoraPipeline({ tenantId: 'g1-tenant', records, workforcePopulation: 100 });
    const qw = result.koraIndex.componentDetail?.qualityWeightsUsed;
    expect(qw).toBeDefined();
    if (qw) {
      expect(qw.evq).toBeCloseTo(configW.evq, 5);
      expect(qw.int).toBeCloseTo(configW.int, 5);
      expect(qw.cont).toBeCloseTo(configW.cont, 5);
    }
  });

  it('QUALITY score changes when component sub-scores change (config weights applied correctly)', () => {
    // L3 evidence → higher EVQ (NI) → higher QUALITY than L0
    const runL0 = runKoraPipeline({
      tenantId: 'g1-l0',
      records: [makeRecord({ id: 'l0', categoria: 'sviluppo competenze digitali', partecipanti: 30, workforce: 100, evidence: 'L0' })],
      workforcePopulation: 100,
    });
    const runL3 = runKoraPipeline({
      tenantId: 'g1-l3',
      records: [makeRecord({ id: 'l3', categoria: 'sviluppo competenze digitali', partecipanti: 30, workforce: 100, evidence: 'L3' })],
      workforcePopulation: 100,
    });
    // EVQ drives QUALITY — higher NI → higher QUALITY. This proves EVQ weight is applied.
    expect(runL3.koraIndex.macroblocks.activationQuality)
      .toBeGreaterThan(runL0.koraIndex.macroblocks.activationQuality);
  });

  it('qualityWeightsUsed sum is 1.00 (sanity: weights are internally consistent)', () => {
    const records = [makeRecord({ id: 'g1-sum', categoria: 'corso formazione professionale', partecipanti: 30, workforce: 100 })];
    const result = runKoraPipeline({ tenantId: 'g1-sum', records, workforcePopulation: 100 });
    const qw = result.koraIndex.componentDetail?.qualityWeightsUsed;
    if (qw) {
      expect(qw.evq + qw.int + qw.cont).toBeCloseTo(1.0, 5);
    }
  });

});

// ── G2: EQUITY component weights from config ──────────────────────────────────

describe('G2 — EQUITY component weights are config-driven', () => {

  it('getEquityComponentWeights() returns EQW=0.30, EQS=0.20, PC=0.25, PB=0.25 from config', () => {
    const w = getEquityComponentWeights();
    expect(w.eqw).toBeCloseTo(0.30, 5);
    expect(w.eqs).toBeCloseTo(0.20, 5);
    expect(w.pc).toBeCloseTo(0.25, 5);
    expect(w.pb).toBeCloseTo(0.25, 5);
    expect(w.eqw + w.eqs + w.pc + w.pb).toBeCloseTo(1.0, 3);
  });

  it('equityWeightsUsed in componentDetail matches getEquityComponentWeights()', () => {
    const configW = getEquityComponentWeights();
    const records = [makeRecord({ id: 'g2-rec', categoria: 'sviluppo competenze digitali', partecipanti: 40, workforce: 100 })];
    const result = runKoraPipeline({ tenantId: 'g2-tenant', records, workforcePopulation: 100 });
    const ew = result.koraIndex.componentDetail?.equityWeightsUsed;
    expect(ew).toBeDefined();
    if (ew) {
      expect(ew.eqw).toBeCloseTo(configW.eqw, 5);
      expect(ew.eqs).toBeCloseTo(configW.eqs, 5);
      expect(ew.pc).toBeCloseTo(configW.pc, 5);
      expect(ew.pb).toBeCloseTo(configW.pb, 5);
    }
  });

  it('equityWeightsUsed sum is 1.00 (sanity: weights are internally consistent)', () => {
    const records = [makeRecord({ id: 'g2-sum', categoria: 'supporto psicologico benessere mentale', partecipanti: 30, workforce: 100 })];
    const result = runKoraPipeline({ tenantId: 'g2-sum', records, workforcePopulation: 100 });
    const ew = result.koraIndex.componentDetail?.equityWeightsUsed;
    if (ew) {
      expect(ew.eqw + ew.eqs + ew.pc + ew.pb).toBeCloseTo(1.0, 5);
    }
  });

  it('EQUITY macroblock ceiling is 50 in FL base (EQW 0.30 + EQS 0.20 = 0 → max = PC×0.25 + PB×0.25)', () => {
    // This proves PC×0.25 + PB×0.25 = 50 cap — derived from config weights, not hardcoded.
    const records = [
      makeRecord({ id: 'g2-eq1', categoria: 'supporto psicologico benessere mentale', partecipanti: 40, workforce: 100 }),
      makeRecord({ id: 'g2-eq2', categoria: 'volontariato aziendale territorio',       partecipanti: 30, workforce: 100 }),
      makeRecord({ id: 'g2-eq3', categoria: 'sviluppo competenze digitali',             partecipanti: 20, workforce: 100 }),
      makeRecord({ id: 'g2-eq4', categoria: 'mentoring cross-generazionale',            partecipanti: 15, workforce: 100 }),
      makeRecord({ id: 'g2-eq5', categoria: 'programma legacy knowledge transfer',      partecipanti: 10, workforce: 100 }),
    ];
    const result = runKoraPipeline({ tenantId: 'g2-ceiling', records, workforcePopulation: 100 });
    // EQW=insufficient+EQS=insufficient → only PC×configW.pc + PB×configW.pb possible
    const configW = getEquityComponentWeights();
    const maxPossible = 100 * configW.pc + 100 * configW.pb;  // 100×0.25 + 100×0.25 = 50
    expect(result.koraIndex.macroblocks.distributionEquity).toBeLessThanOrEqual(maxPossible);
  });

});

// ── G3: IU EV L0 canonical value = 0.25 ──────────────────────────────────────

describe('G3 — IU EV L0 = 0.25 (canonical IU EV scale)', () => {

  it('iuResults.evidence_verification_ev = 0.25 for an L0-evidence eligible record', () => {
    const records = [makeRecord({ id: 'g3-l0', categoria: 'sviluppo competenze digitali', partecipanti: 30, workforce: 100, evidence: 'L0' })];
    const result = runKoraPipeline({ tenantId: 'g3-l0', records, workforcePopulation: 100 });
    const iuRec = result.iuResults?.find(r => r.computed);
    expect(iuRec).toBeDefined();
    expect(iuRec?.evidence_verification_ev).toBeCloseTo(0.25, 5);
  });

  it('iuResults.evidence_verification_ev = 1.00 for an L4-evidence eligible record', () => {
    const records = [makeRecord({ id: 'g3-l4', categoria: 'sviluppo competenze digitali', partecipanti: 30, workforce: 100, evidence: 'L4' })];
    const result = runKoraPipeline({ tenantId: 'g3-l4', records, workforcePopulation: 100 });
    const iuRec = result.iuResults?.find(r => r.computed);
    expect(iuRec).toBeDefined();
    expect(iuRec?.evidence_verification_ev).toBeCloseTo(1.00, 5);
  });

  it('IU scale is monotonically increasing: EV(L0) < EV(L1) < EV(L2) < EV(L3) ≤ EV(L4)', () => {
    const levels = ['L0', 'L1', 'L2', 'L3', 'L4'];
    const evValues = levels.map(ev => {
      const records = [makeRecord({ id: `g3-${ev}`, categoria: 'sviluppo competenze digitali', partecipanti: 30, workforce: 100, evidence: ev })];
      const result = runKoraPipeline({ tenantId: `g3-mono-${ev}`, records, workforcePopulation: 100 });
      return result.iuResults?.find(r => r.computed)?.evidence_verification_ev ?? 0;
    });
    // Verify strict monotonicity L0→L3; L4 may equal L3
    expect(evValues[0]).toBeLessThan(evValues[1]);
    expect(evValues[1]).toBeLessThan(evValues[2]);
    expect(evValues[2]).toBeLessThan(evValues[3]);
    expect(evValues[3]).toBeLessThanOrEqual(evValues[4]);
  });

  it('higher IU EV (L3 vs L0) produces higher impact_units_total for same record', () => {
    const recL0 = makeRecord({ id: 'g3-iu-l0', categoria: 'sviluppo competenze digitali', partecipanti: 30, workforce: 100, evidence: 'L0' });
    const recL3 = makeRecord({ id: 'g3-iu-l3', categoria: 'sviluppo competenze digitali', partecipanti: 30, workforce: 100, evidence: 'L3' });
    const resL0 = runKoraPipeline({ tenantId: 'g3-iucomp-l0', records: [recL0], workforcePopulation: 100 });
    const resL3 = runKoraPipeline({ tenantId: 'g3-iucomp-l3', records: [recL3], workforcePopulation: 100 });
    const iuL0 = resL0.iuResults?.find(r => r.computed)?.impact_units_total ?? 0;
    const iuL3 = resL3.iuResults?.find(r => r.computed)?.impact_units_total ?? 0;
    expect(iuL3).toBeGreaterThan(iuL0);
  });

});

// ── G4: Component NI/VR L0 scale is independent of IU EV scale ──────────────

describe('G4 — Component NI/VR L0 scale (component-engine) is separate from IU EV scale', () => {

  it('NI signal for L0 evidence = 0.25 (EVIDENCE_WEIGHTS.L0, component-engine scale)', () => {
    const records = [makeRecord({ id: 'g4-ni-l0', categoria: 'sviluppo competenze digitali', partecipanti: 30, workforce: 100, evidence: 'L0' })];
    const eligResults = [eligResult('g4-ni-l0')];
    const signals = computeComponentSignals(records, eligResults);
    expect(signals.niStatus).toBe('computed');
    // EVIDENCE_WEIGHTS.L0 = 0.25 → NI = 0.25 for a single L0 record
    expect(signals.ni).toBeCloseTo(0.25, 2);
  });

  it('NI signal for L3 evidence = 1.00 (EVIDENCE_WEIGHTS.L3, component-engine scale)', () => {
    const records = [makeRecord({ id: 'g4-ni-l3', categoria: 'sviluppo competenze digitali', partecipanti: 30, workforce: 100, evidence: 'L3' })];
    const eligResults = [eligResult('g4-ni-l3')];
    const signals = computeComponentSignals(records, eligResults);
    expect(signals.niStatus).toBe('computed');
    expect(signals.ni).toBeCloseTo(1.00, 2);
  });

  it('NI and IU EV scale both assign 0.25 to L0 post-alignment (no semantic drift)', () => {
    // After Sprint 3 canonical alignment: L0 = 0.25 in both scales.
    // NI uses EVIDENCE_WEIGHTS (component-engine); IU uses EV_BY_EVIDENCE_TYPE (IUComputationService).
    // They are independent tables that happen to share the same L0 canonical value.
    const records = [makeRecord({ id: 'g4-dual', categoria: 'sviluppo competenze digitali', partecipanti: 30, workforce: 100, evidence: 'L0' })];
    const eligResults = [eligResult('g4-dual')];

    // Component NI scale
    const signals = computeComponentSignals(records, eligResults);
    expect(signals.ni).toBeCloseTo(0.25, 2);

    // IU EV scale
    const result = runKoraPipeline({ tenantId: 'g4-dual-iu', records, workforcePopulation: 100 });
    const iuRec = result.iuResults?.find(r => r.computed);
    expect(iuRec?.evidence_verification_ev).toBeCloseTo(0.25, 5);
  });

});

// ── G5: equityScore is a deprecated diagnostic — not used in KORA Index ───────

describe('G5 — equityScore is a deprecated field, not used in KORA Index EQUITY macroblock', () => {

  it('computeEquityScore returns equityScore (PC×0.60+PB×0.40) but kora-index-engine does not use it', () => {
    // Uniform 5-pillar distribution → PC=100, PB=100 → equityScore=100.
    // KORA Index EQUITY macroblock (EQW=0+EQS=0+PC×0.25+PB×0.25) = 50 ≠ 100.
    // This proves the two are independent and equityScore is NOT the macroblock value.
    const uniformDist = { LIFE: 20, GROWTH: 20, CONNECTION: 20, IMPACT: 20, LEGACY: 20 };
    const equityResult = computeEquityScore(uniformDist);

    // equityScore = PC×0.60 + PB×0.40 = 100×0.60 + 100×0.40 = 100
    expect(equityResult.equityScore).toBe(100);
    expect(equityResult.pillarCoverageScore).toBe(100);
    expect(equityResult.pillarBalanceScore).toBe(100);

    // KORA Index EQUITY macroblock (Foundation Light, EQW+EQS both 0)
    // max = PC×0.25 + PB×0.25 = 50 — clearly different from equityScore=100
    const records = [
      makeRecord({ id: 'g5-life',       categoria: 'supporto psicologico benessere mentale', partecipanti: 20, workforce: 100 }),
      makeRecord({ id: 'g5-growth',     categoria: 'sviluppo competenze digitali',             partecipanti: 20, workforce: 100 }),
      makeRecord({ id: 'g5-connection', categoria: 'mentoring aziendale colleghi',             partecipanti: 20, workforce: 100 }),
      makeRecord({ id: 'g5-impact',     categoria: 'volontariato aziendale territorio',        partecipanti: 20, workforce: 100 }),
      makeRecord({ id: 'g5-legacy',     categoria: 'programma legacy knowledge transfer',      partecipanti: 20, workforce: 100 }),
    ];
    const result = runKoraPipeline({ tenantId: 'g5-equity-check', records, workforcePopulation: 100 });
    // EQUITY macroblock ≤ 50 (FL base ceiling) — not 100
    expect(result.koraIndex.macroblocks.distributionEquity).toBeLessThanOrEqual(50);
    // equityScore = 100 is NOT the KORA Index EQUITY value (50)
    expect(equityResult.equityScore).toBeGreaterThan(result.koraIndex.macroblocks.distributionEquity);
  });

  it('isInsufficientData=false when pillarDistribution has IU values', () => {
    const result = computeEquityScore({ LIFE: 10, GROWTH: 10, CONNECTION: 10, IMPACT: 10, LEGACY: 10 });
    expect(result.isInsufficientData).toBe(false);
    expect(result.pillarCoverageScore).toBe(100);
  });

  it('isInsufficientData=true when pillarDistribution is null', () => {
    const result = computeEquityScore(null);
    expect(result.isInsufficientData).toBe(true);
  });

});
