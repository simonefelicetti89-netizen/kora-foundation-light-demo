# 268 — KORA PX WAVE 1 — WP139 + WP140 JOINT IMPLEMENTATION PRE-CHECK

**Date:** 2026-09-25 · **Mode:** READ-ONLY · **Product mutations:** NONE · **Registry 219 mutations:** NONE
**Baseline:** `integration/kora-canonical-product-2026-09-22` @ `ac91cfa31e0bcad85071d467c9a5611a4668c29b`
**Purpose:** determine ownership, collision risk, branch strategy, batches, demonstrator strategy, acceptance
boundary, genuine parallelism, and required sequencing overlays for `KORA-WP-139` and `KORA-WP-140`.
**This report does not implement either package and does not advance any gate.**

---

## A — CONTRACTS, READ FROM REGISTRY 219 (not the Implementation Program)

Both rows read verbatim from Section C of Registry `219`. Registry contract wins, as directed.

| | `KORA-WP-139` Typography Foundation & Migration | `KORA-WP-140` Surface & State Grammar |
|---|---|---|
| Class | PX-D | PX-D |
| Status | **READY — CANONICALIZED** | **READY — CANONICALIZED** |
| Pilot | NOT BASE PILOT SCOPE | NOT BASE PILOT SCOPE |
| Hard Deps | **none — DAG ROOT** | **none — DAG ROOT** |
| Scope Trigger | none | none |
| External Blockers | none | none |
| Data/Migration | NONE | NONE |
| Auth/RLS | N/A — no auth surface touched, no route reachability widened | same |
| Feature Flag | NO | NO |
| Size / Uncertainty | L / MEDIUM | L / MEDIUM |
| Evidence Gate | N/A | N/A |

**Acceptance `139`:** (A) canonical role model and ≤9-step scale as tokens · (B) four families → one Product UI
family + at most one editorial family, each with a documented role · (C) shared typographic primitives consume the
tokens · (D) **≥2 real canonical surfaces fully migrated** — `/company/reports`, `/advisor/companies/[id]` ·
(E) no text below the 11px floor on those surfaces · (F) lint active at **WARN** · (G) documented staged migration
strategy, explicitly NOT a one-shot global replacement · (H) **Founder Visual Acceptance on the demonstrators**.

**Acceptance `140`:** (A) **nine** surface roles as distinct typed components with documented use and non-use ·
(B) **seven** states as distinct components · (C) `ZERO ≠ NO DATA` and `SUPPRESSED ≠ ERROR` **structurally
enforced, not merely styled** · (D) semantic-colour correctness **structural** · (E) Privacy Boundary quality
preserved or improved, never regressed · (F) **≥2 real canonical surfaces adopt ≥3 roles** · (G) **Founder Visual
Acceptance on the demonstrators**.

Both rows state: *Real-Product demonstrators are MANDATORY — a foundation accepted only against a component
library, Storybook or unit tests is NOT complete.*

---

## B — BASELINE VERIFICATION

| Check | Result |
|---|---|
| `integration` local SHA | `ac91cfa31e0bcad85071d467c9a5611a4668c29b` |
| `integration` remote SHA | `ac91cfa31e0bcad85071d467c9a5611a4668c29b` — **equal** |
| Integration worktree | clean (no tracked modifications) |
| `main` | unchanged, `70c4cfa` |
| `npx tsc --noEmit` | **clean, no diagnostics** |
| Regression-lock suites | **4 files · 169 tests · 169 PASS** (WP-047, WP-088, WP-125, WP-138) |
| `governance-registry-consistency.test.ts` | not present on this branch — governance-branch-only, expected |

**BASELINE: MATCH. Proceed.**

---

## C — CONTRACT / CODE-TRUTH DIVERGENCE (naming, not substance)

Registry Section C and `AN.3` both name the second demonstrator **`/advisor/companies/[id]`**.
Code truth is **`/advisor/companies/[assignmentId]`**. Same surface; the dynamic segment is named for the
assignment, not the company. **Not a blocker.** Acceptance evidence must cite the real path, and no session may
"fix" the route to match the prose.

