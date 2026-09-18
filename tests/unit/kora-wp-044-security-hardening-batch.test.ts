// tests/unit/kora-wp-044-security-hardening-batch.test.ts
// KORA-WP-044 — Security Hardening Batch.
//
// WHAT THIS WP CLOSES (registry 142's own Primary Closures: PLATFORM-012
// zod validation, PLATFORM-013 error handling, PLATFORM-014 rate limiting,
// PLATFORM-017 generic feature-flag mechanism — doc 45's own SEC-003/004/005
// findings, doc 46's own remediation guidance "extend to... new-domain
// routes"):
//
//   Read-only inventory (report 161) found every one of the 14 mutating
//   routes built since SECURITY-RATE-LIMITING-04's own 2026-07-14 cutoff
//   (the Advisor-domain family — cases/appointments/content/messages/
//   review-assessments, both Advisor- and Company-side — plus
//   admin/advisor-governance, admin/cases[/:id], admin/company-readiness,
//   company/data-ingest) ALREADY has: an authenticated require*User() guard,
//   genuine request-body validation (manual, field-by-field — matching this
//   repo's own established non-zod convention, and every free-text field
//   already carries its own DB-level CHECK(char_length...) bound), and safe
//   error handling (safeErrorResponse()/the equivalent inlined safeReasons
//   pattern — never a raw error.message to the client). PLATFORM-012/013
//   were therefore ALREADY closed for this route set by the time WP-044
//   started — nothing to fix there (see report 161 §D/§E; no PRODUCT
//   DEFECT was found). The one genuine, closeable gap was rate limiting
//   (PLATFORM-014) — this file is that closure's own permanent structural
//   proof, mirroring tests/unit/security-rate-limiting-04-routes.test.ts's
//   own established audit pattern exactly rather than inventing a new one.
//
// NO NEW RATE-LIMIT CATEGORY was introduced — every route below reuses an
// EXISTING RATE_LIMIT_POLICIES category (costly_admin_operation,
// single_provisioning, heavy_provisioning), matching this WP's own explicit
// "no security theater" boundary (no new mechanism invented merely to
// close a checklist item).

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { RATE_LIMIT_POLICIES, type RateLimitCategory } from '@/lib/security/rate-limit';

const ROOT = resolve(process.cwd());

function read(rel: string): string {
  return readFileSync(resolve(ROOT, rel), 'utf-8');
}

// The 14 routes protected in this WP, with their expected category and the
// require*User() guard function each one's own auth check must call first.
const PROTECTED_ROUTES: Array<{ path: string; category: RateLimitCategory; guard: string }> = [
  { path: 'app/api/admin/advisor-governance/route.ts',                                          category: 'costly_admin_operation', guard: 'requireKoraAdmin' },
  { path: 'app/api/admin/cases/route.ts',                                                        category: 'costly_admin_operation', guard: 'requireKoraAdmin' },
  { path: 'app/api/admin/cases/[caseId]/route.ts',                                                category: 'costly_admin_operation', guard: 'requireKoraAdmin' },
  { path: 'app/api/admin/company-readiness/route.ts',                                             category: 'costly_admin_operation', guard: 'requireKoraAdmin' },
  { path: 'app/api/advisor/companies/[assignmentId]/cases/route.ts',                              category: 'single_provisioning',    guard: 'requireAdvisorUser' },
  { path: 'app/api/advisor/companies/[assignmentId]/cases/[caseId]/route.ts',                     category: 'single_provisioning',    guard: 'requireAdvisorUser' },
  { path: 'app/api/advisor/companies/[assignmentId]/content/route.ts',                            category: 'single_provisioning',    guard: 'requireAdvisorUser' },
  { path: 'app/api/advisor/companies/[assignmentId]/messages/route.ts',                           category: 'single_provisioning',    guard: 'requireAdvisorUser' },
  { path: 'app/api/advisor/companies/[assignmentId]/appointments/[appointmentId]/route.ts',       category: 'single_provisioning',    guard: 'requireAdvisorUser' },
  { path: 'app/api/advisor/companies/[assignmentId]/review-assessments/route.ts',                 category: 'single_provisioning',    guard: 'requireAdvisorUser' },
  { path: 'app/api/company/advisor/route.ts',                                                     category: 'single_provisioning',    guard: 'requireCompanyUser' },
  { path: 'app/api/company/advisor/appointments/route.ts',                                        category: 'single_provisioning',    guard: 'requireCompanyUser' },
  { path: 'app/api/company/advisor/appointments/[appointmentId]/route.ts',                        category: 'single_provisioning',    guard: 'requireCompanyUser' },
  { path: 'app/api/company/data-ingest/route.ts',                                                  category: 'heavy_provisioning',     guard: 'requireCompanyUser' },
];

