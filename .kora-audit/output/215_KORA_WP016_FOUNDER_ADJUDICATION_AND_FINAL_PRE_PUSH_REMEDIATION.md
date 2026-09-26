# 215 — KORA-WP-016 Founder Adjudication & Final Pre-Push Remediation

**Reports 213 and 214 are immutable and were not rewritten.** This report records the Founder's
adjudication of report 214's findings, corrects report 213's boundedness wording going forward, and
documents the NaN/Infinity remediation. **Nothing pushed.**

---

## 1. Founder adjudication — structural boundedness RATIFIED (Option 1)

For KORA-WP-016, **"BOUNDED FLEXIBLE JSONB EDGE" means STRUCTURAL boundedness, not a numeric storage
quota.** The ratified contract:

- top-level JSON object only · flat values only · no nested objects · no arrays;
- canonical typed spine keys forbidden; the edge can never replace or override a typed field;
- the typed spine remains authoritative; source-specific attributes are secondary to it;
- deterministic validation and persistence; provenance preserved; Unknown/null semantics preserved.

**The non-reserved key namespace is DELIBERATELY OPEN.** There is no Founder-mandated key-count
maximum, no payload-byte limit, and no source-specific allow-list. That arbitrary non-reserved flat
scalar keys can technically be persisted is **accepted for WP-016**.

The governance boundary is semantic, not numeric:

```
CANONICAL KNOWN SEMANTICS            ->  typed spine
SOURCE-SPECIFIC / NON-CANONICAL      ->  source_attributes
```

The edge exists precisely to avoid a schema migration for every legitimate differently-shaped source
attribute while keeping a stable canonical spine. An attribute that later becomes canonically
meaningful may be promoted to a typed field by a future canonical WP.

**Report 214's verdict therefore resolves from B to A for WP-016**, by ratification of intent rather
than by code change. Nothing in migration 089 or the service changed for this item.

### 1.1 Correction of report 213's wording (report 213 itself left intact)

Report 213 §3 justified the absence of a numeric cap with: *"once values are scalars drawn from a
tabular row, the natural bound is the source's own column count."*

**That sentence is corrected here. "The source's own column count" is NOT an enforced bound** — it
was a real-world expectation about well-behaved callers, and report 214 proved empirically that 2000
arbitrary keys and a 1 MB value are both accepted. The correct statement is:

> **WP-016 intentionally uses STRUCTURAL boundedness.** The edge is bounded in shape — object, flat,
> scalar, no spine keys — and deliberately unbounded in key namespace, key count and size.

Report 213 is not edited; this correction is the governing wording from now on.

## 2. Policy role vs `source_batch.source_type` — adjudicated

The vocabulary mismatch report 214 raised is **acknowledged and closed, not a defect**.
`IntakeFileRole` and `analytics.source_batch.source_type` represent **different dimensions** and are
not required to share a vocabulary:

| Dimension | Meaning |
|---|---|
| `IntakeFileRole = 'policy'` | the real differently-shaped **semantic input shape** used to prove schema generality |
| `source_batch.source_type` | the existing broader **ingestion/source provenance** classification |

Accordingly, and as instructed: **`policy` was NOT added to `source_batch.source_type`**; its
vocabulary was not modified; no new discriminator column was added; `IntakeFileRole` was not
duplicated onto `observed_investment_fact`; no connector or ingestion wiring was implemented.

WP-016's purpose is **model/schema generality, not semantic ingestion routing.** Precise mapping of
intake roles to connector/source-batch types belongs to future ingestion/connector scope, including
`KORA-WP-085` where applicable. **This resolves the prior discriminator STOP condition.**

## 3. NaN / Infinity remediation (implementation defect, not a Product decision)

**Defect:** `validateSourceAttributes()` tested `typeof value !== 'number'`, so `NaN`, `Infinity` and
`-Infinity` were accepted. JSON represents none of them — serialization turns each into `null` — so
the persisted value would differ from the value the caller passed. That is the semantic mutation the
approved contract forbids. The original round-trip test missed it by exercising only string, number,
boolean and null.

**Fix — minimum correct, one guard:**

```ts
if (typeof value === 'number' && !Number.isFinite(value)) {
  throw new Error(
    `[KORA] sourceAttributes["${key}"] must be a finite number — ` +
      'NaN and Infinity are not representable in JSON and would be persisted as null.',
  );
}
```

