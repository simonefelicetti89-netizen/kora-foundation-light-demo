# 192 — KORA-WP-116 "KORAL Review" — Concurrent-Caller Race Remediation

Status: **REMEDIATED AND VALIDATED** — Product committed on `feature/kora-wp-116-concurrency-remediation`, CI-proven, canonical-integrated. Governance NOT pushed (separately controlled).

Contract chain: Registry `142` (WP116 spec) → report `176` (canonical pre-check) → report `177` (implementation report, incl. its own 2026-09-19 remediation addendum) → **canonical CI #340 (run `36258620941`) DB-backed gate failure** → contract-first investigation (this report) → Founder Authorization "WP116 CONCURRENCY REMEDIATION" (2026-09-26).

WP116 remains **COMPLETE**. This report records a latent defect found after completion and its narrowly scoped correction. It does not reopen the WP, does not change its acceptance boundary, and does not alter any other Registry truth.

---

## 1. WHAT CANONICAL CI FOUND

CI #340's DB-backed gate failed one assertion:

```
AssertionError: expected false to be true // Object.is equality
  at tests/unit/kora-wp-116-koral-review.test.ts:376:63
```

That line is `expect(settled.every((r) => r.value.recognized === true)).toBe(true)` in the WP116 CONCURRENCY test. A **fulfilled** `confirmAmbiguousCandidate()` call returned `recognized: false`.

The failure is genuinely nondeterministic, and this is now proven rather than inferred: **CI #339 (run `36257582329`) and CI #340 (run `36258620941`) ran the same Product SHA `467893cf8fa0731cab698e1be917eba078dcd4d8`** — #339 green, #340 red. Scheduling alone separated them.

The defect is **latent and pre-existing**, unrelated to KORA Index V2: `lib/living-koral-review/review-service.ts` last changed in `cca814f` (2026-09-19) and the test in `b78bcf1` (2026-09-19); no design-v2 commit (`a93019d`…`467893c`) touches either file.

## 2. THE NORMATIVE CONTRACT (established independently of the failing assertion)

Registry `142`'s WP116 entry records `Async/Idempotency: N/A` and is **silent on concurrent-caller return semantics**. It therefore cannot be cited for or against line 376.

The only normative statement in force was the service's own published interface — `ConfirmAmbiguousCandidateResult.recognized` — which binds `false` to a claim **about persisted state**: the candidate stays CANDIDATE, not an error. The implementation also declared its own intended loser semantics explicitly, in the pre-existing graceful-race branch: `if (!wonRace) return { …, recognized: true }`.

Established separately:

| Property | Requirement | Enforced by |
|---|---|---|
| Persisted final state | exactly one row, `RECOGNIZED`, `recognition_source='advisor-confirmed'` | KORA-WP-112's compare-and-swap `UPDATE … WHERE status='CANDIDATE'` |
| Ledger exactly-once | exactly one `decrease_extent` row | `gov.record_living_koral_transformation` — `INSERT … ON CONFLICT (material_change_id) DO NOTHING`, under `analytics.living_koral_state … FOR UPDATE`; returns `created=false` and does not advance state |
| Winner semantics | `recognized: true`, steps 9 + 10 executed | wrapper |
| Loser semantics | `recognized: true`, steps 9 + 10 skipped | wrapper |
| Equivalent results across concurrent callers | **required** — `recognized:false` is a statement about persisted state, so returning it while the row is RECOGNIZED is a false statement regardless of caller | wrapper |

**Line 376 is correct.** It was not weakened.

## 3. ROOT CAUSE — ONE BOOLEAN CARRYING TWO MEANINGS

The wrapper's re-verification closure returned `false` for two unrelated facts:

```ts
return !!fresh && fresh.status === 'CANDIDATE' && isCurrentlyConfirmable(fresh.category);
```

KORA-WP-112 defines `false` as *"the source no longer supports the transition → legitimately stay CANDIDATE"*. The closure **also** returned `false` when a concurrent caller had already promoted the row. WP-112 behaved correctly for its own contract; the wrapper then mis-reported the outcome.

`isCurrentlyConfirmable` is a pure function of category over static config, and `'Weakening'` is eligible with a non-null `decrease_extent` mapping — so in the failing test the status term was the only variable one. Empirically the promise *fulfilled* rather than rejected, so step 7's gate had passed. Hence `reverify === false` there meant **"a concurrent caller already recognized it"**, never ineligibility.

## 4. THE FOUR INTERLEAVINGS, KEYED ON WHERE THE WINNER'S COMMIT LANDS

| | Winner commits… | KORA-WP-112 behaviour | Pre-remediation result | Line 376 |
|---|---|---|---|---|
| **L0** | before the loser's step-6 read | — | step 6 throws → promise **rejects**, excluded by `filter(fulfilled)` | tolerated |
| **L1** | after step 6, before `assess`'s own first read | `status !== 'CANDIDATE'` → returns the RECOGNIZED record, **no throw** | fell through as winner → **duplicate `koral_review.candidate_confirmed` event** | passed |
| **L2** | after that read, before the loser's reverify | reverify false → returns the stale CANDIDATE snapshot, **no throw** | **`recognized:false`** about a RECOGNIZED row | **FAILED — CI #340** |
| **L3** | after the loser's reverify | its CAS matches zero rows → **throws** | `catch` → converged, `recognized:true` | passed |

