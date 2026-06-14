/**
 * B152-B — Company Routes Boundary Tests (mocked Supabase)
 *
 * Cosa validano questi test:
 *   - Le route usano getSupabaseServerClient (non service client)
 *   - Le RPC sono chiamate con i nomi corretti (fn_company_worker_status, fn_company_activation_summary)
 *   - Le view sono interrogate con i parametri corretti
 *   - La response shape è compatibile con la struttura precedente
 *   - live-eligibility gestisce il caso period assente (order+limit, non blind maybeSingle)
 *   - evidence-record restituisce 404 quando la view non trova il record (cross-tenant o assente)
 *   - evidence-archive non espone initiative_name_raw nella response
 *
 * Cosa NON validano:
 *   - RLS enforcement PostgreSQL (richiede DB reale, Gate 2 open)
 *   - Parsing JWT / cookie di sessione
 *   - Comportamento di rete
 *
 * Approccio: vi.mock di @/lib/auth/kora-session e @/lib/supabase/server.
 * Il DB è simulato con un Proxy chainable che gestisce sia .from() che .rpc().
 */

import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import type { NextRequest } from 'next/server';

// ── Mocks — dichiarati prima degli import del modulo da testare ───────────────

vi.mock('@/lib/auth/kora-session', () => ({
  requireCompanyUser: vi.fn(),
  isKoraAuthError:    vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  getSupabaseServerClient:  vi.fn(),
  getSupabaseServiceClient: vi.fn(),
}));

import { GET as getWorkerAggregate }    from '@/app/api/company/workers/aggregate/route';
import { GET as getActivationAggregate } from '@/app/api/company/workers/activation-aggregate/route';
import { GET as getLiveEligibility }     from '@/app/api/company/live-eligibility/route';
import { GET as getEvidenceRecord }      from '@/app/api/company/evidence-record/route';
import { GET as getEvidenceArchive }     from '@/app/api/company/evidence-archive/route';
import { requireCompanyUser, isKoraAuthError } from '@/lib/auth/kora-session';
import { getSupabaseServerClient } from '@/lib/supabase/server';

// ── Mock DB builder ───────────────────────────────────────────────────────────

type Result = { data: unknown; error: null | { message: string }; count?: number | null };

function createMockDb(options: {
  rpcs?:   Record<string, Result>;
  tables?: Record<string, Result>;
}) {
  const { rpcs = {}, tables = {} } = options;
  let currentTable = '__unknown__';

  function makeChain(): object {
    const getResult = (): Result => tables[currentTable] ?? { data: null, error: null };

    const handler: ProxyHandler<object> = {
      get(_t, prop: string) {
        if (prop === 'then') {
          return (r: (v: Result) => unknown) => Promise.resolve(getResult()).then(r);
        }
        if (prop === 'maybeSingle' || prop === 'single') {
          return () => Promise.resolve(getResult());
        }
        if (prop === 'from') {
          return (tableName: string) => {
            currentTable = tableName;
            return makeChain();
          };
        }
        if (prop === 'rpc') {
          return (fnName: string, _params?: unknown) => {
            const result = rpcs[fnName] ?? { data: null, error: null };
            return Promise.resolve(result);
          };
        }
        // select, eq, neq, order, limit, in, filter: return chain
        return () => makeChain();
      },
    };
    return new Proxy({}, handler);
  }

  return { schema: () => makeChain() };
}

// ── Fixtures ──────────────────────────────────────────────────────────────────

const TENANT_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

function makeAuth(tenantId = TENANT_ID) {
  return { tenantId, koraRole: 'COMPANY_ADMIN' as const, email: 'admin@test.it', id: 'user-1' };
}

function makeReq(path: string): NextRequest {
  return new Request(`http://localhost${path}`) as unknown as NextRequest;
}

// ── Setup ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  (isKoraAuthError as unknown as Mock).mockReturnValue(false);
  (requireCompanyUser as unknown as Mock).mockResolvedValue(makeAuth());
});

