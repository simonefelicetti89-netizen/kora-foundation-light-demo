# 214 — KORA-WP-016 Pre-Push Code-Truth & Git-State Review

**Mode: READ-ONLY. No code, test, migration or commit touched. Nothing pushed. Only this report written.**

> **VERDICT: NO-GO — REMEDIATION REQUIRED.** The edge is structurally bounded but its **key namespace,
> key count and payload size are entirely open**, empirically proven below. Under §15's own rule a
> PARTIALLY bounded edge is NO-GO unless canonical KORA semantics *clearly establish* structural
> flatness alone as the intended bound — and they do not. The remediation is small and may be a
> single Founder ratification with **zero code change** (§15.2). Report 213's phrase *"the natural
> bound is the source's own column count"* is a real-world expectation, **not** an enforced bound,
> and is corrected here.

---

## 1. Git state

| Item | Value |
|---|---|
| Branch | `feature/wp016-structured-spine-normalized-evidence` |
| HEAD | `4cfde847356b885e626cb361355aae47d0560cc3` |
| Parent / branch point | `8a3af8668c528fdd4efd2a8a01760a2155044d2e` ✅ exactly as expected |
| Worktree clean | **YES** (0 porcelain entries) |
| Origin branch | **does not exist** — `fatal: Needed a single revision`; no upstream configured |
| Ahead/behind | **N/A** — unpushed local branch; a first push would create the remote branch |
| Commit subject | `feat(investment): add bounded flexible edge to the Investment spine` |
| Report 213 in the commit | **NO** — `.kora-audit/` is gitignored (`.gitignore:54`), confirmed by `git check-ignore -v` |

No fetch was needed: the branch has no remote counterpart, so no remote knowledge affects push safety.

## 2. Process deviation (recorded, not repaired)

**`LOCAL COMMIT CREATED BEFORE FOUNDER REVIEW` — recorded.** No Product consequence, no history
rewrite required, nothing pushed. No amend, reset, rebase, cherry-pick or recommit was performed.
Not to be repeated on future WPs.

## 3. Commit scope — all 8 files classified

| File | +/− | Classification |
|---|---|---|
| `supabase/migrations/089_investment_source_attributes_flexible_edge.sql` | +175/−0 | **migration** |
| `lib/investment-map/observed-investment-fact-service.ts` | +83/−0 | **Product/service code** |
| `lib/supabase/types.ts` | +4/−0 | **manual Supabase type** |
| `tests/unit/kora-wp-016-structured-spine-flexible-edge.test.ts` | +369/−0 | **WP-016 test** |
| `tests/unit/kora-wp-042-fee-independence-guard.test.ts` | +1/−1 | **compatibility-only test edit** |
| `tests/unit/kora-wp-044-security-hardening-batch.test.ts` | +1/−1 | **compatibility-only test edit** |
| `tests/unit/kora-wp-112-material-change-layer.test.ts` | +1/−1 | **compatibility-only test edit** |
| `tests/unit/kora-wp-113-transformation-ledger-morphogenesis.test.ts` | +1/−1 | **compatibility-only test edit** |

**Cross-WP claim VERIFIED.** The full diff of all four is four lines: `toBe(88)` → `toBe(89)` plus an
appended comment. WP-042's pre-existing trailing comment is preserved verbatim. No assertion, no
describe/it text, no other behaviour changed. **No additional cross-WP behaviour changed — nothing
to flag.**

## 4. Boundedness — empirical code truth

Probed **read-only** by calling the validator directly (`SELECT kora.investment_source_attributes_valid(...)`),
no inserts, no transaction, no state.

| Probe | Validator result |
|---|---|
| empty object · json null value · empty string value · boolean · number | **accepted** |
| **empty-string key `""`** | **accepted** |
| **arbitrary junk key `zzz_whatever_9`** | **accepted** |
| **2000 arbitrary keys** | **accepted** |
| **1 MB single string value** | **accepted** |
| alias pair `coverage` + `copertura` together | **accepted** (no dedup) |
| nested object · array value · top-level array · top-level scalar · JSON `null` literal | **rejected** |
| reserved key `amount` · reserved key `created_at` | **rejected** |
| SQL `NULL` input | returns `NULL` → a CHECK passes on NULL, but the column is `NOT NULL`, so unreachable |

