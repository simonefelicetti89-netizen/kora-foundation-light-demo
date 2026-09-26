# 207 — KORA-WP-088 Final E2E Blocker Remediation

All three Founder adjudications implemented. One local commit: **`559226ff58ebdafafe0d88b91a9ff53a76c6c591`**. Not pushed. No staging fixture executed — staging access variables are absent.

Only variable **names** appear below. No secret was read, printed, logged or committed.

---

## Decision 1 — ADVISOR home: product defect fixed

**`getRoleHome('ADVISOR')` now returns `/advisor`.** One line added to `lib/auth/role-home.ts`, plus a comment recording why the branch was missing.

The defect was a **sign-in loop**: with no ADVISOR branch, the function fell through to the catch-all `'/login'`, and every consumer — `app/login/page.tsx:84`, `app/auth/reset-password/_form.tsx:92`, `app/account/page.tsx:79` — sent an authenticated advisor back to the page they had just signed in on. The session was valid; only the destination was absent. The `/advisor` route tree has existed and been guarded by `requireAdvisorUser()` since KORA-WP-030, so this is a defect fix, **not** a new surface, and it does not touch the WP-073 five-environment IA decision.

`tests/unit/kora-wp-088-advisor-role-home.test.ts` — 9 guards:
- `getRoleHome('ADVISOR') === '/advisor'`, and never `'/login'`;
- the resolved home is the route `app/advisor/layout.tsx` actually guards, and that layout redirects to `?role_hint=advisor` — both halves of the round trip agree;
- **the CC-00 fail-closed rule is preserved and re-asserted**: `DEMO_VIEWER`, `COMPANY_VIEWER`, unknown roles, `undefined` and `''` all still resolve to `/login`; every mapping is exact-equality (`'advisor'` lowercase resolves to `/login`, not a privileged home);
- the four pre-existing mappings are unchanged;
- the harness no longer contains a workaround.

**Harness workaround removed.** `loginViaUI`'s `awaitRedirect` option and the `LoginOptions` interface are gone; `tests/e2e/helpers/auth.ts` is back to its original single-argument shape, so GOLDEN-02 specs are untouched. R05 uses the normal `loginViaUI(page, creds!)` like the other four, and `ADVISOR_HOME` in `tests/e2e/helpers/roles.ts` now reads `getRoleHome('ADVISOR')` instead of restating a literal — the tests can no longer drift from the app.

**R05 now proves the real product routing.** It cannot pass unless `getRoleHome('ADVISOR')` genuinely redirects an authenticated advisor to `/advisor` and `requireAdvisorUser()` admits them.

## Decision 2 — Partner fixture is ephemeral

`scripts/e2e/provision-staging-e2e-fixtures.ts` rebuilt with three explicit modes: **`provision` | `verify` | `cleanup`**. No default — the mode must be named, or the script refuses.

Lifecycle: verify an existing `network.partner_profile` → create temporary auth user + `partner_identity` → run the matrix → `cleanup` → `verify` proves the permanent total is 0.

**The permanent-total invariant is preserved.** Disclosed precisely: `check-staging-fixtures.ts:226` scopes its query to `email ILIKE '%kl11%'`, so a WP-088 fixture would not itself have tripped `EXPECTED_PARTNER_IDENTITY_PERMANENT_TOTAL = 0`. The invariant is honoured anyway — leaving test identities on staging is wrong regardless of which counter happens to notice.

**No partner_profile is ever created.** `E2E_PARTNER_PROFILE_ID` must name an existing row; the script checks it and refuses otherwise, mirroring the canonical route's own 404. Its refusal text is explicit: *"No suitable existing profile => STOP. Do not create one for WP-088."*

**Cleanup mechanism:** delete the `partner_identity` row (by `auth_user_id`, then by fixture email — belt and braces after a partial failure), then delete the Auth user via the Admin API. Identity mapping goes first so a failure never orphans a row behind a deleted user. Scoped to this fixture's own `auth_user_id`/email; `partner_profile`, other partners' mappings, tenants, assignments and qualifications are never touched. Idempotent: every step accepts "already gone". `verify` additionally asserts the referenced `partner_profile` is **still present** — cleanup removes the fixture, never the business data it attached to.

