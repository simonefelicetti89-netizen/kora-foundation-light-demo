# KORA Space → Contribution V2 Integration Audit

**Version:** 1.0  
**Date:** 2026-06-24  
**Status:** Audit complete — Gate 3 OPEN, no production changes made  
**Scope:** KORA Space (commons schema) as source layer feeding KORA Contribution V2  
**Author:** Claude Code — read-only structural audit, no migrations applied, no live data accessed  

---

## 1. Executive Summary

KORA Space is substantially implemented as an operational module. The booking lifecycle, cross-company attribution functions, RLS policies, Pilot+ view types, narrative generators, V2 computation engine, and company dashboard are all code-complete. The product-facing naming has been updated ("KORA Space" replaces "Commons" in UI copy), but the schema, service layer, and code still use the `commons` identifier throughout.

**The primary integration blocker is architectural, not logical:** `commons.booking` and `commons.contribution_event` are defined in migration 025 but not applied to any database. Every live code path that generates contribution signals from KORA Space bookings is correctly gated on `production_ready = true` and will activate automatically once Gate 3 closes and migration 025 is applied.

**Privacy boundaries are architecturally correct.** No employer-visible individual booking data exists in any code path. Worker identity is suppressed at every company-facing boundary.

**Foundation Light demo path is complete.** Seed data flows through `KoraContributionService` and renders the V2 maturity band + confidence + 5-component breakdown on the company contribution dashboard. No live KORA Space signal is required for demo operation.

Six specific integration gaps exist, documented in §7. Two require code changes before Pilot; four can be deferred to post-Pilot.

---

## 2. Scope and Constraints

### This audit covers:
- KORA Space (commons schema) as one source of KORA Contribution signals
- The booking → contribution_event → KoraContributionService pipeline
- External participant signals from `commons.post.external_participants_count`
- V2 component coverage from KORA Space signals
- Privacy boundary enforcement at each layer
- Foundation Light demo path vs Pilot+ live path

### This audit does NOT cover:
- Other KORA Contribution sources (UEF events, partner sources, territorial volunteering)
- KORA Index computation (entirely separate — not affected by this audit)
- Production database state (Gate 2 OPEN — no production queries run)
- Real worker data (Gate 3 OPEN — no real booking or participation data accessed)
- Migration application (mig 025 and 026 are written but intentionally NOT applied)

### Audit constraints honored:
- No `supabase db push`, no `supabase migration up`, no migration apply
- No real worker data imported or accessed
- No secrets, tokens, or connection strings printed
- No changes to KORA Index formula
- KORA Contribution remains a companion indicator (not a KORA Index component)
- Gate 3 remains OPEN

---

## 3. KORA Space Implementation Map

### 3.1 Schema and Database Layer

| Artifact | File | Status |
|---|---|---|
| `commons.post` (initiative hosting) | Existing migration (pre-B165) | Applied — live table |
| `commons.post` B165 extension fields | Migration includes `opening_grade`, `capacity_internal`, `capacity_cross`, `external_participants_count`, `external_participants_evidence`, `value_chain_supplier_count`, `contribution_impact_weight` | Applied — confirmed by API routes reading these columns |
| `commons.booking` (attendance tracking) | `supabase/migrations/025_commons_booking_contribution.sql` | WRITTEN — NOT APPLIED |
| `commons.contribution_event` (aggregated signal) | `supabase/migrations/025_commons_booking_contribution.sql` | WRITTEN — NOT APPLIED |
| `booking_aggregate_for_promoter()` RPC | `supabase/migrations/025_commons_booking_contribution.sql` | WRITTEN — NOT APPLIED |
| `personal.worker_pib` source_booking_id column | `supabase/migrations/025_commons_booking_contribution.sql` | WRITTEN — NOT APPLIED |
| `commons.attribute_contribution_for_booking_atomic()` | `supabase/proposed/026_contribution_atomic_attribution.sql` | PROPOSED — NOT APPLIED |

**Verdict:** Schema definitions are complete. No tables are missing. All blocking is from non-application of mig 025.

### 3.2 Service Layer

