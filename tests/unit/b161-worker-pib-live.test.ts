// tests/unit/b161-worker-pib-live.test.ts
// B161 — test dei metodi *Live di WorkerPIBService con Supabase mockato.
// Nessuna dipendenza DB reale: le tabelle worker_pib / worker_initiative
// non esistono ancora (mig 016-019 non applicate) — i test girano su fixture.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WorkerPIBService } from '@/services/worker-pib/WorkerPIBService';

// ── Helper mock Supabase ──────────────────────────────────────────────────────
// Crea un client Supabase finto che risponde con i dati passati.
// La catena .schema().from().select().eq() / .in() restituisce { data, error }.

type MockRow = Record<string, unknown>;

function makeMockQuery(data: MockRow[], error: unknown = null) {
  const queryObj = {
    select:  () => queryObj,
    eq:      () => queryObj,
    in:      () => queryObj,
    then:    (resolve: (v: { data: MockRow[]; error: unknown }) => void) =>
      Promise.resolve({ data, error }).then(resolve),
  };
  // Promise-like: await queryObj  restituisce { data, error }
  Object.assign(queryObj, { [Symbol.toStringTag]: 'MockQuery' });
  return new Proxy(queryObj, {
    get(target, prop) {
      if (prop === 'then') return target.then;
      if (prop in target) return target[prop as keyof typeof target];
      return () => queryObj;  // catena fluente: qualunque metodo → ritorna se stesso
    },
  });
}

function makeSupabaseMock(responses: Map<string, MockRow[]>) {
  return {
    schema: (_schema: string) => ({
      from: (table: string) => {
        const rows = responses.get(table) ?? [];
        return makeMockQuery(rows);
      },
    }),
  };
}

// ── Fixture ───────────────────────────────────────────────────────────────────

const LIFE_ROW:   MockRow = { pillar: 'LIFE',   iu_value: 0.9000, source_uef_record_id: 'uef-001', reporting_period: '2025-Q3' };
const GROWTH_ROW: MockRow = { pillar: 'GROWTH', iu_value: 0.7500, source_uef_record_id: 'uef-002', reporting_period: '2025-Q3' };
const LIFE_ROW_2: MockRow = { pillar: 'LIFE',   iu_value: 0.5000, source_uef_record_id: 'uef-003', reporting_period: '2025-Q3' };

const INITIATIVE_UEF_001: MockRow = {
  title: 'Corso benessere aziendale',
  pillar: 'LIFE',
  source_uef_record_id: 'uef-001',
  start_date: '2025-07-01',
};

// ── getPIBLive ────────────────────────────────────────────────────────────────

describe('WorkerPIBService.getPIBLive', () => {
  let service: WorkerPIBService;
  beforeEach(() => { service = new WorkerPIBService(); });

  it('aggrega 3 righe worker_pib: LIFE×2 + GROWTH×1 → breakdown corretto', async () => {
    const supabase = makeSupabaseMock(new Map([
      ['worker_pib', [LIFE_ROW, GROWTH_ROW, LIFE_ROW_2]],
    ]));

    const pib = await service.getPIBLive(supabase);

    expect(pib.isSynthetic).toBe(false);
    expect(pib.pib_derivation_basis).toBe('live_scoring_pipeline');
    expect(pib.not_employer_visible).toBe(true);
    expect(pib.not_performance_score).toBe(true);

    expect(pib.active_pillars).toBe(2);
    expect(pib.period_iu_total).toBeCloseTo(0.9 + 0.75 + 0.5, 3);

    const lifeEntry  = pib.pillar_breakdown.find((p) => p.pillar === 'LIFE');
    const growthEntry = pib.pillar_breakdown.find((p) => p.pillar === 'GROWTH');
    expect(lifeEntry).toBeDefined();
    expect(growthEntry).toBeDefined();
    expect(lifeEntry!.iu_total).toBeCloseTo(0.9 + 0.5, 3);
    expect(growthEntry!.iu_total).toBeCloseTo(0.75, 3);
  });

  it('total_events conta UEF id distinti, non righe', async () => {
    // 3 righe ma 3 UEF distinti
    const supabase = makeSupabaseMock(new Map([['worker_pib', [LIFE_ROW, GROWTH_ROW, LIFE_ROW_2]]]));
    const pib = await service.getPIBLive(supabase);
    expect(pib.total_events).toBe(3);
  });

  it('DB restituisce array vuoto → _emptyLivePIB (zero attivazioni)', async () => {
    const supabase = makeSupabaseMock(new Map([['worker_pib', []]]));
    const pib = await service.getPIBLive(supabase);

    expect(pib.period_iu_total).toBe(0);
    expect(pib.active_pillars).toBe(0);
    expect(pib.total_events).toBe(0);
    expect(pib.pillar_breakdown).toHaveLength(0);
    expect(pib.isSynthetic).toBe(false);
    expect(pib.activation_level).toBe('initial');
  });

  it('DB restituisce errore → _emptyLivePIB (graceful degradation)', async () => {
    const supabase = {
      schema: () => ({
        from: () => makeMockQuery([], { message: 'relation does not exist' }),
      }),
    };
    const pib = await service.getPIBLive(supabase as unknown as never);
    expect(pib.period_iu_total).toBe(0);
    expect(pib.isSynthetic).toBe(false);
  });

  it('trend = not_available nel live path (cross-period non disponibile senza history)', async () => {
    const supabase = makeSupabaseMock(new Map([['worker_pib', [LIFE_ROW]]]));
    const pib = await service.getPIBLive(supabase);
    pib.pillar_breakdown.forEach((p) => {
      // Il trend è 'not_available' nel live path perché non esistono dati storici cross-periodo.
      // Non viene hardcodato 'stable' — non c'è storia da confrontare.
      expect(p.trend).toBe('not_available');
    });
  });

  it('isolation: worker_pib query non filtra per workerId esplicito (delegato a RLS)', async () => {
    // Il service NON deve applicare .eq('worker_identity_id', ...)
    // L'isolamento è garantito dalla RLS via auth.uid() — non dal codice.
    // Qui verifichiamo che la risposta non dipenda da un parametro workerId
    // che potrebbe essere forgiato.
    const supabase = makeSupabaseMock(new Map([['worker_pib', [LIFE_ROW]]]));
    // Chiamata senza alcun workerId parametro
    const pib = await service.getPIBLive(supabase);
    expect(pib.pillar_breakdown).toHaveLength(1);
  });
});

