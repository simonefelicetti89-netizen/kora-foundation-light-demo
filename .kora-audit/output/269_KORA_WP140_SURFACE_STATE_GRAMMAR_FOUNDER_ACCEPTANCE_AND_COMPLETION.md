# 269 — KORA-WP-140 SURFACE & STATE GRAMMAR — FOUNDER ACCEPTANCE AND COMPLETION

**Date:** 2026-09-25 · **Package:** `KORA-WP-140` (PX-D, DAG root) · **Status transition:** READY → **COMPLETE**
**Candidate:** `c46f2680cbd43b5e2c47c65b6688184fa8d109a7`
**Baseline:** `ac91cfa31e0bcad85071d467c9a5611a4668c29b`
**Exact-SHA CI:** KORA CI #330, run `36167556656`, event `push`, all four mandatory jobs green
**Canonical inputs:** `docs/BENCHMARK_V2_CANONICAL_GRAMMAR.md` (Founder-ratified 2026-09-25, governance commit `d4a815e`)

---

## 1. THE FOUNDER RULING, RECORDED BEFORE ANYTHING ELSE

**Founder Visual Acceptance: PASSED — WP140 SCOPE ONLY.**

**This does NOT accept the current overall Product Experience, which remains NOT ACCEPTED as final quality.**
**Benchmark V2 final visual acceptance is NOT granted.**

The Founder recorded seven remaining deficiencies on the reviewed surface:

| Deficiency | Owner |
|---|---|
| Typography still too small / compressed | `KORA-WP-139` |
| Weak information hierarchy | `139` · `141` |
| Excessive card / container density | `141` |
| Insufficient visual storytelling | `141` · `142` |
| Excessive vertical length, especially mobile | `141` (AN.1 mobile ratio) |
| Insufficient premium craft and originality | `139` · `141` |
| Important information does not dominate quickly enough | `141` · `142` |

**None of these is a WP140 failure, and none may be recorded as one.** They belong to `KORA-WP-139`, `KORA-WP-141`
and `KORA-WP-142`, which are the packages that own type scale, composition and data encoding respectively.

---

## 2. WHAT THE PACKAGE DELIVERED

Three commits, 6 files, +1,356 / −124 against the canonical baseline.

- `ab0ce2c` — the canonical grammar: `lib/design/surface-state-grammar.ts`, `components/ui/px/roles.tsx`,
  `components/ui/px/states.tsx`, exported through the existing `components/ui/px` index.
- `b070249` — demonstrator adoption on `/company/reports`.
- `c46f268` — acceptance hardening: CI-portable identity assertions, and removal of the duplicate labelling the
  first adoption introduced.

### The three defects it closes, and why each fix is structural

1. **`ZERO` was indistinguishable from `NO DATA`.** `components/ui/NoDataState.tsx` was a 24-line pass-through to
   `EmptyState`, so "your programme produced nothing" and "nobody supplied anything" rendered identically to a
   paying customer. They are now separate components whose required props cannot satisfy one another — a ZERO must
   say what was measured, a NO DATA must say what was never supplied — so the compiler refuses the substitution the
   old code allowed.
2. **Suppression could be announced as a fault.** `EmptyState`'s `access-denied` variant carries `role="alert"`, and
   nothing stopped a caller reaching for it on a privacy boundary. `SUPPRESSED` and `NOT YET AVAILABLE` now differ
   from `ERROR` in **ARIA role, live-region politeness and fault flag**, so the distinction reaches a
   screen-reader user and is not merely a colour.
3. **A danger treatment on a healthy value was fully constructible.** `tone` was a free parameter at 32 call sites
   (`tone={thresholdMet ? 'ok' : 'risk'}`). No role or state component now accepts a `tone`, `variant` or `colour`
   prop at all: a caller states a semantic `Assessment` and the treatment is derived. `watch` and `risk`
   additionally require a stated reason, so nothing is marked dangerous casually.

An unrecognised state **throws** rather than degrading to `ERROR` — silently rendering the unknown as a fault would
reintroduce exactly the conflation this package removes.

### Preservation, proven rather than asserted

`components/privacy/PrivacyBoundaryNotice.tsx`, `components/ui/EmptyState.tsx`,
`components/privacy/AccessDeniedState.tsx` and `lib/design/kora-design-tokens.ts` are **byte-identical to the
baseline**, each asserted against a pinned SHA-256 digest. `SUPPRESSED` **delegates to** the Privacy Boundary rather
than re-implementing it, which is the only way "preserved, never regressed" can be demonstrated. N≥10 untouched.

