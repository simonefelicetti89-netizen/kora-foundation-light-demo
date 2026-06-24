# KORA Space Contribution Source Layer — Pre-Pilot Plan
**Type:** Design + Review + Docs (no migrations applied, no production changes)  
**Date:** 2026-06-24  
**Gate status:** Gate 2 OPEN (no SQL applied) · Gate 3 OPEN (no live worker data)  
**Based on:** KORA Space → Contribution V2 Integration Audit (`b4df933`) + deep migration review  
**Critical finding:** Proposed migration `026_contribution_atomic_attribution.sql` has a NUMBER CONFLICT with applied migration `026_company_route_rls_gaps.sql`. Must be renumbered to `032_*` before any apply.

---

## 0. Safety Confirmation

| Item | Status |
|---|---|
| Branch `main`, HEAD `b4df933` | ✓ |
| Working tree clean (`supabase/.temp/` untracked only) | ✓ |
| Production not linked or targeted | ✓ |
| Gate 3 OPEN | ✓ |
| No real worker data created | ✓ |
| No secrets/tokens printed | ✓ |
| No migrations applied | ✓ |
| KORA Contribution outside KORA Index | ✓ |
| KORA Index formula unchanged | ✓ |
| No worker ranking or individual contribution score | ✓ |

---

## 1. Migration 025 Review

**File:** `supabase/migrations/025_commons_booking_contribution.sql`  
**Status:** Written in migrations directory — NOT applied to any database

### 1.1 Tables Created

**`commons.booking`**

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid PRIMARY KEY DEFAULT gen_random_uuid()` | — |
| `post_id` | `uuid NOT NULL REFERENCES commons.post(id) ON DELETE CASCADE` | — |
| `worker_identity_id` | `uuid NOT NULL REFERENCES personal.worker_identity(id)` | Worker identity stored here; no company RLS |
| `worker_tenant_id` | `uuid NOT NULL` | Denormalized for query efficiency |
| `post_tenant_id` | `uuid NOT NULL` | Denormalized |
| `status` | `text NOT NULL DEFAULT 'pending' CHECK IN (pending/approved/rejected/cancelled/attended)` | — |
| `moderation_notes` | `text NULL` | Admin-only |
| `moderated_by` | `uuid NULL REFERENCES auth.users(id)` | Admin only |
| `moderated_at` | `timestamptz NULL` | — |
| `attended_at` | `timestamptz NULL` | — |
| `created_at / updated_at` | `timestamptz NOT NULL DEFAULT now()` | Trigger on UPDATE |

Constraint: `UNIQUE(post_id, worker_identity_id)` — prevents duplicate bookings.  
Indexes: `post_id`, `worker_identity_id`, `status`, `post_tenant_id`, `worker_tenant_id`.

**`commons.contribution_event`**

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid PRIMARY KEY` | — |
| `tenant_id` | `uuid NOT NULL` | Company aggregate — RLS uses this |
| `source_booking_id` | `uuid NULL REFERENCES commons.booking(id)` | Stored for idempotency; NOT exposed to company via service layer |
| `source_post_id` | `uuid NOT NULL REFERENCES commons.post(id)` | Initiative ID |
| `role` | `text NOT NULL CHECK IN ('promoter','origin_employer')` | **Too narrow** — see revision needed |
| `contribution_kind` | `text NOT NULL CHECK IN ('cross_company_participation','external_participants_event')` | **Too narrow** — see revision needed |
| `impact_weight` | `numeric(8,4) NOT NULL` | Pre-empirical values: promoter=1.00, origin=0.50, external_verified=0.72, external_self_declared=0.48 |
| `evidence_status` | `text NOT NULL CHECK IN ('verified','self_declared')` | **Too narrow** — see revision needed |
| `reporting_period` | `text NOT NULL` | e.g. `2026-Q2` |
| `created_at` | `timestamptz NOT NULL DEFAULT now()` | — |

Constraints:  
- `UNIQUE(tenant_id, role, source_booking_id)` DEFERRABLE — idempotency for booking-sourced rows  
- `UNIQUE(tenant_id, source_post_id, contribution_kind)` DEFERRABLE — idempotency for external participant rows

**Extension to `personal.worker_pib`:**  
`ADD COLUMN source_booking_id uuid REFERENCES commons.booking(id)` + unique index on `(worker_identity_id, source_booking_id, pillar) WHERE source_booking_id IS NOT NULL`.

### 1.2 RLS Policies

| Table | Role | Operations | Condition |
|---|---|---|---|
| `commons.booking` | `KORA_ADMIN` | ALL | `kora.kora_role() = 'KORA_ADMIN'` |
| `commons.booking` | `WORKER` | ALL | `kora.kora_role() = 'WORKER' AND worker_identity_id IN (SELECT id FROM personal.worker_identity WHERE auth_user_id = auth.uid())` |
| `commons.booking` | COMPANY | — | **No policy = 0 rows for employer** (intentional, documented) |
| `commons.contribution_event` | `KORA_ADMIN` | ALL | `kora.kora_role() = 'KORA_ADMIN'` |
| `commons.contribution_event` | `COMPANY_ADMIN` / `COMPANY_VIEWER` | SELECT | `kora.kora_role() IN ('COMPANY_ADMIN','COMPANY_VIEWER') AND tenant_id = kora.tenant_id()` |
| `commons.contribution_event` | WORKER | — | **No policy = 0 rows for worker** (intentional) |

