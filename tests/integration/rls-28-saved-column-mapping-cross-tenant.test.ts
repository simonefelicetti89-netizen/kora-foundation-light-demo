/**
 * RLS-28 — Saved Column Mapping cross-tenant isolation, real-runtime proof
 * (direct Postgres, local Supabase).
 *
 * WHAT THIS IS:
 *   KORA-WP-066's own real-DB proof, matching the established RLS-NN
 *   convention (RLS-21/22/23) — env-var-gated, static staging/production
 *   guard, loopback-only, single privileged pg Client, `SET LOCAL ROLE
 *   authenticated` + `request.jwt.claims` GUC simulation.
 *
 * WHY IT EXISTS:
 *   The Founder's ruling of 2026-09-21 (READING 1 — TENANT-SCOPED SESSION
 *   REUSE) makes one invariant absolute: a mapping saved for Company A must
 *   never be visible, suggested or applicable to Company B, and that boundary
 *   must be enforced server-side / by RLS rather than by UI filtering. A unit
 *   test can only prove the application asks the right question; only this
 *   file proves the database refuses the wrong one.
 *
 * WHAT THIS PROVES against real Postgres RLS on
 * analytics.saved_column_mapping (migration 090):
 *   - KORA_ADMIN CAN read both tenants' mappings — the Operator persona that
 *     actually runs the Data Intake workflow retains its oversight scope.
 *   - COMPANY_ADMIN of tenant A cannot read tenant A's own mapping, and
 *     neither can COMPANY_VIEWER. This is the Founder's least-privilege ruling
 *     of 2026-09-22: WP-066 ships no Company-facing Saved Mapping surface, so
 *     no normal tenant role gets direct database read access. Tenant ownership
 *     is a persistence/authorization boundary, not a read entitlement.
 *   - Company A cannot read Company B's mapping and vice versa (isolation is
 *     unweakened — it is now strictly stronger, since not even the owner reads).
 *   - A Worker, an Advisor, a Partner and an anonymous session cannot read.
 *   - No normal tenant role can INSERT, UPDATE or DELETE.
 *   - The service-authorized write path still works.
 *   - The CHECK constraint still rejects invalid mapping payloads.
 *   - The privacy CHECK is real: a row whose mapping value is anything other
 *     than a canonical intake field name — a row value, a UI sentinel, a
 *     nested object — is rejected by the database itself, so Company data
 *     cannot be persisted in a saved mapping even by a buggy caller.
 *
 * SAFETY MODEL — identical to RLS-21/22/23 (see those headers): skip-safe by
 * default (RLS28_PG_URL + RLS28_ALLOW_RUN === 'true' required), always-on
 * static guard blocking known staging/production refs and any hosted Supabase
 * domain, loopback-host-only, run-scoped unique tenant codes.
 *
 * REQUIRED ENV VARS:
 *   RLS28_PG_URL     — direct Postgres connection string, local Supabase only.
 *   RLS28_ALLOW_RUN  — must be exactly 'true'.
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
      throw new Error('RLS28_PG_URL matches a known staging/production project ref. This test must only ever target a local Postgres instance — refusing to proceed.');
    }
  }
  if (lower.includes('supabase.co') || lower.includes('supabase.com')) {
    throw new Error('RLS28_PG_URL points at a hosted Supabase domain. This test must only target a local Postgres instance — refusing to proceed.');
  }
  let hostname: string;
  try {
    hostname = new URL(pgUrl).hostname.toLowerCase();
  } catch {
    throw new Error('RLS28_PG_URL is not a valid connection URL — refusing to proceed.');
  }
  if (!ALLOWED_LOCAL_HOSTS.includes(hostname)) {
    throw new Error(`RLS28_PG_URL host "${hostname}" is not a recognized local address (${ALLOWED_LOCAL_HOSTS.join(', ')}) — refusing to proceed.`);
  }
}

describe('RLS-28 guard — RLS28_PG_URL must never be a known staging/production/hosted target', () => {
  it('RLS28_PG_URL (if set) is either unset or a local-only Postgres URL', () => {
    const pgUrl = readEnv('RLS28_PG_URL');
    if (!pgUrl) { expect(pgUrl).toBeUndefined(); return; }
    expect(() => assertLocalPostgresOnly(pgUrl)).not.toThrow();
  });
});

const config  = readEnv('RLS28_PG_URL');
const allowed = readEnv('RLS28_ALLOW_RUN') === 'true';
const ready   = Boolean(config && allowed);

const RUN_SUFFIX = `${Date.now().toString(16)}${Math.random().toString(16).slice(2, 8)}`.padEnd(12, '0').slice(0, 12);
const TENANT_CODE_A = `RLS28-SM-A-${RUN_SUFFIX}`;
const TENANT_CODE_B = `RLS28-SM-B-${RUN_SUFFIX}`;

describe.skipIf(!ready)('RLS-28 — Saved Column Mapping cross-tenant isolation, against real Postgres', () => {
  let client: InstanceType<typeof Client>;
  let tenantAId: string;
  let tenantBId: string;
  let mappingAId: string;
  let mappingBId: string;

  beforeAll(async () => {
    if (!config) throw new Error('unreachable: beforeAll only runs when ready');
    assertLocalPostgresOnly(config);
    client = new Client({ connectionString: config });
    await client.connect();

    const a = await client.query<{ id: string }>(
      `INSERT INTO analytics.tenant (tenant_code, company_name, tenant_kind) VALUES ($1, $2, 'TEST') RETURNING id`,
      [TENANT_CODE_A, 'RLS-28 Saved Mapping Tenant A'],
    );
    tenantAId = a.rows[0].id;

    const b = await client.query<{ id: string }>(
      `INSERT INTO analytics.tenant (tenant_code, company_name, tenant_kind) VALUES ($1, $2, 'TEST') RETURNING id`,
      [TENANT_CODE_B, 'RLS-28 Saved Mapping Tenant B'],
    );
    tenantBId = b.rows[0].id;

    // Fixtures via the privileged connection (bypasses RLS), matching every
    // established RLS-NN convention. Company A's header names are deliberately
    // distinctive: the negative tests prove Company B never sees them.
    const ma = await client.query<{ id: string }>(
      `INSERT INTO analytics.saved_column_mapping (tenant_id, mapping_name, mapping, created_by)
       VALUES ($1, 'Export welfare A', $2::jsonb, 'rls28-fixture') RETURNING id`,
      [tenantAId, JSON.stringify({ 'Centro di costo A': 'cost_center', 'Importo A': 'amount' })],
    );
    mappingAId = ma.rows[0].id;

    const mb = await client.query<{ id: string }>(
      `INSERT INTO analytics.saved_column_mapping (tenant_id, mapping_name, mapping, created_by)
       VALUES ($1, 'Export welfare B', $2::jsonb, 'rls28-fixture') RETURNING id`,
      [tenantBId, JSON.stringify({ 'Centro di costo B': 'cost_center' })],
    );
    mappingBId = mb.rows[0].id;
  }, 30_000);

  afterAll(async () => {
    if (!client) return;
    // This table is ordinary (no append-only trigger), so the fixture is
    // removed; the CASCADE from tenant would also cover it.
    try {
      await client.query(`DELETE FROM analytics.saved_column_mapping WHERE tenant_id IN ($1, $2)`, [tenantAId, tenantBId]);
      await client.query(`DELETE FROM analytics.tenant WHERE id IN ($1, $2)`, [tenantAId, tenantBId]);
    } finally {
      await client.end();
    }
  });

  /** Reads one row under a simulated JWT, through the `authenticated` role. */
  async function readAs(role: string, actingTenantId: string | null, targetId: string) {
    await client.query('BEGIN');
    try {
      await client.query('SET LOCAL ROLE authenticated');
      const claims = JSON.stringify(
        actingTenantId
          ? { app_metadata: { kora_role: role, kora_tenant_id: actingTenantId } }
          : { app_metadata: { kora_role: role } },
      );
      await client.query(`SELECT set_config('request.jwt.claims', $1, true)`, [claims]);
      const r = await client.query(
        `SELECT id, tenant_id, mapping_name FROM analytics.saved_column_mapping WHERE id = $1`,
        [targetId],
      );
      return r.rows;
    } finally {
      await client.query('ROLLBACK');
    }
  }

  // ── the core invariant ───────────────────────────────────────────────────

  it('COMPANY_ADMIN of tenant A cannot read tenant A\'s OWN mapping — least privilege', () => {
    // Founder ruling 2026-09-22. Owning the tenant is not a read entitlement:
    // no Company-facing Saved Mapping surface exists, so no policy grants it.
    return readAs('COMPANY_ADMIN', tenantAId, mappingAId).then((rows) => {
      expect(rows).toHaveLength(0);
    });
  });

  it('COMPANY_VIEWER of tenant A cannot read tenant A\'s own mapping either', async () => {
    expect(await readAs('COMPANY_VIEWER', tenantAId, mappingAId)).toHaveLength(0);
  });

  it('ADVISOR and PARTNER cannot read any saved mapping', async () => {
    for (const role of ['ADVISOR', 'PARTNER']) {
      expect(await readAs(role, tenantAId, mappingAId), `${role} read A`).toHaveLength(0);
      expect(await readAs(role, tenantBId, mappingBId), `${role} read B`).toHaveLength(0);
    }
  });

  it('Company A CANNOT read Company B\'s saved mapping — the WP-066 core invariant', async () => {
    const rows = await readAs('COMPANY_ADMIN', tenantAId, mappingBId);
    expect(rows).toHaveLength(0);
  });

  it('Company B CANNOT read Company A\'s saved mapping — symmetric', async () => {
    const rows = await readAs('COMPANY_ADMIN', tenantBId, mappingAId);
    expect(rows).toHaveLength(0);
  });

  it('Company A enumerating the whole table sees nothing at all', async () => {
    await client.query('BEGIN');
    try {
      await client.query('SET LOCAL ROLE authenticated');
      await client.query(`SELECT set_config('request.jwt.claims', $1, true)`, [
        JSON.stringify({ app_metadata: { kora_role: 'COMPANY_ADMIN', kora_tenant_id: tenantAId } }),
      ]);
      const r = await client.query(`SELECT tenant_id FROM analytics.saved_column_mapping`);
      // Stronger than "only its own rows": with no Company policy, zero rows.
      expect(r.rows).toHaveLength(0);
    } finally {
      await client.query('ROLLBACK');
    }
  });

  it('a Worker cannot read any saved mapping', async () => {
    expect(await readAs('WORKER', tenantAId, mappingAId)).toHaveLength(0);
    expect(await readAs('WORKER', tenantAId, mappingBId)).toHaveLength(0);
  });

  it('a claimless session cannot read any saved mapping', async () => {
    expect(await readAs('anonymous', null, mappingAId)).toHaveLength(0);
  });

  it('KORA_ADMIN — the Operator persona that runs Data Intake — CAN read both', async () => {
    expect(await readAs('KORA_ADMIN', null, mappingAId)).toHaveLength(1);
    expect(await readAs('KORA_ADMIN', null, mappingBId)).toHaveLength(1);
  });

  // ── write path ───────────────────────────────────────────────────────────

  it('a Company cannot author a saved mapping — no authenticated INSERT grant', async () => {
    await client.query('BEGIN');
    let failed = false;
    try {
      await client.query('SET LOCAL ROLE authenticated');
      await client.query(`SELECT set_config('request.jwt.claims', $1, true)`, [
        JSON.stringify({ app_metadata: { kora_role: 'COMPANY_ADMIN', kora_tenant_id: tenantAId } }),
      ]);
      await client.query(
        `INSERT INTO analytics.saved_column_mapping (tenant_id, mapping_name, mapping)
         VALUES ($1, 'company authored', '{"X":"amount"}'::jsonb)`,
        [tenantAId],
      );
    } catch { failed = true; }
    finally { await client.query('ROLLBACK'); }
    expect(failed).toBe(true);
  });

  it('a Company cannot overwrite another tenant\'s saved mapping', async () => {
    await client.query('BEGIN');
    let blocked = false;
    try {
      await client.query('SET LOCAL ROLE authenticated');
      await client.query(`SELECT set_config('request.jwt.claims', $1, true)`, [
        JSON.stringify({ app_metadata: { kora_role: 'COMPANY_ADMIN', kora_tenant_id: tenantAId } }),
      ]);
      const r = await client.query(
        `UPDATE analytics.saved_column_mapping SET mapping_name = 'hijacked' WHERE id = $1`,
        [mappingBId],
      );
      blocked = r.rowCount === 0; // no grant, or no visible row — either way, nothing changed
    } catch { blocked = true; }
    finally { await client.query('ROLLBACK'); }
    expect(blocked).toBe(true);
  });

  it('no normal tenant role can DELETE a saved mapping', async () => {
    for (const role of ['COMPANY_ADMIN', 'COMPANY_VIEWER', 'WORKER', 'ADVISOR']) {
      await client.query('BEGIN');
      let blocked = false;
      try {
        await client.query('SET LOCAL ROLE authenticated');
        await client.query(`SELECT set_config('request.jwt.claims', $1, true)`, [
          JSON.stringify({ app_metadata: { kora_role: role, kora_tenant_id: tenantAId } }),
        ]);
        const r = await client.query(`DELETE FROM analytics.saved_column_mapping WHERE id = $1`, [mappingAId]);
        blocked = r.rowCount === 0;
      } catch { blocked = true; }
      finally { await client.query('ROLLBACK'); }
      expect(blocked, `${role} deleted a saved mapping`).toBe(true);
    }
  });

  it('`authenticated` holds SELECT only — never INSERT/UPDATE/DELETE', async () => {
    // The table grant exists solely so the KORA_ADMIN policy is reachable on a
    // user-JWT path; the policy, not the grant, decides row visibility. No
    // write privilege is granted to any normal tenant role.
    const r = await client.query(
      `SELECT privilege_type FROM information_schema.role_table_grants
        WHERE table_schema = 'analytics' AND table_name = 'saved_column_mapping'
          AND grantee = 'authenticated' ORDER BY privilege_type`,
    );
    expect(r.rows.map((x) => x.privilege_type)).toEqual(['SELECT']);
  });

  it('exactly one policy exists — the KORA_ADMIN operational policy', async () => {
    const r = await client.query(
      `SELECT polname FROM pg_policy WHERE polrelid = 'analytics.saved_column_mapping'::regclass`,
    );
    expect(r.rows.map((x) => x.polname)).toEqual(['saved_column_mapping_kora_admin_all']);
  });

  it('the service-authorized write path still works', async () => {
    // service_role is the server's own path: it must remain able to persist.
    const r = await client.query(
      `SELECT has_table_privilege('service_role', 'analytics.saved_column_mapping', 'INSERT') AS ins,
              has_table_privilege('service_role', 'analytics.saved_column_mapping', 'SELECT') AS sel`,
    );
    expect(r.rows[0].ins).toBe(true);
    expect(r.rows[0].sel).toBe(true);
    // And a real privileged insert/read round-trips.
    const ins = await client.query(
      `INSERT INTO analytics.saved_column_mapping (tenant_id, mapping_name, mapping, created_by)
       VALUES ($1, $2, '{"Col":"amount"}'::jsonb, 'rls28-writepath') RETURNING id`,
      [tenantAId, `writepath ${RUN_SUFFIX}`],
    );
    expect(ins.rows[0].id).toBeTruthy();
  });

  // ── duplicate name is a conflict, never an overwrite ─────────────────────

  it('a duplicate (tenant, name) is rejected and leaves the original untouched', async () => {
    const before = await client.query(
      `SELECT mapping FROM analytics.saved_column_mapping WHERE id = $1`, [mappingAId],
    );
    let rejected = false;
    try {
      await client.query(
        `INSERT INTO analytics.saved_column_mapping (tenant_id, mapping_name, mapping)
         VALUES ($1, 'Export welfare A', '{"Del tutto":"hours"}'::jsonb)`,
        [tenantAId],
      );
    } catch (e) {
      rejected = true;
      expect((e as { code?: string }).code).toBe('23505');
    }
    expect(rejected).toBe(true);
    const after = await client.query(
      `SELECT mapping FROM analytics.saved_column_mapping WHERE id = $1`, [mappingAId],
    );
    expect(after.rows[0].mapping).toEqual(before.rows[0].mapping);
  });

  // ── the privacy CHECK is real, not documentation ─────────────────────────

  it('the database rejects a mapping value that is not a canonical intake field', async () => {
    let rejected = false;
    try {
      await client.query(
        `INSERT INTO analytics.saved_column_mapping (tenant_id, mapping_name, mapping)
         VALUES ($1, 'row value smuggled', $2::jsonb)`,
        [tenantAId, JSON.stringify({ 'Dipendente': 'Mario Rossi' })],
      );
    } catch { rejected = true; }
    expect(rejected).toBe(true);
  });

  it('the database rejects the UI sentinels — only canonical fields persist', async () => {
    for (const sentinel of ['ignore', 'keep_original']) {
      let rejected = false;
      try {
        await client.query(
          `INSERT INTO analytics.saved_column_mapping (tenant_id, mapping_name, mapping)
           VALUES ($1, $2, $3::jsonb)`,
          [tenantAId, `sentinel ${sentinel}`, JSON.stringify({ 'Col': sentinel })],
        );
      } catch { rejected = true; }
      expect(rejected, `${sentinel} was accepted`).toBe(true);
    }
  });

  it('the database rejects nested/array values and an empty mapping', async () => {
    for (const bad of [{ 'Col': { nested: 'amount' } }, { 'Col': ['amount'] }, {}]) {
      let rejected = false;
      try {
        await client.query(
          `INSERT INTO analytics.saved_column_mapping (tenant_id, mapping_name, mapping)
           VALUES ($1, $2, $3::jsonb)`,
          [tenantAId, `bad ${JSON.stringify(bad).slice(0, 20)}`, JSON.stringify(bad)],
        );
      } catch { rejected = true; }
      expect(rejected, `${JSON.stringify(bad)} was accepted`).toBe(true);
    }
  });

  it('two Companies may independently use the same mapping name', async () => {
    // The unique constraint is per tenant, so one Company's naming choice can
    // never collide with — or reveal anything about — another's.
    const name = `Shared label ${RUN_SUFFIX}`;
    for (const t of [tenantAId, tenantBId]) {
      await client.query(
        `INSERT INTO analytics.saved_column_mapping (tenant_id, mapping_name, mapping)
         VALUES ($1, $2, '{"Col":"amount"}'::jsonb)`,
        [t, name],
      );
    }
    const r = await client.query(
      `SELECT tenant_id FROM analytics.saved_column_mapping WHERE mapping_name = $1`, [name],
    );
    expect(r.rows).toHaveLength(2);
  });
});
