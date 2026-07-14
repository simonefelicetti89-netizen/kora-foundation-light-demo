// app/request-access/page.tsx
// B119: Pagina pubblica "Richiedi accesso" — informativa, non crea account.
// B168.5-P3: supporto parametro ?next= per contextualizzare la richiesta.
//
// REGOLA ASSOLUTA: questa pagina NON crea utenti Supabase.
// Nessuna chiamata a Supabase Auth. La richiesta viene inviata
// via mailto. La decisione di provisioning e' esclusivamente di
// KORA_ADMIN. L'utente non ottiene accesso prima di ricevere
// un invito esplicito da KORA.

import Link from 'next/link';
import Image from 'next/image';

export const metadata = {
  title: 'Richiedi accesso · KORA',
  description: 'Richiedi accesso alla piattaforma KORA. La richiesta non crea un account.',
  robots: { index: false, follow: false, nocache: true,
            googleBot: { index: false, follow: false, noimageindex: true } },
};

const FONT = 'Plus Jakarta Sans, system-ui, sans-serif';

// Destinatario richieste di accesso — gestito da KORA_ADMIN
const CONTACT_EMAIL = 'accesso@kora.io';

export default async function RequestAccessPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const sp = await searchParams;
  const requestedPath = sp.next ?? null;

  const subject = encodeURIComponent('Richiesta accesso KORA');
  const bodyBase = 'Nome: \nEmail: \nAzienda: \nRuolo richiesto (Company / Worker): \n\nMessaggio:\n';
  const bodyWithContext = requestedPath
    ? `${bodyBase}\nPagina di interesse: ${requestedPath}\n`
    : bodyBase;
  const mailtoHref = `mailto:${CONTACT_EMAIL}?subject=${subject}&body=${encodeURIComponent(bodyWithContext)}`;

  return (
    <div
      style={{
        minHeight:      '100vh',
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
        background:     '#06032B',
        padding:        '24px',
        fontFamily:     FONT,
      }}
    >
      <div
        aria-hidden="true"
        style={{
          position:      'absolute',
          inset:         0,
          background:    'radial-gradient(500px 380px at 20% 30%, rgba(97,86,245,0.10), transparent 60%)',
          pointerEvents: 'none',
        }}
      />

      <div
        data-testid="request-access-page"
        style={{
          position:     'relative',
          zIndex:       1,
          width:        '100%',
          maxWidth:     460,
          background:   '#FFFFFF',
          border:       '1px solid rgba(6,3,43,0.10)',
          borderRadius: 20,
          boxShadow:    '0 24px 80px rgba(6,3,43,0.35)',
          padding:      '36px 32px',
        }}
      >
        {/* Logo */}
        <div style={{ marginBottom: 28, display: 'flex', justifyContent: 'center' }}>
          <Image
            src="/kora/logo-dark.png"
            alt="KORA"
            width={110}
            height={34}
            priority
            style={{ height: 30, width: 'auto' }}
          />
        </div>

        {/* Header */}
        <div style={{ marginBottom: 24, textAlign: 'center' }}>
          <p style={{
            fontSize:      10,
            fontWeight:    700,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color:         '#C76F3D',
            marginBottom:  8,
          }}>
            Accesso su invito
          </p>
          <h1 style={{
            fontSize:      '1.375rem',
            fontWeight:    800,
            letterSpacing: '-0.025em',
            color:         '#06032B',
            marginBottom:  8,
          }}>
            Richiedi accesso
          </h1>
          <p style={{ fontSize: 13, color: 'rgba(6,3,43,0.55)', lineHeight: 1.55 }}>
            KORA non consente la registrazione pubblica.
            Puoi inviare una richiesta: se approvata, riceverai un invito via email.
          </p>
        </div>

        {/* Context: pagina richiesta (B168.5-P3) */}
        {requestedPath && (
          <div
            data-testid="request-access-context-path"
            style={{
              background:   'rgba(6,3,43,0.04)',
              border:       '1px solid rgba(6,3,43,0.10)',
              borderRadius: 10,
              padding:      '10px 14px',
              marginBottom: 16,
            }}
          >
            <p style={{ fontSize: 12, color: 'rgba(6,3,43,0.64)', margin: 0, lineHeight: 1.6 }}>
              Stai richiedendo accesso per visualizzare:{' '}
              <code
                style={{
                  fontFamily:  'monospace',
                  fontSize:    11,
                  background:  'rgba(6,3,43,0.06)',
                  borderRadius: 4,
                  padding:     '1px 5px',
                  color:       '#06032B',
                }}
              >
                {requestedPath}
              </code>
              . Ti contatteremo entro 24h.
            </p>
          </div>
        )}

        {/* No-account notice — non-suppressible */}
        <div
          data-testid="request-access-no-account-notice"
          style={{
            background:   'rgba(199,111,61,0.08)',
            border:       '1px solid rgba(199,111,61,0.25)',
            borderRadius: 10,
            padding:      '12px 16px',
            marginBottom: 24,
          }}
        >
          <p style={{ fontSize: 12, fontWeight: 600, color: '#8B4513', margin: '0 0 4px' }}>
            Questa richiesta NON crea un account.
          </p>
          <p style={{ fontSize: 11, color: 'rgba(139,69,19,0.80)', margin: 0, lineHeight: 1.6 }}>
            KORA valutera la richiesta e, se approvata, inviera un invito personalizzato.
            L&apos;accesso e sempre controllato da KORA.
          </p>
        </div>

        {/* What to include in request */}
        <div style={{ marginBottom: 24 }}>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(6,3,43,0.35)', marginBottom: 10 }}>
            Includi nella richiesta
          </p>
          <ul style={{ margin: 0, padding: '0 0 0 16px', fontSize: 12, color: 'rgba(6,3,43,0.60)', lineHeight: 2 }}>
            <li>Nome completo</li>
            <li>Email di contatto</li>
            <li>Azienda di appartenenza</li>
            <li>Ruolo richiesto (Company Admin / Worker)</li>
            <li>Breve descrizione del contesto</li>
          </ul>
        </div>

        {/* CTA mailto */}
        <a
          href={mailtoHref}
          data-testid="request-access-mailto-cta"
          style={{
            display:        'block',
            textAlign:      'center',
            fontFamily:     FONT,
            fontWeight:     700,
            fontSize:       13,
            borderRadius:   12,
            padding:        '13px 20px',
            background:     '#06032B',
            color:          '#FFFFFF',
            textDecoration: 'none',
            width:          '100%',
            boxSizing:      'border-box',
            marginBottom:   16,
          }}
        >
          Invia richiesta via email
        </a>

        {/* Back to login */}
        <p style={{ textAlign: 'center', fontSize: 11, color: 'rgba(6,3,43,0.40)', margin: 0 }}>
          <Link
            href="/login"
            data-testid="request-access-back-to-login"
            style={{ color: 'rgba(6,3,43,0.55)', textDecoration: 'none', fontWeight: 500 }}
          >
            ← Torna al login
          </Link>
        </p>

        {/* Footer */}
        <p style={{ fontSize: 10, color: 'rgba(6,3,43,0.28)', textAlign: 'center', marginTop: 20, lineHeight: 1.5 }}>
          KORA non registra utenti pubblici: attiva identita gia provisionate.
          {' · '}
          <Link href="/privacy" data-testid="request-access-privacy-link" style={{ color: 'inherit' }}>Privacy</Link>
        </p>
      </div>
    </div>
  );
}