### 1.3 SECURITY DEFINER Function

**`commons.booking_aggregate_for_promoter(p_post_id uuid)`**  
Returns: `TABLE(booking_status text, booking_count bigint)`

- `SECURITY DEFINER`, search_path locked
- Verifies caller is `KORA_ADMIN` or `COMPANY_ADMIN`
- Verifies `COMPANY_ADMIN` caller's tenant matches post's tenant
- Returns only `{status, count}` pairs — never individual rows
- `GRANT EXECUTE ... TO authenticated`

### 1.4 Grants (Current — Some Need Revision)

```sql
GRANT SELECT, INSERT, UPDATE ON commons.booking TO authenticated;
GRANT SELECT, INSERT, UPDATE ON commons.contribution_event TO authenticated;
GRANT EXECUTE ON FUNCTION commons.booking_aggregate_for_promoter(uuid) TO authenticated;
```

### 1.5 Privacy Assessment

| Item | Status |
|---|---|
| `worker_identity_id` stored in `commons.booking` | Worker-private by RLS (no company policy) |
| `source_booking_id` in `commons.contribution_event` | Present for idempotency; service layer never selects it in company views |
| Employer sees individual booking rows | NO — no COMPANY RLS policy on `commons.booking` |
| `booking_aggregate_for_promoter()` privacy-safe | YES — returns `{status, count}` only |
| N≥10 threshold enforced | **NO** — see Issue M025-4 below |

### 1.6 Issues Requiring Revision Before Apply

| ID | Severity | Issue |
|---|---|---|
| **M025-1** | HIGH | `contribution_kind` CHECK constraint too narrow (`cross_company_participation \| external_participants_event`). Future event types (adoption/sponsorship, aggregate_feedback, replication) cannot be inserted without altering the constraint. Must be extended or replaced with a validated ENUM before Pilot. |
| **M025-2** | HIGH | `evidence_status` CHECK constraint too narrow (`verified \| self_declared`). Future signals may need `partner_verified`, `advisor_verified`. Extend or use ENUM. |
| **M025-3** | HIGH | `role` CHECK constraint too narrow (`promoter \| origin_employer`). Future roles: `adoption_registrant`, `replication_host`. Extend before adding adoption events. |
| **M025-4** | HIGH | `booking_aggregate_for_promoter()` has **no minimum N threshold**. A promoter company can receive `{pending:1, approved:1}` with N=2, potentially allowing inference about individual workers. Must add: if total count < privacy_threshold (N≥10) then bucket counts into `{'below_threshold': total_count}` or return null. |
| **M025-5** | MEDIUM | `GRANT SELECT, INSERT, UPDATE ON commons.contribution_event TO authenticated` is overly broad. Company/worker roles should never INSERT directly into `contribution_event` — only via SECURITY DEFINER attribution functions called by service_role. Should be: `GRANT SELECT ON commons.contribution_event TO authenticated` only. INSERTs go via function grants. |
| **M025-6** | LOW | No `is_kora_originated`, `is_kora_enabled`, or `adoption_type` columns anywhere. If KORA-originated/adoption signals are in Pilot scope, they need schema fields. |

### 1.7 Migration 025 Classification

**REVISE_BEFORE_APPLY**

Migration 025 is structurally sound for the booking + basic cross-company participation signal path. All RLS, SECURITY DEFINER, and privacy boundaries are correctly designed. However, six issues (M025-1 through M025-6) should be addressed before applying to any live or staging database to avoid schema migrations post-apply that require ALTER TABLE with data.

The safest approach is to revise the file to address M025-1 through M025-5 before Gate 3 closes, so the first apply produces a schema that can accommodate Pilot event types without immediate follow-up ALTER operations.

---

## 2. Proposed Migration 026 Review

**File:** `supabase/proposed/026_contribution_atomic_attribution.sql`  
**Status:** Proposed — NOT in forward migration pipeline

### 2.1 Function Created

**`commons.attribute_contribution_for_booking_atomic(p_booking_id, p_post_id, p_post_tenant_id, p_worker_tenant_id, p_reporting_period, p_promoter_weight, p_origin_weight)`** → `jsonb`

### 2.2 Transaction Safety

**YES** — being called as a single PostgreSQL RPC call means both INSERTs execute within the same implicit DB transaction. The `EXCEPTION WHEN OTHERS THEN RAISE;` block re-raises any error, rolling back both INSERTs atomically. This directly addresses C-9 (sequential INSERT risk in the current TypeScript-level `attributeContributionForBooking()`).

### 2.3 Idempotency

**YES** — both INSERTs use `ON CONFLICT ON CONSTRAINT ... DO NOTHING`. `GET DIAGNOSTICS v_written = ROW_COUNT` counts actually-written rows. Safe to call twice with the same `bookingId`.

### 2.4 Privacy Boundary

**SAFE** — writes `tenant_id`, `source_booking_id`, `source_post_id`, `role`, `contribution_kind`, `impact_weight`, `evidence_status`, `reporting_period`. `worker_identity_id` is NEVER written to `commons.contribution_event`.

