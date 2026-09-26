# 177 — KORA-WP-116 "KORAL Review" — Implementation Report

Status: **IMPLEMENTED, REMEDIATED, AND VALIDATED — NOT COMMITTED, NOT PUSHED** (per this task's and the 2026-09-19 remediation task's own explicit "STOP" instructions).

Contract chain: Registry 142 → frozen canonical sources (doc 128 §23/24, doc 129, doc 130 §6/§19/§21) → report `176` (`KORA_WP_116_CANONICAL_PRE_CHECK.md`) → the 6 binding Founder Adjudications for this task → actual repository code truth (read before every write, per every prior WP in this engagement) → **2026-09-19 remediation task (Issue 1: Advisor confirmation vs. WP-113 Morphogenesis support; Issue 2: Review-Case concurrent idempotency) — see §0 below, which governs over any conflicting statement later in this document. → **2026-09-26 concurrent-caller race remediation (report `192`) — see §0-bis below, which governs over §0 and over any conflicting statement later in this document.**

---

## 0-bis. REMEDIATION ADDENDUM (2026-09-26) — READ THIS FIRST, BEFORE §0

A third genuine defect was found **after** this WP was recorded COMPLETE, by canonical CI #340 (run `36258620941`) — not by review. Full analysis: report `192`.

`confirmAmbiguousCandidate()`'s graceful-race handling (described in §0.4/§0.5 below, and in that function's own header) lived **only in a `catch` block**, and its own comment assumed a concurrent loser "throws". It does not always throw. `assessMaterialChangeCandidate()` returns without throwing both when it short-circuits on an already-RECOGNIZED row (**L1**) and when `reverifyAgainstSource()` returns false (**L2**). So of the three real loser interleavings, only **L3** was handled:

- **L2** — the loser reported `recognized: false` about a row that IS `RECOGNIZED`. The re-verification closure returned one boolean for two unrelated facts ("no longer eligible" and "someone else already recognized it"), and only canonical persisted state distinguishes them. This is the assertion CI #340 failed, at `tests/unit/kora-wp-116-koral-review.test.ts:376`. That assertion was **correct and has not been weakened**.
- **L1** — the loser re-emitted the winner's `koral_review.candidate_confirmed` provenance event as if it had won. Latent; no test asserted it.

**Persisted-state and ledger exactly-once guarantees were never violated** in any interleaving — the compare-and-swap, the ledger RPC's `ON CONFLICT (material_change_id) DO NOTHING` and the state row lock all held. Only the Advisor-facing **return value** (L2) and **one provenance event** (L1) were wrong.

Fixed in the wrapper alone: a negative result is now confirmed against canonical persisted state before being reported, and winner status is derived from whether this caller's own re-verification actually ran and observed a still-CANDIDATE row, rather than from whether an exception was thrown. `recognized: false` keeps its exact meaning. **KORA-WP-112, the compare-and-swap, the ledger RPC, and every schema/migration/RLS policy are untouched.** Deterministic L1/L2/L3 + negative regression coverage added, verified to fail against the pre-remediation service.

Consequently, in §0.4/§0.5 and §26/§32/§34 below, any statement that the concurrency wrapper's graceful-race path is complete, or that a concurrent loser reaches it by way of a thrown error, is **SUPERSEDED** by this section. Their text is left intact as an honest historical record, not silently rewritten.

---

## 0. REMEDIATION ADDENDUM (2026-09-19) — READ THIS FIRST

The original implementation (§1-37 below, dated earlier the same day) shipped two genuine defects, both found and fixed before commit. Sections §17, §20, §21, §26, §32, §34 below are marked **SUPERSEDED** inline where they stated the pre-remediation (incorrect) behavior; their text is left intact as an honest historical record, not silently rewritten.

### 0.1 Canonical eligibility authority (corrected)

The pre-remediation eligible-for-confirmation set (§17, superseded) was sourced from a corroborating code comment (`initiative-adapter.ts`) alone, not the primary canonical source — exactly the kind of insufficient-authority the remediation task flagged. The primary source is `.kora-audit/output/129_KORA_LIVING_KORAL_STAGE_0_MATERIAL_CHANGE_CHANGE_PROTOCOL_DESIGN.md`, Part 12 ("Advisor Role"), verbatim:

> "Advisor validation is required **only** for interpretive/ambiguous transformation categories (Strengthening, Weakening, Reorientation, Stabilization) — never for discrete, self-evidencing ones (a closed initiative, an ended Assignment, a published Decision Pack, which are already canonical facts requiring no human confirmation)."

