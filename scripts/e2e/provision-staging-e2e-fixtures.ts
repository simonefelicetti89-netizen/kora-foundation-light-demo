/**
 * KORA-WP-088 — TEST-ONLY staging fixture provisioning for PARTNER and ADVISOR
 * E2E identities.
 *
 * WHY THIS EXISTS AND WHY IT IS NOT A PRODUCT FEATURE
 * ---------------------------------------------------
 * The Founder-mandated WP-088 validation needs a password-login account in all
 * five role environments. Three already exist in staging. The other two do not,
 * and neither can be created through a Product path:
 *
 *   PARTNER  — app/api/admin/partners/[id]/invite-user/route.ts is the canonical
 *              provisioning path, and it is CORRECT for its purpose, but it is
 *              `inviteUserByEmail` based: it creates a user with NO password and
 *              requires the invitee to click an emailed link to set one. The
 *              staging identities live on `staging.kora.internal`, which is
 *              NXDOMAIN (docs/archive/qa/KORA_ADMIN_STAGING_ACCESS_RESULT.md),
 *              so that mail is undeliverable and the invite can never be
 *              accepted. A password-login E2E account therefore cannot be
 *              established through the existing flow.
 *   ADVISOR  — there is no provisioning path at all. Nothing in app/api/** or
 *              scripts/** assigns kora_role='ADVISOR'.
 *
 * Rather than add a Product/admin feature merely to unblock a test (explicitly
 * forbidden), this script reproduces the SAME domain invariants those paths
 * encode, as test-only tooling, outside the Product surface.
 *
 * INVARIANTS MIRRORED — not invented
 * ----------------------------------
 *   PARTNER, from app/api/admin/partners/[id]/invite-user/route.ts:
 *     - app_metadata { kora_role: 'PARTNER', kora_partner_id, kora_status: 'active' }
 *     - NEVER kora_tenant_id (partners are not company-scoped)
 *     - a network.partner_profile row must already exist — never invented here
 *     - a network.partner_identity row maps auth_user_id -> partner_id
 *       (migration 012_partner_identity.sql: auth_user_id UNIQUE, status in
 *        invited|active|disabled)
 *   ADVISOR, from lib/auth/kora-session.ts#requireAdvisorUser and
 *   supabase/migrations/056_advisor_identity_qualification.sql:
 *     - app_metadata { kora_role: 'ADVISOR' } — the ONLY key the guard reads.
 *       kora_tenant_id / kora_status are not read for ADVISOR, and no
 *       kora_advisor_id key exists anywhere in the repo. Setting a tenant claim
 *       on an advisor would be wrong (migration 058 documents exactly that bug).
 *     - an advisor.advisor_identity row linked by auth_user_id, the single
 *       link every advisor RLS policy resolves against auth.uid()
 *     - NO advisor_role_qualification / advisor_prerequisite_eligibility /
 *       advisor_assignment rows: those are business data, governed by
 *       lib/advisor-identity and lib/advisor-assignment (which emit governance
 *       events). /advisor and /advisor/companies render correctly without them.
 *
 * SAFETY GATES — all must pass, in this order
 * -------------------------------------------
 *   1. E2E_STAGING_FIXTURE_CONFIRM must be exactly 'YES'.
 *   2. SUPABASE_URL must resolve to the project ref named in
 *      E2E_STAGING_PROJECT_REF — the operator must positively identify the
 *      target; an unnamed or mismatched project is refused. A loopback URL is
 *      also refused: this script exists for hosted staging, and
 *      scripts/e2e/seed-local-golden-path.ts already covers local.
 *   3. The ref must equal the hardcoded ALLOWED_STAGING_REF and must not be the
 *      hardcoded DENIED_PRODUCTION_REF. Named refs, not substring heuristics:
 *      the kora-link scripts' /prod/i denylist does not match the real
 *      production ref, and this script does not inherit that gap.
 *   4. Passwords come from E2E_PARTNER_PASSWORD / E2E_ADVISOR_PASSWORD only.
 *      There is no default, no generator and no fallback.
 *
 * SECRET HANDLING
 *   - no password, key or token is ever printed, returned, written to disk, or
 *     included in an error message;
 *   - identifiers are masked before output;
 *   - the script writes NO files at all.
 *
 * Idempotent: re-running locates the existing auth user by email and updates
 * its metadata/password rather than failing, and upserts the identity row.
 *
 * KNOWN INTERACTION, deliberately surfaced rather than silently accepted:
 * scripts/kora-link/check-staging-fixtures.ts asserts
 * EXPECTED_PARTNER_IDENTITY_PERMANENT_TOTAL = 0. A PERMANENT partner_identity
 * row on staging therefore breaks that governance check. Resolve it before
 * leaving a partner fixture in place — either remove the fixture after the run
 * or update that expectation and the governance inventory first.
 *
 * Usage (staging only):
 *   SUPABASE_URL=https://<ref>.supabase.co \
 *   SUPABASE_SERVICE_ROLE_KEY=<staging service_role key> \
 *   E2E_STAGING_PROJECT_REF=<ref> \
 *   E2E_STAGING_FIXTURE_CONFIRM=YES \
 *   E2E_PARTNER_EMAIL=partner-e2e@staging.kora.internal \
 *   E2E_PARTNER_PASSWORD=... \
 *   E2E_ADVISOR_EMAIL=advisor-e2e@staging.kora.internal \
 *   E2E_ADVISOR_PASSWORD=... \
 *   E2E_PARTNER_PROFILE_ID=<uuid of an existing network.partner_profile> \
 *   npx tsx scripts/e2e/provision-staging-e2e-fixtures.ts
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// ── Helpers ──────────────────────────────────────────────────────────────────

function readEnv(name: string): string | undefined {
  const v = process.env[name];
  return v && v.trim().length > 0 ? v : undefined;
}

/** Never reveals an identifier in full. */
function mask(id: string | null | undefined): string {
  if (!id) return '(none)';
  return id.length <= 8 ? '********' : `${id.slice(0, 4)}…${id.slice(-4)}`;
}

