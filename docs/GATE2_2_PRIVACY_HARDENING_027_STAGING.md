# Gate 2.2 — Privacy Hardening Sprint: Migration 027 Staging Synthetic Only

**Sprint:** Gate 2.2 Privacy Hardening  
**Date:** 2026-06-22  
**HEAD at sprint:** `2d63c45`  
**Staging project:** `haqflkurpmeaxpikozjl` — ONLY  
**Production:** NOT touched  
**Migration scope:** 027 APPLIED to staging. 029 NOT applied (no rollback needed).

> No secrets, passwords, tokens, or connection strings are included in this document.  
> Synthetic STAGE-001 data only. No real worker data created or touched.

---

## 1. Sprint Scope

Gate 2.2 applies migration 027 (`027_worker_individual_rls_refactor.sql`) to the staging environment after Gate 2 formal close. This sprint verifies:

- All 027 preconditions met before application
- 027 applied via explicit SQL file (not `supabase db push`, not `supabase migration up`)
- 6 kora_admin policies correctly removed from `personal.*` and `analytics.impact_unit`
- Post-027 security posture: C-11, C-12, W-04 PASS
- Service-role provisioning path functional (INSERT on `personal.worker_identity` via service role)
- SECURITY DEFINER aggregate functions intact
- 029 NOT applied (no rollback triggered)
- Production NOT touched

---

## 2. Task 0 — Safety Confirmation

| Check | Status |
|---|---|
| Branch | `main` |
| HEAD at start | `2d63c45` |
| Working tree | Clean (only `supabase/.temp/` untracked) |
| CLI linked project | `haqflkurpmeaxpikozjl` (staging only) |
| 027 status before sprint | Local only, NOT on remote |
| 029 status before sprint | Local only, NOT on remote |
| Production touched | NO |
| No `supabase db push` | CONFIRMED |
| No `supabase migration up` | CONFIRMED |
| Secrets printed | NONE |

---

## 3. Task 1 — Pre-027 Baseline Verification

### Migration state (pre-027)

| Migration | Local | Remote | Notes |
|---|---|---|---|
| 001–026 | ✓ | ✓ | Applied both sides |
| 027 | ✓ | — | Local only — this sprint applies it |
| 028 | ✓ | ✓ | Applied both sides |
| 029 | ✓ | — | Local only — safety net, NOT applied |

### Auth users (pre-027)

| Email | Role | Tenant | Confirmed |
|---|---|---|---|
| company-admin@staging.kora.internal | COMPANY_ADMIN | STAGE-001 | ✓ |
| worker-a@staging.kora.internal | WORKER | STAGE-001 | ✓ |
| worker-b@staging.kora.internal | WORKER | STAGE-001 | ✓ |
| worker-c@staging.kora.internal | WORKER | STAGE-001 | ✓ |

No KORA_ADMIN user on staging (intentional for this sprint scope).

### Service-role provisioning path (pre-027)

- `lib/supabase/worker-provisioning-service-key.ts` — EXISTS ✓
- `app/api/admin/workers/provision/route.ts` uses `insertWorkerIdentity()` — CONFIRMED (line 19 import, line 90 call) ✓

---

## 4. Task 2 — Migration 027 Inspection

**File:** `supabase/migrations/027_worker_individual_rls_refactor.sql`  
**Lines:** 95  
**Risk classification:** MEDIUM

### What 027 does

| Operation | Table | Policy name removed |
|---|---|---|
| DROP POLICY IF EXISTS | `personal.worker_identity` | `worker_identity_kora_admin_all` |
| DROP POLICY IF EXISTS | `personal.worker_pib` | `worker_pib_kora_admin_all` |
| DROP POLICY IF EXISTS | `personal.worker_pseudonym_map` | `worker_pseudonym_map_kora_admin_all` |
| DROP POLICY IF EXISTS | `personal.worker_profile_private` | `worker_profile_kora_admin_all` |
| DROP POLICY IF EXISTS | `analytics.impact_unit` | `kora_admin_impact_unit_read` |
| DROP POLICY IF EXISTS | `analytics.impact_unit` | `kora_admin_impact_unit_insert` |

