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
    <div
      className={cn('rounded-xl border p-6', className)}
      style={dark
        ? { background: '#06032B', borderColor: 'rgba(97,86,245,0.2)' }
        : { background: '#FFFFFF', borderColor: 'rgba(6,3,43,0.1)' }
      }
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p
            className="text-[10px] font-semibold uppercase tracking-[0.2em]"
            style={{ color: dark ? 'rgba(255,255,255,0.35)' : 'rgba(6,3,43,0.4)' }}
          >
            KORA Index v3
          </p>
          <div className="mt-1.5 flex items-end gap-3 leading-none">
            <span
              className="font-kora-editorial font-black tabular-nums"
              style={{
                fontSize: 'clamp(2.75rem, 6vw, 3.5rem)',
                letterSpacing: '-0.03em',
                color: dark ? '#FFFFFF' : '#06032B',
              }}
            >
              {indexValue !== null ? formatKoraIndex(indexValue) : '—'}
            </span>
            <span
              className="mb-1 text-sm font-light"
              style={{ color: dark ? 'rgba(255,255,255,0.2)' : 'rgba(6,3,43,0.3)' }}
            >
              / 100
            </span>
          </div>

          {/* Confidence Score — always beside KORA Index, never omitted (doc 21b) */}
          <div className="mt-3 flex items-center gap-1.5">
            <span
              className="text-[10px] font-semibold uppercase tracking-[0.15em]"
              style={{ color: dark ? 'rgba(255,255,255,0.3)' : 'rgba(6,3,43,0.4)' }}
            >
              Confidence Score
            </span>
            <span
              className="text-sm font-bold tabular-nums"
              style={{ color: '#6156F5' }}
            >
              {confidenceScore !== null ? formatConfidenceScore(confidenceScore) : '—'}
            </span>
            <span
              className="text-[9px]"
              style={{ color: dark ? 'rgba(255,255,255,0.2)' : 'rgba(6,3,43,0.3)' }}
            >
              indicatore esterno
            </span>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          <SafeguardBadge status={safeguardStatus} />
          <CalibrationBadge status={calibrationStatus} />
        </div>
      </div>

      {/* Methodology version — non-suppressible */}
      <div
        className="mt-4 border-t pt-3"
        style={{ borderColor: dark ? 'rgba(255,255,255,0.08)' : 'rgba(6,3,43,0.08)' }}
      >
        <MethodologyLabel
          methodologyVersionId={methodologyVersionId}
          calibrationStatus={calibrationStatus}
        />
      </div>
    </div>
  );
}
