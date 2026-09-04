/**
 * RLS-18 — Canonical Data Intake status view, real-runtime proof
 * (direct Postgres, local Supabase)
 *
 * WHAT THIS IS:
 *   A DB-backed proof that lib/live/data-intake-status-view.ts's
 *   buildDataIntakeStatusView() — the pure function replacing
 *   services/company-data-intake/CompanyDataIntakeService.ts's synthetic
 *   getDataReadinessSummary() for its 2 real callers
 *   (app/admin/pipeline/_components/PilotLifecycleClient.tsx and
 *   services/report-factory/ReportFactoryService.ts) — derives the correct
 *   status against real analytics.source_batch / analytics.uef_record rows,
 *   including the multi-batch selection rule (latest by created_at) PART 8
 *   of this migration's own design required to be justified, not invented.
 *
 * This is a companion to RLS-17
 * (tests/integration/rls-17-koratest-canonical-foundation.test.ts, PR 1's
 * own regression guard) — kept as its own, separate, narrowly-scoped file
 * rather than appended there, matching this repo's own convention of one
 * dedicated regression file per bounded retirement/migration.
 *
 * SAME SAFETY MODEL AS RLS-16/RLS-17 (see those files' headers for the full
 * rationale): skip-safe by default (RLS18_PG_URL + RLS18_ALLOW_RUN==='true'
 * required), an always-on static guard blocking known staging/production
 * refs and any hosted Supabase domain, loopback-host-only, single
 * privileged connection, teardown scoped strictly to this test's own
 * tenant_code.
 *
 * REQUIRED ENV VARS:
 *   RLS18_PG_URL     — direct Postgres connection string, local Supabase only.
 *   RLS18_ALLOW_RUN  — must be exactly 'true'.
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import pg from 'pg';
import { buildDataIntakeStatusView, type SourceBatchStatusRow } from '../../lib/live/data-intake-status-view';

describe('RLS-18 structural guard — no legacy synthetic Data Intake path is used by this suite', () => {
  const ownSource = readFileSync(resolve(__dirname, 'rls-18-data-intake-status-view.test.ts'), 'utf-8');

  it('does not import CompanyDataIntakeService or any data/synthetic/** fixture', () => {
    expect(ownSource).not.toMatch(/from\s+['"][^'"]*CompanyDataIntakeService['"]/);
    expect(ownSource).not.toMatch(/from\s+['"][^'"]*data\/synthetic\//);
  });

  it('imports the real canonical pure view builder, not a hand-written status derivation', () => {
    expect(ownSource).toContain("from '../../lib/live/data-intake-status-view'");
  });
});

const { Client } = pg;

function readEnv(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim().length > 0 ? value : undefined;
}

interface Rls18Config {
  pgUrl: string;
}

function readRls18Config(): Rls18Config | null {
  const pgUrl = readEnv('RLS18_PG_URL');
  if (!pgUrl) return null;
  return { pgUrl };
}

function isRunExplicitlyAllowed(): boolean {
  return readEnv('RLS18_ALLOW_RUN') === 'true';
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
        `RLS18_PG_URL matches a known staging/production project ref. This test must only ` +
          `ever target a local Postgres instance — refusing to proceed.`,
      );
    }
  }
  if (lower.includes('supabase.co') || lower.includes('supabase.com')) {
    throw new Error(
      `RLS18_PG_URL points at a hosted Supabase domain. This test must only target a local ` +
        `Postgres instance (confirm the correct URL via \`supabase status\`) — refusing to proceed.`,
    );
  }

  let hostname: string;
  try {
    hostname = new URL(pgUrl).hostname.toLowerCase();
  } catch {
    throw new Error('RLS18_PG_URL is not a valid connection URL — refusing to proceed.');
  }
  if (!ALLOWED_LOCAL_HOSTS.includes(hostname)) {
    throw new Error(
      `RLS18_PG_URL host "${hostname}" is not a recognized local address ` +
        `(${ALLOWED_LOCAL_HOSTS.join(', ')}). This test must only target a local Supabase ` +
        `Postgres instance — refusing to proceed.`,
    );
  }
}

describe('RLS-18 guard — RLS18_PG_URL must never be a known staging/production/hosted target', () => {
  it('RLS18_PG_URL (if set) is either unset or a local-only Postgres URL', () => {
    const pgUrl = readEnv('RLS18_PG_URL');
    if (!pgUrl) {
      expect(pgUrl).toBeUndefined();
      return;
    }
    expect(() => assertLocalPostgresOnly(pgUrl)).not.toThrow();
  });
});

const config = readRls18Config();
const allowed = isRunExplicitlyAllowed();
const ready = config !== null && allowed;

const TENANT_CODE = 'RLS18-DATAINTAKE';
const REPORTING_PERIOD = 'RLS18-PERIOD';

describe.skipIf(!ready)(
  'RLS-18 — buildDataIntakeStatusView() against real analytics.source_batch / analytics.uef_record rows',
  () => {
    let client: InstanceType<typeof Client>;
    let tenantId: string;

    beforeAll(async () => {
      if (!config) throw new Error('unreachable: beforeAll only runs when describe.skipIf(!ready) has already passed');
      assertLocalPostgresOnly(config.pgUrl);
      client = new Client({ connectionString: config.pgUrl });
      await client.connect();

      const tenantResult = await client.query<{ id: string }>(
        `INSERT INTO analytics.tenant (tenant_code, company_name, tenant_kind)
         VALUES ($1, $2, 'TEST')
         ON CONFLICT (tenant_code) DO UPDATE SET company_name = EXCLUDED.company_name
         RETURNING id`,
        [TENANT_CODE, 'RLS-18 Data Intake View Reference Tenant'],
      );
      tenantId = tenantResult.rows[0].id;

      // Clean slate for this tenant's own fixture rows.
      await client.query(`DELETE FROM analytics.uef_record WHERE tenant_id = $1`, [tenantId]);
      await client.query(`DELETE FROM analytics.source_batch WHERE tenant_id = $1`, [tenantId]);
    });

    afterAll(async () => {
      if (!client) return;
      await client.query(`DELETE FROM analytics.uef_record WHERE tenant_id = $1`, [tenantId]);
      await client.query(`DELETE FROM analytics.source_batch WHERE tenant_id = $1`, [tenantId]);
      await client.query(`DELETE FROM analytics.tenant WHERE tenant_code = $1`, [TENANT_CODE]);
      await client.end();
    });

    it('no batch exists — view reports not_started', async () => {
      const batches = await client.query<SourceBatchStatusRow>(
        `SELECT batch_status, created_at FROM analytics.source_batch WHERE tenant_id = $1`,
        [tenantId],
      );
      const view = buildDataIntakeStatusView(batches.rows, 0);
      expect(view).toEqual({ batchCount: 0, intakeStatus: 'not_started', pendingReviewCount: 0 });
    });

    it('multi-batch selection rule — the LATEST batch by created_at wins, not the first/oldest one, not an arbitrary row', async () => {
      // Insert an OLDER batch first, already 'approved' (would incorrectly
      // win if the selection rule were "first row" or "any approved row"
      // instead of genuinely latest-by-created_at).
      await client.query(
        `INSERT INTO analytics.source_batch
           (tenant_id, source_type, source_name, reporting_period, row_count, mapped_count, rejected_count, batch_status, pending_review_count, created_by, created_at)
         VALUES ($1, 'manual', 'RLS-18 older batch', $2, 5, 5, 0, 'approved', 0, 'rls18-test', now() - interval '2 days')`,
        [tenantId, REPORTING_PERIOD],
      );
      // Insert a NEWER batch, still 'pending' — the correct "latest" row.
      await client.query(
        `INSERT INTO analytics.source_batch
           (tenant_id, source_type, source_name, reporting_period, row_count, mapped_count, rejected_count, batch_status, pending_review_count, created_by, created_at)
         VALUES ($1, 'manual', 'RLS-18 newer batch', $2, 3, 3, 0, 'pending', 0, 'rls18-test', now())`,
        [tenantId, REPORTING_PERIOD],
      );

      const batches = await client.query<SourceBatchStatusRow>(
        `SELECT batch_status, created_at FROM analytics.source_batch WHERE tenant_id = $1`,
        [tenantId],
      );
      expect(batches.rows.length).toBe(2);

      const view = buildDataIntakeStatusView(batches.rows, 0);
      expect(view.batchCount).toBe(2);
      // If the older 'approved' batch had incorrectly won, this would be
      // 'ready_for_ingestion' instead.
      expect(view.intakeStatus).toBe('in_progress');
    });

    it('pending UEF review count — same counting query app/api/admin/uef/review/route.ts already uses — drives validation_required', async () => {
      const { rows: [{ id: batchId }] } = await client.query<{ id: string }>(
        `SELECT id FROM analytics.source_batch WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT 1`,
        [tenantId],
      );

      await client.query(
        `INSERT INTO analytics.uef_record
           (tenant_id, batch_id, reporting_period, raw_name, eligibility, review_status)
         VALUES ($1, $2, $3, 'RLS-18 test row', 'eligible', 'pending_review')`,
        [tenantId, batchId, REPORTING_PERIOD],
      );

      const pendingResult = await client.query<{ count: string }>(
        `SELECT count(*) FROM analytics.uef_record WHERE tenant_id = $1 AND review_status = 'pending_review'`,
        [tenantId],
      );
      const pendingCount = Number(pendingResult.rows[0].count);
      expect(pendingCount).toBe(1);

      const batches = await client.query<SourceBatchStatusRow>(
        `SELECT batch_status, created_at FROM analytics.source_batch WHERE tenant_id = $1`,
        [tenantId],
      );
      const view = buildDataIntakeStatusView(batches.rows, pendingCount);
      expect(view.intakeStatus).toBe('validation_required');
      expect(view.pendingReviewCount).toBe(1);
    });

    it('latest batch approved, nothing pending — view reports ready_for_ingestion', async () => {
      await client.query(`DELETE FROM analytics.uef_record WHERE tenant_id = $1`, [tenantId]);
      await client.query(
        `UPDATE analytics.source_batch SET batch_status = 'approved'
         WHERE tenant_id = $1 AND created_at = (SELECT max(created_at) FROM analytics.source_batch WHERE tenant_id = $1)`,
        [tenantId],
      );

      const batches = await client.query<SourceBatchStatusRow>(
        `SELECT batch_status, created_at FROM analytics.source_batch WHERE tenant_id = $1`,
        [tenantId],
      );
      const view = buildDataIntakeStatusView(batches.rows, 0);
      expect(view.intakeStatus).toBe('ready_for_ingestion');
    });
  },
);
