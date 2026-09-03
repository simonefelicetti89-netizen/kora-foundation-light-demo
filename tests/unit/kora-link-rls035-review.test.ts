/**
 * KORA-LINK-S3A/S3B — RLS 035 / RPC 036 static review.
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
 * KORA-LINK-S3B (2026-07-12, comment/docs-only) added the guards at the
 * bottom of this file: the stale "future company aggregate view"
 * (v_batch_stats / v_tenant_batch_stats — never built, inconsistently named
 * between 034 and 035) is corrected to point at the already-implemented
 * fn_company_link_status_aggregate RPC, any remaining historical sketch is
 * clearly marked as such, and the 4 genuine Gate 3 (DPO/legal) BLOCKER items
 * in 034 remain present and clearly marked — this file does not resolve or
 * weaken any of them.
 *
 * Static/structural only — reads source text, does not run against a
 * database, does not apply anything. See docs/KORA_LINK_GATE_REPORT.md.
 */

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const REPO_ROOT = join(__dirname, '..', '..');

function readSource(relativePath: string): string {
  return readFileSync(join(REPO_ROOT, relativePath), 'utf8');
}

// Promoted by KORA-LINK-MIGRATION-FORMALIZATION-12 (2026-07-26): these three
// files now live under supabase/migrations/, not supabase/proposed/ — see
// docs/KORA_LINK_GATE_4_FINAL_REPORT.md. None of the structural checks below
// (RLS, policies, SECURITY DEFINER hygiene, grants) changed — only the file
// location and header status wording changed.
const SQL_034_PATH = 'supabase/migrations/034_kora_link_schema.sql';
const SQL_035_PATH = 'supabase/migrations/035_kora_link_rls.sql';
const SQL_036_PATH = 'supabase/migrations/036_kora_link_rpc_functions.sql';

const sql034 = readSource(SQL_034_PATH);
const sql035 = readSource(SQL_035_PATH);
const sql036 = readSource(SQL_036_PATH);

const KORA_LINK_TABLES = [
  'link_batches',
  'links',
  'link_assignments',
  'link_activation_acknowledgements',
  'link_events',
  'revocations',
  'link_replacements',
  'audit_log',
  'link_delivery_records',
] as const;

const APPEND_ONLY_TABLES = [
  'link_activation_acknowledgements',
  'link_events',
  'revocations',
  'link_replacements',
  'audit_log',
] as const;

const SECDEF_FUNCTIONS = [
  { name: 'fn_public_lookup_link', args: 'text' },
  // KORA-LINK-S08: p_worker_id removed — worker resolved from auth.uid() inside the function.
  { name: 'fn_activate_link_for_worker', args: 'text, text' },
  { name: 'fn_revoke_link', args: 'uuid, text' },
  { name: 'fn_replace_link', args: 'uuid, uuid, text' },
  { name: 'fn_company_link_status_aggregate', args: 'uuid' },
] as const;

// ── 1. Canonical files exist under migrations/, no longer under proposed/ ──
// Transformed by KORA-LINK-MIGRATION-FORMALIZATION-12 (2026-07-26): this
// block previously guarded the pre-promotion state (proposed/, not
// migrations/). It now guards the opposite, post-promotion state — see
// docs/KORA_LINK_GATE_4_FINAL_REPORT.md for the validation evidence that
// authorized this promotion.

describe('KORA-LINK-MIGRATION-FORMALIZATION-12 — canonical files exist under supabase/migrations/, not supabase/proposed/', () => {
  for (const relPath of [SQL_034_PATH, SQL_035_PATH, SQL_036_PATH]) {
    it(`${relPath} exists`, () => {
      expect(() => readSource(relPath)).not.toThrow();
    });
    it(`${relPath} lives under supabase/migrations/, not supabase/proposed/`, () => {
      expect(relPath.startsWith('supabase/migrations/')).toBe(true);
    });
  }

  it('none of the 3 files exist under supabase/proposed/ anymore (single source of truth)', () => {
    expect(() => readSource('supabase/proposed/034_kora_link_schema.sql')).toThrow();
    expect(() => readSource('supabase/proposed/035_kora_link_rls.sql')).toThrow();
    expect(() => readSource('supabase/proposed/036_kora_link_rpc_functions.sql')).toThrow();
  });
});

