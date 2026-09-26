# 206 — KORA-WP-088 E2E Readiness · Vercel Protection · Partner/Advisor Staging Fixtures

Test-infrastructure readiness only. No product code, no Product feature, no migration, no 15-case run, no push. One local commit: `d1d3884b8c6470f9d9fe0ba028f6d76e855d7663`.

**Bypass support: READY. Fixture mechanisms: BUILT, NOT EXECUTED.** Remaining blockers are credentials and staging connection variables, neither of which exists in this environment.

Only variable **names** appear in this report. No secret was read, printed, logged, committed, or written anywhere.

---

## Part 1 — Vercel automation bypass

**READY.** The Preview is protected: a live `GET <preview>/login` returns `302 -> https://vercel.com/sso-api?...` with a `_vercel_sso_nonce` cookie. Without a bypass all 15 cases would **fail at login**, not skip.

`tests/e2e/helpers/vercel-bypass.ts` attaches the officially supported `x-vercel-protection-bypass` header (plus `x-vercel-set-bypass-cookie`) from `VERCEL_AUTOMATION_BYPASS_SECRET`.

**It is a `page.route` handler, not `use.extraHTTPHeaders`, and that choice is the security-relevant part.** Playwright applies `extraHTTPHeaders` to *every* request the browser context makes, including third-party ones — the print CV page pulls a stylesheet from `fonts.googleapis.com` — which would send the automation secret to hosts that have no business receiving it. The handler attaches the header only when the request host equals the host of `E2E_BASE_URL`; everything else continues untouched.

Contract, each point asserted by test:
- secret read from `process.env` only — no hardcode, no default, no fallback literal;
- never logged, returned or echoed; only *presence* is observable (`hasProtectionBypass()`);
- absent secret ⇒ the handler is not installed and **no bypass of any kind is attempted**;
- `playwright.config.ts` contains no `extraHTTPHeaders`;
- `guardE2ETarget()` / `E2E_ALLOWED_STAGING_HOSTS` is untouched and still runs **first** — a test asserts the ordering. The bypass only affects a run the allowlist has already approved;
- it gates Vercel *deployment access* only. KORA authentication, role resolution and RLS are exercised for real — every case still logs in through the real `/login` form.

**Files changed for the bypass:** `tests/e2e/helpers/vercel-bypass.ts` (new), `tests/e2e/responsive-viewports.spec.ts` (5 call sites, each after its guard), `playwright.config.ts` (unchanged for the bypass — deliberately).

## Part 2 — Partner

**Existing provisioning path: NOT_SUITABLE for an E2E password-login account.**

`app/api/admin/partners/[id]/invite-user/route.ts`, examined in full:

| Question | Answer |
|---|---|
| Creates an auth user or only invites an existing one? | **Creates** one, via `auth.admin.inviteUserByEmail` |
| How is `kora_role=PARTNER` assigned? | At invite time, in `options.data` → `app_metadata { kora_role: 'PARTNER', kora_partner_id, kora_status: 'active' }`. Never `kora_tenant_id` — partners are not company-scoped |
| Can it establish a password-login E2E account? | **No.** An invited user has no password; one is set only by clicking an emailed link. The staging identity domain `staging.kora.internal` is **NXDOMAIN** (`docs/archive/qa/KORA_ADMIN_STAGING_ACCESS_RESULT.md`), so the invite mail is undeliverable and can never be accepted |
| What Partner domain row must pre-exist? | `network.partner_profile` — the route 404s without it |
| Is invitation acceptance required? | **Yes**, and that is precisely the blocker |

**Correction to a misleading source:** migration `012_partner_identity.sql`'s column comment says `auth_user_id` "must match `app_metadata.kora_partner_id`". That is wrong. `lib/auth/kora-session.ts:235` is the authority: `kora_partner_id` is the **`partner_profile.id`**. The fixture follows the guard, not the SQL comment.

**Fixture mechanism:** `scripts/e2e/provision-staging-e2e-fixtures.ts` — `auth.admin.createUser` with `email_confirm: true` and a password from the environment, the identical `app_metadata` the route sets, and an idempotent upsert into `network.partner_identity`. It **refuses to invent** a `partner_profile`: `E2E_PARTNER_PROFILE_ID` must name an existing row, mirroring the route's own 404.

**Provisioned: NO** (see Part 8).

**Governance conflict surfaced rather than silently created:** `scripts/kora-link/check-staging-fixtures.ts` asserts `EXPECTED_PARTNER_IDENTITY_PERMANENT_TOTAL = 0`. A *permanent* `partner_identity` row on staging will make `npm run kora-link:check-staging-fixtures` exit 1. Resolve before leaving a partner fixture in place — remove it after the run, or update that expectation and the governance inventory first. The script warns about this at runtime. No advisor table has any equivalent expectation.

## Part 3 — Advisor