This is **four** categories, not five. **Consolidation was wrongly included** in the pre-remediation set. Doc 129 itself corroborates the exclusion independently: Part 2's own taxonomy table gives Consolidation's justifying evidence as "Coordinated closures + one clear emergence" — the same discrete, canonical-object-transition evidencing shape as Emergence/Disappearance (Part 2's own rows for those two) — and Part 23 ("Transformation Collisions") treats a clustered Consolidation event as combined *discrete* evidence ("same recognition window, mutually corroborating canonical objects"), never as a gradual/interpretive classification shift. Doc 129 Part 1's own v2 definition draws exactly this line ("discrete and self-evidencing" vs. "gradual/interpretive"); Consolidation's own evidencing sits on the discrete side.

**Corrected canonical set** (`lib/living-koral-review/types.ts`):
- `KORAL_REVIEW_ELIGIBLE_CONFIRMATION_CATEGORIES`: Strengthening, Weakening, Reorientation, Stabilization.
- `KORAL_REVIEW_EXCLUDED_CONFIRMATION_CATEGORIES`: Emergence, Disappearance, Consolidation.

Permanent test (`tests/unit/kora-wp-116-koral-review.test.ts`) cross-checks this partition against `getMaterialChangeTaxonomy()` (the real WP-111 versioned config) for exhaustiveness, and pins the exact 4-category set against doc 129 Part 12 by name — a comment is corroboration only, never sole authority, going forward.

### 0.2 Unsupported Morphogenesis categories — mechanical determination (Issue 1, answers A-D)

**A. Could an authenticated Advisor take a real persisted CANDIDATE in an eligible category from CANDIDATE → RECOGNIZED through the live WP-116 API/service, pre-remediation?** **YES.** Confirmed mechanically (not from comments) by the pre-remediation real-DB test run: `confirmAmbiguousCandidate()` for a `Strengthening` CANDIDATE completed successfully — `status: 'RECOGNIZED'`, `recognition_source: 'advisor-confirmed'` — with zero rejection.

**B. What happened immediately afterward when the existing WP-113 transformation path was invoked?** `recordLivingKoralTransformation()` called `getMorphogenesisOperationForCategory('Strengthening')`, which **threw** ("no live Morphogenesis Engine v1 operation mapping"). The pre-remediation code caught this specific error and treated it as an expected, skippable condition (`transformationRecorded: false`), returning a "successful" Mode-B confirmation result to the caller regardless.

**C. Could the database end up with Material Change = RECOGNIZED but no corresponding transformation-ledger entry, solely because Morphogenesis has no mapping?** **YES — mechanically proven, not hypothetical.** The pre-remediation real-DB test asserted exactly this state (`gov.living_koral_material_change.status = 'RECOGNIZED'` with zero matching rows in `gov.living_koral_transformation_ledger`) and passed.

**D. Is that state canonically permitted?** **NO explicit canonical permission was found.** Checked: Registry 142's own WP-116 entry (silent on this question — it is this WP's own job to determine it); doc 129 Part 19 (Material Change Event conceptual contract — treats `recognition_source`/`status` and the eventual transformation as one coherent record, never documents a legitimate split); doc 129 Part 20 (Change Event Lifecycle — RECOGNIZED is defined as the terminal state a category reaches either automatically or via confirmation, with no separate "recognized-pending-transformation" state named anywhere); doc 129 Part 26 (Edition Semantics — an Edition is "a transformation-ledger point + engine version," implicitly assuming every RECOGNIZED change that matters *has* a ledger point); WP-112's own recognition contract (`assessMaterialChangeCandidate`'s own doc comments — silent on downstream transformability, by design, since WP-112 predates WP-113); WP-113's own transformation contract (`recordLivingKoralTransformation`'s own header — explicitly designed to throw for a dormant category "rather than invent an operation," i.e., designed to refuse, not to tolerate a silent gap downstream); the actual service call chain (traced directly, §0.2 A/B above). **No source says this split is legitimate. Per the remediation task's own required invariant, this fails closed.**

### 0.3 Fix — fail closed, dormant until support exists

`lib/living-koral-review/types.ts` gained `isCurrentlyConfirmable(category)` = canon-eligible (§0.1) **AND** KORA-WP-113 currently has a live (non-null) operation mapping for it (read from `getMorphogenesisOperationMappings()` — a real versioned config, not a comment or a try/catch on a thrown message).

`confirmAmbiguousCandidate()`'s own step 7 now calls `isCurrentlyConfirmable()` **before any Case creation or recognition attempt** and rejects outright (throws, touches zero state) if false. The previous post-hoc "try recognition, then best-effort-skip the transformation" shape is removed entirely. `listKoralReviewSubjects()`'s own `eligibleForConfirmation` list is filtered by the same `isCurrentlyConfirmable()` — so the existing, unmodified Advisor UI (no redesign performed or needed) never renders a live "Conferma trasformazione" button for a category that would be rejected; it already only renders one per item in that array.

**Result — today, all four canon-eligible categories (Strengthening/Weakening/Reorientation/Stabilization) have no live KORA-WP-113 Morphogenesis mapping, so Mode B is currently rejected for every one of them.** Advisor confirmation is **structurally implemented, permanently tested, but fully DORMANT** — exactly the shape the original binding instruction asked for ("implement the confirmation capability safely but leave it dormant/unreachable for unsupported categories"), now actually true of the live code path, not merely true of "no producer exists yet."

Structurally extensible without redesign: `isCurrentlyConfirmable()` composes two independent, already-versioned facts (canon-eligibility, Morphogenesis support) — the day KORA-WP-113 adds a mapping for any of the four, this function and `confirmAmbiguousCandidate()` both start permitting it with zero code change in this WP.

### 0.4 Review-Case concurrent idempotency (Issue 2, answers A-D)

**A. Could two concurrent identical Review-create requests create two Operational Cases for the same logical request?** **YES, pre-remediation.** `createOrGetKoralReviewCase()`'s select-then-insert had a genuine race window (no DB-level constraint prevented two concurrent first-time calls from both missing the "existing" check and both inserting).

**B. Was a canonical idempotency key/path already available?** **YES** — KORA-WP-011's generic idempotency contract (`lib/async-contract/idempotency-contract.ts` + `PostgresIdempotencyStore`, migration 077's `analytics.idempotency_claim` / `claim_idempotency_key()` RPC), already reused unmodified by KORA-WP-115's `createLivingKoralEdition()` for an analogous problem. WP-007's own `operational-case-service.ts` and `advisor-case-service.ts` own no idempotent-creation primitive of their own.

**C. Did the API already receive/generate a reusable request identity?** No caller-supplied key existed. Per the remediation task's own distinction between retry-identity and domain-multiplicity, the correct key is **derived deterministically** from `(assignmentId, materialChangeId)` — not caller-generated, since the "same logical request" *is* "review this Material Change under this Assignment," already this WP's own declared design intent (report 176 §13; report 177 §13, unchanged by this remediation).

