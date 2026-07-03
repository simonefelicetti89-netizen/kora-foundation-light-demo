/**
 * RLS-03 — Synthetic Two-Tenant Negative DB Test (live Supabase)
 *
 * WHAT THIS IS:
 *   The first LIVE proof that Postgres/Supabase RLS — not app code — rejects
 *   cross-tenant reads. It authenticates as two distinct synthetic tenants
 *   directly against Supabase (via @supabase/supabase-js), with no Next.js
 *   app or browser involved at all.
 *
 * WHAT THIS IS NOT:
 *   - NOT tests/unit/rls-policy-inventory.test.ts (RLS-02). That test parses
 *     migration SQL text — it proves nothing about live database behavior.
 *     This test is the live counterpart RLS-02 explicitly does not attempt.
 *   - NOT a browser/E2E test. RLS-04/RLS-05 (tests/e2e/, Playwright) drive
 *     the actual Next.js app/UI as authenticated users. This file never
 *     imports Playwright and never navigates a page — it calls the Supabase
 *     client library directly, the same way RLS itself is enforced.
 *
 * SAFETY MODEL (read before touching this file):
 *   - Fully skip-safe: every functional test in this file lives inside a
 *     single `describe.skipIf(!ready)` block, where `ready` requires ALL
 *     RLS03_* credentials to be present AND RLS03_ALLOW_RUN==='true'. With
 *     neither set (the default state of this repo — see .env.local.example),
 *     nothing in this file opens a network connection; `npm test` sees this
 *     file, registers its test names as skipped, and runs zero of their
 *     bodies.
 *   - No Supabase client is ever constructed at module top level — only
 *     inside the guarded `beforeAll` below, which itself only runs when the
 *     describe.skipIf gate above it has already passed.
 *   - A separate, ALWAYS-ON guard (further down, outside the skip gate)
 *     hard-blocks known staging/production project refs the moment
 *     RLS03_SUPABASE_URL is set to one of them — even if RLS03_ALLOW_RUN is
 *     not set. A misconfigured URL should fail loudly, not skip silently.
 *   - Uses ONLY the RLS03_* env var namespace (see list below). Never reads
 *     NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
 *     SUPABASE_SERVICE_ROLE_KEY, any E2E_* var, or any Vercel env var — this
 *     is deliberate: this test must never be able to accidentally resolve to
 *     staging or production just because those variables happen to already
 *     be set in a developer's shell.
 *   - This test creates and tears down its OWN fixture data (2 synthetic
 *     tenants tagged tenant_kind='TEST', tenant_code RLS03-A/RLS03-B, plus
 *     a handful of analytics rows) via the service-role key. It does
 *     **not** create or reset any Auth user — the two company-admin test
 *     users are provisioned out-of-band (RLS-03F, a separate, explicitly
 *     confirmed step per docs/RLS_03_THROWAWAY_SUPABASE_CHECKLIST.md) and
 *     are only ever signed in here via email+password.
 *
 * TABLE SCOPE (see docs/RLS_03_THROWAWAY_SUPABASE_CHECKLIST.md §E for why):
 *   IN:  analytics.tenant, analytics.source_batch, analytics.kora_index_result,
 *        analytics.activation_result.
 *   OUT (explicitly, never touched here): personal.* (all worker-individual
 *        tables — reserved for RLS-05), analytics.uef_record (no direct
 *        COMPANY_ADMIN policy exists on it — a tenant test on it would prove
 *        the wrong thing), commons.* (commons.post has a deliberate
 *        cross-tenant WORKER policy — needs its own dedicated test),
 *        network.* (not tenant-scoped), and anything under KORA Link
 *        (frozen, out of scope — supabase/proposed/034-036).
 *
 * REQUIRED ENV VARS (RLS03_* namespace only — see docs/RLS_03_THROWAWAY_SUPABASE_CHECKLIST.md §C):
 *   RLS03_SUPABASE_URL, RLS03_SUPABASE_ANON_KEY, RLS03_SUPABASE_SERVICE_ROLE_KEY,
 *   RLS03_TENANT_A_EMAIL, RLS03_TENANT_A_PASSWORD,
 *   RLS03_TENANT_B_EMAIL, RLS03_TENANT_B_PASSWORD,
 *   RLS03_ADMIN_EMAIL (optional), RLS03_ADMIN_PASSWORD (optional),
 *   RLS03_ALLOW_RUN (must be exactly 'true').
 *   All values live only in a gitignored .env.rls03.local — never in
 *   .env.local, .env.staging.local, or any committed file.
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// ── Env reading — mirrors tests/e2e/helpers/env.ts's pattern exactly, but in
// the RLS03_* namespace. Never returns/logs a raw value, only presence. ──────

function readEnv(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim().length > 0 ? value : undefined;
}

interface Rls03Config {
  url: string;
  anonKey: string;
  serviceRoleKey: string;
  tenantAEmail: string;
  tenantAPassword: string;
  tenantBEmail: string;
  tenantBPassword: string;
  adminEmail?: string;
  adminPassword?: string;
}

function readRls03Config(): Rls03Config | null {
  const url = readEnv('RLS03_SUPABASE_URL');
  const anonKey = readEnv('RLS03_SUPABASE_ANON_KEY');
  const serviceRoleKey = readEnv('RLS03_SUPABASE_SERVICE_ROLE_KEY');
  const tenantAEmail = readEnv('RLS03_TENANT_A_EMAIL');
  const tenantAPassword = readEnv('RLS03_TENANT_A_PASSWORD');
  const tenantBEmail = readEnv('RLS03_TENANT_B_EMAIL');
  const tenantBPassword = readEnv('RLS03_TENANT_B_PASSWORD');

  if (!url || !anonKey || !serviceRoleKey || !tenantAEmail || !tenantAPassword || !tenantBEmail || !tenantBPassword) {
    return null;
  }

  return {
    url,
    anonKey,
    serviceRoleKey,
    tenantAEmail,
    tenantAPassword,
    tenantBEmail,
    tenantBPassword,
    adminEmail: readEnv('RLS03_ADMIN_EMAIL'),
    adminPassword: readEnv('RLS03_ADMIN_PASSWORD'),
  };
}

/** RLS03_ALLOW_RUN is a deliberate second gate, distinct from credential presence — see file header. */
function isRunExplicitlyAllowed(): boolean {
  return readEnv('RLS03_ALLOW_RUN') === 'true';
}