Applied only to numeric values. **String, boolean and null behaviour untouched.** The caller now gets
a named error identifying the offending attribute instead of silently storing `null`.

**Migration 089 NOT changed, and correctly so:** JSON has no NaN or Infinity, so PostgreSQL never
receives one. The defect existed solely on the TypeScript side of the boundary. No key-count cap,
byte cap, allow-list, discriminator, table, RLS or GRANT change was made.

## 4. Tests added (8 new cases)

finite integer accepted · finite decimal accepted · numeric extremes (`0`, `-1`, `MAX_SAFE_INTEGER`)
accepted · `NaN` rejected · `Infinity` rejected · `-Infinity` rejected · a non-finite value fails the
whole write with **no row and no governance event** · accepted numerics round-trip unchanged · an
explicit `JSON.parse(JSON.stringify(x))` identity check proving TS-validator output and JSONB
persistence expectations now agree · the approved policy-shaped fixture still valid.

## 5. Validation results

| Check | Result |
|---|---|
| Focused WP-016 + WP-014 suites | **52 passed** (was 44; +8) |
| WP-014 regression | **passes unmodified** |
| `tsc --noEmit` | **clean** |
| `eslint` (touched files) | **clean** |
| **Full regression `npm test`** | **419 files passed · 13381 passed · 325 skipped · 5 todo · 0 failed** |
| **DB re-validation required** | **NO** |

Full regression **was** rerun rather than deferred — it costs ~10s, so there was no reason to leave
it as a pre-completion obligation. It is green now, not pending.

**Why no DB rerun:** the remediation changes TypeScript validator logic only. Migration 089 is
byte-identical, `kora.investment_source_attributes_valid` is unchanged, and no JSON value category
reaching Postgres changed — JSON cannot carry NaN/Infinity, so the database never saw them either
before or after. Report 213 §6's real-Postgres evidence (migration applies cleanly and idempotently,
RLS enabled + forced with both policies byte-identical, GRANTs unchanged, both row shapes insert,
nested/array/reserved-key/non-object all rejected, RLS-03 27/27) **remains valid and is not
invalidated by this change.**

**Still outstanding, unchanged from report 214 §12:** from-zero full-migration-chain validation was
not run locally and remains **safe to leave to CI**, which applies every tracked migration fresh
(`.github/workflows/ci.yml:66`) — documented repository precedent, not an invented allowance.

## 6. Final pre-push state

| Item | Value |
|---|---|
| Branch | `feature/wp016-structured-spine-normalized-evidence` |
| Previous HEAD | `4cfde847356b885e626cb361355aae47d0560cc3` |
| Remediation commit | `53c643f7719e7dcf2d6a165ac2f10f0b243e8563` |
| Parent of remediation commit | `4cfde847…` ✅ history preserved |
| Branch point | `8a3af8668c528fdd4efd2a8a01760a2155044d2e` |
| Worktree clean | **YES** (0) |
| Origin branch | **still absent** — no upstream, not independently created |
| Pushed | **NO** |

Remediation commit scope — exactly two files, additive:
`lib/investment-map/observed-investment-fact-service.ts` (+10) ·
`tests/unit/kora-wp-016-structured-spine-flexible-edge.test.ts` (+59).

`4cfde847…` was **not** amended, reset, rebased or rewritten in any way.

**Process deviation from report 214 §2 (`LOCAL COMMIT CREATED BEFORE FOUNDER REVIEW`) stands as
recorded.** This remediation commit was explicitly authorized in advance, so it does not repeat it.

## 7. Status and cadence

**WP-016 = IMPLEMENTED + VALIDATED + READY FOR PUSH AUTHORIZATION.**

It is **NOT formally COMPLETE**. Completion additionally requires Founder review of this final
evidence, an authorized push, remote-state verification, and canonical completion housekeeping.
**Cadence remains 9** until formal completion; no DAG recomputation was performed.

## 8. Boundary attestations

No PX-A/B/C work · no sibling 055/064/065 redesign · no UEF modification · no connector
implementation · no WP-085 implementation · no Living KORAL work · no Production contact · no Vercel
change · **no push** · reports 213 and 214 not rewritten ·
`scripts/provision-next-review.mjs` never addressed by any command.

---

**Report 215 · WP-016 · structural boundedness ratified · NaN/Infinity remediated · READY FOR PUSH AUTHORIZATION**
