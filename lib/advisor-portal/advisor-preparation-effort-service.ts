// lib/advisor-portal/advisor-preparation-effort-service.ts
// KORA-WP-038 — Advisor Preparation-Support Workload Hook.
//
// Registry 142, verbatim: "Purpose: connect Advisor prep activity to
// `ADMIN-020`... Proposed New: effort-capture call at Advisor-prep
// touchpoints... Service/API: hook only... Data/Migration Impact: NONE —
// uses `008`'s table... Auth/RLS: inherited." This file is exactly that
// hook — a single, tightly-scoped function, no new table, no new route, no
// new UI. Full capacity-model/reporting use of this data is explicitly Out
// of Scope here — that is `KORA-WP-075` ("full closure of `038`'s hook").
//
// WHY THIS SHAPE (WP-033's own registry, verbatim): "ADMIN-020/Econ-
// Evidence: feeds `KORA-WP-038`" — the Advisor "prep touchpoint" this hook
// serves is WP-033's own draft/support work over the Decision Spine
// (Commitment / Evidence Plan Lineage / Review — doc 73 §6's VIEW/COMMENT/
// PROPOSE/DRAFT/EDIT-DRAFT/REQUEST-CHANGE/SUPPORT-REVIEW actions), never
// Appointment/Call scheduling — WP-033's own text is explicit: "This
// package does NOT claim Calendar/Call booking exists... exclusively
// `KORA-WP-035`." This hook is deliberately generic over WHICH object the
// prep work concerned (object_type/object_id below, both optional, mirrors
// gov.workload_event's own nullable design) rather than importing
// lib/advisor-portal/advisor-decision-support-service.ts's Commitment/
// Evidence/Review-specific functions — avoiding a hard dependency on any
// one drafted object type for what is, canonically, a general "Advisor
// spent time preparing" fact.
//
// REUSE, NOT DUPLICATION:
//   - Authorization/scoping: `getAdvisorAssignmentById` +
//     `evaluateAdvisorAssignmentValidity` (KORA-WP-031, both already
//     exported/canonical) — the identical two-check shape (caller owns the
//     Assignment; the Assignment is currently valid) already used by every
//     function in advisor-decision-support-service.ts's own private gate.
//     tenantId is ALWAYS the resolved assignment's own companyId — never a
//     caller-supplied value — matching that module's own "no function
//     accepts a tenantId/companyId parameter from the caller" discipline
//     exactly, and structurally enforcing Company scoping (no effort entry
//     can cross a Company boundary the caller does not hold a valid
//     Assignment for).
//   - Persistence: `captureEffort` (KORA-WP-008) writing to the EXISTING
//     `gov.workload_event` table, locked to the ALREADY-CANONICAL
//     `advisor_preparation` activity category (migration 063's own ten-item
//     vocabulary — no new category, no new enum value, no second effort
//     ledger, no second workload model).
//
// ASSIGNMENT-ACTIVE REQUIRED FOR NEW EFFORT, HISTORY UNAFFECTED: once an
// Assignment ends, `evaluateAdvisorAssignmentValidity` returns
// `valid: false` and this function rejects any NEW capture attempt for it —
// "Advisor operational access ends with Assignment" (this WP's own
// authorization boundary). Effort rows already captured while the
// Assignment was active remain untouched — `gov.workload_event` is
// append-only (migration 063) — so Company historical record is preserved
// exactly as required, without this file ever needing to read or mutate a
// prior row.
//
// NOT the KORA_ADMIN path: `advisor_preparation` names ADVISOR prep work
// specifically (doc 92 §10's ten-item vocabulary also includes the
// separate `admin_governance_activity` category for KORA_ADMIN's own
// activity) — this hook only ever resolves a real Advisor Assignment, so a
// KORA_ADMIN caller structurally cannot use it to record effort under this
// category, by construction, not by an extra role check.
//
// NO billing/payable, governance-verdict, observability, or quality-
// scoring meaning attaches here — this is the same operational-only
// substrate KORA-WP-008 already established (see that module's own
// header); this hook adds no new semantics on top of it.

import {
  evaluateAdvisorAssignmentValidity,
  getAdvisorAssignmentById,
} from '@/lib/advisor-assignment/advisor-assignment-service';
import { captureEffort, type WorkloadEvent } from '@/lib/operations/effort-capture-service';

const ADVISOR_ACTOR_ROLE = 'ADVISOR';

export interface CaptureAdvisorPreparationEffortParams {
  assignmentId: string;
  callerAdvisorId: string;
  effortMinutes: number;
  // Optional link to whatever the prep work concerned (e.g. a Commitment or
  // Evidence Plan id) — generic on purpose, mirroring
  // gov.workload_event's own nullable object_type/object_id shape. Neither
  // this function nor captureEffort() itself validates that the referenced
  // object exists — that is each caller's own concern, exactly as every
  // other consumer of captureEffort() already works.
  objectType?: string;
  objectId?: string;
}

// ── captureAdvisorPreparationEffort — the WP-038 hook ───────────────────────
//
// The one function this WP exists to deliver. Resolves and validates the
// caller's Assignment first (the "hook" is the enforcement + category-lock,
// not new persistence), then delegates the actual write to WP-008's own
// captureEffort() unchanged.

export async function captureAdvisorPreparationEffort(
  params: CaptureAdvisorPreparationEffortParams,
): Promise<WorkloadEvent> {
  const assignment = await getAdvisorAssignmentById(params.assignmentId);
  if (!assignment || assignment.advisorId !== params.callerAdvisorId) {
    throw new Error(
      '[KORA] captureAdvisorPreparationEffort rejected: caller is not the Advisor party to this Assignment.',
    );
  }

  const validity = await evaluateAdvisorAssignmentValidity(params.assignmentId);
  if (!validity.valid) {
    throw new Error(
      `[KORA] captureAdvisorPreparationEffort rejected: Assignment is not currently valid (${validity.reasons.join(', ')}).`,
    );
  }

  return captureEffort({
    activityCategory: 'advisor_preparation',
    actorRole: ADVISOR_ACTOR_ROLE,
    actorId: params.callerAdvisorId,
    effortMinutes: params.effortMinutes,
    tenantId: assignment.companyId,
    objectType: params.objectType,
    objectId: params.objectId,
  });
}