// ── Hard denylist: known non-throwaway project refs ───────────────────────────
// Sourced from docs/ENVIRONMENT_SAFETY_CHECK.md and
// docs/archive/gate2/GATE2_STAGING_APP_ENV_WIRING.md, both already committed
// to this repo. These are Supabase PROJECT REFS — the subdomain segment of a
// project's URL — not credentials; listed again here only so RLS-03 can hard
// -block ever targeting them, regardless of what RLS03_SUPABASE_URL is set to.
const KNOWN_NON_THROWAWAY_PROJECT_REFS = [
  'azdnepfmwrmacruykskm', // production — never a valid RLS-03 target, under any circumstance
  'haqflkurpmeaxpikozjl', // staging (dedicated) — shared with other in-flight work, discouraged for RLS-03
];

function assertNotKnownSharedProject(url: string): void {
  const lower = url.toLowerCase();
  for (const ref of KNOWN_NON_THROWAWAY_PROJECT_REFS) {
    if (lower.includes(ref)) {
      throw new Error(
        `RLS03_SUPABASE_URL matches a known staging/production project ref. ` +
          `RLS-03 must only ever target a dedicated throwaway Supabase project — refusing to proceed. ` +
          `See docs/RLS_03_THROWAWAY_SUPABASE_CHECKLIST.md §B.`,
      );
    }
  }
}

// ── Always-on static guard (never skipped, no network call ever made here) ────
// Runs unconditionally, independent of RLS03_ALLOW_RUN and independent of
// whether the other RLS03_* vars are set — so a misconfigured
// RLS03_SUPABASE_URL fails LOUDLY the moment it's set to a known shared
// project, rather than silently skipping alongside everything else below.

describe('RLS-03 guard — RLS03_SUPABASE_URL must never be a known staging/production project', () => {
  it('RLS03_SUPABASE_URL (if set) does not match a known shared project ref', () => {
    const url = readEnv('RLS03_SUPABASE_URL');
    if (!url) {
      // Nothing configured in this environment — nothing to guard against.
      // Not a skip: this assertion is vacuously satisfied, matching this
      // check's narrow, always-safe scope (pure string comparison, no I/O).
      expect(url).toBeUndefined();
      return;
    }
    expect(() => assertNotKnownSharedProject(url)).not.toThrow();
  });
});

// ── Main suite gate ────────────────────────────────────────────────────────────
// Evaluated once at module load (plain string/env reads only — no network
// call, no client construction). `ready` is what describe.skipIf below acts
// on; when false, vitest registers every nested it() as skipped and never
// invokes beforeAll/afterAll/it bodies at all.

const config = readRls03Config();
const allowed = isRunExplicitlyAllowed();
const ready = config !== null && allowed;

const RLS03_TENANT_CODES = ['RLS03-A', 'RLS03-B'] as const;
const RLS03_REPORTING_PERIOD = 'RLS03-SYNTHETIC';

