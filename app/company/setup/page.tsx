import Link from 'next/link';
import { TOKENS } from '@/lib/design/kora-design-tokens';

// C-16 (retired): Company Setup — funzione gestita lato KORA Admin.
// Scopo: comunicare che il setup operativo vive su /admin/companies/setup.
export default function CompanySetupBoundaryNotice() {
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
        Company Setup
      </p>
      <h1 style={{
        fontFamily:    'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif',
        fontWeight:    800,
        fontSize:      '1.75rem',
        letterSpacing: '-0.03em',
        lineHeight:    1.06,
        color:         TOKENS.ink,
        marginBottom:  20,
      }}>
        Questa funzione è gestita lato KORA Admin.
      </h1>

      <div style={{
        borderRadius: TOKENS.cardRadius,
        border:       TOKENS.cardBorder,
        background:   TOKENS.taupe,
        padding:      '16px 20px',
        fontSize:     '13.5px',
        color:        TOKENS.inkSecondary,
        lineHeight:   1.65,
        marginBottom: 24,
        display:      'flex',
        flexDirection: 'column',
        gap:          8,
      }}>
        <p>Il setup operativo e la validazione dati sono gestiti lato KORA Admin.</p>
        <p>Il portale azienda mostra solo output e stato — non gli strumenti operativi di configurazione.</p>
        <p style={{ fontSize: '11px', color: TOKENS.inkMeta }}>
          KORA misura l&apos;organizzazione, non gli individui.
        </p>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        <Link
          href="/company/profile"
          style={{
            fontFamily:    'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif',
            fontWeight:    700,
            fontSize:      '13px',
            borderRadius:  12,
            padding:       '10px 20px',
            background:    TOKENS.ink,
            color:         '#FFFFFF',
            textDecoration: 'none',
            display:       'inline-block',
            minHeight:     44,
            lineHeight:    '1.8',
          }}
        >
          Il tuo spazio KORA
        </Link>
        <Link
          href="/company"
          style={{
            fontFamily:    'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif',
            fontSize:      '13px',
            color:         TOKENS.inkSecondary,
            textDecoration: 'none',
            minHeight:     44,
            display:       'inline-flex',
            alignItems:    'center',
          }}
        >
          Executive Cockpit
        </Link>
      </div>
    </div>
  );
}
