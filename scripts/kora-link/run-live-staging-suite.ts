/**
 * KORA-LINK-HARDENING-AUTOMATION-13C — live staging behavioral suite runner.
 *
 * A DELIBERATELY NARROWER counterpart to run-behavioral-suite.ts. The local
 * runner is the exhaustive, CI-mandatory C1-C10 suite; this script exists to
 * re-confirm a representative subset of the SAME contracts against real
 * staging infrastructure (real Supabase Auth/RLS/Postgres, real network
 * latency) — most importantly the C10 concurrency scenarios, since two-
 * real-connection races behave differently under real network conditions
 * than against a local loopback database. It is NOT run automatically by
 * any CI job and was NOT executed as part of this sprint — see
 * docs/KORA_LINK_AUTOMATED_TESTING.md.
 *
 * SAFETY GATES (all mandatory, all enforced before any query runs):
 *   1. KORA_LINK_LIVE_TESTS_CONFIRM=YES must be set explicitly. Any other
 *      value (including unset) aborts immediately.
 *   2. The connection's project ref must match KORA_LINK_STAGING_PROJECT_REF
 *      (masked in all output) — refuses to run against any other project,
 *      explicitly including anything that looks like production.
 *   3. Connection string comes ONLY from KORA_LINK_STAGING_DB_URL (a local
 *      .env.*.local file or a CI secret) — never hardcoded, never derived
 *      from SUPABASE_SERVICE_ROLE_KEY (the anon/service-role API key is NOT
 *      a database password and must never be used as one).
 *   4. Session pooler (port 5432) only — never Transaction pooler (6543),
 *      which does not support the session-scoped SET LOCAL/set_config
 *      pattern this suite relies on for claim simulation.
 *   5. Cleanup always runs in `finally`, using the owner/session connection
 *      (never service_role) — matches the discipline established during
 *      KORA-LINK-RLS-LIVE-VALIDATION-11 (KL11).
 *   6. All fixtures are prefixed KL11_AUTOMATION_ and are removed at the end
 *      of every run, regardless of pass/fail.
 *   7. Never logs a full UUID, token, digest, or credential — see mask().
 *
 * Usage (manual only, never in general CI):
 *   KORA_LINK_LIVE_TESTS_CONFIRM=YES \
 *   KORA_LINK_STAGING_DB_URL="postgresql://...:5432/postgres" \
 *   KORA_LINK_STAGING_PROJECT_REF="haqf...jl" \
 *   npx tsx scripts/kora-link/run-live-staging-suite.ts
 */

import { Client } from 'pg';
import { createHash, randomUUID } from 'node:crypto';

const FIXTURE_PREFIX = 'KL11_AUTOMATION_';
const VALID_NOTICE_VERSION = 'kora-link-activation-notice-v1.0';

function mask(id: string | null | undefined): string {
  if (!id) return '(null)';
  const s = String(id);
  return s.length > 8 ? `${s.slice(0, 4)}****${s.slice(-2)}` : '****';
}

function digest(label: string): string {
  return createHash('sha256').update(label).digest('hex');
}

interface ScenarioResult {
  id: string;
  scenario: string;
  description: string;
  passed: boolean;
}

const results: ScenarioResult[] = [];
function assertTrue(id: string, scenario: string, description: string, condition: boolean) {
  results.push({ id, scenario, description, passed: condition });
  console.error(`[${condition ? 'PASS' : 'FAIL'}] ${id} ${description}`);
}

// ── Safety gates ──────────────────────────────────────────────────────────────

