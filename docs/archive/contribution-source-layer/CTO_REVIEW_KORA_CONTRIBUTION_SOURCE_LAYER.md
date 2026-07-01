# CTO Review — KORA Contribution Source Layer

**Review date:** 2026-06-24
**Reviewer role:** CTO pre-apply review (design-stage — no live database)
**Branch:** `main` · HEAD `ce168ac`
**Gate status:** Gate 2 OPEN · Gate 3 OPEN
**Migrations reviewed:** 025, 032, 033
**Status of reviewed migrations:** NOT APPLIED — design-only

---

## 0. Executive Summary

The KORA Contribution source-layer bundle (migrations 025, 032, 033) is **conceptually sound and privacy-safe at the design stage**. The schema correctly implements the companion-indicator pattern: company-level aggregate signals only, no individual worker exposure, RLS and SECURITY DEFINER enforced throughout.

**Overall CTO verdict: `PASS_WITH_MINOR_NOTES`**

No blocking design flaws. Seven minor notes and two pre-apply actions are documented. All three migrations should proceed to DPO/legal review and then to a staging-only apply after Gate 3 closes. No production apply until Pilot readiness is declared.

| Migration | Verdict |
|---|---|
| 025 — `commons.booking` + `commons.contribution_event` | `PASS_WITH_MINOR_NOTES` |
| 032 — `attribute_contribution_for_booking_atomic()` | `PASS_FOR_REVIEW` |
| 033 — `commons.initiative_adoption` + attribution functions | `PASS_WITH_MINOR_NOTES` |
| Cross-migration compatibility | `COMPATIBLE_WITH_NOTES` |
| Privacy / governance | `PRIVACY_SAFE_WITH_NOTES` |
| Product / methodology | `METHODOLOGY_ALIGNED` |

---

## 1. Safety / Gate Status

| Check | Status |
|---|---|
| Branch | `main` ✓ |
| Working tree | Clean (only `supabase/.temp/` untracked) ✓ |
| HEAD | `ce168ac` ✓ |
| Production | Not linked, not targeted ✓ |
| Gate 2 | OPEN ✓ |
| Gate 3 | OPEN — not closed ✓ |
| Migration 025 applied | NO ✓ |
| Migration 032 applied | NO ✓ |
| Migration 033 applied | NO ✓ |
| Real worker data | None ✓ |
| Secrets printed | NO ✓ |
| Migrations run | NO ✓ |
| KORA Contribution in KORA Index | NO ✓ |
| KORA Index formula changed | NO ✓ |
| Worker ranking / individual score | NO ✓ |

---

## 2. Migration 025 Review

**File:** `supabase/migrations/025_commons_booking_contribution.sql`
**Verdict: `PASS_WITH_MINOR_NOTES`**

### 2.1 Table design — `commons.booking`

| Item | Assessment |
|---|---|
| Primary key | `uuid DEFAULT gen_random_uuid()` ✓ |
| `worker_identity_id` FK | References `personal.worker_identity(id) ON DELETE CASCADE` ✓ |
| `post_id` FK | References `commons.post(id) ON DELETE CASCADE` ✓ |
| Denormalized tenant columns | `worker_tenant_id` + `post_tenant_id` — justified for query performance without cross-schema joins ✓ |
| Status workflow | `pending → approved/rejected; approved → attended/cancelled` — correct 5-value CHECK ✓ |
| Unique constraint | `uq_booking_post_worker (post_id, worker_identity_id)` — one booking per worker per initiative ✓ |
| Updated_at trigger | `set_updated_at()` from migration 001 ✓ |
| Operational indexes | 5 indexes (post_id, worker_identity, status, post_tenant, worker_tenant) ✓ |

**Minor note M025-R1:** `moderation_notes` is a free-text field with no length cap. For future staging/production: consider `CHECK (char_length(moderation_notes) <= 2000)` to prevent unbounded storage.

### 2.2 Table design — `commons.contribution_event`

| Item | Assessment |
|---|---|
| Primary key | `uuid DEFAULT gen_random_uuid()` ✓ |
| `worker_identity_id` / `worker_id` present | **NO — correct** ✓ |
| `tenant_id` | NOT NULL — tenant-scoped ✓ |
| `source_booking_id` | Nullable FK — correct for adoption events (NULL) ✓ |
| `source_post_id` | NOT NULL FK → `commons.post` ✓ |
| `role` CHECK | 8 values (M025-3) — taxonomy complete for current pre-Pilot scope ✓ |
| `contribution_kind` CHECK | 11 values (M025-1) — taxonomy complete ✓ |
| `evidence_status` CHECK | 5 values (M025-2) — taxonomy complete ✓ |
| `reporting_period` | `text NOT NULL` — correct format-agnostic storage (e.g. `'2026-Q2'`) ✓ |
| M025-6 source/event fields | All nullable with safe defaults — correct for optional classification ✓ |
| `privacy_threshold_met` | `boolean NOT NULL DEFAULT false` — correct conservative default ✓ |
| `created_at` | `timestamptz NOT NULL DEFAULT now()` ✓ |
| `updated_at` | **Absent** — contribution_event is append-only (no update semantics). Correct by design ✓ |

