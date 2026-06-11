// app/admin/preview/worker/privacy/page.tsx
// B122: KORA_ADMIN presentation preview of the Worker Privacy & Sharing settings.
//
// Shows a SYNTHETIC EXAMPLE of what a worker sees in /worker/privacy.
// Does NOT access real worker privacy preferences or real session data.
//
// Access: KORA_ADMIN only (requireKoraAdmin enforced).
// Privacy rules:
//   - No real worker data — all content is illustrative
//   - No query to personal schema
//   - Banner makes the synthetic nature explicit and non-suppressible

import { requireKoraAdmin, isKoraAuthError } from '@/lib/auth/kora-session';
import { redirect } from 'next/navigation';

export const metadata = { title: 'Admin Preview — Privacy & Condivisione · KORA' };

const FONT = 'Plus Jakarta Sans, system-ui, sans-serif';

const SYNTHETIC_PRIVATE = [
  'Il tuo Dynamic Impact CV',
  'La tua storia di partecipazione alle iniziative',
  'I tuoi interessi personali e le note private',
  'Lo stato del tuo onboarding KORA',
  'I tuoi dati di benessere e percorso formativo individuale',
];

const SYNTHETIC_AGGREGATED = [
  'Tasso di attivazione aziendale (media anonima aggregata)',
  'Distribuzione pillar a livello company (senza identificazione individuale)',
  'KORA Index (indicatore organizzativo, non individuale)',
];

export default async function AdminPreviewWorkerPrivacyPage() {
  const auth = await requireKoraAdmin();
  if (isKoraAuthError(auth)) redirect('/login?role_hint=admin');

  return (
    <div
      data-testid="admin-preview-worker-privacy"
      style={{ maxWidth: 720, margin: '0 auto', padding: '32px 24px', fontFamily: FONT }}
    >
      {/* Synthetic banner — non-suppressible */}
      <div
        data-testid="admin-preview-privacy-banner"
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
            KORA Admin Preview — esempio sintetico, non impostazioni reali di un worker.
          </p>
          <p style={{ fontSize: 11, color: 'rgba(139,69,19,0.80)', margin: 0, lineHeight: 1.6 }}>
            Questa pagina illustra il pannello Privacy & Condivisione che ogni lavoratore
            vede in <strong>/worker/privacy</strong>. Le impostazioni reali di un worker
            sono private e accessibili solo al worker autenticato.
          </p>
        </div>
      </div>

      {/* Header nav */}
      <div style={{ marginBottom: 20 }}>
        <a href="/admin" style={{ fontSize: 11, color: 'rgba(6,3,43,0.40)', textDecoration: 'none', display: 'inline-block', marginBottom: 8 }}>
          &#8592; Admin Dashboard
        </a>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#06032B', letterSpacing: '-0.025em', margin: '0 0 4px' }}>
          Privacy & Condivisione &mdash; Anteprima Admin
        </h1>
        <p style={{ fontSize: 12, color: 'rgba(6,3,43,0.50)', margin: 0 }}>
          Esempio visivo del pannello privacy del lavoratore. Contenuto sintetico.
        </p>
      </div>

      {/* Employer not-visible — synthetic illustration */}
      <div
        style={{
          background:   'rgba(47,125,85,0.07)',
          border:       '1.5px solid rgba(47,125,85,0.25)',
          borderRadius: 12,
          padding:      '14px 18px',
          marginBottom: 20,
        }}
      >
        <p style={{ fontSize: 13, fontWeight: 700, color: '#1a4731', margin: '0 0 4px' }}>
          &#128274; Il tuo datore di lavoro non vede questi dati.
        </p>
        <p style={{ fontSize: 11, color: 'rgba(26,71,49,0.80)', margin: 0, lineHeight: 1.6 }}>
          KORA misura le organizzazioni, non valuta i singoli lavoratori.
        </p>
      </div>

      {/* Private data list */}
      <div style={{ background: '#fff', border: '1px solid rgba(6,3,43,0.09)', borderRadius: 12, padding: '18px 22px', marginBottom: 14 }}>
        <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.10em', color: 'rgba(6,3,43,0.35)', margin: '0 0 12px' }}>
          Dati sempre privati (sintetico)
        </p>
        <ul style={{ margin: 0, padding: '0 0 0 18px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {SYNTHETIC_PRIVATE.map((item, i) => (
            <li key={i} style={{ fontSize: 12, color: '#06032B', lineHeight: 1.5 }}>{item}</li>
          ))}
        </ul>
      </div>

      {/* Aggregated data list */}
      <div style={{ background: '#fff', border: '1px solid rgba(6,3,43,0.09)', borderRadius: 12, padding: '18px 22px', marginBottom: 14 }}>
        <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.10em', color: 'rgba(6,3,43,0.35)', margin: '0 0 12px' }}>
          Dati aggregati visibili all&apos;azienda (sintetico)
        </p>
        <ul style={{ margin: 0, padding: '0 0 0 18px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {SYNTHETIC_AGGREGATED.map((item, i) => (
            <li key={i} style={{ fontSize: 12, color: '#06032B', lineHeight: 1.5 }}>{item}</li>
          ))}
        </ul>
      </div>

      {/* Sharing controls preview */}
      <div style={{ background: '#fff', border: '1px solid rgba(6,3,43,0.09)', borderRadius: 12, padding: '18px 22px', marginBottom: 14 }}>
        <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.10em', color: 'rgba(6,3,43,0.35)', margin: '0 0 12px' }}>
          Controlli condivisione (prossimamente)
        </p>
        {['Condivisione CV selettiva', 'Snapshot pubblico anonimo', 'Condivisione LinkedIn'].map((label, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', border: '1px solid rgba(6,3,43,0.07)', borderRadius: 8, marginBottom: i < 2 ? 8 : 0, opacity: 0.55 }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: '#06032B', margin: 0 }}>{label}</p>
            <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'rgba(6,3,43,0.35)', background: 'rgba(6,3,43,0.04)', border: '1px solid rgba(6,3,43,0.12)', borderRadius: 5, padding: '3px 8px' }}>
              Prossimamente
            </span>
          </div>
        ))}
      </div>

      {/* Privacy footer */}
      <div style={{ borderTop: '1px solid rgba(6,3,43,0.06)', paddingTop: 14 }}>
        <p style={{ fontSize: 10, color: 'rgba(6,3,43,0.30)', margin: 0, lineHeight: 1.6 }}>
          KORA Admin Preview &middot; Privacy & Condivisione &middot; B122 Foundation Light &middot;
          Le impostazioni reali sono visibili solo al lavoratore autenticato.
        </p>
      </div>
    </div>
  );
}
