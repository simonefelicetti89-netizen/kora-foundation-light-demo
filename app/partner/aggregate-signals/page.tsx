// app/partner/aggregate-signals/page.tsx
// Partner — Aggregate signals (PARTNER-SURFACE-01).
// Privacy-safe, aggregate-only performance view for partner initiatives.
// No names, no individual event list, no worker identifiers of any kind.
// Pure UI/UX preview. No DB. No Supabase. No RPC.
// Protected by app/partner/layout.tsx (requirePartnerUser — no new auth system here).

export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { TOKENS, PILLAR_COLORS, type PillarColorKey } from '@/lib/design/kora-design-tokens';

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

function MetricCard({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div style={{ background: '#fff', border: TOKENS.cardBorder, borderRadius: TOKENS.cardRadiusSm, padding: '14px 16px' }}>
      <p style={{ margin: '0 0 6px', fontSize: 11.5, fontWeight: 700, color: TOKENS.inkHint, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</p>
      <p style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 800, color: TOKENS.ink }}>{value}</p>
      <p style={{ margin: 0, fontSize: 11.5, color: TOKENS.inkSecondary, lineHeight: 1.5 }}>{note}</p>
    </div>
  );
}

// Aggregate-only, illustrative — no individual event feeds this indicator.
const PILLAR_DISTRIBUTION: { pillar: PillarColorKey; share: number }[] = [
  { pillar: 'GROWTH', share: 32 },
  { pillar: 'IMPACT', share: 26 },
  { pillar: 'CONNECTION', share: 20 },
  { pillar: 'LIFE', share: 14 },
  { pillar: 'LEGACY', share: 8 },
];

function PillarBar({ pillar, share }: { pillar: PillarColorKey; share: number }) {
  const color = PILLAR_COLORS[pillar];
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <span style={{ width: 92, fontSize: 11, fontWeight: 700, color: TOKENS.inkSecondary, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
        {pillar}
      </span>
      <div style={{ flex: 1, height: 8, borderRadius: 999, background: 'rgba(6,3,43,0.06)', overflow: 'hidden' }}>
        <div style={{ width: `${share}%`, height: '100%', background: color, borderRadius: 999 }} />
      </div>
      <span style={{ width: 36, textAlign: 'right', fontSize: 11.5, fontWeight: 700, color: TOKENS.ink }}>{share}%</span>
    </div>
  );
}

export default function PartnerAggregateSignalsPage() {
  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 20px 64px', fontFamily: FONT, display: 'flex', flexDirection: 'column', gap: 20 }}>

      <div>
        <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: TOKENS.inkHint, margin: '0 0 8px' }}>
          Partner · Segnali aggregati
        </p>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: TOKENS.ink, margin: '0 0 8px', letterSpacing: '-0.02em' }}>
          Performance aggregata delle iniziative
        </h1>
        <p style={{ fontSize: 13.5, color: TOKENS.inkSecondary, margin: 0, lineHeight: 1.6, maxWidth: 640 }}>
          Segnali privacy-safe sull&apos;andamento delle tue iniziative — nessun nominativo, nessun elenco di
          eventi individuali.
        </p>
      </div>

      {/* Preview banner — explicit, non-suppressible */}
      <div style={{ background: 'rgba(97,86,245,0.06)', border: `1px dashed rgba(97,86,245,0.35)`, borderRadius: TOKENS.cardRadiusSm, padding: '14px 18px' }}>
        <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#6156F5' }}>
          Anteprima design — dati mock, nessuna connessione a database o servizi esterni. Non attivo.
        </p>
        <p style={{ margin: '6px 0 0', fontSize: 12, color: TOKENS.inkSecondary, lineHeight: 1.6 }}>
          Questa vista non contiene dati personali identificativi. Soglia aggregazione in attesa di
          decisione CTO/DPO.
        </p>
      </div>

      {/* Aggregate metrics */}
      <Panel>
        <SectionLabel>Indicatori aggregati (dati mock)</SectionLabel>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
          <MetricCard
            label="Interesse aggregato"
            value="Alto"
            note="Livello di manifestazioni di interesse sulle iniziative attive del partner."
          />
          <MetricCard
            label="Partecipazione aggregata"
            value="≈ 68%"
            note="Quota aggregata di completamento sulle iniziative con partecipazione avviata."
          />
          <MetricCard
            label="Feedback aggregato"
            value="Positivo"
            note="Sintesi qualitativa del feedback raccolto, senza attribuzione individuale."
          />
        </div>
      </Panel>

      {/* Pillar distribution */}
      <Panel>
        <SectionLabel>Distribuzione per pilastro (aggregato)</SectionLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {PILLAR_DISTRIBUTION.map((p) => (
            <PillarBar key={p.pillar} pillar={p.pillar} share={p.share} />
          ))}
        </div>
      </Panel>

      {/* No individual data — explicit, prominent. Threshold-pending language lives
          only in the banner above; this panel adds specificity, not repetition. */}
      <div style={{ background: '#fffaf5', border: `1px dashed ${TOKENS.inkBorder}`, borderRadius: TOKENS.cardRadiusSm, padding: '16px 18px' }}>
        <SectionLabel>Nessun dato individuale</SectionLabel>
        <p style={{ margin: 0, fontSize: 12.5, color: TOKENS.inkSecondary, lineHeight: 1.6 }}>
          Questa pagina non mostrerà mai nomi, email, identificativi worker (worker_id), tag UID, singoli
          eventi di scansione o singole attivazioni — solo aggregati. Per questi stessi segnali, anche
          l&apos;azienda riceve unicamente output aggregati, mai il dettaglio disaggregato. I nominativi
          possono comparire solo nella vista Relazioni con i lavoratori, e solo per relazioni avviate
          volontariamente dal lavoratore.
        </p>
      </div>

      <p style={{ fontSize: 12, color: TOKENS.inkHint, margin: 0 }}>
        <Link href="/partner/relationships" style={{ color: TOKENS.accent, fontWeight: 700, textDecoration: 'none' }}>
          Relazioni con i lavoratori — dove i nominativi possono legittimamente comparire →
        </Link>
      </p>

      <p style={{ fontSize: 12, color: TOKENS.inkHint, margin: 0 }}>
        <Link href="/partner/initiatives" style={{ color: TOKENS.accent, fontWeight: 700, textDecoration: 'none' }}>
          ← Torna a Iniziative
        </Link>
      </p>

    </div>
  );
}
