# 224 — Node Runtime Contract: Production Readiness Adjudication

**READ-ONLY runtime audit. No code, workflow, Vercel, push, merge or Production change. Only this
report written.**

> **Headline, and it reframes the question: Vercel already runs Node `24.x` for this project — build
> and server runtime, Preview and Production. The application runtime is therefore already compliant
> with every dependency contract. The mismatch is in CI, which validates on Node 20 — a version that
> violates two *production* dependencies' declared engines and is not the runtime that actually
> serves the app.** The problem is evidence fidelity, not production risk.

---

## 1. Current state — exact usage by file and job

| File | Job | Node |
|---|---|---|
| `.github/workflows/ci.yml` | `ci` (typecheck, unit, lint, build) | **20** |
| `.github/workflows/ci.yml` | `kora-link-local-integration` (DB-backed gate, RLS, migration chain) | **20** |
| `.github/workflows/ci.yml` | `e2e-smoke` | **20** |
| `.github/workflows/ci.yml` | `e2e-golden-path-local` | **22** |
| `.github/workflows/kora-link-live-staging.yml` | `live-staging-suite` | **20** |
| `.github/workflows/security.yml` | `npm-audit` | **20** |
| **Vercel project** | build + server runtime, Preview **and** Production | **`nodeVersion: "24.x"`** |
| Local development machine | — | **v24.15.0** |

**Canonical declaration exists: NO.** No `engines` in `package.json`; no `.nvmrc`, `.node-version`,
`Dockerfile`, `docker-compose.yml`, `vercel.json`, `vercel.ts` or `netlify.toml`. **Three different
Node majors are in simultaneous use (20, 22, 24) with nothing declaring which is correct.**

No workflow uses `node-version-file`; all six pin a literal string independently.

## 2. Dependency contract — classified, because not all packages weigh the same

| Package | Version | `engines.node` | Classification |
|---|---|---|---|
| `next` | 16.3.3 | `>=20.9.0` | **APPLICATION RUNTIME** |
| `react` / `react-dom` | 19.2.4 | `>=0.10.0` / — | APPLICATION RUNTIME |
| **`puppeteer-core`** | 25.1.0 | **`>=22.12.0`** | **APPLICATION RUNTIME (`dependencies`, not dev)** |
| **`@sparticuz/chromium`** | 149.0.0 | **`^22.17.0 \|\| >=24.0.0`** | **APPLICATION RUNTIME (`dependencies`, not dev)** |
| `@puppeteer/browsers` | 3.0.4 | `>=22.12.0` | transitive of `puppeteer-core` |
| `@supabase/supabase-js` | 2.106.2 | `>=20.0.0` | APPLICATION RUNTIME |
| `sharp` | 0.35.4 | `>=20.9.0` | transitive (build/image) |
| `vitest` | 4.1.11 | `^20.0.0 \|\| ^22.0.0 \|\| >=24.0.0` | DEV/CI ONLY |
| `playwright` | 1.60.0 | `>=18` | DEV/CI ONLY |
| `eslint` | 9.39.4 | `^18.18.0 \|\| ^20.9.0 \|\| >=21.1.0` | DEV/CI ONLY |
| `typescript` | 5.9.3 | `>=14.17` | DEV/CI ONLY |

**The two binding constraints are production dependencies, not dev tooling.** `puppeteer-core` and
`@sparticuz/chromium` sit in `dependencies` and therefore ship to the Vercel serverless runtime.

**Intersection of all contracts:** `>=22.17.0` (within the 22 line) **or** `>=24.0.0`.
**Node 20 satisfies neither of the two binding constraints.**

### Where those packages are actually used

`app/api/admin/decision-pack/pdf/route.ts` → `lib/decision-pack/pdf-strategy.ts` →
`lib/decision-pack/pdf-runtime.ts` — the Decision Pack PDF generation path, a real Product surface.

> **Material gap, found while auditing: no test anywhere references `puppeteer` or `chromium`.** The
> PDF/browser path is **not covered by the suite at all**, on any Node version. So the runtime
> mismatch and a coverage hole overlap on exactly the same code.

## 3. Next.js support

`next@16.3.3` declares `>=20.9.0` — it supports 20, 22 and 24 alike. **Next.js does not constrain
this decision.**

## 4. Vercel runtime — **known, not inferred**

Read directly from project metadata (`prj_eybQKAPKBzP6Jt2oYAOH1BfaBixO`): **`nodeVersion: "24.x"`**.
That governs the build container and the Next.js server functions, for **both** Preview and
Production, since the project has one runtime setting and no per-target override.

**Vercel runtime known: YES.** No external verification required for this question.
*(Unrelated caveat that stands from report 220: the Supabase **environment variables** are
single-scoped across Preview and Production — a separate blocker, not a runtime question.)*

## 5–7. Options

### OPTION A — Node 22 (minimum 22.17.0)

- **Compatibility:** satisfies every contract, but only at **≥22.17.0** — `@sparticuz/chromium`
  excludes 22.0–22.16.
- **Dependency compatibility:** ✅ all packages.
- **Vercel compatibility:** ⚠️ **requires changing the Vercel project setting from 24.x down to 22.x**,
  or accepting that CI and production deliberately differ.
- **CI compatibility:** ✅ straightforward.
- **Migration effort:** medium — 6 workflow values **plus** a Vercel project change.
- **Release risk:** **higher than it looks.** Downgrading the production runtime to make CI match is
  a change to the thing that currently works, to accommodate the thing that doesn't.
