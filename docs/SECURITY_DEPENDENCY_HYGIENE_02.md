# Security Dependency Hygiene 02

**Sprint:** SECURITY-DEPENDENCY-HYGIENE-02
**Date:** 2026-07-14
**Preceded by:** SECURITY-CI-CREDIBILITY-01 (`docs/SECURITY_CI_STATUS.md`)

Conservative, non-destructive dependency updates to resolve `npm audit`
findings present after SECURITY-CI-CREDIBILITY-01. No downgrades, no major
upgrades, no runtime/API/middleware/CSP/Supabase/env changes.

## Baseline (before this sprint)

6 vulnerabilities: 1 low, 5 moderate, 0 high/critical.

| Package | Severity | Direct/Transitive | Chain | Installed | Fix type |
|---|---|---|---|---|---|
| `@babel/core` | low | transitive | `@sentry/nextjs` → `@sentry/bundler-plugin-core`; `eslint-config-next` → `eslint-plugin-react-hooks` | 7.29.0 | patch (7.29.6+) |
| `js-yaml` | moderate | transitive | `eslint` → `@eslint/eslintrc` | 4.1.1 | patch (4.3.0) |
| `postcss` | moderate | transitive | bundled inside `next@16.2.6` itself (`node_modules/next/node_modules/postcss`); also present via `@tailwindcss/postcss` and `vite` at 8.5.15 | 8.4.31 (next's internal copy) | minor, same major (8.5.10+) |
| `uuid` | moderate | transitive | `exceljs@4.4.0` (direct dependency) → `uuid` | 8.3.2 | major (11.1.1) — `exceljs` pins `^8.3.0` in every published version including 4.4.1-prerelease.0, so no version of `exceljs` alone resolves this |
| `exceljs` | moderate | direct | — | 4.4.0 (latest stable) | same root cause as `uuid` above |
| `next` (flagged by `npm audit`) | moderate | direct | resolver attributes the bundled-postcss issue above to `next` itself | 16.2.6 | **false-positive-shaped**: `npm audit`'s suggested fix (`next@9.3.3`) is a catastrophic major downgrade and was never applied |

## Actions taken

### 1. `npm audit fix` (no `--force`)

Resolved `@babel/core` and `js-yaml` purely via lockfile updates within their
parents' existing semver ranges — no `package.json` change, no major bump:

- `@babel/core` 7.29.0 → 7.29.7 (and its whole `@babel/*` sibling family,
  which version together as one release train: `@babel/generator`,
  `@babel/helper-*`, `@babel/parser`, `@babel/template`, `@babel/traverse`,
  `@babel/types`, etc.)
- `js-yaml` 4.1.1 → 4.3.0

Verified after this group: `npx tsc --noEmit` clean, `npm test -- --run`
244/244 test files passed (10067 tests, 30 skipped — same as baseline).

### 2. `postcss` override

Added to `package.json`:

```json
"overrides": {
  "postcss": "8.5.19"
}
```

**Why an override, not a direct dependency bump:** `postcss` isn't a direct
dependency of this project — the vulnerable copy is bundled *inside*
`next@16.2.6`'s own `node_modules/next/node_modules/postcss`, used by Next's
internal build tooling. No Next.js release (checked up to `16.2.10`, the
latest patch) has updated this internal copy. An `overrides` entry is the
only way to reach it without touching `next` itself.

**Why this is safe:** `postcss` 8.4.x → 8.5.x is a minor version within the
same major; the project disciplines itself around strict semver for its
plugin API. The tree already carried `postcss@8.5.15` elsewhere (via
`@tailwindcss/postcss` and `vite-tsconfig-paths` → `vite`) with no issues, so
this override converges the whole tree onto one shared version rather than
introducing an untested one. Chosen `8.5.19` = latest published 8.x at the
time of this sprint.

**Verification:** `next@16.2.6` unchanged (confirmed via
`node_modules/next/package.json`); `npm ls postcss` shows all three
consumers deduped to `postcss@8.5.19`, with the previously-separate
`next/node_modules/postcss` entry gone entirely (fully deduped). Full
`npx tsc --noEmit`, `npm test -- --run` (244/244), and `npm run build`
(real `next build`) all passed. Also manually inspected generated
`.next/static/chunks/*.css` output after the build — non-empty, valid CSS
— to directly confirm PostCSS/Tailwind's build-time processing still works
correctly with the overridden version, since this is exactly the code path
the override touches.

### 3. `uuid` override

Added to `package.json`:

```json
"overrides": {
  "postcss": "8.5.19",
  "uuid": "11.1.1"
}
```

**Why an override:** `exceljs` (a direct dependency, used in
`lib/data-intake/excel-parser.ts` for Excel ingestion) pins `uuid` to
`^8.3.0` in every published version, including the newest prerelease. There
is no version of `exceljs` that depends on a patched `uuid`. `npm audit
fix --force`'s only suggestion is downgrading `exceljs` to `3.4.0` (a major
downgrade of a direct dependency actively used for ingestion) — rejected.

**Why this override was judged safe, not just assumed safe:** `uuid` v8 →
v11 is normally a risky jump (three majors, and `uuid` went through
ESM-only releases in between). This was **empirically verified**, not just
argued from changelogs:
1. Checked `uuid@11.1.1`'s package `exports` field — it still ships a CJS
   build (`dist/cjs/index.js`) for `require()`, so `exceljs`'s
   `const {v4: uuidv4} = require('uuid')` (in
   `node_modules/exceljs/lib/xlsx/xform/sheet/cf-ext/cf-rule-ext-xform.js`,
   the only `uuid` call site in `exceljs`) resolves correctly.
2. Ran the full test suite with the override applied: `npx tsc --noEmit`
   clean; `npm test -- --run` 244/244 files, 10067/10067 non-skipped tests
   passed (identical to baseline); the specific ingestion test
   (`tests/unit/b65-b1-ingestion-hardening.test.ts`, which exercises
   `lib/data-intake/excel-parser.ts`) passed on its own (44/44).
3. Directly exercised the exact code path that calls `uuid` inside
   `exceljs` — generated a real `.xlsx` workbook with a conditional
   formatting rule (the only feature in `exceljs` that calls
   `uuidv4()`) via a throwaway Node script, outside the test suite, and
   confirmed it produces a valid non-empty buffer with no error.
4. `npm run build` (real `next build`) passed after this change too.

Given all four checks passed with no code change required, this override
was kept rather than treated as too risky to apply.

## Result

`npm audit` → **0 vulnerabilities** (all 6 baseline findings resolved: 2 via
plain `npm audit fix`, 2 via a documented, empirically-verified `overrides`
entries — `postcss` and `uuid` — with no downgrade, no major bump of any
direct dependency, and `next` left at `16.2.6` throughout).

## What was deliberately NOT done

- `npm audit fix --force` was never run.
- `next` was never downgraded or upgraded (stays at `16.2.6`).
- `exceljs` was never downgraded (stays at `4.4.0`, its latest stable).
- No unrelated package was upgraded (`npm outdated` shows several packages
  behind latest — e.g. `@sentry/nextjs`, `@supabase/ssr`, `eslint`,
  `next` itself at `16.2.10` — none of these were touched; they are
  unrelated to the audited vulnerabilities and out of scope for this
  sprint).
- No runtime code, middleware, API route, CSP config, Supabase config, or
  `.env` file was touched.
- No test was removed, skipped, or weakened.
