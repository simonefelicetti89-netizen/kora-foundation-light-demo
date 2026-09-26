# 218 — PX-A Canonicalization Design & Founder Decision Brief

**Mode: CANONICALIZATION DESIGN. Read-only with respect to Product code, tests, migrations,
Registry 142, Principles 143, Git, staging, Production and Vercel. Only this report written.
PX-A is NOT implemented. Registry 142 is NOT modified. No WP number is assigned.**

---

## 1. Founder acceptance of Audit 217

Report `217` is accepted as the current consolidation baseline. Verdict **B — accepted with
non-blocking qualifications**; all 10 post-163 WPs valid; mechanical DAG **COMPLETE 54 · READY 35 ·
BLOCKED 34 · TOTAL 123**; sequencing overlay **NOT_YET_READY 15**. Founder accepts recommendation
**B — canonicalize PX-A only**.

## 2. Why PX-A is required

Reports 210 and 217 established by census, not impression, that the 123-WP roadmap has **no
whole-platform owner** for Product Experience design, visual/art direction, typography, density,
surface hierarchy, interaction character, iconography, motion, data-visualisation language,
in-product brand expression, or visual quality acceptance. Of 32 experience dimensions: 3 COVERED
(baseline-only, all from `088`), 6 PARTIAL, **23 NOT COVERED**.

`047`, `073` and `088` successfully established the **structural** foundations — tokens, a11y
baseline, IA closure, responsive shell, literal/class hygiene. **They are not reopened.** PX-A exists
to supply **INTENT** before more UI-heavy implementation proceeds: **29 of the 35 READY WPs carry
material UI scope**, so every one started without a visual language compounds hidden Product
decisions and avoidable rework.

## 3. Provisional purpose (plain language)

> **KORA PRODUCT EXPERIENCE NORTH STAR & VISUAL LANGUAGE.** Decide, with the Founder, what a finished
> KORA looks like and how it behaves — as observable properties, not adjectives — and prove the
> direction on enough representative surfaces that later packages can build against it without
> re-deciding anything.

PX-A is a **design + adjudication + acceptance-contract** package. It is **not** an implementation WP,
not a frontend rewrite, not page-by-page polishing, and not a replacement for PX-B/PX-C.

## 4. Prerequisites (derived, not assumed)

| Prerequisite | Basis | State |
|---|---|---|
| `KORA-WP-047` Design System / A11y / IA | PX-A defines intent *on top of* the canonical token source `lib/design/kora-design-tokens.ts` | **COMPLETE** |
| `KORA-WP-073` Accessibility/IA Full Closure | PX-A must build on, not regress, the a11y baseline and the ratified five-environment IA | **COMPLETE** |
| `KORA-WP-088` Responsive/Design System Full Closure | PX-A defines responsive *quality* on top of solved responsive *engineering* | **COMPLETE** |
| Formal Consolidation Audit `217` accepted | governance precondition, **not a DAG edge** | accepted |

**No other dependency is real.** PX-A must be able to define Product Experience while the feature
roadmap remains incomplete — deliberately no artificial edges to domain WPs.

## 5. Scope — the 20 questions PX-A must resolve

Product Experience principles · visual direction · typography · density/spacing/rhythm · surface
language · navigation presentation (of the already-approved environments) · interaction language ·
motion · iconography · data visualisation · product states · forms/input · tables and dense
workflows · brand expression in-product · environment coherence and legitimate differentiation ·
responsive quality at 375/768/1440 and between · accessibility beyond compliance · microcopy/content
design · the visual-QA target · Founder visual acceptance.

Each must land as an **observable property with acceptance evidence**, never as an adjective.
"Modern", "beautiful", "premium", "Apple-like", "Stripe-like" are prohibited unless translated.
Report 210 §19's 25-dimension quality model is the starting frame; PX-A refines and freezes it.

**Colour:** WP-088's ratified semantics are respected as given — pillars LIFE `#C76F3D`, GROWTH
`#2F7D55`, CONNECTION `#D99767`, IMPACT `#D99A2B`, LEGACY `#8A7562`; brand Cosmic Blue `#06032B`,
Violet `#6156F5`; informational `#3B6EBA` family; ratified KORA Index macroblock categoricals. **PX-A
may design how these are used compositionally; it must not silently change their semantics.** Any
change requires explicit Founder adjudication.

**External references** are admitted only as *qualities*, never skins, and only through the chain
**REFERENCE → QUALITY OBSERVED → WHY RELEVANT TO KORA → KORA-SPECIFIC TRANSLATION**. No generic
dashboard aesthetic; no reference may override KORA semantics, the privacy boundary, or the
five-pillar grammar.

