# 210 — KORA Full 123-WP DAG Recomputation + Product Experience / Visual Excellence Audit (Post WP-088)

**Mode: READ-ONLY canonical audit. Nothing implemented, nothing canonicalized, nothing started.**

---

## 1. Executive conclusion

**Mechanical DAG, recomputed from zero against Registry 142:
COMPLETE 53 · READY 35 · BLOCKED 35 · TOTAL 123.** Sequencing overlay (separate, non-participating):
**NOT_YET_READY 15**.

**Roadmap gap conclusion: D — ROADMAP GAP, MULTIPLE NEW WPs REQUIRED (three).**

The canonical 123-WP roadmap does **not** contain sufficient work to produce a top-tier, deliberately
designed KORA Product Experience. This is not an impression — it is a keyword-and-field census over
all 123 specifications. Of the 32 whole-platform experience dimensions audited, **6 are COVERED, 5
are PARTIALLY COVERED, and 21 are NOT COVERED by any canonical WP**. The registry contains **zero**
occurrences of typography, iconography, illustration, empty states, success/confirmation states,
data-visualization language, hover/focus/pressed state design, motion grammar, microcopy/content
design, perceived performance, brand expression in-product, visual regression/screenshot QA,
usability validation, or Founder visual acceptance — in any of the 123 specs.

WP-047, WP-073 and WP-088 each delivered their actual canonical scope in full and must not be
reopened. But their canonical Acceptance text, read verbatim, is **conformance and hygiene**, not art
direction: "pilot-facing screens meet baseline accessibility" (047), "site-wide closure" (073),
"site-wide responsive/design closure" (088). They made the platform *consistent, accessible and
responsive*. Nothing in the roadmap makes it *designed*.

**WP-088 unlocks nothing.** No WP in the 123-node graph lists it as a Hard Dependency — it is a DAG
leaf, exactly as WP-073 was.

---

## 2. Canonical source set

| Source | Location | Use |
|---|---|---|
| Registry 142 | `/Users/simonefelicetti/KORA/.kora-audit/output/142_…_WITH_PRIME_PREP.md` | 123 WP specs, Section C edge list, Sections D/E |
| Principles 143 | `/Users/simonefelicetti/KORA/.kora-audit/output/143_…_PRINCIPLES_AND_BOUNDARIES.md` | boundaries |
| Report 163 | primary checkout | Formal Consolidation Audit cadence baseline |
| Report 199 | WP047/073/088 worktree | previous DAG baseline (comparison only) |
| Reports 192–209 | WP047/073/088 worktree | WP-047 / WP-073 / WP-088 execution evidence |
| Reports 001–120 series | primary checkout | per-WP completion evidence |

No canonical source was modified, copied, moved, merged or rewritten.

---

## 3. Methodology

1. **Parsed Section B from zero** — regex over the 123 `**\`KORA-WP-NNN\`**` specification paragraphs,
   extracting title, milestone section, Hard Deps, Conditional Deps, Pilot Status, UI, Size, Purpose,
   Acceptance. **123 of 123 recovered; 0 missing, 0 out-of-range, 0 invented.**
2. **Cross-checked against Section C** (the authoritative Hard Dependency DAG): 123 nodes,
   **193 edges — byte-matching the registry's own stated edge count of 193**, and
   **0 mismatches between the Section B fields and the Section C edge list.** The two independent
   representations agree completely. Section C was used as the computation basis.
3. **COMPLETE derived from completion-report evidence**, not from assertion (§4.1).
4. **READY/BLOCKED derived purely mechanically**: BLOCKED iff any Hard Dep ∉ COMPLETE; READY otherwise.
5. **Sequencing overlay computed separately** and excluded from the three-bucket equation.
6. **Experience coverage audited by field census**, not by title inference (§12–14).

---

## 4. Complete 123-WP classification

### 4.1 COMPLETE (53) — evidence-based

```
001–011, 013, 014, 015, 017, 018, 020–038, 040–047, 062, 073, 088, 111–116, 120
```

Each has a canonical completion report in one of the two audit corpora. Cross-validation: this set
minus `088` is exactly 52, reproducing report 199's COMPLETE count independently — the set was
derived from report evidence, then found to agree, rather than inherited.

**`KORA-WP-117` is NOT counted COMPLETE.** Its semantic/morphology substrate is stabilized and
implementation reports exist, but Founder Visual Acceptance was not granted. Per the governing
instruction it remains OPEN/deferred. It sits mechanically in READY (its Hard Dep `115` is COMPLETE)
and carries the Founder-deferred overlay. Its visual-renderer track was not reopened, no Round 6 was
requested, Package B was not started.

