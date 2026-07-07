'use client';
// components/commons/WorkerBookingButton.tsx
// B185: Client component for cross_company initiative booking from /worker/commons.
//
// Replaces plain HTML <form> which sent application/x-www-form-urlencoded.
// This component POSTs JSON { post_id } to /api/worker/commons/bookings (which
// calls request.json() and therefore requires JSON, not form-encoded).
//
// Privacy invariants:
//   - No worker_id or tenant_id passed in body — identity resolved server-side from JWT.
//   - No raw backend error exposed — only safe Italian copy.
//   - No worker identity fields in component state.

import { useState } from 'react';
import Link from 'next/link';

interface Props {
  postId: string;
}

const FONT = 'Plus Jakarta Sans, system-ui, sans-serif';

type BookingState = 'idle' | 'loading' | 'booked' | 'duplicate' | 'error';

export function WorkerBookingButton({ postId }: Props) {
  const [state, setState]   = useState<BookingState>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  async function handleBooking() {
    setState('loading');
    setErrorMsg('');
    try {
      const res  = await fetch('/api/worker/commons/bookings', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ post_id: postId }),
      });
      const data = await res.json() as { ok: boolean; error?: string };
      if (data.ok) {
        setState('booked');
      } else if (res.status === 409) {
        setState('duplicate');
      } else {
        setState('error');
        setErrorMsg('Impossibile completare la richiesta. Riprova più tardi.');
      }
    } catch {
      setState('error');
      setErrorMsg('Errore di rete. Riprova più tardi.');
    }
  }

  if (state === 'booked') {
    return (
      <div style={{ marginTop: 4 }}>
        <span
          data-testid={`worker-booking-success-${postId}`}
          style={{
            display:      'inline-block',
            fontSize:     11,
            fontWeight:   700,
            padding:      '3px 10px',
            borderRadius: 999,
            background:   'rgba(47,125,85,0.10)',
            color:        '#2F7D55',
            border:       '1px solid rgba(47,125,85,0.25)',
            fontFamily:   FONT,
          }}
        >
          Richiesta inviata
        </span>
        <p style={{ fontSize: 9, color: 'rgba(6,3,43,0.40)', margin: '4px 0 0', fontFamily: FONT, lineHeight: 1.4 }}>
          La tua richiesta è in attesa di conferma KORA.
          Il tuo nome non è visibile all&apos;organizzatore.
        </p>
        <Link
          href="/my-kora/bookings"
          style={{ fontSize: 9, color: '#2F7D55', fontWeight: 700, textDecoration: 'none', display: 'inline-block', marginTop: 4 }}
        >
          Vedi le tue prenotazioni →
        </Link>
      </div>
    );
  }

  if (state === 'duplicate') {
    return (
      <div style={{ marginTop: 4 }}>
        <p
          data-testid={`worker-booking-duplicate-${postId}`}
          style={{ fontSize: 11, color: '#8A5A00', margin: 0, fontFamily: FONT, lineHeight: 1.5 }}
        >
          Hai già una richiesta per questa iniziativa.
          Per una nuova richiesta sulla stessa iniziativa, contatta KORA/Admin.
        </p>
      </div>
    );
  }

  return (
    <div style={{ marginTop: 4 }}>
      <button
        data-testid={`worker-book-btn-${postId}`}
        type="button"
        disabled={state === 'loading'}
        onClick={() => void handleBooking()}
        style={{
          padding:      '8px 18px',
          borderRadius: 8,
          border:       'none',
          background:   state === 'loading' ? 'rgba(47,125,85,0.50)' : '#2F7D55',
          color:        '#FFFFFF',
          fontSize:     12,
          fontWeight:   700,
          fontFamily:   FONT,
          cursor:       state === 'loading' ? 'not-allowed' : 'pointer',
        }}
      >
        {state === 'loading' ? 'Invio richiesta…' : 'Prenota partecipazione'}
      </button>
      {state === 'error' && (
        <p
          data-testid={`worker-booking-error-${postId}`}
          style={{ fontSize: 11, color: '#9E3B2F', margin: '4px 0 0', fontFamily: FONT }}
        >
          {errorMsg}
        </p>
      )}
      <p style={{ fontSize: 9, color: 'rgba(6,3,43,0.35)', margin: '4px 0 0', lineHeight: 1.4, fontFamily: FONT }}>
        La prenotazione è soggetta ad approvazione KORA. Il tuo nome non è visibile all&apos;organizzatore.
      </p>
    </div>
  );
}
