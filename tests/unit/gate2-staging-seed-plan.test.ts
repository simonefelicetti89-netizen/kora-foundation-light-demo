/**
 * Gate 2 — Staging Seed Plan assertions.
 *
 * Verifies that the seed SQL and smoke doc exist, are correctly marked as
 * staging-only and synthetic, contain no schema changes or policy modifications,
 * and that docs confirm the correct migration state.
 *
 * No SQL is executed. No DB is touched. No migration is applied.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const root = resolve(process.cwd());

function seed(): string {
  return readFileSync(resolve(root, 'supabase/seed/gate2_phase1_minimal_staging_seed.sql'), 'utf-8');
}

function smokedoc(): string {
  return readFileSync(resolve(root, 'docs/GATE2_PHASE1_STAGING_SEED_AND_SMOKE.md'), 'utf-8');
}

// ── 1. Seed SQL file exists ───────────────────────────────────────────────────

describe('gate2_phase1_minimal_staging_seed.sql — existence', () => {
  it('seed SQL file exists', () => {
    expect(existsSync(resolve(root, 'supabase/seed/gate2_phase1_minimal_staging_seed.sql'))).toBe(true);
  });

  it('seed SQL is non-empty', () => {
    expect(seed().length).toBeGreaterThan(500);
  });
});

// ── 2. Seed says STAGING ONLY ─────────────────────────────────────────────────

describe('seed SQL is marked staging-only', () => {
  it('seed says STAGING ONLY', () => {
    expect(seed()).toMatch(/STAGING ONLY|staging only/i);
  });

  it('seed says DO NOT RUN ON PRODUCTION', () => {
    expect(seed()).toMatch(/DO NOT RUN ON PRODUCTION|do not run on production/i);
  });

  it('seed references the staging project ref', () => {
    expect(seed()).toMatch(/haqflkurpmeaxpikozjl/);
  });
});

// ── 3. Seed says synthetic data only ─────────────────────────────────────────

describe('seed SQL is marked synthetic data only', () => {
  it('seed says SYNTHETIC DATA ONLY', () => {
    expect(seed()).toMatch(/SYNTHETIC DATA ONLY|synthetic data only/i);
  });

  it('seed says no real personal data', () => {
    expect(seed()).toMatch(/no real personal|no real.*worker|no real.*company/i);
  });
});

// ── 4. Seed references STAGE-001 ─────────────────────────────────────────────

describe('seed SQL references STAGE-001 tenant', () => {
  it('seed contains STAGE-001 tenant code', () => {
    expect(seed()).toMatch(/STAGE-001/);
  });

  it('seed contains the deterministic tenant UUID', () => {
    expect(seed()).toMatch(/aaaaaaaa-0001-0001-0001-000000000001/);
  });
});

// ── 5. Seed uses only @staging.kora.internal emails ──────────────────────────

describe('seed SQL uses only staging.kora.internal emails', () => {
  it('seed references company-admin@staging.kora.internal', () => {
    expect(seed()).toMatch(/company-admin@staging\.kora\.internal/);
  });

  it('seed references worker-a@staging.kora.internal', () => {
    expect(seed()).toMatch(/worker-a@staging\.kora\.internal/);
  });

  it('seed references worker-b@staging.kora.internal', () => {
    expect(seed()).toMatch(/worker-b@staging\.kora\.internal/);
  });
});

// ── 6. Seed does not contain real personal email domains ─────────────────────

describe('seed SQL does not contain real personal email domains', () => {
  it('seed does not contain @gmail.com', () => {
    expect(seed()).not.toMatch(/@gmail\.com/i);
  });

  it('seed does not contain @yahoo.com or @hotmail.com', () => {
    expect(seed()).not.toMatch(/@yahoo\.com|@hotmail\.com/i);
  });

  it('seed does not contain @kora.io or @acme.it', () => {
    expect(seed()).not.toMatch(/@kora\.io|@acme\.it/);
  });
});

// ── 7. Seed includes rollback/cleanup section ─────────────────────────────────

describe('seed SQL includes rollback cleanup section', () => {
  it('seed contains ROLLBACK / CLEANUP BLOCK header', () => {
    expect(seed()).toMatch(/ROLLBACK.*CLEANUP|CLEANUP.*ROLLBACK/i);
  });

  it('rollback targets STAGE-001 only', () => {
    expect(seed()).toMatch(/DELETE FROM.*personal\.worker_pib/i);
    expect(seed()).toMatch(/DELETE FROM.*analytics\.tenant/i);
  });

  it('rollback includes workforce_baseline cleanup', () => {
    expect(seed()).toMatch(/DELETE FROM.*personal\.workforce_baseline/i);
  });

  it('rollback includes worker_identity cleanup', () => {
    expect(seed()).toMatch(/DELETE FROM.*personal\.worker_identity/i);
  });
});

// ── 8. Seed does not alter schema ─────────────────────────────────────────────

describe('seed SQL does not alter schema', () => {
  it('seed does not contain CREATE TABLE', () => {
    const stripped = seed().replace(/--.*$/gm, '');
    expect(stripped).not.toMatch(/CREATE TABLE/i);
  });

  it('seed does not contain ALTER TABLE', () => {
    const stripped = seed().replace(/--.*$/gm, '');
    expect(stripped).not.toMatch(/ALTER TABLE/i);
  });

  it('seed does not contain DROP TABLE', () => {
    const stripped = seed().replace(/--.*$/gm, '');
    expect(stripped).not.toMatch(/DROP TABLE/i);
  });

  it('seed does not contain CREATE INDEX', () => {
    const stripped = seed().replace(/--.*$/gm, '');
    expect(stripped).not.toMatch(/CREATE INDEX/i);
  });
});

// ── 9. Seed does not create/drop policies ─────────────────────────────────────

describe('seed SQL does not create or drop policies', () => {
  it('seed does not contain CREATE POLICY (outside comments)', () => {
    const stripped = seed().replace(/--.*$/gm, '');
    expect(stripped).not.toMatch(/CREATE POLICY/i);
  });

  it('seed does not contain DROP POLICY (outside comments)', () => {
    const stripped = seed().replace(/--.*$/gm, '');
    expect(stripped).not.toMatch(/DROP POLICY/i);
  });
});

// ── 10. Seed does not change grants ───────────────────────────────────────────

describe('seed SQL does not change grants', () => {
  it('seed does not contain GRANT (outside comments)', () => {
    const stripped = seed().replace(/--.*$/gm, '');
    expect(stripped).not.toMatch(/\bGRANT\b/i);
  });

  it('seed does not contain REVOKE (outside comments)', () => {
    const stripped = seed().replace(/--.*$/gm, '');
    expect(stripped).not.toMatch(/\bREVOKE\b/i);
  });
});

// ── 11. Seed does not disable RLS ─────────────────────────────────────────────

describe('seed SQL does not disable RLS', () => {
  it('seed does not contain DISABLE ROW LEVEL SECURITY', () => {
    expect(seed()).not.toMatch(/DISABLE ROW LEVEL SECURITY/i);
  });

  it('seed does not contain NO FORCE ROW LEVEL SECURITY', () => {
    expect(seed()).not.toMatch(/NO FORCE ROW LEVEL SECURITY/i);
  });
});

// ── 12. Seed does not reference production ────────────────────────────────────

describe('seed SQL does not reference production', () => {
  it('seed does not suggest applying to production', () => {
    const affirmativeLines = seed()
      .split('\n')
      .filter(l => !/DO NOT|MUST NOT|do not|must not|NOT RUN/i.test(l))
      .join('\n');
    expect(affirmativeLines).not.toMatch(/apply.*to production|run.*on production|migrate.*production/i);
  });
});

// ── 13. Smoke doc exists ──────────────────────────────────────────────────────

describe('GATE2_PHASE1_STAGING_SEED_AND_SMOKE.md — existence', () => {
  it('smoke doc exists', () => {
    expect(existsSync(resolve(root, 'docs/GATE2_PHASE1_STAGING_SEED_AND_SMOKE.md'))).toBe(true);
  });

  it('smoke doc is non-empty', () => {
    expect(smokedoc().length).toBeGreaterThan(500);
  });
});

// ── 14. Smoke doc includes seed summary ───────────────────────────────────────

describe('smoke doc includes seed execution summary', () => {
  it('doc has a Seed Execution Summary section', () => {
    expect(smokedoc()).toMatch(/Seed Execution Summary|seed execution summary/i);
  });

  it('doc confirms seed executed successfully', () => {
    expect(smokedoc()).toMatch(/SUCCESS|✓ SUCCESS/i);
  });

  it('doc confirms DML only (no schema changes)', () => {
    expect(smokedoc()).toMatch(/DML only|schema changes.*None/i);
  });
});

// ── 15. Smoke doc includes cleanup ────────────────────────────────────────────

describe('smoke doc includes cleanup / rollback instructions', () => {
  it('doc has a Cleanup / Rollback section', () => {
    expect(smokedoc()).toMatch(/Cleanup.*Rollback|Rollback.*Cleanup/i);
  });

  it('doc specifies delete order', () => {
    expect(smokedoc()).toMatch(/Delete order|delete order/i);
  });

  it('doc mentions auth user deletion is separate', () => {
    expect(smokedoc()).toMatch(/Auth.*deleted separately|Auth Admin API|Dashboard/i);
  });
});

// ── 16. Smoke doc includes company smoke tests ────────────────────────────────

describe('smoke doc includes company smoke tests', () => {
  it('doc has a Company Workspace section', () => {
    expect(smokedoc()).toMatch(/Company Workspace|company.*workspace/i);
  });

  it('company tests include KORA Index', () => {
    expect(smokedoc()).toMatch(/kora-index|KORA Index/i);
  });

  it('company tests include Confidence Score and calibration_status', () => {
    expect(smokedoc()).toMatch(/Confidence Score|calibration_status/i);
  });

  it('company tests verify PIB is blocked', () => {
    expect(smokedoc()).toMatch(/personal\.worker_pib.*0 rows|RLS blocks.*PIB/i);
  });
});

// ── 17. Smoke doc includes worker smoke tests ─────────────────────────────────

describe('smoke doc includes worker smoke tests', () => {
  it('doc has a Worker Workspace section', () => {
    expect(smokedoc()).toMatch(/Worker Workspace|worker.*workspace/i);
  });

  it('worker tests cover Worker A, B, and C', () => {
    expect(smokedoc()).toMatch(/Worker A/);
    expect(smokedoc()).toMatch(/Worker B/);
    expect(smokedoc()).toMatch(/Worker C/);
  });

  it('worker tests verify cross-worker RLS blocks', () => {
    expect(smokedoc()).toMatch(/Worker A.*Worker B.*0 rows|cross-worker RLS/i);
  });

  it('worker tests verify Worker C has no bookings', () => {
    expect(smokedoc()).toMatch(/Worker C.*0 booking|no booking.*Worker C/i);
  });
});

// ── 18. Smoke doc includes admin smoke tests ──────────────────────────────────

describe('smoke doc includes admin smoke tests', () => {
  it('doc has an Admin Workspace section', () => {
    expect(smokedoc()).toMatch(/Admin Workspace|admin.*workspace/i);
  });

  it('admin tests include tenant overview', () => {
    expect(smokedoc()).toMatch(/tenant overview|Tenant overview/i);
  });

  it('admin tests include worker provisioning view', () => {
    expect(smokedoc()).toMatch(/worker provisioning|Worker provisioning/i);
  });
});

// ── 19. Smoke doc includes privacy/security tests ─────────────────────────────

describe('smoke doc includes privacy and security smoke tests', () => {
  it('doc has a Privacy & Security section', () => {
    expect(smokedoc()).toMatch(/Privacy.*Security|security.*privacy/i);
  });

  it('privacy tests verify anon is blocked', () => {
    expect(smokedoc()).toMatch(/[Aa]non.*MUST pass|anon.*0 rows/i);
  });

  it('privacy tests verify company cannot read personal.*', () => {
    expect(smokedoc()).toMatch(/COMPANY_ADMIN.*personal\.|personal\.worker_pib.*0 rows/i);
  });

  it('privacy tests verify fn_publish rejects non-KORA_ADMIN', () => {
    expect(smokedoc()).toMatch(/kora\/unauthorized|KORA_ADMIN.*reject|unauthorized.*MUST reject/i);
  });
});

// ── 20. Smoke doc confirms 027 not applied ────────────────────────────────────

describe('smoke doc confirms migration 027 not applied', () => {
  it('doc explicitly states 027 NOT applied', () => {
    expect(smokedoc()).toMatch(/027.*NOT applied|Migration 027 NOT applied/i);
  });

  it('doc has a warning not to apply 027 yet', () => {
    expect(smokedoc()).toMatch(/DO NOT apply 027|not to apply 027|Migration 027 MUST NOT/i);
  });
});

// ── 21. Smoke doc confirms 029 not applied ────────────────────────────────────

describe('smoke doc confirms migration 029 not applied', () => {
  it('doc states 029 NOT applied', () => {
    expect(smokedoc()).toMatch(/029.*NOT applied|029.*emergency safety net/i);
  });
});
