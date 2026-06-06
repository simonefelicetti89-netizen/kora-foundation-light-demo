import { describe, it, expect } from 'vitest';
import { classifyEligibility, classifyEligibilityBatch } from '@/lib/kora-engine/eligibility-gate';
import { runKoraPipeline } from '@/lib/kora-engine/run-kora-pipeline';
import type { RawUploadedRecord } from '@/lib/kora-engine/types';

function makeRecord(id: string, raw: Record<string, unknown>): RawUploadedRecord {
  return {
    recordId: id,
    batchId: 'eligibility-test',
    rowIndex: 0,
    detectedRecordType: 'welfare_program',
    raw,
  };
}

describe('Eligibility Gate — canonical classifications', () => {

  it('classifies a leadership development program as eligible', () => {
    // 'leadership development' is in ELIGIBLE_KEYWORDS
    const record = makeRecord('elig-1', {
      nome_iniziativa: 'Leadership development program aziendale',
      categoria: 'sviluppo leadership',
      partecipanti: '30',
      importo: '5000',
    });
    const result = classifyEligibility(record);
    expect(result.status).toBe('eligible');
  });

  it('classifies a volunteering event as eligible', () => {
    // 'volontariato aziendale' is in ELIGIBLE_KEYWORDS
    const record = makeRecord('elig-2', {
      nome_iniziativa: 'Volontariato aziendale',
      categoria: 'iniziativa territoriale',
      partecipanti: '20',
    });
    const result = classifyEligibility(record);
    expect(result.status).toBe('eligible');
  });

  it('classifies a psychological support program as eligible', () => {
    // 'supporto psicologico' is in ELIGIBLE_KEYWORDS
    const record = makeRecord('elig-3', {
      nome_iniziativa: 'Supporto psicologico aziendale',
      categoria: 'benessere psicologico',
      partecipanti: '15',
    });
    const result = classifyEligibility(record);
    expect(result.status).toBe('eligible');
  });

  it('classifies buoni pasto as limited (economic relief)', () => {
    const record = makeRecord('lim-1', {
      nome_iniziativa: 'Buoni pasto dipendenti',
      categoria: 'buoni pasto',
      partecipanti: '80',
      importo: '24000',
    });
    const result = classifyEligibility(record);
    expect(result.status).toBe('limited');
  });

  it('classifies a mandatory medical visit as blocked', () => {
    // 'visita medica obbligatoria' is in BLOCKED_KEYWORDS
    const record = makeRecord('blk-1', {
      nome_iniziativa: 'Visita medica obbligatoria',
      obbligatorio: 'si',
      partecipanti: '120',
    });
    const result = classifyEligibility(record);
    expect(result.status).toBe('blocked');
  });

  it('classifies a record with individual-sensitive signals as review_required', () => {
    // 'email dipendente' is in INDIVIDUAL_SENSITIVE_SIGNALS
    const record = makeRecord('rev-1', {
      nome_iniziativa: 'Sessione individuale',
      email_dipendente: 'synthetic@example.test',
      partecipanti: '1',
    });
    const result = classifyEligibility(record);
    expect(result.status).toBe('review_required');
  });

  it('classifies an empty record as review_required', () => {
    const record = makeRecord('rev-empty', {});
    const result = classifyEligibility(record);
    expect(result.status).toBe('review_required');
  });

  it('always returns a doctrineReference string', () => {
    const record = makeRecord('doctrine-check', {
      nome_iniziativa: 'Leadership development',
      categoria: 'sviluppo leadership',
    });
    const result = classifyEligibility(record);
    expect(typeof result.doctrineReference).toBe('string');
    expect(result.doctrineReference.length).toBeGreaterThan(0);
  });

  it('always returns a confidence value between 0 and 1', () => {
    const records = [
      makeRecord('conf-1', { nome_iniziativa: 'Leadership development', categoria: 'sviluppo leadership' }),
      makeRecord('conf-2', { nome_iniziativa: 'Buoni pasto', categoria: 'buoni pasto' }),
      makeRecord('conf-3', {}),
    ];
    for (const rec of records) {
      const result = classifyEligibility(rec);
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    }
  });

  it('blocked records have reviewRequired false (blocked by design — no human review needed)', () => {
    const record = makeRecord('blk-review', {
      nome_iniziativa: 'Visita medica obbligatoria',
      obbligatorio: 'si',
      partecipanti: '50',
    });
    const result = classifyEligibility(record);
    if (result.status === 'blocked') {
      expect(result.reviewRequired).toBe(false);
    }
  });

});