**Minor note M025-R2:** `reporting_period` is `text` with no CHECK constraint validating format. For staging: consider adding `CHECK (reporting_period ~ '^\d{4}-Q[1-4]$')` or equivalent to prevent malformed period strings (e.g. `'2026-Q5'`). Not a blocker for design review.

**Minor note M025-R3:** `adoption_type` (M025-6 field) on `contribution_event` mirrors the adoption_type taxonomy but has no CHECK constraint. This field is a classification hint — the authoritative value is in `commons.initiative_adoption.adoption_type`. No CHECK needed here, but the CTO should be aware that it is an unconstrained text column.

### 2.3 RLS policies — `commons.booking`

| Policy | Assessment |
|---|---|
| `booking_kora_admin_all` — KORA_ADMIN FOR ALL | Correct — moderation requires full access ✓ |
| `booking_worker_own_all` — WORKER FOR ALL via `worker_identity_id IN (SELECT id FROM personal.worker_identity WHERE auth_user_id = auth.uid())` | Correct — canonical subquery pattern (same as worker_pib) ✓ |
| No COMPANY_ADMIN policy | **Intentional and correct** — promoter sees aggregates only via `booking_aggregate_for_promoter()` ✓ |
| No anon policy | Correct ✓ |
| `ENABLE ROW LEVEL SECURITY` | Present ✓ |
| `FORCE ROW LEVEL SECURITY` | **Not explicitly set on commons.booking** — see note M025-R4 |

**Minor note M025-R4:** `FORCE ROW LEVEL SECURITY` is set on `commons.contribution_event` but the migration does not explicitly call it for `commons.booking`. For defense-in-depth, `ALTER TABLE commons.booking FORCE ROW LEVEL SECURITY;` should be added. Without it, table owners (superuser/postgres) bypass RLS. In Supabase production the `postgres` role bypasses RLS by default; this is acceptable for admin ops but worth documenting.

### 2.4 RLS policies — `commons.contribution_event`

| Policy | Assessment |
|---|---|
| `contribution_event_kora_admin_all` — KORA_ADMIN FOR ALL | Correct ✓ |
| `contribution_event_company_own_select` — COMPANY_ADMIN/COMPANY_VIEWER SELECT WHERE `tenant_id = kora.tenant_id()` | Correct — tenant-scoped, read-only ✓ |
| No WORKER policy | Correct — workers do not see company-level contribution signals ✓ |
| `ENABLE ROW LEVEL SECURITY` | Present ✓ |

### 2.5 Grants

| Grant | Assessment |
|---|---|
| `GRANT SELECT ON commons.contribution_event TO authenticated` | Correct ✓ |
| `REVOKE INSERT, UPDATE ON commons.contribution_event FROM authenticated` | Correct — all writes via SECURITY DEFINER RPCs ✓ |
| `REVOKE INSERT, UPDATE, DELETE ON commons.contribution_event FROM anon` | Correct ✓ |
| `GRANT SELECT, INSERT, UPDATE ON commons.booking TO authenticated` | Correct — workers need INSERT (book) and UPDATE (cancel); KORA_ADMIN moderates ✓ |
| `GRANT EXECUTE ON booking_aggregate_for_promoter TO authenticated` | Correct — function enforces role check internally ✓ |

### 2.6 `booking_aggregate_for_promoter()` — SECURITY DEFINER

| Check | Assessment |
|---|---|
| Role check | `v_caller_role NOT IN ('KORA_ADMIN', 'COMPANY_ADMIN')` → exception ✓ |
| Tenant isolation | `v_caller_tenant <> v_post_tenant_id` → exception for COMPANY_ADMIN ✓ |
| N≥10 threshold | `v_privacy_threshold constant int := 10` — COMPANY_ADMIN gets `('below_threshold', count)` if total < 10 ✓ |
| KORA_ADMIN bypass | Bypasses threshold — justified for moderation/oversight ✓ |
| Output | `(booking_status text, booking_count bigint)` — aggregate only, no individual rows ✓ |
| search_path | `SET search_path = commons, personal, public` ✓ |

### 2.7 Idempotency constraints

| Constraint | Columns | Assessment |
|---|---|---|
| `uq_contribution_booking` | `(tenant_id, role, source_booking_id)` DEFERRABLE | Correct for booking events — `source_booking_id` NOT NULL for bookings ✓ |
| `uq_contribution_external` | `(tenant_id, source_post_id, contribution_kind, role, reporting_period)` DEFERRABLE | Correct post-M025-7 — all 5 columns NOT NULL, allows multi-period ✓ |

**Postgres NULL semantics documented inline.** `uq_contribution_booking` does not cover `source_booking_id = NULL` rows — adoption events correctly fall through to `uq_contribution_external`. ✓

### 2.8 CTO verdict for migration 025

**`PASS_WITH_MINOR_NOTES`**

Minor notes to address before or during staging apply:
- **M025-R1:** Add length cap on `booking.moderation_notes`
- **M025-R2:** Add `reporting_period` format CHECK (`^\d{4}-Q[1-4]$`)
- **M025-R3:** Document that `contribution_event.adoption_type` is unconstrained (acceptable)
- **M025-R4:** Add `ALTER TABLE commons.booking FORCE ROW LEVEL SECURITY`