**Product provisioning path exists: NO** — as expected. Nothing in `app/api/**` or `scripts/**` assigns `kora_role: 'ADVISOR'`. `docs/ACCESS_PROVISIONING_DOCTRINE.md`'s supported-roles table has no ADVISOR row.

Auth/RLS truth mirrored exactly, from `lib/auth/kora-session.ts` and `supabase/migrations/056_advisor_identity_qualification.sql`:

- `requireAdvisorUser()` reads **one** key: `app_metadata.kora_role === 'ADVISOR'`. `kora_tenant_id` and `kora_status` are **not** read for ADVISOR, and no `kora_advisor_id` key exists anywhere in the repo. Setting a tenant claim on an advisor would reintroduce the exact bug migration 058 documents — so none is set.
- `advisor.advisor_identity` is defined in migration **056**, not 057, and has **no `email` column**: `id`, `auth_user_id` (UNIQUE), `full_name` NOT NULL, `status` (CHECK, default `candidate_onboarding`), timestamps. The fixture writes `full_name` + `status: 'active'` — `active` rather than the default, so the identity is usable. My first draft wrote an `email` column that does not exist; corrected before commit.
- `auth_user_id` is the single link every advisor RLS policy resolves against `auth.uid()`, so it is the only mapping a login fixture needs.
- **Deliberately not created:** `advisor_role_qualification`, `advisor_prerequisite_eligibility`, `advisor_assignment`. Those are business data governed by `lib/advisor-identity` / `lib/advisor-assignment`, which emit governance events a raw script would bypass. `/advisor` and `/advisor/companies` both render correctly without them — an advisor with no identity row gets a friendly "profilo non ancora attivato" page and the companies API returns `{ ok: true, companies: [] }`, never an error. With the identity row present, the profile renders. That is all the responsive validation needs.

**Provisioned: NO** (see Part 8). **No Product/admin feature was added to unblock WP-088.**

## Part 4 — Worker env naming

**Resolved by ordered precedence in the reader**, the smallest option: `getWorkerCredentials()` reads `E2E_WORKER_EMAIL ?? E2E_WORKER_A_EMAIL` (same for password). `E2E_WORKER_*` is canonical and **always wins**; `E2E_WORKER_A_*`, emitted by the pre-existing `scripts/e2e/seed-local-golden-path.ts`, is accepted only as a fallback so that seed output works unmodified.

This is one identity reachable under two spellings with a documented precedence — not dual semantics. Asserted by test, documented in `.env.local.example` and `docs/testing-e2e-auth.md`.

## Part 5 — Environment safety

Required variable **names** for the final run, now all documented in `.env.local.example` with empty values and asserted empty by test:

`E2E_BASE_URL` · `E2E_ALLOWED_STAGING_HOSTS` · `E2E_KORA_ADMIN_EMAIL` · `E2E_KORA_ADMIN_PASSWORD` · `E2E_COMPANY_A_EMAIL` · `E2E_COMPANY_A_PASSWORD` · `E2E_WORKER_EMAIL` · `E2E_WORKER_PASSWORD` · `E2E_PARTNER_EMAIL` · `E2E_PARTNER_PASSWORD` · `E2E_ADVISOR_EMAIL` · `E2E_ADVISOR_PASSWORD` · `VERCEL_AUTOMATION_BYPASS_SECRET` · optionally `E2E_COMPANY_A_TENANT_CODE` (`STAGE-001`)

Fixture-script-only: `SUPABASE_URL` · `SUPABASE_SERVICE_ROLE_KEY` · `E2E_STAGING_PROJECT_REF` · `E2E_STAGING_FIXTURE_CONFIRM` · `E2E_PARTNER_PROFILE_ID`

The staged diff was scanned for JWT-shaped strings, connection strings with embedded credentials, and quoted password assignments: **clean**.

## Part 6 — Local secret file

Documented in `docs/testing-e2e-auth.md`, not created. `.gitignore:37` is `.env*`, which already covers `.env.e2e.local` (verified with `git check-ignore -v`). **Playwright does not auto-load env files** — nothing in `playwright.config.ts`, `vitest.config.ts` or the npm scripts reads dotenv — so the documented pattern is shell sourcing in the same session as the run:

```bash
set -a
source .env.e2e.local
set +a
npx playwright test responsive-viewports
```

The real secret file was **not** created and nothing was executed with missing values.

## Part 7 — Validation

| Gate | Result |
|---|---|
| `tsc --noEmit` | **0 errors** |
| eslint, every file touched in this pass | **0 problems** |
| eslint `app/` + `components/` | 0 errors, 24 warnings — unchanged baseline |
| WP-088 unit guards | **57/57** (was 48; +9 for bypass, env naming, and the fixture script) |
| GOLDEN-02 E2E env/helper guard | **13/13** |
| WP-047 / WP-073 | **145/145**, unmodified |
| Full regression | **416 files, 13,319 passed, 325 skipped, 0 failed** |
| `playwright test --list` | **15** responsive cases — 5 per viewport project |

No skipped test is reported as runtime success anywhere. The remote authenticated matrix was **not** run.

