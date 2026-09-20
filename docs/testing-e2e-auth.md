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

**Checkpoint status (GOLDEN-03B, operator-run):**
- `A01` (KORA_ADMIN) — **PASS**, run locally by the operator with real
  staging credentials, ~4.7s. `kora-admin@staging.kora.internal` browser
  login is confirmed working end-to-end for the first time.
- `A02` (COMPANY_A) — not yet run through this fixture. The account
  (`company-admin@staging.kora.internal`, tenant `STAGE-001`) is known and
  was verified working manually in an earlier, separate Gate-2 QA pass
  (2026-06-22) — just not through this E2E spec yet.
- `A03` (COMPANY_B) — blocked. No second company/tenant account exists in
  staging yet; this is a provisioning gap, not a credentials or code gap.
- `A04` (tenant separation) — blocked for the same reason as A03.

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

## KORA-WP-088 — authenticated multi-viewport responsive validation

`tests/e2e/responsive-viewports.spec.ts` runs 5 role environments x 3 viewports
(375 / 768 / 1440) = **15 cases**. The viewports are Playwright *projects*
(`mobile-375`, `tablet-768`, `desktop-1440`), so the project name in the report
is the viewport evidence. They are scoped by `testMatch` to this spec alone, so
the GOLDEN suites do not triple in runtime.

### Additional variables

| Variable | Purpose |
|---|---|
| `E2E_WORKER_EMAIL` / `E2E_WORKER_PASSWORD` | Test-only WORKER account. `E2E_WORKER_A_*` (written by the local golden-path seed) is accepted as a fallback; `E2E_WORKER_*` always wins. |
| `E2E_PARTNER_EMAIL` / `E2E_PARTNER_PASSWORD` | Test-only PARTNER account. |
| `E2E_ADVISOR_EMAIL` / `E2E_ADVISOR_PASSWORD` | Test-only ADVISOR account. |
| `E2E_ALLOWED_STAGING_HOSTS` | Comma-separated bare hostnames allowed as a non-local target. Required by `tests/e2e/helpers/e2e-safety.ts`; `E2E_ALLOW_PRODUCTION=true` is deliberately **not** sufficient on its own. |
| `VERCEL_AUTOMATION_BYPASS_SECRET` | Vercel Deployment Protection bypass, for a protected Preview. |

### Vercel Deployment Protection

A protected Preview answers any request with `302 -> https://vercel.com/sso-api`,
so without a bypass the browser never reaches the KORA `/login` form and every
case **fails** rather than skips.

`tests/e2e/helpers/vercel-bypass.ts` attaches the officially supported
`x-vercel-protection-bypass` header (plus `x-vercel-set-bypass-cookie`). Read the
secret from the Vercel project's Deployment Protection settings.

Three properties worth knowing:

- **Host-scoped.** It is a `page.route` handler, not `use.extraHTTPHeaders`.
  Playwright applies `extraHTTPHeaders` to *every* request the context makes,
  including third-party ones (the print CV page pulls a stylesheet from
  `fonts.googleapis.com`), which would send the secret to hosts that have no
  business receiving it. The handler attaches the header only when the request
  host equals the host of `E2E_BASE_URL`.
- **Absent secret means no bypass at all.** The handler is simply not installed.
- **It gates Vercel deployment access only.** KORA authentication, role
  resolution and RLS are untouched — every case still logs in through the real
  `/login` form. It also does not interact with `guardE2ETarget()`, which runs
  first and still decides whether a test runs at all.

### Supplying credentials without exposing them

Shell export (canonical, per the sections above) or a **gitignored**
`.env.e2e.local`. `.gitignore` already excludes `.env*` — verify with
`git check-ignore -v .env.e2e.local` before writing anything into it.

**Playwright does not auto-load env files.** Nothing in `playwright.config.ts`,
`vitest.config.ts` or the npm scripts reads a dotenv file, so the values must be
in the shell that launches the run:

```bash
set -a
source .env.e2e.local
set +a
npx playwright test responsive-viewports
```

Never paste a value into a commit, a PR, a report under `.kora-audit/`, a test
snapshot, or a chat message. Only variable **names** belong in reports.

## What is intentionally out of scope here

- Self-service or real customer data — use disposable test accounts only.
- Full golden path (upload → UEF → approval → scoring → KORA Index →
  Decision Pack) — future GOLDEN-03+ branches.
- Any change to `middleware.ts`, route guards, or auth behavior.