---

## D — DRIFT FIGURES RECOMPUTED (`AN.4` corrected)

`AN.4` cites *"2,088 inline typography or 1,761 inline spacing decisions."* Recomputed at `ac91cfa`:

| Figure | `AN.4` | **Code truth** | Why the Registry figure differs |
|---|---|---|---|
| Inline typography (`fontSize:`) | 2,088 | **2,601** | `2,088` is **`app/` only**. `components/` adds **513**. |
| Inline spacing (padding/margin/gap) | 1,761 | **2,277** | `app/` only = 1,824; `components/` adds 453. |

Neither Registry figure is *wrong* — both are **scope-limited to `app/` and understate the canonical Product UI
surface**. Corrected canonical figures: **typography 2,601 · spacing 2,277**.

Supporting truth:

- `fontSize:` spans **192 files**; largest: `app/admin/activation-signal-pipeline/page.tsx` (61),
  `app/worker/dynamic-cv/_components/DynamicCVClient.tsx` (59), `app/admin/founder-validation/page.tsx` (59).
- Adjacent typographic drift, not counted by `AN.4`: `fontWeight` **1,452** · `lineHeight` **693** ·
  `letterSpacing` **588**.
- **Token adoption is zero on both axes**: `fontSize:` referencing a token = **0** of 2,601; `SPACE.` = **0**.
- Second scale path: Tailwind `text-*` utilities — **743** uses (`text-xs` 487, `text-sm` 163, rest 93).
- **Value forms the `(F)` lint must handle — five, not one:** bare number **1,882** · `'Npx'` string **557** ·
  `'Nrem'` string **150** · other string **6** · expression/identifier **6**. A rule matching only quoted px
  literals would miss **72%** of the population. *(This is the same class of error as my own earlier
  "12 inline literals" miscount, corrected in the audit.)*
- Sub-11px population Product-wide: **212** (`10px` 128 · `10.5px` 16 · `9.5px` 22 · `9px` 34 · `8.5px` 2 ·
  `8px` 8 · `7.5px` 2).

---

## E — `KORA-WP-139` CODE OWNERSHIP

| File | Owned because | Load |
|---|---|---|
| `app/layout.tsx` | the only font-loading site | **four** `next/font/google` families |
| `app/globals.css` | family tokens + Tailwind v4 `@theme inline` bridge | 5 `--font-*`; **0 `--text-*`**; 3 `font-size` |
| `lib/design/kora-design-tokens.ts` | canonical token source | `PX.sans` only; **no type scale** |
| `components/ui/PageMasthead.tsx` | shared typographic primitive (C) | 4 `fontSize`, 3 hardcoded family |
| `components/ui/PageHeader.tsx` | shared typographic primitive (C) | 4 `fontSize`, 4 hardcoded family |
| `components/ui/SectionLabel.tsx` | shared typographic primitive (C) | 1 / 1 |
| `components/ui/px/Workspace.tsx` | `PageHead` is a shared typographic primitive (C) | 10 `fontSize`, 5 family, 10 weight |
| `eslint.config.mjs` | host for the (F) WARN rule | **zero custom rules today** |

**Family truth — `(B)` is mostly deletion, not migration.** `app/layout.tsx` loads
`Plus_Jakarta_Sans`, `Instrument_Serif`, `Playfair_Display`, `Hanken_Grotesk`. Consumption:

| Variable | Consumers outside `layout.tsx` |
|---|---|
| `--font-jakarta` | ~115 files — the de facto single Product UI family |
| `--font-hanken` | **3** — `PrivilegedAccessBanner`, `DiagnosticsTabNav`, `CompanyTabNav` |
| `--font-instrument-serif` | **0 — loaded, never used** |
| `--font-playfair` | **0 — loaded, never used** |

Two of the four families are dead font loads. `(B)` reduces to: delete two loads, adjudicate `Hanken_Grotesk`
(3 real consumers) as the one editorial/privileged family or fold it into Jakarta, and reconcile the five
`--font-*` tokens — `--font-kora-serif` is already Fase-0-aliased to sans — down to the ratified pair.

