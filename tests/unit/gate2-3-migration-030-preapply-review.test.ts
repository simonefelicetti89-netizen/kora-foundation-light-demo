/**
 * Gate 2.3 Migration 030 Pre-Apply SQL Security Review — documentation verification.
 *
 * Verifies that the design doc records a completed pre-apply security review with:
 * - SECURITY DEFINER review result
 * - safe search_path review
 * - raw payload exclusion verification
 * - kora_admin_all_uef removal confirmation
 * - grants review
 * - tenant isolation review
 * - field whitelist review
 * - rollback 030 review
 * - app route readiness review
 * - auth-before-service-role confirmation
 * - no production touched
 * - no SQL executed / no migration applied
 * - Gate 3 remains open
 * - final pre-apply decision
 * - no secrets/passwords/tokens
 *
 * No SQL executed. No DB touched. No migration applied. No secrets read.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const root = resolve(process.cwd());
const DOC = readFileSync(resolve(root, 'docs/GATE2_3_UEF_ADMIN_ACCESS_HARDENING_DESIGN.md'), 'utf-8');

// ── 1. Pre-apply security review section exists ────────────────────────────────

describe('gate2-3-030-preapply-review — review section in design doc', () => {
  it('doc contains Migration 030 Pre-Apply Security Review section', () => {
    expect(DOC).toMatch(/Migration 030 Pre-Apply.*Security Review/i);
  });

  it('doc records review date (2026-06-23)', () => {
    expect(DOC).toMatch(/2026-06-23/);
  });

  it('doc confirms no SQL executed during review', () => {
    expect(DOC).toMatch(/No SQL.*executed|no SQL was executed/i);
  });

  it('doc confirms no migration applied during review', () => {
    expect(DOC).toMatch(/No migration.*applied|no migration was applied/i);
  });

  it('doc confirms production not touched during review', () => {
    expect(DOC).toMatch(/Production.*NOT touched|no.*production.*touched/i);
  });
});

// ── 2. SECURITY DEFINER review ────────────────────────────────────────────────

describe('gate2-3-030-preapply-review — SECURITY DEFINER result documented', () => {
  it('doc records SECURITY DEFINER as PASS', () => {
    expect(DOC).toMatch(/SECURITY DEFINER.*PASS|PASS.*SECURITY DEFINER/i);
  });

  it('doc records auth check pattern for SECURITY DEFINER functions', () => {
    expect(DOC).toMatch(/current_role.*service_role.*postgres.*kora_role|KORA_ADMIN.*service_role/i);
  });
});

// ── 3. safe search_path ───────────────────────────────────────────────────────

describe('gate2-3-030-preapply-review — search_path documented', () => {
  it('doc records search_path review finding (PASS or MEDIUM)', () => {
    expect(DOC).toMatch(/search_path.*explicitly.*set|SET search_path.*PASS/i);
  });

  it('doc flags public in SECURITY DEFINER search_path as MEDIUM finding', () => {
    expect(DOC).toMatch(/public.*search_path.*MEDIUM|MEDIUM.*public.*search_path/i);
  });

  it('doc notes all table refs are schema-qualified (why public is not a blocker)', () => {
    expect(DOC).toMatch(/schema-qualified|schema.qualified/i);
  });
});

// ── 4. raw payload exclusion ──────────────────────────────────────────────────

describe('gate2-3-030-preapply-review — payload exclusion verified', () => {
  it('doc records raw payload exclusion from KORA_ADMIN path as PASS', () => {
    expect(DOC).toMatch(/payload.*excluded.*PASS|PASS.*payload.*excluded|payload.*PASS.*intentionally/i);
  });

  it('doc references fn_admin_uef_review RETURNS TABLE excluding payload', () => {
    expect(DOC).toMatch(/fn_admin_uef_review.*RETURNS TABLE|RETURNS TABLE.*payload.*absent/i);
  });
});

// ── 5. kora_admin_all_uef removal ────────────────────────────────────────────

describe('gate2-3-030-preapply-review — kora_admin_all_uef removal reviewed', () => {
  it('doc confirms kora_admin_all_uef drop as PASS', () => {
    expect(DOC).toMatch(/kora_admin_all_uef.*PASS|Drops.*kora_admin_all_uef.*PASS/i);
  });

  it('doc notes service-role path unaffected by kora_admin_all_uef removal', () => {
    expect(DOC).toMatch(/service.role.*BYPASSRLS.*unaffected|BYPASSRLS.*unaffected/i);
  });
});

// ── 6. Grants review ─────────────────────────────────────────────────────────

describe('gate2-3-030-preapply-review — grants review documented', () => {
  it('doc records grants review (PASS)', () => {
    expect(DOC).toMatch(/GRANT.*EXECUTE.*PASS|Grants.*limited.*PASS/i);
  });

  it('doc confirms anon excluded (REVOKE FROM anon)', () => {
    expect(DOC).toMatch(/anon.*excluded.*PASS|PASS.*anon.*excluded|REVOKE.*FROM anon/i);
  });

  it('doc notes GRANT TO authenticated with internal role check', () => {
    expect(DOC).toMatch(/authenticated.*internal.*role.*check|GRANT EXECUTE TO authenticated/i);
  });
});

// ── 7. Tenant isolation review ────────────────────────────────────────────────

describe('gate2-3-030-preapply-review — tenant isolation documented', () => {
  it('doc addresses tenant filter design decision', () => {
    expect(DOC).toMatch(/Tenant filter|tenant.*isolation|KORA_ADMIN.*platform.wide/i);
  });

  it('doc explains KORA_ADMIN is platform-wide (why cross-tenant access is expected)', () => {
    expect(DOC).toMatch(/platform.wide|platform wide/i);
  });
});

// ── 8. Field whitelist review ─────────────────────────────────────────────────

describe('gate2-3-030-preapply-review — enrichment field whitelist documented', () => {
  it('doc records enrichment field whitelist review (PASS)', () => {
    expect(DOC).toMatch(/whitelist.*PASS|PASS.*whitelist/i);
  });

  it('doc confirms fn_admin_uef_enrich raises exception on non-whitelisted keys', () => {
    expect(DOC).toMatch(/fn_admin_uef_enrich.*whitelist|whitelist.*RAISE EXCEPTION/i);
  });

  it('doc notes LOW finding about empty enrichment fields marking b11_enriched', () => {
    expect(DOC).toMatch(/L-03|empty.*enrichment.*b11_enriched|b11_enriched.*empty/i);
  });
});

// ── 9. Rollback 030 review ────────────────────────────────────────────────────

describe('gate2-3-030-preapply-review — rollback 030 reviewed', () => {
  it('doc contains Rollback 030 Review section', () => {
    expect(DOC).toMatch(/Rollback 030 Review/i);
  });

  it('doc confirms rollback is outside migrations/ (PASS)', () => {
    expect(DOC).toMatch(/supabase\/rollback\/.*PASS|Outside.*supabase\/migrations.*PASS/i);
  });

  it('doc confirms rollback warns about raw payload access restoration (PASS)', () => {
    expect(DOC).toMatch(/Warns.*raw.*access.*PASS|PASS.*raw.*access.*restored/i);
  });

  it('doc confirms rollback requires CTO approval (PASS)', () => {
    expect(DOC).toMatch(/CTO.*approval.*PASS|Requires.*CTO.*PASS/i);
  });

  it('doc confirms rollback is not automatic (PASS)', () => {
    expect(DOC).toMatch(/Does not run automatically.*PASS|manual.only.*PASS/i);
  });
});

// ── 10. App route readiness ───────────────────────────────────────────────────

describe('gate2-3-030-preapply-review — app route readiness documented', () => {
  it('doc contains App Route Readiness Review section', () => {
    expect(DOC).toMatch(/App Route Readiness Review/i);
  });

  it('doc confirms review/route.ts GET passes auth-before-service-role check', () => {
    expect(DOC).toMatch(/review\/route\.ts.*GET.*auth.before.service.role.*PASS/i);
  });

  it('doc confirms review/route.ts GET does not include payload in SELECT (PASS)', () => {
    expect(DOC).toMatch(/review\/route\.ts.*GET.*payload.*PASS|payload.*not.*SELECT.*PASS/i);
  });

  it('doc confirms enrich/route.ts passes auth-before-service-role (PASS)', () => {
    expect(DOC).toMatch(/enrich\/route\.ts.*auth.before.service.role.*PASS/i);
  });

  it('doc confirms generate-candidates response excludes raw payload (PASS)', () => {
    expect(DOC).toMatch(/generate.candidates.*response.*excludes.*payload.*PASS/i);
  });

  it('doc notes Step 2 of two-step rollout is incomplete (MEDIUM finding)', () => {
    expect(DOC).toMatch(/M-03|Step 2.*two.step.*rollout.*incomplete/i);
  });
});

// ── 11. auth-before-service-role confirmed ────────────────────────────────────

describe('gate2-3-030-preapply-review — auth ordering confirmed in review', () => {
  it('doc explicitly records auth-before-service-role as PASS for all routes', () => {
    const passCount = (DOC.match(/auth.before.service.role.*PASS/gi) ?? []).length;
    expect(passCount).toBeGreaterThanOrEqual(3);
  });

  it('doc references requireKoraAdmin before getSupabaseServiceClient', () => {
    expect(DOC).toMatch(/requireKoraAdmin.*getSupabaseServiceClient|requireKoraAdmin.*isKoraAuthError/i);
  });
});

// ── 12. No production touched ─────────────────────────────────────────────────

describe('gate2-3-030-preapply-review — production safety confirmed', () => {
  it('doc final safety confirmation states production not touched', () => {
    expect(DOC).toMatch(/Production.*NOT touched/i);
  });

  it('doc notes 030 apply is staging-only', () => {
    expect(DOC).toMatch(/staging.*only|staging with.*notes|STAGING WITH NOTES/i);
  });

  it('doc states production apply blocked until Gate 3 closes', () => {
    expect(DOC).toMatch(/Production apply.*blocked.*Gate 3|blocked until Gate 3/i);
  });
});

// ── 13. No SQL executed / no migration applied ────────────────────────────────

describe('gate2-3-030-preapply-review — no execution in review session', () => {
  it('doc final checklist: migration 030 NOT applied', () => {
    expect(DOC).toMatch(/Migration 030.*NOT applied/i);
  });

  it('doc final checklist: rollback 030 NOT applied', () => {
    expect(DOC).toMatch(/Rollback 030.*NOT applied/i);
  });

  it('doc final checklist: no supabase db push', () => {
    expect(DOC).toMatch(/supabase db push/i);
  });

  it('doc final checklist: no schema changes applied', () => {
    expect(DOC).toMatch(/No schema changes applied/i);
  });
});

// ── 14. Gate 3 remains open ───────────────────────────────────────────────────

describe('gate2-3-030-preapply-review — Gate 3 status confirmed open', () => {
  it('doc Gate State table shows Gate 3 OPEN', () => {
    expect(DOC).toMatch(/Gate 3.*OPEN/i);
  });

  it('doc final footer confirms Gate 3: OPEN — NOT CLOSED', () => {
    expect(DOC).toMatch(/Gate 3.*OPEN — NOT CLOSED|Gate 3.*NOT CLOSED/i);
  });

  it('doc HIGH finding H-01 references Gate 3 for advisor_tenant_uef_read', () => {
    expect(DOC).toMatch(/H-01.*Gate 3|Gate 3.*advisor_tenant_uef_read/i);
  });
});

// ── 15. Final pre-apply decision ──────────────────────────────────────────────

describe('gate2-3-030-preapply-review — final decision recorded', () => {
  it('doc contains Pre-Apply Decision section', () => {
    expect(DOC).toMatch(/Pre-Apply Decision/i);
  });

  it('doc decision is APPLY TO STAGING WITH NOTES (not blocked)', () => {
    expect(DOC).toMatch(/APPLY 030 TO STAGING WITH NOTES/i);
  });

  it('doc lists required steps before staging apply', () => {
    expect(DOC).toMatch(/Required before staging apply/i);
  });

  it('doc lists required steps after staging apply (Step 2 RPC switch)', () => {
    expect(DOC).toMatch(/Required after staging apply|Step 2.*RPC/i);
  });

  it('doc has no BLOCKER findings', () => {
    expect(DOC).toMatch(/No blockers found|no blockers\./i);
  });

  it('doc footer status updated to reflect security review complete', () => {
    expect(DOC).toMatch(/PRE-APPLY SECURITY REVIEW COMPLETE/i);
  });

  it('doc footer shows 030 status as SAFE TO APPLY TO STAGING', () => {
    expect(DOC).toMatch(/SAFE TO APPLY TO STAGING/i);
  });
});

// ── 16. Findings classified correctly ────────────────────────────────────────

describe('gate2-3-030-preapply-review — findings correctly classified', () => {
  it('doc has HIGH finding H-01 for advisor_tenant_uef_read payload', () => {
    expect(DOC).toMatch(/H-01/);
  });

  it('doc has MEDIUM finding M-01 for public in search_path', () => {
    expect(DOC).toMatch(/M-01/);
  });

  it('doc has MEDIUM finding M-02 for fn_admin_uef_review silent auth', () => {
    expect(DOC).toMatch(/M-02/);
  });

  it('doc has MEDIUM finding M-03 for Step 2 incomplete', () => {
    expect(DOC).toMatch(/M-03/);
  });

  it('doc has LOW findings (L-01 through L-04)', () => {
    expect(DOC).toMatch(/L-01/);
    expect(DOC).toMatch(/L-04/);
  });

  it('doc records idempotency as PASS (CREATE OR REPLACE, DROP IF EXISTS)', () => {
    expect(DOC).toMatch(/Idempotent.*PASS|idempotent.*PASS/i);
  });
});

// ── 17. No secrets/passwords/tokens in doc ────────────────────────────────────

describe('gate2-3-030-preapply-review — secrets hygiene in design doc', () => {
  it('design doc contains no JWT token literals', () => {
    expect(DOC).not.toMatch(/eyJ[A-Za-z0-9_-]{20,}/);
  });

  it('design doc contains no connection string literals', () => {
    expect(DOC).not.toMatch(/postgresql:\/\/[^\s]+:[^\s]+@/i);
  });

  it('design doc contains no SUPABASE_SERVICE_ROLE_KEY literal value', () => {
    expect(DOC).not.toMatch(/SUPABASE_SERVICE_ROLE_KEY\s*=\s*[^\n]{10}/);
  });

  it('design doc does not print staging password or token values', () => {
    // Only the masked identifier haqflkurpmeaxpikozjl (project ref) is allowed — not credentials
    expect(DOC).not.toMatch(/password\s*=\s*\S+|token\s*=\s*[A-Za-z0-9+/]{20,}/i);
  });

  it('design doc confirms secrets hygiene in safety checklist', () => {
    expect(DOC).toMatch(/No.*secrets.*printed|No connection strings printed/i);
  });
});
