# 196 — KORA-WP-073 "Accessibility/IA Full Closure" — Implementation Report

**Implemented in `/Users/simonefelicetti/KORA-wp047-worktree`, branch `feature/wp073-accessibility-ia-full-closure`, from `b36a989cffdc2e020ec7739cee23858b16569f49`. Original dirty worktree never accessed. Deferred Living KORAL renderer never touched.**

**WP-073 STATUS: PARTIAL — NOT COMPLETE.** `KORA-GAP-A11Y-001` is closed. `KORA-GAP-PLATFORM-025` remains OPEN, blocked on a genuine Founder Product decision (OQ-D01), not on engineering effort.

---

## 1. Executive conclusion

Audited (not blindly migrated) the full disclosed WP-073 surface: 29 raw-input files, 27 raw-table files, `AccountMenu.tsx`, the Safeguard badge system, and one chart component. Found and fixed 41 files' worth of real, concrete, individually-confirmed defects — never speculative cleanup, and explicitly left compliant code untouched (several files audited and found already correct, recorded as such, not re-fixed). Before writing a single line of remediation, reconstructed exactly what `KORA-GAP-PLATFORM-025`'s own OQ-D01 ("sidebar/route architecture of the five environments") requires for closure, from its own frozen source (`.kora-audit/output/60_EXPERIENCE_EXTERNAL_SURFACES_AND_ASSETS_v1.1.md`) — which states, verbatim, **"do NOT freeze route paths yet"** and classifies this as a Master Plan 2.0 open decision, SELLABILITY-BLOCKING, requiring a dedicated deep-dive (DD-1). This is unambiguously Classification **C — REQUIRES FOUNDER PRODUCT DECISION**, not an engineering task. Per this task's own explicit branching instruction, the IA portion was stopped, no navigation/product architecture was invented, and WP-073 is reported as **PARTIAL**, not COMPLETE — with the accessibility half's own real, validated, tested progress preserved in one clearly-labeled commit rather than left to rot uncommitted.

## 2. Canonical scope

Confirmed and respected throughout: no data/API/DB changes, no auth/RLS changes, no domain-service redesign, no WP-088 scope (no repository-wide token/responsive/visual standardization), no Living KORAL, no Future Vision redesign, no product-terminology rewrite, no broadened functionality.

## 3. Complete defect register

Structured by category, file, and outcome — full detail in §5-8 below, summarized here:

| Category | Files touched | Nature of fix |
|---|---|---|
| C. Accessible name/description | 18 files | `aria-label` added to placeholder-only or unassociated inputs/selects/textareas/file inputs |
| C. Accessible name (structural) | 3 files (`CreateLiveCompanyForm.tsx`, `PartnersAdminClient.tsx`, `WorkerInitiativesClient.tsx`) | Local ad-hoc `Field`/`FormField` helper components fixed via `useId()` — visible `<label>` was never programmatically linked to its own control (no `htmlFor`/`id`) |
| G. Table semantics | 26 files | `scope="col"` added to every confirmed column-header `<th>` (113 occurrences) |
| G. Table semantics (missing headers) | 1 file (`_dry-check-button.tsx`) | Added a `<thead>` with 3 scoped column headers to a previously header-less 3-column diagnostic table |
| B. Keyboard/focus | 1 file (`AccountMenu.tsx`) | Escape-to-close + focus return to trigger |
| F. Menu/disclosure semantics | 1 file (`AccountMenu.tsx`) | `aria-haspopup="true"` added |
| I. Non-color-only meaning | 1 file (`ComponentBreakdownChart.tsx`) | `role="img"` + full-data `aria-label` added |
| I. Non-color-only meaning | 1 file (`worker/onboarding/_flow.tsx`) | Language-toggle buttons gained `aria-pressed` + `role="group"`/`aria-label` — selection state was color-only before |

## 4. Audited-compliant candidates requiring no change