The pre-remediation wrapper handled **L3 only**, because its graceful-race handling lived in a `catch` block and its own comment assumed the loser "throws". Two of the three real loser interleavings do not throw.

## 5. REMEDIATION (wrapper only — `lib/living-koral-review/review-service.ts`)

**Remediation 1 (L2).** Before returning a negative result, re-read canonical persisted state. If the row is already `RECOGNIZED`, this caller is a concurrency loser that has converged on the successful final state, and returns `recognized: true` with the winner's side effects **not** duplicated. If the row genuinely has not been recognized, the pre-existing `recognized: false` semantics are preserved exactly.

**Remediation 2 (L1).** Winner status is now derived from **whether this caller's own re-verification actually ran and observed a still-CANDIDATE row** — i.e. whether it reached and won the compare-and-swap — instead of from whether an exception was thrown. A caller whose `assess` short-circuited on an already-RECOGNIZED row never attempted the CAS and is therefore a loser, so it skips step 9 (provenance event) and step 10 (ledger chaining).

**Not changed:** KORA-WP-112 semantics; the compare-and-swap; the ledger RPC and its `ON CONFLICT` idempotency; any schema, migration, RLS policy or grant; the public API shape; the `recognized` contract; any other Product file. The `recognized` doc comment was sharpened to state the same contract precisely (it is a statement about persisted state), not broadened.

## 6. REGRESSION COVERAGE — DETERMINISTIC, NOT PROBABILISTIC

Four tests added to `tests/unit/kora-wp-116-koral-review.test.ts`. Each injects one real, complete **winning** confirmation at one precise point inside the loser's own call, through the existing `material-change-service` module seam — deterministic orchestration of a real race, never repeated execution and never retry-until-green. No production architecture change was required.

- **L1** — winner commits before `assess`: both callers return `recognized:true`; **exactly one** provenance event.
- **L2** — winner commits between first read and reverify: loser returns `recognized:true` and never the stale CANDIDATE snapshot. This is CI #340's exact interleaving.
- **L3** — winner commits after reverify: the pre-existing path still converges.
- **NEGATIVE** — when the candidate genuinely becomes non-confirmable at write-time, the result is still `recognized:false`, the row stays `CANDIDATE`, and **no** ledger row and **no** provenance event are written. This proves Remediation 1 does not swallow legitimate non-recognition.

Each asserts the same canonical footprint: one `RECOGNIZED` row with `recognition_source='advisor-confirmed'`, exactly one `decrease_extent` ledger row, exactly one `koral_review.candidate_confirmed` event. The normal single-winner path is already covered by the pre-existing Mode-B success test, which is unchanged.

**Proven to be real regression tests.** Run against the pre-remediation service with fixtures present:

```
FAIL  L1 …  AssertionError: expected 2 to be 1        ← the duplicate provenance event
FAIL  L2 …  AssertionError: expected false to be true ← CI #340's exact assertion message
     L3 …  PASS   (the catch block already handled it)
NEGATIVE …  PASS   (the fix is narrow)
Tests  2 failed | 24 passed (26)
```

## 7. IMPACT

- **Canonical persisted state was never corrupted, in any interleaving.** The CAS, the ledger `ON CONFLICT` and the state row lock all held throughout.
- **Ledger exactly-once held in all four interleavings** — it is DB-enforced, not wrapper-enforced.
- What was actually wrong was confined to the **Advisor-facing return value** (L2) and **one duplicate provenance event** (L1). No privacy, Gate, schema or migration implication; no worker-level exposure; nothing outward-facing.

## 8. VALIDATION EVIDENCE

Local, on disposable infrastructure only (local Docker Supabase; Production `azdnepfmwrmacruykskm` never contacted; no staging writes):

| Gate | Result |
|---|---|
| `npx tsc --noEmit` | clean |
| `npm test` (full suite) | 438 files, **13985 passed, 0 failed**, 349 skipped, 5 todo |
| `npm run build` | success |
| `npm run lint` | **0 errors** (6193 pre-existing warnings, unchanged policy) |
| WP116 targeted suite (DB gate on) | **26/26 passed** |
| R0-A DB-gated suites | **190/190 passed, 0 failed, 0 skipped** (186 → 190: the four new tests) |
| RLS-03…28 integration gate | **329/329 passed, 0 failed, 0 skipped** |
| KORA Link behavioral suite (C1–C10) | **85/85 passed, 0 failed** |

## 9. SHA DISCIPLINE

- **KORA Index V2 Founder-approved implementation SHA:** `467893cf8fa0731cab698e1be917eba078dcd4d8` — unchanged, still the visual acceptance anchor.
- **WP116 remediation SHA:** `4069072ff2a044b6326bf4f28f4be03f6320acad` — a clean descendant, exactly **one** commit ahead, touching exactly **two** files, **zero** visual/design/UI files. No new visual acceptance is required.

## 10. GOVERNANCE TREATMENT

WP116 stays **COMPLETE**; its original completion is not rewritten. Recorded, per this repository's own established convention (the dated "REMEDIATION ADDENDUM — READ THIS FIRST" idiom that report `177` §0 already uses for WP116's earlier 2026-09-19 correction):

1. this report (`192`);
2. a dated **REMEDIATION ADDENDUM (2026-09-26)** prepended to report `177`;
3. an amendment clause appended to Registry `142`'s WP116 entry, pointing here.

No new WP was created: the correction is inside WP116's own existing acceptance boundary, and nothing in Registry `142` mechanically requires one.
