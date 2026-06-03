'use client';

import { cn } from '@/lib/utils';
import type { SafeguardStatus, ActivationSafeguardResult } from '@/lib/types';
import { SAFEGUARD_THRESHOLDS } from '@/lib/constants/kora';

interface ActivationSafeguardPanelProps {
  result?: ActivationSafeguardResult | null;
  explanation?: string;
  className?: string;
}

const STATUS_STYLES: Record<SafeguardStatus, { bar: string; text: string; bg: string }> = {
  CLEAR:   { bar: 'bg-kora-fun-green',  text: 'text-kora-cosmic-blue', bg: 'bg-kora-fun-green/15 border-kora-fun-green/40' },
  WARNING: { bar: 'bg-yellow-400',      text: 'text-yellow-800',       bg: 'bg-yellow-50 border-yellow-200' },
  FLAGGED: { bar: 'bg-red-500',         text: 'text-red-800',          bg: 'bg-red-50 border-red-200' },
};

function ThresholdGauge({
  label,
  value,
  flaggedMax,
  warnMax,
  clearMin,
}: {
  label: string;
  value: number;
  flaggedMax: number;
  warnMax: number;
  clearMin: number;
}) {
  const pct = Math.min(value * 100, 100);
  const flaggedPct = flaggedMax * 100;
  const warnPct = warnMax * 100;

  return (
    <div>
      <div className="flex justify-between text-xs text-[rgba(6,3,43,0.52)] mb-1">
        <span className="font-mono font-semibold text-[rgba(6,3,43,0.78)]">{label}</span>
        <span className="font-semibold">{(value * 100).toFixed(0)}%</span>
      </div>
      <div className="relative h-3 w-full rounded-full overflow-hidden bg-[rgba(6,3,43,0.05)]">
        {/* Zone backgrounds */}
        <div
          className="absolute h-full bg-red-100"
          style={{ left: 0, width: `${flaggedPct}%` }}
        />
        <div
          className="absolute h-full bg-yellow-100"
          style={{ left: `${flaggedPct}%`, width: `${warnPct - flaggedPct}%` }}
        />
        <div
          className="absolute h-full bg-kora-fun-green/15"
          style={{ left: `${warnPct}%`, right: 0 }}
        />
        {/* Value bar */}
        <div
          className={cn(
            'absolute h-full rounded-full transition-all',
            value < flaggedMax ? 'bg-red-500' :
            value < clearMin  ? 'bg-yellow-400' : 'bg-kora-fun-green',
          )}
          style={{ width: `${pct}%` }}
        />
        {/* Threshold tick marks */}
        <div
          className="absolute top-0 h-full w-px bg-[rgba(6,3,43,0.35)] opacity-50"
          style={{ left: `${flaggedPct}%` }}
        />
        <div
          className="absolute top-0 h-full w-px bg-[rgba(6,3,43,0.35)] opacity-50"
          style={{ left: `${warnPct}%` }}
        />
      </div>
      <div className="flex text-xs text-[rgba(6,3,43,0.40)] mt-0.5">
        <span style={{ width: `${flaggedPct}%` }} className="text-left">FLAGGED</span>
        <span style={{ width: `${warnPct - flaggedPct}%` }} className="text-center">WARN</span>
        <span className="flex-1 text-right">CLEAR ≥{clearMin * 100}%</span>
      </div>
    </div>
  );
}

export function ActivationSafeguardPanel({
  result,
  explanation,
  className,
}: ActivationSafeguardPanelProps) {
  const status: SafeguardStatus = result?.status ?? 'WARNING';
  const styles = STATUS_STYLES[status];

  return (
    <div className={cn('rounded-lg border bg-[#F8F6F1] p-4 space-y-4', className)}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[rgba(6,3,43,0.78)]">Activation Safeguard</h3>
        <span
          className={cn(
            'rounded px-2 py-0.5 text-xs font-bold border',
            styles.bg,
            styles.text,
          )}
        >
          {status}
        </span>
      </div>

      {result ? (
        <div className="space-y-4">
          <ThresholdGauge
            label="AR — Activation Rate"
            value={result.ar_value}
            flaggedMax={SAFEGUARD_THRESHOLDS.FLAGGED.AR_max}
            warnMax={SAFEGUARD_THRESHOLDS.WARNING.AR_max}
            clearMin={SAFEGUARD_THRESHOLDS.CLEAR.AR}
          />
          <ThresholdGauge
            label="MAR — Meaningful Activation Rate"
            value={result.mar_value}
            flaggedMax={SAFEGUARD_THRESHOLDS.FLAGGED.MAR_max}
            warnMax={SAFEGUARD_THRESHOLDS.WARNING.MAR_max}
            clearMin={SAFEGUARD_THRESHOLDS.CLEAR.MAR}
          />
        </div>
      ) : (
        <p className="text-sm text-[rgba(6,3,43,0.40)]">Risultato Activation Safeguard non disponibile per questo scenario.</p>
      )}

      {explanation && (
        <p className="text-xs text-[rgba(6,3,43,0.62)] leading-relaxed border-t border-[rgba(6,3,43,0.05)] pt-3">
          {explanation}
        </p>
      )}

      <p className="text-xs text-[rgba(6,3,43,0.40)]">
        CLEAR richiede AR ≥ 40% E MAR ≥ 30%. Logica OR — se uno dei due metrici è nella fascia di attenzione, lo stato viene attivato.
      </p>
    </div>
  );
}
