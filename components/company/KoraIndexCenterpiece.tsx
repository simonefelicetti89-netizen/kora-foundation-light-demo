'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';
import type { KoraIndexOutput } from '@/lib/types';
import { SafeguardBadge } from '@/components/badges/SafeguardBadge';
import { CalibrationBadge } from '@/components/badges/CalibrationBadge';
import { MethodologyLabel } from '@/components/kora-index/MethodologyLabel';
import { formatKoraIndex, formatConfidenceScore } from '@/lib/formatters';
import { METHODOLOGY_VERSION, CALIBRATION_STATUS } from '@/lib/constants/kora';

interface KoraIndexCenterpieceProps {
  output?: KoraIndexOutput;
  className?: string;
}

// Non-suppressible per doc 21b: CS, SafeguardBadge, CalibrationBadge, methodology_version_id, calibration_status
const SAFEGUARD_INTERPRETATION: Record<string, string> = {
  CLEAR:   'Attivazione sufficientemente ampia e significativa. KORA Index interpretabile con piena validità.',
  WARNING: 'Una o più soglie di attivazione non raggiunte. KORA Index disponibile — interpretare con cautela.',
  FLAGGED: 'Attivazione insufficiente (AR < 20% o MAR < 15%). KORA Index fortemente qualificato.',
};

export function KoraIndexCenterpiece({ output, className }: KoraIndexCenterpieceProps) {
  const indexValue          = output?.kora_index_value ?? null;
  const confidenceScore     = output?.confidence_score ?? null;
  const safeguardStatus     = output?.safeguard_status ?? 'WARNING';
  const methodologyVersionId = output?.methodology_version_id ?? METHODOLOGY_VERSION;
  const calibrationStatus   = output?.calibration_status ?? CALIBRATION_STATUS;
  const interpretation      = SAFEGUARD_INTERPRETATION[safeguardStatus] ?? '';

  return (
    <div className={cn('rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden', className)}>
      <div className="px-8 py-8">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6">

          {/* ── Left: dominant KORA Index display ── */}
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
              KORA Index
            </p>
            <div className="flex items-end gap-2 mt-2">
              <span className="text-8xl font-bold text-kora-cosmic-blue leading-none tracking-tight tabular-nums">
                {indexValue !== null ? formatKoraIndex(indexValue) : '—'}
              </span>
              <span className="text-xl text-slate-200 mb-2.5 font-light">/ 100</span>
            </div>
            <p className="text-sm text-slate-500 mt-3 leading-relaxed max-w-md">
              {interpretation}
            </p>
          </div>

          {/* ── Right: trust signal cluster ── */}
          <div className="flex flex-col items-start sm:items-end gap-3 shrink-0 pt-1">
            <SafeguardBadge status={safeguardStatus} />
            <CalibrationBadge status={calibrationStatus} />
            <div className="sm:text-right mt-1">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Confidence Score
              </p>
              <p className="text-3xl font-bold text-kora-violet mt-0.5 tabular-nums">
                {confidenceScore !== null ? formatConfidenceScore(confidenceScore) : '—'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Footer: methodology label + drill-down link ── */}
      <div className="border-t border-slate-100 bg-slate-50 px-8 py-3 flex items-center justify-between gap-4">
        <MethodologyLabel
          methodologyVersionId={methodologyVersionId}
          calibrationStatus={calibrationStatus}
        />
        <Link
          href="/company/kora-index"
          className="shrink-0 text-[10px] font-semibold text-kora-violet hover:underline"
        >
          Scomposizione completa (10 componenti) →
        </Link>
      </div>
    </div>
  );
}
