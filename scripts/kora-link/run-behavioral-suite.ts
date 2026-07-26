/**
 * KORA-LINK-HARDENING-AUTOMATION-13C — local behavioral suite runner.
 *
 * Exercises the C1-C10 Gate 4 scenario matrix (docs/KORA_LINK_GATE_4_FINAL_REPORT.md)
 * against a real, ephemeral LOCAL Postgres instance (Supabase CLI local dev
 * stack). This is NOT a vitest test file — it is a standalone, repeatable
 * runner that connects directly via the `pg` driver, seeds isolated fixtures,
 * exercises every scenario, cleans up, and emits a machine-readable JSON
 * report with a non-zero exit code on any failure.
 *
 * Usage:
 *   npx tsx scripts/kora-link/run-behavioral-suite.ts
 *   npx tsx scripts/kora-link/run-behavioral-suite.ts --only=c10
 *   npm run test:kora-link:behavioral
 *   npm run test:kora-link:concurrency   (C10 only)
 *
 * Prerequisites:
 *   - Docker running, Supabase CLI installed (`supabase --version`).
 *   - `supabase start` already run in this repo (the runner does NOT start
 *     the stack itself — see docs/KORA_LINK_AUTOMATED_TESTING.md for why).
 *
 * By default the runner first runs `supabase db reset` to guarantee a clean,
 * fully-migrated (001-042) local database. Set KORA_LINK_SKIP_DB_RESET=1 to
 * skip this (e.g. if a CI step already did it, or to preserve manually
 * inspected state between runs).
 *
 * Connection: local Postgres only. KORA_LINK_LOCAL_DB_URL overrides the
 * default local Supabase CLI connection string
 * (postgresql://postgres:postgres@127.0.0.1:54322/postgres — Supabase CLI's
 * own well-known, non-secret local development default, never used against
 * any non-127.0.0.1 host by this script). This script refuses to run against
 * any connection string that does not point at 127.0.0.1/localhost — see
 * assertLocalOnly() below.
 *
 * Never prints full UUIDs, tokens, digests, or secrets — see mask().
 */

import { Client } from 'pg';
import { execSync } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';

// ── Config ────────────────────────────────────────────────────────────────────

const DEFAULT_LOCAL_DB_URL = 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
const DB_URL = process.env.KORA_LINK_LOCAL_DB_URL || DEFAULT_LOCAL_DB_URL;
const ONLY = (process.argv.find((a) => a.startsWith('--only='))?.split('=')[1] || '').toLowerCase();
const FIXTURE_PREFIX = 'KORA_LINK_AUTOMATION_';

function assertLocalOnly(url: string) {
  const host = new URL(url).hostname;
  if (host !== '127.0.0.1' && host !== 'localhost') {
    throw new Error(
      `Refusing to run: KORA_LINK_LOCAL_DB_URL host "${host}" is not 127.0.0.1/localhost. ` +
        `This runner is LOCAL ONLY. Use run-live-staging-suite.ts for staging, with explicit authorization.`,
    );
  }
}

function mask(id: string | null | undefined): string {
  if (!id) return '(null)';
  const s = String(id);
  return s.length > 8 ? `${s.slice(0, 4)}****${s.slice(-2)}` : '****';
}

function digest(label: string): string {
  return createHash('sha256').update(label).digest('hex');
}

const VALID_NOTICE_VERSION = 'kora-link-activation-notice-v1.0';

// ── Result collection ──────────────────────────────────────────────────────────

interface ScenarioResult {
  id: string;
  scenario: string;
  description: string;
  passed: boolean;
  detail?: string;
}

const results: ScenarioResult[] = [];

function record(id: string, scenario: string, description: string, passed: boolean, detail?: string) {
  results.push({ id, scenario, description, passed, detail });
  const mark = passed ? 'PASS' : 'FAIL';
  console.error(`[${mark}] ${id} ${description}`);
}

function assertTrue(id: string, scenario: string, description: string, condition: boolean, detail?: string) {
  record(id, scenario, description, condition, detail);
}

// ── Fixture bookkeeping (for guaranteed cleanup) ────────────────────────────────

const createdTenantIds: string[] = [];
const createdBatchCodes: string[] = [];
const createdWorkerAuthUserIds: string[] = [];
const createdCompanyIdentityAuthUserIds: string[] = [];
const createdPartnerAuthUserIds: string[] = [];
const createdPartnerProfileNames: string[] = [];

async function main() {
  assertLocalOnly(DB_URL);

  if (!process.env.KORA_LINK_SKIP_DB_RESET) {
    console.error('Running `supabase db reset` for a clean, fully-migrated local database...');
    execSync('supabase db reset', { stdio: 'inherit' });
  }

  const client = new Client({ connectionString: DB_URL });
  await client.connect();

  try {
    await verifySchemaReady(client);

    // Each scenario gets its OWN isolated tenant pair — several scenarios
    // (C5, C7, C9) assert EXACT link counts per tenant via the aggregate
    // RPC, so sharing tenants across scenarios would let one scenario's
    // fixtures inflate another's counts. Isolation per scenario, not just
    // per fixture, is required for correctness here.
    if (!ONLY || ONLY === 'c1') await runC1Anon(client);
    if (!ONLY || ONLY === 'c2') {
      const t = await createTenant(client, `${FIXTURE_PREFIX}C2_TENANT_A`);
      const t2 = await createTenant(client, `${FIXTURE_PREFIX}C2_TENANT_B`);
      await runC2WorkerIdentity(client, t, t2);
    }
    if (!ONLY || ONLY === 'c3') {
      const t = await createTenant(client, `${FIXTURE_PREFIX}C3_TENANT_A`);
      const t2 = await createTenant(client, `${FIXTURE_PREFIX}C3_TENANT_B`);
      await runC3ActivationLifecycle(client, t, t2);
    }
    if (!ONLY || ONLY === 'c4') {
      const t = await createTenant(client, `${FIXTURE_PREFIX}C4_TENANT_A`);
      await runC4Revocation(client, t);
    }
    if (!ONLY || ONLY === 'c5') {
      const t = await createTenant(client, `${FIXTURE_PREFIX}C5_TENANT_A`);
      const t2 = await createTenant(client, `${FIXTURE_PREFIX}C5_TENANT_B`);
      await runC5CompanyAdminViewer(client, t, t2);
    }
    if (!ONLY || ONLY === 'c6') {
      const t = await createTenant(client, `${FIXTURE_PREFIX}C6_TENANT_A`);
      await runC6Partner(client, t);
    }
    if (!ONLY || ONLY === 'c7') {
      const t = await createTenant(client, `${FIXTURE_PREFIX}C7_TENANT_A`);
      const t2 = await createTenant(client, `${FIXTURE_PREFIX}C7_TENANT_B`);
      await runC7KoraAdmin(client, t, t2);
    }
    if (!ONLY || ONLY === 'c8') await runC8ServiceRole(client);
    if (!ONLY || ONLY === 'c9') {
      const t = await createTenant(client, `${FIXTURE_PREFIX}C9_TENANT_A`);
      const t2 = await createTenant(client, `${FIXTURE_PREFIX}C9_TENANT_B`);
      await runC9SafeAggregation(client, t, t2);
    }
    if (!ONLY || ONLY === 'c10') await runC10Concurrency();
  } finally {
    await client.query(`SELECT set_config('request.jwt.claims', '{}', false);`);
    await cleanup(client);
    await client.end();
  }

  const failed = results.filter((r) => !r.passed);
  const report = {
    timestamp: new Date().toISOString(),
    total: results.length,
    passed: results.length - failed.length,
    failed: failed.length,
    results,
  };
  console.log(JSON.stringify(report, null, 2));

  if (failed.length > 0) {
    console.error(`\n${failed.length} scenario(s) FAILED.`);
    process.exit(1);
  }
  console.error(`\nAll ${results.length} scenarios PASSED.`);
}

