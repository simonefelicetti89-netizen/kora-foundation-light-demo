# Gate 2 — Phase 1 Post-Migration Verification & Minimal Seed Plan

> Archived: canonical Gate 2 status now lives in docs/GATE2_STATUS.md.

**Status:** Phase 1 complete — read-only verification passed  
**Staging project:** `haqflkurpmeaxpikozjl` (dedicated staging only)  
**Production:** NOT touched  
**Date:** 2026-06-21  
**HEAD at verification:** `a525271`

---

> **DO NOT apply migration 027 yet.**  
> See section 7 (Prerequisites Before 027) for required conditions.

---

## 1. Remote Migration Status

Verified via `supabase migration list --linked` (read-only).

| Migration | Status |
|---|---|
| 001 | ✓ Applied |
| 002 | ✓ Applied |
| 003 | ✓ Applied |
| 004 | ✓ Applied |
| 005 | ✓ Applied |
| 006 | ✓ Applied |
| 007 | ✓ Applied |
| 008 | ✓ Applied |
| 009 | ✓ Applied |
| 010 | ✓ Applied |
| 011 | ✓ Applied |
| 012 | ✓ Applied |
| 013 | ✓ Applied |
| 014 | ✓ Applied |
| 015 | ✓ Applied |
| 016 | ✓ Applied |
| 017 | ✓ Applied |
| 018 | ✓ Applied |
| 019 | ✓ Applied |
| 020 | ✓ Applied |
| 021 | ✓ Applied |
| 022 | ✓ Applied |
| 023 | ✓ Applied |
| 024 | ✓ Applied |
| 025 | ✓ Applied |
| 026 | ✓ Applied (fixed: `auth.uid()::text` cast) |
| **027** | **— NOT applied** |
| 028 | ✓ Applied |

---

## 2. Remote Schema Verification

### Schemas present

| Schema | Status |
|---|---|
| `analytics` | ✓ Present |
| `audit` | ✓ Present |
| `commons` | ✓ Present |
| `kora` | ✓ Present |
| `network` | ✓ Present |
| `personal` | ✓ Present |
| `governance` | — Not created (informational: none of mig 001–028 creates this schema) |

### Core tables

| Table | Status |
|---|---|
| `personal.worker_identity` | ✓ Present |
| `personal.worker_profile_private` | ✓ Present |
| `personal.worker_pib` | ✓ Present |
| `personal.worker_pseudonym_map` | ✓ Present |
| `commons.post` | ✓ Present |
| `commons.booking` | ✓ Present |
| `commons.contribution_event` | ✓ Present |
| `audit.audit_log` | ✓ Present |
| `analytics.impact_unit` | ✓ Present |

### Core functions

| Function | Status |
|---|---|
| `analytics.fn_company_activation_summary` | ✓ Present |
| `analytics.fn_company_worker_status` | ✓ Present |
| `commons.booking_aggregate_for_promoter` | ✓ Present |
| `kora.kora_role()` | ✓ Present |
| `kora.tenant_id()` | ✓ Present |
| `personal.fn_publish_company_initiative_from_uef` | ✓ Present with KORA_ADMIN guard |

---

## 3. RLS / Grants Verification

### personal.* — RLS status

All 10 personal schema tables have `rls_enabled = true` AND `rls_forced = true`:

`uploaded_record`, `uploaded_record_attendee`, `worker_cv_share`, `worker_identity`,
`worker_initiative`, `worker_participation`, `worker_pib`, `worker_profile_private`,
`worker_pseudonym_map`, `workforce_baseline`

### Dangerous grants

| Check | Result |
|---|---|
| `anon` grants on `personal.*` | ✓ None |
| `anon` grants on `analytics.*` | ✓ None |
| `anon` grants on `commons.*` | ✓ None |
| COMPANY_ADMIN direct policy on `personal.*` | ✓ None |
| COMPANY_VIEWER direct policy on `personal.*` | ✓ None |

