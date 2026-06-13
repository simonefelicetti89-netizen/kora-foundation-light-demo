'use client';
// C-12: Company Onboarding — locked shell per sessioni live.
// Il provisioning live avviene tramite KORA Admin, non tramite scenario demo.

import Link from 'next/link';
import { TOKENS } from '@/lib/design/kora-design-tokens';

export default function CompanyOnboardingRoom() {
  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', color: TOKENS.inkHint, marginBottom: 6 }}>
          Onboarding Aziendale
        </p>
        <h1 style={{ fontSize: '22px', fontWeight: 700, color: TOKENS.ink, marginBottom: 4 }}>
          Company Onboarding
        </h1>
        <p style={{ fontSize: '13px', color: TOKENS.inkSecondary, lineHeight: 1.55 }}>
          Il processo di onboarding live è gestito da KORA Admin — non tramite scenario demo. Il provisioning, la configurazione del profilo e il caricamento dati avvengono nel workflow KORA Admin.
        </p>
      </div>

      <div
        className="rounded-[16px] px-5 py-4"
        style={{ background: TOKENS.taupe, border: `1px solid ${TOKENS.inkBorderStrong}` }}
      >
        <p style={{ fontSize: '11px', fontWeight: 700, color: TOKENS.ink, marginBottom: 8 }}>Il tuo stato onboarding</p>
        <p style={{ fontSize: '11px', color: TOKENS.inkSecondary, lineHeight: 1.5 }}>
          Consulta il tuo workspace o contatta KORA Admin per lo stato aggiornato del percorso di onboarding.
        </p>
      </div>

      <div className="flex gap-3 flex-wrap">
        <Link href="/company/workspace" style={{ fontSize: '12px', fontWeight: 600, color: TOKENS.accent }}>
          Vai al Workspace →
        </Link>
        <Link href="/company/status" style={{ fontSize: '12px', fontWeight: 600, color: TOKENS.inkSecondary }}>
          Status Center →
        </Link>
      </div>

      <p style={{ fontSize: '10px', fontFamily: 'monospace', color: TOKENS.inkHint }}>
        onboarding gestito da KORA Admin · nessun dato sintetico
      </p>
    </div>
  );
}
