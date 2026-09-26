# 241 — KORA — AUDIT REMEDIATION ROADMAP CANONICALIZATION (Registry 219 DELTA 3)

**Date:** 2026-09-22
**Type:** Canonical roadmap update. **No Product implementation.**
**Authority:** Founder authorization `KORA — CANONICAL ROADMAP REMEDIATION PASS`, 2026-09-22.
**Registry modified:** `219_KORA_MASTER_PLAN_CANONICAL_EXECUTION_REGISTRY_WITH_PRIME_PREP_AND_PRODUCT_EXPERIENCE.md`
**Product truth at time of planning:** `integration/kora-canonical-product-2026-09-22` @ `3a383072b96290b44620566a242d22f0cc23b01a` (clean)

---

## 1. WHY REMEDIATION WAS REQUIRED

The integrated Product audit produced 71 findings. The Audit-Gap / Canonical-Roadmap Reconciliation
classified each against the canonical roadmap and found **37 with no canonical owner (class H)**.

The largest cluster traced to a single documented omission. Report `210` §23 proposed **three** Product
Experience packages. Two were canonicalized — PX-A → `KORA-WP-124`, PX-B → `KORA-WP-125`, both COMPLETE.
**PX-C was declined three times and left PROVISIONAL, UNNUMBERED, NON-CANONICAL**, in this registry's own
words: *"PX-C … remains PROVISIONAL, UNNUMBERED, NON-CANONICAL and NOT STARTED; no `KORA-WP-126` exists."*
PX-C is the sole named owner of environment-wide body remediation and of the visual-acceptance
instrument, and therefore of findings 16–21, 31, 64, 68, 71.

In every other unowned case the plausible owner was **already COMPLETE with unrelated acceptance**:
`047`/`073`/`088` closed conformance, `044` closed route validation, `010` closed base RLS, `043` closed
the test pyramid. Per CLAUDE.md §8, a COMPLETE package is not reinterpreted to absorb a later finding.

## 2. COUNTS — BEFORE AND AFTER (mechanically derived, not asserted)

| | Before | After |
|---|---|---|
| Nodes | 125 | **137** |
| COMPLETE | 63 | **63** (unchanged — this delta closes nothing) |
| READY | 29 | **34** |
| BLOCKED | 33 | **40** |
| Hard edges | 197 | **213** |
| Conditional edges | 5 | **5** |
| Scope triggers | 4, all INACTIVE | **4, all INACTIVE** |
| Cycles / self-deps / dangling | 0 / 0 / 0 | **0 / 0 / 0** |

Section B specifications = 137; Section C nodes = 137; **exact correspondence, none in one and not the
other.** Verified by re-parsing the file after edit.

## 3. NEW CANONICAL PACKAGES — TWELVE

### Numbering validity
The namespace was contiguous `001`–`125` with **no gap, no duplicate, no reserved slot** — verified
mechanically before assignment. The only prior reference to `126` was the negative declaration above,
which asserted its freedom and anticipated this exact use; it is struck and superseded in place, not
deleted. Every prior extension appended sequentially (`111`–`119`, `120`–`123`, `124`, `125`).

| Logical package | WP | Milestone | Status | Why the number is valid |
|---|---|---|---|---|
| PX-C0 Visual Acceptance Infrastructure | **126** | PX-C | READY | next free; previously declared non-existent, i.e. free |
| PX-C1 KORA_ADMIN Experience Remediation | **127** | PX-C | BLOCKED | sequential, unused |
| PX-C2 Company Experience Remediation | **128** | PX-C | BLOCKED | sequential, unused |
| PX-C3 Worker Experience Remediation | **129** | PX-C | BLOCKED | sequential, unused |
| PX-C4 Partner Experience Remediation | **130** | PX-C | BLOCKED + trigger | sequential, unused |
| PX-C5 Cross-Environment Visual Acceptance Gate | **131** | PX-C | BLOCKED | sequential, unused |
| INTAKE-1 Canonical Intake Actor Model Remediation | **132** | RX | READY | sequential, unused |
| INTAKE-2 Data Intake Architectural Decomposition | **133** | RX | BLOCKED | sequential, unused |
| Company Routing Contract Remediation | **134** | RX | READY | sequential, unused |
| FORCE RLS Completion Review | **135** | RX | READY | sequential, unused |
| Advisor Cross-Company Operations | **136** | RX | READY | sequential, unused |
| Advisor Review Discovery | **137** | RX | READY | sequential, unused |