**D. Does canon mandate exactly one Review Case may ever exist for a subject, or would duplicates be accidental?** No frozen canonical source states a hard one-Review-per-subject rule; this WP's own already-declared design (§13 below, unchanged) treats "one Case per Material Change" as the intended shape (consistent with doc 128 §23's own suggestion of a Case-shaped Review). The fix below makes that existing intent concurrency-safe — it does **not** add a new invented `UNIQUE(assignment_id, material_change_id)` domain constraint; two *different* `(assignmentId, materialChangeId)` pairs remain always free to create distinct Cases.

**Fix**: `createOrGetKoralReviewCase()` now wraps its `createOperationalCase()` call in `executeIdempotent()` (KORA-WP-011, reused, no new framework), keyed on `{ tenantId: companyId, operation: 'koral_review.case_create', key: \`${assignmentId}:${materialChangeId}\` }`. A concurrent caller that observes `in_progress` polls (bounded: 20 × 25ms = 500ms, never an automatic retry of the *operation* itself, only a wait for the in-flight sibling's own single INSERT to land) and returns the sibling's resulting Case rather than erroring — satisfying the required behavior exactly: same key + concurrent execution → one effective Case; different keys → free to diverge.

### 0.5 Concurrency evidence (real-DB, local disposable Postgres)

`tests/unit/kora-wp-116-koral-review.test.ts` was rewritten and re-run against real local Postgres (`WP116_PG_URL`/`WP116_SUPABASE_URL`/`WP116_SERVICE_ROLE_KEY`/`WP116_ALLOW_RUN=true`): **22/22 passed**, including:
- Two concurrent `confirmAmbiguousCandidate()` calls on the same dormant-but-eligible CANDIDATE both reject cleanly; zero state mutation from either (no race-induced partial state).
- A corroborating, non-fabricated proof that the underlying KORA-WP-112 recognition CAS + KORA-WP-113 chaining (which `confirmAmbiguousCandidate` reuses unchanged, and which activates automatically the day a category gains support) is exactly-once under genuine concurrency — run directly against `Disappearance`, a category with real, live, pre-existing KORA-WP-113 support today, so nothing is fabricated: exactly one `RECOGNIZED` outcome, exactly one Ledger row, from two real concurrent connections.
- Two concurrent Mode-A (`interpretRecognizedChange`) calls against the *same* Material Change converge on exactly one Operational Case (verified both via the returned `case.id` and a direct `COUNT(*)` against `gov.operational_case`), with the KORA-WP-011 `analytics.idempotency_claim` row itself verified present and `succeeded`.
- Two Mode-A calls against *two different* Material Changes correctly produce two distinct Cases (domain multiplicity unaffected).

Full regression re-run after remediation: `tsc` clean; `eslint` clean; **411/411 test files, 13086/13086 tests** passed; mandatory RLS gate **24/24 files, 308/308 tests** passed against real local Postgres.

---

## 1. Executive Summary

KORA-WP-116 (KORAL Review) is implemented as a **domain-shaped use of existing primitives** — no new generic Review table, no second Case model, no duplicated recognition logic. It adds: one migration (086, two narrow additive schema widenings), one new domain module (`lib/living-koral-review/`), two new API routes, one Advisor UI toggle, and a required (not optional) `recognitionSource` parameter on the existing WP-112 recognition function. All 6 Founder Adjudications are honored; two genuine, previously-undocumented cross-WP boundary conditions were discovered by real-DB testing and are disclosed in §20 and §21 below, not hidden.

## 2. Scope Actually Implemented

- Migration 086: widen `gov.operational_case.linked_object_type` (+`'material_change'`); widen `advisor.advisor_content_record` (+nullable `linked_object_type`/`linked_object_id`, paired, restricted to `'material_change'` today).
- `lib/living-koral-review/types.ts`: eligibility-set derivation (mechanical, code-truth-derived, not invented).
- `lib/living-koral-review/review-service.ts`: the dedicated KORAL Review domain wrapper (Founder Adjudication #2) — `listKoralReviewSubjects`, `interpretRecognizedChange` (Mode A), `listReviewInterpretations`, `confirmAmbiguousCandidate` (Mode B, 10-step sequence).
- `lib/living-koral-material-change/material-change-service.ts`: `assessMaterialChangeCandidate()`'s `recognitionSource` is now a **required**, explicit parameter (was hardcoded `'kora-automatic'`).
- `lib/living-koral-material-change/initiative-adapter.ts`: updated call site (`recognitionSource: 'kora-automatic'`), no behavior change.
- `lib/advisor-portal/advisor-case-service.ts`: exported the existing `assertActiveAssignmentAndGetCompanyId` for reuse (no logic change).
- `lib/advisor-portal/advisor-content-service.ts`: added optional `linkedObjectType`/`linkedObjectId` to `AdvisorContentRecord`/`createAdvisorContent`; added `listContentLinkedToMaterialChange()`.
- `lib/operations/operational-case-service.ts`: widened `CASE_LINKED_OBJECT_TYPES` (TS mirror of the migration 086 CHECK).
- `app/api/advisor/companies/[assignmentId]/koral-review/route.ts` (GET subjects, POST interpret) and `.../koral-review/confirm/route.ts` (POST confirm) — two routes, deliberately not one action-discriminated endpoint.
- `app/advisor/companies/page.tsx`: one new "KORAL Review" toggle, extending the existing single Advisor company-assignment surface.
- Tests: `tests/unit/kora-wp-116-koral-review.test.ts` (new, structural + real-DB), plus disclosed updates to `kora-wp-007`, `kora-wp-042`, `kora-wp-044`, `kora-wp-112`, `kora-wp-113`, `pilot-trust-01` (all legitimately stale, never weakened — see §22).

## 3. What Was NOT Built (explicit exclusions honored)

- No `gov.living_koral_review` / `analytics.living_koral_review` table.
- No Company-side KORAL Review UI (Founder Adjudication #4).
- No KORA Admin KORAL Review UI (ownership remains UNASSIGNED, per report 176).
- No WP-117 (KORAL Mark), WP-118, or WP-119 code.
- No modification to WP-037 (`lib/review/review-advisor-assessment-service.ts`, `analytics.review_advisor_assessment`) — structurally proven never-imported/never-touched (§9, §22).
- No new idempotency mechanism, no new observability framework, no new generic Review table.
- No mutation to Edition, Portrait, Ledger-write logic, or Morphogenesis logic — this module only ever *calls* the existing WP-112/WP-113 entry points.
- No staging or production access of any kind.

## 4. Founder Adjudication #1 — "NOT human approval of KORAL" — Compliance

Advisor confirmation (Mode B, `confirmAmbiguousCandidate`) exists **only** for the canon-defined ambiguous-CANDIDATE case (the 5 interpretive categories — §12). It:
- Requires an active canonical Advisor Assignment (`assertActiveAssignmentAndGetCompanyId`, reused unmodified from WP-034).
- Operates through the dedicated `lib/living-koral-review/` path — never a generic "approve" endpoint.
- Re-reads/re-verifies the real Material Change row fresh at every step (steps 3-4-5-6-7, never a cached copy).
- Preserves every WP-112 source-truth invariant (never calls anything but `assessMaterialChangeCandidate()` for the actual state transition).
- Records explicit Advisor-confirmed provenance (`recognition_source='advisor-confirmed'` + a dedicated `koral_review.candidate_confirmed` governance event carrying the Advisor's own `actorId`).
- Is structurally distinguishable from automatic recognition at every layer (DB column, event type, UI copy).
- Never permits arbitrary category selection (the category is read from the real CANDIDATE row, never caller-supplied).
- Never permits arbitrary state manipulation (only CANDIDATE→RECOGNIZED, only via the one canonical function).
- Never writes directly to the Ledger or current-state (only ever *calls* `recordLivingKoralTransformation()`, WP-113's own gate).

## 5. Founder Adjudication #2 — Attribution Mechanism — Compliance

`assessMaterialChangeCandidate()` (WP-112, generic/domain-agnostic) gained a **required** `recognitionSource` parameter — not an optional "advisor id" parameter, and it accepts only the already-typed `LivingKoralMaterialChangeRecognitionSource` enum, never an Advisor identity. `lib/living-koral-review/review-service.ts` is the dedicated wrapper: it owns Assignment validation, Advisor identity, subject validation, source re-verification, and Advisor-confirmed attribution, and only then calls the narrow canonical recognition path with `recognitionSource: 'advisor-confirmed'`. Automatic (`initiative-adapter.ts`) and Advisor-confirmed (`review-service.ts`) recognition remain two distinct call sites into the *same* unduplicated function — no recognition logic is duplicated anywhere.

## 6. Founder Adjudication #3 — Interpretation Storage — Resolution (the due-diligence finding)

**Finding**: `advisor.advisor_content_record` (WP-036), as it existed through migration 060, is scoped only by `assignment_id` — no column links a record to a specific Case or Material Change. Storing Review interpretation there unmodified would force either (a) encoding the reference inside the free-text `body` field (semantic abuse — forbidden), or (b) falling back to `operational_case.resolution_note` (explicitly forbidden by this same adjudication).

**Resolution reached**: a narrow, additive widening of the *same* existing table — two new nullable columns (`linked_object_type`, `linked_object_id`), migration 086 — is **not** "inventing a second content system." It reuses the same table, the same five classes (no sixth class added), the same append-only/Assignment-scoping discipline, and the same polymorphic-link pattern `gov.operational_case.linked_object_id` already established (migration 061). This mirrors every other "narrow additive extension, not new primitive" decision already made in this engagement (the `linked_object_type` CHECK widening itself; WP-114's `fn_company_living_koral_source_initiative()` bridge). Interpretation is persisted as an ordinary `ORGANISATION_SHAREABLE_NOTE`, now optionally linked to the Material Change it concerns — real, disclosed, migrated, and proven end-to-end against a real database (§19).

No STOP was triggered: the adjudication's own STOP condition is about *inventing a second content system*, which this is not.

## 7. Founder Adjudication #4 — No Company UX in V1 — Compliance

`/company/living-koral` and `/company/living-koral/editions` were not touched. No Company-facing route, component, or API endpoint was added or modified for KORAL Review.

## 8. Founder Adjudication #5 — Fee-Independence Guard Extension — Compliance

`tests/unit/kora-wp-042-fee-independence-guard.test.ts` gained a new `describe` block (`KORA-WP-116 — fee-independence extension`) asserting: `lib/living-koral-review/review-service.ts` never imports `flow-a-billing`/`fee_charge_event`/`CommercialEntitlement`; `flow-a-billing-service.ts` never imports `living-koral-review` or any KORAL Review type; no `amount * rate`-shaped arithmetic exists in the Review module. This is a narrow extension of the existing invariant, not a rewrite of WP-042's architecture, matching that guard's own established pattern exactly.

## 9. Founder Adjudication #6 — No New Review System — Compliance

Reused, unmodified in their own core logic: WP-007 Operational Case (`createOperationalCase`, `CASE_ALLOWED_TRANSITIONS`, unchanged), the existing Advisor Assignment gate (`assertActiveAssignmentAndGetCompanyId`, now exported and reused, not re-derived), WP-036 content taxonomy (widened additively, §6), WP-112 Material Change (`assessMaterialChangeCandidate`, `getMaterialChangeCandidate`, `createMaterialChangeCandidate` — none of the latter two touched), WP-113 transformation machinery (`recordLivingKoralTransformation`, called, never duplicated). A structural test (`tests/unit/kora-wp-116-koral-review.test.ts`) proves `review-service.ts` never imports `lib/review/review-service.ts` (WP-024, unrelated "Review") or `review-advisor-assessment-service.ts`/`review-advisor-proposal-service.ts` (WP-037).

## 10. Domain Model — What Exists, What Does Not

No `gov.living_koral_review` table. No `analytics.living_koral_review` table. No new generic Review table of any kind — proven by a structural test scanning migration 086's own text. KORAL Review is: one `gov.operational_case` row (`linked_object_type='material_change'`) per reviewed Material Change, plus zero or more `advisor.advisor_content_record` rows (class `ORGANISATION_SHAREABLE_NOTE`, linked to that same Material Change) for interpretation content.

## 11. Migration 086 — Actual Scope (mechanically confirmed, not assumed)

Ceiling was 085 before this task (confirmed via `ls supabase/migrations/`); 086 is genuinely next. Two changes only, both additive:
1. `gov.operational_case.linked_object_type` CHECK: `+'material_change'`.
2. `advisor.advisor_content_record`: `+linked_object_type text NULL`, `+linked_object_id uuid NULL`, paired CHECK, value-restricted CHECK, one supporting index.

No table created. No RLS policy modified (the three pre-existing `advisor_content_record` policies from migration 060 apply row-wise regardless of the two new nullable columns — verified: no new visibility class introduced). `gov.living_koral_material_change` (migration 081) is untouched — `recognition_source` already allowed `'advisor-confirmed'` at the DB level from its own first migration; only the *application* layer needed to stop hardcoding `'kora-automatic'`.

Applied and verified against a real, local, disposable Postgres instance (see §19) — not merely written and assumed correct.

## 12. Review Subject — Mechanically Confirmed

The Review subject is the Material Change (`gov.living_koral_material_change`), never the Edition. Confirmed both by report 176's own mechanical determination and by this task's own §3 requirement; no code path in this implementation ever reads or references `analytics.living_koral_edition`.

## 13. Review Creation Trigger

A KORAL Review Case is created lazily, on first Advisor action (either the first `interpretRecognizedChange` or the first `confirmAmbiguousCandidate` call against a given Material Change) — `createOrGetKoralReviewCase()`, idempotent by lookup (never a bare trigger on Material Change recognition itself, which would create Cases the Advisor never asked to open).

## 14. Advisor Assignment Gate — Reused Exactly

`assertActiveAssignmentAndGetCompanyId()` (exported from `advisor-case-service.ts`, WP-034's own established gate) is the single Assignment-validity check for every KORAL Review action — no second, weaker, or different gate was written. An ended Assignment rejects both Mode A and Mode B identically to how it already rejects Case/content operations.

## 15. Review Mode A — Interpret (zero mutation)

`interpretRecognizedChange()`: requires the target Material Change to be `RECOGNIZED` (rejects `CANDIDATE`/`SUPERSEDED` with an explicit message directing the caller to Mode B if eligible); writes only a linked `advisor.advisor_content_record` row plus (idempotently) the wrapping Case; the Material Change row's own `status`/`updated_at` are verified unchanged before/after in the real-DB proof (§19).

## 16. Review Mode B — Confirm (the 10-step sequence)

`confirmAmbiguousCandidate()`, steps as implemented (inline-commented in the source, one-to-one with this task's own spec):
1. Authenticated Advisor identity — resolved by the API route (`requireAdvisorUser` + `getAdvisorIdentityByAuthUserId`) before the service is ever called.
2. Active Assignment verification.
3-4. Current Material Change re-read (fresh DB read, never a caller-cached copy).
5. Source object re-verification — see §17 for the honest, non-fabricated interpretation of this step.
6. Verify still `CANDIDATE`.
7. Verify category is eligible (§12).
Case/subject validation — ensure/reuse the wrapping Review Case.
8. Perform canonical recognition via `assessMaterialChangeCandidate({ recognitionSource: 'advisor-confirmed', ... })` — never duplicated.
9. Record Advisor-confirmed provenance (`koral_review.candidate_confirmed` governance event).
10. Allow WP-113 to consume the result — see §20 for a real, disclosed boundary discovered here.

## 17. Eligibility-for-Confirmation — Mechanically Recovered, Not Invented — **SUPERSEDED, see §0.1**

**⚠ SUPERSEDED by the 2026-09-19 remediation (§0.1) — left unmodified below as an honest historical record of the pre-remediation reasoning, which relied on a corroborating comment as its ONLY source and consequently got the set wrong (wrongly included Consolidation). Do not use this section as current truth; use §0.1.**

Recovered from actual code truth, not the taxonomy config alone (which carries no self-evidencing/ambiguous flag): `lib/living-koral-material-change/initiative-adapter.ts`'s own header/inline comment states verbatim that Emergence/Disappearance are "discrete, self-evidencing categories... no Advisor confirmation applies." By elimination against the full 7-category taxonomy, the five eligible categories are Strengthening, Weakening, Consolidation, Reorientation, Stabilization. A structural test (`kora-wp-116-koral-review.test.ts`) proves the eligible/excluded sets partition the full taxonomy exactly, so a future 8th category cannot silently misclassify.

**Disclosed**: no live domain adapter produces a CANDIDATE in any of the five eligible categories today (only the initiative adapter exists, and it only ever produces Emergence/Disappearance). Review Mode B is therefore correctly implemented but dormant in this pilot slice — Founder Adjudication #7 explicitly permits this ("dormant/unreachable but safely implemented is acceptable"). No fake producer was fabricated to exercise it; the real-DB proof (§19) inserts fixture CANDIDATE rows directly, exactly as report 176's own §17 already anticipated would be necessary.

## 18. Recognition-Provenance — Schema-Verified Before Use

`recognition_source`'s exact literal tokens (`'kora-automatic'`, `'advisor-confirmed'`) were read from the live DB CHECK constraint (migration 081) before being used anywhere in this WP's own code — not invented.

## 19. Real-DB Validation — What Was Actually Run

Local disposable Supabase/Postgres (already running at session start, migration ceiling 085 confirmed before this task began). Migration 086 applied and schema-verified directly (constraint text and column list confirmed via `pg_constraint`/`information_schema.columns` — see the session's own tool output). `tests/unit/kora-wp-116-koral-review.test.ts` executed against it with `WP116_PG_URL`/`WP116_SUPABASE_URL`/`WP116_SERVICE_ROLE_KEY`/`WP116_ALLOW_RUN=true`: **16/16 passed**, including:
- Structural: no forbidden score/grade/approval vocabulary; eligibility-set partition integrity; no new Review table; no WP-037 import.
- `listKoralReviewSubjects`: correctly includes the eligible CANDIDATE, excludes the self-evidencing CANDIDATE, includes the RECOGNIZED change.
- Mode A: succeeds for RECOGNIZED, zero mutation proven (status/`updated_at` byte-identical before/after), Case reuse is idempotent, rejects a still-CANDIDATE target.
- Mode B: rejects a self-evidencing category; succeeds for an eligible CANDIDATE (`RECOGNIZED`, `recognition_source='advisor-confirmed'`, one domain governance event with the correct `actorId`, zero WP-037 rows created); re-attempting on the now-RECOGNIZED row rejects cleanly with no duplicate Ledger row.
- **Concurrency**: two genuinely concurrent `confirmAmbiguousCandidate()` calls (`Promise.all`, two real requests) against the *same* eligible CANDIDATE produce exactly one RECOGNIZED outcome and exactly one `koral_review.candidate_confirmed` governance event — both calls resolve gracefully (no uncaught race error reaches the caller).

## 20. Disclosed Finding #1 — WP-113 Morphogenesis has no operation mapping for any of the 4 eligible-for-confirmation categories — **SUPERSEDED, see §0.2/§0.3**

**⚠ SUPERSEDED by the 2026-09-19 remediation. The "resolution" described below (skip chaining, return a "successful" result anyway) was ITSELF the defect the remediation fixed — it permitted a real RECOGNIZED-without-transformation partial state with no canonical permission for that split (§0.2 answers A-D). Left unmodified below as an honest historical record. Current, correct behavior: §0.3 (fail closed, before any state is touched).**

Discovered by the real-DB run (not assumed): `getMorphogenesisOperationForCategory()` (WP-113) has *never* had an operation mapping for Strengthening/Weakening/Consolidation/Reorientation/Stabilization — it was scoped, from its own first implementation, to Emergence/Disappearance only (pre-check 170 §13's own documented, pre-existing gap). Calling `recordLivingKoralTransformation()` for an eligible-category confirmation therefore always throws today.

**Resolution**: `confirmAmbiguousCandidate()` performs a dry check (`getMorphogenesisOperationForCategory`) before attempting the WP-113 call. When the category has no mapping, chaining is skipped — the Review confirmation itself (already complete: `RECOGNIZED`, `recognition_source='advisor-confirmed'`) is still a full, valid, real outcome; the result's new `transformationRecorded: boolean` field tells the caller which happened. This WP does **not** extend WP-113's own scope or fabricate an operation mapping (Founder Adjudication #7's "must not fabricate" extends to this) — the gap is inherited and disclosed, not hidden or routed around silently.

## 21. Disclosed Finding #2 — a minor, non-blocking Review-Case idempotency gap under true concurrency — **REMEDIATED, see §0.4**

**⚠ REMEDIATED 2026-09-19 (§0.4) — treated as blocking per the remediation task's own instruction, not left as "minor/non-blocking." Left unmodified below as an honest historical record of the original, insufficiently-conservative disclosure.**

`createOrGetKoralReviewCase()`'s own select-then-insert is not atomic at the DB level (no unique constraint exists on `(linked_object_type, linked_object_id, owning_advisor_id)`). Under a true race, two concurrent first-time actions against the same Material Change could in principle create two wrapping Cases. This does **not** affect the safety properties this task required: Material Change recognition stays exactly-once (proven, §19) and Ledger chaining stays exactly-once (proven, §19) via the pre-existing WP-112 CAS and WP-113 RPC-level idempotency respectively — only the wrapping Case bookkeeping has this narrow, disclosed limitation. Closing it would require a new migration-level unique constraint, out of scope for this task's already-applied migration 086; noted here rather than silently left undocumented.

## 22. Test Suite Changes — Full Disclosure

All of the following were genuinely stale (broken by this WP's own legitimate, disclosed changes), never silently loosened:
- `tests/unit/kora-wp-007-operational-case.test.ts`: `CASE_LINKED_OBJECT_TYPES` now includes `'material_change'` — updated with a disclosure comment.
- `tests/unit/kora-wp-042-fee-independence-guard.test.ts`: migration ceiling `85→86`; new `describe` block extending the guard to `lib/living-koral-review/review-service.ts` (§8).
- `tests/unit/kora-wp-044-security-hardening-batch.test.ts`: migration ceiling `85→86`.
- `tests/unit/kora-wp-112-material-change-layer.test.ts`: migration ceiling `85→86`; one fixture call updated with the new required `recognitionSource` param.
- `tests/unit/kora-wp-113-transformation-ledger-morphogenesis.test.ts`: migration ceiling `85→86`.
- `tests/unit/pilot-trust-01-service-role-guard.test.ts`: added `lib/living-koral-review/review-service.ts` to the explicit service-role allowlist, same "Pattern-A" rationale and comment style as every other Advisor-portal entry already there.

No assertion was weakened or deleted — every change either widens an enum the test itself asserts, bumps a ceiling constant to the new, real, verified value, or extends an existing invariant's own scope.

## 23. Advisor UI

Exactly one new toggle ("KORAL Review") added to the existing `app/advisor/companies/page.tsx` — no new route, no new dashboard, no Company picker. The panel clearly separates "Da confermare (ambigue)" (Mode B, "Conferma trasformazione") from "Riconosciute — aggiungi interpretazione" (Mode A, "Aggiungi interpretazione"). No "Approve" wording anywhere; copy uses "Review"/"Conferma trasformazione"/"Aggiungi interpretazione", consistent with the existing Italian-first, named-English-term convention (`CLAUDE.md` §15).

## 24. Company / KORA Admin / Worker UI — Confirmed Absent

No file under `app/company/`, `app/admin/`, or `app/my-kora/` (Worker) was created or modified for this WP.

## 25. Privacy

No worker-level data is read, exposed, or referenced anywhere in this module. The only "safe bridge" reused is the pre-existing `gov.living_koral_material_change`/`advisor.advisor_content_record` read paths, already governed by their own existing RLS (unmodified) and by the service-layer Assignment gate. No `personal.*` RLS policy was touched.

## 26. Idempotency and Concurrency — Reused Primitives Only — **UPDATED, see §0.4**

No new generic idempotency mechanism was created. Mode A/B's Case creation now uses KORA-WP-011's existing `executeIdempotent()`/`PostgresIdempotencyStore` contract, keyed deterministically off `(assignmentId, materialChangeId)` (§0.4) — genuinely concurrency-safe, proven against real Postgres (§0.5), not merely "idempotent by lookup" (the pre-remediation claim below, which had a real race window). Mode B's recognition-uniqueness is inherited entirely from WP-112's own `UPDATE ... WHERE status='CANDIDATE'` compare-and-swap (unmodified); WP-113's own Ledger uniqueness is inherited from its own RPC-level `UNIQUE(material_change_id)` (unmodified) — and is now only ever reached once `isCurrentlyConfirmable()` has already guaranteed a live mapping exists (§0.3), so chaining is deterministic, not best-effort. This wrapper still carries a graceful recovery path for the WP-112 CAS *loser* (re-read-and-return instead of propagating WP-112's own inherited throw) — unchanged by this remediation, corroborated directly (not fabricated) in §0.5's own Disappearance-based concurrency proof.

## 27. Access Matrix

No new resource/route category beyond the existing "Advisor company-assignment surface" (already documented) was introduced; no access-matrix document update was required.

## 28. Observability

Reuses the existing `audit.governance_event` substrate (WP-006) exclusively — two new, non-catalogued event types (`koral_review.interpretation_added`, `koral_review.candidate_confirmed`), same pattern as every other non-14-category domain event in this codebase. No new logging framework; no Worker-level data in any payload.

## 29. WP-117/118/119 — Confirmed Not Started

No file under any KORAL Mark, Commons, or Expression-Mode-named path was created or touched.

## 30. Staging / Production

Not touched. Migration 086 exists only in this branch's local file and was applied only to the local disposable Postgres instance for validation (§19) — never to the staging Supabase project (`haqflkurpmeaxpikozjl`) or production.

## 31. Vercel

Not applicable to this task — no commit, no push occurred (§33). Vercel verification is out of scope until a future, separately-authorized commit/push task, matching the established WP-114/115 pattern.

## 32. Validation Summary — **UPDATED (post-remediation numbers)**

Pre-remediation (superseded):
- `npx tsc --noEmit`: clean.
- `npx eslint` (all new/modified files): 0 errors (2 pre-existing, unrelated warnings in a file this WP only touched for an unrelated assertion).
- `npx vitest run` (full suite): **411/411 test files passed, 13083/13083 tests passed**, 0 failures.
- `tests/unit/kora-wp-116-koral-review.test.ts` against real local Postgres: **16/16 passed**, including genuine concurrency.

**Post-remediation (2026-09-19, current)**:
- `npx tsc --noEmit`: clean.
- `npx eslint` (all new/modified files, including `tests/unit/kora-wp-011-async-idempotency-contract.test.ts`, newly touched by this remediation): clean.
- `npx vitest run` (full suite): **411/411 test files passed, 13086/13086 tests passed**, 0 failures (one additional legitimate allowlist entry needed and added — `tests/unit/kora-wp-011-async-idempotency-contract.test.ts`'s own `KNOWN_LEGITIMATE_IMPORTERS`, since `review-service.ts` now legitimately imports the WP-011 contract — §0.4).
- `tests/unit/kora-wp-116-koral-review.test.ts` (rewritten) against real local Postgres: **22/22 passed** — see §0.5 for the full breakdown.
- Mandatory RLS integration gate (RLS-03 through RLS-27, the full CI-enumerated list) against real local Postgres: **24/24 files, 308/308 tests passed** — unaffected by this remediation (no RLS policy was touched), re-run for completeness per the remediation task's own instruction.

## 33. Repository Safety — Final Confirmations

- No commit occurred.
- No push occurred.
- Staging untouched.
- Production untouched.
- WP-117 not started.
- KORAL Mark not implemented, referenced, or approximated in any form.
- The sacred file `scripts/provision-next-review.mjs` was never read, opened, catted, grepped, inspected, hashed, copied, modified, staged, moved, renamed, deleted, stashed, or cleaned — confirmed by final `git status --short` below (still `??`, byte-identical to session start).

## 34. Final `git status --short` — **UPDATED (post-remediation)**

```
 M app/advisor/companies/page.tsx
 M lib/advisor-portal/advisor-case-service.ts
 M lib/advisor-portal/advisor-content-service.ts
 M lib/living-koral-material-change/initiative-adapter.ts
 M lib/living-koral-material-change/material-change-service.ts
 M lib/operations/operational-case-service.ts
 M tests/unit/kora-wp-007-operational-case.test.ts
 M tests/unit/kora-wp-011-async-idempotency-contract.test.ts
 M tests/unit/kora-wp-042-fee-independence-guard.test.ts
 M tests/unit/kora-wp-044-security-hardening-batch.test.ts
 M tests/unit/kora-wp-112-material-change-layer.test.ts
 M tests/unit/kora-wp-113-transformation-ledger-morphogenesis.test.ts
 M tests/unit/pilot-trust-01-service-role-guard.test.ts
?? app/api/advisor/companies/[assignmentId]/koral-review/
?? lib/living-koral-review/
?? scripts/provision-next-review.mjs
?? supabase/migrations/086_koral_review.sql
?? tests/unit/kora-wp-116-koral-review.test.ts
```

One additional file relative to the pre-remediation list: `tests/unit/kora-wp-011-async-idempotency-contract.test.ts` (§0.4/§32).

## 35. Unresolved / Open Items for a Future WP (not blocking this WP's own completion)

- WP-113 Morphogenesis Engine has no operation mapping for the 5 interpretive categories (§20) — a future WP-113 extension, not owned here.
- Review-Case creation idempotency under true concurrency is proven safe for the properties this task required, but not DB-constraint-enforced (§21) — a candidate for a future, separately-authorized narrow migration if it ever becomes load-bearing.
- ADMIN KORAL REVIEW UI ownership remains UNASSIGNED (per report 176, unchanged by this task).

## 36. Relationship to Report 176

Every open question report 176 left as "flagged as an implementation-time choice, not invented as settled fact there" has now been resolved, with the resolution and its reasoning recorded in this report (§6 interpretation storage; §17 eligibility mechanism; §8 fee-independence extension, made REQUIRED by this task's own Founder Adjudication #5, not merely recommended).

## 37. Completion Statement — **UPDATED**

**KORA-WP-116: IMPLEMENTED, REMEDIATED, AND VALIDATED.** Both remediation issues (Advisor confirmation vs. WP-113 Morphogenesis support; Review-Case concurrent idempotency) are resolved — see §0 for the full canonical reasoning and evidence. No outstanding debt against this task's own binding requirements or the remediation task's own required invariants. Commit/push remain explicitly deferred to a future, separately-authorized task, per both tasks' own instructions.

## 38. COMMIT / PUSH / VERCEL (2026-09-19, Founder-authorized)

**Pre-commit scope check**: `git status --short` before staging matched the accepted WP-116 scope exactly (13 modified files, 2 new directories expanding to 4 new files, 1 new migration, 1 new test file) — no unexpected tracked change. Staged by explicit path only (never `git add -A`); the sacred file `scripts/provision-next-review.mjs` was never read, opened, catted, grepped, inspected, hashed, copied, staged, moved, or deleted — it remained `??` before, during, and after the commit.

**Commit**:
- Full SHA: `cca814f50c83e9f493d59fe5298ed4d30af22c92`
- Subject: `feat(living-koral): add KORAL Review`
- 19 files changed, 1582 insertions(+), 20 deletions(-).

**Push**:
- Branch: `audit/mega-code-truth-2026-09`
- Remote: `origin` (`https://github.com/simonefelicetti89-netizen/kora-foundation-light-demo.git`)
- `bc7fe6f..cca814f audit/mega-code-truth-2026-09 -> audit/mega-code-truth-2026-09` — accepted, fast-forward, no force.
- Post-push `git fetch` + verification: local `HEAD` and `origin/audit/mega-code-truth-2026-09` both resolve to `cca814f50c83e9f493d59fe5298ed4d30af22c92` — identical.

**Vercel — first attempt**: via Claude Code's own Vercel MCP tooling (`list_teams`, `get_git_deployment_context`) immediately post-push. Both returned `teams: []` — the exact same known account/scope-binding blocker already documented for WP-114 (report 173) and WP-115 (report 175): this session's Vercel MCP connection is not bound to a team/project this account can see. No deployment ID, Preview URL, or deployment state could be retrieved through this tooling. Per that task's own explicit instruction: not marked N/A, no verification invented, stopped at that point and reported as a blocker.

**Vercel — Founder-authorized external verification (completed)**: the Founder subsequently and explicitly authorized verification through ChatGPT's connected Vercel integration — an operational tooling exception, not the default process, matching WP-114/115's own established precedent exactly.

- Deployment ID: `dpl_EUiPbyNXKUr7Vfi5SkZqX1uMgW94`
- Preview URL: `https://kora-foundation-light-demo-h1pu5ddih-simone-felicettis-projects.vercel.app`
- Branch: `audit/mega-code-truth-2026-09`
- Commit SHA: `cca814f50c83e9f493d59fe5298ed4d30af22c92` (matches the WP-116 commit exactly)
- State: `READY`

Smoke test against `/advisor/companies`: HTTP 200 OK, the canonical Advisor auth boundary was reached (`x-matched-path: /login`), no 404, no 500, no build/deployment crash.

- `POST-PUSH VERCEL PREVIEW SMOKE: VERIFIED`
- `AUTHENTICATED APPLICATION RUNTIME BEHAVIOR: NOT PERFORMED` — the smoke test confirms the deployment is live and the Advisor route correctly redirects to the auth boundary; it does NOT confirm Advisor Assignment behavior, interpretation submission, candidate confirmation, Case creation, or any API write behavior, none of which were exercised through an authenticated Advisor session.

**Tooling-exception disclosure**: Claude Code's own Vercel MCP remains bound to the wrong/inaccessible scope in this session (confirmed again immediately before this verification, same `teams: []` result). The Founder explicitly authorized external verification through ChatGPT's connected Vercel integration for this WP. This remains an operational tooling exception, not the default workflow. No code, Git, staging, or production state was changed by this verification step.

**KORA-WP-116: COMPLETE.** Implementation (§1-37), remediation (§0), commit/push (§38 above), and post-push Vercel Preview verification via Founder-authorized external verification (this section) are all done. No outstanding Preview-verification debt.
