/**
 * Gate 2.2 — Privacy Hardening Sprint: Migration 027 Staging Synthetic Only.
 *
 * Verifies that docs/GATE2_2_PRIVACY_HARDENING_027_STAGING.md correctly documents
 * the Gate 2.2 sprint: preconditions, 027 application method, post-027 security
 * verification (C-11/C-12/W-04), service-role provisioning smoke, rollback decision,
 * gate state, and secrets hygiene.
 *
 * No SQL executed. No DB touched. No migration applied. No secrets read.
 * This test verifies documentation completeness — not live DB state.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const DOC_PATH = 'docs/GATE2_2_PRIVACY_HARDENING_027_STAGING.md';

function doc(): string {
  return readFileSync(resolve(process.cwd(), DOC_PATH), 'utf-8');
}

// ── 1. Document identity ──────────────────────────────────────────────────────

describe('gate2-2-privacy-hardening — identity', () => {
  it('doc contains Gate 2.2 title', () => {
    expect(doc()).toMatch(/Gate 2\.2|Gate 2\.2.*Privacy Hardening/i);
  });

  it('doc references staging project ref haqflkurpmeaxpikozjl', () => {
    expect(doc()).toMatch(/haqflkurpmeaxpikozjl/);
  });

  it('doc confirms production NOT touched', () => {
    expect(doc()).toMatch(/Production.*NOT touched|NOT touched.*Production/i);
  });

  it('doc confirms no secrets printed', () => {
    expect(doc()).toMatch(/no secrets|no.*secret.*printed/i);
  });
});

// ── 2. 027 application method ─────────────────────────────────────────────────

describe('gate2-2-privacy-hardening — 027 application', () => {
  it('doc confirms 027 APPLIED to staging', () => {
    expect(doc()).toMatch(/027.*APPLIED|027 applied.*staging/i);
  });

  it('doc confirms explicit SQL file method used (not supabase db push)', () => {
    expect(doc()).toMatch(/supabase db query.*--linked.*--file|explicit SQL file|db query.*027/i);
  });

  it('doc confirms supabase db push NOT used', () => {
    expect(doc()).toMatch(/not.*supabase db push|no.*supabase db push|supabase db push.*NOT/i);
  });

  it('doc confirms supabase migration up NOT used', () => {
    expect(doc()).toMatch(/not.*supabase migration up|migration up.*NOT/i);
  });

  it('doc explains why explicit file was preferred over migration up', () => {
    expect(doc()).toMatch(/029|explicit.*only.*027|avoid.*029/i);
  });
});

// ── 3. Pre-027 baseline ───────────────────────────────────────────────────────

describe('gate2-2-privacy-hardening — pre-027 baseline', () => {
  it('doc records migration 001-026 applied pre-027', () => {
    expect(doc()).toMatch(/001[–-]026|001.*026.*Applied/i);
  });

  it('doc records migration 028 applied pre-027', () => {
    expect(doc()).toMatch(/028.*Applied|028.*✓/i);
  });

  it('doc records 027 as local-only pre-sprint', () => {
    expect(doc()).toMatch(/027.*[Ll]ocal only|027.*not.*remote|local only.*NOT.*remote/i);
  });

  it('doc confirms worker-provisioning-service-key.ts EXISTS before sprint', () => {
    expect(doc()).toMatch(/worker-provisioning-service-key\.ts.*EXISTS|EXISTS.*worker-provisioning-service-key/i);
  });

  it('doc confirms provision route uses insertWorkerIdentity', () => {
    expect(doc()).toMatch(/insertWorkerIdentity|provision.*insertWorkerIdentity/);
  });
});

// ── 4. Post-027 security verification ────────────────────────────────────────

describe('gate2-2-privacy-hardening — policy removal', () => {
  it('doc confirms all 6 kora_admin policies removed', () => {
    expect(doc()).toMatch(/6.*polic|6 kora_admin|six.*polic/i);
  });

  it('doc records worker_identity_kora_admin_all as removed', () => {
    expect(doc()).toMatch(/worker_identity_kora_admin_all/);
  });

  it('doc records worker_pib_kora_admin_all as removed', () => {
    expect(doc()).toMatch(/worker_pib_kora_admin_all/);
  });

  it('doc records worker_pseudonym_map_kora_admin_all as removed', () => {
    expect(doc()).toMatch(/worker_pseudonym_map_kora_admin_all/);
  });

  it('doc records worker_profile_kora_admin_all as removed', () => {
    expect(doc()).toMatch(/worker_profile_kora_admin_all/);
  });

  it('doc records kora_admin_impact_unit_read and insert as removed', () => {
    expect(doc()).toMatch(/kora_admin_impact_unit_read/);
  });
});

// ── 5. C-11, C-12, W-04 results ──────────────────────────────────────────────

describe('gate2-2-privacy-hardening — security checks', () => {
  it('doc records C-11 PASS', () => {
    expect(doc()).toMatch(/C-11.*PASS|PASS.*C-11/);
  });

  it('doc records C-12 PASS', () => {
    expect(doc()).toMatch(/C-12.*PASS|PASS.*C-12/);
  });

  it('doc records W-04 PASS', () => {
    expect(doc()).toMatch(/W-04.*PASS|PASS.*W-04/);
  });

  it('doc confirms personal schema NOT exposed via PostgREST', () => {
    expect(doc()).toMatch(/personal.*not.*PostgREST|personal.*404|personal schema.*not exposed/i);
  });

  it('doc confirms worker_pib has only worker_own policy post-027', () => {
    expect(doc()).toMatch(/worker_pib_worker_own_all|worker_pib.*worker_own/i);
  });

  it('doc confirms worker_identity has only worker_own policies post-027', () => {
    expect(doc()).toMatch(/worker_identity_worker_own_select|worker_identity.*worker_own/i);
  });
});

// ── 6. Service-role provisioning smoke ───────────────────────────────────────

describe('gate2-2-privacy-hardening — service-role provisioning', () => {
  it('doc records service-role provisioning smoke PASS', () => {
    expect(doc()).toMatch(/[Ss]ervice-role provisioning smoke.*PASS|PASS.*service-role.*provisioning/);
  });

  it('doc records INSERT on personal.worker_identity succeeded', () => {
    expect(doc()).toMatch(/INSERT.*personal.*worker_identity|test_rows_inserted.*1|INSERT.*succeed/i);
  });

  it('doc confirms test row was ROLLBACKed (not committed)', () => {
    expect(doc()).toMatch(/ROLLBACK|rollback.*cleaned|test.*clean/i);
  });

  it('doc explains service role bypasses RLS', () => {
    expect(doc()).toMatch(/service.role.*bypass.*RLS|bypass.*RLS.*service.role/i);
  });
});

// ── 7. SECURITY DEFINER functions ─────────────────────────────────────────────

describe('gate2-2-privacy-hardening — security definer functions', () => {
  it('doc confirms SECURITY DEFINER functions intact post-027', () => {
    expect(doc()).toMatch(/SECURITY DEFINER.*intact|SECURITY DEFINER.*function/i);
  });

  it('doc confirms fn_company_activation_summary present', () => {
    expect(doc()).toMatch(/fn_company_activation_summary/);
  });

  it('doc confirms fn_company_worker_status present', () => {
    expect(doc()).toMatch(/fn_company_worker_status/);
  });
});

// ── 8. Rollback decision ──────────────────────────────────────────────────────

describe('gate2-2-privacy-hardening — rollback', () => {
  it('doc records rollback decision: 029 NOT applied', () => {
    expect(doc()).toMatch(/029.*NOT applied|DO NOT apply 029|rollback.*not.*needed/i);
  });

  it('doc records no critical security failure found', () => {
    expect(doc()).toMatch(/[Nn]ot observed|no.*critical|no.*failure/i);
  });

  it('doc confirms 029 still available as safety net', () => {
    expect(doc()).toMatch(/029.*safety net|029.*available|safety net.*029/i);
  });
});

// ── 9. kora_admin_all_uef architectural note ──────────────────────────────────

describe('gate2-2-privacy-hardening — architectural notes', () => {
  it('doc notes that kora_admin_all_uef was NOT removed by 027', () => {
    expect(doc()).toMatch(/kora_admin_all_uef.*NOT removed|kora_admin_all_uef.*intentionally/i);
  });

  it('doc explains uef policy requires SECURITY DEFINER views in next migration', () => {
    expect(doc()).toMatch(/SECURITY DEFINER.*views|next migration|subsequent migration/i);
  });
});

// ── 10. Gate state ────────────────────────────────────────────────────────────

describe('gate2-2-privacy-hardening — gate state', () => {
  it('doc confirms Gate 2 CLOSED', () => {
    expect(doc()).toMatch(/Gate 2.*CLOSED|CLOSED.*Gate 2/i);
  });

  it('doc confirms Gate 2.2 COMPLETE', () => {
    expect(doc()).toMatch(/Gate 2\.2.*COMPLETE|COMPLETE.*Gate 2\.2/i);
  });

  it('doc confirms Gate 3 OPEN — NOT CLOSED', () => {
    expect(doc()).toMatch(/Gate 3.*OPEN.*NOT CLOSED|Gate 3.*OPEN/i);
  });

  it('doc does not claim Gate 3 is closed', () => {
    expect(doc()).not.toMatch(/\bGATE 3\s+CLOSED\b/);
  });

  it('doc confirms Gate 5 OPEN', () => {
    expect(doc()).toMatch(/Gate 5.*OPEN/i);
  });
});

// ── 11. Secrets hygiene ───────────────────────────────────────────────────────

describe('gate2-2-privacy-hardening — secrets hygiene', () => {
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
