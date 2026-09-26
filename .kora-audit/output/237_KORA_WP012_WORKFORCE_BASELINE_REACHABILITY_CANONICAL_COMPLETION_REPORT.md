# 237 — KORA-WP-012 — Access-Path Correctness Fix: `workforce-baseline` Reachability — CANONICAL COMPLETION REPORT

**Date:** 2026-09-21
**Package:** `KORA-WP-012` — Access-Path Correctness Fix — `workforce-baseline` Reachability (I0, BASE PILOT NON-BLOCKER)
**Status transition:** `KORA-WP-012` **READY → COMPLETE**
**Founder ruling applied:** **READING A — SURFACE** (2026-09-21)
**Founder Visual Acceptance:** **GRANTED — 2026-09-21**
**Commit:** `ddf3e9077ae68ff47937f49ddd46be060c768f1f` — LOCAL ONLY, **NOT PUSHED**
**Parent:** `0bc14f6e484110ce65be8aa0c185a68208057359` (`KORA-WP-125`, accepted shared Product Experience foundation)
**Worktree / branch:** `/Users/simonefelicetti/KORA-wp012-worktree` · `feature/kora-wp-012-workforce-baseline-access-path`

---

## 1. THE FOUNDER RULING — READING A / SURFACE

The canonical defect is **UNDER-REACHABILITY OF A REAL ADMIN PRODUCT CAPABILITY**. It is **not** duplicate
capability. The remediation is therefore to **restore normal Admin Product reachability** to
`/admin/companies/workforce-baseline`.

**Binding interpretation, recorded to prevent future reinterpretation of WP-012 as a route deletion:** the
acceptance sentence *"exactly one canonical `workforce-baseline` path remains reachable"* binds at the
**CAPABILITY-OWNERSHIP level**. It does **not** mean that only one URL may consume workforce-baseline
capability. No route was deleted by this package, and none may be deleted on the strength of that sentence.

### Source-conflict resolution

The precheck surfaced a genuine contradiction between two canonical sources, escalated rather than silently
reconciled (CLAUDE.md §8/§18), and resolved by the Founder:

| Source | Statement |
|---|---|
| `39_RESIDUAL_CODE_TRUTH_CLOSURE` (UNK-06), `41`, `45` (ADMIN-022) | "real live page … **No inbound `<Link>`** … REACHABLE ONLY OUT-OF-BAND (KORA_ADMIN direct URL); baseline write path reachable elsewhere" |
| **`46_GLOBAL_GAP_MATRIX` (ADMIN-022) — the remediation definition** | "Real page, no inbound nav (UNK-06); **add a nav link or confirm out-of-band**" · Risk: "Real capability unreachable in-app" · Owner: "**product-owner decision**" |
| Registry `219`/`102` (WP-012 row) | "Contract only (**one duplicate route removed**)" · "Service/API: one route deprecated" · "UI: **one page removed**" |

**Founder choice: "add a nav link."** Registry `219`/`102`'s summary wording is explicitly **not** authority to
delete unique capability. Repository truth supported this: the orphaned page is the **only** surface rendering
baseline threshold validation and the N≥10 aggregate-group view — `TenantOnboardingPanel` and
`CompanyWorkspacePanel` render neither.

### Why the link was missing at all (git evidence)

`f00346b` (2026-05-24, SaaS-boundary correction) created the page **and** its Admin nav entry. `acb3a73`
(2026-06-01, B9.2 sidebar restructure) deleted the whole "Aziende Cliente" group and took this entry with it
**as a side effect**. No decision ever retired the page.

---

## 2. CANONICAL WORKFORCE-BASELINE OWNERSHIP (final map)