| Service / Function | File | Status |
|---|---|---|
| `CommonsService.getPublishedInitiatives()` | `services/commons/CommonsService.ts` | Complete — reads live `commons.post`, geo-filter |
| `CommonsService.getInitiativeFromSeed()` | `services/commons/CommonsService.ts` | Complete — reads `commons-initiatives.json` for FL demo |
| `BookingService.createBooking()` | `services/commons/BookingService.ts` | Code-complete — blocked until mig 025 applied |
| `BookingService.markAttended()` | `services/commons/BookingService.ts` | Code-complete — triggers attribution on attend |
| `BookingService.moderate()` | `services/commons/BookingService.ts` | Code-complete — admin approve/reject |
| `BookingService.getAggregateForPromoter()` | `services/commons/BookingService.ts` | Code-complete — calls SECURITY DEFINER RPC |
| `attributePIBForBooking()` | `lib/commons/cross-company-attribution.ts` | Code-complete — blocked until mig 025 applied |
| `attributeContributionForBooking()` | `lib/commons/cross-company-attribution.ts` | Code-complete — writes 2 rows (C-9 risk documented) |
| `attributeContributionForExternalParticipants()` | `lib/commons/cross-company-attribution.ts` | Code-complete — writes 1 row |
| `KoraContributionService.getContributionLive()` | `services/kora-contribution/KoraContributionService.ts` | Code-complete — gated on `production_ready` |
| `KoraContributionService.getContributionPromoterView()` | `services/kora-contribution/KoraContributionService.ts` | Code-complete — gated on `production_ready` |
| `KoraContributionService.getContributionOriginEmployerView()` | `services/kora-contribution/KoraContributionService.ts` | Code-complete — gated on `production_ready` |
| `KoraContributionService.computeContributionV2()` | `services/kora-contribution/KoraContributionService.ts` | Complete — all 5 V2 components, reads config |
| `buildPromoterNarrative()` | `lib/commons/contribution-narrative.ts` | Complete — deterministic, Italian, pure function |
| `buildOriginEmployerNarrative()` | `lib/commons/contribution-narrative.ts` | Complete — deterministic, Italian, pure function |

### 3.3 API Routes

| Route | Method | Roles | Status |
|---|---|---|---|
| `/api/commons/initiatives` | GET | KORA_ADMIN, COMPANY_ADMIN, WORKER | Complete |
| `/api/commons/posts` | GET/POST | KORA_ADMIN, COMPANY_ADMIN (POST); all (GET) | Complete |
| `/api/commons/posts/[id]` | GET/PATCH | KORA_ADMIN (PATCH), others (GET) | Complete |
| `/api/worker/commons/bookings` | GET/POST | WORKER (own only) | Complete — blocked until mig 025 applied |
| `/api/worker/commons/bookings/[id]` | DELETE | WORKER (own only, cancel) | Complete — blocked until mig 025 applied |
| `/api/admin/commons/bookings` | GET | KORA_ADMIN | Complete — blocked until mig 025 applied |
| `/api/admin/commons/bookings/[id]` | PATCH | KORA_ADMIN | Complete — blocked until mig 025 applied |
| `/api/company/contribution/live` | GET | COMPANY_ADMIN | Complete — returns 404 for non-production_ready |
| `/api/company/commons/bookings/aggregate` | GET | COMPANY_ADMIN | Complete — returns SECURITY DEFINER aggregate |

### 3.4 UI Pages

| Page | Role | Content | Status |
|---|---|---|---|
| `app/commons/page.tsx` | All (preview) | Published initiatives catalog, seed data | Complete (FL demo) |
| `app/company/commons/page.tsx` | COMPANY_ADMIN | Own-tenant posts, all statuses, create form | Complete (live DB path) |
| `app/worker/commons/page.tsx` | WORKER | Published initiatives for booking | Complete (live DB path) |
| `app/my-kora/kora-space/page.tsx` | WORKER | Booking UI, four-state detection | Complete — static demo items in list |
| `app/admin/commons/page.tsx` | KORA_ADMIN | All tenant posts, moderation queue | Complete |
| `app/company/contribution/page.tsx` | COMPANY_ADMIN | V2 maturity band, confidence, 5-component breakdown | Complete (FL seed + V2 engine) |

### 3.5 Methodology and Doctrine Layer

