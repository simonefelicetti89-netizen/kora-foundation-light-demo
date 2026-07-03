# RLS-03 — Throwaway Supabase Setup Checklist

One-page operational checklist for the dedicated Supabase project required by RLS-03
(synthetic two-tenant negative DB test). This is a checklist, not a runbook with
executed steps — nothing in this document has been carried out yet. See
`RLS-03A` (preflight audit) for the full reasoning behind each recommendation
below; this doc is the condensed, actionable version of that preflight.

Status: **not started**. No throwaway project exists. No migrations applied.
No users created. No fixtures inserted.

---

## A. Purpose

- RLS-03 is a **synthetic two-tenant negative DB test**: it authenticates as
  two different tenants and asserts that Postgres/Supabase RLS — not app
  code — rejects cross-tenant reads.
- It is **not** an app/browser E2E test. As of RLS-03C-Rewrite it connects
  directly to Postgres (`pg`), never the Next.js app, a browser, or even
  PostgREST/`@supabase/supabase-js`. App/route-level authenticated testing
  is RLS-04's job, not RLS-03's.
- It must use **synthetic data only**. No real company data, no real worker
  data, ever, at any step.

## B. Environment

- **Dedicated throwaway Supabase project only.** Recommended name:
  `kora-rls-test` (or an equivalently unambiguous name — must not resemble
  the production or staging project names).
- **Explicitly forbidden: Production Supabase** (`azdn****`, per
  `docs/ENVIRONMENT_SAFETY_CHECK.md`). Never a target for this test, under
  any circumstance.
- **Explicitly discouraged: shared staging Supabase** (`haqf****`). Staging
  already has a real `STAGE-001` tenant and real staging users that other
  in-flight work depends on — layering a synthetic negative-test tenant pair
  onto it risks contaminating that state. Only use staging if explicitly
  re-approved as a deliberate exception (see §J).
- **Superseded (RLS-03D/E, local Supabase now set up):** the "no local
  Supabase stack exists" note below described the state at RLS-03A preflight
  time. As of RLS-03D/E, Docker and the Supabase CLI are confirmed
  installed/running locally, `supabase init` has been run, and
  `supabase/config.toml` + `supabase/.gitignore` are committed
  (`8f681d1 chore: add local supabase config`). The original bullet is kept
  below for historical context only — do not treat it as current.
- ~~**No local Supabase stack exists today** (no `supabase/config.toml`, no
  docker-compose) — confirmed during the RLS-03A preflight. Local is not an
  option until that stack is separately set up.~~
- The throwaway project **may be deleted after the test**, or **kept as a
  dedicated, standing RLS regression project** for future re-runs (RLS-03
  and later RLS negative tests). This decision can be deferred to RLS-03H
  (result documentation) — it does not need to be made now.
- **Implementation clarification (superseded during RLS-03C-Rewrite):** the
  test previously queried non-`public` schemas via `@supabase/supabase-js`
  (`.schema('analytics').from(...)`), which required the target project's
  Data API "Exposed schemas" setting to include `analytics` before any live
  run. This was a security-relevant PostgREST exposure decision made just to
  simplify the test, which is exactly what the standing product/security
  decision says not to do. `tests/integration/rls-two-tenant-negative.test.ts`
  now connects **directly to Postgres via `pg`** instead, and simulates the
  `request.jwt.claims` GUC PostgREST would normally set. **No schema
  exposure via PostgREST is required for RLS-03 at all** — analytics,
  personal, commons, gov, audit, and network all remain unexposed. See the
  test file's own header comment for the exact claims shape used
  (`kora.kora_role()` / `kora.tenant_id()`, sourced from
  `supabase/migrations/004_gate3a_claims_and_grants.sql` and
  `supabase/migrations/006_canonical_tenant_key.sql`).
