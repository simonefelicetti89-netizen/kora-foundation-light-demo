'use client';
// C-11: Profilo & Stato — shell live con metadati tenant reali dalla sessione.
// Configurazione avanzata gestita da KORA Admin durante l'onboarding.

import Link from 'next/link';
import { useCompanySession } from '../_providers/CompanySessionProvider';
import { TOKENS } from '@/lib/design/kora-design-tokens';

export default function CompanyProfilePage() {
  const { isLive, companyName, tenantId, koraRole, sessionLoading } = useCompanySession();

  if (sessionLoading) return null;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', color: TOKENS.inkHint, marginBottom: 6 }}>
          Profilo & Stato · {isLive ? 'LIVE' : 'Non configurato'}
        </p>
        <h1 style={{ fontSize: '22px', fontWeight: 700, color: TOKENS.ink, marginBottom: 4 }}>
          {isLive ? (companyName ?? 'La tua organizzazione') : 'Profilo azienda'}
        </h1>
        <p style={{ fontSize: '13px', color: TOKENS.inkSecondary, lineHeight: 1.55 }}>
          {isLive
            ? 'Informazioni del tenant live. La configurazione avanzata è gestita da KORA Admin.'
            : 'Profilo azienda disponibile solo con sessione live attiva. Accedi con le credenziali COMPANY_ADMIN.'}
        </p>
      </div>

      {isLive && tenantId && (
        <div
          className="rounded-[18px] p-5"
          style={{ background: TOKENS.surface, border: TOKENS.cardBorder, boxShadow: TOKENS.cardShadow }}
        >
          <div className="space-y-3">
            {([
              { label: 'Azienda',   value: companyName ?? '—',  mono: false },
              { label: 'Tenant ID', value: tenantId,             mono: true  },
              { label: 'Ruolo',     value: koraRole   ?? '—',   mono: false },
            ] as Array<{ label: string; value: string; mono: boolean }>).map(({ label, value, mono }) => (
              <div key={label}>
                <p style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: TOKENS.inkHint }}>{label}</p>
                <p style={{ fontSize: mono ? '11px' : '13px', color: TOKENS.ink, marginTop: 2, fontFamily: mono ? 'monospace' : undefined }}>{value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div
        className="rounded-[16px] px-5 py-4"
        style={{ background: TOKENS.taupe, border: `1px solid ${TOKENS.inkBorderStrong}` }}
      >
        <p style={{ fontSize: '11px', color: TOKENS.inkSecondary, lineHeight: 1.5 }}>
          La configurazione avanzata del profilo — policy aziendali, settori di attività e struttura workforce — è gestita da KORA Admin durante il processo di onboarding.
        </p>
      </div>

      <div className="flex gap-3 flex-wrap">
        <Link href="/company/status" style={{ fontSize: '12px', fontWeight: 600, color: TOKENS.accent }}>
          Status Center →
        </Link>
        <Link href="/company/workspace" style={{ fontSize: '12px', fontWeight: 600, color: TOKENS.inkSecondary }}>
          ← Workspace
        </Link>
      </div>

      <p style={{ fontSize: '10px', fontFamily: 'monospace', color: TOKENS.inkHint }}>
        {isLive ? `live · tenant: ${tenantId}` : 'nessun dato sintetico'}
      </p>
    </div>
  );
}
