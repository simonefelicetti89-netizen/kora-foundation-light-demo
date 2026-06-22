# Gate 2.3 — UEF Admin Access Hardening Design Review

**Type:** Design review — no migration applied  
**Date:** 2026-06-22  
**HEAD at review:** `f20851f`  
**Staging project:** `haqflkurpmeaxpikozjl` — read-only inspection only  
**Production:** NOT touched  

> No secrets, passwords, tokens, or connection strings are included in this document.  
> No schema changes, RLS changes, or policy changes were made.  
> No real worker data created or imported. Gate 3 remains OPEN — NOT CLOSED.

---

## 1. Scope

Gate 2.3 addresses the remaining architectural tension documented in migration 027 comments:

> `kora_admin_all_uef` on `analytics.uef_record` was intentionally NOT removed by 027.
> The policy covers both UEF individual traces (to restrict) and pipeline monitoring
> (required for KORA_ADMIN). Granularization requires SECURITY DEFINER views.

This review determines the correct design before writing migration 030.

---

## 2. Safety Constraints (confirmed)

| Constraint | Status |
|---|---|
| Production not touched | ✓ CONFIRMED |
| No schema changes applied | ✓ CONFIRMED — design only |
| No RLS changes applied | ✓ CONFIRMED — design only |
| No migrations applied | ✓ CONFIRMED |
| No `supabase db push` / `migration up` | ✓ CONFIRMED |
| No rollback applied | ✓ CONFIRMED |
| 027 applied and tracked | ✓ |
| 029 quarantined, not applied | ✓ |
| Gate 3 OPEN — NOT CLOSED | ✓ |
| No real worker data | ✓ |
| No secrets printed | ✓ CONFIRMED |

---

## 3. Current UEF Access Model

### 3.1 Table structure — `analytics.uef_record`

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `id` | uuid | NOT NULL | PK |
| `tenant_id` | uuid | NOT NULL | Organization identifier |
| `batch_id` | uuid | NOT NULL | Source batch link |
| `reporting_period` | text | NOT NULL | |
| `raw_name` | text | NOT NULL | Event name from raw ingestion |
| `eligibility` | text | NOT NULL | eligible / limited / blocked |
| `primary_pillar` | text | nullable | LIFE / GROWTH / CONNECTION / IMPACT / LEGACY |
| `action_family` | text | nullable | BCM taxonomy classification |
| `event_nature` | text | nullable | |
| `approved_for_scoring` | boolean | NOT NULL | Pipeline gate |
| `approved_for_bti_governance` | boolean | NOT NULL | BTI gate |
| `approved_for_impact_units` | boolean | NOT NULL | IU gate |
| `data_completeness_score` | numeric | NOT NULL | EVQ input |
| `missing_fields` | ARRAY | NOT NULL | |
| `review_status` | text | NOT NULL | pending / approved / rejected / needs_more_data |
| `reviewer_notes` | text | nullable | Admin annotation |
| `reviewed_by` | text | nullable | Reviewer identifier |
| `reviewed_at` | timestamptz | nullable | |
| **`payload`** | **jsonb** | NOT NULL | **Raw ingested event data — highest risk field** |
| `created_at` | timestamptz | NOT NULL | |
| `updated_at` | timestamptz | NOT NULL | |

**Critical observation:** `analytics.uef_record` has NO `worker_identity_id` column. UEF is a batch/organization-level staging record. Worker linkage occurs via `personal.uploaded_record_attendee`. However, the `payload` JSONB field contains raw ingested HR/welfare data which may include worker-identifying information (names, roles, event attendees) depending on source format.

### 3.2 Current RLS policies

| Policy | Cmd | Role | Qualifier |
|---|---|---|---|
| `kora_admin_all_uef` | ALL | KORA_ADMIN | `kora.kora_role() = 'KORA_ADMIN'` |
| `advisor_tenant_uef_read` | SELECT | ADVISOR | `kora.kora_role() = 'ADVISOR' AND tenant_id = kora.tenant_id()` |

### 3.3 Current grants

