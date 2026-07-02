# E2E Authenticated Test Fixtures (GOLDEN-02 / GOLDEN-03B)

Status: test infrastructure only. No golden path steps (upload, UEF, scoring,
Decision Pack) are exercised yet — see `docs/GOLDEN_PATH_RUNBOOK.md` for the
manual operator walkthrough and the GOLDEN-01 audit for current coverage gaps.

## What this is

Minimal Playwright fixtures and one smoke spec
(`tests/e2e/authenticated-smoke.spec.ts`) that log in as three real
(non-production) test accounts — one `KORA_ADMIN` and two `COMPANY_ADMIN`
tenants — and assert each lands on the expected workspace, plus a check
that the two company accounts don't resolve to the same tenant.

These tests exist to give CI a heartbeat check that authentication and role
routing still work, ahead of building the full authenticated golden path
E2E suite.

## Files

- `tests/e2e/helpers/env.ts` — reads credentials from `process.env` only,
  never logs values, resolves to `null` on missing vars. Framework-agnostic
  (no Playwright import), so its logic is covered by a plain vitest unit
  test (`tests/unit/golden-02-e2e-env-guard.test.ts`).
- `tests/e2e/helpers/roles.ts` — reuses `lib/auth/role-home.ts` (the app's
  own KORA_ROLE → home path mapping) instead of duplicating it.
- `tests/e2e/helpers/auth.ts` — drives the real `/login` UI form (no direct
  Supabase API calls, no app auth code changes).
- `tests/e2e/authenticated-smoke.spec.ts` — the 4 smoke tests.

## Required environment variables

All optional — unset vars cause the relevant test(s) to skip, not fail.
See `.env.local.example` for the full list with inline comments:

| Variable | Purpose |
|---|---|
| `E2E_BASE_URL` | Base URL under test. Defaults to `http://localhost:3000`. |
| `E2E_ALLOW_PRODUCTION` | Must be `true` to run against a non-local `E2E_BASE_URL`. |
| `E2E_KORA_ADMIN_EMAIL` / `E2E_KORA_ADMIN_PASSWORD` | Test-only admin account. |
| `E2E_COMPANY_A_EMAIL` / `E2E_COMPANY_A_PASSWORD` / `E2E_COMPANY_A_TENANT_CODE` | Test-only company account, tenant A. |
| `E2E_COMPANY_B_EMAIL` / `E2E_COMPANY_B_PASSWORD` / `E2E_COMPANY_B_TENANT_CODE` | Test-only company account, tenant B. |

Playwright does not auto-load `.env.local` — export these in your shell
(or your CI secret store) before running `npm run test:e2e`. Do not put
real values in `.env.local.example`.

## Running A01 (KORA_ADMIN) locally (GOLDEN-03B)

`E2E_BASE_URL` now actually controls where Playwright navigates
(`playwright.config.ts` reads it into `use.baseURL`) — previously it was
only read by the production guard, decoupled from real navigation.

Local run (default target, local dev server auto-starts):

```bash
export E2E_KORA_ADMIN_EMAIL="kora-admin@staging.kora.internal"
export E2E_KORA_ADMIN_PASSWORD="<operator-local-password>"
export E2E_BASE_URL="http://localhost:3000"
npm run test:e2e -- --grep "A01"
```

Set the password yourself, locally, in your own shell — never share it in
chat, an issue, a PR, or a commit. `E2E_BASE_URL` is optional here since
it matches the default, shown only for clarity.

Staging run (only if you know it's safe to point at a real staging
deployment — requires the production guard's explicit opt-in since any
non-local host is treated as production-like):

```bash
export E2E_KORA_ADMIN_EMAIL="kora-admin@staging.kora.internal"
export E2E_KORA_ADMIN_PASSWORD="<operator-local-password>"
export E2E_BASE_URL="https://<staging-host>"
export E2E_ALLOW_PRODUCTION=true
npm run test:e2e -- --grep "A01"
```

When `E2E_BASE_URL` is set to anything other than the default, Playwright
no longer auto-starts a local dev server (`webServer` is skipped) — the
target under `E2E_BASE_URL` is assumed to already be running.

## Production guard

`tests/e2e/helpers/env.ts#guardBaseUrl()` treats any `E2E_BASE_URL` host
other than `localhost` / `127.0.0.1` / `0.0.0.0` / `::1` / `*.local` as
production-like and skips all authenticated tests with a clear reason
unless `E2E_ALLOW_PRODUCTION=true` is explicitly set. This is a safety
guard, not an access-control mechanism — it does not touch app auth code.
As of GOLDEN-03B, this guard now governs a value that actually drives
browser navigation, so it is a meaningful safeguard rather than a
documentation-only check.

## What is intentionally out of scope here

- Self-service or real customer data — use disposable test accounts only.
- Full golden path (upload → UEF → approval → scoring → KORA Index →
  Decision Pack) — future GOLDEN-03+ branches.
- Any change to `middleware.ts`, route guards, or auth behavior.
