/**
 * RLS-07 — Worker Own-Participation Initiative Visibility DB Test
 * (direct Postgres, local Supabase)
 *
 * WHAT THIS IS:
 *   A LIVE proof of the RLS policy added by migration 045
 *   (045_worker_initiative_own_participation_rls.sql, PILOT-TRUST-01 FASE 5).
 *   The only pre-existing SELECT policy on personal.worker_initiative
 *   (migration 008, "worker_initiative_worker_published_select") restricts
 *   WORKER visibility to `status = 'published'`. Three read paths in
 *   app/worker/workspace/page.tsx and app/worker/dynamic-cv/print/page.tsx
 *   embed worker_initiative through worker_participation to show a worker's
 *   own PAST activity — once an initiative transitions to `status = 'closed'`
 *   (a normal lifecycle transition), the plain session client would silently
 *   drop that initiative's title/pillar from the embedded join. Migration 045
 *   adds an ADDITIVE policy: a WORKER may also read a worker_initiative row,
 *   regardless of status, if it is referenced by one of their OWN
 *   worker_participation rows.
 *
 * RELATIONSHIP TO RLS-03/05/06:
 *   Same direct-Postgres, claims-simulation mechanism as RLS-03/05/06 (see
 *   those files' headers for the full rationale). This file is scoped
 *   specifically to the new migration-045 policy — it does not re-prove
 *   tenant isolation (RLS-03) or the pre-existing published-only policy
 *   (implicitly exercised as a positive control below, not the focus).
 *
 * WHAT THIS PROVES:
 *   - A worker CAN read a CLOSED initiative they personally participated in
 *     (the new policy).
 *   - A worker CANNOT read a CLOSED initiative another worker (same tenant)
 *     participated in, that they themselves never participated in (the new
 *     policy does not leak across workers).
 *   - The pre-existing published-only policy still grants access to a
 *     published initiative regardless of participation (regression check —
 *     migration 045 is additive, must not have narrowed the existing grant).
 *   - COMPANY_ADMIN, PARTNER, and anon claims get zero rows from this table
 *     (no other policy on personal.worker_initiative grants them anything —
 *     migration 008 explicitly has none for those roles).
 *   - The policy's own `tenant_id = kora.tenant_id()` clause is not dead
 *     code: a claim with a mismatched kora_tenant_id is denied even though
 *     the auth_user_id/participation subquery would otherwise match.
 *
 * WHAT THIS DOES NOT PROVE:
 *   GoTrue/Supabase Auth sign-in (claims simulated via transaction-local
 *   GUCs); general cross-tenant isolation on other tables (RLS-03's job);
 *   KORA_ADMIN access to this table (unaffected by migration 045, already
 *   unconditional via "worker_initiative_kora_admin_all", not re-proven
 *   here); disabled-worker denial (this codebase enforces
 *   worker_identity.status/kora_status at the application layer —
 *   requireWorkerUser() — not at the RLS layer, consistently across every
 *   worker-owned table, including this one and the pre-existing
 *   worker_identity/worker_profile_private/worker_participation policies —
 *   verified by inspection, not a gap specific to migration 045).
 *
 * SAFETY MODEL (identical to RLS-03/05/06 — read those files if unfamiliar):
 *   - Fully skip-safe: everything lives inside `describe.skipIf(!ready)`,
 *     where `ready` requires RLS07_PG_URL to be set AND RLS07_ALLOW_RUN to
 *     be exactly 'true'.
 *   - A separate, ALWAYS-ON guard hard-blocks known staging/production
 *     project refs and any hosted Supabase domain, and requires a loopback
 *     host, independent of RLS07_ALLOW_RUN.
 *   - Uses ONLY RLS07_PG_URL / RLS07_ALLOW_RUN.
 *   - Creates and tears down its own fixture data (1 synthetic tenant
 *     tagged tenant_kind='TEST', tenant_code 'RLS07-TENANT'; two synthetic
 *     workers RLS07-WORKER-A/B; three initiatives; participation rows),
 *     scoped strictly to this file's own tags.
 *
 * REQUIRED ENV VARS:
 *   RLS07_PG_URL     — a direct Postgres connection string to a LOCAL
 *                      Supabase instance only (see the loopback-host guard
 *                      below). Confirm via `supabase status`:
 *                        postgresql://postgres:postgres@127.0.0.1:54322/postgres
 *   RLS07_ALLOW_RUN  — must be exactly 'true'.
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import pg from 'pg';

const { Client } = pg;

function readEnv(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim().length > 0 ? value : undefined;
}

interface Rls07Config {
  pgUrl: string;
}

function readRls07Config(): Rls07Config | null {
  const pgUrl = readEnv('RLS07_PG_URL');
  if (!pgUrl) return null;
  return { pgUrl };
}

function isRunExplicitlyAllowed(): boolean {
  return readEnv('RLS07_ALLOW_RUN') === 'true';
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
        `RLS07_PG_URL matches a known staging/production project ref. This test must only ` +
          `ever target a local Postgres instance — refusing to proceed.`,
      );
    }
  }
  if (lower.includes('supabase.co') || lower.includes('supabase.com')) {
    throw new Error(
      `RLS07_PG_URL points at a hosted Supabase domain. This test must only target a local ` +
        `Postgres instance (confirm the correct URL via \`supabase status\`) — refusing to proceed.`,
    );
  }

  let hostname: string;
  try {
    hostname = new URL(pgUrl).hostname.toLowerCase();
  } catch {
    throw new Error('RLS07_PG_URL is not a valid connection URL — refusing to proceed.');
  }
  if (!ALLOWED_LOCAL_HOSTS.includes(hostname)) {
    throw new Error(
      `RLS07_PG_URL host "${hostname}" is not a recognized local address ` +
        `(${ALLOWED_LOCAL_HOSTS.join(', ')}). This test must only target a local Supabase ` +
        `Postgres instance — refusing to proceed.`,
    );
  }
}

describe('RLS-07 guard — RLS07_PG_URL must never be a known staging/production/hosted target', () => {
  it('RLS07_PG_URL (if set) is either unset or a local-only Postgres URL', () => {
    const pgUrl = readEnv('RLS07_PG_URL');
    if (!pgUrl) {
      expect(pgUrl).toBeUndefined();
      return;
    }
    expect(() => assertLocalPostgresOnly(pgUrl)).not.toThrow();
  });
});

const config = readRls07Config();
const allowed = isRunExplicitlyAllowed();
const ready = config !== null && allowed;

const RLS07_TENANT_CODE = 'RLS07-TENANT';
const RLS07_WORKER_REFS = ['RLS07-WORKER-A', 'RLS07-WORKER-B'] as const;
const RLS07_INITIATIVE_TITLES = {
  published: 'RLS07 Published Initiative',
  closedOwnA: 'RLS07 Closed Initiative (Worker A own participation)',
  closedOwnB: 'RLS07 Closed Initiative (Worker B own participation)',
} as const;

const WORKER_A_AUTH_UID = '00000000-0000-4000-a000-000000000a07';
const WORKER_B_AUTH_UID = '00000000-0000-4000-a000-000000000b07';

describe.skipIf(!ready)(
  'RLS-07 — worker own-participation initiative visibility (migration 045; direct Postgres)',
  () => {
    let privilegedClient: InstanceType<typeof Client>;
    let tenantId: string;
    let workerAId: string;
    let workerBId: string;
    let publishedInitiativeId: string;
    let closedOwnAInitiativeId: string;
    let closedOwnBInitiativeId: string;

    async function cleanupOwnFixtures() {
      const titles = Object.values(RLS07_INITIATIVE_TITLES);
      await privilegedClient.query(
        `DELETE FROM personal.worker_participation
         WHERE initiative_id IN (SELECT id FROM personal.worker_initiative WHERE title = ANY($1))`,
        [titles],
      );
      await privilegedClient.query(`DELETE FROM personal.worker_initiative WHERE title = ANY($1)`, [titles]);
      await privilegedClient.query(
        `DELETE FROM personal.worker_identity WHERE worker_ref = ANY($1)`,
        [RLS07_WORKER_REFS as unknown as string[]],
      );
      await privilegedClient.query(`DELETE FROM analytics.tenant WHERE tenant_code = $1`, [RLS07_TENANT_CODE]);
    }

    beforeAll(async () => {
      if (!config) throw new Error('unreachable: beforeAll only runs when describe.skipIf(!ready) has already passed');
      assertLocalPostgresOnly(config.pgUrl);

      privilegedClient = new Client({ connectionString: config.pgUrl });
      await privilegedClient.connect();

      await cleanupOwnFixtures(); // clear any leftover rows from a prior interrupted run

      const tenantResult = await privilegedClient.query<{ id: string }>(
        `INSERT INTO analytics.tenant (tenant_code, company_name, tenant_kind)
         VALUES ($1, $2, 'TEST') RETURNING id`,
        [RLS07_TENANT_CODE, 'RLS-07 Synthetic Tenant'],
      );
      tenantId = tenantResult.rows[0].id;

      const workerA = await privilegedClient.query<{ id: string }>(
        `INSERT INTO personal.worker_identity (tenant_id, auth_user_id, worker_ref, status)
         VALUES ($1, $2, $3, 'active') RETURNING id`,
        [tenantId, WORKER_A_AUTH_UID, RLS07_WORKER_REFS[0]],
      );
      workerAId = workerA.rows[0].id;

      const workerB = await privilegedClient.query<{ id: string }>(
        `INSERT INTO personal.worker_identity (tenant_id, auth_user_id, worker_ref, status)
         VALUES ($1, $2, $3, 'active') RETURNING id`,
        [tenantId, WORKER_B_AUTH_UID, RLS07_WORKER_REFS[1]],
      );
      workerBId = workerB.rows[0].id;

      const published = await privilegedClient.query<{ id: string }>(
        `INSERT INTO personal.worker_initiative (tenant_id, title, pillar, status)
         VALUES ($1, $2, 'GROWTH', 'published') RETURNING id`,
        [tenantId, RLS07_INITIATIVE_TITLES.published],
      );
      publishedInitiativeId = published.rows[0].id;

      const closedOwnA = await privilegedClient.query<{ id: string }>(
        `INSERT INTO personal.worker_initiative (tenant_id, title, pillar, status)
         VALUES ($1, $2, 'GROWTH', 'closed') RETURNING id`,
        [tenantId, RLS07_INITIATIVE_TITLES.closedOwnA],
      );
      closedOwnAInitiativeId = closedOwnA.rows[0].id;

      const closedOwnB = await privilegedClient.query<{ id: string }>(
        `INSERT INTO personal.worker_initiative (tenant_id, title, pillar, status)
         VALUES ($1, $2, 'GROWTH', 'closed') RETURNING id`,
        [tenantId, RLS07_INITIATIVE_TITLES.closedOwnB],
      );
      closedOwnBInitiativeId = closedOwnB.rows[0].id;

      // Worker A participated in the published initiative and their own closed one.
      await privilegedClient.query(
        `INSERT INTO personal.worker_participation (tenant_id, worker_id, initiative_id, status)
         VALUES ($1, $2, $3, 'attended'), ($1, $2, $4, 'attended')`,
        [tenantId, workerAId, publishedInitiativeId, closedOwnAInitiativeId],
      );
      // Worker B participated only in their own closed initiative.
      await privilegedClient.query(
        `INSERT INTO personal.worker_participation (tenant_id, worker_id, initiative_id, status)
         VALUES ($1, $2, $3, 'attended')`,
        [tenantId, workerBId, closedOwnBInitiativeId],
      );
    });

    afterAll(async () => {
      if (!privilegedClient) return;
      await cleanupOwnFixtures();
      await privilegedClient.end();
    });

    async function readInitiativeAs(actingAuthUid: string, initiativeId: string) {
      await privilegedClient.query('BEGIN');
      try {
        await privilegedClient.query('SET LOCAL ROLE authenticated');
        const claims = JSON.stringify({
          sub: actingAuthUid,
          app_metadata: { kora_role: 'WORKER', kora_tenant_id: tenantId },
        });
        await privilegedClient.query(`SELECT set_config('request.jwt.claims', $1, true)`, [claims]);

        const result = await privilegedClient.query(
          `SELECT id, title, status FROM personal.worker_initiative WHERE id = $1`,
          [initiativeId],
        );
        return { data: result.rows, error: null as Error | null };
      } catch (error) {
        return { data: null, error: error as Error };
      } finally {
        await privilegedClient.query('ROLLBACK');
      }
    }

    /** Same as readInitiativeAs but with an explicit, overridden role/tenant claim
     * — used to prove the policy's own AND conditions (role, tenant), not just
     * the happy path. */
    async function readInitiativeWithClaims(
      actingAuthUid: string,
      initiativeId: string,
      claimOverrides: { kora_role?: string; kora_tenant_id?: string | null },
    ) {
      await privilegedClient.query('BEGIN');
      try {
        await privilegedClient.query('SET LOCAL ROLE authenticated');
        const claims = JSON.stringify({
          sub: actingAuthUid,
          app_metadata: { kora_role: 'WORKER', kora_tenant_id: tenantId, ...claimOverrides },
        });
        await privilegedClient.query(`SELECT set_config('request.jwt.claims', $1, true)`, [claims]);

        const result = await privilegedClient.query(
          `SELECT id, title, status FROM personal.worker_initiative WHERE id = $1`,
          [initiativeId],
        );
        return { data: result.rows, error: null as Error | null };
      } catch (error) {
        return { data: null, error: error as Error };
      } finally {
        await privilegedClient.query('ROLLBACK');
      }
    }

    it('Worker A CAN read a CLOSED initiative they personally participated in (migration 045)', async () => {
      const { data, error } = await readInitiativeAs(WORKER_A_AUTH_UID, closedOwnAInitiativeId);
      expect(error).toBeNull();
      expect(data?.length ?? 0).toBe(1);
    });

    it('Worker B CAN read a CLOSED initiative they personally participated in (migration 045)', async () => {
      const { data, error } = await readInitiativeAs(WORKER_B_AUTH_UID, closedOwnBInitiativeId);
      expect(error).toBeNull();
      expect(data?.length ?? 0).toBe(1);
    });

    it('Worker A CANNOT read a CLOSED initiative only Worker B participated in (no cross-worker leak)', async () => {
      const { data, error } = await readInitiativeAs(WORKER_A_AUTH_UID, closedOwnBInitiativeId);
      expect(error).toBeNull();
      expect(data?.length ?? 0).toBe(0);
    });

    it('Worker B CANNOT read a CLOSED initiative only Worker A participated in (no cross-worker leak)', async () => {
      const { data, error } = await readInitiativeAs(WORKER_B_AUTH_UID, closedOwnAInitiativeId);
      expect(error).toBeNull();
      expect(data?.length ?? 0).toBe(0);
    });

    it('Worker A can still read the PUBLISHED initiative regardless of participation (pre-existing migration-008 policy, unaffected regression check)', async () => {
      const { data, error } = await readInitiativeAs(WORKER_A_AUTH_UID, publishedInitiativeId);
      expect(error).toBeNull();
      expect(data?.length ?? 0).toBe(1);
    });

    it('Worker B (never participated in the published initiative) can still read it via the published-only policy', async () => {
      const { data, error } = await readInitiativeAs(WORKER_B_AUTH_UID, publishedInitiativeId);
      expect(error).toBeNull();
      expect(data?.length ?? 0).toBe(1);
    });

    it('a claim with kora_role=COMPANY_ADMIN cannot read Worker A\'s own CLOSED initiative via this table at all (no other policy grants it)', async () => {
      const { data, error } = await readInitiativeWithClaims(WORKER_A_AUTH_UID, closedOwnAInitiativeId, {
        kora_role: 'COMPANY_ADMIN',
      });
      expect(error).toBeNull();
      expect(data?.length ?? 0).toBe(0);
    });

    it('a claim with kora_role=PARTNER cannot read Worker A\'s own CLOSED initiative via this table at all', async () => {
      const { data, error } = await readInitiativeWithClaims(WORKER_A_AUTH_UID, closedOwnAInitiativeId, {
        kora_role: 'PARTNER',
      });
      expect(error).toBeNull();
      expect(data?.length ?? 0).toBe(0);
    });

    it('anon (no role claim at all) cannot read Worker A\'s own CLOSED initiative via this table', async () => {
      await privilegedClient.query('BEGIN');
      try {
        await privilegedClient.query('SET LOCAL ROLE anon');
        await privilegedClient.query(`SELECT set_config('request.jwt.claims', '{}', true)`);
        const result = await privilegedClient.query(
          `SELECT id FROM personal.worker_initiative WHERE id = $1`,
          [closedOwnAInitiativeId],
        );
        expect(result.rows.length).toBe(0);
      } catch (error) {
        // A real anon attempt may surface as a permission-denied query error
        // instead of an empty result, depending on table-level GRANTs — either
        // outcome proves anon cannot read the row.
        expect(/permission denied/i.test((error as Error).message)).toBe(true);
      } finally {
        await privilegedClient.query('ROLLBACK');
      }
    });

    it('the explicit tenant_id check in migration 045 independently blocks a claim whose kora_tenant_id does not match, even though the auth_user_id/participation match would otherwise pass (defense in depth, not dead code)', async () => {
      const otherTenant = await privilegedClient.query<{ id: string }>(
        `INSERT INTO analytics.tenant (tenant_code, company_name, tenant_kind)
         VALUES ('RLS07-OTHER-TENANT', 'RLS-07 Other Synthetic Tenant', 'TEST')
         ON CONFLICT (tenant_code) DO UPDATE SET company_name = EXCLUDED.company_name
         RETURNING id`,
      );
      try {
        const { data, error } = await readInitiativeWithClaims(WORKER_A_AUTH_UID, closedOwnAInitiativeId, {
          kora_tenant_id: otherTenant.rows[0].id,
        });
        expect(error).toBeNull();
        expect(data?.length ?? 0).toBe(0);
      } finally {
        await privilegedClient.query(`DELETE FROM analytics.tenant WHERE tenant_code = 'RLS07-OTHER-TENANT'`);
      }
    });
  },
);
