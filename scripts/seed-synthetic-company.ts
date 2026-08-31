/**
 * Synthetic Company Foundation — canonical reference DEMO tenant.
 *
 * Creates exactly ONE canonical synthetic company: a real analytics.tenant
 * row (tenant_kind='DEMO') plus one COMPANY_ADMIN auth identity, so future
 * B-TRUTH seed-group migrations have a real, safe target to read from —
 * NOT a runtime JSON fixture. This is dev/CI seed tooling, not product code:
 * nothing under app/, services/, or lib/ imports this file.
 *
 * This is NOT OP-001. OP-001 is the pre-existing, deeply legacy-hardcoded
 * synthetic pipeline tenant (10+ files reference `tenant_code === 'OP-001'`
 * directly — see migration 014's own header) and is left untouched here.
 * This script creates a SEPARATE, fresh tenant under the canonical
 * tenant_kind='DEMO' mechanism instead.
 *
 * ONE PRODUCT / NO DEMO RUNTIME (Patch 03): tenant_kind is operational-safety
 * metadata only. Nothing here creates demo-specific product logic — the
 * resulting tenant is read by the exact same canonical services, RLS
 * policies, and UI any LIVE tenant uses.
 *
 * SAFETY GATES (same model as scripts/e2e/seed-local-golden-path.ts):
 *   1. SYNTHETIC_COMPANY_SEED_CONFIRM must be exactly 'YES'.
 *   2. SUPABASE_URL must resolve to a loopback host (127.0.0.1/localhost/::1)
 *      — refuses any staging/production/hosted Supabase domain outright.
 *   3. SUPABASE_SERVICE_ROLE_KEY must be the LOCAL service-role key (from
 *      `supabase status`) — there is no way to verify a key's origin, so
 *      gate 2 (local URL only) is the real safety boundary.
 *   4. The admin identity is created via createUser({ email_confirm: true }),
 *      never inviteUserByEmail — no real email is ever sent by this script,
 *      matching the operational-safety guard now built into
 *      app/api/admin/companies/provision/route.ts for non-LIVE tenant_kind.
 *
 * Usage (local only):
 *   SUPABASE_URL=http://127.0.0.1:54321 \
 *   SUPABASE_SERVICE_ROLE_KEY=<local service_role key from `supabase status`> \
 *   SYNTHETIC_COMPANY_SEED_CONFIRM=YES \
 *   npx tsx scripts/seed-synthetic-company.ts
 *
 * Idempotent: re-running reuses the existing tenant (by tenant_code) and the
 * existing admin identity (by email) rather than erroring or duplicating.
 *
 * Output: writes .env.synthetic-company.local (gitignored) with the tenant
 * code/id and admin credentials. Never prints a password to stdout.
 */

import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';

const ALLOWED_LOCAL_HOSTS = ['127.0.0.1', 'localhost', '::1'];
const KNOWN_NON_LOCAL_REFS = ['azdnepfmwrmacruykskm', 'haqflkurpmeaxpikozjl'];