function fail(message: string): never {
  // Messages never interpolate a secret — only variable names and reasons.
  console.error(`[e2e-fixtures] REFUSED: ${message}`);
  process.exit(1);
}

const LOOPBACK = ['127.0.0.1', 'localhost', '::1', '0.0.0.0'];

/**
 * Explicit refs, mirroring scripts/e2e/seed-local-golden-path.ts:37's
 * named-ref approach rather than a substring heuristic. The kora-link staging
 * scripts rely on a `/prod/i` substring denylist, which does NOT match the
 * real production ref — a gap this script deliberately does not inherit.
 * Sources: CLAUDE.md (staging) and docs/ENVIRONMENT_SAFETY_CHECK.md (both).
 */
const ALLOWED_STAGING_REF = 'haqflkurpmeaxpikozjl';
const DENIED_PRODUCTION_REF = 'azdnepfmwrmacruykskm';

// ── Gate 1-3: target proof ───────────────────────────────────────────────────

function assertIntendedStagingTarget(): { url: string; serviceKey: string } {
  if (readEnv('E2E_STAGING_FIXTURE_CONFIRM') !== 'YES') {
    fail('E2E_STAGING_FIXTURE_CONFIRM must be exactly "YES".');
  }

  const url = readEnv('SUPABASE_URL');
  const serviceKey = readEnv('SUPABASE_SERVICE_ROLE_KEY');
  const expectedRef = readEnv('E2E_STAGING_PROJECT_REF');

  if (!url) fail('SUPABASE_URL is not set.');
  if (!serviceKey) fail('SUPABASE_SERVICE_ROLE_KEY is not set.');
  if (!expectedRef) {
    fail(
      'E2E_STAGING_PROJECT_REF is not set. The intended staging project must be ' +
        'named explicitly — this script refuses any target it cannot positively identify.',
    );
  }

  let host: string;
  try {
    host = new URL(url).hostname;
  } catch {
    fail('SUPABASE_URL is not a parseable URL.');
  }

  if (LOOPBACK.includes(host)) {
    fail(
      'SUPABASE_URL is a loopback host. This script provisions HOSTED staging ' +
        'fixtures; use scripts/e2e/seed-local-golden-path.ts for local.',
    );
  }

  // Positive identification: the host must be exactly the named project's.
  const expectedHost = `${expectedRef}.supabase.co`;
  if (host !== expectedHost) {
    fail(
      'SUPABASE_URL host does not match E2E_STAGING_PROJECT_REF. ' +
        'Refusing a target that cannot be mechanically proven to be the intended project.',
    );
  }

  // Hard denylist: production, named explicitly. Checked against BOTH the
  // operator-supplied ref and the URL, so neither alone can slip it through.
  if (expectedRef === DENIED_PRODUCTION_REF || url.includes(DENIED_PRODUCTION_REF)) {
    fail('target is the PRODUCTION Supabase project. Refused unconditionally.');
  }

  // Hard allowlist: the one staging project Gate 2 authorises.
  if (expectedRef !== ALLOWED_STAGING_REF) {
    fail(
      'target is not the authorised staging project. Gate 2 (CLOSED WITH ' +
        'CONDITIONS) authorises the staging project only; Gate 3 and Gate 5 remain OPEN.',
    );
  }

  return { url, serviceKey };
}

