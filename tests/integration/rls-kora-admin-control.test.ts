/**
 * RLS-06 — KORA_ADMIN Legitimate Cross-Tenant Access Control Test
 * (direct Postgres, local Supabase)
 *
 * WHAT THIS IS:
 *   A POSITIVE control, not a negative isolation test. RLS-03
 *   (tests/integration/rls-two-tenant-negative.test.ts) and RLS-05
 *   (tests/integration/rls-worker-isolation.test.ts) both prove a
 *   non-admin role CANNOT read rows it shouldn't. Taken alone, that kind of
 *   suite can become a false regression trap: if a future migration
 *   over-tightens a policy, RLS-03/05 keep passing (there's even less
 *   access now) while the legitimate KORA_ADMIN operator bypass silently
 *   breaks — service-assisted onboarding, cross-tenant support, and
 *   diagnostics all depend on that bypass working. This file proves the
 *   bypass is (a) present where intended and (b) still bounded away from
 *   worker-individual data, using the exact same direct-Postgres mechanism
 *   as RLS-03/05.
 *
 * TABLE SCOPE (chosen to reuse RLS-03's and RLS-05's already-vetted
 * fixtures/mechanism rather than introduce new fixture complexity):
 *   POSITIVE (KORA_ADMIN must see rows across BOTH synthetic tenants):
 *     analytics.tenant, analytics.source_batch, analytics.kora_index_result,
 *     analytics.activation_result — same four tables RLS-03 uses, this time
 *     with KORA_ADMIN claims instead of COMPANY_ADMIN claims, proving the
 *     `kora_admin_all_*` policies (supabase/migrations/001) still grant
 *     cross-tenant read, not just same-tenant read.
 *   BOUNDARY (KORA_ADMIN must see ZERO rows, proving the admin bypass does
 *   NOT silently cover worker-individual data):
 *     personal.worker_identity, personal.worker_pib — the same two tables
 *     RLS-05 uses. Migration 027_worker_individual_rls_refactor.sql DROPPED
 *     `worker_identity_kora_admin_all` and `worker_pib_kora_admin_all`
 *     specifically so KORA_ADMIN has NO direct RLS path to these tables —
 *     this test proves that removal is still in effect, live, not just
 *     documented in access-matrix.ts.
 *   OUT OF SCOPE for this sprint (deferred — would need more complex
 *   fixtures or aren't part of the "false regression trap" concern this
 *   sprint targets):
 *     analytics.uef_record — KORA_ADMIN access is via
 *     `fn_admin_uef_review()`/`fn_admin_uef_update_review()` SECURITY
 *     DEFINER functions only (migration 030), not a table RLS policy;
 *     exercising them needs a source_batch/UEF pipeline fixture.
 *     gov.budget_governance, audit.audit_log, network.partner_profile/
 *     partner_identity, commons.post/booking/contribution_event,
 *     personal.workforce_baseline/uploaded_record/worker_initiative/
 *     worker_participation/worker_cv_share/uploaded_record_attendee — all
 *     have their own `kora_admin_*` policies (unchanged by 027/030) but are
 *     not part of the specific tenant-vs-tenant / worker-vs-worker
 *     regression-trap concern RLS-06 was scoped to close this sprint.
 *
 * CLAIMS SHAPE:
 *   { "app_metadata": { "kora_role": "KORA_ADMIN" } } — no `kora_tenant_id`
 *   and no `sub` needed: every `kora_admin_all_*` policy in scope here is
 *   `USING (kora.kora_role() = 'KORA_ADMIN')` only, with no tenant or
 *   auth.uid() comparison (unlike COMPANY_ADMIN/WORKER policies).
 *
 * WHAT THIS DOES NOT PROVE:
 *   The `fn_admin_uef_review()` SECURITY DEFINER path, any table outside
 *   the four "positive" + two "boundary" tables above, GoTrue/Auth sign-in,
 *   PostgREST schema-exposure correctness, or browser/E2E behavior — same
 *   caveats as RLS-03/05.
 *
 * SAFETY MODEL (mirrors RLS-03/RLS-05 exactly):
 *   Skip-safe by default (RLS06_PG_URL + RLS06_ALLOW_RUN==='true', own env
 *   var pair, never shared with RLS03_* or RLS05_*). Always-on local-only /
 *   known-bad-project-ref guard, independent of RLS06_ALLOW_RUN. Own
 *   synthetic fixture (tenant_code RLS06-A/RLS06-B, worker_ref
 *   RLS06-WORKER, reporting_period RLS06-SYNTHETIC), created/torn down via
 *   the connection's own privileged (non-`authenticated`) role, exactly
 *   like RLS-03/05. No Supabase Auth user is created or needed.
 *
 * REQUIRED ENV VARS:
 *   RLS06_PG_URL     — local-only, same loopback-host guard as RLS-03/05.
 *                      Example only: postgresql://postgres:postgres@127.0.0.1:54322/postgres
 *   RLS06_ALLOW_RUN  — must be exactly 'true'.
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import pg from 'pg';

const { Client } = pg;

function readEnv(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim().length > 0 ? value : undefined;
}

interface Rls06Config {
  pgUrl: string;
}

function readRls06Config(): Rls06Config | null {
  const pgUrl = readEnv('RLS06_PG_URL');
  if (!pgUrl) return null;
  return { pgUrl };
}

function isRunExplicitlyAllowed(): boolean {
  return readEnv('RLS06_ALLOW_RUN') === 'true';
}

// Same denylist/allowlist as RLS-03/RLS-05.
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
        `RLS06_PG_URL matches a known staging/production project ref. This test must only ` +
          `ever target a local Postgres instance — refusing to proceed.`,
      );
    }
  }
  if (lower.includes('supabase.co') || lower.includes('supabase.com')) {
    throw new Error(
      `RLS06_PG_URL points at a hosted Supabase domain. This test must only target a local ` +
        `Postgres instance (confirm the correct URL via \`supabase status\`) — refusing to proceed.`,
    );
  }

  let hostname: string;
  try {
    hostname = new URL(pgUrl).hostname.toLowerCase();
  } catch {
    throw new Error('RLS06_PG_URL is not a valid connection URL — refusing to proceed.');
  }
  if (!ALLOWED_LOCAL_HOSTS.includes(hostname)) {
    throw new Error(
      `RLS06_PG_URL host "${hostname}" is not a recognized local address ` +
        `(${ALLOWED_LOCAL_HOSTS.join(', ')}). This test must only target a local Supabase ` +
        `Postgres instance — refusing to proceed.`,
    );
  }
}

describe('RLS-06 guard — RLS06_PG_URL must never be a known staging/production/hosted target', () => {
  it('RLS06_PG_URL (if set) is either unset or a local-only Postgres URL', () => {
    const pgUrl = readEnv('RLS06_PG_URL');
    if (!pgUrl) {
      expect(pgUrl).toBeUndefined();
      return;
    }
    expect(() => assertLocalPostgresOnly(pgUrl)).not.toThrow();
  });
});

const config = readRls06Config();
const allowed = isRunExplicitlyAllowed();
const ready = config !== null && allowed;

const RLS06_TENANT_CODES = ['RLS06-A', 'RLS06-B'] as const;
const RLS06_REPORTING_PERIOD = 'RLS06-SYNTHETIC';
const RLS06_ANALYTICS_TABLES = ['source_batch', 'kora_index_result', 'activation_result'] as const;
type Rls06AnalyticsTable = (typeof RLS06_ANALYTICS_TABLES)[number];

const RLS06_WORKER_REF = 'RLS06-WORKER';
const WORKER_AUTH_UID = '00000000-0000-4000-a000-000000000c03';

describe.skipIf(!ready)(
  'RLS-06 — KORA_ADMIN legitimate cross-tenant access, bounded away from worker-individual data (direct Postgres)',
  () => {
    let privilegedClient: InstanceType<typeof Client>;
    let tenantAId: string;
    let tenantBId: string;
    let workerId: string;

    beforeAll(async () => {
      if (!config) throw new Error('unreachable: beforeAll only runs when describe.skipIf(!ready) has already passed');
      assertLocalPostgresOnly(config.pgUrl);

      privilegedClient = new Client({ connectionString: config.pgUrl });
      await privilegedClient.connect();

      // ── Tenants (idempotent upsert, same pattern as RLS-03) ────────────
      const tenantAResult = await privilegedClient.query<{ id: string }>(
        `INSERT INTO analytics.tenant (tenant_code, company_name, tenant_kind)
         VALUES ($1, $2, 'TEST')
         ON CONFLICT (tenant_code) DO UPDATE SET company_name = EXCLUDED.company_name
         RETURNING id`,
        ['RLS06-A', 'RLS-06 Synthetic Tenant A'],
      );
      tenantAId = tenantAResult.rows[0].id;

      const tenantBResult = await privilegedClient.query<{ id: string }>(
        `INSERT INTO analytics.tenant (tenant_code, company_name, tenant_kind)
         VALUES ($1, $2, 'TEST')
         ON CONFLICT (tenant_code) DO UPDATE SET company_name = EXCLUDED.company_name
         RETURNING id`,
        ['RLS06-B', 'RLS-06 Synthetic Tenant B'],
      );
      tenantBId = tenantBResult.rows[0].id;

      // Clear any leftover rows from a prior incomplete run (own tags only).
      await privilegedClient.query(
        `DELETE FROM analytics.kora_index_result WHERE tenant_id = ANY($1) AND reporting_period = $2`,
        [[tenantAId, tenantBId], RLS06_REPORTING_PERIOD],
      );
      await privilegedClient.query(
        `DELETE FROM analytics.activation_result WHERE tenant_id = ANY($1) AND reporting_period = $2`,
        [[tenantAId, tenantBId], RLS06_REPORTING_PERIOD],
      );
      await privilegedClient.query(
        `DELETE FROM analytics.source_batch WHERE tenant_id = ANY($1) AND reporting_period = $2`,
        [[tenantAId, tenantBId], RLS06_REPORTING_PERIOD],
      );

      for (const tenantId of [tenantAId, tenantBId]) {
        await privilegedClient.query(
          `INSERT INTO analytics.source_batch (tenant_id, source_type, reporting_period)
           VALUES ($1, 'manual', $2)`,
          [tenantId, RLS06_REPORTING_PERIOD],
        );

        await privilegedClient.query(
          `INSERT INTO analytics.kora_index_result
             (tenant_id, reporting_period, methodology_version_id, kora_index_value,
              safeguard_status, calibration_status, is_current)
           VALUES ($1, $2, 'KORA Methodology v0.1', 50.0, 'CLEAR', 'pre_empirical_calibration', true)`,
          [tenantId, RLS06_REPORTING_PERIOD],
        );

        await privilegedClient.query(
          `INSERT INTO analytics.activation_result
             (tenant_id, reporting_period, methodology_version_id, calibration_status)
           VALUES ($1, $2, 'KORA Methodology v0.1', 'pre_empirical_calibration')`,
          [tenantId, RLS06_REPORTING_PERIOD],
        );
      }

      // ── Worker boundary fixture (same mechanism as RLS-05) ─────────────
      await privilegedClient.query(
        `DELETE FROM personal.worker_pib
         WHERE reporting_period = $1
           AND worker_identity_id IN (
             SELECT id FROM personal.worker_identity WHERE tenant_id = $2 AND worker_ref = $3
           )`,
        [RLS06_REPORTING_PERIOD, tenantAId, RLS06_WORKER_REF],
      );
      await privilegedClient.query(
        `DELETE FROM personal.worker_identity WHERE tenant_id = $1 AND worker_ref = $2`,
        [tenantAId, RLS06_WORKER_REF],
      );

      const workerResult = await privilegedClient.query<{ id: string }>(
        `INSERT INTO personal.worker_identity (tenant_id, auth_user_id, worker_ref, status)
         VALUES ($1, $2, $3, 'active')
         RETURNING id`,
        [tenantAId, WORKER_AUTH_UID, RLS06_WORKER_REF],
      );
      workerId = workerResult.rows[0].id;

      await privilegedClient.query(
        `INSERT INTO personal.worker_pib
           (worker_identity_id, reporting_period, pillar, iu_value, verification_status, source_kind)
         VALUES ($1, $2, 'GROWTH', 5.0, 'self_declared', 'worker_declared')`,
        [workerId, RLS06_REPORTING_PERIOD],
      );
    });

    afterAll(async () => {
      if (!privilegedClient) return;

      await privilegedClient.query(`DELETE FROM personal.worker_pib WHERE worker_identity_id = $1`, [workerId]);
      await privilegedClient.query(`DELETE FROM personal.worker_identity WHERE id = $1`, [workerId]);

      const tenantRows = await privilegedClient.query<{ id: string }>(
        `SELECT id FROM analytics.tenant WHERE tenant_code = ANY($1)`,
        [RLS06_TENANT_CODES as unknown as string[]],
      );
      const ids = tenantRows.rows.map((row) => row.id);

      if (ids.length > 0) {
        await privilegedClient.query(`DELETE FROM analytics.kora_index_result WHERE tenant_id = ANY($1)`, [ids]);
        await privilegedClient.query(`DELETE FROM analytics.activation_result WHERE tenant_id = ANY($1)`, [ids]);
        await privilegedClient.query(`DELETE FROM analytics.source_batch WHERE tenant_id = ANY($1)`, [ids]);
        await privilegedClient.query(`DELETE FROM analytics.tenant WHERE tenant_code = ANY($1)`, [
          RLS06_TENANT_CODES as unknown as string[],
        ]);
      }

      await privilegedClient.end();
    });

    // ── Shared helper — same transaction-per-call, always-rollback pattern
    // as RLS-03/05. KORA_ADMIN claims carry no tenant_id/sub — the policies
    // in scope here don't check either. ──────────────────────────────────
    async function queryAsKoraAdmin<T extends Record<string, unknown>>(
      schemaTable: string,
      whereClause: string,
      params: unknown[],
    ): Promise<{ data: T[] | null; error: Error | null }> {
      await privilegedClient.query('BEGIN');
      try {
        await privilegedClient.query('SET LOCAL ROLE authenticated');
        const claims = JSON.stringify({ app_metadata: { kora_role: 'KORA_ADMIN' } });
        await privilegedClient.query(`SELECT set_config('request.jwt.claims', $1, true)`, [claims]);

        const result = await privilegedClient.query<T>(
          `SELECT * FROM ${schemaTable} WHERE ${whereClause}`,
          params,
        );
        return { data: result.rows, error: null };
      } catch (error) {
        return { data: null, error: error as Error };
      } finally {
        await privilegedClient.query('ROLLBACK');
      }
    }

    describe('positive control — cross-tenant admin access on analytics.*', () => {
      it('KORA_ADMIN can read analytics.tenant row for Tenant A', async () => {
        const { data, error } = await queryAsKoraAdmin('analytics.tenant', 'id = $1', [tenantAId]);
        expect(error).toBeNull();
        expect(data?.length ?? 0).toBe(1);
      });

      it('KORA_ADMIN can read analytics.tenant row for Tenant B', async () => {
        const { data, error } = await queryAsKoraAdmin('analytics.tenant', 'id = $1', [tenantBId]);
        expect(error).toBeNull();
        expect(data?.length ?? 0).toBe(1);
      });

      for (const table of RLS06_ANALYTICS_TABLES) {
        it(`KORA_ADMIN can read Tenant A analytics.${table} rows`, async () => {
          const { data, error } = await queryAsKoraAdmin(`analytics.${table}`, 'tenant_id = $1', [tenantAId]);
          expect(error).toBeNull();
          expect(data?.length ?? 0).toBeGreaterThan(0);
        });

        it(`KORA_ADMIN can read Tenant B analytics.${table} rows (cross-tenant, unlike COMPANY_ADMIN)`, async () => {
          const { data, error } = await queryAsKoraAdmin(`analytics.${table}`, 'tenant_id = $1', [tenantBId]);
          expect(error).toBeNull();
          expect(data?.length ?? 0).toBeGreaterThan(0);
        });
      }
    });

    describe('boundary control — KORA_ADMIN remains denied on worker-individual data', () => {
      it('KORA_ADMIN cannot read the worker_identity row (migration 027 removed this policy)', async () => {
        const { data, error } = await queryAsKoraAdmin('personal.worker_identity', 'id = $1', [workerId]);
        // A real RLS block surfaces as zero rows, not a query error.
        expect(error).toBeNull();
        expect(data?.length ?? 0).toBe(0);
      });

      it('KORA_ADMIN cannot read worker_pib rows (migration 027 removed this policy)', async () => {
        const { data, error } = await queryAsKoraAdmin('personal.worker_pib', 'worker_identity_id = $1', [workerId]);
        expect(error).toBeNull();
        expect(data?.length ?? 0).toBe(0);
      });
    });
  },
);
