# 279 — KORA-WP-129 Wave 4b Cohort W2: Founder acceptance and publication

Status: PUBLISHED
Date: 2026-09-27
Governing registry: `.kora-audit/output/219_*`
Governing contract: Registry 219 Section A — Founder Review Publication Contract (report `274`)
Executable acceptance authority: Registry 219 `AN.10` (report `277`)

**`KORA-WP-129` remains READY. W2 is a completed, accepted migration cohort — it is NOT WP129 completion, and it
is NOT a claim that the Worker migration is finished. No `AL.2` entry is made.**

---

## 1. What was published

| | |
|---|---|
| Accepted & proven Product SHA | **`e8a408646a32c2515f4c6d739e183242ad543c70`** |
| Previous canonical | `a379d5a4c644004475397fcdf0b66cd50cf8a2e0` |
| Surfaces | `/worker/bookings` · `/worker/commons` · `/worker/opportunities` · `/worker/personal-impact-balance` |

18 files: 5 Worker source files, `lib/design/page-archetypes.ts`, and 12 archived review captures. Zero SQL, zero
migrations, zero schema, zero RLS, zero test files.

## 2. Founder acceptance — all four surfaces

Recorded against **the exact frozen candidate `e8a4086…` only**. This is a publication decision under the Founder
Review Publication Contract. It is **not** general acceptance of all Worker UX, and **not** WP129 completion.

| surface | decision |
|---|---|
| `/worker/bookings` | **ACCEPT FOR PUBLICATION** |
| `/worker/commons` | **ACCEPT FOR PUBLICATION** |
| `/worker/opportunities` | **ACCEPT FOR PUBLICATION** |
| `/worker/personal-impact-balance` | **ACCEPT FOR PUBLICATION** |

## 3. What the cohort changed

**Debt.** 153 primary typography/spacing decisions and 71 adjacent drift instances → **0**. Per surface: bookings
47, commons 52, opportunities 36 (10 + 26), PIB 18 — matching the preflight exactly. Adjacent measured **71**, not
the estimated ~74; the discrepancy is recorded rather than smoothed. `typeStyle` 0 → 38, `SPACE` 0 → 43. Sub-floor
sizes fixed as a consequence: these surfaces carried `fontSize` 9 and 10, beneath the 11px KORA-WP-139 floor.

**Composition.** Booking, partner, initiative and post cards all become hairline rows inside one Region per group.
Boxed surfaces: opportunities 4 → 1, bookings 5 → 4, commons 3 → 5 (two labelled Regions replacing three loose card
sections — a higher count, less card monoculture), PIB 12 → 12.

**Responsiveness is new.** All four surfaces previously rendered the **same height at 1440, 1200 and 767** — they
had no responsive composition at all. They now use main+rail and collapse in a chosen order.

**Archetypes**, chosen by each surface's actual job: `/worker/bookings` **OPERATIONAL_WORKSPACE** (the worker works
through their own requests and can cancel one), `/worker/commons` and `/worker/opportunities` **DIRECTORY_INDEX**,
`/worker/personal-impact-balance` **RECORD_DETAIL**.

| surface | desktop | ratio | length | archetype |
|---|---|---|---|---|
| bookings | 1052 → **1018** | 1.000 → 1.147 | PASS | PASS |
| commons | 2009 → **1514** | 1.000 → 1.248 | **WARN → PASS** | PASS |
| opportunities | 1034 → **1018** | 1.000 → 0.996 | PASS | PASS |
| PIB | 1391 → **1411** | 1.000 → 1.047 | PASS | PASS |

Commons moved WARN → PASS against the 2000px `DIRECTORY_INDEX` threshold **by composition, not by deleting
meaning**. No overflow-X at any canonical viewport; 0 page errors.

