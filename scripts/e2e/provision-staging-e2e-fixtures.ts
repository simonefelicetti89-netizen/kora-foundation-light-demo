/**
 * KORA-WP-088 — TEST-ONLY, EPHEMERAL staging fixtures for the PARTNER and
 * ADVISOR E2E identities. Three explicit modes: provision | verify | cleanup.
 *
 * WHY THIS EXISTS AND WHY IT IS NOT A PRODUCT FEATURE
 * ---------------------------------------------------
 * The WP-088 validation needs a password-login account in all five role
 * environments. Three already exist in staging. The other two cannot be
 * created through a Product path:
 *
 *   PARTNER  — app/api/admin/partners/[id]/invite-user/route.ts is the
 *              canonical path and is CORRECT for its purpose, but it is
 *              `inviteUserByEmail` based: the user has NO password until an
 *              emailed link is clicked. Staging identities live on
 *              `staging.kora.internal`, which is NXDOMAIN
 *              (docs/archive/qa/KORA_ADMIN_STAGING_ACCESS_RESULT.md), so the
 *              invite can never be accepted and no password-login account can
 *              result.
 *   ADVISOR  — no provisioning path exists at any layer.
 *
 * Rather than add a Product feature merely to unblock a test (forbidden), this
 * reproduces the SAME domain invariants those paths encode, as test-only
 * tooling outside the Product surface.
 *
 * ADJUDICATED LIFECYCLE (Founder, KORA-WP-088)
 * --------------------------------------------
 *   network.partner_profile  — PERMANENT staging fixture. Exactly ONE
 *                              synthetic, staging-only, test-only profile.
 *                              It is NOT business data: it exists solely as
 *                              the anchor the Partner identity model requires
 *                              (partner_identity.partner_id is NOT NULL, FK'd
 *                              to partner_profile). Never created in, or
 *                              intended for, production.
 *   network.partner_identity — EPHEMERAL, removed by cleanup.
 *   Supabase Auth user       — EPHEMERAL, removed by cleanup.
 *
 * After cleanup, the permanent partner_identity total is 0 and only the
 * synthetic anchor profile remains.
 *
 * EPHEMERAL BY DECISION (Founder Decision 2)
 * ------------------------------------------
 * Staging must not accumulate test identities, and
 * scripts/kora-link/check-staging-fixtures.ts asserts
 * EXPECTED_PARTNER_IDENTITY_PERMANENT_TOTAL = 0. (That check's query is scoped
 * to `email ILIKE '%kl11%'`, so a WP-088 fixture would not itself trip that
 * counter — the invariant is honoured anyway, because leaving identities
 * behind on staging is wrong regardless of which counter notices.)
 * Lifecycle: provision -> run the matrix -> cleanup -> verify.
 *
 * ── A CONSTRAINT THAT CANNOT BE ENGINEERED AWAY ────────────────────────────
 * `advisor.advisor_identity` has NO DELETE GRANT FOR ANYONE — not even
 * service_role (supabase/migrations/056_advisor_identity_qualification.sql:213-221).
 * That is deliberate, and the migration says why:
 *
 *     "No DELETE for anyone, on either table — qualification and identity
 *      history is never physically removed (doc 76 §4: 'no state transition
 *      erases a prior one')."
 *
 * So the advisor identity ROW cannot be deleted, and this script does not
 * request a grant that would weaken that governance invariant. Advisor
 * cleanup is therefore:
 *     - the Supabase Auth user IS deleted (Auth Admin API — a different
 *       subsystem, unconstrained by the advisor schema grants); and
 *     - the identity row is transitioned to `inactive_offboarded`, the
 *       domain's own terminal lifecycle state for "no longer an advisor".
 * `verify` reports this honestly rather than claiming a removal the domain
 * forbids. `network.partner_identity` has `GRANT ALL TO service_role`
 * (migration 032:55), so the partner fixture IS fully removable.
 *
 * INVARIANTS MIRRORED — not invented
 * ----------------------------------
 *   PARTNER, from app/api/admin/partners/[id]/invite-user/route.ts:
 *     - app_metadata { kora_role: 'PARTNER', kora_partner_id, kora_status: 'active' }
 *     - NEVER kora_tenant_id — partners are not company-scoped
 *     - kora_partner_id is the network.partner_profile.id
 *       (lib/auth/kora-session.ts:235). Migration 012's column comment says
 *       otherwise and is wrong; the guard is the authority.
 *     - partner_identity.partner_id must reference a real partner_profile row.
 *       Repo truth is that staging has none permanently
 *       (docs/KORA_LINK_STAGING_FIXTURE_GOVERNANCE.md:117), so the Founder
 *       authorised exactly ONE synthetic staging-only fixture profile — see
 *       PARTNER_FIXTURE_PROFILE_ID below. No assignments, qualifications,
 *       commercial relationships, company links or governance rows are ever
 *       created, here or anywhere in this script.
 *   ADVISOR, from lib/auth/kora-session.ts#requireAdvisorUser and
 *   supabase/migrations/056_advisor_identity_qualification.sql:
 *     - app_metadata { kora_role: 'ADVISOR' } — the ONLY key that guard reads.
 *       kora_tenant_id / kora_status are not read for ADVISOR, and no
 *       kora_advisor_id key exists anywhere. Setting a tenant claim on an
 *       advisor would reintroduce the bug migration 058 documents.
 *     - advisor.advisor_identity has NO email column: id / auth_user_id UNIQUE /
 *       full_name NOT NULL / status / timestamps.
 *     - NO advisor_role_qualification, advisor_prerequisite_eligibility or
 *       advisor_assignment rows are created. Those are governed business data
 *       written by lib/advisor-identity / lib/advisor-assignment, which emit
 *       governance events a raw script would silently skip. /advisor and
 *       /advisor/companies both render without them.
 *
 * SAFETY GATES — all must pass, in order, in EVERY mode
 * ----------------------------------------------------
 *   1. E2E_STAGING_FIXTURE_CONFIRM must be exactly 'YES'.
 *   2. SUPABASE_URL must parse, must not be loopback (local is covered by
 *      scripts/e2e/seed-local-golden-path.ts), and its host must equal
 *      `${E2E_STAGING_PROJECT_REF}.supabase.co` — the operator must positively
 *      identify the target.
 *   3. The ref must equal the hardcoded ALLOWED_STAGING_REF and must not be the
 *      hardcoded DENIED_PRODUCTION_REF. Named refs, not substring heuristics:
 *      the kora-link scripts' /prod/i denylist does NOT match the real
 *      production ref, and this script does not inherit that gap.
 *   4. Passwords come from E2E_PARTNER_PASSWORD / E2E_ADVISOR_PASSWORD only —
 *      no default, no generator, no fallback.
 *
 * SECRET HANDLING
 *   - no password, key or token is ever printed, returned, written to disk or
 *     included in an error message; identifiers are masked; no file is written.
 *
 * IDEMPOTENCY / PARTIAL-FAILURE SAFETY
 *   Every step tolerates "already in the desired state". cleanup removes what
 *   exists and accepts what is already gone, so a cleanup after a half-finished
 *   provision is safe and repeatable. cleanup never aborts one role because the
 *   other failed.
 *
 * Usage (staging only):
 *   SUPABASE_URL=https://<ref>.supabase.co \
 *   SUPABASE_SERVICE_ROLE_KEY=<staging service_role key> \
 *   E2E_STAGING_PROJECT_REF=<ref> \
 *   E2E_STAGING_FIXTURE_CONFIRM=YES \
 *   E2E_PARTNER_EMAIL=... E2E_PARTNER_PASSWORD=... \
 *   # E2E_PARTNER_PROFILE_ID is OPTIONAL — an override to attach to a real
 *   # profile if one ever exists. Omit it and the synthetic fixture profile is
 *   # located or created automatically. \
 *   E2E_ADVISOR_EMAIL=... E2E_ADVISOR_PASSWORD=... \
 *   npx tsx scripts/e2e/provision-staging-e2e-fixtures.ts <provision|verify|cleanup>
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

function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  return `${(local ?? '').slice(0, 2)}***@${domain ?? '?'}`;
}

function fail(message: string): never {
  // Messages never interpolate a secret — only variable names and reasons.
  console.error(`[e2e-fixtures] REFUSED: ${message}`);
  process.exit(1);
}

const LOOPBACK = ['127.0.0.1', 'localhost', '::1', '0.0.0.0'];

/**
 * Explicit refs, mirroring scripts/e2e/seed-local-golden-path.ts:37's
 * named-ref approach rather than a substring heuristic.
 * Sources: CLAUDE.md (staging) and docs/ENVIRONMENT_SAFETY_CHECK.md (both).
 */
