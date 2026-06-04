import { describe, it, expect } from 'vitest';
import {
  ACTIVATION_SAFEGUARD_CLEAR_AR,
  ACTIVATION_SAFEGUARD_CLEAR_MAR,
  ACTIVATION_SAFEGUARD_WARN_AR,
  ACTIVATION_SAFEGUARD_WARN_MAR,
  computeActivationFromRecords,
} from '@/lib/kora-engine/activation-engine';
import type { RawUploadedRecord } from '@/lib/kora-engine/types';

// ── Threshold constants — D-21 canonical values ────────────────────────────────

describe('Activation Safeguard — threshold constants (D-21)', () => {

  it('CLEAR AR threshold is 0.40', () => {
    expect(ACTIVATION_SAFEGUARD_CLEAR_AR).toBe(0.40);
  });

  it('CLEAR MAR threshold is 0.30', () => {
    expect(ACTIVATION_SAFEGUARD_CLEAR_MAR).toBe(0.30);
  });

  it('FLAGGED AR threshold is 0.20', () => {
    expect(ACTIVATION_SAFEGUARD_WARN_AR).toBe(0.20);
  });

  it('FLAGGED MAR threshold is 0.15', () => {
    expect(ACTIVATION_SAFEGUARD_WARN_MAR).toBe(0.15);
  });

});

// ── Helper: minimal record with known activation signals ───────────────────────

function eligibleRecord(id: string, participants: number, workforce: number): RawUploadedRecord {
  return {
    recordId: id,
    batchId: 'safeguard-test',
    rowIndex: 0,
    detectedRecordType: 'welfare_program',
    raw: {
      nome_iniziativa: 'Leadership development program',
      categoria: 'sviluppo leadership',
      partecipanti: String(participants),
      forza_lavoro: String(workforce),
      importo: '5000',
    },
  };
}

function limitedRecord(id: string, participants: number, workforce: number): RawUploadedRecord {
  return {
    recordId: id,
    batchId: 'safeguard-test',
    rowIndex: 1,
    detectedRecordType: 'welfare_program',
    raw: {
      nome_iniziativa: 'Buoni pasto',
      categoria: 'buoni pasto',
      partecipanti: String(participants),
      forza_lavoro: String(workforce),
      importo: '12000',
    },
  };
}

// ── Safeguard status tests ─────────────────────────────────────────────────────

describe('Activation Safeguard — output validity', () => {

  it('safeguardStatus is always one of CLEAR, WARNING, FLAGGED', () => {
    const records = [eligibleRecord('e1', 60, 100)];
    const result = computeActivationFromRecords(records, 100);
    expect(['CLEAR', 'WARNING', 'FLAGGED']).toContain(result.safeguardStatus);
  });

  it('returns WARNING when workforce is unknown (no workforcePopulation and no signal)', () => {
    // No forza_lavoro in raw → workforce unknown → cannot be CLEAR (engine conservative rule)
    const records: RawUploadedRecord[] = [{
      recordId: 'no-wf-1',
      batchId: 'safeguard-test',
      rowIndex: 0,
      detectedRecordType: 'welfare_program',
      raw: {
        nome_iniziativa: 'Leadership development',
        categoria: 'sviluppo leadership',
        partecipanti: '50',
        importo: '5000',
        // no forza_lavoro — workforce unknown
      },
    }];
    const result = computeActivationFromRecords(records); // no workforcePopulation
    // Without workforce baseline, AR cannot be computed → WARNING or FLAGGED
    expect(['WARNING', 'FLAGGED']).toContain(result.safeguardStatus);
  });

  it('returns FLAGGED for very low participant count relative to workforce', () => {
    // 5 participants out of 500 → AR ~0.01, well below FLAGGED threshold of 0.20
    const records = [eligibleRecord('flag-1', 5, 500)];
    const result = computeActivationFromRecords(records, 500);
    expect(result.safeguardStatus).toBe('FLAGGED');
  });

  it('only limited (economic relief) records cannot achieve CLEAR (MAR = 0)', () => {
    // Limited records count for active reach but NOT meaningful activation.
    // MAR = 0 → cannot reach CLEAR threshold (MAR >= 0.30)
    const records = [limitedRecord('lim-1', 60, 100)];
    const result = computeActivationFromRecords(records, 100);
    // CLEAR requires MAR >= 0.30; limited records generate no meaningful activation
    expect(['WARNING', 'FLAGGED']).toContain(result.safeguardStatus);
  });

  it('activationReach is between 0 and 1', () => {
    const records = [eligibleRecord('range-1', 40, 100)];
    const result = computeActivationFromRecords(records, 100);
    expect(result.activationReach).toBeGreaterThanOrEqual(0);
    expect(result.activationReach).toBeLessThanOrEqual(1);
  });

  it('meaningfulActivationReach is always <= activationReach', () => {
    const records = [
      eligibleRecord('mar-e', 30, 100),
      limitedRecord('mar-l', 20, 100),
    ];
    const result = computeActivationFromRecords(records, 100);
    expect(result.meaningfulActivationReach).toBeLessThanOrEqual(result.activationReach);
  });

  it('empty records array returns WARNING safeguard status', () => {
    const result = computeActivationFromRecords([]);
    expect(result.safeguardStatus).toBe('WARNING');
  });

  it('warnings array is always returned (even with no issues)', () => {
    const records = [eligibleRecord('warn-check', 40, 100)];
    const result = computeActivationFromRecords(records, 100);
    expect(Array.isArray(result.warnings)).toBe(true);
  });

});
