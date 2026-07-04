/**
 * RLS-05 — Synthetic Worker-vs-Worker Negative DB Test (direct Postgres, local Supabase)
 *
 * WHAT THIS IS:
 *   A LIVE proof that Postgres Row Level Security policies — not app code,
 *   not PostgREST — reject one worker reading another worker's individual
 *   rows, even within the SAME tenant/company. It connects directly to a
 *   local Supabase Postgres instance with `pg`, opens a transaction per
 *   assertion, and simulates the exact session GUCs PostgREST would set for
 *   an authenticated WORKER request (`request.jwt.claims`, including `sub`
 *   so `auth.uid()` resolves), then runs the same query the RLS policy
 *   itself is written against.
 *
 * RELATIONSHIP TO RLS-03 / RLS-04:
 *   - RLS-03 (tests/integration/rls-two-tenant-negative.test.ts) proves
 *     tenant-vs-tenant isolation on analytics.* tables using tenant-scoped
 *     policies (`kora.tenant_id()`). It explicitly excluded personal.* —
 *     this file closes that gap.
 *   - RLS-04 (tests/unit/rls04-app-api-tenant-enforcement.test.ts) proves,
 *     statically, that app/api/worker/** routes derive workerId/tenantId
 *     only from session app_metadata, never from client input. This file
 *     is the live-DB counterpart for the two personal.* tables in scope
 *     below — proving Postgres itself, not just the route source code,
 *     rejects a cross-worker read.
 *   - This is NOT a browser/E2E test and does NOT construct a Supabase Auth
 *     session — same rationale as RLS-03 (see that file's header).
 *
 * CLAIMS SHAPE — inspected directly from the live migrations before writing
 * this test:
 *   - kora.kora_role() — supabase/migrations/004_gate3a_claims_and_grants.sql
 *     — reads request.jwt.claims->'app_metadata'->>'kora_role' (canonical,
 *     matches lib/auth/kora-session.ts).
 *   - auth.uid() — Supabase's own built-in function (not defined in this
 *     repo's migrations — bootstrapped by the local Supabase Postgres
 *     image). Reads the `sub` claim from `request.jwt.claims` (or the
 *     `request.jwt.claim.sub` GUC). Every WORKER-scoped RLS policy in scope
 *     below compares a table column to `auth.uid()` directly or via a
 *     `personal.worker_identity` subquery on `auth_user_id = auth.uid()` —
 *     see supabase/migrations/007_worker_provisioning.sql and
 *     018_worker_pib.sql. No `kora.worker_id()` helper exists (confirmed by
 *     grep — supabase/migrations/011_worker_cv_share.sql notes its absence
 *     explicitly); workerId is never read from a dedicated claim, always
 *     resolved via `auth.uid()` → `personal.worker_identity.auth_user_id`.
 *   This test therefore simulates claims as:
 *     {
 *       "sub": "<worker's fabricated auth_user_id UUID>",
 *       "app_metadata": { "kora_role": "WORKER", "kora_tenant_id": "<tenant uuid>" }
 *     }
 *
 * TABLE SCOPE (chosen per Task B criteria — worker-level ownership field,
 * WORKER-self-only policy, safe/simple fixture, no complex pipeline data):
 *   IN:  personal.worker_identity (mig 007) — simplest policy, direct
 *        `auth_user_id = auth.uid()` comparison, the root identity row every
 *        other worker-individual table hangs off of.
 *        personal.worker_pib (mig 018) — the flagship "worker owns their
 *        impact data" guarantee (CLAUDE.md §17, docs/access-matrix.md), and
 *        representative of the more common subquery pattern
 *        (`worker_identity_id IN (SELECT id FROM personal.worker_identity
 *        WHERE auth_user_id = auth.uid())`) also used by
 *        worker_profile_private, worker_initiative, worker_participation,
 *        and worker_cv_share.
 *   OUT (explicitly, not this file):
 *        personal.worker_pseudonym_map — zero application access for ANY
 *        role, including WORKER itself (system/SECURITY DEFINER only per
 *        mig 017/027) — there is no WORKER-self policy to test here.
 *        personal.worker_profile_private, worker_initiative,
 *        worker_participation, worker_cv_share, uploaded_record_attendee —
 *        same subquery pattern as worker_pib, already representatively
 *        covered; deferred to a future sprint if per-table live proof is
 *        ever required rather than pattern-level proof.
 *        analytics.uef_record, analytics.impact_unit — worker-linked but
 *        require a full source_batch/UEF pipeline fixture; out of scope for
 *        a minimal worker-isolation proof (see Task B "stop and report"
 *        instruction — a real pipeline fixture was judged unnecessary
 *        complexity for what this sprint needs to prove).
 *        analytics.tenant (WORKER SELECT policy, mig 022) — tenant-level,
 *        not worker-vs-worker; would only prove the same thing RLS-03
 *        already proves for a different table.
 *
 * WHAT THIS DOES NOT PROVE:
 *   GoTrue/Supabase Auth sign-in (claims are simulated via transaction-local
 *   GUCs, not a real signed-in session); PostgREST schema-exposure
 *   correctness (this test never goes through PostgREST); browser/
 *   authenticated E2E flows; company-vs-worker isolation (that's the
 *   `worker_identity`/`worker_pib` COMPANY_ADMIN row absence, already
 *   covered statically by tests/unit/worker-pib-privacy.test.ts and
 *   docs/access-matrix.md — no COMPANY_ADMIN policy exists on either table
 *   at all, so there is nothing to simulate here); any table outside the
 *   two listed above.
 *
 * SAFETY MODEL (mirrors RLS-03 exactly — read that file's header for the
 * full rationale if unfamiliar):
 *   - Fully skip-safe: everything lives inside `describe.skipIf(!ready)`,
 *     where `ready` requires RLS05_PG_URL to be set AND RLS05_ALLOW_RUN
 *     to be exactly 'true'. Neither set (default repo state) → zero DB
 *     connections, tests register as skipped.
 *   - A separate, ALWAYS-ON guard hard-blocks known staging/production
 *     project refs and any hosted Supabase domain, and requires a loopback
 *     host (127.0.0.1/localhost/::1), independent of RLS05_ALLOW_RUN.
 *   - Uses ONLY RLS05_PG_URL / RLS05_ALLOW_RUN. Never reads
 *     NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, DATABASE_URL, any
 *     E2E_* var, RLS03_* vars, or any Vercel env var.
 *   - Creates and tears down its OWN fixture data (1 synthetic tenant
 *     tagged tenant_kind='TEST', tenant_code 'RLS05-TENANT', two synthetic
 *     worker_identity rows worker_ref RLS05-WORKER-A/B with fabricated
 *     (non-Supabase-Auth) auth_user_id UUIDs, and a handful of worker_pib
 *     rows tagged reporting_period='RLS05-SYNTHETIC') using the connection's
 *     own privileged, local-only Postgres role. RLS is bypassed for
 *     fixture setup/teardown the same way a Postgres superuser naturally
 *     bypasses RLS, and re-enabled per-assertion via
 *     `SET LOCAL ROLE authenticated`. No Supabase Auth user is created —
 *     `auth_user_id` has no FK to `auth.users` (confirmed in mig 007), and
 *     `auth.uid()` only reads the transaction-local claims GUC, so a real
 *     signed-in session is never needed.
 *   - Teardown is scoped STRICTLY to rows matching this file's own
 *     worker_ref/tenant_code tags — never a blanket delete. If a prior run
 *     crashed mid-way, `beforeAll` cleans up its own leftover rows (matched
 *     by the same tags) before inserting fresh ones, so re-runs never
 *     accumulate duplicates and cleanup never has to guess which rows are
 *     "ambiguously" its own.
 *
 * REQUIRED ENV VARS:
 *   RLS05_PG_URL     — a direct Postgres connection string to a LOCAL
 *                      Supabase instance only (see the loopback-host guard
 *                      above). Confirm the real value via `supabase status`
 *                      rather than assuming this default:
 *                        postgresql://postgres:postgres@127.0.0.1:54322/postgres
 *   RLS05_ALLOW_RUN  — must be exactly 'true'.
 *   Both values live only in a gitignored .env.rls05.local (or exported
 *   directly in the shell for a single command) — never in .env.local,
 *   .env.staging.local, or any committed file. `.env*` is already
 *   gitignored repo-wide.
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import pg from 'pg';

const { Client } = pg;

// ── Env reading — never returns/logs a raw value, only presence. ────────────

function readEnv(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim().length > 0 ? value : undefined;
}

interface Rls05Config {
  pgUrl: string;
}

function readRls05Config(): Rls05Config | null {
  const pgUrl = readEnv('RLS05_PG_URL');
  if (!pgUrl) return null;
  return { pgUrl };
}

/** RLS05_ALLOW_RUN is a deliberate second gate, distinct from URL presence. */
function isRunExplicitlyAllowed(): boolean {
  return readEnv('RLS05_ALLOW_RUN') === 'true';
}

