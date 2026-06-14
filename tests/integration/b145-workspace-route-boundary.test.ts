/**
 * B145 — Workspace Route Application-Layer Boundary Tests
 *
 * Cosa validano questi test:
 *   - Il route handler usa getSupabaseServerClient (client di sessione) — confermato
 *   - Il handler passa sempre il tenantId dalla sessione alle query DB
 *   - La risposta è corretta quando il tenant ha dati
 *   - La risposta è 404 quando il DB non restituisce righe (come farebbe la RLS
 *     per un tenant che non ha accesso ai dati richiesti)
 *   - La risposta non contiene mai dati individuali del lavoratore
 *
 * Cosa NON validano questi test:
 *   - L'enforcement della RLS PostgreSQL (richiede DB reale/locale)
 *   - Il parsing del JWT / cookie di sessione
 *   - Il comportamento di rete
 *
 * Approccio: vi.mock di @/lib/auth/kora-session e @/lib/supabase/server.
 * Il DB è simulato con un Proxy chainable che restituisce dati controllati per tabella.
 */

import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import type { NextRequest } from 'next/server';

// ── Mocks — devono essere dichiarati prima degli import del modulo da testare ──

vi.mock('@/lib/auth/kora-session', () => ({
  requireCompanyUser: vi.fn(),
  isKoraAuthError:    vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  getSupabaseServerClient: vi.fn(),
  getSupabaseServiceClient: vi.fn(),
}));

import { GET } from '@/app/api/company/workspace/route';
import { requireCompanyUser, isKoraAuthError } from '@/lib/auth/kora-session';
import { getSupabaseServerClient } from '@/lib/supabase/server';

// ── Fake chainable Supabase query builder ─────────────────────────────────────
//
// Ogni metodo di chaining (select, eq, neq, order, limit) restituisce il builder
// stesso. I metodi terminali (.maybeSingle, .single) e l'await diretto (via .then)
// risolvono con il risultato configurato per la tabella corrente.

type TableResult = { data: unknown; count?: number | null; error: null };

function createMockDb(tableResults: Record<string, TableResult>) {
  let currentTable = '__unknown__';

  function makeChain(): object {
    const getResult = (): TableResult =>
      tableResults[currentTable] ?? { data: null, count: null, error: null };

    const handler: ProxyHandler<object> = {
      get(_target, prop: string) {
        // Await diretto sulla chain (es. per count query senza .maybeSingle())
        if (prop === 'then') {
          return (
            resolve: (v: TableResult) => unknown,
            reject?: (v: unknown) => unknown,
          ) => Promise.resolve(getResult()).then(resolve, reject);
        }
        // Terminal: .maybeSingle() / .single()
        if (prop === 'maybeSingle' || prop === 'single') {
          return () => Promise.resolve(getResult());
        }
        // .from(tableName) cattura il nome tabella e restituisce una nuova chain
        if (prop === 'from') {
          return (tableName: string) => {
            currentTable = tableName;
            return makeChain();
          };
        }
        // Tutti gli altri metodi di chaining (select, eq, neq, order, limit, in, schema)
        return () => makeChain();
      },
    };

    return new Proxy({}, handler);
  }

  return { schema: () => makeChain() };
}

// ── Fixture ────────────────────────────────────────────────────────────────────

const TENANT_A_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const TENANT_B_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

const TENANT_A_ROW = {
  id:                     TENANT_A_ID,
  tenant_code:            'TEST-A',
  company_name:           'Azienda Alpha Srl',
  methodology_version_id: 'KORA Index v1.0',
  onboarding_status:      'active',
  data_readiness_status:  'ready',
  decision_pack_status:   'ready',
  is_active:              true,
  created_at:             '2025-01-01T00:00:00Z',
};

function makeAuthResult(tenantId: string) {
  return {
    tenantId,
    koraRole: 'COMPANY_ADMIN' as const,
    email:    `admin@${tenantId}.test`,
    id:       `user-${tenantId}`,
  };
}

