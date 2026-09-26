# 261 — KORA CONTROLLED PILOT — FINAL EXACT-SHA STAGING VALIDATION

**Date:** 2026-09-24 · **Track:** Controlled Pilot gate (Registry 219 §AJ)
**Candidate SHA:** `6bc22f5bae93270527b12f5b9d15b7997098db75`
**Branch:** `integration/kora-canonical-product-2026-09-22`

> ## VERDICT: **CONTROLLED PILOT — NOT READY**
>
> **Failed requirement: R4 / R5 / R6 — NOT VALIDATED.**
> **Cause: `CFG-01`, a staging *configuration* blocker, not a Product defect.**
>
> The exact-SHA Preview deployment has **no Supabase environment binding**, because all
> three Supabase variables are branch-scoped to a *different* branch. Every
> authentication- or database-backed surface therefore returns HTTP 500, and the three
> requirements that can only be validated against those surfaces could not be executed.
>
> **Registry 219's Controlled Pilot gate state was NOT modified.** No Product fix was
> attempted. No environment variable was created, edited, decrypted or removed.
>
> **Updated 2026-09-24 — see §11.** A `CFG-01` remediation was attempted and **did not
> resolve it**: the three variables are still absent from this branch's scope, and a fresh
> git-source build of the same exact SHA still returns 500 on every DB-backed surface.
> `CFG-01` was **subsequently CLOSED on 2026-09-24 — see §14**, after a Founder-authorized
> metadata-only edit. The NOT READY verdict above is **superseded by §14.7**.

---

## 1. WHAT WAS AUTHORIZED, AND WHAT WAS DONE

| Authorized | Performed |
|---|---|
| Push the candidate to its integration branch | **Yes** — `3a38307..6bc22f5`, fast-forward |
| Staging (Preview) deployment | **Yes** — automatic, exact SHA |
| Production deployment | **NOT authorized — NOT performed** |
| `main` modification | **NOT authorized — NOT performed** |
| Product fix during this task | **NOT authorized — NOT performed** |

`main` remains `70c4cfa0dfa36d8697d8f76a3a7df8a5bf530adc`, untouched.
Production Supabase `azdnepfmwrmacruykskm` was never contacted.

## 2. REQUIREMENT MATRIX

Requirement labels are a faithful reconstruction of the directive's enumeration; the
directive's verbatim text was consumed by context compaction and is not quoted here.

| # | Requirement | Result |
|---|---|---|
| **R1** | Canonical CI green on the exact candidate SHA | **PASS** |
| **R2** | Staging deployment of the exact SHA, Preview — not Production | **PASS** |
| **R3** | `KORA-WP-132` canonical intake actor model verified at runtime | **PARTIAL** — API retirement verified; two sub-checks blocked by `CFG-01` |
| **R4** | Methodology disclosure verified at runtime on `/company/reports` | **NOT VALIDATED** — blocked by `CFG-01` |
| **R5** | Bounded pilot-critical Admin workflow validation | **NOT VALIDATED** — blocked by `CFG-01` |
| **R6** | No unresolved pilot-critical dead route across the defined workflow | **NOT VALIDATED** — blocked by `CFG-01` |

**Not all six requirements pass. The gate is therefore NOT advanced**, per the directive's
own condition ("Registry 219 gate update only if all six requirements pass").

## 3. R1 — CI, EXACT SHA — PASS

| Property | Value |
|---|---|
| Workflow | **KORA CI** · run **`36023646894`** · event `push` |
| `head_sha` | **`6bc22f5bae93270527b12f5b9d15b7997098db75`** — exact candidate |
| Conclusion | **`success`** |
| Window | 2026-09-24T15:54:55Z → 15:58:48Z (3 m 53 s) |

All **four** jobs `success`, each on the exact SHA:

| Job | Conclusion |
|---|---|
| TypeScript, tests, build, lint (blocking) | `success` |
| DB-backed gate — RLS-03/05/06 + KORA Link behavioral suite (mandatory) | `success` |
| E2E golden path (Playwright, local Supabase, seeded) | `success` |
| E2E smoke (Playwright, public pages) | `success` |

The DB-backed gate is green because CI provisions its **own** local Supabase via the
Supabase CLI — it does not depend on the Vercel Preview environment. This is precisely why
CI passing does **not** contradict the staging failure in §5: they bind different databases.

## 4. R2 — STAGING DEPLOYMENT, EXACT SHA — PASS

| Property | Value |
|---|---|
| Deployment | **`dpl_6HBdbjekfH1Ki6SbX1RuPqS3s96K`** |
| Project | `prj_eybQKAPKBzP6Jt2oYAOH1BfaBixO` (`kora-foundation-light-demo`) |
| `githubCommitSha` | **`6bc22f5…`** — exact candidate |
| `githubCommitRef` | `integration/kora-canonical-product-2026-09-22` |
| **`target`** | **`null` → Preview. NOT Production.** |
| `readyState` | `READY` · region `iad1` |
| URL | `kora-foundation-light-demo-fg0t7ih1a-simone-felicettis-projects.vercel.app` |

The deployment built and is serving. The build succeeding is itself evidence that `CFG-01`
is a **runtime binding** failure, not a build failure.

