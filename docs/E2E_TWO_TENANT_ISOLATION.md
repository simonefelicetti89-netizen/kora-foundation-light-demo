# E2E Two-Tenant Isolation Scaffold (PILOT-TWO-TENANT-ISOLATION-01)

**Test file:** `tests/e2e/two-tenant-isolation.spec.ts` (tests `T01`, `T02`)
**Related:** `tests/e2e/authenticated-smoke.spec.ts` (`A03`/`A04` — login/tenant-name reachability, blocked on COMPANY_B), `tests/e2e/golden-admin-company.spec.ts` (`G01`/`G02` — reachability + privacy smoke), `tests/integration/rls-two-tenant-negative.test.ts` (RLS-03 — DB-level tenant isolation, direct Postgres, already merged)
**Introduced:** PILOT-TWO-TENANT-ISOLATION-01 (2026-07-06), test infrastructure only — not run live at introduction

> **Update:** as of 2026-07-09, COMPANY_B has been provisioned in staging and `T01`/`T02` have been run live and passed. See [Live staging validation log](#live-staging-validation-log) below. The narrative in the sections immediately below describes the state at introduction (2026-07-06) and is kept for historical context; it no longer reflects current provisioning status.

## What this is meant to prove

Once a second real company tenant (`COMPANY_B`) exists, this file proves — through the real, running application, not a simulated claim — that:

1. A `COMPANY_A` session and a `COMPANY_B` session, calling the same read-only `/api/company/workspace` endpoint, each resolve only to their own tenant's data (`tenantCode`, `companyName`, `id` never cross over) — `T01`.
2. Supplying a foreign tenant's code as a query parameter on an authenticated `COMPANY_A` request (`?tenantId=<COMPANY_B code>` and five other plausible parameter-name spellings) has **no effect** on which tenant's data is returned — `T02`.
3. Neither response, in either direction, ever contains a worker-level identifier (`worker_id`, `kora_worker_id`, `token_digest`, `link_id`) or an implausible list of email addresses (reuses `tests/e2e/helpers/privacy.ts`).

This is deliberately a **server-side** proof, not a UI-hiding proof: both tests call `page.request.get(...)` directly against the underlying API route (sharing the authenticated session's cookies), in addition to asserting the rendered workspace page. Per this sprint's read-only analysis, `/api/company/workspace` and `/api/company/kora-index/history` both derive tenant identity solely from `app_metadata.kora_tenant_id` in the session and accept no tenant selector from the client at all — so `T02`'s honest proxy for "attempt cross-tenant access" is confirming the server ignores a client-supplied tenant hint entirely, rather than inventing a parameter the API doesn't actually have.

## Why COMPANY_B is currently blocking live execution

`COMPANY_B` does not exist in any environment (staging or Production) as of this sprint — confirmed by `docs/ARCHITECTURE.md`, `docs/STATUS.md`, `docs/GOLDEN_PATH.md`, `docs/QA_STATUS.md`, and `docs/PILOT_SAAS_READINESS.md`. This is a **provisioning gap**, not a credentials or code gap: the app's own admin route (`POST /api/admin/companies/provision`, KORA_ADMIN-only) already supports creating a second tenant + admin user, but no one has invoked it for a second company yet. Provisioning COMPANY_B is out of scope for this sprint (see rules below) and requires a separate, explicitly-approved action.

## Required environment variables

All read from `process.env` only via the existing `tests/e2e/helpers/env.ts` — no new variable names introduced.

| Variable | Purpose |
|---|---|
| `E2E_BASE_URL` | Base URL under test. Non-local values require `E2E_ALLOW_PRODUCTION=true`. |
| `E2E_ALLOW_PRODUCTION` | Must be `true` to run against any non-local host. |
| `E2E_COMPANY_A_EMAIL` / `E2E_COMPANY_A_PASSWORD` / `E2E_COMPANY_A_TENANT_CODE` | Test-only COMPANY_ADMIN account, tenant A. `TENANT_CODE` is used, when present, to pin `T01`'s assertion to the *correct* tenant rather than merely "different from B." |
| `E2E_COMPANY_B_EMAIL` / `E2E_COMPANY_B_PASSWORD` / `E2E_COMPANY_B_TENANT_CODE` | Test-only COMPANY_ADMIN account, tenant B. `T02` additionally requires `TENANT_CODE` (needs a real foreign tenant code to inject as the negative-control parameter). |

No new mutation/allow-run gate (e.g. `E2E_TWO_TENANT_ALLOW_RUN`) was added. Rationale: both tests issue only `GET` requests against read-only summary endpoints (`/api/company/workspace`) — no upload, approval, scoring run, or write of any kind occurs, matching the risk profile of `A01`–`A04`/`G01`/`G02` (plain login + read reachability, no extra gate) rather than `GD01` (`E2E_GOLDEN_DATA_BEARING_ALLOW_RUN` exists specifically because that test mutates real tenant data — new `source_batch`, UEF records, `kora_index_result`, Decision Pack on every run). If a future extension of this file adds any state-changing request, it should adopt an explicit gate at that point, following the same convention.

## Skip-safe behavior

Both tests call `test.skip(condition, reason)` before any network activity if required credentials (and, for `T02`, `E2E_COMPANY_B_TENANT_CODE`) are absent. As of this sprint, `E2E_COMPANY_B_*` is unset in every environment (COMPANY_B doesn't exist), so both tests skip cleanly with an explicit reason — never a silent no-op, never a false pass.

## Production guard behavior

Identical to every other authenticated E2E file in this repo: `tests/e2e/helpers/env.ts#guardBaseUrl()` treats any `E2E_BASE_URL` host other than `localhost`/`127.0.0.1`/`0.0.0.0`/`::1`/`*.local` as production-like and skips with a clear reason unless `E2E_ALLOW_PRODUCTION=true` is explicitly set. This sprint did not modify the guard.

## What safe failure means

- `T01`: each session's `/api/company/workspace` response resolves only to its own tenant (`tenantCode`/`companyName`/`id` disjoint, and — when tenant codes are supplied — pinned to the *correct* tenant, not merely to *a* different one); neither response contains a worker-level identifier or an implausible email list.
- `T02`: injecting a foreign tenant's code into any of six plausible query-parameter names has zero effect on the response — the server keeps resolving the caller's own tenant, exactly as if the parameter had never been sent.

## What would count as a real privacy failure

- `T01`: `bodyA.tenant.tenantCode === bodyB.tenant.tenantCode` (or `companyName`/`id` matching) — i.e. two distinct authenticated company sessions resolving to the same tenant, or either session's tenant fields not matching the operator-declared tenant code for that session.
- `T02`: `body.tenant.tenantCode === foreignTenantCode` after injecting COMPANY_B's code into a COMPANY_A session — i.e. a client-supplied query parameter actually changing which tenant's data is returned.
- Either test: a worker-level identifier (`worker_id`, `kora_worker_id`, `token_digest`, `link_id`) appearing anywhere in either JSON response body or rendered page markup.

## How this relates to pilot readiness

This directly targets the blocker `docs/PILOT_SAAS_READINESS.md` lists first ("Provision a real COMPANY_B ... currently blocks any live two-tenant demonstration") and the gap `docs/E2E_GOLDEN_PATH.md` names this sprint to close: "proving two-tenant isolation through an authenticated E2E once a `COMPANY_B` tenant is provisioned." It complements, and does not replace:
- `tests/integration/rls-two-tenant-negative.test.ts` (RLS-03) — proves Postgres RLS itself rejects cross-tenant reads, at the DB level, with simulated JWT claims (no real GoTrue session, no PostgREST).
- `tests/unit/rls04-app-api-tenant-enforcement.test.ts` (RLS-04) — proves, statically, that no `app/api/**` route accepts `tenant_id`/`worker_id` from client input.

This file is the missing third leg: a live, authenticated, real-session, real-HTTP proof — once COMPANY_B exists.

## Explicit statement (at introduction, 2026-07-06)

**This test has not been run live. It cannot be, until `COMPANY_B` is provisioned and its credentials are supplied via `E2E_COMPANY_B_*`.** No live pass is claimed anywhere in this document or in the test file itself. Local validation performed this sprint was limited to: `npx tsc --noEmit`, `npm test`, `npm run build`, and `npx playwright test --list` (confirms the tests register correctly and would skip, not execute).

This statement has since been superseded — see the live validation log below.

## Live staging validation log

### 2026-07-09 — staging (Vercel remote, non-production data)

- **Environment:** Vercel remote deployment backed by staging/non-production data, targeted via the operator's configured `E2E_BASE_URL` (per repo convention, the value itself is not printed in docs, commits, or chat — see `docs/testing-e2e-auth.md`).
- **Scope:** this is live staging validation only. It is **not** a Production validation.

**Tests run and result:**

| Test | Result |
|---|---|
| `authenticated-smoke.spec.ts` `A01` (KORA_ADMIN login) | passed |
| `authenticated-smoke.spec.ts` `A02` (COMPANY_A login) | passed |
| `authenticated-smoke.spec.ts` `A03` (COMPANY_B login) | passed |
| `authenticated-smoke.spec.ts` `A04` (UI tenant-separation smoke) | passed |
| `two-tenant-isolation.spec.ts` `T01` | passed |
| `two-tenant-isolation.spec.ts` `T02` | passed |

**What was observed:**

- COMPANY_A and COMPANY_B logins both succeeded, each in its own browser context.
- Rendered UI tenant identity (name and code) was distinct between the COMPANY_A and COMPANY_B sessions.
- Server-side API tenant context (`/api/company/workspace`) was distinct between the two sessions (`tenantCode`, `companyName`, `id` all disjoint).
- Client-supplied foreign tenant query parameters (`tenantId`, `tenant_id`, `tenantCode`, `tenant_code`, `companyId`, `company_id`) had no effect on which tenant's data was returned to the COMPANY_A session.
- No worker-level identifiers were observed in either session's rendered page or API response.

**Explicitly NOT claimed by this entry:**

- Golden data-bearing validation (`GD01`) has not been run.
- This is not a Production readiness or Production validation claim.
- No GDPR compliance or certification claim is made.
- No claim that real customer data has been processed — staging/non-production data only.
- No claim of full pilot readiness — this covers login and two-tenant isolation only.

**Next gate:** golden data-bearing staging validation (`GD01`), which requires an explicit `E2E_GOLDEN_DATA_BEARING_ALLOW_RUN` opt-in (see `tests/e2e/helpers/env.ts#isGoldenDataBearingRunAllowed()`) and has not been run as part of this validation.
