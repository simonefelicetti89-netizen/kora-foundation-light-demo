# 271 — KORA-WP-141 + KORA-WP-142 — KORA Index V2: Founder Acceptance, Exact-SHA CI and Joint Completion

**Date:** 2026-09-26
**Scope:** joint completion/adjudication for `KORA-WP-141` (Composition, Archetypes & Spacing Adoption)
and `KORA-WP-142` (Data Visualisation Grammar).
**Why joint:** both packages close on ONE reconciled Product surface at ONE Product SHA under ONE Founder
Visual Acceptance and ONE exact-SHA CI run. Two reports would duplicate every piece of evidence and invite
the two halves to drift apart in the record.

---

## 1. Frozen Product SHA

`467893cf8fa0731cab698e1be917eba078dcd4d8`

Branch `feature/kora-index-approved-design-v2` (local only, never pushed), worktree
`/Users/simonefelicetti/KORA-design-impl-worktree`, baseline `cadb4178e943a774bab23d89c472623c22de7da6`,
**11 commits, 0 merge commits**, strict fast-forward descendant.

`CLAUDE.md` is **byte-identical** to the canonical base (`752bc2bf0109628a891078c795eba74e437a84d7a143f7449822cac5f255599c`)
and was re-verified after every local dev run, because `next dev` re-adds a tooling block to it.

## 2. Founder Visual Acceptance

**GRANTED** on the exact SHA above, covering: desktop composition, mobile composition, executive hierarchy,
verdict treatment, narrative coherence, ScoreDrivers/BoardActions separation, the Executive Intelligence
role, KORA Index scale presentation, the Safeguard/Confidence/BTI relationship, the BTI restrained threshold
grammar, disclosure grammar, reference-layer treatment, the no-persistent-accent direction and responsive
priority. The residual mobile delta (2,760px against a 2,700px QA target) is explicitly accepted.

## 3. Governed remediation preceding acceptance

Eight findings were raised and closed. Five were named by the Founder; **three more were surfaced by the
governed suites themselves** and are recorded because they were live defects, not test drift:

| # | Finding | Resolution |
|---|---|---|
| 1 | `--kora-space-*` used 19×, defined 0× — a `var()` resolving to nothing computes to `unset`, so every such rule was silently dropped | `:root` definitions restored exactly from the WP141 source |
| 2 | 22 off-scale inline spacing decisions (+1 in reports) | resolved to canonical steps; region margins reduced by the now-live 24px stack gap so approved totals survive exactly |
| 3 | `ConfidenceGauge` absent | restored as a capability primitive, not added to the composition |
| 4 | `TrendIndicator` absent | restored as a capability primitive, not added to the composition |
| 5 | `MacroblockCard.scoreColor` hardcoding 70/50 | config-backed claim; classification verified identical at every boundary |
| 6 | **WP142 (B) unmet** — AR/MAR/EVQ/CONT still bare, and `ActivationSafeguardPanel` held its own threshold scale | governed encodings ported |
| 7 | **14 sub-floor `fontSize: '10px'`** below the WP139 floor | raised |
| 8 | **`?? 0` coercing an absent component to a measured zero** | equity service boundary widened to accept `null` |

A ninth item was found and reported but is **not** a Product defect: the black control apparently overlapping
the mobile executive surface is `NEXTJS-PORTAL`, the `next dev` tools indicator, absent from production builds.

## 4. WP141 acceptance — mechanically adjudicated

| Criterion | Evidence | Result |
|---|---|---|
| (A) every canonical route declares an archetype | 21 routes; `/company/kora-index` → `EXECUTIVE_JUDGMENT`, `/company/reports` → `REPORT_EXPORT` | PASS |
| (B) T1–T5, chapter/anchor/column rules and length contracts defined and testable | 5 tiers, 6 archetypes, `warnHeightPx` 2500 | PASS |
| (C) each archetype defines a mobile priority model; reflow is never legal | 0 archetypes without one; `reflow` is not a legal value | PASS |
| (D) `SPACE` adopted on every surface this package touches | 0 off-scale on both surfaces; CSS custom properties mirror the tokens exactly | PASS |
| (E) ≥2 real canonical surfaces recomposed | `/company/kora-index` 4 chapters + declared mobile order; `/company/reports` 4 chapters + declared mobile order | PASS |
| (F) within the archetype length contract, recommendations exactly once | 1,834px vs 2,500px; `<BoardActions>` ×1, `<RecommendationsPanel>` ×1 | PASS |
| (G) Founder Visual Acceptance, real-Product demonstrators | granted on the frozen SHA; both demonstrators are live routes | PASS |

Governed suite `tests/unit/kora-wp-141-composition-archetypes.test.ts`: **34/34**.

## 5. WP142 acceptance — mechanically adjudicated