const ALLOWED_STAGING_REF = 'haqflkurpmeaxpikozjl';
const DENIED_PRODUCTION_REF = 'azdnepfmwrmacruykskm';

/**
 * THE ONE synthetic staging-only partner_profile (Founder adjudication,
 * KORA-WP-088). PERMANENT in staging, never in production, never business data.
 *
 * Identification is layered, strongest first, so the fixture can always tell
 * its own profile from any real Partner profile that may exist later:
 *
 *   1. A DETERMINISTIC PRIMARY KEY. The fixture locates itself by `id`, which
 *      cannot collide with a generated one and needs no text matching. This
 *      follows the staging seed's own convention
 *      (supabase/seed/gate2_phase1_minimal_staging_seed.sql uses
 *      'aaaaaaaa-0001-…' / 'bbbbbbbb-000a-…'); 'eeeeeeee' reads as E2E.
 *   2. `category` — a CANONICAL SCHEMA FIELD carrying a machine token, not a
 *      human-readable display name. partner_profile.category is free-text and
 *      unconstrained, so it is available as a classifier without a migration.
 *   3. `name` — the KL11-style FIXTURE_PREFIX convention, a secondary
 *      human-readable signal only.
 *   4. `status: 'draft'` — a real safety property, not just a label. The only
 *      worker-facing RLS policy on this table
 *      (010_partner_profile.sql: network_partner_worker_published_select)
 *      exposes `status = 'published'` rows only, so this fixture is invisible
 *      to every WORKER session by construction.
 */
