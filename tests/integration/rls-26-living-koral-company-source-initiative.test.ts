/**
 * RLS-26 — Living KORAL Company Hub OBJECT-LEVEL PROVENANCE remediation,
 * real-runtime proof (direct Postgres, local Supabase).
 *
 * WHAT THIS IS:
 *   The real-DB proof for migration 084's own
 *   analytics.fn_company_living_koral_source_initiative() SECURITY
 *   DEFINER bridge function, matching the exact established RLS-NN
 *   convention (RLS-21..25) — env-var-gated, static staging/production
 *   guard, loopback-only, single privileged pg Client, `SET LOCAL ROLE
 *   authenticated` + `request.jwt.claims` GUC simulation. Distinct from
 *   RLS-25 (which proves table-level RLS on the Ledger/state tables) —
 *   this file proves function-level authorization instead, since a plain
 *   SQL function has no attachable RLS policy of its own; the function
 *   body's own role/tenant WHERE clause is what this file exercises.
 *
 * WHAT THIS PROVES:
 *   - COMPANY_ADMIN (own tenant) CAN resolve its own initiative-derived
 *     Material Change's real source title — the new capability this
 *     remediation introduces.
 *   - COMPANY_ADMIN (a DIFFERENT tenant) CANNOT resolve another tenant's
 *     Material Change — zero rows, not an error, not another tenant's
 *     title.
 *   - WORKER CANNOT resolve anything through this function, even for its
 *     own tenant — the function's own role gate structurally excludes
 *     WORKER entirely, independent of tenant match (closes the real,
 *     disclosed nuance from migration 084's own header: without this
 *     gate, WORKER could otherwise learn a DRAFT/CLOSED initiative's
 *     title, which personal.worker_initiative's own existing WORKER
 *     policy — published-only — would never itself allow).
 *   - ADVISOR CANNOT resolve anything through this function (unchanged —
 *     Advisor read is a later, separate KORA-WP-116 concern).
 *   - KORA_ADMIN CAN resolve cross-tenant (matching its existing,
 *     unchanged posture on every other Living KORAL object).
 *   - A nonexistent material_change_id resolves to zero rows, not an
 *     error.
 *   - No `anon` EXECUTE grant exists on the function.
 *   - `personal.worker_initiative` and `gov.living_koral_material_change`
 *     remain COMPANY_ADMIN-unreadable directly (regression from RLS-23 /
 *     migration 008 — this migration adds no table-level RLS policy on
 *     either).
 *
 * SAFETY MODEL — identical to RLS-21..25 (see those files' headers for
 * full rationale): skip-safe by default (RLS26_PG_URL + RLS26_ALLOW_RUN
 * === 'true' required), always-on static guard blocking known
 * staging/production refs and any hosted Supabase domain, loopback-host-
 * only, run-scoped unique tenant codes, NO teardown DELETE.
 *
 * CI WIRING: wired into .github/workflows/ci.yml's "Run RLS integration
 * suites" mandatory, no-skip step in this same remediation's own commit.
 *
 * REQUIRED ENV VARS:
 *   RLS26_PG_URL     — direct Postgres connection string, local Supabase only.
 *   RLS26_ALLOW_RUN  — must be exactly 'true'.
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import pg from 'pg';

const { Client } = pg;

function readEnv(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim().length > 0 ? value : undefined;
}

const KNOWN_NON_THROWAWAY_PROJECT_REFS = [
  'azdnepfmwrmacruykskm', // production — never a valid target, under any circumstance
  'haqflkurpmeaxpikozjl', // staging (dedicated) — shared with other in-flight work, discouraged
];
const ALLOWED_LOCAL_HOSTS = ['127.0.0.1', 'localhost', '::1'];

function assertLocalPostgresOnly(pgUrl: string): void {
  const lower = pgUrl.toLowerCase();
  for (const ref of KNOWN_NON_THROWAWAY_PROJECT_REFS) {
    if (lower.includes(ref)) {
      throw new Error(`RLS26_PG_URL matches a known staging/production project ref. This test must only ever target a local Postgres instance — refusing to proceed.`);
    }
  }
  if (lower.includes('supabase.co') || lower.includes('supabase.com')) {
    throw new Error(`RLS26_PG_URL points at a hosted Supabase domain. This test must only target a local Postgres instance — refusing to proceed.`);
  }
  let hostname: string;
  try {
    hostname = new URL(pgUrl).hostname.toLowerCase();
  } catch {
    throw new Error('RLS26_PG_URL is not a valid connection URL — refusing to proceed.');
  }
  if (!ALLOWED_LOCAL_HOSTS.includes(hostname)) {
    throw new Error(`RLS26_PG_URL host "${hostname}" is not a recognized local address (${ALLOWED_LOCAL_HOSTS.join(', ')}) — refusing to proceed.`);
  }
}

describe('RLS-26 guard — RLS26_PG_URL must never be a known staging/production/hosted target', () => {
  it('RLS26_PG_URL (if set) is either unset or a local-only Postgres URL', () => {
    const pgUrl = readEnv('RLS26_PG_URL');
    if (!pgUrl) {
      expect(pgUrl).toBeUndefined();
      return;
    }
    expect(() => assertLocalPostgresOnly(pgUrl)).not.toThrow();
  });
});

const config = readEnv('RLS26_PG_URL');
const allowed = readEnv('RLS26_ALLOW_RUN') === 'true';
const ready = Boolean(config && allowed);

const RUN_SUFFIX_HEX = `${Date.now().toString(16)}${Math.random().toString(16).slice(2, 8)}`.padEnd(12, '0').slice(0, 12);
const TENANT_CODE_A = `RLS26-KORAL-SRC-A-${RUN_SUFFIX_HEX}`;
const TENANT_CODE_B = `RLS26-KORAL-SRC-B-${RUN_SUFFIX_HEX}`;

describe.skipIf(!ready)('RLS-26 — Living KORAL Company Hub object-level provenance, against real Postgres', () => {
  let client: InstanceType<typeof Client>;
  let tenantAId: string;
  let tenantBId: string;
  let materialChangeAId: string;
  let initiativeTitle: string;

  beforeAll(async () => {
    if (!config) throw new Error('unreachable: beforeAll only runs when ready');
    assertLocalPostgresOnly(config);
    client = new Client({ connectionString: config });
    await client.connect();

    const tenantA = await client.query<{ id: string }>(
      `INSERT INTO analytics.tenant (tenant_code, company_name, tenant_kind) VALUES ($1, $2, 'TEST') RETURNING id`,
      [TENANT_CODE_A, 'RLS-26 Living KORAL Source Tenant A'],
    );
    tenantAId = tenantA.rows[0].id;

    const tenantB = await client.query<{ id: string }>(
      `INSERT INTO analytics.tenant (tenant_code, company_name, tenant_kind) VALUES ($1, $2, 'TEST') RETURNING id`,
      [TENANT_CODE_B, 'RLS-26 Living KORAL Source Tenant B'],
    );
    tenantBId = tenantB.rows[0].id;

    initiativeTitle = `RLS-26 Corso Reale ${RUN_SUFFIX_HEX}`;
    const initiative = await client.query<{ id: string }>(
      `INSERT INTO personal.worker_initiative (tenant_id, title, pillar, status)
       VALUES ($1, $2, 'GROWTH', 'published') RETURNING id`,
      [tenantAId, initiativeTitle],
    );

    const mc = await client.query<{ id: string }>(
      `INSERT INTO gov.living_koral_material_change
         (tenant_id, category, affected_domain, source_entity_type, source_entity_id, occurred_at, provenance, taxonomy_config_version, actor_role, actor_id)
       VALUES ($1, 'Emergence', 'initiative', 'initiative', $2, now(), 'RLS-26 fixture', '1.0', 'SYSTEM', 'rls26-fixture')
       RETURNING id`,
      [tenantAId, initiative.rows[0].id],
    );
    materialChangeAId = mc.rows[0].id;
    await client.query(
      `UPDATE gov.living_koral_material_change SET status = 'RECOGNIZED', recognized_at = now(), recognition_source = 'kora-automatic' WHERE id = $1`,
      [materialChangeAId],
    );
  });

  afterAll(async () => {
    if (!client) return;
    // No DELETE — gov.living_koral_material_change is immutable once
    // RECOGNIZED (WP-112's own update-invariant trigger); rerunnability
    // comes entirely from RUN_SUFFIX_HEX, matching every RLS-NN convention.
    await client.end();
  });

  async function resolveAs(role: 'COMPANY_ADMIN' | 'KORA_ADMIN' | 'WORKER' | 'ADVISOR', actingTenantId: string | null, materialChangeId: string) {
    await client.query('BEGIN');
    try {
      await client.query('SET LOCAL ROLE authenticated');
      const claims = JSON.stringify(
        actingTenantId ? { app_metadata: { kora_role: role, kora_tenant_id: actingTenantId } } : { app_metadata: { kora_role: role } },
      );
      await client.query(`SELECT set_config('request.jwt.claims', $1, true)`, [claims]);
      const result = await client.query(`SELECT title FROM analytics.fn_company_living_koral_source_initiative($1)`, [materialChangeId]);
      return result.rows;
    } finally {
      await client.query('ROLLBACK');
    }
  }

  it('COMPANY_ADMIN (Tenant A, own tenant) CAN resolve its own initiative-derived Material Change to the real title — the new capability', async () => {
    const rows = await resolveAs('COMPANY_ADMIN', tenantAId, materialChangeAId);
    expect(rows).toHaveLength(1);
    expect(rows[0].title).toBe(initiativeTitle);
  });

  it('COMPANY_ADMIN (Tenant B) CANNOT resolve Tenant A\'s Material Change — cross-tenant denial, zero rows', async () => {
    const rows = await resolveAs('COMPANY_ADMIN', tenantBId, materialChangeAId);
    expect(rows).toHaveLength(0);
  });

  it('WORKER (Tenant A, own tenant) CANNOT resolve anything through this function — role gate, independent of tenant match', async () => {
    const rows = await resolveAs('WORKER', tenantAId, materialChangeAId);
    expect(rows).toHaveLength(0);
  });

  it('ADVISOR (Tenant A, own tenant) CANNOT resolve anything through this function — Advisor read is a later, separate KORA-WP-116 concern', async () => {
    const rows = await resolveAs('ADVISOR', tenantAId, materialChangeAId);
    expect(rows).toHaveLength(0);
  });

  it('KORA_ADMIN CAN resolve cross-tenant — matches its existing, unchanged posture on every other Living KORAL object', async () => {
    const rows = await resolveAs('KORA_ADMIN', tenantBId, materialChangeAId);
    expect(rows).toHaveLength(1);
    expect(rows[0].title).toBe(initiativeTitle);
  });

  it('a nonexistent material_change_id resolves to zero rows, not an error', async () => {
    const rows = await resolveAs('COMPANY_ADMIN', tenantAId, '00000000-0000-0000-0000-000000000000');
    expect(rows).toHaveLength(0);
  });

  it('no `anon` EXECUTE grant exists on the function', async () => {
    await client.query('BEGIN');
    try {
      await client.query('SET LOCAL ROLE anon');
      await expect(
        client.query(`SELECT title FROM analytics.fn_company_living_koral_source_initiative($1)`, [materialChangeAId]),
      ).rejects.toThrow(/permission denied/i);
    } finally {
      await client.query('ROLLBACK');
    }
  });

  it('SECURITY DEFINER hardening — function owner is postgres, matching the exact existing migration 015 precedent (fn_company_worker_status / fn_company_activation_summary)', async () => {
    const result = await client.query<{ proowner: string }>(
      `SELECT proowner::regrole::text AS proowner FROM pg_proc WHERE proname = 'fn_company_living_koral_source_initiative'`,
    );
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].proowner).toBe('postgres');
  });

  it('SECURITY DEFINER hardening — explicit, safe search_path is set at the DB level (not merely present in migration SQL text)', async () => {
    const result = await client.query<{ proconfig: string[] }>(
      `SELECT proconfig FROM pg_proc WHERE proname = 'fn_company_living_koral_source_initiative'`,
    );
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].proconfig).toEqual(['search_path=gov, personal, analytics, kora, public']);
  });

  it('SECURITY DEFINER hardening — ACL has NO PUBLIC entry (no implicit blanket EXECUTE), and exactly the two expected explicit grants (postgres owner, authenticated)', async () => {
    const result = await client.query<{ proacl: string[] }>(
      `SELECT proacl::text[] AS proacl FROM pg_proc WHERE proname = 'fn_company_living_koral_source_initiative'`,
    );
    expect(result.rows).toHaveLength(1);
    const acl = result.rows[0].proacl;
    expect(acl.some((entry) => entry.startsWith('=X/'))).toBe(false); // '=X/...' with no role name = PUBLIC
    expect(acl).toContain('postgres=X/postgres');
    expect(acl).toContain('authenticated=X/postgres');
    expect(acl).toHaveLength(2);
  });

  it('SECURITY DEFINER hardening — service_role has no execute path to this function (neither explicit grant nor PUBLIC), even though it has USAGE on the analytics schema', async () => {
    await client.query('BEGIN');
    try {
      await client.query('SET LOCAL ROLE service_role');
      await expect(
        client.query(`SELECT title FROM analytics.fn_company_living_koral_source_initiative($1)`, [materialChangeAId]),
      ).rejects.toThrow(/permission denied/i);
    } finally {
      await client.query('ROLLBACK');
    }
  });

  it('ENUMERATION SAFETY — a foreign-tenant valid material_change_id and a nonexistent material_change_id both resolve to zero rows via the identical code path, never a distinguishing error', async () => {
    const foreignTenantResult = await resolveAs('COMPANY_ADMIN', tenantBId, materialChangeAId);
    const nonexistentResult = await resolveAs('COMPANY_ADMIN', tenantBId, '00000000-0000-0000-0000-000000000000');
    expect(foreignTenantResult).toEqual(nonexistentResult);
    expect(foreignTenantResult).toHaveLength(0);
  });

  it('personal.worker_initiative remains COMPANY_ADMIN-unreadable directly — this remediation added no table-level RLS policy (regression check)', async () => {
    await client.query('BEGIN');
    try {
      await client.query('SET LOCAL ROLE authenticated');
      await client.query(`SELECT set_config('request.jwt.claims', $1, true)`, [JSON.stringify({ app_metadata: { kora_role: 'COMPANY_ADMIN', kora_tenant_id: tenantAId } })]);
      const result = await client.query(`SELECT id FROM personal.worker_initiative WHERE tenant_id = $1`, [tenantAId]);
      expect(result.rows).toHaveLength(0);
    } finally {
      await client.query('ROLLBACK');
    }
  });

  it('gov.living_koral_material_change remains COMPANY_ADMIN-unreadable directly — this remediation added no table-level RLS policy (regression check)', async () => {
    await client.query('BEGIN');
    try {
      await client.query('SET LOCAL ROLE authenticated');
      await client.query(`SELECT set_config('request.jwt.claims', $1, true)`, [JSON.stringify({ app_metadata: { kora_role: 'COMPANY_ADMIN', kora_tenant_id: tenantAId } })]);
      const result = await client.query(`SELECT id FROM gov.living_koral_material_change WHERE id = $1`, [materialChangeAId]);
      expect(result.rows).toHaveLength(0);
    } finally {
      await client.query('ROLLBACK');
    }
  });
});