| File | Purpose | Status |
|---|---|---|
| `lib/kora-contribution/contribution-methodology.ts` | Doctrine constants | Complete — `is_kora_index_component: false` enforced |
| `lib/kora-engine/contribution-family-detector.ts` | Eligibility logic | Complete — C-5 fix applied (OR not bare pillar) |
| `lib/methodology-config/v0.1.ts` | Config loader | Complete — `getContributionConfigV2()` exported |
| `data/methodology/methodology-config.json` | Weight source of truth | Complete — V2 weights sum to 100, V1 marked legacy |
| `lib/commons/contribution-views.ts` | Pilot+ view types | Complete — no score field, no worker identity |
| `lib/commons/booking-types.ts` | Schema type shapes | Complete — matches mig 025 schema |

---

## 4. Current Signal Flow: KORA Space → Contribution V2

### 4.1 Foundation Light (Demo) Path — ACTIVE

```
collective-initiatives.json (aggregate counts, no worker identity)
kora-contribution-outputs.json (pre-computed seed per scenario/company)
        │
        ▼
KoraContributionService.getContributionForCompany()
        │  reads seed, applies computeContributionV2()
        ▼
ContributionSummary {
  v2: ContributionV2Result (maturity_band, confidence, 5 components)
  contributionScore: [legacy V1 — not primary output]
}
        │
        ▼
app/company/contribution/page.tsx
  ├── V2 maturity band panel (data-testid="contribution-v2-maturity-panel")
  ├── Confidence (non-additive, data-testid="contribution-confidence")
  ├── 5-component breakdown (data-testid="contribution-v2-components")
  └── Companion indicator label ("non è una componente del KORA Index")
```

**Status: Fully operational for demo.** No KORA Space live signal required.

### 4.2 Pilot+ (Live DB) Path — BLOCKED on Gate 3 + mig 025

```
Worker browses KORA Space (commons.post — published, cross_company)
        │
        ▼ POST /api/worker/commons/bookings { post_id }
BookingService.createBooking()
  • validates post is published + cross_company + has capacity
  • INSERT commons.booking → status='pending'
        │
        ▼ KORA_ADMIN approves via PATCH /api/admin/commons/bookings/[id] { decision:'approve' }
BookingService.moderate() → status='approved'
        │
        ▼ KORA_ADMIN marks attendance via PATCH { decision:'attended' }
BookingService.markAttended()
  ├── attributePIBForBooking() → INSERT personal.worker_pib (worker-private, LEGACY IU boost)
  ├── attributeContributionForBooking() → 2x INSERT commons.contribution_event:
  │     Row 1: tenant_id=postTenantId, role='promoter',        impact_weight=1.00
  │     Row 2: tenant_id=workerTenantId, role='origin_employer', impact_weight=0.50
  └── (if external_participants_count > 0) attributeContributionForExternalParticipants()
        └── INSERT commons.contribution_event:
              tenant_id=postTenantId, role='promoter', contribution_kind='external_participants_event'
                    weight=0.48 (self_declared) or 0.72 (verified)
        │
        ▼ COMPANY_ADMIN views contribution (production_ready=true required)
KoraContributionService.getContributionLive()
  SELECT role, contribution_kind, impact_weight, evidence_status, reporting_period
  FROM commons.contribution_event WHERE tenant_id = $tenantId
  -- NEVER: worker_identity_id, source_booking_id
        │
KoraContributionService.getContributionPromoterView()
  • Reads contribution_event WHERE role='promoter' for tenant
  • Joins commons.post for pillar classification
  • Builds pillar_breakdown + calls buildPromoterNarrative()
        │
KoraContributionService.getContributionOriginEmployerView()
  • Reads contribution_event WHERE role='origin_employer' for tenant
  • NO source_booking_id, NO worker_identity_id in SELECT
  • Builds pillar_breakdown + calls buildOriginEmployerNarrative()
```

**Status: Code-complete but blocked.** Activates when:
1. Gate 3 closes (legal/privacy review)
2. Migration 025 applied (`commons.booking`, `commons.contribution_event`)
3. `analytics.tenant.production_ready = true` set for Pilot tenants

---

## 5. KORA Space Signals → V2 Component Coverage

This section maps each V2 component to KORA Space signal coverage.

