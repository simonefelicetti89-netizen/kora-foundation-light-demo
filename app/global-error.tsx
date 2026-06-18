'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect }   from 'react';

// global-error.tsx sostituisce l'intero layout in caso di crash del root layout.
// Richiede <html><body> espliciti.

export default function GlobalRootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="it">
      <body
        style={{
          margin: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          gap: '16px',
          padding: '32px',
          background: '#F6F4EF',
          color: '#211F1A',
          fontFamily: 'system-ui, sans-serif',
        }}
        data-testid="global-error-boundary"
      >
        <p style={{ fontSize: '15px', color: 'rgba(6,3,43,0.64)', margin: 0 }}>
          Qualcosa non ha funzionato.
        </p>
        <button
          onClick={reset}
          style={{
            padding: '8px 16px',
            borderRadius: '8px',
            background: '#B5512E',
            color: '#fff',
            fontSize: '14px',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          Riprova
        </button>
      </body>
    </html>
  );
}
