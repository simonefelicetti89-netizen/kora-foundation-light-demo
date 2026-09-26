# 253 — KORA · R0-C BLOCKER RECONCILIATION — VERCEL PREVIEW STAGING DESIGNATION

**Date:** 2026-09-22
**Mode:** READ-ONLY INVESTIGATION — NO MIGRATION · NO PRODUCT CHANGE · NO CONFIG CHANGE · NO PRODUCTION ACTION
**Supersedes in part:** report `252` findings **D-1** and **D-3** (report `252` remains valid as the evidence available at that moment and is not erased)
**Outcome:** **OUTCOME C — BINDING UNKNOWN.** R0-C remains **`R0_BLOCKED`**, but the blocker is
**materially narrowed** and is now a bounded configuration question, not an absent environment.

---

## §1 — WHAT DIRECT VERCEL EVIDENCE CHANGES

Report `252` asserted, on repository evidence alone, that *no staging application environment exists*.
Direct Vercel access — unavailable when `252` was written — shows that **Preview deployments of the exact
R0-C candidate SHA already exist and are non-Production**. That assertion is therefore **corrected**.

It does **not** follow that the Preview is usable as staging. Two independent conditions remain unproven.

---

## §2 — EXACT DEPLOYMENT (verified independently)

| Field | Value | Verdict |
|---|---|---|
| Vercel project | `kora-foundation-light-demo` · `prj_eybQKAPKBzP6Jt2oYAOH1BfaBixO` | CONFIRMED |
| Team | `team_mBK3qjnsK52b30CFvwPqzzDi` | CONFIRMED |
| **Deployment id** | **`dpl_9pmqFJD12pvESJhJTZPqR4ekWE1u`** | CONFIRMED |
| Deployment URL | `kora-foundation-light-demo-ek7qxl3vf-simone-felicettis-projects.vercel.app` | CONFIRMED |
| Git ref | `integration/r0a-ci-proof-2026-09-22` | CONFIRMED |
| **`githubCommitSha`** | **`cac13b218ff99c3373f92439994aa4749934a2b1`** | **EXACT MATCH** |
| State | `READY` | CONFIRMED |
| **`target`** | **`null`** → **Preview, non-Production** | CONFIRMED |
| Also latest project deployment | yes — `latestDeployment` on the project is this id | CONFIRMED |

A **second** READY Preview exists at the same SHA: `dpl_7VCZTYdN74byimtMzwEFBL9XoAyC`, ref
`r0/ci-real-db-enforcement-2026-09-22`. Both refs were pushed in report `251`; Vercel built each. No other
SHA or deployment was substituted.

---

## §3 — APPLICATION REACHABILITY — A CORRECTION

The directive records that the Preview *"root responds HTTP 200"*. Measured directly, that **200 is not
served by the KORA application**:

```
GET  <preview>/            → HTTP 200, final URL:
     https://vercel.com/login?next=%2Fsso-api%3Furl%3D…%26nonce%3D…
GET  <preview>/api/health  → Vercel SSO login HTML (not JSON)
```

For contrast, the Production domain serves the real application:

```
GET https://kora-foundation-light-demo.vercel.app/api/health
    → {"status":"ok","service":"kora","database":"reachable","timestamp":"2026-09-22T19:15:08.542Z"}
```

**Cause:** the project sets `ssoProtection: { enabled: true, deploymentType: "all_except_custom_domains" }`.
Every generated Preview URL is behind Vercel Authentication. A browser session already logged into Vercel
sees the app — which is why the 200 looked healthy — but **unauthenticated and automated clients get the
login page**. `curl`, Playwright and any CI runner are blocked.

**Consequence:** the R0-C validation programme (§6–§17 of the R0-C directive: auth, routing, RLS, intake,
Advisor, navigation, golden path, observability, responsive) **cannot execute against this Preview as
currently configured**, independently of the Supabase question below.

---

## §4 — ENVIRONMENT BINDING (§3 of the directive) — THE CRITICAL RESULT

Project environment variables, **metadata only — no value was decrypted, none is printed**:

| VARIABLE NAME | APPLIES TO ENVIRONMENT | BRANCH SCOPE | TARGET PROJECT ID/HOST | MATCHES kora-staging |
|---|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | **preview only** | none (all preview branches) | encrypted — not derivable | **UNKNOWN** |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **preview only** | none | encrypted | **UNKNOWN** |
| `SUPABASE_SERVICE_ROLE_KEY` | **preview only** (`visibility: secret`) | none | encrypted | **UNKNOWN** |
| `NEXT_PUBLIC_SITE_URL` | production + preview | none | n/a | n/a |
| `UPSTASH_REDIS_REST_URL` / `_TOKEN` | production + preview | none | n/a | n/a |
| `SECURITY_RATE_LIMIT_PROVIDER` | production + preview | none | n/a | n/a |