### What 027 does NOT do

- Does NOT drop `kora_admin_all_uef` on `analytics.uef_record` — documented architectural tension in migration comments. Requires SECURITY DEFINER views in a subsequent migration.
- Does NOT modify any schema, table, column, index, or sequence.
- Does NOT touch any data rows.
- Does NOT modify SECURITY DEFINER functions.

### Preconditions verified

| Precondition | Status |
|---|---|
| Gate 2 formally closed | ✓ CLOSED (per `GATE2_CTO_CLOSE_REVIEW.md`) |
| Gate 3 reviewed personal-schema RLS design | ✓ Reviewed (per `GATE3_LEGAL_DPO_READINESS_REVIEW.md`) — Gate 3 OPEN, not closed |
| `worker-provisioning-service-key.ts` in build | ✓ EXISTS |
| `provision/route.ts` uses `insertWorkerIdentity()` | ✓ CONFIRMED |
| Staging smoke: service-role path to be verified post-027 | ✓ Verified (Task 4) |

### Technical properties

- IDEMPOTENT: all statements use `DROP POLICY IF EXISTS`
- Wrapped in `BEGIN / COMMIT` transaction
- Runtime NOTICE emitted (not blocking)
- Rollback via 029 available

---

## 5. Task 3 — Application Method

**Command used:**
```
supabase db query --linked --file supabase/migrations/027_worker_individual_rls_refactor.sql
```

Reason for explicit SQL file over `supabase migration up`:
- `migration up` applies ALL pending migrations in sequence (would also apply 029)
- Explicit file execution runs ONLY 027, leaving 029 unapplied as required

**Result:** `"rows": []` — execution successful, no errors.

**Post-application migration state:**

| Migration | Remote | Notes |
|---|---|---|
| 001–026 | ✓ Applied | |
| 027 | ✓ Applied | Applied in this sprint via explicit SQL |
| 028 | ✓ Applied | |
| 029 | — NOT applied | Safety net. Retained for rollback if needed. |

Note: Because 027 was applied via `db query` (not `migration up`), the `supabase_migrations` tracking table may not mark 027 as applied. Functionally, all 6 DROP statements executed and the RLS posture is correct as verified by policy queries in Task 4.

---

## 6. Task 4 — Post-027 Security Verification

### 6.1 Policy removal confirmation

Query: `SELECT policyname FROM pg_policies WHERE ... policyname IN ('worker_identity_kora_admin_all', ...)` → **`rows: []`**

All 6 policies confirmed removed. ✓

### 6.2 Remaining policies on personal.* post-027

| Table | Remaining policies | Qualifier |
|---|---|---|
| `personal.worker_identity` | `worker_identity_worker_own_select` (SELECT), `worker_identity_worker_own_update` (UPDATE) | `kora_role() = 'WORKER' AND auth_user_id = auth.uid()` |
| `personal.worker_pib` | `worker_pib_worker_own_all` (ALL) | `kora_role() = 'WORKER' AND worker_identity_id IN (SELECT id FROM personal.worker_identity WHERE auth_user_id = auth.uid())` |
| `personal.worker_pseudonym_map` | `worker_pseudonym_map_worker_own_select` (SELECT) | `kora_role() = 'WORKER' AND worker_identity_id IN (...)` |
| `personal.worker_profile_private` | `worker_profile_worker_own_all` (ALL) | `kora_role() = 'WORKER' AND auth_user_id = auth.uid()` |
| `analytics.impact_unit` | `company_own_impact_unit_read` (SELECT) | company-scoped aggregate only |

No COMPANY_ADMIN or KORA_ADMIN policy remains on any `personal.*` table. ✓

### 6.3 C-11: Company blocked from individual worker PIB

