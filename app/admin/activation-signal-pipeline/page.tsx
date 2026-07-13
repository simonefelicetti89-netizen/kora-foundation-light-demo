// app/admin/activation-signal-pipeline/page.tsx
// Activation Signal Pipeline — Phase 2 aggregate signal preview (ACTIVATION-SIGNAL-PIPELINE-01).
//
// Read-only product/model reference for KORA_ADMIN and reviewers. Shows how
// completed/fulfilled Partner Activity engagements
// (lib/partner-activities/catalog.ts, lib/partner-activities/bookings.ts) may
// in the future become aggregate, privacy-safe activation signals feeding
// the KORA Index — the bridge described in
// docs/KORA_ACTIVATION_LAYER_01.md §6 step 4. This page implements no
// computation, no persistence, no DB call, and resolves no DPO/CTO/fiscal/
// legal decision. Live KORA Index computation
// (lib/kora-engine/kora-index-engine.ts) is unchanged.
//
// No DB. No Supabase. No RPC. No feature flag touched. No fetch, no server
// action, no status mutation.
// Protected by app/admin/layout.tsx (requireKoraAdmin — no new auth system here).

export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { TOKENS, PILLAR_COLORS } from '@/lib/design/kora-design-tokens';
import {
  getActivationSignalPreviews,
  getActivationSignalSummary,
  SIGNAL_TYPE_LABELS,
  AGGREGATION_LEVEL_LABELS,
  ELIGIBILITY_LABELS,
  INDEX_COMPONENT_PREVIEW_LABELS,
  PRIVACY_THRESHOLD_STATUS_LABELS,
  type ActivationSignalPreview,
} from '@/lib/partner-activities/activation-signals';

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

function MetricCard({ label, value, note }: { label: string; value: string | number; note: string }) {
  return (
    <div style={{ background: '#fff', border: TOKENS.cardBorder, borderRadius: TOKENS.cardRadiusSm, padding: '14px 16px' }}>
      <p style={{ margin: '0 0 6px', fontSize: 11.5, fontWeight: 700, color: TOKENS.inkHint, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</p>
      <p style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 800, color: TOKENS.ink }}>{value}</p>
      <p style={{ margin: 0, fontSize: 11.5, color: TOKENS.inkSecondary, lineHeight: 1.5 }}>{note}</p>
    </div>
  );
}

function Tag({ children, tone }: { children: React.ReactNode; tone?: 'default' | 'accent' }) {
  const isAccent = tone === 'accent';
  return (
    <span
      style={{
        display: 'inline-block', fontSize: 10.5, fontWeight: 700, padding: '3px 9px', borderRadius: 999,
        background: isAccent ? 'rgba(97,86,245,0.10)' : 'rgba(6,3,43,0.05)',
        color: isAccent ? '#6156F5' : TOKENS.inkSecondary,
        border: `1px solid ${isAccent ? 'rgba(97,86,245,0.30)' : TOKENS.inkBorder}`,
      }}
    >
      {children}
    </span>
  );
}

function PillarTag({ pillar }: { pillar: string }) {
  const color = (PILLAR_COLORS as Record<string, string>)[pillar] ?? TOKENS.inkHint;
  return (
    <span
      style={{
        display: 'inline-block', fontSize: 10.5, fontWeight: 700, padding: '3px 9px', borderRadius: 999,
        background: `${color}1A`, color, border: `1px solid ${color}45`,
      }}
    >
      {pillar === 'multiple' ? 'Più pilastri' : pillar}
    </span>
  );
}

