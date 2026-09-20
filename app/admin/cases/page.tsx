'use client';

// app/admin/cases/page.tsx
// KORA-WP-007 — Operational Case Primitive.
//
// The "one interface" through which both an Advisor-origin and an
// Admin-origin Case are queryable (this WP's own Acceptance criterion) —
// KORA_ADMIN sees every Case regardless of origin. Minimal, read-only:
// no dashboard, no kanban, no bulk actions — status transitions and
// reassignment are exercised via the service/API, not built into this UI
// (Step 34's own explicit minimalism instruction).

import { useEffect, useState } from 'react';
import { TOKENS, BADGE_TOKENS } from '@/lib/design/kora-design-tokens';

interface CaseRow {
  id: string;
  organisationType: 'company' | 'partner' | 'admin';
  organisationId: string | null;
  owningAdvisorId: string | null;
  createdByRole: 'ADVISOR' | 'KORA_ADMIN';
  subject: string;
  status: 'open' | 'in-progress' | 'blocked' | 'resolved' | 'escalated';
  createdAt: string;
}

const STATUS_LABEL: Record<CaseRow['status'], string> = {
  open: 'Aperto',
  'in-progress': 'In corso',
  blocked: 'Bloccato',
  resolved: 'Risolto',
  escalated: 'Escalato',
};

export default function AdminCasesPage() {
  const [cases, setCases] = useState<CaseRow[]>([]);
  const [state, setState] = useState<'loading' | 'loaded' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/api/admin/cases', { credentials: 'include' });
        const d = await r.json();
        if (d.ok) {
          setCases(d.cases ?? []);
          setState('loaded');
        } else {
          setErrorMsg(d.error ?? 'Errore nel caricamento.');
          setState('error');
        }
      } catch {
        setErrorMsg('Errore di rete.');
        setState('error');
      }
    })();
  }, []);

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', color: TOKENS.inkHint, marginBottom: 6 }}>
          Operazioni
        </p>
        <h1 style={{ fontSize: '22px', fontWeight: 700, color: TOKENS.ink, marginBottom: 4 }}>
          Case
        </h1>
        <p style={{ fontSize: '13px', color: TOKENS.inkSecondary, lineHeight: 1.55 }}>
          Primitiva operativa condivisa (doc 73 §12) — Case originati da un flusso Advisor e da un flusso Admin, entrambi consultabili qui.
        </p>
      </div>

      {state === 'loading' && (
        <p style={{ fontSize: '13px', color: TOKENS.inkHint, textAlign: 'center', padding: '24px 0' }}>Caricamento…</p>
      )}

      {state === 'error' && (
        <div className="rounded-[16px] px-5 py-4" style={{ background: TOKENS.taupe, border: `1px solid ${TOKENS.inkBorderStrong}` }}>
          <p style={{ fontSize: '12px', color: TOKENS.critical }}>⚠ {errorMsg}</p>
        </div>
      )}

      {state === 'loaded' && (
        <div className="rounded-[16px] px-5 py-4" style={{ background: TOKENS.surface, border: TOKENS.cardBorder }}>
          {cases.length === 0 && (
            <p style={{ fontSize: '11px', color: TOKENS.inkHint }}>Nessun Case ancora.</p>
          )}
          <ul className="space-y-2">
            {cases.map((c) => (
              <li key={c.id} style={{ fontSize: '12px', color: TOKENS.inkSecondary, lineHeight: 1.6 }}>
                <span
                  style={{
                    fontSize: '9px', fontWeight: 700, padding: '2px 8px', borderRadius: '999px', marginRight: 8,
                    background: BADGE_TOKENS.draft.bg, color: BADGE_TOKENS.draft.text, border: `1px solid ${BADGE_TOKENS.draft.border}`,
                  }}
                >
                  {c.createdByRole === 'ADVISOR' ? 'Origine Advisor' : 'Origine Admin'}
                </span>
                <strong style={{ color: TOKENS.ink }}>{c.subject}</strong>
                {' — '}{c.organisationType} · {STATUS_LABEL[c.status]}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
