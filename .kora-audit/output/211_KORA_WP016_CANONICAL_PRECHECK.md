# 211 — KORA-WP-016 Canonical Pre-Check (Structured Spine + Normalized Data/Evidence Layer)

**Mode: READ-ONLY. Nothing implemented. No Product code, test, migration, commit, push, staging or Production touched.**

**Headline: WP-016 is mechanically READY and technically well-scoped — but it is NOT safe to start.
Both of its Primary Closures rest on product direction that is explicitly NOT FROZEN. This requires
Founder adjudication before implementation, and is escalated, not reconciled.**

---

## 1. Verified canonical specification (Registry 142, verbatim fields)

| Field | Value |
|---|---|
| Title | Structured Spine + Normalized Data/Evidence Layer |
| Increment | **I1** ✓ (report 210 correct) |
| Purpose | "extend `CORE-004`'s data model generality" |
| Pilot Status | BASE PILOT NON-BLOCKER |
| Primary Closures | **`CORE-015`, `CORE-016`** |
| Arch Sources | `64` (Canonical Requirement Ledger v1.1) |
| Code Truth | PARTIAL |
| Existing Paths | **N/A** — *stale, see §4.3* |
| Proposed New | **"schema generalization on the Investment module"** |
| Hard Deps | `KORA-WP-014` — **COMPLETE** ✓ |
| Conditional Deps | N/A |
| Data/Migration Impact | **ADDITIVE** · Expand only |
| Service/API | "extension of `014`'s service" |
| **Auth/RLS** | **"inherited from `014`"** |
| **UI** | **N/A** ✓ — confirms this is not a Product Experience WP |
| **Tests** | **"unit, schema-generality regression"** |
| Acceptance | "structured spine validated against a second, differently-shaped data source" |
| Out of Scope | full connector library (`KORA-WP-085`) |
| Size / Uncertainty | **M** / MEDIUM |
| Feature Flag / Rollback | NO / additive |
| External Blockers | **none** |

### 1.1 Corrections to report 210

Report 210's summary was verified against source. One item does not survive:

- ❌ **"real DB / RLS validation may be material"** — **not supported.** The canonical `Auth/RLS`
  field reads "inherited from `014`", and `Tests` reads "unit, schema-generality regression" only.
  WP-014's own spec, by contrast, explicitly lists "RLS" in its Tests field. The registry
  distinguishes the two deliberately. **WP-016 requires no new RLS work.** (Real-DB validation is
  nonetheless required by *repo policy* — see §9 — which is a different justification.)
- ✅ Confirmed: I1 · MEDIUM breadth · non-leaf · unlocks `085` · no Founder decision needed *to begin
  a pre-check* (one **is** needed before implementation — §4).
- ⚠️ Refined: "likely affects ingestion → UEF / normalized evidence path" — the *Investment* module is
  in scope; the UEF path is the **pattern to follow**, not the thing being changed (§2.2).

---

## 2. What WP-016 actually means in KORA architecture

### 2.1 The two requirements it closes (Ledger `64`)

| ID | Capability | Decision | State | Source Authority |
|---|---|---|---|---|
| `CORE-015` | Structured spine / flexible edges | MODIFY | PARTIAL | **PT §12, PD-029** |
| `CORE-016` | Normalized Data & Evidence layer | MODIFY | PARTIAL | **PT §14** |

**PT §12 — "Input architecture: structured spine, flexible edges"** establishes: multiple entry paths
for the same concept (file, wizard, Program, Commitment, Partner, Listening, Evidence); minimum
required first; assisted mapping; saved understanding; *fixed comparability where it matters*; explicit
exceptions.

**PT §14 — "Normalized Data & Evidence layer"** requires KORA to distinguish raw data, normalized
data, Evidence and interpretation, with **provenance and uncertainty recoverable**, and states
explicitly that "Normalized Company Data & Evidence" is **a functional description, not a new domain
object to freeze**.

### 2.2 The concrete shape, read from the repository

The spine-plus-flexible-edge pattern **already exists in KORA** — in the ingestion layer, not the
Investment layer:

| Table | Structured spine | Flexible edge | Source discriminator |
|---|---|---|---|
| `analytics.uef_record` (mig 001) | tenant, batch, period, pillar, action_family, event_nature, 3 approval flags, completeness, `missing_fields text[]`, review state | **`payload jsonb`** | via `batch_id` |
| `analytics.source_batch` (mig 001) | tenant, counts, quality metrics, status | **`payload_sample jsonb`** | **`source_type`** (`welfare_provider \| lms \| hr_aggregate \| esg \| partner \| manual`) |
| `analytics.observed_investment_fact` (mig 053, WP-014) | tenant, provenance (`recorded_by_role/id`), `purpose`, 5 typed "if known" columns, `unknown_fields text[]`, inert `commitment_ref` | **none** | **none** |

