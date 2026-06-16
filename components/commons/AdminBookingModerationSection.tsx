'use client';
// components/commons/AdminBookingModerationSection.tsx
// B166 — Sezione prenotazioni in moderazione nel pannello admin KORA Space.
//
// Carica le booking pending via GET /api/admin/commons/bookings.
// Azioni: approve / reject (con note) / markAttended (dopo evento).
// Privacy: worker_identity_id MAI mostrato. Solo post_id, tenant, status, date.

import { useState, useEffect, useCallback } from 'react';

const FONT = 'Plus Jakarta Sans, system-ui, sans-serif';

interface Booking {
  id:              string;
  post_id:         string;
  post_tenant_id:  string;
  worker_tenant_id: string;
  status:          string;
  moderation_notes: string | null;
  created_at:      string;
}

interface Props {
  tenantMap: Record<string, string>;
}

export function AdminBookingModerationSection({ tenantMap }: Props) {
  const [bookings, setBookings]           = useState<Booking[]>([]);
  const [loading, setLoading]             = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [notes, setNotes]                 = useState<Record<string, string>>({});
  const [error, setError]                 = useState('');

  const loadPending = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch('/api/admin/commons/bookings');
      const data = await res.json() as { ok: boolean; bookings?: Booking[] };
      if (data.ok) setBookings(data.bookings ?? []);
    } catch {
      setError('Errore caricamento prenotazioni.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadPending(); }, [loadPending]);

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
        setError(data.error ?? 'Errore durante l\'azione.');
      } else {
        setBookings((prev) => prev.filter((b) => b.id !== bookingId));
      }
    } catch {
      setError('Errore di rete. Riprova.');
    } finally {
      setActionLoading(null);
    }
  }

  if (loading) {
    return (
      <div data-testid="admin-booking-moderation-loading" style={{ padding: '24px 0', textAlign: 'center', fontSize: 12, color: 'rgba(6,3,43,0.40)', fontFamily: FONT }}>
        Caricamento prenotazioni…
      </div>
    );
  }

  return (
    <section data-testid="admin-booking-moderation-section" style={{ marginTop: 40 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#06032B', margin: 0, fontFamily: FONT }}>
          Prenotazioni cross-azienda in moderazione
        </h2>
        {bookings.length > 0 && (
          <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: 'rgba(192,125,42,0.12)', color: '#8A5A00' }}>
            {bookings.length} pending
          </span>
        )}
      </div>

      {/* Privacy notice per moderazione booking */}
      <div
        data-testid="admin-booking-privacy-notice"
        style={{
          background:   'rgba(199,111,61,0.07)',
          border:       '1.5px solid rgba(199,111,61,0.28)',
          borderRadius: 10,
          padding:      '10px 14px',
          marginBottom: 16,
          fontSize:     11,
          color:        '#C76F3D',
          fontFamily:   FONT,
          lineHeight:   1.6,
        }}
      >
        <strong>Anonimato worker garantito.</strong> La moderazione non espone il nome del lavoratore. Visibile: tenant di provenienza, tenant promotore, data, status. Nessun dato individuale.
      </div>

      {error && (
        <p style={{ fontSize: 12, color: '#9E3B2F', marginBottom: 12, fontFamily: FONT }}>
          Errore: {error}
        </p>
      )}

      {bookings.length === 0 ? (
        <div
          data-testid="admin-booking-empty"
          style={{
            textAlign:    'center',
            padding:      '32px 24px',
            background:   'rgba(6,3,43,0.02)',
            borderRadius: 12,
            border:       '1px dashed rgba(6,3,43,0.10)',
          }}
        >
          <p style={{ fontSize: 13, color: 'rgba(6,3,43,0.40)', margin: 0, fontFamily: FONT }}>
            Nessuna prenotazione in attesa di moderazione.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {bookings.map((booking) => {
            const isLoading     = actionLoading === booking.id;
            const promoterLabel = tenantMap[booking.post_tenant_id]    ?? booking.post_tenant_id.slice(0, 8);
            const originLabel   = tenantMap[booking.worker_tenant_id]  ?? booking.worker_tenant_id.slice(0, 8);

            return (
              <div
                key={booking.id}
                data-testid="admin-booking-card"
                style={{
                  background:   '#FFFFFF',
                  border:       '1.5px solid rgba(192,125,42,0.30)',
                  borderRadius: 12,
                  padding:      '14px 18px',
                  opacity:      isLoading ? 0.6 : 1,
                }}
              >
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8, alignItems: 'center' }}>
                  <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: 'rgba(192,125,42,0.10)', color: '#8A5A00' }}>
                    pending
                  </span>
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

                <p style={{ fontSize: 11, color: 'rgba(6,3,43,0.40)', margin: '0 0 10px', fontFamily: 'monospace' }}>
                  post: {booking.post_id.slice(0, 16)}… · booking: {booking.id.slice(0, 8)}…
                </p>

                {/* Note moderazione */}
                <input
                  placeholder="Note di moderazione (opzionale)…"
                  value={notes[booking.id] ?? ''}
                  onChange={(e) => setNotes((n) => ({ ...n, [booking.id]: e.target.value }))}
                  style={{
                    width:        '100%',
                    padding:      '6px 10px',
                    borderRadius: 6,
                    border:       '1px solid rgba(6,3,43,0.12)',
                    fontSize:     11,
                    fontFamily:   FONT,
                    marginBottom: 10,
                    boxSizing:    'border-box',
                  }}
                />

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
                  <button
                    data-testid={`admin-booking-attended-${booking.id}`}
                    disabled={isLoading}
                    onClick={() => doAction(booking.id, 'attended')}
                    style={{ padding: '6px 14px', borderRadius: 7, border: '1px solid rgba(59,110,186,0.25)', background: 'rgba(59,110,186,0.06)', color: '#3B6EBA', fontSize: 11, fontWeight: 700, fontFamily: FONT, cursor: isLoading ? 'not-allowed' : 'pointer' }}
                  >
                    Segna Presente (post-evento)
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
