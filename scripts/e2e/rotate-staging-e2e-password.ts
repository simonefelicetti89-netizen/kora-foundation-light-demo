/**
 * R0-C — TEST-ONLY password rotation for EXISTING staging E2E accounts.
 *
 * WHY THIS EXISTS: R0-C phase 1 proved the Vercel bypass works and that KORA's
 * own /login form is reached, but KORA_ADMIN and COMPANY_A were rejected with
 * "Credenziali non valide o account non ancora attivato" — the stored staging
 * passwords are not the ones under test. The Supabase dashboard does not offer
 * a direct password edit for an existing user, and the one approved rotation
 * path in this repo cannot be used here:
 *
 *   scripts/e2e/provision-staging-e2e-fixtures.ts DOES call
 *   `updateUserById(id, { password, email_confirm, app_metadata })` — but it
 *   passes `app_metadata` on every update, its AppMetadata type admits only
 *   `kora_role: 'PARTNER' | 'ADVISOR'`, and it addresses only
 *   E2E_PARTNER_EMAIL / E2E_ADVISOR_EMAIL. Pointing it at these two accounts
 *   would OVERWRITE their kora_role and kora_tenant_id claims. That is a
 *   regression, not a rotation.
 *
 * WHAT MAKES THIS SAFE: `auth.admin.updateUserById` accepts a PARTIAL update.
 * Passing `{ password }` and nothing else leaves the user id, email, role,
 * tenant and every metadata field untouched. The omission IS the safety
 * property, so it is asserted rather than assumed: this script snapshots the
 * non-secret identity state before the update, re-reads it after, and reports
 * booleans. If anything but the password moved, it says so and exits 1.
 *
 * SCOPE — deliberately the narrowest thing that unblocks R0-C:
 *   - a hardcoded allowlist of staging.kora.internal accounts, of which each
 *     run rotates only the subset it names explicitly (gate 5a);
 *   - the authorised staging Supabase project only;
 *   - Auth Admin API only — never raw SQL on auth.users;
 *   - no account is created, deleted, confirmed, offboarded or re-roled;
 *   - no fixture, no schema change, no Product surface.
 *
 * SAFETY GATES (identical in force to provision-staging-e2e-fixtures.ts, which
 * this deliberately mirrors rather than reinvents):
 *   1. E2E_STAGING_FIXTURE_CONFIRM must be exactly 'YES';
 *   2. SUPABASE_URL must parse, must not be loopback, and its host must equal
 *      `${E2E_STAGING_PROJECT_REF}.supabase.co` — the operator must positively
 *      identify the target;
 *   3. the ref must equal the hardcoded ALLOWED_STAGING_REF and must not be the
 *      hardcoded DENIED_PRODUCTION_REF;
 *   4. passwords come from the selected targets' own dedicated variables only
 *      (E2E_ROTATE_KORA_ADMIN_PASSWORD, E2E_ROTATE_COMPANY_A_PASSWORD,
 *      E2E_ROTATE_WORKER_PASSWORD, E2E_ROTATE_ADVISOR_PASSWORD,
 *      E2E_ROTATE_PARTNER_PASSWORD) — no default, no generator, no fallback,
 *      no hardcoded secret;
 *   5. every target email must be in the hardcoded allowlist below;
 *   5a. E2E_ROTATE_TARGETS must explicitly name which allowlisted targets to
 *      rotate. Mandatory, no default, no "rotate all": an unset or empty
 *      selection aborts, and an unknown key aborts rather than being ignored;
 *   6. a missing user, or more than one user matching an allowlisted email,
 *      aborts before any mutation.
 *
 * SECRET HANDLING: no password, key or token is ever printed, returned,
 * written to disk or included in an error message. Emails are masked. The
 * post-update report is booleans only — metadata CONTENT is never printed.
 *
 * OPERATIONAL NOTE: rotating a password invalidates that account's existing
 * Supabase sessions on staging.
 *
 * Usage (staging only):
 *   SUPABASE_URL=https://<ref>.supabase.co \
 *   SUPABASE_SERVICE_ROLE_KEY=<staging service_role key> \
 *   E2E_STAGING_PROJECT_REF=<ref> \
 *   E2E_STAGING_FIXTURE_CONFIRM=YES \
 *   E2E_ROTATE_TARGETS=WORKER,ADVISOR,PARTNER \
 *   E2E_ROTATE_WORKER_PASSWORD=... \
 *   E2E_ROTATE_ADVISOR_PASSWORD=... \
 *   E2E_ROTATE_PARTNER_PASSWORD=... \
 *   npx tsx scripts/e2e/rotate-staging-e2e-password.ts
 *
 * Only the accounts named in E2E_ROTATE_TARGETS are touched; the rest of the
 * allowlist is reported as "NOT selected (left untouched)" and never read.
 */

