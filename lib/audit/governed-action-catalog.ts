// lib/audit/governed-action-catalog.ts
// KORA-WP-006 — Governance Audit Log Extension.
//
// Extends the existing ADMIN-017 base ("Privacy & Audit") into the full
// governed-action catalogue named by doc 79 §17 ("Audit Catalogue"). This
// module does NOT create a third audit persistence system — it is the
// canonical, extended writer sitting ON TOP of the existing KORA-WP-005
// substrate (audit.governance_event), which doc 92 §9 ("Lock 9") already
// designates as the primitive Audit is built from ("the one lower-level
// primitive both Audit and Case consume... underlies ADMIN-017").
//
//   future governed action -> recordGovernedAction() -> recordGovernanceEvent()
//     -> audit.governance_event (immutable, KORA-WP-005)
//
// LEGACY audit.audit_log (migration 001, extended 028) is NOT touched, NOT
// migrated, NOT dual-written, NOT backfilled by this module — its ~25
// existing writers keep working exactly as they are. No cutover language
// exists anywhere in this WP's own canonical text (contrast KORA-WP-004's
// explicit "old role-check paths kept until cutover").
//
// GOVERNED-ACTION CATALOGUE — NOT INVENTED
// ─────────────────────────────────────────
// The 14 categories below are copied, one-to-one, from doc 79 §17's own
// semicolon-separated "Minimum auditable-action set" sentence — no 15th
// category was added, no two categories were collapsed into one, and no
// category was renamed into something doc 79 does not say. This catalogue
// is a DIFFERENT concept from KORA-WP-009's capability vocabulary
// (CAPABILITY_DOMAINS / CAPABILITY_ACTIONS, lib/admin-capability/
// capability-service.ts): that vocabulary answers "what may this internal
// operator do?" (authorization); this one answers "what governance event
// just happened?" (audit). Deliberately not reused as a substitute for each
// other — conflating them would blur a real conceptual distinction doc 79
// itself draws (§17's own "Audit ≠ Telemetry ≠ System Log").
//
// Several of these categories name workflows that do not exist in the
// codebase yet (Advisor Role Qualification = KORA-WP-032, Partner
// Certification = KORA-WP-054, Capability Validation = KORA-WP-055, Academy
// = KORA-WP-078, KORA Ready = KORA-WP-027, entitlement/finance = later WPs,
// conflict/recusal = KORA-WP-031/037, privacy access/elevation = requires
// KORA-WP-007's Case primitive). This module does not build any of those
// workflows — per this WP's own Acceptance text ("every governance action
// introduced by LATER WPs is traceable"), it only proves the catalogue and
// writer are ready for them to use, exactly as KORA-WP-005 proved its own
// substrate before any real consumer existed.

import { recordGovernanceEvent, type GovernanceEvent } from '@/lib/audit/governance-event';

export const GOVERNED_ACTION_CATEGORIES = [
  'ROLE_CHANGE',                          // "role changes"
  'MEMBERSHIP_CHANGE',                    // "membership changes"
  'ASSIGNMENT_CHANGE',                    // "Assignment changes"
  'ADVISOR_ROLE_QUALIFICATION_CHANGE',    // "Advisor Role Qualification create/approve/renew/expire/suspend/revoke"
  'PARTNER_CERTIFICATION_CHANGE',         // "Partner Certification grant/renew/suspend/revoke"
  'CAPABILITY_VALIDATION_CHANGE',         // "Capability Validation grant/renew/suspend/revoke"
  'SUSPENSION_REVOCATION',                // "suspension/revocation generally"
  'POLICY_CONFIG_CHANGE',                 // "policy/config changes (§16)"
  'PRIVACY_ACCESS_ELEVATION',             // "privacy access/elevation (§12)"
  'CONFLICT_RECUSAL',                     // "conflict/recusal (§10)"
  'ACADEMY_EQUIVALENCY_OVERRIDE',         // "Academy equivalency/override"
  'KORA_READY_OVERRIDE',                  // "KORA Ready override (§5)"
  'ENTITLEMENT_CHANGE',                   // "entitlement changes"
  'FINANCE_OPERATIONAL_OVERRIDE',         // "finance operational overrides"
] as const;

export type GovernedActionCategory = (typeof GOVERNED_ACTION_CATEGORIES)[number];

function isGovernedActionCategory(value: string): value is GovernedActionCategory {
  return (GOVERNED_ACTION_CATEGORIES as readonly string[]).includes(value);
}

export interface RecordGovernedActionParams {
  category: GovernedActionCategory;
  /** Who caused this — explicit, never inferred, matches recordGovernanceEvent()'s own discipline. */
  actorRole: string;
  actorId: string;
  /** Optional generic domain reference — what this governed action is about, if anything. */
  objectType?: string;
  objectId?: string;
  /** Optional tenant context — never mandatory; most governed-action categories (e.g. Partner
   * Certification, Academy, KORA Ready override) are not Company-tenant-scoped at all. */
  tenantId?: string;
  /**
   * Optional structured context — e.g. { verb: 'grant' } to distinguish which of a category's
   * several named sub-actions (doc 79 §17 groups several verbs under one category, such as
   * "grant/renew/suspend/revoke") occurred. This module does not define or constrain a verb
   * enum — inventing one would be a second parallel taxonomy beyond what doc 79 §17 requires;
   * callers may record whatever detail their own domain needs in payload.
   */
  payload?: Record<string, unknown>;
}

// ── recordGovernedAction — the canonical, extended audit-write helper ───────
//
// Rejects any category not in GOVERNED_ACTION_CATEGORIES — the restriction
// lives here, at this WP-006 layer, never on audit.governance_event itself
// (KORA-WP-005 deliberately left event_type unconstrained at the database
// level, "this substrate never validates/constrains a taxonomy" — extending
// that CHECK would retroactively narrow a substrate KORA-WP-007/008/013 also
// depend on remaining generic).

export async function recordGovernedAction(params: RecordGovernedActionParams): Promise<GovernanceEvent> {
  if (!isGovernedActionCategory(params.category)) {
    throw new Error(
      `[KORA] recordGovernedAction rejected: "${params.category}" is not a canonical governed-action category ` +
        `(doc 79 §17). Valid categories: ${GOVERNED_ACTION_CATEGORIES.join(', ')}.`,
    );
  }

  return recordGovernanceEvent({
    sourceModule: 'governance-audit',
    actorRole: params.actorRole,
    actorId: params.actorId,
    eventType: `governed_action.${params.category.toLowerCase()}`,
    objectType: params.objectType,
    objectId: params.objectId,
    tenantId: params.tenantId,
    payload: params.payload,
  });
}
