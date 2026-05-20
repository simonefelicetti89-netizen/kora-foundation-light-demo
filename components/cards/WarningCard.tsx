'use client';

import { cn } from '@/lib/utils';
import type { Warning } from '@/services/explainability/ExplainabilityService';

interface WarningCardProps {
  warning: Warning;
  className?: string;
}

const SEVERITY_LABELS: Record<string, string> = {
  critical: 'critico',
  high: 'alto',
  medium: 'medio',
};

const SEVERITY_STYLES = {
  critical: {
    border:     'border-red-200',
    bg:         'bg-red-50',
    indicator:  'bg-red-500',
    tag:        'bg-red-100 text-red-700 border-red-200',
  },
  high: {
    border:     'border-orange-200',
    bg:         'bg-orange-50',
    indicator:  'bg-orange-500',
    tag:        'bg-orange-100 text-orange-700 border-orange-200',
  },
  medium: {
    border:     'border-yellow-200',
    bg:         'bg-yellow-50',
    indicator:  'bg-yellow-400',
    tag:        'bg-yellow-100 text-yellow-700 border-yellow-200',
  },
};

export function WarningCard({ warning, className }: WarningCardProps) {
  const styles = SEVERITY_STYLES[warning.severity];

  return (
    <div
      className={cn(
        'rounded-lg border overflow-hidden flex',
        styles.border,
        className,
      )}
    >
      {/* Severity indicator stripe */}
      <div className={cn('w-1 shrink-0', styles.indicator)} />

      <div className={cn('flex-1 p-3 space-y-1.5', styles.bg)}>
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-semibold text-slate-800 leading-tight">
            {warning.title}
          </p>
          <span
            className={cn(
              'shrink-0 rounded border px-1.5 py-0.5 text-xs font-medium capitalize',
              styles.tag,
            )}
          >
            {SEVERITY_LABELS[warning.severity] ?? warning.severity}
          </span>
        </div>
        <p className="text-xs text-slate-600 leading-relaxed line-clamp-3">
          {warning.message}
        </p>
        {warning.affected_components.length > 0 && (
          <div className="flex gap-1 flex-wrap pt-0.5">
            {warning.affected_components.map((code) => (
              <span
                key={code}
                className="rounded bg-white border border-slate-200 px-1.5 py-0.5 text-xs font-mono text-slate-600"
              >
                {code}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
