/**
 * RLS-03 — Synthetic Two-Tenant Negative DB Test (direct Postgres, local Supabase)
 *
 * WHAT THIS IS:
 *   A LIVE proof that Postgres Row Level Security policies — not app code,
 *   not PostgREST — reject cross-tenant reads. It connects directly to a
 *   local Supabase Postgres instance with `pg`, opens a transaction per
 *   assertion, and simulates the exact session GUC PostgREST would set for
 *   an authenticated request (`request.jwt.claims`), then runs the same
 *   query the RLS policy itself is written against.
 *
 * WHY THIS REPLACED THE POSTGREST/@supabase/supabase-js VERSION:
 *   The original RLS-03C skeleton used `@supabase/supabase-js` and
 *   `.schema('analytics').from(table)`, which only works if `analytics` is
 *   listed in the target project's exposed-schemas config (see git history
 *   of this file / docs/RLS_03_THROWAWAY_SUPABASE_CHECKLIST.md). Exposing
 *   `analytics` (and eventually `personal`/`commons`/`gov`/`audit`/`network`)
 *   via PostgREST is a separate, security-relevant decision that should never
 *   be made just to make this test easier to run. Testing directly against
 *   Postgres removes that dependency entirely: RLS is enforced by Postgres
 *   itself regardless of what any API layer chooses to expose.
 *
 * WHAT THIS IS NOT:
 *   - NOT tests/unit/rls-policy-inventory.test.ts (RLS-02). That test parses
 *     migration SQL text — it proves nothing about live database behavior.
 *   - NOT a browser/E2E test. RLS-04/RLS-05 (tests/e2e/, Playwright) drive
 *     the actual Next.js app/UI as authenticated users.
 *   - NOT a proof that GoTrue/Supabase Auth sign-in works, and NOT a proof
 *     that PostgREST's own schema-exposure config is correct. This file
 *     never constructs a Supabase Auth session and never issues an HTTP
 *     request — it fabricates the `request.jwt.claims` GUC directly inside
 *     a Postgres transaction, the same value PostgREST would set after
 *     verifying a real JWT. Whether GoTrue can actually issue that JWT, and
 *     whether PostgREST is configured to expose the schema at all, are
 *     separate concerns covered elsewhere (RLS-03F user provisioning,
 *     RLS-04/05 authenticated browser flows).
 *
 * CLAIMS SHAPE — inspected directly from the live migrations before writing
 * this test (do not change without re-checking the current canonical
 * definitions, since earlier migrations of the same functions used a
 * slightly different shape):
 *   - kora.kora_role() — canonical definition in
 *     supabase/migrations/004_gate3a_claims_and_grants.sql — reads, in order:
 *       1. request.jwt.claims->>'kora_role'                 (top-level, unused today)
 *       2. request.jwt.claims->'app_metadata'->>'kora_role'  (CANONICAL — matches
 *          lib/auth/kora-session.ts, which reads kora_role from user.app_metadata only)
 *       3. default 'anonymous'
 *   - kora.tenant_id() — canonical definition in
 *     supabase/migrations/006_canonical_tenant_key.sql — reads, in order:
 *       1. request.jwt.claims->>'kora_tenant_id'                    (top-level, unused today)
 *       2. request.jwt.claims->'app_metadata'->>'kora_tenant_id'    (CANONICAL — matches
 *          lib/auth/kora-session.ts's getTenantId())
 *       3. request.jwt.claims->'app_metadata'->>'tenant_id'         (legacy fallback)
 *   This test therefore simulates claims as:
 *     { "app_metadata": { "kora_role": "COMPANY_ADMIN", "kora_tenant_id": "<uuid>" } }
 *   `auth.uid()` / a `sub` claim is deliberately NOT simulated: none of the
 *   policies on the four tables in scope below reference auth.uid() — only
 *   worker-individual tables under personal.* do, and those are explicitly
 *   out of scope here (reserved for RLS-05).
 *
 * SAFETY MODEL (read before touching this file):
 *   - Fully skip-safe: every functional test in this file lives inside a
 *     single `describe.skipIf(!ready)` block, where `ready` requires
 *     RLS03_PG_URL to be set AND RLS03_ALLOW_RUN==='true'. With neither set
 *     (the default state of this repo), nothing in this file opens a
 *     database connection; `npm test` sees this file, registers its test
 *     names as skipped, and runs zero of their bodies.
 *   - No `pg` client is ever constructed at module top level — only inside
 *     the guarded `beforeAll` below, which itself only runs when the
 *     describe.skipIf gate above it has already passed.
 *   - A separate, ALWAYS-ON guard (further down, outside the skip gate)
 *     hard-blocks known staging/production project refs AND any hosted
 *     Supabase domain the moment RLS03_PG_URL is set to one — even if
 *     RLS03_ALLOW_RUN is not set. This test is local-only by design: the
 *     guard additionally requires the connection host to be a loopback
 *     address (127.0.0.1 / localhost / ::1), not just "not a known bad
 *     ref" — a direct DB connection string bypasses PostgREST's own
 *     project-level access controls entirely, so this test must never be
 *     pointed at anything other than a local Postgres instance.
 *   - Uses ONLY the RLS03_PG_URL / RLS03_ALLOW_RUN env vars. Never reads
 *     NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, DATABASE_URL, any
 *     E2E_* var, or any Vercel env var.
 *   - This test creates and tears down its OWN fixture data (2 synthetic
 *     tenants tagged tenant_kind='TEST', tenant_code RLS03-A/RLS03-B, plus a
 *     handful of analytics rows) using the connection's own (privileged,
 *     local-only) Postgres role — RLS is bypassed for fixture setup/
 *     teardown the same way a Postgres superuser naturally bypasses RLS,
 *     and re-enabled per-assertion via `SET LOCAL ROLE authenticated`. It
 *     does **not** create or use any Supabase Auth user — sign-in is not
 *     needed at all under the direct-DB approach, since claims are
 *     fabricated directly as a transaction-local GUC.
 *
 * TABLE SCOPE (unchanged from the original PostgREST version — see
 * docs/RLS_03_THROWAWAY_SUPABASE_CHECKLIST.md §E for why):
 *   IN:  analytics.tenant, analytics.source_batch, analytics.kora_index_result,
 *        analytics.activation_result.
 *   OUT (explicitly, never touched here): personal.* (all worker-individual
 *        tables — reserved for RLS-05), analytics.uef_record (no direct
 *        COMPANY_ADMIN policy exists on it), commons.* (commons.post has a
 *        deliberate cross-tenant WORKER policy — needs its own dedicated
 *        test), gov.*, audit.*, network.* (not tenant-scoped), and anything
 *        under KORA Link (frozen, out of scope — supabase/proposed/034-036).
 *
 * REQUIRED ENV VARS:
 *   RLS03_PG_URL     — a direct Postgres connection string to a LOCAL
 *                      Supabase instance only (see the loopback-host guard
 *                      above). Example only, confirm the real value via
 *                      `supabase status` rather than assuming this default:
 *                        postgresql://postgres:postgres@127.0.0.1:54322/postgres
 *   RLS03_ALLOW_RUN  — must be exactly 'true'.
 *   Both values live only in a gitignored .env.rls03.local — never in
 *   .env.local, .env.staging.local, or any committed file.
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import pg from 'pg';

const { Client } = pg;

// ── Env reading — never returns/logs a raw value, only presence. ────────────

function readEnv(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim().length > 0 ? value : undefined;
}

interface Rls03Config {
  pgUrl: string;
}

function readRls03Config(): Rls03Config | null {
  const pgUrl = readEnv('RLS03_PG_URL');
  if (!pgUrl) return null;
  return { pgUrl };
}

/** RLS03_ALLOW_RUN is a deliberate second gate, distinct from URL presence. */
function isRunExplicitlyAllowed(): boolean {
  return readEnv('RLS03_ALLOW_RUN') === 'true';
}

