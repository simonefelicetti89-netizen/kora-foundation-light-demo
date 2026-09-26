# 202 — KORA-WP-088 "Responsive / Design System Full Closure" — Implementation Report

**WP-088 STATUS: PARTIAL / VALIDATION-BLOCKED.**

`KORA-GAP-RESPONSIVE-001`: code-complete, runtime-validation-blocked.
`KORA-GAP-DESIGN-001`: materially advanced, **OPEN** — disclosed residual literal debt.

Branch `feature/wp088-responsive-design-system-full-closure`, from `4844e27d3da37d865041fba573cf9f39ce5c31c3`. Not pushed. Original dirty worktree never accessed; deferred Living KORAL renderer never touched.

---

## 1. Executive conclusion

The Founder's warm-colour adjudication is applied and made durable in code, tests and the governing docs. The single highest-leverage defect in the WP — `Sidebar.tsx` as an unconditional 264px column with zero breakpoints anywhere in the chrome, which broke every authenticated screen in all five role environments below ~600px — is fixed with an off-canvas drawer, an accessible Header toggle, backdrop, Escape-to-close and close-on-navigate. The second-largest DESIGN-001 defect, discovered during implementation and not visible in the precheck, was that **~24 screens each declared their own pillar→colour map and disagreed with one another and with the canonical token** — several literally shadowing the `PILLAR_COLORS` identifier with different values, so the same pillar rendered green on one screen, terracotta on another and blue on a third. All now route through the canonical token. 357 inline-style core-palette literals were tokenised, tables and grids remediated, and 35 permanent guards added including a ratchet that makes the remaining literal debt impossible to grow.

Two honest reasons this is **not** COMPLETE: (a) the Founder's own explicit rule — authenticated multi-viewport validation at 375/768/1440px across the five role environments is required for completion, and E2E credentials remain unprovisioned, so that validation cannot be performed; (b) **1,967 presentation-hex occurrences across 182 files remain** — materially reduced but not resolved, and the Founder's instruction is explicit that DESIGN-001 cannot be declared CLOSED while material colour/token debt remains. Both are disclosed rather than papered over.

## 2. Founder colour adjudication

Applied verbatim, not reinterpreted. Recorded durably in three places, none of which falsifies history:

- **`lib/design/kora-design-tokens.ts`** — a "FOUNDER COLOUR ADJUDICATION (KORA-WP-088)" header records that the warm token direction is canonical, the current pillar direction is canonical, terracotta remains an allowed primary/accent role, docs/30's cool blue-violet pillar restriction is superseded **on colour only**, no external designer/Figma palette is required, `#06032B`/`#6156F5` remain valid official brand colours in their existing roles, and violet is **not** promoted into the mandatory pillar family. A second note above `PILLAR_COLORS` marks those five values as the ratified canonical pillar identity.
- **`docs/30-…-constitution.md` §6** — a supersession notice states the section no longer governs on colour, and records that §6.2's specific violation list is additionally stale (`components/charts/PillarChart.tsx` no longer exists). Its typography, §21 accessibility and all non-colour guidance remain explicitly governing. **The original text is preserved unmodified below the notice.**
- **`docs/EXPERIENCE_LAYER.md` §2** and **`app/page.tsx`** — the two long-standing "Founder decision required" pillar-colour notes are marked RISOLTA with the reasoning, and the original wording is kept beneath as historical record.

A dedicated test group asserts all of the above, so the adjudication is testable rather than merely documented — including an assertion that docs/30's original forbidding sentence is still present.

## 3. Canonical scope

Remediation only; no new product modules. In scope and worked: shared chrome, shared primitives, the five role environments' authenticated surfaces, tables, grids, colour tokens. Out of scope and untouched: Living KORAL (§14), Future Vision, landing/public surfaces (RESPONSIVE-001 itself states they are already responsive), the decision-pack HTML export template, and all backend/data/auth.

## 4. Token source ratification

`lib/design/kora-design-tokens.ts` is now the recorded implementation source of truth. One new export was added — `PILLAR_SURFACE` — and it introduces **no new brand colour**: each entry is the ratified pillar colour plus `rgba(...,0.08)` background and `rgba(...,0.22)` border tints, computed from that colour at the alpha levels this token file already uses (`accentSoft` 0.12, `cardBorderHover` 0.45). It satisfies all four of the Founder's conditions for a new token: a concrete violation required it (24 divergent maps), no existing token carried the semantic role (per-pillar surface tints), it consolidates repeated real usage, and its value is mechanically derived from the ratified system. A test proves the derivation. **No other token was created; the estimated "~29-31 semantic slots" from report 201 was explicitly not used as an implementation target.**