**First KORA-WP-140 state-grammar adoption anywhere in the Worker environment, proven in the real DOM rather than
asserted:** holding the bookings API renders `data-px-state="LOADING"`; an empty response renders
`data-px-state="NO_DATA"` with copy and testid intact. bookings maps `loading → Loading` and `empty → NoData`;
commons maps no-content → `NoData`; opportunities maps no-partners → `NotYetAvailable` and filtered-to-nothing →
`Zero`.

**Computation untouched.** PIB still calls `getPIBLive` and `computeActivationProfile` exactly as before and renders
only their values — no IU, pillar, eligibility, methodology, aggregation or KORA Index logic altered. Booking states,
status labels, cancellation rules and API calls unchanged; per-status colour semantics are carried through the
governed tone system (watch → warn, success → ok, critical → risk) instead of raw hex. The opportunities pillar
filter is existing capability, preserved — no ranking, recommendation, personalisation or prediction introduced.

**Wording.** Three empty-state strings were replaced by governed state wording and each is recorded: commons'
"Nessun contenuto ancora" heading, opportunities' "Nessun partner per il pillar selezionato", and the partner
not-yet-available body (apostrophe normalised). **No privacy sentence, guarantee or disclaimer was altered
anywhere.** Every other prose run is byte-identical, verified by extraction and diff; all 12 governed testids
preserved.

**No shared blast radius.** 0 files changed under `components/kora-link`, `lib/kora-link`, `app/company`,
`app/partner`, `app/admin`, `tests`, `scripts` or `supabase`. `ActivationProfileSection`, `BoundaryBadge`,
`InitiativesMapClient` and `WorkerBookingButton` are reused untouched.

## 4. PIB zero-state — Founder ruling

The zero branch **keeps its existing truthful sentence**:

> "Nessuna Impact Unit registrata ancora per questo periodo."

Two governed tests — `worker-experience-consolidation` and `p1-product-integrity`, both titled **"honest empty
state"** — pin that exact string, so the assertion encodes **Product truth**, not superseded presentation.
KORA-WP-140's `Zero` primitive composes its own generic template and would have replaced an honest statement about
this worker's period with boilerplate.

**Founder ruling: keep the wording. Do not replace it merely to obtain generic `Zero` instrumentation. Do not weaken
those tests.** The missing WP140 mapping is recorded below as an explicit residual and **does not block W2
publication**. No test was modified anywhere in this cohort.

## 5. Accepted residuals — recorded, NOT globally solved

Accepted for this publication boundary only, and explicitly not classified as fixed:

1. **PIB shows 12 boxed surfaces.** `ActivationProfileSection` owns most of them and is shared with
   `/worker/workspace`, an already-accepted W1 surface, so it was deliberately **not** changed. This is **not** a
   declaration that the PIB composition is final.
2. **PIB zero-state WP140 mapping absent**, per §4 above.
3. **Six `margin: '0 auto'` lint warnings** from the KORA-WP-141 rule, which reads the centring idiom as a spacing
   literal. The accepted W1 surface carries 2 of the identical warning, so this matches accepted precedent.
4. **Commons conditional-content states** that are not whole-surface states were not given state primitives.
5. **Booking row-level cancellation errors** use inline `role="alert"` text rather than a whole-surface
   `ErrorState`, because the failure is per-row.

## 6. Review fixture excluded from Product publication

Local review-fixture commit `1b327c084e8702ffb1b2676c6914e93425dad220` is **test/review infrastructure only** and was
**not** published, merged or cherry-picked. The W2 candidate was deliberately built from canonical rather than on top
of it, so the fixture is **not an ancestor** of the accepted SHA — verified before pushing, and verified again after:
the fixture SHA appears on **0** remote refs. It remains local unless separately authorised.

## 7. Proof CI — exact SHA

| | |
|---|---|
| run | **#356**, id `36347210059`, attempt **1**, event `push` |
| branch | `integration/pxc-w2-ci-proof-2026-09-27` |
| head SHA | **`e8a408646a32c2515f4c6d739e183242ad543c70`** |
| conclusion | **success** |

