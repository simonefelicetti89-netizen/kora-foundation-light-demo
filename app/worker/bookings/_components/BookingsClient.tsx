'use client';

// app/worker/bookings/_components/BookingsClient.tsx
// B-WORKER-3: canonical Bookings & Requests client component.
//
// This is the same real, canonical data path /my-kora/bookings already used
// (GET/DELETE /api/worker/commons/bookings, services/commons/BookingService.ts)
// — no new booking feature, no new booking states. Unlike the legacy page,
// this component never needs a "checking / demo" probe: the server wrapper
// (page.tsx) already guarantees a real WORKER session via requireWorkerUser()
// before this component ever renders.

import { useState, useEffect } from 'react';
import { TOKENS } from '@/lib/design/kora-design-tokens';
import { BoundaryBadge } from '@/components/ui/BoundaryBadge';

const FONT = 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif';

type BookingsMode = 'loading' | 'live' | 'empty';

interface BookingRecord {
  id:            string;
  post_id:       string;
  status:        string;
  created_at:    string;
  moderated_at?: string | null;
  attended_at?:  string | null;
}

interface InitiativeSummary {
  id:              string;
  title:           string;
  pillar?:         string;
  event_start_at?: string | null;
}

// Statuses where the worker may cancel their booking.
const CANCELLABLE_STATUSES = new Set(['pending', 'requested', 'approved', 'confirmed']);

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
      data-testid="worker-bookings-employer-privacy-notice"
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

