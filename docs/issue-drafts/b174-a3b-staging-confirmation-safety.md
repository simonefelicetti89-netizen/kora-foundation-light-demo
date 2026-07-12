# B174-A3b: Staging confirmation safety checklist before A02/A03/A04/T01/T02/GD01

**Labels suggested:** `testing`, `e2e`, `safety`, `pilot-readiness`, `manual-action`
**Priority:** High — blocks fresh confirmation of the 2026-07-09 staging validation record
**Source:** B174-A3 (fresh staging confirmation attempt, read-only preflight only, complete)

## Background

`B174-A` (read-only, 2026-07-12) found repo evidence indicating Company B/`STAGE-001` was provisioned and that `A02`–`A04`, `T01`/`T02`, and `GD01` all ran live against staging and passed on 2026-07-09. `B174-A2` reconciled the repo's docs to state this with an explicit caveat: *"repo evidence indicates validation on 2026-07-09, not independently re-verified since."*

`B174-A3` attempted to perform that fresh re-verification. It got as far as a **safety preflight only** — inspecting test specs, checking required env var names for presence (never values), and classifying the configured target host. It **stopped before running any test**, correctly, because the preflight itself surfaced an unsafe configuration. No `A02`, `A03`, `A04`, `T01`, `T02`, or `GD01` was run. No Supabase, Vercel, or E2E action of any kind occurred.

**`B174-A3c` (2026-07-12, complete) added a technical guard closing the specific weakness this checklist describes**: `tests/e2e/helpers/e2e-safety.ts` (`assertSafeE2ETarget`/`guardE2ETarget`), wired into `authenticated-smoke.spec.ts`, `two-tenant-isolation.spec.ts`, and `golden-data-bearing.spec.ts` before any login attempt. `E2E_ALLOW_PRODUCTION=true` is no longer sufficient by itself to unblock a non-local host — an explicit `E2E_ALLOWED_STAGING_HOSTS` entry or the deliberately scary `E2E_CONFIRM_PRODUCTION_AUTH_E2E_I_UNDERSTAND=true` is required. Covered by `tests/unit/b174-a3c-e2e-staging-safety-guard.test.ts` (35 assertions). **This is a code-level guard only — it does not itself constitute a fresh staging confirmation.** A future confirmation run still requires an operator-approved, unambiguous staging URL (added to `E2E_ALLOWED_STAGING_HOSTS`) per the safety requirements below. No fresh confirmation was run by `B174-A3c`.

## Problem statement

A fresh confirmation of the 2026-07-09 validation is needed before that record can keep being cited for client-facing claims or before further B174 demo-tightening work relies on it. Right now, the local E2E configuration is not safe enough to run that confirmation automatically or casually — running it as configured today risks accidentally targeting a production-looking endpoint.

## Specific unsafe findings (B174-A3, 2026-07-12)

No secret values, credentials, or full URLs are included below — only variable-name presence/absence and a hostname classification, consistent with the read-only preflight that produced them.

- **`E2E_BASE_URL`'s configured hostname matches the hostname documented elsewhere in this repo (`docs/STATUS.md`, `docs/GOLDEN_PATH.md`) as the Production Vercel deployment.** There is no way to confirm from the hostname alone, or from any read-only, non-Supabase/non-Vercel check, whether this specific deployment is currently backed by staging or Production Supabase data.
- **`E2E_ALLOW_PRODUCTION=true` is persistently present in `.env.e2e.local`.** This is the one gate specifically designed to prevent an authenticated E2E run from silently targeting a production-looking host. Persisting it as `true` in a file defeats its purpose — it should only ever be a deliberate, ephemeral, per-run shell export, per this repo's own documented convention in `docs/E2E_GOLDEN_PATH.md`/`docs/E2E_TWO_TENANT_ISOLATION.md`.
- **`E2E_GOLDEN_DATA_BEARING_ALLOW_RUN` is correctly absent** from `.env.e2e.local` — this is by design (it is the additional mutation gate specific to `GD01`, meant to be exported only for that one run, never persisted). No action needed on this item; listed here only for completeness.
- **The other required E2E variable names (`E2E_KORA_ADMIN_EMAIL`/`PASSWORD`, `E2E_COMPANY_A_EMAIL`/`PASSWORD`/`TENANT_CODE`, `E2E_COMPANY_B_EMAIL`/`PASSWORD`/`TENANT_CODE`) are present in `.env.e2e.local` but were not exported into the shell that would actually run the tests.** `playwright.config.ts` has no `dotenv` loader — it reads `process.env` directly. This means the file's presence alone does not guarantee the tests would even see these values; the guard's actual behavior at run time depends entirely on manual shell setup at the moment of the run, which can be misread or forgotten.

Taken together: the combination of an ambiguous/production-matching hostname **and** a persistently-enabled production-allow flag means the one safety net this repo built (`guardBaseUrl()`) would not have stopped a run against what may be Production, had the vars simply been exported and the tests run. That is the exact failure mode this checklist exists to prevent.

## Safety requirements before any run

