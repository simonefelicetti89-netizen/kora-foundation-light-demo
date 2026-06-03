import { TOKENS } from '@/lib/design/kora-design-tokens';

// C-04: AI Mapping Review — revisione mapping tassonomia BCM.
// Scopo: mostrare che il mapping review non è attivo in Foundation Light;
//        il flusso si attiva in una fase successiva (Pilot Calibration).
export default function MappingReview() {
  return (
    <div style={{ maxWidth: 560 }}>
      <p style={{
        fontFamily:    'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif',
        fontWeight:    600,
        fontSize:      '10.5px',
        letterSpacing: '0.10em',
        textTransform: 'uppercase',
        color:         TOKENS.accent,
        marginBottom:  10,
      }}>
        AI Mapping Review
      </p>
      <h1 style={{
        fontFamily:    'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif',
        fontWeight:    800,
        fontSize:      '1.75rem',
        letterSpacing: '-0.03em',
        lineHeight:    1.06,
        color:         TOKENS.ink,
        marginBottom:  16,
      }}>
        Mapping Review
      </h1>
      <p style={{ fontSize: '13.5px', color: TOKENS.inkSecondary, lineHeight: 1.65, marginBottom: 20 }}>
        Revisione dei suggerimenti di mapping delle colonne CSV/Excel. Approva, rifiuta o rimappa prima della creazione UEF.
      </p>
      <div style={{
        borderRadius: TOKENS.cardRadius,
        border:       TOKENS.cardBorder,
        background:   TOKENS.taupe,
        padding:      '14px 18px',
        fontSize:     '13px',
        color:        TOKENS.inkHint,
        lineHeight:   1.6,
      }}>
        Il Mapping Review non è attivo in Foundation Light. Il flusso di approvazione column-header si attiva in una fase successiva del pilot.
      </div>
    </div>
  );
}
