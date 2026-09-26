# 212 — KORA-WP-016 Phase 0: Second Differently-Shaped Source Confirmation

**Mode: READ-ONLY. Phase 0 only. No code, schema, test or migration written. Phases 1–6 not started.**

**Outcome: candidates FOUND — but implementation HELD, for two reasons outside Phase 0's own test
(§5 and §6 below). Founder input requested before Phase 1.**

---

## 1. Founder adjudications recorded (audit trail, per Decision 1)

| Decision | Record |
|---|---|
| **PD-029** | **RATIFIED FOR WP-016 ONLY** — "structured spine + flexible edges" accepted as the input architecture for this WP's scope. Not generalized beyond WP-016. No historical document's status wording rewritten. |
| **PT §14 boundary** | CONFIRMED — no new domain object, no new Product semantics, no user-facing object, no navigation, no environment. |
| **Mechanism** | typed structured spine + **bounded** flexible JSONB edge, `analytics.uef_record` as precedent. No EAV. No new normalization platform. No new table. |
| **Blast radius** | **Investment module only.** Migrations 055/064/065 not touched (§7). |

## 2. Phase 0 result — real candidates identified (none invented)

### ✅ Candidate A — `IntakeFileRole = 'policy'` *(recommended)*
`lib/data-intake/file-role-detection.ts:10-18`, B28 deterministic intake role detection — **live,
referenced code**, not a fixture. Native header shape: `policy · regolamento · procedura ·
policy_document · normativa · diritto · smart_working · coverage · copertura · uptake ·
eligible_population`.

**Why it is genuinely differently-shaped:** it is an **entitlement/coverage** investment carrying
**no monetary amount** and an **eligibility-population axis**. WP-014's typed spine is
amount/provider-centric (`amount`, `provider`, `population_descriptor`, `reach_summary`,
`evidence_summary`). `coverage`, `uptake`, `eligible_population` and `diritto` have **no typed home**
on `observed_investment_fact` — exactly the case the flexible edge exists to carry.

**Why it is semantically legitimate for Investment:** PT §15 (FROZEN) defines the Investment Map as
"dove vengono investite risorse, con finalità, **popolazione**, Program, Capacity Node, orizzonte,
Evidence e stato economico" — resources, not only cash. A smart-working policy is a real investment
with a population and no invoice.

### ✅ Candidate B — `analytics.source_batch.source_type`
`supabase/migrations/001_live_v1_foundation.sql`: `welfare_provider | lms | hr_aggregate | esg |
partner | manual`. Already schema-live, and `observed_investment_fact.source_batch_id` **already FKs
to this table** (migration 053). An `esg` or `lms` batch is differently shaped from a
`welfare_provider` one. Strongest *structural* candidate; weaker as a concrete record shape.

### ⚠️ Candidate C — `lib/kora-engine/budget-evidence-examples.ts`
35 real records, stable shape (`Nome Iniziativa` 35 · `Categoria` 35 · `Importo` 29 · `Fonte Budget`
27 · `Tipo Evidenza` 20). `Fonte Budget`, `Tipo Evidenza` and `Categoria` have no typed home on the
Investment table. **Caveat that disqualifies it as primary: the file is referenced by nothing —
zero importers, not even a test.** It is a dormant corpus, so "real in current KORA architecture" is
arguable.

### ❌ Candidate D — `IntakeFileRole = 'budget'` — REJECTED
Its shape (`amount/importo/costo/centro_costo/voce_contabile`) maps essentially 1:1 onto the existing
typed columns. It is the *same* shape, so it cannot satisfy "**differently**-shaped" and would not
exercise the flexible edge at all.

**Recommendation: Candidate A as the acceptance source, with Candidate B as the source discriminator
mechanism.** Nothing was fabricated; no synthetic shape was invented to make a test green.

## 3. Material disclosure — the Investment module has no first source path

`createObservedInvestmentFact` has **no production caller anywhere in `app/`, `lib/` or `services/`** —
only `tests/unit/kora-wp-014-observed-investment-fact.test.ts` imports it. WP-014 delivered the table,
the service and the invariants; it did not wire an ingestion path (its own `UI` field reads "N/A at
this WP").

**Consequence:** "validated against a second, differently-shaped data source" can only be satisfied at
**model/service level**, not end-to-end. This is consistent with WP-016's own canonical `Tests` field
("unit, schema-generality regression") and with `085` (connectors) being explicitly out of scope — but
it must be stated plainly rather than discovered at acceptance.

## 4. Verifications required by this authorization

| Required check | Result |
|---|---|
| Re-verify next free migration number (§9 — "DO NOT assume `089_` is still free") | highest existing is **`088_`** → **`089_` is still free**, re-verified this session |
| Next free report number (§20) | **212** free — this report. No discrepancy |
| Worktree state | `feature/wp088-responsive-design-system-full-closure`, **clean (0 entries)**, HEAD `8a3af86` (pushed) |
| Dirty Living KORAL worktree | not touched |

## 5. 🛑 HOLD REASON 1 — the authorization is truncated

The instruction text ends mid-word inside **§22 STOP CONDITIONS**: the final line reads
`* platform-wid` and terminates. §22 is precisely the section enumerating the conditions under which
implementation must halt. Proceeding to write a migration and change canonical write behaviour while
the governing stop-condition list is provably incomplete is not defensible under this project's own
Read-Before-Write protocol. The missing conditions are requested verbatim.

## 6. 🛑 HOLD REASON 2 — branch strategy not authorized

§19 permits local implementation and says to "use the current clean WP execution worktree/branch
strategy", but the clean worktree sits on the **WP-088** branch, fully pushed. Creating a WP-016
branch is a `checkout`/branch operation, which previous instructions in this session explicitly
forbade and this one does not clearly authorize. Committing WP-016 onto the WP-088 branch would
corrupt that branch's completed scope. Explicit instruction requested.

## 7. Sibling-model relationship (recorded per §4 and §13, not resolved)

Migrations **055** (Need Hypothesis), **064** (Resource Allocation) and **065** (Commitment Draft)
each state in their own headers that they use the **"identical shape to
`analytics.observed_investment_fact`"** (055:90, 064:223, 065:38). WP-016 generalizes **only** the
canonical Investment model under its literal scope, so after WP-016 those three siblings will
**intentionally diverge** from the model they were built to mirror. This divergence is recorded, not
resolved. No lateral refactor, no consistency cleanup, no platform-wide spine migration. Should shared
types or shared services cause a regression, only the minimum compatibility change will be made.

## 8. WP-085 statement (per §14)

WP-016 contributes a **mechanical** dependency unlock for `085` (`085` = `016` + `028`; `028`
COMPLETE). **WP-085 is NOT operationally actionable**: its own spec carries `External Blockers:
Gate 3`, and Gate 3 is OPEN. Mechanical dependency satisfaction ≠ external gate readiness.

## 9. Boundary attestations

No Product Experience work: no typography, visual language, density, surface hierarchy, motion,
iconography, brand expression, dashboard composition, navigation presentation or art direction
decided or touched. PX-A/B/C remain provisional, unnumbered, non-canonical, not started. Living KORAL
untouched: `117` not reopened, no Round 6, no Package B, `BoundedKoralGeometry` and manifestation
logic not modified. No Product code, test or migration written. Nothing committed, nothing pushed.
Production not contacted; the Vercel environment-scoping concern was not investigated. Report 211 not
discarded or rewritten. `scripts/provision-next-review.mjs` never addressed by any command.

---

**Report 212 · WP-016 Phase 0 · Candidates FOUND · Implementation HELD pending §22 completion and branch authorization**
