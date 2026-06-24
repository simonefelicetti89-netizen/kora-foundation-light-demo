# KORA Contribution Source Layer — Handoff Snapshot

**Date:** 2026-06-24
**Branch:** `main`
**HEAD:** `6384026`
**Status:** DOCUMENTATION / DESIGN ONLY — no migration applied — Gate 3 OPEN

---

## 0. Executive Summary

Three migrations define the KORA Contribution source layer before Gate 3:

| Migration | File | Status |
|---|---|---|
| 025 | `supabase/migrations/025_commons_booking_contribution.sql` | READY\_FOR\_REVIEW — NOT applied |
| 032 | `supabase/proposed/032_contribution_atomic_attribution.sql` | READY\_FOR\_REVIEW — NOT applied |
| 033 | `supabase/proposed/033_initiative_adoption_source_model.sql` | READY\_FOR\_REVIEW — NOT applied |

All three were hardened across three sprints in commit range `930c535` → `6384026`:

1. **Sprint 1** (`930c535`) — pre-apply hardening of migration 025 (M025-1 through M025-6)
2. **Sprint 2** (`133cfb9`) — design of migration 033: `commons.initiative_adoption` source table
3. **Sprint 3** (`6384026`) — idempotency hardening: `uq_contribution_external` expanded to 5 columns (M025-7)

**KORA Contribution** is a companion indicator — **NOT** a KORA Index component. No KORA Index formula was changed. No worker ranking. No individual contribution score. No employer-visible individual worker activity.

---

## 1. Safety / Gate Status

| Check | Status |
|---|---|
| Branch | `main` ✓ |
| Working tree | Clean (only `supabase/.temp/` untracked — ignored) ✓ |
| HEAD | `6384026` ✓ |
| Remote | Pushed to `origin/main` ✓ |
| Production | Not linked, not targeted ✓ |
| Gate 2 | OPEN — blocks SQL apply ✓ |
| Gate 3 | OPEN — blocks live worker data ✓ |
| Migration 025 applied | NO ✓ |
| Migration 032 applied | NO ✓ |
| Migration 033 applied | NO ✓ |
| Real worker data | None created ✓ |
| KORA Contribution in KORA Index | NO — companion indicator only ✓ |
| KORA Index formula changed | NO ✓ |
| Worker ranking | NO ✓ |
| Individual contribution score | NO ✓ |
| Employer-visible individual activity | NO ✓ |

---

## 2. Commit Timeline

| Commit | Message | Sprint |
|---|---|---|
| `1faac25` | `docs: plan KORA Space contribution source layer` | Pre-session |
| `b4df933` | `docs: audit KORA Space contribution source integration` | Pre-session |
| `930c535` | `fix: revise migration 025 contribution source schema` | Sprint 1 |
| `133cfb9` | `docs: design migration 033 initiative adoption source model` | Sprint 2 |
| `6384026` | `fix: harden contribution event idempotency model` | Sprint 3 |

---

## 3. Migration 025 Final State

**File:** `supabase/migrations/025_commons_booking_contribution.sql`
**Feature:** B166 — Cross-company bookings + KORA Contribution source layer
**Classification:** `READY_FOR_REVIEW`
**Applied:** NO

### What it creates

1. `commons.booking` — per-worker booking of a cross-company initiative (worker_identity_id present; never visible to employer roles)
2. `commons.contribution_event` — company-level contribution signal table (no worker identity)
3. `personal.worker_pib.source_booking_id` — FK column added to PIB table
4. `commons.booking_aggregate_for_promoter(uuid)` — SECURITY DEFINER aggregate function (M025-4 N≥10 threshold enforced)

