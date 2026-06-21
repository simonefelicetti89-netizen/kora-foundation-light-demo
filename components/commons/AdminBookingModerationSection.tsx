'use client';
// components/commons/AdminBookingModerationSection.tsx
// B166 — KORA Space booking lifecycle control panel for KORA_ADMIN.
//
// Privacy invariants:
//   - worker_identity_id is NEVER shown — not in API response, not rendered
//   - Only: booking id ref, post ref (enriched from postsMap), tenant context, status, dates
//   - "Anonimato worker garantito" notice is non-suppressible
//   - Actions manage participation status — do not evaluate the worker

import { useState, useEffect, useCallback } from 'react';

const FONT = 'Plus Jakarta Sans, system-ui, sans-serif';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Booking {
  id:               string;
  post_id:          string;
  post_tenant_id:   string;
  worker_tenant_id: string;
  status:           string;
  moderation_notes: string | null;
  moderated_at?:    string | null;
  attended_at?:     string | null;
  created_at:       string;
}

interface PostSummary {
  id:             string;
  title:          string;
  pillar?:        string | null;
  event_start_at?: string | null;
  opening_grade?: string | null;
}

interface Props {
  tenantMap: Record<string, string>;
  postsMap:  Record<string, PostSummary>;
}

// ── Status metadata ───────────────────────────────────────────────────────────

const STATUS_META: Record<string, { label: string; color: string; bg: string; border: string }> = {
  pending:   { label: 'Richiesta inviata',          color: '#8A5A00',           bg: 'rgba(192,125,42,0.10)', border: 'rgba(192,125,42,0.30)' },
  approved:  { label: 'Partecipazione confermata',  color: '#2F7D55',           bg: 'rgba(47,125,85,0.08)',  border: 'rgba(47,125,85,0.22)'  },
  rejected:  { label: 'Richiesta non approvata',    color: '#9E3B2F',           bg: 'rgba(158,59,47,0.08)', border: 'rgba(158,59,47,0.22)'  },
  attended:  { label: 'Partecipazione completata',  color: '#3B6EBA',           bg: 'rgba(59,110,186,0.08)', border: 'rgba(59,110,186,0.22)' },
  cancelled: { label: 'Annullata',                  color: 'rgba(6,3,43,0.45)', bg: 'rgba(6,3,43,0.05)',    border: 'rgba(6,3,43,0.12)'    },
};

function statusMeta(s: string) {
  return STATUS_META[s] ?? { label: 'Stato in verifica', color: 'rgba(6,3,43,0.40)', bg: 'rgba(6,3,43,0.04)', border: 'rgba(6,3,43,0.10)' };
}

// ── Filter tabs ───────────────────────────────────────────────────────────────

type FilterScope = 'pending' | 'approved' | 'attended' | 'rejected' | 'cancelled' | 'all';

const FILTER_TABS: { scope: FilterScope; label: string }[] = [
  { scope: 'pending',   label: 'Da revisionare' },
  { scope: 'approved',  label: 'Confermate'     },
  { scope: 'attended',  label: 'Completate'     },
  { scope: 'rejected',  label: 'Non approvate'  },
  { scope: 'cancelled', label: 'Annullate'      },
  { scope: 'all',       label: 'Tutte'          },
];

function apiUrl(scope: FilterScope): string {
  if (scope === 'all')     return '/api/admin/commons/bookings?scope=all';
  if (scope === 'pending') return '/api/admin/commons/bookings';
  return `/api/admin/commons/bookings?status=${scope}`;
}

// ── Component ────────────────────────────────────────────────────────────────

