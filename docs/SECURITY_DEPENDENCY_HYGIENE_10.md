# Security Dependency Hygiene 10

**Sprint:** SECURITY-DEPENDENCY-HYGIENE-10
**Date:** 2026-07-25
**Preceded by:** SECURITY-DEPENDENCY-HYGIENE-02 (`docs/SECURITY_DEPENDENCY_HYGIENE_02.md`), which brought `npm audit` to 0 findings on 2026-07-14. This sprint addresses 4 new high-severity findings that appeared afterward, against an unchanged `package.json`/`package-lock.json` (confirmed identical to the KORA-LINK-SECURITY-FOUNDATION-08 merge commit, `a15c7a6`) — new advisory disclosures, not a regression introduced by any code change in this repository.
**Independent of:** KORA-LINK-DPO-DECISIONS-09 (`feature/kora-link-dpo-decisions-09`, commits `78de353`/`a84f9d7`). No KORA Link file was touched by this sprint; no commit on that branch was modified.

Conservative, non-destructive dependency updates to resolve 4 high-severity
`npm audit` findings. No downgrades, no major upgrade of any direct
dependency, no runtime/API/middleware/UI/governance/migration changes.

## Baseline (before this sprint)

4 vulnerabilities, all high, 0 critical.

| Package | Severity | Advisory | Direct/Transitive | Chain | Installed | Fix type |
|---|---|---|---|---|---|---|
| `next` | high | `GHSA-6gpp-xcg3-4w24` + 8 more (see below) | direct, exact pin | — | `16.2.6` | patch (`16.2.11`) |
| `sharp` | high | `GHSA-f88m-g3jw-g9cj` | transitive, optional dep of `next` | `next@16.2.6` → `sharp@0.34.5` | `0.34.5` | minor (`0.35.0`+); `next@16.2.11` itself still declares `sharp: ^0.34.5`, so upgrading `next` alone does **not** reach the fix |
| `fast-uri` | high | `GHSA-v2hh-gcrm-f6hx` + `GHSA-4c8g-83qw-93j6` | transitive | `@sentry/nextjs` → `@sentry/webpack-plugin` → `webpack` → `schema-utils` → `ajv(-formats)` → `fast-uri` | `3.1.2` | patch within `ajv`'s own `^3.0.1` range (`3.1.4`) |
| `brace-expansion` | high | `GHSA-3jxr-9vmj-r5cp` | transitive, 3 coexisting major lines | `eslint` → `minimatch@3.1.5` (`^1.1.7`); `exceljs` → `archiver` → `readdir-glob` → `minimatch@5.1.9` (`^2.0.1`); `@sentry/nextjs`/`eslint-config-next` → ... → `minimatch@10.2.5` (`^5.0.5`) | `1.1.14` / `2.1.1` / `5.0.6` | patch within each parent's own range (`1.1.16` / `2.1.2` / `5.0.8`) — see below for why a flat override was used instead |

`next`'s full advisory list (all fixed by `16.2.11`, none required beyond
that): `GHSA-6gpp-xcg3-4w24`, `GHSA-m99w-x7hq-7vfj`, `GHSA-89xv-2m56-2m9x`,
`GHSA-68g3-v927-f742`, `GHSA-4633-3j49-mh5q`, `GHSA-4c39-4ccg-62r3`,
`GHSA-p9j2-gv94-2wf4`, `GHSA-q8wf-6r8g-63ch`, `GHSA-955p-x3mx-jcvp`.

## Actions taken

### 1. `next` / `eslint-config-next` — direct patch bump

