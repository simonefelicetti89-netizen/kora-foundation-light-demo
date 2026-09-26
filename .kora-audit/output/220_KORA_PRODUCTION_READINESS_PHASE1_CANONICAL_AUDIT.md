# 220 — KORA Production Readiness Phase 1: Canonical Release Readiness Audit

**READ-ONLY. No merge, no deploy, no push, no Production contact, no Vercel or Supabase mutation,
no code/test/migration change. Only this report written.**

---

## 1. Executive verdict

### **C — NOT READY: REMEDIATION REQUIRED.**

The remediation is **environment configuration and missing CI evidence — not code.** The codebase
itself is in good shape: the release candidate is a clean fast-forward descendant of `main`, the
deferred Living KORAL renderer is provably excluded, staging fixtures are structurally isolated from
every runtime path, and a Preview build exists for the exact advanced HEAD.

Three findings drive the verdict, two of them **new to this audit**:

1. **The Vercel/Supabase scoping concern is no longer an inference — it is structurally confirmed.**
   Live project metadata shows **one** `NEXT_PUBLIC_SUPABASE_URL` entry with
   `target: ["production","preview"]`, `customEnvironmentIds: []`, and
   **`hiddenProductionEnvCount: 0`**. A single entry cannot hold two different values for two
   targets, and there is no production-only override. The deployed Preview bundle demonstrably
   resolves to **staging** `haqflkurpmeaxpikozjl`. **Production would therefore receive the staging
   project.** Same shape for the anon key, the service-role key and the site URL.
2. **CI has almost certainly never run on any of these 85 commits.** `.github/workflows/ci.yml`
   triggers only on `pull_request: [main]` and `push: [main]`. The advanced branch has never been
   merged to `main` and no PR targets it. Every prior report's reliance on "CI performs fresh
   migration-chain validation" therefore rests on a gate that **has not fired for this work**.
3. **Three environment variables the app reads are absent from the Vercel project entirely** —
   `AUDIT_HASH_SALT`, `NEXT_PUBLIC_KORA_ENV`, `NEXT_PUBLIC_KORA_PDF_ENABLED`.

None of this is a code defect. All three are closable before a Release Candidate.

## 2. Canonical baseline

Formal Consolidation Audit `217` (verdict B, accepted) · Registry `219` superseding `142`, 124 WPs ·
mechanical state COMPLETE 54 / READY 36 / BLOCKED 34 / TOTAL 124 · `KORA-WP-124` canonical, **READY,
NOT activated** · PX-B/PX-C non-canonical, unnumbered, not started.

## 3. Release candidate identity

| Field | Value |
|---|---|
| Branch | `feature/wp016-structured-spine-normalized-evidence` |
| HEAD | `53c643f7719e7dcf2d6a165ac2f10f0b243e8563` |
| `origin/main` | `70c4cfa0dfa36d8697d8f76a3a7df8a5bf530adc` |
| Merge-base | `70c4cfa0…` — **identical to main** |
| Ahead / behind | **85 / 0** |
| Clean descendant of main | **YES** — fast-forward merge is possible |
| Divergent commits on main | **none** |
| Worktree | clean |

## 4–5. `main` → advanced delta and commit grouping

**471 files changed, +55,196 / −2,370, across 85 commits.** This is not a four-WP release: `main`
predates migration `050`. Grouped by conventional-commit scope:

| Group | Commits | Character |
|---|---|---|
| Advisor domain (`feat/fix:advisor`) | 12 | identity, assignment, portal, appointments, content taxonomy |
| Living KORAL substrate (`feat:living-koral`, `feat:wp-111`) | 8 | WP-111–116 semantic/morphological chain |
| Security / RLS / auth (`fix:security`, `fix:rls`, `fix:auth`, `refactor:auth`) | 7 | hardening and the Advisor role-home fix |
| Design system / UI (`feat/fix/refactor/test:design`, `feat:ui`) | 10 | WP-047 / WP-073 / WP-088 |
| Review, needs, investment, ingestion, platform, admin | 13 | domain packages |
| E2E / test / ops / governance | 9 | fixtures, guards, playbooks |
| Remainder | 26 | single-scope domain commits |

Largest touched areas: `tests/unit` (78 files), `app/admin` (58), `supabase/migrations` (40),
`app/company` (34), `app/api` (25).

