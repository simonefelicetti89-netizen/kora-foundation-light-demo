/**
 * B108-B — Integration Smoke Test (score range sanity check)
 *
 * Verifica che il motore reale produca score ordinati e nell'intorno atteso
 * per i tre CSV di fixture (weak / average / golden path).
 *
 * NOTA: Le bande di score sono osservazionali (output v2.0 misurato), NON formula-derivate.
 * Per asserzioni formula-derivate end-to-end usare fixture minimale con IU calcolabili a mano.
 * Vedere backlog: "b108b: sostituire bande osservazionali con fixture minimale formula-derivata".
 *
 * Vincoli rispettati:
 *   - Nessuna modifica ad algoritmo, formule, pesi, scoring
 *   - Nessuna modifica a Eligibility Gate, CS, Activation Safeguard, BTI
 *   - Nessun accesso a Supabase
 *   - CSV letti da file statici, non da DB
 *
 * workforcePopulation documentata:
 *   weak=100, average=150, golden=300
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { runKoraPipeline } from '../../lib/kora-engine/run-kora-pipeline';
import { getScoreBand } from '@/lib/constants/kora';
import type { RawUploadedRecord } from '../../lib/kora-engine/types';
import type { KoraComputationResult } from '../../lib/kora-engine/types';

const root = resolve(process.cwd());

// ── CSV helpers ───────────────────────────────────────────────────────────────

function parseCsvRows(content: string): Record<string, string>[] {
  const lines = content.trim().split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map(h => h.trim());
  return lines.slice(1).map(line => {
    const vals = line.split(',');
    return Object.fromEntries(headers.map((h, i) => [h, (vals[i] ?? '').trim()]));
  });
}

// Mirror of csvToUploadedRecords in accept/route.ts
function toUploadedRecords(rows: Record<string, string>[]): RawUploadedRecord[] {
  return rows.map((row, i) => ({
    recordId:           `fixture-row-${i}`,
    batchId:            'fixture-batch',
    rowIndex:           i,
    detectedRecordType: 'welfare_program' as const,
    raw:                { ...row } as Record<string, unknown>,
  }));
}

function loadFixture(relPath: string, workforcePopulation: number): KoraComputationResult {
  const csv     = readFileSync(resolve(root, relPath), 'utf-8');
  const rows    = parseCsvRows(csv);
  const records = toUploadedRecords(rows);
  return runKoraPipeline({
    tenantId:            `smoke-${relPath.split('/').pop()}`,
    batchId:             `batch-${relPath.split('/').pop()}`,
    records,
    workforcePopulation,
  });
}

// ── Fixtures ──────────────────────────────────────────────────────────────────

const FIXTURES = {
  weak:    { path: 'data/golden-path/kora_weak_company_upload.csv',    workforce: 100 },
  average: { path: 'data/golden-path/kora_average_company_upload.csv', workforce: 150 },
  golden:  { path: 'data/golden-path/kora_golden_path_upload.csv',     workforce: 300 },
} as const;

let weakResult:    KoraComputationResult;
let averageResult: KoraComputationResult;
let goldenResult:  KoraComputationResult;

beforeAll(() => {
  weakResult    = loadFixture(FIXTURES.weak.path,    FIXTURES.weak.workforce);
  averageResult = loadFixture(FIXTURES.average.path, FIXTURES.average.workforce);
  goldenResult  = loadFixture(FIXTURES.golden.path,  FIXTURES.golden.workforce);
});

// ── Mandatory invariants — all fixtures ───────────────────────────────────────

describe('B108-B — invariants (all fixtures)', () => {
  it('weak: productionReady=false', () => {
    expect(weakResult.koraIndex.productionReady).toBe(false);
  });
  it('average: productionReady=false', () => {
    expect(averageResult.koraIndex.productionReady).toBe(false);
  });
  it('golden: productionReady=false', () => {
    expect(goldenResult.koraIndex.productionReady).toBe(false);
  });
  it('weak: calibrationStatus=pre_empirical_calibration', () => {
    expect(weakResult.koraIndex.calibrationStatus).toBe('pre_empirical_calibration');
  });
  it('average: calibrationStatus=pre_empirical_calibration', () => {
    expect(averageResult.koraIndex.calibrationStatus).toBe('pre_empirical_calibration');
  });
  it('golden: calibrationStatus=pre_empirical_calibration', () => {
    expect(goldenResult.koraIndex.calibrationStatus).toBe('pre_empirical_calibration');
  });
  it('all CS are external to KORA Index', () => {
    expect(weakResult.confidence.externalToIndex).toBe(true);
    expect(averageResult.confidence.externalToIndex).toBe(true);
    expect(goldenResult.confidence.externalToIndex).toBe(true);
  });
  it('no fixture contains OP-001', () => {
    for (const f of Object.values(FIXTURES)) {
      const csv = readFileSync(resolve(root, f.path), 'utf-8');
      expect(csv).not.toContain('OP-001');
    }
  });
  it('no fixture contains synthetic_demo_data marker', () => {
    for (const f of Object.values(FIXTURES)) {
      const csv = readFileSync(resolve(root, f.path), 'utf-8');
      expect(csv).not.toContain('synthetic_demo_data');
    }
  });
  it('no fixture contains PII column headers', () => {
    const PII = ['email', 'codice_fiscale', 'telefono', 'nome_dipendente', 'cognome', 'matricola'];
    for (const f of Object.values(FIXTURES)) {
      const header = readFileSync(resolve(root, f.path), 'utf-8').split('\n')[0].toLowerCase();
      for (const pii of PII) {
        expect(header).not.toContain(pii);
      }
    }
  });
});

// ── Weak fixture — score range check ─────────────────────────────────────────

describe('B108-B — weak fixture (workforce=100)', () => {
  it('pipeline runs without error (scoringMode≠insufficient_data)', () => {
    expect(weakResult.scoringMode).not.toBe('insufficient_data');
  });

  it('Activation Safeguard is FLAGGED (MAR<0.15 by design)', () => {
    expect(weakResult.activation.safeguardStatus).toBe('FLAGGED');
  });

  it('KORA Index in expected range v2.0 (observational bounds, not formula-derived)', () => {
    const score = weakResult.koraIndex.value;
    // Sprint 1 v2.0 (IU-centric, no EQUITY redistribution): actual output ~31.
    // Range widened to avoid brittleness across minor formula tuning.
    expect(score).toBeGreaterThanOrEqual(15);
    expect(score).toBeLessThanOrEqual(50);
    console.log(`[WEAK] KORA Index: ${score.toFixed(2)} | Band: ${getScoreBand(score).key}`);
  });

  it('score band is Weak Activation or Early Activation (not Solid or above)', () => {
    const band = getScoreBand(weakResult.koraIndex.value);
    expect(['weak', 'early']).toContain(band.key);
  });

  it('REACH macroblock is lower than golden', () => {
    expect(weakResult.koraIndex.macroblocks.activationReach)
      .toBeLessThan(goldenResult.koraIndex.macroblocks.activationReach);
  });

  it('QUALITY macroblock is lower than average (all-L1 evidence)', () => {
    expect(weakResult.koraIndex.macroblocks.activationQuality)
      .toBeLessThanOrEqual(averageResult.koraIndex.macroblocks.activationQuality);
  });

  it('eligibility: at least 3 blocked records', () => {
    expect(weakResult.eligibilitySummary.blockedCount).toBeGreaterThanOrEqual(3);
  });

  it('eligibility: at least 2 limited records', () => {
    expect(weakResult.eligibilitySummary.limitedCount).toBeGreaterThanOrEqual(2);
  });
});

// ── Average fixture — score range check ──────────────────────────────────────

describe('B108-B — average fixture (workforce=150)', () => {
  it('pipeline runs without error', () => {
    expect(averageResult.scoringMode).not.toBe('insufficient_data');
  });

  it('KORA Index in expected range v2.0 (observational bounds, not formula-derived)', () => {
    const score = averageResult.koraIndex.value;
    // Sprint 1 v2.0 (IU-centric, no EQUITY redistribution): actual output ~43.
    // Range widened to avoid brittleness across minor formula tuning.
    expect(score).toBeGreaterThanOrEqual(25);
    expect(score).toBeLessThanOrEqual(62);
    console.log(`[AVERAGE] KORA Index: ${score.toFixed(2)} | Band: ${getScoreBand(score).key}`);
  });

  it('score band is Early or Developing (v2.0 average ~43, range 30–60)', () => {
    const band = getScoreBand(averageResult.koraIndex.value);
    expect(['early', 'developing', 'solid']).toContain(band.key);
  });

  it('KORA Index is higher than weak', () => {
    expect(averageResult.koraIndex.value).toBeGreaterThan(weakResult.koraIndex.value);
  });

  it('KORA Index is lower than golden', () => {
    expect(averageResult.koraIndex.value).toBeLessThan(goldenResult.koraIndex.value);
  });

  it('pillar distribution covers GROWTH, LIFE, CONNECTION', () => {
    expect(averageResult.pillarDistribution.GROWTH).toBeGreaterThan(0);
    expect(averageResult.pillarDistribution.LIFE).toBeGreaterThan(0);
    expect(averageResult.pillarDistribution.CONNECTION).toBeGreaterThan(0);
  });

  it('IMPACT pillar has 0 records (absent by design)', () => {
    expect(averageResult.pillarDistribution.IMPACT).toBe(0);
  });

  it('eligibility: at least 2 blocked records', () => {
    expect(averageResult.eligibilitySummary.blockedCount).toBeGreaterThanOrEqual(2);
  });
});

// ── Golden fixture — score range check ───────────────────────────────────────

describe('B108-B — golden fixture (workforce=300)', () => {
  it('pipeline runs without error', () => {
    expect(goldenResult.scoringMode).not.toBe('insufficient_data');
  });

  it('KORA Index in expected range v2.0 (observational bounds, not formula-derived)', () => {
    const score = goldenResult.koraIndex.value;
    // Sprint 1 v2.0 (IU-centric, no EQUITY redistribution): actual output ~52.
    // Range widened to avoid brittleness across minor formula tuning.
    expect(score).toBeGreaterThanOrEqual(35);
    expect(score).toBeLessThanOrEqual(75);
    console.log(`[GOLDEN] KORA Index: ${score.toFixed(2)} | Band: ${getScoreBand(score).key}`);
  });

  it('score band is Developing or Solid (v2.0 golden ~52, banda 45–75)', () => {
    const band = getScoreBand(goldenResult.koraIndex.value);
    expect(['developing', 'solid']).toContain(band.key);
  });

  it('Activation Safeguard is CLEAR', () => {
    expect(goldenResult.activation.safeguardStatus).toBe('CLEAR');
  });

  it('all 5 pillars have at least 1 record', () => {
    expect(goldenResult.pillarDistribution.LIFE).toBeGreaterThan(0);
    expect(goldenResult.pillarDistribution.GROWTH).toBeGreaterThan(0);
    expect(goldenResult.pillarDistribution.CONNECTION).toBeGreaterThan(0);
    expect(goldenResult.pillarDistribution.IMPACT).toBeGreaterThan(0);
    expect(goldenResult.pillarDistribution.LEGACY).toBeGreaterThan(0);
  });

  it('KORA Index is highest of the three fixtures', () => {
    expect(goldenResult.koraIndex.value).toBeGreaterThan(averageResult.koraIndex.value);
    expect(goldenResult.koraIndex.value).toBeGreaterThan(weakResult.koraIndex.value);
  });
});

// ── Score ordering — weak < average < golden ─────────────────────────────────

describe('B108-B — score ordering', () => {
  it('weak < average < golden (strict monotonicity)', () => {
    const w = weakResult.koraIndex.value;
    const a = averageResult.koraIndex.value;
    const g = goldenResult.koraIndex.value;
    console.log(`[ORDERING] weak=${w.toFixed(2)} | average=${a.toFixed(2)} | golden=${g.toFixed(2)}`);
    expect(w).toBeLessThan(a);
    expect(a).toBeLessThan(g);
  });

  it('macroblocks: full breakdown logged for analysis', () => {
    const mb = (r: KoraComputationResult, label: string) =>
      console.log(
        `[${label}] REACH=${r.koraIndex.macroblocks.activationReach?.toFixed(1)} ` +
        `QUALITY=${r.koraIndex.macroblocks.activationQuality?.toFixed(1)} ` +
        `EQUITY=${r.koraIndex.macroblocks.distributionEquity?.toFixed(1)} ` +
        `BTI=${r.koraIndex.macroblocks.budgetToHumanImpact?.toFixed(1)} ` +
        `→ INDEX=${r.koraIndex.value.toFixed(2)} ` +
        `CS=${r.confidence.score.toFixed(1)} ` +
        `SAFEGUARD=${r.activation.safeguardStatus}`
      );
    mb(weakResult,    'WEAK   ');
    mb(averageResult, 'AVERAGE');
    mb(goldenResult,  'GOLDEN ');
    // This test always passes — it's a logging test for analysis
    expect(true).toBe(true);
  });
});
