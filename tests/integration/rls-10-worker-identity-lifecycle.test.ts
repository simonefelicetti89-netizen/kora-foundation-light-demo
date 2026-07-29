/**
 * RLS-10 — Worker Identity Lifecycle Protection (direct Postgres, local Supabase)
 *
 * WHAT THIS IS:
 *   A LIVE, behavioral proof for the fix applied in migration 048
 *   (048_worker_identity_lifecycle_protection.sql, PILOT-TRUST-05).
 *
 *   PILOT-TRUST-04's RLS-09 suite discovered and documented — but, per its
 *   own explicit mandate, did NOT fix — that the
 *   `worker_identity_worker_own_update` RLS policy (migration 022) lets a
 *   WORKER UPDATE their own personal.worker_identity row with no
 *   restriction on WHICH columns change. Reproduced and confirmed in
 *   PILOT-TRUST-05 FASE 3: a WORKER could self-reactivate a disabled
 *   mapping, change tenant_id, change worker_ref, or change created_at —
 *   all via the same, single, pre-existing policy. auth_user_id changes
 *   were already blocked by the policy's own WITH CHECK; updated_at was
 *   already correctly forced by the pre-existing set_updated_at() trigger —
 *   neither needed fixing.
 *
 *   THIS SUITE MUST FAIL ON THE PRE-048 CODE AND PASS ONLY AFTER 048 IS
 *   APPLIED. Every assertion executes real UPDATE statements against a real
 *   local Postgres instance with simulated JWT claims (same mechanism as
 *   RLS-03/05/06/07/08/09) — not string/regex matching on the migration SQL.
 *
 * RELATIONSHIP TO RLS-05/07/09:
 *   Same direct-Postgres, claims-simulation mechanism and safety model.
 *   RLS-09 already proves the auth-guard-vs-RLS boundary for tenant/mapping
 *   *lifecycle enforcement on READ* (a suspended-tenant/disabled-mapping
 *   worker can still SELECT their own row via RLS — intentional, the app
 *   guard's job). This file is the WRITE-side counterpart: it proves the
 *   one legitimate WRITE (onboarding-completion status transition) still
 *   works, and that no other write escapes the ownership-only policy.
 *
 * SAFETY MODEL:
 *   - Fully skip-safe: `describe.skipIf(!ready)`, requires RLS10_PG_URL set
 *     AND RLS10_ALLOW_RUN === 'true'.
 *   - Always-on guard hard-blocks known staging/production project refs and
 *     any hosted Supabase domain, requires a loopback host.
 *   - Creates and tears down its own fixture data (2 synthetic tenants
 *     tagged tenant_kind='TEST', 2 synthetic workers), removed in afterAll
 *     regardless of outcome.
 *
 * REQUIRED ENV VARS:
 *   RLS10_PG_URL     — local Supabase only, e.g.
 *                      postgresql://postgres:postgres@127.0.0.1:54322/postgres
 *   RLS10_ALLOW_RUN  — must be exactly 'true'.
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import pg from 'pg';

const { Client } = pg;

function readEnv(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim().length > 0 ? value : undefined;
}

function readConfig(): { pgUrl: string } | null {
  const pgUrl = readEnv('RLS10_PG_URL');
  if (!pgUrl) return null;
  return { pgUrl };
}

function isRunExplicitlyAllowed(): boolean {
  return readEnv('RLS10_ALLOW_RUN') === 'true';
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
      throw new Error(`RLS10_PG_URL matches a known staging/production project ref — refusing.`);
    }
  }
  if (lower.includes('supabase.co') || lower.includes('supabase.com')) {
    throw new Error(`RLS10_PG_URL points at a hosted Supabase domain — refusing.`);
  }
  let hostname: string;
  try {
    hostname = new URL(pgUrl).hostname.toLowerCase();
  } catch {
    throw new Error('RLS10_PG_URL is not a valid connection URL — refusing.');
  }
  if (!ALLOWED_LOCAL_HOSTS.includes(hostname)) {
    throw new Error(`RLS10_PG_URL host "${hostname}" is not local — refusing.`);
  }
}

describe('RLS-10 guard — RLS10_PG_URL must never be a known staging/production/hosted target', () => {
  it('RLS10_PG_URL (if set) is either unset or a local-only Postgres URL', () => {
    const pgUrl = readEnv('RLS10_PG_URL');
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

const TENANT_A_CODE = 'RLS10-TENANT-A';
const TENANT_B_CODE = 'RLS10-TENANT-B';
const TENANT_SUSPENDED_CODE = 'RLS10-TENANT-SUSPENDED';

const WORKER_DISABLED_AUTH_UID = '00000000-0000-4000-a010-000000000001';
const WORKER_ACTIVE_AUTH_UID = '00000000-0000-4000-a010-000000000002';
const WORKER_B_AUTH_UID = '00000000-0000-4000-a010-000000000003';
const WORKER_SUSPENDED_STATUS_AUTH_UID = '00000000-0000-4000-a010-000000000004';
const WORKER_SUSPENDED_TENANT_AUTH_UID = '00000000-0000-4000-a010-000000000005';
const WORKER_INVITED_AUTH_UID = '00000000-0000-4000-a010-000000000006';

describe.skipIf(!ready)(
  'RLS-10 — worker_identity lifecycle protection (migration 048; direct Postgres)',
  () => {
    let client: InstanceType<typeof Client>;
    let tenantAId: string;
    let tenantBId: string;
    let tenantSuspendedId: string;
    let workerDisabledId: string; // tenant A, status disabled — the core self-reactivation target
    let workerActiveId: string; // tenant A, status active — control
    let workerBId: string; // tenant B, status active — cross-tenant/cross-worker target
    let workerSuspendedStatusId: string; // tenant A, status disabled — kora_status also disabled in claim
    let workerSuspendedTenantId: string; // tenant SUSPENDED, status active
    let workerInvitedId: string; // tenant A, status invited — legitimate transition control

    async function cleanup() {
      await client.query(
        `DELETE FROM personal.worker_identity WHERE auth_user_id IN ($1,$2,$3,$4,$5,$6)`,
        [
          WORKER_DISABLED_AUTH_UID, WORKER_ACTIVE_AUTH_UID, WORKER_B_AUTH_UID,
          WORKER_SUSPENDED_STATUS_AUTH_UID, WORKER_SUSPENDED_TENANT_AUTH_UID, WORKER_INVITED_AUTH_UID,
        ],
      );
      await client.query(`DELETE FROM analytics.tenant WHERE tenant_code IN ($1,$2,$3)`, [TENANT_A_CODE, TENANT_B_CODE, TENANT_SUSPENDED_CODE]);
    }

    beforeAll(async () => {
      if (!config) throw new Error('unreachable');
      assertLocalPostgresOnly(config.pgUrl);
      client = new Client({ connectionString: config.pgUrl });
      await client.connect();
      await cleanup();

      const tA = await client.query<{ id: string }>(
        `INSERT INTO analytics.tenant (tenant_code, company_name, tenant_kind, is_active) VALUES ($1, 'RLS-10 Tenant A', 'TEST', true) RETURNING id`,
        [TENANT_A_CODE],
      );
      tenantAId = tA.rows[0].id;

      const tB = await client.query<{ id: string }>(
        `INSERT INTO analytics.tenant (tenant_code, company_name, tenant_kind, is_active) VALUES ($1, 'RLS-10 Tenant B', 'TEST', true) RETURNING id`,
        [TENANT_B_CODE],
      );
      tenantBId = tB.rows[0].id;

      const tSusp = await client.query<{ id: string }>(
        `INSERT INTO analytics.tenant (tenant_code, company_name, tenant_kind, is_active) VALUES ($1, 'RLS-10 Tenant Suspended', 'TEST', false) RETURNING id`,
        [TENANT_SUSPENDED_CODE],
      );
      tenantSuspendedId = tSusp.rows[0].id;

      workerDisabledId = (await client.query<{ id: string }>(
        `INSERT INTO personal.worker_identity (tenant_id, auth_user_id, worker_ref, status) VALUES ($1, $2, 'RLS10-WORKER-DISABLED', 'disabled') RETURNING id`,
        [tenantAId, WORKER_DISABLED_AUTH_UID],
      )).rows[0].id;

      workerActiveId = (await client.query<{ id: string }>(
        `INSERT INTO personal.worker_identity (tenant_id, auth_user_id, worker_ref, status) VALUES ($1, $2, 'RLS10-WORKER-ACTIVE', 'active') RETURNING id`,
        [tenantAId, WORKER_ACTIVE_AUTH_UID],
      )).rows[0].id;

      workerBId = (await client.query<{ id: string }>(
        `INSERT INTO personal.worker_identity (tenant_id, auth_user_id, worker_ref, status) VALUES ($1, $2, 'RLS10-WORKER-B', 'active') RETURNING id`,
        [tenantBId, WORKER_B_AUTH_UID],
      )).rows[0].id;

      workerSuspendedStatusId = (await client.query<{ id: string }>(
        `INSERT INTO personal.worker_identity (tenant_id, auth_user_id, worker_ref, status) VALUES ($1, $2, 'RLS10-WORKER-SUSPENDED-STATUS', 'disabled') RETURNING id`,
        [tenantAId, WORKER_SUSPENDED_STATUS_AUTH_UID],
      )).rows[0].id;

      workerSuspendedTenantId = (await client.query<{ id: string }>(
        `INSERT INTO personal.worker_identity (tenant_id, auth_user_id, worker_ref, status) VALUES ($1, $2, 'RLS10-WORKER-SUSPENDED-TENANT', 'active') RETURNING id`,
        [tenantSuspendedId, WORKER_SUSPENDED_TENANT_AUTH_UID],
      )).rows[0].id;

      workerInvitedId = (await client.query<{ id: string }>(
        `INSERT INTO personal.worker_identity (tenant_id, auth_user_id, worker_ref, status) VALUES ($1, $2, 'RLS10-WORKER-INVITED', 'invited') RETURNING id`,
        [tenantAId, WORKER_INVITED_AUTH_UID],
      )).rows[0].id;
    });

    afterAll(async () => {
      if (!client) return;
      await cleanup();
      await client.end();
    });

    type Claims = { sub?: string; app_metadata?: Record<string, unknown> };

    async function asClaims<T>(claims: Claims, fn: () => Promise<T>): Promise<{ data: T | null; error: Error | null }> {
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

    async function asAnon<T>(fn: () => Promise<T>): Promise<{ data: T | null; error: Error | null }> {
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

    async function asServiceRole<T>(fn: () => Promise<T>): Promise<{ data: T | null; error: Error | null }> {
      await client.query('BEGIN');
      try {
        await client.query('SET LOCAL ROLE service_role');
        // Real PostgREST always sets a valid top-level `role` JWT claim for
        // service_role calls (confirmed empirically against a real local
        // PostgREST endpoint in PILOT-TRUST-03) — simulate that accurately
        // rather than leaving request.jwt.claims unset, which this Postgres
        // instance defaults to an empty string (not NULL), breaking
        // kora.kora_role()'s ::jsonb cast. This is a test-harness accuracy
        // fix, not a workaround for the trigger under test.
        await client.query(`SELECT set_config('request.jwt.claims', $1, true)`, [JSON.stringify({ role: 'service_role' })]);
        const data = await fn();
        return { data, error: null };
      } catch (error) {
        return { data: null, error: error as Error };
      } finally {
        await client.query('ROLLBACK');
      }
    }

    async function readStatus(id: string) {
      const r = await client.query(`SELECT status FROM personal.worker_identity WHERE id = $1`, [id]);
      return r.rows[0]?.status ?? null;
    }

    const workerDisabledClaims = () => ({ sub: WORKER_DISABLED_AUTH_UID, app_metadata: { kora_role: 'WORKER', kora_tenant_id: tenantAId, kora_worker_id: workerDisabledId } });

    // ── 1. Self-reactivation ────────────────────────────────────────────────

    it('1. WORKER non può riattivare un mapping disabilitato (disabled -> active negato)', async () => {
      const before = await readStatus(workerDisabledId);
      expect(before).toBe('disabled');
      const { error } = await asClaims(workerDisabledClaims(), () =>
        client.query(`UPDATE personal.worker_identity SET status = 'active' WHERE id = $1`, [workerDisabledId]));
      expect(error).not.toBeNull();
      expect(/not worker-writable|not.*writable/i.test(error!.message)).toBe(true);
      const after = await readStatus(workerDisabledId);
      expect(after).toBe('disabled');
    });

    // ── 2-4. Identity/tenant/ownership fields ───────────────────────────────

    it('2. WORKER non può modificare tenant_id', async () => {
      const { error } = await asClaims(workerDisabledClaims(), () =>
        client.query(`UPDATE personal.worker_identity SET tenant_id = $2 WHERE id = $1`, [workerDisabledId, tenantBId]));
      expect(error).not.toBeNull();
      expect(/tenant_id/i.test(error!.message)).toBe(true);
    });

    it('3. WORKER non può modificare auth_user_id', async () => {
      const { error } = await asClaims(workerDisabledClaims(), () =>
        client.query(`UPDATE personal.worker_identity SET auth_user_id = $2 WHERE id = $1`, [workerDisabledId, '00000000-0000-4000-a010-0000000000ff']));
      expect(error).not.toBeNull();
    });

    it('4. WORKER non può modificare worker_ref (identity linkage)', async () => {
      const { error } = await asClaims(workerDisabledClaims(), () =>
        client.query(`UPDATE personal.worker_identity SET worker_ref = 'TAMPERED' WHERE id = $1`, [workerDisabledId]));
      expect(error).not.toBeNull();
      expect(/worker_ref/i.test(error!.message)).toBe(true);
    });

    // ── 5. Arbitrary status lifecycle transitions ───────────────────────────

    it('5. WORKER non può modificare lo status arbitrariamente (active -> disabled)', async () => {
      const { error } = await asClaims(
        { sub: WORKER_ACTIVE_AUTH_UID, app_metadata: { kora_role: 'WORKER', kora_tenant_id: tenantAId, kora_worker_id: workerActiveId } },
        () => client.query(`UPDATE personal.worker_identity SET status = 'disabled' WHERE id = $1`, [workerActiveId]),
      );
      expect(error).not.toBeNull();
      const after = await readStatus(workerActiveId);
      expect(after).toBe('active');
    });

    // ── 6. System-managed fields ─────────────────────────────────────────────

    it('6. WORKER non può modificare created_at (system-managed)', async () => {
      const { error } = await asClaims(workerDisabledClaims(), () =>
        client.query(`UPDATE personal.worker_identity SET created_at = '2000-01-01' WHERE id = $1`, [workerDisabledId]));
      expect(error).not.toBeNull();
      expect(/created_at/i.test(error!.message)).toBe(true);
    });

    // ── 7-8. Cross-worker / cross-tenant ──────────────────────────────────────

    it('7. WORKER non può aggiornare la riga di un altro worker', async () => {
      const { data, error } = await asClaims(workerDisabledClaims(), () =>
        client.query(`UPDATE personal.worker_identity SET status = 'active' WHERE id = $1`, [workerActiveId]).then((r) => r.rowCount));
      expect(error).toBeNull();
      expect(data).toBe(0); // ownership policy filters the row out entirely — no trigger even needed
    });

    it('8. WORKER non può aggiornare una riga di un altro tenant', async () => {
      const { data, error } = await asClaims(workerDisabledClaims(), () =>
        client.query(`UPDATE personal.worker_identity SET status = 'active' WHERE id = $1`, [workerBId]).then((r) => r.rowCount));
      expect(error).toBeNull();
      expect(data).toBe(0);
    });

    // ── 9. Claim manomesso ────────────────────────────────────────────────────

    it('9. WORKER con kora_worker_id claim manomesso (punta a un altro worker) negato — ownership resta su auth_user_id', async () => {
      const { data, error } = await asClaims(
        { sub: WORKER_DISABLED_AUTH_UID, app_metadata: { kora_role: 'WORKER', kora_tenant_id: tenantAId, kora_worker_id: workerActiveId } },
        () => client.query(`UPDATE personal.worker_identity SET status = 'active' WHERE id = $1`, [workerActiveId]).then((r) => r.rowCount),
      );
      expect(error).toBeNull();
      expect(data).toBe(0);
    });

    // ── 10-11. Worker sospeso / tenant sospeso — l'exploit resta negato ───────

    it('10. WORKER con kora_status sospeso: il tentativo di auto-riattivazione resta comunque negato', async () => {
      const { error } = await asClaims(
        { sub: WORKER_SUSPENDED_STATUS_AUTH_UID, app_metadata: { kora_role: 'WORKER', kora_tenant_id: tenantAId, kora_worker_id: workerSuspendedStatusId, kora_status: 'disabled' } },
        () => client.query(`UPDATE personal.worker_identity SET status = 'active' WHERE id = $1`, [workerSuspendedStatusId]),
      );
      expect(error).not.toBeNull();
    });

    it('11. WORKER di un tenant sospeso: un tentativo di modifica lifecycle (tenant_id) resta comunque negato', async () => {
      const { error } = await asClaims(
        { sub: WORKER_SUSPENDED_TENANT_AUTH_UID, app_metadata: { kora_role: 'WORKER', kora_tenant_id: tenantSuspendedId, kora_worker_id: workerSuspendedTenantId } },
        () => client.query(`UPDATE personal.worker_identity SET tenant_id = $2 WHERE id = $1`, [workerSuspendedTenantId, tenantAId]),
      );
      expect(error).not.toBeNull();
      expect(/tenant_id/i.test(error!.message)).toBe(true);
    });

    // ── 12-14. Ruoli non autorizzati ───────────────────────────────────────────

    it('12. ANON negato', async () => {
      const { error } = await asAnon(() =>
        client.query(`UPDATE personal.worker_identity SET status = 'active' WHERE id = $1`, [workerDisabledId]));
      expect(error).not.toBeNull();
      expect(/permission denied/i.test(error!.message)).toBe(true);
    });

    it('13. PARTNER negato', async () => {
      const { data, error } = await asClaims(
        { app_metadata: { kora_role: 'PARTNER', kora_partner_id: '00000000-0000-4000-8000-000000000f10' } },
        () => client.query(`UPDATE personal.worker_identity SET status = 'active' WHERE id = $1`, [workerDisabledId]).then((r) => r.rowCount),
      );
      expect(error).toBeNull();
      expect(data).toBe(0);
    });

    it('14. COMPANY_ADMIN negato', async () => {
      const { data, error } = await asClaims(
        { app_metadata: { kora_role: 'COMPANY_ADMIN', kora_tenant_id: tenantAId } },
        () => client.query(`UPDATE personal.worker_identity SET status = 'active' WHERE id = $1`, [workerDisabledId]).then((r) => r.rowCount),
      );
      expect(error).toBeNull();
      expect(data).toBe(0);
    });

    // ── 15. KORA_ADMIN — coerente con il modello (nessuna policy RLS diretta) ─

    it('15. KORA_ADMIN: comportamento coerente col modello — nessuna policy RLS diretta su worker_identity (rimossa in mig. 027), 0 righe', async () => {
      const { data, error } = await asClaims(
        { app_metadata: { kora_role: 'KORA_ADMIN' } },
        () => client.query(`UPDATE personal.worker_identity SET status = 'active' WHERE id = $1`, [workerDisabledId]).then((r) => r.rowCount),
      );
      expect(error).toBeNull();
      expect(data).toBe(0);
    });

    // ── 16. service_role — percorso amministrativo legittimo ──────────────────

    it('16. service_role: percorso amministrativo legittimo — riattivazione consentita (trigger non si applica a ruoli non-WORKER)', async () => {
      const { data, error } = await asServiceRole(() =>
        client.query(`UPDATE personal.worker_identity SET status = 'active' WHERE id = $1`, [workerDisabledId]).then((r) => r.rowCount));
      expect(error).toBeNull();
      expect(data).toBe(1);
    });

    // ── 17. Nessun side effect ──────────────────────────────────────────────

    it('17. nessun side effect: dopo tutti i tentativi negati sopra, workerDisabledId resta esattamente "disabled"', async () => {
      const status = await readStatus(workerDisabledId);
      expect(status).toBe('disabled');
    });

    // ── 18. requireWorkerUser() coerenza post-tentativo ───────────────────────

    it('18. dopo il tentativo di auto-riattivazione fallito, lo stato DB resta invariato — requireWorkerUser() (verificato behavioralmente in tests/unit/pilot-trust-04-worker-tenant-suspension.test.ts) continuerebbe quindi a negare l\'accesso', async () => {
      const status = await readStatus(workerDisabledId);
      expect(status).toBe('disabled'); // same row targeted by test 1 — confirms no partial/side-effect state survived
    });

    // ── 19. Worker valido non regredisce ──────────────────────────────────────

    it('19. worker valido (status già active) può ancora leggere/aggiornare campi propri senza errore (no-op update, nessuna regressione)', async () => {
      const { error } = await asClaims(
        { sub: WORKER_ACTIVE_AUTH_UID, app_metadata: { kora_role: 'WORKER', kora_tenant_id: tenantAId, kora_worker_id: workerActiveId } },
        () => client.query(`UPDATE personal.worker_identity SET status = 'active' WHERE id = $1`, [workerActiveId]), // no-op: status unchanged
      );
      expect(error).toBeNull();
    });

    // ── 20. Unica transizione self-service consentita ─────────────────────────

    it('20. la sola transizione self-service prevista (invited/pending -> active) funziona correttamente', async () => {
      const before = await readStatus(workerInvitedId);
      expect(before).toBe('invited');
      const { error } = await asClaims(
        { sub: WORKER_INVITED_AUTH_UID, app_metadata: { kora_role: 'WORKER', kora_tenant_id: tenantAId, kora_worker_id: workerInvitedId } },
        () => client.query(`UPDATE personal.worker_identity SET status = 'active' WHERE id = $1`, [workerInvitedId]),
      );
      expect(error).toBeNull();
      // Verify within the same (already-rolled-back) semantics by re-running
      // outside a transaction that persists just long enough to check, then
      // revert — use a fresh BEGIN/ROLLBACK pair for the read-proof.
      const { data: recheck } = await asClaims(
        { sub: WORKER_INVITED_AUTH_UID, app_metadata: { kora_role: 'WORKER', kora_tenant_id: tenantAId, kora_worker_id: workerInvitedId } },
        async () => {
          await client.query(`UPDATE personal.worker_identity SET status = 'active' WHERE id = $1`, [workerInvitedId]);
          const r = await client.query(`SELECT status FROM personal.worker_identity WHERE id = $1`, [workerInvitedId]);
          return r.rows[0].status;
        },
      );
      expect(recheck).toBe('active');
    });
  },
);
