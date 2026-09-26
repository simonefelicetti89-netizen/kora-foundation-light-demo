# 267 — `KORA-WP-138` — AUTHENTICATED RUNTIME ENVIRONMENT — EXACT-SHA CI AND FINAL COMPLETION

**Date:** 2026-09-25 · **Status:** **COMPLETE** · **Closes:** `OBS-02`
**Product SHA:** `ac91cfa31e0bcad85071d467c9a5611a4668c29b` · **Parent:** `6bc22f5bae93270527b12f5b9d15b7997098db75`

> **WP-138 COMPLETE.** Acceptance (A)–(I) all PASS. Exact-SHA canonical CI proven on a raw pushed ref.
> **No migration, no schema change, no RLS change, no backfill, no new persistence. Production never contacted.**

---

## 1. `OBS-02` — WHAT WAS WRONG

`lib/demo-state` initialised `activeEnvironment` to `'demo'`, and `shouldShowDemoControls()` grants the environment
switcher **only** to an unauthenticated visitor or `KORA_ADMIN`. A real `COMPANY_ADMIN` therefore had **no path to
`'live'`**. `useScoringResult` read that raw value and took the demo branch, which returns `insufficient_data`
**synchronously without ever querying the database** — while `SyntheticDataBanner`, already applying the correct rule,
displayed **LIVE**. Four canonical Company surfaces rendered an empty state regardless of real data.

The regression dates to **B147 P1 (`cefc584`, 2026-06-14)**, which removed `forceEnvironment: 'live'` from
`activation`/`financial`/`pillars`/`reports` as *"dual-path-era signals"* while correctly keeping it on `kora-index`
as *"il fetch gate"*. Its stated justification — *"Server layout `requireCompanyUser` is the guard"* — was wrong:
that is a **server** auth guard and never touches client demo-state.

## 2. ARCHITECTURE — fixed centrally, not per page

One pure resolver, `resolveEffectiveEnvironment(realRole, activeEnvironment)`, in
`lib/demo-state/demo-controls-guard.ts`, following the `reconcileActiveRole` (ROLE-SWITCHER-02) precedent that solved
the identical defect class for `activeRole`. **Environment is DERIVED, never mutated** — `activeEnvironment` remains
the operator's preview preference, so reconciliation cannot silently overwrite a `KORA_ADMIN` switcher choice and
hydration order is not load-bearing. `resolveBannerEnvironment` now **delegates** to it, so chrome and scoring resolve
through one implementation and cannot disagree. A still-resolving session **fails safe toward live**, because the demo
branch resolves synchronously and would paint an empty state first.

**Six files changed**: `lib/demo-state/{index,demo-controls-guard}.ts`, `lib/scoring-result/index.ts`,
`app/company/kora-index/page.tsx`, `tests/unit/live-session.test.ts`, plus the new WP-138 suite.
**The four affected pages were not touched** — they are correct because the shared invariant is correct, which is
acceptance (H) demonstrated rather than waived.

`kora-index`'s `forceEnvironment` override was **removed**: it was the only reason that surface escaped `OBS-02`, so
retaining it would mask a regression instead of exercising the invariant. **The `forceEnvironment` API is kept** —
still legitimate for `KORA_ADMIN` preview and test contexts.

B147's assertion was **superseded, not deleted**: it remains as a cleanliness proxy with its rationale corrected
inline, and the architectural invariant it stood in for is now asserted directly.

## 3. EXACT-SHA CANONICAL CI — **PASS**

`workflow_dispatch` proved untriggerable: the default branch `main` (`70c4cfa`) does not declare that trigger, and
GitHub only exposes it for workflows present on the default branch. A PR was rejected as the evidence route because
`pull_request` may test a synthetic merge ref. A temporary `integration/**` proof branch was therefore used, following
existing repository precedent, so the **raw candidate SHA** would be tested by the canonical push workflow while the
canonical integration branch stayed untouched.

| Property | Value |
|---|---|
| Workflow | **KORA CI #327** |
| Run | **`36066886221`** · event **`push`** |
| Branch | `integration/wp138-ci-proof-2026-09-25` — ref pointed directly at the candidate, 0 commits ahead |
| Head SHA | **`ac91cfa31e0bcad85071d467c9a5611a4668c29b`** — raw, not a merge ref |
| Attempt | **2** (failed-job rerun) · **conclusion SUCCESS** |

**Mandatory jobs, all green on attempt 2:** TypeScript/tests/build/lint (blocking) · **DB-backed gate — RLS-03/05/06 +
KORA Link behavioral suite** · E2E smoke · E2E golden path. Every job reports `head_sha=ac91cfa…`.

### 3.1 Attempt 1 — classified conservatively, **not** a Product regression

Attempt 1 failed one mandatory job at step 12, *"Run previously-unenforced DB-gated suites (R0-A)"*. All 25 RLS suites
passed with 0 skipped. **The failure did not reproduce on the failed-job rerun, and no Product mutation occurred
between attempts** — the proof branch and feature branch both still resolve to `ac91cfa…`, the identical SHA tested on
both attempts. **No Product fix was required.**

Four independent grounds establish it was not attributable to this package: WP-138's six changed files are imported by
**none** of the six gated suites (verified by grep for `demo-state` and `scoring-result`); the parent `6bc22f5` passed
this identical job; all RLS suites passed; and the six gated suites were reproduced locally at exactly `ac91cfa`
against a fresh local Supabase stack — **6 files, 186 tests, 0 failures**, twice.