### 4.2 READY (35) — all Hard Deps satisfied

```
012, 016, 019, 039, 048, 049, 050, 051, 060, 061, 063, 064, 065, 066, 067, 068,
069, 070, 071, 072, 074, 075, 076, 077, 079, 080, 086, 087, 089, 094, 095, 096,
098, 099, 117
```

### 4.3 BLOCKED (35) — with exact blockers

| WP | Unmet Hard Deps | WP | Unmet Hard Deps |
|---|---|---|---|
| 052 | 051 | 093 | 060 |
| 053 | 051 | 097 | 060 |
| 054 | 052, 053 | 100 | 060 |
| 055 | 054 | 101 | 100 |
| 056 | 051 | 102 | 101 |
| 057 | 055, 056 | 103 | 054, 102 |
| 058 | 051, 053 | 104 | 102, 103 |
| 059 | 054 | 105 | 054, 055, 104 |
| 078 | 039 | 106 | 102 |
| 081 | 054, 055, 056, 057 | 107 | 102 |
| 082 | 081 | 108 | 104 |
| 083 | 081 | 109 | 100, 101, 102, 104, 105 |
| 084 | 081 | 110 | 101 |
| 085 | 016 | 118 | 117 |
| 090 | 068 | 119 | 117, 118 |
| 091 | 081 | 121 | 101 |
| 092 | 081 | 122 | 121 |
| | | 123 | 122 |

**Structural observation:** the entire BLOCKED set traces to just **six upstream roots** — `051`
(Partner chain, 8 downstream), `060` (Program → Prime chain, 14 downstream), `054`/`055`/`056`/`057`
(→ `081` → 5 more), `016` (→ `085`), `039` (→ `078`), `068` (→ `090`), `117` (→ `118`, `119`).

---

## 5. Mechanical counts

| Classification | Count |
|---|---|
| COMPLETE | **53** |
| READY | **35** |
| BLOCKED | **35** |
| **TOTAL** | **123** ✓ |

`53 + 35 + 35 = 123`. The sequencing overlay does **not** participate in this equation.

---

## 6. Sequencing overlay (separate dimension)

**NOT_YET_READY = 15**, derived from objective registry criteria only:

- **Scope-triggered (Section E, 14):** `050` (Booking selected) · `051`–`059` (Partner delivery
  selected) · `060` (Full Program delivery selected) · `061`, `087`, `096` (Link explicitly used).
  Roadmap insertion is not runtime activation; no trigger is active.
- **Founder-deferred (1):** `117`.

**Disclosed discrepancy, not silently reconciled:** report 199 carried `NOT_YET_READY = 18`, but
**that 18-member set is never enumerated in any report in either corpus** (checked 137–141, 178,
190, 191, 194, 199). It therefore cannot be reproduced member-by-member. Report 199 also used a
four-bucket convention in which the overlay *did* participate in the total
(52+26+27+18 = 123), which the governing status rule now forbids. The overlay above is stated by
explicit membership so it is auditable rather than inherited.

---

## 7. Delta versus report 199

| Bucket | 199 | 210 | Note |
|---|---|---|---|
| COMPLETE | 52 | **53** | `+088` — the only substantive movement |
| READY | 26 | **35** | `−088`, `+10` redistributed from the retired fourth bucket |
| BLOCKED | 27 | **35** | `+8` redistributed from the retired fourth bucket |
| NOT_YET_READY | 18 (in total) | **15 (overlay, excluded)** | convention change + explicit membership |

**Exactly one WP changed mechanical state since report 199: `KORA-WP-088`, READY → COMPLETE.** Every
other apparent movement is the retirement of the fourth bucket, not a dependency change.

Report 199's own disclosed stricter re-parse (COMPLETE 52 / READY 29 / BLOCKED 28 / NOT_YET_READY 14)
is closer to this one, consistent with the convention change being the difference.

---

## 8. Dependency changes · 9. Newly unlocked WPs

**Newly READY since report 199: NONE.**
**Newly READY specifically because of WP-088: NONE.**

`KORA-WP-088` appears in Section C exactly once, as `088:047` — as a *dependent*, never as a
dependency. No WP lists it as a Hard Dep. It is a pure DAG leaf; its completion unlocks nothing.
This is the same topology WP-073 had, and it is a structural fact about how the design/a11y/responsive
WPs were specified: **they are terminal hygiene packages, not enabling packages.**

Dependencies satisfied by WP-047: `073`, `088` (both now COMPLETE — the chain `010 → 047 → {073, 088}`
is fully closed and terminal). Dependencies satisfied by WP-073: none. By WP-088: none.

