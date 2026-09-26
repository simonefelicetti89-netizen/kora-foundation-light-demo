# 204 — KORA-WP-088 Final Design-System Closure — Implementation

**`KORA-GAP-DESIGN-001`: CLOSED.**
**`KORA-GAP-RESPONSIVE-001`: EVIDENCE_BLOCKED** (code complete; authenticated runtime evidence unobtainable).
**WP-088: PARTIAL / VALIDATION-BLOCKED** — solely because credentials are unavailable, per the Founder's own rule.

Commits `a1ad285` · `e4884cc` · `419e772` on `feature/wp088-responsive-design-system-full-closure`. Not pushed.

**Presentation colour literals: 1,967 → 76, and all 76 remaining are `#FFFFFF`. Non-white presentation literals: zero.**

---

## 1. Founder final colour adjudication

Applied verbatim, recorded durably in the canonical token source header and asserted by test so it cannot be silently reinterpreted.

| | Decision | Applied as |
|---|---|---|
| **Q1** | Informational / in-process / link — base `#3B6EBA`, on-tint text `#1E4A8A`. A **semantic functional blue**; not a pillar, maturity, performance or primary brand colour. | `TOKENS.info` + `BADGE_TOKENS.info` |
| **Q2** | Solid ink-button hover `#1A1756`. No redesign. | `BUTTON_TOKENS.ink.hover` |
| **Q3** | Recessed inset panel `#FFFAF5`, kept distinct from `TOKENS.surface`, not generalised beyond that role. | `TOKENS.insetPanel` |
| **Q4** | Macroblock series ratified as **categorical differentiation only** — REACH `#3B6EBA`, QUALITY `#2F7D55`, EQUITY `#7C3D8F`, BTI `#C07D2A`. Never pillar, status, performance or general-purpose accent. | `MACROBLOCK_COLORS` |
| **Q5** | KORA lime `#C8FF47` **not** promoted. In-app badges → `BADGE_TOKENS.synthetic`. Lime confined to the Decision Pack export. | no token |

The warm KORA brand system remains canonical. `#3B6EBA` is admitted as a *functional* colour, not a brand colour — the token file says so explicitly, and a test asserts the wording.

## 2. Semantic tokens introduced

**Exactly four concepts — the number the Founder expected. No fifth family was needed, so there is nothing to STOP on.**

`TOKENS.info` (base/text/bg/border) · `BUTTON_TOKENS.ink` · `TOKENS.insetPanel` · `MACROBLOCK_COLORS`. `BADGE_TOKENS.info` is the same Q1 values in the badge triad shape this group already uses, not a fifth concept.

Each is mirrored in `app/globals.css` as a CSS custom property **and registered in `@theme inline`**, so Tailwind v4 generates real utilities (`bg-kora-ink`, `text-kora-info`, `hover:bg-kora-ink-hover`) with native opacity-modifier support. That registration is what made the class-string half of the debt resolvable without `var()` hacks — the single most important mechanical finding of this pass.

## 3. Info / link closure

109 hex occurrences across 48 files, plus the `rgba()` forms the ratchet never counted, now resolve through `TOKENS.info` / `BADGE_TOKENS.info` / the `kora-info` utilities. 18 distinct blues collapse to one family at three depths. Zero remain.

## 4. Button-hover closure

24 `hover:bg-[#1a1756]` occurrences across 12 files → `hover:bg-kora-ink-hover`. Zero remain.

## 5. Inset-surface closure

30 `#FFFAF5` occurrences across 18 files → `TOKENS.insetPanel` / `bg-kora-inset-panel`. Zero remain. The dashed-`inkBorder` treatment that defines the role is unchanged.

## 6. Macroblock palette closure

`WallboardClient.tsx`'s inline mapping now reads `MACROBLOCK_COLORS`. The score-band helper that returned `'#C07D2A'` was **not** routed to `MACROBLOCK_COLORS.BTI` — it is a performance band, which the Founder explicitly excluded from macroblock semantics — it now uses `TOKENS.warning`. A test asserts `#7C3D8F` and `#C07D2A` never reappear as literals anywhere, so the categorical values cannot leak back out as general-purpose accents.