The `KORA-WP-047` accessibility lock was **honoured, not superseded**: `access-denied` continues to mean an
authorization failure, for which an alert role is correct, and the exact asserted source string survives unchanged.

---

## 3. DEMONSTRATORS — `AN.3` satisfied

| Surface | How |
|---|---|
| `/company/reports` | **Migrated.** Seven roles adopted where there were seventeen hand-rolled containers and no role. Three state corrections: the loading guard, an unscored period (NOT YET AVAILABLE, not an absence and not a fault) and KORA Contribution. Exactly one Hero Judgment. |
| `/advisor/companies/[assignmentId]` | **Recorded as conforming by EVIDENCE, not mutation** — eight distinct shared roles already adopted at baseline. Deliberately not churned: churn introduced solely to claim a package touched a surface is a Benchmark V2 violation, not acceptance. |

Registry `AN.3` and the Section C rows name the second demonstrator `/advisor/companies/[id]`; the real path is
`/advisor/companies/[assignmentId]`. **Same surface — the route must not be renamed to match the prose.**

---

## 4. EVIDENCE

### Tests

48 focused tests, all green, plus the full suite at **433 files / 13,801 tests / 0 failures**. `tsc --noEmit`
clean, `eslint` clean, `git diff --check` clean.

**Non-vacuity proved by mutation, twice.** Eight injected regressions in the first round and six in the second each
produced **exactly one** new failure: SUPPRESSED announced as an alert · a healthy claim reaching the danger
treatment · a re-exposed `tone` prop · an unknown state degrading to ERROR · each of the four protected files
altered · the duplicate heading reintroduced · the role label forced back to mandatory · the demonstrator regressed
to a bare loading sentence.

### Visual — local, synthetic, non-Production

Captured on a fully local stack (Docker Supabase, local golden-path synthetic fixture, dev server on `:3100`); the
harness refuses any non-localhost Supabase. Populated by the **real** `POST /api/admin/operator-flow` — KORA Index
33.35, Safeguard CLEAR, CS 63%, AR 1, MAR 0.68, `n_threshold 10`, `pii_found false`. No fabricated rows.

| Capture | Roles | Hero | Assessment | Page errors | 4xx/5xx | Overflow |
|---|---|---|---|---|---|---|
| `reports-remediated-1440.png` | 7 | 1 | `ok` | 0 | 0 | none |
| `reports-remediated-375.png` | 7 | 1 | `ok` | 0 | 0 | none |

The CLEAR safeguard rendering in the `ok` treatment is clause (D) proven at runtime: a healthy value could not be
dressed as a danger. Screenshots are scratchpad-only and were never committed.

### Exact-SHA CI

**KORA CI #330**, run `36167556656`, attempt 1, event `push`, branch `integration/wp140-ci-proof-2026-09-25`, head
**`c46f2680cbd43b5e2c47c65b6688184fa8d109a7`** — exact, no synthetic merge SHA. Conclusion **success**:
TypeScript/tests/build/lint · DB-backed gate (RLS-03/05/06 + KORA Link behavioral) · E2E smoke · E2E golden path.

---

## 5. TWO FAILURES ON THE WAY, BOTH MINE OR EXTERNAL — STATED PLAINLY

**KORA CI #329** at `b070249` failed two mandatory jobs.

1. **Unit tests — a defect in my own test file.** Four byte-identity assertions read git history via
   `git show <baseline>:<path>`. `actions/checkout@v4` clones at depth 1, so the baseline object does not exist in
   the runner: green locally, broken in CI. Fixed in `c46f268` by pinning SHA-256 digests, the idiom the
   `KORA-WP-125` suite already uses. **Proven against the exact CI condition** — the tree was exported with
   `git archive` into a directory with no `.git` at all and the suite passed 48/48. No fetch-depth change, no
   workflow change, no weakening.
2. **E2E smoke — external infrastructure.** `Error: Timed out waiting 120000ms from config.webServer` after 4,560
   `NextFontGoogleFontFileReplacer` resolve failures: the runner could not fetch Google Fonts, the dev server never
   became ready, and **no test executed**. It passed unchanged on #330 with no Product, font or config change
   between the runs. Classified on that evidence as a runner-side network dependency, **not** asserted as transient
   and never rerun to mask it.

