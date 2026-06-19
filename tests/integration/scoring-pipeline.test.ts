import { describe, it, expect } from 'vitest';
import { runKoraPipeline } from '@/lib/kora-engine/run-kora-pipeline';
import type { RawUploadedRecord } from '@/lib/kora-engine/types';

// Synthetic records — no real people, no real company data.
// Covers the four eligibility statuses to exercise all engine branches.
const SYNTHETIC_RECORDS: RawUploadedRecord[] = [
  {
    recordId: 'test-eligible-1',
    batchId: 'test-batch-001',
    rowIndex: 0,
    detectedRecordType: 'welfare_program',
    raw: {
      nome_iniziativa: 'Corso leadership avanzato',
      categoria: 'formazione professionale',
      partecipanti: '30',
      durata_ore: '16',
      forza_lavoro: '120',
      importo: '8000',
      provider: 'FormAzione Srl',
    },
  },
  {
    recordId: 'test-eligible-2',
    batchId: 'test-batch-001',
    rowIndex: 1,
    detectedRecordType: 'welfare_program',
    raw: {
      nome_iniziativa: 'Programma volontariato aziendale',
      categoria: 'volontariato territoriale',
      partecipanti: '25',
      forza_lavoro: '120',
      importo: '3000',
    },
  },
  {
    recordId: 'test-eligible-3',
    batchId: 'test-batch-001',
    rowIndex: 2,
    detectedRecordType: 'welfare_program',
    raw: {
      nome_iniziativa: 'Supporto psicologico dipendenti',
      categoria: 'benessere mentale programma',
      partecipanti: '18',
      forza_lavoro: '120',
      importo: '5500',
    },
  },
  {
    recordId: 'test-limited-1',
    batchId: 'test-batch-001',
    rowIndex: 3,
    detectedRecordType: 'welfare_program',
    raw: {
      nome_iniziativa: 'Buoni pasto dipendenti',
      categoria: 'buoni pasto',
      partecipanti: '80',
      forza_lavoro: '120',
      importo: '24000',
    },
  },
  {
    recordId: 'test-blocked-1',
    batchId: 'test-batch-001',
    rowIndex: 4,
    detectedRecordType: 'welfare_program',
    raw: {
      nome_iniziativa: 'Visita medica obbligatoria per legge',
      categoria: 'visita medica obbligatoria',
      partecipanti: '120',
      forza_lavoro: '120',
      importo: '6000',
      obbligatorio: 'si',
    },
  },
];

