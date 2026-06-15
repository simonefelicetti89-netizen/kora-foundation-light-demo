// tests/unit/b161-worker-iu-computation.test.ts
// B161 — test del WorkerIUComputationService (puro, no DB).
// Tutti i test girano su fixture in-memory: nessuna dipendenza da Supabase o DB.

import { describe, it, expect } from 'vitest';
import {
  computeBaseWorkerPIBRows,
  validateRedistribution,
  applyPillarRedistribution,
} from '@/services/worker-iu-computation/WorkerIUComputationService';
import type { WorkerIUComputationParams } from '@/lib/types/domains/worker-pib-live';

// ── Fixture ───────────────────────────────────────────────────────────────────

const BASE_UEF: WorkerIUComputationParams['uefRecord'] = {
  id:                        'uef-test-001',
  eligibility:               'eligible',
  action_family:             'health_and_wellbeing',
  event_nature:              'consumed_service',
  primary_pillar:            'LIFE',
  missing_fields:            [],
  approved_for_impact_units: true,
  payload:                   {},
};

const BASE_PARAMS: WorkerIUComputationParams = {
  workerIdentityId: 'worker-identity-001',
  reportingPeriod:  '2025-Q3',
  sourceKind:       'company_sourced',
  uefRecord:        BASE_UEF,
  participationId:  null,  // d'ufficio: nessuna participation richiesta
};

// ── Test Livello Base ─────────────────────────────────────────────────────────

describe('computeBaseWorkerPIBRows', () => {
  it('company_sourced d\'ufficio → riga LIFE, iu_value > 0, verified, exportable', () => {
    const rows = computeBaseWorkerPIBRows(BASE_PARAMS);

    expect(rows).toHaveLength(1);
    const row = rows[0]!;
    expect(row.pillar).toBe('LIFE');
    expect(row.iu_value).toBeGreaterThan(0);
    expect(row.verification_status).toBe('verified');
    expect(row.is_exportable).toBe(true);
    expect(row.source_kind).toBe('company_sourced');
    expect(row.source_uef_record_id).toBe('uef-test-001');
    expect(row.worker_identity_id).toBe('worker-identity-001');
    expect(row.reporting_period).toBe('2025-Q3');
  });

  it('company_sourced NON dipende da participation — participationId null è ok', () => {
    // Modifica 1: l'attribuzione aziendale diretta non richiede attended
    const rows = computeBaseWorkerPIBRows({ ...BASE_PARAMS, participationId: null });
    expect(rows).toHaveLength(1);
    expect(rows[0]!.source_participation_id).toBeNull();
  });

  it('company_sourced con participationId valorizzato — viene tracciato correttamente', () => {
    const rows = computeBaseWorkerPIBRows({
      ...BASE_PARAMS,
      participationId: 'part-abc',
    });
    expect(rows).toHaveLength(1);
    expect(rows[0]!.source_participation_id).toBe('part-abc');
  });

  it('colonne generative Tempo 2 restano sempre NULL', () => {
    const rows = computeBaseWorkerPIBRows(BASE_PARAMS);
    const row = rows[0]!;
    expect(row.generative_index).toBeNull();
    expect(row.generative_circle1).toBeNull();
    expect(row.generative_circle2).toBeNull();
    expect(row.generative_circle3).toBeNull();
  });

  it('worker_declared → self_declared, is_exportable = false (Nodo A)', () => {
    const rows = computeBaseWorkerPIBRows({
      ...BASE_PARAMS,
      sourceKind: 'worker_declared',
    });
    expect(rows).toHaveLength(1);
    const row = rows[0]!;
    expect(row.verification_status).toBe('self_declared');
    expect(row.is_exportable).toBe(false);
  });

  it('uefRecord con primary_pillar null → zero righe (IU non distribuibile)', () => {
    const rows = computeBaseWorkerPIBRows({
      ...BASE_PARAMS,
      uefRecord: { ...BASE_UEF, primary_pillar: null },
    });
    expect(rows).toHaveLength(0);
  });

  it('uefRecord con approved_for_impact_units=false → zero righe (AGF=0)', () => {
    const rows = computeBaseWorkerPIBRows({
      ...BASE_PARAMS,
      uefRecord: { ...BASE_UEF, approved_for_impact_units: false },
    });
    expect(rows).toHaveLength(0);
  });

  it('uefRecord con eligibility=blocked → zero righe (AGF=0)', () => {
    const rows = computeBaseWorkerPIBRows({
      ...BASE_PARAMS,
      uefRecord: { ...BASE_UEF, eligibility: 'blocked' },
    });
    expect(rows).toHaveLength(0);
  });
});

