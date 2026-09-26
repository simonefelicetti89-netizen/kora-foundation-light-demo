'use client';

import type { SafeguardStatus } from '@/lib/types';
import { TOKENS } from '@/lib/design/kora-design-tokens';
import { formatConfidenceScore } from '@/lib/formatters';
import { TM } from '@/components/ui/TM';
import { ScoreBandScale, TrendIndicator } from '@/components/ui/px/encoding';

interface HeroDiagnosisProps {
  value:             number;
  safeguardStatus:   SafeguardStatus;
  confidenceScore:   number;
  diagnosisSentence: string;
  reportingPeriod:   string;
  methodologyVersion?: string;
  calibrationStatus?:  string;
}

const SAFEGUARD_CONFIG: Record<SafeguardStatus, { bg: string; text: string; dot: string; label: string; severity: string }> = {
  CLEAR:   { ...TOKENS.safeguard.pass,  label: 'Clear',   severity: 'Attivazione nella norma'          },
  WARNING: { ...TOKENS.safeguard.watch, label: 'Warning', severity: 'Sotto le soglie di qualità'       },
  FLAGGED: { ...TOKENS.safeguard.cap,   label: 'Flagged', severity: 'Attivazione a rischio strutturale' },
};

// HeroDiagnosis — the first thing a user sees on the KORA Index page.
// Score + diagnosis sentence + Safeguard™ + Confidence Score™.
// Narrative before numbers. Verdict before components.
export function HeroDiagnosis({
  value, safeguardStatus, confidenceScore, diagnosisSentence,
  reportingPeriod, methodologyVersion, calibrationStatus,
}: HeroDiagnosisProps) {
  const safeg  = SAFEGUARD_CONFIG[safeguardStatus] ?? SAFEGUARD_CONFIG['WARNING'];
  const scoreColor = value >= 70 ? TOKENS.success : value >= 50 ? TOKENS.warning : TOKENS.critical;

  return (
    <div
      data-wp142-block="hero"
      style={{
        background:   TOKENS.ink,
        borderRadius: TOKENS.cardRadius,
        padding:      '40px 44px',
        position:     'relative',
        overflow:     'hidden',
      }}
    >
      {/* Subtle terracotta ring watermark */}
      <div style={{
        position:     'absolute',
        right:        -40,
        top:          -40,
        width:        200,
        height:       200,
        borderRadius: '50%',
        border:       '40px solid rgba(199,111,61,0.07)',
        pointerEvents: 'none',
      }} />

      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 28, flexWrap: 'wrap' }}>
        <div>
          <p className="kt-meta" style={{ color: TOKENS.accent, marginBottom: 6 }}>
            <TM>KORA Index</TM> v3 · {reportingPeriod}
          </p>
          {/* Diagnosis sentence — the most important line on the page */}
          <p style={{
            fontFamily:  'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif',
            fontSize:    'clamp(1.25rem, 2.5vw, 1.625rem)',
            fontWeight:  400,
            color:       '#FFFFFF',
            letterSpacing: '-0.01em',
            lineHeight:  1.3,
            maxWidth:    560,
          }}>
            {diagnosisSentence}
          </p>
        </div>

        {/* Score — large but NOT the first thing */}
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <p style={{
            fontFamily:  'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif',
            fontWeight:  700,
            fontSize:    'clamp(3rem, 6vw, 4rem)',
            color:       scoreColor,
            letterSpacing: '-0.04em',
            lineHeight:  0.9,
            fontVariantNumeric: 'tabular-nums',
          }}>
            {Math.round(value)}
          </p>
          <p style={{ fontFamily: 'Plus Jakarta Sans, var(--font-jakarta)', fontSize: '12px', color: 'rgba(255,255,255,0.30)', marginTop: 4 }}>
            /100
          </p>
        </div>
      </div>

      {/* KORA-WP-142 — the index against its OWN configured bands. A number out
          of a hundred is not a reading; a position in a calibrated vocabulary is.
          The dark ground is the one place on the page where the band scale is
          inverted, so the encoding carries its own light palette. */}
      <div style={{
        marginBottom: 20, padding: '14px 16px',
        background: 'rgba(255,255,255,0.05)', borderRadius: 10,
      }}>
        <ScoreBandScale value={value} onDark />
        {/* The no-prior-period state is WP140's, rendered unmodified. It sits on
            a light inset rather than being restyled for the dark ground, because
            a canonical state that changes appearance per surface stops being
            recognisable as that state. */}
        <div style={{ marginTop: 12, background: '#FFFFFF', borderRadius: 8, padding: 2 }}>
          <TrendIndicator
            metricLabel="KORA Index™"
            trend={{ kind: 'no_prior_period', expected: 'Il confronto di periodo sarà disponibile dalla seconda rilevazione.' }}
          />
        </div>
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', marginBottom: 20 }} />

      {/* Governance strip — Safeguard + CS */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'flex-start' }}>

        {/* Activation Safeguard™ */}
        <div style={{ flex: 1, minWidth: 160 }}>
          <p style={{
            fontFamily:    'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif',
            fontWeight:    600,
            fontSize:      '9.5px',
            letterSpacing: '0.09em',
            textTransform: 'uppercase',
            color:         'rgba(255,255,255,0.30)',
            marginBottom:  8,
          }}>
            Activation Safeguard™
          </p>
          <span style={{
            display:      'inline-flex',
            alignItems:   'center',
            gap:          8,
            borderRadius: 999,
            padding:      '6px 14px',
            background:   safeg.bg,
            color:        safeg.text,
            border:       `1px solid ${safeg.dot}50`,
            fontSize:     '13px',
            fontFamily:   'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif',
            fontWeight:   700,
          }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: safeg.dot }} />
            {safeg.label}
          </span>
          <p className="kt-caption" style={{ color: 'rgba(255,255,255,0.55)', marginTop: 5 }}>
            {safeg.severity}
          </p>
        </div>

        {/* Vertical divider */}
        <div style={{ width: 1, background: 'rgba(255,255,255,0.08)', alignSelf: 'stretch' }} />

        {/* Confidence Score™ */}
        <div style={{ flex: 1, minWidth: 140 }}>
          <p style={{
            fontFamily:    'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif',
            fontWeight:    600,
            fontSize:      '9.5px',
            letterSpacing: '0.09em',
            textTransform: 'uppercase',
            color:         'rgba(255,255,255,0.30)',
            marginBottom:  8,
          }}>
            Confidence Score™
          </p>
          <p style={{
            fontFamily:  'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif',
            fontWeight:  700,
            fontSize:    '22px',
            color:       '#FFFFFF',
            letterSpacing: '-0.02em',
            lineHeight:  1,
          }}>
            {formatConfidenceScore(confidenceScore)}
          </p>
          <p className="kt-caption" style={{ color: 'rgba(255,255,255,0.55)', marginTop: 5 }}>
            Esterno al <TM>KORA Index</TM> · peso = 0
          </p>
        </div>

        {/* Calibration stamp */}
        {calibrationStatus && (
          <>
            <div style={{ width: 1, background: 'rgba(255,255,255,0.08)', alignSelf: 'stretch' }} />
            <div style={{ flex: 1, minWidth: 140 }}>
              <p style={{ fontFamily: 'Plus Jakarta Sans, var(--font-jakarta)', fontWeight: 600, fontSize: '9.5px', letterSpacing: '0.09em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.30)', marginBottom: 8 }}>
                Calibrazione
              </p>
              <span style={{
                borderRadius: 999,
                padding:      '4px 10px',
                background:   TOKENS.safeguard.watch.bg,
                color:        TOKENS.safeguard.watch.text,
                border:       `1px solid rgba(217,154,43,0.30)`,
              }} className="kt-meta">
                {calibrationStatus.replace(/_/g, ' ')}
              </span>
              {/* KORA-WP-142 found the stamp below at 9px — under the WP139 11px
                  floor. WP139's floor was measured on its own two demonstrators,
                  so a sub-floor stamp survived here. Raised to the floor and to a
                  contrast that can actually be read on the dark ground. */}
              {methodologyVersion && (
                <p className="kt-meta" style={{ fontFamily: 'ui-monospace, monospace', color: 'rgba(255,255,255,0.45)', marginTop: 6 }}>
                  {methodologyVersion}
                </p>
              )}
            </div>
          </>
        )}
      </div>

      {/* B79-P0-5: Benchmark guidance — no sector benchmark in KORA Foundation Light */}
      {/* KORA-WP-142: this interpretation note ran at 9px on a dark ground at
          25% opacity — sustained reading text, two steps under the WP139 floor
          and below any usable contrast. It is the disclosure that qualifies the
          whole score, so it is raised to the canonical caption role. */}
      <div className="kt-caption" style={{
        marginTop:  16,
        paddingTop: 12,
        borderTop:  '1px solid rgba(255,255,255,0.07)',
        color:      'rgba(255,255,255,0.55)',
      }}>
        <strong style={{ color: 'rgba(255,255,255,0.40)', fontWeight: 600 }}>Interpretazione score:</strong>{' '}
        KORA Index v1.0 è in calibrazione pre-empirica. Non esistono ancora benchmark di settore validati —
        i valori sono diagnostici e interni. Confronto settoriale disponibile post-pilot (Delphi Study).
        &nbsp;·&nbsp; Calibrazione: <span style={{ fontFamily: 'ui-monospace, monospace' }}>pre_empirical_calibration</span>
      </div>
    </div>
  );
}

// Pure frontend: generates a verdict sentence from score + safeguard + activation
export function generateDiagnosisSentence(
  value:          number,
  safeguardStatus: string,
  activationRate:  number,
  weakCode?:       string,
): string {
  const pct = Math.round(activationRate * 100);
  const score = Math.round(value);

  if (safeguardStatus === 'FLAGGED') {
    return `Attivazione a rischio strutturale — ${score}/100 con Activation Safeguard™ FLAGGED e copertura workforce al ${pct}%.`;
  }
  if (safeguardStatus === 'WARNING') {
    const constraint = weakCode ? ` Il vincolo primario è il macroblocco ${weakCode}.` : '';
    return `Attivazione in sviluppo — ${score}/100, sotto le soglie di qualità con AR ${pct}%.${constraint}`;
  }
  if (value >= 70) {
    return `Attivazione solida — ${score}/100 con copertura workforce ${pct}% e Activation Safeguard™ CLEAR.`;
  }
  if (value >= 55) {
    return `Attivazione positiva — ${score}/100, AR ${pct}%. Margini di miglioramento su profondità e continuità.`;
  }
  return `Attivazione in costruzione — ${score}/100 con significativo potenziale di miglioramento strutturale.`;
}
