// b89b-pipeline-integration.test.ts
// Pipeline smoke test — B89-B Architecture Hardening Sprint.
//
// Verifies that run-kora-pipeline (lib/kora-engine/run-kora-pipeline.ts) runs
// end-to-end without throwing, produces a structurally correct KoraComputationResult,
// and respects canonical invariants.
//
// This test is NOT for numerical calibration accuracy.
// It is a structural smoke test proving the real engine runs end-to-end.
//
// Confirmed: no formula changes, no methodology changes, no DB changes.

import { describe, it, expect } from 'vitest';
import { runKoraPipeline, KORA_PIPELINE_VERSION } from '../../lib/kora-engine/run-kora-pipeline';
import type { RawUploadedRecord } from '../../lib/kora-engine/types';

// ── Synthetic record factory ──────────────────────────────────────────────────
// These records are minimal but structurally valid for the pipeline.
// They represent 5 events (one per KORA pillar) to exercise pillar mapping.

function makeRecord(
  index: number,
  raw: Record<string, unknown>,
  type: RawUploadedRecord['detectedRecordType'] = 'welfare_program',
): RawUploadedRecord {
  return {
    recordId: `test-record-${index}`,
    batchId: 'test-batch-b89b',
    rowIndex: index,
    detectedRecordType: type,
    raw,
  };
}

const SYNTHETIC_RECORDS: RawUploadedRecord[] = [
  // LIFE — psychological support (welfare_program)
  makeRecord(0, {
    raw_name: 'Supporto psicologico individuale',
    raw_description: 'Percorso di supporto psicologico con psicologo certificato su richiesta volontaria',
    source_type: 'welfare_provider',
    mandatory_status: 'voluntary',
    provider_name: 'Mindwork',
    amount_eur: 45000,
    evidence_status: 'certified_partner',
    evidence_reference: 'Contratto partner Mindwork 2025',
  }),
  // GROWTH — professional training (training)
  makeRecord(1, {
    raw_name: 'Formazione professionale digitale',
    raw_description: 'Percorso di upskilling digitale e certificazione competenze digitali',
    source_type: 'lms_training',
    mandatory_status: 'voluntary',
    provider_name: 'Coursera Enterprise',
    amount_eur: 20000,
    evidence_status: 'platform_export',
  }, 'training'),
  // CONNECTION — mentoring program (welfare_program)
  makeRecord(2, {
    raw_name: 'Programma di mentoring peer-to-peer',
    raw_description: 'Percorso di mentoring tra colleghi senior e junior per sviluppo soft skills',
    source_type: 'hr_system',
    mandatory_status: 'voluntary',
    amount_eur: 5000,
    evidence_status: 'hr_confirmed',
  }),
  // IMPACT — volunteering initiative (welfare_program)
  makeRecord(3, {
    raw_name: 'Volontariato aziendale territoriale',
    raw_description: 'Iniziativa di volontariato in supporto alla comunità locale',
    source_type: 'esg_initiatives',
    mandatory_status: 'voluntary',
    amount_eur: 12000,
    evidence_status: 'certified_partner',
    evidence_reference: 'Report CSR 2025',
  }),
  // LEGACY — knowledge transfer program (welfare_program)
  makeRecord(4, {
    raw_name: 'Programma trasferimento conoscenza senior-junior',
    raw_description: 'Sessioni strutturate di knowledge transfer tra dipendenti senior e neoassunti',
    source_type: 'hr_system',
    mandatory_status: 'optional',
    amount_eur: 8000,
    evidence_status: 'hr_confirmed',
  }),
];

// ── Smoke tests ───────────────────────────────────────────────────────────────

