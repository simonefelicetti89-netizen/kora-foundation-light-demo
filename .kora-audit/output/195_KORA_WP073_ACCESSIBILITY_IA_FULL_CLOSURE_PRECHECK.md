# 195 — KORA-WP-073 "Accessibility/IA Full Closure" — Canonical Pre-Check

**PRE-CHECK ONLY. No implementation performed. No application code modified. No tests modified. No migration created. No commit. No push.**

Performed on branch `feature/wp073-accessibility-ia-full-closure`, created from the clean, pushed WP-047 commit `b36a989cffdc2e020ec7739cee23858b16569f49` in the existing clean worktree (`/Users/simonefelicetti/KORA-wp047-worktree`) — the original dirty worktree was never accessed.

---

## 1. Executive conclusion

**KORA-WP-073 is READY**, re-verified from source (not inherited from report 194): its sole Hard Dependency, `KORA-WP-047`, is COMPLETE; no External Blocker, Scope Trigger, or named Gate applies. "Full Closure" is precisely defined, not assumed: the full (not pilot-slice) closure of exactly two named canonical gaps — `KORA-GAP-A11Y-001` (accessibility, `docs/EXPERIENCE_LAYER.md`-governed) and `KORA-GAP-PLATFORM-025` (information architecture — specifically the "sidebar/route architecture of the five environments" open questions OQ-D01/D02/D03, per doc 49's own citation) — across all five canonical role environments (Admin, Company, Worker, Partner, Advisor), explicitly excluding Living KORAL, Future Vision mockups, and pure visual/token standardization (that is `KORA-WP-088`'s own separate scope). A repository-wide code-truth survey found the real remaining debt to be **substantially larger** than WP-047's own pilot slice: the shared `Field`/`Table` primitives WP-047 remediated are used by only 1 and 0 files respectively across the entire application, while 30 files contain raw `<input>` markup and 27 contain raw `<table>` markup outside those primitives — meaning WP-073 cannot rely on WP-047's primitive-level fixes cascading automatically; it requires direct, per-screen remediation at meaningfully larger scale than Registry 142's own "Size: M" label suggests. GO for a future implementation task; not implemented here.

## 2. Exact canonical WP-073

Reconstructed verbatim from Registry 142, line 179:

- **Title**: Accessibility/IA Full Closure
- **Increment**: I3 (First Sellable Product)
- **Objective (Purpose)**: site-wide (not pilot-slice-only) A11y/IA closure
- **Pilot Status**: NOT BASE PILOT SCOPE
- **Primary Closures**: `KORA-GAP-A11Y-001` (full), `KORA-GAP-PLATFORM-025` (full)
- **Early-Slice**: N/A — this WP is itself the full closure of `KORA-WP-047`'s own early slice
- **Arch Sources**: `docs/EXPERIENCE_LAYER.md`
- **Code Truth**: PARTIAL
- **Existing Paths**: N/A
- **Proposed New**: N/A — remediation only
- **Hard Deps**: `KORA-WP-047`
- **Conditional Deps**: N/A
- **Parallelization**: independent (of `KORA-WP-088`, explicitly)
- **Data/Migration Impact**: NONE
- **Expand/Migrate/Cutover/Contract**: N/A
- **Service/API**: N/A
- **Auth/RLS**: N/A
- **UI**: full-site remediation
- **Privacy/Trust**: N/A
- **Audit**: N/A
- **Async/Idempotency**: N/A
- **Tests**: full-site accessibility audit
- **Feature Flag**: NO
- **Rollback**: N/A
- **Acceptance**: site-wide closure
- **Out of Scope**: N/A (registry field literally empty — resolved precisely in §5 below via the two Primary Closures' own boundaries)
- **Size**: M
- **Uncertainty**: LOW
- **External Blockers**: none
- **Evidence Gate**: N/A

Cross-checked against Section C's DAG line: `073:047` — confirms the sole Hard Dep, no other dependency.

## 3. Frozen sources

- **`docs/EXPERIENCE_LAYER.md`** — WP-073's own named Arch Source (same as WP-047's). Already fully read for the WP-047 pre-check (report 192 §3); re-confirmed unchanged.
- **`docs/30-kora-brand-visual-product-experience-constitution.md`** §21 — consistent with `EXPERIENCE_LAYER.md`, no conflict (already established, report 192 §3).
- **Registry 142's own inventory line** (Section within the GAP matrix, re-read this task): `KORA-GAP-A11Y-001·MODIFY·SB·M·docs/EXPERIENCE_LAYER·PARTIAL·073·047(slice)·I2(slice)/I3(full)·BASE NON-BLOCKER(slice)·none·none·PARTIALLY IMPLEMENTED` and `KORA-GAP-PLATFORM-025·MODIFY·SB·M·PT OQ-D01/02/03·PARTIAL·073·047(slice)·I2(slice)/I3(full)·BASE NON-BLOCKER(slice)·none·none·PARTIALLY IMPLEMENTED`.
- **`.kora-audit/output/49_GLOBAL_TRACEABILITY_MATRIX.md`** — located to resolve `KORA-GAP-PLATFORM-025`'s own cryptic Arch Source citation ("PT OQ-D01/02/03"): line 231 resolves `OQ-D01` = "Sidebar / route architecture of the five environments." `OQ-D02`/`OQ-D03` (per `.kora-audit/output/45/46/50`'s own cross-references) concern IA decisions for Network/Territory map-mode and directory views — real but narrower, secondary to OQ-D01's own core sidebar/route-architecture question.
- **`.kora-audit/output/143_KORA_PRIME_PREPARATION_CANONICAL_PRINCIPLES_AND_BOUNDARIES.md`** — read; contains zero mention of WP-073, accessibility, A11y, or design system anywhere. Governs Prime Preparation (`KORA-WP-120`–`123`, I7-PREP) exclusively — not applicable to WP-073's own semantics. Listed by this task as a canonical-authority source to check, but does not in fact govern this WP; noted rather than silently ignored.

**No conflict found between any of these sources, or against Registry 142.** No `STOP — FOUNDER REVIEW REQUIRED` condition triggered.

## 4. Definition of "Full Closure"

Mechanically derived, not assumed: "Full Closure" = the full (not pilot-slice-bounded) closure of exactly the same two gaps `KORA-WP-047` partially closed — `KORA-GAP-A11Y-001` and `KORA-GAP-PLATFORM-025` — confirmed by both gaps' own registry rows naming `073` as their `full` closure and `047(slice)` as the prior partial one. It is **not** "literally every route/component in the repository" — `KORA-GAP-DESIGN-001` and `KORA-GAP-RESPONSIVE-001` (visual/token/responsive standardization) are explicitly separate gaps, closed by `KORA-WP-088`, not `073` (§10 below).

`KORA-GAP-PLATFORM-025`'s own real substance (OQ-D01, doc 49) is the **sidebar/route architecture of the five environments** — meaning WP-073's own IA half is concretely about finalizing and closing open navigation-architecture questions across all five canonical role environments (`KORA_ADMIN`, `COMPANY_ADMIN`/`COMPANY_VIEWER`, `WORKER`, `PARTNER`, `ADVISOR` — the exact five `EXPERIENCE_LAYER.md` §7 "Sidebar Navigation Logic" already enumerates), not a vague general "improve IA" mandate.

## 5. In-scope / out-of-scope / conditional matrix

