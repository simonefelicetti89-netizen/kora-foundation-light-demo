# 245 — KORA — `R0-A` CI REAL-DB ENFORCEMENT — COMPLETION RECORD

**Date:** 2026-09-22
**Type:** `R0` completion record.
**Item:** `R0-A` — CI Real-DB Enforcement (Section AI, Registry 219)
**State transition:** `R0_OPEN` → **`R0_COMPLETE`**
**Founder approval:** **GRANTED 2026-09-22** — *"R0-A CI REAL-DB ENFORCEMENT is APPROVED. The reviewed
implementation is accepted as described in report 244."*
**Implementation & verification evidence:** report `244` (retained unchanged as the technical record)

---

## 1. PRODUCT COMMIT

| | |
|---|---|
| **Commit** | **`ec0ff4546fdf8bc06f3b76e59f66a1b4ebaa1528`** |
| **Message** | `R0-A enforce canonical real-DB CI coverage` |
| **Parent / baseline** | `3a383072b96290b44620566a242d22f0cc23b01a` (integration HEAD) |
| **Branch** | `r0/ci-real-db-enforcement-2026-09-22` |
| **Worktree** | `/Users/simonefelicetti/KORA-r0a-worktree` |
| **Commits beyond baseline** | exactly **1** |
| **Upstream** | none configured |
| **Pushed** | **NO** |

**Exactly two files, as approved:**

```
M  .github/workflows/ci.yml                      +93 / -2
A  tests/unit/r0a-db-gate-enforcement.test.ts    +163
   2 files changed, 254 insertions(+), 2 deletions(-)
```

No other Product path was modified, staged or committed.

## 2. RESULT — 32/32

| | Before | After |
|---|---|---|
| DB execution gates discovered | 32 | **32** |
| Enforced by CI | 26 | **32** |
| Deliberate exclusions | — | **0** |
| Category-C blockers | — | **0** |

**186 real-database assertions are now continuously enforced that previously were not.**

### The six newly enforced gates

| Gate | Suite | Tests |
|---|---|---|
| `COMMONS_GRANT_ALLOW_RUN` | `integration/commons-schema-usage-grant.test.ts` — migration 046's `USAGE ON SCHEMA commons`, without which every commons table grant is inert | 7 |
| `WP045_ALLOW_RUN` | `integration/wp-045-first-pilot-e2e-scenario.test.ts` — the canonical First-Pilot Journey through real domain services | 26 |
| `WP112_ALLOW_RUN` | `unit/kora-wp-112-material-change-layer.test.ts` | 24 |
| `WP113_ALLOW_RUN` | `unit/kora-wp-113-transformation-ledger-morphogenesis.test.ts` | 39 |
| `WP116_ALLOW_RUN` | `unit/kora-wp-116-koral-review.test.ts` | 22 |
| `WP117_ALLOW_RUN` | `unit/kora-wp-117-koral-mark-substrate.test.ts` — see §3 | 68 |

## 3. WP-117 SUBSTRATE RULING

**`KORA-WP-117` remains Founder-deferred. This item changed nothing about it.**

The committed suite `kora-wp-117-koral-mark-substrate.test.ts` references **exactly eight modules —
all committed** (`accessible-description`, `bounded-geometry-types`, `brand-safety`,
`edition-lineage-service`, `expression-projection`, `geometry-service`, `morphological-compression`,
`types`) — and **none** of the six deferred WP-117 implementation files, which **do not exist on this
branch at all**. It is the *substrate* test, as its filename states.

Running it therefore validates already-canonical, already-committed code and **cannot advance deferred
WP-117 acceptance** — there is nothing deferred in its dependency set to advance. Established by
reading committed files only: **no uncommitted WP-117 implementation file was opened, read, copied,
fixed or completed.** It was not wired to reach 32/32; had it referenced a deferred file, it would have
been classified `DELIBERATELY EXCLUDED — FOUNDER-DEFERRED`.

## 4. CI TRIGGER CHANGE

**Before:** `pull_request: [main]`, `push: [main]`.
**After:** `[main, 'integration/**', 'release/**']` plus `workflow_dispatch`.

Under the release model `R0-B` declared (report `243`), `integration/**` is Product truth and `main` is
**archival**, fast-forwarded only after release — so watching `main` alone ran these gates only after
code had already shipped. `main` is **deliberately kept** as a trigger and **deliberately not restored**
as the integration path. `workflow_dispatch` supports on-demand validation of a staging candidate,
which `R0-C` will need.

## 5. ANTI-DRIFT MECHANISM

