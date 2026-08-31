/**
 * RLS-11 — Commons cross-company discovery DB test (direct Postgres, local Supabase)
 *
 * WHAT THIS IS:
 *   A LIVE proof that commons.post's cross-tenant WORKER visibility (added by
 *   migration 024_commons_initiative_fields.sql, CC-052's own reason for
 *   existing) behaves exactly as designed: a WORKER can discover an
 *   opening_grade='cross_company' published post belonging to a DIFFERENT
 *   tenant, but cannot discover a company_internal post from that same
 *   other tenant, and a positive control proves a WORKER can always see
 *   their own tenant's published posts regardless of opening_grade. This is
 *   the "dedicated test" tests/integration/rls-two-tenant-negative.test.ts's
 *   own header explicitly deferred ("commons.post has a deliberate
 *   cross-tenant WORKER policy — needs its own dedicated test").
 *
 * WHY A SEPARATE TEST, NOT AN ADDITION TO RLS-03:
 *   RLS-03 is explicitly scoped to analytics.* tables with a uniform
 *   tenant-only isolation model. commons.post's cross-tenant WORKER policy
 *   is qualitatively different (opening_grade-gated, not tenant-gated) and
 *   deserves its own fixture/assertions rather than overloading RLS-03's
 *   table list or claims shape.
 *
 * SAME SAFETY MODEL AS RLS-03 (see that file's header for the full
 * rationale — summarized here, not re-derived):
 *   - Skip-safe by default: everything lives inside describe.skipIf(!ready),
 *     ready requires RLS11_PG_URL set AND RLS11_ALLOW_RUN==='true'.
 *   - An always-on static guard hard-blocks known staging/production
 *     project refs and any hosted Supabase domain, and requires a loopback
 *     host, independent of RLS11_ALLOW_RUN.
 *   - Fixture setup/teardown uses a privileged (non-`authenticated`)
 *     connection role, which naturally bypasses RLS; every actual assertion
 *     opens its own transaction, switches to `SET LOCAL ROLE authenticated`,
 *     fabricates the request.jwt.claims GUC, queries, then always rolls
 *     back.
 *   - Teardown is scoped strictly to this test's own tenant_code values.
 *
 * REQUIRED ENV VARS:
 *   RLS11_PG_URL     — direct Postgres connection string, local Supabase
 *                      only (see the loopback-host guard below). Confirm
 *                      the real value via `supabase status`, e.g.:
 *                        postgresql://postgres:postgres@127.0.0.1:54322/postgres
 *   RLS11_ALLOW_RUN  — must be exactly 'true'.
 *   Both live only in a gitignored local env file — never committed.
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import pg from 'pg';

const { Client } = pg;

function readEnv(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim().length > 0 ? value : undefined;
}

interface Rls11Config {
  pgUrl: string;
}

function readRls11Config(): Rls11Config | null {
  const pgUrl = readEnv('RLS11_PG_URL');
  if (!pgUrl) return null;
  return { pgUrl };
}

function isRunExplicitlyAllowed(): boolean {
  return readEnv('RLS11_ALLOW_RUN') === 'true';
}

// ── Hard denylist + local-only allowlist — identical policy to RLS-03 ───────
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
        `RLS11_PG_URL matches a known staging/production project ref. This test must only ` +
          `ever target a local Postgres instance — refusing to proceed.`,
      );
    }
  }
  if (lower.includes('supabase.co') || lower.includes('supabase.com')) {
    throw new Error(
      `RLS11_PG_URL points at a hosted Supabase domain. This test must only target a local ` +
        `Postgres instance (confirm the correct URL via \`supabase status\`) — refusing to proceed.`,
    );
  }

  let hostname: string;
  try {
    hostname = new URL(pgUrl).hostname.toLowerCase();
  } catch {
    throw new Error('RLS11_PG_URL is not a valid connection URL — refusing to proceed.');
  }
  if (!ALLOWED_LOCAL_HOSTS.includes(hostname)) {
    throw new Error(
      `RLS11_PG_URL host "${hostname}" is not a recognized local address ` +
        `(${ALLOWED_LOCAL_HOSTS.join(', ')}). This test must only target a local Supabase ` +
        `Postgres instance — refusing to proceed.`,
    );
  }
}

describe('RLS-11 guard — RLS11_PG_URL must never be a known staging/production/hosted target', () => {
  it('RLS11_PG_URL (if set) is either unset or a local-only Postgres URL', () => {
    const pgUrl = readEnv('RLS11_PG_URL');
    if (!pgUrl) {
      expect(pgUrl).toBeUndefined();
      return;
    }
    expect(() => assertLocalPostgresOnly(pgUrl)).not.toThrow();
  });
});

const config = readRls11Config();
const allowed = isRunExplicitlyAllowed();
const ready = config !== null && allowed;

const RLS11_TENANT_CODES = ['RLS11-A', 'RLS11-B'] as const;

describe.skipIf(!ready)(
  'RLS-11 — Commons cross-company discovery (migration 024 worker_cross_company_select)',
  () => {
    let privilegedClient: InstanceType<typeof Client>;
    let tenantAId: string;
    let tenantBId: string;
    let crossCompanyPostId: string;
    let internalPostId: string;
    let tenantAOwnPublishedId: string;

    beforeAll(async () => {
      if (!config) throw new Error('unreachable: beforeAll only runs when describe.skipIf(!ready) has already passed');
      assertLocalPostgresOnly(config.pgUrl);

      privilegedClient = new Client({ connectionString: config.pgUrl });
      await privilegedClient.connect();

      const tenantAResult = await privilegedClient.query<{ id: string }>(
        `INSERT INTO analytics.tenant (tenant_code, company_name, tenant_kind)
         VALUES ($1, $2, 'TEST')
         ON CONFLICT (tenant_code) DO UPDATE SET company_name = EXCLUDED.company_name
         RETURNING id`,
        ['RLS11-A', 'RLS-11 Synthetic Tenant A'],
      );
      tenantAId = tenantAResult.rows[0].id;

      const tenantBResult = await privilegedClient.query<{ id: string }>(
        `INSERT INTO analytics.tenant (tenant_code, company_name, tenant_kind)
         VALUES ($1, $2, 'TEST')
         ON CONFLICT (tenant_code) DO UPDATE SET company_name = EXCLUDED.company_name
         RETURNING id`,
        ['RLS11-B', 'RLS-11 Synthetic Tenant B'],
      );
      tenantBId = tenantBResult.rows[0].id;

      // Clean any leftover rows from a prior incomplete run.
      await privilegedClient.query(`DELETE FROM commons.post WHERE tenant_id = ANY($1)`, [[tenantAId, tenantBId]]);

      // Tenant A: a published, cross_company initiative — the row this test exists to prove is discoverable.
      const crossCompanyResult = await privilegedClient.query<{ id: string }>(
        `INSERT INTO commons.post (tenant_id, author_role, title, body, category, status, pillar, opening_grade, capacity_cross)
         VALUES ($1, 'COMPANY_ADMIN', 'RLS-11 cross-company initiative', 'body', 'event', 'published', 'IMPACT', 'cross_company', 10)
         RETURNING id`,
        [tenantAId],
      );
      crossCompanyPostId = crossCompanyResult.rows[0].id;

      // Tenant A: a published, company_internal post — negative control (must NOT be visible to Tenant B).
      const internalResult = await privilegedClient.query<{ id: string }>(
        `INSERT INTO commons.post (tenant_id, author_role, title, body, category, status, pillar, opening_grade)
         VALUES ($1, 'COMPANY_ADMIN', 'RLS-11 internal-only initiative', 'body', 'event', 'published', 'IMPACT', 'company_internal')
         RETURNING id`,
        [tenantAId],
      );
      internalPostId = internalResult.rows[0].id;

      // Tenant A: a second published post with NO opening_grade (generic post, not an initiative) — Tenant A's own worker must still see it via the tenant-scoped policy (mig 013).
      const ownPublishedResult = await privilegedClient.query<{ id: string }>(
        `INSERT INTO commons.post (tenant_id, author_role, title, body, category, status)
         VALUES ($1, 'COMPANY_ADMIN', 'RLS-11 own-tenant generic post', 'body', 'announcement', 'published')
         RETURNING id`,
        [tenantAId],
      );
      tenantAOwnPublishedId = ownPublishedResult.rows[0].id;
    });

    afterAll(async () => {
      if (!privilegedClient) return;

      const tenantRows = await privilegedClient.query<{ id: string }>(
        `SELECT id FROM analytics.tenant WHERE tenant_code = ANY($1)`,
        [RLS11_TENANT_CODES as unknown as string[]],
      );
      const ids = tenantRows.rows.map((row) => row.id);

      if (ids.length > 0) {
        await privilegedClient.query(`DELETE FROM commons.post WHERE tenant_id = ANY($1)`, [ids]);
        await privilegedClient.query(`DELETE FROM analytics.tenant WHERE tenant_code = ANY($1)`, [
          RLS11_TENANT_CODES as unknown as string[],
        ]);
      }

      await privilegedClient.end();
    });

    async function queryAsWorker(actingTenantId: string) {
      await privilegedClient.query('BEGIN');
      try {
        await privilegedClient.query('SET LOCAL ROLE authenticated');
        const claims = JSON.stringify({
          app_metadata: { kora_role: 'WORKER', kora_tenant_id: actingTenantId },
        });
        await privilegedClient.query(`SELECT set_config('request.jwt.claims', $1, true)`, [claims]);

        const result = await privilegedClient.query(
          `SELECT id, tenant_id, opening_grade FROM commons.post WHERE status = 'published' ORDER BY id`,
        );
        return { data: result.rows as Array<{ id: string; tenant_id: string; opening_grade: string | null }>, error: null as Error | null };
      } catch (error) {
        return { data: null, error: error as Error };
      } finally {
        await privilegedClient.query('ROLLBACK');
      }
    }

    it('Tenant B WORKER can discover Tenant A\'s cross_company published post', async () => {
      const { data, error } = await queryAsWorker(tenantBId);
      expect(error).toBeNull();
      const ids = (data ?? []).map((r) => r.id);
      expect(ids).toContain(crossCompanyPostId);
    });

    it('Tenant B WORKER cannot discover Tenant A\'s company_internal post', async () => {
      const { data, error } = await queryAsWorker(tenantBId);
      expect(error).toBeNull();
      const ids = (data ?? []).map((r) => r.id);
      expect(ids).not.toContain(internalPostId);
    });

    it('Tenant B WORKER cannot discover Tenant A\'s own-tenant generic (no opening_grade) post', async () => {
      const { data, error } = await queryAsWorker(tenantBId);
      expect(error).toBeNull();
      const ids = (data ?? []).map((r) => r.id);
      expect(ids).not.toContain(tenantAOwnPublishedId);
    });

    it('Tenant A WORKER (positive control) sees all three of its own published posts, cross-company included', async () => {
      const { data, error } = await queryAsWorker(tenantAId);
      expect(error).toBeNull();
      const ids = (data ?? []).map((r) => r.id);
      expect(ids).toEqual(expect.arrayContaining([crossCompanyPostId, internalPostId, tenantAOwnPublishedId]));
    });

    it('the discovery response never includes individual booking/participant rows — only post-level columns', async () => {
      const { data, error } = await queryAsWorker(tenantBId);
      expect(error).toBeNull();
      for (const row of data ?? []) {
        const keys = Object.keys(row);
        expect(keys).toEqual(expect.arrayContaining(['id', 'tenant_id', 'opening_grade']));
        expect(keys).not.toContain('worker_id');
        expect(keys).not.toContain('author_id');
      }
    });
  },
);