**No commit appears unrelated, experimental, accidental or worktree-specific.** Every commit maps to
a numbered WP or to governed test/fixture infrastructure.

## 6. Migration inventory — 40 migrations, `050` → `089`

All 40 are **additions** (`git diff --name-status` reports `A` for every one); no migration file in
the delta is modified or deleted. Owners span WP-014 through WP-016 plus the Living KORAL chain and
the Morphology Package A remediations.

**Idempotency scan across all 40:** exactly **one** migration contains an unguarded
`ADD COLUMN` / `CREATE TABLE` — **`086_koral_review.sql`, with two unguarded `ADD COLUMN`s**. Every
other migration in the delta uses `IF NOT EXISTS` guards throughout.

| Class | Items |
|---|---|
| RELEASE BLOCKER | none intrinsic to the migrations themselves |
| RELEASE CHECK | from-zero chain execution for the exact HEAD (§8); Production schema state (§9) |
| NON-BLOCKING DEBT | `086` idempotency (§7) |

## 7. Migration 086 — corrected analysis

Report `217` flagged 086's `DROP CONSTRAINT` without `IF EXISTS`. **That framing is refined here:**

1. **Fresh one-time application to Production is safe.** The constraint
   `operational_case_linked_object_type_check` is created by migration **`061`**, which is in the same
   delta and always runs first. On a 001→089 chain, the `DROP` always finds its target. **Safe.**
2. **The `DROP`/`ADD CONSTRAINT` pair is in fact effectively re-runnable** — after 086 runs, the
   constraint exists again, so a second run drops and re-adds it successfully.
3. **The real non-idempotency is elsewhere in 086:** two unguarded
   `ALTER TABLE advisor.advisor_content_record ADD COLUMN …` statements, which would fail on re-run.
4. **Production's current schema cannot make 086 fail** *provided* `061` has been applied — which the
   chain guarantees, since Production has never received any of these migrations (§9).
5. **No remediation migration is needed before release.** Supabase's migration ledger applies each
   file once; re-run is not a normal operational path.
6. **Confirmed NON-BLOCKING DEBT** — with the note that the sharper statements are the `ADD COLUMN`s,
   not the `DROP CONSTRAINT` that `217` named.

## 8. From-zero migration chain — evidence status

**No authoritative from-zero evidence exists for the advanced HEAD.**

The CI DB-backed gate (`ci.yml:66`) does run `supabase start`, which applies every tracked migration
fresh — but **`on: pull_request: [branches: main]` / `push: [branches: main]` means it has never
fired for this branch.** WP-016's own local validation applied `089` onto a DB already at `088`
(disclosed in reports 213/214/216) and is explicitly **not** a substitute.

**Classification: REQUIRED BEFORE RELEASE.** How to obtain it, cheapest first: **open a
draft/real PR from the advanced branch to `main`** — a PR triggers the full CI matrix (unit,
typecheck, lint, the mandatory Docker/Supabase DB-backed gate, e2e-smoke, e2e-golden-path-local)
**without merging anything**. That single action converts the largest evidence gap in this audit into
recorded evidence.

> `gh` CLI is not installed in this environment, so CI run history could not be queried directly.
> The conclusion above rests on the workflow's own trigger configuration, which is dispositive.
> **External confirmation of "zero CI runs on this branch" is a recommended cross-check.**

## 9. Production schema state

**UNKNOWN — and that is itself informative.** No Production DB was contacted. From repo and audit
evidence: Gate 2 authorised the **staging** project only; production SQL has been blocked throughout
by Gates 3 and 5; every migration in the delta is marked "NOT applied to staging or production by
this migration file"; and **no Vercel deployment in the project's recent history has
`target: "production"`** (all are Preview), with the project reporting `live: false`.

The reasonable working hypothesis is that **Production has never received any migration from this
delta, and may never have been deployed at all** — but this is inference, not proof.

**Required pre-rollout verification:** production migration history, current schema version, the
expected unapplied set, drift, existing constraints, and RLS state. Until that is read, the
40-migration rollout size is unknown in practice.

## 10. Security / RLS release review

Security-relevant content in the delta: new tables across `050`–`089` (company memberships,
governance-event substrate, Company-scoped RLS foundation, Investment, advisor identity/assignment,
operational case, commitment, review, policy config, fee events, idempotency, program skeleton,
Living KORAL chain), plus grants, the Advisor role-home fix and the Investment flexible edge.