const PARTNER_FIXTURE_PROFILE_ID = 'eeeeeeee-0088-0088-0088-000000000001';
const PARTNER_FIXTURE_CATEGORY = 'kora-e2e-fixture';
const PARTNER_FIXTURE_NAME = 'KORA_E2E_FIXTURE_PARTNER';
const PARTNER_FIXTURE_DESCRIPTION =
  'Synthetic KORA-WP-088 E2E fixture. Staging only, never production. Not a real ' +
  'partner and not business data: it exists solely as the anchor the Partner ' +
  'identity model requires (partner_identity.partner_id is NOT NULL). Kept in ' +
  'draft so it is invisible to every worker-facing surface.';
const PARTNER_FIXTURE_PILLAR = 'GROWTH';

const ADVISOR_FIXTURE_NAME = 'KORA E2E Advisor Fixture';
const ADVISOR_OFFBOARDED = 'inactive_offboarded';

type Mode = 'provision' | 'verify' | 'cleanup';

// ── Gates ────────────────────────────────────────────────────────────────────

function readMode(): Mode {
  const arg = process.argv[2];
  if (arg === 'provision' || arg === 'verify' || arg === 'cleanup') return arg;
  fail('mode must be exactly one of: provision | verify | cleanup');
}

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

  if (host !== `${expectedRef}.supabase.co`) {
    fail(
      'SUPABASE_URL host does not match E2E_STAGING_PROJECT_REF. ' +
        'Refusing a target that cannot be mechanically proven to be the intended project.',
    );
  }

  if (expectedRef === DENIED_PRODUCTION_REF || url.includes(DENIED_PRODUCTION_REF)) {
    fail('target is the PRODUCTION Supabase project. Refused unconditionally.');
  }

  if (expectedRef !== ALLOWED_STAGING_REF) {
    fail(
      'target is not the authorised staging project. Gate 2 (CLOSED WITH ' +
        'CONDITIONS) authorises the staging project only; Gate 3 and Gate 5 remain OPEN.',
    );
  }

  return { url, serviceKey };
}

// ── Auth users: Admin Auth API only, never raw SQL ───────────────────────────

async function findAuthUserIdByEmail(db: SupabaseClient, email: string): Promise<string | null> {
  const { data, error } = await db.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) fail(`could not list auth users while resolving ${maskEmail(email)}.`);
  const found = data?.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  return found?.id ?? null;
}

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
  const { data: created, error: createErr } = await db.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: appMetadata,
  });
  if (!createErr && created?.user?.id) return created.user.id;

  // Already exists → reconcile in place (idempotent path).
  const existingId = await findAuthUserIdByEmail(db, email);
  if (!existingId) fail(`could not create or locate the auth user for ${maskEmail(email)}.`);

  const { error: updateErr } = await db.auth.admin.updateUserById(existingId, {
    password,
    email_confirm: true,
    app_metadata: appMetadata,
  });
  if (updateErr) fail(`could not update the existing auth user for ${maskEmail(email)}.`);
  return existingId;
}

