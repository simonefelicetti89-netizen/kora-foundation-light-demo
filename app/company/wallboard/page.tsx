// app/company/wallboard/page.tsx
// B119: KORA Wallboard — vista aggregata proiettabile per uso interno aziendale.
//
// Accesso: COMPANY_ADMIN (B143: COMPANY_VIEWER rimosso).
// KORA_ADMIN: non può accedere come company user — mostra messaggio admin esplicito
//             con link all'anteprima admin disponibile.
//
// Privacy:
//   - requireCompanyUser() garantisce sessione company autenticata
//   - Nessun dato individuale worker passato alla view
//   - WallboardClient recupera solo aggregate via API company

import { requireCompanyUser, isKoraAuthError } from '@/lib/auth/kora-session';
import { WallboardClient } from './_components/WallboardClient';

export const metadata = { title: 'KORA Wallboard · Vista Aggregata' };

export default async function CompanyWallboardPage() {
  const auth = await requireCompanyUser();

  // KORA_ADMIN o sessione non autorizzata: mostra messaggio esplicativo
  if (isKoraAuthError(auth)) {
    return (
      <div
        data-testid="wallboard-access-denied"
        style={{
          maxWidth:     520,
          margin:       '60px auto',
          padding:      '32px 28px',
          border:       '1px solid rgba(6,3,43,0.10)',
          borderRadius: 16,
          fontFamily:   'Plus Jakarta Sans, system-ui, sans-serif',
          textAlign:    'center',
        }}
      >
        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', color: 'rgba(6,3,43,0.35)', margin: '0 0 12px' }}>
          Accesso negato
        </p>
        <p style={{ fontSize: 14, fontWeight: 600, color: '#06032B', margin: '0 0 8px' }}>
          La KORA Wallboard richiede una sessione company.
        </p>
        <p style={{ fontSize: 12, color: 'rgba(6,3,43,0.50)', margin: '0 0 20px', lineHeight: 1.6 }}>
          Come KORA Admin, usa la preview aziendale per visualizzare i dati di un&apos;azienda.
        </p>
        <a
          href="/admin/preview/company/wallboard"
          style={{
            display:        'inline-block',
            fontSize:       12,
            fontWeight:     600,
            color:          '#3b30c9',
            textDecoration: 'none',
            padding:        '7px 16px',
            border:         '1px solid rgba(97,86,245,0.28)',
            borderRadius:   8,
            background:     'rgba(97,86,245,0.06)',
            marginRight:    8,
          }}
        >
          Vai alla preview admin →
        </a>
        <a
          href="/admin"
          style={{ fontSize: 12, color: 'rgba(6,3,43,0.40)', textDecoration: 'none' }}
        >
          ← Admin
        </a>
      </div>
    );
  }

  return (
    <WallboardClient
      userEmail={auth.email}
      userRole={auth.koraRole}
    />
  );
}
