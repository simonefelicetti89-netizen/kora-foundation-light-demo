/**
 * KORA-LINK-HARDENING-AUTOMATION-13D — staging fixture governance: read-only check.
 *
 * Verifies that the permanent minimum set of KL11 base fixtures (inherited from
 * KORA-LINK-RLS-LIVE-VALIDATION-11 and never dismantled — see
 * docs/KORA_LINK_STAGING_FIXTURE_GOVERNANCE.md) is present and coherent on the
 * staging project, and that no residual application rows remain in kora_link.*
 * outside of an active test run.
 *
 * This script is READ-ONLY. It never issues INSERT, UPDATE, or DELETE.
 *
 * SAFETY GATES (all mandatory, all enforced before any query runs):
 *   1. KORA_LINK_FIXTURE_CHECK_CONFIRM=YES must be set explicitly.
 *   2. KORA_LINK_STAGING_DB_URL and KORA_LINK_STAGING_PROJECT_REF must be set —
 *      never a hardcoded or default connection string.
 *   3. Session pooler (port 5432) only — never Transaction pooler (6543).
 *   4. The connection's project ref must match KORA_LINK_STAGING_PROJECT_REF
 *      (masked in all output) — refuses any other project, explicitly
 *      including anything that looks like production.
 *   5. A password that looks like a service-role JWT is rejected.
 *   6. Never logs a full UUID, email, token, or connection string — see mask().
 *
 * Usage (manual only):
 *   KORA_LINK_FIXTURE_CHECK_CONFIRM=YES \
 *   KORA_LINK_STAGING_DB_URL="postgresql://...:5432/postgres" \
 *   KORA_LINK_STAGING_PROJECT_REF="haqf...jl" \
 *   npx tsx scripts/kora-link/check-staging-fixtures.ts
 */

import { Client } from 'pg';

// ── Expected baseline (KORA_LINK_STAGING_FIXTURE_GOVERNANCE.md §3) ─────────────

const EXPECTED_AUTH_TOTAL = 7;
const EXPECTED_ROLE_COUNTS: Record<string, number> = {
  KORA_ADMIN: 1,
  COMPANY_ADMIN: 1,
  COMPANY_VIEWER: 1,
  PARTNER: 1,
  WORKER: 3,
};
const EXPECTED_TENANT_TOTAL = 2;
const EXPECTED_WORKER_IDENTITY_TOTAL = 3;
// KL11_COMPANY_ADMIN_A / KL11_COMPANY_VIEWER_A / KL11_PARTNER_P1 are dormant Auth
// fixtures: the app_metadata role claim alone grants no application access —
// kora_link.is_provisioned_company_role() / is_provisioned_partner() require a
// matching company_identity/partner_identity row, which these accounts never
// have permanently. Live test runners create such a mapping temporarily (a
// throwaway auth_user_id, not these accounts' own id) and always remove it in
// `finally` — see docs/KORA_LINK_STAGING_FIXTURE_GOVERNANCE.md §9. A non-zero
// count here at rest means either a leftover fixture from an interrupted run
// or an unexpected permanent mapping — both are incoherent.
const EXPECTED_COMPANY_IDENTITY_PERMANENT_TOTAL = 0;
const EXPECTED_PARTNER_IDENTITY_PERMANENT_TOTAL = 0;
const EXPECTED_RESIDUAL_KORA_LINK = 0;
const TEST_EMAIL_DOMAIN = 'kl11.test';

const KORA_LINK_TABLES = [
  'link_batches',
  'links',
  'link_assignments',
  'link_activation_acknowledgements',
  'link_events',
  'revocations',
  'link_replacements',
  'audit_log',
];

function mask(id: string | null | undefined): string {
  if (!id) return '(null)';
  const s = String(id);
  return s.length > 8 ? `${s.slice(0, 4)}****${s.slice(-2)}` : '****';
}

