/**
 * KORA-LINK-HARDENING-AUTOMATION-13D — staging fixture governance: guarded cleanup.
 *
 * A future, deliberately SAFE-BY-DEFAULT tool for a complete elimination of the
 * KL11 permanent minimum fixture set (see docs/KORA_LINK_STAGING_FIXTURE_GOVERNANCE.md
 * §15 for the criteria under which this should ever actually be run). This
 * script was NOT executed as part of KORA-LINK-HARDENING-AUTOMATION-13D — it
 * exists only as tooling for a future, explicitly authorized elimination.
 *
 * SCOPE: deletes only application-layer rows explicitly tied to the KL11
 * allowlist (analytics.tenant with tenant_code ILIKE 'kl11%', and everything
 * that hangs off those tenant ids: personal.worker_identity,
 * analytics.company_identity, and all kora_link.* rows). It deliberately does
 * NOT delete auth.users rows — removing Supabase Auth accounts touches GoTrue-
 * internal tables (identities, sessions, refresh_tokens, ...) that this script
 * does not model; that removal is a manual step via the Supabase Admin API or
 * dashboard, out of scope here, so this script never risks corrupting Auth
 * service state via raw SQL.
 *
 * SAFETY GATES (all mandatory, all enforced before any query — including the
 * plan query — runs):
 *   1. KORA_LINK_FIXTURE_CLEANUP_CONFIRM must equal exactly
 *      "DELETE_KL11_FIXTURES". Any other value (including unset) aborts.
 *   2. KORA_LINK_STAGING_DB_URL / KORA_LINK_STAGING_PROJECT_REF required, same
 *      project-ref / port / anti-prod / anti-service-role-password checks as
 *      check-staging-fixtures.ts and run-live-staging-suite.ts.
 *   3. A count-only PLAN is always computed and printed first — no DELETE
 *      statement exists before this point in the code path.
 *   4. A SECOND, runtime confirmation is required: this process must be
 *      attached to an interactive TTY, and the operator must type the exact
 *      string "DELETE_KL11_FIXTURES" again when prompted. If stdin is not a
 *      TTY (e.g. CI, a non-interactive shell), the script aborts — this two-
 *      step confirmation is intentionally impossible to fully automate.
 *   5. All DELETEs are scoped by an explicit KL11 allowlist WHERE clause —
 *      never an unscoped DELETE FROM.
 *   6. Deletion order is FK-safe: kora_link.* children first, then
 *      link_batches, then company_identity/worker_identity, then tenant.
 *   7. Never logs a full UUID, email, token, or connection string.
 *
 * Usage (manual only, never in CI):
 *   KORA_LINK_FIXTURE_CLEANUP_CONFIRM=DELETE_KL11_FIXTURES \
 *   KORA_LINK_STAGING_DB_URL="postgresql://...:5432/postgres" \
 *   KORA_LINK_STAGING_PROJECT_REF="haqf...jl" \
 *   npx tsx scripts/kora-link/cleanup-staging-fixtures.ts
 */

import { Client } from 'pg';
import { createInterface } from 'node:readline/promises';

const RUNTIME_CONFIRM_PHRASE = 'DELETE_KL11_FIXTURES';

const KORA_LINK_CHILD_TABLES_FK_ORDER = [
  'audit_log',
  'link_events',
  'revocations',
  'link_replacements',
  'link_activation_acknowledgements',
  'link_assignments',
  'links',
];

function mask(id: string | null | undefined): string {
  if (!id) return '(null)';
  const s = String(id);
  return s.length > 8 ? `${s.slice(0, 4)}****${s.slice(-2)}` : '****';
}

// ── Safety gates ──────────────────────────────────────────────────────────────