`package.json`: `"next": "16.2.6"` → `"16.2.11"`, `"eslint-config-next": "16.2.6"` → `"16.2.11"` (kept paired, matching this repo's existing convention of pinning the two together). Patch-level within major `16`, `npm view next dist-tags` confirms `16.2.11` is the current `latest`, not a canary/prerelease. Applied via direct `package.json` edit + `npm install` (not `npm audit fix`) so the change is an explicit, reviewable diff rather than resolver-chosen.

### 2. `sharp` override

```json
"overrides": { "sharp": "0.35.0" }
```

**Why an override, not resolved by the `next` bump alone:** confirmed via
`npm view next@16.2.11 optionalDependencies` that `next@16.2.11` still
declares `sharp: ^0.34.5` — for a `0.x` package this caret range is
`>=0.34.5 <0.35.0`, which **excludes** the fixed `0.35.0` line entirely. No
released `next@16.x` reaches a patched `sharp` on its own.

**Version chosen:** `0.35.0` — the first version outside the vulnerable
`<0.35.0` range (not the newest `0.35.3`), to keep the change to the minimum
needed. Node engine requirement (`>=20.9.0`) satisfied by this environment's
Node 24.

**Verified in isolation** (added alone, before any other override): `npm
audit` dropped from 4 to 2 findings (`next` and `sharp` both cleared, `next`
was only listed as an *effect* of vulnerable `sharp`, not its own remaining
CVE), no other package version shifted, `npm ls sharp` shows a single clean
`overridden` entry.

### 3. `fast-uri` override

```json
"overrides": { "fast-uri": "3.1.4" }
```

`ajv@8.20.0` (the only consumer) declares `fast-uri: ^3.0.1`, which permits
`3.1.4` (still `<4.0.0`). `3.1.4` is the first version outside both
vulnerable ranges (`<=3.1.3` and `<3.1.3`). **Verified in isolation** (added
after the `sharp` override, before `brace-expansion`): findings dropped from
2 to 1, no other package affected, `npm ls fast-uri` shows a single clean
`overridden` entry deduped across both `ajv`/`ajv-formats` call sites.

### 4. `brace-expansion` override — flat, not scoped per parent

```json
"overrides": { "brace-expansion": "5.0.8" }
```

**What was tried first, and why it was reverted:** `brace-expansion` exists
in 3 coexisting major lines (`1.1.14` under `minimatch@3.1.5`, `2.1.1` under
`minimatch@5.1.9`, `5.0.6` under `minimatch@10.2.5`), each satisfying a
different parent's own semver range. The first attempt used npm's
per-version-scoped override syntax to stay strictly inside each parent's
declared range:

```json
"minimatch@3.1.5":  { "brace-expansion": "1.1.16" },
"minimatch@5.1.9":  { "brace-expansion": "2.1.2" },
"minimatch@10.2.5": { "brace-expansion": "5.0.8" }
```

Applying this and regenerating the lockfile produced **16 new high-severity
findings** (`archiver`, `archiver-utils`, `glob`, `rimraf`, `zip-stream`,
several `eslint-plugin-*` packages) — the scoped-per-version override
perturbed npm's resolver elsewhere in the tree (specifically around
`exceljs` → `archiver`'s own `archiver-utils@2.1.0` → `glob@7.x` branch,
which was already present in `main`'s original lockfile but had not
previously been surfaced as vulnerable by `npm audit`, and became
re-flagged once the resolver had to renegotiate around the scoped
overrides). This was caught immediately by re-running `npm audit --json`
after the change — count went from 1 to 16 — and reverted
(`git checkout main -- package-lock.json`, package.json edited back) before
any further step. Full detail in "What was tried and reverted" below.

**What was used instead:** a single flat override forcing all instances to
one version, `5.0.8` (the latest patch in the largest/newest of the three
lines, already required as `^5.0.5` by two of the three parent chains).
This does place `minimatch@3.1.5` (wants `^1.1.7`) and `minimatch@5.1.9`
(wants `^2.0.1`) outside their own literally-declared ranges — an explicit,
acknowledged trade-off, not a silent one. It was chosen because:

1. `brace-expansion`'s consumed API (a single `expand(pattern) -> string[]`
   function, called by `minimatch` the same way across all its major
   versions) has not changed in a way that affects this call pattern.
2. The scoped, strictly-range-compliant alternative was tried first and
   caused a real regression elsewhere in the tree (see above) — the flat
   override is the one that was empirically verified stable.
3. Verified afterward with the full suite (below), not assumed safe.

**Verified in isolation:** applied last, after `sharp` and `fast-uri` — `npm
audit` went from 1 finding to **0**. `npm ls brace-expansion` shows all 4
occurrences deduped to a single `5.0.8 overridden`/`deduped` entry, no
other package changed versions, no new finding introduced (re-confirmed
against the regression seen in the scoped attempt).

## Result

`npm audit` → **0 vulnerabilities** (all 4 baseline high-severity findings
resolved: 1 via a direct `package.json` patch bump — `next` — and 3 via
documented, individually-verified `overrides` entries — `sharp`,
`fast-uri`, `brace-expansion` — added and tested one at a time, not all at
once). `npm audit --audit-level=high` (the exact command the `KORA
Security` CI gate runs) exits 0.

Full verification after all four changes together: `npx tsc --noEmit`
clean; `npm test -- --run` 255/255 test files passed (10401 tests, 30
skipped, 18 `it.todo()` — same counts as the `main` baseline, since this
branch carries no Sprint 09 test changes); `npm run build` (real `next
build`) succeeded, all 167 routes generated; `git diff --check` clean.

## What was tried and reverted

Two dead ends, both caught before commit, both left no trace in the final
diff:

1. **`npm audit fix` (no `--force`), run right after the `next` bump.**
   Expected to clean up `brace-expansion`/`fast-uri` within existing
   ranges. Instead it changed `eslint`/`exceljs`'s own transitive
   resolution and produced **18** new high-severity findings across
   `archiver`, `glob`, `rimraf`, `zip-stream`, and several ESLint plugins.
   Reverted via `git checkout -- package-lock.json` immediately, before any
   other step — `package.json` was unaffected (`npm audit fix` only
   rewrites the lockfile, not the manifest).
2. **Scoped `minimatch@<version>` overrides for `brace-expansion`** — see
   above. Reverted the same way, then replaced with the flat override.

Neither of these ever reached a commit; both are recorded here so a future
sprint doesn't retry the same path expecting a different result.

## What was deliberately NOT done

- `npm audit fix --force` was never run.
- `next` was never downgraded — stays on major `16`, patch-bumped only.
- No direct dependency other than `next`/`eslint-config-next` was touched.
- No KORA Link file (`app/link/**`, `app/admin/kora-link/**`,
  `lib/kora-link/**`, `supabase/proposed/03[456]_*`,
  `tests/unit/kora-link-*`) was modified.
- Commits `78de353` and `a84f9d7` on `feature/kora-link-dpo-decisions-09`
  were not touched, amended, or rebased; that branch was not checked out
  during this sprint.
- No migration was applied; no remote database or staging environment was
  touched.
- No test was removed, skipped, or weakened.