`tests/unit/r0a-db-gate-enforcement.test.ts`. Every `*_ALLOW_RUN` gate discovered in `tests/` must be
either **CI-enforced** or **explicitly excluded** with a `reason`, `governanceSource` and
`revisitCondition`. `DELIBERATE_EXCLUSIONS` is **empty by design**. `"difficult"`, `"currently fails"`,
`"flaky"` and `"too slow"` are rejected as reasons — they describe defects, not canonical exclusions.

It follows the repository's own precedent (`pilot-trust-01-service-role-guard.test.ts`) rather than
introducing a framework, and **was proven to fail**: a temporary probe gate made it fail with the exact
remediation message, and removing the probe returned it green.

## 6. VERIFICATION EVIDENCE (report `244`, reconfirmed at commit)

| Gate | Result |
|---|---|
| Six newly wired suites, CI-equivalent single run | **186 passed · 0 failed · 0 skipped** — workflow assertion executed verbatim |
| RLS integration path | **32 files · 414 passed · 0 failed** — untouched and unweakened |
| Full Vitest | **429 files · 13,730 passed · 0 failed** |
| `tsc --noEmit` | **0** |
| ESLint | **0** |
| Workflow YAML, all three | **VALID** |
| Drift guard | **7 passed**, and demonstrated to fail on drift |

Reconfirmed immediately before commit: 32 discovered / 32 enforced / 0 unenforced; guard green; YAML
valid; both files untouched since report `244`, so the expensive suites were not rerun.

## 7. NO PRODUCT BEHAVIOUR CHANGE

CI/build engineering only. No Product route, UI, service, domain logic, migration, RLS policy,
methodology, auth or navigation change. The existing RLS gate is untouched and unweakened. No secret
introduced, none required — Supabase URL and service-role key come from `supabase status -o json`, the
mechanism the workflow already uses; zero key material in the diff.

## 8. NO DEPLOYMENT, NO PUSH

Nothing deployed. No Vercel configuration touched. No remote Supabase, staging or Production contact.
Remote refs **381 → 381**, unchanged: `main` `70c4cfa0…`, frozen RC `5f942697…`, PR #172 `5f942697…`,
integration `3a383072…`. The `r0/` branch has **no remote ref** and no upstream. No PR created.

## 9. CONTROLLED PILOT GATE — ONE CONDITION SATISFIED, GATE NOT PASSED

**The Controlled Pilot Gate is NOT declared passed.** `R0-A` is one condition among several.

| Condition | Status |
|---|---|
| `R0-A` = `R0_COMPLETE` | **SATISFIED (this record)** |
| `R0-B` = `R0_COMPLETE` | SATISFIED (report `243`) |
| `R0-C` = `R0_COMPLETE` | **NOT SATISFIED** — `R0_OPEN`, not executed |
| `KORA-WP-132` = `COMPLETE` | **NOT SATISFIED** — `READY`, not started |
| Methodology disclosure verified | **NOT VERIFIED** |
| No pilot-critical dead Admin route | **NOT VERIFIED** |

## 10. RESIDUAL RISKS

1. **First real GitHub CI execution is still pending.** Everything was verified locally against the same
   `supabase start` / `supabase status -o json` mechanism CI uses, but the first genuine run on a GitHub
   runner is the true proof. `workflow_dispatch` makes obtaining it cheap, and it should be obtained
   before this enforcement is relied upon as a gate.
2. **Runtime cost must be observed on CI runners.** The job gains 186 real-DB tests; the First-Pilot
   scenario is the one to watch.
3. **`WP117_ALLOW_RUN` naming** invites a future reader to assume deferred WP-117 is being validated.
   Recorded here and in the guard; a rename was deliberately not performed, being Product-test churn
   outside `R0-A`'s scope.

## 11. DISPOSITION OF REPORT `244`

Report `244` remains the **IMPLEMENTATION & VERIFICATION** record and was **not rewritten** into a
completion record. This record (`245`) is the completion record, per corpus convention of one numbered
record per governance event.

## 12. NOT DONE

`R0-B` unchanged (`R0_COMPLETE`); `R0-C` unchanged (`R0_OPEN`); `R0-D` unchanged (`R0_OPEN`). No WP
status, dependency or scope altered. `KORA-WP-068` not started; `KORA-WP-132` not started;
`KORA-WP-126`–`137` not started. Gate 3, `KORA-WP-117`, `KORA-WP-019`, `KORA-WP-120`, `KORA-WP-069`
untouched. No scope trigger activated. Registry 102, Registry 142 and `CLAUDE.md` unmodified.
`.kora-audit/**` not added to Product Git. `scripts/provision-next-review.mjs` never addressed.

---

**`R0-A` COMPLETE — COMMIT `ec0ff45` — LOCAL ONLY, NOT PUSHED**
