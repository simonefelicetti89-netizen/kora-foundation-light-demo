/**
 * RLS-24 — Living KORAL Transformation Ledger + current-state cross-tenant
 * isolation + append-only immutability, real-runtime proof (direct
 * Postgres, local Supabase).
 *
 * WHAT THIS IS:
 *   KORA-WP-113's own real-DB proof, matching the exact established
 *   RLS-NN convention (RLS-21/22/23) — env-var-gated, static
 *   staging/production guard, loopback-only, single privileged pg
 *   Client, `SET LOCAL ROLE authenticated` + `request.jwt.claims` GUC
 *   simulation.
 *
 * WHAT THIS PROVES, against real Postgres RLS on
 * gov.living_koral_transformation_ledger and analytics.living_koral_state
 * (registry 142's own explicit text: "tenant-scoped, KORA_ADMIN/system
 * write, Company read (via KORA-WP-114)" — Company read deliberately NOT
 * granted by this WP, pre-check 170 §13):
 *   - KORA_ADMIN CAN read both tables, cross-tenant, no tenant predicate
 *     (positive control, the Founder's carried-forward Admin Living KORAL
 *     oversight requirement).
 *   - COMPANY_ADMIN CANNOT read even its OWN tenant's rows on either
 *     table — no Company read policy exists yet on either (a stronger
 *     negative than ordinary cross-tenant denial), matching WP-112's own
 *     precedent exactly, and Registry 142's own explicit deferral to
 *     KORA-WP-114.
 *   - WORKER CANNOT read either table — no Worker policy exists.
 *   - No `authenticated`-role write grant on either table.
 *   - APPEND-ONLY: a DELETE or UPDATE against the ledger is rejected even
 *     via the privileged connection — the 5th confirmed instance of this
 *     pattern (kora_ready_attainment, review_advisor_assessment,
 *     governance_event, living_koral_material_change, now this table) —
 *     disclosed again, not solved.
 *   - CURRENT-STATE MUTATION RULES: analytics.living_koral_state IS
 *     mutable (no reject-mutation trigger — a plain `updated_at` trigger
 *     only), but only `service_role` can write to it directly; a claimed
 *     KORA_ADMIN session via the `authenticated` role still cannot INSERT
 *     or UPDATE it.
 *   - EXACTLY-ONCE / CONCURRENCY / DETERMINISM / REPLAY are proven
 *     separately, via the real TypeScript service functions (not raw
 *     SQL), by tests/unit/kora-wp-113-transformation-ledger-morphogenesis.
 *     test.ts's own real-DB-gated section — matching RLS-23/WP-112's own
 *     established division of concerns (RLS/immutability here, service
 *     behavior there).
 *
 * SAFETY MODEL — identical to RLS-21/22/23 (see those files' headers for
 * full rationale): skip-safe by default (RLS24_PG_URL + RLS24_ALLOW_RUN
 * === 'true' required), always-on static guard blocking known
 * staging/production refs and any hosted Supabase domain, loopback-host-
 * only, run-scoped unique tenant codes, NO teardown DELETE (both tables
 * are either hard-append-only or system-managed-only).
 *
 * CI WIRING: wired into .github/workflows/ci.yml's "Run RLS integration
 * suites" mandatory, no-skip step in this same WP's own commit.
 *
 * REQUIRED ENV VARS:
 *   RLS24_PG_URL     — direct Postgres connection string, local Supabase only.
 *   RLS24_ALLOW_RUN  — must be exactly 'true'.
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
      throw new Error(`RLS24_PG_URL matches a known staging/production project ref. This test must only ever target a local Postgres instance — refusing to proceed.`);
    }
  }
  if (lower.includes('supabase.co') || lower.includes('supabase.com')) {
    throw new Error(`RLS24_PG_URL points at a hosted Supabase domain. This test must only target a local Postgres instance — refusing to proceed.`);
  }
  let hostname: string;
  try {
    hostname = new URL(pgUrl).hostname.toLowerCase();
  } catch {
    throw new Error('RLS24_PG_URL is not a valid connection URL — refusing to proceed.');
  }
  if (!ALLOWED_LOCAL_HOSTS.includes(hostname)) {
    throw new Error(`RLS24_PG_URL host "${hostname}" is not a recognized local address (${ALLOWED_LOCAL_HOSTS.join(', ')}) — refusing to proceed.`);
  }
}

describe('RLS-24 guard — RLS24_PG_URL must never be a known staging/production/hosted target', () => {
  it('RLS24_PG_URL (if set) is either unset or a local-only Postgres URL', () => {
    const pgUrl = readEnv('RLS24_PG_URL');
    if (!pgUrl) {
      expect(pgUrl).toBeUndefined();
      return;
    }
    expect(() => assertLocalPostgresOnly(pgUrl)).not.toThrow();
  });
});

const config = readEnv('RLS24_PG_URL');
const allowed = readEnv('RLS24_ALLOW_RUN') === 'true';
const ready = Boolean(config && allowed);

const RUN_SUFFIX_HEX = `${Date.now().toString(16)}${Math.random().toString(16).slice(2, 8)}`.padEnd(12, '0').slice(0, 12);
const TENANT_CODE_A = `RLS24-KORAL-LEDGER-A-${RUN_SUFFIX_HEX}`;
const TENANT_CODE_B = `RLS24-KORAL-LEDGER-B-${RUN_SUFFIX_HEX}`;

describe.skipIf(!ready)('RLS-24 — Living KORAL Transformation Ledger + current-state, against real Postgres', () => {
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
      [TENANT_CODE_A, 'RLS-24 Living KORAL Ledger Tenant A'],
    );
    tenantAId = tenantA.rows[0].id;

    const tenantB = await client.query<{ id: string }>(
      `INSERT INTO analytics.tenant (tenant_code, company_name, tenant_kind) VALUES ($1, $2, 'TEST') RETURNING id`,
      [TENANT_CODE_B, 'RLS-24 Living KORAL Ledger Tenant B'],
    );
    tenantBId = tenantB.rows[0].id;

    // A real RECOGNIZED Material Change for Tenant A, via the privileged
    // connection (bypasses RLS, matching every established convention).
    const mc = await client.query<{ id: string }>(
      `INSERT INTO gov.living_koral_material_change
         (tenant_id, category, affected_domain, source_entity_type, source_entity_id, occurred_at, provenance, taxonomy_config_version, actor_role, actor_id)
       VALUES ($1, 'Emergence', 'initiative', 'initiative', gen_random_uuid(), now(), 'RLS-24 fixture', '1.0', 'SYSTEM', 'rls24-fixture')
       RETURNING id`,
      [tenantAId],
    );
    await client.query(
      `UPDATE gov.living_koral_material_change SET status = 'RECOGNIZED', recognized_at = now(), recognition_source = 'kora-automatic' WHERE id = $1`,
      [mc.rows[0].id],
    );

    // The one and only real write path — the RPC itself (this WP's own
    // atomicity boundary), exercised directly via SQL here (RLS-24's own
    // subject is RLS/immutability, not the TS service — matching RLS-23's
    // own established division).
    const result = await client.query<{ ledger_id: string }>(
      `SELECT ledger_id FROM gov.record_living_koral_transformation($1, 'add_element', 'morphogenesis-v1.0')`,
      [mc.rows[0].id],
    );
    ledgerAId = result.rows[0].ledger_id;
  });

  afterAll(async () => {
    if (!client) return;
    // No DELETE — the ledger's own hard DELETE-reject trigger applies
    // unconditionally, even to a privileged connection. Rerunnability
    // comes entirely from RUN_SUFFIX_HEX, never from cleanup.
    await client.end();
  });

  async function queryLedgerAs(role: 'COMPANY_ADMIN' | 'KORA_ADMIN' | 'WORKER', actingTenantId: string | null, targetId: string) {
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

  async function queryStateAs(role: 'COMPANY_ADMIN' | 'KORA_ADMIN' | 'WORKER', actingTenantId: string | null, forTenantId: string) {
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

  it('KORA_ADMIN CAN read the Ledger (positive control)', async () => {
    const rows = await queryLedgerAs('KORA_ADMIN', null, ledgerAId);
    expect(rows).toHaveLength(1);
    expect(rows[0].tenant_id).toBe(tenantAId);
  });

  it('KORA_ADMIN CAN read cross-tenant — no tenant predicate on the Ledger policy', async () => {
    const rows = await queryLedgerAs('KORA_ADMIN', tenantBId, ledgerAId);
    expect(rows).toHaveLength(1);
  });

  it('COMPANY_ADMIN (Tenant A, its own tenant) CANNOT read the Ledger — no Company read policy exists yet (deferred to KORA-WP-114)', async () => {
    const rows = await queryLedgerAs('COMPANY_ADMIN', tenantAId, ledgerAId);
    expect(rows).toHaveLength(0);
  });

  it('COMPANY_ADMIN (Tenant B) CANNOT read Tenant A\'s Ledger row (ordinary cross-tenant denial too)', async () => {
    const rows = await queryLedgerAs('COMPANY_ADMIN', tenantBId, ledgerAId);
    expect(rows).toHaveLength(0);
  });

  it('WORKER CANNOT read the Ledger — no Worker policy exists', async () => {
    const rows = await queryLedgerAs('WORKER', tenantAId, ledgerAId);
    expect(rows).toHaveLength(0);
  });

  it('KORA_ADMIN CAN read current-state (positive control)', async () => {
    const rows = await queryStateAs('KORA_ADMIN', null, tenantAId);
    expect(rows).toHaveLength(1);
    expect(rows[0].revision).toBe(1);
  });

  it('COMPANY_ADMIN (own tenant) CANNOT read current-state — no Company read policy exists yet (deferred to KORA-WP-114)', async () => {
    const rows = await queryStateAs('COMPANY_ADMIN', tenantAId, tenantAId);
    expect(rows).toHaveLength(0);
  });

  it('WORKER CANNOT read current-state', async () => {
    const rows = await queryStateAs('WORKER', tenantAId, tenantAId);
    expect(rows).toHaveLength(0);
  });

  it('no authenticated-role WRITE grant on the Ledger — even a claimed KORA_ADMIN session cannot INSERT (service_role only)', async () => {
    await client.query('BEGIN');
    try {
      await client.query('SET LOCAL ROLE authenticated');
      await client.query(`SELECT set_config('request.jwt.claims', $1, true)`, [JSON.stringify({ app_metadata: { kora_role: 'KORA_ADMIN' } })]);
      await expect(
        client.query(
          `INSERT INTO gov.living_koral_transformation_ledger
             (tenant_id, material_change_id, category, affected_domain, taxonomy_config_version, morphogenesis_engine_version, operation, resulting_state_revision, occurred_at, recognized_at, actor_id)
           VALUES ($1, gen_random_uuid(), 'Emergence', 'initiative', '1.0', 'morphogenesis-v1.0', 'add_element', 1, now(), now(), 'rls24-negative')`,
          [tenantAId],
        ),
      ).rejects.toThrow(/permission denied/i);
    } finally {
      await client.query('ROLLBACK');
    }
  });

  it('no authenticated-role WRITE grant on current-state — even a claimed KORA_ADMIN session cannot UPDATE (service_role only)', async () => {
    await client.query('BEGIN');
    try {
      await client.query('SET LOCAL ROLE authenticated');
      await client.query(`SELECT set_config('request.jwt.claims', $1, true)`, [JSON.stringify({ app_metadata: { kora_role: 'KORA_ADMIN' } })]);
      await expect(
        client.query(`UPDATE analytics.living_koral_state SET revision = 999 WHERE tenant_id = $1`, [tenantAId]),
      ).rejects.toThrow(/permission denied/i);
    } finally {
      await client.query('ROLLBACK');
    }
  });

  it('no authenticated-role EXECUTE grant on the RPC — even a claimed KORA_ADMIN session cannot call it directly', async () => {
    await client.query('BEGIN');
    try {
      await client.query('SET LOCAL ROLE authenticated');
      await client.query(`SELECT set_config('request.jwt.claims', $1, true)`, [JSON.stringify({ app_metadata: { kora_role: 'KORA_ADMIN' } })]);
      await expect(
        client.query(`SELECT * FROM gov.record_living_koral_transformation($1, 'add_element', 'morphogenesis-v1.0')`, [ledgerAId]),
      ).rejects.toThrow(/permission denied/i);
    } finally {
      await client.query('ROLLBACK');
    }
  });

  it('APPEND-ONLY — a Ledger DELETE is rejected even via the privileged connection', async () => {
    await expect(
      client.query(`DELETE FROM gov.living_koral_transformation_ledger WHERE id = $1`, [ledgerAId]),
    ).rejects.toThrow(/kora\/immutable/);
  });

  it('APPEND-ONLY — a Ledger UPDATE is rejected even via the privileged connection', async () => {
    await expect(
      client.query(`UPDATE gov.living_koral_transformation_ledger SET operation = 'remove_element' WHERE id = $1`, [ledgerAId]),
    ).rejects.toThrow(/kora\/immutable/);
  });

  it('IDEMPOTENCY — the Ledger\'s own UNIQUE(material_change_id) prevents a duplicate row for the same Material Change', async () => {
    const existing = await client.query<{ material_change_id: string }>(
      `SELECT material_change_id FROM gov.living_koral_transformation_ledger WHERE id = $1`, [ledgerAId],
    );
    await expect(
      client.query(
        `INSERT INTO gov.living_koral_transformation_ledger
           (tenant_id, material_change_id, category, affected_domain, taxonomy_config_version, morphogenesis_engine_version, operation, resulting_state_revision, occurred_at, recognized_at, actor_id)
         VALUES ($1, $2, 'Emergence', 'initiative', '1.0', 'morphogenesis-v1.0', 'add_element', 2, now(), now(), 'rls24-negative')`,
        [tenantAId, existing.rows[0].material_change_id],
      ),
    ).rejects.toThrow(/duplicate key value/i);
  });

  it('DORMANT CATEGORY REJECTION — the RPC rejects an operation outside the two live values, even via the privileged connection', async () => {
    const mc2 = await client.query<{ id: string }>(
      `INSERT INTO gov.living_koral_material_change
         (tenant_id, category, affected_domain, source_entity_type, source_entity_id, occurred_at, provenance, taxonomy_config_version, actor_role, actor_id)
       VALUES ($1, 'Strengthening', 'initiative', 'initiative', gen_random_uuid(), now(), 'RLS-24 dormant fixture', '1.0', 'SYSTEM', 'rls24-fixture')
       RETURNING id`,
      [tenantAId],
    );
    await client.query(
      `UPDATE gov.living_koral_material_change SET status = 'RECOGNIZED', recognized_at = now(), recognition_source = 'kora-automatic' WHERE id = $1`,
      [mc2.rows[0].id],
    );
    await expect(
      client.query(`SELECT * FROM gov.record_living_koral_transformation($1, 'grow_dramatically', 'morphogenesis-v1.0')`, [mc2.rows[0].id]),
    ).rejects.toThrow(/kora\/invalid-operation/);
  });

  it('CANDIDATE CANNOT TRANSFORM — the RPC rejects a non-RECOGNIZED Material Change', async () => {
    const candidateOnly = await client.query<{ id: string }>(
      `INSERT INTO gov.living_koral_material_change
         (tenant_id, category, affected_domain, source_entity_type, source_entity_id, occurred_at, provenance, taxonomy_config_version, actor_role, actor_id)
       VALUES ($1, 'Emergence', 'initiative', 'initiative', gen_random_uuid(), now(), 'RLS-24 candidate-only fixture', '1.0', 'SYSTEM', 'rls24-fixture')
       RETURNING id`,
      [tenantAId],
    );
    await expect(
      client.query(`SELECT * FROM gov.record_living_koral_transformation($1, 'add_element', 'morphogenesis-v1.0')`, [candidateOnly.rows[0].id]),
    ).rejects.toThrow(/kora\/not-recognized/);
  });
});
