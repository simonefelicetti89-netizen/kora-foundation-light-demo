'use client';
// app/worker/privacy/_components/PrivacySettingsClient.tsx
// B122: Worker Privacy & Sharing Settings — client panel.
//
// Shows the worker their privacy model clearly:
//   - What is always private (personal space, CV, participation history)
//   - What the employer sees (aggregate-only, anonymous)
//   - What future sharing controls will look like (all disabled in this sprint)
//
// Privacy: no individual worker data sent to employer. No public link.
// Sharing controls are all disabled ("coming soon") in Foundation Light.

import { useState, useEffect } from 'react';
import type { PrivacySettingsResponse } from '@/app/api/worker/privacy-settings/route';

const FONT = 'Plus Jakarta Sans, system-ui, sans-serif';

interface PrivacySettingsClientProps {
  userEmail: string;
}

export function PrivacySettingsClient({ userEmail: _userEmail }: PrivacySettingsClientProps) {
  const [settings, setSettings] = useState<PrivacySettingsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/worker/privacy-settings')
      .then(r => r.json())
      .then((data: PrivacySettingsResponse) => { setSettings(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div
      data-testid="worker-privacy-page"
      style={{ maxWidth: 720, margin: '0 auto', padding: '32px 24px', fontFamily: FONT }}
    >
      {/* Back nav */}
      <a href="/worker/workspace" style={{ fontSize: 11, color: 'rgba(6,3,43,0.40)', textDecoration: 'none', display: 'inline-block', marginBottom: 20 }}>
        ← Il tuo spazio
      </a>

      {/* Hero */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#06032B', letterSpacing: '-0.03em', margin: '0 0 6px' }}>
          Privacy & Condivisione
        </h1>
        <p style={{ fontSize: 13, color: 'rgba(6,3,43,0.50)', margin: 0, lineHeight: 1.6 }}>
          Controlla cosa resta privato e cosa potrai condividere in futuro.
        </p>
      </div>

      {/* Employer not-visible banner — non-suppressible */}
      <div
        data-testid="privacy-employer-not-visible"
        style={{
          background:   'rgba(47,125,85,0.07)',
          border:       '1.5px solid rgba(47,125,85,0.25)',
          borderRadius: 12,
          padding:      '16px 20px',
          marginBottom: 24,
          display:      'flex',
          gap:          12,
          alignItems:   'flex-start',
        }}
      >
        <span style={{ fontSize: 18, lineHeight: 1, flexShrink: 0 }}>&#128274;</span>
        <div>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#1a4731', margin: '0 0 4px' }}>
            Il tuo datore di lavoro non vede questi dati.
          </p>
          <p style={{ fontSize: 12, color: 'rgba(26,71,49,0.80)', margin: 0, lineHeight: 1.6 }}>
            KORA misura le organizzazioni, non valuta i singoli lavoratori.
            Il tuo spazio personale, il tuo CV e la tua storia di partecipazione
            sono visibili solo a te.
          </p>
        </div>
      </div>

      {/* Private data section */}
      <div
        data-testid="privacy-private-data"
        style={{
          background:   '#fff',
          border:       '1px solid rgba(6,3,43,0.09)',
          borderRadius: 14,
          padding:      '20px 24px',
          marginBottom: 16,
        }}
      >
        <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.10em', color: 'rgba(6,3,43,0.35)', margin: '0 0 14px' }}>
          Dati sempre privati — solo tu li vedi
        </p>
        {loading ? (
          <p style={{ fontSize: 12, color: 'rgba(6,3,43,0.35)', margin: 0 }}>Caricamento...</p>
        ) : (
          <ul style={{ margin: 0, padding: '0 0 0 18px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {(settings?.privateData ?? [
              'Il tuo Dynamic Impact CV',
              'La tua storia di partecipazione alle iniziative',
              'I tuoi interessi personali e le note private',
              'Lo stato del tuo onboarding KORA',
              'I tuoi dati di benessere e percorso formativo individuale',
            ]).map((item, i) => (
              <li key={i} style={{ fontSize: 12, color: '#06032B', lineHeight: 1.5 }}>
                {item}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Aggregated data section */}
      <div
        data-testid="privacy-aggregated-data"
        style={{
          background:   '#fff',
          border:       '1px solid rgba(6,3,43,0.09)',
          borderRadius: 14,
          padding:      '20px 24px',
          marginBottom: 16,
        }}
      >
        <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.10em', color: 'rgba(6,3,43,0.35)', margin: '0 0 14px' }}>
          Dati aggregati visibili all&apos;azienda — anonimi, senza identificarti
        </p>
        {loading ? (
          <p style={{ fontSize: 12, color: 'rgba(6,3,43,0.35)', margin: 0 }}>Caricamento...</p>
        ) : (
          <ul style={{ margin: 0, padding: '0 0 0 18px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {(settings?.aggregatedData ?? [
              'Tasso di attivazione aziendale (media anonima aggregata)',
              'Distribuzione pillar a livello company (senza identificazione individuale)',
              'KORA Index (indicatore organizzativo, non individuale)',
            ]).map((item, i) => (
              <li key={i} style={{ fontSize: 12, color: '#06032B', lineHeight: 1.5 }}>
                {item}
              </li>
            ))}
          </ul>
        )}
        <p style={{ fontSize: 10, color: 'rgba(6,3,43,0.35)', margin: '14px 0 0', lineHeight: 1.5 }}>
          I dati aggregati sono calcolati su gruppi con almeno 10 lavoratori attivi.
          Sotto questa soglia, i dati vengono soppressi per tutelare la tua privacy.
        </p>
      </div>

      {/* Sharing controls — all disabled in Foundation Light */}
      <div
        data-testid="privacy-sharing-controls"
        style={{
          background:   '#fff',
          border:       '1px solid rgba(6,3,43,0.09)',
          borderRadius: 14,
          padding:      '20px 24px',
          marginBottom: 16,
        }}
      >
        <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.10em', color: 'rgba(6,3,43,0.35)', margin: '0 0 4px' }}>
          Controlli condivisione
        </p>
        <p style={{ fontSize: 11, color: 'rgba(6,3,43,0.45)', margin: '0 0 16px', lineHeight: 1.5 }}>
          La condivisione sarà sempre sotto il tuo controllo. Le funzioni qui sotto
          saranno attivabili nelle prossime versioni di KORA.
        </p>

        {/* CV Share toggle — disabled */}
        <div
          data-testid="privacy-sharing-cv-share"
          style={{
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'space-between',
            padding:        '12px 16px',
            border:         '1px solid rgba(6,3,43,0.08)',
            borderRadius:   10,
            marginBottom:   10,
            opacity:        0.55,
          }}
        >
          <div>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#06032B', margin: '0 0 2px' }}>
              Condivisione CV selettiva
            </p>
            <p style={{ fontSize: 11, color: 'rgba(6,3,43,0.50)', margin: 0 }}>
              Condividi il tuo Dynamic Impact CV con chi scegli tu.
            </p>
          </div>
          <button
            disabled
            data-testid="privacy-sharing-cv-toggle"
            style={{
              fontFamily:   FONT,
              fontSize:     10,
              fontWeight:   700,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              padding:      '5px 12px',
              border:       '1px solid rgba(6,3,43,0.15)',
              borderRadius: 6,
              background:   'rgba(6,3,43,0.04)',
              color:        'rgba(6,3,43,0.35)',
              cursor:       'not-allowed',
            }}
          >
            Prossimamente
          </button>
        </div>

        {/* Public link — disabled */}
        <div
          data-testid="privacy-sharing-public-link"
          style={{
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'space-between',
            padding:        '12px 16px',
            border:         '1px solid rgba(6,3,43,0.08)',
            borderRadius:   10,
            marginBottom:   10,
            opacity:        0.55,
          }}
        >
          <div>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#06032B', margin: '0 0 2px' }}>
              Snapshot pubblico anonimo
            </p>
            <p style={{ fontSize: 11, color: 'rgba(6,3,43,0.50)', margin: 0 }}>
              Link revocabile e anonimizzato. Sempre sotto il tuo controllo.
            </p>
          </div>
          <button
            disabled
            data-testid="privacy-sharing-public-toggle"
            style={{
              fontFamily:   FONT,
              fontSize:     10,
              fontWeight:   700,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              padding:      '5px 12px',
              border:       '1px solid rgba(6,3,43,0.15)',
              borderRadius: 6,
              background:   'rgba(6,3,43,0.04)',
              color:        'rgba(6,3,43,0.35)',
              cursor:       'not-allowed',
            }}
          >
            Prossimamente
          </button>
        </div>

        {/* LinkedIn share — disabled */}
        <div
          data-testid="privacy-sharing-linkedin"
          style={{
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'space-between',
            padding:        '12px 16px',
            border:         '1px solid rgba(6,3,43,0.08)',
            borderRadius:   10,
            opacity:        0.55,
          }}
        >
          <div>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#06032B', margin: '0 0 2px' }}>
              Condivisione LinkedIn
            </p>
            <p style={{ fontSize: 11, color: 'rgba(6,3,43,0.50)', margin: 0 }}>
              Aggiungi KORA Impact al tuo profilo professionale.
            </p>
          </div>
          <button
            disabled
            data-testid="privacy-sharing-linkedin-toggle"
            style={{
              fontFamily:   FONT,
              fontSize:     10,
              fontWeight:   700,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              padding:      '5px 12px',
              border:       '1px solid rgba(6,3,43,0.15)',
              borderRadius: 6,
              background:   'rgba(6,3,43,0.04)',
              color:        'rgba(6,3,43,0.35)',
              cursor:       'not-allowed',
            }}
          >
            Prossimamente
          </button>
        </div>
      </div>

      {/* Links section */}
      <div
        data-testid="privacy-links-section"
        style={{
          background:   '#FAFAFA',
          border:       '1px solid rgba(6,3,43,0.07)',
          borderRadius: 14,
          padding:      '16px 20px',
          marginBottom: 16,
          display:      'flex',
          flexDirection: 'column',
          gap:          10,
        }}
      >
        <a href="/worker/onboarding?mode=review" style={{ fontSize: 12, fontWeight: 600, color: '#06032B', textDecoration: 'none' }}>
          Rivedi le impostazioni di onboarding →
        </a>
        <a href="/worker/dynamic-cv" style={{ fontSize: 12, fontWeight: 600, color: '#3B6EBA', textDecoration: 'none' }}>
          Vedi il tuo Dynamic Impact CV →
        </a>
        <a href="/worker/workspace" style={{ fontSize: 12, fontWeight: 600, color: '#06032B', textDecoration: 'none' }}>
          Torna al tuo spazio →
        </a>
      </div>

      {/* Interpretation note */}
      <div
        data-testid="privacy-interpretation-note"
        style={{ borderTop: '1px solid rgba(6,3,43,0.06)', paddingTop: 16, marginTop: 8 }}
      >
        <p style={{ fontSize: 10, color: 'rgba(6,3,43,0.32)', margin: 0, lineHeight: 1.6 }}>
          {settings?.interpretationNote ??
            'KORA misura le organizzazioni, non valuta i singoli lavoratori. ' +
            'Il tuo datore di lavoro non vede mai dati individuali. ' +
            'Solo medie aggregate anonime sono visibili a livello aziendale.'}
        </p>
        <p style={{ fontSize: 10, color: 'rgba(6,3,43,0.28)', margin: '6px 0 0', lineHeight: 1.5 }}>
          KORA Foundation Light &middot; Privacy & Condivisione &middot; Metodologia v0.1 pre-empirical
        </p>
      </div>
    </div>
  );
}
