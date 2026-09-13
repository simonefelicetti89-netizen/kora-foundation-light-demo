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
              </div>

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