## 5. `CFG-01` — THE BLOCKER, ESTABLISHED BY EVIDENCE

### 5.1 Observed

Probed over HTTP with the Vercel protection-bypass header (secret never printed):

| Surface | Status | Class |
|---|---|---|
| `/` | **200** | no auth, no DB |
| `/login` | **200** | no auth, no DB |
| `/company/reports` | **500** | DB-backed |
| `/admin/companies` | **500** | DB-backed |
| `/admin/data-intake` | **500** | DB-backed |
| `/company/data/upload` | **500** | behind the Company layout guard |

The split is exact: **every surface that needs Supabase fails; every surface that does not,
works.** The `/admin/companies` error body contained 38 occurrences of `undefined` and
carried no `x-vercel-error` header — an application-thrown error, not a platform error.

### 5.2 Root cause — confirmed, not inferred

The project's environment variables were read (**never decrypted**). All three Supabase
variables are Preview-scoped **to one specific branch**:

| Variable | id | `target` | **`gitBranch`** |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `GEC4DBvRbLoHY5xj` | `preview` | **`integration/r0a-ci-proof-2026-09-22`** |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `0SZdGC3u9QkDWpbO` | `preview` | **`integration/r0a-ci-proof-2026-09-22`** |
| `SUPABASE_SERVICE_ROLE_KEY` | `WOMD5g55GJp8rRKL` | `preview` | **`integration/r0a-ci-proof-2026-09-22`** |

There is **no unscoped Preview fallback** for any of the three — the project holds only
seven variables in total, and the other four (`UPSTASH_REDIS_REST_URL`,
`UPSTASH_REDIS_REST_TOKEN`, `SECURITY_RATE_LIMIT_PROVIDER`, `NEXT_PUBLIC_SITE_URL`) are
unscoped and unrelated.

This deployment is on **`integration/kora-canonical-product-2026-09-22`**. A branch-scoped
Preview variable applies only to deployments from its own branch, so **none of the three
Supabase values is bound at runtime here.**

### 5.3 The failure chain, end to end

1. `app/company/layout.tsx` calls `requireCompanyUser()` before rendering any child;
2. that resolves through `lib/supabase/server.ts`, which reads
   `process.env.NEXT_PUBLIC_SUPABASE_URL!` and `…_ANON_KEY!` — **non-null assertions**;
3. with the variables unbound, `undefined` is passed into the Supabase client factory;
4. the factory throws; the layout throws; the route returns **500**.

Independently corroborated at the client layer: the served bundle performs a **runtime**
`env` lookup (`…env.NEXT_PUBLIC_SUPABASE_URL … if(!e||!t) throw`) and contains **no
concrete `https://<ref>.supabase.co` literal** — confirming no value was present at build
either.

### 5.4 Why this is configuration, not a Product regression

The **same code family** passed full exact-SHA runtime validation under `R0-C`
(deployment `dpl_2uAjmF5wWrqbvPTuzzsGJPsQWETt`, seven domains
`PASS — EXACT-SHA RUNTIME VERIFIED`, report `256`). That deployment was on
`integration/r0a-ci-proof-2026-09-22` — **the branch the variables are scoped to.** The
variable scoping is the only changed factor. This is a controlled comparison, not a guess.

`CFG-01` will recur on **every** future deployment from this branch until the scoping is
addressed. **Remediation requires re-entering secret values, which Vercel cannot return —
so it is a Founder/infrastructure action and is deliberately NOT attempted here.**

## 6. R3 — WP-132, PARTIALLY VALIDATED AT RUNTIME

| Sub-check | Result |
|---|---|
| `GET /api/company/data-ingest` → `404`, `x-matched-path: /_not-found` | **PASS** — legacy endpoint genuinely gone |
| `/admin/company-submissions` → `404` | **PASS** — B171 consolidation preserved |
| `/company/data/upload` redirects to `/company/data` | **NOT VALIDATED** — the 500 is raised by the Company **layout guard** above the page; the page itself is a 19-line `redirect()` that reaches no ingestion code |
| Canonical Admin intake (`/admin/data-intake`) still functions | **NOT VALIDATED** — 500 |

### `OBS-01` — `POST` to a retired route returns 200, and why it is not a finding

`POST /api/company/data-ingest` returns **200**, which looks alarming. It is not the retired
endpoint functioning:

- the response carries `x-matched-path: /_not-found` and `content-type: text/html` — it is
  the framework's not-found **page**, not an API handler;
- a control request to a route that has never existed,
  `POST /api/company/zzz-control-nonexistent`, returns **byte-for-byte the same 200 +
  `/_not-found`**.

A definitely-nonexistent route and the retired route are indistinguishable, which is exactly
what "retired" should look like. This is Next.js App Router behaviour for `POST` to an
unmatched path. **Recorded as cosmetic hygiene, non-blocking, no ingestion code reachable.**

## 7. R4 / R5 / R6 — NOT VALIDATED