| Grantee | Privilege | Notes |
|---|---|---|
| `authenticated` | SELECT | PostgREST read path (RLS applies) |
| `service_role` | ALL | Bypasses RLS — correct for pipeline |
| `anon` | — | None — correct |

### 3.4 Existing views

| View | Type | What it exposes |
|---|---|---|
| `analytics.v_company_uef_eligibility_summary` | Aggregate view | COUNT per eligibility/status/pillar — NO individual records, tenant-scoped |

### 3.5 Admin API routes that access UEF directly

| Route | Method | Operation | Client type |
|---|---|---|---|
| `/api/admin/uef/generate-candidates` | POST | INSERT batch of UEF records (ingestion pipeline) | Authenticated JWT |
| `/api/admin/uef/review` | GET | SELECT UEF records by batch (review list) | Authenticated JWT |
| `/api/admin/uef/review` | PATCH | UPDATE review_status, reviewer_notes, approval flags | Authenticated JWT |
| `/api/admin/uef/enrich` | PATCH | UPDATE payload with manual enrichment data | Authenticated JWT |

All use `db.schema('analytics').from('uef_record')` — direct table access via Supabase client.

### 3.6 Access-matrix contradiction

`lib/auth/access-matrix.ts` already defines:

```typescript
worker_individual_uef: {
  KORA_ADMIN: { allowed: false, ... denyReason: 'Worker individual data is not accessible to KORA service team by design' },
  COMPANY_ADMIN: { allowed: false, ... },
  WORKER: { allowed: true, ... }, // own data only
  ...
}
```

**The access-matrix declares KORA_ADMIN should NOT access individual UEF, but `kora_admin_all_uef` grants ALL at the database level.** This is the architectural contradiction that Gate 2.3 must resolve.

The distinction: `worker_individual_uef` in the access-matrix refers to per-worker UEF traces. The admin pipeline operations (INSERT batch, UPDATE review status) are batch-level operations that are legitimate. The granularity mismatch is the root of the tension.

### 3.7 PostgREST exposure

`pgrst.db_schemas` is not configured → `analytics` schema is NOT exposed via PostgREST URL API. Admin routes use the Supabase JS client's `.schema()` method directly (server-side only). This is a defense-in-depth layer — even without RLS tightening, external URL-based access to `analytics.*` is blocked.

---

## 4. Required UEF Use-Case Matrix

| # | Use Case | Needs raw UEF | Needs aggregate | Needs derived | Should block | SECURITY DEFINER | Service role |
|---|---|---|---|---|---|---|---|
| 1 | AI ingestion assistant — INSERT new UEF candidates from batch | ✓ (write) | — | — | — | ✓ (fn_admin_uef_insert) | ✓ alternative |
| 2 | KORA_ADMIN reviews UEF mappings — approve/reject/notes | ✓ (read non-payload fields; update status) | — | — | payload exposure | ✓ (fn_admin_uef_review) | — |
| 3 | Scoring engine consumes UEF (reads approved records) | ✓ (read approved flags, pillar, EVQ fields) | — | — | payload | ✓ or service role | ✓ |
| 4 | Explainability layer references UEF | — | ✓ | ✓ | raw payload | ✓ (aggregate fn) | — |
| 5 | Company sees aggregate explanation only | — | ✓ | ✓ | ALL individual UEF | ✓ view (existing v_company_uef_eligibility_summary) | — |
| 6 | Worker may see own event derivation summary | — | — | ✓ | cross-worker, company access | ✓ | — |
| 7 | Audit/debug — trace UEF record lifecycle | ✓ (read, redacted) | — | — | payload | ✓ (fn_admin_uef_audit_read) | — |
| 8 | Service-role provisioning/ingestion pipeline | ✓ (ALL) | — | — | — | — | ✓ (bypasses RLS) |

**Key insight:** No use case requires raw `payload` access via an authenticated JWT. The ingestion pipeline that writes `payload` can use the service-role path. The review workflow needs `raw_name`, `eligibility`, `review_status`, `primary_pillar`, `approved_*` flags, `reviewer_notes` — but NOT the full `payload` JSONB.

