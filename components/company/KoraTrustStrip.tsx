'use client';

import { cn } from '@/lib/utils';
import type { KoraIndexOutput } from '@/lib/types';
import { formatConfidenceScore } from '@/lib/formatters';

interface KoraTrustStripProps {
  output?: KoraIndexOutput;
  className?: string;
}

const SAFEGUARD_VALUE_CLASS: Record<string, string> = {
  CLEAR:   'text-kora-cosmic-blue',
  WARNING: 'text-amber-700',
  FLAGGED: 'text-red-700',
};

export function KoraTrustStrip({ output, className }: KoraTrustStripProps) {
  const cs        = output?.confidence_score;
  const safeguard = output?.safeguard_status ?? '—';
  const mv        = output?.methodology_version_id ?? '—';
  const cal       = output?.calibration_status ?? '—';

  const items = [
    {
      label: 'Confidence Score',
      value: cs != null ? formatConfidenceScore(cs) : '—',
      valueClass: 'text-kora-violet font-semibold',
      mono: false,
    },
    {
      label: 'Activation Safeguard',
      value: safeguard,
      valueClass: cn('font-semibold', SAFEGUARD_VALUE_CLASS[safeguard] ?? 'text-slate-700'),
      mono: true,
    },
    {
      label: 'Metodologia',
      value: mv,
      valueClass: 'text-slate-700',
      mono: true,
    },
    {
      label: 'Calibrazione',
      value: cal,
      valueClass: 'text-slate-700',
      mono: true,
    },
    {
      label: 'Livello output',
      value: 'Organizzazione — aggregati privacy-safe',
      valueClass: 'text-slate-600',
      mono: false,
    },
  ];

  return (
    <div className={cn('rounded-xl border border-slate-200 bg-slate-50 px-5 py-3 overflow-x-auto', className)}>
      <div className="flex items-center gap-0 min-w-max sm:min-w-0 sm:flex-wrap">
        {items.map((item, i) => (
          <div key={item.label} className="flex items-center">
            {i > 0 && (
              <div className="h-5 w-px bg-slate-200 mx-4 shrink-0" />
            )}
            <div className="shrink-0">
              <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-400 leading-none">
                {item.label}
              </p>
              <p className={cn(
                'text-xs mt-0.5',
                item.mono ? 'font-mono' : '',
                item.valueClass,
              )}>
                {item.value}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
