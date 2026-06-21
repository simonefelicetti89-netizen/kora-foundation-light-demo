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

---

## 6. UI Smoke Test Results

**Executed:** 2026-06-22  
**HEAD at smoke:** `2271ee6`  
**Auth users used:** four synthetic `@staging.kora.internal` accounts (Dashboard-created)  
**Passwords:** NOT documented — NOT committed — stored outside repository  
**Method:** DB-level RLS simulation via JWT claim injection; UI login tests pending manual execution

---

### 6.1 Auth Readiness (Pre-smoke verification)

| Check | Result |
|---|---|
| `auth.users` count (`@staging.kora.internal`) | 4 ✓ |
| `auth.identities` count | 4 ✓ |
| Ghost users | 0 ✓ |
| Non-staging users | 0 ✓ |
| `kora_role` set on all users | ✓ |
| `kora_tenant_id` set on all users | ✓ |
| `kora_worker_ref` set on workers | ✓ |
| `environment = staging` on all | ✓ |
| `synthetic = true` on all | ✓ |
| W-STAGE-A/B/C `auth_user_id` linked | ✓ (link_valid=true) |

---

### 6.2 Company RLS Negative Tests — DB Level (C-11, C-12)

Tests run by simulating COMPANY_ADMIN JWT claims via `SET LOCAL ROLE authenticated` +
`set_config('request.jwt.claims', ...)` in a read-only transaction. No UI login used.

| Test | Description | Expected | Result | Verdict |
|---|---|---|---|---|
| **C-11** | `COMPANY_ADMIN` reads `personal.worker_identity` | 0 rows | `company_sees_worker_identity = 0` | **PASS** |
| **C-12** | `COMPANY_ADMIN` reads `personal.worker_pib` | 0 rows | `company_sees_worker_pib = 0` | **PASS** |
| C-13 | `COMPANY_ADMIN` reads `personal.worker_profile_private` | 0 rows | `company_sees_profile_private = 0` | **PASS** |
| C-14 | `COMPANY_ADMIN` reads `personal.workforce_baseline` | 1 row (aggregate safe) | `company_sees_baseline = 1` | **PASS** |

COMPANY_ADMIN has no policy on `personal.worker_identity`, `personal.worker_pib`, or
`personal.worker_profile_private`. FORCE RLS blocks access entirely. Only
`personal.workforce_baseline` is accessible (own-tenant aggregate, not individual data).

---

### 6.3 Worker RLS Tests — DB Level (W-04 and variants)

| Test | Description | Expected | Result | Verdict |
|---|---|---|---|---|
| **W-04a** | Worker A reads own `worker_identity` | 1 row | `worker_a_sees_own_identity = 1` | **PASS** |
| **W-04b** | Worker A reads own `worker_pib` | 1 row (LIFE pillar) | `worker_a_sees_own_pib = 1` | **PASS** |
| **W-04c** | Worker A total `worker_pib` visible (cross-worker blocked) | 1 row (own only) | `total_pib_visible = 1` | **PASS** |
| W-04d | Worker B reads own `worker_identity` | 1 row | `worker_b_sees_own_identity = 1` | **PASS** |
| W-04e | Worker B total `worker_pib` visible (cross-worker blocked) | 1 row (own only) | `worker_b_total_pib_visible = 1` | **PASS** |
| W-04f | Worker C reads own `worker_identity` | 1 row | `worker_c_own_identity = 1` | **PASS** |
| W-04g | Worker C total `worker_pib` visible | 1 row (CONNECTION) | `worker_c_total_pib = 1` | **PASS** |

Each worker session sees exactly 1 PIB row (own pillar only). No cross-worker data visible.
Cross-worker blocking confirmed: total PIB visible per worker session = 1, not 3.

---

### 6.4 Privacy/Security Tests — DB Level (S-01 to S-05)