## 6. Out of scope (explicit)

Whole-product frontend remediation · component implementation beyond reference/prototype needs ·
full environment rollout · Living KORAL renderer · feature development · new business/domain
semantics · new IA unless the Founder approves · new backend architecture · new data model ·
migration work · Production deployment.

## 7. Founder decisions required (design-time, inside PX-A)

Visual direction and the definition of "premium" for KORA · typographic system and voice · density
philosophy (executive vs operator screens) · editorial vs utilitarian tone · surface/elevation
philosophy · environment differentiation vs uniformity · motion character, including whether motion
is used at all · iconography direction (library vs bespoke) · dashboard composition philosophy ·
data-visualisation philosophy and its relation to pillar colour semantics · brand prominence
in-product · illustration/graphic language: used or deliberately absent · degree of visual
distinctiveness vs enterprise familiarity · admitted references and their translation rule · any
material navigation-*presentation* change (IA *structure* is settled by `073`) · final visual
acceptance.

## 8. Deliverables

Product Experience North Star · visual principles · typography direction · spacing/density system
direction · surface hierarchy · interaction-state grammar · motion direction · iconography direction
· data-viz direction · brand-in-product rules · environment coherence/differentiation map ·
responsive quality rules · product-state grammar · benchmark/reference rationale (in the four-step
chain) · **representative screen studies** · **implementation handoff contract for PX-B** · **Founder
acceptance record**.

## 9. Acceptance model (the gate, specified — not a subjective checkbox)

PX-A is complete only when **all nine** hold:

| # | Gate | What the Founder actually sees and approves |
|---|---|---|
| A | North Star documented and coherent | one written document, principles stated as observable properties |
| B | Visual language documented sufficiently for implementation | the spec a PX-B engineer could build from with no further decisions |
| C | **Component/screen exemplars** | a named, fixed set of representative studies covering KORA's real screen types: an executive/KORA-Index surface, a dense operational table, a governance/review workflow, a worker-private surface, a form-heavy settings surface |
| D | **Multi-environment check** | the same direction shown working for Admin, Company, Worker, Partner, Advisor — **without requiring them to look identical** |
| E | **Responsive check** | each exemplar at 375 / 768 / 1440 |
| F | **Accessibility check** | direction does not regress `047`/`073` foundations — contrast and focus evidence on the exemplars |
| G | **Data-dense check** | proven on tables, dashboards and information-rich workflows, not only on spacious hero screens |
| H | **State check** | empty, loading/skeleton, error, recovery, success, warning, informational, unavailable, partial-data — shown, not described |
| I | **FOUNDER VISUAL ACCEPTANCE — MANDATORY** | a single recorded decision against the exact artefact set in C–H: each exemplar, at each of the three widths, with its state set. Acceptance names the artefact version it approves. Nothing is "accepted in principle." |

Gate I is what `117` lacked; specifying the artefact set in advance is the fix.

## 10. Relationship to WP-047 / WP-073 / WP-088

**Consumes and extends; reopens nothing.** `047` gave the token system and a11y baseline; `073` closed
a11y/IA site-wide and fixed `CURRENT_FIVE_ENVIRONMENT_ARCHITECTURE` as canonical IA; `088` closed
responsive engineering and literal/class hygiene. Those three closed **conformance**. PX-A adds
**intent**. PX-A does not re-derive tokens, does not redesign IA, and does not revisit responsive
engineering — it defines the *quality* expected on top of each.

## 11. Relationship to PX-B / PX-C

```
PX-A  defines intent
  ->  PX-B  translates frozen intent into reusable Product Experience system primitives
  ->  PX-C  applies/remediates environments and performs whole-product Visual/PX Acceptance
```

PX-B and PX-C remain **PROVISIONAL, NON-CANONICAL, UNNUMBERED, NOT STARTED**, and their detailed
acceptance criteria are deliberately **not** frozen here — they are defined by PX-A's output. Stating
the relationship is the whole of their treatment in this design.

## 12. Relationship to Living KORAL

Strictly separate. `KORA-WP-117` remains OPEN / Founder-deferred; `118`/`119` remain BLOCKED behind
it. PX-A **may define how Living KORAL eventually coexists** with the broader KORA product language —
where a KORAL Mark may appear, at what prominence, under what restraint. PX-A must **not** reopen
renderer work, create a Round 6, implement a 2D or 3D renderer, modify `BoundedKoralGeometry`, or
start Package B.

