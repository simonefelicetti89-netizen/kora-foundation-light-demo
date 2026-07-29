/**
 * RLS-09 — Worker Tenant/Mapping Suspension: Auth-Guard vs. RLS Boundary
 * (direct Postgres, local Supabase)
 *
 * WHAT THIS IS:
 *   PILOT-TRUST-04 fixes requireWorkerUser() (lib/auth/kora-session.ts) to
 *   reject a WORKER whose tenant is suspended (analytics.tenant.is_active =
 *   false) or whose personal.worker_identity mapping is disabled/mismatched
 *   — see tests/unit/pilot-trust-04-worker-tenant-suspension.test.ts for
 *   that application-layer fix, verified with mocked I/O.
 *
 *   This file answers a different question, at a different layer: does Row
 *   Level Security on personal.worker_identity (and the equivalent
 *   personal.worker_profile_private policy) ALSO enforce tenant.is_active or
 *   worker_identity.status? The answer, verified here against real
 *   PostgreSQL, is NO — by design, not by omission:
 *
 *     personal.worker_identity — migration 007:
 *       CREATE POLICY "worker_identity_worker_own_select" ... FOR SELECT
 *       USING (kora.kora_role() = 'WORKER' AND auth_user_id = auth.uid());
 *
 *   This policy's only job is OWNERSHIP isolation (a worker reads their own
 *   row and no one else's) and, transitively via other tenant-aware
 *   policies elsewhere (e.g. migration 045, already proven in RLS-07),
 *   TENANT isolation for cross-tenant data. It was never designed to encode
 *   ACCOUNT LIFECYCLE state (tenant suspended, mapping disabled) — that is
 *   the application auth guard's responsibility, not RLS's. Encoding
 *   lifecycle into RLS here would be a redundant, harder-to-audit
 *   duplication of logic that already lives in one place
 *   (requireWorkerUser()) — this suite deliberately does NOT add a new
 *   policy to make these scenarios "block" at the RLS layer.
 *
 *   THE BOUNDARY THIS SUITE DOCUMENTS AND PROVES:
 *     - Auth guard (requireWorkerUser, app layer) blocks: suspended tenant,
 *       disabled mapping, cross-tenant mapping mismatch, tampered/missing
 *       tenant or worker claims — before any RLS-governed query ever runs
 *       in a real request. Proven in the unit-test file referenced above.
 *     - RLS (this file, DB layer) blocks: cross-OWNER access (worker A
 *       cannot read worker B's row) and, on tenant-aware tables like
 *       personal.worker_initiative (RLS-07), cross-TENANT access via a
 *       tampered tenant claim.
 *     - RLS does NOT, and is not meant to, block a worker's OWN row merely
 *       because their tenant or mapping has been suspended after the fact —
 *       that is intentional and is reverified here on every run so a future
 *       regression (e.g. someone "fixing" this by weakening the policy
 *       further) would be caught, not silently accepted.
 *
 * RELATIONSHIP TO RLS-03/05/06/07/08:
 *   Same direct-Postgres, claims-simulation mechanism and safety model.
 *   RLS-07 already proves cross-tenant claim tampering is blocked on a
 *   tenant-aware policy (personal.worker_initiative) — not re-proven here.
 *   This file is scoped to personal.worker_identity /
 *   personal.worker_profile_private specifically, and to the
 *   lifecycle-vs-ownership distinction.
 *
 * SAFETY MODEL:
 *   - Fully skip-safe: everything lives inside `describe.skipIf(!ready)`,
 *     where `ready` requires RLS09_PG_URL to be set AND RLS09_ALLOW_RUN to
 *     be exactly 'true'.
 *   - Always-on guard hard-blocks known staging/production project refs and
 *     any hosted Supabase domain, requires a loopback host, independent of
 *     RLS09_ALLOW_RUN.
 *   - Creates and tears down its own fixture data (2 synthetic tenants
 *     tagged tenant_kind='TEST', 2 synthetic workers), scoped strictly to
 *     this file's own tags, removed in afterAll regardless of outcome.
 *
 * REQUIRED ENV VARS:
 *   RLS09_PG_URL     — local Supabase only, e.g.
 *                      postgresql://postgres:postgres@127.0.0.1:54322/postgres
 *   RLS09_ALLOW_RUN  — must be exactly 'true'.
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import pg from 'pg';

const { Client } = pg;

function readEnv(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim().length > 0 ? value : undefined;
}

function readConfig(): { pgUrl: string } | null {
  const pgUrl = readEnv('RLS09_PG_URL');
  if (!pgUrl) return null;
  return { pgUrl };
}

function isRunExplicitlyAllowed(): boolean {
  return readEnv('RLS09_ALLOW_RUN') === 'true';
}

const KNOWN_NON_THROWAWAY_PROJECT_REFS = [
  'azdnepfmwrmacruykskm', // production — never a valid target
  'haqflkurpmeaxpikozjl', // staging (dedicated) — discouraged for this suite
];
const ALLOWED_LOCAL_HOSTS = ['127.0.0.1', 'localhost', '::1'];

function assertLocalPostgresOnly(pgUrl: string): void {
  const lower = pgUrl.toLowerCase();
  for (const ref of KNOWN_NON_THROWAWAY_PROJECT_REFS) {
    if (lower.includes(ref)) {
      throw new Error(`RLS09_PG_URL matches a known staging/production project ref — refusing.`);
    }
  }
  if (lower.includes('supabase.co') || lower.includes('supabase.com')) {
    throw new Error(`RLS09_PG_URL points at a hosted Supabase domain — refusing.`);
  }
  let hostname: string;
  try {
    hostname = new URL(pgUrl).hostname.toLowerCase();
  } catch {
    throw new Error('RLS09_PG_URL is not a valid connection URL — refusing.');
  }
  if (!ALLOWED_LOCAL_HOSTS.includes(hostname)) {
    throw new Error(`RLS09_PG_URL host "${hostname}" is not local — refusing.`);
  }
}

describe('RLS-09 guard — RLS09_PG_URL must never be a known staging/production/hosted target', () => {
  it('RLS09_PG_URL (if set) is either unset or a local-only Postgres URL', () => {
    const pgUrl = readEnv('RLS09_PG_URL');
    if (!pgUrl) {
      expect(pgUrl).toBeUndefined();
      return;
    }
    expect(() => assertLocalPostgresOnly(pgUrl)).not.toThrow();
  });
});

const config = readConfig();
const allowed = isRunExplicitlyAllowed();
const ready = config !== null && allowed;

const TENANT_ACTIVE_CODE = 'RLS09-TENANT-ACTIVE';
const TENANT_SUSPENDED_CODE = 'RLS09-TENANT-SUSPENDED';
const WORKER_A_AUTH_UID = '00000000-0000-4000-a000-000000000a09';
const WORKER_B_AUTH_UID = '00000000-0000-4000-a000-000000000b09';

describe.skipIf(!ready)(
  'RLS-09 — worker tenant/mapping suspension: auth-guard vs. RLS boundary (direct Postgres)',
  () => {
    let client: InstanceType<typeof Client>;
    let tenantActiveId: string;
    let tenantSuspendedId: string;
    let workerActiveId: string; // active tenant, active mapping — control
    let workerSuspendedTenantId: string; // suspended tenant, active mapping
    let workerDisabledMappingId: string; // active tenant, disabled mapping

    async function cleanup() {
      await client.query(
        `DELETE FROM personal.worker_identity WHERE auth_user_id IN ($1, $2)`,
        [WORKER_A_AUTH_UID, WORKER_B_AUTH_UID],
      );
      await client.query(`DELETE FROM analytics.tenant WHERE tenant_code IN ($1, $2)`, [TENANT_ACTIVE_CODE, TENANT_SUSPENDED_CODE]);
    }

    beforeAll(async () => {
      if (!config) throw new Error('unreachable');
      assertLocalPostgresOnly(config.pgUrl);
      client = new Client({ connectionString: config.pgUrl });
      await client.connect();
      await cleanup();

      const tA = await client.query<{ id: string }>(
        `INSERT INTO analytics.tenant (tenant_code, company_name, tenant_kind, is_active) VALUES ($1, $2, 'TEST', true) RETURNING id`,
        [TENANT_ACTIVE_CODE, 'RLS-09 Active Tenant'],
      );
      tenantActiveId = tA.rows[0].id;

      const tB = await client.query<{ id: string }>(
        `INSERT INTO analytics.tenant (tenant_code, company_name, tenant_kind, is_active) VALUES ($1, $2, 'TEST', false) RETURNING id`,
        [TENANT_SUSPENDED_CODE, 'RLS-09 Suspended Tenant'],
      );
      tenantSuspendedId = tB.rows[0].id;

      // Worker A1: active tenant, active mapping — control/baseline.
      const wActive = await client.query<{ id: string }>(
        `INSERT INTO personal.worker_identity (tenant_id, auth_user_id, worker_ref, status) VALUES ($1, $2, 'RLS09-WORKER-ACTIVE', 'active') RETURNING id`,
        [tenantActiveId, WORKER_A_AUTH_UID],
      );
      workerActiveId = wActive.rows[0].id;

      // Reuse the same auth uid is not possible (UNIQUE) — separate auth uid
      // for the suspended-tenant worker, mapped to the SUSPENDED tenant.
      const wSuspTenant = await client.query<{ id: string }>(
        `INSERT INTO personal.worker_identity (tenant_id, auth_user_id, worker_ref, status) VALUES ($1, $2, 'RLS09-WORKER-SUSPENDED-TENANT', 'active') RETURNING id`,
        [tenantSuspendedId, WORKER_B_AUTH_UID],
      );
      workerSuspendedTenantId = wSuspTenant.rows[0].id;

      // Disabled-mapping worker reuses a third auth uid on the active tenant.
      const wDisabledMapping = await client.query<{ id: string }>(
        `INSERT INTO personal.worker_identity (tenant_id, auth_user_id, worker_ref, status) VALUES ($1, $2, 'RLS09-WORKER-DISABLED-MAPPING', 'disabled') RETURNING id`,
        [tenantActiveId, '00000000-0000-4000-a000-000000000c09'],
      );
      workerDisabledMappingId = wDisabledMapping.rows[0].id;
    });

    afterAll(async () => {
      if (!client) return;
      await client.query(
        `DELETE FROM personal.worker_identity WHERE auth_user_id IN ($1, $2, $3)`,
        [WORKER_A_AUTH_UID, WORKER_B_AUTH_UID, '00000000-0000-4000-a000-000000000c09'],
      );
      await cleanup();
      await client.end();
    });

    async function asWorker(authUid: string, tenantId: string, fn: () => Promise<unknown>) {
      await client.query('BEGIN');
      try {
        await client.query('SET LOCAL ROLE authenticated');
        await client.query(`SELECT set_config('request.jwt.claims', $1, true)`, [
          JSON.stringify({ sub: authUid, app_metadata: { kora_role: 'WORKER', kora_tenant_id: tenantId } }),
        ]);
        return { data: await fn(), error: null };
      } catch (error) {
        return { data: null, error: error as Error };
      } finally {
        await client.query('ROLLBACK');
      }
    }

    // ── 1. Tenant attivo → accesso coerente (baseline) ────────────────────────

    it('1. tenant attivo: worker legge la propria riga worker_identity — 1 riga (coerente)', async () => {
      const { data, error } = await asWorker(WORKER_A_AUTH_UID, tenantActiveId, () =>
        client.query(`SELECT id FROM personal.worker_identity WHERE id = $1`, [workerActiveId]).then((r) => r.rows));
      expect(error).toBeNull();
      expect((data as unknown[]).length).toBe(1);
    });

    // ── 2. Tenant sospeso — documenta il confine auth-guard vs RLS ────────────

    it('2. tenant SOSPESO: RLS da sola NON nega la lettura della propria riga (per design — vedi header del file); il blocco reale avviene nell\'auth guard, non qui', async () => {
      const { data, error } = await asWorker(WORKER_B_AUTH_UID, tenantSuspendedId, () =>
        client.query(`SELECT id FROM personal.worker_identity WHERE id = $1`, [workerSuspendedTenantId]).then((r) => r.rows));
      expect(error).toBeNull();
      // Documented, expected RLS behavior: 1 row IS returned. This is NOT a
      // regression — requireWorkerUser() (proven in the unit-test suite)
      // never lets a real request reach this query for a suspended tenant.
      expect((data as unknown[]).length).toBe(1);
    });

    // ── 3. Cross-owner (ownership isolation — RLS's actual job) ───────────────

    it('3. cross-owner: worker A non può leggere la riga worker_identity di worker B — 0 righe (RLS isola correttamente per ownership)', async () => {
      const { data, error } = await asWorker(WORKER_A_AUTH_UID, tenantActiveId, () =>
        client.query(`SELECT id FROM personal.worker_identity WHERE id = $1`, [workerSuspendedTenantId]).then((r) => r.rows));
      expect(error).toBeNull();
      expect((data as unknown[]).length).toBe(0);
    });

    // ── 4. Mapping disabilitato — documenta il confine auth-guard vs RLS ──────

    it('4. mapping disabilitato: RLS da sola NON nega la lettura della propria riga (per design); il blocco reale avviene nell\'auth guard, non qui', async () => {
      const { data, error } = await asWorker('00000000-0000-4000-a000-000000000c09', tenantActiveId, () =>
        client.query(`SELECT id, status FROM personal.worker_identity WHERE id = $1`, [workerDisabledMappingId]).then((r) => r.rows));
      expect(error).toBeNull();
      const rows = data as Array<{ status: string }>;
      expect(rows.length).toBe(1);
      expect(rows[0].status).toBe('disabled'); // confirms the row IS the disabled mapping, RLS let it through as expected
    });

    // ── 5. Claim manomesso — non ha alcun effetto sulla policy own-row ────────
    // (worker_identity_worker_own_select non referenzia affatto kora_tenant_id;
    // vedi RLS-07 per la dimostrazione equivalente su una policy tenant-aware,
    // dove un claim manomesso VIENE correttamente negato.)

    it('5. claim tenant manomesso (tenant inesistente): nessun effetto sulla policy own-row — resta 1 riga, poiché la policy dipende solo da auth_user_id', async () => {
      const { data, error } = await asWorker(WORKER_A_AUTH_UID, '00000000-0000-4000-8000-000000000f09', () =>
        client.query(`SELECT id FROM personal.worker_identity WHERE id = $1`, [workerActiveId]).then((r) => r.rows));
      expect(error).toBeNull();
      expect((data as unknown[]).length).toBe(1);
    });

    // ── 6. Scrittura WORKER su questa tabella — verificata, non assunta ───────
    //
    // A REAL policy `worker_identity_worker_own_update` (added after
    // migration 007, confirmed here by querying pg_policies directly rather
    // than assuming from a single migration file) DOES let a WORKER UPDATE
    // their own row. DELETE has no GRANT to `authenticated` at all (table
    // privilege denial, before RLS is even evaluated).
    //
    // FIXED in migration 048 (PILOT-TRUST-05, after this file — RLS-09 —
    // first discovered and documented it as an out-of-scope finding under
    // PILOT-TRUST-04's mandate). `with_check` on this policy only
    // re-verifies row ownership (auth_user_id = auth.uid()), not which
    // COLUMNS changed — a worker whose mapping had been disabled could
    // UPDATE their own `status` column back to 'active' directly (e.g. via
    // a raw PostgREST PATCH call, bypassing the Next.js app entirely).
    // Migration 048 added a BEFORE UPDATE trigger
    // (personal.enforce_worker_identity_lifecycle_protection) that blocks
    // this and every other non-onboarding status transition, plus
    // tenant_id/auth_user_id/worker_ref/created_at changes, for WORKER-role
    // callers only. Comprehensive coverage of the fix lives in
    // tests/integration/rls-10-worker-identity-lifecycle.test.ts — this
    // test now only re-confirms the specific scenario RLS-09 originally
    // flagged is closed, not the full contract.

    it('6. scrittura: WORKER PUÒ aggiornare la propria riga worker_identity per la transizione self-service prevista (policy own_update reale, confermata via pg_policies)', async () => {
      await client.query('BEGIN');
      try {
        await client.query('SET LOCAL ROLE authenticated');
        await client.query(`SELECT set_config('request.jwt.claims', $1, true)`, [
          JSON.stringify({ sub: WORKER_A_AUTH_UID, app_metadata: { kora_role: 'WORKER', kora_tenant_id: tenantActiveId } }),
        ]);
        const result = await client.query(`UPDATE personal.worker_identity SET status = 'active' WHERE id = $1`, [workerActiveId]);
        expect(result.rowCount).toBe(1); // no-op transition (already 'active') — trigger only restricts an actual status change
      } finally {
        await client.query('ROLLBACK'); // never persisted — this is a read-proof, not a real mutation
      }
    });

    it('6b. FIXED (migration 048, PILOT-TRUST-05): un worker con mapping disabilitato NON può più auto-riattivarsi (status → active) tramite UPDATE diretto', async () => {
      await client.query('BEGIN');
      try {
        await client.query('SET LOCAL ROLE authenticated');
        await client.query(`SELECT set_config('request.jwt.claims', $1, true)`, [
          JSON.stringify({ sub: '00000000-0000-4000-a000-000000000c09', app_metadata: { kora_role: 'WORKER', kora_tenant_id: tenantActiveId } }),
        ]);
        const before = await client.query(`SELECT status FROM personal.worker_identity WHERE id = $1`, [workerDisabledMappingId]);
        expect(before.rows[0].status).toBe('disabled');

        let blocked = false;
        await client.query('SAVEPOINT sp_6b');
        try {
          await client.query(`UPDATE personal.worker_identity SET status = 'active' WHERE id = $1`, [workerDisabledMappingId]);
        } catch (e) {
          blocked = /not worker-writable/i.test((e as Error).message);
          await client.query('ROLLBACK TO SAVEPOINT sp_6b');
        }
        await client.query('RELEASE SAVEPOINT sp_6b');
        expect(blocked).toBe(true);

        const after = await client.query(`SELECT status FROM personal.worker_identity WHERE id = $1`, [workerDisabledMappingId]);
        expect(after.rows[0].status).toBe('disabled'); // unchanged
      } finally {
        await client.query('ROLLBACK'); // never persisted — proof only, no real mutation survives this test
      }
    });

    it('6c. nessuna scrittura DELETE: WORKER non può cancellare la propria riga worker_identity (nessun GRANT DELETE per authenticated)', async () => {
      await client.query('BEGIN');
      let denied = false;
      try {
        await client.query('SET LOCAL ROLE authenticated');
        await client.query(`SELECT set_config('request.jwt.claims', $1, true)`, [
          JSON.stringify({ sub: WORKER_A_AUTH_UID, app_metadata: { kora_role: 'WORKER', kora_tenant_id: tenantActiveId } }),
        ]);
        try {
          const result = await client.query(`DELETE FROM personal.worker_identity WHERE id = $1`, [workerActiveId]);
          denied = result.rowCount === 0;
        } catch (e) {
          denied = /permission denied/i.test((e as Error).message);
        }
        expect(denied).toBe(true);
      } finally {
        await client.query('ROLLBACK');
      }
    });

    // ── 7. Side effect 0 / nessuna riga residua ────────────────────────────────

    it('7. side effect 0: dopo tutti i test precedenti, le 3 fixture worker esistono ancora invariate (nessuna scrittura è mai stata committata)', async () => {
      const r = await client.query(
        `SELECT worker_ref, status FROM personal.worker_identity WHERE id IN ($1, $2, $3) ORDER BY worker_ref`,
        [workerActiveId, workerSuspendedTenantId, workerDisabledMappingId],
      );
      expect(r.rows.length).toBe(3);
      expect(r.rows.find((row) => row.worker_ref === 'RLS09-WORKER-ACTIVE')?.status).toBe('active');
      expect(r.rows.find((row) => row.worker_ref === 'RLS09-WORKER-DISABLED-MAPPING')?.status).toBe('disabled');
    });
  },
);
