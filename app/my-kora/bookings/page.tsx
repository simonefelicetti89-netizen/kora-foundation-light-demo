'use client';
// W-05: Prenotazioni — stato delle richieste di partecipazione alle iniziative.
//
// B-WORKER-3 (2026-09-06): /worker/bookings migrated this page's EXISTING
// real 'live' capability (real /api/worker/commons/bookings data, real
// cancel action, real status/date rendering) verbatim onto the canonical
// /worker surface with a real requireWorkerUser()-gated server wrapper. A
// confirmed real WORKER session here now redirects there instead of
// duplicating that rendering. 'demo' (session not confirmed as non-synthetic)
// is unchanged — Foundation Light's legitimate pre-login preview.

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { TOKENS } from '@/lib/design/kora-design-tokens';

const FONT = 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif';

type BookingsMode = 'checking' | 'redirecting' | 'demo';

const BOOKING_STATUS_COPY: Record<string, { label: string; color: string }> = {
  pending:   { label: 'Richiesta inviata',          color: '#8A5A00'           },
  requested: { label: 'Richiesta inviata',          color: '#8A5A00'           },
  approved:  { label: 'Partecipazione confermata',  color: '#2F7D55'           },
  confirmed: { label: 'Partecipazione confermata',  color: '#2F7D55'           },
  rejected:  { label: 'Richiesta non approvata',    color: '#9E3B2F'           },
  attended:  { label: 'Partecipazione completata',  color: '#3B6EBA'           },
  cancelled: { label: 'Annullata',                  color: 'rgba(6,3,43,0.45)' },
};

function statusMeta(status: string): { label: string; color: string } {
  return BOOKING_STATUS_COPY[status] ?? { label: 'Stato in verifica', color: 'rgba(6,3,43,0.40)' };
}

function PrivacyNotice() {
  return (
    <div
      data-testid="bookings-employer-privacy-notice"
      style={{
        background: 'rgba(47,125,85,0.06)', border: '1.5px solid rgba(47,125,85,0.22)',
        borderRadius: 10, padding: '12px 16px', marginBottom: 20,
      }}
    >
      <p style={{ fontFamily: FONT, fontSize: 12, color: '#2F7D55', margin: 0, lineHeight: 1.7 }}>
        <strong>Il datore di lavoro non vede il tuo percorso individuale.</strong>{' '}
        Le tue prenotazioni sono private e non generano alcuna classifica individuale.
        La partecipazione confermata può contribuire
        alla tua timeline personale e, in forma aggregata, alla KORA Contribution dell&apos;ecosistema.
      </p>
    </div>
  );
}

export default function Bookings() {
  const router = useRouter();
  const [mode, setMode] = useState<BookingsMode>('checking');

  useEffect(() => {
    fetch('/api/worker/pib')
      .then((r) => r.json())
      .then((data) => {
        if (data?.isSynthetic !== false) {
          setMode('demo');
        } else {
          setMode('redirecting');
          router.replace('/worker/bookings');
        }
      })
      .catch(() => setMode('demo'));
  }, [router]);

  if (mode === 'checking' || mode === 'redirecting') return null;

  return (
    <div style={{ maxWidth: 560, fontFamily: FONT }}>
      <p style={{ fontWeight: 700, fontSize: '10px', letterSpacing: '0.10em', textTransform: 'uppercase', color: TOKENS.accent, marginBottom: 10 }}>
        My KORA · Prenotazioni
      </p>
      <h1 style={{ fontWeight: 800, fontSize: '1.875rem', letterSpacing: '-0.03em', lineHeight: 1.06, color: TOKENS.ink, marginBottom: 6 }}>
        Prenotazioni &amp; Richieste
      </h1>
      <p style={{ fontSize: '13.5px', color: TOKENS.inkSecondary, lineHeight: 1.55, marginBottom: 20 }}>
        Stato delle tue richieste di partecipazione alle iniziative KORA Space.
        Richiesta → conferma — nessun marketplace, nessun pagamento.
      </p>

      <PrivacyNotice />

      {mode === 'demo' && (
        <div
          data-testid="bookings-demo-label"
          style={{
            background: 'rgba(74,127,224,0.06)', border: '1px solid rgba(74,127,224,0.18)',
            borderRadius: 8, padding: '8px 14px', marginBottom: 16,
            fontSize: 10, color: '#3B5A8A',
          }}
        >
          Demo preview · Dati dimostrativi · Non rappresenta prenotazioni reali del lavoratore
        </div>
      )}

      {/* Status vocabulary — canonical labels only (no duplicates) */}
      <div style={{ borderRadius: TOKENS.cardRadius, border: TOKENS.cardBorder, background: TOKENS.surface, padding: '14px 18px', marginBottom: 16 }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: TOKENS.ink, margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Stati prenotazione
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {([
            ['pending',   'Richiesta inviata'],
            ['approved',  'Partecipazione confermata'],
            ['rejected',  'Richiesta non approvata'],
            ['attended',  'Partecipazione completata'],
            ['cancelled', 'Annullata'],
          ] as const).map(([key, label]) => {
            const { color } = statusMeta(key);
            return (
              <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{
                  fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999,
                  background: `${color}14`, color, border: `1px solid ${color}33`,
                }}>
                  {label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Empty / placeholder state */}
      <div
        data-testid="bookings-empty-state"
        style={{ borderRadius: TOKENS.cardRadius, border: TOKENS.cardBorder, background: TOKENS.taupe, padding: '28px 24px', textAlign: 'center', marginBottom: 16 }}
      >
        <p style={{ fontSize: '13px', color: TOKENS.inkHint, lineHeight: 1.6, margin: 0 }}>
          Il flusso prenotazioni non è attivo in Foundation Light. Richiesta e conferma partecipazione si abilitano nelle fasi successive del pilot.
        </p>
        <p style={{ fontFamily: 'ui-monospace, monospace', fontSize: '10px', color: TOKENS.inkMeta, marginTop: 12 }}>
          booking_requests: preview_only · no pricing · no availability_engine
        </p>
      </div>

      <div style={{ borderRadius: TOKENS.cardRadiusSm, border: TOKENS.cardBorder, padding: '12px 16px' }}>
        <p style={{ fontSize: '11.5px', color: TOKENS.inkSecondary, lineHeight: 1.55 }}>
          Le prenotazioni in KORA non sono un marketplace. Ogni richiesta genera solo uno stato request/confirm —
          la partecipazione confermata contribuisce alla tua timeline personale e, in forma aggregata, alla KORA Contribution.
        </p>
      </div>
    </div>
  );
}