### SECURITY DEFINER functions

All 4 SECURITY DEFINER functions confirmed with fixed `search_path` via `pg_proc.proconfig`:

| Function | search_path |
|---|---|
| `analytics.fn_company_activation_summary` | `personal, analytics, kora, public` |
| `analytics.fn_company_worker_status` | `personal, analytics, kora, public` |
| `commons.booking_aggregate_for_promoter` | `commons, personal, public` |
| `personal.fn_publish_company_initiative_from_uef` | `personal, analytics, kora, public` |

`fn_publish_company_initiative_from_uef` confirmed to contain explicit KORA_ADMIN guard on staging (verified via `pg_proc.prosrc`).

### Findings classification

| Finding | Severity | Detail |
|---|---|---|
| `company_own_baseline_read` SELECT policy on `personal.workforce_baseline` | Informational | `workforce_baseline` contains aggregate headcount baseline for the company's own tenant — not individual worker data. Scoped to `kora.tenant_id()`. Expected and correct. |
| `kora_admin_all` policies on `worker_pib`, `worker_identity`, `worker_profile_private`, `worker_pseudonym_map` | Expected pre-027 | These will be removed by mig 027. DO NOT apply 027 until prerequisites in section 7 are met. |
| `kora_admin_impact_unit_read` + `kora_admin_impact_unit_insert` on `analytics.impact_unit` | Expected pre-027 | Also removed by mig 027. |
| `analytics.uef_record` — `kora_admin_all_uef` covers both UEF individual records and pipeline monitoring | Expected pre-027 | Granularization of this policy requires SECURITY DEFINER views — documented in mig 027 as a known tension to resolve in a subsequent migration. |

**No P0 dangerous grants or RLS issues found.**

---

## 4. Expected Pre-027 Residuals

The following are expected and correct at this phase. They do NOT require immediate remediation.

1. `worker_identity_kora_admin_all` (ALL) — removed by mig 027
2. `worker_pib_kora_admin_all` (ALL) — removed by mig 027
3. `worker_profile_kora_admin_all` (ALL) — removed by mig 027
4. `worker_pseudonym_map_kora_admin_all` (ALL) — removed by mig 027
5. `kora_admin_impact_unit_read` + `kora_admin_impact_unit_insert` — removed by mig 027

After mig 027, KORA_ADMIN access to individual worker data flows exclusively through SECURITY DEFINER functions. Worker provisioning flows exclusively through the service-role isolated path (`worker-provisioning-service-key.ts`).

---

## 5. Minimal Synthetic Seed Plan

> **Do not execute yet.** This is a plan only.  
> All data is synthetic. No real personal data. No real company data.  
> Staging project `haqflkurpmeaxpikozjl` only.

### A. Tenant

```sql
-- Insert order: 1
INSERT INTO analytics.tenant (
  id, name, slug, status, tier
) VALUES (
  'aaaaaaaa-0001-0001-0001-000000000001',  -- stable synthetic UUID
  'KORA Staging Synthetic Company',
  'stage-001',
  'pilot',
  'foundation_light'
);
```

Dependencies: none  
Verification: `SELECT id, name, status FROM analytics.tenant WHERE slug = 'stage-001';`

### B. Company admin auth user

> Auth users must be created via Supabase Auth Admin API or Dashboard — not via direct SQL.

```
Email:    company-admin@staging.kora.internal
Role:     COMPANY_ADMIN
app_metadata:
  kora_role: COMPANY_ADMIN
  kora_tenant_id: aaaaaaaa-0001-0001-0001-000000000001
```

Verification: User can log in and JWT claims contain correct `kora_role` and `kora_tenant_id`.

### C. Worker auth users (3)

> Created via Auth Admin API, NOT via direct SQL on personal.worker_identity.

