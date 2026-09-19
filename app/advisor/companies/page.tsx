'use client';

// app/advisor/companies/page.tsx
// KORA-WP-033 — Company Advisor Action-Matrix Surface + Portal Pilot Slice.
// KORA-WP-035 — Advisor Calendar & Call/Appointment Lineage (appointments
// toggle added alongside the existing messages toggle — no navigation
// redesign, per this WP's own Step 33 discipline).
// KORA-WP-036 — Advisor Document/Note Five-Class Taxonomy (content toggle
// added — the Advisor may create the four Advisor-authored classes; the
// governance-authored Class 3 audit/provenance record has no UI in this
// pilot slice, KORA_ADMIN/service-only, per this WP's own Out of Scope).
// KORA-WP-116 — KORAL Review (Review toggle added — reuses the existing
// KORA-WP-007 Case primitive and KORA-WP-036 content taxonomy; no new
// route, no new dashboard, no Company picker. Two distinct actions, never
// merged into one generic "Approve" button: "Aggiungi interpretazione"
// (Review Mode A — interpret an already-RECOGNIZED transformation, zero
// mutation) and "Conferma trasformazione" (Review Mode B — confirm an
// eligible, still-ambiguous CANDIDATE; the only Advisor action that can
// ever promote one to RECOGNIZED). No score/grade/pass-fail/certification/
// approval/rejection language anywhere in this toggle's own copy.
// KORA-WP-034 — Advisor Tasks & Cases (Case toggle added — reuses the
// shared KORA-WP-007 Operational Case primitive; "Tasks" in the WP title
// names no separate persisted entity — see
// lib/advisor-portal/advisor-case-service.ts's own header). Only the two
// canonical actions named by this WP's own Acceptance ("creates/resolves")
// are exposed: "Avvia" (open -> in-progress, the necessary bridge — the
// canonical graph does not allow open -> resolved directly) and "Risolvi"
// (in-progress -> resolved, terminal). "Blocca"/"Escalation" remain
// service-supported (WP-007's own transition graph) but are intentionally
// not exposed in this UI slice, per this WP's own "expose only exact
// canonical Advisor actions" discipline.
//
// The Advisor's own "app/advisor Company surface" (file 102's own Proposed
// New field): the list of Companies the Advisor is currently assigned to
// (Assignment Role Context, KORA-WP-031), each with the same minimal
// non-calendar contact/message surface as the Company side, the ability to
// confirm/reschedule/cancel an appointment, notes/references classified
// per doc 73 §14's five-class taxonomy, and now its own Cases. No
// document/file upload — storage-provider selection (Out of Scope).

import { useEffect, useState } from 'react';
import { TOKENS, BADGE_TOKENS } from '@/lib/design/kora-design-tokens';

interface AssignedCompany {
  assignmentId: string;
  companyId: string;
  companyName: string;
  role: 'Company Advisor' | 'Partner Advisor';
  valid: boolean;
  invalidReasons: string[];
}

interface ContactMessage {
  id: string;
  senderRole: 'COMPANY_ADMIN' | 'ADVISOR';
  body: string;
  createdAt: string;
}

interface Appointment {
  id: string;
  startsAt: string;
  endsAt: string;
  subject: string;
  status: 'requested' | 'confirmed' | 'completed' | 'rescheduled' | 'cancelled' | 'no-show';
  rescheduledFromId: string | null;
}

type ContentClass = 'ORGANISATION_SHAREABLE_NOTE' | 'ADVISOR_INTERNAL_NOTE' | 'CONFIDENTIAL_REFERENCE' | 'COMMUNICATION_FOLLOWUP';

interface ContentRecord {
  id: string;
  class: ContentClass | 'AUDIT_PROVENANCE_RECORD';
  body: string;
  shared: boolean | null;
  purpose: string | null;
  createdAt: string;
}

const CLASS_LABEL: Record<ContentClass, string> = {
  ORGANISATION_SHAREABLE_NOTE: 'Nota condivisibile con la Company',
  ADVISOR_INTERNAL_NOTE: 'Nota interna (mai visibile alla Company)',
  CONFIDENTIAL_REFERENCE: 'Riferimento riservato (per uno scopo specifico)',
  COMMUNICATION_FOLLOWUP: 'Verbale di comunicazione/chiamata',
};

const STATUS_LABEL: Record<Appointment['status'], string> = {
  requested: 'Richiesto', confirmed: 'Confermato', completed: 'Concluso',
  rescheduled: 'Riprogrammato', cancelled: 'Annullato', 'no-show': 'Non presentato',
};

type CaseStatus = 'open' | 'in-progress' | 'blocked' | 'resolved' | 'escalated';

interface OperationalCaseItem {
  id: string;
  subject: string;
  status: CaseStatus;
  priority: string | null;
  resolutionNote: string | null;
  createdAt: string;
}

const CASE_STATUS_LABEL: Record<CaseStatus, string> = {
  open: 'Aperto', 'in-progress': 'In corso', blocked: 'Bloccato', resolved: 'Risolto', escalated: 'Escalato',
};