- **Implementation clarification (added during RLS-03C):** the integration
  test's own guarded setup creates/upserts the two `analytics.tenant` rows
  (idempotent, by `tenant_code`). RLS-03F (user creation) depends on those
  rows already existing, since each COMPANY_ADMIN test user's
  `app_metadata.kora_tenant_id` must be set to the real `analytics.tenant.id`
  UUID generated for `RLS03-A`/`RLS03-B` — not a value chosen in advance. Run
  the test once (or insert the two tenant rows manually) to obtain those ids
  **before** provisioning the two users in RLS-03F.

## C. Required Env Vars (names only — no values)

**Current (direct Postgres, since RLS-03C-Rewrite):**

```
RLS03_PG_URL=
RLS03_ALLOW_RUN=
```

`RLS03_PG_URL` must point ONLY at a local Postgres instance (loopback host —
127.0.0.1/localhost/::1 — enforced by the test's own always-on guard).
Confirm the real value via `supabase status` rather than assuming a default.
No Supabase Auth sign-in is required under this approach, so no tenant user
email/password vars are needed for this specific test.

**Deprecated (PostgREST/@supabase-js approach, superseded by RLS-03C-Rewrite —
kept here only so anyone who set these previously knows they're no longer
read by the test):**

```
RLS03_SUPABASE_URL=
RLS03_SUPABASE_ANON_KEY=
RLS03_SUPABASE_SERVICE_ROLE_KEY=
RLS03_TENANT_A_EMAIL=
RLS03_TENANT_A_PASSWORD=
RLS03_TENANT_B_EMAIL=
RLS03_TENANT_B_PASSWORD=
RLS03_ADMIN_EMAIL=
RLS03_ADMIN_PASSWORD=
```

- **Values must never be pasted in chat** — not even partially or masked.
- **Values must never be committed** — not to this repo, not to any branch,
  not to a commit message, not to a code comment.
- **Values belong only in a gitignored file**, e.g. `.env.rls03.local` —
  a new file, distinct from every existing env file in this repo.
- **Do not reuse `.env.local`, `.env.staging.local`, or Vercel environment
  variables** for any of the above. These names are deliberately new and
  distinct from the existing `E2E_*`/`NEXT_PUBLIC_SUPABASE_*` variables so
  that RLS-03 can never accidentally point at staging or production simply
  because those variables happen to already be set in a developer's shell.

## D. Migrations

- Apply only the **canonical migrations** under `supabase/migrations/`
  (currently `001` through `031`) needed to reach the current live-designed
  schema — in order, since they are linear and each depends on the ones
  before it.
- **Do not apply proposed KORA Link migrations.** `supabase/proposed/034_kora_link_schema.sql`,
  `035_kora_link_rls.sql`, `036_kora_link_rpc_functions.sql` exist in the
  repo but are outside `supabase/migrations/` and outside canonical scope —
  KORA Link is frozen; these must never be applied to the throwaway project.
- `supabase/proposed/032_contribution_atomic_attribution.sql` and
  `033_initiative_adoption_source_model.sql` are also proposed-only
  (Gate 3 OPEN, not applied to any database) and are unrelated to tenant
  isolation — do not apply them either.
- **Migrations 022, 026, 027, 030, 031** — per the RLS-03A preflight
  findings, these are written but **not applied to production**, and 022/026/027
  are not applied anywhere at all (per their own file-header comments). On a
  disposable throwaway project, applying all of them (001–031, in full) is
  safe and actually desirable: it tests the fully hardened *target* design,
  and none of their staging/production preconditions apply here, since
  nothing production-facing depends on this project. The one caveat: migration
  027 removes KORA_ADMIN's blanket access to worker-individual tables — this
  only matters if this same project is later reused for RLS-05 (worker
  testing) without also wiring up the service-role worker-provisioning path;
  it does not affect RLS-03's own scope, which contains zero `personal.*` rows.
- **Before trusting any RLS-03 result**, check the throwaway project's actual
  applied-migration state directly (its `supabase_migrations.schema_migrations`
  table or equivalent) — do not assume file presence equals applied state.
  This exact assumption gap was flagged independently in both the RLS-01 and
  RLS-03A audits.

## E. Fixtures

**Tenants:**

| Fixture | Value |
|---|---|
| Tenant A | `tenant_code = RLS03-A`, `tenant_kind = TEST` |
| Tenant B | `tenant_code = RLS03-B`, `tenant_kind = TEST` |

**Users:**

| Fixture | `app_metadata` |
|---|---|
| Company admin A | `kora_role = COMPANY_ADMIN`, `kora_tenant_id = <Tenant A id>` |
| Company admin B | `kora_role = COMPANY_ADMIN`, `kora_tenant_id = <Tenant B id>` |
| KORA_ADMIN (optional) | `kora_role = KORA_ADMIN`, no tenant claim |

All `app_metadata` set via the Supabase Admin API (service role) only — never
via client-editable `user_metadata`, matching the live app's own convention
(`lib/auth/kora-session.ts`).

**Minimum table rows (required for the core proof):**

- `analytics.tenant` (the 2 rows above)
- `analytics.source_batch` (1 row per tenant)
- `analytics.kora_index_result` (1 row per tenant, `is_current = true`) —
  the highest-value target: the actual scored output a real cross-tenant
  leak would expose
- `analytics.activation_result` (1 row per tenant) — cheap to add alongside
  `kora_index_result`, same policy shape, not strictly required

**Optional second-tier rows** (add only after the core proof passes):

- `analytics.confidence_result`
- `analytics.bti_result`
- `analytics.decision_pack_version`
- `gov.budget_governance`
- `audit.audit_log`

**Excluded from RLS-03 entirely:**

- `personal.*` (all worker-individual tables) — reserved for RLS-05
- `analytics.uef_record` — has no direct COMPANY_ADMIN policy at all; a
  tenant-isolation test on it would prove the wrong thing (see RLS-03A §5)
- `commons.*` (`post`, `booking`, `contribution_event`) — `commons.post` has
  a deliberate cross-tenant WORKER read policy; needs its own dedicated test
- `network.*` (`partner_profile`, `partner_identity`) — not tenant-scoped
- KORA Link tables (proposed, frozen, out of scope)

## F. Pass/Fail Logic

- Tenant A's session can read Tenant A's own rows (**positive control**).
- Tenant A's session **cannot** read Tenant B's rows (**negative case**).
- Tenant B's session can read Tenant B's own rows (**positive control**).
- Tenant B's session **cannot** read Tenant A's rows (**negative case**).
- **0 rows alone is not enough unless the matching positive control also
  passes.** A claim-name mismatch or broken fixture also produces 0 rows for
  everyone, which looks identical to "isolation working" but means "everything
  is broken." Always assert the positive control first.
- The optional KORA_ADMIN positive control (KORA_ADMIN can read both
  tenants' rows) proves the *admin* cross-tenant path still works — it must
  **not** be confused with, or substituted for, the COMPANY_ADMIN
  isolation checks above. It's a different invariant (intentional admin
  access vs. required company isolation).

## G. Safety Gates

None of the following proceed without the user typing the **exact** phrase
below in a future turn. A generic "yes," "go ahead," or "sounds good" is
**not** sufficient authorization for any of these — they are distinct,
individually-gated actions:

- **`CONFIRM RLS-03 PROJECT CREATE`** — before creating the actual Supabase project.
- **`CONFIRM RLS-03 MIGRATION APPLY`** — before applying any migration to it.
- **`CONFIRM RLS-03 USER CREATE`** — before creating any Auth user on it.
- **`CONFIRM RLS-03 FIXTURE INSERT`** — before inserting any fixture row.
- **`CONFIRM RLS-03 LIVE TEST RUN`** — before executing the negative-test suite against it for the first time.

## H. Failure Interpretation

If a cross-tenant negative check ever returns nonzero rows (or any check
fails), distinguish before concluding anything:

- **Real RLS leak** — Tenant B's session reads Tenant A's row(s), AND the
  matching positive control (Tenant A reading its own row) passed. Only this
  combination is an actual finding.
- **Fixture setup error** — the positive control itself fails (0 rows for a
  tenant reading its own data) — fix the fixture, don't conclude isolation
  is broken.
- **`app_metadata` claim mismatch** — a naming drift (e.g. the historical
  `kora_worker_ref`/`kora_worker_id` inconsistency noted in the Gate 2
  review) silently zeroes rows for everyone — identical symptom to "working,"
  different cause.
- **Tenant ID mismatch** — the fixture's `kora_tenant_id` claim doesn't match
  the actually-inserted `analytics.tenant.id` (e.g. stale UUID from a partial
  prior run).
- **Missing migration** — the throwaway project doesn't actually have every
  expected migration applied — verify against its real applied-migration
  state, not assumed from file presence (see §D).
- **Intentional admin-wide policy** — if the KORA_ADMIN positive control
  fails (returns 0 rows for a tenant it should see), that's a regression in
  the intentional cross-tenant admin path — a real bug, but a different one
  from a company-isolation leak.
- **False positive from `commons.post` cross-company behavior** — not
  applicable here since `commons.*` is excluded from RLS-03's table scope
  (§E); flagged for completeness in case scope ever expands to include it —
  if it does, this exact scenario must be excluded from the negative-check
  set explicitly, not treated as a leak.

## I. Next Sequence After This Checklist

- **RLS-03C** — implement the skip-safe integration test
  (`tests/integration/rls-two-tenant-negative.test.ts`), fully inert with no
  env vars set. No Supabase touched in this step.
- **RLS-03D** — create the throwaway project (behind `CONFIRM RLS-03 PROJECT CREATE`).
- **RLS-03E** — apply migrations 001–031 (behind `CONFIRM RLS-03 MIGRATION APPLY`).
- **RLS-03F** — create users and insert fixtures (behind `CONFIRM RLS-03 USER CREATE` and `CONFIRM RLS-03 FIXTURE INSERT`).
- **RLS-03G** — first live run (behind `CONFIRM RLS-03 LIVE TEST RUN`).
- **RLS-03H** — document results (update `docs/QA_STATUS.md`/`docs/GOLDEN_PATH.md`; decide whether to keep or tear down the throwaway project).

## J. Do-Not-Do List

1. No Production, ever — RLS-03 must never target `azdn****` or any production project.
2. No real company data at any step — fixtures are synthetic only, always.
3. No shared staging (`haqf****`) unless explicitly re-approved as a deliberate, separately-confirmed exception — not the default path.
4. No KORA Link — proposed migrations 034/035/036 must never be applied, and KORA Link tables must never appear in fixtures or checks.
5. No worker rows in RLS-03 — `personal.*` fixtures are reserved for RLS-05; keep this test's failure surface unambiguous (a tenant leak, not a worker leak).
6. No reuse of `.env.local`, `.env.staging.local`, or Vercel env vars for `RLS03_*` values — always a new, separate, gitignored file.
7. No committed secrets — no `RLS03_*` value ever lands in a commit, a PR description, a code comment, or chat.
8. No running without `RLS03_ALLOW_RUN=true` explicitly set — credentials being present is not sufficient on its own to allow a live run.
9. No trusting a 0-rows result without its matching positive control passing first — see §F and §H.
10. No treating RLS-03 as a replacement for RLS-04/RLS-05 — RLS-03 proves DB-level tenant isolation only; app/route-level (RLS-04) and worker-vs-worker (RLS-05) isolation are separate, still-needed tests.
11. No assuming migration file presence equals applied state on the throwaway project — always verify directly (§D).
12. No implementing the test itself in this checklist step — RLS-03C is a separate, later step.
