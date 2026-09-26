# 252 — KORA · R0-C INTEGRATED STAGING VALIDATION

**Date:** 2026-09-22
**Mode:** AUTHORIZED EXECUTION — STAGING ONLY · NO PRODUCTION · NO MAIN MERGE
**Predecessors:** `243` (R0-B deploy line) · `245` (R0-A) · `251` (full-green CI proof)
**Outcome:** **R0-C BLOCKED — VALIDATION NOT EXECUTABLE.**
**No staging application environment exists to deploy the staging candidate to.**

No Product code changed · no commit · no PR · no merge · no Production contact ·
no Gate 3 integration · no migration applied.

---

## §1 — STAGING CANDIDATE (fixed, not substituted)

`cac13b218ff99c3373f92439994aa4749934a2b1` — worktree clean, `HEAD` exact,
0 tracked changes throughout. Lineage `3a383072` → `ec0ff454` → `d578c1d0` → `cac13b2`.
Remote-CI precondition SATISFIED (run `35770205003`, report `251`).

---

## §2 — PRE-DEPLOYMENT READ-ONLY VERIFICATION (executed)

| Check | Result |
|---|---|
| R0-A remote proof full green | **YES** — run `35770205003`, conclusion `success`, 4/4 jobs |
| Staging candidate SHA fixed | **YES** — `cac13b218…` |
| Worktree / branch clean | **YES** — 0 changes, HEAD exact |
| Migration numbering integrity | **PASS** — 83 files, **no duplicate numbers**; 7 unused numbers in range (29, 37, 38, 40, 41, 43, 44) are gaps, not collisions |
| Exactly one Product migration numbered 090 | **YES** — `090_saved_column_mapping_tenant_scoped.sql` (WP-066) is the only `090` |
| Gate 3 migration integrated? | **NO** — no Gate 3 `090` present; Gate 3 not integrated |
| Staging Supabase project identity | **`haqflkurpmeaxpikozjl` — "kora-staging"**, eu-west-1, `ACTIVE_HEALTHY`, Postgres 17.6.1.127 |
| Other project visible | `azdnepfmwrmacruykskm` — "kora-live-v1-test", eu-central-1 (**not touched**) |
| Staging DB migration state | **73 of 83 applied — migrations 081–090 NOT applied** (see §4) |
| Staging application deployment state | **NO STAGING APPLICATION ENVIRONMENT EXISTS** (see §3) |
| Production | **UNTOUCHED** — not contacted |

Staging Supabase was read via the CLI's own authenticated session (`supabase link`
→ `migration list --linked` → `supabase unlink`, restoring the pre-task state).
**No credential was sourced from any repository `.env` file.** No DB password was
required or requested; no direct SQL was executed.

---

## §3 — THE BLOCKER: THERE IS NO STAGING APPLICATION ENVIRONMENT

R0-C requires deploying `cac13b2` to a **real staging environment** and validating
it there. That environment does not exist. Three independent repository sources,
read at the tested SHA, agree:

1. **`docs/E2E_TESTING.md:206`** (note dated 2026-09-12) — the previously documented
   staging URL `kora-staging.vercel.app` "è risultato stale — punta oggi a
   un'applicazione di terze parti non correlata, non a questo repository."

2. **`docs/PILOT_TRUST_04_WORKER_TENANT_SUSPENSION_REPORT.md:78`** — "nessun URL
   applicativo staging affidabile è risultato raggiungibile"; the workaround used in
   that sprint was pointing a **local** dev server at staging Supabase, not a
   deployed staging app.

3. **`docs/STATUS.md`** — "Vercel project `kora-foundation-light-demo` deploys
   `main` automatically; **Production** is confirmed running commit `8210247`."
   `kora-foundation-light-demo.vercel.app` is therefore **Production**, not staging.

**Consequence:** the only reachable deployed application for this repository is
Production. Deploying the staging candidate to it would be a **Production
deployment**, absolutely forbidden by this task's §24. There is no staging target.

**Deployment mechanism — none available:**

| Artifact / capability | State |
|---|---|
| `vercel.json` / `vercel.ts` / `.vercelignore` / `.vercel/` | **ABSENT** (as report `243` §27 recorded) |
| Vercel CLI | **NOT INSTALLED** |
| `gh` CLI | **NOT INSTALLED** |
| Deploy job in `.github/workflows/**` | **NONE** — `ci.yml`, `kora-link-live-staging.yml`, `security.yml` only |
| Vercel MCP access (even read-only `list_projects`) | **DENIED** by the environment's own safety classifier, reason `Production Deploy` |
| `package.json` deploy script | **NONE** |

Per `docs/DEPLOY_CHECKLIST.md`, KORA deploys are **manual and human-authorized**.
§4 of this task states: *"If the current platform deployment source cannot target
the exact SHA without changing a protected release configuration: STOP and report."*
That condition is met. **STOP was the correct and required action.**

---

## §4 — STAGING DATABASE STATE (read, not modified)

`supabase migration list --linked` against `haqflkurpmeaxpikozjl`:

| Metric | Value |
|---|---|
| Local migration files | **83** |
| Applied on staging | **73** (001–080, contiguous with local) |
| **NOT applied on staging** | **10 — migrations 081, 082, 083, 084, 085, 086, 087, 088, 089, 090** |

**Staging is ten migrations behind the staging candidate**, including WP-066's
`090_saved_column_mapping_tenant_scoped.sql`. The WP-066 saved-column-mapping
objects therefore **cannot** be present on staging.

**Migrations were deliberately NOT applied.** Applying 081–090 was within this
task's §3 authorization, but was withheld on judgment and is escalated instead:

- the application deployment leg is blocked, so applying them validates nothing;
- it would leave the staging DB **ahead of every running application**, including
  the local-dev-server-against-staging workflow the team documents in
  `docs/E2E_TESTING.md` §9 (`.env.local` points the dev server at `haqf****`);
- ten migrations against a shared live database is hard to reverse.

This is a **Founder sequencing decision**, not an implementation detail.

---

## §5 — VALIDATION MATRIX

| Area | Test | Expected | Actual | Result | Evidence | Owner if failed |
|---|---|---|---|---|---|---|
| Deployment | Deploy `cac13b2` to staging | Deployed, SHA recorded | No staging environment exists; no deploy mechanism; Vercel denied | **BLOCKED** | §3 | Founder / infrastructure |
| Migrations (before) | Read staging migration history | Known state | 73/83 applied; 081–090 absent | **OBSERVED** | §4 | Founder sequencing |
| Migrations (after) | Post-deploy migration state | Applied | Not executed — no deployment | **NOT EXECUTED** | §3 | — |
| Migration integrity | No duplicate numbers; one `090`; no Gate 3 `090` | Clean | Clean | **PASS** | §2 | — |
| Health | `/api/health` on staging | 200, db reachable | No staging URL to call | **NOT EXECUTED** | §3 | — |
| Auth (all personas) | Login / session / tenant / landing | Pass per persona | Not executed | **NOT EXECUTED** | §3 | — |
| Logout | Post-logout boundary | Redirect to login | Not executed | **NOT EXECUTED** | §3 | — |
| Persona routing / isolation | Cross-role denial | Fail closed | Not executed | **NOT EXECUTED** | §3 | — |
| RLS / tenant isolation (live) | A cannot read B | Fail closed | Not executed | **NOT EXECUTED** | §3 | — |
| Company data intake | Intake path works | Works | Not executed | **NOT EXECUTED** | §3 | — |
| Legacy upload contradiction | `/company/data/upload` + `/api/company/data-ingest` | Observe only | Not executed | **NOT EXECUTED** | §3 | WP-132 (remains open) |
| Saved mappings (WP-066) | Present and tenant-owned | Present | **Cannot be present** — migration 090 not applied to staging | **NOT EXECUTED** | §4 | Founder sequencing |
| Advisor portal (WP-064) | Assignment scoping, no leak | Pass | Not executed | **NOT EXECUTED** | §3 | — |
| Navigation / dead routes | No 404/500/loops | Pass | Not executed | **NOT EXECUTED** | §3 | — |
| Playwright golden path (staging) | 4 personas green | Pass | Not executed — no staging base URL | **NOT EXECUTED** | §3 | — |
| Observability | Failures diagnosable | Verified | Not executed | **NOT EXECUTED** | §3 | — |
| Responsive sanity | Desktop + mobile, 4 personas | Pass | Not executed | **NOT EXECUTED** | §3 | — |
| Methodology disclosure | `pre_empirical_calibration` shown truthfully | Verified on staging | Not executed on a deployed environment | **NOT EXECUTED** | §3 | — |
| Admin primary routes | No pilot-critical dead route | Classified A/B/C | Not executed | **NOT EXECUTED** | §3 | — |

**Nothing is summarised away:** every unexecuted row is unexecuted for the single
reason in §3, and none is reported as passing.

---

## §6 — DEFECTS AND CLASSIFICATION

### D-1 — No staging application environment exists
**Class: A — STAGING ENVIRONMENT DEFECT.** Severity **BLOCKER**. Affected personas:
all. Pilot impact: **R0-C cannot be executed; Controlled Pilot Gate cannot advance
via R0-C.** Owner: **Founder / infrastructure**. Next action: provision a staging
application environment (a Vercel environment or project distinct from Production,
bound to a non-`main` ref and targetable at an exact SHA), or designate an existing
one and record it canonically.

### D-2 — Staging database is 10 migrations behind (081–090 unapplied)
**Class: B — DEPLOYMENT/CONFIGURATION DEFECT.** Severity **HIGH**. Pilot impact:
any staging validation before this is closed would test a schema that is not the
candidate's. Owner: **Founder sequencing / release governance**. Next action:
authorize applying 081–090 to staging **together with** the matching application
deployment, not before it.