// KORA-WP-037 — Advisor Review Assessment Issuance. Doc 76 §10's own exact
// fields only — no verdict/status field exists here (a recommendation, if
// any, lives inside the narrative itself, never a second verdict enum;
// "Assessment ≠ Review verdict" is structural, not merely a UI label
// choice). No Review browser is built — the Advisor enters the Review ID
// they are assessing directly, since no canonical Review-listing UI exists
// anywhere yet (a separate, still-unbuilt gap this WP does not own).
// Conflict/recusal state is internal eligibility/governance metadata
// (KORA-WP-010's own harness convention, extended by this WP) — never
// serialized to a client response, exactly like auth_user_id and
// prerequisiteEligibility are already withheld from every other Advisor
// object this portal page renders. Only qualification status (informative
// to the Advisor about their own issuance context) is exposed.
interface ReviewAdvisorAssessmentItem {
  id: string;
  reviewId: string;
  assessmentNarrative: string;
  qualificationStatusAtIssuance: string;
  issuedAt: string;
}

// KORA-WP-116 — KORAL Review. category is one of KORA-WP-111's own seven
// taxonomy categories (lib/living-koral-config/v1.ts); this UI never lets
// the Advisor pick or override it — it is read-only, canon-derived.
interface MaterialChangeItem {
  id: string;
  category: string;
  status: 'CANDIDATE' | 'RECOGNIZED' | 'SUPERSEDED';
  occurredAt: string;
}

interface KoralReviewSubjects {
  recognizedForInterpretation: MaterialChangeItem[];
  eligibleForConfirmation: MaterialChangeItem[];
}