Twelve, not thirty-seven: grouped by root cause into eight clusters, six of which needed nodes. PX-C's
six-way split is mandated by `210` §23's own atomicity reasoning — one node would carry an instrument
build, four environment remediations and a gate, giving a non-atomic acceptance and an unresolvable
Founder gate, the failure mode that left `117` open.

### Two new milestone labels
**`PX-C`** completes the three-package PX structure. **`RX`** is a *provenance* label — packages whose
ownership was established by the 2026-09-22 reconciliation — deliberately not filed under `I3`–`I6`,
which would misrepresent both them and those increments, exactly as Section AH-3 reasoned for `PX`.

## 4. ACCEPTANCE EXTENSIONS TO EXISTING READY PACKAGES

**`KORA-WP-070` (Admin Console Extensions).** Added: Admin operational IA coherence for the consoles it
touches; no dead or stale Admin navigation target left by or reachable from them; founder/lab/demo
tooling separated from operational navigation; redirect/stub reduction within its own scope; no new
legacy navigation pattern. **Deliberately minimal** — `070` is responsible for not *leaving* navigation
debt, **not** for Admin visual remediation, which is `127`. Out of Scope now names that boundary
explicitly: `070` = functional console progression; `127` = experience remediation.

**`KORA-WP-072` (Executive Attention Home + Company Settings).** Added: navigation coherence for
surfaces it touches; no dead navigation introduced; WP-125-native composition for surfaces it creates or
modifies. **Does not** make `072` responsible for whole-Company modernization, which is `128`.

No other existing package's text was changed.

## 5. NON-WP TRACK (Section AI) — `R0-A` … `R0-D`
### *(execution-tracking schema added by the Founder Roadmap Review Patch, 2026-09-22)*

Not Work Packages, not nodes, no WP number, no effect on WP counts — because they are
**release-governance or CI actions, not Product implementation**. They are nonetheless **mechanically
auditable**, each carrying: ID · Title · Execution domain · State · Preconditions · Acceptance · Required
evidence · Gate affected · Completion record.

**State vocabulary is deliberately distinct** — `R0_OPEN` / `R0_BLOCKED` / `R0_COMPLETE` — so an `R0`
state can never be confused with, or summed into, a WP graph count. Section F's aggregate is computed
over Section C nodes only and is structurally incapable of including these items.

| ID | Title | Execution domain | Initial state | Preconditions | Gate |
|---|---|---|---|---|---|
| **R0-A** | CI real-DB enforcement | CI / build engineering | **`R0_OPEN`** | none | CONTROLLED PILOT |
| **R0-B** | Canonical deploy-line declaration | Release governance (Founder-authorized) | **`R0_OPEN`** | none | CONTROLLED PILOT |
| **R0-C** | Integrated staging validation | Release governance + QA | **`R0_BLOCKED`** | `R0-B` = `R0_COMPLETE` | CONTROLLED PILOT |
| **R0-D** | Governance publication / auditability | Governance | **`R0_OPEN`** | none | PAID EXTERNAL PILOT |

**Initial states were derived, not assigned.** `R0-A`, `R0-B`, `R0-D` have no unmet precondition.
**`R0-C` is `R0_BLOCKED` by derivation**: its integrated branch exists and is published
(`3a383072b96290b44620566a242d22f0cc23b01a`, local and remote identical) and staging is authorized under
Gate 2's conditions — but **no canonical deploy line has been declared**, which is `R0-B`'s deliverable.
Validating a branch whose promotion path is undefined would validate the ambiguity `R0-B` removes.
**`R0-B → R0-C` is the only inter-`R0` dependency**; the track is deliberately not over-connected.

**Binding separation rule (Section AI.1).** `R0` items do **not** count as WP nodes, affect WP counts,
create hard edges, or receive WP numbers. They **do** require evidence before `R0_COMPLETE`, participate
in Section AJ gates, require a numbered completion record, and remain visible until closed.