---

## F — A RATIFIED TYPE ROLE MODEL ALREADY EXISTS (largest `139` finding)

`design/wp124-final/kora-signal.css` — the **Founder-accepted WP-124 normative source**, and the same file
`KORA-WP-125`'s suite already treats as normative — defines a **nine-role, nine-step named scale**:

| Role | Size | Role | Size | Role | Size |
|---|---|---|---|---|---|
| `.d1` | 66px | `.h1` | 19px | `.p` | 13px |
| `.d2` | 34px | `.h2` | 14.5px | `.sm` | 12px |
| `.d3` | 22px | `.lbl` | 11px | `.xs` | 11.5px |

Consequences:

1. `(A)` "canonical role model and ≤9-step scale" **need not be invented** — nine roles, nine steps, already ratified.
2. The Out-of-Scope risk *"choosing a replacement Product UI family on taste alone"* is **already neutralised**:
   `kora-signal.css` ratifies Plus Jakarta Sans, and `globals.css` records *"Plus Jakarta Sans — unico font UI."*
3. `KORA-WP-125`'s existing test *"every PX value is verbatim from the Gate I normative source"* sets the
   precedent: the type scale must be **verbatim from `kora-signal.css`**, and the new suite should assert it.
4. This materially lowers `139`'s declared **MEDIUM** uncertainty on the scale itself.

**One calibration note, not a blocker:** the same source uses `10px` and `10.5px` in **nav/sidebar chrome**,
below the Benchmark V2 11px floor. Neither value occurs on either demonstrator. Whether the floor binds chrome is
a Founder calibration question for the residual sweep — `(E)` scopes the floor to the migrated surfaces only.

---

## G — `KORA-WP-140` CODE OWNERSHIP — NOT GREENFIELD

`components/ui/px/` (8 files, ~700 lines, `KORA-WP-125`) already ships a meaningful subset of the grammar:

| Concern | Existing |
|---|---|
| Surface roles | `Surface` (L1 working / L2 inset), `SurfaceHeader`, `SurfaceBody`, `Region`, `Band`, `Col`, `SplitRegion`, `SplitPart`, `Metric`, `MetricStrip`, `Facts`, `PageHead`, `Workspace`, `PxDataTable` |
| States | `Skeleton` / `SkeletonRows` / `InlineSpinner` (loading), `StateBlock` (`idle` \| `pending`), `Notice` (`ok` \| `info` \| `warn` \| `risk`), `Status`, `Chip` |
| Tokens | `PX` (43 keys), `PX_TONE` (5 tones), `PxTone`, `PX_BREAKPOINTS` |
| Legacy parallel set | `components/ui/{EmptyState,NoDataState,DataBar,Table,Tabs,...}`, `components/privacy/{PrivacyBoundaryNotice,AccessDeniedState}` |

`140` is therefore **completion and canonicalization of the WP-125 set**, not a new library. Adoption today:
**17 files** import `@/components/ui/px`.

---

## H — `140` STRUCTURAL VIOLATIONS PRESENT AT BASELINE

Each is real, located, and directly maps to an acceptance clause.

1. **`ZERO ≠ NO DATA` — UNENFORCED.** `components/ui/NoDataState.tsx` is a 24-line pass-through that maps
   `description` → `body` and delegates to `EmptyState`. A genuine zero and an absence of data **render
   identically**. `(C)` requires structure, and there is none.
2. **`SUPPRESSED ≠ ERROR` — partially correct, structurally unenforced.** `PrivacyBoundaryNotice` uses
   `role="status"` (correct for suppression); `AccessDeniedState` uses `role="alert"` (correct for an
   authorization failure); but `EmptyState` exposes `variant='access-denied'` → `role="alert"`, and nothing
   prevents a caller reaching for it on a **suppression**, announcing a privacy boundary as an error.