### contribution_event schema

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `tenant_id` | `uuid NOT NULL` | Company receiving this contribution signal |
| `source_booking_id` | `uuid NULL` | FK → `commons.booking`; NULL for non-booking events |
| `source_post_id` | `uuid NOT NULL` | FK → `commons.post` (the initiative) |
| `role` | `text NOT NULL` | 8-value CHECK (see below) |
| `contribution_kind` | `text NOT NULL` | 11-value CHECK (see below) |
| `impact_weight` | `numeric(8,4) NOT NULL` | Weight for V2 computation |
| `evidence_status` | `text NOT NULL` | 5-value CHECK |
| `reporting_period` | `text NOT NULL` | e.g. `'2026-Q2'` |
| `source_type` | `text NULL` | M025-6: `'booking'`, `'adoption'`, etc. |
| `event_type` | `text NULL` | M025-6: `'attendance_marked'`, `'company_adopted'`, etc. |
| `contribution_component_hint` | `text NULL` | M025-6: V2 component routing hint |
| `aggregate_count` | `integer NULL` | M025-6: for feedback/aggregate signals |
| `privacy_threshold_met` | `boolean NOT NULL DEFAULT false` | M025-6: N≥10 confirmed |
| `is_cross_company` | `boolean NOT NULL DEFAULT false` | M025-6 |
| `is_kora_originated` | `boolean NOT NULL DEFAULT false` | M025-6 |
| `is_kora_enabled` | `boolean NOT NULL DEFAULT false` | M025-6 |
| `adoption_type` | `text NULL` | M025-6: adoption sub-type label |
| `created_at` | `timestamptz NOT NULL DEFAULT now()` | |

**Structural absence (constitutional):** No `worker_identity_id`. No `worker_id`. No individual worker field of any kind.

### contribution_kind values (11, M025-1)

```
cross_company_participation     -- A. Booking — mig 032 source
external_participants_event     -- A. External — future source
company_adoption                -- B. Adoption
company_sponsorship             -- B. Adoption
company_support                 -- B. Adoption
company_cofunding               -- B. Adoption
kora_originated_adoption        -- C. KORA-origin
kora_enabled_adoption           -- C. KORA-enabled
initiative_replication          -- E. Replication
aggregate_feedback              -- D. Feedback (N≥10 only)
aggregate_follow_up             -- D. Feedback (N≥10 only)
```

### role values (8, M025-3)

```
promoter          -- company that created/promoted the initiative
origin_employer   -- company from which the participating worker comes
adopter           -- company formally adopting an external initiative
sponsor           -- financial sponsor
supporter         -- non-financial support
cofunder          -- co-funder
kora_enabler      -- company enabling a KORA-originated initiative
partner           -- external partner co-designing
```

### evidence_status values (5, M025-2)

```
verified          -- attendance confirmed by KORA Admin
self_declared     -- company self-reports
partner_verified  -- partner confirms
advisor_verified  -- KORA Advisor confirms
system_verified   -- automatic/integration verification
```

### N≥10 privacy threshold (M025-4)

`booking_aggregate_for_promoter(post_id)`:
- `COMPANY_ADMIN` calling for their own initiative: if total bookings < 10, returns `('below_threshold', count)` — no status breakdown
- `KORA_ADMIN`: bypasses threshold for oversight
- No individual booking rows ever returned to any company role

`safe_aggregation_threshold = 10` (constant in function; aligned with `PrivacyVisibilityService`)

### Grant / RLS model

- `commons.booking`: KORA_ADMIN all; WORKER own rows only; **no COMPANY_ADMIN policy** (intentional — companies use aggregate function only)
- `commons.contribution_event`: KORA_ADMIN all; COMPANY_ADMIN/VIEWER SELECT own tenant; WORKER no policy (deny-by-default)
- `authenticated`: SELECT only on `contribution_event` (M025-5 — no direct INSERT/UPDATE)
- All INSERTs to `contribution_event` go through SECURITY DEFINER functions (service_role)

### Unique constraints

| Constraint | Columns | Source class | Applied by |
|---|---|---|---|
| `uq_contribution_booking` | `(tenant_id, role, source_booking_id)` DEFERRABLE | A. Booking | mig 032 ON CONFLICT |
| `uq_contribution_external` | `(tenant_id, source_post_id, contribution_kind, role, reporting_period)` DEFERRABLE | B+C. Non-booking | mig 033 ON CONFLICT |