// ── Hard denylist + local-only allowlist ─────────────────────────────────────
// Same list as RLS-03 (tests/integration/rls-two-tenant-negative.test.ts) —
// these are Supabase PROJECT REFS that must never be a valid target for a
// direct-Postgres test, regardless of what env var points at them.
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
        `RLS05_PG_URL matches a known staging/production project ref. This test must only ` +
          `ever target a local Postgres instance — refusing to proceed.`,
      );
    }
  }
  if (lower.includes('supabase.co') || lower.includes('supabase.com')) {
    throw new Error(
      `RLS05_PG_URL points at a hosted Supabase domain. This test must only target a local ` +
        `Postgres instance (confirm the correct URL via \`supabase status\`) — refusing to proceed.`,
    );
  }

  let hostname: string;
  try {
    hostname = new URL(pgUrl).hostname.toLowerCase();
  } catch {
    throw new Error('RLS05_PG_URL is not a valid connection URL — refusing to proceed.');
  }
  if (!ALLOWED_LOCAL_HOSTS.includes(hostname)) {
    throw new Error(
      `RLS05_PG_URL host "${hostname}" is not a recognized local address ` +
        `(${ALLOWED_LOCAL_HOSTS.join(', ')}). This test must only target a local Supabase ` +
        `Postgres instance — refusing to proceed.`,
    );
  }
}

