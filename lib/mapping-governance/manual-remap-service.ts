// lib/mapping-governance/manual-remap-service.ts
// KORA-WP-029 — Assisted Mapping Maintenance + Manual Remap Governance.
//
// Registry 142, verbatim: "Purpose: existing BCM classifier maintained;
// manual remap is explicit, Case-tracked, MANUAL GOVERNED... Proposed New:
// manual-remap Case-routing hook... Service/API: existing classifier,
// Case-hook added... Data/Migration Impact: NONE... Acceptance: a manual
// remap is fully Case-tracked and audited, provenance preserved, baseline
// truth never corrupted." This file is exactly that hook — no new table,
// no new classification logic, no second Case framework.
//
// CLASSIFIER PRESERVATION (`COMPANY-010`, doc 64, "KEEP"): the rule-based
// BCM classifier — services/mapping-confidence/MappingConfidenceService.ts
// (doc 19) — is never imported, called, forked, or reinterpreted here. A
// manual remap is a GOVERNANCE ANNOTATION recorded alongside a classifier
// suggestion, never a mutation of the classifier itself. The classifier's
// suggestion for a given column/source is computed fresh, at
// upload-preview time, by its own existing caller
// (app/api/admin/data-intake/upload-preview/route.ts) — it is not
// persisted anywhere today, so there is no stored "classification result"
// row to remap; this hook records the classifier's suggestion and the
// proposed/final manual value as part of the governance record itself
// (the Case's own `subject`/`resolutionNote`), never a parallel mapping
// table.
//
// REUSE, NOT DUPLICATION — two existing, unmodified primitives:
//   - Governance: `createOperationalCase` / `transitionOperationalCaseStatus`
//     (KORA-WP-007) — the single shared Case primitive. `linkedObjectType`
//     is deliberately left unset (its closed enum — commitment/program/
//     review/certification/capability_validation — has no "mapping"
//     member, and widening it would require a migration WP-029's own
//     registry explicitly rules out: "Data/Migration Impact: NONE"); the
//     classifier suggestion, proposed value, and reason are instead
//     recorded as descriptive text in the Case's own `subject` field
//     (opening) and `resolutionNote` field (closing) — exactly what those
//     free-text fields exist for, with zero schema change. Every Case
//     creation and status transition already emits its own
//     `audit.governance_event` (KORA-WP-006) internally — this file never
//     calls `recordGovernanceEvent` itself, avoiding a duplicate audit
//     entry for the same action.
//   - Effort: `captureEffort` (KORA-WP-008), locked to the pre-existing
//     `data_quality_exception` activity category (doc 92 §10's own
//     ten-item vocabulary — a manual remap correction during data intake
//     is exactly that) — matching registry 142's own field, verbatim:
//     "ADMIN-020/Econ-Evidence: remap effort feeds `KORA-WP-008`."
//
// AUTHORITY — "Admin-mediated" (registry 142, verbatim): both functions
// below only ever call the shared Case primitive with
// `callerRole: 'KORA_ADMIN'` — classification governance is KORA-owned,
// never a Company or Advisor write path. `organisationType: 'company'`
// ties the Case to the specific Company whose data is being remapped
// ("Company-scoped"), with `createOperationalCase`'s own existing
// `assertOrganisationExists` check (unmodified) verifying the Company is
// real — no new tenant-integrity logic was added here.
//
// PRIVACY: only a caller-supplied opaque `sourceReference` string (e.g. a
// batch/column identifier), the classifier's pillar/event-type/confidence,
// and a free-text reason are ever recorded — never raw row/sample values,
// never Worker/PIB data. The caller remains responsible for keeping
// `sourceReference` non-sensitive, exactly as the existing upload-preview
// PII-scan boundary already requires upstream of this hook.
//
// TAXONOMY: `PillarCode` is imported unchanged from `@/lib/types`
// (KORA-WP-120's own canonical taxonomy) — no second Pillar/event-type
// enum exists here.
//
// OUT OF SCOPE (registry 142, verbatim: "Out of Scope: Saved Mappings
// (`KORA-WP-066`)"): no reusable/saved-mapping storage, no cross-Company
// template, no recommendation/learning engine — a remap here is a single,
// one-off governance record, never persisted as a reusable rule.

import type { PillarCode } from '@/lib/types';
import {
  createOperationalCase,
  transitionOperationalCaseStatus,
  type OperationalCase,
} from '@/lib/operations/operational-case-service';
import { captureEffort } from '@/lib/operations/effort-capture-service';

