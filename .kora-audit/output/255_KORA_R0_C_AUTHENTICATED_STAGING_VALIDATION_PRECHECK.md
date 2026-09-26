# 255 — KORA · R0-C AUTHENTICATED STAGING VALIDATION — READ-ONLY PRE-CHECK

**Date:** 2026-09-22
**Mode:** READ-ONLY PRE-CHECK — **STOPPED AT §9 STOP CONDITION**
**Predecessors:** `252` · `253` · `254`
**Outcome:** **R0-C BLOCKED.** Authenticated staging validation was **not executed**: the required
credentials and the rotated automation bypass are **absent from the execution environment**.

Nothing was run, mutated, provisioned or patched. No Production contact. No `main` operation.
No migration. No Product-code change. No fixture provisioning.

---

## §1 — PRE-CHECK RESULTS (all read-only)

| Check | Result | Evidence |
|---|---|---|
| Worktree branch | `r0/ci-real-db-enforcement-2026-09-22` | `git rev-parse --abbrev-ref HEAD` |
| **HEAD SHA** | **`cac13b218ff99c3373f92439994aa4749934a2b1`** — EXACT MATCH | `git rev-parse HEAD` |
| Worktree clean | **YES** — 0 changes, including untracked | `git status --porcelain -uall` |
| Deployment id | `dpl_CoWkGSNqQhJA7vgmUDDrqpqVjUNG` | Vercel API |
| Deployment URL | `kora-foundation-light-demo-l44x9aydq-simone-felicettis-projects.vercel.app` | Vercel API |
| Deployment git ref | `integration/r0a-ci-proof-2026-09-22` | `meta.githubCommitRef` |
| **Deployment SHA** | **`cac13b218ff99c3373f92439994aa4749934a2b1`** — EXACT MATCH | `meta.githubCommitSha` |
| Deployment state | `READY` | `readyState` |
| **Preview, not Production** | **CONFIRMED — `target: null`** | Vercel API |
| Deployment source | `redeploy` — consistent with the branch-scoped staging env rebuild | `source` |
| Region | `iad1` | Vercel API |

All §1 canonical identities verified. No substitution of SHA, ref, deployment or environment.

---

## §2 — CANONICAL TEST CONTRACT (read from source at the validated SHA)

The infrastructure needed already exists — **no Product-code change is required** to pass the bypass
header, which directly satisfies directive §8.3.

**`tests/e2e/helpers/vercel-bypass.ts`** (KORA-WP-088) — already implements the officially supported
mechanism, and does so more safely than a config-level header:

- reads `VERCEL_AUTOMATION_BYPASS_SECRET` from `process.env` only — never hardcoded, never written to disk;
- installs a **per-page route handler**, deliberately *not* `use.extraHTTPHeaders`, because the latter
  would attach the secret to **every** request including third-party hosts (e.g. `fonts.googleapis.com`).
  The handler attaches `x-vercel-protection-bypass` and `x-vercel-set-bypass-cookie: true` **only** to
  requests whose host equals the host of `E2E_BASE_URL`;
- exposes `hasProtectionBypass()` — **presence only**, never the value;
- when the secret is absent, **no bypass is attempted at all**;
- bypasses only Vercel's deployment-access gate — never KORA auth, RLS or role resolution; every test still
  logs in through the real `/login` form.

**`tests/e2e/helpers/e2e-safety.ts`** (B174-A3c) — the target allowlist that runs first:

- `KNOWN_PRODUCTION_HOSTNAMES = ['kora-foundation-light-demo.vercel.app']` — **blocked by default**;
- `E2E_ALLOW_PRODUCTION=true` alone is **never sufficient**; unblocking Production additionally requires
  `E2E_CONFIRM_PRODUCTION_AUTH_E2E_I_UNDERSTAND=true`, which this repo sets nowhere;
- **the repo hardcodes no "known-safe" staging hostname — the operator must name one** via
  `E2E_ALLOWED_STAGING_HOSTS`.

The Preview host is **not** the production hostname, so it needs only to be named in
`E2E_ALLOWED_STAGING_HOSTS`. **Neither production override must be set**, and neither will be.

---

## §3 — THE BLOCKER (directive §9)

Every required variable is **absent** from the execution environment. Checked by presence only; **no value
was read, printed or inferred**:

| Variable | State | Kind |
|---|---|---|
| `VERCEL_AUTOMATION_BYPASS_SECRET` | **NOT SET** | secret (rotated) |
| `E2E_KORA_ADMIN_EMAIL` / `_PASSWORD` | **NOT SET** | credential |
| `E2E_COMPANY_A_EMAIL` / `_PASSWORD` | **NOT SET** | credential |
| `E2E_COMPANY_B_EMAIL` / `_PASSWORD` | **NOT SET** | credential |
| `E2E_BASE_URL` | **NOT SET** | non-secret config |
| `E2E_ALLOWED_STAGING_HOSTS` | **NOT SET** | non-secret config |

No secure local source exists either: `~/.kora-vercel-bypass`, `~/.kora-staging-e2e.env` and
`~/.kora-e2e.env` are all absent, and the repo holds only `.env.e2e-local-golden-path.local` (local Docker
golden-path fixtures, unrelated to staging) and the tracked `.env.local.example`. The `.env.e2e.local`
referenced historically in `e2e-safety.ts`'s header does **not** exist here.

**Shell state does not persist between tool invocations in this environment** — an `export` in an
interactive shell does not reach the test process. The values must be supplied by a mechanism that survives
into the run.

Consequence: `authenticated-smoke.spec.ts` and `two-tenant-isolation.spec.ts` would **skip cleanly**
(by design — missing credentials resolve to `null` and callers skip, never throw), and the target guard
would block the Preview host regardless. A run now would produce **zero authenticated evidence** while
appearing green. Per directive §10 that must not be reported as R0-C COMPLETE.

