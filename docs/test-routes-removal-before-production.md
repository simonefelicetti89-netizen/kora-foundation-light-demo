# Test Routes — Historical Record and Pre-Production Checklist

**Status as of 2026-06-21:** All `/api/test/*` routes have been **removed from `main`**.

`find app/api -type d -name "test"` and `find app/api -path "*/test*" -name "route.ts"` both return
zero results. No `pages/api` directory exists. No `KORA_ENABLE_TEST_ROUTES`, `x-kora-test-secret`,
or `lib/auth/test-route-guard.ts` references remain in the codebase.

This document is retained as:
1. **Historical context** — what the routes did and why they existed;
2. **Pre-staging checklist** — what must be done before staging provisioning;
3. **Pre-production checklist** — what must be done before any real data enters the system.

---

## Historical Context — Routes That Existed and Were Removed

These 6 routes existed during Phase 2B / Phase 2C validation. All have been removed from `main`.

| Route | Purpose | Why removed | Replaced by |
|---|---|---|---|
| `POST /api/test/seed-test-tenant` | Seeded TEST-001 tenant end-to-end via service_role | Operator UI (`/api/admin/operator-flow`) is the canonical path | `POST /api/admin/operator-flow` |
| `GET /api/test/read-test-tenant` | Read back kora_index_result for TEST-001 | `useScoringResult()` live hook covers this path | `GET /api/admin/operator-flow` + `useScoringResult()` |
| `GET /api/test/privacy-threshold` | HTTP-accessible N≥10 group threshold test (5 deterministic cases) | Vitest test suite covers privacy threshold — `tests/unit/privacy-boundary.test.ts` | `npx vitest run` |
| `POST /api/test/setup-auth-users` | Created synthetic Supabase Auth users with `kora_role`/`tenant_id` in app_metadata | Operator onboarding UI handles user creation | Operator onboarding UI + Supabase Auth admin panel |
| `GET /api/test/auth-isolation` | Validated RLS tenant isolation by signing in as each synthetic user | No staging DB exists yet; will be replaced by CI integration tests | CI integration tests against staging environment |
| `GET /api/test/auth-access-check` | Validated KORA_ADMIN → 200 / COMPANY_ADMIN → 403 / no session → 401 on operator API | Same as above | CI integration tests for operator API access control |

All routes used a triple-gate guard (`NODE_ENV === 'production' → 404`; `KORA_ENABLE_TEST_ROUTES !== 'true' → 404`; missing `x-kora-test-secret` → 401). This guard code has been removed along with the routes.

---

## Security Posture: Remaining Non-Session Auth Path

### `/api/admin/operator-flow`

| Auth path | Dev | Production |
|---|---|---|
| KORA_ADMIN session (cookie or Bearer token) | ✅ Allowed | ✅ Allowed |
| `x-kora-operator-secret` header fallback | ⚠️ Allowed (DEPRECATED — warns in log) | 🚫 Blocked (`NODE_ENV === 'production'`) |
| No auth | ❌ 401 | ❌ 401 |
| Company / wrong role | ❌ 403 | ❌ 403 |

The deprecated secret fallback must be removed before staging. See `docs/technical-backlog.md` TODO-002.

### `/api/auth/logout`

Safe for production: calls `signOut()` on the user's own session, redirects to `/admin/login`.

---

## Pre-Staging Checklist

Before a staging Supabase project is provisioned and migrations are applied:

- [x] **Remove all `/api/test/*` routes from `main`.** Done — confirmed absent as of 2026-06-21.
- [ ] **Remove `x-kora-operator-secret` fallback from `/api/admin/operator-flow`.** See TODO-002. Risk: if staging env is misconfigured with this secret, the fallback path could be exploited.
- [ ] **Gate 2 (CTO review) formally closed.** No migration applies to staging until Gate 2 sign-off.
- [ ] **Confirm `KORA_ENABLE_TEST_ROUTES` is not set in any staging env.** Not applicable (routes are removed), but verify no residual environment variable leaks.
- [ ] **Confirm `KORA_TEST_SEED_SECRET`, `KORA_TEST_USER_PASSWORD`, `KORA_OPERATOR_SECRET` not set in staging Vercel/env.** These secrets were used by the removed routes. They must not appear in staging environment configuration.

---

## Pre-Production Checklist

Before any real company or worker data enters the system:

- [x] **Remove all `/api/test/*` routes.** Done.
- [ ] **Delete synthetic test users from Supabase Auth (`*@example.test`).** Applies once staging is provisioned. Test users created by the old `setup-auth-users` route must be removed from any Supabase project before real tenant data is onboarded.
- [ ] **Delete synthetic test tenants (`TEST-001`, `TEST-A`, `TEST-B`, `OP-*`).** Same as above.
- [ ] **Remove `x-kora-operator-secret` fallback from `/api/admin/operator-flow` (TODO-002).** Must be done before staging provisioning.
- [ ] **Verify `NODE_ENV === 'production'` is correctly set in the deployment environment.**
- [ ] **Verify `SUPABASE_SERVICE_ROLE_KEY` is NOT exposed in any client-side bundle.**
- [ ] **Run RLS integration test equivalent against staging before prod deploy.** The logic of `auth-isolation` (cross-tenant blocking, role separation) must be re-validated against the deployed schema. Format: CI integration test suite, not an HTTP route.
- [ ] **Confirm `/api/admin/operator-flow` 200/403/401 behavior on staging with real KORA_ADMIN session.**
- [ ] **Gate 3 (Legal/DPO) formally closed.** Required before any real worker-level data.
