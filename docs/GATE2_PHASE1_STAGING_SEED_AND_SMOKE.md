# Gate 2 — Phase 1 Staging Seed & Smoke Test Checklist

**Status:** Seed executed — verification passed  
**Staging project:** `haqflkurpmeaxpikozjl` (dedicated staging only)  
**Production:** NOT touched  
**Date:** 2026-06-21  
**HEAD at seed:** `51a62f6`

> **Migration 027 NOT applied.** DO NOT apply 027 until all prerequisites in
> `GATE2_PHASE1_POST_MIGRATION_VERIFICATION.md §7` are confirmed.  
> **Migration 029 NOT applied.** It exists as emergency safety net only.

---

## 1. Seed Execution Summary

| Item | Result |
|---|---|
| Seed file | `supabase/seed/gate2_phase1_minimal_staging_seed.sql` |
| Target | `haqflkurpmeaxpikozjl` — staging only |
| Execution method | `supabase db query --linked --file` |
| Data type | SYNTHETIC ONLY — no real personal, worker, or company data |
| Schema changes | None — DML only |
| RLS/policy changes | None |
| Grant changes | None |
| Migration commands | None |
| Execution result | ✓ SUCCESS — `{}` rows returned, no errors |

### Schema corrections applied during build

The seed plan in `GATE2_PHASE1_POST_MIGRATION_VERIFICATION.md §5` was based on assumed
column names. The following corrections were made after read-only schema introspection:

| Table | Plan column | Actual column |
|---|---|---|
| `analytics.tenant` | `name, slug, status, tier` | `company_name, tenant_code, tenant_kind` |
| `personal.workforce_baseline` | `headcount_total, headcount_active, reference_period_start/end` | `total_workers, reporting_period (text)` |
| `personal.worker_identity` | `pseudonym_id, display_name` | `worker_ref` (opaque pseudonym text) |
| `personal.worker_pib` | `worker_id, iu_total, period_start, period_end, tenant_id` | `worker_identity_id, iu_value, reporting_period, verification_status` |
| `commons.booking` | `tenant_id, worker_id` | `worker_identity_id, worker_tenant_id, post_tenant_id` |
| `commons.contribution_event` | `booking_id, worker_id, attended, attended_at` | Table structure not applicable for internal events |
| `worker_pseudonym_map.linked_by` | `'gate2-staging-seed'` | `'kora_admin'` (CHECK constraint) |
| PIB UUIDs | `gggggggg-*` | `1a000000-*` etc. (g is not valid hex) |

`commons.contribution_event` was excluded from the seed: it records cross-company and
external-participant events only (role IN ('promoter','origin_employer')). A purely
internal LIFE event within STAGE-001 does not generate contribution_event rows.
Worker A attendance is tracked via `commons.booking.status='attended'`.

---

## 2. Synthetic Dataset Created

### Tenant

| Field | Value |
|---|---|
| `id` | `aaaaaaaa-0001-0001-0001-000000000001` |
| `tenant_code` | `STAGE-001` |
| `company_name` | `KORA Staging Synthetic Company` |
| `tenant_kind` | `TEST` (synthetic staging — NOT LIVE, NOT DEMO) |
| `production_ready` | `false` |
| `methodology_version_id` | `KORA Methodology v0.1` |

### Workforce Baseline

| Field | Value |
|---|---|
| `tenant_id` | `aaaaaaaa-0001-0001-0001-000000000001` |
| `reporting_period` | `2026-H1` |
| `total_workers` | `3` |
| `privacy_threshold_applied` | `true` |
| `minimum_group_size` | `10` |

### Worker Identities

| worker_ref | id | auth_user_id (synthetic) | status |
|---|---|---|---|
| `W-STAGE-A` | `bbbbbbbb-000a-000a-000a-000000000001` | `a1000000-a000-a000-a000-000000000001` | active |
| `W-STAGE-B` | `bbbbbbbb-000b-000b-000b-000000000002` | `b2000000-b000-b000-b000-000000000002` | active |
| `W-STAGE-C` | `bbbbbbbb-000c-000c-000c-000000000003` | `c3000000-c000-c000-c000-000000000003` | active |