### 2.5 Security Model

- `SECURITY DEFINER`, `search_path` locked
- Caller role check: only `KORA_ADMIN`, `service_role`, `postgres` may call
- `REVOKE ALL ON FUNCTION ... FROM PUBLIC`
- `GRANT EXECUTE ... TO service_role`
- **Correct** — this is more restrictive than direct-table grants in mig 025

### 2.6 Issues Requiring Revision

| ID | Severity | Issue |
|---|---|---|
| **M026-1** | **CRITICAL** | Filename `026_contribution_atomic_attribution.sql` conflicts with applied migration `026_company_route_rls_gaps.sql`. **Must be renamed to `032_contribution_atomic_attribution.sql`** (next available after `031_revoke_public_execute_uef_definer_functions.sql`) before being placed in the migrations directory. |
| **M026-2** | MEDIUM | Should add a `PREREQUISITES` check at the top: `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'commons' AND table_name = 'contribution_event') THEN RAISE EXCEPTION 'migration 025 must be applied before 032'; END IF; END $$;` |
| **M026-3** | LOW | After caller update (`attributeContributionForBooking` → RPC call), the original TypeScript function in `lib/commons/cross-company-attribution.ts` should be deprecated. Document in PR description, not in SQL. |

### 2.7 Merge vs Separate Decision

**KEEP_SEPARATE** — the schema migration (mig 025) and the attribution RPC (mig 032) should be independently reviewable and independently deployable. CTO review should cover 032 separately from 025.

### 2.8 Migration 026 Classification

**REVISE_BEFORE_REVIEW** → after renaming to 032 and adding prerequisites check: **READY_FOR_REVIEW**

---

## 3. Missing Event Taxonomy

### A. Booking / Participation

| Event Type | Eligibility | Source | V2 Component(s) | Aggregation Rule | Privacy | Confidence | Gate 3? | DB Migration? | Seed/Demo? |
|---|---|---|---|---|---|---|---|---|---|
| `booking_created` | Weak eligible (interest signal only) | `commons.booking.status=pending` | Adoption & Reach (weak) | Count per initiative per tenant per period, N≥10 | Aggregate count only; no worker identity | Low — intent, not activation | Yes | Yes (mig 025) | No |
| `booking_approved` | Eligible (stronger interest signal) | `commons.booking.status=approved` | Adoption & Reach (15%) | Count per initiative per tenant per period, N≥10 | Same | Medium | Yes | Yes (mig 025) | No |
| `attendance_marked` | **Core eligible** | `commons.booking.status=attended` → `commons.contribution_event` | Activation Depth (30%) + Evidence Quality (25%) | `sum(impact_weight)` per tenant per period; N≥10 | Company sees own aggregate weight only | High — admin-verified | Yes | Yes (mig 025) | Via collective-initiatives.json proxy |
| `participation_completed` | Eligible | `commons.booking.status=completed` | Activation Depth (30%) | Distinct completion count per initiative; N≥10 | Aggregate count | High — stronger than attended | Yes | Yes (mig 025) | No |

### B. Adoption / Sponsorship

| Event Type | Eligibility | Source | V2 Component(s) | Aggregation Rule | Privacy | Confidence | Gate 3? | DB Migration? | Seed/Demo? |
|---|---|---|---|---|---|---|---|---|---|
| `company_adopted_initiative` | **Core eligible** | New: `commons.post.adoption_status` OR new `commons.initiative_adoption` table | Adoption & Reach (15%) + Ecosystem Contribution (20%) | Binary per initiative per tenant; verify with at least one activation event | Tenant-level flag; no individual identity | High if paired with activation evidence | Yes | Yes (schema extension needed) | Seed field possible |
| `company_sponsored_initiative` | Eligible | New: sponsorship field on `commons.post` or adoption table | Adoption & Reach (15%) | Binary per initiative per tenant | Same | Medium — no activation proof required | Yes | Yes | Seed field possible |
| `company_supported_initiative` | Eligible | New: support signal | Adoption & Reach (15%) | Binary | Same | Medium | Yes | Yes | Seed field possible |
| `company_cofunded_initiative` | Eligible | New: financial backing evidence | Adoption & Reach (15%) + Ecosystem Contribution (20%) | Binary + optional evidence | Same | High if verified | Yes | Yes | No |
| `company_made_available_initiative` | Weak eligible | Existing: `commons.post` publishing for own workers | Adoption & Reach (weak proxy) | Initiative count per tenant per period | Company-level | Low — availability ≠ activation | No | No (implicit) | Yes (current proxy) |

**Implementation requirement for B:** Need to add either:
- `adoption_type text NULL` column to `commons.post`, or
- New `commons.initiative_adoption` table with `(initiative_id, tenant_id, adoption_type, evidence_status, adopted_at)`

Recommend: new `commons.initiative_adoption` table (cleaner; avoids bloating `commons.post`). This is a new migration, not part of mig 025.

### C. KORA-Originated / KORA-Enabled

