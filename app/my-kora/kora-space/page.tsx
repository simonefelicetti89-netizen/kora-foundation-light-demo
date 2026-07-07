'use client';
// W-KS: KORA Space — Worker preview.
// B142-A: spazio condiviso per il worker — iniziative, richieste, opportunità.
//
// Privacy invariants:
//   - Nessun dato company individuale (no KORA Index, no KPI aziendali, no scoring)
//   - Nessuna classifica, nessun ranking, nessun confronto tra lavoratori
//   - Partecipazione non visibile all'azienda in forma individuale
//   - Four-state detection: checking / live / empty / demo (same pattern as PIB and collective)
//   - Inline booking (B-IB): POST /api/worker/commons/bookings con { post_id } da JWT.
//     Auth da cookie session — nessun identificatore di identità come query param.
//     Identità del lavoratore risolta server-side — mai esposta nel componente UI.

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRole } from '@/lib/demo-state';
import { myKoraPreviewService } from '@/services/my-kora-preview/MyKoraPreviewService';
import { TOKENS } from '@/lib/design/kora-design-tokens';

const FONT = 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif';

type SpaceItemType = 'initiative' | 'request' | 'opportunity' | 'kora_recommendation';
type SpaceMode = 'checking' | 'live' | 'empty' | 'demo';

interface LiveInitiative {
  id:              string;
  title:           string;
  body?:           string;
  pillar?:         string;
  category?:       string;
  opening_grade?:  string;
  event_start_at?: string;
  capacity_internal?: number;
  capacity_cross?:    number;
}

// Only post_id + status used from booking records — no identity fields stored in UI state.
interface BookingSummary {
  post_id: string;
  status:  string;
}

interface KoraSpaceItem {
  id:           string;
  type:         SpaceItemType;
  type_label:   string;
  title:        string;
  pillars:      string[];
  status_label: string;
  description:  string;
  cta:          string;
}

const KORA_SPACE_ITEMS: KoraSpaceItem[] = [
  {
    id:           'ks-001',
    type:         'initiative',
    type_label:   'Initiative',
    title:        'Percorso mentoring intergenerazionale',
    pillars:      ['CONNECTION', 'LEGACY'],
    status_label: 'Aperta',
    description:  'Un percorso di incontro tra generazioni per trasferire competenze e costruire relazioni durature.',
    cta:          'Scopri',
  },
  {
    id:           'ks-002',
    type:         'request',
    type_label:   'Request',
    title:        'Raccolta bisogni su formazione digitale',
    pillars:      ['GROWTH'],
    status_label: 'In ascolto',
    description:  "KORA sta raccogliendo segnali aggregati sul fabbisogno formativo digitale dell'organizzazione.",
    cta:          'Vedi richiesta',
  },
  {
    id:           'ks-003',
    type:         'opportunity',
    type_label:   'Opportunity',
    title:        'Volontariato territoriale Q2',
    pillars:      ['IMPACT'],
    status_label: 'Disponibile',
    description:  'Opportunità di impatto locale con partner certificati KORA nel territorio.',
    cta:          'Partecipa',
  },
  {
    id:           'ks-004',
    type:         'kora_recommendation',
    type_label:   'KORA Recommendation',
    title:        'Bilanciare il trimestre con iniziative LIFE',
    pillars:      ['LIFE'],
    status_label: 'Suggerimento KORA',
    description:  "L'attivazione LIFE è sotto la media del periodo. KORA raccomanda di ampliare le iniziative benessere.",
    cta:          'Approfondisci',
  },
];

const TYPE_STYLE: Record<SpaceItemType, { color: string; bg: string; border: string }> = {
  initiative:          { color: '#2F7D55', bg: 'rgba(47,125,85,0.08)',   border: 'rgba(47,125,85,0.22)'   },
  request:             { color: '#8A5A00', bg: 'rgba(217,154,43,0.08)',  border: 'rgba(217,154,43,0.22)'  },
  opportunity:         { color: '#4A7FE0', bg: 'rgba(74,127,224,0.08)', border: 'rgba(74,127,224,0.22)'  },
  kora_recommendation: { color: '#B5512E', bg: 'rgba(181,81,46,0.08)',  border: 'rgba(181,81,46,0.22)'   },
};