> **Auth users (company-admin + workers) are NOT yet created** in Supabase Auth.
> `auth_user_id` values above are synthetic UUIDs with no FK to `auth.users`.
> Real JWT-based smoke tests require creating auth users via Supabase Auth Admin API or
> Dashboard and updating `personal.worker_identity.auth_user_id` to match the real IDs.
> Company admin email: `company-admin@staging.kora.internal`
> Worker emails: `worker-a/b/c@staging.kora.internal`

### Pseudonym Map

| pseudonym_id | worker_identity_id |
|---|---|
| `PSE-STAGE-A-001` | `bbbbbbbb-000a-000a-000a-000000000001` |
| `PSE-STAGE-B-002` | `bbbbbbbb-000b-000b-000b-000000000002` |
| `PSE-STAGE-C-003` | `bbbbbbbb-000c-000c-000c-000000000003` |

### KORA Space — Initiative

| Field | Value |
|---|---|
| `id` | `dddddddd-0001-0001-0001-000000000001` |
| `title` | `Staging Yoga Session` |
| `category` | `event` |
| `pillar` | `LIFE` |
| `status` | `published` |

### KORA Space — Bookings

| id | worker_ref | status |
|---|---|---|
| `eeeeeeee-000a-000a-000a-000000000001` | W-STAGE-A | `attended` |
| `eeeeeeee-000b-000b-000b-000000000002` | W-STAGE-B | `approved` |
| — | W-STAGE-C | NO BOOKING (intentional — tests empty state) |

### Worker PIB

| worker_ref | pillar | iu_value | verification_status |
|---|---|---|---|
| W-STAGE-A | `LIFE` | `12.5` | `self_declared` |
| W-STAGE-B | `GROWTH` | `8.0` | `self_declared` |
| W-STAGE-C | `CONNECTION` | `3.2` | `self_declared` |

---

## 3. Post-Seed Verification Results

All queries run read-only against staging. Results:

| Check | Expected | Result |
|---|---|---|
| Tenant STAGE-001 exists | 1 row | ✓ PASS |
| `tenant_kind = 'TEST'` | TEST | ✓ PASS |
| `production_ready = false` | false | ✓ PASS |
| `workforce_baseline.total_workers = 3` | 3 | ✓ PASS |
| 3 worker_identity rows exist | 3 rows | ✓ PASS |
| Worker statuses all active | 3 × active | ✓ PASS |
| 3 pseudonym_map rows exist | 3 rows | ✓ PASS |
| Post `Staging Yoga Session` published/LIFE | 1 row | ✓ PASS |
| 2 bookings exist (Worker A + B) | 2 rows | ✓ PASS |
| Worker A booking status = attended | attended | ✓ PASS |
| Worker B booking status = approved | approved | ✓ PASS |
| 3 PIB records exist (LIFE/GROWTH/CONNECTION) | 3 rows | ✓ PASS |
| `anon` has NO grants on `personal.*` | 0 rows | ✓ PASS |
| No COMPANY_ADMIN/VIEWER policy on personal.* | 0 rows | ✓ PASS (`company_own_baseline_read` on `workforce_baseline` is correct — aggregate, not individual) |
| All 10 personal.* tables: RLS enabled + forced | 10/10 | ✓ PASS |
| Migration 027 NOT applied | 0 | ✓ PASS |
| Migration 029 NOT applied | 0 | ✓ PASS |

---

## 4. Cleanup / Rollback

To remove all STAGE-001 synthetic data from staging run the ROLLBACK BLOCK at the
bottom of `supabase/seed/gate2_phase1_minimal_staging_seed.sql` (uncomment and execute).