## 5. Literal-colour remediation statistics

| Measure | Before | After |
|---|---|---|
| In-scope files carrying presentation hex | 204 | **182** |
| In-scope presentation-hex occurrences | 2,571 | **1,967** |
| Inline-style core-palette literals | 357 | **0** |
| Files with a divergent local pillar→colour map | 24 | **0** |

357 inline-style literals were replaced by their canonical token across 96 files (92 in the main pass plus 4 the pass could not reach, caught later by the new guards). The substitution was deliberately narrow and semantically justified: only values appearing as a JS style-object value (`prop: '#HEX'`), and only for the ten core-palette colours where the token name *is* that colour's semantic identity. **Every substitution is value-identical, so there is no visual change.** Explicitly not substituted: Tailwind arbitrary-value class strings (a class string cannot hold a JS token reference) and `#FFFFFF` (no semantically correct token outside buttons — treated as a valid technical constant). No blind equal-string replacement was performed.

**Disclosed nuance:** `#C76F3D` is both `TOKENS.accent` and `PILLAR_COLORS.LIFE`; `#2F7D55` is both `TOKENS.success` and `PILLAR_COLORS.GROWTH`; `#D99A2B` is both `TOKENS.warning` and `PILLAR_COLORS.IMPACT`. Pillar-semantic sites were routed to the pillar token first (§7), so remaining sites are the accent/success/warning role. Where an isolated pillar-semantic site may have received the role token, the rendered value is identical and only the naming is imperfect — disclosed rather than claimed perfect.

## 6. New semantic tokens actually introduced

**Exactly one: `PILLAR_SURFACE`** (a derived helper, not a palette). No colour family, tint scale, or info/link-blue token was created — the 809 unmapped literals from report 201 were **not** converted into tokens, because doing so would have required inventing values. They remain disclosed debt (§25).

## 7. Pillar closure

The current pillar mapping is ratified unchanged (LIFE `#C76F3D`, GROWTH `#2F7D55`, CONNECTION `#D99767`, IMPACT `#D99A2B`, LEGACY `#8A7562`); the superseded docs/30 cool-family proposal was **not** substituted. 24 local pillar→colour maps across 24 files now route through `PILLAR_COLORS`/`PILLAR_SURFACE`. Four of them (`app/company/commons/page.tsx`, `ActivationProfileSection.tsx`, `WorkerAdoptionPanel.tsx`, `PartnersAdminClient.tsx`) had declared a local constant literally named `PILLAR_COLORS`, shadowing the canonical token with different values — those shadows are deleted and the import used directly. At least five mutually-inconsistent pillar palettes existed before this WP, including one (`EligibilityGatePanel.tsx`) using the very cool blue-violet family the Founder has now superseded. A permanent guard prevents any local pillar map with raw hex from reappearing.

## 8. Status / info / link family closure

Audited, and **deliberately not tokenised.** The largest category-A family is an info/link blue (196 occurrences, 19 distinct values, e.g. `#3B6EBA`, `#1E4A8A`, `#4A7FE0`) with no corresponding slot in the ratified system and no existing token carrying that semantic role. Creating one would require choosing a value that cannot be mechanically justified from the ratified warm system — the Founder's explicit STOP condition ("If an exact new colour value cannot be mechanically justified … STOP THAT TOKEN. Do not invent an aesthetic value."). It is therefore reported as an open gap, not invented. The same reasoning applies to the green/violet/red/amber depth-and-tint families. `success`, `warning`, `critical` and the Safeguard governance tokens already existed and were used, not duplicated.

## 9. Responsive chrome

`Sidebar.tsx` is now an off-canvas drawer below `md` (`fixed inset-y-0 left-0 z-50 -translate-x-full`, `translate-x-0` when open) and the unchanged static 264px column at `md`+ (`md:static md:translate-x-0`). It closes on navigation and on Escape, and a mobile-only backdrop dismisses it on tap. `Header.tsx` gained a mobile-only toggle with `aria-label` (state-dependent), `aria-expanded`, `aria-controls`, and a 44×44 touch target — preserving WP-047's baseline. A new `SidebarDrawerContext.tsx` holds the shared state in its own module (both Header and Sidebar consume it, and AppShell imports both, so putting it in AppShell would be circular); a test proves it contains no route/role/navigation logic. `AppShell.tsx` main padding now steps `px-4 py-5 → sm:px-6 → lg:px-10`, replacing a fixed 40px gutter that cost ~21% of a 375px viewport. Navigation structure, ordering, labels and route architecture are untouched — WP-073's 23 navigation tests pass unmodified.

## 10. Tables

