// tests/unit/security-origin-guard-03-routes.test.ts
// SECURITY-ORIGIN-GUARD-03 — route-level integration audit.
//
// Pattern: source-level structural audit (read file → check invariants),
// consistent with the existing route-test convention in this codebase
// (see tests/unit/b161-worker-pib-routes.test.ts) rather than invoking
// handlers with constructed Request objects — no test in this repo does
// the latter for app/api routes today.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(process.cwd());

function read(rel: string): string {
  return readFileSync(resolve(ROOT, rel), 'utf-8');
}

// Extracts the source of one exported handler function, from its
// `export async function METHOD(` up to the next top-level `export` (or EOF).
function extractHandler(src: string, method: string): string {
  const start = src.indexOf(`export async function ${method}(`);
  if (start === -1) throw new Error(`handler ${method} not found`);
  const rest = src.slice(start + 1);
  const nextExport = rest.search(/\nexport /);
  return nextExport === -1 ? src.slice(start) : src.slice(start, start + 1 + nextExport);
}

// Representative sample across every auth pattern found in the sprint's
// route inventory: KORA_ADMIN (single + dual method), COMPANY_ADMIN,
// WORKER, multi-role (commons/posts), direct-cookie (no require*User
// wrapper — auth/logout), and the dynamic [token] KORA Link route.
const REPRESENTATIVE_ROUTES: Array<{ path: string; methods: string[] }> = [
  { path: 'app/api/admin/company-users/route.ts', methods: ['POST', 'PATCH'] },
  { path: 'app/api/worker/pib/redistribute/route.ts', methods: ['POST'] },
  { path: 'app/api/company/data-submissions/route.ts', methods: ['POST'] },
  { path: 'app/api/commons/posts/route.ts', methods: ['POST'] },
  { path: 'app/api/commons/posts/[id]/route.ts', methods: ['PATCH'] },
  { path: 'app/api/auth/logout/route.ts', methods: ['POST'] },
  { path: 'app/api/worker/commons/bookings/[id]/route.ts', methods: ['DELETE'] },
  { path: 'app/link/[token]/activate/route.ts', methods: ['POST'] },
];

describe('SECURITY-ORIGIN-GUARD-03 — import presente per ogni route mutante rappresentativa', () => {
  for (const { path } of REPRESENTATIVE_ROUTES) {
    it(`${path}: importa assertSameOrigin da @/lib/security/origin`, () => {
      const src = read(path);
      expect(src).toContain("import { assertSameOrigin } from '@/lib/security/origin';");
    });
  }
});

