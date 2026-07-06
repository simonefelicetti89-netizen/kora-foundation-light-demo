# KORA Gate 2 External Review Pack

> Archived: canonical Gate 2 status now lives in docs/GATE2_STATUS.md.

**Document:** `docs/gate-2-external-review-pack.md`  
**Prepared:** 2026-06-21  
**Branch:** `main` — HEAD `088f3c4` — synchronized with `origin/main`  
**Gate status:** Gate 2 OPEN (CTO review required before staging provisioning)  
**Replaces:** previous version at commit `979ad7e` (2026-05-29 — now stale)  
**Primary SQL artifact:** `docs/GATE2_SQL_REVIEW_PACK.md`

---

## 1. Review Purpose

This is a **Gate 2 CTO/technical architecture review.**

It is explicitly **not:**
- A product demo review
- A methodology validation review (weights are pre-empirical; Delphi Study is post-pilot)
- A DPO/legal review (that is Gate 3, a separate process)
- Permission to apply migrations to any database
- Permission to provision a Supabase project

It **is** preparation for staging readiness. Gate 2 closes when the CTO has reviewed the SQL/RLS/auth design and confirmed that the migration set is safe to apply to a staging environment.

**The single most important rule:** do not apply any migration, do not run `supabase db push`, do not provision any Supabase project as part of this review. The ask is read-only assessment and written sign-off.

---

## 2. Current Repository State

| Item | Value |
|---|---|
| Branch | `main` |
| HEAD | `088f3c4` fix: clean up pre-handoff route and migration 011 JWT gaps |
| Working tree | Clean |
| Migrations applied | **0 of 28** |
| Database | None — no Supabase project provisioned |
| Test suite | **5943 / 5943 passed** (145 test files) |
| TypeScript | **Clean** (`tsc --noEmit` exits 0) |
| `/api/test/*` routes | **Absent** — confirmed removed from `main` |

### Hardening sprint — recent commits

| Commit | Description | Relevance to Gate 2 |
|---|---|---|
| `088f3c4` | Pre-handoff route + migration 011 JWT cleanup | Migration 011 role reads now canonical; `/api/test/*` confirmed absent |
| `7bc42aa` | SQL tenant-claim consistency cleanup | Migrations 013/025/026 raw JWT reads → canonical helpers |
| `c6640c2` | SQL P0 blocker cleanup | Migration 005/025/027 known issues fixed |
| `3f87124` | Gate 2 SQL Review Pack | Primary CTO review artifact created |
| `2bbf78d` | Monte Carlo semantic disambiguation | Engine diagnostics documented |
| `8a05c48` | Route privacy + tenant isolation tests | Access control statically tested |
| `2fa4b9b` | Worker PIB privacy enforcement | PIB employer-access path hardened |
| `26f6e6e` | KORA Index UI governance tests | Output display requirements verified |
| `b569657` | Engine methodology governance | IU formula, config governance aligned |

---

## 3. What KORA Is Technically

**KORA is a Human Impact Intelligence Platform** that transforms organizational participation data into structured, explainable, privacy-safe activation intelligence at the company level.

Technical properties the reviewer must understand before reviewing RLS:

| Property | Technical implication |
|---|---|
| **Organization-level output** | The KORA Index is computed at company level. Individual intermediate data (PIB, IU, UEF) exists only as computation inputs — never as employer-visible outputs. |
| **Not HR surveillance** | No individual performance scoring. No worker ranking. No employer access to individual behavior. This is enforced architecturally, not just by policy. |
| **Worker PIB is private** | `personal.worker_pib` is WORKER-accessible only. No employer-facing component or query path reaches it. `FORCE ROW LEVEL SECURITY` enforces this. |
| **Employer sees aggregates only** | `COMPANY_ADMIN` / `COMPANY_VIEWER` roles access only company-level aggregates. Individual `uploaded_record`, `uef_record`, `impact_unit` rows are inaccessible to employer roles by RLS — not by convention. |
| **N≥10 suppression** | Segments with fewer than 10 workers are suppressed to avoid re-identification. Enforced at application layer and in SQL views (migration 015). |
| **Pseudonymized input data** | Uploaded worker records arrive with `pseudonym_id` + `raw_hash`, no names or national identifiers. The de-anonymization mapping lives in `personal.worker_pseudonym_map` — accessible only to KORA_ADMIN, not to employer roles. |
| **Rule-based AI ingestion** | The BCM taxonomy classifier is rule-based. No external LLM API calls on company HR or worker data in v0.1. |
| **Methodology versioned** | All scoring weights are read from `lib/methodology-config/v0.1.ts`. Nothing is hardcoded. Pre-empirical calibration is explicit: `calibration_status = 'pre_empirical_calibration'`. |

