# 192 — KORA-WP-047 "Design System / A11y / IA — Pilot Slice" — Canonical Pre-Check

**PRE-CHECK ONLY. No implementation performed. No application code modified. No tests modified. No migration created. No commit. No push.**

Performed in a clean git worktree (`/Users/simonefelicetti/KORA-wp047-worktree`, branch `feature/wp047-design-system-a11y-ia`, starting from commit `a9a0f0e2e10b74d3dc9575547db8f690eaba07c3`) isolated from the deferred WP-117 visual-renderer bucket in the original worktree.

---

## 1. Executive conclusion

**KORA-WP-047 is READY.** Its sole Hard Dependency, `KORA-WP-010`, is COMPLETE. No External Blocker, Scope Trigger, or named Gate applies. Two frozen governing sources (`docs/EXPERIENCE_LAYER.md`, `docs/30-kora-brand-visual-product-experience-constitution.md`) were read and found consistent with each other and with Registry 142 — no conflict, no `STOP` condition triggered. Repository code truth shows substantial existing infrastructure (all 8 "to create" primitives from `EXPERIENCE_LAYER.md` §4 already exist) but real, disclosed gaps remain: 6 components with literal hex colors violating the project's own anti-regression rule, and zero existing accessibility-audit test coverage. WP-047 structurally cannot collide with the deferred Living KORAL visual-renderer bucket — Living KORAL is explicitly cross-cutting, NOT Base Pilot scope, and none of its screens fall within WP-047's own pilot-facing scope. GO for a future implementation task; not implemented here.

## 2. Exact canonical WP-047 definition

Reconstructed verbatim from Registry 142, line 117:

- **Canonical title**: Design System / A11y / IA — Pilot Slice
- **Increment**: I2 (First-Pilot Hardening / Go-Live)
- **Objective (Purpose)**: pilot-relevant accessibility/design/IA subset
- **Pilot Status**: BASE PILOT NON-BLOCKER
- **Primary Closures**: pilot-relevant slice of `KORA-GAP-DESIGN-001`, `KORA-GAP-A11Y-001`, `KORA-GAP-PLATFORM-025`
- **Early-Slice**: this WP IS the early slice — full closures are `KORA-WP-073` (Accessibility/IA Full Closure) and `KORA-WP-088` (Responsive/Design System Full Closure)
- **Arch Sources**: `docs/EXPERIENCE_LAYER.md`
- **Code Truth**: PARTIAL
- **Existing Paths**: N/A
- **Proposed New**: pilot-scope accessibility remediation
- **Hard Deps**: `KORA-WP-010`
- **Conditional Deps**: N/A
- **Parallelization**: parallel with rest of I2
- **Data/Migration Impact**: NONE
- **Expand/Migrate/Cutover/Contract**: N/A
- **Service/API**: N/A
- **Auth/RLS**: N/A
- **UI**: is the deliverable
- **Privacy/Trust**: N/A
- **Audit**: N/A
- **Async/Idempotency**: N/A
- **Tests**: accessibility audit on pilot-facing screens
- **Feature Flag**: NO
- **Rollback**: N/A
- **Acceptance**: pilot-facing screens meet baseline accessibility
- **Out of Scope**: full site-wide closure (owned by WP-073/WP-088)
- **Size**: M
- **Uncertainty**: LOW
- **External Blockers**: none
- **Evidence Gate**: N/A

Cross-checked against Registry 142's own DAG line (Section C): `047:010` — confirms the sole Hard Dep. Cross-checked against Section E (Scope Triggers, 4 total: Booking/Partner/Program/Link) — none apply to WP-047.

## 3. Frozen sources

