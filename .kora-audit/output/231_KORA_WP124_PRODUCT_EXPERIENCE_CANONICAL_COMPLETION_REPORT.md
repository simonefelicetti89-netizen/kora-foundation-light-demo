# 231 — KORA-WP-124 · Product Experience North Star & Visual Language — Canonical Completion Report

**Date:** 2026-09-20
**Package:** `KORA-WP-124` — Product Experience North Star & Visual Language · Milestone `PX`
**Status:** **COMPLETE**
**Gate I:** **MET — EXPLICIT FOUNDER VISUAL ACCEPTANCE GRANTED, 2026-09-20**
**Registry:** `219_KORA_MASTER_PLAN_CANONICAL_EXECUTION_REGISTRY_WITH_PRIME_PREP_AND_PRODUCT_EXPERIENCE.md`

---

## 1. Baseline and workspace

| | |
|---|---|
| Baseline SHA | `5f9426974791b6e2ff292aa7634860c4666bd91a` (frozen RC head, PR #172) |
| Branch | `feature/kora-wp-124-product-experience-north-star` |
| Worktree | `/Users/simonefelicetti/KORA-wp124-worktree` (dedicated, created for this package) |
| Inherited | Nothing from `gate3/prelive-privacy-remediation` — verified: neither `ce74b0d7` nor `0cdc7e0d` is an ancestor |
| Hard deps | `KORA-WP-047`, `KORA-WP-073`, `KORA-WP-088` — all COMPLETE before start |

## 2. Founder Visual Acceptance

Granted 2026-09-20. The Founder accepted **KORA SIGNAL** as the Product Experience North
Star and Visual Language for KORA, comprising: the final exemplar set; responsive
direction at 375 / 768 / 1440; SIGNAL shell and Product chrome; typography; density
system; surface hierarchy; two-register colour architecture; tables; data visualisation;
forms and states; accessibility rules; the three proprietary grammars
(A Intelligence Composition · B Qualification / Evidence · C Five-Pillar Balance);
the IU Trace as the qualification/provenance grammar for operational workflows; and the
implementation handoff.

Round 1 (`Calm Intelligence`) was rejected. Rounds 2, 2B and 2C were the accepted
direction's development. They remain locally as supporting exploration evidence and are
**not** the canonical Product direction.

## 3. Final exemplar inventory — `design/wp124-final/`

| Surface | File | Environment | Grammar |
|---|---|---|---|
| Inventory | `index.html` | — | — |
| Company Intelligence | `company.html` | Company | A · B · C |
| Dense Operations | `operations.html` | Company | B |
| Worker / My KORA | `worker.html` | Worker | A (personal register) · C |
| Admin / Control Plane | `admin.html` | Admin | B |
| Partner | `partner.html` | Partner | B |
| Advisor | `advisor.html` | Advisor | B |
| States / Form system | `system.html` | System | — |

Normative visual source: `kora-signal.css`. Specification and handoff: `HANDOFF.md`.
Each environment carries only the grammar that belongs to its Product meaning — per
Founder ruling, proprietary grammars are not replicated onto surfaces where they carry
no Product meaning; KORA identity is systemic through shell, rhythm, evidence,
interaction, semantics and environment-specific workflow.

## 4. Responsive evidence

24 captures, `shots/{surface}-{1440|768|375}.png`. Automated sweep: **no console errors
and no horizontal page overflow on any surface at any width.** Navigation transforms
(248px sidebar → 68px rail → top bar), analytics reprioritise, tables become record
lists, the drawer becomes a stacked sheet. Nothing is merely scaled down.

## 5. Accessibility evidence

All persistent text pairings clear WCAG AA 4.5:1, computed not asserted. Two real
failures were found during validation and fixed: `--ink-3` at 4.45:1 on the L0 canvas
(raised to .58 → 4.77:1) and sidebar group labels at 3.19:1 (raised to .62 → 7.64:1).
Single focus ring (2px Violet, 2px offset) never removed; status always dot + word so
colour is never the only signal; four of five pillar fills fail AA as text and are
therefore restricted to data marks with ink labels; `prefers-reduced-motion` collapses
all durations globally.

## 6. Canonical mathematics — semantic correction made during the package

An intermediate round rendered the KORA Index as `54,5` by renormalising over available
weight. That is **forbidden** by canonical doctrine, verified in four places:
`insufficient_data contribuisce 0 senza redistribuzione (tetto, non gonfiaggio)` —
`lib/kora-engine/kora-index-engine.ts:14`, `lib/constants/kora.ts:110`,
`lib/live/persistence.ts:52`, `lib/kora-engine/run-kora-pipeline.ts:14`.
The final exemplars render the canonical value **50,4** with a **ceiling of 92,5** drawn
rather than divided away, using the canonical terms `senza redistribuzione` and `tetto`.
No Product mathematics was changed by WP124; the visual was corrected to match it.

## 7. Acceptance gates

| Gate | Status |
|---|---|
| A — coherent KORA-specific North Star | MET |
| B — visual language sufficient to implement without hidden decisions | MET |
| C — exemplars across materially different screen types | MET |
| D — works for Admin, Company, Worker, Partner, Advisor without looking identical | MET |
| E — assessed at 375 / 768 / 1440 | MET |
| F — no regression of `047`/`073` accessibility foundations | MET |
| G — works under dense enterprise information conditions | MET |
| H — empty, loading, error, success, interaction states | MET |
| I — explicit Founder Visual Acceptance | **MET — granted 2026-09-20** |

## 8. Known future governance item — NOT resolved by WP124

**`CLAUDE.md` §6 applied to multi-record views.** §6 requires every surface showing a
KORA Index to display Index + Confidence Score + Activation Safeguard +
`methodology_version_id` + `calibration_status` + the ten-component breakdown +
limitations. A full Index surface satisfies this. A **cross-tenant list** (Admin) shows
an Index value per row and cannot carry a ten-component breakdown per row; the exemplar
shows Index · Δ · CS · Safeguard · Tetto per row with methodology and calibration stated
once at surface level.

Whether that satisfies §6 is a **governance interpretation** and was explicitly **not**
adjudicated by WP124 or by the Gate I decision. It is recorded in `HANDOFF.md` §22 as a
mandatory escalation: implementation adopts the exemplar's treatment and escalates any
deviation. It must be ruled on **before the relevant Admin implementation package
ships**. `CLAUDE.md` was not altered.

## 9. Impact boundary

- **No Product page changed.** Zero tracked Product files modified across the package.
  Nothing added under `app/`, `public/`, `components/`, `lib/`, `services/`, `supabase/`.
- **No route created.** Exemplars live in `design/`, outside Next.js routing and outside
  `public/`.
- **No database, API, auth or RLS impact.** `Data/Migration Impact: NONE`, as specified.
- **No Production, Supabase, Vercel or remote action** of any kind.
- **No PX-B and no PX-C implementation.** Both remain PROVISIONAL, UNNUMBERED,
  NON-CANONICAL and NOT STARTED.
- **Gate 3 untouched.** `gate3/prelive-privacy-remediation` remains at
  `0cdc7e0dd1c9293b25a84bb921942cc792052427`, unpushed, with its three untracked
  working documents intact.
- **PR #172 untouched.** RC frozen at `5f9426974791b6e2ff292aa7634860c4666bd91a`.

## 10. Registry consequence

`KORA-WP-124` transitions **READY → COMPLETE**. Mechanically verified aggregate counts:

| | before | after |
|---|---|---|
| COMPLETE | 54 | **55** |
| READY | 36 | **35** |
| BLOCKED | 34 | **34** |
| TOTAL | 124 | **124** |

The 21 UI-bearing packages previously strategically deferred pending WP124
(`039, 048, 063, 064, 066, 068, 069, 070, 071, 072, 074, 075, 076, 077, 085, 086, 089,
094, 095, 098, 099`) now have that strategic deferral **SATISFIED**. Their mechanical
statuses are **unchanged**; none is activated, none is marked COMPLETE, and no
dependency edge was added. `KORA-WP-085` retains its independent `External Blockers:
Gate 3` condition. The separate `KORA-WP-120` registry inconsistency is **not** resolved
by this task and remains open.

## 11. Version-control note

`.kora-audit/` is excluded from version control by `.gitignore:54`. This report and
Registry `219` therefore **cannot be committed**; they exist as the local governance
corpus. The WP124 local commit contains only the trackable canonical material under
`design/wp124-final/`.
