// app/admin/preview/partner/workspace/page.tsx
// B127: KORA_ADMIN synthetic preview of the Partner Workspace.
//
// Access: KORA_ADMIN only (requireKoraAdmin enforced).
// Purpose: allow KORA_ADMIN to present the Partner Workspace concept
//   without logging in as a real PARTNER user.
//
// Privacy rules:
//   - No real partner data — all fixtures are synthetic
//   - Banner makes synthetic nature explicit and non-suppressible
//   - KORA_ADMIN cannot generate real partner user sessions from this page

import { requireKoraAdmin, isKoraAuthError } from '@/lib/auth/kora-session';
import { redirect } from 'next/navigation';

export const metadata = { title: 'Admin Preview — Partner Workspace · KORA' };

const FONT = 'Plus Jakarta Sans, system-ui, sans-serif';

const SYNTHETIC_PARTNER = {
  name:          'Città Aperta APS',
  email:         'referente@cittaaperta.example.com',
  category:      'Associazione di Promozione Sociale',
  pillar:        'IMPACT',
  delivery_mode: 'hybrid',
  city:          'Bergamo',
  description:   'Associazione dedicata al volontariato territoriale e alla coesione sociale. Attiva nella provincia di Bergamo.',
  website_url:   'https://cittaaperta.example.com',
  status:        'published',
};

export default async function AdminPreviewPartnerWorkspacePage() {
  const auth = await requireKoraAdmin();
  if (isKoraAuthError(auth)) redirect('/login?role_hint=admin');

  const partner = SYNTHETIC_PARTNER;

  return (
    <div
      data-testid="admin-preview-partner-workspace"
      style={{ maxWidth: 760, margin: '0 auto', padding: '32px 24px', fontFamily: FONT }}
    >
      {/* Synthetic banner — non-suppressible */}
      <div
        data-testid="admin-preview-partner-banner"
        style={{
          background:   'rgba(199,111,61,0.09)',
          border:       '1.5px solid rgba(199,111,61,0.35)',
          borderRadius: 12,
          padding:      '14px 18px',
          marginBottom: 28,
          display:      'flex',
          gap:          10,
          alignItems:   'flex-start',
        }}
      >
        <span style={{ fontSize: 16, lineHeight: 1 }}>&#9888;&#65039;</span>
        <div>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#8B4513', margin: '0 0 4px' }}>
            KORA Admin Preview — esempio sintetico, nessun accesso partner reale.
          </p>
          <p style={{ fontSize: 11, color: 'rgba(139,69,19,0.80)', margin: 0, lineHeight: 1.6 }}>
            I dati mostrati sono fittizi. Il workspace reale è accessibile solo al partner autenticato
            tramite <strong>/partner/workspace</strong>.
            KORA_ADMIN non si autentica come partner reale.
          </p>
        </div>
      </div>

      <div style={{ marginBottom: 20 }}>
        <a href="/admin/partners" style={{ fontSize: 11, color: 'rgba(6,3,43,0.40)', textDecoration: 'none', display: 'inline-block', marginBottom: 8 }}>
          &#8592; Gestione Partner
        </a>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#06032B', letterSpacing: '-0.025em', margin: '0 0 4px' }}>
          Partner Workspace — Anteprima Admin
        </h1>
        <p style={{ fontSize: 12, color: 'rgba(6,3,43,0.50)', margin: 0 }}>
          Esempio visivo dell&apos;area partner. Dati sintetici.
        </p>
      </div>

      {/* Hero sintetico */}
      <div style={{ background: '#06032B', borderRadius: 16, padding: '24px 28px', marginBottom: 16 }}>
        <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', margin: '0 0 6px' }}>
          Area Partner KORA · esempio sintetico
        </p>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#FFFFFF', margin: '0 0 4px' }}>
          {partner.name}
        </h2>
        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.40)', margin: '0 0 10px' }}>
          {partner.email}
        </p>
        <div style={{ display: 'flex', gap: 8 }}>
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '3px 10px', borderRadius: 999, background: 'rgba(192,125,42,0.20)', color: '#C07D2A', border: '1px solid rgba(192,125,42,0.40)' }}>
            {partner.pillar}
          </span>
          <span style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', padding: '3px 10px', borderRadius: 999, background: 'rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.60)', border: '1px solid rgba(255,255,255,0.15)' }}>
            {partner.delivery_mode}
          </span>
        </div>
      </div>

      {/* Boundary card */}
      <div style={{ background: 'rgba(47,125,85,0.07)', border: '1.5px solid rgba(47,125,85,0.22)', borderRadius: 12, padding: '16px 20px', marginBottom: 16 }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: '#2F7D55', margin: '0 0 8px' }}>
          Perimetro dati — accesso partner (esempio)
        </p>
        <ul style={{ margin: 0, padding: '0 0 0 18px', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {[
            'Non ha accesso a dati individuali dei lavoratori.',
            'Non ha accesso al KORA Index delle aziende.',
            'Non ha accesso a Dynamic Impact CV o PIB individuali.',
            'Le opportunità sono visibili ai worker solo se il profilo è pubblicato.',
          ].map((item, i) => (
            <li key={i} style={{ fontSize: 12, color: '#2F7D55', lineHeight: 1.5 }}>{item}</li>
          ))}
        </ul>
      </div>

      {/* Profilo partner sintetico */}
      <div style={{ border: '1px solid rgba(6,3,43,0.09)', borderRadius: 14, padding: '20px 24px', marginBottom: 16, background: '#FAFAFA' }}>
        <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.10em', color: 'rgba(6,3,43,0.35)', margin: '0 0 14px' }}>
          Profilo partner (sintetico)
        </p>
        <p style={{ fontSize: 13, color: '#06032B', margin: '0 0 12px', lineHeight: 1.6 }}>
          {partner.description}
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {[
            { label: 'Categoria',   value: partner.category      },
            { label: 'Città',       value: partner.city          },
            { label: 'Modalità',    value: partner.delivery_mode },
            { label: 'Sito web',    value: partner.website_url   },
          ].map(({ label, value }) => (
            <div key={label}>
              <p style={{ fontSize: 10, color: 'rgba(6,3,43,0.40)', margin: '0 0 2px' }}>{label}</p>
              <p style={{ fontSize: 12, color: '#06032B', margin: 0 }}>{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Status visibilità */}
      <div style={{ border: '1px solid rgba(6,3,43,0.09)', borderRadius: 14, padding: '20px 24px', marginBottom: 16, background: '#FAFAFA' }}>
        <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.10em', color: 'rgba(6,3,43,0.35)', margin: '0 0 10px' }}>
          Visibilità nel catalogo opportunità (sintetico)
        </p>
        <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', padding: '3px 10px', borderRadius: 999, background: 'rgba(47,125,85,0.08)', color: '#2F7D55', border: '1px solid rgba(47,125,85,0.22)', display: 'inline-block', marginBottom: 10 }}>
          Pubblicato
        </span>
        <p style={{ fontSize: 13, color: '#06032B', margin: 0 }}>
          Visibile nel catalogo opportunità worker.
        </p>
      </div>

      {/* Privacy footer */}
      <div style={{ borderTop: '1px solid rgba(6,3,43,0.06)', paddingTop: 14 }}>
        <p style={{ fontSize: 10, color: 'rgba(6,3,43,0.30)', margin: 0, lineHeight: 1.6 }}>
          KORA Admin Preview · Partner Workspace · B127 Foundation Light ·
          Dati sintetici. Il workspace reale è visibile solo al partner autenticato.
          KORA_ADMIN non si autentica come partner reale per generare questa vista.
        </p>
      </div>
    </div>
  );
}
