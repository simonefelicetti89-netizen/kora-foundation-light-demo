/**
 * Sprint 2 — Robustezza, incertezza, normalizzazione PIB.
 * Tutti i valori attesi DERIVATI dalla formula a mano.
 * Niente bande osservazionali, niente test-fitting.
 */

import { describe, it, expect } from 'vitest';
import {
  computeEffort,
  computeRecency,
  computeSaturation,
} from '../../services/iu-computation/IUComputationService';
import { computeMCInterval } from '../../lib/kora-engine/monte-carlo-engine';
import { computePIBMultiplier, applyPIBMultiplier } from '../../services/worker-iu-computation/WorkerIUComputationService';
import type { WorkerPIBRowInsert } from '../../lib/types/domains/worker-pilot-schema';

// ── B-SM1 — Funzioni continue e monotone ─────────────────────────────────────

describe('B-SM1 — effort(d)', () => {
  // effort(d_min) = 0.40 + 1.10 × d/(d+90), d in minutes (hours×60)
  // effort(90)  = 0.40 + 1.10×(90/180) = 0.40 + 0.55 = 0.95
  // effort(180) = 0.40 + 1.10×(180/270) = 0.40 + 0.7333... ≈ 1.1333
  // effort(0)   fallback → 1.0 (neutro, non penalizzante)
  // effort(undefined) → 1.0 (neutro)

  it('effort(1.5h) = 0.95 — formula: 0.40 + 1.10×(90/180)', () => {
    // 1.5h × 60 = 90 min
    expect(computeEffort(1.5)).toBeCloseTo(0.95, 3);
  });

  it('effort(3h) ≈ 1.133 — formula: 0.40 + 1.10×(180/270)', () => {
    // 3h × 60 = 180 min; 0.40 + 1.10×(2/3) = 0.40 + 0.7333 = 1.1333
    expect(computeEffort(3)).toBeCloseTo(1.1333, 3);
  });

  it('effort(0h) = 1.0 (neutro, non penalizzante)', () => {
    expect(computeEffort(0)).toBe(1.0);
  });

  it('effort(undefined) = 1.0 (dato mancante = neutro)', () => {
    expect(computeEffort(undefined)).toBe(1.0);
  });

  it('effort è strettamente crescente in d (monotonia)', () => {
    const vals = [0.5, 1, 1.5, 3, 8, 24].map(h => computeEffort(h));
    // skip idx 0 (0.5h) since effort(0)=1 is neutral, values for d>0 must increase
    // 0.5h = 30min → 0.40+1.10×(30/120)=0.40+0.275=0.675 < 1.5h=0.95 < 3h=1.133 ...
    for (let i = 1; i < vals.length; i++) {
      expect(vals[i]).toBeGreaterThan(vals[i - 1]!);
    }
  });

  it('effort satura sotto 1.50 (mai supera il limite)', () => {
    expect(computeEffort(10000)).toBeLessThan(1.50);
    expect(computeEffort(10000)).toBeGreaterThan(1.49);
  });
});

