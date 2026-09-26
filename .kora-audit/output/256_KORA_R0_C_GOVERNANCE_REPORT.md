# 256 — KORA R0-C Integrated Staging Validation — Governance Report

**Date:** 2026-09-23 · **Amended:** 2026-09-23 (exact-SHA staging evidence)
**Mode:** EVIDENCE RECORD — no commit, push, deploy or infrastructure change is authorized by this document.

---

## §0 — AMENDMENT NOTICE AND CHRONOLOGY

This report was first written when the R0-C remediation existed **only as a local
commit**. It has since been amended with exact-SHA staging evidence. **Nothing from the
first draft is deleted** — superseded statements are marked as historical and the
sequence below is the authoritative chronology.

| # | Event | Evidence |
|---|---|---|
| 1 | The deployment initially validated was **`cac13b218ff99c3373f92439994aa4749934a2b1`** (`dpl_CoWkGSNqQhJA7vgmUDDrqpqVjUNG`) | first draft, §2-historical |
| 2 | The R0-C remediation was created as a **local commit `1e981f8067c388fc14ed3ea44f650cf2cf763a39`**, unpushed | §9 |
| 3 | That commit was pushed **only** to the authorized proof ref `integration/r0a-ci-proof-2026-09-22` | §1 |
| 4 | **GitHub CI became fully green on the exact SHA** — run `35792197186`, 4/4 jobs | §1-bis |
| 5 | **Vercel created a new exact-SHA Preview** — `dpl_2uAjmF5wWrqbvPTuzzsGJPsQWETt`, READY | §2 |
| 6 | **Phase 1, Phase 2 and the Admin dead-route runtime validation were re-run against that new deployment** | §5, §6, §6-bis |

---

## §1 — R0-C IDENTITY

| Field | Value |
|---|---|
| Canonical Product integration base | `3a383072b96290b44620566a242d22f0cc23b01a` |
| R0-A proven remote-CI SHA | `cac13b218ff99c3373f92439994aa4749934a2b1` |
| **R0-C remediation commit** | **`1e981f8067c388fc14ed3ea44f650cf2cf763a39`** |
| Parent of that commit | `cac13b218ff99c3373f92439994aa4749934a2b1` |
| Commit message | `fix(r0-c): harden staging validation and repair admin dead routes` |
| Local branch | `r0/ci-real-db-enforcement-2026-09-22` |
| Local worktree | **CLEAN** |

> **HISTORICAL (first draft, superseded):** *"LOCAL R0-C COMMIT EXISTS BUT IS NOT PUSHED
> AND NOT DEPLOYED."* That was accurate when written and is preserved as the record of
> that moment.

**CURRENT STATE — the commit is published.** It was pushed **exclusively** to:

```
refs/heads/integration/r0a-ci-proof-2026-09-22
```

**Fast-forward**, no force push:
`cac13b218ff99c3373f92439994aa4749934a2b1` → `1e981f8067c388fc14ed3ea44f650cf2cf763a39`

**Deliberately NOT updated:** `r0/ci-real-db-enforcement-2026-09-22` remains at
`cac13b218…`. The safety branch and the proof ref have therefore **diverged**, by
instruction — this is recorded, not corrected.

**Protected refs, unchanged:**

| Ref | SHA |
|---|---|
| `main` | `70c4cfa0dfa36d8697d8f76a3a7df8a5bf530adc` |
| `release/kora-rc-2026-09-20` | `5f9426974791b6e2ff292aa7634860c4666bd91a` |
| `refs/pull/172/head` | `5f9426974791b6e2ff292aa7634860c4666bd91a` |
| `integration/kora-canonical-product-2026-09-22` | `3a383072b96290b44620566a242d22f0cc23b01a` |

Production and `main` were not touched.

---

## §1-bis — EXACT-SHA REMOTE CI EVIDENCE

| Field | Value |
|---|---|
| Workflow | **KORA CI** |
| Run | **`35792197186`** — run number **325**, attempt **1** |
| Event / ref | `push` · `integration/r0a-ci-proof-2026-09-22` |
| **Exact head SHA** | **`1e981f8067c388fc14ed3ea44f650cf2cf763a39`** |
| Final state | **`completed` / `success`** |
| Duration | **193 s** |

| # | Job | Result |
|---|---|---|
| 1 | TypeScript, tests, build, lint (blocking) | **SUCCESS** |
| 2 | DB-backed gate — RLS-03/05/06 + KORA Link behavioral | **SUCCESS** |
| 3 | E2E golden path — Playwright + local Supabase + seeded data | **SUCCESS** |
| 4 | E2E smoke — public pages | **SUCCESS** |

**4/4 jobs SUCCESS · 59 steps inspected · 0 non-success steps.**

> **EXACT-SHA REMOTE CI: PASS**

---

## §2 — DEPLOYMENT UNDER TEST

### §2.1 — AUTHORITATIVE exact-SHA Preview (current)

| Field | Value |
|---|---|
| **Deployment ID** | **`dpl_2uAjmF5wWrqbvPTuzzsGJPsQWETt`** |
| URL | `https://kora-foundation-light-demo-hxsk8cf70-simone-felicettis-projects.vercel.app` |
| Target | **Preview** — `target = null`, **NOT Production** |
| Git ref | `integration/r0a-ci-proof-2026-09-22` |
| **Exact git SHA** | **`1e981f8067c388fc14ed3ea44f650cf2cf763a39`** |
| State | **`READY`** |
| Source | `git` |
| Region | `iad1` |
| Build duration | ≈ 1 m 32 s |

> **EXACT-SHA STAGING CANDIDATE: READY**

### §2.2 — Previous deployment (historical, superseded)

| Field | Value |
|---|---|
| Deployment ID | `dpl_CoWkGSNqQhJA7vgmUDDrqpqVjUNG` |
| Preview URL | `https://kora-foundation-light-demo-l44x9aydq-simone-felicettis-projects.vercel.app` |
| Target | Preview (non-Production) |
| Exact deployed SHA | `cac13b218ff99c3373f92439994aa4749934a2b1` |
| State | `READY` |

This deployment **does not contain** `1e981f80…`. It remains part of the record and is
the deployment behind every result marked *pre-amendment* below, but it is **no longer
the authoritative exact-SHA candidate** for the concluding phase of R0-C.

---

## §3 — STAGING DATABASE STATE

Supabase staging project: **`haqflkurpmeaxpikozjl`**.
Production project `azdnepfmwrmacruykskm` was **not queried and not modified** at any
point during R0-C.

Product migrations **081–090** were explicitly Founder-authorized for staging only and
were applied. Stated precisely:

> **All 83 Product migration files expected by this lineage are represented, Product
> high-water `090`, with `081–090` now present.**

This wording is deliberate: integer numbering gaps pre-exist in the lineage (29, 37, 38,
40, 41, 43, 44 are unused), so no claim is made that every integer 001–090 exists.

**Structural evidence recorded for:**

