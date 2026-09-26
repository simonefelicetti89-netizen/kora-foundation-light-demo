# 270 — KORA-WP-139 TYPOGRAPHY FOUNDATION AND MIGRATION — FINAL ACCEPTANCE AND EXACT-SHA CI COMPLETION

**Date:** 2026-09-26 · **Package:** `KORA-WP-139` (PX-D, DAG root) · **Transition:** READY → **COMPLETE**
**Candidate:** `cadb4178e943a774bab23d89c472623c22de7da6` · **Baseline:** `c46f2680cbd43b5e2c47c65b6688184fa8d109a7`
**Exact-SHA CI:** KORA CI #333, run `36195486621`, **attempt 2**, all four mandatory jobs green
**Canonical typography source:** `docs/BENCHMARK_V2_CANONICAL_GRAMMAR.md` §5 (Founder-ratified, governance commit `d4a815e`)

---

## 1. THE FOUNDER RULING, FIRST

**Founder Visual Acceptance: PASSED — WP139 TYPOGRAPHY SCOPE ONLY**, on the current screenshots for both canonical
demonstrators: `/company/reports` and `/advisor/companies/[assignmentId]`.

**Explicitly NOT approved:** `KORA-WP-141` composition · mobile information architecture · `KORA-WP-142` data
storytelling · the **overall Product Experience, which remains NOT ACCEPTED AS FINAL QUALITY** · **Benchmark V2 final
visual acceptance, which is NOT granted.**

Downstream observations, recorded as inputs and **not** as WP139 defects:

| Observation | Owner |
|---|---|
| Advisor mobile tab compression | `KORA-WP-141` |
| Overall density / vertical length | `KORA-WP-141` |
| Raw qualification identifiers surfaced in the UI | later UX/content/product adjudication |
| Data storytelling | `KORA-WP-142` |

No package was allocated for any of these.

---

## 2. THE TYPOGRAPHY ARCHITECTURE

`TYPE` lives in the existing `lib/design/kora-design-tokens.ts` — **no second typography system** — and is the single
numeric authority. The `.kt-*` classes in `app/globals.css` exist for one reason a style object cannot serve:
`display`, `title` and `section` need a mobile variant, and a media query cannot live inline. A test parses those
classes and asserts they match `TYPE` exactly, so the two cannot drift.

**Provenance matters here.** The values are transcribed from `docs/BENCHMARK_V2_CANONICAL_GRAMMAR.md` §5, **not** from
`design/wp124-final/kora-signal.css`. That prototype remains normative for **colour** — the `PX` block is untouched
and still asserted verbatim against it — but its lower register sat 1–3px below the Benchmark V2 bar, and Benchmark V2
was ratified later precisely because the earlier quality bar was insufficient. A historical normative implementation
does not override a later quality bar.

### The nine-role scale

| Role | Desktop | Mobile | Line height | Weight | Tracking |
|---|---|---|---|---|---|
| display | 60 | 42 | 0.95 | 800 | -0.045em |
| title | 32 | 26 | 1.10 | 700 | -0.030em |
| section | 20 | 18 | 1.25 | 700 | -0.022em |
| subsection | 16 | — | 1.30 | 700 | -0.018em |
| body | 15 | — | 1.60 | 400 / 500 | -0.005em |
| secondary | 14 | — | 1.50 | 400–600 | 0 |
| label | 13 | — | 1.40 | 600–700 | 0.005em |
| caption | 12 | — | 1.45 | 500–600 | 0.010em |
| meta | 11 | — | 1.35 | 700, uppercase | 0.070em |

**11px is an absolute floor and is reserved for `meta` alone.** Sustained reading never drops below 12px.
**Body is 15px and has no mobile variant** — shrinking sustained reading text on the smaller screen is the opposite of
the point. Only the three roles that genuinely overflow a 375px viewport carry a mobile value. Every documented weight
is a statically loadable Plus Jakarta Sans instance; 750, which the prototype used, is deliberately not requested.

### One Product UI family

| Family | Before | Decision |
|---|---|---|
| Plus Jakarta Sans | ~115 consumers | **Retained** — sole Product UI family, **weight 800 added** for `display` |
| Instrument Serif | **0 consumers** | Removed — loaded and rendered no text anywhere |
| Playfair Display | **0 consumers** | Removed — same |
| Hanken Grotesk | 3 consumers | Removed, all three migrated |

**No editorial family survives Wave 1** — none of the nine roles asks for a serif. The dead `.font-editorial` /
`.font-kora-serif` shims and their tokens went too; neither had a consumer left.

### PrivilegedAccessBanner — a signal moved, not dropped

