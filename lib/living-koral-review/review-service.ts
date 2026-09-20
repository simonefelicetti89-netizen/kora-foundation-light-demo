// lib/living-koral-review/review-service.ts
// KORA-WP-116 — KORAL Review.
//
// The dedicated KORAL Review domain wrapper service (Founder Adjudication
// #2, verbatim): "Use a dedicated KORAL Review wrapper/domain service
// around the existing Material Change recognition machinery... The Review
// service should own: Assignment validation, Advisor identity, subject
// validation, source re-verification, Advisor-confirmed attribution, then
// call the narrow canonical recognition path."
//
// KORAL Review is NOT human approval of KORAL (Founder Adjudication #1).
// This module never lets a caller pick an arbitrary category, never
// mutates Ledger/Edition/current-state directly, and never promotes a
// Material Change to RECOGNIZED by any path other than
// assessMaterialChangeCandidate() itself (KORA-WP-112's own canonical
// recognition function, called here — never duplicated).
//
// No new table. KORAL Review is a domain-shaped USE of the existing
// gov.operational_case primitive (KORA-WP-007, linked_object_type=
// 'material_change', migration 086) plus existing Advisor content
// (KORA-WP-036, optionally linked to that same Material Change, migration
// 086) — see report 176 §15-16 and this WP's own Founder Adjudication #6.
//
// TWO REVIEW MODES (this WP's own task spec):
//   A — interpretRecognizedChange(): interpret an already-RECOGNIZED
//       Material Change. Zero mutation to Material Change / Ledger /
//       Edition — only Advisor interpretation content is written.
//   B — confirmAmbiguousCandidate(): confirm a CANDIDATE that is
//       CURRENTLY confirmable (types.ts's own isCurrentlyConfirmable() —
//       canon-eligible AND KORA-WP-113 Morphogenesis-supported). The ONLY
//       path by which a KORAL Review Advisor action may ever promote a
//       Material Change to RECOGNIZED. Ten-step sequence — see that
//       function's own inline step comments.
//
// FAIL-CLOSED INVARIANT (2026-09-19 remediation, binding): no category may
// go CANDIDATE -> RECOGNIZED through this module unless KORA-WP-113 can
// currently represent the corresponding transformation. Advisor
// confirmation for a canon-eligible-but-currently-unsupported category is
// REJECTED before any state is touched — never split into a partial
// "recognized but not transformed" outcome. See types.ts's own
// isCurrentlyConfirmable() header for the full canonical reasoning.
//
// WP-037 (Advisor Review Assessment) BOUNDARY: this module never imports
// lib/review/review-advisor-assessment-service.ts or touches
// analytics.review_advisor_assessment — confirmed structurally distinct
// (report 176 §14). See tests/unit/kora-wp-116-review-assessment-separation.test.ts.

import { getSupabaseServiceClient } from '@/lib/supabase/server';
import { recordGovernanceEvent } from '@/lib/audit/governance-event';
import { assertActiveAssignmentAndGetCompanyId, listAdvisorCases } from '@/lib/advisor-portal/advisor-case-service';
import { createOperationalCase, type OperationalCase } from '@/lib/operations/operational-case-service';
import {
  getMaterialChangeCandidate, listMaterialChangesForTenant, assessMaterialChangeCandidate,
} from '@/lib/living-koral-material-change/material-change-service';
import type { LivingKoralMaterialChangeRecord } from '@/lib/living-koral-material-change/types';
import { recordLivingKoralTransformation } from '@/lib/living-koral-transformation-ledger/transformation-ledger-service';
import { createAdvisorContent, listContentLinkedToMaterialChange, type AdvisorContentRecord } from '@/lib/advisor-portal/advisor-content-service';
import { isCurrentlyConfirmable } from './types';
import { executeIdempotent, IdempotentExecutionError, type IdempotencyKey } from '@/lib/async-contract/idempotency-contract';
import { PostgresIdempotencyStore } from '@/lib/async-contract/postgres-idempotency-store';

// KORA-WP-011's own generic idempotency contract, reused unmodified — same
// discipline lib/living-koral-edition/edition-service.ts already
// established (KORA-WP-115), never a new idempotency framework (Founder
// remediation, Issue 2).
const KORAL_REVIEW_CASE_IDEMPOTENCY_OPERATION = 'koral_review.case_create';