Targets only `tenant_id = 'aaaaaaaa-0001-0001-0001-000000000001'` — does NOT touch
any other tenant's data.

Delete order (reverse insert):
1. `personal.worker_pib` (by worker_identity_id)
2. `commons.booking` (by post_tenant_id)
3. `commons.post` (by tenant_id)
4. `personal.worker_profile_private` (by worker_id)
5. `personal.worker_pseudonym_map` (by worker_identity_id)
6. `personal.worker_identity` (by tenant_id)
7. `personal.workforce_baseline` (by tenant_id)
8. `analytics.tenant` (by id)

Auth users must be deleted separately via Supabase Auth Admin API or Dashboard.

---

## 5. UI Smoke Test Checklist

> **Prerequisites before JWT-based tests:**
> 1. Create Supabase Auth users for `company-admin@staging.kora.internal`,
>    `worker-a/b/c@staging.kora.internal` via Auth Admin API or Dashboard.
> 2. Set `app_metadata` on each auth user:
>    - company-admin: `{ "kora_role": "COMPANY_ADMIN", "kora_tenant_id": "aaaaaaaa-0001-0001-0001-000000000001" }`
>    - Worker A–C: `{ "kora_role": "WORKER", "kora_tenant_id": "aaaaaaaa-0001-0001-0001-000000000001", "kora_worker_id": "<worker_identity.id>" }`
> 3. Update `personal.worker_identity.auth_user_id` for each worker to the real Supabase auth user UUID.
>
> **Smoke tests below are read-only and non-destructive.**
> **All tests target staging only. Do not test against production.**

### 5a. Company Workspace

| # | Test | Expected |
|---|---|---|
| C-01 | Login as `company-admin@staging.kora.internal` | JWT contains `kora_role: COMPANY_ADMIN`, `kora_tenant_id: aaaaaaaa-*` |
| C-02 | Navigate to `/company` workspace | Loads without error |
| C-03 | Navigate to `/company/kora-index` | Shows KORA Index, Confidence Score, `calibration_status`, all 10 components |
| C-04 | KORA Index shows `methodology_version_id = 'KORA Methodology v0.1'` | Present and non-suppressible |
| C-05 | Navigate to `/company/activation` | Shows activation rate for STAGE-001 |
| C-06 | Navigate to `/company/pillars` or equivalent | Shows pillar distribution for STAGE-001 |
| C-07 | Navigate to `/company/financial` | Shows BTI placeholder / governance indicators |
| C-08 | Navigate to `/company/reports` | Report card loads |
| C-09 | KORA Space company/admin view | Shows `Staging Yoga Session`, aggregate booking count = 2 |
| C-10 | `commons.booking_aggregate_for_promoter` function for Staging Yoga Session | Returns count = 2 (Worker A + B) |
| C-11 | Company queries `personal.worker_pib` directly | 0 rows (RLS blocks — **MUST pass**) |
| C-12 | Company queries `personal.worker_identity` directly | 0 rows (RLS blocks — **MUST pass**) |
| C-13 | KORA Contribution displayed separately from KORA Index | NOT merged into KORA Index computation |

### 5b. Worker Workspace

| # | Test | Expected |
|---|---|---|
| W-01 | Login as `worker-a@staging.kora.internal` (Worker A) | JWT contains `kora_role: WORKER`, `kora_worker_id = bbbbbbbb-000a-*` |
| W-02 | Navigate to `/my-kora` | Loads for Worker A |
| W-03 | My KORA Space — booking list | Shows 1 confirmed booking (`Staging Yoga Session`, status: attended) |
| W-04 | Worker A queries Worker B's `personal.worker_pib` | 0 rows (cross-worker RLS blocks — **MUST pass**) |
| W-05 | Worker A PIB private area | Shows own PIB: LIFE / 12.5 IU |
| W-06 | Login as `worker-b@staging.kora.internal` (Worker B) | Workspace loads |
| W-07 | Worker B — My KORA Space booking list | Shows 1 booking (`Staging Yoga Session`, status: approved) |
| W-08 | Login as `worker-c@staging.kora.internal` (Worker C) | Workspace loads |
| W-09 | Worker C — My KORA Space booking list | 0 bookings (no booking seeded — empty state) |
| W-10 | Worker C PIB | Shows own PIB: CONNECTION / 3.2 IU |
| W-11 | `/my-kora/dynamic-cv` (if route exists) | Loads for Worker A without error |
| W-12 | My KORA workspace NOT visible to company role | Employer route does not expose `/my-kora` content |

