/**
 * PILOT-TRUST-01 (F-08) — local-only seed for the golden-path E2E smoke.
 *
 * Creates real Supabase Auth users (KORA_ADMIN, COMPANY_ADMIN, WORKER) plus
 * their matching analytics.tenant / personal.worker_identity /
 * personal.worker_profile_private rows, against a LOCAL Supabase instance
 * ONLY. Writes the generated credentials to a gitignored local env file so
 * tests/e2e/*.spec.ts can pick them up — never prints a password to stdout.
 *
 * SAFETY GATES:
 *   1. E2E_LOCAL_SEED_CONFIRM must be exactly 'YES'.
 *   2. SUPABASE_URL must resolve to a loopback host (127.0.0.1/localhost/::1)
 *      — refuses any staging/production/hosted Supabase domain outright,
 *      same denylist as the KORA Link staging scripts.
 *   3. SUPABASE_SERVICE_ROLE_KEY must be the LOCAL service-role key (from
 *      `supabase status`), never a staging/production key — there is no way
 *      to verify a key's origin, so this relies on gate 2 (local URL only)
 *      as the actual safety boundary.
 *
 * Usage (local only):
 *   SUPABASE_URL=http://127.0.0.1:54321 \
 *   SUPABASE_SERVICE_ROLE_KEY=<local service_role key from `supabase status`> \
 *   E2E_LOCAL_SEED_CONFIRM=YES \
 *   npx tsx scripts/e2e/seed-local-golden-path.ts
 *
 * Output: writes .env.e2e-local-golden-path.local (gitignored) with
 * E2E_BASE_URL, E2E_KORA_ADMIN_EMAIL/PASSWORD, E2E_COMPANY_A_EMAIL/PASSWORD/
 * TENANT_CODE, E2E_WORKER_A_EMAIL/PASSWORD, E2E_GOLDEN_DATA_BEARING_ALLOW_RUN.
 */

import { createClient } from '@supabase/supabase-js';
import { Client } from 'pg';
import { randomBytes, randomUUID } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ALLOWED_LOCAL_HOSTS = ['127.0.0.1', 'localhost', '::1'];
const KNOWN_NON_LOCAL_REFS = ['azdnepfmwrmacruykskm', 'haqflkurpmeaxpikozjl'];

function mask(id: string | null | undefined): string {
  if (!id) return '(null)';
  const s = String(id);
  return s.length > 8 ? `${s.slice(0, 4)}****${s.slice(-2)}` : '****';
}

function assertLocalOnly(url: string): void {
  const lower = url.toLowerCase();
  for (const ref of KNOWN_NON_LOCAL_REFS) {
    if (lower.includes(ref)) throw new Error('SUPABASE_URL matches a known staging/production ref — refusing.');
  }
  if (lower.includes('supabase.co') || lower.includes('supabase.com')) {
    throw new Error('SUPABASE_URL points at a hosted Supabase domain — this script only ever targets local.');
  }
  let hostname: string;
  try {
    hostname = new URL(url).hostname.toLowerCase();
  } catch {
    throw new Error('SUPABASE_URL is not a valid URL.');
  }
  if (!ALLOWED_LOCAL_HOSTS.includes(hostname)) {
    throw new Error(`SUPABASE_URL host "${hostname}" is not local (${ALLOWED_LOCAL_HOSTS.join(', ')}) — refusing.`);
  }
}

function randomPassword(): string {
  return randomBytes(18).toString('base64url');
}