- **R4** — `/company/reports` is the only surface rendering `KoraIndexHero`, and it returns
  500. The static contract is proven by `tests/unit/controlled-pilot-methodology-disclosure.test.ts`
  (11 tests, green in CI), which establishes that `calibration_status`,
  `methodology_version_id` and Confidence Score are non-suppressible by construction. **That
  is a source-level proof, and it is not a substitute for the runtime verification this
  requirement asks for.** Recorded as NOT VALIDATED, not as PASS.
- **R5** — every Admin workflow surface returns 500. No workflow could be walked.
- **R6** — the dead-route sweep cannot distinguish a dead route from `CFG-01`'s blanket 500.
  Running it now would manufacture false findings.

**No requirement was upgraded, waived, or satisfied by substituting a weaker form of
evidence.**

## 8. WHAT WAS NOT DONE, DELIBERATELY

- Registry 219's Controlled Pilot gate state — **not modified**. The gate does not advance.
- No environment variable created, edited, re-scoped, decrypted or deleted.
- No Product code changed; no test amended or weakened.
- No Production deployment, no `main` change, no Gate 3 or Gate 5 movement.
- Production Supabase never queried.

## 9. TO RESUME

`CFG-01` must be closed by a Founder/infrastructure action: make the three Supabase Preview
variables available to `integration/kora-canonical-product-2026-09-22` (either unscoped for
Preview, or additionally scoped to this branch). Both paths require re-entering the secret
values.

Once a Preview deployment of a candidate SHA serves authenticated surfaces, **R3 (remaining
sub-checks), R4, R5 and R6 can be executed unchanged** — no other work is outstanding for
this validation. R1 and R2 need not be repeated for `6bc22f5…` unless the SHA changes.

## 10. OUTSTANDING DEBT — UNCHANGED, NOT CLOSED BY THIS REPORT

`F-12` **OPEN** · `EV-R02` open · `INV-08` **NOT_DERIVABLE** · Gate 3 and Gate 5 **OPEN** ·
`KORA-WP-117` Founder-deferred · `KORA-WP-133` READY but not authorized · registry
consistency checker not wired into CI.

Controlled Pilot data boundary remains **SYNTHETIC / ANONYMOUS / NON-LIVE**.

---

**CONTROLLED PILOT: NOT READY — R4 / R5 / R6 NOT VALIDATED, blocked by `CFG-01`
(staging Supabase environment variables branch-scoped to
`integration/r0a-ci-proof-2026-09-22`, absent on
`integration/kora-canonical-product-2026-09-22`).**

---

## 11. CFG-01 REMEDIATION ATTEMPT — 2026-09-24 — **NOT RESOLVED**

The Founder reported having manually configured the three required Supabase variables for
Preview on `integration/kora-canonical-product-2026-09-22`. Verification does **not** confirm
that configuration, and `CFG-01` remains **OPEN**. No requirement advanced.

### 11.1 Required variables — derived from code truth, not assumed

Every `process.env.*` reference in `lib/ app/ services/ components/ middleware.ts` at
`6bc22f5…` was enumerated (11 distinct names) and classified by failure mode. **Exactly three
hard-fail**; the other eight are platform-injected (`VERCEL`, `VERCEL_URL`, `VERCEL_ENV`,
`NODE_ENV`), already configured unscoped (`NEXT_PUBLIC_SITE_URL`), or safely defaulted
(`AUDIT_HASH_SALT` → `'kora-audit-salt'`, `NEXT_PUBLIC_KORA_ENV` → `'demo'`,
`NEXT_PUBLIC_KORA_PDF_ENABLED` → `=== 'true'`).

| Required variable | Enforcement site |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `lib/supabase/server.ts` (non-null assertion), `lib/supabase/client.ts` (throw) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | same |
| `SUPABASE_SERVICE_ROLE_KEY` | `lib/supabase/server.ts` — explicit `throw` |

### 11.2 Configuration state — read twice, byte-identical

| Variable | id | `target` | `gitBranch` | `updatedAt` |
|---|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `GEC4DBvRbLoHY5xj` | `preview` | `integration/r0a-ci-proof-2026-09-22` | **== `createdAt`** |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `0SZdGC3u9QkDWpbO` | `preview` | `integration/r0a-ci-proof-2026-09-22` | **== `createdAt`** |
| `SUPABASE_SERVICE_ROLE_KEY` | `WOMD5g55GJp8rRKL` | `preview` | `integration/r0a-ci-proof-2026-09-22` | **== `createdAt`** |

`updatedBy` is `null` on all three — **never edited**. A filtered read scoped to
`integration/kora-canonical-product-2026-09-22` returns **`[]`**. The project holds the same
**7** variables as before, no new entries. **1** project in the account, **0** custom
environments. No value was decrypted at any point.

### 11.3 Two deployments of the same exact SHA — both still fail

A listing alone was not treated as decisive, because this session's Vercel token returns
`403` on some endpoints (`get_runtime_logs`, `get_deployment` with an explicit `teamId`), so a
partial view was a live possibility. Two deployments were therefore run as ground truth.

| # | Deployment | Method | Env resolution | Result |
|---|---|---|---|---|
| 1 | `dpl_BnhA5EUts9LAPiUvo7EgeeVi66ko` | redeploy from `deploymentId` | **inherits the original snapshot** — inconclusive by construction | `READY`, DB surfaces **500** |
| 2 | **`dpl_An1mN4zdF33pxRDnPg7AKBVUREUn`** | **fresh `gitSource` build** | **re-resolves from current project config** | `READY`, DB surfaces **500** |

