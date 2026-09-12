/**
 * KORA-WP-003 — canAccess() Matrix Extension + Service-Role Factory Consolidation.
 *
 * Behavioral (not string-matching) tests of the REAL `canAccess()` function
 * from lib/auth/access-matrix.ts, proving explicit, deterministic coverage
 * for the Advisor and Admin (KORA_ADMIN) domains across every resource, plus
 * genuine fail-closed behavior for an undefined role/resource pair. Pre-
 * implementation Code Truth found the matrix already fully explicit for
 * both domains (see .kora-audit/output/107 §4) — this file exists to prove
 * that fact behaviorally and lock it in as a regression guard, per 102's own
 * "Tests: authorization unit tests per new domain" requirement, rather than
 * relying only on the acceptance narrative in the implementation report.
 *
 * Service-role factory consolidation (KORA-WP-003's other half) is covered
 * by the existing tests/unit/pilot-trust-01-service-role-guard.test.ts
 * allowlist mechanism (extended in this WP) plus the updated behavioral
 * tests in tests/unit/cc013-decision-pack-characterization.test.ts and
 * tests/unit/cc014-decision-pack-adversarial.test.ts (which exercise the
 * real, now-consolidated fetchPdfData()) — not duplicated here.
 */

import { describe, expect, it } from 'vitest';
import { canAccess, type AccessResource, type KoraEnvironment, type KoraRole } from '@/lib/auth/access-matrix';

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

describe('KORA-WP-003 — Admin (KORA_ADMIN) domain coverage is explicit on every resource', () => {
  it('every resource returns a deterministic decision for KORA_ADMIN — never the fail-closed fallback', () => {
    for (const resource of ALL_RESOURCES) {
      for (const env of ALL_ENVS) {
        const decision = canAccess('KORA_ADMIN', resource, env);
        // The fail-closed fallback always returns allowed:false with this
        // exact denyReason shape — an allowed:true decision already proves
        // it's not that branch; for a denied decision, the reason must not
        // match the generic fallback message, proving the matrix has a
        // real, explicit row rather than an accidental gap.
        if (!decision.allowed) {
          expect(decision.denyReason).not.toMatch(/^No access rule defined for role=/);
        }
      }
    }
  });

  it('KORA_ADMIN is correctly ALLOWED on company-aggregate resources, with audit required', () => {
    for (const resource of ['company_kpi_kora_index', 'company_config_source_batch', 'company_submissions_approval'] as const) {
      const decision = canAccess('KORA_ADMIN', resource, 'live');
      expect(decision.allowed).toBe(true);
      expect(decision.requiresAudit).toBe(true);
      expect(decision.banner).toBe('navy'); // 'live' env banner variant
    }
  });

  it('KORA_ADMIN is correctly DENIED on worker-individual resources — non-negotiable, independent of environment', () => {
    for (const resource of ['worker_individual_pib', 'worker_individual_uef'] as const) {
      for (const env of ALL_ENVS) {
        const decision = canAccess('KORA_ADMIN', resource, env);
        expect(decision.allowed).toBe(false);
        expect(decision.denyReason).toContain('by design');
      }
    }
  });

  it('KORA_ADMIN is correctly ALLOWED on hq_operator_console, with no banner (not a company resource)', () => {
    const decision = canAccess('KORA_ADMIN', 'hq_operator_console', 'live');
    expect(decision.allowed).toBe(true);
    expect(decision.banner).toBeUndefined();
  });
});

describe('KORA-WP-003 — Advisor (ADVISOR) domain coverage is explicit on every resource', () => {
  it('every resource returns a deterministic DENY decision for ADVISOR — never the fail-closed fallback, never allowed', () => {
    for (const resource of ALL_RESOURCES) {
      for (const env of ALL_ENVS) {
        const decision = canAccess('ADVISOR', resource, env);
        expect(decision.allowed).toBe(false);
        expect(decision.denyReason).not.toMatch(/^No access rule defined for role=/);
        expect(decision.denyReason).toBeTruthy();
      }
    }
  });

  it('ADVISOR is denied on worker-individual resources with a privacy-specific reason, distinct from the generic "not yet enforced" reason', () => {
    const pibDecision = canAccess('ADVISOR', 'worker_individual_pib', 'live');
    const uefDecision = canAccess('ADVISOR', 'worker_individual_uef', 'live');
    expect(pibDecision.denyReason).toContain('privacy boundary');
    expect(uefDecision.denyReason).toContain('fn_advisor_uef_read');
  });

  it('ADVISOR is denied on every non-worker resource with the shared "not yet enforced" reason', () => {
    const notYetEnforcedResources = [
      'company_kpi_kora_index', 'company_config_source_batch', 'company_submissions_approval',
      'aggregates_n_ge_10', 'hq_operator_console',
    ] as const;
    for (const resource of notYetEnforcedResources) {
      const decision = canAccess('ADVISOR', resource, 'live');
      expect(decision.denyReason).toContain('no live session/route enforcement yet');
    }
  });
});

describe('KORA-WP-003 — fail-closed default still holds for a genuinely undefined role/resource pair', () => {
  it('an unrecognized role value falls back to deny-by-default with the generic reason (defense in depth beyond the type system)', () => {
    // canAccess()'s parameter type is KoraRole, but this proves the runtime
    // fallback itself — not just the type-level guarantee — actually denies
    // an unexpected value, the same invariant Advisor/Admin coverage above
    // now formally never needs to rely on.
    const decision = canAccess('SOME_FUTURE_ROLE_NOT_YET_DEFINED' as KoraRole, 'company_kpi_kora_index', 'live');
    expect(decision.allowed).toBe(false);
    expect(decision.denyReason).toMatch(/^No access rule defined for role=/);
  });
});

describe('KORA-WP-003 — existing Company/Worker/Partner behavior unaffected (regression)', () => {
  it('COMPANY_ADMIN: allowed on its own aggregate resources, denied on worker-individual', () => {
    expect(canAccess('COMPANY_ADMIN', 'company_kpi_kora_index', 'live').allowed).toBe(true);
    expect(canAccess('COMPANY_ADMIN', 'worker_individual_pib', 'live').allowed).toBe(false);
  });

  it('WORKER: allowed on own individual data, denied on company-aggregate resources', () => {
    expect(canAccess('WORKER', 'worker_individual_pib', 'live').allowed).toBe(true);
    expect(canAccess('WORKER', 'worker_individual_uef', 'live').allowed).toBe(true);
    expect(canAccess('WORKER', 'company_kpi_kora_index', 'live').allowed).toBe(false);
  });

  it('PARTNER: denied on every resource in this matrix (no PARTNER-relevant resource defined here)', () => {
    for (const resource of ALL_RESOURCES) {
      expect(canAccess('PARTNER', resource, 'live').allowed).toBe(false);
    }
  });

  it('personal_pseudonym_map: DENY for every role, no exceptions — the most sensitive resource', () => {
    const roles: readonly KoraRole[] = ['KORA_ADMIN', 'COMPANY_ADMIN', 'WORKER', 'PARTNER', 'ADVISOR'];
    for (const role of roles) {
      expect(canAccess(role, 'personal_pseudonym_map', 'live').allowed).toBe(false);
    }
  });
});
