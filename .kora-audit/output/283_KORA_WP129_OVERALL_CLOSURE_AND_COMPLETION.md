# 283 — KORA-WP-129 Worker Experience Remediation: Founder Overall Acceptance and formal closure

Status: **CLOSED — COMPLETE**
Date: 2026-10-02
Governing registry: `.kora-audit/output/219_*`
Governing contract: Registry 219 Section A — Founder Review Publication Contract (report `274`)
Executable acceptance authority: Registry 219 `AN.10` (report `277`)

**`KORA-WP-129` transitions READY → COMPLETE.** `AL.2` goes from 70 to 71. **`KORA-WP-131` remains
BLOCKED** on `127` and `128`, and milestone **M3 does not open**.

---

## 1. What was closed

| | |
|---|---|
| Package | **`KORA-WP-129`** — Worker Experience Remediation, lane PX-C |
| **Product SHA** | **`2fd03eab3b1290a8c9e480229b6e35ddadd21e75`** — **unchanged by this closure** |
| **Founder-accepted evidence carrier** | `evidence/wp129-overall-2026-10-01` @ **`044298fd09a69bd09be1af0b2a37d76d4f64f8a1`** |
| **Closure preparation record** | same branch @ **`a6672cbeaef7df28ec3282c0b6e12bb6a66f8533`** |
| **Governance authority, pre-closure** | `audit/mega-code-truth-2026-09` @ **`a1a7797bc3b9bc0ba51b55b24b0ed110798feb3e`** |
| Founder ruling | **OVERALL ACCEPTANCE — GRANTED**, 2026-10-02; **FORMAL CLOSURE — AUTHORIZED** |

**The evidence carrier is not Product truth.** It is a branch based on the accepted Product SHA that carries
the evidence cohort, its capture tooling and its reports. No Product implementation file changed on it.

---

## 2. The eight canonical acceptance criteria — 8 / 8 MET

Authority: Registry 219 § B `KORA-WP-129` (DELTA 3, amended by DELTA 5 report `266`, resolved prospectively
by `AN.10` report `277`) plus the § B `KORA-WP-126` taxonomy. **«Benchmark V2 Gates A–I» was not used**:
`AN.10` resolves it to the `126` taxonomy and denies historical equivalence.

| # | Criterion | Evidence |
|---|---|---|
| 1 | Worker workspace and primary surfaces **WP-125-native** | 19 of 27 files under `app/worker` import `lib/design/kora-design-tokens`, at least one on each of the 13 surfaces; 12 of 13 consume the `components/ui/px` barrel |
| 2 | Navigation **consistent** | `tests/unit/kora-wp-129-worker-experience.test.ts`, 6 tests: rail non-empty with headings, every destination resolves to a real route file, no destination twice, no placeholder label |
| 3 | Privacy surface **integrated**, not adjacent | inside `app/worker/**` and the WORKER gate, archetype `DISCLOSURE_STATIC`, reached from the Worker rail, `/my-kora/privacy` redirects to it |
| 4 | **Every worker-privacy guard passes unmodified** | `git diff --name-only 81d3cf3 2fd03ea -- tests/` filtered on privacy/rls/route-privacy returns **nothing**; 8 guard suites, **482/482 PASS** |
| 5 | **Responsive acceptance at the `126` matrix** | 13 surfaces × 3 canonical viewports measured; `guardViewport()` fail-closed; **0 required states missing** |
| 6 | **Visual evidence archived** | 39 minimal captures (**39/39 byte-identical** across two runs) + 6 data-bearing (**6/6 byte-identical** across two complete seed-capture-hash cycles); capture spec went **2 of 13 → 13 of 13**, derived from `ROUTE_ARCHETYPE` and guarded by a test that fails if the two diverge |
| 7 | `126` taxonomy applicable to the Worker environment | `checkRouteArchetypeDeclared` **13/13 PASS** · `checkSevenStateResolution` **PASS**; the REVIEW-ENFORCED and FOUNDER-JUDGMENT criteria are covered by the Overall Acceptance in §1 |
| 8 | **System migration onto `139`–`142`** | `139` 13/13 · `141` 13/13 archetypes declared · `140` seven-state contract PASS with primitives adopted on the 5 surfaces that have states to resolve · **`142` 0/13 as recorded privacy conformance** |

