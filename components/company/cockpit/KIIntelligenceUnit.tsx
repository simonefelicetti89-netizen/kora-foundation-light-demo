'use client';

import type { KoraIndexOutput, CompanyAggregateExtended, SafeguardStatus } from '@/lib/types';
import { formatConfidenceScore } from '@/lib/formatters';

interface KIIntelligenceUnitProps {
  output: KoraIndexOutput;
  aggregate: CompanyAggregateExtended | null;
  dpReady?: boolean;
}

function getEvidenceQuality(cs: number): string {
  if (cs >= 0.80) return 'alta';
  if (cs >= 0.55) return 'moderata';
  return 'bassa';
}

function fmtPct(val: number): string {
  return `${Math.round(val * 100)}%`;
}

const BADGE_STYLE: Record<SafeguardStatus, React.CSSProperties> = {
  CLEAR:   { background: 'rgba(200,255,71,0.11)', border: '1px solid rgba(200,255,71,0.36)', color: '#2B4A00' },
  WARNING: { background: 'rgba(245,158,11,0.09)', border: '1px solid rgba(245,158,11,0.28)', color: '#78350F' },
  FLAGGED: { background: 'rgba(239,68,68,0.09)',  border: '1px solid rgba(239,68,68,0.28)',  color: '#7F1D1D' },
};

