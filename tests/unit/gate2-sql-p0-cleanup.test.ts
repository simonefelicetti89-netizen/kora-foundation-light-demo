/**
 * Gate 2 SQL P0 Blocker Cleanup — static source verification.
 *
 * Verifies that the three P0 migration blockers identified in GATE2_SQL_REVIEW_PACK.md
 * have been correctly resolved in the migration SQL files:
 *
 *   1. Migration 005: replaced COMPANY_USER + raw auth.jwt() with canonical helpers.
 *   2. Migration 025: trigger references set_updated_at() not kora.set_updated_at().
 *   3. Migration 027: precondition block present; service-key dependency documented.
 *
 * These tests do NOT run SQL, touch any database, or apply migrations.
 * They read migration files as text and assert on their content.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const root = resolve(process.cwd());

function migration(name: string): string {
  return readFileSync(resolve(root, `supabase/migrations/${name}`), 'utf-8');
}

// Strip SQL line comments (-- …) so negative assertions don't fire on documentation text.
// Block comments (/* … */) are not used in this project's migrations.
function stripLineComments(sql: string): string {
  return sql
    .split('\n')
    .filter(line => !line.trimStart().startsWith('--'))
    .join('\n');
}

// ── Migration 005 ─────────────────────────────────────────────────────────────

