'use client';

import Link from 'next/link';
import type { KoraIndexOutput } from '@/lib/types';

interface Action {
  priority: number;
  action: string;
  detail: string;
  target_components: string[];
}

interface DecisionCardProps {
  action: Action | null;
  output: KoraIndexOutput;
  s1Output?: KoraIndexOutput | null;
  isViewer?: boolean;
}

export function DecisionCard({
  action,
  output,
  s1Output,
  isViewer = false,
}: DecisionCardProps) {
  const showDelta = s1Output != null;
  const kiDelta   = showDelta ? Math.round(output.kora_index_value - s1Output!.kora_index_value) : null;
  const csDelta   = showDelta
    ? Math.round((output.confidence_score - s1Output!.confidence_score) * 100)
    : null;
  const s1Safeg   = s1Output?.safeguard_status;
  const safeguardChanged =
    showDelta && s1Safeg != null && s1Safeg !== output.safeguard_status;

  const decisionTitle = action?.action ?? 'Analizza il gap strutturale';
  const decisionBody  = action?.detail ??
    'Verifica la distribuzione per pillar e l\'allocazione della spesa per individuare le aree di attivazione profonda sottorappresentate nel periodo.';

  return (
    <div
      className="flex flex-col gap-4"
      style={{
        background:   '#FFFFFF',
        border:       '1px solid rgba(6,3,43,0.08)',
        borderRadius: 8,
        padding:      '24px 22px',
      }}
    >
      {/* Decision header */}
      <div>
        <p
          className="font-mono uppercase text-black/25 mb-1.5"
          style={{ fontSize: '6.5px', letterSpacing: '0.18em' }}
        >
          Decisione richiesta
        </p>
        <p
          className="font-kora-editorial font-bold text-kora-cosmic-blue leading-[1.34]"
          style={{ fontSize: '14.5px', letterSpacing: '-0.015em' }}
        >
          {decisionTitle}
        </p>
      </div>

      {/* Body */}
      <p className="text-[12.5px] text-kora-cosmic-blue/65 leading-[1.68]">
        {decisionBody}
      </p>

      {/* Scenario delta — only meaningful when S2 active in demo (S2 vs S1) */}
      {showDelta && (kiDelta != null || csDelta != null || safeguardChanged) && (
        <div
          className="rounded"
          style={{
            background: '#F5F6FA',
            border: '1px solid rgba(6,3,43,0.08)',
            padding: '10px 12px',
          }}
        >
          <p
            className="font-mono uppercase text-black/25 mb-1.5"
            style={{ fontSize: '6.5px', letterSpacing: '0.18em' }}
          >
            Variazione vs S1
          </p>

          {kiDelta != null && (
            <div className="flex items-baseline gap-1.5 mb-1">
              <span
                className="text-[11px] font-semibold"
                style={{ color: kiDelta >= 0 ? '#6156F5' : '#B45309' }}
              >
                {kiDelta >= 0 ? '↑' : '↓'}&nbsp;{kiDelta >= 0 ? '+' : ''}{kiDelta}&nbsp;pts
              </span>
              <span className="text-[10.5px] text-black/40">KORA Index</span>
            </div>
          )}
          {csDelta != null && (
            <div className="flex items-baseline gap-1.5 mb-1">
              <span
                className="text-[11px] font-semibold"
                style={{ color: csDelta >= 0 ? '#6156F5' : '#B45309' }}
              >
                {csDelta >= 0 ? '↑' : '↓'}&nbsp;{csDelta >= 0 ? '+' : ''}{csDelta}&nbsp;pts
              </span>
              <span className="text-[10.5px] text-black/40">Confidence Score</span>
            </div>
          )}
          {safeguardChanged && (
            <div className="flex items-baseline gap-1.5">
              <span className="text-[11px] font-semibold" style={{ color: '#558C00' }}>✓</span>
              <span className="text-[10.5px] text-black/40">
                Safeguard {s1Safeg} → {output.safeguard_status}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Decision Pack output descriptor */}
      <div
        className="rounded"
        style={{
          background: 'rgba(97,86,245,0.038)',
          border: '1px solid rgba(97,86,245,0.11)',
          padding: '10px 12px',
        }}
      >
        <p className="text-[10px] text-black/40 mb-0.5">Output disponibile</p>
        <p
          className="font-kora-editorial font-bold text-kora-cosmic-blue"
          style={{ fontSize: '12.5px', letterSpacing: '-0.01em', marginBottom: 2 }}
        >
          KORA Decision Pack
        </p>
        <p className="text-[10px] text-black/40">Board-ready&nbsp;·&nbsp;{output.reporting_period}</p>
      </div>

      {/* CTAs — board grade treatment */}
      {!isViewer ? (
        <div className="flex flex-col gap-1.5">
          <Link
            href="/company/reports"
            className="block text-center text-white font-semibold"
            style={{
              background:   '#06032B',
              boxShadow:    'inset 0 1px 0 rgba(255,255,255,0.07)',
              fontSize:     '12.5px',
              letterSpacing: '0.01em',
              lineHeight:   1,
              padding:      '11px 16px',
              borderRadius: 4,
            }}
          >
            View Decision Pack{' '}
            <span style={{ opacity: 0.44, marginLeft: 6 }}>→</span>
          </Link>
          <Link
            href="/company/reports/board-pack"
            className="block text-center font-normal"
            style={{
              fontSize:     '12px',
              border:       '1px solid rgba(6,3,43,0.08)',
              color:        'rgba(6,3,43,0.42)',
              padding:      '9px 16px',
              borderRadius: 4,
            }}
          >
            Board Pack Preview
          </Link>
          <Link
            href="/company/kora-index"
            className="block text-center"
            style={{ fontSize: '11px', padding: '5px', color: '#6156F5', opacity: 0.68 }}
          >
            KORA Index Detail →
          </Link>
        </div>
      ) : (
        <Link
          href="/company/shared"
          className="block text-center font-semibold"
          style={{
            fontSize:     '12px',
            border:       '1px solid rgba(6,3,43,0.12)',
            color:        'rgba(6,3,43,0.50)',
            padding:      '10px 16px',
            borderRadius: 4,
          }}
        >
          KORA Shared View →
        </Link>
      )}
    </div>
  );
}