| V2 Component | Weight | KORA Space Signal | Coverage | Gap |
|---|---|---|---|---|
| **Activation Depth** | 30% | `sum(impact_weight)` across attended bookings — concave formula `1 - exp(-totalIU / IU_reference)` | Blocked (mig 025) | None once applied |
| **Evidence Quality** | 25% | `evidence_status` field on contribution_event (`verified` / `self_declared`) — shrinkage adjustment | Blocked (mig 025) | Evidence source for KORA Space bookings is always 'verified' (admin marks attendance) — correct |
| **Ecosystem Contribution** | 20% | `contribution_kind='cross_company_participation'` events — fraction of ecosystem signals | Blocked (mig 025) | KORA-originated/KORA-enabled adoption signal not implemented (Gap I-3 below) |
| **Adoption & Reach** | 15% | N events (count of contribution_event rows) — concave saturation | Blocked (mig 025) | Replication / scaling signal absent (Gap I-4 below) |
| **Strategic Breadth** | 10% | `pillar` from joined `commons.post` — diversity across LIFE/GROWTH/CONNECTION/IMPACT/LEGACY | Partial (requires mig 025) | Cross-company pillar join in `getContributionPromoterView()` works when live |

### KORA Space contribution to each V2 component (Pilot+ assessment):

- **Activation Depth (30%):** KORA Space is the primary source for cross-company IU weight. Each `markAttended()` call produces a `impact_weight=1.00` (promoter) and `impact_weight=0.50` (origin employer) row. External participant events produce weight 0.48–0.72. This is architecturally correct and will fill this component well.

- **Evidence Quality (25%):** All KORA Space booking attendance is admin-verified (KORA_ADMIN clicks "attended"). Evidence status is always `verified`. The shrinkage estimator will be accurate for this source. No gap here.

- **Ecosystem Contribution (20%):** KORA Space cross-company bookings directly generate ecosystem signals. However, the KORA-originated/KORA-enabled adoption signal (initiative created via KORA tools = adoption bonus) declared in config (`kora_originated_if_adopted: true`) has no code path. This leaves ~subset of ecosystem signal unimplemented (Gap I-3).

- **Adoption & Reach (15%):** N events from contribution_event will satisfy this component once mig 025 is applied. No replication/scaling signal exists (`replication_scalability: false` confirmed in config) — this is a deliberate deferral, not a bug.

- **Strategic Breadth (10%):** Pillar join works once mig 025 is applied. KORA Space covers all 5 pillars via `commons.post.pillar`. Breadth will naturally grow as more diverse initiatives are posted.

---

## 6. Privacy Boundary Audit

### Layer 1: Database / RLS

| Boundary | Policy | Status |
|---|---|---|
| `commons.booking` — COMPANY role | No RLS policy for COMPANY role → returns 0 rows | Defined in mig 025 (not applied) — correct design |
| `commons.booking` — WORKER role | WORKER sees own rows only (`worker_identity_id = kora.worker_identity_id()`) | Defined in mig 025 — correct |
| `commons.booking` — KORA_ADMIN | All rows visible | Defined in mig 025 — correct |
| `commons.contribution_event` — COMPANY role | Own tenant only, via `kora.tenant_id()` + `kora.kora_role()` check | Defined in mig 025 — correct |
| `commons.contribution_event` — WORKER role | No RLS policy → returns 0 rows | Correct — contribution_event is a company-level aggregate |
| `booking_aggregate_for_promoter()` | SECURITY DEFINER — returns `{status, count}` pairs only, never individual rows | Defined in mig 025 — correct |
| `personal.worker_pib` | Existing privacy boundary unchanged — employer-facing views suppress individual records | Unchanged |

### Layer 2: Service Layer

| Boundary | Enforcement | Status |
|---|---|---|
| `getContributionLive()` SELECT | Excludes `worker_identity_id`, `source_booking_id` — SELECT specifies exact columns | Verified in source |
| `getContributionOriginEmployerView()` SELECT | Excludes `source_booking_id`, `worker_identity_id` | Verified in source |
| `getAggregateForPromoter()` | Calls `booking_aggregate_for_promoter` RPC — never `SELECT *` from booking | Verified in BookingService |
| `listMyBookings()` | Filtered by `worker_identity_id` — worker-private | Verified in BookingService |
| Worker API response | `worker_identity_id` stripped from booking response in `/api/worker/commons/bookings` | Verified in API route |

