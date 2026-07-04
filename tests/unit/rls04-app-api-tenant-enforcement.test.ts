/**
 * RLS-04 — App/API Tenant Enforcement Audit
 *
 * Static checks that complement the existing tenant-isolation.test.ts and
 * route-privacy.test.ts (which are scoped to app/api/company/** and
 * app/api/admin/**). This file covers three gaps not exercised by those
 * suites:
 *
 *   1. Worker routes (app/api/worker/**): no route accepts an alternate
 *      auth path via requireCompanyUser or requirePartnerUser — mirrors the
 *      pattern route-privacy.test.ts already applies to company/admin
 *      routes, extended to the worker directory.
 *   2. PARTNER isolation pinning: no route anywhere under app/api/**
 *      outside a future app/api/partner/** tree uses requirePartnerUser as
 *      a bypass, and no such directory exists yet. If either changes, this
 *      test forces a deliberate update — and a matching isolation test —
 *      rather than a silent gap.
 *   3. Admin "company preview" routes (company-console, company-workspace,
 *      company-live-preview, company-evidence-archive, company-evidence-
 *      record) proxy company-shaped data from an ADMIN route namespace.
 *      They sit outside app/api/company/** so route-privacy.test.ts never
 *      scans them. This suite applies the same pseudonym/worker-identifier
 *      exclusion checks to them.
 *
 * What this file does NOT prove: PostgreSQL RLS enforcement (requires a
 * live/staging DB — out of scope for RLS-04 per red lines), or runtime
 * behavior of an authenticated request (requires fixtures/secrets).
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync, existsSync } from 'fs';
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

function label(relPath: string): string {
  return relPath.replace('app/api/', '');
}

const WORKER_ROUTES = collectRoutes(resolve(root, 'app/api/worker'));

// ── 1. Worker routes: no requireCompanyUser or requirePartnerUser bypass ──────

describe('RLS-04 — worker routes: no company/partner bypass path', () => {
  for (const route of WORKER_ROUTES) {
    it(`${label(route)} non usa requireCompanyUser come guard alternativo`, () => {
      const codeNoComments = stripComments(src(route));
      expect(codeNoComments).not.toContain('requireCompanyUser');
    });

    it(`${label(route)} non usa requirePartnerUser come guard alternativo`, () => {
      const codeNoComments = stripComments(src(route));
      expect(codeNoComments).not.toContain('requirePartnerUser');
    });
  }

  it('sanity check: ci sono worker routes da coprire', () => {
    expect(WORKER_ROUTES.length).toBeGreaterThan(0);
  });
});

// ── 2. PARTNER isolation pinning ───────────────────────────────────────────────

describe('RLS-04 — PARTNER API surface pinning', () => {
  it('app/api/partner/** non esiste ancora — nessuna route API partner-facing', () => {
    // If this ever becomes true, the sprint introducing it must add the
    // matching requirePartnerUser + tenant/worker-identifier isolation
    // tests (see tests/unit/b127-partner-workspace.test.ts pattern) rather
    // than leaving this gap silently closed.
    expect(existsSync(resolve(root, 'app/api/partner'))).toBe(false);
  });

  it('nessuna route company/worker/admin usa requirePartnerUser come path di accesso', () => {
    const dirs = ['app/api/company', 'app/api/worker', 'app/api/admin', 'app/api/commons'];
    for (const dir of dirs) {
      const routes = collectRoutes(resolve(root, dir));
      for (const route of routes) {
        const codeNoComments = stripComments(src(route));
        expect(codeNoComments, `${route} non deve importare requirePartnerUser`).not.toContain('requirePartnerUser');
      }
    }
  });
});

// ── 3. Admin "company preview" routes: no individual worker identifiers ───────

describe('RLS-04 — admin company-preview routes: no pseudonym/worker identifiers', () => {
  // These routes proxy company-shaped aggregate data from the ADMIN
  // namespace (KORA_ADMIN only) — they sit outside app/api/company/**, so
  // route-privacy.test.ts's company-scoped checks never see them.
  const ADMIN_COMPANY_PREVIEW_ROUTES = [
    'app/api/admin/company-console/route.ts',
    'app/api/admin/company-workspace/route.ts',
    'app/api/admin/company-live-preview/route.ts',
    'app/api/admin/company-evidence-archive/route.ts',
    'app/api/admin/company-evidence-record/route.ts',
  ];

  it('sanity check: tutti i file esistono ancora a questo path', () => {
    for (const route of ADMIN_COMPANY_PREVIEW_ROUTES) {
      expect(existsSync(resolve(root, route)), route).toBe(true);
    }
  });

  for (const route of ADMIN_COMPANY_PREVIEW_ROUTES) {
    it(`${label(route)}: usa requireKoraAdmin`, () => {
      const code = src(route);
      expect(code).toContain('requireKoraAdmin');
      expect(code).toMatch(/requireKoraAdmin\(request\)/);
    });

    it(`${label(route)}: nessuna query seleziona pseudonym_id`, () => {
      const codeNoComments = stripComments(src(route));
      expect(codeNoComments).not.toMatch(/pseudonym_id/);
    });

    it(`${label(route)}: nessuna query seleziona worker_identity_id`, () => {
      const codeNoComments = stripComments(src(route));
      expect(codeNoComments).not.toMatch(/['"`]worker_identity_id['"`]/);
    });

    it(`${label(route)}: nessuna query seleziona raw_hash`, () => {
      const codeNoComments = stripComments(src(route));
      expect(codeNoComments).not.toMatch(/raw_hash/);
    });

    it(`${label(route)}: il campo payload/payload_sample non viene spread direttamente in risposta`, () => {
      const codeNoComments = stripComments(src(route));
      // A raw spread of the uef/uploaded_record payload into a response
      // object would bypass the safe-field extraction this route documents.
      expect(codeNoComments).not.toMatch(/\.\.\.(?:row\.)?payload\b/);
      expect(codeNoComments).not.toMatch(/\.\.\.(?:\w+\.)?payload_sample\b/);
    });
  }
});
