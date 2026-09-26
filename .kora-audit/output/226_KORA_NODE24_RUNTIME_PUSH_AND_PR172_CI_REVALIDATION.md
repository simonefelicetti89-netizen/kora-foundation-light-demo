# 226 — Node 24 Runtime Push and PR #172 CI Revalidation

**Push executed as authorized. PR #172 not merged. GitHub Actions results NOT observable from this
environment. No Vercel config, Supabase or Production change.**

---

## 1. Pre-push state — every condition matched

| Check | Expected | Actual | ✓ |
|---|---|---|---|
| Branch | `release/kora-rc-2026-09-20` | same | ✓ |
| Local HEAD | `5f9426974791b6e2ff292aa7634860c4666bd91a` | same | ✓ |
| Parent | `cdb1aa698f7d844580113035adebc3bdfd53e45c` | same | ✓ |
| Worktree | clean | 0 porcelain entries | ✓ |
| Remote RC before push | `cdb1aa698f7d844580113035adebc3bdfd53e45c` | same | ✓ |
| Fast-forward possible | yes | `merge-base --is-ancestor` true | ✓ |
| `origin/main` | `70c4cfa0dfa36d8697d8f76a3a7df8a5bf530adc` | **unmoved** | ✓ |
| `main` still an ancestor of RC | yes | true — **PR integration clean, no rebase implied** | ✓ |

## 2. Local runtime commit

`5f9426974791b6e2ff292aa7634860c4666bd91a` — "chore(runtime): standardize KORA on Node 24".
5 files / 6 workflow jobs; `package.json` `engines.node` `>=24.0.0 <25.0.0`; new `.nvmrc` = `24`;
all six `actions/setup-node` steps switched to `node-version-file: '.nvmrc'`. `package-lock.json`
untouched. Validated locally on Node v24.15.0 (report 225).

## 3–4. Push result and remote branch SHA — **SUCCESS**

```
cdb1aa6..5f94269  release/kora-rc-2026-09-20 -> release/kora-rc-2026-09-20
```

**Fast-forward confirmed** by the two-dot range notation; a forced update prints
`+ … (forced update)`. No force, no lease, no rebase, no amend, no history rewrite.

| Field | Value |
|---|---|
| Old remote SHA | `cdb1aa698f7d844580113035adebc3bdfd53e45c` |
| **New remote SHA** | **`5f9426974791b6e2ff292aa7634860c4666bd91a`** |
| Local ≡ remote | **YES** |
| Worktree after push | clean |
| `origin/main` | `70c4cfa0…` — **untouched** |

## 5–7. PR #172 and CI semantics

**Raw PR head SHA: `5f9426974791b6e2ff292aa7634860c4666bd91a`** — the push updates PR #172's head
automatically.

**Synthetic PR merge/test SHA: NOT OBSERVABLE from this environment.** GitHub will mint a new
integration SHA representing `current main + Node 24 RC head`; it must be read from the PR's Checks
tab. **No value is invented here.** The previous integration SHA recorded by the Founder
(`8ba13f1e9952062b9a0f4cdc04c279cdcc03e6b6`) belongs to the *previous* head and is now historical.

The distinction is preserved deliberately: **(A) raw PR head** ≠ **(B) synthetic merge/test SHA**,
and **branch-only local validation is not equivalent to PR integration validation.**

PR state — open / merged / auto-merge — **not directly verifiable here**: `gh` is not installed,
`hub` is not installed, and no `GITHUB_TOKEN`/`GH_TOKEN` is present. **Nothing in this task merged,
squash-merged, rebase-merged, approved, queued or enabled auto-merge on PR #172, and no branch
protection was read or changed.**

## 8–10. Required full CI — **NOT OBSERVABLE**

Every job must re-run, because the runtime changed for all of them.

| Workflow / job | Result |
|---|---|
| KORA CI — TypeScript | **NOT OBSERVABLE** |
| KORA CI — unit tests | **NOT OBSERVABLE** |
| KORA CI — production build | **NOT OBSERVABLE** |
| KORA CI — lint | **NOT OBSERVABLE** |
| KORA CI — E2E public smoke | **NOT OBSERVABLE** |
| KORA CI — local Supabase startup | **NOT OBSERVABLE** |
| KORA CI — fresh migration chain 001→089 | **NOT OBSERVABLE** |
| KORA CI — DB/RLS mandatory suite | **NOT OBSERVABLE** |
| KORA CI — KORA Link behavioral suite | **NOT OBSERVABLE** |
| KORA CI — E2E golden path | **NOT OBSERVABLE** |
| KORA Security — gitleaks / secret scan | **NOT OBSERVABLE** |
| KORA Security — npm dependency audit | **NOT OBSERVABLE** |