// ── Hard denylist + local-only allowlist ─────────────────────────────────────
// Sourced from docs/ENVIRONMENT_SAFETY_CHECK.md and
// docs/archive/gate2/GATE2_STAGING_APP_ENV_WIRING.md. These are Supabase
// PROJECT REFS — the subdomain segment of a project's URL — listed again
// here only so this guard can hard-block ever targeting them, regardless of
// what RLS03_PG_URL is set to.
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
        `RLS03_PG_URL matches a known staging/production project ref. This test must only ` +
          `ever target a local Postgres instance — refusing to proceed. See ` +
          `docs/RLS_03_THROWAWAY_SUPABASE_CHECKLIST.md §B.`,
      );
    }
  }
  if (lower.includes('supabase.co') || lower.includes('supabase.com')) {
    throw new Error(
      `RLS03_PG_URL points at a hosted Supabase domain. This test must only target a local ` +
        `Postgres instance (confirm the correct URL via \`supabase status\`) — refusing to proceed.`,
    );
  }

  let hostname: string;
  try {
    hostname = new URL(pgUrl).hostname.toLowerCase();
  } catch {
    throw new Error('RLS03_PG_URL is not a valid connection URL — refusing to proceed.');
  }
  if (!ALLOWED_LOCAL_HOSTS.includes(hostname)) {
    throw new Error(
      `RLS03_PG_URL host "${hostname}" is not a recognized local address ` +
        `(${ALLOWED_LOCAL_HOSTS.join(', ')}). This test must only target a local Supabase ` +
        `Postgres instance — refusing to proceed.`,
    );
  }
}