None of these block design review. All are resolvable in a pre-apply revision or a follow-up migration.

---

## 3. Migration 032 Review

**File:** `supabase/proposed/032_contribution_atomic_attribution.sql`
**Verdict: `PASS_FOR_REVIEW`**

### 3.1 Problem solved

`attributeContributionForBooking()` in `lib/commons/cross-company-attribution.ts` writes 2 rows sequentially without transaction. Second INSERT failure → partial attribution. This migration solves it with an atomic PL/pgSQL function.

### 3.2 Atomic attribution logic

Both INSERTs are inside a single `BEGIN/EXCEPTION WHEN OTHERS THEN RAISE/END` block within `LANGUAGE plpgsql`. The `EXCEPTION` handler re-raises, which rolls back the entire function's transaction block (no partial commit). ✓

### 3.3 ON CONFLICT behavior

Both INSERTs use `ON CONFLICT ON CONSTRAINT uq_contribution_booking DO NOTHING`. This is:
- Idempotent: re-calling for the same booking is safe ✓
- Correct constraint: `uq_contribution_booking (tenant_id, role, source_booking_id)` ✓
- M025-7 unaffected: 032 does not use `uq_contribution_external` ✓

### 3.4 Role mapping

| Row | tenant_id | role | contribution_kind |
|---|---|---|---|
| Promoter | `p_post_tenant_id` | `'promoter'` | `'cross_company_participation'` |
| Origin employer | `p_worker_tenant_id` | `'origin_employer'` | `'cross_company_participation'` |

Both values exist in migration 025 CHECK constraints. ✓

### 3.5 M025-6 fields populated

Both INSERTs populate: `source_type='booking'`, `event_type='attendance_marked'`, `contribution_component_hint='activation_depth'`, `is_cross_company=true`, `privacy_threshold_met=false`. ✓

**Note on `privacy_threshold_met=false`:** Written at INSERT time. The N≥10 check is enforced at read time by `booking_aggregate_for_promoter()`. This is the correct split: write-time cannot know whether the initiative has hit N≥10 yet. A separate RPC to update `privacy_threshold_met` is deferred (noted in risk register).

### 3.6 Tenant isolation

`p_post_tenant_id` (promoter's tenant) and `p_worker_tenant_id` (worker's home tenant) are passed as parameters. Both are written as separate rows — correct dual-row attribution. No cross-contamination. ✓

### 3.7 Security model

```sql
REVOKE ALL ON FUNCTION ... FROM PUBLIC;
GRANT EXECUTE ON FUNCTION ... TO service_role;
```

Service_role-only execution is correct. KORA_ADMIN path goes via service_role in BookingService. `current_role NOT IN ('service_role', 'postgres') AND v_caller_role <> 'KORA_ADMIN'` → exception. ✓

### 3.8 Numbering / placement

- Previously proposed as `026` — renamed to `032` to avoid conflict with applied `026_company_route_rls_gaps.sql` ✓
- Placed in `supabase/proposed/` (not `migrations/`) — correct ✓
- Old `supabase/proposed/026_contribution_atomic_attribution.sql` does not exist ✓
- Apply after migration 025. No dependency on migration 033. ✓

### 3.9 Caller update note

`lib/commons/cross-company-attribution.ts` must be updated post-apply to call `.rpc('attribute_contribution_for_booking_atomic', {...})`. Caller stub is documented in migration 032 comments. This is a Gate 3 task, not a design blocker.

### 3.10 CTO verdict for migration 032

**`PASS_FOR_REVIEW`**

No design issues. Clean, focused, correctly scoped. Caller update is a post-apply engineering task.

---

## 4. Migration 033 Review

**File:** `supabase/proposed/033_initiative_adoption_source_model.sql`
**Verdict: `PASS_WITH_MINOR_NOTES`**

### 4.1 `commons.initiative_adoption` table design

| Item | Assessment |
|---|---|
| Primary key | `uuid DEFAULT gen_random_uuid()` ✓ |
| `worker_identity_id` / `worker_id` present | **NO — correct** ✓ |
| `initiative_id` FK | `REFERENCES commons.post(id) ON DELETE RESTRICT` — correct, prevents accidental deletion of adopted initiatives ✓ |
| `adopting_company_tenant_id` | NOT NULL — correct, every adoption has an adopter ✓ |
| `origin_company_tenant_id` | NULL allowed — correct for KORA-originated (no origin company tenant) ✓ |
| `partner_id` | NULL — FK to future `partner.profile` not yet enforced (acceptable at design stage) ✓ |
| `adoption_type` CHECK | 9 values — taxonomy complete ✓ |
| `adoption_status` CHECK | 6 values — lifecycle correct ✓ |
| `source_origin` CHECK | 6 values — origin classification complete ✓ |
| `evidence_status` CHECK | 5 values — aligned with migration 025 M025-2 ✓ |
| `uq_initiative_adoption` | `(initiative_id, adopting_company_tenant_id, adoption_type)` — allows same company to both sponsor AND adopt same initiative (different adoption_type = different rows) ✓ |
| `FORCE ROW LEVEL SECURITY` | **Not explicitly set** — see note M033-R1 |
| `ON DELETE RESTRICT` for `initiative_id` | Correct — prevents dangling adoptions when post is deleted ✓ |