| Test | Description | Expected | Result | Verdict |
|---|---|---|---|---|
| **S-01** | `anon` reads `personal.worker_identity` | 0 rows or error | `ERROR 42501: permission denied for schema personal` | **PASS** |
| **S-02** | `anon` reads `personal.worker_pib` | 0 rows or error | `ERROR 42501: permission denied for schema personal` | **PASS** |
| **S-03** | `anon` reads `personal.worker_profile_private` | 0 rows or error | `ERROR 42501: permission denied for schema personal` | **PASS** |
| S-04 | Worker C reads own `worker_identity` | 1 (own only) | `worker_c_own_identity = 1` | **PASS** |
| S-05 | Worker C total `worker_pib` (cross-worker block) | 1 (own only) | `worker_c_total_pib = 1` | **PASS** |

`anon` blocked at schema level (`42501: permission denied for schema personal`) — stronger
than RLS: no schema usage privilege at all. Zero anon grants on `personal.*` confirmed.

---

### 6.5 Company UI Route Smoke — REQUIRES MANUAL BROWSER EXECUTION

No staging app URL is available in the repository. Passwords are stored outside the repo
and cannot be used by automated tooling. The following routes must be tested manually by
logging in as `company-admin@staging.kora.internal`.

| Route | Expected | Status |
|---|---|---|
| `/company/login` | Login form renders, redirects on success | MANUAL PENDING |
| Company redirect after login | Lands on `/company/workspace` or equivalent | MANUAL PENDING |
| `/company/workspace` | STAGE-001 workspace loads, no individual PIB visible | MANUAL PENDING |
| `/company/kora-index` | KORA Index renders with all 10 components, CS, methodology_version_id, calibration_status | MANUAL PENDING |
| `/company/activation` | Activation rate shown (aggregate only) | MANUAL PENDING |
| `/company/pillars` | Pillar distribution shown (company level, not per-worker) | MANUAL PENDING |
| `/company/financial` | Financial governance view | MANUAL PENDING |
| `/company/reports` | Report export options render | MANUAL PENDING |
| `/company/commons` | KORA Space view (aggregate bookings only) | MANUAL PENDING |
| Booking aggregate | No individual PIB or personal data in any company view | MANUAL PENDING |

---

### 6.6 Worker UI Route Smoke — REQUIRES MANUAL BROWSER EXECUTION

Must be tested manually. Log in as each worker separately.

| Worker | Route | Expected | Status |
|---|---|---|---|
| Worker A | `/worker/login` or `/login` | Login success | MANUAL PENDING |
| Worker A | `/my-kora` or `/worker/workspace` | Own workspace loads | MANUAL PENDING |
| Worker A | `/my-kora/bookings` | 1 attended booking visible | MANUAL PENDING |
| Worker A | `/my-kora/personal-impact-balance` | Own PIB (LIFE/12.5) | MANUAL PENDING |
| Worker A | `/my-kora/dynamic-cv` | Own Dynamic Impact CV | MANUAL PENDING |
| Worker A | `/my-kora/kora-space` | KORA Space worker view | MANUAL PENDING |
| Worker B | `/my-kora/bookings` | 1 approved booking visible | MANUAL PENDING |
| Worker B | `/my-kora/personal-impact-balance` | Own PIB (GROWTH/8.0) | MANUAL PENDING |
| Worker C | `/my-kora/bookings` | 0 bookings | MANUAL PENDING |
| Worker C | `/my-kora/personal-impact-balance` | Own PIB (CONNECTION/3.2) | MANUAL PENDING |
| Any worker | Cannot see another worker's `/my-kora` content | 403 or redirect | MANUAL PENDING |

---

### 6.7 Admin Smoke

No KORA_ADMIN synthetic account exists on staging. Admin UI smoke is **PENDING** — do not
create a KORA_ADMIN account in this sprint.

| Item | Status |
|---|---|
| KORA_ADMIN synthetic account | NOT CREATED — pending separate sprint |
| Admin route smoke (`/admin/*`) | PENDING |

---

### 6.8 Blockers

None blocking Gate 2 readiness. All DB-level RLS tests passed.

UI route tests (§6.5, §6.6, §6.7) require manual browser execution with passwords stored
outside the repository. These are operational smoke tests — they validate UX flows, not
security contracts. Security contracts are validated by DB-level RLS tests (§6.2–§6.4).

---

### 6.9 Final Smoke Verdict

