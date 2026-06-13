'use client';
// C-OPP: Opportunity Center — locked shell per sessioni live.
// Modulo attivabile solo dopo dati validati e configurazione KORA Admin.
// Demo experience: opportunità disponibili nell'Activation Intelligence demo.

import Link from 'next/link';
import { TOKENS } from '@/lib/design/kora-design-tokens';

export default function OpportunitiesPage() {
  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', color: TOKENS.inkHint, marginBottom: 6 }}>
          Opportunità di Attivazione
        </p>
        <h1 style={{ fontSize: '22px', fontWeight: 700, color: TOKENS.ink, marginBottom: 4 }}>
          Opportunity Center
        </h1>
        <p style={{ fontSize: '13px', color: TOKENS.inkSecondary, lineHeight: 1.55 }}>
          Modulo non ancora attivo per questo tenant. Le opportunità di attivazione saranno disponibili solo dopo che KORA Admin ha elaborato i dati e completato la configurazione.
        </p>
      </div>

      <div
        className="rounded-[16px] px-5 py-4"
        style={{ background: TOKENS.taupe, border: `1px solid ${TOKENS.inkBorderStrong}` }}
      >
        <p style={{ fontSize: '11px', fontWeight: 700, color: TOKENS.ink, marginBottom: 8 }}>Prerequisiti</p>
        <ul className="space-y-1.5 pl-3" style={{ fontSize: '11px', color: TOKENS.inkSecondary, lineHeight: 1.5 }}>
          <li className="list-disc">KORA Admin ha caricato e validato i dati del tenant.</li>
          <li className="list-disc">Lo scoring KORA Index è stato completato per il periodo corrente.</li>
          <li className="list-disc">Le soglie di aggregazione privacy (N≥10) sono soddisfatte.</li>
        </ul>
      </div>

      <div className="flex gap-3 flex-wrap">
        <Link href="/company/status" style={{ fontSize: '12px', fontWeight: 600, color: TOKENS.accent }}>
          Consulta Status Center →
        </Link>
        <Link href="/company/workspace" style={{ fontSize: '12px', fontWeight: 600, color: TOKENS.inkSecondary }}>
          ← Workspace
        </Link>
      </div>

      <p style={{ fontSize: '10px', fontFamily: 'monospace', color: TOKENS.inkHint }}>
        modulo non attivo · nessun dato sintetico
      </p>
    </div>
  );
}