| Surface | Role |
|---|---|
| `/admin/companies/workforce-baseline` | **Canonical Admin inspection / validation surface** (this package) |
| `/admin/tenants` (`TenantOnboardingPanel`, `PilotOnboardingChecklist`) | Legitimate onboarding / write workflow |
| `/admin/companies/[companyId]/workspace` (`CompanyWorkspacePanel`) | Legitimate per-company write workflow |
| `/company/workforce-baseline` | Intentional Company-side SaaS-boundary notice (`f00346b`), zero baseline capability |
| `app/api/admin/workforce-baseline/route.ts` | Canonical shared API (GET list · GET per-tenant · POST upsert) |
| `lib/live/workforce-baseline*.ts` | Canonical persistence / business path (`persistWorkforceBaseline`, N≥10 enforcement) |

**No legitimate workflow was removed.**

---

## 3. RESTORED NAVIGATION

One destination added to the **existing** Companies group in `lib/navigation/admin-nav-groups.ts`:

- **Label:** `Workforce Baseline`
- **Route:** `/admin/companies/workforce-baseline`
- **Group:** existing `companies` group — the historical "Aziende Cliente" group was **not** recreated

Two consequences, both accepted: the route now resolves its **own** chrome context (breadcrumb
*Companies › Workforce Baseline*, via `resolveRouteContext`'s longest-match rule, instead of borrowing "All
Companies"), and it carries a **distinct rail glyph** (`components/layout/nav-icons.tsx`, presentation-only) so
the Companies group is navigable by shape rather than showing three identical `Building2` marks — the exact
failure that map's own invariant exists to prevent.

---

## 4. WP-125 VISUAL REMEDIATION

Making the route reachable exposed a legacy page interior below the accepted WP-124/WP-125 level. Founder
Visual Acceptance was withheld, the surface was recomposed, and acceptance was then granted.

**Accepted semantic composition:**

| Region | Content |
|---|---|
| **PRIMARY — Baseline corrente / validazione** | worker count, verdict `Status`, the reason sentence (count vs threshold, named period), `MetricStrip` (soglia minima azienda · soglia gruppo N≥ · periodo), `Facts` provenance (`createdAt`/`createdBy`) |
| **SECONDARY — Azienda cliente** | canonical selection rows (company name, tenant code, baseline-presence `Status`, violet selected state, `aria-pressed`) — behaviour identical to before |
| **TERTIARY — Gruppi aggregati per dimensione** | dimension chips as real controls, summary line, group rows with count, share and bar; three designed states (no baseline / no dimensions / all clusters suppressed) |
| **SUPPORTING** | privacy rule (`Notice`), related Product paths |

Consumes `PageHead, Workspace, Col(main|rail), Region, Metric, MetricStrip, Facts, Status, Chip, Notice,
StateBlock, SkeletonRows` + `PX` tokens. **No** page-local design system, token file, stylesheet or `@media`
rule; the 1100/768 single-column stack is WP-125's own `≤1200px` rule (`globals.css:490`), inherited.

---

## 5. `department` / `departments` CORRECTNESS FIX

**Defect:** `useState<string>('department')` — a hard-coded **singular** default that the canonical writer never
produces (`route.ts:133` emits `{ departments: … }`). The first render therefore reported
*"Nessun gruppo visibile per questa dimensione"* while the baseline held a group.

**Fix:** the visible dimension is **derived** from the dimensions the API returned —
`effectiveDimension = activeDimension ∈ dimensionKeys ? activeDimension : dimensionKeys[0] ?? ''` — and
`dimensionLabel()` resolves a stored key against the label map in either number. An explicit user choice still
wins; a stale one falls back to real data.

**Proved on the real route, zero clicks:** group label visible `true`, false-empty message `false`.

**No change to** schema, API payload, writer, persistence or RLS.

---

## 6. DISPLAY-ONLY LABEL NORMALIZATION

Stored data may contain the misspelled group label `organisazione` (written by the canonical POST path). The
surface renders `organizzazione` through an explicit presentation-boundary correction — a fixed one-entry list,
never a spelling engine; every other label renders verbatim. Applied at both render points (row label and the
bar's accessible name).

**Stored data, POST behaviour, API semantics and writer semantics are unchanged** — a guard asserts the API
route still contains the raw value, so any future rewrite of the source fails a test rather than passing silently.

---

## 7. ADMIN INTAKE LINK CORRECTION

The stale cross-role destination `KORA Intake Engine™ → /company/ingestion` — a Company-portal route exposed
inside a KORA Admin workflow — was retired **from this surface**. The related intake path now resolves **href and
label** from canonical Admin navigation truth (`ADMIN_NAV_GROUPS`): **`Submission Queue` → `/admin/data-intake`**,
confirmed against `lib/navigation/admin-nav-groups.ts:55`, pinned by `b169`, route present. Resolving rather than
duplicating means the link cannot drift from the Product's own terminology. **Company Registry remains present.**

---

## 8. PRIVACY / SECURITY / BUSINESS INVARIANTS — UNCHANGED

Aggregate-only workforce presentation · N≥10 group suppression semantics · minimum company threshold · minimum
group threshold · no individual worker data (guard forbids `worker_id`, `pseudonym`, `email`, `PIB` on this
surface) · KORA_ADMIN authorization via the existing `app/admin/layout.tsx` contract · origin protections ·
existing GET/POST API semantics · workforce-baseline persistence · RLS · onboarding behaviour ·
CompanyWorkspace behaviour.

The page remains **read-only**: no POST, no `persistWorkforceBaseline`, exactly the two pre-existing GET reads.
Thresholds and verdict are consumed from the view, never recomputed locally. **WP-012 changed no business logic.**
No migration was added — **089 remains the highest**.

---

## 9. INTENTIONAL TEST-MECHANISM SUPERSESSIONS

Both classified **INTENTIONAL TEST-MECHANISM SUPERSESSION — SEMANTIC GUARANTEE PRESERVED / MADE MORE PRECISE**.

**A. `kora-wp-125-shared-product-experience-foundation.test.ts`** asserted that WP-125's own diff added no Admin
destination. A later legitimate destination now exists. The guard **names exactly** `/admin/companies/workforce-baseline`
rather than loosening the matcher, so any **other** addition after WP-125's baseline still fails.

**B. `b95c-workforce-navigation.test.ts`** banned any sidebar href containing `/workforce`, guarding the B169
"Workforce Management" drill-in retirement. That mechanism over-matched an unrelated live surface B169 never
governed. The baseline href is excluded **by exact constant**, and a **new** assertion pins the retired
destination's continued absence — the invariant is now pinned more precisely than before.

No auth, privacy or business semantics were weakened.

---

## 10. FINAL VISUAL EVIDENCE

Real authenticated Product, real local Docker Supabase, real KORA_ADMIN session, real canonical fixture written
through the canonical POST (128 workers). No interception, no mock, no reconstructed HTML. Session installed with
the repository's own documented mechanism (`tests/e2e/helpers/local-session.ts`) because the app CSP `connect-src`
allows only `https://*.supabase.co`.

| Evidence | Result |
|---|---|
| 1440 · 1100 · 768 · 375 | **PASS** — accepted composition, doc heights 1035 / 1507 / 1564 / 1995 |
| Responsive composition | **PASS** — overflowX `false` at every capture, zero console/page errors |
| WP-125 Product Experience consistency | **PASS** |
| Empty state (tenant without baseline) | **PASS** — designed block, onboarding status, real action, rail still usable |
| First-load aggregate correctness | **PASS** — group visible with zero clicks |
| Display label `organizzazione` | **PASS** |
| Canonical Admin `Submission Queue` destination | **PASS** — `/admin/data-intake`, zero `/company/ingestion` links |
| Restored Admin reachability | **PASS** — exactly one nav anchor, click-through verified, drawer verified |

---

## 11. FINAL VERIFICATION (re-run at closure, not carried forward)

| Gate | Result |
|---|---|
| Focused set (15 suites: WP-012, workforce-baseline route + view, `b169`, `b95c`, WP-073 IA, WP-125, company boundary, tenant classification, `b162`, `b75b`, `b105`, origin guard, route privacy, RLS-13 parity) | **758 passed · 4 skipped · 0 failed** |
| Full Vitest | **421 files · 13478 passed · 325 skipped · 5 todo · 0 failed** |
| `tsc --noEmit` | **exit 0** |
| ESLint (changed files) | **exit 0, clean** |
| `next build` | **compiled successfully** |
| Staged secrets scan | **clean** |

---

## 12. CHANGED-FILE SCOPE

| File | Change |
|---|---|
| `app/admin/companies/workforce-baseline/page.tsx` | recomposed on WP-125; dimension derivation; display normalization; intake link |
| `lib/navigation/admin-nav-groups.ts` | +1 destination |
| `components/layout/nav-icons.tsx` | +1 presentation-only glyph |
| `tests/unit/kora-wp-012-workforce-baseline-reachability.test.ts` | **NEW** — 41 guards |
| `tests/unit/kora-wp-125-shared-product-experience-foundation.test.ts` | mechanism update (§9A) |
| `tests/unit/b95c-workforce-navigation.test.ts` | mechanism update (§9B) |

6 files, +825 / −185. Verified untouched: `/admin/companies` and its components, `app/api/**`, `supabase/**`,
`middleware.ts`, `lib/auth/**`, `lib/live/workforce-baseline*`, `app/company/workforce-baseline`, `CLAUDE.md`,
`.kora-audit/**`. No screenshots, fixtures, scratch artefacts or ignored governance files were committed.

---

## 13. EXPLICITLY NOT DONE

- **No repository-wide `Foundation Light` retirement** and **no commercial-package / journey / entitlement
  architecture** — the Founder has deferred that strategic analysis until after the core KORA implementation is
  complete. No WP was created for it, no WP number assigned, no registry sequencing changed, and no commercial
  semantics were inferred. The stale `Foundation Light` presentation elsewhere (notably `/admin/companies`)
  remains a **separate known Product issue** that this closure does **not** claim to have solved.
- **`/admin/companies` was not modified**; its legacy visual/Product presentation remains outside WP-012.
- No Gate 3 action, no production action, no schema/RLS change, no scope trigger activated.

---

## 14. COMMIT INTEGRITY

| Check | Result |
|---|---|
| Commit | `ddf3e9077ae68ff47937f49ddd46be060c768f1f` |
| Parent is `0bc14f6e…` (WP-125) | **YES** |
| `KORA-WP-039` `02cf4349…` ancestor? | **NO** (sibling) |
| `KORA-WP-048` `b257d264…` ancestor? | **NO** (sibling) |
| `KORA-WP-063` `da62e766…` ancestor? | **NO** (sibling) |
| Gate 3 `0cdc7e0d…` ancestor? | **NO** |
| Commits beyond baseline | **exactly 1** |
| Worktree after commit | **clean** |
| Upstream configured / pushed | **NO — local only** |

---

## 15. REGISTRY 219 CONSEQUENCES — DERIVED, NOT ASSUMED

- **`KORA-WP-012` READY → COMPLETE.** Founder Visual Acceptance PASSED 2026-09-21. Its READY precondition was
  structural: `012` is a true DAG root with **no Hard Deps and no Conditional Deps**.
- **Nothing is unlocked.** Section C's edge list contains no package whose Hard Deps include `012` — its only
  appearance is its own row `012:—` — and Section D contains no conditional edge referencing it. Zero dependents.
- **New aggregate: COMPLETE 60 · READY 32 · BLOCKED 33 · TOTAL 125.**
- **Graph invariants unchanged:** 197 hard edges, 5 conditional edges, 4 scope triggers, 0 cycles, 0
  self-dependencies, 0 missing dependency references.

---

**`KORA-WP-012` is COMPLETE. Founder Visual Acceptance GRANTED. One local commit. Not pushed.**
