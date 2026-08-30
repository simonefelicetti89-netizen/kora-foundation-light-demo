/**
 * Tenant Isolation — API routes non accettano tenantId da client non attendibile (P1.3)
 *
 * Regole canoniche:
 *   COMPANY routes: tenantId SEMPRE da auth.tenantId (JWT app_metadata). Mai da query/body.
 *   ADMIN routes:   tenantId può venire da query/body (KORA_ADMIN gestisce N tenant),
 *                   ma deve essere validato con un DB lookup o service call prima dell'uso.
 *   WORKER routes:  tenantId da JWT, mai da query/body.
 *   COMMONS routes: KORA_ADMIN può filtrare per tenant da query; company/worker usano sessione.
 *
 * Meccanismi di isolamento approvati (company):
 *   1. const { tenantId } = requireCompanyUser result  →  .eq('tenant_id', tenantId)
 *   2. SQL SECURITY DEFINER via kora.tenant_id() nel DB  →  fn_company_worker_status, fn_company_activation_summary
 *   3. View con WHERE tenant_id = kora.tenant_id()  →  v_company_uef_eligibility_summary, v_company_uploaded_record_safe
 *   4. Service call che delega a SECURITY DEFINER RPC  →  getAggregateForPromoter, getContributionLive
 *
 * Admin whitelisted patterns (KORA_ADMIN cross-tenant intenzionale):
 *   - decision-pack/pdf e preview: chiamano fetchPdfData() che fa analytics.from('tenant') DB lookup
 *   - data-intake/preview: chiama fetchPdfData() per lo snapshot DB; per il resto legge
 *     lib/live/op001-synthetic-records (deterministico, nessun DB). KORA_ADMIN only.
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

function label(relPath: string): string {
  return relPath.replace('app/api/', '');
}

// ── 1. Company routes: tenantId non da searchParams ───────────────────────────

describe('Tenant Isolation — company routes: tenantId NON da searchParams', () => {
  for (const route of COMPANY_ROUTES) {
    it(`${label(route)}`, () => {
      const codeNoComments = stripComments(src(route));
      expect(codeNoComments).not.toMatch(/searchParams\.get\(['"`]tenantId['"`]\)/);
      expect(codeNoComments).not.toMatch(/searchParams\.get\(['"`]tenant_id['"`]\)/);
      expect(codeNoComments).not.toMatch(/url\.searchParams\.get\(['"`]tenantId['"`]\)/);
      expect(codeNoComments).not.toMatch(/url\.searchParams\.get\(['"`]tenant_id['"`]\)/);
    });
  }
});

// ── 2. Company routes: tenantId non da body (request.json) ───────────────────

describe('Tenant Isolation — company routes: tenantId NON da body JSON', () => {
  const BODY_ROUTES = COMPANY_ROUTES.filter((r) => {
    const code = src(r);
    return code.includes('request.json()') || code.includes('request.formData()');
  });

  for (const route of BODY_ROUTES) {
    it(`${label(route)} non usa tenantId dal body`, () => {
      const codeNoComments = stripComments(src(route));
      expect(codeNoComments).not.toMatch(/body\s*\.\s*tenantId/);
      expect(codeNoComments).not.toMatch(/body\s*\[\s*['"`]tenantId['"`]\s*\]/);
      expect(codeNoComments).not.toMatch(/body\s*\[\s*['"`]tenant_id['"`]\s*\]/);
    });
  }

  it('ci sono route company con body (sanity check che il filtro funzioni)', () => {
    expect(BODY_ROUTES.length).toBeGreaterThan(0);
  });
});

// ── 3. Company routes: usano un meccanismo di tenant isolation approvato ──────

describe('Tenant Isolation — company routes: tenant isolation dalla sessione', () => {
  // Meccanismi approvati:
  //   A) destructuring tenantId da requireCompanyUser result
  //   B) SQL SECURITY DEFINER (fn_company_worker_status, fn_company_activation_summary)
  //   C) View con WHERE tenant_id = kora.tenant_id() (v_company_uef_eligibility_summary, v_company_uploaded_record_safe)
  //   D) Service che delega a SECURITY DEFINER (getAggregateForPromoter, getContributionLive)

  for (const route of COMPANY_ROUTES) {
    it(`${label(route)}`, () => {
      const code = src(route);
      const hasTenantIsolation =
        // A: destructuring da requireCompanyUser result
        /\{\s*[^}]*tenantId[^}]*\}\s*=\s*(authResult|auth|companyAuth|adminResult)/.test(code) ||
        // A2: property access diretto su auth result (auth.tenantId)
        /\bauth\.tenantId\b/.test(code) ||
        // B: SECURITY DEFINER function
        code.includes('fn_company_worker_status') ||
        code.includes('fn_company_activation_summary') ||
        // C: View con WHERE tenant_id = kora.tenant_id() integrato
        code.includes('v_company_uef_eligibility_summary') ||
        code.includes('v_company_uploaded_record_safe') ||
        // D: Service SECURITY DEFINER delegate
        code.includes('getAggregateForPromoter') ||
        code.includes('getContributionLive');

      expect(hasTenantIsolation, `${route}: nessun meccanismo tenant isolation approvato`).toBe(true);
    });
  }
});

// ── 4. Company routes: query SQL filtra per tenant dalla sessione ─────────────

describe('Tenant Isolation — company routes: filtro tenant_id nelle query', () => {
  for (const route of COMPANY_ROUTES) {
    it(`${label(route)}`, () => {
      const code = src(route);
      const codeNC = stripComments(code);

      const hasTenantFilter =
        // .eq('tenant_id', tenantId) — tenantId da sessione
        /\.eq\(['"`]tenant_id['"`]\s*,\s*(?:auth\.tenantId|tenantId|authResult\.tenantId)\)/.test(codeNC) ||
        // .eq('id', tenantId) su tabella tenant
        /\.eq\(['"`]id['"`]\s*,\s*(?:auth\.tenantId|tenantId)\)/.test(codeNC) ||
        // SECURITY DEFINER: tenant isolation nel DB
        code.includes('fn_company_worker_status') ||
        code.includes('fn_company_activation_summary') ||
        code.includes('v_company_uef_eligibility_summary') ||
        // View sicura con kora.tenant_id() integrato
        code.includes('v_company_uploaded_record_safe') ||
        // Service SECURITY DEFINER delegate
        code.includes('getAggregateForPromoter') ||
        // Service con tenantId da auth
        /tenantId:\s*auth\.tenantId/.test(codeNC) ||
        /getContributionLive/.test(code) ||
        // CC-018/B-TRUTH: WorkerPillarAdoptionService.getCompanyPillarAdoption(db, tenantId)
        // — tenantId is the same session-sourced value destructured above (see check
        // #3, pattern A); the .eq('tenant_id', tenantId) filter lives inside the
        // service, not the route (services/worker-pillar-adoption/WorkerPillarAdoptionService.ts).
        /getCompanyPillarAdoption/.test(code);

      expect(hasTenantFilter, `${route}: nessun filtro tenant_id trovato`).toBe(true);
    });
  }
});

// ── 5. Company routes: nessuna cross-company visibility ───────────────────────

describe('Tenant Isolation — company routes: nessuna query cross-tenant', () => {
  it('nessuna company route usa .in() su lista di tenant_ids (pattern admin)', () => {
    for (const route of COMPANY_ROUTES) {
      const codeNoComments = stripComments(src(route));
      expect(codeNoComments, `${route} non deve usare .in su tenant_id`).not.toMatch(/\.in\(['"`]tenant_id['"`]/);
    }
  });

  it('nessuna company route legge da tabella "tenant" senza filtro .eq("id", tenantId)', () => {
    for (const route of COMPANY_ROUTES) {
      const codeNC = stripComments(src(route));
      if (!codeNC.includes("from('tenant')") && !codeNC.includes('from("tenant")')) continue;
      expect(codeNC).toMatch(/\.eq\(['"`]id['"`]\s*,\s*tenantId\)/);
    }
  });
});

// ── 6. Admin routes con tenantId da query: hanno DB lookup o service call ─────

describe('Tenant Isolation — admin routes: tenantId da query validato prima dell\'uso', () => {
  // Admin routes con tenantId/tenantCode da query param
  const ADMIN_ROUTES_WITH_TENANT_PARAM = ADMIN_ROUTES.filter((r) => {
    const code = stripComments(src(r));
    return code.includes("searchParams.get('tenantId')") ||
           code.includes('searchParams.get("tenantId")') ||
           code.includes("searchParams.get('tenantCode')") ||
           code.includes('searchParams.get("tenantCode")');
  });

  // Whitelist: questi admin route delegano a fetchPdfData() che fa analytics.from('tenant') DB lookup
  const FETCH_PDF_DELEGATE = new Set([
    'app/api/admin/decision-pack/pdf/route.ts',
    'app/api/admin/decision-pack/preview/route.ts',
    'app/api/admin/data-intake/preview/route.ts',
  ]);

  it('esistono admin routes con tenantId/tenantCode da query (sanity check)', () => {
    expect(ADMIN_ROUTES_WITH_TENANT_PARAM.length).toBeGreaterThan(0);
  });

  for (const route of ADMIN_ROUTES_WITH_TENANT_PARAM) {
    it(`${label(route)}: tiene validato il tenant (DB lookup o service delegate)`, () => {
      const code = stripComments(src(route));

      if (FETCH_PDF_DELEGATE.has(route)) {
        // Whitelist: delega a fetchPdfData() che fa DB lookup su analytics.tenant
        expect(code).toContain('fetchPdfData');
        return;
      }

      const hasValidation =
        code.includes("from('tenant')") ||
        code.includes('from("tenant")') ||
        code.includes('queryImpactUnitPeriods') ||
        code.includes('source_batch');

      expect(hasValidation, `${route}: nessun DB lookup o service delegate per tenantId da query`).toBe(true);
    });
  }
});

// ── 7. Admin routes con tenantId da query: requireKoraAdmin prima del param ───

describe('Tenant Isolation — admin routes con query tenantId: KORA_ADMIN guard', () => {
  const ADMIN_ROUTES_WITH_TENANT_PARAM = ADMIN_ROUTES.filter((r) => {
    const code = stripComments(src(r));
    return code.includes("searchParams.get('tenantId')") ||
           code.includes('searchParams.get("tenantId")') ||
           code.includes("searchParams.get('tenantCode')") ||
           code.includes('searchParams.get("tenantCode")');
  });

  for (const route of ADMIN_ROUTES_WITH_TENANT_PARAM) {
    it(`${label(route)}: requireKoraAdmin prima di searchParams.get(tenantId/tenantCode)`, () => {
      const code = src(route);
      expect(code).toContain('requireKoraAdmin');
      const adminIdx = code.indexOf('requireKoraAdmin');
      const paramIdx = Math.min(
        code.includes("searchParams.get('tenantId')")   ? code.indexOf("searchParams.get('tenantId')")   : Infinity,
        code.includes("searchParams.get('tenantCode')") ? code.indexOf("searchParams.get('tenantCode')") : Infinity,
      );
      expect(adminIdx, 'requireKoraAdmin deve precedere searchParams.get(tenantId/tenantCode)').toBeLessThan(paramIdx);
    });
  }
});

// ── 8. Worker routes: tenantId da JWT, non da searchParams ───────────────────

describe('Tenant Isolation — worker routes: tenantId da JWT', () => {
  const WORKER_ROUTES = collectRoutes(resolve(root, 'app/api/worker'));

  it('nessuna worker route estrae tenantId da searchParams', () => {
    for (const route of WORKER_ROUTES) {
      const codeNoComments = stripComments(src(route));
      expect(codeNoComments, `${route}`).not.toMatch(/searchParams\.get\(['"`]tenantId['"`]\)/);
      expect(codeNoComments, `${route}`).not.toMatch(/searchParams\.get\(['"`]tenant_id['"`]\)/);
    }
  });

  it('worker routes hanno almeno un auth guard (requireWorkerUser o requireKoraAdmin)', () => {
    for (const route of WORKER_ROUTES) {
      const code = src(route);
      const hasGuard = code.includes('requireWorkerUser') || code.includes('requireKoraAdmin');
      expect(hasGuard, `${route}: nessun auth guard`).toBe(true);
    }
  });
});

// ── 9. Commons/posts: pattern multi-role di tenant isolation ─────────────────

describe('Tenant Isolation — commons/posts: contratto tenant per ruolo', () => {
  const code = src('app/api/commons/posts/route.ts');

  it('KORA_ADMIN usa url.searchParams.get per tenant_id (cross-tenant admin filter)', () => {
    // KORA_ADMIN può filtrare per tenant opzionalmente — funzionalità admin intenzionale
    expect(code).toMatch(/searchParams\.get\(['"`]tenant_id['"`]\)/);
  });

  it('COMPANY_ADMIN usa tenantId dalla sessione JWT (destructuring da companyAuth)', () => {
    // const { tenantId } = companyAuth
    expect(code).toMatch(/\{\s*tenantId\s*\}\s*=\s*companyAuth/);
  });

  it('WORKER usa tenantId dalla sessione JWT (destructuring da workerAuth)', () => {
    // const { tenantId } = workerAuth
    expect(code).toMatch(/\{\s*tenantId\s*\}\s*=\s*workerAuth/);
  });

  it('KORA_ADMIN block non influenza il tenantId di COMPANY_ADMIN/WORKER', () => {
    // I tre path sono separati: if (!isKoraAuthError(adminAuth)) return early
    // Il searchParams.get('tenant_id') appare SOLO nel block KORA_ADMIN
    // Usa la CHIAMATA requireCompanyUser(request) (non l'import) come delimitatore del blocco KORA_ADMIN
    const koraAdminBlockEnd = code.indexOf('requireCompanyUser(request)');
    const tenantParamIdx    = code.indexOf("searchParams.get('tenant_id')");
    expect(tenantParamIdx).toBeGreaterThan(0);
    expect(koraAdminBlockEnd).toBeGreaterThan(0);
    // Il param tenant_id da searchParams deve essere PRIMA della chiamata requireCompanyUser(request)
    expect(tenantParamIdx).toBeLessThan(koraAdminBlockEnd);
  });
});

// ── 10. Sanity check: count delle route coperte ───────────────────────────────

describe('Tenant Isolation — copertura routes', () => {
  it('copre tutte le 18 company routes', () => {
    // P1 sprint added: /api/company/data-submissions/history, /api/company/initiatives/explainability
    // CC-018/B-TRUTH added: /api/company/pillar-adoption (seed group #1)
    expect(COMPANY_ROUTES.length).toBe(18);
  });

  it('copre tutte le admin routes (baseline: ≥45)', () => {
    // Baseline stabilita a 45 durante la review del 2026-06-20; aggiornare se aumenta.
    expect(ADMIN_ROUTES.length).toBeGreaterThanOrEqual(45);
  });

  it('conta le admin routes con tenantId da query: baseline ≥3', () => {
    const count = ADMIN_ROUTES.filter((r) => {
      const code = stripComments(src(r));
      return code.includes("searchParams.get('tenantId')") ||
             code.includes('searchParams.get("tenantId")') ||
             code.includes("searchParams.get('tenantCode')") ||
             code.includes('searchParams.get("tenantCode")');
    }).length;
    expect(count).toBeGreaterThanOrEqual(3);
  });
});