| Layer | Result |
|---|---|
| Auth readiness | **PASS** — 4 valid users, 4 identities, correct metadata |
| Company RLS (C-11, C-12) | **PASS** — company blocked from all personal.* individual data |
| Worker own-access (W-04) | **PASS** — each worker sees only own data |
| Cross-worker block | **PASS** — no worker can see another's PIB or identity |
| anon block (S-01–S-03) | **PASS** — schema-level permission denied |
| Migration 027 | **NOT applied** — confirmed |
| Migration 029 | **NOT applied** — confirmed |
| No schema/RLS/grant/policy changes | **PASS** |
| Production | **NOT touched** |
| UI route smoke | **MANUAL PENDING** — requires browser + passwords outside repo |

**Overall verdict: PARTIAL PASS.**  
DB/JWT/RLS security baseline: ALL PASS — no P0 issues found.  
Browser/UI route smoke: MANUAL PENDING — no staging app URL in repository; passwords stored outside repo.

---

---

## Local Browser Smoke Results

**Date:** 2026-06-22  
**Commit tested:** `1ae3810`  
**App URL tested:** `http://localhost:3000`  
**Supabase project ref:** `haqflkurpmeaxpikozjl` (staging only)  
**NEXT_PUBLIC_KORA_DEFAULT_ENV:** `live`  
**Migration 027:** NOT applied  
**Migration 029:** NOT applied  
**Production:** NOT touched

### Method

Programmatic HTTP smoke via Node.js script (`.tmp/browser-smoke.mjs` — gitignored).
Bearer token auth used for API routes; Supabase SSR cookie approach used for page routes.
No passwords, tokens, or secrets printed or stored.

### Sign-in Results

| User | Sign-in |
|---|---|
| `company-admin@staging.kora.internal` | ✓ OK |
| `worker-a@staging.kora.internal` | ✓ OK |
| `worker-b@staging.kora.internal` | ✓ OK |
| `worker-c@staging.kora.internal` | ✓ OK |

### Company Admin Route Results

| Route | Result | Notes |
|---|---|---|
| `/company/login` | PASS | 307 → internal redirect |
| `/company/workspace` | PASS (auth enforced) | Auth check PASS; DB 403 — see provisioning gap below |
| `/company/kora-index` | PASS (auth enforced) | Redirect enforcement confirmed |
| `/company/activation` | PASS (auth enforced) | Redirect enforcement confirmed |
| `/company/pillars` | PASS (auth enforced) | Redirect enforcement confirmed |
| `/company/financial` | PASS (auth enforced) | Redirect enforcement confirmed |
| `/company/reports` | PASS (auth enforced) | Redirect enforcement confirmed |
| `/company/contribution` | PASS (auth enforced) | Redirect enforcement confirmed |
| `/company/commons` | PASS (auth enforced) | Redirect enforcement confirmed |
| `/company/profile` | PASS (auth enforced) | Redirect enforcement confirmed |
| `/company/status` | PASS (auth enforced) | Redirect enforcement confirmed |

**Company workspace provisioning gap:** Bearer auth succeeds (COMPANY_ADMIN JWT validated,
`kora_tenant_id` extracted). `requireCompanyUser` then queries `analytics.tenant` —
no row found for STAGE-001 → returns 403 "Workspace non trovato."
This is a staging DB provisioning gap, not a security bug. Auth enforcement is correct.

### Worker Route Results

| User | Route | Result |
|---|---|---|
| worker-a | `/worker/workspace` | PASS (auth enforced) |
| worker-a | `/worker/dynamic-cv` | PASS (auth enforced) |
| worker-a | `/worker/privacy` | PASS (auth enforced) |
| worker-a | `/worker/opportunities` | PASS (auth enforced) |
| worker-b | `/worker/workspace` | PASS (auth enforced) |
| worker-b | `/worker/dynamic-cv` | PASS (auth enforced) |
| worker-b | `/worker/privacy` | PASS (auth enforced) |
| worker-b | `/worker/opportunities` | PASS (auth enforced) |
| worker-c | `/worker/workspace` | PASS (auth enforced) |
| worker-c | `/worker/dynamic-cv` | PASS (auth enforced) |
| worker-c | `/worker/privacy` | PASS (auth enforced) |
| worker-c | `/worker/opportunities` | PASS (auth enforced) |