## 13. Existing READY-WP sequencing implication

**Strategically deferred until PX-A direction exists** (Founder decision; **mechanical Registry status
unchanged — these stay READY, are NOT converted to BLOCKED, and NOT_YET_READY is not misused to hide
a strategy choice**):

`063` · `064` · `066` · `068` · `069` · `070` · `072` · `074` · `075` · `076` · `077` · `085` · `086`
· `089` · `094` · `095` · `098` · `099`

**Also held for Founder/PX-A sequencing:** `048`, `071`, `039`.

**Not affected by PX-A** (no UI surface): `065`, `067`, `080`, plus scope-triggered `050`, `061`,
`087`; and the trivially-UI `012`, `019`, `049`.

## 14. WP-085 multidimensional status

| Dimension | Value |
|---|---|
| Mechanical Registry status | **READY** — numbered dependencies `016` + `028` both COMPLETE, unmet set empty |
| External condition | **Gate 3 (Legal/DPO) OPEN** |
| Sequencing overlay | strategically deferred pending PX-A (it carries a connector-config UI) |

All three dimensions stay explicit. `085` is **not** moved to mechanical BLOCKED for Gate 3, and
**not** labelled NOT_YET_READY to disguise the external blocker.

## 15. Production Readiness sequencing

Founder sequence, recorded: (1) complete PX-A canonicalization design — this report; (2) Founder
accepts the canonical PX-A specification; (3) **PX-A is not automatically implemented**; (4) begin
dedicated Production Readiness; (5) judge technical production readiness **independently** from
commercial/GA visual readiness.

- **PX-A implementation required before the next technical Production release: NO.**
- **PX pathway (A→B→C) expected before KORA is commercially/GA visually finished: YES**, unless a
  later Founder decision changes it.

The Vercel/Supabase environment-scoping **RELEASE BLOCKER** (staging `haqflkurpmeaxpikozjl` vs
production `azdnepfmwrmacruykskm`) belongs to Production Readiness and was **not** investigated here.
Migration 086's non-idempotent `DROP CONSTRAINT` is carried into the Production Readiness
migration-chain review as non-blocking audit debt — **not** remediated here.

## 16. Numbering / Registry integration analysis

**Evidence from Registry 142's own header and structure, read this task:**

- The namespace `001`–`123` is **contiguous — 123 specs, no gaps, no duplicates, no reserved or
  unused number.** There is no slot to occupy.
- **Extension beyond the current numbering is canonically permitted, with two executed precedents:**
  Living KORAL added `111`–`119` to the prior 110; Prime Preparation added `120`–`123` to 119.
- Both used the identical mechanism: **next sequential numbers**, **purely additive**, **every
  existing package reproduced verbatim with zero dependency/status/field change**, a **new registry
  version file superseding the prior one** (`142` supersedes `133`; `96`/`99`/`102`/`133` remain
  historical and must not be referenced by coding prompts), explicit **Founder authorization** naming
  its source package, a **distinct new Milestone label** (`I7-PREP`), **Bucket A/B totals unchanged**,
  `Primary Closures: none — new capability, no existing requirement ID`, `Evidence Gate: N/A`, its
  own accounting section (AH for Living KORAL, AH-2 for Prime Preparation), exclusion from the
  Sections N–X cuts, and the explicit statement that **roadmap insertion is not runtime activation**.

**Answers:**

| Question | Answer |
|---|---|
| Unused/reserved number available? | **NO** — the namespace is contiguous |
| Extension canonically permitted? | **YES** — two documented precedents |
| Next sequential number? | **YES** — `KORA-WP-124` |
| Registry amendment required? | **YES** |
| Should 142 be edited in place? | **NO** |
| Should the 123 remain an immutable baseline with an Extension Registry? | **Effectively yes, by the established mechanism** |

**Safest governance recommendation:** do **not** edit `142`. Create a **new registry version file**
that supersedes it, reproduces `001`–`123` verbatim and unchanged, and adds **`KORA-WP-124`** under a
new distinct milestone label — proposed **`PX — PRODUCT EXPERIENCE`** — with its own accounting
section (`AH-3`), excluded from the Sections N–X cuts, carrying `Primary Closures: none — new
capability, no existing requirement ID` and `Evidence Gate: N/A`, and stating that insertion is not
activation. `142` then becomes historical alongside `96`/`99`/`102`/`133`.

**`KORA-WP-124` is proposed, not assigned.** It is canonically justified by the two precedents, but
the number becomes real only when the Founder authorizes the new registry version.