### D-3 — Deploy capability absent from this execution context
**Class: B — DEPLOYMENT/CONFIGURATION DEFECT.** Severity **BLOCKER (for automation)**.
No Vercel CLI, no `gh`, no deploy workflow, and Vercel MCP denied by the safety
classifier. Owner: **Founder**. Next action: perform the staging deployment manually
per `docs/DEPLOY_CHECKLIST.md`, or grant a scoped, staging-only deploy path.

### D-4 — `STATE_MATCH = NO`: `docs/STATUS.md` contradicts report `243`'s carried UNKNOWN
**Class: F — TEST/EVIDENCE DEFECT (governance evidence).** Severity **HIGH —
governance**. Report `243` (R0-B, Founder-approved) records Vercel's Production
Branch binding as **"UNKNOWN from repository evidence"** and carries it as a named
precondition on the first `main` synchronization. **`docs/STATUS.md` states plainly
that the Vercel project "deploys `main` automatically."** These cannot both be
current. Per CLAUDE.md §18 this is **not reconciled here**: reported, not resolved.
Owner: **Founder**. Next action: confirm against Vercel directly which is true. If
`main` does auto-deploy Production, then **`main` is a live Production trigger** and
R0-B's Model B safeguards become load-bearing immediately.

Note: `docs/STATUS.md` also records Production running commit `8210247`, while
`main` is currently `70c4cfa0…` — so that document is stale in at least one respect,
which is itself why D-4 must be resolved against Vercel and not against the docs.

**No defect was fixed. No remediation commit was created.**

---

## §7 — R0-C STATE (derived, not assigned)

R0-C's acceptance is *"the integrated Product validated on staging"*, and its
required evidence is *"a staging validation run with per-domain results and the
exact SHA validated."* Neither can be produced: there is no staging environment.

Per §20 — *"if a critical Product/environment failure makes staging unusable or
invalidates validation: R0-C remains `R0_OPEN` or `R0_BLOCKED` according to the R0
rules"* — and per the registry's rule that **states are derived, not assigned**,
R0-C now carries a newly discovered unmet precondition:

> **R0-C: `R0_OPEN` → `R0_BLOCKED`** (2026-09-22, report `252`)
> **Blocker:** no staging application environment exists (D-1); staging DB 10
> migrations behind (D-2); no deploy capability in this context (D-3).
> **Unblocks when:** a staging application environment exists and is canonically
> designated. `R0-B` and the remote-CI precondition both remain SATISFIED — this
> blocker is environmental, not a governance regression.

| Item | State |
|---|---|
| R0-A | `R0_COMPLETE` |
| R0-B | `R0_COMPLETE` |
| **R0-C** | **`R0_BLOCKED`** (was `R0_OPEN`) |
| R0-D | `R0_OPEN` |
| R0-C remote-CI precondition | **SATISFIED** (unchanged) |

---

## §8 — CONTROLLED PILOT GATE RE-EVALUATION

| Condition | Status |
|---|---|
| R0-A | **SATISFIED** |
| R0-B | **SATISFIED** |
| R0-C | **NOT SATISFIED** — `R0_BLOCKED` (D-1) |
| WP-132 | **NOT COMPLETE** — independent blocker, unchanged |
| Methodology disclosure verified | **NOT VERIFIED** — requires a deployed environment |
| No pilot-critical dead Admin route | **NOT VERIFIED** — requires a deployed environment |

**CONTROLLED PILOT GATE: BLOCKED.** Blocked independently by WP-132 regardless of
R0-C, exactly as §21 requires. No condition was marked satisfied on absent evidence.

---

## §9 — CONFIRMATIONS

No Product code changed · no commit · no staging deployment · no migration applied ·
no PR · no merge · no Production deploy, database contact or configuration change ·
no `main` update · no release candidate created · no Gate 3 integration · no
migration renumbering · no scope trigger activated · WP-068 / WP-132 / R0-D / PX-C /
WP-134 / WP-135 not started · WP-019 / WP-117 / WP-120 / WP-069 / Registry 102 /
Registry 142 / `CLAUDE.md` unmodified · `integration/r0a-ci-proof-2026-09-22`
retained · `scripts/provision-next-review.mjs` never addressed.

Staging contact was limited to: `supabase projects list`, `supabase link`,
`supabase migration list --linked`, `supabase unlink`. Read-only; local link state
restored. `kora-live-v1-test` was never contacted.

---

## §10 — RECOMMENDATION

**R0-C BLOCKED.** Exact reason: **no staging application environment exists to
deploy `cac13b218ff99c3373f92439994aa4749934a2b1` to; the only reachable deployed
application for this repository is Production, which this authorization forbids.**

Founder decisions required, in order:

1. **Resolve D-4 first** — confirm directly whether Vercel auto-deploys `main` to
   Production. This governs whether `main` is a live Production trigger.
2. **Provision or designate a staging application environment** and record it
   canonically (project/environment, URL, ref binding, how an exact SHA is targeted).
3. **Authorize migrations 081–090 on staging together with** the matching
   application deployment.
4. **Re-run R0-C** once 2 and 3 hold; R0-C returns to `R0_OPEN` automatically by
   derivation at that point.
