# 238 — KORA-WP-049 — Explainable Quality Errors — CANONICAL COMPLETION REPORT

**Date:** 2026-09-21
**Package:** `KORA-WP-049` — Explainable Quality Errors (I2, BASE PILOT NON-BLOCKER)
**Status transition:** `KORA-WP-049` **READY → COMPLETE**
**Founder ruling applied:** **READING B — REACH THE RIGHT COMPANY PERSONA** (2026-09-21)
**Founder Visual Acceptance:** **GRANTED — 2026-09-21**
**Commit:** `422f92a37de620676ad4cf80791b8bc0bc98dbbf` — LOCAL ONLY, **NOT PUSHED**
**Parent:** `0bc14f6e484110ce65be8aa0c185a68208057359` (`KORA-WP-125`, accepted shared Product Experience foundation)
**Worktree / branch:** `/Users/simonefelicetti/KORA-wp049-worktree` · `feature/kora-wp-049-explainable-quality-errors`

---

## 1. THE FOUNDER READING

**`KORA-WP-049` does NOT mean** "polish technical error messages on an orphaned upload screen."

**It means:** a non-technical Company user must be able to understand data-quality / submission outcomes on the
**canonical reachable Company data journey**.

**Canonical Product surface: `/company/data`.**

Accepted information hierarchy, per submission:

1. **WHAT HAPPENED**
2. **WHAT IT MEANS**
3. **WHAT THE COMPANY SHOULD DO NEXT**
4. **WHAT KORA / KORA OPERATOR IS DOING**

This satisfies the canonical acceptance criterion — *"quality errors are explainable to a non-technical Company user."*

### Pre-check ambiguity and its resolution

All canonical sources agreed on the package (Registry `219` = Registry `102`; ledger `64` *MODIFY · S · PARTIAL ·
PT FT-081*; gap matrix `46` *"Quality-check functions exist; raise to the 'explainable + actionable' bar"*) — there was
**no source conflict**. The ambiguity was a **Product** question the sources left open: the acceptance criterion names a
Company user, but the only surface rendering quality issues (`/company/data/upload`) is **orphaned** — absent from
Company navigation — and its own copy states the Company does **not** self-serve ingestion. Three readings were put to
the Founder rather than one being chosen silently:

| Reading | Disposition |
|---|---|
| **A — last-mile fix on the upload page** | **REJECTED** — would perfect a surface the Company does not reach |
| **B — reach the right persona** | **SELECTED** |
| **C — one universal error contract** | **REJECTED** — architecture beyond this package, approaching `KORA-WP-070` |

---

## 2. CANONICAL COMPANY DATA JOURNEY

`/company/data` is the canonical Company-facing surface for submission status and explainable quality outcomes. It
consumes **existing** data from **`GET /api/company/data-submissions/history`**, which reads persisted
`analytics.source_batch` rows.

The implementation created **no** new endpoint, **no** new persistence, **no** new error-contract architecture, **no**
new quality engine and **no** schema. The endpoint itself was not modified.

---

## 3. PRODUCT INFORMATION NOW EXPOSED

