/**
 * Gate 2.3.1 Migration 031 — PUBLIC EXECUTE Hardening on UEF SECURITY DEFINER Functions.
 *
 * Verifies that migration 031 resolves finding M-04 (PUBLIC EXECUTE on SECURITY DEFINER
 * functions created by migration 030) by:
 * - Revoking PUBLIC EXECUTE from all 4 UEF SECURITY DEFINER functions
 * - Revoking anon EXECUTE explicitly
 * - Granting EXECUTE only to authenticated and service_role
 * - Leaving function bodies unchanged (internal auth checks intact)
 * - Applying to staging only (production NOT touched)
 * - 029 remaining quarantined
 * - Rollback 031 existing outside forward pipeline
 * - raw payload remaining blocked (030 functions unchanged)
 * - Gate 3 remaining OPEN
 *
 * No SQL executed in this test. No DB touched. Doc + SQL file verification only.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const root = resolve(process.cwd());
function src(rel: string): string { return readFileSync(resolve(root, rel), 'utf-8'); }

const SQL = src('supabase/migrations/031_revoke_public_execute_uef_definer_functions.sql');
const RB  = src('supabase/rollback/031_rollback_031_if_needed.sql');
const RB_README = src('supabase/rollback/README.md');
const DOC = src('docs/archive/gate2/GATE2_3_UEF_ADMIN_ACCESS_HARDENING_DESIGN.md');

// ── 1. Migration 031 SQL file structure ───────────────────────────────────────

describe('gate2-3-031-public-execute — migration 031 file structure', () => {
  it('migration 031 file exists in supabase/migrations/', () => {
    expect(existsSync(resolve(root, 'supabase/migrations/031_revoke_public_execute_uef_definer_functions.sql'))).toBe(true);
  });

  it('migration 031 uses BEGIN/COMMIT transaction', () => {
    expect(SQL).toMatch(/^BEGIN;/m);
    expect(SQL).toMatch(/^COMMIT;/m);
  });

  it('migration 031 header mentions M-04 finding', () => {
    expect(SQL).toMatch(/M-04|M04/i);
  });

  it('migration 031 references migration 030 context', () => {
    expect(SQL).toMatch(/030|migration 030/i);
  });

  it('migration 031 describes PUBLIC EXECUTE problem', () => {
    expect(SQL).toMatch(/PUBLIC.*EXECUTE|EXECUTE.*PUBLIC/i);
  });
});

// ── 2. REVOKE EXECUTE FROM PUBLIC ─────────────────────────────────────────────
// REVOKE and FROM PUBLIC are on separate lines in the SQL file.
// We verify: (a) each function name appears in a REVOKE EXECUTE block,
// (b) FROM PUBLIC appears 4 times (count check).

describe('gate2-3-031-public-execute — REVOKE FROM PUBLIC on all 4 functions', () => {
  it('migration 031 contains REVOKE EXECUTE for fn_admin_uef_review', () => {
    expect(SQL).toMatch(/REVOKE EXECUTE ON FUNCTION analytics\.fn_admin_uef_review/i);
  });

  it('migration 031 contains REVOKE EXECUTE for fn_admin_uef_update_review', () => {
    expect(SQL).toMatch(/REVOKE EXECUTE ON FUNCTION analytics\.fn_admin_uef_update_review/i);
  });

  it('migration 031 contains REVOKE EXECUTE for fn_admin_uef_enrich', () => {
    expect(SQL).toMatch(/REVOKE EXECUTE ON FUNCTION analytics\.fn_admin_uef_enrich/i);
  });

  it('migration 031 contains REVOKE EXECUTE for fn_advisor_uef_read', () => {
    expect(SQL).toMatch(/REVOKE EXECUTE ON FUNCTION analytics\.fn_advisor_uef_read/i);
  });

  it('migration 031 revokes PUBLIC from exactly 4 functions (FROM PUBLIC count)', () => {
    // FROM PUBLIC appears on its own line after each REVOKE EXECUTE statement
    const count = (SQL.match(/^\s*FROM PUBLIC;/gm) ?? []).length;
    expect(count).toBe(4);
  });

  it('migration SQL contains FROM PUBLIC at least once', () => {
    expect(SQL).toMatch(/FROM PUBLIC/i);
  });
});

// ── 3. REVOKE EXECUTE FROM anon ───────────────────────────────────────────────

describe('gate2-3-031-public-execute — REVOKE FROM anon on all 4 functions', () => {
  it('migration 031 revokes anon from fn_admin_uef_review', () => {
    expect(SQL).toMatch(/fn_admin_uef_review/i);
    expect(SQL).toMatch(/FROM anon/i);
  });

  it('migration 031 revokes anon from all 4 functions (FROM anon count)', () => {
    // FROM anon appears on its own line after each REVOKE EXECUTE FROM anon statement
    const count = (SQL.match(/^\s*FROM anon;/gm) ?? []).length;
    expect(count).toBe(4);
  });

  it('migration 031 contains FROM anon at least once', () => {
    expect(SQL).toMatch(/FROM anon/i);
  });

  it('migration 031 does not grant EXECUTE to anon', () => {
    expect(SQL).not.toMatch(/GRANT EXECUTE ON FUNCTION.*TO anon/i);
  });
});

// ── 4. Intended grants — service_role ─────────────────────────────────────────

describe('gate2-3-031-public-execute — GRANT TO service_role on all 4 functions', () => {
  it('migration 031 grants service_role on fn_admin_uef_review', () => {
    expect(SQL).toMatch(/GRANT EXECUTE ON FUNCTION analytics\.fn_admin_uef_review/i);
  });

  it('migration 031 grants service_role on fn_admin_uef_update_review', () => {
    expect(SQL).toMatch(/GRANT EXECUTE ON FUNCTION analytics\.fn_admin_uef_update_review/i);
  });

  it('migration 031 grants service_role on fn_admin_uef_enrich', () => {
    expect(SQL).toMatch(/GRANT EXECUTE ON FUNCTION analytics\.fn_admin_uef_enrich/i);
  });

  it('migration 031 grants service_role on fn_advisor_uef_read', () => {
    expect(SQL).toMatch(/GRANT EXECUTE ON FUNCTION analytics\.fn_advisor_uef_read/i);
  });

  it('migration 031 grants service_role on exactly 4 functions (TO service_role count)', () => {
    // TO service_role appears on its own line after each GRANT EXECUTE statement
    const count = (SQL.match(/^\s*TO service_role;/gm) ?? []).length;
    expect(count).toBe(4);
  });

  it('migration 031 explains why service_role is granted', () => {
    expect(SQL).toMatch(/service_role.*PostgREST|PostgREST.*service_role|service_role.*getSupabaseServiceClient/i);
  });
});

// ── 5. Intended grants — authenticated ────────────────────────────────────────

describe('gate2-3-031-public-execute — GRANT TO authenticated on all 4 functions', () => {
  it('migration 031 grants authenticated on exactly 4 functions (TO authenticated count)', () => {
    // TO authenticated appears on its own line after each GRANT EXECUTE statement
    const count = (SQL.match(/^\s*TO authenticated;/gm) ?? []).length;
    expect(count).toBe(4);
  });

  it('migration 031 explains why authenticated is retained', () => {
    expect(SQL).toMatch(/authenticated.*KORA_ADMIN|KORA_ADMIN.*authenticated|authenticated.*JWT/i);
  });
});

// ── 6. Function bodies not changed ────────────────────────────────────────────

describe('gate2-3-031-public-execute — function bodies not changed', () => {
  it('migration 031 does not contain CREATE OR REPLACE FUNCTION', () => {
    expect(SQL).not.toMatch(/CREATE OR REPLACE FUNCTION/i);
  });

  it('migration 031 does not contain DROP FUNCTION', () => {
    expect(SQL).not.toMatch(/DROP FUNCTION/i);
  });

  it('migration 031 contains no CREATE FUNCTION DDL (comments may reference it)', () => {
    // Comments explain PostgreSQL CREATE FUNCTION default behaviour — expected
    // No actual CREATE FUNCTION DDL statement should exist in non-comment lines
    const nonCommentLines = SQL.split('\n').filter(l => !l.trim().startsWith('--'));
    expect(nonCommentLines.join('\n')).not.toMatch(/CREATE\s+FUNCTION/i);
  });

  it('migration 031 does not modify RLS policies', () => {
    expect(SQL).not.toMatch(/CREATE POLICY|DROP POLICY/i);
  });

  it('migration 031 only contains GRANT/REVOKE statements as DDL', () => {
    // Non-comment, non-blank, non-transaction lines should only be GRANT/REVOKE
    const activeLines = SQL.split('\n').filter(l => {
      const t = l.trim();
      return t.length > 0 && !t.startsWith('--') && t !== 'BEGIN;' && t !== 'COMMIT;';
    });
    const nonGrantRevoke = activeLines.filter(l =>
      !l.trim().startsWith('GRANT') && !l.trim().startsWith('REVOKE') &&
      !l.trim().startsWith('TO ') && !l.trim().startsWith('FROM ')
    );
    expect(nonGrantRevoke).toHaveLength(0);
  });
});

// ── 7. Function signatures are precise ────────────────────────────────────────

describe('gate2-3-031-public-execute — precise function signatures', () => {
  it('fn_admin_uef_review signature is (uuid)', () => {
    expect(SQL).toMatch(/fn_admin_uef_review\(uuid\)/i);
  });

  it('fn_admin_uef_update_review signature is (uuid, text, text, text)', () => {
    expect(SQL).toMatch(/fn_admin_uef_update_review\(uuid, text, text, text\)/i);
  });

  it('fn_admin_uef_enrich signature is (uuid, jsonb, text)', () => {
    expect(SQL).toMatch(/fn_admin_uef_enrich\(uuid, jsonb, text\)/i);
  });

  it('fn_advisor_uef_read signature is (uuid)', () => {
    expect(SQL).toMatch(/fn_advisor_uef_read\(uuid\)/i);
  });
});

// ── 8. Migration 031 applied to staging and tracked ──────────────────────────

describe('gate2-3-031-public-execute — 031 applied to staging', () => {
  it('design doc records migration 031 PUBLIC EXECUTE hardening section', () => {
    expect(DOC).toMatch(/Migration 031 PUBLIC EXECUTE Hardening/i);
  });

  it('design doc records apply date (2026-06-23)', () => {
    expect(DOC).toMatch(/031.*2026-06-23|Apply date.*2026-06-23/i);
  });

  it('design doc records 031 migration tracking repair', () => {
    expect(DOC).toMatch(/\[031\].*applied|031.*applied.*tracked/i);
  });

  it('design doc confirms 031 in migration list', () => {
    expect(DOC).toMatch(/031.*✓|031.*applied.*tracked/i);
  });

  it('design doc confirms M-04 resolved in footer', () => {
    expect(DOC).toMatch(/M-04 resolved/i);
  });
});

// ── 9. Post-031 grant state verified in doc ────────────────────────────────────

describe('gate2-3-031-public-execute — post-031 grant state documented', () => {
  it('doc records PUBLIC_EXECUTE_REVOKED_OK result', () => {
    expect(DOC).toMatch(/PUBLIC_EXECUTE_REVOKED_OK/i);
  });

  it('doc records ANON_EXECUTE_ABSENT_OK result', () => {
    expect(DOC).toMatch(/ANON_EXECUTE_ABSENT_OK/i);
  });

  it('doc records service_role has EXECUTE (count 4)', () => {
    expect(DOC).toMatch(/service_role.*count.*4|service_role_count.*4/i);
  });

  it('doc records authenticated has EXECUTE (count 4)', () => {
    expect(DOC).toMatch(/authenticated.*count.*4|authenticated_count.*4/i);
  });

  it('doc records total 12 grant rows post-031', () => {
    expect(DOC).toMatch(/12.*grant|12.*grantee|12 rows/i);
  });

  it('doc records PUBLIC absent from post-031 grant table', () => {
    expect(DOC).toMatch(/PUBLIC.*NO.*revoked|PUBLIC.*ASSENTE|PUBLIC.*revoked/i);
  });
});

// ── 10. M-04 finding resolved ────────────────────────────────────────────────

describe('gate2-3-031-public-execute — M-04 finding resolved', () => {
  it('doc records M-04 finding', () => {
    expect(DOC).toMatch(/M-04/);
  });

  it('doc explains why PUBLIC EXECUTE on SECURITY DEFINER is unsafe', () => {
    expect(DOC).toMatch(/SECURITY DEFINER.*PUBLIC|PUBLIC.*SECURITY DEFINER/i);
  });

  it('doc records M-04 as RESOLVED in final posture table', () => {
    expect(DOC).toMatch(/M-04.*RESOLVED|RESOLVED.*M-04/i);
  });

  it('doc shows final Gate 2.3 security posture table', () => {
    expect(DOC).toMatch(/Final Gate 2\.3 Security Posture|final.*posture/i);
  });
});

// ── 11. KORA_ADMIN path documented ───────────────────────────────────────────

describe('gate2-3-031-public-execute — KORA_ADMIN path works', () => {
  it('doc records fn_admin_uef_review callable after 031', () => {
    expect(DOC).toMatch(/fn_admin_uef_review.*callable|fn_admin_uef_review.*PASS/i);
  });

  it('doc records fn_admin_uef_update_review invalid action still rejected', () => {
    expect(DOC).toMatch(/invalid action.*rejected.*PASS|invalid.*PASS/i);
  });

  it('doc records fn_admin_uef_enrich whitelist enforced', () => {
    expect(DOC).toMatch(/whitelist.*PASS|whitelist.*enforced/i);
  });
});

// ── 12. ADVISOR path documented ──────────────────────────────────────────────

describe('gate2-3-031-public-execute — ADVISOR path works (redacted)', () => {
  it('doc records fn_advisor_uef_read callable after 031', () => {
    expect(DOC).toMatch(/fn_advisor_uef_read.*callable|fn_advisor_uef_read.*PASS/i);
  });

  it('doc confirms raw payload still absent from fn_advisor_uef_read', () => {
    expect(DOC).toMatch(/payload.*absent|payload_columns_found.*0/i);
  });
});

// ── 13. C-11 / C-12 / W-04 PASS ─────────────────────────────────────────────

describe('gate2-3-031-public-execute — C-11, C-12, W-04 PASS', () => {
  it('doc records C-11 PASS', () => {
    expect(DOC).toMatch(/C-11[\s\S]{0,100}PASS/);
  });

  it('doc records C-12 PASS', () => {
    expect(DOC).toMatch(/C-12[\s\S]{0,100}PASS/);
  });

  it('doc records W-04 PASS', () => {
    expect(DOC).toMatch(/W-04[\s\S]{0,100}PASS/);
  });
});

// ── 14. Rollback 031 exists outside forward pipeline ─────────────────────────

describe('gate2-3-031-public-execute — rollback 031 is manual-only', () => {
  it('rollback 031 file exists in supabase/rollback/', () => {
    expect(existsSync(resolve(root, 'supabase/rollback/031_rollback_031_if_needed.sql'))).toBe(true);
  });

  it('rollback 031 is NOT in supabase/migrations/', () => {
    expect(existsSync(resolve(root, 'supabase/migrations/031_rollback_031_if_needed.sql'))).toBe(false);
  });

  it('rollback 031 warns about restoring PUBLIC EXECUTE (security regression)', () => {
    expect(RB).toMatch(/SECURITY REGRESSION|security regression|restores PUBLIC EXECUTE/i);
  });

  it('rollback 031 requires CTO approval', () => {
    expect(RB).toMatch(/CTO.*approval|CTO.*required/i);
  });

  it('rollback 031 re-grants PUBLIC EXECUTE on all 4 functions (TO PUBLIC count)', () => {
    // TO PUBLIC appears on its own line in rollback
    const count = (RB.match(/^\s*TO PUBLIC;/gm) ?? []).length;
    expect(count).toBe(4);
  });

  it('rollback 031 revokes service_role (restoring pre-031 state)', () => {
    expect(RB).toMatch(/REVOKE EXECUTE ON FUNCTION/i);
    expect(RB).toMatch(/FROM service_role/i);
  });

  it('rollback 031 requires DPO notification for real-data environments', () => {
    expect(RB).toMatch(/DPO.*must be informed|DPO.*notification/i);
  });

  it('rollback 031 notes M-04 finding reopened by rollback', () => {
    expect(RB).toMatch(/M-04.*REOPENED|REOPENED.*M-04|Gate 2\.3.*M-04/i);
  });
});

// ── 15. Rollback README updated ───────────────────────────────────────────────

describe('gate2-3-031-public-execute — rollback README updated', () => {
  it('rollback README mentions 031_rollback_031_if_needed.sql', () => {
    expect(RB_README).toMatch(/031_rollback_031_if_needed\.sql/i);
  });

  it('rollback README notes PUBLIC EXECUTE security note for 031', () => {
    expect(RB_README).toMatch(/PUBLIC EXECUTE.*M-04|M-04.*PUBLIC/i);
  });

  it('rollback README notes M-04 is reopened by rollback', () => {
    expect(RB_README).toMatch(/M-04.*REOPENED|REOPENED.*M-04/i);
  });
});

// ── 16. 029 remains quarantined ──────────────────────────────────────────────

describe('gate2-3-031-public-execute — 029 remains quarantined', () => {
  it('029 is NOT in supabase/migrations/', () => {
    expect(existsSync(resolve(root, 'supabase/migrations/029_rollback_027_if_needed.sql'))).toBe(false);
  });

  it('doc confirms 029 quarantined and not applied', () => {
    expect(DOC).toMatch(/029.*quarantined|029.*not applied/i);
  });
});

// ── 17. Raw payload remains blocked ──────────────────────────────────────────

describe('gate2-3-031-public-execute — raw payload remains blocked', () => {
  it('doc records payload absent from all UEF function returns post-031', () => {
    expect(DOC).toMatch(/payload.*absent|payload_columns_found.*0/i);
  });

  it('doc records raw payload blocked for KORA_ADMIN in final posture', () => {
    expect(DOC).toMatch(/KORA_ADMIN.*BLOCKED|KORA.ADMIN.*raw.*blocked/i);
  });

  it('doc records raw payload blocked for ADVISOR in final posture', () => {
    expect(DOC).toMatch(/ADVISOR.*BLOCKED|ADVISOR.*raw.*blocked/i);
  });

  it('migration 031 SQL does not add payload to any function return', () => {
    expect(SQL).not.toMatch(/payload\s+jsonb/i);
  });
});

// ── 18. Production not touched ────────────────────────────────────────────────

describe('gate2-3-031-public-execute — production not touched', () => {
  it('doc states production NOT touched', () => {
    expect(DOC).toMatch(/Production NOT touched/i);
  });

  it('migration 031 header references staging-only apply', () => {
    expect(SQL).toMatch(/haqflkurpmeaxpikozjl|STAGING ONLY|kora-staging/i);
  });

  it('migration 031 does not reference production project ref', () => {
    // Production ref is azdnepfmwrmacruykskm — must not appear in migration
    expect(SQL).not.toMatch(/azdnepfmwrmacruykskm/);
  });
});

// ── 19. Gate 3 remains OPEN ───────────────────────────────────────────────────

describe('gate2-3-031-public-execute — Gate 3 remains OPEN', () => {
  it('doc footer confirms Gate 3 OPEN — NOT CLOSED', () => {
    expect(DOC).toMatch(/Gate 3.*OPEN — NOT CLOSED/i);
  });

  it('migration 031 header confirms Gate 3 OPEN', () => {
    expect(SQL).toMatch(/Gate 3.*OPEN|Gate 3.*NOT CLOSED/i);
  });
});

// ── 20. No real worker data ───────────────────────────────────────────────────

describe('gate2-3-031-public-execute — no real worker data', () => {
  it('doc confirms synthetic data only', () => {
    expect(DOC).toMatch(/synthetic data only|Synthetic data only/i);
  });

  it('migration 031 contains no INSERT statements for worker data', () => {
    // Safety comments may say "no real worker data" — expected
    const nonCommentLines = SQL.split('\n').filter(l => !l.trim().startsWith('--'));
    expect(nonCommentLines.join('\n')).not.toMatch(/INSERT INTO.*worker/i);
  });
});

// ── 21. No secrets / passwords / tokens ──────────────────────────────────────

describe('gate2-3-031-public-execute — secrets hygiene', () => {
  it('migration 031 contains no JWT token literals', () => {
    expect(SQL).not.toMatch(/eyJ[A-Za-z0-9_-]{20,}/);
  });

  it('migration 031 contains no connection string literals', () => {
    expect(SQL).not.toMatch(/postgresql:\/\/[^\s]+:[^\s]+@/i);
  });

  it('migration 031 contains no SUPABASE_SERVICE_ROLE_KEY value', () => {
    expect(SQL).not.toMatch(/SUPABASE_SERVICE_ROLE_KEY\s*=\s*[^\n]{10}/);
  });

  it('rollback 031 contains no JWT token literals', () => {
    expect(RB).not.toMatch(/eyJ[A-Za-z0-9_-]{20,}/);
  });

  it('rollback 031 contains no connection string literals', () => {
    expect(RB).not.toMatch(/postgresql:\/\/[^\s]+:[^\s]+@/i);
  });

  it('design doc contains no JWT token literals', () => {
    expect(DOC).not.toMatch(/eyJ[A-Za-z0-9_-]{20,}/);
  });

  it('design doc contains no connection string literals', () => {
    expect(DOC).not.toMatch(/postgresql:\/\/[^\s]+:[^\s]+@/i);
  });
});

// ── 22. Doc version and footer ────────────────────────────────────────────────

describe('gate2-3-031-public-execute — doc version updated', () => {
  it('doc updated to v1.6 or later', () => {
    expect(DOC).toMatch(/v1\.[6-9]|v[2-9]\.\d/);
  });

  it('doc footer records 031 as APPLIED TO STAGING', () => {
    expect(DOC).toMatch(/031.*APPLIED TO STAGING/i);
  });

  it('doc footer records M-04 resolved', () => {
    expect(DOC).toMatch(/M-04 resolved/i);
  });

  it('doc status shows 031 applied to staging', () => {
    expect(DOC).toMatch(/MIGRATION 031 APPLIED|031 APPLIED|031 status.*APPLIED/i);
  });
});