**So WP-016's plain reading is: give the Investment module the generality the ingestion module already
has** — a source/shape discriminator and a flexible edge — so a second, differently-shaped source can
populate `observed_investment_fact` without a new typed column per source.

> **This reading is evidence-based but NOT canonically stated.** The registry says only "schema
> generalization on the Investment module". The actual mechanism (JSONB edge vs. attribute table vs.
> per-source mapping) is an **architecture decision the registry does not make** — see §4.2.

---

## 3. What exists already in the repository

| Artefact | State |
|---|---|
| `supabase/migrations/053_observed_investment_fact.sql` | 12 columns, RLS enabled + **FORCE**, 2 policies (`kora_admin_all_*`, `company_own_*_read`), 3 indexes, commented rollback block. Uses **Pattern A** (tenant-claim-bound) per `docs/RLS_COMPANY_SCOPED_PATTERN.md` |
| `lib/investment-map/observed-investment-fact-service.ts` | 198 lines — `createObservedInvestmentFact`, `listObservedInvestmentFactsForTenant`, `deriveUnknownFields`, row mapper, generic governance-event emission |
| `tests/unit/kora-wp-014-observed-investment-fact.test.ts` | ~20 cases: persistence, explicit provenance, **Unknown never coerced to 0/false/empty**, `unknownFields` correctness, domain invariants, no-adjacent-governance structural guards, error surfacing, additive-migration guard |
| Downstream consumers | `lib/supabase/types.ts`, `lib/commitment/commitment-service.ts`, `lib/admin-capability/capability-service.ts` |
| Downstream test coverage | `kora-wp-017-need-hypothesis`, `rls-two-tenant-negative`, `wp-045-first-pilot-e2e-scenario` |
| **Pattern dependants** | migrations **055** (Need Hypothesis), **064** (Resource Allocation), **065** (Commitment Draft) each state they use the **"identical shape to `analytics.observed_investment_fact`"** |

## 4. What is missing / is the canonical scope still coherent?

### 4.1 Missing (technical)
1. No flexible edge on `observed_investment_fact` — no `jsonb`, no extension column.
2. No source/shape discriminator — unlike `source_batch.source_type`.
3. No second, differently-shaped source to validate against — **the Acceptance criterion has no
   defined subject**. Which second source counts is not specified anywhere.
4. No "schema-generality regression" test and no precedent for one in the suite.
5. No connector — correctly out of scope (`085`).

### 4.2 🛑 ESCALATION — canonical coherence is PARTIAL

**Both Primary Closures rest on explicitly NON-FROZEN product direction:**

| Source | Verbatim status | Consequence |
|---|---|---|
| **PT §12** (CORE-015) | "**CURRENT DIRECTION — BLUEPRINT FINAL / CODE TRUTH LATER**" | the input architecture is a blueprint, deferred to Code Truth |
| **PD-029** (CORE-015) | "Structured spine, flexible edges is the input architecture **candidate**." — status **PROPOSED** | the *only* named decision behind CORE-015 is a candidate, not a decision |
| **PT §14** (CORE-016) | "**CURRENT DIRECTION — TO FREEZE**", and: Normalized Company Data & Evidence is "**una descrizione funzionale, non come nuovo domain object da congelare**" | forbids creating a new domain object here |
| **PT §13** | "Il Blueprint non decide se il codice attuale va mantenuto o riscritto. **Questo sarà un gap decision dopo il Code Truth Audit.**" | a keep-or-rewrite gap decision is still pending |

**No conflict between sources was found — the sources agree with each other. The problem is that they
agree on being unfrozen.** Per the governing instruction this is escalated for Founder review and not
reconciled here. Implementing WP-016 means choosing the input architecture, which PD-029 leaves open.

**Second coherence risk (architecture, not governance):** migrations 055, 064 and 065 explicitly
copied `observed_investment_fact`'s shape. Generalizing only the Investment module makes the Investment
table **diverge from the three tables that were built to mirror it**. Whether WP-016 generalizes one
module (as its "Out of Scope" and "Proposed New" fields say) or establishes a platform-wide spine
pattern is a Founder/architecture decision the registry does not make.

### 4.3 Registry staleness (not a conflict)
`Existing Paths: N/A` was written before WP-014 shipped. `lib/investment-map/` and migration 053 now
exist. This is a point-in-time field, not a contradiction; recorded for accuracy.

## 5. Exact files / schemas / services / flows expected to change