describe('B-SM1 — recency(Δt)', () => {
  // recency(Δt) = max(0.60, exp(−λ×Δt))
  // λ_single=0.023, λ_recurring=0.008
  // Δt=0 → exp(0)=1.0
  // Δt=20 single → exp(−0.023×20)=exp(−0.46)≈0.6313
  // Δt=22 single → exp(−0.023×22)≈exp(−0.506)≈0.6030 → just above floor
  // Δt=30 single → exp(−0.69)≈0.5016 → floor=0.60
  // Δt=100 recurring → exp(−0.8)≈0.4493 → floor=0.60
  // ref date: 2026-06-30 (from config)

  it('recency with event_date=ref_date → 1.0 (Δt=0, nessun decadimento)', () => {
    expect(computeRecency('2026-06-30', false)).toBeCloseTo(1.0, 4);
  });

  it('recency single Δt=20 days ≈ 0.631', () => {
    // 2026-06-30 - 20 days = 2026-06-10
    const r = computeRecency('2026-06-10', false);
    expect(r).toBeCloseTo(Math.exp(-0.023 * 20), 3);
    expect(r).toBeGreaterThan(0.60); // above floor
  });

  it('recency single Δt=30 days = floor 0.60', () => {
    // exp(−0.023×30)≈0.5016 < 0.60 → floor
    const r = computeRecency('2026-05-31', false);
    expect(r).toBeCloseTo(0.60, 3);
  });

  it('recency recurring Δt=30 days ≈ 0.787 (λ smaller → slower decay)', () => {
    // exp(−0.008×30)=exp(−0.24)≈0.7866
    const r = computeRecency('2026-05-31', true);
    expect(r).toBeCloseTo(Math.exp(-0.008 * 30), 3);
    expect(r).toBeGreaterThan(0.60);
  });

  it('recency(undefined) = 1.0 (dato mancante = neutro)', () => {
    expect(computeRecency(undefined)).toBe(1.0);
  });

  it('recency is non-increasing in Δt (monotonia decrescente)', () => {
    const r0  = computeRecency('2026-06-30', false); // Δt=0
    const r10 = computeRecency('2026-06-20', false); // Δt=10
    const r20 = computeRecency('2026-06-10', false); // Δt=20
    const r30 = computeRecency('2026-05-31', false); // Δt=30 — hits floor
    const r60 = computeRecency('2026-05-01', false); // Δt=60 — floor
    expect(r0).toBeGreaterThanOrEqual(r10);
    expect(r10).toBeGreaterThanOrEqual(r20);
    expect(r20).toBeGreaterThanOrEqual(r30);
    expect(r30).toBeCloseTo(r60, 4); // both at floor
  });

  it('floor is enforced: recency >= 0.60 always', () => {
    // Very old event (Δt >> 0)
    const r = computeRecency('2020-01-01', false);
    expect(r).toBeCloseTo(0.60, 3);
  });
});

describe('B-SM1 — saturation(n)', () => {
  // saturation(n) = max(floor, 1/(1 + decay×n)), decay=0.20 from config
  // n=0 → 1.0 (prima volta, nessuna saturazione)
  // n=1 → 1/(1+0.20)=0.8333
  // n=2 → 1/(1+0.40)=0.7143
  // n=4 → 1/(1+0.80)=0.5556 → floor=0.60 for default, 0.80 for therapeutic
  // therapeutic floor: n=2 → max(0.80, 0.7143)=0.80

  it('saturation(n=0) = 1.0 (prima occorrenza, nessuna saturazione)', () => {
    expect(computeSaturation(0, false)).toBe(1.0);
  });

  it('saturation(n=1) ≈ 0.833 — formula: 1/(1+0.20×1)', () => {
    expect(computeSaturation(1, false)).toBeCloseTo(0.8333, 3);
  });

  it('saturation(n=2) ≈ 0.714 — formula: 1/(1+0.20×2)', () => {
    expect(computeSaturation(2, false)).toBeCloseTo(0.7143, 3);
  });

  it('saturation(n=4) = floor 0.60 (1/(1+0.80)=0.556 < 0.60)', () => {
    expect(computeSaturation(4, false)).toBeCloseTo(0.60, 3);
  });

  it('saturation therapeutic n=2 → floor 0.80 (1/(1+0.40)=0.714 < 0.80)', () => {
    expect(computeSaturation(2, true)).toBeCloseTo(0.80, 3);
  });

  it('saturation therapeutic n=1 → 0.833 (above therapeutic floor 0.80)', () => {
    // 0.833 > 0.80 → no floor applied
    expect(computeSaturation(1, true)).toBeCloseTo(0.8333, 3);
  });

  it('saturation(undefined) = 1.0 (dato mancante = neutro)', () => {
    expect(computeSaturation(undefined)).toBe(1.0);
  });

  it('saturation is non-increasing in n (monotonia decrescente)', () => {
    const s = [0, 1, 2, 3, 4, 5].map(n => computeSaturation(n, false));
    for (let i = 1; i < s.length; i++) {
      expect(s[i]).toBeLessThanOrEqual(s[i - 1]!);
    }
  });

  it('saturation floor è enforced: >= 0.60 sempre (non-therapeutic)', () => {
    expect(computeSaturation(100, false)).toBeGreaterThanOrEqual(0.60);
  });
});

