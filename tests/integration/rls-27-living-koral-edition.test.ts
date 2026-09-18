/**
 * RLS-27 — KORAL Edition (Portrait folded into Edition), real-runtime
 * proof (direct Postgres, local Supabase).
 *
 * WHAT THIS IS:
 *   KORA-WP-115's own real-DB proof, matching the exact established
 *   RLS-NN convention (RLS-21..26) — env-var-gated, static
 *   staging/production guard, loopback-only, single privileged pg
 *   Client, `SET LOCAL ROLE authenticated` + `request.jwt.claims` GUC
 *   simulation.
 *
 * WHAT THIS PROVES, against real Postgres, migration 085
 * (analytics.living_koral_edition + analytics.fn_create_living_koral_edition()):
 *   - COMPANY_ADMIN (own tenant) CAN create an Edition from its own
 *     latest recognized transformation, with the source label correctly,
 *     immutably frozen at creation.
 *   - COMPANY_ADMIN (foreign tenant claim) CANNOT create an Edition
 *     anchored to another tenant's Ledger — the function always reads
 *     the CALLER's own tenant's latest Ledger row, never a caller-
 *     supplied one, so there is no "foreign creation" attack surface to
 *     begin with; this suite proves the caller's own tenant is always
 *     the one used, never influenceable.
 *   - WORKER/ADVISOR/KORA_ADMIN CANNOT create an Edition — the role gate
 *     is unconditional, independent of tenant claim.
 *   - A tenant with NO recognized transformation yet CANNOT create an
 *     Edition (kora/no-recognized-transformation).
 *   - COMPANY_ADMIN (own tenant) CAN read its own Editions; CANNOT read
 *     another tenant's. KORA_ADMIN CAN read cross-tenant (unchanged
 *     posture). WORKER/ADVISOR CANNOT read at all.
 *   - No `authenticated`-role UPDATE/DELETE/direct-INSERT grant exists —
 *     the SECURITY DEFINER function is the only write path.
 *   - APPEND-ONLY: a direct UPDATE or DELETE is rejected even via the
 *     privileged connection (the 6th confirmed instance of this pattern).
 *   - No `anon`/`PUBLIC` EXECUTE grant on the creation function — hardened
 *     from first implementation (this WP's own §16, never repeating
 *     migration 084's own initially-discovered PUBLIC gap).
 *   - The frozen source_label snapshot does NOT change after the
 *     underlying personal.worker_initiative.title is later mutated.
 *   - Edition creation never mutates analytics.living_koral_state or
 *     gov.living_koral_transformation_ledger (current-state independence).
 *   - Multiple, independently-named Editions MAY reference the identical
 *     Ledger point (Founder adjudication #3 — no UNIQUE constraint).
 *
 * SAFETY MODEL — identical to RLS-21..26: skip-safe by default
 * (RLS27_PG_URL + RLS27_ALLOW_RUN === 'true' required), always-on static
 * guard, loopback-host-only, run-scoped unique tenant codes, NO teardown
 * DELETE (the table is hard-append-only).
 *
 * CI WIRING: wired into .github/workflows/ci.yml's mandatory RLS gate step
 * in this same WP's own commit.
 *
 * REQUIRED ENV VARS:
 *   RLS27_PG_URL     — direct Postgres connection string, local Supabase only.
 *   RLS27_ALLOW_RUN  — must be exactly 'true'.
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
      throw new Error(`RLS27_PG_URL matches a known staging/production project ref. This test must only ever target a local Postgres instance — refusing to proceed.`);
    }
  }
  if (lower.includes('supabase.co') || lower.includes('supabase.com')) {
    throw new Error(`RLS27_PG_URL points at a hosted Supabase domain. This test must only target a local Postgres instance — refusing to proceed.`);
  }
  let hostname: string;
  try {
    hostname = new URL(pgUrl).hostname.toLowerCase();
  } catch {
    throw new Error('RLS27_PG_URL is not a valid connection URL — refusing to proceed.');
  }
  if (!ALLOWED_LOCAL_HOSTS.includes(hostname)) {
    throw new Error(`RLS27_PG_URL host "${hostname}" is not a recognized local address (${ALLOWED_LOCAL_HOSTS.join(', ')}) — refusing to proceed.`);
  }
}

describe('RLS-27 guard — RLS27_PG_URL must never be a known staging/production/hosted target', () => {
  it('RLS27_PG_URL (if set) is either unset or a local-only Postgres URL', () => {
    const pgUrl = readEnv('RLS27_PG_URL');
    if (!pgUrl) {
      expect(pgUrl).toBeUndefined();
      return;
    }
    expect(() => assertLocalPostgresOnly(pgUrl)).not.toThrow();
  });
});

const config = readEnv('RLS27_PG_URL');
const allowed = readEnv('RLS27_ALLOW_RUN') === 'true';
const ready = Boolean(config && allowed);

const RUN_SUFFIX_HEX = `${Date.now().toString(16)}${Math.random().toString(16).slice(2, 8)}`.padEnd(12, '0').slice(0, 12);
const TENANT_CODE_A = `RLS27-EDITION-A-${RUN_SUFFIX_HEX}`;
const TENANT_CODE_B = `RLS27-EDITION-B-${RUN_SUFFIX_HEX}`;
const TENANT_CODE_C = `RLS27-EDITION-C-NOSTATE-${RUN_SUFFIX_HEX}`; // tenant with zero recognized transformations

describe.skipIf(!ready)('RLS-27 — KORAL Edition, against real Postgres', () => {
  let client: InstanceType<typeof Client>;
  let tenantAId: string;
  let tenantBId: string;
  let tenantCId: string;
  let initiativeAId: string;
  let editionAId: string;

  beforeAll(async () => {
    if (!config) throw new Error('unreachable: beforeAll only runs when ready');
    assertLocalPostgresOnly(config);
    client = new Client({ connectionString: config });
    await client.connect();

    const tenantA = await client.query<{ id: string }>(
      `INSERT INTO analytics.tenant (tenant_code, company_name, tenant_kind) VALUES ($1, $2, 'TEST') RETURNING id`,
      [TENANT_CODE_A, 'RLS-27 Edition Tenant A'],
    );
    tenantAId = tenantA.rows[0].id;

    const tenantB = await client.query<{ id: string }>(
      `INSERT INTO analytics.tenant (tenant_code, company_name, tenant_kind) VALUES ($1, $2, 'TEST') RETURNING id`,
      [TENANT_CODE_B, 'RLS-27 Edition Tenant B'],
    );
    tenantBId = tenantB.rows[0].id;

    const tenantC = await client.query<{ id: string }>(
      `INSERT INTO analytics.tenant (tenant_code, company_name, tenant_kind) VALUES ($1, $2, 'TEST') RETURNING id`,
      [TENANT_CODE_C, 'RLS-27 Edition Tenant C (no state)'],
    );
    tenantCId = tenantC.rows[0].id;

    const initiative = await client.query<{ id: string }>(
      `INSERT INTO personal.worker_initiative (tenant_id, title, pillar, status) VALUES ($1, $2, 'GROWTH', 'published') RETURNING id`,
      [tenantAId, `RLS-27 Corso Originale ${RUN_SUFFIX_HEX}`],
    );
    initiativeAId = initiative.rows[0].id;

    const mc = await client.query<{ id: string }>(
      `INSERT INTO gov.living_koral_material_change
         (tenant_id, category, affected_domain, source_entity_type, source_entity_id, occurred_at, provenance, taxonomy_config_version, actor_role, actor_id)
       VALUES ($1, 'Emergence', 'initiative', 'initiative', $2, now(), 'RLS-27 fixture', '1.0', 'SYSTEM', 'rls27-fixture')
       RETURNING id`,
      [tenantAId, initiativeAId],
    );
    await client.query(
      `UPDATE gov.living_koral_material_change SET status = 'RECOGNIZED', recognized_at = now(), recognition_source = 'kora-automatic' WHERE id = $1`,
      [mc.rows[0].id],
    );
    await client.query(
      `SELECT ledger_id FROM gov.record_living_koral_transformation($1, 'add_element', 'morphogenesis-v1.0')`,
      [mc.rows[0].id],
    );

    // Tenant B also gets a real recognized transformation — needed for
    // the genuine-concurrency test below (Tenant B is otherwise used only
    // as the "foreign tenant" for read/create-denial fixtures above).
    const mcB = await client.query<{ id: string }>(
      `INSERT INTO gov.living_koral_material_change
         (tenant_id, category, affected_domain, source_entity_type, source_entity_id, occurred_at, provenance, taxonomy_config_version, actor_role, actor_id)
       VALUES ($1, 'Emergence', 'initiative', 'initiative', gen_random_uuid(), now(), 'RLS-27 fixture B', '1.0', 'SYSTEM', 'rls27-fixture')
       RETURNING id`,
      [tenantBId],
    );
    await client.query(
      `UPDATE gov.living_koral_material_change SET status = 'RECOGNIZED', recognized_at = now(), recognition_source = 'kora-automatic' WHERE id = $1`,
      [mcB.rows[0].id],
    );
    await client.query(
      `SELECT ledger_id FROM gov.record_living_koral_transformation($1, 'add_element', 'morphogenesis-v1.0')`,
      [mcB.rows[0].id],
    );
  });

  afterAll(async () => {
    if (!client) return;
    // No DELETE — the Edition table is hard-append-only. Rerunnability
    // comes entirely from RUN_SUFFIX_HEX.
    await client.end();
  });

  async function asRole(role: string, tenantId: string | null) {
    await client.query('SET LOCAL ROLE authenticated');
    const claims = JSON.stringify(
      tenantId ? { app_metadata: { kora_role: role, kora_tenant_id: tenantId } } : { app_metadata: { kora_role: role } },
    );
    await client.query(`SELECT set_config('request.jwt.claims', $1, true)`, [claims]);
  }

  async function createEditionAs(role: string, tenantId: string | null, name: string) {
    await client.query('BEGIN');
    try {
      await asRole(role, tenantId);
      const result = await client.query(`SELECT * FROM analytics.fn_create_living_koral_edition($1)`, [name]);
      await client.query('COMMIT');
      return { rows: result.rows, error: null as Error | null };
    } catch (err) {
      await client.query('ROLLBACK');
      return { rows: [], error: err as Error };
    }
  }

  async function readEditionsAs(role: string, tenantId: string | null, forTenantId: string) {
    await client.query('BEGIN');
    try {
      await asRole(role, tenantId);
      const result = await client.query(`SELECT id, tenant_id, name FROM analytics.living_koral_edition WHERE tenant_id = $1`, [forTenantId]);
      return result.rows;
    } finally {
      await client.query('ROLLBACK');
    }
  }

  it('COMPANY_ADMIN (own tenant) CAN create an Edition from its own latest recognized transformation, with the frozen source label correctly resolved', async () => {
    const { rows, error } = await createEditionAs('COMPANY_ADMIN', tenantAId, 'Edizione Originale RLS-27');
    expect(error).toBeNull();
    expect(rows).toHaveLength(1);
    expect(rows[0].name).toBe('Edizione Originale RLS-27');
    expect(rows[0].source_label).toBe(`RLS-27 Corso Originale ${RUN_SUFFIX_HEX}`);
    expect(rows[0].category).toBe('Emergence');
    editionAId = rows[0].id;
  });

  it('WORKER CANNOT create an Edition, even for its own tenant', async () => {
    const { rows, error } = await createEditionAs('WORKER', tenantAId, 'Should Not Exist');
    expect(rows).toHaveLength(0);
    expect(error?.message).toMatch(/kora\/forbidden/);
  });

  it('ADVISOR CANNOT create an Edition, even for its own tenant', async () => {
    const { rows, error } = await createEditionAs('ADVISOR', tenantAId, 'Should Not Exist');
    expect(rows).toHaveLength(0);
    expect(error?.message).toMatch(/kora\/forbidden/);
  });

  it('KORA_ADMIN CANNOT create an Edition — read-only, no constitutive authority (pre-check 174 §6)', async () => {
    const { rows, error } = await createEditionAs('KORA_ADMIN', null, 'Should Not Exist');
    expect(rows).toHaveLength(0);
    expect(error?.message).toMatch(/kora\/forbidden/);
  });

  it('COMPANY_ADMIN with NO recognized transformation yet CANNOT create an Edition', async () => {
    const { rows, error } = await createEditionAs('COMPANY_ADMIN', tenantCId, 'Should Not Exist');
    expect(rows).toHaveLength(0);
    expect(error?.message).toMatch(/kora\/no-recognized-transformation/);
  });

  it('COMPANY_ADMIN CANNOT create an Edition with an empty name', async () => {
    const { rows, error } = await createEditionAs('COMPANY_ADMIN', tenantAId, '   ');
    expect(rows).toHaveLength(0);
    expect(error?.message).toMatch(/kora\/invalid-name/);
  });

  it('A SECOND, distinct COMPANY_ADMIN creation for Tenant A succeeds and references the SAME Ledger point — no UNIQUE(tenant_id, ledger_id) constraint (Founder adjudication #3)', async () => {
    const { rows, error } = await createEditionAs('COMPANY_ADMIN', tenantAId, 'Seconda Edizione Stesso Momento');
    expect(error).toBeNull();
    expect(rows).toHaveLength(1);
    const first = await client.query(`SELECT ledger_id FROM analytics.living_koral_edition WHERE id = $1`, [editionAId]);
    expect(rows[0].ledger_id).toBe(first.rows[0].ledger_id);
  });

  it('COMPANY_ADMIN (own tenant) CAN read its own Editions', async () => {
    const rows = await readEditionsAs('COMPANY_ADMIN', tenantAId, tenantAId);
    expect(rows.length).toBeGreaterThanOrEqual(1);
  });

  it('COMPANY_ADMIN (Tenant B) CANNOT read Tenant A\'s Editions', async () => {
    const rows = await readEditionsAs('COMPANY_ADMIN', tenantBId, tenantAId);
    expect(rows).toHaveLength(0);
  });

  it('KORA_ADMIN CAN read cross-tenant Editions', async () => {
    const rows = await readEditionsAs('KORA_ADMIN', tenantBId, tenantAId);
    expect(rows.length).toBeGreaterThanOrEqual(1);
  });

  it('WORKER CANNOT read Editions at all', async () => {
    const rows = await readEditionsAs('WORKER', tenantAId, tenantAId);
    expect(rows).toHaveLength(0);
  });

  it('ADVISOR CANNOT read Editions at all', async () => {
    const rows = await readEditionsAs('ADVISOR', tenantAId, tenantAId);
    expect(rows).toHaveLength(0);
  });

  it('no authenticated-role direct INSERT grant exists — even a claimed COMPANY_ADMIN session cannot bypass the function', async () => {
    await client.query('BEGIN');
    try {
      await asRole('COMPANY_ADMIN', tenantAId);
      await expect(
        client.query(
          `INSERT INTO analytics.living_koral_edition (tenant_id, name, ledger_id, category, affected_domain, taxonomy_config_version, morphogenesis_engine_version, resulting_state_revision, occurred_at, recognized_at, actor_id)
           SELECT $1, 'raw insert', id, category, affected_domain, taxonomy_config_version, morphogenesis_engine_version, resulting_state_revision, occurred_at, recognized_at, 'attacker'
           FROM gov.living_koral_transformation_ledger WHERE tenant_id = $1 LIMIT 1`,
          [tenantAId],
        ),
      ).rejects.toThrow(/permission denied/i);
    } finally {
      await client.query('ROLLBACK');
    }
  });

  it('APPEND-ONLY — a direct UPDATE is rejected even via the privileged connection', async () => {
    await expect(
      client.query(`UPDATE analytics.living_koral_edition SET name = 'tampered' WHERE id = $1`, [editionAId]),
    ).rejects.toThrow(/kora\/immutable/);
  });

  it('APPEND-ONLY — a direct DELETE is rejected even via the privileged connection', async () => {
    await expect(
      client.query(`DELETE FROM analytics.living_koral_edition WHERE id = $1`, [editionAId]),
    ).rejects.toThrow(/kora\/immutable/);
  });

  it('no `anon` EXECUTE grant exists on the creation function', async () => {
    await client.query('BEGIN');
    try {
      await client.query('SET LOCAL ROLE anon');
      await expect(
        client.query(`SELECT * FROM analytics.fn_create_living_koral_edition($1)`, ['anon attempt']),
      ).rejects.toThrow(/permission denied/i);
    } finally {
      await client.query('ROLLBACK');
    }
  });

  it('SECURITY DEFINER hardening — no PUBLIC entry in the function ACL (hardened from first implementation, this WP\'s own §16)', async () => {
    const result = await client.query<{ proacl: string[] }>(
      `SELECT proacl::text[] AS proacl FROM pg_proc WHERE proname = 'fn_create_living_koral_edition'`,
    );
    expect(result.rows).toHaveLength(1);
    const acl = result.rows[0].proacl;
    expect(acl.some((entry) => entry.startsWith('=X/'))).toBe(false);
    expect(acl).toContain('authenticated=X/postgres');
  });

  it('SECURITY DEFINER hardening — owner is postgres, explicit safe search_path is set at the DB level', async () => {
    const result = await client.query<{ proowner: string; proconfig: string[] }>(
      `SELECT proowner::regrole::text AS proowner, proconfig FROM pg_proc WHERE proname = 'fn_create_living_koral_edition'`,
    );
    expect(result.rows[0].proowner).toBe('postgres');
    expect(result.rows[0].proconfig).toEqual(['search_path=gov, analytics, kora, public']);
  });

  it('FROZEN SOURCE LABEL — a later mutation of the underlying initiative title does NOT change the already-created Edition\'s snapshot', async () => {
    const before = await client.query(`SELECT source_label FROM analytics.living_koral_edition WHERE id = $1`, [editionAId]);
    expect(before.rows[0].source_label).toBe(`RLS-27 Corso Originale ${RUN_SUFFIX_HEX}`);

    await client.query(`UPDATE personal.worker_initiative SET title = $1 WHERE id = $2`, [`RLS-27 Corso RINOMINATO ${RUN_SUFFIX_HEX}`, initiativeAId]);

    const after = await client.query(`SELECT source_label FROM analytics.living_koral_edition WHERE id = $1`, [editionAId]);
    expect(after.rows[0].source_label).toBe(`RLS-27 Corso Originale ${RUN_SUFFIX_HEX}`); // unchanged — frozen at creation
    expect(after.rows[0].source_label).not.toBe(`RLS-27 Corso RINOMINATO ${RUN_SUFFIX_HEX}`);
  });

  it('CURRENT-STATE INDEPENDENCE — Edition creation never mutated analytics.living_koral_state or gov.living_koral_transformation_ledger row counts for Tenant A beyond the one real transformation already recorded', async () => {
    const stateRows = await client.query(`SELECT revision FROM analytics.living_koral_state WHERE tenant_id = $1`, [tenantAId]);
    expect(stateRows.rows).toHaveLength(1);
    expect(stateRows.rows[0].revision).toBe(1); // one real transformation was recorded in beforeAll; Edition creation added none

    const ledgerRows = await client.query(`SELECT count(*)::int AS n FROM gov.living_koral_transformation_ledger WHERE tenant_id = $1`, [tenantAId]);
    expect(ledgerRows.rows[0].n).toBe(1); // still exactly one Ledger row — two Edition creations did not add a second
  });

  it('CONCURRENCY — two genuinely concurrent fn_create_living_koral_edition() calls for the same tenant, via two separate real connections, both succeed with no corruption (the DB function\'s own concurrency safety — distinct from KORA-WP-011\'s own already-proven idempotency-claim atomicity, which this suite does not re-prove, per this WP\'s own "do not duplicate" instruction)', async () => {
    const clientX = new Client({ connectionString: config });
    const clientY = new Client({ connectionString: config });
    await clientX.connect();
    await clientY.connect();

    async function createOnConn(conn: InstanceType<typeof Client>, name: string) {
      await conn.query('BEGIN');
      await conn.query('SET LOCAL ROLE authenticated');
      await conn.query(`SELECT set_config('request.jwt.claims', $1, true)`, [
        JSON.stringify({ app_metadata: { kora_role: 'COMPANY_ADMIN', kora_tenant_id: tenantBId } }),
      ]);
      const result = await conn.query(`SELECT id FROM analytics.fn_create_living_koral_edition($1)`, [name]);
      await conn.query('COMMIT');
      return result.rows[0]?.id as string | undefined;
    }

    try {
      const [idX, idY] = await Promise.all([
        createOnConn(clientX, 'Edizione Concorrente X'),
        createOnConn(clientY, 'Edizione Concorrente Y'),
      ]);

      expect(idX).toBeDefined();
      expect(idY).toBeDefined();
      expect(idX).not.toBe(idY); // two distinct rows, no lost update, no corruption

      const rows = await client.query(`SELECT id, name FROM analytics.living_koral_edition WHERE tenant_id = $1`, [tenantBId]);
      expect(rows.rows).toHaveLength(2);
      expect(rows.rows.map((r) => r.name).sort()).toEqual(['Edizione Concorrente X', 'Edizione Concorrente Y']);
    } finally {
      await clientX.end();
      await clientY.end();
    }
  });
});
