/**
 * Gate 2 Staging Pre-Patch Checklist — static assertions.
 *
 * These tests verify:
 *  - docs/GATE2_STAGING_EXECUTION_CHECKLIST.md exists and is correct
 *  - migration 011 no longer contains the vestigial extensions.moddatetime trigger block
 *  - migration 019 contains an explicit KORA_ADMIN role guard inside the function body
 *  - migration 027 contains separate-apply precondition language
 *  - no test or doc suggests applying migrations to production
 *  - no migration application command is executed by this sprint
 *
 * No SQL is executed. No DB is touched. No migration is applied.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const root = resolve(process.cwd());

function read(path: string): string {
  return readFileSync(resolve(root, path), 'utf-8');
}

function mig(name: string): string {
  return read(`supabase/migrations/${name}`);
}

function checklist(): string {
  return read('docs/archive/gate2/GATE2_STAGING_EXECUTION_CHECKLIST.md');
}

// ── 1. Checklist doc exists ────────────────────────────────────────────────────

describe('GATE2_STAGING_EXECUTION_CHECKLIST.md', () => {
  it('checklist doc exists', () => {
    expect(existsSync(resolve(root, 'docs/archive/gate2/GATE2_STAGING_EXECUTION_CHECKLIST.md'))).toBe(true);
  });

  it('checklist is non-empty', () => {
    expect(checklist().length).toBeGreaterThan(500);
  });

  // 2. Checklist says staging only
  it('checklist explicitly names the staging project ref', () => {
    expect(checklist()).toMatch(/haqflkurpmeaxpikozjl/);
  });

  it('checklist explicitly says staging only', () => {
    expect(checklist()).toMatch(/staging/i);
  });

  // 3. Checklist says production must not be touched
  it('checklist explicitly prohibits touching production', () => {
    expect(checklist()).toMatch(/DO NOT.*production/i);
  });

  it('checklist warns not to use production connection strings', () => {
    expect(checklist()).toMatch(/production connection string|production project ref/i);
  });

  // 4. Checklist documents apply order 001–026, then 028, then 027 separately
  it('checklist documents apply order 001–026 first', () => {
    expect(checklist()).toMatch(/001.*026|migrations 001/i);
  });

  it('checklist documents applying 028 after 026', () => {
    expect(checklist()).toMatch(/028.*after 026|Apply.*028/i);
  });

  it('checklist documents applying 027 separately', () => {
    expect(checklist()).toMatch(/027.*separate|separately.*027|Pass.*027/i);
  });

  it('checklist states why 027 must be applied separately', () => {
    expect(checklist()).toMatch(/service.role|service_role/i);
  });

  // 5. Checklist documents stop conditions
  it('checklist documents stop conditions section', () => {
    expect(checklist()).toMatch(/STOP CONDITIONS|stop condition/i);
  });

  it('checklist stop conditions mention production detection', () => {
    expect(checklist()).toMatch(/production.*detected|target.*production/i);
  });

  it('checklist stop conditions mention missing rollback plan', () => {
    expect(checklist()).toMatch(/rollback plan/i);
  });

  it('checklist stop conditions mention COMPANY_ADMIN personal access', () => {
    expect(checklist()).toMatch(/COMPANY_ADMIN.*personal|personal.*COMPANY_ADMIN/i);
  });

  // 6. Checklist includes checkpoint queries for high-risk migrations
  it('checklist includes checkpoint queries section', () => {
    expect(checklist()).toMatch(/CHECKPOINT QUERIES/i);
  });

  it('checklist includes checkpoint for mig 001', () => {
    expect(checklist()).toMatch(/After mig 001/i);
  });

  it('checklist includes checkpoint for mig 013', () => {
    expect(checklist()).toMatch(/After mig 013/i);
  });

  it('checklist includes checkpoint for mig 027', () => {
    expect(checklist()).toMatch(/After mig 027/i);
  });

  it('checklist includes checkpoint for mig 028', () => {
    expect(checklist()).toMatch(/After mig 028/i);
  });

  // 7. Checklist documents personal.* privacy verification
  it('checklist documents personal.* privacy verification', () => {
    expect(checklist()).toMatch(/personal\.\*/i);
  });

  it('checklist verifies worker reads only self', () => {
    expect(checklist()).toMatch(/Worker.*self|worker.*own/i);
  });

  it('checklist verifies tenant isolation', () => {
    expect(checklist()).toMatch(/tenant isolation/i);
  });
});

// ── 8. Migration 011 — vestigial moddatetime trigger removed ──────────────────