/** Safe when the user is already gone. */
async function deleteAuthUserIfPresent(db: SupabaseClient, email: string): Promise<boolean> {
  const id = await findAuthUserIdByEmail(db, email);
  if (!id) return false;
  const { error } = await db.auth.admin.deleteUser(id);
  if (error) fail(`could not delete the auth user for ${maskEmail(email)}.`);
  return true;
}

// ── PARTNER ──────────────────────────────────────────────────────────────────

function partnerEnv(): { email: string; password?: string; profileId?: string } | null {
  const email = readEnv('E2E_PARTNER_EMAIL');
  if (!email) return null;
  return {
    email: email.trim().toLowerCase(),
    password: readEnv('E2E_PARTNER_PASSWORD'),
    profileId: readEnv('E2E_PARTNER_PROFILE_ID'),
  };
}

/**
 * Locate-or-create THE ONE synthetic staging partner_profile. Idempotent: a
 * second run finds it by primary key and creates nothing. Minimally populated —
 * only the columns the schema actually requires (name, pillar) plus the
 * identification fields above. No assignments, qualifications, commercial
 * relationships, company links or governance rows are created, here or anywhere.
 */
async function ensurePartnerFixtureProfile(db: SupabaseClient): Promise<string> {
  const { data: existing, error: readErr } = await db
    .schema('network')
    .from('partner_profile')
    .select('id, category, status')
    .eq('id', PARTNER_FIXTURE_PROFILE_ID)
    .maybeSingle();
  if (readErr) fail('could not read network.partner_profile while locating the fixture.');

  if (existing) {
    // Refuse to adopt a row at this id that is not recognisably our fixture.
    if (existing.category !== PARTNER_FIXTURE_CATEGORY) {
      fail(
        'a partner_profile exists at the fixture id but does not carry the fixture ' +
          'category marker. Refusing to treat an unrecognised profile as a test fixture.',
      );
    }
    console.log(`[e2e-fixtures] PARTNER profile: reusing existing fixture ${mask(existing.id)}.`);
    return existing.id;
  }

  const { data: created, error: insertErr } = await db
    .schema('network')
    .from('partner_profile')
    .insert({
      id: PARTNER_FIXTURE_PROFILE_ID,
      name: PARTNER_FIXTURE_NAME,
      description: PARTNER_FIXTURE_DESCRIPTION,
      category: PARTNER_FIXTURE_CATEGORY,
      pillar: PARTNER_FIXTURE_PILLAR,
      status: 'draft',
    })
    .select('id')
    .single();
  if (insertErr || !created) fail('could not create the synthetic staging partner_profile fixture.');

  console.log(
    `[e2e-fixtures] PARTNER profile: created THE ONE synthetic staging fixture ` +
      `${mask(created.id)} (draft, category="${PARTNER_FIXTURE_CATEGORY}"). It is PERMANENT ` +
      'in staging by design and is never removed by cleanup.',
  );
  return created.id;
}

async function partnerProvision(db: SupabaseClient): Promise<void> {
  const env = partnerEnv();
  if (!env) return console.log('[e2e-fixtures] PARTNER: E2E_PARTNER_EMAIL not set — skipped.');
  if (!env.password) fail('E2E_PARTNER_PASSWORD is not set.');

  // E2E_PARTNER_PROFILE_ID is an OPTIONAL override for attaching to a real
  // profile if one ever exists; by default the synthetic fixture is used and
  // created on first run. Either way the profile must exist before the
  // identity is written — partner_identity.partner_id is NOT NULL and FK'd.
  let profileId: string;
  if (env.profileId) {
    const { data: profile } = await db
      .schema('network')
      .from('partner_profile')
      .select('id')
      .eq('id', env.profileId)
      .maybeSingle();
    if (!profile) fail('network.partner_profile not found for the E2E_PARTNER_PROFILE_ID override.');
    profileId = env.profileId;
  } else {
    profileId = await ensurePartnerFixtureProfile(db);
  }

  // NOTE: no kora_tenant_id — partners are not company-scoped.
  const authUserId = await upsertAuthUser(db, env.email, env.password, {
    kora_role: 'PARTNER',
    kora_partner_id: profileId,
    kora_status: 'active',
  });

  const { error } = await db
    .schema('network')
    .from('partner_identity')
    .upsert(
      { partner_id: profileId, auth_user_id: authUserId, email: env.email, status: 'active' },
      { onConflict: 'auth_user_id' },
    );
  if (error) fail('could not upsert network.partner_identity.');

  console.log(
    `[e2e-fixtures] PARTNER provisioned — auth user + partner_identity are EPHEMERAL ` +
      `(auth ${mask(authUserId)}, profile ${mask(profileId)}). Run cleanup after the matrix; ` +
      'the profile itself is retained.',
  );
}