```
Worker A:
  Email:  worker-a@staging.kora.internal
  app_metadata:
    kora_role: WORKER
    kora_tenant_id: aaaaaaaa-0001-0001-0001-000000000001
    kora_worker_id: <uuid assigned at provisioning>

Worker B:
  Email:  worker-b@staging.kora.internal
  app_metadata: (same pattern as A)

Worker C:
  Email:  worker-c@staging.kora.internal
  app_metadata: (same pattern as A)
```

### D. Worker identity / profile

```sql
-- Insert order: 2 (after tenant, after auth users are provisioned)
-- Uses insertWorkerIdentity() from lib/supabase/worker-provisioning-service-key.ts
-- DO NOT insert directly via KORA_ADMIN RLS path — use service-role path only

INSERT INTO personal.worker_identity (
  id, tenant_id, auth_user_id, pseudonym_id, display_name, status
) VALUES
  ('bbbbbbbb-000a-000a-000a-000000000001', 'aaaaaaaa-0001-0001-0001-000000000001', <worker_a_auth_id>, 'W-STAGE-A', 'Worker A (Staging)', 'active'),
  ('bbbbbbbb-000b-000b-000b-000000000002', 'aaaaaaaa-0001-0001-0001-000000000001', <worker_b_auth_id>, 'W-STAGE-B', 'Worker B (Staging)', 'active'),
  ('bbbbbbbb-000c-000c-000c-000000000003', 'aaaaaaaa-0001-0001-0001-000000000001', <worker_c_auth_id>, 'W-STAGE-C', 'Worker C (Staging)', 'active');
```

Verification:
```sql
SELECT id, tenant_id, status FROM personal.worker_identity
WHERE tenant_id = 'aaaaaaaa-0001-0001-0001-000000000001';
-- Expected: 3 rows
```

### E. Company aggregate baseline

```sql
-- Insert order: 3
INSERT INTO personal.workforce_baseline (
  id, tenant_id, headcount_total, headcount_active, reference_period_start, reference_period_end
) VALUES (
  'cccccccc-0001-0001-0001-000000000001',
  'aaaaaaaa-0001-0001-0001-000000000001',
  3,   -- 3 synthetic workers
  3,
  '2026-01-01',
  '2026-12-31'
);
```

Verification:
```sql
SELECT headcount_total FROM personal.workforce_baseline
WHERE tenant_id = 'aaaaaaaa-0001-0001-0001-000000000001';
-- Expected: 1 row, headcount_total = 3
```

### F. KORA Space — initiative, bookings

```sql
-- Insert order: 4 (after tenant)
-- One synthetic post/initiative in commons.post
INSERT INTO commons.post (
  id, tenant_id, title, pillar, status, max_participants
) VALUES (
  'dddddddd-0001-0001-0001-000000000001',
  'aaaaaaaa-0001-0001-0001-000000000001',
  'Staging Yoga Session',
  'LIFE',
  'published',
  10
);

-- Insert order: 5 (after worker_identity, after post)
-- Worker A booking
INSERT INTO commons.booking (
  id, tenant_id, post_id, worker_id, status
) VALUES (
  'eeeeeeee-000a-000a-000a-000000000001',
  'aaaaaaaa-0001-0001-0001-000000000001',
  'dddddddd-0001-0001-0001-000000000001',
  'bbbbbbbb-000a-000a-000a-000000000001',
  'confirmed'
);

-- Worker B booking
INSERT INTO commons.booking (
  id, tenant_id, post_id, worker_id, status
) VALUES (
  'eeeeeeee-000b-000b-000b-000000000002',
  'aaaaaaaa-0001-0001-0001-000000000001',
  'dddddddd-0001-0001-0001-000000000001',
  'bbbbbbbb-000b-000b-000b-000000000002',
  'confirmed'
);
-- Worker C: no booking (intentional — tests "no booking" path)

-- Insert order: 6 (after booking, to test contribution event path)
INSERT INTO commons.contribution_event (
  id, tenant_id, booking_id, worker_id, attended, attended_at
) VALUES (
  'ffffffff-000a-000a-000a-000000000001',
  'aaaaaaaa-0001-0001-0001-000000000001',
  'eeeeeeee-000a-000a-000a-000000000001',
  'bbbbbbbb-000a-000a-000a-000000000001',
  true,
  now()
);
-- Worker A attended; Worker B booked but did not attend yet
```

