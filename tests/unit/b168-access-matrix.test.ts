// tests/unit/b168-access-matrix.test.ts
// B168 — Test unitari per canAccess() — matrice di accesso KORA.
// Pure function: no DB, no runtime, no Supabase.

import { describe, it, expect } from 'vitest';
import { canAccess } from '@/lib/auth/access-matrix';
import type { KoraRole, AccessResource, KoraEnvironment } from '@/lib/auth/access-matrix';

// ─────────────────────────────────────────────────────────────────────────────
// Company aggregate — KORA_ADMIN: ALLOW + audit + banner
// ─────────────────────────────────────────────────────────────────────────────

describe('canAccess — company risorse (KORA_ADMIN)', () => {
  const companyResources: AccessResource[] = [
    'company_kpi_kora_index',
    'company_config_source_batch',
    'company_submissions_approval',
  ];

  for (const resource of companyResources) {
    it(`${resource}: KORA_ADMIN allowed=true, requiresAudit=true`, () => {
      const d = canAccess('KORA_ADMIN', resource, 'live');
      expect(d.allowed).toBe(true);
      expect(d.requiresAudit).toBe(true);
    });

    it(`${resource}: KORA_ADMIN in demo → banner=amber`, () => {
      expect(canAccess('KORA_ADMIN', resource, 'demo').banner).toBe('amber');
    });

    it(`${resource}: KORA_ADMIN in live → banner=navy`, () => {
      expect(canAccess('KORA_ADMIN', resource, 'live').banner).toBe('navy');
    });

    it(`${resource}: KORA_ADMIN in future → banner=blueprint`, () => {
      expect(canAccess('KORA_ADMIN', resource, 'future').banner).toBe('blueprint');
    });
  }
});

describe('canAccess — company risorse (COMPANY_ADMIN)', () => {
  const companyResources: AccessResource[] = [
    'company_kpi_kora_index',
    'company_config_source_batch',
    'company_submissions_approval',
  ];

  for (const resource of companyResources) {
    it(`${resource}: COMPANY_ADMIN allowed=true, no audit, no banner`, () => {
      const d = canAccess('COMPANY_ADMIN', resource, 'live');
      expect(d.allowed).toBe(true);
      expect(d.requiresAudit).toBe(false);
      expect(d.banner).toBeUndefined();
    });
  }
});