All four mandatory jobs green: *TypeScript, tests, build, lint (blocking)* · *DB-backed gate — RLS-03/05/06 + KORA
Link behavioral suite* · *E2E golden path* · *E2E smoke*. Green on first attempt — no failure to classify.

## 8. Canonical integration and canonical CI

Fast-forward, **no merge commit, no rebase, no squash, no force**: `a379d5a..e8a4086` on
`integration/kora-canonical-product-2026-09-22`, advancing exactly 1 commit. Canonical resolves **exactly** to the
accepted candidate.

| | |
|---|---|
| run | **#357**, id `36347479906`, event `push` |
| head SHA | **`e8a408646a32c2515f4c6d739e183242ad543c70`** |
| conclusion | **success** — all four mandatory jobs green |

`main` untouched at `70c4cfa`.

## 9. Local validation at the accepted candidate

`tsc` clean · targeted W2 suites **10 files / 303 passed** · 9 privacy suites **463 passed**, verified **unmodified**
before running · WP125/126/129/139–142 + website boundary **8 files / 323 passed** · full suite **443 files / 14094
passed**, 349 skipped, 5 todo · lint **0 errors** · build OK · **0 test files modified, none weakened**.

## 10. W1 acceptance intact

`git diff a379d5a..e8a4086 -- app/worker/activity-discovery app/worker/kora-link` = **0 files**, and all three W1
source blobs are **byte-identical** to canonical. The W1 Founder acceptance recorded in report `278` stands
unchanged.

## 11. Dynamic CV — still frozen, three defects still open

`/worker/dynamic-cv`, `/worker/dynamic-cv/print` and `/api/worker/dynamic-cv`: **0 files changed**. The three
recorded Product defects remain **unresolved and unremediated**:

1. `/api/worker/dynamic-cv` selects `delivery_mode`, `action_family` and `is_mandatory` from
   `personal.worker_initiative` — none of the three columns exist, so the route returns 500 once participation data
   exists.
2. `/worker/dynamic-cv/print` renders `<html>` beneath the Worker layout (invalid nesting).
3. The same page has a nondeterministic server/client date render.

No schema column was added and no migration was created. **W3 is not started.**

## 12. Registry position — unchanged

| | before | after |
|---|---|---|
| `KORA-WP-129` | **READY** | **READY** |
| `AL.2` COMPLETE | 70 | 70 |
| READY | 39 | 39 |
| BLOCKED | 35 | 35 |
| TOTAL | 144 | 144 |

`KORA-WP-129` is not in `AL.2`; its Hard Dep `126` is. By `AL.1` it derives as **READY** — unchanged by this
publication. No lifecycle transition, no status written, no total moved. **No claim is made that the Worker
migration is complete.**

## 13. Remaining WP129 debt after W2

**W3** (`dynamic-cv`, `dynamic-cv/print`, `onboarding`, `setup-password`) remains **frozen and unstarted**, and two
of its four surfaces are blocked by the Product defects in §11. Also outstanding: `ROUTE_ARCHETYPE` for the
remaining Worker routes; WP140 state-grammar adoption on the surfaces W2 did not cover; WP-125-native recomposition
of the rest; navigation consistency; the "privacy surface integrated rather than adjacent" Founder judgment.

Frozen adjacent items, untouched by this pass: WP126 1200px rail capture nondeterminism; the governance-verifier
residual; `next/font/google`; generic CI-reliability residual; the `KORA-WP-127` 36-surface discrepancy; shared KORA
Link presentation debt; the `methodology_snapshot` local seed grant gap.

## 14. Safety

`main` untouched. Production `azdnepfmwrmacruykskm` never contacted. No production operations, no staging writes, no
schema change, no migration, no RLS change, no backfill, no migration 090, no Gate-3 publication, no secrets, no PR
created or merged, no force push. `KORA-WP-117` WIP preserved. `KORA-WP-127`/`128`/`130`/`131`/`143` untouched;
`126`/`139`–`142` not reopened.