describe('B-SM1 — NM fallback quando tutti i dati mancano', () => {
  it('tutti fallback → NM = 1.0 (neutro, non penalizzante)', () => {
    const effort     = computeEffort(undefined);
    const recency    = computeRecency(undefined);
    const saturation = computeSaturation(undefined);
    expect(effort * recency * saturation).toBe(1.0);
  });
});

// ── B-RB1 — Nessun rebalance residuo ─────────────────────────────────────────

describe('B-RB1 — Nessun rebalance nei motori (verifica strutturale)', () => {
  it('kora-index-engine non contiene la stringa "rebalance"', async () => {
    const { readFileSync } = await import('fs');
    const src = readFileSync('lib/kora-engine/kora-index-engine.ts', 'utf-8');
    expect(src).not.toContain('rebalance(');
    expect(src).not.toContain('redistribute(');
  });

  it('component-engine non contiene la stringa "rebalance"', async () => {
    const { readFileSync } = await import('fs');
    const src = readFileSync('lib/kora-engine/component-engine.ts', 'utf-8');
    expect(src).not.toContain('rebalance(');
  });

  it('confidence-engine non contiene la stringa "rebalance"', async () => {
    const { readFileSync } = await import('fs');
    const src = readFileSync('lib/kora-engine/confidence-engine.ts', 'utf-8');
    expect(src).not.toContain('rebalance(');
  });

  it('monte-carlo-engine usa mulberry32, non Math.random (determinismo)', async () => {
    const { readFileSync } = await import('fs');
    const src = readFileSync('lib/kora-engine/monte-carlo-engine.ts', 'utf-8');
    // PRNG seeded via mulberry32 must be present
    expect(src).toContain('mulberry32(');
    // No bare Math.random() call in non-comment lines
    const codeLines = src.split('\n').filter(l => !l.trimStart().startsWith('//'));
    expect(codeLines.join('\n')).not.toContain('Math.random(');
  });
});

// ── B-MC1 — Monte Carlo seedato + shrinkage bayesiano ────────────────────────

describe('B-MC1 — determinismo (seed fisso → stesso output)', () => {
  const mb = { activationReach: 54, activationQuality: 25, distributionEquity: 44, budgetToHumanImpact: 57 };
  const weights = { REACH: 0.25, QUALITY: 0.30, EQUITY: 0.25, BTI: 0.20 };

  it('stesso input → stesso output (riproducibilità)', () => {
    const r1 = computeMCInterval({ macroblocks: mb, weights, computed_records: 10 });
    const r2 = computeMCInterval({ macroblocks: mb, weights, computed_records: 10 });
    expect(r1.p10).toBe(r2.p10);
    expect(r1.p90).toBe(r2.p90);
    expect(r1.median).toBe(r2.median);
    expect(r1.shrunkValue).toBe(r2.shrunkValue);
  });

  it('p10 < median < p90 (ordinamento)', () => {
    const r = computeMCInterval({ macroblocks: mb, weights, computed_records: 10 });
    expect(r.p10).toBeLessThanOrEqual(r.median);
    expect(r.median).toBeLessThanOrEqual(r.p90);
  });

  it('p10 >= 0 e p90 <= 100 (range valido)', () => {
    const r = computeMCInterval({ macroblocks: mb, weights, computed_records: 10 });
    expect(r.p10).toBeGreaterThanOrEqual(0);
    expect(r.p90).toBeLessThanOrEqual(100);
  });
});