Existing validation evidence: RLS-03 two-tenant negative **27/27** on real Postgres with `089`
applied; per-WP RLS suites; Company-scoped Pattern A applied consistently; `089` adds no policy, no
grant and no tenant-ownership change. **No security release blocker identified in the code.**

**Requires revalidation before Production:** the whole security suite against the exact release
candidate via CI (§8) — because it has never run there — and RLS behaviour against the real
Production schema once its state is known.

## 11. Auth / role review

Five canonical role environments (Admin, Company, Worker, Partner, Advisor) intact per WP-073's
`CURRENT_FIVE_ENVIRONMENT_ARCHITECTURE`. The WP-088 fix `getRoleHome('ADVISOR') → /advisor` is
present and correct; unknown/retired roles fail closed to `/login`. The authenticated 15/15 matrix
(5 roles × 3 viewports) exercised every role's post-login landing with **no redirect loop**.
**No staging fixture assumption reaches Product auth** — see §12.

## 12. Staging fixture isolation — **PASS**

`scripts/e2e/provision-staging-e2e-fixtures.ts` is referenced by **nothing except its own two test
files** — no migration, no seed, no `package.json` script, no CI workflow, no runtime path. It is not
Product bootstrap behaviour and cannot be invoked incidentally.

Its guards are hard-coded and named, not heuristic: `ALLOWED_STAGING_REF = 'haqflkurpmeaxpikozjl'`,
`DENIED_PRODUCTION_REF = 'azdnepfmwrmacruykskm'`, the URL host must equal
`${E2E_STAGING_PROJECT_REF}.supabase.co`, and `E2E_STAGING_FIXTURE_CONFIRM` must equal exactly `YES`.
Cleanup now fails closed on incomplete env. **Fixtures cannot be seeded in Production.**

## 13. E2E target safety — **PASS**

`tests/e2e/helpers/e2e-safety.ts` exists specifically to close the weakness that
`E2E_ALLOW_PRODUCTION=true` alone could unblock any target: it maintains
`KNOWN_PRODUCTION_HOSTNAMES`, requires an explicit `E2E_ALLOWED_STAGING_HOSTS` entry, and treats
`E2E_ALLOW_PRODUCTION=true` as **never sufficient** on its own — a production host additionally
requires the deliberately conspicuous
`E2E_CONFIRM_PRODUCTION_AUTH_E2E_I_UNDERSTAND=true`. The guard is **fail-closed**. No E2E command can
accidentally target Production.

## 14. Build / deployment evidence — **a Preview EXISTS for the exact HEAD**

`dpl_4DAuDoMR3NnTFxop9GCXe99dywgK` · `githubCommitSha = 53c643f7719e7dcf2d6a165ac2f10f0b243e8563` ·
state **READY** · `target: null` (Preview). **The release candidate builds and deploys successfully.**

All eight most recent deployments are Preview (`target: null`); **none is a production deployment.**

## 15. Vercel / Supabase scoping — **RELEASE BLOCKER, CONFIRMED**

Live, read-only project metadata (`prj_eybQKAPKBzP6Jt2oYAOH1BfaBixO`), no values read:

- **7 environment variables total**, every one `type: "sensitive"`, every one a **single entry with
  `target: ["production","preview"]`**, every one `customEnvironmentIds: []`.
- **`hiddenProductionEnvCount: 0`** — there is no production-only variable withheld from the listing.
- The deployed Preview bundle resolves to **staging** `haqflkurpmeaxpikozjl` (verified earlier this
  session by reading the published JS chunk).

A single variable entry holds a single value. With no production-scoped override and no custom
environment, **Production necessarily receives the same value Preview receives — the staging
project.** This is now a structural conclusion, not a guess. Values remain unread; no secret is
exposed anywhere in this audit.

