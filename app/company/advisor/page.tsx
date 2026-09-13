'use client';

// app/company/advisor/page.tsx
// KORA-WP-033 — Company Advisor Action-Matrix Surface + Portal Pilot Slice.
// KORA-WP-035 — Advisor Calendar & Call/Appointment Lineage (appointments
// section added below the existing profile/message surface — no navigation
// or redesign, per this WP's own Step 32 discipline).
//
// The first visible Company↔Advisor surface: the Company's own assigned
// Advisor (name, role, validity), a minimal non-calendar contact/message
// surface, and now the ability to request an appointment ("Call") with the
// assigned Advisor. No video-call provider, no external calendar sync, no
// document center, no case list — those are KORA-WP-036/034 or explicitly
// deferred (video-call provider integration, file 102's own Out of Scope).
//
// Field-minimized by design (see lib/advisor-portal/advisor-portal-service.ts
// header): no biography, no headshot, no rating, no phone/email — none of
// those fields exist in the canonical Advisor Identity model.

import { useEffect, useState } from 'react';
import { TOKENS, BADGE_TOKENS } from '@/lib/design/kora-design-tokens';

interface AssignedAdvisor {
  assignmentId: string;
  advisorId: string;
  fullName: string;
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

const STATUS_LABEL: Record<Appointment['status'], string> = {
  requested: 'Richiesto',
  confirmed: 'Confermato',
  completed: 'Concluso',
  rescheduled: 'Riprogrammato',
  cancelled: 'Annullato',
  'no-show': 'Non presentato',
};

export default function CompanyAdvisorPage() {
  const [advisor, setAdvisor] = useState<AssignedAdvisor | null>(null);
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [state, setState] = useState<'loading' | 'loaded' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [newSubject, setNewSubject] = useState('');
  const [newStartsAt, setNewStartsAt] = useState('');
  const [newEndsAt, setNewEndsAt] = useState('');
  const [booking, setBooking] = useState(false);

  async function loadAppointments() {
    try {
      const r = await fetch('/api/company/advisor/appointments', { credentials: 'include' });
      const d = await r.json();
      setAppointments(d.ok ? (d.appointments ?? []) : []);
    } catch {
      setAppointments([]);
    }
  }

  async function load() {
    try {
      const r = await fetch('/api/company/advisor', { credentials: 'include' });
      const d = await r.json();
      if (d.ok) {
        setAdvisor(d.advisor);
        setMessages(d.messages ?? []);
        setState('loaded');
        if (d.advisor) await loadAppointments();
      } else {
        setErrorMsg(d.error ?? 'Errore nel caricamento.');
        setState('error');
      }
    } catch {
      setErrorMsg('Errore di rete.');
      setState('error');
    }
  }

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps

  async function bookAppointment() {
    if (!newSubject.trim() || !newStartsAt || !newEndsAt) return;
    setBooking(true);
    try {
      const r = await fetch('/api/company/advisor/appointments', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject: newSubject, startsAt: new Date(newStartsAt).toISOString(), endsAt: new Date(newEndsAt).toISOString() }),
      });
      const d = await r.json();
      if (d.ok) {
        setNewSubject(''); setNewStartsAt(''); setNewEndsAt('');
        await loadAppointments();
      } else {
        window.alert(d.error ?? 'Richiesta non riuscita.');
      }
    } catch {
      window.alert('Errore di rete durante la richiesta.');
    } finally {
      setBooking(false);
    }
  }

  async function cancelAppointment(appointmentId: string) {
    const reason = window.prompt('Motivo dell’annullamento:');
    if (!reason?.trim()) return;
    try {
      const r = await fetch(`/api/company/advisor/appointments/${appointmentId}`, {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel', reason }),
      });
      const d = await r.json();
      if (d.ok) await loadAppointments(); else window.alert(d.error ?? 'Annullamento non riuscito.');
    } catch {
      window.alert('Errore di rete.');
    }
  }

  async function rescheduleAppointment(appointmentId: string) {
    const reason = window.prompt('Motivo della riprogrammazione:');
    if (!reason?.trim()) return;
    const startsAt = window.prompt('Nuova data/ora di inizio (es. 2026-10-01T10:00):');
    if (!startsAt) return;
    const endsAt = window.prompt('Nuova data/ora di fine (es. 2026-10-01T11:00):');
    if (!endsAt) return;
    try {
      const r = await fetch(`/api/company/advisor/appointments/${appointmentId}`, {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reschedule', reason, startsAt: new Date(startsAt).toISOString(), endsAt: new Date(endsAt).toISOString() }),
      });
      const d = await r.json();
      if (d.ok) await loadAppointments(); else window.alert(d.error ?? 'Riprogrammazione non riuscita.');
    } catch {
      window.alert('Errore di rete.');
    }
  }

  async function send() {
    if (!draft.trim()) return;
    setSending(true);
    try {
      const r = await fetch('/api/company/advisor', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: draft }),
      });
      const d = await r.json();
      if (d.ok) {
        setDraft('');
        await load();
      } else {
        window.alert(d.error ?? 'Invio non riuscito.');
      }
    } catch {
      window.alert('Errore di rete durante l’invio.');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', color: TOKENS.inkHint, marginBottom: 6 }}>
          Advisor
        </p>
        <h1 style={{ fontSize: '22px', fontWeight: 700, color: TOKENS.ink, marginBottom: 4 }}>
          Il tuo Advisor
        </h1>
        <p style={{ fontSize: '13px', color: TOKENS.inkSecondary, lineHeight: 1.55 }}>
          L&apos;Advisor assegnato alla tua organizzazione. L&apos;Advisor supporta le decisioni della
          Company — non le sostituisce mai: ogni decisione costitutiva resta della Company.
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

      {state === 'loaded' && !advisor && (
        <div className="rounded-[16px] px-5 py-4" style={{ background: TOKENS.taupe, border: `1px solid ${TOKENS.inkBorderStrong}` }}>
          <p style={{ fontSize: '11px', fontWeight: 700, color: TOKENS.ink, marginBottom: 6 }}>
            Nessun Advisor assegnato
          </p>
          <p style={{ fontSize: '11px', color: TOKENS.inkSecondary, lineHeight: 1.5 }}>
            Al momento non risulta nessun Advisor assegnato alla tua organizzazione.
          </p>
        </div>
      )}

      {state === 'loaded' && advisor && (
        <>
          <div className="rounded-[16px] px-5 py-4" style={{ background: TOKENS.surface, border: TOKENS.cardBorder }}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p style={{ fontSize: '15px', fontWeight: 700, color: TOKENS.ink, marginBottom: 2 }}>{advisor.fullName}</p>
                <p style={{ fontSize: '11px', color: TOKENS.inkSecondary }}>{advisor.role}</p>
              </div>
              <span
                style={{
                  fontSize: '10px', fontWeight: 700, whiteSpace: 'nowrap', padding: '3px 10px', borderRadius: '999px',
                  background: advisor.valid ? BADGE_TOKENS.eligible.bg : BADGE_TOKENS.draft.bg,
                  color: advisor.valid ? BADGE_TOKENS.eligible.text : BADGE_TOKENS.draft.text,
                  border: `1px solid ${advisor.valid ? BADGE_TOKENS.eligible.border : BADGE_TOKENS.draft.border}`,
                }}
              >
                {advisor.valid ? 'Relazione attiva' : 'In attivazione'}
              </span>
            </div>
            {!advisor.valid && (
              <p style={{ fontSize: '11px', color: TOKENS.inkHint, marginTop: 8 }}>
                La relazione con questo Advisor è registrata ma non ancora pienamente operativa.
              </p>
            )}
          </div>

          <div className="rounded-[16px] px-5 py-4" style={{ background: TOKENS.surface, border: TOKENS.cardBorder }}>
            <p style={{ fontSize: '12px', fontWeight: 700, color: TOKENS.ink, marginBottom: 10 }}>Messaggi</p>

            {messages.length === 0 && (
              <p style={{ fontSize: '11px', color: TOKENS.inkHint, marginBottom: 10 }}>Nessun messaggio ancora.</p>
            )}

            <ul className="space-y-2" style={{ marginBottom: 12 }}>
              {messages.map((m) => (
                <li key={m.id} style={{ fontSize: '12px', color: TOKENS.inkSecondary, lineHeight: 1.5 }}>
                  <strong style={{ color: TOKENS.ink }}>{m.senderRole === 'COMPANY_ADMIN' ? 'Tu' : advisor.fullName}:</strong>{' '}
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
                style={{
                  flex: 1, fontSize: '12px', padding: '8px 12px', borderRadius: '10px',
                  border: `1px solid ${TOKENS.inkBorderStrong}`, color: TOKENS.ink,
                }}
              />
              <button
                onClick={send}
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

          <div className="rounded-[16px] px-5 py-4" style={{ background: TOKENS.surface, border: TOKENS.cardBorder }}>
            <p style={{ fontSize: '12px', fontWeight: 700, color: TOKENS.ink, marginBottom: 10 }}>Appuntamenti</p>

            {appointments.length === 0 && (
              <p style={{ fontSize: '11px', color: TOKENS.inkHint, marginBottom: 10 }}>Nessun appuntamento ancora.</p>
            )}

            <ul className="space-y-2" style={{ marginBottom: 14 }}>
              {appointments.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-3" style={{ fontSize: '12px', color: TOKENS.inkSecondary }}>
                  <span>
                    <strong style={{ color: TOKENS.ink }}>{a.subject}</strong> — {new Date(a.startsAt).toLocaleString('it-IT')} ({STATUS_LABEL[a.status]})
                    {a.rescheduledFromId && <em> · riprogrammato</em>}
                  </span>
                  {(a.status === 'requested' || a.status === 'confirmed') && (
                    <span className="flex gap-2">
                      <button onClick={() => rescheduleAppointment(a.id)} style={{ fontSize: '10px', color: TOKENS.accent, background: 'none', border: 'none', cursor: 'pointer' }}>
                        Riprogramma
                      </button>
                      <button onClick={() => cancelAppointment(a.id)} style={{ fontSize: '10px', color: TOKENS.critical, background: 'none', border: 'none', cursor: 'pointer' }}>
                        Annulla
                      </button>
                    </span>
                  )}
                </li>
              ))}
            </ul>

            <p style={{ fontSize: '11px', fontWeight: 700, color: TOKENS.ink, marginBottom: 8 }}>Richiedi un nuovo appuntamento</p>
            <div className="space-y-2">
              <input
                type="text" value={newSubject} onChange={(e) => setNewSubject(e.target.value)} placeholder="Oggetto (es. Q2 Review)"
                style={{ width: '100%', fontSize: '12px', padding: '8px 12px', borderRadius: '10px', border: `1px solid ${TOKENS.inkBorderStrong}`, color: TOKENS.ink }}
              />
              <div className="flex gap-2">
                <input type="datetime-local" value={newStartsAt} onChange={(e) => setNewStartsAt(e.target.value)} style={{ flex: 1, fontSize: '12px', padding: '8px 12px', borderRadius: '10px', border: `1px solid ${TOKENS.inkBorderStrong}`, color: TOKENS.ink }} />
                <input type="datetime-local" value={newEndsAt} onChange={(e) => setNewEndsAt(e.target.value)} style={{ flex: 1, fontSize: '12px', padding: '8px 12px', borderRadius: '10px', border: `1px solid ${TOKENS.inkBorderStrong}`, color: TOKENS.ink }} />
                <button
                  onClick={bookAppointment}
                  disabled={booking || !newSubject.trim() || !newStartsAt || !newEndsAt}
                  style={{
                    fontSize: '11px', fontWeight: 700, color: '#FFFFFF', background: TOKENS.accent,
                    border: 'none', borderRadius: '8px', padding: '8px 16px', cursor: 'pointer', whiteSpace: 'nowrap',
                    opacity: booking || !newSubject.trim() || !newStartsAt || !newEndsAt ? 0.6 : 1,
                  }}
                >
                  {booking ? 'Invio…' : 'Richiedi'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