### Layer 3: API Routes

| Route | Privacy Enforcement | Status |
|---|---|---|
| `/api/worker/commons/bookings` | JWT-based identity resolution server-side — no identity as query param | Correct |
| `/api/company/contribution/live` | Returns 404 for `production_ready=false` — no individual data leaks | Correct |
| `/api/company/commons/bookings/aggregate` | Calls SECURITY DEFINER RPC via `getAggregateForPromoter()` — aggregate-safe | Correct |
| Worker booking UI (`app/my-kora/kora-space/page.tsx`) | Only stores `{post_id, status}` in UI state — no identity fields | Verified |

### Layer 4: UI Components

| Component | Privacy Rule | Status |
|---|---|---|
| `app/company/contribution/page.tsx` | Shows aggregate maturity band, pillar breakdown, narrative — no individual names | Correct |
| `app/company/commons/page.tsx` | Shows own-tenant posts by status — no worker list, no individual booking count | Correct |
| Employer booking aggregate (`/aggregate` route) | Shows only `{status, count}` per initiative — no worker identity | Correct |

**Privacy verdict: CLEAN.** No employer-visible individual booking data exists in any implemented code path. All privacy boundaries are architecturally correct. The `contribution_event` RLS design ensures companies can only see their own aggregate signals, never individual attendance records.

---

## 7. Gap Analysis

### I-1: `commons.booking` and `commons.contribution_event` tables do not exist
**Category:** Blocking architectural dependency  
**Severity:** P0 — blocks entire Pilot+ KORA Space signal flow  
**Location:** `supabase/migrations/025_commons_booking_contribution.sql`  
**Root cause:** Migration is written but intentionally not applied (Gate 3 OPEN).  
**Fix:** Apply mig 025 when Gate 3 closes. No code changes needed.  
**Gating:** Gate 3 close required before applying.

### I-2: C-9 — Sequential attribution without transaction
**Category:** Data integrity risk  
**Severity:** P1 — second INSERT (origin_employer row) can fail silently after promoter row succeeds  
**Location:** `lib/commons/cross-company-attribution.ts:attributeContributionForBooking()`  
**Root cause:** Two sequential `INSERT` statements with separate error handling. If DB is interrupted between row 1 and row 2, promoter gets full credit while origin_employer gets none.  
**Mitigation existing:** Idempotency constraint (`ON CONFLICT DO NOTHING` via UNIQUE indexes) prevents duplicate rows on retry. Documented as "acceptable for Foundation Light, fix before Pilot production traffic."  
**Fix:** Apply migration 026 (`commons.attribute_contribution_for_booking_atomic()`) and update `attributeContributionForBooking()` to call the RPC instead of two sequential INSERTs.  
**Caller update required:** `lib/commons/cross-company-attribution.ts` line calling `attributeContributionForBooking()` must be updated to call the new RPC.  
**Gating:** Gate 3 close + migration 026 application.

### I-3: KORA-originated / KORA-enabled adoption signal: config declared, no code path
**Category:** Missing signal source  
**Severity:** P2 — V2 Ecosystem Contribution component (20%) is missing a signal type  
**Location:** `data/methodology/methodology-config.json` → `kora_contribution_v2.signal_sources.kora_originated_if_adopted: true`  
**Root cause:** Config declares this as an eligible signal but no code determines whether a `commons.post` was KORA-originated (created via KORA Admin tooling) or KORA-enabled (created with KORA guidance) and adopted by the company.  
**Current status:** `commons.post` has no `is_kora_originated` or `is_kora_enabled` column. The RPC and attribution functions have no parameter for this.  
**Fix (Pilot):** Add `is_kora_originated boolean DEFAULT false` and `is_kora_enabled boolean DEFAULT false` columns to `commons.post`. Implement adoption detection in `isContributionEligibleEvent()` or a new `isKoraOriginatedAdoption()` helper. Apply an additional contribution weight multiplier when true.  
**Alternative (defer):** Mark `kora_originated_if_adopted: false` in config until Pilot scope is confirmed. Signal is absent, not broken — no false positives exist.