---

## 4. Architecture Boundaries

### Demo vs Staging

| Layer | Current state | What is needed to go live |
|---|---|---|
| UI / Next.js app | Running on synthetic JSON seed files (29 files) | No change to UI for staging |
| Scoring engine | `lib/kora-engine/` — real TypeScript, 12,000+ lines | No change for staging |
| Database | **None** — no Supabase project | Gate 2 close → staging provisioning |
| Auth | Simulated role switcher | Real Supabase Auth + JWT claim configuration |
| Migrations | Written, not applied | Sequential apply after Gate 2 close |

### Worker-private vs Company aggregate

```
personal schema
├── worker_identity          → WORKER + KORA_ADMIN only
├── worker_profile_private   → WORKER + KORA_ADMIN only
├── worker_pseudonym_map     → KORA_ADMIN only (DO_NOT_APPLY_YET — Gate 3)
├── worker_pib               → WORKER + KORA_ADMIN only (DO_NOT_APPLY_YET — Gate 3)
├── worker_cv_share          → WORKER own-rows + KORA_ADMIN read-only
└── uploaded_record          → KORA_ADMIN only

analytics schema
├── tenant                   → COMPANY_ADMIN/VIEWER (own tenant) + KORA_ADMIN
├── source_batch             → COMPANY_ADMIN (own tenant) + KORA_ADMIN
├── kora_index_result        → COMPANY_ADMIN/VIEWER (is_current, own tenant) + KORA_ADMIN
├── activation_result        → COMPANY_ADMIN/VIEWER (own tenant) + KORA_ADMIN
├── impact_unit              → COMPANY_ADMIN/VIEWER (own tenant, aggregate) + KORA_ADMIN
└── uef_record               → ADVISOR (own tenant) + KORA_ADMIN only
```

### Canonical JWT claim helpers

Two canonical SQL helper functions are defined in schema `kora` (not `auth`) and evolve across migrations 001→003→004→006:

```sql
kora.kora_role()   -- reads app_metadata.kora_role, fallback 'anonymous'   (mig 004 — current)
kora.tenant_id()   -- reads app_metadata.kora_tenant_id, returns uuid       (mig 006 — current)
```

All RLS policies in migrations 005–028 use these helpers. Raw `auth.jwt()` reads have been replaced with one documented exception: `kora_worker_id` in migration 011 (no canonical helper exists — this is an explicit Gate 2 design question; see §8 Q3).

---

## 5. What Has Been Hardened