**Minor note M033-R1:** As with `commons.booking`, `ALTER TABLE commons.initiative_adoption FORCE ROW LEVEL SECURITY` should be added for defense-in-depth. Not a blocker.

### 4.2 RLS policies — `commons.initiative_adoption`

| Policy | Assessment |
|---|---|
| `initiative_adoption_kora_admin_all` — KORA_ADMIN FOR ALL | Correct ✓ |
| `initiative_adoption_company_select` — COMPANY_ADMIN/COMPANY_VIEWER SELECT WHERE adopter OR origin | Correct — companies see their own adoptions both as adopter and as origin company ✓ |
| No WORKER policy | Correct — deny-by-default ✓ |
| No anon policy | Correct ✓ |

**Minor note M033-R2:** The company SELECT policy exposes `notes` (internal free-text) to `COMPANY_VIEWER`. The COMMENT on `notes` says "NEVER surfaced in worker-facing UI or company-facing aggregate outputs" — but at the RLS level, COMPANY_VIEWER can SELECT the full row including `notes`. If `notes` may contain sensitive internal KORA Admin observations, consider column-level security or stripping `notes` from the COMPANY_VIEWER readable columns. Not a blocker — acceptable if `notes` is restricted to non-sensitive admin text by convention, but should be explicitly documented.

### 4.3 `create_initiative_adoption()` — SECURITY DEFINER

| Check | Assessment |
|---|---|
| Auth | `KORA_ADMIN` or `COMPANY_ADMIN` of adopting tenant only ✓ |
| COMPANY_ADMIN can only create `proposed` status | Correct — KORA_ADMIN approves ✓ |
| Tenant mismatch guard | `v_caller_tenant <> p_adopting_company_tenant_id` → exception ✓ |
| Initiative existence check | `IF NOT EXISTS (SELECT 1 FROM commons.post WHERE id = p_initiative_id)` ✓ |
| Idempotency | `ON CONFLICT ON CONSTRAINT uq_initiative_adoption DO NOTHING` — returns NULL if duplicate ✓ |
| `GRANT EXECUTE TO authenticated` | Correct — function enforces role/tenant internally ✓ |

**Minor note M033-R3:** `create_initiative_adoption()` returns `NULL` (not an error) when the adoption already exists (DO NOTHING). A caller receiving `NULL` cannot distinguish "already exists" from "initiative not found" (which raises an exception). For future service layer: consider returning a jsonb with `{id: null, already_exists: true}` to allow idiomatic handling. Not a blocker — the current pattern is safe.

### 4.4 `attribute_contribution_for_adoption()` — SECURITY DEFINER

| Check | Assessment |
|---|---|
| Auth | `current_role NOT IN ('service_role', 'postgres') AND v_caller_role <> 'KORA_ADMIN'` → exception ✓ |
| Adoption existence check | `IF v_adoption.id IS NULL THEN RAISE EXCEPTION` ✓ |
| Status guard | Only attributes from `approved`, `active`, `completed` — refuses `proposed`, `cancelled`, `rejected` ✓ |
| adoption_type → contribution_kind mapping | All 9 adoption_types handled in CASE block (no unhandled path without ELSE exception) ✓ |
| Cross-company dual row | Guarded by `is_cross_company = true AND origin_company_tenant_id IS NOT NULL AND origin_company_tenant_id <> adopting_company_tenant_id` — correct, prevents self-referential promoter row ✓ |
| ON CONFLICT | Both INSERTs use `ON CONFLICT ON CONSTRAINT uq_contribution_external DO NOTHING` ✓ |
| All 5 constraint columns present in INSERT | `tenant_id`, `source_post_id`, `contribution_kind`, `role`, `reporting_period` — all set ✓ |
| `privacy_threshold_met` | Written as `false` — adoption alone does not confirm N≥10 ✓ |
| `REVOKE ALL FROM PUBLIC; GRANT EXECUTE TO service_role` | Correct — service_role only ✓ |

**Note on missing `source_adoption_id`:** The deferred FK (`contribution_event.source_adoption_id → commons.initiative_adoption.id`) means there is no direct FK traceability from `contribution_event` rows back to the adoption record that generated them. Queries must join via `(tenant_id, source_post_id, contribution_kind, role, reporting_period)`. This is acceptable pre-Pilot but should be added in a future migration (migration 034 candidate).

### 4.5 KORA-originated / KORA-enabled handling

`is_kora_originated` and `is_kora_enabled` are propagated from `initiative_adoption` to `contribution_event` via the attribution function. The `source_origin = 'kora_originated'` and `is_kora_originated = true` flags are correctly set at the adoption record level and flow through. ✓

### 4.6 Runtime service callers

`KoraContributionService` does not yet consume adoption rows. `attributeContributionForAdoption()` TypeScript caller is not yet implemented. Both are expected Gate 3 tasks — not design blockers. Post-apply caller update is documented in migration 033 comments.

### 4.7 CTO verdict for migration 033

**`PASS_WITH_MINOR_NOTES`**