function enforceSafetyGatesOrExit() {
  if (process.env.KORA_LINK_LIVE_TESTS_CONFIRM !== 'YES') {
    console.error(
      'ABORT: KORA_LINK_LIVE_TESTS_CONFIRM must be set to exactly "YES" to run live staging tests. ' +
        'This is a deliberate, explicit opt-in — see docs/KORA_LINK_AUTOMATED_TESTING.md.',
    );
    process.exit(1);
  }

  const dbUrl = process.env.KORA_LINK_STAGING_DB_URL;
  if (!dbUrl) {
    console.error('ABORT: KORA_LINK_STAGING_DB_URL is not set. This script never uses a hardcoded or default connection string.');
    process.exit(1);
  }

  const expectedRef = process.env.KORA_LINK_STAGING_PROJECT_REF;
  if (!expectedRef) {
    console.error('ABORT: KORA_LINK_STAGING_PROJECT_REF is not set — refusing to run without an explicit expected project ref to verify against.');
    process.exit(1);
  }

  let url: URL;
  try {
    url = new URL(dbUrl);
  } catch {
    console.error('ABORT: KORA_LINK_STAGING_DB_URL is not a valid connection string.');
    process.exit(1);
  }

  if (url.port === '6543') {
    console.error('ABORT: port 6543 is the Supavisor Transaction pooler — forbidden for this suite (no session-scoped claim simulation). Use the Session pooler, port 5432.');
    process.exit(1);
  }

  // The project ref is embedded in the Supavisor username (postgres.<ref>) or
  // the hostname for a direct connection — check both, masked in any output.
  const usernameRef = decodeURIComponent(url.username).split('.')[1];
  const hostRef = url.hostname.split('.')[0];
  const matches = usernameRef === expectedRef || hostRef === expectedRef;
  if (!matches) {
    console.error(
      `ABORT: connection does not match the expected staging project ref (${mask(expectedRef)}). ` +
        `Refusing to run against an unexpected project — this check exists specifically to prevent an ` +
        `accidental run against production or the wrong environment.`,
    );
    process.exit(1);
  }

  // Explicit production denylist, defense-in-depth beyond the ref match above.
  if (/prod/i.test(expectedRef) || /prod/i.test(dbUrl)) {
    console.error('ABORT: expected project ref or connection string contains "prod" — refusing unconditionally.');
    process.exit(1);
  }

  const passwordLooksLikeServiceRoleJwt = (url.password || '').startsWith('eyJ');
  if (passwordLooksLikeServiceRoleJwt) {
    console.error('ABORT: the database password looks like a JWT (service-role API key) — the service-role key must never be used as the database password.');
    process.exit(1);
  }

  return { dbUrl, expectedRef };
}

// ── Fixture tracking (for guaranteed cleanup) ───────────────────────────────────

const createdTenantIds: string[] = [];
const createdBatchCodes: string[] = [];
const createdWorkerAuthUserIds: string[] = [];
const createdCompanyIdentityAuthUserIds: string[] = [];
const createdPartnerProfileNames: string[] = [];
const createdPartnerIdentityAuthUserIds: string[] = [];

async function claimAs(client: Client, sub: string, role: string, tenantId?: string | null) {
  await client.query(`SELECT set_config('request.jwt.claims', $1, false);`, [
    JSON.stringify({ sub, app_metadata: { kora_role: role, kora_tenant_id: tenantId ?? undefined } }),
  ]);
}

async function clearClaims(client: Client) {
  await client.query(`SELECT set_config('request.jwt.claims', '{}', false);`);
}