**On `142`.** Not an unmet criterion. `ContributionBars` carries a per-item `assessment`, which would imply
one pillar scored better than another on a worker's own record; `DistributionStrip` is a group comparison
that suppresses below a privacy threshold of ten, which on a private record would suppress the worker's data
from themselves. What ships is a count per pillar with a bar scaled to the largest — no percentage, no
normalisation, no ranking. **The `139`–`142` relation is CONSUMPTION, not dependency**, and those systems are
not reopened.

---

## 3. Surface inventory — derived from code, not restated

`ROUTE_ARCHETYPE` in `lib/design/page-archetypes.ts`, cross-checked against the real `page.tsx` files:
**14 `/worker/*` routes = 13 real surfaces + 1 pure redirect.** 0 real surfaces without an archetype,
0 archetypes declared for a route that does not exist. `/worker/login` declares no archetype and carries no
evidence, by contract and asserted by a test.

`/worker/workspace` `EXECUTIVE_JUDGMENT` · `/worker/privacy` `DISCLOSURE_STATIC` ·
`/worker/activity-discovery` `DIRECTORY_INDEX` · `…/detail` `RECORD_DETAIL` ·
`/worker/kora-link/activate` `DISCLOSURE_STATIC` · `/worker/bookings` `OPERATIONAL_WORKSPACE` ·
`/worker/commons` `DIRECTORY_INDEX` · `/worker/opportunities` `DIRECTORY_INDEX` ·
`/worker/personal-impact-balance` `RECORD_DETAIL` · `/worker/onboarding` `OPERATIONAL_WORKSPACE` ·
`/worker/setup-password` `OPERATIONAL_WORKSPACE` · `/worker/dynamic-cv` `RECORD_DETAIL` ·
`/worker/dynamic-cv/print` `REPORT_EXPORT`.

All nine `/my-kora/*` routes are pure redirects to `/worker/*`.

---

## 4. Evidence package

| | |
|---|---|
| Archive | `docs/product/visual-evidence/kora-wp-129/` (minimal) and `…/data-bearing/` (populated) |
| Captures | **45** — 39 minimal + 6 data-bearing |
| Reproducibility | minimal **39/39**, data-bearing **6/6** byte-identical SHA-256 |
| Manifest | `manifest.json`, 15 entries (13 minimal + 2 data-bearing), citing **both** the Product SHA and the governance authority SHA in distinct fields |
| Regeneration | `npx playwright test tests/e2e/kora-wp-129-worker-capture.spec.ts` (~45 s) and `…-dynamic-cv-data-bearing.spec.ts` |
| Data-bearing provenance | `scripts/e2e/seed-local-worker-review-states.ts`, carried onto the evidence branch by cherry-picking its two original fixture-only commits (`3b324c6`, `1b327c0`); participations are real rows and every PIB value is computed by `computeBaseWorkerPIBRows` |
| Capture runtime | minimal: development · data-bearing: **production build of the same SHA**, proven equivalent on `/worker/privacy` (identical viewport dimensions and identical document heights, the only difference being the development indicator) |
| Historical artifacts | 12 preserved, not renamed, allow-listed with their reason, referenced by nothing |

**Measured residual WARNs, preserved as WARNs and not optimised away** — `141` is explicit that the ratio is
«a detector, never a target»: `/worker/activity-discovery` desktop **2308px** against the 2000px
`DIRECTORY_INDEX` threshold, reproducing W1's accepted WARN to the pixel; `/worker/workspace` mobile ratio
**1.592**, past its `EXECUTIVE_JUDGMENT` 1.35 bound and 0.008 from the fail threshold, with **no visual
defect found** on direct inspection — accepted by the Founder as a residual.

---

## 5. Test baseline — the already verified figures

At the exact Product SHA, with `npm ci` on the Product lockfile (`next 16.3.3`, `vitest 4.1.11`, Node v24.15.0):

| Verification | Result |
|---|---|
| `npx tsc --noEmit` | **exit 0** |
| Full unit suite | **415 files · 14 022 passed · 0 failed** · 26 skipped · 5 todo |
| Frontier suites (`125` `126` `127` `128` `129`×2 `139`–`142`) | **338 / 338** |
| Worker privacy guards + website boundary | **482 / 482** |
| Evidence cohort validation | **14 / 14** |
| `checkRouteArchetypeDeclared` on the 13 routes | **13 / 13 PASS** |
| `checkSevenStateResolution` | **PASS** |