---

## 5. Risk Assessment

### 5.1 Current `kora_admin_all_uef` risk analysis

| Question | Finding | Risk |
|---|---|---|
| Does it expose individual worker-level traces? | Indirectly — via `payload` JSONB which contains raw HR event data; no direct `worker_id` but payload may include names | MEDIUM |
| Is it limited to KORA_ADMIN only? | Yes — policy qualifier `kora.kora_role() = 'KORA_ADMIN'` | Mitigated |
| Could KORA_ADMIN become too broad? | Yes — KORA_ADMIN has ALL (INSERT/UPDATE/DELETE/SELECT) with no field-level restrictions | MEDIUM |
| Could future ADVISOR/COMPANY role inherit it? | No — policy is explicit to `KORA_ADMIN`. But `advisor_tenant_uef_read` already gives ADVISOR SELECT access (tenant-scoped) | LOW for inheritance; ADVISOR path is a separate exposure |
| Does PostgREST expose analytics and increase risk? | `analytics` not in `pgrst.db_schemas` — NOT exposed via REST URL | Mitigated |
| Does it conflict with Gate 3 privacy blockers? | Yes — `payload` may contain personal data from HR files. GDPR Art. 5(1)(b) purpose limitation: KORA_ADMIN accessing raw payload exceeds pipeline monitoring purpose | MEDIUM |
| Does it conflict with "KORA measures organizations, not individuals"? | Yes — `kora_admin_all_uef` with payload access allows tracing individual event contributions, contradicting the architecture principle | MEDIUM |
| Contradiction with access-matrix.ts | `access-matrix.ts` declares `KORA_ADMIN: allowed: false` for `worker_individual_uef`. DB policy grants ALL. | MEDIUM |

### 5.2 ADVISOR `advisor_tenant_uef_read` risk analysis

| Question | Finding | Risk |
|---|---|---|
| Exposes tenant-scoped UEF to ADVISOR | Correct for advisor review workflow, but includes `payload` field | LOW-MEDIUM |
| Could ADVISOR read other tenant's UEF? | No — `tenant_id = kora.tenant_id()` qualifier | Mitigated |
| ADVISOR sees `payload`? | Yes — SELECT is on all columns. No field restriction in RLS | LOW-MEDIUM |

### 5.3 Overall risk classification

**MEDIUM**

Rationale: No immediate data breach risk (PostgREST not exposed, KORA_ADMIN is a trusted internal role, staging is synthetic). However, architectural contradiction between access-matrix and DB policy creates a compliance and auditability gap, and `payload` field exposure exceeds minimum necessary access for all defined use cases.

---

## 6. Hardening Options

### Option A — Keep `kora_admin_all_uef` as-is, document operational control

- **Privacy strength:** Low — broad ALL access remains, payload exposed
- **Operational complexity:** None
- **Migration risk:** None (no migration)
- **App change required:** None
- **Impact on ingestion/scoring:** None
- **Impact on explainability:** None
- **Impact on debugging:** None
- **Recommendation:** NOT RECOMMENDED. Leaves DB/app-layer contradiction unresolved. Fails Gate 3 readiness for any real data environment.

### Option B — Narrow policy to service-role only; SECURITY DEFINER functions for admin review

- **Privacy strength:** High — KORA_ADMIN loses direct table access; all operations via controlled functions
- **Operational complexity:** Medium — requires writing 3–4 SECURITY DEFINER functions
- **Migration risk:** Medium — admin API routes must be updated to call functions
- **App change required:** Yes — 3 admin route files (`generate-candidates`, `review`, `enrich`)
- **Impact on ingestion/scoring:** Low — service-role path unchanged
- **Impact on explainability:** None — aggregate view unchanged
- **Impact on debugging:** Low — debug via function with audit log
- **Recommendation:** STRONG CANDIDATE. Resolves contradiction. Aligns DB with access-matrix.ts.

### Option C — Replace direct table reads with SECURITY DEFINER views (redacted fields)

