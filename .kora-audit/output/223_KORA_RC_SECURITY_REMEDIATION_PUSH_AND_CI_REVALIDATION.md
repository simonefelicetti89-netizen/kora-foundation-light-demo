# 223 — RC Security Remediation: Push and CI Revalidation

**Push executed as authorized. PR #172 not merged. GitHub Actions results NOT observable from this
environment — see §6. No Node change, no Vercel env change, no Production Supabase contact.**

---

## 1. Reviewed remediation commit

`cdb1aa698f7d844580113035adebc3bdfd53e45c` — "fix(security): remediate release candidate dependency
vulnerabilities". Two files: `package.json` (+7/−7), `package-lock.json` (+314/−324). No Product code.
Accepted by the Founder on the evidence in report `222`.

## 2. Pre-push state — every condition matched

| Check | Expected | Actual | ✓ |
|---|---|---|---|
| Branch | `release/kora-rc-2026-09-20` | same | ✓ |
| Local HEAD | `cdb1aa698f7d844580113035adebc3bdfd53e45c` | same | ✓ |
| Parent | `53c643f7719e7dcf2d6a165ac2f10f0b243e8563` | same | ✓ |
| Worktree | clean | 0 porcelain entries | ✓ |
| Remote RC before push | `53c643f7719e7dcf2d6a165ac2f10f0b243e8563` | same | ✓ |
| Fast-forward possible | yes | `merge-base --is-ancestor` true | ✓ |
| `origin/main` | `70c4cfa0dfa36d8697d8f76a3a7df8a5bf530adc` | unchanged | ✓ |

No unexpected remote work existed; nothing was overwritten.

## 3. Push result — **SUCCESS**

```
53c643f..cdb1aa6  release/kora-rc-2026-09-20 -> release/kora-rc-2026-09-20
```

**Fast-forward confirmed** by git's own two-dot range notation; a forced update would have printed
`+ … (forced update)`. No force, no lease, no rebase, no amend, no history rewrite.

| Field | Value |
|---|---|
| Old remote SHA | `53c643f7719e7dcf2d6a165ac2f10f0b243e8563` |
| New remote SHA | `cdb1aa698f7d844580113035adebc3bdfd53e45c` |
| Local ≡ remote | **YES** |
| Worktree after push | clean |
| `origin/main` | `70c4cfa0…` — **untouched** |
| `feature/wp016-…` source branch | `53c643f7…` — **untouched** |

## 4–5. PR #172 — head updated; state not directly verifiable here

The push updates PR #172's head automatically to `cdb1aa698f7d844580113035adebc3bdfd53e45c`.

**Stated honestly: this environment cannot query GitHub.** `gh` is not installed, `hub` is not
installed, and no `GITHUB_TOKEN`/`GH_TOKEN` is present. Therefore:

- PR open/merged state: **not verifiable from here** — nothing in this task merged, closed, approved,
  queued or enabled auto-merge on it, and no branch protection was read or changed.
- **Synthetic PR merge/test SHA: NOT OBSERVABLE from here.** The prior one was recorded by the
  Founder as `2497cee02e53b6d0955095d5a795c9006f2f7587` (main + previous RC head). GitHub will
  generate a **new** synthetic merge SHA for `main + cdb1aa69…`; it must be read from the PR's
  Checks tab. **This report deliberately does not invent one.**

> **Evidence semantics, recorded as required:** GitHub `pull_request` workflows validate the PR's
> synthetic merge ref, not the raw branch HEAD. So PR CI evidence is always
> **"PR integration state against current main"**, not "CI ran on `cdb1aa69…`". Two distinct
> identifiers must always be recorded: **(A) PR head SHA** = `cdb1aa698f7d844580113035adebc3bdfd53e45c`,
> and **(B) GitHub PR merge/test SHA** = to be read from the PR.

## 6. Triggered workflows — status NOT OBSERVABLE from this environment

Expected to trigger on the `pull_request` event for PR #172: **KORA CI** (TypeScript · unit tests ·
build · lint · E2E public smoke · fresh local Supabase startup · full tracked migration chain
001→089 · DB-backed RLS suite · KORA Link behavioral suite · E2E golden path) and **KORA Security**
(gitleaks/secret scan · dependency audit).

| Job | Result |
|---|---|
| Every KORA CI job | **NOT OBSERVABLE — must be read from the PR Checks tab** |
| KORA Security — secret scan | **NOT OBSERVABLE** |
| KORA Security — dependency audit | **NOT OBSERVABLE** |

**No CI result is claimed, inferred or fabricated in this report.** The previous green KORA CI
explicitly does **not** carry over: `next` moved 16.2 → 16.3, `eslint-config-next`, `sharp`,
`postcss`, `vitest` and the whole `package-lock.json` changed, and the XLSX transitive parser was
replaced.