async function partnerCleanup(db: SupabaseClient): Promise<void> {
  const env = partnerEnv();
  if (!env) return console.log('[e2e-fixtures] PARTNER: E2E_PARTNER_EMAIL not set — skipped.');

  const authUserId = await findAuthUserIdByEmail(db, env.email);

  // Identity mapping first, so a failure here never orphans a row behind a
  // deleted auth user. Scoped to THIS fixture's auth_user_id/email only —
  // partner_profile and every other partner's mapping are never touched.
  if (authUserId) {
    const { error } = await db
      .schema('network')
      .from('partner_identity')
      .delete()
      .eq('auth_user_id', authUserId);
    if (error) fail('could not delete network.partner_identity by fixture auth_user_id.');
  }
  const { error: byEmailErr } = await db
    .schema('network')
    .from('partner_identity')
    .delete()
    .eq('email', env.email);
  if (byEmailErr) fail('could not delete network.partner_identity by fixture email.');

  const removed = await deleteAuthUserIfPresent(db, env.email);
  console.log(
    `[e2e-fixtures] PARTNER cleanup done — auth user ${removed ? 'removed' : 'already absent'}, ` +
      'identity mapping removed. The synthetic anchor partner_profile is RETAINED ' +
      'by design (permanent staging fixture) — cleanup never deletes it.',
  );
}

async function partnerVerify(db: SupabaseClient): Promise<boolean> {
  const env = partnerEnv();
  if (!env) {
    console.log('[e2e-fixtures] PARTNER: E2E_PARTNER_EMAIL not set — nothing to verify.');
    return true;
  }

  const authUserId = await findAuthUserIdByEmail(db, env.email);
  const { data: rows, error } = await db
    .schema('network')
    .from('partner_identity')
    .select('id')
    .eq('email', env.email);
  if (error) fail('could not read network.partner_identity for verification.');

  const identityCount = rows?.length ?? 0;
  console.log(
    `[e2e-fixtures] PARTNER verify — auth user: ${authUserId ? 'PRESENT' : 'absent'}; ` +
      `partner_identity rows for this fixture: ${identityCount} (expected 0).`,
  );

  // The anchor profile must SURVIVE cleanup — it is the permanent half of the
  // adjudicated lifecycle. Its absence is as much a failure as a leftover
  // identity would be.
  const anchorId = env.profileId ?? PARTNER_FIXTURE_PROFILE_ID;
  const { data: profile } = await db
    .schema('network')
    .from('partner_profile')
    .select('id, status, category')
    .eq('id', anchorId)
    .maybeSingle();
  console.log(
    '[e2e-fixtures] PARTNER verify — anchor partner_profile: ' +
      `${profile ? `present (status=${profile.status}, category=${profile.category})` : 'MISSING'}.`,
  );
  if (!profile) return false;
  if (!env.profileId && profile.status !== 'draft') {
    console.error(
      '[e2e-fixtures] PARTNER verify — the synthetic fixture profile must stay in draft ' +
        'so it is invisible to worker-facing surfaces.',
    );
    return false;
  }

  return authUserId === null && identityCount === 0;
}

// ── ADVISOR ──────────────────────────────────────────────────────────────────

function advisorEnv(): { email: string; password?: string } | null {
  const email = readEnv('E2E_ADVISOR_EMAIL');
  if (!email) return null;
  return { email: email.trim().toLowerCase(), password: readEnv('E2E_ADVISOR_PASSWORD') };
}

