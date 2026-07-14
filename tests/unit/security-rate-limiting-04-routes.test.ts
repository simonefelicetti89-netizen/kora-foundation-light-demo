// tests/unit/security-rate-limiting-04-routes.test.ts
// SECURITY-RATE-LIMITING-04 — route-level integration audit.
//
// Pattern: source-level structural audit (read file → check invariants),
// consistent with the existing convention in this codebase for auth/guard
// ordering checks (tests/unit/b161-worker-pib-routes.test.ts,
// tests/unit/security-origin-guard-03-routes.test.ts) — no test in this
// repo invokes app/api route handlers with constructed Request objects.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { RATE_LIMIT_POLICIES, type RateLimitCategory } from '@/lib/security/rate-limit';

const ROOT = resolve(process.cwd());

function read(rel: string): string {
  return readFileSync(resolve(ROOT, rel), 'utf-8');
}

function extractHandler(src: string, method: string): string {
  const start = src.indexOf(`export async function ${method}(`);
  if (start === -1) throw new Error(`handler ${method} not found`);
  const rest = src.slice(start + 1);
  const nextExport = rest.search(/\nexport /);
  return nextExport === -1 ? src.slice(start) : src.slice(start, start + 1 + nextExport);
}

// The 12 high-priority routes protected in this sprint, with their expected category.
const PROTECTED_ROUTES: Array<{ path: string; method: string; category: RateLimitCategory }> = [
  { path: 'app/api/admin/company-users/route.ts',                 method: 'POST', category: 'invite' },
  { path: "app/api/admin/partners/[id]/invite-user/route.ts",      method: 'POST', category: 'invite' },
  { path: 'app/api/admin/workers/provision/route.ts',              method: 'POST', category: 'single_provisioning' },
  { path: 'app/api/admin/workers/bulk-provision/route.ts',         method: 'POST', category: 'bulk_provisioning' },
  { path: 'app/api/admin/companies/provision/route.ts',            method: 'POST', category: 'heavy_provisioning' },
  { path: 'app/api/admin/live-company/route.ts',                   method: 'POST', category: 'heavy_provisioning' },
  { path: 'app/api/admin/operator-flow/route.ts',                  method: 'POST', category: 'costly_admin_operation' },
  { path: 'app/api/admin/scoring/run-approved-batch/route.ts',     method: 'POST', category: 'costly_admin_operation' },
  { path: 'app/api/admin/uef/generate-candidates/route.ts',        method: 'POST', category: 'costly_admin_operation' },
  { path: 'app/api/admin/data-intake/accept/route.ts',             method: 'POST', category: 'costly_admin_operation' },
  { path: 'app/api/admin/data-lifecycle/delete/route.ts',          method: 'POST', category: 'destructive_admin_operation' },
  { path: 'app/api/worker/dynamic-cv/share/route.ts',              method: 'POST', category: 'token_creation' },
];

describe('SECURITY-RATE-LIMITING-04 — inventario: tutte le route ad alta priorità sono coperte', () => {
  it('12 route attese, tutte con categoria valida nel policy set', () => {
    expect(PROTECTED_ROUTES.length).toBe(12);
    for (const { category } of PROTECTED_ROUTES) {
      expect(RATE_LIMIT_POLICIES[category]).toBeDefined();
    }
  });

  for (const { path, category } of PROTECTED_ROUTES) {
    it(`${path}: importa assertRateLimit e lo invoca con categoria "${category}"`, () => {
      const src = read(path);
      expect(src).toContain("import { assertRateLimit } from '@/lib/security/rate-limit';");
      expect(src).toContain(`assertRateLimit('${category}'`);
    });
  }
});

describe('SECURITY-RATE-LIMITING-04 — ordine corretto: Origin guard → auth → rate limit → business logic', () => {
  for (const { path, method } of PROTECTED_ROUTES) {
    it(`${path} [${method}]: assertSameOrigin precede l'auth, che precede assertRateLimit`, () => {
      const src = read(path);
      const handlerSrc = extractHandler(src, method);

      const originIdx = handlerSrc.indexOf('assertSameOrigin(request)');
      const authIdx = handlerSrc.search(/require(KoraAdmin|CompanyUser|WorkerUser|PartnerUser)\(request\)/);
      const rateLimitIdx = handlerSrc.indexOf('assertRateLimit(');

      expect(originIdx).toBeGreaterThan(-1);
      expect(authIdx).toBeGreaterThan(-1);
      expect(rateLimitIdx).toBeGreaterThan(-1);

      expect(originIdx).toBeLessThan(authIdx);
      expect(authIdx).toBeLessThan(rateLimitIdx);
    });

    it(`${path} [${method}]: la guard clause restituisce immediatamente in caso di blocco`, () => {
      const src = read(path);
      const handlerSrc = extractHandler(src, method);
      expect(handlerSrc).toMatch(/const rateLimitGuard = await assertRateLimit\([^)]*\);\s*\n\s*if \(rateLimitGuard\) return rateLimitGuard;/);
    });
  }
});

describe('SECURITY-RATE-LIMITING-04 — nessuna regressione su auth/Origin guard esistenti', () => {
  it('company-users POST: auth KORA_ADMIN e isKoraAuthError restano invariati', () => {
    const src = read('app/api/admin/company-users/route.ts');
    const handler = extractHandler(src, 'POST');
    expect(handler).toContain('requireKoraAdmin(request)');
    expect(handler).toContain('isKoraAuthError(authResult)');
  });

  it('workers/bulk-provision POST: auth KORA_ADMIN invariata, categoria è bulk_provisioning (non single)', () => {
    const src = read('app/api/admin/workers/bulk-provision/route.ts');
    const handler = extractHandler(src, 'POST');
    expect(handler).toContain('requireKoraAdmin(request)');
    expect(handler).toContain("assertRateLimit('bulk_provisioning'");
    expect(handler).not.toContain("assertRateLimit('single_provisioning'");
  });

  it('worker/dynamic-cv/share POST: auth WORKER invariata, chiave è workerId (non email/token)', () => {
    const src = read('app/api/worker/dynamic-cv/share/route.ts');
    const handler = extractHandler(src, 'POST');
    expect(handler).toContain('requireWorkerUser(request)');
    expect(handler).toContain("assertRateLimit('token_creation', workerId)");
  });

  it('company-users PATCH (fuori scope, media priorità) non è stato toccato dal rate limiter', () => {
    const src = read('app/api/admin/company-users/route.ts');
    const patchHandler = extractHandler(src, 'PATCH');
    expect(patchHandler).not.toContain('assertRateLimit');
    // ma l'Origin guard del precedente sprint resta intatta
    expect(patchHandler).toContain('assertSameOrigin(request)');
  });

  it('operator-flow GET (read-only, fuori scope) non è stato toccato', () => {
    const src = read('app/api/admin/operator-flow/route.ts');
    const getHandler = extractHandler(src, 'GET');
    expect(getHandler).not.toContain('assertRateLimit');
  });
});