| Criterion | Evidence | Result |
|---|---|---|
| (A) the encoding primitives exist | 7 present and reachable from the shared px barrel | PASS |
| (B) the six bare threshold metrics encode significance on a real canonical surface | KORA Index, AR, MAR, EVQ, CONT, BTI all encoded; `AR 100%` → `ok`, `EVQ 10%` → `risk`, treatments differ | PASS |
| (C) the trend primitive renders an honest no-prior-period state, no historical data required | `no_prior_period` delegates to WP140 `NotYetAvailable`; no sparkline, no fabricated prior, delta only on the compared branch; `MacroblockCard` renders a delta only when one was supplied | PASS |
| (D) suppression and confidence encodings preserve the privacy boundary | `DistributionStrip` suppresses below N with N≥10 default; `ThresholdMeter` routes suppression to WP140 and `null` to NO DATA; Confidence uses no threshold scale, no semantic state colour, declares weight = 0 | PASS |
| (E) Founder Visual Acceptance | granted on the frozen SHA | PASS |

Threshold single-sourcing: **0 duplications** across the encoding primitives and the five adopting components.
Governed suite `tests/unit/kora-wp-142-data-visualisation-grammar.test.ts`: **68/68**.

## 6. Local validation at the frozen SHA

WP139 31 · WP140 48 · WP141 34 · WP142 68 · KORA Index V2 36 · verdict library 15.
`tsc --noEmit` clean · `eslint` 0 errors · `git diff --check` clean ·
**full suite 438 files / 13,985 tests / 0 failures**.

## 7. Exact-SHA CI

**KORA CI #339**, run `36257582329`, event `push`, branch `integration/kora-index-design-v2-2026-09-26`,
head `467893cf8fa0731cab698e1be917eba078dcd4d8`. Overall **SUCCESS**. All four mandatory jobs green:

1. TypeScript, tests, build, lint (blocking) — SUCCESS
2. DB-backed gate — RLS-03/05/06 + KORA Link behavioral suite — SUCCESS
3. E2E smoke (Playwright, public pages) — SUCCESS
4. E2E golden path (Playwright, local Supabase, seeded) — SUCCESS

Evidence supplied by direct Founder inspection of the GitHub Actions run. This session could not read it —
`gh` is not installed and no token is present — and recorded that limitation rather than inferring a result.

## 8. Registry transitions

`KORA-WP-141` **READY → COMPLETE**
`KORA-WP-142` **READY → COMPLETE**

Both Section C markers additionally carried a stale `BLOCKED — CANONICALIZED 2026-09-24, NOT STARTED`
prose marker: the 2026-09-26 re-derivation recorded in AL.4 moved them BLOCKED → READY when `139` closed,
and the Section C text was not carried with it. That drift is corrected in place with the `~~struck~~ —
**AMENDED**` idiom rather than silently overwritten. It never affected derived state: the checker takes the
COMPLETE set from AL.2 and **computes** READY/BLOCKED from the Section C dependency graph.

## 9. Mechanically derived dependent transitions

`KORA-WP-126` **BLOCKED → READY** — hard deps `125, 139, 140, 141, 142`, all now COMPLETE.
`KORA-WP-143` **BLOCKED → READY** — hard deps `139, 140, 141, 142`, all now COMPLETE.

Derived from the live graph, not assumed. **A READY status is scheduling truth only and is not
authorisation to start.**

## 10. Registry totals — derived, not fitted

| | Before | After |
|---|---|---|
| COMPLETE | 67 | **69** |
| READY | 36 | **36** |
| BLOCKED | 41 | **39** |
| TOTAL | 144 | **144** |

READY is unchanged because two packages left it (`141`, `142`) and two entered it (`126`, `143`).
Hard edges **225**, conditional edges **5**, scope triggers **4**, cycles **0** — all unchanged. This closure
adds an encoding grammar, a verdict library, four design primitives and two demonstrator recompositions;
it introduces, removes and activates no edge and no trigger.

**Wave W2 of the Product Experience programme is closed** — `141` and `142` were its two members.

## 11. Governance validation

`lib/governance/registry-consistency.ts`: INV-01, 02, 03, 04, 05, 06, 07, **08**, 14 all **PASS**.
INV-08: `derived COMPLETE=69 READY=36 BLOCKED=39 TOTAL=144; declared=69/36/39/144`.
INV-06: `cycles=0 self-deps=[] dangling=[]`.
INV-11 remains **KNOWN_EXCEPTION** — Registry 102 is still absent from `.kora-audit/output` (verified: 0
matching files), so the historical condition genuinely still applies and `CLAUDE.md` §8 remains the
compensating control. It was not used to absorb a new failure.

Governance suites: `governance-registry-consistency` 23/23, plus
`cc00-index-registry-canonicalization`, `cc003-i10-registry-completeness`, `cc00-i9-governance-ratification`
— 116/116. `git diff --check` clean.

## 12. Not claimed by this report

Canonical Product integration is **not** claimed here. Overall Product Experience remains **NOT ACCEPTED**
under the Benchmark V2 programme; this report closes two packages, not the programme.

Content/UX polish debt remains open and is explicitly **not** a WP141/WP142 blocker: implementation-facing
wording such as `not_kora_index_component` and `macroblock_status_thresholds` still surfaces in deep content.
No new WP was created for it.

Known open debt elsewhere is untouched: `EV-R02`, Gate 3, Gate 5, `F-12`, `TRUST-04`, the governance checker
not being wired into CI, and `main` lacking `workflow_dispatch`.