describe('migration 005 — canonical claim pattern', () => {
  const sql = () => migration('005_impact_unit_trace_layer.sql');
  // Use executable SQL only for negative assertions — comments may reference the old patterns
  // as documentation of what was removed (e.g. "Never use auth.jwt() ->> 'role'").
  const execSql = () => stripLineComments(sql());

  it('no longer uses COMPANY_USER in executable SQL', () => {
    expect(execSql()).not.toContain('COMPANY_USER');
  });

  it('no longer uses auth.jwt() ->> \'role\' in executable SQL', () => {
    expect(execSql()).not.toMatch(/auth\.jwt\(\)\s*->>\s*'role'/);
  });

  it('uses kora.kora_role() for KORA_ADMIN policy', () => {
    expect(sql()).toMatch(/kora\.kora_role\(\)\s*=\s*'KORA_ADMIN'/);
  });

  it('uses kora.kora_role() IN for company read policy', () => {
    expect(sql()).toMatch(/kora\.kora_role\(\)\s*IN\s*\(/);
  });

  it('grants access to COMPANY_ADMIN', () => {
    expect(sql()).toContain("'COMPANY_ADMIN'");
  });

  it('grants access to COMPANY_VIEWER', () => {
    expect(sql()).toContain("'COMPANY_VIEWER'");
  });

  it('uses kora.tenant_id() for tenant scoping', () => {
    expect(sql()).toContain('kora.tenant_id()');
  });

  it('does not use raw app_metadata tenant_id read for tenant scoping', () => {
    // The old pattern was: auth.jwt() -> 'app_metadata' ->> 'tenant_id'
    // (pre-006 key, bypassing kora.tenant_id())
    expect(sql()).not.toMatch(/app_metadata'\s*->>\s*'tenant_id'/);
  });
});

// ── Migration 025 ─────────────────────────────────────────────────────────────

describe('migration 025 — trigger schema reference', () => {
  const sql = () => migration('025_commons_booking_contribution.sql');
  // Use executable SQL only for the negative assertion — the comment purposely
  // mentions kora.set_updated_at() to explain why it does NOT exist.
  const execSql = () => stripLineComments(sql());

  it('no longer references kora.set_updated_at() in executable SQL', () => {
    expect(execSql()).not.toContain('kora.set_updated_at()');
  });

  it('references set_updated_at() (unqualified, public schema)', () => {
    expect(execSql()).toContain('set_updated_at()');
  });

  it('trigger block uses EXECUTE FUNCTION set_updated_at()', () => {
    expect(execSql()).toMatch(/EXECUTE FUNCTION set_updated_at\(\)/);
  });

  it('includes a comment explaining the trigger helper origin', () => {
    // Check the full source including comments — the explanation is in a comment.
    expect(sql()).toMatch(/migration 001|001_live_v1_foundation|public.*schema|defined in/i);
  });
});

// ── Migration 027 ─────────────────────────────────────────────────────────────

describe('migration 027 — precondition documentation', () => {
  const sql = () => migration('027_worker_individual_rls_refactor.sql');

  it('contains DO NOT APPLY warning', () => {
    expect(sql()).toMatch(/DO NOT APPLY/i);
  });

  it('references worker-provisioning-service-key.ts', () => {
    expect(sql()).toContain('worker-provisioning-service-key.ts');
  });

  it('documents service-role provisioning context', () => {
    expect(sql()).toMatch(/service.role|service_role/i);
  });

  it('references Gate 2', () => {
    expect(sql()).toMatch(/Gate 2/i);
  });

  it('contains a RAISE NOTICE precondition reminder', () => {
    expect(sql()).toContain('RAISE NOTICE');
  });

  it('the RAISE NOTICE mentions the service-key file', () => {
    const noticeBlock = sql().slice(sql().indexOf('RAISE NOTICE'));
    expect(noticeBlock).toContain('worker-provisioning-service-key.ts');
  });

  it('still documents Gate 2 OPEN status', () => {
    expect(sql()).toMatch(/Gate 2 OPEN|Gate 2\s+OPEN/i);
  });

  it('still drops worker_identity_kora_admin_all policy', () => {
    expect(sql()).toContain('worker_identity_kora_admin_all');
  });

  it('still drops worker_pib_kora_admin_all policy', () => {
    expect(sql()).toContain('worker_pib_kora_admin_all');
  });

  it('still drops worker_pseudonym_map_kora_admin_all policy', () => {
    expect(sql()).toContain('worker_pseudonym_map_kora_admin_all');
  });
});

// ── Review pack ───────────────────────────────────────────────────────────────

describe('review pack — P0 cleanup reflected', () => {
  const doc = () =>
    readFileSync(resolve(root, 'docs/archive/gate2/GATE2_SQL_REVIEW_PACK.md'), 'utf-8');

  it('migration 005 entry no longer lists COMPANY_USER as unresolved', () => {
    const lines = doc().split('\n');
    const row005 = lines.find(l => l.includes('| 005 |'));
    expect(row005).toBeDefined();
    // Should contain the "P0 fixed" marker
    expect(row005).toMatch(/P0 fixed|Fixed|fixed/i);
    // Should NOT present COMPANY_USER as an open bug
    const isUnresolved =
      row005?.includes('COMPANY_USER') &&
      !row005?.includes('~~') &&
      !row005?.includes('fixed');
    expect(isUnresolved).toBe(false);
  });

  it('migration 025 entry no longer lists kora.set_updated_at() as unresolved bug', () => {
    const lines = doc().split('\n');
    const row025 = lines.find(l => l.includes('| 025 |'));
    expect(row025).toBeDefined();
    expect(row025).toMatch(/P0 fixed|Fixed|fixed/i);
  });

  it('migration 027 entry notes service-key file exists', () => {
    const lines = doc().split('\n');
    const row027 = lines.find(l => l.includes('| 027 |'));
    expect(row027).toBeDefined();
    expect(row027).toMatch(/EXISTS|exists|B168-P3/i);
  });

  it('migration 027 is still classified as DO_NOT_APPLY_YET', () => {
    const lines = doc().split('\n');
    const row027 = lines.find(l => l.includes('| 027 |'));
    expect(row027).toContain('DO_NOT_APPLY_YET');
  });

  it('contains §9 P0 Cleanup Update section', () => {
    expect(doc()).toMatch(/P0 Cleanup Update/i);
  });

  it('§9 lists all three changed migration files', () => {
    const content = doc();
    const cleanupSection = content.slice(content.indexOf('P0 Cleanup Update'));
    expect(cleanupSection).toContain('005_impact_unit_trace_layer.sql');
    expect(cleanupSection).toContain('025_commons_booking_contribution.sql');
    expect(cleanupSection).toContain('027_worker_individual_rls_refactor.sql');
  });

  it('§9 documents "What remains blocked"', () => {
    const content = doc();
    const cleanupSection = content.slice(content.indexOf('P0 Cleanup Update'));
    expect(cleanupSection).toMatch(/remains blocked|What remains blocked/i);
  });
});

// ── Cross-check: set_updated_at() canonical pattern ──────────────────────────

describe('set_updated_at() canonical pattern across all migrations', () => {
  const migrationsWithTrigger = [
    '001_live_v1_foundation.sql',
    '007_worker_provisioning.sql',
    '008_worker_initiatives.sql',
    '010_partner_profile.sql',
    '012_partner_identity.sql',
    '013_kora_commons.sql',
    '025_commons_booking_contribution.sql',
  ];

  for (const file of migrationsWithTrigger) {
    it(`${file} does not reference kora.set_updated_at() in executable SQL`, () => {
      expect(stripLineComments(migration(file))).not.toContain('kora.set_updated_at()');
    });
  }

  it('set_updated_at() is defined in migration 001 (public schema)', () => {
    const sql = migration('001_live_v1_foundation.sql');
    expect(sql).toMatch(/CREATE OR REPLACE FUNCTION set_updated_at\(\)/);
  });

  it('migration 001 set_updated_at() sets NEW.updated_at = now()', () => {
    const sql = migration('001_live_v1_foundation.sql');
    expect(sql).toMatch(/NEW\.updated_at\s*=\s*now\(\)/);
  });

  it('migration 001 set_updated_at() returns a trigger', () => {
    const sql = migration('001_live_v1_foundation.sql');
    expect(sql).toMatch(/RETURNS trigger/i);
  });
});