**Postgres NULL semantics:** `uq_contribution_booking` does NOT cover rows where `source_booking_id IS NULL` (adoption events). Those fall to `uq_contribution_external`, which has all 5 columns NOT NULL — full coverage.

### M025 revision log

| Issue | Fix |
|---|---|
| M025-1 | Expanded `contribution_kind` CHECK from 2 values → 11 values |
| M025-2 | Expanded `evidence_status` CHECK from 2 values → 5 values |
| M025-3 | Expanded `role` CHECK from 2 values → 8 values |
| M025-4 | N≥10 threshold enforced in `booking_aggregate_for_promoter()` |
| M025-5 | Restricted grants: `authenticated` SELECT only on `contribution_event` |
| M025-6 | Added 9 new fields: `source_type`, `event_type`, `contribution_component_hint`, `aggregate_count`, `privacy_threshold_met`, `is_cross_company`, `is_kora_originated`, `is_kora_enabled`, `adoption_type` |
| M025-7 | Expanded `uq_contribution_external` from 3 columns → 5 columns (added `role`, `reporting_period`) |

### Remaining risks

- `privacy_threshold_met` is written as `false` by source RPCs. A separate RPC to update this field once N≥10 booking data is confirmed does not yet exist.
- `source_adoption_id` FK (for traceability from `contribution_event` → `commons.initiative_adoption`) was deferred: migration 025 cannot FK to a table defined in migration 033 (applied later). Deferred to a future migration.
- No live apply until Gate 3 closes.

---

## 4. Migration 032 Final State

**File:** `supabase/proposed/032_contribution_atomic_attribution.sql`
**Feature:** Atomic KORA Contribution attribution for cross-company bookings
**Classification:** `READY_FOR_REVIEW`
**Applied:** NO

### History

Previously proposed as `026_contribution_atomic_attribution.sql`. Renumbered to `032` to avoid conflict with applied migration `026_company_route_rls_gaps.sql`. The old `026` proposed file no longer exists.

### What it creates

SECURITY DEFINER function: `commons.attribute_contribution_for_booking_atomic(p_booking_id, p_post_id, p_post_tenant_id, p_worker_tenant_id, p_reporting_period, p_promoter_weight, p_origin_weight)`

### Problem solved

`attributeContributionForBooking()` in `lib/commons/cross-company-attribution.ts` writes 2 rows to `commons.contribution_event` sequentially without a transaction wrapper. If the second INSERT fails, the first commits → partial attribution. This function wraps both INSERTs atomically: both succeed or both rollback.

### Idempotency

Both INSERTs use `ON CONFLICT ON CONSTRAINT uq_contribution_booking DO NOTHING`. This constraint is `(tenant_id, role, source_booking_id)` — unchanged by M025-7.

### M025-7 impact

**None.** Migration 032 uses `uq_contribution_booking` exclusively. M025-7 only modified `uq_contribution_external` (used by adoption events). No functional change to migration 032 was needed.

### Security model

- Callable by `service_role` or `KORA_ADMIN` only
- `REVOKE ALL ... FROM PUBLIC; GRANT EXECUTE ... TO service_role;`
- Two contribution_event rows written atomically: `role='promoter'` (p_post_tenant_id) and `role='origin_employer'` (p_worker_tenant_id)
- No worker identity in output — only tenant-level signals

### Dependency

Must be applied after migration 025. No dependency on migration 033. Apply order: `025 → 032 → 033` or `025 → 033 → 032`.

### Caller update required (post Gate 3 apply)

`lib/commons/cross-company-attribution.ts` — `attributeContributionForBooking()` must be updated to call `.rpc('attribute_contribution_for_booking_atomic', {...})` via Supabase client. Caller stub is documented in migration 032 comments.

### Remaining risks

- Caller update not yet implemented (expected — Gate 3 is open)
- `KoraContributionService` does not yet consume booking attribution rows (expected — Gate 3 is open)

---

## 5. Migration 033 Final State