One consequence disclosed: `#7C3D8F` also served as the `company_extended` category in the Commons opening-grade scale (`lib/commons/types.ts`, `InitiativesMap.tsx`). Since it is now reserved to EQUITY, that third category was remapped to `TOKENS.accent` — a general-purpose accent, which is exactly what a category marker may use.

## 7. KORA lime decision

Not promoted. The 6 in-app occurrences (two "Synthetic data only" / "No operational actions" badges) now use `BADGE_TOKENS.synthetic` — semantically exact, since that token *is* the synthetic-data badge. A test asserts `#C8FF47` is never defined as a token value and never appears in `app/` or `components/`. The Decision Pack export template is untouched.

## 8. Residual pillar fixes

**Zero local pillar palettes remain anywhere.** The two the audit found are fixed:

- `app/admin/preview/worker/dynamic-cv/page.tsx` — bound `LIFE` to `TOKENS.success` (green) with `GROWTH #3B6EBA`, `CONNECTION #7C3D8F`, `IMPACT #C07D2A`, `LEGACY #5A4A3F`. Now `PILLAR_COLORS` throughout; its status map uses `TOKENS.success` / `TOKENS.info.base` / `TOKENS.warning`.
- `app/worker/onboarding/_flow.tsx` — `LIFE #16a34a`, `GROWTH #2563eb`, `CONNECTION #9333ea`, `IMPACT #dc2626`, `LEGACY #ca8a04`. Now `PILLAR_COLORS`. This is the first screen a worker sees, and it was teaching the wrong pillar identity.

Report 202's "24 of 24" should be read as **26 of 26** after this pass.

## 9. Violet-residue fixes

Shipped defects, removed rather than excepted:

- **13 terracotta primary buttons that turned violet on hover** (`bg-[#C76F3D] … hover:bg-[#4f44e0|#4d48d0|#4a41d4|#4b40c8|#4d43d4|#a55a2e]`) → `hover:bg-kora-accent-hover` (`#B5602E`, already canonical in `BUTTON_TOKENS.primary.hover`).
- **43 selected-card surfaces and borders still tinted violet** under a terracotta border (`border-[#C76F3D] bg-[#f5f4ff]`, `border-[#c7c4f8]`) → `bg-kora-accent/8` and `border-kora-accent/25`.
- Remaining violet-family inline values (`#4d3d9e`, `#3d3a6a`, `#9899b3`, `#c7c8dc`, `#eaebf4`, …) → `TOKENS.violet` / the ink scale / `TOKENS.accentSoft`.

**Additionally, and not previously reported: 15 malformed Tailwind classes that predate WP-088** (present in the `4844e27` baseline) — `bg-[rgba(217,154,43,0.08)]0`, `bg-[rgba(47,125,85,0.08)]0`, `divide-[rgba(6,3,43,0.05)]50` and an escaped `'text-\[#2F7D55\]'`. Tailwind silently drops classes it cannot parse, so the status dots, progress bars and chips these styled have been rendering **colourless in production**. All 15 repaired to the correct token utility, and a guard now fails on either malformation.

## 10. ImpactUnitsExplorer scope adjudication

**Classification: `PRODUCT_SURFACE_IN_SCOPE`.** Determined mechanically, not by preference:

1. **Owner** — `app/admin/impact-units/page.tsx` → `./_components/ImpactUnitsExplorer`.
2. **Reachable in a shipping role environment** — YES. Registered in the canonical KORA Admin navigation at `lib/navigation/admin-nav-groups.ts:50`, "Operations" group, label "Impact Units".
3. **Customer/admin-facing Product UI** — YES. Server-guarded by `requireKoraAdmin()`, listed in `lib/permissions/index.ts`, backed by its own API route `app/api/admin/impact-units/route.ts`. It renders the IU trace layer for operators.
4. **Development/debug tooling** — NO. Nothing marks it internal, experimental or Future Vision; it is not behind a flag.
5. **Registry-142 / WP-088 scope** — IN. It is an authenticated KORA Admin surface, exactly what RESPONSIVE-001 and DESIGN-001 name.

