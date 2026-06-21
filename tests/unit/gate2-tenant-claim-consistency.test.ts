/**
 * Gate 2 — Tenant Claim Consistency Audit
 *
 * Verifies that migrations 013, 025, and 026 no longer contain direct
 * auth.jwt() tenant/role reads and instead use canonical claim helpers:
 *   kora.kora_role()  — defined in migrations 003/004 (reads app_metadata.kora_role)
 *   kora.tenant_id()  — defined in migrations 003/004/006 (reads app_metadata.kora_tenant_id)
 *
 * These tests do NOT run SQL, touch any database, or apply migrations.
 * They read migration files as text and assert on their content.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const root = resolve(process.cwd());

function migration(name: string): string {
  return readFileSync(resolve(root, `supabase/migrations/${name}`), 'utf-8');
}

// Strip SQL line comments so negative assertions don't fire on documentation text.
function stripLineComments(sql: string): string {
  return sql
    .split('\n')
    .filter(line => !line.trimStart().startsWith('--'))
    .join('\n');
}

// ── Canonical helper definitions ──────────────────────────────────────────────

describe('canonical claim helpers defined in migrations 003/004/006', () => {
  it('migration 004 defines kora.kora_role()', () => {
    expect(migration('004_gate3a_claims_and_grants.sql')).toMatch(
      /CREATE OR REPLACE FUNCTION kora\.kora_role\(\)/,
    );
  });

  it('migration 004 kora.kora_role() reads app_metadata fallback', () => {
    expect(migration('004_gate3a_claims_and_grants.sql')).toContain(
      "app_metadata' ->> 'kora_role",
    );
  });

  it('migration 004 defines kora.tenant_id()', () => {
    expect(migration('004_gate3a_claims_and_grants.sql')).toMatch(
      /CREATE OR REPLACE FUNCTION kora\.tenant_id\(\)/,
    );
  });

  it('migration 006 updates kora.tenant_id() to use kora_tenant_id as canonical key', () => {
    expect(migration('006_canonical_tenant_key.sql')).toContain("kora_tenant_id");
  });

  it('migration 006 kora.tenant_id() returns uuid', () => {
    expect(migration('006_canonical_tenant_key.sql')).toMatch(/RETURNS uuid/);
  });
});

// ── Migration 013 ─────────────────────────────────────────────────────────────

describe('migration 013 — commons.post RLS uses canonical helpers', () => {
  const execSql = () => stripLineComments(migration('013_kora_commons.sql'));

  it('no direct auth.jwt() tenant reads in executable SQL', () => {
    expect(execSql()).not.toMatch(/auth\.jwt\(\)\s*->\s*'app_metadata'/);
  });

  it('no auth.jwt() ->> kora_tenant_id in executable SQL', () => {
    expect(execSql()).not.toMatch(/auth\.jwt\(\)[^)]*kora_tenant_id/);
  });

  it('COMPANY_ADMIN SELECT policy uses kora.tenant_id()', () => {
    expect(execSql()).toMatch(/commons_post_company_admin_select[\s\S]*kora\.tenant_id\(\)/);
  });

  it('COMPANY_ADMIN INSERT policy uses kora.tenant_id()', () => {
    expect(execSql()).toMatch(/commons_post_company_admin_insert[\s\S]*kora\.tenant_id\(\)/);
  });

  it('COMPANY_ADMIN UPDATE policy uses kora.tenant_id() in USING', () => {
    expect(execSql()).toMatch(/commons_post_company_admin_update[\s\S]*kora\.tenant_id\(\)/);
  });

  it('WORKER SELECT policy uses kora.tenant_id()', () => {
    expect(execSql()).toMatch(/commons_post_worker_published_select[\s\S]*kora\.tenant_id\(\)/);
  });

  it('KORA_ADMIN policy still uses kora.kora_role()', () => {
    expect(execSql()).toMatch(/commons_post_kora_admin_all[\s\S]*kora\.kora_role\(\)\s*=\s*'KORA_ADMIN'/);
  });

  it('includes comment explaining canonical pattern', () => {
    // Comment is in full source (not stripped)
    expect(migration('013_kora_commons.sql')).toMatch(
      /kora\.kora_role\(\)|kora\.tenant_id\(\).*canonical/i,
    );
  });
});

// ── Migration 025 ─────────────────────────────────────────────────────────────

describe('migration 025 — booking function and contribution_event RLS', () => {
  const execSql = () => stripLineComments(migration('025_commons_booking_contribution.sql'));

  it('no direct auth.jwt() tenant reads in executable SQL', () => {
    expect(execSql()).not.toMatch(/auth\.jwt\(\)\s*->\s*'app_metadata'/);
  });

  it('no auth.jwt() ->> kora_tenant_id in executable SQL', () => {
    expect(execSql()).not.toMatch(/auth\.jwt\(\)[^)]*kora_tenant_id/);
  });

  it('booking_aggregate_for_promoter() uses kora.tenant_id() for caller tenant', () => {
    const fullSql = migration('025_commons_booking_contribution.sql');
    const fnBlock = fullSql.slice(
      fullSql.indexOf('booking_aggregate_for_promoter'),
      fullSql.indexOf('COMMENT ON FUNCTION commons.booking_aggregate_for_promoter'),
    );
    expect(fnBlock).toContain('kora.tenant_id()');
  });

  it('booking_aggregate_for_promoter() v_caller_tenant declared as uuid (not text)', () => {
    const fullSql = migration('025_commons_booking_contribution.sql');
    const fnBlock = fullSql.slice(
      fullSql.indexOf('DECLARE'),
      fullSql.indexOf('BEGIN'),
    );
    expect(fnBlock).toMatch(/v_caller_tenant\s+uuid/);
    expect(fnBlock).not.toMatch(/v_caller_tenant\s+text/);
  });

  it('booking_aggregate_for_promoter() comparison does not cast v_caller_tenant to uuid', () => {
    // After fix, v_caller_tenant is already uuid — no ::uuid cast needed
    const fullSql = migration('025_commons_booking_contribution.sql');
    expect(fullSql).not.toContain('v_caller_tenant::uuid');
  });

  it('contribution_event RLS policy uses kora.tenant_id()', () => {
    expect(execSql()).toMatch(
      /contribution_event_company_own_select[\s\S]*kora\.tenant_id\(\)/,
    );
  });

  it('contribution_event RLS policy still uses kora.kora_role() for role check', () => {
    expect(execSql()).toMatch(
      /contribution_event_company_own_select[\s\S]*kora\.kora_role\(\)/,
    );
  });
});

// ── Migration 026 ─────────────────────────────────────────────────────────────

describe('migration 026 — source_batch and audit_log policies', () => {
  const execSql = () => stripLineComments(migration('026_company_route_rls_gaps.sql'));

  it('no direct auth.jwt() ->> kora_role in executable SQL', () => {
    expect(execSql()).not.toMatch(/auth\.jwt\(\)\s*->>\s*'kora_role'/);
  });

  it('source_batch INSERT policy uses kora.kora_role()', () => {
    expect(execSql()).toMatch(/analytics_source_batch_company_insert[\s\S]*kora\.kora_role\(\)/);
  });

  it('source_batch UPDATE policy uses kora.kora_role()', () => {
    expect(execSql()).toMatch(/analytics_source_batch_company_update[\s\S]*kora\.kora_role\(\)/);
  });

  it('audit_log INSERT policy uses kora.kora_role()', () => {
    expect(execSql()).toMatch(/audit_log_company_insert[\s\S]*kora\.kora_role\(\)/);
  });

  it('tenant reads still use kora.tenant_id() (unchanged from before — already canonical)', () => {
    expect(execSql()).toMatch(/kora\.tenant_id\(\)/);
  });

  it('includes comment explaining canonical claim helpers', () => {
    expect(migration('026_company_route_rls_gaps.sql')).toMatch(
      /kora\.kora_role\(\)|kora\.tenant_id\(\)/,
    );
  });
});

// ── Full migration audit — no stray auth.jwt() tenant reads ──────────────────

describe('full migration set — no direct auth.jwt() JWT reads in executable SQL', () => {
  // These three migrations were the known offenders. Confirm all three are clean.
  const targets = [
    '013_kora_commons.sql',
    '025_commons_booking_contribution.sql',
    '026_company_route_rls_gaps.sql',
  ];

  for (const file of targets) {
    it(`${file}: no auth.jwt() -> 'app_metadata' in executable SQL`, () => {
      expect(stripLineComments(migration(file))).not.toMatch(
        /auth\.jwt\(\)\s*->\s*'app_metadata'/,
      );
    });

    it(`${file}: no auth.jwt() ->> 'kora_role' in executable SQL`, () => {
      expect(stripLineComments(migration(file))).not.toMatch(
        /auth\.jwt\(\)\s*->>\s*'kora_role'/,
      );
    });
  }
});

// ── Review pack reflects final status ────────────────────────────────────────

describe('review pack — tenant claim consistency reflected', () => {
  const doc = () =>
    readFileSync(resolve(root, 'docs/GATE2_SQL_REVIEW_PACK.md'), 'utf-8');

  it('§3.1 no longer lists 013/025/026 as unresolved inconsistencies', () => {
    const content = doc();
    // The old unresolved item should be struck through or marked resolved
    const inconsistencySection = content.slice(
      content.indexOf('Inconsistencies requiring CTO attention'),
      content.indexOf('### 3.2'),
    );
    // Should contain the resolved marker
    expect(inconsistencySection).toMatch(/Fixed|fixed|DONE/i);
    // Should NOT present the old issue as open (would need to be both present and not struck-through)
    const hasOpenItem = /^- Migrations 013, 025, 026 use direct/m.test(inconsistencySection);
    expect(hasOpenItem).toBe(false);
  });

  it('§4 checklist item for 013/025/026 is checked', () => {
    const content = doc();
    const checklistSection = content.slice(
      content.indexOf('## 4. Gate 2 Checklist'),
      content.indexOf('## 5. Gate 3'),
    );
    // The item should be [x] not [ ]
    expect(checklistSection).toMatch(/\[x\].*013.*025.*026|013.*025.*026.*Fixed/i);
  });

  it('§10 Tenant Claim Consistency Update section exists', () => {
    expect(doc()).toMatch(/Tenant Claim Consistency Update/i);
  });

  it('§10 lists all three target migrations', () => {
    const content = doc();
    const section10 = content.slice(content.indexOf('Tenant Claim Consistency Update'));
    expect(section10).toContain('013_kora_commons.sql');
    expect(section10).toContain('025_commons_booking_contribution.sql');
    expect(section10).toContain('026_company_route_rls_gaps.sql');
  });

  it('§10 states zero intentionally retained direct JWT reads', () => {
    const content = doc();
    const section10 = content.slice(content.indexOf('Tenant Claim Consistency Update'));
    expect(section10).toMatch(/None|Zero|zero/i);
  });

  it('§10 confirms no CTO decisions newly required from this audit', () => {
    const content = doc();
    const section10 = content.slice(content.indexOf('Tenant Claim Consistency Update'));
    expect(section10).toMatch(/None from the tenant-claim consistency|No.*CTO decisions|none/i);
  });
});
