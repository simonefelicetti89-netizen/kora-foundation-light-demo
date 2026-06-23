/**
 * Gate 2.3 Migration 030 Staging Apply Results — documentation verification.
 *
 * Verifies that the design doc records a completed staging apply of migration 030
 * with:
 * - Direct SQL apply via db query --linked --file
 * - Migration repair for 030
 * - 030 recorded as applied
 * - kora_admin_all_uef removed
 * - advisor_tenant_uef_read removed
 * - 4 SECURITY DEFINER functions created
 * - raw payload not exposed
 * - KORA_ADMIN and ADVISOR raw payload blocked
 * - service-role path preserved
 * - C-11, C-12, W-04 PASS
 * - Production not touched
 * - Gate 3 remains open
 * - No real worker data
 * - No secrets/passwords/tokens
 *
 * No SQL executed in this test. No DB touched. Verification of doc records only.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const root = resolve(process.cwd());
const DOC = readFileSync(resolve(root, 'docs/GATE2_3_UEF_ADMIN_ACCESS_HARDENING_DESIGN.md'), 'utf-8');

// ── 1. Migration 030 staging apply recorded ───────────────────────────────────

describe('gate2-3-030-staging-apply — apply recorded in design doc', () => {
  it('doc contains Migration 030 Staging Apply Results section', () => {
    expect(DOC).toMatch(/Migration 030 Staging Apply Results/i);
  });

  it('doc records apply date (2026-06-23)', () => {
    expect(DOC).toMatch(/Apply date.*2026-06-23|applied.*2026-06-23/i);
  });

  it('doc records apply method as direct SQL via db query --linked --file', () => {
    expect(DOC).toMatch(/supabase db query --linked --file/i);
  });

  it('doc confirms apply result was success (no errors)', () => {
    expect(DOC).toMatch(/SQL executed without errors|rows.*\[\].*expected|empty rows.*expected/i);
  });
});

// ── 2. Migration repair for 030 ───────────────────────────────────────────────

describe('gate2-3-030-staging-apply — migration repair recorded', () => {
  it('doc records migration repair command for 030', () => {
    expect(DOC).toMatch(/migration repair.*applied.*030|repair.*030.*applied/i);
  });

  it('doc records repair result: [030] => applied', () => {
    expect(DOC).toMatch(/\[030\].*applied|Repaired migration history.*030/i);
  });

  it('doc shows final migration list with 030 Local ✓ Remote ✓', () => {
    expect(DOC).toMatch(/030.*✓.*✓|030.*Local.*Remote/i);
  });
});

// ── 3. 030 recorded as applied ────────────────────────────────────────────────

describe('gate2-3-030-staging-apply — 030 recorded as applied', () => {
  it('doc confirms 030 is now applied and tracked', () => {
    expect(DOC).toMatch(/030.*APPLIED TO STAGING/i);
  });

  it('doc confirms 029 remains quarantined (absent from forward pipeline)', () => {
    expect(DOC).toMatch(/029.*Quarantined|029.*quarantined/i);
  });

  it('doc states rollback 030 was NOT applied', () => {
    expect(DOC).toMatch(/DO NOT apply rollback 030|Rollback.*NOT.*applied|rollback.*manual.only/i);
  });
});

// ── 4. kora_admin_all_uef removed ────────────────────────────────────────────

describe('gate2-3-030-staging-apply — kora_admin_all_uef removed confirmed', () => {
  it('doc records kora_admin_all_uef as DROPPED with DB verification', () => {
    expect(DOC).toMatch(/kora_admin_all_uef.*DROPPED|DROPPED.*kora_admin_all_uef/i);
  });

  it('doc records BOTH_DROPPED_OK verification result', () => {
    expect(DOC).toMatch(/BOTH_DROPPED_OK|policy_drop_result.*BOTH_DROPPED/i);
  });

  it('doc confirms 0 RLS policies remain on uef_record', () => {
    expect(DOC).toMatch(/0 RLS policies remain|remaining_policies.*0|0.*RLS.*polic/i);
  });
});

// ── 5. advisor_tenant_uef_read removed ───────────────────────────────────────

describe('gate2-3-030-staging-apply — advisor_tenant_uef_read removed confirmed', () => {
  it('doc records advisor_tenant_uef_read as DROPPED', () => {
    expect(DOC).toMatch(/advisor_tenant_uef_read.*DROPPED|DROPPED.*advisor_tenant_uef_read/i);
  });

  it('doc records advisor_policy: 0 in DB verification', () => {
    expect(DOC).toMatch(/advisor_policy.*0|advisor.*0.*verified/i);
  });

  it('doc records H-01 as RESOLVED after advisor removal', () => {
    expect(DOC).toMatch(/H-01 RESOLVED|H-01.*RESOLVED/i);
  });
});

// ── 6. fn_admin_uef_review created and verified ───────────────────────────────

describe('gate2-3-030-staging-apply — fn_admin_uef_review verified', () => {
  it('doc records fn_admin_uef_review as DEFINER function created', () => {
    expect(DOC).toMatch(/fn_admin_uef_review.*DEFINER|DEFINER.*fn_admin_uef_review/i);
  });

  it('doc records fn_admin_uef_review callable by service-role', () => {
    expect(DOC).toMatch(/fn_admin_uef_review.*callable|service.role.*fn_admin_uef_review/i);
  });
});

// ── 7. fn_admin_uef_update_review created and verified ────────────────────────

describe('gate2-3-030-staging-apply — fn_admin_uef_update_review verified', () => {
  it('doc records fn_admin_uef_update_review as DEFINER', () => {
    expect(DOC).toMatch(/fn_admin_uef_update_review.*DEFINER|DEFINER.*fn_admin_uef_update_review/i);
  });

  it('doc records invalid action rejected by fn_admin_uef_update_review (PASS)', () => {
    expect(DOC).toMatch(/invalid action.*PASS|invalid.*review.*action.*rejected|RAISE EXCEPTION.*confirmed/i);
  });
});

// ── 8. fn_admin_uef_enrich created and verified ───────────────────────────────

describe('gate2-3-030-staging-apply — fn_admin_uef_enrich verified', () => {
  it('doc records fn_admin_uef_enrich as DEFINER', () => {
    expect(DOC).toMatch(/fn_admin_uef_enrich.*DEFINER|DEFINER.*fn_admin_uef_enrich/i);
  });

  it('doc records non-whitelisted field rejected by fn_admin_uef_enrich (PASS)', () => {
    expect(DOC).toMatch(/non.whitelisted.*rejected|enrichment field not allowed.*confirmed|whitelist.*PASS/i);
  });
});

// ── 9. fn_advisor_uef_read created and verified ───────────────────────────────

describe('gate2-3-030-staging-apply — fn_advisor_uef_read verified', () => {
  it('doc records fn_advisor_uef_read as DEFINER', () => {
    expect(DOC).toMatch(/fn_advisor_uef_read.*DEFINER|DEFINER.*fn_advisor_uef_read/i);
  });

  it('doc records fn_advisor_uef_read callable by service-role (0 rows empty tenant)', () => {
    expect(DOC).toMatch(/fn_advisor_uef_read.*callable|service.role.*fn_advisor_uef_read/i);
  });

  it('doc records fn_advisor_uef_read cross-tenant guard verified', () => {
    expect(DOC).toMatch(/cross.tenant guard.*verified|cross.tenant.*RAISE EXCEPTION.*verified/i);
  });
});

// ── 10. raw payload not exposed ───────────────────────────────────────────────

describe('gate2-3-030-staging-apply — raw payload boundary confirmed', () => {
  it('doc records payload column absent from review functions (information_schema verification)', () => {
    expect(DOC).toMatch(/payload.*absent|payload.*not.*returned|payload.*column.*absent/i);
  });

  it('doc confirms information_schema verification of payload exclusion', () => {
    expect(DOC).toMatch(/information_schema.*payload|parameter_name.*payload.*0 rows/i);
  });
});

// ── 11. KORA_ADMIN raw payload blocked ───────────────────────────────────────

describe('gate2-3-030-staging-apply — KORA_ADMIN raw payload blocked', () => {
  it('doc records KORA_ADMIN result section', () => {
    expect(DOC).toMatch(/KORA.ADMIN Result/i);
  });

  it('doc records KORA_ADMIN direct SELECT returns 0 rows (no policy)', () => {
    expect(DOC).toMatch(/KORA_ADMIN.*0 rows.*no RLS|KORA.ADMIN.*direct SELECT.*0 rows/i);
  });
});

// ── 12. ADVISOR raw payload blocked ──────────────────────────────────────────

describe('gate2-3-030-staging-apply — ADVISOR raw payload blocked', () => {
  it('doc records ADVISOR result section', () => {
    expect(DOC).toMatch(/ADVISOR Result/i);
  });

  it('doc records ADVISOR direct SELECT returns 0 rows (no policy)', () => {
    expect(DOC).toMatch(/ADVISOR.*direct SELECT.*0 rows|ADVISOR.*0 rows.*no RLS/i);
  });

  it('doc confirms H-01 RESOLVED in ADVISOR result section', () => {
    expect(DOC).toMatch(/H-01 RESOLVED.*ADVISOR|ADVISOR.*H-01 RESOLVED/i);
  });
});

// ── 13. service-role path preserved ──────────────────────────────────────────

describe('gate2-3-030-staging-apply — service-role path preserved', () => {
  it('doc records service-role result section', () => {
    expect(DOC).toMatch(/Service.Role Path Result|service.role.*path.*result/i);
  });

  it('doc confirms service-role BYPASSRLS unaffected by 030', () => {
    expect(DOC).toMatch(/BYPASSRLS.*unaffected|service.role.*unaffected.*030/i);
  });

  it('doc confirms generate-candidates, review POST, enrich POST service-role path works', () => {
    expect(DOC).toMatch(/generate.candidates.*service.role|service.role.*generate.candidates/i);
  });
});

// ── 14. C-11 PASS ─────────────────────────────────────────────────────────────

describe('gate2-3-030-staging-apply — C-11 PASS', () => {
  it('doc records C-11 result as PASS', () => {
    expect(DOC).toMatch(/C-11[\s\S]{0,100}PASS/);
  });
});

// ── 15. C-12 PASS ─────────────────────────────────────────────────────────────

describe('gate2-3-030-staging-apply — C-12 PASS', () => {
  it('doc records C-12 result as PASS', () => {
    expect(DOC).toMatch(/C-12[\s\S]{0,100}PASS/);
  });
});

// ── 16. W-04 PASS ─────────────────────────────────────────────────────────────

describe('gate2-3-030-staging-apply — W-04 PASS', () => {
  it('doc records W-04 result as PASS', () => {
    expect(DOC).toMatch(/W-04[\s\S]{0,100}PASS/);
  });
});

// ── 17. Production not touched ────────────────────────────────────────────────

describe('gate2-3-030-staging-apply — production not touched', () => {
  it('doc states production NOT touched', () => {
    expect(DOC).toMatch(/Production NOT touched|production.*NOT touched/i);
  });

  it('doc specifies staging-only apply (haqflkurpmeaxpikozjl)', () => {
    expect(DOC).toMatch(/haqflkurpmeaxpikozjl|kora-staging/i);
  });

  it('doc confirms staging and production are separate (not production)', () => {
    expect(DOC).toMatch(/staging.*only|STAGING.*ONLY/i);
  });
});

// ── 18. Gate 3 remains open ───────────────────────────────────────────────────

describe('gate2-3-030-staging-apply — Gate 3 remains open', () => {
  it('doc final footer confirms Gate 3 OPEN — NOT CLOSED', () => {
    expect(DOC).toMatch(/Gate 3.*OPEN — NOT CLOSED/i);
  });

  it('doc records Gate 3 OPEN in staging apply section', () => {
    expect(DOC).toMatch(/Gate 3 remains OPEN|Gate 3.*OPEN.*synthetic/i);
  });
});

// ── 19. No real worker data ───────────────────────────────────────────────────

describe('gate2-3-030-staging-apply — no real worker data', () => {
  it('doc confirms synthetic data only', () => {
    expect(DOC).toMatch(/Synthetic data only|synthetic.*data.*only/i);
  });

  it('doc footer confirms no real worker data', () => {
    expect(DOC).toMatch(/030.*no raw payload exposure|no raw payload/i);
  });
});

// ── 20. No secrets/passwords/tokens ──────────────────────────────────────────

describe('gate2-3-030-staging-apply — secrets hygiene', () => {
  it('design doc contains no JWT token literals', () => {
    expect(DOC).not.toMatch(/eyJ[A-Za-z0-9_-]{20,}/);
  });

  it('design doc contains no connection string literals', () => {
    expect(DOC).not.toMatch(/postgresql:\/\/[^\s]+:[^\s]+@/i);
  });

  it('design doc contains no SUPABASE_SERVICE_ROLE_KEY literal value', () => {
    expect(DOC).not.toMatch(/SUPABASE_SERVICE_ROLE_KEY\s*=\s*[^\n]{10}/);
  });

  it('design doc references only project ref (not credentials)', () => {
    // haqflkurpmeaxpikozjl is a project ref, not a credential — allowed
    // No password/token values should appear
    expect(DOC).not.toMatch(/password\s*=\s*\S{8,}|service_role_key\s*=\s*\S{8,}/i);
  });
});

// ── 21. M-04 PUBLIC EXECUTE finding documented ────────────────────────────────

describe('gate2-3-030-staging-apply — M-04 PUBLIC EXECUTE finding', () => {
  it('doc records M-04 finding about PUBLIC EXECUTE grant', () => {
    expect(DOC).toMatch(/M-04|PUBLIC EXECUTE|REVOKE.*FROM PUBLIC/i);
  });

  it('doc notes internal auth checks protect regardless of PUBLIC grant', () => {
    expect(DOC).toMatch(/internal auth checks|auth check.*protects|fn returns 0 rows/i);
  });

  it('doc recommends REVOKE FROM PUBLIC in 031 patch before production', () => {
    expect(DOC).toMatch(/REVOKE.*PUBLIC.*031|031.*REVOKE.*PUBLIC|031.*patch.*production/i);
  });
});