**No CI result is claimed, inferred or fabricated.** The previously-green run on mixed Node 20/22 is
**historical evidence only** and does not transfer.

### Node version verification in CI — pending, and it is the decisive check

All six `setup-node` steps now specify `node-version-file: '.nvmrc'` with `.nvmrc` = `24`, so each
job *should* resolve Node 24.x. **This must be confirmed from the workflow logs**, per job, at the
"Setup Node" step.

> **If any job still reports Node 20 or Node 22, classify
> `NODE RUNTIME CONTRACT NOT FULLY APPLIED` and stop.** No workflow patch may be applied silently.

### Failure rule

If any required job fails, nothing is to be remediated automatically. Capture workflow, job, failing
step, concise error, **the actual Node version that job ran**, and whether the failure looks caused
by the Node 24 alignment or is unrelated — then stop for Founder review.

**Founder/ChatGPT must read:**
`https://github.com/simonefelicetti89-netizen/kora-foundation-light-demo/pull/172` → Checks.

## 11. Vercel Preview — created automatically

| Field | Value |
|---|---|
| Deployment ID | `dpl_8GFdRkQGzqmZkgGoK7cyqn69kMBm` |
| Commit SHA | `5f9426974791b6e2ff292aa7634860c4666bd91a` — the new RC head |
| Ref | `release/kora-rc-2026-09-20` |
| Hostname | `kora-foundation-light-demo-59th4uldg-simone-felicettis-projects.vercel.app` |
| **Target** | **`null` — PREVIEW, not Production** |
| State at time of writing | **BUILDING** (final state to be confirmed) |

No manual deploy, no promotion, no environment-variable read-for-value or change. The prior Preview
for `cdb1aa69…` (`dpl_41wEAXn1iRhPAKfKzu1c3rM2HS5K`) is **READY**. **No production deployment exists
in this project.**

## 12. Decision Pack PDF — carried forward, conditional

`NEXT_PUBLIC_KORA_PDF_ENABLED` is absent from the Vercel project, so `getPdfDeliveryMode()` returns
`browser_print` and no Chromium binary loads. The Puppeteer/Chromium path is **dormant under current
configuration**. No test was created here.

**Carried forward: `DECISION PACK PDF RUNTIME SMOKE` — required only if Chromium/Puppeteer mode is
enabled before Production.**

## 13. XLSX Product check — carried forward unchanged

**`REAL XLSX PRODUCT-PATH SMOKE REQUIRED BEFORE PRODUCTION`** (`lib/upload/file-parser.ts` has no
dedicated test). Not performed in this task.

## 14–15. Remaining Production Readiness blockers

| Item | Status |
|---|---|
| **PR #172 CI results unread on the Node 24 head** | **immediate next evidence step** |
| Vercel Preview/Production Supabase separation | **OPEN — release blocker** |
| Production migration-state verification | OPEN |
| `AUDIT_HASH_SALT` absent from the Vercel project | OPEN (MUST-FIX) |
| Verified backup/restore checkpoint | OPEN |
| Authenticated RC smoke/E2E (5 roles × 3 viewports) | OPEN |
| XLSX Product-path smoke | OPEN (RELEASE CHECK) |
| Decision Pack PDF runtime smoke | OPEN, conditional on the PDF flag |
| Node runtime alignment | **implemented and pushed — pending CI confirmation** |
| Dependency vulnerabilities | CLOSED (CI-confirmed on the previous head; must re-confirm on Node 24) |

## 16. Boundary attestations

PR #172 not merged, closed, approved, queued or auto-merged; no branch protection touched. No code,
test, migration or dependency change. No CI failure remediated — none was observed. No Vercel
configuration or environment variable changed; no manual deploy, no promotion. No Supabase contact —
staging or Production. No Production migration-state query, backup, smoke or deploy. No WP-124 or PX
work. No Living KORAL work. `scripts/provision-next-review.mjs` never addressed by any command.

---

**Report 226 · pushed `cdb1aa6..5f94269` fast-forward · Preview building · PR CI must be read externally**