Both carry `githubCommitSha: 6bc22f5bae93270527b12f5b9d15b7997098db75` and `target: null`
(**Preview, not Production**). Deployment 2 is the decisive one: a fresh git-source build reads
current project configuration at build time, so inheritance cannot explain its failure.

An early smoke reading of "all 200" on deployment 1 was **discarded as a false positive** — the
API still reported `state: BUILDING`, so those 200s were Vercel's build-in-progress page, not
the application. Both deployments were re-probed only after the served HTML carried the app's
own markers.

### 11.4 Independent confirmation at the build layer

The fresh deployment's `/login` client bundle (14 chunks) contains **no**
`https://<ref>.supabase.co` literal, confirming `NEXT_PUBLIC_SUPABASE_URL` was unbound **at
build time**, not merely at request time.

### 11.5 Smoke test — deployment 2

| Surface | Status |
|---|---|
| `/` | **200** |
| `/login` | **200** |
| `/company/reports` | **500** |
| `/admin/companies` | **500** |
| `/admin/data-intake` | **500** |

The same exact split as before: no-auth/no-DB surfaces serve; every Supabase-dependent surface
fails. **CFG-01 CLOSED: NO.**

### 11.6 What to check

The configuration is not present in project `prj_eybQKAPKBzP6Jt2oYAOH1BfaBixO`. Most likely one
of: it was saved to a different environment (Production or All Environments rather than Preview
with this branch filter); the branch value carries a typo or a `refs/heads/` prefix; the
dashboard save did not commit; or it was applied to a different account or project. The
authoritative check is that a read filtered to
`integration/kora-canonical-product-2026-09-22` returns the three names — today it returns `[]`.

### 11.7 Validation harness — ready, not run

The R3/R4/R5/R6 runtime suite was authored and staged **outside the repository** (scratchpad
only, Product tree byte-clean at `6bc22f5…`, `git status` = 0 changes). Playwright artifacts are
disabled in its config — no trace, screenshot or video — so no password-bearing failure artefact
can be produced. It was **not executed**: running it against a deployment that 500s on every
authenticated surface would manufacture failures attributable to configuration, not Product.

### 11.8 Requirement matrix — unchanged

`R1` **PASS** (not re-run, per directive) · `R2` **PASS** · `R3` **PARTIAL** · `R4` **NOT
VALIDATED** · `R5` **NOT VALIDATED** · `R6` **NOT VALIDATED**.

Registry 219 remains unmodified. Gate 3, Gate 5, `F-12`, `KORA-WP-117`, `KORA-WP-133`
untouched. Production Vercel and Production Supabase never contacted. `main` unchanged.
---

## 12. CFG-01 PREVIEW SCOPE RECHECK — 2026-09-24 — **INVALID, STILL OPEN**

A second reconfiguration was reported. Metadata was verified first, as directed; it does not
pass, so **no deployment was created** and no runtime step ran.

### 12.1 Scope classification — **INVALID**

| Variable | Preview | Branch restriction | Applies to `integration/kora-canonical-product-2026-09-22` |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | YES | `integration/r0a-ci-proof-2026-09-22` | **NO** |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | YES | `integration/r0a-ci-proof-2026-09-22` | **NO** |
| `SUPABASE_SERVICE_ROLE_KEY` | YES | `integration/r0a-ci-proof-2026-09-22` | **NO** |

Neither acceptable configuration is present: there is **no** Preview-target Supabase variable
without a branch restriction (so not `GLOBAL_PREVIEW`), and **none** bound to the target branch
(so not `TARGET_BRANCH_PREVIEW`). A read filtered to the target branch returns **`[]`**.

**Permanence: future Preview branches automatically covered — NO.**

### 12.2 The decisive metadata fact

Across **three** consecutive byte-identical reads, all three records show
`updatedAt == createdAt` and **`updatedBy: null`**. These records have **never been edited since
creation**, and no new Supabase variable has been created. Whatever was changed did not reach
these records or this project.

### 12.3 The access-scope question is now closed

Earlier sessions could not exclude that this session's Vercel token held a partial view — it
returns `403` on `get_runtime_logs` and on `get_deployment` when an explicit `teamId` is named.
That is now resolved and the reads are **authoritative**:

- the token authenticates as the Founder's own account (`id Zgj2jL0ek4qVVqFl6jZ2zBII`), whose
  `defaultTeamId` **is** the project's owning account `team_mBK3qjnsK52b30CFvwPqzzDi`;
- the account is `version: "northstar"`, so an empty `list_teams` is the personal-account model,
  not absent membership;
- the account contains **exactly one project** and **zero custom environments**, so there is no
  other project or environment the configuration could have landed in;
- every existing variable carries `createdBy` = that same user id.

The earlier `403`s concern naming a team slug the token is not scoped to address, not project
access. **A read showing the variables absent is therefore evidence of absence**, and it was
independently corroborated in §11 by a fresh git-source build that still returned 500.

