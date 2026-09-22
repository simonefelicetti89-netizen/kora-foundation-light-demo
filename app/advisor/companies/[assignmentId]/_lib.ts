// app/advisor/companies/[assignmentId]/_lib.ts
// KORA-WP-064 — shared types and labels for the per-Company Advisor context.
//
// Every shape here is transcribed unchanged from the pre-decomposition
// monolith (`app/advisor/companies/page.tsx` at KORA-WP-125 baseline): this
// package owns information architecture, not business semantics. No field was
// added, renamed or removed, and no label was invented — the canonical Italian
// Product terminology already established by KORA-WP-033/035/036/037/116 is
// reused verbatim so the decomposition changes navigation, never meaning.
//
// The route key is `assignmentId`, not `companyId`, because the Assignment IS
// the canonical authorization unit in this domain: every Advisor API is
// `/api/advisor/companies/[assignmentId]/…` and every service check is
// `callerAdvisorId` against that assignment. Keying the URL by company would
// require a new company→assignment translation the backend does not expose,
// which is exactly the kind of new semantics this package must not invent.

export interface AssignedCompany {
  assignmentId: string;
  companyId: string;
  companyName: string;
  role: 'Company Advisor' | 'Partner Advisor';
  valid: boolean;
  invalidReasons: string[];
}

export interface ContactMessage {
  id: string;
  senderRole: 'COMPANY_ADMIN' | 'ADVISOR';
  body: string;
  createdAt: string;
}

export interface Appointment {
  id: string;
  startsAt: string;
  endsAt: string;
  subject: string;
  status: 'requested' | 'confirmed' | 'completed' | 'rescheduled' | 'cancelled' | 'no-show';
  rescheduledFromId: string | null;
}

export type ContentClass =
  | 'ORGANISATION_SHAREABLE_NOTE'
  | 'ADVISOR_INTERNAL_NOTE'
  | 'CONFIDENTIAL_REFERENCE'
  | 'COMMUNICATION_FOLLOWUP';

export interface ContentRecord {
  id: string;
  class: ContentClass | 'AUDIT_PROVENANCE_RECORD';
  body: string;
  shared: boolean | null;
  purpose: string | null;
  createdAt: string;
}

export const CLASS_LABEL: Record<ContentClass, string> = {
  ORGANISATION_SHAREABLE_NOTE: 'Nota condivisibile con la Company',
  ADVISOR_INTERNAL_NOTE: 'Nota interna (mai visibile alla Company)',
  CONFIDENTIAL_REFERENCE: 'Riferimento riservato (per uno scopo specifico)',
  COMMUNICATION_FOLLOWUP: 'Verbale di comunicazione/chiamata',
};

export const STATUS_LABEL: Record<Appointment['status'], string> = {
  requested: 'Richiesto', confirmed: 'Confermato', completed: 'Concluso',
  rescheduled: 'Riprogrammato', cancelled: 'Annullato', 'no-show': 'Non presentato',
};

export type CaseStatus = 'open' | 'in-progress' | 'blocked' | 'resolved' | 'escalated';

export interface OperationalCaseItem {
  id: string;
  subject: string;
  status: CaseStatus;
  priority: string | null;
  resolutionNote: string | null;
  createdAt: string;
}

export const CASE_STATUS_LABEL: Record<CaseStatus, string> = {
  open: 'Aperto', 'in-progress': 'In corso', blocked: 'Bloccato', resolved: 'Risolto', escalated: 'Escalato',
};

// KORA-WP-037 — Advisor Review Assessment. Doc 76 §10's own exact fields only:
// no verdict/status enum exists here ("Assessment ≠ Review verdict" is
// structural). Conflict/recusal state is never serialized to the client.
export interface ReviewAdvisorAssessmentItem {
  id: string;
  reviewId: string;
  assessmentNarrative: string;
  qualificationStatusAtIssuance: string;
  issuedAt: string;
}

// KORA-WP-116 — KORAL Review. `category` is canon-derived and read-only: this
// UI never lets the Advisor pick or override it.
export interface MaterialChangeItem {
  id: string;
  category: string;
  status: 'CANDIDATE' | 'RECOGNIZED' | 'SUPERSEDED';
  occurredAt: string;
}

export interface KoralReviewSubjects {
  recognizedForInterpretation: MaterialChangeItem[];
  eligibleForConfirmation: MaterialChangeItem[];
}

/** The six canonical capability sections of one Company context, in working
 *  order. Labels are the Product's existing terminology, not new naming. */
export const COMPANY_SECTIONS = [
  { slug: '',             label: 'Panoramica' },
  { slug: 'messaggi',     label: 'Messaggi' },
  { slug: 'appuntamenti', label: 'Appuntamenti' },
  { slug: 'note',         label: 'Note e riferimenti' },
  { slug: 'case',         label: 'Case' },
  { slug: 'valutazioni',  label: 'Valutazioni Review' },
  { slug: 'koral-review', label: 'KORAL Review' },
] as const;

export function sectionHref(assignmentId: string, slug: string): string {
  return slug ? `/advisor/companies/${assignmentId}/${slug}` : `/advisor/companies/${assignmentId}`;
}

export const formatStamp = (iso: string): string => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString('it-IT', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

export const formatDay = (iso: string): string => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' });
};

/** Single source for "which Company am I acting for" — every per-Company route
 *  resolves it from the SAME assignment-scoped endpoint the monolith used, so
 *  an unassigned assignmentId simply does not appear and the route shows its
 *  not-found state. Access is never inferred from the route parameter. */
export async function fetchAssignment(assignmentId: string): Promise<AssignedCompany | null> {
  const r = await fetch('/api/advisor/companies', { credentials: 'include' });
  const d = await r.json();
  if (!d.ok) return null;
  const list: AssignedCompany[] = d.companies ?? [];
  return list.find((c) => c.assignmentId === assignmentId) ?? null;
}
