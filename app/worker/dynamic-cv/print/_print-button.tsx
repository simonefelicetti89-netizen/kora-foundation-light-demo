'use client';
// B126: Print button — client component only (needs window.print())

const FONT = 'Plus Jakarta Sans, system-ui, sans-serif';

export function PrintButton() {
  return (
    <button
      data-testid="dynamic-cv-print-btn"
      onClick={() => window.print()}
      style={{
        fontFamily:   FONT,
        fontSize:     13,
        fontWeight:   700,
        padding:      '9px 20px',
        borderRadius: 8,
        border:       '1px solid rgba(6,3,43,0.18)',
        background:   '#06032B',
        color:        '#fff',
        cursor:       'pointer',
      }}
    >
      Stampa / Salva PDF
    </button>
  );
}