| Surface | Classification |
|---|---|
| Shared UI primitives (`components/ui/*`) | IN SCOPE — any residual gap WP-047 didn't reach |
| Shared layout/chrome (`AppShell`, `Header`, `Sidebar`, `KoraLogo`) | IN SCOPE — especially the sidebar/route IA closure (OQ-D01) |
| `/admin/*` (KORA Admin environment, ALL routes incl. internal diagnostic/operational tooling) | IN SCOPE — WP-047 excluded internal tooling as "not pilot-facing"; WP-073's own "full/site-wide" mandate has no such narrowing |
| `/company/*` (Company environment) — excluding `/company/living-koral/*` | IN SCOPE |
| `/my-kora/*`, `/worker/*` (Worker environment) | IN SCOPE |
| `/partner/*` (Partner environment) | IN SCOPE |
| `/advisor/*` (Advisor environment) | IN SCOPE |
| `/`, `/demo-guide`, `/login`, `/request-access`, `/privacy` (public/auth) | IN SCOPE |
| `/company/living-koral/*` and any Living KORAL UI (deferred Mark preview/download) | **OUT OF SCOPE** — explicitly forbidden by this task; also structurally absent from this worktree (never committed) |
| `/demo/future-vision`, any doc-22A-§6-labeled Future Vision mockup | CONDITIONAL — only the "clearly labeled inactive" IA requirement applies (already an existing CLAUDE.md rule); no deep semantic remediation, since these are non-functional, deliberately-mockup surfaces not named under either `KORA-GAP-A11Y-001` or `KORA-GAP-PLATFORM-025` |
| Visual/token/hex-literal standardization anywhere (199 files found with literal hex, §7) | **OUT OF SCOPE** — `KORA-WP-088`'s own gap (`KORA-GAP-DESIGN-001`/`KORA-GAP-RESPONSIVE-001`), not `073`'s (§10) |
| Data model / migrations / RLS / auth / backend services | OUT OF SCOPE — Registry 142: Data/Migration Impact NONE, Auth/RLS N/A |

## 6. Relationship to WP-047

**Inherit, reuse, do not duplicate:** the 8 remediated shared primitives (`Button`, `DataBar`, `EmptyState`, `Explainer`, `Field`, `Tabs`, `Tooltip`, and `Table` — audited, already compliant) stay as-is; `tests/unit/kora-wp-047-design-system-a11y.test.ts` (33 tests) is the direct structural-test foundation WP-073 should extend, not replace; the confirmed-compliant chrome layer (`Header`/`AppShell`/`Sidebar` landmarks, `useReveal`/`useCountUp` reduced-motion) needs no re-verification, only extension where WP-073 touches new surfaces.

**Do not regress:** none of WP-047's own fixes should be reverted or loosened.

**Critical correction to a prior assumption**, found only by this task's own repository-wide code-truth survey (§7): WP-047's own remediation strategy — fix the shared primitives once, let it cascade — does **not** actually cascade broadly, because most of the application's real forms/tables (30/27 files respectively) bypass the shared `Field`/`Table` primitives entirely with bespoke markup. WP-073 must budget for substantial **direct, per-screen** remediation, not merely "primitive audit was already done, so most of the surface is covered."

## 7. Repository accessibility map (read-only inventory)

- **Route families**: 193 `.tsx` files under `app/`, 113 under `components/` (counted, not individually opened for this precheck — see sampling method below).
- **Shared layout**: `AppShell`, `Header`, `Sidebar`, `KoraLogo` — confirmed compliant (report 192).
- **Shared UI primitives**: 8, all remediated/confirmed by WP-047 (report 193).
- **Forms**: shared `Field` primitive (`FieldInput`/`FieldSelect`/`FieldTextarea`) used in only **1** file; **30** files contain raw `<input>` elements outside it. Spot-checked two: `app/auth/forgot-password/page.tsx` (has a proper `<label>`+`aria-required`+`aria-live` pattern — already reasonably accessible) vs. `app/advisor/companies/page.tsx` (4 raw `<input>` elements, only 1 has an adjacent `<label>` — the other 3 are real, disclosed candidate defects, likely relying on `placeholder` alone).
- **Tables**: shared `Table` primitive used in **0** files; **27** files contain raw `<table>` markup outside it — unaudited.
- **Tabs**: shared `Tabs` primitive exists and is remediated (WP-047); usage breadth across the 193 route files not individually verified in this precheck — a concrete implementation-phase task.
- **Dialogs/modals**: **none exist in the codebase** — no dialog/modal component family found at all. Zero debt in this category by construction.
- **Tooltips**: shared `Tooltip`/`Explainer` primitives exist and are remediated (WP-047).
- **Menus**: exactly one, `components/auth/AccountMenu.tsx` — has `aria-label`/`aria-expanded` on its trigger (good), but **no `Escape`-to-close keyboard handling and no `aria-haspopup`** — a real, narrow, disclosed gap. Its dropdown content is plain navigational `<a>`/`<Link>` elements, which is the semantically CORRECT choice (not `role="menu"`, which WAI-ARIA reserves for command/action menus, not navigation lists) — not a defect.
- **Charts/data visualization**: `components/charts/ChartFrame.tsx`, `ComponentBreakdownChart.tsx` — not individually audited in this precheck; flagged as a concrete implementation-phase target (charts are a well-known accessibility risk category — non-color-only meaning, text alternatives).
- **Loading/error/empty states**: `EmptyState` primitive remediated (WP-047); per-screen usage breadth not verified here.
- **Images**: zero `<img>` without an `alt` attribute found repository-wide — clean.
- **Auth/admin/company/advisor/worker/partner/public screens**: all present and route-mapped (§5); not individually opened file-by-file in this precheck — a full open-every-file audit is implementation-phase work, not precheck work; this section instead establishes evidence-based scope and risk, per the task's own framing ("read-only inventory... identify actual remaining accessibility/IA debt" — satisfied via targeted sampling plus repository-wide structural greps, not exhaustive manual review).