**A visual regression I introduced, found by the evidence and fixed.** The first adoption left six pre-existing
`SectionLabel`s above role surfaces that carried their own label, so six blocks announced themselves twice. Removed
in `c46f268`; `EvidencePanel` and `Disclosure` now take an optional label so a panel whose content self-titles adds
no second heading. A role's identity is structural and carried by `data-px-role` — it never has to print its own
name to prove it exists. Desktop page height fell 4,129 → 3,798px as a result.

**A process failure worth recording.** During the first mutation round my revert used `git checkout` on a set that
included untracked files; it restored the *tracked* demonstrator to baseline and destroyed that work. I detected
it, rewrote the page, and from the second round backed every file up before mutating.

---

## 6. LOCAL DATABASE PRIVILEGES — APPLIED AND PROVABLY REVOKED

The operator flow could not persist: `analytics.methodology_snapshot` and `analytics.impact_unit` carry **no
`service_role` grant** in the repository migrations, while their sibling result tables do.

Under explicit Founder authorization, scoped to the disposable local Docker instance only, exactly three grants were
added — `SELECT, INSERT` on `methodology_snapshot` and `INSERT` on `impact_unit` — and then revoked. A mechanical
`diff` of the grant inventory before and after reports **IDENTICAL**. `living_koral_edition` was not touched. No
UPDATE/DELETE/TRUNCATE, no schema-wide grant, no ownership change, no trigger disabled
(`trg_methodology_snapshot_immutable` verified still enabled), no RLS change, no repository file changed. The local
target was proven first: unix socket inside the container, app env on `127.0.0.1:54321`, zero occurrences of any
staging or Production project ref, no linked remote project.

**Recorded as separate debt, deliberately not repaired here:** repository migrations do not reproduce the
`service_role` grants apparently present in staging, where the same operator flow succeeded during the Controlled
Pilot. This requires later adjudication. No migration created, no staging change, no new WP.

One harness affordance, disclosed: the app's CSP `connect-src` allows only `https://*.supabase.co`, so browser→local
Supabase is blocked — a constraint the repository itself documents in `tests/e2e/helpers/local-session.ts`. The
capture browser therefore ran with Playwright `bypassCSP: true`. Context-level only: no Product code, no
`next.config.ts` change, no route interception, no faked data.

---

## 7. REGISTRY DELTA

| Change | Detail |
|---|---|
| `AL.2` | COMPLETE set 65 → **66**; `140` added |
| Status aggregate | **COMPLETE 66 · READY 35 · BLOCKED 43 · TOTAL 144**; prior struck |
| Section C | `KORA-WP-140` STATUS marker READY → COMPLETE, prior state struck |
| `AL.3` | Evidence row added — exact-SHA CI plus Founder Visual Acceptance |
| `AN.5` | W1 update: `140` COMPLETE, `139` unaffected and still READY |
| `AN.6` | O3 discharged; O1 and O2 recorded as never exercised |

**Nothing is mechanically unblocked.** All four dependents of `140` — `126`, `141`, `142`, `143` — also depend on
`139`, which remains READY, so every one stays BLOCKED. Graph unchanged: 144 nodes, 225 hard edges, 5 conditional,
4 triggers, 0 cycles. Checker: 10 invariants, 0 FAIL, **INV-08 PASS** (derived 66/35/43/144 == declared).

---

## 8. WHAT THIS CLOSURE DOES NOT DO

It does not accept the overall Product Experience · it does not grant Benchmark V2 final visual acceptance · it does
not close `KORA-WP-139`, `141`, `142` or `143` · it allocates no package · it advances no gate. Gate 3, Gate 5,
`F-12`, `TRUST-04` and `EV-R02` are unchanged. `KORA-WP-117` keeps its Founder deferral. The governance checker
remains unwired from CI, and `main` still lacks `workflow_dispatch`.

---

## 9. HANDOFF TO `KORA-WP-139`

`/company/reports` is **cleared for WP139 typography migration** once this candidate reaches the canonical Product
line. `lib/design/kora-design-tokens.ts` and `components/ui/px/Workspace.tsx` were never edited by `140`, so `139`
inherits both with no merge coordination. The demonstrator surface now carries its final structure, so `139`'s type
migration lands once rather than being overwritten — which is what overlay O3 existed to guarantee.