import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';

// ── Helpers ──────────────────────────────────────────────────────────────────

function readEnv(name: string): string | undefined {
  const v = process.env[name];
  return v && v.trim().length > 0 ? v : undefined;
}

/** Never reveals an identifier in full. */
function mask(id: string | null | undefined): string {
  if (!id) return '(none)';
  const s = String(id);
  return s.length > 8 ? `${s.slice(0, 4)}****${s.slice(-2)}` : '****';
}

function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  return `${(local ?? '').slice(0, 2)}***@${domain ?? '?'}`;
}

function fail(message: string): never {
  // Messages never interpolate a secret — only variable names and reasons.
  console.error(`[e2e-rotate] REFUSED: ${message}`);
  process.exit(1);
}

const LOOPBACK = ['127.0.0.1', 'localhost', '::1', '0.0.0.0'];

const ALLOWED_STAGING_REF = 'haqflkurpmeaxpikozjl';
const DENIED_PRODUCTION_REF = 'azdnepfmwrmacruykskm';

/**
 * THE ONLY accounts this script may ever touch. Hardcoded, not env-driven:
 * an operator cannot redirect it at a sixth account by setting a variable.
 *
 * Membership here is NOT permission to rotate. Every run must additionally
 * name its targets in E2E_ROTATE_TARGETS (see selectTargets): this list bounds
 * what MAY be selected, the selection decides what IS selected. That split is
 * what lets phase 3B rotate WORKER/ADVISOR/PARTNER while leaving the already
 * rotated KORA_ADMIN and COMPANY_A untouched.
 *
 * Each email/auth-id pairing below was verified read-only against the staging
 * project before being written here — none is guessed.
 */
const ROTATION_TARGETS = [
  { key: 'KORA_ADMIN', email: 'kora-admin@staging.kora.internal', passwordEnv: 'E2E_ROTATE_KORA_ADMIN_PASSWORD' },
  { key: 'COMPANY_A', email: 'company-admin@staging.kora.internal', passwordEnv: 'E2E_ROTATE_COMPANY_A_PASSWORD' },
  { key: 'WORKER', email: 'worker-a@staging.kora.internal', passwordEnv: 'E2E_ROTATE_WORKER_PASSWORD' },
  { key: 'ADVISOR', email: 'advisor-e2e@staging.kora.internal', passwordEnv: 'E2E_ROTATE_ADVISOR_PASSWORD' },
  { key: 'PARTNER', email: 'next-partner@staging.kora.internal', passwordEnv: 'E2E_ROTATE_PARTNER_PASSWORD' },
] as const;

type RotationTarget = (typeof ROTATION_TARGETS)[number];

const ALLOWED_EMAILS: ReadonlySet<string> = new Set(ROTATION_TARGETS.map((t) => t.email));

/**
 * Gate 5a — EXPLICIT TARGET SELECTION. Mandatory, fail-closed, no default.
 *
 * There is deliberately no "rotate all" fallback: an unset variable aborts
 * rather than rotating five accounts. An unknown key aborts rather than being
 * ignored, so a typo can never silently narrow the selection to nothing.
 */