**File:** `supabase/proposed/033_initiative_adoption_source_model.sql`
**Feature:** `commons.initiative_adoption` — Company adoption/sponsorship source model
**Classification:** `READY_FOR_REVIEW`
**Applied:** NO

### What it creates

1. `commons.initiative_adoption` — company-level adoption/sponsorship decision table
2. `commons.create_initiative_adoption(...)` — SECURITY DEFINER: creates adoption records (COMPANY_ADMIN → proposed; KORA_ADMIN → any status)
3. `commons.attribute_contribution_for_adoption(p_adoption_id, ...)` — SECURITY DEFINER: generates contribution_event rows from an approved/active adoption

### Why it exists

Closes source gap G-2 (Taxonomy B — Adoption/Sponsorship). Without this table, the 6 adoption-type `contribution_kind` values added to migration 025's CHECK (M025-1) cannot be generated — there is no source event to trigger them.

### `commons.initiative_adoption` design

**Company-level only.** Records that a company decided to adopt/sponsor/support an initiative.  
**Not worker activity.** No `worker_identity_id`. No individual participation records. No booking references.

### adoption_type taxonomy (9 values)

```
formal_adoption          → contribution_kind: company_adoption,       role: adopter
sponsorship              → contribution_kind: company_sponsorship,     role: sponsor
support                  → contribution_kind: company_support,         role: supporter
promotion                → contribution_kind: company_support,         role: supporter
made_available           → contribution_kind: company_support,         role: supporter
cofunding                → contribution_kind: company_cofunding,       role: cofunder
kora_enabled_adoption    → contribution_kind: kora_enabled_adoption,   role: kora_enabler
kora_originated_adoption → contribution_kind: kora_originated_adoption, role: kora_enabler
partner_delivery         → contribution_kind: company_support,         role: partner
```

### adoption_status taxonomy (6 values)

```
proposed    -- company expressed interest
approved    -- KORA Admin approved
active      -- adoption in effect
completed   -- initiative concluded
cancelled   -- company withdrew
rejected    -- KORA Admin rejected
```

### source_origin taxonomy (6 values)

```
company_originated      -- another KORA company created the initiative
cross_company           -- cross-tenant collaborative
partner_originated      -- a KORA partner created it
territory_originated    -- territorial/community origin
kora_originated         -- KORA Foundation created it
kora_enabled            -- KORA platform enabled the connection
```

### RLS / grants model

- `commons.initiative_adoption`: KORA_ADMIN all; COMPANY_ADMIN/VIEWER SELECT own rows (adopter or origin)
- WORKER: no policy — deny-by-default
- `authenticated`: SELECT only (no direct INSERT/UPDATE — use RPC)
- `create_initiative_adoption`: EXECUTE granted to `authenticated` (function enforces role/tenant internally)
- `attribute_contribution_for_adoption`: EXECUTE granted to `service_role` only

### Idempotency (post M025-7)

Both INSERTs in `attribute_contribution_for_adoption()` use `ON CONFLICT ON CONSTRAINT uq_contribution_external DO NOTHING`.

The revised `uq_contribution_external` is `(tenant_id, source_post_id, contribution_kind, role, reporting_period)` — all 5 columns are present in both adoption INSERTs. This:
- Allows the same adoption to be re-attributed in a new reporting period (Q2 → Q3 = new row) ✓
- Separates adopter and promoter rows even in same-tenant edge cases (different `role`) ✓
- Allows multiple adoption types for same initiative (different `contribution_kind`) ✓

### Component contribution mapping

| Adoption type | V2 Component primarily fed |
|---|---|
| formal_adoption, sponsorship, support | Adoption & Reach (15%) |
| cofunding, kora_originated, kora_enabled | Ecosystem Contribution (20%) |
| (all, when evidence=partner_/advisor_verified) | Evidence Quality (25%) secondary |
| (all, if across multiple pillars) | Strategic Breadth (10%) secondary |

### What is NOT yet implemented (expected before Gate 3)