function maskEmail(email: string | null | undefined): string {
  if (!email) return '(null)';
  const at = email.indexOf('@');
  if (at < 0) return mask(email);
  return `${email.slice(0, 2)}***@${email.slice(at + 1)}`;
}

// ── Safety gates ──────────────────────────────────────────────────────────────

function enforceSafetyGatesOrExit() {
  if (process.env.KORA_LINK_FIXTURE_CHECK_CONFIRM !== 'YES') {
    console.error(
      'ABORT: KORA_LINK_FIXTURE_CHECK_CONFIRM must be set to exactly "YES" to run this check. ' +
        'This is a deliberate, explicit opt-in — see docs/KORA_LINK_STAGING_FIXTURE_GOVERNANCE.md.',
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

// ── Checks ───────────────────────────────────────────────────────────────────

async function checkAuthAccounts(client: Client) {
  const rows = (
    await client.query(
      `SELECT id, email, raw_app_meta_data->>'kora_role' AS role, banned_until
       FROM auth.users WHERE email ILIKE '%kl11%' ORDER BY email;`,
    )
  ).rows;

  const byRole: Record<string, number> = {};
  let nonTestDomain = 0;
  let anyBanned = false;
  for (const r of rows) {
    byRole[r.role ?? 'UNKNOWN'] = (byRole[r.role ?? 'UNKNOWN'] ?? 0) + 1;
    if (!String(r.email ?? '').toLowerCase().endsWith(`@${TEST_EMAIL_DOMAIN}`)) nonTestDomain += 1;
    if (r.banned_until !== null) anyBanned = true;
  }

  const roleCoherent = Object.entries(EXPECTED_ROLE_COUNTS).every(([role, count]) => byRole[role] === count);
  const totalCoherent = rows.length === EXPECTED_AUTH_TOTAL;

  return {
    expected: EXPECTED_AUTH_TOTAL,
    found: rows.length,
    by_role: byRole,
    all_test_domain: nonTestDomain === 0,
    any_banned: anyBanned,
    coherent: totalCoherent && roleCoherent && nonTestDomain === 0 && !anyBanned,
    details: rows.map((r) => ({ id_masked: mask(r.id), email_masked: maskEmail(r.email), role: r.role, banned: r.banned_until !== null })),
  };
}

async function checkTenants(client: Client) {
  const rows = (
    await client.query(`SELECT id, tenant_code, is_active FROM analytics.tenant WHERE tenant_code ILIKE 'kl11%' ORDER BY tenant_code;`)
  ).rows;
  const allActive = rows.every((r) => r.is_active === true);
  return {
    expected: EXPECTED_TENANT_TOTAL,
    found: rows.length,
    all_active: allActive,
    coherent: rows.length === EXPECTED_TENANT_TOTAL && allActive,
    details: rows.map((r) => ({ id_masked: mask(r.id), tenant_code: r.tenant_code, active: r.is_active })),
  };
}

async function checkWorkerIdentity(client: Client) {
  const rows = (
    await client.query(
      `SELECT w.worker_ref, w.status, t.tenant_code
       FROM personal.worker_identity w JOIN analytics.tenant t ON t.id = w.tenant_id
       WHERE t.tenant_code ILIKE 'kl11%' ORDER BY w.worker_ref;`,
    )
  ).rows;
  const allActive = rows.every((r) => r.status === 'active');
  return {
    expected: EXPECTED_WORKER_IDENTITY_TOTAL,
    found: rows.length,
    all_active: allActive,
    coherent: rows.length === EXPECTED_WORKER_IDENTITY_TOTAL && allActive,
    details: rows.map((r) => ({ worker_ref: r.worker_ref, status: r.status, tenant_code: r.tenant_code })),
  };
}

async function checkCompanyIdentity(client: Client) {
  const rows = (
    await client.query(
      `SELECT c.role, c.status, t.tenant_code
       FROM analytics.company_identity c JOIN analytics.tenant t ON t.id = c.tenant_id
       WHERE t.tenant_code ILIKE 'kl11%' ORDER BY c.role;`,
    )
  ).rows;
  return {
    expected: EXPECTED_COMPANY_IDENTITY_PERMANENT_TOTAL,
    found: rows.length,
    coherent: rows.length === EXPECTED_COMPANY_IDENTITY_PERMANENT_TOTAL,
    note: 'KL11_COMPANY_ADMIN_A/KL11_COMPANY_VIEWER_A are dormant Auth fixtures by design — 0 permanent mapping expected. See docs/KORA_LINK_STAGING_FIXTURE_GOVERNANCE.md §9.',
    details: rows.map((r) => ({ role: r.role, status: r.status, tenant_code: r.tenant_code })),
  };
}

async function checkPartnerIdentity(client: Client) {
  const rows = (await client.query(`SELECT email, status FROM network.partner_identity WHERE email ILIKE '%kl11%' ORDER BY email;`)).rows;
  return {
    expected: EXPECTED_PARTNER_IDENTITY_PERMANENT_TOTAL,
    found: rows.length,
    coherent: rows.length === EXPECTED_PARTNER_IDENTITY_PERMANENT_TOTAL,
    note: 'KL11_PARTNER_P1 is a dormant Auth fixture by design — 0 permanent mapping expected. See docs/KORA_LINK_STAGING_FIXTURE_GOVERNANCE.md §9.',
    details: rows.map((r) => ({ email_masked: maskEmail(r.email), status: r.status })),
  };
}

async function checkKoraLinkResidual(client: Client) {
  const byTable: Record<string, number> = {};
  let total = 0;
  for (const t of KORA_LINK_TABLES) {
    const c = (await client.query(`SELECT count(*)::int c FROM kora_link.${t};`)).rows[0].c;
    byTable[t] = c;
    total += c;
  }
  return {
    expected: EXPECTED_RESIDUAL_KORA_LINK,
    found: total,
    by_table: byTable,
    coherent: total === EXPECTED_RESIDUAL_KORA_LINK,
  };
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const { dbUrl, expectedRef } = enforceSafetyGatesOrExit();
  console.error(`Connecting read-only to staging project ${mask(expectedRef)} (session pooler, port 5432)...`);

  const client = new Client({ connectionString: dbUrl });
  await client.connect();

  let report: Record<string, unknown>;
  try {
    const [authAccounts, tenants, workerIdentity, companyIdentity, partnerIdentity, koraLinkResidual] = await Promise.all([
      checkAuthAccounts(client),
      checkTenants(client),
      checkWorkerIdentity(client),
      checkCompanyIdentity(client),
      checkPartnerIdentity(client),
      checkKoraLinkResidual(client),
    ]);

    const overallCoherent =
      authAccounts.coherent &&
      tenants.coherent &&
      workerIdentity.coherent &&
      companyIdentity.coherent &&
      partnerIdentity.coherent &&
      koraLinkResidual.coherent;

    report = {
      timestamp: new Date().toISOString(),
      project_ref_masked: mask(expectedRef),
      categories: {
        auth_accounts: authAccounts,
        tenants,
        worker_identity: workerIdentity,
        company_identity: companyIdentity,
        partner_identity: partnerIdentity,
        kora_link_residual: koraLinkResidual,
      },
      classification_test_only: authAccounts.all_test_domain,
      overall_coherent: overallCoherent,
    };
  } finally {
    await client.end();
  }

  console.log(JSON.stringify(report, null, 2));

  if (!report.overall_coherent) {
    console.error('\nFIXTURE CHECK FAILED — see categories above for the specific mismatch.');
    process.exit(1);
  }
  console.error('\nFixture check PASSED — permanent minimum set is present and coherent.');
}

main().catch((e) => {
  console.error('FATAL ERROR:', e.message);
  process.exit(1);
});
