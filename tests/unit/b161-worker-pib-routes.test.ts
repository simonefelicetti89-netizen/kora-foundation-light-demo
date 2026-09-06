// tests/unit/b161-worker-pib-routes.test.ts
// B161 Fase 3 — audit strutturale delle tre route worker PIB.
//
// Pattern: source-level audit (read file → check invarianti strutturali).
// Nessun DB, nessun mock runtime: verifica solo che il codice sorgente
// soddisfi i contratti di privacy, auth e atomicità approvati.
//
// PRIOR HISTORY (accurate as of B161, preserved verbatim): "/api/worker/pib
// (GET — dual path WORKER / KORA_ADMIN)" and "/api/worker/impact-cv (GET —
// dual path WORKER / KORA_ADMIN)". B-WORKER "One Product / No Demo Runtime"
// correction (2026-09-06): the KORA_ADMIN preview path ("Path 2") on both
// routes is removed — verified fresh to have zero frontend callers once
// /my-kora's real-session probes (its sole caller) were retired
// (docs/KORA_OFFICIAL_IMPLEMENTATION_MASTER_PLAN_v2.1_PATCH_03.md). Both
// routes are now WORKER-only, single-path.
//
// Route coperte:
//   /api/worker/pib               (GET — WORKER only)
//   /api/worker/impact-cv         (GET — WORKER only)
//   /api/worker/pib/redistribute  (POST — WORKER only, atomicità esplicita)

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(process.cwd());

function read(rel: string): string {
  return readFileSync(resolve(ROOT, rel), 'utf-8');
}

function strip(src: string): string {
  return src.replace(/\/\/[^\n]*/g, '');
}

const ROUTES = {
  pib:          'app/api/worker/pib/route.ts',
  impactCv:     'app/api/worker/impact-cv/route.ts',
  redistribute: 'app/api/worker/pib/redistribute/route.ts',
} as const;

// ── 1. Auth gating ────────────────────────────────────────────────────────────

describe('B161 Route Auth — gating per percorso', () => {
  it('pib: usa requireWorkerUser e NON ha più un path requireKoraAdmin (Path 2 retired)', () => {
    const src = read(ROUTES.pib);
    expect(src).toContain('requireWorkerUser');
    expect(src).not.toContain('requireKoraAdmin');
  });

  it('impact-cv: usa requireWorkerUser e NON ha più un path requireKoraAdmin (Path 2 retired)', () => {
    const src = read(ROUTES.impactCv);
    expect(src).toContain('requireWorkerUser');
    expect(src).not.toContain('requireKoraAdmin');
  });

  it('redistribute: usa requireWorkerUser e NON ha un path KORA_ADMIN', () => {
    const src = read(ROUTES.redistribute);
    expect(src).toContain('requireWorkerUser');
    // Ridistribuzione è worker-owned: nessun path admin
    expect(src).not.toContain('requireKoraAdmin');
  });

  it('redistribute: risponde 401 se isKoraAuthError è true', () => {
    const src = read(ROUTES.redistribute);
    expect(src).toContain('isKoraAuthError');
    expect(src).toContain('401');
  });
});

// ── 2. Disciplina service client ──────────────────────────────────────────────
// Tutte le route live devono usare getSupabaseServerClient (RLS-gated),
// mai getSupabaseServiceClient (che bypassa RLS).

describe('B161 Route — client Supabase corretto (no service bypass)', () => {
  for (const [name, path] of Object.entries(ROUTES)) {
    it(`${name}: usa getSupabaseServerClient, non getSupabaseServiceClient`, () => {
      const stripped = strip(read(path));
      expect(stripped).toContain('getSupabaseServerClient');
      expect(stripped).not.toContain('getSupabaseServiceClient');
    });
  }
});

// ── 3. Invariante isolamento (nessun filtro workerId esplicito nel live path) ──
// L'isolamento è garantito dalla RLS su auth.uid().
// Le route NON filtrano per workerId come query/path param.

