# 244 — KORA — `R0-A` CI REAL-DB ENFORCEMENT — IMPLEMENTATION & VERIFICATION

**Date:** 2026-09-22
**Type:** Implementation + evidence report. **NOT the `R0-A` completion record.**
**Item:** `R0-A` — CI Real-DB Enforcement (Section AI, Registry 219)
**State:** **`R0_OPEN` — unchanged.** Closure requires Founder review.
**Branch:** `r0/ci-real-db-enforcement-2026-09-22`
**Worktree:** `/Users/simonefelicetti/KORA-r0a-worktree`
**Baseline:** `3a383072b96290b44620566a242d22f0cc23b01a` (integration HEAD)

---

## 1. STARTING INVENTORY — REDISCOVERED, NOT INHERITED

Rediscovered mechanically by walking `tests/` rather than trusting the prior audit:

- **32 `*_ALLOW_RUN` execution gates** exist in the repository.
- **26 wired into CI.**
- **6 unwired** — matching the prior audit exactly: `COMMONS_GRANT_ALLOW_RUN`, `WP045_ALLOW_RUN`,
  `WP112_ALLOW_RUN`, `WP113_ALLOW_RUN`, `WP116_ALLOW_RUN`, `WP117_ALLOW_RUN`.

A second sweep for DB-gated suites **not** using the `*_ALLOW_RUN` convention found none: other
`process.env.*` references in `tests/` are Supabase URL/key inputs, E2E credentials or fixture-safety
confirmations, all belonging to suites already covered by a `*_ALLOW_RUN` gate or to Playwright E2E.

**The six unwired suites contain 186 real-database assertions that CI never executed.** That is the
defect: the repository's full-suite figure overstated continuously enforced coverage.

## 2. CLASSIFICATION — ALL SIX ARE CATEGORY A

| Gate | Suite | Proves | Result |
|---|---|---|---|
| `COMMONS_GRANT_ALLOW_RUN` | `integration/commons-schema-usage-grant.test.ts` | migration 046's `USAGE ON SCHEMA commons` grant is live — without it every commons table grant is inert and RLS-respecting reads fail | **WIRED** — 7 tests |
| `WP045_ALLOW_RUN` | `integration/wp-045-first-pilot-e2e-scenario.test.ts` | the canonical First-Pilot Journey (doc 92 §27) orchestrated through REAL domain services | **WIRED** — 26 tests |
| `WP112_ALLOW_RUN` | `unit/kora-wp-112-material-change-layer.test.ts` | Material Change candidate/assess/list + Package-A cardinality remediation, real service layer | **WIRED** — 24 tests |
| `WP113_ALLOW_RUN` | `unit/kora-wp-113-transformation-ledger-morphogenesis.test.ts` | Transformation Ledger + Morphogenesis engine, real service layer | **WIRED** — 39 tests |
| `WP116_ALLOW_RUN` | `unit/kora-wp-116-koral-review.test.ts` | KORAL Review Mode A/B, Assignment-gated, real service layer | **WIRED** — 22 tests |
| `WP117_ALLOW_RUN` | `unit/kora-wp-117-koral-mark-substrate.test.ts` | the **committed** KORAL Mark substrate | **WIRED** — 68 tests, see §3 |

**Category B (deliberately excluded): NONE.**
**Category C (defect/blocker): NONE.** Every suite passed unmodified on first execution — no Product
behaviour was wrong, and nothing needed fixing to make CI pass.

## 3. WP-117 TREATMENT — WIRED, AND WHY THAT RESPECTS THE DEFERRAL

`KORA-WP-117` remains Founder-deferred and **this task changed nothing about it**.

The question §5 poses is whether executing the **committed** suite would merely validate canonical
substrate or would advance deferred acceptance. Determined by reading committed files only:

`tests/unit/kora-wp-117-koral-mark-substrate.test.ts` is tracked on this branch and references exactly
**eight** modules — `accessible-description`, `bounded-geometry-types`, `brand-safety`,
`edition-lineage-service`, `expression-projection`, `geometry-service`, `morphological-compression`,
`types` — **all eight committed**. It references **none** of the six deferred WP-117 implementation
files (`mark-service`, `morphology-engine`, `svg-renderer`, `visual-grammar`, `implicit-field`,
`renderer-types`) nor the deferred API route. Those files **do not exist on this branch at all**;
they live only in the uncommitted working copy preserved by Layer A.