Verification:
```sql
SELECT COUNT(*) FROM commons.booking
WHERE tenant_id = 'aaaaaaaa-0001-0001-0001-000000000001';
-- Expected: 2

SELECT COUNT(*) FROM commons.contribution_event
WHERE tenant_id = 'aaaaaaaa-0001-0001-0001-000000000001';
-- Expected: 1 (Worker A only)
```

### G. Worker PIB

```sql
-- Insert order: 7 (after worker_identity)
-- Minimal synthetic PIB records — one per worker, one pillar each
INSERT INTO personal.worker_pib (
  id, tenant_id, worker_id, pillar, iu_total, period_start, period_end
) VALUES
  ('gggggggg-000a-000a-000a-000000000001', 'aaaaaaaa-0001-0001-0001-000000000001', 'bbbbbbbb-000a-000a-000a-000000000001', 'LIFE', 12.5, '2026-01-01', '2026-06-30'),
  ('gggggggg-000b-000b-000b-000000000002', 'aaaaaaaa-0001-0001-0001-000000000001', 'bbbbbbbb-000b-000b-000b-000000000002', 'GROWTH', 8.0, '2026-01-01', '2026-06-30'),
  ('gggggggg-000c-000c-000c-000000000003', 'aaaaaaaa-0001-0001-0001-000000000001', 'bbbbbbbb-000c-000c-000c-000000000003', 'CONNECTION', 3.2, '2026-01-01', '2026-06-30');
```

Verification:
```sql
-- Worker self-read (run as Worker A session):
SELECT iu_total, pillar FROM personal.worker_pib WHERE worker_id = 'bbbbbbbb-000a-000a-000a-000000000001';
-- Expected: 1 row (own only)

-- Company read attempt (run as COMPANY_ADMIN session):
SELECT COUNT(*) FROM personal.worker_pib WHERE tenant_id = 'aaaaaaaa-0001-0001-0001-000000000001';
-- Expected: 0 rows (RLS blocks company from reading individual PIB)
```

### H. Audit baseline

No pre-seeded audit rows needed. Audit events are written as part of application actions (e.g., tenant promotion, user provisioning). Verify audit_log is writable via the company INSERT policy after seeding by triggering a real app action.

### Insert order summary

```
1. analytics.tenant
2. personal.workforce_baseline
3. personal.worker_identity          ← via service-role path only
4. commons.post
5. commons.booking (Worker A + B)
6. commons.contribution_event (Worker A)
7. personal.worker_pib (A, B, C)
```

### Rollback / cleanup SQL

```sql
-- Run in reverse insert order to clean staging after smoke tests
DELETE FROM personal.worker_pib         WHERE tenant_id = 'aaaaaaaa-0001-0001-0001-000000000001';
DELETE FROM commons.contribution_event  WHERE tenant_id = 'aaaaaaaa-0001-0001-0001-000000000001';
DELETE FROM commons.booking             WHERE tenant_id = 'aaaaaaaa-0001-0001-0001-000000000001';
DELETE FROM commons.post                WHERE tenant_id = 'aaaaaaaa-0001-0001-0001-000000000001';
DELETE FROM personal.worker_identity    WHERE tenant_id = 'aaaaaaaa-0001-0001-0001-000000000001';
DELETE FROM personal.workforce_baseline WHERE tenant_id = 'aaaaaaaa-0001-0001-0001-000000000001';
DELETE FROM analytics.tenant            WHERE id        = 'aaaaaaaa-0001-0001-0001-000000000001';
-- Delete auth users via Supabase Auth Admin API (not SQL)
```

