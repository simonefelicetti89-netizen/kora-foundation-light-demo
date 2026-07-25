/**
 * KORA Link — schema 034 Gate 2 technical review closure (KORA-LINK-S2).
 *
 * `tests/unit/kora-link-privacy-invariants.test.ts` (KORA-LINK-S1) guards the
 * cross-cutting privacy invariants (no forbidden columns, aggregate RPC
 * shape, opaque token). This file guards what the KL-19 Gate 2 review pass
 * specifically touched or found: that 034/035/036 stay internally
 * consistent (table names, function names, gate-status headers) and that
 * the PG15-compatibility concerns KL-16/KL-19 resolved don't silently creep
 * back in on a future edit.
 *
 * Static/structural only — reads source text, does not run against a
 * database. See docs/KORA_LINK_ADR.md, docs/KORA_LINK_GATE_REPORT.md.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const REPO_ROOT = join(__dirname, '..', '..');

function readSource(relativePath: string): string {
  return readFileSync(join(REPO_ROOT, relativePath), 'utf8');
}

const SQL_034 = 'supabase/proposed/034_kora_link_schema.sql';
const SQL_035 = 'supabase/proposed/035_kora_link_rls.sql';
const SQL_036 = 'supabase/proposed/036_kora_link_rpc_functions.sql';

// ── 1. Table references stay consistent across 034 → 035 ─────────────────────

describe('KORA Link schema034 review — 034/035 table references stay consistent', () => {
  const schema034 = readSource(SQL_034);
  const rls035 = readSource(SQL_035);

  const tablesIn034 = [...schema034.matchAll(/^CREATE TABLE IF NOT EXISTS kora_link\.(\w+)/gm)].map((m) => m[1]);

  it('034 defines exactly the 9 tables the KL-16/KL-19 table set documents', () => {
    expect(tablesIn034.sort()).toEqual(
      [
        'audit_log',
        'link_activation_acknowledgements',
        'link_assignments',
        'link_batches',
        'link_delivery_records',
        'link_events',
        'link_replacements',
        'links',
        'revocations',
      ].sort(),
    );
  });

  it('every table 035 enables RLS on exists in 034', () => {
    const tablesIn035 = [...rls035.matchAll(/ALTER TABLE kora_link\.(\w+) ENABLE ROW LEVEL SECURITY/g)].map(
      (m) => m[1],
    );
    expect(tablesIn035.length).toBeGreaterThan(0);
    for (const table of tablesIn035) {
      expect(tablesIn034, `035 enables RLS on kora_link.${table}, which 034 does not define`).toContain(table);
    }
  });

  it('035 does not enable RLS on partner_scans or public_lookup_attempts (both deferred/removed from 034)', () => {
    const rls035NoComments = rls035;
    expect(rls035NoComments).not.toMatch(/ALTER TABLE kora_link\.partner_scans/);
    expect(rls035NoComments).not.toMatch(/ALTER TABLE kora_link\.public_lookup_attempts/);
  });
});

// ── 2. SECURITY DEFINER function names stay consistent across 035 → 036 ──────

describe('KORA Link schema034 review — 035 spec names match 036 implemented names', () => {
  const rls035 = readSource(SQL_035);
  const rpc036 = readSource(SQL_036);

  // KL-19 renamed 035's spec-only references from fn_kora_link_* to the
  // actual names 036 implements — pin that the CURRENT names 036 implements
  // are used throughout 035's function-name references (the FUNCTION SPEC
  // section headings), not just mentioned once in the historical KL-19 note.
  it('035s FUNCTION SPEC headings use the current 036 names, not the superseded fn_kora_link_* ones', () => {
    const specHeadings = [...rls035.matchAll(/^-- FUNCTION SPEC \w: (\S+)/gm)].map((m) => m[1]);
    expect(specHeadings.length).toBeGreaterThan(0);
    for (const heading of specHeadings) {
      expect(heading.startsWith('fn_kora_link_'), `FUNCTION SPEC heading "${heading}" still uses the superseded name`).toBe(
        false,
      );
    }
  });

  const functionsIn036 = [...rpc036.matchAll(/^CREATE OR REPLACE FUNCTION kora_link\.(\w+)/gm)].map((m) => m[1]);

  it('036 implements the 5 RPC functions 035 documents in its TODO_SECURITY_DEFINER spec', () => {
    const expectedNames = [
      'fn_public_lookup_link',
      'fn_activate_link_for_worker',
      'fn_revoke_link',
      'fn_replace_link',
      'fn_company_link_status_aggregate',
    ];
    for (const name of expectedNames) {
      expect(functionsIn036, `036 does not implement ${name}`).toContain(name);
      expect(rls035, `035's spec section does not reference ${name}`).toContain(name);
    }
  });
});

// ── 3. PG15-only constructs stay eliminated (KL-16/KL-19 resolution) ──────────

describe('KORA Link schema034 review — PG15-only constructs remain eliminated', () => {
  const schema034 = readSource(SQL_034);
  // Both constructs are legitimately named in `--` line-comment prose
  // (explaining why KL-16/KL-19 avoided them) — strip comments so only a
  // real SQL definition would match.
  const schema034NoComments = schema034
    .split('\n')
    .map((line) => {
      const idx = line.indexOf('--');
      return idx === -1 ? line : line.slice(0, idx);
    })
    .join('\n');

  it('034 defines no UNIQUE NULLS NOT DISTINCT constraint', () => {
    expect(schema034NoComments).not.toMatch(/NULLS NOT DISTINCT/);
  });

  it('034 defines no GENERATED ALWAYS AS column', () => {
    expect(schema034NoComments).not.toMatch(/GENERATED ALWAYS AS\s*\(/);
  });

  it('034 defines no DEFERRABLE constraint', () => {
    // "DEFERRABLE" appears in prose (explaining why A-08 avoided it) — that's
    // expected and fine. Check for the actual functional SQL forms instead.
    expect(schema034).not.toMatch(/\bINITIALLY\s+DEFERRED\b/i);
    expect(schema034).not.toMatch(/\bDEFERRABLE\s+INITIALLY\b/i);
  });

  it('target Postgres major_version is >= 15 (supabase/config.toml)', () => {
    const config = readSource('supabase/config.toml');
    const match = config.match(/major_version\s*=\s*(\d+)/);
    expect(match, 'major_version not found in supabase/config.toml').not.toBeNull();
    const version = Number(match?.[1]);
    expect(version).toBeGreaterThanOrEqual(15);
  });
});

// ── 4. Gate-status headers stay internally consistent ────────────────────────

describe('KORA Link schema034 review — gate-status headers are internally consistent', () => {
  const schema034 = readSource(SQL_034);
  const rls035 = readSource(SQL_035);
  const rpc036 = readSource(SQL_036);

  it('034 declares itself technically reviewed at Gate 2 (KL-19)', () => {
    expect(schema034).toContain('PROPOSED_GATE2_TECHNICALLY_REVIEWED');
  });

  it('034 still declares Gate 3 (DPO) open — KL-19 does not close Gate 3', () => {
    expect(schema034).toMatch(/Gate 3.*OPEN|Gate 3 \(DPO\) open/);
  });

  it('035 references 034s KL-19 reviewed status, not the stale pre-KL-19 label', () => {
    expect(rls035).toContain('KL-19');
    expect(rls035).not.toMatch(/Depends on:\s*034_kora_link_schema\.sql \(PROPOSED_AMENDED_INTERNAL_ENGINEERING\)/);
  });

  it('036 references 034s KL-19 reviewed status, not the stale pre-KL-19 label', () => {
    expect(rpc036).toContain('KL-19');
    expect(rpc036).not.toMatch(/Depends on:\s*034_kora_link_schema\.sql \(PROPOSED_AMENDED_INTERNAL_ENGINEERING\)/);
  });

  it('035 and 036 do not claim their OWN review is closed (only 034s is)', () => {
    // 035/036 remain their own separate, still-open reviews (Gate 4 for 035).
    expect(rls035).not.toContain('PROPOSED_RLS_REVIEWED');
    expect(rpc036).not.toContain('PROPOSED_RPC_FUNCTIONS_REVIEWED');
  });
});

// ── 5. Public lookup RPC never returns individual/PII fields ─────────────────
// Complements kora-link-privacy-invariants.test.ts's check on the COMPANY-
// facing aggregate RPC by covering the PUBLIC (anon-accessible) one too.

describe('KORA Link schema034 review — public lookup RPC returns only minimal status/reason', () => {
  it('fn_public_lookup_link RETURNS TABLE is exactly (status text, reason text)', () => {
    const rpc036 = readSource(SQL_036);
    const startMarker = 'CREATE OR REPLACE FUNCTION kora_link.fn_public_lookup_link';
    const startIdx = rpc036.indexOf(startMarker);
    expect(startIdx, 'fn_public_lookup_link not found in 036').toBeGreaterThan(-1);

    const afterStart = rpc036.slice(startIdx);
    expect(afterStart).toMatch(/RETURNS TABLE\s*\(\s*status\s+text,\s*reason\s+text\s*\)/);

    const bodyStart = afterStart.indexOf('AS $$');
    const bodyEnd = afterStart.indexOf('$$;', bodyStart);
    expect(bodyStart).toBeGreaterThan(-1);
    expect(bodyEnd).toBeGreaterThan(bodyStart);

    const bodyNoComments = afterStart
      .slice(bodyStart, bodyEnd)
      .split('\n')
      .map((line) => {
        const idx = line.indexOf('--');
        return idx === -1 ? line : line.slice(0, idx);
      })
      .join('\n');

    // The function may SELECT these internal columns to make its decision,
    // but must never RETURN them to the caller.
    expect(bodyNoComments).not.toMatch(/RETURN QUERY SELECT[^;]*worker_id/i);
    expect(bodyNoComments).not.toMatch(/RETURN QUERY SELECT[^;]*tenant_id/i);
    expect(bodyNoComments).not.toMatch(/RETURN QUERY SELECT[^;]*token_digest/i);
    expect(bodyNoComments).not.toMatch(/RETURN QUERY SELECT[^;]*batch_id/i);
  });
});