Audit reduced the precheck's 19 candidates to **6 genuine defects** — the other 13 already had correct `overflowX` containment (verified by inspecting the actual wrapper, not by counting). No table was mass-rewritten or migrated to the shared primitive; each received the smallest canonical fix (an `overflow-x` container matching `components/ui/Table.tsx`'s own pattern, or relaxing an `overflow-hidden` ancestor). `app/admin/provisioning-diagnostics/_dry-check-button.tsx` additionally received the `<thead>` with three scoped column headers it had been missing entirely. Accessibility semantics, headers, keyboard use and data fidelity are preserved; no data is hidden to fit mobile. Print layouts are exempt.

## 11. Grids / layout

13 of the 14 rigid `repeat(N≥3, 1fr)` grids converted to `repeat(auto-fit, minmax(X, 1fr))` with X chosen to preserve the desktop column count (180px for 3-col, 160px for 4-col, 140px for 5-col) while wrapping instead of overflowing on narrow viewports — satisfying `EXPERIENCE_LAYER.md` §8 rule 4. `app/worker/dynamic-cv/print/page.tsx` is exempt: a print layout targets paper, not a viewport. No unrelated visual restyling.

## 12. Design-system family closure

Audited rather than mass-migrated, per the explicit instruction. Every `KORA-GAP-DESIGN-001` family has a canonical home, asserted by test: navigation (`Sidebar`), forms (`ui/Field`), tables (`ui/Table`), cards (`ui/IntelCard`), states/badges (`badges/SafeguardBadge`), empty/error/loading (`ui/EmptyState`), permission-denied (`ui/BoundaryBanner`), data visualisation (`charts/ChartFrame`), evidence/confidence (`ui/Explainer`), responsive layout (`layout/AppShell`). **Compliant native markup was deliberately left in place**: raw `<button>`/`<table>`/`<input>` were not mechanically migrated for component purity. One family genuinely does not exist — dialogs/modals — confirmed absent from the codebase entirely (no dialog component anywhere), so there is nothing to close rather than something to build; building one would be a new product module, out of remediation scope.

## 13. WP-047 / WP-073 non-regression

All 145 WP-047 + WP-073 tests pass unmodified at every batch checkpoint. OQ-D01, the five-environment navigation architecture, route grouping, role terminology and accessibility semantics were not reopened. Dedicated WP-088 guards assert the five Company group headings, the WP-073 landmarks (`aria-label="Contenuto principale"`, `aria-label="Navigazione principale"`) and `AccountMenu`'s `aria-haspopup` are all still present.

Three integration assertions were updated — `b169-company-tabs.test.ts` (×2) and `b168-5-p3-demo-gating.test.ts` — which previously asserted the raw literal `'#C76F3D'` in component source. They now assert `TOKENS.accent`. This is a **strengthening**: the literal check would have passed for a hardcoded violation anywhere in the file, whereas the token check enforces the design-system rule. The three components were verified to genuinely use the token. No assertion was weakened or deleted to obtain green.

## 14. Living KORAL exclusion

Untouched. The deferred renderer files are not present in this worktree at all (never committed). The three committed Living KORAL components were excluded from every scan and remediation pass, and a guard asserts they carry no WP-088 marker. No Living KORAL visual file was cleaned or normalised.

## 15. Exact files modified

**108 files** across three commits. By area: `app/admin` 30, `app/worker` 17, `app/company` 14, `app/partner` 10, `components/commons` 6, `components/layout` 4, `components/admin` 3, `app/auth` 2, `components/company` 2, `docs` 2, `tests/integration` 2, `tests/unit` 1, plus `lib/design/kora-design-tokens.ts`, `app/page.tsx` and the remaining single-file areas.

**New (2):** `components/layout/SidebarDrawerContext.tsx`, `tests/unit/kora-wp-088-responsive-design-system.test.ts`.

## 16. Tests added / updated

**Added:** `tests/unit/kora-wp-088-responsive-design-system.test.ts` — 35 permanent guards covering the colour adjudication record, pillar identity consistency, responsive chrome contract, table containment, grid responsiveness, the presentation-hex ratchet, design-system family contracts, and WP-047/WP-073 non-regression.
**Updated:** 3 assertions (§13), strengthened from literal to token.

## 17. Targeted validation

WP-088 guards **35/35**. WP-047 design/a11y **33/33**. WP-073 accessibility **55/55**. WP-073 navigation **23/23**. Admin nav precedent (`b169-nav-groups`) **22/22**.

## 18. Security / RLS

Mandatory gate: `rls-policy-inventory`, `rls04-app-api-tenant-enforcement`, `rls06-kora-admin-access-control`, `tenant-isolation`, `pilot-trust-01-service-role-guard` — **5 files, 423 passed, 0 failed.** No auth, RLS, API, domain-service or migration change anywhere in this WP.