function PrivacyStatusBadge({ status }: { status: ActivationSignalPreview['privacyThresholdStatus'] }) {
  const tone =
    status === 'passed_preview' ? TOKENS.safeguard.pass
    : status === 'suppressed_preview' ? TOKENS.safeguard.cap
    : TOKENS.safeguard.watch;
  return (
    <span style={{ fontSize: 10.5, fontWeight: 700, padding: '3px 10px', borderRadius: 999, background: tone.bg, color: tone.text, whiteSpace: 'nowrap' }}>
      {PRIVACY_THRESHOLD_STATUS_LABELS[status]}
    </span>
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

const TRANSFORMATION_MAP: { trigger: string; signal: string }[] = [
  { trigger: 'Prenotazione/richiesta creata dal worker', signal: '→ segnale di uptake' },
  { trigger: 'Attività completata/erogata', signal: '→ segnale di completamento / quality preview' },
  { trigger: 'Utilizzo ripetuto (stesso worker o stesso partner)', signal: '→ segnale di continuità' },
  { trigger: 'Distribuzione tra categorie/pilastri', signal: '→ segnale di pillar balance / equity preview' },
  { trigger: 'Voucher/servizio erogato con successo', signal: '→ segnale di fascia di valore (value band)' },
];

function SignalRow({ s }: { s: ActivationSignalPreview }) {
  return (
    <tr style={{ borderTop: `1px solid ${TOKENS.inkBorder}` }}>
      <td style={{ padding: '8px 10px', color: TOKENS.ink, fontWeight: 700, whiteSpace: 'nowrap' }}>{SIGNAL_TYPE_LABELS[s.signalType]}</td>
      <td style={{ padding: '8px 10px' }}><Tag>{AGGREGATION_LEVEL_LABELS[s.aggregationLevel]}</Tag></td>
      <td style={{ padding: '8px 10px' }}>{s.fiscalCategory === 'multiple' ? <Tag>Più categorie</Tag> : <Tag>{s.fiscalCategory}</Tag>}</td>
      <td style={{ padding: '8px 10px' }}><PillarTag pillar={s.primaryPillar} /></td>
      <td style={{ padding: '8px 10px' }}><Tag tone="accent">{INDEX_COMPONENT_PREVIEW_LABELS[s.indexComponentPreview]}</Tag></td>
      <td style={{ padding: '8px 10px', color: TOKENS.ink, fontWeight: 700, whiteSpace: 'nowrap' }}>{s.metricPreview.value} {s.metricPreview.unit}</td>
      <td style={{ padding: '8px 10px' }}><PrivacyStatusBadge status={s.privacyThresholdStatus} /></td>
      <td style={{ padding: '8px 10px', color: TOKENS.inkSecondary }}>{ELIGIBILITY_LABELS[s.eligibleForKoraIndexPreview]}</td>
    </tr>
  );
}

export default function ActivationSignalPipelinePage() {
  const signals = getActivationSignalPreviews();
  const summary = getActivationSignalSummary();

  return (
    <div style={{ maxWidth: 1120, margin: '0 auto', padding: '32px 20px 64px', fontFamily: FONT, display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* 1. Intro panel */}
      <div>
        <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: TOKENS.inkHint, margin: '0 0 8px' }}>
          Admin · Fase 2 Activation Intelligence
        </p>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: TOKENS.ink, margin: '0 0 8px', letterSpacing: '-0.02em' }}>
          Activation Signal Pipeline
        </h1>
        <p style={{ fontSize: 13.5, color: TOKENS.inkSecondary, margin: 0, lineHeight: 1.6, maxWidth: 780 }}>
          Questa pagina è il ponte tra gli engagement Attività Partner completati (Fase 2 Activation
          Intelligence) e i futuri segnali aggregati per il KORA Index. È un&apos;anteprima senza database e
          senza calcolo: nessun segnale di attivazione reale è generato, nessuna aggregazione reale viene
          eseguita. Il calcolo live del KORA Index (<code>lib/kora-engine/kora-index-engine.ts</code>) non è
          modificato da questo sprint.
        </p>
      </div>

      {/* Non-suppressible scope banner */}
      <div style={{ background: 'rgba(97,86,245,0.06)', border: `1px dashed rgba(97,86,245,0.35)`, borderRadius: TOKENS.cardRadiusSm, padding: '14px 18px' }}>
        <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#6156F5' }}>
          Anteprima di modello, in sola lettura — nessun calcolo reale.
        </p>
        <p style={{ margin: '6px 0 0', fontSize: 12, color: TOKENS.inkSecondary, lineHeight: 1.6 }}>
          Questa pagina non modifica alcun calcolo del KORA Index, non genera alcun segnale di attivazione
          reale, non crea alcuna persistenza e non risolve alcuna decisione CTO, DPO, fiscale o legale.
          <strong style={{ color: TOKENS.ink }}> KORA-INDEX-ACTIVATION-INTEGRATION-01</strong> sarebbe uno
          sprint futuro separato, solo dopo revisione CTO.
        </p>
      </div>

      {/* 2. End-to-end flow */}
      <Panel>
        <SectionLabel>Flusso end-to-end — Fase 2</SectionLabel>
        <FlowMap
          steps={[
            { step: 'Catalogo Attività Partner', note: '/partner/activity-catalog — esiste, no-DB.' },
            { step: 'Selezione Attività Azienda', note: '/company/activity-selection — esiste, no-DB.' },
            { step: 'Discovery / scelta worker', note: '/worker/activity-discovery — esiste, no-DB.' },
            { step: 'Prenotazioni / richieste Partner', note: '/partner/activity-bookings — esiste, no-DB.' },
            { step: 'Engagement evasi/completati', note: 'Sottoinsieme delle richieste con stato "completed" nel modello bookings.' },
            { step: 'Segnali di Attivazione Aggregati', note: 'Questa pagina — anteprima statica, no-DB.' },
            { step: 'Futuro segnale KORA Index', note: 'Non implementato — richiede KORA-INDEX-ACTIVATION-INTEGRATION-01.' },
          ]}
        />
      </Panel>

      {/* 3. Signal transformation map */}
      <Panel>
        <SectionLabel>Mappa di trasformazione del segnale (esempi)</SectionLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {TRANSFORMATION_MAP.map((t) => (
            <div key={t.trigger} style={{ display: 'flex', gap: 10, alignItems: 'baseline', flexWrap: 'wrap', fontSize: 12.5 }}>
              <span style={{ color: TOKENS.inkSecondary }}>{t.trigger}</span>
              <span style={{ color: TOKENS.accent, fontWeight: 700 }}>{t.signal}</span>
            </div>
          ))}
        </div>
      </Panel>

      {/* 4. Aggregate signal cards/table */}
      <Panel>
        <SectionLabel>Segnali di attivazione aggregati (anteprima statica)</SectionLabel>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10, marginBottom: 16 }}>
          <MetricCard label="Segnali totali" value={summary.totalSignals} note="Record di anteprima nel modello statico." />
          <MetricCard label="Tipi di segnale" value={Object.keys(summary.bySignalType).length} note="Uptake, completamento, continuità, accesso, fascia di valore, scelta worker, erogazione partner." />
          <MetricCard label="Livelli di aggregazione" value={Object.keys(summary.byAggregationLevel).length} note="Azienda, pilastro, categoria fiscale, partner, tipo attività." />
          <MetricCard label="Richiedono revisione soglia" value={summary.byPrivacyThresholdStatus['needs_threshold_review'] ?? 0} note="Nessuna soglia di privacy finale in questo sprint." />
          <MetricCard label="Soppressi in anteprima" value={summary.byPrivacyThresholdStatus['suppressed_preview'] ?? 0} note="Gruppo troppo piccolo per aggregazione privacy-safe reale." />
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 11.5, minWidth: 900 }}>
            <thead>
              <tr>
                {['Tipo di segnale', 'Aggregazione', 'Categoria fiscale', 'Pilastro', 'Componente KORA Index (anteprima)', 'Metrica (anteprima)', 'Soglia privacy', 'Eleggibilità'].map((h) => (
                  <th key={h} style={{ textAlign: 'left', padding: '6px 10px', color: TOKENS.inkHint, fontWeight: 700, fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {signals.map((s) => <SignalRow key={s.signalId} s={s} />)}
            </tbody>
          </table>
        </div>
        <p style={{ margin: '12px 0 0', fontSize: 11, color: TOKENS.inkHint, lineHeight: 1.5 }}>
          Ogni riga mostra sempre <strong>Visibilità azienda: solo aggregato</strong> e <strong>Confine
          Contribution: non è fonte di Contribution</strong> — nessun campo qui risolve mai a un worker, a
          una prenotazione o a una scelta individuale.
        </p>
      </Panel>

      {/* 5. Privacy threshold panel */}
      <div style={{ background: '#fffaf5', border: `1px dashed ${TOKENS.inkBorder}`, borderRadius: TOKENS.cardRadiusSm, padding: '16px 18px' }}>
        <SectionLabel>Soglie di privacy</SectionLabel>
        <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <li style={{ fontSize: 12.5, color: TOKENS.inkSecondary, lineHeight: 1.6 }}>Le soglie di privacy non sono decise in questo sprint.</li>
          <li style={{ fontSize: 12.5, color: TOKENS.inkSecondary, lineHeight: 1.6 }}>I gruppi con conteggio basso potrebbero richiedere soppressione (coerente con il principio N≥10 già usato altrove nella piattaforma).</li>
          <li style={{ fontSize: 12.5, color: TOKENS.inkSecondary, lineHeight: 1.6 }}>Nessuna regola finale DPO/legale è risolta qui.</li>
          <li style={{ fontSize: 12.5, color: TOKENS.inkSecondary, lineHeight: 1.6 }}>Nessun evento worker individuale è mai company-facing, in questo sprint o in futuro.</li>
        </ul>
      </div>

      {/* 6. Company output panel */}
      <Panel>
        <SectionLabel>Output futuro per l&apos;azienda (solo aggregato)</SectionLabel>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
          <div style={{ background: '#fff', border: TOKENS.cardBorder, borderRadius: TOKENS.cardRadiusSm, padding: '14px 16px' }}>
            <p style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 700, color: TOKENS.safeguard.pass.text }}>Potrebbe includere in futuro</p>
            <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <li style={{ fontSize: 12, color: TOKENS.inkSecondary }}>Adozione aggregata (uptake)</li>
              <li style={{ fontSize: 12, color: TOKENS.inkSecondary }}>Completamento aggregato</li>
              <li style={{ fontSize: 12, color: TOKENS.inkSecondary }}>Distribuzione per pilastro</li>
              <li style={{ fontSize: 12, color: TOKENS.inkSecondary }}>Distribuzione per categoria fiscale/welfare</li>
              <li style={{ fontSize: 12, color: TOKENS.inkSecondary }}>Fasce di valore</li>
              <li style={{ fontSize: 12, color: TOKENS.inkSecondary }}>Indicatori di continuità</li>
              <li style={{ fontSize: 12, color: TOKENS.inkSecondary }}>Indicatori di equità/accesso, solo se le soglie di privacy sono rispettate</li>
              <li style={{ fontSize: 12, color: TOKENS.inkSecondary }}>Anteprima di futuro segnale di attivazione KORA Index</li>
            </ul>
          </div>
          <div style={{ background: '#fff', border: TOKENS.cardBorder, borderRadius: TOKENS.cardRadiusSm, padding: '14px 16px' }}>
            <p style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 700, color: TOKENS.safeguard.cap.text }}>Non includerebbe mai</p>
            <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <li style={{ fontSize: 12, color: TOKENS.inkSecondary }}>Nominativi dei lavoratori</li>
              <li style={{ fontSize: 12, color: TOKENS.inkSecondary }}>Email dei lavoratori</li>
              <li style={{ fontSize: 12, color: TOKENS.inkSecondary }}>ID dei lavoratori</li>
              <li style={{ fontSize: 12, color: TOKENS.inkSecondary }}>Stato individuale delle singole prenotazioni</li>
              <li style={{ fontSize: 12, color: TOKENS.inkSecondary }}>Scelte individuali di attività</li>
              <li style={{ fontSize: 12, color: TOKENS.inkSecondary }}>Riscatti voucher individuali</li>
              <li style={{ fontSize: 12, color: TOKENS.inkSecondary }}>Dettagli della relazione individuale partner-lavoratore</li>
            </ul>
          </div>
        </div>
      </Panel>

      {/* 7. KORA Index boundary panel */}
      <div style={{ background: '#fffaf5', border: `1px dashed ${TOKENS.inkBorder}`, borderRadius: TOKENS.cardRadiusSm, padding: '16px 18px' }}>
        <SectionLabel>Confine KORA Index</SectionLabel>
        <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <li style={{ fontSize: 12.5, color: TOKENS.inkSecondary, lineHeight: 1.6 }}>Questa pagina mostra un&apos;anteprima di possibili futuri input di segnale per il KORA Index.</li>
          <li style={{ fontSize: 12.5, color: TOKENS.inkSecondary, lineHeight: 1.6 }}>Il calcolo live del KORA Index non è modificato.</li>
          <li style={{ fontSize: 12.5, color: TOKENS.inkSecondary, lineHeight: 1.6 }}>Nessun punteggio KORA Index viene ricalcolato qui.</li>
          <li style={{ fontSize: 12.5, color: TOKENS.inkSecondary, lineHeight: 1.6 }}><strong style={{ color: TOKENS.ink }}>KORA-INDEX-ACTIVATION-INTEGRATION-01</strong> sarebbe uno sprint futuro separato, solo dopo revisione CTO.</li>
        </ul>
      </div>

      {/* 8. Contribution boundary panel */}
      <div style={{ background: '#fffaf5', border: `1px dashed ${TOKENS.inkBorder}`, borderRadius: TOKENS.cardRadiusSm, padding: '16px 18px' }}>
        <SectionLabel>Confine Contribution</SectionLabel>
        <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <li style={{ fontSize: 12.5, color: TOKENS.inkSecondary, lineHeight: 1.6 }}>I segnali di Attività Partner non alimentano mai direttamente KORA Contribution.</li>
          <li style={{ fontSize: 12.5, color: TOKENS.inkSecondary, lineHeight: 1.6 }}>KORA Space / Iniziative Contribution restano separate.</li>
          <li style={{ fontSize: 12.5, color: TOKENS.inkSecondary, lineHeight: 1.6 }}>Impacchettare un&apos;attività in un&apos;iniziativa richiede un percorso separato di proposta → revisione → adozione — un atto editoriale, non un collegamento automatico.</li>
        </ul>
      </div>

      {/* 9. Implementation status */}
      <Panel>
        <SectionLabel>Stato di implementazione</SectionLabel>
        <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <li style={{ fontSize: 12.5, color: TOKENS.inkSecondary, lineHeight: 1.6 }}><strong style={{ color: TOKENS.ink }}>Il Catalogo Attività Partner esiste</strong> — <code>/partner/activity-catalog</code>, shell no-DB.</li>
          <li style={{ fontSize: 12.5, color: TOKENS.inkSecondary, lineHeight: 1.6 }}><strong style={{ color: TOKENS.ink }}>La Selezione Attività Azienda esiste</strong> — <code>/company/activity-selection</code>, shell no-DB.</li>
          <li style={{ fontSize: 12.5, color: TOKENS.inkSecondary, lineHeight: 1.6 }}><strong style={{ color: TOKENS.ink }}>La Discovery Attività Worker esiste</strong> — <code>/worker/activity-discovery</code>, shell no-DB.</li>
          <li style={{ fontSize: 12.5, color: TOKENS.inkSecondary, lineHeight: 1.6 }}><strong style={{ color: TOKENS.ink }}>Le Prenotazioni Attività Partner esistono</strong> — <code>/partner/activity-bookings</code>, shell no-DB.</li>
          <li style={{ fontSize: 12.5, color: TOKENS.inkSecondary, lineHeight: 1.6 }}><strong style={{ color: TOKENS.ink }}>L&apos;Activation Signal Pipeline è solo anteprima</strong> — modello statico, nessuna aggregazione reale, nessun calcolo.</li>
          <li style={{ fontSize: 12.5, color: TOKENS.inkSecondary, lineHeight: 1.6 }}><strong style={{ color: TOKENS.ink }}>La persistenza reale e l&apos;aggregazione reale restano lavoro futuro.</strong></li>
        </ul>
      </Panel>

      {/* 10. Next sprint panel */}
      <Panel>
        <SectionLabel>Prossimo sprint raccomandato</SectionLabel>
        <p style={{ margin: 0, fontSize: 12.5, color: TOKENS.inkSecondary, lineHeight: 1.6 }}>
          <strong style={{ color: TOKENS.ink }}>COMPANY-ACTIVITY-SIGNAL-PREVIEW-01</strong> è lo sprint più
          sicuro da qui: porta l&apos;anteprima aggregata di questa pagina in un contesto company-facing
          senza toccare il calcolo KORA Index. <strong style={{ color: TOKENS.ink }}>KORA-INDEX-ACTIVATION-INTEGRATION-01</strong>{' '}
          resta il passo successivo — solo dopo revisione CTO — perché integrerebbe segnali Fase 2
          aggregati nel calcolo del KORA Index mantenendo la pipeline distinta dalla Fase 1.
        </p>
      </Panel>

      {/* Cross-links */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <Link href="/admin/kora-activation-layer" style={{ fontSize: 12.5, fontWeight: 700, color: TOKENS.accent, textDecoration: 'none' }}>
          KORA Activation Layer →
        </Link>
        <Link href="/partner/activity-catalog" style={{ fontSize: 12.5, fontWeight: 700, color: TOKENS.accent, textDecoration: 'none' }}>
          Catalogo Attività Partner →
        </Link>
        <Link href="/company/activity-selection" style={{ fontSize: 12.5, fontWeight: 700, color: TOKENS.accent, textDecoration: 'none' }}>
          Selezione Attività Azienda →
        </Link>
        <Link href="/worker/activity-discovery" style={{ fontSize: 12.5, fontWeight: 700, color: TOKENS.accent, textDecoration: 'none' }}>
          Discovery Attività Worker →
        </Link>
        <Link href="/partner/activity-bookings" style={{ fontSize: 12.5, fontWeight: 700, color: TOKENS.accent, textDecoration: 'none' }}>
          Prenotazioni Attività Partner →
        </Link>
        <Link href="/company/kora-index" style={{ fontSize: 12.5, fontWeight: 700, color: TOKENS.accent, textDecoration: 'none' }}>
          KORA Index™ (Fase 1, live) →
        </Link>
        <Link href="/company/activity-signals" style={{ fontSize: 12.5, fontWeight: 700, color: TOKENS.accent, textDecoration: 'none' }}>
          Segnali di Attivazione (Azienda) →
        </Link>
      </div>

    </div>
  );
}