**Founder/ChatGPT must read and record:**
`https://github.com/simonefelicetti89-netizen/kora-foundation-light-demo/pull/172` → Checks.

### Local evidence that stands behind the push (from report 222, on the exact commit)

`npm ci` clean · `npm audit --audit-level=high` **EXIT 0** · `npm audit` all levels **0
vulnerabilities** · `tsc --noEmit` clean · **419 files / 13381 tests passed / 0 failures** ·
production build **EXIT 0** · lint **EXIT 0** · roster-import **81 passed**. This is local evidence
for the head commit, **not** PR-integration evidence.

## 7–11. Dependency audit, migration chain, DB/RLS, E2E

| Evidence | Local (report 222) | PR CI |
|---|---|---|
| Dependency audit | **0 critical / 0 high / 0 moderate / 0 total** | pending, not observable here |
| Fresh 001→089 migration chain | not run locally (by design) | pending — the PR is the only source |
| DB-backed RLS suite | RLS-03 27/27 previously, on the pre-remediation tree | pending |
| KORA Link behavioral suite | not run locally | pending |
| E2E golden path / public smoke | not run locally | pending |

## 12. Vercel Preview evidence

A new Preview was created automatically by the Git integration. Nothing was manually deployed,
promoted, or re-scoped; no environment variable was read for value or modified.

| Field | Value |
|---|---|
| Deployment ID | `dpl_41wEAXn1iRhPAKfKzu1c3rM2HS5K` |
| Commit SHA | `cdb1aa698f7d844580113035adebc3bdfd53e45c` — the new RC head |
| Ref | `release/kora-rc-2026-09-20` |
| Hostname | `kora-foundation-light-demo-prwtwdj8d-simone-felicettis-projects.vercel.app` |
| **Target** | **`null` — PREVIEW, not Production** |
| State at time of writing | **BUILDING** (final state to be confirmed) |

Also noted: the Phase 2A RC branch push *did* produce a Preview after all —
`dpl_ERwJrT114dhkb5LmdW5op6YuQEvy` for `53c643f7…`, READY, Preview. Report 221 recorded "not
observed yet", which was accurate at that moment; this supersedes it. **No production deployment
exists in the project.**

## 13. Node runtime blocker — carried forward unchanged

**PRODUCTION READINESS BLOCKER — NODE RUNTIME ALIGNMENT REQUIRED.** Most workflows run Node `20`
(five places), one job runs `22`; `puppeteer-core` requires `>=22.12.0` and `@sparticuz/chromium`
requires `^22.17.0 || >=24.0.0`; no canonical declaration exists anywhere in the repo.

**Nothing was changed:** no `engines`, no `.nvmrc`, no `.node-version`, no workflow Node version, no
Vercel runtime. Separate governed decision, after security CI revalidation.

## 14. XLSX Product-path smoke — carried forward

`read-excel-file` moved 9.2.0 → 9.3.10 inside its existing range, replacing `@xmldom/xmldom` with
`saxen`. `lib/roster-import/roster-parser.ts` is covered (81 cases, passing); **`lib/upload/file-parser.ts`
has no dedicated test.**

**RELEASE CHECK (carried forward): one real `.xlsx` upload through the ingestion/file-parser Product
path before Production release.** Not run now. No automated test was invented for it in this task.

## 15. Remaining Production Readiness blockers

| Item | Status |
|---|---|
| **PR #172 CI results unread** | **NEW — the immediate next evidence step** |
| Vercel Production/staging environment separation | **OPEN — release blocker** |
| Node runtime alignment | **OPEN — release blocker** |
| Production migration-state inspection | OPEN |
| Verified backup/restore checkpoint before rollout | OPEN |
| Authenticated RC smoke/E2E (5 roles × 3 viewports) | OPEN |
| `AUDIT_HASH_SALT` absent from the Vercel project | OPEN (MUST-FIX) |
| XLSX Product-path smoke | OPEN (RELEASE CHECK) |
| Dependency vulnerabilities | **CLOSED locally — pending CI confirmation** |

## 16. Boundary attestations

PR #172 not merged, squash-merged, rebase-merged, queued, auto-merged or approved; no branch
protection touched. No other remediation started. No Node standard change. No Vercel environment
variable read for value or modified; no manual deploy, no promotion. No Supabase contact — staging or
Production. No Production migration-state query, no backup, no Production smoke, no merge to main, no
Production deploy. No WP-124 or PX work. No Living KORAL work. No migration modified.
`scripts/provision-next-review.mjs` never addressed by any command.

---

**Report 223 · pushed `53c643f..cdb1aa6` fast-forward · Preview building · PR CI results must be read externally**