function enforceSafetyGatesOrExit() {
  if (process.env.KORA_LINK_FIXTURE_CLEANUP_CONFIRM !== RUNTIME_CONFIRM_PHRASE) {
    console.error(
      `ABORT: KORA_LINK_FIXTURE_CLEANUP_CONFIRM must be set to exactly "${RUNTIME_CONFIRM_PHRASE}" to run this script. ` +
        'This is a deliberate, explicit opt-in for a destructive operation — see docs/KORA_LINK_STAGING_FIXTURE_GOVERNANCE.md §15.',
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
    console.error('ABORT: port 6543 is the Supavisor Transaction pooler — forbidden. Use the Session pooler, port 5432.');
    process.exit(1);
  }

  const usernameRef = decodeURIComponent(url.username).split('.')[1];
  const hostRef = url.hostname.split('.')[0];
  const matches = usernameRef === expectedRef || hostRef === expectedRef;
  if (!matches) {
    console.error(
      `ABORT: connection does not match the expected staging project ref (${mask(expectedRef)}). ` +
        `Refusing to run against an unexpected project.`,
    );
    process.exit(1);
  }

  if (/prod/i.test(expectedRef) || /prod/i.test(dbUrl)) {
    console.error('ABORT: expected project ref or connection string contains "prod" — refusing unconditionally.');
    process.exit(1);
  }

  const passwordLooksLikeServiceRoleJwt = (url.password || '').startsWith('eyJ');
  if (passwordLooksLikeServiceRoleJwt) {
    console.error('ABORT: the database password looks like a JWT (service-role API key) — must never be used as the database password.');
    process.exit(1);
  }

  return { dbUrl, expectedRef };
}

async function requireInteractiveRuntimeConfirmation(): Promise<void> {
  if (!process.stdin.isTTY) {
    console.error(
      'ABORT: this process is not attached to an interactive TTY. The second runtime confirmation ' +
        'requires a human to type the confirmation phrase — it cannot be satisfied non-interactively ' +
        '(e.g. from CI or a piped/non-interactive shell). Refusing to proceed.',
    );
    process.exit(1);
  }

  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = await rl.question(
      `\nType exactly "${RUNTIME_CONFIRM_PHRASE}" to proceed with DELETING the KL11 fixture set shown above, anything else aborts: `,
    );
    if (answer.trim() !== RUNTIME_CONFIRM_PHRASE) {
      console.error('ABORT: runtime confirmation phrase did not match. No data was deleted.');
      process.exit(1);
    }
  } finally {
    rl.close();
  }
}

// ── Plan (count-only, read-only) ────────────────────────────────────────────

async function computePlan(client: Client) {
  const tenantIds = (
    await client.query(`SELECT id, tenant_code FROM analytics.tenant WHERE tenant_code ILIKE 'kl11%';`)
  ).rows;
  const tenantIdList = tenantIds.map((t) => t.id);

  const workerCount = tenantIdList.length
    ? (await client.query(`SELECT count(*)::int c FROM personal.worker_identity WHERE tenant_id = ANY($1::uuid[]);`, [tenantIdList])).rows[0].c
    : 0;
  const companyIdentityCount = tenantIdList.length
    ? (await client.query(`SELECT count(*)::int c FROM analytics.company_identity WHERE tenant_id = ANY($1::uuid[]);`, [tenantIdList])).rows[0].c
    : 0;
  const partnerIdentityCount = (await client.query(`SELECT count(*)::int c FROM network.partner_identity WHERE email ILIKE '%kl11%';`)).rows[0].c;

  const linkIds = tenantIdList.length
    ? (await client.query(`SELECT id FROM kora_link.links WHERE tenant_id = ANY($1::uuid[]);`, [tenantIdList])).rows.map((r) => r.id)
    : [];
  const batchIds = (await client.query(`SELECT id FROM kora_link.link_batches WHERE batch_code ILIKE 'kl11%';`)).rows.map((r) => r.id);

  const byTable: Record<string, number> = {};
  for (const t of KORA_LINK_CHILD_TABLES_FK_ORDER) {
    const col = t === 'link_replacements' ? 'old_link_id' : 'link_id';
    byTable[t] = linkIds.length
      ? (await client.query(`SELECT count(*)::int c FROM kora_link.${t} WHERE ${col} = ANY($1::uuid[]);`, [linkIds])).rows[0].c
      : 0;
  }

  return {
    tenants: tenantIds.map((t) => ({ tenant_code: t.tenant_code, id_masked: mask(t.id) })),
    worker_identity_count: workerCount,
    company_identity_count: companyIdentityCount,
    partner_identity_count: partnerIdentityCount,
    link_count: linkIds.length,
    batch_count: batchIds.length,
    kora_link_children: byTable,
    note: 'auth.users rows are intentionally OUT OF SCOPE for this script — see file header.',
    tenantIdList,
    linkIds,
    batchIds,
  };
}