Minor notes:
- **M033-R1:** Add `FORCE ROW LEVEL SECURITY` on `commons.initiative_adoption`
- **M033-R2:** Review whether `notes` column should be excluded from `COMPANY_VIEWER` SELECT scope
- **M033-R3:** Consider returning explicit `already_exists` indicator from `create_initiative_adoption()` for service-layer clarity
- **Deferred:** `source_adoption_id` FK — migration 034 candidate

---

## 5. Cross-Migration Compatibility

**Verdict: `COMPATIBLE_WITH_NOTES`**

### 5.1 Apply order

```
025 → 032 (or 033 first — independent)
025 → 033 (or 032 first — independent)
032 and 033 are independent of each other
```
✓ All prerequisites documented in migration headers.

### 5.2 contribution_kind compatibility

| value | 025 CHECK | 032 uses | 033 uses |
|---|---|---|---|
| `cross_company_participation` | ✓ | ✓ | — |
| `external_participants_event` | ✓ | — | — |
| `company_adoption` | ✓ | — | ✓ |
| `company_sponsorship` | ✓ | — | ✓ |
| `company_support` | ✓ | — | ✓ |
| `company_cofunding` | ✓ | — | ✓ |
| `kora_originated_adoption` | ✓ | — | ✓ |
| `kora_enabled_adoption` | ✓ | — | ✓ |
| `initiative_replication` | ✓ | — | — |
| `aggregate_feedback` | ✓ | — | — |
| `aggregate_follow_up` | ✓ | — | — |

All values used by 032 and 033 exist in 025 CHECK. ✓

**Compatibility note COMPAT-1:** `initiative_replication`, `aggregate_feedback`, and `aggregate_follow_up` are defined in 025's CHECK but have no source migration yet. This is intentional — they are reserved for future source events (replication tracker, feedback aggregator). No issue.

### 5.3 role compatibility

| value | 025 CHECK | 032 uses | 033 uses |
|---|---|---|---|
| `promoter` | ✓ | ✓ | ✓ |
| `origin_employer` | ✓ | ✓ | — |
| `adopter` | ✓ | — | ✓ |
| `sponsor` | ✓ | — | ✓ |
| `supporter` | ✓ | — | ✓ |
| `cofunder` | ✓ | — | ✓ |
| `kora_enabler` | ✓ | — | ✓ |
| `partner` | ✓ | — | ✓ |

All role values used by 032 and 033 exist in 025 CHECK. ✓

### 5.4 evidence_status compatibility

| value | 025 CHECK | 033 table CHECK |
|---|---|---|
| `verified` | ✓ | ✓ |
| `self_declared` | ✓ | ✓ |
| `partner_verified` | ✓ | ✓ |
| `advisor_verified` | ✓ | ✓ |
| `system_verified` | ✓ | ✓ |

Fully aligned. ✓

### 5.5 M025-6 fields used by 032 and 033

| Field | 025 defines | 032 populates | 033 populates |
|---|---|---|---|
| `source_type` | ✓ | `'booking'` | `'adoption'` |
| `event_type` | ✓ | `'attendance_marked'` | `v_adoption.adoption_type` |
| `contribution_component_hint` | ✓ | `'activation_depth'` | mapped by adoption_type |
| `is_cross_company` | ✓ | `true` | from adoption record |
| `is_kora_originated` | ✓ | — (default false) | from adoption record |
| `is_kora_enabled` | ✓ | — (default false) | from adoption record |
| `adoption_type` | ✓ | — (default NULL) | from adoption record |
| `privacy_threshold_met` | ✓ | `false` | `false` |
| `aggregate_count` | ✓ | — (default NULL) | — (default NULL) |

All M025-6 fields used by 032/033 exist in migration 025. ✓

### 5.6 ON CONFLICT constraint targets

| Constraint | Defined in | Used in |
|---|---|---|
| `uq_contribution_booking` | 025 | 032 ✓ |
| `uq_contribution_external` | 025 | 033 ✓ |
| `uq_initiative_adoption` | 033 | 033 (create function) ✓ |

All ON CONFLICT targets exist in the correct migration. ✓

### 5.7 Numbering and placement

| File | Location | Assessment |
|---|---|---|
| `025_commons_booking_contribution.sql` | `supabase/migrations/` | Correct ✓ |
| `032_contribution_atomic_attribution.sql` | `supabase/proposed/` | Correct ✓ |
| `033_initiative_adoption_source_model.sql` | `supabase/proposed/` | Correct ✓ |
| `026_contribution_atomic_attribution.sql` (old) | Does not exist | Correct ✓ |
| Number collision with applied migrations | None — last applied: `031_revoke_public_execute_uef_definer_functions.sql` | ✓ |

### 5.8 Compatibility verdict

**`COMPATIBLE_WITH_NOTES`**

Notes:
- **COMPAT-1:** `initiative_replication`, `aggregate_feedback`, `aggregate_follow_up` in 025 CHECK have no source migration yet — reserved for future. Not a current issue.
- **COMPAT-2:** `source_adoption_id` FK from `contribution_event` to `initiative_adoption` deferred. Traceability gap documented. Migration 034 candidate.

---

## 6. Privacy / Governance Review

**Verdict: `PRIVACY_SAFE_WITH_NOTES`**

### 6.1 Constitutional exclusions — verified