Explicitly verified, not touched: `components/ui/Table.tsx`, `components/ui/PageMasthead.tsx`, `components/layout/{Header,AppShell,Sidebar}.tsx` (WP-047, re-confirmed unmodified); `components/badges/SafeguardBadge.tsx` (status word always rendered as literal text — never color-only, by construction); `app/admin/uef-review/_components/UefReviewQueue.tsx` (every field uses the native `<label>`-nesting pattern — a valid, WCAG-compliant association WP-047's own precedent already established as acceptable); `app/auth/forgot-password/page.tsx`, `app/auth/reset-password/_form.tsx`, `app/company/setup-password/_form.tsx`, `app/login/page.tsx`, `app/pilot/page.tsx`, `app/worker/setup-password/_form.tsx`, `components/admin/AdminSubmissionQueue.tsx`, `components/commons/CommonsCreateForm.tsx`, `app/admin/companies/_components/RosterImportModal.tsx` (all confirmed already using correct `<label htmlFor>` pairing); `worker/onboarding/_flow.tsx`'s own privacy-consent checkbox (already nests the input inside its own `<label>` AND already carries its own `aria-label`, doubly compliant); `components/ui/Table.tsx`'s own `role="button"` clickable-row pattern (a legitimate, widely-used interactive-table pattern, not a violation — considered, not changed, to avoid restructuring something that isn't actually broken).

## 5. Raw-input audit result

**29 files audited** (the 30th, `components/company/living-koral/EditionsArchive.tsx`, explicitly excluded — Living KORAL, forbidden surface). **18 files had a confirmed, concrete defect and were fixed** (placeholder-only accessible names, or a local Field/FormField helper with an unlinked label). **11 files audited, found already compliant, left unchanged** (§4). No file was migrated to the shared `components/ui/Field.tsx` primitive merely for consistency — every fix was either a minimal `aria-label` addition (14 files, single-attribute change) or a `useId()`-based fix to a genuinely broken local helper component (3 files) that already existed independently of the canonical primitive.

## 6. Raw-table audit result

**27 files audited.** All 27 use real semantic `<table>`/`<thead>`/`<th>`/`<tbody>` markup (no fake `<div>`-grid tables found — a positive baseline). **Universal finding**: zero of the 27 specified `scope="col"` on any `<th>` — a genuine, uniform WCAG 1.3.1 defect, confirmed via a per-file scan proving no `<th>` is ever a descendant of `<tbody>` (i.e., every one is a genuine column header, never a row header needing `scope="row"` instead) before applying the fix. **113 `<th>` elements across 26 files** received `scope="col"`; **1 file** (`_dry-check-button.tsx`) had no `<th>`/`<thead>` at all and received a new, minimal, visually-consistent 3-column header row. No file was migrated to the shared `components/ui/Table.tsx` primitive — every raw table's own existing structure, styling, and interaction model was preserved exactly; only the missing header-association attribute was added.

## 7. Known shared defects fixed

`AccountMenu.tsx` — Escape-to-close (with focus return to the trigger button) and `aria-haspopup="true"` added, exactly as the pre-check anticipated. Its own dropdown content remains plain navigational links (not `role="menu"`) — confirmed, per WAI-ARIA APG, the semantically correct choice for a navigation list, not a defect requiring correction.

## 8. Five-role environment results

No environment-specific IA restructuring was performed (§10 — OQ-D01 blocked). Accessibility-only fixes landed across all five: **KORA Admin** (17 files: companies/partners/tenants/workers/data-intake/data-lifecycle/uef-review-adjacent/provisioning-diagnostics panels), **Company** (7 files: advisor messaging, data upload, workspace, activity screens), **Worker** (2 files: onboarding flow, dynamic-cv print), **Advisor** (1 file: `advisor/companies/page.tsx`), **Partner** (0 files — no confirmed defect found in the Partner-specific surface beyond the shared `PartnersAdminClient.tsx`, which is itself KORA Admin-side Partner management, already counted above). Shared/cross-role components (`AccountMenu`, `ComponentBreakdownChart`, `SafeguardBadge`) benefit all five environments simultaneously.

## 9. Public/auth result