describe.skipIf(!ready)(
  'RLS-03 — synthetic two-tenant negative DB test (live Supabase; not RLS-02 static, not browser E2E)',
  () => {
    let serviceClient: SupabaseClient;
    let tenantAClient: SupabaseClient;
    let tenantBClient: SupabaseClient;
    let tenantAId: string;
    let tenantBId: string;

    beforeAll(async () => {
      // `ready` guarantees `config` is non-null here — this file's only
      // reachable-when-ready path. Re-checked defensively, never trusted
      // implicitly, since this function is the one place a real client gets
      // constructed.
      if (!config) throw new Error('unreachable: beforeAll only runs when describe.skipIf(!ready) has already passed');

      // Defense in depth — the always-on guard above already covers this,
      // but a client must never be constructed even if that guard were ever
      // removed or refactored.
      assertNotKnownSharedProject(config.url);

      // ── Service-role client — fixture setup/teardown ONLY. Never used for
      // the actual tenant-isolation assertions below (those must go through
      // RLS, i.e. through the anon-key clients signed in as each tenant). ──
      serviceClient = createClient(config.url, config.serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });

      // ── Guarded fixture setup ──────────────────────────────────────────
      // Only ever reached when RLS03_ALLOW_RUN==='true' and every RLS03_*
      // var is set (the describe.skipIf gate above). Tenant upsert is
      // idempotent (ON CONFLICT on tenant_code); the analytics rows below
      // are made idempotent by delete-then-insert scoped to this test's own
      // tenant ids and RLS03_REPORTING_PERIOD tag, so re-running this suite
      // never accumulates duplicate rows even if a prior afterAll didn't
      // complete (e.g. a crashed process).
      const { data: tenantA, error: tenantAErr } = await serviceClient
        .schema('analytics')
        .from('tenant')
        .upsert(
          { tenant_code: 'RLS03-A', company_name: 'RLS-03 Synthetic Tenant A', tenant_kind: 'TEST' },
          { onConflict: 'tenant_code' },
        )
        .select('id')
        .single();
      if (tenantAErr || !tenantA) {
        throw new Error(`RLS-03 fixture setup failed creating Tenant A: ${tenantAErr?.message ?? 'no row returned'}`);
      }
      tenantAId = tenantA.id as string;

      const { data: tenantB, error: tenantBErr } = await serviceClient
        .schema('analytics')
        .from('tenant')
        .upsert(
          { tenant_code: 'RLS03-B', company_name: 'RLS-03 Synthetic Tenant B', tenant_kind: 'TEST' },
          { onConflict: 'tenant_code' },
        )
        .select('id')
        .single();
      if (tenantBErr || !tenantB) {
        throw new Error(`RLS-03 fixture setup failed creating Tenant B: ${tenantBErr?.message ?? 'no row returned'}`);
      }
      tenantBId = tenantB.id as string;

      // Clear any leftover rows from a prior incomplete run, then insert fresh.
      await serviceClient
        .schema('analytics')
        .from('kora_index_result')
        .delete()
        .in('tenant_id', [tenantAId, tenantBId])
        .eq('reporting_period', RLS03_REPORTING_PERIOD);
      await serviceClient
        .schema('analytics')
        .from('activation_result')
        .delete()
        .in('tenant_id', [tenantAId, tenantBId])
        .eq('reporting_period', RLS03_REPORTING_PERIOD);
      await serviceClient
        .schema('analytics')
        .from('source_batch')
        .delete()
        .in('tenant_id', [tenantAId, tenantBId])
        .eq('reporting_period', RLS03_REPORTING_PERIOD);

      for (const tenantId of [tenantAId, tenantBId]) {
        const { error: sbErr } = await serviceClient.schema('analytics').from('source_batch').insert({
          tenant_id: tenantId,
          source_type: 'manual',
          reporting_period: RLS03_REPORTING_PERIOD,
        });
        if (sbErr) throw new Error(`RLS-03 fixture setup failed inserting source_batch for ${tenantId}: ${sbErr.message}`);

        const { error: kiErr } = await serviceClient.schema('analytics').from('kora_index_result').insert({
          tenant_id: tenantId,
          reporting_period: RLS03_REPORTING_PERIOD,
          methodology_version_id: 'KORA Methodology v0.1',
          kora_index_value: 50.0,
          safeguard_status: 'CLEAR',
          calibration_status: 'pre_empirical_calibration',
          is_current: true,
        });
        if (kiErr) throw new Error(`RLS-03 fixture setup failed inserting kora_index_result for ${tenantId}: ${kiErr.message}`);

        const { error: arErr } = await serviceClient.schema('analytics').from('activation_result').insert({
          tenant_id: tenantId,
          reporting_period: RLS03_REPORTING_PERIOD,
          methodology_version_id: 'KORA Methodology v0.1',
          calibration_status: 'pre_empirical_calibration',
        });
        if (arErr) throw new Error(`RLS-03 fixture setup failed inserting activation_result for ${tenantId}: ${arErr.message}`);
      }

      // ── Sign in as each tenant's pre-existing COMPANY_ADMIN test user ──
      // These users are NOT created here — user creation is RLS-03F, a
      // separate, explicitly-confirmed out-of-band step (see
      // docs/RLS_03_THROWAWAY_SUPABASE_CHECKLIST.md §G). This test only
      // ever signs in with already-provisioned credentials.
      tenantAClient = createClient(config.url, config.anonKey);
      const { error: signInAErr } = await tenantAClient.auth.signInWithPassword({
        email: config.tenantAEmail,
        password: config.tenantAPassword,
      });
      if (signInAErr) throw new Error(`RLS-03: Tenant A sign-in failed: ${signInAErr.message}`);

      tenantBClient = createClient(config.url, config.anonKey);
      const { error: signInBErr } = await tenantBClient.auth.signInWithPassword({
        email: config.tenantBEmail,
        password: config.tenantBPassword,
      });
      if (signInBErr) throw new Error(`RLS-03: Tenant B sign-in failed: ${signInBErr.message}`);
    });

    afterAll(async () => {
      // Guarded behind the same run gate as everything else in this describe
      // block (afterAll only executes if beforeAll executed). Teardown is
      // scoped STRICTLY to this test's own tenant codes — never a blanket
      // delete of any table.
      if (!serviceClient) return;

      const { data: tenants } = await serviceClient
        .schema('analytics')
        .from('tenant')
        .select('id')
        .in('tenant_code', RLS03_TENANT_CODES as unknown as string[]);
      const ids = (tenants ?? []).map((t: { id: string }) => t.id);
      if (ids.length === 0) return;

      await serviceClient.schema('analytics').from('kora_index_result').delete().in('tenant_id', ids);
      await serviceClient.schema('analytics').from('activation_result').delete().in('tenant_id', ids);
      await serviceClient.schema('analytics').from('source_batch').delete().in('tenant_id', ids);
      await serviceClient
        .schema('analytics')
        .from('tenant')
        .delete()
        .in('tenant_code', RLS03_TENANT_CODES as unknown as string[]);
    });

    // ── Shared assertion helper ────────────────────────────────────────────
    // `0 rows alone is not enough unless the matching positive control also
    // passes` (docs/RLS_03_THROWAWAY_SUPABASE_CHECKLIST.md §F) — every
    // negative test below has a positive-control sibling, and both query the
    // SAME table via the SAME client shape, so a broken fixture/claim
    // mismatch shows up as a failing positive control, not a falsely-passing
    // negative one.
    async function ownTenantRows(client: SupabaseClient, table: string, tenantId: string) {
      return client.schema('analytics').from(table).select('id, tenant_id').eq('tenant_id', tenantId);
    }

    const tables = ['kora_index_result', 'source_batch', 'activation_result'] as const;

    for (const table of tables) {
      describe(`analytics.${table}`, () => {
        it(`Tenant A can read Tenant A analytics.${table} rows (positive control)`, async () => {
          const { data, error } = await ownTenantRows(tenantAClient, table, tenantAId);
          expect(error).toBeNull();
          expect(data?.length ?? 0).toBeGreaterThan(0);
        });

        it(`Tenant B can read Tenant B analytics.${table} rows (positive control)`, async () => {
          const { data, error } = await ownTenantRows(tenantBClient, table, tenantBId);
          expect(error).toBeNull();
          expect(data?.length ?? 0).toBeGreaterThan(0);
        });

        it(`Tenant A cannot read Tenant B analytics.${table} rows`, async () => {
          const { data, error } = await ownTenantRows(tenantAClient, table, tenantBId);
          // A real RLS block surfaces as zero rows, not a query error — an
          // error here would indicate a different failure mode (see
          // docs/RLS_03_THROWAWAY_SUPABASE_CHECKLIST.md §H) and should be
          // investigated, not treated as a pass.
          expect(error).toBeNull();
          expect(data?.length ?? 0).toBe(0);
        });

        it(`Tenant B cannot read Tenant A analytics.${table} rows`, async () => {
          const { data, error } = await ownTenantRows(tenantBClient, table, tenantAId);
          expect(error).toBeNull();
          expect(data?.length ?? 0).toBe(0);
        });
      });
    }
  },
);