**Action: normalised (option A), not excluded.** This was not a cosmetic preference. Its root container set `color: '#e2e8f0'` (near-white) with **no background of its own**, while `body` is `var(--kora-canvas)` `#EFEBE2` warm ivory — so every piece of text outside a card was near-white on ivory, roughly 1.1:1 contrast. That is a shipped accessibility defect on a product surface, and excluding the file would have preserved it.

All 75 literals re-expressed level-for-level so the functional information hierarchy is preserved exactly: primary text → `ink`, secondary label → `inkSecondary`, tertiary → `inkTertiary`, meta → `inkHint`, rules → `inkBorder`, panel → `surface`, recessed expansion panel → `insetPanel`, IU accent → `info.base`, and the success/warning/critical/violet KPI accents to their canonical semantic tokens. No structural, functional or data change.

## 11. Presentation-literal final counts

| | Before | After |
|---|---|---|
| Presentation colour literals (in scope) | **1,967** | **76** |
| …of which non-`#FFFFFF` | 1,890 | **0** |
| Files carrying one | 182 | 41 |
| Tailwind arbitrary-value hex classes | 1,107 | **0** |
| Local pillar palettes | 2 | **0** |
| Violet-residue defects | 56 | **0** |
| Malformed/dead Tailwind classes | 15 | **0** |

Reconciliation against report 203's A–E classification: **A 1,695 eliminated · B 174 eliminated · C preserved · D preserved · E 76 eliminated (normalised, not excluded).**

## 12. Explicit valid exceptions

Closed and enumerated — not an allow-list that can widen.

- **`#FFFFFF` — 75 occurrences in guard scope, ratcheted.** It is not a KORA palette colour; it is the CSS universal constant. Decisively, **the canonical token source itself spells it literally** (`BUTTON_TOKENS.primary.color`, `CHART_COLORS.tooltipText`) rather than tokenising it — so a component literal follows canon rather than breaking it, and class strings already use Tailwind's own `text-white`. Inventing a token for it would add naming, not meaning. *If the Founder prefers zero literals of any kind, a `TOKENS.onDark = '#FFFFFF'` alias would close it mechanically; it was not created because the Founder capped new semantic concepts at four and white introduces no new colour.*
- **4 HTML numeric character entities** — `&#128274;` (🔒) and `&#128279;` (🔗) in four privacy/CV surfaces. Not colours at all; the `/#[0-9A-Fa-f]{6}/` shape matched them by accident. Now stripped before counting.
- **15 occurrences inside comments** — docs/30's supersession record, `KoraLogo`'s variant note, `app/page.tsx`'s historical pillar note, `Sidebar`'s contrast note. Documentation naming a colour in prose is not a presentation literal; comments are stripped before counting.
- **Exempt paths — pinned by equality**, so widening the set is a visible test edit: the token source, `globals.css`, the three scoped public-surface CSS modules, and the Decision Pack export template. Plus the standing Living KORAL and Future Vision exclusions.
- **`components/brand/KoraLogo.tsx` (D)** — 1 literal. Brand-asset regeneration is excluded from WP-088 by Founder instruction.
- **`app/global-error.tsx` is NOT excepted** — it was fully remediated and now uses token imports, which survive a root-layout crash (only CSS variables would not).

## 13. E2E preparation

No credential fabricated, stored or committed. Readers and runner configuration only.

- `tests/e2e/helpers/env.ts` — `getWorkerCredentials()`, `getPartnerCredentials()`, `getAdvisorCredentials()`, same contract as the GOLDEN-02 readers: `process.env` only, never returns or logs a raw secret, missing → `null` → caller skips.
- `tests/e2e/helpers/roles.ts` — `ROLE_HOME` extended with WORKER and PARTNER from the app's own `getRoleHome()`. ADVISOR is stated separately as `ADVISOR_HOME = '/advisor'` because `role-home.ts` deliberately fails closed for it; `lib/permissions` grants the route tree.
- `playwright.config.ts` — `mobile-375` / `tablet-768` / `desktop-1440` projects, scoped by `testMatch` to the new spec alone, with `testIgnore` on `chromium`, so the GOLDEN suites do not triple in runtime.
- `tests/e2e/responsive-viewports.spec.ts` — 5 role environments × 3 viewports = **15 cases**, asserting the WP-088 contract: no horizontal overflow; below `md` an accessible 44px drawer toggle with `aria-expanded` and Escape-to-close; at `md`+ the persistent column and no mobile toggle. Every case skips explicitly without credentials.