// ── createOrGetKoralReviewCase — idempotent, private helper ─────────────────
// One Operational Case wraps one Material Change's own KORAL Review,
// scoped to the Advisor who opened it (mirrors createAdvisorCase's own
// company/Advisor-scoping discipline exactly).
//
// CONCURRENCY (Founder remediation, Issue 2): the idempotency key is
// DERIVED deterministically from (assignmentId, materialChangeId) — this
// is a RETRY-IDENTITY key, not an invented domain-uniqueness rule. No
// frozen canonical source says only one Review Case may ever exist for a
// subject; what IS already this WP's own declared design (report 176 §13,
// report 177 §13, unchanged by this remediation) is that repeated/
// concurrent requests to review the SAME Material Change under the SAME
// Assignment should converge on one Case — this fix makes that existing
// intent concurrency-safe, it does not introduce a new constraint. A
// DIFFERENT (assignmentId, materialChangeId) pair always gets a different
// key and may freely create a distinct Case.
async function createOrGetKoralReviewCase(
  assignmentId: string,
  callerAdvisorId: string,
  companyId: string,
  materialChange: LivingKoralMaterialChangeRecord,
  actorId: string,
): Promise<OperationalCase> {
  // Defense-in-depth existing-lookup, same discipline
  // createMaterialChangeCandidate() (KORA-WP-112) already established —
  // the idempotency claim below is the real concurrency gate; this lookup
  // is a fast path that also covers a Case already created under a prior
  // claim.
  const existingCases = await listAdvisorCases(assignmentId, callerAdvisorId);
  const existing = existingCases.find(
    (c) => c.linkedObjectType === 'material_change' && c.linkedObjectId === materialChange.id,
  );
  if (existing) return existing;

  const key: IdempotencyKey = {
    tenantId: companyId,
    operation: KORAL_REVIEW_CASE_IDEMPOTENCY_OPERATION,
    key: `${assignmentId}:${materialChange.id}`,
  };
  const store = new PostgresIdempotencyStore();

  try {
    const outcome = await executeIdempotent<OperationalCase>({
      store,
      key,
      payload: { assignmentId, materialChangeId: materialChange.id },
      execute: async () => createOperationalCase({
        organisationType: 'company',
        organisationId: companyId,
        linkedObjectType: 'material_change',
        linkedObjectId: materialChange.id,
        subject: `KORAL Review — ${materialChange.category}`,
        callerRole: 'ADVISOR',
        callerAdvisorId,
        actorId,
      }),
    });

    if (outcome.kind === 'executed' || outcome.kind === 'replayed') return outcome.result;

    if (outcome.kind === 'in_progress') {
      // Another concurrent request currently owns this exact claim.
      // KORA-WP-011's own contract explicitly does not automatically
      // retry the OPERATION itself here (§12 — that decision belongs to
      // the caller) — but "same logical create request + same
      // idempotency key + concurrent execution -> one effective Review
      // Case" (this WP's own required behavior, Founder remediation
      // Issue 2) means this caller must still receive that one effective
      // Case, not merely an error, whenever the sibling's own single
      // INSERT (bounded, fast) completes. A short bounded poll — never an
      // automatic retry of createOrGetKoralReviewCase itself, never a
      // second claim attempt — waits for exactly that.
      const POLL_INTERVAL_MS = 25;
      const POLL_MAX_ATTEMPTS = 20; // 500ms total — a single-row INSERT completes far sooner in practice
      for (let attempt = 0; attempt < POLL_MAX_ATTEMPTS; attempt++) {
        const recheck = (await listAdvisorCases(assignmentId, callerAdvisorId))
          .find((c) => c.linkedObjectType === 'material_change' && c.linkedObjectId === materialChange.id);
        if (recheck) return recheck;
        await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
      }
      throw new Error('[KORA] createOrGetKoralReviewCase rejected: a concurrent Review Case creation for this Material Change did not complete in time — retry shortly.');
    }

    if (outcome.kind === 'conflict') {
      // Cannot occur in practice (the payload is fully deterministic from
      // the same key inputs) — handled explicitly rather than silently
      // ignored, per this contract's own discipline.
      throw new Error('[KORA] createOrGetKoralReviewCase rejected: idempotency payload conflict for an existing Review Case claim.');
    }

    // 'replayed_failure' — a prior attempt under this exact key already failed.
    throw new Error(`[KORA] createOrGetKoralReviewCase rejected: a prior Review Case creation attempt failed: ${outcome.error}`);
  } catch (err) {
    const message = err instanceof IdempotentExecutionError && err.cause instanceof Error ? err.cause.message
      : err instanceof Error ? err.message
      : String(err);
    throw new Error(message.startsWith('[KORA]') ? message : `[KORA] createOrGetKoralReviewCase failed: ${message}`);
  }
}

