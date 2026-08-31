# CI — Gates

**Workflow files:** `.github/workflows/ci.yml` (`KORA CI`), `.github/workflows/security.yml` (`KORA Security`)

This document was significantly stale before B-CI's E2E hardening pass (2026-08-31) — it described a lint step as report-only and omitted the DB-backed integration job entirely, neither of which matched the actual workflow files for some time. Rewritten to match current reality.

## CURRENT CI

Runs on every pull request into `main` and every push to `main`.

### `ci.yml` — `ci` job (TypeScript, tests, build, lint — blocking)

1. `npm ci` — deterministic install from `package-lock.json`.
2. `npx tsc --noEmit` — TypeScript type check, no emit.
3. `npm test` — the Vitest unit/integration suite (`tests/unit/`, `tests/integration/`).
4. `npm run build` — a real `next build`. No environment variables or secrets required (Sentry release upload is conditional on `SENTRY_AUTH_TOKEN`, absent here, so it's a no-op).
5. `npm run lint` — **a real, blocking gate**, run with no failure-masking suffix. Historical ESLint debt is captured as an exact-count baseline in `eslint-suppressions.json` (ESLint's own native `--suppress-all` mechanism). A NEW violation — in a new file, or one more than the recorded baseline count in an existing file — is not covered and fails this step for real. See `tests/unit/pilot-trust-01-lint-gate.test.ts` for the guard that keeps this true.

### `ci.yml` — `kora-link-local-integration` job (DB-backed gate — mandatory, no skip)

Separate job so its longer runtime (real Postgres, real RLS) doesn't slow down the fast static/unit gate above — but it is **not optional**.

1. Checks Docker availability — a missing daemon fails the job outright (no silent skip).
2. Installs the Supabase CLI and runs `supabase start`, which applies every migration in `supabase/migrations/` fresh against an ephemeral local Postgres (Docker) — currently 42 files, through `049_methodology_snapshot.sql`.
3. Verifies Postgres is genuinely reachable with a real `SELECT 1` (not just trusting `supabase start`'s own return).
4. Runs the RLS integration suites (RLS-03/05/06/07/08/09/10) against that real local Postgres, with an explicit machine-readable assertion that exactly 0 were skipped and 0 failed — a suite silently not running (e.g. a typo'd env var) is a hard failure, not a quiet pass.
5. Runs the KORA Link behavioral suite (C1–C10).
6. Always stops the local Supabase stack in a cleanup step, even on failure.

No repository secret is referenced anywhere in this job; it runs entirely against ephemeral local infrastructure. Never staging, never production.

### `ci.yml` — `e2e-smoke` job (E2E, Playwright — blocking)

Added as part of B-CI's "E2E truth" hardening (2026-08-31). Runs `tests/e2e/kora-smoke.spec.ts` — 6 public-page checks (landing, login + both `role_hint` variants, request-access, demo) — against a real `next dev` server and real headless Chromium, with no external services and no credentials.

### `ci.yml` — `e2e-golden-path-local` job (E2E, Playwright, local Supabase — blocking)

Added as B-CI's second E2E slice (2026-08-31). Runs `tests/e2e/pilot-trust-01-golden-path-local-smoke.spec.ts` against a real, ephemeral local Supabase/Postgres stack — the same `supabase start` pattern the `kora-link-local-integration` job above uses, but as its own separate job/budget rather than appended to that one.

1. Starts local Supabase the same way `kora-link-local-integration` does (Docker check, CLI install, `supabase start`, real-query readiness proof).
2. Captures the local API URL/anon key/service-role key via `supabase status -o json` — the well-known, non-secret local-only demo keys `supabase start` always issues, never a staging/production credential.
3. Seeds real, ephemeral, per-run, randomly-generated synthetic test identities (`KORA_ADMIN`, `COMPANY_ADMIN`, `WORKER`) via the pre-existing `scripts/e2e/seed-local-golden-path.ts` — no committed secret, no real user data.
4. Installs Chromium and runs the spec, with the app (spawned as a child process by `playwright.config.ts`'s own `webServer`) and Playwright's test process both pointed at the local Supabase instance. `E2E_GOLDEN_DATA_BEARING_ALLOW_RUN` (part of the seed script's generated env file, relevant only to `golden-data-bearing.spec.ts`) is explicitly unset before running — this job only ever invokes `pilot-trust-01-golden-path-local-smoke.spec.ts` by exact path, so the other 4 credential-gated spec files are never discovered here regardless.
5. Always stops the local Supabase stack in a cleanup step, even on failure.

This is now 2 of the 6 spec files under `tests/e2e/` wired into CI. See [Not yet in CI](#not-yet-in-ci) below for the remaining 4.

### `security.yml` — `gitleaks` job (secret scan — blocking)

Scans full repository history with a pinned `gitleaks` CLI binary (not the Marketplace action, which requires a paid license for org-owned repos).

### `security.yml` — `npm-audit` job (dependency audit — blocking on high/critical)

`npm audit --audit-level=high` fails the job on any high/critical finding; a separate, always-passing step (`npm audit || true`) surfaces the full report (including moderate/low) for visibility without blocking.

## Not yet in CI

- **4 of 6 Playwright spec files** (`authenticated-smoke.spec.ts`, `golden-admin-company.spec.ts`, `two-tenant-isolation.spec.ts`, `golden-data-bearing.spec.ts`) all drive the real browser-side `/login` form. `next.config.ts`'s CSP `connect-src` only permits `https://*.supabase.co` — no `localhost`/`127.0.0.1` exception — so these can **only** ever complete against a real staging/production Supabase project, never a local one, regardless of credentials supplied. Wiring them means adding a genuinely staging-backed E2E job (deliberately out of scope for the local/ephemeral gates above) — see `PILOT-E2E-GOLDEN-PATH-01` in the backlog. This CSP boundary was not modified to make these tests reachable, on purpose.
- **Anything against staging or Production** — no Supabase URL, anon key, service-role key, or other environment-specific secret is referenced anywhere in `ci.yml`. The `e2e-golden-path-local` job's Supabase credentials are the well-known local-only demo keys `supabase start` issues, captured fresh each run — never a repository secret.
- **Deployment steps** — no Vercel deploy, no release tagging.

## Secrets

No secrets are committed to this repository, and no workflow currently references any repository secret. If a future CI job needs staging credentials, they must be added via GitHub Actions repository/environment secrets — never committed to source.
