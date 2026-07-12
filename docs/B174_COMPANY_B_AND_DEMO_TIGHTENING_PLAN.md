# B174 — Company B Provisioning and Demo Tightening Plan

**Status:** Planning / not executed
**Date:** 2026-07-12
**Owner/operator action required:** Yes — see the B174-A/B174-A2 result note immediately below for current status. No Supabase, Vercel, or DB action was performed by either task.
**Scope of this document:** planning/docs only. No product code, migration, Supabase, or Vercel change is made by this document or by writing it.

---

## 0. B174-A / B174-A2 result note (2026-07-12)

**B174-A (read-only reconciliation)** investigated the conflict described in §4a below using only repo docs, git history, and local non-secret E2E environment configuration (no Supabase query, no GD01 run, no E2E run, no user creation). It concluded that **repo evidence strongly indicates** Company B/`STAGE-001` was provisioned and that `A02`–`A04`, `T01`/`T02`, `GD01`, and RLS-06's live direct-Postgres half all ran and passed on **2026-07-09**, based on: three independent, mutually-consistent, dated validation-log docs; a corroborating git-history bug-fix commit (`FIX-A04-TENANT-HEADING-RACE`) of a kind only discoverable by actually executing the test; and local `.env.e2e.local` configuration (dated 2026-07-09, all required `E2E_COMPANY_A_*`/`E2E_COMPANY_B_*`/`E2E_KORA_ADMIN_*` variable names present and non-empty — values not inspected). **This was not independently re-verified live** by B174-A.

**B174-A2 (docs reconciliation)** then updated the stale aggregate docs identified in §4a (`STATUS.md`, `GOLDEN_PATH.md`, `PILOT_SAAS_READINESS.md`, `PILOT_GOVERNANCE.md`, `PILOT_OPERATING_RUNBOOK.md`, `PILOT_REVIEW_PACKAGE.md`, `PILOT_PRIVACY_GOVERNANCE.md`, `PILOT_DEMO_SCRIPT.md`) and `tests/unit/pilot-governance-inventory.test.ts` so they no longer present the pre-2026-07-09 state as current fact, while preserving the caveat that none of this has been freshly re-checked. See `docs/PILOT_GOVERNANCE.md` §15a for the canonical reconciliation record.

**Still not live-reverified after B174-A2.** The recommended next step remains a fresh, operator-approved re-confirmation of the 2026-07-09 session before any of it is cited in a client-facing claim or used as the basis for demo-tightening validation (B174-C in §11 below).

---

## 1. Executive summary

This plan exists to answer one question: **is KORA ready to start B174 (demo tightening / eventual selective demo removal), and if not, what has to happen first?**

The short answer, established by `DEMO-DEP-RO` (2026-07-12) and the docs inspection performed for this plan:

- **B174 should not start as pure "demo removal."** `DEMO-DEP-RO` found KORA's demo architecture to be mostly well-isolated (two-way middleware wall, `tenant_kind`-based DB classification for OP-001, self-documenting post-mortem comments on prior demo-leak fixes). The one confirmed dangerous fallback (`/company/kora-index` silently substituting synthetic evidence data) has already been found and fixed (`DEMO-GUARD-01`, merged `a13a044`). There is no urgent privacy or correctness reason to delete demo routes or synthetic data right now. **Demo tightening and live-path validation is the safer immediate objective — full demo removal is a later, separate decision.**
- **Company B is the load-bearing prerequisite for proving B174 readiness** — not because demo depends on it, but because the only credible way to confirm "the live path works with zero reliance on demo/OP-001 data" is to exercise it against a second real tenant, and because `A03`/`A04`/`T01`/`T02`/`GD01` (the tests that would prove this) all require Company B to exist.
- **However — and this is the central finding of this planning pass — the repo's own docs disagree with each other about whether Company B already exists.** Two specific, detailed, dated live-validation records (`docs/E2E_TWO_TENANT_ISOLATION.md`, `docs/E2E_GOLDEN_PATH.md`) state that a Company B tenant (referred to as `STAGE-001` / `COMPANY_B` in test env-var naming) was provisioned in staging and that `A02`, `A03`, `A04`, `T01`, `T02`, and `GD01` all ran live and passed on **2026-07-09**. Four other docs (`docs/STATUS.md`, `docs/GOLDEN_PATH.md`, `docs/PILOT_SAAS_READINESS.md`, most of `docs/PILOT_GOVERNANCE.md`) still say Company B does not exist and that these tests are blocked — and were never updated after 2026-07-09. See §4a below for the full comparison.
- **This plan does not resolve that conflict.** Resolving it requires either an operator confirming which account of reality is correct, or a read-only reconciliation pass that inspects test env-var configuration and doc history more closely than this planning session's scope allows (no Supabase access, no live query, no GD01 run). **The recommended next task is therefore `B174-A — Company B State Reconciliation, Read-Only`**, not a provisioning task and not a "proceed to demo tightening" task — because both of those would be premature until the conflict is resolved.
- **Full demo removal remains explicitly out of scope** for this plan and for the recommended next task. Nothing here proposes deleting `/demo/*`, `data/synthetic/*`, or any demo service.

