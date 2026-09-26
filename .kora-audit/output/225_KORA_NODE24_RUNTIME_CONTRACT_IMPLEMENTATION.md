# 225 — Node 24 Runtime Contract Implementation

**Scoped runtime-contract remediation. Committed locally, NOT pushed. PR #172 not merged. No Vercel,
Supabase, Production, Product, test, migration or dependency change.**

---

## 1. Founder runtime decision

**Canonical KORA runtime: Node `>=24.0.0 <25.0.0`.** Ratified from report `224`. The purpose is to
align repository truth and CI with the runtime already in use — **not** to migrate Vercel.

## 2. Pre-change runtime declaration inventory (exhaustive)

Every `actions/setup-node` usage and every Node-version declaration in repo-owned files:

| File | Job | Previous Node |
|---|---|---|
| `.github/workflows/ci.yml` (L26) | `ci` | `'20'` |
| `.github/workflows/ci.yml` (L77) | `kora-link-local-integration` | `'20'` |
| `.github/workflows/ci.yml` (L374) | `e2e-smoke` | `'20'` |
| `.github/workflows/ci.yml` (L445) | `e2e-golden-path-local` | `'22'` |
| `.github/workflows/security.yml` (L50) | `npm-audit` | `'20'` |
| `.github/workflows/kora-link-live-staging.yml` (L44) | `live-staging-suite` | `'20'` |

**Six `setup-node` usages, six declarations — one-to-one, none missed.** All six use
`actions/setup-node@v4` with `cache: 'npm'`.

Confirmed absent before this change: `engines` in `package.json` · `volta` in `package.json` ·
`engines` in the lockfile root entry · `.nvmrc` · `.node-version` · `.tool-versions` · `Dockerfile` ·
`docker-compose.yml` · `vercel.json` · `vercel.ts` · `.npmrc`. **No additional repository-owned
runtime declaration exists**, so the scope did not expand.

## 3. Correction of report 224's file-count ambiguity — **CONFIRMED**

Report 224's prose said *"Six files, no dependency change"*. **That prose was wrong**, and the
Founder's reading is correct. 224's own table listed seven rows, two of which were explicitly
*no change* (`package-lock.json`, the Vercel setting). The actual change surface is:

> **5 files changed, 6 workflow jobs modified.**

`package.json` · `.nvmrc` (new) · `.github/workflows/ci.yml` (4 jobs) ·
`.github/workflows/security.yml` (1 job) · `.github/workflows/kora-link-live-staging.yml` (1 job).

Recorded as a correction; report 224 is not rewritten.

## 4. Exact changes

**A. `package.json`** — three added lines, nothing else:

```json
"engines": {
  "node": ">=24.0.0 <25.0.0"
},
```

**B. `.nvmrc`** — new file, contents `24`. The **major**, deliberately not a patch, because Vercel
itself tracks the managed 24.x line.

**C. Workflows** — six identical one-line swaps:

```
-          node-version: '20'        (or '22' in e2e-golden-path-local)
+          node-version-file: '.nvmrc'
```

`cache: 'npm'` preserved in every block. Job names, triggers, permissions, Docker/Supabase setup,
migration-chain logic, test commands, env vars, artifacts, E2E behaviour and security commands all
untouched. **No Actions version upgrades, no YAML modernization, no formatting churn.**

Diff totals: `+9 / −6` across 4 modified files plus 1 new file — exactly the intended surface.

**Not added, deliberately:** `.node-version` (redundant with `.nvmrc`), Dockerfile, and any Vercel
runtime config — Vercel is already `24.x`, so a config file would only restate it and create a
second source of truth.

## 5. package-lock.json outcome — **UNCHANGED**

`npm ci` accepted `package.json` + the existing lockfile cleanly, **exit 0**, and `git status`
confirms `package-lock.json` was not modified. **No lockfile regeneration was performed and no
dependency version moved.** Adding an `engines` field does not participate in dependency resolution.

## 6. Local runtime

**Node `v24.15.0`**, npm `11.12.1` — already compliant with the new contract; no version manager
invocation and no machine mutation were needed.

## 7. Validation evidence (all under Node 24)