**Dependency inconsistencies in Registry 142: none found.** 193 edges, 0 missing references, 0
self-dependencies, 0 cycles, Section B ≡ Section C. **No conflict between frozen canon and repository
reality was detected in this parse**, so no adjudication is escalated on that basis.

---

## 10. READY set analysis (Task K)

Of 35 READY WPs, **29 are DAG leaves** — completing them unlocks nothing. Only six have dependents:

| READY WP | Dependents | Would become READY on completion |
|---|---|---|
| `016` | 085 | **085** |
| `039` | 078 | **078** |
| `051` | 052, 053, 056, 058 | 052, 053, 056 *(scope-triggered)* |
| `060` | 093, 097, 100 | 093, 097, 100 *(scope-triggered)* |
| `068` | 090 | **090** |
| `117` | 118, 119 | 118 *(Founder-deferred)* |

Classification:

- **Strategically actionable now:** `016`, `012`, `019`, `048`, `049`, `063`, `064`, `066`, `067`,
  `068`, `070`, `071`, `072`, `074`–`077`, `098`.
- **Sequencing-deferred (overlay):** `050`, `051`, `060`, `061`, `087`, `096`, `117`.
- **Requires a Founder Product decision first:** `072` (Executive Attention Home), `064` (Advisor
  Portal navigation/IA), `069` (Listening instrument UI), `070` (Admin Console) — each ships
  significant new UI with **no canonical visual language to build against**, so implementing them now
  means engineering makes silent Product/visual decisions (§24).
- **Unusually large / risky:** `086` (XL), `095` (XL), `080`, `065`, `079`, `089`, `094`, `099`.
- **Normal bounded candidates:** `012` (XS), `016`, `019`, `039`, `048`, `049`, `066`, `067`.

---

## 11. BLOCKED set and exact blockers

See §4.3. Six upstream roots govern all 35.

---

## 12. Existing UX/UI/Product Experience coverage map (Task C)

Census method: every WP whose `UI:` field is not `N/A` **and** whose combined
title/purpose/UI/acceptance text matches design/UX vocabulary — **40 WPs**. Each was then read for
what it actually promises to deliver, not what its title suggests.

**Classification result:**

| Class | WPs | Count |
|---|---|---|
| **STRUCTURAL FOUNDATION** | `047`, `073`, `088` | 3 |
| **PARTIAL VISUAL WORK** | `064` (full navigation/IA), `072` (Executive Attention Home), `063` (My Access) | 3 |
| **FULL PRODUCT-EXPERIENCE WORK** | *(none)* | **0** |
| **UNRELATED / feature-local surface delivery** | `019`, `020`, `021`, `024`, `025`, `027`, `028`, `029`, `032`, `033`, `035`, `036`, `037`, `039`, `040`, `051`, `052`, `054`, `055`, `056`, `060`, `066`, `069`, `078`, `079`, `081`, `082`, `085`, `090`, `091`, `092`, `093`, `094`, `096`, `106` | 34 |

The 34 "unrelated" WPs each deliver **a surface for a feature** ("Certification workflow UI",
"Network List View", "reconciliation view"). They consume the design system; none owns its quality.

**Not one canonical WP is classified FULL PRODUCT-EXPERIENCE WORK.**

### 13. Existing relevant WP table

| WP | Title | Status | Hard Deps | Actual design scope | Environments | Class |
|---|---|---|---|---|---|---|
| 047 | Design System / A11y / IA | COMPLETE | 010 | "pilot-relevant accessibility/design/IA subset"; Acceptance: "pilot-facing screens meet baseline accessibility" | pilot-facing subset | STRUCTURAL |
| 073 | Accessibility/IA Full Closure | COMPLETE | 047 | "site-wide A11y/IA closure"; UI: "full-site remediation" | all five | STRUCTURAL |
| 088 | Responsive/Design System Full Closure | COMPLETE | 047 | "site-wide responsive/design closure"; UI: "full-site remediation" | all five | STRUCTURAL |
| 064 | Full Advisor Portal Completion | READY | 033 | "one Advisor Portal, fully navigable, no second portal" — IA completeness, not visual quality | Advisor | PARTIAL |
| 072 | Executive Attention Home + Company Settings | READY | 027 | new executive home composition | Company | PARTIAL |
| 063 | My-Access Generalization | READY | 033 | extends My Access UI | Worker | PARTIAL |
| 117 | Expression Mode Runtime + KORAL Mark Export | READY / deferred | 115 | outward KORAL Mark image — **artefact rendering, explicitly NOT whole-product visual design** | export artefact | LIVING KORAL (E) |

---

