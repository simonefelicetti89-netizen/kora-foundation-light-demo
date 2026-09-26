# 222 — Release Candidate Dependency Security Remediation (PR #172)

**Scoped security remediation only. Committed locally, NOT pushed. PR #172 not merged, not closed,
still pointing at `53c643f7…`. No Production, Vercel, Supabase, migration, RLS, auth, UI or Product
code touched.**

**Result: 9 vulnerabilities → 0 at every severity. `npm audit --audit-level=high` exits 0.**

---

## 1. Original audit failure

`npm audit --audit-level=high` — the only failing GitHub check on PR #172 (KORA CI itself passed,
including the fresh 001→089 migration chain).

| Severity | Before |
|---|---|
| Critical | **1** |
| High | **2** |
| Moderate | **6** |
| Low / Info | 0 |
| **Total** | **9** |
| Blocking command | **FAIL** |

## 2. Exact vulnerability / dependency graph

| Package | Sev | Direct? | Installed | Vulnerable range | Path | Advisory |
|---|---|---|---|---|---|---|
| `next` | **CRITICAL** | direct | 16.2.11 | `>=16.0.0 <16.3.3` | root | Unauthenticated RCE on Windows-hosted servers; Unauthenticated RCE in Image Optimization API (AVIF) |
| `@xmldom/xmldom` | **HIGH** | transitive | 0.9.10 | `0.9.0-beta.1 – 0.9.11` | `read-excel-file@9.2.0 → @xmldom/xmldom@^0.9.10` | 13 advisories: injection bypasses, ReDoS, quadratic time/memory |
| `sharp` | **HIGH** | transitive (overridden) | 0.35.0 | `<0.35.4` | `next → sharp`, pinned by an existing override | libheif GHSA-rgj7-g3m4-5g8c |
| `postcss` | moderate | transitive (overridden) | 8.5.19 | `<=8.5.22` | effects `@tailwindcss/postcss`, `next`, `vite` | sourceMappingURL reads arbitrary `.map` when `from` unset |
| `vitest` | moderate | direct (dev) | 4.1.8 | `<4.1.11` | root | `@vitest/mocker` path traversal / arbitrary file read |
| `@vitest/coverage-v8` | moderate | direct (dev) | 4.1.8 | `<4.1.11` | root | via `vitest` |
| `@vitest/mocker` | moderate | transitive | — | `<4.1.11` | via `vitest` | same advisory |
| `@tailwindcss/postcss` | moderate | direct (dev) | — | — | via `postcss` | resolved by the postcss bump |
| `vite` | moderate | transitive | — | — | via `postcss` | resolved by the postcss bump |

## 3–4. Chosen minimum safe versions and why

| Package | Old | New | Direct/transitive | Why exactly this version |
|---|---|---|---|---|
| `next` | 16.2.11 | **16.3.3** | direct | The advisory range ends at `<16.3.3`, so **16.3.3 is the exact minimum**. npm's own `fixAvailable` proposed **16.3.5**; that was **not** taken because it exceeds what the advisories require. Same minor line, `isSemVerMajor: false`. |
| `eslint-config-next` | 16.2.11 | **16.3.3** | direct (dev) | Kept in lockstep with `next`, matching the repo's existing convention. |
| `sharp` (override) | 0.35.0 | **0.35.4** | transitive | Range `<0.35.4`; 0.35.4 is both the minimum safe and the newest in the 0.35 line. Override retained — dependency analysis shows `next` still pulls `sharp`, so removing it would un-pin the version. |
| `postcss` (override) | 8.5.19 | **8.5.23** | transitive | Range `<=8.5.22`; **8.5.23 is the first safe version**, deliberately not the latest (8.5.28). No Tailwind architecture change. |
| `vitest` | ^4.1.8 | **^4.1.11** | direct (dev) | Range `<4.1.11`. Stays on the **4.x** line; 5.0.1 exists and was **not** taken. |
| `@vitest/coverage-v8` | ^4.1.8 | **^4.1.11** | direct (dev) | Matched version line with `vitest`, as required. |
| `@xmldom/xmldom` | 0.9.10 | **removed from the tree** | transitive | **Parent updated instead of adding an override**, per §10 and the repo's own policy. |

### `@xmldom/xmldom` — parent update, not an override

`npm explain` and the lockfile located the single parent: `read-excel-file@9.2.0` →
`@xmldom/xmldom: ^0.9.10`. `read-excel-file` is declared as `^9.2.0`, and **9.3.10 already satisfies
that range**, so `npm update read-excel-file` moved it 9.2.0 → 9.3.10 **without any package.json
change**. 9.3.x replaced xmldom with `saxen`, so the package left the tree entirely.

This follows `docs/SECURITY_DEPENDENCY_HYGIENE_10.md`, the repo's own precedent, which reserves
overrides for cases where no parent update can reach the fix. An override was considered and
rejected as unnecessary.

**`npm audit fix --force` was never run.** It wanted `next@16.3.5` described as "outside the stated
dependency range" — a broader change than the advisories justify.

## 5. Files changed

| File | Change |
|---|---|
| `package.json` | 6 version bumps (+7/−7) |
| `package-lock.json` | regenerated deterministically (+314/−324) |