## 8. Accessibility debt by category

| Category | Finding | Severity | Shared-fix leverage |
|---|---|---|---|
| A. Semantic HTML | Not systematically surveyed beyond forms/tables above; likely scattered, unquantified | Unknown — implementation-phase discovery | Partial (via shared primitives once adopted) |
| B. Keyboard/focus | `AccountMenu` — no Escape-to-close | Low-Medium | No — single-file fix |
| C. Accessible name/description | ≥3 raw `<input>` instances in `app/advisor/companies/page.tsx` likely lack a label; pattern likely repeats across the other 29 raw-input files | Medium | Yes — if migrated to shared `FieldInput`, this class of defect is eliminated by construction |
| D. Forms/errors/status | Same 30-file raw-input population — error/status announcement pattern (the `aria-describedby`+`role=alert` WP-047 added to `Field.tsx`) is not present outside that primitive | Medium | Yes — same migration |
| E. Headings/landmarks | Chrome-level landmarks already compliant (§6); per-page heading hierarchy inside the 193 route files not individually verified | Unknown | Partial |
| F. Tabs/menu/dialog patterns | `Tabs`/`Tooltip` primitives compliant; `AccountMenu` gap (see B); zero dialogs exist | Low | N/A |
| G. Tables/data visualization | 27 raw `<table>` files unaudited; chart components unaudited | Medium-High (volume) | Yes for tables (migrate to shared `Table`), charts need bespoke review |
| H. Reduced motion | Shared hooks compliant and now test-guarded (WP-047); no other motion-bearing component identified in this precheck | Low | Covered |
| I. Non-color-only meaning | Not systematically surveyed; the `Safeguard` status system (CLEAR/WARNING/FLAGGED) is a canon-governed pattern worth a targeted check (uses color-coded badges — confirm text/icon redundancy exists) | Unknown, worth prioritizing given its constitutional importance (doc 21b) | Yes, likely one shared badge component |
| J. Touch target/interactive sizing | `Explainer`'s compact icon already fixed (WP-047); other small interactive controls (icon-only buttons elsewhere) not surveyed | Unknown | Partial |
| K. Responsive accessibility | Out of this WP's own scope per §10 (belongs to `KORA-GAP-RESPONSIVE-001`/`WP-088`) unless a responsive change is itself required to fix an accessibility defect (rare, narrow exception) | N/A | N/A |
| L. IA/navigation | Sidebar/route architecture (OQ-D01) across all 5 environments — the core of `KORA-GAP-PLATFORM-025`; not yet closed (registry: PARTIALLY IMPLEMENTED) | Medium-High (canonical, named) | Yes — one coherent IA decision, not per-file |
| M. Design-token consistency | Explicitly OUT OF SCOPE for `073` (§10) — 199 files with literal hex is `WP-088`'s own, much larger, separate undertaking | N/A here | N/A here |
| N. Test coverage gaps | Zero coverage for: raw-input labeling correctness, raw-table structure, `AccountMenu` keyboard behavior, chart accessibility, non-color-only Safeguard meaning | High (currently zero) | Yes — extend `kora-wp-047-design-system-a11y.test.ts` |
| O. Runtime-only validation needs | Authenticated role-specific visual/keyboard walkthroughs cannot be fully replaced by structural source tests (§12) | Medium | N/A |