## 17. Proposed canonical PX-A specification (registry field grammar, for the new registry version)

> **`KORA-WP-124`** — KORA Product Experience North Star & Visual Language — **PX** — Purpose: supply
> the whole-platform Product Experience and visual/art-direction INTENT that the 123-package roadmap
> never owned, and prove it on representative surfaces, so later packages implement against a frozen
> direction instead of re-deciding it — Pilot Status: NOT BASE PILOT SCOPE — Primary Closures: none —
> new capability, no existing requirement ID — Early-Slice: N/A — this package IS the intent layer;
> PX-B/PX-C are its downstream, not its slices — Arch Sources: reports `210` (32-dimension coverage
> census), `217` (Formal Consolidation Audit), `docs/30`, `lib/design/kora-design-tokens.ts` — Code
> Truth: ABSENT — no canonical package owns this today — Existing Paths: `lib/design/kora-design-tokens.ts`
> (consumed, extended, never re-derived) — Proposed New: canonical Product Experience specification +
> representative screen studies + PX-B handoff contract — Hard Deps: `KORA-WP-047`, `KORA-WP-073`,
> `KORA-WP-088` — Conditional Deps: N/A — Parallelization: fully parallel with all non-UI packages;
> deliberately sequenced BEFORE the UI-bearing READY set — Data/Migration Impact: NONE —
> Expand/Migrate/Cutover/Contract: N/A — no schema change — Service/API: N/A — Auth/RLS: N/A — no
> auth surface — UI: **is the deliverable, as specification plus exemplars — NOT as environment-wide
> implementation** — Privacy/Trust: must preserve the privacy boundary and suppression experience as
> designed surfaces, never decorate them away — Audit: Founder acceptance recorded as a decision
> entry — ADMIN-020/Econ-Evidence: N/A — Async/Idempotency: N/A — Tests: no runtime tests; acceptance
> is artefact-based per gates A–I, plus a contrast/focus check on each exemplar proving no `047`/`073`
> regression — Feature Flag: NO — Rollback: specification-only, nothing to roll back — Acceptance:
> gates A–I of report `218` §9 all satisfied, **including explicit Founder visual acceptance naming
> the approved artefact version** — Out of Scope: whole-product frontend remediation, component
> implementation beyond exemplars, environment rollout, Living KORAL renderer, feature development,
> new domain semantics, new IA absent Founder approval, backend/data-model/migration work, Production
> deployment — Size: **M** — Uncertainty: MEDIUM (design convergence, not technical risk) — External
> Blockers: none — Evidence Gate: N/A.

**Expected later implementation breadth:** PX-A **MEDIUM** · PX-B likely LARGE · PX-C likely LARGE.

## 18. Founder decisions still required before any Registry mutation

1. **Authorize the new registry version** superseding `142` (do not edit `142`).
2. **Ratify `KORA-WP-124`** as the number, or direct otherwise.
3. **Ratify the milestone label** `PX — PRODUCT EXPERIENCE`, or name another.
4. **Ratify the Hard Deps** `047`, `073`, `088` — and confirm no artificial domain dependency is wanted.
5. **Ratify the acceptance gate A–I**, in particular the exact exemplar set in gate C.
6. **Confirm the strategic deferral list** in §13 stays a sequencing decision with unchanged mechanical status.
7. **Confirm `048`, `071`, `039`** — before or after PX-A.
8. **Confirm PX-A is not auto-started** on acceptance of this design.

## 19. Recommended immediate next step

**Founder accepts (or amends) the §17 specification and the §16 numbering mechanism. Then the single
next action is to author the new registry version** — reproducing `001`–`123` verbatim and adding
`124` — as its own governed task, reviewed before it supersedes `142`. **Production Readiness begins
after that**, per §15; PX-A implementation is a separate, later, separately-authorized task.

## 20. Boundary attestations

No Product code, test, migration, Registry 142, Principles 143, historical-report, Git, staging,
Production or Vercel modification. No database contacted. No commit, no push. **PX-A not implemented;
PX-B/PX-C not implemented and not frozen. No WP number assigned. No new WP started. WP-080 not
started. Production Readiness not started.** Living KORAL untouched — `117` not reopened, no Round 6,
no Package B, `BoundedKoralGeometry` unmodified. `scripts/provision-next-review.mjs` never addressed
by any command.

---

**Report 218 · PX-A canonicalization design · proposed `KORA-WP-124` under a new registry version · awaiting Founder authorization**