- [ ] Use an unambiguous staging/preview URL — distinct from the hostname/alias documented as Production — for `E2E_BASE_URL`.
- [ ] Confirm, by some means outside this checklist (operator knowledge, Vercel project inspection, or an explicit statement from whoever controls the deployment), that the chosen URL is non-production before it is ever used in a test run.
- [ ] Ensure `E2E_ALLOW_PRODUCTION` is not persisted as `true` (or at all) in any `.env*` file checked into or resting on disk in this repo's working tree.
- [ ] Require `E2E_ALLOW_PRODUCTION=true` only as an explicit, ephemeral, per-run shell export — set immediately before the specific run it's needed for, never left set across sessions.
- [ ] Require `E2E_GOLDEN_DATA_BEARING_ALLOW_RUN=true` only as an explicit, ephemeral, per-run shell export, and only for the `GD01` run specifically — never bundled with the read-only checks.
- [ ] Ensure the required E2E variable names are actually exported into the shell that invokes Playwright, or establish a safe, documented, reviewed dotenv-loading workflow if that's preferred over manual export (this repo currently has neither `dotenv` wired into `playwright.config.ts` nor a documented safe-loading script — that gap itself is part of what made B174-A3's preflight necessary rather than a formality).
- [ ] Never print, log, or paste secret values (credentials, tokens, full URLs containing tokens) anywhere in a terminal, chat, doc, commit, or PR during setup or execution.
- [ ] Operator must explicitly approve each run — a prior approval for one step (e.g. the read-only smoke tests) is not standing authorization for a different, higher-risk step (e.g. `GD01`).
- [ ] Run `A02`/`A03`/`A04`/`T01`/`T02` (read-only) separately from `GD01` (mutating) — do not bundle a mutating run into the same approval as the read-only reachability checks.

## Acceptance criteria

- [ ] A non-production staging URL is identified and documented by hostname class only (e.g. "a `*.vercel.app` preview alias distinct from the production alias" or equivalent), without ever recording the full URL or any secret value in this repo.
- [ ] Persistent `E2E_ALLOW_PRODUCTION=true` in `.env.e2e.local` (or any other checked/resting env file) is removed, replaced by documented per-run-only shell-export behavior.
- [ ] A preflight command/script exists (or the existing manual preflight steps from B174-A3 are formalized) that reports only variable-name PRESENT/MISSING status and a target-hostname safety classification — never a secret value, never a full URL if it could contain a token.
- [ ] `A02`/`A03`/`A04`/`T01`/`T02` can be run safely against a confirmed-staging target, with the guard (`guardBaseUrl()`) actually capable of blocking an accidental production-like target (i.e. `E2E_ALLOW_PRODUCTION` is not pre-armed).
- [ ] `GD01` has its own separate explicit per-run enable flag (already exists: `E2E_GOLDEN_DATA_BEARING_ALLOW_RUN`) and cannot be run accidentally alongside the read-only checks.
- [ ] A final report template/convention exists for recording pass/fail results without secret values (the format used in B174-A3's own Phase 2 report, or `docs/PILOT_OPERATING_RUNBOOK.md` §9's communication templates, are both suitable starting points).
- [ ] No production endpoint can be targeted accidentally as a result of routine/default configuration — accidental targeting should require an active, deliberate, informed choice, not a leftover persisted flag.

## Proposed safe run sequence (once the above is resolved)

1. Preflight only — variable presence + target classification, no network activity.
2. Operator explicitly confirms the target is non-production.
3. Run `A02`.
4. Run `A03`.
5. Run `A04`.
6. Run `T01`.
7. Run `T02`.
8. Separately approve, then run `GD01` (mutating — creates real rows on the target tenant).
9. Stop immediately on the first failure — do not continue to the next step.
10. No repair attempted inside the confirmation run itself — a failure is logged and escalated, not patched live.
11. Document the result afterward (per `docs/PILOT_OPERATING_RUNBOOK.md` §9's validation-result template or equivalent).

## Do-not-do list

- Do not run any authenticated E2E against the production alias/hostname.
- Do not persist `E2E_ALLOW_PRODUCTION=true` in any `.env*` file.
- Do not run `GD01` without its own explicit, separate, per-run enable flag freshly set for that run.
- Do not print, log, or share any env variable *value* — names and presence/absence only.
- Do not patch or modify tests to make them pass during a confirmation run — a failing test is a finding, not a bug to fix in the moment.
- Do not create users during a confirmation run — confirmation uses existing, already-provisioned test accounts only.
- Do not deploy anything during a confirmation run.

## Recommended next step

Manual/operator decision required — this cannot be resolved by a further read-only session:

1. **Either** provide/confirm a safe, unambiguous staging preview URL and establish the shell-export (or reviewed dotenv-loading) workflow described above, so a future B174-A3 attempt can safely proceed to Phase 1;
2. **Or** explicitly defer fresh confirmation until the staging/Production environment separation for this Vercel project is clearer, and record that deferral as a deliberate decision (not a silent gap) in `docs/PILOT_GOVERNANCE.md` or an equivalent status doc.
