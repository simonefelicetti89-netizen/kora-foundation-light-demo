/**
 * RLS-14 — Contribution (commons.contribution_event) tenant_kind parity DB test
 * (direct Postgres, local Supabase)
 *
 * WHAT THIS IS:
 *   A LIVE proof that the B-TRUTH Contribution protected port
 *   (getContributionV2Live, services/kora-contribution/KoraContributionService.ts)
 *   reads and computes an identical ContributionSummary.v2 output for a
 *   DEMO-kind tenant and a LIVE-kind tenant, given identical underlying
 *   commons.contribution_event + commons.post rows. The query itself never
 *   references tenant_kind — this test proves that at the DB level, not
 *   just in the route's source text.
 *
 * WHY THIS MATTERS (ONE PRODUCT / NO DEMO RUNTIME, Patch 03):
 *   The B-TRUTH Contribution protected port (2026-09-01) retired
 *   KoraContributionService.getSummaryV2() (synthetic JSON seed input) in
 *   favor of getContributionV2Live(), which reads real
 *   commons.contribution_event + commons.post rows via
 *   lib/kora-contribution/contribution-pipeline-input.ts. This is the
 *   concrete DB-level proof that the replacement is genuinely
 *   tenant_kind-blind — the SAME query and the SAME protected methodology
 *   authority (computeContributionV2 / computeFromPipelineResult, both
 *   byte-for-byte unchanged by the port) run for a LIVE or a DEMO-kind
 *   tenant, exactly per Patch 03: tenant_kind may gate operational side
 *   effects only, never product truth.
 *
 * SAME SAFETY MODEL AS RLS-03/11/12/13 (see rls-two-tenant-negative.test.ts's
 * header for the full rationale):
 *   - Skip-safe by default: everything lives inside describe.skipIf(!ready),
 *     ready requires RLS14_PG_URL set AND RLS14_ALLOW_RUN==='true'.
 *   - An always-on static guard hard-blocks known staging/production
 *     project refs and any hosted Supabase domain, and requires a loopback
 *     host, independent of RLS14_ALLOW_RUN.
 *   - Uses a single privileged (non-`authenticated`) connection for both
 *     fixture setup and the assertions themselves — this mirrors what
 *     getContributionV2Live's Supabase server client does when queried by a
 *     tenant-scoped session (RLS applies to the real client; this direct-pg
 *     connection instead proves the DATA and the QUERY SHAPE are identical
 *     for both tenant_kind values, which is the property under test here,
 *     matching RLS-13's own rationale for the same design choice).
 *   - Teardown is scoped strictly to this test's own tenant_code values.
 *
 * REQUIRED ENV VARS:
 *   RLS14_PG_URL     — direct Postgres connection string, local Supabase
 *                      only. Confirm via `supabase status`, e.g.:
 *                        postgresql://postgres:postgres@127.0.0.1:54322/postgres
 *   RLS14_ALLOW_RUN  — must be exactly 'true'.
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import pg from 'pg';
import { buildContributionPipelineInputs, type ContributionEventRow } from '../../lib/kora-contribution/contribution-pipeline-input';
import { KoraContributionService } from '../../services/kora-contribution/KoraContributionService';

const { Client } = pg;

function readEnv(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim().length > 0 ? value : undefined;
}

interface Rls14Config {
  pgUrl: string;
}

function readRls14Config(): Rls14Config | null {
  const pgUrl = readEnv('RLS14_PG_URL');
  if (!pgUrl) return null;
  return { pgUrl };
}

function isRunExplicitlyAllowed(): boolean {
  return readEnv('RLS14_ALLOW_RUN') === 'true';
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
        `RLS14_PG_URL matches a known staging/production project ref. This test must only ` +
          `ever target a local Postgres instance — refusing to proceed.`,
      );
    }
  }
  if (lower.includes('supabase.co') || lower.includes('supabase.com')) {
    throw new Error(
      `RLS14_PG_URL points at a hosted Supabase domain. This test must only target a local ` +
        `Postgres instance (confirm the correct URL via \`supabase status\`) — refusing to proceed.`,
    );
  }

  let hostname: string;
  try {
    hostname = new URL(pgUrl).hostname.toLowerCase();
  } catch {
    throw new Error('RLS14_PG_URL is not a valid connection URL — refusing to proceed.');
  }
  if (!ALLOWED_LOCAL_HOSTS.includes(hostname)) {
    throw new Error(
      `RLS14_PG_URL host "${hostname}" is not a recognized local address ` +
        `(${ALLOWED_LOCAL_HOSTS.join(', ')}). This test must only target a local Supabase ` +
        `Postgres instance — refusing to proceed.`,
    );
  }
}

describe('RLS-14 guard — RLS14_PG_URL must never be a known staging/production/hosted target', () => {
  it('RLS14_PG_URL (if set) is either unset or a local-only Postgres URL', () => {
    const pgUrl = readEnv('RLS14_PG_URL');
    if (!pgUrl) {
      expect(pgUrl).toBeUndefined();
      return;
    }
    expect(() => assertLocalPostgresOnly(pgUrl)).not.toThrow();
  });
});

const config = readRls14Config();
const allowed = isRunExplicitlyAllowed();
const ready = config !== null && allowed;

const RLS14_TENANT_CODES = ['RLS14-LIVE', 'RLS14-DEMO'] as const;

describe.skipIf(!ready)(
  'RLS-14 — commons.contribution_event feeds an identical ContributionSummary.v2 for LIVE and DEMO tenant_kind',
  () => {
    let client: InstanceType<typeof Client>;
    let liveTenantId: string;
    let demoTenantId: string;
    let livePostId: string;
    let demoPostId: string;

    const service = new KoraContributionService();

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
        ['RLS14-LIVE', 'RLS-14 Synthetic Tenant (LIVE)'],
      );
      liveTenantId = liveResult.rows[0].id;

      const demoResult = await client.query<{ id: string }>(
        `INSERT INTO analytics.tenant (tenant_code, company_name, tenant_kind)
         VALUES ($1, $2, 'DEMO')
         ON CONFLICT (tenant_code) DO UPDATE SET company_name = EXCLUDED.company_name, tenant_kind = 'DEMO'
         RETURNING id`,
        ['RLS14-DEMO', 'RLS-14 Synthetic Tenant (DEMO)'],
      );
      demoTenantId = demoResult.rows[0].id;

      await client.query(`DELETE FROM commons.contribution_event WHERE tenant_id = ANY($1)`, [[liveTenantId, demoTenantId]]);
      await client.query(`DELETE FROM commons.post WHERE tenant_id = ANY($1)`, [[liveTenantId, demoTenantId]]);

      const livePostResult = await client.query<{ id: string }>(
        `INSERT INTO commons.post (tenant_id, author_role, title, body, category, pillar, status)
         VALUES ($1, 'COMPANY_ADMIN', 'RLS-14 initiative (LIVE)', 'RLS-14 fixture body', 'initiative_update', 'IMPACT', 'published')
         RETURNING id`,
        [liveTenantId],
      );
      livePostId = livePostResult.rows[0].id;

      const demoPostResult = await client.query<{ id: string }>(
        `INSERT INTO commons.post (tenant_id, author_role, title, body, category, pillar, status)
         VALUES ($1, 'COMPANY_ADMIN', 'RLS-14 initiative (DEMO)', 'RLS-14 fixture body', 'initiative_update', 'IMPACT', 'published')
         RETURNING id`,
        [demoTenantId],
      );
      demoPostId = demoPostResult.rows[0].id;

      for (const [tenantId, postId] of [[liveTenantId, livePostId], [demoTenantId, demoPostId]] as const) {
        await client.query(
          `INSERT INTO commons.contribution_event
             (tenant_id, source_post_id, role, contribution_kind, impact_weight, evidence_status,
              reporting_period, is_cross_company, is_kora_originated, is_kora_enabled)
           VALUES ($1, $2, 'promoter', 'cross_company_participation', 0.80, 'verified',
                   'RLS14-PERIOD', true, false, false)`,
          [tenantId, postId],
        );
      }
    });

    afterAll(async () => {
      if (!client) return;

      const tenantRows = await client.query<{ id: string }>(
        `SELECT id FROM analytics.tenant WHERE tenant_code = ANY($1)`,
        [RLS14_TENANT_CODES as unknown as string[]],
      );
      const ids = tenantRows.rows.map((row) => row.id);

      if (ids.length > 0) {
        await client.query(`DELETE FROM commons.contribution_event WHERE tenant_id = ANY($1)`, [ids]);
        await client.query(`DELETE FROM commons.post WHERE tenant_id = ANY($1)`, [ids]);
        await client.query(`DELETE FROM analytics.tenant WHERE tenant_code = ANY($1)`, [
          RLS14_TENANT_CODES as unknown as string[],
        ]);
      }

      await client.end();
    });

    // Mirrors exactly the query getContributionV2Live()
    // (services/kora-contribution/KoraContributionService.ts) runs — same
    // columns, same tables, no tenant_kind reference.
    async function fetchContributionInputs(tenantId: string): Promise<ReturnType<typeof buildContributionPipelineInputs>> {
      const eventsResult = await client.query(
        `SELECT source_post_id, contribution_kind, impact_weight, evidence_status,
                is_cross_company, is_kora_originated, is_kora_enabled
         FROM commons.contribution_event
         WHERE tenant_id = $1`,
        [tenantId],
      );
      const rows = eventsResult.rows as ContributionEventRow[];

      const postIds = [...new Set(rows.map((r) => r.source_post_id))];
      const pillarByPostId = new Map<string, string | null>();
      if (postIds.length > 0) {
        const postsResult = await client.query<{ id: string; pillar: string | null }>(
          `SELECT id, pillar FROM commons.post WHERE id = ANY($1)`,
          [postIds],
        );
        for (const p of postsResult.rows) pillarByPostId.set(p.id, p.pillar);
      }

      return buildContributionPipelineInputs(rows, pillarByPostId);
    }

    it('LIVE tenant: the fixture row is written and read back as an eligible ContributionPipelineInput', async () => {
      const inputs = await fetchContributionInputs(liveTenantId);
      expect(inputs).toHaveLength(1);
      expect(inputs[0].impact_units_total).toBe(0.80);
      expect(inputs[0].primary_pillar).toBe('IMPACT');
      expect(inputs[0].event_nature).toBe('collective_initiative');
    });

    it('DEMO tenant: the fixture row is written and read back identically to LIVE', async () => {
      const inputs = await fetchContributionInputs(demoTenantId);
      expect(inputs).toHaveLength(1);
      expect(inputs[0].impact_units_total).toBe(0.80);
      expect(inputs[0].primary_pillar).toBe('IMPACT');
      expect(inputs[0].event_nature).toBe('collective_initiative');
    });

    it('computeFromPipelineResult (the protected, unchanged methodology authority) produces an identical v2 output for both tenant_kind values', async () => {
      const liveInputs = await fetchContributionInputs(liveTenantId);
      const demoInputs = await fetchContributionInputs(demoTenantId);

      const liveSummary = service.computeFromPipelineResult('RLS14-LIVE', 'S1', liveInputs);
      const demoSummary = service.computeFromPipelineResult('RLS14-DEMO', 'S1', demoInputs);

      expect(liveSummary.v2).toEqual(demoSummary.v2);
      expect(liveSummary.contributionScore).toEqual(demoSummary.contributionScore);
      expect(liveSummary.totalContributionIU).toEqual(demoSummary.totalContributionIU);
      expect(liveSummary.notKoraIndexComponent).toBe(true);
      expect(demoSummary.notKoraIndexComponent).toBe(true);
    });

    it('the raw column set returned is identical for both — no tenant_kind-conditional column ever appears', async () => {
      const liveInputs = await fetchContributionInputs(liveTenantId);
      const demoInputs = await fetchContributionInputs(demoTenantId);
      expect(Object.keys(liveInputs[0]).sort()).toEqual(Object.keys(demoInputs[0]).sort());
    });
  },
);