export function BookingsClient() {
  const [mode, setMode] = useState<BookingsMode>('loading');
  const [liveBookings, setLiveBookings] = useState<BookingRecord[]>([]);
  const [initiativesMap, setInitiativesMap] = useState<Record<string, InitiativeSummary>>({});
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [cancelErrors, setCancelErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    Promise.all([
      fetch('/api/worker/commons/bookings').then((r) => r.ok ? r.json() : null),
      fetch('/api/commons/initiatives').then((r) => r.ok ? r.json() : null).catch(() => null),
    ]).then(([bdata, idata]) => {
      const bookings: BookingRecord[] = bdata?.bookings ?? [];
      const iMap: Record<string, InitiativeSummary> = {};
      const initiatives: InitiativeSummary[] = idata?.initiatives ?? [];
      for (const i of initiatives) iMap[i.id] = i;
      setInitiativesMap(iMap);
      setLiveBookings(bookings);
      setMode(bookings.length > 0 ? 'live' : 'empty');
    }).catch(() => setMode('empty'));
  }, []);

  async function handleCancel(bookingId: string) {
    setCancellingId(bookingId);
    setCancelErrors((prev) => { const { [bookingId]: _, ...rest } = prev; return rest; });
    try {
      const res  = await fetch(`/api/worker/commons/bookings/${bookingId}`, { method: 'DELETE' });
      const data = await res.json() as { ok: boolean; error?: string };
      if (data.ok) {
        setLiveBookings((prev) =>
          prev.map((b) => b.id === bookingId ? { ...b, status: 'cancelled' } : b),
        );
      } else {
        setCancelErrors((prev) => ({
          ...prev,
          [bookingId]: 'Impossibile annullare la richiesta. Riprova più tardi.',
        }));
      }
    } catch {
      setCancelErrors((prev) => ({
        ...prev,
        [bookingId]: 'Errore di rete. Riprova più tardi.',
      }));
    } finally {
      setCancellingId(null);
    }
  }

  if (mode === 'loading') return null;

  return (
    <div style={{ maxWidth: 560, fontFamily: FONT, padding: '24px 20px' }}>
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

      {mode === 'live' && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ marginBottom: 10 }}>
            <BoundaryBadge mode="LIVE" variant="light" />
          </div>
          <p style={{ fontSize: 11, fontWeight: 700, color: TOKENS.ink, margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Le tue prenotazioni ({liveBookings.length})
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {liveBookings.map((booking) => {
              const sm         = statusMeta(booking.status);
              const initiative = initiativesMap[booking.post_id];
              const title      = initiative?.title ?? `Iniziativa #${booking.post_id.slice(0, 8)}`;
              const pillar     = initiative?.pillar;
              const eventDate  = initiative?.event_start_at
                ? new Date(initiative.event_start_at).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' })
                : null;
              return (
                <div
                  key={booking.id}
                  data-testid={`worker-booking-record-${booking.id}`}
                  style={{
                    background: '#FFFFFF', border: '1px solid rgba(6,3,43,0.09)',
                    borderRadius: 12, padding: '14px 16px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999,
                      background: `${sm.color}14`, color: sm.color, border: `1px solid ${sm.color}33`,
                    }}>
                      {sm.label}
                    </span>
                    {pillar && (
                      <span style={{ fontSize: 9, fontWeight: 600, padding: '2px 8px', borderRadius: 4, background: 'rgba(6,3,43,0.05)', color: 'rgba(6,3,43,0.55)' }}>
                        {pillar}
                      </span>
                    )}
                    <span style={{ fontSize: 10, color: TOKENS.inkHint, marginLeft: 'auto' }}>
                      {new Date(booking.created_at).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </div>

                  <p style={{ fontSize: 13, fontWeight: 700, color: TOKENS.ink, margin: '0 0 4px', lineHeight: 1.3 }}>
                    {title}
                  </p>

                  {eventDate && (
                    <p style={{ fontSize: 10, color: TOKENS.inkSecondary, margin: '0 0 4px' }}>
                      Data evento: {eventDate}
                    </p>
                  )}

                  {booking.attended_at && (
                    <p style={{ fontSize: 10, color: '#2F7D55', margin: '4px 0 0' }}>
                      Partecipazione confermata il {new Date(booking.attended_at).toLocaleDateString('it-IT')}
                    </p>
                  )}

                  {CANCELLABLE_STATUSES.has(booking.status) && (
                    <div
                      data-testid={`worker-booking-cancel-section-${booking.id}`}
                      style={{ marginTop: 8 }}
                    >
                      <p style={{ fontSize: 10, color: TOKENS.inkSecondary, margin: '0 0 6px', fontFamily: FONT }}>
                        Puoi annullare una richiesta finché non è stata completata.
                      </p>
                      <button
                        data-testid={`worker-booking-cancel-btn-${booking.id}`}
                        disabled={cancellingId === booking.id}
                        onClick={() => void handleCancel(booking.id)}
                        style={{
                          fontSize:     11,
                          fontWeight:   600,
                          padding:      '5px 12px',
                          borderRadius: 7,
                          border:       '1px solid rgba(158,59,47,0.25)',
                          background:   'rgba(158,59,47,0.06)',
                          color:        '#9E3B2F',
                          cursor:       cancellingId === booking.id ? 'not-allowed' : 'pointer',
                          fontFamily:   FONT,
                        }}
                      >
                        {cancellingId === booking.id ? 'Annullamento…' : 'Annulla richiesta'}
                      </button>
                      {cancelErrors[booking.id] && (
                        <p style={{ fontSize: 10, color: '#9E3B2F', margin: '4px 0 0', fontFamily: FONT }}>
                          {cancelErrors[booking.id]}
                        </p>
                      )}
                    </div>
                  )}

                  {booking.status === 'cancelled' && (
                    <p
                      data-testid={`worker-booking-cancelled-reopen-notice-${booking.id}`}
                      style={{ fontSize: 10, color: TOKENS.inkSecondary, margin: '8px 0 0', lineHeight: 1.5, fontFamily: FONT }}
                    >
                      Per una nuova richiesta sulla stessa iniziativa, contatta KORA/Admin.
                    </p>
                  )}

                  {booking.status === 'attended' && (
                    <div
                      data-testid="worker-booking-attended-trace-notice"
                      style={{
                        marginTop: 10,
                        background: 'rgba(59,110,186,0.05)',
                        border: '1px solid rgba(59,110,186,0.16)',
                        borderRadius: 8,
                        padding: '10px 14px',
                      }}
                    >
                      <p style={{ fontSize: 11, fontWeight: 700, color: '#3B5A8A', margin: '0 0 6px', fontFamily: FONT }}>
                        Traccia privata My KORA
                      </p>
                      <p style={{ fontSize: 11, color: '#3B5A8A', margin: '0 0 4px', lineHeight: 1.6, fontFamily: FONT }}>
                        Questa partecipazione è una traccia privata del tuo percorso My KORA.
                      </p>
                      <p style={{ fontSize: 11, color: '#3B5A8A', margin: '0 0 4px', lineHeight: 1.6, fontFamily: FONT }}>
                        Il datore di lavoro non vede il tuo percorso individuale.
                        Eventuali segnali verso l&apos;organizzazione sono aggregati.
                      </p>
                      <p style={{ fontSize: 11, color: '#3B5A8A', margin: '0 0 6px', lineHeight: 1.6, fontFamily: FONT }}>
                        La partecipazione completata può contribuire al tuo Personal Impact Balance quando disponibile.
                      </p>
                      <p style={{ fontSize: 10, color: 'rgba(59,110,186,0.65)', margin: 0, lineHeight: 1.55, fontFamily: FONT }}>
                        Non tutta la partecipazione in KORA Space entra nel Dynamic Impact CV.
                        Solo le esperienze idonee secondo la Dynamic Impact CV policy possono diventare esperienze CV.
                        Il lavoratore controlla cosa rendere condivisibile.
                      </p>
                    </div>
                  )}

                  {!initiative && (
                    <p style={{ fontSize: 9, fontFamily: 'monospace', color: TOKENS.inkMeta, margin: '4px 0 0' }}>
                      ref: {booking.post_id.slice(0, 16)}…
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

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

      <div
        data-testid="worker-bookings-empty-state"
        style={{ borderRadius: TOKENS.cardRadius, border: TOKENS.cardBorder, background: TOKENS.taupe, padding: '28px 24px', textAlign: 'center', marginBottom: 16 }}
      >
        <p style={{ fontSize: '13px', color: TOKENS.inkHint, lineHeight: 1.6, margin: 0 }}>
          {mode === 'live'
            ? 'Vai a KORA Space per scoprire nuove iniziative e prenotare la partecipazione.'
            : 'Le tue prenotazioni KORA Space appariranno qui dopo la conferma da parte dell\'admin.'}
        </p>
        <p style={{ fontFamily: 'ui-monospace, monospace', fontSize: '10px', color: TOKENS.inkMeta, marginTop: 12 }}>
          booking_requests: live · authenticated · no_pricing
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
