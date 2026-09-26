# 227 — Node 24 / PR #172 CI Evidence Closure

**Evidence-adoption report. READ-ONLY: no code, push, merge, Vercel or Supabase change.**

> **This report SUPERSEDES the pending CI conclusion in report `226`.** Report 226 closed at
> *AWAITING CI EVIDENCE* because this environment cannot read GitHub Actions (`gh` absent, no token).
> The Founder has now supplied externally verified GitHub evidence, adopted below. **Report 226 is
> not rewritten** — its "NOT OBSERVABLE" entries were accurate for the environment that produced
> them, and remain the honest record of what was knowable at that moment.

---

## 1. PR #172 — verified state (external evidence)

| Field | Value |
|---|---|
| Repository | `simonefelicetti89-netizen/kora-foundation-light-demo` |
| PR | **#172** |
| State | **OPEN** |
| Merged | **NO** |
| Auto-merge | **OFF** |
| Mergeability | **CLEAN** |
| Base | `main` |
| **Raw PR head SHA** | **`5f9426974791b6e2ff292aa7634860c4666bd91a`** |
| **Synthetic GitHub PR merge/test SHA** | **`acd034686fc96066200d44d07c9eeb7079430a27`** |

The two identifiers remain distinct, as required: CI validated the **synthetic integration state**
(`current main` + Node 24 RC head), not the raw branch HEAD in isolation. The earlier integration SHA
`8ba13f1e9952062b9a0f4cdc04c279cdcc03e6b6` belonged to the *previous* head and is now historical.

## 2. Workflow results — adopted

**KORA CI — run #321 — SUCCESS**

- TypeScript · unit regression · production build · lint (blocking)
- E2E public smoke (Playwright)
- E2E golden path (Playwright, local Supabase, seeded)
- DB-backed gate — RLS mandatory suites + KORA Link behavioral suite

**KORA Security — run #228 — SUCCESS**

- Dependency audit (`npm audit`)
- Secret scan (gitleaks)

**Therefore the Node 24 RC integration state has passed, on CI and not merely locally:**
TypeScript · unit regression · production build · lint · public E2E smoke · fresh local Supabase
startup · **migration chain 001→089** · DB/RLS mandatory suites · KORA Link behavioral suite ·
local golden-path E2E · dependency security audit · secret scan.

## 3. Node runtime evidence

Externally verified from the Actions logs: the Node-dependent PR jobs consume
`node-version-file: .nvmrc`, and GitHub reported **`Resolved .nvmrc as 24`** and **`node: v24.20.0`**.

Explicitly observed for: the TypeScript/tests/build/lint job · E2E public smoke · E2E golden path ·
the DB/RLS + KORA Link gate · the dependency audit.

The **gitleaks secret-scan job does not use `setup-node`** and is therefore outside the runtime
question — correctly excluded rather than counted as a gap.

**Runtime chain now consistent end to end:** contract `>=24.0.0 <25.0.0` (`package.json engines`) →
`.nvmrc` = `24` → CI resolves **v24.20.0** → Vercel build/runtime **24.x** → local dev **v24.15.0**.

## 4. Live-staging workflow qualification — **NOT a release blocker**

`.github/workflows/kora-link-live-staging.yml` was aligned to `.nvmrc` (line 44 confirmed) but was
not executed by PR #172.

| Dimension | Status |
|---|---|
| Configuration alignment | **VERIFIED** |
| Execution under Node 24 | **NOT OBSERVED in this PR** |
| Release blocker | **NO** |

**This is a determination from the workflow's own source, not deference.** Its name is
*"KORA Link — live staging suite (manual)"*, and its header states it is
*"Manual, opt-in … **never run automatically, never on a pull_request or push trigger**"*, and
*"deliberately narrower than the local integration suite in ci.yml (which is CI-mandatory and
exhaustive)."* It requires human `workflow_dispatch` and repository secrets for a real staging
connection.

It is therefore **categorically not a PR release gate**: its exhaustive counterpart runs inside
`ci.yml` and passed. Its non-execution is neither a gap in coverage nor a blocker. **It was not
triggered in this task.**

## 5. Node runtime verdict — **CLOSED**

The Production Readiness Node-runtime blocker is **CLOSED**:

- canonical contract declared: `>=24.0.0 <25.0.0`;
- Vercel already runs Node `24.x` (build and server runtime, both targets);
- local validation passed on Node `v24.15.0` (report 225);
- **PR integration CI passed under Node `v24.20.0`** (KORA CI #321);
- security CI passed under Node 24 (KORA Security #228);
- all mandatory PR release gates green.

**Not to be reopened merely because a manual, non-PR live-staging workflow was not invoked.**

## 6. Security state

| Severity | Count |
|---|---|
| Critical | **0** |
| High | **0** |
| Moderate | **0** |
| Blocking `npm audit` | **PASS** |

No dependency change occurred after the runtime commit, and the audit passed again on the Node 24
integration state — so the result is confirmed on the current head, not inherited.

## 7. Vercel Preview — now READY (closing report 226's open item)

| Field | Value |
|---|---|
| Deployment ID | `dpl_8GFdRkQGzqmZkgGoK7cyqn69kMBm` |
| Commit SHA | `5f9426974791b6e2ff292aa7634860c4666bd91a` |
| Target | **PREVIEW** (`null`) |
| State | **READY** (report 226 recorded BUILDING; superseded here) |
| Hostname | `kora-foundation-light-demo-59th4uldg-simone-felicettis-projects.vercel.app` |

No production deployment exists in this project. No manual deploy, no promotion, no env change.

## 8. Production Readiness state

### Closed
1. **Node runtime alignment** — §5
2. **Dependency security remediation** — §6
3. **Fresh migration chain evidence (001→089)** — §2, CI-verified on the Node 24 integration state

### Still open
1. **Vercel Preview / Production Supabase environment separation** — *release blocker*
2. Production migration-state verification
3. `AUDIT_HASH_SALT` configuration
4. Verified Production backup / restore checkpoint
5. Authenticated RC smoke / E2E (5 roles × 3 viewports)
6. Real XLSX Product-path smoke (`lib/upload/file-parser.ts` has no dedicated test)
7. Decision Pack PDF runtime smoke — **conditional**, only if Chromium/Puppeteer mode is enabled
   (`NEXT_PUBLIC_KORA_PDF_ENABLED` is absent, so the path is dormant)

**PR #172 remains OPEN and must NOT be merged.**

## 9. Boundary attestations

No code, test, migration or dependency change. No push, no merge, no approval, no auto-merge, no
branch-protection change. The live-staging workflow was not triggered. No Vercel configuration or
environment variable changed (deployment status read read-only). No Supabase contact — staging or
Production. No Production migration-state query, backup, smoke or deploy. No WP-124 or PX work. No
Living KORAL work. Report 226 not rewritten.
`scripts/provision-next-review.mjs` never addressed by any command.

---

**Report 227 · supersedes report 226's pending CI conclusion · Node 24 blocker CLOSED · PR #172 open, unmerged**