describe('KORA Scoring Pipeline — integration', () => {

  it('runs without throwing and returns a result object', () => {
    const result = runKoraPipeline({
      tenantId: 'test-tenant-integration',
      batchId: 'test-batch-001',
      records: SYNTHETIC_RECORDS,
      workforcePopulation: 120,
    });
    expect(result).toBeTruthy();
    expect(result.koraIndex).toBeTruthy();
  });

  it('returns scoringMode computed (not insufficient_data)', () => {
    const result = runKoraPipeline({
      tenantId: 'test-tenant-integration',
      batchId: 'test-batch-001',
      records: SYNTHETIC_RECORDS,
      workforcePopulation: 120,
    });
    expect(result.scoringMode).toBe('computed');
  });

  it('KORA Index value is between 0 and 100', () => {
    const result = runKoraPipeline({
      tenantId: 'test-tenant-integration',
      batchId: 'test-batch-001',
      records: SYNTHETIC_RECORDS,
      workforcePopulation: 120,
    });
    expect(result.koraIndex.value).toBeGreaterThanOrEqual(0);
    expect(result.koraIndex.value).toBeLessThanOrEqual(100);
  });

  it('calibrationStatus is pre_empirical_calibration', () => {
    const result = runKoraPipeline({
      tenantId: 'test-tenant-integration',
      batchId: 'test-batch-001',
      records: SYNTHETIC_RECORDS,
      workforcePopulation: 120,
    });
    expect(result.koraIndex.calibrationStatus).toBe('pre_empirical_calibration');
  });

  it('productionReady is false', () => {
    const result = runKoraPipeline({
      tenantId: 'test-tenant-integration',
      batchId: 'test-batch-001',
      records: SYNTHETIC_RECORDS,
      workforcePopulation: 120,
    });
    expect(result.koraIndex.productionReady).toBe(false);
  });

  it('safeguardStatus is one of CLEAR, WARNING, or FLAGGED', () => {
    const result = runKoraPipeline({
      tenantId: 'test-tenant-integration',
      batchId: 'test-batch-001',
      records: SYNTHETIC_RECORDS,
      workforcePopulation: 120,
    });
    expect(['CLEAR', 'WARNING', 'FLAGGED']).toContain(result.activation.safeguardStatus);
  });

  it('macroblock weights sum to 1.00', () => {
    const result = runKoraPipeline({
      tenantId: 'test-tenant-integration',
      batchId: 'test-batch-001',
      records: SYNTHETIC_RECORDS,
      workforcePopulation: 120,
    });
    const { REACH, QUALITY, EQUITY, BTI } = result.koraIndex.weights;
    const total = REACH + QUALITY + EQUITY + BTI;
    expect(Math.abs(total - 1.0)).toBeLessThan(0.001);
  });

  it('Confidence Score is marked external to KORA Index', () => {
    const result = runKoraPipeline({
      tenantId: 'test-tenant-integration',
      batchId: 'test-batch-001',
      records: SYNTHETIC_RECORDS,
      workforcePopulation: 120,
    });
    expect(result.confidence.externalToIndex).toBe(true);
  });

  it('returns insufficient_data when records array is empty', () => {
    const result = runKoraPipeline({
      tenantId: 'test-tenant-integration',
      batchId: 'test-batch-empty',
      records: [],
      workforcePopulation: 120,
    });
    expect(result.scoringMode).toBe('insufficient_data');
    expect(result.koraIndex.value).toBe(0);
  });

  it('eligibility summary counts match expected categories', () => {
    const result = runKoraPipeline({
      tenantId: 'test-tenant-integration',
      batchId: 'test-batch-001',
      records: SYNTHETIC_RECORDS,
      workforcePopulation: 120,
    });
    const { eligibilitySummary } = result;
    expect(eligibilitySummary.totalCount).toBe(SYNTHETIC_RECORDS.length);
    // blocked count: 1 (visita medica obbligatoria)
    expect(eligibilitySummary.blockedCount).toBeGreaterThanOrEqual(1);
    // limited count: 1 (buoni pasto)
    expect(eligibilitySummary.limitedCount).toBeGreaterThanOrEqual(1);
    // eligible count: at least the 3 eligible records
    expect(eligibilitySummary.eligibleCount).toBeGreaterThanOrEqual(1);
  });

  // ── B146 — Revenue spine coverage ────────────────────────────────────────────

  it('output carries all 10 KORA Index component signals across result fields', () => {
    const result = runKoraPipeline({
      tenantId: 'test-tenant-integration',
      batchId: 'test-batch-001',
      records: SYNTHETIC_RECORDS,
      workforcePopulation: 120,
    });

    // AR, MAR — Activation Reach macroblock
    expect(typeof result.activation.activationReach).toBe('number');
    expect(typeof result.activation.meaningfulActivationReach).toBe('number');

    // NI, VR, CO — Activation Quality macroblock
    expect(typeof result.componentSignals.ni).toBe('number');
    expect(typeof result.componentSignals.vr).toBe('number');
    expect(typeof result.componentSignals.co).toBe('number');

    // EQW, EQS, PC, PB — Distribution & Equity macroblock (Sprint 1 v2.0 names)
    const cd = result.koraIndex.componentDetail;
    expect(cd).toBeTruthy();
    if (cd) {
      expect(typeof cd.eqw).toBe('number');
      expect(typeof cd.eqs).toBe('number');
      expect(typeof cd.pc).toBe('number');
      expect(typeof cd.pb).toBe('number');
    }

    // CS — Confidence Score (external to KORA Index per doc 21b)
    expect(typeof result.confidence.score).toBe('number');
  });

  it('VR is computed for records with eligible evidence, insufficient_data for empty pipeline', () => {
    const full = runKoraPipeline({
      tenantId: 'test-tenant-vr',
      batchId: 'test-batch-vr-full',
      records: SYNTHETIC_RECORDS,
      workforcePopulation: 120,
    });
    const empty = runKoraPipeline({
      tenantId: 'test-tenant-vr',
      batchId: 'test-batch-vr-empty',
      records: [],
      workforcePopulation: 120,
    });

    // Empty pipeline: no eligible records → VR cannot be computed
    expect(empty.componentSignals.vrStatus).toBe('insufficient_data');

    // Non-empty pipeline: VR is computed and in valid range [0, 1]
    expect(full.componentSignals.vrStatus).toBe('computed');
    expect(full.componentSignals.vr).toBeGreaterThanOrEqual(0);
    expect(full.componentSignals.vr).toBeLessThanOrEqual(1);
  });

  it('pipeline output is compatible with Decision Pack persistence contract', () => {
    const result = runKoraPipeline({
      tenantId: 'test-tenant-integration',
      batchId: 'test-batch-001',
      records: SYNTHETIC_RECORDS,
      workforcePopulation: 120,
    });

    // Fields required by analytics.kora_index_result DB schema (workspace route + decision pack)
    expect(typeof result.koraIndex.value).toBe('number');
    expect(typeof result.confidence.score).toBe('number');
    expect(['CLEAR', 'WARNING', 'FLAGGED']).toContain(result.activation.safeguardStatus);
    expect(typeof result.activation.activationReach).toBe('number');
    expect(typeof result.activation.meaningfulActivationReach).toBe('number');

    // Macroblock structure required for persistence in kora_index_result.macroblocks JSONB
    const mb = result.koraIndex.macroblocks;
    expect(typeof mb.activationReach).toBe('number');
    expect(typeof mb.activationQuality).toBe('number');
    expect(typeof mb.distributionEquity).toBe('number');
    expect(typeof mb.budgetToHumanImpact).toBe('number');

    // Non-suppressible methodology labels required by doc 21b
    expect(result.koraIndex.calibrationStatus).toBe('pre_empirical_calibration');
    expect(typeof result.koraIndex.methodologyVersion).toBe('string');
    expect(result.confidence.externalToIndex).toBe(true);
  });

});