// ── listKoralReviewSubjects — read model for the Advisor UI toggle ─────────
// Returns the two disjoint subject sets the UI must distinguish (this WP's
// own UI requirement: "must clearly distinguish 'interpreting a RECOGNIZED
// change' from 'confirming an eligible ambiguous CANDIDATE'"), plus this
// Assignment's own existing Review Cases.
//
// eligibleForConfirmation is filtered by isCurrentlyConfirmable() — canon-
// eligible AND KORA-WP-113-supported — never merely canon-eligible. This
// is what keeps the existing UI (unchanged, no redesign) from ever
// presenting a live confirmation action for a category that would be
// rejected (Founder remediation, Issue 1): the UI already only renders a
// "Conferma trasformazione" button for whatever is in this array.

export interface KoralReviewSubjects {
  recognizedForInterpretation: LivingKoralMaterialChangeRecord[];
  eligibleForConfirmation: LivingKoralMaterialChangeRecord[];
  reviewCases: OperationalCase[];
}

export async function listKoralReviewSubjects(assignmentId: string, callerAdvisorId: string): Promise<KoralReviewSubjects> {
  const db = getSupabaseServiceClient();
  const companyId = await assertActiveAssignmentAndGetCompanyId(db, assignmentId, callerAdvisorId);

  const all = await listMaterialChangesForTenant(companyId);
  const reviewCases = (await listAdvisorCases(assignmentId, callerAdvisorId))
    .filter((c) => c.linkedObjectType === 'material_change');

  return {
    recognizedForInterpretation: all.filter((m) => m.status === 'RECOGNIZED'),
    eligibleForConfirmation: all.filter((m) => m.status === 'CANDIDATE' && isCurrentlyConfirmable(m.category)),
    reviewCases,
  };
}

// ── interpretRecognizedChange — Review Mode A ────────────────────────────────
// Zero mutation to Material Change / Ledger / Edition. Writes ONLY
// Advisor interpretation content (KORA-WP-036, linked to this Material
// Change). No score/grade/pass-fail/certification/approval/rejection
// vocabulary exists anywhere in this module or its schema — see
// tests/unit/kora-wp-116-koral-review.test.ts's own structural assertion.
// Unaffected by the fail-closed Morphogenesis gate (Issue 1) — Mode A
// never recognizes anything; it interprets what is already RECOGNIZED.

export interface InterpretRecognizedChangeParams {
  assignmentId: string;
  callerAdvisorId: string;
  materialChangeId: string;
  interpretation: string;
  actorId: string;
}

export interface InterpretRecognizedChangeResult {
  case: OperationalCase;
  content: AdvisorContentRecord;
}

export async function interpretRecognizedChange(params: InterpretRecognizedChangeParams): Promise<InterpretRecognizedChangeResult> {
  const db = getSupabaseServiceClient();
  const companyId = await assertActiveAssignmentAndGetCompanyId(db, params.assignmentId, params.callerAdvisorId);

  const change = await getMaterialChangeCandidate(params.materialChangeId, companyId);
  if (!change) {
    throw new Error('[KORA] interpretRecognizedChange rejected: no such Material Change for this Company.');
  }
  if (change.status !== 'RECOGNIZED') {
    throw new Error('[KORA] interpretRecognizedChange rejected: KORAL Review interpretation (Mode A) applies only to a RECOGNIZED Material Change — this one is still CANDIDATE. Use the confirmation path (Mode B) if it is currently confirmable.');
  }

  const reviewCase = await createOrGetKoralReviewCase(params.assignmentId, params.callerAdvisorId, companyId, change, params.actorId);

  const content = await createAdvisorContent({
    assignmentId: params.assignmentId,
    class: 'ORGANISATION_SHAREABLE_NOTE',
    body: params.interpretation,
    linkedObjectType: 'material_change',
    linkedObjectId: change.id,
    callerAdvisorId: params.callerAdvisorId,
    actorId: params.actorId,
  });

  await recordGovernanceEvent({
    sourceModule: 'living-koral-review', actorRole: 'ADVISOR', actorId: params.actorId,
    eventType: 'koral_review.interpretation_added', objectType: 'living_koral_material_change', objectId: change.id,
    tenantId: companyId, payload: { caseId: reviewCase.id, contentId: content.id },
  });

  return { case: reviewCase, content };
}