### 12.4 Hypothesis for the repeated mismatch — unverified, offered as a lead

The three records already exist with a branch restriction. Adding a *second* value for the same
key under a different branch scope is a distinct and easily-missed dashboard flow, and a
rejected duplicate-key save can look successful. This is a **hypothesis, not a finding** — it
was not verified and no cause is asserted.

The lower-risk action, and the one the directive already prefers as Option A, is to **edit the
three existing records and remove the branch restriction entirely**, yielding `GLOBAL_PREVIEW`:
every KORA Preview branch then receives staging Supabase automatically and `CFG-01` cannot recur
on the next integration branch. Success is confirmed when `updatedBy` becomes non-null and
`gitBranch` is absent on all three.

### 12.5 State

`CFG-01` **OPEN**. No deployment created in this recheck. Requirement matrix unchanged:
`R1` PASS · `R2` PASS · `R3` PARTIAL · `R4`/`R5`/`R6` NOT VALIDATED. Registry 219 unmodified.
---

## 13. CFG-01 FINAL PREVIEW SCOPE CHECK — 2026-09-24 — **STILL INVALID**

Read-only metadata check. It does not pass, so **no deployment was created**.

### 13.1 Variable metadata — **GLOBAL_PREVIEW: FAIL**

| Variable | Env | `gitBranch` present | Restriction | Applies to target branch | `updatedAt` | `updatedBy` |
|---|---|---|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Preview | **YES** | `integration/r0a-ci-proof-2026-09-22` | **NO** | 2026-09-22 19:32:11Z | **null** |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Preview | **YES** | `integration/r0a-ci-proof-2026-09-22` | **NO** | 2026-09-22 19:33:45Z | **null** |
| `SUPABASE_SERVICE_ROLE_KEY` | Preview | **YES** | `integration/r0a-ci-proof-2026-09-22` | **NO** | 2026-09-22 19:35:07Z | **null** |

All three still carry the branch restriction. `updatedAt` equals `createdAt` to the second on
each — they are **unchanged since 2026-09-22**, three days before this check.

Future Preview branches covered: **NO**. Production environment modified: **NO**. Production
Supabase contacted: **NO**.

### 13.2 A control proves the read reflects real edits

`NEXT_PUBLIC_SITE_URL` in the same project shows `createdAt` 2026-06-08 17:25:56Z and
`updatedAt` 2026-07-08 17:55:27Z with **`updatedBy` set**. So when a variable in this project is
genuinely edited, this API surfaces both a moved `updatedAt` and a populated `updatedBy`. The
three Supabase records show neither, across **four** byte-identical reads
(§11, §12 ×2, §13). Combined with §12.3's resolution of the access-scope question and §11's
fresh-build corroboration, the conclusion is not a reporting artefact: **the edits are not
reaching these records.**

### 13.3 A remedy that needs no secret

`edit_project_env` accepts `gitBranch: null` with `value` **omitted**. The branch restriction can
therefore be cleared as a **pure metadata edit on the existing record**, leaving the stored
encrypted value untouched and unread — which is exactly the operation blocked earlier when it
required *materializing* a secret, and is not blocked when it does not.

Three such edits (ids `GEC4DBvRbLoHY5xj`, `0SZdGC3u9QkDWpbO`, `WOMD5g55GJp8rRKL`) would yield
`GLOBAL_PREVIEW` directly. **Not performed — no authorization exists in this directive, which is
read-only-first and stops on a failed metadata check.** Recorded as an available option only.

### 13.4 State

`CFG-01` **OPEN**. No build. `R1` PASS · `R2` PASS · `R3` PARTIAL · `R4`/`R5`/`R6` NOT
VALIDATED. Registry 219 unmodified.
---

## 14. CFG-01 CLOSED — RUNTIME VALIDATION COMPLETE — 2026-09-24

> **CFG-01 CLOSED. All six Controlled Pilot requirements SATISFIED** on exact SHA
> `6bc22f5bae93270527b12f5b9d15b7997098db75`. Two limitations are disclosed in §14.6 and are
> **not** waived.

### 14.1 Metadata-only remediation — the fix

Founder-authorized in-place edit of the three **existing** records: `gitBranch → null`, **`value`
not passed**. No secret was read, printed, written, replaced or rotated.

| Variable | Record id | Edit |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `GEC4DBvRbLoHY5xj` | **YES** |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `0SZdGC3u9QkDWpbO` | **YES** |
| `SUPABASE_SERVICE_ROLE_KEY` | `WOMD5g55GJp8rRKL` | **YES** |

Verified by independent re-read: `gitBranch` **field absent** on all three, `target` `["preview"]`
only, `updatedAt` moved from 2026-09-22 to 2026-09-24, `updatedBy` populated. The two encrypted
records returned **byte-identical ciphertext** to the pre-edit reads — values preserved. Still 7
variables: no duplicate, no delete-and-recreate. **Classification: `GLOBAL_PREVIEW` — PASS.**
Future Preview branches are covered automatically, so `CFG-01` cannot recur on the next
integration branch. Production env unchanged; Production Supabase never contacted.

### 14.2 Deployment and CFG-01 smoke — **CLOSED**