## 14. Whole-platform 32-point experience coverage matrix (Task D)

| # | Dimension | Coverage | Responsible canonical WP(s) / evidence |
|---|---|---|---|
| 1 | Product visual language | **NOT COVERED** | zero specs match "visual language / art direction / visual direction" |
| 2 | Typography system | **NOT COVERED** | **zero** occurrences of typography/font/type-scale in all 123 specs |
| 3 | Spacing / density / layout rhythm | **NOT COVERED** | only match is `092` "density-feature UI" = network capacity density, not layout |
| 4 | Surface / card / panel hierarchy | **PARTIALLY COVERED** | `047`/`088` normalise tokens & surfaces; no WP owns hierarchy design |
| 5 | Navigation presentation quality | **PARTIALLY COVERED** | `047`, `073` (IA structure), `064` (Advisor navigability) — structure, not presentation quality |
| 6 | Form / input quality | **NOT COVERED** | no spec addresses input design |
| 7 | Table quality | **PARTIALLY COVERED** | `088` delivered containment/responsive behaviour (19 audited, 6 changed); no WP owns table *design* |
| 8 | Dashboard / data-display composition | **NOT COVERED** | `072` composes one executive home; no cross-platform owner |
| 9 | Data visualization language | **NOT COVERED** | **zero** chart/visualisation specs |
| 10 | Empty states | **NOT COVERED** | **zero** occurrences |
| 11 | Loading / skeleton states | **NOT COVERED** | only match is `026` "Program Skeleton" (a domain object) |
| 12 | Error / recovery states | **PARTIALLY COVERED** | `028` hardens the ingestion error path only |
| 13 | Success / confirmation states | **NOT COVERED** | **zero** occurrences |
| 14 | Interaction feedback | **NOT COVERED** | no spec |
| 15 | Hover / focus / pressed / selected | **NOT COVERED** | focus appears only inside `047`/`073` a11y compliance, not as design |
| 16 | Motion / transition grammar | **NOT COVERED** | all three "transition" matches are domain state transitions |
| 17 | Iconography | **NOT COVERED** | **zero** occurrences |
| 18 | Illustration / graphic language | **NOT COVERED** | **zero** occurrences |
| 19 | Brand expression inside the Product | **NOT COVERED** | **zero** occurrences of brand in any spec |
| 20 | Cross-environment coherence | **PARTIALLY COVERED** | `073`/`088` enforce *token and behaviour* consistency, not experiential coherence |
| 21 | Environment-specific personality | **NOT COVERED** | no spec; no Founder decision exists |
| 22 | Mobile quality | **COVERED (baseline only)** | `088` — 375px authenticated matrix, 5 roles |
| 23 | Tablet quality | **COVERED (baseline only)** | `088` — 768px |
| 24 | Desktop quality | **COVERED (baseline only)** | `088` — 1440px |
| 25 | Dense enterprise workflows | **NOT COVERED** | no spec addresses density management |
| 26 | Perceived quality / fit-and-finish | **NOT COVERED** | no spec |
| 27 | Accessibility beyond minimum | **PARTIALLY COVERED** | `047` "baseline", `073` "site-wide closure" — compliance, explicitly not beyond-minimum |
| 28 | Performance perception | **NOT COVERED** | `080` is throughput/scale hardening, not perceived performance |
| 29 | Microcopy / content design | **NOT COVERED** | **zero** occurrences |
| 30 | Visual regression / screenshot QA | **NOT COVERED** | **zero** occurrences in all 123 specs |
| 31 | Founder visual acceptance | **NOT COVERED** as a roadmap gate | exists only ad-hoc for `117`; no canonical gate for the platform |
| 32 | External usability / product-quality validation | **NOT COVERED** | **zero** occurrences |

**Totals: COVERED 3 (all baseline-only, all from `088`) · PARTIALLY COVERED 6 · NOT COVERED 23.**

---

## 15–17. What WP-047 / WP-073 / WP-088 actually closed (Task E)

All three **delivered their canonical scope in full**. None is reopened by this audit.

**WP-047 — Design System / A11y / IA (I2, M, BASE PILOT NON-BLOCKER).** Canonical Purpose:
"pilot-relevant accessibility/design/IA subset". Acceptance: "pilot-facing screens meet baseline
accessibility". This is a **pilot-slice structural foundation** — token system, a11y baseline, IA
scaffolding. It never promised whole-product visual design.

**WP-073 — Accessibility/IA Full Closure (I3, M).** Purpose: "site-wide (not pilot-slice-only) A11y/IA
closure". UI: "full-site remediation". It extends 047's conformance from the pilot slice to the whole
site. Closures `KORA-GAP-A11Y-001`, `KORA-GAP-PLATFORM-025`. **Conformance, not design.**

