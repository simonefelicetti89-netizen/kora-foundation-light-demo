'use client';

import type { SafeguardStatus } from '@/lib/types';
import { TOKENS } from '@/lib/design/kora-design-tokens';
import { formatConfidenceScore } from '@/lib/formatters';
import { TM } from '@/components/ui/TM';

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
          <p style={{
            fontFamily:    'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif',
            fontWeight:    600,
            fontSize:      '10px',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color:         TOKENS.accent,
            marginBottom:  6,
          }}>
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
          <p style={{
            fontFamily: 'Plus Jakarta Sans, var(--font-jakarta)',
            fontSize:   '10px',
            color:      'rgba(255,255,255,0.30)',
            marginTop:  5,
          }}>
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
          <p style={{
            fontFamily: 'Plus Jakarta Sans, var(--font-jakarta)',
            fontSize:   '10px',
            color:      'rgba(255,255,255,0.30)',
            marginTop:  5,
            lineHeight: 1.35,
          }}>
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
                fontSize:     '10px',
                fontFamily:   'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif',
                fontWeight:   600,
              }}>
                {calibrationStatus.replace(/_/g, ' ')}
              </span>
              {methodologyVersion && (
                <p style={{ fontFamily: 'ui-monospace, monospace', fontSize: '9px', color: 'rgba(255,255,255,0.22)', marginTop: 6 }}>
                  {methodologyVersion}
                </p>
              )}
            </div>
          </>
        )}
      </div>

      {/* B79-P0-5: Benchmark guidance — no sector benchmark in Foundation Light v0.1 */}
      <div style={{
        marginTop:    16,
        paddingTop:   12,
        borderTop:    '1px solid rgba(255,255,255,0.07)',
        fontSize:     '9px',
        color:        'rgba(255,255,255,0.25)',
        lineHeight:   1.5,
        fontFamily:   'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif',
      }}>
        <strong style={{ color: 'rgba(255,255,255,0.40)', fontWeight: 600 }}>Interpretazione score:</strong>{' '}
        KORA Index v0.1 è in calibrazione pre-empirica. Non esistono ancora benchmark di settore validati —
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
