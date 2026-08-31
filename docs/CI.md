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

This is the **only** one of the 6 spec files under `tests/e2e/` currently wired into CI. See [Not yet in CI](#not-yet-in-ci) below for why the other 5 aren't, and what closing that gap actually requires.

### `security.yml` — `gitleaks` job (secret scan — blocking)

Scans full repository history with a pinned `gitleaks` CLI binary (not the Marketplace action, which requires a paid license for org-owned repos).

### `security.yml` — `npm-audit` job (dependency audit — blocking on high/critical)

`npm audit --audit-level=high` fails the job on any high/critical finding; a separate, always-passing step (`npm audit || true`) surfaces the full report (including moderate/low) for visibility without blocking.

## Not yet in CI

- **5 of 6 Playwright spec files** (`authenticated-smoke.spec.ts`, `golden-admin-company.spec.ts`, `two-tenant-isolation.spec.ts`, `golden-data-bearing.spec.ts`, `pilot-trust-01-golden-path-local-smoke.spec.ts`) are not run automatically. Two different reasons, not one:
  - `authenticated-smoke`, `golden-admin-company`, `two-tenant-isolation`, and `golden-data-bearing` all drive the real browser-side `/login` form. `next.config.ts`'s CSP `connect-src` only permits `https://*.supabase.co` — no `localhost`/`127.0.0.1` exception — so these can **only** ever complete against a real staging/production Supabase project, never a local one, regardless of credentials supplied. Wiring them means adding a genuinely staging-backed E2E job (deliberately out of scope for the local/ephemeral gate above) — see `PILOT-E2E-GOLDEN-PATH-01` in the backlog.
  - `pilot-trust-01-golden-path-local-smoke.spec.ts` is designed to run against a **local** Supabase instance (it bypasses the CSP wall via a Node-side session helper, `tests/e2e/helpers/local-session.ts`) — but doing so for real requires starting local Supabase (the same Docker stack the `kora-link-local-integration` job already runs), seeding real Auth users via `scripts/e2e/seed-local-golden-path.ts`, and threading the resulting credentials through to both the Next.js app and Playwright. That's real, separately-scoped infrastructure work, not a CI-step addition — proven locally: without a reachable database, this file's unguarded health-check test returns a real `503` and fails outright (by design — a health check that can't fail isn't one), so it cannot be added to the blocking gate until that infrastructure exists.
- **Anything against staging or Production** — no Supabase URL, anon key, service-role key, or other environment-specific secret is referenced anywhere in `ci.yml`.
- **Deployment steps** — no Vercel deploy, no release tagging.

## Secrets

No secrets are committed to this repository, and no workflow currently references any repository secret. If a future CI job needs staging credentials, they must be added via GitHub Actions repository/environment secrets — never committed to source.