// ── 1b. Promotion invariants: order, dependencies, feature flag, isolation ──
// KORA-LINK-MIGRATION-FORMALIZATION-12 — consolidated checks that don't
// belong to any single pre-existing file: migration numbering stays in the
// canonical linear order (033 unrelated-but-adjacent, then 034→035→036 in
// their declared dependency direction), the KORA_LINK_ENABLED feature flag
// is still off by default post-promotion (promotion is a repository/schema
// change only — it must not flip runtime activation), and the main
// scoring/ingestion "golden path" services never import KORA Link (KORA
// Link stays an isolated, optional module per CLAUDE.md §10/§11 scope).

describe('KORA-LINK-MIGRATION-FORMALIZATION-12 — migration order and dependency declarations', () => {
  const MIGRATIONS_DIR = join(REPO_ROOT, 'supabase', 'migrations');

  it('033, 034, 035, 036 all exist in supabase/migrations/ with no gap in the sequence', () => {
    const files = readdirSync(MIGRATIONS_DIR).filter((f: string) => f.endsWith('.sql'));
    for (const prefix of ['033', '034', '035', '036']) {
      expect(files.some((f: string) => f.startsWith(`${prefix}_`)), `no migration file starting with ${prefix}_`).toBe(
        true,
      );
    }
  });

  it('034, 035, 036 sort strictly after 033 in filename order (canonical apply order)', () => {
    const files = readdirSync(MIGRATIONS_DIR).filter((f: string) => f.endsWith('.sql')).sort();
    const idx033 = files.findIndex((f: string) => f.startsWith('033_'));
    const idx034 = files.findIndex((f: string) => f.startsWith('034_'));
    const idx035 = files.findIndex((f: string) => f.startsWith('035_'));
    const idx036 = files.findIndex((f: string) => f.startsWith('036_'));
    expect(idx033).toBeGreaterThan(-1);
    expect(idx034).toBeGreaterThan(idx033);
    expect(idx035).toBeGreaterThan(idx034);
    expect(idx036).toBeGreaterThan(idx035);
  });

  it('035 and 036 both declare a dependency on 034_kora_link_schema.sql', () => {
    expect(sql035).toMatch(/Depends on:\s*034_kora_link_schema\.sql/);
    expect(sql036).toMatch(/Depends on:\s*034_kora_link_schema\.sql/);
  });
});

describe('KORA-LINK-MIGRATION-FORMALIZATION-12 — KORA_LINK_ENABLED remains off by default', () => {
  it('.env.local.example declares KORA_LINK_ENABLED=false', () => {
    const envExample = readSource('.env.local.example');
    expect(envExample).toMatch(/^KORA_LINK_ENABLED=false$/m);
  });

  it('lib/kora-link/config.ts treats any value other than the literal string "true" as disabled', () => {
    const config = readSource('lib/kora-link/config.ts');
    expect(config).toMatch(/KORA_LINK_ENABLED\s*===\s*'true'/);
  });
});