## 19. Full regression

`npx vitest run`: **416 test files, 13,297 passed, 325 skipped, 5 todo, 0 failed.**

## 20. tsc

`npx tsc --noEmit -p .`: **0 errors.**

## 21. eslint

`app/` + `components/`: **0 errors, 24 warnings** — byte-identical to the pre-WP-088 baseline, i.e. no new warning introduced. (An intermediate pass added 15 unused-import warnings; these were found and removed before commit.) Every file this WP created or modified in `lib/` and `tests/` lints clean.

## 22. Runtime / multi-viewport status

**NOT PERFORMED.** Local dev-server smoke remains blocked by the known Turbopack/symlinked-`node_modules` constraint in this isolated worktree (documented since report 193 §19); per standing instruction no time was spent rebuilding a duplicate `node_modules`. Authenticated multi-viewport validation at 375 / 768 / 1440px across KORA Admin, Company, Worker, Partner and Advisor **could not be performed**: `E2E_KORA_ADMIN_*` and `E2E_COMPANY_A_*` are unset in this worktree and no credential was fabricated. Per the Founder's explicit rule this is decisive for status (§26).

## 23. Vercel requirement

Vercel Preview verification is **required after push**. Not attempted (no push in this task). Normal Git→Vercel integration remains the path; no time spent on the known wrong-account MCP.

## 24. KORA-GAP-RESPONSIVE-001 closure

**Code-complete; closure gated on runtime validation.** Named canonical surfaces addressed: the shared shell (the blocking defect), tables, grids. Worker-facing and time-sensitive surfaces named in report 60 §10 (My KORA, KORA Link, Booking/Access, My Sharing, Advisor contact) all inherit the chrome fix, and their grids/tables are in the remediated set. What is missing is not code but **evidence**: the gap's own acceptance is a rendered-viewport property, and §22 explains why it could not be observed. Marked closed-pending-validation rather than CLOSED.

## 25. KORA-GAP-DESIGN-001 closure

**OPEN.** Genuinely advanced — adjudication applied and made durable, pillar conflict resolved, canonical token source established and enforced, 357 core-palette literals tokenised, 24 divergent pillar maps unified, all families verified present, exceptions explicitly classified (§5, §8, §12) — but the Founder's bar is explicit: *"cannot be declared CLOSED while actual in-scope colour/token debt remains materially unresolved."* **1,967 occurrences across 182 files remain**, of which ~488 belong to six semantic families that need Founder-approved values (§8) and the remainder are Tailwind arbitrary-value class strings and non-core values. Declaring closure would be a grep-count claim, which §17 of the task forbids. A ratchet guard now caps the debt at its current level so it can only shrink.

## 26. Canonical WP-088 status

**PARTIAL / VALIDATION-BLOCKED** — on two independent grounds, either of which alone is sufficient: authenticated multi-viewport validation is unperformable without credentials (Founder rule, §0/§22), and DESIGN-001 retains material disclosed debt (§25). Implementation is nonetheless mechanically sound and fully committed, as the Founder's commit clause allows.

## 27. DAG-governance rule

Recorded per Founder decision, for use in all future reporting:

- **CANONICAL MECHANICAL STATUS** (Registry 142): `COMPLETE` · `READY` · `BLOCKED`. Registry 142 contains zero occurrences of `NOT_YET_READY`; Section H states verbatim that scope-excluded roots are "mechanically `READY`" and that "priority and status remain deliberately different things throughout this registry."
- **SEQUENCING PRIORITY / `NOT_YET_READY` OVERLAY**: retained for planning and historical-report continuity only. It is **not** a Registry-142 mechanical state.
- Both concepts must be stated explicitly and separately going forward. Historical reports are not rewritten.

## 28. Consolidation cadence

Completed numbered advancements since accepted Audit 163: `111, 112, 113, 114, 115, 116, 047, 073` = **8**. WP-088 contributes **+1 only if COMPLETE**; it is PARTIAL, so **cadence remains 8**. Threshold 10. **Formal consolidation audit: NO.**

## 29. Git status

Clean. Three local commits on `feature/wp088-responsive-design-system-full-closure`:
- `820fd2b6e8f1b6f27a0ec0753d2bacb4353028db` — ratify warm token system, responsive chrome, pillar closure
- `3a3ca9ae5588be864718fdf3d9ff243d3eaf4355` — route inline-style core palette through canonical tokens
- `acead70e8d120d0fccfa43eafc3494a01edb8e20` — WP-088 regression guards

Not pushed. Staging and production untouched. WP-118, WP-119 and Package B not started. Original dirty worktree never accessed.