`npx playwright test --list` confirms the configuration resolves: 34 tests across 7 files, the 15 new cases correctly distributed across the three viewport projects, existing specs unduplicated.

**Correction to report 203 §8 item 4:** the right unblocking path for a Preview host is `E2E_ALLOWED_STAGING_HOSTS`, not `E2E_ALLOW_PRODUCTION=true`. `tests/e2e/helpers/e2e-safety.ts` (B174-A3c) deliberately makes `E2E_ALLOW_PRODUCTION` insufficient on its own and requires the operator to name the host. That is stronger and is the path to use.

## 14. Tests

`tests/unit/kora-wp-088-responsive-design-system.test.ts` — **48 guards** (was 35). The ratchet is replaced by a **closure guard**: any in-scope presentation literal other than `#FFFFFF` now fails outright. New groups cover the Q1–Q5 adjudication (including the EQUITY/BTI leak check and "exactly four new concepts"), the malformed-class check, the pinned exempt set, and the E2E preparation including an assertion that no credential value is committed.

`tests/unit/p0-hotfix-navigation-contrast.test.ts` — one assertion moved from the raw `'#22c55e'` literal to `BADGE_TOKENS.eligible.text`. A **strengthening**: the literal check would still have passed for a hardcoded design-system violation; the token check also enforces the token rule. The file genuinely uses the token, verified. No assertion weakened or deleted.

## 15. Security / RLS

Mandatory gate: **5 files, 423 passed, 0 failed.** No auth, RLS, API, domain-service or migration change in this pass.

## 16. Full regression

`npx vitest run`: **416 files, 13,310 passed, 325 skipped, 5 todo, 0 failed.**

## 17. tsc

`npx tsc --noEmit -p .`: **0 errors.**

## 18. eslint

`app/` + `components/`: **0 errors, 24 warnings** — byte-identical to the pre-WP-088 baseline. Every file created or modified outside those trees (`lib/design/`, `tests/e2e/`, `playwright.config.ts`, the WP-088 spec) lints **completely clean, 0 problems**.

## 19. KORA-GAP-DESIGN-001

**CLOSED.** Proven against each of the gap's own criteria, not by grep count:

- Founder colour adjudication applied — both passes, recorded in the token source and asserted by test.
- Pillar conflict resolved — zero local pillar palettes remain in the codebase.
- Canonical token source established **and enforced** — a closure guard, not a tolerance.
- In-scope presentation-token debt closed — 1,967 → 76, all 76 `#FFFFFF`, zero non-white.
- Reusable design-system families satisfied — all ten verified present and token-driven; dialogs/modals confirmed genuinely absent (nothing to close).
- Exceptions explicitly classified — §12, each with a stated justification and a mechanism that prevents silent growth.

## 20. KORA-GAP-RESPONSIVE-001

**EVIDENCE_BLOCKED.** The code implementation is complete and was not touched in this pass; the runner that produces the acceptance evidence now exists and resolves. What is missing is not code but five sets of credentials, which cannot be fabricated.

## 21. WP-088 status

**PARTIAL / VALIDATION-BLOCKED.** One ground only, and it is the Founder's own rule: authenticated multi-viewport validation has not run. DESIGN-001 — the second ground in report 202 — is now closed.

## 22. Git status

Clean. Six local commits on `feature/wp088-responsive-design-system-full-closure` (from `4844e27`); this pass added three:

- `a1ad28565662a36ddbdee57f2ae49c26efa4faad` — ratify the four adjudicated semantic colour slots
- `e4884ccf20931e257f1afb96bc9ace980b496551` — close the presentation-literal debt against the ratified tokens
- `419e772ebe52420acddb12e8068c12971edc5536` — closure guard + multi-viewport E2E preparation

173 files changed in this pass; 204 across WP-088 in total. Not pushed. Staging and production untouched. Consolidation cadence remains **8**.