// ── Always-on static guard (never skipped, no network call ever made here) ──
// Runs unconditionally, independent of RLS03_ALLOW_RUN — so a misconfigured
// RLS03_PG_URL fails LOUDLY the moment it's set to a known-bad or non-local
// target, rather than silently skipping alongside everything else below.

describe('RLS-03 guard — RLS03_PG_URL must never be a known staging/production/hosted target', () => {
  it('RLS03_PG_URL (if set) is either unset or a local-only Postgres URL', () => {
    const pgUrl = readEnv('RLS03_PG_URL');
    if (!pgUrl) {
      // Nothing configured in this environment — nothing to guard against.
      expect(pgUrl).toBeUndefined();
      return;
    }
    expect(() => assertLocalPostgresOnly(pgUrl)).not.toThrow();
  });
});

// ── Main suite gate ───────────────────────────────────────────────────────────

const config = readRls03Config();
const allowed = isRunExplicitlyAllowed();
const ready = config !== null && allowed;

const RLS03_TENANT_CODES = ['RLS03-A', 'RLS03-B'] as const;
const RLS03_REPORTING_PERIOD = 'RLS03-SYNTHETIC';
const RLS03_TABLES = ['kora_index_result', 'source_batch', 'activation_result'] as const;
type Rls03Table = (typeof RLS03_TABLES)[number];

