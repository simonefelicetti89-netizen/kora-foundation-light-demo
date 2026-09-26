'use client';

import { cn } from '@/lib/utils';
import { SafeguardSignificance, ThresholdMeter } from '@/components/ui/px/encoding';
import type { SafeguardStatus, ActivationSafeguardResult } from '@/lib/types';

interface ActivationSafeguardPanelProps {
  result?: ActivationSafeguardResult | null;
  explanation?: string;
  className?: string;
}

const STATUS_STYLES: Record<SafeguardStatus, { bar: string; text: string; bg: string }> = {
  CLEAR:   { bar: 'bg-kora-success',  text: 'text-kora-ink', bg: 'bg-[rgba(47,125,85,0.10)] border-[rgba(47,125,85,0.30)]' },
  WARNING: { bar: 'bg-kora-warning',  text: 'text-kora-warning-text',  bg: 'bg-[rgba(217,154,43,0.10)] border-[rgba(217,154,43,0.22)]' },
  FLAGGED: { bar: 'bg-kora-critical',  text: 'text-kora-critical',  bg: 'bg-[rgba(158,59,47,0.06)] border-[rgba(158,59,47,0.22)]' },
};

// KORA-WP-142: the local `ThresholdGauge` is gone. It drew AR and MAR against
// its own copy of the zone boundaries, so the panel could have disagreed with the
// verdict computed elsewhere without either side being detectably wrong. AR and
// MAR are now drawn by the canonical ThresholdMeter, from config.

export function ActivationSafeguardPanel({
  result,
  explanation,
  className,
}: ActivationSafeguardPanelProps) {
  const status: SafeguardStatus = result?.status ?? 'WARNING';
  const styles = STATUS_STYLES[status];

  return (
    <div data-wp142-block="safeguard-panel" className={cn('rounded-lg border bg-kora-paper p-4 space-y-4', className)}>
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
          <SafeguardSignificance
            status={status}
            ar={typeof result.ar_value === 'number' ? result.ar_value : null}
            mar={typeof result.mar_value === 'number' ? result.mar_value : null}
          />
          <ThresholdMeter metric="AR"  value={typeof result.ar_value  === 'number' ? result.ar_value  : null} label="AR — Activation Rate" />
          <ThresholdMeter metric="MAR" value={typeof result.mar_value === 'number' ? result.mar_value : null} label="MAR — Meaningful Activation Rate" />
        </div>
      ) : (
        <p className="text-sm text-[rgba(6,3,43,0.40)]">Risultato Activation Safeguard non disponibile per questo scenario.</p>
      )}

      {explanation && (
        <p className="text-xs text-[rgba(6,3,43,0.62)] leading-relaxed border-t border-[rgba(6,3,43,0.05)] pt-3">
          {explanation}
        </p>
      )}

      {/* The CLEAR rule is stated by SafeguardSignificance from config; repeating
          it as literal prose here was a fourth copy of the same two numbers. */}
      <p className="text-xs text-[rgba(6,3,43,0.40)]">
        Logica OR — se uno dei due metrici è nella fascia di attenzione, lo stato viene attivato.
      </p>
    </div>
  );
}