export default function AdvisorCompaniesPage() {
  const [companies, setCompanies] = useState<AssignedCompany[]>([]);
  const [state, setState] = useState<'loading' | 'loaded' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [expandedAppointments, setExpandedAppointments] = useState<string | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [expandedContent, setExpandedContent] = useState<string | null>(null);
  const [content, setContent] = useState<ContentRecord[]>([]);
  const [newClass, setNewClass] = useState<ContentClass>('ORGANISATION_SHAREABLE_NOTE');
  const [newBody, setNewBody] = useState('');
  const [newShared, setNewShared] = useState(false);
  const [newPurpose, setNewPurpose] = useState('');
  const [savingContent, setSavingContent] = useState(false);
  const [expandedCases, setExpandedCases] = useState<string | null>(null);
  const [cases, setCases] = useState<OperationalCaseItem[]>([]);
  const [newCaseSubject, setNewCaseSubject] = useState('');
  const [savingCase, setSavingCase] = useState(false);

  const [expandedAssessments, setExpandedAssessments] = useState<string | null>(null);
  const [assessmentReviewId, setAssessmentReviewId] = useState('');
  const [assessments, setAssessments] = useState<ReviewAdvisorAssessmentItem[]>([]);
  const [loadingAssessments, setLoadingAssessments] = useState(false);
  const [newAssessmentNarrative, setNewAssessmentNarrative] = useState('');
  const [savingAssessment, setSavingAssessment] = useState(false);
  const [assessmentError, setAssessmentError] = useState('');

  const [expandedReview, setExpandedReview] = useState<string | null>(null);
  const [reviewSubjects, setReviewSubjects] = useState<KoralReviewSubjects>({ recognizedForInterpretation: [], eligibleForConfirmation: [] });
  const [selectedReviewTargetId, setSelectedReviewTargetId] = useState('');
  const [newInterpretation, setNewInterpretation] = useState('');
  const [savingReview, setSavingReview] = useState(false);
  const [reviewError, setReviewError] = useState('');

  async function load() {
    try {
      const r = await fetch('/api/advisor/companies', { credentials: 'include' });
      const d = await r.json();
      if (d.ok) {
        setCompanies(d.companies ?? []);
        setState('loaded');
      } else {
        setErrorMsg(d.error ?? 'Errore nel caricamento.');
        setState('error');
      }
    } catch {
      setErrorMsg('Errore di rete.');
      setState('error');
    }
  }

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/set-state-in-effect

  async function openThread(assignmentId: string) {
    if (expanded === assignmentId) {
      setExpanded(null);
      return;
    }
    setExpanded(assignmentId);
    try {
      const r = await fetch(`/api/advisor/companies/${assignmentId}/messages`, { credentials: 'include' });
      const d = await r.json();
      setMessages(d.ok ? (d.messages ?? []) : []);
    } catch {
      setMessages([]);
    }
  }

  async function send(assignmentId: string) {
    if (!draft.trim()) return;
    setSending(true);
    try {
      const r = await fetch(`/api/advisor/companies/${assignmentId}/messages`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: draft }),
      });
      const d = await r.json();
      if (d.ok) {
        setDraft('');
        await openThreadRefresh(assignmentId);
      } else {
        window.alert(d.error ?? 'Invio non riuscito.');
      }
    } catch {
      window.alert('Errore di rete durante l’invio.');
    } finally {
      setSending(false);
    }
  }

  async function openThreadRefresh(assignmentId: string) {
    try {
      const r = await fetch(`/api/advisor/companies/${assignmentId}/messages`, { credentials: 'include' });
      const d = await r.json();
      setMessages(d.ok ? (d.messages ?? []) : []);
    } catch {
      setMessages([]);
    }
  }

  async function loadAppointments(assignmentId: string) {
    try {
      const r = await fetch(`/api/advisor/companies/${assignmentId}/appointments`, { credentials: 'include' });
      const d = await r.json();
      setAppointments(d.ok ? (d.appointments ?? []) : []);
    } catch {
      setAppointments([]);
    }
  }

  async function toggleAppointments(assignmentId: string) {
    if (expandedAppointments === assignmentId) {
      setExpandedAppointments(null);
      return;
    }
    setExpandedAppointments(assignmentId);
    await loadAppointments(assignmentId);
  }

  async function appointmentAction(assignmentId: string, appointmentId: string, action: 'confirm' | 'cancel' | 'reschedule') {
    let body: Record<string, string> = { action };
    if (action === 'cancel') {
      const reason = window.prompt('Motivo dell’annullamento:');
      if (!reason?.trim()) return;
      body = { ...body, reason };
    }
    if (action === 'reschedule') {
      const reason = window.prompt('Motivo della riprogrammazione:');
      if (!reason?.trim()) return;
      const startsAt = window.prompt('Nuova data/ora di inizio (es. 2026-10-01T10:00):');
      if (!startsAt) return;
      const endsAt = window.prompt('Nuova data/ora di fine (es. 2026-10-01T11:00):');
      if (!endsAt) return;
      body = { ...body, reason, startsAt: new Date(startsAt).toISOString(), endsAt: new Date(endsAt).toISOString() };
    }
    try {
      const r = await fetch(`/api/advisor/companies/${assignmentId}/appointments/${appointmentId}`, {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      const d = await r.json();
      if (d.ok) await loadAppointments(assignmentId); else window.alert(d.error ?? 'Operazione non riuscita.');
    } catch {
      window.alert('Errore di rete.');
    }
  }

  async function loadContent(assignmentId: string) {
    try {
      const r = await fetch(`/api/advisor/companies/${assignmentId}/content`, { credentials: 'include' });
      const d = await r.json();
      setContent(d.ok ? (d.content ?? []) : []);
    } catch {
      setContent([]);
    }
  }

  async function toggleContent(assignmentId: string) {
    if (expandedContent === assignmentId) {
      setExpandedContent(null);
      return;
    }
    setExpandedContent(assignmentId);
    await loadContent(assignmentId);
  }

  async function saveContent(assignmentId: string) {
    if (!newBody.trim()) return;
    if (newClass === 'CONFIDENTIAL_REFERENCE' && !newPurpose.trim()) {
      window.alert('Lo scopo è obbligatorio per un riferimento riservato.');
      return;
    }
    setSavingContent(true);
    try {
      const body: Record<string, unknown> = { class: newClass, body: newBody };
      if (newClass === 'COMMUNICATION_FOLLOWUP') body.shared = newShared;
      if (newClass === 'CONFIDENTIAL_REFERENCE') body.purpose = newPurpose;
      const r = await fetch(`/api/advisor/companies/${assignmentId}/content`, {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      const d = await r.json();
      if (d.ok) {
        setNewBody(''); setNewPurpose(''); setNewShared(false);
        await loadContent(assignmentId);
      } else {
        window.alert(d.error ?? 'Salvataggio non riuscito.');
      }
    } catch {
      window.alert('Errore di rete.');
    } finally {
      setSavingContent(false);
    }
  }

  async function loadCases(assignmentId: string) {
    try {
      const r = await fetch(`/api/advisor/companies/${assignmentId}/cases`, { credentials: 'include' });
      const d = await r.json();
      setCases(d.ok ? (d.cases ?? []) : []);
    } catch {
      setCases([]);
    }
  }

  async function toggleCases(assignmentId: string) {
    if (expandedCases === assignmentId) {
      setExpandedCases(null);
      return;
    }
    setExpandedCases(assignmentId);
    await loadCases(assignmentId);
  }

  async function saveCase(assignmentId: string) {
    if (!newCaseSubject.trim()) return;
    setSavingCase(true);
    try {
      const r = await fetch(`/api/advisor/companies/${assignmentId}/cases`, {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ subject: newCaseSubject }),
      });
      const d = await r.json();
      if (d.ok) {
        setNewCaseSubject('');
        await loadCases(assignmentId);
      } else {
        window.alert(d.error ?? 'Creazione non riuscita.');
      }
    } catch {
      window.alert('Errore di rete.');
    } finally {
      setSavingCase(false);
    }
  }

  // Only the two canonical actions this WP's own Acceptance names —
  // "Avvia" (open -> in-progress) and "Risolvi" (in-progress -> resolved).
  async function caseTransition(assignmentId: string, caseId: string, newStatus: CaseStatus) {
    const body: Record<string, string> = { status: newStatus };
    if (newStatus === 'resolved') {
      const note = window.prompt('Nota di risoluzione (facoltativa):') ?? '';
      if (note.trim()) body.resolutionNote = note;
    }
    try {
      const r = await fetch(`/api/advisor/companies/${assignmentId}/cases/${caseId}`, {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      const d = await r.json();
      if (d.ok) await loadCases(assignmentId); else window.alert(d.error ?? 'Operazione non riuscita.');
    } catch {
      window.alert('Errore di rete.');
    }
  }

  function toggleAssessments(assignmentId: string) {
    if (expandedAssessments === assignmentId) {
      setExpandedAssessments(null);
      return;
    }
    setExpandedAssessments(assignmentId);
    setAssessments([]);
    setAssessmentReviewId('');
    setAssessmentError('');
  }

  async function loadAssessments(assignmentId: string) {
    if (!assessmentReviewId.trim()) return;
    setLoadingAssessments(true);
    setAssessmentError('');
    try {
      const r = await fetch(
        `/api/advisor/companies/${assignmentId}/review-assessments?reviewId=${encodeURIComponent(assessmentReviewId.trim())}`,
        { credentials: 'include' },
      );
      const d = await r.json();
      if (d.ok) {
        setAssessments(d.assessments ?? []);
      } else {
        setAssessments([]);
        setAssessmentError(d.error ?? 'Impossibile recuperare le valutazioni.');
      }
    } catch {
      setAssessments([]);
      setAssessmentError('Errore di rete.');
    } finally {
      setLoadingAssessments(false);
    }
  }

  async function saveAssessment(assignmentId: string) {
    if (!assessmentReviewId.trim() || !newAssessmentNarrative.trim()) return;
    setSavingAssessment(true);
    setAssessmentError('');
    try {
      const r = await fetch(`/api/advisor/companies/${assignmentId}/review-assessments`, {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewId: assessmentReviewId.trim(), assessmentNarrative: newAssessmentNarrative }),
      });
      const d = await r.json();
      if (d.ok) {
        setNewAssessmentNarrative('');
        await loadAssessments(assignmentId);
      } else {
        setAssessmentError(d.error ?? 'Registrazione non riuscita.');
      }
    } catch {
      setAssessmentError('Errore di rete.');
    } finally {
      setSavingAssessment(false);
    }
  }

  async function loadReview(assignmentId: string) {
    try {
      const r = await fetch(`/api/advisor/companies/${assignmentId}/koral-review`, { credentials: 'include' });
      const d = await r.json();
      if (d.ok) {
        setReviewSubjects({
          recognizedForInterpretation: d.subjects?.recognizedForInterpretation ?? [],
          eligibleForConfirmation: d.subjects?.eligibleForConfirmation ?? [],
        });
      } else {
        setReviewSubjects({ recognizedForInterpretation: [], eligibleForConfirmation: [] });
        setReviewError(d.error ?? 'Impossibile recuperare le trasformazioni.');
      }
    } catch {
      setReviewSubjects({ recognizedForInterpretation: [], eligibleForConfirmation: [] });
      setReviewError('Errore di rete.');
    }
  }

  async function toggleReview(assignmentId: string) {
    if (expandedReview === assignmentId) {
      setExpandedReview(null);
      return;
    }
    setExpandedReview(assignmentId);
    setReviewError('');
    setSelectedReviewTargetId('');
    await loadReview(assignmentId);
  }

  async function saveInterpretation(assignmentId: string) {
    if (!selectedReviewTargetId || !newInterpretation.trim()) return;
    setSavingReview(true);
    setReviewError('');
    try {
      const r = await fetch(`/api/advisor/companies/${assignmentId}/koral-review`, {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ materialChangeId: selectedReviewTargetId, interpretation: newInterpretation }),
      });
      const d = await r.json();
      if (d.ok) {
        setNewInterpretation('');
        await loadReview(assignmentId);
      } else {
        setReviewError(d.error ?? 'Salvataggio non riuscito.');
      }
    } catch {
      setReviewError('Errore di rete.');
    } finally {
      setSavingReview(false);
    }
  }

  async function confirmCandidate(assignmentId: string, materialChangeId: string) {
    setSavingReview(true);
    setReviewError('');
    try {
      const r = await fetch(`/api/advisor/companies/${assignmentId}/koral-review/confirm`, {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ materialChangeId }),
      });
      const d = await r.json();
      if (d.ok) {
        await loadReview(assignmentId);
      } else {
        setReviewError(d.error ?? 'Conferma non riuscita.');
      }
    } catch {
      setReviewError('Errore di rete.');
    } finally {
      setSavingReview(false);
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', color: TOKENS.inkHint, marginBottom: 6 }}>
          Advisor
        </p>
        <h1 style={{ fontSize: '22px', fontWeight: 700, color: TOKENS.ink, marginBottom: 4 }}>
          Le tue Company
        </h1>
        <p style={{ fontSize: '13px', color: TOKENS.inkSecondary, lineHeight: 1.55 }}>
          Le organizzazioni a cui sei attualmente assegnato. Puoi supportare le loro decisioni —
          non puoi mai deciderle al posto loro.
        </p>
      </div>

      {state === 'loading' && (
        <p style={{ fontSize: '13px', color: TOKENS.inkHint, textAlign: 'center', padding: '24px 0' }}>
          Caricamento…
        </p>
      )}

      {state === 'error' && (
        <div className="rounded-[16px] px-5 py-4" style={{ background: TOKENS.taupe, border: `1px solid ${TOKENS.inkBorderStrong}` }}>
          <p style={{ fontSize: '12px', color: TOKENS.critical }}>⚠ {errorMsg}</p>
        </div>
      )}

      {state === 'loaded' && companies.length === 0 && (
        <div className="rounded-[16px] px-5 py-4" style={{ background: TOKENS.taupe, border: `1px solid ${TOKENS.inkBorderStrong}` }}>
          <p style={{ fontSize: '11px', color: TOKENS.inkSecondary }}>Nessuna Company assegnata al momento.</p>
        </div>
      )}

      {state === 'loaded' && companies.length > 0 && (
        <ul className="space-y-3">
          {companies.map((c) => (
            <li key={c.assignmentId} className="rounded-[16px] px-5 py-4" style={{ background: TOKENS.surface, border: TOKENS.cardBorder }}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p style={{ fontSize: '14px', fontWeight: 700, color: TOKENS.ink }}>{c.companyName}</p>
                  <p style={{ fontSize: '11px', color: TOKENS.inkSecondary }}>{c.role}</p>
                </div>
                <span
                  style={{
                    fontSize: '10px', fontWeight: 700, whiteSpace: 'nowrap', padding: '3px 10px', borderRadius: '999px',
                    background: c.valid ? BADGE_TOKENS.eligible.bg : BADGE_TOKENS.draft.bg,
                    color: c.valid ? BADGE_TOKENS.eligible.text : BADGE_TOKENS.draft.text,
                    border: `1px solid ${c.valid ? BADGE_TOKENS.eligible.border : BADGE_TOKENS.draft.border}`,
                  }}
                >
                  {c.valid ? 'Relazione attiva' : 'In attivazione'}
                </span>
              </div>

              <div className="flex gap-3" style={{ marginTop: 10 }}>
                <button
                  onClick={() => openThread(c.assignmentId)}
                  style={{ fontSize: '11px', color: TOKENS.accent, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                >
                  {expanded === c.assignmentId ? 'Chiudi messaggi' : 'Messaggi'}
                </button>
                <button
                  onClick={() => toggleAppointments(c.assignmentId)}
                  style={{ fontSize: '11px', color: TOKENS.accent, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                >
                  {expandedAppointments === c.assignmentId ? 'Chiudi appuntamenti' : 'Appuntamenti'}
                </button>
                <button
                  onClick={() => toggleContent(c.assignmentId)}
                  style={{ fontSize: '11px', color: TOKENS.accent, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                >
                  {expandedContent === c.assignmentId ? 'Chiudi note' : 'Note e riferimenti'}
                </button>
                <button
                  onClick={() => toggleCases(c.assignmentId)}
                  style={{ fontSize: '11px', color: TOKENS.accent, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                >
                  {expandedCases === c.assignmentId ? 'Chiudi Case' : 'Case'}
                </button>
                <button
                  onClick={() => toggleAssessments(c.assignmentId)}
                  style={{ fontSize: '11px', color: TOKENS.accent, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                >
                  {expandedAssessments === c.assignmentId ? 'Chiudi valutazioni' : 'Valutazioni Review'}
                </button>
                <button
                  onClick={() => toggleReview(c.assignmentId)}
                  style={{ fontSize: '11px', color: TOKENS.accent, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                >
                  {expandedReview === c.assignmentId ? 'Chiudi KORAL Review' : 'KORAL Review'}
                </button>
              </div>

              {expandedReview === c.assignmentId && (
                <div style={{ marginTop: 12 }}>
                  <p style={{ fontSize: '11px', color: TOKENS.inkHint, lineHeight: 1.5, marginBottom: 10 }}>
                    Puoi interpretare una trasformazione già riconosciuta, o confermare una trasformazione
                    ambigua ancora candidata. Non puoi mai scegliere o forzare tu la trasformazione.
                  </p>

                  {reviewError && (
                    <p style={{ fontSize: '11px', color: TOKENS.critical, marginBottom: 10 }}>⚠ {reviewError}</p>
                  )}

                  <p style={{ fontSize: '10px', fontWeight: 700, color: TOKENS.inkHint, textTransform: 'uppercase', marginBottom: 6 }}>
                    Da confermare (ambigue)
                  </p>
                  {reviewSubjects.eligibleForConfirmation.length === 0 && (
                    <p style={{ fontSize: '11px', color: TOKENS.inkHint, marginBottom: 10 }}>Nessuna trasformazione ambigua da confermare al momento.</p>
                  )}
                  <ul className="space-y-2" style={{ marginBottom: 12 }}>
                    {reviewSubjects.eligibleForConfirmation.map((m) => (
                      <li key={m.id} className="flex items-center justify-between gap-3" style={{ fontSize: '12px', color: TOKENS.inkSecondary }}>
                        <span><strong style={{ color: TOKENS.ink }}>{m.category}</strong> — {new Date(m.occurredAt).toLocaleDateString('it-IT')}</span>
                        <button
                          onClick={() => confirmCandidate(c.assignmentId, m.id)}
                          disabled={savingReview}
                          style={{ fontSize: '10px', color: TOKENS.accent, background: 'none', border: 'none', cursor: 'pointer', opacity: savingReview ? 0.6 : 1 }}
                        >
                          Conferma trasformazione
                        </button>
                      </li>
                    ))}
                  </ul>

                  <p style={{ fontSize: '10px', fontWeight: 700, color: TOKENS.inkHint, textTransform: 'uppercase', marginBottom: 6 }}>
                    Riconosciute — aggiungi interpretazione
                  </p>
                  {reviewSubjects.recognizedForInterpretation.length === 0 && (
                    <p style={{ fontSize: '11px', color: TOKENS.inkHint, marginBottom: 10 }}>Nessuna trasformazione riconosciuta ancora.</p>
                  )}
                  {reviewSubjects.recognizedForInterpretation.length > 0 && (
                    <div className="space-y-2">
                      <select
                        value={selectedReviewTargetId}
                        onChange={(e) => setSelectedReviewTargetId(e.target.value)}
                        style={{ width: '100%', fontSize: '12px', padding: '8px 12px', borderRadius: '10px', border: `1px solid ${TOKENS.inkBorderStrong}`, color: TOKENS.ink }}
                      >
                        <option value="">Seleziona una trasformazione riconosciuta…</option>
                        {reviewSubjects.recognizedForInterpretation.map((m) => (
                          <option key={m.id} value={m.id}>{m.category} — {new Date(m.occurredAt).toLocaleDateString('it-IT')}</option>
                        ))}
                      </select>
                      <textarea
                        value={newInterpretation}
                        onChange={(e) => setNewInterpretation(e.target.value)}
                        placeholder="Interpretazione, contesto, cosa osservare…"
                        style={{ width: '100%', fontSize: '12px', padding: '8px 12px', borderRadius: '10px', border: `1px solid ${TOKENS.inkBorderStrong}`, color: TOKENS.ink, minHeight: 60 }}
                      />
                      <button
                        onClick={() => saveInterpretation(c.assignmentId)}
                        disabled={savingReview || !selectedReviewTargetId || !newInterpretation.trim()}
                        style={{
                          fontSize: '11px', fontWeight: 700, color: '#FFFFFF', background: TOKENS.accent,
                          border: 'none', borderRadius: '8px', padding: '8px 16px', cursor: 'pointer',
                          opacity: savingReview || !selectedReviewTargetId || !newInterpretation.trim() ? 0.6 : 1,
                        }}
                      >
                        {savingReview ? 'Salvataggio…' : 'Aggiungi interpretazione'}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {expandedCases === c.assignmentId && (
                <div style={{ marginTop: 12 }}>
                  {cases.length === 0 && (
                    <p style={{ fontSize: '11px', color: TOKENS.inkHint, marginBottom: 10 }}>Nessun Case ancora.</p>
                  )}
                  <ul className="space-y-2" style={{ marginBottom: 12 }}>
                    {cases.map((cs) => (
                      <li key={cs.id} style={{ fontSize: '12px', color: TOKENS.inkSecondary, lineHeight: 1.5 }}>
                        <div className="flex items-center justify-between gap-3">
                          <span>
                            <strong style={{ color: TOKENS.ink }}>{cs.subject}</strong> — {CASE_STATUS_LABEL[cs.status]}
                          </span>
                          <span className="flex gap-2">
                            {cs.status === 'open' && (
                              <button onClick={() => caseTransition(c.assignmentId, cs.id, 'in-progress')} style={{ fontSize: '10px', color: TOKENS.accent, background: 'none', border: 'none', cursor: 'pointer' }}>
                                Avvia
                              </button>
                            )}
                            {cs.status === 'in-progress' && (
                              <button onClick={() => caseTransition(c.assignmentId, cs.id, 'resolved')} style={{ fontSize: '10px', color: TOKENS.accent, background: 'none', border: 'none', cursor: 'pointer' }}>
                                Risolvi
                              </button>
                            )}
                          </span>
                        </div>
                        {/* Detail (file 102's own "UI: Advisor Case list/detail" — the
                            full canonical field set, doc 73 §12, inline rather than a
                            separate route, since nothing here needs its own navigation). */}
                        <div style={{ fontSize: '11px', color: TOKENS.inkHint, marginTop: 2 }}>
                          Creato il {new Date(cs.createdAt).toLocaleDateString('it-IT')}
                          {cs.priority && <> · Priorità: {cs.priority}</>}
                        </div>
                        {cs.resolutionNote && (
                          <p style={{ fontSize: '11px', color: TOKENS.inkHint, marginTop: 2 }}>Nota di risoluzione: {cs.resolutionNote}</p>
                        )}
                      </li>
                    ))}
                  </ul>
                  <div className="flex gap-2">
                    <input
                      type="text" value={newCaseSubject} onChange={(e) => setNewCaseSubject(e.target.value)} placeholder="Oggetto del nuovo Case…"
                      style={{ flex: 1, fontSize: '12px', padding: '8px 12px', borderRadius: '10px', border: `1px solid ${TOKENS.inkBorderStrong}`, color: TOKENS.ink }}
                    />
                    <button
                      onClick={() => saveCase(c.assignmentId)}
                      disabled={savingCase || !newCaseSubject.trim()}
                      style={{
                        fontSize: '11px', fontWeight: 700, color: '#FFFFFF', background: TOKENS.accent,
                        border: 'none', borderRadius: '8px', padding: '8px 16px', cursor: 'pointer',
                        opacity: savingCase || !newCaseSubject.trim() ? 0.6 : 1,
                      }}
                    >
                      {savingCase ? 'Creazione…' : 'Crea'}
                    </button>
                  </div>
                </div>
              )}

              {expandedAssessments === c.assignmentId && (
                <div style={{ marginTop: 12 }}>
                  <p style={{ fontSize: '11px', color: TOKENS.inkHint, lineHeight: 1.5, marginBottom: 10 }}>
                    Una valutazione informa la Review — non la conclude mai. La decisione finale resta sempre della Company.
                  </p>
                  <div className="flex gap-2" style={{ marginBottom: 10 }}>
                    <input
                      type="text" value={assessmentReviewId} onChange={(e) => setAssessmentReviewId(e.target.value)} placeholder="ID della Review…"
                      style={{ flex: 1, fontSize: '12px', padding: '8px 12px', borderRadius: '10px', border: `1px solid ${TOKENS.inkBorderStrong}`, color: TOKENS.ink }}
                    />
                    <button
                      onClick={() => loadAssessments(c.assignmentId)}
                      disabled={loadingAssessments || !assessmentReviewId.trim()}
                      style={{
                        fontSize: '11px', fontWeight: 700, color: TOKENS.accent, background: 'none',
                        border: `1px solid ${TOKENS.inkBorderStrong}`, borderRadius: '8px', padding: '8px 16px', cursor: 'pointer',
                        opacity: loadingAssessments || !assessmentReviewId.trim() ? 0.6 : 1,
                      }}
                    >
                      {loadingAssessments ? 'Ricerca…' : 'Cerca'}
                    </button>
                  </div>

                  {assessmentError && (
                    <p style={{ fontSize: '11px', color: TOKENS.critical, marginBottom: 10 }}>⚠ {assessmentError}</p>
                  )}

                  {assessments.length > 0 && (
                    <ul className="space-y-2" style={{ marginBottom: 12 }}>
                      {assessments.map((a) => (
                        <li key={a.id} style={{ fontSize: '12px', color: TOKENS.inkSecondary, lineHeight: 1.5 }}>
                          <span style={{ fontSize: '10px', fontWeight: 700, color: TOKENS.inkHint }}>
                            {new Date(a.issuedAt).toLocaleString('it-IT')} · Qualifica: {a.qualificationStatusAtIssuance}
                          </span>
                          <br />
                          {a.assessmentNarrative}
                        </li>
                      ))}
                    </ul>
                  )}

                  <div className="space-y-2">
                    <textarea
                      value={newAssessmentNarrative}
                      onChange={(e) => setNewAssessmentNarrative(e.target.value)}
                      placeholder="Osservazioni sulla sufficienza delle evidenze, eventuali lacune, raccomandazione…"
                      style={{ width: '100%', fontSize: '12px', padding: '8px 12px', borderRadius: '10px', border: `1px solid ${TOKENS.inkBorderStrong}`, color: TOKENS.ink, minHeight: 70 }}
                    />
                    <button
                      onClick={() => saveAssessment(c.assignmentId)}
                      disabled={savingAssessment || !assessmentReviewId.trim() || !newAssessmentNarrative.trim()}
                      style={{
                        fontSize: '11px', fontWeight: 700, color: '#FFFFFF', background: TOKENS.accent,
                        border: 'none', borderRadius: '8px', padding: '8px 16px', cursor: 'pointer',
                        opacity: savingAssessment || !assessmentReviewId.trim() || !newAssessmentNarrative.trim() ? 0.6 : 1,
                      }}
                    >
                      {savingAssessment ? 'Registrazione…' : 'Registra valutazione'}
                    </button>
                  </div>
                </div>
              )}

              {expandedContent === c.assignmentId && (
                <div style={{ marginTop: 12 }}>
                  {content.length === 0 && (
                    <p style={{ fontSize: '11px', color: TOKENS.inkHint, marginBottom: 10 }}>Nessuna nota ancora.</p>
                  )}
                  <ul className="space-y-2" style={{ marginBottom: 12 }}>
                    {content.map((rec) => (
                      <li key={rec.id} style={{ fontSize: '12px', color: TOKENS.inkSecondary, lineHeight: 1.5 }}>
                        <span style={{ fontSize: '10px', fontWeight: 700, color: TOKENS.inkHint, textTransform: 'uppercase' }}>
                          {rec.class === 'AUDIT_PROVENANCE_RECORD' ? 'Audit' : CLASS_LABEL[rec.class]}
                          {rec.class === 'COMMUNICATION_FOLLOWUP' ? (rec.shared ? ' — condivisa' : ' — interna') : ''}
                        </span>
                        <br />
                        {rec.body}
                        {rec.purpose && <em style={{ display: 'block', color: TOKENS.inkHint }}>Scopo: {rec.purpose}</em>}
                      </li>
                    ))}
                  </ul>

                  <div className="space-y-2">
                    <select
                      value={newClass}
                      onChange={(e) => setNewClass(e.target.value as ContentClass)}
                      style={{ width: '100%', fontSize: '12px', padding: '8px 12px', borderRadius: '10px', border: `1px solid ${TOKENS.inkBorderStrong}`, color: TOKENS.ink }}
                    >
                      {(Object.keys(CLASS_LABEL) as ContentClass[]).map((cls) => (
                        <option key={cls} value={cls}>{CLASS_LABEL[cls]}</option>
                      ))}
                    </select>
                    <textarea
                      value={newBody}
                      onChange={(e) => setNewBody(e.target.value)}
                      placeholder="Testo…"
                      style={{ width: '100%', fontSize: '12px', padding: '8px 12px', borderRadius: '10px', border: `1px solid ${TOKENS.inkBorderStrong}`, color: TOKENS.ink, minHeight: 60 }}
                    />
                    {newClass === 'CONFIDENTIAL_REFERENCE' && (
                      <input
                        type="text" value={newPurpose} onChange={(e) => setNewPurpose(e.target.value)} placeholder="Scopo (obbligatorio)"
                        style={{ width: '100%', fontSize: '12px', padding: '8px 12px', borderRadius: '10px', border: `1px solid ${TOKENS.inkBorderStrong}`, color: TOKENS.ink }}
                      />
                    )}
                    {newClass === 'COMMUNICATION_FOLLOWUP' && (
                      <label style={{ fontSize: '11px', color: TOKENS.inkSecondary, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <input type="checkbox" checked={newShared} onChange={(e) => setNewShared(e.target.checked)} />
                        Condividi con la Company
                      </label>
                    )}
                    <button
                      onClick={() => saveContent(c.assignmentId)}
                      disabled={savingContent || !newBody.trim()}
                      style={{
                        fontSize: '11px', fontWeight: 700, color: '#FFFFFF', background: TOKENS.accent,
                        border: 'none', borderRadius: '8px', padding: '8px 16px', cursor: 'pointer',
                        opacity: savingContent || !newBody.trim() ? 0.6 : 1,
                      }}
                    >
                      {savingContent ? 'Salvataggio…' : 'Salva'}
                    </button>
                  </div>
                </div>
              )}

              {expandedAppointments === c.assignmentId && (
                <div style={{ marginTop: 12 }}>
                  {appointments.length === 0 && (
                    <p style={{ fontSize: '11px', color: TOKENS.inkHint }}>Nessun appuntamento ancora.</p>
                  )}
                  <ul className="space-y-2">
                    {appointments.map((a) => (
                      <li key={a.id} className="flex items-center justify-between gap-3" style={{ fontSize: '12px', color: TOKENS.inkSecondary }}>
                        <span>
                          <strong style={{ color: TOKENS.ink }}>{a.subject}</strong> — {new Date(a.startsAt).toLocaleString('it-IT')} ({STATUS_LABEL[a.status]})
                        </span>
                        {a.status === 'requested' && (
                          <button onClick={() => appointmentAction(c.assignmentId, a.id, 'confirm')} style={{ fontSize: '10px', color: TOKENS.accent, background: 'none', border: 'none', cursor: 'pointer' }}>
                            Conferma
                          </button>
                        )}
                        {(a.status === 'requested' || a.status === 'confirmed') && (
                          <span className="flex gap-2">
                            <button onClick={() => appointmentAction(c.assignmentId, a.id, 'reschedule')} style={{ fontSize: '10px', color: TOKENS.accent, background: 'none', border: 'none', cursor: 'pointer' }}>
                              Riprogramma
                            </button>
                            <button onClick={() => appointmentAction(c.assignmentId, a.id, 'cancel')} style={{ fontSize: '10px', color: TOKENS.critical, background: 'none', border: 'none', cursor: 'pointer' }}>
                              Annulla
                            </button>
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {expanded === c.assignmentId && (
                <div style={{ marginTop: 12 }}>
                  {messages.length === 0 && (
                    <p style={{ fontSize: '11px', color: TOKENS.inkHint, marginBottom: 10 }}>Nessun messaggio ancora.</p>
                  )}
                  <ul className="space-y-2" style={{ marginBottom: 12 }}>
                    {messages.map((m) => (
                      <li key={m.id} style={{ fontSize: '12px', color: TOKENS.inkSecondary, lineHeight: 1.5 }}>
                        <strong style={{ color: TOKENS.ink }}>{m.senderRole === 'ADVISOR' ? 'Tu' : c.companyName}:</strong>{' '}
                        {m.body}
                      </li>
                    ))}
                  </ul>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      placeholder="Scrivi un messaggio…"
                      style={{ flex: 1, fontSize: '12px', padding: '8px 12px', borderRadius: '10px', border: `1px solid ${TOKENS.inkBorderStrong}`, color: TOKENS.ink }}
                    />
                    <button
                      onClick={() => send(c.assignmentId)}
                      disabled={sending || !draft.trim()}
                      style={{
                        fontSize: '11px', fontWeight: 700, color: '#FFFFFF', background: TOKENS.accent,
                        border: 'none', borderRadius: '8px', padding: '8px 16px', cursor: 'pointer',
                        opacity: sending || !draft.trim() ? 0.6 : 1,
                      }}
                    >
                      {sending ? 'Invio…' : 'Invia'}
                    </button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
