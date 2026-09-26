# 251 — KORA · CANONICAL GITHUB CI FULL-GREEN PROOF AND R0-C READINESS

**Date:** 2026-09-22
**Mode:** REMOTE CI PROOF — NO MERGE, NO PR, NO DEPLOYMENT
**Predecessors:** `244`–`247` (R0-A) · `248` (classification) · `249` (implementation) · `250` (approval + commit)
**Outcome:** **CANONICAL WORKFLOW FULLY GREEN ON THE GENUINE RUNNER.**
**R0-C remote-CI precondition: SATISFIED.** R0-C itself remains `R0_OPEN`.

---

## §1 — COMMIT LINEAGE PROVEN

| Stage | SHA | Report |
|---|---|---|
| R0-A CI real-DB enforcement | `ec0ff4546fdf8bc06f3b76e59f66a1b4ebaa1528` | 244 / 245 |
| Shallow-clone assertion remediation | `d578c1d029b52301e9931a0076a305e92f4a30fb` | 246 / 247 |
| **Playwright golden-path remediation** | **`cac13b218ff99c3373f92439994aa4749934a2b1`** | 248 / 249 / 250 |

`cac13b2`'s parent is `d578c1d`; neither `d578c1d` nor `ec0ff454` was amended.

---

## §2 — THE RUN

| Field | Value |
|---|---|
| Workflow | **KORA CI** |
| Run ID | **`35770205003`** (run number 324, attempt 1) |
| Event | `push` |
| Proof ref | `integration/r0a-ci-proof-2026-09-22` |
| **Exact tested head_sha** | **`cac13b218ff99c3373f92439994aa4749934a2b1`** |
| Status / conclusion | `completed` / **`success`** |
| Started → finished | 2026-09-22T18:53:40Z → 18:56:53Z (**3 m 13 s**) |
| URL | `https://github.com/simonefelicetti89-netizen/kora-foundation-light-demo/actions/runs/35770205003` |

The tested SHA is the remediation commit itself — **not `main`, not `d578c1d`, not a
synthetic merge SHA**. The push-trigger mechanism executes the workflow file contained
in the pushed commit, so no default-branch dependency is involved.

---

## §3 — JOB RESULTS (all four green)

### Job 1 — TypeScript, tests, build, lint (blocking) — **SUCCESS, 188 s**

| Step | Result |
|---|---|
| TypeScript check | **SUCCESS** 26 s |
| **Unit tests** | **SUCCESS** 43 s |
| Build | **SUCCESS** 54 s |
| Lint (blocking) | **SUCCESS** 39 s |

**Shallow-clone status: NO REGRESSION.** This job runs under `actions/checkout@v4`
(depth-1). Unit tests failed here at `ec0ff45` (42 s) with `fatal: bad object`, and
have passed at `d578c1d` (43 s) and now at `cac13b2` (43 s). The six repaired
history-dependent assertions in `kora-wp-066-saved-mappings.test.ts` and
`kora-wp-125-shared-product-experience-foundation.test.ts` executed shallow and passed.

### Job 2 — DB-backed gate — RLS-03/05/06 + KORA Link behavioral — **SUCCESS, 156 s**

| Step | Result |
|---|---|
| Check Docker availability (mandatory) | SUCCESS |
| Start local Supabase (every tracked migration fresh) | SUCCESS 94 s |
| Verify Postgres reachable | SUCCESS |
| Run RLS integration suites (RLS-03…24) | **SUCCESS** 5 s |
| **Assert 0 RLS tests skipped and 0 failed** | **SUCCESS** |
| Run previously-unenforced DB-gated suites (R0-A) | **SUCCESS** 4 s |
| **Assert 0 R0-A DB-gated tests skipped and 0 failed** | **SUCCESS** |
| DB-gate coverage summary | SUCCESS |
| KORA Link behavioral suite (C1-C10) | SUCCESS 2 s |

### Job 3 — E2E smoke (Playwright, public pages) — **SUCCESS, 65 s**
`Run Playwright public-page smoke suite` — **SUCCESS** 14 s.

### Job 4 — E2E golden path (Playwright, local Supabase, seeded) — **SUCCESS, 173 s**

| Step | Result |
|---|---|
| Start local Supabase (applies every migration fresh) | SUCCESS 99 s |
| Capture local Supabase URL/keys | SUCCESS |
| Seed golden-path fixtures (KORA_ADMIN, COMPANY_ADMIN, WORKER) | SUCCESS 2 s |
| Install Playwright Chromium | SUCCESS 19 s |
| **Run Playwright local golden-path suite** | **SUCCESS 14 s** |

