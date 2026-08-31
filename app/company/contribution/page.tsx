// app/company/contribution/page.tsx
// B167: KORA Contribution — dashboard reale per tenant Pilot+, shell per Foundation Light.
//
// Feature gate via getContributionPromoterView / getContributionOriginEmployerView (B163 pattern).
// Se production_ready=false → shell esistente (zero regressione).
// Se production_ready=true  → dashboard con DUE sezioni parallele (promoter + origin_employer).
//
// DOTTRINA:
//   - NESSUN punteggio aggregato unico (fuori dottrina).
//   - Le due sezioni hanno peso visivo equivalente — nessuna gerarchia.
//   - "Non è componente del KORA Index" dichiarato testualmente (CLAUDE.md §12.7).
//   - Anonimato: sezione origin_employer mostra solo aggregati, mai legame worker↔iniziativa.

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { requireCompanyUser, isKoraAuthError } from '@/lib/auth/kora-session';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import {
  getContributionPromoterView,
  getContributionOriginEmployerView,
  getContributionV2Live,
} from '@/services/kora-contribution/KoraContributionService';
import type { ContributionSummary } from '@/services/kora-contribution/KoraContributionService';
import { getCalibrationStatus } from '@/lib/methodology-config/v0.1';
import { TOKENS, PILLAR_COLORS } from '@/lib/design/kora-design-tokens';
import type { ContributionPillarBreakdown } from '@/lib/commons/contribution-views';

export const metadata = { title: 'KORA Contribution™ · Company' };

const FONT = 'Plus Jakarta Sans, system-ui, sans-serif';

const PILLAR_LABELS: Record<string, string> = {
  LIFE:       'Benessere',
  GROWTH:     'Crescita',
  CONNECTION: 'Connessione',
  IMPACT:     'Impatto',
  LEGACY:     'Eredità',
};

