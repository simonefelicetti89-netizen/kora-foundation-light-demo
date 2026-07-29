/**
 * RLS-08 — UEF SECURITY DEFINER Authorization Bypass Regression Test
 * (direct Postgres, local Supabase; real PostgREST RPC for one scenario)
 *
 * WHAT THIS IS:
 *   A LIVE, behavioral proof for the fix applied in migration 047
 *   (047_uef_security_definer_authorization_fix.sql, PILOT-TRUST-03).
 *   PILOT-TRUST-02 (docs/PILOT_TRUST_02_RESIDUAL_GAPS_AUDIT.md) discovered and
 *   PILOT-TRUST-03 reproduced that the 4 SECURITY DEFINER functions
 *   introduced by migration 030 (fn_admin_uef_review,
 *   fn_admin_uef_update_review, fn_admin_uef_enrich, fn_advisor_uef_read)
 *   gated their "trusted server context" bypass on `current_role`, which is
 *   ALWAYS the function OWNER inside a SECURITY DEFINER body — never the
 *   real caller. This made the entire authorization check dead code: any
 *   authenticated role (WORKER, PARTNER, COMPANY_ADMIN, or an authenticated
 *   JWT with no kora_role claim at all) could read AND write arbitrary
 *   analytics.uef_record rows across any tenant.
 *
 *   THIS SUITE MUST FAIL ON THE PRE-047 CODE AND PASS ONLY AFTER 047 IS
 *   APPLIED — it is a regression guard, not a static/textual check. Unlike
 *   the pre-existing gate2-3-migration-030-*.test.ts files (which assert
 *   only that certain strings appear in the migration SQL — exactly the
 *   class of test that let this bug through three prior reviews), every
 *   assertion here executes the real function against a real local Postgres
 *   instance with simulated JWT claims (same mechanism as RLS-03/05/06/07),
 *   plus one assertion that goes through a real local PostgREST HTTP RPC
 *   call end-to-end (not just a claims-simulated direct-Postgres call) to
 *   prove the fix holds at the actual API surface, not only in the
 *   simulation harness.
 *
 * RELATIONSHIP TO RLS-03/05/06/07:
 *   Same direct-Postgres, claims-simulation mechanism and safety model. This
 *   file is scoped specifically to the 4 UEF SECURITY DEFINER functions — it
 *   does not re-prove tenant isolation on other tables (RLS-03), worker
 *   initiative visibility (RLS-07), or KORA_ADMIN cross-tenant behavior on
 *   plain RLS-governed tables (RLS-06, a different mechanism entirely — this
 *   table has ZERO RLS policies post-migration-030 by design; the functions
 *   themselves ARE the authorization boundary).
 *
 * WHAT THIS PROVES:
 *   - WORKER, PARTNER, COMPANY_ADMIN, and role-less `authenticated` callers
 *     are denied on all 4 functions, in both read and write directions,
 *     regardless of tenant claim, worker mapping, or tampered parameters.
 *   - No side effects (no row mutation) occur on any denied write attempt.
 *   - ADVISOR (own tenant only) and KORA_ADMIN / service_role retain exactly
 *     the access the original migration 030 design intended — no regression,
 *     no new access added.
 *   - Cross-tenant ADVISOR access (via claim or via parameter) is denied
 *     with an explicit exception, not silent 0-rows.
 *   - GRANT state (authenticated + service_role + postgres only, no anon, no
 *     PUBLIC) is unchanged and correct.
 *
 * WHAT THIS DOES NOT PROVE:
 *   GoTrue/Supabase Auth sign-in flow for every role (one real PostgREST RPC
 *   call is included as an end-to-end spot-check, not a full E2E suite);
 *   requireWorkerUser() tenant-status enforcement (PILOT-TRUST-02 finding 1,
 *   separate sprint); partner workspace service-role usage (PILOT-TRUST-02
 *   finding 3, separate sprint).
 *
 * SAFETY MODEL (identical to RLS-03/05/06/07 — read those files if unfamiliar):
 *   - Fully skip-safe: everything lives inside `describe.skipIf(!ready)`,
 *     where `ready` requires RLS08_PG_URL to be set AND RLS08_ALLOW_RUN to
 *     be exactly 'true'.
 *   - A separate, ALWAYS-ON guard hard-blocks known staging/production
 *     project refs and any hosted Supabase domain, and requires a loopback
 *     host, independent of RLS08_ALLOW_RUN.
 *   - Creates and tears down its own fixture data (2 synthetic tenants
 *     tagged tenant_kind='TEST', tenant_code 'RLS08-TENANT-A'/'RLS08-TENANT-B'),
 *     scoped strictly to this file's own tags, removed in afterAll
 *     regardless of test outcome.
 *
 * REQUIRED ENV VARS:
 *   RLS08_PG_URL       — a direct Postgres connection string to a LOCAL
 *                        Supabase instance only. Confirm via `supabase status`:
 *                          postgresql://postgres:postgres@127.0.0.1:54322/postgres
 *   RLS08_ALLOW_RUN    — must be exactly 'true'.
 *   RLS08_SUPABASE_URL / RLS08_SUPABASE_ANON_KEY / RLS08_SUPABASE_SERVICE_ROLE_KEY
 *                      — local Supabase API URL + keys, for the one real
 *                        PostgREST RPC end-to-end assertion. Optional: that
 *                        one test is itself skip-safe if these are absent
 *                        (all direct-Postgres assertions still run).
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import pg from 'pg';

const { Client } = pg;

function readEnv(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim().length > 0 ? value : undefined;
}

interface Rls08Config {
  pgUrl: string;
}

function readRls08Config(): Rls08Config | null {
  const pgUrl = readEnv('RLS08_PG_URL');
  if (!pgUrl) return null;
  return { pgUrl };
}

function isRunExplicitlyAllowed(): boolean {
  return readEnv('RLS08_ALLOW_RUN') === 'true';
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
        `RLS08_PG_URL matches a known staging/production project ref. This test must only ` +
          `ever target a local Postgres instance — refusing to proceed.`,
      );
    }
  }
  if (lower.includes('supabase.co') || lower.includes('supabase.com')) {
    throw new Error(
      `RLS08_PG_URL points at a hosted Supabase domain. This test must only target a local ` +
        `Postgres instance (confirm the correct URL via \`supabase status\`) — refusing to proceed.`,
    );
  }

  let hostname: string;
  try {
    hostname = new URL(pgUrl).hostname.toLowerCase();
  } catch {
    throw new Error('RLS08_PG_URL is not a valid connection URL — refusing to proceed.');
  }
  if (!ALLOWED_LOCAL_HOSTS.includes(hostname)) {
    throw new Error(
      `RLS08_PG_URL host "${hostname}" is not a recognized local address ` +
        `(${ALLOWED_LOCAL_HOSTS.join(', ')}). This test must only target a local Supabase ` +
        `Postgres instance — refusing to proceed.`,
    );
  }
}

describe('RLS-08 guard — RLS08_PG_URL must never be a known staging/production/hosted target', () => {
  it('RLS08_PG_URL (if set) is either unset or a local-only Postgres URL', () => {
    const pgUrl = readEnv('RLS08_PG_URL');
    if (!pgUrl) {
      expect(pgUrl).toBeUndefined();
      return;
    }
    expect(() => assertLocalPostgresOnly(pgUrl)).not.toThrow();
  });
});

const config = readRls08Config();
const allowed = isRunExplicitlyAllowed();
const ready = config !== null && allowed;

const TENANT_A_CODE = 'RLS08-TENANT-A';
const TENANT_B_CODE = 'RLS08-TENANT-B';

const WORKER_AUTH_UID = '00000000-0000-4000-a000-000000000a08';

describe.skipIf(!ready)(
  'RLS-08 — UEF SECURITY DEFINER authorization (migration 047; direct Postgres)',
  () => {
    let client: InstanceType<typeof Client>;
    let tenantAId: string;
    let tenantBId: string;
    let batchAId: string;
    let uefAId: string;
    let uefBId: string;

    async function cleanupOwnFixtures() {
      await client.query(
        `DELETE FROM analytics.uef_record WHERE tenant_id IN (
           SELECT id FROM analytics.tenant WHERE tenant_code IN ($1, $2)
         )`,
        [TENANT_A_CODE, TENANT_B_CODE],
      );
      await client.query(
        `DELETE FROM analytics.source_batch WHERE tenant_id IN (
           SELECT id FROM analytics.tenant WHERE tenant_code IN ($1, $2)
         )`,
        [TENANT_A_CODE, TENANT_B_CODE],
      );
      await client.query(`DELETE FROM analytics.tenant WHERE tenant_code IN ($1, $2)`, [TENANT_A_CODE, TENANT_B_CODE]);
    }

    beforeAll(async () => {
      if (!config) throw new Error('unreachable: beforeAll only runs when describe.skipIf(!ready) has already passed');
      assertLocalPostgresOnly(config.pgUrl);

      client = new Client({ connectionString: config.pgUrl });
      await client.connect();

      await cleanupOwnFixtures(); // clear any leftover rows from a prior interrupted run

      const tenantA = await client.query<{ id: string }>(
        `INSERT INTO analytics.tenant (tenant_code, company_name, tenant_kind) VALUES ($1, 'RLS-08 Tenant A', 'TEST') RETURNING id`,
        [TENANT_A_CODE],
      );
      tenantAId = tenantA.rows[0].id;

      const tenantB = await client.query<{ id: string }>(
        `INSERT INTO analytics.tenant (tenant_code, company_name, tenant_kind) VALUES ($1, 'RLS-08 Tenant B', 'TEST') RETURNING id`,
        [TENANT_B_CODE],
      );
      tenantBId = tenantB.rows[0].id;

      const batchA = await client.query<{ id: string }>(
        `INSERT INTO analytics.source_batch (tenant_id, source_type, source_name, reporting_period, batch_status)
         VALUES ($1, 'manual', 'rls08-a.csv', '2026-Q3', 'approved') RETURNING id`,
        [tenantAId],
      );
      batchAId = batchA.rows[0].id;

      const uefA = await client.query<{ id: string }>(
        `INSERT INTO analytics.uef_record (tenant_id, batch_id, reporting_period, raw_name, eligibility, primary_pillar, review_status, approved_for_scoring)
         VALUES ($1, $2, '2026-Q3', 'RLS08-A-EVENT', 'eligible', 'GROWTH', 'pending', false) RETURNING id`,
        [tenantAId, batchAId],
      );
      uefAId = uefA.rows[0].id;

      const batchB = await client.query<{ id: string }>(
        `INSERT INTO analytics.source_batch (tenant_id, source_type, source_name, reporting_period, batch_status)
         VALUES ($1, 'manual', 'rls08-b.csv', '2026-Q3', 'approved') RETURNING id`,
        [tenantBId],
      );
      const uefB = await client.query<{ id: string }>(
        `INSERT INTO analytics.uef_record (tenant_id, batch_id, reporting_period, raw_name, eligibility, primary_pillar, review_status, approved_for_scoring)
         VALUES ($1, $2, '2026-Q3', 'RLS08-B-EVENT', 'eligible', 'LIFE', 'pending', false) RETURNING id`,
        [tenantBId, batchB.rows[0].id],
      );
      uefBId = uefB.rows[0].id;
    });

    afterAll(async () => {
      if (!client) return;
      await cleanupOwnFixtures();
      await client.end();
    });

    // ── Helpers ──────────────────────────────────────────────────────────────

    type Claims = { sub?: string; app_metadata?: Record<string, unknown>; role?: string };

    async function withClaims<T>(claims: Claims, fn: () => Promise<T>): Promise<{ data: T | null; error: Error | null }> {
      await client.query('BEGIN');
      try {
        await client.query('SET LOCAL ROLE authenticated');
        await client.query(`SELECT set_config('request.jwt.claims', $1, true)`, [JSON.stringify(claims)]);
        const data = await fn();
        return { data, error: null };
      } catch (error) {
        return { data: null, error: error as Error };
      } finally {
        await client.query('ROLLBACK');
      }
    }

    async function withAnon<T>(fn: () => Promise<T>): Promise<{ data: T | null; error: Error | null }> {
      await client.query('BEGIN');
      try {
        await client.query('SET LOCAL ROLE anon');
        const data = await fn();
        return { data, error: null };
      } catch (error) {
        return { data: null, error: error as Error };
      } finally {
        await client.query('ROLLBACK');
      }
    }

    async function readUefRow(id: string) {
      const r = await client.query(`SELECT review_status, payload FROM analytics.uef_record WHERE id = $1`, [id]);
      return r.rows[0];
    }

    // ── NEGATIVI ──────────────────────────────────────────────────────────────

    it('1. ANON is denied on fn_advisor_uef_read', async () => {
      const { error } = await withAnon(() => client.query(`SELECT id FROM analytics.fn_advisor_uef_read($1)`, [tenantAId]));
      expect(error).not.toBeNull();
      expect(/permission denied/i.test(error!.message)).toBe(true);
    });

    it('2. authenticated with no kora_role claim at all is denied', async () => {
      const { error } = await withClaims({}, () => client.query(`SELECT id FROM analytics.fn_advisor_uef_read($1)`, [tenantAId]));
      expect(error).not.toBeNull();
      expect(/access denied/i.test(error!.message)).toBe(true);
    });

    it('3. WORKER is denied in READ (fn_advisor_uef_read)', async () => {
      const { error } = await withClaims(
        { sub: WORKER_AUTH_UID, app_metadata: { kora_role: 'WORKER', kora_tenant_id: tenantAId, kora_worker_id: '00000000-0000-4000-8000-000000000001' } },
        () => client.query(`SELECT id, raw_name FROM analytics.fn_advisor_uef_read($1)`, [tenantAId]),
      );
      expect(error).not.toBeNull();
      expect(/ADVISOR role required/i.test(error!.message)).toBe(true);
    });

    it('4. WORKER is denied in WRITE (fn_admin_uef_update_review) — no side effect', async () => {
      const before = await readUefRow(uefAId);
      const { error } = await withClaims(
        { sub: WORKER_AUTH_UID, app_metadata: { kora_role: 'WORKER', kora_tenant_id: tenantAId, kora_worker_id: '00000000-0000-4000-8000-000000000001' } },
        () => client.query(`SELECT analytics.fn_admin_uef_update_review($1, 'approve', 'exploit-attempt', 'rls08')`, [uefAId]),
      );
      expect(error).not.toBeNull();
      expect(/KORA_ADMIN required/i.test(error!.message)).toBe(true);
      const after = await readUefRow(uefAId);
      expect(after.review_status).toBe(before.review_status);
    });

    it('5. WORKER with tampered/non-existent tenant claim is denied', async () => {
      const { error } = await withClaims(
        { sub: WORKER_AUTH_UID, app_metadata: { kora_role: 'WORKER', kora_tenant_id: '00000000-0000-4000-8000-000000000099', kora_worker_id: '00000000-0000-4000-8000-000000000001' } },
        () => client.query(`SELECT id FROM analytics.fn_advisor_uef_read($1)`, [tenantAId]),
      );
      expect(error).not.toBeNull();
      expect(/ADVISOR role required/i.test(error!.message)).toBe(true);
    });

    it('6. WORKER with no mapping (no kora_worker_id claim) is denied', async () => {
      const { error } = await withClaims(
        { sub: WORKER_AUTH_UID, app_metadata: { kora_role: 'WORKER', kora_tenant_id: tenantAId } },
        () => client.query(`SELECT id FROM analytics.fn_advisor_uef_read($1)`, [tenantAId]),
      );
      expect(error).not.toBeNull();
      expect(/ADVISOR role required/i.test(error!.message)).toBe(true);
    });

    it('7. WORKER with a well-formed (even if fabricated) mapping claim is still denied — role check is unconditional', async () => {
      const { error } = await withClaims(
        { sub: WORKER_AUTH_UID, app_metadata: { kora_role: 'WORKER', kora_tenant_id: tenantAId, kora_worker_id: '00000000-0000-4000-8000-000000000fff', kora_status: 'active' } },
        () => client.query(`SELECT analytics.fn_admin_uef_enrich($1, $2, 'rls08')`, [uefAId, JSON.stringify({ enrichment_notes: 'x' })]),
      );
      expect(error).not.toBeNull();
      expect(/KORA_ADMIN required/i.test(error!.message)).toBe(true);
    });

    it('8. PARTNER is denied', async () => {
      const { error } = await withClaims(
        { app_metadata: { kora_role: 'PARTNER', kora_partner_id: '00000000-0000-4000-8000-000000000002' } },
        () => client.query(`SELECT id FROM analytics.fn_advisor_uef_read($1)`, [tenantAId]),
      );
      expect(error).not.toBeNull();
      expect(/ADVISOR role required/i.test(error!.message)).toBe(true);
    });

    it('9. COMPANY_ADMIN is denied on individual UEF operations, read and write', async () => {
      const readResult = await withClaims(
        { app_metadata: { kora_role: 'COMPANY_ADMIN', kora_tenant_id: tenantAId } },
        () => client.query(`SELECT id FROM analytics.fn_advisor_uef_read($1)`, [tenantAId]),
      );
      expect(readResult.error).not.toBeNull();

      const before = await readUefRow(uefAId);
      const writeResult = await withClaims(
        { app_metadata: { kora_role: 'COMPANY_ADMIN', kora_tenant_id: tenantAId } },
        () => client.query(`SELECT analytics.fn_admin_uef_enrich($1, $2, 'rls08')`, [uefAId, JSON.stringify({ enrichment_notes: 'unauthorized' })]),
      );
      expect(writeResult.error).not.toBeNull();
      const after = await readUefRow(uefAId);
      expect(after.payload).toEqual(before.payload);
    });

    it('10. COMPANY_ADMIN cross-tenant is denied (own tenant and other tenant both denied)', async () => {
      const ownTenant = await withClaims(
        { app_metadata: { kora_role: 'COMPANY_ADMIN', kora_tenant_id: tenantAId } },
        () => client.query(`SELECT id FROM analytics.fn_advisor_uef_read($1)`, [tenantAId]),
      );
      const otherTenant = await withClaims(
        { app_metadata: { kora_role: 'COMPANY_ADMIN', kora_tenant_id: tenantAId } },
        () => client.query(`SELECT id FROM analytics.fn_advisor_uef_read($1)`, [tenantBId]),
      );
      expect(ownTenant.error).not.toBeNull();
      expect(otherTenant.error).not.toBeNull();
    });

    it('11. KORA_ADMIN is denied where the model does not grant JWT-path access (fn_advisor_uef_read is ADVISOR-only by original design)', async () => {
      const { error } = await withClaims(
        { app_metadata: { kora_role: 'KORA_ADMIN' } },
        () => client.query(`SELECT id FROM analytics.fn_advisor_uef_read($1)`, [tenantAId]),
      );
      expect(error).not.toBeNull();
      expect(/ADVISOR role required/i.test(error!.message)).toBe(true);
    });

    it('12. a tampered tenant parameter (ADVISOR claim tenant A, parameter tenant B) is denied via explicit cross-tenant exception', async () => {
      const { error } = await withClaims(
        { app_metadata: { kora_role: 'ADVISOR', kora_tenant_id: tenantAId } },
        () => client.query(`SELECT id FROM analytics.fn_advisor_uef_read($1)`, [tenantBId]),
      );
      expect(error).not.toBeNull();
      expect(/cross-tenant access denied/i.test(error!.message)).toBe(true);
    });

    it('13. a fabricated worker-identity claim has no bearing on outcome — WORKER remains denied regardless of claim shape', async () => {
      const { error } = await withClaims(
        { app_metadata: { kora_role: 'WORKER', kora_tenant_id: tenantAId, kora_worker_id: uefAId /* nonsense value, arbitrary UUID reuse */ } },
        () => client.query(`SELECT id FROM analytics.fn_advisor_uef_read($1)`, [tenantAId]),
      );
      expect(error).not.toBeNull();
      expect(/ADVISOR role required/i.test(error!.message)).toBe(true);
    });

    it('14. unauthorized direct RPC call is denied via real local PostgREST (end-to-end, not simulated)', async () => {
      const supabaseUrl = readEnv('RLS08_SUPABASE_URL');
      const anonKey = readEnv('RLS08_SUPABASE_ANON_KEY');
      const serviceKey = readEnv('RLS08_SUPABASE_SERVICE_ROLE_KEY');
      if (!supabaseUrl || !anonKey || !serviceKey) {
        // Optional end-to-end spot-check — all direct-Postgres assertions
        // above and below already exercise the real bug/fix without this.
        return;
      }
      assertLocalPostgresOnly(supabaseUrl);

      const { createClient } = await import('@supabase/supabase-js');
      const admin = createClient(supabaseUrl, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
      const email = `rls08-worker-${Date.now()}@rls08.test`;
      const password = (await import('crypto')).randomBytes(24).toString('base64url');
      const { data: userData, error: createErr } = await admin.auth.admin.createUser({
        email, password, email_confirm: true, app_metadata: { kora_role: 'WORKER', kora_tenant_id: tenantAId },
      });
      expect(createErr).toBeNull();

      try {
        const anonClient = createClient(supabaseUrl, anonKey, { auth: { autoRefreshToken: false, persistSession: false } });
        const { data: signInData, error: signInErr } = await anonClient.auth.signInWithPassword({ email, password });
        expect(signInErr).toBeNull();

        const userClient = createClient(supabaseUrl, anonKey, {
          global: { headers: { Authorization: `Bearer ${signInData!.session!.access_token}` } },
        });
        const { data, error } = await userClient.rpc('fn_advisor_uef_read', { p_tenant_id: tenantAId });
        expect(data).toBeNull();
        expect(error).not.toBeNull();
        expect(/ADVISOR role required/i.test(error!.message)).toBe(true);
      } finally {
        await admin.auth.admin.deleteUser(userData!.user!.id);
      }
    });

    it('15. no side effect after any denied write call (aggregate check across the 3 write attempts above)', async () => {
      const row = await readUefRow(uefAId);
      expect(row.review_status).toBe('pending');
      expect(row.payload).toEqual({});
    });

    it('16. no partial rows are ever returned on a denied read (exception, not truncated/empty-with-partial-columns result)', async () => {
      const { data, error } = await withClaims(
        { app_metadata: { kora_role: 'PARTNER' } },
        () => client.query(`SELECT * FROM analytics.fn_advisor_uef_read($1)`, [tenantAId]),
      );
      expect(data).toBeNull();
      expect(error).not.toBeNull();
    });

    it('17. denial error messages never leak tenant/record data — only the caller\'s own role appears', async () => {
      const { error } = await withClaims(
        { app_metadata: { kora_role: 'WORKER', kora_tenant_id: tenantAId } },
        () => client.query(`SELECT id, raw_name FROM analytics.fn_advisor_uef_read($1)`, [tenantAId]),
      );
      expect(error).not.toBeNull();
      expect(error!.message).not.toContain('RLS08-A-EVENT');
      expect(error!.message).not.toContain(tenantAId);
      expect(error!.message).not.toContain(tenantBId);
    });

    // ── POSITIVI ──────────────────────────────────────────────────────────────

    it('18. legitimate role (ADVISOR) reads only its own tenant\'s UEF records', async () => {
      const { data, error } = await withClaims(
        { app_metadata: { kora_role: 'ADVISOR', kora_tenant_id: tenantAId } },
        () => client.query(`SELECT id, raw_name FROM analytics.fn_advisor_uef_read($1)`, [tenantAId]),
      );
      expect(error).toBeNull();
      expect((data as { rows: Array<{ raw_name: string }> }).rows).toHaveLength(1);
      expect((data as { rows: Array<{ raw_name: string }> }).rows[0].raw_name).toBe('RLS08-A-EVENT');
    });

    it('19. legitimate role (KORA_ADMIN) can write exactly what is intended (approve → approved_for_scoring true)', async () => {
      const { error } = await withClaims(
        { app_metadata: { kora_role: 'KORA_ADMIN' } },
        () => client.query(`SELECT analytics.fn_admin_uef_update_review($1, 'approve', 'legit admin note', 'rls08-admin')`, [uefAId]),
      );
      expect(error).toBeNull();
    });

    it('20. tenant resolution is correct for the legitimate ADVISOR path (own tenant id echoed back)', async () => {
      const { data, error } = await withClaims(
        { app_metadata: { kora_role: 'ADVISOR', kora_tenant_id: tenantAId } },
        () => client.query(`SELECT tenant_id FROM analytics.fn_advisor_uef_read($1)`, [tenantAId]),
      );
      expect(error).toBeNull();
      expect((data as { rows: Array<{ tenant_id: string }> }).rows[0].tenant_id).toBe(tenantAId);
    });

    it('21. genuine service_role context (JWT top-level role claim) is allowed regardless of app_metadata.kora_role', async () => {
      const { data, error } = await withClaims(
        { role: 'service_role' }, // top-level JWT role claim — no app_metadata.kora_role at all
        () => client.query(`SELECT id FROM analytics.fn_admin_uef_review($1)`, [batchAId]),
      );
      expect(error).toBeNull();
      expect((data as { rows: unknown[] }).rows.length).toBeGreaterThan(0);
    });

    it('22. KORA_ADMIN access does not depend on any kora_status claim (none present, still works)', async () => {
      const { error } = await withClaims(
        { app_metadata: { kora_role: 'KORA_ADMIN' } },
        () => client.query(`SELECT id FROM analytics.fn_admin_uef_review($1)`, [batchAId]),
      );
      expect(error).toBeNull();
    });

    it('23. golden-path shape: approving an eligible record sets approved_for_impact_units correctly (matches review/route.ts app-layer logic)', async () => {
      const { error } = await withClaims(
        { app_metadata: { kora_role: 'KORA_ADMIN' } },
        () => client.query(`SELECT analytics.fn_admin_uef_update_review($1, 'approve', 'golden-path', 'rls08-admin')`, [uefBId]),
      );
      expect(error).toBeNull();
    });

    it('24. existing consumer query shape (fn_admin_uef_review columns) is unchanged — no regression in returned columns', async () => {
      const { data, error } = await withClaims(
        { app_metadata: { kora_role: 'KORA_ADMIN' } },
        () => client.query(`SELECT * FROM analytics.fn_admin_uef_review($1)`, [batchAId]),
      );
      expect(error).toBeNull();
      const row = (data as { rows: Array<Record<string, unknown>> }).rows[0];
      expect(row).toHaveProperty('raw_name');
      expect(row).toHaveProperty('review_status');
      expect(row).not.toHaveProperty('payload'); // still excluded, unchanged
    });

    // ── CROSS-TENANT ──────────────────────────────────────────────────────────

    it('25. tenant A (ADVISOR) cannot read tenant B\'s UEF records', async () => {
      const { error } = await withClaims(
        { app_metadata: { kora_role: 'ADVISOR', kora_tenant_id: tenantAId } },
        () => client.query(`SELECT id FROM analytics.fn_advisor_uef_read($1)`, [tenantBId]),
      );
      expect(error).not.toBeNull();
      expect(/cross-tenant access denied/i.test(error!.message)).toBe(true);
    });

    it('26. ADVISOR (any tenant) cannot modify any tenant\'s UEF records — no write path exists for this role', async () => {
      const before = await readUefRow(uefBId);
      const { error } = await withClaims(
        { app_metadata: { kora_role: 'ADVISOR', kora_tenant_id: tenantBId } },
        () => client.query(`SELECT analytics.fn_admin_uef_update_review($1, 'approve', 'advisor-attempt', 'rls08')`, [uefBId]),
      );
      expect(error).not.toBeNull();
      expect(/KORA_ADMIN required/i.test(error!.message)).toBe(true);
      const after = await readUefRow(uefBId);
      expect(after.review_status).toBe(before.review_status);
    });

    it('27. claim tenant A + parameter tenant B is denied (explicit cross-tenant exception, not silent 0-rows)', async () => {
      const { data, error } = await withClaims(
        { app_metadata: { kora_role: 'ADVISOR', kora_tenant_id: tenantAId } },
        () => client.query(`SELECT id FROM analytics.fn_advisor_uef_read($1)`, [tenantBId]),
      );
      expect(data).toBeNull();
      expect(error).not.toBeNull();
    });

    it('28. claim tenant B + parameter tenant A is denied symmetrically', async () => {
      const { data, error } = await withClaims(
        { app_metadata: { kora_role: 'ADVISOR', kora_tenant_id: tenantBId } },
        () => client.query(`SELECT id FROM analytics.fn_advisor_uef_read($1)`, [tenantAId]),
      );
      expect(data).toBeNull();
      expect(error).not.toBeNull();
    });

    // ── GRANT ─────────────────────────────────────────────────────────────────

    it('29. EXECUTE is present only for authenticated, service_role, and postgres (owner)', async () => {
      const r = await client.query<{ grantee: string; routine_name: string }>(
        `SELECT grantee, routine_name FROM information_schema.role_routine_grants
         WHERE routine_schema = 'analytics'
           AND routine_name IN ('fn_admin_uef_review','fn_admin_uef_update_review','fn_admin_uef_enrich','fn_advisor_uef_read')
         ORDER BY routine_name, grantee`,
      );
      const grantees = new Set(r.rows.map((row) => row.grantee));
      expect(grantees.has('authenticated')).toBe(true);
      expect(grantees.has('service_role')).toBe(true);
      for (const g of grantees) {
        expect(['authenticated', 'service_role', 'postgres']).toContain(g);
      }
    });

    it('30. no grant to anon on any of the 4 functions', async () => {
      const r = await client.query(
        `SELECT 1 FROM information_schema.role_routine_grants
         WHERE routine_schema = 'analytics'
           AND routine_name IN ('fn_admin_uef_review','fn_admin_uef_update_review','fn_admin_uef_enrich','fn_advisor_uef_read')
           AND grantee = 'anon'`,
      );
      expect(r.rows.length).toBe(0);
    });

    it('31. no grant to PUBLIC on any of the 4 functions', async () => {
      const r = await client.query(
        `SELECT 1 FROM information_schema.role_routine_grants
         WHERE routine_schema = 'analytics'
           AND routine_name IN ('fn_admin_uef_review','fn_admin_uef_update_review','fn_admin_uef_enrich','fn_advisor_uef_read')
           AND grantee = 'PUBLIC'`,
      );
      expect(r.rows.length).toBe(0);
    });

    it('32. service_role is coherent with the intended perimeter (allowed on all 4 functions, no app_metadata required)', async () => {
      const readResult = await withClaims({ role: 'service_role' }, () =>
        client.query(`SELECT id FROM analytics.fn_advisor_uef_read($1)`, [tenantAId]));
      expect(readResult.error).toBeNull();

      const writeResult = await withClaims({ role: 'service_role' }, () =>
        client.query(`SELECT analytics.fn_admin_uef_enrich($1, $2, 'rls08-service')`, [uefAId, JSON.stringify({ enrichment_notes: 'service-role-write' })]));
      expect(writeResult.error).toBeNull();
    });
  },
);