Also established:

- A branch-scoped query for `integration/r0a-ci-proof-2026-09-22` returns **`envs: []`** — there are **no
  branch-specific overrides**. The three Supabase variables apply to **every** Preview branch alike.
- All three were last updated **~2026-09-20**, shortly before this work.
- **`hiddenProductionEnvCount: 0`** and no Supabase variable targets `production` — the project defines
  **no project-level Supabase configuration for Production at all.**

**Binding verdict: UNKNOWN.** The three values are `type: sensitive`, `decrypted: false`. Determining which
Supabase project they address would require decrypting them, which §3 of the directive forbids. The Preview
URL is SSO-protected, so the normally-public `NEXT_PUBLIC_SUPABASE_URL` cannot be read from the served
client bundle either. **No guess is recorded.**

---

## §5 — OUTCOME

**OUTCOME C — BINDING UNKNOWN / INCOMPLETE.** Not Outcome A (binding unproven), and — importantly — **not
Outcome B**: nothing indicates the Preview binds to Production. The Supabase variables are scoped to
`preview` and are *excluded* from `production`, which is the opposite of the Outcome-B hazard.

R0-C therefore **remains `R0_BLOCKED`**, on a narrowed and precisely specified blocker.

---

## §6 — D-4 — RESOLVED BY DIRECT VERCEL EVIDENCE

Report `252` escalated `STATE_MATCH = NO` between report `243` ("Production Branch UNKNOWN") and
`docs/STATUS.md` ("deploys `main` automatically"). Direct evidence settles it.

Every `target: production` deployment is built from `main`:

| Deployment | Ref | SHA | Created |
|---|---|---|---|
| **`dpl_FA5ZVswVisqBi9bYNAD6pATC7y3N`** (current) | **`main`** | **`70c4cfa0dfa36d8697d8f76a3a7df8a5bf530adc`** | PR #171 merge |
| `dpl_Ag6zQMY6cybUs1eFNzVrJGpMSjok` | `main` | `33cb5e039819419beaf98749f7aaccb35ed34a0b` | PR #170 merge |
| `dpl_6iriy1ES2dPmXVCYekRACmSGuHM6` | `main` | `189fe192d6bda171b4938f2d2ba6bbd28d8bb670` | PR #169 merge |

**D-4 RESOLVED: `main` IS auto-deployed to Production.** Current Production runs `70c4cfa0…`, which is
**exactly the current `main`**. `docs/STATUS.md` is **substantively correct** and **stale only in its commit
value** (it records `8210247`). Report `243`'s UNKNOWN is now closed by evidence rather than assumption.

> **Governance consequence — immediate.** Any merge or push to `main` **is a live Production deployment.**
> R0-B's Model B (Production from an immutable RC; `main` fast-forwarded only *after* release) is therefore
> **load-bearing right now**, not a future precaution. Every standing prohibition on touching `main`
> remains correct and is, on this evidence, protecting Production directly.

---

## §7 — DEFECT LEDGER, REVISED

| ID | Revised classification |
|---|---|
| **D-1** | **REVISED — NOT "no environment".** A non-Production Preview of the exact SHA exists and is READY. It is **not yet designatable as staging**: backend binding unverified (§4) and application unreachable to automation (§3). Class **C → B (deployment/configuration)**. Severity **BLOCKER**. Owner: **Founder**. |
| **D-2** | **UNCHANGED — OPEN.** Staging Supabase `haqflkurpmeaxpikozjl` is 10 migrations behind (001–080 applied; **081–090 not applied**). **Not applied in this task**, per directive §6 and §9. Owner: Founder sequencing. |
| **D-3** | **RESOLVED / RECLASSIFIED.** Deployment capability **does exist** — Git-triggered Preview deployments build every pushed branch automatically, already at the exact candidate SHA, with no manual step and no Production risk. The earlier finding reflected absent tooling *in the execution context*, not absent capability. |
| **D-4** | **RESOLVED.** `main` auto-deploys Production; current Production = `70c4cfa0…` = current `main`. `docs/STATUS.md` stale only in its commit value. See §6. |
| **D-5** | **NEW — Preview deployments are SSO-protected.** `ssoProtection.enabled = true`, `all_except_custom_domains`. Blocks `curl`, Playwright and CI from reaching the Preview. Class **B**, severity **BLOCKER for automated validation**, owner **Founder**. |
| **D-6** | **NEW — Production defines no project-level Supabase variables** (`hiddenProductionEnvCount: 0`; no Supabase key targets `production`), yet Production `/api/health` reports `database: reachable`. Production's backend binding is therefore supplied by something outside project-level configuration (e.g. team-level shared variables) and is **unexplained by the evidence gathered here**. Class **B**, severity **MEDIUM — clarify before any Production-adjacent decision**, owner **Founder**. Not investigated further: inspecting it is not needed for R0-C and edges toward Production configuration. |
| **D-7** | **NEW — Vercel Custom Environments unavailable.** `list_project_custom_environments` → `environments: []`, `accountLimit.total: 0`. A named "staging" Custom Environment **cannot** be created on the current plan. The branch-scoped Preview model in directive §5 is therefore the only available architecture, not merely the preferred one. Class **B**, severity **INFORMATIONAL**, owner **Founder**. |