### A constraint that cannot be engineered away — Advisor

`advisor.advisor_identity` has **no DELETE grant for anyone**, not even `service_role` (`supabase/migrations/056_advisor_identity_qualification.sql:213-221`). It is deliberate, and the migration states why:

> *"No DELETE for anyone, on either table — qualification and identity history is never physically removed (doc 76 §4: 'no state transition erases a prior one')."*

So the advisor identity **row cannot be deleted**, and this script does not request a grant that would weaken a governance invariant to make a test tidier. Advisor cleanup therefore:

- **deletes the Supabase Auth user** (Auth Admin API — a different subsystem, unconstrained by the advisor schema grants), and
- **transitions the identity row to `inactive_offboarded`**, the domain's own terminal lifecycle state for "no longer an advisor".

`verify` reports this honestly rather than claiming a removal the domain forbids. A guard asserts the script never attempts `.delete()` on `advisor_identity`, and reads the migration's actual GRANT statements (SQL comments stripped) to confirm no DELETE grant exists.

## Decision 3 — Worker validates the real workspace

**R03 now targets `/worker/workspace`**, not `/worker/onboarding`.

This is self-proving rather than assumed: `app/worker/workspace/page.tsx:55-59` redirects any worker whose `personal.worker_profile_private.onboarding_completed_at` is NULL straight back to the wizard. **Reaching the workspace IS the proof that onboarding is genuinely complete** — an onboarding-incomplete account fails R03 loudly instead of silently validating the wizard, which is exactly the outcome the Founder required.

**Canonical completion mechanism — no database patching is possible or needed.** `onboarding_completed_at` is written by exactly one thing in the entire application: `POST /api/worker/onboarding` (`app/api/worker/onboarding/route.ts:127-158`), called by the worker finishing the 5-step wizard (`app/worker/onboarding/_flow.tsx:511-519`). There is **no admin path** — `/api/admin/*` only reads it for diagnostics — and **no metadata flag**: `app_metadata.onboarding_done` does not exist anywhere in the repo. `PATCH /api/worker/profile` sets `onboarding_done` but never `onboarding_completed_at`, so it does not pass the gate.

The route writes, RLS-scoped to the worker's own row with no service role: `onboarding_done=true`, `onboarding_status='completed'`, `onboarding_completed_at=now()`, `privacy_consent_version='B113-v1.0'`, `privacy_consent_accepted_at=now()`.

**What blocks the staging workers, exactly:** `personal.worker_profile_private.onboarding_completed_at` is NULL for all three — stated verbatim at `docs/archive/qa/KORA_LINK_STAGING_QA_ACCESS_RUNBOOK.md:98`. Root cause is the seed itself: `supabase/seed/gate2_phase1_minimal_staging_seed.sql:179-211` inserts the profile rows with `onboarding_done=false, onboarding_status='pending'` and no `onboarding_completed_at` column at all. Their `worker_identity` rows are already `status='active'`.

**A documented runbook already exists and has never been executed:** `docs/archive/qa/KORA_LINK_STAGING_QA_ACCESS_RUNBOOK.md:96-111`, §6 *"WORKER Onboarding Unlock Procedure (dry-run — non eseguito)"* — sign in as `worker-a@staging.kora.internal` at `/login?role_hint=worker`, complete the wizard (privacy consent is mandatory), the wizard calls the API, `onboarding_completed_at` is set, redirect to `/worker/workspace`. Admin-side verification: `GET /api/admin/workers/list?tenantCode=<code>`.

Prerequisite to check first: the worker's `app_metadata` must carry `kora_role`, `kora_tenant_id`, `kora_worker_id` and a non-disabled `kora_status`, or `requireWorkerUser()` returns 403 before any write.

**Onboarding remains covered** — by the gate itself, which R03 exercises on the way through.

## Vercel bypass — unchanged