| Step | Result |
|---|---|
| `npm ci` | **EXIT 0** — lockfile unmodified, "found 0 vulnerabilities" |
| `npm audit --audit-level=high` | **EXIT 0** |
| `npm audit` (all severities) | **0 vulnerabilities** |
| `npm run typecheck` | **EXIT 0** |
| `npm test` | **419 files · 13381 passed · 325 skipped · 5 todo · 0 failures** |
| `npm run build` | **EXIT 0** |
| `npm run lint` | **EXIT 0** — 0 errors, 155 warnings (pre-existing baseline, unchanged) |

No dependency version changed, as expected.

## 8. Decision Pack PDF qualification — and a risk downgrade

**Existing safe local smoke path: NONE.** No script in `scripts/`, no npm script, and no test
references Puppeteer or Chromium. Per instruction, **none was invented** and no Product/test
architecture was created.

**However, inspecting `lib/decision-pack/pdf-strategy.ts` materially downgrades this risk.** The
Chromium path is **opt-in, and off by default**:

```
getPdfDeliveryMode() → 'api_render'  only if NEXT_PUBLIC_KORA_PDF_ENABLED === 'true'
                     → 'browser_print'  otherwise (the default)
```

In `browser_print` mode the PDF buttons point at the HTML preview and the browser's own print dialog
produces the PDF — **no Chromium binary is loaded at all**. The file's own header records why:
`@sparticuz/chromium` weighs 67 MB against Vercel Hobby's 50 MB function limit.

`NEXT_PUBLIC_KORA_PDF_ENABLED` is **absent from the Vercel project** (report 220 §16), so on the
current configuration the Puppeteer/Chromium path is **dormant in Preview and would be dormant in
Production**. The dependencies ship; the code path does not execute.

**Carried forward, with reduced severity:**
**`DECISION PACK PDF RUNTIME SMOKE REQUIRED BEFORE PRODUCTION`** — required **only if**
`NEXT_PUBLIC_KORA_PDF_ENABLED=true` is ever set. While the flag is unset, the path is unreachable and
the Node-24 alignment removes the engine violation regardless.

## 9. XLSX smoke — carried forward, not mixed in

`read-excel-file` moved 9.2.0 → 9.3.10 in the previous task, replacing `@xmldom/xmldom` with `saxen`.
`lib/upload/file-parser.ts` still has no dedicated test. No zero-mutation local smoke exists, so
nothing was run here. **RELEASE CHECK: one real `.xlsx` upload through the ingestion/file-parser
Product path before Production.**

## 10–11. Git

| Field | Value |
|---|---|
| Branch | `release/kora-rc-2026-09-20` |
| Previous HEAD | `cdb1aa698f7d844580113035adebc3bdfd53e45c` |
| Runtime commit / new HEAD | **`5f9426974791b6e2ff292aa7634860c4666bd91a`** |
| Parent | `cdb1aa69…` ✓ correct — no prior RC commit amended |
| Scope | `ci.yml` 4/4 · `kora-link-live-staging.yml` 1/1 · `security.yml` 1/1 · `.nvmrc` +1 · `package.json` +3 |
| Worktree | clean |
| **Pushed** | **NO** |

## 12. Remaining Production Readiness blockers

| Item | Status |
|---|---|
| Vercel Preview/Production Supabase separation | **OPEN — release blocker** |
| Production migration-state verification | OPEN |
| `AUDIT_HASH_SALT` absent from the Vercel project | OPEN (MUST-FIX) |
| Verified backup/restore checkpoint | OPEN |
| Authenticated RC smoke/E2E (5 roles × 3 viewports) | OPEN |
| XLSX Product-path smoke | OPEN (RELEASE CHECK) |
| Decision Pack PDF runtime smoke | OPEN, **conditional** — only if the PDF flag is enabled |
| **Node runtime alignment** | **CLOSED locally — pending CI revalidation after push** |
| Dependency vulnerabilities | CLOSED (CI-confirmed on the previous SHA) |

**On push, PR #172 must re-run its complete CI**, because every job will then execute under Node 24.
The currently-green run on mixed Node 20/22 becomes historical evidence only.

## 13. Boundary attestations

PR #172 not merged, not closed, auto-merge not enabled. Nothing pushed. No Vercel modification of any
kind (project metadata read read-only only). No Supabase contact — staging or Production. No
Production migration-state query, backup, smoke or deploy. No Product code, test, migration or
dependency change. No WP-124 or PX work. No Living KORAL work.
`scripts/provision-next-review.mjs` never addressed by any command.

---

**Report 225 · Node 24 contract implemented · 5 files / 6 jobs · lockfile untouched · commit `5f942697…` · not pushed**