| Check | Result |
|---|---|
| `worker_identity_id` in `contribution_event` | **ABSENT** ✓ |
| `worker_id` in `contribution_event` | **ABSENT** ✓ |
| `worker_identity_id` in `initiative_adoption` | **ABSENT** ✓ |
| `worker_id` in `initiative_adoption` | **ABSENT** ✓ |
| Individual comment/rating in `contribution_event` | **ABSENT** ✓ |
| Individual comment/rating in `initiative_adoption` | **ABSENT** ✓ |
| Individual booking visible to employer | **BLOCKED** — no COMPANY policy on `commons.booking` ✓ |
| Individual participation visible to employer | **BLOCKED** — aggregate function only ✓ |
| Individual feedback visible to employer | **ABSENT** — `aggregate_feedback` kind requires aggregate_count, no individual rows ✓ |

### 6.2 N≥10 threshold enforcement

| Path | Threshold enforced | How |
|---|---|---|
| COMPANY_ADMIN reads booking aggregate | YES — `booking_aggregate_for_promoter()` | `v_total_count < v_privacy_threshold` → `'below_threshold'` bucket returned |
| KORA_ADMIN reads booking aggregate | Bypassed | Justified for moderation/oversight |
| COMPANY reads contribution_event | N/A — contribution_event is already aggregate | RLS scopes to own tenant |
| COMPANY reads initiative_adoption | N/A — company-level record, no worker data | RLS scopes to own tenant |

✓ N≥10 threshold correctly implemented for the one path where re-identification is possible (booking count by status).

### 6.3 Tenant isolation

- `commons.contribution_event` RLS: COMPANY_ADMIN/VIEWER SELECT scoped to `tenant_id = kora.tenant_id()` ✓
- `commons.initiative_adoption` RLS: COMPANY scoped to `adopting_company_tenant_id = kora.tenant_id() OR origin_company_tenant_id = kora.tenant_id()` ✓
- `commons.booking` RLS: no COMPANY policy → COMPANY_ADMIN cannot access booking rows of other tenants' workers ✓

### 6.4 KORA_ADMIN visibility justification

KORA_ADMIN has full access to `booking`, `contribution_event`, and `initiative_adoption` for moderation, oversight, and data quality. This is consistent with KORA_ADMIN's constitutional role across the schema. ✓

### 6.5 WORKER visibility

- `commons.contribution_event`: no WORKER RLS policy → deny-by-default ✓
- `commons.initiative_adoption`: no WORKER RLS policy → deny-by-default ✓
- `commons.booking`: WORKER sees own rows only (canonical subquery) ✓

### 6.6 Privacy notes

**PRIVACY-N1:** `booking_aggregate_for_promoter()` enforces N≥10 at the function level but `privacy_threshold_met` in `contribution_event` is always written as `false` at INSERT time (no RPC exists yet to update it). Until that RPC exists, `privacy_threshold_met` is not a reliable indicator for downstream V2 computation. Downstream code must not treat `privacy_threshold_met = true` as a confirmed signal until the update RPC is implemented.

**PRIVACY-N2:** The `notes` field on `initiative_adoption` is SELECT-accessible to `COMPANY_VIEWER` (see M033-R2). If KORA Admin ever records DPO-sensitive observations in `notes`, this could be a policy violation. Recommend restricting `notes` to KORA_ADMIN visibility only, or confirming that `notes` is scoped to non-sensitive operational content.

**PRIVACY-N3 (DPO scope):** The overall privacy model assumes that aggregate company-level contribution signals cannot be combined with other available data to re-identify individual workers. This assumption is valid for the schemas reviewed. The DPO review should formally assess whether `(tenant_id, contribution_kind, reporting_period, aggregate_count)` tuples could enable inference attacks for very small companies. This is a DPO-level question, not a CTO-level blocking concern.

### 6.7 Privacy verdict

**`PRIVACY_SAFE_WITH_NOTES`**

Notes PRIVACY-N1 and PRIVACY-N2 are pre-production actions. PRIVACY-N3 is a DPO review item. No blocking issues for design review.

---

## 7. Product / Methodology Review

**Verdict: `METHODOLOGY_ALIGNED`**

| Check | Status |
|---|---|
| KORA Contribution is a companion indicator | ✓ — explicitly documented in COMMENT and CLAUDE.md |
| KORA Contribution does not alter KORA Index | ✓ — no KORA Index component touched |
| KORA Index formula unchanged | ✓ |
| KORA Index 10-component structure unchanged | ✓ |
| Contribution V2 5-component model unchanged | ✓ |
| No public 0–100 score reintroduced | ✓ |
| No worker ranking | ✓ |
| No individual contribution score | ✓ |
| Maturity band + confidence is the output direction | ✓ — V2 computation model in `lib/kora-contribution/` unchanged |
| Source layer correctly gated | ✓ — proposed migrations, not applied |
| Pilot readiness not claimed | ✓ |

The adoption source model (migration 033) correctly adds ecosystem-level signals (company adopts initiative → company-level contribution credit) without exposing individual worker decisions. The KORA Contribution V2 components fed by adoption signals (Adoption & Reach 15%, Ecosystem Contribution 20%) are correctly mapped in the attribution function.

---

## 8. Risk Register

