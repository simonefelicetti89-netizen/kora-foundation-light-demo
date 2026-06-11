'use client';

// app/company/wallboard/_components/WallboardClient.tsx
// B119: KORA Wallboard — vista aggregata proiettabile per uso interno aziendale.
//
// Privacy rules (assolute, non bypassabili):
//   - Nessun dato individuale worker: nessuna email, nessun worker_id, nessun private_note
//   - Aggregati sotto soglia N<10 mostrano suppressed state — mai un numero sotto soglia
//   - Solo output company-level: KORA Index, CS, Safeguard, AR, MAR, pillar aggregate
//   - Nessun fallback sintetico: empty state onesto se dati non disponibili

import { useEffect, useRef, useState } from 'react';

const FONT = 'Plus Jakarta Sans, system-ui, sans-serif';

const PILLAR_META: Record<string, { label: string; color: string; bg: string }> = {
  LIFE:       { label: 'LIFE',       color: '#2F7D55', bg: 'rgba(47,125,85,0.08)'  },
  GROWTH:     { label: 'GROWTH',     color: '#3B6EBA', bg: 'rgba(59,110,186,0.08)' },
  CONNECTION: { label: 'CONNECTION', color: '#7C3D8F', bg: 'rgba(124,61,143,0.08)' },
  IMPACT:     { label: 'IMPACT',     color: '#C07D2A', bg: 'rgba(192,125,42,0.08)' },
  LEGACY:     { label: 'LEGACY',     color: '#5A4A3F', bg: 'rgba(90,74,63,0.08)'   },
};

const PILLAR_ORDER = ['LIFE', 'GROWTH', 'CONNECTION', 'IMPACT', 'LEGACY'] as const;

const MACROBLOCK_ORDER = ['REACH', 'QUALITY', 'EQUITY', 'BTI'] as const;

const MACROBLOCK_META: Record<string, { label: string; description: string; weight: number; color: string; bg: string }> = {
  REACH:   { label: 'Activation Reach',       description: 'Quota della workforce raggiunta dall\'attivazione.',           weight: 0.25, color: '#3B6EBA', bg: 'rgba(59,110,186,0.06)'  },
  QUALITY: { label: 'Activation Quality',     description: 'Profondita\', verifica e continuita\' dell\'attivazione.',     weight: 0.30, color: '#2F7D55', bg: 'rgba(47,125,85,0.06)'   },
  EQUITY:  { label: 'Distribution & Equity',  description: 'Distribuzione equa tra lavoratori, reparti, sedi.',           weight: 0.25, color: '#7C3D8F', bg: 'rgba(124,61,143,0.06)'  },
  BTI:     { label: 'Budget-to-Human-Impact', description: 'Quanto il budget welfare si traduce in valore umano reale.',   weight: 0.20, color: '#C07D2A', bg: 'rgba(192,125,42,0.06)'  },
};

const SAFEGUARD_STYLE: Record<string, { color: string; bg: string; border: string }> = {
  CLEAR:   { color: '#2F7D55', bg: 'rgba(47,125,85,0.08)',   border: 'rgba(47,125,85,0.25)'   },
  WARNING: { color: '#8A5A00', bg: 'rgba(217,154,43,0.10)',  border: 'rgba(217,154,43,0.30)'  },
  FLAGGED: { color: '#9E3B2F', bg: 'rgba(158,59,47,0.08)',   border: 'rgba(158,59,47,0.25)'   },
};

function koraIndexBand(v: number): string {
  if (v >= 70) return 'Solido';
  if (v >= 50) return 'In sviluppo';
  return 'Intervento necessario';
}

function koraIndexBandColor(v: number): string {
  if (v >= 70) return '#2F7D55';
  if (v >= 50) return '#C07D2A';
  return '#9E3B2F';
}

function fmtPct(n: number | null | undefined): string {
  if (n == null) return '—';
  return `${Math.round(n * 100)}%`;
}

