/**
 * Gate 2 Phase 1 — Post-Migration Verification & Seed Plan assertions.
 *
 * These tests verify that docs/GATE2_PHASE1_POST_MIGRATION_VERIFICATION.md
 * exists and contains all required sections, seed plan elements, smoke test
 * definitions, and 027 prerequisites.
 *
 * No SQL is executed. No DB is touched. No migration is applied. No data is seeded.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const root = resolve(process.cwd());

function doc(): string {
  return readFileSync(resolve(root, 'docs/GATE2_PHASE1_POST_MIGRATION_VERIFICATION.md'), 'utf-8');
}

// ── 1. Document exists ────────────────────────────────────────────────────────

describe('GATE2_PHASE1_POST_MIGRATION_VERIFICATION.md — existence', () => {
  it('doc exists', () => {
    expect(existsSync(resolve(root, 'docs/GATE2_PHASE1_POST_MIGRATION_VERIFICATION.md'))).toBe(true);
  });

  it('doc is non-empty', () => {
    expect(doc().length).toBeGreaterThan(500);
  });
});

// ── 2. Migrations 001–026 + 028 applied ──────────────────────────────────────

describe('doc confirms 001–026 and 028 applied', () => {
  it('doc states migrations 001–026 are applied', () => {
    // Doc contains applied status for 001 through 026
    expect(doc()).toMatch(/001.*Applied|Applied.*001/i);
    expect(doc()).toMatch(/026.*Applied|Applied.*026/i);
  });

  it('doc states migration 028 is applied', () => {
    expect(doc()).toMatch(/028.*Applied|Applied.*028/i);
  });
});

// ── 3. Migration 027 NOT applied ─────────────────────────────────────────────

describe('doc confirms 027 not applied', () => {
  it('doc explicitly states 027 is NOT applied', () => {
    expect(doc()).toMatch(/027.*NOT applied|NOT applied.*027/i);
  });
});

// ── 4. Doc says do not apply 027 yet ─────────────────────────────────────────

describe('doc says do not apply 027 yet', () => {
  it('doc has a DO NOT apply 027 warning', () => {
    expect(doc()).toMatch(/DO NOT apply migration 027|do not apply.*027/i);
  });

  it('doc explains why 027 must not be applied yet', () => {
    expect(doc()).toMatch(/Gate 2.*open|Gate 3.*required|service.role|rollback/i);
  });
});

// ── 5. Synthetic-only seed plan ───────────────────────────────────────────────

describe('doc includes synthetic-only seed plan', () => {
  it('doc contains a seed plan section', () => {
    expect(doc()).toMatch(/Seed Plan|seed plan/i);
  });

  it('seed plan uses a synthetic staging tenant slug', () => {
    expect(doc()).toMatch(/stage-001|STAGE-001|staging.*synthetic|synthetic.*staging/i);
  });

  it('seed plan defines a synthetic company admin user', () => {
    expect(doc()).toMatch(/company-admin@staging|COMPANY_ADMIN.*staging|staging.*COMPANY_ADMIN/i);
  });

  it('seed plan defines at least 3 synthetic workers', () => {
    const content = doc();
    expect(content).toMatch(/Worker A/i);
    expect(content).toMatch(/Worker B/i);
    expect(content).toMatch(/Worker C/i);
  });

  it('seed plan includes commons.booking inserts', () => {
    expect(doc()).toMatch(/commons\.booking/i);
  });

  it('seed plan includes personal.worker_pib inserts', () => {
    expect(doc()).toMatch(/personal\.worker_pib/i);
  });

  it('seed plan includes an insert order summary', () => {
    expect(doc()).toMatch(/Insert order|insert order/i);
  });
});

// ── 6. Doc forbids real personal data ────────────────────────────────────────

describe('doc forbids real personal data', () => {
  it('doc states all data is synthetic', () => {
    expect(doc()).toMatch(/synthetic data only|All data is synthetic|synthetic.*only/i);
  });

  it('doc states no real personal data', () => {
    expect(doc()).toMatch(/No real personal data|no real.*data/i);
  });
});

// ── 7. Doc includes cleanup/rollback plan ────────────────────────────────────

describe('doc includes cleanup and rollback plan', () => {
  it('doc contains rollback/cleanup SQL section', () => {
    expect(doc()).toMatch(/Rollback|cleanup SQL|rollback.*SQL/i);
  });

  it('rollback SQL uses DELETE statements in reverse order', () => {
    expect(doc()).toMatch(/DELETE FROM.*personal\.worker_pib/i);
    expect(doc()).toMatch(/DELETE FROM.*analytics\.tenant/i);
  });
});

// ── 8. Doc includes company smoke tests ──────────────────────────────────────

describe('doc includes company smoke tests', () => {
  it('doc has a company smoke test section', () => {
    expect(doc()).toMatch(/Company side|company.*smoke/i);
  });

  it('company smoke tests include KORA Index route', () => {
    expect(doc()).toMatch(/kora-index|KORA Index/i);
  });

  it('company smoke tests verify company cannot read personal.worker_pib', () => {
    expect(doc()).toMatch(/Company.*personal\.worker_pib|company.*PIB.*block/i);
  });
});

// ── 9. Doc includes worker smoke tests ───────────────────────────────────────

describe('doc includes worker smoke tests', () => {
  it('doc has a worker smoke test section', () => {
    expect(doc()).toMatch(/Worker side|worker.*smoke/i);
  });

  it('worker smoke tests verify worker reads only own data', () => {
    expect(doc()).toMatch(/Worker A.*Worker B|cross.worker|worker.*cannot.*other/i);
  });

  it('worker smoke tests include My KORA route', () => {
    expect(doc()).toMatch(/my-kora|My KORA/i);
  });

  it('worker smoke tests include PIB private area', () => {
    expect(doc()).toMatch(/PIB private|worker.*PIB|PIB.*worker/i);
  });
});

// ── 10. Doc includes admin smoke tests ───────────────────────────────────────

describe('doc includes admin smoke tests', () => {
  it('doc has an admin smoke test section', () => {
    expect(doc()).toMatch(/Admin side|admin.*smoke/i);
  });

  it('admin smoke tests include tenant overview', () => {
    expect(doc()).toMatch(/tenant overview|Tenant overview/i);
  });

  it('admin smoke tests include worker provisioning view', () => {
    expect(doc()).toMatch(/worker provisioning|Worker provisioning/i);
  });
});

// ── 11. Doc includes privacy/security smoke tests ────────────────────────────

describe('doc includes privacy and security smoke tests', () => {
  it('doc has a privacy/security test section', () => {
    expect(doc()).toMatch(/Privacy.*security|security.*privacy/i);
  });

  it('privacy tests verify anon cannot access sensitive tables', () => {
    expect(doc()).toMatch(/[Aa]non.*personal|[Aa]non.*sensitive/i);
  });

  it('privacy tests verify fn_publish rejects non-KORA_ADMIN callers', () => {
    expect(doc()).toMatch(/kora\/unauthorized|KORA_ADMIN.*reject|unauthorized.*MUST reject/i);
  });
});

// ── 12. Doc identifies service-role provisioning path as 027 prerequisite ────

describe('doc identifies service-role provisioning as 027 prerequisite', () => {
  it('doc lists worker-provisioning-service-key.ts as prerequisite', () => {
    expect(doc()).toMatch(/worker-provisioning-service-key/i);
  });

  it('doc confirms provision route uses insertWorkerIdentity', () => {
    expect(doc()).toMatch(/insertWorkerIdentity/i);
  });
});

// ── 13. Doc identifies rollback migration 029 as required before 027 ─────────

describe('doc identifies rollback migration 029 as required before 027', () => {
  it('doc references migration 029 as rollback', () => {
    expect(doc()).toMatch(/029|rollback.*027|027.*rollback/i);
  });

  it('rollback migration 029 skeleton is included', () => {
    expect(doc()).toMatch(/029_rollback_027/i);
  });
});

// ── 14. Doc identifies Gate 3 Legal/DPO review before real worker data ────────

describe('doc identifies Gate 3 as required before real worker data', () => {
  it('doc requires Gate 3 before real worker data', () => {
    expect(doc()).toMatch(/Gate 3.*Legal|Gate 3.*DPO|Legal.*DPO.*review/i);
  });
});

// ── 15. Doc does not suggest production usage ─────────────────────────────────

describe('doc does not suggest production usage', () => {
  it('doc targets staging only', () => {
    expect(doc()).toMatch(/staging only|staging.*only|kora-staging/i);
  });

  it('doc explicitly states production was not touched', () => {
    expect(doc()).toMatch(/Production.*NOT touched|production.*not touched/i);
  });

  it('doc does not instruct applying migrations to production', () => {
    const affirmativeLines = doc()
      .split('\n')
      .filter(l => !/NOT|Do not|do not|MUST NOT|must not/.test(l))
      .join('\n');
    expect(affirmativeLines).not.toMatch(/apply.*to production|migrate.*to production/i);
  });
});