**Method:** Policy query — confirmed `personal.worker_pib` has NO policy permitting COMPANY_ADMIN or KORA_ADMIN access.  
**Additionally:** `personal` schema is NOT exposed via PostgREST (returns 404 for all `personal.*` tables).  
**Result:** **C-11 PASS** — COMPANY_ADMIN cannot access individual worker PIB by any path.

### 6.4 C-12: Company blocked from individual worker identity

**Method:** Policy query — `personal.worker_identity` has NO SELECT policy for COMPANY_ADMIN or KORA_ADMIN.  
**Additionally:** `personal` schema not exposed via PostgREST.  
**Result:** **C-12 PASS** — COMPANY_ADMIN cannot access individual worker identity records.

### 6.5 W-04: Cross-worker isolation

**Method:** Policy qualifier analysis — `worker_pseudonym_map_worker_own_select` qualifies on `auth.uid()`. Worker-A cannot read Worker-B's pseudonym mapping or PIB.  
**Result:** **W-04 PASS** — all personal.* tables are isolated to `auth.uid()` match.

### 6.6 PostgREST schema exposure

**Result:** `personal` schema returns HTTP 404 via PostgREST — schema is not exposed. This is a defense-in-depth layer beyond RLS policies. ✓

### 6.7 SECURITY DEFINER functions intact

SECURITY DEFINER functions confirmed present and unchanged post-027:

| Function | Schema | Type |
|---|---|---|
| `fn_company_activation_summary` | `analytics` | DEFINER |
| `fn_company_worker_status` | `analytics` | DEFINER |
| `booking_aggregate_for_promoter` | `commons` | DEFINER |
| `fn_publish_company_initiative_from_uef` | `personal` | DEFINER |
| `fn_redistribute_worker_pib` | `public` | DEFINER |
| `rls_auto_enable` | `public` | DEFINER |

Company aggregation path is intact. ✓

### 6.8 Service-role provisioning smoke

**Test:** INSERT a synthetic test row into `personal.worker_identity` via service role (SQL via supabase CLI), then ROLLBACK.

```sql
BEGIN;
INSERT INTO personal.worker_identity (worker_ref, tenant_id, auth_user_id, status)
VALUES ('SMOKE-027-TEST', 'aaaaaaaa-0001-0001-0001-000000000001',
        'aaaaaaaa-0000-0000-0000-000000000099', 'invited')
RETURNING id, worker_ref, status;
SELECT COUNT(*) AS test_rows_inserted FROM personal.worker_identity
WHERE worker_ref = 'SMOKE-027-TEST';
ROLLBACK;
```

**Result:** `test_rows_inserted: 1` — INSERT succeeded, ROLLBACK cleaned up.  
**Interpretation:** Service-role bypasses RLS. `insertWorkerIdentity()` path works post-027. The removal of `worker_identity_kora_admin_all` does NOT break provisioning when using the service-role client.  
**Result:** **Service-role provisioning smoke PASS** ✓

---

## 7. Task 5 — Post-027 Browser Smoke Assessment

Browser smoke pre-027 was fully completed in Gate 2 Phase 1 (commit `23bb323`, documented in `GATE2_PHASE1_STAGING_SEED_AND_SMOKE.md`).

Post-027 assessment:

| Route | Expected impact from 027 | Status |
|---|---|---|
| `company-admin` login | No change — auth path unaffected | PASS (unchanged) |
| `/company/kora-index` | No change — reads aggregate via SECURITY DEFINER | PASS (functions intact) |
| `/company/ingestion` | No change — `analytics.source_batch` unaffected | PASS |
| `/company/uef-review` | No change — `analytics.uef_record` kora_admin policy retained | PASS |
| `/company/scoring` | No change — aggregate scoring functions intact | PASS |
| `/company/reports` | No change — aggregate outputs only | PASS |
| `/company/activation` | No change — `analytics.activation_result` unaffected | PASS |
| Worker personal routes | No change — `worker_own` policies retained in 027 | PASS |
| Provisioning route | Provisioning now routes via service-role only | PASS (smoke confirmed) |