On that banner the family was partly a **signalling device**. Removing it without replacement would have quietly
downgraded a privileged-access warning, so the signal moved onto structure: the label now carries the canonical `meta`
role (uppercase, tracked, weight 700), which is what the bespoke family was standing in for. `role="alert"`,
`aria-live`, sticky placement, the pulsing dot and the per-variant colour are untouched. The `B168` assertion pinning
`--font-hanken` was superseded in place, with its real intent — that the banner stays typographically distinct —
preserved as a structural assertion.

### Shared primitives

Nine components in `components/ui/px/Text.tsx`, one per role, exported through the existing px index.
**No `size`, `variant` or `fontSize` prop.** The only modifiers are `emphasis` (a weight the role's own documented
range already permits) and `tabular`, for figures a reader compares down a column. `<Label>` and `fontSize: 13` render
the same pixels today, but only one of them still says something true after a recalibration, and only one can be
audited. The WP-125/WP-140 primitives were migrated onto the roles too, under the overlay O2 ownership split.

---

## 3. THE DEMONSTRATORS

- **`/company/reports`** — states roles, not sizes. `display` (tabular) for the headline figure, `body` for prose,
  `meta` for eyebrows, `caption` for the reading floor, monospace governance stamps kept lowercase on the caption step.
  **Not one hand-written size remains** and the page lints at zero problems. Every WP-140 role, state, the Privacy
  Boundary and the duplicate-label remediation survive, asserted by test.
- **`/advisor/companies/[assignmentId]`** — migrated across **all seven tab entry points**. Three uppercase
  micro-labels became `meta` at the floor; a timestamp read in sequence took the reading floor instead. The route was
  not renamed and no already-conforming surface was churned.

---

## 4. THE DEFECT THIS PACKAGE FOUND AGAINST ITS OWN EARLIER EVIDENCE

The first `(E)` measurement used a **static import-closure walk** and reported zero sub-floor text on both
demonstrators. That was wrong, and the Advisor visual evidence exposed it: `AppShell`, `Sidebar`, `Header` and
`AccountMenu` render on both surfaces but are mounted by the **layout**, so they appear in **no page's import
closure**. The browser was rendering **22 sub-floor nodes on `/company/reports`** and **6 on the Advisor surface** —
navigation descriptions at 10px, group labels at 10px, `preview` badges at 8px, avatar initials at 9px, a role label at
10.5px — while the static measure said zero.

**The floor is a property of the RENDERED surface**, so the chrome is in scope. Corrected in `cadb417`: 13 inline and
4 Tailwind sizes raised, no layout, navigation semantics, route or colour touched. **Runtime re-measurement with real
local sessions now reports 0 sub-floor nodes on both demonstrators.** A guard over the four chrome components prevents
regression and is mutation-proved.

Two other things were found by looking rather than by testing, and are recorded as such: the metric hierarchy —
putting both figures on `display` made the Confidence Score compete with the KORA Index, fixed in `a4ca40b` by moving
the Supporting Metric to `title` — and, during the CI investigation, an invalid local reproduction of my own, described
in §6.

---

## 5. ENFORCEMENT — WARN, STAGED, NOT A FLAG DAY

The lint selects `Property[key.name='fontSize']`, not a px regex: **1,882 of ~2,600 inline decisions are bare
numbers**, so a literal-only rule would miss 72% of the population. It runs at **WARN** — `npm run lint` passes no
`--max-warnings`, so it reports without failing — which is the level this package contracts for. Product-wide it
reports **0 errors and ~2,610 warnings**: evidence, never a quota. The canonical sources are exempt, because defining
the scale is not drift. **Escalation to BLOCK is programme Definition of Done, owned by `KORA-WP-126`**, and the
config says so. Migration order remains `SYSTEM → PRIMITIVES → DEMONSTRATORS → PERSONA MIGRATION → RESIDUAL SWEEP →
HARDENING`; this package delivered the first three, and residual legacy is deliberately left to its owning packages.

---

## 6. EVIDENCE

### Candidate chain

```
c46f268  canonical baseline
 → c7057d7  the nine-role scale, one family, primitives, WARN lint
 → dc91f90  both demonstrators migrated
 → a4ca40b  Supporting Metric stops competing with the Primary
 → cadb417  shared chrome raised above the floor
```
Four commits, **0 merge commits**, linear.

### Tests

WP139 suite **31 tests**, CI-safe (no `git show`; the closure walk reads the working tree). Full suite at the
candidate: **434 files / 13,832 tests / 0 failures**; `tsc` clean; `eslint` 0 errors; `git diff --check` clean.
**Eleven mutation proofs**, each caught with clean attribution: body shrinking on mobile · a role below the floor · a
second role at the floor · CSS/token drift · a dead family returning · weight 800 dropped · sub-floor text returning on
Advisor · lint escalated past its phase · WP-140 structure lost · the privileged label leaving the scale · a chrome
label returning to 10px.

