'use client';

import type { SafeguardStatus } from '@/lib/types';

interface ContextRowProps {
  companyName: string;
  period: string;
  safeguardStatus?: SafeguardStatus;
  workerCount?: number;
  dpReady?: boolean;
  tenantActive?: boolean;
}

const SAFEGUARD_STYLE: Record<SafeguardStatus, React.CSSProperties> = {
  CLEAR: {
    background: 'rgba(200,255,71,0.11)',
    border: '1px solid rgba(200,255,71,0.36)',
    color: '#2B4A00',
  },
  WARNING: {
    background: 'rgba(245,158,11,0.09)',
    border: '1px solid rgba(245,158,11,0.28)',
    color: '#78350F',
  },
  FLAGGED: {
    background: 'rgba(239,68,68,0.09)',
    border: '1px solid rgba(239,68,68,0.28)',
    color: '#7F1D1D',
  },
};

export function ContextRow({
  companyName,
  period,
  safeguardStatus,
  workerCount,
  dpReady = false,
  tenantActive = true,
}: ContextRowProps) {
  return (
    <div>
      {/* Eyebrow */}
      <p
        className="font-mono uppercase text-black/40 mb-2.5"
        style={{ fontSize: '9.5px', letterSpacing: '0.10em' }}
      >
        Cabina di Regia&nbsp;·&nbsp;{period}
      </p>

      {/* Company name + status chips */}
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <h1
          className="font-kora-editorial font-bold text-kora-cosmic-blue leading-[1.04]"
          style={{ fontSize: '2.0625rem', letterSpacing: '-0.03em' }}
        >
          {companyName}
        </h1>

        <div className="flex items-center gap-2 flex-wrap pb-1">
          {safeguardStatus != null && (
            <span
              className="inline-flex items-center gap-1.5 font-mono font-medium rounded"
              style={{
                ...SAFEGUARD_STYLE[safeguardStatus],
                fontSize: '7.5px',
                letterSpacing: '0.05em',
                padding: '3px 7px',
              }}
            >
              {safeguardStatus === 'CLEAR' && (
                <span
                  className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ background: '#588A00' }}
                />
              )}
              {safeguardStatus}
            </span>
          )}

          <span className="w-px h-2 bg-black/[0.08]" aria-hidden="true" />
          {tenantActive && <span className="text-[11px] text-black/40">Tenant attivo</span>}

          {workerCount != null && (
            <>
              <span className="w-px h-2 bg-black/[0.08]" aria-hidden="true" />
              <span className="text-[11px] text-black/40">
                {workerCount.toLocaleString('it-IT')} lavoratori&nbsp;·&nbsp;dati sintetici
              </span>
            </>
          )}

          {dpReady && (
            <>
              <span className="w-px h-2 bg-black/[0.08]" aria-hidden="true" />
              <span
                className="text-[11px] font-medium"
                style={{ color: 'rgba(97,86,245,0.68)' }}
              >
                Decision Pack disponibile
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
