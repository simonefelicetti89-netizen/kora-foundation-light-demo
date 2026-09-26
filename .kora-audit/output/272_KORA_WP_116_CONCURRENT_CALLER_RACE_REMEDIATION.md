# 272 — KORA-WP-116 "KORAL Review" — Concurrent-Caller Race Remediation (canonical record)

**Date:** 2026-09-26
**Status:** REMEDIATED, VALIDATED AND CANONICALLY INTEGRATED. WP116 remains **COMPLETE** (Registry 219 Section AL.2, unchanged).

**Authority chain (corrected — see §11):** Registry `219` (the sole authoritative executable registry for the reconciled post-110 line; `KORA-WP-116` Section B entry, as amended 2026-09-26) → report `176` (WP116 canonical pre-check) → report `177` (WP116 implementation report, incl. its 2026-09-19 remediation addendum) → **canonical CI #340 (run `36258620941`) DB-backed gate failure** → contract-first investigation → Founder Authorization "WP116 CONCURRENCY REMEDIATION" (2026-09-26).

Registry `142` is **superseded historical canon** and does **not** govern this package. An earlier version of this record (misfiled as report `192` on the `audit/mega-code-truth-2026-09` branch) wrongly named `142` as WP116's governing registry; §11 records that error rather than hiding it.

---

## 1. WHAT CANONICAL CI FOUND

CI #340's DB-backed gate failed one assertion:

```
AssertionError: expected false to be true // Object.is equality
  at tests/unit/kora-wp-116-koral-review.test.ts:376:63
```

That line is `expect(settled.every((r) => r.value.recognized === true)).toBe(true)`. A **fulfilled** `confirmAmbiguousCandidate()` call returned `recognized: false`.

The nondeterminism is proven, not inferred: **CI #339 (run `36257582329`) and CI #340 (run `36258620941`) ran the same Product SHA `467893cf8fa0731cab698e1be917eba078dcd4d8`** — #339 green, #340 red. Scheduling alone separated them.

Latent and pre-existing, unrelated to KORA Index V2 (`KORA-WP-141`/`KORA-WP-142`): `lib/living-koral-review/review-service.ts` last changed in `cca814f` (2026-09-19) and its test in `b78bcf1` (2026-09-19); no design-v2 commit (`a93019d`…`467893c`) touches either file.

## 2. THE NORMATIVE CONTRACT (established independently of the failing assertion)

Registry 219's WP116 entry records `Async/Idempotency: N/A` and is **silent on concurrent-caller return semantics** — it therefore cannot be cited for or against line 376.

The only normative statement in force was the service's own published interface, `ConfirmAmbiguousCandidateResult.recognized`, which binds `false` to a claim **about persisted state**: the candidate stays CANDIDATE, not an error. The implementation additionally declared its own intended loser semantics explicitly: `if (!wonRace) return { …, recognized: true }`.

| Property | Requirement | Enforced by |
|---|---|---|
| Persisted final state | one row, `RECOGNIZED`, `recognition_source='advisor-confirmed'` | KORA-WP-112 compare-and-swap `UPDATE … WHERE status='CANDIDATE'` |
| Ledger exactly-once | one `decrease_extent` row | `gov.record_living_koral_transformation` — `INSERT … ON CONFLICT (material_change_id) DO NOTHING` under `analytics.living_koral_state … FOR UPDATE` |
| Winner semantics | `recognized: true`, steps 9 + 10 executed | wrapper |
| Loser semantics | `recognized: true`, steps 9 + 10 skipped | wrapper |
| Equivalent results across concurrent callers | required — `recognized:false` is a statement about persisted state | wrapper |

**Line 376 was correct and was not weakened.**

## 3. ROOT CAUSE — ONE BOOLEAN CARRYING TWO MEANINGS

The wrapper's re-verification closure returned `false` for two unrelated facts:

```ts
return !!fresh && fresh.status === 'CANDIDATE' && isCurrentlyConfirmable(fresh.category);
```

KORA-WP-112 defines `false` as *"the source no longer supports the transition → legitimately stay CANDIDATE"*. The closure **also** returned `false` when a concurrent caller had already promoted the row. WP-112 behaved correctly for its own contract; the wrapper mis-reported the outcome.

`isCurrentlyConfirmable` is a pure function of category over static config, and `'Weakening'` is eligible with a non-null `decrease_extent` mapping, so the status term was the only variable one. Empirically the promise *fulfilled* rather than rejected, so step 7's gate had passed — hence `reverify === false` there meant "a concurrent caller already recognized it", never ineligibility.

## 4. THE FOUR INTERLEAVINGS, KEYED ON WHERE THE WINNER'S COMMIT LANDS

| | Winner commits… | KORA-WP-112 behaviour | Pre-remediation result | Line 376 |
|---|---|---|---|---|
| **L0** | before the loser's step-6 read | — | step 6 throws → promise **rejects**, excluded by `filter(fulfilled)` | tolerated |
| **L1** | after step 6, before `assess`'s own first read | `status !== 'CANDIDATE'` → returns the RECOGNIZED record, **no throw** | fell through as winner → **duplicate provenance event** | passed |
| **L2** | after that read, before the loser's reverify | reverify false → returns the stale CANDIDATE snapshot, **no throw** | **`recognized:false`** about a RECOGNIZED row | **FAILED — CI #340** |
| **L3** | after the loser's reverify | its CAS matches zero rows → **throws** | `catch` → converged, `recognized:true` | passed |

The pre-remediation wrapper handled **L3 only** — its graceful-race handling lived in a `catch` block whose own comment assumed the loser "throws". Two of the three real loser interleavings do not throw.

## 5. REMEDIATION (wrapper only — `lib/living-koral-review/review-service.ts`)

