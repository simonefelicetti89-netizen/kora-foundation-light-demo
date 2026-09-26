# 262 — `OBS-02` — AUTHENTICATED RUNTIME ENVIRONMENT CANONICALIZATION — ADJUDICATION AND PACKAGE DEFINITION

**Date:** 2026-09-24 · **Package defined:** `KORA-WP-138` · **Milestone:** RX
**Discovery:** report `261` §15.4 · **Observed on:** exact SHA `6bc22f5bae93270527b12f5b9d15b7997098db75`,
Preview `dpl_35NCPdWS3rjkrhc6A4Hk472EvaMD`

> **`OBS-02` = REAL PRODUCT DEFECT · CONTROLLED PILOT CLOSURE REMAINS VALID · FUTURE GATE REMEDIATION REQUIRED.**
> This report defines the owning package. **No Product code, test or remediation was executed.**

---

## 1. LINEAGE

`OBS-02` was found while producing the populated-index runtime proof that closed the Controlled Pilot gate
(report `261` §15). It was recorded there rather than fixed, because no Product change was authorized. This
report adjudicates it and converts it into an owned roadmap package.

## 2. ROOT DEFECT — a missing canonical environment resolution

`useScoringResult` resolves `environment = forceEnvironment ?? activeEnvironment`.

- `activeEnvironment` initialises to **`'demo'`** (`lib/demo-state/index.ts:52`).
- Its **only** writer is `components/demo/EnvironmentSwitcher.tsx`, and `shouldShowDemoControls()`
  (`lib/demo-state/demo-controls-guard.ts:40`) grants that control **solely** to an unauthenticated visitor or
  `KORA_ADMIN`.
- `app/company/_providers/CompanySessionProvider.tsx` never touches environment.

**Therefore a real `COMPANY_ADMIN` has no path to `'live'`**, and the demo branch of `useScoringResult`
returns `insufficient_data` **synchronously, without ever querying the database** — the `useEffect` holding
`fetchLiveScoringResult` early-returns on `environment !== 'live'`.

### Affected surfaces — **four of five**, confirmed at runtime with live data present

| Surface | `forceEnvironment` | HTTP | Renders live index |
|---|---|---|---|
| `/company/reports` (C-09 Decision Pack) | **absent** | 200 | **NO** |
| `/company/activation` | **absent** | 200 | **NO** |
| `/company/pillars` | **absent** | 200 | **NO** |
| `/company/financial` | **absent** | 200 | **NO** |
| `/company/kora-index` (C-02) | `'live'` | 200 | **YES** — `33/100` |

All five are the complete set of `useScoringResult` call sites.

### Provenance — a dated regression, not an oversight

`git log -S` establishes the sequence: `d333af7` (**B59**) *added* `forceEnvironment` to "connect company
intelligence pages to live Supabase"; **`cefc584430c2f9509ed6e0990551847fdcaa0e51` (B147 P1, 2026-06-14)**
removed it from `activation`, `financial`, `pillars`, `reports` as *"dual-path-era signals"* while explicitly
retaining it on `kora-index` as *"il fetch gate"*. The same construct was read correctly on one page and
misclassified as cosmetic on four. The stated justification — *"Server layout `requireCompanyUser` is the
guard"* — is a **server-side auth guard that never touches client environment state**. The regression is now
**locked in** by `tests/unit/live-session.test.ts:82`, which asserts the absence.

## 3. WHY IT IS A DEFECT, NOT A DESIGN CHOICE

`docs/KORA_OFFICIAL_IMPLEMENTATION_MASTER_PLAN_v2.1_PATCH_03.md` §No Demo Runtime:

> **KORA has ONE product runtime.** KORA must have no demo engine, **no demo-specific business logic**, …
> **no demo-specific scoring**, no demo-specific KORA Index, **no demo-specific Decision Pack**, … and no
> product behavior that changes because a company contains synthetic data.

`OBS-02` is demo-specific scoring on the Decision Pack surface for a real authenticated Company user — two
named prohibitions. Each affected file's own header independently declares *"live-only … Nessun branch demo"*,
so the code contradicts its own stated contract.

### Environment-state split

`SyntheticDataBanner.tsx:47` calls `resolveBannerEnvironment(realRole, activeEnvironment)`, which **forces
`'live'`** for any authenticated non-admin role, while `useScoringResult` reads raw `activeEnvironment`. One
state, two divergent derivations: the chrome can assert LIVE while scoring executes demo. **Not cosmetic.**

## 4. INTENT RECONSTRUCTION — `/company/reports` is canonical

Header `// C-09: Decision Pack — live-only`; onboarding stage `4-decision-pack`
(`lib/live/company-onboarding-view.ts:108`); routed from `company-status-engine.ts:181,211` on
`readiness.hasDecisionPack`; listed in `lib/permissions/index.ts:86,121`; doctrine entry
*"Quali output posso portare al board e agli advisor ESG?"*. **Canonical — not legacy, demo or transitional.**
It is also the **only** call site of `KoraIndexHero`, the component this gate's disclosure contract is written
against. Consolidation or retirement is therefore **rejected**: `/company/reports` and `/company/kora-index`
are distinct canonical surfaces (board-ready output vs analytic decomposition) and neither supersedes the
other. **Direction: both remain independent and live.**

## 5. OWNERSHIP — new package required

Registry 219 defines **137** packages, contiguous `001`–`137`, **0 gaps, 0 duplicates** (mechanically
enumerated). No existing package cleanly owns this defect class:

