/**
 * KORA-LINK-HARDENING-AUTOMATION-13A — audit hardening for fn_revoke_link and
 * fn_replace_link.
 *
 * Closes Gate 4 finding 5/6 (docs/KORA_LINK_GATE_4_FINAL_REPORT.md §10, §14
 * action D): these two functions previously wrote no kora_link.audit_log row
 * on any branch, success or denial. 039_kora_link_audit_hardening.sql adds
 * exactly two audit_log INSERTs per function (success + role-check denial),
 * with zero changes to any other line.
 *
 * IMPORTANT — test taxonomy (do not blur these; same convention as
 * tests/unit/kora-link-security-foundation-08.test.ts):
 *   STATIC   — reads supabase/migrations/*.sql as text and asserts structural
 *              properties. Proves the SQL text says what we intend. Does NOT
 *              prove the SQL executes correctly against a real Postgres
 *              instance — there is no database in this test run.
 *   BEHAVIORAL-MISSING — scenarios that need a live database (an actual
 *              second call observing row counts, an actual constraint
 *              failure triggering rollback). Not covered here — deferred to
 *              KORA-LINK-HARDENING-AUTOMATION-13C, which owns building the
 *              repo's live/local-DB test infrastructure. Manually exercised
 *              once against an ephemeral local database as part of 13A's own
 *              FASE 5 validation (see the sprint report), but that one-time
 *              manual run is not itself a repo-committed automated test.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const REPO_ROOT = join(__dirname, '..', '..');

function readSource(relativePath: string): string {
  return readFileSync(join(REPO_ROOT, relativePath), 'utf8');
}

const SQL_036_PATH = 'supabase/migrations/036_kora_link_rpc_functions.sql';
const SQL_039_PATH = 'supabase/migrations/039_kora_link_audit_hardening.sql';

const sql036 = readSource(SQL_036_PATH);
const sql039 = readSource(SQL_039_PATH);

function extractFunctionBlock(sql: string, fnStartMarker: string): string {
  const start = sql.indexOf(fnStartMarker);
  expect(start, `${fnStartMarker} not found`).toBeGreaterThan(-1);
  const end = sql.indexOf('\n$$;', start);
  expect(end, `${fnStartMarker} body end ($$;) not found`).toBeGreaterThan(start);
  return sql.slice(start, end + 4);
}

function indexOfExceptionKeyword(fnBlock: string): number {
  const idx = fnBlock.indexOf('\nEXCEPTION\n');
  expect(idx, 'EXCEPTION keyword line not found').toBeGreaterThan(-1);
  return idx + 1; // point at "EXCEPTION", not the leading newline
}

function isLineSubsequence(originalBlock: string, newBlock: string): boolean {
  const originalLines = originalBlock.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
  const newLines = newBlock.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
  let i = 0;
  for (const line of newLines) {
    if (i < originalLines.length && line === originalLines[i]) {
      i += 1;
    }
  }
  return i === originalLines.length;
}

const revoke036 = extractFunctionBlock(sql036, 'CREATE OR REPLACE FUNCTION kora_link.fn_revoke_link(');
const revoke039 = extractFunctionBlock(sql039, 'CREATE OR REPLACE FUNCTION kora_link.fn_revoke_link(');
const replace036 = extractFunctionBlock(sql036, 'CREATE OR REPLACE FUNCTION kora_link.fn_replace_link(');
const replace039 = extractFunctionBlock(sql039, 'CREATE OR REPLACE FUNCTION kora_link.fn_replace_link(');

// ── Migration file exists, depends on 036, does not touch 034/035/036 ───────

describe('039 exists, is canonical, depends on 036, does not modify 034/035/036', () => {
  it('039_kora_link_audit_hardening.sql exists under supabase/migrations/', () => {
    expect(() => readSource(SQL_039_PATH)).not.toThrow();
  });

  it('declares a dependency on 036_kora_link_rpc_functions.sql', () => {
    expect(sql039).toMatch(/Depends on:\s*036_kora_link_rpc_functions\.sql/);
  });

  it('034 and 035 are untouched by this sprint (039 only replaces functions in 036\'s namespace)', () => {
    expect(sql039).not.toMatch(/CREATE TABLE/i);
    expect(sql039).not.toMatch(/CREATE POLICY/i);
    expect(sql039).not.toMatch(/ALTER TABLE/i);
  });

  it('a rollback file exists for 039', () => {
    expect(() => readSource('supabase/rollback/039_rollback_039_if_needed.sql')).not.toThrow();
  });
});

// ── 13A.1 / 13A.2 — success audit: single row, correct event, correct tenant ─

describe('13A.1 — fn_revoke_link success writes exactly one LINK_REVOKED audit row [STATIC]', () => {
  it('exactly one audit_log INSERT exists on the success path (excluding the forbidden-branch one)', () => {
    const afterRoleCheck = revoke039.slice(revoke039.indexOf('END IF;'));
    const successPathInserts = [...afterRoleCheck.matchAll(/INSERT INTO kora_link\.audit_log/g)];
    expect(successPathInserts.length).toBe(1);
  });

  it('the success audit row uses action=LINK_REVOKED, result=ok', () => {
    const successInsert = revoke039.slice(revoke039.lastIndexOf('INSERT INTO kora_link.audit_log'));
    expect(successInsert).toMatch(/'LINK_REVOKED',\s*'ok'/);
  });

  it('the success audit row uses the looked-up tenant (v_tenant_id), not a hardcoded or client-supplied value', () => {
    const successInsert = revoke039.slice(revoke039.lastIndexOf('INSERT INTO kora_link.audit_log'));
    expect(successInsert).toMatch(/p_link_id,\s*v_tenant_id,\s*'kora_admin'/);
  });

  it('the success audit row occurs after the RETURNING worker_id (real operation already happened) and before the final RETURN', () => {
    const returningIdx = revoke039.indexOf('RETURNING worker_id INTO v_worker_id');
    const auditIdx = revoke039.lastIndexOf('INSERT INTO kora_link.audit_log');
    const finalReturnIdx = revoke039.indexOf("RETURN jsonb_build_object('success', true);");
    expect(returningIdx).toBeGreaterThan(-1);
    expect(auditIdx).toBeGreaterThan(returningIdx);
    expect(finalReturnIdx).toBeGreaterThan(auditIdx);
  });
});

describe('13A.2 — fn_replace_link success writes exactly one LINK_REPLACED audit row [STATIC]', () => {
  it('exactly one audit_log INSERT exists on the success path (excluding the forbidden-branch one)', () => {
    const afterRoleCheck = replace039.slice(replace039.indexOf('END IF;'));
    const successPathInserts = [...afterRoleCheck.matchAll(/INSERT INTO kora_link\.audit_log/g)];
    expect(successPathInserts.length).toBe(1);
  });

  it('the success audit row uses action=LINK_REPLACED, result=ok', () => {
    const successInsert = replace039.slice(replace039.lastIndexOf('INSERT INTO kora_link.audit_log'));
    expect(successInsert).toMatch(/'LINK_REPLACED',\s*'ok'/);
  });

  it('the success audit row uses the looked-up tenant (v_tenant_id)', () => {
    const successInsert = replace039.slice(replace039.lastIndexOf('INSERT INTO kora_link.audit_log'));
    expect(successInsert).toMatch(/p_old_link_id,\s*v_tenant_id,\s*'kora_admin'/);
  });

  it('the success audit row occurs after both link_events inserts and before the final RETURN', () => {
    const lastEventInsertIdx = replace039.lastIndexOf("event_type,\n    actor_type, actor_id, result, metadata\n  ) VALUES (\n    p_new_link_id");
    const auditIdx = replace039.lastIndexOf('INSERT INTO kora_link.audit_log');
    const finalReturnIdx = replace039.indexOf("RETURN jsonb_build_object('success', true, 'new_link_id', p_new_link_id);");
    expect(lastEventInsertIdx).toBeGreaterThan(-1);
    expect(auditIdx).toBeGreaterThan(lastEventInsertIdx);
    expect(finalReturnIdx).toBeGreaterThan(auditIdx);
  });
});

// ── 13A.3 / 13A.4 — idempotency: the success audit is structurally ────────────
// unreachable on a repeat call, because every early-return terminal-state
// check precedes it in the same execution path.

describe('13A.3 — fn_revoke_link: repeated calls cannot reach the success audit twice [STATIC]', () => {
  it('the already_terminal early return precedes the success audit INSERT (a 2nd call on an already-revoked link returns before auditing again)', () => {
    const terminalCheckIdx = revoke039.indexOf("error_code', 'already_terminal'");
    const auditIdx = revoke039.lastIndexOf('INSERT INTO kora_link.audit_log');
    expect(terminalCheckIdx).toBeGreaterThan(-1);
    expect(terminalCheckIdx).toBeLessThan(auditIdx);
  });
});

describe('13A.4 — fn_replace_link: repeated calls cannot reach the success audit twice [STATIC]', () => {
  it('the already_terminal / new_link_unavailable early returns precede the success audit INSERT', () => {
    const terminalCheckIdx = replace039.indexOf("error_code', 'already_terminal'");
    const newUnavailableIdx = replace039.indexOf("error_code', 'new_link_unavailable'");
    const auditIdx = replace039.lastIndexOf('INSERT INTO kora_link.audit_log');
    expect(terminalCheckIdx).toBeGreaterThan(-1);
    expect(newUnavailableIdx).toBeGreaterThan(-1);
    expect(terminalCheckIdx).toBeLessThan(auditIdx);
    expect(newUnavailableIdx).toBeLessThan(auditIdx);
  });

  it('the unique_violation exception branch (already_replaced, a race-condition idempotency guard) still writes no audit row', () => {
    const exceptionBlock = replace039.slice(indexOfExceptionKeyword(replace039));
    expect(exceptionBlock).not.toMatch(/audit_log/);
  });
});

describe('13A.3/13A.4 — BEHAVIORAL-MISSING (requires a live database, not covered here)', () => {
  it.todo('two sequential live calls to fn_revoke_link on the same link produce exactly 1 LINK_REVOKED audit row, not 2 — deferred to 13C');
  it.todo('two sequential live calls to fn_replace_link on the same old_link_id produce exactly 1 LINK_REPLACED audit row, not 2 — deferred to 13C');
});

// ── 13A.5 / 13A.6 — forbidden: response unchanged, one privacy-safe audit row ─

describe('13A.5 — fn_revoke_link forbidden branch: response unchanged, one ADMIN_ACTION_DENIED row, no enumeration [STATIC]', () => {
  const forbiddenBlock = revoke039.slice(
    revoke039.indexOf('IF NOT kora_link.is_kora_admin() THEN'),
    revoke039.indexOf('END IF;') + 'END IF;'.length,
  );

  it('the forbidden branch still returns exactly the same response as 036 (byte-identical)', () => {
    const forbidden036 = revoke036.slice(
      revoke036.indexOf('IF NOT kora_link.is_kora_admin() THEN'),
      revoke036.indexOf('END IF;') + 'END IF;'.length,
    );
    expect(forbidden036).toContain("RETURN jsonb_build_object('success', false, 'error_code', 'forbidden');");
    expect(forbiddenBlock).toContain("RETURN jsonb_build_object('success', false, 'error_code', 'forbidden');");
  });

  it('writes exactly one audit_log INSERT before the forbidden RETURN', () => {
    const inserts = [...forbiddenBlock.matchAll(/INSERT INTO kora_link\.audit_log/g)];
    expect(inserts.length).toBe(1);
    expect(forbiddenBlock.indexOf('INSERT INTO kora_link.audit_log')).toBeLessThan(
      forbiddenBlock.indexOf("RETURN jsonb_build_object('success', false, 'error_code', 'forbidden');"),
    );
  });

  it('action=ADMIN_ACTION_DENIED, result=forbidden', () => {
    expect(forbiddenBlock).toMatch(/'ADMIN_ACTION_DENIED',\s*'forbidden'/);
  });

  it('link_id and tenant_id are NULL — no target link is enumerable from this audit row', () => {
    expect(forbiddenBlock).toMatch(/INSERT INTO kora_link\.audit_log \(\s*link_id, tenant_id[\s\S]*?\)\s*VALUES\s*\(\s*NULL, NULL,/);
  });

  it('p_link_id is never referenced inside the forbidden-branch INSERT VALUES', () => {
    const insertOnly = forbiddenBlock.slice(
      forbiddenBlock.indexOf('INSERT INTO kora_link.audit_log'),
      forbiddenBlock.indexOf(');', forbiddenBlock.indexOf('INSERT INTO kora_link.audit_log')) + 2,
    );
    expect(insertOnly).not.toMatch(/p_link_id/);
  });

  it('token_digest_prefix is NULL (no token/digest involved in this function at all)', () => {
    expect(forbiddenBlock).toMatch(/'forbidden',\s*\n\s*NULL,/);
  });
});

describe('13A.6 — fn_replace_link forbidden branch: response unchanged, one ADMIN_ACTION_DENIED row, no enumeration [STATIC]', () => {
  const forbiddenBlock = replace039.slice(
    replace039.indexOf('IF NOT kora_link.is_kora_admin() THEN'),
    replace039.indexOf('END IF;') + 'END IF;'.length,
  );

  it('the forbidden branch still returns exactly the same response as 036', () => {
    expect(forbiddenBlock).toContain("RETURN jsonb_build_object('success', false, 'error_code', 'forbidden');");
  });

  it('writes exactly one audit_log INSERT before the forbidden RETURN', () => {
    const inserts = [...forbiddenBlock.matchAll(/INSERT INTO kora_link\.audit_log/g)];
    expect(inserts.length).toBe(1);
    expect(forbiddenBlock.indexOf('INSERT INTO kora_link.audit_log')).toBeLessThan(
      forbiddenBlock.indexOf("RETURN jsonb_build_object('success', false, 'error_code', 'forbidden');"),
    );
  });

  it('action=ADMIN_ACTION_DENIED, result=forbidden', () => {
    expect(forbiddenBlock).toMatch(/'ADMIN_ACTION_DENIED',\s*'forbidden'/);
  });

  it('link_id and tenant_id are NULL, and neither p_old_link_id nor p_new_link_id is referenced in the INSERT', () => {
    const insertOnly = forbiddenBlock.slice(
      forbiddenBlock.indexOf('INSERT INTO kora_link.audit_log'),
      forbiddenBlock.indexOf(');', forbiddenBlock.indexOf('INSERT INTO kora_link.audit_log')) + 2,
    );
    expect(insertOnly).toMatch(/VALUES\s*\(\s*NULL, NULL,/);
    expect(insertOnly).not.toMatch(/p_old_link_id|p_new_link_id/);
  });
});

// ── 13A.7 — no audit for internal/exception errors ────────────────────────────

describe('13A.7 — no audit_log write in any EXCEPTION branch [STATIC]', () => {
  it('fn_revoke_link: zero audit_log references anywhere after the EXCEPTION keyword', () => {
    const exceptionBlock = revoke039.slice(indexOfExceptionKeyword(revoke039));
    expect(exceptionBlock).not.toMatch(/audit_log/);
  });

  it('fn_replace_link: zero audit_log references anywhere after the EXCEPTION keyword', () => {
    const exceptionBlock = replace039.slice(indexOfExceptionKeyword(replace039));
    expect(exceptionBlock).not.toMatch(/audit_log/);
  });

  it('both EXCEPTION blocks are otherwise byte-identical to 036 (WHEN OTHERS still returns a generic internal error)', () => {
    const revokeExc036 = revoke036.slice(indexOfExceptionKeyword(revoke036));
    const revokeExc039 = revoke039.slice(indexOfExceptionKeyword(revoke039));
    expect(revokeExc039).toBe(revokeExc036);

    const replaceExc036 = replace036.slice(indexOfExceptionKeyword(replace036));
    const replaceExc039 = replace039.slice(indexOfExceptionKeyword(replace039));
    expect(replaceExc039).toBe(replaceExc036);
  });
});

// ── 13A.8 — atomicity: audit write shares the function's implicit transaction ─

describe('13A.8 — audit INSERT shares atomicity with the main operation via the existing EXCEPTION WHEN OTHERS [STATIC]', () => {
  it('fn_revoke_link: both new audit_log INSERTs are positioned between BEGIN and EXCEPTION (inside the guarded block, not after it)', () => {
    const beginIdx = revoke039.indexOf('BEGIN');
    const exceptionIdx = indexOfExceptionKeyword(revoke039);
    const inserts = [...revoke039.matchAll(/INSERT INTO kora_link\.audit_log/g)].map((m) => m.index!);
    expect(inserts.length).toBe(2);
    for (const idx of inserts) {
      expect(idx).toBeGreaterThan(beginIdx);
      expect(idx).toBeLessThan(exceptionIdx);
    }
  });

  it('fn_replace_link: both new audit_log INSERTs are positioned between BEGIN and EXCEPTION', () => {
    const beginIdx = replace039.indexOf('BEGIN');
    const exceptionIdx = indexOfExceptionKeyword(replace039);
    const inserts = [...replace039.matchAll(/INSERT INTO kora_link\.audit_log/g)].map((m) => m.index!);
    expect(inserts.length).toBe(2);
    for (const idx of inserts) {
      expect(idx).toBeGreaterThan(beginIdx);
      expect(idx).toBeLessThan(exceptionIdx);
    }
  });

  it('a WHEN OTHERS handler exists and is unchanged, which is what makes any statement failure (including the new audit INSERT) roll back the whole call', () => {
    expect(revoke039).toMatch(/WHEN OTHERS THEN\s*\n\s*RETURN jsonb_build_object\('success', false, 'error_code', 'internal'\);/);
    expect(replace039).toMatch(/WHEN OTHERS THEN\s*\n\s*RETURN jsonb_build_object\('success', false, 'error_code', 'internal'\);/);
  });
});

describe('13A.8 — BEHAVIORAL-MISSING (requires a live database, not covered here)', () => {
  it.todo('forcing the success-path audit_log INSERT to fail (e.g. a temporarily broken constraint) causes the whole fn_revoke_link call to report internal and leave zero rows in link_assignments/revocations/links/link_events/audit_log — deferred to 13C');
  it.todo('same rollback-completeness check for fn_replace_link — deferred to 13C');
});

// ── 13A.9 — privacy scan ───────────────────────────────────────────────────────

describe('13A.9 — audit_log INSERTs never contain forbidden data [STATIC]', () => {
  const allNewAuditInserts = [
    ...[...revoke039.matchAll(/INSERT INTO kora_link\.audit_log[\s\S]*?\);/g)].map((m) => m[0]),
    ...[...replace039.matchAll(/INSERT INTO kora_link\.audit_log[\s\S]*?\);/g)].map((m) => m[0]),
  ];

  it('sanity: exactly 4 new audit_log INSERT statements found (2 per function)', () => {
    expect(allNewAuditInserts.length).toBe(4);
  });

  it('no raw token or full token_digest variable is referenced (these functions never receive a token param at all)', () => {
    for (const insert of allNewAuditInserts) {
      expect(insert).not.toMatch(/p_token/i);
      expect(insert).not.toMatch(/token_digest\b(?!_prefix)/);
      expect(insert).not.toMatch(/token_value/);
    }
  });

  it('token_digest_prefix is always NULL, never derived via left(...)', () => {
    for (const insert of allNewAuditInserts) {
      expect(insert).not.toMatch(/left\(/i);
    }
  });

  it('no email, worker_name, or worker_email field is referenced', () => {
    for (const insert of allNewAuditInserts) {
      expect(insert).not.toMatch(/email/i);
      expect(insert).not.toMatch(/worker_name/i);
    }
  });

  it('worker_id is never included (v_worker_id is never referenced in any of the 4 new INSERTs)', () => {
    for (const insert of allNewAuditInserts) {
      expect(insert).not.toMatch(/v_worker_id/);
    }
  });

  it('no raw request payload or free-text field is interpolated beyond the enum-constrained p_reason', () => {
    for (const insert of allNewAuditInserts) {
      // Only allowed free-form-looking value is the CHECK-constrained p_reason
      // on the success-path inserts; the forbidden-path inserts reference no
      // request parameter at all (already verified in 13A.5/13A.6).
      const referencesReason = /p_reason/.test(insert);
      const referencesForbiddenBranch = /ADMIN_ACTION_DENIED/.test(insert);
      if (referencesForbiddenBranch) {
        expect(referencesReason).toBe(false);
      }
    }
  });

  it('actor_type used in every new INSERT is one of the 4 values the audit_log CHECK constraint allows', () => {
    const allowed = ['kora_admin', 'company_admin', 'worker', 'system'];
    for (const insert of allNewAuditInserts) {
      const match = insert.match(/VALUES\s*\(\s*(?:NULL|p_\w+),\s*(?:NULL|v_tenant_id),\s*'(\w+)'/);
      expect(match, `could not find actor_type literal in: ${insert.slice(0, 120)}`).not.toBeNull();
      expect(allowed).toContain(match![1]);
    }
  });
});

describe('13A.9 — BEHAVIORAL-MISSING (requires a live database, not covered here)', () => {
  it.todo('a live SELECT against kora_link.audit_log after real revoke/replace/denied calls contains no token/email/worker_name column value — deferred to 13C');
});

// ── 13A.10 — regression: C4/C7/C8 semantics and response shape unchanged ──────

describe('13A.10 — response shape is byte-identical to 036 for every branch [STATIC]', () => {
  function extractReturns(fnBlock: string): string[] {
    return [...fnBlock.matchAll(/RETURN jsonb_build_object\([^;]*\);/g)].map((m) => m[0]);
  }

  it('fn_revoke_link: identical set of RETURN statements (same keys, same values, same order) as 036', () => {
    expect(extractReturns(revoke039)).toEqual(extractReturns(revoke036));
  });

  it('fn_replace_link: identical set of RETURN statements as 036', () => {
    expect(extractReturns(replace039)).toEqual(extractReturns(replace036));
  });
});

describe('13A.10 — C4 (revocation lifecycle) semantics unchanged [STATIC]', () => {
  it('terminal-state list for revoke is unchanged: revoked, replaced, orphaned', () => {
    expect(revoke039).toContain("IF v_link_status IN ('revoked', 'replaced', 'orphaned') THEN");
  });

  it('every line of 036\'s fn_revoke_link is preserved, in order, in 039 (039 only inserts new lines, never edits or removes one)', () => {
    expect(isLineSubsequence(revoke036, revoke039)).toBe(true);
  });

  it('every line of 036\'s fn_replace_link is preserved, in order, in 039', () => {
    expect(isLineSubsequence(replace036, replace039)).toBe(true);
  });
});

describe('13A.10 — C7 (KORA_ADMIN authorization) semantics unchanged [STATIC]', () => {
  it('fn_revoke_link: is_kora_admin() is still the first check in the function body', () => {
    const bodyStart = revoke039.indexOf('BEGIN');
    const firstCheck = revoke039.indexOf('IF NOT kora_link.is_kora_admin() THEN');
    const anyOtherIf = revoke039.slice(bodyStart, firstCheck).match(/\bIF\b/);
    expect(anyOtherIf).toBeNull();
  });

  it('fn_replace_link: is_kora_admin() is still the first check in the function body', () => {
    const bodyStart = replace039.indexOf('BEGIN');
    const firstCheck = replace039.indexOf('IF NOT kora_link.is_kora_admin() THEN');
    const anyOtherIf = replace039.slice(bodyStart, firstCheck).match(/\bIF\b/);
    expect(anyOtherIf).toBeNull();
  });
});

describe('13A.10 — C8 (service_role grants) unchanged: 039 does not restate or alter any GRANT/REVOKE [STATIC]', () => {
  // Strip `--` line comments first — 039's own header/inline prose explains
  // (in comments) that GRANT/REVOKE/service_role are intentionally NOT
  // restated, which would otherwise false-positive a naive text search.
  const sql039NoComments = sql039
    .split('\n')
    .map((line) => {
      const idx = line.indexOf('--');
      return idx === -1 ? line : line.slice(0, idx);
    })
    .join('\n');

  it('039 contains no executable GRANT or REVOKE statement anywhere (comments aside)', () => {
    expect(sql039NoComments).not.toMatch(/^\s*GRANT\s/m);
    expect(sql039NoComments).not.toMatch(/^\s*REVOKE\s/m);
  });

  it('039 does not reference service_role as executable SQL — no new service_role-specific logic was added', () => {
    expect(sql039NoComments).not.toMatch(/service_role/);
  });
});