// ── Always-on static guard (never skipped, no network call ever made here) ──

describe('RLS-05 guard — RLS05_PG_URL must never be a known staging/production/hosted target', () => {
  it('RLS05_PG_URL (if set) is either unset or a local-only Postgres URL', () => {
    const pgUrl = readEnv('RLS05_PG_URL');
    if (!pgUrl) {
      expect(pgUrl).toBeUndefined();
      return;
    }
    expect(() => assertLocalPostgresOnly(pgUrl)).not.toThrow();
  });
});

// ── Main suite gate ───────────────────────────────────────────────────────────

const config = readRls05Config();
const allowed = isRunExplicitlyAllowed();
const ready = config !== null && allowed;

const RLS05_TENANT_CODE = 'RLS05-TENANT';
const RLS05_WORKER_REFS = ['RLS05-WORKER-A', 'RLS05-WORKER-B'] as const;
const RLS05_REPORTING_PERIOD = 'RLS05-SYNTHETIC';

// Fabricated, non-Supabase-Auth UUIDs — auth_user_id has no FK to auth.users
// (confirmed in supabase/migrations/007_worker_provisioning.sql), and
// auth.uid() only reads the transaction-local claims GUC below, so these
// never need to correspond to a real signed-in user.
const WORKER_A_AUTH_UID = '00000000-0000-4000-a000-000000000a01';
const WORKER_B_AUTH_UID = '00000000-0000-4000-a000-000000000b02';