- **`docs/EXPERIENCE_LAYER.md`** (v1.0, Fase 0, 2026-06-04, 253 lines) — read in full. Contains: the canonical design-token source (`lib/design/kora-design-tokens.ts`), full typographic scale, an exact component inventory with per-component status, motion grammar, an explicit **Accessibility Baseline** section (§6: WCAG AA contrast 4.5:1 body / 3:1 large, focus-visible 2px solid violet-tint with 2px offset, ≥44×44px touch targets, ARIA rules for forms/icons, `prefers-reduced-motion` support, heading hierarchy, descriptive link text), and 7 anti-regression rules (§8).
- **`docs/30-kora-brand-visual-product-experience-constitution.md`** (1303 lines) — searched for pilot-slice/accessibility content; §21 "Accessibility and Readability Rules" read in full (contrast 4.5:1/3:1, 44×44px targets, `prefers-reduced-motion` with ≤100ms transitions when reduced, plain-Italian-language rules).

**No conflict found between the two sources or against Registry 142.** Both frozen sources state the same WCAG AA contrast ratios and the same 44×44px touch-target minimum; `docs/30` explicitly defers final hex values to "official brand sources" while `EXPERIENCE_LAYER.md` (written later) records the token values as already decided — a sequencing relationship, not a contradiction. No `STOP — FOUNDER REVIEW REQUIRED` condition triggered.

## 4. Dependency/gate evaluation

- **Hard Dependencies**: `KORA-WP-010` (Base RLS/Access Foundation + Recusal Negative-Access Test Harness) — **COMPLETE**, confirmed via report 178's own fresh mechanical DAG parse (COMPLETE set includes `1–11`) and independently re-confirmed against Registry 142's own current DAG line for `010` (Hard Dep `004`, itself in the same COMPLETE range).
- **External Blockers**: none (Registry 142 verbatim).
- **Scope Triggers**: none of the 4 canonical triggers (Booking selected / Partner delivery selected / Full Program delivery selected / Link explicitly used) activate or gate WP-047.
- **Named Gates**: none apply. WP-047 is pure Next.js/React/Tailwind/design-token/accessibility work — explicitly within CLAUDE.md §10's own "Allowed Work Before Gate 2" list (routing, layout, component primitives). No SQL, no Prisma, no production auth, no migration (Registry 142: "Data/Migration Impact: NONE").
- **Founder/Product prerequisites**: none disclosed anywhere in Registry 142, `EXPERIENCE_LAYER.md`, or `docs/30` specifically gating WP-047's own start.

## 5. Repository code truth

`lib/design/kora-design-tokens.ts` exists (7616 bytes) — the canonical token source `EXPERIENCE_LAYER.md` names is real and current.

**All 8 primitives `EXPERIENCE_LAYER.md` §4 flagged "Da creare" (to be created) already exist** in `components/ui/`: `Button.tsx`, `DataBar.tsx`, `Explainer.tsx`, `EmptyState.tsx`, `Tabs.tsx`, `Table.tsx`, `Field.tsx`, `Tooltip.tsx`. `PageHeader.tsx` (the "Elevare" item) also exists, alongside the original `PageMasthead.tsx`. This confirms `EXPERIENCE_LAYER.md`'s own inventory is stale relative to current code — real UI work has progressed materially since that doc was written; WP-047's own remaining scope is genuinely remediation, not net-new component construction, matching Registry 142's own "Proposed New: pilot-scope accessibility remediation" wording precisely.

Serif removal (`EXPERIENCE_LAYER.md` §8 rule 1) verified correctly implemented: `app/layout.tsx` still loads Instrument Serif/Playfair Display fonts (for documented backward-compatibility reasons), but `app/globals.css` correctly aliases `--font-kora-serif` to `--font-kora-sans` (the documented "Fase 0 flip") — no active serif rendering, not a violation.

## 6. Existing reusable infrastructure