**Required evidence.** `R0-A`: a CI run showing each previously-unwired suite executing, plus a recorded
list of deliberate exclusions with reasons (measured: **32 `*_ALLOW_RUN` gates in tests, 26 wired**;
unwired `COMMONS_GRANT`, `WP045`, `WP112`, `WP113`, `WP116`, `WP117`). `R0-B`: the written lineage document
plus recorded Founder authorization. `R0-C`: a staging validation run with per-domain results and the exact
SHA validated. `R0-D`: a demonstrated end-to-end reconstruction performed from the published artefact
alone — **`.kora-audit/**` is NOT to be added to Product Git by default**.

## 6. EXECUTION GATES (Section AJ)

**CONTROLLED PILOT** — `132` = `COMPLETE` · `R0-A` = `R0_COMPLETE` · `R0-B` = `R0_COMPLETE` · `R0-C` = `R0_COMPLETE` · methodology disclosure verified ·
no pilot-critical dead Admin route. Gate 3 may remain OPEN **only** under the currently authorized
synthetic / anonymous / non-live conditions.

**PAID EXTERNAL PILOT** — additionally: **Gate 3 closure** · `134` · `R0-D` = `R0_COMPLETE` · `131` PASSED for
customer-exposed personas · no material customer-facing dead route · external legal conditions.

**PRODUCTION** — additionally: **every `R0` item at `R0_COMPLETE`** · Gate 3 **integrated** · **migration-090 collision resolved at Gate 3
integration, never renumbered pre-emptively** · `135` · production deploy lineage proven · monitoring/SLA
readiness · **calibration decision explicitly recorded** · bounded residual demo/synthetic review
(findings 58–60) — **not** a broad Foundation-Light cleanup, which remains forbidden.

## 7. METHODOLOGY (Section AK) — recorded, not created

Findings 12–14 have **no WP owner by design**. This registry contains **zero** occurrences of "Delphi" or
"empirical" because calibration is governed constitutionally: CLAUDE.md §6, *"Delphi Study calibration is
post-pilot."* Pilot evidence collection is already owned by the **17 `EV-*` Evidence Gates**, referenced
rather than duplicated. Pre-empirical status is an **accepted, planned pre-pilot condition**, becoming a
Production-gate decision point. **No pre-pilot calibration WP was created.**

## 8. DEPENDENCY CHANGES — 16 new edges

`126:125` · `127:126` · `128:126` · `129:126` · `130:126` · `131:127,128,129` ·
`132:049` · `133:132` · `134:003` · `135:010` · `136:064` · `137:037,064` · and **`085` gains `133`**.

`131` deliberately does **not** hard-depend on `130`: Partner is trigger-conditional, and gating active
personas on an inactive trigger would make `131` permanently unreachable. It is a conditional dep instead.

**The one existing-node status change:** `KORA-WP-085` **READY → BLOCKED**. Mechanical, not editorial —
`085` builds connectors on the intake structure, and letting it precede `133` would compound the debt
`133` exists to remove.

Edges were kept deliberately sparse. `134` does **not** block `068`; `135` does **not** block Product
development; `136`/`137` do **not** block near-term I3 work.

## 9. REVISED EXECUTABLE FRONTIER

**READY (34):** `019, 050, 051, 060, 061, 065, 067, 068, 069, 070, 071, 072, 074, 075, 076, 077, 078,
079, 080, 086, 087, 089, 094, 095, 096, 098, 099, 117, 126, 132, 134, 135, 136, 137`.

`085` left READY. Six new nodes entered. **`KORA-WP-068` is unchanged and unblocked** — its only hard dep
`033` is COMPLETE, no new edge touches it, and the reconciliation's conclusion that audit remediation
does not block it is preserved. Registry 219 now makes explicit that **`068` is not an audit-remediation
owner**: findings are owned by `126`–`137`, `070`/`072` extensions, `R0-A`–`R0-D`, Gate 3, or a recorded
deferral.

## 10. EVERY MATERIAL FINDING NOW HAS AN OWNER