async function advisorProvision(db: SupabaseClient): Promise<void> {
  const env = advisorEnv();
  if (!env) return console.log('[e2e-fixtures] ADVISOR: E2E_ADVISOR_EMAIL not set — skipped.');
  if (!env.password) fail('E2E_ADVISOR_PASSWORD is not set.');

  const authUserId = await upsertAuthUser(db, env.email, env.password, { kora_role: 'ADVISOR' });

  const { error } = await db
    .schema('advisor')
    .from('advisor_identity')
    .upsert(
      { auth_user_id: authUserId, full_name: ADVISOR_FIXTURE_NAME, status: 'active' },
      { onConflict: 'auth_user_id' },
    );
  if (error) {
    fail(
      'could not upsert advisor.advisor_identity — verify the table shape against ' +
        'supabase/migrations/056_advisor_identity_qualification.sql before retrying.',
    );
  }

  console.log(`[e2e-fixtures] ADVISOR provisioned (EPHEMERAL) — auth ${mask(authUserId)}.`);
}

async function advisorCleanup(db: SupabaseClient): Promise<void> {
  const env = advisorEnv();
  if (!env) return console.log('[e2e-fixtures] ADVISOR: E2E_ADVISOR_EMAIL not set — skipped.');

  const authUserId = await findAuthUserIdByEmail(db, env.email);

  // The identity ROW cannot be deleted: advisor.advisor_identity has no DELETE
  // grant for anyone, deliberately (migration 056 — "identity history is never
  // physically removed"). Transition it to the domain's own terminal state
  // instead, which is what that lifecycle exists for. This script will not
  // request a grant that weakens a governance invariant.
  if (authUserId) {
    const { error } = await db
      .schema('advisor')
      .from('advisor_identity')
      .update({ status: ADVISOR_OFFBOARDED })
      .eq('auth_user_id', authUserId);
    if (error) fail('could not transition advisor.advisor_identity to inactive_offboarded.');
  }

  const removed = await deleteAuthUserIfPresent(db, env.email);
  console.log(
    `[e2e-fixtures] ADVISOR cleanup done — auth user ${removed ? 'removed' : 'already absent'}; ` +
      `advisor_identity transitioned to ${ADVISOR_OFFBOARDED} (row retained BY DESIGN: ` +
      'no DELETE grant exists on that table for anyone). No qualification, eligibility ' +
      'or assignment rows were created or removed.',
  );
}

async function advisorVerify(db: SupabaseClient): Promise<boolean> {
  const env = advisorEnv();
  if (!env) {
    console.log('[e2e-fixtures] ADVISOR: E2E_ADVISOR_EMAIL not set — nothing to verify.');
    return true;
  }

  const authUserId = await findAuthUserIdByEmail(db, env.email);
  console.log(
    `[e2e-fixtures] ADVISOR verify — auth user: ${authUserId ? 'PRESENT' : 'absent'} ` +
      '(absent is the post-cleanup expectation).',
  );
  if (authUserId) {
    const { data } = await db
      .schema('advisor')
      .from('advisor_identity')
      .select('status')
      .eq('auth_user_id', authUserId)
      .maybeSingle();
    console.log(`[e2e-fixtures] ADVISOR verify — identity status: ${data?.status ?? '(no row)'}.`);
  }
  return authUserId === null;
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const mode = readMode();
  const { url, serviceKey } = assertIntendedStagingTarget();
  const db = createClient(url, serviceKey, { auth: { persistSession: false } });

  console.log(`[e2e-fixtures] mode=${mode}, target ref ${mask(readEnv('E2E_STAGING_PROJECT_REF'))}.`);

  if (mode === 'provision') {
    await partnerProvision(db);
    await advisorProvision(db);
    console.log('[e2e-fixtures] EPHEMERAL fixtures created. Run `cleanup` after the matrix.');
  } else if (mode === 'cleanup') {
    await partnerCleanup(db);
    await advisorCleanup(db);
    console.log('[e2e-fixtures] cleanup complete. Run `verify` to prove staging is clean.');
  } else {
    const partnerClean = await partnerVerify(db);
    const advisorClean = await advisorVerify(db);
    if (!partnerClean || !advisorClean) {
      console.error('[e2e-fixtures] verify: staging is NOT clean — re-run cleanup.');
      process.exit(1);
    }
    console.log('[e2e-fixtures] verify: staging is clean. Permanent partner-identity total is 0.');
  }

  console.log('[e2e-fixtures] done. No password was printed, returned or written to disk.');
}

main().catch(() => {
  // Never surface a raw driver error: it can echo a connection string.
  console.error('[e2e-fixtures] FAILED. See the refusal reason above, if any.');
  process.exit(1);
});
