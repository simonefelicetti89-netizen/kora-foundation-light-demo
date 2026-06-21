'use client';
// W-05: Prenotazioni — stato delle richieste di partecipazione alle iniziative.
// Four-state detection: checking / empty / demo (no live booking list yet in FL).
// Booking → confirm flow is active in the backend (BookingService.markAttended()),
// but the worker-facing list view requires a live commons feed (post-Gate-2).

import { useState, useEffect } from 'react';
import { TOKENS } from '@/lib/design/kora-design-tokens';

const FONT = 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif';

type BookingsMode = 'checking' | 'live' | 'empty' | 'demo';

interface BookingRecord {
  id:           string;
  post_id:      string;
  status:       string;
  created_at:   string;
  moderated_at?: string | null;
  attended_at?:  string | null;
}

const BOOKING_STATUS_COPY: Record<string, { label: string; color: string }> = {
  requested:  { label: 'Richiesta inviata',         color: '#8A5A00' },
  confirmed:  { label: 'Confermata',                 color: '#3B6EBA' },
  attended:   { label: 'Partecipazione registrata',  color: '#2F7D55' },
  cancelled:  { label: 'Annullata',                  color: '#9E3B2F' },
};

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
        Le tue prenotazioni sono private. La partecipazione confermata può contribuire
        alla tua timeline personale e, in forma aggregata, alla KORA Contribution dell&apos;ecosistema.
      </p>
    </div>
  );
}

export default function Bookings() {
  const [mode, setMode] = useState<BookingsMode>('checking');
  const [liveBookings, setLiveBookings] = useState<BookingRecord[]>([]);

  useEffect(() => {
    fetch('/api/worker/pib')
      .then((r) => r.json())
      .then((data) => {
        if (data?.isSynthetic !== false) {
          setMode('demo');
        } else {
          // Real authenticated worker — try to fetch actual bookings
          fetch('/api/worker/commons/bookings')
            .then((r) => r.ok ? r.json() : null)
            .then((bdata) => {
              const bookings: BookingRecord[] = bdata?.bookings ?? [];
              setLiveBookings(bookings);
              setMode(bookings.length > 0 ? 'live' : 'empty');
            })
            .catch(() => setMode('empty'));
        }
      })
      .catch(() => setMode('demo'));
  }, []);

  if (mode === 'checking') return null;

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

      {/* Live bookings list */}
      {mode === 'live' && (
        <div style={{ marginBottom: 20 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: TOKENS.ink, margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Le tue prenotazioni ({liveBookings.length})
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {liveBookings.map((booking) => {
              const statusMeta = BOOKING_STATUS_COPY[booking.status] ?? { label: booking.status, color: TOKENS.inkHint };
              return (
                <div
                  key={booking.id}
                  data-testid={`booking-record-${booking.id}`}
                  style={{
                    background: '#FFFFFF', border: '1px solid rgba(6,3,43,0.09)',
                    borderRadius: 12, padding: '14px 16px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999,
                      background: `${statusMeta.color}14`, color: statusMeta.color,
                      border: `1px solid ${statusMeta.color}33`,
                    }}>
                      {statusMeta.label}
                    </span>
                    <span style={{ fontSize: 10, color: TOKENS.inkHint }}>
                      {new Date(booking.created_at).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                  <p style={{ fontSize: 11, fontFamily: 'monospace', color: TOKENS.inkMeta, margin: 0 }}>
                    post: {booking.post_id.slice(0, 8)}…
                  </p>
                  {booking.attended_at && (
                    <p style={{ fontSize: 10, color: TOKENS.inkHint, margin: '4px 0 0', fontFamily: 'monospace' }}>
                      attended: {new Date(booking.attended_at).toLocaleDateString('it-IT')}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Status vocabulary */}
      <div style={{ borderRadius: TOKENS.cardRadius, border: TOKENS.cardBorder, background: TOKENS.surface, padding: '14px 18px', marginBottom: 16 }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: TOKENS.ink, margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Stati prenotazione
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {Object.entries(BOOKING_STATUS_COPY).map(([key, { label, color }]) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{
                fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999,
                background: `${color}14`, color, border: `1px solid ${color}33`,
              }}>
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Empty / placeholder state */}
      <div
        data-testid="bookings-empty-state"
        style={{ borderRadius: TOKENS.cardRadius, border: TOKENS.cardBorder, background: TOKENS.taupe, padding: '28px 24px', textAlign: 'center', marginBottom: 16 }}
      >
        <p style={{ fontSize: '13px', color: TOKENS.inkHint, lineHeight: 1.6, margin: 0 }}>
          {mode === 'live'
            ? 'Vai a KORA Commons per scoprire nuove iniziative e prenotare la partecipazione.'
            : mode === 'empty'
            ? 'Le tue prenotazioni KORA Space appariranno qui dopo la conferma da parte dell\'admin.'
            : 'Il flusso prenotazioni non è attivo in Foundation Light. Richiesta e conferma partecipazione si abilitano nelle fasi successive del pilot.'}
        </p>
        <p style={{ fontFamily: 'ui-monospace, monospace', fontSize: '10px', color: TOKENS.inkMeta, marginTop: 12 }}>
          booking_requests: {mode === 'live' ? 'live · authenticated · no_pricing' : mode === 'empty' ? 'live_path_pending · no_data_yet' : 'preview_only · no pricing · no availability_engine'}
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
