// A-OP: Operator Console — scoring run wizard per KORA_ADMIN.
// Scopo: consentire all'operatore di avviare, monitorare e promuovere scoring run
//        per le aziende assegnate. Azioni irreversibili richiedono conferma esplicita.
// app/admin/operator/page.tsx
// Server Component — KORA_ADMIN only.

import { requireKoraAdmin, isKoraAuthError } from '@/lib/auth/kora-session';
import { OperatorConsole } from './_components/OperatorConsole';
import Link from 'next/link';

export default async function OperatorConsolePage() {
  const auth = await requireKoraAdmin();

  if (isKoraAuthError(auth)) {
    const status = auth.status;
    const is403  = status === 403;

    return (
      <div style={{ maxWidth: 480, margin: '0 auto', marginTop: 64, padding: '0 24px' }}>
        <div style={{
          background:   '#F8F6F1',
          border:       '1px solid rgba(6,3,43,0.08)',
          borderRadius: 20,
          padding:      '32px',
          boxShadow:    '0 10px 30px rgba(6,3,43,0.05)',
          textAlign:    'center',
        }}>
          <h1 style={{ fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif', fontWeight: 800, fontSize: '1.25rem', letterSpacing: '-0.02em', color: '#06032B', marginBottom: 8 }}>
            {is403 ? 'Accesso non autorizzato' : 'Sessione non trovata'}
          </h1>
          <p style={{ fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif', fontSize: '13.5px', color: 'rgba(6,3,43,0.62)', lineHeight: 1.6, marginBottom: 24 }}>
            {is403
              ? "Quest'area è riservata agli operatori KORA Admin. Il tuo account non ha il ruolo necessario."
              : 'Effettua il login come operatore KORA Admin per accedere alla console.'}
          </p>
          <Link
            href="/admin/login"
            style={{
              fontFamily:    'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif',
              fontWeight:    700,
              fontSize:      '13px',
              borderRadius:  12,
              padding:       '10px 20px',
              background:    '#06032B',
              color:         '#FFFFFF',
              textDecoration: 'none',
              display:       'inline-block',
              minHeight:     44,
              lineHeight:    '1.6',
            }}
          >
            Vai al login KORA Admin
          </Link>
        </div>
      </div>
    );
  }

  return (
    <OperatorConsole
      userEmail={auth.email}
      userRole={auth.koraRole}
    />
  );
}