3. **Semantic-colour correctness — NOT structural.** `tone` is a free `PxTone` parameter; `PX_TONE[tone]` applies
   whatever it is given. **32 call sites** pass computed expressions, e.g. `tone={thresholdMet ? 'ok' : 'risk'}`.
   A danger treatment on a healthy value is fully constructible today — the precise inverse of `(D)`.
   **Latent contract defect found in passing:** two call sites pass `'mute'` / `'ink'`, which are **not**
   `PxTone` keys. To be verified during implementation; not adjudicated here.

---

## I — SHARED-FILE COLLISION RISK — COMPUTED, NOT ASSUMED

Full transitive import closures of the two demonstrators:

| | files in closure |
|---|---|
| D1 `app/company/reports/page.tsx` | **28** |
| D2 `app/advisor/companies/[assignmentId]/page.tsx` | **13** |
| **Intersection** | **1 — `lib/design/kora-design-tokens.ts`** |

That single file is also the only file **both packages must edit** (`139` adds the type scale; `140` adds
surface/state tokens). **Wave 1 has exactly one token-level collision surface.**

The safe strategy is already the tested one: `KORA-WP-125`'s suite asserts `KORA_COLORS`, `TOKENS`,
`PILLAR_COLORS`, `MACROBLOCK_COLORS`, `BUTTON_TOKENS`, `BADGE_TOKENS` still export, and that every `PX` colour is
verbatim from `kora-signal.css`. **Additive-only, distinct new export names, no reordering, no edits inside the
guarded `PX` block** keeps both packages green and reduces any conflict to a textual merge.

**Second-order collision — one file, two concerns:** `components/ui/px/Workspace.tsx` is simultaneously a
typographic primitive (`139` C: 10 `fontSize`, 5 `fontFamily`, 10 `fontWeight`) and a surface-role primitive
(`140` A). File-level overlap, not token-level.

---

## J — DEMONSTRATOR ASYMMETRY — THE DECISIVE PLANNING FINDING

The two demonstrators are in **opposite baseline states**.

| | D1 `/company/reports` | D2 `/advisor/companies/[assignmentId]` |
|---|---|---|
| Closure files | 28 | 13 |
| `fontSize:` in closure | 71 | 41 |
| **Sub-11px occurrences** | **31** | **0** |
| Tailwind `text-*` in closure | 12 (`KoraIndexHero` 4, `ActivationSafeguardPanel` 7, `PrivacyBoundaryNote` 1) | 0 |
| Imports `components/ui/px` | **0** | yes — all 8 `_components` adopt it |
| **px roles in use** | **none** | **8 distinct** — `Region` 31, `Notice` 18, `SkeletonRows` 16, `Status` 14, `StateBlock` 11, `Col` 10, `Workspace` 7, `DateField` 2 |
| Page shell | **17 hand-rolled `<div>`s** with inline card styling, legacy `TOKENS` | composed via px primitives |

Consequences, in order of planning weight:

1. **`140` (F) "≥2 surfaces adopt ≥3 roles" is already satisfied on D2 at baseline** — eight roles, not three.
   All genuine `(F)` work is on D1.
2. **`139` (E) 11px floor: 31 of 31 violations are on D1.** D2 is already compliant.
3. D2 is therefore a **verification** demonstrator, not a migration target; D1 carries essentially the whole
   demonstrator load for **both** packages.
4. Both packages converge on **one page**: `app/company/reports/page.tsx`. **That, not the token file, is the
   true serialization point of Wave 1.**

---

## K — REGRESSION-LOCK TESTS AND THE ONE NAMED COLLISION

All four suites pass at baseline (169 tests). Three constrain Wave 1:

| Suite | Cases | Constraint on Wave 1 |
|---|---|---|
| `kora-wp-047-design-system-a11y` | 29 | **asserts the exact source string** `role={variant === 'access-denied' ? 'alert' : undefined}` in `components/ui/EmptyState.tsx`; plus a hex-literal guard over `REMEDIATED_TOKEN_FILES` |
| `kora-wp-088-responsive-design-system` | 63 | "no in-scope presentation colour literal remains outside the canonical token source" |
| `kora-wp-125-shared-product-experience-foundation` | 54 | legacy token exports must survive (~196 consumers); `px/` primitives declare no local colour; every `PX` colour verbatim from `kora-signal.css` |

