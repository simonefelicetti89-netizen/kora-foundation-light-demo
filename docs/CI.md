# CI — Minimal Gate

**Workflow file:** `.github/workflows/ci.yml` (`KORA CI`)
**Introduced:** PILOT-CI-01 (2026-07-06)

## What it runs

On every trigger, in order:

1. `npm ci` — install dependencies from `package-lock.json`.
2. `npx tsc --noEmit` — TypeScript type check, no emit.
3. `npm test` — the existing Vitest unit/integration suite (`tests/**/*.test.ts`, i.e. `tests/unit/` and `tests/integration/`). This is the same command already used in local pre-merge checks; nothing new was written for CI to call.
4. `npm run build` — a real `next build`. Included because it's cheap (~25s locally) and does not require any environment variables or secrets — verified locally with all `.env*` files removed before this sprint added the workflow. Sentry release upload inside the build config is already conditional (`disable: !process.env.SENTRY_AUTH_TOKEN`), so it stays a no-op without a token.
5. `npm run lint` — run for visibility, **not enforced** (see below).

## When it runs

- Every pull request targeting `main`.
- Every push to `main` (post-merge confirmation).

## Why lint is report-only

`npm run lint` currently exits non-zero on `main` — 103 pre-existing ESLint errors and 95 warnings, concentrated in `tests/unit/*` (mostly `@typescript-eslint/no-require-imports` and `@typescript-eslint/no-unused-vars`). None of this is new; it predates this sprint. Blocking PRs on it today would fail unrelated, already-merged work. The lint step runs with `npm run lint || true` so it's visible in every CI run's log without turning the check red. Once the existing lint debt is reduced in a dedicated cleanup, remove `|| true` so lint becomes a real gate.

## Intentionally excluded from this sprint

- **E2E / Playwright** (`npm run test:e2e` and friends) — not installed, not run. Playwright needs a browser install step and a running app instance; that's real scope, not "minimal."
- **Anything against staging or Production** — no Supabase URL, anon key, service-role key, or any other environment-specific secret is referenced anywhere in the workflow. CI runs entirely on the checked-out source with no external network dependency beyond `npm ci`.
- **Deployment steps** — no Vercel deploy, no release tagging.
- **Migration steps** — no `supabase migration up`, no schema changes of any kind.

## Later sprint: E2E / staging proof

A follow-up sprint (see `PILOT-E2E-GOLDEN-PATH-01` in the project backlog) is expected to add an authenticated, staging-data-bearing E2E golden-path run as a separate, explicitly-scoped CI job — distinct from this minimal gate, likely gated behind repository secrets and possibly a manual/scheduled trigger rather than every PR.

## Secrets

No secrets are committed to this repository, and this workflow does not reference any repository secret. If a future CI job needs staging credentials, they must be added via GitHub Actions repository/environment secrets — never committed to source.
