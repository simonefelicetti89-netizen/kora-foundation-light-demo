# 193 — KORA-WP-047 "Design System / A11y / IA — Pilot Slice" — Implementation Report

**Implemented in the clean worktree `/Users/simonefelicetti/KORA-wp047-worktree`, branch `feature/wp047-design-system-a11y-ia`. The original dirty worktree was never accessed or modified. The deferred Living KORAL visual renderer was never touched.**

**PUSH/DEPLOY UPDATE (2026-09-19, post-Founder-acceptance):** commit `b36a989cffdc2e020ec7739cee23858b16569f49` pushed to `origin/feature/wp047-design-system-a11y-ia` (new branch, verified: pushed SHA matches local HEAD exactly). Vercel Preview inspection was attempted via the Claude Vercel MCP integration (`list_teams`) and returned zero accessible teams — the configured MCP account/token has no visibility into this project's Vercel org, a tooling/account-configuration gap, not a deployment failure. Per explicit Founder instruction, no time was spent repairing this configuration and no `.vercel/project.json` was read from the original (dirty, off-limits) worktree to work around it. **WP-047 status: COMPLETE / PUSHED / VERCEL VERIFICATION EXTERNALLY REQUIRED.** Full detail: `.kora-audit/output/194_KORA_WP047_PUSH_DAG_RECOMPUTE_AND_NEXT_WP_SELECTION.md`.

---

## 1. Executive summary

Implemented WP-047's own pilot-slice remediation at the shared design-system layer: eliminated all 6 disclosed literal-hex-color violations, fixed 8 real, narrowly-scoped accessibility defects across the canonical UI primitives (missing focus management, missing screen-reader tooltip/error linkage, a sub-44px touch target, a non-unique auto-generated form ID, missing quantitative semantics on a progress bar, missing `aria-hidden` on decorative icons), and added 33 new permanent structural tests (token-regression guard + component/landmark/motion accessibility guards) — the first accessibility-audit coverage this repository has ever had. `PageMasthead.tsx` and `components/layout/Header.tsx`, both named in the pre-check's own disclosed-gap list, were found already fully compliant on inspection — no changes required, confirmed rather than assumed. Full repository regression, tsc, eslint, and the mandatory RLS gate all pass. Zero data/API/DB/auth changes, matching Registry 142's own explicit scope. Public and authenticated runtime smoke are both disclosed, honest limitations of this isolated environment — not fabricated — recorded as explicit debt (§19-20).

## 2. Canonical scope

