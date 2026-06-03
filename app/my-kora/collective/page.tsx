'use client';
// W-06: Impatto Collettivo — iniziative cross-company e territoriali.
// Scopo: mostrare al lavoratore le iniziative collettive disponibili
//        e il suo contributo al KORA Contribution™ (indicatore companion, non KORA Index™).
// Foundation Light: il tracking partecipazione cross-company unlocks post-pilot.

import { TOKENS } from '@/lib/design/kora-design-tokens';

const FONT = 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif';

export default function CollectiveImpact() {
  return (
    <div style={{ maxWidth: 560 }}>
      <p style={{ fontFamily: FONT, fontWeight: 700, fontSize: '10px', letterSpacing: '0.10em', textTransform: 'uppercase', color: TOKENS.accent, marginBottom: 10 }}>
        My KORA · Collettivo
      </p>
      <h1 style={{ fontFamily: FONT, fontWeight: 800, fontSize: '1.875rem', letterSpacing: '-0.03em', lineHeight: 1.06, color: TOKENS.ink, marginBottom: 6 }}>
        Impatto Collettivo
      </h1>
      <p style={{ fontFamily: FONT, fontSize: '13.5px', color: TOKENS.inkSecondary, lineHeight: 1.55, marginBottom: 24 }}>
        Iniziative collettive verificate — non un social feed. Il tuo contributo
        alimenta il Contribution Intelligence™ (indicatore companion, distinto dal KORA Index™).
      </p>
      <div style={{ borderRadius: TOKENS.cardRadius, border: TOKENS.cardBorder, background: TOKENS.taupe, padding: '28px 24px', textAlign: 'center' }}>
        <p style={{ fontFamily: FONT, fontSize: '13px', color: TOKENS.inkHint, lineHeight: 1.6 }}>
          Il tracking delle iniziative collettive cross-company non è attivo in Foundation Light.
          La partecipazione verificata e il KORA Contribution™ si abilitano nelle fasi successive del pilot.
        </p>
        <p style={{ fontFamily: 'ui-monospace, monospace', fontSize: '10px', color: TOKENS.inkMeta, marginTop: 12 }}>
          collective_initiatives: preview_only · kora_contribution: post_pilot
        </p>
      </div>
      <div style={{ marginTop: 16, borderRadius: TOKENS.cardRadiusSm, border: TOKENS.cardBorder, padding: '12px 16px' }}>
        <p style={{ fontFamily: FONT, fontSize: '11.5px', color: TOKENS.inkSecondary, lineHeight: 1.55 }}>
          Il Contribution Intelligence™ misura contributo collettivo e territoriale —
          è un indicatore companion al KORA Index™, mai parte del punteggio aziendale.
          Nessun ranking individuale, nessun social feed.
        </p>
      </div>
    </div>
  );
}
