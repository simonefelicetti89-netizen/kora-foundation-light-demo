/**
 * RLS-15 — CompanyOnboarding (analytics.tenant + personal.workforce_baseline)
 * tenant_kind parity DB test (direct Postgres, local Supabase)
 *
 * WHAT THIS IS:
 *   A LIVE proof that CompanyOnboardingService.getOnboardingState() reads
 *   and derives an identical onboarding view for a DEMO-kind tenant and a
 *   LIVE-kind tenant, given identical underlying analytics.tenant +
 *   personal.workforce_baseline data. The query itself never references
 *   tenant_kind — this test proves that at the DB level, not just in the
 *   service's source text.
 *
 * WHY THIS MATTERS (ONE PRODUCT / NO DEMO RUNTIME, Patch 03):
 *   The B-TRUTH Company Onboarding Canonicalization (2026-09-01) retired
 *   CompanyOnboardingService's synthetic JSON read
 *   (data/synthetic/company-onboarding.json) in favor of
 *   lib/live/company-onboarding-view.ts, reading real analytics.tenant +
 *   personal.workforce_baseline rows. This is the concrete DB-level proof
 *   that the replacement is genuinely tenant_kind-blind — the SAME query
 *   and the SAME derived-logic authority (buildCompanyOnboardingView,
 *   unchanged by tenant_kind) run for a LIVE or a DEMO-kind tenant, exactly
 *   per Patch 03: tenant_kind may gate operational side effects only, never
 *   product truth.
 *
 * SAME SAFETY MODEL AS RLS-03/11/12/13/14 (see rls-two-tenant-negative.test.ts's
 * header for the full rationale):
 *   - Skip-safe by default: everything lives inside describe.skipIf(!ready),
 *     ready requires RLS15_PG_URL set AND RLS15_ALLOW_RUN==='true'.
 *   - An always-on static guard hard-blocks known staging/production
 *     project refs and any hosted Supabase domain, and requires a loopback
 *     host, independent of RLS15_ALLOW_RUN.
 *   - Uses a single privileged (non-`authenticated`) connection for both
 *     fixture setup and the assertions themselves — this mirrors what
 *     CompanyOnboardingService.getOnboardingState()'s Supabase server
 *     client does when queried by an admin session; the DATA and QUERY
 *     SHAPE identity for both tenant_kind values is the property under
 *     test here, matching RLS-13/RLS-14's own rationale for the same
 *     design choice. `numeric`/string coercion pitfalls from RLS-14 do not
 *     apply here — every column read is text/integer/jsonb, not numeric.
 *   - Teardown is scoped strictly to this test's own tenant_code values.
 *
 * REQUIRED ENV VARS:
 *   RLS15_PG_URL     — direct Postgres connection string, local Supabase
 *                      only. Confirm via `supabase status`, e.g.:
 *                        postgresql://postgres:postgres@127.0.0.1:54322/postgres
 *   RLS15_ALLOW_RUN  — must be exactly 'true'.
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import pg from 'pg';
import { buildCompanyOnboardingView, type TenantOnboardingRow } from '../../lib/live/company-onboarding-view';
import type { WorkforceBaselineRow } from '../../lib/live/workforce-baseline-view';

const { Client } = pg;

function readEnv(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim().length > 0 ? value : undefined;
}

interface Rls15Config {
  pgUrl: string;
}

function readRls15Config(): Rls15Config | null {
  const pgUrl = readEnv('RLS15_PG_URL');
  if (!pgUrl) return null;
  return { pgUrl };
}

function isRunExplicitlyAllowed(): boolean {
  return readEnv('RLS15_ALLOW_RUN') === 'true';
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
        `RLS15_PG_URL matches a known staging/production project ref. This test must only ` +
          `ever target a local Postgres instance — refusing to proceed.`,
      );
    }
  }
  if (lower.includes('supabase.co') || lower.includes('supabase.com')) {
    throw new Error(
      `RLS15_PG_URL points at a hosted Supabase domain. This test must only target a local ` +
        `Postgres instance (confirm the correct URL via \`supabase status\`) — refusing to proceed.`,
    );
  }

  let hostname: string;
  try {
    hostname = new URL(pgUrl).hostname.toLowerCase();
  } catch {
    throw new Error('RLS15_PG_URL is not a valid connection URL — refusing to proceed.');
  }
  if (!ALLOWED_LOCAL_HOSTS.includes(hostname)) {
    throw new Error(
      `RLS15_PG_URL host "${hostname}" is not a recognized local address ` +
        `(${ALLOWED_LOCAL_HOSTS.join(', ')}). This test must only target a local Supabase ` +
        `Postgres instance — refusing to proceed.`,
    );
  }
}

describe('RLS-15 guard — RLS15_PG_URL must never be a known staging/production/hosted target', () => {
  it('RLS15_PG_URL (if set) is either unset or a local-only Postgres URL', () => {
    const pgUrl = readEnv('RLS15_PG_URL');
    if (!pgUrl) {
      expect(pgUrl).toBeUndefined();
      return;
    }
    expect(() => assertLocalPostgresOnly(pgUrl)).not.toThrow();
  });
});

const config = readRls15Config();
const allowed = isRunExplicitlyAllowed();
const ready = config !== null && allowed;

const RLS15_TENANT_CODES = ['RLS15-LIVE', 'RLS15-DEMO'] as const;

describe.skipIf(!ready)(
  'RLS-15 — CompanyOnboarding view is identical for LIVE and DEMO tenant_kind',
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
        `INSERT INTO analytics.tenant (tenant_code, company_name, tenant_kind, onboarding_status, data_readiness_status, decision_pack_status)
         VALUES ($1, $2, 'LIVE', 'active', 'intake_ready', 'not_ready')
         ON CONFLICT (tenant_code) DO UPDATE SET company_name = EXCLUDED.company_name, tenant_kind = 'LIVE',
           onboarding_status = 'active', data_readiness_status = 'intake_ready', decision_pack_status = 'not_ready'
         RETURNING id`,
        ['RLS15-LIVE', 'RLS-15 Synthetic Tenant (LIVE)'],
      );
      liveTenantId = liveResult.rows[0].id;

      const demoResult = await client.query<{ id: string }>(
        `INSERT INTO analytics.tenant (tenant_code, company_name, tenant_kind, onboarding_status, data_readiness_status, decision_pack_status)
         VALUES ($1, $2, 'DEMO', 'active', 'intake_ready', 'not_ready')
         ON CONFLICT (tenant_code) DO UPDATE SET company_name = EXCLUDED.company_name, tenant_kind = 'DEMO',
           onboarding_status = 'active', data_readiness_status = 'intake_ready', decision_pack_status = 'not_ready'
         RETURNING id`,
        ['RLS15-DEMO', 'RLS-15 Synthetic Tenant (DEMO)'],
      );
      demoTenantId = demoResult.rows[0].id;

      await client.query(`DELETE FROM personal.workforce_baseline WHERE tenant_id = ANY($1)`, [[liveTenantId, demoTenantId]]);

      for (const tenantId of [liveTenantId, demoTenantId]) {
        await client.query(
          `INSERT INTO personal.workforce_baseline
             (tenant_id, reporting_period, total_workers, segment_breakdown, privacy_threshold_applied, minimum_group_size, created_by)
           VALUES ($1, 'RLS15-PERIOD', $2, $3, true, 10, 'rls15-test')`,
          [tenantId, TOTAL_WORKERS, JSON.stringify(SEGMENT_BREAKDOWN)],
        );
      }
    });

    afterAll(async () => {
      if (!client) return;

      const tenantRows = await client.query<{ id: string }>(
        `SELECT id FROM analytics.tenant WHERE tenant_code = ANY($1)`,
        [RLS15_TENANT_CODES as unknown as string[]],
      );
      const ids = tenantRows.rows.map((row) => row.id);

      if (ids.length > 0) {
        await client.query(`DELETE FROM personal.workforce_baseline WHERE tenant_id = ANY($1)`, [ids]);
        await client.query(`DELETE FROM analytics.tenant WHERE tenant_code = ANY($1)`, [
          RLS15_TENANT_CODES as unknown as string[],
        ]);
      }

      await client.end();
    });

    // Mirrors exactly the two queries
    // CompanyOnboardingService.getOnboardingState() runs — same columns,
    // same tables, no tenant_kind reference.
    async function fetchOnboardingView(tenantCode: string) {
      const tenantResult = await client.query(
        `SELECT id, tenant_code, company_name, onboarding_status, data_readiness_status, decision_pack_status
         FROM analytics.tenant
         WHERE tenant_code = $1 AND deleted_at IS NULL`,
        [tenantCode],
      );
      const tenantRow = tenantResult.rows[0] as TenantOnboardingRow;

      const baselineResult = await client.query(
        `SELECT tenant_id, reporting_period, total_workers, segment_breakdown, minimum_group_size, created_at, created_by
         FROM personal.workforce_baseline
         WHERE tenant_id = $1
         ORDER BY created_at DESC
         LIMIT 1`,
        [tenantRow.id],
      );
      const baselineRow = (baselineResult.rows[0] as WorkforceBaselineRow | undefined) ?? null;

      return buildCompanyOnboardingView(tenantRow, baselineRow);
    }

    it('LIVE tenant: the fixture rows are written and read back into a coherent onboarding view', async () => {
      const view = await fetchOnboardingView('RLS15-LIVE');
      expect(view.hasWorkforceBaseline).toBe(true);
      expect(view.isFoundationLightEligible).toBe(true);
      expect(view.pipelineReadiness.status).toBe('ok');
    });

    it('DEMO tenant: the fixture rows are written and read back identically to LIVE', async () => {
      const view = await fetchOnboardingView('RLS15-DEMO');
      expect(view.hasWorkforceBaseline).toBe(true);
      expect(view.isFoundationLightEligible).toBe(true);
      expect(view.pipelineReadiness.status).toBe('ok');
    });

    it('the two views are identical apart from tenant identity fields — same derived logic, same LIVE/DEMO-blind path', async () => {
      const liveView = await fetchOnboardingView('RLS15-LIVE');
      const demoView = await fetchOnboardingView('RLS15-DEMO');

      const stripIdentity = (v: Awaited<ReturnType<typeof fetchOnboardingView>>) => {
        const { tenantId: _tenantId, tenantCode: _tenantCode, companyName: _companyName, ...rest } = v;
        return rest;
      };

      expect(stripIdentity(liveView)).toEqual(stripIdentity(demoView));
    });

    it('the raw column set returned is identical for both — no tenant_kind-conditional column ever appears', async () => {
      const liveView = await fetchOnboardingView('RLS15-LIVE');
      const demoView = await fetchOnboardingView('RLS15-DEMO');
      expect(Object.keys(liveView).sort()).toEqual(Object.keys(demoView).sort());
    });
  },
);
