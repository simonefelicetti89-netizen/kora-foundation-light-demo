# 200 — KORA-WP-088 "Responsive / Design System Full Closure" — Canonical Pre-Check

**PRE-CHECK ONLY. No application code modified. No tests modified. No migration created. No commit. No push.**

Branch `feature/wp088-responsive-design-system-full-closure`, created from the pushed WP-073 HEAD `4844e27d3da37d865041fba573cf9f39ce5c31c3` in the existing clean worktree. Original dirty worktree never accessed.

---

## 1. Executive conclusion

WP-088 is **DAG-READY but carries an embedded, unresolved Founder/Product prerequisite that gates roughly half its scope** — structurally the same situation WP-073 hit with OQ-D01, surfaced here *before* implementation rather than mid-task. Registry 142 records "External Blockers: none" for WP-088, but its own named Arch Source (`docs/30`) and the DESIGN-001 requirement text (report 60 §11) both contain explicit, still-open blockers: **`docs/30` §6.1 states "⚠️ OFFICIAL PILLAR HEX VALUES REQUIRED FROM NEXT/DESIGNER"**, §22.1 marks every colour token family "OFFICIAL HEX REQUIRED", and report 60 §11 labels the pillar-colour conflict a **"FOUNDER DECISION"**. Worse, the current token values *actively contradict* `docs/30`'s own canonical direction: `docs/30` §6.1 forbids warm colours for pillars ("Warm colors (red, orange, gold) must not be assigned to pillars"), while `lib/design/kora-design-tokens.ts` — documented as canonical by `docs/EXPERIENCE_LAYER.md` §2 — assigns LIFE=`#C76F3D` (terracotta), IMPACT=`#D99A2B` (amber/gold), LEGACY=`#8A7562` (warm taupe). **This is a genuine conflict between two documents both cited as governing for this WP → STOP / FOUNDER REVIEW REQUIRED on the colour-token half of DESIGN-001** (§3, §13).

The RESPONSIVE-001 half is entirely unblocked and contains one outstanding, very high-leverage finding: **`components/layout/Sidebar.tsx` is a hard-coded `width: 264px, minWidth: 264px` with zero responsive breakpoints**, and `AppShell.tsx`/`Header.tsx` likewise contain zero breakpoints — meaning every authenticated screen across all five role environments is structurally broken below roughly 600px viewport width. Fixing the chrome alone repairs mobile for the entire authenticated product in a single shared change. Quantitatively: 631 files scanned, 212 contain hex literals (3,428 occurrences), of which **204 files / 2,571 literals are candidate presentation violations — 1,762 map cleanly to an existing canonical token, but 809 (32%) have no canonical token at all** (a disclosed gap; no token invented here). Plus 19 tables lacking overflow wrappers and 14 rigid `repeat(N≥3)` grids. **Evidence indicates the true size exceeds the canonical "L"** — disclosed, not silently overridden (§18).

## 2. Exact canonical WP-088

Registry 142 line 213, verbatim fields:

- **Title**: Responsive/Design System Full Closure
- **Increment**: I5 — **Pilot Status**: NOT BASE PILOT SCOPE
- **Objective (Purpose)**: site-wide responsive/design closure
- **Primary Closures**: `KORA-GAP-RESPONSIVE-001`, `KORA-GAP-DESIGN-001` (full)
- **Early-Slice**: N/A (full closure of `047`'s own slice)
- **Arch Sources**: `docs/30`
- **Code Truth**: PARTIAL — **Existing Paths**: N/A — **Proposed New**: N/A — remediation only
- **Hard Deps**: `KORA-WP-047` — **Conditional Deps**: N/A — **Parallelization**: independent
- **Data/Migration Impact**: NONE — **Expand/Migrate/Cutover/Contract**: N/A
- **Service/API**: N/A — **Auth/RLS**: N/A — **UI**: full-site remediation
- **Privacy/Trust**: N/A — **Audit**: N/A — **ADMIN-020/Econ-Evidence**: N/A — **Async/Idempotency**: N/A
- **Tests**: full responsive/design-system regression suite
- **Feature Flag**: NO — **Rollback**: N/A
- **Acceptance**: site-wide responsive/design closure
- **Out of Scope**: N/A (registry field literally empty — resolved in §5 via the two gaps' own boundaries)
- **Size**: L — **Uncertainty**: LOW — **External Blockers**: none — **Evidence Gate**: N/A

Gap rows, verbatim: `KORA-GAP-DESIGN-001 · MODIFY · SC · L · docs/30 · EXISTS(partial) · 088 · 047(slice) · I2(slice)/I5(full) · BASE NON-BLOCKER(slice) · none · none · PARTIALLY IMPLEMENTED.` · `KORA-GAP-RESPONSIVE-001 · MODIFY · SC · M · CODE · PARTIAL · 088 · — · I5 · NOT BASE SCOPE · none · none · NOT IMPLEMENTED.`

Scope Triggers (Section E, re-read): none of the four apply. Named Gates: none — pure UI/token/responsive work, within CLAUDE.md §10's pre-Gate-2 allowed scope. DAG (Section C): `088:047`, and no WP lists `088` as a Hard Dep → **downstream unlocks: NONE (DAG leaf)**.

## 3. Frozen sources

- **`docs/30-kora-brand-visual-product-experience-constitution.md`** — WP-088's own named Arch Source. §6 (Pillar Color System), §7 (Typography), §21 (Accessibility), §22 (Implementation Token Map) read.
- **`docs/EXPERIENCE_LAYER.md`** — governing for the token layer WP-047/073 already built on; §2 (Token System), §3 (type scale), §8 (anti-regression rules) read.
- **`.kora-audit/output/60_EXPERIENCE_EXTERNAL_SURFACES_AND_ASSETS_v1.1.md`** §10 (RESPONSIVE-001) and §11 (DESIGN-001) — the actual requirement text behind both gaps.
- **`.kora-audit/output/143_...PRIME_PREPARATION...`** — read; governs `KORA-WP-120`–`123` (Prime Preparation) exclusively, contains nothing bearing on WP-088. Checked and reported rather than silently skipped.

**CONFLICT FOUND — STOP / FOUNDER REVIEW REQUIRED (colour-token scope only):**

| Source | Statement |
|---|---|
| `docs/30` §6.1 | "Warm colors (red, orange, gold) **must not** be assigned to pillars." LIFE forbidden: "Green (currently wrong), red, **orange**". IMPACT forbidden: "**Orange** (currently wrong), red". LEGACY forbidden: "**Amber** (currently wrong)". |
| `docs/EXPERIENCE_LAYER.md` §2 + `lib/design/kora-design-tokens.ts` | `PILLAR_COLORS.LIFE = #C76F3D` (terracotta/orange) · `IMPACT = #D99A2B` (amber/gold) · `LEGACY = #8A7562` (warm taupe) — presented as the canonical token set and used across 20+ files today. |
| `docs/30` §6.1 | "⚠️ **OFFICIAL PILLAR HEX VALUES REQUIRED FROM NEXT/DESIGNER.** Exact HEX values must be confirmed from the Figma design system or official brand guidelines **before implementing the pillar token system**." |
| `docs/30` §22.1 | Every colour token family (`--kora-gray-base`, `--kora-cosmic-blue`, `--kora-violet`, `--kora-fun-green`, `--kora-amber`, `--kora-red`): status "**OFFICIAL HEX REQUIRED**". |
| report 60 §11 | "**Resolve the documented pillar-color conflict** … — **FOUNDER DECISION**." |
| `docs/EXPERIENCE_LAYER.md` §2 note | "**Decisione del founder richiesta** prima di sincronizzare landing con token." |

Two sources both cited as governing for this WP give materially incompatible instructions about the same values, and the external asset (official brand hex) that would resolve them does not exist in the repository. Per this task's own instruction this is **not reinterpreted here**. Note `docs/30` §6.2's *specific* violation list is additionally **stale**: it names `components/charts/PillarChart.tsx` (`#22c55e`, `#3b82f6`, `#a855f7`, `#f97316`, `#f59e0b`) — that file no longer exists, and pillar colours are already token-sourced. The live conflict is with the *token values themselves*, not with the file §6.2 names.

## 4. Definition of "Full Closure"

Mechanically: the full (not `047`-slice-bounded) closure of exactly the two gaps Registry 142 names — `KORA-GAP-DESIGN-001` and `KORA-GAP-RESPONSIVE-001`, both of which name `088` as their own full-closure owner.

- **`KORA-GAP-DESIGN-001` means** (report 60 §11, verbatim requirement): extend the existing design system to reusable families for *navigation · forms · tables · cards · state/badge · evidence/confidence visualisation · empty/error/loading · permission-denied / privacy-boundary · dialogs · data visualisation · list↔map switch · responsive layout*, **and resolve the pillar-colour conflict (FOUNDER DECISION)**. Its stated impact: "every NEW domain UI re-invents primitives → compounding implementation + maintenance cost. SCALE-BLOCKING."
- **`KORA-GAP-RESPONSIVE-001` means** (report 60 §10, verbatim): "explicit responsive requirements for **My KORA · KORA Link · Booking / Access · Voice / Listening · My Sharing · Advisor calendar/contact** — the worker-facing and time-sensitive surfaces. **Product shell + landing are responsive today.**" Disposition NEW, "SCALE-BLOCKING for worker adoption."

**Important nuance**: RESPONSIVE-001's own text asserts "Product shell + landing are responsive today." Current code truth **contradicts that assertion** for the product shell — `Sidebar.tsx` is a fixed 264px with zero breakpoints (§9). The assertion was written before the current shell existed in this form; it is treated here as stale observation, not as a normative exemption, and the shell is therefore assessed as in-scope.

It does **not** mean: every CSS declaration repo-wide, every historical/experimental surface, every deferred feature, nor every literal hex automatically being a defect (§8).

## 5. Scope matrix

| Surface | DESIGN-001 | RESPONSIVE-001 |
|---|---|---|
| Shared design tokens (`lib/design/kora-design-tokens.ts`) | IN SCOPE — but colour-value changes **CONDITIONAL on the §3 Founder decision** | N/A |
| Shared UI primitives (`components/ui/*`) | IN SCOPE | IN SCOPE |
| Shared chrome (`AppShell`, `Sidebar`, `Header`, `KoraLogo`) | IN SCOPE | **IN SCOPE — highest leverage** (§9) |
| Company / Worker / Partner / Advisor / Admin route surfaces | IN SCOPE (token + component consistency) | IN SCOPE, prioritised per RESPONSIVE-001's own named worker-facing list |
| Public/auth surfaces (`/`, `/demo-guide`, `/login`, `/auth/*`) | CONDITIONAL — landing has its own `landing.module.css` + `marketing.module.css` scoped systems; RESPONSIVE-001 states landing is already responsive | OUT OF SCOPE per RESPONSIVE-001's own explicit "landing … responsive today" |
| Internal admin diagnostic tooling | IN SCOPE (it is part of the `/admin` environment's full-site surface, same reasoning WP-073 applied) | IN SCOPE |
| Future Vision (`/demo/future-vision`, doc 22A §6 screens) | **OUT OF SCOPE** (§12) | **OUT OF SCOPE** (§12) |
| Living KORAL (any surface) | **OUT OF SCOPE** (§11) | **OUT OF SCOPE** (§11) |
| `lib/decision-pack/html-template.ts` (export artefact) | OUT OF SCOPE — a standalone HTML export template, not an app surface (§8 cat. D) | OUT OF SCOPE |
| Deprecated/experimental surfaces | OUT OF SCOPE — none separately identified beyond the above |
| Data model / migrations / RLS / auth / domain services | OUT OF SCOPE (Registry 142: Data/Migration NONE, Auth/RLS N/A, Service/API N/A) |

## 6. WP-047 / WP-073 inheritance

**Inherit and reuse**: `lib/design/kora-design-tokens.ts`; the 8 remediated `components/ui/*` primitives; the **hex-literal regression-guard pattern** from `tests/unit/kora-wp-047-design-system-a11y.test.ts` (scoped allow-list technique — directly extensible to WP-088's much larger set); the structural-assertion test convention (no DOM-rendering dependency).

**Extend**: that same guard from WP-047's 7 remediated files to the far larger WP-088 surface; the `b169-nav-groups.test.ts` + `kora-wp-073-navigation-architecture.test.ts` nav baselines when touching chrome responsively.

**Do not duplicate**: the accessibility assertions (WP-073, 55 tests) and navigation-architecture assertions (WP-073, 23 tests) already exist and pass — WP-088 adds responsive/design assertions alongside them, never re-litigating them.

**Do not regress**: all 111 existing WP-047+WP-073 tests must stay green. Particular care — the `Sidebar.tsx` responsive fix (§9) touches a file whose nav-group structure and landmark semantics are now regression-locked by WP-073; the fix must be layout-only.

## 7. Design-system inventory (read-only)

- **Tokens**: `lib/design/kora-design-tokens.ts` — `KORA_COLORS`, `TOKENS` (canvas/surface/taupe/ink-scale/accent/violet/semantic/card-system/safeguard), `Z`, `SPACE`, `DURATION`, `CHART_COLORS`, `PILLAR_COLORS`, `STATUS_COLORS`, `BUTTON_TOKENS`, `BADGE_TOKENS`, `ACTIVATION_SIGNATURE`. Mirrored as CSS vars in `app/globals.css`. Comprehensive and well-formed.
- **Primitives**: 20 files in `components/ui/` (incl. the 8 canonical ones). **Adoption is the core DESIGN-001 defect**: `Table` primitive used by **0** files, `Field*` by **1**, `Button` by **0**, against 76 files containing raw `<button>` and 27 containing raw `<table>`. The primitives exist and are correct; the application almost entirely bypasses them.
- **Layouts/chrome**: `AppShell`, `Sidebar`, `Header`, `KoraLogo` — coherent, but zero responsive breakpoints among all three (§9).
- **Typography/spacing/radii/shadows**: defined centrally (`TOKENS.cardRadius`, `cardShadow`, `SPACE`, the Jakarta scale) and broadly respected; no systemic divergence detected.
- **Charts**: `ChartFrame.tsx`, `ComponentBreakdownChart.tsx` — token-sourced via `CHART_COLORS`; `PillarChart.tsx` (the file `docs/30` §6.2 names) no longer exists. `MacroblockCard.tsx` exists and `docs/30` §6.2 flags its teal/amber for audit — CONDITIONAL on §3.
- **Breakpoints/containers**: Tailwind v4 (no `tailwind.config.*`; CSS-first config). No project-level custom breakpoint scale or container-width standard defined anywhere — a real DESIGN-001 gap (`docs/30` requires "responsive layout" as a reusable family).

## 8. Hex-literal audit classification

Mechanically scanned `app/`, `components/`, `lib/` for `#RRGGBB`/`#RGB`:

- **Total files scanned: 631** · **files containing ≥1 hex literal: 212** · **total occurrences: 3,428**

| Category | Files | Notes |
|---|---|---|
| **A — PRESENTATION HEX (candidate violations)** | **204** (**2,571 literals**) | The real audit target. |
| **B — Valid technical constant** | 0 identified | None found distinct from A/D. |
| **C — External/brand-specific value** | CONDITIONAL | Cannot be separated from A until §3 is resolved — the landing's `#4A7FE0` (13 occurrences) is precisely the disputed pillar-LIFE blue. |
| **D — Static asset / export template / scoped CSS module** | 3 | `lib/decision-pack/html-template.ts` (647 — standalone HTML export), `app/pilot/pilot.module.css`, `components/landing/marketing.module.css`. |
| **E — Deferred / out-of-scope surface** | 2 | `components/company/living-koral/EditionsArchive.tsx` (§11), `app/demo/future-vision/page.tsx` (§12). |
| **F — Canonical source / legitimate mirror** | 3 | `lib/design/kora-design-tokens.ts` (the token source itself — hex here is correct by definition), `app/globals.css`, `app/landing.module.css`. |

**Token mappability of the 2,571 category-A literals:**
- **1,762 (68%) map cleanly to an existing canonical token** — top substitutions: `#06032B`→`TOKENS.ink` (379), `#C76F3D`→`TOKENS.accent` (266), `#F8F6F1`→`TOKENS.surface` (233), `#9E3B2F`→`TOKENS.critical` (193), `#FFFFFF`→`BUTTON_TOKENS.primary.color` (191), `#2F7D55`→`TOKENS.success` (184), `#8A5A00`→`TOKENS.safeguard.watch.text` (177), `#D99A2B`→`TOKENS.warning` (67), `#6156F5`→`TOKENS.violet` (40).
- **809 (32%) have NO canonical token** — top: `#3B6EBA` (43), `#F5F4FF` (31), `#FFFAF5` (30), `#1A1756` (24), `#C07D2A` (23), `#1E4A8A` (22), `#166534` (22), `#FAFAFA` (22), `#64748B` (19), `#C7C4F8` (18), `#854D0E` (15), `#DC2626` (14), `#4A7FE0` (13), `#1A4731` (13), `#7C3D8F` (13).

**CANONICAL TOKEN GAPS FOUND: YES.** 809 presentation literals across ~200 distinct values cannot be tokenised without new tokens being defined — and `docs/30` §22.1 marks every colour family "OFFICIAL HEX REQUIRED". **No token is invented here.** This is flagged as a hard dependency of DESIGN-001's own full closure, compounding the §3 Founder decision.

**No 199-file (or 204-file) blind replacement is proposed.** The 68% mappable portion is mechanically safe; the 32% unmappable portion is blocked on §3.

## 9. Responsive inventory

Mechanically audited 306 `.tsx` files:

- **Only 39/306 (12%) use any responsive breakpoint** (`sm:`/`md:`/`lg:`/`xl:`). Not per-se a defect (many are leaf components inheriting layout) but a strong signal.
- **🔴 HIGHEST-LEVERAGE DEFECT — shared chrome has zero breakpoints.** `components/layout/Sidebar.tsx` line 373: `width: '264px', minWidth: '264px'` — unconditional, no collapse, no drawer, no hide. `Sidebar.tsx`, `AppShell.tsx`, `Header.tsx` between them contain **0** breakpoint utilities. On a ~375px phone viewport the sidebar consumes 264px, leaving ~111px of content width. **This structurally breaks every authenticated screen in all five role environments.** Directly contradicts report 60 §10's stale "Product shell … responsive today" assertion (§4).
- **19 files render `<table>` with no `overflowX` wrapper** — real mobile overflow defects (`AcmeDemoHub`, `CompanyUsersPanel`, `DataIntakeStudio`, `provisioning/page`, `BulkWorkerProvisioningClient`, `WorkersAdminClient`, `_dry-check-button`, `CompanyConsolePanel`, `RosterImportModal`, `WorkerDiagnosticsClient`, `dynamic-cv/print`, `CompanyWorkspaceView`, +7). Note: WP-073 correctly added `scope="col"` to these without touching overflow — a clean, confirmed a11y/responsive boundary.
- **14 rigid `gridTemplateColumns: repeat(N≥3, …)` without `auto-fit`/`minmax`** across 11 files — direct violations of `EXPERIENCE_LAYER.md` §8 rule 4 ("Mai grids fissi senza breakpoint responsive (`sm:` / `auto-fit`)"): `admin/preview/worker/dynamic-cv` (2), `DynamicCVClient` (2), `WallboardClient` (2), `admin/commons`, `ImpactUnitsExplorer`, `trial-control-center`, `cv/share/[token]`, `dynamic-cv/print`, +3.
- **Fixed width ≥400px: 1 file** (`worker/dynamic-cv/print/page.tsx` — a print layout, legitimate, **not** a defect). **minWidth ≥400px: 0 files** — clean.
- **Charts**: `ResponsiveContainer` is used (recharts) — already responsive-capable.
- No "could look nicer" items are recorded as defects.

## 10. Remaining design-system debt (classified)

| Cat | Finding | Shared fix resolves many? |
|---|---|---|
| A — token violations | 2,571 presentation literals / 204 files; 1,762 mappable, 809 blocked on §3 | Partially — per-file edits, but one guard test locks them |
| D — component duplication | 76 files with raw `<button>`, 27 with raw `<table>`, 30 with raw `<input>` vs. near-zero primitive adoption | **YES — highest DESIGN-001 leverage** |
| J — shared primitive bypass | Same population; `Table` 0 users, `Button` 0, `Field*` 1 | **YES** |
| G — container/grid inconsistency | No project-level breakpoint scale or container-width standard defined | **YES — one definition** |
| B/C — typography/spacing | Centrally defined and broadly respected; no systemic divergence found | — |
| H/I — interaction-state / hierarchy | `docs/30`-required families (empty/error/loading/permission-denied/dialogs) partially exist (`EmptyState`, `NoDataState`, `BoundaryBanner`); **no dialog/modal family exists at all** (confirmed in WP-073) | **YES** |
| K — test coverage gap | Zero responsive or design-consistency regression coverage exists today | **YES** |
| — pillar colours | Token values contradict `docs/30` §6.1; official hex absent | **BLOCKED — §3** |

## 11. Living KORAL boundary

**OUT OF SCOPE — confirmed, not assumed.** WP-088 does not include the Living KORAL final renderer, KORAL Mark visual work, the Future Living KORAL Generative Renderer / Visual Manifestation package, or any future 3D manifestation. Structurally reinforced: the deferred renderer files (`implicit-field.ts`, `morphology-engine.ts`, `svg-renderer.ts`, `visual-grammar.ts`, `mark-service.ts`, `renderer-types.ts`, the Mark API route and Mark UI diff) **do not exist in this worktree at all** — they were never committed and live only in the untouched original dirty worktree. The three Living KORAL component files that *are* present (`EditionsArchive.tsx`, `LivingKoralNav.tsx`, `LivingKoralOverview.tsx`) are excluded from the WP-088 audit set (§8 cat. E) and must not be touched merely because they contain visual code.

## 12. Future Vision handling

**OUT OF SCOPE** for both token closure and responsive closure. Rationale from canon, not assumption: doc 22A §6 requires Future Vision screens only to be "clearly labeled *Future Vision / Not Active in Foundation Light*" with "no functional code, active runtime logic, or activated SQL-backed feature" behind them — they are deliberately inert mockups. Neither DESIGN-001's nor RESPONSIVE-001's own requirement text (report 60 §10/§11) names them. `app/demo/future-vision/page.tsx` is therefore classified cat. E (§8) and excluded. The existing `inactive: true` labelling is already verified present by WP-073's own navigation tests.

## 13. Automated test strategy

Extend existing patterns; **no new dependency proposed**. A new `tests/unit/kora-wp-088-*.test.ts` covering:
- **Forbidden-presentation-hex guard** — the WP-047 technique scaled up, implemented as a *shrinking allow-list* (the 204 cat-A files enumerated, each removed from the list as it is remediated), so progress is enforced and regression is impossible. Must exempt cats D/E/F explicitly.
- **Shared-primitive adoption guard** — a shrinking allow-list of files still using raw `<button>`/`<table>`/`<input>` outside the primitives.
- **Responsive structural guards** — statically detectable only: no `gridTemplateColumns: repeat(N≥3)` without `auto-fit`/`minmax`; every `<table>` inside an `overflowX` container; no unconditional `minWidth ≥ 400px` in chrome.
- **Chrome breakpoint guard** — assert `Sidebar.tsx`/`AppShell.tsx` contain responsive handling once fixed (prevents silent regression to a fixed 264px).
- **Regression locks** — all 111 WP-047 + WP-073 tests must remain green, unmodified.

Viewport-aware/DOM-rendering tests are **not** proposed: no jsdom/testing-library exists in this repo, and introducing one is explicitly discouraged at precheck. True viewport behaviour moves to runtime review (§14).

## 14. Runtime / visual validation requirements

Unlike WP-047/WP-073 (whose canonical Tests fields were satisfiable by static audit), WP-088's Acceptance is **"site-wide responsive/design closure"** — responsive correctness is inherently a rendered-viewport property that static assertions cannot fully prove. Therefore:

- **Vercel Preview after push: YES (required).**
- **Public smoke: YES** — `/`, `/demo-guide`.
- **Multi-viewport runtime review: YES (required)** — minimum three widths: **375px (phone)**, **768px (tablet)**, **1440px (desktop)**.
- **Authenticated responsive walkthrough: REQUIRED** (not merely conditional, unlike WP-047/073) — because the single highest-value fix (§9, the shell) is only observable behind a session. Minimum screens/roles: **KORA Admin** `/admin` + `/admin/companies` + one diagnostics table; **Company** `/company` + `/company/kora-index` + `/company/reports`; **Worker** `/worker/workspace` + `/worker/dynamic-cv`; **Partner** `/partner/workspace`; **Advisor** `/advisor`. Each at all three widths.
- **Known blocker**: E2E credentials remain unprovisioned (`E2E_KORA_ADMIN_*`, `E2E_COMPANY_A_*`) — the same disclosed debt carried since WP-047. **For WP-088 this is materially more serious than before**: it is not a nice-to-have, it is the primary acceptance evidence. Flagged as a likely completion blocker unless credentials are provisioned or the Founder accepts Preview-based manual review as substitute.
- **Visual screenshot review**: recommended for the three-width matrix above; no tooling for it exists in-repo today (Playwright is present as a devDependency and was used for Living KORAL fixtures, so a screenshot pass is technically feasible without new dependencies).

## 15. Backend / security boundary

**Expected and confirmed: NO DB migration · NO RLS changes · NO auth redesign · NO domain-service redesign · NO API redesign.** Nothing in the §7-§10 inventory requires backend work — every finding is presentation-layer (tokens, primitives, layout, breakpoints, overflow). Matches Registry 142's own fields exactly (Data/Migration NONE, Auth/RLS N/A, Service/API N/A). No blocker to report on this axis.

## 16. WP-088 vs. completed A11y/IA boundary

WP-088 must **not**: redesign role navigation architecture, reopen OQ-D01, rename canonical Product concepts, alter accessibility semantics (except to prevent regression), change auth behaviour, or change route architecture.

**One flagged overlap requiring pre-implementation Founder awareness**: the §9 chrome fix necessarily modifies `components/layout/Sidebar.tsx`, a file whose nav-group structure and `<nav>` landmark semantics are now regression-locked by WP-073's own tests. A mobile collapse/drawer pattern introduces a new interactive control (a toggle) which itself needs an accessible name, `aria-expanded`, and Escape handling — i.e. it *adds* accessibility surface rather than altering existing semantics. This is compatible with WP-073 (additive, not a reopening) but must be implemented so all 23 navigation tests and 55 accessibility tests stay green unmodified. Flagged here, before implementation, exactly as instructed.

## 17. Implementation decomposition (proposed, not started)

Derived from code truth, in bounded batches:
1. **Chrome responsive fix** (`Sidebar.tsx`, `AppShell.tsx`, `Header.tsx`) — single highest leverage; repairs mobile for the entire authenticated product. ~3 files.
2. **Container/breakpoint standard** — define the project-level scale/container widths DESIGN-001 requires. ~1-2 files.
3. **Table overflow wrappers** — 19 files, mechanical, low risk.
4. **Rigid-grid remediation** — 14 occurrences / 11 files.
5. **Token substitution, mappable subset only** — the 1,762 literals across ~204 files that map to existing tokens. Largest batch; mechanically safe; must be sub-batched.
6. **Shared-primitive adoption** — migrate the highest-traffic raw `<button>`/`<table>` users. Scope-capped, not exhaustive.
7. **Regression guards** (§13) — built alongside each batch, not afterwards.
8. **Runtime verification** (§14).
- **BLOCKED pending §3**: the 809 unmappable literals, all pillar/macroblock colour work, and any new colour-token definition.

## 18. Risk / size assessment

**Canonical Size: L. Evidence indicates the realistic size is XL** — disclosed, not silently overridden. Basis: 204 files needing token work + 19 + 11 + ~76 primitive-bypass files ≈ 250+ distinct files, versus WP-073's 41. Principal risks: (a) **the §3 Founder decision blocks ~32% of DESIGN-001's own literal scope indefinitely**; (b) the chrome fix is the highest-value *and* highest-risk change, touching a WP-073-regression-locked file; (c) authenticated multi-viewport validation is acceptance-critical yet credential-blocked (§14); (d) token substitution at 1,762 sites risks silent visual drift without a screenshot baseline that does not yet exist; (e) `docs/30` §6.2's staleness suggests other parts of `docs/30` may also be out of date relative to code — each `docs/30` requirement should be re-verified against code truth at implementation time rather than trusted.

## 19. DAG methodology discrepancy

**Resolved at the rule level; its application requires governance sign-off.**

Mechanical finding: **Registry 142 contains zero occurrences of the string `NOT_YET_READY`.** The four-bucket taxonomy (COMPLETE/READY/BLOCKED/NOT_YET_READY) is **not canonical** — it originates as a reporting convention in report 176 and was carried forward by 178/190/194/199.

What Registry 142 *does* state (Section H, verbatim) is decisive on the underlying rule:
> "`111` is a root but explicitly **NOT BASE PILOT SCOPE** … — **mechanically `READY`**, but excluded from this specific Base-Pilot-scoped root set …"; "`061, 087, 096` are roots but conditionally-scoped (Link trigger inactive by default)"; "its own execution priority relative to other READY work is a ranking question …, not a status question — **priority and status remain deliberately different things throughout this registry**." And (Living KORAL section): "**status and execution priority are deliberately different things here, per the Founder's own explicit instruction.**"

**Therefore the canonical rule is**: *status* = dependency readiness + hard external blockers/gates **only**. Scope Triggers and milestone sequencing are **priority/scope filters applied on top of status — never folded into status.**

Scope-Trigger discrepant WPs:

| WP | Trigger | Active? | Established convention | Literal re-parse | Canonical wording causing ambiguity |
|---|---|---|---|---|---|
| `050` | Booking selected | NO | READY | NOT_YET_READY | Section E lists the trigger; Section H never calls trigger-gating a status |
| `051` (+`052`–`059`) | Partner delivery selected | NO | READY (`051` only listed) | NOT_YET_READY | as above |
| `060` | Full Program delivery selected | NO | READY | NOT_YET_READY | as above |
| `061`, `087`, `096` | Link explicitly used | NO ("inactive by default", Section H) | READY (`061` only listed) | NOT_YET_READY | Section H calls them "roots … conditionally-scoped", i.e. status-ready, scope-excluded |

Applying the canonical rule strictly yields a **three-bucket** result: **COMPLETE 52 / READY 35 / BLOCKED 36 / TOTAL 123** (no NOT_YET_READY bucket). The established convention (52/26/27/18) is *correct on the Scope-Trigger axis* (it keeps them READY) but *diverges on the milestone-sequencing axis* (it moves ~7 increment-gated WPs — `065, 067, 071, 075, 079, 089, 095` — into NOT_YET_READY, which the same rule says should be READY). My earlier literal re-parse was wrong on the Scope-Trigger axis. **No historical report is rewritten here.**

**Governance question for the Founder**: adopt the canonical three-bucket rule (status = dependency + hard blockers; drop `NOT_YET_READY`; restate counts to 52/35/36 going forward), or formally ratify the four-bucket convention as an intentional reporting refinement with a written definition of `NOT_YET_READY`? → **DAG CLASSIFICATION RULE REQUIRES FOUNDER/GOVERNANCE ADJUDICATION.**

**This does not block WP-088**: WP-088 is READY under *all three* readings (established, literal re-parse, and strict canonical) — its Hard Dep `047` is COMPLETE, it carries no Scope Trigger, no Gate, and no external blocker.

## 20. Dependency / gate evaluation (re-verified from source)

- **Hard Dependencies**: `KORA-WP-047` — **COMPLETE** (commit `b36a989`, pushed, Founder-accepted). Re-verified from the Section C DAG line `088:047`, not inherited.
- **External Blockers**: Registry 142 says "none". **But** `docs/30` (its own named Arch Source) and report 60 §11 impose an unmet Founder decision + a missing external brand asset (§3) — a real, scope-gating prerequisite Registry 142's own field does not capture.
- **Scope Triggers**: none apply.
- **Named Gates**: none.
- **Founder/Product prerequisites**: **YES — one, unresolved** (§3): the pillar-colour conflict / official brand hex values.

## 21. Canonical state

**READY — with a disclosed, scope-gating Founder prerequisite.**

WP-088 is DAG-READY and roughly half its scope (all of RESPONSIVE-001, plus the 68%-mappable token subset and all primitive/overflow/grid work) can proceed immediately with no Founder input. The remaining portion (pillar/macroblock colours, the 809 unmappable literals, any new colour-token definition) is **BLOCKED on §3** and must not be attempted until adjudicated. Deliberately *not* classified BLOCKED outright, since that would misstate the substantial unblocked majority — but equally not classified plainly READY without this qualification, since doing so would repeat the WP-073/OQ-D01 pattern of discovering a Founder gate mid-implementation.

## 22. Consolidation cadence

Completed numbered advancements since accepted Audit 163: `111, 112, 113, 114, 115, 116, 047, 073` = **8**. `WP-117` remains OPEN, contributes 0. WP-088 would become advancement **#9** only upon full completion — not by this precheck. Threshold: **10**. **8 < 10 — audit not due.**

## 23. GO / BLOCKED conclusion

**CONDITIONAL GO.** Proceed with WP-088's RESPONSIVE-001 half and the unblocked DESIGN-001 subset immediately — the highest-value single fix (shared chrome responsiveness, §9) is entirely unblocked and repairs mobile across all five role environments at once. **Do not begin any colour-token work** until the Founder resolves §3. Two items warrant explicit Founder acknowledgement before implementation starts: (1) the §3 source conflict and missing brand asset; (2) the §14 finding that authenticated multi-viewport validation is acceptance-critical for this WP and currently credential-blocked.

## 24. Git status

Clean. Branch `feature/wp088-responsive-design-system-full-closure` at `4844e27d3da37d865041fba573cf9f39ce5c31c3`, no commits, no application-code/test/migration changes — this task wrote only this disk-only report (`.kora-audit/` is gitignored). Original dirty worktree never accessed; deferred Living KORAL renderer never touched.