- Runtime service caller: no TypeScript/service layer calls `attribute_contribution_for_adoption()` yet
- `KoraContributionService` does not yet consume adoption rows for V2 computation
- `source_adoption_id` FK on `contribution_event` (deferred — ordering constraint with migration 033)
- RPC to update `privacy_threshold_met` once N≥10 booking data is confirmed for an adoption-linked initiative

### Compatibility with migration 025

Migration 033 requires migration 025 REVISED (M025-7) to be applied first. The prerequisite section in migration 033 explicitly states: "uq_contribution_external must be (tenant_id, source_post_id, contribution_kind, role, reporting_period) — the 5-column form."

### Compatibility with migration 032

Independent — no ordering dependency between 032 and 033. Both depend on 025.

---

## 6. Idempotency / Reporting Period Final Decision

### The problem (confirmed during Sprint 3)

`uq_contribution_external` was originally a 3-column constraint `(tenant_id, source_post_id, contribution_kind)`. This incorrectly blocked:

1. **Multi-period reporting:** Same company + same initiative + same kind in Q2 → Q3 would silently do nothing via `ON CONFLICT DO NOTHING`
2. **Same-tenant dual-role:** If origin and adopting company shared the same `tenant_id` (edge case), only one of adopter/promoter rows would survive

### The fix (M025-7)

`uq_contribution_external` expanded to `(tenant_id, source_post_id, contribution_kind, role, reporting_period)`:

| Scenario | Pre-M025-7 | Post-M025-7 |
|---|---|---|
| Same adoption in Q2 + Q3 | BLOCKED (second INSERT → DO NOTHING) | TWO ROWS (different `reporting_period`) ✓ |
| External participants Q2 + Q3 | BLOCKED | TWO ROWS ✓ |
| Adopter + promoter, same tenant | BLOCKED | TWO ROWS (different `role`) ✓ |
| Same booking attributed twice (idempotent) | OK via `uq_contribution_booking` | UNCHANGED ✓ |
| Multiple adoption types (adoption + sponsorship) | OK (different `contribution_kind`) | UNCHANGED ✓ |
| Cross-company dual rows, different tenants | OK (different `tenant_id`) | UNCHANGED ✓ |

### Why `source_adoption_id` was NOT added

A FK field `source_adoption_id → commons.initiative_adoption.id` would provide traceability but creates an apply-order impossibility: `commons.contribution_event` (defined in migration 025) cannot FK to `commons.initiative_adoption` (defined in migration 033, applied after). Adding it via ALTER TABLE in migration 033 is feasible but adds complexity for no immediate functionality gain. Deferred to a post-Pilot migration.

---

## 7. Privacy Boundary

### What employer roles (COMPANY_ADMIN / COMPANY_VIEWER) can access