**`dpl_35NCPdWS3rjkrhc6A4Hk472EvaMD`** — fresh **git-source** build (not `deploymentId`
inheritance), `githubCommitSha` `6bc22f5…`, `target: null` (**Preview**), `state: READY`.

| Surface | Before | After |
|---|---|---|
| `/`, `/login` | 200 | **200** |
| `/company/reports` | **500** | **307 → `/login?role_hint=company`** |
| `/admin/companies` | **500** | **307 → `/login?role_hint=admin`** |
| `/admin/data-intake`, `/company/data/upload` | **500** | **307** |

The 500s became correct **auth-guard redirects with role hints** — only possible with a live
Supabase binding. Independently confirmed at the build layer: the served client bundle now carries
**`https://haqflkurpmeaxpikozjl.supabase.co`** — the authorized **staging** project, **not**
Production `azdnepfmwrmacruykskm`. Previously **no** project host appeared in any chunk.

### 14.3 R3 — WP-132 remainder — **PASS**

| Check | Result |
|---|---|
| `/company/data/upload` resolves through the authenticated layout → `/company/data` | **PASS** |
| Company actor has no canonical ingestion path — retired endpoint answers non-JSON at `_not-found`, and Company cannot reach `/admin/data-intake` | **PASS** |
| `/admin/data-intake` is KORA-Admin-only, loads clean, zero page errors | **PASS** |
| Intake affordances present | `preview: true`, `upload: true`, `accept: true` |

**Disclosed scope:** the end-to-end **accept transaction was not executed against staging** — doing
so writes canonical ingestion state. That transaction is exercised by CI's *E2E golden path
(Playwright, local Supabase, seeded)* job, green on this exact SHA. Route authorization, affordance
presence and error-free load were verified at runtime; the write itself was not re-executed here.

### 14.4 R4 — methodology disclosure — **NOT APPLICABLE (ruling), no suppression defect**

| Question | Answer |
|---|---|
| Populated KORA Index disclosure | **NOT EXERCISED** — see §14.6 |
| Insufficient-data KORA Index rendered | **NO** |
| Disclosure applicability | **NOT APPLICABLE** — per the Founder ruling |
| **Suppression defect** | **NO** |

~~Both staging tenants return `insufficient_data`. Verified as canonical behaviour, not conditional
suppression: `analytics.kora_index_result` has no `is_current` row, so `koraIndex` is `null` and the
page renders the explicit empty state~~ — **PARTLY SUPERSEDED 2026-09-24, see §15.3.** The absence
of a row was real, but it was **not** the operative cause: `/company/reports` never queried the
database at all. The conclusions that the empty state is canonical and that there is **no suppression
defect** both stand; the stated mechanism was wrong. Original wording retained:
the page renders the explicit empty state *"Decision Pack non ancora disponibile"*. `KoraIndexHero` has
**exactly one call site** (`app/company/reports/page.tsx`), rendered **unconditionally** once
`output` exists, and `output` exists only when `status === 'ok'`. **There is no code path that
renders a KORA Index with any of the three disclosures stripped.** No KORA Index was invented to
display methodology labels.

### 14.5 R5 / R6 — bounded pilot-critical Admin — **PASS**

All eight bounded routes returned **200**, each landing on its expected path, with **zero**
uncaught page errors and correct KORA-Admin authorization: `/admin`, `/admin/companies`,
`/admin/companies?from=submissions`, `/admin/companies/new`, `/admin/data-intake`,
`/admin/uef-review`, `/admin/pipeline`, `/admin/impact-units`.

Workflow continuity:

| Leg | Result |
|---|---|
| Admin home Submission Queue → `/admin/companies?from=submissions` | **PASS** |
| Pilot Lifecycle Submission Queue → `/admin/companies?from=submissions` | **PASS** |
| Company context → `/admin/companies/[companyId]/submissions` | **PASS** — 200 on a real id, 17 companies listed |

**A vacuous pass was caught and corrected, twice.** First, a naive "first `/admin/companies/*`
link" selector matched the **static sibling route** `app/admin/companies/workforce-baseline` and
404'd on a `/submissions` child that route never had — recorded initially as a failure, then
identified as a **test defect, not a dead route** (`app/admin/companies/[companyId]/submissions/page.tsx`
exists). Second, after excluding the static siblings the test went **green while silently skipping
the company leg**, because the Gen3 surface links only to `/<id>/workspace|evidence|preview` and
never to a bare `/<id>`. Company ids were then derived from those child links and both
`/admin/companies/<id>` and `/admin/companies/<id>/submissions` were driven directly. **The reported
PASS is the third, non-vacuous run.**

`OBS-01` unchanged: cosmetic framework behaviour, no Product work, no ingestion code reachable.

### 14.6 Disclosed limitations — NOT waived

1. **R4 populated disclosure was never exercised at runtime.** Both authorized staging tenants
   return `insufficient_data`; no tenant carries a `kora_index_result` row. The non-suppressibility
   contract is proven at source by `tests/unit/controlled-pilot-methodology-disclosure.test.ts`
   (11 tests, green in CI on this SHA) and by the single-call-site analysis above — **that is a
   source-level proof, not the runtime exercise.** Closing it requires an operator-mediated intake
   plus a scoring run on a synthetic tenant, which exceeds this task's authorization.