**Exact-SHA CI, historical and recorded:** KORA CI **#362** run `36477773252` (proof ref) and **#363** run
`36478306009` (canonical), both attempt 1, SUCCESS, all four mandatory jobs green, job-set hash
`9cd15788df1bf485`. **`gh` is absent from this environment: no claim is made about current GitHub check
state.** No test was weakened; one manifest assertion was made **stricter** to express the two-state model.

---

## 6. Adjudication of report 282's carried residuals

| # | Residual from `282` §12 | Adjudication |
|---|---|---|
| 1 | `Foundation Light` in the Worker sidebar | **ACCEPTED TRANSVERSAL RESIDUAL** — §7 R1 |
| 2 | Desktop populated Dynamic CV length past the `RECORD_DETAIL` WARN | **already accepted by `282` itself**, under W1's `activity-discovery` precedent. No action |
| 3 | Optical spacing warnings | **already accepted** at the W1/W2 precedent. No action |
| 4 | «The full Worker experience still requires a final cross-surface closure review» | **SATISFIED** — the Founder Overall Acceptance of §1 is that review |

**Residual L1-r — RESOLVED.** The long-content state was never an outstanding acceptance requirement.
Report `282` is accepted at **this identical Product SHA** («material and exact-SHA bound»), contains **no
screenshot requirement anywhere** — searching it for `screenshot`, `visual evidence`, `png`, `capture`
returns nothing — and records the populated length as an accepted residual. **No 20-experience fixture was
manufactured**: nothing in the repository produces that volume, and building one would have fabricated a
number to satisfy a requirement that does not exist. The data-bearing evidence that does exist (2
participations, 2 PIB rows computed by the canonical methodology) proves what the empty state could not:
pillar bars in operation, badge eligibility read on the experience as a chip, the private/shareable split,
and the printed table with both rows and the pillar always spelled as a word.

**Residual L2 — ACCEPTED as non-blocking.** `/worker/onboarding` is evidenced in `?mode=review`, the state
W3A was accepted on («`/worker/onboarding` (incl. `?mode=review`)», report `281`). The first-access step flow
is not captured; it was not manufactured.

---

## 7. Residuals carried past this closure

**None of these is a failed acceptance criterion.**

### R1 · `Foundation Light` — ACCEPTED TRANSVERSAL RESIDUAL, NOT FIXED

`components/layout/Sidebar.tsx` carries **two** current occurrences, **not the one report `282` recorded**:
the `Collettivo` item's `description` («Non ancora disponibile in Foundation Light») and a `title` attribute
(«Non attivo in Foundation Light») on the `comingSoon` navigation item. It renders on **every** Worker
surface. Dynamic CV-owned occurrences are **0**.

Founder decision **A**: accepted, non-blocking. `Sidebar.tsx` is shared across **Worker, Admin, Company,
Partner and Advisor**, and altering it inside this closure would introduce unreviewed cross-surface Product
change. **`Sidebar.tsx` is unchanged by this closure.**

**OWNER / FOLLOW-UP: UNASSIGNED TRANSVERSAL RESIDUAL.** No canonical package owns it and **no new WP number
is invented here.**

### R2 · `analytics.methodology_snapshot` `service_role` GRANT defect — NOT FIXED

`supabase/migrations/049_methodology_snapshot.sql` creates the table, grants `SELECT` to `authenticated`, and
**grants nothing to `service_role`**, while its own comment states that «only KORA_ADMIN (via `service_role`
in application code) ever inserts». `service_role` bypasses RLS but **not table grants**. Verified against the
database: full DML on `analytics.uef_record`, **no grant at all** on `analytics.methodology_snapshot`.

**A real Product/schema authorization defect**, and **not a `KORA-WP-129` closure criterion**: none of the
eight criteria names or implies it, the package declares `Data/Migration Impact: NONE` and `Auth/RLS:
inherited, unchanged`, and the table is outside its `Existing Paths` (`app/worker/**`, `app/my-kora/**`).
**Tracked separately. Migration 049 is unchanged.**

### R3 · Stale bolded aggregate in Section E — GOVERNANCE HYGIENE FOLLOW-UP, UNCHANGED

Registry 219 carries **two** bolded aggregates. Section F holds current truth; **Section E** still carries
`COMPLETE 64 · READY 35 · BLOCKED 39 · TOTAL 138` from 2026-09-24, in bold, from the Partner scope-trigger
activation (report `264`). `AL.3` warns in its own text that «the checker reads a bolded total as current
truth» and states its historical aggregate is «deliberately left unbolded» — true of the `AL.3` instance,
**not** of the Section E one.