export function AdminBookingModerationSection({ tenantMap, postsMap }: Props) {
  const [activeScope, setActiveScope]     = useState<FilterScope>('pending');
  const [bookings, setBookings]           = useState<Booking[]>([]);
  const [loading, setLoading]             = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [notes, setNotes]                 = useState<Record<string, string>>({});
  const [error, setError]                 = useState('');

  const loadBookings = useCallback(async (scope: FilterScope) => {
    setLoading(true);
    setError('');
    try {
      const res  = await fetch(apiUrl(scope));
      const data = await res.json() as { ok: boolean; bookings?: Booking[] };
      if (data.ok) setBookings(data.bookings ?? []);
      else setError('Errore caricamento prenotazioni.');
    } catch {
      setError('Errore di rete. Riprova.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadBookings(activeScope); }, [loadBookings, activeScope]);

  async function doAction(bookingId: string, action: 'approve' | 'reject' | 'attended') {
    setActionLoading(bookingId);
    setError('');
    try {
      const res  = await fetch(`/api/admin/commons/bookings/${bookingId}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ action, notes: notes[bookingId] ?? null }),
      });
      const data = await res.json() as { ok: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Errore durante l'azione.");
      } else {
        // Remove from current list (status changed — no longer belongs here)
        setBookings((prev) => prev.filter((b) => b.id !== bookingId));
      }
    } catch {
      setError('Errore di rete. Riprova.');
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <section
      data-testid="admin-booking-moderation-section"
      style={{ marginTop: 40 }}
    >
      {/* Section header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#06032B', margin: 0, fontFamily: FONT }}>
          Controllo prenotazioni KORA Space
        </h2>
        {bookings.length > 0 && activeScope === 'pending' && (
          <span style={{
            fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 999,
            background: 'rgba(192,125,42,0.12)', color: '#8A5A00',
          }}>
            {bookings.length} in attesa
          </span>
        )}
      </div>

      {/* Privacy notice — non-suppressible */}
      <div
        data-testid="admin-booking-privacy-notice"
        style={{
          background: 'rgba(199,111,61,0.07)', border: '1.5px solid rgba(199,111,61,0.28)',
          borderRadius: 10, padding: '10px 14px', marginBottom: 16,
          fontSize: 11, color: '#C76F3D', fontFamily: FONT, lineHeight: 1.6,
        }}
      >
        <strong>Anonimato worker garantito.</strong>{' '}
        Nessun dato individuale del lavoratore è esposto in questa vista.
        Le azioni gestiscono lo stato della partecipazione — non valutano la persona.
        Visibile: tenant di provenienza, tenant promotore, riferimento iniziativa, data, status.
      </div>

      {/* Attendance notice — non-suppressible */}
      <div
        data-testid="admin-booking-attendance-notice"
        style={{
          background: 'rgba(59,110,186,0.06)', border: '1px solid rgba(59,110,186,0.18)',
          borderRadius: 10, padding: '10px 14px', marginBottom: 16,
          fontSize: 11, color: '#3B5A8A', fontFamily: FONT, lineHeight: 1.6,
        }}
      >
        <p style={{ margin: '0 0 6px', fontWeight: 700, fontFamily: FONT }}>Cosa fa "Segna Partecipazione Completata":</p>
        <ul style={{ margin: '0 0 8px', paddingLeft: 18 }}>
          <li>Conferma la partecipazione dell&apos;utente all&apos;iniziativa.</li>
          <li>Può generare una traccia privata del lavoratore nel suo percorso My KORA.</li>
          <li>Crea un segnale aggregato per il companion indicator KORA Contribution™.</li>
        </ul>
        <p style={{ margin: '0 0 6px', fontWeight: 700, fontFamily: FONT }}>Cosa NON fa:</p>
        <ul style={{ margin: '0 0 8px', paddingLeft: 18 }}>
          <li>Non espone il percorso individuale al datore di lavoro.</li>
          <li>Non crea un badge pubblico.</li>
          <li>Non alimenta il KORA Index™.</li>
        </ul>
        <p style={{ margin: 0, fontFamily: FONT }}>
          Il percorso individuale resta privato; eventuali segnali sono aggregati.
          La partecipazione completata non alimenta il KORA Index™ — è un segnale separato del companion indicator KORA Contribution™.
        </p>
      </div>

      {/* Filter tabs */}
      <div
        data-testid="admin-booking-filter-tabs"
        style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 20 }}
      >
        {FILTER_TABS.map(({ scope, label }) => (
          <button
            key={scope}
            data-testid={`admin-booking-tab-${scope}`}
            onClick={() => setActiveScope(scope)}
            style={{
              padding:      '6px 12px',
              borderRadius: 8,
              border:       '1px solid rgba(6,3,43,0.12)',
              background:   activeScope === scope ? '#06032B' : 'transparent',
              color:        activeScope === scope ? '#FFFFFF' : 'rgba(6,3,43,0.60)',
              fontSize:     12,
              fontWeight:   activeScope === scope ? 700 : 500,
              fontFamily:   FONT,
              cursor:       'pointer',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {error && (
        <p style={{ fontSize: 12, color: '#9E3B2F', marginBottom: 12, fontFamily: FONT }}>
          Errore: {error}
        </p>
      )}

      {loading ? (
        <div
          data-testid="admin-booking-moderation-loading"
          style={{ padding: '24px 0', textAlign: 'center', fontSize: 12, color: 'rgba(6,3,43,0.40)', fontFamily: FONT }}
        >
          Caricamento prenotazioni…
        </div>
      ) : bookings.length === 0 ? (
        <div
          data-testid="admin-booking-empty"
          style={{
            textAlign: 'center', padding: '32px 24px',
            background: 'rgba(6,3,43,0.02)', borderRadius: 12,
            border: '1px dashed rgba(6,3,43,0.10)',
          }}
        >
          <p style={{ fontSize: 13, color: 'rgba(6,3,43,0.40)', margin: 0, fontFamily: FONT }}>
            Nessuna prenotazione in questa categoria.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {bookings.map((booking) => {
            const isLoading      = actionLoading === booking.id;
            const sm             = statusMeta(booking.status);
            const promoterLabel  = tenantMap[booking.post_tenant_id]   ?? booking.post_tenant_id.slice(0, 8);
            const originLabel    = tenantMap[booking.worker_tenant_id] ?? booking.worker_tenant_id.slice(0, 8);
            const post           = postsMap[booking.post_id];
            const initiativeTitle = post?.title ?? `Iniziativa #${booking.post_id.slice(0, 8)}`;
            const eventDate      = post?.event_start_at
              ? new Date(post.event_start_at).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' })
              : null;

            return (
              <div
                key={booking.id}
                data-testid="admin-booking-card"
                style={{
                  background:   '#FFFFFF',
                  border:       booking.status === 'pending'
                    ? '1.5px solid rgba(192,125,42,0.30)'
                    : '1px solid rgba(6,3,43,0.09)',
                  borderRadius: 12,
                  padding:      '14px 18px',
                  opacity:      isLoading ? 0.6 : 1,
                }}
              >
                {/* Status + tenant context */}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8, alignItems: 'center' }}>
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999,
                    background: sm.bg, color: sm.color, border: `1px solid ${sm.border}`,
                  }}>
                    {sm.label}
                  </span>
                  {post?.pillar && (
                    <span style={{
                      fontSize: 9, fontWeight: 600, padding: '2px 8px', borderRadius: 4,
                      background: 'rgba(6,3,43,0.05)', color: 'rgba(6,3,43,0.55)',
                    }}>
                      {post.pillar}
                    </span>
                  )}
                  <span style={{ fontSize: 10, color: 'rgba(6,3,43,0.40)', fontFamily: FONT }}>
                    Promotore: <strong>{promoterLabel}</strong>
                  </span>
                  <span style={{ fontSize: 10, color: 'rgba(6,3,43,0.40)', fontFamily: FONT }}>
                    Provenienza: <strong>{originLabel}</strong>
                  </span>
                  <span style={{ fontSize: 10, color: 'rgba(6,3,43,0.30)', marginLeft: 'auto', fontFamily: 'monospace' }}>
                    {new Date(booking.created_at).toLocaleDateString('it-IT')}
                  </span>
                </div>

                {/* Initiative title + date */}
                <p style={{ fontSize: 13, fontWeight: 700, color: '#06032B', margin: '0 0 4px', fontFamily: FONT, lineHeight: 1.3 }}>
                  {initiativeTitle}
                </p>
                {eventDate && (
                  <p style={{ fontSize: 10, color: 'rgba(6,3,43,0.50)', margin: '0 0 6px', fontFamily: FONT }}>
                    Data evento: {eventDate}
                  </p>
                )}

                {/* Date metadata */}
                <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 10 }}>
                  {booking.moderated_at && (
                    <p style={{ fontSize: 9, color: 'rgba(6,3,43,0.35)', margin: 0, fontFamily: 'monospace' }}>
                      moderata: {new Date(booking.moderated_at).toLocaleDateString('it-IT')}
                    </p>
                  )}
                  {booking.attended_at && (
                    <p style={{ fontSize: 9, color: '#3B6EBA', margin: 0, fontFamily: 'monospace' }}>
                      completata: {new Date(booking.attended_at).toLocaleDateString('it-IT')}
                    </p>
                  )}
                  <p style={{ fontSize: 9, color: 'rgba(6,3,43,0.25)', margin: 0, fontFamily: 'monospace' }}>
                    ref: {booking.id.slice(0, 8)}…
                  </p>
                </div>

                {/* Moderation notes input — only for pending/approved */}
                {(booking.status === 'pending' || booking.status === 'approved') && (
                  <input
                    placeholder="Note di moderazione (opzionale)…"
                    value={notes[booking.id] ?? ''}
                    onChange={(e) => setNotes((n) => ({ ...n, [booking.id]: e.target.value }))}
                    style={{
                      width: '100%', padding: '6px 10px', borderRadius: 6,
                      border: '1px solid rgba(6,3,43,0.12)', fontSize: 11, fontFamily: FONT,
                      marginBottom: 10, boxSizing: 'border-box',
                    }}
                  />
                )}

                {/* Status-aware action buttons */}
                {booking.status === 'pending' && (
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button
                      data-testid={`admin-booking-approve-${booking.id}`}
                      disabled={isLoading}
                      onClick={() => doAction(booking.id, 'approve')}
                      style={{ padding: '6px 14px', borderRadius: 7, border: 'none', background: '#2F7D55', color: '#FFFFFF', fontSize: 11, fontWeight: 700, fontFamily: FONT, cursor: isLoading ? 'not-allowed' : 'pointer' }}
                    >
                      ✓ Approva
                    </button>
                    <button
                      data-testid={`admin-booking-reject-${booking.id}`}
                      disabled={isLoading}
                      onClick={() => doAction(booking.id, 'reject')}
                      style={{ padding: '6px 14px', borderRadius: 7, border: '1px solid rgba(158,59,47,0.25)', background: 'rgba(158,59,47,0.06)', color: '#9E3B2F', fontSize: 11, fontWeight: 700, fontFamily: FONT, cursor: isLoading ? 'not-allowed' : 'pointer' }}
                    >
                      ✕ Rifiuta
                    </button>
                  </div>
                )}

                {booking.status === 'approved' && (
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button
                      data-testid={`admin-booking-attended-${booking.id}`}
                      disabled={isLoading}
                      onClick={() => doAction(booking.id, 'attended')}
                      style={{ padding: '6px 14px', borderRadius: 7, border: '1px solid rgba(59,110,186,0.25)', background: 'rgba(59,110,186,0.06)', color: '#3B6EBA', fontSize: 11, fontWeight: 700, fontFamily: FONT, cursor: isLoading ? 'not-allowed' : 'pointer' }}
                    >
                      Segna Partecipazione Completata
                    </button>
                  </div>
                )}

                {booking.status === 'attended' && (
                  <p style={{ fontSize: 11, color: '#3B6EBA', margin: 0, fontFamily: FONT }}>
                    Partecipazione completata — nessuna ulteriore azione disponibile.
                  </p>
                )}

                {(booking.status === 'rejected' || booking.status === 'cancelled') && (
                  <p style={{ fontSize: 11, color: 'rgba(6,3,43,0.40)', margin: 0, fontFamily: FONT }}>
                    {booking.status === 'rejected' ? 'Richiesta non approvata' : 'Annullata'} — nessuna azione disponibile.
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