The suite is, as its filename states, the **substrate** test. Running it validates already-canonical,
already-committed code and cannot advance WP-117's deferred acceptance — there is nothing deferred in
its dependency set to advance.

**No uncommitted WP-117 implementation file was opened, read, copied, fixed or completed.** WP-117's
governance status is untouched. It was **not** wired "to make the count 32/32" — it was wired because
its committed scope is canonical substrate; had it referenced a deferred file, it would have been
classified `DELIBERATELY EXCLUDED — FOUNDER-DEFERRED`.

## 4. CI TRIGGER ANALYSIS — THE ENFORCEMENT WAS AIMED AT THE WRONG BRANCH

**Before:** `pull_request: [main]` and `push: [main]` only.

Under the release model `R0-B` declared (report `243`), `integration/**` is Product truth and `main` is
**archival, fast-forwarded only after release**. Enforcement watching `main` alone would therefore run
the real-DB gates **only after code had already reached Production** — the opposite of continuous
enforcement for the line that actually carries Product truth. The branch carrying reviewed work was the
one branch CI did not watch.

**After — the minimal change:**

```yaml
workflow_dispatch:
pull_request:
  branches: [main, 'integration/**', 'release/**']
push:
  branches: [main, 'integration/**', 'release/**']
```

`main` is **deliberately kept** as a trigger — it must stay verified — and is **deliberately not
restored** as the integration path. `workflow_dispatch` allows on-demand validation of a staging
candidate, which `R0-C` will need. No Vercel configuration was touched; nothing was deployed.

## 5. WHAT WAS WIRED

One new step in the existing `kora-link-local-integration` job — the job that already runs
`supabase start`, a full Supabase stack. **No second database-testing architecture was created**, and a
bare Postgres was deliberately not used: the migration set requires Supabase's `auth` schema, as the
integration verification established when a bare DB failed at migration 007.

Supabase URL and service-role key are read via `supabase status -o json`, the mechanism this workflow
already uses elsewhere. **No secret was introduced** — these are the ephemeral local stack's own
throwaway keys — and no new CI secret is required.

The step is separate from the RLS gate by design: **the existing RLS gate and its 0-skip assertion are
untouched and unweakened.**

## 6. SKIP POLICY AND TRUTHFUL REPORTING

- **`Assert 0 R0-A DB-gated tests skipped and 0 failed`** — an unexpected skip means an env var did not
  resolve and is a hard failure, mirroring the RLS gate's own discipline. No `|| true`, no blanket
  ignore; a guard asserts no `vitest run … || true` exists anywhere in the workflow.
- **`DB-gate coverage summary`** — writes a table of discovered / enforced / failed / skipped per gate
  group to the job log and `GITHUB_STEP_SUMMARY`, and points at the exclusions list. A run can no
  longer imply "all DB tests passed" while a canonical suite was silently skipped.
- The new JSON report is uploaded alongside the existing artefacts.

## 7. DRIFT PREVENTION — `tests/unit/r0a-db-gate-enforcement.test.ts`

The smallest mechanism that fits the repository, following its own precedent
(`pilot-trust-01-service-role-guard.test.ts` embeds its allowlist in the guard itself):

**Rule.** Every `*_ALLOW_RUN` gate discovered in `tests/` must be either **enforced by CI** or
**explicitly excluded** with a `reason`, a `governanceSource` and a `revisitCondition`. A gate that is
neither fails the guard, so a future DB suite cannot be added without a deliberate classification.

`DELIBERATE_EXCLUSIONS` is **empty by design** — every canonical gate is enforced today.

The guard additionally asserts: the scanner itself works (self-test); no exclusion uses `"difficult"`,
`"currently fails"`, `"flaky"` or `"too slow"` as a reason; no gate is both excluded and wired; the six
newly wired gates stay wired; CI watches the Product-truth line; and the fail-loudly assertions remain.

**Proven to work.** A temporary probe suite introducing `DRIFTPROBE_ALLOW_RUN` was added: the guard
**failed** with the exact remediation message. The probe was removed and the guard returned green. A
guard that has never been seen to fail is not evidence.