describe('B161 Route — isolamento via RLS, nessun filtro workerId esplicito nel live path', () => {
  it('pib: route non applica filtro .eq(worker_identity_id) direttamente', () => {
    const src = strip(read(ROUTES.pib));
    // Il path live non deve costruire un filtro worker_identity_id — lo fa la RLS
    expect(src).not.toMatch(/\.eq\(['"]worker_identity_id['"]/);
  });

  it('impact-cv: route non applica filtro .eq(worker_identity_id) direttamente', () => {
    const src = strip(read(ROUTES.impactCv));
    expect(src).not.toMatch(/\.eq\(['"]worker_identity_id['"]/);
  });
});

// ── 4. Wiring service corretto ────────────────────────────────────────────────

describe('B161 Route — wiring ai metodi service corretti', () => {
  it('pib live path chiama getPIBLive', () => {
    expect(read(ROUTES.pib)).toContain('getPIBLive');
  });

  it('pib NON chiama più getPIB sincrono (Path 2 retired)', () => {
    expect(read(ROUTES.pib)).not.toMatch(/\.getPIB\(persona/);
  });

  it('impact-cv live path chiama getCVDataLive', () => {
    expect(read(ROUTES.impactCv)).toContain('getCVDataLive');
  });

  it('impact-cv NON chiama più getCVData sincrono (Path 2 retired)', () => {
    expect(read(ROUTES.impactCv)).not.toMatch(/\.getCVData\(persona/);
  });
});

// ── 5. Atomicità ridistribuzione (test esplicito) ─────────────────────────────
// Decisione approvata: "Se l'INSERT fallisce, lo stato pre-esistente resta intatto."
// La route:
//   a) chiama applyPillarRedistribution (server-side puro) PRIMA della RPC
//   b) gestisce l'errore RPC con messaggio esplicito "originali sono intatti"
//   c) usa la RPC fn_redistribute_worker_pib (atomica, DELETE+INSERT transazionale)

describe('B161 Route redistribute — atomicità e non-distruttività (test esplicito)', () => {
  it('chiama applyPillarRedistribution server-side prima della RPC', () => {
    const src = read(ROUTES.redistribute);
    expect(src).toContain('applyPillarRedistribution');
    // La RPC deve apparire dopo il call a applyPillarRedistribution nel file
    const idxApply = src.indexOf('applyPillarRedistribution');
    const idxRpc   = src.indexOf('fn_redistribute_worker_pib');
    expect(idxApply).toBeGreaterThan(-1);
    expect(idxRpc).toBeGreaterThan(-1);
    expect(idxApply).toBeLessThan(idxRpc);
  });

  it('usa fn_redistribute_worker_pib come nome RPC (DELETE+INSERT atomico)', () => {
    expect(read(ROUTES.redistribute)).toContain('fn_redistribute_worker_pib');
  });

  it('risponde 500 con messaggio "originali sono intatti" se la RPC fallisce', () => {
    const src = read(ROUTES.redistribute);
    // Il messaggio di errore deve essere esplicito sull'integrità dei dati originali
    expect(src).toContain('originali sono intatti');
    expect(src).toContain('500');
  });

  it('risponde 422 (non 500) se la validazione server-side fallisce', () => {
    const src = read(ROUTES.redistribute);
    expect(src).toContain('422');
  });

  it('validationError causa ritorno 422 prima della chiamata RPC (codice non commenti)', () => {
    const src = strip(read(ROUTES.redistribute));
    const idxValidationErr = src.indexOf('validationError');
    const idxRpc           = src.indexOf('fn_redistribute_worker_pib');
    expect(idxValidationErr).toBeGreaterThan(-1);
    expect(idxRpc).toBeGreaterThan(-1);
    expect(idxValidationErr).toBeLessThan(idxRpc);
  });

  it('errore lettura righe base → 500, non 422 (distinto dalla validazione)', () => {
    const src = read(ROUTES.redistribute);
    expect(src).toContain('readErr');
  });
});

// ── 6. Validazione body redistribute ─────────────────────────────────────────

describe('B161 Route redistribute — validazione body rigorosa', () => {
  it('valida source_uef_record_id (mancante → 400)', () => {
    const src = read(ROUTES.redistribute);
    expect(src).toContain('source_uef_record_id');
    expect(src).toContain('400');
  });

  it('valida distribution (mancante/non-oggetto → 400)', () => {
    const src = read(ROUTES.redistribute);
    expect(src).toContain('distribution');
    expect(src).toContain('400');
  });

  it('risponde 404 se nessuna riga PIB trovata per source_uef_record_id', () => {
    const src = read(ROUTES.redistribute);
    expect(src).toContain('404');
  });
});

// ── 7. Privacy — workerIdentityId dal JWT, non dal client ────────────────────

describe('B161 Route redistribute — identità worker dal JWT, mai dal body', () => {
  it('workerId viene da workerResult (JWT), non da query param o body', () => {
    const src = strip(read(ROUTES.redistribute));
    // workerResult.workerId è la fonte dell'identità worker
    expect(src).toContain('workerResult.workerId');
    // Il body non deve contenere workerId come campo fidato per il filtro
    // (la RPC lo risolve via auth.uid() internamente)
  });

  it('la RPC riceve p_source_uef_record_id (non worker_identity_id) — risolto internamente', () => {
    const src = read(ROUTES.redistribute);
    expect(src).toContain('p_source_uef_record_id');
    // La RPC NON riceve worker_identity_id come parametro esterno
    expect(src).not.toContain('p_worker_identity_id');
  });
});

// ── 8. Integrazione WorkerIUComputationService ────────────────────────────────

describe('B161 WorkerIUComputationService — invarianti core (via source audit)', () => {
  const SERVICE_PATH = 'services/worker-iu-computation/WorkerIUComputationService.ts';

  it('service esporta computeBaseWorkerPIBRows (puro, no DB)', () => {
    expect(read(SERVICE_PATH)).toContain('export function computeBaseWorkerPIBRows');
  });

  it('service esporta validateRedistribution (puro, server-side)', () => {
    expect(read(SERVICE_PATH)).toContain('export function validateRedistribution');
  });

  it('service esporta applyPillarRedistribution (somma IU invariata)', () => {
    expect(read(SERVICE_PATH)).toContain('export function applyPillarRedistribution');
  });

  it('somma IU ridistribuita = IU base (invariante codificata)', () => {
    // Verifica che il service calcoli la somma base e la usi come invariante
    expect(read(SERVICE_PATH)).toContain('baseIU');
    expect(read(SERVICE_PATH)).toContain('baseIU * fraction');
  });

  it('colonne generative restano NULL (Tempo 2, nessuna logica attiva)', () => {
    const src = read(SERVICE_PATH);
    expect(src).toContain('generative_index:        null');
    expect(src).toContain('generative_circle1:      null');
    expect(src).toContain('generative_circle2:      null');
    expect(src).toContain('generative_circle3:      null');
  });

  it('company_sourced d\'ufficio deriva evidenceType=L3 (no attendance richiesta)', () => {
    const src = read(SERVICE_PATH);
    expect(src).toContain("if (sourceKind === 'company_sourced') return 'L3'");
  });

  it('trend cross-period è not_available nel live path (non hardcoded stable)', () => {
    const src = read('services/worker-pib/WorkerPIBService.ts');
    // Il trend cross-period non è disponibile in Foundation Light — mai 'stable' fittizio.
    // Il campo è impostato a 'not_available' finché non esistono dati storici multi-periodo.
    expect(src).toContain('not_available');
    expect(src).toContain('Cross-period trend non disponibile in Foundation Light');
    // Il vecchio STUB hardcoded 'stable' non deve più essere nel path live
    expect(src).not.toMatch(/_aggregatePIBRows[\s\S]{0,2000}trend:\s*'stable' as const/);
  });
});

// ── 9. Invarianti privacy WorkerPIBService live ───────────────────────────────

describe('B161 WorkerPIBService — metodi live non espongono dati employer-visibili', () => {
  const SERVICE_PATH = 'services/worker-pib/WorkerPIBService.ts';

  it('_aggregatePIBRows imposta not_employer_visible: true', () => {
    expect(read(SERVICE_PATH)).toContain('not_employer_visible:           true');
  });

  it('_aggregatePIBRows imposta not_performance_score: true', () => {
    expect(read(SERVICE_PATH)).toContain('not_performance_score:          true');
  });

  it('_emptyLivePIB imposta isSynthetic: false (dati live, non sintetici)', () => {
    const src = read(SERVICE_PATH);
    // La funzione _emptyLivePIB deve avere isSynthetic: false
    expect(src).toContain('_emptyLivePIB');
    expect(src).toContain('isSynthetic:      false');
  });

  it('getCVDataLive filtra solo is_exportable=true (Nodo A)', () => {
    expect(read(SERVICE_PATH)).toContain("eq('is_exportable', true)");
  });

  // PRIOR HISTORY (accurate as of B161, preserved verbatim): "metodi
  // sincroni (getPIB, getCVData) restano isSynthetic: true." B-WORKER "One
  // Product / No Demo Runtime" correction (2026-09-06): getPIB/getCVData are
  // removed entirely (zero real callers once their sole callers, the
  // route Path-2 branches above, were retired).
  it('getPIB/getCVData no longer exist on WorkerPIBService', () => {
    const src = read(SERVICE_PATH);
    expect(src).not.toContain('getPIB(personaId');
    expect(src).not.toContain('getCVData(personaId');
  });
});
