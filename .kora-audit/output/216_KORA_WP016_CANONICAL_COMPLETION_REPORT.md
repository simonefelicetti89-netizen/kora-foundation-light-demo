# 216 — KORA-WP-016 Canonical Completion Report (Structured Spine + Normalized Data/Evidence Layer)

**WP-016 = COMPLETE. `CORE-015` = CLOSED. `CORE-016` = CLOSED.**
Final SHA `53c643f7719e7dcf2d6a165ac2f10f0b243e8563`, pushed, local ≡ remote, 0/0, worktree clean.
**Cadence 9 → 10. The Formal Consolidation Audit is now MANDATORY** and was not started here.

Reports 211–215 are immutable and were not rewritten. Registry 142 and Principles 143 unmodified.
Production never contacted.

---

## 1. WP identity · 2. Canonical purpose · 3. Dependencies

| Field | Value (Registry 142, verbatim) |
|---|---|
| WP | `KORA-WP-016` — Structured Spine + Normalized Data/Evidence Layer |
| Increment / Pilot Status | I1 / BASE PILOT NON-BLOCKER |
| Purpose | "extend `CORE-004`'s data model generality" |
| **Primary Closures** | **`CORE-015`, `CORE-016`** — re-read from the registry this task; not invented |
| Hard Deps | `KORA-WP-014` — COMPLETE |
| Acceptance | "structured spine validated against a second, differently-shaped data source" |
| Tests | "unit, schema-generality regression" |
| Out of Scope | full connector library (`KORA-WP-085`) |
| Feature Flag / Rollback / External Blockers / Evidence Gate | NO / additive / **none** / N/A |

Closure IDs cross-checked against the canonical requirement ledger `64`:
`CORE-015` — *Structured spine / flexible edges* (MODIFY, was PARTIAL, source PT §12 PD-029);
`CORE-016` — *Normalized Data & Evidence layer* (MODIFY, was PARTIAL, source PT §14).
**Both mappings are exactly canonical. No closure ID was invented.**

## 4. Founder adjudications (the governing record)

1. **PD-029 RATIFIED FOR WP-016 ONLY** — "structured spine, flexible edges" accepted as the input
   architecture for this WP's scope. Not generalized; no historical document's status wording rewritten.
2. **PT §14 boundary confirmed** — no new domain object; "Normalized Company Data & Evidence" stays a
   functional description, never a frozen Product object.
3. **Second source approved**: `IntakeFileRole = 'policy'`.
4. **Discriminator**: reuse the existing FK path; no denormalization.
5. **Blast radius**: Investment module only.
6. **Structural boundedness ratified (Option 1, after report 214)** — see §9.
7. **Policy-role vs source_type**: different dimensions, no shared vocabulary required — see §8.

## 5. Implementation summary · 6. Migration 089

One additive column — `analytics.observed_investment_fact.source_attributes jsonb NOT NULL DEFAULT
'{}'` — governed by an IMMUTABLE database validator
(`kora.investment_source_attributes_valid`), one CHECK constraint, and a matching TypeScript
validator in `lib/investment-map/observed-investment-fact-service.ts`.

Migration 089 is **ADDITIVE / EXPAND-ONLY**. No destructive DDL, no new table, no RLS change, no
GRANT change, no tenant-ownership change, no auth change, no backfill, no production migration.
`ADD COLUMN … NOT NULL DEFAULT` is metadata-only on PostgreSQL 11+, so it is safe on a populated
table as well as an empty one.

## 7. Second differently-shaped source — evidence

`IntakeFileRole = 'policy'` (`lib/data-intake/file-role-detection.ts`) — real, existing KORA intake
semantics. Its purpose in WP-016 was **schema/model generality validation only**. It was **not** a new
Product feature, not a connector, not ingestion wiring, and not WP-085 implementation.

Test fixtures use **synthetic values whose shape and semantics derive from the real `policy` intake
signals** — a test reads that source file and asserts every fixture key is a genuine policy header
signal there (`regolamento`, `normativa`, `diritto`, `smart_working`, `coverage`, `copertura`,
`uptake`, `eligible_population`, `policy_document`). No arbitrary JSON object was invented.

## 8. Source discrimination — clarification

`IntakeFileRole` and `analytics.source_batch.source_type` represent **different dimensions** and are
not required to share a vocabulary (Founder adjudication). Accordingly: **no `policy` value was added
to `source_type`**, its vocabulary was not modified, **no discriminator column was added** to
`analytics.observed_investment_fact`, and `IntakeFileRole` was not duplicated onto it. The existing
provenance path `observed_investment_fact.source_batch_id → analytics.source_batch` is unchanged. No
connector or ingestion routing was introduced; that belongs to future ingestion scope, including
`KORA-WP-085` where applicable.