describe.skipIf(!ready)(
  'RLS-05 — synthetic worker-vs-worker negative DB test (direct Postgres; not RLS-03 tenant-level, not RLS-04 static, not browser E2E)',
  () => {
    let privilegedClient: InstanceType<typeof Client>;
    let tenantId: string;
    let workerAId: string;
    let workerBId: string;

    beforeAll(async () => {
      if (!config) throw new Error('unreachable: beforeAll only runs when describe.skipIf(!ready) has already passed');

      assertLocalPostgresOnly(config.pgUrl);

      // ── Privileged connection — fixture setup/teardown ONLY. RLS is
      // naturally bypassed here (the connecting role is not `authenticated`).
      // The actual isolation assertions below explicitly switch to the
      // `authenticated` role inside their own transaction. ─────────────────
      privilegedClient = new Client({ connectionString: config.pgUrl });
      await privilegedClient.connect();

      // ── Guarded fixture setup — idempotent, scoped to this file's own tags
      const tenantResult = await privilegedClient.query<{ id: string }>(
        `INSERT INTO analytics.tenant (tenant_code, company_name, tenant_kind)
         VALUES ($1, $2, 'TEST')
         ON CONFLICT (tenant_code) DO UPDATE SET company_name = EXCLUDED.company_name
         RETURNING id`,
        [RLS05_TENANT_CODE, 'RLS-05 Synthetic Tenant'],
      );
      tenantId = tenantResult.rows[0].id;

      // Clear any leftover rows from a prior incomplete run (own tags only).
      await privilegedClient.query(
        `DELETE FROM personal.worker_pib
         WHERE reporting_period = $1
           AND worker_identity_id IN (
             SELECT id FROM personal.worker_identity WHERE tenant_id = $2 AND worker_ref = ANY($3)
           )`,
        [RLS05_REPORTING_PERIOD, tenantId, RLS05_WORKER_REFS as unknown as string[]],
      );
      await privilegedClient.query(
        `DELETE FROM personal.worker_identity WHERE tenant_id = $1 AND worker_ref = ANY($2)`,
        [tenantId, RLS05_WORKER_REFS as unknown as string[]],
      );

      const workerAResult = await privilegedClient.query<{ id: string }>(
        `INSERT INTO personal.worker_identity (tenant_id, auth_user_id, worker_ref, status)
         VALUES ($1, $2, $3, 'active')
         RETURNING id`,
        [tenantId, WORKER_A_AUTH_UID, RLS05_WORKER_REFS[0]],
      );
      workerAId = workerAResult.rows[0].id;

      const workerBResult = await privilegedClient.query<{ id: string }>(
        `INSERT INTO personal.worker_identity (tenant_id, auth_user_id, worker_ref, status)
         VALUES ($1, $2, $3, 'active')
         RETURNING id`,
        [tenantId, WORKER_B_AUTH_UID, RLS05_WORKER_REFS[1]],
      );
      workerBId = workerBResult.rows[0].id;

      for (const workerId of [workerAId, workerBId]) {
        await privilegedClient.query(
          `INSERT INTO personal.worker_pib
             (worker_identity_id, reporting_period, pillar, iu_value, verification_status, source_kind)
           VALUES ($1, $2, 'GROWTH', 5.0, 'self_declared', 'worker_declared')`,
          [workerId, RLS05_REPORTING_PERIOD],
        );
      }
    });

    afterAll(async () => {
      if (!privilegedClient) return;

      const workerRows = await privilegedClient.query<{ id: string }>(
        `SELECT id FROM personal.worker_identity WHERE tenant_id = $1 AND worker_ref = ANY($2)`,
        [tenantId, RLS05_WORKER_REFS as unknown as string[]],
      );
      const workerIds = workerRows.rows.map((row) => row.id);

      if (workerIds.length > 0) {
        await privilegedClient.query(`DELETE FROM personal.worker_pib WHERE worker_identity_id = ANY($1)`, [workerIds]);
        await privilegedClient.query(`DELETE FROM personal.worker_identity WHERE id = ANY($1)`, [workerIds]);
      }
      await privilegedClient.query(`DELETE FROM analytics.tenant WHERE tenant_code = $1`, [RLS05_TENANT_CODE]);

      await privilegedClient.end();
    });

    // ── Shared assertion helper ────────────────────────────────────────────
    // Opens its own transaction per call, switches to the `authenticated`
    // role, sets `request.jwt.claims` to the canonical WORKER shape
    // documented in this file's header, runs the query, then ALWAYS rolls
    // back. Every negative assertion below has a positive-control sibling
    // querying the SAME table via the SAME mechanism, so a broken fixture/
    // claims mismatch shows up as a failing positive control, not a
    // falsely-passing negative one.
    async function queryWorkerIdentityAs(actingAuthUid: string, targetWorkerId: string) {
      await privilegedClient.query('BEGIN');
      try {
        await privilegedClient.query('SET LOCAL ROLE authenticated');
        const claims = JSON.stringify({
          sub: actingAuthUid,
          app_metadata: { kora_role: 'WORKER', kora_tenant_id: tenantId },
        });
        await privilegedClient.query(`SELECT set_config('request.jwt.claims', $1, true)`, [claims]);

        const result = await privilegedClient.query(
          `SELECT id, auth_user_id FROM personal.worker_identity WHERE id = $1`,
          [targetWorkerId],
        );
        return { data: result.rows, error: null as Error | null };
      } catch (error) {
        return { data: null, error: error as Error };
      } finally {
        await privilegedClient.query('ROLLBACK');
      }
    }

    async function queryWorkerPibAs(actingAuthUid: string, targetWorkerId: string) {
      await privilegedClient.query('BEGIN');
      try {
        await privilegedClient.query('SET LOCAL ROLE authenticated');
        const claims = JSON.stringify({
          sub: actingAuthUid,
          app_metadata: { kora_role: 'WORKER', kora_tenant_id: tenantId },
        });
        await privilegedClient.query(`SELECT set_config('request.jwt.claims', $1, true)`, [claims]);

        const result = await privilegedClient.query(
          `SELECT id, worker_identity_id FROM personal.worker_pib WHERE worker_identity_id = $1`,
          [targetWorkerId],
        );
        return { data: result.rows, error: null as Error | null };
      } catch (error) {
        return { data: null, error: error as Error };
      } finally {
        await privilegedClient.query('ROLLBACK');
      }
    }

    describe('personal.worker_identity', () => {
      it('Worker A can read own worker_identity row (positive control)', async () => {
        const { data, error } = await queryWorkerIdentityAs(WORKER_A_AUTH_UID, workerAId);
        expect(error).toBeNull();
        expect(data?.length ?? 0).toBe(1);
      });

      it('Worker B can read own worker_identity row (positive control)', async () => {
        const { data, error } = await queryWorkerIdentityAs(WORKER_B_AUTH_UID, workerBId);
        expect(error).toBeNull();
        expect(data?.length ?? 0).toBe(1);
      });

      it('Worker A cannot read Worker B worker_identity row', async () => {
        const { data, error } = await queryWorkerIdentityAs(WORKER_A_AUTH_UID, workerBId);
        // A real RLS block surfaces as zero rows, not a query error.
        expect(error).toBeNull();
        expect(data?.length ?? 0).toBe(0);
      });

      it('Worker B cannot read Worker A worker_identity row', async () => {
        const { data, error } = await queryWorkerIdentityAs(WORKER_B_AUTH_UID, workerAId);
        expect(error).toBeNull();
        expect(data?.length ?? 0).toBe(0);
      });
    });

    describe('personal.worker_pib', () => {
      it('Worker A can read own worker_pib rows (positive control)', async () => {
        const { data, error } = await queryWorkerPibAs(WORKER_A_AUTH_UID, workerAId);
        expect(error).toBeNull();
        expect(data?.length ?? 0).toBeGreaterThan(0);
      });

      it('Worker B can read own worker_pib rows (positive control)', async () => {
        const { data, error } = await queryWorkerPibAs(WORKER_B_AUTH_UID, workerBId);
        expect(error).toBeNull();
        expect(data?.length ?? 0).toBeGreaterThan(0);
      });

      it('Worker A cannot read Worker B worker_pib rows', async () => {
        const { data, error } = await queryWorkerPibAs(WORKER_A_AUTH_UID, workerBId);
        expect(error).toBeNull();
        expect(data?.length ?? 0).toBe(0);
      });

      it('Worker B cannot read Worker A worker_pib rows', async () => {
        const { data, error } = await queryWorkerPibAs(WORKER_B_AUTH_UID, workerAId);
        expect(error).toBeNull();
        expect(data?.length ?? 0).toBe(0);
      });
    });
  },
);