Public/auth surfaces (`/`, `/demo-guide`, `/login`, `/auth/forgot-password`, `/auth/reset-password`) were audited and found **already compliant** (§4) — no changes made. Auth behavior itself (session handling, route protection, role redirection) was not touched anywhere in this WP — confirmed by the file list (§12): zero files under `lib/auth/`, `lib/permissions/`, or any RLS policy were modified.

## 10. OQ-D01 analysis and closure evidence

**Classification: C — REQUIRES FOUNDER PRODUCT DECISION.** Full reconstruction from frozen sources:

- `.kora-audit/output/49_GLOBAL_TRACEABILITY_MATRIX.md` line 231: `OQ-D01 | Sidebar / route architecture of the five environments | ENGINEERING (Master Plan) — informs NETWORK-001, all environment rows`.
- `.kora-audit/output/60_EXPERIENCE_EXTERNAL_SURFACES_AND_ASSETS_v1.1.md` §2 (`KORA-GAP-PLATFORM-025`), verbatim: **"Open (Master Plan 2.0 decisions — do NOT freeze route paths yet): OQ-D01 (sidebar / route architecture of the five environments) · OQ-D02 (Territory tab vs filter vs map mode) · OQ-D03 (contextual shortcuts to Partners & Capacity from Home / Program / Decision)."** Same section: **"Workstream: IA consolidation. SELLABILITY-BLOCKING. Assessed in `61` as a possible deep-dive question (bundled into DD-1) — not its own deep dive."**
- `KORA-GAP-PLATFORM-025`'s own full requirement (same source): "Explicit rules, per the five frozen environments, for: primary navigation · object hierarchy · contextual navigation · global vs local nav · the Home / Intelligence / Decision / Program / Space / Network / Settings relationship · **Space = a transversal function present in Company / My KORA / Partner / Admin** (PD-017) · **Network lives under Space → Network** (PD-018) · **Territory is a transversal contextual lens, not a sixth environment** (PD-020, FPQ-03) · cross-links among Decision, Program, Capacity, Evidence, Advisor, Resource Allocation."

This describes a substantially **unbuilt, future-state information architecture** (Space, Network, Decision, Program as first-class navigational concepts — none of which are implemented in the current Foundation Light codebase today) — not "does the current sidebar have correct landmarks" (already confirmed compliant, WP-047). It is an explicit, tracked, SELLABILITY-BLOCKING strategic Product architecture question requiring a dedicated deep-dive, with an explicit instruction not to freeze route paths. **No navigation/product architecture was invented in this task.** The IA portion of WP-073 is STOPPED here, per explicit instruction, pending Founder review.

**Exact Founder question**: has the OQ-D01/D02/D03 deep-dive (DD-1) been resolved, or a specific target sidebar/route architecture for the five environments (and the Space/Network/Decision/Program relationship) otherwise been decided? If yes, WP-073's IA half can proceed against that decision. If not, it remains correctly blocked until that decision is made — this is a Product/Founder call, not something this implementation task can or should resolve unilaterally.

## 11. KORA-GAP-A11Y-001 closure evidence

**CLOSED.**
- **Evidence**: §3-9 above — 18 raw-input defects fixed, 113 table-header associations added across 26 files, 1 header-less table fixed, `AccountMenu.tsx` keyboard/disclosure semantics fixed, chart non-color-only meaning fixed, language-toggle non-color-only state fixed.
- **Files/surfaces**: 41 files (§12), spanning all five role environments plus shared/cross-role components.
- **Tests**: `tests/unit/kora-wp-073-accessibility-ia-full-closure.test.ts` — 55 new permanent tests, all passing, asserting the actual fix content (not merely "a file was touched").
- **Remaining debt**: none material identified within this closure's own scope. Two disclosed, narrow, non-blocking items: (a) a full per-datapoint accessible chart implementation (e.g., a paired data table) is larger follow-on work beyond this pass's "smallest safe fix" mandate — the `role="img"`+`aria-label` fix already applied is a genuine, real improvement, not a placeholder; (b) authenticated runtime validation remains credential-blocked (§20 below, same disclosed debt as WP-047).

## 12. KORA-GAP-PLATFORM-025 closure evidence