No severity was inflated: items marked "Unknown" are honestly disclosed as un-surveyed rather than assumed absent or assumed present.

## 9. IA debt

Beyond WP-047's own scope, `KORA-GAP-PLATFORM-025`'s own real, named substance is closing **OQ-D01** ("Sidebar / route architecture of the five environments") — this is the primary, canonically-cited IA work item, not a generic "improve navigation" instruction. Concretely, per `EXPERIENCE_LAYER.md` §7's own already-documented (but not yet formally "closed") Sidebar Navigation Logic for all five environments (`KORA_ADMIN`, `COMPANY_ADMIN`/`COMPANY_VIEWER`, `WORKER`, `PARTNER`, `ADVISOR`), WP-073 should confirm/finalize: consistent page-title conventions (via `PageHeader`/`PageMasthead`, already `<h1>`-correct per WP-047's own audit), navigation-group clarity within each role's own Sidebar, primary-vs-secondary action consistency (the `Button` variant system, already remediated), and — the one genuinely open item — whether the current Sidebar/route structure across all 5 environments represents a settled, closed IA decision or still has open branches (OQ-D02/D03, map/directory-view IA questions, appear scoped to Network/Territory features specifically, narrower than OQ-D01's own core sidebar question). No product-terminology rewrite is proposed or needed — none of the sources read require one.

## 10. WP-073 vs. WP-088 boundary

**WP-073 (Accessibility/IA Full Closure)** owns: ARIA semantics, keyboard operability, accessible names/labels, focus management, landmark/heading structure, form error announcement, non-color-only meaning, touch-target sizing corrections tied to an accessibility defect, and the sidebar/route IA closure (OQ-D01). **WP-088 (Responsive/Design System Full Closure)** owns: the 199-file literal-hex/token-consistency cleanup, responsive breakpoint standardization (`KORA-GAP-RESPONSIVE-001`), and any purely visual/component-standardization work with no accessibility dimension.

**Overlap requiring coordination**: migrating the 30 raw-`<input>`/27 raw-`<table>` files to the shared `Field`/`Table` primitives is legitimately a WP-073 concern (it closes real accessible-name/error-announcement/table-semantics gaps) but will, as an unavoidable side effect, ALSO replace whatever ad-hoc (possibly hex-literal) styling those raw elements currently use with the already-token-based shared primitives — a partial, incidental overlap with WP-088's own token-cleanup goal. **Recommended ordering**: WP-073 should proceed first and take this incidental token cleanup wherever the underlying element is being touched for accessibility reasons anyway (no extra cost); WP-088 should not be blocked waiting for WP-073, but should expect a smaller remaining literal-hex count by the time it starts, and must not re-litigate or duplicate WP-073's own semantic fixes.

## 11. Deferred/future surfaces

