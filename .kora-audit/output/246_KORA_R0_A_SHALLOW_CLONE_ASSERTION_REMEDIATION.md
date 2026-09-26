# 246 — KORA — `R0-A` SHALLOW-CLONE GIT ASSERTION REMEDIATION

**Date:** 2026-09-22
**Type:** Implementation + evidence record. **NOT the successful GitHub-run proof record.**
**Commit:** `d578c1d029b52301e9931a0076a305e92f4a30fb`
**Parent:** `ec0ff4546fdf8bc06f3b76e59f66a1b4ebaa1528` — the approved R0-A commit, **NOT amended**
**Branch:** `r0/ci-real-db-enforcement-2026-09-22` · **not pushed**

---

## 1. THE DEFECT

The first genuine GitHub Actions run — **run `35763067234`**, event `push`, tested SHA
`ec0ff4546fdf8bc06f3b76e59f66a1b4ebaa1528` — was red. The R0-A work itself passed on the runner: the
DB-backed gate job succeeded end to end, including both new steps and the 0-skip assertion.

The blocking-job failure was `Unit tests`. Cause, established by reproduction rather than assertion:
`actions/checkout@v4` carries **no `fetch-depth`**, so CI clones at **depth 1**. Six assertions read
historical commits. In a depth-1 clone the baseline commit is absent and git exits `fatal: bad object`.
**One call sat at module scope**, so the whole file failed at *collection*, not merely at assertion.

Local clones carry full history, which is why this never surfaced in development — and it never
surfaced in CI either, because **CI had never run on the integration line** until R0-A pointed it
there. The enforcement found the defect within minutes of its first genuine run.

## 2. SHALLOW-SENSITIVE ASSERTIONS — ALL SIX

Discovery was iterative and worth recording honestly: a source grep found three; **the shallow
reproduction found three more** that a full-history clone hides. That is why §8's disposable depth-1
clone was mandatory and why the developer clone alone would have produced a false all-clear.

| # | Test | Historical call | Guarantee proved |
|---|---|---|---|
| 1 | `kora-wp-066-saved-mappings` | `git diff --stat 0bc14f6e -- lib/mapping-governance/manual-remap-service.ts` | WP-029's service is byte-identical to baseline — WP-066 did not modify another WP's file |
| 2 | `kora-wp-066-saved-mappings` | `git diff --stat 0bc14f6e -- lib/data-intake/column-mapping.ts` | the B27 classifier is byte-identical — `COMPANY-010` KEEP respected |
| 3 | `kora-wp-125-…-foundation` | `git show 84128e81:components/layout/Sidebar.tsx` **(module scope)** | navigation changed only where a Founder ruling required |
| 4 | `kora-wp-125-…-foundation` | `git show 84128e81:lib/navigation/admin-nav-groups.ts` | admin navigation changed only by demo retirement + the WP-012 restoration |
| 5 | `kora-wp-125-…-foundation` | `git show 84128e81:lib/auth/kora-session.ts` | authentication logic byte-identical — PX work may not touch auth |
| 6 | `kora-wp-125-…-foundation` | `git show 84128e81:components/layout/AppShell.tsx` and `…:components/demo/SyntheticDataBanner.tsx` | public bypass list unchanged; banner wording byte-identical, presentation only |

**`kora-wp-011-async-idempotency-contract` is NOT affected.** It shells out to `grep`, not git, and uses
no historical SHA. An earlier report of mine implied otherwise; that was wrong and is corrected here.

**`git grep -l -- 'SessionBar' app/` in WP-125 is retained unchanged** — it reads the working tree, not
history, and is shallow-safe.

## 3. REMEDY — OPTION A THROUGHOUT

Every assertion now proves the same fact **from the current tree**:

- **Byte-identity → pinned SHA-256 of the baseline blob** (#1, #2, #5). An empty `git diff --stat` and a
  matching content digest prove the same fact. The digest form is marginally **stronger**: exact rather
  than dependent on how `--stat` summarises.
- **Baseline navigation → pinned `href` / `heading` sets** extracted from `84128e81` (#3: 37 href, 13
  heading; #4: 26 href). The comparison logic and every expected delta literal are unchanged.
- **Public bypass list and banner wording → pinned literals** from the same commit (#6).

**Option B was not needed.** `ci.yml` is **not modified** and no `fetch-depth` change was made.

### Why this does not weaken semantics

Nothing is skipped, caught-and-passed, returned early, downgraded to a warning, or replaced by a
file-exists check. **A passing run still proves the invariant** — the §5 prohibition is respected
exactly. The baselines are now *explicit and auditable in the test* rather than implicit in a commit
the runner cannot see, and each guard still fails for any later change, which is its purpose.

## 4. SHALLOW REPRODUCTION — BEFORE AND AFTER

A disposable depth-1 clone of the pushed commit, equivalent to the CI checkout:

**Before:**
```
commits available: 1  |  baseline present: NO
fatal: bad object 0bc14f6e484110ce65be8aa0c185a68208057359
fatal: path 'components/layout/Sidebar.tsx' exists on disk, but not in '84128e81…'
```

**After**, repaired tests run **inside that same shallow clone**:
```
tests/unit/kora-wp-066…  +  tests/unit/kora-wp-125…   2 files · 111 passed
npm test (full CI-equivalent unit step)               429 files · 13,730 passed · 0 failed
```

## 5. MUTATION PROOF

Each repaired guard was shown to still fail when its invariant is violated:

- **WP-066:** appended a line to `lib/mapping-governance/manual-remap-service.ts` →
  `AssertionError: WP-029 service changed since 0bc14f6e… — this WP may not modify it` (1 failed / 57 passed).
- **WP-125:** added `href: '/admin/sneaky-new-route'` to the admin navigation → failed, naming the
  intruding destination (1 failed / 52 passed).

Both mutations were reverted completely; the disposable clone was deleted. **No temporary mutation
remains in any worktree.**

## 6. VERIFICATION

| Gate | Result |
|---|---|
| Targeted (WP-066, WP-125, R0-A guard, WP-011) | **4 files · 134 passed** |
| Full Vitest (full-history worktree) | **429 files · 13,730 passed · 0 failed** |
| Full unit suite **in the depth-1 clone** | **429 files · 13,730 passed · 0 failed** |
| `tsc --noEmit` | **0** |
| ESLint (changed files) | **0** |
| YAML validation | N/A — `ci.yml` unchanged |

## 7. CHANGED FILES — TWO

```
M tests/unit/kora-wp-066-saved-mappings.test.ts                          +52 / -…
M tests/unit/kora-wp-125-shared-product-experience-foundation.test.ts   +145 / -…
  2 files changed, 165 insertions(+), 32 deletions(-)
```

No Product route, UI, service, migration, RLS policy, domain code, methodology, Playwright test,
fixture, workflow, staging or Vercel change.

## 8. PLAYWRIGHT — STILL OPEN

The `E2E golden path (Playwright, local Supabase, seeded)` job also failed in run `35763067234`, at the
`Run Playwright local golden-path suite` step (35s), **after** Supabase started, migrations applied and
fixtures seeded successfully. Job logs require authentication (HTTP 403 unauthenticated), so the cause
is not established.

**Status: OPEN — UNCLASSIFIED CI FAILURE.** Deliberately not addressed here: bundling it into a
speculative fix alongside an understood defect is exactly what §7 forbids. The next genuine runner run
may yield more evidence.

## 9. STATE — UNCHANGED

`R0-A` = **`R0_COMPLETE`** · `R0-B` = `R0_COMPLETE` · `R0-C` = **`R0_OPEN`** · `R0-D` = `R0_OPEN`.
No WP graph change; the tuple remains 137 / 63 / 34 / 40 / 213 / 5 / 0 / 0 / 0.

`ec0ff4546fdf8bc06f3b76e59f66a1b4ebaa1528` is unchanged and remains the approved R0-A commit. Not
pushed; `integration/r0a-ci-proof-2026-09-22` not moved. Registry 102, Registry 142 and `CLAUDE.md`
unmodified. Gate 3, WP-117, WP-019, WP-120, WP-069 untouched. `scripts/provision-next-review.mjs` never
addressed.

---

**SHALLOW-CLONE REMEDIATION COMPLETE — COMMIT `d578c1d` — AWAITING FOUNDER AUTHORIZATION TO RE-RUN REMOTE CI**