| Event Type | Eligibility | Source | V2 Component(s) | Aggregation Rule | Privacy | Confidence | Gate 3? | DB Migration? | Seed/Demo? |
|---|---|---|---|---|---|---|---|---|---|
| `kora_originated_initiative_created` | **Eligible only if adopted** | `commons.post.is_kora_originated = true` (new column) | Ecosystem Contribution (20%) — only after activation | Count of KORA-originated initiatives adopted + activated by ≥1 company | Tenant-level; no individual | High — KORA source is verifiable | Yes | Yes (column on `commons.post`) | Config declares intent |
| `kora_enabled_initiative_created` | **Eligible only if adopted** | `commons.post.is_kora_enabled = true` (new column) | Ecosystem Contribution (20%) — only after activation | Same | Same | High | Yes | Yes | Config declares intent |
| `kora_originated_adopted_by_company` | **Core eligible** | Intersection of `is_kora_originated=true` + company adoption event | Ecosystem Contribution (20%) + Adoption & Reach (15%) | Count of companies that adopted a KORA-originated initiative | Tenant-level aggregate | High | Yes | Yes | No |
| `kora_enabled_adopted_by_company` | **Core eligible** | Same for `is_kora_enabled=true` | Ecosystem Contribution (20%) + Adoption & Reach (15%) | Same | Same | High | Yes | Yes | No |

**Implementation requirement for C:**
1. Add `is_kora_originated boolean DEFAULT false` and `is_kora_enabled boolean DEFAULT false` to `commons.post`
2. Add `is_kora_originated boolean DEFAULT false` and `is_kora_enabled boolean DEFAULT false` to `commons.contribution_event` (for propagation)
3. Update `attributeContributionForBooking()` to read these flags from `commons.post` and pass them through
4. Update `isContributionEligibleEvent()` or add a new `isKoraOriginatedAdoption()` helper
5. Update `computeContributionV2()` to apply contribution to Ecosystem Contribution when `is_kora_originated=true` and adoption is confirmed

### D. Feedback / Value

| Event Type | Eligibility | Source | V2 Component(s) | Aggregation Rule | Privacy | Confidence | Gate 3? | DB Migration? | Seed/Demo? |
|---|---|---|---|---|---|---|---|---|---|
| `aggregate_rating` | Eligible (aggregate only) | Future: `commons.post_rating` table, aggregate per initiative | Adoption & Reach (15%) | Average + count per initiative; N≥10; company sees aggregate only | **NEVER expose individual rating to employer** | Medium | Yes | Yes (new table) | No |
| `aggregate_feedback` | Eligible (aggregate only) | Future: moderated aggregate signals | Adoption & Reach (15%) + Evidence Quality (25%) | Count of feedback events per initiative per period; N≥10 | **NEVER expose individual feedback text** | Medium | Yes | Yes | No |
| `aggregate_follow_up_request` | Eligible | Future: follow-up signals from KORA Space | Activation Depth (30%) (recurrence signal) | Count per initiative per period; N≥10 | Aggregate only | Medium | Yes | Yes | No |
| `recurring_need_signal` | Eligible | Future: periodic recurring request aggregate | Adoption & Reach (15%) | Cross-period recurring count; N≥10 | Aggregate only | High — sustained interest | Yes | Yes | No |

All D-category signals: marked "Future signal — not in Foundation Light" in `contribution-methodology.ts`. Low priority for Pilot. High privacy risk if implemented without strict aggregation.

### E. Replication / Scale

| Event Type | Eligibility | Source | V2 Component(s) | Aggregation Rule | Privacy | Confidence | Gate 3? | DB Migration? | Seed/Demo? |
|---|---|---|---|---|---|---|---|---|---|
| `initiative_replicated` | Eligible | Future: `commons.post` replication link or new `commons.initiative_replication` table | Ecosystem Contribution (20%) + Adoption & Reach (15%) | Count of distinct replicating companies per original initiative | Aggregate; no individual | High — strong ecosystem signal | Yes | Yes | No |
| `initiative_scaled` | Eligible | Future: cross-period participant count growth | Ecosystem Contribution (20%) | Growth rate per initiative; N≥10 baseline | Aggregate | High | Yes | Yes | No |
| `cross_company_replication` | Eligible | Intersection of replication + cross-company confirmation | Ecosystem Contribution (20%) | Count of cross-company replications | Aggregate | Very high | Yes | Yes | No |

Config explicitly sets `replication_scalability: false` — deliberate deferral. No Pilot implementation expected. Post-Pilot Delphi Study item.

### F. Blocked / Excluded

| Event Type | Block Reason | Current Enforcement | Enforcement Gap? |
|---|---|---|---|
| `compliance_mandatory_event` | Baseline — not ecosystem contribution | `blocked_compliance` not in `CONTRIBUTION_ACTION_FAMILIES` | No gap — structural exclusion correct |
| `cash_like_benefit_only` | No activation signal | `economic_relief` not in `CONTRIBUTION_ACTION_FAMILIES` | No gap |
| `individual_action_only` | No collective signal | Pillar-only match removed (C-5) | Partial gap: no explicit `is_individual_only` guard in eligibility fn |
| `low_threshold_reidentification_risk` | Privacy risk | Not yet enforced at V2 computation level | **Gap** — N≥10 not checked inside `computeContributionV2()` |
| `employer_visible_individual_activity` | Privacy red line | RLS + service layer SELECT exclusions | Correct; no gap in current paths |