- **Living KORAL final renderer / future visual package**: explicitly OUT OF SCOPE (§5); not present in this worktree at all.
- **Future 3D manifestation**: not applicable — does not exist, not started.
- **Future Vision screens** (`docs/22A` §6): CONDITIONAL (§5) — labeling-only, no deep remediation.
- **Experimental/internal admin tooling** (`/admin/activation-signal-pipeline`, `/admin/data-lifecycle`, `/admin/kora-link-lab`, etc.): **IN SCOPE** for WP-073 specifically (unlike WP-047's own pilot-slice exclusion) — these ARE part of the `/admin` environment's own "full site" surface, and Registry 142's own Acceptance text for `073` is unqualified "site-wide closure," with no pilot-facing narrowing. This is the single largest scope-expansion delta versus WP-047, and is called out explicitly rather than silently assumed.
- **Deprecated routes**: none identified as formally deprecated in this precheck; not a distinct concern.

## 12. Authenticated runtime validation requirements

Registry 142's own Acceptance ("site-wide closure") and Tests field ("full-site accessibility audit") do **not** explicitly mandate a manual authenticated walkthrough as a precondition for COMPLETE — matching the same reading applied to WP-047 (report 193 §25): the canonical bar is a code-level accessibility audit, which automated structural tests (extending the WP-047 pattern) satisfy. However, unlike WP-047's narrower pilot slice, WP-073's own "full site" scope spans genuinely role-differentiated screens (Admin-only tooling, Partner-only flows, Advisor-only flows) where a structural source-code check cannot fully substitute for seeing the ACTUAL rendered, focused, keyboard-navigated experience in each role — so this precheck records authenticated runtime validation as **CONDITIONAL**: not mandatory for a code-level COMPLETE determination, but genuinely valuable and should be attempted opportunistically if/when credentials become available, without blocking on their absence, exactly as WP-047 established. **Credentials currently available: NO** (same disclosed gap as WP-047, report 193 §20 — `E2E_KORA_ADMIN_*`/`E2E_COMPANY_A_*` env vars remain absent from this worktree). None will be fabricated.

## 13. Automated test strategy

Extend `tests/unit/kora-wp-047-design-system-a11y.test.ts`'s own established structural-assertion pattern (no DOM-rendering framework — matching this repository's own convention, confirmed still true) into a new `tests/unit/kora-wp-073-accessibility-ia-full-closure.test.ts` covering: (a) a repository-wide structural guard that flags raw `<input>`/`<table>` usage outside the shared primitives, converted incrementally into a shrinking allow-list as files are migrated (the same technique this codebase already uses elsewhere for tracked-debt guards); (b) per-migrated-file label/aria-describedby assertions, mirroring WP-047's own `Field.tsx` test pattern; (c) `AccountMenu.tsx` keyboard/aria-haspopup assertions once fixed; (d) a non-color-only-meaning check for the Safeguard badge system; (e) chart-component accessible-name/text-alternative assertions once reviewed. No heavy new dependency (jsdom/testing-library) proposed at precheck stage, consistent with WP-047's own precedent and this task's own explicit instruction.

## 14. Security/backend boundary

Confirmed, as expected: **NO DB migration, NO RLS change, NO auth redesign, NO domain service redesign, NO API redesign.** Nothing found in this precheck's own repository survey suggests any accessibility fix requires a backend change — every identified gap (labels, ARIA, keyboard handling, IA/navigation structure) is presentation-layer only, matching Registry 142's own explicit fields (Data/Migration Impact: NONE; Auth/RLS: N/A; Service/API: N/A).

## 15. Vercel/runtime requirements (for the future implementation task)

Preview deployment: **YES**, required after push (UI-facing change, same as WP-047). Public smoke: **YES**. Authenticated smoke: **CONDITIONAL** — valuable given the role-differentiated scope (§12), not mandatory for COMPLETE, dependent on credential availability at implementation time. Not attempted in this precheck (no deploy performed).

## 16. Implementation decomposition (proposed, not started)

A single WP-073, internally sequenced (not split into multiple new WPs — no canonical basis found for doing so):
1. Sidebar/route IA closure (OQ-D01) across all 5 environments — the one genuinely open, canonically-named architecture decision.
2. `AccountMenu.tsx` keyboard/`aria-haspopup` fix — small, isolated.
3. Migrate the highest-traffic subset of the 30 raw-`<input>` files to `FieldInput`/`FieldSelect`/`FieldTextarea`.
4. Migrate the highest-traffic subset of the 27 raw-`<table>` files to the shared `Table` primitive.
5. Chart-component accessibility review (`ChartFrame`, `ComponentBreakdownChart`).
6. Non-color-only-meaning check/fix for the Safeguard badge system.
7. Extend the automated test suite (§13) alongside each step above, not as an afterthought.
8. Runtime verification (public mandatory, authenticated conditional per §12/§15).