describe('KORA Pipeline — end-to-end smoke test', () => {
  const result = runKoraPipeline({
    tenantId: 'test-tenant-b89b',
    batchId: 'test-batch-b89b',
    records: SYNTHETIC_RECORDS,
    workforcePopulation: 100,
  });

  it('pipeline returns without throwing', () => {
    expect(result).toBeDefined();
  });

  it('pipeline version is defined', () => {
    expect(KORA_PIPELINE_VERSION).toBeTruthy();
    expect(typeof KORA_PIPELINE_VERSION).toBe('string');
  });

  it('result has tenantId and batchId', () => {
    expect(result.tenantId).toBe('test-tenant-b89b');
    expect(result.batchId).toBe('test-batch-b89b');
  });

  it('scoringMode is computed or insufficient_data (never undefined)', () => {
    expect(['computed', 'insufficient_data', 'seeded_demo']).toContain(result.scoringMode);
  });

  it('eligibilitySummary is present with required fields', () => {
    expect(result.eligibilitySummary).toBeDefined();
    expect(typeof result.eligibilitySummary.totalCount).toBe('number');
    expect(typeof result.eligibilitySummary.eligibleCount).toBe('number');
    expect(typeof result.eligibilitySummary.blockedCount).toBe('number');
  });

  it('koraIndex result is present', () => {
    expect(result.koraIndex).toBeDefined();
    expect(typeof result.koraIndex.value).toBe('number');
    expect(result.koraIndex.value).toBeGreaterThanOrEqual(0);
    expect(result.koraIndex.value).toBeLessThanOrEqual(100);
  });

  it('koraIndex has all 4 macroblocks', () => {
    const mb = result.koraIndex.macroblocks;
    expect(mb).toBeDefined();
    expect(typeof mb.activationReach).toBe('number');
    expect(typeof mb.activationQuality).toBe('number');
    expect(typeof mb.distributionEquity).toBe('number');
    expect(typeof mb.budgetToHumanImpact).toBe('number');
  });

  it('koraIndex weights are present and reference methodology config', () => {
    // Weights keys are REACH, QUALITY, EQUITY, BTI (from kora-index-engine.ts)
    const weights = result.koraIndex.weights;
    expect(weights).toBeDefined();
    expect(typeof weights['REACH']).toBe('number');
    expect(typeof weights['QUALITY']).toBe('number');
    expect(typeof weights['EQUITY']).toBe('number');
    expect(typeof weights['BTI']).toBe('number');
    // Macroblock weights must sum to 1.0 (methodology invariant)
    const sum = (weights['REACH'] ?? 0) + (weights['QUALITY'] ?? 0) +
                (weights['EQUITY'] ?? 0) + (weights['BTI'] ?? 0);
    expect(sum).toBeCloseTo(1.0, 5);
  });

  it('Activation Safeguard status is present', () => {
    expect(result.activation).toBeDefined();
    expect(['CLEAR', 'WARNING', 'FLAGGED']).toContain(result.activation.safeguardStatus);
  });

  it('Confidence Score is present', () => {
    expect(result.confidence).toBeDefined();
    expect(typeof result.confidence.score).toBe('number');
    // Confidence score is 0–100 (same scale as KORA Index)
    expect(result.confidence.score).toBeGreaterThanOrEqual(0);
    expect(result.confidence.score).toBeLessThanOrEqual(100);
    // CS is always external to KORA Index v1.0 (architectural invariant)
    expect(result.confidence.externalToIndex).toBe(true);
  });

  it('PIB aggregation is present', () => {
    expect(result.pibAggregation).toBeDefined();
    expect(typeof result.pibAggregation!.workforceCount).toBe('number');
    expect(typeof result.pibAggregation!.totalIU).toBe('number');
  });

  it('IU summary is present', () => {
    expect(result.iuSummary).toBeDefined();
    expect(typeof result.iuSummary!.total_impact_units).toBe('number');
  });

  it('warnings is an array (may be empty)', () => {
    expect(Array.isArray(result.warnings)).toBe(true);
  });

  it('createdAt is a non-empty ISO string', () => {
    expect(typeof result.createdAt).toBe('string');
    expect(result.createdAt.length).toBeGreaterThan(10);
  });

  it('pillar distribution has all 5 KORA pillars', () => {
    const pillars = ['LIFE', 'GROWTH', 'CONNECTION', 'IMPACT', 'LEGACY'] as const;
    for (const pillar of pillars) {
      expect(typeof result.pillarDistribution[pillar]).toBe('number');
    }
  });

  it('methodology version is present on koraIndex', () => {
    expect(result.koraIndex.methodologyVersion).toBeTruthy();
  });

  it('calibration status is pre_empirical_calibration', () => {
    expect(result.koraIndex.calibrationStatus).toBe('pre_empirical_calibration');
  });
});

describe('KORA Pipeline — empty records guard', () => {
  const emptyResult = runKoraPipeline({
    tenantId: 'test-empty',
    records: [],
  });

  it('returns insufficient_data for empty record set', () => {
    expect(emptyResult.scoringMode).toBe('insufficient_data');
  });

  it('never throws on empty records', () => {
    expect(emptyResult).toBeDefined();
  });

  it('KORA Index is 0 for empty records', () => {
    expect(emptyResult.koraIndex.value).toBe(0);
  });

  it('Activation Safeguard is WARNING or FLAGGED for empty records', () => {
    expect(['WARNING', 'FLAGGED']).toContain(emptyResult.activation.safeguardStatus);
  });
});

describe('KORA Pipeline — structural invariants', () => {
  it('macroblock weights sum to 1.0 across all runs', () => {
    const r = runKoraPipeline({
      tenantId: 'invariant-test',
      records: SYNTHETIC_RECORDS.slice(0, 3),
      workforcePopulation: 50,
    });
    const weights = r.koraIndex.weights;
    const sum = (weights['REACH'] ?? 0) + (weights['QUALITY'] ?? 0) +
                (weights['EQUITY'] ?? 0) + (weights['BTI'] ?? 0);
    expect(sum).toBeCloseTo(1.0, 5);
  });

  it('confidence is always external to KORA Index', () => {
    const r = runKoraPipeline({
      tenantId: 'invariant-test-2',
      records: SYNTHETIC_RECORDS,
      workforcePopulation: 100,
    });
    expect(r.confidence.externalToIndex).toBe(true);
  });

  it('koraIndex value is always 0–100', () => {
    const r = runKoraPipeline({
      tenantId: 'range-test',
      records: SYNTHETIC_RECORDS,
      workforcePopulation: 100,
    });
    expect(r.koraIndex.value).toBeGreaterThanOrEqual(0);
    expect(r.koraIndex.value).toBeLessThanOrEqual(100);
  });
});
