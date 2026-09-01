# Security CI Status

**Workflow file:** `.github/workflows/security.yml` (`KORA Security`)
**Config file:** `.github/dependabot.yml`
**Introduced:** SECURITY-CI-CREDIBILITY-01 (2026-07-14)

This is a separate, additive gate alongside `KORA CI` (`.github/workflows/ci.yml`,
documented in `docs/CI.md`). It checks the repository and its dependencies —
secrets and known vulnerabilities — not application correctness. It changes no
runtime code, no API route, no middleware, and no application configuration.

## What it runs

### `gitleaks` job

Scans full git history (`fetch-depth: 0`) for committed secrets using the
pinned `gitleaks` CLI binary (v8.30.1, downloaded directly from the GitHub
release, not the `gitleaks/gitleaks-action` Marketplace action — that action
requires a paid license for organization-owned repositories; the CLI itself
is MIT-licensed and free). Fails the job (non-zero exit) on any finding.

### `npm-audit` job

Two steps:
1. `npm audit --audit-level=high` — **blocking**. Fails only on high/critical
   findings, so it catches real regressions without being tripped by the
   moderate findings already known and tracked below.
2. `npm audit` (full report) — **non-blocking** (`|| true`), for visibility
   only, mirrors the report-only lint step in `ci.yml`.

## When it runs

- Every pull request targeting `main`.
- Every push to `main`.

## Dependabot

`.github/dependabot.yml` enables weekly update PRs for:
- `npm` (root `package.json` / `package-lock.json`)
- `github-actions` (workflow files under `.github/workflows/`)

Both target `main`. No auto-merge is configured — every Dependabot PR still
goes through the `KORA CI` and `KORA Security` gates like any other PR.

## Known unresolved vulnerabilities (as of 2026-07-14) — HISTORICAL, superseded below

`npm audit` reports 6 findings, all low/moderate, none high/critical:

| Package | Severity | Status |
|---|---|---|
| `@babel/core` | low | **Fixable** — `npm audit fix` resolves cleanly (transitive, via `@sentry/nextjs` / `eslint-config-next`), no breaking change. Not yet applied — out of scope for this sprint (CI-only). |
| `js-yaml` | moderate | **Fixable** — `npm audit fix` resolves cleanly (transitive, via `eslint`), no breaking change. Not yet applied — out of scope for this sprint (CI-only). |
| `postcss` | moderate (XSS via unescaped `</style>`) | **Not fixable by us.** Bundled *inside* `next`'s own `node_modules/next/node_modules/postcss` — confirmed present in `next@16.2.6` (installed) and `next@16.2.10` (latest patch). No current Next.js release corrects it. Track upstream; re-check on every Next.js upgrade. |
| `uuid` | moderate (missing buffer bounds check) | **No clean fix.** Transitive via `exceljs@4.4.0` → `uuid@8.3.2`. Even the latest `exceljs@4.4.0` still depends on `uuid@^8.3.0`. `npm audit fix --force` would downgrade to `exceljs@3.4.0` (breaking major version) — not acceptable. |
| `exceljs` | moderate | Same root cause as `uuid` above — no clean fix path exists today. |
| `next` (flagged by resolver) | moderate | **False-positive-shaped finding**, not a real recommendation: `npm audit`'s suggested fix is to install `next@9.3.3`, a catastrophic downgrade from `16.2.x`. This is the resolver attributing the bundled-`postcss` issue (above) to the top-level `next` package. **Never run `npm audit fix --force`** on this repo without first reading this table — it will attempt exactly that downgrade. |

**Policy:** `npm audit fix` (without `--force`) is safe to run whenever
convenient — it only ever touches `@babel/core` and `js-yaml` today. Applying
it is deliberately left for a future sprint since this sprint is scoped to CI
configuration only, not dependency changes. `npm audit fix --force` must
never be run against this repository as long as the `postcss`/`next` and
`uuid`/`exceljs` findings above remain open — it proposes breaking downgrades,
not real fixes.

## Known unresolved vulnerabilities (as of 2026-09-02) — CURRENT

The `@babel/core`/`js-yaml`/`uuid`/`exceljs` findings above are gone from
current `npm audit` output (resolved by routine dependency drift since
2026-07-14, not by a dedicated sprint — this doc had simply gone stale).

A new HIGH-severity finding appeared and was fixed (dependency-audit
cleanup, 2026-09-02): `browserslist@4.28.2` (transitive, via
`@sentry/nextjs` → `@sentry/webpack-plugin`/`@sentry/bundler-plugin-core` →
`webpack`/`@babel/core` → `browserslist`) — two advisories,
[GHSA-c83g-rgw3-j3cx](https://github.com/advisories/GHSA-c83g-rgw3-j3cx)
(unbounded memory growth) and
[GHSA-73wf-gq98-2v4g](https://github.com/advisories/GHSA-73wf-gq98-2v4g)
(uncaught crash / prototype write), both fixed in `browserslist@4.28.7`+.
Resolved via plain `npm audit fix` — a pure lockfile bump to
`browserslist@4.28.8` (well within every parent's already-declared semver
range: `@babel/helper-compilation-targets` `^4.24.0`, `webpack`'s own
`browserslist` dep `^4.28.1`, `update-browserslist-db`'s peer
`>=4.21.0`) plus its own small transitive deps
(`baseline-browser-mapping`, `caniuse-lite`, `electron-to-chromium`,
`node-releases`, `update-browserslist-db`). No `package.json` change, no
breaking change, no unrelated package touched.

`npm audit --audit-level=high` now exits 0 — the blocking gate is clean.

Still open, moderate only (`npm audit --audit-level=high` does not see
these — non-blocking):

| Package | Severity | Status |
|---|---|---|
| `postcss` | moderate (incomplete fix of a prior sourceMappingURL advisory, [GHSA-fxqj-rqcc-2cmp](https://github.com/advisories/GHSA-fxqj-rqcc-2cmp)) | **No clean fix.** Bundled inside `next`'s own dependency tree (`next@16.2.11` installed). `npm audit fix --force` proposes `next@16.3.4` — outside this repo's stated Next.js dependency range, a breaking upgrade decision, not a security patch. Track upstream; re-check on every Next.js upgrade. |
| `@tailwindcss/postcss` | moderate | Same root cause as `postcss` above — depends on the vulnerable `postcss` range. |
| `vite` | moderate | Same root cause as `postcss` above — depends on the vulnerable `postcss` range (dev/test tooling only, not part of the production Next.js build). |
| `next` (flagged by resolver) | moderate | Same false-positive-shaped pattern as before: the resolver attributes the bundled-`postcss` issue to the top-level `next` package. **Never run `npm audit fix --force`** on this repo without reading this table first. |

**Updated policy:** `npm audit fix` (without `--force`) remains safe to run
whenever convenient. `npm audit fix --force` must still never be run
against this repository while the `postcss` cluster above remains open —
it proposes a `next` version outside the stated dependency range, a product
decision requiring its own review, not a routine security fix.

## Intentionally excluded from this sprint

- No change to `next.config.ts` / CSP.
- No change to `middleware.ts`, origin/CSRF checks, or rate limiting.
- No change to `app/api/**` or any runtime code.
- No `npm audit fix` or `npm audit fix --force` applied — see policy above.
- No package or lockfile changes.
- No secrets, environment variables, or deploy targets referenced by either
  new workflow.
