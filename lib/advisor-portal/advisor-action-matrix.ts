// lib/advisor-portal/advisor-action-matrix.ts
// KORA-WP-033 — Company Advisor Action-Matrix Surface + Portal Pilot Slice.
//
// Doc 73 (DD2 Advisor Canonical Operating Model) §6, verbatim rule: "the
// Advisor may VIEW, COMMENT, PROPOSE, DRAFT, EDIT-DRAFT, REQUEST-CHANGE and
// SUPPORT-REVIEW freely within assignment scope. The Advisor may never
// perform the object's own constitutive authority action." This module is
// the canonical, structural implementation of that one rule.
//
// STRUCTURALLY DENIED, NOT MERELY RUNTIME-DENIED (this WP's own Tests field:
// "the full action matrix, COMMIT/APPROVE/CONCLUDE structurally denied"):
// `CONSTITUTIVE_ACTIONS` has no code path anywhere in `canAdvisorPerformAction`
// that can ever return `true` for it — the check `if (CONSTITUTIVE_ACTIONS
// .includes(...)) return false` is unconditional, before any assignment/
// validity lookup even runs. No caller input, no future flag, no assignment
// state can flip this.
//
// NO DOMAIN OBJECT INVENTED: KORA-WP-020/021/022/024 (Commitment, Evidence
// Plan Lineage, Review) do not exist in this codebase yet — this module does
// not fabricate a Commitment/Evidence/Review table or endpoint merely to
// give the matrix "something to act on." It is a pure, DB-free authorization
// primitive over an assignment context; a future WP (020+) that builds those
// real objects will call `canAdvisorPerformAction()` before allowing an
// Advisor-initiated support action on them — this WP delivers the readiness,
// not the object.

// Doc 73 §6's own seven-verb list, verbatim, translated to a stable code
// vocabulary (no verb added, none dropped, none renamed).
export const ADVISOR_SUPPORT_ACTIONS = [
  'VIEW',
  'COMMENT',
  'PROPOSE',
  'DRAFT',
  'EDIT_DRAFT',
  'REQUEST_CHANGE',
  'SUPPORT_REVIEW',
] as const;
export type AdvisorSupportAction = (typeof ADVISOR_SUPPORT_ACTIONS)[number];

// The constitutive authority action of a DD-3 object — "Company decides,
// Advisor supports" (doc 73 §6's own reduction of the entire matrix to one
// rule). Named generically since the object's own constitutive verb differs
// per object (Commitment's is "COMMIT", a Review's is "CONCLUDE", a
// Certification-style approval's is "APPROVE") — WP-033's registry Tests
// field names exactly these three.
export const CONSTITUTIVE_ACTIONS = ['COMMIT', 'APPROVE', 'CONCLUDE'] as const;
export type ConstitutiveAction = (typeof CONSTITUTIVE_ACTIONS)[number];

export type AdvisorMatrixAction = AdvisorSupportAction | ConstitutiveAction;

export interface AdvisorActionAuthorizationContext {
  /** Whether the caller's session is genuinely an ADVISOR (resolved server-side, never client-asserted). */
  isAdvisorSession: boolean;
  /** Result of evaluateAdvisorAssignmentValidity() for the specific Assignment the action targets — never assumed true. */
  assignmentValid: boolean;
}

export interface AdvisorActionAuthorizationResult {
  allowed: boolean;
  reason: string;
}

function isSupportAction(action: AdvisorMatrixAction): action is AdvisorSupportAction {
  return (ADVISOR_SUPPORT_ACTIONS as readonly string[]).includes(action);
}

function isConstitutiveAction(action: AdvisorMatrixAction): action is ConstitutiveAction {
  return (CONSTITUTIVE_ACTIONS as readonly string[]).includes(action);
}

// The single canonical authorization function — every future Advisor-facing
// mutation (this WP's own message send included) must route its decision
// through this function, never re-derive the matrix locally.
export function canAdvisorPerformAction(
  action: AdvisorMatrixAction,
  context: AdvisorActionAuthorizationContext,
): AdvisorActionAuthorizationResult {
  // Unconditional, first check — no assignment/session data can ever change
  // this branch's outcome (structural denial, doc 73 §6).
  if (isConstitutiveAction(action)) {
    return { allowed: false, reason: 'constitutive_action_denied' };
  }

  if (!isSupportAction(action)) {
    return { allowed: false, reason: 'unknown_action' };
  }

  if (!context.isAdvisorSession) {
    return { allowed: false, reason: 'not_advisor_session' };
  }

  if (!context.assignmentValid) {
    return { allowed: false, reason: 'assignment_not_valid' };
  }

  return { allowed: true, reason: 'support_action_within_valid_assignment' };
}