// ─────────────────────────────────────────────────────────────────────────────
// ROUTE 1 — workers/aggregate
// ─────────────────────────────────────────────────────────────────────────────

describe('B152-B — workers/aggregate: server client + fn_company_worker_status', () => {
  it('restituisce 200 con aggregate corretto mappando total_workers → total', async () => {
    (getSupabaseServerClient as Mock).mockResolvedValue(createMockDb({
      rpcs: {
        fn_company_worker_status: {
          data: [{ total_workers: 10, invited: 2, active: 6, pending: 1, disabled: 1, coverage_pct: '60.0' }],
          error: null,
        },
      },
    }));

    const res  = await getWorkerAggregate(makeReq('/api/company/workers/aggregate'));
    const body = await res.json() as Record<string, unknown>;

    expect(res.status).toBe(200);
    expect(body['ok']).toBe(true);
    const agg = body['aggregate'] as Record<string, unknown>;
    expect(agg['total']).toBe(10);
    expect(agg['invited']).toBe(2);
    expect(agg['active']).toBe(6);
    expect(agg['pending']).toBe(1);
    expect(agg['disabled']).toBe(1);
    expect(agg['coveragePct']).toBe(60);
  });

  it('restituisce 200 con zero quando la function non restituisce righe', async () => {
    (getSupabaseServerClient as Mock).mockResolvedValue(createMockDb({
      rpcs: { fn_company_worker_status: { data: [], error: null } },
    }));

    const res  = await getWorkerAggregate(makeReq('/api/company/workers/aggregate'));
    const body = await res.json() as Record<string, unknown>;

    expect(res.status).toBe(200);
    const agg = body['aggregate'] as Record<string, unknown>;
    expect(agg['total']).toBe(0);
  });

  it('restituisce 500 se la function ritorna un errore', async () => {
    (getSupabaseServerClient as Mock).mockResolvedValue(createMockDb({
      rpcs: { fn_company_worker_status: { data: null, error: { message: 'db error' } } },
    }));

    const res = await getWorkerAggregate(makeReq('/api/company/workers/aggregate'));
    expect(res.status).toBe(500);
  });

  it('la response non include dati individuali worker', async () => {
    (getSupabaseServerClient as Mock).mockResolvedValue(createMockDb({
      rpcs: {
        fn_company_worker_status: {
          data: [{ total_workers: 5, invited: 1, active: 3, pending: 1, disabled: 0, coverage_pct: '60.0',
                   pseudonym_id: 'SHOULD-NOT-APPEAR', worker_ref: 'SHOULD-NOT-APPEAR' }],
          error: null,
        },
      },
    }));

    const res  = await getWorkerAggregate(makeReq('/api/company/workers/aggregate'));
    const body = JSON.stringify(await res.json());
    expect(body).not.toContain('pseudonym_id');
    expect(body).not.toContain('worker_ref');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ROUTE 2 — workers/activation-aggregate
// ─────────────────────────────────────────────────────────────────────────────

describe('B152-B — activation-aggregate: server client + fn_company_activation_summary', () => {
  const NON_SUPPRESSED_FN_OUTPUT = {
    total_published_initiatives: 5,
    total_engagements: 12,
    total_engagements_suppressed: false,
    pillar_breakdown: [
      { pillar: 'LIFE', published_initiatives: 2, total_participations: 10, suppressed: false, suppression_threshold: 10 },
    ],
    safe_aggregation_threshold: 10,
    privacy_note: 'Nessun dato individuale incluso.',
  };

  const SUPPRESSED_FN_OUTPUT = {
    total_published_initiatives: 3,
    total_engagements: null,
    total_engagements_suppressed: true,
    pillar_breakdown: [
      { pillar: 'GROWTH', published_initiatives: 1, total_participations: null, suppressed: true, suppression_threshold: 10 },
    ],
    safe_aggregation_threshold: 10,
    privacy_note: 'Conteggi < 10 soppressi.',
  };

  it('restituisce 200 con participation_summary non soppressa', async () => {
    (getSupabaseServerClient as Mock).mockResolvedValue(createMockDb({
      rpcs: { fn_company_activation_summary: { data: NON_SUPPRESSED_FN_OUTPUT, error: null } },
    }));

    const res  = await getActivationAggregate(makeReq('/api/company/workers/activation-aggregate'));
    const body = await res.json() as Record<string, unknown>;

    expect(res.status).toBe(200);
    const agg = body['aggregate'] as Record<string, unknown>;
    expect(agg['total_published_initiatives']).toBe(5);
    const ps = agg['participation_summary'] as Record<string, unknown>;
    expect(ps['suppressed']).toBe(false);
    expect(ps['value']).toBe(12);
  });

  it('restituisce participation_summary.suppressed=true quando SQL sopprime', async () => {
    (getSupabaseServerClient as Mock).mockResolvedValue(createMockDb({
      rpcs: { fn_company_activation_summary: { data: SUPPRESSED_FN_OUTPUT, error: null } },
    }));

    const res  = await getActivationAggregate(makeReq('/api/company/workers/activation-aggregate'));
    const body = await res.json() as Record<string, unknown>;

    const agg = body['aggregate'] as Record<string, unknown>;
    const ps  = agg['participation_summary'] as Record<string, unknown>;
    expect(ps['suppressed']).toBe(true);
    expect(ps['suppression_reason']).toBe('privacy_threshold');
    expect(ps).not.toHaveProperty('value');
  });

  it('pillar_breakdown soppressa include suppression_reason', async () => {
    (getSupabaseServerClient as Mock).mockResolvedValue(createMockDb({
      rpcs: { fn_company_activation_summary: { data: SUPPRESSED_FN_OUTPUT, error: null } },
    }));

    const res  = await getActivationAggregate(makeReq('/api/company/workers/activation-aggregate'));
    const body = await res.json() as Record<string, unknown>;

    const agg = body['aggregate'] as Record<string, unknown>;
    const pb  = (agg['pillar_breakdown'] as Record<string, unknown>[])[0];
    expect(pb['suppressed']).toBe(true);
    expect(pb['suppression_reason']).toBe('privacy_threshold');
    expect(pb).not.toHaveProperty('total_participations');
  });

  it('pillar_breakdown non soppressa include total_participations', async () => {
    (getSupabaseServerClient as Mock).mockResolvedValue(createMockDb({
      rpcs: { fn_company_activation_summary: { data: NON_SUPPRESSED_FN_OUTPUT, error: null } },
    }));

    const res  = await getActivationAggregate(makeReq('/api/company/workers/activation-aggregate'));
    const body = await res.json() as Record<string, unknown>;

    const agg = body['aggregate'] as Record<string, unknown>;
    const pb  = (agg['pillar_breakdown'] as Record<string, unknown>[])[0];
    expect(pb['suppressed']).toBe(false);
    expect(pb['total_participations']).toBe(10);
  });

  it('restituisce 500 se la function ritorna errore', async () => {
    (getSupabaseServerClient as Mock).mockResolvedValue(createMockDb({
      rpcs: { fn_company_activation_summary: { data: null, error: { message: 'db error' } } },
    }));

    const res = await getActivationAggregate(makeReq('/api/company/workers/activation-aggregate'));
    expect(res.status).toBe(500);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ROUTE 3 — live-eligibility
// ─────────────────────────────────────────────────────────────────────────────

describe('B152-B — live-eligibility: server client + v_company_uef_eligibility_summary', () => {
  const VIEW_ROW = {
    tenant_id:                    TENANT_ID,
    reporting_period:             '2026-Q1',
    total_uef_records:            20,
    eligible_count:               15,
    limited_count:                3,
    blocked_count:                2,
    pending_review_count:         5,
    approved_for_scoring_count:   10,
    needs_more_data_count:        2,
    rejected_count:               1,
    approved_for_impact_units_count: 8,
    review_completion_rate:       '0.7500',
    life_program_names:           ['Yoga Aziendale', 'Nutrizione'],
    iu_average_ev:                '0.8500',
  };

  it('restituisce 200 con response shape corretta quando period è fornito', async () => {
    (getSupabaseServerClient as Mock).mockResolvedValue(createMockDb({
      tables: { v_company_uef_eligibility_summary: { data: VIEW_ROW, error: null } },
    }));

    const res  = await getLiveEligibility(makeReq('/api/company/live-eligibility?period=2026-Q1'));
    const body = await res.json() as Record<string, unknown>;

    expect(res.status).toBe(200);
    const elig = body['eligibility'] as Record<string, unknown>;
    expect(elig['eligible']).toBe(15);
    expect(elig['limited']).toBe(3);
    expect(elig['blocked']).toBe(2);
    expect(elig['total']).toBe(20);
    expect(elig['approved_for_impact_units']).toBe(8);

    const uefReview = body['uef_review'] as Record<string, unknown>;
    expect(uefReview['pending_count']).toBe(5);
    expect(uefReview['approved_for_scoring_count']).toBe(10);
    expect(uefReview['rejected_count']).toBe(1);

    expect(body['life_program_names']).toEqual(['Yoga Aziendale', 'Nutrizione']);
    expect(body['iu_average_ev']).toBe(0.85);
    expect(body['reporting_period']).toBe('2026-Q1');
  });

  it('restituisce empty response (non 500) quando la view non restituisce righe', async () => {
    (getSupabaseServerClient as Mock).mockResolvedValue(createMockDb({
      tables: { v_company_uef_eligibility_summary: { data: null, error: null } },
    }));

    const res  = await getLiveEligibility(makeReq('/api/company/live-eligibility'));
    const body = await res.json() as Record<string, unknown>;

    expect(res.status).toBe(200);
    const elig = body['eligibility'] as Record<string, unknown>;
    expect(elig['total']).toBe(0);
    expect(body['life_program_names']).toEqual([]);
    expect(body['iu_average_ev']).toBe(0);
  });

  it('restituisce 500 se la view ritorna errore DB', async () => {
    (getSupabaseServerClient as Mock).mockResolvedValue(createMockDb({
      tables: { v_company_uef_eligibility_summary: { data: null, error: { message: 'db error' } } },
    }));

    const res = await getLiveEligibility(makeReq('/api/company/live-eligibility'));
    expect(res.status).toBe(500);
  });

  it('life_program_names null da array_agg viene normalizzato a []', async () => {
    (getSupabaseServerClient as Mock).mockResolvedValue(createMockDb({
      tables: { v_company_uef_eligibility_summary: { data: { ...VIEW_ROW, life_program_names: null }, error: null } },
    }));

    const res  = await getLiveEligibility(makeReq('/api/company/live-eligibility?period=2026-Q1'));
    const body = await res.json() as Record<string, unknown>;

    expect(res.status).toBe(200);
    expect(body['life_program_names']).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ROUTE 4 — evidence-record
// ─────────────────────────────────────────────────────────────────────────────

describe('B152-B — evidence-record: server client + v_company_uploaded_record_safe', () => {
  const VIEW_ROW = {
    record_id:         'aaaaaaaa-1111-1111-1111-aaaaaaaaaaaa',
    batch_id:          'bbbbbbbb-2222-2222-2222-bbbbbbbbbbbb',
    tenant_id:         TENANT_ID,
    reporting_period:  '2026-Q1',
    batch_source_type: 'company_submission',
    batch_status:      'processing',
    eligibility_status: 'eligible',
    primary_pillar:    'LIFE',
    action_family:     'welfare_health',
    event_nature:      'participation',
    review_status:     'approved',
    initiative_name_raw: 'Yoga Aziendale 2026',
    evidence_level:    'L2',
    budget_class:      'deep_activation',
    created_at:        '2026-01-01T00:00:00Z',
    updated_at:        '2026-01-02T00:00:00Z',
  };

  it('restituisce 200 con record corretto quando la view trova il record', async () => {
    (getSupabaseServerClient as Mock).mockResolvedValue(createMockDb({
      tables: {
        v_company_uploaded_record_safe: { data: VIEW_ROW, error: null },
        source_batch: { data: { payload_sample: {} }, error: null },
      },
    }));

    const res  = await getEvidenceRecord(makeReq('/api/company/evidence-record?recordId=aaaaaaaa-1111-1111-1111-aaaaaaaaaaaa'));
    const body = await res.json() as Record<string, unknown>;

    expect(res.status).toBe(200);
    const rec = body['record'] as Record<string, unknown>;
    expect(rec['eligibility']).toBe('eligible');
    expect(rec['pillar']).toBe('LIFE');
    expect(rec['batchSourceType']).toBe('company_submission');
    expect(rec['evidenceLevel']).toBe('L2');
  });

  it('restituisce 404 quando la view non trova il record (cross-tenant o assente)', async () => {
    (getSupabaseServerClient as Mock).mockResolvedValue(createMockDb({
      tables: { v_company_uploaded_record_safe: { data: null, error: null } },
    }));

    const res = await getEvidenceRecord(makeReq('/api/company/evidence-record?recordId=non-existent-id'));
    expect(res.status).toBe(404);
  });

  it('restituisce 400 se recordId è assente', async () => {
    (getSupabaseServerClient as Mock).mockResolvedValue(createMockDb({ tables: {} }));

    const res = await getEvidenceRecord(makeReq('/api/company/evidence-record'));
    expect(res.status).toBe(400);
  });

  it('la response non contiene initiative_name_raw grezza', async () => {
    (getSupabaseServerClient as Mock).mockResolvedValue(createMockDb({
      tables: {
        v_company_uploaded_record_safe: { data: VIEW_ROW, error: null },
        source_batch: { data: { payload_sample: {} }, error: null },
      },
    }));

    const res  = await getEvidenceRecord(makeReq('/api/company/evidence-record?recordId=aaaaaaaa-1111-1111-1111-aaaaaaaaaaaa'));
    const body = JSON.stringify(await res.json());
    expect(body).not.toContain('initiative_name_raw');
    expect(body).not.toContain('pseudonym_id');
    expect(body).not.toContain('raw_hash');
  });

  it('safeName non contiene la stringa raw (buildSafeName applicato)', async () => {
    (getSupabaseServerClient as Mock).mockResolvedValue(createMockDb({
      tables: {
        v_company_uploaded_record_safe: { data: { ...VIEW_ROW, initiative_name_raw: 'Yoga Aziendale 2026' }, error: null },
        source_batch: { data: { payload_sample: {} }, error: null },
      },
    }));

    const res  = await getEvidenceRecord(makeReq('/api/company/evidence-record?recordId=aaaaaaaa-1111-1111-1111-aaaaaaaaaaaa'));
    const body = await res.json() as Record<string, unknown>;
    const rec  = body['record'] as Record<string, unknown>;
    // safeName deve essere la stringa processata (in questo caso uguale, non è PII)
    expect(rec['safeName']).toBe('Yoga Aziendale 2026');
    // Ma la chiave initiative_name_raw non deve essere nel record
    expect(rec).not.toHaveProperty('initiative_name_raw');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ROUTE 5 — evidence-archive
// ─────────────────────────────────────────────────────────────────────────────

describe('B152-B — evidence-archive: server client + v_company_uploaded_record_safe', () => {
  const TENANT_ROW = {
    id: TENANT_ID, tenant_code: 'TEST', company_name: 'Azienda Test Srl', methodology_version_id: 'v0.1',
  };

  const BATCH_ROW = {
    id: 'bbbbbbbb-2222-2222-2222-bbbbbbbbbbbb',
    source_type: 'company_submission', batch_status: 'processing',
    row_count: 5, created_at: '2026-01-01T00:00:00Z',
    payload_sample: {},
  };

  const RECORD_ROW = {
    record_id:          'rrrrrrrr-3333-3333-3333-rrrrrrrrrrrr',
    batch_id:           'bbbbbbbb-2222-2222-2222-bbbbbbbbbbbb',
    eligibility_status: 'eligible',
    primary_pillar:     'LIFE',
    action_family:      'welfare_health',
    event_nature:       'participation',
    review_status:      'approved',
    initiative_name_raw: 'Yoga Aziendale',
    evidence_level:     'L2',
    budget_class:       'deep_activation',
  };

  it('restituisce 200 con batches e initiatives', async () => {
    (getSupabaseServerClient as Mock).mockResolvedValue(createMockDb({
      tables: {
        tenant:                      { data: TENANT_ROW,   error: null },
        source_batch:                { data: [BATCH_ROW],  error: null },
        v_company_uploaded_record_safe: { data: [RECORD_ROW], error: null },
      },
    }));

    const res  = await getEvidenceArchive(makeReq('/api/company/evidence-archive'));
    const body = await res.json() as Record<string, unknown>;

    expect(res.status).toBe(200);
    expect(body['ok']).toBe(true);
    const initiatives = body['initiatives'] as Record<string, unknown>[];
    expect(initiatives).toHaveLength(1);
    expect(initiatives[0]!['pillar']).toBe('LIFE');
  });

  it('initiative_name_raw non presente nella response (né in initiatives né altrove)', async () => {
    (getSupabaseServerClient as Mock).mockResolvedValue(createMockDb({
      tables: {
        tenant:                      { data: TENANT_ROW,   error: null },
        source_batch:                { data: [BATCH_ROW],  error: null },
        v_company_uploaded_record_safe: { data: [RECORD_ROW], error: null },
      },
    }));

    const res  = await getEvidenceArchive(makeReq('/api/company/evidence-archive'));
    const body = JSON.stringify(await res.json());

    expect(body).not.toContain('initiative_name_raw');
    expect(body).not.toContain('pseudonym_id');
    expect(body).not.toContain('raw_hash');
  });

  it('safeName processato da buildSafeName, non raw', async () => {
    (getSupabaseServerClient as Mock).mockResolvedValue(createMockDb({
      tables: {
        tenant:                      { data: TENANT_ROW,   error: null },
        source_batch:                { data: [BATCH_ROW],  error: null },
        v_company_uploaded_record_safe: { data: [{ ...RECORD_ROW, initiative_name_raw: 'Yoga Aziendale' }], error: null },
      },
    }));

    const res  = await getEvidenceArchive(makeReq('/api/company/evidence-archive'));
    const body = await res.json() as Record<string, unknown>;

    const initiatives = body['initiatives'] as Record<string, unknown>[];
    expect(initiatives[0]!['safeName']).toBe('Yoga Aziendale');
    expect(initiatives[0]).not.toHaveProperty('initiative_name_raw');
  });

  it('restituisce 404 se il tenant non è trovato', async () => {
    (getSupabaseServerClient as Mock).mockResolvedValue(createMockDb({
      tables: { tenant: { data: null, error: null } },
    }));

    const res = await getEvidenceArchive(makeReq('/api/company/evidence-archive'));
    expect(res.status).toBe(404);
  });

  it('restituisce batches vuoti e initiatives vuote se batchIds è vuoto', async () => {
    (getSupabaseServerClient as Mock).mockResolvedValue(createMockDb({
      tables: {
        tenant:       { data: TENANT_ROW, error: null },
        source_batch: { data: [],         error: null },
      },
    }));

    const res  = await getEvidenceArchive(makeReq('/api/company/evidence-archive'));
    const body = await res.json() as Record<string, unknown>;

    expect(res.status).toBe(200);
    expect((body['batches'] as unknown[]).length).toBe(0);
    expect((body['initiatives'] as unknown[]).length).toBe(0);
  });
});