---

## 2. Current completed prerequisites

| Item | Risk it reduced |
|---|---|
| `LABEL-SWEEP-01` | Cleaned company-facing canonical labels (component field naming, demo/`production_ready` wording) that could otherwise mislead a reviewer or client about what is live vs. synthetic. |
| `B172-RO` (credential audit) | Established that no Supabase key has ever been committed to git history, and identified the one real remaining risk (a Production `service_role` key at rest in an untracked local backup file) as a scoped, operator-only follow-up rather than an unknown unknown. |
| `B173-RO` + `B173-FIX-01` | Audited and then guarded proposed-migration numbering, reducing the risk of a future migration ID collision or ordering mistake before Gate 2 SQL work resumes. |
| `DEMO-DEP-RO` | Produced the first full-repo inventory of demo routes, demo data, demo guards, and demo fallbacks — without this, B174 would have had no evidence base at all, and the dangerous fallback below would not have been found. |
| `DEMO-GUARD-01` | Fixed the one confirmed dangerous fallback: `/company/kora-index` no longer substitutes `data/synthetic/ingestion-samples.json`-derived data for live Evidence Reliability Intelligence when the live-eligibility fetch is loading or fails. This was the single highest-risk finding of `DEMO-DEP-RO` and is now closed (merged `a13a044`). |
| `B175` | Fixed a narrow SSR/client hydration-mismatch risk on `/admin/companies/[companyId]` (`new Date().toLocaleDateString(...)` rendered at render time in a `'use client'` component). Unrelated to demo, but was found by the same audit pass and is now closed (merged `7586a53`). |

---

## 3. Current blockers

1. **Company B state is documentation-conflicted, not confirmed.** See §4a. This is the primary blocker to any further B174 planning that assumes a specific state as fact.
2. **No independently-verifiable, current-dated confirmation exists in this session's read-only scope.** This plan was written without touching Supabase, without running GD01, and without querying staging — by design, per hard rules. Whatever the true state is, it cannot be confirmed by reading docs alone with full confidence; it can only be narrowed down.
3. **`/my-kora` structural debt remains documented but is not an immediate B174 blocker.** Per `DEMO-MYKORA-RO` (this session) and `docs/PILOT_SAAS_READINESS.md` item 5: `/my-kora` (PREVIEW route tree) and `/worker` (LIVE route tree) remain unmerged, tracked as a separate future-sprint decision. It does not block B174 because it has no code-level relationship to company-facing demo data paths.
4. **B172 Production `service_role` key cleanup remains a manual, operator-only task.** Tracked in `docs/issue-drafts/b172-production-service-role-cleanup.md`. Not a B174 blocker directly, but relevant to overall pilot/security readiness and should not be silently forgotten while B174 work proceeds.
5. **Credential cleanup (staging Auth password rotation) is explicitly deferred**, per `docs/PILOT_GOVERNANCE.md` §15 — recorded as planned, not executed, and explicitly gated on the "final validation sequence" being complete. Whether that gate is actually reached depends on resolving §4a.
6. **No authenticated E2E has ever run against Production** (as distinct from staging) for any of `A01`–`A04`/`G01`/`G02`/`GD01`/`T01`/`T02`, regardless of how §4a resolves. This remains an open gap either way.
7. **Gate 2 status line in `CLAUDE.md`** ("OPEN, blocks SQL") is stale relative to `docs/GATE2_STATUS.md` ("CLOSED WITH CONDITIONS") — a pre-existing, separately-tracked documentation drift item, not created by this plan, listed here only because it is the same *class* of problem as §4a (aggregator doc not reconciled after a source-of-truth doc changed).