const REMAP_CALLER_ROLE = 'KORA_ADMIN';
const REMAP_EFFORT_CATEGORY = 'data_quality_exception';

// gov.operational_case's own `operational_case_subject_check` CHECK
// constraint (migration 060) caps `subject` at 200 characters — real-DB
// validation, not this file's own guess. Truncated safely (with a visible
// ellipsis) rather than rejected: the caller's own `reason` value is never
// discarded, only the persisted Case subject's display length is capped,
// preserving the source reference and classifier/proposed values (the
// decision-critical lead-in) ahead of the free-text reason.
const MAX_CASE_SUBJECT_LENGTH = 200;

function buildRemapSubject(params: RequestManualRemapParams): string {
  const full =
    `Manual remap — ${params.sourceReference}: classifier suggested ` +
    `${params.classifierPillar}/${params.classifierEventType} (confidence ${params.classifierConfidence.toFixed(2)}) — ` +
    `proposed ${params.proposedPillar}/${params.proposedEventType}. Reason: ${params.reason.trim()}`;
  if (full.length <= MAX_CASE_SUBJECT_LENGTH) return full;
  return `${full.slice(0, MAX_CASE_SUBJECT_LENGTH - 1)}…`;
}

// ── requestManualRemap — opens the governance record ────────────────────────
//
// Records the classifier's own suggestion and the proposed manual value
// together, immutably, as the Case's `subject` (never edited after
// creation by any function in operational-case-service.ts) — this is the
// "original classification provenance" the Acceptance criterion requires,
// with zero new column.

export interface RequestManualRemapParams {
  companyId: string;
  // Caller-supplied, opaque reference to what is being remapped (e.g. a
  // batch id + column header) — never raw row content.
  sourceReference: string;
  classifierPillar: PillarCode;
  classifierEventType: string;
  classifierConfidence: number;
  proposedPillar: PillarCode;
  proposedEventType: string;
  reason: string;
  actorId: string;
}

export async function requestManualRemap(
  params: RequestManualRemapParams,
): Promise<OperationalCase> {
  if (!params.reason || !params.reason.trim()) {
    throw new Error('[KORA] requestManualRemap rejected: reason is required for a manual remap.');
  }
  if (!params.sourceReference || !params.sourceReference.trim()) {
    throw new Error('[KORA] requestManualRemap rejected: sourceReference is required.');
  }

  const subject = buildRemapSubject(params);

  return createOperationalCase({
    organisationType: 'company',
    organisationId: params.companyId,
    subject,
    callerRole: REMAP_CALLER_ROLE,
    actorId: params.actorId,
  });
}

// ── resolveManualRemap — concludes the governance record ───────────────────
//
// Advances the Case to 'resolved' (transiting through 'in-progress' first
// when still 'open' — both are pre-existing, valid edges of
// CASE_ALLOWED_TRANSITIONS, never a new state machine), records the final
// applied mapping as `resolutionNote`, and captures the real effort spent
// via the existing WP-008 substrate. An already-`resolved` Case correctly
// fails here (no valid transition out of `resolved`) — a remap cannot be
// resolved twice, with no bespoke check needed beyond the existing
// transition-graph enforcement.

export interface ResolveManualRemapParams {
  caseId: string;
  finalPillar: PillarCode;
  finalEventType: string;
  effortMinutes: number;
  actorId: string;
}

export async function resolveManualRemap(
  params: ResolveManualRemapParams,
): Promise<OperationalCase> {
  const inProgress = await transitionOperationalCaseStatus({
    caseId: params.caseId,
    newStatus: 'in-progress',
    callerRole: REMAP_CALLER_ROLE,
    actorId: params.actorId,
  });

  const resolutionNote = `Remap applied: ${params.finalPillar}/${params.finalEventType}`;

  const resolved = await transitionOperationalCaseStatus({
    caseId: params.caseId,
    newStatus: 'resolved',
    resolutionNote,
    callerRole: REMAP_CALLER_ROLE,
    actorId: params.actorId,
  });

  await captureEffort({
    activityCategory: REMAP_EFFORT_CATEGORY,
    actorRole: REMAP_CALLER_ROLE,
    actorId: params.actorId,
    effortMinutes: params.effortMinutes,
    tenantId: inProgress.organisationId ?? undefined,
    objectType: 'operational_case',
    objectId: resolved.id,
  });

  return resolved;
}