describe('KORA-LINK-MIGRATION-FORMALIZATION-12 — golden-path services never import KORA Link', () => {
  const goldenPathServiceFiles = [
    'services/scoring-simulator/ScoringSimulatorService.ts',
    // services/ingestion-simulator/IngestionSimulatorService.ts retired
    // (B-TRUTH Ingestion/UEF PR2, 2026-09-02) — zero real callers, confirmed
    // before deletion. See lib/security/synthetic-import-allowlist.ts.
    'services/ingestion-normalizer/IngestionNormalizerService.ts',
    'services/ingestion-pipeline/IngestionPipelineService.ts',
    // services/dynamic-scoring/DynamicScoringPreviewService.ts retired
    // (B-TRUTH Preview Scoring Retirement, 2026-09-03) — zero real callers,
    // confirmed before deletion. See lib/architecture/registry.ts svc.dynamic-scoring.
    'lib/methodology-config/v0.1.ts',
  ];

  for (const file of goldenPathServiceFiles) {
    it(`${file} does not import from kora-link`, () => {
      const source = readSource(file);
      expect(source).not.toMatch(/kora-link|kora_link/);
    });
  }
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
    'kl_activation_acks_admin_select', 'kl_activation_acks_admin_insert',
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

  it('fn_company_link_status_aggregate is the only company-facing read path, and returns (status, count, suppressed) only', () => {
    const fnStart = sql036.indexOf('CREATE OR REPLACE FUNCTION kora_link.fn_company_link_status_aggregate');
    expect(fnStart).toBeGreaterThan(-1);
    const fnBlock = sql036.slice(fnStart, sql036.indexOf('$$;', fnStart) + 3);
    // KORA-LINK-S08: widened to include a per-bucket suppression flag.
    expect(fnBlock).toMatch(/RETURNS TABLE\s*\(\s*status\s+text,\s*count\s+bigint,\s*suppressed\s+boolean\s*\)/);
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

// ── 11. Apply-forbidding warnings are gone now that the files are canonical ─
// Transformed by KORA-LINK-MIGRATION-FORMALIZATION-12: pre-promotion, every
// "supabase db push" mention had to be paired with a "DO NOT run" warning —
// these files were never meant to be applied via the normal migration flow.
// Now that they are canonical, applying them via `supabase db push` (or
// `migration up`) is exactly the correct, intended path — the warnings were
// removed from the header, not merely un-paired. This block guards that
// removal instead of the opposite (pre-promotion) invariant.

describe('KORA-LINK-MIGRATION-FORMALIZATION-12 — apply-forbidding warnings removed now the files are canonical', () => {
  for (const [label, src] of [['034', sql034], ['035', sql035], ['036', sql036]] as const) {
    it(`${label} no longer contains a "DO NOT run \`supabase db push\`" warning`, () => {
      expect(src).not.toMatch(/DO NOT run `supabase db push`/);
    });
    it(`${label} no longer contains a "DO NOT copy to supabase\\/migrations\\/" warning`, () => {
      expect(src).not.toMatch(/DO NOT copy to supabase\/migrations\//);
    });
  }
});

// ── 12. Header wording now declares these files canonical/applied ──────────
// Transformed by KORA-LINK-MIGRATION-FORMALIZATION-12: this block previously
// guarded the pre-promotion "PROPOSED, NOT APPLIED" wording. It now guards
// the promoted wording — CANONICAL_APPLIED, with an explicit pointer to the
// Gate 4 live-validation evidence that authorized the promotion — and that
// the old PROPOSED/NOT-APPLIED wording is fully gone (not left stale
// alongside the new wording).

describe('KORA-LINK-MIGRATION-FORMALIZATION-12 — header wording declares these files canonical and applied', () => {
  it('034 header declares CANONICAL_APPLIED status and no longer says PROPOSED/NOT APPLIED', () => {
    expect(sql034).toContain('STATUS: CANONICAL_APPLIED');
    expect(sql034).not.toMatch(/PROPOSED,? NOT APPLIED/);
    expect(sql034).toMatch(/KORA_LINK_GATE_4_FINAL_REPORT\.md/);
  });

  it('035 header declares CANONICAL_APPLIED status and references live Gate 4 validation', () => {
    expect(sql035).toContain('STATUS: CANONICAL_APPLIED');
    expect(sql035).not.toContain('STATUS: PROPOSED_RLS_DRAFT_INTERNAL_ENGINEERING');
    expect(sql035).toMatch(/VALIDATED LIVE/);
    expect(sql035).toMatch(/KORA-LINK-RLS-LIVE-VALIDATION-11/);
  });

  it('036 header declares CANONICAL_APPLIED status and references live Gate 4 validation', () => {
    expect(sql036).toContain('STATUS: CANONICAL_APPLIED');
    expect(sql036).not.toContain('STATUS: PROPOSED_RPC_FUNCTIONS_DRAFT_INTERNAL_ENGINEERING');
    expect(sql036).toMatch(/VALIDATED LIVE/);
    expect(sql036).toMatch(/KORA-LINK-RLS-LIVE-VALIDATION-11/);
  });

  it('035 header still documents the historical KORA-LINK-S3A amendment (unchanged, pre-promotion history)', () => {
    expect(sql035).toMatch(/Amended:\s+KORA-LINK-S3A/);
  });

  it('036 header still documents the historical KORA-LINK-S3A amendment (unchanged, pre-promotion history)', () => {
    expect(sql036).toMatch(/Amended:\s+KORA-LINK-S3A/);
  });

  it('036 documents the fn_company_link_status_aggregate audit_log documentation-drift correction', () => {
    expect(sql036).toMatch(/Corrected:\s+KORA-LINK-MIGRATION-FORMALIZATION-12/);
    expect(sql036).toMatch(/documentation drift fix/);
  });
});

// ── 13. No stale, unmarked "future aggregate view" references (KORA-LINK-S3B) ─

describe('KORA-LINK-S3B — stale aggregate-view wording is corrected or clearly historical', () => {
  it('034: every v_batch_stats mention is paired with a HISTORICAL/superseded marker nearby', () => {
    const matches = [...sql034.matchAll(/v_batch_stats/g)];
    expect(matches.length).toBeGreaterThan(0);
    for (const m of matches) {
      const idx = m.index ?? 0;
      const window = sql034.slice(Math.max(0, idx - 600), idx + 100);
      expect(window).toMatch(/HISTORICAL|superseded|do not create this view/i);
    }
  });

  it('035: every v_tenant_batch_stats mention is paired with a HISTORICAL/superseded/never-built marker nearby', () => {
    const matches = [...sql035.matchAll(/v_tenant_batch_stats/g)];
    expect(matches.length).toBeGreaterThan(0);
    for (const m of matches) {
      const idx = m.index ?? 0;
      const window = sql035.slice(Math.max(0, idx - 600), idx + 300);
      expect(window).toMatch(/HISTORICAL|superseded|do not create this view|never built|never created/i);
    }
  });

  it('034 and 035 both point the reader at fn_company_link_status_aggregate as the real implementation', () => {
    expect(sql034).toMatch(/fn_company_link_status_aggregate/);
    expect(sql035).toMatch(/fn_company_link_status_aggregate/);
  });

  it('034 and 035 both explicitly say no company-facing direct table SELECT policy exists or is planned', () => {
    // SQL comment lines wrap at ~80 chars with a "-- " prefix per line, so
    // match across that wrap by normalizing comment prefixes/whitespace
    // before asserting on the sentence as a whole.
    const normalize = (src: string) =>
      src
        .split('\n')
        .map((line) => line.replace(/^\s*--\s?/, ''))
        .join(' ')
        .replace(/\s+/g, ' ');
    expect(normalize(sql034)).toMatch(/No company-facing direct table SELECT policy exists or is planned/i);
    expect(normalize(sql035)).toMatch(/No direct company table SELECT policy exists here or is planned/i);
  });
});

// ── 14. fn_company_link_status_aggregate is the canonical company interface ─

describe('KORA-LINK-S3B — fn_company_link_status_aggregate is the sole company aggregate interface', () => {
  it('036 defines exactly one company-facing aggregate function', () => {
    const companyFacingFns = [...sql036.matchAll(/CREATE OR REPLACE FUNCTION kora_link\.(\w+)/g)]
      .map((m) => m[1])
      .filter((name) => name.toLowerCase().includes('company'));
    expect(companyFacingFns).toEqual(['fn_company_link_status_aggregate']);
  });

  it('no other proposed file defines a company-facing table or view', () => {
    expect(sql034).not.toMatch(/^CREATE (TABLE|VIEW) IF NOT EXISTS kora_link\.\w*company\w*/m);
    expect(sql035).not.toMatch(/^CREATE (TABLE|VIEW)/m);
  });
});

// ── 15. Company direct SELECT absent; worker self-select inactive (re-confirmed) ─

describe('KORA-LINK-S3B — re-confirms the two Gate 4 boundaries S3B did not touch', () => {
  it('still no active policy scoped to COMPANY_ADMIN in 035', () => {
    const activePolicyBlocks = sql035
      .split('\n')
      .filter((line) => !line.trim().startsWith('--'))
      .join('\n');
    expect(activePolicyBlocks).not.toMatch(/CREATE POLICY[\s\S]{0,300}COMPANY_ADMIN/);
  });

  it('still no active kl_assignments_worker_self_select policy', () => {
    expect(sql035).not.toMatch(/^CREATE POLICY "kl_assignments_worker_self_select"/m);
  });
});

// ── 16. Gate 3 BLOCKER items — ratified by KORA-LINK-DPO-DECISIONS-09 ──────
// KORA-LINK-S3B verified these 4 items were genuine, unresolved DPO blockers.
// KORA-LINK-DPO-DECISIONS-09 (2026-07-16) is the titolare's ratification of
// all 4 — this section now guards that they are marked RESOLVED, not that
// they remain open. Gate 3 OVERALL still remains open (DPIA, worker
// self-service deactivation, Gate 4 RLS) — see docs/KORA_LINK_DPO_DECISIONS_09.md.

describe('KORA-LINK-DPO-DECISIONS-09 — the 4 Gate 3 BLOCKER items are now ratified/resolved', () => {
  const GATE_3_BLOCKERS = [
    'TODO-CTO-05 / GATE-3',
    'TODO-DPO-01 / GATE-3',
    'TODO-DPO-02 / GATE-3',
    'TODO-DPO-03 / GATE-3',
  ] as const;

  for (const blocker of GATE_3_BLOCKERS) {
    it(`034 still references "${blocker}"`, () => {
      expect(sql034).toContain(blocker);
    });
  }

  it('all 4 Gate 3 blocker items are marked RESOLVED KORA-LINK-DPO-DECISIONS-09', () => {
    for (const blocker of GATE_3_BLOCKERS) {
      const idx = sql034.indexOf(blocker);
      expect(idx).toBeGreaterThan(-1);
      const line = sql034.slice(Math.max(0, idx - 60), idx);
      expect(line).toMatch(/RESOLVED KORA-LINK-DPO-DECISIONS-09/);
    }
  });

  it('034 no longer declares Gate 3 fully blocking — the 4 ratified items are not literal "BLOCKER" markers anymore', () => {
    expect(sql034).not.toMatch(/BLOCKER TODO-(CTO-05|DPO-01|DPO-02|DPO-03) \/ GATE-3/);
  });

  it('Gate 3 overall still declared open (DPIA/Gate 4/deactivation remain) even though the 4 blockers are ratified', () => {
    expect(sql034).toMatch(/Gate 3 overall/i);
  });

  it('TODO-RLS-05 in 035 is updated but explicitly not marked as resolving Gate 4', () => {
    const idx05 = sql035.indexOf('[TODO-RLS-05]');
    expect(idx05).toBeGreaterThan(-1);
    expect(sql035.slice(idx05, idx05 + 1400)).toMatch(/UPDATED by KORA-LINK-S3B/);
    // KORA-LINK-S08 narrowed what remains open: fn_activate_link_for_worker now writes
    // audit_log itself; the other 3 SECDEF functions still don't — that's the residual scope.
    expect(sql035.slice(idx05, idx05 + 1400)).toMatch(/KORA-LINK-S08 update/);
    expect(sql035.slice(idx05, idx05 + 1400)).toMatch(/do NOT yet write\s*\n?--\s*to audit_log/);
    expect(sql035.slice(idx05, idx05 + 1400)).toMatch(/Gate 4 is not\s*\n?--\s*closed by this update/);
  });

  it('TODO-RLS-04 in 035 is now explicitly marked resolved by KORA-LINK-S08 (aggregation threshold)', () => {
    const idx = sql035.indexOf('[RESOLVED KORA-LINK-S08] TODO-RLS-04');
    expect(idx).toBeGreaterThan(-1);
    // The literal "[TODO-RLS-04]" (unresolved marker) must no longer appear anywhere in 035.
    expect(sql035).not.toMatch(/\[TODO-RLS-04\]/);
  });

  it('consent_version TODO-RPC-03 in 036 is now ratified by KORA-LINK-DPO-DECISIONS-09', () => {
    expect(sql036).toMatch(/\[RESOLVED KORA-LINK-DPO-DECISIONS-09\] TODO-RPC-03: fn_activate_link_for_worker/);
    expect(sql036).toContain('kora-link-activation-notice-v1.0');
  });
});

// ── 17. KORA-LINK-S08 — worker identity + aggregation threshold hardening ──

describe('KORA-LINK-S08 — TODO-RPC-02 (worker identity) and TODO-RPC-04 (aggregation threshold) resolved', () => {
  it('TODO-RPC-02 is marked resolved, not merely mentioned', () => {
    expect(sql036).toMatch(/\[RESOLVED KORA-LINK-S08\] TODO-RPC-02/);
  });

  it('TODO-RPC-04 is marked resolved, not merely mentioned', () => {
    expect(sql036).toMatch(/\[RESOLVED KORA-LINK-S08\] TODO-RPC-04/);
  });

  it('fn_activate_link_for_worker no longer declares a uuid parameter anywhere in its signature', () => {
    const fnStart = sql036.indexOf('CREATE OR REPLACE FUNCTION kora_link.fn_activate_link_for_worker(');
    expect(fnStart).toBeGreaterThan(-1);
    const signatureEnd = sql036.indexOf(')', fnStart);
    const signature = sql036.slice(fnStart, signatureEnd + 1);
    expect(signature).not.toMatch(/uuid/);
    expect(signature).toMatch(/p_token_digest\s+text/);
    expect(signature).toMatch(/p_activation_notice_version\s+text/);
  });

  it('fn_activate_link_for_worker resolves the worker from auth.uid(), not from a parameter', () => {
    const fnStart = sql036.indexOf('CREATE OR REPLACE FUNCTION kora_link.fn_activate_link_for_worker(');
    const fnBlock = sql036.slice(fnStart, sql036.indexOf('$$;', fnStart) + 3);
    expect(fnBlock).toMatch(/FROM personal\.worker_identity/);
    expect(fnBlock).toMatch(/wi\.auth_user_id\s*=\s*auth\.uid\(\)/);
  });

  it('fn_activate_link_for_worker validates worker tenant against link tenant', () => {
    const fnStart = sql036.indexOf('CREATE OR REPLACE FUNCTION kora_link.fn_activate_link_for_worker(');
    const fnBlock = sql036.slice(fnStart, sql036.indexOf('$$;', fnStart) + 3);
    expect(fnBlock).toMatch(/v_link_tenant_id\s+IS\s+DISTINCT\s+FROM\s+v_worker_tenant_id/);
  });

  it('fn_company_link_status_aggregate applies the canonical [1,9] suppression window', () => {
    const fnStart = sql036.indexOf('CREATE OR REPLACE FUNCTION kora_link.fn_company_link_status_aggregate(');
    const fnBlock = sql036.slice(fnStart, sql036.indexOf('$$;', fnStart) + 3);
    expect(fnBlock).toMatch(/BETWEEN 1 AND 9/);
  });
});