---

## 4. Contribution Event Schema Contract

Target schema for `commons.contribution_event` after revision (do NOT apply yet):

```sql
commons.contribution_event (
  id                     uuid           PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id              uuid           NOT NULL,                                    -- company aggregate owner
  initiative_id          uuid           NOT NULL REFERENCES commons.post(id),        -- replaces source_post_id
  source_booking_id      uuid           NULL REFERENCES commons.booking(id),         -- idempotency; never exposed to company
  source_type            text           NOT NULL,                                    -- 'booking', 'external_participants', 'adoption', 'sponsorship', 'replication'
  event_type             text           NOT NULL,                                    -- specific event: 'attendance_marked', 'company_adopted', etc.
  contribution_kind      text           NOT NULL,                                    -- 'cross_company_participation', 'adoption_event', 'ecosystem_signal', etc.
  role                   text           NOT NULL,                                    -- 'promoter', 'origin_employer', 'adopter', 'sponsor'
  pillar                 text           NULL,                                        -- LIFE/GROWTH/CONNECTION/IMPACT/LEGACY
  contribution_component_hint text      NULL,                                        -- 'activation_depth', 'ecosystem_contribution', etc.
  aggregate_count        integer        NULL,                                        -- N for aggregate signals
  impact_weight          numeric(8,4)   NOT NULL,
  evidence_level         text           NOT NULL DEFAULT 'self_declared',           -- 'verified', 'partner_verified', 'advisor_verified', 'self_declared'
  confidence_source      text           NULL,                                        -- basis for confidence: 'admin_verified', 'partner_confirmed', etc.
  period_start           timestamptz    NULL,
  period_end             timestamptz    NULL,
  reporting_period       text           NOT NULL,
  privacy_threshold_met  boolean        NOT NULL DEFAULT false,                      -- true if aggregate_count >= 10
  origin_company_id      uuid           NULL,                                        -- nullable: company whose workers participated
  promoter_company_id    uuid           NULL,                                        -- nullable: company that hosted the initiative
  partner_id             uuid           NULL,                                        -- nullable: if partner-led
  is_cross_company       boolean        NOT NULL DEFAULT false,
  is_kora_originated     boolean        NOT NULL DEFAULT false,
  is_kora_enabled        boolean        NOT NULL DEFAULT false,
  adoption_type          text           NULL,                                        -- 'sponsored', 'cofunded', 'promoted', 'made_available'
  created_at             timestamptz    NOT NULL DEFAULT now()

  -- Explicitly excluded:
  -- worker_identity_id   — NEVER in contribution_event
  -- worker_id            — NEVER in contribution_event
  -- individual comments  — NEVER in contribution_event
  -- individual ratings   — NEVER in contribution_event
  -- individual booking detail visible to company — NEVER
)
```

**Key decisions:**
- `worker_identity_id` is NEVER in `contribution_event`. This is a constitutional invariant, not a preference.
- `source_booking_id` is present for idempotency enforcement only. It is NEVER exposed in company-facing SELECT queries. Service layer must enforce this explicitly.
- `privacy_threshold_met` is a DB-level field set at INSERT time. It gates company-facing aggregate views at the service layer.
- `aggregate_count` allows the service layer to enforce N≥10 suppression without re-querying `commons.booking`.
- `is_kora_originated` and `is_kora_enabled` propagated from `commons.post` at attribution time.

---

## 5. N≥10 Privacy Threshold Contract

### 5.1 Rule Definition

| Rule | Value | Rationale |
|---|---|---|
| `safe_aggregation_threshold` | N ≥ 10 | Existing KORA-wide constant. Re-identification risk below this value. |
| Contribution event minimum | N ≥ 10 eligible events OR `insufficient_signal` state | Aligns contribution threshold with KORA-wide privacy standard |
| `insufficient_signal_min_events` (current) | 2 | **Misaligned with N≥10** — must be revised to 10, or a separate privacy-threshold field must gate company views independently |
| Maturity band suppression | Show `insufficient_signal` if N < threshold OR confidence < 0.20 | Current confidence guard partially covers this; N check is too weak (N=2) |

### 5.2 Enforcement Layers (required at each)

**Layer 1 — DB function (highest priority):**

`booking_aggregate_for_promoter()` must bucket counts when total N < 10:
```sql
-- If sum(count) < 10: return ('below_threshold', total_count) instead of per-status breakdown
-- This prevents inferring individual status from small-N data
IF (SELECT SUM(booking_count) FROM ...) < 10 THEN
  RETURN QUERY SELECT 'below_threshold'::text, (SELECT SUM(count))::bigint;
  RETURN;
END IF;
```

`commons.attribute_contribution_for_booking_atomic()` (mig 032): set `privacy_threshold_met = (SELECT COUNT(*) FROM commons.contribution_event WHERE initiative_id = p_post_id AND role = 'promoter') >= 10` at time of insert.

**Layer 2 — Service layer:**

`getContributionPromoterView()` and `getContributionOriginEmployerView()`: before returning data, check `SUM(aggregate_count) >= 10`. If not met, return aggregate with `below_threshold: true` flag and suppress component breakdown.