// ── Types — mirror the API response shapes ─────────────────────────────────────

type CountOrSuppressed =
  | { suppressed: false; value: number }
  | { suppressed: true; suppression_reason: 'privacy_threshold'; suppression_threshold: number };

type PillarAggregate =
  | { pillar: string; published_initiatives: number; suppressed: false; total_participations: number }
  | { pillar: string; published_initiatives: number; suppressed: true; suppression_reason: string; suppression_threshold: number };

// Minimal macroblock shape consumed by the wallboard — subset of MacroblockScore.
interface WallboardMacroblock {
  code:   string;
  label:  string;
  score:  number;
  weight: number;
}

interface WorkspaceData {
  ok: boolean;
  tenant: { tenantCode: string; companyName: string; methodologyVersion: string; calibrationStatus: string };
  koraIndex: {
    koraIndexValue: number;
    confidenceScore: number;
    safeguardStatus: string;
    activationRate: number | null;
    meaningfulActivationRate: number | null;
    reportingPeriod: string;
    methodologyVersion: string;
    calibrationStatus: string;
    macroblocks: WallboardMacroblock[] | null;
    displayLabels: { methodology: string; calibration: string; disclaimer: string };
  } | null;
}

interface AggData {
  ok: boolean;
  aggregate: {
    total_published_initiatives: number;
    participation_summary: CountOrSuppressed;
    pillar_breakdown: PillarAggregate[];
  };
}

// ── Derive up to 3 insights from available data ───────────────────────────────

function deriveInsights(ki: WorkspaceData['koraIndex'], agg: AggData | null): Array<{ label: string; text: string; color: string }> {
  const insights: Array<{ label: string; text: string; color: string }> = [];

  if (!ki) return insights;

  // Insight 1 — Forza principale (pillar con più adesioni, o AR se niente)
  const pillarData = agg?.aggregate.pillar_breakdown ?? [];
  const clearPillars = pillarData.filter(p => !p.suppressed) as Array<{ pillar: string; total_participations: number; published_initiatives: number; suppressed: false }>;
  const topPillar = clearPillars.sort((a, b) => b.total_participations - a.total_participations)[0];

  if (topPillar) {
    const meta = PILLAR_META[topPillar.pillar];
    insights.push({
      label: 'Forza principale',
      text:  `Il pillar ${topPillar.pillar} guida l'attivazione con ${topPillar.total_participations} adesioni aggregate.`,
      color: meta?.color ?? '#06032B',
    });
  } else if (ki.activationRate != null && ki.activationRate >= 0.4) {
    insights.push({
      label: 'Forza principale',
      text:  `Activation Rate al ${fmtPct(ki.activationRate)} — quota significativa della workforce attivata.`,
      color: '#2F7D55',
    });
  }

  // Insight 2 — Area da rafforzare (safeguard warning/flagged, o MAR basso)
  if (ki.safeguardStatus === 'FLAGGED') {
    insights.push({
      label: 'Area da rafforzare',
      text:  'Activation Safeguard FLAGGED — i requisiti minimi di attivazione non sono soddisfatti. Intervento urgente raccomandato.',
      color: '#9E3B2F',
    });
  } else if (ki.safeguardStatus === 'WARNING') {
    insights.push({
      label: 'Area da rafforzare',
      text:  'Activation Safeguard WARNING — attivazione sotto i minimi raccomandati. Espandere le iniziative o aumentare la partecipazione.',
      color: '#8A5A00',
    });
  } else if (ki.meaningfulActivationRate != null && ki.meaningfulActivationRate < 0.3) {
    insights.push({
      label: 'Area da rafforzare',
      text:  `Meaningful Activation Rate al ${fmtPct(ki.meaningfulActivationRate)} — aumentare la quota di attivazione significativa.`,
      color: '#8A5A00',
    });
  }

  // Insight 3 — Prossima priorità
  const weakPillar = clearPillars.sort((a, b) => a.total_participations - b.total_participations)[0];
  if (weakPillar && clearPillars.length >= 2) {
    const meta = PILLAR_META[weakPillar.pillar];
    insights.push({
      label: 'Prossima priorità',
      text:  `Rafforzare il pillar ${weakPillar.pillar} — il meno attivato tra quelli misurabili.`,
      color: meta?.color ?? '#06032B',
    });
  } else if (ki.confidenceScore < 60) {
    insights.push({
      label: 'Prossima priorità',
      text:  `Confidence Score al ${Math.round(ki.confidenceScore)} — migliorare la qualità e completezza delle fonti dati per aumentare l'affidabilità del calcolo.`,
      color: '#3B6EBA',
    });
  }

  return insights.slice(0, 3);
}