### Answers to §5 A–H

- **A. Top-level JSON type bounded to object: YES** — `jsonb_typeof(attrs) = 'object'`; arrays, scalars and JSON `null` all rejected.
- **B. Value shape bounded to flat scalars: YES.** Accepted: JSON `string`, `number`, `boolean`, `null`. TypeScript side accepts `string | number | boolean | null`.
- **C. Reserved typed-spine keys: cannot be present — NO, they cannot.** All 14 rejected: `id`, `tenant_id`, `source_batch_id`, `recorded_by_role`, `recorded_by_id`, `purpose`, `amount`, `provider`, `population_descriptor`, `reach_summary`, `evidence_summary`, `unknown_fields`, `commitment_ref`, `created_at`.
- **D. Nesting persistable: NO** — nested objects and arrays rejected at both layers.
- **E. Arbitrary non-reserved key persistable: YES — the key namespace is fully OPEN.** Any string that is not one of the 14 reserved names is accepted, including an empty-string key. There is **no** allow-list, no prefix rule, no source-derived vocabulary check.
- **F. Key-count bound: NO** — 2000 keys accepted; no cap anywhere.
- **G. Payload-size bound: NO** — a 1 MB single value accepted; no cap anywhere (only Postgres's own ~1 GB field ceiling).
- **H. Source-aware validation: NO.** `source_attributes` is **never** validated against `source_batch_id → source_batch.source_type`. Any attributes may be stored regardless of source, and `source_batch_id` may be NULL entirely. **Additional finding: the two vocabularies do not intersect for this WP's own approved source** — `source_batch.source_type` ∈ {`welfare_provider`, `lms`, `hr_aggregate`, `esg`, `partner`, `manual`} while `IntakeFileRole` ∈ {`initiatives`, `budget`, `participation`, `evidence`, `lms`, `provider`, `policy`, `unknown`}. Only `lms` overlaps; **there is no `policy` source_type at all**, so the approved second source cannot currently be named by the discriminator path even in principle.

## 5. Boundedness adjudication (§6)

### **B — PARTIALLY: STRUCTURALLY BOUNDED BUT THE SEMANTIC/KEY BOUNDARY IS OPEN.**

Structure is genuinely governed: object-only, flat, scalars only, and the spine is structurally
unreachable from the edge. That is real and it is enforced in both layers.

Semantics are not governed at all: **any key, any number of keys, any size.** Report 213's
justification — "once values are scalars drawn from a tabular row, the natural bound is the source's
own column count" — describes a *real-world expectation about well-behaved callers*. It is **not**
enforced by the service or the database, and nothing prevents a caller from writing 2000 arbitrary
keys or a megabyte of text. Stated plainly, as required, without softening.

It is not (C): it cannot collide with, duplicate or override the spine, and it cannot carry
structure. But it is not (A) either.

## 6. §15's escape clause — assessed and NOT met

§15 permits GO on a PARTIALLY bounded edge only if *existing canonical KORA semantics clearly
establish that structural flatness alone is the intended bound*. They do not:

- The named precedent `analytics.uef_record.payload` is **entirely unbounded** — no object check, no
  flatness rule, no reserved keys. **No jsonb column in any migration carries a CHECK; no migration
  uses `jsonb_typeof`.** (Re-verified this task.)
- That establishes *"KORA currently has no bound convention"*, which is **not** the same proposition
  as *"structural flatness is the intended bound"*. The precedent is silent on intent, and the
  Founder's own constraint 9 asked for something the precedent does not supply.

WP-016's edge is strictly **more** bounded than the canon it was told to follow — worth stating in
its favour — but that does not satisfy the escape clause as written.

## 7. Service ↔ database contract

**Reserved-key parity: VERIFIED.** TS `SPINE_RESERVED_KEYS` and the SQL `ARRAY[...]` are compared by
a test that extracts the SQL list by regex and asserts `toEqual` — order-sensitive literal
membership. **Scope limit:** it proves *list* parity, not *behavioural* parity — it does not prove
the database rejects each key. The service loop asserts all 14 at TS level; real-Postgres rejection
was directly observed for `amount` and `created_at` only (2 of 14).

**Category parity, per edge case:**

| Case | TS | SQL | Agree |
|---|---|---|---|
| empty object · JSON null value · boolean · number · empty string value | accept | accept | ✅ |
| nested object · array value | reject | reject | ✅ |
| top-level array/scalar/null | reject | reject | ✅ |
| reserved keys (14) | reject | reject | ✅ |
| arbitrary key · empty-string key · 2000 keys · 1 MB value | accept | accept | ✅ (both open) |
| alias pair (`coverage`+`copertura`) | accept | accept | ✅ (no dedup either side) |
| **`NaN` / `Infinity`** | **accept** (`typeof NaN === 'number'`, verbatim guard) | stores JSON `null` after serialization | ⚠️ **divergence** |
| `undefined` value | reject | n/a | ✅ |

**⚠️ Minor finding (not the blocker):** the TS guard accepts `NaN`/`Infinity` because it tests
`typeof value !== 'number'`. JSON serialization turns both into `null`, so the value is silently
mutated in transit — contradicting the report's "round-trips without semantic mutation" claim, which
is only tested for `string`/`number`/`boolean`/`null`. Low severity, no data-safety impact, but real.
A `Number.isFinite` guard would close it.

## 8. Second source validation

| Check | Result |
|---|---|
| Based on actual `IntakeFileRole = 'policy'` signals | **YES** |
| Source code proves the signals exist | **YES** — `lib/data-intake/file-role-detection.ts`, `policy: ['policy','regolamento','procedura','policy_evidence','policy_document','normativa','diritto','smart_working','coverage','copertura','uptake','eligible_population']` |
| Synthetic values used only as values | **YES** — the test asserts every fixture key against the real file; only values are invented |
| No fake Product concept created | **YES** — no new type, route, table or domain object |
| Genuinely differently-shaped vs the WP-014 input | **YES** — no monetary amount, no spine key, entitlement/coverage axis |
| **`policy_document` a real signal** | **SUPPORTED** — present verbatim in the `policy` array above |

## 9. Source discriminator

No new discriminator column: **confirmed** — migration 089 contains no `ADD COLUMN … source_type`,
and a test asserts it. The `source_batch_id → source_batch.source_type` FK is unchanged and intact.
**But it is not *used* by the edge** (§4H): the edge is compatible with that path only in the weak
sense of not disturbing it, and the vocabulary mismatch means `policy` cannot be expressed as a
`source_type` today. No connector or ingestion wiring exists — `createObservedInvestmentFact` still
has no production caller.

## 10. Invariant review

| Invariant | Status |
|---|---|
| Unknown not coerced to 0/false/empty | **VERIFIED** |
| `unknown_fields` semantics unchanged (edge excluded) | **VERIFIED** |
| Exactly one governance event on success | **VERIFIED** |
| No success event on failure (DB error and validation refusal) | **VERIFIED** |
| Typed fields cannot be overridden by the edge | **VERIFIED** (both layers; DB observed for 2 of 14 keys) |
| Provenance recoverable | **VERIFIED** |
| Tenant isolation unchanged | **VERIFIED** — RLS-03 27/27 on real Postgres; policies and GRANTs byte-identical |
| WP-014 shape backward-compatible | **VERIFIED** — default `{}`; the WP-014 suite passes unmodified |

## 11. Migration safety (089 only)

Additive ✅ · expand-only ✅ · exactly one column ✅ · no destructive DDL ✅ · no data rewrite ✅ ·
no new table ✅ · no RLS change ✅ · no GRANT change ✅ · no tenant semantic change ✅ ·
validator declared `IMMUTABLE PARALLEL SAFE` ✅ · CHECK applies to future writes ✅ ·
`DEFAULT '{}'` keeps the old write shape valid ✅.

**Populated table:** safe — `ADD COLUMN … NOT NULL DEFAULT` is metadata-only on PostgreSQL 11+ (no
rewrite), and the new CHECK is satisfied by every backfilled `{}`. **Empty table:** trivially safe.
Idempotent: the re-run was observed to no-op.

## 12. Validation evidence review

| Evidence | Supported |
|---|---|
| Unit 44 relevant passing / 24 new WP-016 cases | **YES** |
| `tsc --noEmit` clean · `eslint` clean | **YES** |
| Full regression 419 files / 13373 passed / 325 skipped / 0 failed | **YES** |
| Real Postgres: migration applied, RLS/GRANTs unchanged, CHECK enforcing | **YES** |
| RLS negative 27/27 | **YES** |

**VALIDATED ON EXISTING MIGRATED DB** (001–088 already present) — yes.
**VALIDATED FROM EMPTY DATABASE / FULL MIGRATION CHAIN** — **NOT RUN**, as report 213 disclosed.

**Assessment: SAFE TO LEAVE TO CI.** This is repository precedent, not an invented allowance:
`.github/workflows/ci.yml:66` defines a mandatory, non-skippable DB gate whose `supabase start` step
"applies every tracked migration fresh", and `docs/ARCHITECTURE_REGISTRY.md` records exactly this
basis for an earlier migration ("verified applying cleanly against a fresh Postgres via the mandatory
DB-backed CI gate"). 089 depends only on migration 053's table and the pre-existing `kora` schema, so
no ordering hazard exists. A local `supabase db reset` remains optional, not required.

## 13. Sibling divergence (055 / 064 / 065)

Not modified — **0 occurrences** of `source_attributes` in all three. They now intentionally differ
from the generalized Investment model. **No current shared-code or type regression:** the only
references from other modules are two comments (`lib/commitment/commitment-service.ts:161`,
`lib/admin-capability/capability-service.ts:21`), not structural coupling, and the full suite passes.
Not remediated, as instructed.

## 14. WP-085

WP-016 completion **would satisfy** `085`'s remaining WP dependency (`085` = `016` + `028`; `028`
COMPLETE). **`085` remains externally blocked by Gate 3 (OPEN)** and is **not** operationally READY.

## 15. Minimum safe remediation (described, not implemented)

Three routes; **1 and 2 require Founder adjudication because §A forbids inventing semantic limits.**

1. **Ratify the bound as-is — zero code change.** Founder declares that for WP-016 the intended bound
   *is* object + flat + scalar + reserved-key exclusion, with key namespace deliberately open. Report
   213's "natural bound" sentence is corrected to say so. Verdict flips B → A. **Recommended: smallest,
   honest, and consistent with the fact that the edge already exceeds every existing KORA precedent.**
2. **Founder-specified numeric caps.** Add a max key count and max serialized size to both
   `kora.investment_source_attributes_valid` and `validateSourceAttributes`. The *numbers* must come
   from the Founder. One additive migration (090) plus a service edit; no schema change.
3. **Source-aware key allow-list.** Validate keys against the intake role's own header vocabulary.
   **Currently blocked** by the vocabulary mismatch in §4H — no `policy` value exists in
   `source_batch.source_type`, so a design decision on how source shape is named would be needed
   first. Largest change; not recommended now.

Optional, independent of the above: a `Number.isFinite` guard to close the `NaN`/`Infinity` divergence (§7).

## 16. Boundary attestations

No Product, test or migration modification. No amend, reset, rebase or push. DB access was read-only
(`SELECT` against a validator function; no insert, no transaction, no state). Production never
contacted. Living KORAL untouched. Cadence unchanged at 9; no DAG recomputation.
`scripts/provision-next-review.mjs` never addressed by any command.

---

**Report 214 · WP-016 pre-push review · Bounded-edge verdict B · NO-GO — REMEDIATION REQUIRED (may be a one-line Founder ratification)**