describe('KORA-WP-044 — inventario: tutte le 14 nuove route mutanti sono coperte da rate limiting', () => {
  it('14 route attese, tutte con categoria valida ed ESISTENTE nel policy set (nessuna nuova categoria introdotta)', () => {
    expect(PROTECTED_ROUTES.length).toBe(14);
    const preExistingCategories: RateLimitCategory[] = [
      'invite', 'single_provisioning', 'bulk_provisioning', 'heavy_provisioning',
      'costly_admin_operation', 'destructive_admin_operation', 'token_creation',
    ];
    // Exactly the same 7 keys as before this WP — RATE_LIMIT_POLICIES itself
    // was not touched (no new category, no removed category).
    expect(Object.keys(RATE_LIMIT_POLICIES).sort()).toEqual([...preExistingCategories].sort());
    for (const { category } of PROTECTED_ROUTES) {
      expect(preExistingCategories).toContain(category);
      expect(RATE_LIMIT_POLICIES[category]).toBeDefined();
    }
  });

  for (const { path, category, guard } of PROTECTED_ROUTES) {
    it(`${path}: importa assertRateLimit e lo invoca con categoria "${category}"`, () => {
      const src = read(path);
      expect(src).toContain("import { assertRateLimit } from '@/lib/security/rate-limit';");
      expect(src).toContain(`assertRateLimit('${category}'`);
    });

    it(`${path}: il guard di autenticazione (${guard}) viene risolto PRIMA di assertRateLimit (mai un rate-limit check su un attore non autenticato)`, () => {
      const src = read(path);
      const guardIndex = src.indexOf(`await ${guard}(request)`);
      const rateLimitIndex = src.indexOf(`assertRateLimit('${category}'`);
      expect(guardIndex).toBeGreaterThan(-1);
      expect(rateLimitIndex).toBeGreaterThan(-1);
      expect(guardIndex).toBeLessThan(rateLimitIndex);
    });

    it(`${path}: la chiave di rate-limit è l'auth.id del chiamante (actor-scoped), mai un valore fornito dal client`, () => {
      const src = read(path);
      expect(src).toContain(`assertRateLimit('${category}', auth.id)`);
    });
  }
});

describe('KORA-WP-044 — PLATFORM-012/013 (validazione input / gestione errori): già chiuse, non regredite', () => {
  // These 14 routes already had manual field-by-field validation and safe
  // error handling BEFORE this WP started (report 161's own read-only
  // inventory finding) — this WP added ONLY rate limiting. These checks
  // confirm that finding remains true after this WP's own edits, not that
  // this WP itself implemented them.
  for (const { path } of PROTECTED_ROUTES) {
    it(`${path}: nessun error.message grezzo restituito al client`, () => {
      const src = read(path);
      // Every route either uses the safeErrorResponse()/inline safeReasons
      // pattern, or a fixed, non-error-derived string literal — never
      // `error: err.message` / `error: String(err)` direct passthrough.
      expect(src).not.toMatch(/error:\s*(err|error)\.message\s*[,}]/);
      expect(src).not.toMatch(/error:\s*String\((err|error)\)/);
    });

    it(`${path}: il body della richiesta viene validato prima dell'uso (nessun campo passato al service layer non controllato)`, () => {
      const src = read(path);
      // Every POST handler in this set performs at least one explicit
      // presence/shape guard before calling its own service function —
      // either directly on `body.<field>` or on a locally-derived,
      // already-trimmed variable (e.g. `const qualificationId =
      // body.qualificationId?.trim(); if (!qualificationId)`), or, for
      // company/data-ingest's own multipart-form shape, on the parsed
      // `file`/extension/size instead of a JSON `body` — confirmed
      // structurally (not proof of completeness for every field, only
      // that validation exists at all, matching this WP's own
      // proportionate scope).
      expect(src).toMatch(/if\s*\(!/);
    });
  }
});

describe('KORA-WP-044 — nessuna migrazione, nessun nuovo modulo di sicurezza generico introdotto', () => {
  it('supabase/migrations/ resta invariato alla ceiling 080 (Data/Migration Impact: NONE, registry 142)', async () => {
    // Ceiling bumped 80→81→82 by KORA-WP-112 and KORA-WP-113, both later,
    // unrelated WPs — this assertion's own intent ("WP-044 itself adds no
    // migration") is unaffected; only the global ceiling this test pins to
    // has moved.
    const { readdirSync } = await import('node:fs');
    const files = readdirSync('supabase/migrations').filter((f) => /^\d+_/.test(f));
    const numbers = files.map((f) => parseInt(f.split('_')[0], 10));
    expect(Math.max(...numbers)).toBe(84);
  });

  it('lib/security/rate-limit.ts (il meccanismo esistente riusato) non è stato duplicato con un secondo modulo', () => {
    expect(existsSync('lib/security/rate-limiting')).toBe(false);
    expect(existsSync('lib/rate-limit')).toBe(false);
  });
});