// ── Execution (only reached after both confirmations) ───────────────────────

async function executeCleanup(client: Client, plan: Awaited<ReturnType<typeof computePlan>>) {
  const deleted: Record<string, number> = {};

  if (plan.linkIds.length > 0) {
    for (const t of KORA_LINK_CHILD_TABLES_FK_ORDER) {
      const col = t === 'link_replacements' ? 'old_link_id' : 'link_id';
      const extra = t === 'link_replacements' ? ` OR new_link_id = ANY($1::uuid[])` : '';
      const r = await client.query(`DELETE FROM kora_link.${t} WHERE ${col} = ANY($1::uuid[])${extra};`, [plan.linkIds]);
      deleted[t] = r.rowCount ?? 0;
    }
    const r = await client.query(`DELETE FROM kora_link.links WHERE id = ANY($1::uuid[]);`, [plan.linkIds]);
    deleted.links = r.rowCount ?? 0;
  }

  if (plan.batchIds.length > 0) {
    const r = await client.query(`DELETE FROM kora_link.link_batches WHERE id = ANY($1::uuid[]);`, [plan.batchIds]);
    deleted.link_batches = r.rowCount ?? 0;
  }

  if (plan.tenantIdList.length > 0) {
    const rCompany = await client.query(`DELETE FROM analytics.company_identity WHERE tenant_id = ANY($1::uuid[]);`, [plan.tenantIdList]);
    deleted.company_identity = rCompany.rowCount ?? 0;

    const rWorker = await client.query(`DELETE FROM personal.worker_identity WHERE tenant_id = ANY($1::uuid[]);`, [plan.tenantIdList]);
    deleted.worker_identity = rWorker.rowCount ?? 0;
  }

  const rPartner = await client.query(`DELETE FROM network.partner_identity WHERE email ILIKE '%kl11%';`);
  deleted.partner_identity = rPartner.rowCount ?? 0;

  if (plan.tenantIdList.length > 0) {
    const rTenant = await client.query(`DELETE FROM analytics.tenant WHERE id = ANY($1::uuid[]);`, [plan.tenantIdList]);
    deleted.tenant = rTenant.rowCount ?? 0;
  }

  return deleted;
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const { dbUrl, expectedRef } = enforceSafetyGatesOrExit();
  console.error(`Connecting to staging project ${mask(expectedRef)} (session pooler, port 5432)...`);

  const client = new Client({ connectionString: dbUrl });
  await client.connect();

  try {
    const plan = await computePlan(client);
    console.log(JSON.stringify({ timestamp: new Date().toISOString(), project_ref_masked: mask(expectedRef), phase: 'PLAN', plan }, null, 2));

    await requireInteractiveRuntimeConfirmation();

    const deleted = await executeCleanup(client, plan);
    console.log(JSON.stringify({ timestamp: new Date().toISOString(), project_ref_masked: mask(expectedRef), phase: 'EXECUTED', deleted }, null, 2));
    console.error('\nCleanup executed. auth.users rows were NOT touched (manual step, see file header).');
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error('FATAL ERROR:', e.message);
  process.exit(1);
});