// ── Schema readiness check ──────────────────────────────────────────────────────

async function verifySchemaReady(client: Client) {
  const fns = (
    await client.query(
      `SELECT proname FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'kora_link';`,
    )
  ).rows.map((r) => r.proname);
  const required = [
    'fn_activate_link_for_worker',
    'fn_revoke_link',
    'fn_replace_link',
    'fn_company_link_status_aggregate',
    'is_provisioned_company_role',
    'is_provisioned_partner',
  ];
  for (const fn of required) {
    if (!fns.includes(fn)) {
      throw new Error(
        `Schema not ready: kora_link.${fn} not found. Migrations 034-042 must be applied. ` +
          `Run \`supabase db reset\` or unset KORA_LINK_SKIP_DB_RESET.`,
      );
    }
  }
}

// ── Fixture helpers ──────────────────────────────────────────────────────────────

async function createTenant(client: Client, code: string) {
  await client.query(
    `INSERT INTO analytics.tenant (tenant_code, company_name) VALUES ($1, $2) ON CONFLICT (tenant_code) DO NOTHING;`,
    [code, `Automation ${code}`],
  );
  createdTenantIds.push(code);
  return (await client.query(`SELECT id FROM analytics.tenant WHERE tenant_code = $1;`, [code])).rows[0].id as string;
}

async function createWorker(client: Client, tenantId: string, status = 'active') {
  const authUserId = randomUUID();
  await client.query(
    `INSERT INTO personal.worker_identity (tenant_id, auth_user_id, worker_ref, status) VALUES ($1, $2, $3, $4);`,
    [tenantId, authUserId, `${FIXTURE_PREFIX}WORKER_${authUserId.slice(0, 8)}`, status],
  );
  createdWorkerAuthUserIds.push(authUserId);
  return authUserId;
}

async function createBatch(client: Client, code: string, quantity = 20) {
  await client.query(
    `INSERT INTO kora_link.link_batches (batch_code, quantity, status) VALUES ($1, $2, 'delivered') ON CONFLICT (batch_code) DO NOTHING;`,
    [code, quantity],
  );
  createdBatchCodes.push(code);
  return (await client.query(`SELECT id FROM kora_link.link_batches WHERE batch_code = $1;`, [code])).rows[0].id as string;
}

async function createLink(
  client: Client,
  batchId: string,
  tenantId: string | null,
  label: string,
  opts: { status?: string; preActivationExpiresAt?: string } = {},
) {
  const tokenDigest = digest(label);
  await client.query(
    `INSERT INTO kora_link.links (batch_id, token_digest, tenant_id, status, pre_activation_expires_at)
     VALUES ($1, $2, $3, $4, $5) ON CONFLICT (token_digest) DO NOTHING;`,
    [batchId, tokenDigest, tenantId, opts.status ?? 'delivered', opts.preActivationExpiresAt ?? null],
  );
  const row = (await client.query(`SELECT id FROM kora_link.links WHERE token_digest = $1;`, [tokenDigest])).rows[0];
  return { id: row.id as string, tokenDigest };
}

async function claimAs(client: Client, sub: string, role: string, tenantId?: string | null) {
  await client.query(`SELECT set_config('request.jwt.claims', $1, false);`, [
    JSON.stringify({ sub, app_metadata: { kora_role: role, kora_tenant_id: tenantId ?? undefined } }),
  ]);
}

async function clearClaims(client: Client) {
  await client.query(`SELECT set_config('request.jwt.claims', '{}', false);`);
}

// Runs fn() as `role`, GUARANTEEING RESET ROLE afterward even if fn() throws
// (e.g. an expected "permission denied") — SET ROLE and RESET ROLE are always
// issued as their own single-statement queries, never batched with the
// probe itself, so a mid-batch abort can never leave the connection stuck in
// a non-default role for subsequent, unrelated calls on the same client.
async function withRole<T>(client: Client, role: string, fn: () => Promise<T>): Promise<T> {
  await client.query(`SET ROLE ${role};`);
  try {
    return await fn();
  } finally {
    await client.query(`RESET ROLE;`).catch(() => {});
  }
}

async function withRoleExpectDenied(client: Client, role: string, fn: () => Promise<void>): Promise<boolean> {
  try {
    await withRole(client, role, fn);
    return false;
  } catch (e: any) {
    return /permission denied/i.test(e.message);
  }
}

async function activate(client: Client, tokenDigest: string, noticeVersion = VALID_NOTICE_VERSION) {
  return (
    await client.query(`SELECT kora_link.fn_activate_link_for_worker($1, $2) AS r;`, [tokenDigest, noticeVersion])
  ).rows[0].r;
}

async function revoke(client: Client, linkId: string, reason = 'security') {
  return (await client.query(`SELECT kora_link.fn_revoke_link($1, $2) AS r;`, [linkId, reason])).rows[0].r;
}

async function replace(client: Client, oldLinkId: string, newLinkId: string, reason = 'lost') {
  return (await client.query(`SELECT kora_link.fn_replace_link($1, $2, $3) AS r;`, [oldLinkId, newLinkId, reason]))
    .rows[0].r;
}

async function aggregate(client: Client, tenantId: string) {
  return (await client.query(`SELECT * FROM kora_link.fn_company_link_status_aggregate($1);`, [tenantId])).rows;
}

async function provisionCompanyIdentity(
  client: Client,
  authUserId: string,
  tenantId: string,
  role: 'COMPANY_ADMIN' | 'COMPANY_VIEWER',
  status: 'active' | 'disabled' = 'active',
) {
  await client.query(
    `INSERT INTO analytics.company_identity (tenant_id, auth_user_id, role, status) VALUES ($1, $2, $3, $4)
     ON CONFLICT (auth_user_id) DO UPDATE SET tenant_id = $1, role = $3, status = $4;`,
    [tenantId, authUserId, role, status],
  );
  createdCompanyIdentityAuthUserIds.push(authUserId);
}

async function createCompanyAdminAuthUser() {
  return randomUUID();
}

// ═══════════════════════════════════════════════════════════════════════════════
// C1 — ANON
// ═══════════════════════════════════════════════════════════════════════════════