**The collision:** `WP-047`'s EmptyState assertion is a direct conflict with `140` `(C)` `SUPPRESSED ≠ ERROR`.
Two resolutions, one clearly preferable:

- **Preferred — additive, zero supersession.** Leave `EmptyState`'s `access-denied` variant **byte-identical**
  (WP-047 stays green) and introduce a distinct typed **`Suppressed`** state that is structurally *not* an alert.
  `access-denied` then means authorization failure only — for which `role="alert"` is correct. The conflation
  disappears without touching the guarded string.
- **Fallback — supersede the assertion** with inline rationale, the `WP-138`/`B147` precedent. Only if the
  preferred path proves impossible. **Not to be chosen for convenience.**

---

## L — REQUIRED GOVERNANCE INPUT BEFORE `140` CAN BE ACCEPTED

`140` `(A)` requires **nine** surface roles and `(B)` **seven** states. **Neither list is enumerated anywhere** —
not in Registry `219`, not in report `266`, not in `docs/`, not in the repository. Report `266` §3 records
Benchmark V2 *"by reference rather than duplication — the canonical text lives in this report's lineage"*, and
that lineage is the conversational directive, **not a file**.

`139` is unaffected: its count is a **cap** (≤9 steps) and §F now supplies its role model from a ratified source.
`140`'s counts are **exact**, so `(A)` and `(B)` are **not objectively testable** until the nine roles and seven
states are written down.

**This is a Founder/governance input. This pre-check does not create it** — inventing the enumeration here would
be exactly the "fit the artefact to the total" error the `AL.3` discipline forbids.

It blocks `140`'s first batch and the acceptance of `(A)`/`(B)`. It does **not** block `140`'s `(C)`, `(D)`, `(E)`
work, and does **not** block `139` at all.

---

## M — BRANCH AND WORKTREE STRATEGY

No `*139*`, `*140*`, `*typograph*` or `*px*` branch exists. Fifteen worktrees are live; none is free for reuse.

| Package | Worktree | Branch | From |
|---|---|---|---|
| `139` | `/Users/simonefelicetti/KORA-wp139-worktree` | `feature/kora-wp-139-typography-foundation` | `ac91cfa` |
| `140` | `/Users/simonefelicetti/KORA-wp140-worktree` | `feature/kora-wp-140-surface-state-grammar` | `ac91cfa` |

Naming follows the established `feature/kora-wp-NNN-<slug>` convention (WP-012/039/047/048/049/063/064/066/124/125).
Tests follow `tests/unit/kora-wp-139-*.test.ts` and `kora-wp-140-*.test.ts` — the convention is uniform across
400 files in `tests/unit`. Both branch from `integration/…@ac91cfa`, **never from `main`**.

---

## N — WHAT CAN GENUINELY RUN IN PARALLEL

Report `266`'s adjudication — *"a surface role is defined by elevation, border, background, padding and density —
colour and spacing properties, not typographic ones"* — is **confirmed by code truth**: `px/Surface.tsx` carries
1 `fontSize` and 1 `fontFamily`; `Status` and `Notice` carry typography only for their own chip/message text.
The two systems are genuinely separable. **Both remain DAG roots. No hard edge is warranted, and none should be
manufactured.**

**Parallel-safe, no coordination needed:**

- `139`: `app/layout.tsx`, `app/globals.css`, `components/ui/{PageMasthead,PageHeader,SectionLabel}.tsx`, `eslint.config.mjs`
- `140`: `components/ui/px/{Surface,Status,Notice,Skeleton,DataTable}.tsx`, new state components, `components/privacy/*`
- both: appending **distinct new exports** to `lib/design/kora-design-tokens.ts`

**Three sequencing overlays required — overlays, not dependencies:**