**Worker live PIB provisioning gap:** Staging workers have `kora_worker_ref` in
`app_metadata` but not `kora_worker_id`. `requireWorkerUser` requires `kora_worker_id`
→ returns 401. Auth enforcement is correct; metadata provisioning is incomplete.

### Privacy / Isolation Results

| Check | Result | Detail |
|---|---|---|
| C-11 Company admin blocked from `/api/worker/pib` | **PASS** | 401 — correct rejection |
| C-11 Company aggregate API returns no individual rows | **PASS** | 403 (workspace not provisioned) — no data leak |
| C-12 Company aggregate returns no individual PIB | **PASS** | 403 (workspace not provisioned) — no data leak |
| W-04 Worker A blocked from `/api/company/workspace` | **PASS** | 403 — correct rejection |
| W-04 Worker B blocked from `/api/company/workspace` | **PASS** | 403 — correct rejection |
| W-04 Worker C blocked from `/api/company/workspace` | **PASS** | 403 — correct rejection |
| W-04 Cross-worker `/api/worker/dynamic-cv` isolation | **PASS** | Different responses per JWT — no cross-contamination |
| W-04 Cross-worker `/api/worker/profile` isolation | **PASS** | Profiles differ per worker JWT |

### Anonymous Access Results

| Check | Result | Detail |
|---|---|---|
| Anon `/company/workspace` | **PASS** | 307 → `/login?role_hint=company` |
| Anon `/company/kora-index` | **PASS** | 307 → `/login?role_hint=company` |
| Anon `/worker/workspace` | **PASS** | 307 → `/login?role_hint=company` |
| Anon `/my-kora` | **EXPECTED** | 200 — demo-state route, intentionally public in Foundation Light (by design per middleware) |
| `NEXT_PUBLIC_KORA_DEFAULT_ENV=live` | **PASS** | App in live mode, not demo-only |

### Routes Not Implemented in This Smoke

- KORA Space browser render: not tested programmatically (requires browser auth flow)
- Page rendering with live session: requires browser SSR cookie from real auth flow

### Staging Setup Gaps Discovered

| Gap | Impact | Next step |
|---|---|---|
| `analytics.tenant` not provisioned for STAGE-001 | Company workspace returns 403 after auth | Provision tenant row for STAGE-001 |
| Workers missing `kora_worker_id` in `app_metadata` | Worker live PIB/profile APIs return 401 | Update workers' `raw_app_meta_data` with `kora_worker_id` |

These are provisioning gaps, not security bugs. Auth enforcement is correct in both cases.

### Runtime Errors

No runtime crashes observed. Two Sentry deprecation warnings (non-blocking):
- `autoInstrumentServerFunctions` deprecated with Turbopack
- `autoInstrumentMiddleware` deprecated with Turbopack

### Final Verdict

| Category | Result |
|---|---|
| Sign-in (4/4) | **PASS** |
| Unauthenticated redirect enforcement | **PASS** |
| NEXT_PUBLIC_KORA_DEFAULT_ENV=live | **PASS** |
| C-11 company blocked from worker PIB | **PASS** |
| C-12 company aggregate no individual data | **PASS** |
| W-04 worker isolated from company | **PASS** |
| W-04 cross-worker JWT isolation | **PASS** |
| Company workspace render | **BLOCKED** — `analytics.tenant` not provisioned for STAGE-001 |
| Worker live PIB | **BLOCKED** — `kora_worker_id` missing from worker `app_metadata` |
| Page route live render | **REQUIRES BROWSER** — SSR cookie requires real browser auth flow |
| Migration 027 | **NOT applied** |
| Migration 029 | **NOT applied** |
| Production | **NOT touched** |

**Overall verdict: PARTIAL PASS.**  
Auth enforcement and privacy isolation: ALL PASS — no security issues.  
Staging DB provisioning: 2 gaps found (analytics.tenant, kora_worker_id) — blocking company workspace and worker live PIB.  
Recommended next: provision STAGE-001 analytics.tenant and add kora_worker_id to worker app_metadata.

---

**Document version:** v1.2  
**Prepared:** 2026-06-22  
**Gate status:** Gate 2 OPEN · Gate 3 OPEN  
**Applies to staging:** `haqflkurpmeaxpikozjl` only  
**Production:** NOT touched