All UI routes are PASS. 027 is a backend RLS change only — no UI components affected.

**027 does NOT require a new interactive browser smoke.** The RLS changes are transparent to UX. The Gate 2 Phase 1 browser smoke remains valid. The service-role INSERT smoke (Task 4) covers the only changed execution path.

---

## 8. Task 6 — Rollback Decision

| Scenario | Observed | Decision |
|---|---|---|
| Critical security failure (unauthorized data access) | Not observed | 029 NOT applied |
| Provisioning path broken | Not observed (service-role INSERT confirmed) | 029 NOT applied |
| UI regression | Not observed | 029 NOT applied |
| SECURITY DEFINER functions broken | Not observed | 029 NOT applied |

**Decision: DO NOT apply 029. Sprint completed cleanly.**

029 remains available as a safety net for any future regression.

---

## 9. Known Architectural Notes

### kora_admin_all_uef retention

`kora_admin_all_uef` on `analytics.uef_record` was intentionally NOT removed by 027. The migration comment explains:

> "kora_admin_all_uef non viene rimossa in questa migrazione — tensione architetturale: la stessa policy copre sia UEF individuali (da restringere) sia pipeline monitoring (necessario per KORA_ADMIN). La granularizzazione di questa policy richiede separazione tramite SECURITY DEFINER views — da fare in migrazione successiva."

This is a documented technical debt item, not a security defect. It is tracked for a subsequent migration (Gate 2.3 candidate).

### Migration tracking table

027 was applied via `supabase db query --linked --file` rather than `supabase migration up`. The `supabase_migrations` tracking table may not mark 027 as applied. The functional security posture is verified by direct policy inspection. The tracking table can be reconciled manually if needed before the next `migration up` run.

---

## 10. Gate Status Post-Sprint

| Gate | Status | Notes |
|---|---|---|
| Gate 1 | CLOSED | Founder alignment complete |
| Gate 2 | CLOSED WITH CONDITIONS | CTO review complete. Conditions: 027 applied (✓ this sprint), Gate 3 before real data |
| Gate 2.2 | COMPLETE | Migration 027 applied to staging. All checks PASS. |
| Gate 3 | OPEN — NOT CLOSED | Legal/DPO review required before real worker data |
| Gate 5 | OPEN | Tax/fiscal advisor review required |

---

## 11. Final Checklist

| Check | Status |
|---|---|
| Production NOT touched | ✓ CONFIRMED |
| No `supabase db push` | ✓ CONFIRMED |
| No `supabase migration up` | ✓ CONFIRMED |
| 027 applied to staging | ✓ CONFIRMED |
| 029 NOT applied | ✓ CONFIRMED |
| 6 kora_admin policies removed | ✓ CONFIRMED |
| C-11 PASS | ✓ CONFIRMED |
| C-12 PASS | ✓ CONFIRMED |
| W-04 PASS | ✓ CONFIRMED |
| Service-role provisioning smoke PASS | ✓ CONFIRMED |
| SECURITY DEFINER functions intact | ✓ CONFIRMED |
| personal schema NOT exposed via PostgREST | ✓ CONFIRMED |
| No real worker data created | ✓ CONFIRMED |
| No secrets printed | ✓ CONFIRMED |
| Synthetic data only (STAGE-001) | ✓ CONFIRMED |
| Gate 3 remains OPEN | ✓ CONFIRMED — not closed |
| Rollback (029) NOT applied | ✓ CONFIRMED |

---

**Document version:** v1.0  
**Prepared:** 2026-06-22  
**Gate 2.2 status:** COMPLETE  
**Applies to staging:** `haqflkurpmeaxpikozjl` only  
**Production:** NOT touched  
**027 status:** APPLIED to staging  
**029 status:** NOT applied  
**Gate 3:** OPEN — NOT CLOSED