| Area | Commit | Evidence | Why it matters for Gate 2 |
|---|---|---|---|
| Engine methodology governance | `b569657`, `32e5425` | `tests/unit/config-governance.test.ts`, `iu-pipeline.test.ts` | IU formula correct; no hardcoded weights; versioned config enforced |
| KORA Index UI governance | `26f6e6e` | `tests/unit/ui-governance.test.ts` | CS + calibration_status + 10 components verified on every output surface |
| Worker PIB privacy | `2fa4b9b` | `tests/unit/worker-pib-privacy.test.ts` | Employer roles cannot reach individual PIB through any service path |
| Route privacy | `8a05c48` | `tests/unit/route-privacy.test.ts` | Route-level access control verified per role |
| Tenant isolation | `8a05c48` | `tests/unit/tenant-isolation.test.ts` | Cross-tenant data leakage paths blocked at service layer |
| Monte Carlo semantics | `2bbf78d` | `tests/unit/monte-carlo-semantics.test.ts` | Monte Carlo role documented as diagnostic only, not methodology substitute |
| Gate 2 SQL Review Pack | `3f87124` | `docs/GATE2_SQL_REVIEW_PACK.md` (396 lines) | 28-migration inventory with status, CTO checklist, open questions |
| SQL P0 blocker cleanup | `c6640c2` | `tests/unit/gate2-sql-p0-cleanup.test.ts` (39 tests) | Mig 005 role pattern, mig 025 trigger ref, mig 027 preconditions all fixed |
| SQL tenant-claim consistency | `7bc42aa` | `tests/unit/gate2-tenant-claim-consistency.test.ts` (38 tests) | 12 raw JWT reads in mig 013/025/026 → canonical `kora.kora_role()` / `kora.tenant_id()` |
| Migration 011 role reads | `088f3c4` | `tests/unit/gate2-worker-cv-share-jwt-cleanup.test.ts` (29 tests) | `kora.kora_role()` now used in mig 011; `kora_worker_id` raw read documented with Gate 2 question |
| `/api/test/*` route removal | `088f3c4` | `find` returns 0; `docs/test-routes-removal-before-production.md` updated | No test routes exposed; no `KORA_ENABLE_TEST_ROUTES` references remain |

---

## 6. SQL / Migration Review Scope

**28 migrations written. 0 applied to any database.**

The SQL is review-ready, not apply-ready. Reviewing does not authorize application. The primary artifact for SQL review is `docs/GATE2_SQL_REVIEW_PACK.md`.

### Migration status classification

| Status | Count | Migrations | Meaning |
|---|---|---|---|
| `SAFE_TO_REVIEW` | 1 | 014 | Schema-only change, no RLS, no personal data. Can apply to staging after Gate 2 sign-off. |
| `NEEDS_CTO_REVIEW` | 15 | 001, 002, 003, 004, 005, 006, 010, 013, 015, 016, 021, 022, 024, 026, 028 | Requires CTO architectural sign-off before staging apply. |
| `NEEDS_LEGAL_PRIVACY_REVIEW` | 5 | 007, 008, 009, 011, 012 | Requires both CTO + DPO review. Personal data, consent, or share-token UX. |
| `DO_NOT_APPLY_YET` | 7 | 017, 018, 019, 020, 023, 025, 027 | Blocked by Gate 3 (DPO) and/or specific preconditions not yet met. |

`DO_NOT_APPLY_YET` does not mean bad SQL. It means the migration is blocked by review prerequisites (DPO sign-off, staging smoke test confirmation, or dependency on another migration that is itself blocked). The SQL in these migrations has been written and statically analyzed; it should be reviewed but must not be applied.

### What each DO_NOT_APPLY_YET migration does

| Migration | Why blocked |
|---|---|
| 017 `worker_pseudonym_map` | Highest-risk table — pseudonym↔identity mapping. De-anonymization risk. Gate 3 mandatory. |
| 018 `worker_pib` | Individual per-pillar PIB per worker. Worker-owned personal data. Gate 3 mandatory. |
| 019 `bridge_uef_to_worker_initiative` | SECURITY DEFINER reads analytics.uef_record. Depends on 016. Gate 2 + Gate 3. |
| 020 `redistribute_worker_pib_rpc` | Public-schema SECURITY DEFINER callable via PostgREST. Atomic PIB mutation. Depends on 018. |
| 023 `uploaded_record_attendee` | HMAC pseudonymisation at app layer. Key management (`KORA_PSEUDONYM_SECRET`) undocumented. Gate 3. |
| 025 `commons_booking_contribution` | Worker identity in booking rows. PIB extension. Cross-company privacy model requires DPO review. |
| 027 `worker_individual_rls_refactor` | Removes KORA_ADMIN fallback from personal schema. Requires staging smoke test confirming service-role path. |

---

## 7. Known Resolved Issues

The following issues existed before the hardening sprint and have been fixed:

| Issue | Fix | Commit | Test |
|---|---|---|---|
| Migration 005: `auth.jwt() ->> 'role' = 'COMPANY_USER'` — wrong role key and wrong role name | Rewritten to `kora.kora_role()` with `COMPANY_ADMIN`/`COMPANY_VIEWER` | `c6640c2` | `gate2-sql-p0-cleanup.test.ts` |
| Migration 025: `kora.set_updated_at()` trigger reference — function does not exist | Corrected to `set_updated_at()` (public schema, mig 001) | `c6640c2` | `gate2-sql-p0-cleanup.test.ts` |
| Migration 027: no precondition documentation | Precondition block + `RAISE NOTICE` added; stale "(da creare)" comment updated | `c6640c2` | `gate2-sql-p0-cleanup.test.ts` |
| Migrations 013/025/026: 12 raw `auth.jwt()` tenant/role reads | All replaced with `kora.kora_role()` / `kora.tenant_id()` | `7bc42aa` | `gate2-tenant-claim-consistency.test.ts` |
| Migration 011: raw `auth.jwt() -> 'app_metadata' ->> 'kora_role'` role reads (3 occurrences) | Replaced with `kora.kora_role()` | `088f3c4` | `gate2-worker-cv-share-jwt-cleanup.test.ts` |
| Migration 027: service-key file flagged as missing (`da creare`) | File exists: `lib/supabase/worker-provisioning-service-key.ts` (B168-P3) | `c6640c2` | `gate2-sql-p0-cleanup.test.ts` |
| `/api/test/*` routes: presence in codebase unclear | Confirmed removed from `main`; doc updated | `088f3c4` | `gate2-worker-cv-share-jwt-cleanup.test.ts` |

**One known intentional exception:**

Migration 011 (`worker_cv_share`) uses `(auth.jwt() -> 'app_metadata' ->> 'kora_worker_id')::uuid` as a raw read. This is **intentionally retained** because no canonical `kora.worker_id()` helper exists today. This is the only migration that reads `kora_worker_id`. It is a design question for CTO to decide (see §8 Q3).

---

## 8. Known Open Questions for CTO

These are the exact questions KORA needs answered from Gate 2 review. A yes/no or choose-option response on each is sufficient; detailed notes are welcome.

**Q1 — RLS architecture**
Is the multi-tenant RLS architecture (canonical helpers + FORCE ROW LEVEL SECURITY on personal schema + grant-absence for employer roles) structurally sound for a production SaaS handling pseudonymized personal data?

**Q2 — Canonical helper sufficiency**
Are `kora.kora_role()` and `kora.tenant_id()` (defined in mig 004/006) the correct abstraction for JWT claim reads? Is there a risk in centralizing claim access in schema `kora` functions rather than reading claims directly in policies?

**Q3 — ★ `kora.worker_id()` canonical helper — design decision required**
Migration 011 (`worker_cv_share`) reads `app_metadata.kora_worker_id` via raw `auth.jwt()` — the only migration with this pattern. Two options:
- **(a)** Introduce `kora.worker_id()` returning uuid — consistent with the existing helper pattern; centralizes claim key name; enables future migrations to use it.
- **(b)** Accept the raw read as a documented exception — justified because `kora_worker_id` is a worker-identity access key (not a scope filter), and it appears in only one migration.
Which should KORA do?

**Q4 — service_role GRANT ALL scope**
Migration 002 grants `ALL ON ALL TABLES IN SCHEMA personal TO service_role`. Is this the minimum necessary privilege for server-side scoring, provisioning, and audit writes, or should per-table grants be preferred?

**Q5 — SECURITY DEFINER functions**
Migrations 015 (`fn_company_worker_status`, `fn_company_activation_summary`), 019 (`fn_publish_company_initiative_from_uef`), 020 (`fn_redistribute_worker_pib`), and 025 (`booking_aggregate_for_promoter`) use `SECURITY DEFINER`. Are these safe for staging? Are the role checks inside each function sufficient to prevent misuse?

**Q6 — N≥10 suppression in SQL**
Migration 015's `fn_company_activation_summary()` implements N≥10 suppression: `CASE WHEN COUNT(*) < 10 THEN NULL ELSE COUNT(*) END`. Is this sufficient, or should the suppression also appear as a CHECK constraint or be enforced at the PostgREST level?