// ── Componente grafico pillar (barre orizzontali, no librerie esterne) ────────
function PillarBar({ breakdown }: { breakdown: ContributionPillarBreakdown[] }) {
  if (breakdown.length === 0) {
    return (
      <p style={{ fontSize: 11, color: TOKENS.inkHint, fontFamily: FONT, margin: 0 }}>
        Nessun dato pillar disponibile.
      </p>
    );
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {breakdown.map((row) => {
        const color = PILLAR_COLORS[row.pillar as keyof typeof PILLAR_COLORS] ?? TOKENS.accent;
        const label = PILLAR_LABELS[row.pillar] ?? row.pillar;
        return (
          <div key={row.pillar} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 10, color: TOKENS.inkSecondary, fontFamily: FONT, width: 72, flexShrink: 0 }}>
              {label}
            </span>
            <div style={{ flex: 1, background: TOKENS.taupe, borderRadius: 4, height: 6, overflow: 'hidden' }}>
              <div style={{ width: `${Math.min(row.share_pct, 100)}%`, background: color, height: '100%', borderRadius: 4 }} />
            </div>
            <span style={{ fontSize: 10, color: TOKENS.inkTertiary, fontFamily: 'monospace', width: 36, textAlign: 'right' }}>
              {row.share_pct.toFixed(0)}%
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Card metrica singola ──────────────────────────────────────────────────────
function MetricCard({ value, label, color }: { value: number | string; label: string; color?: string }) {
  return (
    <div style={{
      background:   TOKENS.surface,
      border:       `1px solid ${TOKENS.inkBorder}`,
      borderRadius: 12,
      padding:      '16px 14px',
      textAlign:    'center',
      flex:         1,
      minWidth:     100,
    }}>
      <p style={{ fontSize: 28, fontWeight: 800, color: color ?? TOKENS.ink, margin: '0 0 4px', lineHeight: 1, fontFamily: FONT }}>
        {value}
      </p>
      <p style={{ fontSize: 10, color: TOKENS.inkHint, margin: 0, lineHeight: 1.4, fontFamily: FONT }}>
        {label}
      </p>
    </div>
  );
}

// ── Riquadro narrativa ────────────────────────────────────────────────────────
function NarrativeBlock({ sentences }: { sentences: string[] }) {
  return (
    <div style={{ padding: '12px 16px', background: TOKENS.canvas, borderRadius: 10, border: `1px solid ${TOKENS.inkBorder}` }}>
      {sentences.map((s, i) => (
        <p key={i} style={{ fontSize: 12, color: TOKENS.inkSecondary, margin: i === 0 ? 0 : '6px 0 0', lineHeight: 1.65, fontFamily: FONT }}>
          {s}
        </p>
      ))}
    </div>
  );
}

// ── Sezione parallela (promoter o origin_employer) ────────────────────────────
function ContributionSection({
  title,
  subtitle,
  accentColor,
  metrics,
  narrative,
  pillarBreakdown,
  testId,
}: {
  title:          string;
  subtitle:       string;
  accentColor:    string;
  metrics:        { value: number | string; label: string; color?: string }[];
  narrative:      string[];
  pillarBreakdown: ContributionPillarBreakdown[];
  testId:         string;
}) {
  return (
    <section
      data-testid={testId}
      style={{
        background:   TOKENS.surface,
        border:       `1.5px solid ${TOKENS.inkBorderStrong}`,
        borderRadius: 16,
        padding:      '24px 22px',
        flex:         1,
      }}
    >
      {/* Intestazione sezione */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <div style={{ width: 3, height: 18, background: accentColor, borderRadius: 2 }} />
          <h2 style={{ fontSize: '0.95rem', fontWeight: 700, color: TOKENS.ink, margin: 0, fontFamily: FONT }}>
            {title}
          </h2>
        </div>
        <p style={{ fontSize: 11, color: TOKENS.inkHint, margin: '0 0 0 11px', fontFamily: FONT, lineHeight: 1.5 }}>
          {subtitle}
        </p>
      </div>

      {/* Metriche */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        {metrics.map((m) => (
          <MetricCard key={m.label} value={m.value} label={m.label} color={m.color} />
        ))}
      </div>

      {/* Narrativa */}
      <div style={{ marginBottom: 16 }}>
        <NarrativeBlock sentences={narrative} />
      </div>

      {/* Pillar breakdown */}
      <div>
        <p style={{ fontSize: 10, fontWeight: 700, color: TOKENS.inkMeta, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 8px', fontFamily: FONT }}>
          Distribuzione per pillar
        </p>
        <PillarBar breakdown={pillarBreakdown} />
      </div>
    </section>
  );
}

// ── Pagina principale ─────────────────────────────────────────────────────────

export default async function KoraContributionPage() {
  const auth = await requireCompanyUser();
  if (isKoraAuthError(auth)) redirect('/company/login');

  const db = await getSupabaseServerClient();

  // Carica entrambe le view in parallelo (stesso feature gate internamente)
  const [promoterView, originView] = await Promise.all([
    getContributionPromoterView({ db, tenantId: auth.tenantId }),
    getContributionOriginEmployerView({ db, tenantId: auth.tenantId }),
  ]);

  const isPilot = promoterView !== null;

  // Pre-pilot preview: DB-backed V2 methodology preview computed from this
  // tenant's own real commons.contribution_event rows (B-TRUTH Contribution
  // port, 2026-09-01) — not synthetic data. Shown only when production_ready
  // is false; a tenant with zero real events correctly yields
  // insufficientSignal=true rather than a fabricated fallback.
  const flPreview: ContributionSummary | null = isPilot
    ? null
    : await getContributionV2Live({ db, tenantId: auth.tenantId });

  return (
    <div
      data-testid="company-contribution-page"
      style={{ maxWidth: 860, margin: '0 auto', padding: '40px 24px 80px', fontFamily: FONT }}
    >
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 24 }}>
        <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', color: TOKENS.inkMeta, margin: '0 0 6px' }}>
          Indicatore Companion · Non componente KORA Index
        </p>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: TOKENS.ink, letterSpacing: '-0.03em', margin: '0 0 6px', fontFamily: FONT }}>
          KORA Contribution™
        </h1>
        <p style={{ fontSize: 13, color: TOKENS.inkSecondary, margin: 0, lineHeight: 1.6 }}>
          Misura il contributo collettivo e territoriale della tua organizzazione — oltre il perimetro aziendale.
        </p>
      </div>

      {/* ── Disclaimer metodologico (non sopprimibile) ──────────────────── */}
      <div
        data-testid="contribution-methodology-notice"
        style={{
          background:   TOKENS.taupe,
          border:       `1px solid ${TOKENS.inkBorderStrong}`,
          borderRadius: 10,
          padding:      '10px 14px',
          marginBottom: 28,
          fontSize:     11,
          color:        TOKENS.inkSecondary,
          lineHeight:   1.6,
        }}
      >
        <strong>Nota metodologica.</strong> KORA Contribution™ è un indicatore companion — non è una componente della KORA Methodology Architecture v3 (KORA Index v1.0) e non influenza il punteggio organizzativo.
        Calibrazione: {getCalibrationStatus().replace(/_/g, ' ')} · Formula provvisoria non calibrata empiricamente.
      </div>

      {isPilot ? (
        /* ── DASHBOARD (tenant Pilot+) ───────────────────────────────────── */
        <div data-testid="contribution-live-data">

          {/* Badge periodo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
            <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 4, background: 'rgba(47,125,85,0.10)', color: TOKENS.success, letterSpacing: '0.04em' }}>
              DATI REALI
            </span>
            <span style={{ fontSize: 10, color: TOKENS.inkHint }}>
              {promoterView!.reporting_period} · {promoterView!.data_source}
            </span>
          </div>

          {/* ── Le due sezioni parallele ────────────────────────────────── */}
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-start' }}>

            {/* Sezione A — Promoter */}
            <ContributionSection
              testId="contribution-section-promoter"
              title="Le tue iniziative aperte all'ecosistema"
              subtitle="Iniziative cross-azienda che hai promosso e partecipazioni ricevute"
              accentColor={TOKENS.accent}
              metrics={[
                { value: promoterView!.distinct_initiatives,    label: 'iniziative promosse',       color: TOKENS.accent   },
                { value: promoterView!.participations_received, label: 'partecipazioni ricevute',   color: '#3B6EBA'       },
                { value: promoterView!.external_outreach_events, label: 'eventi con esterni',       color: TOKENS.inkHint  },
              ]}
              narrative={promoterView!.narrative}
              pillarBreakdown={promoterView!.pillar_breakdown}
            />

            {/* Sezione B — Origin employer */}
            <ContributionSection
              testId="contribution-section-origin"
              title="I tuoi lavoratori nell'ecosistema"
              subtitle="Partecipazioni dei tuoi lavoratori a iniziative di altre organizzazioni"
              accentColor="#3B6EBA"
              metrics={[
                { value: originView!.participations_sent,    label: 'partecipazioni effettuate', color: '#3B6EBA'     },
                { value: originView!.distinct_initiatives,   label: 'iniziative raggiunte',      color: TOKENS.accent },
                { value: originView!.distinct_promoters,     label: 'organizzazioni coinvolte',  color: TOKENS.inkHint },
              ]}
              narrative={originView!.narrative}
              pillarBreakdown={originView!.pillar_breakdown}
            />
          </div>

          {/* ── Footer metodologico ─────────────────────────────────────── */}
          <div style={{ marginTop: 24, padding: '12px 16px', background: TOKENS.canvas, borderRadius: 10, border: `1px solid ${TOKENS.inkBorder}` }}>
            <p style={{ fontSize: 10, color: TOKENS.inkMeta, margin: 0, lineHeight: 1.65, fontFamily: FONT }}>
              <strong>Qualità dell&apos;evidenza.</strong> I dati <em>verified</em> derivano da prenotazioni confermate (attended).
              I dati <em>self-declared</em> provengono da dichiarazioni del promotore (peso ridotto per formula). Entrambi contribuiscono all&apos;indicatore Contribution con peso proporzionale all&apos;evidenza.
              KORA supporta la rendicontazione CSR/ESG fornendo evidenze people strutturate, verificate e spiegabili.
              Non garantisce conformità normativa e non sostituisce consulenza ESG, legale, fiscale, assurance o reporting obbligatorio.
            </p>
          </div>

        </div>
      ) : (
        /* ── PRE-PILOT PREVIEW (tenant Foundation Light) ─────────────── */
        <div data-testid="contribution-foundation-light-preview">

          {/* Preview badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
            <span style={{
              fontSize:     10,
              fontWeight:   700,
              padding:      '3px 8px',
              borderRadius: 4,
              background:   'rgba(74,127,224,0.12)',
              color:        '#3B6EBA',
              letterSpacing: '0.04em',
              border:       '1px solid rgba(74,127,224,0.25)',
            }}>
              PRE-PILOT PREVIEW
            </span>
            <span style={{ fontSize: 10, color: TOKENS.inkHint }}>
              Anteprima metodologica · Calcolata sui tuoi eventi di contribuzione reali · Non è la dashboard live
            </span>
          </div>

          <div
            data-testid="contribution-fl-preview-banner"
            style={{
              background:   'rgba(74,127,224,0.06)',
              border:       '1px solid rgba(74,127,224,0.18)',
              borderRadius: 12,
              padding:      '12px 16px',
              marginBottom: 24,
              fontSize:     11,
              color:        '#3B5A8A',
              lineHeight:   1.6,
            }}
          >
            Questa è un&apos;anteprima metodologica calcolata sui tuoi eventi di contribuzione reali già registrati.
            La dashboard completa a due sezioni (promoter / origin employer) si attiva al passaggio a Pilot+.
            <strong> Con pochi o nessun evento registrato, i segnali possono risultare ancora insufficienti per una banda di maturità.</strong>
          </div>

          {flPreview && (
            <>
              {/* ── Version B: Maturity Band + Confidence (primary public output) ── */}
              <div
                data-testid="contribution-v2-maturity-panel"
                style={{
                  background:   TOKENS.surface,
                  border:       `1.5px solid ${TOKENS.inkBorderStrong}`,
                  borderRadius: 16,
                  padding:      '24px 22px',
                  marginBottom: 20,
                }}
              >
                {/* Version label */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                  <span style={{
                    fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 4,
                    background: 'rgba(74,127,224,0.10)', color: '#3B6EBA', letterSpacing: '0.06em',
                    border: '1px solid rgba(74,127,224,0.20)',
                  }}>
                    MODELLO v0.2
                  </span>
                  <span style={{
                    fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 4,
                    background: 'rgba(199,111,61,0.09)', color: TOKENS.accent, letterSpacing: '0.06em',
                    border: '1px solid rgba(199,111,61,0.20)',
                  }}>
                    PRE-EMPIRICAL CALIBRATION
                  </span>
                  {/* Internal marker for automated test assertions */}
                  <span
                    data-testid="contribution-score-presentation-mode"
                    data-value={flPreview.scorePresentationMode}
                    data-v2-public-presentation={flPreview.v2.publicPresentation}
                    style={{ display: 'none' }}
                  />
                </div>

                {/* Maturity band hero */}
                {flPreview.v2.insufficientSignal ? (
                  <div
                    data-testid="contribution-insufficient-signal"
                    style={{
                      background: 'rgba(199,111,61,0.06)', border: '1px solid rgba(199,111,61,0.20)',
                      borderRadius: 12, padding: '16px 18px', marginBottom: 16,
                    }}
                  >
                    <p style={{ fontSize: 13, fontWeight: 700, color: TOKENS.accent, margin: '0 0 4px', fontFamily: FONT }}>
                      Segnali aggregati insufficienti
                    </p>
                    <p style={{ fontSize: 11, color: TOKENS.inkSecondary, margin: 0, lineHeight: 1.55 }}>
                      I segnali disponibili non sono ancora sufficienti per determinare la banda di maturità.
                      Attivare iniziative collettive per aumentare i segnali.
                    </p>
                  </div>
                ) : (
                  <div
                    data-testid="contribution-maturity-band"
                    data-band={flPreview.v2.maturityBand}
                    style={{ marginBottom: 16 }}
                  >
                    <p style={{ fontSize: 10, fontWeight: 700, color: TOKENS.inkMeta, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 8px', fontFamily: FONT }}>
                      Banda di maturità
                    </p>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
                      <span style={{
                        fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.03em',
                        color: flPreview.v2.maturityBand === 'systemic' ? TOKENS.success
                             : flPreview.v2.maturityBand === 'active'   ? '#2F7D55'
                             : flPreview.v2.maturityBand === 'emerging' ? '#D99A2B'
                             : TOKENS.inkHint,
                        fontFamily: FONT, lineHeight: 1,
                      }}>
                        {flPreview.v2.maturityBandLabel}
                      </span>
                      <span style={{ fontSize: 10, color: TOKENS.inkHint, fontFamily: 'monospace' }}>
                        [{flPreview.v2.maturityBand}]
                      </span>
                    </div>
                  </div>
                )}

                {/* Confidence */}
                <div
                  data-testid="contribution-confidence"
                  data-confidence-value={flPreview.v2.confidence}
                  style={{ marginBottom: 16 }}
                >
                  <p style={{ fontSize: 10, fontWeight: 700, color: TOKENS.inkMeta, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 6px', fontFamily: FONT }}>
                    Confidence · Sufficienza segnale
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ flex: 1, background: TOKENS.taupe, borderRadius: 6, height: 6, overflow: 'hidden' }}>
                      <div style={{
                        width: `${Math.round(flPreview.v2.confidence * 100)}%`,
                        background: flPreview.v2.confidence >= 0.70 ? TOKENS.success : flPreview.v2.confidence >= 0.40 ? '#D99A2B' : TOKENS.accent,
                        height: '100%', borderRadius: 6,
                      }} />
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, fontFamily: 'monospace', minWidth: 40, color: TOKENS.inkSecondary }}>
                      {Math.round(flPreview.v2.confidence * 100)}%
                    </span>
                    <span style={{ fontSize: 10, color: TOKENS.inkHint, fontFamily: FONT }}>
                      {flPreview.v2.confidenceLabel}
                    </span>
                  </div>
                  <p style={{ fontSize: 10, color: TOKENS.inkHint, margin: '5px 0 0', lineHeight: 1.5 }}>
                    Separata e non additiva — non entra nel calcolo della banda di maturità.
                  </p>
                </div>

                {/* V2 Component breakdown */}
                <div data-testid="contribution-v2-components">
                  <p style={{ fontSize: 10, fontWeight: 700, color: TOKENS.inkMeta, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 8px', fontFamily: FONT }}>
                    Scomposizione componenti (v0.2)
                  </p>
                  {[
                    { key: 'activationDepth',       label: 'Profondità di attivazione',  weight: 30, value: flPreview.v2.components.activationDepth },
                    { key: 'evidenceQuality',        label: 'Qualità evidenza',            weight: 25, value: flPreview.v2.components.evidenceQuality },
                    { key: 'ecosystemContribution',  label: 'Contribuzione ecosistema',    weight: 20, value: flPreview.v2.components.ecosystemContribution },
                    { key: 'adoptionReach',          label: 'Adozione & portata',          weight: 15, value: flPreview.v2.components.adoptionReach },
                    { key: 'strategicBreadth',       label: 'Ampiezza strategica',         weight: 10, value: flPreview.v2.components.strategicBreadth },
                  ].map(({ key, label, weight, value }) => (
                    <div key={key} data-testid={`contribution-component-${key}`} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <span style={{ fontSize: 10, color: TOKENS.inkSecondary, fontFamily: FONT, width: 170, flexShrink: 0 }}>{label}</span>
                      <span style={{ fontSize: 9, color: TOKENS.inkHint, fontFamily: 'monospace', width: 26, flexShrink: 0 }}>{weight}%</span>
                      <div style={{ flex: 1, background: TOKENS.taupe, borderRadius: 4, height: 5, overflow: 'hidden' }}>
                        <div style={{ width: `${Math.round(value * 100)}%`, background: TOKENS.success, height: '100%', borderRadius: 4 }} />
                      </div>
                      <span style={{ fontSize: 9, color: TOKENS.inkTertiary, fontFamily: 'monospace', width: 34, textAlign: 'right' }}>
                        {Math.round(value * 100)}%
                      </span>
                    </div>
                  ))}
                </div>

                {/* Aggregate signals */}
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 14 }}>
                  <MetricCard value={flPreview.v2.aggregateSignals.totalEligibleEvents} label="eventi eligible" />
                  <MetricCard value={flPreview.v2.aggregateSignals.ecosystemEventsCount} label="eventi ecosistema" />
                  <MetricCard value={flPreview.ecosystemPartners} label="partner ecosistema" />
                </div>

                {/* Insights */}
                {flPreview.v2.insights.length > 0 && (
                  <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${TOKENS.inkBorder}` }}>
                    {flPreview.v2.insights.map((s, i) => (
                      <p key={i} style={{ fontSize: 11, color: TOKENS.inkSecondary, margin: i === 0 ? 0 : '5px 0 0', lineHeight: 1.6, fontFamily: FONT }}>
                        {s}
                      </p>
                    ))}
                  </div>
                )}
              </div>

              {/* Space → Contribution narrative */}
              <div
                data-testid="space-to-contribution-narrative"
                style={{
                  background:   'rgba(47,125,85,0.05)',
                  border:       '1px solid rgba(47,125,85,0.18)',
                  borderRadius: 12,
                  padding:      '14px 18px',
                  marginBottom: 16,
                }}
              >
                <p style={{ fontSize: 11, fontWeight: 700, color: '#2F7D55', margin: '0 0 8px', fontFamily: FONT, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Contribution Events
                </p>
                <p style={{ fontSize: 11, color: '#2F5A42', margin: '0 0 8px', lineHeight: 1.6, fontFamily: FONT }}>
                  KORA Space è prima di tutto l&apos;ambiente di attivazione — KORA Contribution™ è uno dei segnali aggregati che ne emergono, non il suo scopo principale.
                </p>
                <ul style={{ fontSize: 11, color: '#2F5A42', lineHeight: 1.75, margin: 0, paddingLeft: 18 }}>
                  <li style={{ marginBottom: 4 }}>Le partecipazioni confermate nelle iniziative KORA Space creano <strong>Contribution Events</strong>.</li>
                  <li style={{ marginBottom: 4 }}>Questi eventi alimenteranno la dashboard live di KORA Contribution™ quando il profilo pilot sarà attivo.</li>
                  <li>KORA Contribution™ è un indicatore companion — <strong>non è una componente del KORA Index™</strong>.</li>
                </ul>
              </div>

              {/* Contribution event capture notice */}
              <div
                data-testid="contribution-event-capture-notice"
                style={{
                  background:   'rgba(74,127,224,0.06)',
                  border:       '1px solid rgba(74,127,224,0.18)',
                  borderRadius: 10,
                  padding:      '10px 14px',
                  marginBottom: 16,
                  fontSize:     11,
                  color:        '#3B5A8A',
                  lineHeight:   1.6,
                }}
              >
                Gli eventi di partecipazione possono essere registrati;
                la dashboard live richiede l&apos;attivazione pilot (<code style={{ fontSize: 10 }}>production_ready = true</code>).
              </div>

              {/* KORA Value Chain separation — KORA Contribution ≠ KORA Value Chain */}
              <div
                data-testid="contribution-value-chain-separation"
                style={{
                  background:   TOKENS.canvas,
                  border:       `1px solid ${TOKENS.inkBorder}`,
                  borderRadius: 10,
                  padding:      '10px 14px',
                  marginBottom: 16,
                  fontSize:     10,
                  color:        TOKENS.inkMeta,
                  lineHeight:   1.65,
                }}
              >
                <strong>KORA Contribution™ ≠ KORA Value Chain.</strong>{' '}
                KORA Contribution™ misura il contributo collettivo aggregato che emerge dall&apos;ecosistema di attivazione — iniziative cross-azienda, eventi territoriali, partecipazioni tra organizzazioni.
                Non copre filiere di fornitura, partner commerciali o reti di distribuzione.
                Queste estensioni appartengono a <em>KORA Value Chain</em> — prodotto separato in roadmap (post-pilot), non attivo in Foundation Light.
              </div>

              {/* Next steps notice */}
              <div style={{
                background:   TOKENS.canvas,
                border:       `1px solid ${TOKENS.inkBorder}`,
                borderRadius: 12,
                padding:      '14px 18px',
                marginBottom: 20,
              }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: TOKENS.ink, margin: '0 0 8px', fontFamily: FONT }}>
                  Prossimi passi per attivare KORA Contribution™
                </p>
                <ol style={{ fontSize: 11, color: TOKENS.inkSecondary, lineHeight: 1.65, margin: 0, paddingLeft: 18 }}>
                  <li style={{ marginBottom: 4 }}>Pubblica iniziative in KORA Space e ricevi partecipazioni cross-azienda.</li>
                  <li style={{ marginBottom: 4 }}>Le partecipazioni confermate generano eventi di contribuzione (<code style={{ fontSize: 10 }}>contribution_event</code>).</li>
                  <li style={{ marginBottom: 4 }}>Raggiungi soglia Pilot+ (contatta KORA per attivazione).</li>
                  <li>Il dashboard live si attiva con dati reali al posto di questa anteprima.</li>
                </ol>
              </div>
            </>
          )}

          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 12 }}>
            <Link href="/company/commons" style={{ fontSize: 12, fontWeight: 600, color: TOKENS.accent }}>
              Vai a KORA Space →
            </Link>
            <Link href="/company/workspace" style={{ fontSize: 12, fontWeight: 600, color: TOKENS.inkSecondary }}>
              ← Workspace
            </Link>
          </div>

          <p style={{ fontSize: 10, fontFamily: 'monospace', color: TOKENS.inkHint, marginTop: 16 }}>
            contribution_event live attivi per tenant Pilot+ (production_ready = true) ·
            companion indicator · not_kora_index_component
          </p>
        </div>
      )}
    </div>
  );
}