**WP-088 — Responsive/Design System Full Closure (I5, L).** Purpose and Acceptance are identically
"site-wide responsive/design closure". Delivered: 0 in-scope non-white presentation literals, 75
`#FFFFFF` (guard ratchet), 0 Tailwind arbitrary hex classes, 0 residual pillar palettes, responsive
shell/chrome, 19 tables audited / 6 changed, 14 grids audited / 13 converted, and a real authenticated
15/15 runtime matrix (5 roles × 3 viewports) against the Preview of `d6a1817`. Closures
`KORA-GAP-DESIGN-001`, `KORA-GAP-RESPONSIVE-001` (report 209).

> **Explicit determination: WP-088 was a structural / design-system closure. It was NOT a canonical
> final visual / art-direction redesign**, and its own canonical Acceptance criteria never required
> one. Retroactively expanding it would be unsupported by Registry 142's text.

The same determination applies to WP-047 and WP-073: **none of the three carries final visual Product
Experience ownership**, because no canonical WP does.

---

## 18. What remains visually / experientially open

The platform is now **consistent, accessible, responsive and token-clean** — and **undesigned**. The
three completed WPs removed *defects and inconsistency*. Nothing in the roadmap supplies *intent*:
a visual language, a typographic voice, a density philosophy, a state vocabulary, a data-visualisation
grammar, an interaction character, or a definition of what "finished KORA" looks like. Twenty-three
of thirty-two dimensions have no owner anywhere in 123 packages.

---

## 19. KORA-specific definition of top-tier Product Experience (Task F)

No taste adjectives. Each dimension is stated as an observable property with its own acceptance evidence.

| # | Dimension | Observable property | Acceptance evidence |
|---|---|---|---|
| 1 | Clarity | A first-time role-holder states the screen's purpose and the primary action unprompted | observed task start, ≤2 role-representative sessions per environment |
| 2 | Hierarchy | On every screen the single most important element is identified identically by independent observers | ranked-attention agreement across 3 observers |
| 3 | Trust | Methodology version, calibration status, Confidence Score and Safeguard are present and legible wherever a KORA Index appears | automated assertion (already enforceable) + visual audit |
| 4 | Coherence | The same semantic object renders identically across environments | cross-environment screenshot diff of shared components |
| 5 | Usability | Primary task completed without backtracking | observed task runs, backtrack count |
| 6 | Speed of comprehension | Key figure located within a bounded glance | timed first-fixation / first-answer |
| 7 | Task efficiency | Interaction count for each primary task ≤ a declared budget | scripted interaction-count measurement |
| 8 | Consistency | Zero unapproved component variants in a component census | automated component-usage census |
| 9 | Density management | Information-rich screens remain scannable at declared density tiers | density-tier screenshots at 3 viewports |
| 10 | Accessibility | Beyond compliance: keyboard-only completion of every primary task | keyboard-only run per role |
| 11 | Responsiveness | No horizontal scroll, no clipped control, 44px targets, at all declared viewports | extends the existing `088` matrix |
| 12 | Feedback | Every state-changing action produces a visible outcome within a declared latency | scripted action→feedback assertions |
| 13 | Error prevention | Destructive/irreversible actions require confirmation naming the object | inventory of destructive actions vs guards |
| 14 | Recovery | Every error state names a next action the user can take | error-state inventory, 100% coverage |
| 15 | Perceived performance | No unexplained blank period beyond a declared threshold | skeleton/loading coverage census |
| 16 | Polish | Zero mis-aligned, mis-spaced or orphaned elements on audited screens | visual audit pass per screen |
| 17 | Brand distinctiveness | KORA-specific surfaces are identifiable with brand marks removed | blind recognition test vs generic reference |
| 18 | Enterprise credibility | An executive-facing screen is presentable to a board without apology | Founder acceptance on named screens |
| 19 | Emotional quality without decorative excess | Every non-structural visual element has a stated function | element-justification audit |
| 20 | Cross-role coherence | Five environments read as one product while remaining role-appropriate | side-by-side five-environment review |
| 21 | Long-session usability | No contrast/density fatigue across an extended working session | extended-session observation |
| 22 | Information-rich screen quality | Dense screens have explicit scan paths | scan-path annotation per dense screen |
| 23 | State completeness | Every data surface defines empty, loading, partial, error, success | state-matrix coverage, 100% |
| 24 | Visual stability | No layout shift after load or on state change | CLS-style measurement per route |
| 25 | Implementation maintainability | New surfaces buildable from the system without new literals | the existing `088` guards, extended |