- `gov.living_koral_material_change`
- `gov.living_koral_transformation_ledger`
- `analytics.living_koral_state`
- `analytics.fn_company_living_koral_source_initiative(uuid)`
- `analytics.living_koral_edition`
- `analytics.fn_create_living_koral_edition(text)`
- `advisor.advisor_content_record` — `linked_object_id`
- `gov.uq_living_koral_material_change_transition`
- `analytics.observed_investment_fact` — `source_attributes`
- `analytics.saved_column_mapping`

**Disclosure — migration history metadata.** The migration-history rows for the
MCP-applied `081–090` were **normalized to canonical version identifiers after
application**. This report claims the canonical **version/name and schema outcome**
only. It does **not** claim byte-identical migration-history insertion semantics
relative to a CLI-applied run.

---

## §4 — RLS / TENANT ISOLATION EVIDENCE

Staging-only transactional probes, each rolled back. **No persistent test data created.**

**Observed Investment Fact**

| Actor | Rows visible |
|---|---|
| Same-tenant Company Admin | **1** |
| Different tenant | **0** |
| Worker | **0** |

**Living KORAL (temporary row, transaction rolled back)**

| Actor | Rows visible |
|---|---|
| Same-tenant Company Admin | **1** |
| Worker | **0** |
| Different tenant | **0** |

**Saved Column Mapping (temporary row, transaction rolled back)**

| Actor | Rows visible |
|---|---|
| Company Admin | **0** |
| KORA_ADMIN | **1** |

Additionally, **Company A / Company B two-tenant isolation was proven through the
browser/API path** by Playwright in R0-C Phase 1 (§5) — not only at the RLS layer.

---

## §5 — AUTHENTICATED STAGING — PHASE 1

### §5.1 — EXACT-SHA run (current, authoritative)

Against `dpl_2uAjmF5wWrqbvPTuzzsGJPsQWETt` @ `1e981f8067c388fc14ed3ea44f650cf2cf763a39`:

**6 passed · 0 failed · 0 skipped · exit 0 · 44.7 s**

| Case | Result |
|---|---|
| A01 · KORA_ADMIN → admin workspace | **PASS** |
| A02 · COMPANY_A → company workspace | **PASS** |
| A03 · COMPANY_B → company workspace | **PASS** |
| A04 · tenant contexts A/B disjoint | **PASS** |
| T01 · disjoint tenant data via `/api/company/workspace` | **PASS** |
| T02 · foreign tenant identifier ignored | **PASS** |

**Gate fail-closed, asserted before the run:** host exact match **PASS** · Preview
deployment exact ID verified · exact SHA verified · Production exclusion **PASS**.

**Security:** Vercel bypass used · `SUPABASE_SERVICE_ROLE_KEY` **absent** ·
`E2E_ROTATE_TARGETS` **absent** · `E2E_ALLOW_PRODUCTION` **absent** ·
`E2E_GOLDEN_DATA_BEARING_ALLOW_RUN` **absent** ·
`E2E_CONFIRM_PRODUCTION_AUTH_E2E_I_UNDERSTAND` **absent**.

**Artifacts: 0. Application-data mutation: none.**

> **PHASE 1 — EXACT-SHA STAGING: PASS**

### §5.2 — Pre-amendment run (historical, on `cac13b218…`)

Run: **6 passed · 0 failed · 0 skipped · exit 0 · 42.2 s**

| Case | Result |
|---|---|
| A01 · KORA_ADMIN → workspace admin | **PASS** |
| A02 · Company A → company workspace | **PASS** |
| A03 · Company B → company workspace | **PASS** |
| A04 · tenant contexts A/B disjoint | **PASS** |
| T01 · disjoint tenant data via `/api/company/workspace` | **PASS** |
| T02 · foreign tenant identifier ignored | **PASS** |

This phase had **already passed previously**; the run above was a **stability rerun**
executed after the WORKER/ADVISOR/PARTNER password rotation and after the local
remediation, to confirm no regression in the already-validated path.

**Security conditions, verified fail-closed before the run:**

- Vercel Automation Bypass used (host-scoped request header)
- `SUPABASE_SERVICE_ROLE_KEY` **absent** from the process
- `E2E_ROTATE_TARGETS` **absent**
- `E2E_ALLOW_PRODUCTION` **absent**
- `E2E_CONFIRM_PRODUCTION_AUTH_E2E_I_UNDERSTAND` **absent**
- `E2E_GOLDEN_DATA_BEARING_ALLOW_RUN` **absent**
- **Zero failure artifacts produced**

**No application data mutation occurred** — auth sessions only.

---

## §6 — RESPONSIVE / PERSONA MATRIX

### §6.1 — EXACT-SHA run (current, authoritative)

Against `dpl_2uAjmF5wWrqbvPTuzzsGJPsQWETt` @ `1e981f8067c388fc14ed3ea44f650cf2cf763a39`:

**15 passed · 0 failed · 0 skipped · exit 0 · 51.7 s**

| Role | mobile-375 | tablet-768 | desktop-1440 |
|---|---|---|---|
| R01 · KORA Admin | **PASS** | **PASS** | **PASS** |
| R02 · Company | **PASS** | **PASS** | **PASS** |
| R03 · Worker | **PASS** | **PASS** | **PASS** |
| R04 · Partner | **PASS** | **PASS** | **PASS** |
| R05 · Advisor | **PASS** | **PASS** | **PASS** |

Every case verified: real login · Vercel bypass · `assertReachedWorkspace` ·
`assertNoHorizontalOverflow` · `assertChromeContract`.

**Worker:** onboarding gate **PASS** → `/worker/workspace`.
**Advisor:** valid zero-assignment empty state.
**Security:** service-role and every mutating flag **absent**. **Artifacts: 0.**

> **M — PASS: exact-SHA Preview validated 15/15.**

### §6.2 — Pre-amendment run (historical, on `cac13b218…`)

Run: **15 passed · 0 failed · 0 skipped · exit 0 · 51.7 s**

| Role | mobile-375 | tablet-768 | desktop-1440 |
|---|---|---|---|
| R01 · KORA Admin | PASS | PASS | PASS |
| R02 · Company | PASS | PASS | PASS |
| R03 · Worker | PASS | PASS | PASS |
| R04 · Partner | PASS | PASS | PASS |
| R05 · Advisor | PASS | PASS | PASS |

All 15 combinations PASS. Every case exercised the real `/login` form, the Vercel
bypass, workspace reachability, and the three WP-088 assertions:
`assertReachedWorkspace`, `assertNoHorizontalOverflow`, `assertChromeContract`.

**Role-specific evidence:**

- **Worker** — the onboarding gate was passed and `/worker/workspace` reached. That
  gate forwards only a worker whose `personal.worker_profile_private.onboarding_completed_at`
  is set, so reaching the workspace is itself proof of a genuinely complete onboarding.
- **Advisor** — valid **zero-assignment empty state**. The spec asserts workspace
  reachability and chrome, not data; 0 assignments is a legitimate empty state and is
  **not** classified as a defect.
- **Partner** — the existing canonical identity/profile was used.

**No fixture provisioning for this run. No application data mutation. Auth sessions only.**

---

## §6-bis — ADMIN DEAD-ROUTE RUNTIME VALIDATION (new evidence)