// Non-suppressible per doc 21b: Confidence Score, safeguard_status, methodology_version_id
export function KIIntelligenceUnit({ output, aggregate, dpReady = false }: KIIntelligenceUnitProps) {
  const ki        = Math.round(output.kora_index_value);
  const cs        = output.confidence_score;
  const safeg     = output.safeguard_status;
  const evQuality = getEvidenceQuality(cs);
  const ar        = aggregate != null ? fmtPct(aggregate.activation_rate) : '—';
  const mar       = aggregate != null ? fmtPct(aggregate.meaningful_activation_rate) : '—';
  const vr        = aggregate != null ? fmtPct(aggregate.verification_rate) : '—';
  const badgeStyle = BADGE_STYLE[safeg] ?? BADGE_STYLE['WARNING'];

  return (
    <div
      className="relative overflow-hidden"
      style={{
        borderTop:    '1px solid rgba(6,3,43,0.08)',
        borderRight:  '1px solid rgba(6,3,43,0.08)',
        borderBottom: 'none',
        borderLeft:   '3px solid #6156F5',
        borderRadius: '0 8px 0 0',
        background:   'linear-gradient(180deg, rgba(97,86,245,0.032) 0px, #FFFFFF 56px)',
        padding:      '22px 26px 20px',
      }}
    >
      {/* KORA brandmark watermark — proprietary identity mark */}
      <svg
        aria-hidden="true"
        viewBox="0 0 424 418"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{
          position: 'absolute',
          top: 16, right: 16,
          width: 38, height: 38,
          opacity: 0.06,
          pointerEvents: 'none',
        }}
      >
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M148.768 117.887C189.054 101.199 234.334 101.199 274.606 117.887C287.456 123.227 297.663 133.434 302.989 146.27C319.677 186.556 319.677 231.836 302.989 272.108C297.649 284.958 287.442 295.165 274.606 300.491C234.32 317.179 189.04 317.179 148.768 300.491C135.918 295.151 125.711 284.944 120.385 272.108C103.697 231.822 103.697 186.542 120.385 146.27C125.725 133.42 135.932 123.213 148.768 117.887ZM211.498 124.924C190.444 124.924 171.74 138.302 159.961 158.98C139.268 170.759 125.904 189.463 125.904 210.518C125.904 231.572 139.282 250.276 159.961 262.055C171.74 282.747 190.444 296.111 211.498 296.111C232.552 296.111 251.257 282.733 263.035 262.055C283.728 250.276 297.092 231.572 297.092 210.518C297.092 189.463 283.714 170.759 263.035 158.98C251.257 138.288 232.552 124.924 211.498 124.924Z"
          fill="#6156F5"
        />
      </svg>

      {/* Section header: dot · label · hairline rule */}
      <div className="flex items-center gap-1.5 mb-4">
        <span
          className="w-1.5 h-1.5 rounded-full flex-shrink-0"
          style={{ background: '#6156F5', opacity: 0.80 }}
        />
        <span
          className="font-kora-editorial font-semibold"
          style={{ fontSize: '9.5px', color: 'rgba(97,86,245,0.75)', letterSpacing: '0.01em' }}
        >
          KORA Index v3
        </span>
        <div className="flex-1 h-px" style={{ background: 'rgba(97,86,245,0.10)' }} />
      </div>

      {/* Score row — 32px hard ceiling, always with companion signals */}
      <div className="flex items-baseline flex-wrap gap-1.5 mb-4">
        <span
          className="font-kora-editorial font-bold text-kora-cosmic-blue leading-none tabular-nums"
          style={{ fontSize: '2rem', letterSpacing: '-0.04em' }}
        >
          {ki}
        </span>
        <span className="text-[13px] font-light text-black/25">/100</span>

        <span
          className="inline-flex items-center gap-1 font-mono font-medium rounded ml-0.5"
          style={{ ...badgeStyle, fontSize: '7.5px', letterSpacing: '0.05em', padding: '3px 7px' }}
        >
          {safeg === 'CLEAR' && (
            <span className="w-1 h-1 rounded-full flex-shrink-0" style={{ background: '#588A00' }} />
          )}
          {safeg}
        </span>

        {/* Confidence Score — non-suppressible per doc 21b, always beside KI */}
        <div className="flex items-baseline gap-1 ml-2.5">
          <span className="text-[10px] text-black/40">Confidence</span>
          <span
            className="font-kora-editorial font-bold leading-none tabular-nums"
            style={{ fontSize: '15px', color: '#6156F5', letterSpacing: '-0.02em' }}
          >
            {formatConfidenceScore(cs)}
          </span>
          <span className="font-mono text-[7px] text-black/25 ml-0.5" style={{ letterSpacing: '0.05em' }}>
            esterno&nbsp;·&nbsp;peso&nbsp;0
          </span>
        </div>
      </div>

      {/* Hairline separator — removes form/table feel between score and signals */}
      <div className="h-px mb-3.5" style={{ background: 'rgba(6,3,43,0.042)' }} />

      {/* Signal grid: AR · MAR · VR */}
      <div className="grid grid-cols-3 mb-4" style={{ gap: '8px 18px' }}>
        {([
          { code: 'AR',  value: ar,  label: 'Activation Rate' },
          { code: 'MAR', value: mar, label: 'Meaningful Activation' },
          { code: 'VR',  value: vr,  label: 'Verification Rate' },
        ] as const).map((sig) => (
          <div key={sig.code}>
            <p
              className="font-mono uppercase text-black/25 mb-1"
              style={{ fontSize: '6.5px', letterSpacing: '0.18em' }}
            >
              {sig.code}
            </p>
            <p
              className="font-kora-editorial font-bold text-kora-cosmic-blue leading-none tabular-nums"
              style={{ fontSize: '1.0625rem', letterSpacing: '-0.025em' }}
            >
              {sig.value}
            </p>
            <p className="text-[10px] text-black/40 mt-0.5 leading-tight">{sig.label}</p>
          </div>
        ))}
      </div>

      {/* Evidence + DP strip */}
      <div
        className="flex items-center flex-wrap gap-2.5 rounded mb-3"
        style={{
          padding: '8px 11px',
          background: '#F5F6FA',
          border: '1px solid rgba(6,3,43,0.042)',
        }}
      >
        <span className="text-[10.5px] text-black/40">
          Qualità evidenza:{' '}
          <span className="font-semibold text-black/60">{evQuality}</span>
        </span>
        {dpReady && (
          <>
            <span className="w-px h-2.5 bg-black/[0.08]" aria-hidden="true" />
            <span
              className="text-[10.5px] font-semibold"
              style={{ color: 'rgba(97,86,245,0.65)' }}
            >
              Decision Pack&nbsp;·&nbsp;board preview pronto
            </span>
          </>
        )}
      </div>

      {/* Methodology note — minimal, non-intrusive */}
      <p
        className="font-mono text-black/25"
        style={{ fontSize: '7px', letterSpacing: '0.06em' }}
      >
        {output.methodology_version_id}&nbsp;·&nbsp;pre-calibration
      </p>
    </div>
  );
}
