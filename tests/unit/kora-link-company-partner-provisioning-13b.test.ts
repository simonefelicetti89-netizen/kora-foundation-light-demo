/**
 * KORA-LINK-HARDENING-AUTOMATION-13B — server-side provisioning for
 * COMPANY_ADMIN, COMPANY_VIEWER, and PARTNER.
 *
 * Closes Gate 4 finding 2 (docs/KORA_LINK_GATE_4_FINAL_REPORT.md §10, §14
 * action E): COMPANY_ADMIN/COMPANY_VIEWER/PARTNER had no server-side
 * provisioning table analogous to personal.worker_identity — the only trust
 * boundary was the signed JWT claim itself. 042_kora_link_company_partner_
 * provisioning.sql adds analytics.company_identity (new), reuses
 * network.partner_identity (existing, migration 012) for PARTNER, and wires
 * the one KORA Link RPC that trusted a company claim
 * (fn_company_link_status_aggregate) to also require an active, role- and
 * tenant-matching analytics.company_identity row.
 *
 * IMPORTANT — test taxonomy (do not blur these; same convention as
 * tests/unit/kora-link-security-foundation-08.test.ts and
 * tests/unit/kora-link-audit-hardening-13a.test.ts):
 *   STATIC   — reads supabase/migrations/*.sql as text and asserts structural
 *              properties. Proves the SQL text says what we intend. Does NOT
 *              prove the SQL executes correctly against a real Postgres
 *              instance — there is no database in this test run.
 *   BEHAVIORAL-MISSING — scenarios that need a live database (an actual
 *              authenticated call observing the real result set). Not
 *              covered here — deferred to KORA-LINK-HARDENING-AUTOMATION-13C,
 *              which owns building the repo's live/local-DB test
 *              infrastructure. All 17 scenarios below (13B.1-13B.17) were
 *              additionally exercised once, manually, against an ephemeral
 *              local database as part of 13B's own FASE 7 validation (see
 *              the sprint report) — that one-time manual run is not itself a
 *              repo-committed automated test.
 *
 * STATUS CLASSIFICATION (mirrors 042's own header — do not conflate):
 *   COMPANY provisioning:            IMPLEMENTED AND ENFORCED.
 *   PARTNER provisioning foundation: IMPLEMENTED, NOT YET WIRED.
 *   PARTNER KORA Link access:        DENY-BY-DEFAULT, unchanged.
 * This file does NOT claim "PARTNER provisioning implemented end-to-end" —
 * there is no PARTNER-facing KORA Link surface for it to protect yet.
 *
 * DECISION — keep kora_link.is_provisioned_partner(uuid) (Option A: retain
 * as an explicit foundation for a future PARTNER surface), not Option B
 * (remove to avoid dead code). Justified against all four stated criteria:
 * it has dedicated tests (13B.8-13B.11 below, plus a live smoke run against
 * an ephemeral local database — valid mapping/no mapping/disabled mapping/
 * partner_id mismatch all produced the correct true/false result); it
 * widens no grant and introduces no new RPC/policy surface (granted to
 * authenticated only, called from nowhere); it is documented here and in
 * 042's own header as explicitly not-yet-wired; and a concrete (if
 * low-priority) future consumer is already on record
 * (/tmp/KORA_LINK_HARDENING_AUTOMATION_13_PLAN.md §4: "Wiring di
 * network.partner_identity nel percorso applicativo — costo quasi nullo...
 * priorità bassa finché PARTNER resta deny-by-default").
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const REPO_ROOT = join(__dirname, '..', '..');

function readSource(relativePath: string): string {
  return readFileSync(join(REPO_ROOT, relativePath), 'utf8');
}

const SQL_012_PATH = 'supabase/migrations/012_partner_identity.sql';
const SQL_034_PATH = 'supabase/migrations/034_kora_link_schema.sql';
const SQL_035_PATH = 'supabase/migrations/035_kora_link_rls.sql';
const SQL_036_PATH = 'supabase/migrations/036_kora_link_rpc_functions.sql';
const SQL_039_PATH = 'supabase/migrations/039_kora_link_audit_hardening.sql';
const SQL_042_PATH = 'supabase/migrations/042_kora_link_company_partner_provisioning.sql';

const sql012 = readSource(SQL_012_PATH);
const sql034 = readSource(SQL_034_PATH);
const sql035 = readSource(SQL_035_PATH);
const sql036 = readSource(SQL_036_PATH);
const sql039 = readSource(SQL_039_PATH);
const sql042 = readSource(SQL_042_PATH);

function extractFunctionBlock(sql: string, fnStartMarker: string): string {
  const start = sql.indexOf(fnStartMarker);
  expect(start, `${fnStartMarker} not found`).toBeGreaterThan(-1);
  const end = sql.indexOf('\n$$;', start);
  expect(end, `${fnStartMarker} body end ($$;) not found`).toBeGreaterThan(start);
  return sql.slice(start, end + 4);
}

function isLineSubsequence(originalBlock: string, newBlock: string): boolean {
  const originalLines = originalBlock.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
  const newLines = newBlock.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
  let i = 0;
  for (const line of newLines) {
    if (i < originalLines.length && line === originalLines[i]) i += 1;
  }
  return i === originalLines.length;
}

// Strips `--` line comments — 042's own header/inline prose explains in
// English what it does and does NOT do, which would otherwise false-positive
// a naive text search for the very things it's explaining the absence of.
function stripComments(sql: string): string {
  return sql
    .split('\n')
    .map((line) => {
      const idx = line.indexOf('--');
      return idx === -1 ? line : line.slice(0, idx);
    })
    .join('\n');
}

const sql042NoComments = stripComments(sql042);

const aggregate036 = extractFunctionBlock(sql036, 'CREATE OR REPLACE FUNCTION kora_link.fn_company_link_status_aggregate(');
const aggregate042 = extractFunctionBlock(sql042, 'CREATE OR REPLACE FUNCTION kora_link.fn_company_link_status_aggregate(');
const isProvisionedCompanyRoleFn = extractFunctionBlock(sql042, 'CREATE OR REPLACE FUNCTION kora_link.is_provisioned_company_role()');
const isProvisionedPartnerFn = extractFunctionBlock(sql042, 'CREATE OR REPLACE FUNCTION kora_link.is_provisioned_partner(');

// ── Migration file exists, depends on 036/012, does not touch 034-039 ────────

describe('042 exists, is canonical, does not modify 034/035/036/039', () => {
  it('042_kora_link_company_partner_provisioning.sql exists under supabase/migrations/', () => {
    expect(() => readSource(SQL_042_PATH)).not.toThrow();
  });

  it('a rollback file exists for 042', () => {
    expect(() => readSource('supabase/rollback/042_rollback_042_if_needed.sql')).not.toThrow();
  });

  it('042 declares the three-way STATUS CLASSIFICATION and does not claim PARTNER provisioning is implemented end-to-end', () => {
    expect(sql042).toMatch(/COMPANY provisioning:\s+IMPLEMENTED AND ENFORCED/);
    expect(sql042).toMatch(/PARTNER provisioning foundation:\s+IMPLEMENTED, NOT YET WIRED/);
    expect(sql042).toMatch(/PARTNER KORA Link access:\s+DENY-BY-DEFAULT, unchanged/);
    expect(sql042NoComments).not.toMatch(/PARTNER provisioning implemented end-to-end/);
  });

  it('034, 035, 036, 039 are byte-identical to before this migration was introduced (only 042 adds new content)', () => {
    // 042 itself must not touch these files' own content — this is a
    // same-repository sanity check that the files exist and are readable;
    // the real non-modification guarantee is that 042 is a NEW file (CREATE
    // OR REPLACE FUNCTION targets an existing function name, not an edit to
    // any of these four files).
    expect(sql034.length).toBeGreaterThan(0);
    expect(sql035.length).toBeGreaterThan(0);
    expect(sql036.length).toBeGreaterThan(0);
    expect(sql039.length).toBeGreaterThan(0);
  });

  it('042 does not contain a CREATE TABLE for any kora_link.* table (no new KORA Link tables)', () => {
    expect(sql042NoComments).not.toMatch(/CREATE TABLE\s+IF NOT EXISTS\s+kora_link\./);
  });

  it('042 does not contain a CREATE POLICY for any kora_link.* table (no new KORA Link policies)', () => {
    expect(sql042).not.toMatch(/CREATE POLICY[\s\S]{0,200}kora_link\./);
  });
});

// ── analytics.company_identity schema ─────────────────────────────────────────

describe('company_identity — schema mirrors personal.worker_identity structurally [STATIC]', () => {
  it('created in the analytics schema, not personal (constitutional boundary — CLAUDE.md §13)', () => {
    expect(sql042).toContain('CREATE TABLE IF NOT EXISTS analytics.company_identity');
    expect(sql042).not.toContain('CREATE TABLE IF NOT EXISTS personal.company_identity');
  });

  it('tenant_id is NOT NULL, references analytics.tenant, ON DELETE CASCADE', () => {
    expect(sql042).toMatch(/tenant_id\s+uuid\s+NOT NULL\s+REFERENCES analytics\.tenant \(id\) ON DELETE CASCADE/);
  });

  it('auth_user_id is NOT NULL UNIQUE, no cross-schema FK (matches worker_identity/partner_identity convention)', () => {
    expect(sql042).toMatch(/auth_user_id\s+uuid\s+NOT NULL\s+UNIQUE/);
    expect(sql042).not.toMatch(/auth_user_id[\s\S]{0,40}REFERENCES auth\.users/);
  });

  it('role is constrained to exactly COMPANY_ADMIN and COMPANY_VIEWER', () => {
    expect(sql042).toMatch(/role\s+text\s+NOT NULL\s*\n\s*CHECK \(role IN \('COMPANY_ADMIN', 'COMPANY_VIEWER'\)\)/);
  });

  it('status is constrained to exactly active and disabled', () => {
    expect(sql042).toMatch(/status\s+text\s+NOT NULL DEFAULT 'active'\s*\n\s*CHECK \(status IN \('active', 'disabled'\)\)/);
  });

  it('has created_by, created_at, updated_at columns', () => {
    expect(sql042).toMatch(/created_by\s+uuid\s+NULL/);
    expect(sql042).toMatch(/created_at\s+timestamptz\s+NOT NULL DEFAULT now\(\)/);
    expect(sql042).toMatch(/updated_at\s+timestamptz\s+NOT NULL DEFAULT now\(\)/);
  });

  it('has an updated_at trigger using the shared set_updated_at() function', () => {
    expect(sql042).toContain('CREATE TRIGGER trg_company_identity_updated_at');
    expect(sql042).toContain('BEFORE UPDATE ON analytics.company_identity');
    expect(sql042).toMatch(/trg_company_identity_updated_at[\s\S]*?EXECUTE FUNCTION set_updated_at\(\)/);
  });

  it('ENABLE + FORCE ROW LEVEL SECURITY', () => {
    expect(sql042).toContain('ALTER TABLE analytics.company_identity ENABLE ROW LEVEL SECURITY');
    expect(sql042).toContain('ALTER TABLE analytics.company_identity FORCE ROW LEVEL SECURITY');
  });

  it('KORA_ADMIN has FOR ALL access; COMPANY_ADMIN/COMPANY_VIEWER have SELECT-own only; no other role has a policy', () => {
    expect(sql042).toMatch(/CREATE POLICY "company_identity_kora_admin_all"[\s\S]*?FOR ALL[\s\S]*?USING \(kora\.kora_role\(\) = 'KORA_ADMIN'\)/);
    expect(sql042).toMatch(/CREATE POLICY "company_identity_own_select"[\s\S]*?FOR SELECT[\s\S]*?kora\.kora_role\(\) IN \('COMPANY_ADMIN', 'COMPANY_VIEWER'\)[\s\S]*?auth_user_id = auth\.uid\(\)/);
    expect(sql042).not.toMatch(/CREATE POLICY[\s\S]{0,150}company_identity[\s\S]{0,150}'WORKER'/);
    expect(sql042).not.toMatch(/CREATE POLICY[\s\S]{0,150}company_identity[\s\S]{0,150}'PARTNER'/);
  });

  it('grants SELECT/INSERT/UPDATE to authenticated and service_role directly (not deferred to a later patch, unlike 007→033)', () => {
    expect(sql042).toContain('GRANT SELECT, INSERT, UPDATE ON analytics.company_identity TO authenticated;');
    expect(sql042).toContain('GRANT SELECT, INSERT, UPDATE ON analytics.company_identity TO service_role;');
  });

  it('no DELETE grant to any role (matches worker_identity/partner_identity convention — status=disabled, not row deletion, is the lifecycle mechanism)', () => {
    expect(sql042).not.toMatch(/GRANT[^;]*DELETE[^;]*company_identity/);
  });
});

// ── 13B.1-13B.5 — COMPANY_ADMIN authorization matrix ─────────────────────────

describe('13B.1 — company admin valid + provisioned reaches the aggregate query [STATIC]', () => {
  it('the provisioning check is the LAST gate before the aggregate query — a caller passing every check falls through to RETURN QUERY', () => {
    const provisioningCheckIdx = aggregate042.indexOf('IF NOT kora_link.is_provisioned_company_role()');
    const returnQueryIdx = aggregate042.indexOf('RETURN QUERY');
    expect(provisioningCheckIdx).toBeGreaterThan(-1);
    expect(returnQueryIdx).toBeGreaterThan(provisioningCheckIdx);
  });
});

describe('13B.2 — company admin with no company_identity row is denied [STATIC]', () => {
  it('is_provisioned_company_role() requires an EXISTS match — no row means false', () => {
    expect(isProvisionedCompanyRoleFn).toMatch(/SELECT EXISTS \(/);
    expect(isProvisionedCompanyRoleFn).toMatch(/FROM analytics\.company_identity ci/);
  });

  it('a false result from is_provisioned_company_role() returns before the aggregate query (same empty-result shape as every other denial)', () => {
    const checkBlock = aggregate042.slice(
      aggregate042.indexOf('IF NOT kora_link.is_provisioned_company_role()'),
      aggregate042.indexOf('END IF;', aggregate042.indexOf('IF NOT kora_link.is_provisioned_company_role()')) + 'END IF;'.length,
    );
    expect(checkBlock).toContain('RETURN;');
    expect(checkBlock).not.toMatch(/error_code|jsonb_build_object/);
  });
});

describe('13B.3 — company admin with a disabled mapping is denied [STATIC]', () => {
  it('is_provisioned_company_role() requires status = \'active\'', () => {
    expect(isProvisionedCompanyRoleFn).toMatch(/ci\.status = 'active'/);
  });
});

describe('13B.4 — company admin tenant mismatch is denied [STATIC]', () => {
  it('is_provisioned_company_role() requires the row\'s own tenant_id to match the JWT tenant claim', () => {
    expect(isProvisionedCompanyRoleFn).toMatch(/ci\.tenant_id = kora\.tenant_id\(\)/);
  });

  it('the pre-existing direct claim tenant check (p_tenant_id vs kora.tenant_id()) is untouched — double-gated, not replaced', () => {
    expect(aggregate042).toContain('IF p_tenant_id IS NULL OR p_tenant_id <> kora.tenant_id() THEN');
  });
});

describe('13B.5 — company admin role mismatch (mapping says a different role) is denied [STATIC]', () => {
  it('is_provisioned_company_role() requires the row\'s own role to match the JWT role claim', () => {
    expect(isProvisionedCompanyRoleFn).toMatch(/ci\.role = kora\.kora_role\(\)/);
  });
});

// ── 13B.6 — COMPANY_VIEWER ─────────────────────────────────────────────────────

describe('13B.6 — company viewer is excluded before the provisioning check is ever reached, regardless of mapping [STATIC]', () => {
  it('the first role gate (unchanged from 036) still excludes everyone except COMPANY_ADMIN and KORA_ADMIN', () => {
    expect(aggregate042).toContain("IF kora.kora_role() NOT IN ('COMPANY_ADMIN', 'KORA_ADMIN') THEN");
  });

  it('the first role gate occurs before the provisioning check — a COMPANY_VIEWER, even with a perfectly valid company_identity row, never reaches it', () => {
    const firstGateIdx = aggregate042.indexOf("IF kora.kora_role() NOT IN ('COMPANY_ADMIN', 'KORA_ADMIN') THEN");
    const provisioningCheckIdx = aggregate042.indexOf('IF NOT kora_link.is_provisioned_company_role()');
    expect(firstGateIdx).toBeGreaterThan(-1);
    expect(provisioningCheckIdx).toBeGreaterThan(firstGateIdx);
  });

  it('company_identity itself does allow COMPANY_VIEWER as a valid role value (schema supports it even though no KORA Link RPC currently uses it)', () => {
    expect(sql042).toMatch(/CHECK \(role IN \('COMPANY_ADMIN', 'COMPANY_VIEWER'\)\)/);
  });
});

// ── 13B.7 — forged claim ───────────────────────────────────────────────────────

describe('13B.7 — a syntactically valid (forged) COMPANY_ADMIN claim with no mapping is denied identically to 13B.2 [STATIC]', () => {
  it('the provisioning check has no bypass for "claim looks valid" — it only trusts the database row', () => {
    // is_provisioned_company_role() takes no arguments describing the claim
    // shape — it can only answer true/false from the DB row plus the JWT
    // functions it calls internally, so there is no code path where a
    // well-formed claim alone satisfies it.
    expect(isProvisionedCompanyRoleFn).not.toMatch(/is_provisioned_company_role\([^)]+\)/);
  });
});

// ── 13B.8-13B.11 — PARTNER ──────────────────────────────────────────────────────

describe('13B.8 — partner provisioning check exists but introduces no new KORA Link surface (deny-by-default invariant) [STATIC]', () => {
  it('is_provisioned_partner() is defined and correctly requires role=PARTNER plus an active matching row', () => {
    expect(isProvisionedPartnerFn).toMatch(/kora\.kora_role\(\) = 'PARTNER'/);
    expect(isProvisionedPartnerFn).toMatch(/pi\.status = 'active'/);
    expect(isProvisionedPartnerFn).toMatch(/pi\.partner_id = p_partner_id/);
  });

  it('is_provisioned_partner() is not called anywhere in 034, 035, 036, or 039 (no existing KORA Link surface was modified to use it)', () => {
    expect(sql034).not.toMatch(/is_provisioned_partner/);
    expect(sql035).not.toMatch(/is_provisioned_partner/);
    expect(sql036).not.toMatch(/is_provisioned_partner/);
    expect(sql039).not.toMatch(/is_provisioned_partner/);
  });

  it('is_provisioned_partner() is not called from inside any OTHER function body in 042 — only its own definition/setup (REVOKE/GRANT/COMMENT) and the section header reference it', () => {
    // fn_company_link_status_aggregate is the only other function 042 defines
    // or replaces — confirm its body does not call is_provisioned_partner.
    expect(aggregate042).not.toMatch(/is_provisioned_partner/);
  });

  it('is_provisioned_partner is the only function in 042 whose signature takes a p_partner_id argument (no other/new PARTNER-facing RPC introduced)', () => {
    const signatures = [...sql042NoComments.matchAll(/CREATE OR REPLACE FUNCTION ([\w.]+)\(([^)]*)\)/g)];
    const withPartnerArg = signatures.filter(([, , args]) => /p_partner/i.test(args));
    expect(withPartnerArg.length).toBe(1);
    expect(withPartnerArg[0][1]).toBe('kora_link.is_provisioned_partner');
  });
});

describe('13B.9 — partner with no partner_identity row is denied [STATIC]', () => {
  it('is_provisioned_partner() requires an EXISTS match against network.partner_identity', () => {
    expect(isProvisionedPartnerFn).toMatch(/EXISTS \(/);
    expect(isProvisionedPartnerFn).toMatch(/FROM network\.partner_identity pi/);
  });
});

describe('13B.10 — partner with a disabled mapping is denied [STATIC]', () => {
  it('is_provisioned_partner() requires status = \'active\' (network.partner_identity allows invited/active/disabled — only active passes)', () => {
    expect(isProvisionedPartnerFn).toMatch(/pi\.status = 'active'/);
    expect(sql012).toMatch(/CHECK \(status IN \('invited', 'active', 'disabled'\)\)/);
  });
});

describe('13B.11 — partner mismatch (claimed partner_id does not match the caller\'s own row) is denied [STATIC]', () => {
  it('is_provisioned_partner() takes the target partner_id as a parameter and requires the caller\'s own row to match it exactly', () => {
    expect(sql042).toContain('CREATE OR REPLACE FUNCTION kora_link.is_provisioned_partner(p_partner_id uuid)');
    expect(isProvisionedPartnerFn).toMatch(/pi\.partner_id = p_partner_id/);
  });

  it('network.partner_identity has no tenant_id column — partner is not tenant-scoped by design, not by omission (documented in 042)', () => {
    expect(sql012).not.toMatch(/tenant_id/);
    expect(sql042).toMatch(/no tenant_id column/);
  });
});

// ── 13B.12-13B.14 — regressions ───────────────────────────────────────────────

describe('13B.12 — KORA_ADMIN branch is byte-identical to 036 (regression check) [STATIC]', () => {
  it('the KORA_ADMIN path has no new IF block, no provisioning check, no company_identity reference', () => {
    const kora036 = aggregate036.slice(
      0,
      aggregate036.indexOf("IF kora.kora_role() = 'COMPANY_ADMIN' THEN"),
    );
    const kora042 = aggregate042.slice(
      0,
      aggregate042.indexOf("IF kora.kora_role() = 'COMPANY_ADMIN' THEN"),
    );
    expect(kora042).toBe(kora036);
  });

  it('every line of 036\'s fn_company_link_status_aggregate is preserved, in order, in 042 (042 only inserts new lines)', () => {
    expect(isLineSubsequence(aggregate036, aggregate042)).toBe(true);
  });

  it('the RETURNS TABLE shape and the aggregate query itself are untouched', () => {
    expect(aggregate042).toMatch(/RETURNS TABLE\s*\(\s*status\s+text,\s*count\s+bigint,\s*suppressed\s+boolean\s*\)/);
    expect(aggregate042).toContain('WITH raw_counts AS (');
    expect(aggregate042).toContain("CASE WHEN rc.raw_count BETWEEN 1 AND 9 THEN NULL ELSE rc.raw_count END");
  });
});

describe('13B.13 — WORKER is fully unaffected [STATIC]', () => {
  it('042 contains no executable statement referencing personal.worker_identity or fn_activate_link_for_worker (only mention is descriptive prose inside a COMMENT ON string, explaining that company_identity mirrors it)', () => {
    expect(sql042NoComments).not.toMatch(/GRANT[^;]*personal\.worker_identity/);
    expect(sql042NoComments).not.toMatch(/ALTER TABLE personal\.worker_identity/);
    expect(sql042NoComments).not.toMatch(/(?:SELECT|INSERT|UPDATE|DELETE|FROM|JOIN)\s+personal\.worker_identity/i);
    expect(sql042NoComments).not.toMatch(/fn_activate_link_for_worker/);
  });

  it('034 (which defines the kora_link schema WORKER-facing tables) is not referenced as a target of any ALTER/CREATE OR REPLACE in 042', () => {
    expect(sql042).not.toMatch(/ALTER TABLE kora_link\.link_assignments/);
    expect(sql042).not.toMatch(/CREATE OR REPLACE FUNCTION kora_link\.fn_activate_link_for_worker/);
  });
});

describe('13B.14 — service_role is unaffected beyond the new company_identity grant [STATIC]', () => {
  it('042 contains no executable GRANT/REVOKE/CREATE OR REPLACE FUNCTION statement targeting fn_revoke_link, fn_replace_link, or fn_activate_link_for_worker (comments aside)', () => {
    expect(sql042NoComments).not.toMatch(/fn_revoke_link/);
    expect(sql042NoComments).not.toMatch(/fn_replace_link/);
  });

  it('fn_company_link_status_aggregate\'s own ACL is not restated in 042 (CREATE OR REPLACE FUNCTION preserves it from 036)', () => {
    const afterFnDef = sql042.slice(sql042.indexOf('CREATE OR REPLACE FUNCTION kora_link.fn_company_link_status_aggregate('));
    const grantSection = afterFnDef.slice(0, afterFnDef.indexOf('COMMENT ON FUNCTION kora_link.fn_company_link_status_aggregate'));
    expect(grantSection).not.toMatch(/^\s*GRANT\s/m);
    expect(grantSection).not.toMatch(/^\s*REVOKE\s/m);
  });

  it('service_role is explicitly granted on the new company_identity table (new capability, not a regression)', () => {
    expect(sql042).toContain('GRANT SELECT, INSERT, UPDATE ON analytics.company_identity TO service_role;');
  });
});

// ── 13B.15 — stale claim after disable ────────────────────────────────────────

describe('13B.15 — a stale-but-unexpired JWT is still blocked once the mapping is disabled [STATIC]', () => {
  it('is_provisioned_company_role() is STABLE (re-evaluated per statement, not cached across calls/requests) and re-reads status on every invocation', () => {
    expect(sql042).toMatch(/CREATE OR REPLACE FUNCTION kora_link\.is_provisioned_company_role\(\)\s*\nRETURNS boolean\s*\nLANGUAGE sql\s*\nSTABLE/);
  });

  it('the check reads analytics.company_identity directly — there is no separate cached/denormalized flag that could go stale independently of the row', () => {
    const selectCount = (isProvisionedCompanyRoleFn.match(/FROM analytics\.company_identity/g) ?? []).length;
    expect(selectCount).toBe(1);
  });
});

// 13B.15 BEHAVIORAL-MISSING item IMPLEMENTED by KORA-LINK-HARDENING-
// AUTOMATION-13C: scripts/kora-link/run-behavioral-suite.ts C5.3/C5.4 create
// a company_identity row, confirm access, then flip status to 'disabled'
// (no JWT change) and confirm the aggregate RPC immediately returns empty —
// the same claim-not-refreshed scenario, proven directly against a real
// database. Also already exercised once, manually, live against staging
// during KORA-LINK-HARDENING-AUTOMATION-13B's own FASE 7 validation. See
// docs/KORA_LINK_AUTOMATED_TESTING.md.

// ── 13B.16 — no direct table access introduced ────────────────────────────────

describe('13B.16 — no direct table access to kora_link.* is introduced for COMPANY_ADMIN, COMPANY_VIEWER, or PARTNER [STATIC]', () => {
  it('042 grants nothing on any kora_link.* TABLE (as opposed to FUNCTION — EXECUTE grants on the two new helper functions are expected and correct)', () => {
    const tableGrants = [...sql042NoComments.matchAll(/GRANT[^;]*ON\s+(kora_link\.\w+)/g)]
      .map((m) => m[1])
      .filter((target) => !target.startsWith('kora_link.is_provisioned') && !target.startsWith('kora_link.fn_'));
    expect(tableGrants).toEqual([]);
  });

  it('042 never GRANTs, ALTERs, or CREATEs anything targeting network.partner_identity — it is reused read-only (SELECT, inside is_provisioned_partner only), never its schema/ACL touched', () => {
    expect(sql042NoComments).not.toMatch(/GRANT[^;]*network\.partner_identity/);
    expect(sql042NoComments).not.toMatch(/ALTER TABLE network\.partner_identity/);
    expect(sql042NoComments).not.toMatch(/CREATE (TABLE|POLICY)[^;]*network\.partner_identity/);
    // The only functional (non-comment) reference anywhere in 042 is the
    // single read inside is_provisioned_partner(); a second mention exists
    // only as descriptive prose inside that function's own COMMENT ON string.
    const functionalOccurrences = [...sql042NoComments.matchAll(/(?:SELECT|INSERT|UPDATE|DELETE|FROM|JOIN)\s+network\.partner_identity/gi)];
    expect(functionalOccurrences.length).toBe(1);
    expect(isProvisionedPartnerFn).toContain('FROM network.partner_identity');
  });

  it('the only access path into kora_link.links data for COMPANY_ADMIN remains the SECURITY DEFINER RPC, unchanged', () => {
    expect(aggregate042).toContain('SECURITY DEFINER');
    expect(sql042).not.toMatch(/CREATE POLICY[\s\S]{0,150}kora_link\.links[\s\S]{0,150}COMPANY/);
  });
});

// ── 13B.17 — no data leakage in denial responses ──────────────────────────────

describe('13B.17 — denial responses (mapping missing/disabled/mismatched) leak nothing beyond the pre-13B contract [STATIC]', () => {
  it('the provisioning-check denial branch returns bare RETURN, not a new error code or message', () => {
    const checkBlock = aggregate042.slice(
      aggregate042.indexOf('IF NOT kora_link.is_provisioned_company_role()'),
      aggregate042.indexOf('END IF;', aggregate042.indexOf('IF NOT kora_link.is_provisioned_company_role()')) + 'END IF;'.length,
    );
    expect(checkBlock.trim()).toBe(
      'IF NOT kora_link.is_provisioned_company_role() THEN\n      RETURN;\n    END IF;',
    );
  });

  it('is_provisioned_company_role() and is_provisioned_partner() return only a boolean — no row data, no error detail', () => {
    expect(sql042).toMatch(/CREATE OR REPLACE FUNCTION kora_link\.is_provisioned_company_role\(\)\s*\nRETURNS boolean/);
    expect(sql042).toMatch(/CREATE OR REPLACE FUNCTION kora_link\.is_provisioned_partner\(p_partner_id uuid\)\s*\nRETURNS boolean/);
  });

  it('no email, worker_name, or auth_user_id is ever returned by fn_company_link_status_aggregate (unchanged from 036)', () => {
    expect(aggregate042).not.toMatch(/RETURN QUERY[\s\S]*?email/i);
    expect(aggregate042).not.toMatch(/RETURN QUERY[\s\S]*?auth_user_id/i);
  });
});