const PILLAR_COLORS: Record<string, string> = {
  LIFE: '#C76F3D', GROWTH: '#2F7D55', CONNECTION: '#D99767', IMPACT: '#4A7FE0', LEGACY: '#8A7562',
};

// Canonical Italian booking status labels (mirrors bookings/page.tsx)
const BOOKING_STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  pending:   { label: 'Richiesta inviata',         color: '#8A5A00', bg: 'rgba(192,125,42,0.10)' },
  approved:  { label: 'Partecipazione confermata', color: '#2F7D55', bg: 'rgba(47,125,85,0.08)'  },
  rejected:  { label: 'Richiesta non approvata',   color: '#9E3B2F', bg: 'rgba(158,59,47,0.08)'  },
  attended:  { label: 'Partecipazione completata', color: '#3B6EBA', bg: 'rgba(59,110,186,0.08)' },
  cancelled: { label: 'Annullata',                 color: 'rgba(6,3,43,0.45)', bg: 'rgba(6,3,43,0.05)' },
};
function bookingStatusMeta(s: string) {
  return BOOKING_STATUS_META[s] ?? { label: 'Stato in verifica', color: 'rgba(6,3,43,0.40)', bg: 'rgba(6,3,43,0.04)' };
}

function OperatingModelNotice() {
  return (
    <div
      data-testid="space-operating-model-worker"
      style={{
        background: 'rgba(6,3,43,0.03)', border: '1px solid rgba(6,3,43,0.09)',
        borderRadius: 12, padding: '14px 18px', marginBottom: 16,
      }}
    >
      <p style={{ fontSize: 12, fontWeight: 700, color: TOKENS.ink, margin: '0 0 6px', lineHeight: 1.4 }}>
        KORA Space è il luogo in cui KORA passa dalla misurazione all&apos;attivazione.
      </p>
      <p style={{ fontSize: 12, color: TOKENS.inkSecondary, margin: 0, lineHeight: 1.65 }}>
        Non è un social network. Non è sorveglianza dei lavoratori.
        La partecipazione individuale resta privata. Le aziende vedono solo segnali aggregati.
        KORA Contribution™ è un indicatore companion — non è una componente del KORA Index™.
      </p>
    </div>
  );
}

function PrivacyNotice() {
  return (
    <div
      data-testid="kora-space-worker-privacy"
      style={{
        background: 'rgba(47,125,85,0.06)', border: '1.5px solid rgba(47,125,85,0.22)',
        borderRadius: 12, padding: '14px 18px', marginBottom: 24,
      }}
    >
      <p
        data-testid="space-employer-privacy-notice"
        style={{ fontSize: 12, color: '#2F7D55', margin: 0, lineHeight: 1.75 }}
      >
        KORA Space mostra contenuti e opportunità condivise. Non espone dati individuali dei lavoratori.{' '}
        Le richieste dei lavoratori sono gestite solo in forma aggregata o supervisionata.{' '}
        La partecipazione individuale non è visibile all&apos;azienda in questa vista.{' '}
        KORA misura l&apos;organizzazione, non classifica le persone.{' '}
        <strong>Il datore di lavoro non vede il tuo percorso individuale.</strong>{' '}
        La tua partecipazione può contribuire alla tua timeline personale e, in forma aggregata,
        alla KORA Contribution dell&apos;ecosistema.{' '}
        Nessuna condivisione pubblica avviene automaticamente.
      </p>
    </div>
  );
}

function BookingRequestNotice() {
  return (
    <div
      data-testid="space-booking-request-notice"
      style={{
        background: 'rgba(47,125,85,0.04)', border: '1px solid rgba(47,125,85,0.14)',
        borderRadius: 10, padding: '10px 14px', marginBottom: 16,
        fontSize: 11, color: '#2F5A42', fontFamily: FONT, lineHeight: 1.65,
      }}
    >
      <strong>La richiesta di partecipazione è privata.</strong>{' '}
      KORA/Admin può gestire lo stato operativo della partecipazione — il tuo percorso individuale
      resta sempre privato.{' '}
      La partecipazione completata può generare una traccia personale privata nel tuo percorso My KORA.
    </div>
  );
}

