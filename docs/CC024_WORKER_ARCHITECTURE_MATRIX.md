# CC-024 — Worker Architecture Matrix

**Status:** Analysis + governance artifact. Produces the evidence D-D requires. **Does not ratify D-D.**
**Date:** 2026-09-06
**Workstream:** Worker Surface Architecture (post-CC-00)
**Decision this feeds:** D-D — Canonical Worker Surface
**Authority:** `docs/KORA_OFFICIAL_IMPLEMENTATION_MASTER_PLAN_v2.1.md` line 480/482/808/869 (CC-024 requirement); `lib/architecture/registry.ts` `app-surface.worker` / `app-surface.my-kora` / `svc.my-kora-preview` (current neutral status, `decisionRef: 'CC-024 / D-D'`)

---

## 1. Scope

CC-00 (B-TRUTH / ONE PRODUCT, ONE TRUTH) deliberately excluded the worker surface from its own consolidation scope — Master Plan §13 never names `/worker` or `/my-kora`, and every CC-00 slice that touched worker-adjacent code (PR #155's audit, PR #158's Final Scoring Canonicalization) explicitly deferred the "which surface is canonical" question to **D-D**, gated on **CC-024**, an architecture matrix that — per the read-only CC-024/D-D Decision Gate immediately preceding this task — has never actually been built. This document builds it.

**This document does not decide D-D.** It produces the evidence, a scored comparison, a salvage map, a target architecture sketch, and a draft decision text for the founder to ratify or amend. No runtime code, auth, or synthetic service is touched.

---

## 2. Evidence base

Primary sources (all re-verified against current `main`, 2026-09-06, `MAIN_SHA` recorded in the accompanying PR):

- `app/worker/**` (12 routes), `app/worker/layout.tsx`, `middleware.ts`'s `WORKER_ALLOWED_PREFIXES`
- `app/my-kora/**` (9 routes), `app/my-kora/layout.tsx`, `app/my-kora/_providers/WorkerSessionProvider.tsx`, `MyKoraDemoGate`
- `app/api/worker/**` (18 real, `requireWorkerUser`-gated API routes)
- `lib/worker-identity/` (types, `worker-context.ts`)
- `services/worker-provisioning/`, `services/worker-achievements/`, `services/account/AccountProvisioningService.ts` (the 3 B-WORKER-owned synthetic residuals, unchanged since CC-00's ratified transfer)
- `services/my-kora-preview/MyKoraPreviewService.ts`, `services/worker-pib/`, `services/worker-attribution/`, `services/worker-opportunity/`
- `docs/worker-identity-architecture.md` (2026-06-07, predates `/worker`'s build — see §4)
- `docs/PILOT_SAAS_READINESS.md` item 5 (2026-07-04, MYKORA-01) — the same open question, already flagged once
- `lib/architecture/registry.ts`'s `app-surface.worker`/`app-surface.my-kora`/`svc.my-kora-preview` entries

No line-count proxy is used for quality anywhere in this document (Master Plan's own explicit instruction — "dodici dimensioni, non il conteggio righe").

---

## 3. The 12 dimensions

The Master Plan requires 12 dimensions but never enumerates them. Derived from D-D's own stated scope (line 482: real auth, survey assignments, authenticated submissions, worker identity, individual-response privacy boundary, evidence→NeedObservation pipeline, opportunities, activity discovery, booking, Dynamic CV, KORA Link) plus the structural concerns any consolidation decision must weigh:

1. Real authentication / session model
2. Canonical worker identity
3. Canonical data / runtime dependence
4. Synthetic / demo dependency (inverse of #3, scored separately because a surface can be *architecturally* canonical-capable while still *currently* synthetic-heavy in practice)
5. Privacy and individual-response boundary
6. Worker Listening readiness (structural compatibility only — no Listening code exists anywhere yet)
7. Evidence → NeedObservation pipeline readiness (same caveat — NeedObservation doesn't exist as a canonical object yet)
8. Opportunities / activity discovery
9. Booking / activation
10. Dynamic CV / development continuity
11. KORA Link integration
12. UX / product continuity under the My KORA brand

`DIMENSION_COUNT = 12`

---

## 4. Critical context: two documents, two eras

`docs/worker-identity-architecture.md` (2026-06-07) is this project's own canonical worker-identity target-architecture document. It was written **before `/worker` existed** — at that time, "My KORA" was the only conceived worker surface, and the document's own epigraph says: *"Foundation Light implements PREVIEW mode only. No real worker identities exist. All My KORA data is synthetic persona data. This document defines the canonical target architecture for future implementation."* Its route tree (§ Architecture Diagram) lists only `/my-kora/*` paths. It never mentions `/worker` — because `/worker` (B104 onward) was built afterward, as a **separate, parallel effort**, and has since independently implemented much of what this document envisioned as "Pilot+" for My KORA: a real `worker_kora_id`-rooted identity, UEF-sourced Dynamic CV, employer-blocked PIB.

This matters for D-D: the *conceptual* canonical worker-identity architecture is already substantially realized — just via `/worker`'s codebase, not `/my-kora`'s, and not under the "My KORA" name. Neither surface should be read as "the one the architecture doc mandates" — the doc predates the fork.

`docs/PILOT_SAAS_READINESS.md` (2026-07-04, MYKORA-01) already flagged this exact question once, in almost identical words to this task's own framing: *"`/my-kora` (PREVIEW) and `/worker` (LIVE) are still two separate route trees with overlapping worker-facing purpose — documented as an intentional distinction this sprint, not merged. A future sprint should decide whether to unify them once My KORA is promoted beyond PREVIEW."* That was 2+ months before this analysis. No resolution was recorded between then and now.

---

## 5. Matrix

Scale: 0 = absent/incompatible · 1 = prototype/demo-only · 2 = partial/mixed · 3 = production-capable with bounded work · 4 = canonical-ready.

| # | Dimension | `/worker` | `/my-kora` | Evidence | Confidence | Winner |
|---|---|---:|---:|---|---|---|
| 1 | Real auth/session | **4** | 2 | `/worker/layout.tsx`: `getCurrentWorkerUser()` server-side gate, hard-blocks `KORA_ADMIN` explicitly (defense-in-depth layer 2). `/my-kora/layout.tsx`: real server-side admission exists (`getSessionKoraRole()`, WORKER/KORA_ADMIN admitted, any other real role hard-blocked) but is explicitly "defense in depth for direct navigation... not the primary route for authenticated workers" — `middleware.ts`'s `WORKER_ALLOWED_PREFIXES` keeps real workers on `/worker/*` by default. What's missing for `/my-kora`: it would need to become the *primary* routing target, not a fallback path. | HIGH | **WORKER** |
| 2 | Canonical worker identity | **4** | 3 | `personal.worker_identity` is read directly by `app/worker/workspace/page.tsx` and by 6 shared `/api/worker/**` routes (`dynamic-cv`, `commons/bookings`, `pib`, `pib/redistribute`, `profile`, `onboarding`). `/my-kora` has zero direct references, but 6 of its 9 routes (`page`, `bookings`, `collective`, `dynamic-cv`, `kora-space`, `personal-impact-balance`) call those *same* API routes client-side, transitively reaching the same canonical identity when a real session exists. What's missing for `/my-kora`: the presentation layer is still built around `useRole()`/`usePersona()` (demo-state) as its primary identity model, with the real fetch as a secondary "is this actually live?" check. | HIGH | **WORKER** (narrowly — the data layer is already shared) |
| 3 | Canonical data/runtime | **4** | 2 | `/worker`: zero `data/synthetic/**` imports found anywhere in `app/worker/`. `/my-kora`: 6/9 routes have a real `fetch()` path to canonical API routes with an honest-empty/demo fallback when unauthenticated; the other 3 (`opportunities`, `privacy`, `kora-link`) remain synthetic-only with no live path at all. | HIGH | **WORKER** |
| 4 | Synthetic/demo dependency | **4** (none) | 2 (mixed, but real convergence work already underway) | Same evidence as #3, framed inversely. `/my-kora`'s partial convergence (MYKORA-01, 2026-07-04, plus the per-route four-state pattern in `bookings`/`dynamic-cv`/`kora-space`) shows this gap has been *actively closing*, not static. | HIGH | **WORKER**, gap narrower than surface-level framing suggests |
| 5 | Privacy / individual-response boundary | **3** | 2 | Both articulate the identical doctrine (PIB never employer-visible, N≥10 threshold) — `/worker/privacy/page.tsx` and `/my-kora/privacy/page.tsx` state it near-verbatim. `/worker`'s enforcement is tied to a real, auditable identity throughout; `/my-kora`'s is correct *in UI copy* but sits on top of synthetic personas for 3 of 9 routes, where "privacy enforcement" is moot because the underlying data isn't real yet. | MEDIUM | **WORKER** (real enforcement over correct-but-unenforced design intent) |
| 6 | Worker Listening readiness | **2** | 1 | No Listening/survey code exists anywhere in the repository (confirmed by repo-wide search — zero `survey`-named files outside `docs/`). Structural-compatibility-only assessment: a real, individually-auditable authenticated response requires the same real-identity foundation `/worker` already has; `/my-kora` would need to solve the identical real-auth problem `/worker` already solved before Listening could be built there. | MEDIUM (no implementation exists to score directly; this is a structural-fit judgment only) | **WORKER** |
| 7 | Evidence → NeedObservation pipeline | **2** | 1 | `NeedObservation` doesn't exist as a canonical object anywhere yet (Master Plan future ontology, N1+). Same structural reasoning as #6 — a pipeline turning worker interaction into an auditable evidence record needs the real-identity plumbing `/worker`'s API layer already has. | MEDIUM | **WORKER** |
| 8 | Opportunities / activity discovery | 2 | **3** | `/worker` has *two* separate mechanisms: `activity-discovery` (Partner Activities inside a company-enabled perimeter, `lib/partner-activities/catalog.ts`-backed — see CC-023's own finding that this catalog is currently 100% fictional/static) and `opportunities` (a simpler "Worker Partner Map," browse-only, no personalization). `/my-kora/opportunities` implements a *more product-mature* concept: personalized, pillar-based suggestions with estimated IU per opportunity, sourced from `WorkerOpportunityService`. This is a genuine product-concept gap in `/worker`, not just a data-maturity gap. | MEDIUM | **MY_KORA** (product concept, not technical maturity) |
| 9 | Booking / activation | 0 | **3** | `/worker` has **no booking page at all**. `/my-kora/bookings` is live-API-backed (`/api/worker/commons/bookings`, real `BookingService.listMyBookings`), and `/my-kora/kora-space` has inline booking (`POST /api/worker/commons/bookings`). This is the one dimension where `/my-kora` has an outright capability `/worker` is missing entirely. | HIGH | **MY_KORA** |
| 10 | Dynamic CV / development continuity | **3** | 2 | Both have a `dynamic-cv` route. `/worker`'s is unconditionally real (page unreachable without a real session; `DynamicCVClient` calls `/api/worker/dynamic-cv`+`/shares` with `credentials: 'include'`, includes sharing/revoke flows `/my-kora` lacks). `/my-kora`'s has the well-documented four-state live-detection pattern but still defaults to synthetic content for any non-authenticated visitor. | HIGH | **WORKER** (functionally ahead; share/revoke flow is real-only) |
| 11 | KORA Link | 2 | 2 | Both are explicitly self-labeled pure previews: `/worker/kora-link/activate`'s own header says *"Pure UI/UX preview... No DB. No Supabase writes... the activation action below is a disabled mock only"*; `/my-kora/kora-link`'s says *"No DB. No Supabase writes. No automatic activation."* Functionally tied; `/worker`'s sits behind real auth (consistency with #1), `/my-kora`'s does not. | HIGH | **TIE** (slight edge to WORKER for auth consistency only) |
| 12 | UX / product continuity, My KORA brand | 2 | **4** | `CLAUDE.md` §12.15 protects "My KORA" as a permanent, proprietary product name — this is a brand-identity fact, not a route-path preference. `/my-kora`'s home page has an explicit, articulated success criterion ("a worker understands in ≤30s what this space is, what they've done, what they can do next, what they can share, what the employer cannot see") that no `/worker` page states or attempts. `/worker`'s naming is operational (`workspace`, `activity-discovery`) without a unifying worker-facing narrative. | HIGH | **MY_KORA** |

**Unweighted total (informational only — do not let this replace judgment):** `/worker` 32 · `/my-kora` 25. The gap is smaller than the "LIVE vs PREVIEW" framing suggests, and is concentrated entirely in infrastructure dimensions (auth, identity, runtime, privacy enforcement) — `/my-kora` wins or ties on every *product-concept* dimension (opportunities, booking, brand) and on KORA Link.

`CC024_MATRIX_COMPLETE = YES` · `CC024_MATRIX_DECISION_GRADE = YES` — based on current repository reality (re-verified 2026-09-06, post-CC-00), not demo-era assumptions; covers auth/runtime/data/privacy/product implications as required.

---

## 6–16. Dimension deep dives (winners)

- `AUTH_WINNER = WORKER`
- `CANONICAL_RUNTIME_WINNER = WORKER`
- `WORKER_IDENTITY_WINNER = WORKER` (narrowly — data layer already shared for 6/9 `/my-kora` routes)
- `PRIVACY_ARCHITECTURE_WINNER = WORKER`
- `LISTENING_READINESS_WINNER = WORKER` (structural fit only; no implementation exists on either side)
- `NEED_PIPELINE_WINNER = WORKER` (same caveat)
- `DISCOVERY_WINNER = MY_KORA` (product concept — personalized, IU-weighted suggestions vs. browse-only catalogs)
- `ACTIVATION_WINNER = MY_KORA` (outright capability gap in `/worker`)
- `DEVELOPMENT_CONTINUITY_WINNER = WORKER` (share/revoke flows are real-only)
- `KORA_LINK_WINNER = TIE`
- `UX_PRODUCT_WINNER = MY_KORA`

---

## 7. Migration cost (Options A / B / C)

| Concern | A — `/worker` foundation | B — `/my-kora` foundation | C — converged (`/worker` foundation + `/my-kora` product layer, My KORA brand) |
|---|---|---|---|
| Auth work | LOW (already real) | VERY HIGH (retrofit real session as *primary*, not fallback, across all 9 routes; the 3 fully-synthetic routes need a security model built from scratch) | LOW (reuse `/worker`'s existing gate) |
| Data work | MEDIUM (build a real "booking" capability from scratch; port opportunity-recommendation logic to real data) | MEDIUM (wire remaining 3 routes to canonical sources; formalize the already-existing 6/9 live-detection pattern) | MEDIUM (same as A for the 2 missing capabilities; no auth retrofit needed) |
| UI migration | MEDIUM–HIGH (port `/my-kora`'s brand narrative, opportunity-recommendation UI, booking UI into `/worker`'s route tree/visual language) | LOW (UI already exists) | MEDIUM (same UI port as A, explicitly scoped as the plan rather than a byproduct) |
| Service replacement | MEDIUM (`WorkerOpportunityService`, `BookingService` already real/near-real — mostly a call-site migration, not a rebuild) | HIGH (`MyKoraPreviewService`, and the demo-state persona model underlying the 3 fully-synthetic routes, need real replacements) | MEDIUM (same as A) |
| Test migration | MEDIUM | HIGH | MEDIUM |
| Security risk | LOW | HIGH (retrofitting auth into a demo-first codebase is exactly the kind of change most likely to introduce a real gap) | LOW |
| Regression risk | MEDIUM (existing `/worker` users, if any in pilot, keep working; `/my-kora` demo/persona exploration would need a redirect plan) | HIGH | MEDIUM |
| Architectural complexity | LOW–MEDIUM | HIGH | MEDIUM |

---

## 8. Salvage map

### `/worker` capability map

| Capability | Action | Reason |
|---|---|---|
| Real auth/session gate | KEEP | Already canonical; the foundation everything else builds on |
| `personal.worker_identity`-backed identity | KEEP | Canonical, matches `docs/worker-identity-architecture.md`'s target model |
| `/api/worker/**` (18 routes) | KEEP | Real, mature, RLS-adjacent API surface — the shared backend layer |
| `activity-discovery` (Partner Activities) | DEFER | Sits on `lib/partner-activities/catalog.ts`, confirmed by CC-023 to be 100% fictional, static, out-of-B-TRUTH-scope content — a separate, already-flagged governance item, not this task's to resolve |
| `opportunities` (Worker Partner Map) | MIGRATE | Superseded in product concept by `/my-kora/opportunities`'s personalized, IU-weighted model — merge the better concept onto the real data this route already has |
| `dynamic-cv` + share/revoke | KEEP | Most mature Dynamic CV implementation across either surface |
| `kora-link/activate` | KEEP (as-is, still a labeled preview) | No change needed — already correctly scoped as inactive/mock |
| `privacy` page | KEEP, MERGE narrative | Correct doctrine; should absorb `/my-kora/privacy`'s clearer "chi vede cosa" framing |
| `onboarding`, `login`, `setup-password` | KEEP | Real auth-flow plumbing, no `/my-kora` equivalent exists to compare against |
| `commons` (worker view) | KEEP | Already live, RLS-proven (CC-052) |
| `workspace` (home) | MIGRATE / REBUILD_CANONICAL | Functional but lacks `/my-kora` home's articulated "≤30s understand this space" success criterion — rebuild its narrative under the My KORA brand, keep its data wiring |

### `/my-kora` capability map

| Capability | Action | Reason |
|---|---|---|
| "My KORA" brand name, narrative, IA | KEEP | CLAUDE.md-protected proprietary name; the clearest worker-facing product narrative across either surface |
| `bookings` (live, `BookingService`-backed) | MIGRATE | Only booking implementation that exists; port onto `/worker`'s auth/route foundation |
| `kora-space` (inline booking + discovery) | MIGRATE | Real live-detection pattern already proven; port the concept, reuse the already-canonical `getPublishedInitiatives`/`commons.post` backing |
| `opportunities` (personalized, IU-weighted) | MIGRATE | Product-concept winner (§8 dimension 8) — bring this UX onto real worker data |
| `dynamic-cv`, `personal-impact-balance` | REBUILD_CANONICAL (merge) | Overlaps `/worker/dynamic-cv`; PIB page has no `/worker` equivalent today — the richer of the two PIB/CV presentations should survive, backed by `/worker`'s real data path |
| `collective` (KORA Contribution widget) | DEFER | Explicitly synthetic-only, no live path yet, not part of this decision's critical dimensions |
| `privacy` page copy | MIGRATE (copy only) | Clearer "chi vede cosa" framing than `/worker`'s equivalent; the underlying enforcement is `/worker`'s, not `/my-kora`'s |
| `kora-link` | RETIRE (duplicate) | `/worker/kora-link/activate` already covers the identical preview scope, behind real auth |
| `MyKoraPreviewService` synthetic persona model | RETIRE (after migration) | Once real auth is the only path in, the persona-switcher purpose this service serves disappears — but this is explicitly **B-WORKER's** job, not this task's, and not this task's to schedule precisely |
| `WorkerSessionProvider` / demo-state four-state pattern | KEEP the *pattern* as a stepping-stone, not the end state | Proven useful for gradual rollout; should not become the permanent architecture once a single real surface exists |

---

## 9. Target end state (not implemented here)

`TARGET_WORKER_SURFACE_ARCHITECTURE`:

- **One** authenticated worker surface, reachable at a single canonical route tree.
- **Canonical auth**: `/worker`'s existing real Supabase-JWT, server-side-gated model — extended to be the *only* path in (no synthetic/demo fallback for any route once this surface is canonical).
- **Canonical data**: `personal.worker_identity` + the existing `/api/worker/**` layer, extended to cover booking and opportunity-recommendation (currently `/my-kora`-only capabilities).
- **My KORA brand retained**: the surviving surface is presented and named "My KORA," regardless of which route path or codebase foundation it runs on.
- **Legacy route disposition**: whichever of `/worker` or `/my-kora` does *not* become the primary URL should redirect to the survivor, not be deleted outright, until B-WORKER's own migration is verified complete.
- **No synthetic runtime**: the 3 B-WORKER-owned residuals (`WorkerProvisioningService`, `WorkerAchievementService`, `AccountProvisioningService`'s `getCurrentDemoUser()`) and `MyKoraPreviewService` are retired as part of B-WORKER's own scope — not before, not by this document.
- **B-WORKER residual ownership**: unchanged from CC-00's ratification — still B-WORKER's to resolve, still tracked, still open.
- **Worker Listening ready**: the real-auth, real-identity foundation this target architecture requires is a prerequisite for NB-1 (Worker Listening) — this target state is what makes NB-1 buildable, not NB-1 itself.
- **KORA Link compatible**: both existing preview implementations are equally inert; either can be extended once KORA Link activation is authorized (separate gate, Master Plan §33, `FROZEN`/`OPTIONAL add-on`).

---

## 10. Option scoring summary

| Dimension | A — `/worker` foundation | B — `/my-kora` foundation | C — converged canonical surface |
|---|---:|---:|---:|
| 1 Auth | 4 | 1 | 4 |
| 2 Identity | 4 | 2 | 4 |
| 3 Runtime | 4 | 1 | 4 |
| 4 Synthetic dep. (inverse) | 4 | 1 | 4 |
| 5 Privacy | 3 | 1 | 4 |
| 6 Listening readiness | 2 | 1 | 3 |
| 7 NeedObservation readiness | 2 | 1 | 3 |
| 8 Discovery | 2 | 3 | 4 |
| 9 Booking | 0 | 3 | 4 |
| 10 Dynamic CV | 3 | 2 | 4 |
| 11 KORA Link | 2 | 2 | 3 |
| 12 UX/brand | 2 | 4 | 4 |
| **Unweighted total** | **32** | **22** | **45** |

(Do not treat the total as the decision — see §11.)

---

## 11. Risk analysis

| Risk | A | B | C |
|---|---|---|---|
| Architectural | LOW | HIGH (retrofit) | MEDIUM (merge coordination) |
| Security | LOW | HIGH | LOW |
| Product regression | MEDIUM (lose booking/opportunity UX if not ported deliberately) | LOW (product intact) | LOW (both ported deliberately) |
| Privacy | LOW | HIGH (synthetic-personas-to-real transition is exactly where privacy bugs hide) | LOW |
| Migration | MEDIUM | HIGH | MEDIUM |
| Future Worker Listening | LOW (foundation already fits) | HIGH (would need the same foundation work anyway, later, under pressure) | LOW |
| Future KORA Link | LOW | LOW | LOW |

`LOWEST_TOTAL_RISK_OPTION = C`

---

## 12. Recommendation

`RECOMMENDED_DD_OPTION = C`

**Why:** `/worker` already has the real infrastructure — auth, identity, data layer, privacy enforcement — that any canonical worker surface needs, including the two dimensions (Listening readiness, NeedObservation pipeline) that matter most for what comes *after* D-D. Rebuilding that on `/my-kora`'s foundation (Option B) means solving the same hard problems `/worker` already solved, under time pressure, on the exact surface most likely to leak privacy bugs during the transition. But `/worker` is missing real product concepts `/my-kora` already has — booking (`/worker` has none at all) and a materially better opportunity-recommendation UX — and it has no equivalent of "My KORA"'s articulated worker-facing narrative, which CLAUDE.md protects as this project's permanent brand regardless of which codebase survives. Evidence also shows this convergence isn't hypothetical — 6 of `/my-kora`'s 9 routes already call `/worker`'s own canonical API layer via the MYKORA-01 four-state pattern, meaning the data layer has been organically converging since 2026-07-04. Option C completes a merge that has already begun, rather than starting one from scratch.

**What survives:** `/worker`'s auth model, identity model, API layer, `activity-discovery`/`commons`/`onboarding`/`dynamic-cv` (core), `kora-link` preview.
**What is retired (by B-WORKER, not this document):** `/my-kora`'s route tree as a separate URL (redirected, not deleted, until migration is verified), `MyKoraPreviewService`, the demo-state persona-switcher path for worker identity specifically.
**What becomes canonical:** the merged surface, presented under the **My KORA** brand name, running on `/worker`'s technical foundation.
**What is migrated in (not retired):** `/my-kora`'s booking capability, opportunity-recommendation UX, PIB/Dynamic-CV presentation polish, and its worker-facing narrative/success-criterion framing.
**What remains deferred:** `lib/partner-activities/catalog.ts`'s fictional content (CC-023's own P3 finding, a separate NETWORK-track item), `collective`/KORA Contribution widget (no live path yet), KORA Link activation (separate, `FROZEN` gate).
**What B-WORKER must implement next:** the actual merge — port booking and opportunity-recommendation onto `/worker`'s real data path, apply the My KORA brand/narrative to the surviving surface, retire the 3 B-WORKER-owned synthetic residuals and `MyKoraPreviewService`, set up the redirect from the retired URL, and re-run the privacy/RLS proof for every migrated capability before calling it done.

---

## 13. Proposed D-D founder decision text

> **D-D — Worker Surface Decision**
>
> The canonical worker surface converges `/worker`'s real authentication, identity, and data infrastructure with `/my-kora`'s product concepts and worker-facing brand narrative — a merge, not a unilateral win for either existing codebase.
>
> **Canonical technical foundation:** `/worker`'s real Supabase-JWT auth model, `personal.worker_identity`-rooted identity, and the existing `/api/worker/**` API layer.
>
> **Canonical product name:** **My KORA** (per CLAUDE.md's protected proprietary naming), applied to the surviving surface regardless of URL path.
>
> **Migration principle:** port `/my-kora`'s booking capability, opportunity-recommendation UX, and worker-facing narrative onto `/worker`'s real foundation; do not retrofit real auth onto `/my-kora`'s demo-first codebase. Redirect the retired URL rather than deleting it outright until migration is verified complete.
>
> **Retired/deferred surfaces:** `MyKoraPreviewService` and the worker-identity demo-persona path are retired as part of the merge. `lib/partner-activities/catalog.ts`'s fictional content, the `collective`/Contribution widget, and KORA Link activation remain explicitly deferred, unrelated to this decision.
>
> **B-WORKER mandate:** execute the merge described above; retire the 3 B-WORKER-owned synthetic residuals (`WorkerProvisioningService`, `WorkerAchievementService`, `AccountProvisioningService`'s `getCurrentDemoUser()`) as part of the same body of work, not before; re-verify privacy/RLS behavior for every migrated capability.

`FOUNDER_RATIFICATION_REQUIRED = YES` — this text is a recommendation for ratification, not a ratified decision. It is not marked ratified anywhere in this repository as of this document.

---

## 14. Explicitly not done by this document

- No code, auth, or synthetic service was modified.
- Neither `/worker` nor `/my-kora` was marked canonical or retired in the architecture registry.
- D-D remains OPEN.
- B-WORKER has not started.
- Worker Listening has not started.
- Commercial review has not started.