---

## 20. Observable acceptance-evidence framework

Four instrument classes, mapping to the table above: **automated guards** (1 of 25 dimensions today —
`088`'s literal/class guards), **scripted runtime matrices** (the `088` Playwright matrix, extensible
to states and keyboard paths), **visual-regression capture** (does not exist — must be built), and
**human observation / Founder acceptance** (does not exist as a canonical gate). Three of the four
instrument classes are currently absent from the roadmap.

---

## 21. External benchmark methodology (Task G)

**Benchmark qualities, never skins.** Method: for each quality, name the observable property to be
matched or exceeded, then translate it into a KORA requirement expressed in KORA's own semantics.

**Benchmark externally:** enterprise information density · workflow clarity in multi-step governance
tasks · executive presentation of a single headline figure with its caveats · data-visualisation
legibility · editing/drafting workflow ergonomics · interaction polish and feedback latency ·
navigation at scale · system consistency across modules · long-session comfort.

**Must remain uniquely KORA, never benchmarked externally:** the five-pillar grammar and its colour
semantics · the KORA Index / Confidence Score / Activation Safeguard inseparable presentation ·
calibration-status and methodology-version disclosure · the privacy boundary and suppression
experience (KORA measures organisations, not individuals — no external product has this constraint) ·
company-level-only aggregation · the Italian-first voice · Living KORAL expression.

**Reference selection:** choose a reference only for a named quality, only where its constraints
resemble KORA's, never as a whole aesthetic. **Translation rule:** every reference must be written up
as *"property observed → KORA requirement → acceptance evidence"*. A reference that cannot be
expressed that way is rejected. No reference may override KORA semantics or the privacy boundary.

---

## 22. Roadmap gap conclusion (Task H)

### **D — ROADMAP GAP, MULTIPLE NEW WPs REQUIRED.**

Why not **A (sufficient)**: refuted by census — 23 of 32 dimensions have no owner; 0 WPs classify as
FULL PRODUCT-EXPERIENCE WORK; typography, iconography, states, motion, microcopy, data-viz, visual QA,
usability and visual acceptance appear **zero times** in 123 specs.

Why not **B (sufficient but fragmented — add an acceptance gate)**: a gate presupposes work to accept.
The census shows the work itself is absent, not scattered. Adding an acceptance gate over 34
feature-local surface WPs would gate delivery against a standard that no package is chartered to meet.

Why not **C (one new WP)**: one package would have to contain a Founder-owned direction decision, a
cross-cutting system build, five-environment application, and a new QA instrument class. Its
acceptance would be non-atomic and its Founder gate unresolvable — the failure mode that left `117`
open. The registry's own convention separates decision, system and application concerns.

**D is chosen because the gap is one of ownership across three distinct kinds of work**, each with its
own acceptance and its own gate.

---

## 23. Proposed packages — THREE (NOT CANONICAL)

> **These are NOT canonical.** Not counted in the 123. Not labelled READY/BLOCKED/COMPLETE. No final
> WP numbers. Not started. Registry 142 unmodified.

### Package PX-A — Product Experience North Star & Visual Language
- **Purpose:** establish the canonical KORA visual/experience language and prove it on one flagship surface.
- **Closes:** dimensions 1, 2, 3, 17, 18, 19, 21, 26, 31.
- **Why not absorbable:** it is a **Founder decision package**. No existing WP is chartered to decide
  visual direction, and `047`/`073`/`088` are COMPLETE with conformance-only acceptance.
- **Prerequisites:** `047`, `073`, `088` (all COMPLETE). **Blockers:** Founder decisions in §24.
- **Environments:** decisions span all five; reference implementation on one Company executive surface.
- **Out of scope:** platform-wide reskin, Living KORAL renderer, PRIME-specific UX, IA changes.
- **Phases:** direction options → Founder adjudication → canonical language spec → token/system
  extension → one flagship reference implementation.
- **Acceptance:** written visual language spec; extended token layer; one surface built to it;
  **Founder visual acceptance gate (explicit, recorded)**.

### Package PX-B — Core Experience System (states, interaction, viz, motion, icons, copy)
- **Purpose:** make the shared component layer complete and expressive, once, for every environment.
- **Closes:** dimensions 4, 6, 7, 9, 10, 11, 12, 13, 14, 15, 16, 25, 29.
- **Why not absorbable:** each feature WP would otherwise invent its own empty/loading/error state —
  the exact divergence `088` had to clean up afterwards. Building it once is cheaper than remediating
  34 surfaces later.
