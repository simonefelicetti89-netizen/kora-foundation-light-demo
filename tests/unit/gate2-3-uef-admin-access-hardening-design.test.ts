/**
 * Gate 2.3 — UEF Admin Access Hardening Design Review assertions.
 *
 * Verifies that docs/GATE2_3_UEF_ADMIN_ACCESS_HARDENING_DESIGN.md correctly
 * documents the design review: current UEF access model, use-case matrix,
 * risk assessment, hardening options, recommended design, proposed migration
 * 030 plan, and all safety constraints.
 *
 * No SQL executed. No DB touched. No migration applied. No secrets read.
 * This test verifies documentation completeness — not live DB state.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const DOC_PATH = 'docs/GATE2_3_UEF_ADMIN_ACCESS_HARDENING_DESIGN.md';

function doc(): string {
  return readFileSync(resolve(process.cwd(), DOC_PATH), 'utf-8');
}

// ── 1. Document identity ──────────────────────────────────────────────────────

describe('gate2-3-uef-hardening — identity', () => {
  it('doc contains Gate 2.3 UEF admin access hardening title', () => {
    expect(doc()).toMatch(/Gate 2\.3.*UEF.*[Hh]ardening|UEF.*[Aa]dmin.*[Hh]ardening/i);
  });

  it('doc confirms production NOT touched', () => {
    expect(doc()).toMatch(/Production.*NOT touched|NOT touched.*Production/i);
  });

  it('doc confirms no schema changes applied', () => {
    expect(doc()).toMatch(/no schema changes applied|no.*schema.*change.*applied/i);
  });

  it('doc confirms no RLS changes applied', () => {
    expect(doc()).toMatch(/no RLS changes applied|no.*RLS.*change.*applied/i);
  });

  it('doc confirms Gate 3 remains OPEN — NOT CLOSED', () => {
    expect(doc()).toMatch(/Gate 3.*OPEN.*NOT CLOSED|Gate 3.*OPEN/i);
  });

  it('doc confirms no real worker data', () => {
    expect(doc()).toMatch(/no real worker data|real worker data.*not|real.*HR.*blocked/i);
  });
});

// ── 2. analytics.uef_record ───────────────────────────────────────────────────

describe('gate2-3-uef-hardening — analytics.uef_record', () => {
  it('doc references analytics.uef_record', () => {
    expect(doc()).toMatch(/analytics\.uef_record/);
  });

  it('doc notes payload JSONB field as highest risk', () => {
    expect(doc()).toMatch(/payload.*highest risk|payload.*sensitive|payload.*JSONB/i);
  });

  it('doc notes UEF has no direct worker_identity_id column', () => {
    expect(doc()).toMatch(/no.*worker_identity_id|NO.*worker_id|no direct.*worker/i);
  });

  it('doc references the existing v_company_uef_eligibility_summary view', () => {
    expect(doc()).toMatch(/v_company_uef_eligibility_summary/);
  });
});

// ── 3. kora_admin_all_uef ─────────────────────────────────────────────────────

describe('gate2-3-uef-hardening — kora_admin_all_uef', () => {
  it('doc references kora_admin_all_uef policy', () => {
    expect(doc()).toMatch(/kora_admin_all_uef/);
  });

  it('doc identifies contradiction between kora_admin_all_uef and access-matrix.ts', () => {
    expect(doc()).toMatch(/access-matrix|access_matrix|contradiction|conflict/i);
  });

  it('doc recommends dropping kora_admin_all_uef in migration 030', () => {
    expect(doc()).toMatch(/DROP.*kora_admin_all_uef|kora_admin_all_uef.*DROP/i);
  });

  it('doc notes the advisor_tenant_uef_read policy', () => {
    expect(doc()).toMatch(/advisor_tenant_uef_read/);
  });
});

// ── 4. Company must not access raw UEF ───────────────────────────────────────

describe('gate2-3-uef-hardening — company blocked from raw UEF', () => {
  it('doc states company must not access raw UEF', () => {
    expect(doc()).toMatch(/no company.*employer.*raw UEF|company.*aggregate.*only|COMPANY_ADMIN.*0 rows|COMPANY_ADMIN.*cannot.*uef/i);
  });

  it('doc notes v_company_uef_eligibility_summary as aggregate-only path for company', () => {
    expect(doc()).toMatch(/v_company_uef_eligibility_summary.*aggregate|aggregate.*v_company_uef/i);
  });

  it('doc confirms COMPANY_ADMIN cannot SELECT uef_record directly after 030', () => {
    expect(doc()).toMatch(/COMPANY_ADMIN.*cannot.*uef_record|COMPANY_ADMIN.*SELECT.*0.*rows/i);
  });
});

// ── 5. Worker cross-access blocked ────────────────────────────────────────────

describe('gate2-3-uef-hardening — worker cross-access', () => {
  it('doc states worker cross-access must be blocked', () => {
    expect(doc()).toMatch(/no.*worker.*cross.access|cross-worker.*blocked|worker.*cross.access|worker.*cross/i);
  });
});

// ── 6. SECURITY DEFINER option ────────────────────────────────────────────────

describe('gate2-3-uef-hardening — SECURITY DEFINER', () => {
  it('doc recommends SECURITY DEFINER for the hardening approach', () => {
    expect(doc()).toMatch(/SECURITY DEFINER/);
  });

  it('doc proposes v_admin_uef_review as SECURITY DEFINER view', () => {
    expect(doc()).toMatch(/v_admin_uef_review.*SECURITY DEFINER|SECURITY DEFINER.*v_admin_uef_review/i);
  });

  it('doc proposes fn_admin_uef_update_review as SECURITY DEFINER function', () => {
    expect(doc()).toMatch(/fn_admin_uef_update_review/);
  });

  it('doc proposes fn_admin_uef_enrich as SECURITY DEFINER function', () => {
    expect(doc()).toMatch(/fn_admin_uef_enrich/);
  });
});

// ── 7. Service-role path ──────────────────────────────────────────────────────

describe('gate2-3-uef-hardening — service-role path', () => {
  it('doc recommends service-role for INSERT (ingestion pipeline)', () => {
    expect(doc()).toMatch(/service.role.*INSERT|INSERT.*service.role|generate-candidates.*service.role/i);
  });

  it('doc references generate-candidates route as needing service-role switch', () => {
    expect(doc()).toMatch(/generate-candidates/);
  });

  it('doc notes service-role bypasses RLS (by design)', () => {
    expect(doc()).toMatch(/service.role.*bypass.*RLS|bypass.*RLS.*service.role/i);
  });
});

// ── 8. KORA_ADMIN review path ─────────────────────────────────────────────────

describe('gate2-3-uef-hardening — KORA_ADMIN review path', () => {
  it('doc defines a controlled KORA_ADMIN UEF review path post-030', () => {
    expect(doc()).toMatch(/KORA_ADMIN.*review.*path|KORA_ADMIN.*v_admin_uef_review/i);
  });

  it('doc states payload is suppressed/excluded from admin review view', () => {
    expect(doc()).toMatch(/payload.*excluded|payload.*suppressed|payload.*intentionally excluded/i);
  });

  it('doc references app/api/admin/uef/review route as needing update', () => {
    expect(doc()).toMatch(/api\/admin\/uef\/review|admin.*uef.*review.*route/i);
  });
});

// ── 9. Explainability layer ───────────────────────────────────────────────────

describe('gate2-3-uef-hardening — explainability', () => {
  it('doc addresses explainability layer UEF access', () => {
    expect(doc()).toMatch(/[Ee]xplainability.*UEF|explainability.*layer/i);
  });

  it('doc confirms aggregate explainability view is unchanged', () => {
    expect(doc()).toMatch(/aggregate.*explainability.*unchanged|explainability.*unchanged|v_company_uef.*unchanged/i);
  });
});

// ── 10. AI ingestion assistant ────────────────────────────────────────────────

describe('gate2-3-uef-hardening — AI ingestion', () => {
  it('doc addresses AI ingestion assistant use case', () => {
    expect(doc()).toMatch(/AI ingestion|ingestion assistant|ingestion.*pipeline/i);
  });

  it('doc includes ingestion in use-case matrix', () => {
    expect(doc()).toMatch(/ingestion.*use.case|use.case.*ingestion/i);
  });
});

// ── 11. Proposed migration 030 ────────────────────────────────────────────────

describe('gate2-3-uef-hardening — migration 030', () => {
  it('doc proposes migration 030', () => {
    expect(doc()).toMatch(/migration 030|migration.*030/i);
  });

  it('doc states 030 is planned but not yet applied', () => {
    expect(doc()).toMatch(/030.*PLANNED|030.*not.*applied|030.*not yet.*written/i);
  });

  it('doc includes rollback plan for 030', () => {
    expect(doc()).toMatch(/030.*rollback|rollback.*030/i);
  });

  it('doc states rollback file for 030 must NOT be in supabase/migrations/', () => {
    expect(doc()).toMatch(/quarantine.*pattern|NOT.*supabase\/migrations|rollback.*outside.*migrations/i);
  });

  it('doc includes test plan for 030', () => {
    expect(doc()).toMatch(/[Tt]ests required|[Tt]est plan.*030|030.*tests/i);
  });
});

// ── 12. No formula or schema changes applied ──────────────────────────────────

describe('gate2-3-uef-hardening — no changes applied', () => {
  it('doc confirms no formula changes', () => {
    expect(doc()).toMatch(/no.*formula.*change|KORA Index formula.*unchanged|no change.*formula/i);
  });

  it('doc confirms no schema changes applied in this task', () => {
    expect(doc()).toMatch(/design only|no schema.*applied|no.*migration.*applied/i);
  });

  it('doc confirms no migrations applied', () => {
    expect(doc()).toMatch(/no migrations applied|no.*migration.*applied|design.*review.*only/i);
  });

  it('doc confirms 027 remains applied', () => {
    expect(doc()).toMatch(/027.*applied|027.*tracked/i);
  });

  it('doc confirms 029 remains quarantined', () => {
    expect(doc()).toMatch(/029.*quarantined|029.*not.*applied/i);
  });
});

// ── 13. Risk assessment ───────────────────────────────────────────────────────

describe('gate2-3-uef-hardening — risk assessment', () => {
  it('doc contains a risk assessment section', () => {
    expect(doc()).toMatch(/[Rr]isk [Aa]ssessment/);
  });

  it('doc classifies overall risk as MEDIUM', () => {
    expect(doc()).toMatch(/MEDIUM/);
  });

  it('doc notes Gate 3 privacy blocker conflict', () => {
    expect(doc()).toMatch(/Gate 3.*privacy|privacy.*Gate 3|Gate 3.*blocker/i);
  });
});

// ── 14. Secrets hygiene ───────────────────────────────────────────────────────

describe('gate2-3-uef-hardening — secrets hygiene', () => {
  it('doc contains no JWT/access token literals', () => {
    expect(doc()).not.toMatch(/eyJ[A-Za-z0-9_-]{20,}/);
  });

  it('doc contains no service role key patterns', () => {
    expect(doc()).not.toMatch(/service_role[^:]*:[^:]*[A-Za-z0-9]{40,}/i);
  });

  it('doc contains no connection string literals', () => {
    expect(doc()).not.toMatch(/postgresql:\/\/[^\s]+:[^\s]+@/i);
  });

  it('doc contains no password-like assignments', () => {
    expect(doc()).not.toMatch(/password\s*=\s*[^\s]{8,}/i);
  });
});
