// app/partner/privacy-boundary/page.tsx
// Partner — Privacy boundary explainer (PARTNER-SURFACE-01).
// States the worker-initiated visibility model explicitly: what the partner
// can/cannot see, and what the company can/cannot see. Does not decide final
// consent/legal text (DPO-owned) and does not mark any CTO/DPO decision as
// resolved. Pure UI/UX preview. No DB. No Supabase. No RPC.
// Protected by app/partner/layout.tsx (requirePartnerUser — no new auth system here).

export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { TOKENS } from '@/lib/design/kora-design-tokens';

const FONT = 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif';

function Panel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: TOKENS.surface, border: TOKENS.cardBorder, borderRadius: TOKENS.cardRadius, boxShadow: TOKENS.cardShadow, padding: 20 }}>
      {children}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontFamily: FONT, fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: TOKENS.inkHint, margin: '0 0 10px' }}>
      {children}
    </p>
  );
}

function BoundaryList({ title, items, tone }: { title: string; items: string[]; tone: 'can' | 'cannot' }) {
  // Left accent border reuses the same pass/cap safeguard colors already used
  // for the title — a scan cue so "can/cannot" reads at a glance, not a new palette.
  const color = tone === 'can' ? TOKENS.safeguard.pass.text : TOKENS.safeguard.cap.text;
  const accentBg = tone === 'can' ? TOKENS.safeguard.pass.bg : TOKENS.safeguard.cap.bg;
  return (
    <div style={{ background: '#fff', border: TOKENS.cardBorder, borderLeft: `3px solid ${color}`, borderRadius: TOKENS.cardRadiusSm, padding: '16px 18px' }}>
      <p style={{ display: 'inline-block', margin: '0 0 10px', fontSize: 11.5, fontWeight: 700, color, background: accentBg, padding: '2px 8px', borderRadius: 999 }}>
        {title}
      </p>
      <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {items.map((item, i) => (
          <li key={i} style={{ fontSize: 12, color: TOKENS.inkSecondary, lineHeight: 1.5 }}>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function PartnerPrivacyBoundaryPage() {
  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 20px 64px', fontFamily: FONT, display: 'flex', flexDirection: 'column', gap: 20 }}>

      <div>
        <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: TOKENS.inkHint, margin: '0 0 8px' }}>
          Partner · Confine privacy
        </p>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: TOKENS.ink, margin: '0 0 8px', letterSpacing: '-0.02em' }}>
          Cosa può vedere il partner, cosa vede l&apos;azienda
        </h1>
        <p style={{ fontSize: 13.5, color: TOKENS.inkSecondary, margin: 0, lineHeight: 1.6, maxWidth: 680 }}>
          KORA non anonimizza ogni relazione: protegge il lavoratore dal controllo aziendale. Quando il
          lavoratore sceglie volontariamente di entrare in relazione con un partner, il partner può vedere
          solo i dati che il lavoratore ha scelto di condividere. L&apos;azienda riceve soltanto segnali aggregati.
        </p>
      </div>

      {/* Preview banner — explicit, non-suppressible */}
      <div style={{ background: 'rgba(97,86,245,0.06)', border: `1px dashed rgba(97,86,245,0.35)`, borderRadius: TOKENS.cardRadiusSm, padding: '14px 18px' }}>
        <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#6156F5' }}>
          Anteprima design — nessuna connessione a database o servizi esterni. Non attivo.
        </p>
        <p style={{ margin: '6px 0 0', fontSize: 12, color: TOKENS.inkSecondary, lineHeight: 1.6 }}>
          Questa pagina spiega il modello di visibilità. Il testo di consenso definitivo resta di competenza
          DPO/legal (Gate 3) e non è deciso né implicato da questa pagina.
        </p>
      </div>

      {/* Partner boundary */}
      <Panel>
        <SectionLabel>Confine partner</SectionLabel>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
          <BoundaryList
            title="Il partner può vedere"
            tone="can"
            items={[
              'Nominativo del lavoratore solo quando il lavoratore avvia direttamente una relazione (candidatura, richiesta di contatto, iscrizione, condivisione di profilo, prenotazione).',
              'I campi che il lavoratore ha scelto esplicitamente di condividere (es. email, profilo, Dynamic CV) — mai oltre.',
              'Segnali aggregati sulle proprie iniziative (interesse, partecipazione, feedback, distribuzione per pilastro).',
            ]}
          />
          <BoundaryList
            title="Il partner non può vedere"
            tone="cannot"
            items={[
              'L\'intera forza lavoro di un\'azienda cliente.',
              'Scansioni silenziose o eventi di attivazione individuali non condivisi volontariamente dal lavoratore.',
              'Dati interni all\'azienda sul lavoratore (KORA Index, PIB, valutazioni, dati HR).',
              'Nessun canale per segnalare all\'azienda l\'attività nominativa di un lavoratore.',
            ]}
          />
        </div>
      </Panel>

      {/* Company boundary */}
      <Panel>
        <SectionLabel>Confine azienda</SectionLabel>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
          <BoundaryList
            title="L'azienda può vedere"
            tone="can"
            items={[
              'Solo metriche aggregate su copertura, attivazione e coinvolgimento con i partner.',
            ]}
          />
          <BoundaryList
            title="L'azienda non può vedere"
            tone="cannot"
            items={[
              'I dettagli delle relazioni tra un lavoratore e un partner.',
              'Singole candidature, prenotazioni o richieste di contatto.',
              'I nominativi dei lavoratori che interagiscono con un partner.',
            ]}
          />
        </div>
      </Panel>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <Link href="/partner/relationships" style={{ fontSize: 12.5, fontWeight: 700, color: TOKENS.accent, textDecoration: 'none' }}>
          Vedi le relazioni avviate dal lavoratore →
        </Link>
        <Link href="/partner/aggregate-signals" style={{ fontSize: 12.5, fontWeight: 700, color: TOKENS.accent, textDecoration: 'none' }}>
          Vedi i segnali aggregati →
        </Link>
      </div>

      <p style={{ fontSize: 12, color: TOKENS.inkHint, margin: 0 }}>
        <Link href="/partner/initiatives" style={{ color: TOKENS.accent, fontWeight: 700, textDecoration: 'none' }}>
          ← Torna a Iniziative
        </Link>
      </p>

    </div>
  );
}
