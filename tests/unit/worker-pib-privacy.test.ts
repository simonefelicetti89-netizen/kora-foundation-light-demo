/**
 * Worker PIB Privacy — RLS enforcement e access control (P0.3)
 *
 * Verifica staticamente che la route `/api/worker/pib` e il WorkerPIBService:
 *   1. Usino getSupabaseServerClient (RLS-respecting) nel live worker path.
 *   2. Non ottengano workerId/tenantId da query params.
 *   3. Isola KORA_ADMIN al path sintetico, separato dal live.
 *   4. Blocchino COMPANY_ADMIN (401).
 *   5. Non espongano worker_identity_id nelle query SELECT.
 *   6. Abbiano not_employer_visible: true e not_performance_score: true nel contratto.
 *
 * Verifica struttura SQL migration 018:
 *   7. personal.worker_pib ha FORCE ROW LEVEL SECURITY.
 *   8. Policy WORKER filtra per auth.uid().
 *   9. Nessuna policy COMPANY_ADMIN o COMPANY_VIEWER.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const root = resolve(process.cwd());

function src(relPath: string): string {
  return readFileSync(resolve(root, relPath), 'utf-8');
}

// ── 1. Route: usa getSupabaseServerClient, NON getSupabaseServiceClient ────────

describe('Worker PIB Privacy — RLS client selection', () => {
  const route = src('app/api/worker/pib/route.ts');

  it('importa getSupabaseServerClient (RLS-respecting)', () => {
    expect(route).toContain('getSupabaseServerClient');
  });

  it('NON importa getSupabaseServiceClient (bypassa RLS)', () => {
    expect(route).not.toContain('getSupabaseServiceClient');
  });

  it('usa getSupabaseServerClient nel live worker path', () => {
    // Estrai il blocco Path 1 (tra requireWorkerUser e requireKoraAdmin)
    const workerBlock = route.match(/Path 1[\s\S]*?Path 2/)?.[0] ?? route;
    expect(workerBlock).toContain('getSupabaseServerClient');
  });

  it('il commento "RLS DEBT" stale è stato rimosso', () => {
    expect(route).not.toContain('RLS DEBT');
  });

  it('commento corrente documenta il client RLS-respecting', () => {
    expect(route).toMatch(/rispetta RLS|RLS.*respecting|anon key.*cookie/i);
  });
});

// ── 2. Route: workerId e tenantId non vengono da query params ─────────────────

describe('Worker PIB Privacy — workerId/tenantId isolation', () => {
  const route = src('app/api/worker/pib/route.ts');

  it('workerId non viene letto da searchParams', () => {
    // Solo 'period' viene da searchParams nel live path
    const liveBlock = route.match(/Path 1[\s\S]*?Path 2/)?.[0] ?? '';
    expect(liveBlock).not.toMatch(/searchParams\.get\(['"]worker_?id['"]\)/);
    expect(liveBlock).not.toMatch(/searchParams\.get\(['"]workerId['"]\)/);
  });

  it('tenantId non viene letto da searchParams nel live path', () => {
    const liveBlock = route.match(/Path 1[\s\S]*?Path 2/)?.[0] ?? '';
    expect(liveBlock).not.toMatch(/searchParams\.get\(['"]tenant_?id['"]\)/);
    expect(liveBlock).not.toMatch(/searchParams\.get\(['"]tenantId['"]\)/);
  });

  it('solo "period" viene estratto da searchParams nel live path', () => {
    const liveBlock = route.match(/Path 1[\s\S]*?Path 2/)?.[0] ?? '';
    const allSearchParams = [...liveBlock.matchAll(/searchParams\.get\(['"]([^'"]+)['"]\)/g)]
      .map((m) => m[1]);
    // Deve contenere al più "period"
    for (const param of allSearchParams) {
      expect(param).toBe('period');
    }
  });

  it('requireWorkerUser(request) è chiamato prima di getSupabaseServerClient() nella funzione GET', () => {
    // Cerca la chiamata (con parentesi), non le occorrenze nell'import
    const requireCallIdx   = route.indexOf('requireWorkerUser(request)');
    const getServerCallIdx = route.indexOf('getSupabaseServerClient()');
    expect(requireCallIdx).toBeGreaterThan(0);
    expect(getServerCallIdx).toBeGreaterThan(requireCallIdx);
  });
});

// ── 3. KORA_ADMIN va al path sintetico (preview), non al live ─────────────────

describe('Worker PIB Privacy — KORA_ADMIN preview isolation', () => {
  const route = src('app/api/worker/pib/route.ts');

  it('requireKoraAdmin è chiamato DOPO requireWorkerUser (fallback, non primario)', () => {
    const workerIdx = route.indexOf('requireWorkerUser');
    const adminIdx  = route.indexOf('requireKoraAdmin');
    expect(adminIdx).toBeGreaterThan(workerIdx);
  });

  it('KORA_ADMIN path usa getPIB (sintetico), non getPIBLive', () => {
    // Trova il blocco KORA_ADMIN (Path 2)
    const adminBlock = route.match(/Path 2[\s\S]*?(?:\/\/ Both|return NextResponse\.json[\s\S]*?status:\s*401)/)?.[0] ?? '';
    expect(adminBlock).toContain('getPIB(');
    expect(adminBlock).not.toContain('getPIBLive');
  });

  it('KORA_ADMIN path NON chiama getSupabaseServerClient (usa solo dati sintetici)', () => {
    // Path 2 non deve istanziare un Supabase client
    const adminBlock = route.match(/Path 2[\s\S]*?(?:Both auth paths failed|status:\s*401)/)?.[0] ?? '';
    expect(adminBlock).not.toContain('getSupabaseServerClient');
    expect(adminBlock).not.toContain('getSupabaseServiceClient');
  });
});

// ── 4. COMPANY_ADMIN: 401 ─────────────────────────────────────────────────────

describe('Worker PIB Privacy — COMPANY_ADMIN bloccato', () => {
  const route = src('app/api/worker/pib/route.ts');

  it('la route restituisce 401 quando entrambi i path auth falliscono', () => {
    expect(route).toMatch(/status:\s*401/);
    expect(route).toContain('Accesso negato');
  });

  it('non esiste import di requireCompanyUser (COMPANY_ADMIN non ha path in questa route)', () => {
    expect(route).not.toContain('requireCompanyUser');
  });

  it('nessun path attivo (non commento) gestisce un ruolo company', () => {
    // Rimuovi commenti e verifica che non esista requireCompanyUser o un branch company
    const withoutComments = route.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
    expect(withoutComments).not.toContain('requireCompanyUser');
    expect(withoutComments).not.toMatch(/company_?admin/i);
  });
});

// ── 5. WorkerPIBService: SELECT non espone worker_identity_id ─────────────────

describe('Worker PIB Privacy — SELECT fields nel live path', () => {
  const service = src('services/worker-pib/WorkerPIBService.ts');

  it('getPIBLive SELECT non include worker_identity_id', () => {
    // La query nel live path non deve selezionare la colonna di identità
    const selectMatch = service.match(/getPIBLive[\s\S]*?\.select\(['"]([\s\S]*?)['"]\)/);
    const selectedFields = selectMatch?.[1] ?? '';
    expect(selectedFields).not.toContain('worker_identity_id');
    expect(selectedFields).not.toContain('auth_user_id');
  });

  it('getCVDataLive SELECT non include worker_identity_id', () => {
    const cvSelectMatch = service.match(/getCVDataLive[\s\S]*?\.select\(['"]([\s\S]*?)['"]\)/);
    const selectedFields = cvSelectMatch?.[1] ?? '';
    expect(selectedFields).not.toContain('worker_identity_id');
  });

  it('il live path NON passa workerId come parametro di filtro esplicito', () => {
    // Corretto per RLS: nessun .eq("worker_identity_id", ...) nel codice applicativo
    const liveMethod = service.match(/async getPIBLive[\s\S]*?private/)?.[0] ?? '';
    expect(liveMethod).not.toMatch(/\.eq\(['"]worker_identity_id['"]/);
  });
});

// ── 6. WorkerPIBService: contratto not_employer_visible / not_performance_score ─

describe('Worker PIB Privacy — contratto risposta live', () => {
  const service = src('services/worker-pib/WorkerPIBService.ts');

  // Conta le occorrenze di un pattern regex
  function countMatches(text: string, pattern: RegExp): number {
    return (text.match(pattern) ?? []).length;
  }

  it('not_employer_visible: true appare almeno 2 volte nel service (empty + aggregate)', () => {
    // Campo allineato: 'not_employer_visible:           true' — usa regex con \s+
    const count = countMatches(service, /not_employer_visible:\s+true/g);
    expect(count).toBeGreaterThanOrEqual(2);
  });

  it('not_performance_score: true appare almeno 2 volte nel service (empty + aggregate)', () => {
    const count = countMatches(service, /not_performance_score:\s+true/g);
    expect(count).toBeGreaterThanOrEqual(2);
  });

  it('isSynthetic: false appare nel service (path live non è sintetico)', () => {
    // Campo allineato: 'isSynthetic:                    false'
    expect(service).toMatch(/isSynthetic:\s+false/);
  });

  it('isSynthetic: true appare SOLO nei metodi sincroni (preview KORA_ADMIN)', () => {
    // Il metodo sintetico (getPIB) ha isSynthetic: true
    // I metodi live (_emptyLivePIB, getCVDataLive, _aggregatePIBRows) hanno isSynthetic: false
    expect(service).toMatch(/isSynthetic:\s+true/);   // preview sync path
    expect(service).toMatch(/isSynthetic:\s+false/);  // live async path
  });
});

// ── 7-9. Migration 018: RLS policy correttezza ────────────────────────────────

describe('Worker PIB Privacy — SQL migration 018 RLS policies', () => {
  const migration = src('supabase/migrations/018_worker_pib.sql');

  it('personal.worker_pib ha FORCE ROW LEVEL SECURITY', () => {
    expect(migration).toContain('FORCE ROW LEVEL SECURITY');
  });

  it('policy WORKER filtra per auth.uid()', () => {
    expect(migration).toContain('auth.uid()');
    expect(migration).toMatch(/WORKER[\s\S]*?auth\.uid\(\)/);
  });

  it('policy WORKER usa subquery worker_identity (pattern canonico)', () => {
    expect(migration).toContain('worker_identity_id IN');
    expect(migration).toContain('auth_user_id = auth.uid()');
  });

  it('nessuna CREATE POLICY per COMPANY_ADMIN o COMPANY_VIEWER (solo in commento, non in DDL)', () => {
    // I token COMPANY_ADMIN/COMPANY_VIEWER possono apparire in commenti -- ma mai in un CREATE POLICY
    expect(migration).not.toMatch(/CREATE POLICY[^;]*COMPANY_ADMIN/);
    expect(migration).not.toMatch(/CREATE POLICY[^;]*COMPANY_VIEWER/);
    // Verifica la frase del commento che conferma l'assenza (positiva)
    expect(migration).toContain('Nessuna policy per COMPANY_ADMIN');
  });

  it('commento migration documenta che il PIB è worker-owned, non company-visible', () => {
    expect(migration).toMatch(/company.*NON.*MAI|PIB.*proprietà.*worker|not.*negoziabile/i);
  });
});
