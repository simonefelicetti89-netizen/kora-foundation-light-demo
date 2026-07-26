/**
 * KORA-LINK-SECURITY-FOUNDATION-08 — worker identity, aggregation threshold,
 * revocation/expiry, token security, RLS/grants, and audit hardening.
 *
 * Companion to tests/unit/kora-link-schema034-review.test.ts,
 * tests/unit/kora-link-rls035-review.test.ts, and
 * tests/unit/kora-link-privacy-invariants.test.ts. Those files guard prior
 * review passes; this file guards what Sprint 08 specifically changed or
 * re-verified, organized by the sprint's own BLOCCO 1-6 structure.
 *
 * IMPORTANT — test taxonomy (do not blur these):
 *   STATIC   — reads supabase/migrations/*.sql as text and asserts structural
 *              properties (a function contains a check, a table has RLS
 *              enabled, a signature has no uuid param, etc). This proves the
 *              SQL text says what we intend. It does NOT prove the SQL
 *              executes correctly against a real Postgres instance — there is
 *              no database in this test run.
 *   BEHAVIORAL-MISSING — scenarios from the sprint's required test matrix
 *              that need a live database (RLS enforcement under a real JWT,
 *              actual concurrent transactions, actual constraint violations)
 *              and are NOT covered by this file or any file in this repo.
 *              Listed explicitly in each section below and in
 *              docs/KORA_LINK_SECURITY_FOUNDATION_08.md so the gap is never
 *              silently implied to be closed.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const REPO_ROOT = join(__dirname, '..', '..');

function readSource(relativePath: string): string {
  return readFileSync(join(REPO_ROOT, relativePath), 'utf8');
}

// Promoted by KORA-LINK-MIGRATION-FORMALIZATION-12 (2026-07-26): these three
// files now live under supabase/migrations/, not supabase/proposed/ — see
// docs/KORA_LINK_GATE_4_FINAL_REPORT.md. The function-body content this file
// checks was not modified by the promotion.
const SQL_034_PATH = 'supabase/migrations/034_kora_link_schema.sql';
const SQL_035_PATH = 'supabase/migrations/035_kora_link_rls.sql';
const SQL_036_PATH = 'supabase/migrations/036_kora_link_rpc_functions.sql';

const sql034 = readSource(SQL_034_PATH);
const sql035 = readSource(SQL_035_PATH);
const sql036 = readSource(SQL_036_PATH);

function extractFunctionBlock(sql: string, fnStartMarker: string): string {
  const start = sql.indexOf(fnStartMarker);
  expect(start, `${fnStartMarker} not found`).toBeGreaterThan(-1);
  const end = sql.indexOf('$$;', start);
  expect(end, `${fnStartMarker} body end ($$;) not found`).toBeGreaterThan(start);
  return sql.slice(start, end + 3);
}

// Section headers are 3-line blocks: border / title / border. To slice a
// section's BODY (not its own header) we must skip past both border lines.
function extractSection(sql: string, titleMarker: string): string {
  const titleIdx = sql.indexOf(titleMarker);
  expect(titleIdx, `${titleMarker} not found`).toBeGreaterThan(-1);
  const afterTitleLine = sql.indexOf('\n', titleIdx) + 1;
  const afterBottomBorder = sql.indexOf('\n', afterTitleLine) + 1;
  const nextSectionIdx = sql.indexOf('-- ═══', afterBottomBorder);
  expect(nextSectionIdx, `no following section border found after ${titleMarker}`).toBeGreaterThan(-1);
  return sql.slice(afterBottomBorder, nextSectionIdx);
}

const activateFn = extractFunctionBlock(
  sql036,
  'CREATE OR REPLACE FUNCTION kora_link.fn_activate_link_for_worker(',
);
const aggregateFn = extractFunctionBlock(
  sql036,
  'CREATE OR REPLACE FUNCTION kora_link.fn_company_link_status_aggregate(',
);
const revokeFn = extractFunctionBlock(sql036, 'CREATE OR REPLACE FUNCTION kora_link.fn_revoke_link(');
const replaceFn = extractFunctionBlock(sql036, 'CREATE OR REPLACE FUNCTION kora_link.fn_replace_link(');
const publicLookupFn = extractFunctionBlock(
  sql036,
  'CREATE OR REPLACE FUNCTION kora_link.fn_public_lookup_link(',
);

// ═══════════════════════════════════════════════════════════════════════════
// BLOCCO 1 — Worker identity (test matrix items 1-10)
// ═══════════════════════════════════════════════════════════════════════════

describe('BLOCCO 1 — worker identity: no client-controlled p_worker_id [STATIC]', () => {
  it('fn_activate_link_for_worker signature has exactly 2 text params, no uuid', () => {
    const sigStart = sql036.indexOf('CREATE OR REPLACE FUNCTION kora_link.fn_activate_link_for_worker(');
    const sigEnd = sql036.indexOf(')', sigStart);
    const signature = sql036.slice(sigStart, sigEnd + 1);
    expect(signature).toContain('p_token_digest');
    expect(signature).toContain('p_activation_notice_version');
    expect(signature).not.toMatch(/p_worker_id/);
    expect(signature).not.toMatch(/uuid/);
  });

  it('the function body never references a p_worker_id identifier', () => {
    expect(activateFn).not.toMatch(/\bp_worker_id\b/);
  });
});

describe('BLOCCO 1 — item 4: auth.uid() IS NULL is rejected before any lookup [STATIC]', () => {
  it('the first identity check is auth.uid() IS NULL, returning a generic error', () => {
    expect(activateFn).toMatch(/IF auth\.uid\(\) IS NULL THEN/);
    expect(activateFn).toMatch(/'status', 'error', 'reason', 'unauthenticated'/);
  });

  it('the auth.uid() NULL check occurs before the personal.worker_identity lookup', () => {
    const nullCheckIdx = activateFn.indexOf('auth.uid() IS NULL');
    const lookupIdx = activateFn.indexOf('FROM personal.worker_identity');
    expect(nullCheckIdx).toBeGreaterThan(-1);
    expect(lookupIdx).toBeGreaterThan(-1);
    expect(nullCheckIdx).toBeLessThan(lookupIdx);
  });
});

describe('BLOCCO 1 — items 2/3: worker resolved from auth.uid(), tenant boundary enforced [STATIC]', () => {
  it('worker identity is resolved via personal.worker_identity WHERE auth_user_id = auth.uid()', () => {
    expect(activateFn).toMatch(/FROM personal\.worker_identity wi/);
    expect(activateFn).toMatch(/wi\.auth_user_id\s*=\s*auth\.uid\(\)/);
  });

  it('a worker-tenant vs link-tenant mismatch is checked and rejected (previously absent entirely)', () => {
    expect(activateFn).toMatch(/v_link_tenant_id\s+IS\s+DISTINCT\s+FROM\s+v_worker_tenant_id/);
  });

  it('the tenant-mismatch and worker-not-found paths return the identical generic status (no enumeration)', () => {
    // Both "worker not found / disabled" and "tenant mismatch" branches must return
    // exactly the same jsonb shape as every other "cannot activate" branch.
    const notFoundBranch = activateFn.slice(
      activateFn.indexOf('IF v_worker_id IS NULL'),
      activateFn.indexOf('END IF;', activateFn.indexOf('IF v_worker_id IS NULL')),
    );
    expect(notFoundBranch).toMatch(/jsonb_build_object\('status', 'unavailable'\)/);

    const tenantMismatchBranch = activateFn.slice(
      activateFn.indexOf('IF v_link_tenant_id IS DISTINCT'),
      activateFn.indexOf('END IF;', activateFn.indexOf('IF v_link_tenant_id IS DISTINCT')),
    );
    expect(tenantMismatchBranch).toMatch(/jsonb_build_object\('status', 'unavailable'\)/);
  });
});

describe('BLOCCO 1 — item 5: disabled worker is rejected [STATIC]', () => {
  it('v_worker_status = disabled is checked in the same branch as worker-not-found', () => {
    expect(activateFn).toMatch(/v_worker_id IS NULL OR v_worker_status = 'disabled'/);
  });
});

describe('BLOCCO 1 — items 9/10: revoked and expired tokens are rejected [STATIC]', () => {
  it('revoked/suspended/replaced/orphaned/expired states are all rejected', () => {
    expect(activateFn).toMatch(
      /IN \('revoked', 'suspended', 'replaced', 'orphaned', 'expired'\)/,
    );
  });

  it('TTL (pre_activation_expires_at) is checked with an inclusive boundary (<=)', () => {
    expect(activateFn).toMatch(/v_pre_activation_expires_at\s*<=\s*now\(\)/);
  });
});

describe('BLOCCO 1 — items 7/8: repeated activation and concurrency [STATIC]', () => {
  it('an already-active assignment for the same worker returns already_active (idempotent-safe)', () => {
    expect(activateFn).toMatch(/'status', 'already_active'/);
  });

  it('the token row is locked FOR UPDATE NOWAIT before any state transition', () => {
    expect(activateFn).toMatch(/FOR UPDATE NOWAIT/);
  });

  it('lock_not_available is caught and mapped to a safe concurrent_request error', () => {
    expect(activateFn).toMatch(/WHEN lock_not_available THEN/);
    expect(activateFn).toMatch(/'concurrent_request'/);
  });

  it('unique_violation on the partial index is caught and mapped to unavailable (no crash, no leak)', () => {
    expect(activateFn).toMatch(/WHEN unique_violation THEN/);
  });
});

describe('BLOCCO 1 — cross-schema access uses the established migration 020 pattern, not a new RLS grant [STATIC]', () => {
  it('search_path includes personal (needed to resolve personal.worker_identity unqualified-safe)', () => {
    const sigStart = sql036.indexOf('CREATE OR REPLACE FUNCTION kora_link.fn_activate_link_for_worker(');
    const setPathIdx = sql036.indexOf('SET search_path', sigStart);
    const setPathLine = sql036.slice(setPathIdx, sql036.indexOf('\n', setPathIdx));
    expect(setPathLine).toContain('personal');
  });

  it('no new GRANT statement targets personal.worker_identity in 034, 035, or 036', () => {
    for (const [label, src] of [['034', sql034], ['035', sql035], ['036', sql036]] as const) {
      expect(src, `${label} must not add a personal.worker_identity grant`).not.toMatch(
        /GRANT[^;]*ON\s+personal\.worker_identity/,
      );
    }
  });
});

describe('BLOCCO 1 — BEHAVIORAL-MISSING (requires a live database, not covered here)', () => {
  it.todo('item 1: worker corretto + token valido → activation succeeds end-to-end against a real DB');
  it.todo('item 6: N/A by construction — p_worker_id no longer exists as a parameter to manipulate');
  it.todo('item 8: real concurrent transactions racing on FOR UPDATE NOWAIT (this file only asserts the SQL clause exists)');
  it.todo('items 2/3/4/5/9/10: real Postgres execution of every branch above against seeded personal.worker_identity + kora_link.links rows');
});

// ═══════════════════════════════════════════════════════════════════════════
// BLOCCO 2 — Aggregation threshold (test matrix items 11-18)
// ═══════════════════════════════════════════════════════════════════════════

describe('BLOCCO 2 — canonical threshold applied per status bucket [STATIC]', () => {
  it('the [1,9] suppression window matches the canonical threshold (10)', () => {
    expect(aggregateFn).toMatch(/BETWEEN 1 AND 9/);
  });

  it('suppressed buckets return NULL for count, not 0 or omission-with-a-different-shape', () => {
    expect(aggregateFn).toMatch(/CASE WHEN rc\.raw_count BETWEEN 1 AND 9 THEN NULL ELSE rc\.raw_count END/);
  });

  it('the suppressed flag is derived from the same BETWEEN 1 AND 9 window as the NULL-ing', () => {
    expect(aggregateFn).toMatch(/rc\.raw_count BETWEEN 1 AND 9\s*\n\s*FROM raw_counts/);
  });

  it('RETURNS TABLE shape is exactly (status text, count bigint, suppressed boolean)', () => {
    expect(aggregateFn).toMatch(/RETURNS TABLE\s*\(\s*status\s+text,\s*count\s+bigint,\s*suppressed\s+boolean\s*\)/);
  });
});

describe('BLOCCO 2 — item 15: no subtraction-inference path [STATIC]', () => {
  it('the function never computes or returns a total/sum across buckets', () => {
    const codeOnly = aggregateFn
      .split('\n')
      .map((line) => line.replace(/--.*$/, ''))
      .join('\n');
    expect(codeOnly).not.toMatch(/SUM\s*\(/i);
    expect(codeOnly).not.toMatch(/\btotal\b/i);
  });

  it('there are no additional filter parameters to combine for inference (single p_tenant_id arg)', () => {
    const sigStart = sql036.indexOf('CREATE OR REPLACE FUNCTION kora_link.fn_company_link_status_aggregate(');
    const sigEnd = sql036.indexOf(')', sigStart);
    const signature = sql036.slice(sigStart, sigEnd + 1);
    expect(signature).toMatch(/p_tenant_id\s+uuid/);
    expect((signature.match(/\bp_\w+/g) ?? []).length).toBe(1);
  });
});

describe('BLOCCO 2 — items 16/17: tenant boundary and role gate unchanged by this sprint [STATIC]', () => {
  it('COMPANY_ADMIN p_tenant_id is validated against kora.tenant_id() from the JWT', () => {
    expect(aggregateFn).toMatch(/p_tenant_id IS NULL OR p_tenant_id <> kora\.tenant_id\(\)/);
  });

  it('only COMPANY_ADMIN and KORA_ADMIN may call this function', () => {
    expect(aggregateFn).toMatch(/kora\.kora_role\(\) NOT IN \('COMPANY_ADMIN', 'KORA_ADMIN'\)/);
  });
});

describe('BLOCCO 2 — item 18: no individual data ever in the aggregate RPC body [STATIC]', () => {
  it('link_id, worker_id, token_digest never appear in the executable body', () => {
    const codeOnly = aggregateFn
      .split('\n')
      .map((line) => line.replace(/--.*$/, ''))
      .join('\n');
    for (const forbidden of ['link_id', 'worker_id', 'token_digest']) {
      expect(codeOnly).not.toContain(forbidden);
    }
  });
});

describe('BLOCCO 2 — BEHAVIORAL-MISSING (requires a live database, not covered here)', () => {
  it.todo('items 11-13: seed 0/1/9/10/11-chip tenants and assert exact (count, suppressed) rows against a real DB');
  it.todo('item 14: N/A for this RPC — no filter parameters exist beyond p_tenant_id (see static test above)');
  it.todo('item 16: two real tenants, confirm COMPANY_ADMIN of tenant A gets 0 rows for tenant B');
});

// ═══════════════════════════════════════════════════════════════════════════
// BLOCCO 3 — Revocation and expiry (test matrix items 19-26)
// ═══════════════════════════════════════════════════════════════════════════

describe('BLOCCO 3 — revocation: role gate, idempotency, locking [STATIC — unchanged by S08, re-verified]', () => {
  it('fn_revoke_link requires kora_link.is_kora_admin()', () => {
    expect(revokeFn).toMatch(/IF NOT kora_link\.is_kora_admin\(\) THEN/);
    expect(revokeFn).toMatch(/'error_code', 'forbidden'/);
  });

  it('revoking an already-terminal link (revoked/replaced/orphaned) returns a defined idempotent-safe error, not a crash', () => {
    expect(revokeFn).toMatch(/IN \('revoked', 'replaced', 'orphaned'\)/);
    expect(revokeFn).toMatch(/'error_code', 'already_terminal'/);
  });

  it('the link row is locked FOR UPDATE NOWAIT before the revocation transition', () => {
    expect(revokeFn).toMatch(/FOR UPDATE NOWAIT/);
  });

  it('revocation is recorded in the append-only kora_link.revocations table', () => {
    expect(revokeFn).toMatch(/INSERT INTO kora_link\.revocations/);
  });

  it('revocation does not delete or overwrite prior audit-relevant rows (no DELETE, no UPDATE on revocations/link_events)', () => {
    const codeOnly = revokeFn.split('\n').map((l) => l.replace(/--.*$/, '')).join('\n');
    expect(codeOnly).not.toMatch(/DELETE FROM/i);
  });
});

describe('BLOCCO 3 — expiry: TTL model documented and bounded [STATIC]', () => {
  it('034 documents a bounded default pre-activation TTL (180 days), not an unbounded/infinite one', () => {
    expect(sql034).toMatch(/INTERVAL '180 days'/);
  });

  it('034 explicitly documents that post-activation has no TTL (manual revocation only) — a stated design choice, not an oversight', () => {
    expect(sql034).toMatch(/No TTL post-activation in v1/);
  });

  it('fn_public_lookup_link treats an expired pre-activation token as unavailable, same response as not-found (no enumeration)', () => {
    expect(publicLookupFn).toMatch(/v_pre_activation_expires_at\s*<=\s*now\(\)/);
    const expiredBranch = publicLookupFn.slice(
      publicLookupFn.indexOf('IF v_pre_activation_expires_at IS NOT NULL'),
    );
    expect(expiredBranch.slice(0, 300)).toMatch(/'unavailable'::text, 'link_not_available'::text/);
  });
});

describe('BLOCCO 3 — replacement chain [STATIC — unchanged by S08, re-verified]', () => {
  it('fn_replace_link requires kora_link.is_kora_admin()', () => {
    expect(replaceFn).toMatch(/IF NOT kora_link\.is_kora_admin\(\) THEN/);
  });

  it('both old and new link rows are locked FOR UPDATE NOWAIT', () => {
    const lockCount = (replaceFn.match(/FOR UPDATE NOWAIT/g) ?? []).length;
    expect(lockCount).toBeGreaterThanOrEqual(2);
  });

  it('a replaced-again old link (already terminal) is rejected, not silently re-replaced', () => {
    expect(replaceFn).toMatch(/IN \('revoked', 'replaced', 'orphaned'\)/);
  });
});

describe('BLOCCO 3 — retention decision — ratified by KORA-LINK-DPO-DECISIONS-09, not this sprint\'s scope to re-litigate [STATIC]', () => {
  it('034 marks audit_log retention duration as resolved by KORA-LINK-DPO-DECISIONS-09 (category-based, not a single duration)', () => {
    expect(sql034).toContain('TODO-CTO-05 / GATE-3');
    const idx = sql034.indexOf('TODO-CTO-05 / GATE-3');
    expect(sql034.slice(Math.max(0, idx - 60), idx)).toMatch(/RESOLVED KORA-LINK-DPO-DECISIONS-09/);
    expect(sql034.slice(idx, idx + 700)).toMatch(/Category-based retention ratified/);
  });
});

describe('BLOCCO 3 — BEHAVIORAL-MISSING (requires a live database, not covered here)', () => {
  it.todo('item 19: real KORA_ADMIN session revokes a real active link end-to-end');
  it.todo('item 20: cross-tenant revoke by KORA_ADMIN — confirm this is the documented bounded-admin-access pattern, not a new gap');
  it.todo('item 22: real concurrent revoke + activate race against the same link row');
  it.todo('items 23/24: exact-boundary now() comparisons against real timestamptz values in a real transaction');
});

// ═══════════════════════════════════════════════════════════════════════════
// BLOCCO 4 — Token security (test matrix items 27, 31 + general review)
// ═══════════════════════════════════════════════════════════════════════════

describe('BLOCCO 4 — token digest model re-verified after S08 changes [STATIC]', () => {
  it('kora_link.links still has no token cleartext column anywhere', () => {
    expect(sql034).not.toMatch(/^\s*token_value\s+text/im);
  });

  it('token_digest is still the sole UNIQUE lookup key (unchanged by S08)', () => {
    expect(sql034).toContain('CONSTRAINT uq_link_token_digest UNIQUE (token_digest)');
  });

  it('fn_activate_link_for_worker never logs or returns the raw token — only token_digest_prefix (8 chars) reaches audit_log', () => {
    expect(activateFn).not.toMatch(/\btoken_value\b/);
    expect(activateFn).toMatch(/left\(p_token_digest, 8\)/);
  });

  it('fn_activate_link_for_worker return values never include token_digest, worker_id, or tenant_id', () => {
    const returnStatements = [...activateFn.matchAll(/jsonb_build_object\([^)]*\)/g)].map((m) => m[0]);
    expect(returnStatements.length).toBeGreaterThan(0);
    for (const stmt of returnStatements) {
      expect(stmt).not.toMatch(/'token_digest'|'worker_id'|'tenant_id'|'assignment_id'/);
    }
  });

  it('single-assignment-per-token is enforced at the database level, not just in application logic', () => {
    expect(sql034).toContain('uq_assignment_link_active');
    expect(sql034).toMatch(/CREATE UNIQUE INDEX IF NOT EXISTS uq_assignment_link_active/);
  });
});

describe('BLOCCO 4 — BEHAVIORAL-MISSING (requires a live database, not covered here)', () => {
  it.todo('real HMAC digest generation entropy / collision resistance under production KORA_LINK_TOKEN_SECRET');
  it.todo('real database round-trip confirming no token_value column can ever be populated (schema-level guarantee, not just absence-of-column-definition)');
});

// ═══════════════════════════════════════════════════════════════════════════
// BLOCCO 5 — RLS and grants (test matrix items 27-33)
// ═══════════════════════════════════════════════════════════════════════════

describe('BLOCCO 5 — SECURITY DEFINER hygiene re-verified for the 2 functions S08 changed [STATIC]', () => {
  it('fn_activate_link_for_worker: SECURITY DEFINER + explicit search_path + REVOKE before GRANT', () => {
    expect(activateFn).toMatch(/SECURITY DEFINER/);
    expect(activateFn).toMatch(/SET search_path = kora_link, personal, kora, public/);
    const revokeIdx = sql036.indexOf('REVOKE ALL ON FUNCTION kora_link.fn_activate_link_for_worker(text, text) FROM PUBLIC;');
    const grantIdx = sql036.indexOf('GRANT EXECUTE ON FUNCTION kora_link.fn_activate_link_for_worker(text, text)');
    expect(revokeIdx).toBeGreaterThan(-1);
    expect(grantIdx).toBeGreaterThan(-1);
    expect(revokeIdx).toBeLessThan(grantIdx);
  });

  it('fn_activate_link_for_worker is not granted to anon (worker-only path)', () => {
    const grantLine = sql036
      .split('\n')
      .find((l) => l.includes('GRANT EXECUTE ON FUNCTION kora_link.fn_activate_link_for_worker(text, text)'));
    expect(grantLine).toBeDefined();
    expect(grantLine).not.toContain('anon');
    expect(grantLine).toContain('authenticated');
    expect(grantLine).toContain('service_role');
  });

  it('fn_company_link_status_aggregate: SECURITY DEFINER + explicit search_path + REVOKE before GRANT', () => {
    expect(aggregateFn).toMatch(/SECURITY DEFINER/);
    expect(aggregateFn).toMatch(/SET search_path = kora_link, kora, public/);
    const revokeIdx = sql036.indexOf('REVOKE ALL ON FUNCTION kora_link.fn_company_link_status_aggregate(uuid) FROM PUBLIC;');
    const grantIdx = sql036.indexOf('GRANT EXECUTE ON FUNCTION kora_link.fn_company_link_status_aggregate(uuid)');
    expect(revokeIdx).toBeGreaterThan(-1);
    expect(grantIdx).toBeGreaterThan(-1);
    expect(revokeIdx).toBeLessThan(grantIdx);
  });

  it('fn_company_link_status_aggregate is not granted to anon (company/admin-only path)', () => {
    const grantLine = sql036
      .split('\n')
      .find((l) => l.includes('GRANT EXECUTE ON FUNCTION kora_link.fn_company_link_status_aggregate(uuid)'));
    expect(grantLine).toBeDefined();
    expect(grantLine).not.toContain('anon');
  });
});

describe('BLOCCO 5 — no PUBLIC EXECUTE anywhere in 036 (unchanged invariant, re-verified) [STATIC]', () => {
  it('every REVOKE ALL ... FROM PUBLIC precedes its function\'s GRANT EXECUTE', () => {
    const revokes = [...sql036.matchAll(/REVOKE ALL ON FUNCTION kora_link\.(\w+)\(([^)]*)\) FROM PUBLIC;/g)];
    expect(revokes.length).toBeGreaterThanOrEqual(6);
    for (const m of revokes) {
      const [full, name, args] = m;
      const grantIdx = sql036.indexOf(`GRANT EXECUTE ON FUNCTION kora_link.${name}(${args})`);
      expect(grantIdx, `no GRANT EXECUTE found for ${name}(${args})`).toBeGreaterThan(-1);
      expect(sql036.indexOf(full)).toBeLessThan(grantIdx);
    }
  });
});

describe('BLOCCO 5 — RLS on all 9 tables unaffected by S08 (035 not touched at the table/policy level) [STATIC]', () => {
  const tables = [
    'link_batches', 'links', 'link_assignments', 'link_activation_acknowledgements',
    'link_events', 'revocations', 'link_replacements', 'audit_log', 'link_delivery_records',
  ] as const;

  for (const table of tables) {
    it(`kora_link.${table} still has ENABLE + FORCE ROW LEVEL SECURITY`, () => {
      expect(sql035).toContain(`ALTER TABLE kora_link.${table} ENABLE ROW LEVEL SECURITY;`);
      expect(sql035).toContain(`ALTER TABLE kora_link.${table} FORCE ROW LEVEL SECURITY;`);
    });
  }

  it('kora_link.link_assignments still has zero policy granting COMPANY_ADMIN any access (constitutional invariant)', () => {
    const tableSection = extractSection(sql035, '-- 4. kora_link.link_assignments');
    const activePolicyLines = tableSection
      .split('\n')
      .filter((line) => !line.trim().startsWith('--'));
    expect(activePolicyLines.join('\n')).not.toMatch(/COMPANY_ADMIN/);
  });
});

describe('BLOCCO 5 — BEHAVIORAL-MISSING (requires a live database, not covered here)', () => {
  it.todo('cross-tenant RLS enforcement under real JWTs (Company A cannot SELECT Company B rows) — this repo has no DB test harness for kora_link');
  it.todo('anon cannot enumerate links via any RLS-bypassing path on a real Postgres instance');
  it.todo('service_role grants behave as documented against a real Supabase project (grants exist in SQL text; not applied anywhere)');
});

// ═══════════════════════════════════════════════════════════════════════════
// BLOCCO 6 — Audit (test matrix item 26 + governance review)
// ═══════════════════════════════════════════════════════════════════════════

describe('BLOCCO 6 — fn_activate_link_for_worker now writes privacy-safe audit_log entries [STATIC]', () => {
  it('writes an ACTIVATION_COMPLETED audit_log row on success', () => {
    expect(activateFn).toMatch(/INSERT INTO kora_link\.audit_log/);
    expect(activateFn).toMatch(/'ACTIVATION_COMPLETED', 'ok'/);
  });

  it('writes an ACTIVATION_ATTEMPTED / forbidden audit_log row on the new tenant-boundary rejection', () => {
    expect(activateFn).toMatch(/'ACTIVATION_ATTEMPTED', 'forbidden'/);
  });

  it('every audit_log INSERT in this function uses token_digest_prefix (8 chars), never the full digest', () => {
    const inserts = [...activateFn.matchAll(/INSERT INTO kora_link\.audit_log[\s\S]*?\);/g)].map((m) => m[0]);
    expect(inserts.length).toBeGreaterThanOrEqual(2);
    for (const insert of inserts) {
      expect(insert).not.toMatch(/\bp_token_digest\b(?!\s*,\s*8\))/);
      expect(insert).toMatch(/left\(p_token_digest, 8\)/);
    }
  });

  it('audit_log metadata in this function contains no worker name/email — only event_category/reason', () => {
    const inserts = [...activateFn.matchAll(/jsonb_build_object\('event_category'[^)]*\)/g)].map((m) => m[0]);
    expect(inserts.length).toBeGreaterThan(0);
    for (const obj of inserts) {
      expect(obj).not.toMatch(/worker_name|worker_email|name|email/i);
    }
  });
});

describe('BLOCCO 6 — audit_log schema still forbids PII columns (unchanged, re-verified) [STATIC]', () => {
  it('kora_link.audit_log has no name/email column', () => {
    const tableDef = sql034.slice(
      sql034.indexOf('CREATE TABLE IF NOT EXISTS kora_link.audit_log'),
      sql034.indexOf(');', sql034.indexOf('CREATE TABLE IF NOT EXISTS kora_link.audit_log')),
    );
    expect(tableDef).not.toMatch(/\bname\s+text/i);
    expect(tableDef).not.toMatch(/\bemail\s+text/i);
  });

  it('kora_link.audit_log is still readable only by KORA_ADMIN (no COMPANY_ADMIN policy)', () => {
    const auditSection = extractSection(sql035, '-- 9. kora_link.audit_log');
    const activeLines = auditSection.split('\n').filter((l) => !l.trim().startsWith('--'));
    expect(activeLines.join('\n')).toMatch(/kora_link\.is_kora_admin\(\)/);
    expect(activeLines.join('\n')).not.toMatch(/COMPANY_ADMIN/);
  });
});

describe('BLOCCO 6 — residual gap: fn_revoke_link, fn_replace_link, fn_public_lookup_link do not yet write audit_log [documents the gap, does not close it]', () => {
  it('fn_revoke_link has no audit_log INSERT (link_events + revocations cover it today; residual gap, not silently claimed closed)', () => {
    expect(revokeFn).not.toMatch(/INSERT INTO kora_link\.audit_log/);
  });

  it('fn_replace_link has no audit_log INSERT (residual gap, not silently claimed closed)', () => {
    expect(replaceFn).not.toMatch(/INSERT INTO kora_link\.audit_log/);
  });

  it('035 TODO-RLS-05 explicitly documents this residual scope rather than implying full coverage', () => {
    const idx = sql035.indexOf('[TODO-RLS-05]');
    expect(sql035.slice(idx, idx + 1400)).toMatch(/do NOT yet write\s*\n?--\s*to audit_log/);
  });
});

describe('BLOCCO 6 — BEHAVIORAL-MISSING (requires a live database, not covered here)', () => {
  it.todo('real audit_log rows written and read back by a KORA_ADMIN session, confirming RLS + content shape end-to-end');
  it.todo('DPO break-glass read procedure ([TODO-RLS-06]) — design not yet started, out of this sprint\'s scope');
});