describe('B-MC1 — shrinkage bayesiano', () => {
  const mb   = { activationReach: 80, activationQuality: 60, distributionEquity: 80, budgetToHumanImpact: 80 };
  const weights = { REACH: 0.25, QUALITY: 0.30, EQUITY: 0.25, BTI: 0.20 };
  // default_prior = 40.0, k = 10

  it('dati sottili (n=1): shrunkValue fortemente attratto verso prior (40)', () => {
    // w = 1/(1+10) = 0.0909 → shrunkValue ≈ 0.09×median + 0.91×40.0
    const r = computeMCInterval({ macroblocks: mb, weights, computed_records: 1 });
    // median ≈ true index of ~76, shrunkValue should be well below median and near 40+
    expect(r.shrunkValue).toBeLessThan(r.median);
    expect(r.shrunkValue).toBeGreaterThan(35); // pulled toward prior 40
  });

  it('dati ricchi (n=990): shrunkValue ≈ median (quasi nessuna contrazione)', () => {
    // w = 990/(990+10) = 0.99 → shrunkValue ≈ 0.99×median + 0.01×40
    const r = computeMCInterval({ macroblocks: mb, weights, computed_records: 990 });
    expect(Math.abs(r.shrunkValue - r.median)).toBeLessThan(1.5);
  });

  it('shrinkageWeight = n/(n+k): n=10, k=10 → w=0.50', () => {
    const r = computeMCInterval({ macroblocks: mb, weights, computed_records: 10 });
    expect(r.shrinkageWeight).toBeCloseTo(0.50, 2);
  });

  it('shrinkageWeight aumenta all\'aumentare dei dati (monotonia)', () => {
    const w1 = computeMCInterval({ macroblocks: mb, weights, computed_records: 5 }).shrinkageWeight;
    const w2 = computeMCInterval({ macroblocks: mb, weights, computed_records: 20 }).shrinkageWeight;
    const w3 = computeMCInterval({ macroblocks: mb, weights, computed_records: 100 }).shrinkageWeight;
    expect(w1).toBeLessThan(w2);
    expect(w2).toBeLessThan(w3);
  });

  it('prior esposto come 40.0 (cross-sector default da config)', () => {
    const r = computeMCInterval({ macroblocks: mb, weights, computed_records: 10 });
    expect(r.prior).toBe(40.0);
  });

  it('n_iter esposto correttamente (1000 da config.monte_carlo)', () => {
    const r = computeMCInterval({ macroblocks: mb, weights, computed_records: 10 });
    expect(r.n_iter).toBe(1000);
  });
});

// ── B-PIB1 — Moltiplicatore PIB M(w) ─────────────────────────────────────────

function makePIBRow(pillar: string, iu_value: number): WorkerPIBRowInsert {
  return {
    worker_identity_id:      'w-1',
    reporting_period:        '2026-Q1',
    pillar:                  pillar as WorkerPIBRowInsert['pillar'],
    iu_value,
    verification_status:     'verified',
    is_exportable:           true,
    source_kind:             'company_sourced',
    source_uef_record_id:    'uef-1',
    source_participation_id: null,
    generative_index:        null,
    generative_circle1:      null,
    generative_circle2:      null,
    generative_circle3:      null,
  };
}

// Targets default da config: LIFE=0.80, GROWTH=1.00, CONNECTION=0.60, IMPACT=0.40, LEGACY=0.40
// θ=0.30: pillar qualifies se worker_iu_in_p / T_p >= 0.30
// step_per_pillar=0.05, max=1.25