`computeContributionV2()`: update `insufficient_signal_min_events` in config from `2` → `10`, or add a separate `privacy_threshold_min_events` check that gates the maturity band independently of the confidence gate.

**Layer 3 — Service result contract:**

`ContributionV2Result.insufficientSignal` should be `true` when either:
- N < `privacy_threshold_min_events` (10), OR  
- `confidence < 0.20`

This means `insufficient_signal` displays when data is too thin for privacy-safe aggregation, not just when it's uncertain.

**Layer 4 — UI:**

The existing `data-testid="contribution-insufficient-signal"` element correctly renders when `insufficientSignal=true`. No UI change needed — just align the service layer computation.

**Layer 5 — Tests:**

Add tests to `b166-bookings-contribution.test.ts`:
- `booking_aggregate_for_promoter` SQL must contain threshold check (source analysis test)
- Service layer suppresses output when N < 10
- `ContributionV2Result.insufficientSignal=true` when aggregate_count < 10

### 5.3 Threshold Config Change Required

In `data/methodology/methodology-config.json → kora_contribution_v2.thresholds`:

```json
{
  "insufficient_signal_min_events": 10,    // CHANGE from 2 → 10 (align with N≥10 privacy standard)
  "privacy_threshold_min_events": 10,      // NEW — explicit privacy gate (separate from confidence gate)
  "activation_depth_iu_reference": 10.0,
  "adoption_reach_event_reference": 5,
  "evidence_shrinkage_k": 5,
  "evidence_shrinkage_prior": 0.50
}
```

Note: `insufficient_signal_min_events=2` was correct as a confidence threshold (signal quality), but was unintentionally also serving as the only guard against small-N aggregation. Separating them makes intent explicit.

---

## 6. Source Event → V2 Component Mapping

### 6.1 Core Signal Mapping

| Source Event | V2 Component(s) | Weight | Input Used | Evidence Level | Privacy Threshold |
|---|---|---|---|---|---|
| `attendance_marked` | Activation Depth (primary) | 30% | `impact_weight` per event → `totalIU` | `verified` (admin marks) | N≥10 at initiative level |
| `attendance_marked` | Evidence Quality | 25% | `evidence_level=verified` → contributes to shrinkage estimator numerator | `verified` | N≥10 |
| `participation_completed` | Activation Depth | 30% | Additional weight vs `attended` | `verified` or `partner_verified` | N≥10 |
| `company_adopted_initiative` | Adoption & Reach | 15% | Count of distinct adopted initiatives per tenant | `self_declared` (declaration) or `verified` (activation proof) | Tenant-level (company-aggregate, no N floor needed) |
| `company_adopted_initiative` | Ecosystem Contribution | 20% | Fraction of adopted initiatives that are cross-company | Same | Tenant-level |
| `company_sponsored_initiative` | Adoption & Reach | 15% | Count of distinct sponsored initiatives | `self_declared` | Tenant-level |
| `kora_originated_adopted_by_company` | Ecosystem Contribution | 20% | `is_kora_originated=true` + adoption confirmed | `verified` (KORA Admin) | Tenant-level |
| `kora_enabled_adopted_by_company` | Ecosystem Contribution | 20% | `is_kora_enabled=true` + adoption confirmed | `verified` | Tenant-level |
| `aggregate_feedback` | Adoption & Reach | 15% | Moderated aggregate count per initiative | `self_declared` (or higher if moderated) | N≥10 |
| `aggregate_feedback` | Evidence Quality | 25% | Sustained engagement signal → improves shrinkage estimator | `self_declared` | N≥10 |
| `aggregate_follow_up_request` | Activation Depth | 30% | Recurrence signal → additive to totalIU | `self_declared` | N≥10 |
| `initiative_replicated` | Ecosystem Contribution | 20% | Count of companies that replicated; fraction of total eligible events | `verified` (new host publishes) | Tenant-level |
| `initiative_replicated` | Adoption & Reach | 15% | Replication = strong adoption signal | `verified` | Tenant-level |
| `cross_company_replication` | Ecosystem Contribution | 20% | Subset of initiative_replicated across company boundaries | `verified` | Tenant-level |
| Strategic pillar coverage | Strategic Breadth | 10% | Activated across ≥2 distinct pillars required before full contribution to breadth | Derived | Only after activation floor |

### 6.2 Blocked / Limited Sources

| Source Event | Disposition | Reason |
|---|---|---|
| `compliance_mandatory_event` | **BLOCKED** | `blocked_compliance` not in `CONTRIBUTION_ACTION_FAMILIES` — correct structural exclusion |
| `cash_like_benefit_only` | **BLOCKED** | `economic_relief` not in `CONTRIBUTION_ACTION_FAMILIES` |
| `individual_action_only` | **BLOCKED** | No collective signal; pillar-only match removed (C-5) |
| Feedback/rating with N < 10 | **SUPPRESSED** | Privacy threshold; shown as `insufficient_signal` |
| `booking_created` alone (no attendance) | **LIMITED** | Weak signal — may contribute to confidence / interest count but not Activation Depth |
| KORA-originated initiative without adoption | **LIMITED** | Config rule: "only if adopted" — creation alone has no contribution weight |

