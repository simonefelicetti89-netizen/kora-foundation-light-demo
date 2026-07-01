/**
 * Gate 2 — Rollback 029 Plan assertions.
 *
 * Verifies that supabase/rollback/029_rollback_027_if_needed.sql exists
 * (quarantined from supabase/migrations/ as of Gate 2.2), is correctly marked
 * as emergency-only, does not introduce dangerous access patterns, and that
 * docs reflect the 027/029 relationship correctly.
 *
 * No SQL is executed. No DB is touched. No migration is applied.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const root = resolve(process.cwd());

function rollback(): string {
  return readFileSync(resolve(root, 'supabase/rollback/029_rollback_027_if_needed.sql'), 'utf-8');
}

function phase1doc(): string {
  return readFileSync(resolve(root, 'docs/archive/gate2/GATE2_PHASE1_POST_MIGRATION_VERIFICATION.md'), 'utf-8');
}

function checklist(): string {
  return readFileSync(resolve(root, 'docs/archive/gate2/GATE2_STAGING_EXECUTION_CHECKLIST.md'), 'utf-8');
}

// ── 1. Rollback 029 exists in quarantine location ────────────────────────────

describe('029_rollback_027_if_needed.sql — existence', () => {
  it('029 file exists in supabase/rollback/ (quarantined from migrations/)', () => {
    expect(existsSync(resolve(root, 'supabase/rollback/029_rollback_027_if_needed.sql'))).toBe(true);
  });

  it('029 is NOT in supabase/migrations/ (pipeline quarantine enforced)', () => {
    expect(existsSync(resolve(root, 'supabase/migrations/029_rollback_027_if_needed.sql'))).toBe(false);
  });

  it('029 is non-empty', () => {
    expect(rollback().length).toBeGreaterThan(200);
  });
});

// ── 2. Emergency rollback language ───────────────────────────────────────────

describe('029 is marked as emergency rollback only', () => {
  it('029 says EMERGENCY ROLLBACK ONLY', () => {
    expect(rollback()).toMatch(/EMERGENCY ROLLBACK ONLY|emergency rollback only/i);
  });

  it('029 warns do not apply unless 027 was applied', () => {
    // The file has "DO NOT APPLY THIS MIGRATION UNLESS:" and "027 has already been applied"
    // in close proximity — check both are present
    const content = rollback();
    expect(content).toMatch(/DO NOT APPLY THIS MIGRATION UNLESS/i);
    expect(content).toMatch(/027 has already been applied/i);
  });

  it('029 requires explicit technical owner approval', () => {
    expect(rollback()).toMatch(/technical owner|explicitly approved/i);
  });

  it('029 restricts production usage', () => {
    expect(rollback()).toMatch(/production.*prohibited|production.*separate approval|Do not apply to production/i);
  });

  it('029 is wrapped in BEGIN/COMMIT transaction', () => {
    expect(rollback()).toMatch(/^BEGIN;/m);
    expect(rollback()).toMatch(/^COMMIT;/m);
  });

  it('029 emits a RAISE NOTICE precondition reminder at runtime', () => {
    expect(rollback()).toMatch(/RAISE NOTICE/);
  });
});

// ── 3. 029 does not disable RLS ───────────────────────────────────────────────

describe('029 does not disable or weaken RLS', () => {
  it('029 does not contain DISABLE ROW LEVEL SECURITY', () => {
    expect(rollback()).not.toMatch(/DISABLE ROW LEVEL SECURITY/i);
  });

  it('029 does not contain NO FORCE ROW LEVEL SECURITY', () => {
    expect(rollback()).not.toMatch(/NO FORCE ROW LEVEL SECURITY/i);
  });
});

// ── 4. 029 does not remove FORCE RLS ─────────────────────────────────────────

describe('029 does not remove FORCE RLS', () => {
  it('029 does not alter RLS settings on any table', () => {
    expect(rollback()).not.toMatch(/ALTER TABLE.*ROW LEVEL SECURITY/i);
  });
});

// ── 5. 029 does not grant anon access ────────────────────────────────────────

describe('029 does not grant anon access', () => {
  it('029 does not grant to anon role', () => {
    expect(rollback()).not.toMatch(/GRANT.*TO anon|TO anon/i);
  });
});

// ── 6. 029 does not grant COMPANY_ADMIN direct access to personal.* ──────────

describe('029 does not grant COMPANY_ADMIN personal.* access', () => {
  it('029 does not create a COMPANY_ADMIN policy on personal.*', () => {
    expect(rollback()).not.toMatch(/COMPANY_ADMIN.*personal\.|policy.*company_admin/i);
  });

  it('029 policies only use kora_role KORA_ADMIN checks', () => {
    const policyChecks = rollback().match(/kora\.kora_role\(\).*=.*'([^']+)'/g) || [];
    policyChecks.forEach(check => {
      expect(check).toMatch(/KORA_ADMIN/);
      expect(check).not.toMatch(/COMPANY_ADMIN|COMPANY_VIEWER|PARTNER|ADVISOR/);
    });
  });
});

// ── 7. 029 does not grant COMPANY_VIEWER direct access to personal.* ─────────

describe('029 does not grant COMPANY_VIEWER personal.* access', () => {
  it('029 does not create a COMPANY_VIEWER policy', () => {
    expect(rollback()).not.toMatch(/COMPANY_VIEWER/i);
  });
});

// ── 8. 029 restores only intended KORA_ADMIN rollback policies ────────────────

describe('029 restores only the 6 policies dropped by 027', () => {
  it('029 restores worker_identity_kora_admin_all', () => {
    expect(rollback()).toMatch(/worker_identity_kora_admin_all/);
  });

  it('029 restores worker_pib_kora_admin_all', () => {
    expect(rollback()).toMatch(/worker_pib_kora_admin_all/);
  });

  it('029 restores worker_pseudonym_map_kora_admin_all', () => {
    expect(rollback()).toMatch(/worker_pseudonym_map_kora_admin_all/);
  });

  it('029 restores worker_profile_kora_admin_all', () => {
    expect(rollback()).toMatch(/worker_profile_kora_admin_all/);
  });

  it('029 restores kora_admin_impact_unit_read', () => {
    expect(rollback()).toMatch(/kora_admin_impact_unit_read/);
  });

  it('029 restores kora_admin_impact_unit_insert', () => {
    expect(rollback()).toMatch(/kora_admin_impact_unit_insert/);
  });

  it('029 uses DROP POLICY IF EXISTS for idempotency before recreating', () => {
    expect(rollback()).toMatch(/DROP POLICY IF EXISTS.*worker_identity_kora_admin_all/);
    expect(rollback()).toMatch(/DROP POLICY IF EXISTS.*worker_pib_kora_admin_all/);
  });
});

// ── 9. 029 includes verification queries in comments ─────────────────────────

describe('029 includes verification queries', () => {
  it('029 includes a post-apply verification section', () => {
    expect(rollback()).toMatch(/POST-APPLY VERIFICATION|verification queries/i);
  });

  it('029 verification checks RLS still enabled', () => {
    expect(rollback()).toMatch(/relrowsecurity|RLS.*enabled/i);
  });

  it('029 verification checks anon has no access', () => {
    expect(rollback()).toMatch(/anon.*no access|grantee.*=.*'anon'/i);
  });

  it('029 verification checks rollback policy names', () => {
    expect(rollback()).toMatch(/worker_identity_kora_admin_all.*worker_pib_kora_admin_all|policyname IN/i);
  });
});

// ── 10. Docs mention 029 ─────────────────────────────────────────────────────

describe('docs mention migration 029', () => {
  it('GATE2_PHASE1_POST_MIGRATION_VERIFICATION.md mentions 029', () => {
    expect(phase1doc()).toMatch(/029/);
  });

  it('GATE2_STAGING_EXECUTION_CHECKLIST.md mentions 029', () => {
    expect(checklist()).toMatch(/029/);
  });

  it('phase1 doc has a Rollback 029 Preparation section', () => {
    expect(phase1doc()).toMatch(/Rollback 029 Preparation|rollback 029 preparation/i);
  });
});

// ── 11. Docs say 027 must not be applied without 029 present ──────────────────

describe('docs require 029 to be present before applying 027', () => {
  it('checklist says do not apply 027 without 029 present', () => {
    expect(checklist()).toMatch(/do not apply.*027.*without.*029|029.*present.*before.*027/i);
  });
});

// ── 12. Docs confirm 029 was NOT applied ──────────────────────────────────────

describe('docs confirm 029 was not applied', () => {
  it('phase1 doc confirms 029 was not applied', () => {
    expect(phase1doc()).toMatch(/029.*NOT.*applied|NOT.*applied.*029|not been applied/i);
  });

  it('checklist says do not apply 029 unless 027 was applied and broke staging', () => {
    expect(checklist()).toMatch(/do not apply 029 unless 027|029.*unless.*027/i);
  });
});

// ── 13. No migration command is suggested by this sprint ─────────────────────

describe('no migration command suggested', () => {
  it('this test file does not import a database client', () => {
    const self = readFileSync(resolve(root, 'tests/unit/gate2-rollback-029-plan.test.ts'), 'utf-8');
    expect(self).not.toMatch(/from ['"]@supabase\/supabase-js['"]|createClient\(|new Pool\(/);
  });

  it('this test file performs only file-system reads and no network calls', () => {
    const self = readFileSync(resolve(root, 'tests/unit/gate2-rollback-029-plan.test.ts'), 'utf-8');
    expect(self).not.toMatch(/fetch\(|axios\.|pg\.query\(|pool\.query\(/);
  });
});