**Remediation required before any Production deploy:** create **production-scoped** entries for
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` and
`NEXT_PUBLIC_SITE_URL` pointing at `azdnepfmwrmacruykskm`, and re-scope the existing entries to
`preview` only. **This audit performs no such change.**

> **Tooling note:** the Vercel MCP answered project-scoped reads without a team ID but returned
> `403 Forbidden` when scoped to `team_mBK3qjnsK52b30CFvwPqzzDi`. Per instruction, no time was spent
> repairing it, and it is **not** treated as a Product/release blocker. What must be confirmed
> externally through the correct connector: (a) the literal values behind the four variables above,
> (b) whether any production-scoped variable exists outside this project's listing, (c) Deployment
> Protection settings for the Production target.

## 16. Environment-variable scope matrix

| Variable | Expected Preview | Expected Production | Current scope known | Risk |
|---|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | staging `haqf…` | production `azdn…` | **YES — single entry, both targets** | **BLOCKER** |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | staging | production | **YES — single entry, both targets** | **BLOCKER** |
| `SUPABASE_SERVICE_ROLE_KEY` | staging | production | **YES — single entry, both targets** | **BLOCKER** |
| `NEXT_PUBLIC_SITE_URL` | preview URL | production domain | **YES — single entry, both targets** | **BLOCKER** |
| `AUDIT_HASH_SALT` | set | set | **NO — absent from the project** | **MUST-FIX** — read by app code |
| `NEXT_PUBLIC_KORA_ENV` | set | set | **NO — absent** | **MUST-VERIFY** |
| `NEXT_PUBLIC_KORA_PDF_ENABLED` | optional | optional | **NO — absent** | RELEASE CHECK (feature flag) |
| `UPSTASH_REDIS_REST_URL` / `_TOKEN` | set | set | YES — both targets | RELEASE CHECK — rate-limit backend shared across envs |
| `SECURITY_RATE_LIMIT_PROVIDER` | set | set | YES — both targets | RELEASE CHECK |
| `VERCEL`, `VERCEL_ENV`, `VERCEL_URL` | platform-injected | platform-injected | n/a | none |

No value was read, printed or stored.

## 17. CI / quality-gate matrix

| Gate | Status | Ran on advanced HEAD? |
|---|---|---|
| Unit regression (`vitest`) | PRESENT + MANDATORY | **NO** (local only: 419 files / 13381 passed) |
| Typecheck | PRESENT + MANDATORY | **NO** (local clean) |
| Lint | PRESENT + MANDATORY | **NO** (local clean on touched files) |
| DB-backed gate — RLS-03/05/06 + KORA Link behavioural (Docker/Supabase, non-skippable) | PRESENT + MANDATORY | **NO** |
| From-zero migration chain (inside `supabase start`) | PRESENT + MANDATORY | **NO** |
| `e2e-smoke` | PRESENT | **NO** |
| `e2e-golden-path-local` | PRESENT | **NO** |
| Security workflow | PRESENT | **NO** |
| Design-system / a11y / responsive guards | PRESENT (inside unit suite) | **NO** in CI; local green |
| Production build | not a separate gate; Vercel Preview build is the evidence | **YES** — Preview READY for `53c643f7` |

**GATE EXISTS ≠ GATE PASSED.** For this release candidate, every mandatory gate is in the first
column and none in the second, because the workflow triggers only on `main`.

## 18. Deferred Living KORAL exclusion — **VERIFIED EXCLUDED**

The rejected renderer bucket is **absent from the release candidate**: `svg-renderer.ts`,
`morphology-engine.ts`, `visual-grammar.ts`, `implicit-field.ts`, `renderer-types.ts`,
`mark-service.ts`, `app/api/company/living-koral/mark/`, and
`tests/unit/kora-wp-117-koral-mark-renderer.test.ts` are all `ABSENT` from `HEAD` and exist **only as
untracked files in the dirty `audit/mega-code-truth-2026-09` worktree**, which was not modified,
cleaned or moved.

The **stabilized substrate is present and valid**, exactly as authorised: both named substrate
commits `b78bcf18…` and `a9a0f0e2…` are in the release ancestry, and the substrate modules
(`bounded-geometry-types`, `brand-safety`, `expression-projection`, `geometry-service`,
`morphological-compression`, `accessible-description`, `edition-lineage-service`, `types`) are
**library-only — no `app/` or `components/` file imports `living-koral-mark`**, so nothing in the
substrate is reachable from a route in Production.

## 19. WP-124 / Product Experience boundary

`KORA-WP-124` is canonical, mechanically READY, **not activated**. Nothing in this audit started it,
generated visual direction, produced mockups, changed typography or redesigned any page.

**Is any current UI defect severe enough to require PX before the technical release? No — on
evidence.** `KORA-GAP-DESIGN-001` and `KORA-GAP-RESPONSIVE-001` are CLOSED; the authenticated 15/15
matrix passed across 5 roles × 3 viewports; a11y baseline closed by `047`/`073`. The open gap is
*absence of designed intent*, not defects. **PX remains required before commercial/GA visual
readiness, and not required before the next technical Production release.**

## 20. Release integration strategy — recommendation

### **B — dedicated release/integration branch.**

`main..advanced` is a fast-forward, so option A (direct merge) is mechanically possible — but with
**85 commits, 40 migrations and 471 files**, and with **Vercel configured to deploy `main` to
Production automatically**, merging to `main` would be simultaneously the integration act, the
validation act and the production-deploy trigger. That is three irreversible things at once.

A release branch (e.g. `release/rc-2026-09`) cut from `53c643f7` lets the full CI matrix, the
from-zero chain, a Preview for the exact RC SHA and the authenticated smoke matrix all run **before**
anything touches `main`, and leaves `main` as a one-step, already-validated fast-forward. It also
gives a stable SHA to name in the rollback plan.

## 21. Release Candidate validation plan (ordered, executable)

1. Cut `release/rc-2026-09` from `53c643f7719e7dcf2d6a165ac2f10f0b243e8563`. *(Git only; no merge.)*
2. **Open a PR from the RC branch to `main`** — triggers the entire CI matrix **without merging**.
   This is the single highest-value step in this plan.
3. Confirm CI: unit regression, typecheck, lint, **DB-backed gate**, **from-zero migration chain
   001→089**, `e2e-smoke`, `e2e-golden-path-local`, security workflow — all green on the RC SHA.
4. Verify a Vercel **Preview exists for the exact RC SHA** and is READY.
5. **Remediate environment scoping** (§15) — production-scoped Supabase URL / anon key /
   service-role key / site URL pointing at `azdn…`; existing entries re-scoped to `preview`.
   *Separate Founder authorization required.*
6. Add the **missing variables** `AUDIT_HASH_SALT`, `NEXT_PUBLIC_KORA_ENV`, and
   `NEXT_PUBLIC_KORA_PDF_ENABLED` if required, on both targets as appropriate.
7. **Read Production's migration state** (§9) and compute the exact unapplied set and any drift.
8. Take the **pre-migration checkpoint** (§22) and confirm restore is available.
9. Run the **authenticated smoke/E2E matrix** against the RC Preview: 5 roles × 3 viewports (375 /
   768 / 1440), plus role-home routing per role.
10. Run **fixture cleanup + `verify`** against staging; confirm Partner ephemeral removed, Advisor
    persistent intact.
11. Confirm **no deferred Living KORAL renderer file** in the RC tree (repeat §18's check on the RC SHA).
12. Confirm **no secret committed** in the 85-commit delta.
13. Only then: Founder authorises fast-forward of `main` to the RC SHA, migration rollout, and deploy.

Steps 1–4 and 9–12 are validation; steps 5–8 change or read environments and each needs its own
explicit authorization.

## 22. Rollback strategy

**Application rollback: straightforward.** Vercel keeps every prior deployment; a previous Production
deployment can be promoted. Since **no production deployment currently exists**, the first release has
no application rollback target — which is itself a reason to treat it as a first-deploy, not a
rollback-protected change.

**Database rollback: not symmetric, and this is the real risk.** Of the 40 migrations, the
overwhelming majority are additive/expand-only (`ADD COLUMN IF NOT EXISTS`, `CREATE TABLE IF NOT
EXISTS`, new policies). Additive migrations are **not trivially reversible in a way that preserves
data**, and the repo's rollback artifacts are commented blocks, not executable down-migrations
(`supabase/rollback/` covers 029–048 only; **there is no rollback artifact for `049`–`089`**).

**Therefore: forward-fix is the correct model, not down-migration.** Required before rollout: a
verified Production database backup/restore point immediately before the first migration, its restore
path tested, and a named decision-maker for invoking it. A Git revert alone is insufficient once
schema has advanced.

## 23. Post-deploy smoke plan (run only after separately authorized deployment)

Public landing and `/login` reachable · authenticate KORA Admin, Company, Worker, Partner, Advisor ·
role-home routing correct for each (Admin → `/admin`, Company → `/company/workspace`, Worker →
`/worker/onboarding`, Partner → `/partner/workspace`, Advisor → `/advisor`) · one safe read path per
role · **no write path on the first pass** unless explicitly authorized and reversible · confirm the
running app reports the **production** Supabase project, not staging · zero unexpected browser console
errors · zero server 5xx in Vercel runtime logs · confirm **no staging fixture identity exists in
Production** (`kora-admin@staging.kora.internal`, `worker-a@staging.kora.internal`, the Partner anchor
and the Advisor fixture must all be absent).

## 24. Classified findings

| Finding | Class |
|---|---|
| Vercel env vars single-scoped across Preview+Production; Production would target staging Supabase | **RELEASE BLOCKER** |
| No CI run — and therefore no from-zero migration-chain evidence — for the advanced HEAD | **RELEASE BLOCKER** |
| `AUDIT_HASH_SALT` absent from the Vercel project but read by app code | **MUST-FIX BEFORE MERGE** |
| Production migration state UNKNOWN | **MUST-VERIFY BEFORE MERGE** |
| No verified Production backup/restore point before a 40-migration rollout | **MUST-VERIFY BEFORE MERGE** |
| No executable rollback artifacts for migrations `049`–`089` | **MUST-VERIFY BEFORE MERGE** (adopt forward-fix explicitly) |
| `NEXT_PUBLIC_KORA_ENV` absent from the project | **RELEASE CHECK** |
| `NEXT_PUBLIC_KORA_PDF_ENABLED` absent (feature flag) | **RELEASE CHECK** |
| Upstash/rate-limit vars shared across both targets | **RELEASE CHECK** |
| Preview build exists and is READY for the exact HEAD | **PASS** |
| Deferred Living KORAL renderer excluded; substrate library-only, unrouted | **PASS** |
| Staging fixture isolation | **PASS** |
| E2E production-target safety (fail-closed) | **PASS** |
| Clean fast-forward topology, no divergence on main | **PASS** |
| Migration `086` idempotency (two unguarded `ADD COLUMN`s) | **NON-BLOCKING DEBT** |
| Audit-corpus fragmentation | **NON-BLOCKING DEBT** |
| Vercel MCP team-scope 403 | **NON-BLOCKING DEBT** (tooling) |
| Product Experience / WP-124 pathway | **POST-RELEASE FOLLOW-UP** (required before GA, not before technical release) |

## 25. Current readiness

### **C — NOT READY: REMEDIATION REQUIRED**

Two release blockers stand: a confirmed environment-scoping misconfiguration that would point
Production at the staging database, and a complete absence of CI evidence for 85 commits and 40
migrations. Neither is a code defect, and both have short, well-defined closure paths — but calling
this B ("ready after specific verifications") would misdescribe work that requires *changing*
configuration and *generating* evidence, not merely checking it.

## 26. Founder decisions / actions required next

1. **Authorize opening a PR** from the release candidate to `main` (no merge) to trigger the full CI
   matrix — the fastest way to close the largest evidence gap.
2. **Authorize the Vercel environment remediation** (§15): production-scoped Supabase variables, and
   existing entries re-scoped to `preview`.
3. **Authorize a Production Supabase read** to establish migration state and drift (§9).
4. **Decide the integration strategy** — this audit recommends a dedicated release branch (§20).
5. **Authorize a Production backup/restore checkpoint** before any migration rollout, and ratify
   **forward-fix** as the database recovery model (§22).
6. Confirm the three missing environment variables' intended values and targets (§16).
7. Note for external confirmation via the correct Vercel connector: the literal values behind the four
   Supabase/site variables, any production-scoped variable outside this project's listing, and
   Production Deployment Protection settings.

## 27. Boundary attestations

No merge, no deploy, no push, no promotion. No Production contact of any kind — the Production
Supabase project was never queried, and no Vercel or Supabase configuration was modified. No staging
mutation. No Product code, test or migration change. No Git history change (`git fetch` only). No
WP-124 implementation. No Living KORAL work; the dirty worktree was read for separation evidence only
and was not cleaned, moved or modified. No secret value was read, printed or stored.
`scripts/provision-next-review.mjs` was never addressed by any command.

---

**Report 220 · Production Readiness Phase 1 · Verdict C · 2 release blockers, both configuration/evidence, neither code**
