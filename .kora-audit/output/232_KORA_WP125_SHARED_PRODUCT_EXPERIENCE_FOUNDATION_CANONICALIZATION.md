# KORA — PRODUCT EXPERIENCE IMPLEMENTATION GAP: FOUNDER DECISION AND CANONICALIZATION OF `KORA-WP-125`

**Report:** `232`
**Date:** 2026-09-20
**Type:** Governance / roadmap canonicalization. **No implementation, no code, no branch, no commit.**
**Registry touched:** `219` only.
**Supersedes:** nothing. **Overwrites:** nothing.

---

## 1. THE PRODUCT EXPERIENCE IMPLEMENTATION GAP

`KORA-WP-124` (PX-A) completed on 2026-09-20 with Gate I MET — explicit Founder Visual Acceptance of the KORA Product Experience, its visual language, seven exemplars across six environments, the responsive direction at 375/768/1440, the interaction and state language, and the implementation handoff (report `231`; artefacts `design/wp124-final/`).

`124` froze **intent**. It did not, and by its own specification could not, implement it:

- **`124` Code Truth:** "ABSENT — no canonical package owns whole-platform Product Experience or visual/art direction today; `047`/`073`/`088` closed structural conformance only."
- **`124` UI field:** "is the deliverable, as specification plus representative exemplars — **NOT as environment-wide implementation**."
- **`124` Out of Scope:** "whole-product frontend remediation; full component-system implementation; environment-wide rollout; page-by-page visual cleanup; … **PX-B implementation; PX-C implementation**."

Registry `219` declined to canonicalize the implementation layer in three separate places — the DELTA 1 preamble, the `PX` Section B preamble, and Section AH-3 ("**PX-B and PX-C remain PROVISIONAL, UNNUMBERED, NON-CANONICAL and NOT STARTED**").

Cross-check: registry `102` contains zero occurrences of "PX-B", "PX-C" or "Product Experience", and its namespace ends at `KORA-WP-110`. It cannot contain the package either.

**Conclusion: no numbered package existed between `124`'s frozen intent and the 21 UI-bearing packages.** The gap was structural, not an oversight of reading.

### Why `047` / `073` / `088` do not close it

| WP | Title | Status | Why it does not own the rollout |
|---|---|---|---|
| `047` | Design System / A11y / IA | COMPLETE | "pilot-relevant accessibility/design/IA subset"; Out of Scope: "full site-wide closure". A pilot-slice subset against the **legacy** visual system. Hard Dep *of* `124`. |
| `073` | Accessibility/IA Full Closure | COMPLETE | Site-wide, but its subject is accessibility and information architecture — not visual language, shell presentation or component primitives. Its IA semantics are explicitly protected from `125`. |
| `088` | Responsive/Design System Full Closure | COMPLETE | Site-wide **structural** responsive conformance of the legacy shell. It is the guard that correctly caught `KORA-WP-039`'s local colour adapter; `125` must strengthen it, never relax it. |

---

## 2. FOUNDER DECISION

The Founder confirmed the gap and authorized canonicalization of **one** new roadmap package:

> **`KORA-WP-125` — Shared Product Experience Foundation — Milestone `PX-B` — mechanical status READY — Hard Dep `KORA-WP-124` — canonicalized, NOT started.**

Registry authority ruling issued with the decision:

- `102` remains **untouched** and continues to govern its historical/executable scope for `KORA-WP-001`–`110`, per `CLAUDE.md` §8.
- `219` is the canonical Master Plan for **post-`110` roadmap additions** and already canonicalized `124`; `125` is added to `219` **only**.
- `CLAUDE.md` and historical registry `142` are **not** modified.

**Residual wording tension, flagged not resolved:** `219`'s own opening paragraph (DELTA 1, predating this ruling) states that "no future coding prompt may reference" `96`, `99`, `102`, `133`, `142`. The Founder's ruling narrows that for `102`. The original wording is preserved verbatim in `219` as historical text; the narrowing is recorded alongside it in the DELTA 2 preamble. No historical sentence was deleted.

---

## 3. RATIONALE FROM REAL PRODUCT EVIDENCE (`KORA-WP-039`)

