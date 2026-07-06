# Gate 2 — Phase 1 Auth Integrity Audit & Repair Plan

> Archived: canonical Gate 2 status now lives in docs/GATE2_STATUS.md.

**Status:** Ghost users removed — staging ready for valid user creation  
**Staging project:** `haqflkurpmeaxpikozjl` (dedicated staging only)  
**Production:** NOT touched  
**Date:** 2026-06-21  
**HEAD at audit:** `889c3d0`

> **Migration 027 NOT applied.**  
> **Migration 029 NOT applied.**

---

## 1. Dashboard Observation

Supabase Dashboard → Authentication → Users showed:

> "No users in your project"  
> Footer: "Total: 10 users estimated"

This inconsistency — users counted but not shown — indicated that `auth.users` rows
existed but the Auth subsystem did not recognise them as valid users. The root cause
is a missing `auth.identities` table entry for each user.

---

## 2. Audit Findings

### auth.users (before cleanup)

| Email | ID | has_password | email_confirmed | has_app_meta | kora_role | synthetic |
|---|---|---|---|---|---|---|
| `company-admin@staging.kora.internal` | `ca000001-0001-0001-0001-000000000001` | ✓ | ✓ | ✓ | COMPANY_ADMIN | true |
| `worker-a@staging.kora.internal` | `a0000001-000a-000a-000a-000000000001` | ✓ | ✓ | ✓ | WORKER | true |
| `worker-b@staging.kora.internal` | `b0000002-000b-000b-000b-000000000002` | ✓ | ✓ | ✓ | WORKER | true |
| `worker-c@staging.kora.internal` | `c0000003-000c-000c-000c-000000000003` | ✓ | ✓ | ✓ | WORKER | true |

**Total auth.users: 4. Total auth.identities: 0.**

### Ghost user assessment

All 4 rows in `auth.users` were **ghost records** — each lacked a corresponding row in
`auth.identities`. Supabase Auth requires `auth.identities` to register an identity
provider (e.g. `email`) for each user. Without it:

- The Auth subsystem does not recognise the user as valid.
- The Dashboard does not display the user in the Auth Users list.
- JWT sign-in flows (`signInWithPassword`) cannot complete.
- The user cannot authenticate even though a bcrypt hash was present.

### Why this happened

The previous sprint used a direct SQL INSERT into `auth.users` (via `supabase db query
--linked`). This bypasses Supabase's internal Auth provisioning layer, which:

1. Creates the `auth.users` row.
2. Creates the `auth.identities` row with `provider='email'` and `provider_id=<email>`.
3. Handles password hashing through the Auth API rather than raw SQL.

Direct SQL INSERT satisfies step 1 but skips steps 2 and 3 as atomic operations managed
by Supabase Auth.

**Rule established:** Direct INSERT into `auth.users` must never be used again.
Use only Supabase Auth Admin API or Supabase Dashboard for all future user creation.

### Additional checks

| Check | Result |
|---|---|
| Real (non-staging) users in `auth.users` | 0 — no real users at risk |
| `auth.sessions` for ghost user IDs | 0 — no orphaned sessions |
| `auth.refresh_tokens` for ghost user IDs | 0 — no orphaned tokens |

---

## 3. Repair Strategy — Strategy B (Ghost User Cleanup)

**Strategy B** was applied: confirm ghost state → execute cleanup → revert worker_identity
links → document correct creation method for next sprint.

### Cleanup executed (staging only, 2026-06-21)

1. **Deleted** 4 ghost rows from `auth.users` (only `@staging.kora.internal` emails).
2. **Reverted** `personal.worker_identity.auth_user_id` for W-STAGE-A/B/C to original
   synthetic seed placeholder UUIDs.

### Post-cleanup state (verified)

| Check | Result |
|---|---|
| `auth.users` rows remaining | 0 |
| `auth.identities` rows remaining | 0 |
| `personal.worker_identity` W-STAGE-A `auth_user_id` | `a1000000-a000-a000-a000-000000000001` (seed placeholder) |
| `personal.worker_identity` W-STAGE-B `auth_user_id` | `b2000000-b000-b000-b000-000000000002` (seed placeholder) |
| `personal.worker_identity` W-STAGE-C `auth_user_id` | `c3000000-c000-c000-c000-000000000003` (seed placeholder) |
| STAGE-001 synthetic seed data | Intact — tenant, workers, bookings, PIB all present |

---

## 4. Correct Auth User Creation Method

**Preferred: Supabase Dashboard**