---

## §4 — EVIDENCE TABLE

| CHECK | RESULT | EVIDENCE | CLASSIFICATION |
|---|---|---|---|
| Exact Product SHA in worktree | **PASS** | `cac13b218…`, clean tree | — |
| Fresh Preview deployment exists | **PASS** | `dpl_CoWkGSNqQhJA7vgmUDDrqpqVjUNG`, READY | — |
| Deployment SHA = candidate | **PASS** | `meta.githubCommitSha` exact | — |
| Deployment is Preview, not Production | **PASS** | `target: null` | — |
| Bypass wiring exists without Product change | **PASS** | `helpers/vercel-bypass.ts` | — |
| Staging target allowlist contract understood | **PASS** | `helpers/e2e-safety.ts` | — |
| Automation bypass secret available | **BLOCKED** | env presence check | STAGING CONFIG DEFECT (execution env) |
| E2E credentials available | **BLOCKED** | env presence check | STAGING CONFIG DEFECT (execution env) |
| A. Authenticated browser journeys | **NOT EXERCISED** | blocked by §3 | — |
| B. Staging Playwright vs real Preview | **NOT EXERCISED** | blocked by §3 | — |
| C. Role/persona route enforcement (browser) | **NOT EXERCISED** | blocked by §3 | — |
| D. Two-tenant separation (browser path) | **NOT EXERCISED** | blocked by §3 | — |
| E. Admin critical routes/navigation (browser) | **NOT EXERCISED** | blocked by §3 | — |
| F. Company workspace | **NOT EXERCISED** | blocked by §3 | — |
| G. Worker workspace / privacy boundaries | **NOT EXERCISED** | blocked by §3 | — |
| H. Advisor workspace | **NOT EXERCISED** | blocked by §3 | — |
| I. Partner surface | **NOT EXERCISED** | blocked by §3 | — |
| J. Data Intake / Saved Mappings | **NOT EXERCISED** | blocked by §3 | — |
| K. Living KORAL surfaces | **NOT EXERCISED** | blocked by §3 | — |
| L. Observability / runtime-log review | **NOT EXERCISED** | no run to observe | — |
| M. Responsive viewport validation | **NOT EXERCISED** | blocked by §3 | — |
| N. Methodology snapshot runtime evidence | **NOT EXERCISED** | no calculation exercised | — |

Previously-established PASSes from §4 of the directive (binding, health, DB connectivity, migrations
through 090, RLS probes, Saved Mapping authorization, Admin navigation, Advisor route guards) are **carried
forward unchanged and are not reclassified as unknown**.

---

## §5 — WHAT WAS NOT DONE

No Playwright run · no fixture provisioning or cleanup (`scripts/e2e/provision-staging-e2e-fixtures.ts`
**not invoked**) · no staging data mutation · no migration · no schema change · no Product-code
modification · no secret read, printed or echoed · no `curl -v` · no query-parameter bypass · no SSO change ·
no Production contact · no `main` push/merge · no PR · no Gate 3 work · frozen RC untouched ·
`scripts/provision-next-review.mjs` never addressed.

---

## §6 — EXACT REQUIREMENT TO UNBLOCK

The run needs these in the **test process environment**. Non-secret values are given in full; secrets are
named only.

Non-secret:
```
E2E_BASE_URL=https://kora-foundation-light-demo-l44x9aydq-simone-felicettis-projects.vercel.app
E2E_ALLOWED_STAGING_HOSTS=kora-foundation-light-demo-l44x9aydq-simone-felicettis-projects.vercel.app
```

Secret — values never to appear in chat, reports, command output or the repo:
```
VERCEL_AUTOMATION_BYPASS_SECRET     (the ROTATED secret; the pre-rotation value must not be reused)
E2E_KORA_ADMIN_EMAIL / E2E_KORA_ADMIN_PASSWORD
E2E_COMPANY_A_EMAIL / E2E_COMPANY_A_PASSWORD
E2E_COMPANY_B_EMAIL / E2E_COMPANY_B_PASSWORD
```

Optional, to widen the matrix later: `E2E_COMPANY_A_TENANT_CODE`, `E2E_COMPANY_B_TENANT_CODE`,
`E2E_WORKER_*`, `E2E_ADVISOR_*`, `E2E_PARTNER_*`.

**Must NOT be set:** `E2E_ALLOW_PRODUCTION`, `E2E_CONFIRM_PRODUCTION_AUTH_E2E_I_UNDERSTAND`,
`E2E_GOLDEN_DATA_BEARING_ALLOW_RUN` (the last is a mutating tier and is out of scope for this pass).

**Delivery mechanism:** a `600`-permission env file outside the repository, sourced inside the run command
(`set -a; . <file>; set +a`) so no value is ever echoed. Interactive `export` does not survive into the
test process here.

**Planned first invocation, once supplied** (smallest meaningful suite, per directive §8.4):
```
npx playwright test tests/e2e/authenticated-smoke.spec.ts tests/e2e/two-tenant-isolation.spec.ts
```
then, only if green, incremental expansion to the broader matrix with a runtime-log review after each phase.

---

## §7 — STATUS

**R0-C BLOCKED.**

**Exact reason:** the rotated `VERCEL_AUTOMATION_BYPASS_SECRET` and all six `E2E_*` staging credentials are
absent from the execution environment, and no authorized secure local source exists. Directive §9 requires
STOP on both counts. Running now would skip every authenticated case while reporting success — the one
outcome directive §10 forbids.

**No defect was found**, because no authenticated validation was executed. Nothing is reclassified;
previously-proven checks stand.