function TimelineConnectionNote() {
  return (
    <div
      data-testid="space-timeline-connection-note"
      style={{
        background: TOKENS.canvas, border: `1px solid ${TOKENS.inkBorder}`,
        borderRadius: 10, padding: '12px 16px', marginBottom: 20,
      }}
    >
      <p style={{ fontSize: 12, fontWeight: 700, color: TOKENS.ink, margin: '0 0 6px', lineHeight: 1.4 }}>
        Partecipazione, traccia personale e Dynamic Impact CV
      </p>
      <ul style={{ fontSize: 12, color: TOKENS.inkSecondary, margin: 0, paddingLeft: 16, lineHeight: 1.75 }}>
        <li>
          La partecipazione confermata può apparire nella tua timeline personale come traccia privata,
          quando sarà disponibile un ciclo di scoring collegato.
        </li>
        <li>
          L&apos;inclusione nel Dynamic Impact CV dipende dalla Dynamic Impact CV policy e dalla
          classificazione CV-eligible dell&apos;iniziativa.
        </li>
        <li>
          Non tutta la partecipazione in KORA Space diventa badge condivisibile.
        </li>
        <li>
          Sei tu a decidere cosa condividere dalla tua timeline personale — il datore di lavoro
          non vede il tuo percorso individuale.
        </li>
      </ul>
    </div>
  );
}

function PageHeader() {
  return (
    <>
      <Link
        href="/my-kora"
        style={{ fontSize: 11, color: TOKENS.inkHint, textDecoration: 'none', display: 'inline-block', marginBottom: 20 }}
      >
        ← My KORA
      </Link>
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
          <span style={{
            fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase',
            color: '#B5512E', background: 'rgba(181,81,46,0.08)', borderRadius: 4,
            padding: '2px 8px', border: '1px solid rgba(181,81,46,0.22)',
          }}>
            supervisionato da KORA
          </span>
          <span style={{
            fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
            color: TOKENS.inkHint, background: TOKENS.taupe, borderRadius: 4,
            padding: '2px 8px', border: `1px solid ${TOKENS.inkBorder}`,
          }}>
            Foundation Light preview
          </span>
        </div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: TOKENS.ink, letterSpacing: '-0.03em', margin: '0 0 6px' }}>
          KORA Space
        </h1>
        <p style={{ fontSize: 13, color: TOKENS.inkSecondary, margin: 0, lineHeight: 1.55 }}>
          Lo spazio condiviso per iniziative, richieste e opportunità di attivazione.
        </p>
      </div>
    </>
  );
}