**Deliberately not cleaned up here.** This closure is not authorization to rewrite historical registry
material. Recorded as a governance hygiene follow-up.

### R4 · `1151ab2` reachability — UNCHANGED

The commit that ratified DELTA 5 / Benchmark V2, cited as authority by `AN.10`, is reachable from **0 remote
refs** and protected by **0 tags**; it survives only on the local branch `gate3/prelive-privacy-remediation`.
Every other SHA the registry cites sits on 9–20 remote refs. **Not tagged, not pushed, not branched, not
touched.** Preservation remains a separate governance action.

---

## 8. Mechanical effect — re-derived, not asserted

`AL.1` applied to the amended `AL.2` over the Section C edge list, recomputed from the **modified** file:

| | Before | After | Delta |
|---|---|---|---|
| COMPLETE | 70 | **71** | **+1** |
| READY | 39 | **38** | **−1** |
| BLOCKED | 35 | **35** | **0** |
| TOTAL | 144 | **144** | **0** |

- `AL.2` heading declares **71**; members counted mechanically: **71**. Consistent.
- Sum of the three states equals the node count: **71 + 38 + 35 = 144**. ✓
- Section F's declared aggregate **matches** the independently re-derived one. ✓
- **Exactly one package changes state: `129`.** Set comparison before/after: COMPLETE `+[129]`, READY
  `−[129]`, BLOCKED unchanged, nothing else moves.
- The only dependent of `129` is **`131`** (Section C: `131:127,128,129`). After closure `129` **no longer
  blocks** it, but `127` and `128` do: **`131` remains BLOCKED**, and **milestone M3 does not open**.
- Hard edges **225**, conditional edges **5**, scope triggers **4**, cycles **0** — all unchanged. This
  closure introduces, removes and activates no edge and no trigger.
- WP namespace unchanged at `001`–`144`. Registry `142` untouched.
- `127` and `128` untouched; no unrelated package state altered.

---

## 9. Registry changes applied — exactly five

| | Change | Location |
|---|---|---|
| **M1** | `### AL.2 — COMPLETE set (70)` → `(71)` | AL.2 heading |
| **M2** | `129` inserted into the COMPLETE set, in order between `126` and `132` | AL.2 set |
| **M3** | new evidence class — Founder **Overall** Acceptance on a reproducible evidence cohort — for `129`, with all four SHAs | AL.3 table |
| **M4** | current aggregate **70/39 → 71/38**, with the previous aggregate struck through as historical at its **original** figures | **Section F** |
| **M5** | formal closure record appended to the `KORA-WP-129` entry | Section B |

**M4 targeted Section F by section and context, never by searching for «the bolded total».** Section E's
stale bolded aggregate is **not in the diff**.

**The five historical occurrences of «STATUS UNCHANGED — READY» inside the `129` entry were not rewritten or
deleted** — seven file-wide before and after. Each was true of its own publication; the closure record is
appended and says so.

**Registry verifier: `npm run governance:registry-check` is UNAVAILABLE / ORPHANED** — it exists only on the
unpublished `gate3/prelive-privacy-remediation` branch, as `AN.10` already records. **No verifier output is
fabricated.** The arithmetic, membership, dependency effect, single transition and total invariant are proven
mechanically in §8.

---

## 10. Safety

`main` unchanged at `70c4cfa0dfa36d8697d8f76a3a7df8a5bf530adc`. Product truth unchanged at `2fd03ea`.
Production Supabase `azdnepfmwrmacruykskm` never contacted. No production operations, no staging writes, no
schema changes, no migrations, no RLS changes, no backfills, no Gate-3 publication, no secrets, no force
push.

**0 Product implementation files changed** by the evidence pass or by this closure. `Sidebar.tsx` unchanged ·
migration 049 unchanged · `methodology_snapshot` unchanged · privacy guards unchanged · Worker surfaces
unchanged · visual evidence unchanged. Local Docker Supabase only, torn down.

`KORA-WP-131` **not started**. `KORA-WP-127`, `KORA-WP-128`, `KORA-WP-134` **not started**. `1151ab2`
**unchanged — 0 remote refs**. WP117 WIP preserved exactly on `audit/mega-code-truth-2026-09`, never staged,
moved or cleaned.