// ── Test validateRedistribution ───────────────────────────────────────────────

describe('validateRedistribution', () => {
  it('distribuzione valida mono-pillar (100% GROWTH) → valid=true', () => {
    const r = validateRedistribution({ GROWTH: 1.0 });
    expect(r.valid).toBe(true);
    expect(r.error).toBeUndefined();
  });

  it('distribuzione valida multi-pillar (60/40) → valid=true', () => {
    const r = validateRedistribution({ LIFE: 0.6, GROWTH: 0.4 });
    expect(r.valid).toBe(true);
  });

  it('somma diversa da 1.0 → invalid', () => {
    const r = validateRedistribution({ LIFE: 0.5, GROWTH: 0.3 }); // 0.8 ≠ 1.0
    expect(r.valid).toBe(false);
    expect(r.error).toContain('Somma');
  });

  it('pillar non valido → invalid', () => {
    const r = validateRedistribution({ LIFE: 0.5, WELLNESS: 0.5 } as Record<string, number>);
    expect(r.valid).toBe(false);
    expect(r.error).toContain('WELLNESS');
  });

  it('frazione negativa → invalid', () => {
    const r = validateRedistribution({ LIFE: 1.2, GROWTH: -0.2 });
    expect(r.valid).toBe(false);
  });

  it('somma entro epsilon (0.001) → valid', () => {
    // 0.333 + 0.333 + 0.334 = 1.000
    const r = validateRedistribution({ LIFE: 0.333, GROWTH: 0.333, CONNECTION: 0.334 });
    expect(r.valid).toBe(true);
  });
});

// ── Test applyPillarRedistribution ───────────────────────────────────────────

describe('applyPillarRedistribution', () => {
  it('ridistribuisce 60/40 — somma IU invariata rispetto alle righe base', () => {
    const baseRows = computeBaseWorkerPIBRows(BASE_PARAMS);
    const baseIU = baseRows.reduce((s, r) => s + r.iu_value, 0);

    const { rows, error } = applyPillarRedistribution(baseRows, { LIFE: 0.6, GROWTH: 0.4 });

    expect(error).toBeUndefined();
    expect(rows).toHaveLength(2);

    const total = rows.reduce((s, r) => s + r.iu_value, 0);
    // somma invariata entro arrotondamento float
    expect(Math.abs(total - baseIU)).toBeLessThan(0.001);
  });

  it('ridistribuzione con somma ≠ 1.0 → error, righe base intatte', () => {
    const baseRows = computeBaseWorkerPIBRows(BASE_PARAMS);
    const { rows, error } = applyPillarRedistribution(baseRows, { LIFE: 0.5, GROWTH: 0.3 });

    expect(error).toBeDefined();
    // fallback: righe base restituite intatte
    expect(rows).toStrictEqual(baseRows);
  });

  it('ridistribuzione con pillar invalido → error, righe base intatte', () => {
    const baseRows = computeBaseWorkerPIBRows(BASE_PARAMS);
    const { rows, error } = applyPillarRedistribution(
      baseRows,
      { LIFE: 0.5, WELLBEING: 0.5 } as Record<string, number>,
    );
    expect(error).toBeDefined();
    expect(rows).toStrictEqual(baseRows);
  });

  it('righe base vuote → error specifico', () => {
    const { rows, error } = applyPillarRedistribution([], { LIFE: 1.0 });
    expect(error).toBeDefined();
    expect(rows).toHaveLength(0);
  });

  it('source_uef_record_id mantenuto nelle righe ridistribuite', () => {
    const baseRows = computeBaseWorkerPIBRows(BASE_PARAMS);
    const { rows } = applyPillarRedistribution(baseRows, { LIFE: 0.7, IMPACT: 0.3 });
    rows.forEach((r) => {
      expect(r.source_uef_record_id).toBe('uef-test-001');
      expect(r.worker_identity_id).toBe('worker-identity-001');
    });
  });

  it('iu_value della ridistribuzione corrisponde alla frazione attesa', () => {
    const baseRows = computeBaseWorkerPIBRows(BASE_PARAMS);
    const baseIU = baseRows.reduce((s, r) => s + r.iu_value, 0);
    const { rows } = applyPillarRedistribution(baseRows, { LIFE: 0.6, GROWTH: 0.4 });

    const lifeRow  = rows.find((r) => r.pillar === 'LIFE')!;
    const growthRow = rows.find((r) => r.pillar === 'GROWTH')!;
    expect(lifeRow.iu_value).toBeCloseTo(baseIU * 0.6, 3);
    expect(growthRow.iu_value).toBeCloseTo(baseIU * 0.4, 3);
  });
});