// Minimal mock request — requireCompanyUser è mockato e ignora il valore request
const mockRequest = new Request(
  'http://localhost/api/company/workspace',
) as unknown as NextRequest;

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('B145 — workspace route: application-layer boundary (mocked Supabase)', () => {

  beforeEach(() => {
    vi.clearAllMocks();
    (isKoraAuthError as Mock).mockReturnValue(false);
  });

  // ── Test 1: 200 con dati corretti per il tenant autenticato ──────────────────

  it('restituisce 200 con i dati del tenant per una sessione autenticata', async () => {
    (requireCompanyUser as Mock).mockResolvedValue(makeAuthResult(TENANT_A_ID));
    (getSupabaseServerClient as Mock).mockResolvedValue(
      createMockDb({
        tenant:               { data: TENANT_A_ROW, error: null },
        workforce_baseline:   { data: null, error: null },
        source_batch:         { data: null, count: 0, error: null },
        kora_index_result:    { data: null, error: null },
        decision_pack_version:{ data: null, error: null },
      }),
    );

    const response = await GET(mockRequest);
    const body = await response.json() as Record<string, unknown>;

    expect(response.status).toBe(200);
    expect(body['ok']).toBe(true);
    expect((body['tenant'] as Record<string, unknown>)['id']).toBe(TENANT_A_ID);
    expect((body['tenant'] as Record<string, unknown>)['companyName']).toBe('Azienda Alpha Srl');
    expect((body['tenant'] as Record<string, unknown>)['tenantCode']).toBe('TEST-A');
  });

  // ── Test 2: 404 quando il DB non restituisce righe (come farebbe la RLS) ─────
  //
  // Scenario: la RLS blocca le righe di un altro tenant — la query restituisce null.
  // Il route handler deve rispondere 404, non leakare dati parziali.

  it('restituisce 404 quando il DB non restituisce la riga tenant — simula isolamento RLS', async () => {
    (requireCompanyUser as Mock).mockResolvedValue(makeAuthResult(TENANT_A_ID));
    (getSupabaseServerClient as Mock).mockResolvedValue(
      createMockDb({
        tenant:               { data: null, error: null }, // RLS: nessuna riga visibile
        workforce_baseline:   { data: null, error: null },
        source_batch:         { data: null, count: 0, error: null },
        kora_index_result:    { data: null, error: null },
        decision_pack_version:{ data: null, error: null },
      }),
    );

    const response = await GET(mockRequest);

    expect(response.status).toBe(404);
  });

  // ── Test 3: la risposta non contiene mai dati individuali del lavoratore ──────

  it('la risposta non espone pseudonym_id, pib_score o altri dati individuali', async () => {
    (requireCompanyUser as Mock).mockResolvedValue(makeAuthResult(TENANT_A_ID));
    (getSupabaseServerClient as Mock).mockResolvedValue(
      createMockDb({
        tenant: {
          data: {
            ...TENANT_A_ROW,
            // Simula campi sensibili che NON devono emergere nella risposta
            pseudonym_id:  'SHOULD-NOT-APPEAR',
            pib_score:     99,
            auth_user_id:  'SHOULD-NOT-APPEAR',
          },
          error: null,
        },
        workforce_baseline:    { data: { id: 'wb-1', total_workers: 120, reporting_period: '2025-Q1', created_at: '2025-01-01' }, error: null },
        source_batch:          { data: null, count: 3, error: null },
        kora_index_result:     { data: null, error: null },
        decision_pack_version: { data: null, error: null },
      }),
    );

    const response = await GET(mockRequest);
    const bodyStr = JSON.stringify(await response.json());

    expect(bodyStr).not.toContain('pseudonym_id');
    expect(bodyStr).not.toContain('pib_score');
    expect(bodyStr).not.toContain('auth_user_id');
    expect(bodyStr).not.toContain('worker_ref');
  });

  // ── Test 4: tutte le query DB usano il tenantId dalla sessione ────────────────
  //
  // Verifica che il route handler non hardcodi mai un tenantId diverso da quello
  // estratto dalla sessione. Un tenant A non può mai far sì che il handler
  // interroghi dati di un tenant B.

  it('tutte le query DB usano esclusivamente il tenantId dalla sessione', async () => {
    const authResult = makeAuthResult(TENANT_A_ID);
    (requireCompanyUser as Mock).mockResolvedValue(authResult);

    const eqArgs: unknown[][] = [];
    let currentTable = '__unknown__';

    function makeSpyChain(): object {
      const getResult = (): TableResult => {
        if (currentTable === 'tenant') return { data: TENANT_A_ROW, error: null };
        if (currentTable === 'source_batch') return { data: null, count: 0, error: null };
        return { data: null, error: null };
      };

      const handler: ProxyHandler<object> = {
        get(_t, prop: string) {
          if (prop === 'then') {
            return (r: (v: TableResult) => unknown) =>
              Promise.resolve(getResult()).then(r);
          }
          if (prop === 'maybeSingle' || prop === 'single') {
            return () => Promise.resolve(getResult());
          }
          if (prop === 'from') {
            return (tableName: string) => {
              currentTable = tableName;
              return makeSpyChain();
            };
          }
          if (prop === 'eq') {
            return (...args: unknown[]) => {
              eqArgs.push(args);
              return makeSpyChain();
            };
          }
          return () => makeSpyChain();
        },
      };

      return new Proxy({}, handler);
    }

    (getSupabaseServerClient as Mock).mockResolvedValue({
      schema: () => makeSpyChain(),
    });

    await GET(mockRequest);

    // Ogni .eq() che usa un UUID deve usare TENANT_A_ID — mai TENANT_B_ID o valori hardcoded
    const uuidEqCalls = eqArgs.filter(
      ([, v]) => typeof v === 'string' && v.length >= 32,
    );
    expect(uuidEqCalls.length).toBeGreaterThan(0);

    uuidEqCalls.forEach(([, value]) => {
      expect(value).toBe(TENANT_A_ID);
      expect(value).not.toBe(TENANT_B_ID);
    });
  });

});
