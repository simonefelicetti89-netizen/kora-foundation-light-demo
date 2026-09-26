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

const HAIRLINE = 'rgba(255,255,255,0.08)';
const QUIET    = 'rgba(255,255,255,0.32)';

// One governance cell. All three read identically — label, value, sub-line — so
// the strip is one grammar instead of a pill, a number and a stamp.
function GovCell({ label, value, valueColor, sub, dot }: {
  label: string; value: React.ReactNode; valueColor?: string; sub: React.ReactNode; dot?: string;
}) {
  return (
    <div style={{ flex: 1, minWidth: 150 }}>
      <p className="kt-meta" style={{ color: QUIET, marginBottom: 8, fontWeight: 600 }}>{label}</p>
      <p className="kt-subsection" style={{ color: valueColor ?? '#FFFFFF', display: 'flex', alignItems: 'center', gap: 8 }}>
        {dot && <span style={{ width: 7, height: 7, borderRadius: '50%', background: dot, flexShrink: 0 }} />}
        {value}
      </p>
      <p className="kt-caption" style={{ color: QUIET, marginTop: 6 }}>{sub}</p>
    </div>
  );
}

// HeroDiagnosis — the single T1 of the KORA Index surface.
// KORA-WP-141 simplification: the terracotta ring watermark, the Safeguard pill
// and the calibration pill are gone. They were three separate colour families
// and three separate surface treatments competing with the score inside one
// viewport. The judgment now carries exactly one saturated colour — the score —
// and the Safeguard status survives as a 7px semantic dot, which is the smallest
// mark that still discharges the non-suppressible disclosure.
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
      }}
    >
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 28, flexWrap: 'wrap' }}>
        <div style={{ minWidth: 0 }}>
          {/* KORA-WP-141: the eyebrow carried a SECOND version label — and the
              wrong one: it printed the INTERNAL architecture generation, which
              B100 bans as a client-facing label. The masthead already carries the
              canonical public version. Reporting period only. */}
          <p className="kt-meta" style={{ color: TOKENS.accent, marginBottom: 10, fontWeight: 600 }}>
            {reportingPeriod}
          </p>
          {/* Diagnosis sentence — the most important line on the page */}
          <p className="kt-section" style={{ fontWeight: 400, color: '#FFFFFF', maxWidth: 560 }}>
            {diagnosisSentence}
          </p>
        </div>

        {/* Score — the one saturated colour above the fold */}
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <p className="kt-display kt-num" style={{ color: scoreColor }}>
            {Math.round(value)}
          </p>
          <p className="kt-caption" style={{ color: QUIET, marginTop: 6 }}>/100</p>
        </div>
      </div>

      <div style={{ height: 1, background: HAIRLINE, marginBottom: 20 }} />

      {/* Governance strip — Safeguard, Confidence Score, calibration */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'flex-start' }}>
        <GovCell
          label="Activation Safeguard™"
          value={safeg.label}
          dot={safeg.dot}
          sub={safeg.severity}
        />
        <GovCell
          label="Confidence Score™"
          value={<span className="kt-num">{formatConfidenceScore(confidenceScore)}</span>}
          sub={<>Esterno al <TM>KORA Index</TM> · peso = 0</>}
        />
        {calibrationStatus && (
          <GovCell
            label="Calibrazione"
            value="Pre-empirica"
            sub={<>{calibrationStatus}{methodologyVersion ? ` · ${methodologyVersion}` : ''}</>}
          />
        )}
      </div>

      {/* B79-P0-5: Benchmark guidance — no sector benchmark in KORA Foundation Light */}
      <p className="kt-caption" style={{ marginTop: 20, paddingTop: 14, borderTop: `1px solid ${HAIRLINE}`, color: QUIET, maxWidth: 720 }}>
        KORA Index v1.0 è in calibrazione pre-empirica. Non esistono ancora benchmark di settore validati —
        i valori sono diagnostici e interni. Confronto settoriale disponibile post-pilot (Delphi Study).
      </p>
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