## 9. Flexible-edge final contract

**STRUCTURED TYPED SPINE + STRUCTURALLY BOUNDED FLEXIBLE JSONB EDGE.** Enforced in both layers:

top-level JSON object · flat scalar values · no nested objects · no arrays · canonical typed spine
keys forbidden · typed spine authoritative · flexible attributes cannot override typed fields ·
**open non-reserved key namespace, intentionally** · **no numeric key-count cap** · **no byte-size
cap** · **no source-specific allow-list** · provenance preserved · tenant isolation preserved ·
Unknown/null semantics preserved · deterministic persistence · **finite numeric values only**.

> **Explicit correction carried forward:** report 213's phrase *"the source's own column count"* is
> **NOT an enforced bound** and must not be repeated. Report 214 proved empirically that 2000
> arbitrary keys and a 1 MB value are accepted. WP-016's bound is **structural**, by Founder
> ratification, not numeric. Report 213 itself remains unedited; this is the governing wording.

## 10. NaN / Infinity remediation

Report 214 found the TypeScript validator accepted `NaN`, `Infinity` and `-Infinity`, which JSON
serialization turns into `null` — a semantic mutation the contract forbids. Remediated **before
push** with a single `Number.isFinite` guard applied only to numeric values; string, boolean and null
behaviour untouched. **Migration 089 required no modification** — JSON cannot carry those values, so
PostgreSQL never received them; the defect was purely on the TypeScript side. Remediation commit
`53c643f7719e7dcf2d6a165ac2f10f0b243e8563`, with 8 focused regression cases.

## 11. WP-014 invariants preserved (all eight, evidenced)

1. Unknown never coerced to `0`/`false`/empty/any invented value · 2. `unknown_fields` semantics
intact (the edge never enters it) · 3. exactly one governance event per successful write · 4. no
success event on a failed write · 5. the edge cannot override typed canonical fields · 6. provenance
recoverable · 7. tenant isolation intact · 8. the original WP-014 row/input shape remains
backward-compatible (default `{}`). The entire WP-014 suite passes **unmodified**.

## 12. Real database validation

Performed on the canonical **local disposable/migrated** development Postgres. Evidence: migration
089 applies cleanly; re-run idempotency confirmed; RLS remains **enabled and forced**; both migration
053 policies unchanged (predicates byte-identical); GRANTs unchanged; the old WP-014 row shape still
works with default `{}`; the policy-shaped row works; invalid edge shapes (nested object, array,
top-level non-object) rejected; canonical spine-key conflicts rejected; the `commitment_ref`
invariant preserved; **RLS two-tenant negative 27/27**; all test DML rolled back with **no persisted
test data**.

> **Qualification, stated plainly:** local validation ran against a database already migrated through
> **088**. A **from-empty full migration chain was NOT run locally**. Repository CI policy performs
> fresh migration-chain validation (`.github/workflows/ci.yml:66`, mandatory, non-skippable,
> `supabase start` applies every tracked migration fresh). No claim of local from-zero validation is
> made anywhere in this report.

## 13. Full regression

`tsc --noEmit` clean · `eslint` clean · focused WP-016 + WP-014: **52 passed** · WP-014 passes
unmodified.

**Final full regression: 419 test files · 13381 passed · 325 skipped · 5 todo · 0 failures.**
The **325 skipped tests were not executed** — they are pre-existing integration tests requiring a
live local Postgres configuration (`RLS*_PG_URL`) and skip themselves when absent. No claim is made
that they ran.

## 14. Sibling-model boundary

Migrations/models `055` (Need Hypothesis), `064` (Resource Allocation) and `065` (Commitment Draft)
were **not** generalized by WP-016 and may now intentionally diverge from the generalized Investment
model. Recorded, not repaired; no lateral refactor was authorized. **This is not a WP-016 defect** —
WP-016's literal canonical scope is the Investment module.

## 15. Cross-WP compatibility test edits

Four migration-ceiling guards (`042`, `044`, `112`, `113`) required minimal updates because migration
089 legitimately exists: **`88 → 89`, one line each, plus explanatory context**. No underlying WP
intent changed. **Compatibility maintenance, not lateral Product work.**

## 16. Git history · 17. Remote verification