**Q7 — Migration 027 staging readiness**
Migration 027 removes KORA_ADMIN fallback policies from personal schema tables and replaces them with a service-key provisioning path. The service-key file (`lib/supabase/worker-provisioning-service-key.ts`) exists. Is migration 027 ready to include in a staging smoke test after Gate 2 closes, or does it need further preconditions?

**Q8 — Migration scope reclassification**
After reviewing the full set: are any migrations currently classified `NEEDS_CTO_REVIEW` that should actually be `DO_NOT_APPLY_YET`? Any that can be promoted to `SAFE_TO_REVIEW`?

**Q9 — Staging apply sequence**
What conditions must be met before the first `supabase db push` on staging? Specifically: (a) is JWT claim configuration (setting `kora_role`, `kora_tenant_id`, `kora_worker_id` in Supabase Auth `app_metadata`) a prerequisite before any migration apply, or can it happen after? (b) Is the migration apply order (001 → 002 → 003 → 004 → 006 → 005 → 007 → …) safe? Are there any parallelism risks?

---

## 9. Explicit Non-Goals

The following are explicitly out of scope for Gate 2 review. Do not do any of the following:

- **Do not apply any migration.** Not to any environment.
- **Do not run `supabase db push`.** Not in development, not in staging.
- **Do not provision a Supabase project** as part of this review.
- **Do not review empirical validity of methodology weights.** They are pre-empirical by design. Delphi Study calibration is post-pilot.
- **Do not approve real worker-level data processing.** That is Gate 3 / DPO.
- **Do not treat DPO items (migrations 007, 008, 009, 011, 012, 017–020, 023, 025) as CTO-only decisions.** They require Gate 3 sign-off separately.
- **Do not add or suggest new product features.** KORA Index v3 has exactly 10 components (fixed). No additions.
- **Do not modify CLAUDE.md.** It is the constitutional authority for KORA build decisions.

---

## 10. What Gate 2 Passed Means

Gate 2 is formally closed when all of the following are true:

- CTO has read and reviewed all 28 migration files (or delegated review of DO_NOT_APPLY_YET migrations to a joint CTO+DPO session)
- All items in §4 of `docs/GATE2_SQL_REVIEW_PACK.md` (Gate 2 Checklist) are signed off or reclassified
- The `kora.worker_id()` design question (Q3 above) has a documented answer
- SECURITY DEFINER functions are approved for staging or flagged with required changes
- The migration apply sequence for staging is approved
- CTO has issued a written go/no-go decision

A partial "go with conditions" is valid — list the conditions as required changes before staging.

---

## 11. What Gate 2 Failed Means

Gate 2 fails if the CTO identifies any of the following:

- The RLS model is structurally unsafe (cross-tenant leakage possible by design)
- The canonical claim helpers are incorrectly designed and must be rewritten
- One or more SECURITY DEFINER functions create unacceptable privilege escalation paths
- The migration apply order creates an unsafe state
- The `personal` schema boundary is insufficient to protect individual worker data
- New P0 SQL blockers are identified that require migration rewrites before any staging apply

A failed Gate 2 produces a list of required rewrites. Those rewrites happen before re-submission.

---

## 12. Recommended Review Order

1. **Read this document** — understand scope and what you're being asked
2. **Read `docs/GATE2_SQL_REVIEW_PACK.md`** — primary SQL review artifact (396 lines, 28 migrations, CTO checklist, open questions)
3. **Review migrations 001–006** — claim/auth foundation (`kora.kora_role()`, `kora.tenant_id()`, schema creation, grants)
4. **Review migrations 007–013** — worker provisioning foundation, partner profiles, commons (these establish the key RLS patterns)
5. **Review migration 015** — SECURITY DEFINER safe aggregation layer (critical privacy boundary)
6. **Review migrations 016, 021, 022, 024, 026, 028** — remaining NEEDS_CTO_REVIEW migrations
7. **Review SECURITY DEFINER functions across 015/019/020/025** — assess privilege scope
8. **Review migration 027** — KORA_ADMIN policy removal; assess service-key path readiness
9. **Address migration 011 `kora.worker_id()` design question** (Q3)
10. **Complete §4 Gate 2 Checklist in `docs/GATE2_SQL_REVIEW_PACK.md`** — produce written gate decision

