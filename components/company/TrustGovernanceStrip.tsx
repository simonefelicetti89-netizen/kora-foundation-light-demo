'use client';

import { cn } from '@/lib/utils';
import type { KoraIndexOutput } from '@/lib/types';
import { formatConfidenceScore } from '@/lib/formatters';

interface TrustGovernanceStripProps {
  output?: KoraIndexOutput;
  className?: string;
}

const SAFEGUARD_VALUE_COLOR: Record<string, string> = {
  CLEAR:   'text-kora-fun-green',
  WARNING: 'text-amber-600',
  FLAGGED: 'text-red-600',
};

// Non-suppressible per doc 21b
export function TrustGovernanceStrip({ output, className }: TrustGovernanceStripProps) {
  const cs        = output?.confidence_score;
  const safeguard = output?.safeguard_status ?? '—';
  const mv        = output?.methodology_version_id ?? '—';
  const cal       = output?.calibration_status ?? '—';

  return (
    <div
      className={cn(
        'rounded-xl border border-kora-cosmic-blue/10 px-5 py-3.5 overflow-x-auto',
        className,
      )}
      style={{ background: '#F0F1F8' }}
    >
      <div className="flex items-center gap-0 min-w-max">

        <div className="shrink-0 pr-6">
          <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-kora-cosmic-blue/40">
            Confidence Score
          </p>
          <p className="text-sm font-bold text-kora-violet mt-0.5 tabular-nums">
            {cs != null ? formatConfidenceScore(cs) : '—'}
          </p>
        </div>

        <div className="h-7 w-px bg-kora-cosmic-blue/10 shrink-0" />

        <div className="shrink-0 px-6">
          <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-kora-cosmic-blue/40">
            Activation Safeguard
          </p>
          <p className={cn('text-sm font-bold mt-0.5 font-mono', SAFEGUARD_VALUE_COLOR[safeguard] ?? 'text-kora-cosmic-blue')}>
            {safeguard}
          </p>
        </div>

        <div className="h-7 w-px bg-kora-cosmic-blue/10 shrink-0" />

        <div className="shrink-0 px-6">
          <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-kora-cosmic-blue/40">
            Metodologia
          </p>
          <p className="text-xs font-mono text-kora-cosmic-blue mt-0.5">{mv}</p>
        </div>

        <div className="h-7 w-px bg-kora-cosmic-blue/10 shrink-0" />

        <div className="shrink-0 px-6">
          <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-kora-cosmic-blue/40">
            Calibrazione
          </p>
          <p className="text-xs font-mono text-kora-cosmic-blue/70 mt-0.5">{cal}</p>
        </div>

        <div className="h-7 w-px bg-kora-cosmic-blue/10 shrink-0" />

        <div className="shrink-0 pl-6">
          <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-kora-cosmic-blue/40">
            Livello output
          </p>
          <p className="text-xs text-kora-cosmic-blue/60 mt-0.5">
            Organizzazione — aggregati privacy-safe
          </p>
        </div>

      </div>
    </div>
  );
}