---

## 6. Smoke Test Plan

> Do not execute until seed is complete. All tests use staging only.

### Company side

| Route | Expected |
|---|---|
| Login as `company-admin@staging.kora.internal` | JWT contains `kora_role: COMPANY_ADMIN`, `kora_tenant_id` matches tenant |
| `/company` workspace | Loads without error |
| `/company/kora-index` | Shows KORA Index, Confidence Score, calibration_status, all 10 components |
| `/company/activation` | Shows activation rate for synthetic tenant |
| `/company/pillars` (or equivalent) | Shows pillar distribution for synthetic tenant |
| `/company/financial` | Shows BTI placeholder / governance indicators |
| `/company/reports` | Report card loads |
| KORA Space company/admin view | Shows synthetic post, aggregate booking count |
| Booking aggregate for promoter | Aggregate count = 2 bookings (Worker A + B) |
| Company attempts to read `personal.worker_pib` | 0 rows returned (RLS blocks) — **must fail gracefully** |
| Company attempts to read `personal.worker_identity` | 0 rows returned (RLS blocks) |

### Worker side

| Route | Expected |
|---|---|
| Login as `worker-a@staging.kora.internal` | JWT contains `kora_role: WORKER`, `kora_worker_id` matches worker_identity.id |
| `/my-kora` workspace | Loads for Worker A |
| My KORA Space | Shows Worker A's booking (confirmed) |
| Worker A — own booking visible | 1 booking visible |
| Worker A — attempts to read Worker B booking | 0 rows (RLS blocks cross-worker reads) |
| Worker A — PIB private area | Shows own PIB (LIFE, 12.5 IU) |
| Login as `worker-c@staging.kora.internal` | Workspace loads |
| Worker C — My KORA Space | 0 bookings (no booking seeded) |
| Dynamic Impact CV (`/my-kora/dynamic-cv`) | Loads for Worker A without error |

### Admin side

| Route | Expected |
|---|---|
| Login as KORA_ADMIN (staging admin account) | JWT contains `kora_role: KORA_ADMIN` |
| Tenant overview | Synthetic tenant `STAGE-001` visible |
| Worker provisioning view | Workers A, B, C visible |
| Booking admin / all-bookings view | 2 bookings visible (Worker A + B) |
| Audit log / diagnostics | Audit entries from provisioning actions visible |

### Privacy / security

| Test | Expected outcome |
|---|---|
| Company reads `personal.worker_pib` | 0 rows — **MUST pass** |
| Company reads `personal.worker_identity` | 0 rows — **MUST pass** |
| Worker A reads Worker B `personal.worker_pib` | 0 rows — **MUST pass** |
| Anon request to any `personal.*` endpoint | 401 / 0 rows — **MUST pass** |
| Tenant isolation: second tenant cannot read first tenant's data | 0 rows (not applicable until second tenant seeded) |
| `fn_publish_company_initiative_from_uef` called as WORKER | EXCEPTION: kora/unauthorized — **MUST reject** |

---

## 7. Prerequisites Before Migration 027

**DO NOT apply migration 027 until ALL of the following are true:**

| Prerequisite | Status |
|---|---|
| Gate 2 (CTO architecture review) formally closed | OPEN — not yet closed |
| Gate 3 (Legal/DPO review) has reviewed personal-schema RLS design | OPEN — required before real worker data |
| `lib/supabase/worker-provisioning-service-key.ts` exists and is deployed | ✓ EXISTS — `insertWorkerIdentity()` exported |
| `app/api/admin/workers/provision/route.ts` uses `insertWorkerIdentity()` (not KORA_ADMIN RLS path) | ✓ CONFIRMED — line 19 imports `insertWorkerIdentity`, line 90 calls it |
| Staging smoke test: provision a worker via service-role path AFTER applying 027 | Not yet — must run after 027 is applied |
| Rollback migration `029_rollback_027_if_needed.sql` prepared BEFORE applying 027 | ✓ PREPARED — `supabase/migrations/029_rollback_027_if_needed.sql` exists, NOT applied |
| No routes depend on direct KORA_ADMIN SELECT on `personal.worker_pib`, `personal.worker_pseudonym_map`, or `personal.worker_identity` | Needs route audit before 027 |
| No real personal data present in staging | ✓ True (no seed applied yet) |

