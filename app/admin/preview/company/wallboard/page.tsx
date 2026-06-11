// app/admin/preview/company/wallboard/page.tsx
// B119 FASE 5: KORA_ADMIN preview entry point per la Company Wallboard.
//
// Scopo: KORA_ADMIN può visualizzare la Wallboard aziendale senza bisogno di
//        una sessione COMPANY_ADMIN. Non viene inviato al login company.
//
// Funzionamento:
//   - Richiede requireKoraAdmin() — KORA_ADMIN session only
//   - Mostra la lista delle company disponibili con link diretti alla Wallboard
//   - In Foundation Light: preview informativa con link alla Live Preview esistente
//   - Non richiede company login

import { requireKoraAdmin, isKoraAuthError } from '@/lib/auth/kora-session';
import { redirect } from 'next/navigation';

export const metadata = { title: 'Admin Preview — Company Wallboard · KORA' };

const FONT = 'Plus Jakarta Sans, system-ui, sans-serif';

export default async function AdminPreviewCompanyWallboardPage() {
  const auth = await requireKoraAdmin();
  if (isKoraAuthError(auth)) redirect('/login?role_hint=admin');

  return (
    <div
      data-testid="admin-preview-company-wallboard"
      style={{ maxWidth: 640, margin: '0 auto', padding: '40px 24px', fontFamily: FONT }}
    >
      {/* Admin Preview Banner */}
      <div
        data-testid="admin-preview-wallboard-banner"
        style={{
          background:   'rgba(199,111,61,0.10)',
          border:       '1.5px solid rgba(199,111,61,0.40)',
          borderRadius: 12,
          padding:      '14px 18px',
          marginBottom: 28,
          display:      'flex',
          gap:          12,
        }}
      >
        <span style={{ fontSize: 18, lineHeight: 1 }}>👁</span>
        <div>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#8B4513', margin: '0 0 4px' }}>
            KORA Admin Preview — Company Wallboard
          </p>
          <p style={{ fontSize: 12, color: 'rgba(139,69,19,0.80)', margin: 0, lineHeight: 1.6 }}>
            Accesso admin diretto. Non è richiesto un login company per questa anteprima.
            La Wallboard live è visibile ai COMPANY_ADMIN della singola azienda tramite{' '}
            <strong>/company/wallboard</strong>.
          </p>
        </div>
      </div>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <a
          href="/admin"
          style={{ fontSize: 11, color: 'rgba(6,3,43,0.40)', textDecoration: 'none', display: 'inline-block', marginBottom: 12 }}
        >
          ← Admin Dashboard
        </a>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#06032B', letterSpacing: '-0.03em', margin: '0 0 4px' }}>
          Company Wallboard — Admin Preview
        </h1>
        <p style={{ fontSize: 13, color: 'rgba(6,3,43,0.50)', margin: 0 }}>
          Visualizza la bacheca aggregata di un&apos;azienda nella piattaforma.
        </p>
      </div>

      {/* Info section */}
      <div
        style={{
          border:       '1px solid rgba(6,3,43,0.10)',
          borderRadius: 14,
          overflow:     'hidden',
          marginBottom: 20,
        }}
      >
        <div style={{ padding: '14px 20px', background: 'rgba(6,3,43,0.02)', borderBottom: '1px solid rgba(6,3,43,0.07)' }}>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', color: 'rgba(6,3,43,0.35)', margin: 0 }}>
            Come funziona
          </p>
        </div>
        <div style={{ padding: '16px 20px' }}>
          <p style={{ fontSize: 13, color: 'rgba(6,3,43,0.65)', margin: '0 0 12px', lineHeight: 1.6 }}>
            La <strong>KORA Wallboard</strong> è la vista aggregata e proiettabile del KORA Index™ disponibile
            per ciascuna azienda sulla piattaforma. Mostra solo dati company-level — nessun dato individuale worker.
          </p>
          <ul style={{ margin: '0 0 12px', padding: '0 0 0 18px', fontSize: 12, color: 'rgba(6,3,43,0.60)', lineHeight: 1.8 }}>
            <li>Accesso diretto per COMPANY_ADMIN via <code style={{ fontSize: 11, background: 'rgba(6,3,43,0.05)', padding: '1px 4px', borderRadius: 4 }}>/company/wallboard</code></li>
            <li>Visibile a COMPANY_VIEWER (legacy) — solo-lettura</li>
            <li>Non richiede COMPANY_VIEWER come ruolo prodotto</li>
            <li>Dati aggregati, privacy-safe, proiettabili su schermi interni</li>
          </ul>
        </div>
      </div>

      {/* Link to live company preview */}
      <div
        style={{
          border:       '1px solid rgba(97,86,245,0.20)',
          borderRadius: 14,
          padding:      '16px 20px',
          background:   'rgba(97,86,245,0.04)',
        }}
      >
        <p style={{ fontSize: 12, fontWeight: 600, color: '#3b30c9', margin: '0 0 8px' }}>
          Anteprima Live Cockpit disponibile
        </p>
        <p style={{ fontSize: 12, color: 'rgba(6,3,43,0.55)', margin: '0 0 14px', lineHeight: 1.6 }}>
          Per visualizzare i dati reali di un&apos;azienda in modalità admin, usa l&apos;Anteprima Live Cockpit.
          Seleziona l&apos;azienda dalla Company Console e accedi alla vista ristretta.
        </p>
        <div style={{ display: 'flex', gap: 10 }}>
          <a
            href="/admin/company-live-preview"
            style={{
              display:        'inline-block',
              fontSize:       12,
              fontWeight:     600,
              color:          '#3b30c9',
              textDecoration: 'none',
              padding:        '7px 14px',
              border:         '1px solid rgba(97,86,245,0.28)',
              borderRadius:   8,
              background:     'rgba(97,86,245,0.06)',
            }}
          >
            Anteprima Live Cockpit →
          </a>
          <a
            href="/admin/companies"
            style={{
              display:        'inline-block',
              fontSize:       12,
              fontWeight:     600,
              color:          'rgba(6,3,43,0.55)',
              textDecoration: 'none',
              padding:        '7px 14px',
              border:         '1px solid rgba(6,3,43,0.14)',
              borderRadius:   8,
            }}
          >
            Company Console
          </a>
        </div>
      </div>

      <div style={{ marginTop: 24, fontSize: 10, color: 'rgba(6,3,43,0.28)', lineHeight: 1.5 }}>
        KORA Admin Preview · Company Wallboard · B119 Foundation Light
      </div>
    </div>
  );
}