| # | Risk | Severity | Likelihood | Migration | Blocks Gate 3 | Mitigation | Owner |
|---|---|---|---|---|---|---|---|
| R-01 | Migration apply order violated (033 applied before 025) | High | Low | 032, 033 | Yes | Apply order documented; CI pre-apply check recommended | Engineering |
| R-02 | RLS bypass for table owner / postgres role (no FORCE RLS on booking and initiative_adoption) | Medium | Low (Supabase default) | 025, 033 | No (pre-staging note) | Add `FORCE ROW LEVEL SECURITY` in pre-staging revision | CTO / Engineering |
| R-03 | SECURITY DEFINER search_path injection if schema is compromised | Medium | Very Low | 025, 032, 033 | No | `SET search_path` is specified on all SECURITY DEFINER functions ✓ | Engineering |
| R-04 | `uq_contribution_external` multi-period false-blocking (pre-M025-7 design) | High | Resolved | 025 | N/A — RESOLVED in `6384026` | Fixed: constraint now 5 columns | — |
| R-05 | `privacy_threshold_met` always false — downstream V2 may treat it as unverified | Medium | Medium | 025, 032, 033 | No (pre-Pilot) | Implement update RPC before V2 live computation | Engineering / Product |
| R-06 | No `source_adoption_id` FK — traceability gap from contribution_event to initiative_adoption | Low | Certain | 025, 033 | No | Deferred to migration 034 | Engineering |
| R-07 | Runtime caller (`attributeContributionForBooking`) not updated to use RPC | High | Certain | 032 | Yes (pre-live) | Update `lib/commons/cross-company-attribution.ts` post-apply | Engineering |
| R-08 | `KoraContributionService` does not consume adoption rows | High | Certain | 033 | Yes (pre-live) | Implement adoption row ingestion in V2 pipeline post-apply | Engineering / Product |
| R-09 | No staging smoke test plan defined | High | Certain | 025, 032, 033 | Yes | Define smoke test suite before Gate 3 apply | Engineering |
| R-10 | DPO / legal review not yet completed | Critical | Certain | 025 (booking) | Yes — blocks Gate 3 | Schedule DPO review with privacy model documentation | DPO / Legal |
| R-11 | CTO sign-off not yet formal | Critical | Certain | All | Yes — blocks Gate 3 | This document is the CTO pre-review; formal sign-off required | CTO |
| R-12 | `reporting_period` format unvalidated (no CHECK constraint) | Low | Low | 025 | No | Add regex CHECK before staging apply | Engineering |
| R-13 | `booking.moderation_notes` unbounded text length | Low | Low | 025 | No | Add length CHECK before staging apply | Engineering |
| R-14 | `notes` on initiative_adoption SELECT-accessible to COMPANY_VIEWER | Medium | Medium | 033 | No (pre-staging) | Restrict to KORA_ADMIN only or confirm non-sensitive scope | DPO / Product |
| R-15 | No rollback plan defined for post-apply failure | High | Low | 025, 032, 033 | Yes | Define rollback scripts before staging apply | Engineering |

---

## 9. Gate 3 Preconditions

The following conditions must ALL be met before any staging apply of migrations 025, 032, 033:

### 9.1 Approvals required

- [ ] **CTO formal sign-off** on this review document (current document is pre-review — CTO must explicitly approve)
- [ ] **DPO / Legal privacy approval** on:
  - `commons.booking` — worker booking data model and RLS
  - N≥10 aggregation threshold and below-threshold behavior
  - `commons.contribution_event` — aggregate company-level signals, no worker identity
  - `commons.initiative_adoption` — company-level adoption decisions
  - `notes` column scope on `initiative_adoption`
  - Privacy inference risk for small-company tenants (PRIVACY-N3)
- [ ] **Product sign-off** on Contribution V2 component mapping from adoption events

### 9.2 Pre-apply revisions (before staging apply)

- [ ] **R-02:** Add `FORCE ROW LEVEL SECURITY` on `commons.booking` and `commons.initiative_adoption`
- [ ] **R-12:** Add `reporting_period` format CHECK
- [ ] **R-13:** Add `booking.moderation_notes` length cap
- [ ] **R-14:** Decision on `notes` column COMPANY_VIEWER scope
- [ ] **R-15:** Define and document rollback plan for each migration

These can be addressed in a pre-staging revision of the migration files (not a new migration number — same files since not applied).

### 9.3 Staging apply plan

```
Environment: Supabase staging project (isolated, synthetic data only)
Data: synthetic JSON seed files from /data/synthetic/ only
No real worker data. No real company data. No real HRIS/LMS integration.

Apply sequence:
  1. supabase migration up --target 025 (staging only)
  2. Smoke test: verify commons.booking and contribution_event exist
  3. supabase migration up --target 032 (staging only — run SQL from proposed/)
  4. Smoke test: verify attribute_contribution_for_booking_atomic() callable
  5. supabase migration up --target 033 (staging only — run SQL from proposed/)
  6. Smoke test: verify initiative_adoption exists and functions callable
```

### 9.4 Smoke test plan (staging)