**Remediation 1 (L2).** Before returning a negative result, re-read canonical persisted state. If the row is already `RECOGNIZED`, the caller is a concurrency loser that converged on the successful final state: return `recognized: true` with the canonical record, without duplicating the winner's side effects. If the row genuinely has not been recognized, the pre-existing `recognized: false` semantics are preserved exactly.

**Remediation 2 (L1).** Winner status is now derived from **whether this caller's own re-verification actually ran and observed a still-CANDIDATE row** — i.e. whether it reached and won the CAS — instead of from whether an exception was thrown. A caller whose `assess` short-circuited on an already-RECOGNIZED row never attempted the CAS, so it skips step 9 (provenance event) and step 10 (ledger chaining).

**Not changed:** KORA-WP-112 semantics; the compare-and-swap; the ledger RPC and its `ON CONFLICT` idempotency; any schema, migration, RLS policy or grant; the public API shape; the `recognized` contract; any other Product file.

## 6. REGRESSION COVERAGE — DETERMINISTIC, NOT PROBABILISTIC

Four tests in `tests/unit/kora-wp-116-koral-review.test.ts`, each injecting one real complete **winning** confirmation at one precise point inside the loser's call, through the existing `material-change-service` module seam. Deterministic orchestration of a real race — never repeated execution, never retry-until-green. No production architecture change was required.

- **L1** — both callers return `recognized:true`; exactly one provenance event.
- **L2** — loser returns `recognized:true`, never the stale CANDIDATE snapshot (CI #340's exact interleaving).
- **L3** — the pre-existing path still converges.
- **NEGATIVE** — genuine write-time non-confirmability still yields `recognized:false`, row stays `CANDIDATE`, **no** ledger row, **no** provenance event.

Each asserts the same canonical footprint: one `RECOGNIZED` row with `recognition_source='advisor-confirmed'`, exactly one `decrease_extent` ledger row, exactly one `koral_review.candidate_confirmed` event.

**Proven to be real regression tests** — against the pre-remediation service with fixtures present:

```
FAIL  L1 …  AssertionError: expected 2 to be 1        ← the duplicate provenance event
FAIL  L2 …  AssertionError: expected false to be true ← CI #340's exact assertion message
     L3 …  PASS   (the catch block already handled it)
NEGATIVE …  PASS   (the fix is narrow)
Tests  2 failed | 24 passed (26)
```

## 7. IMPACT

- **Canonical persisted state was never corrupted, in any interleaving.**
- **Ledger exactly-once held in all four interleavings** — DB-enforced, not wrapper-enforced.
- Wrong behaviour was confined to the **Advisor-facing return value** (L2) and **one duplicate provenance event** (L1). No privacy, Gate, schema or migration implication.

## 8. VALIDATION EVIDENCE

Local, disposable infrastructure only (local Docker Supabase; Production `azdnepfmwrmacruykskm` never contacted; no staging writes):

| Gate | Result |
|---|---|
| `npx tsc --noEmit` | clean |
| `npm test` (full suite) | 438 files, **13985 passed, 0 failed**, 349 skipped, 5 todo |
| `npm run build` | success |
| `npm run lint` | **0 errors** (6193 pre-existing warnings) |
| WP116 targeted suite (DB gate on) | **26/26 passed** |
| R0-A DB-gated suites | **190/190 passed, 0 failed, 0 skipped** (186 → 190) |
| RLS-03…28 integration gate | **329/329 passed, 0 failed, 0 skipped** |
| KORA Link behavioral suite (C1–C10) | **85/85 passed** |

## 9. PRODUCT SHA DISCIPLINE

- **KORA Index V2 Founder-approved visual implementation SHA:** `467893cf8fa0731cab698e1be917eba078dcd4d8` — unchanged; Founder Visual Acceptance is **not** moved.
- **Current canonical Product SHA after this remediation:** `4069072ff2a044b6326bf4f28f4be03f6320acad` — clean fast-forward descendant, one commit, two files, zero visual/design/UI files. No new visual acceptance required.

## 10. CI EVIDENCE

| Run | Ref | Result |
|---|---|---|
| **KORA CI #341**, run `36270909658` | `integration/wp116-ci-proof-2026-09-26`, head `4069072ff2a0…` | success, 4/4 |
| **KORA CI #342**, run `36271644177` | `integration/kora-canonical-product-2026-09-22`, head `4069072ff2a0…` | **success, 4/4 on the exact canonical SHA** |

No rerun was used; each ran once.

## 11. RECORD OF THE GOVERNANCE-AUTHORITY ERROR THIS REPORT CORRECTS

The WP116 governance pass of 2026-09-26 recorded this remediation against **Registry `142`** and numbered its report **`192`**. Both were wrong, and neither is hidden here:

1. **Wrong registry.** Registry `219` supersedes `142` and is the authoritative executable registry for this package. `219` further states that `142` "is preserved unmodified as immutable historical canon; it was not edited in place" — yet that pass amended `142` in place and published it. Registry `142` has since been restored to its exact pre-amendment bytes by forward corrective commit, verified byte-identical (2504 characters) against `219`'s own verbatim reproduction of the same WP116 entry.
2. **Report-number collision.** Report `192` was already taken on the canonical governance line by `192_KORA_WP047_CANONICAL_PRECHECK.md`. This record is renumbered **`272`**, the next free number after `271`.
3. **Cause.** Registry `219` existed only on the unpushed `gate3/prelive-privacy-remediation` branch and `CLAUDE.md` §8 named only Registry `102`, so a session reading the operating constitution plus its own checkout found `102` and `142` and never `219`. That routing gap is corrected in the same recovery commit as this report.

All technical findings in §§1–10 were established against real code and real CI and are carried forward unchanged from the misfiled record.