**This is the remediation target.** Its history on the genuine runner:

| Commit | Result | Duration |
|---|---|---|
| `ec0ff454` | FAILURE | 35 s |
| `d578c1d0` | FAILURE | 33 s |
| **`cac13b21`** | **SUCCESS** | **14 s** |

---

## §4 — §8 THRESHOLDS: WHAT IS PROVEN, AND HOW

**Job logs are HTTP 403 unauthenticated** (as in report 247), so the printed
per-suite counters and the per-persona Playwright lines **were not read from the
runner**. No runner-observed number is asserted here that was not actually observed.
What the green run proves is stated with its mechanism:

| Threshold | Proven? | Mechanism |
|---|---|---|
| 0 unexpected skips (R0-A) | **YES** | `Assert 0 R0-A DB-gated tests skipped and 0 failed` **passed**; that step exits 1 if `numPendingTests !== 0`. |
| 0 failures (R0-A) | **YES** | same step exits 1 if `numFailedTests !== 0`. |
| R0-A suites actually executed | **YES** | same step exits 1 if `numTotalTests === 0`. |
| RLS gate green, 0 skipped, 0 failed | **YES** | `Assert 0 RLS tests skipped and 0 failed` **passed**, identical mechanism. |
| 32 discovered / 32 enforced | **YES (derived)** | The drift guard `tests/unit/r0a-db-gate-enforcement.test.ts` ran inside the passing Unit step and asserts every discovered `*_ALLOW_RUN` gate is CI-enforced or explicitly excluded, with `DELIBERATE_EXCLUSIONS` **empty by design**. Recomputed against the exact tested tree: **32 discovered · 32 CI-enforced · 0 unclassified**. The guard reads only committed files, so this computation is identical to the runner's. |
| 186 newly enforced assertions | **NOT RUNNER-READ** | The figure is documented in the drift guard's own header (six suites, 186 real database assertions). The run proves those six suites are wired and executed with 0 skips and 0 failures; it does not let me read back the literal count. |
| Playwright per-persona results | **NOT RUNNER-READ** | Not retrievable at 403. The suite as a whole is SUCCESS; the four personas were verified green locally (report 249) under the CI contract. |

**The local 4/4 result is not substituted for runner evidence anywhere above.**

---

## §5 — REFS

Expected changes only, both **strict fast-forwards, no force, no rebase, no merge**:

| Ref | Before | After |
|---|---|---|
| `r0/ci-real-db-enforcement-2026-09-22` | `d578c1d029…` | **`cac13b218…`** |
| `integration/r0a-ci-proof-2026-09-22` | `d578c1d029…` | **`cac13b218…`** |

Push output: `d578c1d..cac13b2` for both. Local `HEAD` == both remote refs.

**Protected refs — unchanged, verified before and after:**

| Ref | SHA (unchanged) |
|---|---|
| `main` | `70c4cfa0dfa36d8697d8f76a3a7df8a5bf530adc` |
| `release/kora-rc-2026-09-20` | `5f9426974791b6e2ff292aa7634860c4666bd91a` |
| `refs/pull/172/head` | `5f9426974791b6e2ff292aa7634860c4666bd91a` |
| `integration/kora-canonical-product-2026-09-22` | `3a383072b96290b44620566a242d22f0cc23b01a` |

Total remote refs: **383 before, 383 after.** No WP safety branch altered.

---

## §6 — GOVERNANCE CONSEQUENCE

| Item | State |
|---|---|
| R0-A | `R0_COMPLETE` |
| R0-B | `R0_COMPLETE` |
| R0-C | **`R0_OPEN`** — unchanged, deliberately |
| R0-D | `R0_OPEN` |
| **R0-C remote-CI precondition** | **SATISFIED** (was NOT SATISFIED) |

This run proves **readiness to begin R0-C**. It is not R0-C execution: no staging
validation was performed, and R0-C's own state is untouched. No WP graph change.

Temporary proof ref `integration/r0a-ci-proof-2026-09-22` is
**ELIGIBLE FOR RETIREMENT** but is **retained** pending separate Founder
authorisation for cleanup or canonical integration of these commits.

No PR created. No merge. No deployment. No contact with remote Supabase, Vercel,
staging or Production. `scripts/provision-next-review.mjs` never addressed.
