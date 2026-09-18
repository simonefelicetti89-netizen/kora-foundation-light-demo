/**
 * RLS-25 — Living KORAL Company Hub read access, real-runtime proof
 * (direct Postgres, local Supabase).
 *
 * WHAT THIS IS:
 *   KORA-WP-114's own real-DB proof, matching the exact established
 *   RLS-NN convention (RLS-21/22/23/24) — env-var-gated, static
 *   staging/production guard, loopback-only, single privileged pg
 *   Client, `SET LOCAL ROLE authenticated` + `request.jwt.claims` GUC
 *   simulation.
 *
 * WHAT THIS PROVES, against real Postgres RLS on
 * gov.living_koral_transformation_ledger and analytics.living_koral_state
 * after migration 083 (two additive COMPANY_ADMIN own-tenant SELECT
 * policies, mirroring migration 079's own precedent exactly):
 *   - KORA_ADMIN CAN still read both tables, cross-tenant, no tenant
 *     predicate — unchanged regression from RLS-24 (migration 083 never
 *     touches the existing KORA_ADMIN policy).
 *   - COMPANY_ADMIN CAN now read its OWN tenant's rows on both tables —
 *     the new capability this WP introduces.
 *   - COMPANY_ADMIN CANNOT read another tenant's rows on either table
 *     (ordinary cross-tenant denial, the new policy's own tenant_id =
 *     kora.tenant_id() predicate).
 *   - WORKER CANNOT read either table — unchanged, no Worker policy
 *     exists on either table (regression from RLS-24).
 *   - ADVISOR CANNOT read either table — unchanged, no Advisor policy
 *     exists on either table (regression from RLS-24; Advisor read is a
 *     later, separate KORA-WP-116 concern).
 *   - No `authenticated`-role WRITE grant on either table for
 *     COMPANY_ADMIN (INSERT/UPDATE/DELETE all denied) — the Company Hub
 *     is 100% read-only (regression + new negative, this WP's own §7/§13
 *     instruction).
 *   - No `authenticated`-role EXECUTE grant on
 *     gov.record_living_koral_transformation() for COMPANY_ADMIN —
 *     unchanged regression from RLS-24.
 *
 * SAFETY MODEL — identical to RLS-21/22/23/24 (see those files' headers
 * for full rationale): skip-safe by default (RLS25_PG_URL +
 * RLS25_ALLOW_RUN === 'true' required), always-on static guard blocking
 * known staging/production refs and any hosted Supabase domain,
 * loopback-host-only, run-scoped unique tenant codes, NO teardown DELETE
 * (the Ledger is hard-append-only; the state row is simply never deleted
 * by this test either, matching every RLS-NN convention).
 *
 * CI WIRING: wired into .github/workflows/ci.yml's "Run RLS integration
 * suites" mandatory, no-skip step in this same WP's own commit.
 *
 * REQUIRED ENV VARS:
 *   RLS25_PG_URL     — direct Postgres connection string, local Supabase only.
 *   RLS25_ALLOW_RUN  — must be exactly 'true'.
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
      throw new Error(`RLS25_PG_URL matches a known staging/production project ref. This test must only ever target a local Postgres instance — refusing to proceed.`);
    }
  }
  if (lower.includes('supabase.co') || lower.includes('supabase.com')) {
    throw new Error(`RLS25_PG_URL points at a hosted Supabase domain. This test must only target a local Postgres instance — refusing to proceed.`);
  }
  let hostname: string;
  try {
    hostname = new URL(pgUrl).hostname.toLowerCase();
  } catch {
    throw new Error('RLS25_PG_URL is not a valid connection URL — refusing to proceed.');
  }
  if (!ALLOWED_LOCAL_HOSTS.includes(hostname)) {
    throw new Error(`RLS25_PG_URL host "${hostname}" is not a recognized local address (${ALLOWED_LOCAL_HOSTS.join(', ')}) — refusing to proceed.`);
  }
}

describe('RLS-25 guard — RLS25_PG_URL must never be a known staging/production/hosted target', () => {
  it('RLS25_PG_URL (if set) is either unset or a local-only Postgres URL', () => {
    const pgUrl = readEnv('RLS25_PG_URL');
    if (!pgUrl) {
      expect(pgUrl).toBeUndefined();
      return;
    }
    expect(() => assertLocalPostgresOnly(pgUrl)).not.toThrow();
  });
});

const config = readEnv('RLS25_PG_URL');
const allowed = readEnv('RLS25_ALLOW_RUN') === 'true';
const ready = Boolean(config && allowed);

const RUN_SUFFIX_HEX = `${Date.now().toString(16)}${Math.random().toString(16).slice(2, 8)}`.padEnd(12, '0').slice(0, 12);
const TENANT_CODE_A = `RLS25-KORAL-HUB-A-${RUN_SUFFIX_HEX}`;
const TENANT_CODE_B = `RLS25-KORAL-HUB-B-${RUN_SUFFIX_HEX}`;

describe.skipIf(!ready)('RLS-25 — Living KORAL Company Hub read access, against real Postgres', () => {
  let client: InstanceType<typeof Client>;
  let tenantAId: string;
  let tenantBId: string;
  let ledgerAId: string;

  beforeAll(async () => {
    if (!config) throw new Error('unreachable: beforeAll only runs when ready');
    assertLocalPostgresOnly(config);
    client = new Client({ connectionString: config });
    await client.connect();

    const tenantA = await client.query<{ id: string }>(
      `INSERT INTO analytics.tenant (tenant_code, company_name, tenant_kind) VALUES ($1, $2, 'TEST') RETURNING id`,
      [TENANT_CODE_A, 'RLS-25 Living KORAL Hub Tenant A'],
    );
    tenantAId = tenantA.rows[0].id;

    const tenantB = await client.query<{ id: string }>(
      `INSERT INTO analytics.tenant (tenant_code, company_name, tenant_kind) VALUES ($1, $2, 'TEST') RETURNING id`,
      [TENANT_CODE_B, 'RLS-25 Living KORAL Hub Tenant B'],
    );
    tenantBId = tenantB.rows[0].id;

    const mc = await client.query<{ id: string }>(
      `INSERT INTO gov.living_koral_material_change
         (tenant_id, category, affected_domain, source_entity_type, source_entity_id, occurred_at, provenance, taxonomy_config_version, actor_role, actor_id)
       VALUES ($1, 'Emergence', 'initiative', 'initiative', gen_random_uuid(), now(), 'RLS-25 fixture', '1.0', 'SYSTEM', 'rls25-fixture')
       RETURNING id`,
      [tenantAId],
    );
    await client.query(
      `UPDATE gov.living_koral_material_change SET status = 'RECOGNIZED', recognized_at = now(), recognition_source = 'kora-automatic' WHERE id = $1`,
      [mc.rows[0].id],
    );

    const result = await client.query<{ ledger_id: string }>(
      `SELECT ledger_id FROM gov.record_living_koral_transformation($1, 'add_element', 'morphogenesis-v1.0')`,
      [mc.rows[0].id],
    );
    ledgerAId = result.rows[0].ledger_id;
  });

  afterAll(async () => {
    if (!client) return;
    // No DELETE — the Ledger's own hard DELETE-reject trigger applies
    // unconditionally. Rerunnability comes entirely from RUN_SUFFIX_HEX.
    await client.end();
  });

  async function queryLedgerAs(role: 'COMPANY_ADMIN' | 'KORA_ADMIN' | 'WORKER' | 'ADVISOR', actingTenantId: string | null, targetId: string) {
    await client.query('BEGIN');
    try {
      await client.query('SET LOCAL ROLE authenticated');
      const claims = JSON.stringify(
        actingTenantId ? { app_metadata: { kora_role: role, kora_tenant_id: actingTenantId } } : { app_metadata: { kora_role: role } },
      );
      await client.query(`SELECT set_config('request.jwt.claims', $1, true)`, [claims]);
      const result = await client.query(`SELECT id, tenant_id FROM gov.living_koral_transformation_ledger WHERE id = $1`, [targetId]);
      return result.rows;
    } finally {
      await client.query('ROLLBACK');
    }
  }

  async function queryStateAs(role: 'COMPANY_ADMIN' | 'KORA_ADMIN' | 'WORKER' | 'ADVISOR', actingTenantId: string | null, forTenantId: string) {
    await client.query('BEGIN');
    try {
      await client.query('SET LOCAL ROLE authenticated');
      const claims = JSON.stringify(
        actingTenantId ? { app_metadata: { kora_role: role, kora_tenant_id: actingTenantId } } : { app_metadata: { kora_role: role } },
      );
      await client.query(`SELECT set_config('request.jwt.claims', $1, true)`, [claims]);
      const result = await client.query(`SELECT id, tenant_id, revision FROM analytics.living_koral_state WHERE tenant_id = $1`, [forTenantId]);
      return result.rows;
    } finally {
      await client.query('ROLLBACK');
    }
  }

  it('KORA_ADMIN CAN still read the Ledger, cross-tenant (regression from RLS-24)', async () => {
    const rows = await queryLedgerAs('KORA_ADMIN', tenantBId, ledgerAId);
    expect(rows).toHaveLength(1);
  });

  it('KORA_ADMIN CAN still read current-state (regression from RLS-24)', async () => {
    const rows = await queryStateAs('KORA_ADMIN', null, tenantAId);
    expect(rows).toHaveLength(1);
    expect(rows[0].revision).toBe(1);
  });

  it('COMPANY_ADMIN (own tenant) CAN NOW read its own Ledger row — the new KORA-WP-114 capability', async () => {
    const rows = await queryLedgerAs('COMPANY_ADMIN', tenantAId, ledgerAId);
    expect(rows).toHaveLength(1);
    expect(rows[0].tenant_id).toBe(tenantAId);
  });

  it('COMPANY_ADMIN (own tenant) CAN NOW read its own current-state row — the new KORA-WP-114 capability', async () => {
    const rows = await queryStateAs('COMPANY_ADMIN', tenantAId, tenantAId);
    expect(rows).toHaveLength(1);
    expect(rows[0].revision).toBe(1);
  });

  it('COMPANY_ADMIN (Tenant B) CANNOT read Tenant A\'s Ledger row — cross-tenant denial', async () => {
    const rows = await queryLedgerAs('COMPANY_ADMIN', tenantBId, ledgerAId);
    expect(rows).toHaveLength(0);
  });

  it('COMPANY_ADMIN (Tenant B) CANNOT read Tenant A\'s current-state row — cross-tenant denial', async () => {
    const rows = await queryStateAs('COMPANY_ADMIN', tenantBId, tenantAId);
    expect(rows).toHaveLength(0);
  });

  it('WORKER CANNOT read the Ledger — no Worker policy exists (unchanged)', async () => {
    const rows = await queryLedgerAs('WORKER', tenantAId, ledgerAId);
    expect(rows).toHaveLength(0);
  });

  it('WORKER CANNOT read current-state — no Worker policy exists (unchanged)', async () => {
    const rows = await queryStateAs('WORKER', tenantAId, tenantAId);
    expect(rows).toHaveLength(0);
  });

  it('ADVISOR CANNOT read the Ledger — Advisor read is a later, separate KORA-WP-116 concern', async () => {
    const rows = await queryLedgerAs('ADVISOR', tenantAId, ledgerAId);
    expect(rows).toHaveLength(0);
  });

  it('ADVISOR CANNOT read current-state — Advisor read is a later, separate KORA-WP-116 concern', async () => {
    const rows = await queryStateAs('ADVISOR', tenantAId, tenantAId);
    expect(rows).toHaveLength(0);
  });

  it('COMPANY_ADMIN cannot INSERT into the Ledger — Company Hub is 100% read-only', async () => {
    await client.query('BEGIN');
    try {
      await client.query('SET LOCAL ROLE authenticated');
      await client.query(`SELECT set_config('request.jwt.claims', $1, true)`, [JSON.stringify({ app_metadata: { kora_role: 'COMPANY_ADMIN', kora_tenant_id: tenantAId } })]);
      await expect(
        client.query(
          `INSERT INTO gov.living_koral_transformation_ledger
             (tenant_id, material_change_id, category, affected_domain, taxonomy_config_version, morphogenesis_engine_version, operation, resulting_state_revision, occurred_at, recognized_at, actor_id)
           VALUES ($1, gen_random_uuid(), 'Emergence', 'initiative', '1.0', 'morphogenesis-v1.0', 'add_element', 1, now(), now(), 'rls25-negative')`,
          [tenantAId],
        ),
      ).rejects.toThrow(/permission denied/i);
    } finally {
      await client.query('ROLLBACK');
    }
  });

  it('COMPANY_ADMIN cannot UPDATE current-state — Company Hub is 100% read-only', async () => {
    await client.query('BEGIN');
    try {
      await client.query('SET LOCAL ROLE authenticated');
      await client.query(`SELECT set_config('request.jwt.claims', $1, true)`, [JSON.stringify({ app_metadata: { kora_role: 'COMPANY_ADMIN', kora_tenant_id: tenantAId } })]);
      await expect(
        client.query(`UPDATE analytics.living_koral_state SET revision = 999 WHERE tenant_id = $1`, [tenantAId]),
      ).rejects.toThrow(/permission denied/i);
    } finally {
      await client.query('ROLLBACK');
    }
  });

  it('COMPANY_ADMIN cannot DELETE its own Ledger row — Company Hub is 100% read-only', async () => {
    await client.query('BEGIN');
    try {
      await client.query('SET LOCAL ROLE authenticated');
      await client.query(`SELECT set_config('request.jwt.claims', $1, true)`, [JSON.stringify({ app_metadata: { kora_role: 'COMPANY_ADMIN', kora_tenant_id: tenantAId } })]);
      await expect(
        client.query(`DELETE FROM gov.living_koral_transformation_ledger WHERE id = $1`, [ledgerAId]),
      ).rejects.toThrow(/permission denied/i);
    } finally {
      await client.query('ROLLBACK');
    }
  });

  it('COMPANY_ADMIN cannot EXECUTE the transformation RPC — no authenticated-role EXECUTE grant exists (regression from RLS-24)', async () => {
    await client.query('BEGIN');
    try {
      await client.query('SET LOCAL ROLE authenticated');
      await client.query(`SELECT set_config('request.jwt.claims', $1, true)`, [JSON.stringify({ app_metadata: { kora_role: 'COMPANY_ADMIN', kora_tenant_id: tenantAId } })]);
      await expect(
        client.query(`SELECT * FROM gov.record_living_koral_transformation($1, 'add_element', 'morphogenesis-v1.0')`, [ledgerAId]),
      ).rejects.toThrow(/permission denied/i);
    } finally {
      await client.query('ROLLBACK');
    }
  });
});