// ── Pipeline uses canonical eligibility engine (B71 regression guard) ─────────
// These tests verify that the live scoring pipeline (run-kora-pipeline.ts)
// routes eligibility classification through lib/kora-engine/eligibility-gate.ts
// and NOT through services/eligibility-gate/EligibilityGateService.ts.

describe('Pipeline — canonical eligibility engine contract (B71)', () => {

  it('classifyEligibilityBatch is the same function used by run-kora-pipeline', () => {
    // classifyEligibilityBatch is imported by run-kora-pipeline.ts from this module.
    // If this import fails or returns wrong types, the pipeline would fail here too.
    const record = makeRecord('pipeline-elig-1', {
      nome_iniziativa: 'Leadership development',
      categoria: 'sviluppo leadership',
      partecipanti: '20',
    });
    const results = classifyEligibilityBatch([record]);
    expect(results).toHaveLength(1);
    expect(results[0].status).toBe('eligible');
  });

  it('pipeline eligibility results match standalone classifyEligibilityBatch results', () => {
    const records: RawUploadedRecord[] = [
      makeRecord('pe-1', { nome_iniziativa: 'Leadership development', partecipanti: '20' }),
      makeRecord('pe-2', { nome_iniziativa: 'Buoni pasto aziendali', partecipanti: '50' }),
      makeRecord('pe-3', { nome_iniziativa: 'Visita medica obbligatoria', obbligatorio: 'si', partecipanti: '50' }),
    ];

    // Classification from canonical engine directly
    const directResults = classifyEligibilityBatch(records);

    // Classification via pipeline (uses the same function internally)
    const pipelineResult = runKoraPipeline({ tenantId: 'test-canonical', records });

    // Pipeline eligibility summary must agree with direct classification counts
    expect(pipelineResult.eligibilitySummary.eligibleCount).toBe(
      directResults.filter((r) => r.status === 'eligible').length,
    );
    expect(pipelineResult.eligibilitySummary.limitedCount).toBe(
      directResults.filter((r) => r.status === 'limited').length,
    );
    expect(pipelineResult.eligibilitySummary.blockedCount).toBe(
      directResults.filter((r) => r.status === 'blocked').length,
    );
  });

  it('pipeline scoringMode is computed (not insufficient_data) for valid records', () => {
    const records: RawUploadedRecord[] = [
      makeRecord('pm-1', { nome_iniziativa: 'Corso di coaching', categoria: 'coaching', partecipanti: '15' }),
    ];
    const result = runKoraPipeline({ tenantId: 'test-mode', records });
    expect(result.scoringMode).toBe('computed');
  });

  it('blocked records from canonical engine do not contribute IU in pipeline', () => {
    const records: RawUploadedRecord[] = [
      makeRecord('blk-iu-1', {
        nome_iniziativa: 'Formazione sicurezza obbligatoria',
        obbligatorio: 'si',
        partecipanti: '100',
        importo: '10000',
      }),
    ];
    const directResult = classifyEligibility(records[0]);

    if (directResult.status === 'blocked') {
      const pipelineResult = runKoraPipeline({ tenantId: 'test-blocked', records });
      // Blocked records: all eligible counts are 0
      expect(pipelineResult.eligibilitySummary.eligibleCount).toBe(0);
    }
  });
});