// ── Auth user: create or locate, never raw SQL into auth.users ───────────────

interface AppMetadata {
  kora_role: 'PARTNER' | 'ADVISOR';
  kora_status?: string;
  kora_partner_id?: string;
}

async function upsertAuthUser(
  db: SupabaseClient,
  email: string,
  password: string,
  appMetadata: AppMetadata,
): Promise<string> {
  // Try create first — the Admin Auth API, never an INSERT into auth.users.
  const { data: created, error: createErr } = await db.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: appMetadata,
  });

  if (!createErr && created?.user?.id) return created.user.id;

  // Already exists → locate and update (idempotent path).
  const { data: list, error: listErr } = await db.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (listErr) fail(`could not list auth users to reconcile "${email}".`);

  const existing = list?.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  if (!existing) {
    // createUser failed for a reason other than "already exists".
    fail(`could not create or locate the auth user for "${email}".`);
  }

  const { error: updateErr } = await db.auth.admin.updateUserById(existing.id, {
    password,
    email_confirm: true,
    app_metadata: appMetadata,
  });
  if (updateErr) fail(`could not update the existing auth user for "${email}".`);

  return existing.id;
}

// ── PARTNER fixture ──────────────────────────────────────────────────────────

async function provisionPartner(db: SupabaseClient): Promise<void> {
  const email = readEnv('E2E_PARTNER_EMAIL');
  const password = readEnv('E2E_PARTNER_PASSWORD');
  const partnerProfileId = readEnv('E2E_PARTNER_PROFILE_ID');

  if (!email || !password) {
    console.log('[e2e-fixtures] PARTNER: E2E_PARTNER_EMAIL/PASSWORD not set — skipped.');
    return;
  }
  if (!partnerProfileId) {
    fail(
      'E2E_PARTNER_PROFILE_ID is not set. A partner user must attach to an EXISTING ' +
        'network.partner_profile — this script never invents partner business data.',
    );
  }

  // The canonical route 404s when the profile is absent; mirror that exactly.
  const { data: profile } = await db
    .schema('network')
    .from('partner_profile')
    .select('id')
    .eq('id', partnerProfileId)
    .maybeSingle();

  if (!profile) {
    fail('network.partner_profile not found for E2E_PARTNER_PROFILE_ID.');
  }

  // NOTE: no kora_tenant_id — partners are not company-scoped.
  // kora_partner_id is the network.partner_profile.id (lib/auth/kora-session.ts:235),
  // NOT the auth_user_id and NOT the partner_identity.id. Migration 012's column
  // comment says otherwise and is wrong; the guard is the authority.
  const authUserId = await upsertAuthUser(db, email.trim().toLowerCase(), password, {
    kora_role: 'PARTNER',
    kora_partner_id: partnerProfileId,
    kora_status: 'active',
  });

  const { error } = await db
    .schema('network')
    .from('partner_identity')
    .upsert(
      {
        partner_id: partnerProfileId,
        auth_user_id: authUserId,
        email: email.trim().toLowerCase(),
        status: 'active',
      },
      { onConflict: 'auth_user_id' },
    );
  if (error) fail('could not upsert network.partner_identity.');

  console.log(`[e2e-fixtures] PARTNER ready — auth_user_id ${mask(authUserId)}, profile ${mask(partnerProfileId)}.`);
  console.warn(
    '[e2e-fixtures] NOTE: scripts/kora-link/check-staging-fixtures.ts asserts ' +
      'EXPECTED_PARTNER_IDENTITY_PERMANENT_TOTAL = 0. A permanent partner_identity ' +
      'row on staging will make that check fail. Either remove this fixture after ' +
      'the run, or update that expectation and the governance inventory first.',
  );
}