describe('B-PIB1 — computePIBMultiplier', () => {
  it('0 pillar qualificanti → M=1.0 (nessun bonus)', () => {
    // worker con LIFE=0.10 (<0.30×0.80=0.24 threshold): PRS=0.10/0.80=0.125 < 0.30
    const rows = [makePIBRow('LIFE', 0.10)];
    const { multiplier, n_qualifying } = computePIBMultiplier(rows);
    expect(n_qualifying).toBe(0);
    expect(multiplier).toBeCloseTo(1.0, 4);
  });

  it('1 pillar qualificante → M=1.05 (DF=1.05)', () => {
    // LIFE=0.30: PRS=0.30/0.80=0.375 >= 0.30 → qualifica
    const rows = [makePIBRow('LIFE', 0.30)];
    const { multiplier, n_qualifying } = computePIBMultiplier(rows);
    expect(n_qualifying).toBe(1);
    expect(multiplier).toBeCloseTo(1.05, 4);
  });

  it('3 pillar qualificanti → M=1.15', () => {
    // LIFE=0.30 (PRS=0.375≥0.30), GROWTH=0.40 (PRS=0.40≥0.30), IMPACT=0.15 (PRS=0.375≥0.30)
    const rows = [
      makePIBRow('LIFE', 0.30),
      makePIBRow('GROWTH', 0.40),
      makePIBRow('IMPACT', 0.15),
    ];
    const { multiplier, n_qualifying } = computePIBMultiplier(rows);
    expect(n_qualifying).toBe(3);
    expect(multiplier).toBeCloseTo(1.15, 4);
  });

  it('5 pillar qualificanti → M=1.25 (cap)', () => {
    // Tutti sopra soglia: DF=1+5×0.05=1.25 → min(1.25, 1.25)=1.25
    const rows = [
      makePIBRow('LIFE',       0.80),
      makePIBRow('GROWTH',     1.00),
      makePIBRow('CONNECTION', 0.60),
      makePIBRow('IMPACT',     0.40),
      makePIBRow('LEGACY',     0.40),
    ];
    const { multiplier, n_qualifying } = computePIBMultiplier(rows);
    expect(n_qualifying).toBe(5);
    expect(multiplier).toBeCloseTo(1.25, 4);
  });

  it('micro-attivazione IMPACT sotto θ non gonfia DF', () => {
    // IMPACT=0.05: PRS=0.05/0.40=0.125 < 0.30 → NON qualifica
    const rows = [makePIBRow('IMPACT', 0.05), makePIBRow('LIFE', 0.30)];
    const { n_qualifying } = computePIBMultiplier(rows);
    expect(n_qualifying).toBe(1); // solo LIFE qualifica
  });

  it('M(w) non supera mai 1.25 (cap)', () => {
    const rows = Array.from({ length: 20 }, (_, i) => makePIBRow('LIFE', i + 1));
    const { multiplier } = computePIBMultiplier(rows);
    expect(multiplier).toBeLessThanOrEqual(1.25);
  });
});

describe('B-PIB1 — applyPIBMultiplier', () => {
  it('iu_value scaled correttamente per ogni riga', () => {
    // 1 pillar qualificante → M=1.05
    const rows = [makePIBRow('LIFE', 1.0)];
    const { rows: scaled, multiplier } = applyPIBMultiplier(rows);
    expect(multiplier).toBeCloseTo(1.05, 4);
    expect(scaled[0]!.iu_value).toBeCloseTo(1.05, 4);
  });

  it('rows vuote → M=1.0, no crash', () => {
    const { rows: scaled, multiplier } = applyPIBMultiplier([]);
    expect(multiplier).toBe(1.0);
    expect(scaled).toHaveLength(0);
  });

  it('M=1.0 (no qualifying pillars) → righe invariate', () => {
    const rows = [makePIBRow('LIFE', 0.01)]; // sotto soglia
    const { rows: scaled, multiplier } = applyPIBMultiplier(rows);
    expect(multiplier).toBe(1.0);
    expect(scaled[0]!.iu_value).toBe(rows[0]!.iu_value);
  });
});