// ── Main WallboardClient ───────────────────────────────────────────────────────

interface WallboardClientProps {
  userEmail: string;
  userRole: string;
}

export function WallboardClient({ userEmail, userRole }: WallboardClientProps) {
  const [workspace, setWorkspace] = useState<WorkspaceData | null>(null);
  const [aggData,   setAggData]   = useState<AggData | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState<string | null>(null);
  const contentRef                = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let done = 0;
    const finish = () => { done++; if (done === 2) setLoading(false); };

    fetch('/api/company/workspace', { credentials: 'include' })
      .then(r => r.json())
      .then((d: WorkspaceData) => { if (d.ok) setWorkspace(d); else setError('Workspace non disponibile.'); })
      .catch(() => setError('Errore di rete.'))
      .finally(finish);

    fetch('/api/company/workers/activation-aggregate', { credentials: 'include' })
      .then(r => r.json())
      .then((d: AggData) => { if (d.ok) setAggData(d); })
      .catch(() => { /* non-critical */ })
      .finally(finish);
  }, []);

  function requestFullscreen() {
    if (contentRef.current) {
      contentRef.current.requestFullscreen?.().catch(() => {});
    }
  }

  const ki        = workspace?.koraIndex ?? null;
  const tenant    = workspace?.tenant;
  const pillars   = aggData?.aggregate.pillar_breakdown ?? [];
  const insights  = deriveInsights(ki, aggData);
  const safeguard = SAFEGUARD_STYLE[ki?.safeguardStatus ?? ''] ?? SAFEGUARD_STYLE.CLEAR;

  return (
    <div
      ref={contentRef}
      data-testid="wallboard-container"
      style={{ maxWidth: 900, margin: '0 auto', padding: '32px 24px', fontFamily: FONT }}
    >
      {/* ── Topbar ─────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <a
            href="/company/workspace"
            data-testid="wallboard-back-link"
            style={{ fontSize: 11, color: 'rgba(6,3,43,0.40)', textDecoration: 'none' }}
          >
            ← Workspace
          </a>
          <span
            data-testid="wallboard-privacy-badge"
            style={{
              fontSize:      9,
              fontWeight:    700,
              letterSpacing: '0.10em',
              textTransform: 'uppercase',
              padding:       '3px 8px',
              borderRadius:  999,
              background:    'rgba(47,125,85,0.10)',
              color:         '#2F7D55',
              border:        '1px solid rgba(47,125,85,0.28)',
            }}
          >
            Vista aggregata privacy-safe
          </span>
        </div>
        <button
          data-testid="wallboard-fullscreen-btn"
          onClick={requestFullscreen}
          style={{
            fontSize:     11,
            fontWeight:   600,
            color:        'rgba(6,3,43,0.45)',
            background:   'none',
            border:       '1px solid rgba(6,3,43,0.14)',
            borderRadius: 8,
            padding:      '5px 12px',
            cursor:       'pointer',
            fontFamily:   FONT,
          }}
        >
          Modalità schermo intero
        </button>
      </div>

      {/* ── Loading / error ─────────────────────────────────────────────────── */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '60px 0', fontSize: 13, color: 'rgba(6,3,43,0.40)' }}>
          Caricamento Wallboard…
        </div>
      )}
      {!loading && error && (
        <div style={{ textAlign: 'center', padding: '60px 0', fontSize: 13, color: '#9E3B2F' }}>
          {error}
        </div>
      )}

      {/* ── Empty state — no scoring yet ───────────────────────────────────── */}
      {!loading && !error && !ki && (
        <div
          data-testid="wallboard-empty-state"
          style={{
            textAlign:    'center',
            padding:      '60px 24px',
            border:       '1px dashed rgba(6,3,43,0.12)',
            borderRadius: 16,
          }}
        >
          <p style={{ fontSize: 18, fontWeight: 700, color: '#06032B', margin: '0 0 10px' }}>
            KORA Wallboard
          </p>
          <p style={{ fontSize: 13, color: 'rgba(6,3,43,0.50)', margin: '0 0 6px', lineHeight: 1.6 }}>
            La vista Wallboard sarà disponibile dopo il primo calcolo KORA Index™.
          </p>
          <p style={{ fontSize: 11, color: 'rgba(6,3,43,0.35)', margin: 0 }}>
            Completa ingestion, UEF review e scoring per visualizzare questa bacheca.
          </p>
        </div>
      )}

      {/* ── Main wallboard content ─────────────────────────────────────────── */}
      {!loading && !error && ki && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Header company */}
          <div
            data-testid="wallboard-header"
            style={{
              background:   '#06032B',
              borderRadius: 16,
              padding:      '24px 28px',
              display:      'flex',
              alignItems:   'flex-start',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.40)', margin: '0 0 6px' }}>
                KORA Wallboard
              </p>
              <h1
                data-testid="wallboard-company-name"
                style={{ fontSize: '1.5rem', fontWeight: 800, color: '#FFFFFF', margin: '0 0 4px', letterSpacing: '-0.02em' }}
              >
                {tenant?.companyName ?? '—'}
              </h1>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.40)', margin: 0 }}>
                Periodo: {ki.reportingPeriod} · Vista aggregata · nessun dato individuale
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.30)', letterSpacing: '0.08em', display: 'block', marginBottom: 2 }}>
                {ki.displayLabels.methodology}
              </span>
              <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)' }}>
                {ki.displayLabels.calibration}
              </span>
            </div>
          </div>

          {/* KORA Index hero */}
          <div
            data-testid="wallboard-kora-index-section"
            style={{
              border:       '1px solid rgba(6,3,43,0.10)',
              borderRadius: 16,
              padding:      '24px 28px',
              display:      'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              gap:          20,
            }}
          >
            {/* KORA Index value */}
            <div>
              <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', color: 'rgba(6,3,43,0.35)', margin: '0 0 8px' }}>
                KORA Index™
              </p>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span
                  data-testid="wallboard-kora-index-value"
                  style={{ fontSize: '2.5rem', fontWeight: 900, color: '#06032B', letterSpacing: '-0.04em', lineHeight: 1 }}
                >
                  {Math.round(ki.koraIndexValue)}
                </span>
                <span style={{ fontSize: 11, fontWeight: 700, color: koraIndexBandColor(ki.koraIndexValue) }}>
                  {koraIndexBand(ki.koraIndexValue)}
                </span>
              </div>
              <p style={{ fontSize: 11, color: 'rgba(6,3,43,0.40)', margin: '6px 0 0', lineHeight: 1.4 }}>
                {ki.displayLabels.disclaimer}
              </p>
            </div>

            {/* Confidence Score */}
            <div>
              <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', color: 'rgba(6,3,43,0.35)', margin: '0 0 8px' }}>
                Confidence Score
              </p>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span
                  data-testid="wallboard-confidence-score"
                  style={{ fontSize: '2rem', fontWeight: 800, color: '#06032B', letterSpacing: '-0.03em' }}
                >
                  {Math.round(ki.confidenceScore)}
                </span>
                <span style={{ fontSize: 11, color: 'rgba(6,3,43,0.40)' }}>/100</span>
              </div>
              <p style={{ fontSize: 11, color: 'rgba(6,3,43,0.40)', margin: '6px 0 0', lineHeight: 1.4 }}>
                Affidabilità dati · esterno al KORA Index™
              </p>
            </div>

            {/* Activation Safeguard */}
            <div>
              <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', color: 'rgba(6,3,43,0.35)', margin: '0 0 8px' }}>
                Activation Safeguard
              </p>
              <div
                data-testid="wallboard-safeguard-status"
                style={{
                  display:      'inline-flex',
                  alignItems:   'center',
                  gap:          6,
                  padding:      '8px 14px',
                  borderRadius: 10,
                  border:       `1px solid ${safeguard.border}`,
                  background:   safeguard.bg,
                }}
              >
                <span style={{ fontSize: 16, fontWeight: 900, color: safeguard.color, letterSpacing: '-0.02em' }}>
                  {ki.safeguardStatus}
                </span>
              </div>
              <div style={{ marginTop: 8, display: 'flex', gap: 12 }}>
                <div>
                  <span style={{ fontSize: 9, color: 'rgba(6,3,43,0.35)' }}>AR</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#06032B', marginLeft: 4 }}>
                    {fmtPct(ki.activationRate)}
                  </span>
                </div>
                <div>
                  <span style={{ fontSize: 9, color: 'rgba(6,3,43,0.35)' }}>MAR</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#06032B', marginLeft: 4 }}>
                    {fmtPct(ki.meaningfulActivationRate)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 4 Macroblocchi */}
          <div data-testid="wallboard-macroblocks-section">
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', color: 'rgba(6,3,43,0.35)', margin: '0 0 12px' }}>
              4 Macroblocchi KORA Index
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
              {MACROBLOCK_ORDER.map(code => {
                const meta   = MACROBLOCK_META[code];
                const mbRow  = ki.macroblocks?.find(m => m.code === code);
                const score  = mbRow?.score ?? null;
                const weight = mbRow?.weight ?? meta.weight;

                return (
                  <div
                    key={code}
                    data-testid={`wallboard-macroblock-${code.toLowerCase()}`}
                    style={{
                      border:       `1px solid ${meta.color}22`,
                      borderRadius: 12,
                      padding:      '14px 16px',
                      background:   meta.bg,
                    }}
                  >
                    <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: meta.color, margin: '0 0 2px' }}>
                      {code}
                    </p>
                    <p style={{ fontSize: 11, fontWeight: 700, color: '#06032B', margin: '0 0 8px', lineHeight: 1.3 }}>
                      {meta.label}
                    </p>
                    {score !== null ? (
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 4 }}>
                        <span style={{ fontSize: '1.5rem', fontWeight: 900, color: meta.color, letterSpacing: '-0.03em' }}>
                          {Math.round(score)}
                        </span>
                        <span style={{ fontSize: 10, color: 'rgba(6,3,43,0.35)' }}>/100</span>
                      </div>
                    ) : (
                      <p style={{ fontSize: 11, fontWeight: 600, color: 'rgba(6,3,43,0.30)', margin: '0 0 4px' }}>
                        Dato disponibile dopo scoring
                      </p>
                    )}
                    <div style={{
                      height: 3, borderRadius: 999,
                      background: score !== null ? meta.color : 'rgba(6,3,43,0.08)',
                      width: score !== null ? `${Math.min(score, 100)}%` : '100%',
                      opacity: score !== null ? 1 : 0.3,
                    }} />
                    <p style={{ fontSize: 9, color: 'rgba(6,3,43,0.35)', margin: '6px 0 0' }}>
                      Peso: {Math.round(weight * 100)}%
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 5 Pillars */}
          <div data-testid="wallboard-pillars-section">
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', color: 'rgba(6,3,43,0.35)', margin: '0 0 12px' }}>
              5 Pillar — Attivazione Aggregata
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}>
              {PILLAR_ORDER.map(pillarCode => {
                const meta    = PILLAR_META[pillarCode];
                const pillarRow = pillars.find(p => p.pillar === pillarCode);

                return (
                  <div
                    key={pillarCode}
                    data-testid={`wallboard-pillar-${pillarCode.toLowerCase()}`}
                    style={{
                      border:       `1px solid ${meta.color}30`,
                      borderRadius: 12,
                      padding:      '14px 14px',
                      background:   meta.bg,
                    }}
                  >
                    <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: meta.color, margin: '0 0 10px' }}>
                      {pillarCode}
                    </p>

                    {!pillarRow && (
                      <p style={{ fontSize: 11, color: 'rgba(6,3,43,0.35)', margin: 0 }}>Nessun dato</p>
                    )}

                    {pillarRow && pillarRow.suppressed && (
                      <div data-testid={`wallboard-pillar-${pillarCode.toLowerCase()}-suppressed`}>
                        <p style={{ fontSize: 11, fontWeight: 600, color: 'rgba(6,3,43,0.45)', margin: '0 0 2px' }}>
                          Dati aggregati non disponibili
                        </p>
                        <p style={{ fontSize: 10, color: 'rgba(6,3,43,0.30)', margin: 0, lineHeight: 1.4 }}>
                          N&lt;{pillarRow.suppression_threshold} — sotto soglia privacy
                        </p>
                      </div>
                    )}

                    {pillarRow && !pillarRow.suppressed && (
                      <>
                        <p style={{ fontSize: '1.3rem', fontWeight: 900, color: meta.color, margin: '0 0 2px', letterSpacing: '-0.02em' }}>
                          {pillarRow.total_participations}
                        </p>
                        <p style={{ fontSize: 10, color: 'rgba(6,3,43,0.40)', margin: '0 0 4px' }}>
                          adesioni aggregate
                        </p>
                        <p style={{ fontSize: 10, color: 'rgba(6,3,43,0.30)', margin: 0 }}>
                          {pillarRow.published_initiatives} iniziative
                        </p>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Insights */}
          {insights.length > 0 && (
            <div data-testid="wallboard-insights-section">
              <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', color: 'rgba(6,3,43,0.35)', margin: '0 0 12px' }}>
                Intelligence
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(${insights.length}, 1fr)`, gap: 12 }}>
                {insights.map((insight, i) => (
                  <div
                    key={i}
                    style={{
                      border:       '1px solid rgba(6,3,43,0.08)',
                      borderRadius: 12,
                      padding:      '16px 18px',
                    }}
                  >
                    <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', color: insight.color, margin: '0 0 6px' }}>
                      {insight.label}
                    </p>
                    <p style={{ fontSize: 12, color: '#06032B', margin: 0, lineHeight: 1.6 }}>
                      {insight.text}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Privacy footer — non-suppressible */}
          <div
            data-testid="wallboard-privacy-footer"
            style={{
              borderTop: '1px solid rgba(6,3,43,0.06)',
              paddingTop: 16,
              display:   'flex',
              flexDirection: 'column',
              gap:       4,
            }}
          >
            <p style={{ fontSize: 11, fontWeight: 600, color: 'rgba(6,3,43,0.45)', margin: 0 }}>
              KORA misura l&apos;organizzazione, non valuta i singoli lavoratori.
            </p>
            <p style={{ fontSize: 10, color: 'rgba(6,3,43,0.30)', margin: 0 }}>
              Questa vista contiene solo dati aggregati. Nessun dato individuale è visualizzato o trasmesso.
              KORA Foundation Light · {ki.displayLabels.methodology} · {ki.displayLabels.calibration}
            </p>
          </div>

        </div>
      )}
    </div>
  );
}
