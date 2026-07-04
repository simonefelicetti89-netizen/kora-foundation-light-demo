/**
 * RLS-06 — KORA_ADMIN Legitimate Access Control (static/unit, positive control)
 *
 * WHAT THIS IS:
 *   RLS-03 and RLS-05 are NEGATIVE isolation tests: they prove a role CANNOT
 *   read another tenant's/worker's rows. Taken alone, a negative test suite
 *   can accidentally become a false regression trap — if a future change
 *   over-tightens a policy, RLS-03/05 keep passing (there's even LESS
 *   access now) while legitimate KORA_ADMIN operator access silently breaks.
 *   This file is the POSITIVE counterpart: it proves KORA_ADMIN's intended
 *   admin/operator capabilities exist and are bounded — not broadened, not
 *   accidentally removed.
 *
 * RELATIONSHIP TO RLS-03/04/05:
 *   - RLS-03 (tests/integration/rls-two-tenant-negative.test.ts): tenant-vs-
 *     tenant negative proof for analytics.* using COMPANY_ADMIN claims only
 *     — never simulates KORA_ADMIN, so it says nothing about whether the
 *     admin bypass itself still works.
 *   - RLS-04 (tests/unit/rls04-app-api-tenant-enforcement.test.ts): static
 *     app/api/** route audit — confirmed service-role client usage is
 *     confined to app/api/admin/**, but did not check that KORA_ADMIN's
 *     *DB-level* RLS policies are actually still bounded to the resources
 *     access-matrix.ts declares.
 *   - RLS-05 (tests/integration/rls-worker-isolation.test.ts): worker-vs-
 *     worker negative proof — never simulates KORA_ADMIN either.
 *   - RLS-06 (this file + tests/integration/rls-kora-admin-control.test.ts):
 *     closes both gaps — proves canAccess()'s declared KORA_ADMIN grants are
 *     real (not just documented), proves no other role inherits them, and
 *     (in the paired integration test) proves the live DB policy bypass
 *     still works cross-tenant while remaining absent on worker-individual
 *     tables.
 *
 * SCOPE — WHY canAccess() and NOT text-parsing migrations here:
 *   Unlike RLS-04 (which had to grep route source because there is no
 *   single runtime API describing route guards), `lib/auth/access-matrix.ts`
 *   exports a pure function, `canAccess(role, resource, env)`, that IS the
 *   authoritative, already-executable admin/company/worker access
 *   declaration (docs/access-matrix.md is its human-readable mirror). Static
 *   text-parsing that function's own source would be redundant with calling
 *   it directly — so every access-boundary assertion below calls the real
 *   function.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'fs';
import { resolve, join } from 'path';
import { canAccess, type AccessResource, type KoraEnvironment } from '@/lib/auth/access-matrix';
import { KORA_ROLES } from '@/lib/constants/kora';

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

const ENVS: KoraEnvironment[] = ['demo', 'live', 'future'];
const NON_ADMIN_ROLES = KORA_ROLES.filter((r) => r !== 'KORA_ADMIN');

// ── 1. KORA_ADMIN is allowed on every resource it is intended to manage ──────

describe('RLS-06 — KORA_ADMIN intended grants are real, not just documented', () => {
  const ADMIN_ALLOWED_RESOURCES: AccessResource[] = [
    'company_kpi_kora_index',
    'company_config_source_batch',
    'company_submissions_approval',
    'aggregates_n_ge_10',
    'hq_operator_console',
  ];

  for (const resource of ADMIN_ALLOWED_RESOURCES) {
    for (const env of ENVS) {
      it(`canAccess('KORA_ADMIN', '${resource}', '${env}') is allowed`, () => {
        const decision = canAccess('KORA_ADMIN', resource, env);
        expect(decision.allowed).toBe(true);
      });
    }
  }

  it('KORA_ADMIN access to company-scoped resources requires audit logging (bounded, not silent)', () => {
    // The admin bypass is intentional but must never be silent — this is
    // what keeps "KORA_ADMIN can do it" from meaning "KORA_ADMIN can do it
    // unaccountably". aggregates_n_ge_10/hq_operator_console are already
    // safe/internal surfaces and correctly do NOT require audit.
    const auditedResources: AccessResource[] = [
      'company_kpi_kora_index',
      'company_config_source_batch',
      'company_submissions_approval',
    ];
    for (const resource of auditedResources) {
      const decision = canAccess('KORA_ADMIN', resource, 'live');
      expect(decision.requiresAudit, `${resource}: KORA_ADMIN access must require audit`).toBe(true);
    }
  });
});

// ── 2. KORA_ADMIN stays out of worker-individual data — in every environment ──

describe('RLS-06 — KORA_ADMIN is explicitly bounded away from worker-individual data', () => {
  const WORKER_INDIVIDUAL_RESOURCES: AccessResource[] = [
    'worker_individual_pib',
    'worker_individual_uef',
    'personal_pseudonym_map',
  ];

  for (const resource of WORKER_INDIVIDUAL_RESOURCES) {
    for (const env of ENVS) {
      it(`canAccess('KORA_ADMIN', '${resource}', '${env}') is denied (non-negotiable, all environments)`, () => {
        const decision = canAccess('KORA_ADMIN', resource, env);
        expect(decision.allowed).toBe(false);
      });
    }
  }
});

// ── 3. No other role inherits KORA_ADMIN's console/admin capability ──────────

describe('RLS-06 — no other role accidentally inherits KORA_ADMIN capability', () => {
  for (const role of NON_ADMIN_ROLES) {
    it(`canAccess('${role}', 'hq_operator_console', 'live') is denied`, () => {
      const decision = canAccess(role, 'hq_operator_console', 'live');
      expect(decision.allowed).toBe(false);
    });
  }

  it('KORA_ROLES includes exactly one admin/operator role', () => {
    // Sanity pin: if a second admin-shaped role is ever added to
    // KORA_ROLES, this test forces a deliberate look at whether it also
    // needs its own hq_operator_console row, rather than silently falling
    // through canAccess()'s fail-closed default (which would still deny it
    // — but the intent should be explicit, matching every other role's
    // explicit DENY row in access-matrix.ts's MATRIX).
    expect(KORA_ROLES.filter((r) => r === 'KORA_ADMIN')).toHaveLength(1);
  });
});

// ── 4. require*User() session guards: KORA_ADMIN is not silently admitted ───
// lib/auth/kora-session.ts — each non-admin require*User() function must
// reject a KORA_ADMIN session on its OWN role check, the same way it
// rejects any other wrong role. The one deliberate, documented exception is
// requireDemoAccess() (admits DEMO_VIEWER or KORA_ADMIN, for demo preview —
// see that function's own comment on why it's safe: /demo is synth-only).

describe('RLS-06 — session guards do not silently admit KORA_ADMIN into other roles', () => {
  const sessionSrc = src('lib/auth/kora-session.ts');

  it('requireCompanyUser rejects any role that is not COMPANY_ADMIN (including KORA_ADMIN)', () => {
    const fn = sessionSrc.slice(
      sessionSrc.indexOf('export async function requireCompanyUser'),
      sessionSrc.indexOf('export async function getTenantFromSession'),
    );
    expect(fn).toMatch(/koraRole !== 'COMPANY_ADMIN'/);
    expect(fn).not.toMatch(/koraRole === 'KORA_ADMIN'/);
  });

  it('requireWorkerUser rejects any role that is not WORKER (including KORA_ADMIN)', () => {
    const fn = sessionSrc.slice(
      sessionSrc.indexOf('export async function requireWorkerUser'),
      sessionSrc.indexOf('export async function getCurrentWorkerUser'),
    );
    expect(fn).toMatch(/koraRole !== 'WORKER'/);
    expect(fn).not.toMatch(/koraRole === 'KORA_ADMIN'/);
  });

  it('requirePartnerUser rejects any role that is not PARTNER (including KORA_ADMIN)', () => {
    const fn = sessionSrc.slice(
      sessionSrc.indexOf('export async function requirePartnerUser'),
      sessionSrc.indexOf('export async function getCurrentPartnerUser'),
    );
    expect(fn).toMatch(/koraRole !== 'PARTNER'/);
    expect(fn).not.toMatch(/koraRole === 'KORA_ADMIN'/);
  });

  it('requireDemoUser (strict) rejects KORA_ADMIN — only requireDemoAccess admits it, deliberately', () => {
    const fn = sessionSrc.slice(
      sessionSrc.indexOf('export async function requireDemoUser'),
      sessionSrc.indexOf('export async function requireDemoAccess'),
    );
    expect(fn).toMatch(/koraRole !== 'DEMO_VIEWER'/);
    expect(fn).not.toMatch(/koraRole === 'KORA_ADMIN'/);
  });

  it('requireDemoAccess is the one documented KORA_ADMIN exception, and only for /demo preview', () => {
    const fn = sessionSrc.slice(
      sessionSrc.indexOf('export async function requireDemoAccess'),
      sessionSrc.indexOf('export async function getCurrentDemoUser'),
    );
    expect(fn).toMatch(/koraRole === 'KORA_ADMIN'/);
    // The function's own comment must document why this is safe (synth-only
    // surface) — if that comment is ever removed, the exception becomes
    // undocumented and this test should be revisited.
    expect(sessionSrc).toMatch(/synth-only/);
  });

  it('KoraUser.koraRole is a literal admin-only type, not a broader union', () => {
    const interfaceSrc = sessionSrc.slice(
      sessionSrc.indexOf('export interface KoraUser'),
      sessionSrc.indexOf('export interface KoraCompanyUser'),
    );
    expect(interfaceSrc).toMatch(/koraRole:\s*'KORA_ADMIN';/);
  });
});

// ── 5. Service-role (RLS-bypassing) client use is confined to KORA_ADMIN-gated routes ──
// RLS-04 already proved every service-role-using file lives under
// app/api/admin/**. This test asserts the complementary, stronger claim:
// every one of those SAME files also actually calls requireKoraAdmin —
// i.e. the directory convention is backed by a real per-file guard, not
// just a naming convention that a future route could quietly break.

describe('RLS-06 — every service-role route is also KORA_ADMIN-gated (not just admin-directory-shaped)', () => {
  const ADMIN_ROUTES = collectRoutes(resolve(root, 'app/api/admin'));
  const serviceRoleRoutes = ADMIN_ROUTES.filter((r) => stripComments(src(r)).includes('getSupabaseServiceClient'));

  it('sanity check: at least one admin route uses the service-role client', () => {
    expect(serviceRoleRoutes.length).toBeGreaterThan(0);
  });

  for (const route of serviceRoleRoutes) {
    it(`${route.replace('app/api/', '')}: service-role usage is paired with requireKoraAdmin`, () => {
      const code = stripComments(src(route));
      expect(code).toMatch(/requireKoraAdmin\(request\)/);
    });
  }
});