async function runC1Anon(client: Client) {
  const S = 'C1';
  await clearClaims(client);
  // No app_metadata.kora_role at all == anon-equivalent for our RLS helpers,
  // since kora.kora_role() falls back to 'anonymous' with no claims set.

  const tables = [
    'link_batches', 'links', 'link_assignments', 'link_activation_acknowledgements',
    'link_events', 'revocations', 'link_replacements', 'audit_log', 'link_delivery_records',
  ];
  for (const t of tables) {
    let emptyOrDenied = false;
    try {
      const rows = await withRole(client, 'anon', async () => (await client.query(`SELECT * FROM kora_link.${t} LIMIT 1;`)).rows);
      emptyOrDenied = rows.length === 0;
    } catch (e: any) {
      emptyOrDenied = /permission denied/i.test(e.message);
    }
    assertTrue('C1.1', S, `anon cannot read any row from kora_link.${t} (deny-by-default)`, emptyOrDenied);
  }

  // Sole public exceptions: fn_public_lookup_link, fn_is_valid_token_digest
  await withRole(client, 'anon', async () => {
    const r1 = await client.query(`SELECT kora_link.fn_public_lookup_link($1) AS r;`, [digest(`${FIXTURE_PREFIX}NONEXISTENT`)]);
    assertTrue('C1.2', S, 'anon CAN call fn_public_lookup_link (documented public exception)', !!r1.rows[0].r);
    const r2 = await client.query(`SELECT kora_link.fn_is_valid_token_digest($1) AS r;`, [digest('x')]);
    assertTrue('C1.3', S, 'anon CAN call fn_is_valid_token_digest (documented public exception)', r2.rows[0].r === true);
  });

  // No direct access to admin-only RPCs either
  const anonAggregateDenied = await withRoleExpectDenied(client, 'anon', async () => {
    await client.query(`SELECT kora_link.fn_company_link_status_aggregate($1);`, [randomUUID()]);
  });
  assertTrue('C1.4', S, 'anon cannot execute fn_company_link_status_aggregate at all (no grant)', anonAggregateDenied);
}

// ═══════════════════════════════════════════════════════════════════════════════
// C2 — WORKER IDENTITY
// ═══════════════════════════════════════════════════════════════════════════════

async function runC2WorkerIdentity(client: Client, tenantA: string, tenantB: string) {
  const S = 'C2';
  const batch = await createBatch(client, `${FIXTURE_PREFIX}C2_BATCH`);

  // valid mapping
  const workerA = await createWorker(client, tenantA);
  const linkValid = await createLink(client, batch, tenantA, `${FIXTURE_PREFIX}C2_VALID`);
  await claimAs(client, workerA, 'WORKER', tenantA);
  const rValid = await activate(client, linkValid.tokenDigest);
  assertTrue('C2.1', S, 'valid worker mapping + valid token → activation succeeds', rValid.status === 'activated');

  // mapping missing (synthetic sub, no personal.worker_identity row)
  const noMappingSub = randomUUID();
  const linkNoMapping = await createLink(client, batch, tenantA, `${FIXTURE_PREFIX}C2_NOMAP`);
  await claimAs(client, noMappingSub, 'WORKER', tenantA);
  const rNoMapping = await activate(client, linkNoMapping.tokenDigest);
  assertTrue('C2.2', S, 'missing worker_identity mapping → unavailable', rNoMapping.status === 'unavailable');

  // mapping disabled
  const workerDisabled = await createWorker(client, tenantA, 'disabled');
  const linkDisabled = await createLink(client, batch, tenantA, `${FIXTURE_PREFIX}C2_DISABLED`);
  await claimAs(client, workerDisabled, 'WORKER', tenantA);
  const rDisabled = await activate(client, linkDisabled.tokenDigest);
  assertTrue('C2.3', S, 'disabled worker_identity mapping → unavailable', rDisabled.status === 'unavailable');

  // tenant mismatch (worker in tenant A, link in tenant B)
  const workerForMismatch = await createWorker(client, tenantA);
  const linkTenantB = await createLink(client, batch, tenantB, `${FIXTURE_PREFIX}C2_TENANTMISMATCH`);
  await claimAs(client, workerForMismatch, 'WORKER', tenantA);
  const rMismatch = await activate(client, linkTenantB.tokenDigest);
  assertTrue('C2.4', S, 'worker-tenant vs link-tenant mismatch → unavailable', rMismatch.status === 'unavailable');

  // forged claim simulation: role says WORKER, tenant claimed, but sub matches nothing real
  const forgedSub = randomUUID();
  const linkForged = await createLink(client, batch, tenantA, `${FIXTURE_PREFIX}C2_FORGED`);
  await claimAs(client, forgedSub, 'WORKER', tenantA);
  const rForged = await activate(client, linkForged.tokenDigest);
  assertTrue('C2.5', S, 'forged claim (well-formed, no backing row) → unavailable, same as missing mapping', rForged.status === 'unavailable');

  // own-row access contract: worker can SELECT own personal.worker_identity row
  await claimAs(client, workerA, 'WORKER', tenantA);
  const ownRows = await withRole(client, 'authenticated', async () =>
    (await client.query(`SELECT id FROM personal.worker_identity WHERE auth_user_id = $1;`, [workerA])).rows,
  );
  assertTrue('C2.6', S, 'worker can SELECT own personal.worker_identity row', ownRows.length === 1);
}

// ═══════════════════════════════════════════════════════════════════════════════
// C3 — ACTIVATION LIFECYCLE
// ═══════════════════════════════════════════════════════════════════════════════