---

## §8 — PROPOSED CONFIGURATION CHANGES (returned for authorization — NOT executed)

Smallest safe architecture, per directive §5. **No Vercel configuration was modified.**

1. **Confirm the Supabase binding** — closes D-1/§4.
   *Founder action, not agent action:* read `NEXT_PUBLIC_SUPABASE_URL` (Preview scope) in the Vercel
   dashboard and confirm the host is `haqflkurpmeaxpikozjl.supabase.co`. Record the result canonically.
   **If it is not kora-staging, STOP** — that becomes an Outcome-B-class finding.

2. **Branch-scope the Supabase Preview variables** — recommended hardening.
   Today all three apply to **every** Preview branch, so any pushed branch reaches the same backend. Scoping
   them to the designated staging branch (`gitBranch = integration/r0a-ci-proof-2026-09-22`, or a durable
   successor) confines staging-DB access to the designated ref. *Proposed, not applied.*

3. **Enable Protection Bypass for Automation** — closes D-5.
   Required for Playwright/CI to reach the Preview. The generated bypass secret must be treated as a
   credential: stored in CI secrets, never in the repository, never printed. Alternative: attach a custom
   domain to the staging deployment, which `all_except_custom_domains` already exempts from SSO.

4. **Then, and only then, align the staging database** — closes D-2.
   Authorize migrations **081–090** against `haqflkurpmeaxpikozjl` **together with** the designated staging
   deployment, as one coordinated alignment, per directive §6.

---

## §9 — R0-C STATE

| Item | State |
|---|---|
| R0-A | `R0_COMPLETE` |
| R0-B | `R0_COMPLETE` |
| **R0-C** | **`R0_BLOCKED`** — unchanged state, **narrowed blocker** |
| R0-D | `R0_OPEN` |
| R0-C remote-CI precondition | **SATISFIED** |

**Blocker, restated precisely:** a non-Production Preview of `cac13b218…` exists and is READY, but it
**cannot yet be designated canonical staging** because (a) its Supabase binding is unverified — the values
are encrypted and decryption is forbidden — and (b) Vercel SSO protection makes it unreachable to automated
validation. Both are bounded configuration items with named owners, not missing infrastructure.

**Controlled Pilot Gate: BLOCKED**, unchanged — independently blocked by **WP-132 NOT COMPLETE** regardless
of R0-C.

---

## §10 — CONFIRMATIONS

No migration applied (081–090 untouched) · no Product code changed · no commit · no PR/merge · **no
Production deploy, promotion, rollback, database contact or configuration change** · no `main` update · no
Vercel environment variable created, modified or deleted · no Vercel project or Custom Environment created ·
no other SHA deployed · no Preview promoted · no Gate 3 integration · no scope trigger activated · **no
secret value decrypted, read or printed** · `integration/r0a-ci-proof-2026-09-22` retained ·
`scripts/provision-next-review.mjs` never addressed. Report `252` preserved unaltered.

---

## §11 — RECOMMENDATION

**STAGING CONFIGURATION REQUIRED.**

Not "blocked with no path" and not yet "ready to authorize". Three bounded Founder actions — confirm the
Preview's Supabase binding, branch-scope those variables, enable an automation bypass — convert this
Preview into canonical KORA staging. The staging DB alignment (081–090) then follows as one coordinated
step, after which R0-C derives back to `R0_OPEN` and can be executed against a fully reachable,
correctly-bound, exactly-SHA-traceable staging application.
