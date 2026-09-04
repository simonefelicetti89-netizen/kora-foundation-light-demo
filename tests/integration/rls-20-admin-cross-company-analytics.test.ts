/**
 * RLS-20 — CC-00 AdminPreview Cross-Company Canonicalization Phase 1, real-runtime proof
 * (direct Postgres, local Supabase)
 *
 * WHAT THIS IS:
 *   A DB-backed proof that lib/live/admin-cross-company-view.ts's
 *   buildAdminPlatformAnalyticsView() — the pure function replacing
 *   services/admin-preview/AdminPreviewService.ts's synthetic
 *   getPlatformAnalyticsPreview() for its one real caller
 *   (app/admin/page.tsx) — derives correct portfolio-wide analytics against
 *   real analytics.tenant / analytics.kora_index_result /
 *   analytics.confidence_result / analytics.source_batch rows, across
 *   MULTIPLE tenants, including the case where one tenant has no current
 *   result at all (must not corrupt the other tenants' averages).
 *
 * This is a companion to RLS-17/18/19 — kept as its own, separate,
 * narrowly-scoped file rather than appended to any of them, matching this
 * repo's own established convention of one dedicated regression file per
 * bounded migration.
 *
 * SAME SAFETY MODEL AS RLS-16/17/18/19 (see those files' headers for the
 * full rationale): skip-safe by default (RLS20_PG_URL + RLS20_ALLOW_RUN==='true'
 * required), an always-on structural guard blocking known staging/production
 * refs and any hosted Supabase domain, loopback-host-only, single
 * privileged connection, teardown scoped strictly to this test's own
 * tenant_codes.
 *
 * REQUIRED ENV VARS:
 *   RLS20_PG_URL     — direct Postgres connection string, local Supabase only.
 *   RLS20_ALLOW_RUN  — must be exactly 'true'.
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import pg from 'pg';
import {
  buildAdminPlatformAnalyticsView,
  type CurrentKoraIndexResultRow,
  type SourceBatchStatusRowForAnalytics,
} from '../../lib/live/admin-cross-company-view';

describe('RLS-20 structural guard — no legacy synthetic AdminPreview path is used by this suite', () => {
  const ownSource = readFileSync(resolve(__dirname, 'rls-20-admin-cross-company-analytics.test.ts'), 'utf-8');

  it('does not import AdminPreviewService or any data/synthetic/** fixture', () => {
    expect(ownSource).not.toMatch(/from\s+['"][^'"]*AdminPreviewService['"]/);
    expect(ownSource).not.toMatch(/from\s+['"][^'"]*data\/synthetic\//);
  });

  it('imports the real canonical pure view builder, not a hand-written aggregation', () => {
    expect(ownSource).toContain("from '../../lib/live/admin-cross-company-view'");
  });
});

const { Client } = pg;

function readEnv(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim().length > 0 ? value : undefined;
}

interface Rls20Config {
  pgUrl: string;
}

function readRls20Config(): Rls20Config | null {
  const pgUrl = readEnv('RLS20_PG_URL');
  if (!pgUrl) return null;
  return { pgUrl };
}

function isRunExplicitlyAllowed(): boolean {
  return readEnv('RLS20_ALLOW_RUN') === 'true';
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
        `RLS20_PG_URL matches a known staging/production project ref. This test must only ` +
          `ever target a local Postgres instance — refusing to proceed.`,
      );
    }
  }
  if (lower.includes('supabase.co') || lower.includes('supabase.com')) {
    throw new Error(
      `RLS20_PG_URL points at a hosted Supabase domain. This test must only target a local ` +
        `Postgres instance (confirm the correct URL via \`supabase status\`) — refusing to proceed.`,
    );
  }

  let hostname: string;
  try {
    hostname = new URL(pgUrl).hostname.toLowerCase();
  } catch {
    throw new Error('RLS20_PG_URL is not a valid connection URL — refusing to proceed.');
  }
  if (!ALLOWED_LOCAL_HOSTS.includes(hostname)) {
    throw new Error(
      `RLS20_PG_URL host "${hostname}" is not a recognized local address ` +
        `(${ALLOWED_LOCAL_HOSTS.join(', ')}). This test must only target a local Supabase ` +
        `Postgres instance — refusing to proceed.`,
    );
  }
}

describe('RLS-20 guard — RLS20_PG_URL must never be a known staging/production/hosted target', () => {
  it('RLS20_PG_URL (if set) is either unset or a local-only Postgres URL', () => {
    const pgUrl = readEnv('RLS20_PG_URL');
    if (!pgUrl) {
      expect(pgUrl).toBeUndefined();
      return;
    }
    expect(() => assertLocalPostgresOnly(pgUrl)).not.toThrow();
  });
});

const config = readRls20Config();
const allowed = isRunExplicitlyAllowed();
const ready = config !== null && allowed;

const TENANT_A = 'RLS20-COMPANY-A';
const TENANT_B = 'RLS20-COMPANY-B';
const TENANT_C_NO_RESULT = 'RLS20-COMPANY-C';
const REPORTING_PERIOD = 'RLS20-PERIOD';

describe.skipIf(!ready)(
  'RLS-20 — buildAdminPlatformAnalyticsView() against real multi-tenant analytics.kora_index_result / confidence_result / source_batch rows',
  () => {
    let client: InstanceType<typeof Client>;
    let tenantIdA: string;
    let tenantIdB: string;
    let tenantIdC: string;

    beforeAll(async () => {
      if (!config) throw new Error('unreachable: beforeAll only runs when describe.skipIf(!ready) has already passed');
      assertLocalPostgresOnly(config.pgUrl);
      client = new Client({ connectionString: config.pgUrl });
      await client.connect();

      for (const code of [TENANT_A, TENANT_B, TENANT_C_NO_RESULT]) {
        await client.query(
          `INSERT INTO analytics.tenant (tenant_code, company_name, tenant_kind)
           VALUES ($1, $2, 'TEST')
           ON CONFLICT (tenant_code) DO UPDATE SET company_name = EXCLUDED.company_name`,
          [code, `RLS-20 Reference Tenant ${code}`],
        );
      }

      const idRows = await client.query<{ id: string; tenant_code: string }>(
        `SELECT id, tenant_code FROM analytics.tenant WHERE tenant_code IN ($1, $2, $3)`,
        [TENANT_A, TENANT_B, TENANT_C_NO_RESULT],
      );
      tenantIdA = idRows.rows.find((r) => r.tenant_code === TENANT_A)!.id;
      tenantIdB = idRows.rows.find((r) => r.tenant_code === TENANT_B)!.id;
      tenantIdC = idRows.rows.find((r) => r.tenant_code === TENANT_C_NO_RESULT)!.id;

      // Clean slate for this test's own rows.
      for (const tid of [tenantIdA, tenantIdB, tenantIdC]) {
        await client.query(`DELETE FROM analytics.kora_index_result WHERE tenant_id = $1`, [tid]);
        await client.query(`DELETE FROM analytics.confidence_result WHERE tenant_id = $1`, [tid]);
        await client.query(`DELETE FROM analytics.source_batch WHERE tenant_id = $1`, [tid]);
      }

      // Tenant A: a real confidence_result + kora_index_result (CLEAR, higher data_completeness).
      const confA = await client.query<{ id: string }>(
        `INSERT INTO analytics.confidence_result
           (tenant_id, reporting_period, confidence_score, confidence_level, data_completeness, evidence_quality, mapping_confidence, verification_weight, methodology_version_id, calibration_status)
         VALUES ($1, $2, 0.80, 'high', 0.90, 0.75, 0.70, 0.65, 'KORA Index v1.0', 'pre_empirical_calibration')
         RETURNING id`,
        [tenantIdA, REPORTING_PERIOD],
      );
      await client.query(
        `INSERT INTO analytics.kora_index_result
           (tenant_id, reporting_period, methodology_version_id, kora_index_value, safeguard_status, calibration_status, confidence_result_id, is_current)
         VALUES ($1, $2, 'KORA Index v1.0', 62.00, 'CLEAR', 'pre_empirical_calibration', $3, true)`,
        [tenantIdA, REPORTING_PERIOD, confA.rows[0].id],
      );

      // Tenant B: a real confidence_result + kora_index_result (WARNING, lower data_completeness) —
      // deliberately different values from tenant A, proving no cross-tenant mixing.
      const confB = await client.query<{ id: string }>(
        `INSERT INTO analytics.confidence_result
           (tenant_id, reporting_period, confidence_score, confidence_level, data_completeness, evidence_quality, mapping_confidence, verification_weight, methodology_version_id, calibration_status)
         VALUES ($1, $2, 0.50, 'medium', 0.40, 0.45, 0.55, 0.35, 'KORA Index v1.0', 'pre_empirical_calibration')
         RETURNING id`,
        [tenantIdB, REPORTING_PERIOD],
      );
      await client.query(
        `INSERT INTO analytics.kora_index_result
           (tenant_id, reporting_period, methodology_version_id, kora_index_value, safeguard_status, calibration_status, confidence_result_id, is_current)
         VALUES ($1, $2, 'KORA Index v1.0', 38.00, 'WARNING', 'pre_empirical_calibration', $3, true)`,
        [tenantIdB, REPORTING_PERIOD, confB.rows[0].id],
      );

      // Tenant C: NO kora_index_result row at all — proves a tenant with no
      // scoring run does not corrupt or get silently zeroed into the average.

      // source_batch rows — 3 total across A and B, 2 approved.
      await client.query(
        `INSERT INTO analytics.source_batch (tenant_id, source_type, source_name, reporting_period, row_count, mapped_count, rejected_count, batch_status, pending_review_count, created_by)
         VALUES ($1, 'manual', 'RLS-20 batch A1', $2, 10, 10, 0, 'approved', 0, 'rls20-test')`,
        [tenantIdA, REPORTING_PERIOD],
      );
      await client.query(
        `INSERT INTO analytics.source_batch (tenant_id, source_type, source_name, reporting_period, row_count, mapped_count, rejected_count, batch_status, pending_review_count, created_by)
         VALUES ($1, 'manual', 'RLS-20 batch B1', $2, 5, 5, 0, 'approved', 0, 'rls20-test')`,
        [tenantIdB, REPORTING_PERIOD],
      );
      await client.query(
        `INSERT INTO analytics.source_batch (tenant_id, source_type, source_name, reporting_period, row_count, mapped_count, rejected_count, batch_status, pending_review_count, created_by)
         VALUES ($1, 'manual', 'RLS-20 batch B2 pending', $2, 3, 0, 0, 'pending', 3, 'rls20-test')`,
        [tenantIdB, REPORTING_PERIOD],
      );
    });

    afterAll(async () => {
      if (!client) return;
      for (const tid of [tenantIdA, tenantIdB, tenantIdC]) {
        if (!tid) continue;
        await client.query(`DELETE FROM analytics.kora_index_result WHERE tenant_id = $1`, [tid]);
        await client.query(`DELETE FROM analytics.confidence_result WHERE tenant_id = $1`, [tid]);
        await client.query(`DELETE FROM analytics.source_batch WHERE tenant_id = $1`, [tid]);
      }
      for (const code of [TENANT_A, TENANT_B, TENANT_C_NO_RESULT]) {
        await client.query(`DELETE FROM analytics.tenant WHERE tenant_code = $1`, [code]);
      }
      await client.end();
    });

    it('all three tenants exist as ordinary tenant_kind=TEST rows', async () => {
      const rows = await client.query<{ tenant_kind: string }>(
        `SELECT tenant_kind FROM analytics.tenant WHERE tenant_code IN ($1, $2, $3)`,
        [TENANT_A, TENANT_B, TENANT_C_NO_RESULT],
      );
      expect(rows.rows.length).toBe(3);
      expect(rows.rows.every((r) => r.tenant_kind === 'TEST')).toBe(true);
    });

    it('the view builder counts all 3 tenants in companies_in_portfolio, regardless of scoring status', async () => {
      const tenantCountResult = await client.query<{ count: string }>(
        `SELECT count(*) FROM analytics.tenant WHERE tenant_code IN ($1, $2, $3)`,
        [TENANT_A, TENANT_B, TENANT_C_NO_RESULT],
      );
      const tenantCount = Number(tenantCountResult.rows[0].count);

      // node-postgres has no embedded-resource join like Supabase JS — fetch
      // as two real queries and join in JS, proving the SAME shape the
      // Supabase JS embed (used in app/admin/page.tsx) produces, without
      // depending on Supabase JS itself inside a raw-pg proof (matching
      // this repo's own RLS-17..19 pattern of proving the underlying data
      // via plain SQL, not the ORM client).
      const rawResults = await client.query<{
        tenant_id: string; kora_index_value: string; safeguard_status: string; confidence_result_id: string | null;
      }>(
        `SELECT tenant_id, kora_index_value, safeguard_status, confidence_result_id
         FROM analytics.kora_index_result
         WHERE tenant_id IN ($1, $2, $3) AND is_current = true`,
        [tenantIdA, tenantIdB, tenantIdC],
      );
      expect(rawResults.rows.length).toBe(2); // only A and B — C has none

      const confRows = await client.query<{ id: string; confidence_score: string; data_completeness: string }>(
        `SELECT id, confidence_score, data_completeness FROM analytics.confidence_result WHERE tenant_id IN ($1, $2)`,
        [tenantIdA, tenantIdB],
      );
      const confById = new Map(confRows.rows.map((r) => [r.id, r]));

      const currentResults: CurrentKoraIndexResultRow[] = rawResults.rows.map((r) => {
        const conf = r.confidence_result_id ? confById.get(r.confidence_result_id) : undefined;
        return {
          tenant_id: r.tenant_id,
          kora_index_value: Number(r.kora_index_value),
          safeguard_status: r.safeguard_status,
          confidence_result: conf
            ? { confidence_score: Number(conf.confidence_score), data_completeness: Number(conf.data_completeness) }
            : null,
        };
      });

      const batchRows = await client.query<{ batch_status: string }>(
        `SELECT batch_status FROM analytics.source_batch WHERE tenant_id IN ($1, $2, $3)`,
        [tenantIdA, tenantIdB, tenantIdC],
      );
      const batches: SourceBatchStatusRowForAnalytics[] = batchRows.rows;

      const view = buildAdminPlatformAnalyticsView(tenantCount, currentResults, batches);

      expect(view.companies_in_portfolio).toBe(3);
      // Averages over exactly the 2 scored tenants — the 3rd (no result)
      // must not corrupt or zero out the average.
      expect(view.avg_kora_index).toBe(Math.round((62 + 38) / 2));
      expect(view.avg_confidence_score).toBeCloseTo((0.80 + 0.50) / 2, 2);
      expect(view.avg_data_completeness).toBeCloseTo((0.90 + 0.40) / 2, 2);
      expect(view.safeguard_distribution).toEqual({ CLEAR: 1, WARNING: 1, FLAGGED: 0 });
      expect(view.source_batches_total).toBe(3);
      expect(view.source_batches_approved).toBe(2);
    });

    it('tenant A and tenant B values are never cross-mixed — each row keeps its own tenant_id association', async () => {
      const rows = await client.query<{ tenant_id: string; kora_index_value: string }>(
        `SELECT tenant_id, kora_index_value FROM analytics.kora_index_result WHERE tenant_id IN ($1, $2) AND is_current = true`,
        [tenantIdA, tenantIdB],
      );
      const byTenant = new Map(rows.rows.map((r) => [r.tenant_id, Number(r.kora_index_value)]));
      expect(byTenant.get(tenantIdA)).toBe(62);
      expect(byTenant.get(tenantIdB)).toBe(38);
    });

    it('no benchmark/percentile field appears anywhere in the returned view', () => {
      // Structural guard on the view's own shape, not just its source —
      // proves the runtime object itself carries no such field.
      const view = buildAdminPlatformAnalyticsView(0, [], []);
      const keys = Object.keys(view);
      for (const forbidden of ['percentile', 'benchmark', 'rank', 'peer']) {
        expect(keys.some((k) => k.toLowerCase().includes(forbidden))).toBe(false);
      }
    });
  },
);