### Exact-SHA CI

**KORA CI #333**, run `36195486621`, event `push`, branch `integration/wp139-ci-proof-2026-09-25`, head
`cadb4178e943a774bab23d89c472623c22de7da6`.

| Attempt | DB-backed gate | RLS | R0-A | Workflow |
|---|---|---|---|---|
| 1 | **failure** | 329/329 | 186 total, **185 passed, 1 failed**, 0 skipped | failure |
| 2 | **success** | 329/329 | 186 total, **186 passed, 0 failed**, 0 skipped | **success** |

Attempt 1's single failure was `wp-045 STEP 6` with
`Could not find the 'source_attributes' column of 'observed_investment_fact' in the schema cache`.

**Classification: FIRST FAILURE DID NOT REPRODUCE ON THE IDENTICAL CANDIDATE SHA. No root cause is claimed and no
transient is asserted.** What is established: the same commit, the same job, the same 186 tests — red once, green once,
with **no Product change between attempts**; CI applied all 83 migrations including
`089_investment_source_attributes_flexible_edge.sql`, which creates that column; the candidate's diff touches neither
the investment service nor that test; and the same 186 tests pass locally on a database built from the candidate's own
migration set. On attempt 2 the string `schema cache` does not appear in the log at all. **This is not a WP139
regression, and must never be recorded as one.**

**A mistake of my own, recorded because it briefly produced false evidence:** my first local reproduction *did* fail,
and I initially read it as a pre-existing repository defect — "the column exists in no migration". That was wrong. I
had run `supabase db reset` from `/Users/simonefelicetti/KORA`, which sits on a different branch with **81**
migrations and lacks 089/090. Re-running from the candidate's own worktree (83 migrations) applied the column and the
suite passed 186/186. The invalid run was discarded; only the corrected one is evidence.

### Visual

Local synthetic fixtures only, captured in-browser with real sessions. For the Advisor surface one temporary
synthetic local auth identity was created under explicit authorization and removed afterwards; one
`advisor.advisor_identity` row could not be deleted because the governance model grants DELETE to no role, and that
was **not** bypassed with superuser cleanup. Screenshots are scratch evidence and are **not committed** — metadata
only, because they carry synthetic account identifiers.

---

## 7. REGISTRY DELTA

| Change | Detail |
|---|---|
| `AL.2` | COMPLETE set 66 → **67**; `139` added |
| Aggregate | **COMPLETE 67 · READY 36 · BLOCKED 41 · TOTAL 144**; prior struck |
| Section C | `KORA-WP-139` STATUS marker READY → COMPLETE, prior state struck |
| `AL.3` | Evidence row — exact-SHA CI attempt 2 plus Founder Visual Acceptance |
| `AN.5` | **W1 CLOSED** — both roots complete; W2 (`141` ‖ `142`) now executable |

**Mechanically derived, never fitted.** One ratified transition and exactly two consequences: `139` READY → COMPLETE,
and — because `139` was the last unmet Hard Dep of each — **`141` BLOCKED → READY** and **`142` BLOCKED → READY**.
**`126` and `143` stay BLOCKED**, both additionally depending on `141` and `142`. No other package moves. Graph
unchanged: 144 nodes, 225 hard edges, 5 conditional, 4 triggers, 0 cycles. Checker: 10 invariants, 0 FAIL,
**INV-08 PASS** (derived 67/36/41/144 == declared).

---

## 8. ROLLBACK

Per-surface and independently revertible, as the package's own contract requires. Reverting `cadb417` restores the
chrome sizes; `a4ca40b` the metric hierarchy; `dc91f90` the demonstrator migration; `c7057d7` the scale, the family
plan and the lint. The canonical integration line can be reset to `c46f268` by the same fast-forward mechanism that
advanced it. No migration, schema, RLS, persistence or auth change was made, so nothing outside the repository needs
unwinding.

---

## 9. WHAT THIS CLOSURE DOES NOT DO

It does not accept the overall Product Experience · it does not grant Benchmark V2 final visual acceptance · it does
not close `141`, `142`, `143` or `126` · it allocates no package · it advances no gate. Gate 3, Gate 5, `F-12`,
`TRUST-04` and `EV-R02` are unchanged. `KORA-WP-117` keeps its Founder deferral. The governance checker remains
unwired from CI, and `main` still lacks `workflow_dispatch`. The staging/repository `service_role` grant divergence
recorded in report `269` remains open and unrepaired.