| Findings | Owner |
|---|---|
| 1, 2, 4 | `R0-D` |
| 3, 52, 65 | recorded residual (WP-120 open; ratchets largely obsolete) |
| 5, 6 | `R0-B` |
| 7 | `R0-C` |
| 8, 9, 11 | Gate 3 (external) |
| 10, 51 | Section AJ Production gate — resolved at Gate 3 integration |
| 12, 13, 14 | Section AK + Production gate (Founder-deferred by design) |
| 15, 40 | `132` |
| 16, 21, 31, 64, 68, 71 | `126`–`131` |
| 17, 27, 28, 29, 30 | `128` (+ `072` extension) |
| 18, 22, 23, 24, 25, 26, 67 | `127` (+ `070` extension) |
| 19 | `129` |
| 20 | `130` — **COVERED CONDITIONALLY, trigger INACTIVE** |
| 32, 33, 70 | `136` |
| 34 | `137` |
| 35 | `128` |
| 36, 37, 38, 39, 41, 69 | `132` |
| 42, 43, 44, 45, 61 | `133` |
| 46, 47, 48, 49, 63 | `134` |
| 50 | `135` |
| 53, 54, 55, 56, 57 | `R0-A` |
| 58, 59, 60 | Production-gate residual review (bounded) |
| 62 | `132` (canonical path) + `133` (structure) |
| 66 | absorbed by `127`/`128` |

**No material finding remains ownerless, and none remains documented only in prose.**

## 11. EXPLICITLY NOT CHANGED

Registry 102 — unmodified. Registry 142 — unmodified. `CLAUDE.md` — unmodified. No COMPLETE package
reopened. **No scope trigger activated** — `130` is *recorded under* the Partner trigger, whose state is
unchanged and INACTIVE. `KORA-WP-019` keeps its READING C deferral and mechanical READY.
`KORA-WP-117` keeps its Founder deferral, unchanged. **`KORA-WP-120`'s inconsistency untouched** — and no
node inserted here depends on its interpretation. **`KORA-WP-069`'s F-12 gate untouched** — it governs
only `069`, outside this delta's dependency closure. Commercial / entitlement architecture remains
deferred; **no entitlement work entered through remediation**. Gate 3 remains separately governed. No
migration renumbered.

## 12. WHAT WAS NOT DONE

No Product code, test, migration or middleware change. No CI wiring. No PX-C implementation. No intake
remediation. No deployment. No Supabase, Vercel, staging or Production contact. `KORA-WP-068` not
started. No commit, push, merge, rebase, cherry-pick or PR — the Founder reviews the Registry diff first.
`scripts/provision-next-review.mjs` was never addressed.

---

**ROADMAP CANONICALIZED — REGISTRY 219 DELTA 3 — 137 NODES — AWAITING FOUNDER REVIEW**

---

## 13. FOUNDER ROADMAP REVIEW PATCH — 2026-09-22

Roadmap structure substantively approved. One governance weakness was corrected: `R0-A`–`R0-D` had no mechanical tracking state. They now carry the full execution schema above, with a distinct state vocabulary and a binding separation rule, and the Section AJ gates reference those states mechanically rather than in prose.

**Nothing else changed.** WP-126–137 scopes, numbering, dependencies and statuses; WP-070 and WP-072 acceptance; WP-085 BLOCKED; PX-C structure; intake sequencing; middleware remediation; FORCE RLS treatment; Advisor post-pilot treatment; the gates themselves; and the existing frontier are all untouched. Re-parsed after the patch: **137 nodes · 63 COMPLETE · 34 READY · 40 BLOCKED · 213 hard edges · 5 conditional edges · 0 cycles · 0 self-dependencies · 0 dangling references** — identical to the pre-patch values.

---

## 14. DISPOSITION — FOUNDER FINAL APPROVAL GRANTED 2026-09-22

The roadmap state documented by this report — Registry 219 DELTA 3 plus the R0 execution-tracking patch — was **approved as canonical by the Founder on 2026-09-22**. This report is therefore **CLOSED and remains the technical record of the canonicalization**; the approval itself is recorded separately in report `242`, per corpus convention of one numbered record per governance event. **No content of this report was altered to record approval** — the counts, scopes, dependencies, acceptance extensions and R0 states above stand exactly as canonicalized.