- `lib/design/kora-design-tokens.ts` — canonical token source, real, current.
- `app/globals.css` — CSS variable mirror, includes the documented serif-to-sans alias.
- All 8 previously-missing `components/ui/` primitives, now present.
- `components/layout/AppShell`, `Sidebar`, `Header`, `KoraLogo` — per `EXPERIENCE_LAYER.md` §4, largely "OK" status (Header flagged for one hardcoded-hex fix, `#F8F6F1` → `TOKENS.surface`).
- `components/hooks/useReveal`, `useCountUp` — motion primitives, already respect `prefers-reduced-motion` per the doc's own spec.

## 7. Missing implementation (disclosed gaps)

- **Literal hex colors in 6 `components/ui/` files** — `PageMasthead.tsx`, `Tabs.tsx`, `Field.tsx`, `Explainer.tsx`, `Tooltip.tsx`, `Button.tsx` (spot-checked: `Button.tsx` line 37 and `Tooltip.tsx` line 42 both hardcode `color: '#FFFFFF'` instead of a `TOKENS` reference) — a direct violation of `EXPERIENCE_LAYER.md` §8 anti-regression rule 2 ("Mai hex letterali nei componenti — sempre TOKENS o CSS vars"). Real, disclosed remediation scope.
- **Zero existing accessibility-audit test coverage** — no file under `tests/` matches `*a11y*` or `*accessib*`. Registry 142's own Tests field ("accessibility audit on pilot-facing screens") is currently unimplemented.
- **`Header.tsx` hardcoded hex** (`#F8F6F1` → `TOKENS.surface`), per `EXPERIENCE_LAYER.md` §4's own explicit note — not yet verified fixed in this pre-check (scope for the future implementation task).
- **Exact "pilot-facing screens" enumeration** — Registry 142's own Acceptance text names "pilot-facing screens" without an exhaustive list; a future implementation task should cross-reference doc 24 (Foundation Light Product Functional Spec) / doc 25 (Demo Dataset and Scenarios) for the precise Base Pilot screen set before beginning remediation, rather than guessing scope.

## 8. Exclusions