2. **R3's accept transaction was not re-executed against staging** — see §14.3.

### 14.7 Six-condition Controlled Pilot matrix

| # | Requirement | Verdict | Evidence |
|---|---|---|---|
| 1 | Canonical CI green on the exact SHA | **SATISFIED** | run `36023646894`, 4/4 jobs `success`, `head_sha 6bc22f5…` (not re-run) |
| 2 | Staging deployment of the exact SHA, Preview not Production | **SATISFIED** | `dpl_35NCPdWS3rjkrhc6A4Hk472EvaMD`, `READY`, `target: null` |
| 3 | `KORA-WP-132` canonical intake actor model at runtime | **SATISFIED** | §14.3, 3/3 |
| 4 | Methodology disclosure | **SATISFIED** on applicable evidence | §14.4 — `NOT APPLICABLE` per ruling, suppression defect **NO**; limitation §14.6.1 |
| 5 | Bounded pilot-critical Admin workflow | **SATISFIED** | §14.5 — 8/8, 0 page errors |
| 6 | No unresolved pilot-critical dead Admin route | **SATISFIED** | §14.5 — continuity legs all resolve |

**CFG-01: CLOSED.**

### 14.8 Safety

Product code unchanged; Product SHA `6bc22f5…`, worktree byte-clean. No migration, no RLS change,
no `main` merge, no Production deployment, no Production Supabase access. Gate 3, Gate 5, `F-12`,
`KORA-WP-117`, `KORA-WP-133` untouched. No real employee data, no pseudonymous data, no
customer-live activity — synthetic staging tenants only. Validation harness lived in scratchpad
only. Playwright trace/screenshot/video were disabled; the runner nonetheless emitted
`error-context.md` aria snapshots on failure, which were found to contain password- and
email-pattern matches and were **deleted immediately** under the standing sensitive-artifact rule,
and purged after every subsequent run.
---

## 15. FINAL METHODOLOGY RUNTIME PROOF — 2026-09-24 — **R4 = PASS**

> **The populated KORA Index disclosure is now proven at runtime on exact SHA
> `6bc22f5bae93270527b12f5b9d15b7997098db75`.** The §14.6.1 limitation is **CLOSED**. One new
> Product observation (`OBS-02`) is recorded, not fixed.

### 15.1 Synthetic populated fixture

| Property | Value |
|---|---|
| Tenant | **`STAGE-002`** — "KORA Test Company B S.r.l.", `01e29991-686d-45dd-8ec6-3951d7debf9b` |
| Provenance | **Pre-existing** synthetic staging fixture — **reused, not created** (audit action `tenant_reused`) |
| Reporting period | **`2026-Q1`** |
| Canonical pipeline | `POST /api/admin/operator-flow` — KORA_ADMIN-only; tenant reuse → workforce baseline → source batch → uploaded records → UEF classification → **`runKoraPipeline`** → **`persistKoraComputationResult`** → Decision Pack → audit |
| Synthetic / anonymous | **Confirmed** — built-in `getOp001SyntheticRecords`, pseudonym prefix `PSY-OP-STAGE-002-`, every audit payload carries `synthetic_test: true`, `pii_guard` `checked: true` / `pii_found: false`, `n_threshold: 10`, `segment_breakdown_safe: true` |

**No row was fabricated.** The index came from the real scoring engine (`"mode": "computed"`); no
methodology, calibration or scoring input was altered. No cleanup was performed — the fixture stays
in place, clearly marked synthetic.

### 15.2 Canonical persistence — verified before and after

| | Result |
|---|---|
| Before | `GET /api/admin/operator-flow?tenantCode=STAGE-002&reportingPeriod=2026-Q1` → **`{"ok":false,"status":"no_result"}`** |
| Run | **HTTP 200** — `kora_index_value 33.35`, `safeguard CLEAR`, `confidence_score 63`, `activation_rate 1`, `meaningful_activation_rate 0.68` |
| Persisted ids | `kora_index_result_id` **`2d9053b6-cfef-4934-8bd6-670308975bb4`**, plus `activation_result`, `confidence_result`, `bti_result`, `decision_pack_version 2026-Q1-v1790278360407` (draft) |
| After | **`is_current: true`**, `calibration "pre_empirical_calibration"`, `methodology "KORA Index v1.0"`, `component_count 10`, `created_at 2026-09-24T19:32:39Z` |