describe('SECURITY-ORIGIN-GUARD-03 — guard eseguita per ciascun metodo mutante, prima della business logic', () => {
  for (const { path, methods } of REPRESENTATIVE_ROUTES) {
    for (const method of methods) {
      it(`${path} [${method}]: chiama assertSameOrigin come prima istruzione del body`, () => {
        const src = read(path);
        const handlerSrc = extractHandler(src, method);

        const guardIdx = handlerSrc.indexOf('assertSameOrigin(request)');
        expect(guardIdx).toBeGreaterThan(-1);

        // Deve precedere qualunque chiamata di autenticazione/sessione o
        // accesso al DB già esistente nel body (require*User, getCurrent*User,
        // getSupabaseServerClient/ServiceClient, supabase.auth.getUser()).
        const authCallPattern = /(requireKoraAdmin|requireCompanyUser|requireWorkerUser|requirePartnerUser|getCurrentWorkerUser|getSupabaseServerClient|getSupabaseServiceClient|auth\.getUser)\(/g;
        let match: RegExpExecArray | null;
        while ((match = authCallPattern.exec(handlerSrc)) !== null) {
          // Skip the guard's own declaration line/import references.
          if (match.index <= guardIdx) continue;
          expect(match.index).toBeGreaterThan(guardIdx);
        }

        // La guard clause restituisce immediatamente in caso di rifiuto —
        // verifica il pattern "if (originGuard) return originGuard;" accanto
        // alla dichiarazione, non solo la chiamata isolata.
        expect(handlerSrc).toMatch(/const originGuard = assertSameOrigin\(request\);\s*\n\s*if \(originGuard\) return originGuard;/);
      });
    }
  }
});

describe('SECURITY-ORIGIN-GUARD-03 — nessuna doppia protezione e GET non toccato', () => {
  it('company-users: il GET (sola lettura) non chiama assertSameOrigin', () => {
    const src = read('app/api/admin/company-users/route.ts');
    const getHandler = extractHandler(src, 'GET');
    expect(getHandler).not.toContain('assertSameOrigin');
  });

  it('company-users: POST e PATCH hanno esattamente una guard call ciascuno (nessuna doppia protezione)', () => {
    const src = read('app/api/admin/company-users/route.ts');
    for (const method of ['POST', 'PATCH']) {
      const handlerSrc = extractHandler(src, method);
      const occurrences = handlerSrc.match(/assertSameOrigin\(request\)/g) ?? [];
      expect(occurrences.length).toBe(1);
    }
  });

  it('worker/pib/redistribute: auth esistente (requireWorkerUser, isKoraAuthError, 401) resta invariata', () => {
    const src = read('app/api/worker/pib/redistribute/route.ts');
    expect(src).toContain('requireWorkerUser');
    expect(src).toContain('isKoraAuthError');
  });
});

describe('SECURITY-ORIGIN-GUARD-03 — inventario completo: ogni route mutante nel repo ha la guard', () => {
  it('tutte le 45 route mutanti individuate nello sprint importano ed eseguono assertSameOrigin', () => {
    const routes: Array<{ path: string; methods: string[] }> = [
      { path: 'app/api/admin/commons/bookings/[id]/route.ts', methods: ['PATCH'] },
      { path: 'app/api/admin/companies/provision/route.ts', methods: ['POST'] },
      { path: 'app/api/admin/company-submissions/[id]/review/route.ts', methods: ['PATCH'] },
      { path: 'app/api/admin/company-users/route.ts', methods: ['PATCH', 'POST'] },
      { path: 'app/api/admin/data-intake/accept/route.ts', methods: ['POST'] },
      { path: 'app/api/admin/data-intake/upload-preview/route.ts', methods: ['POST'] },
      { path: 'app/api/admin/data-lifecycle/archive/route.ts', methods: ['POST'] },
      { path: 'app/api/admin/data-lifecycle/delete/route.ts', methods: ['POST'] },
      { path: 'app/api/admin/decision-pack/status/route.ts', methods: ['POST'] },
      { path: 'app/api/admin/demo/provision-viewer/route.ts', methods: ['POST'] },
      { path: 'app/api/admin/evidence-attachments/lifecycle/route.ts', methods: ['POST'] },
      { path: 'app/api/admin/evidence-attachments/preview/route.ts', methods: ['POST'] },
      { path: 'app/api/admin/evidence-attachments/register/route.ts', methods: ['POST'] },
      { path: 'app/api/admin/evidence-attachments/signed-url/route.ts', methods: ['POST'] },
      { path: 'app/api/admin/live-company/route.ts', methods: ['POST'] },
      { path: 'app/api/admin/operator-flow/route.ts', methods: ['POST'] },
      { path: 'app/api/admin/partners/[id]/invite-user/route.ts', methods: ['POST'] },
      { path: 'app/api/admin/partners/[id]/status/route.ts', methods: ['PATCH'] },
      { path: 'app/api/admin/partners/route.ts', methods: ['POST'] },
      { path: 'app/api/admin/scoring/run-approved-batch/route.ts', methods: ['POST'] },
      { path: 'app/api/admin/tenants/[id]/promote-to-pilot/route.ts', methods: ['POST'] },
      { path: 'app/api/admin/tenants/route.ts', methods: ['POST'] },
      { path: 'app/api/admin/uef/enrich/route.ts', methods: ['POST'] },
      { path: 'app/api/admin/uef/generate-candidates/route.ts', methods: ['POST'] },
      { path: 'app/api/admin/uef/review/route.ts', methods: ['POST'] },
      { path: 'app/api/admin/worker-initiatives/[id]/route.ts', methods: ['PATCH'] },
      { path: 'app/api/admin/worker-initiatives/route.ts', methods: ['POST'] },
      { path: 'app/api/admin/workers/bulk-provision/route.ts', methods: ['POST'] },
      { path: 'app/api/admin/workers/provision/route.ts', methods: ['POST'] },
      { path: 'app/api/admin/workforce-baseline/route.ts', methods: ['POST'] },
      { path: 'app/api/auth/logout/route.ts', methods: ['POST'] },
      { path: 'app/api/commons/posts/[id]/route.ts', methods: ['PATCH'] },
      { path: 'app/api/commons/posts/route.ts', methods: ['POST'] },
      { path: 'app/api/company/data-submissions/[id]/files/route.ts', methods: ['POST'] },
      { path: 'app/api/company/data-submissions/[id]/submit/route.ts', methods: ['POST'] },
      { path: 'app/api/company/data-submissions/route.ts', methods: ['POST'] },
      { path: 'app/api/worker/commons/bookings/[id]/route.ts', methods: ['DELETE'] },
      { path: 'app/api/worker/commons/bookings/route.ts', methods: ['POST'] },
      { path: 'app/api/worker/dynamic-cv/share/route.ts', methods: ['POST'] },
      { path: 'app/api/worker/dynamic-cv/shares/[id]/revoke/route.ts', methods: ['PATCH'] },
      { path: 'app/api/worker/initiatives/[id]/interest/route.ts', methods: ['POST'] },
      { path: 'app/api/worker/onboarding/route.ts', methods: ['POST'] },
      { path: 'app/api/worker/pib/redistribute/route.ts', methods: ['POST'] },
      { path: 'app/api/worker/profile/route.ts', methods: ['PATCH'] },
      { path: 'app/link/[token]/activate/route.ts', methods: ['POST'] },
    ];

    expect(routes.length).toBe(45);
    const totalMethods = routes.reduce((n, r) => n + r.methods.length, 0);
    expect(totalMethods).toBe(46);

    for (const { path, methods } of routes) {
      const src = read(path);
      expect(src, `${path} missing import`).toContain("import { assertSameOrigin } from '@/lib/security/origin';");
      for (const method of methods) {
        const handlerSrc = extractHandler(src, method);
        expect(handlerSrc, `${path} [${method}] missing guard call`).toContain('assertSameOrigin(request)');
      }
    }
  });
});
