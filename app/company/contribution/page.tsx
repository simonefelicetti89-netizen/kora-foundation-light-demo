'use client';
// C-07: KORA Contribution™ — locked shell per sessioni live.
// KORA Contribution non è una componente del KORA Index™ — indicatore companion separato.

import Link from 'next/link';
import { TOKENS } from '@/lib/design/kora-design-tokens';

export default function KoraContribution() {
  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', color: TOKENS.inkHint, marginBottom: 6 }}>
          Indicatore Companion · KORA Index™
        </p>
        <h1 style={{ fontSize: '22px', fontWeight: 700, color: TOKENS.ink, marginBottom: 4 }}>
          KORA Contribution™
        </h1>
        <p style={{ fontSize: '13px', color: TOKENS.inkSecondary, lineHeight: 1.55 }}>
          KORA Contribution™ non ancora disponibile per questo tenant live. Il modulo richiede dati validati, soglie di aggregazione attive e configurazione delle iniziative collettive.
        </p>
      </div>

      <div
        className="rounded-[16px] px-5 py-4"
        style={{ background: TOKENS.taupe, border: `1px solid ${TOKENS.inkBorderStrong}` }}
      >
        <p style={{ fontSize: '11px', fontWeight: 700, color: TOKENS.ink, marginBottom: 8 }}>Note metodologiche</p>
        <ul className="space-y-1.5 pl-3" style={{ fontSize: '11px', color: TOKENS.inkSecondary, lineHeight: 1.5 }}>
          <li className="list-disc">KORA Contribution™ è un indicatore companion — non è una componente del KORA Index™.</li>
          <li className="list-disc">Misura il contributo collettivo e territoriale oltre il perimetro aziendale.</li>
          <li className="list-disc">Richiede iniziative collettive verificate e dati aggregati sufficienti.</li>
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