## 17. Main implementation risks

- **Scale underestimate**: Registry 142's own "Size: M" likely reflects the ORIGINAL WP-047-era assumption that primitive-level fixes would cascade broadly; this precheck's own evidence (30/27 unmigrated files) suggests the real effort is closer to a broad, multi-file sweep than a narrow closure pass. Should be disclosed to the Founder before/at implementation kickoff, not discovered mid-task.
- **Raw-table migration risk**: some of the 27 raw `<table>` usages may have bespoke column/interaction needs the shared `Table` primitive doesn't yet support (e.g., sortable headers, multi-select rows) — each may require either a `Table` primitive extension (itself a small, disclosed scope addition) or a justified exception.
- **IA closure (OQ-D01) ambiguity**: without a Founder/Product decision confirming the current Sidebar structure IS the final, closed architecture (vs. still-open), the implementation task may need a lightweight Founder check-in before formally marking this half of `KORA-GAP-PLATFORM-025` closed.
- **Environment/tooling limitations**: the same Turbopack/symlinked-`node_modules` dev-server constraint WP-047 hit (report 193 §19) will recur for any local runtime smoke in an isolated worktree; Vercel Preview remains the authoritative check.

**Estimated implementation size**: given 30+27=57 files with disclosed raw form/table markup alone, plus the IA closure work and 2 smaller fixes — realistically **L-XL**, not Registry 142's own stated "M." This is a disclosed, evidence-based deviation from the canonical size label, not a silent override of it — the canonical "M" is reported as-is in §2; this independent estimate is offered as supplementary information for planning.

## 18. Dependency/gate evaluation (re-verified, not inherited)

- **Hard Dependencies**: `KORA-WP-047` — **COMPLETE** (commit `b36a989cffdc2e020ec7739cee23858b16569f49`, pushed, Founder-accepted). Re-confirmed directly, not assumed from report 194's own prior computation.
- **External Blockers**: none (Registry 142 verbatim, re-read this task).
- **Scope Triggers**: none of the 4 canonical triggers (Booking/Partner/Program/Link) apply to `073`.
- **Named Gates**: none — pure UI/a11y/IA work, no SQL/Prisma/production-auth/migration involved (§14).
- **Founder/Product prerequisites**: none disclosed in any source read. The one soft, disclosed open item (§17, IA-closure ambiguity) is a risk to flag at implementation kickoff, not a precondition blocking READY status now.

## 19. Canonical state

**READY.**

## 20. Consolidation cadence

Baseline: Audit 163, cadence reset to 0. Completed numbered advancements since: `111, 112, 113, 114, 115, 116, 047` = **7**. `WP-117` remains OPEN, contributes 0 (unchanged). `WP-073` would become advancement #8 only upon its own full completion — not by this precheck. Threshold: 10. **7 < 10 — audit not due**, confirmed against code truth (no other numbered WP completed since report 194).

## 21. GO / BLOCKED conclusion

**GO.** `KORA-WP-073` state: **READY**, independently re-verified. Frozen sources read, consistent, no conflict. "Full Closure" precisely scoped (§4-5), correctly separated from `WP-088` (§10), correctly excludes Living KORAL/Future Vision (§11). Repository code-truth survey (§7-9) found real, substantial, honestly-disclosed debt — larger than the canonical "M" size label implies (§17) — with no backend/security/migration dimension (§14). Authenticated runtime validation is genuinely valuable but not canonically mandatory, and remains credential-blocked exactly as WP-047 left it (§12). **Not implemented in this task, per explicit instruction.**

## 22. Git status

Branch `feature/wp073-accessibility-ia-full-closure`, created from `b36a989cffdc2e020ec7739cee23858b16569f49` (the pushed WP-047 commit) in the existing clean worktree. No commit made in this task — working tree contains only this new, disk-only, gitignored report file. `git status --short`: clean (report file lives under `.kora-audit/output/`, gitignored).