---

## 4a. Company B evidence conflict

This is the central finding of this planning pass. Two groups of docs disagree.

### Group A — specific, dated, detailed live-validation records (more recent, more specific)

| Doc | Claim |
|---|---|
| `docs/E2E_TWO_TENANT_ISOLATION.md` | Banner: *"as of 2026-07-09, COMPANY_B has been provisioned in staging and `T01`/`T02` have been run live and passed."* Contains a dated validation log with a per-test pass table: `A01`, `A02`, `A03`, `A04`, `T01`, `T02` — all **passed**, run against a Vercel staging remote with real credentials, explicitly scoped as "not a Production validation." |
| `docs/E2E_GOLDEN_PATH.md` | Banner: *"as of 2026-07-09, `GD01` has been run live against staging, with explicit founder approval, and passed."* Contains a dated, step-by-step validated pipeline log (login → upload → UEF → scoring → KORA Index → Decision Pack → COMPANY_ADMIN visibility → privacy smoke), an exact Playwright command, and an explicit "data mutation note" stating new rows were created on the target staging tenant and not cleaned up. |
| `docs/QA_STATUS.md` (RLS-06 entries only) | Documents a live, local-Postgres-only RLS-06 run on 2026-07-09 with explicit founder approval, 11/11 passed, cross-referencing the same date and the same "final validation sequence" context as the two docs above. |

These three entries are internally consistent with each other (same date, same "explicit founder approval" framing, cross-referencing one another), specific (exact commands, pass/fail counts, durations, explicit "not claimed" disclaimers), and were already present on `main` before this session began (commit `2196eba`, confirmed via `git merge-base --is-ancestor 2196eba 2aff1b5` → ancestor of the pre-session `main` tip).

### Group B — aggregator/status docs that still say Company B does not exist (older, broader, never reconciled)

| Doc | Last-verified date | Claim |
|---|---|---|
| `docs/STATUS.md` | 2026-07-03 | *"COMPANY_B does not exist... this blocks A03 and A04."* |
| `docs/GOLDEN_PATH.md` | 2026-07-03 | *"A03 (COMPANY_B login) and A04 cannot run at all — COMPANY_B does not exist as a provisioned tenant/account."* Checkpoint table shows `A03`/`A04`/`T01`/`T02`/`GD01` all as **Blocked** or **Not run via fixture**. |
| `docs/PILOT_SAAS_READINESS.md` | 2026-07-04 | *"COMPANY_B doesn't exist — blocks any real two-tenant demonstration..."* listed as blocker #1 of 10, and as an explicit "must not be promised to clients yet" item. |
| `docs/PILOT_GOVERNANCE.md` §§1–14, §16 | 2026-07-06 (not updated after) | §6's scaffold table lists `A02`–`A04`, `GD01`, `T01`/`T02` as "never executed" / "blocked by COMPANY_B absence." §10: *"COMPANY_B does not exist."* §16 "Final validation sequence" is written in future tense ("not yet executed — this is the intended order"). **§15 of the same document**, added 2026-07-09, says the opposite in passing ("`A02`, COMPANY_B provisioning, `A03`/`A04`, `T01`/`T02`, `GD01`... are all complete per this doc's own entries above") — an internal contradiction within one file that was itself never resolved. |
| `docs/QA_STATUS.md` (non-RLS-06 lines) | mixed | Lines elsewhere in the same file (e.g. "COMPANY_B is not just untested, it doesn't exist yet," "COMPANY_B provisioning, then A03/A04") were not updated to match that same file's own RLS-06 entries three lines away. |
| `docs/CHANGELOG.md` | — | Still lists "COMPANY_B provisioning" as a "recommended next sprint" item with no later entry describing it as done. |

### What this plan concludes