export async function listReviewInterpretations(assignmentId: string, callerAdvisorId: string, materialChangeId: string): Promise<AdvisorContentRecord[]> {
  return listContentLinkedToMaterialChange(callerAdvisorId, assignmentId, materialChangeId);
}

// ── confirmAmbiguousCandidate — Review Mode B ────────────────────────────────
// The ONLY path by which a KORAL Review Advisor action may promote a
// Material Change to RECOGNIZED (Founder Adjudication #1: never a bare
// "approve KORAL" click). Ten-step sequence, numbered inline below,
// matching this WP's own task specification exactly.
//
// FAIL-CLOSED (Founder remediation, Issue 1): step 7 now checks
// isCurrentlyConfirmable() — canon-eligible AND KORA-WP-113-supported —
// BEFORE any Case creation or recognition attempt. A canon-eligible but
// currently-unsupported category (today: all four of them —
// Strengthening/Weakening/Reorientation/Stabilization have no live
// Morphogenesis Engine v1 operation mapping yet) is rejected outright: no
// state is touched, Mode B remains structurally implemented but fully
// DORMANT until KORA-WP-113 gains at least one such mapping. This
// eliminates the previously-possible "RECOGNIZED without a corresponding
// transformation" partial state entirely — it can no longer occur through
// this module.

export interface ConfirmAmbiguousCandidateParams {
  assignmentId: string;
  callerAdvisorId: string;
  materialChangeId: string;
  actorId: string;
}

export interface ConfirmAmbiguousCandidateResult {
  case: OperationalCase;
  materialChange: LivingKoralMaterialChangeRecord;
  /** false when reverifyAgainstSource found the candidate no longer eligible at write-time — it correctly stays CANDIDATE (KORA-WP-112's own no-reject/no-expire contract), not an error. */
  recognized: boolean;
}