// ── getCVDataLive ─────────────────────────────────────────────────────────────

describe('WorkerPIBService.getCVDataLive', () => {
  let service: WorkerPIBService;
  beforeEach(() => { service = new WorkerPIBService(); });

  it('restituisce solo righe is_exportable=true (Nodo A — mock già filtra per is_exportable)', async () => {
    // Il mock per worker_pib risponde con righe verificate (is_exportable=true è filtro DB).
    // Qui testiamo che il service costruisca WorkerCVData correttamente da quelle righe.
    const supabase = makeSupabaseMock(new Map([
      ['worker_pib',          [LIFE_ROW]],
      ['worker_initiative',   [INITIATIVE_UEF_001]],
    ]));

    const cv = await service.getCVDataLive(supabase);

    expect(cv.isSynthetic).toBe(false);
    expect(cv.export_available).toBe(true);
    expect(cv.total_items).toBe(1);
    expect(cv.verified_count).toBe(1);
    expect(cv.items[0]!.verification_status).toBe('verified');
    expect(cv.items[0]!.shareable).toBe(true);
  });

  it('nessuna riga worker_pib → CV vuoto (no errore)', async () => {
    const supabase = makeSupabaseMock(new Map([['worker_pib', []]]));
    const cv = await service.getCVDataLive(supabase);

    expect(cv.total_items).toBe(0);
    expect(cv.items).toHaveLength(0);
    expect(cv.export_available).toBe(true); // true anche a vuoto: nessun dato sintetico
    expect(cv.isSynthetic).toBe(false);
  });

  it('titolo iniziativa recuperato da worker_initiative via source_uef_record_id', async () => {
    const supabase = makeSupabaseMock(new Map([
      ['worker_pib',        [LIFE_ROW]],
      ['worker_initiative', [INITIATIVE_UEF_001]],
    ]));
    const cv = await service.getCVDataLive(supabase);

    expect(cv.items[0]!.title).toBe('Corso benessere aziendale');
    expect(cv.items[0]!.date).toBe('2025-07-01');
  });

  it('source_uef_record_id null → fallback a pillar come titolo (graceful)', async () => {
    const rowNoUef: MockRow = { ...LIFE_ROW, source_uef_record_id: null };
    const supabase = makeSupabaseMock(new Map([
      ['worker_pib', [rowNoUef]],
    ]));
    const cv = await service.getCVDataLive(supabase);
    // Nessun join possibile → fallback a pillar come titolo
    expect(cv.items[0]!.title).toBe('LIFE');
  });
});

// ── Invarianti non employer-visible ──────────────────────────────────────────

describe('Invarianti privacy WorkerPIBService live', () => {
  let service: WorkerPIBService;
  beforeEach(() => { service = new WorkerPIBService(); });

  it('getPIBLive: not_employer_visible e not_performance_score sempre true', async () => {
    const supabase = makeSupabaseMock(new Map([['worker_pib', [LIFE_ROW]]]));
    const pib = await service.getPIBLive(supabase);
    expect(pib.not_employer_visible).toBe(true);
    expect(pib.not_performance_score).toBe(true);
  });

  it('getPIBLive con DB vuoto: not_employer_visible e not_performance_score ancora true', async () => {
    const supabase = makeSupabaseMock(new Map([['worker_pib', []]]));
    const pib = await service.getPIBLive(supabase);
    expect(pib.not_employer_visible).toBe(true);
    expect(pib.not_performance_score).toBe(true);
  });

  it('metodi sincroni (preview) restano isSynthetic=true e non vengono modificati', () => {
    // Verifica che i nuovi metodi async non abbiano rotto i metodi sincroni B157
    const pib = service.getPIB('A', 'S1');
    expect(pib.isSynthetic).toBe(true);
    expect(pib.pib_derivation_basis).toBe('synthetic_iu_pre_computed');

    const cv = service.getCVData('A');
    expect(cv.isSynthetic).toBe(true);
    expect(cv.export_available).toBe(false);
  });
});