| # | Surface | Overlay |
|---|---|---|
| **O1** | `lib/design/kora-design-tokens.ts` | one file, two writers. Additive-only, distinct export names, no reordering, no edit inside the guarded `PX` block or the legacy exports. Any conflict is textual, not semantic. |
| **O2** | `components/ui/px/Workspace.tsx` | `139` owns its `fontSize`/`fontFamily`/`fontWeight`; `140` owns its layout/region/elevation. Serialize this file, or split the `PageHead` typography out first. |
| **O3** | `app/company/reports/page.tsx` | **the real serialization point.** `140` recomposes it onto the surface/state grammar **first**; `139` then migrates its typography onto the scale. The reverse order wastes work, because `140`'s recomposition rewrites the same style objects `139` would have migrated. |

---

## O — `KORA-WP-139` IMPLEMENTATION BATCHES

Phase order per `AN.4`: `SYSTEM → PRIMITIVES → DEMONSTRATORS → …`, lint `OFF → OFF → WARN`.

| # | Batch | Scope | Lint |
|---|---|---|---|
| 139-B1 | SYSTEM | nine-role, nine-step scale **verbatim from `kora-signal.css`** → `lib/design/kora-design-tokens.ts` + `--text-*` in `@theme inline` | OFF |
| 139-B2 | FAMILY | delete the two zero-consumption loads (`Instrument_Serif`, `Playfair_Display`); adjudicate `Hanken_Grotesk`; reconcile five `--font-*` tokens to the ratified pair, each with a documented role | OFF |
| 139-B3 | PRIMITIVES | `PageMasthead`, `PageHeader`, `SectionLabel`, `px/Workspace` `PageHead` consume the tokens *(O2)* | OFF |
| 139-B4 | DEMONSTRATOR D1 | migrate the `/company/reports` closure — 71 `fontSize`, **31 sub-floor**, 12 Tailwind `text-*` — **after 140-B6 *(O3)*** | WARN |
| 139-B5 | DEMONSTRATOR D2 | verify `/advisor/companies/[assignmentId]` (41 `fontSize`, 0 sub-floor) renders on the scale | WARN |
| 139-B6 | LINT | `no-restricted-syntax` in `eslint.config.mjs` at **WARN**, handling **all five value forms** | WARN |
| 139-B7 | TESTS | `tests/unit/kora-wp-139-typography-foundation.test.ts`: token/scale static · verbatim-from-`kora-signal.css` · 11px floor asserted over **both demonstrator closures** · lint-rule presence | — |

## P — `KORA-WP-140` IMPLEMENTATION BATCHES

| # | Batch | Scope |
|---|---|---|
| 140-B1 | ENUMERATION | **BLOCKED — governance input per §L.** Nine roles and seven states written down, with use and non-use |
| 140-B2 | SYSTEM | surface/state tokens → `lib/design/kora-design-tokens.ts`, **additive only** *(O1)* |
| 140-B3 | ROLES | complete `components/ui/px/` to the nine typed roles |
| 140-B4 | STATES | seven typed states; **`Suppressed` distinct from error**, **`Zero` distinct from `NoData`** — without editing `EmptyState`'s guarded `role=` string *(§K preferred path)* |
| 140-B5 | SEMANTIC COLOUR | make a danger tone on a healthy value **unconstructible** — narrow `tone` from a free `PxTone` to a value-derived contract; resolve the two `'mute'`/`'ink'` call sites |
| 140-B6 | DEMONSTRATOR D1 | recompose `/company/reports` onto ≥3 roles (today: 0 roles, 17 raw `<div>`s). **Precedes 139-B4** *(O3)* |
| 140-B7 | DEMONSTRATOR D2 | record the **8** roles already in use as `(F)` evidence — no migration required |
| 140-B8 | PRIVACY | prove Privacy Boundary quality **preserved or improved, never regressed** `(E)` |
| 140-B9 | TESTS | `tests/unit/kora-wp-140-surface-state-grammar.test.ts`: contract per role and per state · **structural** `ZERO ≠ NO DATA` and `SUPPRESSED ≠ ERROR` · semantic-colour impossibility by construction |