**Recorded honestly: the precise cause of attempt 1 remains undetermined.** An attempt to reproduce CI's ordering
(RLS suites then gated suites on one database) was **invalid** — invented env-var names meant 292 of 329 RLS tests
skipped and no database state was created, so the inter-suite state-collision hypothesis was never tested. The
artifact `db-backed-gate-reports` and the job logs required authentication unavailable to the executing session.
**"Did not reproduce" is the claim; "transient" is not asserted as proven.**

## 4. RUNTIME EVIDENCE — exact SHA, staging only

Preview **`dpl_3ziezBgeoHQjxyh8FeP7XjY6gnzB`**, `target: null` (Preview), `state: READY`, `githubCommitSha`
`ac91cfa…`. Client bundle bound to **`haqflkurpmeaxpikozjl`** (staging). **Production `azdnepfmwrmacruykskm` was never
contacted.** Synthetic tenant `STAGE-002`, period `2026-Q1`.

| Surface | Runtime result |
|---|---|
| `/company/reports` | `DECISION PACK · LIVE` · **33.35** · Confidence **63%** · Safeguard **Clear** — the `OBS-02` empty state is gone |
| `/company/activation` | `· LIVE` · **CLEAR · AR 100% · MAR 68%** — matches persisted `activation_rate 1` / `meaningful 0.68` |
| `/company/pillars` | `PILLAR INTELLIGENCE · LIVE · 2026-Q1` |
| `/company/financial` | **BTI™ SCORE LIVE 53/100** |
| `/company/kora-index` | index and Confidence intact **after the override removal** |

All five: HTTP 200, **zero 4xx/5xx document responses, zero uncaught page errors**.

## 5. ACCEPTANCE (A)–(I)

| | Requirement | Result |
|---|---|---|
| A | `COMPANY_ADMIN` can never resolve `demo` | **PASS** — resolver tests across all raw values |
| B | One canonical environment rule | **PASS** — banner delegates; scoring consumes; asserted |
| C | Four surfaces consume live scoring | **PASS** — runtime values match persistence |
| D | `kora-index` remains correct | **PASS** — after override removal |
| E | Chrome and scoring cannot disagree | **PASS** — single implementation, proven at runtime |
| F | Unauthenticated / `KORA_ADMIN` preserved | **PASS** — resolver agrees with `shouldShowDemoControls` |
| G | One Product / No Demo Runtime restored | **PASS** — demo branch unreachable for real users |
| H | No per-page patchwork | **PASS** — the four pages are untouched |
| I | Visual regression | **PASS — FUNCTIONAL SCOPE ONLY, see §6** |

**Tests:** new 17-test WP-138 suite including mutation proof that both the pre-WP-138 behaviour **and** a naive
always-live resolver fail the invariants. Full unit suite **432 files / 13,753 passed / 0 failures**. `tsc` clean,
`eslint` clean, `git diff --check` clean.

## 6. VISUAL ACCEPTANCE — SCOPE, STATED EXPLICITLY

| Statement | Value |
|---|---|
| **WP-138 FUNCTIONAL VISUAL REGRESSION** | **PASS** — 9 captures at 1440 and 375 across the five surfaces at SHA `ac91cfa…` on Preview `dpl_3ziezBgeoHQjxyh8FeP7XjY6gnzB`: no broken layout, no clipping preventing use, no contradictory DEMO/LIVE presentation, no regression caused by the runtime fix |
| **CURRENT FINAL PRODUCT EXPERIENCE** | **REJECTED BY FOUNDER** |
| **BENCHMARK V2 FOUNDER VISUAL ACCEPTANCE** | **NOT GRANTED BY THIS PACKAGE** |

**This report does not state or imply that the Founder approves the current Company UI.** Final Product Experience is
governed by Benchmark V2 (Section AN) and `KORA-WP-139`–`143` with amended `126`–`131`. The capture files were purged
after metadata extraction because they contained the synthetic test-account email; they were never committed and are
re-capturable from the Preview.

## 7. DATA / MIGRATION / RLS

**Migration NONE · Schema NONE · RLS NONE · Backfill NONE · New persistence NONE.** The diff contains **0** `.sql` or
migration files. Environment selection is **data-source selection, never authorization**: no tenant widening, no
membership change, no `requireCompanyUser` bypass, no service-role or Supabase authorization change. **Client
environment state did not become an auth boundary.**

## 8. ROLLBACK

Client runtime resolution only. Reversible boundary: the resolver module plus its two consumers. Revert the
implementation commit; **no schema, data, migration or auth to roll back.**

## 9. REGISTRY IMPACT

**`KORA-WP-138` READY → COMPLETE.** Derived, not fitted: **COMPLETE 65 · READY 36 · BLOCKED 43 · TOTAL 144**;
**225 hard edges, 5 conditional, 4 triggers, 0 cycles — all unchanged.** `138` is a DAG root with **no dependents**,
so nothing is mechanically unblocked and no other package moves. `INV-08` **PASS**.

**PX collision overlay: SATISFIED.** Company Product Experience migration on the five surfaces is no longer blocked.
The proof branch `integration/wp138-ci-proof-2026-09-25` is retained as **historical exact-SHA CI evidence**; no
further execution depends on it.

## 10. GATES

Controlled Pilot **CLOSED/VALID, unchanged** · Paid External Pilot still requires Gate 3, `F-12`, `134`, `131`,
`R0-D` — **`138` closing removes one of its requirements, it does not satisfy the gate** · Production unmet ·
Gate 3, Gate 5, `F-12`, `TRUST-04` untouched · `main` `70c4cfa` untouched.

**END OF 267**