- **Privacy strength:** High — `payload` suppressed in view; review operations via controlled columns only
- **Operational complexity:** Medium — requires creating admin-facing views that exclude payload
- **Migration risk:** Low-Medium — views can be additive; existing policy can stay during transition
- **App change required:** Partial — routes can switch from table to view; UPDATE still needs functions
- **Impact on ingestion:** None — INSERT still via service-role or function
- **Impact on explainability:** None
- **Impact on debugging:** Low — payload debug via service-role console
- **Recommendation:** GOOD COMPLEMENT to Option B. Views provide the read path; functions handle writes.

### Option D — Split raw UEF from reviewable UEF into separate table/view

- **Privacy strength:** High — raw payload isolated in a restricted table
- **Operational complexity:** High — table split requires data migration, foreign key changes, app rewiring
- **Migration risk:** High — structural change to UEF schema
- **App change required:** Significant — all UEF references must be updated
- **Impact on ingestion/scoring:** Medium — scoring reads need rerouting
- **Impact on explainability:** Medium
- **Impact on debugging:** Low
- **Recommendation:** NOT RECOMMENDED for Gate 2.3. Over-engineered for current risk level. Revisit post-Gate 3 if real data requires it.

### Option E — Remove all direct KORA_ADMIN access; require signed server-side functions only

- **Privacy strength:** Very High
- **Operational complexity:** High — all pipeline operations must go through functions
- **Migration risk:** High — requires comprehensive function coverage before dropping policy
- **App change required:** Comprehensive — all routes and services must use function calls
- **Impact on ingestion/scoring:** High — full rewiring
- **Impact on explainability:** Medium
- **Impact on debugging:** Medium
- **Recommendation:** NOT RECOMMENDED for Gate 2.3. Correct long-term direction but too large a step before Gate 3 validation. Implement incrementally (B+C first, then E post-Gate 3).

---

## 7. Recommended Design (Gate 2.3)

**Recommendation: Option B + C combined — SECURITY DEFINER functions for writes + redacted admin view for reads.**

### 7.1 Core principle

Replace the broad `kora_admin_all_uef` (ALL) policy with:
1. **Service-role path** for INSERT operations (ingestion pipeline)
2. **SECURITY DEFINER function** for UPDATE operations (review, enrich) — field-restricted
3. **SECURITY DEFINER view** for SELECT operations (admin review list) — `payload` suppressed or redacted

### 7.2 Target DB state post-migration 030

| Object | Type | Purpose | Who can use |
|---|---|---|---|
| `kora_admin_all_uef` | **DROPPED** | Removed | — |
| `analytics.v_admin_uef_review` | SECURITY DEFINER view | Admin review list (no payload) | KORA_ADMIN via authenticated JWT |
| `analytics.fn_admin_uef_update_review(...)` | SECURITY DEFINER function | Approve/reject/notes update | KORA_ADMIN via authenticated JWT |
| `analytics.fn_admin_uef_enrich(...)` | SECURITY DEFINER function | Payload enrichment (controlled fields) | KORA_ADMIN via authenticated JWT |
| Service role | Bypasses RLS | INSERT (generate-candidates route) | Server-side service-role client only |
| `advisor_tenant_uef_read` | NARROWED SELECT policy | Advisor review — exclude payload col | ADVISOR, tenant-scoped |

### 7.3 What does NOT change

- `v_company_uef_eligibility_summary` — aggregate view remains unchanged ✓
- `advisor_tenant_uef_read` — narrowed but kept (or replaced with redacted SELECT policy)
- Scoring engine reads — via service-role path (unchanged)
- No KORA Index formula changes
- No product logic changes

### 7.4 App-layer changes required for migration 030

| File | Change needed |
|---|---|
| `app/api/admin/uef/generate-candidates/route.ts` | Switch INSERT from authenticated client → service-role client (already pattern-established by `worker-provisioning-service-key.ts`) |
| `app/api/admin/uef/review/route.ts` | Switch SELECT → `v_admin_uef_review`; switch UPDATE → `fn_admin_uef_update_review()` |
| `app/api/admin/uef/enrich/route.ts` | Switch UPDATE → `fn_admin_uef_enrich()` |