export default function WorkerKoraSpacePage() {
  const { activeRole } = useRole();
  const [mode, setMode] = useState<SpaceMode>('checking');
  const [liveInitiatives, setLiveInitiatives] = useState<LiveInitiative[]>([]);
  // post_id → booking status — uses only the post_id key, no identity fields.
  const [bookingsByPostId, setBookingsByPostId] = useState<Record<string, string>>({});
  const [bookingLoadingId, setBookingLoadingId] = useState<string | null>(null);
  const [bookingErrors, setBookingErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetch('/api/worker/pib')
      .then((r) => r.json())
      .then((data) => {
        if (data?.isSynthetic !== false) {
          setMode('demo');
        } else {
          // Real authenticated worker — fetch initiatives + existing bookings in parallel
          Promise.all([
            fetch('/api/commons/initiatives').then((r) => r.ok ? r.json() : null),
            fetch('/api/worker/commons/bookings').then((r) => r.ok ? r.json() : null).catch(() => null),
          ]).then(([idata, bdata]) => {
            const items: LiveInitiative[] = idata?.initiatives ?? [];
            // Build post_id → status map from existing bookings (no worker identity fields)
            const bMap: Record<string, string> = {};
            const bList: BookingSummary[] = bdata?.bookings ?? [];
            for (const b of bList) bMap[b.post_id] = b.status;
            setBookingsByPostId(bMap);
            setLiveInitiatives(items);
            setMode(items.length > 0 ? 'live' : 'empty');
          }).catch(() => setMode('empty'));
        }
      })
      .catch(() => setMode('demo'));
  }, []);

  // Inline booking request — POST to existing worker booking API.
  // Auth from JWT cookie (requireWorkerUser server-side) — no identity query params.
  async function requestBooking(postId: string) {
    setBookingLoadingId(postId);
    setBookingErrors((prev) => { const { [postId]: _, ...rest } = prev; return rest; });
    try {
      const res = await fetch('/api/worker/commons/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ post_id: postId }),
      });
      const data = await res.json() as { ok: boolean; error?: string };
      if (data.ok) {
        setBookingsByPostId((prev) => ({ ...prev, [postId]: 'pending' }));
      } else {
        setBookingErrors((prev) => ({
          ...prev,
          [postId]: 'Impossibile completare la richiesta. Riprova più tardi.',
        }));
      }
    } catch {
      setBookingErrors((prev) => ({
        ...prev,
        [postId]: 'Errore di rete. Riprova più tardi.',
      }));
    } finally {
      setBookingLoadingId(null);
    }
  }

  if (!myKoraPreviewService.canAccess(activeRole) && mode !== 'checking') {
    return (
      <div
        data-testid="access-denied"
        style={{
          borderRadius: 12, border: '1px solid rgba(158,59,47,0.20)',
          background: 'rgba(158,59,47,0.06)', padding: '24px', textAlign: 'center',
        }}
      >
        <p style={{ fontSize: 14, fontWeight: 600, color: '#9E3B2F', margin: '0 0 4px' }}>Accesso Limitato</p>
        <p style={{ fontSize: 12, color: 'rgba(158,59,47,0.90)', margin: 0 }}>
          KORA Space worker preview è accessibile solo ai lavoratori.
        </p>
      </div>
    );
  }

  if (mode === 'checking') return null;

  if (mode === 'live') {
    return (
      <div style={{ fontFamily: FONT }} data-testid="kora-space-worker">
        <PageHeader />
        <OperatingModelNotice />
        <PrivacyNotice />
        <BookingRequestNotice />
        <h2 style={{
          fontSize: 13, fontWeight: 700, color: TOKENS.inkSecondary,
          margin: '0 0 14px', textTransform: 'uppercase', letterSpacing: '0.06em',
        }}>
          Iniziative disponibili
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 28 }}>
          {liveInitiatives.map((item) => {
            const pillarColor      = item.pillar ? PILLAR_COLORS[item.pillar] : TOKENS.accent;
            const isCrossCompany   = item.opening_grade === 'cross_company';
            const existingStatus   = bookingsByPostId[item.id];
            const isThisLoading    = bookingLoadingId === item.id;
            const cardError        = bookingErrors[item.id];

            return (
              <div
                key={item.id}
                data-testid={`kora-space-live-card-${item.id}`}
                style={{
                  background: '#FFFFFF', border: '1px solid rgba(6,3,43,0.09)',
                  borderRadius: 14, padding: '18px 20px',
                }}
              >
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8, alignItems: 'center' }}>
                  {item.pillar && (
                    <span style={{
                      fontSize: 10, fontWeight: 600, color: pillarColor,
                      background: `${pillarColor}18`, borderRadius: 4, padding: '2px 8px',
                    }}>
                      {item.pillar}
                    </span>
                  )}
                  {item.opening_grade && (
                    <span style={{
                      fontSize: 10, fontWeight: 600, color: '#2F7D55',
                      background: 'rgba(47,125,85,0.08)', borderRadius: 4, padding: '2px 8px',
                    }}>
                      {item.opening_grade === 'cross_company' ? 'Cross-azienda' : item.opening_grade === 'company_internal' ? 'Interna' : 'Estesa'}
                    </span>
                  )}
                  {item.event_start_at && (
                    <span style={{ fontSize: 10, color: TOKENS.inkHint, marginLeft: 'auto' }}>
                      {new Date(item.event_start_at).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  )}
                </div>
                <p style={{ fontSize: 14, fontWeight: 700, color: TOKENS.ink, margin: '0 0 6px', lineHeight: 1.3 }}>
                  {item.title}
                </p>
                {item.body && (
                  <p style={{ fontSize: 12, color: TOKENS.inkSecondary, margin: '0 0 14px', lineHeight: 1.6,
                    display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {item.body}
                  </p>
                )}

                {/* ── CTA: cross_company only ── */}
                {isCrossCompany && (
                  <div>
                    {/* Already has an active/terminal booking for this initiative */}
                    {existingStatus && existingStatus !== 'cancelled' ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                        <span
                          data-testid={`space-booking-status-${item.id}`}
                          style={{
                            fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 999,
                            background: bookingStatusMeta(existingStatus).bg,
                            color:      bookingStatusMeta(existingStatus).color,
                          }}
                        >
                          {bookingStatusMeta(existingStatus).label}
                        </span>
                        {(existingStatus === 'pending' || existingStatus === 'approved') && (
                          <Link
                            href="/my-kora/bookings"
                            style={{ fontSize: 11, color: '#2F7D55', textDecoration: 'none', fontWeight: 600 }}
                          >
                            → Vedi le tue prenotazioni
                          </Link>
                        )}
                      </div>
                    ) : (
                      /* No booking or cancelled — show inline request button */
                      <button
                        data-testid={`space-request-booking-${item.id}`}
                        onClick={() => void requestBooking(item.id)}
                        disabled={isThisLoading}
                        style={{
                          fontSize: 11, fontWeight: 700, color: '#FFFFFF',
                          background: isThisLoading ? 'rgba(47,125,85,0.50)' : '#2F7D55',
                          border: 'none', borderRadius: 7, padding: '7px 16px',
                          cursor: isThisLoading ? 'not-allowed' : 'pointer',
                          fontFamily: FONT,
                        }}
                      >
                        {isThisLoading ? 'Invio richiesta…' : 'Richiedi partecipazione'}
                      </button>
                    )}

                    {/* Per-card error */}
                    {cardError && (
                      <p
                        data-testid={`space-booking-error-${item.id}`}
                        style={{ fontSize: 11, color: '#9E3B2F', margin: '6px 0 0', fontFamily: FONT }}
                      >
                        {cardError}
                      </p>
                    )}

                    <p style={{ fontSize: 9, color: TOKENS.inkHint, margin: '6px 0 0', lineHeight: 1.5 }}>
                      La prenotazione è soggetta ad approvazione KORA. Il tuo nome non è visibile all&apos;organizzatore.
                    </p>

                    {/* Handoff to /worker/commons for full page — always available */}
                    <Link
                      href="/worker/commons"
                      style={{ fontSize: 10, color: TOKENS.inkSecondary, textDecoration: 'none', display: 'inline-block', marginTop: 4 }}
                    >
                      Apri scheda completa su KORA Space →
                    </Link>
                  </div>
                )}

                {/* Non-cross_company: navigate to full page */}
                {!isCrossCompany && (
                  <Link
                    href="/worker/commons"
                    style={{ fontSize: 11, fontWeight: 600, color: TOKENS.accent, textDecoration: 'none' }}
                  >
                    Scopri su KORA Space →
                  </Link>
                )}
              </div>
            );
          })}
        </div>

        {/* Booking lifecycle — non-suppressible */}
        <div
          data-testid="space-booking-lifecycle"
          style={{
            background: 'rgba(47,125,85,0.04)', border: '1px solid rgba(47,125,85,0.14)',
            borderRadius: 10, padding: '12px 16px', marginBottom: 20,
          }}
        >
          <p style={{ fontSize: 11, fontWeight: 700, color: '#2F5A42', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Come funziona la partecipazione
          </p>
          <ol style={{ fontSize: 11, color: '#2F5A42', margin: 0, paddingLeft: 16, lineHeight: 1.9 }}>
            <li>Richiedi partecipazione su KORA Space</li>
            <li>KORA esamina la richiesta</li>
            <li>Ricevi conferma (partecipazione confermata)</li>
            <li>Partecipazione registrata dopo l&apos;evento</li>
            <li>Traccia privata nel tuo percorso personale (solo tua)</li>
            <li>Segnale aggregato per l&apos;ecosistema — il datore di lavoro non vede il tuo percorso individuale</li>
          </ol>
        </div>

        <TimelineConnectionNote />
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <Link href="/worker/commons" style={{ fontSize: 12, fontWeight: 600, color: TOKENS.accent, textDecoration: 'none' }}>
            → KORA Space (feed completo e prenotazioni)
          </Link>
          <Link href="/my-kora/personal-impact-balance" style={{ fontSize: 12, fontWeight: 600, color: TOKENS.inkSecondary, textDecoration: 'none' }}>
            → Personal Impact Balance
          </Link>
          <Link href="/my-kora/bookings" style={{ fontSize: 12, fontWeight: 600, color: TOKENS.inkSecondary, textDecoration: 'none' }}>
            → Le mie prenotazioni
          </Link>
        </div>
        <p style={{ fontSize: 10, fontFamily: 'monospace', color: TOKENS.inkHint, marginTop: 28 }}>
          live_feed: true · session_authenticated · inline_booking: true · KORA Space v0.1 · B142-A
        </p>
      </div>
    );
  }

  if (mode === 'empty') {
    return (
      <div style={{ fontFamily: FONT }} data-testid="kora-space-worker">
        <PageHeader />
        <OperatingModelNotice />
        <PrivacyNotice />
        <div
          data-testid="kora-space-empty"
          style={{
            textAlign: 'center', padding: '40px 24px',
            background: 'rgba(6,3,43,0.03)', borderRadius: 12,
            border: '1px dashed rgba(6,3,43,0.12)', marginBottom: 24,
          }}
        >
          <p style={{ fontSize: 14, fontWeight: 600, color: TOKENS.ink, margin: '0 0 8px' }}>
            Nessuna iniziativa disponibile
          </p>
          <p style={{ fontSize: 12, color: TOKENS.inkSecondary, margin: '0 0 12px', lineHeight: 1.6 }}>
            Le iniziative KORA Space pubblicate dalla tua azienda appariranno qui.
            Nessuna iniziativa è stata ancora pubblicata per il tuo profilo.
          </p>
          <Link
            href="/worker/commons"
            style={{ fontSize: 12, fontWeight: 600, color: TOKENS.accent, textDecoration: 'none' }}
          >
            Vai a KORA Space per esplorare la rete →
          </Link>
        </div>
        <TimelineConnectionNote />
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <Link href="/my-kora/personal-impact-balance" style={{ fontSize: 12, fontWeight: 600, color: TOKENS.accent, textDecoration: 'none' }}>
            → Personal Impact Balance
          </Link>
          <Link href="/worker/workspace" style={{ fontSize: 12, fontWeight: 600, color: TOKENS.inkSecondary, textDecoration: 'none' }}>
            → Spazio operativo
          </Link>
        </div>
      </div>
    );
  }

  // demo mode — synthetic content with visible label
  return (
    <div style={{ fontFamily: FONT }} data-testid="kora-space-worker">
      <PageHeader />

      {/* Demo label */}
      <div
        data-testid="kora-space-demo-label"
        style={{
          background: 'rgba(74,127,224,0.06)', border: '1px solid rgba(74,127,224,0.18)',
          borderRadius: 8, padding: '8px 14px', marginBottom: 16,
          fontSize: 10, color: '#3B5A8A',
        }}
      >
        Demo preview · Dati dimostrativi · Non rappresenta iniziative reali del lavoratore
      </div>

      <OperatingModelNotice />
      <PrivacyNotice />

      {/* In evidenza */}
      <h2 style={{
        fontSize: 13, fontWeight: 700, color: TOKENS.inkSecondary,
        margin: '0 0 14px', textTransform: 'uppercase', letterSpacing: '0.06em',
      }}>
        In evidenza
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 32 }}>
        {KORA_SPACE_ITEMS.map((item) => {
          const ts = TYPE_STYLE[item.type];
          return (
            <div
              key={item.id}
              data-testid={`kora-space-worker-card-${item.id}`}
              style={{
                background: '#FFFFFF', border: '1px solid rgba(6,3,43,0.09)',
                borderRadius: 14, padding: '18px 20px',
              }}
            >
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10, alignItems: 'center' }}>
                <span style={{
                  fontSize: 10, fontWeight: 700,
                  color: ts.color, background: ts.bg, border: `1px solid ${ts.border}`,
                  borderRadius: 999, padding: '2px 10px',
                }}>
                  {item.type_label}
                </span>
                {item.pillars.map((p) => (
                  <span key={p} style={{
                    fontSize: 10, fontWeight: 600,
                    color: PILLAR_COLORS[p], background: `${PILLAR_COLORS[p]}18`,
                    borderRadius: 4, padding: '2px 8px',
                  }}>
                    {p}
                  </span>
                ))}
                <span style={{
                  fontSize: 10, color: TOKENS.inkHint, background: 'rgba(6,3,43,0.05)',
                  borderRadius: 4, padding: '2px 8px', marginLeft: 'auto',
                }}>
                  {item.status_label}
                </span>
              </div>
              <p style={{ fontSize: 14, fontWeight: 700, color: TOKENS.ink, margin: '0 0 6px', lineHeight: 1.3 }}>
                {item.title}
              </p>
              <p style={{ fontSize: 12, color: TOKENS.inkSecondary, margin: '0 0 14px', lineHeight: 1.6 }}>
                {item.description}
              </p>
              <button
                disabled
                style={{
                  fontSize: 11, fontWeight: 600, color: TOKENS.inkSecondary,
                  background: 'rgba(6,3,43,0.05)', border: '1px solid rgba(6,3,43,0.12)',
                  borderRadius: 8, padding: '6px 14px', cursor: 'not-allowed', opacity: 0.6,
                  fontFamily: FONT,
                }}
              >
                {item.cta} · preview
              </button>
            </div>
          );
        })}
      </div>

      <TimelineConnectionNote />

      {/* Regole dello spazio */}
      <div style={{
        background: TOKENS.surface, border: `1px solid ${TOKENS.inkBorder}`,
        borderRadius: 12, padding: '16px 20px', marginBottom: 24,
      }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: TOKENS.ink, margin: '0 0 8px' }}>
          Regole dello spazio
        </p>
        <ul style={{ fontSize: 12, color: TOKENS.inkSecondary, margin: 0, paddingLeft: 16, lineHeight: 1.75 }}>
          <li>I contenuti sono supervisionati da KORA — nessun contenuto non moderato.</li>
          <li>La tua partecipazione è volontaria. KORA non misura pressione né compliance.</li>
          <li>Non c&apos;è ranking, classifica, né confronto tra lavoratori.</li>
          <li>Le richieste dei lavoratori sono aggregate — nessuna visibilità individuale verso l&apos;azienda.</li>
        </ul>
      </div>

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <Link href="/my-kora/personal-impact-balance" style={{ fontSize: 12, fontWeight: 600, color: TOKENS.accent, textDecoration: 'none' }}>
          → Personal Impact Balance
        </Link>
        <Link href="/my-kora/dynamic-cv" style={{ fontSize: 12, fontWeight: 600, color: TOKENS.accent, textDecoration: 'none' }}>
          → Dynamic Impact CV
        </Link>
        <Link href="/worker/workspace" style={{ fontSize: 12, fontWeight: 600, color: TOKENS.inkSecondary, textDecoration: 'none' }}>
          → Spazio operativo
        </Link>
      </div>

      <p style={{ fontSize: 10, fontFamily: 'monospace', color: TOKENS.inkHint, marginTop: 28 }}>
        synthetic_demo_data: true · Foundation Light Preview · KORA Space v0.1 · B142-A
      </p>
    </div>
  );
}
