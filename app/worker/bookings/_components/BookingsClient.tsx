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
//
// KORA-WP-129 Wave 4b (W2): presentation migrated onto the governed system.
// No booking state, status label, cancellation rule or API call changed. The
// one behavioural improvement is that `loading` now RENDERS the governed
// LOADING state instead of returning null, which was a real KORA-WP-140 gap:
// the surface used to show nothing at all while in flight.

import { useState, useEffect } from 'react';
import { BADGE_TOKENS, TOKENS, SPACE, typeStyle, TYPE_FAMILY, PX } from '@/lib/design/kora-design-tokens';
import { BoundaryBadge } from '@/components/ui/BoundaryBadge';
import { PageHead, Workspace, Col, Region, Notice, Status, Loading, NoData } from '@/components/ui/px';

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

// Labels are unchanged. `tone` carries the SAME semantic the per-status colour
// carried before, through the governed tone system rather than a raw hex:
// watch -> warn, success -> ok, critical -> risk, informational -> info.
type StatusTone = 'ok' | 'info' | 'warn' | 'risk';
const BOOKING_STATUS_COPY: Record<string, { label: string; tone: StatusTone }> = {
  pending:   { label: 'Richiesta inviata',          tone: 'warn' },
  requested: { label: 'Richiesta inviata',          tone: 'warn' },
  approved:  { label: 'Partecipazione confermata',  tone: 'ok'   },
  confirmed: { label: 'Partecipazione confermata',  tone: 'ok'   },
  rejected:  { label: 'Richiesta non approvata',    tone: 'risk' },
  attended:  { label: 'Partecipazione completata',  tone: 'info' },
  cancelled: { label: 'Annullata',                  tone: 'info' },
};

function statusMeta(status: string): { label: string; tone: StatusTone } {
  return BOOKING_STATUS_COPY[status] ?? { label: 'Stato in verifica', tone: 'info' };
}

function itDate(value: string): string {
  return new Date(value).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' });
}

