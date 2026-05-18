'use client';

import { cn } from '@/lib/utils';
import type { KoraIndexOutput } from '@/lib/types';
import { SafeguardBadge } from '@/components/badges/SafeguardBadge';
import { CalibrationBadge } from '@/components/badges/CalibrationBadge';
import { MethodologyLabel } from '@/components/kora-index/MethodologyLabel';
import { formatKoraIndex, formatConfidenceScore } from '@/lib/formatters';
import { METHODOLOGY_VERSION, CALIBRATION_STATUS } from '@/lib/constants/kora';

interface KoraIndexHeroProps {
  output?: KoraIndexOutput;
  className?: string;
}

// Confidence Score, CalibrationBadge, SafeguardBadge and MethodologyLabel are
// non-suppressible per doc 21b — consuming pages must not remove them
export function KoraIndexHero({ output, className }: KoraIndexHeroProps) {
  const indexValue = output?.kora_index_value ?? null;
  const confidenceScore = output?.confidence_score ?? null;
  const safeguardStatus = output?.safeguard_status ?? 'WARNING';
  const methodologyVersionId = output?.methodology_version_id ?? METHODOLOGY_VERSION;
  const calibrationStatus = output?.calibration_status ?? CALIBRATION_STATUS;

  return (
    <div className={cn('rounded-xl border border-slate-200 bg-white p-6 shadow-sm', className)}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">KORA Index</p>
          <div className="mt-1 flex items-end gap-3">
            <span className="text-5xl font-bold text-slate-900">
              {indexValue !== null ? formatKoraIndex(indexValue) : '—'}
            </span>
            <span className="mb-1 text-sm text-slate-400">/ 100</span>
          </div>

          {/* Confidence Score — always beside KORA Index, never omitted (doc 21b) */}
          <div className="mt-2 flex items-center gap-1.5 text-sm text-slate-500">
            <span>Confidence Score:</span>
            <span className="font-semibold text-slate-700">
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
      <div className="mt-4 border-t border-slate-100 pt-3">
        <MethodologyLabel
          methodologyVersionId={methodologyVersionId}
          calibrationStatus={calibrationStatus}
        />
      </div>
    </div>
  );
}