---

## Q — DEMONSTRATOR STRATEGY

Per `AN.3`, binding: a system foundation **may not be accepted against a component library, Storybook or unit
tests alone**, and **demonstrator migration must not silently become full persona remediation**.

- **D1 `/company/reports`** — the real work. Executive Judgment / **Report-Export subtype** (`AN.1`: warn
  ≈ 4,000px, *a subtype, not a seventh archetype*). Carries all 31 floor violations, 0 px adoption, 17 hand-rolled
  `<div>`s.
- **D2 `/advisor/companies/[assignmentId]`** — verification. Already on the px foundation with 8 roles and no
  floor violation. `(F)` is satisfied here at baseline.
- **`/company` is deliberately excluded** as an early demonstrator (`AN.3`), owned by `143`.
- Overlay from `AN.6`: `KORA-WP-136`/`137` and Advisor Product Experience must not edit the same Advisor surfaces
  concurrently. D2 is read-mostly for Wave 1, so the overlay is satisfied by not migrating D2.

---

## R — ACCEPTANCE BOUNDARY — WHAT IS *NOT* ACCEPTANCE

Explicitly outside both packages' acceptance, per the Registry rows and `AN.4`:

- Product-wide drift elimination (2,601 typography / 2,277 spacing) — **programme Definition of Done**
- Lint **BLOCK** — programme DoD; Wave 1 ends at **WARN**
- Page composition → `141` · data encoding → `142` · persona-wide migration → `127`–`129`, `143`, `130`
- Choosing a replacement Product UI family on taste alone — and §F shows no replacement is needed
- **No flag-day rewrite may be contracted** by either package

Both packages require **explicit Founder Visual Acceptance on the demonstrators** (`139` H, `140` G). Per the
standing ruling recorded in report `267`: the Founder **REJECTS** the current Company UI as final Product
Experience, and the previously reviewed WP138 screenshots **must not** be reused or recorded as Benchmark V2
Founder Visual Acceptance.

---

## S — OPEN DEBT NOT CLOSED BY THIS PRE-CHECK

`EV-R02` · Gate 3 **OPEN** · Gate 5 **OPEN** · `F-12` **OPEN** (gates `KORA-WP-069`) · `TRUST-04` **OPEN** ·
`KORA-WP-117` Founder-deferred · `KORA-WP-133` READY unauthorized · governance checker not wired into CI ·
`main` lacks `workflow_dispatch` · WP-138 CI attempt-1 root cause undetermined. **None is advanced or closed here.**

---

## T — MUTATIONS MADE BY THIS TASK

| Artefact | State |
|---|---|
| Product code | **untouched** |
| Registry `219` | **untouched — byte-identical** |
| Graph / statuses | **unchanged** — 144 nodes · 225 hard edges · COMPLETE 65 · READY 36 · BLOCKED 43 |
| Branches / worktrees | **none created**; nothing pushed |
| Gates | **none advanced** |
| This report | additive provenance only |

---

## U — VERDICT

- **`KORA-WP-139` — CLEARED TO IMPLEMENT.** Roots confirmed; no external blocker; a ratified nine-role type
  model already exists (§F); family reduction is largely deletion of two dead font loads; one overlay each on
  the token file, `px/Workspace.tsx` and the D1 page.
- **`KORA-WP-140` — CLEARED WITH ONE GOVERNANCE INPUT REQUIRED.** The nine-role / seven-state enumeration does
  not exist in any repository or governance artefact (§L). It blocks `140-B1` and the acceptance of `(A)`/`(B)`;
  it blocks neither `139` nor `140`'s `(C)`/`(D)`/`(E)` work. One named test collision (§K) has a clean additive
  resolution that supersedes nothing.

**PX WAVE 1: PRE-CHECK COMPLETE — WP139 CLEARED TO IMPLEMENT || WP140 CLEARED — ENUMERATION INPUT REQUIRED**