async function runC3ActivationLifecycle(client: Client, tenantA: string, tenantB: string) {
  const S = 'C3';
  const batch = await createBatch(client, `${FIXTURE_PREFIX}C3_BATCH`);
  const worker = await createWorker(client, tenantA);

  // valid
  const linkValid = await createLink(client, batch, tenantA, `${FIXTURE_PREFIX}C3_VALID`);
  await claimAs(client, worker, 'WORKER', tenantA);
  const rValid = await activate(client, linkValid.tokenDigest);
  assertTrue('C3.1', S, 'valid activation succeeds end-to-end', rValid.status === 'activated');

  // invalid token (well-formed hex digest, no matching row)
  const rInvalid = await activate(client, digest(`${FIXTURE_PREFIX}C3_NEVER_CREATED`));
  assertTrue('C3.2', S, 'invalid/nonexistent token → unavailable', rInvalid.status === 'unavailable');

  // expired (pre_activation_expires_at in the past, status still delivered)
  const linkExpired = await createLink(client, batch, tenantA, `${FIXTURE_PREFIX}C3_EXPIRED`, {
    preActivationExpiresAt: '2020-01-01T00:00:00Z',
  });
  const rExpired = await activate(client, linkExpired.tokenDigest);
  assertTrue('C3.3', S, 'expired pre-activation TTL → unavailable', rExpired.status === 'unavailable');

  // revoked
  const linkForRevoke = await createLink(client, batch, tenantA, `${FIXTURE_PREFIX}C3_REVOKED`, { status: 'revoked' });
  const rRevoked = await activate(client, linkForRevoke.tokenDigest);
  assertTrue('C3.4', S, 'revoked link → unavailable', rRevoked.status === 'unavailable');

  // duplicate (already active, same worker)
  const rDuplicate = await activate(client, linkValid.tokenDigest);
  assertTrue('C3.5', S, 'duplicate activation by the same worker → already_active', rDuplicate.status === 'already_active');

  // cross-tenant (covered structurally by C2.4, re-verified here for C3's own record)
  const workerCrossTenant = await createWorker(client, tenantA);
  const linkTenantB = await createLink(client, batch, tenantB, `${FIXTURE_PREFIX}C3_CROSSTENANT`);
  await claimAs(client, workerCrossTenant, 'WORKER', tenantA);
  const rCrossTenant = await activate(client, linkTenantB.tokenDigest);
  assertTrue('C3.6', S, 'cross-tenant activation attempt → unavailable', rCrossTenant.status === 'unavailable');

  // disabled worker (covered structurally by C2.3, re-verified here for C3's own record)
  const workerDisabled2 = await createWorker(client, tenantA, 'disabled');
  const linkForDisabled = await createLink(client, batch, tenantA, `${FIXTURE_PREFIX}C3_DISABLEDWORKER`);
  await claimAs(client, workerDisabled2, 'WORKER', tenantA);
  const rDisabledWorker = await activate(client, linkForDisabled.tokenDigest);
  assertTrue('C3.7', S, 'disabled worker → unavailable', rDisabledWorker.status === 'unavailable');

  // missing mapping (re-verified here for C3's own record)
  const missingSub = randomUUID();
  const linkForMissing = await createLink(client, batch, tenantA, `${FIXTURE_PREFIX}C3_MISSINGMAP`);
  await claimAs(client, missingSub, 'WORKER', tenantA);
  const rMissing = await activate(client, linkForMissing.tokenDigest);
  assertTrue('C3.8', S, 'missing worker mapping → unavailable', rMissing.status === 'unavailable');

  // no raw token persistence anywhere after a real activation
  await claimAs(client, worker, 'WORKER', tenantA);
  const eventRows = await client.query(
    `SELECT metadata::text AS m FROM kora_link.link_events WHERE link_id = $1;`,
    [linkValid.id],
  );
  const ackRows = await client.query(
    `SELECT * FROM kora_link.link_activation_acknowledgements WHERE link_id = $1;`,
    [linkValid.id],
  );
  const noRawTokenInEvents = eventRows.rows.every((r) => !r.m.includes(linkValid.tokenDigest));
  assertTrue('C3.9', S, 'no raw/full token_digest ever appears in link_events.metadata', noRawTokenInEvents);
  assertTrue(
    'C3.10',
    S,
    'link_activation_acknowledgements has no token/digest column at all (schema-level, re-verified live)',
    Object.keys(ackRows.rows[0] ?? {}).every((col) => !/token/i.test(col)),
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// C4 — REVOCATION
// ═══════════════════════════════════════════════════════════════════════════════

async function runC4Revocation(client: Client, tenantA: string) {
  const S = 'C4';
  const batch = await createBatch(client, `${FIXTURE_PREFIX}C4_BATCH`);
  const admin = randomUUID();
  const worker = randomUUID();

  // KORA_ADMIN only — company/worker denied
  const linkForDenyTests = await createLink(client, batch, tenantA, `${FIXTURE_PREFIX}C4_DENYTEST`);
  await claimAs(client, worker, 'WORKER', tenantA);
  const rWorkerDenied = await revoke(client, linkForDenyTests.id);
  assertTrue('C4.1', S, 'WORKER cannot revoke → forbidden', rWorkerDenied.success === false && rWorkerDenied.error_code === 'forbidden');

  const companyAdminSub = randomUUID();
  await claimAs(client, companyAdminSub, 'COMPANY_ADMIN', tenantA);
  const rCompanyDenied = await revoke(client, linkForDenyTests.id);
  assertTrue('C4.2', S, 'COMPANY_ADMIN cannot revoke → forbidden', rCompanyDenied.success === false && rCompanyDenied.error_code === 'forbidden');

  // KORA_ADMIN success + audit (039) + duplicate + not-reactivatable
  const linkForRevoke = await createLink(client, batch, tenantA, `${FIXTURE_PREFIX}C4_REVOKE`);
  await claimAs(client, admin, 'KORA_ADMIN', null);
  const rSuccess = await revoke(client, linkForRevoke.id, 'security');
  assertTrue('C4.3', S, 'KORA_ADMIN revoke succeeds', rSuccess.success === true);

  const auditRow = (
    await client.query(
      `SELECT action, result, actor_type FROM kora_link.audit_log WHERE action = 'LINK_REVOKED' AND link_id = $1;`,
      [linkForRevoke.id],
    )
  ).rows;
  assertTrue('C4.4', S, '039 audit hardening: exactly 1 LINK_REVOKED audit row written', auditRow.length === 1 && auditRow[0].actor_type === 'kora_admin');

  const rDuplicate = await revoke(client, linkForRevoke.id, 'security');
  assertTrue('C4.5', S, 'duplicate revoke on an already-revoked link → already_terminal', rDuplicate.success === false && rDuplicate.error_code === 'already_terminal');

  const auditCountAfterDuplicate = (
    await client.query(`SELECT count(*)::int c FROM kora_link.audit_log WHERE action = 'LINK_REVOKED' AND link_id = $1;`, [linkForRevoke.id])
  ).rows[0].c;
  assertTrue('C4.6', S, 'duplicate revoke does not create a second audit row (idempotent audit)', auditCountAfterDuplicate === 1);

  // revoked → not reactivatable
  const workerForReactivate = await createWorker(client, tenantA);
  await claimAs(client, workerForReactivate, 'WORKER', tenantA);
  const rReactivate = await activate(client, linkForRevoke.tokenDigest);
  assertTrue('C4.7', S, 'revoked link cannot be reactivated → unavailable', rReactivate.status === 'unavailable');

  // acknowledged terminal behavior: activate, then revoke, ack record survives (append-only)
  const workerAckFlow = await createWorker(client, tenantA);
  const linkAckFlow = await createLink(client, batch, tenantA, `${FIXTURE_PREFIX}C4_ACKFLOW`);
  await claimAs(client, workerAckFlow, 'WORKER', tenantA);
  await activate(client, linkAckFlow.tokenDigest);
  const ackBefore = (await client.query(`SELECT count(*)::int c FROM kora_link.link_activation_acknowledgements WHERE link_id = $1;`, [linkAckFlow.id])).rows[0].c;
  await claimAs(client, admin, 'KORA_ADMIN', null);
  await revoke(client, linkAckFlow.id, 'security');
  const ackAfter = (await client.query(`SELECT count(*)::int c FROM kora_link.link_activation_acknowledgements WHERE link_id = $1;`, [linkAckFlow.id])).rows[0].c;
  assertTrue('C4.8', S, 'acknowledgement record survives revocation unchanged (append-only, not deleted/updated)', ackBefore === 1 && ackAfter === 1);

  // expired → revoked path (an activation_pending, TTL-expired link, explicitly revoked by admin)
  const linkExpiredThenRevoked = await createLink(client, batch, tenantA, `${FIXTURE_PREFIX}C4_EXPIREDTHENREVOKED`, {
    status: 'activation_pending',
    preActivationExpiresAt: '2020-01-01T00:00:00Z',
  });
  const rExpiredRevoke = await revoke(client, linkExpiredThenRevoked.id, 'expired');
  assertTrue('C4.9', S, 'admin can explicitly revoke an already-TTL-expired link (expired → revoked transition)', rExpiredRevoke.success === true);
}

// ═══════════════════════════════════════════════════════════════════════════════
// C5 — COMPANY ADMIN / VIEWER
// ═══════════════════════════════════════════════════════════════════════════════

async function runC5CompanyAdminViewer(client: Client, tenantA: string, tenantB: string) {
  const S = 'C5';
  const batch = await createBatch(client, `${FIXTURE_PREFIX}C5_BATCH`);
  for (let i = 0; i < 10; i++) {
    await createLink(client, batch, tenantA, `${FIXTURE_PREFIX}C5_LINK_${i}`);
  }

  const validAdmin = await createCompanyAdminAuthUser();
  const noMappingAdmin = await createCompanyAdminAuthUser();
  const disabledAdmin = await createCompanyAdminAuthUser();
  const tenantMismatchAdmin = await createCompanyAdminAuthUser();
  const roleMismatchAdmin = await createCompanyAdminAuthUser();
  const viewer = await createCompanyAdminAuthUser();

  // missing mapping
  await claimAs(client, noMappingAdmin, 'COMPANY_ADMIN', tenantA);
  assertTrue('C5.1', S, 'company_identity mapping missing → empty result', (await aggregate(client, tenantA)).length === 0);

  // claim-only (same as missing mapping, emphasized as its own scenario per spec)
  const claimOnlySub = randomUUID();
  await claimAs(client, claimOnlySub, 'COMPANY_ADMIN', tenantA);
  assertTrue('C5.2', S, 'claim-only (syntactically valid, no server-side mapping) → empty result', (await aggregate(client, tenantA)).length === 0);

  // valid → allowed
  await provisionCompanyIdentity(client, validAdmin, tenantA, 'COMPANY_ADMIN', 'active');
  await claimAs(client, validAdmin, 'COMPANY_ADMIN', tenantA);
  const validResult = await aggregate(client, tenantA);
  assertTrue('C5.3', S, 'valid company_identity (active, matching role+tenant) → aggregate allowed', validResult.length === 1 && Number(validResult[0].count) === 10);

  // disabled
  await provisionCompanyIdentity(client, disabledAdmin, tenantA, 'COMPANY_ADMIN', 'disabled');
  await claimAs(client, disabledAdmin, 'COMPANY_ADMIN', tenantA);
  assertTrue('C5.4', S, 'disabled company_identity mapping → empty result', (await aggregate(client, tenantA)).length === 0);

  // tenant mismatch
  await provisionCompanyIdentity(client, tenantMismatchAdmin, tenantB, 'COMPANY_ADMIN', 'active');
  await claimAs(client, tenantMismatchAdmin, 'COMPANY_ADMIN', tenantA);
  assertTrue('C5.5', S, 'company_identity tenant mismatch (mapping=B, claim=A) → empty result', (await aggregate(client, tenantA)).length === 0);

  // role mismatch
  await provisionCompanyIdentity(client, roleMismatchAdmin, tenantA, 'COMPANY_VIEWER', 'active');
  await claimAs(client, roleMismatchAdmin, 'COMPANY_ADMIN', tenantA);
  assertTrue('C5.6', S, 'company_identity role mismatch (mapping=VIEWER, claim=ADMIN) → empty result', (await aggregate(client, tenantA)).length === 0);

  // viewer: valid mapping, still denied by the pre-existing role gate
  await provisionCompanyIdentity(client, viewer, tenantA, 'COMPANY_VIEWER', 'active');
  await claimAs(client, viewer, 'COMPANY_VIEWER', tenantA);
  assertTrue('C5.7', S, 'COMPANY_VIEWER with a fully valid mapping is still denied the aggregate RPC (unchanged contract)', (await aggregate(client, tenantA)).length === 0);
}

// ═══════════════════════════════════════════════════════════════════════════════
// C6 — PARTNER
// ═══════════════════════════════════════════════════════════════════════════════

async function runC6Partner(client: Client, tenantA: string) {
  const S = 'C6';
  const partnerName = `${FIXTURE_PREFIX}C6_PARTNER`;
  await client.query(`INSERT INTO network.partner_profile (name, pillar, status) VALUES ($1, 'GROWTH', 'draft') ON CONFLICT DO NOTHING;`, [partnerName]);
  createdPartnerProfileNames.push(partnerName);
  const partnerId = (await client.query(`SELECT id FROM network.partner_profile WHERE name = $1;`, [partnerName])).rows[0].id as string;

  const partnerAuthValid = randomUUID();
  const partnerAuthNoMapping = randomUUID();
  const partnerAuthDisabled = randomUUID();

  // mapping absent
  await claimAs(client, partnerAuthNoMapping, 'PARTNER', null);
  const helperNoMapping = (await client.query(`SELECT kora_link.is_provisioned_partner($1) AS ok;`, [partnerId])).rows[0].ok;
  assertTrue('C6.1', S, 'is_provisioned_partner() false when no mapping exists', helperNoMapping === false);

  // valid mapping
  await client.query(
    `INSERT INTO network.partner_identity (partner_id, auth_user_id, email, status) VALUES ($1, $2, $3, 'active');`,
    [partnerId, partnerAuthValid, `${FIXTURE_PREFIX.toLowerCase()}valid@automation.test`],
  );
  createdPartnerAuthUserIds.push(partnerAuthValid);
  await claimAs(client, partnerAuthValid, 'PARTNER', null);
  const helperValid = (await client.query(`SELECT kora_link.is_provisioned_partner($1) AS ok;`, [partnerId])).rows[0].ok;
  assertTrue('C6.2', S, 'is_provisioned_partner() true for a valid active mapping', helperValid === true);

  // disabled mapping
  await client.query(
    `INSERT INTO network.partner_identity (partner_id, auth_user_id, email, status) VALUES ($1, $2, $3, 'disabled');`,
    [partnerId, partnerAuthDisabled, `${FIXTURE_PREFIX.toLowerCase()}disabled@automation.test`],
  );
  createdPartnerAuthUserIds.push(partnerAuthDisabled);
  await claimAs(client, partnerAuthDisabled, 'PARTNER', null);
  const helperDisabled = (await client.query(`SELECT kora_link.is_provisioned_partner($1) AS ok;`, [partnerId])).rows[0].ok;
  assertTrue('C6.3', S, 'is_provisioned_partner() false for a disabled mapping', helperDisabled === false);

  // deny-by-default: PARTNER (even with valid mapping) has zero access to any live KORA Link RPC
  await claimAs(client, partnerAuthValid, 'PARTNER', null);
  const partnerAggregate = await aggregate(client, tenantA);
  assertTrue('C6.4', S, 'PARTNER (valid mapping) still gets empty result from fn_company_link_status_aggregate (no new surface)', partnerAggregate.length === 0);

  const linkForPartnerDeny = await createLink(client, await createBatch(client, `${FIXTURE_PREFIX}C6_BATCH`), tenantA, `${FIXTURE_PREFIX}C6_DENYLINK`);
  const partnerActivate = await activate(client, linkForPartnerDeny.tokenDigest);
  assertTrue('C6.5', S, 'PARTNER cannot activate a link (WORKER-only path, unaffected)', partnerActivate.status === 'unavailable');

  const partnerRevoke = await revoke(client, linkForPartnerDeny.id);
  assertTrue('C6.6', S, 'PARTNER cannot revoke (KORA_ADMIN-only path, unaffected)', partnerRevoke.success === false && partnerRevoke.error_code === 'forbidden');

  // no direct table access (still claimed as PARTNER from the calls above)
  let partnerDirectAccessBlocked = false;
  try {
    const rows = await withRole(client, 'authenticated', async () => (await client.query(`SELECT * FROM kora_link.links LIMIT 1;`)).rows);
    partnerDirectAccessBlocked = rows.length === 0; // RLS: no policy grants PARTNER visibility
  } catch (e: any) {
    partnerDirectAccessBlocked = /permission denied/i.test(e.message);
  }
  assertTrue('C6.7', S, 'PARTNER (authenticated, no company/kora_admin RLS policy) cannot read kora_link.links directly', partnerDirectAccessBlocked);
}

// ═══════════════════════════════════════════════════════════════════════════════
// C7 — KORA_ADMIN
// ═══════════════════════════════════════════════════════════════════════════════

async function runC7KoraAdmin(client: Client, tenantA: string, tenantB: string) {
  const S = 'C7';
  const admin = randomUUID();
  const batch = await createBatch(client, `${FIXTURE_PREFIX}C7_BATCH`);
  // 10 links (not fewer) so the count is above safe_aggregation_threshold and
  // therefore visible — this scenario is about cross-tenant access, not
  // suppression (that is C9's job); a 1-9 count would show NULL/suppressed
  // here and give a false negative unrelated to what C7.1 is testing.
  for (let i = 0; i < 10; i++) await createLink(client, batch, tenantB, `${FIXTURE_PREFIX}C7_TENANTB_${i}`);

  // cross-tenant globally, by design
  await claimAs(client, admin, 'KORA_ADMIN', null);
  const crossTenantResult = await aggregate(client, tenantB);
  assertTrue('C7.1', S, 'KORA_ADMIN can query any tenant (tenant B) with no company_identity row', crossTenantResult.length === 1 && Number(crossTenantResult[0].count) === 10);

  // revoke/replace as KORA_ADMIN, cross-tenant
  const linkToRevokeCrossTenant = await createLink(client, batch, tenantB, `${FIXTURE_PREFIX}C7_REVOKE_CROSSTENANT`);
  const rRevoke = await revoke(client, linkToRevokeCrossTenant.id, 'security');
  assertTrue('C7.2', S, 'KORA_ADMIN can revoke a link in ANY tenant (bounded cross-tenant by design)', rRevoke.success === true);

  const oldLink = await createLink(client, batch, tenantB, `${FIXTURE_PREFIX}C7_REPLACE_OLD`);
  const newLink = await createLink(client, batch, null, `${FIXTURE_PREFIX}C7_REPLACE_NEW`, { status: 'generated' });
  const rReplace = await replace(client, oldLink.id, newLink.id, 'lost');
  assertTrue('C7.3', S, 'KORA_ADMIN can replace a link in any tenant', rReplace.success === true);

  // UPDATE only on mutable tables (links, link_assignments) — append-only tables reject UPDATE
  const auditUpdateDenied = await withRoleExpectDenied(client, 'authenticated', async () => {
    await client.query(`UPDATE kora_link.audit_log SET result = 'tampered' WHERE true;`);
  });
  assertTrue('C7.4', S, 'UPDATE on append-only kora_link.audit_log is rejected (no UPDATE grant to authenticated)', auditUpdateDenied);

  // DELETE denied on any kora_link table
  const deleteDenied = await withRoleExpectDenied(client, 'authenticated', async () => {
    await client.query(`DELETE FROM kora_link.links WHERE id = $1;`, [oldLink.id]);
  });
  assertTrue('C7.5', S, 'DELETE on kora_link.links is rejected for authenticated (no DELETE grant anywhere)', deleteDenied);

  // no raw token ever surfaced to KORA_ADMIN via audit
  const auditRows = await client.query(`SELECT token_digest_prefix FROM kora_link.audit_log WHERE link_id = $1;`, [linkToRevokeCrossTenant.id]);
  assertTrue('C7.6', S, 'audit rows visible to KORA_ADMIN never carry a full token_digest (only NULL or 8-char prefix)', auditRows.rows.every((r) => r.token_digest_prefix === null || r.token_digest_prefix.length === 8));
}

// ═══════════════════════════════════════════════════════════════════════════════
// C8 — SERVICE ROLE
// ═══════════════════════════════════════════════════════════════════════════════

async function runC8ServiceRole(client: Client) {
  const S = 'C8';
  const batch = await createBatch(client, `${FIXTURE_PREFIX}C8_BATCH`);
  const link = await createLink(client, batch, null, `${FIXTURE_PREFIX}C8_LINK`);

  // BYPASSRLS: service_role can SELECT despite no policy granting it explicitly (RLS bypass)
  const serviceSelectCount = await withRole(client, 'service_role', async () =>
    (await client.query(`SELECT count(*)::int c FROM kora_link.links;`)).rows[0].c,
  );
  assertTrue('C8.1', S, 'service_role (BYPASSRLS) can SELECT kora_link.links regardless of policy', serviceSelectCount >= 1);

  // no DELETE grant even for service_role (BYPASSRLS != blanket grant)
  const deleteDenied = await withRoleExpectDenied(client, 'service_role', async () => {
    await client.query(`DELETE FROM kora_link.links WHERE id = $1;`, [link.id]);
  });
  assertTrue('C8.2', S, 'service_role cannot DELETE kora_link.links (BYPASSRLS bypasses RLS only, not privilege grants)', deleteDenied);

  // constraints still apply to service_role
  let constraintViolation = false;
  try {
    await withRole(client, 'service_role', async () => {
      await client.query(`INSERT INTO kora_link.links (batch_id, token_digest) VALUES ($1, $2);`, [batch, link.tokenDigest]);
    });
  } catch (e: any) {
    constraintViolation = /duplicate key|unique constraint/i.test(e.message);
  }
  assertTrue('C8.3', S, 'UNIQUE constraint on token_digest still applies to service_role (BYPASSRLS does not bypass constraints)', constraintViolation);

  // revoke/replace still gated by the internal KORA_ADMIN role check even for service_role
  await claimAs(client, randomUUID(), 'WORKER', null); // service_role calling with a non-admin claim
  const revokeAsService = await withRole(client, 'service_role', async () =>
    (await client.query(`SELECT kora_link.fn_revoke_link($1, 'security') AS r;`, [link.id])).rows[0].r,
  );
  assertTrue(
    'C8.4', S,
    'fn_revoke_link internal role check still applies to service_role callers without a KORA_ADMIN claim',
    revokeAsService.success === false && revokeAsService.error_code === 'forbidden',
  );

  // helper grants: is_provisioned_company_role/is_provisioned_partner NOT granted to service_role
  const helperDeniedForService = await withRoleExpectDenied(client, 'service_role', async () => {
    await client.query(`SELECT kora_link.is_provisioned_company_role();`);
  });
  assertTrue('C8.5', S, 'kora_link.is_provisioned_company_role() has no EXECUTE grant for service_role', helperDeniedForService);

  await clearClaims(client);
}

// ═══════════════════════════════════════════════════════════════════════════════
// C9 — SAFE AGGREGATION
// ═══════════════════════════════════════════════════════════════════════════════

async function runC9SafeAggregation(client: Client, tenantA: string, tenantB: string) {
  const S = 'C9';
  const batch9 = await createBatch(client, `${FIXTURE_PREFIX}C9_BATCH_9`);
  const batch10 = await createBatch(client, `${FIXTURE_PREFIX}C9_BATCH_10`);
  const batch11 = await createBatch(client, `${FIXTURE_PREFIX}C9_BATCH_11`);

  for (let i = 0; i < 9; i++) await createLink(client, batch9, tenantA, `${FIXTURE_PREFIX}C9_9_${i}`, { status: 'delivered' });
  for (let i = 0; i < 10; i++) await createLink(client, batch10, tenantA, `${FIXTURE_PREFIX}C9_10_${i}`, { status: 'assigned_to_tenant' });
  for (let i = 0; i < 11; i++) await createLink(client, batch11, tenantA, `${FIXTURE_PREFIX}C9_11_${i}`, { status: 'generated' });
  // Tenant B noise, must never bleed into tenant A's counts.
  for (let i = 0; i < 15; i++) await createLink(client, batch9, tenantB, `${FIXTURE_PREFIX}C9_TENANTB_${i}`, { status: 'delivered' });

  const admin = randomUUID();
  await claimAs(client, admin, 'KORA_ADMIN', null);
  const rows = await aggregate(client, tenantA);
  const byStatus = Object.fromEntries(rows.map((r) => [r.status, r]));

  assertTrue('C9.1', S, 'bucket with 9 links → count suppressed (NULL), suppressed=true', byStatus.delivered?.count === null && byStatus.delivered?.suppressed === true);
  assertTrue('C9.2', S, 'bucket with 10 links → count visible, suppressed=false', Number(byStatus.assigned_to_tenant?.count) === 10 && byStatus.assigned_to_tenant?.suppressed === false);
  assertTrue('C9.3', S, 'bucket with 11 links → count visible, suppressed=false (no off-by-one)', Number(byStatus.generated?.count) === 11 && byStatus.generated?.suppressed === false);
  assertTrue('C9.4', S, 'threshold applies per-bucket independently (3 different buckets, 3 different outcomes)', Boolean(byStatus.delivered && byStatus.assigned_to_tenant && byStatus.generated));

  const tenantBRows = await aggregate(client, tenantB);
  const tenantBDelivered = tenantBRows.find((r) => r.status === 'delivered');
  assertTrue('C9.5', S, 'tenant scope: tenant B aggregate (15 delivered) is independent of tenant A, no cross-tenant bleed', Number(tenantBDelivered?.count) === 15);

  assertTrue('C9.6', S, 'aggregate result columns are exactly (status, count, suppressed) — no link_id/worker_id ever present', rows.every((r) => Object.keys(r).sort().join(',') === 'count,status,suppressed'));
}

// ═══════════════════════════════════════════════════════════════════════════════
// C10 — CONCURRENCY (two real PostgreSQL connections)
// ═══════════════════════════════════════════════════════════════════════════════

async function runC10Concurrency() {
  const S = 'C10';
  const setupClient = new Client({ connectionString: DB_URL });
  await setupClient.connect();

  try {
    const tenantA = await createTenant(setupClient, `${FIXTURE_PREFIX}C10_TENANT_A`);
    const tenantB = await createTenant(setupClient, `${FIXTURE_PREFIX}C10_TENANT_B`);
    const batch = await createBatch(setupClient, `${FIXTURE_PREFIX}C10_BATCH`);

    await raceScenario('C10.1', 'A1 vs A2 — two different workers race to activate the same link', setupClient, batch, tenantA, tenantA, tenantA);
    await raceScenario('C10.2', 'A1 vs A1 — the same worker races itself (two sessions)', setupClient, batch, tenantA, tenantA, tenantA, true);
    await raceScenario('C10.3', 'A1 vs B1 — cross-tenant race on the same link', setupClient, batch, tenantA, tenantA, tenantB, false, true);
    await rollbackRecoveryScenario(setupClient, batch, tenantA);
  } finally {
    await setupClient.end();
  }
}

async function raceScenario(
  id: string,
  description: string,
  setupClient: Client,
  batchId: string,
  linkTenant: string,
  worker1Tenant: string,
  worker2Tenant: string,
  sameWorker = false,
  // True only for the cross-tenant race (worker2 does NOT belong to
  // linkTenant). In that shape the race is asymmetric: whichever request
  // wins the row lock still has to pass the tenant check afterward, so it is
  // legitimate (and was observed) for BOTH requests to end up non-activated
  // — the lock loser gets concurrent_request, and if the wrong-tenant
  // request happens to win the lock, IT then fails the tenant check
  // (unavailable). "Exactly one winner" only holds for symmetric races
  // (C10.1/C10.2) where both participants are equally eligible.
  asymmetricEligibility = false,
) {
  const S = 'C10';
  const link = await createLink(setupClient, batchId, linkTenant, `${FIXTURE_PREFIX}${id}_LINK_${randomUUID().slice(0, 8)}`);
  const worker1 = await createWorker(setupClient, worker1Tenant);
  const worker2 = sameWorker ? worker1 : await createWorker(setupClient, worker2Tenant);

  const clientA = new Client({ connectionString: DB_URL });
  const clientB = new Client({ connectionString: DB_URL });
  await clientA.connect();
  await clientB.connect();

  try {
    await claimAs(clientA, worker1, 'WORKER', worker1Tenant);
    await claimAs(clientB, worker2, 'WORKER', worker2Tenant);

    // Fire both activation attempts concurrently — no await between the two
    // query() calls, so both requests reach Postgres before either completes.
    const [resA, resB] = await Promise.allSettled([
      activate(clientA, link.tokenDigest),
      activate(clientB, link.tokenDigest),
    ]);

    const a = resA.status === 'fulfilled' ? resA.value : { status: 'error', reason: String(resA.reason) };
    const b = resB.status === 'fulfilled' ? resB.value : { status: 'error', reason: String(resB.reason) };
    if (process.env.KORA_LINK_DEBUG) console.error(`DEBUG ${id}:`, JSON.stringify({ a, b }));

    const winners = [a, b].filter((r) => r.status === 'activated');
    const losers = [a, b].filter((r) => r.status !== 'activated');
    const validLoserOutcome = (r: any) => r.reason === 'concurrent_request' || r.status === 'unavailable' || r.status === 'already_active';

    if (!asymmetricEligibility) {
      assertTrue(`${id}.1`, S, `${description}: exactly one winner (activated)`, winners.length === 1);
      assertTrue(`${id}.2`, S, `${description}: the loser gets a defined non-activated outcome (concurrent_request/unavailable/already_active)`, losers.length === 1 && validLoserOutcome(losers[0]));
    } else {
      // Asymmetric (cross-tenant): at most one winner, and if there IS a
      // winner it must be worker1 (the eligible one) — worker2 (wrong
      // tenant) must NEVER reach 'activated', regardless of lock timing.
      assertTrue(`${id}.1`, S, `${description}: at most one winner, and worker2 (wrong tenant) is never the winner`, winners.length <= 1 && b.status !== 'activated');
      assertTrue(`${id}.2`, S, `${description}: every non-activated result is a defined outcome (concurrent_request/unavailable/already_active)`, losers.every(validLoserOutcome));
    }

    const assignmentCount = (
      await setupClient.query(`SELECT count(*)::int c FROM kora_link.link_assignments WHERE link_id = $1 AND status = 'active';`, [link.id])
    ).rows[0].c;
    // Symmetric races already established winners.length===1 above, so the
    // assignment count must match exactly; asymmetric races may legitimately
    // produce 0 or 1 (never more) depending on which side won the lock.
    const assignmentCountOk = asymmetricEligibility ? assignmentCount <= 1 : assignmentCount === 1;
    assertTrue(`${id}.3`, S, `${description}: assignment count is internally consistent (0 double winners, never >1)`, assignmentCountOk);

    const ackCount = (
      await setupClient.query(`SELECT count(*)::int c FROM kora_link.link_activation_acknowledgements WHERE link_id = $1;`, [link.id])
    ).rows[0].c;
    assertTrue(`${id}.4`, S, `${description}: acknowledgement row count matches assignment count (unique assignment/acknowledgement, no orphan)`, ackCount === assignmentCount);

    const eventCount = (
      await setupClient.query(`SELECT count(*)::int c FROM kora_link.link_events WHERE link_id = $1 AND event_type = 'activation_completed';`, [link.id])
    ).rows[0].c;
    assertTrue(`${id}.5`, S, `${description}: activation_completed event count matches assignment count (0 partial states)`, eventCount === assignmentCount);
  } finally {
    await clientA.end();
    await clientB.end();
  }
}

async function rollbackRecoveryScenario(setupClient: Client, batchId: string, tenantA: string) {
  const id = 'C10.4';
  const S = 'C10';
  const link = await createLink(setupClient, batchId, tenantA, `${FIXTURE_PREFIX}C10_ROLLBACK_${randomUUID().slice(0, 8)}`);
  const workerRolledBack = await createWorker(setupClient, tenantA);
  const workerClean = await createWorker(setupClient, tenantA);

  const clientA = new Client({ connectionString: DB_URL });
  await clientA.connect();
  try {
    await claimAs(clientA, workerRolledBack, 'WORKER', tenantA);
    await clientA.query('BEGIN');
    await clientA.query(`SELECT kora_link.fn_activate_link_for_worker($1, $2);`, [link.tokenDigest, VALID_NOTICE_VERSION]);
    await clientA.query('ROLLBACK');

    const clientB = new Client({ connectionString: DB_URL });
    await clientB.connect();
    try {
      await claimAs(clientB, workerClean, 'WORKER', tenantA);
      const rClean = await activate(clientB, link.tokenDigest);
      assertTrue(id, S, 'after a rolled-back activation attempt, a subsequent clean activation succeeds with no residue', rClean.status === 'activated');

      const assignmentCount = (
        await setupClient.query(`SELECT count(*)::int c FROM kora_link.link_assignments WHERE link_id = $1;`, [link.id])
      ).rows[0].c;
      assertTrue(`${id}b`, S, 'exactly one link_assignments row exists after rollback + clean retry (no orphaned row from the rolled-back attempt)', assignmentCount === 1);
    } finally {
      await clientB.end();
    }
  } finally {
    await clientA.end();
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Cleanup
// ═══════════════════════════════════════════════════════════════════════════════

async function cleanup(client: Client) {
  for (const code of createdBatchCodes) {
    const batch = (await client.query(`SELECT id FROM kora_link.link_batches WHERE batch_code = $1;`, [code])).rows[0];
    if (!batch) continue;
    const linkIds = (await client.query(`SELECT id FROM kora_link.links WHERE batch_id = $1;`, [batch.id])).rows.map((r) => r.id);
    if (linkIds.length > 0) {
      await client.query(`DELETE FROM kora_link.audit_log WHERE link_id = ANY($1::uuid[]);`, [linkIds]);
      await client.query(`DELETE FROM kora_link.link_events WHERE link_id = ANY($1::uuid[]);`, [linkIds]);
      await client.query(`DELETE FROM kora_link.revocations WHERE link_id = ANY($1::uuid[]);`, [linkIds]);
      await client.query(`DELETE FROM kora_link.link_replacements WHERE old_link_id = ANY($1::uuid[]) OR new_link_id = ANY($1::uuid[]);`, [linkIds]);
      await client.query(`DELETE FROM kora_link.link_activation_acknowledgements WHERE link_id = ANY($1::uuid[]);`, [linkIds]);
      await client.query(`DELETE FROM kora_link.link_assignments WHERE link_id = ANY($1::uuid[]);`, [linkIds]);
      await client.query(`DELETE FROM kora_link.links WHERE id = ANY($1::uuid[]);`, [linkIds]);
    }
    await client.query(`DELETE FROM kora_link.link_batches WHERE id = $1;`, [batch.id]);
  }
  // Defensive residual check — every link this script creates goes through
  // createLink() with a tracked batch, so this should always find zero rows;
  // kept as a safety net rather than assumed.
  const residualLinks = (
    await client.query(
      `SELECT l.id FROM kora_link.links l JOIN kora_link.link_batches b ON b.id = l.batch_id WHERE b.batch_code LIKE $1;`,
      [`${FIXTURE_PREFIX}%`],
    )
  ).rows.map((r) => r.id);
  if (residualLinks.length > 0) {
    throw new Error(
      `cleanup(): ${residualLinks.length} residual kora_link.links row(s) matching ${FIXTURE_PREFIX}* were not ` +
        `removed by the per-batch cleanup loop — investigate before trusting "fixture residue = 0".`,
    );
  }

  if (createdCompanyIdentityAuthUserIds.length > 0) {
    await client.query(`DELETE FROM analytics.company_identity WHERE auth_user_id = ANY($1::uuid[]);`, [createdCompanyIdentityAuthUserIds]);
  }
  if (createdPartnerAuthUserIds.length > 0) {
    await client.query(`DELETE FROM network.partner_identity WHERE auth_user_id = ANY($1::uuid[]);`, [createdPartnerAuthUserIds]);
  }
  for (const name of createdPartnerProfileNames) {
    await client.query(`DELETE FROM network.partner_profile WHERE name = $1;`, [name]);
  }
  if (createdWorkerAuthUserIds.length > 0) {
    await client.query(`DELETE FROM personal.worker_identity WHERE auth_user_id = ANY($1::uuid[]);`, [createdWorkerAuthUserIds]);
  }
  for (const code of createdTenantIds) {
    await client.query(`DELETE FROM analytics.tenant WHERE tenant_code = $1;`, [code]);
  }
}

main().catch((e) => {
  console.error('FATAL ERROR:', e.message);
  process.exit(1);
});
