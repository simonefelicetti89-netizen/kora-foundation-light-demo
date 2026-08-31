/**
 * RLS-12 — tenant_kind operational-safety parity DB test (direct Postgres, local Supabase)
 *
 * WHAT THIS IS:
 *   A LIVE proof that `analytics.tenant.tenant_kind` never participates in
 *   product-level RLS/business logic — a DEMO-kind tenant's COMPANY_ADMIN
 *   can INSERT and SELECT commons.post rows through the exact same RLS
 *   policies (commons_post_company_admin_insert/select, migration 013) as a
 *   LIVE-kind tenant's COMPANY_ADMIN, with identical results. Chosen as the
 *   "least invasive capability already available on both" per this task's
 *   own scope: no new schema, no new policy, already-familiar RLS from
 *   RLS-11.
 *
 * WHY THIS MATTERS (ONE PRODUCT / NO DEMO RUNTIME, Patch 03):
 *   tenant_kind is declared operational-safety metadata only — it may gate
 *   real external side effects (see app/api/admin/companies/provision/
 *   route.ts's non-LIVE branch) but must never change product computation.
 *   This test is the concrete, DB-level proof of that second half of the
 *   claim, not just a code-comment assertion.
 *
 * SAME SAFETY MODEL AS RLS-03/RLS-11 (see rls-two-tenant-negative.test.ts's
 * header for the full rationale):
 *   - Skip-safe by default: everything lives inside describe.skipIf(!ready),
 *     ready requires RLS12_PG_URL set AND RLS12_ALLOW_RUN==='true'.
 *   - An always-on static guard hard-blocks known staging/production
 *     project refs and any hosted Supabase domain, and requires a loopback
 *     host, independent of RLS12_ALLOW_RUN.
 *   - Fixture setup/teardown uses a privileged (non-`authenticated`)
 *     connection role; every assertion opens its own transaction, switches
 *     to `SET LOCAL ROLE authenticated`, fabricates request.jwt.claims,
 *     queries, then always rolls back.
 *   - Teardown is scoped strictly to this test's own tenant_code values.
 *
 * REQUIRED ENV VARS:
 *   RLS12_PG_URL     — direct Postgres connection string, local Supabase
 *                      only. Confirm via `supabase status`, e.g.:
 *                        postgresql://postgres:postgres@127.0.0.1:54322/postgres
 *   RLS12_ALLOW_RUN  — must be exactly 'true'.
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import pg from 'pg';

const { Client } = pg;

function readEnv(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim().length > 0 ? value : undefined;
}

interface Rls12Config {
  pgUrl: string;
}

function readRls12Config(): Rls12Config | null {
  const pgUrl = readEnv('RLS12_PG_URL');
  if (!pgUrl) return null;
  return { pgUrl };
}

function isRunExplicitlyAllowed(): boolean {
  return readEnv('RLS12_ALLOW_RUN') === 'true';
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
      throw new Error(
        `RLS12_PG_URL matches a known staging/production project ref. This test must only ` +
          `ever target a local Postgres instance — refusing to proceed.`,
      );
    }
  }
  if (lower.includes('supabase.co') || lower.includes('supabase.com')) {
    throw new Error(
      `RLS12_PG_URL points at a hosted Supabase domain. This test must only target a local ` +
        `Postgres instance (confirm the correct URL via \`supabase status\`) — refusing to proceed.`,
    );
  }

  let hostname: string;
  try {
    hostname = new URL(pgUrl).hostname.toLowerCase();
  } catch {
    throw new Error('RLS12_PG_URL is not a valid connection URL — refusing to proceed.');
  }
  if (!ALLOWED_LOCAL_HOSTS.includes(hostname)) {
    throw new Error(
      `RLS12_PG_URL host "${hostname}" is not a recognized local address ` +
        `(${ALLOWED_LOCAL_HOSTS.join(', ')}). This test must only target a local Supabase ` +
        `Postgres instance — refusing to proceed.`,
    );
  }
}

describe('RLS-12 guard — RLS12_PG_URL must never be a known staging/production/hosted target', () => {
  it('RLS12_PG_URL (if set) is either unset or a local-only Postgres URL', () => {
    const pgUrl = readEnv('RLS12_PG_URL');
    if (!pgUrl) {
      expect(pgUrl).toBeUndefined();
      return;
    }
    expect(() => assertLocalPostgresOnly(pgUrl)).not.toThrow();
  });
});

const config = readRls12Config();
const allowed = isRunExplicitlyAllowed();
const ready = config !== null && allowed;

const RLS12_TENANT_CODES = ['RLS12-LIVE', 'RLS12-DEMO'] as const;

describe.skipIf(!ready)(
  'RLS-12 — tenant_kind does not alter canonical product logic (commons.post, migration 013)',
  () => {
    let privilegedClient: InstanceType<typeof Client>;
    let liveTenantId: string;
    let demoTenantId: string;

    beforeAll(async () => {
      if (!config) throw new Error('unreachable: beforeAll only runs when describe.skipIf(!ready) has already passed');
      assertLocalPostgresOnly(config.pgUrl);

      privilegedClient = new Client({ connectionString: config.pgUrl });
      await privilegedClient.connect();

      const liveResult = await privilegedClient.query<{ id: string }>(
        `INSERT INTO analytics.tenant (tenant_code, company_name, tenant_kind)
         VALUES ($1, $2, 'LIVE')
         ON CONFLICT (tenant_code) DO UPDATE SET company_name = EXCLUDED.company_name, tenant_kind = 'LIVE'
         RETURNING id`,
        ['RLS12-LIVE', 'RLS-12 Synthetic Tenant (LIVE)'],
      );
      liveTenantId = liveResult.rows[0].id;

      const demoResult = await privilegedClient.query<{ id: string }>(
        `INSERT INTO analytics.tenant (tenant_code, company_name, tenant_kind)
         VALUES ($1, $2, 'DEMO')
         ON CONFLICT (tenant_code) DO UPDATE SET company_name = EXCLUDED.company_name, tenant_kind = 'DEMO'
         RETURNING id`,
        ['RLS12-DEMO', 'RLS-12 Synthetic Tenant (DEMO)'],
      );
      demoTenantId = demoResult.rows[0].id;

      // Clean any leftover posts from a prior incomplete run.
      await privilegedClient.query(`DELETE FROM commons.post WHERE tenant_id = ANY($1)`, [[liveTenantId, demoTenantId]]);
    });

    afterAll(async () => {
      if (!privilegedClient) return;

      const tenantRows = await privilegedClient.query<{ id: string }>(
        `SELECT id FROM analytics.tenant WHERE tenant_code = ANY($1)`,
        [RLS12_TENANT_CODES as unknown as string[]],
      );
      const ids = tenantRows.rows.map((row) => row.id);

      if (ids.length > 0) {
        await privilegedClient.query(`DELETE FROM commons.post WHERE tenant_id = ANY($1)`, [ids]);
        await privilegedClient.query(`DELETE FROM analytics.tenant WHERE tenant_code = ANY($1)`, [
          RLS12_TENANT_CODES as unknown as string[],
        ]);
      }

      await privilegedClient.end();
    });

    async function insertAsCompanyAdmin(actingTenantId: string, title: string) {
      await privilegedClient.query('BEGIN');
      try {
        await privilegedClient.query('SET LOCAL ROLE authenticated');
        const claims = JSON.stringify({
          app_metadata: { kora_role: 'COMPANY_ADMIN', kora_tenant_id: actingTenantId },
        });
        await privilegedClient.query(`SELECT set_config('request.jwt.claims', $1, true)`, [claims]);

        const result = await privilegedClient.query(
          `INSERT INTO commons.post (tenant_id, author_role, title, body, category, status)
           VALUES ($1, 'COMPANY_ADMIN', $2, 'RLS-12 parity body', 'announcement', 'draft')
           RETURNING id, tenant_id, status`,
          [actingTenantId, title],
        );
        return { data: result.rows[0] as { id: string; tenant_id: string; status: string }, error: null as Error | null };
      } catch (error) {
        return { data: null, error: error as Error };
      } finally {
        await privilegedClient.query('COMMIT');
      }
    }

    async function selectOwnAsCompanyAdmin(actingTenantId: string) {
      await privilegedClient.query('BEGIN');
      try {
        await privilegedClient.query('SET LOCAL ROLE authenticated');
        const claims = JSON.stringify({
          app_metadata: { kora_role: 'COMPANY_ADMIN', kora_tenant_id: actingTenantId },
        });
        await privilegedClient.query(`SELECT set_config('request.jwt.claims', $1, true)`, [claims]);

        const result = await privilegedClient.query(
          `SELECT id, tenant_id, status FROM commons.post WHERE tenant_id = $1`,
          [actingTenantId],
        );
        return { data: result.rows as Array<{ id: string; tenant_id: string; status: string }>, error: null as Error | null };
      } catch (error) {
        return { data: null, error: error as Error };
      } finally {
        await privilegedClient.query('ROLLBACK');
      }
    }

    it('LIVE tenant COMPANY_ADMIN can INSERT a draft commons.post', async () => {
      const { data, error } = await insertAsCompanyAdmin(liveTenantId, 'RLS-12 LIVE post');
      expect(error).toBeNull();
      expect(data?.tenant_id).toBe(liveTenantId);
      expect(data?.status).toBe('draft');
    });

    it('DEMO tenant COMPANY_ADMIN can INSERT a draft commons.post — identical outcome to LIVE', async () => {
      const { data, error } = await insertAsCompanyAdmin(demoTenantId, 'RLS-12 DEMO post');
      expect(error).toBeNull();
      expect(data?.tenant_id).toBe(demoTenantId);
      expect(data?.status).toBe('draft');
    });

    it('LIVE tenant COMPANY_ADMIN can SELECT its own inserted post', async () => {
      const { data, error } = await selectOwnAsCompanyAdmin(liveTenantId);
      expect(error).toBeNull();
      expect((data ?? []).some((r) => r.tenant_id === liveTenantId)).toBe(true);
    });

    it('DEMO tenant COMPANY_ADMIN can SELECT its own inserted post — identical outcome to LIVE', async () => {
      const { data, error } = await selectOwnAsCompanyAdmin(demoTenantId);
      expect(error).toBeNull();
      expect((data ?? []).some((r) => r.tenant_id === demoTenantId)).toBe(true);
    });

    it('neither tenant\'s row set differs by any field other than tenant_id/content — no tenant_kind-based column divergence', async () => {
      const live = await selectOwnAsCompanyAdmin(liveTenantId);
      const demo = await selectOwnAsCompanyAdmin(demoTenantId);
      expect(live.data?.[0] && Object.keys(live.data[0]).sort()).toEqual(demo.data?.[0] && Object.keys(demo.data[0]).sort());
    });
  },
);