- [ ] Create a synthetic booking with `status='attended'` via KORA_ADMIN
- [ ] Call `attribute_contribution_for_booking_atomic()` → verify 2 rows in `contribution_event`
- [ ] Call same function again → verify ON CONFLICT DO NOTHING (idempotent, still 2 rows)
- [ ] Verify COMPANY_ADMIN SELECT on `contribution_event` returns only own tenant rows
- [ ] Verify WORKER SELECT on `contribution_event` returns 0 rows (deny-by-default)
- [ ] Call `booking_aggregate_for_promoter()` with < 10 bookings → verify `below_threshold` response
- [ ] Call `booking_aggregate_for_promoter()` with ≥ 10 bookings → verify status breakdown
- [ ] Create a synthetic `initiative_adoption` via `create_initiative_adoption()` as COMPANY_ADMIN
- [ ] Call `attribute_contribution_for_adoption()` → verify contribution_event row
- [ ] Call same function with different `reporting_period` → verify new row (multi-period)
- [ ] Call same function same `reporting_period` → verify DO NOTHING (idempotent)
- [ ] Verify cross-company adoption creates 2 rows (adopter + promoter)

### 9.5 RLS verification plan (staging)

- [ ] Test COMPANY_ADMIN of tenant A cannot SELECT `commons.booking` of tenant B workers
- [ ] Test COMPANY_ADMIN of tenant A cannot SELECT `commons.contribution_event` of tenant B
- [ ] Test COMPANY_ADMIN of tenant A cannot SELECT `commons.initiative_adoption` of tenant B (non-origin)
- [ ] Test WORKER cannot SELECT `commons.contribution_event`
- [ ] Test WORKER cannot SELECT `commons.initiative_adoption`
- [ ] Test unauthenticated (anon) cannot SELECT any of the above

### 9.6 Apply order confirmation

```
025 (revised — M025-7) → 032 → 033
```

**Staging only. No production apply until Pilot readiness is declared.**

### 9.7 Rollback plan (to be defined pre-staging)

For each migration, a rollback script should be prepared:
- Migration 025: `DROP TABLE IF EXISTS commons.contribution_event CASCADE; DROP TABLE IF EXISTS commons.booking CASCADE; ALTER TABLE personal.worker_pib DROP COLUMN IF EXISTS source_booking_id; DROP FUNCTION IF EXISTS commons.booking_aggregate_for_promoter;`
- Migration 032: `DROP FUNCTION IF EXISTS commons.attribute_contribution_for_booking_atomic;`
- Migration 033: `DROP TABLE IF EXISTS commons.initiative_adoption CASCADE; DROP FUNCTION IF EXISTS commons.create_initiative_adoption; DROP FUNCTION IF EXISTS commons.attribute_contribution_for_adoption;`

Rollback scripts should be reviewed by CTO and DPO before any staging apply.

---

## 10. Final CTO Verdict

**Overall: `PASS_WITH_MINOR_NOTES`**

The KORA Contribution source-layer migration bundle (025 / 032 / 033) is:

- ✓ **Conceptually sound** — companion indicator pattern correctly separated from KORA Index
- ✓ **Schema-safe** — types, CHECKs, FKs, NULLability all appropriate
- ✓ **Privacy-safe** — no worker identity in company-facing tables; N≥10 threshold enforced
- ✓ **RLS-safe** — tenant isolation, worker deny-by-default, KORA_ADMIN access justified
- ✓ **Idempotency-safe** — `uq_contribution_booking` and revised 5-column `uq_contribution_external` correct
- ✓ **Apply-order safe** — all dependencies documented, 032 and 033 independent
- ✓ **Gate 3 candidate** — no blocking design issues; 7 minor notes to resolve pre-staging

**Blocking items before Gate 3 apply:**
1. DPO / Legal privacy approval (R-10)
2. CTO formal sign-off (R-11)
3. Pre-apply revisions: FORCE RLS, `reporting_period` CHECK, `notes` column decision (R-02, R-12, R-13, R-14)
4. Rollback plan defined (R-15)
5. Staging smoke test suite executed (R-09)
6. Runtime caller update implemented post-apply (R-07)
7. `KoraContributionService` adoption ingestion implemented post-apply (R-08)

Items R-07 and R-08 are post-apply engineering tasks (not pre-apply blockers for staging, but required before any live V2 computation).

---

## 11. Do Not Do Yet

```
✗ DO NOT apply migration 025
✗ DO NOT apply migration 032
✗ DO NOT apply migration 033
✗ DO NOT run supabase db push
✗ DO NOT run supabase migration up
✗ DO NOT execute SQL against staging or production
✗ DO NOT touch production (Gate 2 + Gate 3 both open)
✗ DO NOT close Gate 3 (requires DPO/legal/CTO formal sign-off)
✗ DO NOT use real worker data
✗ DO NOT claim Pilot readiness
✗ DO NOT claim Contribution source layer is live
✗ DO NOT make KORA Contribution a KORA Index component (constitutional rule)
✗ DO NOT introduce worker ranking
✗ DO NOT introduce individual contribution scores
✗ DO NOT expose individual worker activity to employer roles
✗ DO NOT generate production SQL DDL outside the gate process
✗ DO NOT print secrets / tokens / connection strings / passwords
✗ DO NOT add a new KORA Index component (10-component structure is fixed)
```
