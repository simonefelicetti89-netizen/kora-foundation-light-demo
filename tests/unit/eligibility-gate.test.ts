import { describe, it, expect } from 'vitest';
import { classifyEligibility } from '@/lib/kora-engine/eligibility-gate';
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
