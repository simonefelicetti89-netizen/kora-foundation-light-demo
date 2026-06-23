/**
 * Gate 2.3 Migration 030 — Advisor Raw Payload Revision (H-01 fix).
 *
 * Verifies that migration 030 resolves finding H-01 (advisor_tenant_uef_read
 * exposing raw payload to ADVISOR role) by:
 * - Dropping advisor_tenant_uef_read (no direct table SELECT for ADVISOR)
 * - Adding fn_advisor_uef_read (SECURITY DEFINER, payload excluded, tenant-scoped)
 * - Preserving tenant scoping with explicit cross-tenant RAISE EXCEPTION
 * - Preserving KORA_ADMIN raw payload block
 * - Preserving company/worker raw UEF blocks
 * - Preserving service-role path
 * - Updating rollback to restore/warn both policies
 * - No production touched, no SQL executed, no migration applied.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const root = resolve(process.cwd());

function src(relPath: string): string {
  return readFileSync(resolve(root, relPath), 'utf-8');
}

const SQL = src('supabase/migrations/030_uef_admin_access_hardening.sql');
const RB  = src('supabase/rollback/030_rollback_030_if_needed.sql');
const DOC = src('docs/GATE2_3_UEF_ADMIN_ACCESS_HARDENING_DESIGN.md');

// ── 1. advisor_tenant_uef_read is dropped ─────────────────────────────────────

describe('gate2-3-030-advisor — advisor_tenant_uef_read dropped', () => {
  it('migration 030 drops advisor_tenant_uef_read', () => {
    expect(SQL).toMatch(/DROP POLICY IF EXISTS advisor_tenant_uef_read ON analytics\.uef_record/i);
  });

  it('migration 030 does NOT create/recreate advisor_tenant_uef_read', () => {
    expect(SQL).not.toMatch(/CREATE POLICY.*advisor_tenant_uef_read/i);
  });

  it('migration 030 header explains H-01 revision for ADVISOR path', () => {
    expect(SQL).toMatch(/advisor_tenant_uef_read.*DROPPATA|droppata.*advisor_tenant_uef_read/i);
  });

  it('migration 030 VERIFICA block expects 0 policies after apply', () => {
    // The verification query should show kora_admin_all_uef AND advisor_tenant_uef_read absent
    expect(SQL).toMatch(/0 righe|kora_admin_all_uef ASSENTE.*advisor_tenant_uef_read ASSENTE/i);
  });
});

// ── 2. fn_advisor_uef_read created ───────────────────────────────────────────

describe('gate2-3-030-advisor — fn_advisor_uef_read created', () => {
  it('migration 030 creates fn_advisor_uef_read function', () => {
    expect(SQL).toMatch(/CREATE OR REPLACE FUNCTION analytics\.fn_advisor_uef_read/i);
  });

  it('fn_advisor_uef_read uses SECURITY DEFINER', () => {
    const fnStart = SQL.indexOf('fn_advisor_uef_read');
    const fnBlock = SQL.substring(fnStart, SQL.indexOf('GRANT EXECUTE ON FUNCTION analytics.fn_advisor_uef_read'));
    expect(fnBlock).toMatch(/SECURITY DEFINER/);
  });

  it('fn_advisor_uef_read sets search_path safely', () => {
    const fnStart = SQL.indexOf('fn_advisor_uef_read');
    const fnBlock = SQL.substring(fnStart, SQL.indexOf('GRANT EXECUTE ON FUNCTION analytics.fn_advisor_uef_read'));
    expect(fnBlock).toMatch(/SET search_path/i);
  });

  it('fn_advisor_uef_read uses LANGUAGE plpgsql (for RAISE EXCEPTION auth check)', () => {
    const fnStart = SQL.indexOf('analytics.fn_advisor_uef_read');
    const fnBlock = SQL.substring(fnStart, SQL.indexOf('BEGIN', SQL.indexOf('analytics.fn_advisor_uef_read')));
    expect(fnBlock).toMatch(/LANGUAGE plpgsql/i);
  });
});

// ── 3. ADVISOR raw payload excluded ──────────────────────────────────────────

describe('gate2-3-030-advisor — payload excluded from fn_advisor_uef_read', () => {
  it('fn_advisor_uef_read RETURNS TABLE does not include payload jsonb', () => {
    const fnStart = SQL.indexOf('analytics.fn_advisor_uef_read');
    const returnsStart = SQL.indexOf('RETURNS TABLE', fnStart);
    const returnsEnd = SQL.indexOf('LANGUAGE plpgsql', returnsStart);
    const returnsBlock = SQL.substring(returnsStart, returnsEnd);
    expect(returnsBlock).not.toMatch(/^\s+payload\s+jsonb/m);
  });

  it('fn_advisor_uef_read documents payload as intentionally absent', () => {
    expect(SQL).toMatch(/payload.*intentionally absent|payload JSONB intentionally absent/i);
  });

  it('fn_advisor_uef_read does not include participants column (small-team risk)', () => {
    const fnStart = SQL.indexOf('analytics.fn_advisor_uef_read');
    const returnsStart = SQL.indexOf('RETURNS TABLE', fnStart);
    const returnsEnd = SQL.indexOf('LANGUAGE plpgsql', returnsStart);
    const returnsBlock = SQL.substring(returnsStart, returnsEnd);
    // participants should not be in ADVISOR return columns (Gate 3 small-team risk)
    expect(returnsBlock).not.toMatch(/^\s+participants\s+integer/m);
  });

  it('fn_advisor_uef_read does not include raw_amount_value (PII risk)', () => {
    const fnStart = SQL.indexOf('analytics.fn_advisor_uef_read');
    const returnsStart = SQL.indexOf('RETURNS TABLE', fnStart);
    const returnsEnd = SQL.indexOf('LANGUAGE plpgsql', returnsStart);
    const returnsBlock = SQL.substring(returnsStart, returnsEnd);
    expect(returnsBlock).not.toMatch(/^\s+raw_amount_value/m);
  });

  it('fn_advisor_uef_read returns safe interpreter-derived fields (event_type, evidence_level)', () => {
    const fnStart = SQL.indexOf('analytics.fn_advisor_uef_read');
    const returnsStart = SQL.indexOf('RETURNS TABLE', fnStart);
    const returnsEnd = SQL.indexOf('LANGUAGE plpgsql', returnsStart);
    const returnsBlock = SQL.substring(returnsStart, returnsEnd);
    expect(returnsBlock).toMatch(/event_type/);
    expect(returnsBlock).toMatch(/evidence_level/);
    expect(returnsBlock).toMatch(/initiative_domain/);
  });
});

// ── 4. ADVISOR auth check — explicit RAISE EXCEPTION ─────────────────────────

describe('gate2-3-030-advisor — fn_advisor_uef_read auth via RAISE EXCEPTION', () => {
  it('fn_advisor_uef_read raises exception if role is not ADVISOR', () => {
    expect(SQL).toMatch(/fn_advisor_uef_read.*access denied.*ADVISOR|ADVISOR role required/i);
  });

  it('fn_advisor_uef_read raises exception on cross-tenant access', () => {
    expect(SQL).toMatch(/fn_advisor_uef_read.*cross.tenant.*denied|cross-tenant access denied/i);
  });

  it('fn_advisor_uef_read cross-tenant check uses IS DISTINCT FROM', () => {
    expect(SQL).toMatch(/kora\.tenant_id\(\).*IS DISTINCT FROM p_tenant_id/i);
  });

  it('fn_advisor_uef_read RETURN QUERY filters by tenant_id = p_tenant_id', () => {
    expect(SQL).toMatch(/WHERE u\.tenant_id = p_tenant_id/i);
  });
});

// ── 5. ADVISOR tenant scoping preserved ──────────────────────────────────────

describe('gate2-3-030-advisor — tenant scoping preserved', () => {
  it('fn_advisor_uef_read is parameterised by tenant_id', () => {
    expect(SQL).toMatch(/fn_advisor_uef_read\(p_tenant_id uuid\)/i);
  });

  it('migration header explains ADVISOR path post-030', () => {
    expect(SQL).toMatch(/authenticated JWT.*ADVISOR.*fn_advisor_uef_read/i);
  });

  it('migration notes ADVISOR JWT gets 0 rows on direct SELECT (no policy)', () => {
    expect(SQL).toMatch(/ADVISOR JWT.*0 rows|ADVISOR.*nessun accesso.*diretto/i);
  });
});

// ── 6. fn_advisor_uef_read grants ────────────────────────────────────────────

describe('gate2-3-030-advisor — grants', () => {
  it('030 grants EXECUTE on fn_advisor_uef_read to authenticated', () => {
    expect(SQL).toMatch(/GRANT EXECUTE ON FUNCTION analytics\.fn_advisor_uef_read.*TO authenticated/i);
  });

  it('030 revokes EXECUTE on fn_advisor_uef_read from anon', () => {
    expect(SQL).toMatch(/REVOKE EXECUTE ON FUNCTION analytics\.fn_advisor_uef_read.*FROM anon/i);
  });

  it('030 has COMMENT ON fn_advisor_uef_read referencing H-01 revision', () => {
    expect(SQL).toMatch(/COMMENT ON FUNCTION.*fn_advisor_uef_read/i);
    expect(SQL).toMatch(/H-01|advisor_tenant_uef_read.*dropped/i);
  });
});

// ── 7. KORA_ADMIN raw payload still blocked ────────────────────────────────────

describe('gate2-3-030-advisor — KORA_ADMIN path unchanged', () => {
  it('kora_admin_all_uef is still dropped', () => {
    expect(SQL).toMatch(/DROP POLICY IF EXISTS kora_admin_all_uef ON analytics\.uef_record/i);
  });

  it('fn_admin_uef_review still exists in migration', () => {
    expect(SQL).toMatch(/fn_admin_uef_review/);
  });

  it('fn_admin_uef_review does not include payload in RETURNS TABLE', () => {
    const fnStart = SQL.indexOf('analytics.fn_admin_uef_review(p_batch_id');
    const returnsStart = SQL.indexOf('RETURNS TABLE', fnStart);
    const returnsEnd = SQL.indexOf('$$', returnsStart);
    const returnsBlock = SQL.substring(returnsStart, returnsEnd);
    expect(returnsBlock).not.toMatch(/^\s+payload\s+jsonb/m);
  });
});

// ── 8. Company and worker raw UEF still blocked ────────────────────────────────

describe('gate2-3-030-advisor — company/worker blocks preserved', () => {
  it('migration does not create any COMPANY_ADMIN policy on uef_record', () => {
    expect(SQL).not.toMatch(/CREATE POLICY.*COMPANY_ADMIN.*uef_record/i);
  });

  it('migration does not create any WORKER policy on uef_record', () => {
    expect(SQL).not.toMatch(/CREATE POLICY.*WORKER.*uef_record/i);
  });

  it('migration header notes COMPANY_ADMIN/WORKER have no access', () => {
    expect(SQL).toMatch(/COMPANY_ADMIN\/WORKER.*nessun accesso|COMPANY_ADMIN.*no.*access/i);
  });
});

// ── 9. Service-role path intact ───────────────────────────────────────────────

describe('gate2-3-030-advisor — service-role path intact', () => {
  it('migration notes service_role bypasses via BYPASSRLS', () => {
    expect(SQL).toMatch(/service_role.*BYPASSRLS|BYPASSRLS.*service_role/i);
  });

  it('fn_advisor_uef_read allows service_role calls without ADVISOR check', () => {
    // The auth block should check current_role NOT IN ('service_role','postgres')
    // before checking kora_role
    expect(SQL).toMatch(/current_role NOT IN.*service_role.*postgres/i);
  });
});

// ── 10. Migration idempotency ─────────────────────────────────────────────────

describe('gate2-3-030-advisor — migration idempotency', () => {
  it('030 uses CREATE OR REPLACE FUNCTION for fn_advisor_uef_read', () => {
    expect(SQL).toMatch(/CREATE OR REPLACE FUNCTION analytics\.fn_advisor_uef_read/i);
  });

  it('030 uses DROP POLICY IF EXISTS for advisor_tenant_uef_read', () => {
    expect(SQL).toMatch(/DROP POLICY IF EXISTS advisor_tenant_uef_read/i);
  });
});

// ── 11. Rollback 030 updated for ADVISOR ──────────────────────────────────────

describe('gate2-3-030-advisor — rollback 030 warns about advisor restoration', () => {
  it('rollback 030 re-creates advisor_tenant_uef_read', () => {
    expect(RB).toMatch(/CREATE POLICY advisor_tenant_uef_read/i);
  });

  it('rollback 030 warns ADVISOR raw payload access is restored', () => {
    expect(RB).toMatch(/ADVISOR.*raw.*payload|advisor_tenant_uef_read.*PRIVACY REGRESSION/i);
  });

  it('rollback 030 drops fn_advisor_uef_read', () => {
    expect(RB).toMatch(/DROP FUNCTION IF EXISTS analytics\.fn_advisor_uef_read/i);
  });

  it('rollback 030 header mentions Gate 2.3 H-01 privacy regression', () => {
    expect(RB).toMatch(/H-01|Gate 2\.3.*H-01/i);
  });

  it('rollback 030 requires DPO notification on rollback', () => {
    expect(RB).toMatch(/DPO.*must be informed|DPO.*notification/i);
  });
});

// ── 12. Documentation updated ────────────────────────────────────────────────

describe('gate2-3-030-advisor — documentation updated', () => {
  it('design doc has Migration 030 Advisor Raw Payload Revision section', () => {
    expect(DOC).toMatch(/Migration 030 Advisor Raw Payload Revision/i);
  });

  it('design doc explains why advisor_tenant_uef_read is unacceptable', () => {
    expect(DOC).toMatch(/H-01.*resolved|RESOLVED.*advisor_tenant_uef_read/i);
  });

  it('design doc shows H-01 as RESOLVED in revised finding table', () => {
    expect(DOC).toMatch(/H-01.*RESOLVED/i);
  });

  it('design doc states revised decision is APPLY 030 TO STAGING (without HIGH findings)', () => {
    expect(DOC).toMatch(/APPLY 030 TO STAGING/i);
  });

  it('design doc updated version to v1.4 or later', () => {
    expect(DOC).toMatch(/v1\.[4-9]|v[2-9]\.\d/);
  });

  it('design doc footer shows 030 status as revised, safe to apply, or applied', () => {
    expect(DOC).toMatch(/REVISED.*fn_advisor_uef_read|fn_advisor_uef_read.*SAFE TO APPLY|030.*APPLIED TO STAGING/i);
  });

  it('design doc Gate 3 remains OPEN', () => {
    expect(DOC).toMatch(/Gate 3.*OPEN — NOT CLOSED/i);
  });
});

// ── 13. Production not touched, no SQL executed ────────────────────────────────

describe('gate2-3-030-advisor — safety constraints', () => {
  it('design doc confirms production not touched', () => {
    expect(DOC).toMatch(/Production.*NOT touched/i);
  });

  it('design doc confirms no SQL executed', () => {
    expect(DOC).toMatch(/No SQL.*executed|no SQL was executed/i);
  });

  it('design doc confirms no migration applied', () => {
    expect(DOC).toMatch(/No migration.*applied|no migration was applied/i);
  });

  it('migration 030 has no secrets or tokens', () => {
    expect(SQL).not.toMatch(/eyJ[A-Za-z0-9_-]{20,}/);
    expect(SQL).not.toMatch(/postgresql:\/\/[^\s]+:[^\s]+@/i);
  });

  it('rollback 030 has no secrets or tokens', () => {
    expect(RB).not.toMatch(/eyJ[A-Za-z0-9_-]{20,}/);
    expect(RB).not.toMatch(/postgresql:\/\/[^\s]+:[^\s]+@/i);
  });

  it('design doc has no secrets or tokens', () => {
    expect(DOC).not.toMatch(/eyJ[A-Za-z0-9_-]{20,}/);
    expect(DOC).not.toMatch(/postgresql:\/\/[^\s]+:[^\s]+@/i);
  });
});

// ── 14. VERIFICA block updated for 4 functions ────────────────────────────────

describe('gate2-3-030-advisor — VERIFICA block updated', () => {
  it('migration VERIFICA block expects 4 SECURITY DEFINER functions', () => {
    // All 4 functions listed in the VERIFICA block
    expect(SQL).toMatch(/fn_admin_uef_review/);
    expect(SQL).toMatch(/fn_admin_uef_update_review/);
    expect(SQL).toMatch(/fn_admin_uef_enrich/);
    expect(SQL).toMatch(/fn_advisor_uef_read/);
  });

  it('migration VERIFICA block includes smoke test for fn_advisor_uef_read', () => {
    expect(SQL).toMatch(/fn_advisor_uef_read.*<some-tenant-id>|smoke test.*fn_advisor_uef_read/i);
  });

  it('migration VERIFICA block verifies cross-tenant exception for ADVISOR', () => {
    expect(SQL).toMatch(/cross-tenant access denied|fn_advisor_uef_read.*wrong-tenant/i);
  });
});