describe.skipIf(!ready)(
  'RLS-03 — synthetic two-tenant negative DB test (direct Postgres; not RLS-02 static, not browser E2E)',
  () => {
    let privilegedClient: InstanceType<typeof Client>;
    let tenantAId: string;
    let tenantBId: string;

    beforeAll(async () => {
      // `ready` guarantees `config` is non-null here.
      if (!config) throw new Error('unreachable: beforeAll only runs when describe.skipIf(!ready) has already passed');

      // Defense in depth — the always-on guard above already covers this,
      // but a client must never be constructed even if that guard were ever
      // removed or refactored.
      assertLocalPostgresOnly(config.pgUrl);

      // ── Privileged connection — fixture setup/teardown ONLY. RLS is
      // naturally bypassed here (the connecting role is not `authenticated`),
      // matching how a Postgres superuser bypasses RLS. Never used for the
      // actual tenant-isolation assertions below — those explicitly switch
      // to the `authenticated` role inside their own transaction. ──────────
      privilegedClient = new Client({ connectionString: config.pgUrl });
      await privilegedClient.connect();

      // ── Guarded fixture setup ──────────────────────────────────────────
      // Tenant upsert is idempotent (ON CONFLICT on tenant_code); the
      // analytics rows below are made idempotent by delete-then-insert
      // scoped to this test's own tenant ids and RLS03_REPORTING_PERIOD
      // tag, so re-running this suite never accumulates duplicate rows even
      // if a prior afterAll didn't complete (e.g. a crashed process).
      const tenantAResult = await privilegedClient.query<{ id: string }>(
        `INSERT INTO analytics.tenant (tenant_code, company_name, tenant_kind)
         VALUES ($1, $2, 'TEST')
         ON CONFLICT (tenant_code) DO UPDATE SET company_name = EXCLUDED.company_name
         RETURNING id`,
        ['RLS03-A', 'RLS-03 Synthetic Tenant A'],
      );
      tenantAId = tenantAResult.rows[0].id;

      const tenantBResult = await privilegedClient.query<{ id: string }>(
        `INSERT INTO analytics.tenant (tenant_code, company_name, tenant_kind)
         VALUES ($1, $2, 'TEST')
         ON CONFLICT (tenant_code) DO UPDATE SET company_name = EXCLUDED.company_name
         RETURNING id`,
        ['RLS03-B', 'RLS-03 Synthetic Tenant B'],
      );
      tenantBId = tenantBResult.rows[0].id;

      // Clear any leftover rows from a prior incomplete run, then insert fresh.
      await privilegedClient.query(
        `DELETE FROM analytics.kora_index_result WHERE tenant_id = ANY($1) AND reporting_period = $2`,
        [[tenantAId, tenantBId], RLS03_REPORTING_PERIOD],
      );
      await privilegedClient.query(
        `DELETE FROM analytics.activation_result WHERE tenant_id = ANY($1) AND reporting_period = $2`,
        [[tenantAId, tenantBId], RLS03_REPORTING_PERIOD],
      );
      await privilegedClient.query(
        `DELETE FROM analytics.source_batch WHERE tenant_id = ANY($1) AND reporting_period = $2`,
        [[tenantAId, tenantBId], RLS03_REPORTING_PERIOD],
      );

      for (const tenantId of [tenantAId, tenantBId]) {
        await privilegedClient.query(
          `INSERT INTO analytics.source_batch (tenant_id, source_type, reporting_period)
           VALUES ($1, 'manual', $2)`,
          [tenantId, RLS03_REPORTING_PERIOD],
        );

        await privilegedClient.query(
          `INSERT INTO analytics.kora_index_result
             (tenant_id, reporting_period, methodology_version_id, kora_index_value,
              safeguard_status, calibration_status, is_current)
           VALUES ($1, $2, 'KORA Methodology v0.1', 50.0, 'CLEAR', 'pre_empirical_calibration', true)`,
          [tenantId, RLS03_REPORTING_PERIOD],
        );

        await privilegedClient.query(
          `INSERT INTO analytics.activation_result
             (tenant_id, reporting_period, methodology_version_id, calibration_status)
           VALUES ($1, $2, 'KORA Methodology v0.1', 'pre_empirical_calibration')`,
          [tenantId, RLS03_REPORTING_PERIOD],
        );
      }
    });

    afterAll(async () => {
      // Guarded behind the same run gate as everything else in this describe
      // block (afterAll only executes if beforeAll executed). Teardown is
      // scoped STRICTLY to this test's own tenant codes — never a blanket
      // delete of any table.
      if (!privilegedClient) return;

      const tenantRows = await privilegedClient.query<{ id: string }>(
        `SELECT id FROM analytics.tenant WHERE tenant_code = ANY($1)`,
        [RLS03_TENANT_CODES as unknown as string[]],
      );
      const ids = tenantRows.rows.map((row) => row.id);

      if (ids.length > 0) {
        await privilegedClient.query(`DELETE FROM analytics.kora_index_result WHERE tenant_id = ANY($1)`, [ids]);
        await privilegedClient.query(`DELETE FROM analytics.activation_result WHERE tenant_id = ANY($1)`, [ids]);
        await privilegedClient.query(`DELETE FROM analytics.source_batch WHERE tenant_id = ANY($1)`, [ids]);
        await privilegedClient.query(`DELETE FROM analytics.tenant WHERE tenant_code = ANY($1)`, [
          RLS03_TENANT_CODES as unknown as string[],
        ]);
      }

      await privilegedClient.end();
    });

    // ── Shared assertion helper ────────────────────────────────────────────
    // Opens its own transaction per call, switches to the `authenticated`
    // role (the same role PostgREST uses for a signed-in request), sets the
    // `request.jwt.claims` GUC to the canonical shape documented in this
    // file's header, runs the query, then ALWAYS rolls back — so no
    // assertion can leave the role/claims setting or any data change beyond
    // this transaction's boundary. `0 rows alone is not enough unless the
    // matching positive control also passes` (see
    // docs/RLS_03_THROWAWAY_SUPABASE_CHECKLIST.md §F) — every negative
    // assertion below has a positive-control sibling querying the SAME
    // table via the SAME mechanism, so a broken fixture/claims mismatch
    // shows up as a failing positive control, not a falsely-passing
    // negative one.
    async function queryAsTenant(actingTenantId: string, table: Rls03Table, targetTenantId: string) {
      if (!RLS03_TABLES.includes(table)) {
        throw new Error(`Refusing to query unrecognized table "${table}" — not in RLS03_TABLES allowlist.`);
      }

      await privilegedClient.query('BEGIN');
      try {
        await privilegedClient.query('SET LOCAL ROLE authenticated');

        const claims = JSON.stringify({
          app_metadata: { kora_role: 'COMPANY_ADMIN', kora_tenant_id: actingTenantId },
        });
        await privilegedClient.query(`SELECT set_config('request.jwt.claims', $1, true)`, [claims]);

        const result = await privilegedClient.query(
          `SELECT id, tenant_id FROM analytics.${table} WHERE tenant_id = $1`,
          [targetTenantId],
        );
        return { data: result.rows, error: null as Error | null };
      } catch (error) {
        return { data: null, error: error as Error };
      } finally {
        // Always rollback: this helper is read-only by design, and rolling
        // back also resets the role/claims GUC set above for the next call.
        await privilegedClient.query('ROLLBACK');
      }
    }

    for (const table of RLS03_TABLES) {
      describe(`analytics.${table}`, () => {
        it(`Tenant A can read Tenant A analytics.${table} rows (positive control)`, async () => {
          const { data, error } = await queryAsTenant(tenantAId, table, tenantAId);
          expect(error).toBeNull();
          expect(data?.length ?? 0).toBeGreaterThan(0);
        });

        it(`Tenant B can read Tenant B analytics.${table} rows (positive control)`, async () => {
          const { data, error } = await queryAsTenant(tenantBId, table, tenantBId);
          expect(error).toBeNull();
          expect(data?.length ?? 0).toBeGreaterThan(0);
        });

        it(`Tenant A cannot read Tenant B analytics.${table} rows`, async () => {
          const { data, error } = await queryAsTenant(tenantAId, table, tenantBId);
          // A real RLS block surfaces as zero rows, not a query error — an
          // error here would indicate a different failure mode (see
          // docs/RLS_03_THROWAWAY_SUPABASE_CHECKLIST.md §H) and should be
          // investigated, not treated as a pass.
          expect(error).toBeNull();
          expect(data?.length ?? 0).toBe(0);
        });

        it(`Tenant B cannot read Tenant A analytics.${table} rows`, async () => {
          const { data, error } = await queryAsTenant(tenantBId, table, tenantAId);
          expect(error).toBeNull();
          expect(data?.length ?? 0).toBe(0);
        });
      });
    }
  },
);