This is measured, not theoretical. `KORA-WP-039` was the first real Product implementation against the frozen `124` direction, built with full Founder oversight and exhaustive verification (32 focused tests, 13 425-test full regression, tsc/ESLint/build all green). Building one page against intent with no shared layer produced:

1. a **218-line route-local stylesheet** duplicating shell-level surface, table, form and state grammar;
2. a **34-declaration route-local colour-token adapter**;
3. a **named local exemption inside the completed `KORA-WP-088` presentation-colour guard**, plus a bespoke ten-assertion pinning block to contain it;
4. **page responsive behaviour keyed to viewport width** while the real constraint is **container** width;
5. five visual defects on the real route, two of which (`D2`, and the container width driving `D1`) are **not fixable from inside a page**.

Real-Product capture confirmed the systemic symptom: the page body carried the approved Product Experience while the surrounding shell — sidebar, top/demo/scenario chrome, responsive behaviour — remained legacy, and at 768px the persistent legacy sidebar reduced the content container to roughly 530px, rendering the table unusable.

**Cost asymmetry.** The foundation is built once either way. Built **first**, 21 packages consume it. Built **last**, it forces up to 21 local stylesheets, 21 token adapters, 21 guard exemptions and 21 disagreeing responsive models to be rewritten.

---

## 4. `KORA-WP-125` CANONICAL SPECIFICATION

Recorded in full in `219` Section B (`PX-B`). Summary of the governing fields:

| Field | Value |
|---|---|
| Number | `KORA-WP-125` |
| Title | Shared Product Experience Foundation |
| Milestone | `PX-B` (implementation — deliberately distinct from `PX`, which is intent) |
| Mechanical status | **READY** — sole numbered Hard Dep `124` is COMPLETE, unmet set empty |
| Execution status | **ACTIVATED 2026-09-20 — IMPLEMENTATION NOT YET STARTED** (activation is an execution event, not a fourth mechanical status) |
| Hard Deps | `KORA-WP-124` (transitively `047`, `073`, `088` — all COMPLETE) |
| Pilot Status | **NOT BASE PILOT SCOPE — Founder-ratified 2026-09-20** |
| External Blockers | none |
| Data/Migration Impact | NONE — no database, no migration |
| Gate 3 / Production | no dependency on either |
| UI | **IS THE DELIVERABLE** |
| Size / Uncertainty | L / MEDIUM |
| Evidence Gate | N/A · Primary Closures: none · Feature Flag: NO |

**In scope:** application shell presentation (canvas, sidebar/navigation, collapsed rail, mobile navigation, top chrome, workspace/environment identity, content-width behaviour); canonical responsive shell model; canonical shared Product Experience token source; typography wiring (Plus Jakarta Sans, no serif in core Product UI); shared primitives (surfaces, buttons, form controls, selects, date control, table foundation, statuses/chips, alerts, loading/empty/error/success/disabled states, icon controls, focus, environment and dense-vs-standard layout); table foundation preventing the `039` `D1`/`D2` defect class; Italian-first date/form treatment preventing `D5`; `lucide-react` conventions; preservation and strengthening of `047`/`073`/`088` accessibility foundations; an explicit, documented migration strategy for `lib/design/kora-design-tokens.ts`.

**Out of scope:** business logic; domain models; DB migrations; auth model; rewriting every page; page-by-page environment migration; any change to `073` IA or navigation **semantics** (presentation only); any change to the approved `124` direction; Gate 3; Production; Supabase remote; Vercel Production; PX-C; completion of the 21 UI-bearing packages.

Eleven acceptance gates (A)–(K). **The criterion that prevents a shelf-ware outcome — Acceptance gate (J):** the foundation must be **applied to the real common application shell**, such that opening the real Product materially looks and behaves like the `124`-approved Product Experience at the shared-shell level. A component library in a folder while the real Product looks unchanged does **not** satisfy `125`. **Gate (K)** additionally requires **explicit Founder Visual Acceptance of the real Product** before mechanical COMPLETE — see §8.2.

**Recommended baseline — verified, not assumed:** `84128e81b0bb5a617bb7c3ac7802d1a5491c2a84`. It carries the 42 Gate I-accepted `design/wp124-final/` artefacts; the frozen RC `5f9426974791b6e2ff292aa7634860c4666bd91a` **is** an ancestor; the Gate 3 commit `0cdc7e0dd1c9293b25a84bb921942cc792052427` is **not** an ancestor; and it is exactly RC + one commit with no unrelated drift.