Executed against `dpl_2uAjmF5wWrqbvPTuzzsGJPsQWETt` @
`1e981f8067c388fc14ed3ea44f650cf2cf763a39`, as KORA_ADMIN, read-only.

**Overall: 14 navigations · 0 issues · exit 0.**
**0 page 404 · 0 page 5xx · 0 pageerror / unhandled exception. Every observed
navigation returned HTTP 200.**

| Surface | Action | Expected canonical route | Result |
|---|---|---|---|
| Quick Start | Aggiungi Utente | `/admin/companies?from=users` | **PASS** |
| Quick Start | Apri Decision Pack | `/admin/companies?from=preview` | **PASS** |
| Quick Start | Workspace Azienda | `/admin/companies?from=workspace` | **PASS** |
| Company Console | Workspace | `/admin/companies/<tenantCode>/workspace` | **PASS** |
| Company Console | Utenti | `/admin/company-users-live?tenantId=<uuid>` | **PASS** — UUID masked in reporting |
| Company Console | Live Preview | `/admin/companies/<tenantCode>/preview` | **PASS** |
| Live Preview | click `← KORA Admin Workspace` | `/admin/companies/<sameTenantCode>/workspace` | **PASS** — same company preserved |
| Tenant onboarding | workspace link | `/admin/companies/<tenantCode>/workspace` | **PASS** |
| Tenant onboarding | preview link | `/admin/companies/<tenantCode>/preview` | **PASS** |
| Evidence Archive | preview link | `/admin/companies/<tenantCode>/preview` | **PASS** |
| Evidence Archive | workspace link | `/admin/companies/<tenantCode>/workspace` | **PASS** |

**Negative regression scan.** Every clickable `a[href]` was scanned on `/admin`,
`/admin/companies`, `/admin/tenants`, the Evidence Archive and the Live Preview.
**Zero runtime hrefs** were found toward `/admin/company-users`,
`/admin/company-live-preview` or `/admin/company-workspace`, and **no navigation landed
on those legacy flat routes**.

**Network listener:** zero responses `>= 400` on the target host during the entire
validation.

**No mutation.** No POST/PATCH/DELETE application operation · no scoring · no upload ·
no provisioning · no fixture creation. The only write was the authentication session.

**No artifacts.** No trace, screenshot, video or `test-results/`. The scratch Playwright
script lived outside the repository and was removed after the run. The git worktree
remained clean.

> **ADMIN DEAD-ROUTE RUNTIME VALIDATION: PASS**
> The original three-route dead-link Product defect is now
> **REMEDIATED AND RUNTIME-VERIFIED ON EXACT-SHA STAGING.**

---

## §6-ter — J · DATA INTAKE / SAVED MAPPINGS — CONTROLLED RUNTIME VALIDATION

Executed against `dpl_2uAjmF5wWrqbvPTuzzsGJPsQWETt` @
`1e981f8067c388fc14ed3ea44f650cf2cf763a39`, tenant
`wp026-staging-b-1789581507848`, fixture
`data/golden-path/kora_weak_company_upload.csv` (13 rows, initiative-level, no
personal fields).

### §6-ter.1 — Chronology

1. A first attempt **sent 0 accept requests**: the accept button was `disabled`
   behind `allPseudonymChecked` — four mandatory privacy/pseudonymisation
   attestations. **Zero DB delta.** Execution stopped rather than ticking a human
   attestation autonomously.
2. A read-only fixture pre-check established the factual basis for those
   attestations (no email / fiscal code / phone / name columns; two regex
   false positives resolved — *"Corso"* as *training course*, and `42000` as an
   `amount` value).
3. **The Founder explicitly confirmed all four attestations, 4/4, for this
   fixture and this run.** Execution then resumed.

### §6-ter.2 — The single authorized accept

| Field | Value |
|---|---|
| **Accept requests sent** | **1** (a second was guarded to `abort()` before transmission) |
| Result | **HTTP 200** |
| Temporary mapping | `R0C-J-TEMP-1790117842295` |

**Runtime evidence:** temporary saved mapping **persisted** · **14 mapping fields**
persisted · `GET /api/admin/data-intake/saved-mappings` returned it ·
**cross-tenant exclusion PASS** (a different synthetic tenant returned 0) ·
**no 404 · no 5xx · no pageerror**.

### §6-ter.3 — Cleanup finding

The intended cleanup was attempted and **rejected by the database contract**:

```
DELETE on analytics.saved_column_mapping -> permission denied
```

Migration 090 deliberately grants `service_role` **SELECT, INSERT, UPDATE — and
not DELETE** (090:203).

> **EXPECTED LEAST-PRIVILEGE CONTRACT DISCOVERED DURING VALIDATION.**
> This is **not** a Product failure. **No DELETE grant was added, no migration was
> changed, and no schema or security contract was weakened for test cleanup.**

**Founder decision:** accept the single saved mapping as **permanent tracked
staging evidence**.

### §6-ter.4 — Accepted persistent residual

| Table | Delta |
|---|---|
| `analytics.saved_column_mapping` | **+1** |
| `analytics.source_batch` | **+1** |
| `personal.uploaded_record` | **+13** |
| `audit.audit_log` | **+6** |

**All residuals were attributable to the single authorized accept** — the 13
`uploaded_record` rows were verified against that batch's own `batch_id`.
**No unexpected mutation was observed. No Production contact.**

### §6-ter.5 — Final UI verification (second authorized pass)

A second pass, authorized as **upload-preview only**, was run with a route-level
guard aborting any accept before transmission.

| Metric | Value |
|---|---|
| upload-preview requests | **1** |
| **accept requests** | **0** |

**Persistent DB delta from this pass: 0 on all four tables**
(`saved_column_mapping`, `source_batch`, `uploaded_record`, `audit_log`) —
confirming at runtime the code-inspection finding that `upload-preview` performs
no DB write.

Runtime UI proved: Saved Mapping card **visible** · `R0C-J-TEMP-1790117842295`
**displayed** · **14 columns** shown · mapping **selectable** · mapping
**applicable to the Mapping Workspace** · UI confirmation **"Mappatura salvata
applicata"** · tenant-isolation messaging visible to the Operator (*"Le mappature
non sono condivise tra Company"*) · **no second mapping created** · zero 404 ·
zero 5xx · zero pageerror.

**No separate detail page exists, and none is claimed.** The Product supports
**reuse/application** of a saved mapping, not a distinct inspection surface.

> **J — DATA INTAKE / SAVED MAPPINGS: PASS WITH CONTROLLED STAGING RESIDUAL**

---

## §6-quater — K · LIVING KORAL — READ-ONLY PRE-CHECK

**The K pre-check was read-only. No mutation occurred.**

### §6-quater.1 — Confirmed runtime surfaces

`/company/living-koral` · `/company/living-koral/editions` ·
`GET /api/company/living-koral/editions`. Company surfaces are guarded by
`requireCompanyUser`. An Advisor `koral-review` surface exists and is
**assignment-scoped**.

**Runtime evidence obtained (COMPANY_ADMIN, exact-SHA Preview):**