### 5c. Admin Workspace

| # | Test | Expected |
|---|---|---|
| A-01 | Login as KORA_ADMIN (staging admin account) | JWT contains `kora_role: KORA_ADMIN` |
| A-02 | Tenant overview | Synthetic tenant `STAGE-001` visible, `tenant_kind: TEST` |
| A-03 | Worker provisioning view | Workers W-STAGE-A, W-STAGE-B, W-STAGE-C visible |
| A-04 | Booking admin / all-bookings view | 2 bookings visible (Worker A attended, Worker B approved) |
| A-05 | Audit log / diagnostics | Audit entries from seed/provisioning actions visible |

### 5d. Privacy & Security

| # | Test | Expected |
|---|---|---|
| S-01 | Anon request to any `personal.*` endpoint | 401 / 0 rows — **MUST pass** |
| S-02 | Anon request to `commons.booking` | 0 rows (no anon grant) |
| S-03 | COMPANY_ADMIN reads `personal.worker_pib` | 0 rows — **MUST pass** |
| S-04 | COMPANY_ADMIN reads `personal.worker_identity` | 0 rows — **MUST pass** |
| S-05 | Worker A reads Worker B's `personal.worker_pib` | 0 rows — **MUST pass** |
| S-06 | Worker A reads Worker B's `personal.worker_identity` | 0 rows — **MUST pass** |
| S-07 | `personal.fn_publish_company_initiative_from_uef` called as WORKER | EXCEPTION: `kora/unauthorized` — **MUST reject** |
| S-08 | Small-group data (3 workers < `minimum_group_size=10`) | Segment data suppressed / `PrivacyBoundaryNotice` shown |
| S-09 | PIB not surfaced in any employer-facing view | Employer dashboard shows no individual PIB |
| S-10 | `synthetic_demo_data: true` label visible where seed data is surfaced in UI | Required per CLAUDE.md §16 |

---

## 6. Next Prerequisites Before Migration 027

Migration 027 MUST NOT be applied until ALL of the following are true:

| Prerequisite | Status |
|---|---|
| Gate 2 (CTO architecture review) formally closed | OPEN |
| Gate 3 (Legal/DPO review) has reviewed personal-schema RLS design | OPEN |
| Auth users created in staging for all smoke test roles | NOT YET |
| `personal.worker_identity.auth_user_id` updated to real auth user UUIDs | NOT YET |
| JWT-based smoke tests C-11, C-12, W-04 all pass (RLS blocks verified) | NOT YET |
| Service-role worker provisioning smoke-tested after 027 applied | Not yet — after 027 only |
| Route audit: no routes depend on direct KORA_ADMIN SELECT on personal.* | Not yet |
| Rollback migration `029_rollback_027_if_needed.sql` present | ✓ PREPARED (committed `51a62f6`) |

---

## 7. Migration Status at Seed

| Migration | Status |
|---|---|
| 001–026 | ✓ Applied |
| 027 | **NOT applied** |
| 028 | ✓ Applied |
| 029 | NOT applied (emergency safety net only) |

---

**Document version:** v1.0  
**Prepared:** 2026-06-21  
**Gate status:** Gate 2 OPEN · Gate 3 OPEN  
**Applies to staging:** `haqflkurpmeaxpikozjl` only  
**Production:** NOT touched