### 7.5 Alignment with access-matrix.ts

Post-migration 030, the DB state will align with `access-matrix.ts`:
- `worker_individual_uef: { KORA_ADMIN: allowed: false }` — DB will enforce this via removed policy
- KORA_ADMIN pipeline operations are not "individual UEF access" — they are batch-level operations via controlled functions

---

## 8. Proposed Migration 030 Plan

### 8.1 Target objects

| Object | Action |
|---|---|
| `analytics.uef_record` — `kora_admin_all_uef` policy | DROP |
| `analytics.uef_record` — `advisor_tenant_uef_read` policy | MODIFY (restrict to non-payload columns via column-level security or view) |
| `analytics.v_admin_uef_review` | CREATE — SECURITY DEFINER view (excludes `payload`) |
| `analytics.fn_admin_uef_update_review(uef_id uuid, action text, notes text, reviewer text)` | CREATE — SECURITY DEFINER |
| `analytics.fn_admin_uef_enrich(uef_id uuid, enrichment_fields jsonb)` | CREATE — SECURITY DEFINER, field whitelist enforced |

### 8.2 Policies to drop / create

```sql
-- DROP
DROP POLICY IF EXISTS kora_admin_all_uef ON analytics.uef_record;

-- KEEP (narrowed or replaced with view-level SELECT)
-- advisor_tenant_uef_read: consider replacing with SELECT on v_advisor_uef_review view
-- that excludes payload column
```

### 8.3 SECURITY DEFINER functions/views to add

```sql
-- Read view for KORA_ADMIN review workflow (no payload)
CREATE VIEW analytics.v_admin_uef_review
  SECURITY DEFINER
  SET search_path = analytics, kora, public
AS
  SELECT id, tenant_id, batch_id, reporting_period, raw_name,
         eligibility, primary_pillar, action_family, event_nature,
         approved_for_scoring, approved_for_bti_governance, approved_for_impact_units,
         data_completeness_score, missing_fields,
         review_status, reviewer_notes, reviewed_by, reviewed_at,
         created_at, updated_at
         -- payload intentionally excluded
  FROM analytics.uef_record
  WHERE kora.kora_role() = 'KORA_ADMIN';

-- Update function for review actions
CREATE OR REPLACE FUNCTION analytics.fn_admin_uef_update_review(
  p_uef_id uuid,
  p_action text,        -- 'approve' | 'reject' | 'needs_info'
  p_notes text,
  p_reviewer text
) RETURNS void
  SECURITY DEFINER
  SET search_path = analytics, kora, public
LANGUAGE plpgsql AS $$
BEGIN
  IF kora.kora_role() <> 'KORA_ADMIN' THEN
    RAISE EXCEPTION 'fn_admin_uef_update_review: access denied — KORA_ADMIN required';
  END IF;
  UPDATE analytics.uef_record SET
    review_status = p_action,
    reviewer_notes = p_notes,
    reviewed_by = p_reviewer,
    reviewed_at = now(),
    approved_for_scoring = (p_action = 'approve'),
    approved_for_impact_units = (p_action = 'approve'),
    updated_at = now()
  WHERE id = p_uef_id;
END;
$$;
```

### 8.4 Grants

```sql
GRANT SELECT ON analytics.v_admin_uef_review TO authenticated;
GRANT EXECUTE ON FUNCTION analytics.fn_admin_uef_update_review TO authenticated;
GRANT EXECUTE ON FUNCTION analytics.fn_admin_uef_enrich TO authenticated;
```

### 8.5 Tests required

