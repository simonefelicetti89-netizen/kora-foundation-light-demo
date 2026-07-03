/**
 * PILOT-SAAS-01 — role/access architecture regression guards.
 *
 * These lock in facts discovered during the PILOT-SAAS-01 hardening sprint
 * so they don't silently drift or get "fixed" by accident before a deliberate
 * decision is made. See docs/PILOT_SAAS_READINESS.md and
 * docs/FUTURE_ROLES_AND_SURFACES.md for the reasoning behind each invariant.
 *
 * Static/structural only — no DB, no Supabase client, no network.
 */

import { describe, expect, it } from 'vitest';
import { isViewerRole } from '@/lib/permissions';
import { KORA_ROLES } from '@/lib/constants/kora';
import type { KoraRole as AccessMatrixKoraRole } from '@/lib/auth/access-matrix';
import * as koraSession from '@/lib/auth/kora-session';

describe('PILOT-SAAS-01 — COMPANY_VIEWER is fully removed at the app layer (B143)', () => {
  it('isViewerRole() never returns true for any current role', () => {
    for (const role of KORA_ROLES) {
      expect(isViewerRole(role)).toBe(false);
    }
  });

  it('KORA_ROLES does not list COMPANY_VIEWER as a live role', () => {
    expect(KORA_ROLES).not.toContain('COMPANY_VIEWER');
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

describe('PILOT-SAAS-01 — two independent KoraRole type definitions exist (known inconsistency, not yet reconciled)', () => {
  it('lib/auth/access-matrix.ts KoraRole and lib/constants/kora.ts KORA_ROLES have different memberships', () => {
    // access-matrix.ts's KoraRole (used by canAccess()) is a fixed literal
    // union, not derived from KORA_ROLES — so this test checks the two
    // known-current member lists directly, as documented in
    // docs/access-matrix.md's "Attenzione — due tipi KoraRole" note.
    const accessMatrixRoles: readonly AccessMatrixKoraRole[] = [
      'KORA_ADMIN',
      'COMPANY_ADMIN',
      'WORKER',
      'PARTNER',
      'DEMO_VIEWER',
    ];
    const permissionLayerRoles: readonly string[] = KORA_ROLES;

    // access-matrix.ts has DEMO_VIEWER, which the permission layer's role
    // list does not.
    expect(accessMatrixRoles).toContain('DEMO_VIEWER');
    expect(permissionLayerRoles).not.toContain('DEMO_VIEWER');

    // The permission layer has ADVISOR, which access-matrix.ts's KoraRole
    // does not.
    expect(permissionLayerRoles).toContain('ADVISOR');
    expect(accessMatrixRoles).not.toContain('ADVISOR' as AccessMatrixKoraRole);
  });
});