### 6.3 Current vs Target Signal Coverage

| V2 Component | Current FL Signal Source | Target Pilot+ Source | Gap |
|---|---|---|---|
| Activation Depth (30%) | Seed proxy IU (`participation_count × 0.80 × BC × EV × 0.10`) | `attendance_marked` → `impact_weight` via contribution_event | Replace `× 0.10` proxy with real contribution_event `impact_weight` |
| Evidence Quality (25%) | `VERIFICATION_TO_EV` mapper on seed field | `evidence_level` from contribution_event rows | Upgrade shrinkage estimator input source |
| Ecosystem Contribution (20%) | Seed `event_nature` inference | `is_cross_company=true` on contribution_event + KORA-originated if implemented | Add `is_kora_originated` path |
| Adoption & Reach (15%) | Count of seed initiatives (N=2–4) | `company_adopted_initiative` events + booking count | New adoption event type + booking contribution count |
| Strategic Breadth (10%) | Seed `action_family` and `pillar` diversity | `pillar` from `commons.post` via `contribution_event` join | Natural upgrade when live; join already in `getContributionPromoterView()` |
| Confidence | Proxy from N, evidenceQuality, crossFlag | Real event count, real evidence distribution, real cross-company ratio | Natural upgrade; also fix N≥10 minimum |

---

## 7. Implementation Sequence

### Stage 1 — Safe Now (No Migration, No Runtime Code Change)

**S1-A: Revise `methodology-config.json` threshold**
- Change `insufficient_signal_min_events: 2` → add `privacy_threshold_min_events: 10` (new field)
- Keep `insufficient_signal_min_events` at 2 (confidence signal quality) but add the privacy gate as a separate field
- Risk: None — only read by `computeContributionV2()` which must be updated to check both
- Blocking: None

**S1-B: Update `KORA_CONTRIBUTION_METHODOLOGY.md`**
- Add §13 "Pre-Pilot Known Gaps" with all confirmed gaps from this audit
- Add §14 "Migration 025 Revision Requirements" with M025-1 through M025-6
- Add §15 "Proposed Migration 026 Renaming" (must become 032)
- Risk: None

**S1-C: Add adoption/sponsorship and KORA-originated types to doctrine constants**
- In `lib/kora-contribution/contribution-methodology.ts`: add `CONTRIBUTION_ADOPTION_TYPES` and `CONTRIBUTION_KORA_ORIGIN_SIGNALS` constants (type definitions only, no runtime logic)
- Risk: Low — adding constants does not alter runtime behavior

**S1-D: Rename proposed migration `026` to `032`**
- Rename `supabase/proposed/026_contribution_atomic_attribution.sql` → `supabase/proposed/032_contribution_atomic_attribution.sql`
- Update header comment with correct number and prerequisite note
- Risk: None — file rename in `proposed/` directory, not applied
- Critical: Prevents future numbering conflict

**S1-E: Update hardening tests**
- Assert: `supabase/migrations/026_company_route_rls_gaps.sql` exists (already applied)
- Assert: `supabase/proposed/032_contribution_atomic_attribution.sql` exists (renamed from 026)
- Assert: `supabase/proposed/026_contribution_atomic_attribution.sql` does NOT exist (old name gone)

### Stage 2 — Migration Preparation (Before Gate 3, No Apply)

**S2-A: Revise migration 025**
- Extend `contribution_kind` CHECK: add `'adoption_event'`, `'ecosystem_signal'`, `'replication_event'`
- Extend `evidence_status` CHECK: add `'partner_verified'`, `'advisor_verified'`
- Extend `role` CHECK: add `'adopter'`, `'sponsor'`
- Add `privacy_threshold_met boolean NOT NULL DEFAULT false`
- Add `aggregate_count integer NULL`
- Add `is_kora_originated boolean NOT NULL DEFAULT false`
- Add `is_kora_enabled boolean NOT NULL DEFAULT false`
- Add N≥10 threshold guard to `booking_aggregate_for_promoter()`
- Restrict: `GRANT SELECT ON commons.contribution_event TO authenticated` (remove INSERT/UPDATE from direct table grant)
- Add SECURITY DEFINER wrapper for contribution_event writes

**S2-B: Revise migration 032 (was 026)**
- Add PREREQUISITES check for mig 025 tables
- Update to use revised `contribution_event` column names if S2-A changes them
- Add `is_kora_originated` and `is_kora_enabled` propagation in atomic function

**S2-C: Design `commons.initiative_adoption` table proposal**
- New proposed migration `033_commons_initiative_adoption.sql`
- Table: `(id, initiative_id, tenant_id, adoption_type, evidence_status, adopted_at, created_at)`
- This cleanly separates adoption events from booking/attendance events
- Not part of migration 025 — separate concern, separate migration

**S2-D: Design `commons.post` extension proposal**
- Add `is_kora_originated boolean DEFAULT false`
- Add `is_kora_enabled boolean DEFAULT false`
- Add these to existing `commons.post` migration or new migration `034_commons_post_kora_origin.sql`

### Stage 3 — Gate 3 Dependent (Requires Legal/Privacy Clearance)