---

## 5. SEQUENCING IMPACT ON THE 21 UI-BEARING PACKAGES

`039`, `048`, `063`, `064`, `066`, `068`, `069`, `070`, `071`, `072`, `074`, `075`, `076`, `077`, `085`, `086`, `089`, `094`, `095`, `098`, `099`.

The `124` strategic deferral was SATISFIED on 2026-09-20 and remains satisfied. A **new and separate** evidence-based overlay now applies to the same 21:

> **`WP125 Product Experience Foundation must precede further UI-bearing implementation.`**

**This is a sequencing overlay only.** Mechanical statuses are unchanged, none is marked BLOCKED, `NOT_YET_READY` is not repurposed, and **no hard-dependency edge to `125` is added to any of the 21 historical package definitions**. The only new edge in DELTA 2 is `124→125`.

`KORA-WP-085` continues to retain its independent `External Blockers: Gate 3 OPEN` condition, which is neither absorbed into nor obscured by either overlay.

---

## 6. `KORA-WP-039` DISPOSITION

**READY / activated / IMPLEMENTATION PAUSED BEFORE COMMIT (2026-09-20).** Mechanical Registry status unchanged — the schema requires no new representation and none was invented; the pause is recorded as a multidimensional note mirroring the `085` precedent.

**Retained, not discarded:** prerequisite-eligibility Admin capability; `app/api/admin/advisor-prerequisites/route.ts` reusing canonical service functions with no duplicated business logic; three-layer KORA_ADMIN auth; the append-only `audit.governance_event` chain proven to fire per decision; `KORA-WP-031` validity reused unchanged; 32 focused tests; full regression green.

**Worktree untouched** at baseline `84128e81…` — nothing staged, nothing committed, nothing pushed.

**Expected after `125` completes** (not authorized now): resume from the `125` baseline; retain the functional implementation; replace the local Product Experience CSS and token adapter with the shared foundation; remove the temporary local-colour exemption from the `088` guard; fix page-level composition defects `D3`/`D4`; revalidate `D1`/`D2`/`D5` against the shared foundation.

**Defect ownership:** `D2` and `D5` → shared foundation. `D1` → split (foundation owns the table primitive; `039` owns its column choices). `D3`, `D4` → `039`, mitigated by foundation primitives.

---

## 7. PX-C

**PX-C remains PROVISIONAL, UNNUMBERED, NON-CANONICAL and NOT STARTED.** No `KORA-WP-126` is created by this decision or this report. Its acceptance criteria remain deliberately unfrozen and will be defined once `125` supplies implementation truth.

---

## 8. VERIFIED POST-CHANGE COUNTS

Mechanically re-derived from `219`'s own Section C edge list after the edit, not copied from the instruction:

| Metric | Before | After | Δ |
|---|---|---|---|
| Nodes | 124 | **125** | +1 (`125`) |
| COMPLETE | 55 | **55** | 0 |
| READY | 35 | **36** | +1 (`125`) |
| BLOCKED | 34 | **34** | 0 |
| **TOTAL** | 124 | **125** | +1 |
| Hard edges | 196 | **197** | +1 (`124→125`) |
| Conditional edges | 5 | 5 | 0 |
| Scope triggers | 4 | 4 | 0 |
| Bucket A / B / Total | 190 / 67 / 257 | 190 / 67 / 257 | 0 |

Verification performed by parsing the Section C DAG line directly: **125 nodes, contiguous `001`–`125`, no gaps, no duplicates; 197 edges; `125:124`; 55 + 36 + 34 = 125 = node count.** The Founder-supplied expected counts were confirmed correct, not assumed.

**Pilot Status — CLOSED.** Initially supplied by inference and flagged; **Founder-ratified `NOT BASE PILOT SCOPE` on 2026-09-20**. No field of `125` is now inferred or awaiting correction.

### 8.1 Hard-edge count — stale-aggregate clarification (Founder-requested, mechanically confirmed)

