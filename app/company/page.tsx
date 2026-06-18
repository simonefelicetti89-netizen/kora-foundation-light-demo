'use client';
// C-01: Executive Cockpit — hub di navigazione live per COMPANY_ADMIN.
// Demo experience: /company/kora-index (via VISTA role switcher)

import Link from 'next/link';
import { useCompanySession } from './_providers/CompanySessionProvider';
import { TOKENS } from '@/lib/design/kora-design-tokens';

const NAV_ITEMS = [
  { href: '/company/workspace',  label: 'Workspace',                desc: 'Il tuo spazio operativo live.' },
  { href: '/company/kora-index', label: 'KORA Index™',              desc: 'Scomposizione analitica dei 10 componenti.' },
  { href: '/company/status',     label: 'Status Center',            desc: 'Stato pipeline, onboarding e prossimi passi.' },
  { href: '/company/reports',    label: 'Decision Pack',            desc: 'Report board-ready e period comparison.' },
  { href: '/company/activation', label: 'Activation Intelligence™', desc: 'Activation Debt e distribuzione pillar.' },
  { href: '/company/financial',  label: 'Budget-to-Human-Impact™',  desc: 'BTI Engine e correlazioni KPI.' },
  { href: '/company/pillars',    label: 'Pillar Analysis',          desc: 'Portfolio programmi sui 5 pillar KORA.' },
] as const;

export default function ExecutiveCockpit() {
  const { companyName } = useCompanySession();

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', color: TOKENS.inkHint, marginBottom: 6 }}>
          Company Workspace · LIVE
        </p>
        <h1 style={{ fontSize: '22px', fontWeight: 700, color: TOKENS.ink, marginBottom: 4 }}>
          {companyName ?? 'Il tuo workspace KORA'}
        </h1>
        <p style={{ fontSize: '13px', color: TOKENS.inkSecondary, lineHeight: 1.55 }}>
          Sessione live attiva. Seleziona l&apos;area da esplorare — tutti i dati sono reali.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-xl px-4 py-3 block"
            style={{ background: TOKENS.surface, border: TOKENS.cardBorder, boxShadow: TOKENS.cardShadow }}
          >
            <p style={{ fontSize: '13px', fontWeight: 600, color: TOKENS.ink }}>{item.label} →</p>
            <p style={{ fontSize: '11px', color: TOKENS.inkSecondary, marginTop: 2 }}>{item.desc}</p>
          </Link>
        ))}
      </div>

      <p style={{ fontSize: '10px', fontFamily: 'monospace', color: TOKENS.inkHint }}>
        live · nessun dato sintetico
      </p>
    </div>
  );
}
