# PILOT_GOVERNANCE — Canonical Pilot Readiness Index

**Status:** Canonical governance index. This document does not replace any of the docs it links to — it is a single entry point that summarizes and cross-references them, so a reviewer does not have to reconstruct the full picture from six separate files.
**Introduced:** PILOT-GOVERNANCE-01 (2026-07-06)

---

## 1. Scope

This doc answers one question: **"where does KORA's pilot readiness actually stand, and where is the authoritative detail for each claim?"** It does not restate operational how-to steps (see the runbooks linked below) or re-derive architecture (see `docs/ARCHITECTURE.md`). Where this doc and a linked source doc appear to disagree, the source doc governs — this index is a summary, not a new source of truth. For an external-reviewer-facing version of this material (executive overview, reading paths by audience, external sharing guidance), see `docs/PILOT_REVIEW_PACKAGE.md`.

---

## 2. Current pilot-readiness state (one paragraph)

**Reconciled by B174-A2 (2026-07-12) — see §15a below for the full history.** The service-assisted golden path (upload → UEF → approval → scoring → KORA Index → Decision Pack) works when walked through manually by a KORA_ADMIN operator, and is proven with real staging credentials for login (`A01`, KORA_ADMIN). `A02`–`A04`, `GD01`, and `T01`/`T02` are implemented as skip-safe, credential-gated Playwright scaffolds; repo evidence indicates all of them were executed with real credentials against staging and passed on **2026-07-09** (see §6, §10, §11, §15a). `G01`/`G02` remain not run via fixture. None of this has been independently re-verified in a later session — treat the 2026-07-09 record as strong documented evidence, not as a currently-live-checked fact, and obtain a fresh operator-approved confirmation before citing it in a client-facing claim. Tenant isolation is proven at the direct-Postgres level (RLS-03/05); RLS-04 is proven statically; RLS-06 is proven statically and, per repo evidence, also live (direct-Postgres, local-only, 2026-07-09 — see §8). No live authenticated-request/PostgREST proof (as distinct from direct-Postgres) exists yet for any of RLS-03/04/05/06. See `docs/QA_STATUS.md` for full detail — this section is a compressed pointer, not a replacement.

## 3. Gate 2 status

**Canonical source: `docs/GATE2_STATUS.md`.** Current status: **CLOSED WITH CONDITIONS** (2026-06-22). Authorizes continued product/architecture work on the **staging** Supabase project only — does not authorize Production Supabase provisioning, live worker data (blocked by Gate 3, still OPEN), or live fiscal outputs (blocked by Gate 5, still OPEN).

**Known documentation drift (already flagged in `GATE2_STATUS.md` itself):** `CLAUDE.md`'s footer still reads "Gate 2 OPEN (blocks SQL)" — stale, predates the close-with-conditions decision. Reconciling it is a founder-governance decision, out of scope for this doc and for this sprint.

## 4. CI scope and limits

