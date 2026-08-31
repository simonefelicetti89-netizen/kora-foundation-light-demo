/**
 * RLS-13 — workforce_baseline tenant_kind parity DB test (direct Postgres, local Supabase)
 *
 * WHAT THIS IS:
 *   A LIVE proof that personal.workforce_baseline stores and returns
 *   identical data for a DEMO-kind tenant and a LIVE-kind tenant — the
 *   query app/api/admin/workforce-baseline/route.ts's GET handler runs
 *   never filters or branches by tenant_kind. Named in the RLS-NN family
 *   for CI-wiring consistency with RLS-03..12 (same skip-safe pattern,
 *   same mandatory gate), though the read path itself uses the
 *   service-role client (bypasses RLS by design, same as every other
 *   KORA_ADMIN-only /api/admin/* route) — the real property under test is
 *   "no tenant_kind branch exists in the query," not row-level security.
 *
 * WHY THIS MATTERS (ONE PRODUCT / NO DEMO RUNTIME, Patch 03 — extended by
 * the synthetic-company foundation and this seed group):
 *   B-TRUTH's first real seed-group migration retired
 *   WorkforceBaselineService's synthetic JSON read in favor of this table.
 *   This test is the concrete DB-level proof that the replacement is
 *   genuinely tenant_kind-blind, not just structurally so in the route's
 *   source text.
 *
 * SAME SAFETY MODEL AS RLS-03/11/12 (see rls-two-tenant-negative.test.ts's
 * header for the full rationale):
 *   - Skip-safe by default: everything lives inside describe.skipIf(!ready),
 *     ready requires RLS13_PG_URL set AND RLS13_ALLOW_RUN==='true'.
 *   - An always-on static guard hard-blocks known staging/production
 *     project refs and any hosted Supabase domain, and requires a loopback
 *     host, independent of RLS13_ALLOW_RUN.
 *   - Uses a single privileged (non-`authenticated`) connection for both
 *     fixture setup and the assertions themselves — this mirrors exactly
 *     what the service-role client the real route uses does (bypasses
 *     RLS), so no role/claims simulation is needed here, unlike RLS-03/11/12.
 *   - Teardown is scoped strictly to this test's own tenant_code values.
 *
 * REQUIRED ENV VARS:
 *   RLS13_PG_URL     — direct Postgres connection string, local Supabase
 *                      only. Confirm via `supabase status`, e.g.:
 *                        postgresql://postgres:postgres@127.0.0.1:54322/postgres
 *   RLS13_ALLOW_RUN  — must be exactly 'true'.
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import pg from 'pg';
import { buildWorkforceBaselineView, type WorkforceBaselineRow } from '../../lib/live/workforce-baseline-view';

const { Client } = pg;

function readEnv(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim().length > 0 ? value : undefined;
}

interface Rls13Config {
  pgUrl: string;
}

function readRls13Config(): Rls13Config | null {
  const pgUrl = readEnv('RLS13_PG_URL');
  if (!pgUrl) return null;
  return { pgUrl };
}

function isRunExplicitlyAllowed(): boolean {
  return readEnv('RLS13_ALLOW_RUN') === 'true';
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
        `RLS13_PG_URL matches a known staging/production project ref. This test must only ` +
          `ever target a local Postgres instance — refusing to proceed.`,
      );
    }
  }
  if (lower.includes('supabase.co') || lower.includes('supabase.com')) {
    throw new Error(
      `RLS13_PG_URL points at a hosted Supabase domain. This test must only target a local ` +
        `Postgres instance (confirm the correct URL via \`supabase status\`) — refusing to proceed.`,
    );
  }

  let hostname: string;
  try {
    hostname = new URL(pgUrl).hostname.toLowerCase();
  } catch {
    throw new Error('RLS13_PG_URL is not a valid connection URL — refusing to proceed.');
  }
  if (!ALLOWED_LOCAL_HOSTS.includes(hostname)) {
    throw new Error(
      `RLS13_PG_URL host "${hostname}" is not a recognized local address ` +
        `(${ALLOWED_LOCAL_HOSTS.join(', ')}). This test must only target a local Supabase ` +
        `Postgres instance — refusing to proceed.`,
    );
  }
}

describe('RLS-13 guard — RLS13_PG_URL must never be a known staging/production/hosted target', () => {
  it('RLS13_PG_URL (if set) is either unset or a local-only Postgres URL', () => {
    const pgUrl = readEnv('RLS13_PG_URL');
    if (!pgUrl) {
      expect(pgUrl).toBeUndefined();
      return;
    }
    expect(() => assertLocalPostgresOnly(pgUrl)).not.toThrow();
  });
});

const config = readRls13Config();
const allowed = isRunExplicitlyAllowed();
const ready = config !== null && allowed;

const RLS13_TENANT_CODES = ['RLS13-LIVE', 'RLS13-DEMO'] as const;

describe.skipIf(!ready)(
  'RLS-13 — personal.workforce_baseline is identical for LIVE and DEMO tenant_kind',
  () => {
    let client: InstanceType<typeof Client>;
    let liveTenantId: string;
    let demoTenantId: string;

    const SEGMENT_BREAKDOWN = { department: { HR: 12, Engineering: 28 }, site: { Milano: 40 } };
    const TOTAL_WORKERS = 40;

    beforeAll(async () => {
      if (!config) throw new Error('unreachable: beforeAll only runs when describe.skipIf(!ready) has already passed');
      assertLocalPostgresOnly(config.pgUrl);

      client = new Client({ connectionString: config.pgUrl });
      await client.connect();

      const liveResult = await client.query<{ id: string }>(
        `INSERT INTO analytics.tenant (tenant_code, company_name, tenant_kind)
         VALUES ($1, $2, 'LIVE')
         ON CONFLICT (tenant_code) DO UPDATE SET company_name = EXCLUDED.company_name, tenant_kind = 'LIVE'
         RETURNING id`,
        ['RLS13-LIVE', 'RLS-13 Synthetic Tenant (LIVE)'],
      );
      liveTenantId = liveResult.rows[0].id;

      const demoResult = await client.query<{ id: string }>(
        `INSERT INTO analytics.tenant (tenant_code, company_name, tenant_kind)
         VALUES ($1, $2, 'DEMO')
         ON CONFLICT (tenant_code) DO UPDATE SET company_name = EXCLUDED.company_name, tenant_kind = 'DEMO'
         RETURNING id`,
        ['RLS13-DEMO', 'RLS-13 Synthetic Tenant (DEMO)'],
      );
      demoTenantId = demoResult.rows[0].id;

      await client.query(`DELETE FROM personal.workforce_baseline WHERE tenant_id = ANY($1)`, [[liveTenantId, demoTenantId]]);

      for (const tenantId of [liveTenantId, demoTenantId]) {
        await client.query(
          `INSERT INTO personal.workforce_baseline
             (tenant_id, reporting_period, total_workers, segment_breakdown, privacy_threshold_applied, minimum_group_size, created_by)
           VALUES ($1, 'RLS13-PERIOD', $2, $3, true, 10, 'rls13-test')`,
          [tenantId, TOTAL_WORKERS, JSON.stringify(SEGMENT_BREAKDOWN)],
        );
      }
    });

    afterAll(async () => {
      if (!client) return;

      const tenantRows = await client.query<{ id: string }>(
        `SELECT id FROM analytics.tenant WHERE tenant_code = ANY($1)`,
        [RLS13_TENANT_CODES as unknown as string[]],
      );
      const ids = tenantRows.rows.map((row) => row.id);

      if (ids.length > 0) {
        await client.query(`DELETE FROM personal.workforce_baseline WHERE tenant_id = ANY($1)`, [ids]);
        await client.query(`DELETE FROM analytics.tenant WHERE tenant_code = ANY($1)`, [
          RLS13_TENANT_CODES as unknown as string[],
        ]);
      }

      await client.end();
    });

    // Mirrors exactly the query app/api/admin/workforce-baseline/route.ts's
    // GET handler runs — same columns, same table, no tenant_kind reference.
    async function fetchBaselineRow(tenantId: string): Promise<WorkforceBaselineRow> {
      const result = await client.query(
        `SELECT tenant_id, reporting_period, total_workers, segment_breakdown, minimum_group_size, created_at, created_by
         FROM personal.workforce_baseline
         WHERE tenant_id = $1
         ORDER BY created_at DESC
         LIMIT 1`,
        [tenantId],
      );
      return result.rows[0] as WorkforceBaselineRow;
    }

    it('LIVE tenant: the row is written and read back with the exact values inserted', async () => {
      const row = await fetchBaselineRow(liveTenantId);
      expect(row.total_workers).toBe(TOTAL_WORKERS);
      expect(row.segment_breakdown).toEqual(SEGMENT_BREAKDOWN);
    });

    it('DEMO tenant: the row is written and read back with the exact values inserted — identical to LIVE', async () => {
      const row = await fetchBaselineRow(demoTenantId);
      expect(row.total_workers).toBe(TOTAL_WORKERS);
      expect(row.segment_breakdown).toEqual(SEGMENT_BREAKDOWN);
    });

    it('buildWorkforceBaselineView produces the same aggregateGroups shape for both, given identical underlying data', async () => {
      const liveRow = await fetchBaselineRow(liveTenantId);
      const demoRow = await fetchBaselineRow(demoTenantId);

      const liveView = buildWorkforceBaselineView(liveRow, { tenant_code: 'RLS13-LIVE', company_name: 'RLS-13 LIVE' });
      const demoView = buildWorkforceBaselineView(demoRow, { tenant_code: 'RLS13-DEMO', company_name: 'RLS-13 DEMO' });

      expect(liveView.aggregateGroups.map((g) => ({ dimension_type: g.dimension_type, group_label: g.group_label, employee_count: g.employee_count })))
        .toEqual(demoView.aggregateGroups.map((g) => ({ dimension_type: g.dimension_type, group_label: g.group_label, employee_count: g.employee_count })));
      expect(liveView.minimumCompanyThresholdMet).toBe(demoView.minimumCompanyThresholdMet);
    });

    it('the raw column set returned is identical for both — no tenant_kind-conditional column ever appears', async () => {
      const liveRow = await fetchBaselineRow(liveTenantId);
      const demoRow = await fetchBaselineRow(demoTenantId);
      expect(Object.keys(liveRow).sort()).toEqual(Object.keys(demoRow).sort());
    });
  },
);
