/**
 * Gate 2.3 Migration 030 Preparation — UEF Admin Access Hardening.
 *
 * Verifies that:
 * - Migration 030 SQL file exists with correct content
 * - Rollback 030 artifact exists outside supabase/migrations/
 * - Migration 030 drops kora_admin_all_uef
 * - Migration 030 creates SECURITY DEFINER safe review path
 * - Migration 030 excludes raw payload from admin review function
 * - SECURITY DEFINER search_path is set safely
 * - Company roles are not granted raw UEF access
 * - Worker cross-access remains blocked
 * - Rollback 030 warns it restores raw access and requires CTO approval
 * - review route no longer selects raw payload directly (Gate 2.3)
 * - review route has post-030 two-step rollout annotations
 * - enrich route has post-030 two-step rollout annotation
 * - generate-candidates still uses getSupabaseServiceClient after requireKoraAdmin
 * - No formula/methodology changes
 * - No secrets/passwords/tokens
 *
 * No SQL executed. No DB touched. No migration applied. No secrets read.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const root = resolve(process.cwd());

function src(relPath: string): string {
  return readFileSync(resolve(root, relPath), 'utf-8');
}

// ── 1. Migration 030 file exists ──────────────────────────────────────────────

describe('gate2-3-030 — migration file exists', () => {
  it('supabase/migrations/030_uef_admin_access_hardening.sql exists', () => {
    expect(existsSync(resolve(root, 'supabase/migrations/030_uef_admin_access_hardening.sql'))).toBe(true);
  });

  it('030 is non-empty (>1000 chars)', () => {
    expect(src('supabase/migrations/030_uef_admin_access_hardening.sql').length).toBeGreaterThan(1000);
  });

  it('030 is wrapped in BEGIN/COMMIT transaction', () => {
    const sql = src('supabase/migrations/030_uef_admin_access_hardening.sql');
    expect(sql).toMatch(/^BEGIN;/m);
    expect(sql).toMatch(/^COMMIT;/m);
  });

  it('030 includes Gate 2.3 context reference', () => {
    expect(src('supabase/migrations/030_uef_admin_access_hardening.sql'))
      .toMatch(/Gate 2\.3|kora_admin_all_uef/i);
  });

  it('030 is NOT in supabase/rollback/ (it is in migrations/)', () => {
    expect(existsSync(resolve(root, 'supabase/rollback/030_uef_admin_access_hardening.sql'))).toBe(false);
  });
});

// ── 2. Migration 030 drops kora_admin_all_uef ─────────────────────────────────

describe('gate2-3-030 — drops kora_admin_all_uef', () => {
  it('030 contains DROP POLICY ... kora_admin_all_uef', () => {
    expect(src('supabase/migrations/030_uef_admin_access_hardening.sql'))
      .toMatch(/DROP POLICY.*kora_admin_all_uef|kora_admin_all_uef.*DROP POLICY/i);
  });

  it('030 uses DROP POLICY IF EXISTS for idempotency', () => {
    expect(src('supabase/migrations/030_uef_admin_access_hardening.sql'))
      .toMatch(/DROP POLICY IF EXISTS kora_admin_all_uef/i);
  });

  it('030 does NOT re-create kora_admin_all_uef', () => {
    const sql = src('supabase/migrations/030_uef_admin_access_hardening.sql');
    // Should not contain CREATE POLICY ... kora_admin_all_uef
    expect(sql).not.toMatch(/CREATE POLICY.*kora_admin_all_uef/i);
  });
});

// ── 3. Migration 030 creates safe review path ─────────────────────────────────

describe('gate2-3-030 — creates SECURITY DEFINER review path', () => {
  it('030 creates fn_admin_uef_review function', () => {
    expect(src('supabase/migrations/030_uef_admin_access_hardening.sql'))
      .toMatch(/fn_admin_uef_review/);
  });

  it('030 creates fn_admin_uef_update_review function', () => {
    expect(src('supabase/migrations/030_uef_admin_access_hardening.sql'))
      .toMatch(/fn_admin_uef_update_review/);
  });

  it('030 creates fn_admin_uef_enrich function', () => {
    expect(src('supabase/migrations/030_uef_admin_access_hardening.sql'))
      .toMatch(/fn_admin_uef_enrich/);
  });

  it('030 uses SECURITY DEFINER on created functions', () => {
    const sql = src('supabase/migrations/030_uef_admin_access_hardening.sql');
    const count = (sql.match(/SECURITY DEFINER/g) ?? []).length;
    expect(count).toBeGreaterThanOrEqual(3);
  });
});

// ── 4. Migration 030 excludes raw payload ─────────────────────────────────────

describe('gate2-3-030 — payload excluded from admin review path', () => {
  it('030 documents that payload is intentionally excluded from fn_admin_uef_review', () => {
    expect(src('supabase/migrations/030_uef_admin_access_hardening.sql'))
      .toMatch(/payload.*intentionally.*absent|payload.*excluded|payload.*escluso/i);
  });

  it('fn_admin_uef_review RETURNS TABLE does not include a payload column', () => {
    const sql = src('supabase/migrations/030_uef_admin_access_hardening.sql');
    // Extract RETURNS TABLE block for fn_admin_uef_review
    const fnStart = sql.indexOf('fn_admin_uef_review');
    const returnsStart = sql.indexOf('RETURNS TABLE', fnStart);
    const returnsEnd = sql.indexOf('$$', returnsStart);
    const returnsBlock = sql.substring(returnsStart, returnsEnd);
    // The RETURNS TABLE should NOT include 'payload jsonb' or 'payload  jsonb'
    expect(returnsBlock).not.toMatch(/^\s+payload\s+jsonb/m);
  });

  it('030 drops advisor_tenant_uef_read (H-01 revision — ADVISOR raw payload removed)', () => {
    expect(src('supabase/migrations/030_uef_admin_access_hardening.sql'))
      .toMatch(/DROP POLICY IF EXISTS advisor_tenant_uef_read/i);
  });

  it('030 adds fn_advisor_uef_read as safe ADVISOR replacement (payload excluded)', () => {
    expect(src('supabase/migrations/030_uef_admin_access_hardening.sql'))
      .toMatch(/fn_advisor_uef_read/);
  });
});

// ── 5. SECURITY DEFINER search_path ──────────────────────────────────────────

describe('gate2-3-030 — SECURITY DEFINER search_path safety', () => {
  it('030 sets search_path at least 4 times (one per SECURITY DEFINER function)', () => {
    const sql = src('supabase/migrations/030_uef_admin_access_hardening.sql');
    const count = (sql.match(/SET search_path/gi) ?? []).length;
    expect(count).toBeGreaterThanOrEqual(4);
  });

  it('030 search_path includes analytics and kora schemas', () => {
    expect(src('supabase/migrations/030_uef_admin_access_hardening.sql'))
      .toMatch(/SET search_path = analytics.*kora|SET search_path = analytics, kora/i);
  });

  it('030 search_path is set without public schema first (no schema injection risk)', () => {
    const sql = src('supabase/migrations/030_uef_admin_access_hardening.sql');
    // search_path should start with analytics, not public
    expect(sql).not.toMatch(/SET search_path = public/i);
  });
});

// ── 6. Company roles not granted raw UEF ─────────────────────────────────────

describe('gate2-3-030 — company roles not granted raw UEF', () => {
  it('030 does not create COMPANY_ADMIN policy on uef_record', () => {
    expect(src('supabase/migrations/030_uef_admin_access_hardening.sql'))
      .not.toMatch(/COMPANY_ADMIN.*uef_record|uef_record.*COMPANY_ADMIN/i);
  });

  it('030 does not grant company role SELECT on uef_record directly', () => {
    expect(src('supabase/migrations/030_uef_admin_access_hardening.sql'))
      .not.toMatch(/GRANT.*SELECT.*uef_record.*company|company.*SELECT.*uef_record/i);
  });

  it('030 preserves note that company/employer roles have no UEF access', () => {
    expect(src('supabase/migrations/030_uef_admin_access_hardening.sql'))
      .toMatch(/COMPANY_ADMIN.*nessun accesso|company.*no.*accesso|company.*blocked|COMPANY_ADMIN\/WORKER/i);
  });
});

// ── 7. Worker cross-access blocked ────────────────────────────────────────────

describe('gate2-3-030 — worker cross-access blocked', () => {
  it('030 does not create WORKER policy on uef_record (cross-access)', () => {
    const sql = src('supabase/migrations/030_uef_admin_access_hardening.sql');
    // No new WORKER policy on uef_record
    expect(sql).not.toMatch(/CREATE POLICY.*WORKER.*uef_record|uef_record.*WORKER.*CREATE POLICY/i);
  });
});

// ── 8. fn_admin_uef_update_review validates action ───────────────────────────

describe('gate2-3-030 — fn_admin_uef_update_review action validation', () => {
  it('fn_admin_uef_update_review validates action IN (approve, reject, needs_info)', () => {
    expect(src('supabase/migrations/030_uef_admin_access_hardening.sql'))
      .toMatch(/approve.*reject.*needs_info|p_action NOT IN/i);
  });

  it('fn_admin_uef_update_review raises exception on invalid action', () => {
    expect(src('supabase/migrations/030_uef_admin_access_hardening.sql'))
      .toMatch(/RAISE EXCEPTION.*fn_admin_uef_update_review|fn_admin_uef_update_review.*RAISE EXCEPTION/i);
  });
});

// ── 9. fn_admin_uef_enrich field whitelist ────────────────────────────────────

describe('gate2-3-030 — fn_admin_uef_enrich field whitelist', () => {
  it('fn_admin_uef_enrich has a field whitelist (v_allowed_keys)', () => {
    expect(src('supabase/migrations/030_uef_admin_access_hardening.sql'))
      .toMatch(/v_allowed_keys|ARRAY\[.*initiative_domain/i);
  });

  it('fn_admin_uef_enrich raises exception on non-whitelisted key', () => {
    expect(src('supabase/migrations/030_uef_admin_access_hardening.sql'))
      .toMatch(/fn_admin_uef_enrich.*field not allowed|enrichment field not allowed/i);
  });
});

// ── 10. Grants ────────────────────────────────────────────────────────────────

describe('gate2-3-030 — grants', () => {
  it('030 grants EXECUTE on fn_admin_uef_review to authenticated', () => {
    expect(src('supabase/migrations/030_uef_admin_access_hardening.sql'))
      .toMatch(/GRANT EXECUTE ON FUNCTION analytics\.fn_admin_uef_review.*TO authenticated/i);
  });

  it('030 revokes EXECUTE on fn_admin_uef_review from anon', () => {
    expect(src('supabase/migrations/030_uef_admin_access_hardening.sql'))
      .toMatch(/REVOKE EXECUTE ON FUNCTION analytics\.fn_admin_uef_review.*FROM anon/i);
  });

  it('030 grants EXECUTE on fn_admin_uef_update_review to authenticated', () => {
    expect(src('supabase/migrations/030_uef_admin_access_hardening.sql'))
      .toMatch(/GRANT EXECUTE ON FUNCTION analytics\.fn_admin_uef_update_review.*TO authenticated/i);
  });

  it('030 revokes EXECUTE from anon on update_review', () => {
    expect(src('supabase/migrations/030_uef_admin_access_hardening.sql'))
      .toMatch(/REVOKE EXECUTE ON FUNCTION analytics\.fn_admin_uef_update_review.*FROM anon/i);
  });

  it('030 grants EXECUTE on fn_admin_uef_enrich to authenticated', () => {
    expect(src('supabase/migrations/030_uef_admin_access_hardening.sql'))
      .toMatch(/GRANT EXECUTE ON FUNCTION analytics\.fn_admin_uef_enrich.*TO authenticated/i);
  });

  it('030 grants EXECUTE on fn_advisor_uef_read to authenticated', () => {
    expect(src('supabase/migrations/030_uef_admin_access_hardening.sql'))
      .toMatch(/GRANT EXECUTE ON FUNCTION analytics\.fn_advisor_uef_read.*TO authenticated/i);
  });

  it('030 revokes EXECUTE on fn_advisor_uef_read from anon', () => {
    expect(src('supabase/migrations/030_uef_admin_access_hardening.sql'))
      .toMatch(/REVOKE EXECUTE ON FUNCTION analytics\.fn_advisor_uef_read.*FROM anon/i);
  });
});

// ── 11. Rollback 030 exists outside migrations/ ───────────────────────────────

describe('gate2-3-030 — rollback 030', () => {
  it('supabase/rollback/030_rollback_030_if_needed.sql exists', () => {
    expect(existsSync(resolve(root, 'supabase/rollback/030_rollback_030_if_needed.sql'))).toBe(true);
  });

  it('030 rollback is NOT in supabase/migrations/', () => {
    expect(existsSync(resolve(root, 'supabase/migrations/030_rollback_030_if_needed.sql'))).toBe(false);
  });

  it('030 rollback is wrapped in BEGIN/COMMIT', () => {
    const sql = src('supabase/rollback/030_rollback_030_if_needed.sql');
    expect(sql).toMatch(/^BEGIN;/m);
    expect(sql).toMatch(/^COMMIT;/m);
  });

  it('030 rollback says EMERGENCY ROLLBACK ONLY', () => {
    expect(src('supabase/rollback/030_rollback_030_if_needed.sql'))
      .toMatch(/EMERGENCY ROLLBACK ONLY/i);
  });

  it('030 rollback warns it restores raw payload access', () => {
    expect(src('supabase/rollback/030_rollback_030_if_needed.sql'))
      .toMatch(/restores.*raw.*payload|re.opens.*payload|payload.*re.opens|raw payload.*access/i);
  });

  it('030 rollback requires CTO approval', () => {
    expect(src('supabase/rollback/030_rollback_030_if_needed.sql'))
      .toMatch(/CTO.*approval|CTO.*sign.off/i);
  });

  it('030 rollback re-creates kora_admin_all_uef', () => {
    expect(src('supabase/rollback/030_rollback_030_if_needed.sql'))
      .toMatch(/kora_admin_all_uef/);
  });

  it('030 rollback drops the 030 SECURITY DEFINER functions including fn_advisor_uef_read', () => {
    const sql = src('supabase/rollback/030_rollback_030_if_needed.sql');
    expect(sql).toMatch(/DROP FUNCTION.*fn_admin_uef_review/i);
    expect(sql).toMatch(/DROP FUNCTION.*fn_admin_uef_update_review/i);
    expect(sql).toMatch(/DROP FUNCTION.*fn_admin_uef_enrich/i);
    expect(sql).toMatch(/DROP FUNCTION.*fn_advisor_uef_read/i);
  });

  it('030 rollback also restores advisor_tenant_uef_read (warns this is a privacy regression)', () => {
    const sql = src('supabase/rollback/030_rollback_030_if_needed.sql');
    expect(sql).toMatch(/advisor_tenant_uef_read/);
    expect(sql).toMatch(/PRIVACY REGRESSION|privacy regression/i);
  });

  it('rollback README documents 030 rollback entry', () => {
    expect(src('supabase/rollback/README.md'))
      .toMatch(/030_rollback_030_if_needed/);
  });

  it('rollback README says 030 is NOT APPLIED', () => {
    expect(src('supabase/rollback/README.md'))
      .toMatch(/NOT APPLIED|not applied/i);
  });
});

// ── 12. review route GET Case B — no raw payload in SELECT ────────────────────

describe('gate2-3-030 — review route GET no raw payload', () => {
  it('review route GET Case B does not include payload in SELECT string', () => {
    const content = src('app/api/admin/uef/review/route.ts');
    // Find the GET Case B SELECT statement
    const caseB = content.substring(content.indexOf('Case B:'));
    const selectLine = caseB.substring(0, caseB.indexOf('.eq('));
    expect(selectLine).not.toMatch(/,\s*payload\s*,|,\s*payload\s*'/);
  });

  it('review route GET has post-030 fn_admin_uef_review() migration annotation', () => {
    const content = src('app/api/admin/uef/review/route.ts');
    expect(content).toMatch(/fn_admin_uef_review|post.030.*review/i);
  });

  it('review route GET Case B response does not include raw pl payload object', () => {
    const content = src('app/api/admin/uef/review/route.ts');
    // After removing payload from SELECT, the pl variable should not exist in the GET handler
    const getBlock = content.substring(content.indexOf('async function GET'), content.indexOf('async function POST'));
    expect(getBlock).not.toMatch(/const pl\s*=/);
  });
});

// ── 13. review route POST — two-step rollout annotation ──────────────────────

describe('gate2-3-030 — review route POST annotation', () => {
  it('review POST has post-030 fn_admin_uef_update_review() annotation', () => {
    const content = src('app/api/admin/uef/review/route.ts');
    expect(content).toMatch(/fn_admin_uef_update_review/i);
  });

  it('review POST annotation mentions two-step rollout', () => {
    const content = src('app/api/admin/uef/review/route.ts');
    expect(content).toMatch(/two-step rollout|post.030.*switch|Gate 2\.3.*rollout/i);
  });
});

// ── 14. enrich route — post-030 annotation ───────────────────────────────────

describe('gate2-3-030 — enrich route annotation', () => {
  it('enrich route has post-030 fn_admin_uef_enrich annotation', () => {
    const content = src('app/api/admin/uef/enrich/route.ts');
    expect(content).toMatch(/fn_admin_uef_enrich|Gate 2\.3.*two.step/i);
  });
});

// ── 15. generate-candidates — unchanged ───────────────────────────────────────

describe('gate2-3-030 — generate-candidates unchanged', () => {
  it('generate-candidates still imports getSupabaseServiceClient', () => {
    expect(src('app/api/admin/uef/generate-candidates/route.ts'))
      .toMatch(/import.*getSupabaseServiceClient/);
  });

  it('generate-candidates still calls requireKoraAdmin before getSupabaseServiceClient', () => {
    const content = src('app/api/admin/uef/generate-candidates/route.ts');
    const adminIdx = content.indexOf('requireKoraAdmin');
    const clientIdx = content.indexOf('getSupabaseServiceClient()');
    expect(adminIdx).toBeGreaterThan(-1);
    expect(clientIdx).toBeGreaterThan(-1);
    expect(adminIdx).toBeLessThan(clientIdx);
  });

  it('generate-candidates still has approved_for_scoring = false for all candidates', () => {
    expect(src('app/api/admin/uef/generate-candidates/route.ts'))
      .toMatch(/approved_for_scoring.*false/);
  });
});

// ── 16. No formula or methodology changes ─────────────────────────────────────

describe('gate2-3-030 — no formula changes', () => {
  it('030 migration does not reference KORA Index formula or weights', () => {
    const sql = src('supabase/migrations/030_uef_admin_access_hardening.sql');
    expect(sql).not.toMatch(/IU_formula|NM.*BC.*CQ.*EV|KORA Index weight/i);
  });

  it('030 migration does not modify uef_record schema (ADD/DROP COLUMN)', () => {
    const sql = src('supabase/migrations/030_uef_admin_access_hardening.sql');
    expect(sql).not.toMatch(/ALTER TABLE.*uef_record.*ADD COLUMN|ALTER TABLE.*uef_record.*DROP COLUMN/i);
  });
});

// ── 17. Secrets hygiene ───────────────────────────────────────────────────────

describe('gate2-3-030 — secrets hygiene', () => {
  it('030 migration contains no JWT literals', () => {
    expect(src('supabase/migrations/030_uef_admin_access_hardening.sql'))
      .not.toMatch(/eyJ[A-Za-z0-9_-]{20,}/);
  });

  it('030 migration contains no connection string literals', () => {
    expect(src('supabase/migrations/030_uef_admin_access_hardening.sql'))
      .not.toMatch(/postgresql:\/\/[^\s]+:[^\s]+@/i);
  });

  it('030 rollback contains no JWT literals', () => {
    expect(src('supabase/rollback/030_rollback_030_if_needed.sql'))
      .not.toMatch(/eyJ[A-Za-z0-9_-]{20,}/);
  });
});

// ── 18. Migration inventory: contiguous numbering, 029 quarantined ─────────
// Not a frozen file count — new migrations are expected to land over time.
// What must always hold: no duplicate migration numbers, no unexplained gaps
// in the sequence other than the deliberately quarantined 029, and 030 present.

describe('gate2-3-030 — migration file count', () => {
  function migrationNumbers(): number[] {
    const { readdirSync } = require('fs');
    const files = readdirSync(resolve(root, 'supabase/migrations')).filter((f: string) => f.endsWith('.sql'));
    return files
      .map((f: string) => parseInt(f.split('_')[0], 10))
      .sort((a: number, b: number) => a - b);
  }

  it('supabase/migrations/ numbering has no duplicates', () => {
    const numbers = migrationNumbers();
    expect(new Set(numbers).size).toBe(numbers.length);
  });

  it('supabase/migrations/ numbering is contiguous from 001 to the highest file, with only the known retired numbers', () => {
    // 029 quarantined (supabase/rollback/). 037/038 permanently retired by
    // B173-FIX-02 (renumbered to 040/041), which were themselves retired by
    // B173-FIX-03 (renumbered to 043/044 — see
    // tests/unit/b173-migration-numbering-guard.test.ts and the matching
    // rationale in tests/unit/p0-commercial-credibility.test.ts): none of
    // these numbers will ever be promoted into supabase/migrations/ again.
    const numbers = migrationNumbers();
    const highest = numbers[numbers.length - 1];
    const RETIRED_NUMBERS = new Set([29, 37, 38, 40, 41, 43, 44]);
    const expected = Array.from({ length: highest }, (_, i) => i + 1).filter((n) => !RETIRED_NUMBERS.has(n));
    expect(numbers).toEqual(expected);
  });

  it('029 is still NOT in supabase/migrations/', () => {
    expect(existsSync(resolve(root, 'supabase/migrations/029_rollback_027_if_needed.sql'))).toBe(false);
  });

  it('030 is in supabase/migrations/', () => {
    expect(existsSync(resolve(root, 'supabase/migrations/030_uef_admin_access_hardening.sql'))).toBe(true);
  });
});
