/**
 * Gate 2.3 Final Closure Audit — test verification.
 *
 * Verifies that docs/GATE2_3_UEF_ADMIN_ACCESS_HARDENING_DESIGN.md records
 * a complete, correct closure audit for Gate 2.3 UEF Admin Access Hardening,
 * covering staging-only closure with Gate 3 remaining OPEN.
 *
 * No SQL executed. No DB touched. No migrations applied. No secrets read.
 * Code structure and documentation verification only.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const root = resolve(process.cwd());
function src(rel: string): string { return readFileSync(resolve(root, rel), 'utf-8'); }

const DOC   = src('docs/GATE2_3_UEF_ADMIN_ACCESS_HARDENING_DESIGN.md');
const ROUTE = src('app/api/admin/uef/review/route.ts');

// ── 1. Gate 2.3 Final Closure Audit section exists ────────────────────────────

describe('gate2-3-closure — closure audit section', () => {
  it('design doc contains Gate 2.3 Final Closure Audit section', () => {
    expect(DOC).toMatch(/Gate 2\.3 Final Closure Audit/i);
  });

  it('design doc records audit date (2026-06-23)', () => {
    expect(DOC).toMatch(/Audit date.*2026-06-23|2026-06-23.*Audit date/i);
  });

  it('design doc records audit type as read-only', () => {
    expect(DOC).toMatch(/Read-only DB verification|read.only.*verification/i);
  });

  it('design doc states production NOT touched', () => {
    expect(DOC).toMatch(/Production.*NOT touched/i);
  });

  it('design doc version is v1.8', () => {
    expect(DOC).toMatch(/Document version.*v1\.8|v1\.8/);
  });
});

// ── 2. Migration 030 documented in closure audit ──────────────────────────────

describe('gate2-3-closure — migration 030 referenced', () => {
  it('closure audit documents migration 030 applied', () => {
    expect(DOC).toMatch(/030.*Applied and tracked|030.*applied.*tracked/i);
  });

  it('closure audit documents 030 created SECURITY DEFINER functions', () => {
    expect(DOC).toMatch(/fn_admin_uef_review.*030|030.*fn_admin_uef_review/i);
  });

  it('closure audit notes H-01 resolved by 030', () => {
    expect(DOC).toMatch(/H-01.*RESOLVED|RESOLVED.*H-01/i);
  });

  it('030 status in footer is APPLIED TO STAGING', () => {
    expect(DOC).toMatch(/030 status.*APPLIED TO STAGING/i);
  });
});

// ── 3. Migration 031 documented in closure audit ──────────────────────────────

describe('gate2-3-closure — migration 031 referenced', () => {
  it('closure audit documents migration 031 applied', () => {
    expect(DOC).toMatch(/031.*Applied and tracked|031.*applied.*tracked/i);
  });

  it('closure audit documents 031 revoked PUBLIC EXECUTE', () => {
    expect(DOC).toMatch(/031.*PUBLIC EXECUTE|PUBLIC EXECUTE.*031/i);
  });

  it('closure audit notes M-04 resolved by 031', () => {
    expect(DOC).toMatch(/M-04.*RESOLVED|RESOLVED.*M-04/i);
  });

  it('031 status in footer is APPLIED TO STAGING', () => {
    expect(DOC).toMatch(/031 status.*APPLIED TO STAGING/i);
  });
});

// ── 4. Route switch to fn_admin_uef_review documented ────────────────────────

describe('gate2-3-closure — route switch to fn_admin_uef_review', () => {
  it('closure audit documents app route change', () => {
    expect(DOC).toMatch(/app\/api\/admin\/uef\/review\/route\.ts|route.*fn_admin_uef_review RPC/i);
  });

  it('closure audit records GET Case B now calls fn_admin_uef_review', () => {
    expect(DOC).toMatch(/GET Case B.*fn_admin_uef_review|fn_admin_uef_review RPC.*confirmed/i);
  });

  it('closure audit notes M-03 resolved by route switch', () => {
    expect(DOC).toMatch(/M-03.*RESOLVED|RESOLVED.*M-03/i);
  });

  it('route file confirms RPC call to fn_admin_uef_review', () => {
    expect(ROUTE).toMatch(/\.rpc\(['"]fn_admin_uef_review['"]/);
  });
});

// ── 5. H-01 resolved ──────────────────────────────────────────────────────────

describe('gate2-3-closure — H-01 resolved', () => {
  it('H-01 marked RESOLVED in closure audit findings table', () => {
    const auditSection = DOC.substring(DOC.indexOf('18. Gate 2.3 Final Closure Audit'));
    expect(auditSection).toMatch(/H-01.*RESOLVED/i);
  });

  it('closure audit explains fn_advisor_uef_read excludes raw payload', () => {
    expect(DOC).toMatch(/fn_advisor_uef_read.*excludes.*payload|payload.*excluded.*fn_advisor_uef_read/i);
  });

  it('closure audit notes ADVISOR raw payload is blocked', () => {
    const matrix = DOC.substring(DOC.indexOf('Final Access Matrix'));
    expect(matrix).toMatch(/ADVISOR.*NO.*NO|fn_advisor_uef_read.*own tenant/i);
  });
});

// ── 6. M-03 resolved ──────────────────────────────────────────────────────────

describe('gate2-3-closure — M-03 resolved', () => {
  it('M-03 marked RESOLVED in closure audit findings table', () => {
    const auditSection = DOC.substring(DOC.indexOf('18. Gate 2.3 Final Closure Audit'));
    expect(auditSection).toMatch(/M-03.*RESOLVED/i);
  });

  it('M-03 resolution references c096304', () => {
    expect(DOC).toMatch(/c096304.*fn_admin_uef_review|fn_admin_uef_review.*c096304/i);
  });
});

// ── 7. M-04 resolved ──────────────────────────────────────────────────────────

describe('gate2-3-closure — M-04 resolved', () => {
  it('M-04 marked RESOLVED in closure audit findings table', () => {
    const auditSection = DOC.substring(DOC.indexOf('18. Gate 2.3 Final Closure Audit'));
    expect(auditSection).toMatch(/M-04.*RESOLVED/i);
  });

  it('M-04 resolution references migration 031', () => {
    expect(DOC).toMatch(/M-04.*031|031.*M-04/i);
  });
});

// ── 8. KORA_ADMIN raw payload blocked ─────────────────────────────────────────

describe('gate2-3-closure — KORA_ADMIN raw payload blocked', () => {
  it('closure audit objective 1 confirms KORA_ADMIN raw payload blocked', () => {
    const auditSection = DOC.substring(DOC.indexOf('18. Gate 2.3 Final Closure Audit'));
    expect(auditSection).toMatch(/KORA_ADMIN.*payload.*blocked|KORA_ADMIN.*raw.*payload/i);
  });

  it('final access matrix shows KORA_ADMIN JWT has NO raw payload access', () => {
    const matrix = DOC.substring(DOC.indexOf('Final Access Matrix'));
    expect(matrix).toMatch(/KORA_ADMIN.*NO.*NO|fn.*excludes.*payload/i);
  });

  it('route does not return raw payload in response', () => {
    const mapBlock = ROUTE.substring(ROUTE.indexOf('.map('));
    expect(mapBlock).not.toMatch(/^\s+payload:/m);
  });
});

// ── 9. ADVISOR raw payload blocked ────────────────────────────────────────────

describe('gate2-3-closure — ADVISOR raw payload blocked', () => {
  it('closure audit objective 2 confirms ADVISOR raw payload not accessible', () => {
    const auditSection = DOC.substring(DOC.indexOf('18. Gate 2.3 Final Closure Audit'));
    expect(auditSection).toMatch(/ADVISOR.*payload|ADVISOR.*raw.*access/i);
  });

  it('final access matrix shows ADVISOR JWT has NO raw payload access', () => {
    const matrix = DOC.substring(DOC.indexOf('Final Access Matrix'));
    expect(matrix).toMatch(/ADVISOR JWT.*NO.*NO/i);
  });

  it('fn_advisor_uef_read is confirmed in DB with SECURITY DEFINER', () => {
    expect(DOC).toMatch(/fn_advisor_uef_read.*SECURITY DEFINER|prosecdef.*true.*fn_advisor/i);
  });
});

// ── 10. PUBLIC EXECUTE removed ────────────────────────────────────────────────

describe('gate2-3-closure — PUBLIC EXECUTE removed', () => {
  it('closure audit confirms PUBLIC absent from grants query', () => {
    expect(DOC).toMatch(/PUBLIC.*absent|PUBLIC.*revoked.*grants/i);
  });

  it('closure audit records PUBLIC grantee as NO in grant posture table', () => {
    const posture = DOC.substring(DOC.indexOf('Grant posture'));
    expect(posture).toMatch(/PUBLIC.*NO.*Revoked/i);
  });

  it('closure audit confirms grant verification: 12 rows (4 functions × 3 grantees)', () => {
    expect(DOC).toMatch(/12 rows.*4.*3|4 functions.*3 grantees/i);
  });
});

// ── 11. anon excluded ─────────────────────────────────────────────────────────

describe('gate2-3-closure — anon excluded', () => {
  it('closure audit confirms anon absent from grants', () => {
    expect(DOC).toMatch(/anon.*absent|anon.*no.*explicit.*grant/i);
  });

  it('final access matrix shows anon has NO path to UEF data', () => {
    const matrix = DOC.substring(DOC.indexOf('Final Access Matrix'));
    expect(matrix).toMatch(/anon.*NO.*NO.*NO/i);
  });
});

// ── 12. service_role path preserved ───────────────────────────────────────────

describe('gate2-3-closure — service_role path preserved', () => {
  it('closure audit confirms service_role has EXECUTE on all 4 functions', () => {
    expect(DOC).toMatch(/service_role.*YES.*explicit grant|service_role.*EXECUTE.*confirmed/i);
  });

  it('final access matrix shows service_role as YES for direct table SELECT', () => {
    const matrix = DOC.substring(DOC.indexOf('Final Access Matrix'));
    expect(matrix).toMatch(/service_role.*YES.*BYPASSRLS/i);
  });

  it('closure audit notes service_role ingestion path functional (objective 9)', () => {
    const auditSection = DOC.substring(DOC.indexOf('18. Gate 2.3 Final Closure Audit'));
    expect(auditSection).toMatch(/service.role.*ingestion.*functional|service.role.*system.*path.*functional/i);
  });
});

// ── 13. Company aggregate-only boundary ───────────────────────────────────────

describe('gate2-3-closure — company aggregate-only boundary', () => {
  it('final access matrix shows COMPANY_ADMIN cannot access raw UEF', () => {
    const matrix = DOC.substring(DOC.indexOf('Final Access Matrix'));
    expect(matrix).toMatch(/COMPANY_ADMIN.*NO.*NO.*NO|company.*aggregate/i);
  });

  it('closure audit notes company roles cannot see raw UEF (objective 14)', () => {
    const auditSection = DOC.substring(DOC.indexOf('18. Gate 2.3 Final Closure Audit'));
    expect(auditSection).toMatch(/Company.*cannot.*raw UEF|company.*0 rows.*RLS/i);
  });
});

// ── 14. Worker privacy boundary ───────────────────────────────────────────────

describe('gate2-3-closure — worker privacy boundary', () => {
  it('final access matrix shows WORKER JWT cannot access raw UEF', () => {
    const matrix = DOC.substring(DOC.indexOf('Final Access Matrix'));
    expect(matrix).toMatch(/WORKER JWT.*NO.*NO|worker.*0 rows/i);
  });

  it('closure audit notes worker roles cannot see raw/cross-worker UEF (objective 15)', () => {
    const auditSection = DOC.substring(DOC.indexOf('18. Gate 2.3 Final Closure Audit'));
    expect(auditSection).toMatch(/Worker.*cannot.*raw.*UEF|worker.*RLS.*0 rows/i);
  });
});

// ── 15. Rollback files manual-only ────────────────────────────────────────────

describe('gate2-3-closure — rollback files manual-only', () => {
  it('closure audit notes rollback 030 and 031 must not be applied without CTO+DPO approval', () => {
    expect(DOC).toMatch(/CTO.*DPO.*approval|rollback.*CTO.*DPO/i);
  });

  it('closure audit confirms rollback files are manual-only', () => {
    expect(DOC).toMatch(/Rollback.*manual.only|manual.only.*rollback/i);
  });

  it('supabase/rollback directory contains both rollback files', () => {
    const fs = require('fs');
    expect(fs.existsSync(resolve(root, 'supabase/rollback/030_rollback_030_if_needed.sql'))).toBe(true);
    expect(fs.existsSync(resolve(root, 'supabase/rollback/031_rollback_031_if_needed.sql'))).toBe(true);
  });

  it('rollback files are NOT in supabase/migrations/', () => {
    const fs = require('fs');
    const migrations = fs.readdirSync(resolve(root, 'supabase/migrations'));
    expect(migrations.some((f: string) => f.includes('rollback'))).toBe(false);
  });
});

// ── 16. Migration 029 quarantined ─────────────────────────────────────────────

describe('gate2-3-closure — migration 029 quarantined', () => {
  it('closure audit states 029 quarantined and not in forward pipeline', () => {
    expect(DOC).toMatch(/029.*QUARANTINED|029.*quarantine/i);
  });

  it('closure audit confirms 029 absent from remote tracking', () => {
    expect(DOC).toMatch(/029.*absent|029.*quarantined.*rollback/i);
  });

  it('029 is in supabase/rollback not supabase/migrations', () => {
    const fs = require('fs');
    expect(fs.existsSync(resolve(root, 'supabase/rollback/029_rollback_027_if_needed.sql'))).toBe(true);
    const migrations = fs.readdirSync(resolve(root, 'supabase/migrations'));
    expect(migrations.some((f: string) => f.startsWith('029'))).toBe(false);
  });
});

// ── 17. Gate 3 remains OPEN ───────────────────────────────────────────────────

describe('gate2-3-closure — Gate 3 remains OPEN', () => {
  it('closure audit final verdict explicitly states Gate 3 OPEN', () => {
    const verdict = DOC.substring(DOC.indexOf('Final Verdict'));
    expect(verdict).toMatch(/Gate 3.*OPEN|Gate 3.*must close/i);
  });

  it('closure audit section 18.9 has Gate 3 dependency', () => {
    expect(DOC).toMatch(/Gate 3 Dependency/i);
  });

  it('doc footer confirms Gate 3 OPEN — NOT CLOSED', () => {
    expect(DOC).toMatch(/Gate 3.*OPEN — NOT CLOSED/i);
  });

  it('production apply of 030/031 is blocked until Gate 3 closes', () => {
    expect(DOC).toMatch(/Production apply.*blocked.*Gate 3|blocked until Gate 3/i);
  });
});

// ── 18. Real worker data remains blocked ──────────────────────────────────────

describe('gate2-3-closure — real worker data blocked', () => {
  it('closure audit states no real worker data created or imported', () => {
    expect(DOC).toMatch(/No real worker data.*created.*imported|real worker data.*NOT.*authorized/i);
  });

  it('doc-level banner confirms no real worker data', () => {
    expect(DOC).toMatch(/No real worker data/i);
  });

  it('route does not import any real data file', () => {
    expect(ROUTE).not.toMatch(/import.*workers\.json|import.*real.*data/i);
  });
});

// ── 19. Production not authorized ─────────────────────────────────────────────

describe('gate2-3-closure — production not authorized', () => {
  it('final verdict explicitly states this does not authorize production use', () => {
    const verdict = DOC.substring(DOC.indexOf('Final Verdict'));
    expect(verdict).toMatch(/does not authorize.*production|production.*NOT authorized/i);
  });

  it('closure audit footer notes production apply requires Gate 3', () => {
    expect(DOC).toMatch(/NOT authorized until Gate 3/i);
  });

  it('production project is NOT the linked project', () => {
    // Staging project ref: haqflkurpmeaxpikozjl (linked)
    // Production project ref: azdnepfmwrmacruykskm (NOT linked)
    // Verify doc does not claim production was touched
    expect(DOC).not.toMatch(/Production.*APPLIED|production.*azdnepfmwrmacruykskm.*applied/i);
  });
});

// ── 20. No secrets/passwords/tokens ──────────────────────────────────────────

describe('gate2-3-closure — secrets hygiene', () => {
  it('design doc contains no JWT token literals', () => {
    expect(DOC).not.toMatch(/eyJ[A-Za-z0-9_-]{20,}/);
  });

  it('design doc contains no connection string literals', () => {
    expect(DOC).not.toMatch(/postgresql:\/\/[^\s]+:[^\s]+@/i);
  });

  it('design doc does not print SUPABASE_SERVICE_ROLE_KEY value', () => {
    expect(DOC).not.toMatch(/SUPABASE_SERVICE_ROLE_KEY\s*=\s*[^\n]{10}/);
  });

  it('design doc does not print staging password or token values', () => {
    expect(DOC).not.toMatch(/password\s*=\s*\S{8,}|token\s*=\s*[A-Za-z0-9+/]{20,}/i);
  });

  it('route contains no JWT token literals', () => {
    expect(ROUTE).not.toMatch(/eyJ[A-Za-z0-9_-]{20,}/);
  });

  it('route contains no connection string literals', () => {
    expect(ROUTE).not.toMatch(/postgresql:\/\/[^\s]+:[^\s]+@/i);
  });
});

// ── Bonus: Final verdict wording ──────────────────────────────────────────────

describe('gate2-3-closure — final verdict wording correct', () => {
  it('final verdict states closure is for staging synthetic data ONLY', () => {
    expect(DOC).toMatch(/technically closed for staging synthetic data only/i);
  });

  it('final verdict states this does not authorize real worker data', () => {
    expect(DOC).toMatch(/does not authorize real worker data/i);
  });

  it('doc Gate 2.3 status line reflects closure', () => {
    expect(DOC).toMatch(/Gate 2\.3 status.*CLOSED FOR STAGING SYNTHETIC DATA/i);
  });

  it('all 3 resolved HIGH/MEDIUM findings are correct (H-01, M-03, M-04)', () => {
    const auditSection = DOC.substring(DOC.indexOf('18. Gate 2.3 Final Closure Audit'));
    expect(auditSection).toMatch(/H-01.*RESOLVED/i);
    expect(auditSection).toMatch(/M-03.*RESOLVED/i);
    expect(auditSection).toMatch(/M-04.*RESOLVED/i);
  });

  it('M-01 and M-02 remain OPEN BEFORE PRODUCTION (not prematurely closed)', () => {
    const auditSection = DOC.substring(DOC.indexOf('18. Gate 2.3 Final Closure Audit'));
    expect(auditSection).toMatch(/M-01.*OPEN BEFORE PRODUCTION/i);
    expect(auditSection).toMatch(/M-02.*ACCEPTED FOR STAGING ONLY|M-02.*OPEN BEFORE PRODUCTION/i);
  });
});
