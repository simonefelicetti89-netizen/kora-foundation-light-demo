# Gate 2 — Phase 1 Valid Auth Users Ready

**Status:** Auth metadata set — worker identity linked — passwords reset — smoke tests ready  
**Staging project:** `haqflkurpmeaxpikozjl` (dedicated staging only)  
**Production:** NOT touched  
**Date:** 2026-06-22  
**HEAD at sprint:** `cd77fd9`

> **Migration 027 NOT applied.**  
> **Migration 029 NOT applied.** Emergency safety net only.  
> **STAGING ONLY.** Synthetic accounts only. No real worker or company data.

---

## 1. Users Created via Dashboard

All four synthetic staging users were created via Supabase Dashboard →
Authentication → Users → **"Add user" → "Create new user"** with Auto Confirm
enabled. No direct INSERT into `auth.users` was used.

| Email | Auth UUID | email_confirmed | has_identity | provider |
|---|---|---|---|---|
| `company-admin@staging.kora.internal` | `f7ddaae2-0c02-445d-ac2a-22d55dd24b64` | ✓ | ✓ | email |
| `worker-a@staging.kora.internal` | `12a3116a-086e-42be-be60-40ab50e00b93` | ✓ | ✓ | email |
| `worker-b@staging.kora.internal` | `38f0c8dd-6738-48a5-a928-0350e2a1ec4e` | ✓ | ✓ | email |
| `worker-c@staging.kora.internal` | `efe9c796-640f-4d3e-9e00-434696a3cfa7` | ✓ | ✓ | email |

`auth.identities` verified: 4 rows — one per user, provider=email. No ghost users.

---

## 2. auth.identities Verification

All four users confirmed to have valid `auth.identities` rows before any metadata
update was applied. Dashboard creation creates both `auth.users` and `auth.identities`
atomically — the ghost-user failure mode from direct SQL INSERT does not apply here.

---

## 3. App Metadata Set (raw_app_meta_data)

`raw_app_meta_data` was updated via `UPDATE auth.users SET raw_app_meta_data = ...`
targeting only the four `@staging.kora.internal` emails.

**What was NOT updated:** `encrypted_password`, `email`, `raw_user_meta_data`,
`auth.identities` rows. No users were created or deleted.

### Note on raw_app_meta_data vs raw_user_meta_data

KORA authorization claims belong in `raw_app_meta_data`, not `raw_user_meta_data`.
`raw_app_meta_data` is protected — only admin/service-role can write it.
`raw_user_meta_data` is user-writable and must never be trusted for authorization.
JWT claims `app_metadata.*` (from `raw_app_meta_data`) are what RLS policies evaluate.

### Company Admin

```json
{
  "provider": "email",
  "providers": ["email"],
  "kora_role": "COMPANY_ADMIN",
  "kora_tenant_id": "aaaaaaaa-0001-0001-0001-000000000001",
  "tenant_code": "STAGE-001",
  "environment": "staging",
  "synthetic": true
}
```

### Worker A / B / C (pattern — kora_worker_ref varies)

```json
{
  "provider": "email",
  "providers": ["email"],
  "kora_role": "WORKER",
  "kora_tenant_id": "aaaaaaaa-0001-0001-0001-000000000001",
  "kora_worker_ref": "W-STAGE-A",
  "environment": "staging",
  "synthetic": true
}
```

(`kora_worker_ref` is `W-STAGE-A`, `W-STAGE-B`, `W-STAGE-C` respectively)

Post-update verification confirmed all four users have correct `raw_app_meta_data`.

---

## 4. Worker Identity Relink

`personal.worker_identity.auth_user_id` updated for all three STAGE-001 workers
to point to the real Dashboard-assigned auth UUIDs:

| worker_ref | worker_identity.id | auth_user_id (real) | linked_email | link_valid |
|---|---|---|---|---|
| W-STAGE-A | `bbbbbbbb-000a-000a-000a-000000000001` | `12a3116a-086e-42be-be60-40ab50e00b93` | `worker-a@staging.kora.internal` | ✓ |
| W-STAGE-B | `bbbbbbbb-000b-000b-000b-000000000002` | `38f0c8dd-6738-48a5-a928-0350e2a1ec4e` | `worker-b@staging.kora.internal` | ✓ |
| W-STAGE-C | `bbbbbbbb-000c-000c-000c-000000000003` | `efe9c796-640f-4d3e-9e00-434696a3cfa7` | `worker-c@staging.kora.internal` | ✓ |