From existing canonical data, per submission: source/submission identity · period · human-readable status (the
endpoint's own `STATUS_LABEL`, rendered as a **word** plus a visual state, never colour alone) · what that status means
· the next step · the Company-visible KORA Operator note when present · aggregate row counts (and rows not accepted) ·
aggregate eligibility outcomes where available, translated from raw keys to **Idonei / Parziali / Non idonei / Da
verificare**, each with its plain-language meaning.

Status meaning and next-step messaging are **Product presentation over existing workflow truth**. No domain-specific
remediation is invented beyond what the workflow actually supports: no SLA, no deadline, no promise, no fabricated
cause. The operator's explanation appears **only** where the endpoint gates it as Company-visible
(`admin_comment_company_visible`).

---

## 4. OPERATOR-MEDIATED MODEL PRESERVED

`KORA-WP-049` does **not** convert KORA into a Company self-service ingestion Product. The canonical operating model
stands: **Company supplies data → KORA Operator reviews/processes → status/outcome becomes visible to the Company →
the Company responds only where the workflow genuinely requires it.**

`/company/data/upload` remains **non-canonical, not added to navigation, orphaned/legacy and untouched** — asserted
across all five role navigations, in `Sidebar.tsx`, and by the absence of any link or parser coupling from the new
surface. No upload CTA or self-service affordance was introduced on `/company/data` (guards forbid `Carica`, `<input`,
`type="file"`, `FormData`, `upload`).

---

## 5. EMPTY-STATE PRODUCT RESULT

The zero-submission main column originally terminated at ~470px against a rail running to ~915px. Under the
WP-124/WP-125 principle — **whitespace is allowed, dead space is not** — it was recomposed with real workflow truth
only, and now ends at ~979px against a rail at ~927px.

Accepted composition: the primary state **"Nessun dato ancora inviato a KORA"**, then the real workflow —
**1. Invio dati → 2. Revisione KORA Operator → 3. Esito disponibile** — and a statement of what the Company will see
once submissions exist (each item naming a field the endpoint genuinely returns).

The empty state contains **no** fake submissions, KPIs, progress, synthetic activity or invented actions; the steps are
descriptive and **never clickable**; the rail keeps its complementary role (the operator-boundary notice and the
privacy sentence each appear exactly once).

---

## 6. PRIVACY / TRUST INVARIANTS — UNCHANGED

Aggregate-only Company-facing presentation · no `worker_id` · no pseudonym · no worker email · no raw individual-level
data · no raw row content · no storage paths or signed URLs · no payload samples · no internal DB/infrastructure
errors · no stack traces · no non-Company-visible Operator notes.

Guards assert both the page's own cleanliness and the **upstream** endpoint's aggregate filter, so the guarantee is
structural rather than cosmetic. A runtime DOM check found the only account-identity string on the rendered page to be
the **standard authenticated shell header showing the logged-in viewer's own account** — unrelated to submission-quality
data, present on every authenticated page, and **zero** matches inside the page's own `<main>`.

Session and tenant boundaries are untouched: `requireCompanyUser`, tenant derived exclusively from the trusted session,
`assertSameOrigin` on writes, RLS — none modified. The page adds no write path and passes no tenant identifier of its own.

---

## 7. DATA / MIGRATION: NONE — PROOF

Verified mechanically at closure, not assumed: the highest migration on the Product line is **089** (82 migration
files), unchanged from the baseline. No schema change, no migration, no RLS change, no backfill, no new table, no new
column, no fixture schema and no new data-quality persistence. A guard fails the suite if a migration is added.

---

## 8. READING C NOT IMPLEMENTED · WP-070 BOUNDARY PRESERVED

No universal error contract was created across the client parser, the Company ingest API, Admin Data Intake and
submission history. No `lib/quality-errors`, no `services/quality-errors`, no quality-error endpoint, no cross-domain
refactor — asserted by guards which also confirm the client parser and the Admin studio keep their **own** separate
vocabularies. That architectural work remains outside this package and may overlap future `KORA-WP-070` territory.

`KORA-WP-070` (full data-quality governance console) was **not** absorbed: no quality dashboard, issue lifecycle
management, filters/search, assignment, bulk remediation, governance policy, quality-history engine or operator-workflow
redesign. `KORA-WP-049` remains a message/explainability extension.

---

## 9. OUT OF SCOPE — RECORDED, NOT SOLVED

`/company/data/upload` still contains legacy **Foundation Light** terminology; broader Foundation Light semantics remain
unresolved; commercial plans/journeys, tenant capability entitlements and feature enable/disable by plan are untouched.
**Founder directive stands: commercial / entitlement strategy is deferred until the core KORA implementation is
complete.** No cleanup was performed and no package was created for it during this closure.

---

## 10. FINAL VISUAL EVIDENCE — ACCEPTANCE GRANTED

Real authenticated Company route, real local Docker Supabase, real canonical fixtures. **All three quality states were
produced through canonical APIs**, never written by hand: the Company created drafts (`POST
/api/company/data-submissions`), attached a real CSV (`/files`), submitted (`/submit`); KORA Admin then reviewed via
`PATCH /api/admin/company-submissions/[id]/review`, yielding `submission_accepted`, `submission_needs_clarification`
and `submission_pending` with genuine Company-visible operator notes. No interception, no reconstructed HTML, no fake
visual state.

| Evidence | Result |
|---|---|
| Populated state 1440 · 1100 · 768 · 375 | **PASS** |
| Empty state 1440 · 375 | **PASS** |
| Responsive verification 1100 · 768 | **PASS** — overflowX false, zero console errors |
| WP-125 Product Experience consistency | **PASS** |
| Explainability hierarchy | **PASS** |
| Operator-mediated workflow truth | **PASS** |
| Privacy / aggregate-only presentation | **PASS** |
| No self-service upload reintroduction | **PASS** |
| No dead canvas in empty state | **PASS** |

Accepted characteristics: WP-125 shell and foundation · deliberate 8+4 desktop composition · coherent single-column
collapse · status as word plus visual signal · distinguishable Operator notes · clear "Prossimo passo" · a useful rather
than decorative rail · an intentionally composed empty state · no page-local design system.

---

## 11. FINAL VERIFICATION (re-run at closure)

| Gate | Result |
|---|---|
| Focused set — 9 suites (WP-049, b106 Company boundary, WP-073 IA, WP-125 foundation, route privacy, origin guard, b169 nav, b95c, b144, tenant isolation) | **657 passed · 0 failed** |
| Full Vitest | **421 files · 13468 passed · 325 skipped · 5 todo · 0 failed** |
| `tsc --noEmit` | **exit 0** |
| ESLint (changed files) | **exit 0** |
| `next build` | **compiled successfully** |
| Highest migration | **089**, unchanged |
| Staged secrets scan | **clean** |

---

## 12. CHANGED-FILE SCOPE

| File | Change |
|---|---|
| `app/company/data/page.tsx` | the explainability layer + the accepted empty state |
| `tests/unit/kora-wp-049-explainable-quality-errors.test.ts` | **NEW** — 32 guards |

2 files, +775 / −44. Verified untouched: `app/api/**`, `lib/upload/file-parser.ts`, `/company/data/upload`, Admin Data
Intake, `SubmissionFeedbackService`, navigation, `supabase/**`, `middleware.ts`, `lib/auth/**`, `CLAUDE.md`,
`.kora-audit/**`. No screenshots, fixtures, scratch artefacts or ignored governance files were committed.

---

## 13. COMMIT INTEGRITY

| Check | Result |
|---|---|
| Commit | `422f92a37de620676ad4cf80791b8bc0bc98dbbf` |
| Parent is `0bc14f6e…` (WP-125) | **YES** |
| `KORA-WP-012` `ddf3e907…` ancestor? | **NO** (sibling) |
| `KORA-WP-039` `02cf4349…` ancestor? | **NO** (sibling) |
| `KORA-WP-048` `b257d264…` ancestor? | **NO** (sibling) |
| `KORA-WP-063` `da62e766…` ancestor? | **NO** (sibling) |
| Gate 3 `0cdc7e0d…` ancestor? | **NO** |
| Commits beyond baseline | **exactly 1** |
| Worktree after commit | **clean** |
| Upstream configured / pushed | **NO — local only** |

---

## 14. REGISTRY 219 CONSEQUENCES — DERIVED, NOT ASSUMED

- **`KORA-WP-049` READY → COMPLETE.** Founder Visual Acceptance PASSED 2026-09-21. Its sole Hard Dep `028` is COMPLETE.
- **Nothing is unlocked.** Section C's edge list contains no package whose Hard Deps include `049` — its only appearance
  is its own row `049:028` — and Section D contains no conditional edge referencing it. Zero dependents.
- **New aggregate: COMPLETE 61 · READY 31 · BLOCKED 33 · TOTAL 125.**
- **Graph invariants unchanged:** 125 nodes, 197 hard edges, 5 conditional edges, 4 scope triggers (all inactive),
  0 cycles, 0 self-dependencies, 0 dangling references.
- `KORA-WP-019`'s `NOT_YET_READY — FOUNDER-DEFERRED (READING C)` sequencing overlay is preserved, and its mechanical
  status remains **READY**.

---

**`KORA-WP-049` is COMPLETE. Founder Visual Acceptance GRANTED. One local commit. Not pushed.**