### Rollback migration 029

`supabase/migrations/029_rollback_027_if_needed.sql` has been prepared and committed.
See section 9 (Rollback 029 Preparation) for full details.

**029 was NOT applied.** It exists only as an emergency safety net.

---

## 8. Do Not Apply Migration 027 Yet

Migration 027 (`027_worker_individual_rls_refactor.sql`) removes KORA_ADMIN INSERT on `personal.worker_identity`. Applying it before the service-role provisioning path is smoke-tested on staging will permanently break worker provisioning with no instant rollback. It also requires Gate 3 Legal/DPO sign-off before any real worker data is involved.

**Phase 2 (mig 027) will be a separate, controlled sprint after all prerequisites above are confirmed.**

---

---

## 9. Rollback 029 Preparation

### Purpose

`supabase/migrations/029_rollback_027_if_needed.sql` is a controlled emergency rollback for migration 027. It was prepared as a safety prerequisite before 027 can be applied to any environment.

### What 029 does

Restores exactly the 6 RLS policies that migration 027 drops:

1. `worker_identity_kora_admin_all` on `personal.worker_identity` (ALL)
2. `worker_pib_kora_admin_all` on `personal.worker_pib` (ALL)
3. `worker_pseudonym_map_kora_admin_all` on `personal.worker_pseudonym_map` (ALL)
4. `worker_profile_kora_admin_all` on `personal.worker_profile_private` (ALL)
5. `kora_admin_impact_unit_read` on `analytics.impact_unit` (SELECT)
6. `kora_admin_impact_unit_insert` on `analytics.impact_unit` (INSERT)

It does NOT disable RLS, does NOT add FORCE RLS removal, does NOT grant anon access, and does NOT grant any company or employer role direct access to `personal.*`.

### When 029 MAY be used

- Migration 027 has already been applied to staging
- Applying 027 has confirmed broken a required staging path (e.g., worker provisioning fails because the service-role path is not yet deployed)
- A forward fix is not immediately available
- The rollback has been explicitly approved by the technical owner

### When 029 MUST NOT be used

- Migration 027 has NOT yet been applied (do not apply preemptively)
- Real worker data is present in the target environment
- The target is production — production requires separate, explicit approval
- A forward fix (deploying the service-role path and retrying) is available

### Relationship between 027 and 029

027 → removes the 6 KORA_ADMIN direct-access policies (privacy hardening)  
029 → restores those same 6 policies (emergency rollback only)

Applying 029 returns the schema to its pre-027 state. After applying 029, the root cause (typically: service-role provisioning path not deployed) must be fixed, then 027 (or a forward granularization migration) must be re-applied.

### Confirmation: 029 was NOT applied

As of this document, migration 029 exists in the repository but has NOT been applied to any environment. It is present as a safety file only.

### Requirement: 029 must be tested only after 027 in a controlled staging environment

Do not test 029 in isolation. The correct test sequence is:
1. Apply 027 to staging
2. Run smoke test (worker provisioning via service-role path)
3. If smoke test passes: 029 is not needed — leave unapplied
4. If smoke test fails: apply 029 to restore access, fix root cause, then re-apply 027

---

**Document version:** v1.1  
**Prepared:** 2026-06-21  
**Updated:** 2026-06-21 — rollback 029 prepared  
**Gate status:** Gate 2 OPEN · Gate 3 OPEN  
**Applies to staging:** `haqflkurpmeaxpikozjl` only  
**Production:** NOT touched