| Candidate | Why it cannot own it |
|---|---|
| `KORA-WP-128` Company Experience Remediation | Right environment, wrong class — declared *"remediation only"*, *"Rollback: presentation-only"*, `Service/API: N/A`. `OBS-02` is a functional data-binding defect, and its fix lives in shared runtime (`lib/scoring-result`, `lib/demo-state`, the Company provider) **outside `app/company/**`**. Owning it would silently expand `128`'s scope. |
| `KORA-WP-072` | Executive Home / Company Settings functional progression — wrong surfaces |
| `KORA-WP-025` | Decision Pack read-layer linkage extension — wrong class |
| `KORA-WP-134` | Company routing **reachability** contract, not data binding |

Registry 219 contains **no** package owning demo-runtime removal or the environment model. **Allocated:
`KORA-WP-138`**, the next valid number.

## 6. PRODUCT INVARIANT — Founder ruling recorded

> **AUTHENTICATED COMPANY RUNTIME = LIVE.** A real authenticated `COMPANY_ADMIN` must not receive demo
> scoring behaviour. Environment switching remains available only for unauthenticated/demo contexts and
> `KORA_ADMIN` preview contexts.

The package must fix the **defect class**, not its four instances. Per-page `forceEnvironment` patchwork is
acceptable **only** if the package first proves no safe shared resolution point exists, and records that proof.

## 7. TECHNICAL BOUNDARY

Likely shared resolution point: the authenticated Company session boundary
(`app/company/_providers/CompanySessionProvider.tsx`) or `useScoringResult`'s own environment derivation —
**the choice is the package's to make and to document, never to leave implicit.** Affected modules:
`lib/scoring-result/index.ts`, `lib/demo-state/index.ts`, `lib/demo-state/demo-controls-guard.ts`, the Company
session provider, the five Company pages, `components/demo/SyntheticDataBanner.tsx`,
`tests/unit/live-session.test.ts`.

## 8. DATA / MIGRATION / RLS — verified, not assumed

**NO migration · NO schema change · NO RLS change · NO new persistence.** Verified: the fix changes which
already-authorized data source a client surface reads; `migration 026`-era RLS and `requireCompanyUser` are
untouched, and no route's reachability widens. **Had any been required, this task would have stopped and
reported.**

## 9. GATE RELATION

| Gate | Effect |
|---|---|
| **Controlled Pilot** | **REMAINS CLOSED / VALID.** `OBS-02` violates none of the six conditions: the gate contract never names `/company/reports`; condition 5 is surface-agnostic and was proven on `/company/kora-index` against a canonically persisted index; condition 6 concerns **Admin** dead routes, and `/company/reports` returns 200 with no errors. |
| **Paid External Pilot** | **BLOCKED** until `138` completes |
| **Production** | **BLOCKED** until `138` completes |
| **Real customer Company usage** | **BLOCKED** — a paying customer's Decision Pack, Activation, Pillars and Financial surfaces would render empty |

**Gate 3 and `F-12` are unchanged by this report.** Formally binding `138` into the Paid External Pilot and
Production gate contracts in Section AJ is a **Founder decision and was deliberately not taken here** — this
report records the relation; it does not amend a gate contract.

## 10. REGISTRY 219 — DELTA 4

Executed under the **DELTA Atomic Update Contract** (Section A): SOURCE updated, DERIVED regenerated (never
hand-assumed), VALIDATION run.

| | Change |
|---|---|
| SOURCE | Section B `KORA-WP-138` specification (all 32 fields); Section C `138:—`; Sections D/E **N/A** |
| DERIVED | Nodes **137 → 138**; statuses **COMPLETE 64 · READY 35 · BLOCKED 39 · TOTAL 138**; hard edges **213, unchanged**; Section M appended and re-derived |
| VALIDATION | `npm run governance:registry-check` → **PASS WITH KNOWN GOVERNANCE EXCEPTIONS**; `git diff --check` clean |

`138` is a **DAG root** with no Hard Deps and **no dependents**, so it introduces no edge and changes no
existing package's mechanical status. No package renumbered; no unrelated status altered. `KORA-WP-128` was
deliberately **not** given a Hard Dep on `138` — the sequencing relationship is recorded as a Parallelization
overlay, because modifying an existing package's 32 fields is outside an additive DELTA.

**Two checker failures occurred during this DELTA and were fixed, not worked around:** the first derived-section
edit aborted mid-script and left Section M and Section F stale — caught by `INV-02`/`INV-04`; the DELTA 4
declaration then wrote the phrase "adds 0 hard edges", which the parser correctly read as a count declaration —
caught by `INV-03` and rephrased. Both are the contract behaving as designed.

## 11. ACCEPTANCE, TESTS, VISUAL ACCEPTANCE

Specified in full in the `KORA-WP-138` Section B row: acceptance gates **(A)–(I)**; the test contract including
**explicit, reasoned correction of the stale B147 assertion at `tests/unit/live-session.test.ts:82` — recorded,
never silently weakened**; and exact-SHA staging runtime validation.

**Founder Visual Acceptance: APPLICABLE.** Four surfaces change from empty-state to live-data rendering, so the
rendered result is materially different and must be seen — unless the package first proves the rendered UI is
unchanged. **No redesign is implied.**

## 12. STATUS

`KORA-WP-138` — **READY, CANONICALIZED 2026-09-24, NOT STARTED.** Implementation requires explicit Founder
authorization. No Product code, test or remediation was executed by this task.

**END OF 262**