Canonical persistence is `analytics.kora_index_result`, confirmed against code truth
(`persistKoraComputationResult`, and the `GET` handler's own query) rather than assumed.

### 15.3 A correction this proof forced

§14.4 stated the empty state was canonical **because** `analytics.kora_index_result` had no
`is_current` row. The row was genuinely absent — the `no_result` baseline above proves it — **but
that was not the operative cause.** `/company/reports` calls `useScoringResult` **without**
`forceEnvironment`, so it resolves the demo-state environment, which defaults to `'demo'`, and the
demo branch returns `insufficient_data` **synchronously without ever querying the database**.

The two substantive conclusions of §14.4 are unaffected: the empty state is canonical, and there is
**no suppression defect**. Only the stated mechanism was wrong, and it is corrected here rather than
quietly rewritten.

### 15.4 `OBS-02` — `/company/reports` is demo-pinned for Company users — **recorded, not fixed**

`lib/demo-state/index.ts` initialises `activeEnvironment` to `'demo'`, and
`shouldShowDemoControls()` grants the environment switcher **only** to an unauthenticated visitor or
`KORA_ADMIN`. A real `COMPANY_ADMIN` therefore has no way to reach `'live'` on `/company/reports`,
so that surface shows *"Decision Pack non ancora disponibile"* **irrespective of real data** — while
`resolveBannerEnvironment()` forces the banner to read **LIVE** for that same user.
`app/company/kora-index/page.tsx` does pass `forceEnvironment: 'live'`; `app/company/reports/page.tsx`
does not.

**Not adjudicated here, and not fixed** — no Product change is authorized in this task. It is **not**
a dead route (200, no errors) and **not** a disclosure defect: the KORA Index and all three
disclosures are reachable and correct on the live surface. Recorded for Founder adjudication.

### 15.5 R4 runtime result — on the live Company KORA Index surface

Company `STAGE-002` user, `/company/kora-index`, exact SHA `6bc22f5…`, deployment
`dpl_35NCPdWS3rjkrhc6A4Hk472EvaMD`:

| Check | Result |
|---|---|
| KORA Index rendered | **PASS** — `33 /100`, matching persisted `33.35`; banner `DATI LIVE`; no pending/empty state |
| `calibration_status` | **PASS** — `pre_empirical_calibration`, plus a `CALIBRAZIONE` panel |
| `methodology_version_id` | **PASS** — `KORA Index v1.0` |
| Confidence Score | **PASS** — `CONFIDENCE SCORE™ 63%`, matching persisted `63`, labelled *"Esterno al KORA Index™ · peso = 0"* |
| Activation Safeguard | present — `Clear`, matching persisted `CLEAR` |
| Non-suppressible | **PASS** — all three rendered together on the populated index |
| 404 / 5xx / pageerror | **none / none / none** |

**This is not a vacuous pass:** the rendered index value, Confidence Score and Safeguard status each
match the values the canonical pipeline persisted seconds earlier, and the page reports `DATI LIVE`.

### 15.6 Final R4 classification — **PASS**

- insufficient_data → **NOT APPLICABLE** when no index exists (ruling retained)
- populated index → **PASS**
- suppression defect → **NO**
- runtime methodology disclosure → **VERIFIED**

Evidence chain now complete: **source structural proof** (single call site, unconditional render) +
**mutation proof** (11 tests, green in CI on this SHA) + **exact-SHA populated runtime proof** (§15.5).

### 15.7 Final six-condition Controlled Pilot matrix

| # | Requirement | Governing source | Evidence | Nature | Status |
|---|---|---|---|---|---|
| 1 | `KORA-WP-132` = `COMPLETE` | Registry 219 §AJ | report `260`, commit `459a0ec1799cdb34c1c532842f147df076a604d3`; actor model re-verified at runtime on `6bc22f5…` (§14.3) | source + runtime | **SATISFIED** |
| 2 | `R0-A` = `R0_COMPLETE` | Registry 219 §AI | report `245`, commit `ec0ff4546fdf8bc06f3b76e59f66a1b4ebaa1528` | CI / infrastructure | **SATISFIED** |
| 3 | `R0-B` = `R0_COMPLETE` | Registry 219 §AI | report `243` | governance declaration | **SATISFIED** |
| 4 | `R0-C` = `R0_COMPLETE` | Registry 219 §AI | report `256`, exact-SHA `1e981f8067c388fc14ed3ea44f650cf2cf763a39` | runtime | **SATISFIED** |
| 5 | Methodology disclosure verified present | Registry 219 §AJ · CLAUDE.md §6/§17 | §15.5 on `6bc22f5…` / `dpl_35NCPdWS3rjkrhc6A4Hk472EvaMD`, backed by §15.2 persistence | **runtime** | **SATISFIED** |
| 6 | No unresolved pilot-critical dead Admin route in a primary workflow | Registry 219 §AJ (`KORA-WP-070` / `KORA-WP-127`) | §14.5 — 8/8 Admin routes 200, 0 page errors, both Submission Queue entry points and the company-context leg resolving | **runtime** | **SATISFIED** |

**6 / 6 SATISFIED.**

### 15.8 Authorized data boundary

Controlled Pilot readiness is limited to **SYNTHETIC / ANONYMOUS / NON-LIVE** staging. It does
**not** imply Paid External Pilot readiness, Production readiness, or any authorization for
pseudonymous, real-employee or customer-live data. Gate 3 and Gate 5 remain **OPEN**, `F-12` remains
**OPEN**, `KORA-WP-117` remains Founder-deferred, `KORA-WP-133` remains READY and unauthorized.

**CONTROLLED PILOT: CLOSED — READY FOR AUTHORIZED SYNTHETIC / ANONYMOUS / NON-LIVE PILOT**

**END OF 261**