### I-4: Replication / scaling signal: explicitly disabled
**Category:** Deliberate gap (not a bug)  
**Severity:** P3 — low priority  
**Location:** `data/methodology/methodology-config.json` → `kora_contribution_v2.replication_scalability: false`  
**Root cause:** Config explicitly sets this to false — intentional deferral.  
**Current status:** No implementation exists; none expected until post-Pilot methodology revision.  
**Fix:** No action required. Document as future V2 enhancement. Delphi Study calibration will determine whether to add this as a signal.

### I-5: Worker KORA Space page uses static demo items, not live CommonsService
**Category:** UX / demo fidelity gap  
**Severity:** P3 (demo quality)  
**Location:** `app/my-kora/kora-space/page.tsx` — `KORA_SPACE_ITEMS` array (static hardcoded list)  
**Root cause:** Page has four-state detection (`checking / live / empty / demo`) for booking state, but the initiative card list itself uses static `KORA_SPACE_ITEMS` constants rather than fetching from `CommonsService.getPublishedInitiatives()`.  
**Impact:** Live KORA Space initiatives created by companies (in `commons.post`) are not surfaced in the worker My KORA view. Workers see only demo placeholder cards.  
**Fix (Pilot):** Replace `KORA_SPACE_ITEMS` with a live fetch to `/api/commons/initiatives` filtered by `opening_grade='cross_company'` and `status='published'`. The API route and CommonsService already support this.  
**Fix (Foundation Light):** Optionally wire to `commons-initiatives.json` seed for demo fidelity. Currently `app/commons/page.tsx` does show seed initiatives — `app/my-kora/kora-space/page.tsx` should be consistent.

### I-6: Naming gap — code uses "commons" / "Commons", product calls it "KORA Space"
**Category:** Technical debt / naming inconsistency  
**Severity:** P4 (cosmetic, no functional impact)  
**Location:** Schema: `commons.*`, services: `CommonsService`, `BookingService`, types: `CommonsPost`, `CommonsBooking`, routes: `/api/commons/*`, tests: `b165-commons-initiatives`, `b166-bookings-contribution`  
**Root cause:** "KORA Space" is the product name adopted in UI copy (confirmed in `app/company/commons/page.tsx:metadata.title = 'KORA Space · Company'`, `app/admin/commons/page.tsx` header text "KORA Space è moderation-first"). Underlying code layer retained "commons" which is technically the schema name.  
**Impact:** "Commons" = schema/service identifier (correct for internal use). "KORA Space" = product surface name. No functional collision. Confusion risk only in code review context.  
**Fix:** No immediate code rename required. Document the dual naming convention: `commons` = schema/internal identifier; "KORA Space" = product UI name. Rename sprint optional post-Pilot if code clarity is prioritized.

---

## 8. Readiness Verdict

### Foundation Light (Demo) — READY

| Layer | Status | Notes |
|---|---|---|
| V2 computation engine (`computeContributionV2`) | Ready | Reads seed, applies 5-component formula from config |
| Maturity band + confidence UI | Ready | All 5 data-testids present, copy correct |
| Companion indicator doctrine | Ready | `is_kora_index_component: false` enforced at all layers |
| Privacy boundary (demo) | Ready | No individual worker data in any employer-facing path |
| Seed data | Ready | `kora-contribution-outputs.json` + `collective-initiatives.json` — aggregate-only |
| Naming in UI | Ready | "KORA Space" used in product-facing copy |

**Foundation Light demo does not require migration 025. It is fully operational.**

### Pilot+ (Live DB) — BLOCKED on Gate 3

| Layer | Status | Notes |
|---|---|---|
| Schema (`commons.booking`, `contribution_event`) | Blocked | Mig 025 written, not applied |
| Booking lifecycle (create/moderate/attend) | Code-complete, blocked | Activates when mig 025 applied |
| Attribution functions | Code-complete, blocked | Both functions correct, C-9 risk documented |
| `getContributionLive()` | Code-complete, blocked | Gated on `production_ready` |
| `getContributionPromoterView()` | Code-complete, blocked | Gated on `production_ready` |
| `getContributionOriginEmployerView()` | Code-complete, blocked | Gated on `production_ready` |
| Aggregate booking view for company | Code-complete, blocked | SECURITY DEFINER RPC in mig 025 |
| Atomic attribution (mig 026) | Proposed, not applied | Needed before Pilot production load |
| Worker KORA Space live feed | Partial | Static cards in `app/my-kora/kora-space/page.tsx` (Gap I-5) |
| KORA-originated adoption signal | Missing | Config declares it, no code (Gap I-3) |