Still the **host-scoped `page.route` handler**, not global `extraHTTPHeaders`. The secret is attached only when the request host equals the `E2E_BASE_URL` host; absent secret ⇒ no bypass installed at all. `guardE2ETarget()` / `E2E_ALLOWED_STAGING_HOSTS` still runs **first**, asserted by an ordering test. `playwright.config.ts` still contains no `extraHTTPHeaders`, also asserted.

## Validation

| Gate | Result |
|---|---|
| `tsc --noEmit` | **0 errors** |
| eslint — every file touched | **0 problems** |
| eslint `app/` + `components/` | 0 errors, 24 warnings (unchanged baseline) |
| New ADVISOR role-home tests | **9/9** |
| WP-088 design/E2E guards | **60/60** (was 57) |
| GOLDEN-02 env guard · CC-00 · b113b · b117 · b127 | **206/206** |
| WP-047 / WP-073 | **145/145**, unmodified |
| Full regression | **417 files, 13,331 passed, 325 skipped, 0 failed** |
| `playwright test --list` | **15** responsive cases — 5 roles × 3 viewports |

No skipped test is reported as runtime success. The remote matrix was **not** run.

### A third comment-vs-code guard bug, caught and fixed

My `advisor_identity` no-DELETE guard initially failed against the migration, because `[^;]*` spanned the justification comment — which legitimately contains both "GRANT" and "DELETE" — into the real GRANT line. SQL comments are now stripped before the assertion, and it additionally asserts the positive form (`GRANT SELECT, INSERT, UPDATE ... TO service_role`). This is the third instance of the same class in WP-088; the pattern is now consistent across all of them: strip comments, then assert structure.

## Staging fixture execution

**NOT EXECUTED.** `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `E2E_STAGING_PROJECT_REF`, `E2E_STAGING_FIXTURE_CONFIRM` are all MISSING (presence checked, values never read). The target cannot be mechanically proven, so per the standing rule: STOP. Nothing was provisioned; staging is untouched.

## Commit

**`559226ff58ebdafafe0d88b91a9ff53a76c6c591`** — *"fix(auth): map ADVISOR to /advisor; make E2E fixtures ephemeral; validate the real Worker workspace"*. 7 files, +494/−194. Not pushed.

Files: `lib/auth/role-home.ts` · `scripts/e2e/provision-staging-e2e-fixtures.ts` · `tests/e2e/helpers/auth.ts` · `tests/e2e/helpers/roles.ts` · `tests/e2e/responsive-viewports.spec.ts` · `tests/unit/kora-wp-088-advisor-role-home.test.ts` (new) · `tests/unit/kora-wp-088-responsive-design-system.test.ts`.

## Remaining blockers before the final matrix

1. **`VERCEL_AUTOMATION_BYPASS_SECRET`** — from the Vercel project's Deployment Protection settings.
2. **`E2E_BASE_URL`** = the Preview URL, **`E2E_ALLOWED_STAGING_HOSTS`** = the Preview host.
3. **Admin / Company / Worker credentials** — accounts exist; passwords must be supplied.
4. **A staging `network.partner_profile` must be identified.** Repo truth says none exists permanently: `docs/KORA_LINK_STAGING_FIXTURE_GOVERNANCE.md:117` records that `KL11_PARTNER_P1` is a dormant Auth fixture with *"nessuna riga partner_identity/partner_profile collegata in modo permanente"*, and the staging seed contains zero `partner_profile` inserts. **If none exists, Decision 2's own rule applies: STOP — do not invent one.** This is a Founder decision, not something to engineer around.
5. **Staging access variables** for the fixture script, and a run of `provision`.
6. **A staging Worker must complete onboarding** through the wizard (runbook §6 above). Until then R03 will correctly fail rather than silently pass.

## Confirmations

Production untouched · staging untouched (nothing provisioned) · no raw `auth.users` SQL · no Product feature added solely for E2E · the ADVISOR fix is a defect remediation, not an IA change · Living KORAL untouched · WP-118 not started · WP-119 not started · Package B not started · the sacred file was never read, opened, searched or referenced.