### Two defects found before running — both in WP-088's own test infrastructure

**1. R05 (Advisor) could never have passed.** `lib/auth/role-home.ts` has no ADVISOR branch, so `getRoleHome('ADVISOR')` falls through to `'/login'` and `app/login/page.tsx` pushes an authenticated advisor straight back to `/login`. `loginViaUI` waits for a navigation away from `/login` that never comes — the case would have timed out after 15s and been reported as a *responsive* failure when it is really a routing gap. Fixed: `loginViaUI` gains an opt-in `{ awaitRedirect: false }` (default unchanged, so GOLDEN-02 specs are unaffected) and R05 navigates to `/advisor` explicitly — still through `requireAdvisorUser()`, so it proves real authenticated access. **This is a genuine product routing gap and is being reported, not silently worked around**; deciding whether `getRoleHome` should route ADVISOR is a product decision outside WP-088's remediation scope.

**2. Guards that read comments instead of code.** My first fixture guards flagged the script's own header — "never a raw INSERT into `auth.users`" — as a violation. The same class of bug as the WP-088 drawer guard earlier. Comments are now stripped first, and the assertions test structure (no `pg` import, no `.rpc(`, no `.schema('auth')`) rather than prose. Likewise the password guard now asserts the *value* is never interpolated or passed to a logger, while naming the variable in a message stays legitimate.

Also confirmed: `AppShell` lives in the **root** layout, so all five role trees — Advisor included — carry the sidebar/header chrome the spec asserts. The chrome assertions are valid for every role.

## Part 8 — Staging fixture execution

**NOT EXECUTED. Target identity cannot be proven — STOP, per this task's own rule.**

Presence check (names only, values never read): `SUPABASE_URL` MISSING · `SUPABASE_SERVICE_ROLE_KEY` MISSING · `E2E_STAGING_PROJECT_REF` MISSING · `E2E_STAGING_FIXTURE_CONFIRM` MISSING · `E2E_PARTNER_PASSWORD` MISSING · `E2E_ADVISOR_PASSWORD` MISSING.

Independently, the standing rule against sourcing staging database access out of repository `.env` files applies: even had `.env.local` carried a service-role key, it would not have been used.

Safety gates the script enforces when it does run, in order: `E2E_STAGING_FIXTURE_CONFIRM === 'YES'`; `SUPABASE_URL` must parse and must not be loopback; its host must equal `${E2E_STAGING_PROJECT_REF}.supabase.co`; the ref must not be the **hardcoded production ref** and must equal the **hardcoded staging ref**. Named refs rather than substring heuristics deliberately — the kora-link scripts' `/prod/i` denylist does **not** match the real production ref, and this script does not inherit that gap. Supabase Admin Auth API only; no raw SQL driver is imported, so it physically cannot write to `auth.users` directly.

Post-provisioning verification, when it runs, is limited to: auth user exists, expected `kora_role`, expected domain identity mapping, and sign-in if safe. Never the password.

## Part 9 — Commit

One clean local commit: **`d1d3884b8c6470f9d9fe0ba028f6d76e855d7663`** — *"test(e2e): enable protected preview responsive validation"*. 8 files, +712/−7. **Not pushed.** Staging fixture data is not a git artefact and none was created.

Files: `tests/e2e/helpers/vercel-bypass.ts` (new) · `scripts/e2e/provision-staging-e2e-fixtures.ts` (new) · `tests/e2e/helpers/env.ts` · `tests/e2e/helpers/auth.ts` · `tests/e2e/responsive-viewports.spec.ts` · `tests/unit/kora-wp-088-responsive-design-system.test.ts` · `.env.local.example` · `docs/testing-e2e-auth.md`.

## Remaining blockers before the 15-case run

1. **Credentials for all five roles.** Admin, Company and Worker accounts exist in staging; Partner and Advisor identities do not exist and must be provisioned by the script — which needs staging connection variables this environment does not have.
2. **`VERCEL_AUTOMATION_BYPASS_SECRET`**, from the Vercel project's Deployment Protection settings.
3. **`E2E_BASE_URL`** = the Preview URL and **`E2E_ALLOWED_STAGING_HOSTS`** = the Preview host.
4. **Decide the Partner governance interaction** (`EXPECTED_PARTNER_IDENTITY_PERMANENT_TOTAL = 0`) before leaving a permanent partner fixture on staging.
5. **Worker caveat, disclosed:** the three staging worker accounts are stuck with onboarding incomplete. This does **not** block R03 — `ROLE_HOME.WORKER` is `/worker/onboarding`, exactly where an un-onboarded worker lands — but the surface validated will be the onboarding screen, not the worker workspace.

## Confirmations

Production untouched · no Product feature added solely for E2E · Living KORAL untouched · WP-118 not started · WP-119 not started · Package B not started · staging untouched (nothing provisioned) · no secret printed, logged or committed · the sacred file was never read, opened, searched, or referenced.
