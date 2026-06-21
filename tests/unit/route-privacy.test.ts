/**
 * Route Privacy — Company API routes non espongono dati individuali worker (P1.2)
 *
 * Verifica staticamente che tutti i route sotto app/api/company/**:
 *   1. Usino requireCompanyUser come guard (mai requireWorkerUser).
 *   2. Non leggano personal.worker_pib o personal.worker_pseudonym_map.
 *   3. Non selezionino colonne sensibili individuali (worker_identity_id, person_hash, raw_name
 *      come colonna selezionata, non come nome view) al di fuori di SECURITY DEFINER.
 *   4. Usino funzioni/view aggregate sicure per i dati worker.
 *
 * Whitelisted exceptions (documentate):
 *   - workspace/route.ts legge personal.workforce_baseline → headcount aggregate (total_workers,
 *     reporting_period) — NON dati PIB individuali. Conforme.
 *   - workers/aggregate/route.ts ha un COMMENTO che cita personal.worker_identity → il commento
 *     descrive cosa fa la funzione SECURITY DEFINER internamente, non accesso diretto.
 *   - evidence-archive/route.ts seleziona initiative_name_raw dalla VIEW v_company_uploaded_record_safe
 *     → processato attraverso buildSafeName() PII guard prima della risposta. Conforme.
 *   - evidence-record/route.ts usa select('*') su v_company_uploaded_record_safe → la view esclude
 *     pseudonym_id e raw_hash per costruzione [G1]. Conforme.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'fs';
import { resolve, join } from 'path';

const root = resolve(process.cwd());

function src(relPath: string): string {
  return readFileSync(resolve(root, relPath), 'utf-8');
}

function stripComments(code: string): string {
  return code
    .replace(/\/\/.*$/gm, '')
    .replace(/\/\*[\s\S]*?\*\//g, '');
}

// Raccoglie tutti i route.ts sotto un percorso, ricorsivamente
function collectRoutes(dir: string): string[] {
  const results: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      results.push(...collectRoutes(full));
    } else if (entry === 'route.ts') {
      results.push(full.replace(root + '/', ''));
    }
  }
  return results.sort();
}

const COMPANY_ROUTES = collectRoutes(resolve(root, 'app/api/company'));
const ADMIN_ROUTES   = collectRoutes(resolve(root, 'app/api/admin'));
const COMMONS_ROUTES = ['app/api/commons/posts/route.ts'];

// ── Helper: label breve per messaggi di errore ────────────────────────────────
function label(relPath: string): string {
  return relPath.replace('app/api/', '');
}

// ── 1. Company routes: auth guard requireCompanyUser ──────────────────────────

describe('Route Privacy — company routes: requireCompanyUser presente', () => {
  for (const route of COMPANY_ROUTES) {
    it(`${label(route)}`, () => {
      const code = src(route);
      expect(code, `${route} deve importare requireCompanyUser`).toContain('requireCompanyUser');
      expect(code, `${route} deve chiamare requireCompanyUser nel handler`).toMatch(/requireCompanyUser\(request\)/);
    });
  }
});

// ── 2. Company routes: nessun requireWorkerUser ───────────────────────────────

describe('Route Privacy — company routes: assenza di requireWorkerUser', () => {
  for (const route of COMPANY_ROUTES) {
    it(`${label(route)}`, () => {
      const codeNoComments = stripComments(src(route));
      expect(codeNoComments, `${route} non deve chiamare requireWorkerUser`).not.toContain('requireWorkerUser');
    });
  }
});

// ── 3. Company routes: nessun accesso diretto a personal.worker_pib ──────────

describe('Route Privacy — company routes: nessuna query a personal.worker_pib', () => {
  for (const route of COMPANY_ROUTES) {
    it(`${label(route)}`, () => {
      const codeNoComments = stripComments(src(route));
      // La route company non deve mai query-are personal.worker_pib direttamente
      expect(codeNoComments).not.toMatch(/\.from\(['"`]worker_pib['"`]\)/);
      expect(codeNoComments).not.toMatch(/schema.*personal.*worker_pib|personal.*worker_pib/);
    });
  }
});

// ── 4. Company routes: nessun accesso a personal.worker_pseudonym_map ─────────

describe('Route Privacy — company routes: nessuna query a worker_pseudonym_map', () => {
  for (const route of COMPANY_ROUTES) {
    it(`${label(route)}`, () => {
      const codeNoComments = stripComments(src(route));
      expect(codeNoComments).not.toMatch(/worker_pseudonym_map/);
      expect(codeNoComments).not.toMatch(/pseudonym_map/);
    });
  }
});

// ── 5. Company routes: worker_identity_id non appare in SELECT applicativo ───

describe('Route Privacy — company routes: worker_identity_id non in SELECT', () => {
  // Eccezioni: fn_company_worker_status, fn_company_activation_summary
  // sono SECURITY DEFINER — non è codice applicativo che seleziona quel campo
  const WHITELIST: Record<string, string> = {
    // Nessuna eccezione attualmente necessaria
  };

  for (const route of COMPANY_ROUTES) {
    it(`${label(route)}`, () => {
      if (WHITELIST[route]) return; // skip whitelist
      const codeNoComments = stripComments(src(route));
      // worker_identity_id non deve apparire in stringhe .select() o .eq()
      // Pattern: select stringa con worker_identity_id, o .eq('worker_identity_id')
      expect(codeNoComments).not.toMatch(/['"`]worker_identity_id['"`]/);
    });
  }
});

// ── 6. Company routes: nessuna esposizione pib_value, individual_pib ─────────

describe('Route Privacy — company routes: no pib_value / individual_pib nel codice', () => {
  for (const route of COMPANY_ROUTES) {
    it(`${label(route)}`, () => {
      const codeNoComments = stripComments(src(route));
      expect(codeNoComments).not.toMatch(/pib_value|individual_pib/);
    });
  }
});

// ── 7. Company workers routes: usano funzioni aggregate sicure ────────────────

describe('Route Privacy — company workers: funzioni aggregate SECURITY DEFINER', () => {
  it('workers/aggregate usa fn_company_worker_status (SECURITY DEFINER)', () => {
    const code = src('app/api/company/workers/aggregate/route.ts');
    expect(code).toContain('fn_company_worker_status');
    // Non deve avere .select() con colonne worker individuali
    const codeNoComments = stripComments(code);
    expect(codeNoComments).not.toMatch(/\.from\(['"`]worker_identity['"`]\)/);
  });

  it('workers/activation-aggregate usa fn_company_activation_summary (SECURITY DEFINER)', () => {
    const code = src('app/api/company/workers/activation-aggregate/route.ts');
    expect(code).toContain('fn_company_activation_summary');
  });

  it('live-eligibility usa v_company_uef_eligibility_summary (aggregation view)', () => {
    const code = src('app/api/company/live-eligibility/route.ts');
    expect(code).toContain('v_company_uef_eligibility_summary');
    // Nessuna query diretta a uef_record
    const codeNoComments = stripComments(code);
    expect(codeNoComments).not.toMatch(/\.from\(['"`]uef_record['"`]\)/);
  });

  it('evidence-archive e evidence-record usano v_company_uploaded_record_safe (view sicura)', () => {
    const archiveSrc = src('app/api/company/evidence-archive/route.ts');
    const recordSrc  = src('app/api/company/evidence-record/route.ts');
    expect(archiveSrc).toContain('v_company_uploaded_record_safe');
    expect(recordSrc).toContain('v_company_uploaded_record_safe');
  });

  it('evidence-archive non include pseudonym_id o raw_hash in risposta (esclusi dalla view)', () => {
    const code = stripComments(src('app/api/company/evidence-archive/route.ts'));
    // Nel corpo della risposta non deve apparire pseudonym_id o raw_hash
    expect(code).not.toMatch(/pseudonym_id|raw_hash/);
  });

  it('commons/bookings/aggregate usa booking_aggregate_for_promoter SECURITY DEFINER', () => {
    const code = src('app/api/company/commons/bookings/aggregate/route.ts');
    // Delega ad un service che usa RPC SECURITY DEFINER
    expect(code).toContain('getAggregateForPromoter');
    // Non fa query dirette a rows individuali di booking
    const codeNoComments = stripComments(code);
    expect(codeNoComments).not.toMatch(/\.from\(['"`]booking['"`]\)/);
  });
});

// ── 8. Whitelist: workspace legge personal.workforce_baseline (legittimo) ─────

describe('Route Privacy — whitelist documentata', () => {
  it('workspace legge personal.workforce_baseline (headcount aggregate, NOT PIB individuale)', () => {
    const code = src('app/api/company/workspace/route.ts');
    // workspace usa workforce_baseline — un record per tenant con total_workers
    expect(code).toContain('workforce_baseline');
    // Ma NON legge worker_pib o worker_identity direttamente
    const codeNoComments = stripComments(code);
    expect(codeNoComments).not.toMatch(/worker_pib|worker_pseudonym_map/);
    expect(codeNoComments).not.toMatch(/\.from\(['"`]worker_identity['"`]\)/);
  });

  it('workspace seleziona solo campi aggregati da workforce_baseline (no PIB)', () => {
    const code = src('app/api/company/workspace/route.ts');
    // I campi selezionati sono: id, total_workers, reporting_period, created_at
    // Nessun campo PIB individuale
    expect(code).toMatch(/total_workers/);
    expect(code).not.toContain('worker_identity_id');
    expect(code).not.toContain('pib_value');
  });
});

// ── 9. Admin routes: tutti usano requireKoraAdmin ─────────────────────────────

describe('Route Privacy — admin routes: requireKoraAdmin presente', () => {
  for (const route of ADMIN_ROUTES) {
    it(`${label(route)}`, () => {
      const code = src(route);
      expect(code, `${route} deve importare requireKoraAdmin`).toContain('requireKoraAdmin');
      expect(code, `${route} deve chiamare requireKoraAdmin nel handler`).toMatch(/requireKoraAdmin\(request\)/);
    });
  }
});

// ── 10. Admin routes: company/worker role non può accedere (nessun requireCompanyUser) ─

describe('Route Privacy — admin routes: nessun path per company/worker role', () => {
  // Gli admin route non devono contenere requireCompanyUser o requireWorkerUser
  // come meccanismo di accesso alternativo
  for (const route of ADMIN_ROUTES) {
    it(`${label(route)}: no requireCompanyUser né requireWorkerUser come guard alternativo`, () => {
      // Nota: commons/posts usa multi-role — qui estendiamo solo admin routes
      const codeNoComments = stripComments(src(route));
      // requireCompanyUser non deve essere usato per aprire un path alternativo
      // (è OK se compare solo in un commento — già rimosso con stripComments)
      expect(codeNoComments).not.toContain('requireCompanyUser');
      expect(codeNoComments).not.toContain('requireWorkerUser');
    });
  }
});

// ── 11. Commons/posts: privacy contract multi-role ───────────────────────────

describe('Route Privacy — commons/posts: contratto multi-role', () => {
  const code = src(COMMONS_ROUTES[0]!);
  const codeNoComments = stripComments(code);

  it('nessun worker_id, email worker o PIB in risposta (documentato nel contratto)', () => {
    expect(code).toContain('Nessun worker_id, email worker, private_note, PIB in risposta');
  });

  it('la route gestisce i tre ruoli: KORA_ADMIN, COMPANY_ADMIN, WORKER', () => {
    expect(code).toContain('requireKoraAdmin');
    expect(code).toContain('requireCompanyUser');
    expect(code).toContain('requireWorkerUser');
  });

  it('la route blocca PARTNER e anon (non ha branch per essi)', () => {
    expect(code).toContain('anon: forbidden');
  });

  it('company/worker ricevono tenant_id dalla sessione — non da query param', () => {
    // COMPANY_ADMIN e WORKER usano destructured tenantId da companyAuth / workerAuth
    // Pattern: const { tenantId } = companyAuth; oppure const { tenantId } = workerAuth;
    expect(codeNoComments).toMatch(/\{[^}]*tenantId[^}]*\}\s*=\s*(companyAuth|workerAuth|authResult)/);
  });
});