export async function confirmAmbiguousCandidate(params: ConfirmAmbiguousCandidateParams): Promise<ConfirmAmbiguousCandidateResult> {
  const db = getSupabaseServiceClient();

  // Step 1 (authenticated Advisor identity) is the API route's own
  // responsibility (requireAdvisorUser + getAdvisorIdentityByAuthUserId) —
  // this service trusts callerAdvisorId as already session-authenticated,
  // identically to every other Advisor-portal service in this repository.

  // Step 2 — active Assignment verification.
  const companyId = await assertActiveAssignmentAndGetCompanyId(db, params.assignmentId, params.callerAdvisorId);

  // Steps 3-4 — current Material Change re-read (never a caller-cached copy).
  const change = await getMaterialChangeCandidate(params.materialChangeId, companyId);
  if (!change) {
    throw new Error('[KORA] confirmAmbiguousCandidate rejected: no such Material Change for this Company.');
  }

  // Step 6 — verify still CANDIDATE.
  if (change.status !== 'CANDIDATE') {
    throw new Error(`[KORA] confirmAmbiguousCandidate rejected: Material Change is "${change.status}", not CANDIDATE — nothing to confirm.`);
  }

  // Step 7 — verify the category is CURRENTLY confirmable: canon-eligible
  // (doc 129 Part 12) AND KORA-WP-113-supported (a live Morphogenesis
  // Engine v1 operation mapping exists). FAIL CLOSED otherwise — no state
  // is touched. This single check replaces the two separate, later
  // checks the pre-remediation implementation had (eligibility, then a
  // best-effort post-hoc transformation attempt) — see this function's
  // own header for why that shape was a defect.
  if (!isCurrentlyConfirmable(change.category)) {
    throw new Error(`[KORA] confirmAmbiguousCandidate rejected: category "${change.category}" is not currently confirmable — either it is self-evidencing/automatic-only (never Advisor-confirmable), or it is canon-eligible but KORA-WP-113 has no live Morphogenesis Engine v1 operation mapping for it yet. Advisor confirmation for this category is implemented but dormant until that support exists. No state was changed.`);
  }

  // Case/subject validation — ensure/reuse the wrapping Review Case.
  const reviewCase = await createOrGetKoralReviewCase(params.assignmentId, params.callerAdvisorId, companyId, change, params.actorId);

  // Step 5 + Step 8 — source object re-verification, then canonical
  // recognition via KORA-WP-112's own assessMaterialChangeCandidate()
  // (never duplicated here). "Source re-verification" at the generic
  // layer this WP owns means: re-fetch the real CANDIDATE row fresh
  // (never trust the read on lines above) and confirm the same facts
  // just checked, now evaluated as close as possible to the write itself.
  // No domain-specific adapter exists yet for any of the four eligible
  // categories to re-verify deeper against — inventing one here would be
  // exactly the "fabricate a fake ambiguous producer" this WP's own
  // Founder Adjudication #7 forbids.
  let recognizedRecord: LivingKoralMaterialChangeRecord;
  let wonRace = true;
  try {
    recognizedRecord = (await assessMaterialChangeCandidate({
      candidateId: change.id,
      tenantId: companyId,
      actorRole: 'ADVISOR',
      actorId: params.actorId,
      recognitionSource: 'advisor-confirmed',
      reverifyAgainstSource: async () => {
        const fresh = await getMaterialChangeCandidate(change.id, companyId);
        return !!fresh && fresh.status === 'CANDIDATE' && isCurrentlyConfirmable(fresh.category);
      },
    }))!;
  } catch (err) {
    // Inherited KORA-WP-112 concurrency behavior (not introduced by this
    // WP, not modified here): under two genuinely concurrent confirmation
    // attempts, the LOSER's own UPDATE ... WHERE status='CANDIDATE'
    // matches zero rows, and assessMaterialChangeCandidate() throws
    // rather than returning a typed outcome. This is NOT corrupted state
    // — the WHERE-clause compare-and-swap is exactly what prevents
    // duplicate recognition/duplicate transformation — but a raw throw is
    // a poor Advisor-facing result for a concurrent double-confirm. This
    // wrapper (only this wrapper — WP-112's own function is untouched)
    // re-reads and returns the winner's already-RECOGNIZED result
    // gracefully instead of propagating the race as an error. wonRace
    // stays false so steps 9/10 below (this caller's OWN domain
    // provenance event, and the WP-113 chaining attempt) are correctly
    // skipped — the ACTUAL winner's own call already performed both.
    const msg = err instanceof Error ? err.message : String(err);
    if (!/assessMaterialChangeCandidate failed/.test(msg)) throw err;
    const fresh = await getMaterialChangeCandidate(change.id, companyId);
    if (!fresh || fresh.status !== 'RECOGNIZED') throw err;
    recognizedRecord = fresh;
    wonRace = false;
  }

  if (recognizedRecord.status !== 'RECOGNIZED') {
    // reverifyAgainstSource found it no longer eligible/confirmable
    // between read and write — correctly stays CANDIDATE (no such state
    // as rejected/expired exists, per KORA-WP-112's own Founder decision).
    return { case: reviewCase, materialChange: recognizedRecord, recognized: false };
  }

  if (!wonRace) {
    // This caller lost the concurrent race (see catch block above) — the
    // actual winner's own call already recorded step 9's domain
    // provenance event and performed step 10's chaining. Recording either
    // again here would be a duplicate, not a second real confirmation.
    return { case: reviewCase, materialChange: recognizedRecord, recognized: true };
  }

  // Step 9 — Advisor-confirmed provenance. assessMaterialChangeCandidate()
  // already recorded a 'material_change.recognized' governance_event with
  // this Advisor's own actorRole/actorId; this second, domain-specific
  // event adds the KORAL Review Case reference for clean Review-domain
  // provenance (distinct eventType — not a duplicate record).
  await recordGovernanceEvent({
    sourceModule: 'living-koral-review', actorRole: 'ADVISOR', actorId: params.actorId,
    eventType: 'koral_review.candidate_confirmed', objectType: 'living_koral_material_change', objectId: recognizedRecord.id,
    tenantId: companyId, payload: { caseId: reviewCase.id, category: recognizedRecord.category },
  });

  // Step 10 — allow existing KORA-WP-113 machinery to consume the result.
  // Guaranteed to succeed here: step 7's own isCurrentlyConfirmable()
  // check already proved a live Morphogenesis Engine v1 operation mapping
  // exists for this exact category before recognition was even attempted
  // — this call is therefore never expected to throw for the "no mapping"
  // reason again. If it somehow does (a genuine bug, not an expected
  // dormancy condition), it is NOT swallowed — the Material Change is
  // already RECOGNIZED at this point (an unavoidable ordering: recognition
  // must precede its own transformation record, identically to
  // initiative-adapter.ts's own established chaining shape), and the
  // caller must see the real error rather than a silently-skipped chain.
  await recordLivingKoralTransformation({ materialChangeId: recognizedRecord.id, tenantId: companyId });

  return { case: reviewCase, materialChange: recognizedRecord, recognized: true };
}