- Aggregate company-level KORA Contribution signals via `commons.contribution_event` (own `tenant_id`)
- Booking count aggregates per initiative via `booking_aggregate_for_promoter()` (promoter's own initiatives only)
- Own `commons.initiative_adoption` records (as adopter or as origin company)

### What employer roles MUST NEVER access

- `commons.booking` table rows (no RLS policy exists for company roles — intentional deny)
- Any `worker_identity_id` in any form
- Individual booking details, individual participation, individual attendance records
- `personal.worker_pib` records (worker-private schema)
- Booking breakdowns below N=10 (`below_threshold` returned instead)

### Constitutional exclusions enforced at schema level

- `commons.contribution_event`: no `worker_identity_id`, no `worker_id`
- `commons.initiative_adoption`: no `worker_identity_id`, no `worker_id`, no individual booking reference
- WORKER has no RLS policy on `commons.contribution_event` or `commons.initiative_adoption` → deny-by-default

---

## 8. Apply Order / Gate 3 Dependencies

### Canonical apply sequence (DO NOT APPLY while Gate 3 is open)

```
Migration 025 (REVISED — M025-7)
  → Migration 032 (or 033 first — independent)
  → Migration 033

[Future] Migration 034 if needed:
  → KORA-originated / KORA-enabled flags on commons.post itself
  → source_adoption_id FK on commons.contribution_event (traceability deferred)
  → privacy_threshold_met update RPC
```

### Prerequisites before any apply

1. Gate 2 closed (CTO review of architecture and SQL)
2. Gate 3 closed (DPO/legal privacy review)
3. Staging environment provisioned and smoke tested
4. CTO + DPO sign-off on migration 025 (booking privacy model)
5. CTO + Legal sign-off on migration 033 (adoption model)
6. Staging apply + smoke test before any production apply

### What is NOT blocked by Gate 2 / Gate 3 (allowed now)

- Design review of migration SQL files
- Tests verifying migration design
- Service layer stub implementation (mock services)
- Documentation and handoff

---

## 9. Current Test State

### kora-contribution-hardening.test.ts

| Sprint | Describe block | Tests |
|---|---|---|
| Hardening foundation | 1–18 | 132 |
| Sprint 1 — Migration 025 revision | 19 | 57 |
| Sprint 2 — Migration 033 design | 20 | 62 |
| Sprint 3 — Idempotency M025-7 | 21 | 32 (new) |
| **Subtotal** | **21 blocks** | **226** |

**Result (as of `6384026`):** 226/226 passing

### Full suite

**8048/8048 passing** (191 test files)

### TypeScript

`npx tsc --noEmit` — clean (no errors)

---

## 10. Remaining Risks

| Risk | Severity | Status |
|---|---|---|
| `privacy_threshold_met` always written as `false` — no RPC to update after N≥10 confirmed | Medium | Deferred to post-Gate-3 sprint |
| `source_adoption_id` FK missing from `contribution_event` (traceability gap) | Low | Deferred — ordering constraint with mig 033 |
| Service layer callers not implemented (`attributeContributionForBooking`, `attributeContributionForAdoption`) | Expected | Not a risk — Gate 3 open |
| `KoraContributionService` not consuming adoption rows in V2 computation | Expected | Not a risk — Gate 3 open |
| KORA-originated / KORA-enabled fields on `commons.post` not yet added (migration 034 candidate) | Low | Tracked in Pre-Pilot Plan |
| No staging smoke test yet | High pre-apply | Required before Gate 3 apply |
| CTO / DPO review not yet completed | Blocking | Required before apply |

---

## 11. Recommended Next Step

**Current state:** commits pushed (`6384026` on `origin/main`). All three migrations are `READY_FOR_REVIEW`. Tests green. tsc clean.

**Best next action:** Open a new session. The session context is at capacity. The handoff document you are reading is the clean continuation point.

**Options for next session:**

| Option | Description | Priority |
|---|---|---|
| **E** | Prepare CTO review checklist for migrations 025 / 032 / 033 | High — Gate 2 prerequisite |
| **B** | Design migration 034 for KORA-originated/KORA-enabled fields on `commons.post` | Medium |
| **F** | Continue in a new session using this handoff as starting context | Recommended now |
| C | Design service-layer adoption caller (TypeScript) | After Gate 3 |
| D | Design Contribution V2 live ingestion of adoption rows | After Gate 3 |

**Do not do in next session:** options C and D require Gate 3 to be closed first.

---

## 12. Do Not Do Yet

The following actions are explicitly prohibited until the corresponding gates close:

```
✗ DO NOT apply migration 025
✗ DO NOT apply migration 032
✗ DO NOT apply migration 033
✗ DO NOT run supabase db push
✗ DO NOT run supabase migration up
✗ DO NOT execute SQL against staging or production
✗ DO NOT touch production (Gate 2 + Gate 3 both open)
✗ DO NOT close Gate 3 (requires DPO/legal/CTO review)
✗ DO NOT use real worker data
✗ DO NOT claim Pilot readiness
✗ DO NOT claim Contribution source layer is live
✗ DO NOT make KORA Contribution a KORA Index component (constitutional rule)
✗ DO NOT introduce worker ranking
✗ DO NOT introduce individual contribution scores
✗ DO NOT expose individual worker activity to employer roles
✗ DO NOT generate SQL DDL outside the gate process
✗ DO NOT print secrets / tokens / connection strings / passwords
✗ DO NOT add a new KORA Index component (10 components is fixed)
```
