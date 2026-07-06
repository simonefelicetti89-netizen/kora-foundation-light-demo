# Gate 2 — Phase 1 Auth Users & Smoke Ready

> Archived: canonical Gate 2 status now lives in docs/GATE2_STATUS.md.

**Status:** Auth users created — identity link complete — smoke tests ready  
**Staging project:** `haqflkurpmeaxpikozjl` (dedicated staging only)  
**Production:** NOT touched  
**Date:** 2026-06-21  
**HEAD at sprint:** `31d72a0`

> **Migration 027 NOT applied.** See `GATE2_PHASE1_POST_MIGRATION_VERIFICATION.md §7`.  
> **Migration 029 NOT applied.** Emergency safety net only.  
> **Staging only.** Synthetic accounts only. No real worker or company data.

---

## 1. Auth Users Created

Four synthetic Supabase Auth users created on staging via direct SQL on `auth.users`
(Management API — postgres role). All emails use `@staging.kora.internal` domain.
No real emails. No real people. Email pre-confirmed (`email_confirmed_at = now()`).

| Email | Auth UUID | kora_role | confirmed |
|---|---|---|---|
| `company-admin@staging.kora.internal` | `ca000001-0001-0001-0001-000000000001` | COMPANY_ADMIN | ✓ |
| `worker-a@staging.kora.internal` | `a0000001-000a-000a-000a-000000000001` | WORKER | ✓ |
| `worker-b@staging.kora.internal` | `b0000002-000b-000b-000b-000000000002` | WORKER | ✓ |
| `worker-c@staging.kora.internal` | `c0000003-000c-000c-000c-000000000003` | WORKER | ✓ |

---

## 2. App Metadata Claims

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

### Worker A / B / C (pattern)

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

---

## 3. Worker Identity Link

`personal.worker_identity.auth_user_id` updated for all three STAGE-001 workers:

| worker_ref | worker_identity.id | auth_user_id (real) |
|---|---|---|
| W-STAGE-A | `bbbbbbbb-000a-000a-000a-000000000001` | `a0000001-000a-000a-000a-000000000001` |
| W-STAGE-B | `bbbbbbbb-000b-000b-000b-000000000002` | `b0000002-000b-000b-000b-000000000002` |
| W-STAGE-C | `bbbbbbbb-000c-000c-000c-000000000003` | `c0000003-000c-000c-000c-000000000003` |

Only STAGE-001 rows updated (`tenant_id = 'aaaaaaaa-0001-0001-0001-000000000001'`).
No other tenant rows touched. PIB, bookings, and contribution events unchanged.

---

## 4. Password Handling

**Passwords are NOT committed to this repository.**  
**Passwords are NOT printed in any sprint output.**

Each auth user was created with `crypt(gen_random_uuid()::text, gen_salt('bf'))` — a
random bcrypt hash whose plaintext is never known or stored.

**Before running login-based UI smoke tests**, passwords must be set via one of:

- **Supabase Dashboard** → Authentication → Users → find the user → "Send magic link" or manually set a password
- **Supabase Auth Admin API** `PATCH /admin/users/{user_id}` with `{"password": "..."}` using the service role key (not committed)

Passwords and the service role key must be stored outside the repository
(e.g. local `.env.staging.local` — gitignored, 1Password, or equivalent).

---

## 5. Pre-Smoke-Test Checklist

Before running the UI smoke tests in `docs/GATE2_PHASE1_STAGING_SEED_AND_SMOKE.md §5`:

- [ ] Set a known password for `company-admin@staging.kora.internal` via Dashboard
- [ ] Set a known password for `worker-a@staging.kora.internal` via Dashboard
- [ ] Set a known password for `worker-b@staging.kora.internal` via Dashboard
- [ ] Set a known password for `worker-c@staging.kora.internal` via Dashboard
- [ ] Store passwords outside the repo (gitignored `.env.staging.local` or 1Password)
- [ ] Confirm staging app URL is accessible (not production)
- [ ] Confirm app reads JWT `app_metadata.kora_role` and `app_metadata.kora_tenant_id`
- [ ] Confirm `kora.kora_role()` and `kora.tenant_id()` functions resolve from JWT claims

---

## 6. UI Smoke Test Reference

Full UI smoke test checklist:  
**`docs/GATE2_PHASE1_STAGING_SEED_AND_SMOKE.md §5`**

Covers:
- Company workspace (C-01 to C-13)
- Worker workspace (W-01 to W-12)
- Admin workspace (A-01 to A-05)
- Privacy & Security (S-01 to S-10)

---

## 7. Migration State

| Migration | Status |
|---|---|
| 001–026 | ✓ Applied |
| 027 | **NOT applied** — DO NOT apply until Gate 2 + Gate 3 close and all prerequisites met |
| 028 | ✓ Applied |
| 029 | NOT applied — emergency safety net only |

---

## 8. Warnings

- **STAGING ONLY** — these are synthetic test accounts on `haqflkurpmeaxpikozjl`
- **SYNTHETIC ACCOUNTS ONLY** — no real worker or company data
- **No real emails** — `@staging.kora.internal` is an internal staging domain
- **Passwords not committed** — must be set via Dashboard before login tests
- **Service role key not committed** — must never appear in git history
- **Migration 027 still not applied** — worker PIB remains visible to KORA_ADMIN (pre-027 state)
- **Do not run production smoke tests** against these accounts

---

**Document version:** v1.0  
**Prepared:** 2026-06-21  
**Gate status:** Gate 2 OPEN · Gate 3 OPEN  
**Applies to staging:** `haqflkurpmeaxpikozjl` only  
**Production:** NOT touched