---

## 9. Fix Plan (Ordered and Gated)

### Phase 0 — Pre-Gate 3 (Safe now, no DB changes)

**F-0A: Document KORA-originated signal decision in config**  
File: `data/methodology/methodology-config.json`  
Action: Set `kora_contribution_v2.signal_sources.kora_originated_if_adopted` to `false` (or add a comment noting "config declares intent, no implementation yet") to prevent false confidence that this signal is active.  
Risk: None. Config read only — no computation changes.

**F-0B: Wire `app/my-kora/kora-space/page.tsx` to seed data**  
File: `app/my-kora/kora-space/page.tsx`  
Action: Replace static `KORA_SPACE_ITEMS` with a fetch to `/api/commons/initiatives` (which reads seed when not production_ready). Four-state detection already in place — `demo` state can use the same API response.  
Risk: Low. No schema change, no DB change, no migration. Improves demo fidelity.  
Priority: Optional for FL demo milestone.

### Phase 1 — Gate 3 Opens (Coordinate with CTO + legal/privacy review)

**F-1A: Apply migration 025**  
File: `supabase/migrations/025_commons_booking_contribution.sql`  
Action: Apply to staging Supabase project only. Verify:
  - `commons.booking` table created with correct UNIQUE(post_id, worker_identity_id)
  - `commons.contribution_event` table created with role/kind CHECK constraints
  - `booking_aggregate_for_promoter()` function created as SECURITY DEFINER
  - RLS policies active (KORA_ADMIN all, WORKER own, COMPANY own-tenant-only for contribution_event)
  - `personal.worker_pib` column `source_booking_id` added
Risk: Schema changes are additive. No existing data affected. Run on staging first.

**F-1B: Apply migration 026 (atomic attribution)**  
File: `supabase/proposed/026_contribution_atomic_attribution.sql`  
Action: Apply after mig 025. Creates `commons.attribute_contribution_for_booking_atomic()` function wrapping both INSERTs in a single transaction.  
Then update `lib/commons/cross-company-attribution.ts:attributeContributionForBooking()` to call the new RPC instead of two sequential INSERTs.  
Risk: Medium. Code change required (caller update). Must coordinate with mig 025 apply.

**F-1C: Set `production_ready = true` for Pilot tenants (Pilot companies only)**  
Table: `analytics.tenant`  
Action: For each Pilot company tenant, set `production_ready = true` via KORA Admin panel. This unblocks `getContributionLive()`, `getContributionPromoterView()`, `getContributionOriginEmployerView()`, and the `/api/company/contribution/live` route.  
Risk: Low. Incremental. Non-Pilot tenants remain `production_ready = false`.

### Phase 2 — Pilot Hardening (Post Gate 3)

**F-2A: Wire `app/my-kora/kora-space/page.tsx` to live `/api/commons/initiatives` (if not done in F-0B)**  
Priority: Required for workers to see real cross-company initiatives and book.

**F-2B: Implement KORA-originated/KORA-enabled adoption detection (if in scope)**  
Files: `commons.post` schema (new column), `lib/kora-engine/contribution-family-detector.ts`, `lib/commons/cross-company-attribution.ts`  
Prerequisites: Founder decision on whether KORA-originated signal enters V2 in Pilot scope.  
If deferred: Mark `kora_originated_if_adopted: false` in config.

**F-2C: Validate privacy thresholds at Pilot scale**  
Action: Confirm `safe_aggregation_threshold` (N≥10) is enforced in `PrivacyVisibilityService` for any new Pilot-facing aggregation views. No current gap — this is a runtime verification step.

---

## 10. Open Questions

The following items require a founder or CTO decision before Pilot build — they are not answerable from code inspection alone.

**Q-1: Is KORA-originated adoption signal in Pilot scope?**  
Config declares `kora_originated_if_adopted: true` but no implementation exists. Should this signal be built before Pilot or deferred? If deferred, config should be updated to `false` to remove false confidence.

