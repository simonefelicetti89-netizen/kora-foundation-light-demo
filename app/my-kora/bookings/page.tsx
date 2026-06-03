'use client';
// W-05: Prenotazioni — stato delle richieste di partecipazione alle iniziative.
// Scopo: mostrare al lavoratore le richieste attive verso partner KORA
//        e lo stato del loro ciclo (richiesta → conferma). Non un marketplace.
// Foundation Light: il flusso unlocks post-pilot. Nessun prezzo o disponibilità.

import { TOKENS } from '@/lib/design/kora-design-tokens';

const FONT = 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif';

export default function Bookings() {
  return (
    <div style={{ maxWidth: 560 }}>
      <p style={{ fontFamily: FONT, fontWeight: 700, fontSize: '10px', letterSpacing: '0.10em', textTransform: 'uppercase', color: TOKENS.accent, marginBottom: 10 }}>
        My KORA · Prenotazioni
      </p>
      <h1 style={{ fontFamily: FONT, fontWeight: 800, fontSize: '1.875rem', letterSpacing: '-0.03em', lineHeight: 1.06, color: TOKENS.ink, marginBottom: 6 }}>
        Prenotazioni & Richieste
      </h1>
      <p style={{ fontFamily: FONT, fontSize: '13.5px', color: TOKENS.inkSecondary, lineHeight: 1.55, marginBottom: 24 }}>
        Stato delle tue richieste di partecipazione alle iniziative partner KORA.
        Richiesta → conferma — nessun marketplace, nessun pagamento.
      </p>
      <div style={{ borderRadius: TOKENS.cardRadius, border: TOKENS.cardBorder, background: TOKENS.taupe, padding: '28px 24px', textAlign: 'center' }}>
        <p style={{ fontFamily: FONT, fontSize: '13px', color: TOKENS.inkHint, lineHeight: 1.6 }}>
          Il flusso prenotazioni non è attivo in Foundation Light. Richiesta e conferma partecipazione
          si abilitano nelle fasi successive del pilot, quando i partner saranno verificati
          e il protocollo evidenze sarà attivo.
        </p>
        <p style={{ fontFamily: 'ui-monospace, monospace', fontSize: '10px', color: TOKENS.inkMeta, marginTop: 12 }}>
          booking_requests: preview_only · no pricing · no availability_engine
        </p>
      </div>
      <div style={{ marginTop: 16, borderRadius: TOKENS.cardRadiusSm, border: TOKENS.cardBorder, padding: '12px 16px' }}>
        <p style={{ fontFamily: FONT, fontSize: '11.5px', color: TOKENS.inkSecondary, lineHeight: 1.55 }}>
          Le prenotazioni in KORA non sono un marketplace. Ogni richiesta genera solo uno stato request/confirm —
          il partner conferma la partecipazione e genera un evento candidato per il tuo PIB™ privato.
        </p>
      </div>
    </div>
  );
}