// Fixed, deterministic identity for "the" reference synthetic company —
// not a random per-run suffix (unlike the E2E golden-path fixtures, which
// are deliberately ephemeral). Re-running this script targets the same row.
const TENANT_CODE = 'KORA-FOUNDATION-DEMO';
const COMPANY_NAME = 'KORA Foundation Synthetic Company';
const ADMIN_EMAIL = 'admin@kora-foundation-demo.test';

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
  if (process.env.SYNTHETIC_COMPANY_SEED_CONFIRM !== 'YES') {
    console.error('ABORT: SYNTHETIC_COMPANY_SEED_CONFIRM must be exactly "YES".');
    process.exit(1);
  }
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    console.error('ABORT: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are both required.');
    process.exit(1);
  }
  assertLocalOnly(supabaseUrl);

  console.error(`Seeding the canonical synthetic company against ${mask(supabaseUrl)} ...`);

  const admin = createClient(supabaseUrl, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

  // ── 1. Tenant — idempotent on tenant_code, same pattern as
  //    app/api/admin/companies/provision/route.ts's own idempotency. ────────
  const { data: existingTenant, error: lookupErr } = await admin
    .schema('analytics').from('tenant')
    .select('id, tenant_kind')
    .eq('tenant_code', TENANT_CODE)
    .maybeSingle();

  if (lookupErr) throw new Error(`tenant lookup failed: ${lookupErr.message}`);

  let tenantId: string;
  if (existingTenant) {
    tenantId = (existingTenant as { id: string }).id;
    const kind = (existingTenant as { tenant_kind: string }).tenant_kind;
    if (kind !== 'DEMO') {
      throw new Error(
        `Tenant '${TENANT_CODE}' already exists with tenant_kind='${kind}', not 'DEMO' — refusing to touch it. ` +
        'This script only ever manages its own DEMO-kind tenant.',
      );
    }
    console.error(`Reusing existing tenant ${TENANT_CODE} (${mask(tenantId)}).`);
  } else {
    const { data: newTenant, error: insertErr } = await admin
      .schema('analytics').from('tenant')
      .insert({
        tenant_code:             TENANT_CODE,
        company_name:            COMPANY_NAME,
        is_active:               true,
        onboarding_status:       'active',
        data_readiness_status:   'intake_ready',
        decision_pack_status:    'not_ready',
        methodology_version_id:  'KORA Index v1.0',
        deleted_at:              null,
        tenant_kind:             'DEMO',
      })
      .select('id')
      .single();
    if (insertErr || !newTenant) throw new Error(`tenant creation failed: ${insertErr?.message ?? 'no data'}`);
    tenantId = (newTenant as { id: string }).id;
    console.error(`Created tenant ${TENANT_CODE} (${mask(tenantId)}), tenant_kind=DEMO.`);
  }

  // ── 2. Admin identity — idempotent on email. createUser only (never
  //    inviteUserByEmail): no real email is ever sent by this script. ──────
  let adminUserId: string;
  let adminPassword: string | null = null;

  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email:         ADMIN_EMAIL,
    email_confirm: true,
  });

  if (created?.user) {
    adminUserId = created.user.id;
    adminPassword = randomPassword();
    const { error: setPwErr } = await admin.auth.admin.updateUserById(adminUserId, { password: adminPassword });
    if (setPwErr) throw new Error(`failed to set admin password: ${setPwErr.message}`);
    console.error(`Created admin identity ${mask(ADMIN_EMAIL)} (${mask(adminUserId)}).`);
  } else {
    const isAlreadyRegistered =
      createErr?.status === 422 ||
      createErr?.message?.toLowerCase().includes('already') ||
      createErr?.message?.toLowerCase().includes('registered');
    if (!isAlreadyRegistered) throw new Error(`admin user creation failed: ${createErr?.message ?? 'unknown'}`);

    const { data: usersData, error: listErr } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (listErr) throw new Error(`failed to list users: ${listErr.message}`);
    const existing = usersData?.users?.find((u) => u.email === ADMIN_EMAIL);
    if (!existing) throw new Error('admin user reported already registered but not found via listUsers.');
    adminUserId = existing.id;
    console.error(`Reusing existing admin identity ${mask(ADMIN_EMAIL)} (${mask(adminUserId)}) — password unchanged, not rewritten.`);
  }

  // ── 3. app_metadata — same shape/canonical key as the real provisioning
  //    route (kora_tenant_id, per migration 006 / lib/auth/kora-session.ts). ─
  const { error: metaErr } = await admin.auth.admin.updateUserById(adminUserId, {
    app_metadata: {
      kora_role:      'COMPANY_ADMIN',
      kora_tenant_id: tenantId,
      kora_status:    'active',
    },
  });
  if (metaErr) throw new Error(`failed to set app_metadata: ${metaErr.message}`);

  // ── 4. Write credentials locally — never to stdout. ───────────────────────
  const outPath = join(process.cwd(), '.env.synthetic-company.local');
  const envLines = [
    `SYNTHETIC_COMPANY_TENANT_CODE=${TENANT_CODE}`,
    `SYNTHETIC_COMPANY_TENANT_ID=${tenantId}`,
    `SYNTHETIC_COMPANY_ADMIN_EMAIL=${ADMIN_EMAIL}`,
  ];
  if (adminPassword) envLines.push(`SYNTHETIC_COMPANY_ADMIN_PASSWORD=${adminPassword}`);
  envLines.push('');
  writeFileSync(outPath, envLines.join('\n'), { mode: 0o600 });

  console.log(
    JSON.stringify(
      {
        tenant_code:          TENANT_CODE,
        tenant_id_masked:     mask(tenantId),
        tenant_kind:          'DEMO',
        admin_email_masked:   mask(ADMIN_EMAIL),
        admin_user_id_masked: mask(adminUserId),
        admin_password_reset: adminPassword !== null,
        env_file_written:     '.env.synthetic-company.local',
      },
      null,
      2,
    ),
  );
  console.error('Seed complete. Credentials written to .env.synthetic-company.local (gitignored, never printed here).');
}

main().catch((e) => {
  console.error('FATAL ERROR:', e.message);
  process.exit(1);
});
