# KORA Master Plan v2.1 — Governance Patch 01

**Status:** ACTIVE ADDENDUM — does not modify the frozen Master Plan
**Date:** 2026-08-31
**Applies to:** `docs/KORA_OFFICIAL_IMPLEMENTATION_MASTER_PLAN_v2.1.md` (FINAL FREEZE VERSION)
**Trigger:** post-audit governance reconciliation covering CC-018 through CC-020A execution

---

## 1. Authority

- `docs/KORA_OFFICIAL_IMPLEMENTATION_MASTER_PLAN_v2.1.md` remains frozen and is **not edited** by this patch. Every clarification below is additive: it resolves an implementation/governance ambiguity discovered during execution, sourced to an exact section of the frozen text.
- This patch changes no commercial or product scope, no methodology, no pillar, no KORA Index component, and no privacy rule.
- Where this patch and the frozen Master Plan appear to disagree, the frozen Master Plan's literal text governs — this patch exists to make that text's application to specific repository facts explicit, not to override it.
- This patch supersedes informal governance reasoning recorded inline in `lib/architecture/registry.ts` commit messages/notes only where explicitly named below (§5). It does not touch `docs/21-founder-gate-resolution-log.md` (D-01–D-21) or founder decisions D-A–D-C already resolved and merged (`0131538`, PR #110).

---

## 2. CC numbering reconciliation

**Finding: `CC_NUMBERING_DRIFT_CONFIRMED = NO`.**

Re-derived from the frozen text, not from prior interpretation:

- §30 "CLAUDE CODE EXECUTION INDEX" (line 868): `018-023 | One Truth per gruppo di seed | A-migration | B-TRUTH | 010, D-C | Sì per gruppo`. This reserves the numeric range CC-018–023 for a **discovery process** — "one seed group per CC," approved individually ("Sì per gruppo") — not for a pre-enumerated list of specific named services. The Master Plan does not, and by its own §30 row is not meant to, name in advance which repository service constitutes "seed group #2" or "#3"; that determination is the explicit job of each CC's own execution.
- §29 (day-by-day schedule) independently corroborates the same range and its two closing slots (CC-022 closure, CC-023 adversarial), already reconciled in the founder-approved governance closeout (PR #110, commit `0131538`).
- No other section of the frozen document assigns CC-018, CC-019, or CC-020 to any different, conflicting purpose.

Labels used this session — CC-018 (pillar adoption), CC-019A/CC-019B (TenantService/legacy `[companyId]` tenant-identity cluster, decomposed), CC-020/CC-020A (Company Intelligence legacy chain, attempted) — are each a valid, non-conflicting use of the reserved 018–023 range, and each target was explicitly approved "per gruppo" by an individual founder instruction before implementation (matching §30's own gate). **No renaming to a neutral `BT-*` scheme is required or performed.** The `A`/`B` sub-slice suffixes were explicitly designed, at the time each was introduced, as implementation sub-slice labels — not new Master Plan CC numbers — and remain correctly non-conflicting.

---

## 3. D-C decision — compatibility clarification

**Finding: `CURRENT_D_C_RESOLUTION_COMPATIBLE_WITH_FROZEN_PLAN = NO` as literally recorded — a wording gap, not a factual error.**

The merged D-C resolution (`lib/architecture/registry.ts`, `app-surface.demo` entry, commit `0131538`) records the 11 synth-only `/demo` pages as retained `DEMO_RUNTIME`, conditional on 5 stated properties (identifiable as demo, no masquerading, live never falls back, structurally testable separation, excluded from canonical analytical truth). Those 5 conditions are **necessary but were not recorded as sufficient**: as written, they do not reference an end date or closure trigger.

This is incompatible with two explicit frozen-text commitments:
- §13 "ONE PRODUCT / ONE TRUTH": "Demo e live condividono schema, servizi, scoring... Differenza: solo la provenienza del dato" — the target end-state is a **shared runtime path**, differing only in data provenance, not permanently separate demo-only service implementations.
- §32 "SAFE DELETION PLAN": the allowlist "va portata a zero e poi eliminata insieme al suo guard test — non svuotata e mantenuta" (must be brought to zero, then deleted along with its guard test — not emptied and kept), and CC-022's own closure criterion (§29, line 810) is literally `demo = live, I9 = 0`.

**Clarification (does not reopen D-C's underlying decision, only its scope):** `DEMO_RUNTIME` is a **transitional** classification within the B-TRUTH window, not a permanent architectural carve-out. A component classified `DEMO_RUNTIME` remains subject to migration under CC-018–023 like any other allowlist entry, and its presence does not exempt it from the CC-022 closure gate. If a specific component is intended to remain demo-only **permanently, even after B-TRUTH closes**, that is a distinct decision requiring its own explicit founder sign-off and its own entry in an amended §32 Safe Deletion Plan (or an explicit "permanent exception" list) — no such permanent-exception list currently exists, and none is created by this patch.

`I9 final target: 0` (unchanged, per §32 and CC-022).

---

## 4. B-TRUTH closure semantics

Unambiguous restatement, sourced to the frozen text (no new criteria invented):

B-TRUTH is closed only when **all** of the following hold:
1. Live and demo surfaces resolve their data through the same canonical runtime path (schema, services, scoring, Confidence, Decision Pack, Financial Intelligence, Contribution, methodology, UI) — differing only in data provenance (§13).
2. No canonical/live surface falls back to demo or synthetic data under any condition, including loading/error states (the invariant this session has recorded repeatedly as `LIVE MUST NEVER FALL BACK TO DEMO OR SYNTHETIC DATA`).
3. `lib/architecture/registry.ts` accurately reflects the actual architecture (I10 registry completeness passing is necessary but not sufficient — accuracy of status/decisionRef fields matters, not just structural completeness).
4. `CURRENT_SYNTHETIC_RUNTIME_IMPORTS = 0` — the I9 allowlist and its guard test are deleted entirely, not emptied and kept (§32).
5. CC-022 (closure gate: `demo = live, I9 = 0`) and CC-023 (adversarial validation + remedies) have both passed (§29).
6. No unresolved canonical violation remains open (e.g., a component correctly classified `INVESTIGATE` pending a documented decision does not block closure by itself, but a component *incorrectly* left in a non-`INVESTIGATE` status while its violation is unresolved does).

---

## 5. CompanyIntelligence governance

**Disposition: `INVESTIGATE — DO NOT RETIRE UNTIL FUTURE ROLE IS RESOLVED` — but the concern is procedural, not a hidden product role.**

Independently re-verified against current `main` (`1e08f9e`) and the frozen text:

- `COMPANY_INTELLIGENCE_CURRENT_CALLERS = 0` on main (fresh repo-wide reachability trace: no `app/`, `services/`, `lib/`, or `components/` file imports, instantiates, or calls it as real code; only prose comments and test-characterization files mention it).
- `COMPANY_INTELLIGENCE_MASTER_PLAN_ROLE = NONE` — "Company Intelligence" is not named anywhere in the frozen Master Plan. No textual link exists to N11 (Economic Case — gated by N6 + HR-KPI decoupling) or N12 (Cockpit — gated by N7 + B-LIN); both are methodologically distinct, differently-sequenced future capabilities with no stated dependency on or overlap with this legacy service. This is not the source of the concern.
- **The actual gap:** §32's "SAFE DELETION PLAN" states, as a general rule applying beyond its own 6 named table rows: *"Nessun percorso sintetico si cancella prima che la migrazione live sia completata e verificata"* (no synthetic path is deleted before its live migration is complete and verified). The three precedent deletions already merged this session each satisfy that bar with a real, confirmed live replacement: `WorkerPillarAdoptionService`'s data source → `analytics.activation_result.pillar_distribution` (CC-018); `LifecycleService` → `audit.audit_log` on the Gen3 workspace tab (Root Control Room Wave 2); `BudgetToHumanImpactService` → `analytics.bti_result`, already read by the Gen 3 workspace API (BTI retirement). **`CompanyIntelligenceService` has no such live migration** — its capability (an undefined `resolveRiskLevel` heuristic aggregating 6 synthetic services) was judged to have no product requirement and removed outright, not migrated. "Capability judged unnecessary" and "capability migrated to a verified live replacement" are different conditions, and only the latter is what §32 states as the deletion bar.
- §32's own explicit precedent for exactly this situation — an orphaned service with no defined future — is to leave it `INVESTIGATE`, not delete it: *"Nient'altro. `company-setup` e `report-generator` restano INVESTIGATE."*

**Evidence threshold for future retirement**, stated explicitly per this task's own request: either (a) a genuine live capability supersedes `CompanyIntelligenceService`'s specific function (unlikely, since no methodology for it exists anywhere in the frozen text), confirmed and cited the same way the three precedent deletions were, or (b) this service is added, by name, to an explicitly founder-approved amendment of §32's Safe Deletion Plan table — the same mechanism (named entry, `decisionRef`, explicit condition) already used for its 6 existing rows. Zero-caller status alone, already true and already correctly recognized as insufficient by every registry note on this service prior to CC-020A, remains insufficient on its own.

**Update (post-merge):** PR #113 has since merged, narrowed to exactly the finding above — `CompanyIntelligenceService` retired as an explicit, capability-level obsolete-capability decision (`svc.company-intelligence` = `DEAD`, with a `decisionRef` matching the evidence bar this patch describes); `CompanyOnboardingService` was restored after an incorrect same-day over-reach and remains `svc.company-onboarding` = `INVESTIGATE`, its `competingWith: ['svc.company-setup']` relationship intact. `main` now reflects this corrected state directly; no further registry action is required by this patch. A clarifying note is added (§7 below) recording this patch's finding for future reference.

---

## 6. Historical work preservation

Technically valid B-TRUTH work already merged to `main` under CC-018, CC-019A, and CC-019B is **not affected** by this patch and requires no reimplementation:

- **CC-018** (`WorkerPillarAdoptionService`): real live column migration, satisfies §32's deletion/migration bar. Valid as-is.
- **CC-019A** (legacy `[companyId]/users` retirement): the retired page had a confirmed, more capable, already-live replacement (`app/admin/company-users-live`). Valid as-is.
- **CC-019B** (`layout.tsx` canonicalization): moved a display-only read onto the exact same canonical query pattern already used by 50 other files in the repo; no deletion involved, no §32 gate implicated. Valid as-is.

**CC-020/CC-020A** (PR #113) has since merged, narrowed to exactly what §5 above required: `CompanyIntelligenceService` retired alone (obsolete-capability decision, `svc.company-intelligence` = `DEAD`); `CompanyOnboardingService` restored, remaining `svc.company-onboarding` = `INVESTIGATE`. Nothing else already on `main` is reopened, reversed, or requires re-verification beyond what this patch already performed.

---

## 7. Registry corrections made alongside this patch

Documentation-only; no runtime behavior changed. See `lib/architecture/registry.ts` diff:

- `svc.commons`: added `decisionRef: 'CC-052'` and a note citing §13's explicit naming of `CommonsService`'s dual discovery-path issue ("due percorsi di scoperta nello stesso servizio") as something to eliminate/consolidate, and §30's explicit reservation of CC-052 for that exact fix. Status left `CANONICAL` (the service works; the architectural defect is tracked, not hidden) — this patch does not have the authority to reclassify it further without its own dedicated audit.
- `svc.ingestion-pipeline`, `svc.uef-review`: added a note clarifying that `status: 'FROZEN'` here is a pragmatic reuse of the nearest existing `ArchitectureStatus` enum value, not a claim that Master Plan §33's official `FROZEN` definition ("lo sviluppo è fermo, non che la capability sia indisponibile" — development stopped, not unavailable) applies. These two components are actively used as demo/preview data sources, not "stopped." No dedicated `DEMO_RUNTIME` status value exists in the current `ArchitectureStatus` type, and this patch does not add one (that would be a code change, out of scope here) — the gap is recorded for a future, explicitly-authorized registry schema change instead.
- `svc.company-intelligence`, `svc.company-onboarding`: added a note referencing this patch's §5 finding. PR #113 has since merged in the narrowed, corrected form §5 required — `svc.company-intelligence` = `DEAD`, `svc.company-onboarding` = `INVESTIGATE` — and both entries' notes were updated on `main` to match (see the PR #114 conflict-resolution merge that reconciled this patch's branch with that outcome).

No other registry entries were changed.

---

## 8. Test governance

**Finding: no renames required.** Per §2, the `cc018-*`, `cc019a-*`, `cc019b-*` test files correctly use non-conflicting labels for valid work already on `main`; nothing encodes governance drift as architecture truth.

`tests/unit/cc020a-retire-company-intelligence.test.ts` is now present on `main`, in its corrected, narrowed form: it asserts `CompanyIntelligenceService` retired and `CompanyOnboardingService` restored/`INVESTIGATE` — matching §5's finding, not the original over-reaching deletion. No further action is required by this patch.

---

## 9. Next official B-TRUTH action

The task that prompted this patch proposed `ScoringSimulatorService + DemoScoringAdapter + kora-index-outputs.json` as the next candidate. **Independently verified and disqualified**, not merely accepted: §32's own Safe Deletion Plan table names this exact group — `DemoScoringAdapter · ScoringSimulatorService · demo-data · access-control` — with the explicit condition `fine B-TRUTH` (end of B-TRUTH) and `I9 = 0, adversarial superata` (I9 already zero, adversarial already passed). This is the frozen text's own designated **last** group, not a viable next step while I9 is still 24 (unaffected by PR #113 — `CompanyIntelligenceService.ts` was never itself an allowlist entry, and `CompanyOnboardingService.ts` was restored, not retired) and CC-022/023 have not started. Migrating it now would violate §32's own explicit sequencing.

`NEXT_OFFICIAL_B_TRUTH_TARGET = NONE_SAFELY_AVAILABLE` under the current, corrected governance. A prior exhaustive elimination pass over the full I9 allowlist (conducted before CC-019 was authorized) already found every remaining candidate outside the TenantService cluster to be one of: explicitly reserved (`ScoringSimulatorService`/`DemoDataService`/`CommonsService`/`KoraContributionService`/the Ingestion/UEF `DEMO_RUNTIME` chain), already demo-labeled (`WorkforceBaselineService`, `WorkforceQuickAccessPanel`), zero-live-reachable (`CompanyOnboardingService` pre-CC-020A, `CompanyDataIntakeService`, `FinancialGovernanceService`), or gated by the separate, unresolved D-D/B-WORKER decision (`WorkerAchievementService`, `/my-kora`-facing consumers). CC-020/CC-020A has since merged in its narrowed, corrected form (`CompanyIntelligenceService` retired, `CompanyOnboardingService` restored) with no net I9 effect, so no new candidate has opened up as a result. Unblocking a genuine next seed-group migration requires a founder decision to pull a currently-reserved or D-D-gated group forward explicitly.