DO_NOT_APPLY_YET migrations (017, 018, 019, 020, 023, 025, 027): review the SQL design for correctness, but do not approve for apply until Gate 3 is engaged and staging preconditions are met.

---

## 13. Handoff Message Draft

The following draft can be sent as-is or adapted.

---

> **Subject: KORA Gate 2 — SQL/RLS/Auth Architecture Review Request**
>
> Hi [Name],
>
> We're ready for Gate 2. The repo is in a clean, review-ready state:
>
> - Branch: `main`, HEAD `088f3c4`
> - 28 SQL migrations written, 0 applied to any database
> - 5943/5943 tests passing, TypeScript clean
> - No Supabase project provisioned
>
> **What we're asking:**
> Read-only SQL/RLS/auth architecture review. We need you to look at the migration set and tell us:
> - Is the RLS model sound?
> - Are the canonical JWT claim helpers correctly designed?
> - Are the SECURITY DEFINER functions safe for staging?
> - Should we introduce `kora.worker_id()` or accept the raw `kora_worker_id` read in migration 011?
> - What conditions must be met before the first `supabase db push` on staging?
>
> **Please do not:**
> - Apply any migration
> - Run `supabase db push`
> - Provision a Supabase project
> - Modify any file in the repo
>
> **Where to start:**
> 1. `docs/gate-2-external-review-pack.md` (this document)
> 2. `docs/GATE2_SQL_REVIEW_PACK.md` (28-migration inventory with status and CTO checklist)
> 3. `supabase/migrations/` (28 `.sql` files)
>
> **Gate 2 output we need:**
> Written sign-off on the Gate 2 Checklist (§4 of `GATE2_SQL_REVIEW_PACK.md`), plus answers to the 9 open questions in §8 of this document.
>
> GitHub read access: [link]
>
> Thanks.

---

## Appendix A — Repository State at Review Time

```
Branch:          main
HEAD:            088f3c4 (fix: clean up pre-handoff route and migration 011 JWT gaps)
Remote:          origin/main — up to date
Working tree:    clean — no modified or untracked files
Tests:           5943 / 5943 passed (145 test files)
TypeScript:      clean (tsc --noEmit exits 0)
Migrations:      28 written, 0 applied
Supabase:        no project provisioned
/api/test/*:     absent from codebase (confirmed 2026-06-21)
Gate 2:          OPEN
Gate 3:          OPEN (blocks personal schema migrations and all real worker data)
Gate 5:          OPEN (blocks live fiscal outputs)
```

## Appendix B — File Map for Reviewer

| File/Directory | What it is |
|---|---|
| `supabase/migrations/` | All 28 SQL migrations — the primary review target |
| `docs/GATE2_SQL_REVIEW_PACK.md` | Migration inventory, status, CTO checklist, open questions |
| `CLAUDE.md` | Constitutional operating guide — architecture boundaries, forbidden actions |
| `docs/10-architecture-v3-layer-specification.md` | 14-stage algorithm, IU formula, KORA Index v3 components |
| `docs/12-technical-data-model-database-schema.md` | Schema reference (pre-Gate 2; not yet finalized as doc 22) |
| `lib/kora-engine/` | Scoring engine (TypeScript, 12,000+ lines) — not in review scope but available |
| `lib/supabase/worker-provisioning-service-key.ts` | Service-key provisioning path (relevant to mig 027 precondition) |
| `lib/methodology-config/v0.1.ts` | Versioned methodology weights — pre-empirical v0.1 |
| `tests/unit/gate2-*.test.ts` | Static SQL text tests verifying migration content |
| `docs/gate-3b-privacy-readiness-pack.md` | Gate 3 / DPO brief — out of CTO scope, for reference only |
| `docs/test-routes-removal-before-production.md` | Pre-staging/pre-production checklist |
