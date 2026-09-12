'use client';

// app/admin/advisor-governance/page.tsx
// KORA-WP-032 — Advisor Governance: Qualification Grant, Manual First-Pilot.
//
// Minimal Admin-only grant surface (file 102: "UI: Admin grant UI
// (minimal)"). Lists Advisors and their role qualifications; offers a
// single "Concedi" action per qualification currently eligible for grant.
// No revoke, no suspend, no bulk action, no automated/policy-based grant —
// every click is one explicit, single governance decision (doc 81 §11).
// No Assignment, no Company linkage, no case/task/calendar UI of any kind.
//
// Protected by app/admin/layout.tsx's requireKoraAdmin() guard.

import { useEffect, useState } from 'react';
import { TOKENS } from '@/lib/design/kora-design-tokens';

interface Qualification {
  id: string;
  role: 'Company Advisor' | 'Partner Advisor';
  status: string;
}

interface Advisor {
  id: string;
  fullName: string;
  status: string;
  qualifications: Qualification[];
}

const GRANT_ELIGIBLE = new Set(['CANDIDATE', 'QUALIFICATION IN PROGRESS', 'RENEWAL DUE', 'EXPIRED']);

export default function AdvisorGovernancePage() {
  const [advisors, setAdvisors] = useState<Advisor[]>([]);
  const [state, setState] = useState<'loading' | 'loaded' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const [grantingId, setGrantingId] = useState<string | null>(null);

  async function load() {
    try {
      const r = await fetch('/api/admin/advisor-governance', { credentials: 'include' });
      const d = await r.json();
      if (d.ok) {
        setAdvisors(d.advisors);
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

  async function grant(qualificationId: string) {
    setGrantingId(qualificationId);
    try {
      const r = await fetch('/api/admin/advisor-governance', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qualificationId }),
      });
      const d = await r.json();
      if (!d.ok) {
        window.alert(d.error ?? 'Concessione non riuscita.');
      }
      await load();
    } catch {
      window.alert('Errore di rete durante la concessione.');
    } finally {
      setGrantingId(null);
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', color: TOKENS.inkHint, marginBottom: 6 }}>
          Advisor Governance
        </p>
        <h1 style={{ fontSize: '22px', fontWeight: 700, color: TOKENS.ink, marginBottom: 4 }}>
          Concessione Qualifiche Advisor
        </h1>
        <p style={{ fontSize: '13px', color: TOKENS.inkSecondary, lineHeight: 1.55 }}>
          Ogni concessione è una decisione di governance singola ed esplicita. Non esiste alcuna
          concessione automatica: il completamento dell&apos;Academy non concede la qualifica, e un
          Advisor non può auto-concedersi o auto-approvarsi.
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

      {state === 'loaded' && advisors.length === 0 && (
        <div className="rounded-[16px] px-5 py-4" style={{ background: TOKENS.taupe, border: `1px solid ${TOKENS.inkBorderStrong}` }}>
          <p style={{ fontSize: '11px', color: TOKENS.inkSecondary }}>Nessun Advisor registrato.</p>
        </div>
      )}

      {state === 'loaded' && advisors.length > 0 && (
        <ul className="space-y-3">
          {advisors.map((a) => (
            <li key={a.id} className="rounded-[16px] px-5 py-4" style={{ background: TOKENS.surface, border: TOKENS.cardBorder }}>
              <p style={{ fontSize: '13px', fontWeight: 700, color: TOKENS.ink, marginBottom: 8 }}>{a.fullName}</p>
              <div className="space-y-2">
                {a.qualifications.length === 0 && (
                  <p style={{ fontSize: '11px', color: TOKENS.inkHint }}>Nessuna qualifica candidata.</p>
                )}
                {a.qualifications.map((q) => (
                  <div key={q.id} className="flex items-center justify-between gap-3">
                    <span style={{ fontSize: '12px', color: TOKENS.inkSecondary }}>
                      {q.role} — <strong>{q.status}</strong>
                    </span>
                    {GRANT_ELIGIBLE.has(q.status) && (
                      <button
                        onClick={() => grant(q.id)}
                        disabled={grantingId === q.id}
                        style={{
                          fontSize: '11px', fontWeight: 700, color: '#FFFFFF', background: TOKENS.accent,
                          border: 'none', borderRadius: '8px', padding: '6px 14px', cursor: 'pointer',
                          opacity: grantingId === q.id ? 0.6 : 1,
                        }}
                      >
                        {grantingId === q.id ? 'Concessione…' : 'Concedi'}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