| Route | Status | Evidence |
|---|---|---|
| `/company/living-koral` | **200** | heading *"La tua Living KORAL"*; empty state *"Nessuna trasformazione organizzativa riconosciuta finora"* |
| `/company/living-koral/editions` | **200** | heading *"Edizioni"*; empty state *"Nessuna Edizione preservata finora"* |

Zero 4xx · zero 5xx · zero pageerror. **No mutating control is rendered in the
empty state.**

### §6-quater.2 — Staging data census

| Object | Count |
|---|---|
| `analytics.living_koral_state` | **0** |
| `gov.living_koral_material_change` | **0** |
| `gov.living_koral_transformation_ledger` | **0** |
| Distinct tenants with Living KORAL state | **0** |
| `analytics.observed_investment_fact` (upstream) | **1** |
| `analytics.living_koral_edition` | **NOT DIRECTLY OBSERVABLE** — direct `service_role` count blocked by least-privilege permissions; edition creation is available only through the SECURITY DEFINER path. **No count is invented here.** |

**Staging Living KORAL runtime state is effectively empty for the exercised
Product surface.**

### §6-quater.3 — Function semantics

| Function | Semantics | Invoked |
|---|---|---|
| `analytics.fn_company_living_koral_source_initiative(uuid)` | `LANGUAGE sql` · `STABLE` · `SECURITY DEFINER` · **READ_ONLY** | **NO** — `material_change` count is 0, so there was no valid input |
| `analytics.fn_create_living_koral_edition(text)` | `LANGUAGE plpgsql` · `SECURITY DEFINER` · **MUTATING**, `INSERT`s into `analytics.living_koral_edition` (085:237) | **NO** |

### §6-quater.4 — Automated coverage

`rls-23` … `rls-27` cover material change, transformation ledger, company read,
source initiative and edition. They are **real DB integration tests**, but
**loopback/local only**, transacted locally, and **reject staging by
construction** (`assertLocalPostgresOnly`, `RLS2x_ALLOW_RUN`). They therefore
support **security/isolation** coverage but are **NOT staging runtime evidence**.

`kora-wp-111` … `kora-wp-117` are **static/source-contract** coverage and do not
prove populated runtime behaviour.

### §6-quater.5 — Governance assessment (WP-117)

> **READ-ONLY FOUNDATION VALIDATION IS LEGITIMATE AND COMPLETED.** It covers real
> Company routes, real auth guards, real empty states, previously proven RLS
> isolation, and the integrated Product foundation.

**But** closing K with *populated* Living KORAL runtime evidence would require
creating: worker-initiative transition → material change → recognition →
transformation ledger → Living KORAL state / edition.

**That is not a single validation mutation.** It crosses multiple domains and
personas and exercises the **morphogenetic Living KORAL capability that WP-117
remains Founder-deferred**. Supporting evidence: `createMaterialChangeCandidate`
is invoked by **no** route or page, and `lib/living-koral-mark/*` has **no
consumer in `app/`** — the substrate exists, the Product does not expose it.

K is therefore **not a technical defect and not a failure**, and **no mutation was
authorized or performed**.

> **K — LIVING KORAL: NOT EXERCISED — FOUNDER-DEFERRED BOUNDARY (WP-117)**
> **READ-ONLY PRODUCT FOUNDATION: PASS**

### §6-quater.6 — Risk and N interaction

**Persistent staging mutation from the K pre-check: NONE.**
**Interaction with N: MAY CONTRIBUTE conceptually**, but Living KORAL does not
itself generate the methodology snapshot. **N remains independent.**

---

## §6-quinquies — N · METHODOLOGY SNAPSHOT — RUNTIME ATTEMPT

Executed against `dpl_2uAjmF5wWrqbvPTuzzsGJPsQWETt` @
`1e981f8067c388fc14ed3ea44f650cf2cf763a39`.

### §6-quinquies.1 — Chronology

1. **Read-only pre-check.** `analytics.methodology_snapshot` schema and contract read
   from migration `049`: one snapshot per calculation, no `tenant_id` by design,
   linkage across five result tables, immutability enforced by the DB trigger
   `trg_methodology_snapshot_immutable` (rejects UPDATE/DELETE for **every** role,
   including `service_role`, which bypasses RLS but not triggers). Single construction
   authority: `lib/live/persistence.ts` → `persistKoraComputationResult()`.
2. **A narrower path than golden-data-bearing was identified and proven**, rather than
   assumed: `POST /api/admin/scoring/run-approved-batch` reads **only**
   `analytics.uef_record` where `review_status='approved' AND approved_for_scoring=true`
   — no upload, no `source_batch`, no UEF creation. One eligible UEF already existed
   (tenant `STAGE-001`, "KORA Staging Synthetic Company").
3. **Exactly one execution was explicitly authorized** and performed, with `batchId`
   only.
4. **The request was rejected — HTTP 422:**
   *"Workforce baseline missing. Provide workforcePopulation >= 10 in request body."*
