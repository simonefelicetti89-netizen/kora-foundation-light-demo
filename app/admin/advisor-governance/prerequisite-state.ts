// app/admin/advisor-governance/prerequisite-state.ts
// KORA-WP-039 — Advisor Academy Interface: prerequisite-eligibility display state.
//
// Pure presentation logic, deliberately separated from the page so it can be
// unit-tested without a DOM. It derives DISPLAY state only — it never decides
// assignment validity. That decision belongs to KORA-WP-031's
// evaluateAdvisorAssignmentValidity(), which reads the same underlying data
// and is untouched by this WP.
//
// WHY EXPIRY IS DERIVED, NOT STORED: migration 057 stores `status`
// (MET/NOT_MET) and `expiry_date` separately, and WP-031's own header records
// that validity is "dynamic, never stored". A prerequisite whose expiry_date
// has passed therefore still carries status = MET in the row; it is the
// *evaluation* that fails. This module mirrors that exactly: EXPIRED is a
// derived view over (status, expiry_date), never a fourth stored status, and
// deriving it here erases nothing — the row, its evidence reference and its
// verification history are all preserved and still rendered.

export type PrerequisiteStatus = 'MET' | 'NOT_MET';

export interface PrerequisiteEligibilityView {
  id: string;
  roleQualificationId: string;
  status: PrerequisiteStatus;
  sourceReference: string | null;
  effectiveDate: string | null;
  expiryDate: string | null;
  lastVerifiedAt: string | null;
  verifiedBy: string | null;
}

/** What the operator sees. ABSENT = no record has ever been entered.
 *
 *  These four states map one-to-one onto the canonical forward gate in
 *  evaluateAdvisorAssignmentValidity() (KORA-WP-031), which treats the
 *  prerequisite as present when `status === 'MET'` AND
 *  (`expiry_date` is null OR `expiry_date > now`). The canonical gate does
 *  NOT consider `effective_date`, so this module does not either — a display
 *  state the gate does not recognise would make the surface contradict the
 *  decision it describes. `effective_date` is still shown, as recorded data. */
export type PrerequisiteDisplayState = 'MET' | 'EXPIRED' | 'NOT_MET' | 'ABSENT';

export function derivePrerequisiteDisplayState(
  eligibility: PrerequisiteEligibilityView | null | undefined,
  now: Date = new Date(),
): PrerequisiteDisplayState {
  if (!eligibility) return 'ABSENT';
  if (eligibility.status !== 'MET') return 'NOT_MET';

  const expiry = parseDate(eligibility.expiryDate);
  if (expiry && expiry.getTime() <= now.getTime()) return 'EXPIRED';

  return 'MET';
}

/**
 * Whether the prerequisite half of the forward eligibility gate passes.
 * Mirrors evaluateAdvisorAssignmentValidity()'s prerequisite clause exactly,
 * for display purposes only — the authoritative decision stays in the service.
 */
export function prerequisitePassesForwardGate(
  eligibility: PrerequisiteEligibilityView | null | undefined,
  now: Date = new Date(),
): boolean {
  return derivePrerequisiteDisplayState(eligibility, now) === 'MET';
}

/** Presentation tone per state. Colour is never the only signal — every
 *  consumer pairs this with the label below and a shape/dot. */
export const PREREQUISITE_STATE_TONE: Record<PrerequisiteDisplayState, 'ok' | 'warn' | 'risk' | 'idle'> = {
  MET:     'ok',
  EXPIRED: 'risk',
  NOT_MET: 'warn',
  ABSENT:  'idle',
};

export const PREREQUISITE_STATE_LABEL: Record<PrerequisiteDisplayState, string> = {
  MET:     'Requisito soddisfatto',
  EXPIRED: 'Scaduto',
  NOT_MET: 'Requisito non soddisfatto',
  ABSENT:  'Mai registrato',
};

/** Italian short date, matching HANDOFF §21.4. Returns an em dash for absent
 *  values so a missing date never renders as an empty cell. */
export function formatDate(value: string | null | undefined): string {
  const d = parseDate(value);
  if (!d) return '—';
  return new Intl.DateTimeFormat('it-IT', { day: '2-digit', month: 'short', year: 'numeric' }).format(d);
}

export function formatDateTime(value: string | null | undefined): string {
  const d = parseDate(value);
  if (!d) return '—';
  return new Intl.DateTimeFormat('it-IT', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(d);
}

/** Days until expiry; negative when already expired; null when no expiry set. */
export function daysUntilExpiry(
  eligibility: PrerequisiteEligibilityView | null | undefined,
  now: Date = new Date(),
): number | null {
  const expiry = parseDate(eligibility?.expiryDate);
  if (!expiry) return null;
  return Math.ceil((expiry.getTime() - now.getTime()) / 86_400_000);
}

function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}