- **Longevity:** Node 22 is in maintenance ahead of 24; shorter runway.

### OPTION B — Node 24

- **Compatibility:** `>=24.0.0` satisfies **every** contract with margin, including both binding
  production dependencies.
- **Dependency compatibility:** ✅ all packages; `vitest` explicitly lists `>=24.0.0`.
- **Vercel compatibility:** ✅ **already the configured runtime — zero Vercel change.**
- **CI compatibility:** ✅ `actions/setup-node` supports 24.
- **Migration effort:** **smallest** — align CI *up* to the runtime that already exists. No platform
  change, no dependency change.
- **Release risk:** **lowest.** It makes CI test what production actually runs. The one real risk is
  that a job currently green on Node 20 could fail on 24 — which is precisely the defect this closes,
  and is better discovered in a PR than after a merge.
- **Longevity:** Node 24 is the current Active LTS line, the longest runway of the two.
- **Corroborating signal:** the developer machine is already on v24.15.0, and one CI job was already
  bumped to 22 — someone has been pulled upward twice already.

## 8. Recommendation

### **Canonical runtime: Node 24. Contract: `>=24.0.0 <25.0.0`.**

**Rationale:** Vercel already runs 24.x, so this is not a migration — it is *writing down what
production already does* and making CI honest about it. It is the only option requiring no platform
change, it satisfies both binding production contracts with margin, it is the current Active LTS, and
it matches the local development machine. Node 22 would mean downgrading a working production runtime
to accommodate stale CI configuration.

### Enforcement — smallest coherent set (three mechanisms, one source of truth)

1. **`package.json` `engines.node: ">=24.0.0 <25.0.0"`** — the machine-checkable contract; npm then
   surfaces `EBADENGINE` for anyone on a non-compliant runtime.
2. **`.nvmrc` containing `24`** — local development, and readable by CI.
3. **GitHub workflows use `node-version-file: .nvmrc`** instead of six independent literals — so the
   version has exactly one home and cannot drift again.

**Deliberately excluded:** `.node-version` (redundant with `.nvmrc`); any **Vercel change** (already
24.x); any `vercel.json`/`vercel.ts` (would be created solely to restate the existing setting).

## 9. Implementation scope if ratified

| File | Change | Necessary because |
|---|---|---|
| `package.json` | add `"engines": { "node": ">=24.0.0 <25.0.0" }` | no contract exists today |
| `.nvmrc` | **new file**, contents `24` | local + CI single source |
| `.github/workflows/ci.yml` | 4 jobs: `node-version: '20'\|'22'` → `node-version-file: .nvmrc` | 3 jobs violate production contracts |
| `.github/workflows/security.yml` | 1 job, same change | same |
| `.github/workflows/kora-link-live-staging.yml` | 1 job, same change | same |
| `package-lock.json` | **no change expected** — adding `engines` does not alter resolution | — |
| Vercel project setting | **no change** — already `24.x` | — |

Six files, no dependency change, no Product code. **After the change the whole PR CI matrix must be
re-run**, because every job would execute on a different Node major than the run that is currently
green.

## 10. Release impact

### **Classification: B — MUST FIX BEFORE PRODUCTION MERGE.**

Not **A**: the RC itself may proceed. No code changes, the application runtime is already compliant,
and nothing about the mismatch makes the current RC content wrong.

Not **C** or **D**: this is more than a check or debt. It materially weakens the evidence that a
production merge would rest on.

### Is the currently-green CI sufficient evidence of code correctness?

**Partially — and the split matters:**

- **Sufficient** for TypeScript, unit tests, lint, the production build, the fresh 001→089 migration
  chain, and the DB-backed RLS suite. These are runtime-version-insensitive in practice, exercise
  Postgres rather than Node internals, and run above every relevant engine floor.
- **NOT sufficient** for the `puppeteer-core` / `@sparticuz/chromium` Decision Pack PDF path. Those
  are **production dependencies whose declared minimums Node 20 does not meet**, production serves
  them on Node 24, and **no test exercises them on any version.** Green CI says nothing at all about
  that surface.

So the green CI genuinely validates the bulk of the release — and specifically does not validate the
one path where the runtime contract is violated.

## 11. Remaining release blockers — carried forward, not addressed here

Vercel Preview/Production Supabase environment scoping (**release blocker**) · Production
migration-state verification · verified backup/restore checkpoint · XLSX Product-path smoke
(`lib/upload/file-parser.ts` still untested) · authenticated RC smoke/E2E (5 roles × 3 viewports) ·
`AUDIT_HASH_SALT` absent from the Vercel project · **new:** Decision Pack PDF path has no test
coverage at all.

**Closed since report 223:** the RC Preview `dpl_41wEAXn1iRhPAKfKzu1c3rM2HS5K` for
`cdb1aa698f7d844580113035adebc3bdfd53e45c` is now **READY** (Preview target, not Production).

## 12. Boundary attestations

No code, workflow, `package.json`, `.nvmrc` or Vercel modification. No push, no merge — PR #172
untouched. No Production Supabase contact, no migration-state query, no backup, no deploy. Vercel
read read-only (project metadata and deployment status only); no variable read for value, none
changed. No WP-124 or PX work. No Living KORAL work. `scripts/provision-next-review.mjs` never
addressed by any command.

---

**Report 224 · Recommend Node 24 (`>=24.0.0 <25.0.0`) · enforcement via engines + .nvmrc + node-version-file · classification B**