| Item | Value |
|---|---|
| Branch | `feature/wp016-structured-spine-normalized-evidence` |
| Branch point | `8a3af8668c528fdd4efd2a8a01760a2155044d2e` |
| Implementation commit | `4cfde847356b885e626cb361355aae47d0560cc3` |
| Remediation commit / HEAD | `53c643f7719e7dcf2d6a165ac2f10f0b243e8563` |
| Remote HEAD (`ls-remote`) | `53c643f7719e7dcf2d6a165ac2f10f0b243e8563` — **identical** |
| Ahead / behind | **0 / 0** · upstream configured |
| Worktree | clean (0) |
| Push | normal remote branch creation; no force, no lease, no history rewrite |
| Commits published | exactly 2, both WP-016; no unrelated commit |
| WP-088 baseline branch | still `8a3af8668c528fdd4efd2a8a01760a2155044d2e` — untouched |

## 18. Process deviation (audit continuity)

`LOCAL COMMIT CREATED BEFORE FOUNDER REVIEW` (report 214 §2). No Product consequence, no history
rewrite, no forced push, no remote damage. Not repaired by rewriting history. The subsequent
remediation commit was Founder-authorized before creation. Recorded for continuity; **not a blocker**.

## 19. WP-085 dependency consequence

WP-016 now satisfies its **WP-level dependency contribution** to `KORA-WP-085` (`085` = `016` + `028`;
`028` COMPLETE). **`085` carries `External Blockers: Gate 3`, and Gate 3 is OPEN — `085` is NOT
operationally actionable.** WP-dependency satisfaction is not external-gate readiness.

## 20. Product Experience boundary

PX-A / PX-B / PX-C (report 210) remain **PROVISIONAL, UNNUMBERED, NON-CANONICAL, NOT STARTED**.
WP-016 neither implemented nor absorbed any of them, and **no visual Product decision was made inside
WP-016** — its canonical `UI` field is `N/A`.

## 21. Living KORAL boundary

`KORA-WP-117` remains OPEN / Founder-deferred. WP-016 did not reopen renderer work, did not request
Round 6, did not start Package B, and did not modify `BoundedKoralGeometry` or any Living KORAL
manifestation logic.

## 22. Production boundary

Production never contacted: no production Supabase, no production database change, no Vercel
Production action, no production environment-variable change, no `main` merge, no production deploy.
Report 210's Production Readiness concern — **verify Vercel Preview vs Production Supabase
environment scoping before any future Production release** — remains open and separate. **Not acted
on here.**

## 23. Formal closure determination

Checked against WP-016's own canonical definition:

| Requirement | Status |
|---|---|
| Implementation exists | ✅ migration 089 + service + types |
| Canonical Acceptance — "structured spine validated against a second, differently-shaped data source" | ✅ the `policy` shape, at model/service level, which is the level this WP's own `Tests` field specifies |
| Canonical Tests — "unit, schema-generality regression" | ✅ 32 WP-016 cases |
| DB evidence required by current repository governance | ✅ real Postgres + RLS 27/27; fresh-chain left to CI per documented precedent |
| Final Founder adjudications | ✅ structural boundedness, second source, discriminator |
| Pushed Git state | ✅ local ≡ remote, 0/0, clean |
| Canonical report trail | ✅ 211 · 212 · 213 · 214 · 215 · 216 |

**No mandatory canonical requirement is unsatisfied.**

**KORA-WP-016 = COMPLETE · CORE-015 = CLOSED · CORE-016 = CLOSED.**

## 24. Cadence · 25. Mandatory next action

**Cadence 9 → 10.** Under the governing rule this makes the **FORMAL CONSOLIDATION AUDIT MANDATORY
IMMEDIATELY**. It was **not** started in this task. **No further numbered WP may begin before that
audit is completed and accepted.**

No 123-WP DAG recomputation was performed here. Report 210 remains the last full from-zero census;
WP-016's completion necessarily moves `016` READY → COMPLETE and mechanically affects `085`'s
WP-dependency state, but recalculation belongs after the Formal Consolidation Audit or on explicit
Founder instruction.

## 26. Boundary attestations

No Product code, test, migration, type, Git-history, Registry 142, Principles 143 or older-report
modification. Nothing committed, nothing pushed by this task. No DAG recomputation, no new WP, no PX
work, no Living KORAL work, no Production Readiness. Production untouched.
`scripts/provision-next-review.mjs` never addressed by any command.

---

**Report 216 · KORA-WP-016 · COMPLETE · cadence 10 · Formal Consolidation Audit now mandatory**