| Test | Verification |
|---|---|
| `kora_admin_all_uef` policy absent from `pg_policies` | ✓ |
| `v_admin_uef_review` exists and excludes `payload` | ✓ |
| `fn_admin_uef_update_review` exists as SECURITY DEFINER | ✓ |
| KORA_ADMIN can SELECT from `v_admin_uef_review` | ✓ |
| KORA_ADMIN cannot SELECT `payload` via direct table | ✓ |
| COMPANY_ADMIN cannot SELECT from `uef_record` directly | ✓ (no policy) |
| Service-role can INSERT into `uef_record` | ✓ (bypass RLS) |
| Admin review route returns UEF list without payload | ✓ |
| Admin generate-candidates route still inserts correctly | ✓ |
| Scoring engine reads approved UEF via service-role | ✓ |
| Company aggregate view (`v_company_uef_eligibility_summary`) unchanged | ✓ |
| ADVISOR tenant-scoped read still works | ✓ |
| C-11 / C-12 / W-04 still pass | ✓ |

### 8.6 Rollback approach

Create `supabase/rollback/030_rollback_030_if_needed.sql` before applying 030:
- Re-adds `kora_admin_all_uef` policy
- Drops new functions and views
- Restores prior state

Do NOT put rollback in `supabase/migrations/` (follow 029 quarantine pattern).

### 8.7 Service-role smoke tests

1. INSERT via service-role client into `uef_record` (generate-candidates path)
2. SELECT via `v_admin_uef_review` as KORA_ADMIN JWT — confirm payload absent
3. Call `fn_admin_uef_update_review` as KORA_ADMIN — confirm UPDATE executed
4. Confirm COMPANY_ADMIN cannot SELECT `uef_record` directly (0 rows)
5. Confirm ADVISOR SELECT returns tenant-scoped rows, no payload

### 8.8 Browser smoke tests

1. KORA_ADMIN login → `/admin/uef-review` → UEF list loads ✓
2. KORA_ADMIN approves a UEF record → status changes ✓
3. COMPANY_ADMIN → no UEF list visible ✓
4. Company aggregate explainability → pillar/eligibility summary unchanged ✓

### 8.9 Gate 3 implications

- 030 reduces KORA_ADMIN raw `payload` exposure — directly addresses Gate 3 privacy blocker
- `payload` field with real HR data requires Gate 3 legal review before any real data is loaded
- 030 may be applied to staging with synthetic data without Gate 3 closure
- 030 must be applied to any production environment BEFORE real UEF data is loaded
- Gate 3 DPO review should specifically assess: (a) `payload` retention policy, (b) purpose limitation for KORA_ADMIN enrichment workflow, (c) ADVISOR access to UEF records

---

## 9. Final Recommendation

**Proceed to migration 030 design and implementation** after:

1. ✓ This design review is documented and committed.
2. □ App-layer changes to 3 admin UEF routes are scoped (service-role INSERT path established per `worker-provisioning-service-key.ts` pattern).
3. □ SECURITY DEFINER view and functions are drafted as migration SQL.
4. □ Test plan is confirmed.
5. □ Rollback file (`030_rollback_030_if_needed.sql`) is prepared before applying.

**Do NOT apply migration 030 to staging before:**
- App-layer UEF route changes are in place (generate-candidates must use service-role client)
- Integration smoke test of ingestion pipeline (generate-candidates) passes
- KORA_ADMIN review workflow tested end-to-end via new functions

**Do NOT apply migration 030 to production before:**
- Gate 3 (Legal/DPO) formally closes
- Real UEF data governance policy is documented

---

## 10. Gate State Post-Review

| Gate | Status |
|---|---|
| Gate 2 | CLOSED WITH CONDITIONS (met: 027 applied, 029 quarantined) |
| Gate 2.2 | COMPLETE |
| Gate 2.3 | DESIGN REVIEW COMPLETE — implementation pending |
| Gate 3 | OPEN — NOT CLOSED |
| Gate 5 | OPEN |

---

**Document version:** v1.0  
**Prepared:** 2026-06-22  
**Gate 2.3 status:** DESIGN REVIEW COMPLETE — no migration applied  
**Applies to:** `haqflkurpmeaxpikozjl` inspection only  
**Production:** NOT touched  
**027 status:** Applied and tracked  
**029 status:** Quarantined, not applied  
**030 status:** PLANNED — not yet written or applied  
**Gate 3:** OPEN — NOT CLOSED
