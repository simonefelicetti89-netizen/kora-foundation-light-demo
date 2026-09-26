# 213 — KORA-WP-016 Implementation & Validation Report (Structured Spine + Normalized Data/Evidence Layer)

**Phases 1–6 executed. All required evidence passes. Committed locally, NOT pushed.**
No STOP condition from §B was triggered. Production never contacted.

---

## 1. Founder adjudications implemented (audit trail)

| Decision | How it is honoured |
|---|---|
| **PD-029 RATIFIED FOR WP-016 ONLY** | recorded verbatim in migration 089's header; not generalized; no historical document's status wording rewritten |
| **PT §14 boundary** | no new domain object, no Product semantics, no user-facing object, no navigation, no environment — the edge is a column, not a concept |
| **Mechanism** | typed spine + **bounded** flexible JSONB edge, `analytics.uef_record` used as precedent and **not modified** |
| **Second source** | `IntakeFileRole = 'policy'` — shape derived from the real file, asserted against it in test |
| **Discriminator** | existing `source_batch_id → source_batch.source_type` FK reused; **no denormalized `source_type` column added** |
| **Blast radius** | Investment module only; 055/064/065 schemas untouched |

## 2. Files changed

| File | Change |
|---|---|
| `supabase/migrations/089_investment_source_attributes_flexible_edge.sql` | **new** — additive/expand-only |
| `lib/investment-map/observed-investment-fact-service.ts` | extended: `InvestmentSourceAttributes`, `SPINE_RESERVED_KEYS`, `validateSourceAttributes()`, edge persisted + mapped |
| `lib/supabase/types.ts` | `source_attributes` added to Row and Insert |
| `tests/unit/kora-wp-016-structured-spine-flexible-edge.test.ts` | **new** — 24 cases |
| 4 × ceiling-guard tests (042, 044, 112, 113) | **minimum compatibility change only** — see §7 |

Migration number **089 re-verified free immediately before creation**, as required (highest existing was `088`).

## 3. What was built

`analytics.observed_investment_fact` gains one column — `source_attributes jsonb NOT NULL DEFAULT '{}'` —
governed by one IMMUTABLE validator (`kora.investment_source_attributes_valid`) enforced by one CHECK
constraint. The validator enforces three rules, each derived from real source shape, none invented:

1. **object only** — `jsonb_typeof(attrs) = 'object'`;
2. **flat scalars only** — no nested object or array, because every intake role in
   `lib/data-intake/file-role-detection.ts` is detected from **tabular headers**, and a CSV/XLSX cell
   is a value, not a tree;
3. **no spine key** — the edge may never carry any of the 14 canonical column names.

Rule 3 makes duplication, silent replacement and conflicting override of the typed spine
**structurally impossible**, not merely discouraged.

### Why no numeric bound was invented (§A's own stop clause, not triggered)
A byte/depth/key-count cap was considered and deliberately **not** added. §A forbids inventing
semantic limits and requires a STOP only if a hard bound is *technically necessary* and no KORA
convention exists. It is not necessary here: once values are scalars drawn from a tabular row, the
natural bound is the source's own column count. Verified that KORA has no existing convention to
borrow — **no jsonb column anywhere in `supabase/migrations/` carries a CHECK, there is no
`jsonb_typeof` usage in any migration, and `uef_record.payload` (the named precedent) is itself
unconstrained at schema level.** Recorded as a deliberate decision, not an omission.

### The service mirrors the database exactly
`validateSourceAttributes()` refuses precisely what the CHECK refuses, so a caller receives a named
error instead of an opaque constraint violation. A test asserts the TS reserved-key list is
**byte-identical** to the migration's own `ARRAY[...]`, so the two can never drift.

## 4. Second differently-shaped source — as approved

`IntakeFileRole = 'policy'`. The fixture's **values are synthetic; its shape is not**: a test reads
`lib/data-intake/file-role-detection.ts` and asserts **every fixture key is a real `policy` header
signal** in that file — `regolamento`, `normativa`, `diritto`, `smart_working`, `coverage`,
`copertura`, `uptake`, `eligible_population`, `policy_document`. No arbitrary JSON object was invented.

It is genuinely differently-shaped: it carries **no monetary amount** and none of its keys is a spine
column. Legitimate Investment under PT §15 (FROZEN) — "risorse … finalità, popolazione, orizzonte,
Evidence", not only cash.

**Disclosed (carried from report 212):** `createObservedInvestmentFact` still has no production
caller — WP-014 built no ingestion path. Acceptance is therefore proven at model/service level, which
is exactly what WP-016's own `Tests` field specifies and what leaves connectors to `085`.

## 5. WP-014 invariants — all eight preserved, each asserted

| # | Invariant | Evidence |
|---|---|---|
| 1 | Unknown never coerced to 0/false/empty | passes with an edge present; all five spine fields stay `null` |
| 2 | `unknown_fields` names exactly the omitted **spine** fields | edge keys never enter it; `source_attributes` never appears in it |
| 3 | Exactly one governance event per successful write | asserted `toHaveBeenCalledTimes(1)` |
| 4 | No governance event on failure | asserted for both DB failure and edge-validation refusal |
| 5 | Edge cannot bypass structured-field validation | validation runs **before** the insert |
| 6 | Edge cannot redefine a structured field | all 14 reserved keys refused, in service and in Postgres |
| 7 | Provenance recoverable | `recorded_by_role/id` + `source_batch_id` asserted alongside an edge |
| 8 | Tenant ownership/isolation intact | RLS-03 suite, real Postgres, 27/27 |