- **Company B/`STAGE-001` appears to have been provisioned and live-validated in staging on 2026-07-09**, according to three specific, mutually-consistent, evidence-rich docs that were already merged to `main` before this session started.
- **This is not the same as independent confirmation.** No Supabase query, no GD01 run, and no operator statement has verified this within the scope of this planning session (by design — hard rules for this task forbid all three).
- **`docs/STATUS.md`, `docs/GOLDEN_PATH.md`, `docs/PILOT_SAAS_READINESS.md`, and most of `docs/PILOT_GOVERNANCE.md` are stale or self-contradictory on this specific point** and should not be read as the current source of truth for Company B's existence until reconciled.
- **This plan therefore treats Company B's existence as unconfirmed-but-documented-as-likely**, not as a settled fact and not as a settled absence. Every downstream section of this plan (§5 onward) is written to be correct under either outcome.

---

## 5. Company B minimum viable definition

This section applies **once Company B's actual state is confirmed** (see B174-A, §11). It is written now so that provisioning — if it turns out to still be needed — does not require re-deriving these requirements from scratch, and so that validation — if Company B turns out to already exist — has a checklist to confirm against.

Minimum viable Company B, for either "provision it" or "confirm what already exists" purposes:

- An `analytics.tenant` row with `tenant_kind = 'LIVE'` (per migration 014 / B131's canonical classification — never `'DEMO'`, `'TEST'`, or `'SANDBOX'`).
- A canonical tenant identifier distinct from `STAGE-001`/`COMPANY_A`'s code (test env-var convention already reserves `E2E_COMPANY_B_TENANT_CODE` for this).
- One `COMPANY_ADMIN` account, provisioned via `POST /api/admin/companies/provision` (per `docs/ACCESS_PROVISIONING_DOCTRINE.md` — no self-signup, KORA_ADMIN-provisioned only), bound to Company B's tenant via `app_metadata`.
- At least one `WORKER` account **only if** worker-facing validation is in scope for this round (it is not strictly required to prove company-side tenant isolation).
- A `PARTNER` account **only if** cross-role validation is explicitly in scope — not required for `A03`/`A04`/`T01`/`T02`/`GD01`.
- `production_ready` set **deliberately**, not left at an accidental default — per `app/company/contribution/page.tsx`'s existing gate, `production_ready=false` shows a clearly-labeled Foundation Light preview (Category C, safe), so either value is usable for validation as long as it is a deliberate choice, not an oversight.
- Enough live-like UEF/scoring/Decision Pack data to exercise **both** the "no data yet" (`NoDataState`) and "has data" paths on company pages — this is exactly what `GD01` already does if it is (re-)run against Company B: it creates a real `source_batch` → UEF → `kora_index_result` → Decision Pack chain end-to-end.
- **No dependence on OP-001 or `data/synthetic/*`** — Company B's data, however it is produced, must come from the live pipeline (real upload + real scoring), not a synthetic seed file.

---

## 6. Data requirements

- **Minimum dataset:** one uploaded batch via the golden-path fixture pattern (`data/golden-path/kora_golden_path_upload.csv` is explicitly designed for this — it is not tied to OP-001/demo and is meant for real-tenant upload testing, per `DEMO-DEP-RO`'s data inventory).
- **UEF upload requirements:** at least one dry-run-validated, accepted `source_batch`; enough rows to generate a non-trivial number of UEF candidates for the bulk-approval step.
- **Scoring requirements:** at least one scoring run producing a non-empty KORA Index value, a Confidence Score, and an Activation Safeguard status (CLEAR/WARNING/FLAGGED) — exactly what `GD01` already asserts.
- **Decision Pack requirements:** at least one generated HTML preview showing the canonical, non-suppressible labels (`KORA Foundation Light`, `KORA Index v1.0`, `pre_empirical_calibration`); PDF generation may fall back to the documented `501` response depending on environment — both are acceptable per `GD01`'s own design.
- **Company pages to validate:** `/company/workspace`, `/company/kora-index` (the page fixed by `DEMO-GUARD-01` — this is the single most important page to re-validate against Company B, since it is the one page previously proven to have a synthetic-fallback risk), `/company/activation`, `/company/pillars`, `/company/financial`, `/company/reports`.
- **Worker pages to validate:** only if a Company B `WORKER` account is provisioned — `/worker/login`, `/worker/workspace`. Not required for the core Company B tenant-isolation proof.
- **Partner pages to validate:** not applicable unless a Company B `PARTNER` account is explicitly provisioned — out of scope by default.
- **What can remain empty:** `/company/opportunities`, `/company/contribution` (already has a labeled preview path for `production_ready=false`), `/company/data/upload` beyond the one golden-path batch, and any worker/partner surface not explicitly provisioned.

---

## 7. Validation requirements

What must pass, once Company B's state is confirmed (whether newly provisioned or already existing):

- `GD01` (or, if already run per §4a, a **re-run** to produce a fresh, current-dated confirmation rather than relying solely on the 2026-07-09 record) — full data-bearing golden path.
- `A03`/`A04` (COMPANY_B login, tenant separation) — same re-run consideration.
- `T01`/`T02` (two-tenant isolation via `/api/company/workspace`) — same re-run consideration.
- Company workspace (`/company/workspace`) reachable and tenant-scoped for Company B.
- `/company/kora-index` — specifically re-verified to show **no** synthetic fallback for Company B (this is the direct regression check for `DEMO-GUARD-01`'s fix, on a tenant other than the one it was originally fixed against).
- `/company/activation`, `/company/pillars`, `/company/financial`, `/company/reports` — reachable, live-only, no demo fallback (per `DEMO-DEP-RO`'s existing findings, these already have no demo branch — Company B validation would be a confirmation, not a new build).
- Worker login/workspace — only if a Company B worker account exists.
- Partner workspace — only if a Company B partner account exists.
- **No synthetic fallback observed anywhere in the above.** This is the actual point of the exercise: proving the live path works correctly on a *second* tenant, independent of whatever demo/OP-001 data exists elsewhere in the system.

---

## 8. B174 safe sequence

1. **Step 1 — Reconcile Company B's actual state (read-only).** Do not provision anything until this is resolved. See B174-A, §11.
2. **Step 2 — Depending on Step 1's outcome:**
   - **If confirmed existing:** run (or re-run) live-like validation against the existing Company B/`STAGE-001` tenant in staging only, never Production, under the same explicit-approval discipline already established in this repo (`docs/PILOT_GOVERNANCE.md` §16, §15's approval-sentence pattern).
   - **If confirmed absent:** provision Company B in staging only, following §5's minimum viable definition, under the same explicit-approval discipline.
3. **Step 3 — Confirm demo islands are isolated.** Re-run (or spot-check) the `DEMO-DEP-RO` findings that are still relevant: middleware two-way wall, `tenant_kind`-based OP-001 classification, `/demo/partner` isolation. This is a low-cost confirmation, not new work — `DEMO-DEP-RO` already did the heavy lifting.
4. **Step 4 — Tighten any remaining dangerous or ambiguous demo fallbacks.** The one confirmed instance (`/company/kora-index`) is already fixed (`DEMO-GUARD-01`). This step is a final sweep, not an expected-to-find-more step.
5. **Step 5 — Keep `/demo/*` as a marketing/pilot-preview island** unless a specific, documented reason to remove a specific route emerges. No blanket removal.
6. **Step 6 — Update docs/tests** to reflect the reconciled Company B state (§4a) across `STATUS.md`, `GOLDEN_PATH.md`, `PILOT_SAAS_READINESS.md`, and `PILOT_GOVERNANCE.md` — this closes the documentation-drift problem that made this plan necessary in the first place.
7. **Step 7 — Only then consider removal of obsolete demo routes/data**, and only if a specific route or dataset is shown to have zero remaining use (test-only, doc-only, or genuinely dead), following the same Category A–F risk classification `DEMO-DEP-RO` already established.

**No demo removal happens before Step 1 and Step 2 are complete and validated, in either state.**

---

## 9. What NOT to remove yet

- `/demo/*` — the marketing/pilot-preview demo island. `DEMO-DEP-RO` found this well-isolated (two-way middleware wall) and useful for prospect-facing narrative. No reason to remove.
- `data/synthetic/*` — still used by demo/preview surfaces and by unit tests (`tests/unit/my-kora-foundation.test.ts` and others depend on `MyKoraPreviewService`, which reads from this data). Removing it would break tests, not just demo pages.
- `OP-001` — still used as the guarded golden-path regression fixture for the live pipeline (`lib/live/op001-synthetic-records.ts`), consistently classified via `tenant_kind='DEMO'` and explicitly rejected by every live-mutating endpoint. It is doing real, useful work as a fixture, not sitting around as leftover risk.
- `/my-kora/*` — until the separate route-tree merge/isolation decision (`docs/PILOT_SAAS_READINESS.md` item 5) is made. Out of scope for B174 entirely, per `DEMO-MYKORA-RO`.
- Any test that encodes a demo-boundary invariant — e.g. `tests/unit/b148-header-demo-controls.test.ts`, `b149-header-demo-guard.test.ts`, `b150-synthetic-data-banner-guard.test.ts`, `tests/integration/b168-5-p3-demo-gating.test.ts`, `tests/unit/b133-company-live-residual-cleanup.test.ts`, `tests/unit/demo-guard-01-kora-index-evidence-fallback.test.ts`. These are the tests actively protecting the live/demo boundary — removing demo without first understanding which tests assert what would risk silently deleting the guard along with the thing it guards.

---

## 10. Guardrails for future B174 execution

- No production Supabase access, ever, without explicit operator approval scoped to that specific action.
- No staging mutation without explicit operator approval — this repo's established precedent (see `docs/PILOT_GOVERNANCE.md` §15's approval-sentence pattern) is the model to follow, not a suggestion.
- No `service_role` or other secret value in prompts, chat, commits, PRs, or logs, at any point.
- No demo deletion before Company B's state is reconciled and, if needed, validated.
- No `GD01` run until credentials are confirmed available and Company B's state is settled — running it twice without need creates unnecessary data-mutation noise on the target tenant (per `GD01`'s own documented "no automatic cleanup" behavior).
- No silent fallback to synthetic data on any live route — this is the exact class of bug `DEMO-GUARD-01` fixed; any future B174 work should include an explicit regression check for this pattern, not just a manual read-through.
- No direct `main` pushes for code changes — every B174 code change should go through a branch, checks, and (per this repo's established pattern in this session) either a reviewed direct merge or a PR, never a direct push to `main`.

---

## 11. Proposed B174 task breakdown

### B174-A — Company B State Reconciliation, Read-Only

- **Goal:** Determine, from documentation and local, non-Supabase, non-network evidence only, what Company B/`STAGE-001` actually is, which validations (`A02`–`A04`, `T01`/`T02`, `GD01`, RLS-06) genuinely ran and passed, and which docs need updating as a result.
- **Scope:** Read `docs/E2E_TWO_TENANT_ISOLATION.md`, `docs/E2E_GOLDEN_PATH.md`, `docs/QA_STATUS.md`, `docs/PILOT_GOVERNANCE.md` in full. Inspect `.env.e2e.local.example`/`.env.local.example` for variable *names* only (never values) to confirm whether `E2E_COMPANY_B_*` variables are documented as expected to be set. Check git history/PR references (`#52`–`#57` and related) for corroborating commit messages and dates. Identify every doc line that contradicts the 2026-07-09 live-validation records.
- **Red lines:** No Supabase query of any kind (staging or Production). No GD01 run. No `.env` file read of *values*, only variable *names* if inspecting `.env.local.example`/`.env.e2e.local` structure (never `.env.staging.passwords.local` or any file with real values). No user creation. No doc rewrite beyond what this task itself proposes (i.e., produce a reconciliation report/patch, do not silently edit `STATUS.md` etc. without a review step).
- **Expected output:** A short reconciliation report (and, if the operator approves, a follow-up docs-update task) stating definitively, to the extent the evidence allows: (a) whether Company B/`STAGE-001` is real and current, (b) which of `STATUS.md`/`GOLDEN_PATH.md`/`PILOT_SAAS_READINESS.md`/`PILOT_GOVERNANCE.md` need which specific line-level corrections, and (c) whether a live re-confirmation (an actual GD01/A03/A04 re-run, requiring explicit operator approval) is still recommended even if the docs are trusted, simply because the last run is now several days old and mutated tenant state.
- **Mutating or read-only:** Read-only.

### B174-B — Company B Staging Provisioning (conditional — only if B174-A concludes Company B does not exist or is unusable)

- **Goal:** Provision a minimum-viable Company B tenant in staging per §5, under explicit operator approval.
- **Scope:** `POST /api/admin/companies/provision` (KORA_ADMIN-only, existing route — no new code required per `docs/E2E_TWO_TENANT_ISOLATION.md`'s own note that this route already supports it), followed by one `COMPANY_ADMIN` account provisioning.
- **Red lines:** Staging only, never Production. Requires the same explicit-approval-sentence discipline as `docs/PILOT_GOVERNANCE.md` §15. No value of any credential printed anywhere.
- **Expected output:** A confirmed Company B tenant + admin account in staging, documented (booleans/dates only, no secret values) in the relevant status docs.
- **Mutating or read-only:** Mutating (staging Supabase Auth + DB writes) — requires explicit operator approval before execution.

### B174-C — GD01/A03/A04/T01/T02 Live-Like Validation (conditional — run regardless of B174-A/B174-B outcome, as a fresh confirmation)

- **Goal:** Produce a current, fresh, explicitly-approved live validation run against Company B (whether newly provisioned in B174-B or confirmed existing in B174-A), superseding the 2026-07-09 record with an up-to-date one.
- **Scope:** Run `GD01`, `A03`/`A04`, `T01`/`T02` per their existing documented commands (`docs/E2E_GOLDEN_PATH.md`, `docs/E2E_TWO_TENANT_ISOLATION.md`) against staging only.
- **Red lines:** Staging only. Requires `E2E_GOLDEN_DATA_BEARING_ALLOW_RUN=true` explicit opt-in for `GD01` specifically (mutates real tenant data — expected and documented, not a bug). Requires explicit operator approval before execution, per this repo's established precedent.
- **Expected output:** An updated, dated validation-log entry in the relevant docs, and specific re-confirmation that `/company/kora-index` shows no synthetic fallback on Company B (direct regression check for `DEMO-GUARD-01`).
- **Mutating or read-only:** Mutating (creates real `source_batch`/UEF/`kora_index_result`/Decision Pack rows on the target tenant) — requires explicit operator approval before execution.

### B174-D — Demo Fallback Tightening

- **Goal:** Final sweep for any remaining ambiguous or dangerous demo fallback beyond the one already fixed in `DEMO-GUARD-01`.
- **Scope:** Re-run the `DEMO-DEP-RO` search patterns (guards/fallback logic, §4 of that audit) against current `main`, focused on any code changed since that audit. Spot-check `services/submission-feedback/SubmissionFeedbackService.ts` (flagged as an orphaned mock service with a latent per-company data-integrity bug, currently unreachable from any route — confirm it is still unreachable).
- **Red lines:** Read-only unless a new dangerous fallback is found, in which case it becomes its own scoped fix task (branch, tests, checks, commit, push — never a direct `main` edit), matching the `DEMO-GUARD-01` pattern.
- **Expected output:** Either "no new findings" or a scoped follow-up fix task, same shape as `DEMO-GUARD-01`.
- **Mutating or read-only:** Read-only by default; becomes mutating only if a new fix is scoped and separately approved.

### B174-E — Docs/Tests Update

- **Goal:** Reconcile `STATUS.md`, `GOLDEN_PATH.md`, `PILOT_SAAS_READINESS.md`, and `PILOT_GOVERNANCE.md` to reflect B174-A/B174-B/B174-C's actual outcome, closing the documentation-drift problem identified in §4a.
- **Scope:** Docs-only changes, same discipline as this plan (branch, no code, no Supabase).
- **Red lines:** Do not delete the specific, detailed live-validation records (`E2E_TWO_TENANT_ISOLATION.md`, `E2E_GOLDEN_PATH.md`) — they are the most valuable evidence in the repo on this topic. Update the *aggregator* docs to point to them, don't overwrite the source records.
- **Expected output:** A consistent, non-contradictory set of status docs.
- **Mutating or read-only:** Docs-only, non-Supabase — same risk class as this plan itself.

### B174-F — Optional Demo Route/Data Removal (only if still justified after B174-A through E)

- **Goal:** Remove any demo route or dataset shown, after all of the above, to have zero remaining use.
- **Scope:** To be defined per-item, using `DEMO-DEP-RO`'s Category A–F classification as the starting risk assessment.
- **Red lines:** Full hard-rule set from `DEMO-DEP-RO`/`DEMO-MYKORA-RO`/`DEMO-GUARD-01` applies unchanged. No removal without a specific, documented justification per item — no blanket sweep.
- **Expected output:** Not scoped in detail here — deliberately deferred, since §1 concludes full removal is not the current objective.
- **Mutating or read-only:** Mutating (code/data deletion) — lowest priority, most conditional task in this breakdown, and the only one this plan actively recommends *not* scheduling yet.

---

## 12. Decision table

| Item | Keep | Tighten | Remove later | Blocked by | Notes |
|---|---|---|---|---|---|
| `/demo/*` | ✓ | — | — | — | Well-isolated marketing/pilot-preview island per `DEMO-DEP-RO`. No removal case. |
| `/admin/demo/*` (e.g. `acme-001`) | ✓ | — | — | — | Admin-only, static synthetic, no live DB queries per its own file header. |
| `OP-001` | ✓ | — | — | — | Guarded golden-path regression fixture, DB-classified via `tenant_kind='DEMO'`, explicitly rejected by every live-mutating endpoint. Doing real work. |
| `data/synthetic/*` | ✓ | — | — | — | Backs demo/preview surfaces and unit tests directly. Removing breaks tests, not just pages. |
| `/my-kora/*` | ✓ | — | (future, separate decision) | `/my-kora` vs `/worker` route-tree merge decision | Out of B174 scope per `DEMO-MYKORA-RO`. |
| `/company/kora-index` | ✓ | — (already tightened) | — | — | Dangerous fallback fixed in `DEMO-GUARD-01` (merged `a13a044`). Re-verify against Company B once B174-C runs. |
| `reportGeneratorService` | ✓ | — | (candidate, low priority) | B174-D confirmation it's still unreachable | Fully synthetic/demo-only, zero live callers, actively guarded by `tests/unit/b130-reports.test.ts`. Safe as-is; removal would be cleanup, not risk reduction. |
| `SubmissionFeedbackService` | — | ✓ | (candidate) | B174-D spot-check | Orphaned, currently unreachable, but contains a latent per-company data-integrity bug (`getDemoFeedback` returns Meridiana's numbers for any company). Should be fixed or removed before anyone wires it into a live component — tighten, don't leave as a landmine. |
| `production_ready` preview paths (e.g. `/company/contribution`) | ✓ | — | — | — | Legitimate per-tenant lifecycle gate, not demo-specific. Applies the same way to Company B. |
| Company B | — | — | — | **B174-A reconciliation** | State is documentation-conflicted (§4a). Cannot be marked "keep" or scheduled for provisioning until reconciled. |
| `GD01`/`A03`/`A04`/`T01`/`T02` | — | — | — | **B174-A reconciliation, then B174-C fresh run** | Documented as passed 2026-07-09, but that record is several days old, unverified within this session's scope, and the aggregator docs disagree. Needs reconciliation before being cited as current proof. |

---

## 13. Recommended next step

**B174-A — read-only Company B state reconciliation and stale-doc cleanup plan.**

This is the only responsible next step given §4a. Provisioning Company B (B174-B) would be wasted or actively confusing work if it already exists. Proceeding straight to demo tightening validation (B174-C) would cite a live-validation record that may be stale. A manual review (the "stop and manually decide" option) is not needed yet — the evidence, while conflicting, is specific enough that a bounded, read-only reconciliation pass has a good chance of resolving it without operator involvement beyond a final confirmation read.

No demo removal is recommended at this time, under either resolution of §4a.

---

**Document version:** v1.0
**Created:** 2026-07-12 (B174-PLAN-01)
**Related:** `docs/STATUS.md`, `docs/GOLDEN_PATH.md`, `docs/PILOT_SAAS_READINESS.md`, `docs/PILOT_GOVERNANCE.md`, `docs/E2E_TWO_TENANT_ISOLATION.md`, `docs/E2E_GOLDEN_PATH.md`, `docs/QA_STATUS.md`, `docs/ACCESS_PROVISIONING_DOCTRINE.md`, `docs/issue-drafts/b172-production-service-role-cleanup.md`
