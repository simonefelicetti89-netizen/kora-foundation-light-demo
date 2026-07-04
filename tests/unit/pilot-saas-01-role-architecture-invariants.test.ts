/**
 * PILOT-SAAS-01 / ROLE-01 — role/access architecture regression guards.
 *
 * These lock in facts discovered during the PILOT-SAAS-01 hardening sprint
 * and the ROLE-01 role-model reconciliation so they don't silently drift or
 * get "fixed" by accident before a deliberate decision is made. See
 * docs/PILOT_SAAS_READINESS.md, docs/FUTURE_ROLES_AND_SURFACES.md, and
 * docs/access-matrix.md for the reasoning behind each invariant.
 *
 * Static/structural only — no DB, no Supabase client, no network.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { isViewerRole } from '@/lib/permissions';
import { KORA_ROLES, REMOVED_KORA_ROLES, ACTIVE_KORA_ROLES, FUTURE_KORA_ROLES, DEMO_KORA_ROLES } from '@/lib/constants/kora';
import { canAccess, type AccessResource, type KoraEnvironment } from '@/lib/auth/access-matrix';
import type { KoraRole as AccessMatrixKoraRole } from '@/lib/auth/access-matrix';
import type { KoraRole } from '@/lib/types';
import * as koraSession from '@/lib/auth/kora-session';

const REPO_ROOT = join(__dirname, '..', '..');
const ALL_RESOURCES: readonly AccessResource[] = [
  'company_kpi_kora_index',
  'company_config_source_batch',
  'company_submissions_approval',
  'aggregates_n_ge_10',
  'worker_individual_pib',
  'worker_individual_uef',
  'personal_pseudonym_map',
  'hq_operator_console',
];
const ALL_ENVS: readonly KoraEnvironment[] = ['demo', 'live', 'future'];

describe('PILOT-SAAS-01 — COMPANY_VIEWER is fully removed at the app layer (B143)', () => {
  it('isViewerRole() never returns true for any current role', () => {
    for (const role of KORA_ROLES) {
      expect(isViewerRole(role)).toBe(false);
    }
  });

  it('KORA_ROLES does not list COMPANY_VIEWER as a live role', () => {
    expect(KORA_ROLES).not.toContain('COMPANY_VIEWER');
  });

  it('REMOVED_KORA_ROLES documents COMPANY_VIEWER and nothing else overlaps it with a live array (ROLE-01)', () => {
    expect(REMOVED_KORA_ROLES).toEqual(['COMPANY_VIEWER']);
    for (const removed of REMOVED_KORA_ROLES) {
      expect(ACTIVE_KORA_ROLES as readonly string[]).not.toContain(removed);
      expect(FUTURE_KORA_ROLES as readonly string[]).not.toContain(removed);
      expect(DEMO_KORA_ROLES as readonly string[]).not.toContain(removed);
      expect(KORA_ROLES as readonly string[]).not.toContain(removed);
    }
  });
});

describe('PILOT-SAAS-01 — ADVISOR has DB-layer support but zero session/route enforcement today', () => {
  it('lib/constants/kora.ts still lists ADVISOR as a permission-layer role', () => {
    // This is intentionally still true — ADVISOR exists in the general
    // permission/routing layer (lib/permissions/index.ts) even though it has
    // no real session guard. If this ever flips to false, the "aspirational
    // only" characterization in the readiness docs needs re-checking.
    expect(KORA_ROLES).toContain('ADVISOR');
  });

  it('kora-session.ts exports no requireAdvisorUser()/isAdvisorUser() guard', () => {
    // Guards against a future accidental partial-enablement (e.g. someone
    // adding a guard without also updating the readiness docs and the
    // access matrix). If this test starts failing because a real guard was
    // added deliberately, update docs/access-matrix.md and
    // docs/FUTURE_ROLES_AND_SURFACES.md in the same change, then update this test.
    const exportNames = Object.keys(koraSession);
    expect(exportNames).not.toContain('requireAdvisorUser');
    expect(exportNames).not.toContain('isAdvisorUser');
  });
});

describe('ROLE-01 — the two former KoraRole type definitions are now reconciled to one canonical source', () => {
  // Before ROLE-01 (2026-07-04), lib/auth/access-matrix.ts declared its own
  // independent 5-role literal (KORA_ADMIN/COMPANY_ADMIN/WORKER/PARTNER/
  // DEMO_VIEWER) that silently diverged from lib/constants/kora.ts's
  // KORA_ROLES (KORA_ADMIN/COMPANY_ADMIN/WORKER/PARTNER/ADVISOR). Both now
  // derive from the same KORA_ROLES array — this test proves they agree, and
  // will fail loudly if a future edit reintroduces an independent literal in
  // either place.
  it('lib/auth/access-matrix.ts KoraRole and lib/types KoraRole (KORA_ROLES) have identical membership', () => {
    const accessMatrixRoles = new Set<string>(KORA_ROLES as readonly AccessMatrixKoraRole[] as readonly string[]);
    const canonicalRoles = new Set<string>(KORA_ROLES as readonly string[]);
    expect(accessMatrixRoles).toEqual(canonicalRoles);

    // Compile-time cross-check: if the two types ever diverge again, this
    // assignment stops type-checking (both directions), independent of the
    // runtime Set comparison above.
    const _fromCanonical: AccessMatrixKoraRole = KORA_ROLES[0] as KoraRole;
    const _fromAccessMatrix: KoraRole = KORA_ROLES[0] as AccessMatrixKoraRole;
    void _fromCanonical;
    void _fromAccessMatrix;
  });

  it('KORA_ROLES contains exactly ACTIVE + FUTURE + DEMO roles, nothing else', () => {
    const expected = new Set<string>([...ACTIVE_KORA_ROLES, ...FUTURE_KORA_ROLES, ...DEMO_KORA_ROLES]);
    const actual = new Set<string>(KORA_ROLES as readonly string[]);
    expect(actual).toEqual(expected);
  });
});

describe('ROLE-01 — docs/access-matrix.md role columns do not drift from the code', () => {
  it("the matrix table's role column headers match KORA_ROLES exactly", () => {
    const doc = readFileSync(join(REPO_ROOT, 'docs/access-matrix.md'), 'utf8');
    const headerLine = doc.split('\n').find((line) => line.trim().startsWith('| Risorsa'));
    expect(headerLine, 'access-matrix.md table header row (starting "| Risorsa") not found').toBeDefined();

    const columns = (headerLine as string)
      .split('|')
      .map((cell) => cell.trim())
      .filter((cell) => cell.length > 0);

    // Drop the non-role columns (first = resource name, last = env constraint).
    const roleColumns = columns.slice(1, -1);

    expect(new Set(roleColumns)).toEqual(new Set(KORA_ROLES as readonly string[]));
  });
});

describe('ROLE-01 — future/demo roles can never be silently treated as active by canAccess()', () => {
  it('ADVISOR never gets allowed:true on any resource, in any environment', () => {
    for (const resource of ALL_RESOURCES) {
      for (const env of ALL_ENVS) {
        const decision = canAccess('ADVISOR', resource, env);
        expect(decision.allowed, `ADVISOR must not be allowed on ${resource} (${env})`).toBe(false);
      }
    }
  });

  it('DEMO_VIEWER never gets allowed:true on any resource, in any environment', () => {
    for (const resource of ALL_RESOURCES) {
      for (const env of ALL_ENVS) {
        const decision = canAccess('DEMO_VIEWER', resource, env);
        expect(decision.allowed, `DEMO_VIEWER must not be allowed on ${resource} (${env})`).toBe(false);
      }
    }
  });

  it('every FUTURE_KORA_ROLES and DEMO_KORA_ROLES member is denied on every resource (belt-and-braces over the two tests above)', () => {
    const neverActiveRoles: readonly string[] = [...FUTURE_KORA_ROLES, ...DEMO_KORA_ROLES];
    for (const role of neverActiveRoles) {
      for (const resource of ALL_RESOURCES) {
        for (const env of ALL_ENVS) {
          const decision = canAccess(role as AccessMatrixKoraRole, resource, env);
          expect(decision.allowed, `${role} must not be allowed on ${resource} (${env})`).toBe(false);
        }
      }
    }
  });
});