function PrivacyNotice() {
  return (
    <div data-testid="worker-bookings-employer-privacy-notice">
      <Notice tone="ok">
        <strong>Il datore di lavoro non vede il tuo percorso individuale.</strong>{' '}
        Le tue prenotazioni sono private e non generano alcuna classifica individuale.
        La partecipazione confermata può contribuire
        alla tua timeline personale e, in forma aggregata, alla KORA Contribution dell&apos;ecosistema.
      </Notice>
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

  return (
    <div
      data-testid="worker-bookings-page"
      style={{ maxWidth: 1180, margin: '0 auto', padding: `${SPACE.lg}px ${SPACE.md}px ${SPACE['2xl']}px`, fontFamily: TYPE_FAMILY }}
    >
      <PageHead
        eyebrow="My KORA · Prenotazioni"
        title="Prenotazioni & Richieste"
        lead={<>
          Stato delle tue richieste di partecipazione alle iniziative KORA Space.
          Richiesta → conferma — nessun marketplace, nessun pagamento.
        </>}
        meta={mode === 'live' ? <BoundaryBadge mode="LIVE" variant="light" /> : undefined}
      />

      <PrivacyNotice />

      <Workspace style={{ marginTop: SPACE.lg }}>

        {/* THE RECORD — the worker's own requests and what they can do next. */}
        <Col span="main">
          <Region label={mode === 'live' ? `Le tue prenotazioni (${liveBookings.length})` : 'Le tue prenotazioni'}>
            {mode === 'loading' && <Loading label="Caricamento delle tue prenotazioni." />}

            {mode === 'empty' && (
              <div data-testid="worker-bookings-empty-state">
                <NoData missing="Le tue prenotazioni KORA Space appariranno qui dopo la conferma da parte dell'admin." />
              </div>
            )}

            {mode === 'live' && (
              <div>
                {liveBookings.map((booking, idx) => {
                  const sm         = statusMeta(booking.status);
                  const initiative = initiativesMap[booking.post_id];
                  const title      = initiative?.title ?? `Iniziativa #${booking.post_id.slice(0, 8)}`;
                  const pillar     = initiative?.pillar;
                  const eventDate  = initiative?.event_start_at ? itDate(initiative.event_start_at) : null;
                  return (
                    <div
                      key={booking.id}
                      data-testid={`worker-booking-record-${booking.id}`}
                      style={{
                        display: 'grid', gap: SPACE.xs, padding: `${SPACE.md}px 0`,
                        borderBottom: idx === liveBookings.length - 1 ? undefined : `1px solid ${PX.line}`,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: SPACE.sm, flexWrap: 'wrap' }}>
                        <p style={{ margin: 0, ...typeStyle('label', { weight: 700 }), color: TOKENS.ink }}>
                          {title}
                          {pillar && <span style={{ ...typeStyle('caption'), color: TOKENS.inkHint }}>{' · '}{pillar}</span>}
                        </p>
                        <Status tone={sm.tone}>{sm.label}</Status>
                      </div>

                      <p style={{ margin: 0, ...typeStyle('caption'), color: TOKENS.inkHint }}>
                        Richiesta il {itDate(booking.created_at)}
                        {eventDate && <>{' · '}Data evento: {eventDate}</>}
                        {booking.attended_at && <>{' · '}Partecipazione confermata il {new Date(booking.attended_at).toLocaleDateString('it-IT')}</>}
                      </p>

                      {CANCELLABLE_STATUSES.has(booking.status) && (
                        <div data-testid={`worker-booking-cancel-section-${booking.id}`} style={{ display: 'grid', gap: SPACE.xs, justifyItems: 'start' }}>
                          <p style={{ margin: 0, ...typeStyle('caption'), color: TOKENS.inkSecondary }}>
                            Puoi annullare una richiesta finché non è stata completata.
                          </p>
                          <button
                            data-testid={`worker-booking-cancel-btn-${booking.id}`}
                            disabled={cancellingId === booking.id}
                            onClick={() => void handleCancel(booking.id)}
                            style={{
                              ...typeStyle('caption', { weight: 600 }),
                              padding:      `${SPACE.xs}px ${SPACE.md}px`,
                              borderRadius: 7,
                              border:       '1px solid rgba(158,59,47,0.25)',
                              background:   'rgba(158,59,47,0.06)',
                              color:        TOKENS.critical,
                              cursor:       cancellingId === booking.id ? 'not-allowed' : 'pointer',
                            }}
                          >
                            {cancellingId === booking.id ? 'Annullamento…' : 'Annulla richiesta'}
                          </button>
                          {cancelErrors[booking.id] && (
                            <p style={{ margin: 0, ...typeStyle('caption', { weight: 600 }), color: TOKENS.critical }} role="alert">
                              {cancelErrors[booking.id]}
                            </p>
                          )}
                        </div>
                      )}

                      {booking.status === 'cancelled' && (
                        <p
                          data-testid={`worker-booking-cancelled-reopen-notice-${booking.id}`}
                          style={{ margin: 0, ...typeStyle('caption'), color: TOKENS.inkSecondary }}
                        >
                          Per una nuova richiesta sulla stessa iniziativa, contatta KORA/Admin.
                        </p>
                      )}

                      {booking.status === 'attended' && (
                        <div data-testid="worker-booking-attended-trace-notice" style={{ display: 'grid', gap: SPACE.xs }}>
                          <p style={{ margin: 0, ...typeStyle('meta'), color: BADGE_TOKENS.info.text }}>
                            Traccia privata My KORA
                          </p>
                          <p style={{ margin: 0, ...typeStyle('caption'), color: BADGE_TOKENS.info.text }}>
                            Questa partecipazione è una traccia privata del tuo percorso My KORA.
                            Il datore di lavoro non vede il tuo percorso individuale.
                            Eventuali segnali verso l&apos;organizzazione sono aggregati.
                            La partecipazione completata può contribuire al tuo Personal Impact Balance quando disponibile.
                          </p>
                          <p style={{ margin: 0, ...typeStyle('caption'), color: TOKENS.inkHint }}>
                            Non tutta la partecipazione in KORA Space entra nel Dynamic Impact CV.
                            Solo le esperienze idonee secondo la Dynamic Impact CV policy possono diventare esperienze CV.
                            Il lavoratore controlla cosa rendere condivisibile.
                          </p>
                        </div>
                      )}

                      {!initiative && (
                        <p style={{ margin: 0, ...typeStyle('caption'), fontFamily: 'ui-monospace, monospace', color: TOKENS.inkMeta }}>
                          ref: {booking.post_id.slice(0, 16)}…
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Region>
        </Col>

        {/* Reference and next step — subordinate to the record itself. */}
        <Col span="rail">
          <Region label="Stati prenotazione" tone="inset">
            <div style={{ display: 'flex', flexDirection: 'column', gap: SPACE.sm, alignItems: 'flex-start' }}>
              {([
                ['pending',   'Richiesta inviata'],
                ['approved',  'Partecipazione confermata'],
                ['rejected',  'Richiesta non approvata'],
                ['attended',  'Partecipazione completata'],
                ['cancelled', 'Annullata'],
              ] as const).map(([key, label]) => (
                <Status key={key} tone={statusMeta(key).tone}>{label}</Status>
              ))}
            </div>
          </Region>

          <Region label="Prossimo passo">
            <p style={{ margin: 0, ...typeStyle('secondary'), color: TOKENS.inkSecondary }}>
              {mode === 'live'
                ? 'Vai a KORA Space per scoprire nuove iniziative e prenotare la partecipazione.'
                : 'Le tue prenotazioni KORA Space appariranno qui dopo la conferma da parte dell\'admin.'}
            </p>
            <p style={{ margin: `${SPACE.sm}px 0 0`, ...typeStyle('meta'), color: TOKENS.inkMeta }}>
              booking_requests: live · authenticated · no_pricing
            </p>
          </Region>

          <Region label="Come funzionano le prenotazioni" tone="inset">
            <p style={{ margin: 0, ...typeStyle('caption'), color: TOKENS.inkSecondary }}>
              Le prenotazioni in KORA non sono un marketplace. Ogni richiesta genera solo uno stato request/confirm —
              la partecipazione confermata contribuisce alla tua timeline personale e, in forma aggregata, alla KORA Contribution.
            </p>
          </Region>
        </Col>
      </Workspace>
    </div>
  );
}
