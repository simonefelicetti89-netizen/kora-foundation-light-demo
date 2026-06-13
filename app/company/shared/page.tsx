'use client';
// C-10: Spazio Condiviso — locked shell per sessioni live.
// Nessun dato individuale. Abilitato solo dopo configurazione, policy e moderazione.

import Link from 'next/link';
import { useCompanySession } from '../_providers/CompanySessionProvider';
import { TOKENS } from '@/lib/design/kora-design-tokens';

export default function KoraSharedView() {
  const { sessionLoading } = useCompanySession();

  if (sessionLoading) return null;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', color: TOKENS.inkHint, marginBottom: 6 }}>
          Spazio Condiviso
        </p>
        <h1 style={{ fontSize: '22px', fontWeight: 700, color: TOKENS.ink, marginBottom: 4 }}>
          KORA Shared Space
        </h1>
        <p style={{ fontSize: '13px', color: TOKENS.inkSecondary, lineHeight: 1.55 }}>
          Spazio condiviso non ancora attivo per questo tenant live. KORA abiliterà lo spazio condiviso solo dopo configurazione, policy di moderazione e dati validati.
        </p>
      </div>

      <div
        className="rounded-[16px] px-5 py-4"
        style={{ background: TOKENS.taupe, border: `1px solid ${TOKENS.inkBorderStrong}` }}
      >
        <p style={{ fontSize: '11px', fontWeight: 700, color: TOKENS.ink, marginBottom: 8 }}>Prerequisiti</p>
        <ul className="space-y-1.5 pl-3" style={{ fontSize: '11px', color: TOKENS.inkSecondary, lineHeight: 1.5 }}>
          <li className="list-disc">Dati KORA Index elaborati e validati da KORA Admin.</li>
          <li className="list-disc">Policy di condivisione approvata dal Company Admin.</li>
          <li className="list-disc">Moderazione e governance dei contenuti configurata.</li>
        </ul>
      </div>

      <Link href="/company/workspace" style={{ fontSize: '12px', fontWeight: 600, color: TOKENS.inkSecondary }}>
        ← Workspace
      </Link>

      <p style={{ fontSize: '10px', fontFamily: 'monospace', color: TOKENS.inkHint }}>
        modulo non attivo · nessun dato sintetico
      </p>
    </div>
  );
}