Out of scope for WP-047 (per Registry 142 verbatim + the Early-Slice relationship): full site-wide accessibility closure (`KORA-WP-073`), full site-wide responsive/design-system closure (`KORA-WP-088`), any Living KORAL screen or component (Living KORAL is explicitly cross-cutting and NOT Base Pilot scope — Registry 142 Section B's own heading), any data/migration/service/API/auth/RLS work (all explicitly N/A in the registry entry).

## 9. Deferred Living KORAL renderer boundary

**Confirmed: WP-047 does NOT require touching any deferred Living KORAL visual-renderer file.** Proof, structural and repository-level:
- The deferred renderer bucket (`renderer-types.ts`, `visual-grammar.ts`, `implicit-field.ts`, `morphology-engine.ts`, `svg-renderer.ts`, `mark-service.ts`, `app/api/company/living-koral/mark/route.ts`, `EditionsArchive.tsx`'s Mark UI diff) is **not even present in this clean worktree** — none of it was ever committed (confirmed: `lib/living-koral-mark/` in this worktree contains only the 8 committed neutral substrate files; the deferred files simply do not exist here).
- Living KORAL (`KORA-WP-111`–`119`) is explicitly labeled "CROSS-CUTTING CAPABILITY, NOT BASE PILOT SCOPE" in Registry 142's own Section B heading — none of its 13 packages carries `Pilot Status: BASE PILOT BLOCKER`, confirmed directly in Section K's own text.
- WP-047's own scope ("pilot-relevant accessibility/design/IA subset," "pilot-facing screens") is a Base Pilot concept; Living KORAL screens are, by Registry 142's own classification, outside Base Pilot scope entirely.
- If WP-047's own generic design-system/token/a11y remediation has downstream consequences for Living KORAL UI later (e.g., a future page adopting a remediated `Button.tsx`), that is acceptable per this task's own explicit instruction — it does not require, and must not become, a reopening of visual morphology/renderer work.

**No Round 6. No visual-renderer reopening. Confirmed.**

## 10. Security/accessibility implications

No security surface is touched (Registry 142: Auth/RLS N/A, Data/Migration Impact NONE). Accessibility is the entire deliverable — the exact baseline is already frozen and consistent across both governing sources (§3 above): WCAG AA contrast, 44×44px touch targets, focus-visible states, ARIA correctness, reduced-motion support, heading hierarchy, descriptive link text. A future implementation task should build the accessibility-audit test suite Registry 142 itself requires ("Tests: accessibility audit on pilot-facing screens") as a first-class, permanent addition — none exists today.

## 11. Validation plan (for the future implementation task, not performed here)

Targeted: a new accessibility-audit test suite exercising the exact baseline in `EXPERIENCE_LAYER.md` §6 against the confirmed pilot-facing screen set (once enumerated per §7 above); a hex-literal structural guard test over `components/ui/` and `components/layout/` (extending the existing anti-regression rule into an enforced test, matching this codebase's own established pattern of turning frozen-source rules into structural guard tests). Full repository regression (`npx vitest run`), `tsc --noEmit`, `eslint`. No RLS gate involvement expected (no auth/RLS surface touched), but the existing RLS gate suite should still be run as part of full regression per this project's own standing validation discipline.

## 12. Vercel applicability

**YES** — WP-047's own deliverable IS the UI (Registry 142: "UI: is the deliverable"), touching pilot-facing routes/components directly. After a future implementation + push, Vercel Preview verification will be required per this project's own established protocol. Since most Base Pilot screens require authentication (Company/Worker/Advisor/Admin roles), **authenticated runtime validation is expected for most of the affected surface** — the two `PUBLIC_ROUTES` (`/`, `/demo-guide`, per `EXPERIENCE_LAYER.md` §7) would not need an authenticated session, but the majority of pilot-facing screens (Company workspace, My KORA, Advisor, Admin) do. Build/deploy smoke (does the app build and deploy) is distinct from this authenticated-role accessibility verification and should be identified separately in the future implementation task, not conflated.

## 13. Downstream unlocks

Verified directly against Registry 142's own DAG line (Section C): `073:047` and `088:047` — both **`KORA-WP-073`** (Accessibility/IA Full Closure) and **`KORA-WP-088`** (Responsive/Design System Full Closure) list `KORA-WP-047` as their own *sole* Hard Dependency, with no other listed dependency for either. Both are themselves DAG leaves under WP-047 (no further WP lists either as its own Hard Dep, confirmed by scanning Section C's full edge list for any `:073` or `:088` occurrence beyond their own definitions — none found). This is a real, bounded, verified 2-WP unlock, exactly as report 190 claimed — independently re-confirmed here, not inherited.

## 14. Consolidation cadence

Accepted baseline: Audit 163, cadence reset to 0. Completed numbered advancements since: `111, 112, 113, 114, 115, 116` = **6**. `WP-117` remains OPEN (substrate stabilized, renderer deferred, canonical Acceptance unmet) and contributes **0** — confirmed unchanged by this pre-check task, which performed no numbered-WP advancement itself. `WP-047` would become advancement **#7** only upon its own full completion (not upon this pre-check). Threshold for the next formal consolidation audit: **10** (per Audit 163's own established trigger precedent). **6 < 10 — no consolidation audit is due before WP-047.**

## 15. GO / BLOCKED conclusion

**GO.** `KORA-WP-047` state: **READY**. Hard Dependency (`KORA-WP-010`) COMPLETE; no External Blocker; no Scope Trigger; no named Gate; no Founder/Product prerequisite outstanding. Frozen sources read, consistent, no conflict. Repository pre-check complete: substantial reusable infrastructure confirmed, real remediation gaps disclosed (6 hex-literal violations, zero a11y test coverage). No collision with the deferred Living KORAL visual-renderer bucket — structurally impossible in this worktree, and conceptually excluded by Registry 142's own Base-Pilot/cross-cutting classification. **Not implemented in this task, per explicit instruction.**