describe('canAccess — company risorse (WORKER: DENY)', () => {
  it('WORKER non accede a company_kpi_kora_index', () => {
    expect(canAccess('WORKER', 'company_kpi_kora_index', 'live').allowed).toBe(false);
  });
  it('WORKER non accede a company_config_source_batch', () => {
    expect(canAccess('WORKER', 'company_config_source_batch', 'live').allowed).toBe(false);
  });
  it('WORKER non accede a company_submissions_approval', () => {
    expect(canAccess('WORKER', 'company_submissions_approval', 'live').allowed).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Worker individual — KORA_ADMIN: DENY invariato in ogni env
// ─────────────────────────────────────────────────────────────────────────────

describe('canAccess — worker individual (KORA_ADMIN: DENY assoluto)', () => {
  const workerResources: AccessResource[] = [
    'worker_individual_pib',
    'worker_individual_uef',
  ];
  const envs: KoraEnvironment[] = ['demo', 'live', 'future'];

  for (const resource of workerResources) {
    for (const env of envs) {
      it(`${resource} KORA_ADMIN in ${env} → DENY`, () => {
        const d = canAccess('KORA_ADMIN', resource, env);
        expect(d.allowed).toBe(false);
        expect(d.requiresAudit).toBe(false);
      });
    }

    it(`${resource}: denyReason menziona "KORA service team by design"`, () => {
      const d = canAccess('KORA_ADMIN', resource, 'live');
      expect(d.denyReason).toContain('KORA service team by design');
    });
  }
});

describe('canAccess — worker individual (COMPANY_ADMIN: DENY)', () => {
  it('COMPANY_ADMIN non accede a worker_individual_pib', () => {
    expect(canAccess('COMPANY_ADMIN', 'worker_individual_pib', 'live').allowed).toBe(false);
  });
  it('COMPANY_ADMIN non accede a worker_individual_uef', () => {
    expect(canAccess('COMPANY_ADMIN', 'worker_individual_uef', 'live').allowed).toBe(false);
  });
  it('denyReason menziona privacy boundary', () => {
    const d = canAccess('COMPANY_ADMIN', 'worker_individual_pib', 'live');
    expect(d.denyReason).toContain('privacy');
  });
});

describe('canAccess — worker individual (WORKER: ALLOW own)', () => {
  it('WORKER può accedere a worker_individual_pib (own — enforced da RLS)', () => {
    expect(canAccess('WORKER', 'worker_individual_pib', 'live').allowed).toBe(true);
  });
  it('WORKER può accedere a worker_individual_uef (own — enforced da RLS)', () => {
    expect(canAccess('WORKER', 'worker_individual_uef', 'live').allowed).toBe(true);
  });
  it('WORKER su worker_individual: no banner', () => {
    expect(canAccess('WORKER', 'worker_individual_pib', 'live').banner).toBeUndefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// personal_pseudonym_map — DENY per tutti
// ─────────────────────────────────────────────────────────────────────────────

describe('canAccess — personal_pseudonym_map (DENY per tutti)', () => {
  const allRoles: KoraRole[] = [
    'KORA_ADMIN', 'COMPANY_ADMIN', 'WORKER', 'PARTNER', 'DEMO_VIEWER',
  ];

  for (const role of allRoles) {
    it(`${role} → DENY`, () => {
      expect(canAccess(role, 'personal_pseudonym_map', 'live').allowed).toBe(false);
    });
  }

  it('denyReason menziona "system procedures only"', () => {
    expect(canAccess('KORA_ADMIN', 'personal_pseudonym_map', 'live').denyReason).toContain('system procedures only');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// aggregates_n_ge_10 — ALLOW per KORA_ADMIN, COMPANY_ADMIN, WORKER
// ─────────────────────────────────────────────────────────────────────────────

describe('canAccess — aggregates_n_ge_10', () => {
  it('KORA_ADMIN allowed, no audit', () => {
    const d = canAccess('KORA_ADMIN', 'aggregates_n_ge_10', 'live');
    expect(d.allowed).toBe(true);
    expect(d.requiresAudit).toBe(false);
  });
  it('KORA_ADMIN: no banner su aggregati', () => {
    expect(canAccess('KORA_ADMIN', 'aggregates_n_ge_10', 'demo').banner).toBeUndefined();
  });
  it('COMPANY_ADMIN allowed', () => {
    expect(canAccess('COMPANY_ADMIN', 'aggregates_n_ge_10', 'live').allowed).toBe(true);
  });
  it('WORKER allowed', () => {
    expect(canAccess('WORKER', 'aggregates_n_ge_10', 'live').allowed).toBe(true);
  });
  it('PARTNER non accede', () => {
    expect(canAccess('PARTNER', 'aggregates_n_ge_10', 'live').allowed).toBe(false);
  });
  it('DEMO_VIEWER non accede', () => {
    expect(canAccess('DEMO_VIEWER', 'aggregates_n_ge_10', 'live').allowed).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// hq_operator_console — solo KORA_ADMIN
// ─────────────────────────────────────────────────────────────────────────────

describe('canAccess — hq_operator_console', () => {
  it('KORA_ADMIN allowed', () => {
    expect(canAccess('KORA_ADMIN', 'hq_operator_console', 'live').allowed).toBe(true);
  });
  it('COMPANY_ADMIN denied', () => {
    expect(canAccess('COMPANY_ADMIN', 'hq_operator_console', 'live').allowed).toBe(false);
  });
  it('WORKER denied', () => {
    expect(canAccess('WORKER', 'hq_operator_console', 'live').allowed).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Invariante: worker-individual DENY non dipende dall'environment
// ─────────────────────────────────────────────────────────────────────────────

describe('canAccess — invariante env: worker-individual DENY non dipende da environment', () => {
  const workerDeniedRoles: KoraRole[] = ['KORA_ADMIN', 'COMPANY_ADMIN'];
  const envs: KoraEnvironment[] = ['demo', 'live', 'future'];
  const workerResources: AccessResource[] = ['worker_individual_pib', 'worker_individual_uef'];

  for (const role of workerDeniedRoles) {
    for (const resource of workerResources) {
      it(`${role} su ${resource}: DENY identico in tutti e 3 gli environment`, () => {
        const results = envs.map(env => canAccess(role, resource, env).allowed);
        expect(results).toEqual([false, false, false]);
      });
    }
  }
});