function selectTargets(): RotationTarget[] {
  const raw = readEnv('E2E_ROTATE_TARGETS');
  if (!raw) {
    fail(
      'E2E_ROTATE_TARGETS is not set. Every run must name the accounts it intends ' +
        `to rotate, comma-separated, from: ${ROTATION_TARGETS.map((t) => t.key).join(', ')}. ` +
        'There is no default and no "rotate all" — an unnamed target is never rotated.',
    );
  }

  const requested = raw
    .split(',')
    .map((k) => k.trim().toUpperCase())
    .filter((k) => k.length > 0);
  if (requested.length === 0) {
    fail('E2E_ROTATE_TARGETS is empty after parsing. Refusing an empty selection.');
  }

  const known = new Map<string, RotationTarget>(ROTATION_TARGETS.map((t) => [t.key, t]));
  const unknown = requested.filter((k) => !known.has(k));
  if (unknown.length > 0) {
    fail(
      `unknown target key(s): ${unknown.join(', ')}. Only the hardcoded allowlist may be ` +
        `selected: ${ROTATION_TARGETS.map((t) => t.key).join(', ')}.`,
    );
  }

  // De-duplicate while preserving the operator's order.
  const seen = new Set<string>();
  const selected: RotationTarget[] = [];
  for (const k of requested) {
    if (seen.has(k)) continue;
    seen.add(k);
    selected.push(known.get(k)!);
  }
  return selected;
}

// ── Gates ────────────────────────────────────────────────────────────────────

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
      'SUPABASE_URL is a loopback host. This script rotates HOSTED staging ' +
        'credentials; local identities are created by scripts/e2e/seed-local-golden-path.ts.',
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

/**
 * Reads every required password up front, so a partial env mutates nothing.
 * Scoped to the SELECTED targets only: a password variable for an unselected
 * account is neither required nor read.
 */
function assertPasswordEnvComplete(selected: readonly RotationTarget[]): Map<string, string> {
  const passwords = new Map<string, string>();
  const missing: string[] = [];
  for (const target of selected) {
    const value = readEnv(target.passwordEnv);
    if (!value) missing.push(target.passwordEnv);
    else passwords.set(target.email, value);
  }
  if (missing.length > 0) {
    fail(
      `missing required environment variable(s): ${missing.join(', ')}. ` +
        'Nothing was rotated — a partially-configured run must not leave one account ' +
        'rotated and the other on its old credential.',
    );
  }
  return passwords;
}

// ── Identity snapshot: what must NOT change ──────────────────────────────────

/** Key-sorted JSON so field order can never be mistaken for a change. */
function canonical(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null';
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) =>
    a < b ? -1 : a > b ? 1 : 0,
  );
  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`).join(',')}}`;
}

interface IdentitySnapshot {
  id: string;
  email: string;
  appMetadata: string;
  userMetadata: string;
}

function snapshot(user: User): IdentitySnapshot {
  return {
    id: user.id,
    email: (user.email ?? '').toLowerCase(),
    appMetadata: canonical(user.app_metadata ?? {}),
    userMetadata: canonical(user.user_metadata ?? {}),
  };
}

// ── Auth users: Admin Auth API only, never raw SQL ───────────────────────────

/**
 * Resolves an allowlisted email to exactly one Auth user, paging through the
 * full list. Two users sharing an email would make "which one did we rotate?"
 * unanswerable, so ambiguity aborts rather than picking the first match.
 */
async function resolveExactlyOneUser(db: SupabaseClient, email: string): Promise<User> {
  const matches: User[] = [];
  const perPage = 200;
  for (let page = 1; page <= 50; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage });
    if (error) fail(`could not list auth users while resolving ${maskEmail(email)}.`);
    const users = data?.users ?? [];
    for (const u of users) {
      if (u.email?.toLowerCase() === email.toLowerCase()) matches.push(u);
    }
    if (users.length < perPage) break;
  }

  if (matches.length === 0) {
    fail(
      `no auth user exists for ${maskEmail(email)} on the authorised staging project. ` +
        'This script only rotates the password of an EXISTING account — it never creates one.',
    );
  }
  if (matches.length > 1) {
    fail(
      `${matches.length} auth users match ${maskEmail(email)}. Ambiguous target — ` +
        'refusing to rotate a credential when the account cannot be identified uniquely.',
    );
  }
  return matches[0]!;
}

async function reReadUser(db: SupabaseClient, id: string, email: string): Promise<User> {
  const { data, error } = await db.auth.admin.getUserById(id);
  if (error || !data?.user) {
    fail(`could not re-read the auth user for ${maskEmail(email)} after the update.`);
  }
  return data.user;
}

