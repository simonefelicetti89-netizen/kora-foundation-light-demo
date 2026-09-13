'use client';

// app/advisor/companies/page.tsx
// KORA-WP-033 — Company Advisor Action-Matrix Surface + Portal Pilot Slice.
//
// The Advisor's own "app/advisor Company surface" (file 102's own Proposed
// New field): the list of Companies the Advisor is currently assigned to
// (Assignment Role Context, KORA-WP-031), each with the same minimal
// non-calendar contact/message surface as the Company side. No calendar, no
// booking, no case list, no document center — those are KORA-WP-034/035/036.
//
// "Early-Slice: ADVISOR-002 (one environment, no second portal; full
// completion KORA-WP-064)" — this page is deliberately minimal, no
// navigation polish, no dashboard. Reached from app/advisor's own self-view
// page; not part of any full portal shell (that is KORA-WP-064's scope).

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

export default function AdvisorCompaniesPage() {
  const [companies, setCompanies] = useState<AssignedCompany[]>([]);
  const [state, setState] = useState<'loading' | 'loaded' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);

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

              <button
                onClick={() => openThread(c.assignmentId)}
                style={{ fontSize: '11px', color: TOKENS.accent, background: 'none', border: 'none', cursor: 'pointer', marginTop: 10, padding: 0 }}
              >
                {expanded === c.assignmentId ? 'Chiudi messaggi' : 'Messaggi'}
              </button>

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