// ── ADVISOR fixture ──────────────────────────────────────────────────────────

async function provisionAdvisor(db: SupabaseClient): Promise<void> {
  const email = readEnv('E2E_ADVISOR_EMAIL');
  const password = readEnv('E2E_ADVISOR_PASSWORD');

  if (!email || !password) {
    console.log('[e2e-fixtures] ADVISOR: E2E_ADVISOR_EMAIL/PASSWORD not set — skipped.');
    return;
  }

  // requireAdvisorUser() checks app_metadata.kora_role === 'ADVISOR' only.
  const authUserId = await upsertAuthUser(db, email.trim().toLowerCase(), password, {
    kora_role: 'ADVISOR',
  });

  // advisor.advisor_identity (supabase/migrations/056_advisor_identity_qualification.sql:106).
  // Columns are id / auth_user_id UNIQUE / full_name NOT NULL / status / timestamps —
  // there is NO email column; the address lives on the auth user only.
  // `auth_user_id` is the single link every advisor RLS policy resolves against
  // auth.uid(), so it is the only mapping a login fixture needs.
  //
  // status: 'active' (not the 'candidate_onboarding' default) so the identity is
  // usable. Deliberately NOT created: advisor_role_qualification,
  // advisor_prerequisite_eligibility, advisor_assignment. Those are business
  // data governed by lib/advisor-identity and lib/advisor-assignment (which emit
  // governance events); /advisor and /advisor/companies render correctly without
  // them, which is all the responsive validation needs.
  const { error } = await db
    .schema('advisor')
    .from('advisor_identity')
    .upsert(
      {
        auth_user_id: authUserId,
        full_name: 'KORA E2E Advisor Fixture',
        status: 'active',
      },
      { onConflict: 'auth_user_id' },
    );
  if (error) {
    fail(
      'could not upsert advisor.advisor_identity — verify the table shape against ' +
        'supabase/migrations/056_advisor_identity_qualification.sql before retrying. ' +
        'No raw INSERT into auth.users was or will be attempted.',
    );
  }

  console.log(`[e2e-fixtures] ADVISOR ready — auth_user_id ${mask(authUserId)}.`);
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const { url, serviceKey } = assertIntendedStagingTarget();
  const db = createClient(url, serviceKey, { auth: { persistSession: false } });

  await provisionPartner(db);
  await provisionAdvisor(db);

  console.log('[e2e-fixtures] done. No password was printed, returned or written to disk.');
}

main().catch(() => {
  // Never surface a raw driver error: it can echo a connection string.
  console.error('[e2e-fixtures] FAILED. See the refusal reason above, if any.');
  process.exit(1);
});