## 8. VERIFICATION — ALL COMMANDS AND RESULTS

**Targeted, each suite individually against the local Supabase stack:**

| Gate | Tests | Passed | Failed | Skipped |
|---|---|---|---|---|
| `COMMONS_GRANT` | 7 | 7 | 0 | 0 |
| `WP045` | 26 | 26 | 0 | 0 |
| `WP112` | 24 | 24 | 0 | 0 |
| `WP113` | 39 | 39 | 0 | 0 |
| `WP116` | 22 | 22 | 0 | 0 |
| `WP117` substrate | 68 | 68 | 0 | 0 |

**CI-equivalent run** — all six in one invocation with the exact env block and reporter the workflow
uses, then the workflow's own assertion executed verbatim:

```
R0-A DB-gated suites — total: 186 passed: 186 failed: 0 skipped: 0
ASSERTION PASSED — 0 skipped, 0 failed
```

**Regression:**

| Gate | Result |
|---|---|
| RLS integration path (all 25 gates enabled) | **32 files · 414 passed · 0 failed** — unweakened |
| Full Vitest (test discovery changed, so full run required) | **429 files · 13,730 passed · 0 failed** (345 skipped, 5 todo) |
| `tsc --noEmit` | **0** |
| ESLint (changed files) | **0** |
| YAML validation, all 3 workflows | **VALID** |

File count 428 → **429** and test count 13,723 → **13,730**: the new guard suite, 7 tests.

## 9. SECURITY

No secret value printed, archived or committed. No credential hardcoded. Only existing env-var naming
conventions used (`*_ALLOW_RUN`, `*_PG_URL`, `*_SUPABASE_URL`, `*_SERVICE_ROLE_KEY`) plus local shell
variables. **Zero occurrences of key material (`eyJ`) in the diff.** **No new CI secret is required.**

## 10. CHANGED FILES — TWO

```
M  .github/workflows/ci.yml                      +91 / -2
?? tests/unit/r0a-db-gate-enforcement.test.ts    (new, 7 tests)
```

**No Product code, route, UI, service, domain logic, migration, RLS policy, methodology, auth or
navigation change.** Not committed, not staged, not pushed.

## 11. REMAINING RISKS

1. **CI has not executed this on GitHub.** Everything was verified locally against the same Supabase
   mechanism CI uses, but the first real run is the true proof. The `workflow_dispatch` trigger makes
   that cheap to obtain before relying on it.
2. **Runtime cost.** The job gains 186 real-DB tests. Locally they are fast; on CI runners the
   First-Pilot scenario is the one to watch.
3. **`WP117_ALLOW_RUN` naming.** Its suite is substrate-only, but the gate name invites a future reader
   to assume deferred WP-117 is being validated. The guard and this report record the distinction; a
   rename was deliberately not performed, since renaming a committed gate is Product-test churn outside
   R0-A's scope.

## 12. WHAT THIS TASK DID NOT DO

No Product behaviour change. No migration or RLS policy change. No commit, push or PR. No deployment,
no Vercel configuration, no remote Supabase, no staging, no Production. `R0-B` unchanged (`R0_COMPLETE`);
`R0-C` unchanged (`R0_OPEN`); `R0-D` untouched. **`R0-A` remains `R0_OPEN`** — Registry 219's `R0-A`
state was deliberately not modified. `KORA-WP-068` not started; `KORA-WP-126`–`137` not started;
`KORA-WP-085` untouched; Gate 3, `KORA-WP-117`, `KORA-WP-019`, `KORA-WP-120`, `KORA-WP-069` untouched;
no scope trigger activated; Registry 102 and 142 unmodified.
`scripts/provision-next-review.mjs` was never addressed.

## 13. RECOMMENDATION

**READY FOR FOUNDER `R0-A` REVIEW.** The 32/26 gap is closed to **32/32**, with zero deliberate
exclusions and zero blockers; the enforcement now points at the branch that carries Product truth; the
reporting is truthful; and the drift guard has been demonstrated to fail when it should.

---

**`R0-A` IMPLEMENTED AND VERIFIED — STILL `R0_OPEN` — FOUNDER REVIEW REQUIRED**
