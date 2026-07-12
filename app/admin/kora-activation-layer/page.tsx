// app/admin/kora-activation-layer/page.tsx
// KORA Activation Layer — Phase 1 vs Phase 2 alignment map (KORA-ACTIVATION-LAYER-01).
//
// Read-only product/model reference for KORA_ADMIN and reviewers. Separates
// Phase 1 (Raw Data Intelligence — uploaded/classified organizational data)
// from Phase 2 (Activation Intelligence — partner activities, company
// enablement, worker voluntary choice, platform-native activation signals).
// Both phases can feed KORA Index through distinct signal streams. This
// page implements no computation, no persistence, no DB call, and resolves
// no DPO/CTO/fiscal/legal decision. KORA Index computation is unchanged.
//
// Naming note: "Activation Intelligence™" already exists at /company/activation
// as a Phase 1 reach/equity view — this page's "Phase 2 Activation
// Intelligence" is a distinct, newly-named concept. See
// docs/KORA_ACTIVATION_LAYER_01.md §0 for the full naming-collision register.
//
// No DB. No Supabase. No RPC. No feature flag touched.
// Protected by app/admin/layout.tsx (requireKoraAdmin — no new auth system here).

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

function PhaseCard({
  title, subtitle, badge, badgeTone, rows,
}: {
  title: string;
  subtitle: string;
  badge: string;
  badgeTone: 'mature' | 'future';
  rows: { label: string; value: string }[];
}) {
  const color = badgeTone === 'mature' ? TOKENS.safeguard.pass : TOKENS.safeguard.watch;
  return (
    <div style={{ background: '#fff', border: TOKENS.cardBorder, borderRadius: TOKENS.cardRadiusSm, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
        <p style={{ margin: 0, fontSize: 13.5, fontWeight: 700, color: TOKENS.ink }}>{title}</p>
        <span style={{ fontSize: 10.5, fontWeight: 700, padding: '3px 10px', borderRadius: 999, background: color.bg, color: color.text, whiteSpace: 'nowrap' }}>
          {badge}
        </span>
      </div>
      <p style={{ margin: 0, fontSize: 12, color: TOKENS.inkSecondary, lineHeight: 1.5 }}>{subtitle}</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4 }}>
        {rows.map((r) => (
          <div key={r.label} style={{ display: 'flex', gap: 8, fontSize: 11.5 }}>
            <span style={{ color: TOKENS.inkHint, minWidth: 110 }}>{r.label}</span>
            <span style={{ color: TOKENS.inkSecondary }}>{r.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

interface FlowStep {
  step: string;
  note?: string;
}

function FlowMap({ steps }: { steps: FlowStep[] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {steps.map((s, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <span style={{ fontSize: 10.5, color: TOKENS.inkHint, width: 16, flexShrink: 0 }}>{i + 1}</span>
          <div>
            <p style={{ margin: 0, fontSize: 12.5, fontWeight: 700, color: TOKENS.ink }}>{s.step}</p>
            {s.note && <p style={{ margin: '2px 0 0', fontSize: 11.5, color: TOKENS.inkSecondary, lineHeight: 1.5 }}>{s.note}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}

const BOUNDARY_ROWS: { dimension: string; phase1: string; phase2: string }[] = [
  { dimension: 'Sorgente', phase1: 'Dati aziendali caricati', phase2: 'Catalogo attività partner + scelta worker' },
  { dimension: 'Attore', phase1: 'Azienda (upload) + KORA Admin (classificazione)', phase2: 'Partner + Azienda (abilitazione) + Worker (scelta)' },
  { dimension: 'Tipo di segnale', phase1: 'Evento organizzativo classificato (UEF)', phase2: 'Segnale di attivazione aggregato (futuro)' },
  { dimension: 'Privacy', phase1: 'Azienda aggregate-only, N≥10', phase2: 'Azienda aggregate-only; partner solo su iniziativa worker' },
  { dimension: 'Output', phase1: 'KORA Index, Decision Pack, Activation Debt', phase2: 'Segnali aggregati KORA Index (futuro)' },
  { dimension: 'Stato implementazione', phase1: 'Maturo — DB-backed, in produzione concettuale', phase2: 'Solo catalogo attività, no-DB — resto non implementato' },
];

export default function KoraActivationLayerPage() {
  return (
    <div style={{ maxWidth: 1080, margin: '0 auto', padding: '32px 20px 64px', fontFamily: FONT, display: 'flex', flexDirection: 'column', gap: 24 }}>

      <div>
        <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: TOKENS.inkHint, margin: '0 0 8px' }}>
          Admin · KORA Activation Layer
        </p>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: TOKENS.ink, margin: '0 0 8px', letterSpacing: '-0.02em' }}>
          KORA Activation Layer
        </h1>
        <p style={{ fontSize: 13.5, color: TOKENS.inkSecondary, margin: 0, lineHeight: 1.6, maxWidth: 740 }}>
          Il KORA Index è alimentato da due flussi complementari: dati organizzativi grezzi caricati e
          classificati dal motore KORA (Fase 1), e segnali di attivazione generati dalla piattaforma
          attraverso attività partner, scelte aziendali e scelta volontaria dei lavoratori (Fase 2). Questa
          pagina descrive entrambe le fasi — non implementa alcun calcolo, non chiama alcun database.
        </p>
      </div>

      {/* Non-suppressible scope banner */}
      <div style={{ background: 'rgba(97,86,245,0.06)', border: `1px dashed rgba(97,86,245,0.35)`, borderRadius: TOKENS.cardRadiusSm, padding: '14px 18px' }}>
        <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#6156F5' }}>
          Mappa di modello in sola lettura.
        </p>
        <p style={{ margin: '6px 0 0', fontSize: 12, color: TOKENS.inkSecondary, lineHeight: 1.6 }}>
          Nessun calcolo del KORA Index è modificato da questa pagina. Nessun segnale di attivazione reale è
          generato. Nessuna decisione CTO, DPO, fiscale o legale è presa qui. La Fase 2 &quot;Activation
          Intelligence&quot; descritta qui è un concetto distinto da &quot;Activation Intelligence™&quot; già
          esistente su <code>/company/activation</code> (analisi Fase 1 su dati già esistenti) — vedi la nota
          di naming in <code>docs/KORA_ACTIVATION_LAYER_01.md</code>.
        </p>
      </div>

      {/* Two-signal-stream model */}
      <Panel>
        <SectionLabel>Modello a due flussi di segnale</SectionLabel>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 12 }}>
          <PhaseCard
            title="Fase 1 — Raw Data Intelligence"
            subtitle="Cosa sta già succedendo nell'organizzazione? Dati caricati, ingestion, classificazione, mappatura pilastri."
            badge="Maturo"
            badgeTone="mature"
            rows={[
              { label: 'Input', value: 'Dati aziendali caricati (HR/welfare/formazione/budget)' },
              { label: 'Elaborazione', value: 'Ingestion → normalizzazione UEF → classificazione → eleggibilità fiscale → pilastri' },
              { label: 'Output', value: 'KORA Index, Decision Pack, Activation Debt, equità/accesso' },
            ]}
          />
          <PhaseCard
            title="Fase 2 — Activation Intelligence"
            subtitle="Cosa possiamo attivare ora, e ha funzionato? Attività partner, abilitazione azienda, scelta worker."
            badge="Solo catalogo, no-DB"
            badgeTone="future"
            rows={[
              { label: 'Input', value: 'Catalogo attività partner + abilitazione azienda + scelta worker' },
              { label: 'Elaborazione', value: 'Selezione azienda → discovery worker → prenotazione partner → pipeline segnale (tutto futuro)' },
              { label: 'Output', value: 'Segnali aggregati KORA Index per pilastro/categoria fiscale (futuro)' },
            ]}
          />
        </div>
      </Panel>

      {/* Flow diagrams */}
      <Panel>
        <SectionLabel>Flusso — Fase 1 (esistente)</SectionLabel>
        <FlowMap
          steps={[
            { step: 'Upload dati azienda' },
            { step: 'Ingestion' },
            { step: 'Classificazione (action-taxonomy, eleggibilità fiscale, pilastri)' },
            { step: 'KORA Index' },
            { step: 'Decision Pack / piano d\'azione' },
          ]}
        />
      </Panel>

      <Panel>
        <SectionLabel>Flusso — Fase 2 (futuro)</SectionLabel>
        <FlowMap
          steps={[
            { step: 'Catalogo Attività Partner', note: 'Esiste come shell no-DB — /partner/activity-catalog.' },
            { step: 'Selezione attività azienda', note: 'Non ancora implementata — COMPANY-ACTIVITY-SELECTION-01.' },
            { step: 'Discovery/scelta worker', note: 'Non ancora implementata — WORKER-ACTIVITY-DISCOVERY-01.' },
            { step: 'Prenotazione/erogazione partner', note: 'Non ancora implementata — PARTNER-ACTIVITY-BOOKINGS-01.' },
            { step: 'Segnali di attivazione aggregati', note: 'Non ancora implementata — ACTIVATION-SIGNAL-PIPELINE-01.' },
            { step: 'KORA Index', note: 'Integrazione futura, solo dopo revisione CTO — KORA-INDEX-ACTIVATION-INTEGRATION-01.' },
          ]}
        />
      </Panel>

      {/* Boundary table */}
      <Panel>
        <SectionLabel>Tabella di confine Fase 1 / Fase 2</SectionLabel>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 11.5 }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: '6px 10px', color: TOKENS.inkHint, fontWeight: 700, fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Dimensione</th>
                <th style={{ textAlign: 'left', padding: '6px 10px', color: TOKENS.inkHint, fontWeight: 700, fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Fase 1</th>
                <th style={{ textAlign: 'left', padding: '6px 10px', color: TOKENS.inkHint, fontWeight: 700, fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Fase 2</th>
              </tr>
            </thead>
            <tbody>
              {BOUNDARY_ROWS.map((row) => (
                <tr key={row.dimension} style={{ borderTop: `1px solid ${TOKENS.inkBorder}` }}>
                  <td style={{ padding: '8px 10px', color: TOKENS.ink, fontWeight: 700 }}>{row.dimension}</td>
                  <td style={{ padding: '8px 10px', color: TOKENS.inkSecondary }}>{row.phase1}</td>
                  <td style={{ padding: '8px 10px', color: TOKENS.inkSecondary }}>{row.phase2}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* Current implementation status */}
      <Panel>
        <SectionLabel>Stato di implementazione attuale</SectionLabel>
        <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <li style={{ fontSize: 12.5, color: TOKENS.inkSecondary, lineHeight: 1.6 }}>
            <strong style={{ color: TOKENS.ink }}>Il layer di dati/intelligence Fase 1 è più maturo</strong> — pipeline DB-backed, motore di scoring reale, superfici live.
          </li>
          <li style={{ fontSize: 12.5, color: TOKENS.inkSecondary, lineHeight: 1.6 }}>
            <strong style={{ color: TOKENS.ink }}>Il Catalogo Attività Partner esiste solo come shell no-DB</strong> — <code>/partner/activity-catalog</code>, dati statici, nessuna persistenza.
          </li>
          <li style={{ fontSize: 12.5, color: TOKENS.inkSecondary, lineHeight: 1.6 }}>
            <strong style={{ color: TOKENS.ink }}>La Selezione Attività Azienda non è ancora implementata.</strong>
          </li>
          <li style={{ fontSize: 12.5, color: TOKENS.inkSecondary, lineHeight: 1.6 }}>
            <strong style={{ color: TOKENS.ink }}>La Discovery/Prenotazione Attività Worker non è ancora implementata.</strong>
          </li>
          <li style={{ fontSize: 12.5, color: TOKENS.inkSecondary, lineHeight: 1.6 }}>
            <strong style={{ color: TOKENS.ink }}>La Pipeline di Segnale di Attivazione non è ancora implementata.</strong>
          </li>
          <li style={{ fontSize: 12.5, color: TOKENS.inkSecondary, lineHeight: 1.6 }}>
            <strong style={{ color: TOKENS.ink }}>Il calcolo del KORA Index non è stato modificato</strong> da questo sprint né da alcuno dei precedenti.
          </li>
          <li style={{ fontSize: 12.5, color: TOKENS.inkSecondary, lineHeight: 1.6 }}>
            <strong style={{ color: TOKENS.ink }}>Le Attività Partner non alimentano mai direttamente KORA Contribution</strong> — solo le iniziative KORA Space lo fanno.
          </li>
        </ul>
      </Panel>

      {/* Privacy panel */}
      <div style={{ background: '#fffaf5', border: `1px dashed ${TOKENS.inkBorder}`, borderRadius: TOKENS.cardRadiusSm, padding: '16px 18px' }}>
        <SectionLabel>Confine privacy</SectionLabel>
        <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <li style={{ fontSize: 12.5, color: TOKENS.inkSecondary, lineHeight: 1.6 }}>L&apos;azienda vede solo aggregati — in entrambe le fasi.</li>
          <li style={{ fontSize: 12.5, color: TOKENS.inkSecondary, lineHeight: 1.6 }}>Il partner vede nominativi solo dopo un&apos;azione volontaria del worker.</li>
          <li style={{ fontSize: 12.5, color: TOKENS.inkSecondary, lineHeight: 1.6 }}>Nessun segnale di attività a livello individuale torna mai al datore di lavoro.</li>
        </ul>
      </div>

      {/* Next sprint panel */}
      <Panel>
        <SectionLabel>Prossimo sprint raccomandato</SectionLabel>
        <p style={{ margin: 0, fontSize: 12.5, color: TOKENS.inkSecondary, lineHeight: 1.6 }}>
          <strong style={{ color: TOKENS.ink }}>COMPANY-ACTIVITY-SELECTION-01</strong> — l&apos;azienda deve definire il
          perimetro di attivazione (categoria fiscale, pilastro, partner, attività specifica, o scelta libera worker
          entro budget) prima che qualunque logica di prenotazione worker abbia senso. Prima anteprima disponibile su{' '}
          <Link href="/company/activity-selection" style={{ color: TOKENS.accent, fontWeight: 700, textDecoration: 'none' }}>
            Selezione Attività Partner
          </Link>.
        </p>
      </Panel>

      {/* Cross-links */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <Link href="/admin/partner-ecosystem-model" style={{ fontSize: 12.5, fontWeight: 700, color: TOKENS.accent, textDecoration: 'none' }}>
          Modello ecosistema Partner →
        </Link>
        <Link href="/partner/activity-catalog" style={{ fontSize: 12.5, fontWeight: 700, color: TOKENS.accent, textDecoration: 'none' }}>
          Catalogo Attività Partner →
        </Link>
        <Link href="/company/kora-index" style={{ fontSize: 12.5, fontWeight: 700, color: TOKENS.accent, textDecoration: 'none' }}>
          KORA Index™ (Fase 1, live) →
        </Link>
        <Link href="/company/contribution" style={{ fontSize: 12.5, fontWeight: 700, color: TOKENS.accent, textDecoration: 'none' }}>
          KORA Contribution™ (per contrasto) →
        </Link>
      </div>

    </div>
  );
}
