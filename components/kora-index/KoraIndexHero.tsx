'use client';

import { cn } from '@/lib/utils';
import type { KoraIndexOutput } from '@/lib/types';
import { SafeguardBadge } from '@/components/badges/SafeguardBadge';
import { CalibrationBadge } from '@/components/badges/CalibrationBadge';
import { formatKoraIndex, formatConfidenceScore } from '@/lib/formatters';
import { METHODOLOGY_VERSION, CALIBRATION_STATUS } from '@/lib/constants/kora';

interface KoraIndexHeroProps {
  output?: KoraIndexOutput;
  className?: string;
  variant?: 'light' | 'dark';
}

// Confidence Score, CalibrationBadge, SafeguardBadge and MethodologyLabel are
// non-suppressible per doc 21b — consuming pages must not remove them
export function KoraIndexHero({ output, className, variant = 'light' }: KoraIndexHeroProps) {
  const indexValue = output?.kora_index_value ?? null;
  const confidenceScore = output?.confidence_score ?? null;
  const safeguardStatus = output?.safeguard_status ?? 'WARNING';
  const methodologyVersionId = output?.methodology_version_id ?? METHODOLOGY_VERSION;
  const calibrationStatus = output?.calibration_status ?? CALIBRATION_STATUS;

  const dark = variant === 'dark';

  return (
    <div className={cn(
      'rounded-xl border p-6',
      dark ? 'border-[rgba(6,3,43,0.35)] bg-[#06032B] shadow-lg' : 'border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] shadow-sm',
      className,
    )}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-[rgba(6,3,43,0.40)]">KORA Index</p>
          <div className="mt-1 flex items-end gap-3">
            <span className={cn('text-5xl font-bold', dark ? 'text-white' : 'text-[#06032B]')}>
              {indexValue !== null ? formatKoraIndex(indexValue) : '—'}
            </span>
            <span className={cn('mb-1 text-sm', dark ? 'text-[rgba(6,3,43,0.52)]' : 'text-[rgba(6,3,43,0.40)]')}>/ 100</span>
          </div>

          {/* Confidence Score — always beside KORA Index, never omitted (doc 21b) */}
          <div className={cn('mt-2 flex items-center gap-1.5 text-sm', dark ? 'text-[rgba(6,3,43,0.40)]' : 'text-[rgba(6,3,43,0.52)]')}>
            <span>Confidence Score:</span>
            <span className={cn('font-semibold', dark ? 'text-white/90' : 'text-[rgba(6,3,43,0.78)]')}>
              {confidenceScore !== null ? formatConfidenceScore(confidenceScore) : '—'}
            </span>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          <SafeguardBadge status={safeguardStatus} />
          <CalibrationBadge status={calibrationStatus} />
        </div>
      </div>

      {/* Methodology version — non-suppressible */}
      <div className={cn('mt-4 border-t pt-3', dark ? 'border-[rgba(6,3,43,0.35)]' : 'border-[rgba(6,3,43,0.05)]')}>
        <p className={cn('text-[10px] font-mono', dark ? 'text-[rgba(6,3,43,0.52)]' : 'text-[rgba(6,3,43,0.40)]')}>
          {methodologyVersionId}&nbsp;·&nbsp;{calibrationStatus}
        </p>
      </div>
    </div>
  );
}