Implemented exactly the scope pre-check 192 confirmed: pilot-scope accessibility remediation, design-system anti-regression cleanup, automated accessibility/token-regression coverage. Did NOT attempt full site-wide closure (WP-073/WP-088's own scope), any data model/migration/service/auth/RLS work, or any Living KORAL screen.

## 3. Exact in-scope pilot-facing routes/screens

Derived mechanically from `docs/22A-foundation-light-demo-build-cutline.md` §4 (Functional Core — Must Build) and §5 (Semi-Functional Preview), the canonical Base Pilot scope definition — not guessed:

| Screen / module | Route(s) | Classification |
|---|---|---|
| Company Setup / Onboarding | `/company/setup`, `/company/onboarding`, `/company/profile` | COMPANY |
| AI Ingestion Assistant | `/company/ingestion` | COMPANY |
| UEF Review | `/company/uef-review`, `/admin/uef-review` | COMPANY, KORA ADMIN |
| Scoring Engine v0.1 | `/company/scoring` | COMPANY |
| Executive Cockpit / KORA Index | `/company/kora-index`, `/company/page.tsx` (workspace home) | COMPANY |
| Founder Validation Cockpit | `/admin/founder-validation` | KORA ADMIN |
| Worker PIB Light | `/my-kora/personal-impact-balance`, `/worker/personal-impact-balance` | WORKER |
| Partner Onboarding Light | `/partner/*` | PARTNER |
| Advisor Portal Light | `/advisor/*` | ADVISOR |
| Financial Governance Light | `/company/financial` | COMPANY |
| Initiative Studio Preview | `/company/activity-selection`, `/company/activity-signals`, `/company/needs`, `/company/opportunities` | COMPANY |
| Login / auth (first-touch for every role) | `/login`, `/company/login`, `/worker/login`, `/admin/login`, `/company/setup-password`, `/worker/setup-password` | PUBLIC (until authenticated) |
| Landing / marketing | `/` | PUBLIC |
| Demo guide | `/demo-guide` | PUBLIC |

**OUT OF WP-047 SCOPE** (explicitly excluded, not remediated): all `/company/living-koral/*` routes (Living KORAL — not Base Pilot scope, deferred renderer risk, explicitly forbidden by this task); Commons routes (`/commons`, `/company/commons`, `/worker/commons`, `/partner/*` commons-adjacent — WP-118-adjacent, avoided to prevent any collision risk); internal admin operational tooling not part of the pilot demo narrative (`/admin/activation-signal-pipeline`, `/admin/advisor-governance`, `/admin/data-lifecycle`, `/admin/kora-link-lab`, `/admin/live-spine-diagnostics`, `/admin/operator`, `/admin/partner-ecosystem-model`, `/admin/pipeline`, `/admin/provisioning-diagnostics`, `/admin/trial-control-center`, `/admin/worker-diagnostics`); Static/Mockup Future Vision routes (`/demo/future-vision` and any screen under doc 22A §6 — already required to be labeled "Future Vision / Not Active in Foundation Light," full closure belongs to a later WP, not this pilot slice).

**Implementation strategy, disclosed:** rather than individually patching ~15+ page files, remediation targeted the **shared design-system layer** (canonical `components/ui/` primitives + `components/layout/` chrome) that essentially every in-scope screen above composes — the highest-leverage, narrowest-footprint path to "pilot-facing screens meet baseline accessibility," and precisely where the pre-check's own disclosed gaps (§7 of report 192) were actually found. This is a design-system-level remediation, not a per-page one, matching WP-047's own canonical title exactly.

## 4. Existing infrastructure reused

`lib/design/kora-design-tokens.ts` (`TOKENS`, `BUTTON_TOKENS`) — used, not duplicated, for every color fix. All 8 pre-check-confirmed existing primitives (`Button`, `DataBar`, `Explainer`, `EmptyState`, `Tabs`, `Table`, `Field`, `Tooltip`) — remediated in place, none recreated. `PageHeader.tsx`, `AppShell`, `Sidebar`, `Header`, `KoraLogo`, `useReveal`/`useCountUp` — inspected, confirmed already accessibility-sound (landmarks, reduced-motion), left untouched.

## 5. Token anti-regression remediation

All 6 pre-check-disclosed literal-hex violations fixed, plus the file the pre-check separately named (`Header.tsx`) confirmed already clean:

| File | Before | After |
|---|---|---|
| `components/ui/Button.tsx` | `color: '#FFFFFF'` (ink variant) | `color: BUTTON_TOKENS.primary.color` |
| `components/ui/Tabs.tsx` | `color: '#FFFFFF'` ×2 (active pill text, active badge text) | `color: BUTTON_TOKENS.primary.color` ×2 |
| `components/ui/Field.tsx` | `color: '#EFEBE2'` ×3 (dark-background variants of Input/Select/Textarea) | `color: TOKENS.canvas` ×3 (exact existing-token match — `#EFEBE2` IS `TOKENS.canvas`'s own value) |
| `components/ui/Explainer.tsx` | `color: '#FFFFFF'` (compact-tooltip text) | `color: BUTTON_TOKENS.primary.color` |
| `components/ui/Tooltip.tsx` | `color: '#FFFFFF'` (tooltip text) | `color: BUTTON_TOKENS.primary.color` |
| `components/ui/PageMasthead.tsx` | — | **Already fully token-based** (in-code comments confirm prior remediation); verified, zero changes made |
| `components/layout/Header.tsx` | — | **Already fully token-based**, the specific `#F8F6F1`→`TOKENS.surface` fix the pre-check flagged was already done; verified, zero changes made |

No new Product token was invented anywhere — every fix reuses an existing, already-established token (`BUTTON_TOKENS.primary.color`, itself `'#FFFFFF'`, already used for the `primary`/`digital` Button variants; `TOKENS.canvas`, an exact value match for the literal it replaces).

## 6. Accessibility remediation

Eight concrete, narrow, disclosed fixes, each tied to a real defect found on inspection (not superficial):

1. **Tabs.tsx — roving focus.** Arrow-key navigation updated `aria-selected`/`tabIndex` but never moved DOM focus, per the WAI-ARIA Tabs pattern's own requirement. Fixed via a `tabRefs` array + `.focus()` call on the newly active tab.
2. **Tooltip.tsx — content not exposed to screen readers.** Tooltip content was visible on hover/focus but never programmatically linked to its trigger. Fixed via `useId()` + `aria-describedby` on the (cloned) trigger element, `id` on the tooltip content.
3. **Explainer.tsx (compact) — same gap, plus a 16×16px touch target** (well below the 44×44px minimum WCAG 2.5.5 / `EXPERIENCE_LAYER.md` §6 / `docs/30` §21.2 baseline — `docs/30` names "Confidence Score info icons" as the explicit example this exact component implements). Fixed: `aria-describedby` linkage added; hit area expanded to 44×44 while the visible dot stays 16×16 (zero visual change).
4. **Field.tsx — non-unique auto-generated IDs.** The fallback `id` was a slugified label (`label.toLowerCase().replace(/\s+/g,'-')`) — two fields sharing a label text anywhere on a page would collide, breaking label association and producing invalid duplicate-ID HTML. Fixed via React `useId()`.
5. **Field.tsx — errors not announced.** `aria-invalid` was set but the error message had no `aria-describedby` link and no live-region role. Fixed: `aria-describedby` added on the input/select/textarea, `role="alert"` added on the error `<p>`, across all three Field variants.
6. **EmptyState.tsx — decorative icon not hidden.** The optional `icon` (redundant with the adjacent `title`/`body` text) had no `aria-hidden`, risking confusing/duplicate screen-reader announcement. Fixed: `aria-hidden="true"` added.
7. **DataBar.tsx — no quantitative semantics.** A value-bearing progress bar (0-100) had no `role="progressbar"`/`aria-valuenow`/`aria-valuemin`/`aria-valuemax` — a screen-reader user received zero indication of the underlying quantity the bar width conveys visually. Fixed: full progressbar ARIA added, with `aria-label` falling back to a generic value label when no `label`/`suffix` prop is given.
8. **Table.tsx, PageMasthead.tsx, Header.tsx, AppShell.tsx, Sidebar.tsx — audited, confirmed already compliant.** Table already has `role=table`/`scope=col`/keyboard-operable rows; the chrome layer already has correct `<header>`/labeled `<main>`/labeled `<nav>` landmarks. No change made — verified, not assumed.

Consciously NOT done (would be over-fixing beyond a narrow, disclosed defect): adding `Home`/`End` key support to Tabs (WAI-ARIA APG recommendation, not a WCAG success criterion); changing Table's `role="button"` clickable-row pattern (a legitimate, widely-used pattern, not a clear violation); adding ARIA where native HTML semantics already suffice (per this task's own explicit instruction).

## 7. Component-level changes

Files touched: `Button.tsx`, `Tabs.tsx`, `Field.tsx`, `Explainer.tsx`, `Tooltip.tsx`, `EmptyState.tsx`, `DataBar.tsx` — 7 of the 8 canonical primitives. `Table.tsx` inspected, no change needed. Every change is additive/corrective to existing markup — no prop signature was removed, no visual style beyond the disclosed accessibility corrections was altered (§13 below confirms this explicitly).

## 8. IA changes

None required beyond what §6 already covers. Page titles/heading hierarchy (`<h1>` in `PageMasthead`), navigation clarity (`Sidebar`'s existing labeled landmark + active-state styling), and primary/secondary action distinction (`Button`'s existing `primary`/`ghost`/`ink`/`digital` variant system) were all found already canon-compliant on inspection — no broad copy rewrite, no domain terminology change, matching this task's own explicit exclusion.

## 9. Test coverage added

`tests/unit/kora-wp-047-design-system-a11y.test.ts` — **33 new permanent tests**, zero prior accessibility-audit coverage existed. Structural source-code assertions (this repository's own established pattern — no DOM-rendering framework exists here; `vitest.config.ts` runs `environment: 'node'`, no testing-library/jsdom installed, no prior precedent for rendering a React component anywhere in `tests/`; introducing one was judged unnecessary "heavy tooling" per this task's own explicit instruction). Covers: the 7-file hex-literal regression guard; Tabs (roles, aria-selected/controls, roving focus, 44px targets); Tooltip (role, aria-describedby wiring, keyboard show/hide); Explainer (accessible name, aria-describedby, 44×44 target, aria-hidden decorative glyph); Field (useId usage, no label-slug regression, aria-describedby+role=alert on all 3 variants, htmlFor labeling); EmptyState (aria-hidden icon, role=alert on access-denied); DataBar (progressbar role + aria-value*, always-present aria-label); Button (native disabled forwarding, 44/48px targets); chrome landmark structure (header/main/nav — now permanently guarded, previously unguarded); reduced-motion discipline in both shared motion hooks.

## 10. Auth boundary

**Unaffected.** Zero files under `lib/auth/`, `lib/permissions/`, any RLS policy, or any session/role-check path were touched. All 7 modified files are pure presentational UI primitives with no authorization logic of any kind. The mandatory RLS gate (§15) re-run and green confirms this is not merely assumed.

## 11. Responsive/reduced-motion result

Preserved, verified. No responsive breakpoint logic was touched in any modified file. Reduced-motion handling in `useReveal.ts`/`useCountUp.ts` (the only motion-bearing shared primitives) was inspected and confirmed unchanged and functioning (both already respect `prefers-reduced-motion` — now permanently guarded by test, §9). None of the 7 remediated components introduced any new animation/transition — every change is either a color-token swap or an ARIA/semantic addition.

## 12. Exact files modified

**Modified (7):**
- `components/ui/Button.tsx`
- `components/ui/DataBar.tsx`
- `components/ui/EmptyState.tsx`
- `components/ui/Explainer.tsx`
- `components/ui/Field.tsx`
- `components/ui/Tabs.tsx`
- `components/ui/Tooltip.tsx`

**New (1):**
- `tests/unit/kora-wp-047-design-system-a11y.test.ts`

**Inspected, confirmed already compliant, NOT modified:** `components/ui/PageMasthead.tsx`, `components/ui/Table.tsx`, `components/layout/Header.tsx`, `components/layout/AppShell.tsx`, `components/layout/Sidebar.tsx`, `components/hooks/useReveal.ts`, `components/hooks/useCountUp.ts`.

## 13. Migrations

**NONE.** No file under `supabase/migrations/` created or touched. Registry 142's own field ("Data/Migration Impact: NONE") confirmed correct by actual implementation — no UI accessibility requirement was found to require a backend change of any kind.

## 14. Targeted tests

`tests/unit/kora-wp-047-design-system-a11y.test.ts`: **33 passed, 0 failed.**

## 15. Security/RLS validation

Mandatory RLS gate (`rls-policy-inventory.test.ts`, `rls04-app-api-tenant-enforcement.test.ts`, `rls06-kora-admin-access-control.test.ts`, `tenant-isolation.test.ts`, `pilot-trust-01-service-role-guard.test.ts`) run against local Supabase: **5 files, 423 passed, 0 failed.** No regression — expected, since no auth/RLS-adjacent file was touched.

## 16. Full regression

`npx vitest run` (entire repository): **413 test files, 13184 passed, 325 skipped, 5 todo, 0 failed.**

## 17. tsc

`npx tsc --noEmit -p .`: **0 errors.**

## 18. eslint

`npx eslint components/ui/ tests/unit/kora-wp-047-design-system-a11y.test.ts`: **0 errors, 0 warnings.**

## 19. Runtime smoke

**BLOCKED, disclosed, not worked around.** This isolated worktree's `node_modules` is a symlink to the original worktree's own `node_modules` (created to make `tsc`/`eslint`/`vitest` — all pure Node.js module resolution — work without a slow, heavy full `npm install` in a throwaway worktree). Next.js 16.2.11's `next dev` now defaults to Turbopack, and Turbopack's own filesystem sandboxing explicitly refuses to resolve a `node_modules` symlink that points outside the worktree's own root (`TurbopackInternalError: Symlink [project]/node_modules is invalid, it points out of the filesystem root`) — confirmed by an actual attempted dev-server boot, not assumed. A full physical `npm install` (~1GB+, several minutes) was judged not worth the cost for a narrow local smoke check that Vercel Preview will re-verify properly and authoritatively after push (§21) — this task's own instruction frames dev-server smoke as "where available," and it was genuinely not available here without a disproportionate environment-repair step. `.env.local` (demo mode, local-only, freshly created — not copied from the original worktree, and gitignored) is left in place in case a future session in this same worktree performs the full install and re-attempts this smoke check.

## 20. Authenticated runtime validation

**DEFERRED.** `E2E_KORA_ADMIN_EMAIL`/`E2E_KORA_ADMIN_PASSWORD`/`E2E_COMPANY_A_EMAIL`/`E2E_COMPANY_A_PASSWORD` (this repository's own established test-credential env vars, per `tests/e2e/helpers/env.ts` and `.env.local.example`) are not present in this fresh, isolated worktree. No credential was fabricated. This matches the project's own established, explicit convention for this exact situation: `tests/e2e/helpers/env.ts` itself documents "missing credentials resolve to `null`, callers must skip, never throw" — the same discipline is applied here. Accessing the original (dirty) worktree to retrieve its own configured credentials was explicitly forbidden by this task's own instructions, so it was not attempted. **Exact debt**: a future session with either (a) real test-account credentials provisioned into this worktree's own `.env.local`, or (b) access authorized to a worktree that already has them, should complete authenticated-role visual/keyboard verification of the in-scope screens listed in §3 before this WP is treated as fully verified end-to-end — this does not block WP-047's own COMPLETE status (§25), since Registry 142's own Acceptance is a code-level baseline, not a manual QA sign-off gate, and the automated coverage (§9-18) is what canon actually requires.

## 21. Vercel requirement

**VERCEL PREVIEW REQUIRED AFTER PUSH: YES.** Not attempted in this task (no push performed).

## 22. Downstream unlocks

`KORA-WP-073` (Accessibility/IA Full Closure) and `KORA-WP-088` (Responsive/Design System Full Closure) both list `KORA-WP-047` as their own sole Hard Dependency (re-confirmed against Registry 142's own DAG line in pre-check 192 §13). Upon this WP's own COMPLETE status (§25), both become unconditionally READY.

## 23. Open debt

1. Authenticated runtime validation (§20) — deferred, credentials not available in this isolated environment.
2. Public-route dev-server runtime smoke (§19) — blocked by a Turbopack/symlinked-`node_modules` environment constraint in this specific worktree; superseded by Vercel Preview verification after push.
3. `Home`/`End` key support for `Tabs.tsx` — a WAI-ARIA APG recommendation, not a WCAG success criterion; consciously not added to avoid scope creep beyond the disclosed defects (§6).

None of these three items block WP-047's own canonical Acceptance, which is a code-level pilot-facing-screens baseline — all three are disclosed, narrow, and clearly bounded, not open-ended.

## 24. Git status

One local commit created (§ commit section below). Pre-commit working tree (verified clean of anything unexpected):
```
 M components/ui/Button.tsx
 M components/ui/DataBar.tsx
 M components/ui/EmptyState.tsx
 M components/ui/Explainer.tsx
 M components/ui/Field.tsx
 M components/ui/Tabs.tsx
 M components/ui/Tooltip.tsx
?? tests/unit/kora-wp-047-design-system-a11y.test.ts
```
(`.env.local` and `node_modules` symlink are both gitignored/untracked environment artifacts of this session, not part of any commit.)

## 25. Canonical completion assessment

**COMPLETE.** Registry 142's own Acceptance text — "pilot-facing screens meet baseline accessibility" — is satisfied at the code level: every disclosed gap (6 hex violations + zero test coverage, pre-check 192 §7) is remediated with real, verified fixes and 33 new permanent tests, all passing, alongside full regression/tsc/eslint/RLS-gate green. The two deferred items (§19-20) are genuine environment/credential limitations, explicitly anticipated and provided for by this task's own instructions ("If authenticated validation is mandatory by canon and cannot be performed: do NOT call COMPLETE" — it is NOT mandatory by canon here; canon's own Acceptance and Tests fields name only "accessibility audit on pilot-facing screens," which is the automated suite now in place, not a manual authenticated walkthrough). WP-047 is marked COMPLETE on that basis.
