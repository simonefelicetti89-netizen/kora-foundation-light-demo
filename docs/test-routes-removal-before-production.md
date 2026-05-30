# Test Routes — Removal Before Production

This document tracks all `/api/test/*` routes that exist for development and validation purposes only. These routes must be removed or isolated before any production deployment or live data onboarding.

## Routes Inventory

### 1. `POST /api/test/seed-test-tenant`

**Purpose:** Seeds the synthetic TEST-001 tenant end-to-end: creates tenant → workforce baseline → source batch → uploaded records → UEF classification → runKoraPipeline → persists results → audit log.

**Why it exists:** Full round-trip validation of the KORA pipeline against the live Supabase schema without a real operator UI. Used for Phase 2B and Phase 2C validation.

**Protection:** `NODE_ENV === 'production' → 404`, `x-kora-test-secret` header.

**Uses:** service_role (server-side only).

**Remove when:** The operator flow (`/api/admin/operator-flow`) is the canonical path for all tenant pipeline runs. This route becomes redundant once the operator UI is operational and tested.

---

### 2. `GET /api/test/read-test-tenant`

**Purpose:** Reads back the current `kora_index_result` for TEST-001 and validates that the mapper returns `status: ok`.

**Why it exists:** Verifies that persisted results can be correctly read and mapped to `ScoringResult`. Used for Phase 2B validation.

**Protection:** `NODE_ENV === 'production' → 404`, `x-kora-test-secret` header.

**Uses:** service_role (server-side only).

**Remove when:** `useScoringResult()` live path is fully wired and tested in the browser. The operator-flow GET endpoint provides equivalent server-side verification.

---

### 3. `GET /api/test/privacy-threshold`

**Purpose:** Runs 5 deterministic test cases for `lib/privacy/group-threshold.ts` via HTTP. Reports PASS/FAIL per case.

**Why it exists:** Provides a runtime-accessible N≥10 privacy enforcement validation without a test framework. Complemented by `scripts/test-privacy-threshold.ts` (terminal runner).

**Protection:** `NODE_ENV === 'production' → 404`, `x-kora-test-secret` header.

**Uses:** No DB access — pure function tests only.

**Remove when:** A proper test framework (vitest, jest) is added to the project and the privacy tests are migrated. The script `scripts/test-privacy-threshold.ts` is the preferred long-term runner.

---

### 4. `POST /api/test/setup-auth-users`

**Purpose:** Creates synthetic Supabase Auth users (`company-admin-a@example.test`, `company-admin-b@example.test`, `company-viewer-a@example.test`, `kora-admin@example.test`) with `kora_role` and `tenant_id` in `app_metadata`. Also creates TEST-A and TEST-B tenants.

**Why it exists:** Gate 3A validation — bootstraps fake auth state for RLS isolation testing. Cannot be done via the normal UI since there is no auth UI yet.

**Protection:** `NODE_ENV === 'production' → 404`, `x-kora-test-secret` header.

**Uses:** service_role + Supabase Admin API (server-side only).

**Remove when:** Operator onboarding UI exists and creates real tenant+user records via the proper flow. Test users should be deleted from the Supabase project before any production data is onboarded.

---

### 5. `GET /api/test/auth-isolation`

**Purpose:** Validates Gate 3A RLS tenant isolation by signing in as each synthetic user and asserting cross-tenant data visibility rules. Reports PASS/FAIL per assertion.

**Why it exists:** Automated end-to-end proof that the RLS model correctly enforces tenant isolation under real Supabase Auth JWT conditions.

**Protection:** `NODE_ENV === 'production' → 404`, `x-kora-test-secret` header.

**Uses:** Supabase Auth sign-in (anon key) + service_role for setup queries.

**Remove when:** A proper integration test suite covers the RLS model. This route should never run against real tenant data.

---

### 6. `GET /api/test/auth-access-check`

**Purpose:** Validates session-based access control for `/api/admin/operator-flow`: KORA_ADMIN → 200, COMPANY_ADMIN → 403, no session → 401. Added after Auth UI minima (Gate 3A+).

**Why it exists:** Automated proof that the operator API enforces session-based auth and rejects non-KORA_ADMIN users.

**Protection:** `NODE_ENV === 'production' → 404`, `x-kora-test-secret` header.

**Uses:** Supabase Auth sign-in (anon key). No direct service_role for auth — validates via session tokens.

**Remove when:** A CI integration test suite covers the operator API access control.

---

## Security Posture: Non-Session Auth Paths

### `/api/admin/operator-flow` — current status

| Auth path | Dev | Production |
|---|---|---|
| KORA_ADMIN session (cookie or Bearer token) | ✅ Allowed | ✅ Allowed |
| `x-kora-operator-secret` header fallback | ⚠️ Allowed (DEPRECATED, warns in log) | 🚫 Blocked (`NODE_ENV === 'production'`) |
| No auth | ❌ 401 | ❌ 401 |
| Company/wrong role | ❌ 403 | ❌ 403 |

The deprecated secret fallback is blocked at the code level in production — `checkAuth()` returns the 401/403 from `requireKoraAdmin()` directly without checking the header. See `docs/technical-backlog.md` TODO-002 for removal plan.

### `/api/test/*` — current status

All 6 routes:
- Return `404` in `NODE_ENV === 'production'`
- Require `x-kora-test-secret` header matching `KORA_TEST_SEED_SECRET` env var
- Use `service_role` server-side only
- Never expose `SUPABASE_SERVICE_ROLE_KEY` to the browser

### `/api/auth/logout` — current status

Safe for production: calls `signOut()` on the user's own session, redirects to `/admin/login`. No secret required, no service_role.

---

## What Replaces These Routes in Production

| Test route | Replaced by |
|---|---|
| `seed-test-tenant` | `POST /api/admin/operator-flow` (live operator pipeline) |
| `read-test-tenant` | `GET /api/admin/operator-flow` + `useScoringResult()` live hook |
| `privacy-threshold` | `scripts/test-privacy-threshold.ts` + CI test suite |
| `setup-auth-users` | Operator onboarding UI + Supabase Auth admin panel |
| `auth-isolation` | CI integration tests against staging environment |
| `auth-access-check` | CI integration tests for operator API access control |

## Pre-Production Checklist

Before any real company or worker data enters the system:

- [ ] Delete synthetic test users from Supabase Auth (`*@example.test`)
- [ ] Delete synthetic test tenants (`TEST-001`, `TEST-A`, `TEST-B`, `OP-*`)
- [ ] Remove or disable all `/api/test/*` routes
- [ ] Remove `x-kora-operator-secret` fallback from `/api/admin/operator-flow` (see TODO-002)
- [ ] Verify `NODE_ENV === 'production'` is correctly set in the deployment environment
- [ ] Confirm `KORA_TEST_SEED_SECRET`, `KORA_TEST_USER_PASSWORD`, `KORA_OPERATOR_SECRET` not set in production env
- [ ] Verify `SUPABASE_SERVICE_ROLE_KEY` is NOT exposed in any client-side bundle
- [ ] Run Gate 3A auth-isolation equivalent against staging before prod deploy
- [ ] Confirm `/api/admin/operator-flow` 200/403/401 behavior on staging with real KORA_ADMIN session