**Product code changed: NO.** No test, migration, RLS, auth, UI, database or workflow file touched.
Lockfile regenerated with normal npm commands only — **no manual lockfile surgery.**

## 6. Node runtime analysis — **decision required, not taken**

| Source | Declared Node |
|---|---|
| `package.json` `engines` | **absent** |
| `.nvmrc` · `.node-version` · `Dockerfile` · `vercel.json` · `vercel.ts` | **all absent** |
| `.github/workflows/ci.yml` | `20` (×3) and **`22`** (×1, `e2e-golden-path-local`) |
| `.github/workflows/security.yml` | `20` |
| `.github/workflows/kora-link-live-staging.yml` | `20` |

Dependency minimums: `@puppeteer/browsers` and `puppeteer-core@25.1.0` require **`>=22.12.0`**;
`@sparticuz/chromium@149.0.0` requires **`^22.17.0 || >=24.0.0`**.

**Mismatch: YES. Node change made: NO.**

**There is no canonical Node decision anywhere in the repository** — no `engines`, no version file,
no container or platform config — and the workflows are already internally inconsistent (20 in five
places, 22 in one). Setting a version would therefore *create* a cross-environment runtime standard,
not align to one. Per the instruction, this is escalated rather than decided:

> **PRODUCTION READINESS BLOCKER — NODE RUNTIME ALIGNMENT REQUIRED.** Founder must declare the
> canonical Node version, after which `engines`, a version file, all workflows and the Vercel runtime
> should be aligned in one deliberate change.

This did **not** block the security remediation: no dependency change above required Node ≥22, and
the entire regression below passed on the local toolchain.

## 7. npm audit — before / after

| Severity | Before | After |
|---|---|---|
| Critical | 1 | **0** |
| High | 2 | **0** |
| Moderate | 6 | **0** |
| Low / Info | 0 | **0** |
| **Total** | **9** | **0** |

```
npm audit --audit-level=high   EXIT = 0
npm audit  (all severities)    EXIT = 0   → "found 0 vulnerabilities"
```

**No remaining vulnerability of any severity — nothing deferred, nothing silently accepted.**

## 8. Regression results (clean tree)

| Step | Result |
|---|---|
| `rm -rf node_modules && npm ci` | **EXIT 0** — 0 vulnerabilities from the lockfile |
| `tsc --noEmit` | **EXIT 0**, clean |
| `npm test` | **419 files, 13381 passed, 325 skipped, 5 todo, 0 failures** |
| `npm run build` (production) | **EXIT 0**, compiled successfully |
| `npm run lint` | **EXIT 0** — 0 errors, 155 warnings (pre-existing baseline, unchanged) |
| `npm audit --audit-level=high` | **EXIT 0** |

**Targeted extra check:** because `read-excel-file` swapped its XML parser (xmldom → saxen), the
XLSX-parsing surface was exercised explicitly — `tests/unit/b91b-roster-import.test.ts`,
**81 cases passed**.

> **Residual verification note, disclosed:** the two consumers of `read-excel-file` are
> `lib/roster-import/roster-parser.ts` (covered, 81 cases) and **`lib/upload/file-parser.ts`, which
> has no dedicated test file**. Its XLSX path is therefore only indirectly covered. Recommended as an
> RC smoke item: one real `.xlsx` upload through the ingestion UI on the RC Preview.

Playwright/Puppeteer browser runtime was not re-exercised locally; no dependency in that chain changed.

## 9. Remaining vulnerabilities

**None.** Nothing dev-only deferred, nothing runtime deferred, nothing justified-and-accepted.

## 10–11. Git

| Field | Value |
|---|---|
| Branch | `release/kora-rc-2026-09-20` |
| Previous HEAD | `53c643f7719e7dcf2d6a165ac2f10f0b243e8563` |
| Remediation commit / new HEAD | **`cdb1aa698f7d844580113035adebc3bdfd53e45c`** |
| Parent | `53c643f7…` — RC history not amended, not rebased, not reset |
| Scope | 2 files: `package.json` (+7/−7), `package-lock.json` (+314/−324) |
| Worktree | clean |
| **Pushed** | **NO** |

## 12. Readiness implication

The **dependency-audit release blocker is closed locally** and awaits Founder review before push.
Once pushed, PR #172 re-runs the full matrix; the previously green KORA CI must be re-confirmed on
the new SHA, because `next` moved a minor version (16.2 → 16.3) and the XLSX parser changed
underneath `read-excel-file`.

Unchanged blockers from report 220: **Vercel Production/staging environment separation**; Production
migration-state inspection; verified backup/restore checkpoint; authenticated RC smoke/E2E;
`AUDIT_HASH_SALT` absent from the Vercel project. **New:** Node runtime alignment (§6).

## 13. Boundary attestations

PR #172 not merged, not closed, auto-merge not enabled, no approval given, no branch protection
touched. Nothing pushed. No Vercel environment variable read for value or modified. No Supabase
contact of any kind — staging or Production. No Production DB inspection, no backup. No migration
modified — `086` and `089` untouched. No WP-124 or PX work. No Living KORAL work; deferred renderer
untouched. No unrelated cleanup. `scripts/provision-next-review.mjs` never addressed by any command.

---

**Report 222 · 9 → 0 vulnerabilities · commit `cdb1aa69…` · not pushed · Node alignment escalated**