**Q-2: Should `app/my-kora/kora-space/page.tsx` show live initiatives or seed demo items?**  
Currently shows static demo cards. Worker booking flow requires live initiative list. Decision: build F-0B now (seed-based) or defer until Pilot with live DB?

**Q-3: What is the Gate 3 timeline?**  
All Pilot+ KORA Space signal flow depends on Gate 3. Is there a target date for legal/privacy review completion?

**Q-4: Should migration 026 (atomic attribution) be applied simultaneously with 025?**  
C-9 risk is mitigated by idempotency but not eliminated. Recommendation: apply mig 026 as part of the same Gate 3 deployment bundle as mig 025. Sequencing them separately risks a window where C-9 is live without the atomic fix.

**Q-5: What evidence weight should KORA Space booking attendance carry?**  
Current values: promoter `impact_weight=1.00`, origin_employer `impact_weight=0.50`, external_participants (self_declared) `0.48`, external_participants (verified) `0.72`. These are pre-empirical. Delphi Study calibration will revise. Confirm these are acceptable for Pilot measurement.

---

## 11. Appendix: File Reference Map

| File | Role in Integration |
|---|---|
| `services/commons/BookingService.ts` | Booking lifecycle — create / moderate / attend / cancel / aggregate |
| `services/commons/CommonsService.ts` | Initiative catalog — seed (FL) and live DB |
| `lib/commons/cross-company-attribution.ts` | Attribution: PIB boost + 2-row contribution write |
| `lib/commons/contribution-views.ts` | Pilot+ view types — no score, no identity |
| `lib/commons/contribution-narrative.ts` | Italian narrative — deterministic, no LLM |
| `lib/commons/booking-types.ts` | Type shapes for booking + contribution_event |
| `lib/commons/types.ts` | CommonsPost, CommonsPostWorkerView, InitiativeOpeningGrade |
| `lib/kora-contribution/contribution-methodology.ts` | Doctrine constants |
| `lib/kora-engine/contribution-family-detector.ts` | Eligibility logic (`isContributionEligibleEvent`) |
| `lib/methodology-config/v0.1.ts` | Config loader — `getContributionConfigV2()` |
| `data/methodology/methodology-config.json` | Single source of truth for all V2 weights |
| `data/synthetic/commons-initiatives.json` | Seed initiatives for `app/commons/page.tsx` |
| `data/synthetic/collective-initiatives.json` | Seed collective initiative data for KoraContributionService |
| `data/synthetic/kora-contribution-outputs.json` | Pre-computed contribution output per scenario/company |
| `services/kora-contribution/KoraContributionService.ts` | All computation paths — FL seed + Pilot+ live |
| `app/company/contribution/page.tsx` | V2 dashboard UI |
| `app/my-kora/kora-space/page.tsx` | Worker booking UI (static items — Gap I-5) |
| `app/company/commons/page.tsx` | Company post management |
| `app/admin/commons/page.tsx` | Admin moderation panel |
| `app/commons/page.tsx` | Public initiative catalog |
| `supabase/migrations/025_commons_booking_contribution.sql` | Schema: commons.booking + contribution_event — NOT APPLIED |
| `supabase/proposed/026_contribution_atomic_attribution.sql` | Atomic attribution RPC — NOT APPLIED |
| `app/api/admin/commons/bookings/[id]/route.ts` | Admin moderate / attend |
| `app/api/worker/commons/bookings/route.ts` | Worker create / list |
| `app/api/company/contribution/live/route.ts` | Live contribution (production_ready gate) |
| `app/api/company/commons/bookings/aggregate/route.ts` | Aggregate for promoter (SECURITY DEFINER) |
| `tests/unit/b166-bookings-contribution.test.ts` | Booking + attribution structural tests (16 blocks) |
| `tests/unit/b167-contribution-dashboard.test.ts` | Dashboard + narrative tests |
| `tests/unit/kora-contribution-version-b.test.ts` | V2 model validation (20 tests) |
| `tests/unit/kora-contribution-hardening.test.ts` | Doctrine hardening + audit doc tests |

---

*Generated from KORA Space → Contribution V2 Integration Audit (2026-06-24). All observations are read-only — no migrations applied, no production state changed, Gate 3 remains OPEN.*
