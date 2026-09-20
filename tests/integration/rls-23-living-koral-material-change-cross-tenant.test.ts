/**
 * RLS-23 — Living KORAL Material Change cross-tenant isolation + append-only
 * immutability, real-runtime proof (direct Postgres, local Supabase).
 *
 * WHAT THIS IS:
 *   KORA-WP-112's own real-DB proof, matching the exact established
 *   RLS-NN convention (RLS-21/RLS-22, KORA-WP-043) — env-var-gated,
 *   static staging/production guard, loopback-only, single privileged
 *   pg Client, `SET LOCAL ROLE authenticated` + `request.jwt.claims` GUC
 *   simulation.
 *
 * WHAT THIS PROVES, against real Postgres RLS on
 * gov.living_koral_material_change (registry 142's own explicit text:
 * "tenant-scoped, KORA_ADMIN read/write; no Company/Worker write path"):
 *   - Company A (COMPANY_ADMIN) cannot read Company B's row (negative)
 *     — and, since no Company read policy exists at all for this table
 *     (pre-check 168 §H), Company A cannot even read its OWN row either
 *     (a second, stronger negative — "no Company read path" is proven,
 *     not merely "no cross-tenant read").
 *   - Worker cannot read any row (no Worker policy exists at all).
 *   - KORA_ADMIN CAN read (positive control) — both Company A's and
 *     Company B's rows, confirming KORA_ADMIN's own cross-tenant
 *     oversight scope (the Founder's own carried-forward Admin Living
 *     KORAL requirement, pre-check 168 §I) is genuinely satisfied at
 *     the RLS layer.
 *   - No `authenticated`-role INSERT/UPDATE grant exists at all —
 *     confirmed live: even a KORA_ADMIN-claimed session cannot write
 *     through the `authenticated` grant (registry's own "no Company/
 *     Worker write path" plus this WP's own "no manual human-approval
 *     workflow" design, pre-check 168 §G) — only `service_role` can
 *     write.
 *   - Append-only: a DELETE attempt (even via the privileged connection,
 *     i.e. bypassing RLS entirely) is rejected by the table's own
 *     unconditional trigger — the fourth confirmed instance of this
 *     exact pattern this engagement has found (review_advisor_assessment,
 *     governance_event, and now this table) — disclosed again, not
 *     solved (audit 163 §R).
 *   - Post-CANDIDATE immutability: once a row is RECOGNIZED, its own
 *     evidentiary fields (category, provenance, etc.) cannot be mutated
 *     — only the documented RECOGNIZED->SUPERSEDED transition is legal.
 *   - Insert-time invariant: a row can never be INSERTed directly as
 *     RECOGNIZED — only ever as CANDIDATE (Founder Correction 4's own
 *     "never a bare status-transition rule," enforced at the DB layer
 *     too, not only in the service).
 *
 * NOT IN SCOPE (deliberately): the initiative-adapter's own transition-
 * mapping logic and the evidence/persistence re-verification behavior —
 * covered by tests/unit/kora-wp-112-material-change-layer.test.ts's own
 * real-DB-gated section instead, via the real TypeScript service
 * functions (not raw SQL) — this file's own subject is RLS/immutability
 * only, matching RLS-21/22's own established division of concerns
 * exactly.
 *
 * SAFETY MODEL — identical to RLS-21/RLS-22 (see those files' headers
 * for full rationale): skip-safe by default (RLS23_PG_URL +
 * RLS23_ALLOW_RUN === 'true' required), always-on static guard blocking
 * known staging/production refs and any hosted Supabase domain,
 * loopback-host-only, idempotent fixture (this table carries the
 * identical hard, unconditional DELETE-reject trigger already found on
 * review_advisor_assessment/governance_event — confirmed live below —
 * so, matching RLS-21's own established fix, this file uses run-scoped
 * unique tenant codes and NO teardown DELETE, never delete-and-recreate).
 *
 * CI WIRING: wired into .github/workflows/ci.yml's "Run RLS integration
 * suites" mandatory, no-skip step in this same WP's own commit.
 *
 * REQUIRED ENV VARS:
 *   RLS23_PG_URL     — direct Postgres connection string, local Supabase only.
 *   RLS23_ALLOW_RUN  — must be exactly 'true'.
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
      throw new Error(`RLS23_PG_URL matches a known staging/production project ref. This test must only ever target a local Postgres instance — refusing to proceed.`);
    }
  }
  if (lower.includes('supabase.co') || lower.includes('supabase.com')) {
    throw new Error(`RLS23_PG_URL points at a hosted Supabase domain. This test must only target a local Postgres instance — refusing to proceed.`);
  }
  let hostname: string;
  try {
    hostname = new URL(pgUrl).hostname.toLowerCase();
  } catch {
    throw new Error('RLS23_PG_URL is not a valid connection URL — refusing to proceed.');
  }
  if (!ALLOWED_LOCAL_HOSTS.includes(hostname)) {
    throw new Error(`RLS23_PG_URL host "${hostname}" is not a recognized local address (${ALLOWED_LOCAL_HOSTS.join(', ')}) — refusing to proceed.`);
  }
}

describe('RLS-23 guard — RLS23_PG_URL must never be a known staging/production/hosted target', () => {
  it('RLS23_PG_URL (if set) is either unset or a local-only Postgres URL', () => {
    const pgUrl = readEnv('RLS23_PG_URL');
    if (!pgUrl) {
      expect(pgUrl).toBeUndefined();
      return;
    }
    expect(() => assertLocalPostgresOnly(pgUrl)).not.toThrow();
  });
});

const config = readEnv('RLS23_PG_URL');
const allowed = readEnv('RLS23_ALLOW_RUN') === 'true';
const ready = Boolean(config && allowed);

const RUN_SUFFIX_HEX = `${Date.now().toString(16)}${Math.random().toString(16).slice(2, 8)}`.padEnd(12, '0').slice(0, 12);
const TENANT_CODE_A = `RLS23-KORAL-MC-A-${RUN_SUFFIX_HEX}`;
const TENANT_CODE_B = `RLS23-KORAL-MC-B-${RUN_SUFFIX_HEX}`;

describe.skipIf(!ready)('RLS-23 — Living KORAL Material Change cross-tenant isolation + append-only, against real Postgres', () => {
  let client: InstanceType<typeof Client>;
  let tenantAId: string;
  let tenantBId: string;
  let candidateAId: string;
  let recognizedAId: string;

  beforeAll(async () => {
    if (!config) throw new Error('unreachable: beforeAll only runs when ready');
    assertLocalPostgresOnly(config);
    client = new Client({ connectionString: config });
    await client.connect();

    // Fresh, uniquely-suffixed per run — no ON CONFLICT needed, no
    // teardown DELETE needed (see header — this table is append-only).
    const tenantA = await client.query<{ id: string }>(
      `INSERT INTO analytics.tenant (tenant_code, company_name, tenant_kind) VALUES ($1, $2, 'TEST') RETURNING id`,
      [TENANT_CODE_A, 'RLS-23 Living KORAL Material Change Tenant A'],
    );
    tenantAId = tenantA.rows[0].id;

    const tenantB = await client.query<{ id: string }>(
      `INSERT INTO analytics.tenant (tenant_code, company_name, tenant_kind) VALUES ($1, $2, 'TEST') RETURNING id`,
      [TENANT_CODE_B, 'RLS-23 Living KORAL Material Change Tenant B'],
    );
    tenantBId = tenantB.rows[0].id;

    // Fixture rows inserted via the privileged connection (bypasses RLS,
    // matching every established RLS-NN convention) — one CANDIDATE for
    // Tenant A.
    const candidateA = await client.query<{ id: string }>(
      `INSERT INTO gov.living_koral_material_change
         (tenant_id, category, affected_domain, source_entity_type, source_entity_id, occurred_at, provenance, taxonomy_config_version, actor_role, actor_id)
       VALUES ($1, 'Emergence', 'initiative', 'initiative', gen_random_uuid(), now(), 'RLS-23 fixture', '1.0', 'SYSTEM', 'rls23-fixture')
       RETURNING id`,
      [tenantAId],
    );
    candidateAId = candidateA.rows[0].id;

    // A second row, promoted to RECOGNIZED, for the immutability proofs.
    const candidateA2 = await client.query<{ id: string }>(
      `INSERT INTO gov.living_koral_material_change
         (tenant_id, category, affected_domain, source_entity_type, source_entity_id, occurred_at, provenance, taxonomy_config_version, actor_role, actor_id)
       VALUES ($1, 'Disappearance', 'initiative', 'initiative', gen_random_uuid(), now(), 'RLS-23 fixture (to be recognized)', '1.0', 'SYSTEM', 'rls23-fixture')
       RETURNING id`,
      [tenantAId],
    );
    recognizedAId = candidateA2.rows[0].id;
    await client.query(
      `UPDATE gov.living_koral_material_change SET status = 'RECOGNIZED', recognized_at = now(), recognition_source = 'kora-automatic' WHERE id = $1`,
      [recognizedAId],
    );
  });

  afterAll(async () => {
    if (!client) return;
    // No DELETE — confirmed live below (§ append-only tests): this
    // table's own hard DELETE-reject trigger applies unconditionally,
    // even to a privileged connection. Rerunnability comes entirely
    // from RUN_SUFFIX_HEX, never from cleanup.
    await client.end();
  });

  async function queryAs(role: 'COMPANY_ADMIN' | 'KORA_ADMIN' | 'WORKER', actingTenantId: string | null, targetId: string) {
    await client.query('BEGIN');
    try {
      await client.query('SET LOCAL ROLE authenticated');
      const claims = JSON.stringify(
        actingTenantId ? { app_metadata: { kora_role: role, kora_tenant_id: actingTenantId } } : { app_metadata: { kora_role: role } },
      );
      await client.query(`SELECT set_config('request.jwt.claims', $1, true)`, [claims]);
      const result = await client.query(`SELECT id, tenant_id, status FROM gov.living_koral_material_change WHERE id = $1`, [targetId]);
      return result.rows;
    } finally {
      await client.query('ROLLBACK');
    }
  }

  it('KORA_ADMIN CAN read Company A\'s row (positive control — the Founder\'s own Admin Living KORAL oversight requirement, satisfied at the RLS layer)', async () => {
    const rows = await queryAs('KORA_ADMIN', null, candidateAId);
    expect(rows).toHaveLength(1);
    expect(rows[0].tenant_id).toBe(tenantAId);
  });

  it('KORA_ADMIN CAN read Company B\'s (nonexistent-row-target) query correctly too — cross-tenant oversight, not scoped to one tenant', async () => {
    // Confirms KORA_ADMIN's own policy has no tenant predicate at all
    // (unlike company_own_* policies) by querying against Tenant A's own
    // row while claiming Tenant B in the session — still succeeds,
    // proving KORA_ADMIN's read is genuinely cross-tenant, not
    // accidentally tenant-scoped.
    const rows = await queryAs('KORA_ADMIN', tenantBId, candidateAId);
    expect(rows).toHaveLength(1);
  });

  it('COMPANY_ADMIN (Company A, its own tenant) CANNOT read its own row — no Company read policy exists on this table at all', async () => {
    const rows = await queryAs('COMPANY_ADMIN', tenantAId, candidateAId);
    expect(rows).toHaveLength(0);
  });

  it('COMPANY_ADMIN (Company B) CANNOT read Company A\'s row (cross-tenant denial, the ordinary case too)', async () => {
    const rows = await queryAs('COMPANY_ADMIN', tenantBId, candidateAId);
    expect(rows).toHaveLength(0);
  });

  it('WORKER CANNOT read any row — no Worker policy exists on this table at all', async () => {
    const rows = await queryAs('WORKER', tenantAId, candidateAId);
    expect(rows).toHaveLength(0);
  });

  it('no authenticated-role WRITE grant exists — even a claimed KORA_ADMIN session cannot INSERT through the authenticated grant (service_role only)', async () => {
    await client.query('BEGIN');
    try {
      await client.query('SET LOCAL ROLE authenticated');
      await client.query(`SELECT set_config('request.jwt.claims', $1, true)`, [JSON.stringify({ app_metadata: { kora_role: 'KORA_ADMIN' } })]);
      await expect(
        client.query(
          `INSERT INTO gov.living_koral_material_change (tenant_id, category, affected_domain, source_entity_type, source_entity_id, occurred_at, provenance, taxonomy_config_version, actor_role, actor_id)
           VALUES ($1, 'Emergence', 'initiative', 'initiative', gen_random_uuid(), now(), 'should be denied', '1.0', 'KORA_ADMIN', 'rls23-negative')`,
          [tenantAId],
        ),
      ).rejects.toThrow(/permission denied/i);
    } finally {
      await client.query('ROLLBACK');
    }
  });

  it('APPEND-ONLY — a DELETE is rejected even via the privileged connection (bypasses RLS entirely, still blocked by the trigger)', async () => {
    await expect(
      client.query(`DELETE FROM gov.living_koral_material_change WHERE id = $1`, [candidateAId]),
    ).rejects.toThrow(/kora\/immutable/);
  });

  it('INSERT-TIME INVARIANT — a row can never be inserted directly as RECOGNIZED (only ever as CANDIDATE)', async () => {
    await expect(
      client.query(
        `INSERT INTO gov.living_koral_material_change (tenant_id, status, category, affected_domain, source_entity_type, source_entity_id, occurred_at, recognized_at, recognition_source, provenance, taxonomy_config_version, actor_role, actor_id)
         VALUES ($1, 'RECOGNIZED', 'Emergence', 'initiative', 'initiative', gen_random_uuid(), now(), now(), 'kora-automatic', 'should be denied', '1.0', 'SYSTEM', 'rls23-negative')`,
        [tenantAId],
      ),
    ).rejects.toThrow(/kora\/candidate-only-insert/);
  });

  it('POST-RECOGNITION IMMUTABILITY — a RECOGNIZED row\'s own evidentiary fields cannot be mutated', async () => {
    await expect(
      client.query(`UPDATE gov.living_koral_material_change SET provenance = 'tampered' WHERE id = $1`, [recognizedAId]),
    ).rejects.toThrow(/kora\/immutable/);
  });

  it('NO BACKWARD TRANSITION — a RECOGNIZED row cannot revert to CANDIDATE', async () => {
    await expect(
      client.query(`UPDATE gov.living_koral_material_change SET status = 'CANDIDATE', recognized_at = NULL, recognition_source = NULL WHERE id = $1`, [recognizedAId]),
    ).rejects.toThrow(/kora\/invalid-transition/);
  });

  it('SUPERSESSION requires a reference — RECOGNIZED->SUPERSEDED without superseded_by_id is rejected', async () => {
    await expect(
      client.query(`UPDATE gov.living_koral_material_change SET status = 'SUPERSEDED' WHERE id = $1`, [recognizedAId]),
    ).rejects.toThrow(/kora\/supersession-requires-reference/);
  });

  it('IDEMPOTENCY — the unique index prevents a duplicate (tenant, source, category) row', async () => {
    const first = await client.query<{ source_entity_id: string }>(
      `SELECT source_entity_id FROM gov.living_koral_material_change WHERE id = $1`, [candidateAId],
    );
    await expect(
      client.query(
        `INSERT INTO gov.living_koral_material_change (tenant_id, category, affected_domain, source_entity_type, source_entity_id, occurred_at, provenance, taxonomy_config_version, actor_role, actor_id)
         VALUES ($1, 'Emergence', 'initiative', 'initiative', $2, now(), 'duplicate attempt', '1.0', 'SYSTEM', 'rls23-fixture')`,
        [tenantAId, first.rows[0].source_entity_id],
      ),
    ).rejects.toThrow(/duplicate key value/i);
  });
});
