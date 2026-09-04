/**
 * RLS-19 — Canonical Decision Pack status view, real-runtime proof
 * (direct Postgres, local Supabase)
 *
 * WHAT THIS IS:
 *   A DB-backed proof that lib/live/decision-pack-status-view.ts's
 *   buildDecisionPackStatusView() — the pure function replacing
 *   services/report-factory/ReportFactoryService.ts's synthetic
 *   getDecisionPackFactoryStatus()/getLatestDecisionPackVersion() for its
 *   one real caller (app/admin/pipeline/_components/PilotLifecycleClient.tsx)
 *   — derives the correct status against real
 *   analytics.decision_pack_version rows, including the multi-version
 *   selection rule (latest by created_at) this migration's own design
 *   required to be justified, not invented.
 *
 * This is a companion to RLS-17 (KoraTest canonical foundation, PR 1) and
 * RLS-18 (Data Intake status view, PR 3) — kept as its own, separate,
 * narrowly-scoped file rather than appended to either, matching this repo's
 * own established convention (see RLS-18's own header) of one dedicated
 * regression file per bounded retirement/migration.
 *
 * SAME SAFETY MODEL AS RLS-16/17/18 (see those files' headers for the full
 * rationale): skip-safe by default (RLS19_PG_URL + RLS19_ALLOW_RUN==='true'
 * required), an always-on static guard blocking known staging/production
 * refs and any hosted Supabase domain, loopback-host-only, single
 * privileged connection, teardown scoped strictly to this test's own
 * tenant_code.
 *
 * CI WIRING NOTE: B-TRUTH CompanyDataIntakeService Canonical Migration
 * (PR 3) discovered that RLS-17 had silently never been wired into
 * .github/workflows/ci.yml's mandatory no-skip DB-backed gate since its own
 * creation (PR 1) — meaning it ran skip-safe everywhere, including CI,
 * undermining its purpose. This file's env vars and its own path are wired
 * into that same gate in this PR's own commit, not deferred — see
 * .github/workflows/ci.yml's "Run RLS integration suites" step.
 *
 * REQUIRED ENV VARS:
 *   RLS19_PG_URL     — direct Postgres connection string, local Supabase only.
 *   RLS19_ALLOW_RUN  — must be exactly 'true'.
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import pg from 'pg';
import { buildDecisionPackStatusView, type DecisionPackVersionStatusRow } from '../../lib/live/decision-pack-status-view';

describe('RLS-19 structural guard — no legacy synthetic Decision Pack path is used by this suite', () => {
  const ownSource = readFileSync(resolve(__dirname, 'rls-19-decision-pack-status-view.test.ts'), 'utf-8');

  it('does not import ReportFactoryService or any data/synthetic/** fixture', () => {
    expect(ownSource).not.toMatch(/from\s+['"][^'"]*ReportFactoryService['"]/);
    expect(ownSource).not.toMatch(/from\s+['"][^'"]*data\/synthetic\//);
  });

  it('imports the real canonical pure view builder, not a hand-written status derivation', () => {
    expect(ownSource).toContain("from '../../lib/live/decision-pack-status-view'");
  });
});

const { Client } = pg;

function readEnv(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim().length > 0 ? value : undefined;
}

interface Rls19Config {
  pgUrl: string;
}

function readRls19Config(): Rls19Config | null {
  const pgUrl = readEnv('RLS19_PG_URL');
  if (!pgUrl) return null;
  return { pgUrl };
}

function isRunExplicitlyAllowed(): boolean {
  return readEnv('RLS19_ALLOW_RUN') === 'true';
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
        `RLS19_PG_URL matches a known staging/production project ref. This test must only ` +
          `ever target a local Postgres instance — refusing to proceed.`,
      );
    }
  }
  if (lower.includes('supabase.co') || lower.includes('supabase.com')) {
    throw new Error(
      `RLS19_PG_URL points at a hosted Supabase domain. This test must only target a local ` +
        `Postgres instance (confirm the correct URL via \`supabase status\`) — refusing to proceed.`,
    );
  }

  let hostname: string;
  try {
    hostname = new URL(pgUrl).hostname.toLowerCase();
  } catch {
    throw new Error('RLS19_PG_URL is not a valid connection URL — refusing to proceed.');
  }
  if (!ALLOWED_LOCAL_HOSTS.includes(hostname)) {
    throw new Error(
      `RLS19_PG_URL host "${hostname}" is not a recognized local address ` +
        `(${ALLOWED_LOCAL_HOSTS.join(', ')}). This test must only target a local Supabase ` +
        `Postgres instance — refusing to proceed.`,
    );
  }
}

describe('RLS-19 guard — RLS19_PG_URL must never be a known staging/production/hosted target', () => {
  it('RLS19_PG_URL (if set) is either unset or a local-only Postgres URL', () => {
    const pgUrl = readEnv('RLS19_PG_URL');
    if (!pgUrl) {
      expect(pgUrl).toBeUndefined();
      return;
    }
    expect(() => assertLocalPostgresOnly(pgUrl)).not.toThrow();
  });
});

const config = readRls19Config();
const allowed = isRunExplicitlyAllowed();
const ready = config !== null && allowed;

const TENANT_CODE = 'RLS19-DECISIONPACK';
const REPORTING_PERIOD = 'RLS19-PERIOD';

describe.skipIf(!ready)(
  'RLS-19 — buildDecisionPackStatusView() against real analytics.decision_pack_version rows',
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
        [TENANT_CODE, 'RLS-19 Decision Pack View Reference Tenant'],
      );
      tenantId = tenantResult.rows[0].id;

      // Clean slate for this tenant's own fixture rows.
      await client.query(`DELETE FROM analytics.decision_pack_version WHERE tenant_id = $1`, [tenantId]);
    });

    afterAll(async () => {
      if (!client) return;
      await client.query(`DELETE FROM analytics.decision_pack_version WHERE tenant_id = $1`, [tenantId]);
      await client.query(`DELETE FROM analytics.tenant WHERE tenant_code = $1`, [TENANT_CODE]);
      await client.end();
    });

    it('no decision_pack_version row exists — view reports hasDecisionPack: false, status: null', async () => {
      const versions = await client.query<DecisionPackVersionStatusRow>(
        `SELECT status, created_at FROM analytics.decision_pack_version WHERE tenant_id = $1`,
        [tenantId],
      );
      const view = buildDecisionPackStatusView(versions.rows);
      expect(view).toEqual({ hasDecisionPack: false, status: null });
    });

    it('multi-version selection rule — the LATEST version by created_at wins, not the first/oldest one, not an arbitrary row', async () => {
      // Insert an OLDER version first, already 'ready' (would incorrectly
      // win if the selection rule were "first row" or "any ready row"
      // instead of genuinely latest-by-created_at).
      await client.query(
        `INSERT INTO analytics.decision_pack_version
           (tenant_id, version_id, reporting_period, status, created_at)
         VALUES ($1, 'rls19-v1', $2, 'ready', now() - interval '2 days')`,
        [tenantId, REPORTING_PERIOD],
      );
      // Insert a NEWER version, still 'draft' — the correct "latest" row.
      await client.query(
        `INSERT INTO analytics.decision_pack_version
           (tenant_id, version_id, reporting_period, status, created_at)
         VALUES ($1, 'rls19-v2', $2, 'draft', now())`,
        [tenantId, REPORTING_PERIOD],
      );

      const versions = await client.query<DecisionPackVersionStatusRow>(
        `SELECT status, created_at FROM analytics.decision_pack_version WHERE tenant_id = $1`,
        [tenantId],
      );
      expect(versions.rows.length).toBe(2);

      const view = buildDecisionPackStatusView(versions.rows);
      expect(view.hasDecisionPack).toBe(true);
      // If the older 'ready' version had incorrectly won, this would be 'ready' instead.
      expect(view.status).toBe('draft');
    });

    it('latest version is ready — view reports status: ready (the caller\'s own "=== \'ready\'" check)', async () => {
      await client.query(
        `UPDATE analytics.decision_pack_version SET status = 'ready'
         WHERE tenant_id = $1 AND created_at = (SELECT max(created_at) FROM analytics.decision_pack_version WHERE tenant_id = $1)`,
        [tenantId],
      );

      const versions = await client.query<DecisionPackVersionStatusRow>(
        `SELECT status, created_at FROM analytics.decision_pack_version WHERE tenant_id = $1`,
        [tenantId],
      );
      const view = buildDecisionPackStatusView(versions.rows);
      expect(view.hasDecisionPack).toBe(true);
      expect(view.status).toBe('ready');
    });
  },
);