**S3-A: Apply migration 025 (revised) to staging only**
- Pre-condition: Gate 3 legal/privacy review completed
- Pre-condition: At least one staging Pilot company tenant with `production_ready=false`
- Verify: all 5 tables/policies/functions active
- Smoke test: `/api/commons/initiatives` returns seed data; no live booking yet

**S3-B: Apply migration 032 to staging**
- After S3-A confirmed working
- Update `attributeContributionForBooking()` in `lib/commons/cross-company-attribution.ts` to call `commons.attribute_contribution_for_booking_atomic()` RPC
- Smoke test: mark one test booking as attended → verify 2 `contribution_event` rows created atomically

**S3-C: Set `production_ready=true` for one Pilot tenant**
- Enable live contribution dashboard for first Pilot company
- Verify `getContributionLive()`, `getContributionPromoterView()`, `getContributionOriginEmployerView()` return live data
- Verify company cannot see individual bookings

**S3-D: Wire `app/my-kora/kora-space/page.tsx` to live initiative feed**
- Replace static `KORA_SPACE_ITEMS` with fetch to `/api/commons/initiatives`
- Workers can discover and book real cross-company initiatives

### Stage 4 — Pilot Calibration (Post Gate 3 + Live Data)

**S4-A: Collect N≥10 events from ≥2 Pilot companies**
- First maturity band that is not `insufficient_signal` requires N≥10 confirmed attendance events

**S4-B: Validate maturity bands with real signal distribution**
- Current bands: Systemic≥75, Active≥50, Emerging≥20, Nascent<20
- Verify whether 10–20 events produce meaningful band differentiation
- Adjust thresholds if bands cluster at Nascent with realistic data

**S4-C: Validate confidence model with real N**
- `nFactor = min(N / n_events_reference, 1)` — reference is currently 5; may need adjustment for Pilot
- With N=10 (minimum privacy threshold), `nFactor = min(10/5, 1) = 1.0` — at reference, confidence is driven entirely by evidence quality and ecosystem signal

**S4-D: Delphi Study calibration**
- V2 weights (30/25/20/15/10) are pre-empirical
- Post-Pilot empirical validation required before claiming methodology validity

---

## 8. Gate 3 Dependencies

| Item | Gate 3 Required? | Pre-Gate 3 Safe? |
|---|---|---|
| Apply migration 025 | **YES** | No — schema creates real data tables |
| Apply migration 032 | **YES** | No — creates production attribution function |
| `commons.booking` live rows | **YES** | No |
| `commons.contribution_event` live rows | **YES** | No |
| `BookingService.markAttended()` live path | **YES** | No |
| `getContributionLive()` returning real data | **YES** | No |
| `production_ready=true` for any tenant | **YES** | No |
| Revision of migration 025 SQL file | No | Yes — file edit, not apply |
| Rename proposed migration to 032 | No | Yes — file rename in `proposed/` |
| `methodology-config.json` threshold update | No | Yes |
| New doctrine type constants | No | Yes |
| Documentation updates | No | Yes |
| Test additions | No | Yes |
| `app/my-kora/kora-space/page.tsx` seed feed | No | Yes — reads seed API, no DB |
| `commons.initiative_adoption` table design | No | Yes — design only |
| `commons.post` KORA-origin column design | No | Yes — design only |

---

## 9. Final Recommendation

### Priority 1 — Do immediately (before any migration applies)

1. **Rename** `supabase/proposed/026_contribution_atomic_attribution.sql` → `032_contribution_atomic_attribution.sql` and add prerequisite comment.
2. **Update test** to assert old `026` name is gone and new `032` name exists.
3. **Update `methodology-config.json`**: add `privacy_threshold_min_events: 10` alongside existing `insufficient_signal_min_events: 2`.
4. **Document migration 025 revision requirements** (M025-1 through M025-6) in `docs/KORA_CONTRIBUTION_METHODOLOGY.md`.

### Priority 2 — Before Gate 3 closes (migration preparation)

5. **Revise migration 025** to fix M025-1 through M025-6: extend CHECK constraints, add `privacy_threshold_met`, restrict grants.
6. **Design `commons.initiative_adoption` table** (proposed migration 033) — adoption/sponsorship events need their own table.
7. **Design `commons.post` extension** for `is_kora_originated` and `is_kora_enabled` (proposed migration 034).
8. **Update `computeContributionV2()`** to check `privacy_threshold_min_events` in addition to `insufficient_signal_min_events`.

### Priority 3 — Gate 3 bundle

9. Apply revised migration 025 → 032 → 033 → 034 in staging.
10. Update `attributeContributionForBooking()` to call migration 032 RPC.
11. Set `production_ready=true` for first Pilot tenant.
12. Wire worker KORA Space page to live initiative feed.

### What to defer to post-Pilot

- Feedback/rating/follow-up aggregate signals (G-5)
- Initiative replication/scaling signals (G-9) — config already `false`
- Weight calibration (Delphi Study)
- KORA-originated/KORA-enabled adoption (G-3) — founder decision needed first

---

*Pre-Pilot Plan complete — read-only document, no migrations applied, no production state changed, Gate 3 OPEN.*