`link_valid` confirmed: each `auth_user_id` resolves to the correct `auth.users.id`.
Only STAGE-001 rows updated (`tenant_id = 'aaaaaaaa-0001-0001-0001-000000000001'`).
Zero non-STAGE-001 rows affected. PIB, bookings, contribution events unchanged.

---

## 5. Password Handling

**Passwords are NOT committed to this repository.**  
**Passwords are NOT printed in any sprint output, log, or terminal.**

### Reset method

Passwords for all four synthetic staging users were updated via the **Supabase
Auth Admin API** (`PUT /auth/v1/admin/users/{user_id}` — `password` field only).

- Method: Auth Admin API — no direct `INSERT` or `UPDATE` into `auth.users`
- Script: `.tmp/reset-staging-passwords.mjs` — gitignored, never committed
- Env source: `.env.staging.local` + `.env.staging.passwords.local` — both gitignored
- Passwords: read from local env file — never printed, never logged, never committed
- No users created or deleted
- No metadata altered (`raw_app_meta_data`, `raw_user_meta_data` unchanged)
- No `auth.identities` rows altered
- `worker_identity` links unchanged

### Sign-in verification

After reset, all four users passed a programmatic sign-in test
(`POST /auth/v1/token?grant_type=password`). Access tokens were not printed or stored.
Only success/failure per email was logged.

| User | Password reset | Sign-in result |
|---|---|---|
| `company-admin@staging.kora.internal` | ✓ Auth Admin API | sign-in OK |
| `worker-a@staging.kora.internal` | ✓ Auth Admin API | sign-in OK |
| `worker-b@staging.kora.internal` | ✓ Auth Admin API | sign-in OK |
| `worker-c@staging.kora.internal` | ✓ Auth Admin API | sign-in OK |

Passwords are stored outside the repository in `.env.staging.passwords.local` (gitignored).
Passwords must not appear in any file, commit, or log.

---

## 6. Security Verification

| Check | Result |
|---|---|
| `auth.identities` rows | 4 (one per user, all email provider) |
| Ghost users | 0 |
| `anon` grants on `personal.*` | 0 |
| COMPANY_ADMIN/VIEWER direct `personal.*` policies | 0 |
| All 10 `personal.*` tables RLS=true, FORCE RLS=true | 10/10 ✓ |
| Migration 027 not applied | mig_027 count = 0 ✓ |
| Migration 029 not applied | ✓ |
| Non-staging users | 0 |

---

## 7. Migration State

| Migration | Status |
|---|---|
| 001–026 | ✓ Applied |
| 027 | **NOT applied** |
| 028 | ✓ Applied |
| 029 | NOT applied — emergency safety net only |

---

## 8. Next Step: UI Smoke Tests

Staging is now ready for UI smoke tests.

Pre-smoke checklist:
- [x] Four valid Auth users exist with `auth.identities`
- [x] All users are email-confirmed
- [x] `raw_app_meta_data` contains correct `kora_role`, `kora_tenant_id`, `environment`, `synthetic`
- [x] Workers have `kora_worker_ref`
- [x] W-STAGE-A/B/C linked to real auth UUIDs in `personal.worker_identity`
- [x] STAGE-001 seed data intact (tenant, workers, bookings, PIB)
- [x] Passwords reset via Auth Admin API — not committed, not printed
- [ ] Staging app URL accessible (confirm staging deploy, not production)
- [ ] App reads JWT `app_metadata.kora_role` and `app_metadata.kora_tenant_id` from `raw_app_meta_data`

Run smoke tests per: **`docs/GATE2_PHASE1_STAGING_SEED_AND_SMOKE.md §5`**

Priority tests:
- **C-11, C-12**: Company role blocked from `personal.*` data
- **W-04**: Cross-worker RLS block (Worker A cannot read Worker B's data)
- **S-01–S-05**: Privacy boundary enforcement

---

**Document version:** v1.1  
**Prepared:** 2026-06-22  
**Gate status:** Gate 2 OPEN · Gate 3 OPEN  
**Applies to staging:** `haqflkurpmeaxpikozjl` only  
**Production:** NOT touched