| Layer | Expected change | Confidence |
|---|---|---|
| Migration | **one new additive migration — next free number is `089_`** | HIGH (`Data/Migration Impact: ADDITIVE`) |
| Schema | `analytics.observed_investment_fact` — additive columns only | HIGH |
| Service | `lib/investment-map/observed-investment-fact-service.ts` — extend `CreateObservedInvestmentFactParams`, `toFact`, `deriveUnknownFields` | HIGH (`Service/API: extension of 014's service`) |
| Types | `lib/supabase/types.ts` — regenerate/extend the row type | HIGH |
| Tests | new `tests/unit/kora-wp-016-*.test.ts` (schema-generality regression) | HIGH |
| RLS | **none** | HIGH (`Auth/RLS: inherited`) |
| UI | **none** | HIGH (`UI: N/A`) |
| Possibly touched | `lib/commitment/commitment-service.ts`, `lib/admin-capability/capability-service.ts` if the row type widens | MEDIUM |

## 6. Database changes? **YES** — additive, Expand only, one migration (`089_`). Staging-applicable under Gate 2's conditions; production remains blocked by Gate 3/5.

## 7. RLS / security changes? **NO.** `Auth/RLS: inherited from 014`. Existing policies on the table cover new columns automatically. ⚠️ If implementation proposes a **new table**, that exceeds "inherited" and must be re-escalated before proceeding.

## 8. Canonical write behaviour? **YES, additively.** `createObservedInvestmentFact` gains parameters. Three invariants must survive unchanged: (a) Unknown is never coerced to `0`/`false`/`''`; (b) `unknown_fields` names exactly the omitted "if known" columns; (c) exactly one generic governance event per successful creation, none on failure. All three are already asserted by the WP-014 suite, which must continue to pass unmodified.

## 9. Real-DB validation required?

**Canonically: no** — `Tests: unit, schema-generality regression`.
**By repo policy: yes, unavoidably.** `.github/workflows/ci.yml:66` defines a **mandatory** DB-backed
gate — "RLS-03/05/06 + KORA Link behavioral suite (Docker/Supabase CLI, mandatory)" — which explicitly
**cannot silently skip** ("DB unavailability, a skipped suite, or an RLS regression all…"; F-04). Any
new migration is exercised against a real local Postgres by that gate. `rls-two-tenant-negative`
already touches `observed_investment_fact`, so the table is under live-DB assertion today.

**Conclusion: real-DB validation is required — by CI policy, not by WP-016's own acceptance.** Report
210 reached the right operational answer for the wrong canonical reason.

## 10. What could break downstream

| Risk | Severity | Note |
|---|---|---|
| Pattern divergence from migrations 055 / 064 / 065 | **MEDIUM** | three tables explicitly mirror this shape (§4.2) |
| Row-type widening breaks `commitment-service` / `capability-service` | LOW | additive; `tsc --noEmit` catches it |
| WP-014 invariants weakened by a generic edge (Unknown-vs-null discipline) | **MEDIUM** | a JSONB edge can smuggle `{}` past `unknown_fields` discipline — guard explicitly |
| `wp-045-first-pilot-e2e-scenario` regression | LOW | additive |
| Migration numbering collision | LOW | `089_` is next free |
| Acceptance unverifiable | **HIGH** | "a second, differently-shaped data source" is undefined — must be named before start (§11) |

## 11. Does it unlock WP-085?

**Mechanically YES — operationally NO.**

`085` Hard Deps = `016` + `028`. `028` is COMPLETE, so completing `016` moves `085` READY. But
`KORA-WP-085`'s own spec carries **`External Blockers: Gate 3`** — and Gate 3 (Legal/DPO) is **OPEN**.
`085` is also XL, HIGH uncertainty, NOT BASE PILOT SCOPE, I5. **The unlock is real but not
executable.** WP-016 should not be justified by it.

---

## 12. Founder adjudications required before implementation

1. **PD-029 is PROPOSED.** Ratify "structured spine, flexible edges" as the input architecture, or
   defer WP-016. *Implementing it silently ratifies it.*
2. **PT §14's "TO FREEZE" status** and its prohibition on creating a new domain object — confirm the
   generalization adds no new domain object.
3. **Mechanism:** JSONB flexible edge (mirroring `uef_record`) vs. attribute table vs. per-source
   mapping. Not specified canonically.
4. **Blast radius:** Investment module only (registry's literal scope) vs. platform-wide spine pattern
   shared with migrations 055/064/065.
5. **Acceptance subject:** name the "second, differently-shaped data source" — without it the WP
   cannot be accepted.
6. **Sequencing:** WP-016 next, or canonicalize PX-A first (report 210 §26). Completing WP-016 takes
   cadence to **10** and makes the Formal Consolidation Audit **mandatory**.

## 13. Boundary attestations

No Product Experience work, no UI, no typography, no visual direction, no IA change, no PX-A/B/C
anticipation. Living KORAL untouched: `117` not reopened, no Round 6, no Package B,
`BoundedKoralGeometry` not addressed. Read-only throughout; the only write is this report. Staging and
Production not contacted. `scripts/provision-next-review.mjs` never addressed by any command.

---

**Report 211 · WP-016 Pre-Check · Mechanically READY · NOT SAFE TO START pending Founder adjudication**