describe('migration 011 — vestigial trigger block removed', () => {
  it('011 no longer contains CREATE TRIGGER for moddatetime', () => {
    expect(mig('011_worker_cv_share.sql')).not.toMatch(/CREATE TRIGGER.*moddatetime|EXECUTE FUNCTION extensions\.moddatetime/i);
  });

  it('011 no longer contains the vestigial DROP TRIGGER for trg_worker_cv_share_updated_at', () => {
    // The old block created and immediately dropped the trigger; both should be gone.
    const content = mig('011_worker_cv_share.sql');
    // Verify neither the trigger creation nor unconditional drop remain as executable SQL
    expect(content).not.toMatch(/^CREATE TRIGGER trg_worker_cv_share_updated_at/m);
    expect(content).not.toMatch(/^DROP TRIGGER IF EXISTS trg_worker_cv_share_updated_at/m);
  });

  it('011 still contains the table creation', () => {
    expect(mig('011_worker_cv_share.sql')).toMatch(/CREATE TABLE IF NOT EXISTS personal\.worker_cv_share/);
  });

  it('011 still has RLS enabled', () => {
    expect(mig('011_worker_cv_share.sql')).toMatch(/ENABLE ROW LEVEL SECURITY/);
  });
});

// ── 9. Migration 019 — explicit KORA_ADMIN guard ──────────────────────────────

describe('migration 019 — explicit KORA_ADMIN guard inside SECURITY DEFINER function', () => {
  it('019 contains an explicit kora_role KORA_ADMIN check inside the function body', () => {
    expect(mig('019_bridge_uef_to_worker_initiative.sql')).toMatch(/kora\.kora_role\(\).*KORA_ADMIN|KORA_ADMIN.*kora\.kora_role\(\)/);
  });

  it('019 raises an exception when role is not KORA_ADMIN', () => {
    expect(mig('019_bridge_uef_to_worker_initiative.sql')).toMatch(/RAISE EXCEPTION.*kora\/unauthorized|unauthorized.*KORA_ADMIN/i);
  });

  it('019 is SECURITY DEFINER', () => {
    expect(mig('019_bridge_uef_to_worker_initiative.sql')).toMatch(/SECURITY DEFINER/);
  });

  it('019 has fixed search_path', () => {
    expect(mig('019_bridge_uef_to_worker_initiative.sql')).toMatch(/SET search_path/);
  });
});

// ── 10. Migration 027 — separate-apply precondition language ─────────────────

describe('migration 027 — separate-apply strategy documented', () => {
  it('027 contains Gate 2 precondition block', () => {
    expect(mig('027_worker_individual_rls_refactor.sql')).toMatch(/Gate 2.*closed|DO NOT APPLY/i);
  });

  it('027 requires service-role provisioning path confirmation', () => {
    expect(mig('027_worker_individual_rls_refactor.sql')).toMatch(/worker-provisioning-service-key/);
  });

  it('027 warns that applying without preconditions breaks worker provisioning', () => {
    expect(mig('027_worker_individual_rls_refactor.sql')).toMatch(/worker provisioning will break|provisioning.*break/i);
  });

  it('027 uses BEGIN/COMMIT transaction wrapping', () => {
    const content = mig('027_worker_individual_rls_refactor.sql');
    expect(content).toMatch(/^BEGIN;/m);
    expect(content).toMatch(/^COMMIT;/m);
  });

  it('027 emits a RAISE NOTICE precondition reminder at runtime', () => {
    expect(mig('027_worker_individual_rls_refactor.sql')).toMatch(/RAISE NOTICE/);
  });
});

// ── 11. Checklist prohibits production and names staging as the only target ────

describe('checklist prohibits production and is staging-scoped', () => {
  it('checklist explicitly prohibits touching production (DO NOT warning present)', () => {
    // The checklist must contain an explicit prohibition — not an instruction
    expect(checklist()).toMatch(/DO NOT.*production|MUST NOT.*production/i);
  });

  it('checklist names staging as the only migration target', () => {
    expect(checklist()).toMatch(/kora-staging|staging.*only|Target.*staging/i);
  });

  it('checklist does not instruct the reader to apply migrations to production', () => {
    const content = checklist();
    // Look for affirmative apply-to-production instructions — prohibitions are expected and OK.
    // Strip "DO NOT" / "MUST NOT" lines before checking.
    const affirmativeLines = content
      .split('\n')
      .filter(l => !/DO NOT|MUST NOT|do not|must not/.test(l))
      .join('\n');
    expect(affirmativeLines).not.toMatch(/apply.*to production|migrate.*to production/i);
  });
});

// ── 12. No migration application command executed ─────────────────────────────

describe('no migration applied by this sprint', () => {
  it('this test file does not import a Supabase or Postgres client', () => {
    const self = read('tests/unit/gate2-staging-prepatch.test.ts');
    // Must not import live database clients
    expect(self).not.toMatch(/from ['"]@supabase\/supabase-js['"]|createClient\(|new Pool\(|pg\.connect/);
  });

  it('this test file performs only file-system reads (readFileSync / existsSync)', () => {
    const self = read('tests/unit/gate2-staging-prepatch.test.ts');
    expect(self).toMatch(/readFileSync|existsSync/);
    // No network fetch or DB query calls
    expect(self).not.toMatch(/fetch\(|axios\.|pg\.query\(|pool\.query\(/);
  });
});
