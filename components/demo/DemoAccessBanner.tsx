'use client';
// components/demo/DemoAccessBanner.tsx — B168.5-P3
// Banner informativo per le route demo pubbliche (2 dal CC-00 DEMO_VIEWER
// role retirement, 2026-09-26: /demo, /demo/future-vision).
// Visibile solo a visitatori anonimi (nessuna sessione).
// Dismissibile con React state locale — si resetta al reload (corretto per questo caso).
// Stato locale puro — nessun storage persistente.

import { useState } from 'react';
import Link from 'next/link';

const FONT = 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif';

export function DemoAccessBanner() {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div
      data-testid="demo-access-banner"
      style={{
        fontFamily:     FONT,
        background:     'rgba(199,111,61,0.07)',
        borderBottom:   '1px solid rgba(199,111,61,0.22)',
        padding:        '10px 20px',
        display:        'flex',
        alignItems:     'center',
        gap:            12,
        flexWrap:       'wrap',
      }}
    >
      <span
        style={{
          fontSize:      10,
          fontWeight:    700,
          letterSpacing: '0.10em',
          textTransform: 'uppercase' as const,
          color:         '#C76F3D',
          flexShrink:    0,
        }}
      >
        Demo pubblica
      </span>

      <p style={{ fontSize: 12, color: 'rgba(6,3,43,0.64)', flex: 1, minWidth: 200, margin: 0, lineHeight: 1.5 }}>
        Stai esplorando KORA in modalità pubblica. Per il dettaglio metodologico, richiedi accesso.
      </p>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        <Link
          href="/request-access"
          data-testid="demo-access-banner-cta"
          style={{
            fontSize:       12,
            fontWeight:     700,
            color:          '#C76F3D',
            textDecoration: 'none',
            padding:        '5px 12px',
            border:         '1px solid rgba(199,111,61,0.40)',
            borderRadius:   6,
            background:     'rgba(199,111,61,0.06)',
            whiteSpace:     'nowrap',
          }}
        >
          Richiedi accesso
        </Link>

        <button
          onClick={() => setDismissed(true)}
          data-testid="demo-access-banner-dismiss"
          aria-label="Chiudi banner"
          style={{
            background:  'none',
            border:      'none',
            cursor:      'pointer',
            padding:     '4px 6px',
            fontSize:    16,
            color:       'rgba(6,3,43,0.35)',
            lineHeight:  1,
            flexShrink:  0,
          }}
        >
          ×
        </button>
      </div>
    </div>
  );
}
