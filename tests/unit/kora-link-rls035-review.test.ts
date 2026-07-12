/**
 * KORA-LINK-S3A — RLS 035 / RPC 036 static review.
 *
 * Companion to tests/unit/kora-link-schema034-review.test.ts (which guards
 * 034/035/036 cross-file consistency from the KL-19 review pass) and
 * tests/unit/kora-link-privacy-invariants.test.ts (cross-cutting privacy
 * invariants). This file guards what KORA-LINK-S3A specifically hardened:
 * RLS enable/force + policy completeness on all 9 tables, append-only
 * enforcement, the worker-self-select/company-SELECT boundaries staying
 * exactly where Gate 4 left them, SECURITY DEFINER hygiene (search_path +
 * REVOKE ALL FROM PUBLIC before GRANT) on all 6 functions in 036 plus
 * is_kora_admin() in 035, and that service_role now has the grants it needs
 * (the gap this sprint closed — see 032/033 for the bug shape this prevents).
 *
 * Static/structural only — reads source text, does not run against a
 * database, does not apply anything. See docs/KORA_LINK_GATE_REPORT.md.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const REPO_ROOT = join(__dirname, '..', '..');

function readSource(relativePath: string): string {
  return readFileSync(join(REPO_ROOT, relativePath), 'utf8');
}

const SQL_034_PATH = 'supabase/proposed/034_kora_link_schema.sql';
const SQL_035_PATH = 'supabase/proposed/035_kora_link_rls.sql';
const SQL_036_PATH = 'supabase/proposed/036_kora_link_rpc_functions.sql';

const sql034 = readSource(SQL_034_PATH);
const sql035 = readSource(SQL_035_PATH);
const sql036 = readSource(SQL_036_PATH);

const KORA_LINK_TABLES = [
  'link_batches',
  'links',
  'link_assignments',
  'link_consents',
  'link_events',
  'revocations',
  'link_replacements',
  'audit_log',
  'link_delivery_records',
] as const;

const APPEND_ONLY_TABLES = [
  'link_consents',
  'link_events',
  'revocations',
  'link_replacements',
  'audit_log',
] as const;

const SECDEF_FUNCTIONS = [
  { name: 'fn_public_lookup_link', args: 'text' },
  { name: 'fn_activate_link_for_worker', args: 'text, uuid, text' },
  { name: 'fn_revoke_link', args: 'uuid, text' },
  { name: 'fn_replace_link', args: 'uuid, uuid, text' },
  { name: 'fn_company_link_status_aggregate', args: 'uuid' },
] as const;

// ── 1. Proposed files exist and remain unapplied ───────────────────────────

describe('KORA-LINK-S3A — proposed files exist and stay in supabase/proposed/', () => {
  for (const relPath of [SQL_034_PATH, SQL_035_PATH, SQL_036_PATH]) {
    it(`${relPath} exists`, () => {
      expect(() => readSource(relPath)).not.toThrow();
    });
    it(`${relPath} lives under supabase/proposed/, not supabase/migrations/`, () => {
      expect(relPath.startsWith('supabase/proposed/')).toBe(true);
    });
  }

  it('none of the 3 files exist under supabase/migrations/ (not promoted/applied)', () => {
    expect(() => readSource('supabase/migrations/034_kora_link_schema.sql')).toThrow();
    expect(() => readSource('supabase/migrations/035_kora_link_rls.sql')).toThrow();
    expect(() => readSource('supabase/migrations/036_kora_link_rpc_functions.sql')).toThrow();
  });
});

// ── 2. RLS enabled + forced on all 9 tables ─────────────────────────────────

describe('KORA-LINK-S3A — RLS enabled and forced on all 9 kora_link tables', () => {
  for (const table of KORA_LINK_TABLES) {
    it(`kora_link.${table} has ENABLE ROW LEVEL SECURITY`, () => {
      expect(sql035).toContain(`ALTER TABLE kora_link.${table} ENABLE ROW LEVEL SECURITY;`);
    });
    it(`kora_link.${table} has FORCE ROW LEVEL SECURITY`, () => {
      expect(sql035).toContain(`ALTER TABLE kora_link.${table} FORCE ROW LEVEL SECURITY;`);
    });
  }
});

// ── 3. Expected KORA_ADMIN policy set ───────────────────────────────────────

describe('KORA-LINK-S3A — exactly the expected KORA_ADMIN policy set exists', () => {
  const activePolicyNames = [...sql035.matchAll(/^CREATE POLICY "([^"]+)"/gm)].map((m) => m[1]);

  const EXPECTED_POLICIES = [
    'kl_batches_admin_select', 'kl_batches_admin_insert', 'kl_batches_admin_update',
    'kl_links_admin_select', 'kl_links_admin_insert', 'kl_links_admin_update',
    'kl_assignments_admin_select', 'kl_assignments_admin_insert', 'kl_assignments_admin_update',
    'kl_consents_admin_select', 'kl_consents_admin_insert',
    'kl_events_admin_select', 'kl_events_admin_insert',
    'kl_revocations_admin_select', 'kl_revocations_admin_insert',
    'kl_replacements_admin_select', 'kl_replacements_admin_insert',
    'kl_audit_admin_select', 'kl_audit_admin_insert',
    'kl_delivery_admin_select', 'kl_delivery_admin_insert', 'kl_delivery_admin_update',
  ] as const;

  it('exactly 22 active (non-commented) CREATE POLICY statements exist', () => {
    expect(activePolicyNames.length).toBe(22);
  });

  it('the active policy set matches the expected KORA_ADMIN policy names exactly', () => {
    expect(activePolicyNames.sort()).toEqual([...EXPECTED_POLICIES].sort());
  });

  it('every active policy uses kora_link.is_kora_admin() as its guard', () => {
    // Every CREATE POLICY block up to its terminating semicolon must reference the helper.
    const blocks = sql035.split(/^CREATE POLICY "/gm).slice(1);
    for (const block of blocks) {
      const upToSemicolon = block.slice(0, block.indexOf(';') + 1);
      expect(upToSemicolon).toContain('kora_link.is_kora_admin()');
    }
  });
});

// ── 4. No UPDATE/DELETE policy on append-only tables ────────────────────────

describe('KORA-LINK-S3A — no UPDATE or DELETE policy on append-only tables', () => {
  for (const table of APPEND_ONLY_TABLES) {
    it(`no "FOR UPDATE" policy targets kora_link.${table}`, () => {
      const tablePolicyRegex = new RegExp(
        `CREATE POLICY "[^"]*"\\s*\\n\\s*ON kora_link\\.${table}\\s*\\n\\s*FOR UPDATE`,
        'm',
      );
      expect(sql035).not.toMatch(tablePolicyRegex);
    });

    it(`no "FOR DELETE" policy targets kora_link.${table}`, () => {
      const tablePolicyRegex = new RegExp(
        `CREATE POLICY "[^"]*"\\s*\\n\\s*ON kora_link\\.${table}\\s*\\n\\s*FOR DELETE`,
        'm',
      );
      expect(sql035).not.toMatch(tablePolicyRegex);
    });
  }

  it('no "FOR DELETE" policy exists anywhere in 035 (no table allows DELETE)', () => {
    expect(sql035).not.toMatch(/FOR DELETE/);
  });
});

// ── 5. Worker self-select remains commented out / inactive ─────────────────

describe('KORA-LINK-S3A — worker self-select policy remains inactive', () => {
  it('kl_assignments_worker_self_select is not an active (uncommented) CREATE POLICY', () => {
    expect(sql035).not.toMatch(/^CREATE POLICY "kl_assignments_worker_self_select"/m);
  });

  it('the worker self-select policy text still exists, but only as a commented-out future policy', () => {
    expect(sql035).toContain('-- CREATE POLICY "kl_assignments_worker_self_select"');
  });

  it('the future-policy comment explicitly says not to enable it until the activation function is ready', () => {
    expect(sql035).toMatch(/Do NOT add this policy until fn_activate_link_for_worker is deployed/);
  });
});

// ── 6/7. No company-facing direct SELECT policy; visibility stays RPC-only ──

describe('KORA-LINK-S3A — no company-facing direct SELECT table policy; aggregate/RPC-only', () => {
  it('no active policy in 035 is scoped to COMPANY_ADMIN', () => {
    const activePolicyBlocks = sql035
      .split('\n')
      .filter((line) => !line.trim().startsWith('--'))
      .join('\n');
    expect(activePolicyBlocks).not.toMatch(/CREATE POLICY[\s\S]{0,300}COMPANY_ADMIN/);
  });

  it('fn_company_link_status_aggregate is the only company-facing read path, and returns (status, count) only', () => {
    const fnStart = sql036.indexOf('CREATE OR REPLACE FUNCTION kora_link.fn_company_link_status_aggregate');
    expect(fnStart).toBeGreaterThan(-1);
    const fnBlock = sql036.slice(fnStart, sql036.indexOf('$$;', fnStart) + 3);
    expect(fnBlock).toMatch(/RETURNS TABLE\s*\(\s*status\s+text,\s*count\s+bigint\s*\)/);
    // Strip comment lines first — the function's own doc-comments legitimately
    // *mention* link_id/token_digest/worker_id as examples of what it must
    // never return; only the executable code matters for this check.
    const codeOnly = fnBlock
      .split('\n')
      .map((line) => line.replace(/--.*$/, ''))
      .join('\n');
    expect(codeOnly).not.toContain('link_id');
    expect(codeOnly).not.toContain('token_digest');
    expect(codeOnly).not.toContain('worker_id');
  });

  it('fn_company_link_status_aggregate validates COMPANY_ADMIN tenant_id against the JWT before returning rows', () => {
    expect(sql036).toMatch(/p_tenant_id IS NULL OR p_tenant_id <> kora\.tenant_id\(\)/);
  });
});

// ── 8. SECURITY DEFINER hygiene on all 6 functions in 036 ──────────────────

describe('KORA-LINK-S3A — SECURITY DEFINER hygiene on every function in 036', () => {
  for (const { name, args } of SECDEF_FUNCTIONS) {
    describe(name, () => {
      const fnStart = sql036.indexOf(`CREATE OR REPLACE FUNCTION kora_link.${name}(`);

      it('is defined in 036', () => {
        expect(fnStart).toBeGreaterThan(-1);
      });

      it('is declared SECURITY DEFINER', () => {
        const fnBlock = sql036.slice(fnStart, sql036.indexOf('$$;', fnStart) + 3);
        expect(fnBlock).toMatch(/SECURITY DEFINER/);
      });

      it('sets an explicit search_path', () => {
        const fnBlock = sql036.slice(fnStart, sql036.indexOf('$$;', fnStart) + 3);
        expect(fnBlock).toMatch(/SET search_path = kora_link/);
      });

      it('has REVOKE ALL ... FROM PUBLIC before its GRANT EXECUTE', () => {
        const revokeStatement = `REVOKE ALL ON FUNCTION kora_link.${name}(${args}) FROM PUBLIC;`;
        const revokeIdx = sql036.indexOf(revokeStatement);
        const grantIdx = sql036.indexOf(`GRANT EXECUTE ON FUNCTION kora_link.${name}(${args})`);
        expect(revokeIdx, `expected to find: ${revokeStatement}`).toBeGreaterThan(-1);
        expect(grantIdx).toBeGreaterThan(-1);
        expect(revokeIdx).toBeLessThan(grantIdx);
      });
    });
  }

  it('fn_is_valid_token_digest (SECURITY INVOKER helper) also has REVOKE ALL FROM PUBLIC before its GRANT', () => {
    const revokeIdx = sql036.indexOf('REVOKE ALL ON FUNCTION kora_link.fn_is_valid_token_digest(text) FROM PUBLIC;');
    const grantIdx = sql036.indexOf('GRANT EXECUTE ON FUNCTION kora_link.fn_is_valid_token_digest(text)');
    expect(revokeIdx).toBeGreaterThan(-1);
    expect(grantIdx).toBeGreaterThan(-1);
    expect(revokeIdx).toBeLessThan(grantIdx);
  });
});

// ── 9. is_kora_admin() has REVOKE ALL FROM PUBLIC before GRANT ─────────────

describe('KORA-LINK-S3A — kora_link.is_kora_admin() grant hygiene', () => {
  it('has REVOKE ALL ... FROM PUBLIC before its GRANT EXECUTE', () => {
    const revokeIdx = sql035.indexOf('REVOKE ALL ON FUNCTION kora_link.is_kora_admin() FROM PUBLIC;');
    const grantIdx = sql035.indexOf('GRANT EXECUTE ON FUNCTION kora_link.is_kora_admin() TO authenticated;');
    expect(revokeIdx).toBeGreaterThan(-1);
    expect(grantIdx).toBeGreaterThan(-1);
    expect(revokeIdx).toBeLessThan(grantIdx);
  });

  it('remains SECURITY INVOKER (default) — not converted to SECURITY DEFINER', () => {
    const fnStart = sql035.indexOf('CREATE OR REPLACE FUNCTION kora_link.is_kora_admin()');
    const fnBlock = sql035.slice(fnStart, sql035.indexOf('$$', fnStart) + 2);
    expect(fnBlock).not.toContain('SECURITY DEFINER');
  });
});

// ── 10. service_role grants exist: schema usage, tables, functions ─────────

describe('KORA-LINK-S3A — service_role grants exist (schema, tables, functions)', () => {
  it('GRANT USAGE ON SCHEMA kora_link TO service_role exists in 035', () => {
    expect(sql035).toContain('GRANT USAGE ON SCHEMA kora_link TO service_role;');
  });

  for (const table of KORA_LINK_TABLES) {
    it(`kora_link.${table} has a service_role table grant in 035`, () => {
      const tableGrantRegex = new RegExp(
        `GRANT [A-Z, ]+ON kora_link\\.${table}\\s+TO service_role;`,
      );
      expect(sql035).toMatch(tableGrantRegex);
    });
  }

  for (const { name, args } of SECDEF_FUNCTIONS) {
    it(`kora_link.${name} grants EXECUTE to service_role in 036`, () => {
      const grantLine = sql036
        .split('\n')
        .find((line) => line.includes(`GRANT EXECUTE ON FUNCTION kora_link.${name}(${args})`));
      expect(grantLine, `expected a GRANT EXECUTE line for ${name}`).toBeDefined();
      expect(grantLine).toContain('service_role');
    });
  }

  it('fn_is_valid_token_digest grants EXECUTE to service_role in 036', () => {
    const grantLine = sql036
      .split('\n')
      .find((line) => line.includes('GRANT EXECUTE ON FUNCTION kora_link.fn_is_valid_token_digest(text)'));
    expect(grantLine).toBeDefined();
    expect(grantLine).toContain('service_role');
  });

  it('no table grants service_role more than authenticated already has (no DELETE grant to service_role anywhere)', () => {
    expect(sql035).not.toMatch(/GRANT[^;]*DELETE[^;]*TO service_role/);
  });
});

// ── 11. No "db push" without a DO NOT warning context ───────────────────────

describe('KORA-LINK-S3A — apply commands are always framed as forbidden', () => {
  for (const [label, src] of [['034', sql034], ['035', sql035], ['036', sql036]] as const) {
    it(`${label} never mentions "supabase db push" without "DO NOT run" immediately before it`, () => {
      const occurrences = [...src.matchAll(/supabase db push/g)];
      expect(occurrences.length).toBeGreaterThan(0);
      for (const match of occurrences) {
        const idx = match.index ?? 0;
        const before = src.slice(Math.max(0, idx - 40), idx);
        expect(before).toMatch(/DO NOT run/);
      }
    });
  }
});

// ── 12. Files remain unapplied/proposed by header wording ──────────────────

describe('KORA-LINK-S3A — header wording still declares these files proposed and unapplied', () => {
  it('034 header declares PROPOSED status', () => {
    expect(sql034).toMatch(/PROPOSED/);
    expect(sql034).toMatch(/NOT APPLIED TO ANY DATABASE/);
  });

  it('035 header declares PROPOSED_RLS_DRAFT status and Gate 4 open', () => {
    expect(sql035).toContain('STATUS: PROPOSED_RLS_DRAFT_INTERNAL_ENGINEERING');
    expect(sql035).toMatch(/NOT applied to any database/);
  });

  it('036 header declares PROPOSED_RPC_FUNCTIONS_DRAFT status', () => {
    expect(sql036).toContain('STATUS: PROPOSED_RPC_FUNCTIONS_DRAFT_INTERNAL_ENGINEERING');
    expect(sql036).toMatch(/NOT reviewed, NOT applied/);
  });

  it('035 header documents the KORA-LINK-S3A amendment without claiming Gate 4 closure', () => {
    expect(sql035).toMatch(/Amended:\s+KORA-LINK-S3A/);
    expect(sql035).toMatch(/does NOT close Gate 4/);
  });

  it('036 header documents the KORA-LINK-S3A amendment without claiming Gate 2/3 closure', () => {
    expect(sql036).toMatch(/Amended:\s+KORA-LINK-S3A/);
    expect(sql036).toMatch(/does NOT close\s*\n?--\s*Gate 2 or Gate 3/);
  });
});