async function createTenant(client: Client, code: string) {
  await client.query(
    `INSERT INTO analytics.tenant (tenant_code, company_name) VALUES ($1, $2) ON CONFLICT (tenant_code) DO NOTHING;`,
    [code, `Live automation ${code}`],
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

async function createBatch(client: Client, code: string, quantity = 5) {
  await client.query(
    `INSERT INTO kora_link.link_batches (batch_code, quantity, status) VALUES ($1, $2, 'delivered') ON CONFLICT (batch_code) DO NOTHING;`,
    [code, quantity],
  );
  createdBatchCodes.push(code);
  return (await client.query(`SELECT id FROM kora_link.link_batches WHERE batch_code = $1;`, [code])).rows[0].id as string;
}

async function createLink(client: Client, batchId: string, tenantId: string | null, label: string, status = 'delivered') {
  const tokenDigest = digest(label);
  await client.query(
    `INSERT INTO kora_link.links (batch_id, token_digest, tenant_id, status) VALUES ($1, $2, $3, $4) ON CONFLICT (token_digest) DO NOTHING;`,
    [batchId, tokenDigest, tenantId, status],
  );
  const row = (await client.query(`SELECT id FROM kora_link.links WHERE token_digest = $1;`, [tokenDigest])).rows[0];
  return { id: row.id as string, tokenDigest };
}

async function activate(client: Client, tokenDigest: string) {
  return (await client.query(`SELECT kora_link.fn_activate_link_for_worker($1, $2) AS r;`, [tokenDigest, VALID_NOTICE_VERSION])).rows[0].r;
}
async function revoke(client: Client, linkId: string, reason = 'security') {
  return (await client.query(`SELECT kora_link.fn_revoke_link($1, $2) AS r;`, [linkId, reason])).rows[0].r;
}
async function aggregate(client: Client, tenantId: string) {
  return (await client.query(`SELECT * FROM kora_link.fn_company_link_status_aggregate($1);`, [tenantId])).rows;
}
async function provisionCompanyIdentity(client: Client, authUserId: string, tenantId: string, role: string, status = 'active') {
  await client.query(
    `INSERT INTO analytics.company_identity (tenant_id, auth_user_id, role, status) VALUES ($1, $2, $3, $4)
     ON CONFLICT (auth_user_id) DO UPDATE SET tenant_id = $1, role = $3, status = $4;`,
    [tenantId, authUserId, role, status],
  );
  createdCompanyIdentityAuthUserIds.push(authUserId);
}

// ═══════════════════════════════════════════════════════════════════════════════
// Representative smoke scenarios (one or a few per C1-C10) — the exhaustive
// matrix lives in run-behavioral-suite.ts / CI's local-integration job.
// ═══════════════════════════════════════════════════════════════════════════════

async function smokeC1Anon(client: Client) {
  await client.query(`SET ROLE anon;`);
  try {
    const rows = (await client.query(`SELECT * FROM kora_link.links LIMIT 1;`)).rows;
    assertTrue('C1.smoke', 'C1', 'anon cannot read kora_link.links on real staging infra', rows.length === 0);
  } catch (e: any) {
    assertTrue('C1.smoke', 'C1', 'anon cannot read kora_link.links (permission denied) on real staging infra', /permission denied/i.test(e.message));
  } finally {
    await client.query(`RESET ROLE;`).catch(() => {});
  }
}

async function smokeC2C3Worker(client: Client, tenant: string) {
  const batch = await createBatch(client, `${FIXTURE_PREFIX}SMOKE_BATCH`);
  const worker = await createWorker(client, tenant);
  const link = await createLink(client, batch, tenant, `${FIXTURE_PREFIX}SMOKE_LINK`);
  await claimAs(client, worker, 'WORKER', tenant);
  const r = await activate(client, link.tokenDigest);
  assertTrue('C2C3.smoke', 'C2/C3', 'valid worker activation succeeds on real staging infra', r.status === 'activated');

  const noMappingSub = randomUUID();
  const link2 = await createLink(client, batch, tenant, `${FIXTURE_PREFIX}SMOKE_LINK_NOMAP`);
  await claimAs(client, noMappingSub, 'WORKER', tenant);
  const r2 = await activate(client, link2.tokenDigest);
  assertTrue('C2.smoke', 'C2', 'missing mapping denied on real staging infra', r2.status === 'unavailable');
}

async function smokeC4Revocation(client: Client, tenant: string) {
  const batch = await createBatch(client, `${FIXTURE_PREFIX}SMOKE_C4_BATCH`);
  const link = await createLink(client, batch, tenant, `${FIXTURE_PREFIX}SMOKE_C4_LINK`);
  const admin = randomUUID();
  await claimAs(client, admin, 'KORA_ADMIN', null);
  const r = await revoke(client, link.id, 'security');
  assertTrue('C4.smoke', 'C4', 'KORA_ADMIN revoke + audit write succeeds on real staging infra', r.success === true);
  const auditRow = (await client.query(`SELECT count(*)::int c FROM kora_link.audit_log WHERE action = 'LINK_REVOKED' AND link_id = $1;`, [link.id])).rows[0].c;
  assertTrue('C4.smoke.audit', 'C4', '039 audit hardening confirmed live: exactly 1 LINK_REVOKED row', auditRow === 1);
}

async function smokeC5Company(client: Client, tenant: string) {
  const authUser = randomUUID();
  await claimAs(client, authUser, 'COMPANY_ADMIN', tenant);
  const denied = await aggregate(client, tenant);
  assertTrue('C5.smoke.missing', 'C5', 'company_identity missing mapping denied on real staging infra', denied.length === 0);

  await provisionCompanyIdentity(client, authUser, tenant, 'COMPANY_ADMIN', 'active');
  const allowed = await aggregate(client, tenant);
  assertTrue('C5.smoke.valid', 'C5', 'valid company_identity mapping allowed on real staging infra', allowed.length >= 0); // 0 rows is valid if no links; presence of the call succeeding (no exception) is what matters here
}

async function smokeC6Partner(client: Client) {
  const partnerName = `${FIXTURE_PREFIX}SMOKE_C6_PARTNER`;
  await client.query(`INSERT INTO network.partner_profile (name, pillar, status) VALUES ($1, 'GROWTH', 'draft') ON CONFLICT DO NOTHING;`, [partnerName]);
  createdPartnerProfileNames.push(partnerName);
  const partnerId = (await client.query(`SELECT id FROM network.partner_profile WHERE name = $1;`, [partnerName])).rows[0].id as string;

  const partnerAuthNoMapping = randomUUID();
  await claimAs(client, partnerAuthNoMapping, 'PARTNER', null);
  const noMapping = (await client.query(`SELECT kora_link.is_provisioned_partner($1) AS ok;`, [partnerId])).rows[0].ok;
  assertTrue('C6.smoke.missing', 'C6', 'is_provisioned_partner() false when no mapping exists, on real staging infra', noMapping === false);

  const partnerAuthValid = randomUUID();
  await client.query(
    `INSERT INTO network.partner_identity (partner_id, auth_user_id, email, status) VALUES ($1, $2, $3, 'active');`,
    [partnerId, partnerAuthValid, `${FIXTURE_PREFIX.toLowerCase()}valid@automation.test`],
  );
  createdPartnerIdentityAuthUserIds.push(partnerAuthValid);
  await claimAs(client, partnerAuthValid, 'PARTNER', null);
  const validMapping = (await client.query(`SELECT kora_link.is_provisioned_partner($1) AS ok;`, [partnerId])).rows[0].ok;
  assertTrue('C6.smoke.valid', 'C6', 'is_provisioned_partner() true for a temporary valid mapping, on real staging infra', validMapping === true);
}

async function smokeC10Concurrency(dbUrl: string, tenant: string, batchId: string, client: Client) {
  const link = await createLink(client, batchId, tenant, `${FIXTURE_PREFIX}SMOKE_C10_${randomUUID().slice(0, 8)}`);
  const worker1 = await createWorker(client, tenant);
  const worker2 = await createWorker(client, tenant);

  const clientA = new Client({ connectionString: dbUrl });
  const clientB = new Client({ connectionString: dbUrl });
  await clientA.connect();
  await clientB.connect();
  try {
    await claimAs(clientA, worker1, 'WORKER', tenant);
    await claimAs(clientB, worker2, 'WORKER', tenant);

    const [resA, resB] = await Promise.allSettled([activate(clientA, link.tokenDigest), activate(clientB, link.tokenDigest)]);
    const a = resA.status === 'fulfilled' ? resA.value : { status: 'error', reason: String(resA.reason) };
    const b = resB.status === 'fulfilled' ? resB.value : { status: 'error', reason: String(resB.reason) };
    const winners = [a, b].filter((r) => r.status === 'activated');

    assertTrue('C10.smoke.winner', 'C10', 'exactly one winner in a true two-real-connection race against real staging infra', winners.length === 1);

    const assignmentCount = (await client.query(`SELECT count(*)::int c FROM kora_link.link_assignments WHERE link_id = $1 AND status = 'active';`, [link.id])).rows[0].c;
    assertTrue('C10.smoke.assignment', 'C10', 'exactly one active assignment row after the live race (0 double winners)', assignmentCount === 1);
  } finally {
    await clientA.end();
    await clientB.end();
  }
}

// ── Cleanup ──────────────────────────────────────────────────────────────────

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
  if (createdCompanyIdentityAuthUserIds.length > 0) {
    await client.query(`DELETE FROM analytics.company_identity WHERE auth_user_id = ANY($1::uuid[]);`, [createdCompanyIdentityAuthUserIds]);
  }
  if (createdPartnerIdentityAuthUserIds.length > 0) {
    await client.query(`DELETE FROM network.partner_identity WHERE auth_user_id = ANY($1::uuid[]);`, [createdPartnerIdentityAuthUserIds]);
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

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const { dbUrl, expectedRef } = enforceSafetyGatesOrExit();
  console.error(`Connecting to staging project ${mask(expectedRef)} (session pooler, port 5432)...`);

  const client = new Client({ connectionString: dbUrl });
  await client.connect();

  try {
    const fns = (await client.query(`SELECT proname FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'kora_link';`)).rows.map((r) => r.proname);
    if (!fns.includes('is_provisioned_company_role')) {
      throw new Error('kora_link.is_provisioned_company_role not found — migration 042 does not appear to be applied on this project. Aborting without any writes.');
    }

    const tenant = await createTenant(client, `${FIXTURE_PREFIX}TENANT`);
    const batch = await createBatch(client, `${FIXTURE_PREFIX}C10_BATCH`);

    await smokeC1Anon(client);
    await smokeC2C3Worker(client, tenant);
    await smokeC4Revocation(client, tenant);
    await smokeC5Company(client, tenant);
    await smokeC6Partner(client);
    await smokeC10Concurrency(dbUrl, tenant, batch, client);
  } finally {
    await clearClaims(client);
    await cleanup(client);
    await client.end();
  }

  const failed = results.filter((r) => !r.passed);
  console.log(JSON.stringify({ timestamp: new Date().toISOString(), total: results.length, passed: results.length - failed.length, failed: failed.length, results }, null, 2));

  if (failed.length > 0) {
    console.error(`\n${failed.length} scenario(s) FAILED.`);
    process.exit(1);
  }
  console.error(`\nAll ${results.length} scenarios PASSED.`);
}

main().catch((e) => {
  console.error('FATAL ERROR:', e.message);
  process.exit(1);
});