| Source | Value | Verdict |
|---|---|---|
| `219` Section C prose, pre-edit | 193 | **STALE declared aggregate** — written at DELTA 1, never updated when `124:047,073,088` was appended to Section C's own list |
| `219` Section F, pre-edit | 196 | **already correct** |
| Section C edge list actually parsed, pre-`125` | **196** | ground truth |
| Section C edge list actually parsed, post-`125` | **197** | ground truth |

> **`193` was the stale declared aggregate; the actual pre-WP125 DAG already contained 196 hard edges; WP125 adds exactly one new hard edge (`125 → 124`), producing 197.**

Confirmed by machine diff of the two DAG lines: the **only** changed or added entry is `125: 124`. **`KORA-WP-125` did not add four edges** — three of the four were `KORA-WP-124`'s own, already present in the list and merely unreported by Section C's prose. Section C now carries this clarification, with the stale sentence preserved as historical text.

## 8.2 FOUNDER VISUAL QUALITY BAR — narrow clarification (2026-09-20)

Canonical `KORA-WP-125` acceptance requirement, recorded here and in `219` Section B (`PX-B`). **This clarifies `125` only; `KORA-WP-124` is unchanged.**

The `124` exemplars are **not loose inspiration** — they define the **minimum accepted visual-quality level for the real KORA Product**. `125` need not reproduce exemplar screens pixel-for-pixel where real Product semantics differ, but **the real Product must reach the same quality bar**: Product maturity, shell/navigation quality, visual hierarchy, information density, workspace composition, use of available viewport, typography, surfaces, controls, tables and forms, responsive behaviour, interaction and state quality, environment differentiation, overall enterprise-software finish.

**A technically correct implementation that still visibly resembles legacy KORA does NOT satisfy `125`. Green tests are necessary but NOT sufficient.**

Acceptance gate **(K)**: **EXPLICIT FOUNDER VISUAL ACCEPTANCE** of the **real** application, before mechanical COMPLETE. Closure evidence must be real Next.js Product routes on local/synthetic data — never `124` exemplars, never static mocks — at minimum **1440 / 768 / 375**, across enough representative authenticated environments to prove the shared shell is genuinely common and not hard-coded to one page. `125` cannot close because tokens exist, components exist, the build passes, tests pass, or a new shell exists in code while real routes still look legacy.

## 8.3 ACTIVATION

**`KORA-WP-125` — ACTIVATED 2026-09-20, IMPLEMENTATION NOT YET STARTED.** Activation is an execution event, not a mechanical status: `125` remains mechanically **READY**, the three-status model is unchanged, and the aggregate remains **55 / 36 / 34 / 125**. The 21-package `PX-B` overlay remains in force; `KORA-WP-039` remains paused before commit. Worktree `/Users/simonefelicetti/KORA-wp125-worktree`, branch `feature/kora-wp-125-shared-product-experience-foundation`, baseline `84128e81b0bb5a617bb7c3ac7802d1a5491c2a84`.

---

## 9. PRESERVED WITHOUT CHANGE

- `KORA-WP-085` — `External Blockers: Gate 3 OPEN`, intact.
- `KORA-WP-117` — OPEN / Founder-deferred / NOT COMPLETE, with `118`/`119` behind it, intact.
- `KORA-WP-120` — registry inconsistency remains open and untouched.
- `CLAUDE.md` §6 multi-record Admin interpretation — remains an open governance interpretation (recorded in `design/wp124-final/HANDOFF.md` §22 as escalate-never-invent), neither resolved nor pre-judged.
- Every package `001`–`124`: Title, Milestone, Hard Deps, Pilot Status and all 32 fields unchanged; no renumbering.
- Registry `102`, `CLAUDE.md`, registry `142`: not modified.
- Gate 3 isolated on `gate3/prelive-privacy-remediation @ 0cdc7e0d…`; PR #172 frozen and unmerged at `5f942697…`.

---

## 10. WHAT THIS REPORT DOES NOT DO

No worktree created, no branch created, no Product code modified, no `KORA-WP-039` change, no commit, no push, no Gate 3 action, no Supabase, no Vercel, no Production, no PR merge, no Scope Trigger introduced or activated, no WP activated.

`KORA-WP-125` is **canonicalized, NOT started.** Activation requires an explicit Founder instruction.