5. **Real staging baseline:** `personal.workforce_baseline.total_workers = 3`
   (reporting period `2026-H1`, which additionally does not match the UEF's period).
6. **The configured safe aggregation threshold requires ≥ 10.**
7. **Zero persistent mutation.**
8. **No bypass was attempted.**
9. **No synthetic `workforcePopulation` was supplied.**

### §6-quinquies.2 — Verified unchanged state

| Object | Value |
|---|---|
| `analytics.methodology_snapshot` | **0** |
| `activation_result` | 1 |
| `confidence_result` | 1 |
| `kora_index_result` | 1 |
| `bti_result` | 1 |
| `impact_unit` | **0** |
| `source_batch` | 6 |

**No snapshot created · no scoring result created · no impact unit created · no
ingestion mutation.** Authorized scoring requests: **1**. Result: **HTTP 422**.

### §6-quinquies.3 — Interpretation

> **The HTTP 422 is NOT a Product defect, NOT an infrastructure failure, NOT broken
> scoring and NOT a failed privacy gate. It is the intended Product guard functioning
> correctly.**

The exact-SHA Product **correctly refused** to execute a methodology-bearing calculation
for a workforce below the configured safe aggregation threshold.

**No synthetic `workforcePopulation` was supplied**, because doing so solely for
validation would **manufacture the privacy prerequisite** and would create a
**permanent, immutable** methodology snapshot whose provenance would not represent the
real staging baseline.

### §6-quinquies.4 — Classification

> **N — METHODOLOGY SNAPSHOT: BLOCKED ON CURRENT STAGING DATA — PRIVACY GUARD VERIFIED**
>
> **METHODOLOGY SNAPSHOT CREATION/LINKAGE: NOT EXERCISED**
> **PRIVACY THRESHOLD ENFORCEMENT: PASS — EXACT-SHA RUNTIME VERIFIED**

**HISTORICAL (as of the 422, preserved):** *"The methodology-snapshot contract was NOT
runtime-proven… Actual staging creation and linkage remain unexercised."* That was true
at that moment and is kept as the record of it.

### §6-quinquies.5 — RESOLUTION: Variant B2, authorized and executed

**Chronology, in full — nothing erased:** N initially **NOT EXERCISED** → first narrow
scoring attempt returned **HTTP 422** because the workforce baseline was **3** against
the Product's **N ≥ 10** privacy threshold → that 422 was correctly classified as
**privacy guard enforcement**, not a defect → **R0-C was therefore BLOCKED pending
conforming staging data** → a read-only data-readiness audit identified **legitimate
Variant B2** → the Founder **separately authorized** Variant B2 → conforming synthetic
staging data was prepared → **N runtime execution then passed**.

#### Legitimate staging preparation

| Field | Value |
|---|---|
| Synthetic tenant | `wp026-staging-b-1789581507848` |
| Source fixture | `data/golden-path/kora_weak_company_upload.csv` |
| **Canonical fixture workforce** | **100** |
| Authorized baseline | `total_workers = 100`, `reporting_period = 2026-Q1` |

**Why this is legitimate:** the value **100 comes from the canonical definition of the
weak synthetic fixture** (`data/golden-path/README.md` and
`tests/unit/b108b-score-smoke-test.test.ts`). **It was NOT invented to cross the N ≥ 10
privacy threshold.** The STAGE-001 tenant and its baseline of **3** were **NOT
modified**.

Preparation performed: exactly **one** workforce baseline created for the synthetic
tenant · the J batch promoted through the supported UEF flow · **13 UEF created** from
the authorized J batch · **13 approved** · **13 `approved_for_scoring`** · reporting
period **aligned** across baseline `2026-Q1`, batch `2026-Q1` and UEF `2026-Q1`.

> **CONFORMING SYNTHETIC STAGING PRECONDITION: PASS**

#### Exact-SHA runtime execution

Exactly **one** `POST /api/admin/scoring/run-approved-batch` was executed. **No retry.**

| Field | Value |
|---|---|
| Result | **HTTP 200**, ≈ 8 s |
| UEF processed | **13** |
| `workforcePopulation` | **100** — sourced from the **persisted workforce baseline**, **NOT** a request-body override |
| `scoringMode` | `computed` |
| Observed output | KORA Index **26.32** · CS **59** · Safeguard **FLAGGED** |

These scores are **runtime evidence only** and are neither reinterpreted nor evaluated
here.

#### Methodology snapshot creation

`analytics.methodology_snapshot`: **PRE 0 → POST 1, DELTA +1.** Exactly one snapshot,
masked id **`350d****9e`**.

| Field | Verified value |
|---|---|
| `methodology_version` | `1.0` |
| `taxonomy_version` | `KORA Action Taxonomy v0.1` |
| `bc_calibration_version` | `pre_empirical_v1` |
| `contribution_config_version` | `v0.2` |
| `factor_statuses` | present, **9 factors** |
| `pipeline_version` | `KoraPipeline_v2.0` |
| `config_hash` | present, **masked in report** |
| `calculation_timestamp` | `2026-09-23T17:15:51.825+00:00` |
| `provenance` | **`AS_ORIGINALLY_CALCULATED`** |
| `restated_from_snapshot_id` | **NULL** |

> **METHODOLOGY SNAPSHOT CREATION: PASS — EXACT-SHA RUNTIME VERIFIED**

#### Calculation linkage

| Table | New rows | Linked to the new snapshot | Result |
|---|---|---|---|
| `activation_result` | 1 | 1 | **PASS** |
| `confidence_result` | 1 | 1 | **PASS** |
| `kora_index_result` | 1 | 1 | **PASS** |
| `bti_result` | 1 | 1 | **PASS** |
| `impact_unit` | **13** | **13** | **PASS** |

**`impact_unit` runtime observed 13 rows** — recorded as observed, **not** rewritten as
an expected single row.

> **METHODOLOGY SNAPSHOT LINKAGE: PASS — EXACT-SHA RUNTIME VERIFIED**

#### Historical preservation

Before N there was exactly **one** historical row in each of `activation_result`,
`confidence_result`, `kora_index_result` and `bti_result` with
`methodology_snapshot_id = NULL`. After N, **all four remain unchanged. No backfill. No
rewrite.**

> **HISTORICAL NULL PRESERVATION: PASS**

#### Immutability

**No UPDATE or DELETE was attempted.** Immutability was verified through the existing DB
contract: `trg_methodology_snapshot_immutable`, `BEFORE UPDATE OR DELETE`, rejecting
both for **every** role including `service_role`. **The snapshot is intentionally
permanent.**

> **IMMUTABILITY CONTRACT: PASS BY DB-DEFINITION VERIFICATION**
> No destructive runtime testing was performed and none is claimed.

#### Full authorized-flow delta

| Table | PRE | POST | Delta | Classification |
|---|---|---|---|---|
| `personal.workforce_baseline` | 1 | 2 | **+1** | EXPECTED_B2_PREPARATION |
| `analytics.uef_record` | 20 | 33 | **+13** | EXPECTED_B2_PREPARATION |
| `analytics.methodology_snapshot` | 0 | 1 | **+1** | EXPECTED_N_CALCULATION |
| `analytics.impact_unit` | 0 | 13 | **+13** | EXPECTED_N_CALCULATION |
| `activation_result` | 1 | 2 | **+1** | EXPECTED_N_CALCULATION |
| `confidence_result` | 1 | 2 | **+1** | EXPECTED_N_CALCULATION |
| `kora_index_result` | 1 | 2 | **+1** | EXPECTED_N_CALCULATION |
| `bti_result` | 1 | 2 | **+1** | EXPECTED_N_CALCULATION |
| `audit.audit_log` | 12 | 31 | **+19** | ATTRIBUTABLE TO AUTHORIZED B2 + N FLOW |
| **`analytics.source_batch`** | 6 | 6 | **0** | **UNCHANGED** |
| **`personal.uploaded_record`** | 33 | 33 | **0** | **UNCHANGED** |

**Additional observed residual, disclosed not hidden:** one **`decision_pack` draft**
created by the scoring run — masked id **`a4b2****f9`**, version
`2026-Q1-v1790183753261`. Classification: **ATTRIBUTABLE SCORING RESIDUAL**.

#### Privacy / security

**N ≥ 10 privacy threshold respected** · **no `workforcePopulation` override passed in
the scoring request** · workforce **100** came from a legitimate canonical synthetic
fixture context · **STAGE-001 baseline 3 unchanged** · no Product privacy guard
bypassed · Production never queried or modified · no secrets exposed.

**The earlier HTTP 422 remains valuable evidence in its own right:**

> **PRIVACY THRESHOLD ENFORCEMENT: PASS — EXACT-SHA RUNTIME VERIFIED**

**The later successful N execution does NOT invalidate that earlier evidence** — the
guard fired correctly when the precondition was absent, and passed correctly once a
legitimate precondition existed.

> **N — METHODOLOGY SNAPSHOT: PASS — EXACT-SHA RUNTIME VERIFIED**
> (previously **BLOCKED ON CURRENT STAGING DATA — PRIVACY GUARD VERIFIED**, before
> Variant B2 preparation — that history is retained above, not erased)

---

## §7 — RUNTIME LOG REVIEW

**Status: REVIEW COMPLETED — PRODUCT DEFECT DISCOVERED.**

Manual Vercel dashboard inspection during R0-C, inspected window:

| Signal | Count |
|---|---|
| Warning | **0** |
| Error | **0** |
| Fatal | **0** |
| Observed 5xx | **none** |
| HTTP 200 | **592** |
| HTTP 404 | **2** |

One observed 404 was **`/admin/company-users`**. This triggered the dead-route
investigation and remediation recorded in §8.

**HISTORICAL (first draft):** *"This report does not state that the deployment is now
free of those 404s. The remediation exists locally only and has not been deployed."*

**UPDATE.** The remediation has since been deployed to the exact-SHA Preview and
browser-validated (§6-bis): on `dpl_2uAjmF5wWrqbvPTuzzsGJPsQWETt` the three legacy flat
routes are no longer reachable from any scanned Admin surface, and 14/14 navigations
returned 200.

### §7.1 — SECOND LOG REVIEW — EVIDENCE PROVENANCE

> **DIRECT RUNTIME-LOG QUERY PERFORMED IN A SEPARATE AUTHORIZED ASSISTANT SESSION.**

Runtime-log evidence was obtained through a **direct Vercel runtime-log query performed
in a separate authorized assistant session** against the exact-SHA Preview deployment
`dpl_2uAjmF5wWrqbvPTuzzsGJPsQWETt` @ `1e981f8067c388fc14ed3ea44f650cf2cf763a39`
(target: Preview / non-Production).

**That observation is not reproducible from the current execution session**, where
Vercel runtime-log requests consistently return **HTTP 403 before any log data is
returned** — raw queries, level-filtered queries and `group_by` aggregates alike, across
five attempts.

**The current-session 403 is therefore treated as a tooling/access limitation and not as
evidence about application runtime behaviour.** A 403 says nothing about whether error
logs exist; it says only that this session may not read them.

**AUDIT NOTE.** The separate-session runtime-log observation is recorded as **external
execution evidence within the same R0-C validation process**. It is **not independently
reproducible from the current Claude session**, because that session's Vercel log API
access returns 403. **This provenance limitation is disclosed rather than hidden.**

**Tooling limitation, disclosed:** the programmatic runtime-log API returned
`403 Forbidden` for this deployment on every attempt. That is an **access limitation of
the tooling/token**, not an application failure, and it was bypassed by manual dashboard
inspection. Earlier reports correctly recorded it as `BLOCKED` rather than inferring an
absence of errors.

---

## §8 — DEAD-ROUTE PRODUCT DEFECT

**Chronology.** An audit of `ADMIN_QUICKSTART_STEPS` found three dead Product **page**
routes — `/admin/company-users`, `/admin/company-live-preview`, `/admin/company-workspace`
— none of which has a page or a redirect. A subsequent systematic runtime inventory
found **13 executable occurrences** of those three legacy page routes across the Admin
surface, classified as:

| Classification | Count |
|---|---|
| MECHANICAL_FIX | **9** |
| NEEDS_SELECTOR | **4** |
| PRODUCT_DECISION_REQUIRED | **0** |

**All 13 were subsequently corrected locally.**

**Canonical patterns used — no new route, no resolver:**

- Tenant-specific Gen 3, where the calling site already held the code:
  `/admin/companies/[tenantCode]/workspace` · `/admin/companies/[tenantCode]/preview`
- Tenant-ID users surface, where the calling site already held the UUID:
  `/admin/company-users-live?tenantId=<uuid>`
- No tenant selected yet — the canonical selector, whose `FROM_LABELS` already carries
  these keys: `/admin/companies?from=users` · `?from=preview` · `?from=workspace`

**No `tenant_code → UUID` resolver was introduced.** The previously recorded
"architecturally unresolved" problem was bridging a code to a UUID from a surface that
held only the code; none of the corrected surfaces is in that position.

**Fail-closed remediation in `app/api/admin/company-submissions/route.ts`:**

```
if tenantCode exists →  /admin/companies/<tenantCode>/workspace
else                 →  /admin/companies?from=workspace
```

The previous `?? ''` was removed, so **no malformed `/admin/companies//workspace` can be
generated by any path**.

**`rpEnc`** in `app/api/admin/live-company/route.ts` was removed **only because the
remediation eliminated its final consumers** — causal cleanup of this change, not
refactoring. ESLint then returned **0 warnings** on that file.

### §8.1 — Cluster status (amended)

The remediation is **no longer merely local**. It has been: committed (§9) · pushed to
the authorized proof ref (§1) · passed exact-SHA CI 4/4 (§1-bis) · deployed to the
exact-SHA Preview (§2.1) · browser/runtime validated (§6-bis).

> **ORIGINAL THREE-ROUTE CLUSTER: CLOSED FOR R0-C EXACT-SHA STAGING.**

This closure covers **only** `/admin/company-users`, `/admin/company-live-preview` and
`/admin/company-workspace` as executable runtime hrefs. **It does not extend to any
unrelated known debt** — see §12, which remains fully open.

---

## §9 — LOCAL REMEDIATION COMMIT

| Field | Value |
|---|---|
| Commit | `1e981f8067c388fc14ed3ea44f650cf2cf763a39` |
| Message | `fix(r0-c): harden staging validation and repair admin dead routes` |
| Parent | `cac13b218ff99c3373f92439994aa4749934a2b1` |
| **Publication status** | **PUSHED** — fast-forward to `integration/r0a-ci-proof-2026-09-22` only (§1) |
| Files changed | **18** |
| Insertions | **523** |
| Deletions | **38** |

**Classification:** 11 `R0-C_PRODUCT_REMEDIATION` · 4 `R0-C_UNIT_GUARD` ·
2 `R0-C_TEST_INFRA` · 1 `R0-C_TOOLING`

**The 18 paths, exactly as recorded by the commit:**

*R0-C_PRODUCT_REMEDIATION (11)*
```
app/admin/companies/_components/CompanyConsolePanel.tsx
app/admin/page.tsx
app/admin/tenants/_components/TenantOnboardingPanel.tsx
app/api/admin/company-console/route.ts
app/api/admin/company-submissions/route.ts
app/api/admin/live-company/route.ts
components/admin/CompanyEvidenceArchivePanel.tsx
components/admin/CompanyLivePreviewPanel.tsx
components/admin/PilotOnboardingChecklist.tsx
lib/admin-lifecycle/lifecycle-rules.ts
lib/feature-discovery/index.ts
```
*R0-C_TOOLING (1)*
```
scripts/e2e/rotate-staging-e2e-password.ts
```
*R0-C_TEST_INFRA (2)*
```
tests/e2e/authenticated-smoke.spec.ts
tests/e2e/two-tenant-isolation.spec.ts
```
*R0-C_UNIT_GUARD (4)*
```
tests/unit/b82b-admin-operational-clarity.test.ts
tests/unit/b88b-visual-surface-activation.test.ts
tests/unit/b95c-workforce-navigation.test.ts
tests/unit/tenant-identity-read-path-audit.test.ts
```

**Tooling — `scripts/e2e/rotate-staging-e2e-password.ts`:** included **after a secret
scan**. No credential is hardcoded; every value is env-driven; staging gates are
fail-closed (confirm token, host/ref match, loopback refusal); the Production ref is
**denied unconditionally**; **no value from `~/.kora-r0c` was committed**. The scan found
zero JWT-shaped literals, zero long base64/hex literals, zero literals assigned to
password/secret/token identifiers, and zero references to the secret directory.

**Verification state after the new anti-regression test:**

| Check | Result |
|---|---|
| Unit test files | **429** |
| Unit tests | **13731 passed · 0 failed** |
| `tsc --noEmit` | **exit 0** |
| ESLint | **green — zero relevant warnings after the `rpEnc` cleanup** |

**Mutation proof.** The new dead-route guards were temporarily mutation-tested by
restoring the old routes in the Product source: every guard **failed** as intended. The
source was then restored from backup and the full suite returned green.

---

## §10 — R0-C COVERAGE MATRIX

| # | Area | Status | Notes |
|---|---|---|---|
| A | Authenticated browser journeys | **PASS — exact-SHA staging** | Phase 1 6/6 on `dpl_2uAjm…` @ `1e981f80…` |
| B | Staging runtime / DB binding | **PASS** | Preview bound to `haqflkurpmeaxpikozjl`; health reachable |
| C | Role / persona enforcement | **PASS** — for the exercised five-role surface | KORA_ADMIN, Company, Worker, Partner, Advisor |
| D | Two-tenant separation | **PASS — exact-SHA staging** | Proven at both RLS and browser/API layers |
| E | KORA Admin critical access | **PASS / PARTIAL** | Authenticated workspace, responsive and route evidence passed. **Admin dead-route navigation repaired and exact-SHA runtime verified (§6-bis).** Still: **not every Admin capability has been runtime-exercised** |
| F | Company workspace | **PASS — exact-SHA** | |
| G | Worker workspace / privacy | **PARTIAL** | Workspace + onboarding gate and prior RLS evidence PASS; **not every privacy boundary has been exercised** |
| H | Advisor workspace | **PARTIAL** | Workspace, guard and empty state PASS; **multi-company assignment flow not data-bearing exercised** |
| I | Partner surface | **PASS** — for the authenticated surface exercised | |
| J | Data Intake / Saved Mappings | **PASS WITH CONTROLLED STAGING RESIDUAL** | §6-ter. One authorized accept (HTTP 200), mapping persisted with 14 fields, cross-tenant exclusion proven, UI reuse proven, second pass zero-delta. Accepted residual: `saved_column_mapping +1`, `source_batch +1`, `uploaded_record +13`, `audit_log +6` |
| K | Living KORAL | **NOT EXERCISED — FOUNDER-DEFERRED BOUNDARY (WP-117)**<br>**READ-ONLY PRODUCT FOUNDATION: PASS** | §6-quater. Company routes, guards and empty states verified at exact-SHA; staging state empty; populated-runtime proof would cross the WP-117 deferral. Not a defect, not a failure |
| L | Runtime / logging | **PASS — exact-SHA staging** | **Combines two distinct evidence levels, deliberately not conflated.** **(1) DIRECT SERVER-SIDE EVIDENCE** — a runtime-log query executed in a **separate authorized assistant session** against `dpl_2uAjm…` @ `1e981f80…`; **not reproducible from the current session (HTTP 403)**, see §7.1. **(2) CURRENT-SESSION CLIENT-SIDE EVIDENCE** — browser/network listeners across the exact-SHA validations (Admin dead-route §6-bis, J §6-ter, K §6-quater): **no 404, no 5xx, no pageerror** on any exercised surface. Level (2) is client-observed and does not substitute for level (1) |
| M | Responsive | **PASS — exact-SHA 15/15** | §6.1 |
| N | Methodology Snapshot runtime | **PASS — EXACT-SHA RUNTIME VERIFIED** | §6-quinquies. Previously **BLOCKED ON CURRENT STAGING DATA — PRIVACY GUARD VERIFIED** (HTTP 422, baseline 3 vs required ≥ 10), resolved via Founder-authorized **Variant B2**: legitimate synthetic baseline **100 / 2026-Q1** from the canonical weak-fixture definition, J batch promoted, 13 UEF approved, **one** scoring run → **HTTP 200**. **Exactly one** snapshot created, `provenance = AS_ORIGINALLY_CALCULATED`, `restated_from_snapshot_id = NULL`; linkage PASS on all five written tables (`impact_unit` = 13 rows); historical NULL rows unchanged; immutability PASS by DB-definition. **Privacy threshold enforcement remains PASS — that earlier evidence stands** |

---

## §11 — METHODOLOGY STATE

`analytics.methodology_snapshot` **exists**.

Current methodology contract: **a new calculation persists exactly one immutable
snapshot.** Historical rows may legitimately carry a NULL snapshot if they predate the
contract — migration 049 defines NULL as "predates the Methodology Snapshot contract".

Observed staging state:

| Object | Rows | With snapshot |
|---|---|---|
| `methodology_snapshot` | **0** | — |
| `activation_result` | 1 (historical) | **0** |
| `confidence_result` | 1 (historical) | **0** |
| `kora_index_result` | 1 (historical) | **0** |
| `bti_result` | 1 (historical) | **0** |
| `impact_unit` | **0** | — |

> **NO CURRENT RUNTIME METHODOLOGY SNAPSHOT PROOF YET.**

The historical NULL rows are **not** classified as a defect. What is missing is a
current calculation demonstrating snapshot creation — which requires a data-bearing run
that has not been authorized.

---

## §12 — KNOWN REMAINING DEBT — OUTSIDE THE CLOSED THREE-ROUTE CLUSTER

Listed and tracked. **Not fixed. Not resolved.**

1. **`/admin/company-submissions`** — a **fourth** flat dead page route, discovered on
   `app/admin/page.tsx` in the same Admin navigation block. Outside the authorized
   three-route remediation cluster. **OPEN.**

2. **`lib/permissions/index.ts`** — contains stale permission/navigation entries for
   retired flat Admin routes (the three above, plus six entries that are redirects
   rather than pages). It does **not** itself emit any of the runtime links fixed in §8.
   Tracked separately. **OPEN.**

3. **`app/api/admin/live-company/route.ts`** — two descriptive/recovery strings still
   name `/admin/company-users` as operator guidance. They are **text, not runtime
   hrefs**, and were explicitly out of the authorized scope. Tracked separately. **OPEN.**

---

## §13 — SECURITY / SECRET HANDLING

Secrets remained local under `~/.kora-r0c` with restrictive (`600`) permissions and were
loaded only into the process that needed them.

**Never reproduced in any report, log or command output:** passwords, the service-role
key, the Vercel bypass secret, cookies or JWTs.

**Rotation of an exposed credential.** A Vercel cookie/token was accidentally exposed in
a transcript earlier in this work; it was **rotated before testing continued**. Separately,
the KORA_ADMIN and COMPANY_A staging passwords were rotated twice — first to recover
from invalid stored credentials, then again to replace a weak placeholder with strong
random values — and WORKER/ADVISOR/PARTNER were rotated once. Every rotation used
`updateUserById(id, { password })` only, with identity, role, tenant and metadata
verified unchanged before and after.

**Browser tests do not load the service-role key.** Its absence was asserted fail-closed
before each run.

**Failed Playwright artifacts can expose password-field contents** — this was observed
directly: an accessibility snapshot in `error-context.md` rendered a password value in
clear text. Failure artifacts must therefore be treated as sensitive and deleted.
**The latest successful runs produced zero such artifacts.**

---

## §14 — PRODUCTION / RELEASE SAFETY

- **`main` remained `70c4cfa0dfa36d8697d8f76a3a7df8a5bf530adc`** — not pushed, not merged.
- **`integration/kora-canonical-product-2026-09-22`** remained `3a383072b96290b44620566a242d22f0cc23b01a`.
- **`r0/ci-real-db-enforcement-2026-09-22`** remains at `cac13b218…` — **not automatically aligned** with the proof ref.
- **The only remote change in this whole task** was the fast-forward of
  `integration/r0a-ci-proof-2026-09-22` from `cac13b218…` to `1e981f80…`. Total remote
  refs before and after: **383**.
- **Production was not deployed or promoted.** Note that `main` **is** the live Production
  trigger (established by direct Vercel evidence in report 253), which is precisely why
  it was left untouched.
- **Frozen RC remained** `release/kora-rc-2026-09-20` @ `5f9426974791b6e2ff292aa7634860c4666bd91a`.
- **PR #172 unchanged** (`refs/pull/172/head` @ `5f9426974791b6e2ff292aa7634860c4666bd91a`).
- **Gate 3 branch/history not modified.**
- **`scripts/provision-next-review.mjs` untouched** — never read, opened, searched,
  hashed, copied, modified, staged or targeted by any command.
- **No Production DB operation performed.**

---

## §15 — CURRENT R0-C VERDICT

> **R0-C STATUS: COMPLETE**

**HISTORICAL (preserved):** the verdict was previously **BLOCKED / NOT YET COMPLETE**,
because methodology snapshot runtime creation/linkage had not been demonstrated. That
requirement has since been met (§6-quinquies.5).

**K's WP-117 deferral remains explicitly documented as an out-of-scope Founder-deferred
boundary, not an incomplete R0-C execution item.** It was **not activated** to obtain
closure.

### What R0-C COMPLETE does NOT mean

**R0-C COMPLETE does NOT mean:** the Controlled Pilot gate is met · KORA Enterprise V1
is complete · **WP-132** is complete · the methodology disclosure requirement is
complete · known Admin debt is resolved · **WP-117 has been activated** · Gate 3 is
complete · Production is authorized · a Production deploy is authorized.

All known debt is preserved unchanged, including `/admin/company-submissions`, the stale
`lib/permissions/index.ts` entries, the descriptive/recovery legacy strings already
tracked (§12), and every other previously documented external requirement.

### R0 roadmap

**R0-C: COMPLETE.** **R0-D: NOT STARTED / NEXT GOVERNANCE PHASE**, per the existing
roadmap. R0-D was **not** executed and the Registry was **not** modified by this task.

**Newly completed since the first draft of this report:**

- remediation commit **published to the authorized proof ref** (§1)
- **exact-SHA GitHub CI 4/4 PASS** — run `35792197186` (§1-bis)
- **exact-SHA Vercel Preview READY** — `dpl_2uAjmF5wWrqbvPTuzzsGJPsQWETt` (§2.1)
- **Phase 1 exact-SHA 6/6 PASS** (§5.1)
- **Phase 2 exact-SHA 15/15 PASS** (§6.1)
- **original three-route Admin dead-link cluster: exact-SHA runtime validation PASS** (§6-bis)

**Proven (cumulative):**

- staging DB migration state (§3)
- staging binding (§2, §10-B)
- RLS probes, all rolled back (§4)
- authenticated multi-role browser access (§5, §6)
- two-tenant isolation, at both RLS and browser/API layers (§4, §5)
- responsive five-role matrix, 15/15 (§6)
- runtime-log inspection, with a real defect found (§7)
- local remediation with green unit, type and lint state, mutation-proved (§9)

**Requirements 1–3 of the first draft are now SATISFIED** (publish/deploy the exact
commit; verify the deployed SHA; rerun browser validation against that deployment,
including the repaired Admin navigation and dead-route paths). They are retained here as
the record of what was outstanding.

**Also completed since:** **J** closed as PASS WITH CONTROLLED STAGING RESIDUAL
(§6-ter) · **K** read-only Product foundation validated and correctly bounded
(§6-quater) · **L** second runtime-log review recorded as completed by the Founder
(§7 provenance note).

### R0-C EXECUTABLE VALIDATION STATUS — RESOLVED

**HISTORICAL (preserved):** this section previously read *"No further legitimate R0-C
validation action is executable against the current staging dataset…"*, with N blocked
on a workforce baseline of 3 against the Product's N ≥ 10 threshold. That was accurate
until Variant B2 was authorized and executed.

**CURRENT STATE.** The blocker has been resolved (§6-quinquies.5). There are now:

- **no active executable R0-C validation blockers**;
- **no unresolved N evidence requirement**;
- no Production impact, no `main` impact, no frozen-RC impact.

### Boundary distinction — do not conflate

**K is deferred by governance/Product scope** (WP-117). **N is NOT deferred:** it is an
**unmet R0-C requirement currently blocked by staging data preconditions.** The two are
different in kind and are recorded separately.

**Deferred boundary, not an executable remainder:**

**K** — Living KORAL *populated-runtime* validation is deferred under **WP-117**.
It becomes an executable item **only** if the Founder explicitly revokes or changes
that deferral. **No such revocation has occurred, and none is implied by this
report.**

**No claim is made that the Controlled Pilot gate is met.** Controlled Pilot remains
gated by the wider canonical conditions, including **WP-132** and all required R0 gates.

---

## §16 — GOVERNANCE FOOTER

**J is closed with an explicitly accepted controlled staging residual** (§6-ter.4).

**K populated-runtime validation remains outside current execution scope because
WP-117 is Founder-deferred** (§6-quater.5). Its read-only Product foundation is PASS.

**N is CLOSED: PASS — EXACT-SHA RUNTIME VERIFIED** (§6-quinquies.5).

**Report 256 itself authorizes no further mutation, push, deploy or Production action.
This document records evidence only.**

```
REPORT STATUS:         COMPLETE
R0-C EXECUTION STATUS: COMPLETE
PRODUCTION IMPACT:     NONE
MAIN IMPACT:           NONE
FROZEN RC IMPACT:      NONE
```

**R0-C integrated staging validation is complete on the authoritative exact-SHA
Preview.** All active R0-C runtime evidence requirements have been resolved. **The
WP-117 Living KORAL populated-runtime capability remains explicitly Founder-deferred and
was not activated to obtain closure.** Controlled Pilot readiness remains governed by its
separate prerequisites. **This report authorizes no Production action, deploy, merge,
push, Registry change or R0-D execution.**