// ── Rotation ─────────────────────────────────────────────────────────────────

/** Returns true when the account is unchanged apart from its password. */
async function rotateOne(db: SupabaseClient, email: string, password: string): Promise<boolean> {
  // Gate 5, enforced again at the point of use: the allowlist is the only
  // authority on what this script may touch.
  if (!ALLOWED_EMAILS.has(email)) {
    fail(`${maskEmail(email)} is not in the hardcoded allowlist. Refused.`);
  }

  const before = snapshot(await resolveExactlyOneUser(db, email));

  // THE ENTIRE MUTATION. `password` and nothing else: no app_metadata, no
  // user_metadata, no email, no email_confirm, no role, no tenant. Adding any
  // field here would silently rewrite identity state.
  const { error } = await db.auth.admin.updateUserById(before.id, { password });
  if (error) fail(`could not update the password for ${maskEmail(email)}.`);

  const after = snapshot(await reReadUser(db, before.id, email));

  const userIdUnchanged = after.id === before.id;
  const emailUnchanged = after.email === before.email;
  const appMetadataUnchanged = after.appMetadata === before.appMetadata;
  const userMetadataUnchanged = after.userMetadata === before.userMetadata;

  // Booleans only — metadata CONTENT is never printed.
  console.log(
    `[e2e-rotate] ${maskEmail(email)} (auth ${mask(before.id)}): ` +
      `user_id_unchanged=${userIdUnchanged} ` +
      `email_unchanged=${emailUnchanged} ` +
      `app_metadata_unchanged=${appMetadataUnchanged} ` +
      `user_metadata_unchanged=${userMetadataUnchanged}`,
  );

  return userIdUnchanged && emailUnchanged && appMetadataUnchanged && userMetadataUnchanged;
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const { url, serviceKey } = assertIntendedStagingTarget();
  // Both fail closed BEFORE a client exists, so neither an unnamed selection
  // nor an incomplete env ever reaches staging.
  const selected = selectTargets();
  const passwords = assertPasswordEnvComplete(selected);
  const db = createClient(url, serviceKey, { auth: { persistSession: false } });

  const notSelected = ROTATION_TARGETS.filter((t) => !selected.includes(t)).map((t) => t.key);
  console.log(
    `[e2e-rotate] target ref ${mask(readEnv('E2E_STAGING_PROJECT_REF'))}, ` +
      `${ROTATION_TARGETS.length} allowlisted account(s). ` +
      `SELECTED: ${selected.map((t) => t.key).join(', ')}. ` +
      `NOT selected (left untouched): ${notSelected.length > 0 ? notSelected.join(', ') : '(none)'}. ` +
      'Password-only update.',
  );

  // Resolve EVERY selected account before mutating any, so a missing or
  // ambiguous later account cannot leave an earlier one already rotated.
  for (const target of selected) {
    await resolveExactlyOneUser(db, target.email);
  }

  let allIntact = true;
  for (const target of selected) {
    const password = passwords.get(target.email);
    if (!password) fail(`${target.passwordEnv} resolved empty at point of use.`);
    const intact = await rotateOne(db, target.email, password);
    if (!intact) allIntact = false;
  }

  if (!allIntact) {
    console.error(
      '[e2e-rotate] FAILED: at least one account changed beyond its password. ' +
        'Investigate before using these credentials.',
    );
    process.exit(1);
  }

  console.log(
    '[e2e-rotate] done. Password rotated for every allowlisted account; user id, email, ' +
      'app_metadata and user_metadata verified unchanged. Existing sessions for these ' +
      'accounts are now invalid. No password was printed, returned or written to disk.',
  );
}

/** True only under `tsx scripts/e2e/rotate-staging-e2e-password.ts`. */
function isDirectInvocation(): boolean {
  const entry = process.argv[1];
  if (!entry) return false;
  return /rotate-staging-e2e-password(\.[cm]?[jt]s)?$/.test(entry.replace(/\\/g, '/'));
}

if (isDirectInvocation()) {
  main().catch(() => {
    // Never surface a raw driver error: it can echo a connection string.
    console.error('[e2e-rotate] FAILED. See the refusal reason above, if any.');
    process.exit(1);
  });
}
