'use client';

// app/company/needs/page.tsx
// KORA-WP-018: Company Needs View — read-only.
//
// Renders the Company's own persisted Need Hypotheses (KORA-WP-017).
//
// CENTRAL SEMANTIC RULE — Need Hypothesis ≠ Supported Need: a hypothesis
// means only that, based on currently available evidence, there is a
// plausible signal a Company population may have a given need. It does
// NOT mean the need is proven, confirmed, validated, or automatically
// prioritized. This page must never present a Hypothesis as anything
// stronger than that — no confidence score, no priority ranking, no
// "confirm" action. Full Listening (the only thing that could ever
// promote a Hypothesis) is KORA-WP-069, currently blocked by an external
// legal gate (F-12) — nothing here changes that.
//
// No create/edit/promote controls exist on this page by design — this WP
// is a read view only (Out of Scope: Advisor-side Need editing, KORA-WP-033).

import { useEffect, useState } from 'react';
import { TOKENS, BADGE_TOKENS } from '@/lib/design/kora-design-tokens';

interface CompanyNeed {
  id: string;
  statement: string;
  classification: 'Hypothesis' | 'Emerging' | 'Supported' | 'Insufficient-Evidence-Unknown';
  createdAt: string;
}

interface NeedsResponse {
  ok: boolean;
  needs?: CompanyNeed[];
  error?: string;
}

// Restrained, neutral Italian labels — none imply proof, priority, or
// severity. Only 'Hypothesis' is reachable today (WP-017's create path
// produces no other value); the other three are labeled defensively for
// forward compatibility with the schema's frozen 4-state vocabulary, not
// because WP-018 implements any transition into them.
const CLASSIFICATION_LABEL: Record<CompanyNeed['classification'], string> = {
  Hypothesis: 'Ipotesi',
  Emerging: 'In evoluzione',
  Supported: 'Con evidenza a supporto',
  'Insufficient-Evidence-Unknown': 'Evidenza insufficiente',
};

export default function CompanyNeedsPage() {
  const [needs, setNeeds] = useState<CompanyNeed[]>([]);
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const r = await fetch('/api/company/needs', { credentials: 'include' });
        const d: NeedsResponse = await r.json();
        if (cancelled) return;
        if (d.ok && d.needs) {
          setNeeds(d.needs);
          setStatus('loaded');
        } else {
          setErrorMsg(d.error ?? 'Errore nel caricamento dei bisogni aziendali.');
          setStatus('error');
        }
      } catch {
        if (!cancelled) {
          setErrorMsg('Errore di rete — impossibile contattare KORA.');
          setStatus('error');
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <p
          style={{
            fontSize: '10px', fontWeight: 700, letterSpacing: '0.10em',
            textTransform: 'uppercase', color: TOKENS.inkHint, marginBottom: 6,
          }}
        >
          Needs Map
        </p>
        <h1 style={{ fontSize: '22px', fontWeight: 700, color: TOKENS.ink, marginBottom: 4 }}>
          Bisogni Aziendali
        </h1>
        <p style={{ fontSize: '13px', color: TOKENS.inkSecondary, lineHeight: 1.55 }}>
          Ipotesi di bisogno rilevate per la tua organizzazione. Un&apos;ipotesi indica un segnale
          plausibile, non un bisogno confermato — la conferma richiede un futuro strumento di
          ascolto strutturato, non ancora disponibile in questa fase pilota.
        </p>
      </div>

      {status === 'loading' && (
        <p style={{ fontSize: '13px', color: TOKENS.inkHint, textAlign: 'center', padding: '24px 0' }}>
          Caricamento…
        </p>
      )}

      {status === 'error' && (
        <div
          className="rounded-[16px] px-5 py-4"
          style={{ background: TOKENS.taupe, border: `1px solid ${TOKENS.inkBorderStrong}` }}
        >
          <p style={{ fontSize: '12px', color: TOKENS.critical }}>⚠ {errorMsg}</p>
        </div>
      )}

      {status === 'loaded' && needs.length === 0 && (
        <div
          className="rounded-[16px] px-5 py-4"
          style={{ background: TOKENS.taupe, border: `1px solid ${TOKENS.inkBorderStrong}` }}
        >
          <p style={{ fontSize: '11px', fontWeight: 700, color: TOKENS.ink, marginBottom: 6 }}>
            Nessuna ipotesi di bisogno registrata
          </p>
          <p style={{ fontSize: '11px', color: TOKENS.inkSecondary, lineHeight: 1.5 }}>
            Al momento non risultano ipotesi di bisogno per la tua organizzazione.
          </p>
        </div>
      )}

      {status === 'loaded' && needs.length > 0 && (
        <ul className="space-y-3">
          {needs.map((n) => {
            const badge = BADGE_TOKENS.draft;
            return (
              <li
                key={n.id}
                className="rounded-[16px] px-5 py-4"
                style={{ background: TOKENS.surface, border: TOKENS.cardBorder }}
              >
                <div className="flex items-start justify-between gap-3">
                  <p style={{ fontSize: '13px', color: TOKENS.ink, lineHeight: 1.5, flex: 1 }}>
                    {n.statement}
                  </p>
                  <span
                    style={{
                      fontSize: '10px', fontWeight: 700, whiteSpace: 'nowrap',
                      padding: '3px 10px', borderRadius: '999px',
                      background: badge.bg, color: badge.text, border: `1px solid ${badge.border}`,
                    }}
                  >
                    {CLASSIFICATION_LABEL[n.classification]}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