The entire WP-014 suite (20 cases) passes **unmodified**.

## 6. Validation evidence

**Unit / behavioural:** `tests/unit/kora-wp-016-structured-spine-flexible-edge.test.ts` — **24 passed**.
Together with the untouched WP-014 suite: **44 passed**.

**Real Postgres** (local disposable stack, `127.0.0.1:54322` — the repo's canonical local path per
`docs/RLS_03_THROWAWAY_SUPABASE_CHECKLIST.md` §B "Superseded (RLS-03D/E)"). No credentials sourced,
no secret printed, Production never contacted.

| Check | Result |
|---|---|
| Migration applies cleanly | ✅ `CREATE FUNCTION · ALTER TABLE · DO` — exit 0 |
| Idempotent on re-run | ✅ second run: `column … already exists, skipping`, exit 0 |
| RLS still enabled **and forced** | ✅ `rls_enabled = t`, `rls_forced = t` |
| Policies unchanged | ✅ exactly the two from 053, predicates byte-identical |
| GRANTs unchanged | ✅ `authenticated: SELECT`, `service_role: INSERT,SELECT` |
| Old WP-014 row shape still inserts | ✅ edge defaults to `{}` |
| New policy-shaped row inserts | ✅ `amount` NULL, edge round-trips with string/number/null intact |
| Nested object rejected | ✅ CHECK violation |
| Array value rejected | ✅ CHECK violation |
| Reserved spine key `amount` rejected | ✅ CHECK violation |
| Non-object edge rejected | ✅ CHECK violation |
| `commitment_ref` invariant still enforced | ✅ 053's own CHECK still fires |
| Tenant isolation | ✅ **RLS-03 two-tenant negative suite: 27/27 passed** against this DB |
| Test data persisted | ✅ **none** — every DML ran inside a rolled-back transaction |

**Disclosed limitation:** migration 089 was applied onto the already-migrated local database
(001→088 present) rather than via a from-scratch `supabase db reset`, because a reset would destroy
local development state that was not mine to discard. 089 depends only on migration 053's table and
the pre-existing `kora` helper schema, both present, so no ordering risk exists; a from-scratch apply
remains available on request and is what CI's own gate performs.

**Static:** `tsc --noEmit` clean · `eslint` clean on all touched files.

**Full regression:** `npm test` → **419 files passed, 13373 passed, 325 skipped, 5 todo, 0 failures**
(+24 versus the 13349 baseline of report 209).

## 7. Sibling models 055 / 064 / 065 — recorded, not resolved (§4, §13)

Migrations **055** (Need Hypothesis), **064** (Resource Allocation) and **065** (Commitment Draft)
each state in their own headers that they use the *"identical shape to
`analytics.observed_investment_fact`"*. WP-016 generalizes **only** the canonical Investment model
under its literal scope, so those three now **intentionally diverge** from the model they mirrored.
No lateral refactor, no consistency cleanup, no platform-wide spine migration was performed. A test
asserts none of the three contains `source_attributes`. This divergence is recorded for a future
canonical WP to decide; **it is not resolved here.**

**The one compatibility change made, and why it was unavoidable:** four tests belonging to other WPs
(`042`, `044`, `112`, `113`) assert an exact migration-count ceiling (`toBe(88)`) to prove *those*
WPs introduced no migration. Adding migration 089 legitimately broke all four. Each test's own text
already anticipates this — WP-112's and WP-113's read *"a later WP may legitimately raise the ceiling
further"*. The change is **one number per file, 88 → 89**, plus a comment naming WP-016 as the cause.
No assertion intent altered, no redesign, nothing else touched. This is the §13 "minimum
compatibility change required to prevent regression", and nothing more.

## 8. Scope boundaries honoured

No new table · no new domain object · no new RLS policy, grant, tenant-ownership or auth change ·
no new source discriminator column · no EAV or attribute subsystem · no normalization platform ·
UEF used as precedent and **not modified** · no connector or ingestion wiring (`085`'s scope) ·
no destructive migration, no data deletion, no backfill · no Product Experience work of any kind
(no typography, visual language, density, surface hierarchy, motion, iconography, brand expression,
dashboard composition, navigation presentation or art direction) · PX-A/B/C remain provisional,
unnumbered, non-canonical, not started · Living KORAL untouched (`117` not reopened, no Round 6, no
Package B, `BoundedKoralGeometry` and manifestation logic not modified) ·
`scripts/provision-next-review.mjs` never addressed by any command.

## 9. WP-085 status (§14)

WP-016 satisfies `085`'s remaining **mechanical** WP dependency (`085` = `016` + `028`; `028`
COMPLETE). **`KORA-WP-085` is NOT operationally actionable**: its own registry entry carries
`External Blockers: Gate 3`, and Gate 3 is OPEN. Mechanical dependency satisfaction is not external
gate readiness, and this report makes no claim that it is.

## 10. Git state

| Field | Value |
|---|---|
| Branch | `feature/wp016-structured-spine-normalized-evidence` |
| Branch point | `8a3af8668c528fdd4efd2a8a01760a2155044d2e` (verified identical to local HEAD and origin before branching) |
| WP-088 history | unmodified — no rebase, merge, reset, cherry-pick or force |
| Push | **NOT PUSHED** |

## 11. Cadence

WP-016 completing takes cadence from **9 to 10**, which makes the **Formal Consolidation Audit
mandatory**. It was **not** started, no further numbered WP was started, PX-A/B/C were not started,
and Production Readiness was not started.

---

**Report 213 · KORA-WP-016 · implementation and validation evidence complete · local only**