- **Prerequisites:** PX-A (language must exist first). **Environments:** shared layer, all five.
- **Out of scope:** per-environment redesign (PX-C), new product functionality.
- **Acceptance:** 100% state-matrix coverage for shared data surfaces; automated state-coverage guard;
  data-viz language spec applied to existing charts; motion/icon inventories.

### Package PX-C — Environment Experience Remediation & Visual Acceptance Gate
- **Purpose:** apply PX-A/PX-B across KORA Admin, Company, Worker, Partner, Advisor, and establish the
  permanent acceptance instrument.
- **Closes:** dimensions 5, 8, 20, 22, 23, 24, 27, 28, 30, 31, 32.
- **Why not absorbable:** it requires a QA instrument class (visual regression / screenshot baselines)
  that exists nowhere in the repo or roadmap, plus usability observation.
- **Prerequisites:** PX-A, PX-B. **Environments:** all five.
- **Out of scope:** new features; Living KORAL; anything that changes the five-environment IA
  (WP-073's Founder decision `CURRENT_FIVE_ENVIRONMENT_ARCHITECTURE` stands).
- **Acceptance:** per-environment remediation complete; screenshot baselines in CI; keyboard-only
  primary-task runs; extended responsive matrix including state coverage; usability observation on the
  three highest-traffic workflows; **final Founder visual acceptance**.

**Relationships.** PX-A/B/C **consume and extend** `047`/`073`/`088` and reopen none of them —
those closed conformance; these add intent. **PRIME:** PRIME-specific UX (`100`–`110`, `120`–`123`) is
a *domain* experience and must not be mistaken for whole-platform coverage; PX-A/B/C should precede it
so PRIME inherits a language. **Living KORAL:** strictly separate. `117`–`119` remain deferred and
untouched; the KORAL Mark is an outward artefact, not the product's interface.

**Sequencing question for the Founder (§19 of the instruction):** whether to canonicalize PX-A/B/C
**before** the next existing WP, **after** the cadence-10 Formal Consolidation Audit, or **before
commercial/GA release**. This audit's evidence supports *before GA and before the feature WPs that
ship substantial new UI* (`064`, `069`, `070`, `072`), but the decision is the Founder's.

---

## 24. Founder Product / visual decision gates (Task J)

Engineering must not silently decide any of these. All are currently **unresolved**:

1. Visual direction and the definition of "premium" for KORA
2. Typographic system and voice
3. Density philosophy (executive vs operator screens)
4. Overall tone: editorial vs utilitarian
5. Surface philosophy (elevation, borders, depth)
6. Environment differentiation vs uniformity across the five environments
7. Motion character and whether motion is used at all
8. Iconography direction (library vs bespoke)
9. Dashboard composition philosophy
10. Data-visualisation philosophy (and its relationship to pillar colour semantics)
11. Brand prominence inside the product
12. Illustration / graphic language: used or deliberately absent
13. Degree of visual distinctiveness versus enterprise familiarity
14. Aesthetic references admitted, and the rule for translating them
15. Any material navigation-presentation change (IA structure itself is settled by `073`)
16. Whether PX-A/B/C are canonicalized, and where in the sequence

---

## 25. Next canonical WP analysis (Task L)

**Leading candidate: `KORA-WP-016` — Structured Spine + Normalized Data/Evidence Layer.**

| Field | Value |
|---|---|
| Status | READY (Hard Deps `014` COMPLETE) |
| Increment / Pilot Status | I1 — FIRST-PILOT PRODUCT SPINE / BASE PILOT NON-BLOCKER |
| Size | M |
| What it closes | the last unfinished I1 spine package of any structural weight |
| What it unlocks | **`085`** (Incremental Ingestion + Connectors, XL) — one of only six non-leaf READY WPs |
| Breadth | **MEDIUM** |
| Risks | data/evidence normalisation touches the ingestion→UEF path; migration and RLS implications likely |
| Expected validation | real DB / disposable-Postgres RLS validation almost certainly material |
| Founder decisions needed | **NO** for the WP itself |
| Materially affects Product Experience | **NO** |
| Brings cadence to 10 | **YES** |
| Formal Consolidation Audit follows | **YES** |

**Alternatives considered, not equivalent:**
- `012` (XS, Access-Path Correctness Fix) — cheapest, but a pure leaf unlocking nothing; spending the
  cadence-10 slot on it would trigger the Formal Consolidation Audit on trivial progress.
- `072` / `064` / `070` / `069` — each ships substantial new UI. Implementing them **before** a visual
  language exists guarantees silent Product decisions and future rework. This audit advises against
  them as next-WP until §24 is resolved.
- `039` (S) and `068` (M) also unlock exactly one downstream each (`078`, `090`) and are legitimate
  smaller alternatives.

**Founder adjudication required before implementation: NO for `016` itself — YES for the choice
between `016` and canonicalizing PX-A first.** The two candidates are not mechanically comparable
(one is canonical, one is not yet), so the choice is presented, not taken.

---

## 26. Relationship between the next canonical WP and the proposed packages

`016` and PX-A are **non-competing in dependency terms** — `016` is data-layer, PX-A is
experience-layer, neither blocks the other. They compete only for sequence position. Completing `016`
takes cadence to 10 and triggers the Formal Consolidation Audit, which is arguably the natural moment
to canonicalize PX-A/B/C. PX packages are **not** a substitute for the next canonical WP and must not
displace it automatically.

## 27. Formal Consolidation Audit cadence

Current cadence since report 163: **9**. Next completed numbered WP → **10** → **Formal Consolidation
Audit becomes mandatory**. Not due yet.

## 28. Production / release implications (Task M)

**Whole-platform Product Experience / Visual Excellence: NOT REQUIRED before the next technical
Production release — REQUIRED before commercial / general availability.** Rationale, on risk not
taste: no operational, security or data-integrity risk arises from an undesigned-but-consistent UI, so
a technical release is not gated; but at GA the brand/reputation and commercial risk is material —
KORA sells governance-grade trust and enterprise credibility, and 23 uncovered experience dimensions
(notably state completeness, error recovery and dense-workflow usability) carry real usability risk
for an executive buyer. Deferring past GA is **not** supported.

> **⚠ Production-readiness finding, surfaced for Founder review — not acted on.** During WP-088
> diagnostics the Vercel project `kora-foundation-light-demo` was read read-only. **`NEXT_PUBLIC_SUPABASE_URL`
> exists as a single environment variable whose `target` array is `["production","preview"]`** — one
> value serving both — and the deployed Preview bundle resolves to the **staging** ref
> `haqflkurpmeaxpikozjl`. If that single value is what Production also receives, a Production deploy
> would point Production at the staging Supabase project. The same single-variable/both-targets shape
> applies to `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` and `NEXT_PUBLIC_SITE_URL`.
> **Caveat:** all seven project variables are `type: "sensitive"` and cannot be read back, so the
> values were not inspected and this is an inference from the target arrays plus the observed Preview
> bundle — it is not proof. **This must be verified before the next Production release.** Neither
> environment was contacted for this audit and no configuration was changed.

## 29. Audit-corpus fragmentation note (operational governance)

`.kora-audit/` is gitignored and therefore **per-worktree**. The corpus is split: the primary checkout
`/Users/simonefelicetti/KORA/.kora-audit/output/` holds 192 files numbered to 191 (WP-001…047, 062,
111–117, 120 completion evidence, plus Registry 142, Principles 143, Audit 163); the worktree
`/Users/simonefelicetti/KORA-wp047-worktree/.kora-audit/output/` holds 17 files, 192–209 (WP-047 /
073 / 088). **Neither location contains the complete history**, and no single `ls` reveals the corpus.
Nothing was copied, moved, merged or reconciled. **Risk:** a future session reading only one directory
will compute a wrong COMPLETE set — this parse required both. **Recommended (not performed):** a
Founder decision on whether the audit corpus should be consolidated or index-linked.

## 30. Founder adjudications required

1. Canonicalize PX-A/B/C — yes/no, and **when** (before next WP · after cadence-10 audit · before GA).
2. Next canonical WP: `016` (recommended) vs an alternative vs PX-A first.
3. The 16 visual/Product decisions in §24.
4. Whether `064`/`069`/`070`/`072` may proceed before a visual language exists.
5. The Vercel Preview/Production environment-scoping finding (§28) before any Production release.
6. Audit-corpus fragmentation (§29).
7. Whether the sequencing overlay's membership (§6) is ratified as the go-forward definition, given
   the historical 18 was never enumerated.

---

## Boundary attestations

Read-only with respect to Product code, tests, migrations, Registry 142, Principles 143, Git state,
staging, Production and Vercel configuration. The only write was this report. No WP was started, none
reopened — `088` not reopened, Living KORAL renderer not reopened, no Round 6 requested, no Package B
started, `117` not counted COMPLETE. No proposed package was canonicalized or numbered. Staging and
Production were not contacted. `scripts/provision-next-review.mjs` was never read, opened, searched,
hashed, copied, moved or addressed by any command.

---

**Report 210 · Full 123-WP DAG · COMPLETE 53 / READY 35 / BLOCKED 35 / TOTAL 123 · Overlay 15 · Gap conclusion D**