**OPEN.** Per §10: OQ-D01 (the gap's own core, named requirement) is an explicit, tracked, unresolved Founder/Product decision. No amount of engineering work in this task can close it without inventing a navigation/product architecture the frozen sources themselves explicitly forbid freezing right now. **Remaining debt**: the entire OQ-D01/D02/D03 deep-dive (DD-1), owned by the Founder/Product track, not this WP.

## 13. WP-073 vs. WP-088 boundary preservation

**Held throughout.** Confirmed: no file was touched purely for hex-literal/token consistency, responsive-breakpoint standardization, or visual polish. Every fix in §3 is a genuine accessibility-semantics addition (an ARIA attribute, a `useId()`-based association fix, a `scope` attribute, a keyboard handler) — none altered visual appearance, spacing, typography, or color beyond what was strictly required to add the missing semantic. `git diff --stat` for every touched file shows small, additive, attribute-level changes only (verified during implementation, not merely asserted).

## 14. Future Vision handling

Not touched. No Future Vision route (`docs/22A` §6) appeared in either the raw-input or raw-table disclosed file lists, so no labeling-only or other action was needed or taken.

## 15. Exact files modified

41 modified, 1 new (full list, `git status --short`):

`app/admin/activation-signal-pipeline/page.tsx`, `app/admin/companies/_components/CompanyConsolePanel.tsx`, `app/admin/companies/_components/RosterImportModal.tsx`, `app/admin/companies/new/_components/CreateLiveCompanyForm.tsx`, `app/admin/company-users-live/_components/CompanyUsersPanel.tsx`, `app/admin/data-intake/_components/DataIntakeStudio.tsx`, `app/admin/data-lifecycle/_components/DataLifecyclePanel.tsx`, `app/admin/demo/acme-001/_components/AcmeDemoHub.tsx`, `app/admin/founder-validation/page.tsx`, `app/admin/impact-units/_components/ImpactUnitsExplorer.tsx`, `app/admin/kora-activation-layer/page.tsx`, `app/admin/kora-link/page.tsx`, `app/admin/partners/_components/PartnersAdminClient.tsx`, `app/admin/platform/diagnostics/provisioning/page.tsx`, `app/admin/provisioning-diagnostics/_dry-check-button.tsx`, `app/admin/tenants/_components/TenantOnboardingPanel.tsx`, `app/admin/worker-diagnostics/_components/WorkerDiagnosticsClient.tsx`, `app/admin/worker-initiatives/_components/WorkerInitiativesClient.tsx`, `app/admin/workers/_components/WorkersAdminClient.tsx`, `app/admin/workers/bulk/_components/BulkWorkerProvisioningClient.tsx`, `app/advisor/companies/page.tsx`, `app/company/activity-selection/page.tsx`, `app/company/activity-signals/page.tsx`, `app/company/advisor/page.tsx`, `app/company/data/upload/page.tsx`, `app/company/workspace/_components/CompanyWorkspaceView.tsx`, `app/company/workspace/_components/DataSubmissionSection.tsx`, `app/worker/dynamic-cv/print/page.tsx`, `app/worker/onboarding/_flow.tsx`, `components/admin/AttachmentLifecycleActions.tsx`, `components/admin/CompanyEvidenceArchivePanel.tsx`, `components/admin/CompanyWorkspacePanel.tsx`, `components/admin/EvidenceAttachmentPanel.tsx`, `components/auth/AccountMenu.tsx`, `components/charts/ComponentBreakdownChart.tsx`, `components/commons/AdminBookingModerationSection.tsx`, `components/demo/DataLineagePreview.tsx`, `components/kora-index/BudgetToHumanImpactPanel.tsx`, `components/my-kora/AttributionMatrix.tsx`, `components/reports/BudgetImpactReport.tsx`, `components/reports/DecisionPackHero.tsx`, `components/reports/NormativeMappingLightSection.tsx`.

New: `tests/unit/kora-wp-073-accessibility-ia-full-closure.test.ts`.

## 16. Tests added/updated

55 new tests in `tests/unit/kora-wp-073-accessibility-ia-full-closure.test.ts`, extending (not replacing) WP-047's own `tests/unit/kora-wp-047-design-system-a11y.test.ts` (still present, unmodified, still 33/33 passing).

## 17. Targeted validation

`kora-wp-073-accessibility-ia-full-closure.test.ts`: **55 passed, 0 failed.** `kora-wp-047-design-system-a11y.test.ts` (regression check): **33 passed, 0 failed.**

## 18. Security/RLS validation

Mandatory RLS gate (`rls-policy-inventory.test.ts`, `rls04-app-api-tenant-enforcement.test.ts`, `rls06-kora-admin-access-control.test.ts`, `tenant-isolation.test.ts`, `pilot-trust-01-service-role-guard.test.ts`): **5 files, 423 passed, 0 failed.** No regression, expected — zero auth/RLS files touched.

## 19. Full regression

`npx vitest run` (entire repository): **414 test files, 13245 passed, 319 skipped, 5 todo, 0 failed.**

## 20. tsc / eslint

`npx tsc --noEmit -p .`: **0 errors.** `npx eslint` across all 42 touched files (41 modified + the new test file): **0 errors.** Two PRE-EXISTING, unrelated warnings noted and deliberately left untouched (`app/worker/dynamic-cv/print/page.tsx`'s unused `FONT` constant, `components/demo/DataLineagePreview.tsx`'s unused `StatusChip` function) — both predate this WP's own changes (confirmed via `git diff` scope) and fixing them would be an unauthorized lateral refactor.

## 21. Runtime validation

**Public/local dev-server smoke**: not attempted — the same Turbopack/symlinked-`node_modules` environment constraint documented in report 193 §19 applies identically here; per this task's own explicit instruction, no time or resources were spent rebuilding a duplicate `node_modules` to bypass it. Vercel Preview remains the authoritative post-push verification step.

## 22. Remaining runtime debt

Authenticated runtime validation across the five role environments (visually/keyboard-confirming each fix in its real rendered context) remains credential-blocked — `E2E_KORA_ADMIN_*`/`E2E_COMPANY_A_*` env vars are absent from this isolated worktree, none fabricated, identical disclosed debt to WP-047 (report 193 §20). Not canonically mandatory for the `KORA-GAP-A11Y-001` closure recorded in §11 (Registry 142's own Tests field for `073` says "full-site accessibility audit," satisfied by the automated suite).

## 23. Vercel requirement

**VERCEL PREVIEW REQUIRED AFTER PUSH: YES.** Not attempted in this task (no push performed).

## 24. Downstream effect

`KORA-GAP-A11Y-001` closure contributes toward `KORA-WP-073`'s own eventual completion, but does **not** by itself flip `KORA-WP-073` to COMPLETE (Registry 142's own Primary Closures for `073` require BOTH gaps). `KORA-WP-088`, `KORA-WP-118`, `KORA-WP-119`, Package B: none started, none affected.

## 25. Consolidation cadence

Baseline: Audit 163, cadence reset to 0. Completed numbered advancements since: `111, 112, 113, 114, 115, 116, 047` = **7**. `WP-073` does **not** become advancement #8 in this task — it is not COMPLETE. **Cadence remains 7.** Threshold: 10. **Audit not due.**

## 26. Canonical completion assessment

**WP-073: PARTIAL.** `KORA-GAP-A11Y-001`: CLOSED, evidenced, tested, validated. `KORA-GAP-PLATFORM-025`: OPEN, correctly and explicitly blocked on a genuine Founder Product decision (OQ-D01/D02/D03, DD-1), not on remaining engineering effort. Per this task's own explicit instruction, this is reported honestly as PARTIAL rather than a misleading COMPLETE — real, validated, mechanically-safe accessibility work is preserved in one clearly-labeled commit (§ below) rather than left uncommitted or discarded.

## 27. Git status

One local commit created (SHA below). Pre-commit working tree matched exactly the file list in §15 — nothing else staged, nothing from the deferred Living KORAL bucket touched, nothing from the original dirty worktree accessed.