**Canonical source: `docs/CI.md`, `.github/workflows/ci.yml`.** CI (`KORA CI`) runs on every PR/push to `main`: `npm ci` → `npx tsc --noEmit` → `npm test` (Vitest unit/integration) → `npm run build` → `npm run lint` (report-only, `|| true`, non-blocking — 103 pre-existing lint errors on `main`, not this sprint's concern).

**CI does not run:** Playwright/E2E (not installed, no browser step), anything against staging/Production Supabase, any migration. No repository secret is referenced anywhere in the workflow. This sprint did not modify `ci.yml`.

## 5. What is proven

- KORA_ADMIN login → `/admin`, real staging credentials, local dev (`A01`, PASS, GOLDEN-03B).
- KORA_ADMIN login → `/admin`, manual browser check, Production (VERCEL-05).
- Public pages (`/`, `/login`, `/request-access`) load correctly in Production (VERCEL-03).
- Postgres RLS itself (not application code) rejects cross-tenant reads on `analytics.source_batch`/`kora_index_result`/`activation_result` — direct-Postgres, simulated JWT claims, 13/13 tests, run live 2026-07-04 (RLS-03).
- Postgres RLS rejects worker-vs-worker reads on `personal.worker_identity`/`worker_pib` within the same tenant — direct-Postgres, 9/9 tests, run live (RLS-05).
- Every `app/api/**` route (84 files) derives tenant/worker identity from session `app_metadata`, never client input — static source audit, all passing (RLS-04).
- 217 unit/integration test files passing (as of this sprint) — static/structural correctness of route guards, access-matrix logic, and pure-function scoring/methodology code. **This is not the same as runtime/live-database proof** — see §8.

## 6. What is scaffolded, and current live-run status

**Updated by B174-A2 (2026-07-12).** All of the following are implemented and statically verified (`tsc` clean, Playwright registers the tests, skip-safe confirmed with no credentials set). Live-run status per row — for every "documented as PASS" row, repo evidence (dated logs in the linked doc, corroborated by git history and local E2E env configuration) indicates the run happened and passed on 2026-07-09; **none of it has been independently re-verified in a later session**:

| Scaffold | File | Live-run status |
|---|---|---|
| `A02` COMPANY_A login | `tests/e2e/authenticated-smoke.spec.ts` | Documented as PASS, staging, 2026-07-09 — see `docs/E2E_TWO_TENANT_ISOLATION.md` |
| `A03`/`A04` COMPANY_B login + tenant separation | `tests/e2e/authenticated-smoke.spec.ts` | Documented as PASS, staging, 2026-07-09 — see §10, `docs/E2E_TWO_TENANT_ISOLATION.md` |
| `G01`/`G02` admin↔company narrative + KORA Index reachability | `tests/e2e/golden-admin-company.spec.ts` | Never executed — not part of the 2026-07-09 session |
| `GD01` full data-bearing golden path | `tests/e2e/golden-data-bearing.spec.ts` | Documented as PASS, staging, 2026-07-09, explicit founder approval — see `docs/E2E_GOLDEN_PATH.md` |
| `T01`/`T02` two-tenant isolation via `/api/company/workspace` | `tests/e2e/two-tenant-isolation.spec.ts` | Documented as PASS, staging, 2026-07-09 — see §11, `docs/E2E_TWO_TENANT_ISOLATION.md` |
| RLS-06 KORA_ADMIN positive control, live half | `tests/integration/rls-kora-admin-control.test.ts` | Static half done; repo evidence indicates the live direct-Postgres run also executed (local-only, not staging) on 2026-07-09, 11/11 passed — see `docs/QA_STATUS.md` |

## 7. What is explicitly not proven yet

- Any golden-path step beyond login, in Production (as distinct from staging).
- Any cross-tenant isolation proof through a real authenticated HTTP request against Production — the 2026-07-09 `T01`/`T02` run (§11) was staging only.
- Any RLS proof through a real authenticated HTTP request/PostgREST/GoTrue — RLS-03/05/06 are direct-Postgres with simulated claims, not PostgREST/GoTrue, regardless of the COMPANY_B reconciliation in §10.
- **Independent re-verification of the 2026-07-09 staging session itself** (§6, §10, §11, §15a) — that session's results are documented, not re-checked by a later session. Do not treat "documented" as equivalent to "currently confirmed live."

## 8. RLS / static control status

Direct-Postgres, simulated-claims tests (RLS-03 tenant-vs-tenant, RLS-05 worker-vs-worker) are merged and **run live** against local Supabase with fixture cleanup verified. RLS-04 (app/API static audit) and RLS-06's static half are merged. **None of RLS-03/04/05/06 constitutes a live authenticated-request/PostgREST/GoTrue proof** — this is stated explicitly in `docs/QA_STATUS.md` and repeated here because it is the single most important caveat in this entire index: a passing static or direct-Postgres-with-simulated-claims test is not the same claim as "a real browser session was rejected by a running server." Do not conflate the two.

## 9. E2E scaffold status

See §6 table. Helpers (`tests/e2e/helpers/{env,auth,roles,privacy}.ts`) are shared across all scaffold files, are skip-safe by construction (missing credentials → `test.skip(...)`, never a failure), and are protected by a production guard (`guardBaseUrl()`, unit-tested in `tests/unit/golden-02-e2e-env-guard.test.ts`) that blocks any non-local `E2E_BASE_URL` unless `E2E_ALLOW_PRODUCTION=true` is explicitly set.

## 10. COMPANY_B status

**Updated by B174-A2 (2026-07-12).** This section previously stated "COMPANY_B does not exist," as of `PILOT-GOVERNANCE-01` (2026-07-06). Since then, repo evidence indicates COMPANY_B was provisioned in staging (via the app's own admin route, `POST /api/admin/companies/provision`, KORA_ADMIN-only) and live-validated on **2026-07-09** — see `docs/E2E_TWO_TENANT_ISOLATION.md`'s live staging validation log, corroborated by git history (`FIX-A04-TENANT-HEADING-RACE`, a bug fix of the kind only discoverable by actually running the test) and by local E2E environment configuration. This is documented evidence, not an independent re-check performed by this reconciliation pass (B174-A/B174-A2) — no Supabase query, GD01 run, or E2E run was performed to confirm this status is still current as of the date this section was last edited. A fresh, operator-approved confirmation is recommended before COMPANY_B's existence is treated as an unconditionally current fact for any further mutation or client-facing claim. See `docs/B174_COMPANY_B_AND_DEMO_TIGHTENING_PLAN.md` §4a for the full evidence comparison.

## 11. Two-tenant isolation status

Implemented as a skip-safe scaffold (`T01`/`T02`, `tests/e2e/two-tenant-isolation.spec.ts`, merged PR #32) proving, once COMPANY_B exists, that a COMPANY_A session cannot resolve COMPANY_B's tenant data via `/api/company/workspace` (and vice versa), both through rendered markup and a direct authenticated API call. **Updated by B174-A2 (2026-07-12):** this section previously said the test "has not been run live," blocked exclusively by COMPANY_B's absence. Repo evidence (`docs/E2E_TWO_TENANT_ISOLATION.md`'s live staging validation log) indicates it was run against staging on 2026-07-09 and both `T01` and `T02` passed. Not independently re-verified since — see §10's caveat, which applies equally here.

## 12. Privacy boundary status

Architecture is real, not aspirational: three-layer defense in depth (middleware → server layout → RLS), documented in `docs/access-matrix.md` (authoritative — overrides any hardcoded check in code) and `docs/API_ROUTE_AUTH_MATRIX.md` (84-route static audit). `docs/privacy-escalation-model.md` states the canonical principle that KORA_ADMIN access ≠ worker-PIB access. E2E-level privacy checks (`tests/e2e/helpers/privacy.ts`'s `assertNoWorkerLevelIdentifiers`/`assertNoWorkerLevelIdentifiersInText`) are markup/JSON smoke checks — they catch an accidental leak into rendered output, and are **not** a substitute for RLS enforcement.

## 13. Known remaining pilot blockers

**Updated by B174-A2 (2026-07-12).** Items 1–4 below were live blockers before 2026-07-09; repo evidence indicates they were resolved that day (§6, §10, §11, §15a). They are retained here, reframed, because none of them has been independently re-verified since — the residual blocker in each case is now "obtain a fresh confirmation," not "the underlying gap is unresolved."

1. ~~COMPANY_B provisioning (§10) — blocks `A03`, `A04`, `T01`, `T02`.~~ Repo evidence indicates resolved 2026-07-09. Residual: fresh confirmation before client-facing use.
2. ~~`A02` has never been run via fixture.~~ Repo evidence indicates run (staging) 2026-07-09, passed. Residual: not yet run against Production specifically; fresh confirmation recommended.
3. ~~`GD01` has never been run live.~~ Repo evidence indicates run (staging, explicit founder approval) 2026-07-09, passed. Residual: fresh confirmation before client-facing use; still never run against Production.
4. ~~RLS-06's live direct-Postgres run has not been executed.~~ Repo evidence indicates it was executed (local Postgres only, not staging) 2026-07-09, 11/11 passed. Residual: this was never a staging/Production run to begin with — that gap (§8) is unchanged.
5. No authenticated E2E has ever run against Production. **Unchanged — still an open blocker**, regardless of the staging reconciliation above.
6. Gate 2 status line in `CLAUDE.md` is stale (§3) — a founder-governance reconciliation, not a technical blocker. **Unchanged.**
7. Credential cleanup remains deferred to the end of the roadmap (§15). **Unchanged** — and per §15's own entry, the roadmap gate for starting it may now be reached, pending the same fresh-confirmation caveat as everything else in this section.
8. **New, per B174-A2:** the documentation drift itself (multiple aggregate docs stating "COMPANY_B does not exist" as current fact after 2026-07-09) was a governance process gap. This reconciliation pass addresses the docs found in `docs/B174_COMPANY_B_AND_DEMO_TIGHTENING_PLAN.md` §4a; confirm no further doc was missed before treating this item as fully closed.

Full detail and history for each: `docs/PILOT_SAAS_READINESS.md`, `docs/STATUS.md`, `docs/GOLDEN_PATH.md`, `docs/QA_STATUS.md`.

## 14. "Do not claim" boundaries

These are the specific overclaiming traps this repo's own docs have flagged — repeated here as a single checklist so no future session has to rediscover them independently. **Updated by B174-A2 (2026-07-12):** the first three bullets below were unconditional prohibitions before 2026-07-09; repo evidence since then indicates the underlying events occurred (§6, §10, §11, §15a), so the boundary is reframed from "never happened" to "documented but not independently re-verified — do not state it as a currently-confirmed fact without that caveat."

- **Do not claim `GD01` has run live and passed *without the 2026-07-09 documentation caveat*.** Repo evidence indicates it ran live and passed on that date (`docs/E2E_GOLDEN_PATH.md`); this has not been independently re-verified since. State it as "documented as passed, 2026-07-09, not independently re-verified since" — not as a bare, undated "GD01 passed" claim, and never as a currently-live-checked fact without a fresh confirmation.
- **Do not claim COMPANY_B exists *as an unconditionally current, freshly-verified fact*.** Repo evidence indicates it was provisioned and validated in staging on 2026-07-09 (§10); this has not been independently re-verified since. State it as "repo evidence indicates COMPANY_B was provisioned in staging, 2026-07-09" — not as "COMPANY_B exists" bare, and not as a claim safe to act on for further mutation without a fresh confirmation.
- **Do not claim two-tenant isolation (`T01`/`T02`) has passed live *as a freshly-verified fact*.** Repo evidence indicates it passed live in staging on 2026-07-09 (§11); this has not been independently re-verified since. State it with the same dated-documentation caveat as the two bullets above.
- **Do not cite `tests/unit/b103-golden-path.test.ts` as functional E2E coverage.** Despite its name, it only asserts static files exist — it does not call any real API or drive any UI. **Unchanged by this reconciliation.**
- **Do not claim a static or unit test proves runtime/live-database behavior.** Most of `tests/unit/` is source-text analysis or pure-function logic. A test named "tenant isolation" or "golden path" does not by itself mean the behavior was exercised end-to-end — check what the specific test file actually does before citing it. **Unchanged.**
- **Do not claim RLS-03/04/05/06 constitute a PostgREST/GoTrue/live-authenticated-request proof.** They are direct-Postgres-with-simulated-claims or static source audits, even where (as with RLS-06, §8) a live direct-Postgres run is documented. **Unchanged** — direct-Postgres-with-simulated-claims is not the same claim as PostgREST/GoTrue, regardless of the COMPANY_B reconciliation.
- **New, per B174-A2: do not claim any item in this document is "currently live-verified" or "safe to build further mutation on" solely because it is documented as having passed on 2026-07-09.** Documented-and-dated is not the same claim as currently-confirmed. A fresh, operator-approved confirmation is the bar for the latter.

## 15. Credential cleanup — deferred status

A credential cleanup topic exists and is **explicitly deferred until the end of the roadmap**. It is not in scope for `PILOT-GOVERNANCE-01` or any prior sprint referenced in this doc, and must not be started opportunistically inside an unrelated sprint. Any future session encountering credential-adjacent work should treat it as blocked-until-explicitly-scheduled, not as a task to fold in.

**Final rotation plan (recorded 2026-07-09 — status: planned, not executed).** `A02`, COMPANY_B provisioning, `A03`/`A04`, `T01`/`T02`, `GD01`, and RLS-06's live run are all complete per this doc's own entries above, so the roadmap gate for starting credential cleanup (end of §16's sequence) is reached. This entry records the agreed plan only — no rotation has been performed.

- **Cleanup type:** staging Supabase Auth password rotation only (no other environment, no other credential type).
- **Accounts in scope (rotate password, keep account):** `kora-admin@staging.kora.internal`, `company-admin@staging.kora.internal`, the COMPANY_B admin account referenced by `E2E_COMPANY_B_EMAIL`.
- **Explicitly out of scope:** `simone.felicetti.kora@gmail.com` — not to be touched.
- **Actions:** rotate password only; keep account, role, and tenant binding unchanged; update local env files manually after rotation; verify old password rejected and new password accepted (boolean pass/fail only); document the result after execution with no values.
- **Not included:** user deletion, session revocation, Production credentials, local Supabase credentials, or any credential value in docs/chat/logs/commits.
- **Rotation mechanism:** Supabase Studio Dashboard Auth UI on the staging project — founder/operator enters new passwords directly; no password value is to pass through a terminal, chat, log, doc, or PR.
- **Post-rotation env update:** `.env.e2e.local` (`E2E_KORA_ADMIN_PASSWORD`, `E2E_COMPANY_A_PASSWORD`, `E2E_COMPANY_B_PASSWORD`), updated manually. Whether `.env.staging.passwords.local` stores any of these under different variable names must be checked (name-only) before deciding whether it also needs a manual update.
- **Stop conditions:** any secret would be printed; target Supabase project is not staging; target account is ambiguous; `E2E_COMPANY_B_EMAIL` cannot be safely resolved; local env update target is ambiguous. Any of these halts the step — see `docs/PILOT_OPERATING_RUNBOOK.md` §7 for the general form.
- **Exact approval sentence required before execution:**
  > "I approve executing the credential cleanup step now: rotate passwords (keep accounts) for kora-admin@staging.kora.internal, company-admin@staging.kora.internal, and the COMPANY_B admin account referenced by E2E_COMPANY_B_EMAIL, on the staging Supabase project only. Do not touch simone.felicetti.kora@gmail.com, do not revoke sessions, do not delete any user."
- **Claim boundary for this entry:** this is a plan record only. Do not cite this entry as proof credential cleanup executed, as production readiness, as production validation, as GDPR compliance/certification, or as full pilot readiness — none of those are claimed here.

## 15a. B174-A / B174-A2 reconciliation note (2026-07-12)

This governance index previously described §§2, 6, 7, 10, 11, 13, 14, and 16 in future tense ("not yet executed," "COMPANY_B does not exist"), while §15 (added 2026-07-09, the same day the underlying events are documented as having occurred) stated the opposite in passing — an internal contradiction that went unreconciled for three days.

`B174-A` (read-only, 2026-07-12) investigated this contradiction using only repo docs, git history, and local non-secret E2E environment configuration (no Supabase query, no GD01 run, no E2E run). It concluded that **repo evidence indicates** COMPANY_B/`STAGE-001` was provisioned and that `A02`–`A04`, `T01`/`T02`, `GD01`, and RLS-06's live direct-Postgres half all ran and passed on 2026-07-09, based on: (a) three independent, mutually-consistent, dated validation-log docs (`docs/E2E_TWO_TENANT_ISOLATION.md`, `docs/E2E_GOLDEN_PATH.md`, `docs/QA_STATUS.md`'s RLS-06 entries); (b) a corroborating git-history bug-fix commit (`FIX-A04-TENANT-HEADING-RACE`) of a kind only discoverable by actually executing the test against a running app; and (c) local `.env.e2e.local` configuration (file dated 2026-07-09, all required `E2E_COMPANY_A_*`/`E2E_COMPANY_B_*`/`E2E_KORA_ADMIN_*` variable names present and non-empty — values not inspected).

**This was not independently re-verified live by B174-A or by this reconciliation pass (B174-A2).** `B174-A2` (this update) reconciles the sections listed above to stop presenting the pre-2026-07-09 state as current fact, while explicitly preserving the caveat that none of this has been freshly re-checked. See `docs/B174_COMPANY_B_AND_DEMO_TIGHTENING_PLAN.md` §4a for the full evidence comparison this reconciliation is based on.

## 16. Final validation sequence (documented as executed 2026-07-09 — see §15a; this section now describes what a fresh re-confirmation would repeat, not a first execution)

1. ~~Run `A02` (COMPANY_A) against local dev, then Production, using the existing fixture.~~ Documented as run against staging, 2026-07-09, passed. Not yet run against Production specifically.
2. ~~Provision COMPANY_B — a deliberate, explicitly-approved action (§10).~~ Repo evidence indicates done, staging, 2026-07-09.
3. ~~Run `A03`/`A04` once COMPANY_B exists.~~ Documented as run, staging, 2026-07-09, passed.
4. ~~Run `T01`/`T02` (two-tenant isolation) once COMPANY_B exists.~~ Documented as run, staging, 2026-07-09, passed — see `docs/E2E_TWO_TENANT_ISOLATION.md`.
5. ~~Run `GD01` (full data-bearing golden path) against a disposable staging tenant.~~ Documented as run, staging, explicit founder approval, 2026-07-09, passed.
6. ~~Run RLS-06's live direct-Postgres control test.~~ Documented as run, local Postgres only, 2026-07-09, 11/11 passed.
7. Begin the deferred credential cleanup sequence (§15) — per §15's own entry, the roadmap gate for this may now be reached, subject to a fresh confirmation of steps 1–6 first (see §15a).

**None of steps 1–6 above has been independently re-verified in a session after 2026-07-09.** A fresh, explicitly-approved re-run of this sequence is recommended before any of it is relied upon for a client-facing claim or further B174 demo-tightening validation — see `docs/B174_COMPANY_B_AND_DEMO_TIGHTENING_PLAN.md`.

For the operating procedure behind this sequence — roles, pre-flight checklist, per-step read-only/mutating classification, stop conditions, evidence collection, closeout — see `docs/PILOT_OPERATING_RUNBOOK.md`.

This sequence remains descriptive of order, not a commitment to a timeline — each future re-confirmation step still requires its own explicit approval per this repo's established precedent (staging/Production Auth writes require explicit sign-off, not routine-task bundling).

## 17. Next roadmap sequence

This sprint (`PILOT-GOVERNANCE-01`) is followed by `PILOT-VISIBLE-CLEANUP-01` — Visible Pilot Surface Cleanup — recommended next, not started.

---

## Related canonical docs

`docs/GATE2_STATUS.md`, `docs/STATUS.md`, `docs/QA_STATUS.md`, `docs/PILOT_SAAS_READINESS.md`, `docs/GOLDEN_PATH.md`, `docs/GOLDEN_PATH_RUNBOOK.md`, `docs/CI.md`, `docs/DEPLOY_CHECKLIST.md`, `docs/access-matrix.md`, `docs/API_ROUTE_AUTH_MATRIX.md`, `docs/E2E_GOLDEN_PATH.md`, `docs/E2E_TWO_TENANT_ISOLATION.md`, `docs/privacy-escalation-model.md`, `docs/PILOT_DEMO_SCRIPT.md` (controlled demo script for presenting this governance status live).

**Document version:** v1.0
**Created:** 2026-07-06 (PILOT-GOVERNANCE-01)
