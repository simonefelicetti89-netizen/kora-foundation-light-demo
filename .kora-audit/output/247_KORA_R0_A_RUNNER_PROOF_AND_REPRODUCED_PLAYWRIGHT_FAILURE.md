# 247 — KORA — `R0-A` RUNNER PROOF + REPRODUCED PLAYWRIGHT FAILURE

**Date:** 2026-09-22
**Type:** CI evidence record. **NOT an `R0-A` completion proof and NOT a full-green record.**
**Run:** GitHub Actions **`35765864071`**, workflow **KORA CI**, event `push`
**Tested SHA:** **`d578c1d029b52301e9931a0076a305e92f4a30fb`**
**Overall workflow conclusion:** **FAILURE** — classification **B: R0-A green, unrelated Playwright red**

---

## 1. WHAT WAS PUBLISHED

| Ref | Before | After |
|---|---|---|
| `r0/ci-real-db-enforcement-2026-09-22` | `ec0ff454…` | **`d578c1d0…`** |
| `integration/r0a-ci-proof-2026-09-22` | `ec0ff454…` | **`d578c1d0…`** |

Both **fast-forward, no force** (`ec0ff45..d578c1d`), verified as ancestors beforehand. Local ==
remote == `d578c1d029b52301e9931a0076a305e92f4a30fb` for both.

Lineage confirmed before pushing: `d578c1d` → parent `ec0ff454` → grandparent `3a383072`. `d578c1d`
contains exactly the two test files and **no workflow file**; `ec0ff454` is unamended (tree
`6a300b7a830fceb4f9ee75728c2145e4ff35e133`, its original 2 files).

## 2. RESULT — PER JOB, RUN 1 → RUN 2

| Job | Run `35763067234` (ec0ff454) | Run `35765864071` (d578c1d) |
|---|---|---|
| **TypeScript, tests, build, lint (blocking)** | **failure** 97s | **SUCCESS** 189s |
| ├ TypeScript check | success 26s | **success 27s** |
| ├ **Unit tests** | **failure 42s** | **SUCCESS 43s** |
| ├ Build | skipped | **SUCCESS 54s** |
| └ Lint (blocking) | skipped | **SUCCESS 38s** |
| **DB-backed gate (Docker/Supabase, mandatory)** | success 196s | **SUCCESS 152s** |
| ├ Start Supabase (all migrations fresh) | success 121s | success 94s |
| ├ RLS integration suites | success 4s | **success 5s** |
| ├ Assert 0 RLS skipped / 0 failed | success | **success** |
| ├ **R0-A previously-unenforced DB suites** | success 3s | **SUCCESS 4s** |
| ├ **Assert 0 R0-A skipped / 0 failed** | success | **SUCCESS** |
| └ DB-gate coverage summary | success 1s | **success 0s** |
| **E2E smoke (public pages)** | success 65s | **SUCCESS 53s** |
| **E2E golden path (Playwright, seeded)** | **failure 216s** | **FAILURE 212s** |

## 3. THE SHALLOW-CLONE DEFECT IS CLOSED

`Unit tests` moved **failure → SUCCESS** on the real runner, and the two jobs it previously blocked
(`Build`, `Lint`) now run and pass. No `fatal: bad object`, no historical-SHA collection failure.

The six repaired assertions — WP-066 ×2, WP-125 ×4 — executed on a depth-1 checkout and passed. This
is the runner confirmation of what report `246` demonstrated in a local depth-1 clone.

**`d578c1d` changed only two test files and no workflow**, so the improvement is attributable to the
remediation and nothing else.

## 4. `R0-A` REAL-DB ENFORCEMENT — CONFIRMED ON THE RUNNER

Every `R0-A` step passed on a genuine GitHub runner, for the second consecutive run:

- Supabase stack initialised; every tracked migration applied fresh — 94s
- RLS integration suites — success; **`Assert 0 RLS tests skipped and 0 failed`** — success
- **`Run previously-unenforced DB-gated suites (R0-A — mandatory, no skip)`** — success, 4s
- **`Assert 0 R0-A DB-gated tests skipped and 0 failed`** — success
- `DB-gate coverage summary` — success

The 0-skip assertions passing is the meaningful evidence: had any `*_ALLOW_RUN`/`*_PG_URL` failed to
resolve on the runner, the suites would have skipped silently and the step would have failed. They did
not. **32 gates discovered / 32 enforced** and the **186 newly enforced real-DB assertions** executed
with zero skips and zero failures, on real Postgres, in CI.

**Runtime cost is acceptable.** The DB-backed job is **152s total** (down from 196s), of which the
R0-A step is **4s**. WP-045 First-Pilot E2E — the suite flagged as the one to watch — is inside that 4s
step and imposed no measurable burden. The residual risk report `245` recorded on runtime is retired.

## 5. PLAYWRIGHT GOLDEN PATH — REPRODUCED, CAUSE STILL UNCLASSIFIED

`E2E golden path (Playwright, local Supabase, seeded)` failed again at
`Run Playwright local golden-path suite`, **33s** (previously 35s), **after** Supabase started, every
migration applied and golden-path fixtures seeded successfully — all preceding steps green.

**Status: `PLAYWRIGHT FAILURE REPRODUCED — CAUSE STILL UNCLASSIFIED`.**

Job logs return **HTTP 403** and the artifact
`playwright-golden-path-test-results` (266,135 bytes, **not expired**) returns **HTTP 401**
unauthenticated. No defensible cause can be stated from available evidence, and none is invented here.

One evidence-based observation, offered as fact rather than diagnosis: the failure is **stable across
both runs** — same step, same phase, 35s and 33s, after identical successful setup. That is not the
profile of a transient infrastructure fault, so the earlier "may be transient" possibility is now
materially less likely. It remains a reproduction, not a classification.

**Nothing in Playwright, its specs or its fixtures was modified**, per §9 and §14.

## 6. CLASSIFICATION AND CONSEQUENCE

**Category B — `R0-A` green, unrelated Playwright red.** Two facts, deliberately not blurred:

1. **The `R0-A` implementation proof is technically successful.** Both residual risks from report `245`
   — runner execution unproven, runtime cost unobserved — are now retired by real runner evidence.
2. **The canonical workflow is NOT green**, so the **`R0-C` remote-CI precondition is NOT SATISFIED.**

`R0-A` remains **`R0_COMPLETE`** — this evidence pass does not reopen it. `R0-C` remains **`R0_OPEN`**
and was not executed.

## 7. PROTECTED STATE

Ref-level diff across all 383 remote refs shows **exactly the two authorized changes** and nothing
else. Unchanged: `main` `70c4cfa0…`, frozen RC `5f942697…`, `refs/pull/172/head` `5f942697…`,
`integration/kora-canonical-product-2026-09-22` `3a383072…`, and **all nine WP safety refs**. Total
383 → 383.

No PR, no merge, no new commit beyond `d578c1d`, no deployment, no staging, no Production, no Vercel,
no remote Supabase, no Gate 3. `scripts/provision-next-review.mjs` never addressed.

## 8. TEMPORARY PROOF REF

`integration/r0a-ci-proof-2026-09-22` is **retained** — it is now the cheapest reproduction of the
Playwright defect, and retiring it would discard that. Not eligible for retirement while the workflow
is red.

---

**`R0-A` PROVEN ON THE GITHUB RUNNER — WORKFLOW NOT FULL GREEN — PLAYWRIGHT REPRODUCED, UNCLASSIFIED**