async function main() {
  if (process.env.E2E_LOCAL_SEED_CONFIRM !== 'YES') {
    console.error('ABORT: E2E_LOCAL_SEED_CONFIRM must be exactly "YES".');
    process.exit(1);
  }
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    console.error('ABORT: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are both required.');
    process.exit(1);
  }
  assertLocalOnly(supabaseUrl);

  const localPgUrl = process.env.LOCAL_PG_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
  assertLocalOnly(localPgUrl.replace('postgresql://postgres:postgres@', 'http://'));

  console.error(`Seeding local golden-path E2E fixtures against ${mask(supabaseUrl)} ...`);

  const admin = createClient(supabaseUrl, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const pg = new Client({ connectionString: localPgUrl });
  await pg.connect();

  try {
    const suffix = randomUUID().slice(0, 8);
    const tenantCode = `E2E-LOCAL-GOLDEN-${suffix}`;

    // Clean up any leftover fixtures from a prior interrupted run (own tag only).
    await pg.query(`DELETE FROM analytics.tenant WHERE tenant_code LIKE 'E2E-LOCAL-GOLDEN-%'`);

    const tenantResult = await pg.query<{ id: string }>(
      `INSERT INTO analytics.tenant (tenant_code, company_name, is_active) VALUES ($1, $2, true) RETURNING id`,
      [tenantCode, 'E2E Local Golden Path Synthetic Tenant'],
    );
    const tenantId = tenantResult.rows[0].id;

    const adminPassword = randomPassword();
    const adminEmail = `e2e-admin-${suffix}@e2e-local.test`;
    const { data: adminUser, error: adminErr } = await admin.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
      app_metadata: { kora_role: 'KORA_ADMIN' },
    });
    if (adminErr || !adminUser.user) throw new Error(`failed to create KORA_ADMIN user: ${adminErr?.message}`);

    const companyPassword = randomPassword();
    const companyEmail = `e2e-company-${suffix}@e2e-local.test`;
    const { data: companyUser, error: companyErr } = await admin.auth.admin.createUser({
      email: companyEmail,
      password: companyPassword,
      email_confirm: true,
      app_metadata: { kora_role: 'COMPANY_ADMIN', kora_tenant_id: tenantId },
    });
    if (companyErr || !companyUser.user) throw new Error(`failed to create COMPANY_ADMIN user: ${companyErr?.message}`);

    const workerPassword = randomPassword();
    const workerEmail = `e2e-worker-${suffix}@e2e-local.test`;
    const { data: workerUser, error: workerErr } = await admin.auth.admin.createUser({
      email: workerEmail,
      password: workerPassword,
      email_confirm: true,
    });
    if (workerErr || !workerUser.user) throw new Error(`failed to create WORKER user: ${workerErr?.message}`);

    const workerIdentityResult = await pg.query<{ id: string }>(
      `INSERT INTO personal.worker_identity (tenant_id, auth_user_id, worker_ref, status)
       VALUES ($1, $2, $3, 'active') RETURNING id`,
      [tenantId, workerUser.user.id, `E2E-LOCAL-GOLDEN-WORKER-${suffix}`],
    );
    const workerId = workerIdentityResult.rows[0].id;

    await pg.query(
      `INSERT INTO personal.worker_profile_private (worker_id, display_name, onboarding_done, onboarding_completed_at)
       VALUES ($1, $2, true, now())`,
      [workerId, 'Lavoratore Sintetico E2E'],
    );

    // WORKER's app_metadata needs kora_worker_id, only known after the
    // worker_identity row above is created — a second update call.
    const { error: workerMetaErr } = await admin.auth.admin.updateUserById(workerUser.user.id, {
      app_metadata: { kora_role: 'WORKER', kora_tenant_id: tenantId, kora_worker_id: workerId, kora_status: 'active' },
    });
    if (workerMetaErr) throw new Error(`failed to set WORKER app_metadata: ${workerMetaErr.message}`);

    const outPath = join(process.cwd(), '.env.e2e-local-golden-path.local');
    const envContent = [
      `E2E_BASE_URL=http://localhost:3000`,
      `E2E_KORA_ADMIN_EMAIL=${adminEmail}`,
      `E2E_KORA_ADMIN_PASSWORD=${adminPassword}`,
      `E2E_COMPANY_A_EMAIL=${companyEmail}`,
      `E2E_COMPANY_A_PASSWORD=${companyPassword}`,
      `E2E_COMPANY_A_TENANT_CODE=${tenantCode}`,
      `E2E_WORKER_A_EMAIL=${workerEmail}`,
      `E2E_WORKER_A_PASSWORD=${workerPassword}`,
      `E2E_GOLDEN_DATA_BEARING_ALLOW_RUN=true`,
      '',
    ].join('\n');
    writeFileSync(outPath, envContent, { mode: 0o600 });

    console.log(
      JSON.stringify(
        {
          tenant_code: tenantCode,
          tenant_id_masked: mask(tenantId),
          admin_user_id_masked: mask(adminUser.user.id),
          company_user_id_masked: mask(companyUser.user.id),
          worker_user_id_masked: mask(workerUser.user.id),
          env_file_written: '.env.e2e-local-golden-path.local',
        },
        null,
        2,
      ),
    );
    console.error('Seed complete. Credentials written to .env.e2e-local-golden-path.local (gitignored, never printed here).');
  } finally {
    await pg.end();
  }
}

main().catch((e) => {
  console.error('FATAL ERROR:', e.message);
  process.exit(1);
});