1. Go to Supabase Dashboard → project `haqflkurpmeaxpikozjl` → Authentication → Users
2. Click **"Add user"** → **"Create new user"**
3. Enter email (e.g. `company-admin@staging.kora.internal`)
4. Set a password (store outside repo — never commit)
5. Enable **"Auto Confirm User"** so email confirmation is pre-confirmed
6. After creation, set `app_metadata` via Dashboard or Auth Admin API

**Alternative: Supabase Auth Admin API**

```
POST https://<project-ref>.supabase.co/auth/v1/admin/users
Authorization: Bearer <service_role_key>   ← stored outside repo, never committed
Content-Type: application/json

{
  "email": "company-admin@staging.kora.internal",
  "password": "<redacted — store outside repo>",
  "email_confirm": true,
  "app_metadata": {
    "kora_role": "COMPANY_ADMIN",
    "kora_tenant_id": "aaaaaaaa-0001-0001-0001-000000000001",
    "tenant_code": "STAGE-001",
    "environment": "staging",
    "synthetic": true
  }
}
```

**Repeat for worker-a/b/c with WORKER role and `kora_worker_ref`.**

Do NOT print or commit:
- service role key
- passwords
- connection strings

---

## 5. Worker Identity Relink Requirement

After valid auth users are created via Dashboard or Auth Admin API:

1. Note the real auth UUIDs assigned by Supabase to each user.
2. Run an UPDATE on `personal.worker_identity` (staging only):

```sql
-- Replace <real_auth_uuid_worker_a/b/c> with actual UUIDs from Dashboard/API
BEGIN;
UPDATE personal.worker_identity
  SET auth_user_id = '<real_auth_uuid_worker_a>', updated_at = now()
  WHERE tenant_id = 'aaaaaaaa-0001-0001-0001-000000000001'
    AND worker_ref = 'W-STAGE-A'
    AND id = 'bbbbbbbb-000a-000a-000a-000000000001';

UPDATE personal.worker_identity
  SET auth_user_id = '<real_auth_uuid_worker_b>', updated_at = now()
  WHERE tenant_id = 'aaaaaaaa-0001-0001-0001-000000000001'
    AND worker_ref = 'W-STAGE-B'
    AND id = 'bbbbbbbb-000b-000b-000b-000000000002';

UPDATE personal.worker_identity
  SET auth_user_id = '<real_auth_uuid_worker_c>', updated_at = now()
  WHERE tenant_id = 'aaaaaaaa-0001-0001-0001-000000000001'
    AND worker_ref = 'W-STAGE-C'
    AND id = 'bbbbbbbb-000c-000c-000c-000000000003';
COMMIT;
```

3. Verify with:
```sql
SELECT id, worker_ref, auth_user_id FROM personal.worker_identity
WHERE tenant_id = 'aaaaaaaa-0001-0001-0001-000000000001'
ORDER BY worker_ref;
```

---

## 6. Migration State

| Migration | Status |
|---|---|
| 001–026 | ✓ Applied |
| 027 | **NOT applied** |
| 028 | ✓ Applied |
| 029 | NOT applied — emergency safety net only |

---

## 7. Rule: No Future Direct Insert into auth.users

**DO NOT** insert directly into `auth.users` again via SQL or `supabase db query`.

Reason: Direct INSERT skips `auth.identities` creation and other internal Auth
provisioning steps managed by the Supabase Auth subsystem. The result is a ghost
user that is invisible to the Dashboard and cannot authenticate.

Always use:
- Supabase Dashboard → Authentication → Users → "Add user"
- Supabase Auth Admin API (`POST /auth/v1/admin/users`) with service role key

---

## 8. Next Manual Action

1. Open Supabase Dashboard → `haqflkurpmeaxpikozjl` → Authentication → Users
2. Confirm the Users list is empty (ghost cleanup verified above)
3. Create 4 users via **"Add user"** → **"Create new user"**:
   - `company-admin@staging.kora.internal` — COMPANY_ADMIN
   - `worker-a@staging.kora.internal` — WORKER / W-STAGE-A
   - `worker-b@staging.kora.internal` — WORKER / W-STAGE-B
   - `worker-c@staging.kora.internal` — WORKER / W-STAGE-C
4. For each user, set `app_metadata` via Dashboard or Auth Admin API PATCH call
5. Note the real auth UUIDs assigned by Supabase
6. Run the worker_identity UPDATE SQL above (§5) with the real UUIDs
7. Verify linkage via read-only query
8. Proceed to UI smoke tests per `docs/GATE2_PHASE1_STAGING_SEED_AND_SMOKE.md §5`

---

**Document version:** v1.0  
**Prepared:** 2026-06-21  
**Gate status:** Gate 2 OPEN · Gate 3 OPEN  
**Applies to staging:** `haqflkurpmeaxpikozjl` only  
**Production:** NOT touched
